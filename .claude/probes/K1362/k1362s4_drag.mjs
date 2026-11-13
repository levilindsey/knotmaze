// K1362 s4: the app's frame interval through a touch drag, under rp=gf and under today's look, in the K156 pass's
// OWN tab (lib.mjs myPage; never opens, wakes or touches anything else). The drag goes into the page over CDP touch
// (page.touchscreen), as the K156 rails say; nothing reaches the phone itself. Per (rep, setting): load the link on
// the head build (hostB), wait for the knot to sleep, record rAF intervals in the page while a 3 s drag runs across
// the knot's middle, then read __knotGf's stats (rp=gf only). ABAB. Writes out/s4/drag_<label>.json.
//   node .claude/probes/K1362/k1362s4_drag.mjs <pass config.json> <label> [reps]
import { CFG, connect, myPage, load, assertFree, sleep, thermal } from "../../../scripts/phone_pass/lib.mjs";
import { writeFileSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const label = process.argv[3];
const reps = +(process.argv[4] || 2);
const file = join(here, `out/s4/drag_${label}.json`);
const SET = { today: "?b.J&am=instant&snd=none", gf: "?b.J&am=instant&snd=none&rp=gf" };
// the GPU clock (devfreq cur_freq, read only, ~100 ms), as k1362s4_gpuclk.mjs: each run gets its drag window's median
const gnode = execFileSync(CFG.adb, ["-s", CFG.serial, "shell", "ls -d /sys/class/devfreq/*gpu*"], { encoding: "utf8" }).trim().split(/\s+/)[0];
const clk = []; let cbuf = "";
const sampler = spawn(CFG.adb, ["-s", CFG.serial, "shell", `while true; do cat ${gnode}/cur_freq; sleep 0.1; done`]);
sampler.stdout.on("data", (d) => { cbuf += d; const l = cbuf.split(/\r?\n/); cbuf = l.pop(); for (const x of l) if (/^\d+$/.test(x.trim())) clk.push([Date.now(), +x.trim() / 1e6]); });
const browser = await connect();
const page = await myPage(browser);
const back = page.url();
const out = { label, started: new Date().toISOString(), runs: [] };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1) : null; };
try {
  for (let r = 0; r < reps; r++) for (const k of r % 2 ? ["gf", "today"] : ["today", "gf"]) {
    const ld = await load(page, `${CFG.hostB}/${SET[k]}`, 30000);
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
    const mhz = q(clk.filter(([c]) => c >= td0 && c <= Date.now()).map(([, f]) => f), 0.5);
    await sleep(300);
    const dts = (await page.evaluate(() => window.__dts)) || [];
    const gf = await page.evaluate(() => { const g = globalThis.__knotGf; try { if (!g) return null; const s = typeof g.stats === "function" ? g.stats() : g.stats; return JSON.parse(JSON.stringify(s ?? null)); } catch { return null; } });
    const run = { rep: r, setting: k, mhz, stamp: ld?.stamp ?? null, n: dts.length, p50: q(dts, 0.5), p90: q(dts, 0.9), max: q(dts, 1), gf, thermal: thermal() };
    run.gfMed = gf ? Object.fromEntries(Object.entries(gf).filter(([, v]) => Array.isArray(v) && v.length && typeof v[0] === "number").map(([n, v]) => [n, q(v, 0.5)])) : null;
    out.runs.push(run); writeFileSync(file, JSON.stringify(out, null, 1));
    console.log(`${r} ${k}: n ${run.n} p50 ${run.p50} p90 ${run.p90} max ${run.max} @${mhz} MHz ${run.gfMed ? JSON.stringify(run.gfMed) : ""}`);
  }
} catch (e) { out.error = String(e && e.message || e); console.log("ERROR", out.error); }
finally {
  out.ended = new Date().toISOString(); writeFileSync(file, JSON.stringify(out, null, 1));
  await page.goto(back, { waitUntil: "load" }).catch(() => {});
  await browser.disconnect(); sampler.kill();
  console.log("wrote", file);
}