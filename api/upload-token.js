import { handleUpload } from "@vercel/blob/client";
export default async function handler(req, res) {
  try {
    const json = await handleUpload({
      body: req.body, request: req,
      onBeforeGenerateToken: async pathname => {
        if (!pathname.startsWith("media/")) throw new Error("bad path");
        return { allowedContentTypes: ["video/mp4", "video/webm", "video/quicktime", "image/jpeg", "image/png", "image/webp"], maximumSizeInBytes: 100 * 1024 * 1024, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {}
    });
    res.json(json);
  } catch (e) { res.status(400).json({ error: String(e.message || e) }); }
}
