// K1369 s1: the motion table on the Pixel, in the K156 pass's OWN tab (lib.mjs myPage; never opens, wakes or
// touches anything else; the drag goes in over CDP touch, nothing reaches the phone itself). From k1362c1_drag.mjs.
// Per cell (link x setting x scenario):
//   intro-i / intro-d  load the link (am=instant / the default appearance) and follow it until the sim sleeps
//   drag               load, wait for sleep, then c1's 3 s CDP touch drag
// Settings: today (today's look), gf (rp=gf), and the A/B knobs: gff (rp=gf, builds frozen once tables exist, pass not
// redrawn), gfr (frozen, pass redrawn every frame: the GPU's load without the build), gft (the build in-thread on main).
// Beside every cell, through adb (read-only): every core's scaling_cur_freq and the GPU's cur_freq every 100 ms, and
// every Chrome thread's stat + schedstat every 500 ms (on-CPU ns, run-queue wait ns, last core), read with shell
// builtins only (no fork per file).
//   node k1369_motion.mjs <pass config.json> <label> <cells: link:setting:scen,...> [reps]  -> out/motion_<label>.json
import { CFG, connect, myPage, ensureViewport, assertFree, sleep, thermal } from "../../../scripts/phone_pass/lib.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const label = process.argv[3];
const cells = process.argv[4].split(",").map((c) => c.split(":"));
const reps = +(process.argv[5] || 1);
mkdirSync(join(here, "out"), { recursive: true });
const file = join(here, `out/motion_${label}.json`);
const LINK = { def: "b.FMKB4DIQ", bj: "b.J" };
const SETQ = { today: "", gf: "&rp=gf", gff: "&rp=gf", gfr: "&rp=gf", gft: "&rp=gf" };
const SETO = { gff: { freeze: true }, gfr: { freeze: true, redraw: true }, gft: { worker: false } };
const adb = (cmd) => execFileSync(CFG.adb, ["-s", CFG.serial, "shell", cmd], { encoding: "utf8" });
const gnode = adb("ls -d /sys/class/devfreq/*gpu*").trim().split(/\s+/)[0];
const ncpu = adb("ls -d /sys/devices/system/cpu/cpu[0-9]*").trim().split(/\s+/).length;
const topo = adb("cat /sys/devices/system/cpu/cpu[0-9]*/cpufreq/cpuinfo_max_freq").trim().split(/\s+/).map((x) => +x / 1000);
// Clocks: one line per 100 ms, "F <mhz per core...> G <gpu hz>".
const clk = []; let cbuf = "";
const clkS = spawn(CFG.adb, ["-s", CFG.serial, "shell",
  `while true; do f=""; for c in /sys/devices/system/cpu/cpu[0-9]*/cpufreq/scaling_cur_freq; do read v < $c; f="$f $v"; done; read g < ${gnode}/cur_freq; echo "F$f G $g"; sleep 0.1; done`]);
clkS.stdout.on("data", (d) => { cbuf += d; const l = cbuf.split(/\r?\n/); cbuf = l.pop(); const t = Date.now();
  for (const x of l) { const m = /^F ([\d ]+) G (\d+)/.exec(x.trim()); if (m) clk.push([t, m[1].trim().split(/\s+/).map((v) => +v / 1000), +m[2] / 1e6]); } });
// Threads: every 500 ms, each Chrome process's tasks, "tid|stat|schedstat".
const thr = []; let tbuf = ""; let cur = null;
const thrS = spawn(CFG.adb, ["-s", CFG.serial, "shell",
  `while true; do echo "T"; for p in $(pgrep -f com.android.chrome); do echo "P $p"; for t in /proc/$p/task/*; do read a < $t/stat; read b < $t/schedstat; echo "$a|$b"; done; done; echo "E"; sleep 0.5; done`]);
let curP = 0;
thrS.stdout.on("data", (d) => { tbuf += d; const l = tbuf.split(/\r?\n/); tbuf = l.pop();
  for (const x of l) {
    if (x === "T") { cur = { t: Date.now(), th: {} }; continue; }
    if (x === "E") { if (cur) thr.push(cur); cur = null; continue; }
    if (!cur) continue;
    if (x.startsWith("P ")) { curP = +x.slice(2); continue; }
    const [st, ss] = x.split("|"); if (!st || !ss) continue;
    const o = st.indexOf("("), c = st.lastIndexOf(")"); if (o < 0 || c < 0) continue;
    const tid = +st.slice(0, o).trim(), comm = st.slice(o + 1, c), f = st.slice(c + 2).split(" ");
    const [run, wait] = ss.trim().split(/\s+/).map(Number);
    cur.th[tid] = { p: curP, comm, ut: +f[11], stt: +f[12], cpu: +f[36], run, wait };
  } });
// A window's thread table: on-CPU and wait ms per wall s, cores seen (sampled), per thread alive at both ends.
const threads = (t0, t1) => {
  const a = thr.filter((s) => s.t >= t0 && s.t <= t1); if (a.length < 2) return null;
  const s0 = a[0], s1 = a[a.length - 1], w = (s1.t - s0.t) / 1000; const rows = [];
  for (const [tid, x1] of Object.entries(s1.th)) { const x0 = s0.th[tid]; if (!x0) continue;
    const run = (x1.run - x0.run) / 1e6 / w, wait = (x1.wait - x0.wait) / 1e6 / w; if (run < 20) continue;
    const cores = {}; for (const s of a) { const y = s.th[tid]; if (y) cores[y.cpu] = (cores[y.cpu] || 0) + 1; }
    rows.push({ tid: +tid, p: x1.p, comm: x1.comm, run: +run.toFixed(0), wait: +wait.toFixed(0), cores }); }
  return { wall: +w.toFixed(2), rows: rows.sort((x, y) => y.run - x.run).slice(0, 14) };
};
const clocks = (t0, t1) => {
  const a = clk.filter(([t]) => t >= t0 && t <= t1); if (!a.length) return null;
  const q = (v, p) => { const s = [...v].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  return { n: a.length, cpu: Array.from({ length: a[0][1].length }, (_, i) => [q(a.map((x) => x[1][i]), 0.1), q(a.map((x) => x[1][i]), 0.5), q(a.map((x) => x[1][i]), 0.9)].map((v) => Math.round(v))),
    gpu: [q(a.map((x) => x[2]), 0.1), q(a.map((x) => x[2]), 0.5), q(a.map((x) => x[2]), 0.9)].map((v) => Math.round(v)) };
};
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1) : null; };
const PERF = () => { const p = window.__knotPerf?.(1); return p ? { now: performance.now(), physMs: p.physMs, substeps: p.substeps, asleep: p.asleep, state: p.state, frames: p.totalFrames, cost: p.totalCostMs,
  wf: p.host?.workerFrames ?? 0, sim: p.host?.snapSim ?? null, kind: p.kind ?? p.host?.kind ?? null, stamp: document.querySelector("#stamp, .stamp")?.textContent ?? null } : null; };
const GLEN = () => { const g = globalThis.__knotGf; if (!g) return null; const s = typeof g.stats === "function" ? g.stats() : g.stats; return s ? Object.fromEntries(Object.entries(s).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length])) : null; };
const GSL = (g0) => { const g = globalThis.__knotGf; try { if (!g) return null; const s = typeof g.stats === "function" ? g.stats() : g.stats; const o = {};
  for (const [k, v] of Object.entries(s)) o[k] = Array.isArray(v) && typeof v[0] === "number" ? v.slice(g0?.[k] ?? 0) : Array.isArray(v) ? undefined : v; return JSON.parse(JSON.stringify(o)); } catch { return null; } };
const gfSum = (gs, nFrames) => { if (!gs) return null; const mainR = gs.mainMs ?? []; const sum = mainR.reduce((a, b) => a + b, 0);
  return { rebuilds: mainR.length, mainPerFrame: nFrames ? +(sum / nFrames).toFixed(2) : null, exportMs: q(gs.exportMs ?? [], 0.5), tablesMs: q(gs.tablesMs ?? [], 0.5),
    workMs: q(gs.workMs ?? [], 0.5), latencyMs: q(gs.latencyMs ?? [], 0.5), passes: gs.passes ?? null, worker: gs.worker ?? null, workerBuilds: gs.workerBuilds ?? null, threadBuilds: gs.threadBuilds ?? null, fallback: gs.fallback ?? null }; };
const phys = (a, b, wall) => { const ds = b.substeps - a.substeps, dms = b.physMs - a.physMs;
  return { kind: b.kind, busyPerS: +(dms / wall).toFixed(0), msPerSubstep: ds > 0 ? +(dms / ds).toFixed(2) : null, substeps: ds,
    simPerWall: a.sim !== null && b.sim !== null ? +((b.sim - a.sim) / wall).toFixed(3) : null, mainPerFrame: b.frames > a.frames ? +((b.cost - a.cost) / (b.frames - a.frames)).toFixed(2) : null }; };

const browser = await connect();
const page = await myPage(browser);
const back = page.url();
const out = { label, started: new Date().toISOString(), ncpu, topo, gnode, runs: [] };
let initId = null;
const arm = async (opts) => {
  if (initId) await page.removeScriptToEvaluateOnNewDocument(initId).catch(() => {});
  ({ identifier: initId } = await page.evaluateOnNewDocument((o) => {
    if (o) globalThis.__knotGfOpts = o;
    const d = []; let last = 0; globalThis.__k1369 = d;
    const step = (t) => { if (last) d.push([t, t - last]); last = t; if (d.length < 20000) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, SETO[opts] ?? null));
};
try {
  for (let r = 0; r < reps; r++) for (const [lk, st, sc] of r % 2 ? [...cells].reverse() : cells) {
    assertFree();
    await ensureViewport(page);
    await arm(st);
    const url = `${CFG.hostA}/?${LINK[lk] ?? lk}${sc === "intro-d" ? "" : "&am=instant"}&snd=none${SETQ[st]}`;
    const tw0 = Date.now();
    await page.goto(url, { waitUntil: "load", timeout: 90000 });
    await page.evaluate(() => navigator.wakeLock?.request("screen").catch(() => {}));
    // Follow the load until the sim sleeps (or 45 s).
    const polls = []; let slept = null;
    while (Date.now() - tw0 < 45000) {
      assertFree();
      const p = await page.evaluate(PERF); if (p) polls.push(p);
      if (p && p.asleep && p.state !== "loading" && p.frames > 30) { slept = p; break; }
      await sleep(300);
    }
    const tw1 = Date.now();
    const run = { rep: r, link: lk, setting: st, scen: sc, url: url.replace(CFG.hostA, ""), thermal: thermal() };
    const live = polls.find((p) => p.substeps > 0);
    if (sc.startsWith("intro")) {
      const fr = (await page.evaluate(() => globalThis.__k1369)) || [];
      const first = fr.length ? fr[0][0] : null;
      const end = slept ? slept.now : polls.at(-1)?.now;
      const dts = fr.filter(([t]) => end === undefined || t <= end).map(([, d]) => d);
      run.firstFrameS = first !== null ? +(first / 1000).toFixed(2) : null;
      run.sleepS = slept ? +(slept.now / 1000).toFixed(2) : null;
      run.liveFromS = live ? +(live.now / 1000).toFixed(2) : null;
      run.n = dts.length; run.p50 = q(dts, 0.5); run.p90 = q(dts, 0.9); run.max = q(dts, 1);
      if (live && (slept || polls.length)) { const b = slept ?? polls.at(-1); run.phys = phys(live, b, (b.now - live.now) / 1000); }
      run.settle = await page.evaluate(() => { try { const s = window.__knotSettle?.(); return s ? JSON.parse(JSON.stringify(s)) : null; } catch { return null; } });
      run.gf = gfSum(await page.evaluate(GSL, null), dts.length);
      run.clocks = clocks(tw0, tw1); run.threads = threads(tw0, tw1);
    } else {
      if (!slept) run.note = "never slept before the drag";
      const g0 = await page.evaluate(GLEN);
      const pf0 = await page.evaluate(PERF);
      const n0 = await page.evaluate(() => globalThis.__k1369.length);
      const td0 = Date.now();
      const [x0, y0, x1, y1] = [150, 330, 265, 455];
      await page.touchscreen.touchStart(x0, y0);
      const N = 60;
      for (let i = 1; i <= N; i++) { const u = i / N; await page.touchscreen.touchMove(x0 + (x1 - x0) * u, y0 + (y1 - y0) * Math.sin(u * Math.PI)); await sleep(50); }
      await page.touchscreen.touchEnd();
      const pf1 = await page.evaluate(PERF);
      const td1 = Date.now();
      const dts = ((await page.evaluate((n) => globalThis.__k1369.slice(n), n0)) || []).map(([, d]) => d);
      run.n = dts.length; run.p50 = q(dts, 0.5); run.p90 = q(dts, 0.9); run.max = q(dts, 1);
      run.phys = phys(pf0, pf1, (pf1.now - pf0.now) / 1000);
      run.gf = gfSum(await page.evaluate(GSL, g0), dts.length);
      run.clocks = clocks(td0, td1); run.threads = threads(td0 - 300, td1 + 300);
      // Then until it sleeps again (the release's settle), up to 20 s.
      let ps = null; const tr0 = Date.now();
      while (Date.now() - tr0 < 20000) { assertFree(); const p = await page.evaluate(PERF); if (p?.asleep) { ps = p; break; } await sleep(250); }
      run.sleepAfterReleaseS = ps ? +((ps.now - pf1.now) / 1000).toFixed(2) : null;
    }
    out.runs.push(run); writeFileSync(file, JSON.stringify(out, null, 1));
    const th = (run.threads?.rows ?? []).slice(0, 6).map((x) => `${x.comm}:${x.run}/${x.wait}@${Object.keys(x.cores).join("")}`).join(" ");
    console.log(`${r} ${lk} ${st} ${sc}: n ${run.n} p50 ${run.p50} p90 ${run.p90} sleep ${run.sleepS ?? run.sleepAfterReleaseS} phys ${JSON.stringify(run.phys ?? null)} gf ${run.gf ? `${run.gf.rebuilds}b w${run.gf.workMs} m${run.gf.mainPerFrame}` : "-"} gpu ${run.clocks?.gpu} cpu ${JSON.stringify(run.clocks?.cpu?.map((c) => c[1]))} | ${th}`);
  }
} catch (e) { out.error = String(e && e.message || e); console.log("ERROR", out.error); }
finally {
  out.ended = new Date().toISOString(); writeFileSync(file, JSON.stringify(out, null, 1));
  if (initId) await page.removeScriptToEvaluateOnNewDocument(initId).catch(() => {});
  await page.goto(back, { waitUntil: "load" }).catch(() => {});
  await browser.disconnect(); clkS.kill(); thrS.kill();
  console.log("wrote", file);
}
