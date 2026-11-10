// Sends a clip's photo and details to the shared map. The video itself is never uploaded.
import { sendContribution } from "./api.js";

export async function shareClip(clip) {
  const { upload } = await import("https://esm.sh/@vercel/blob@0.27.0/client");
  const put = async (file, name) =>
    (await upload("media/" + clip.id + "-" + name, file, { access: "public", handleUploadUrl: "/api/upload-token" })).url;
  const photoUrl = clip.photo ? await put(clip.photo, "photo.jpg") : null;
  const rec = await sendContribution({
    lat: clip.lat, lng: clip.lng, buildingId: clip.buildingId, name: clip.name, height: clip.height,
    levels: clip.levels, comment: clip.comment, secs: clip.secs, photoUrl
  });
  return rec.id;
}
