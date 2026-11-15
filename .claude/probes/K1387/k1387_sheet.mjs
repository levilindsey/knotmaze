// K1383 s1: contact sheets of the appearance reveal, today's look against rp=gf, at the same reveal times.
//   node .claude/probes/K1383/k1383_sheet.mjs <base url> <link> <am|def> [tag]
// Per mode (today, gf): load `?<link>[&am=<am>]&snd=none[&rp=gf]` in a headed, off-screen, real-GPU Chrome (reduced
// motion emulated off), wait for the reveal, and at fractions of its plan duration pin it (__knotRenderer().revealPin:
// the masks, gates and FX clocks at that anim time), wait for the gf builds to land, capture, then resume. Then at the
// reveal's end + 2 s (live, unpinned) one more capture, and the FX end: the time the appear FX (particles) reach 0
// and whether the tip glow / the gf reveal form are still drawn. Output under .claude/probes/K1383/out/ (untracked):
// <tag>_<mode>_<i>.png, the sheet <tag>_sheet.png (rows today / gf, columns the times) and <tag>.json.
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [, , base, link, amArg, tagArg] = process.argv;
const am = amArg && amArg !== "def" ? amArg : null;
const tag = tagArg ?? `${link.replace(/\W/g, "_")}_${am ?? "def"}`;
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });
const FR = [0.0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.97];
// env NOPIN=1: no pins (each capture the frame the live clock reaches t: a control for the pin itself);
// env MODES=today|gf|today,gf (default both; the sheet needs both).
const NOPIN = process.env.NOPIN === "1";
const MODES = (process.env.MODES ?? "today,gf").split(",");
const VW = 520, VH = 520;
const profileDir = join(tmpdir(), `k1383-sheet-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    `--window-size=${VW + 40},${VH + 160}`, "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { link, am: am ?? "default", base, times: null, modes: {} };
try {
  for (const mode of MODES) {
    const page = await browser.newPage();
    await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    const url = `${base}/?${link}${am ? `&am=${am}` : ""}&snd=none${mode === "gf" ? "&rp=gf" : ""}`;
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.bringToFront();
    await page.waitForFunction(() => !!window.__knotReveal?.() && window.__knotReveal().duration > 0, { timeout: 60000, polling: 50 });
    const dur = await page.evaluate(() => window.__knotReveal().duration);
    const times = FR.map((f) => +(f * dur).toFixed(3));
    out.times ??= times;
    const M = { url, duration: dur, caps: [], errs };
    for (let i = 0; i < times.length; i++) {
      const t = out.times[i];
      // pin at t the frame the live clock reaches it (or at once, if it is past)
      const pinned = await page.evaluate((t, nopin) => new Promise((res) => {
        const step = () => {
          const rv = window.__knotReveal();
          if (!rv || rv.done) return res({ ok: false, clock: rv?.clock ?? null });
          if (rv.clock >= t - 1e-6 || t === 0) {
            if (nopin) return res({ ok: true, clock: rv.clock, live: true });
            const r = window.__knotRenderer();
            const ok = r.revealPin(Math.max(t, 1e-4));
            return res({ ok, clock: rv.clock });
          }
          requestAnimationFrame(step);
        };
        step();
      }), t, NOPIN);
      if (!NOPIN) await sleep(t === 0 ? 900 : 700);
      const st = await page.evaluate(() => {
        const g = globalThis.__knotGf?.stats;
        const p = window.__knotPerf?.(1);
        return { sim: p?.host?.snapSim ?? null, fxAlive: window.__knotReveal()?.fxAlive ?? null,
          rvPasses: g?.rvPasses ?? null, rvKnots: g?.rvKnots?.at(-1) ?? null, rvActive: g?.rvActive?.at(-1) ?? null, rvMs: g?.rvMs?.at(-1) ?? null };
      });
      const file = join(outDir, `${tag}_${mode}_${i}.png`);
      await page.screenshot({ path: file });
      M.caps.push({ t, pinned, ...st, file });
      // resume: the animator's own tick and the renderer's own clock advance again
      if (!NOPIN) await page.evaluate(() => {
        const r = window.__knotRenderer();
        const a = r.revealFx.revealAnim;
        if (a) delete a.tick;
        delete r.advanceClocks;
      });
    }
    // the end: wait for done, then follow the FX tail and the gf reveal form
    await page.waitForFunction(() => window.__knotReveal()?.done, { timeout: 60000, polling: 16 });
    const end = await page.evaluate(() => new Promise((res) => {
      const t0 = performance.now();
      const r = window.__knotRenderer();
      const rows = [];
      let fxZero = null;
      const step = () => {
        const now = performance.now() - t0;
        const fx = window.__knotReveal()?.fxAlive ?? 0;
        if (fx === 0 && fxZero === null) fxZero = now;
        const tips = r.revealFx.revealTipGfx;
        rows.push({ ms: +now.toFixed(0), fx, revealOn: r.revealFx.revealOn, tips: tips ? tips.context.instructions.length : 0 });
        if (now < 2000) requestAnimationFrame(step);
        else {
          const g = globalThis.__knotGf?.stats;
          res({ fxZeroMs: fxZero === null ? null : +fxZero.toFixed(0), rvLastAfterDoneMs: g?.rvLast ? +(g.rvLast - (performance.timeOrigin ? 0 : 0) - (t0)).toFixed(0) : null,
            rvPasses: g?.rvPasses ?? null, last: rows.at(-1), first: rows[0], sample: rows.filter((_, i) => i % 10 === 0).slice(0, 14) });
        }
      };
      step();
    }));
    const file = join(outDir, `${tag}_${mode}_end2s.png`);
    await page.screenshot({ path: file });
    M.caps.push({ t: "end+2s", file });
    M.end = end;
    out.modes[mode] = M;
    console.log(`${mode}: dur ${dur.toFixed(2)} fxZero ${end.fxZeroMs} ms rvLast-after-done ${end.rvLastAfterDoneMs} ms tips ${end.last.tips} errs ${errs.length}`);
    for (const c of M.caps) if (c.rvKnots !== undefined && c.rvKnots !== null) console.log(`  t ${c.t}: knots ${c.rvKnots} active ${c.rvActive} build ${c.rvMs?.toFixed(2)} ms fx ${c.fxAlive}`);
    if (errs.length) console.log(errs.slice(0, 5).join("\n"));
    await page.close();
  }
  if (MODES.length < 2) { writeFileSync(join(outDir, `${tag}.json`), JSON.stringify(out, null, 1)); process.exit(0); }
  // the sheet: rows today / gf, columns the times
  const cols = [...out.times.map((t) => `t ${t.toFixed(2)}`), "end + 2 s"];
  const img = (mode, i) => `data:image/png;base64,${readFileSync(out.modes[mode].caps[i].file).toString("base64")}`;
  const cell = (mode, i) => `<td><img src="${img(mode, i)}" width="${VW}" height="${VH}"></td>`;
  const html = `<html><body style="margin:0;background:#222;color:#eee;font:16px sans-serif"><table cellspacing="4">
    <tr><td>${tag}</td>${cols.map((c) => `<td>${c}</td>`).join("")}</tr>
    ${["today", "gf"].map((m) => `<tr><td>${m}</td>${cols.map((_, i) => cell(m, i)).join("")}</tr>`).join("")}</table></body></html>`;
  const sp = await browser.newPage();
  await sp.setViewport({ width: 80 + cols.length * (VW + 4), height: 2 * (VH + 4) + 40, deviceScaleFactor: 1 });
  await sp.setContent(html, { waitUntil: "load" });
  const sheet = join(outDir, `${tag}_sheet.png`);
  await sp.screenshot({ path: sheet, fullPage: true });
  out.sheet = sheet;
  writeFileSync(join(outDir, `${tag}.json`), JSON.stringify(out, null, 1));
  console.log(`sheet ${sheet}`);
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
