// K1387 s2: same-state play pictures (the telegraph, the yarn, underClipBand, the joinery's webs) across builds.
//   node .claude/probes/K1387/k1387_play.mjs <tag> <seed> <moves> <label>=<origin>:<off|gf> [...]
// Each cell: a headed, off-screen, real-GPU Chrome loads `<origin>/?<seed>&am=instant&mt=hunter&snd=none&fw=0&phw=0
// [&rp=gf]` (phw=0: the in-thread physics sleeps in the same state every load), waits for asleep, walks <moves>
// moves toward the exit through __knotTurnMove (the cheapest choice, ties by edge id: the same walk every load),
// waits for asleep again, pins every clock (K83's recipe and the explore clock), waits for a bit-exact view with
// frames forced, and captures the frame and a 480x360 crop around the head. Output under out/ (untracked):
// <tag>_<label>.png, <tag>_<label>_head.png, <tag>.json (the lean march's stats per cell). Diff pairs with
// k1387_pngdiff.mjs. Hold the perf lock while it runs.
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [, , tag, seed, movesArg, ...cellArgs] = process.argv;
const MOVES = Number(movesArg);
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });
const VW = 1200, VH = 800;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { seed, moves: MOVES, cells: {} };

for (const arg of cellArgs) {
  const [label, rest] = [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)];
  const at = rest.lastIndexOf(":");
  const origin = rest.slice(0, at), mode = rest.slice(at + 1);
  const url = `${origin}/?${seed}&am=instant&mt=hunter&snd=none&fw=0&phw=0${mode === "gf" ? "&rp=gf" : ""}`;
  const profileDir = join(tmpdir(), `k1387-play-${process.pid}-${label}`);
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: false,
    userDataDir: profileDir,
    args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
      `--window-size=${VW + 40},${VH + 160}`, "--disable-features=CalculateNativeWinOcclusion",
      "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
  });
  const C = { url, errs: [], walk: [] };
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
    page.on("pageerror", (e) => C.errs.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") C.errs.push(m.text()); });
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.bringToFront();
    const asleep = () => page.waitForFunction(() => {
      const p = window.__knotPerf?.();
      return p && p.state !== "loading" && p.asleep === true;
    }, { timeout: 90000, polling: 100 });
    await asleep();
    await page.evaluate(() => window.__knotLoop?.({ continuous: true }));
    for (let i = 0; i < MOVES; i++) {
      const step = await page.evaluate(() => {
        const f = window.__knotFabric();
        if (f.solved || !f.choices.length) return null;
        const c = [...f.choices].sort((a, b) => a.cost - b.cost || a.edge - b.edge)[0];
        return { edge: c.edge, ok: window.__knotTurnMove(c.edge) };
      });
      if (!step) break;
      C.walk.push(step);
      await page.waitForFunction(() => !window.__knotFabric().animating, { timeout: 30000, polling: 50 });
      await sleep(150);
    }
    await asleep();
    // pin every clock, then force frames until the view holds bit-exact
    await page.evaluate(() => {
      const r = window.__knotRenderer();
      r.advanceClocks = () => {};
      r.paintClock = 100;
      r.pulseBorn = 0;
      const F = window.__knotFabricRenderer?.();
      if (F) {
        F.exploreClock = 1000;
        if (typeof F.tickExplore === "function") { const t = F.tickExplore.bind(F); F.tickExplore = () => t(0); }
      }
    });
    let last = "", same = 0;
    for (let k = 0; k < 400 && same < 10; k++) {
      const v = await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => {
        const w = window.__knotView();
        res(`${w.x},${w.y},${w.s}`);
      })));
      same = v === last ? same + 1 : 0;
      last = v;
    }
    await sleep(800);
    const st = await page.evaluate(() => {
      const f = window.__knotFabric();
      const r = window.__knotRenderer();
      const hs = f.vertexScreen(f.head);
      return { head: f.head, headScreen: hs, solved: f.solved, lean: r.lean ?? null,
        march: r.leanMarchStats ?? null, gf: !!globalThis.__knotGf, view: window.__knotView() };
    });
    Object.assign(C, st);
    C.file = join(outDir, `${tag}_${label}.png`);
    await page.screenshot({ path: C.file });
    const hx = Math.round(Math.min(Math.max(st.headScreen.x - 240, 0), VW - 480));
    const hy = Math.round(Math.min(Math.max(st.headScreen.y - 180, 0), VH - 360));
    C.headFile = join(outDir, `${tag}_${label}_head.png`);
    await page.screenshot({ path: C.headFile, clip: { x: hx, y: hy, width: 480, height: 360 } });
  } catch (e) {
    C.errs.push(`probe: ${e.message}`);
  } finally {
    await browser.close();
    try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
  }
  out.cells[label] = C;
  console.log(`${label}: walk ${C.walk.map((s) => s.edge).join(",")} head ${C.head} march ${JSON.stringify(C.march)} errs ${C.errs.length}`);
}
writeFileSync(join(outDir, `${tag}.json`), JSON.stringify(out, null, 1));
