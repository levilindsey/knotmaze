// K1040 S3: the label's verdict against form B's reference at one point.
//
// The pass's label (from the GPU readback, or labelAt's float64 mirror) is
// compared with FormB.evalPoint's top surface, chain and s. Classes, in the
// spirit of K868's oracle30:
//   agree     both paper, or the same surface code and chain with s within
//             tolS (float32 noise);
//   boundary  the reference's own margin under eps: an edge within epsPx of
//             a piece's or a fill's outline (EDGE), the two top surfaces'
//             keys within the float32 depth's resolution (DEPTH), the foot
//             within eps of a label span bound (CUT), or the same surface
//             and chain with s apart by more than float noise but within σ
//             (MERGE: two minima of one chain that the reference merged);
//   fade      inside a reference fade whose label switches there (cap mix,
//             fold, merge, tie): named, with the fade bits, and argued in
//             the brief's Findings before it counts as anything but DEFECT;
//   DEFECT    everything else.
import { F_CAP, F_FOLD, F_MERGE, F_TIE, OWN, type FormB, type Piece } from "./form_b";
import { dS } from "./geom";
import type { LabelBTables } from "./label_b";

/** A label sample: code −1 is paper; else group + 1, or 0 for a piece's own surface. */
export interface LabelSample {
  code: number;
  chain: number;
  s: number;
  key: number;
  fill: boolean;
}

export type LabelClass = "agree" | "boundary" | "fade" | "DEFECT";

export interface LabelVerdict {
  cls: LabelClass;
  why: string;
  ref: { top: number; code: number; chain: number; s: number; key: number; fade: number; dkey: number; nSurf: number };
}

const PB: Piece[] = [];

function ulp32(v: number): number {
  const a = Math.abs(v);
  return a > 0 ? 2 ** (Math.floor(Math.log2(a)) - 23) : 2 ** -149;
}

/** Distance from (x, y) to the nearest outline of any fill near it (the fill rule's boundaries). */
function fillEdge(fb: FormB, x: number, y: number): number {
  let best = Infinity;
  const aa = fb.aa;
  const lim = fb.h - 2 * aa;
  for (const ci of fb.cornersNear(x, y)) {
    const c = fb.corners[ci];
    if (!(c.r > 0 && c.omega > 0)) continue;
    const dq = Math.hypot(x - c.qx, y - c.qy);
    best = Math.min(best, Math.abs(dq - c.r), Math.abs(dq - c.rV * (1 + 1e-9)));
    for (const [tx, ty] of [
      [c.tax, c.tay],
      [c.tbx, c.tby],
    ]) {
      const rx = tx - c.qx;
      const ry = ty - c.qy;
      const l = Math.hypot(rx, ry);
      if (l > 0) best = Math.min(best, Math.abs(rx * (y - c.qy) - ry * (x - c.qx)) / l);
    }
    const fa = fb.footArm(c.a, x, y, 0, Math.max(c.dVa, c.dA) + 2 * fb.h);
    const fbb = fb.footArm(c.b, x, y, 0, Math.max(c.dVb, c.dB) + 2 * fb.h);
    best = Math.min(best, Math.abs(fa.d - lim), Math.abs(fbb.d - lim));
  }
  return best;
}

function nearBound(T: LabelBTables, chain: number, s: number, eps: number): boolean {
  if (chain < 0) return false;
  const sp = T.spans[chain];
  for (let i = 1; i < sp.length; i++) if (Math.abs(sp[i].lo - s) < eps) return true;
  return false;
}

/**
 * The verdict at world point (x, y) for label sample g. epsPx is the margin
 * in device px (oracle30's EPS_PX, 1e-3); tolS the s noise allowed in agree.
 */
export function labelVerdict(fb: FormB, T: LabelBTables, x: number, y: number, g: LabelSample, epsPx = 1e-3): LabelVerdict {
  const r = fb.evalPoint(x, y);
  const refCode = r.top === -1 ? -1 : r.top >= OWN ? 0 : r.top + 1;
  const ref = { top: r.top, code: refCode, chain: r.chain, s: r.s, key: r.key, fade: r.fade, dkey: r.dkey, nSurf: r.nSurf };
  if (refCode === -1 && g.code === -1) return { cls: "agree", why: "", ref };
  const epsW = epsPx / fb.ppuDev;
  const sTol = (s: number) => Math.max(epsW, 8 * ulp32(s) + 8 * ulp32(fb.h));
  if (refCode === g.code && r.chain === g.chain) {
    const ds = Math.abs(dS(fb.polys[g.chain], r.s, g.s));
    if (ds <= sTol(r.s)) return { cls: "agree", why: "", ref };
    if (ds <= fb.sigma) return { cls: "boundary", why: "MERGE", ref };
  }
  // Margins.
  const fade = fb.pieces(x, y, PB);
  void fade;
  let dEdge = Infinity;
  for (const A of PB) {
    dEdge = Math.min(dEdge, Math.abs(A.d - fb.h));
    for (const B of A.alts) dEdge = Math.min(dEdge, Math.abs(B.d - fb.h));
  }
  dEdge = Math.min(dEdge, fillEdge(fb, x, y));
  if (dEdge < epsW) return { cls: "boundary", why: "EDGE", ref };
  if (refCode >= 0 && g.code >= 0) {
    const D = 0.5 - r.key * T.keyScale;
    const keyEps = (4 * ulp32(D)) / T.keyScale + 8 * ulp32(Math.abs(r.key) + fb.h * T.invK);
    if (r.nSurf >= 2 && r.dkey < keyEps) return { cls: "boundary", why: "DEPTH", ref };
    if (Math.abs(g.key - r.key) < keyEps && (refCode !== g.code || r.chain !== g.chain)) return { cls: "boundary", why: "DEPTH=", ref };
    if (refCode !== g.code && (nearBound(T, g.chain, g.s, sTol(g.s)) || nearBound(T, r.chain, r.s, sTol(r.s)))) return { cls: "boundary", why: "CUT", ref };
  }
  const fl: string[] = [];
  if (r.fade & F_FOLD) fl.push("fold");
  if (r.fade & F_CAP) fl.push("cap");
  if (r.fade & F_TIE) fl.push("tie");
  if (r.fade & F_MERGE) fl.push("merge");
  const kind =
    refCode === -1
      ? "gpu-extra"
      : g.code === -1
        ? "gpu-hole"
        : `${g.key > r.key ? "higher" : "lower"}${refCode === g.code ? "" : refCode === 0 || g.code === 0 ? "-own" : "-grp"}${r.chain === g.chain ? "-samechain" : ""}${g.fill ? "-gfill" : ""}`;
  if (fl.length && refCode >= 0 && g.code >= 0) return { cls: "fade", why: `${kind}[${fl.join(",")}]`, ref };
  return { cls: "DEFECT", why: fl.length ? `${kind}[${fl.join(",")}]` : kind, ref };
}

/** labelAt's hit as a sample. */
export function sampleOf(hit: { word: number; code: number; chain: number; s: number; key: number; fill: boolean }): LabelSample {
  return hit.word === 0 ? { code: -1, chain: -1, s: 0, key: -Infinity, fill: false } : { code: hit.code, chain: hit.chain, s: hit.s, key: hit.key, fill: hit.fill };
}
