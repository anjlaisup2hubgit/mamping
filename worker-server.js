// Persistent training service for a hosted Mamping site. Keep its data directory on a durable volume.
import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import train from "./api/_train.js";
import training from "./api/_training.js";
import models from "./api/_models.js";
import detect from "./api/_detect.js";
import image from "./api/_training-image.js";

const token = process.env.TRAINING_WORKER_TOKEN;
if (!token) throw new Error("Set TRAINING_WORKER_TOKEN securely before starting the training worker.");
if (process.env.TRAINING_WORKER_URL || process.env.VERCEL) throw new Error("Run the worker as a persistent process with TRAINING_WORKER_URL and VERCEL unset.");
const expected = Buffer.from(`Bearer ${token}`);
const routes = { "/api/train": train, "/api/training": training, "/api/models": models, "/api/detect": detect, "/api/training-image": image };

const server = http.createServer(async (req, res) => {
  res.status = code => { res.statusCode = code; return res; };
  res.json = data => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(data)); };
  res.setHeader("Cache-Control", "no-store");
  const supplied = Buffer.from(req.headers.authorization || "");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return res.status(401).json({ error: "Training worker authorization was refused." });
  const url = new URL(req.url, "http://localhost"), handler = routes[url.pathname];
  if (!handler || !["GET", "POST"].includes(req.method)) return res.status(404).json({ error: "Not found." });
  req.query = Object.fromEntries(url.searchParams);
  try {
    let raw = "", size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 5e6) { res.status(413).json({ error: "Use one satellite picture per request." }); return; }
      raw += chunk;
    }
    req.body = raw ? JSON.parse(raw) : undefined;
    await handler(req, res);
  } catch (e) { if (!res.writableEnded) res.status(500).json({ error: e.message || "The training operation failed." }); }
});
server.listen(Number(process.env.PORT || 4000), process.env.WORKER_HOST || "127.0.0.1", () => console.log(`Training worker is listening on port ${server.address().port}.`));
