// K1186 run B (batch 19): count junction pieces' per-frame choice flips
// on scripted drags and sweeps, and the ink each flip moves. Probe only;
// no src change. Reads choices through __knotRenderer().joinery's
// fieldProbe.arms(ji) (via renderer.fieldProbe facade) per rebuild, by
// wrapping the renderer's rebuildFillets IN THE PAGE (probe-side only).
// The reach bound is recomputed in the page from joinery.ts's armReach
// formula (dom cap / under-gap clamp / L*FILLET_GAP_MIN_FRAC floor),
// reading the live underWindows the same rebuild used.
//
//   node flips.mjs <stand> <outDir>
// Stands (rule 11: (a) is K859 fallback_count.mjs line 12's frozen seed-3
// link WITHOUT its tlk=border look keys - the fill look is the default
// and what joinery draws - and with bg keys dropped with them; named
// here as the brief directs):
//   seed3  ?3&am=instant&snd=none&fw=0&phw=0
//   fat11  ?11&am=instant&snd=none&fw=0&phw=0&tw=0.72&cr=4.5
//          (added by this run: seed 11, tw 0.72 / cr 4.5 - ranges
//          tw [0.15,0.8], cr [0,6] in src/ui/param_codec.ts PARAM_RANGES;
//          keys tw/cr confirmed in src/ui/url_state.ts readNumber calls)
// Scripts per stand: settle to sleep; a same-build control drag replayed
// FIRST (probes.md), then 3 scripted drags; cr and tw sweeps at rest,
// one rebuild per step. Drag path per target junction ji: start on arm0
// at 0.85 world from the centre, 8 steps to arm1 at 0.85 world (across
// the junction), 8 steps back; sample points are recorded in the dump.
import puppeteer from "puppeteer-core";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { decodePNG } from "./png.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.K1186_BASE || "http://127.0.0.1:5701";
const DSF = 1.5;
export const STANDS = {
  seed3: { q: "3&am=instant&snd=none&fw=0&phw=0" },
  fat11: { q: "11&am=instant&snd=none&fw=0&phw=0&tw=0.72&cr=4.5" },
};
const [, , STAND, OUT] = process.argv;
const st = STANDS[STAND];
if (!st || !OUT) throw new Error("usage: node flips.mjs <seed3|fat11> <outDir>");
mkdirSync(OUT, { recursive: true });

// In-page: install the per-rebuild sampler. One snapshot per rebuild:
// per junction, per arm [top, dives, bound, reach] (bound 0=domain,
// 1=gap, 2=floor), wedge layers, disc layer, cover layers, centres and
// arm unit dirs (for the geometric ink in Node).
const INSTALL = () => {
  const r = window.__knotRenderer();
  const FH = () => r.style.threadWidth / 2;
  const gapNearOf = (arm) => {
    const win = r.underWindows.get(arm.chain);
    if (!win) return Infinity;
    let near = Infinity;
    for (let i = 0; i < win.length; i += 3) {
      let along = (win[i] - arm.arc0) * arm.dir;
      if (arm.closed) {
        along = ((along % arm.total) + arm.total) % arm.total;
        if (along > arm.total / 2) along -= arm.total;
      }
      const far = along + (arm.dir > 0 ? win[i + 2] : win[i + 1]);
      if (far <= 0) continue;
      const nearEdge = along - (arm.dir > 0 ? win[i + 1] : win[i + 2]);
      if (nearEdge < near) near = nearEdge;
    }
    return near;
  };
  const snap = (n) => {
    const fp = r.fieldProbe;
    const fillHalf = FH();
    const L = fillHalf * 1.25 * r.cuspRadius;
    const floor = L * 0.3;
    const J = [];
    for (let ji = 0; ji < r.junctionArms.length; ji++) {
      const arms = fp.arms(ji);
      const c = fp.center(ji);
      if (!arms || !c) { J.push(null); continue; }
      const A = arms.map((a) => {
        const dom = Math.min(L, Math.max(floor, a.domain));
        const gapTerm = Math.max(floor, gapNearOf(a) - fillHalf * 1.0);
        const reach = Math.min(dom, gapTerm);
        const bound = reach === floor ? 2 : dom <= gapTerm ? 0 : 1;
        return [a.top ? 1 : 0, a.dives ? 1 : 0, bound, +reach.toFixed(5), +a.dx.toFixed(4), +a.dy.toFixed(4)];
      });
      const jt = A.some((a) => a[0] === 1);
      const W = [];
      for (let k = 0; k < A.length; k++) {
        const a = A[k], b = A[(k + 1) % A.length];
        W.push((jt || a[0] === 1 || b[0] === 1) && a[1] === 0 && b[1] === 0 ? 1 : 0);
      }
      const disc = A.some((a) => a[0] === 1) && !A.some((a) => a[1] === 1) ? 1 : 0;
      const cov = A.map((a) => (jt && a[1] === 0 ? 1 : 0));
      J.push({ c: [+c[0].toFixed(3), +c[1].toFixed(3)], rec: fp.record(ji), A, W, disc, cov });
    }
    return { n, mark: window.__k1186.mark || "", t: performance.now(), fh: fillHalf, L, J };
  };
  window.__k1186 = { mark: "", samples: [] };
  const orig = r.rebuildFillets.bind(r);
  let n = 0;
  r.rebuildFillets = (force) => { const rv = orig(force); window.__k1186.samples.push(snap(n++)); return rv; };
  return r.junctionArms.length;
};

const udd = mkdtempSync(join(tmpdir(), "k1186-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: udd,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--window-size=1760,1060"],
});
const log = [];
try {
  const page = await browser.newPage();
  page.on("console", (m) => log.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
  await page.setViewport({ width: 1700, height: 950, deviceScaleFactor: DSF });
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await page.evaluateOnNewDocument(() => {
    window.__knotLoopMode = "continuous";
    window.__ctxLost = 0;
    document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true);
    try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {}
  });
  await page.goto(`${BASE}/?${st.q}`, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer(), { timeout: 60000 });
  const waitAsleep = async (timeout = 60000) => {
    for (const t0 = Date.now(); Date.now() - t0 < timeout; await sleep(400)) {
      const a = await page.evaluate(() => { const p = window.__knotPerf(); return !!(p && p.asleep); });
      if (a) return true;
    }
    return false;
  };
  if (!(await waitAsleep())) throw new Error("stand never slept");
  await page.evaluate(() => {
    window.__knotPinClocks(100);
    for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
  });
  await sleep(300);
  const nj = await page.evaluate(INSTALL);
  const view0 = await page.evaluate(() => window.__knotView());
  const scaleDev = view0.s * DSF; // device px per world unit
  console.log(`${STAND}: ${nj} junctions, scale ${view0.s.toFixed(2)} css px/world (${scaleDev.toFixed(1)} dev)`);

  const setMark = (m) => page.evaluate((m) => { window.__k1186.mark = m; }, m);
  const sampleCount = () => page.evaluate(() => window.__k1186.samples.length);
  const takeSamples = () => page.evaluate(() => { const s = window.__k1186.samples; window.__k1186.samples = []; return s; });

  // --- targets: 3 junctions with >=3 arms, preferring a top/dives arm,
  // spread >220 css px apart on screen.
  const targets = await page.evaluate(() => {
    const r = window.__knotRenderer(), fp = r.fieldProbe, v = window.__knotView();
    const cand = [];
    for (let ji = 0; ji < r.junctionArms.length; ji++) {
      const arms = fp.arms(ji), c = fp.center(ji);
      if (!arms || arms.length < 3 || !c) continue;
      const hot = arms.some((a) => a.top || a.dives) ? 0 : 1;
      cand.push({ ji, hot, c, rec: fp.record(ji), sx: c[0] * v.s + v.x, sy: c[1] * v.s + v.y, dirs: arms.map((a) => [a.dx, a.dy]) });
    }
    cand.sort((a, b) => a.hot - b.hot || a.ji - b.ji);
    const picked = [];
    for (const c of cand) {
      if (picked.every((p) => Math.hypot(p.sx - c.sx, p.sy - c.sy) > 220)) picked.push(c);
      if (picked.length === 3) break;
    }
    return picked;
  });
  console.log("targets:", targets.map((t) => `ji${t.ji}@${t.c.map((x) => x.toFixed(1))} rec${t.rec}`).join(" "));

  const allSamples = []; // {script, samples:[...]}
  const dragShots = []; // {script, step, ji, buf} handled in-memory per drag
  const dragMeta = [];

  async function runDrag(script, t, collectShots) {
    const v = await page.evaluate(() => window.__knotView());
    const toS = (x, y) => ({ x: x * v.s + v.x, y: y * v.s + v.y });
    const A = { x: t.c[0] + t.dirs[0][0] * 0.85, y: t.c[1] + t.dirs[0][1] * 0.85 };
    const B = { x: t.c[0] + t.dirs[1][0] * 0.85, y: t.c[1] + t.dirs[1][1] * 0.85 };
    const path = [];
    for (let i = 0; i <= 8; i++) path.push({ x: A.x + ((B.x - A.x) * i) / 8, y: A.y + ((B.y - A.y) * i) / 8 });
    for (let i = 1; i <= 8; i++) path.push({ x: B.x + ((A.x - B.x) * i) / 8, y: B.y + ((A.y - B.y) * i) / 8 });
    const cs = toS(t.c[0], t.c[1]);
    const clip = { x: Math.max(0, Math.round(cs.x - 130)), y: Math.max(0, Math.round(cs.y - 130)), width: 260, height: 260 };
    const shots = [];
    const s0 = await sampleCount();
    const t0 = Date.now();
    const p0 = toS(path[0].x, path[0].y);
    await page.mouse.move(p0.x, p0.y);
    await sleep(120);
    await page.mouse.down();
    for (let i = 0; i < path.length; i++) {
      await setMark(`${script}:step${i}`);
      const p = toS(path[i].x, path[i].y);
      await page.mouse.move(p.x, p.y, { steps: 2 });
      await sleep(140);
      if (collectShots) shots.push({ step: i, buf: await page.screenshot({ clip }) });
    }
    await page.mouse.up();
    const secs = (Date.now() - t0) / 1000;
    await setMark(`${script}:release`);
    await sleep(250);
    const samples = await takeSamples();
    allSamples.push({ script, samples });
    dragMeta.push({ script, ji: t.ji, center: t.c, record: t.rec, clip, pathWorld: path, seconds: +secs.toFixed(2), rebuilds: samples.length });
    if (collectShots) dragShots.push({ script, ji: t.ji, clip, shots });
    console.log(`${script}: ji${t.ji} ${samples.length} rebuilds in ${secs.toFixed(1)}s`);
  }

  // Same-build control first (probes.md): the first target's drag,
  // replayed identically; then the three measured drags (target 1 again).
  await runDrag("control-drag1", targets[0], true);
  await waitAsleep(45000);
  await takeSamples(); // discard the settle tail between scripts
  for (let d = 0; d < 3; d++) {
    await runDrag(`drag${d + 1}`, targets[d], true);
    await waitAsleep(45000);
    await takeSamples();
  }

  // --- sweeps at rest, one forced rebuild per step.
  const sweepDefs = [
    { kind: "cr", values: Array.from({ length: 24 }, (_, i) => +(0.25 * (i + 1)).toFixed(2)) },
    { kind: "tw", values: [0.2, 0.26, 0.32, 0.38, 0.44, 0.5, 0.56, 0.62, 0.68, 0.74, 0.8] },
  ];
  for (const sw of sweepDefs) {
    await takeSamples();
    await page.evaluate((kind, values) => {
      const r = window.__knotRenderer();
      for (const v of values) {
        window.__k1186.mark = `sweep-${kind}:${v}`;
        if (kind === "cr") r.cuspRadius = v; else r.style.threadWidth = v;
        r.update();
        r.rebuildFillets(true);
      }
      window.__k1186.mark = `sweep-${kind}:restore`;
      const p = window.__knotParams();
      if (kind === "cr") r.cuspRadius = p.cuspRadius; else r.style.threadWidth = p.threadWidth;
      r.update();
      r.rebuildFillets(true);
    }, sw.kind, sw.values);
    const samples = await takeSamples();
    allSamples.push({ script: `sweep-${sw.kind}`, samples });
    console.log(`sweep-${sw.kind}: ${samples.length} rebuilds over ${sw.values.length} steps`);
  }

  // Drawn ink for the sweeps: repeat both sweeps at rest, one full
  // screenshot per step (the sweep is deterministic at rest; the flip
  // pass above already counted these same steps).
  const sweepShots = [];
  for (const sw of sweepDefs) {
    await page.evaluate((kind, v0) => {
      const r = window.__knotRenderer();
      if (kind === "cr") r.cuspRadius = v0; else r.style.threadWidth = v0;
      r.update(); r.rebuildFillets(true);
    }, sw.kind, sw.values[0]);
    await sleep(200);
    sweepShots.push({ script: `sweep-${sw.kind}`, step: -1, buf: await page.screenshot() });
    for (let i = 0; i < sw.values.length; i++) {
      await page.evaluate((kind, v) => {
        const r = window.__knotRenderer();
        if (kind === "cr") r.cuspRadius = v; else r.style.threadWidth = v;
        r.update(); r.rebuildFillets(true);
      }, sw.kind, sw.values[i]);
      await sleep(120);
      sweepShots.push({ script: `sweep-${sw.kind}`, step: i, buf: await page.screenshot() });
    }
    await page.evaluate((kind) => {
      const r = window.__knotRenderer(), p = window.__knotParams();
      if (kind === "cr") r.cuspRadius = p.cuspRadius; else r.style.threadWidth = p.threadWidth;
      r.update(); r.rebuildFillets(true);
    }, sw.kind);
    await sleep(200);
  }
  for (const s of sweepShots) writeFileSync(join(OUT, `${STAND}_${s.script}_step${String(s.step + 1).padStart(2, "0")}.png`), s.buf);

  const ctxLost = await page.evaluate(() => window.__ctxLost);
  const dump = { stand: STAND, link: st.q, base: BASE, nj, view: view0, scaleDev, targets, dragMeta, ctxLost, scripts: allSamples, log: log.slice(-20) };
  writeFileSync(join(OUT, `raw_${STAND}.json`), JSON.stringify(dump));
  // shots kept beside the dump (step PNGs per drag) for the ink pass
  for (const d of dragShots) for (const s of d.shots) writeFileSync(join(OUT, `${STAND}_${d.script}_ji${d.ji}_step${String(s.step).padStart(2, "0")}.png`), s.buf);
  console.log(`${STAND}: dump written, ctxLost=${ctxLost}`);
} finally {
  await browser.close();
  try { rmSync(udd, { recursive: true, force: true }); } catch {}
}
