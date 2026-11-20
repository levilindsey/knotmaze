// K1475 (26X Done 1): does the live substep count's parity split the drag/fade guards' two
// states? Replicates dragcheck.mjs's load + freeze on its own link (seed 3, phw=0, SIMT 20)
// per load, recording the substep count before the freeze and the frozen hash after
// __knotStepUntil(SIMT). ALIGN=1 applies freeze_parity.mjs's alignment first.
//   node .claude/probes/K1475/k1475_parity.mjs <base> <profileDir> <out.json> [loads=12]
//     env ALIGN=1 SIMT=20
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
import { alignFreezeParity } from "../freeze_parity.mjs";
const [, , base, profileDir, outPath, loadsS = "12"] = process.argv;
const LOADS = +loadsS, SIMT = +(process.env.SIMT ?? 20), ALIGN = process.env.ALIGN === "1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    ...(process.env.EXTRA ?? "").split(" ").filter(Boolean)],
});
const link = `${base}/?3&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none&fl=0.14&rp=gf`;
const rows = [];
try {
  for (let k = 0; k < LOADS; k++) {
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.log("pageerror", e.message));
    await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
    await page.goto(link, { waitUntil: "load", timeout: 900000 });
    await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
    await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
    if (ALIGN) await alignFreezeParity(page, SIMT);
    const rec = await page.evaluate(async (t) => {
      const ps = window.__knotPS();
      const before = { sub: Math.round(ps.simTime * 120), simTime: ps.simTime, pending: ps.pendingTime, kind: (await window.__knotPhysDump())?.kind };
      await window.__knotPhysFreeze(true);
      const reached = await window.__knotStepUntil(t);
      const d = await window.__knotPhysDump();
      return { before, reached, after: { sub: Math.round(d.simTime * 120), simTime: d.simTime, hash: String((d.hashes ?? d)?.all ?? "?") } };
    }, SIMT);
    rows.push({ load: k, ...rec });
    console.log(`#${k} before sub=${rec.before.sub} parity=${rec.before.sub % 2} pending=${rec.before.pending?.toFixed(5)} kind=${rec.before.kind} -> after sub=${rec.after.sub} hash=${rec.after.hash}`);
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(outPath, JSON.stringify({ align: ALIGN, simt: SIMT, rows }, null, 1));
const byHash = {};
for (const r of rows) (byHash[r.after.hash] ??= []).push(`#${r.load}:before${r.before.sub % 2}->after${r.after.sub}`);
console.log("ALIGN", ALIGN, JSON.stringify(byHash));
