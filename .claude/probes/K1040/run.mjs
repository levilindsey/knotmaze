// K1040: runs proto.html in headed, hardware-GPU Chrome, launched the way
// scripts/diag_screenshot.mjs does (fresh temporary profile, off-screen,
// no occlusion throttling, never --virtual-time-budget), and writes the
// results and a PNG per run to out/ (untracked).
// Usage (take the perf lock first; run_locked.ps1 does):
//   node run.mjs <scene.json>... [--dpr 2] [--cr 3] [--fit 822x1506] [--calib] [--out <dir>]
// --fit draws each scene fitted into a phone-sized buffer instead of its own
// camera at dpr; --calib adds K923's disc-search calibration at 822x1506.
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const scenes = args.filter((a) => a.endsWith(".json"));
const dpr = Number(val("--dpr", 2)), cr = Number(val("--cr", 3));
const fitArg = val("--fit", null), fit = fitArg ? fitArg.split("x").map(Number) : null;
const outDir = val("--out", join(here, "out"));
mkdirSync(outDir, { recursive: true });
const profile = join(tmpdir(), `k1040-proto-profile-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profile,
  defaultViewport: { width: 640, height: 400 },
  args: [
    "--use-angle=d3d11", "--no-first-run", "--no-default-browser-check",
    "--window-position=2200,50", "--window-size=700,500",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
  ],
});
const all = { when: new Date().toISOString(), dpr, cr, fit, runs: [] };
try {
  const page = await browser.newPage();
  page.on("console", (m) => console.log("[page]", m.text()));
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.goto(pathToFileURL(join(here, "proto.html")).href);
  await page.waitForFunction(() => !!window.k1040, { timeout: 10000 });
  if (args.includes("--calib")) {
    all.calib = await page.evaluate(async () => window.k1040.calib({}));
    console.log("calib", JSON.stringify(all.calib));
  }
  for (const f of scenes) {
    const scene = JSON.parse(readFileSync(f, "utf8"));
    scene.name = basename(f, ".json");
    const res = await page.evaluate(async (s, o) => window.k1040.run(s, o), scene, { dpr, cr, fit });
    const tag = fit ? `fit${fit[0]}x${fit[1]}` : `dpr${dpr}`;
    if (res.png) { writeFileSync(join(outDir, `${scene.name}_${tag}.png`), Buffer.from(res.png.split(",")[1], "base64")); delete res.png; }
    console.log(JSON.stringify(res));
    all.runs.push(res);
  }
} finally {
  await browser.close();
  rmSync(profile, { recursive: true, force: true });
}
const name = `results_${fit ? `fit${fit[0]}x${fit[1]}` : `dpr${dpr}`}_${Date.now()}.json`;
writeFileSync(join(outDir, name), JSON.stringify(all, null, 1));
console.log("wrote", join(outDir, name));
