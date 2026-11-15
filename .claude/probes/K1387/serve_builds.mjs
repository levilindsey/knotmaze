// K1387 s2: serve built folders as static sites, one port each, until killed.
//   node .claude/probes/K1387/serve_builds.mjs <dir>=<port> [<dir>=<port> ...]
// (scripts/preview.ps1 -Ref <sha> -Root <dir> -BuildOnly makes the folders.)
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

for (const arg of process.argv.slice(2)) {
  const at = arg.lastIndexOf("=");
  const dir = path.resolve(arg.slice(0, at));
  const port = Number(arg.slice(at + 1));
  http
    .createServer(async (req, res) => {
      try {
        let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
        if (p.endsWith("/")) p += "index.html";
        const f = path.join(dir, p);
        if (!f.startsWith(dir)) throw new Error("outside");
        const s = await stat(f);
        if (!s.isFile()) throw new Error("not a file");
        res.writeHead(200, { "Content-Type": MIME[path.extname(f)] ?? "application/octet-stream", "Cache-Control": "no-store" });
        res.end(await readFile(f));
      } catch {
        res.writeHead(404);
        res.end("not found");
      }
    })
    .listen(port, "127.0.0.1", () => console.log(`serving ${dir} on http://localhost:${port}`));
}
