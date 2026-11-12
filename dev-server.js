// Local stand-in for `vercel dev`: serves the site and runs api/*.js. Start it with: node dev-server.js
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

try { process.loadEnvFile(".env.local"); } catch {}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
const PORT = process.env.PORT || 3000;

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname.startsWith("/api/")) {
    const file = path.resolve("api", url.pathname.slice(5) + ".js");
    if (!fs.existsSync(file) || path.basename(file).startsWith("_")) { res.statusCode = 404; return res.end(); }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try { req.body = raw ? JSON.parse(raw) : undefined; } catch { req.body = raw; }
    req.query = Object.fromEntries(url.searchParams);
    res.status = code => { res.statusCode = code; return res; };
    res.json = data => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(data)); };
    try {
      const mod = await import(pathToFileURL(file).href + "?t=" + Date.now()); // fresh copy so edits show without a restart
      await mod.default(req, res);
    } catch (e) { console.error(e); if (!res.writableEnded) res.status(500).json({ error: String(e.message || e) }); }
    return;
  }

  let file = path.resolve("." + (url.pathname === "/" ? "/index.html" : url.pathname));
  if (!file.startsWith(process.cwd()) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end("Not found"); }
  res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log("Running at http://localhost:" + PORT));
