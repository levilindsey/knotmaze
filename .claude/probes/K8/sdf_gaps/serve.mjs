// serve.mjs: a static server for K8's builds (one port, every build in a
// subfolder: the Vite base is relative, so /<sha>/ serves that build).
//   node .claude/probes/K8/sdf_gaps/serve.mjs <root> <port>
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname } from "node:path";
const [, , root, portArg] = process.argv;
const port = Number(portArg || 5700);
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".wasm": "application/wasm", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2" };
createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let f = normalize(join(root, p));
    if (!f.startsWith(normalize(root))) { res.writeHead(403); return res.end(); }
    const s = await stat(f).catch(() => null);
    if (s && s.isDirectory()) f = join(f, "index.html");
    const body = await readFile(f);
    res.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(body);
  } catch { res.writeHead(404); res.end("404"); }
}).listen(port, () => console.log(`serving ${root} on ${port}`));
