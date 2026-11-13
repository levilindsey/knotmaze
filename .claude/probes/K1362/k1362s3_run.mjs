// K1362 s3: the Pixel-portable bench's build step and its desktop half (k1362s3_phone.mjs is the phone half).
//   node .claude/probes/K1362/k1362s3_run.mjs build
//       vite lib builds (minified, as the app ships) of k1362s3_entry.ts and K1247's k1247s30_engine_entry.ts into
//       out/s3/site/, with k1362s3_bench.html, K1247's engine html + worker, the K868 scenes (def, muse_hash, fat)
//       and K1247 s18's def drag frames copied from the MAIN checkout's untracked probes (read only).
//       The phone serves out/s3/site/ as <pass build>/k1362s3/ (copied in before phone_pass.ps1 -Phase start).
//   node .claude/probes/K1362/k1362s3_run.mjs desktop <label> <cfg json file>
//       serves out/s3/site on 127.0.0.1, headed Chrome with stage 2's flags (ANGLE D3D11, off-screen, no
//       backgrounding), runs bench() for each entry of the cfg file's "benches" and drag() if it has "drag";
//       writes out/s3/desk_<label>.json. Hold $env:TEMP\claude-perf.lock.
import { build } from "vite";
import puppeteer from "puppeteer-core";
import http from "node:http";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync, mkdtempSync, rmSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname, extname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const site = join(here, "out/s3/site");
const MAIN_PROBES = "C:/Users/lsl/Repositories/knotmaze/.claude/probes";
const cmd = process.argv[2];

if (cmd === "build") {
  mkdirSync(site, { recursive: true });
  await build({ configFile: false, logLevel: "warn", root, publicDir: false,
    build: { lib: { entry: join(here, "k1362s3_entry.ts"), formats: ["es"], fileName: () => "k1362s3_bundle.mjs" }, outDir: site, emptyOutDir: false, minify: true } });
  copyFileSync(join(here, "k1362s3_bench.html"), join(site, "k1362s3_bench.html"));
  const k1247 = join(root, ".claude/probes/K1247");
  const eng = join(site, "k1247/out/s30/engine");
  mkdirSync(eng, { recursive: true });
  await build({ configFile: false, logLevel: "warn", root, publicDir: false,
    build: { lib: { entry: join(k1247, "k1247s30_engine_entry.ts"), formats: ["es"], fileName: () => "engine_bundle.mjs" }, outDir: eng, emptyOutDir: true, minify: true } });
  for (const f of ["k1247s30_engine.html", "k1247s30_engine_worker.mjs"]) copyFileSync(join(k1247, f), join(site, "k1247", f));
  mkdirSync(join(site, "scenes"), { recursive: true });
  for (const s of ["def", "muse_hash", "fat"]) copyFileSync(join(MAIN_PROBES, "K868/scenes", `${s}.json`), join(site, "scenes", `${s}.json`));
  const dragSrc = join(MAIN_PROBES, "K1247/out/s18/drag/def");
  mkdirSync(join(site, "drag"), { recursive: true });
  const frames = readdirSync(dragSrc).filter((f) => /^f\d+\.json$/.test(f)).sort();
  for (const f of frames) copyFileSync(join(dragSrc, f), join(site, "drag", f));
  writeFileSync(join(site, "drag/index.json"), JSON.stringify(frames));
  console.log(`site: ${site} (${frames.length} drag frames)`);
  process.exit(0);
}

if (cmd === "desktop") {
  const label = process.argv[3];
  const cfg = JSON.parse(readFileSync(process.argv[4], "utf8"));
  const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json" };
  const server = http.createServer((req, res) => {
    const p = join(site, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!p.startsWith(site) || !existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream", "cache-control": "no-store" });
    res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const profile = mkdtempSync(join(tmpdir(), "k1362s3-"));
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", protocolTimeout: 1800000,
    headless: false, userDataDir: profile, defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
    args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
      "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
  });
  const page = await browser.newPage();
  page.on("console", (m) => { if (m.type() === "error") console.log("page error:", m.text()); });
  await page.goto(`http://127.0.0.1:${port}/k1362s3_bench.html`);
  await page.bringToFront();
  await page.waitForFunction("window.__ready === true");
  const run = async (kind, args) => {
    await page.evaluate((k, a) => window.__start(k, a), kind, args);
    await page.waitForFunction("window.__res || window.__err", { timeout: 1700000, polling: 1000 });
    const [res, err] = await page.evaluate(() => [window.__res, window.__err]);
    if (err) throw new Error(err);
    return res;
  };
  const out = { label, chrome: await browser.version(), started: new Date().toISOString(), benches: [], drag: null };
  for (const b of cfg.benches) {
    const t0 = Date.now();
    const r = await run("bench", { base: "scenes", ...b });
    out.benches.push(r);
    console.log(`${b.name ?? ""} ${b.w}x${b.h} done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  if (cfg.drag) {
    const frames = JSON.parse(readFileSync(join(site, "drag/index.json"), "utf8"));
    const aa = cfg.drag.aa ?? out.benches[0]?.scenes?.def?.aa;
    out.drag = await run("drag", [frames.map((f) => `drag/${f}`), aa, cfg.drag.reps ?? 3]);
  }
  out.ended = new Date().toISOString();
  const file = join(here, `out/s3/desk_${label}.json`);
  writeFileSync(file, JSON.stringify(out, null, 1));
  console.log("wrote", file);
  await browser.close();
  server.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* chrome may hold it briefly */ }
  process.exit(0);
}
console.log("usage: k1362s3_run.mjs build | desktop <label> <cfg.json>");
process.exit(2);
