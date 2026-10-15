// phone_pass page helpers (K156; K81's k81phone.mjs): the walk (touch taps, the follow camera awaited
// before each tap), a synchronous render timer (the phone has no GPU timer
// query), the clock pins of a same-state frame, and the routed-junction list.
// Page-side functions are self-contained: puppeteer serializes them.
import { sleep, assertFree } from "./lib.mjs";

// Wait until the follow camera holds still.
export async function waitView(page, maxMs = 8000) {
  const t0 = Date.now();
  let prev = "";
  while (Date.now() - t0 < maxMs) {
    const v = JSON.stringify(await page.evaluate(() => window.__knotView()));
    if (v === prev) return;
    prev = v;
    await sleep(250);
  }
}

// `M` cheapest moves (the lowest cost-to-exit choice: the optimal route, 22
// moves on ?b.c, the 22nd solves it), each tap verified (pathEdges or the head
// must change). Taps are touches; after 6 misses it falls back to mouse clicks.
// opt.pick (K156, round 2026-10-14b, for K100's walk out and back): "cheapest"
// (the default), "forward" (the cheapest choice that is not the way back) or
// "back" (the choice whose edge is the path's last edge: a backtrack of one run).
export async function makeMoves(page, M, opt = {}) {
  const t0 = Date.now();
  let made = 0, misses = 0, stop = "";
  const state = () =>
    page.evaluate(() => {
      const k = window.__knotFabric();
      return k && { solved: k.solved, n: k.pathEdges.length, head: k.head, last: k.pathEdges.length ? k.pathEdges[k.pathEdges.length - 1] : null, choices: k.choices };
    });
  while (made < M) {
    await waitView(page, 6000);
    const f = await state();
    if (!f) { stop = "no fabric"; break; }
    if (f.solved) { stop = "solved"; break; }
    if (!f.choices.length) { stop = "no choices"; break; }
    const pick = opt.pick || "cheapest";
    const pool = pick === "forward" ? f.choices.filter((c) => c.edge !== f.last) : f.choices;
    const best = pick === "back" ? f.choices.find((c) => c.edge === f.last) : pool.length ? pool.reduce((a, b) => (b.cost < a.cost ? b : a)) : null;
    if (!best) { stop = pick === "back" ? "no way back" : "no choices"; break; }
    assertFree();
    if (opt.mouse) await page.mouse.click(best.screen.x, best.screen.y);
    else await page.touchscreen.tap(best.screen.x, best.screen.y);
    let ok = false;
    for (let i = 0; i < 25; i++) {
      await sleep(120);
      const g = await state();
      if (g && (g.n !== f.n || g.head !== f.head)) { ok = true; break; }
    }
    if (!ok) {
      misses++;
      if (misses === 6 && !opt.mouse) opt.mouse = true;
      if (misses > 20) { stop = "too many missed taps"; break; }
      continue;
    }
    for (let i = 0; i < 100; i++) {
      await sleep(120);
      if (!(await page.evaluate(() => window.__knotFabric().animating))) break;
    }
    made++;
  }
  await waitView(page, 8000);
  return { made, misses, stop, mouse: !!opt.mouse, ms: Date.now() - t0 };
}

// In the page: ITER full renders, each followed by a 1-px readback (cannot
// return before the GPU is done), inside ONE task so the app's ticker never
// interleaves. K79 passcost.mjs's method; resolution is about +-2 ms.
export function renderLoop(ITER) {
  const L = window.__knotBackgroundLayer && window.__knotBackgroundLayer();
  if (!L) return null;
  const renderer = L.renderer, gl = renderer.gl, stage = L.container.parent, buf = new Uint8Array(4);
  const once = () => {
    const t0 = performance.now();
    renderer.render({ container: stage });
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    return performance.now() - t0;
  };
  for (let i = 0; i < 10; i++) once();
  const ts = [];
  for (let i = 0; i < ITER; i++) ts.push(once());
  ts.sort((a, b) => a - b);
  const q = (f) => +ts[Math.floor(f * (ts.length - 1))].toFixed(2);
  return { n: ts.length, median: q(0.5), p10: q(0.1), p90: q(0.9) };
}

// In the page: freeze every clock of a same-state frame (K83's pins + the
// background's drift clock), turn off K169's gold-web fade (with the paint
// clock pinned, a fading web would hold at level 0; K192) and hide the DOM
// chrome.
export function pinAll() {
  const r = window.__knotRenderer(), proto = Object.getPrototypeOf(r);
  if (window.__knotPS && window.__knotPS()) window.__knotPS().step = function () {};
  r.flowStrength = 0;
  r.paintClock = 100;
  r.pulseBorn = 0;
  if (r.webFade) r.webFade.seconds = 0; // K169's web fade off (K192)
  if (typeof proto.advanceClocks === "function") r.advanceClocks = function () {};
  r.tickPaint = function () { return proto.tickPaint.call(this, 0); };
  const L = window.__knotBackgroundLayer && window.__knotBackgroundLayer();
  if (L) { L.tick = function () { return false; }; L.clock.time = 0; L.clock.dirty = false; if (L.active) L.renderTexture(); }
  r.update();
  for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
}

// In the page: every ROUTED junction (K81 builds only) with its CSS-px center
// and the reach of its fans + cover strips (CSS px), plus the viewport.
export function routedList() {
  const r = window.__knotRenderer(), fp = r.fieldProbe, wt = r.root.worldTransform;
  if (!fp) return { list: [], records: 0, W: window.innerWidth, H: window.innerHeight, dpr: window.devicePixelRatio, view: null };
  const css = (x, y) => [wt.a * x + wt.c * y + wt.tx, wt.b * x + wt.d * y + wt.ty];
  const list = [], byRb = new Map();
  let records = 0;
  for (let ji = 0; ji < r.junctionArms.length; ji++) {
    const rb = fp.record(ji), c = fp.center(ji);
    if (rb < 0 || !c) continue;
    records++;
    // Builds without fp.routes (master, before K81) list every record, so a
    // master-only pass still crops something.
    const routes = typeof fp.routes === "function" ? fp.routes(ji) : null;
    if (routes && !routes.length) continue;
    const [x, y] = css(c[0], c[1]);
    const j = { ji, rb, x, y, nr: routes ? routes.length : 0, reach: 0 };
    list.push(j);
    byRb.set(rb, j);
  }
  for (const fm of [r.filletMesh, r.filletTopMesh]) {
    if (!fm) continue;
    const V = fm.vertexData, Rc = fm.recData;
    for (let v = 0; v < fm.vUsed; v++) {
      const j = byRb.get(Math.floor(Rc[v]));
      if (!j) continue;
      const [x, y] = css(V[v * 2], V[v * 2 + 1]);
      j.reach = Math.max(j.reach, Math.hypot(x - j.x, y - j.y));
    }
  }
  const v = window.__knotView();
  return { list, records, W: window.innerWidth, H: window.innerHeight, dpr: window.devicePixelRatio, view: { x: v.x, y: v.y, s: v.s } };
}
