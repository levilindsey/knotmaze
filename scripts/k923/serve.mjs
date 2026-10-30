// K923 (folded into scripts/ by K932): static server for the bench page
// and the K868 scenes only.
// node scripts/k923/serve.mjs [port=5923]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");
const port = Number(process.argv[2] || 5923);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json" };
http.createServer((req, res) => {
  let u;
  try { u = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400); res.end(); return; }
  let f;
  if (u.startsWith("/K923/")) f = path.join(here, u.slice("/K923/".length));
  else if (u.startsWith("/K868/scenes/")) f = path.join(repo, ".claude", "probes", "K868", "scenes", u.slice("/K868/scenes/".length));
  else { res.writeHead(404); res.end(); return; }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(d);
  });
}).listen(port, "127.0.0.1", () => console.log(`K923 serve ${here} on 127.0.0.1:${port}`));
