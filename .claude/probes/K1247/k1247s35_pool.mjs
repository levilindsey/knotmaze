// K1247 s35: the pool prototype's driver. Bundles the app's src/render/outline/outline_worker.ts unchanged (vite lib
// build, minified, as the app ships), serves it with k1247s35_pool.html, and runs a drag through a pool of K
// outline workers at 60 Hz in headed Chrome (the bench's flags), for each K. Hold $env:TEMP\claude-perf.lock.
//   node .claude/probes/K1247/k1247s35_pool.mjs <dragDir (absolute or worktree-relative)> [ks=1,2,3,4,5,6,8] [sec=8] [warm=3] [sub=10] [out=<json>]
import { launch } from "./k1247s35_cdp.mjs"; // puppeteer-core broke in the shared node_modules (k1247s35_cdp.mjs)
import http from "node:http";
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname, extname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const arg = (k, d) => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const dragDir = resolve(root, process.argv[2]);
const ks = arg("ks", "1,2,3,4,5,6,8").split(",").map(Number);
const jump = arg("jump", "2"); const sec = +arg("sec", "8"); const warm = +arg("warm", "3"); const sub = +arg("sub", "10"); const out = arg("out", "");
const outDir = join(here, "out/s35/pool");
if (arg("nobuild", "0") !== "1") await (await import("vite")).build({ // nobuild=1 reuses out/s35/pool/outline_worker_bundle.mjs
  configFile: false, logLevel: "warn", root,
  build: { lib: { entry: join(root, "src/render/outline/outline_worker.ts"), formats: ["es"], fileName: () => "outline_worker_bundle.mjs" }, outDir, emptyOutDir: true, minify: true },
});
const files = readdirSync(dragDir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const urls = files.map((f) => `/__drag/${f}`);
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const base = path.startsWith("/__drag/") ? dragDir : root;
  const p = join(base, path.startsWith("/__drag/") ? path.slice(8) : path);
  if (!p.startsWith(base) || !existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream", "cache-control": "no-store" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const browser = await launch(`http://127.0.0.1:${port}/.claude/probes/K1247/k1247s35_pool.html?sub=${sub}&jump=${jump}&urls=${encodeURIComponent(JSON.stringify(urls))}`);
await browser.waitFor("window.__ready === true");
console.log(`${browser.version}; ${files.length} capture frames of ${dragDir} (sub ${sub}, ping-pong) at 60 Hz, ${warm} s warm + ${sec} s measured`);
console.log("K  rate Hz  interval p50/p95  >33ms  worker ms p50/p95  frame p50  latency p50/p95  stale p50/p95  post p50/p95  restr  dropped  structure wall");
const f1 = (x) => x.toFixed(1);
const results = [];
for (const K of ks) {
  const r = await browser.evaluate(`window.__run(${K}, ${sec}, ${warm})`);
  results.push(r);
  console.log(`${String(K).padEnd(2)} ${f1(r.rateHz).padStart(6)}  ${f1(r.interval[0])}/${f1(r.interval[1])}  ${(100 * r.iv95over33).toFixed(0)}%  ${f1(r.ms[0])}/${f1(r.ms[1])}  ${f1(r.frame[0])}  ${f1(r.lat[0])}/${f1(r.lat[1])}  ${f1(r.stale[0])}/${f1(r.stale[1])}  ${f1(r.post[0])}/${f1(r.post[1])}  ${r.restr} ${JSON.stringify(r.causes)}  ${r.dropped}  ${r.structureWall.toFixed(0)}`);
}
if (out) writeFileSync(out, JSON.stringify(results, null, 1));
await browser.close();
server.close();
