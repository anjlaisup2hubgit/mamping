# Training and using a roof detector

Use Node 24 and Python 3.12 on a persistent workstation. The web server and training worker use the existing checkout; do not create a worktree for cloud tasks unless explicitly requested.

## Install CPU tools

From the checkout on Linux:

```sh
npm ci
python -m venv .venv
.venv/bin/python -m pip install torch==2.9.1+cpu torchvision==0.24.1+cpu --index-url https://download.pytorch.org/whl/cpu
.venv/bin/python -m pip install -r requirements-training.txt
node dev-server.js
```

The app checks these tools and displays missing prerequisites. Keep TLS verification enabled; in a managed network use its supplied CA bundle through `REQUESTS_CA_BUNDLE`, if needed. Model weights are downloaded from the official Ultralytics release the first time. The existing Ultralytics dependency and exported model are subject to its license; see its upstream licensing documentation.

## Build a complete dataset

1. Choose an area on the map and scan it.
2. Check or remove every outline and draw any missed roofs, then tap **Send for training**. Original imagery is saved with combined existing and checked roofs, already marked as reviewed.
3. To fix a sent picture later, open **Settings → Training pictures**. Label every visible roof, remove false boxes, and use Adjust/Draw/Pan, resize handles, zoom and undo as needed. Edits autosave as drafts; **Keep and next** confirms that the entire scene is reviewed.
4. Collect positive examples from at least two geographic groups about 1 km apart. Nearby scenes stay together in either training or evaluation. Small datasets are useful for checking the workflow, not for making accuracy claims.

Changed pictures or labels become **Needs review** again. Revision checks prevent an older tab overwriting newer labels. A failed server save leaves a recoverable browser draft and an error message; retry or explicitly recover a conflicting draft before keeping it.

## Train, compare, activate

**Train AI** starts a background process that survives web-server restarts. Progress and failures remain in `training/train.json` and `training/train.log`. Images, labels, model files, browser credentials and training outputs are not committed.

Each run freezes its dataset, reserves separate geographic groups, evaluates the baseline and candidate on the same held-out scenes, checks the ONNX export, and records its version. Geographic roles remain fixed across runs so adding pictures does not move a former training area into evaluation. The baseline is the currently active trained detector, or pretrained YOLO11n for the first run; it is not a Gemini/DINO accuracy comparison. The reported score is mAP@0.5 on roof boxes, not a percentage of correctly mapped buildings.

Review both scores before **Activate candidate**. Activation is explicit even when the candidate is worse; more representative evaluation pictures may be needed before deciding. **Restore previous** rolls back. Choose **Use active detector for scans**, or **My trained model** in Scan options, to run future scans through that exact ONNX model. Detection responses include the model version. Switching models never changes already-edited drafts.

For a small functional training check, use:

```sh
.venv/bin/python train.py 1 --imgsz 128 --batch 2 --workers 0
```

The normal UI uses 50 rounds and 768-pixel images. A one-round check does not establish useful roof-detection accuracy. Training requires enough RAM/CPU for the chosen target; the default nano model is intended to make CPU development practical.

## Connect a hosted site to a persistent worker

Short-lived hosted functions cannot retain training datasets or fit a model. Run the worker from this checkout on a persistent machine with the tools above:

```sh
export TRAINING_DATA_DIR=/path/to/persistent/mamping-data
# Supply TRAINING_WORKER_TOKEN securely through your service's environment settings.
node worker-server.js
```

It listens on loopback port 4000 by default and requires the token on every request. Use a TLS reverse proxy for remote access; set `WORKER_HOST=0.0.0.0` only when your deployment needs it. Keep `VERCEL` and `TRAINING_WORKER_URL` unset on the worker. Use a durable volume for `TRAINING_DATA_DIR` and back it up; restarting the HTTP process does not delete datasets or completed models.

On the hosted app, configure `TRAINING_WORKER_URL` as that worker's HTTPS origin and supply the matching `TRAINING_WORKER_TOKEN` securely. Set `TRAINING_EDITOR_IDS` to the comma-separated numeric OpenStreetMap user IDs allowed to edit datasets, start training and activate models; those users log in through the app's existing OpenStreetMap account control. Normal trained-model scans do not require training-administrator access. HTTP is accepted only for localhost development. The app forwards training, labels, imagery, activation and detection through its own server; the worker token is never sent to the browser. Until connected, hosted training shows an actionable unavailable state. These settings configure an existing worker; pushing the repository does not provision a machine or secret values.

## Verification

```sh
npm test
npm run test:training
npx playwright install chromium
npm run test:browser
```

Browser tests use real editor/map code with controlled external responses and never send public OpenStreetMap edits. To use an existing Chromium installation, set `CHROMIUM_EXECUTABLE_PATH` to its executable. Python dataset tests need only the standard library; actual fitting and inference need the tools above.
