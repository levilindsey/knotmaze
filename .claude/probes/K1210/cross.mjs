// K1210 (batch 22 Run H): fire, collapse and the pulse crossing two
// junctions, shot as pinned GPU frame sets on one crop per junction.
//   S3: node_218 (3 arms) on the cyc maze;  S4: node_378 (4 arms) on the
//   four/x4 maze (same k111 link; stands_cyc.mjs links/moves verbatim).
// Fire: burn link (four/cyc link + &gm=burn&fck=turn&fsp=0.6&fdl=0&fbt=gone),
//   the turn clock L swept directly on the captured controller
//   (c.walkedDist = L; drawFire is a pure function of L), paint clock
//   pinned at 100, fire FX frozen (tickFireFx no-op + clear, K550's recipe).
// Collapse: collapse link (link + &fg=collapse), the run into the junction
//   crossed with the dot pinned by fb.anim.cur at moveSpeed 0, then the
//   move out along one arm the same way.
// Pulse: the effect-off stand (cyc / x4 verbatim), __knotPinClocks(t)
//   swept over one period at the same junction and crop.
//   node cross.mjs [S3|S4|all]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, dumpPulses, PIN, setState, frames, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";

const ONLY = process.argv[2] || "all";
const OUT = join(import.meta.dirname, "out", "frames");
mkdirSync(OUT, { recursive: true });
const DSF = 1.5, NF = 30;
const BURN = "&gm=burn&fck=turn&fsp=0.6&fdl=0&fbt=gone";
const COLLAPSE = "&fg=collapse";

const DEFS = {
  S3: {
    J: "node_218", base: "cyc", pulseBase: "cyc",
    // collapse: head node_221 -> e210 into J -> e209 out (toward node_213)
    collapseMoves: STANDS.cyc.moves, eIn: 210, eOut: 209,
  },
  S4: {
    J: "node_378", base: "x4", pulseBase: "x4",
    // collapse: four's moves without the last (head node_382) -> e176 into
    // J -> e135 out (toward mnode_27)
    collapseMoves: STANDS.four.moves.slice(0, -1), eIn: 176, eOut: 135,
  },
};

async function setup(browser, query, moves) {
  const log = [];
  const page = await openPage(browser, query, log);
  await waitAsleep(page);
  await viewStill(page);
  // Capture the controller (K139's syncBroken wrap) for the fire clock.
  await page.evaluate(() => {
    const F = window.__knotFabricRenderer();
    const orig = F.syncBroken;
    F.syncBroken = function (c) { window.__k1210c = c; return orig.call(this, c); };
  });
  for (const eid of moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused on ${query}`);
  await sleep(300);
  await page.evaluate(PIN);
  await page.evaluate(() => {
    const F = window.__knotFabricRenderer();
    F.tickFireFx = function () {};
    if (F.fireFx) F.fireFx.clear();
    for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
  });
  await frames(page, 3);
  return { page, log };
}

// Junction geometry in CSS screen px: J's point, px-per-world, and every
// arm's centreline (runPoint samples ordered from J outward, with the
// world distance of each sample from J along the run).
const jGeom = (page, J) =>
  page.evaluate((J) => {
    const k = window.__knotFabric(), fb = window.__knotFabricRenderer(), W = fb.walk;
    const js = k.vertexScreen(J);
    const a = k.toWorld(js.x, js.y), b = k.toWorld(js.x + 100, js.y);
    const ppw = 100 / Math.hypot(b.x - a.x, b.y - a.y);
    const v = W.vertices.get(J);
    const arms = v.edges.map((eid) => {
      const e = W.edges[eid];
      const far = e.va === J ? e.vb : e.va;
      const pts = [];
      for (let i = 0; i <= 64; i++) { const q = k.runPoint(eid, i / 64); pts.push({ x: q.x, y: q.y, wx: q.wx, wy: q.wy }); }
      const d0 = Math.hypot(pts[0].x - js.x, pts[0].y - js.y), d1 = Math.hypot(pts[pts.length - 1].x - js.x, pts[pts.length - 1].y - js.y);
      if (d0 > d1) pts.reverse();
      let cum = 0; const samples = pts.map((p, i) => { if (i) cum += Math.hypot(p.wx - pts[i - 1].wx, p.wy - pts[i - 1].wy); return { ...p, s: cum }; });
      return { eid, far, len: e.length, world: cum, samples };
    });
    return { J, js, ppw, arms, head: k.head, view: window.__knotView() };
  }, J);

const cropOf = (g) => {
  const half = Math.ceil(2.55 * g.ppw);
  return { x: Math.round(g.js.x - half), y: Math.round(g.js.y - half), width: half * 2, height: half * 2, half };
};

async function shoot(page, clip, file) {
  const buf = await page.screenshot({ type: "png", clip });
  writeFileSync(file, buf);
}

async function fireSet(browser, name, def) {
  const st = STANDS[def.base];
  const { page, log } = await setup(browser, linkOf(st) + BURN, st.moves);
  try {
    const info = await page.evaluate(() => {
      const c = window.__k1210c, k = window.__knotFabric();
      return { head: k.head, dist: Object.fromEntries(c.fire.dist), speed: c.fire.speed, delay: c.fire.delay, walked: c.walkedDist };
    });
    const g = await jGeom(page, def.J);
    const clip = cropOf(g);
    const dJ = info.dist[def.J];
    const tree = g.arms.map((arm) => ({ eid: arm.eid, far: arm.far, len: arm.len, dFar: info.dist[arm.far] })).sort((x, y) => x.dFar - y.dFar);
    const meta = { stand: name, effect: "fire", J: def.J, query: linkOf(st) + BURN, moves: st.moves, head: info.head, dJ, speed: info.speed, delay: info.delay, tree, geom: g, clip, frames: [] };
    const R0 = dJ - 1.15, R1 = dJ + 1.35;
    for (let i = 0; i < NF; i++) {
      const R = R0 + ((R1 - R0) * i) / (NF - 1);
      const L = info.delay + R / info.speed;
      await page.evaluate((L) => { window.__k1210c.walkedDist = L; }, L);
      await frames(page, 3); await sleep(100);
      const file = join(OUT, `${name}_fire_f${String(i).padStart(2, "0")}.png`);
      await shoot(page, clip, file);
      meta.frames.push({ i, R: +R.toFixed(4), L: +L.toFixed(4), file: file.split(/[\\/]/).pop() });
    }
    meta.ctxLost = await page.evaluate(() => window.__ctxLost);
    meta.errors = log.filter((l) => l.includes("pageerror"));
    writeFileSync(join(OUT, `${name}_fire.json`), JSON.stringify(meta, null, 1));
    console.log(`${name} fire: dJ ${dJ.toFixed(3)} r ${info.speed} tree ${tree.map((t) => `e${t.eid}(d ${t.dFar.toFixed(2)})`).join(" ")} ctxLost ${meta.ctxLost} errors ${meta.errors.length}`);
  } finally { await page.close(); }
}

async function collapseSet(browser, name, def) {
  const st = STANDS[def.base];
  const { page, log } = await setup(browser, linkOf(st) + COLLAPSE, def.collapseMoves);
  try {
    const g0 = await jGeom(page, def.J);
    const head0 = await page.evaluate(() => window.__knotFabric().head);
    // Start the move into J and freeze its pace; pin the dot by anim.cur.
    const started = await page.evaluate((eid) => {
      const F = window.__knotFabricRenderer();
      F.moveSpeed = 0;
      return window.__knotTurnMove(eid);
    }, def.eIn);
    if (!started) throw new Error(`${name} collapse move e${def.eIn} refused from ${head0}`);
    const anim0 = await page.evaluate(() => { const a = window.__knotFabricRenderer().anim; return a ? { from: a.from, to: a.to } : null; });
    if (!anim0) throw new Error(`${name} collapse: no anim for e${def.eIn}`);
    await viewStill(page);
    const g = await jGeom(page, def.J);
    const clip = cropOf(g);
    const meta = { stand: name, effect: "collapse", J: def.J, query: linkOf(st) + COLLAPSE, moves: def.collapseMoves, eIn: def.eIn, eOut: def.eOut, headBefore: head0, geom: g, clip, frames: [] };
    const inArm = g.arms.find((a) => a.eid === def.eIn), outArm = g.arms.find((a) => a.eid === def.eOut);
    const shotAt = async (i, label, clock) => {
      await frames(page, 2); await sleep(80);
      const jsNow = await page.evaluate((J) => window.__knotFabric().vertexScreen(J), def.J);
      const file = join(OUT, `${name}_collapse_f${String(i).padStart(2, "0")}.png`);
      await shoot(page, clip, file);
      meta.frames.push({ i, label, clock, jsNow, file: file.split(/[\\/]/).pop() });
    };
    let i = 0;
    const nin = 16;
    for (let k = 0; k < nin; k++, i++) {
      const frac = Math.max(0, 1 - 1.2 / inArm.world) + (1 - Math.max(0, 1 - 1.2 / inArm.world)) * (k / (nin - 1));
      const got = await page.evaluate((f) => {
        const F = window.__knotFabricRenderer(), a = F.anim;
        if (!a) return -1;
        F.moveSpeed = 0;
        a.cur = a.from + (a.to - a.from) * f;
        return F.moveProgress;
      }, frac);
      await shotAt(i, `in f${frac.toFixed(3)}`, +(((1 - got) * inArm.world) * -1).toFixed(3));
    }
    // Land, then the move out.
    await page.evaluate(() => { const F = window.__knotFabricRenderer(); F.moveSpeed = 1; });
    for (let t = 0; t < 100; t++) { await sleep(100); if (!(await page.evaluate(() => window.__knotFabric().animating))) break; }
    await sleep(300);
    const brokenMid = await page.evaluate(() => window.__knotFabric().broken);
    meta.brokenAfterIn = brokenMid;
    const started2 = await page.evaluate((eid) => { const F = window.__knotFabricRenderer(); F.moveSpeed = 0; return window.__knotTurnMove(eid); }, def.eOut);
    if (!started2) throw new Error(`${name} collapse move out e${def.eOut} refused at ${def.J}`);
    const nout = NF - nin;
    for (let k = 0; k < nout; k++, i++) {
      const frac = (Math.min(1, 1.2 / outArm.world)) * (k / (nout - 1));
      const got = await page.evaluate((f) => {
        const F = window.__knotFabricRenderer(), a = F.anim;
        if (!a) return -1;
        F.moveSpeed = 0;
        a.cur = a.from + (a.to - a.from) * f;
        return F.moveProgress;
      }, frac);
      await shotAt(i, `out f${frac.toFixed(3)}`, +(got * outArm.world).toFixed(3));
    }
    meta.ctxLost = await page.evaluate(() => window.__ctxLost);
    meta.errors = log.filter((l) => l.includes("pageerror"));
    writeFileSync(join(OUT, `${name}_collapse.json`), JSON.stringify(meta, null, 1));
    console.log(`${name} collapse: head ${head0} -> ${def.J} via e${def.eIn}, out e${def.eOut}; broken after in [${brokenMid}] ctxLost ${meta.ctxLost} errors ${meta.errors.length}`);
  } finally { await page.close(); }
}

async function pulseSet(browser, name, def) {
  const st = STANDS[def.pulseBase];
  const { page, log } = await setup(browser, linkOf(st), st.moves);
  try {
    const dump = await dumpPulses(page);
    const g = await jGeom(page, def.J);
    const clip = cropOf(g);
    const P = dump.spacing / 1.6;
    const meta = { stand: name, effect: "pulse", J: def.J, query: linkOf(st), moves: st.moves, head: dump.head, spacing: dump.spacing, period: P, geom: g, clip, frames: [] };
    for (let i = 0; i < NF; i++) {
      const t = 100 + (i * P) / NF;
      await setState(page, { t, dbg: 0, webs: true });
      const file = join(OUT, `${name}_pulse_f${String(i).padStart(2, "0")}.png`);
      await shoot(page, clip, file);
      meta.frames.push({ i, t: +t.toFixed(4), file: file.split(/[\\/]/).pop() });
    }
    // Debug view 5 at the same clocks: G is the pulse field itself, the
    // clean front observable (the normal view saturates near the head).
    const metaD = { ...meta, effect: "pulseD", frames: [] };
    for (let i = 0; i < NF; i++) {
      const t = 100 + (i * P) / NF;
      await setState(page, { t, dbg: 5, webs: true });
      const file = join(OUT, `${name}_pulseD_f${String(i).padStart(2, "0")}.png`);
      await shoot(page, clip, file);
      metaD.frames.push({ i, t: +t.toFixed(4), file: file.split(/[\\/]/).pop() });
    }
    writeFileSync(join(OUT, `${name}_pulseD.json`), JSON.stringify(metaD, null, 1));
    meta.ctxLost = await page.evaluate(() => window.__ctxLost);
    meta.errors = log.filter((l) => l.includes("pageerror"));
    writeFileSync(join(OUT, `${name}_pulse.json`), JSON.stringify(meta, null, 1));
    console.log(`${name} pulse: head ${dump.head} P ${P.toFixed(3)}s ctxLost ${meta.ctxLost} errors ${meta.errors.length}`);
  } finally { await page.close(); }
}

const browser = await openBrowser();
try {
  for (const name of ["S3", "S4"]) {
    if (ONLY !== "all" && ONLY !== name) continue;
    const fx = process.env.K1210_FX || "all";
    if (fx === "all" || fx === "fire") await fireSet(browser, name, DEFS[name]);
    if (fx === "all" || fx === "collapse") await collapseSet(browser, name, DEFS[name]);
    if (fx === "all" || fx === "pulse") await pulseSet(browser, name, DEFS[name]);
  }
} finally { await browser.close(); }
