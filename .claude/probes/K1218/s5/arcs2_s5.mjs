// K1218 S5 (a live_s5.mjs module): the arc a web maps a pixel to, four ways,
// against the arc the RIBBON gives it (a normal-swept map over the chain's own
// spline samples, as the ribbon mesh's cross-sections interpolate vSamp):
//   web    the shipped field (fieldProbe.lastArms: radial projection)
//   pnear  the nearest point on the arm's radial-profile polyline
//   pswept the normal-swept map over the profile polyline (vertex normals)
// Each printed as (arc - ribbon arc) in device px, for the arm whose chain the
// web field names first at that pixel. No paint, no shots.
//   node live_s5.mjs <stand> <outDir> arcs2_s5.mjs <ji> <x0,y0,x1,y1> [step=1]
export async function run({ page, toWorld, args }) {
  const ji = Number(args[0]);
  const [x0, y0, x1, y1] = args[1].split(",").map(Number);
  const step = Number(args[2] ?? 1);
  const xs = [], ys = [];
  for (let x = x0; x <= x1; x += step) xs.push(x);
  for (let y = y0; y <= y1; y += step) ys.push(y);
  const pts = [];
  for (const y of ys) for (const x of xs) pts.push(toWorld(x + 0.5, y + 0.5));
  const [ax, ay] = toWorld(0, 0), [bx, by] = toWorld(1, 0);
  const pxW = Math.hypot(bx - ax, by - ay);
  const res = await page.evaluate((ji, pts) => {
    const r = window.__knotRenderer();
    const FP = r.fieldProbe;
    const out = new Float32Array(4);
    const DR = 0.06;
    const [cx, cy] = FP.center(ji);
    const arms = FP.arms(ji);
    const cross = (ax, ay, bx, by) => ax * by - ay * bx;
    // Normal-swept parameter of p over a polyline P (x,y pairs) with arcs S:
    // the segment whose vertex-normal-swept quad holds p; ties -> smallest |lateral|.
    const swept = (P, S, px, py) => {
      const n = S.length;
      const T = [];
      for (let g = 0; g < n; g++) {
        let tx = 0, ty = 0;
        if (g > 0) { const dx = P[2 * g] - P[2 * g - 2], dy = P[2 * g + 1] - P[2 * g - 1], l = Math.hypot(dx, dy) || 1; tx += dx / l; ty += dy / l; }
        if (g + 1 < n) { const dx = P[2 * g + 2] - P[2 * g], dy = P[2 * g + 3] - P[2 * g + 1], l = Math.hypot(dx, dy) || 1; tx += dx / l; ty += dy / l; }
        const l = Math.hypot(tx, ty) || 1;
        T.push(tx / l, ty / l);
      }
      let best = 1e9, arc = null;
      for (let g = 0; g + 1 < n; g++) {
        const qx = px - P[2 * g], qy = py - P[2 * g + 1];
        const Dx = P[2 * g + 2] - P[2 * g], Dy = P[2 * g + 3] - P[2 * g + 1];
        const n0x = -T[2 * g + 1], n0y = T[2 * g];
        const dNx = -T[2 * g + 3] - n0x, dNy = T[2 * g + 2] - n0y;
        const A = -cross(Dx, Dy, dNx, dNy);
        const B = cross(qx, qy, dNx, dNy) - cross(Dx, Dy, n0x, n0y);
        const C = cross(qx, qy, n0x, n0y);
        const roots = [];
        if (Math.abs(A) < 1e-9) { if (Math.abs(B) > 1e-12) roots.push(-C / B); }
        else { const d = B * B - 4 * A * C; if (d >= 0) { const s = Math.sqrt(d); roots.push((-B + s) / (2 * A), (-B - s) / (2 * A)); } }
        for (const u of roots) {
          if (!(u >= -1e-6 && u <= 1 + 1e-6)) continue;
          const nx = n0x + u * dNx, ny = n0y + u * dNy;
          const lat = Math.abs(cross(qx - u * Dx, qy - u * Dy, nx, ny) === 0 ? ((qx - u * Dx) * nx + (qy - u * Dy) * ny) / Math.hypot(nx, ny) : ((qx - u * Dx) * nx + (qy - u * Dy) * ny) / Math.hypot(nx, ny));
          if (lat < best) { best = lat; arc = S[g] + (S[g + 1] - S[g]) * u; }
        }
      }
      return arc;
    };
    const nearest = (P, S, px, py) => {
      let best = 1e9, arc = 0;
      for (let g = 0; g + 1 < S.length; g++) {
        const qx = px - P[2 * g], qy = py - P[2 * g + 1];
        const Dx = P[2 * g + 2] - P[2 * g], Dy = P[2 * g + 3] - P[2 * g + 1];
        const ll = Dx * Dx + Dy * Dy;
        let u = ll > 0 ? (qx * Dx + qy * Dy) / ll : 0;
        u = Math.max(0, Math.min(1, u));
        const d = Math.hypot(qx - u * Dx, qy - u * Dy);
        if (d < best) { best = d; arc = S[g] + (S[g + 1] - S[g]) * u; }
      }
      return arc;
    };
    // Per arm: its profile polyline (relative to the joint) and its chain's
    // samples near the joint as a polyline in arm-arc s (0 at the joint).
    const geo = arms.map((a) => {
      const n = a.ps.length;
      const P = [], S = [];
      for (let g = 0; g < n; g++) { P.push(g * DR * Math.cos(a.pth[g]), g * DR * Math.sin(a.pth[g])); S.push(a.ps[g]); }
      const SS = r.chainSamples[a.chain];
      const nseg = SS.closed ? SS.count : SS.count - 1;
      const sp = SS.totalLength / nseg;
      const CP = [], CS = [];
      const reach = Math.min(a.domain, a.ps[n - 1] + 0.3);
      for (let s = -0.15; s <= reach + 1e-9; s += sp) {
        let arc = a.arc0 + a.dir * s;
        if (SS.closed) arc = ((arc % SS.totalLength) + SS.totalLength) % SS.totalLength;
        else if (arc < 0 || arc > SS.totalLength) continue;
        const f = arc / sp, i = Math.floor(f), u = f - i;
        const i0 = SS.closed ? i % SS.count : Math.min(i, SS.count - 1);
        const i1 = SS.closed ? (i + 1) % SS.count : Math.min(i + 1, SS.count - 1);
        CP.push(SS.positions[2 * i0] + (SS.positions[2 * i1] - SS.positions[2 * i0]) * u - cx, SS.positions[2 * i0 + 1] + (SS.positions[2 * i1 + 1] - SS.positions[2 * i0 + 1]) * u - cy);
        CS.push(s);
      }
      return { P, S, CP, CS, chain: a.chain, arc0: a.arc0, dir: a.dir, total: a.total, closed: a.closed, r0: Math.hypot(CP[2 * Math.round(0.15 / sp)] ?? 0, CP[2 * Math.round(0.15 / sp) + 1] ?? 0) };
    });
    const rows = pts.map(([x, y]) => {
      if (!FP.at(ji, x, y, out, 0, false)) return null;
      const la = FP.lastArms();
      const ch = la[0], aw = la[1];
      // The arm: same chain, nearest arc0 + dir * s to the web's arc.
      let k = -1, kd = 1e9, sw = 0;
      geo.forEach((g, i) => {
        if (g.chain !== ch) return;
        let s = (aw - g.arc0) * g.dir;
        if (g.closed) { s = ((s % g.total) + g.total) % g.total; if (s > g.total / 2) s -= g.total; }
        if (Math.abs(s) < kd) { kd = Math.abs(s); k = i; sw = s; }
      });
      if (k < 0) return null;
      const g = geo[k];
      const px = x - cx, py = y - cy;
      const sr = swept(g.CP, g.CS, px, py);
      const sn = nearest(g.P, g.S, px, py);
      const ss = swept(g.P, g.S, px, py);
      return { k, sw, sr, sn, ss };
    });
    return { rows, geo: geo.map((g) => ({ chain: g.chain, dir: g.dir, r0: g.r0, ps: g.S.slice(0, 8).map((v) => +v.toFixed(3)) })) };
  }, ji, pts);
  console.log(`ji ${ji} pxW ${pxW.toFixed(5)} arms ${JSON.stringify(res.geo)}`);
  let hdr = "      ";
  for (const x of xs) hdr += String(x).padStart(6);
  const grid = (name, f) => {
    console.log(name);
    console.log(hdr);
    ys.forEach((y, iy) => {
      let s = `${String(y).padStart(5)} `;
      xs.forEach((x, ix) => { const v = res.rows[iy * xs.length + ix]; s += (v && v.sr !== null ? f(v) : "-").padStart(6); });
      console.log(s);
    });
  };
  const d = (a, b) => (a === null || a === undefined ? "?" : ((a - b) / pxW).toFixed(1));
  grid("arm k", (v) => String(v.k));
  grid("web - ribbon (px)", (v) => d(v.sw, v.sr));
  grid("pnear - ribbon (px)", (v) => d(v.sn, v.sr));
  grid("pswept - ribbon (px)", (v) => d(v.ss, v.sr));
  return res;
}
