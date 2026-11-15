/**
 * K1389 s1: today's thread look under rp=gf (section colours, fill / border / both).
 *
 * THE COLOUR TABLE (K1389 s2, GfLookTable: its own RGBA32F texture, beside the tables: the K1362 digest never sees
 * it). STATIC: it holds each chain's section colours by ctrl, so it is built only when what knotSection reads
 * changes (KSTATIC, the run base, the blend, the gamut), never for new tables. Texel c < nC is chain c's header
 * (first colour texel, first position, sample count (0: no label), closed); slot sl's colours follow as LOOK_R + 1
 * texels, knotSection at sl + i / LOOK_R (the last at the slot's end, from the left), lerped within the slot only,
 * so a run's hard edge at an integer ctrl stays hard.
 *
 * THE POSITIONS (GfLookTable.positions, one R32F per sample, a closed chain repeating sample 0): each sample's place
 * in its chain's colours, slot * (LOOK_R + 1) + fraction * LOOK_R, from the ctrl arcs of the same update the tables
 * are built from (paint_math kCtrlOfArc's walk over KGEOM; gf_app takes them when it gathers a build and uploads them
 * with that build's tables). A walk of the samples, no knotSection: the colours follow the material in motion.
 *
 * THE LOOK FORM (lookForm, a text transform like gf_reveal's revealForm; the original programs stay as they are and
 * draw whenever the look is off). Each label site also records the label's piece (or a corner's s) and key; after
 * the configurations, the pixel re-scans its label piece's segments (plo..phi) for the nearest one (a corner's s
 * finds its segment by a search over the chain's vertex s). The segment's two samples take their section colours
 * (position -> the table), lerped by the foot's fraction: the RIBBON's colour (kSectionAtArc's reading). It is
 * written to a second target, o1 = (rgb, 1); o1 = 0 is no label. It also cuts today's crossing gap: a piece whose
 * key is above the label's by more than zt and whose centre line is nearer than h + gap takes ink and coverage (the
 * under thread's backdrop gap beyond the over thread's edge, crossing_gaps.ts's margin).
 *
 * THE COMPOSITE (LOOK_COMP_FS): fill = the section colour over the coverage (no outline); border = the stroke over
 * the ink band (the interior clear); both = the stroke mixed 0.9 over the ink band. The stroke is ribbon_shader's:
 * mix(section * 0.30, (0.09, 0.085, 0.08), 0.5), or the border colour when one is set. A pixel with coverage but
 * no label (the antialiased fringe outside h) takes its nearest labelled neighbour's colour.
 */
import { kCA, knotSection, type KChain, type KData } from "../paint_math";
import { kStatic, knotUniformValues } from "../paint_model";
import { CUT_BIAS } from "../ribbon/crossing_gaps";
import { GF_TW } from "./gf_pack";

export interface GfLookSource {
  kd: KData;
  kcv: KChain[];
  chainSamples: ({ positions: ArrayLike<number>; count: number } | null)[];
}

/** The colour steps per ctrl slot (the table holds LOOK_R + 1 texels a slot). */
export const LOOK_R = 8;

/** The look's mode numbers (renderer.threadLook: 0 fill, 1 border, 2 both). */
export type GfLookMode = 0 | 1 | 2;

/**
 * K1389 s2: whether the colours may have changed since the last call, without hashing KSTATIC: its revision
 * (paint_model's FloatRows bumps it on every write), its mirror, the chain count and the uniforms knotSection reads.
 * A change here still rebuilds only when lookKey's hash moved.
 */
export class GfLookGate {
  private rev = -1;
  private stat: Float32Array | null = null;
  private nC = -1;
  private u = new Float64Array(6).fill(NaN);
  changed(r: GfLookSource): boolean {
    const U = knotUniformValues();
    const K = kStatic();
    let ch = false;
    // a source whose stat is not the paint model's (a test's) has no revision: always ask the hash
    if (r.kd.stat !== K.data || K.rev !== this.rev || r.kd.stat !== this.stat || r.chainSamples.length !== this.nC) ch = true;
    this.rev = K.rev; this.stat = r.kd.stat; this.nC = r.chainSamples.length;
    const g = U.uKGamut ?? [];
    const vals = [U.uKBase?.[0] ?? 0, U.uKSect?.[0] ?? 0, g[0] ?? 0, g[1] ?? 0, g[2] ?? 0, g[3] ?? 0];
    for (let i = 0; i < 6; i++) if (!(this.u[i] === vals[i])) { ch = true; this.u[i] = vals[i]; }
    return ch;
  }
}

let keyView: Uint32Array | null = null;
const keyF = new Float32Array(1);
const keyU = new Uint32Array(keyF.buffer);
/** A hash of what the colour table reads (KSTATIC, the run base, the blend, the gamut, the chains' shape). */
export function lookKey(r: GfLookSource): number {
  const U = knotUniformValues();
  const S = r.kd.stat;
  if (!keyView || keyView.buffer !== S.buffer || keyView.byteOffset !== S.byteOffset || keyView.length !== S.length) keyView = new Uint32Array(S.buffer, S.byteOffset, S.length);
  let h = 2166136261;
  const W = keyView;
  for (let i = 0; i < W.length; i++) h = Math.imul(h ^ W[i], 16777619);
  for (const v of [U.uKBase?.[0] ?? 0, U.uKSect?.[0] ?? 0, ...(U.uKGamut ?? [])]) { keyF[0] = v; h = Math.imul(h ^ keyU[0], 16777619); }
  for (let ch = 0; ch < r.chainSamples.length; ch++) {
    const c = r.kcv[ch]; const sm = r.chainSamples[ch];
    h = Math.imul(h ^ (sm ? sm.count : -1), 16777619);
    h = Math.imul(h ^ (c ? c.nCtrl * 2 + (c.closed ? 1 : 0) : -1), 16777619);
    h = Math.imul(h ^ (c ? c.ch : -1), 16777619);
  }
  return h >>> 0;
}

/** Whether chain ch takes a label colour (samples, a chain view, controls). */
function lookValid(r: GfLookSource, ch: number): boolean {
  const sm = r.chainSamples[ch]; const c = r.kcv[ch];
  return !!sm && sm.count >= 1 && !!c && c.nCtrl >= 1;
}

export class GfLookTable {
  data = new Float32Array(GF_TW * 4);
  rows = 0;
  /** The colour texels (the size against the texture's cap). */
  nColors = 0;
  /** The position entries (samples, plus one a closed chain). */
  nPos = 0;
  ms = 0;
  /** Bumped when a build changes the data (the pass uploads on a change). */
  version = 0;
  private next = new Float32Array(0);
  private rgb = [0, 0, 0];

  /** Rebuild from the renderer's state (KSTATIC and the uniforms; no samples, no arcs); true when it changed. */
  build(r: GfLookSource): boolean {
    const t0 = performance.now();
    const U = knotUniformValues();
    const D = r.kd;
    const nC = r.chainSamples.length;
    const R = LOOK_R;
    let nCol = 0; let nPos = 0;
    for (let ch = 0; ch < nC; ch++) {
      if (!lookValid(r, ch)) continue;
      nCol += r.kcv[ch].nCtrl * (R + 1);
      nPos += r.chainSamples[ch]!.count + (r.kcv[ch].closed ? 1 : 0);
    }
    // one texel spare: the last colour's right neighbour is fetched at weight 0
    const rows = Math.max(1, Math.ceil((nC + nCol + 1) / GF_TW));
    const len = rows * GF_TW * 4;
    if (this.next.length < len) this.next = new Float32Array(len);
    const d = this.next;
    d.fill(0, 0, len);
    const rgb = this.rgb;
    let O = nC; let pb = 0;
    for (let ch = 0; ch < nC; ch++) {
      const h = 4 * ch;
      if (!lookValid(r, ch)) continue;
      const c = r.kcv[ch]; const n = c.nCtrl; const count = r.chainSamples[ch]!.count;
      d[h] = O; d[h + 1] = pb; d[h + 2] = count; d[h + 3] = c.closed ? 1 : 0;
      for (let sl = 0; sl < n; sl++) {
        for (let i = 0; i <= R; i++) {
          // an open chain ends at its last control: its last slot holds that colour
          let ctrl = i < R ? sl + i / R : sl + 1 - 1e-9;
          if (!c.closed) ctrl = Math.min(ctrl, n - 1);
          knotSection(D, U, c, ctrl, rgb);
          const o = 4 * (O + sl * (R + 1) + i);
          d[o] = Number.isFinite(rgb[0]) ? rgb[0] : 0;
          d[o + 1] = Number.isFinite(rgb[1]) ? rgb[1] : 0;
          d[o + 2] = Number.isFinite(rgb[2]) ? rgb[2] : 0;
          d[o + 3] = 1;
        }
      }
      O += n * (R + 1);
      pb += count + (c.closed ? 1 : 0);
    }
    let same = rows === this.rows && this.data.length >= len;
    if (same) for (let i = 0; i < len; i++) if (this.data[i] !== d[i]) { same = false; break; }
    if (!same) {
      if (this.data.length < len) this.data = new Float32Array(len);
      this.data.set(d.subarray(0, len));
      this.rows = rows;
      this.version++;
    }
    this.nColors = nCol;
    this.nPos = nPos;
    this.ms = performance.now() - t0;
    return !same;
  }

  /**
   * Each pass vertex's place in its chain's colours (slot * (LOOK_R + 1) + fraction * LOOK_R) from r's current arcs, in
   * build()'s layout (a closed chain repeats its first). paint_math kCtrlOfArc's map, as a walk: the sample's arc
   * k * arcPer (kSectionAtArc's), the largest slot whose arc is at or before it, the clamped fraction to the next.
   */
  positions(r: GfLookSource, out?: Float32Array): Float32Array {
    const D = r.kd; const G = D.geom;
    const nC = r.chainSamples.length;
    const R = LOOK_R;
    let nPos = 0;
    for (let ch = 0; ch < nC; ch++) if (lookValid(r, ch)) nPos += r.chainSamples[ch]!.count + (r.kcv[ch].closed ? 1 : 0);
    // whole rows of the pass's R32F texture
    const len = Math.max(1, Math.ceil(nPos / GF_TW)) * GF_TW;
    const P = out && out.length >= len ? out : new Float32Array(len);
    let pb = 0;
    for (let ch = 0; ch < nC; ch++) {
      if (!lookValid(r, ch)) continue;
      const c = r.kcv[ch]; const n = c.nCtrl; const count = r.chainSamples[ch]!.count;
      const total = G[c.geom * 4]; const arcPer = G[c.geom * 4 + 1];
      let slot = 0;
      for (let k = 0; k < count; k++) {
        const a = k * arcPer;
        while (slot < n - 1 && kCA(D, c, slot + 1) <= a) slot++;
        const a0 = kCA(D, c, slot);
        const a1 = slot < n - 1 ? kCA(D, c, slot + 1) : total;
        const f = a1 > a0 ? Math.max(0, Math.min(1, (a - a0) / (a1 - a0))) : 0;
        const v = slot * (R + 1) + f * R;
        P[pb + k] = Number.isFinite(v) ? v : 0;
      }
      // The pass's vertex k is the field scene's KEPT sample k (scene_export mapChain drops a sample equal to the last
      // kept one, and a ring's last kept one equal to its first): compact to the kept samples, then fill the chain's
      // tail with its end (open: the clamp) or its wrap (closed: the closing vertex is sample 0).
      const xy = r.chainSamples[ch]!.positions;
      let kv = 0; let l = -1;
      for (let k = 0; k < count; k++) {
        if (l >= 0 && xy[2 * k] === xy[2 * l] && xy[2 * k + 1] === xy[2 * l + 1]) continue;
        P[pb + kv++] = P[pb + k]; l = k;
      }
      if (c.closed && kv > 1 && xy[2 * l] === xy[0] && xy[2 * l + 1] === xy[1]) kv--;
      const end = count + (c.closed ? 1 : 0);
      const pad = c.closed ? P[pb] : P[pb + kv - 1];
      for (let k = kv; k < end; k++) P[pb + k] = pad;
      pb += end;
    }
    return P;
  }
}

/** Today's crossing gap beyond the over thread's edge (world units): the casing's margin plus crossing_gaps' CUT_BIAS. */
export function lookGap(r: { style: { casingWidth: number; threadWidth: number } }): number {
  return Math.max(0, (r.style.casingWidth - r.style.threadWidth) / 2) + CUT_BIAS;
}

/**
 * CPU twin of the look form's lkColour: chain c's colour at sample k (counted from the chain's first sample, its
 * extension vertex already taken off) and fraction u, or null (no label).
 */
export function lookColour(T: Pick<GfLookTable, "data">, P: ArrayLike<number>, c: number, k: number, u: number): number[] | null {
  const d = T.data; const h = 4 * c;
  const n = d[h + 2];
  if (n < 1) return null;
  const last = d[h + 3] > 0.5 ? n : n - 1;
  if (k < 0) { k = 0; u = 0; }
  if (k >= last) { k = last; u = 0; }
  const O = d[h]; const b = d[h + 1];
  const at = (p: number): number[] => {
    const f = Math.floor(p); const i = 4 * (O + f); const t = p - f;
    return [0, 1, 2].map((j) => d[i + j] + (d[i + 4 + j] - d[i + j]) * t);
  };
  const A = at(P[b + k]); const B = at(P[b + Math.min(k + 1, last)]);
  return [0, 1, 2].map((j) => A[j] + (B[j] - A[j]) * u);
}

// the look's globals (after layers()' own; MAXS is defined by then)
const G_ANCHOR = "int labC; float labS; int cWk; int cWa; int cWb; float cCov;\n";
const G_LOOK = `// K1389 s1: the label's piece (-1: a corner, whose s rides lkS) and key, as each site sets labC; the best
// configuration's copies; the output colour (K1389 s2)
int lkJ; float lkS; float lkK; int lkJb; float lkSb; float lkKb; vec4 lkCo = vec4(0.0);
int lkj[MAXS]; float lks[MAXS];
`;
const M_ANCHOR = "\nvoid main() {\n";
const M_LOOK = `
uniform highp sampler2D uLk; uniform highp sampler2D uLkP; uniform float uLkG;
vec4 LKT(int i) { return texelFetch(uLk, ivec2(i & TWM, i >> LOG), 0); }
float LKP(int i) { return texelFetch(uLkP, ivec2(i & TWM, i >> LOG), 0).x; }
#ifdef PLH
#define LKLO(j) PLO(j)
#define LKHI(j) PHI(j)
#else
#define LKLO(j) plo[j]
#define LKHI(j) phi[j]
#endif
// K1389 s2: the label piece's nearest segment at p (the scan's arithmetic over the piece's segments): its first
// vertex counted from the chain's, and the foot's fraction
vec2 lookQ(int j, vec2 p) {
  int c = PC(j); vec4 C0 = F(uOCh + 3 * c); int cV0 = int(C0.x); int nseg = int(C0.y) - 1; bool closed = C0.z > 0.5;
  int lo = LKLO(j); int hi = LKHI(j);
  float bd = BIG; vec2 bq = vec2(0.0);
  for (int q = lo; q <= hi; q++) {
    int qq = closed ? pmod(q, nseg) : q;
    int v = cV0 + qq;
    vec4 A = F(uOV + v); vec4 B = F(uOV + v + 1);
    float dx = B.x - A.x; float dy = B.y - A.y; float l2 = dx * dx + dy * dy;
    float u = l2 > 0.0 ? clamp(((p.x - A.x) * dx + (p.y - A.y) * dy) / l2, 0.0, 1.0) : 0.0;
    float ex = p.x - A.x - dx * u; float ey = p.y - A.y - dy * u; float d2 = ex * ex + ey * ey;
    if (d2 < bd) { bd = d2; bq = vec2(float(qq), u); }
  }
  return bq;
}
// K1389 s2: a corner's s on chain c: its segment by a search over the chain's vertex s, and the fraction
vec2 lookQs(int c, float s) {
  vec4 C0 = F(uOCh + 3 * c); int cV0 = int(C0.x); int lo = 0; int hi = int(C0.y) - 1;
  for (int it = 0; it < 24; it++) {
    if (hi - lo <= 1) break;
    int m = (lo + hi) / 2;
    if (F(uOV + cV0 + m).z <= s) lo = m; else hi = m;
  }
  float a = F(uOV + cV0 + lo).z; float b = F(uOV + cV0 + lo + 1).z;
  return vec2(float(lo), b > a ? clamp((s - a) / (b - a), 0.0, 1.0) : 0.0);
}
vec3 lkAt(int O, float P) { float f = floor(P); int i = O + int(f); return mix(LKT(i).rgb, LKT(i + 1).rgb, P - f); }
// K1389 s2: chain c's colour at segment q (gf_look.ts lookColour): the two samples' colours, lerped
vec4 lkColour(int c, vec2 q) {
  vec4 H = LKT(c);
  if (H.z < 1.0) return vec4(0.0);
  bool closed = H.w > 0.5;
  int k = int(q.x); float u = q.y;
  // an open chain's END arm may start at an extension vertex (tables.ts, s < 0) before its first sample
  if (!closed && F(uOV + int(F(uOCh + 3 * c).x)).z < 0.0) k -= 1;
  int last = closed ? int(H.z) : int(H.z) - 1;
  if (k < 0) { k = 0; u = 0.0; }
  if (k >= last) { k = last; u = 0.0; }
  int O = int(H.x); int b = int(H.y);
  vec3 A = lkAt(O, LKP(b + k)); vec3 B = lkAt(O, LKP(b + min(k + 1, last)));
  return vec4(mix(A, B, u), 1.0);
}
// K1389 s1: today's crossing gap: a piece above the label (key past zt) within h + gap of p, outside its own edge
float lkGap(float key) {
  float g = 0.0;
  for (int j = 0; j < np; j++) {
    if (!(pkey[j] > key + uZt)) continue;
    g = max(g, (1.0 - ss(uH + uLkG - uAA, uH + uLkG + uAA, pd[j])) * ss(uH - uAA, uH + uAA, pd[j]));
  }
  return g;
}
`;
const SITES: [string | RegExp, string, number][] = [
  // the second target (K1389 s2): the colour
  ["#else\nout vec4 o0;\n#endif", "#else\nlayout(location = 0) out vec4 o0;\nlayout(location = 1) out vec4 o1;\n#endif", 1],
  // the ink band takes today's stroke profile (ribbon_shader.ts, K797b: edge = smoothstep(1 - bw, 1 - bw + fwA, e),
  // fwA = max(3 fwidth(vUV.y), 0.02), e = 1 - D / h): full from the edge to W - r, gone at W, r = max(1.5 px, 0.02 h)
  // (uAA is half a pixel), so on a thin thread the rim never reaches full, as today's. It ends at W, inside form B's
  // reach (W + aa): the tables' bins stay exact. The outer ramp is form B's (the fill's edge).
  ["float band2(float D) { return (1.0 - ss(uW - uAA, uW + uAA, D)) * ss(-uAA, uAA, D); }",
    "float band2(float D) { return (1.0 - ss(uW - max(3.0 * uAA, 0.02 * uH), uW, D)) * ss(-uAA, uAA, D); }", 1],
  // K1407 23A: band (the tangent terms' ramp) widens with band2
  ["float band(float D) { return 1.0 - ss(uW - uAA, uW + uAA, D); }",
    "float band(float D) { return 1.0 - ss(uW - max(3.0 * uAA, 0.02 * uH), uW, D); }", 1],
  // layers(), LABRUN: a piece label, then a corner's
  ["labE = e; labC = PC(j); }", "labE = e; labC = PC(j); lkJ = j; lkK = pkey[j]; }", 1],
  ["labC = nearerA ? int(K3.x) : int(K3.y); }", "labC = nearerA ? int(K3.x) : int(K3.y); lkJ = -1; lkS = nearerA ? K3.z : K3.w; lkK = key; }", 1],
  // layers(), the full program: per surface, then the top's
  ["scch[e] = PC(j);", "scch[e] = PC(j); lkj[e] = j;", 1],
  ["scch[e] = nearerA ? int(K3.x) : int(K3.y);", "scch[e] = nearerA ? int(K3.x) : int(K3.y); lkj[e] = -1; lks[e] = nearerA ? K3.z : K3.w;", 1],
  ["labC = top >= 0 ? scch[top] : -1;", "labC = top >= 0 ? scch[top] : -1; if (top >= 0) { lkJ = lkj[top]; lkS = lks[top]; lkK = sckey[top]; }", 1],
  // layers1()
  ["if (pd[0] < h) labC = PC(0);", "if (pd[0] < h) { labC = PC(0); lkJ = 0; lkK = pkey[0]; }", 1],
  // the configurations' best, the through corner's own label
  ["if (w > bestW) { bestW = w; lab = labC;", "if (w > bestW) { bestW = w; lab = labC; lkJb = lkJ; lkSb = lkS; lkKb = lkK;", 1],
  ["if (lab < 0 && ink > 0.0) { lab = own;", "if (lab < 0 && ink > 0.0) { lab = own; lkJb = -1; lkSb = K3.z; lkKb = BIG;", 1],
  // the output: the gap cut and the colour
  ["    oInk = min(1.0, ink); oCov = min(1.0, cov);",
    "    lkCo = vec4(0.0);\n    if (lab >= 0) { lkCo = lkColour(lab, lkJb >= 0 ? lookQ(lkJb, p) : lookQs(lab, lkSb)); float lkg = lkKb < BIG ? lkGap(lkKb) : 0.0; ink *= 1.0 - lkg; cov *= 1.0 - lkg; }\n    oInk = min(1.0, ink); oCov = min(1.0, cov);", 1],
  ["  o0 = vec4(oInk, oCov, 0.0, 1.0);\n#endif", "  o0 = vec4(oInk, oCov, 0.0, 1.0); o1 = lkCo;\n#endif", 1],
];

/** A gf program's look form (see the header); throws when an anchor is missing or repeats. */
export function lookForm(src: string): string {
  const count = (a: string): number => src.split(a).length - 1;
  if (count(G_ANCHOR) !== 1 || count(M_ANCHOR) !== 1) throw new Error(`gf look: anchors G ${count(G_ANCHOR)}, main ${count(M_ANCHOR)}`);
  let out = src.replace(G_ANCHOR, G_ANCHOR + G_LOOK).replace(M_ANCHOR, M_LOOK + M_ANCHOR);
  for (const [a, b] of SITES) {
    const s = a as string;
    const n = out.split(s).length - 1;
    // a site a program's form compiled out (the tiers' LABRUN, the full program's surfaces, FAST) may be absent
    if (n > 1) throw new Error(`gf look: site repeats (${s})`);
    if (n === 1) out = out.replace(s, b);
  }
  // the sites every program carries
  for (const must of ["lkJb = lkJ;", "lkCo = vec4(0.0);\n", "o1 = lkCo;", "layout(location = 1) out vec4 o1;", "ss(uW - max(3.0 * uAA, 0.02 * uH), uW, D)"]) if (!out.includes(must)) throw new Error(`gf look: ${must} missing`);
  return out;
}

// The look's composite: the pass's (ink, coverage) and colour targets over the canvas, premultiplied.
export const LOOK_COMP_FS = `#version 300 es
precision highp float;
uniform sampler2D uC;
uniform sampler2D uCo;
uniform int uLook;
uniform vec4 uBd;
uniform vec3 uFill;
out vec4 o;
void main() {
  ivec2 q = ivec2(gl_FragCoord.xy);
  vec4 c = texelFetch(uC, q, 0);
  float ink = c.x; float cov = c.y;
  if (!(ink > 0.0) && !(cov > 0.0)) { o = vec4(0.0); return; }
  vec4 k = texelFetch(uCo, q, 0);
  if (!(k.a > 0.0)) {
    // the fringe outside h has no label: its nearest labelled neighbour's
    ivec2 sz = textureSize(uCo, 0); float bd = 1e9;
    for (int dy = -2; dy <= 2; dy++) for (int dx = -2; dx <= 2; dx++) {
      ivec2 r = clamp(q + ivec2(dx, dy), ivec2(0), sz - 1);
      vec4 j = texelFetch(uCo, r, 0);
      float dd = float(dx * dx + dy * dy);
      if (j.a > 0.0 && dd < bd) { bd = dd; k = j; }
    }
  }
  vec3 C = k.a > 0.0 ? k.rgb : uFill;
  vec3 S = mix(mix(C * 0.30, vec3(0.09, 0.085, 0.08), 0.5), uBd.rgb, uBd.w);
  if (uLook == 0) o = vec4(C * cov, cov);
  else if (uLook == 1) o = vec4(S * ink, ink);
  else { float a = ink + (1.0 - ink) * cov; o = vec4(S * (0.9 * ink) + C * (a - 0.9 * ink), a); }
}`;
