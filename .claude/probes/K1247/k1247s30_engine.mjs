// K1247 s30 (2): why the browser's worker ran the outline ~1.75x Node (s29: frame 58.5 ms in the worker, 33.5 in
// Node). Bundles k1247s30_engine_entry.ts once (vite lib build, minified, as the app ships) and runs the SAME
// bundle on the SAME captured drag frames in Node, a Chrome module worker and Chrome's main thread (Chrome headed,
// the bench's flags), each part's p50/p95 per OutlineModel.update. Hold $env:TEMP\claude-perf.lock while it runs.
//   node .claude/probes/K1247/k1247s30_engine.mjs <dragDir, relative to the worktree> [warm=2] [reps=3] [order=node,worker,main,worker,node]
import { build } from "vite";
import puppeteer from "puppeteer-core";
import http from "node:http";
import { readFileSync, readdirSync, mkdtempSync, rmSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname, extname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const arg = (k, d) => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const dragRel = process.argv[2].replace(/\\/g, "/");
const warm = +arg("warm", "2"); const reps = +arg("reps", "3");
const order = arg("order", "node,worker,main,worker,node").split(",");
const outDir = join(here, "out/s30/engine");
await build({
  configFile: false, logLevel: "warn", root,
  build: { lib: { entry: join(here, "k1247s30_engine_entry.ts"), formats: ["es"], fileName: () => "engine_bundle.mjs" }, outDir, emptyOutDir: true, minify: true },
});
const bundle = join(outDir, "engine_bundle.mjs");
const { bench } = await import(pathToFileURL(bundle).href);
const files = readdirSync(join(root, dragRel)).filter((f) => /^f\d+\.json$/.test(f)).sort();
const urls = files.map((f) => `/${dragRel}/${f}`);
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const p = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(root) || !existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream", "cache-control": "no-store" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const profile = mkdtempSync(join(tmpdir(), "k1247s30-engine-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", protocolTimeout: 900000,
  headless: false, userDataDir: profile, defaultViewport: { width: 1200, height: 800 },
  args: ["--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/.claude/probes/K1247/k1247s30_engine.html?warm=${warm}&reps=${reps}&urls=${encodeURIComponent(JSON.stringify(urls))}`);
await page.bringToFront();
await page.waitForFunction("window.__ready === true");
console.log(`chrome ${await browser.version()}, node ${process.version} (V8 ${process.versions.v8}); ${files.length} frames of ${dragRel}, warm ${warm}, reps ${reps}`);
const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const fmt = (r) => Object.entries(r.parts).map(([k, v]) => `${k} ${q(v, 0.5).toFixed(1)}/${q(v, 0.95).toFixed(1)}`).join("  ");
for (const where of order) {
  let r;
  if (where === "node") {
    const frames = files.map((f) => JSON.parse(readFileSync(join(root, dragRel, f), "utf8")));
    r = bench(frames, warm, reps);
  } else r = await page.evaluate((w) => window.__run(w), where);
  console.log(`${where.padEnd(6)} structure ${r.structureMs.toFixed(0)}  ${fmt(r)}`);
}
await browser.close();
server.close();
try { rmSync(profile, { recursive: true, force: true }); } catch { /* chrome may hold it briefly */ }
