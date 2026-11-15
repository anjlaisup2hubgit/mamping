"""Check geographic separation and immutable datasets without fitting a neural network."""
import json
import tempfile
import unittest
from pathlib import Path
from training_tools.dataset import prepare_dataset, write_json


class DatasetTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        for name in ["images", "labels"]:
            (self.root / name).mkdir()
        self.status, self.samples = {}, {}

    def scene(self, name, latitude, labels="0 0.5 0.5 0.2 0.2\n", revision=1, reviewed=1):
        (self.root / "images" / (name + ".jpg")).write_bytes(b"a distinct test image: " + name.encode())
        (self.root / "labels" / (name + ".txt")).write_text(labels)
        self.status[name] = "kept"
        self.samples[name] = {"centre": [latitude, 106], "revision": revision, "reviewedRevision": reviewed}
        write_json(self.root / "status.json", self.status)
        write_json(self.root / "samples.json", self.samples)

    def test_one_area_cannot_evaluate_itself(self):
        self.scene("first", 20.001)
        self.scene("nearby", 20.002)
        with self.assertRaisesRegex(ValueError, "two geographic areas"):
            prepare_dataset(self.root, self.root / "run")

    def test_changed_labels_need_review_again(self):
        self.scene("first", 20)
        self.scene("changed", 21, revision=2, reviewed=1)
        with self.assertRaisesRegex(ValueError, "two geographic areas"):
            prepare_dataset(self.root, self.root / "run")

    def test_disjoint_geographic_split_and_frozen_labels(self):
        self.scene("first", 20)
        self.scene("second", 21)
        self.scene("near-first", 20.001)
        dataset, split = prepare_dataset(self.root, self.root / "run")
        self.assertFalse(set(split["trainNames"]) & set(split["validationNames"]))
        self.assertFalse(set(split["trainGroups"]) & set(split["validationGroups"]))
        self.assertEqual(set(split["trainNames"] + split["validationNames"]), set(self.samples))
        (self.root / "labels" / "first.txt").write_text("")
        self.assertTrue((dataset.parent / "labels" / "first.txt").read_text().strip())
        self.assertTrue(split["samples"]["first"]["imageHash"])

    def test_checked_empty_scenes_are_kept_alongside_positive_examples(self):
        for latitude in [20, 21]:
            self.scene(f"roof-{latitude}", latitude)
            self.scene(f"empty-{latitude}", latitude, labels="")
        _, split = prepare_dataset(self.root, self.root / "run")
        self.assertEqual(len(split["trainNames"]) + len(split["validationNames"]), 4)

    def test_a_split_with_no_roofs_is_rejected(self):
        self.scene("empty", 20, labels="")
        self.scene("roof", 21)
        with self.assertRaisesRegex(ValueError, "at least one reviewed picture containing a roof"):
            prepare_dataset(self.root, self.root / "run")

    def test_new_areas_never_move_old_training_scenes_into_evaluation(self):
        self.scene("first", 20)
        self.scene("second", 21)
        _, before = prepare_dataset(self.root, self.root / "run-one")
        for latitude in [22, 23, 24, 25]:
            self.scene(f"added-{latitude}", latitude)
        _, after = prepare_dataset(self.root, self.root / "run-two")
        self.assertTrue(set(before["trainGroups"]).issubset(after["trainGroups"]))
        self.assertTrue(set(before["validationGroups"]).issubset(after["validationGroups"]))


if __name__ == "__main__":
    unittest.main()
