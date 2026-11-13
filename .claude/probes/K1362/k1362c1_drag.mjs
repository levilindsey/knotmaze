// K1362 c1: k1362s4_drag.mjs on BOTH pass builds (A = the pass's base, master; B = its head, the c1 branch), rp=gf and
// today's look, in the K156 pass's OWN tab (lib.mjs myPage; never opens, wakes or touches anything else). The drag goes
// into the page over CDP touch (page.touchscreen); nothing reaches the phone itself. Per (rep, build, setting): load the
// link, wait for the knot to sleep, record rAF intervals while s4's 3 s drag runs, then read __knotGf's stats SLICED to
// the drag window (main per frame = c1's mainMs, else export+tables+pack+upload) and __knotPerf's physics deltas (the
// worker's ms per worker frame, sim/wall). Order A-today A-gf B-today B-gf, reversed every other rep.
//   node .claude/probes/K1362/k1362c1_drag.mjs <pass config.json> <label> [reps]   -> out_c1/drag_<label>.json
import { CFG, connect, myPage, load, assertFree, sleep, thermal } from "../../../scripts/phone_pass/lib.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const label = process.argv[3];
const reps = +(process.argv[4] || 1);
mkdirSync(join(here, "out_c1"), { recursive: true });
const file = join(here, `out_c1/drag_${label}.json`);
const SET = { today: "?b.J&am=instant&snd=none", gf: "?b.J&am=instant&snd=none&rp=gf" };
const HOST = { A: CFG.hostA, B: CFG.hostB };
const gnode = execFileSync(CFG.adb, ["-s", CFG.serial, "shell", "ls -d /sys/class/devfreq/*gpu*"], { encoding: "utf8" }).trim().split(/\s+/)[0];
const clk = []; let cbuf = "";
const sampler = spawn(CFG.adb, ["-s", CFG.serial, "shell", `while true; do cat ${gnode}/cur_freq; sleep 0.1; done`]);
sampler.stdout.on("data", (d) => { cbuf += d; const l = cbuf.split(/\r?\n/); cbuf = l.pop(); for (const x of l) if (/^\d+$/.test(x.trim())) clk.push([Date.now(), +x.trim() / 1e6]); });
const browser = await connect();
const page = await myPage(browser);
const back = page.url();
const out = { label, started: new Date().toISOString(), runs: [] };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1) : null; };
const PERF = () => { const p = window.__knotPerf?.(); return p ? { physMs: p.physMs, substeps: p.substeps, wf: p.host?.workerFrames ?? 0, sim: p.host?.snapSim ?? null, kind: p.kind ?? p.host?.kind ?? null } : null; };
const GLEN = () => { const g = globalThis.__knotGf; if (!g) return null; const s = typeof g.stats === "function" ? g.stats() : g.stats; return s ? Object.fromEntries(Object.entries(s).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length])) : null; };
const CELLS = [["A", "today"], ["A", "gf"], ["B", "today"], ["B", "gf"]];
try {
  for (let r = 0; r < reps; r++) for (const [h, k] of r % 2 ? [...CELLS].reverse() : CELLS) {
    const ld = await load(page, `${HOST[h]}/${SET[k]}`, 30000);
    const g0 = await page.evaluate(GLEN);
    const pf0 = await page.evaluate(PERF);
    const w0 = Date.now();
    await page.evaluate(() => { window.__dts = null; const o = []; let last = performance.now(); const t0 = last; window.__dtsOn = true;
      const step = (t) => { o.push(t - last); last = t; if (window.__dtsOn && t - t0 < 20000) requestAnimationFrame(step); else window.__dts = o; };
      requestAnimationFrame(step); });
    assertFree();
    const td0 = Date.now();
    const [x0, y0, x1, y1] = [150, 330, 265, 455];
    await page.touchscreen.touchStart(x0, y0);
    const N = 60;
    for (let i = 1; i <= N; i++) { const u = i / N; await page.touchscreen.touchMove(x0 + (x1 - x0) * u, y0 + (y1 - y0) * Math.sin(u * Math.PI)); await sleep(50); }
    await page.touchscreen.touchEnd();
    await page.evaluate(() => { window.__dtsOn = false; });
    const pf1 = await page.evaluate(PERF);
    const wall = (Date.now() - w0) / 1000;
    const mhz = q(clk.filter(([c]) => c >= td0 && c <= Date.now()).map(([, f]) => f), 0.5);
    await sleep(300);
    const dts = (await page.evaluate(() => window.__dts)) || [];
    const gs = await page.evaluate((g0) => { const g = globalThis.__knotGf; try { if (!g || !g0) return null; const s = typeof g.stats === "function" ? g.stats() : g.stats;
      const o = {}; for (const [k, v] of Object.entries(s)) o[k] = Array.isArray(v) && typeof v[0] === "number" ? v.slice(g0[k] ?? 0) : Array.isArray(v) ? undefined : v; return JSON.parse(JSON.stringify(o)); } catch { return null; } }, g0);
    const run = { rep: r, build: h, setting: k, mhz, stamp: ld?.stamp ?? null, n: dts.length, p50: q(dts, 0.5), p90: q(dts, 0.9), max: q(dts, 1), thermal: thermal() };
    if (pf0 && pf1) {
      const dwf = pf1.wf - pf0.wf, dms = pf1.physMs - pf0.physMs;
      run.phys = { kind: pf1.kind, stepMs: +dms.toFixed(1), workerFrames: dwf, msPerWorkerFrame: dwf > 0 ? +(dms / dwf).toFixed(2) : null,
        simPerWall: pf0.sim !== null && pf1.sim !== null ? +((pf1.sim - pf0.sim) / wall).toFixed(3) : null };
    }
    if (gs) {
      const tb = (gs.exportMs ?? []).map((x, i) => x + (gs.tablesMs?.[i] ?? 0) + (gs.packMs?.[i] ?? 0) + (gs.uploadMs?.[i] ?? 0));
      const mainR = gs.mainMs ?? tb;
      const sum = mainR.reduce((a, b) => a + b, 0);
      run.gf = { rebuilds: mainR.length, mainPerFrame: dts.length ? +(sum / dts.length).toFixed(2) : null, mainPerRebuild: q(mainR, 0.5),
        exportMs: q(gs.exportMs ?? [], 0.5), tablesMs: q(gs.tablesMs ?? [], 0.5), workMs: q(gs.workMs ?? [], 0.5), latencyMs: q(gs.latencyMs ?? [], 0.5),
        worker: gs.worker ?? null, workerBuilds: gs.workerBuilds ?? null, threadBuilds: gs.threadBuilds ?? null, fallback: gs.fallback ?? null };
    }
    out.runs.push(run); writeFileSync(file, JSON.stringify(out, null, 1));
    console.log(`${r} ${h} ${k}: n ${run.n} p50 ${run.p50} p90 ${run.p90} max ${run.max} @${mhz} MHz phys ${JSON.stringify(run.phys ?? null)} gf ${JSON.stringify(run.gf ?? null)}`);
  }
} catch (e) { out.error = String(e && e.message || e); console.log("ERROR", out.error); }
finally {
  out.ended = new Date().toISOString(); writeFileSync(file, JSON.stringify(out, null, 1));
  await page.goto(back, { waitUntil: "load" }).catch(() => {});
  await browser.disconnect(); sampler.kill();
  console.log("wrote", file);
}
