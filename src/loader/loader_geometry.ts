// K313: the loading trefoil's pure geometry (docs/design/K313_loader.md).
// The same curve, crossings and alternating over/under gaps the CSS
// loader draws (src/ui/loader.ts), factored so the inline worker, the
// build-time static SVG and the tests share one source. Cosmetic only:
// nothing here feeds generation, so ordinary Math is fine.

export type Pt = readonly [number, number];

export const TREFOIL_N = 240;

// The trefoil the loader has always drawn: sin/cos form of
// z(t) = i*e^-it - 2i*e^2it, whose heading winds twice per lap.
export function trefoilPoints(n = TREFOIL_N): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push([Math.sin(t) + 2 * Math.sin(2 * t), -(Math.cos(t) - 2 * Math.cos(2 * t))]);
  }
  return pts;
}

export interface TrefoilShape {
  points: Pt[];
  // The strand as gap-free pieces (each a polyline of sample indices'
  // points): every other crossing along the strand dives under, cut by
  // GAP samples either side, exactly as ui/loader.ts cuts them.
  pieces: Pt[][];
  // Sample-parameter positions of the under crossings.
  under: number[];
  // Cumulative arc length at each sample, plus the total (closed).
  cum: number[];
  total: number;
}

const GAP_SAMPLES = 0.6; // world units of curve each side of an under crossing

export function trefoilShape(n = TREFOIL_N): TrefoilShape {
  const P = trefoilPoints(n);
  const events: Array<{ s: number; id: number }> = [];
  let id = 0;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = P[i];
    const [bx, by] = P[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const [cx, cy] = P[j];
      const [dx, dy] = P[(j + 1) % n];
      const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
      if (Math.abs(den) < 1e-12) continue;
      const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
      const v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
      if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
      events.push({ s: i + u, id }, { s: j + v, id });
      id++;
    }
  }
  events.sort((a, b) => a.s - b.s);
  const cum: number[] = [0];
  for (let i = 0; i < n; i++) {
    const [ax, ay] = P[i];
    const [bx, by] = P[(i + 1) % n];
    cum.push(cum[i] + Math.hypot(bx - ax, by - ay));
  }
  const total = cum[n];
  const gap = GAP_SAMPLES / (total / n);
  const under = events.filter((_, k) => k % 2 === 1).map((e) => e.s);
  const inGap = (s: number): boolean =>
    under.some((g) => {
      const d = Math.abs(s - g);
      return Math.min(d, n - d) < gap;
    });
  const pieces: Pt[][] = [];
  let cur: Pt[] = [];
  const s0 = under.length > 0 ? Math.ceil(under[0] + gap) : 0;
  for (let k = 0; k <= n; k++) {
    const s = (s0 + k) % n;
    if (inGap(s)) {
      if (cur.length > 1) pieces.push(cur);
      cur = [];
      continue;
    }
    cur.push(P[s]);
  }
  if (cur.length > 1) pieces.push(cur);
  return { points: P, pieces, under, cum, total };
}

// Point and heading at arc distance s (wraps; the curve is closed).
export function pointAtArc(shape: TrefoilShape, s: number): { p: Pt; heading: number } {
  const { points, cum, total } = shape;
  const n = points.length;
  let x = s % total;
  if (x < 0) x += total;
  // Binary search the segment holding x.
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cum[mid] <= x) lo = mid;
    else hi = mid - 1;
  }
  const i = lo % n;
  const j = (i + 1) % n;
  const segLen = cum[i + 1] - cum[i] || 1;
  const f = (x - cum[i]) / segLen;
  const [ax, ay] = points[i];
  const [bx, by] = points[j];
  return {
    p: [ax + (bx - ax) * f, ay + (by - ay) * f],
    heading: Math.atan2(by - ay, bx - ax),
  };
}

// The polyline of the arc span [from, to] (either may wrap), sampled at
// most step world units apart. The trail is drawn from this.
export function arcSpan(shape: TrefoilShape, from: number, to: number, step = 0.06): Pt[] {
  const out: Pt[] = [];
  const len = to - from;
  const steps = Math.max(1, Math.ceil(len / step));
  for (let k = 0; k <= steps; k++) {
    out.push(pointAtArc(shape, from + (len * k) / steps).p);
  }
  return out;
}

// The static SVG's path data (the plugin inlines it into index.html so
// the first paint already shows the trefoil, as ui/loader.ts builds it).
export function trefoilSvgPaths(shape: TrefoilShape): string[] {
  return shape.pieces.map(
    (piece) => "M" + piece.map(([x, y]) => `${x.toFixed(3)} ${y.toFixed(3)}`).join("L")
  );
}
