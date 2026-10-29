// K868 S3a8b: the band pass's tube edges from the label tables (call 3 of
// docs/design/K868_s3a8b_strips.md; module map: label_app.ts). With the
// label's GPU pieces on (`labelGpu`, URL `lbp`), the edges are static
// instances, two per chain segment: aSeg is LabelTables.segs' (chain row,
// k) at divisor 2, and side = gl_InstanceID & 1 (0 the +h edge, 1 the -h
// edge). The CPU writes them only when a chain's segment count changes
// (BandEdgeLayout), not per frame.
//
// The vertex shader places each edge as buildBandStrips places an uncut
// quad (call 2), from the point table:
//   the segment's unit left normal; a zero-length segment borrows the next
//     segment's that has a direction, cyclically (BORROW segments at most;
//     the CPU scans the whole chain);
//   the vertex normals: the two segments' normalized sum (an open chain's
//     end vertex: its one segment's);
//   the outline: p + side h n at both ends; a segment with no direction
//     draws nothing (the CPU skips it).
// Per fragment, all from the tables: s, interpolated between s[k] and
// s[k] + segLen[k] (the tube's formula at the ends); the member's cluster at
// s (the span table, refCluster's search); the chain, closed flag, s0 and
// length (the chain table); and in the depth variant the depth (the pin
// table: depthAt and the tube's formula, K923's rule). The rest is
// BAND_FS's edge path: the member test (sim), the across probe and the
// coverage.
//
// refBandEdge is the vertex shader's float32 reference, line for line, for
// the same-answer check against buildBandStrips' uncut quads
// (test/render/label/label_band_gpu.test.ts).
import { PLATEAU_GLSL } from "./label_glsl";
import type { LabelTables } from "./label_tables";

/** Segments a zero-length segment looks ahead for a direction to borrow. */
export const BORROW = 8;

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp usampler2D;
`;

const EDGE_VS = `${HEAD}
uniform sampler2D uTbl;
in vec2 aSeg;
uniform mat3 uM; uniform vec2 uSize; uniform float uW; uniform float uH;
out float vD; out float vSv; out vec2 vN; flat out ivec2 vSeg;
vec4 tb(int i) { return texelFetch(uTbl, ivec2(i % TBL_W, i / TBL_W), 0); }
vec2 segN(int p) { vec2 d = tb(p + 1).xy - tb(p).xy; float l = length(d); return l > 1e-9 ? vec2(-d.y, d.x) / l : vec2(0.0); }
vec2 segB(int pt, int nseg, int k) {
  for (int j = 0; j < BORROW; j++) {
    if (j >= nseg) break;
    int kk = k + j; if (kk >= nseg) kk -= nseg;
    vec2 n = segN(pt + kk);
    if (n != vec2(0.0)) return n;
  }
  return vec2(0.0);
}
vec2 vtxN(int pt, int nseg, bool closed, int v) {
  int kin = v > 0 ? v - 1 : closed ? nseg - 1 : -1;
  int kout = v < nseg ? v : closed ? 0 : -1;
  vec2 a = kin >= 0 ? segB(pt, nseg, kin) : vec2(0.0);
  vec2 b = kout >= 0 ? segB(pt, nseg, kout) : vec2(0.0);
  vec2 s = a + b; float l = length(s);
  return l < 1e-9 ? (kout >= 0 ? b : a) : s / l;
}
void main() {
  int ci = int(aSeg.x + 0.5), k = int(aSeg.y + 0.5);
  vec4 c0 = tb(3 * ci);
  int pt = int(c0.x + 0.5), nseg = int(c0.y + 0.5);
  int id = gl_VertexID;
  bool atB = id == 1 || id == 3;
  float t = id >= 2 ? 1.0 : 0.0;
  vec4 A = tb(pt + k);
  vSeg = ivec2(ci, k);
  vD = -0.5 + t * (uW + 1.0);
  vSv = atB ? A.z + A.w : A.z;
  vN = vec2(0.0);
  if (segN(pt + k) == vec2(0.0)) { gl_Position = vec4(-2.0, -2.0, 0.0, 1.0); return; }
  float sd = (gl_InstanceID & 1) == 0 ? 1.0 : -1.0;
  vec2 n = vtxN(pt, nseg, c0.z > 0.5, atB ? k + 1 : k);
  vec2 q = (atB ? tb(pt + k + 1).xy : A.xy) + sd * uH * n;
  vec2 dq = (uM * vec3(q, 1.0)).xy;
  vec2 dn = (uM * vec3(sd * n, 0.0)).xy;
  float ln = length(dn);
  dn = ln > 1e-12 ? dn / ln : vec2(0.0);
  vN = dn;
  gl_Position = vec4((dq - dn * vD) / uSize * 2.0 - 1.0, 0.0, 1.0);
}`;

const EDGE_FS = `${HEAD}
uniform usampler2D uL; uniform sampler2D uTbl;
uniform float uW; uniform float uSigma; uniform float uLr;
#ifdef DEPTH
uniform sampler2D uD2;
uniform float uZmin; uniform float uZinv; uniform float uRinv; uniform float uSinv; uniform float uWin; uniform float uRho;
#endif
in float vD; in float vSv; in vec2 vN; flat in ivec2 vSeg;
out vec4 o;
vec4 tb(int i) { return texelFetch(uTbl, ivec2(i % TBL_W, i / TBL_W), 0); }
#ifdef DEPTH
PLATEAU
#endif
uint lab(vec2 p, ivec2 sz) {
  ivec2 i = ivec2(floor(p));
  if (i.x < 0 || i.y < 0 || i.x >= sz.x || i.y >= sz.y) return 0u;
  return texelFetch(uL, i, 0).x;
}
uint mCh, mCl; float mS0, mLen; bool mClosed;
bool sim(uint w) {
  if (w == 0u) return false;
  uint cl = (w >> 19) & 255u;
  if (cl != 0u && cl == mCl) return true;
  if (((w >> 27) & 1u) == 1u) return false;
  if ((w & 255u) != mCh) return false;
  float s = mS0 + float((w >> 8) & 2047u) / 2047.0 * mLen;
  float ds = abs(s - vSv);
  if (mClosed) ds = min(ds, abs(mLen - ds));
  return ds <= uSigma;
}
void main() {
  ivec2 sz = textureSize(uL, 0);
  vec2 fc = gl_FragCoord.xy;
  int ci = vSeg.x;
  vec4 c0 = tb(3 * ci), c1 = tb(3 * ci + 1), c2 = tb(3 * ci + 2);
  mCh = uint(ci) + 1u; mClosed = c0.z > 0.5; mLen = c0.w; mS0 = c2.x;
  float s = vSv;
  float u = mClosed ? s : min(max(s, mS0), mS0 + mLen);
  int sb = int(c1.x + 0.5), lo = 0, hi = int(c1.y + 0.5) - 1;
  while (lo < hi) { int mid = (lo + hi + 1) >> 1; if (tb(sb + mid).x <= u) lo = mid; else hi = mid - 1; }
  vec4 sp = tb(sb + lo);
  mCl = uint(sp.y + 1.5);
  if (!sim(lab(fc, sz))) discard;
  float ln = length(vN);
  vec2 nn = ln > 1e-6 ? vN / ln : vec2(0.0);
  vec2 ap = fc + nn * (vD + uLr);
  uint acr = lab(ap, sz);
  if (sim(acr)) discard;
#ifdef DEPTH
  if (acr != 0u) {
    float dep = 0.5 - 0.45 * (depthAt(c0, c1, mS0, s) - uZmin) * uZinv - 2e-4 * sp.z * uRinv - 2e-6 * s * uSinv;
    if (texelFetch(uD2, clamp(ivec2(floor(ap)), ivec2(0), sz - 1), 0).x <= dep) discard;
  }
#endif
  o = vec4(clamp(vD + 0.5, 0.0, 1.0) * clamp(uW + 0.5 - vD, 0.0, 1.0), 0.0, 0.0, 1.0);
}`;

/** Keeps or drops each `#ifdef DEPTH` block in JS (K320: no dead text). */
function depthText(src: string, depth: boolean): string {
  return src.replace(/#ifdef DEPTH\n([\s\S]*?)#endif\n/g, (_m, a: string) => (depth ? a : ""));
}

/** The edge program's two stages: TBL_W and BORROW defined, the depth
 * variant (K923's rule) with its own block, the default without. */
export function bandEdgeSources(tblW: number, depth: boolean): { vs: string; fs: string } {
  const def = (src: string): string => src.replace("precision highp usampler2D;\n", `precision highp usampler2D;\n#define TBL_W ${tblW}\n#define BORROW ${BORROW}\n`);
  return { vs: def(EDGE_VS), fs: depthText(def(EDGE_FS), depth).replace("PLATEAU\n", `${PLATEAU_GLSL}\n`) };
}

/** The edges' instance layout: (chain row, k) per segment as the tables
 * write it. update() says whether it changed since the last call, so the
 * band pass uploads the instances only then. */
export class BandEdgeLayout {
  private nseg = new Int32Array(0);
  private nChains = -1;

  update(T: LabelTables): boolean {
    const nC = T.nChains;
    let same = nC === this.nChains;
    if (this.nseg.length < nC) {
      const g = new Int32Array(Math.ceil(nC * 1.25) + 8);
      g.set(this.nseg.subarray(0, Math.max(0, this.nChains)));
      this.nseg = g;
    }
    for (let ci = 0; ci < nC; ci++) {
      const v = T.data[4 * 3 * ci + 1];
      if (this.nseg[ci] !== v) {
        this.nseg[ci] = v;
        same = false;
      }
    }
    this.nChains = nC;
    return !same;
  }
}

// ---------------------------------------------------------------------------
// The vertex shader's float32 reference (Math.fround after every
// operation), line for line with EDGE_VS.

const f = Math.fround;
const tx = (T: LabelTables, i: number, c: number): number => f(T.data[4 * i + c]);
const EPS9 = f(1e-9);

function segN(T: LabelTables, p: number): [number, number] | null {
  const dx = f(tx(T, p + 1, 0) - tx(T, p, 0));
  const dy = f(tx(T, p + 1, 1) - tx(T, p, 1));
  const l = f(Math.sqrt(f(f(dx * dx) + f(dy * dy))));
  return l > EPS9 ? [f(-dy / l), f(dx / l)] : null;
}

function segB(T: LabelTables, pt: number, nseg: number, k: number): [number, number] {
  for (let j = 0; j < BORROW; j++) {
    if (j >= nseg) break;
    let kk = k + j;
    if (kk >= nseg) kk -= nseg;
    const n = segN(T, pt + kk);
    if (n) return n;
  }
  return [0, 0];
}

function vtxN(T: LabelTables, pt: number, nseg: number, closed: boolean, v: number): [number, number] {
  const kin = v > 0 ? v - 1 : closed ? nseg - 1 : -1;
  const kout = v < nseg ? v : closed ? 0 : -1;
  const a = kin >= 0 ? segB(T, pt, nseg, kin) : [0, 0];
  const b = kout >= 0 ? segB(T, pt, nseg, kout) : [0, 0];
  const sx = f(a[0] + b[0]);
  const sy = f(a[1] + b[1]);
  const l = f(Math.sqrt(f(f(sx * sx) + f(sy * sy))));
  if (l < EPS9) return kout >= 0 ? [b[0], b[1]] : [a[0], a[1]];
  return [f(sx / l), f(sy / l)];
}

export interface EdgeRef {
  /** False: the segment has no direction and the instance draws nothing. */
  ok: boolean;
  /** The outline at the segment's start (A) and end (B), world. */
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** The outward normals there (side times the vertex normal). */
  nax: number;
  nay: number;
  nbx: number;
  nby: number;
  /** s at A and B. */
  sa: number;
  sb: number;
}

/** Instance (ci, k, side) as EDGE_VS places it, in float32. */
export function refBandEdge(T: LabelTables, ci: number, k: number, side: 0 | 1, h: number): EdgeRef {
  const pt = Math.round(tx(T, 3 * ci, 0));
  const nseg = Math.round(tx(T, 3 * ci, 1));
  const closed = tx(T, 3 * ci, 2) > 0.5;
  const sa = tx(T, pt + k, 2);
  const sb = f(sa + tx(T, pt + k, 3));
  const ok = segN(T, pt + k) !== null;
  const r: EdgeRef = { ok, ax: 0, ay: 0, bx: 0, by: 0, nax: 0, nay: 0, nbx: 0, nby: 0, sa, sb };
  if (!ok) return r;
  const sd = side === 0 ? 1 : -1;
  const sh = f(sd * f(h));
  const nA = vtxN(T, pt, nseg, closed, k);
  const nB = vtxN(T, pt, nseg, closed, k + 1);
  r.ax = f(tx(T, pt + k, 0) + f(sh * nA[0]));
  r.ay = f(tx(T, pt + k, 1) + f(sh * nA[1]));
  r.bx = f(tx(T, pt + k + 1, 0) + f(sh * nB[0]));
  r.by = f(tx(T, pt + k + 1, 1) + f(sh * nB[1]));
  r.nax = sd * nA[0];
  r.nay = sd * nA[1];
  r.nbx = sd * nB[0];
  r.nby = sd * nB[1];
  return r;
}
