// K1220 S2 shooter (after Run N's shoot.mjs): every text fork, on each host, at
// rest and in the states the text shows that reach a fork; plus the maze's
// x4, cross and loop stands at rest, for the whole-frame diff.
//   node shoot.mjs <outDir> <set> [hosts] [words]
//     set   rest   : text stands, rest + fans hidden (nofans)
//           states : rest, nofans, pluck (its clock stepped by hand), flow
//                    (fw 0.3, flow time pinned at two values) and the
//                    appearance reveal (ap=trace&afx=none, its clock held
//                    at four fractions)
//           maze   : the maze stands at rest
//     hosts master=http://127.0.0.1:5970,mine=http://127.0.0.1:5971
//     words a,i,ai,ia,aa,ii (every letter there is, plus Run N's "ai", "a")
//   env DSF (default 2): device scale factor of every shot.
// Layout: <outDir>/<host label>/<stand>[_<state family>]/<shot>.png with a
// meta.json per dir (dsf, recs: ji, world centre c, screen sx/sy, record,
// arms, taper-hidden), the format K1218's sheets tool reads. Every shot is
// taken once the sim sleeps (phw=0: the same state on every load), clocks
// pinned (the paint clock, the background, the explore clock), DOM chrome
// hidden. The served code is checked with a mark: a host's joinery.ts holds
// "K1220 S2" on mine, never on master.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, sleep, frames, PIN } from "./lib.mjs";

const OUT = resolve(process.argv[2] || "out/shots");
const SET = process.argv[3] || "rest";
const HOSTS = (process.argv[4] || "master=http://127.0.0.1:5970,mine=http://127.0.0.1:5971")
  .split(",").map((s) => { const [label, url] = s.split("="); return { label, url }; });
const WORDS = (process.argv[5] || "a,i,ai,ia,aa,ii").split(",");
const DSF = Number(process.env.DSF || 2);
const XH = [
  { id: "xh3", hash: "glyphs2" },
  { id: "xh2", hash: "glyphs2=xh2" },
];
const MAZE = [
  { id: "maze_x4", q: "k111&am=instant&fw=0&snd=none&phw=0&pr=8" },
  { id: "maze_cross", q: "k111&am=instant&fw=0&snd=none&phw=0" },
  { id: "maze_loop", q: "1&am=instant&fw=0&snd=none&phw=0&pr=8" },
];

async function newPage(browser, log) {
  const page = await browser.newPage();
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warn") log.push(`[${m.type()}] ${m.text()}`); });
  page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: DSF });
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await page.evaluateOnNewDocument(() => {
    window.__knotLoopMode = "continuous";
    window.__ctxLost = 0;
    document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true);
  });
  return page;
}

// Load, optionally install the reveal hold (the reveal's clock set to
// window.__revealHold every tick while it is not null), wait for sleep.
async function load(page, url, { hold = false } = {}) {
  await page.goto(url, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer(), { timeout: 60000 });
  if (hold) {
    await page.evaluate(async () => {
      const M = await import("/src/render/reveal.ts");
      const P = M.RevealAnimator.prototype;
      if (!P.__k1220) {
        const orig = P.tick;
        P.tick = function (dt) {
          if (window.__revealHold != null) { this.t = window.__revealHold * this.plan.duration; return; }
          return orig.call(this, dt);
        };
        P.__k1220 = true;
      }
      window.__revealHold = 0;
    });
  }
  let asleep = false;
  for (const t0 = Date.now(); Date.now() - t0 < 60000; await sleep(300)) {
    asleep = await page.evaluate(() => { const p = window.__knotPerf ? window.__knotPerf() : null; return !!(p && p.asleep); });
    if (asleep) break;
  }
  await sleep(600);
  return asleep;
}

// REVEAL: the trace sequence with no particle effect (ap=trace&afx=none:
// the effects animate on wall time) at 0.2 / 0.4 / 0.6 / 0.8 of the plan.
// The renderer's revealPin pins the animator's t AND the FX clock at that
// instant: the fans' and discs' joint gates read the FX clock, and pinAll
// alone left it at the load wait's wall time, so every joint piece showed
// over strokes the held reveal had not drawn yet (both builds).
async function shootReveal(page, st, host, mark, famDir) {
  const revUrl = `${st.base}&ap=trace&afx=none&fw=0#${st.xh.hash}`;
  const rasleep = await load(page, revUrl, { hold: true });
  await pinAll(page);
  const rd = famDir("reveal");
  let rinf = null;
  for (const fr of [0.2, 0.4, 0.6, 0.8]) {
    const pinned = await page.evaluate((fr) => {
      window.__revealHold = fr;
      const r = window.__knotRenderer(), rv = window.__knotReveal && window.__knotReveal();
      const ok = !!(rv && r.revealPin && r.revealPin(fr * rv.duration));
      r.update(); r.rebuildFillets(true);
      return ok;
    }, fr);
    if (!pinned) console.log(`   reveal ${fr}: revealPin failed`);
    await frames(page, 8); await sleep(300);
    if (!rinf) { rinf = await info(page); writeMeta(rd, { host: host.url, mark, url: revUrl, asleep: rasleep, ...rinf }); }
    await shotTo(page, rd, `reveal_${Math.round(fr * 100)}`);
  }
  const rev = await page.evaluate(() => window.__knotReveal && window.__knotReveal());
  console.log(`   reveal ${JSON.stringify(rev)}`);
}

const pinAll = (page) => page.evaluate(() => {
  const pin = new Function("return (" + window.__k1220pin + ")")();
  pin();
  const F = window.__knotFabricRenderer && window.__knotFabricRenderer();
  if (F) {
    F.exploreClock = 1000;
    const p = Object.getPrototypeOf(F);
    if (p.tickExplore) F.tickExplore = function () { return p.tickExplore.call(this, 0); };
  }
});

async function info(page) {
  return page.evaluate(() => {
    const r = window.__knotRenderer(), v = window.__knotView();
    const fp = r.fieldProbe;
    const glyph = r.style.glyph || [];
    const recs = [];
    const n = r.junctionArms ? r.junctionArms.length : 0;
    for (let ji = 0; ji < n; ji++) {
      const c = fp && fp.center(ji);
      if (!c) continue;
      const jn = r.junctionArms[ji];
      recs.push({
        ji, c: [c[0], c[1]], sx: c[0] * v.s + v.x, sy: c[1] * v.s + v.y,
        rb: fp.record(ji), recArms: (fp.arms(ji) || []).length, nArms: jn.arms.length,
        glyph: jn.arms.some((a) => glyph[a.chain]), hidden: r.taperHideJn ? r.taperHideJn[ji] : 0,
        arms: jn.arms.map((a) => ({ chain: a.chain, slot: a.slot, dir: a.dir })),
      });
    }
    const stamp = [...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /^P\d/.test(t)) || "";
    return { recs, view: { x: v.x, y: v.y, s: v.s }, fh: r.style.threadWidth / 2, stamp: stamp.split(" | sim")[0], ctxLost: window.__ctxLost || 0 };
  });
}

const settle = async (page) => { await frames(page, 4); await sleep(200); };
const fans = (page, on) => page.evaluate((on) => {
  const r = window.__knotRenderer();
  if (r.filletMesh) r.filletMesh.mesh.renderable = on;
  if (r.filletTopMesh) r.filletTopMesh.mesh.renderable = on;
}, on);

function writeMeta(dir, obj) {
  writeFileSync(join(dir, "meta.json"), JSON.stringify({ dsf: DSF, ...obj }, null, 1));
}

async function shotTo(page, dir, name) {
  writeFileSync(join(dir, name + ".png"), await page.screenshot({ type: "png" }));
}

const browser = await openBrowser();
const summary = [];
try {
  for (const host of HOSTS) {
    const src = await (await fetch(`${host.url}/src/render/ribbon/joinery.ts`)).text();
    const mark = src.includes("K1220 S2");
    console.log(`${host.label} ${host.url} mark=${mark}`);
    const log = [];
    const page = await newPage(browser, log);
    await page.evaluateOnNewDocument((pinSrc) => { window.__k1220pin = pinSrc; }, PIN.toString());
    const stands = SET === "maze" ? MAZE.map((m) => ({ id: m.id, base: `${host.url}/?${m.q}` }))
      : WORDS.flatMap((w) => XH.map((x) => ({ id: `${w}_${x.id}`, word: w, xh: x, base: `${host.url}/?7&txt=${w}&snd=none&phw=0` })));
    for (const st of stands) {
      const t0 = Date.now();
      const famDir = (fam) => { const d = join(OUT, host.label, fam ? `${st.id}_${fam}` : st.id); mkdirSync(d, { recursive: true }); return d; };
      // SET "reveal": only the reveal family (text stands).
      if (SET === "reveal") { if (st.word) await shootReveal(page, st, host, mark, famDir); console.log(`${host.label} ${st.id}: reveal ${((Date.now() - t0) / 1000).toFixed(0)}s`); continue; }
      // REST (and nofans; for text stands the pluck on the rest page).
      const restUrl = st.word ? `${st.base}&am=instant&fw=0#${st.xh.hash}` : st.base;
      const asleep = await load(page, restUrl);
      await pinAll(page);
      await settle(page);
      const inf = await info(page);
      const dir = famDir("");
      writeMeta(dir, { host: host.url, mark, url: restUrl, asleep, ...inf });
      await shotTo(page, dir, "rest");
      if (st.word) {
        await fans(page, false); await settle(page);
        await shotTo(page, dir, "nofans");
        await fans(page, true); await settle(page);
      }
      if (SET === "states" && st.word) {
        // PLUCK: a tap's pluck on the host chain, 3 ctrl off each text fork's
        // host slot. The pluck clock is frozen (tickPlucks a no-op) and
        // stepped by hand, so both hosts shoot the same pluck age: 0.1 s
        // (six 1/60 s steps), then stepped on until the pluck is gone.
        const forks = inf.recs.filter((r) => r.glyph);
        const pd = famDir("pluck");
        writeMeta(pd, { host: host.url, mark, url: restUrl, asleep, ...inf });
        await page.evaluate(() => { const r = window.__knotRenderer(); r.tickPlucks = function () {}; });
        const stepPluck = (n) => page.evaluate((n) => {
          const r = window.__knotRenderer(), proto = Object.getPrototypeOf(r);
          for (let i = 0; i < n; i++) proto.tickPlucks.call(r, 1 / 60);
          const s = window.__knotPluckState();
          return s && s.active ? s.active.length : 0;
        }, n);
        for (const f of forks) {
          const a = f.arms[0];
          const ok = await page.evaluate((c, k) => window.__knotPluck(c, k), a.chain, a.slot + 3);
          await stepPluck(6);
          await settle(page);
          await shotTo(page, pd, `pluck_ji${f.ji}`);
          let left = 1;
          for (let w = 0; w < 60 && left; w++) left = await stepPluck(60);
          await settle(page);
          if (!ok || left) console.log(`   pluck ji${f.ji}: started=${!!ok} still active=${left}`);
        }
        // FLOW: fw 0.3 (the default), flow time pinned at 2.5 and 4.1.
        const flowUrl = `${st.base}&am=instant&fw=0.3#${st.xh.hash}`;
        const fasleep = await load(page, flowUrl);
        await pinAll(page);
        const fd = famDir("flow");
        let finf = null;
        for (const [k, ft] of [["flow_a", 2.5], ["flow_b", 4.1]]) {
          await page.evaluate((ft) => { const r = window.__knotRenderer(); r.flowTime = ft; r.update(); r.rebuildFillets(true); }, ft);
          await settle(page);
          if (!finf) { finf = await info(page); writeMeta(fd, { host: host.url, mark, url: flowUrl, asleep: fasleep, ...finf }); }
          await shotTo(page, fd, k);
        }
        await shootReveal(page, st, host, mark, famDir);
      }
      const ctxLost = await page.evaluate(() => window.__ctxLost || 0);
      const line = `${host.label} ${st.id}: asleep=${asleep} s=${inf.view.s.toFixed(1)} recs=${inf.recs.length} text=${inf.recs.filter((r) => r.glyph).map((r) => `ji${r.ji}(rb${r.rb},${r.recArms}/${r.nArms}${r.hidden ? ",hid" : ""})`).join(" ")} ctxLost=${ctxLost} ${((Date.now() - t0) / 1000).toFixed(0)}s ${inf.stamp}`;
      console.log(line);
      summary.push(line);
    }
    const errs = log.filter((l) => /pageerror|\[error\]/.test(l));
    if (errs.length) console.log(`${host.label} errors:\n  ` + errs.slice(-10).join("\n  "));
    await page.close();
  }
} finally {
  await browser.close();
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, `summary_${SET}.txt`), summary.join("\n") + "\n");
console.log("done " + SET);
