// Sends a clip (video, photo, details) to the shared map.
import { sendContribution } from "./api.js";

export async function shareClip(clip) {
  const { upload } = await import("https://esm.sh/@vercel/blob@0.27.0/client");
  const put = async (file, name) =>
    (await upload("media/" + clip.id + "-" + name, file, { access: "public", handleUploadUrl: "/api/upload-token" })).url;
  const videoUrl = await put(clip.blob, "video." + (clip.blob.type.includes("mp4") ? "mp4" : "webm"));
  const photoUrl = clip.photo ? await put(clip.photo, "photo.jpg") : null;
  const rec = await sendContribution({
    lat: clip.lat, lng: clip.lng, buildingId: clip.buildingId, name: clip.name, height: clip.height,
    levels: clip.levels, comment: clip.comment, secs: clip.secs, videoUrl, photoUrl
  });
  return rec.id;
}
