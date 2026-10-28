// K868 S3a3 step 3: the switch lines the band pass inks, centred.
//
// A switch is where two surfaces that both cover a point swap which one is
// on top; the oracle inks a line W wide centred on it (evalLabel's
// "Q present at p" case). This finds the switches of K940's fill yield
// order, the ones measured missing on the 12 scenes (ring's free ends at
// (5.46, 5.10), muse_hash's straight blue bars): a cluster's fill yields to
// another surface's tube unless the nearest table crossing within sigma
// between the tube's chain and a chain of the cluster puts the cluster's
// chain over it (the oracle's private fillOrder, rebuilt here from the same
// table). Along a tube the order flips where a crossing's sigma window
// starts or ends, or halfway between two crossings whose windows overlap,
// so each switch is a line across the tube at one arc length. Every flip is
// emitted where the cluster's fill reaches the tube there; the GPU keeps a
// fragment only where the label on one side of the line is the tube and on
// the other the fill, so a line that a third surface covers, or where no
// swap shows, draws nothing.
//
// Not found here (residual): tube-tube swaps, where two tubes' depths cross
// inside their overlap (twist eyes, tie-breaks).
import type { FieldModel } from "../field/oracle";
import { dS, normS, pointAt } from "../field/geom";

export interface SwitchLine {
  /** Across the tube: from (ax, ay) to (bx, by), the strip normal along the tube. */
  ax: number;
  ay: number;
  bx: number;
  by: number;
  nx: number;
  ny: number;
  /** The tube's chain index, its cluster (-1 = none) and the arc length. */
  chain: number;
  cluster: number;
  s: number;
  /** The fill's cluster. */
  J: number;
}

export function findSwitchLines(m: FieldModel): SwitchLine[] {
  const polys = m.polys;
  const sigma = m.sigma;
  const h = m.h;
  const xBy: { s: number; oi: number; over: boolean }[][] = polys.map(() => []);
  for (const x of m.scene.crossings) {
    const ia = m.idxOf.get(x.a.chain);
    const ib = m.idxOf.get(x.b.chain);
    if (ia === undefined || ib === undefined) continue;
    xBy[ia].push({ s: normS(polys[ia], x.a.s), oi: ib, over: x.over === "a" });
    xBy[ib].push({ s: normS(polys[ib], x.b.s), oi: ia, over: x.over === "b" });
  }
  // The oracle's fillOrder: is cluster J's fill over chain pi at s?
  const fillOver = (J: number, pi: number, s: number): boolean => {
    const spans = m.clusters[J].spans;
    let best = Infinity;
    let res = false;
    for (const x of xBy[pi]) {
      if (!spans.has(x.oi)) continue;
      const d = Math.abs(dS(polys[pi], s, x.s));
      if (d <= sigma && d < best) {
        best = d;
        res = !x.over;
      }
    }
    return res;
  };
  const out: SwitchLine[] = [];
  const eps = Math.min(1e-4, sigma * 1e-3);
  const ext = h + m.W;
  for (let pi = 0; pi < polys.length; pi++) {
    const p = polys[pi];
    for (let J = 0; J < m.clusters.length; J++) {
      const spans = m.clusters[J].spans;
      const xs = xBy[pi].filter((x) => spans.has(x.oi));
      if (xs.length === 0) continue;
      const cand: number[] = [];
      for (const x of xs) {
        cand.push(x.s - sigma, x.s + sigma);
        for (const y of xs) {
          const d = dS(p, x.s, y.s);
          if (d > 0 && d <= 2 * sigma) cand.push(x.s + d / 2);
        }
      }
      const corners = m.clusters[J].corners;
      for (const c0 of cand) {
        if (!p.closed && (c0 <= p.s0 || c0 >= p.s0 + p.len)) continue;
        const s = normS(p, c0);
        if (fillOver(J, pi, s - eps) === fillOver(J, pi, s + eps)) continue;
        const cl = m.clusterAt(pi, s);
        if (cl === J) continue;
        const at = pointAt(p, s);
        const nx = -at.ty;
        const ny = at.tx;
        let reach = false;
        for (let i = 0; i <= 8 && !reach; i++) {
          const u = -h + (2 * h * i) / 8;
          const x = at.x + nx * u;
          const y = at.y + ny * u;
          for (const k of corners)
            if (m.inFill(k, x, y)) {
              reach = true;
              break;
            }
        }
        if (!reach) continue;
        out.push({ ax: at.x - nx * ext, ay: at.y - ny * ext, bx: at.x + nx * ext, by: at.y + ny * ext, nx: at.tx, ny: at.ty, chain: pi, cluster: cl, s, J });
      }
    }
  }
  return out;
}
