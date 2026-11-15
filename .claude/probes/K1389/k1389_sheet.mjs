// K1389 s1: today's thread look against rp=gf's, at rest.
//   node .claude/probes/K1389/k1389_sheet.mjs <base url> <link> [tag] [extra query]
// Per look (fill, border, both) and mode (today, gf, gf0 = rp=gf with the look off, `__knotGfOpts.look = false`):
// load `?<link>&tlk=<look>&am=instant&snd=none[&rp=gf]<extra>` in a headed, off-screen, real-GPU Chrome, wait until
// the sim sleeps (or SETTLE ms), let the gf builds land, capture. Output under .claude/probes/K1389/out/ (untracked):
// <tag>_<look>_<mode>.png, the sheet <tag>_sheet.png (rows the looks, columns the modes) and <tag>.json.
// env MODES (default today,gf), LOOKS (default fill,border,both), SETTLE (ms, default 9000), DPR (default 1),
// SIMT (s: freeze and step every load to that sim time, one state; needs phw=0, which the URL carries),
// CROPS ("x,y,w,h;..." CSS px: a 400% crop sheet <tag>_crops.png, rows look x crop, columns the modes).
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [, , base, link, tagArg, extraArg] = process.argv;
const extra = extraArg ?? "";
const tag = tagArg ?? link.replace(/\W/g, "_");
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });
const MODES = (process.env.MODES ?? "today,gf").split(",");
const LOOKS = (process.env.LOOKS ?? "fill,border,both").split(",");
const SETTLE = +(process.env.SETTLE ?? 9000);
const DPR = +(process.env.DPR ?? 1);
const SIMT = +(process.env.SIMT ?? 0);
const CROPS = (process.env.CROPS ?? "").split(";").filter(Boolean).map((s) => s.split(",").map(Number));
const VW = 520, VH = 520;
const profileDir = join(tmpdir(), `k1389-sheet-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    `--window-size=${VW + 40},${VH + 160}`, "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { link, base, extra, caps: {} };
try {
  for (const look of LOOKS) {
    for (const mode of MODES) {
      const page = await browser.newPage();
      await page.setViewport({ width: VW, height: VH, deviceScaleFactor: DPR });
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
      const errs = [];
      page.on("pageerror", (e) => errs.push(e.message));
      page.on("console", (m) => { if (m.type() === "error" || /gf/.test(m.text())) errs.push(m.text()); });
      if (mode === "gf0") await page.evaluateOnNewDocument(() => { globalThis.__knotGfOpts = { look: false }; });
      await page.evaluateOnNewDocument(() => {
        document.addEventListener("webglcontextlost", () => console.error("webglcontextlost"), true);
      });
      const url = `${base}/?${link}&tlk=${look}&am=instant&snd=none&phw=0${mode !== "today" ? "&rp=gf" : ""}${extra}`;
      await page.goto(url, { waitUntil: "load", timeout: 60000 });
      await page.bringToFront();
      const tL = Date.now();
      while (Date.now() - tL < 90000) {
        const s = await page.evaluate(() => window.__knotPerf?.()?.state ?? "none");
        if (s !== "loading" && s !== "none") break;
        await sleep(400);
      }
      const t0 = Date.now();
      // SIMT: one state in every load (phw=0 is deterministic): freeze, step to sim time SIMT, hash it
      let lastSim = -1, still = 0, hash = null;
      if (SIMT > 0) {
        hash = await page.evaluate(async (t) => {
          await window.__knotPhysFreeze(true);
          const s = await window.__knotStepUntil(t);
          const d = await window.__knotPhysDump();
          return { s, d: JSON.stringify(d).slice(0, 160) };
        }, SIMT);
        lastSim = `frozen@${hash.s}`;
        await sleep(2500);
      }
      while (SIMT <= 0 && Date.now() - t0 < SETTLE) {
        await sleep(500);
        const p = await page.evaluate(() => { const q = window.__knotPerf?.(); return q ? { asleep: !!q.asleep, state: q.state } : null; });
        lastSim = p ? `${p.state}/${p.asleep}` : null;
        if (p?.asleep && p.state !== "loading") { if (++still >= 2) break; } else still = 0;
      }
      await page.evaluate(() => window.__knotGf?.redraw?.());
      await sleep(1200);
      const st = await page.evaluate(() => {
        const g = globalThis.__knotGf?.stats;
        return g ? { passes: g.passes, lkMs: g.lkMs?.slice(-3), lkColors: g.lkColors, fallback: g.fallback } : null;
      });
      const file = join(outDir, `${tag}_${look}_${mode}.png`);
      await page.screenshot({ path: file });
      out.caps[`${look}_${mode}`] = { url, file, settleMs: Date.now() - t0, sim: lastSim, hash, st, errs };
      console.log(`${look} ${mode}: settle ${Date.now() - t0} ms sim ${lastSim} ${hash ? hash.d.slice(0, 90) : ""} ${JSON.stringify(st)} errs ${errs.length}`);
      if (errs.length) console.log(errs.slice(0, 4).join("\n").slice(0, 1500));
      await page.close();
    }
  }
  const img = (k) => `data:image/png;base64,${readFileSync(out.caps[k].file).toString("base64")}`;
  const html = `<html><body style="margin:0;background:#222;color:#eee;font:16px sans-serif"><table cellspacing="4">
    <tr><td>${tag}</td>${MODES.map((m) => `<td>${m}</td>`).join("")}</tr>
    ${LOOKS.map((l) => `<tr><td>${l}</td>${MODES.map((m) => `<td><img src="${img(`${l}_${m}`)}" width="${VW}" height="${VH}"></td>`).join("")}</tr>`).join("")}</table></body></html>`;
  const sp = await browser.newPage();
  await sp.setViewport({ width: 80 + MODES.length * (VW + 4), height: LOOKS.length * (VH + 4) + 40, deviceScaleFactor: 1 });
  await sp.setContent(html, { waitUntil: "load" });
  const sheet = join(outDir, `${tag}_sheet.png`);
  await sp.screenshot({ path: sheet, fullPage: true });
  out.sheet = sheet;
  // CROPS "x,y,w,h;...": 400% crops (CSS px of a capture), one row per look and crop, columns the modes
  if (CROPS.length) {
    const cell = (k, c) => `<div style="width:${c[2] * 4}px;height:${c[3] * 4}px;background:url(${img(k)}) -${c[0] * 4}px -${c[1] * 4}px / ${VW * 4}px ${VH * 4}px;image-rendering:pixelated"></div>`;
    const rows = LOOKS.flatMap((l) => CROPS.map((c) => `<tr><td>${l}<br>${c.join(",")}</td>${MODES.map((m) => `<td>${cell(`${l}_${m}`, c)}</td>`).join("")}</tr>`));
    const ch = `<html><body style="margin:0;background:#222;color:#eee;font:16px sans-serif"><table cellspacing="4"><tr><td>${tag} 4x</td>${MODES.map((m) => `<td>${m}</td>`).join("")}</tr>${rows.join("")}</table></body></html>`;
    const cw = Math.max(...CROPS.map((c) => c[2] * 4)), chh = CROPS.reduce((a, c) => a + c[3] * 4 + 4, 0);
    await sp.setViewport({ width: 130 + MODES.length * (cw + 4), height: LOOKS.length * chh + 40, deviceScaleFactor: 1 });
    await sp.setContent(ch, { waitUntil: "load" });
    out.crops = join(outDir, `${tag}_crops.png`);
    await sp.screenshot({ path: out.crops, fullPage: true });
    console.log(`crops ${out.crops}`);
  }
  writeFileSync(join(outDir, `${tag}.json`), JSON.stringify(out, null, 1));
  console.log(`sheet ${sheet}`);
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
