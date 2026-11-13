// K1362 s6 (from s5): the bench's build step and its desktop half (k1362s6_phone.mjs is the phone half). Stage 3's
// k1362s3_run.mjs cut to the pass bench.
//   node .claude/probes/K1362/k1362s6_run.mjs build
//       a vite lib build (minified, as the app ships) of k1362s6_entry.ts into out/s6/site/, with k1362s6_bench.html
//       and the K868 scenes (def, muse_hash, fat) copied from the MAIN checkout's untracked probes (read only).
//       The phone serves out/s6/site/ as <pass build>/k1362s6/ (copied in after phone_pass.ps1 -Phase start).
//   node .claude/probes/K1362/k1362s6_run.mjs desktop <label> <cfg json file>
//       serves out/s6/site on 127.0.0.1, headed Chrome (ANGLE D3D11, off-screen, no backgrounding), runs bench() for
//       each entry of the cfg's "benches"; writes out/s6/desk_<label>.json. Hold $env:TEMP\claude-perf.lock.
import { build } from "vite";
import puppeteer from "puppeteer-core";
import http from "node:http";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, mkdtempSync, rmSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname, extname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const site = join(here, "out/s6/site");
const MAIN_PROBES = "C:/Users/lsl/Repositories/knotmaze/.claude/probes";
const cmd = process.argv[2];

if (cmd === "build") {
  mkdirSync(site, { recursive: true });
  await build({ configFile: false, logLevel: "warn", root, publicDir: false,
    build: { lib: { entry: join(here, "k1362s6_entry.ts"), formats: ["es"], fileName: () => "k1362s6_bundle.mjs" }, outDir: site, emptyOutDir: false, minify: true } });
  copyFileSync(join(here, "k1362s6_bench.html"), join(site, "k1362s6_bench.html"));
  mkdirSync(join(site, "scenes"), { recursive: true });
  for (const s of ["def", "muse_hash", "fat", "g41_ring_tw64", "g41_def_tw64", "user_tw42.lightpaper", "g41_user_tw42", "muse_default_tw", "ring", "g41_def_tw42", "g41_user_tw64", "g41_ring_tw42"]) copyFileSync(join(MAIN_PROBES, "K868/scenes", `${s}.json`), join(site, "scenes", `${s}.json`));
  console.log(`site: ${site}`);
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
  const profile = mkdtempSync(join(tmpdir(), "k1362s6-"));
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", protocolTimeout: 1800000,
    headless: false, userDataDir: profile, defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
    args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
      "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
  });
  const page = await browser.newPage();
  page.on("console", (m) => { if (m.type() === "error") console.log("page error:", m.text()); });
  await page.goto(`http://127.0.0.1:${port}/k1362s6_bench.html`);
  await page.bringToFront();
  await page.waitForFunction("window.__ready === true");
  const run = async (kind, args) => {
    await page.evaluate((k, a) => window.__start(k, a), kind, args);
    await page.waitForFunction("window.__res || window.__err", { timeout: 1700000, polling: 1000 });
    const [res, err] = await page.evaluate(() => [window.__res, window.__err]);
    if (err) throw new Error(err);
    return res;
  };
  const out = { label, chrome: await browser.version(), started: new Date().toISOString(), benches: [] };
  for (const b of cfg.benches) {
    const t0 = Date.now();
    out.benches.push(await run("bench", { base: "scenes", ...b }));
    console.log(`${b.name ?? ""} ${b.w}x${b.h} done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  out.ended = new Date().toISOString();
  const file = join(here, `out/s6/desk_${label}.json`);
  writeFileSync(file, JSON.stringify(out, null, 1));
  console.log("wrote", file);
  await browser.close();
  server.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* chrome may hold it briefly */ }
  process.exit(0);
}
console.log("usage: k1362s6_run.mjs build | desktop <label> <cfg.json>");
process.exit(2);