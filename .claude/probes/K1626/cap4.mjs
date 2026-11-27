// K1626 s4: cap3.mjs (s2) plus world points. Levi's link in rp=gf, settled
// in real time (headed, off-screen, in-thread physics so one state per load),
// frozen with every clock pinned, then: the whole maze at the phone viewport,
// and each listed joint eye at high zoom (__knotLookAt on the eye's centre,
// the midpoint of the joint and the crossing, at SCALE CSS px per world unit;
// DSF 2 = the canvas's own resolution, main.ts caps it at 2, so the crop is
// not upscaled), the whole viewport after gf's redraws (compose4.py crops it).
// An EYES entry '@name:x:y' is a world point (K1622's spot) instead of an eye.
// Writes <outDir>/whole.png, eye_<name>.png and cap.json (state + views).
//
//   node .claude/probes/K1626/cap4.mjs <base> <outDir> <profileDir>
//     env EYES='138:282,64:100,@K1622:24.67:35.10' SCALE=90 CLIP=360 W=412 H=924 DSF=2
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { waitViewStill } from "../view_still.mjs";
const [, , base, outDir, profileDir] = process.argv;
if (!base || !outDir || !profileDir) { console.error("usage: cap3.mjs <base> <outDir> <profileDir>"); process.exit(2); }
const LINK = process.env.LINK ?? "?3.FCBQ1H6L4-6NPbeg8HHN09w";
const EXTRA = process.env.EXTRA ?? "&phw=0&fw=0&snd=none&prp=off&rp=gf&gfh=1";
const W = +(process.env.W ?? 412), H = +(process.env.H ?? 924), DSF = +(process.env.DSF ?? 2);
const SCALE = +(process.env.SCALE ?? 90), CLIP = +(process.env.CLIP ?? 360);
const EYES = (process.env.EYES ?? "132:254,28:64,138:282,64:100,149:305,140:292,@K1622:24.67:35.10").split(",").map((s) =>
  s.startsWith("@") ? [s.slice(1).split(":")[0], ...s.slice(1).split(":").slice(1).map(Number)] : s.split(":").map(Number));
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", `--window-size=${W + 40},${H + 120}`,
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const gfRedraw = async (page, n) => {
  for (let k = 0; k < n; k++) {
    const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf.redraw(); return globalThis.__knotGf.stats.composites; });
    await page.waitForFunction((c) => (globalThis.__knotGf?.stats?.composites ?? 0) > c + 2, { timeout: 120000, polling: 100 }, c0);
    await sleep(500);
  }
};
try {
  const page = await browser.newPage();
  let lost = 0, plucks = 0;
  page.on("pageerror", (e) => console.log(`pageerror ${e.message}`));
  page.on("console", (m) => { if (/context lost|webglcontextlost/i.test(m.text())) lost++; });
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
  await page.setViewport({ width: W, height: H, deviceScaleFactor: DSF });
  const t0 = Date.now();
  await page.goto(`${base}/${LINK}${EXTRA}`, { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  await page.waitForFunction(() => (globalThis.__knotGf?.stats?.passes ?? 0) > 0, { timeout: 900000, polling: 500 });
  await page.waitForFunction(() => window.__knotPerf?.()?.asleep === true, { timeout: 300000, polling: 300 });
  const frozen = await page.evaluate(async () => {
    await window.__knotPhysFreeze(true);
    const pinned = window.__knotPinClocks ? window.__knotPinClocks(100) : false;
    if (!pinned) { const r = window.__knotRenderer(); r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0; }
    window.__knotLoop?.({ continuous: true });
    const d = await window.__knotPhysDump();
    return { hash: d.hashes.all, simTime: d.simTime, pinned };
  });
  await sleep(2000);
  const still = await waitViewStill(page);
  await gfRedraw(page, 3);
  plucks = await page.evaluate(() => window.__knotPerf?.()?.plucks ?? -1);
  const data = await page.evaluate(async () => {
    const d = await window.__knotPhysDump({ arrays: true });
    const r = window.__knotRenderer(); const ps = window.__knotPS(); const w = r.root.worldTransform;
    return {
      hash: d.hashes.all, simTime: d.simTime, positions: Array.from(d.positions), chains: ps.chains.map((c) => Array.from(c)),
      breakAfter: Array.from(ps.chainBreakAfter), fused: ps.fusedJunctions.map((g) => Array.from(g)),
      xs: ps.crossings.map((X) => ({ over: { chain: X.over.chain, ctrl: X.over.ctrl }, under: { chain: X.under.chain, ctrl: X.under.ctrl } })),
      threadWidth: r.style.threadWidth, wt: { a: w.a, b: w.b, c: w.c, d: w.d, tx: w.tx, ty: w.ty }, dpr: devicePixelRatio,
      gf: globalThis.__knotGf ? { passes: globalThis.__knotGf.stats?.passes, fallback: globalThis.__knotGf.stats?.fallback } : null,
      build: document.title, stamp: document.querySelector("#stamp, .stamp, [data-stamp]")?.textContent ?? null,
    };
  });
  writeFileSync(join(outDir, "whole.png"), await page.screenshot({ type: "png", captureBeyondViewport: false }));
  const fitS = (await page.evaluate(() => window.__knotView())).s;
  const views = [];
  for (const [j, x, y] of EYES) {
    const ctr = typeof j === "string" ? [x, y] : await page.evaluate((j, x) => {
      const ps = window.__knotPS(); const pos = ps.positions;
      const at = (c, f) => { const ch = ps.chains[c]; const n = ch.length; const i0 = Math.floor(f); const t = f - i0;
        const a = ch[((i0 % n) + n) % n], b = ch[(((i0 + 1) % n) + n) % n];
        return [pos[a * 2] * (1 - t) + pos[b * 2] * t, pos[a * 2 + 1] * (1 - t) + pos[b * 2 + 1] * t]; };
      const g = ps.fusedJunctions[j]; let jx = 0, jy = 0;
      for (const m of g) { jx += pos[m * 2] / g.length; jy += pos[m * 2 + 1] / g.length; }
      const X = ps.crossings[x]; const a = at(X.over.chain, X.over.ctrl), b = at(X.under.chain, X.under.ctrl);
      return [(jx + (a[0] + b[0]) / 2) / 2, (jy + (a[1] + b[1]) / 2) / 2];
    }, j, x);
    // The fit camera's range (K198, camera.ts easeView) eases any view
    // past MAX_ZOOM 8 x the fit scale back in every frame, and clamps the
    // pan near the maze's edge, so: ask for at most 0.96 of that zoom, let
    // the range settle the view (bit-exact for 6 forced frames), and crop
    // offline around wherever the eye's centre landed (compose3.py).
    const v = await page.evaluate(async (a, b, c, fitS) => {
      const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      let last = ""; let same = 0; let i = 0;
      window.__knotLookAt(a, b, Math.min(c, fitS * 8 * 0.96));
      for (; i < 600 && same < 6; i++) {
        await raf();
        const w = window.__knotView(); const k = `${w.s},${w.x},${w.y}`;
        same = k === last ? same + 1 : 0; last = k;
      }
      return { ...window.__knotView(), same, tries: i };
    }, ctr[0], ctr[1], SCALE, fitS);
    await gfRedraw(page, 2);
    // The whole viewport, cropped offline (compose3.py takes the centre
    // CLIP x CLIP CSS px): a clipped screenshot showed another place than
    // the view the page reported (the first run's J138 and J152 crops were
    // empty paper on all three builds), so no clip and no capture beyond
    // the viewport, and the view is read again after the shot.
    const name = typeof j === "string" ? j : `J${j}xX${x}`;
    writeFileSync(join(outDir, `eye_${name}.png`), await page.screenshot({ type: "png", captureBeyondViewport: false }));
    const after = await page.evaluate(() => window.__knotView());
    const moved = Math.abs(after.s - v.s) + Math.abs(after.x - v.x) + Math.abs(after.y - v.y);
    views.push({ eye: name, centre: ctr, view: { s: v.s, x: v.x, y: v.y, same: v.same, tries: v.tries }, movedAfterShot: moved });
    console.log(`  ${name} centre ${ctr.map((q) => q.toFixed(2))} view s ${v.s} same ${v.same} tries ${v.tries} movedAfterShot ${moved}`);
  }
  writeFileSync(join(outDir, "cap.json"), JSON.stringify({ frozen, viewStill: still, lost, plucks, scale: SCALE, clip: CLIP, dsf: DSF, views, ...data }));
  console.log(`hash ${data.hash} (freeze ${frozen.hash}) simT ${data.simTime} tw ${data.threadWidth} gf ${JSON.stringify(data.gf)} lost ${lost} plucks ${plucks} viewStill ${still ? "yes" : "UNSETTLED"} build ${data.build} ready ${Date.now() - t0} ms`);
  await page.close();
} finally { await browser.close(); }
