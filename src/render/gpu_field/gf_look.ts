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
 * under thread's backdrop gap beyond the over thread's edge, crossing_gaps.ts's margin). K1398: the cut ramps
 * over today's fade (fadeLength; gap_mask.ts's keep over fadeP) instead of one pixel. K1415: the ramp width
 * is fadeP at the pixel (fade * max(sin, 0.2) between the two threads' tangents at their feet, one-pixel
 * floor), not the full fadeLength. K1417: the gap clears to the background in every look (no casing band is painted: today draws only its faint continuous outline there; see LOOK_COMP_FS).
 *
 * THE COMPOSITE (LOOK_COMP_FS): fill = the section colour over the coverage (no outline); border = the stroke over
 * the ink band (the interior clear); both = the stroke mixed 0.9 over the ink band. The stroke is ribbon_shader's:
 * mix(section * 0.30, (0.09, 0.085, 0.08), 0.5), or the border colour when one is set. A pixel with coverage but
 * no label (the antialiased fringe outside h) takes its nearest labelled neighbour's colour.
 * K1405: the label's colour is mixed toward gold (uGold) by its baked paint amount (lkPaint over uPt, GfPaintTable below).
 * K1414 part 2 (24C): the same site then brightens by the label's pulse field (lkPulse over uDyn, GfDynTable:
 * paint_glsl kPulseCrest over the reduced clocks) toward the pulse colour, and mixes toward the telegraph
 * colour by its rims (lkTele, shaped across by the foot's distance over uH), in ribbon_shader's order.
 */
import { kArcOfCtrl, kArcU, kCA, kWrap, knotSection, type KChain, type KData } from "../paint_math";
import { PAINT_CONST, PULSE_RIDGE_FADE } from "../paint_const";
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

/**
 * K1405: the gold traveled path under the look. GfPaintTable bakes the fabric's paint declaration
 * (RibbonRenderer.setPaint's traveled spans and junction caps - walked gold, and in trail mode
 * trail_paint's fading spans, which arrive as the same spans) to one gold amount per kept sample,
 * in GfLookTable.positions' layout (same chains, same duplicate compaction, same end pad), from
 * paint_math kPaintAt's SPAN/CAP rules at zero pixel ramp (spans assign in declaration order,
 * caps never darken, in goldUOf's order). Pulse arms, the hover rim and the telegraph are not
 * baked: they animate off uniforms today's shader reads per frame. gf_app snapshots the values
 * with each tables build (they follow the samples' arcs, like the look positions) and re-snapshots
 * when paintKey moves, so a walk's gold lands the frame the declaration changes.
 */
export interface GfPaintSpan { chain: number; c0: number; c1: number; p0?: number; p1?: number }
export interface GfPaintCap { chain: number; ctrl: number; radius: number; p?: number }
export interface GfPaintSource extends GfLookSource {
  paintSpans: readonly GfPaintSpan[];
  paintCaps: readonly GfPaintCap[];
}

// paint_math's goldUOf and ringDist, mirrored (ordering only, as there).
function paintGoldU(p: number): number {
  return p >= 1 ? 121 / 256 : p <= 0 ? 115 / 256 : (115 + 6 * p) / 256;
}
function paintRingDist(a: number, b: number, total: number, closed: boolean): number {
  let d = Math.abs(a - b);
  if (closed) d = Math.min(d, total - d);
  return d;
}

/** A hash of the paint declaration the table bakes (spans, then caps, in declaration order). */
export function paintKey(r: { paintSpans: readonly GfPaintSpan[]; paintCaps: readonly GfPaintCap[] }): number {
  let h = 2166136261;
  const mix = (v: number): void => { keyF[0] = v; h = Math.imul(h ^ keyU[0], 16777619); };
  mix(r.paintSpans.length); mix(r.paintCaps.length);
  for (const s of r.paintSpans) { mix(s.chain); mix(s.c0); mix(s.c1); mix(s.p0 ?? 1); mix(s.p1 ?? 1); }
  for (const c of r.paintCaps) { mix(c.chain); mix(c.ctrl); mix(c.radius); mix(c.p ?? 1); }
  return h >>> 0;
}

/** Chain c's baked gold at segment k and fraction u (the GLSL lkPaint's twin; paintPAt in tests). */
export function paintPAt(V: ArrayLike<number>, b: number, n: number, closed: boolean, k: number, u: number): number {
  const last = closed ? n : n - 1;
  if (k < 0) { k = 0; u = 0; }
  if (k >= last) { k = last; u = 0; }
  const A = V[b + k];
  const B = V[b + Math.min(k + 1, last)];
  return A + (B - A) * u;
}

export class GfPaintTable {
  /** The baked entries (samples, plus one a closed chain), in positions()' layout. */
  nPos = 0;
  ms = 0;
  private tmp = new Float32Array(0);

  /** Each kept sample's gold amount from the declaration, in GfLookTable.positions' layout. */
  values(r: GfPaintSource, out?: Float32Array): Float32Array {
    const t0 = performance.now();
    const D = r.kd;
    const G = D.geom;
    const nC = r.chainSamples.length;
    const spans: GfPaintSpan[][] = Array.from({ length: nC }, () => []);
    const caps: GfPaintCap[][] = Array.from({ length: nC }, () => []);
    for (const s of r.paintSpans) if (s.chain >= 0 && s.chain < nC) spans[s.chain].push(s);
    for (const c of r.paintCaps) if (c.chain >= 0 && c.chain < nC) caps[c.chain].push(c);
    let nPos = 0;
    for (let ch = 0; ch < nC; ch++) if (lookValid(r, ch)) nPos += r.chainSamples[ch]!.count + (r.kcv[ch].closed ? 1 : 0);
    const len = Math.max(1, Math.ceil(nPos / GF_TW)) * GF_TW;
    const V = out && out.length >= len ? out : new Float32Array(len);
    V.fill(0, 0, len);
    let pb = 0;
    for (let ch = 0; ch < nC; ch++) {
      if (!lookValid(r, ch)) continue;
      const c = r.kcv[ch];
      const count = r.chainSamples[ch]!.count;
      const total = G[c.geom * 4];
      const arcPer = G[c.geom * 4 + 1];
      if (this.tmp.length < count) this.tmp = new Float32Array(count);
      const tmp = this.tmp;
      const ss = spans[ch];
      const cc = caps[ch];
      for (let k = 0; k < count; k++) {
        const arc = k * arcPer;
        let p = 0;
        for (const s of ss) {
          const a0 = kArcOfCtrl(D, c, s.c0);
          const a1 = kArcOfCtrl(D, c, s.c1);
          const wraps = c.closed && a1 <= a0 && s.c1 > s.c0;
          const inside = wraps ? arc >= a0 || arc <= a1 : arc >= a0 && arc <= a1;
          if (!inside) continue;
          const p0 = s.p0 ?? 1;
          const p1 = s.p1 ?? 1;
          if (p0 < 1 || p1 < 1) {
            const spanLen = Math.max(wraps ? total - a0 + a1 : a1 - a0, 1e-9);
            const da = wraps && arc < a0 ? total - a0 + arc : arc - a0;
            const t = Math.min(1, Math.max(0, da / spanLen));
            p = p0 + (p1 - p0) * t;
          } else p = 1;
        }
        for (const cap of cc) {
          const pc = cap.p ?? 1;
          if (!(paintGoldU(pc) > paintGoldU(p))) continue;
          const d = paintRingDist(arc, kArcOfCtrl(D, c, cap.ctrl), total, c.closed);
          if (d <= cap.radius) p = pc;
        }
        tmp[k] = p;
      }
      // compact to the kept samples and pad the tail, exactly as positions() does
      const xy = r.chainSamples[ch]!.positions;
      let kv = 0;
      let l = -1;
      for (let k = 0; k < count; k++) {
        if (l >= 0 && xy[2 * k] === xy[2 * l] && xy[2 * k + 1] === xy[2 * l + 1]) continue;
        V[pb + kv++] = tmp[k];
        l = k;
      }
      if (c.closed && kv > 1 && xy[2 * l] === xy[0] && xy[2 * l + 1] === xy[1]) kv--;
      const end = count + (c.closed ? 1 : 0);
      const pad = c.closed ? V[pb] : V[pb + kv - 1];
      for (let k = kv; k < end; k++) V[pb + k] = pad;
      pb += end;
    }
    this.nPos = nPos;
    this.ms = performance.now() - t0;
    return V;
  }
}

/**
 * K1414 part 2 (24C): the pulses and the telegraph under the look. Their geometry is baked per kept
 * sample in the look positions' layout (three RGBA texels a sample, GfDynTable); the animated clocks
 * (paint_glsl kPulseCrest's uniforms, the telegraph's strength and riding spot) stay uniforms, so the
 * gf shader evaluates the trains per pixel exactly as paint_math kPaintAt does at the label's foot.
 * Texel 0 (pulse): (gA, gB, flags, endWin) - gA = dist0 + d along the arm, gB a two-ended arm's far
 * field, flags 1 inward / 2 hovered / 4 two / 8 inwardB / 16 present, endWin the far-end window.
 * Texels 1-2 (telegraph): (u, u0, u1, alpha), (gap0, gap1, fade0, fade1) in unwrapped arc; a negative
 * fade marks the end that rides uTeleAtU (gf_app reduces the spot's ctrl to this frame's arc).
 */
export interface GfPulseArm { chain: number; cJunction: number; cFar: number; inward: boolean; hovered: boolean; dist0?: number; cont?: boolean; two?: boolean; dB?: number; inwardB?: boolean }
export interface GfTelePiece { chain: number; c0: number; c1: number; alpha: number; j0: boolean; j1: boolean; ride?: 0 | 1 }
export interface GfDynSource extends GfPaintSource {
  paintPulses: readonly GfPulseArm[];
  paintTele: readonly GfTelePiece[] | null;
  /** paint_state rimGap(): the junction web's reach a telegraph junction end skips. */
  teleGap: number;
}
// paint_state.ts's telegraph end fades (world arc); a junction end's fade past the web's reach.
const TELE_JUNCTION_FADE = 0.2;
const TELE_MID_FADE = 0.3;

const dynSmooth = (x: number): number => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

/** A hash of the pulse/telegraph declaration the dyn table bakes (declaration order). */
export function dynKey(r: { paintPulses: readonly GfPulseArm[]; paintTele: readonly GfTelePiece[] | null; teleGap: number }): number {
  let h = 2166136261;
  const mix = (v: number): void => { keyF[0] = v; h = Math.imul(h ^ keyU[0], 16777619); };
  mix(r.paintPulses.length); mix(r.paintTele?.length ?? -1); mix(r.teleGap);
  for (const p of r.paintPulses) { mix(p.chain); mix(p.cJunction); mix(p.cFar); mix(p.dist0 ?? 0); mix(p.dB ?? 0); mix((p.inward ? 1 : 0) | (p.hovered ? 2 : 0) | (p.cont ? 4 : 0) | (p.two ? 8 : 0) | (p.inwardB ? 16 : 0)); }
  for (const t of r.paintTele ?? []) { mix(t.chain); mix(t.c0); mix(t.c1); mix(t.alpha); mix((t.j0 ? 1 : 0) | (t.j1 ? 2 : 0) | ((t.ride ?? -1) + 1) * 4); }
  return h >>> 0;
}

/** The pulse clocks reduced to numbers (paint_model knotUniformValues: uKPulse, uKReach, uKPaint.w, uKHead). */
export interface DynUniforms { travelIn: number; travelOut: number; spacing: number; fadeIn: number; reach: number; reachFade: number; hoverBreath: number; head: number }

/** CPU twin of the look shader's lkCrest (paint_math kPulseCrest, the non-prototype look). */
export function dynPulseCrest(dG: number, inward: boolean, hovered: boolean, endWin: number, bumpK: number, U: DynUniforms): number {
  const C = PAINT_CONST;
  const f = Math.max(U.reachFade, 1e-4);
  const reachWin = 1 - dynSmooth((dG - (U.reach - f)) / f);
  if (hovered) return endWin * U.hoverBreath * reachWin;
  const s = U.spacing;
  const raw = inward ? dG + U.travelIn : dG - U.travelOut;
  const ph = raw - s * Math.floor(raw / s);
  const dist = Math.min(ph, s - ph);
  const dC = Math.max(0, dG - (ph <= s - ph ? ph : ph - s));
  const bump = Math.max(0, 1 - dist / C.CREST_WIDTH) * (U.head > 0.5 ? 1 : Math.min(1, dC / C.CREST_RAMP)) * bumpK;
  const fl = (C.PULSE_FLOOR + C.PULSE_CORE_BOOST * Math.max(0, 1 - dG / C.PULSE_CORE_RADIUS)) * Math.max(0, 1 - dG / C.PULSE_FLOOR_REACH);
  return Math.min(1, (fl + bump * 0.9) * endWin) * U.fadeIn * reachWin;
}

/** CPU twin of the look shader's lkPulse over one baked pulse texel (gA, gB, flags, endWin). */
export function dynPulseV(gA: number, gB: number, flags: number, endWin: number, U: DynUniforms): number {
  if (!(flags & 16)) return 0;
  const inward = (flags & 1) !== 0;
  const hovered = (flags & 2) !== 0;
  let v: number;
  if (flags & 4) {
    const bK = Math.min(1, Math.abs(gA - gB) * (0.5 / PULSE_RIDGE_FADE));
    v = gA <= gB ? dynPulseCrest(gA, inward, hovered, 1, bK, U) : dynPulseCrest(gB, (flags & 8) !== 0, hovered, 1, bK, U);
  } else v = dynPulseCrest(gA, inward, hovered, endWin, 1, U);
  return v > PAINT_CONST.PULSE_MIN_V ? v : 0;
}

/** CPU twin of the look shader's lkTele over the baked telegraph texels; atU = the riding end's arc. */
export function dynTeleG(u: number, u0: number, u1: number, alpha: number, gap0: number, gap1: number, fade0: number, fade1: number, atU: number): number {
  const e0 = fade0 < 0 ? atU : u0;
  const e1 = fade1 < 0 ? atU : u1;
  if (!(alpha > 0) || u < e0 || u > e1) return 0;
  const hl = 0.5 * (e1 - e0);
  const f0 = Math.min(Math.max(PAINT_CONST.RIM_END_SHARE * (hl - gap0), 1e-4), Math.max(Math.abs(fade0), 1e-4));
  const f1 = Math.min(Math.max(PAINT_CONST.RIM_END_SHARE * (hl - gap1), 1e-4), Math.max(Math.abs(fade1), 1e-4));
  return alpha * Math.min(dynSmooth((u - e0 - gap0) / f0), dynSmooth((e1 - u - gap1) / f1));
}

export class GfDynTable {
  /** The baked entries (samples, plus one a closed chain), in positions()' layout. */
  nPos = 0;
  ms = 0;
  /** The riding telegraph piece's chain and frame (gf_app turns its spot ctrl into an arc); -1 = none. */
  rideChain = -1;
  rideA0 = 0;
  rideTotal = 0;
  rideClosed = false;
  private tmp = new Float32Array(0);

  /** Each kept sample's pulse + telegraph geometry (3 RGBA texels a sample), in GfLookTable.positions' layout. */
  values(r: GfDynSource, out?: Float32Array): Float32Array {
    const t0 = performance.now();
    const D = r.kd;
    const G = D.geom;
    const nC = r.chainSamples.length;
    const pulses: GfPulseArm[][] = Array.from({ length: nC }, () => []);
    const tele: GfTelePiece[][] = Array.from({ length: nC }, () => []);
    for (const p of r.paintPulses) if (p.chain >= 0 && p.chain < nC) pulses[p.chain].push(p);
    for (const t of r.paintTele ?? []) if (t.chain >= 0 && t.chain < nC) tele[t.chain].push(t);
    this.rideChain = -1;
    for (const t of r.paintTele ?? []) {
      if (t.ride === undefined || t.chain < 0 || t.chain >= nC || !lookValid(r, t.chain)) continue;
      const c = r.kcv[t.chain];
      this.rideChain = t.chain;
      this.rideA0 = kArcU(D, c, t.c0);
      this.rideTotal = G[c.geom * 4];
      this.rideClosed = c.closed;
      break;
    }
    let nPos = 0;
    for (let ch = 0; ch < nC; ch++) if (lookValid(r, ch)) nPos += r.chainSamples[ch]!.count + (r.kcv[ch].closed ? 1 : 0);
    const rows = Math.max(1, Math.ceil((nPos * 3) / GF_TW));
    const len = rows * GF_TW * 4;
    const V = out && out.length >= len ? out : new Float32Array(len);
    V.fill(0, 0, len);
    let pb = 0;
    for (let ch = 0; ch < nC; ch++) {
      if (!lookValid(r, ch)) continue;
      const c = r.kcv[ch];
      const count = r.chainSamples[ch]!.count;
      const total = G[c.geom * 4];
      const arcPer = G[c.geom * 4 + 1];
      if (this.tmp.length < count * 12) this.tmp = new Float32Array(count * 12);
      const tmp = this.tmp;
      tmp.fill(0, 0, count * 12);
      const pp = pulses[ch];
      const tt = tele[ch];
      const gap = r.teleGap;
      for (let k = 0; k < count; k++) {
        const arc = k * arcPer;
        const o = k * 12;
        // pulses: the last covering arm wins, as kPaintAt overwrites the band (paint_math PULSE)
        for (const p of pp) {
          const aJ = kArcOfCtrl(D, c, p.cJunction);
          const aF = kArcOfCtrl(D, c, p.cFar);
          let span: number;
          let d: number;
          if (c.closed) {
            const dirPos = p.cFar > p.cJunction;
            const uJ = kArcU(D, c, p.cJunction);
            const uF = kArcU(D, c, p.cFar);
            span = dirPos ? uF - uJ : uJ - uF;
            if (span <= 1e-6) continue;
            d = kWrap(dirPos ? arc - aJ : aJ - arc, total);
          } else {
            const dirPos = aF >= aJ;
            span = Math.abs(aF - aJ);
            if (span <= 1e-6) continue;
            d = dirPos ? arc - aJ : aJ - arc;
          }
          if (d < 0 || d > span) continue;
          const gA = (p.dist0 ?? 0) + d;
          tmp[o] = gA;
          tmp[o + 1] = p.two ? (p.dB ?? 0) + span - d : gA;
          tmp[o + 2] = (p.inward ? 1 : 0) | (p.hovered ? 2 : 0) | (p.two ? 4 : 0) | (p.two && p.inwardB ? 8 : 0) | 16;
          tmp[o + 3] = p.cont ? 1 : Math.min(1, Math.max(0, (span - d) / PAINT_CONST.PULSE_END_WINDOW));
        }
        // telegraph: the strongest piece at the sample wins, as kPaintAt takes the max (paint_math TELE)
        let bestG = -1;
        for (const t of tt) {
          if (!(t.c1 > t.c0)) continue;
          const a0 = kArcU(D, c, t.c0);
          const a1 = kArcU(D, c, t.c1);
          let u = arc;
          if (c.closed) u = a0 + kWrap(arc - a0, total);
          if (u < a0 || u > a1) continue;
          const gap0 = t.j0 ? gap : 0;
          const gap1 = t.j1 ? gap : 0;
          const f0s = t.ride === 0 ? -TELE_MID_FADE : t.j0 ? TELE_JUNCTION_FADE : TELE_MID_FADE;
          const f1s = t.ride === 1 ? -TELE_MID_FADE : t.j1 ? TELE_JUNCTION_FADE : TELE_MID_FADE;
          const g = dynTeleG(u, a0, a1, t.alpha, gap0, gap1, f0s, f1s, t.ride === 0 ? a0 : a1);
          if (g <= bestG) continue;
          bestG = g;
          tmp[o + 4] = u; tmp[o + 5] = a0; tmp[o + 6] = a1; tmp[o + 7] = t.alpha;
          tmp[o + 8] = gap0; tmp[o + 9] = gap1; tmp[o + 10] = f0s; tmp[o + 11] = f1s;
        }
      }
      // compact to the kept samples and pad the tail, exactly as positions() does
      const xy = r.chainSamples[ch]!.positions;
      let kv = 0;
      let l = -1;
      for (let k = 0; k < count; k++) {
        if (l >= 0 && xy[2 * k] === xy[2 * l] && xy[2 * k + 1] === xy[2 * l + 1]) continue;
        const so = (pb + kv) * 12;
        const ko = k * 12;
        for (let j = 0; j < 12; j++) V[so + j] = tmp[ko + j];
        kv++;
        l = k;
      }
      if (c.closed && kv > 1 && xy[2 * l] === xy[0] && xy[2 * l + 1] === xy[1]) kv--;
      const end = count + (c.closed ? 1 : 0);
      const po = (pb + (c.closed ? 0 : kv - 1)) * 12;
      for (let k = kv; k < end; k++) {
        const eo = (pb + k) * 12;
        for (let j = 0; j < 12; j++) V[eo + j] = V[po + j];
      }
      pb += end;
    }
    this.nPos = nPos;
    this.ms = performance.now() - t0;
    return V;
  }
}

/** Today's crossing gap beyond the over thread's edge (world units): the casing's margin plus crossing_gaps' CUT_BIAS. */
export function lookGap(r: { style: { casingWidth: number; threadWidth: number } }): number {
  return Math.max(0, (r.style.casingWidth - r.style.threadWidth) / 2) + CUT_BIAS;
}

/** K1398: today's under-thread fade length at a crossing (world units): the renderer's fadeLength, gap_mask.ts's fade. */
export function lookFade(r: { fadeLength: number }): number {
  return Math.max(0, r.fadeLength);
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
function lkF(v: number): string { const s = String(v); return /[.eE]/.test(s) ? s : s + ".0"; }
const M_LOOK = `
uniform highp sampler2D uLk; uniform highp sampler2D uLkP; uniform float uLkG; uniform float uLkF;
uniform highp sampler2D uPt; uniform vec3 uGold;
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
float PT(int i) { return texelFetch(uPt, ivec2(i & TWM, i >> LOG), 0).x; }
// K1405: chain c's gold amount at segment q (gf_look.ts paintPAt): the baked paint table, lerped
float lkPaint(int c, vec2 q) {
  vec4 H = LKT(c);
  if (H.z < 1.0) return 0.0;
  bool closed = H.w > 0.5;
  int k = int(q.x); float u = q.y;
  if (!closed && F(uOV + int(F(uOCh + 3 * c).x)).z < 0.0) k -= 1;
  int last = closed ? int(H.z) : int(H.z) - 1;
  if (k < 0) { k = 0; u = 0.0; }
  if (k >= last) { k = last; u = 0.0; }
  int b = int(H.y);
  return mix(PT(b + k), PT(b + min(k + 1, last)), u);
}
uniform highp sampler2D uDyn; uniform vec4 uKPulseU; uniform vec4 uKReachU; uniform vec3 uPulseCol; uniform vec4 uTeleU; uniform float uTeleAtU; uniform float uTeleScale; uniform float uPulseW;
vec4 DT(int i) { return texelFetch(uDyn, ivec2(i & TWM, i >> LOG), 0); }
float lkSmooth(float x) { return ss(0.0, 1.0, x); }
float lkReachWin(float d) { float f = max(uKReachU.y, 1e-4); return 1.0 - lkSmooth((d - (uKReachU.x - f)) / f); }
// paint_glsl kPulseCrestK (the non-prototype look), over the clocks gf_pass reduces to uniforms
float lkCrest(float dG, bool inward, bool hovered, float endWin, float bumpK) {
  if (hovered) return endWin * uKReachU.z * lkReachWin(dG);
  float s = uKPulseU.z; float raw = inward ? dG + uKPulseU.x : dG - uKPulseU.y;
  float ph = raw - s * floor(raw / s); float dist = min(ph, s - ph);
  float dC = max(0.0, dG - (ph <= s - ph ? ph : ph - s));
  float bump = max(0.0, 1.0 - dist / ${lkF(PAINT_CONST.CREST_WIDTH)}) * (uKReachU.w > 0.5 ? 1.0 : min(1.0, dC / ${lkF(PAINT_CONST.CREST_RAMP)})) * bumpK;
  float fl = (${lkF(PAINT_CONST.PULSE_FLOOR)} + ${lkF(PAINT_CONST.PULSE_CORE_BOOST)} * max(0.0, 1.0 - dG / ${lkF(PAINT_CONST.PULSE_CORE_RADIUS)})) * max(0.0, 1.0 - dG / ${lkF(PAINT_CONST.PULSE_FLOOR_REACH)});
  return min(1.0, (fl + bump * 0.9) * endWin) * uKPulseU.w * lkReachWin(dG);
}
// gf_look.ts GfDynTable at segment q (lkPaint's walk over the 3-texel groups)
vec4 lkDyn(int c, vec2 q, int sub) {
  vec4 H = LKT(c);
  if (H.z < 1.0) return vec4(0.0);
  bool closed = H.w > 0.5;
  int k = int(q.x); float u = q.y;
  if (!closed && F(uOV + int(F(uOCh + 3 * c).x)).z < 0.0) k -= 1;
  int last = closed ? int(H.z) : int(H.z) - 1;
  if (k < 0) { k = 0; u = 0.0; }
  if (k >= last) { k = last; u = 0.0; }
  int b = int(H.y);
  return mix(DT((b + k) * 3 + sub), DT((b + min(k + 1, last)) * 3 + sub), u);
}
float lkPulse(int c, vec2 q) {
  vec4 A = lkDyn(c, q, 0); int fl = int(A.z + 0.5);
  if (fl < 16) return 0.0;
  bool inw = (fl & 1) != 0; bool hov = (fl & 2) != 0; float v;
  if ((fl & 4) != 0) { float bK = min(1.0, abs(A.x - A.y) * ${lkF(0.5 / PULSE_RIDGE_FADE)}); v = A.x <= A.y ? lkCrest(A.x, inw, hov, 1.0, bK) : lkCrest(A.y, (fl & 8) != 0, hov, 1.0, bK); }
  else v = lkCrest(A.x, inw, hov, A.w, 1.0);
  return v > ${lkF(PAINT_CONST.PULSE_MIN_V)} ? v : 0.0;
}
float lkTele(int c, vec2 q) {
  vec4 T1 = lkDyn(c, q, 1); vec4 T2 = lkDyn(c, q, 2);
  if (!(T1.w > 0.0)) return 0.0;
  float u0 = T2.z < 0.0 ? uTeleAtU : T1.y; float u1 = T2.w < 0.0 ? uTeleAtU : T1.z; float u = T1.x;
  if (u < u0 || u > u1) return 0.0;
  float hl = 0.5 * (u1 - u0);
  float f0 = min(max(${lkF(PAINT_CONST.RIM_END_SHARE)} * (hl - T2.x), 1e-4), max(abs(T2.z), 1e-4));
  float f1 = min(max(${lkF(PAINT_CONST.RIM_END_SHARE)} * (hl - T2.y), 1e-4), max(abs(T2.w), 1e-4));
  return T1.w * min(lkSmooth((u - u0 - T2.x) / f0), lkSmooth((u1 - u - T2.y) / f1));
}
vec2 lkFoot(int c, vec2 q) { vec4 C0 = F(uOCh + 3 * c); int v = int(C0.x) + int(q.x); vec4 A = F(uOV + v); vec4 B = F(uOV + v + 1); return mix(A.xy, B.xy, q.y); }
float lkTeleAcross(float e) { return 1.0 - lkSmooth((1.0 - e) / ${lkF(PAINT_CONST.RIM_EDGE)} * uTeleScale); }
// K1389 s1: today's crossing gap: a piece above the label (key past zt) within h + gap of p, outside its own edge.
// K1398: the cut ramps over today's fade (uLkF = fadeLength, world units) instead of one pixel, so the
// under thread shades softly. K1415: the width is today's fadeP at p (gap_mask.ts's keep): fade scaled by
// max(sin, 0.2) between the under tangent at its foot (qU on chain cU) and the over piece's tangent at its
// foot, floored at one pixel (2 * uAA); the per-side junction-clearance scales (fadeScaleNeg/Pos) have no tables counterpart and stay 1. K1417: no casing band (the gap clears to the background in every look).
vec2 lkTan(int c, float q) {
  vec4 C0 = F(uOCh + 3 * c); int v = int(C0.x) + int(q);
  vec4 A = F(uOV + v); vec4 B = F(uOV + v + 1);
  vec2 t = B.xy - A.xy; float l = length(t);
  return l > 0.0 ? t / l : vec2(1.0, 0.0);
}
float lkGap(float key, vec2 p, vec2 qU, int cU) {
  float g = 0.0;
  vec2 tu = lkTan(cU, qU.x);
  for (int j = 0; j < np; j++) {
    if (!(pkey[j] > key + uZt)) continue;
    float inner = ss(uH - uAA, uH + uAA, pd[j]);
    vec2 to = lkTan(PC(j), lookQ(j, p).x);
    float sinT = abs(tu.x * to.y - tu.y * to.x);
    float fw = max(uLkF * max(sinT, 0.2), 2.0 * uAA);
    g = max(g, (1.0 - ss(uH + uLkG, uH + uLkG + fw, pd[j])) * inner);
    // K1417: no casing term (the composite clears the gap to the background in every look).
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
    "    lkCo = vec4(0.0);\n    if (lab >= 0) { vec2 lq = lkJb >= 0 ? lookQ(lkJb, p) : lookQs(lab, lkSb); lkCo = lkColour(lab, lq); lkCo.rgb = mix(lkCo.rgb, uGold, lkPaint(lab, lq)); float lke = clamp(length(p - lkFoot(lab, lq)) / uH, 0.0, 1.0); float lkv = lkPulse(lab, lq); if (lkv > 0.0) { if (uPulseW < 1.0) lkv *= clamp((uPulseW - lke) / max(3.0 * uAA / uH, 0.02) + 0.5, 0.0, 1.0); lkCo.rgb += (uPulseCol - lkCo.rgb) * (0.9315315315315316 * clamp(lkv, 0.0, 1.0)); } float lkt = lkTele(lab, lq); if (lkt > 0.0) lkCo.rgb += (uTeleU.rgb - lkCo.rgb) * clamp(lkt * lkTeleAcross(lke) * uTeleU.w, 0.0, 1.0); float lkg = lkKb < BIG ? lkGap(lkKb, p, lq, lab) : 0.0; ink *= 1.0 - lkg; cov *= 1.0 - lkg; }\n    oInk = min(1.0, ink); oCov = min(1.0, cov);", 1],
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
  for (const must of ["lkJb = lkJ;", "lkCo = vec4(0.0);\n", "lkPulse(lab, lq)", "lkTele(lab, lq)", "o0 = vec4(oInk, oCov, 0.0, 1.0); o1 = lkCo;", "layout(location = 1) out vec4 o1;", "ss(uW - max(3.0 * uAA, 0.02 * uH), uW, D)"]) if (!out.includes(must)) throw new Error(`gf look: ${must} missing`);
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
  // K1417: the crossing gap clears to the background in every look (no casing paint: today's border gap
  // is the background between its outlines). The border alpha strengthens form B's centre-sampled band
  // to today's area-averaged stroke (the pass target has no MSAA) and darkens S toward today's dark edge colour, so the faint continuous outline reads at today's darkness; fill and both keep the band and S as they are.
  if (uLook == 0) o = vec4(C * cov, cov);
  else if (uLook == 1) { vec3 Sb = mix(S, vec3(0.055, 0.07, 0.10), 0.85); float a = clamp((ink - 0.36) * 3.5, 0.0, 1.0); o = vec4(Sb * a, a); }
  else { float a = ink + (1.0 - ink) * cov; o = vec4(S * (0.9 * ink) + C * (a - 0.9 * ink), a); }
}`;
