// K1369 s2: the desktop A/B of the gf gate and depth, in the phone's viewport (411x753 at DPR 2.625, touch) so the
// phone cells' drag lands on the same thread. Headed, off-screen, real-GPU Chrome (k1369_desk.mjs's launch). Per
// setting: load the link, follow the intro until the sim sleeps, then c1's 3 s touch drag. Per phase: app frames/s,
// main ms per frame and per second (__knotPerf totals), sim/wall (snapshot sim), gf installs/s, post-to-install ms,
// gated frames. Settings as in k1369s2_motion.mjs (today, gf, gfo = gf without the gate, gf2 = depth 2, gfo2).
//   node .claude/probes/K1369/k1369s2_desk.mjs <base url> <label> <settings,...> [link=b.FMKB4DIQ] [reps=1]
// Output: .claude/probes/K1369/out/s2desk_<label>.json (untracked) and one line per run.
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [, , base, label, setArg, linkArg, repsArg] = process.argv;
const link = linkArg ?? "b.FMKB4DIQ";
const reps = +(repsArg ?? 1);
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });
const SETQ = { today: "", gf: "&rp=gf", gfo: "&rp=gf", gf2: "&rp=gf", gfo2: "&rp=gf", gf3: "&rp=gf", gff: "&rp=gf", gf2f: "&rp=gf", gfl: "&rp=gf", gf2l: "&rp=gf" };
// gff / gf2f: gf / gf2 with the joinery's fan rebuild kept (695f19e9 switched it off under gf). gfl / gf2l: gf / gf2
// with the lean gap solve (eb76b4d5, probe-only).
const SETO = { gfo: { gate: false }, gf2: { depth: 2 }, gfo2: { gate: false, depth: 2 }, gf3: { depth: 3 }, gff: { fillets: true }, gf2f: { depth: 2, fillets: true },
  gfl: { lean: true }, gf2l: { depth: 2, lean: true } };
const sets = setArg.split(",");
const profileDir = join(tmpdir(), `k1369s2-desk-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--window-size=520,900", "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1) : null; };
const PERF = () => { const p = window.__knotPerf?.(1); return p ? { now: performance.now(), physMs: p.physMs, substeps: p.substeps, asleep: p.asleep, state: p.state,
  frames: p.totalFrames, cost: p.totalCostMs, sim: p.host?.snapSim ?? null, stamp: document.querySelector("#stamp, .stamp")?.textContent ?? null } : null; };
const GS = () => { const g = globalThis.__knotGf; if (!g) return null; const s = g.stats;
  return { installs: s.mainMs.length, show: s.showMs.slice(), lat: s.latencyMs.slice(), work: s.workMs.slice(), gated: s.gated ?? 0, superseded: s.superseded ?? 0, stale: s.stale, worker: s.worker }; };
const phase = (a, b, g0, g1) => {
  const wall = (b.now - a.now) / 1000;
  const r = { wallS: +wall.toFixed(2), fps: +((b.frames - a.frames) / wall).toFixed(1),
    mainPerFrame: b.frames > a.frames ? +((b.cost - a.cost) / (b.frames - a.frames)).toFixed(2) : null,
    mainPerS: +((b.cost - a.cost) / wall).toFixed(0), simPerWall: a.sim !== null && b.sim !== null ? +((b.sim - a.sim) / wall).toFixed(3) : null,
    msPerSubstep: b.substeps > a.substeps ? +((b.physMs - a.physMs) / (b.substeps - a.substeps)).toFixed(2) : null };
  if (g0 && g1) {
    r.installsPerS = +((g1.installs - g0.installs) / wall).toFixed(1);
    r.showP50 = q(g1.show.slice(g0.show.length), 0.5); r.latP50 = q(g1.lat.slice(g0.lat.length), 0.5); r.workP50 = q(g1.work.slice(g0.work.length), 0.5);
    r.gatedPerS = +((g1.gated - g0.gated) / wall).toFixed(1); r.superseded = g1.superseded - g0.superseded;
  }
  return r;
};
const out = { label, base, link, runs: [] };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 411, height: 753, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  let initId = null;
  for (let rep = 0; rep < reps; rep++) for (const st of rep % 2 ? [...sets].reverse() : sets) {
    if (initId) await page.removeScriptToEvaluateOnNewDocument(initId).catch(() => {});
    ({ identifier: initId } = await page.evaluateOnNewDocument((o) => { if (o) globalThis.__knotGfOpts = o; }, SETO[st] ?? null));
    // env K1369_AM=default: the default appearance (the brief's intro-d cell) instead of am=instant.
    const amd = process.env.K1369_AM === "default";
    const url = `${base}/?${link}${amd ? "" : "&am=instant"}&snd=none${SETQ[st]}`;
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.bringToFront();
    const t0 = Date.now(); let live = null, slept = null, g0 = null;
    while (Date.now() - t0 < (amd ? 90000 : 45000)) {
      const p = await page.evaluate(PERF);
      if (p && !live && p.substeps > 0) { live = p; g0 = await page.evaluate(GS); }
      if (p && p.asleep && p.state !== "loading" && p.frames > 30) { slept = p; break; }
      await sleep(200);
    }
    const run = { rep, setting: st, url, stamp: slept?.stamp ?? null };
    if (live && slept) run.intro = { sleepS: +(slept.now / 1000).toFixed(2), ...phase(live, slept, g0, await page.evaluate(GS)) };
    await sleep(500);
    const a = await page.evaluate(PERF); const ga = await page.evaluate(GS);
    const [x0, y0, x1, y1] = [150, 330, 265, 455];
    await page.touchscreen.touchStart(x0, y0);
    const N = 60;
    for (let i = 1; i <= N; i++) { const u = i / N; await page.touchscreen.touchMove(x0 + (x1 - x0) * u, y0 + (y1 - y0) * Math.sin(u * Math.PI)); await sleep(50); }
    await page.touchscreen.touchEnd();
    const b = await page.evaluate(PERF); const gb = await page.evaluate(GS);
    run.drag = phase(a, b, ga, gb);
    out.runs.push(run);
    const f = (p) => p ? `fps ${p.fps} main ${p.mainPerFrame}ms/f ${p.mainPerS}ms/s sim/wall ${p.simPerWall} ss ${p.msPerSubstep}` +
      (p.installsPerS !== undefined ? ` inst/s ${p.installsPerS} show ${p.showP50} lat ${p.latP50} work ${p.workP50} gated/s ${p.gatedPerS} sup ${p.superseded}` : "") : "-";
    console.log(`${rep} ${st}: intro sleep ${run.intro?.sleepS} ${f(run.intro)} | drag ${f(run.drag)}`);
  }
  out.errs = errs;
} finally {
  writeFileSync(join(outDir, `s2desk_${label}.json`), JSON.stringify(out, null, 1));
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* profile in use */ }
}
