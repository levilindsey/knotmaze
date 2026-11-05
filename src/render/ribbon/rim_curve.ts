// K859 (curves research §3.2): the wedge rim's curve between two
// flank tips, extracted from joinery so it can be unit-tested.
//
// Two branches, both pre-K859 behaviour, pinned by tests:
// - Corner-projection cubic (K846): end controls along each tip's
//   own tangent, lengths 0.62 x the corner's projection on the
//   tangent. G1 at both tips - but it fires only when the corner
//   (the edge lines' intersection) lies BEYOND both tips along
//   their tangents, which at cuspRadius 3 means wedges narrower
//   than ~29 degrees or unusually short reaches. Measured on the
//   frozen seed-3 maze (.claude/probes/K859/fallback_count.mjs):
//   the projection is negative on at least one side at 392 of 392
//   wedges - the cubic is nearly dead code.
// - Quadratic through the corner (the de-facto rim): traces the
//   corridor-union outline through the edge-line intersection.
//   Its end tangents point at the corner, so the join at each tip
//   is G0, not G1 - softened in practice by the fan's solid rim
//   band straddling the line (K854).
//
// A tangent-Hermite replacement for the quadratic (arc-fit control
// lengths, G1 by construction) was tried in K859 and measured
// WORSE: its outward bulge overshoots into neighbouring threads
// at tight junctions (.claude/probes/K857/out old_site1 vs
// k859_site1) and churned 163k px on the frozen maze. It stays
// out. The next candidate for a G1-everywhere rim is a biarc
// through the corner region; this function is its seam.
//
// K1182: that biarc now sits behind the rimCurveBiarc flag below.
// It selects, in the fallback branch only, a two-arc rim that is
// G1 at both flank tips and at its own joint, in place of the
// quadratic through the corner. It defaults to today's curve
// (rimCurveBiarc = false, today's picture); Claude flips the
// default after judging the look sheet in
// .claude/probes/K1182/sheet/. The corner-projection cubic is
// already G1 and keeps its points under both settings.
export interface RimCurve {
  // Interior points only (i = 1..n-1), [x0, y0, x1, y1, ...].
  pts: number[];
  // True when the corner projection failed on a side and the
  // quadratic-through-corner branch produced the curve.
  fellBack: boolean;
}

// K1182: false (default) is today's quadratic fallback; true is
// the biarc fallback. Set only by probes and tests; no caller in
// the app reads it today.
export let rimCurveBiarc = false;
export function setRimCurveBiarc(on: boolean): void {
  rimCurveBiarc = on;
}

interface ArcSeg {
  straight: boolean;
  // Arc: centre + radius, from angle a0 sweeping dAng (signed).
  cx: number;
  cy: number;
  r: number;
  a0: number;
  dAng: number;
  // Straight: from (x0, y0) along unit (dx, dy).
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  len: number;
  // Travel heading at the joint end of an arc-from-start, and at
  // the start of an arc-from-end (for the joint G1 choice).
  hx: number;
  hy: number;
}

// The arc from P, tangent to the (tx, ty) line at P with travel
// heading (hx, hy) there, through Q. Null when no finite circle
// does it (Q off the tangent line with the centre at infinity).
function arcFromStart(
  px: number, py: number, tx: number, ty: number,
  qx: number, qy: number, hx: number, hy: number
): ArcSeg | null {
  const dx = qx - px;
  const dy = qy - py;
  const d2 = dx * dx + dy * dy;
  if (d2 < 1e-24) {
    return { straight: true, cx: 0, cy: 0, r: 0, a0: 0, dAng: 0, x0: px, y0: py, dx: hx, dy: hy, len: 0, hx, hy };
  }
  const nx = -ty;
  const ny = tx;
  const den = 2 * (nx * dx + ny * dy);
  if (Math.abs(den) < 1e-12) {
    // Q on the tangent line at P: the arc is that line.
    if (Math.abs(tx * dy - ty * dx) < 1e-9) {
      const len = Math.sqrt(d2);
      return { straight: true, cx: 0, cy: 0, r: 0, a0: 0, dAng: 0, x0: px, y0: py, dx: dx / len, dy: dy / len, len, hx: dx / len, hy: dy / len };
    }
    return null;
  }
  const s = d2 / den;
  const cx = px + nx * s;
  const cy = py + ny * s;
  const r = Math.abs(s);
  const a0 = Math.atan2(py - cy, px - cx);
  const aQ = Math.atan2(qy - cy, qx - cx);
  // CCW travel's heading at P is the radial direction turned +90°.
  const ccw = -Math.sin(a0) * hx + Math.cos(a0) * hy > 0;
  let dAng = aQ - a0;
  if (ccw) {
    while (dAng < 0) dAng += 2 * Math.PI;
  } else {
    while (dAng > 0) dAng -= 2 * Math.PI;
  }
  const aE = a0 + dAng;
  const ex = ccw ? -Math.sin(aE) : Math.sin(aE);
  const ey = ccw ? Math.cos(aE) : -Math.cos(aE);
  return { straight: false, cx, cy, r, a0, dAng, x0: px, y0: py, dx: 0, dy: 0, len: Math.abs(dAng) * r, hx: ex, hy: ey };
}

// The arc from J to B, tangent to the (tx, ty) line at B with
// travel heading (hx, hy) on arrival there. Of the two ways round
// its circle, the one whose arrival heading is (hx, hy) is kept,
// so its start heading is the biarc's joint heading.
function arcFromEnd(
  jx: number, jy: number, bx: number, by: number,
  tx: number, ty: number, hx: number, hy: number
): ArcSeg | null {
  const dx = jx - bx;
  const dy = jy - by;
  const d2 = dx * dx + dy * dy;
  if (d2 < 1e-24) {
    return { straight: true, cx: 0, cy: 0, r: 0, a0: 0, dAng: 0, x0: jx, y0: jy, dx: hx, dy: hy, len: 0, hx, hy };
  }
  const nx = -ty;
  const ny = tx;
  const den = 2 * (nx * dx + ny * dy);
  if (Math.abs(den) < 1e-12) {
    if (Math.abs(tx * dy - ty * dx) < 1e-9) {
      const len = Math.sqrt(d2);
      const ux = (bx - jx) / len;
      const uy = (by - jy) / len;
      return { straight: true, cx: 0, cy: 0, r: 0, a0: 0, dAng: 0, x0: jx, y0: jy, dx: ux, dy: uy, len, hx: ux, hy: uy };
    }
    return null;
  }
  const s = d2 / den;
  const cx = bx + nx * s;
  const cy = by + ny * s;
  const r = Math.abs(s);
  const aJ = Math.atan2(jy - cy, jx - cx);
  const aB = Math.atan2(by - cy, bx - cx);
  let best: ArcSeg | null = null;
  let bestDot = -Infinity;
  for (const ccw of [true, false]) {
    let dAng = aB - aJ;
    if (ccw) {
      while (dAng < 0) dAng += 2 * Math.PI;
    } else {
      while (dAng > 0) dAng -= 2 * Math.PI;
    }
    const aE = aJ + dAng;
    const ex = ccw ? -Math.sin(aE) : Math.sin(aE);
    const ey = ccw ? Math.cos(aE) : -Math.cos(aE);
    const dot = ex * hx + ey * hy;
    if (dot > bestDot) {
      bestDot = dot;
      const sx = ccw ? -Math.sin(aJ) : Math.sin(aJ);
      const sy = ccw ? Math.cos(aJ) : -Math.cos(aJ);
      best = { straight: false, cx, cy, r, a0: aJ, dAng, x0: jx, y0: jy, dx: 0, dy: 0, len: Math.abs(dAng) * r, hx: sx, hy: sy };
    }
  }
  return best;
}

function arcPointAt(a: ArcSeg, dist: number, out: number[]): void {
  if (a.straight) {
    out.push(a.x0 + a.dx * dist, a.y0 + a.dy * dist);
    return;
  }
  const ang = a.a0 + a.dAng * (a.len > 0 ? dist / a.len : 0);
  out.push(a.cx + a.r * Math.cos(ang), a.cy + a.r * Math.sin(ang));
}

// K1182 biarc through the corner region, or null when it cannot
// be built (the caller then keeps the quadratic). The joint J is
// the point of the biarc locus nearest the quadratic's midpoint:
// with travel headings s0 at A (along A's tangent line, toward
// that midpoint) and e1 at B (along B's, from that midpoint), a
// joint gives G1 at the joint iff cross(J-A, B-J) +
// tan((s0-e1)/2) * dot(J-A, B-J) = 0 - a circle through A and B
// (the chord line itself when s0 and e1 are parallel). J on it
// makes each arc tangent to its tip's tangent line, and the two
// arcs' headings agree at J by the same equation. Radii are the
// two arcs' own: |centre - tip| for each centre solved from its
// tip's perpendicular and its joint bisector. Points are sampled
// by arc length, with the two steps at each tip at 0.65x the mean
// step (the middle steps take the remainder) so the drawn first
// chord tracks the tip tangent at the caller's n.
function biarcPoints(
  ax: number, ay: number, tanAx: number, tanAy: number,
  bx: number, by: number, tanBx: number, tanBy: number,
  cx: number, cy: number, n: number
): number[] | null {
  const la = Math.hypot(tanAx, tanAy);
  const lb = Math.hypot(tanBx, tanBy);
  const chx = bx - ax;
  const chy = by - ay;
  const chord = Math.hypot(chx, chy);
  if (la < 1e-12 || lb < 1e-12 || chord < 1e-12) return null;
  const tax = tanAx / la;
  const tay = tanAy / la;
  const tbx = tanBx / lb;
  const tby = tanBy / lb;
  // The quadratic's midpoint: the target the joint stays near.
  const mx = 0.25 * ax + 0.5 * cx + 0.25 * bx;
  const my = 0.25 * ay + 0.5 * cy + 0.25 * by;
  const s0x = tax * (tax * (mx - ax) + tay * (my - ay) < 0 ? -1 : 1);
  const s0y = tay * (tax * (mx - ax) + tay * (my - ay) < 0 ? -1 : 1);
  const e1x = tbx * (tbx * (bx - mx) + tby * (by - my) < 0 ? -1 : 1);
  const e1y = tby * (tbx * (bx - mx) + tby * (by - my) < 0 ? -1 : 1);
  const dh = (Math.atan2(s0y, s0x) - Math.atan2(e1y, e1x)) / 2;
  const sinDh = Math.sin(dh);
  let jx: number;
  let jy: number;
  if (Math.abs(sinDh) < 1e-12) {
    // Parallel travel headings: the locus is the chord line.
    const t = ((mx - ax) * chx + (my - ay) * chy) / (chord * chord);
    jx = ax + chx * t;
    jy = ay + chy * t;
  } else {
    const invT = Math.cos(dh) / sinDh;
    // p is the chord turned -90°: cross(J, B-A) is J . p.
    const px = chy;
    const py = -chx;
    const ox = (ax + bx) / 2 + (px * invT) / 2;
    const oy = (ay + by) / 2 + (py * invT) / 2;
    const r = Math.hypot(ax - ox, ay - oy);
    if (r < 1e-12) return null;
    let ux = mx - ox;
    let uy = my - oy;
    let ul = Math.hypot(ux, uy);
    if (ul < 1e-12) {
      ux = cx - ox;
      uy = cy - oy;
      ul = Math.hypot(ux, uy);
      if (ul < 1e-12) return null;
    }
    jx = ox + (r * ux) / ul;
    jy = oy + (r * uy) / ul;
  }
  const a1 = arcFromStart(ax, ay, tax, tay, jx, jy, s0x, s0y);
  if (!a1) return null;
  const a2 = arcFromEnd(jx, jy, bx, by, tbx, tby, e1x, e1y);
  if (!a2) return null;
  const total = a1.len + a2.len;
  if (!(total > 1e-12)) return null;
  // Step fractions: the two steps at each tip at 0.65x the mean.
  const pts: number[] = [];
  let acc = 0;
  const cum: number[] = [0];
  for (let j = 0; j < n; j++) {
    const w = n > 4 && (j < 2 || j >= n - 2) ? 0.65 : n > 4 ? (n - 2.6) / (n - 4) : 1;
    acc += w;
    cum.push(acc / n);
  }
  for (let i = 1; i < n; i++) {
    const dist = cum[i] * total;
    if (dist <= a1.len) arcPointAt(a1, dist, pts);
    else arcPointAt(a2, dist - a1.len, pts);
  }
  for (const v of pts) if (!Number.isFinite(v)) return null;
  return pts;
}

export function rimCurvePoints(
  ax: number,
  ay: number,
  tanAx: number,
  tanAy: number,
  bx: number,
  by: number,
  tanBx: number,
  tanBy: number,
  cx: number,
  cy: number,
  n: number
): RimCurve {
  const projA = (cx - ax) * tanAx + (cy - ay) * tanAy;
  const projB = (cx - bx) * tanBx + (cy - by) * tanBy;
  const dA = projA > 0 ? projA * 0.62 : 0;
  const dB = projB > 0 ? projB * 0.62 : 0;
  const pts: number[] = [];
  if (dA > 1e-6 && dB > 1e-6) {
    const c1x = ax + tanAx * dA;
    const c1y = ay + tanAy * dA;
    const c2x = bx + tanBx * dB;
    const c2y = by + tanBy * dB;
    for (let i = 1; i < n; i++) {
      const q = i / n;
      const u = 1 - q;
      const m0 = u * u * u;
      const m1 = 3 * u * u * q;
      const m2 = 3 * u * q * q;
      const m3 = q * q * q;
      pts.push(
        m0 * ax + m1 * c1x + m2 * c2x + m3 * bx,
        m0 * ay + m1 * c1y + m2 * c2y + m3 * by
      );
    }
    return { pts, fellBack: false };
  }
  if (rimCurveBiarc) {
    const bp = biarcPoints(ax, ay, tanAx, tanAy, bx, by, tanBx, tanBy, cx, cy, n);
    if (bp) return { pts: bp, fellBack: true };
  }
  for (let i = 1; i < n; i++) {
    const q = i / n;
    const u = 1 - q;
    pts.push(
      u * u * ax + 2 * u * q * cx + q * q * bx,
      u * u * ay + 2 * u * q * cy + q * q * by
    );
  }
  return { pts, fellBack: true };
}
