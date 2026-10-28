// K909 (§3.4): a junction's group from geometry. The connected overlap of
// the junction's arm tubes that holds the node, cut at each arm's cap, as
// per-arm, per-side extents: how far from the root each side of each arm
// stays inside the other arms' tubes (or the junction's corner fills).
// The oracle (groups "geo") and the border census's truth "geo" both read it.
import { dS, normS, pointAt } from "./geom";
import type { FieldModel } from "./oracle";

/** How far an arm's walk and its tube window may reach from the root, in h, before any cap. */
export const GEO_REACH = 12;

export interface GeoCap {
  /** Arc length from the root. */
  len: number;
  why: string;
}

/** One arm as the walk sees it: its poly, root, direction and cap. */
interface GeoArm {
  pi: number | undefined;
  s: number;
  dir: number;
  cap: number;
}

/**
 * Per junction, per arm, the cap: the chain's end (half the loop on a closed
 * chain), the next junction's root on the chain, the reach (12h), and the
 * crossing cut: where a crossing's two passes both lie within reach of the
 * junction's arms (the window plus the pass's overlap reach L + pm·h,
 * L = h·cot(θ/2)), the arm whose pass is farther from its root stops
 * L + pm·h short of it (both on a tie: no, the first, as the K883 spans).
 * cut false leaves the crossing cut out: the oracle's spans make it
 * themselves, cluster-wide (an arm of a neighbouring junction can hold
 * the farther pass), and a per-junction cut made first picked other arms
 * (K909: muse_hash j132 and j133 at crossing 254, j12 at crossing 37).
 */
export function geoCaps(model: FieldModel, cut = true): GeoCap[][] {
  const h = model.h;
  const pm = model.params.passMargin ?? 1;
  const { scene } = model;
  const roots: number[][] = model.polys.map(() => []);
  for (const J of scene.junctions)
    for (const a of J.arms) {
      const pi = model.idxOf.get(a.chain);
      if (pi !== undefined) roots[pi].push(a.s);
    }
  const caps: GeoCap[][] = scene.junctions.map((J) => J.arms.map(() => ({ len: GEO_REACH * h, why: `the reach (${GEO_REACH}h)` })));
  const set = (ji: number, ai: number, len: number, why: string) => {
    if (len < caps[ji][ai].len) caps[ji][ai] = { len: Math.max(0, len), why };
  };
  scene.junctions.forEach((J, ji) =>
    J.arms.forEach((a, ai) => {
      const pi = model.idxOf.get(a.chain);
      if (pi === undefined) return;
      const p = model.polys[pi];
      if (p.closed) set(ji, ai, p.len / 2, "half the loop");
      else set(ji, ai, a.dir > 0 ? p.s0 + p.len - a.s : a.s - p.s0, "the chain's end");
      for (const s of roots[pi]) {
        const d = a.dir * dS(p, a.s, s);
        if (d > 1e-6 * h) set(ji, ai, d, "the next junction");
      }
    }),
  );
  if (cut) scene.crossings.forEach((cx, x) => {
    const ia = model.idxOf.get(cx.a.chain);
    const ib = model.idxOf.get(cx.b.chain);
    if (ia === undefined || ib === undefined) return;
    const ta = pointAt(model.polys[ia], normS(model.polys[ia], cx.a.s));
    const tb = pointAt(model.polys[ib], normS(model.polys[ib], cx.b.s));
    const th = Math.max(1e-3, Math.asin(Math.min(1, Math.abs(ta.tx * tb.ty - ta.ty * tb.tx))));
    const near = h / Math.tan(th / 2) + pm * h;
    scene.junctions.forEach((J, ji) => {
      const on = (pi: number, s: number): [number, number][] => {
        const out: [number, number][] = [];
        J.arms.forEach((a, ai) => {
          if (model.idxOf.get(a.chain) !== pi) return;
          const d = a.dir * dS(model.polys[pi], a.s, s);
          if (d > 0 && d <= caps[ji][ai].len + near) out.push([ai, d]);
        });
        return out;
      };
      const A = on(ia, cx.a.s);
      const B = on(ib, cx.b.s);
      if (!A.length || !B.length) return;
      const fa = Math.max(...A.map(([, d]) => d));
      const fb = Math.max(...B.map(([, d]) => d));
      const cut = (l: [number, number][]) => {
        for (const [ai, d] of l) set(ji, ai, d - near, `crossing ${x}'s pass ${(d / h).toFixed(2)}h out`);
      };
      if (fa >= fb) cut(A);
      else cut(B);
    });
  });
  return caps;
}

/** The junction's arms, their caps and corner fills, and the per-side walk (see the file header). */
export class GeoGroups {
  readonly caps: GeoCap[][];
  /** Per junction, per arm: [side +1, side −1] extents from the root (0: the side is not inside at the root). */
  readonly sides: [number, number][][];
  readonly model: FieldModel;
  private readonly arms: GeoArm[][];
  private readonly cornersOf: number[][];

  constructor(model: FieldModel, caps?: GeoCap[][]) {
    this.model = model;
    this.caps = caps ?? geoCaps(model);
    this.cornersOf = model.scene.junctions.map(() => []);
    model.corners.forEach((c, k) => this.cornersOf[c.junction].push(k));
    this.arms = model.scene.junctions.map((J, ji) =>
      J.arms.map((a, ai) => ({ pi: model.idxOf.get(a.chain), s: a.s, dir: a.dir, cap: this.caps[ji][ai].len })),
    );
    const step = model.h / 8;
    this.sides = this.arms.map((arms, ji) =>
      arms.map((A, ai) => {
        const out: [number, number] = [0, 0];
        if (A.pi === undefined) return out;
        const p = model.polys[A.pi];
        ([1, -1] as const).forEach((side, k) => {
          // Within h of the root a side may start outside and enter (a narrow
          // pair: the outside point clears the other tube's round end at the
          // node and enters a little further on); the walk then runs on from
          // there. A side not inside by h is not in the group (extent 0).
          let t = 0;
          let seen = false;
          for (; t <= A.cap; t += step) {
            const at = pointAt(p, normS(p, A.s + A.dir * t));
            const ins = this.sideInside(ji, ai, at.x, at.y, -at.ty * side, at.tx * side);
            if (ins) seen = true;
            else if (seen || t > model.h) break;
          }
          out[k] = seen ? Math.min(t, A.cap) : 0;
        });
        return out;
      }),
    );
  }

  /**
   * Whether arm ai's side point (centre (x, y), outward normal (nx, ny))
   * lies inside junction ji's group: its outside point (h + 0.6W out) inside
   * another arm's tube (root to cap) or a corner fill, or its band point
   * (h − W/2 out) within h − W of another arm. The two halves of a through
   * pass are one body. skip(bi) leaves arm bi out.
   */
  sideInside(ji: number, ai: number, x: number, y: number, nx: number, ny: number, skip?: (bi: number) => boolean): boolean {
    const { model } = this;
    const h = model.h;
    const W = model.W;
    const ox = x + nx * (h + 0.6 * W);
    const oy = y + ny * (h + 0.6 * W);
    const bx = x + nx * (h - W / 2);
    const by = y + ny * (h - W / 2);
    const arms = this.arms[ji];
    const A = arms[ai];
    for (let bi = 0; bi < arms.length; bi++) {
      const B = arms[bi];
      if (bi === ai || B.pi === undefined || skip?.(bi)) continue;
      if (B.pi === A.pi && Math.abs(B.s - A.s) < 1e-6) continue;
      const lo = B.dir > 0 ? B.s : B.s - B.cap;
      const hi = B.dir > 0 ? B.s + B.cap : B.s;
      if (model.distWindow(B.pi, lo, hi, ox, oy, h) < h || model.distWindow(B.pi, lo, hi, bx, by, h) < h - W) return true;
    }
    for (const k of this.cornersOf[ji]) if (model.inFill(k, ox, oy)) return true;
    return false;
  }

  /** The arm of junction ji on poly pi whose window [root, root + cap] holds s, or −1. */
  armAt(ji: number, pi: number, s: number): number {
    const p = this.model.polys[pi];
    const arms = this.arms[ji];
    for (let bi = 0; bi < arms.length; bi++) {
      const B = arms[bi];
      if (B.pi !== pi) continue;
      const d = B.dir * dS(p, B.s, s);
      if (d >= -1e-9 && d <= B.cap + 1e-9) return bi;
    }
    return -1;
  }

  /**
   * Where the per-side extents differ from the 2D group: past a side's
   * extent, before its cap, the stretches where the side is inside the
   * other arms' tubes again (the union is connected through the node, so
   * a re-entry belongs to it; the per-side extent, S3's data, stops at the
   * first exit). [junction, arm, side, from, to], arc length from the root.
   */
  reentries(): [number, number, 1 | -1, number, number][] {
    const out: [number, number, 1 | -1, number, number][] = [];
    const step = this.model.h / 8;
    this.arms.forEach((arms, ji) =>
      arms.forEach((A, ai) => {
        if (A.pi === undefined) return;
        const p = this.model.polys[A.pi];
        ([1, -1] as const).forEach((side, k) => {
          let open = -1;
          let t = this.sides[ji][ai][k] + step;
          for (; t <= A.cap; t += step) {
            const at = pointAt(p, normS(p, A.s + A.dir * t));
            const ins = this.sideInside(ji, ai, at.x, at.y, -at.ty * side, at.tx * side);
            if (ins && open < 0) open = t;
            if (!ins && open >= 0) {
              out.push([ji, ai, side, open, t]);
              open = -1;
            }
          }
          if (open >= 0) out.push([ji, ai, side, open, Math.min(t, A.cap)]);
        });
      }),
    );
    return out;
  }

  /** Per poly, the [lo, hi, side, junction, arm] arc ranges where a side lies inside a junction's group. */
  ranges(): [number, number, 1 | -1, number, number][][] {
    const out = this.model.polys.map(() => [] as [number, number, 1 | -1, number, number][]);
    this.arms.forEach((arms, ji) =>
      arms.forEach((A, ai) => {
        if (A.pi === undefined) return;
        ([1, -1] as const).forEach((side, k) => {
          const t = this.sides[ji][ai][k];
          if (t > 0) {
            const s1 = A.s + A.dir * t;
            out[A.pi!].push([Math.min(A.s, s1), Math.max(A.s, s1), side, ji, ai]);
          }
        });
      }),
    );
    return out;
  }
}
