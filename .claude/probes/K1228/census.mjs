// K1228 (a live_s5.mjs module): background pixels inside a ribbon's
// half-width. A pixel counts when its nearest chain centreline stands
// edge < -1 device px away (inside the half-width by more than a pixel)
// and its colour reads as background: within BG_TOL (max channel) of
// the same pixel in a background-only shot (ribbon root hidden, the
// junction fans left drawn - a fan over a pixel is not background).
//   ji51 mode:  live_s5.mjs cross <out> census.mjs ji51
//     the (1019,1136) window at rest and K1190's four pulse moments
//     (t3..t6 of shoot_s5's 8 phases), master and mine compared there.
//   stand mode: live_s5.mjs <stand> <out> census.mjs stand
//     the whole frame at rest; returns candidate clusters with their
//     nearest chain and the tightest per-sample radius near them.
// Distances are device px (the stands' view is a similarity).
import { decodePNG, toRGB } from "./png.mjs";
import { setState, frames, sleep } from "./lib.mjs";

const BG_TOL = 42;

export async function run({ page, toWorld, toDevice, OUT, args }) {
  const mode = args[0];
  const geo = await page.evaluate(() => {
    const r = window.__knotRenderer();
    const chains = [];
    r.chainSamples.forEach((cs, c) => {
      if (!cs || !cs.positions) return;
      chains.push({ c, closed: !!cs.closed, P: Array.from(cs.positions) });
    });
    return { h: r.style.threadWidth / 2, spacing: r.pulseSpacing, chains };
  });
  const a = toWorld(0.5, 0.5), b = toWorld(1.5, 0.5);
  const pxW = Math.hypot(b[0] - a[0], b[1] - a[1]); // world per device px
  const hDev = geo.h / pxW;
  // Device-space polylines per chain.
  const lines = geo.chains.map(({ c, closed, P }) => {
    const pts = [];
    for (let k = 0; k < P.length / 2; k++) pts.push(toDevice(P[k * 2], P[k * 2 + 1]));
    // per-sample radius (device px), bend_s5's chord / turn
    const R = new Float32Array(pts.length).fill(Infinity);
    for (let j = 1; j + 1 < pts.length; j++) {
      const ax = pts[j][0] - pts[j - 1][0], ay = pts[j][1] - pts[j - 1][1];
      const bx = pts[j + 1][0] - pts[j][0], by = pts[j + 1][1] - pts[j][1];
      const turn = Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));
      if (turn > 1e-9) R[j] = (0.5 * (Math.hypot(ax, ay) + Math.hypot(bx, by))) / turn;
    }
    return { c, closed, pts, R };
  });
  // Segment grid: a segment is registered in every 32px cell its
  // bbox, grown by hDev+2, touches; a pixel only measures those.
  const CELL = 32;
  const grid = new Map();
  const gkey = (cx, cy) => cx * 100000 + cy;
  lines.forEach((L, li) => {
    const pts = L.pts, n = pts.length;
    const segs = L.closed ? n : n - 1;
    for (let k = 0; k < segs; k++) {
      const k1 = (k + 1) % n;
      const x0 = Math.min(pts[k][0], pts[k1][0]) - hDev - 2, x1 = Math.max(pts[k][0], pts[k1][0]) + hDev + 2;
      const y0 = Math.min(pts[k][1], pts[k1][1]) - hDev - 2, y1 = Math.max(pts[k][1], pts[k1][1]) + hDev + 2;
      for (let cy = Math.floor(y0 / CELL); cy <= Math.floor(y1 / CELL); cy++)
        for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) {
          const kk = gkey(cx, cy);
          if (!grid.has(kk)) grid.set(kk, []);
          grid.get(kk).push([li, k]);
        }
    }
  });
  const shot = async () => toRGB(decodePNG(await page.screenshot({ type: "png" })));
  const bgShot = async () => {
    await page.evaluate(() => { window.__knotRenderer().root.renderable = false; });
    await frames(page, 3);
    await sleep(120);
    const im = await shot();
    await page.evaluate(() => { window.__knotRenderer().root.renderable = true; });
    await frames(page, 3);
    await sleep(120);
    return im;
  };
  const distTo = (L, x, y) => {
    const pts = L.pts, n = pts.length;
    const segs = L.closed ? n : n - 1;
    let best = 1e18, bk = -1;
    for (let k = 0; k < segs; k++) {
      const k1 = (k + 1) % n;
      const ax = pts[k][0], ay = pts[k][1];
      const dx = pts[k1][0] - ax, dy = pts[k1][1] - ay;
      const l2 = dx * dx + dy * dy;
      let t = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = x - ax - dx * t, ey = y - ay - dy * t;
      const d = ex * ex + ey * ey;
      if (d < best) { best = d; bk = k; }
    }
    return { d: Math.sqrt(best), k: bk };
  };
  // Tight samples (R < h) and a grid of their h-discs: Done 3 counts
  // only background pixels inside the half-width near such a turn
  // (the whole frame is full of crossing gaps, dark in both builds).
  const tightPts = [];
  for (const L of lines) for (let j = 0; j < L.pts.length; j++)
    if (L.R[j] < hDev) tightPts.push(L.pts[j]);
  const tightGrid = new Map();
  tightPts.forEach((p, pi) => {
    for (let cy = Math.floor((p[1] - hDev) / CELL); cy <= Math.floor((p[1] + hDev) / CELL); cy++)
      for (let cx = Math.floor((p[0] - hDev) / CELL); cx <= Math.floor((p[0] + hDev) / CELL); cx++) {
        const kk = gkey(cx, cy);
        if (!tightGrid.has(kk)) tightGrid.set(kk, []);
        tightGrid.get(kk).push(pi);
      }
  });
  const nearTight = (x, y) => {
    const refs = tightGrid.get(gkey(Math.floor(x / CELL), Math.floor(y / CELL))) || [];
    for (const pi of refs) {
      const p = tightPts[pi];
      if (Math.hypot(p[0] - x, p[1] - y) <= hDev) return true;
    }
    return false;
  };
  const scan = (im, bg, W, H, x0, y0, x1, y1, tightOnly = false) => {
    const hits = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      let bd = 1e18, bc = -1, bk = -1;
      const refs = grid.get(gkey(Math.floor((x + 0.5) / CELL), Math.floor((y + 0.5) / CELL))) || [];
      for (const [li, k] of refs) {
        const L = lines[li];
        const pts = L.pts, n = pts.length, k1 = (k + 1) % n;
        const ax = pts[k][0], ay = pts[k][1];
        const dx = pts[k1][0] - ax, dy = pts[k1][1] - ay;
        const l2 = dx * dx + dy * dy;
        let t = l2 > 0 ? ((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / l2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = x + 0.5 - ax - dx * t, ey = y + 0.5 - ay - dy * t;
        const d = ex * ex + ey * ey;
        if (d < bd) { bd = d; bc = L.c; bk = k; }
      }
      bd = Math.sqrt(bd);
      const edge = bd - hDev;
      if (edge >= -1) continue;
      if (tightOnly && !nearTight(x + 0.5, y + 0.5)) continue;
      const o = (y * W + x) * 3;
      const md = Math.max(
        Math.abs(im.data[o] - bg.data[o]),
        Math.abs(im.data[o + 1] - bg.data[o + 1]),
        Math.abs(im.data[o + 2] - bg.data[o + 2])
      );
      if (md <= BG_TOL) hits.push({ x, y, chain: bc, edge, md, seg: bk });
    }
    return hits;
  };

  if (mode === "ji51") {
    const bg = await bgShot();
    const period = geo.spacing / 1.6;
    const phases = [["rest", 100], ...[3, 4, 5, 6].map((k) => [`t${k}`, 100 + (k * period) / 8])];
    const out = { hDev, phases: {} };
    for (const [name, t] of phases) {
      await setState(page, { t, dbg: 0, webs: true });
      const im = await shot();
      const hits = scan(im, bg, im.W, im.H, 1008, 1128, 1032, 1144);
      out.phases[name] = hits;
      console.log(`ji51 ${name}: ${hits.length} bg pixels inside edge<-1: ${hits.map((h) => `(${h.x},${h.y}) e${h.edge.toFixed(1)} d${h.md}`).join(" ")}`);
    }
    return out;
  }

  // stand mode: whole frame at rest (the PIN state), clusters of hits.
  const bg = await bgShot();
  const im = await shot();
  const hits = scan(im, bg, im.W, im.H, 0, 0, im.W - 1, im.H - 1, true);
  // connected clusters (8-neighbour) over hit pixels
  const key = (x, y) => y * im.W + x;
  const set = new Map(hits.map((h) => [key(h.x, h.y), h]));
  const seen = new Set();
  const clusters = [];
  for (const h of hits) {
    if (seen.has(key(h.x, h.y))) continue;
    const stack = [h];
    seen.add(key(h.x, h.y));
    const px = [];
    while (stack.length) {
      const q = stack.pop();
      px.push(q);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const kk = key(q.x + dx, q.y + dy);
        if (set.has(kk) && !seen.has(kk)) { seen.add(kk); stack.push(set.get(kk)); }
      }
    }
    const cx = px.reduce((s, p) => s + p.x, 0) / px.length;
    const cy = px.reduce((s, p) => s + p.y, 0) / px.length;
    const chain = px[0].chain;
    const L = lines.find((l) => l.c === chain);
    let minR = Infinity;
    if (L) for (let j = 0; j < L.pts.length; j++) {
      const d = Math.hypot(L.pts[j][0] - cx, L.pts[j][1] - cy);
      if (d < 3 * hDev && L.R[j] < minR) minR = L.R[j];
    }
    clusters.push({ n: px.length, cx: Math.round(cx), cy: Math.round(cy), chain, minEdge: Math.min(...px.map((p) => p.edge)), minRnear: minR === Infinity ? null : +minR.toFixed(1) });
  }
  clusters.sort((p, q) => q.n - p.n);
  // every sample on every chain whose radius is under the half-width
  const tight = [];
  for (const L of lines) for (let j = 0; j < L.pts.length; j++)
    if (L.R[j] < hDev) tight.push({ chain: L.c, j, R: +L.R[j].toFixed(1), x: Math.round(L.pts[j][0]), y: Math.round(L.pts[j][1]) });
  console.log(`stand: h ${hDev.toFixed(1)} dev px; ${hits.length} bg pixels inside edge<-1 in ${clusters.length} clusters; ${tight.length} samples with R<h`);
  for (const c of clusters) console.log(`  cluster n=${c.n} at ${c.cx},${c.cy} chain ${c.chain} minEdge ${c.minEdge.toFixed(1)} minRnear ${c.minRnear}`);
  return { hDev, hits: hits.length, clusters, tightCount: tight.length };
}
