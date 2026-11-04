// K1139 frame strips at pinned clock times, plus the CPU mirror's pulse
// profile per arm at each time.
//   node strips.mjs <stand> <outDir> [frames=8] [pxPerWorld=60 (0: no zoom)] [extraLinkKeys]
// Stands (k111 unless noted; phw=0 so every load sleeps in one state):
//   fork   head node_12: a plain 3-arm fork (arrival e0, choices e246, e247)
//   cross  head node_116: choice e150 (2.08 world) ends inside the reach at
//          mnode_48, whose arms e21 / e151 are lit beyond it
//   four   head at node_378, a 4-arm junction
//   pre4   one run before node_378 (its 4 arms lit beyond when in reach)
// Writes <outDir>/<stand>_t<k>_<view>.png (view: n = normal, d = debug 5,
// w = webs off), <stand>.json (declaration, crop, profiles per frame).
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, dumpPulses, PIN, setState, sleep, frames } from "./lib.mjs";

const Q = "k111&am=instant&fw=0&snd=none&phw=0";
export const STANDS = {
  fork: { q: Q, moves: [0], focus: ["node_12"] },
  cross: { q: Q, moves: [0, 246, 82, 83, 199], focus: ["node_116", "mnode_48"] },
  four: { q: Q, moves: [0, 247, 248, 69, 72, 73, 95, 140, 180, 176], focus: ["node_378"] },
  pre4: { q: Q, moves: [0, 247, 248, 69, 72, 73, 95, 140, 180], focus: ["node_378"] },
  // Head mnode_48, arrived by e150 from node_116 (2.08 world), whose other
  // arms e198 / e199 sit inside the reach, behind the player.
  src: { q: Q, moves: [0, 246, 82, 83, 199, 150], focus: ["node_116", "mnode_48"] },
};

// K1139_INJECT=fixed: before the pins, re-declare the pulses the way the
// design's S2 would (option B, "ripple"): one lit tree from a Dijkstra over
// LATTICE lengths from the head, dist0 = the sum of live WORLD spans along
// the tree, cont on every arm the light carries through (the head's own
// choices too), and the arrival's side of the tree INWARD (the previous
// junction a confluence, not a source). Cycle-closing arms are emitted from
// their nearer end with no cont (no ridge yet: S4). setPaint is wrapped so
// the app's own re-declarations keep the injected pulses.
const INJECT = process.env.K1139_INJECT || "";
const INJECT_FIXED = async () => {
  const PM = await import("/src/render/paint_math.ts");
  const MD = await import("/src/render/paint_model.ts");
  const D = MD.kData();
  const r = window.__knotRenderer(), fb = window.__knotFabricRenderer(), k = window.__knotFabric();
  const W = fb.walk, S = r.paintState, reach = r.pulseReach, head = k.head;
  const span = (e) => {
    const c = PM.kChain(D, e.chain);
    return c.closed ? Math.abs(PM.kArcU(D, c, e.ctrlB) - PM.kArcU(D, c, e.ctrlA)) : Math.abs(PM.kArcOfCtrl(D, c, e.ctrlB) - PM.kArcOfCtrl(D, c, e.ctrlA));
  };
  const edgeOf = (p) => W.edges.find((e) => e.chain === p.chain && ((e.ctrlA === p.cJunction && e.ctrlB === p.cFar) || (e.ctrlB === p.cJunction && e.ctrlA === p.cFar)));
  const arr = S.paintPulses.find((p) => p.inward);
  const arrival = arr ? edgeOf(arr)?.id ?? -1 : -1;
  // Dijkstra over lattice lengths (the stable tree), world sums along it.
  const lat = new Map([[head, 0]]), wld = new Map([[head, 0]]), par = new Map([[head, -1]]), reg = new Map([[head, -1]]);
  const done = new Set();
  for (;;) {
    let u = null, best = Infinity;
    for (const [v, dv] of lat) if (!done.has(v) && dv < best) { best = dv; u = v; }
    if (u === null || best >= reach) break;
    done.add(u);
    for (const eid of W.vertices.get(u).edges) {
      const e = W.edges[eid];
      if (e.chain < 0 || e.va === e.vb) continue;
      const w = e.va === u ? e.vb : e.va, nd = best + e.length;
      if (!lat.has(w) || nd < lat.get(w)) {
        lat.set(w, nd); wld.set(w, wld.get(u) + span(e)); par.set(w, eid);
        reg.set(w, u === head ? eid : reg.get(u));
      }
    }
  }
  const items = [], rows = [];
  const seen = new Set();
  for (const u of done) {
    for (const eid of W.vertices.get(u).edges) {
      const e = W.edges[eid];
      if (e.chain < 0 || seen.has(eid)) continue;
      const loop = e.va === e.vb;
      const w = e.va === u ? e.vb : e.va;
      // Emit from the tree parent end; a non-tree arm from its nearer end.
      const tree = par.get(w) === eid;
      if (!loop && !tree && done.has(w) && (lat.get(w) < lat.get(u) || (lat.get(w) === lat.get(u) && w < u))) continue;
      seen.add(eid);
      const d0 = Math.round(wld.get(u) * 1000) / 1000, sp = span(e);
      const back = u === head ? eid === arrival : reg.get(u) === arrival;
      const farV = W.vertices.get(w);
      const cont = tree && !loop && done.has(w) && !(farV && farV.isEnd) && d0 + sp < reach;
      const ends = loop ? [[e.ctrlA, e.ctrlB], [e.ctrlB, e.ctrlA]] : [e.va === u ? [e.ctrlA, e.ctrlB] : [e.ctrlB, e.ctrlA]];
      for (const [cj, cf] of ends) items.push({ chain: e.chain, cJunction: cj, cFar: cf, inward: back, hovered: false, dist0: d0, cont });
      rows.push({ edge: eid, near: u, far: w, tree, loop, inward: back, dist0: d0, world: +sp.toFixed(4), lattice: e.length, cont });
    }
  }
  window.__k1139Pulses = items;
  const orig = r.setPaint;
  r.setPaint = function (spans, pulses, caps, routes, traveled) {
    if (!window.__k1139Own) pulses = window.__k1139Pulses;
    return orig.call(this, spans, pulses, caps, routes, traveled);
  };
  window.__k1139Own = true;
  r.setPaint(S.paintSpans, items, S.paintCaps, S.paintRoutes, S.paintTraveled);
  window.__k1139Own = false;
  return { head, arrival, reach, rows, wld: [...wld].map(([v, d]) => [v, +d.toFixed(4)]) };
};

const [, , STAND, OUTARG, NF = "8", ZD = "60", EXTRA = ""] = process.argv;
const st = STANDS[STAND];
if (!st) throw new Error(`stand ${STAND}?`);
const OUT = resolve(OUTARG);
mkdirSync(OUT, { recursive: true });
const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, st.q + EXTRA, log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  let decl = await dumpPulses(page);
  // Zoom on the focus (ctrl + wheel: the pinch path), then park the pointer.
  const fpt = await page.evaluate((ids) => {
    const k = window.__knotFabric();
    const ps = ids.map((id) => k.vertexScreen(id));
    return { x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length };
  }, st.focus);
  // Px per world unit at the focus, from the fabric's own inverse map.
  const pxPerWorld = () => page.evaluate((p) => {
    const k = window.__knotFabric();
    const a = k.toWorld(p.x, p.y), b = k.toWorld(p.x + 100, p.y);
    return 100 / Math.hypot(b.x - a.x, b.y - a.y);
  }, fpt);
  const target = Number(ZD) > 0 ? Number(ZD) : 0; // ZD > 0: px per world unit wanted
  const wheel = async (dy) => {
    await page.mouse.move(fpt.x, fpt.y);
    await page.keyboard.down("Control");
    await page.mouse.wheel({ deltaY: dy });
    await page.keyboard.up("Control");
    await sleep(250);
    await viewStill(page);
  };
  let s0 = await pxPerWorld();
  if (target > 0 && s0 < target * 0.97) {
    await wheel(-30);
    const s1 = await pxPerWorld();
    const kEff = Math.log(s1 / s0) / 30;
    if (kEff > 0 && s1 < target * 0.97) await wheel(-Math.log(target / s1) / kEff);
  }
  const scale = await pxPerWorld();
  await page.mouse.move(2, 2);
  await sleep(400);
  await viewStill(page);
  await waitAsleep(page, 20000);
  let inject = null;
  if (INJECT === "fixed") {
    inject = await page.evaluate(INJECT_FIXED);
    decl = await dumpPulses(page);
  }
  await page.evaluate(PIN);
  await sleep(200);
  const foc = await page.evaluate((ids) => {
    const k = window.__knotFabric();
    return ids.map((id) => k.vertexScreen(id));
  }, st.focus);
  const cx = foc.reduce((a, p) => a + p.x, 0) / foc.length, cy = foc.reduce((a, p) => a + p.y, 0) / foc.length;
  const W = Number(process.env.CLIPW || 640), H = Number(process.env.CLIPH || 420);
  const clip = { x: Math.max(0, Math.round(cx - W / 2)), y: Math.max(0, Math.round(cy - H / 2)), width: W, height: H };
  const spacing = decl.spacing, period = spacing / 1.6, nf = Number(NF);
  const rows = [];
  for (let k = 0; k < nf; k++) {
    const t = 100 + (k * period) / nf;
    for (const [view, dbg, webs] of [["n", 0, true], ["d", 5, true]]) {
      await setState(page, { t, dbg, webs });
      writeFileSync(join(OUT, `${STAND}_t${k}_${view}.png`), await page.screenshot({ type: "png", clip }));
    }
    if (k === 0) {
      await setState(page, { t, dbg: 0, webs: false });
      writeFileSync(join(OUT, `${STAND}_t${k}_w.png`), await page.screenshot({ type: "png", clip }));
      // The base for mock-ups: the same frame with no pulses declared
      // (setPaint with pulses [], then the live declaration put back and
      // pulseBorn re-zeroed, since a pulse-key change restarts the fade).
      await page.evaluate(() => {
        const r = window.__knotRenderer(), S = r.paintState;
        window.__k1139Saved = [S.paintSpans, S.paintPulses, S.paintCaps, S.paintRoutes, S.paintTraveled];
        window.__k1139Own = true;
        r.setPaint(S.paintSpans, [], S.paintCaps, S.paintRoutes, S.paintTraveled);
        window.__k1139Own = false;
      });
      await setState(page, { t, dbg: 0, webs: true });
      writeFileSync(join(OUT, `${STAND}_t${k}_b.png`), await page.screenshot({ type: "png", clip }));
      // Webs off, no pulses: with _w and _n, the fan mask for the mock-ups.
      await setState(page, { t, dbg: 0, webs: false });
      writeFileSync(join(OUT, `${STAND}_t${k}_bw.png`), await page.screenshot({ type: "png", clip }));
      await page.evaluate(() => {
        const r = window.__knotRenderer();
        window.__k1139Own = true;
        r.setPaint(...window.__k1139Saved);
        window.__k1139Own = false;
        r.pulseBorn = 0;
      });
      await setState(page, { t, dbg: 0, webs: true });
    }
    // The CPU mirror's v along every declared arm at this time.
    const prof = await page.evaluate(async () => {
      const PM = await import("/src/render/paint_math.ts");
      const MD = await import("/src/render/paint_model.ts");
      const U = MD.knotUniformValues();
      const r = window.__knotRenderer();
      const D = MD.kData();
      return r.paintState.paintPulses.map((p) => {
        const c = PM.kChain(D, p.chain);
        const span = c.closed ? Math.abs(PM.kArcU(D, c, p.cFar) - PM.kArcU(D, c, p.cJunction)) : Math.abs(PM.kArcOfCtrl(D, c, p.cFar) - PM.kArcOfCtrl(D, c, p.cJunction));
        const v = [];
        for (let d = 0; d <= span + 1e-9; d += 0.02) v.push(+PM.kPulseV(U, d, span, !!p.inward, !!p.hovered, p.dist0 ?? 0, !!p.cont).toFixed(4));
        return { chain: p.chain, cJ: p.cJunction, cF: p.cFar, span, v, uPulse: Array.from(U.uKPulse), uReach: Array.from(U.uKReach) };
      });
    });
    rows.push({ k, t, prof });
  }
  await setState(page, { t: 100, dbg: 0, webs: true });
  const ctxLost = await page.evaluate(() => window.__ctxLost);
  // Screen points along each declared arm (for drawing over the frames).
  const armPts = await page.evaluate(() => {
    const r = window.__knotRenderer(), k = window.__knotFabric(), fb = window.__knotFabricRenderer(), W = fb.walk;
    return r.paintState.paintPulses.map((p) => {
      const e = W.edges.find((e) => e.chain === p.chain && ((e.ctrlA === p.cJunction && e.ctrlB === p.cFar) || (e.ctrlB === p.cJunction && e.ctrlA === p.cFar)));
      if (!e) return null;
      const atA = e.ctrlA === p.cJunction, pts = [];
      for (let i = 0; i <= 20; i++) { const f = i / 20; pts.push(k.runPoint(e.id, atA ? f : 1 - f)); }
      return { edge: e.id, pts };
    });
  });
  const stamp = await page.evaluate(() => [...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /sim .* wall/.test(t)) || "");
  const params = await page.evaluate(() => { try { return window.__knotParams(); } catch { return null; } });
  const loop = await page.evaluate(() => { try { const L = window.__knotLoop(); return { mode: L.mode, stopped: L.stopped }; } catch { return null; } });
  writeFileSync(join(OUT, `${STAND}.json`), JSON.stringify({ stand: STAND, q: st.q + EXTRA, moves: st.moves, inject, decl, clip, foc, scale, period, rows, armPts, stamp, ctxLost, loop, params, log }, null, 1));
  console.log(`${STAND}: head ${decl.head} clip ${JSON.stringify(clip)} scale ${scale.toFixed(1)} px/world ctxLost ${ctxLost} pulses ${decl.pulses.length} stamp ${stamp}`);
} finally {
  await browser.close();
}
