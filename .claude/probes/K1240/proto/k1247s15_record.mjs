// K1247 s15: record REAL consecutive frames of a design as FieldScenes: a
// grab, a pull, a hold, a release and the settle until the sim would sleep
// (sleep_gate.ts: QUIET_EPS per substep for QUIET_WINDOW sim seconds), one
// scene per 1/60 s sim frame. The page runs the app's own physics in-thread
// (phw=0): the live clock is frozen and every frame is one 1/60 s step
// through __knotStepUntil, the drag target set on the ParticleSystem the way
// input_pointer.ts does (grab at the particle, target = origin + L tanh(r/L)
// along the pull, L = tugLimit * threadWidth), then two rAFs so the renderer
// draws that state, then __knotSceneExport. Needs a dev server of this
// worktree (npx vite --port 5363 --strictPort --host 127.0.0.1).
//   node .claude/probes/K1240/proto/k1247s15_record.mjs <name> <url> [--pull=3] [--pullFrames=30]
//        [--hold=30] [--maxSettle=900] [--simT=40] [--quietEps=0.015] [--quietWin=2.5]
// Writes out/s15/rec_<name>/f<NNNN>.json.gz (frame 0 = the still state before
// the grab) and meta.json (per frame: phase, simTime, maxMove, grabbed, the
// target).
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pos = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? +a.slice(k.length + 3) : d; };
const name = pos[0] ?? "def";
const url = pos[1] ?? "http://127.0.0.1:5363/?s=b&am=instant&snd=none&tlk=border&phw=0&fw=0&stb=0";
const PULL = arg("pull", 3); const PULLF = arg("pullFrames", 30); const HOLD = arg("hold", 30);
const MAXSET = arg("maxSettle", 900); const SIMT = arg("simT", 40);
const QEPS = arg("quietEps", 0.015); const QWIN = arg("quietWin", 2.5);
const out = join(here, "..", "out", "s15", `rec_${name}`);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const profileDir = join(tmpdir(), `knotmaze-k1247s15-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false, userDataDir: profileDir, defaultViewport: null,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1100",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const meta = [];
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 300)));
  await page.setViewport({ width: 1240, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction(() => typeof window.__knotSceneExport === "function" && typeof window.__knotStepUntil === "function" && !!window.__knotPS?.(), { timeout: 120000, polling: 100 });
  const st = await page.evaluate(async (T) => {
    await window.__knotStepUntil(T);
    await window.__knotPhysFreeze(true);
    window.__knotLoop?.({ continuous: true });
    const p = window.__knotParams();
    return { simTime: window.__knotPS().simTime, tugLimit: p.tugLimit, threadWidth: p.threadWidth, kind: (await window.__knotPhysDump()).kind };
  }, SIMT);
  console.log(`stepped to ${st.simTime}, host ${st.kind}, tugLimit ${st.tugLimit}, threadWidth ${st.threadWidth}`);
  // Let the renderer catch up (samples exist), then frame 0.
  const shot = async (k, phase, extra) => {
    let r = null;
    for (let i = 0; !r; i++) {
      try {
        r = await page.evaluate(async (nm) => {
          await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
          const x = await window.__knotSceneExport({ name: nm });
          return JSON.stringify(x.scene);
        }, `${name}_f${k}`);
      } catch (e) { if (i > 40 || !/without samples|no scene/.test(e.message)) throw e; await new Promise((res) => setTimeout(res, 300)); }
    }
    writeFileSync(join(out, `f${String(k).padStart(4, "0")}.json.gz`), gzipSync(r));
    meta.push({ k, phase, ...extra });
  };
  await shot(0, "still", { simTime: st.simTime, maxMove: 0, grabbed: -1 });
  // Pick the grab: the middle particle of a chain, nearest the knot's centroid.
  const g = await page.evaluate(() => {
    const ps = window.__knotPS();
    const P = ps.positions; const n = ps.particleCount;
    let cx = 0, cy = 0; for (let i = 0; i < n; i++) { cx += P[2 * i]; cy += P[2 * i + 1]; } cx /= n; cy /= n;
    let best = -1, bd = Infinity, bt = [0, 0];
    for (const ch of ps.chains) {
      const parts = ch.particles ?? ch; const m = parts.length; if (m < 8) continue;
      const k = m >> 1; const p = parts[k]; const d = Math.hypot(P[2 * p] - cx, P[2 * p + 1] - cy);
      if (d < bd) { bd = d; best = p; const a = parts[k - 1], b = parts[k + 1]; bt = [P[2 * b] - P[2 * a], P[2 * b + 1] - P[2 * a + 1]]; }
    }
    const tl = Math.hypot(bt[0], bt[1]) || 1;
    return { p: best, x: P[2 * best], y: P[2 * best + 1], nx: -bt[1] / tl, ny: bt[0] / tl, chain: ps.particleChain?.[best] };
  });
  console.log(`grab particle ${g.p} (chain ${g.chain}) at ${g.x.toFixed(3)}, ${g.y.toFixed(3)}, pull along ${g.nx.toFixed(3)}, ${g.ny.toFixed(3)}`);
  const L = Math.max(0.1, st.tugLimit * st.threadWidth);
  const step = (op) => page.evaluate(async (o) => {
    const ps = window.__knotPS();
    if (o.grab) ps.grabAt(o.grab[0], o.grab[1], o.grab[2]);
    if (o.to) ps.dragTo(o.to[0], o.to[1]);
    if (o.release) ps.release();
    await window.__knotStepUntil(ps.simTime + 0.5 / 60);
    return { simTime: ps.simTime, maxMove: ps.maxMove, grabbed: ps.grabbedParticle };
  }, op);
  let k = 1;
  // Grab + pull.
  for (let i = 1; i <= PULLF; i++) {
    const r = (i / PULLF) * PULL * L; const e = L * Math.tanh(r / L);
    const to = [g.x + g.nx * e, g.y + g.ny * e];
    const s = await step(i === 1 ? { grab: [g.p, g.x, g.y], to } : { to });
    await shot(k++, "pull", { ...s, target: to });
  }
  for (let i = 0; i < HOLD; i++) { const s = await step({}); await shot(k++, "hold", s); }
  let quiet = 0;
  for (let i = 0; i < MAXSET; i++) {
    const s = await step(i === 0 ? { release: true } : {});
    await shot(k++, i === 0 ? "release" : "settle", s);
    quiet = s.maxMove < QEPS ? quiet + 1 / 60 : 0;
    if (quiet >= QWIN - 1e-9) { console.log(`quiet for ${QWIN} s at frame ${k - 1} (sim ${s.simTime.toFixed(3)})`); break; }
    if (i % 60 === 0) console.log(`settle ${i}: sim ${s.simTime.toFixed(3)} maxMove ${s.maxMove.toExponential(2)}`);
  }
  writeFileSync(join(out, "meta.json"), JSON.stringify({ name, url, L, grab: g, pull: PULL, pullFrames: PULLF, hold: HOLD, errors, frames: meta }, null, 1));
  console.log(`${meta.length} frames -> ${out}; page errors ${errors.length}`);
} finally {
  await browser.close();
  rmSync(profileDir, { recursive: true, force: true });
}
