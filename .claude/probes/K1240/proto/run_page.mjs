// K1240 S1: page driver. Starts the vite dev server (private-cache
// config, port 5980), opens the prototype page in headed real-time
// Chrome for each scene, collects window.__k1240, and screenshots.
// Run under the perf lock: proto/run_locked.ps1 -ScriptName run_page.mjs
import { execSync, spawn } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const here = dirname(fileURLToPath(import.meta.url));
const worktree = join(here, "..", "..", "..", "..");
const outDir = join(here, "..", "out");
const scenesOut = join(outDir, "scenes");
mkdirSync(scenesOut, { recursive: true });
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const names = process.argv[2] ? process.argv[2].split(",") : ALL;
for (const n of ALL) copyFileSync(join(SCENE_DIR, `${n}.json`), join(scenesOut, `${n}.json`));

const PORT = 5980;
const base = `http://127.0.0.1:${PORT}/.claude/probes/K1240/proto/index.html`;
console.log("starting vite on", PORT);
const vite = spawn("npx.cmd", ["vite", "--config", join(here, "vite.private-cache.config.ts"), "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], { cwd: worktree, stdio: "pipe", shell: true });
let viteLog = "";
vite.stdout.on("data", (d) => { viteLog += d; });
vite.stderr.on("data", (d) => { viteLog += d; });
async function waitServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/`);
      if (r.status > 0) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("vite did not come up: " + viteLog.slice(-500));
}
await waitServer();
console.log("vite up");

const profile = join(outDir, `.profile-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profile,
  protocolTimeout: 30 * 60 * 1000,
  defaultViewport: { width: 1300, height: 1000 },
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1320,1040", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const results = {};
const sheetsMode = process.argv[3] === "sheets";
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  if (sheetsMode) {
    const { readFileSync } = await import("node:fs");
    const sheetsDir = join(outDir, "sheets");
    mkdirSync(sheetsDir, { recursive: true });
    const clip = { x: 0, y: 0, width: 1300, height: 930 };
    for (const n of names) {
      const scene = JSON.parse(readFileSync(join(scenesOut, `${n}.json`), "utf8"));
      const js = scene.junctions ?? [];
      const spots = [{ tag: "centre", c: js[Math.floor(js.length / 2)]?.c ?? [0, 0] }];
      js.slice(0, 24).forEach((j, i) => spots.push({ tag: `j${i}`, c: j.c }));
      for (const mode of ["border", "fill"]) {
        for (const sp of spots) {
          const url = `${base}?scene=${encodeURIComponent(n)}&mode=${mode}&cx=${sp.c[0]}&cy=${sp.c[1]}&zoom=4`;
          await page.goto(url, { waitUntil: "load", timeout: 120000 });
          await page.waitForFunction("window.__k1240 !== undefined", { timeout: 180000 });
          await page.screenshot({ path: join(sheetsDir, `${n}_${mode}_${sp.tag}.png`), clip });
        }
      }
      console.log(`${n}: sheets written (${spots.length} spots x 2 modes)`);
    }
  }
  for (const n of sheetsMode ? [] : names) {
    const url = `${base}?scene=${encodeURIComponent(n)}&mode=both`;
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction("window.__k1240 !== undefined", { timeout: 180000 });
    const r = await page.evaluate("window.__k1240");
    results[n] = r;
    console.log(`${n}: build=${r.buildMs?.toFixed(0)}ms draw=${JSON.stringify(r.drawMs)} tests=${JSON.stringify(Object.fromEntries(Object.entries(r.tests ?? {}).map(([k, v]) => [k, v.ok !== undefined ? `${v.ok}/${v.total}` : v])))}`);
    if (n === "def" || n === "ring") {
      await page.screenshot({ path: join(outDir, `page_${n}.png`) });
    }
  }
  if (errors.length) console.log("page errors:", errors.slice(0, 8).join(" | "));
  results.__errors = errors;
} finally {
  if (!sheetsMode) writeFileSync(join(outDir, "page_results.json"), JSON.stringify(results, null, 1));
  await browser.close();
  try { execSync(`taskkill /PID ${vite.pid} /T /F`, { stdio: "pipe" }); } catch { vite.kill(); }
}
console.log("wrote page_results.json");
