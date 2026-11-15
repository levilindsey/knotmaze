/**
 * K1389 s1: today's thread look under rp=gf (section colours, fill / border / both).
 *
 * THE COLOUR TABLE (GfLookTable, its own RGBA32F texture, beside the tables: the K1362 digest never sees it).
 * Texel c < nC is chain c's header (first colour texel - nC, colour count, s of the first, ds); the colours follow,
 * uniform in the chain's s (gf's s: cumulative hypot over the renderer's samples, as the tables and the reveal
 * table walk it). Each colour is the RIBBON's: the section at the two bracketing samples' ctrls, lerped
 * (paint_math kSectionAtArc's reading, per sample through K1383's ctrl walk).
 *
 * THE LOOK FORM (lookForm, a text transform like gf_reveal's revealForm; the original programs stay as they are and
 * draw whenever the look is off). Each label site also records the label's piece (or a corner's s) and key; after
 * the configurations, the pixel re-scans its label piece's segments (plo..phi) for the label's s, and writes the
 * colour texel's index + 1 into o0.zw (two bytes; 0 = no label). It also cuts today's crossing gap: a piece whose
 * key is above the label's by more than zt and whose centre line is nearer than h + gap takes ink and coverage
 * (the under thread's backdrop gap beyond the over thread's edge, crossing_gaps.ts's margin).
 *
 * THE COMPOSITE (LOOK_COMP_FS): fill = the section colour over the coverage (no outline); border = the stroke over
 * the ink band (the interior clear); both = the stroke mixed 0.9 over the ink band. The stroke is ribbon_shader's:
 * mix(section * 0.30, (0.09, 0.085, 0.08), 0.5), or the border colour when one is set. A pixel with coverage but
 * no label (the antialiased fringe outside h) takes its nearest labelled neighbour's colour.
 */
import { kCA, knotSection, kSampleArc, type KChain, type KData } from "../paint_math";
import { knotUniformValues } from "../paint_model";
import { CUT_BIAS } from "../ribbon/crossing_gaps";
import { GF_TW } from "./gf_pack";

export interface GfLookSource {
  kd: KData;
  kcv: KChain[];
  chainSamples: ({ positions: ArrayLike<number>; count: number } | null)[];
}

/** The colour texels' cap: the index rides two bytes (0 = no label). */
export const LOOK_MAX = 65535;
/** The finest colour step (world units); a longer knot coarsens it to fit LOOK_MAX. */
export const LOOK_DS = 0.02;

/** The look's mode numbers (renderer.threadLook: 0 fill, 1 border, 2 both). */
export type GfLookMode = 0 | 1 | 2;

export class GfLookTable {
  data = new Float32Array(GF_TW * 4);
  rows = 0;
  /** First colour texel (= the chain count). */
  oK = 0;
  nColors = 0;
  ds = LOOK_DS;
  ms = 0;
  /** Bumped when a build changes the data (the pass uploads on a change). */
  version = 0;
  private S = new Float64Array(0);
  private C = new Float64Array(0);
  private next = new Float32Array(0);
  private rgb = [0, 0, 0];

  /** Rebuild from the renderer's state; true when the data changed. */
  build(r: GfLookSource): boolean {
    const t0 = performance.now();
    const U = knotUniformValues();
    const D = r.kd;
    const nC = r.chainSamples.length;
    // the chains' s extents first: ds coarsens so every chain's colours fit LOOK_MAX
    let total = 0;
    const lens: number[] = [];
    for (let ch = 0; ch < nC; ch++) {
      const sm = r.chainSamples[ch];
      if (!sm || sm.count < 1 || !r.kcv[ch]) { lens.push(-1); continue; }
      const P = sm.positions; let acc = 0;
      for (let k = 1; k < sm.count; k++) {
        const dx = P[2 * k] - P[2 * k - 2]; const dy = P[2 * k + 1] - P[2 * k - 1];
        if (dx !== 0 || dy !== 0) acc += Math.hypot(dx, dy);
      }
      if (r.kcv[ch].closed && sm.count > 1) acc += Math.hypot(P[0] - P[2 * sm.count - 2], P[1] - P[2 * sm.count - 1]);
      lens.push(acc); total += acc;
    }
    let ds = LOOK_DS;
    const room = LOOK_MAX - 2 * nC - 1;
    if (total / ds + 2 * nC > room) ds = total / Math.max(1, room - 2 * nC);
    let nCol = 0;
    for (let ch = 0; ch < nC; ch++) if (lens[ch] >= 0) nCol += Math.floor(lens[ch] / ds) + 2;
    const texels = nC + nCol;
    const rows = Math.max(1, Math.ceil(texels / GF_TW));
    if (this.next.length < rows * GF_TW * 4) this.next = new Float32Array(rows * GF_TW * 4);
    const d = this.next;
    d.fill(0, 0, rows * GF_TW * 4);
    let off = 0;
    const rgb = this.rgb;
    for (let ch = 0; ch < nC; ch++) {
      const h = 4 * ch;
      if (lens[ch] < 0) { d[h] = 0; d[h + 1] = 0; d[h + 2] = 0; d[h + 3] = 1; continue; }
      const sm = r.chainSamples[ch]!; const c = r.kcv[ch]; const P = sm.positions; const count = sm.count;
      if (this.S.length < count + 1) { this.S = new Float64Array(2 * count + 2); this.C = new Float64Array(6 * count + 6); }
      const S = this.S; const Cs = this.C;
      // each sample's s and section colour (K1383's walk: the sample's arc, then its ctrl from this frame's arcs)
      const n = c.nCtrl;
      let slot = 0; let acc = 0;
      for (let k = 0; k < count; k++) {
        if (k > 0) {
          const dx = P[2 * k] - P[2 * k - 2]; const dy = P[2 * k + 1] - P[2 * k - 1];
          if (dx !== 0 || dy !== 0) acc += Math.hypot(dx, dy);
        }
        S[k] = acc;
        const a = kSampleArc(c, k);
        while (slot < n - 1 && kCA(D, c, slot + 1) <= a) slot++;
        const a0 = kCA(D, c, slot);
        const a1 = slot < n - 1 ? kCA(D, c, slot + 1) : c.total;
        const ctrl = slot + (a1 > a0 ? Math.min(1, (a - a0) / (a1 - a0)) : 0);
        knotSection(D, U, c, ctrl, rgb);
        Cs[3 * k] = rgb[0]; Cs[3 * k + 1] = rgb[1]; Cs[3 * k + 2] = rgb[2];
      }
      let cnt = count;
      if (c.closed && count > 1) {
        // the closing segment back to sample 0, which carries sample 0's colour
        S[count] = lens[ch]; Cs[3 * count] = Cs[0]; Cs[3 * count + 1] = Cs[1]; Cs[3 * count + 2] = Cs[2]; cnt = count + 1;
      }
      const nI = Math.floor(lens[ch] / ds) + 2;
      d[h] = off; d[h + 1] = nI; d[h + 2] = 0; d[h + 3] = ds;
      let k = 0;
      for (let i = 0; i < nI; i++) {
        const s = Math.min(i * ds, S[cnt - 1]);
        while (k < cnt - 2 && S[k + 1] <= s) k++;
        const k1 = Math.min(k + 1, cnt - 1);
        const span = S[k1] - S[k];
        const f = span > 0 ? Math.max(0, Math.min(1, (s - S[k]) / span)) : 0;
        const o = 4 * (nC + off + i);
        d[o] = Cs[3 * k] + (Cs[3 * k1] - Cs[3 * k]) * f;
        d[o + 1] = Cs[3 * k + 1] + (Cs[3 * k1 + 1] - Cs[3 * k + 1]) * f;
        d[o + 2] = Cs[3 * k + 2] + (Cs[3 * k1 + 2] - Cs[3 * k + 2]) * f;
        d[o + 3] = 1;
      }
      off += nI;
    }
    const len = rows * GF_TW * 4;
    let same = rows === this.rows && this.data.length >= len;
    if (same) for (let i = 0; i < len; i++) if (this.data[i] !== d[i]) { same = false; break; }
    if (!same) {
      if (this.data.length < len) this.data = new Float32Array(len);
      this.data.set(d.subarray(0, len));
      this.rows = rows;
      this.version++;
    }
    this.oK = nC;
    this.nColors = nCol;
    this.ds = ds;
    this.ms = performance.now() - t0;
    return !same;
  }
}

/** Today's crossing gap beyond the over thread's edge (world units): the casing's margin plus crossing_gaps' CUT_BIAS. */
export function lookGap(r: { style: { casingWidth: number; threadWidth: number } }): number {
  return Math.max(0, (r.style.casingWidth - r.style.threadWidth) / 2) + CUT_BIAS;
}

/** CPU twin of the look form's index (lkIdx): the colour index + 1 of chain c at s (0 = none). */
export function lookIndex(T: Pick<GfLookTable, "data">, c: number, s: number): number {
  const d = T.data; const h = 4 * c;
  const n = d[h + 1];
  if (n < 1) return 0;
  const i = Math.max(0, Math.min(n - 1, Math.floor((s - d[h + 2]) / d[h + 3] + 0.5)));
  return d[h] + i + 1;
}

// the look's globals (after layers()' own; MAXS is defined by then)
const G_ANCHOR = "int labC; float labS; int cWk; int cWa; int cWb; float cCov;\n";
const G_LOOK = `// K1389 s1: the label's piece (-1: a corner, whose s rides lkS) and key, as each site sets labC; the best
// configuration's copies; the output colour index
int lkJ; float lkS; float lkK; int lkJb; float lkSb; float lkKb; float lkIo;
int lkj[MAXS]; float lks[MAXS];
`;
const M_ANCHOR = "\nvoid main() {\n";
const M_LOOK = `
uniform highp sampler2D uLk; uniform float uLkG;
vec4 LKT(int i) { return texelFetch(uLk, ivec2(i & TWM, i >> LOG), 0); }
#ifdef PLH
#define LKLO(j) PLO(j)
#define LKHI(j) PHI(j)
#else
#define LKLO(j) plo[j]
#define LKHI(j) phi[j]
#endif
// K1389 s1: the label piece's s at p (the scan's arithmetic over the piece's segments)
float lookS(int j, vec2 p) {
  int c = PC(j); vec4 C0 = F(uOCh + 3 * c); int cV0 = int(C0.x); int nseg = int(C0.y) - 1; bool closed = C0.z > 0.5;
  int lo = LKLO(j); int hi = LKHI(j);
  float bd = BIG; float bs = 0.0;
  for (int q = lo; q <= hi; q++) {
    int v = cV0 + (closed ? pmod(q, nseg) : q);
    vec4 A = F(uOV + v); vec4 B = F(uOV + v + 1);
    float dx = B.x - A.x; float dy = B.y - A.y; float l2 = dx * dx + dy * dy;
    float u = l2 > 0.0 ? clamp(((p.x - A.x) * dx + (p.y - A.y) * dy) / l2, 0.0, 1.0) : 0.0;
    float ex = p.x - A.x - dx * u; float ey = p.y - A.y - dy * u; float d2 = ex * ex + ey * ey;
    if (d2 < bd) { bd = d2; bs = A.z + u * (B.z - A.z); }
  }
  return bs;
}
// K1389 s1: the colour texel index + 1 of chain c at s (gf_look.ts lookIndex)
float lkIdx(int c, float s) {
  vec4 H = LKT(c);
  if (H.y < 1.0) return 0.0;
  return H.x + clamp(floor((s - H.z) / H.w + 0.5), 0.0, H.y - 1.0) + 1.0;
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
  // the output: the gap cut and the index
  ["    oInk = min(1.0, ink); oCov = min(1.0, cov);",
    "    lkIo = 0.0;\n    if (lab >= 0) { lkIo = lkIdx(lab, lkJb >= 0 ? lookS(lkJb, p) : lkSb); float lkg = lkKb < BIG ? lkGap(lkKb) : 0.0; ink *= 1.0 - lkg; cov *= 1.0 - lkg; }\n    oInk = min(1.0, ink); oCov = min(1.0, cov);", 1],
  ["  o0 = vec4(oInk, oCov, 0.0, 1.0);", "  o0 = vec4(oInk, oCov, floor(lkIo / 256.0) / 255.0, mod(lkIo, 256.0) / 255.0);", 1],
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
  for (const must of ["lkJb = lkJ;", "lkIo = 0.0;", "floor(lkIo / 256.0)"]) if (!out.includes(must)) throw new Error(`gf look: ${must} missing`);
  return out;
}

// The look's composite: the pass's (ink, coverage, index) target over the canvas, premultiplied.
export const LOOK_COMP_FS = `#version 300 es
precision highp float;
uniform sampler2D uC;
uniform highp sampler2D uLk;
uniform int uLkO;
uniform int uLook;
uniform vec4 uBd;
uniform vec3 uFill;
out vec4 o;
const int TWM = ${GF_TW - 1}; const int LOG = ${Math.log2(GF_TW)};
int idxAt(vec4 c) { return int(c.z * 255.0 + 0.5) * 256 + int(c.w * 255.0 + 0.5); }
void main() {
  ivec2 q = ivec2(gl_FragCoord.xy);
  vec4 c = texelFetch(uC, q, 0);
  float ink = c.x; float cov = c.y;
  if (!(ink > 0.0) && !(cov > 0.0)) { o = vec4(0.0); return; }
  int idx = idxAt(c);
  if (idx == 0) {
    // the fringe outside h has no label: its nearest labelled neighbour's
    ivec2 sz = textureSize(uC, 0); float bd = 1e9;
    for (int dy = -2; dy <= 2; dy++) for (int dx = -2; dx <= 2; dx++) {
      ivec2 r = clamp(q + ivec2(dx, dy), ivec2(0), sz - 1);
      int j = idxAt(texelFetch(uC, r, 0));
      float dd = float(dx * dx + dy * dy);
      if (j > 0 && dd < bd) { bd = dd; idx = j; }
    }
  }
  vec3 C = uFill;
  if (idx > 0) { int t = uLkO + idx; C = texelFetch(uLk, ivec2(t & TWM, t >> LOG), 0).rgb; }
  vec3 S = mix(mix(C * 0.30, vec3(0.09, 0.085, 0.08), 0.5), uBd.rgb, uBd.w);
  if (uLook == 0) o = vec4(C * cov, cov);
  else if (uLook == 1) o = vec4(S * ink, ink);
  else { float a = ink + (1.0 - ink) * cov; o = vec4(S * (0.9 * ink) + C * (a - 0.9 * ink), a); }
}`;
