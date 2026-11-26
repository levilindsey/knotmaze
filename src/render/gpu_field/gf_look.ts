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
 * K1414 part 1 (24F): lkRim adds the hover rim (uRimA/B/C, uHov) along the rim run (paint_math kPaintAt RIM).
 * K1395 (24D): while the appearance reveal runs, the look draws over the reveal form and the site shades the
 * label by the baked FX (lkFx over uFx, GfFxTable: burn/roots tint, rainbow stripes, materialize alpha,
 * frontier glow; o0.z carries the border interior's solidity to LOOK_COMP_FS's uRvFx branch).
 * K1414 part 2 (24C): the same site then brightens by the label's pulse field (lkPulse over uDyn, GfDynTable:
 * paint_glsl kPulseCrest over the reduced clocks) toward the pulse colour, and mixes toward the telegraph
 * colour by its rims (lkTele, shaped across by the foot's distance over uH), in ribbon_shader's order.
 * K1396 (24E): the K76 thread reveal rides the same form (gf_explore.ts's table, unit 11): the segment scan
 * drops a hidden segment and a corner draws only under its gate flag (both in exAt's sites, live only while
 * uExLive is set), lkGap's cut scales by the over piece's visibility at its foot, and at the label the
 * visibility reshaped by the end look (lkExploreLook, explore_glsl.ts kExploreLook's port: the glow tint,
 * fray and dots/beacon shapes included) multiplies ink and coverage after the paint, pulses and FX. K1434: the label then takes the burn's char, ember and smolder (exBurnAt over the explore table's burn texels, lkCharLook/lkEmberLook; explore_glsl.ts kCharAt/kCharLook/kEmberLook's port), so a burnt thread darkens and glows under gf as under today's explore programs. K1423: lkGap's cut is windowed by the baked winM (GfGapTable, uGw), as today's gap shader windows it.
 * K1425: the label site also composes today's border indication over black (the gold, the pulse,
 * the unshaped telegraph, the rim; lookHi) into a third target o2 = (hiRgb, hiA), which the
 * composite's border branch draws in the cleared interior under the stroke; fill and both never
 * read it, so the fill look is unchanged. K1447: the pulse hi is gated by lkFanWin (no pulse
 * inside a junction fan, where today's fan fills dark).
 * K1414: lkRoute draws the K81 route bands over that (GfRouteTable polylines, uRt unit 13) and suppresses gold in a routed web outside its bands.
 * K1459 (26B): while the reveal runs, the interior solidity is cut at junctions by today's own two
 * cuts (fabric_sdf kJunctionCut / kJunctionSideCut, border look): the FX texel 1's free pair carries
 * each sample's per-side cut margins (world; lkJCut ramps them over one pixel), baked by GfFxTable
 * from the renderer's fused caps and junction side-cut entries. 25B windowed the fill by distance
 * to the nearest junction on every chain and deleted partly revealed runs; these margins are
 * today's cuts exactly (fused ends only, wedge-facing sides only), so a run today draws keeps its
 * stroke and only the fan's share of the interior goes.
 * K1500 (26K): lkMarker (uMkA/uMkB, gfMarkerUniforms) cuts piece labels by today's marker-disc gap
 * at the start/exit discs, its window clipped where a junction fan's flank covers the thread.
 */
import { kArcOfCtrl, kArcU, kBurnAge, kCA, kFxColor, kFxTail, kGlow, kIgnition, kSampleArc, kWall, kWrap, knotSection, type KChain, type KData, type KIgn } from "../paint_math";
import { PAINT_CONST, PULSE_RIDGE_FADE } from "../paint_const";
import { kStatic, knotUniformValues } from "../paint_model";
import { EXPLORE_ASH_ALPHA, EXPLORE_ASH_RGB, EXPLORE_CHAR_ALPHA, EXPLORE_CHAR_RGB, EXPLORE_DOT_AT, EXPLORE_DOT_R, EXPLORE_DOTS_SPAN, EXPLORE_EMBER_ALPHA, EXPLORE_EMBER_CORE_RGB, EXPLORE_EMBER_RGB } from "../explore_glsl";
import { kRimScale } from "../paint_math";
import { routeCorner, routeCubic } from "../junction_routes";
import { normArc, paintArcAt, sampleAtSafe } from "../ribbon/sampling";
import type { SplineSamples } from "../../geometry/spline_generator";
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
  // K1414: the arms of routed junctions ("chain:slot", paint_state's routedArms):
  // their caps are dropped, as writePaintItems drops them (the band decides).
  routedArms?: ReadonlySet<string>;
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
export function paintKey(r: { paintSpans: readonly GfPaintSpan[]; paintCaps: readonly GfPaintCap[]; routedArms?: ReadonlySet<string> }): number {
  let h = 2166136261;
  const mix = (v: number): void => { keyF[0] = v; h = Math.imul(h ^ keyU[0], 16777619); };
  mix(r.paintSpans.length); mix(r.paintCaps.length);
  for (const s of r.paintSpans) { mix(s.chain); mix(s.c0); mix(s.c1); mix(s.p0 ?? 1); mix(s.p1 ?? 1); }
  for (const c of r.paintCaps) { mix(c.chain); mix(c.ctrl); mix(c.radius); mix(c.p ?? 1); }
  if (r.routedArms) { mix(r.routedArms.size); for (const a of r.routedArms) { const i = a.indexOf(":"); mix(Number(a.slice(0, i))); mix(Number(a.slice(i + 1))); } }
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

/** A walk ctrl's particle slot on its chain (paint_state routeArmSlot): wrapped on closed chains, clamped on open ones. */
export function paintSlot(c: { nCtrl: number; closed: boolean }, ctrl: number): number {
  const len = c.nCtrl;
  if (!(len > 0)) return -1;
  const s = Math.round(ctrl);
  return c.closed ? ((s % len) + len) % len : Math.max(0, Math.min(len - 1, s));
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
      const routed = r.routedArms;
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
          // K1414: a routed junction's caps are dropped (writePaintItems); its band decides
          if (routed && routed.has(cap.chain + ":" + paintSlot(c, cap.ctrl))) continue;
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
 * K1423 (24G): today's crossing-gap WINDOW for gf. Today's shader (gap_mask.ts gapKeepAt) cuts the under
 * thread only inside a window marched along it (ribbon/crossing_gaps.ts marchUnder, perp look): the window
 * ends where the centreline distance clears both half-widths + margin + fade, or fade / max(sin, 0.2) of arc
 * past the all-lanes exit (the eye-wall limit), capped by the room to the neighbouring passes (a twist twin
 * at half the gap); at its end the fade dissolves over the last half fade of arc (the window-end ramp).
 * lkGap had no window, so along an eye wall (centreline distance inside the fade band for the whole wall)
 * it cut the under thread end to end (seed5 ci248: gf amount 0.02 at today's 0.5 pixel). This bake marches
 * the same window per crossing on the sample polylines and stores, per kept under sample in the look
 * positions' layout, winM: the signed arc distance to the nearest window end (positive inside), the max
 * over the chain's crossings - gapKeepAt's m for the slot whose window ends soonest, which is the slot
 * lkGap's cut at that foot belongs to wherever an over pass is inside its fade band. lkGap applies today's
 * inWin and window-end fs to its cut. Not baked: the junction-clearance scales and protect (the measured
 * slots carry scales of 1), and the joint's own window cap (the junction lane, K1407).
 */
export interface GapSamples { positions: ArrayLike<number>; count: number; closed: boolean; total: number; arcPer: number }
export interface GfGapCrossing { overChain: number; overCtrl: number; underChain: number; underCtrl: number }
export interface GfGapSource extends GfLookSource {
  crossings: readonly GfGapCrossing[];
  fillHalf: number; margin: number; fade: number;
  /** K1458: each chain's fused-joint ctrls (the renderer's junctionArcCtrls) and their clearance (crossing_gaps.ts jointClear): today's joint window cap. */
  joints?: ReadonlyMap<number, readonly { ctrl: number }[]>;
  jointClear?: number;
  /**
   * K1584 s3: gf's own joint geometry (gfJointArcs: per chain, the fractional field-vertex index of each joint corner's
   * tangent point). Given, a crossing side's joint room runs to the nearest of these (less GAP_EXIT_PAD in s3; to the
   * tangent point itself, per border, since K1584 s4) and to the
   * nearest joint ctrl less a fill half-width, instead of to the joint ctrl less jointClear (the ribbon renderer's fillet
   * reach, 1.72 on link A, which held 123 of its sides at the clearance scales' floors, the tiny gap, with the joint's
   * outline still far off).
   */
  jointArcs?: ReadonlyMap<number, readonly number[]>;
  /**
   * K1584 s4: each jointArcs point's side of its chain (gfJointArcs' lats: +1 left, -1 right, 0 both). Given, the room
   * is per BORDER: a corner on the left limits only the left border's gap (link A_4 t84e: one border's close corner
   * cut the other's full gap to the tiny one), and the joint flags give way to per-border scales.
   */
  jointLats?: ReadonlyMap<number, readonly number[]>;
  /**
   * K1584 s7: each jointArcs point's corner's other chain (gfJointArcs' partners, same order). Given, a crossing's slots
   * from its nearest PAIR corner on (the corner's chains are the crossing's under and over, where the border turns into
   * the fillet that joins the two) carry GAP_FAR_OFF: the outline's far term is off there (the corner rule, K1595 Q4).
   */
  jointPartners?: ReadonlyMap<number, readonly number[]>;
  /**
   * K1584 s11: each jointArcs point's corner is a WEDGE (gfJointArcs' wedges, same order: 1 for a tight turn opening under
   * GAP_WEDGE_THETA, the shader's open form, else 0). A wedge corner sets no border's room (its window room stays): the
   * wedge's border bakes the ordinary gap, so past the corner list's reach (lkBall's tw 0) the wedge runs on open into
   * the ordinary gap instead of the narrowed one (A_5 k176: chain 59's border kept 0.45/0 there, a dark foot 10-12 px out).
   */
  jointWedges?: ReadonlyMap<number, readonly number[]>;
  /** K1482 s15: whether chain c's kept sample k (a field vertex) belongs to a fused joint's surface (eval.ts member(): a group, ramp > 0). */
  overMember?: (c: number, k: number) => boolean;
}
// crossing_gaps.ts's march constants, kept by value here (MARCH_STEP, GAP_EXIT_PAD, the uCap floors/reach).
const GAP_MARCH_STEP = 0.07;
const GAP_EXIT_PAD = 0.05;
const GAP_FAR = 64; // winM far outside any window
// K1458: the over range searched around the crossing (gapWindow's R), and how far past a window end the bake still names its over pass
const GAP_OVER_RANGE = 3.4;
const GAP_SLOT_OUT = 0.3;
/** K1584 s4: past a border's own gap end (its first clearing of the over's fill, margin and fade), one march step and
 *  the exit pad more before its cut closes (the march finds the clearing up to a step late). */
const GAP_END_PAD = GAP_MARCH_STEP + GAP_EXIT_PAD;
/** K1584 s5: crossing gaps carve into junction outlines (each border's gap runs whole to its own end, past its joint
 *  room); false restores stage 4's room-bounded border gaps (A/B probes only: env GF_S4ROOM=1 in Node). */
const GAP_CARVE = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GF_S4ROOM !== "1";
const GAP_NOEND_ROOM = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GF_NOENDROOM === "1";
// K1584 s12: a rule-K border that clears the over's margin keeps a clean gap (gapWindow); env GF_S12=0 turns it off for A/Bs
const GAP_S12 = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GF_S12 !== "0";
/** K1584 s6: a ball (lkBall, ballScaleAt) scales the gap of its own chain's pixels whose foot lies within this much arc
 *  (world) of the corner's tangent point on that chain: past the ball's own reach, short of any other pass of the chain. */
export const GAP_BALL_ARC = 1.0;
/**
 * K1584 s10: the wedge's line (Levi, 2026-11-25, on stage 9's ranked ball sheets: balls #1 A_3 k63, #2 A_5 k176 and #3
 * A_6 k265 take the open wedge, #4 A_6 k331 on keep stage 8's). A tight turn whose opening angle (tables.ts kTheta,
 * packed as corner texel 5 .w = 1 + angle) is under this many radians opens its wedge (lkBall .y, ballOpenAt); every
 * tight turn still scales its gap by the distance from the ball's centre as stage 8 did. 45 degrees: k265 opens 44.87,
 * k331 45.18. (Stage 9 drew stage 5's gap past a line at 42.5; Levi wants stage 8's wedge on the loose side.)
 */
export const GAP_WEDGE_THETA = (45 * Math.PI) / 180;
/**
 * K1584 s10 (Levi: the tight wedge "should be wider at its outer side, where it leaves the ball: about the ordinary gap's
 * width there"): out to GAP_OPEN_FULL ball radii (fillet radius + W) from a tight wedge's centre, its own chain's gap
 * takes the ordinary border code (margin and fade 1; no closure, no far-off flag), blending back to the slot's own code
 * by GAP_OPEN_END radii (smoothstep). The s7 corner rule's narrow codes made stage 8's wedge a 1 px slit.
 */
export const GAP_OPEN_FULL = 2.0;
export const GAP_OPEN_END = 3.0;
/**
 * K1584 s7 corner rule: a bit above the right border code (codes stop at 1023), set on a slot whose outline far term is
 * off. x = over chain + (code + GAP_FAR_OFF) / 4096 keeps x's fraction under 0.5, so the chain still reads int(x + 0.5).
 */
export const GAP_FAR_OFF = 1024;
/**
 * K1584 s8: how far (world, both as a distance and as arc along the under) the over's tangent point of a pair corner
 * may lie from the under's to count as the same corner's, and be projected onto the under (its fillet start there).
 */
const GAP_FILLET_REACH = 1.5;

type BallCorners = { nK: number; kTight?: ArrayLike<number>; kTheta: ArrayLike<number>; kCa: ArrayLike<number>; kCb: ArrayLike<number>; kSa: ArrayLike<number>; kSb: ArrayLike<number>; kCx: ArrayLike<number>; kCy: ArrayLike<number>; kR: ArrayLike<number> };
/**
 * K1584 s6: lkBall's CPU twin (its .x). The scale on the gap's margin and fade at (px, py) for a pixel labelled (c, arc):
 * the least |p - centre| / (fillet radius + W) over the tight-turn corners (kTight) in `ks` (default: every corner) that
 * have c as a chain with arc within GAP_BALL_ARC of that chain's tangent point; 1 when none does. Every tight turn, at any
 * angle (K1584 s10: the loose side of the line draws stage 8's wedge again; the line picks the wedge's form, ballOpenAt).
 */
export function ballScaleAt(T: BallCorners, W: number, c: number, arc: number, px: number, py: number, ks?: Iterable<number>): number {
  return ballAt(T, W, c, arc, px, py, ks).s;
}
/**
 * K1584 s10: lkBall's .y twin, the open form's weight at (px, py): for a tight turn opening under GAP_WEDGE_THETA (the
 * packed float 1 + kTheta against fround(1 + line), as the shader reads it) that has c as a chain near its tangent point,
 * 1 - smoothstep(GAP_OPEN_FULL, GAP_OPEN_END, r) at r = |p - centre| / (fillet radius + W); the most over such turns, 0
 * when none. Where it is 1 lkGap draws the ordinary border code (no closure, no far-off flag); between, it blends.
 */
export function ballOpenAt(T: BallCorners, W: number, c: number, arc: number, px: number, py: number, ks?: Iterable<number>): number {
  return ballAt(T, W, c, arc, px, py, ks).open;
}
function ballAt(T: BallCorners, W: number, c: number, arc: number, px: number, py: number, ks?: Iterable<number>): { s: number; open: number } {
  let s = 1; let open = 0;
  if (!T.kTight) return { s, open };
  const list = ks ?? Array.from({ length: T.nK }, (_, k) => k);
  const line = Math.fround(1 + GAP_WEDGE_THETA);
  for (const k of list) {
    if (T.kTight[k] !== 1) continue;
    const onA = T.kCa[k] === c && Math.abs(arc - T.kSa[k]) < GAP_BALL_ARC;
    const onB = T.kCb[k] === c && Math.abs(arc - T.kSb[k]) < GAP_BALL_ARC;
    if (!onA && !onB) continue;
    const r = Math.sqrt((px - T.kCx[k]) ** 2 + (py - T.kCy[k]) ** 2) / Math.max(T.kR[k] + W, 1e-6);
    s = Math.min(s, r);
    if (Math.fround(1 + T.kTheta[k]) < line) {
      const u = clamp01((r - GAP_OPEN_FULL) / (GAP_OPEN_END - GAP_OPEN_FULL));
      open = Math.max(open, 1 - u * u * (3 - 2 * u));
    }
  }
  return { s: clamp01(s), open };
}

/** K1584 s6: lkCut's CPU twin (the window terms left out: inside a window, wm large): the cut at distance d from the over
 *  centreline for half-width h, gap margin and fade, the side's scales (scM, scF) and the ball's scale bs. */
export function gapCutAt(d: number, h: number, margin: number, fade: number, sinT: number, aa: number, scM: number, scF: number, bs: number): number {
  const pxw = 2 * aa;
  const inner = (() => { const t = clamp01((d - (h - aa)) / (2 * aa)); return t * t * (3 - 2 * t); })();
  const b = scM > 0 ? bs : 1;
  const fw = Math.max(fade * scF * b * Math.max(sinT, 0.2), pxw);
  const e = d - h - margin * scM * b;
  const k = clamp01((e + 0.5 * pxw) / Math.max(fw, pxw));
  return (1 - k * k * (3 - 2 * k)) * inner;
}

function gapPointAt(S: GapSamples, arc: number, o: { x: number; y: number }): void {
  const a = S.closed ? ((arc % S.total) + S.total) % S.total : Math.max(0, Math.min(S.total, arc));
  const fi = Math.max(0, Math.min(S.closed ? S.count : S.count - 1, a / S.arcPer));
  const i0 = Math.floor(fi) % S.count;
  const i1 = S.closed ? (i0 + 1) % S.count : Math.min(i0 + 1, S.count - 1);
  const u = fi - Math.floor(fi);
  const P = S.positions;
  o.x = P[i0 * 2] + (P[i1 * 2] - P[i0 * 2]) * u;
  o.y = P[i0 * 2 + 1] + (P[i1 * 2 + 1] - P[i0 * 2 + 1]) * u;
}

/**
 * One crossing's window along the under thread (marchUnder's perp branch on the sample polylines):
 * [winNeg, winPos] of arc from the under centre. capNeg/capPos bound the march (the caller's neighbour
 * caps); a side whose distance never clears runs to its cap, as the solve's does.
 */
export function gapWindow(su: GapSamples, so: GapSamples, uC: number, oC: number, fillHalf: number, margin: number, fade: number, capNeg: number, capPos: number, roomNeg = 1e6, roomPos = 1e6, oNeg = GAP_OVER_RANGE, oPos = GAP_OVER_RANGE, selfEx = 0, bRooms?: readonly number[], bPairs?: readonly number[]): number[] {
  // the over polyline's reach around the crossing (the march's caps stay inside it). K1460 s3: a self
  // crossing's over range stops at the split (today's oCapNeg / oCapPos), and a point within selfEx of
  // the under point's own arc is no over pass (today's polyDist exclusion): without both, the polyline
  // held the under pass itself, the distance never cleared and the window ran to its cap around a kink loop.
  const stepO = Math.max(1, Math.round(0.1 / so.arcPer)) * so.arcPer; // today's coarse march spacing
  const nO = Math.max(2, Math.round((oNeg + oPos) / stepO) + 1);
  const ox = new Float64Array(nO), oy = new Float64Array(nO), oa = new Float64Array(nO);
  const pt = { x: 0, y: 0 }, p0 = { x: 0, y: 0 }, p1 = { x: 0, y: 0 };
  for (let i = 0; i < nO; i++) { oa[i] = oC - oNeg + i * stepO; gapPointAt(so, oa[i], pt); ox[i] = pt.x; oy[i] = pt.y; }
  const per = so.closed ? so.total : 0;
  const near = (a: number, arcU: number): boolean => {
    let da = a - arcU;
    if (per > 0) da -= per * Math.floor(da / per + 0.5);
    return Math.abs(da) < selfEx;
  };
  // K1584 s4: with per-border rooms, each border's own distance to the over polyline (its point fillHalf off the
  // centreline, +1 left / -1 right of the under tangent): an oblique crossing's two borders clear the over at
  // different arcs, so each border's scales are measured on its own clearing
  const bD = [0, 0];
  const dAt = (arcU: number, wantB = false): { d: number; sin: number } => {
    gapPointAt(su, arcU, pt);
    gapPointAt(su, arcU - su.arcPer, p0); gapPointAt(su, arcU + su.arcPer, p1);
    let tux = p1.x - p0.x, tuy = p1.y - p0.y;
    const lu = Math.hypot(tux, tuy) || 1; tux /= lu; tuy /= lu;
    const lx = pt.x - tuy * fillHalf, ly = pt.y + tux * fillHalf, rx = pt.x + tuy * fillHalf, ry = pt.y - tux * fillHalf;
    let bd = Infinity, bi = 0, bl = Infinity, br = Infinity;
    for (let i = 0; i + 1 < nO; i++) {
      if (selfEx > 0 && (near(oa[i], arcU) || near(oa[i + 1], arcU))) continue;
      const ax = ox[i], ay = oy[i], dx = ox[i + 1] - ax, dy = oy[i + 1] - ay;
      const l2 = dx * dx + dy * dy;
      const u = l2 > 0 ? Math.max(0, Math.min(1, ((pt.x - ax) * dx + (pt.y - ay) * dy) / l2)) : 0;
      const ex = pt.x - ax - dx * u, ey = pt.y - ay - dy * u, d2 = ex * ex + ey * ey;
      if (d2 < bd) { bd = d2; bi = i; }
      if (wantB) {
        const ul = l2 > 0 ? Math.max(0, Math.min(1, ((lx - ax) * dx + (ly - ay) * dy) / l2)) : 0;
        const elx = lx - ax - dx * ul, ely = ly - ay - dy * ul;
        bl = Math.min(bl, elx * elx + ely * ely);
        const ur = l2 > 0 ? Math.max(0, Math.min(1, ((rx - ax) * dx + (ry - ay) * dy) / l2)) : 0;
        const erx = rx - ax - dx * ur, ery = ry - ay - dy * ur;
        br = Math.min(br, erx * erx + ery * ery);
      }
    }
    bD[0] = Math.sqrt(bl); bD[1] = Math.sqrt(br);
    const oi = Math.max(0, Math.min(nO - 2, bi));
    let tox = ox[oi + 1] - ox[oi], toy = oy[oi + 1] - oy[oi];
    const lo = Math.hypot(tox, toy) || 1; tox /= lo; toy /= lo;
    return { d: Math.sqrt(bd), sin: Math.abs(tux * toy - tuy * tox) };
  };
  // [winNeg, winPos, side scales (4), per-border scales (8), per-border cut ends (4: K1584 s4, 1e6 = none)]
  const sc6: number[] = [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1e6, 1e6, 1e6, 1e6];
  const march = (dir: number, cap: number, room: number): number => {
    const allD = 2 * fillHalf + margin, exitD = allD + fade;
    let all = Number.NaN, allSin = 1, win = Number.NaN, prevS = 0, prevD = Number.NaN, sil = Number.NaN, cut = Number.NaN;
    // K1584 s4: per border (left, right) when either border's room is near: where it clears the over's fill and its margin
    const rB = bRooms ? (dir > 0 ? [bRooms[2], bRooms[3]] : [bRooms[0], bRooms[1]]) : null;
    // K1584 s12: per border, the off of its pair corner (a joint corner with this crossing's over; the bake's pairB)
    const pB = bPairs ? (dir > 0 ? [bPairs[2], bPairs[3]] : [bPairs[0], bPairs[1]]) : null;
    const wantB = rB !== null && Math.min(rB[0], rB[1]) < 1e5;
    const silB = [Number.NaN, Number.NaN], cutB = [Number.NaN, Number.NaN], prevB = [Number.NaN, Number.NaN];
    // K1584 s4: where each border first clears the over's fill, margin and fade: the end of its own gap. Past it the
    // window may run on (the over, a joint member too, comes back within reach on the way into the joint: A_c j104,
    // or the over's end cap: A_c x111 by t48e); a cut there takes the joint's outline or leaves a sliver.
    const endB = [Number.NaN, Number.NaN];
    for (let s = 0; ; s += GAP_MARCH_STEP) {
      const sc = Math.min(s, cap);
      const { d, sin } = dAt(uC + dir * sc, wantB);
      const cross = (lvl: number): number => Number.isNaN(prevD) || d === prevD ? sc : prevS + (sc - prevS) * ((lvl - prevD) / (d - prevD));
      if (Number.isNaN(sil) && d >= fillHalf) sil = cross(fillHalf);
      if (Number.isNaN(cut) && d >= fillHalf + margin) cut = cross(fillHalf + margin);
      if (wantB) for (let b = 0; b < 2; b++) {
        const db = bD[b], pb = prevB[b];
        const crossB = (lvl: number): number => Number.isNaN(pb) || db === pb ? sc : prevS + (sc - prevS) * ((lvl - pb) / (db - pb));
        if (Number.isNaN(silB[b]) && db >= fillHalf) silB[b] = crossB(fillHalf);
        if (Number.isNaN(cutB[b]) && db >= fillHalf + margin) cutB[b] = crossB(fillHalf + margin);
        if (Number.isNaN(endB[b]) && db >= fillHalf + margin + fade) endB[b] = crossB(fillHalf + margin + fade);
        prevB[b] = db;
      }
      if (Number.isNaN(all) && d >= allD) { all = cross(allD); allSin = sin; }
      if (Number.isNaN(win) && d >= exitD) win = Math.min(cap, cross(exitD) + GAP_MARCH_STEP + GAP_EXIT_PAD);
      if (Number.isNaN(win) && !Number.isNaN(all) && sc >= all + fade / Math.max(allSin, 0.2) + GAP_MARCH_STEP) win = Math.min(cap, sc + GAP_EXIT_PAD);
      if (!Number.isNaN(win) || sc >= cap) break;
      prevD = d; prevS = sc;
    }
    const w = Number.isNaN(win) ? cap : win;
    // K1584 s4: each border's scales from its own room and clearing, with no floor: the gap shrinks to what fits before
    // the joint corner's tangent point on that border (where its outline turns into the joint's), and runs whole when
    // the room holds it. Nothing fits (the corner sits at the over's outline) gives 0, 0.
    // K1584 s5 (Levi: "we need to add support for having gaps carve into junctions"): a border's gap no longer yields
    // to its joint room. It keeps its full margin and fade and runs to its own end (endB), carving into the junction's
    // outline where the joint's corner sits at the over's edge. carveB keeps stage 4's room scales for A/Bs only.
    // K1584 s7 rule K (K1601, Levi on three loop tips: "an extra gap in the middle of a sharply turning border that isn't
    // actually at a crossing"): a border with no end of its own (it never clears the over's fill, margin and fade) whose
    // joint room lies past its own gap (its cut, else its fill exit, + fade + GAP_END_PAD) keeps stage 4's room scales and
    // stops at its room: past that room the border runs on round the loop's turn, which is no longer this crossing's.
    const keepK = [false, false];
    if (wantB && rB) for (let b = 0; b < 2; b++) {
      const rm = rB[b];
      if (!Number.isNaN(endB[b])) sc6[14 + (dir > 0 ? 2 : 0) + b] = endB[b];
      const g0 = Number.isNaN(cutB[b]) ? silB[b] : cutB[b];
      keepK[b] = GAP_CARVE && Number.isNaN(endB[b]) && rm < 1e5 && !Number.isNaN(g0) && rm >= g0 + fade + GAP_END_PAD;
      // K1584 s12 (Levi on A_3's small hook, k148): a rule-K border whose room is its PAIR corner (pB <= rm: a joint
      // corner with this crossing's over) and that clears the over's fill and margin (cutB) but never the fade's end
      // all the way to that room runs on beside the over into a joint with it; the room's scales left its fade
      // unfinished along the whole run (a gray smudge) and ended the cut square at the room (a dark triangle at the
      // joint). It keeps a clean gap instead: the full margin, no fade (a crisp cut on the level line, an angled end on
      // the over's outline), ending at its margin's edge. A border whose room is another corner (K1601's loop tips), or
      // that clears the fade before its room, keeps rule K.
      let clean = false;
      if (GAP_S12 && keepK[b] && !Number.isNaN(cutB[b]) && pB !== null && pB[b] <= rm) {
        clean = true;
        for (let s = cutB[b]; s <= rm && clean; s += GAP_MARCH_STEP) { dAt(uC + dir * Math.min(s, cap), true); if (bD[b] >= fillHalf + margin + fade) clean = false; }
      }
      if (clean) {
        const o = 6 + (dir > 0 ? 4 : 0) + 2 * b;
        sc6[o] = 1; sc6[o + 1] = 0;
        sc6[14 + (dir > 0 ? 2 : 0) + b] = cutB[b];
        continue;
      }
      // its end is the room (codeAt adds the pad back)
      if (keepK[b]) sc6[14 + (dir > 0 ? 2 : 0) + b] = Math.max(0, rm - GAP_END_PAD);
      if ((GAP_CARVE && !keepK[b]) || !(rm < 1e5)) continue;
      const ct = Math.min(Number.isNaN(cutB[b]) ? w : cutB[b], w), sl = Math.min(Number.isNaN(silB[b]) ? ct : silB[b], ct);
      const mArc = Math.max(ct - sl, 1e-6);
      const ms = Math.min(1, Math.max(0, (rm - sl) / mArc));
      const o = 6 + (dir > 0 ? 4 : 0) + 2 * b;
      sc6[o] = ms;
      sc6[o + 1] = fade > 0 ? Math.min(1, Math.max(0, (rm - (sl + mArc * ms)) / fade)) : 1;
    }
    // K1458: crossing_gaps.ts clearScales: near a fused joint the side's margin (floor 0.5) and then its fade
    // (floor 0.45) shrink by the shortfall only
    if (room < 1e5) {
      const ct = Math.min(Number.isNaN(cut) ? w : cut, w), sl = Math.min(Number.isNaN(sil) ? ct : sil, ct);
      const mArc = Math.max(ct - sl, 1e-6);
      const ms = Math.min(1, Math.max(0.5, (room - sl) / mArc));
      sc6[dir > 0 ? 4 : 2] = ms;
      if (fade > 0) sc6[dir > 0 ? 5 : 3] = Math.min(1, Math.max(0.45, (room - (sl + mArc * ms)) / fade));
    }
    // K1458: crossing_gaps.ts's K1218 S3 joint window cap (perp): once every lane is out, the window ends at the joint's room
    // K1476: the lanes never clear (two arms of one joint crossing just before it, then riding side by side
    // into it): there is no all-lanes exit to protect, and today's ribbon is handed to the fan inside the
    // joint's room, so the window ends at the room instead of running to its cap along the fan's arms.
    // K1584 s5: with per-border ends, a cleared window runs whole: each border's cut stops at its own end (endB), so the
    // room no longer caps it (the cap ended the far border's cut short of its gap, a closed side by a joint).
    if (GAP_CARVE && rB) {
      // K1584 s7 rule K: on a side with a rule-K border the window runs to the longest of those borders' rooms, the
      // other borders' own ends + GAP_END_PAD (a no-end border with a cut: w, as K1476 has it) and all + GAP_EXIT_PAD
      // (stage 5 stretched it to the cap, round the loop's turn); a side without one is untouched
      if (keepK[0] || keepK[1]) {
        let kw = 0, ke = Number.isNaN(all) ? 0 : all + GAP_EXIT_PAD;
        for (let b = 0; b < 2; b++) {
          if (keepK[b]) { kw = Math.max(kw, rB[b]); continue; }
          const r = !Number.isNaN(endB[b]) ? endB[b] + GAP_END_PAD : !Number.isNaN(cutB[b]) ? w : Number.NaN;
          if (!Number.isNaN(r)) ke = Math.max(ke, r);
        }
        return Math.min(w, Math.max(kw, ke));
      }
      if (!Number.isNaN(all)) return w;
      // K1476's case with a border that clears past the room (the centreline never clears within the cap: A_3 x166, x303,
      // x317, each beside a joint): the window runs to the last border's own end, each border's cut stopping at its own
      // end; a border with no end of its own keeps the room as its end (stage 4's window, no riding cut along the arm)
      // (a border that clears the over's fill and margin but not its fade within the cap reaches the cap: A_5 x127, x146)
      let e = Number.NaN;
      for (let b = 0; b < 2; b++) {
        const r = !Number.isNaN(endB[b]) ? endB[b] : !Number.isNaN(cutB[b]) ? w : Number.NaN;
        if (!Number.isNaN(r)) e = Number.isNaN(e) ? r : Math.max(e, r);
      }
      if (!Number.isNaN(e) && e + GAP_END_PAD > room) {
        if (GAP_NOEND_ROOM) for (let b = 0; b < 2; b++) if (Number.isNaN(endB[b])) sc6[14 + (dir > 0 ? 2 : 0) + b] = Math.max(0, room - GAP_END_PAD);
        return Math.min(w, e + GAP_END_PAD);
      }
    }
    return Number.isNaN(all) ? Math.min(w, room) : Math.min(w, Math.max(room, all + GAP_EXIT_PAD));
  };
  sc6[0] = march(-1, capNeg, roomNeg); sc6[1] = march(1, capPos, roomPos);
  return sc6;
}

/** K1482 s15: the joint flag's outline point, past the fill edge (scene units). */
const GAP_JOINT_OB = 0.04;
/** K1482 s15: the over arc around the crossing (each way) whose samples the joint flag reads. */
const GAP_JOINT_RA = 1.5;
/** K1584 s1: the under arc from a slot within which a member under sample keeps s18's flag on it. */
const GAP_JOINT_UA = 0.1;
/**
 * K1482 s15: the bake's joint flag for each slot a crossing wins (ks: the slots' under sample indices on su; km: the
 * over chain's kept index of each over sample). GfGapTable writes it into the slot's y fraction (over chain + 0.125 * bits) and lkGap reads it: per side
 * of the under thread (bit 1: left of its tangent at the slot, bit 2: right), whether the crossing's cut of that
 * side's OUTLINE takes stage 13's c1 reach (no margin, 0.3 of the fade). It does when, at the outline point beside
 * the slot's under sample (fillHalf + GAP_JOINT_OB off its centreline), the nearest over sample within GAP_JOINT_RA
 * of the crossing is a member of a fused joint's surface (mem: eval.ts member(), a group with ramp > 0) within the
 * cut's reach (fillHalf + margin + fade), and no non-member over sample lies within a fill half-width (s17: or the
 * side's outline point is nearer the member surface and within reach, on a run of slots holding a side so flagged). c1 decided
 * per piece at each pixel; deciding per slot side keeps its closed joint lines without its flip specks (link A: its
 * 15 better sites, no new speck; docs/design/K1482_s15_slot_flag.md, .claude/probes/K1482/out/s15).
 * s18 (un: the under chain and its kept indices): a side is also flagged when a member sample of the UNDER chain within
 * GAP_JOINT_RA (arc) of a slot lies within the cut's reach of its outline point: the crossing sits on an arm of a fused
 * joint, so the full cut's ending erased the arm's outline where it meets the joint's (link A j22/j88/t80s/t65s/t70s/t81s).
 */
export function gapJointFlags(mem: (c: number, k: number) => boolean, c: number, so: GapSamples, oC: number, km: ArrayLike<number>, ks: readonly number[], su: GapSamples, sc: { fh: number; mg: number; fd: number }, un?: { c: number; km: ArrayLike<number>; tight?: readonly boolean[] }): number[] {
  const out = new Array<number>(ks.length).fill(0);
  const pt = { x: 0, y: 0 };
  const mx: number[] = [], my: number[] = [], nx: number[] = [], ny: number[] = [];
  for (let q = Math.round((oC - GAP_JOINT_RA) / so.arcPer); q <= Math.round((oC + GAP_JOINT_RA) / so.arcPer); q++) {
    let k = q;
    if (so.closed) k = ((k % so.count) + so.count) % so.count; else if (k < 0 || k >= so.count) continue;
    gapPointAt(so, k * so.arcPer, pt);
    if (mem(c, km[k])) { mx.push(pt.x); my.push(pt.y); } else { nx.push(pt.x); ny.push(pt.y); }
  }
  const ux: number[] = [], uy: number[] = [], um = new Set<number>();
  if (un) {
    const R = Math.round(GAP_JOINT_RA / su.arcPer), seen = new Set<number>();
    for (const k0 of ks) for (let q = k0 - R; q <= k0 + R; q++) {
      let k = q;
      if (su.closed) k = ((k % su.count) + su.count) % su.count; else if (k < 0 || k >= su.count) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      if (mem(un.c, un.km[k])) { ux.push(su.positions[2 * k]); uy.push(su.positions[2 * k + 1]); um.add(k); }
    }
  }
  if (!mx.length && !ux.length) return out;
  const reach2 = (sc.fh + sc.mg + sc.fd) ** 2, off = sc.fh + GAP_JOINT_OB, nn2 = sc.fh * sc.fh, uxy = su.positions;
  const last = su.count - 1;
  const near = new Array<number>(ks.length).fill(0), RU = Math.round(GAP_JOINT_UA / su.arcPer);
  for (let i = 0; i < ks.length; i++) {
    const k = ks[i];
    const ka = su.closed ? (k + last) % su.count : Math.max(0, k - 1), kb = su.closed ? (k + 1) % su.count : Math.min(last, k + 1);
    let tx = uxy[2 * kb] - uxy[2 * ka], ty = uxy[2 * kb + 1] - uxy[2 * ka + 1];
    const tl = Math.sqrt(tx * tx + ty * ty) || 1; tx /= tl; ty /= tl;
    let bits = 0, nb = 0;
    // K1584 s1: s18's under rule holds only on slots at the joint itself (a member under sample within GAP_JOINT_UA of
    // arc). It used to hold on every slot within the cut's reach of a member sample, which took the gap from the
    // crossing's own exit too wherever a joint lay within about 1 of it (link A: 263 of its 1,400 border exits).
    // K1584 s3: and not on a slot inside its side's joint room when that side has room for the full gap (un.tight false:
    // the crossing's own exit, whose full gap ends before the joint's outline starts); slots past the room keep it.
    let uNear = false;
    if (!un?.tight || un.tight[i]) for (let q = k - RU; q <= k + RU && !uNear; q++) uNear = um.has(su.closed ? ((q % su.count) + su.count) % su.count : q);
    for (const [sd, bit] of [[1, 1], [-1, 2]] as const) {
      const qx = uxy[2 * k] - sd * ty * off, qy = uxy[2 * k + 1] + sd * tx * off; // the left normal is (-ty, tx)
      let dM = Infinity, dN = Infinity;
      for (let m = 0; m < mx.length; m++) { const dx = mx[m] - qx, dy = my[m] - qy; dM = Math.min(dM, dx * dx + dy * dy); }
      for (let m = 0; m < nx.length; m++) { const dx = nx[m] - qx, dy = ny[m] - qy; dN = Math.min(dN, dx * dx + dy * dy); }
      if (dM < reach2 && dM <= dN) { nb |= bit; if (dN >= nn2) bits |= bit; }
      if (uNear) for (let m = 0; m < ux.length; m++) { const dx = ux[m] - qx, dy = uy[m] - qy; if (dx * dx + dy * dy < reach2) { bits |= bit; break; } }
    }
    out[i] = bits; near[i] = nb;
  }
  // K1482 s17: a side's flag spreads along the slots, both ways, while its outline point stays nearer the member surface
  // than any non-member and within the cut's reach. The dN >= fh test alone ended the flag where the over thread's own
  // non-member samples (just past its membership boundary) came within a fill half-width, short of the window's end:
  // there the full cut erased the joint's outline (link A j158/t73e).
  const ord = ks.map((k, i) => { let d = k - ks[0]; if (su.closed) d = ((d % su.count) + su.count + (su.count >> 1)) % su.count - (su.count >> 1); return [d, i]; }).sort((a, b) => a[0] - b[0]);
  for (const bit of [1, 2]) {
    for (let j = 0; j < ord.length;) {
      if (!(near[ord[j][1]] & bit)) { j++; continue; }
      let e = j, any = false;
      while (e < ord.length && near[ord[e][1]] & bit) { any ||= (out[ord[e][1]] & bit) !== 0; e++; }
      if (any) for (let q = j; q < e; q++) out[ord[q][1]] |= bit;
      j = e;
    }
  }
  return out;
}

export class GfGapTable {
  /** The baked entries (samples, plus one a closed chain), in positions()' layout. */
  nPos = 0;
  ms = 0;
  /** K1458 probes: set to [] to collect (crossing, winNeg, winPos, capNeg, capPos) per crossing. */
  wins: number[] | null = null;

  /**
   * Each kept under sample's (winM, over chain, over arc, scan half-range), four floats per entry in
   * GfLookTable.positions' layout (see the header). K1458: the last three name the crossing whose
   * window wins there (its over chain; -1 = none) and the over arc nearest the sample, so lkGap
   * finds the over thread past form B's candidate reach (rc = h + W + 2aa: past it the list holds
   * no over piece, so the cut stopped there, a hard edge whatever the fade).
   */
  values(r: GfGapSource, out?: Float32Array): Float32Array {
    const t0 = performance.now();
    const D = r.kd;
    const G = D.geom;
    const nC = r.chainSamples.length;
    const sam = (ch: number): GapSamples | null => {
      if (ch < 0 || ch >= nC || !lookValid(r, ch)) return null;
      const c = r.kcv[ch]; const sm = r.chainSamples[ch]!;
      return { positions: sm.positions, count: sm.count, closed: c.closed, total: G[c.geom * 4], arcPer: G[c.geom * 4 + 1] };
    };
    const cents = r.crossings.map((x) => {
      const so = sam(x.overChain), su = sam(x.underChain);
      if (!so || !su) return null;
      return { x, so, su, oC: kArcOfCtrl(D, r.kcv[x.overChain], x.overCtrl), uC: kArcOfCtrl(D, r.kcv[x.underChain], x.underCtrl) };
    });
    // per under chain: sample index -> winM (the max over its crossings); K1458: its winner's over pass
    const byChain = new Map<number, { m: Float32Array; o: Float32Array }>();
    const CUT_REACH = Math.max(1.35, r.fillHalf * 6.5, 4.5);
    const scan = Math.max(0.6, 3 * r.fillHalf); // K1458: lkGap's scan half-range around the baked over arc
    const gpt = { x: 0, y: 0 };
    // sample index -> kept-sample index (positions()'s compaction: a repeat of the last kept sample,
    // and a closed chain's closing repeat of its first, fold into it)
    const kept = new Map<number, Int32Array>();
    const keptOf = (ch: number, S: GapSamples): Int32Array => {
      let m = kept.get(ch);
      if (m) return m;
      m = new Int32Array(S.count);
      const xy = S.positions;
      let kv = 0, l = -1;
      for (let k = 0; k < S.count; k++) {
        if (l >= 0 && xy[2 * k] === xy[2 * l] && xy[2 * k + 1] === xy[2 * l + 1]) { m[k] = kv - 1; continue; }
        m[k] = kv++;
        l = k;
      }
      if (S.closed && kv > 1 && xy[2 * l] === xy[0] && xy[2 * l + 1] === xy[1]) for (let k = 0; k < S.count; k++) if (m[k] === kv - 1) m[k] = 0;
      kept.set(ch, m);
      return m;
    };
    for (const e of cents) {
      if (!e) continue;
      const { x, su, so, uC, oC } = e;
      const self = x.overChain === x.underChain;
      // the neighbouring passes on the under chain (setupUnder's uCaps: NB_CLEAR, twins at half)
      let gapN = Infinity, gapP = Infinity, twinN = false, twinP = false;
      for (const o of cents) {
        if (!o) continue;
        const passes = [
          { ch: o.x.overChain, arc: o.oC, ownOver: o === e, other: o.x.underChain },
          { ch: o.x.underChain, arc: o.uC, ownOver: false, other: o.x.overChain },
        ];
        for (const p of passes) {
          if (p.ch !== x.underChain || (o === e && !p.ownOver)) continue;
          let fwd = p.arc - uC;
          if (su.closed) fwd = ((fwd % su.total) + su.total) % su.total;
          const bwd = su.closed ? su.total - fwd : -fwd;
          const twin = p.ownOver || p.other === x.overChain;
          if (fwd > 1e-9 && fwd < gapP) { gapP = fwd; twinP = twin; }
          if (bwd > 1e-9 && bwd < gapN) { gapN = bwd; twinN = twin; }
        }
      }
      let splitP = Infinity, splitN = Infinity;
      if (self) {
        let fwd = uC - oC, bwd = oC - uC;
        if (su.closed) { fwd = ((fwd % su.total) + su.total) % su.total; bwd = su.total - fwd; }
        else { if (!(fwd > 0)) fwd = Infinity; if (!(bwd > 0)) bwd = Infinity; }
        splitP = Math.max(0.12, bwd / 2 - 0.08); // setupUnder: uCapPos takes splitBwd
        splitN = Math.max(0.12, fwd / 2 - 0.08);
      }
      const roomP = su.closed ? su.total / 4 : su.total - uC;
      const roomN = su.closed ? su.total / 4 : uC;
      const capP = Math.max(0.15, Math.min(CUT_REACH, (twinP ? 0.5 : 0.8) * gapP, splitP, roomP));
      const capN = Math.max(0.15, Math.min(CUT_REACH, (twinN ? 0.5 : 0.8) * gapN, splitN, roomN));
      // K1458: the room to the nearest fused joint on each side, past its clearance (crossing_gaps.ts jRoomNeg/Pos).
      // K1584 s3: with gf's joint geometry given (jointArcs), the room runs to the nearest joint corner's tangent point
      // (less the exit pad), where the joint's outline leaves the under thread's, and to the nearest joint ctrl less a
      // fill half-width; the clearance scales then yield only by the shortfall of that room.
      let jRoomP = 1e6, jRoomN = 1e6;
      // K1584 s4: and per border: [neg left, neg right, pos left, pos right]. The corner room runs to the tangent point
      // itself, no exit pad: the pad closed about 40% of the sides whose corner sits just past the over's outline
      // (A_3 x256 by t60e, a notch in s3), and the joint's outline only starts at the tangent point.
      const bRoom = [1e6, 1e6, 1e6, 1e6];
      const room = (arc: number, clear: number, lat = 0): void => {
        let d = arc - uC;
        if (su.closed) { d = ((d % su.total) + su.total) % su.total; if (d > su.total / 2) d -= su.total; }
        const v = Math.max(0, Math.abs(d) - clear), o = d >= 0 ? 2 : 0;
        if (d >= 0) jRoomP = Math.min(jRoomP, v);
        else jRoomN = Math.min(jRoomN, v);
        if (lat >= 0) bRoom[o] = Math.min(bRoom[o], v);
        if (lat <= 0) bRoom[o + 1] = Math.min(bRoom[o + 1], v);
      };
      const ja = r.jointArcs;
      const jl = r.joints?.get(x.underChain);
      // K1584 s4: with the corners' sides given, the joint ctrl caps the window alone (lat NaN: no border); a border's
      // room runs to its own corners, so a border no joint corner meets keeps the full gap beside a junction
      const jlat = r.jointLats?.get(x.underChain), ctrlLat = ja && r.jointLats ? Number.NaN : 0;
      if (jl) for (const jc of jl) room(kArcOfCtrl(D, r.kcv[x.underChain], jc.ctrl), ja ? r.fillHalf : (r.jointClear ?? 0), ctrlLat);
      const jt = ja?.get(x.underChain);
      // K1584 s7 corner rule (K1595 Q4; Levi on seven stems beside junctions: today's look, the stem joined to its cup):
      // per border, [neg left, neg right, pos left, pos right], the off of the nearest PAIR corner's tangent point, a
      // junction corner whose two chains are this crossing's under and over. There the under's border turns into the
      // fillet that joins it to the over, whose outline is the fillet's other half: the far term finds the over "near"
      // all along it and the window never clears, so the cut ran on round the corner into the junction.
      const jp = r.jointPartners?.get(x.underChain), jw = r.jointWedges?.get(x.underChain);
      const pairB = [1e6, 1e6, 1e6, 1e6];
      // K1584 s8 (Levi on the seven stems: today's look): per border, the off of the pair corner's FILLET START on the
      // under, the nearer to the crossing of the under's own tangent point (pairB) and the over's tangent point of the
      // same corner projected onto the under. Where the border runs alongside the over into the corner, the over's
      // tangent point lies nearer the crossing: the fillet's bend starts there, and s7's flag (at the under's tangent
      // point) left the far term cutting that bend (A_6 k197, A_d k148: a notch where today joins the stem to its cup).
      const pairF = [1e6, 1e6, 1e6, 1e6];
      const jtO = ja?.get(x.overChain), jpO = r.jointPartners?.get(x.overChain);
      let rawO: number[] | null = null;
      const pU = { x: 0, y: 0 }, pO = { x: 0, y: 0 }, pS = { x: 0, y: 0 };
      // the over's tangent point (its corner with the under) nearest the under's at `arc`, projected onto the under
      // (the nearest under sample within GAP_FILLET_REACH of arc): its off from the crossing, NaN when none lies in reach
      const overTpOff = (arc: number): number => {
        if (!jtO || !jpO) return Number.NaN;
        if (!rawO) {
          const kmO = keptOf(x.overChain, so);
          rawO = [];
          for (let k = 0; k < so.count; k++) if (rawO[kmO[k]] === undefined) rawO[kmO[k]] = k;
        }
        gapPointAt(su, arc, pU);
        let best = Infinity, bx = 0, by = 0;
        for (let q = 0; q < jtO.length; q++) {
          if (jpO[q] !== x.underChain) continue;
          const f = jtO[q], i = Math.max(0, Math.min(rawO.length - 1, Math.floor(f))), j = Math.min(rawO.length - 1, i + 1);
          gapPointAt(so, (rawO[i] + Math.max(0, Math.min(1, f - i)) * (rawO[j] - rawO[i])) * so.arcPer, pO);
          const dd = (pO.x - pU.x) ** 2 + (pO.y - pU.y) ** 2;
          if (dd < best) { best = dd; bx = pO.x; by = pO.y; }
        }
        if (!(best < GAP_FILLET_REACH * GAP_FILLET_REACH)) return Number.NaN;
        let bd = Infinity, ba = arc;
        const n = Math.ceil(GAP_FILLET_REACH / su.arcPer);
        for (let i = -n; i <= n; i++) {
          const a2 = arc + i * su.arcPer;
          if (!su.closed && (a2 < 0 || a2 > su.total)) continue;
          gapPointAt(su, a2, pS);
          const dd = (pS.x - bx) ** 2 + (pS.y - by) ** 2;
          if (dd < bd) { bd = dd; ba = a2; }
        }
        let d = ba - uC;
        if (su.closed) { d = ((d % su.total) + su.total) % su.total; if (d > su.total / 2) d -= su.total; }
        return d;
      };
      if (jt) {
        // field vertex (kept index) -> its first raw sample, the arc the window marches in
        const km = keptOf(x.underChain, su), raw: number[] = [];
        for (let k = 0; k < su.count; k++) if (raw[km[k]] === undefined) raw[km[k]] = k;
        for (let q = 0; q < jt.length; q++) {
          const f = jt[q];
          const i = Math.max(0, Math.min(raw.length - 1, Math.floor(f))), j = Math.min(raw.length - 1, i + 1);
          const arc = (raw[i] + Math.max(0, Math.min(1, f - i)) * (raw[j] - raw[i])) * su.arcPer, lat = jlat ? jlat[q] ?? 0 : 0;
          // K1584 s11: a wedge corner limits the window alone (lat NaN: no border; jointWedges)
          room(arc, 0, jw?.[q] === 1 ? Number.NaN : lat);
          if (!jp || jp[q] !== x.overChain) continue;
          let d = arc - uC;
          if (su.closed) { d = ((d % su.total) + su.total) % su.total; if (d > su.total / 2) d -= su.total; }
          const o = d >= 0 ? 2 : 0;
          if (lat >= 0) pairB[o] = Math.min(pairB[o], Math.abs(d));
          if (lat <= 0) pairB[o + 1] = Math.min(pairB[o + 1], Math.abs(d));
          const dO = overTpOff(arc);
          const fS = dO === dO && (dO >= 0) === (d >= 0) ? Math.min(Math.abs(d), Math.abs(dO)) : Math.abs(d);
          if (lat >= 0) pairF[o] = Math.min(pairF[o], fS);
          if (lat <= 0) pairF[o + 1] = Math.min(pairF[o + 1], fS);
        }
      }
      const perB = r.jointLats !== undefined && ja !== undefined;
      // K1460 s3: a self crossing's over range and own-arc exclusion, as setupUnder hands marchUnder (oCapNeg/Pos
      // take splitBwd/Fwd; selfEx = both half-widths + margin + fade + the exit pad)
      const oRN = self ? Math.min(GAP_OVER_RANGE, splitP) : GAP_OVER_RANGE, oRP = self ? Math.min(GAP_OVER_RANGE, splitN) : GAP_OVER_RANGE;
      const selfEx = self ? 2 * r.fillHalf + r.margin + r.fade + GAP_EXIT_PAD : 0;
      const gw = gapWindow(su, so, uC, oC, r.fillHalf, r.margin, r.fade, capN, capP, jRoomN, jRoomP, oRN, oRP, selfEx, perB ? bRoom : undefined, pairB);
      // K1584 s7 corner rule (K1595 Q4 form b): from the nearest pair corner on, each side's slots carry the far-off flag
      // (the right code's 1024 bit): the shader's far term (lkNearOn) is off there, its loop term untouched. A slot
      // whose cell holds the tangent point is flagged too: the fillet's pixels carry the tangent point's s. Closing the
      // codes instead (form a) also shrank the loop term's cut, which moved two right loops (A_3 x49, A_d x241).
      const stopN = Math.min(pairB[0], pairB[1]), stopP = Math.min(pairB[2], pairB[3]);
      // K1584 s8: the flag starts earlier where a border's own gap (gw[14 + o]) runs on to its corner's fillet start:
      // from the latest point either border still needs the far term, that border's fillet start, the other's code
      // reach (its gap end + GAP_END_PAD + a sample, codeAt). A crossing's gap beside a junction whose borders end short
      // of their fillets keeps s7's flag, so its length is untouched (D_a x174: a shared min over both borders took
      // 3 px of its gap). The flag is per slot, both borders: a side where one border runs into its fillet while the
      // other's gap reaches past that fillet start keeps the far cut on the first's bend (A_c k310, reported).
      const flagOf = (o: number, stop: number): number => {
        if (!(stop < 1e5)) return Infinity;
        const f7 = stop - su.arcPer / 2;
        let into = false, need = 0;
        for (let b = 0; b < 2; b++) {
          const f = pairF[o + b], e = gw[14 + o + b];
          if (f < 1e5 && e >= f) { into = true; need = Math.max(need, f); } else need = Math.max(need, e + GAP_END_PAD + su.arcPer);
        }
        return into ? Math.min(f7, need) : f7;
      };
      const flagN = flagOf(0, stopN), flagP = flagOf(2, stopP);
      const wn = gw[0], wp = gw[1], msN = gw[2], fsN = gw[3], msP = gw[4], fsP = gw[5];
      // K1458: the side's clearance scales ride the scan field's fraction (gwScales)
      const pk = (ms: number, fs: number): number => Math.round(fs * 31) * 32 + Math.round(ms * 31);
      // K1584 s4: per border, the left border's code rides z's fraction and the right border's x's (quarter scale since
      // s7, which adds GAP_FAR_OFF, so the chain still reads int(x + 0.5)); code 0 (nothing fits before that border's joint corner, or the slot lies past
      // its room, on the joint's own outline) closes that border's cut as the old flag did. A code that rounds to 0
      // while something fits takes 1 (a margin of 1/31).
      const bCode = (ms: number, fs: number, live: boolean): number => live ? Math.max(1, pk(ms, fs)) : 0;
      this.wins?.push(cents.indexOf(e), wn, wp, capN, capP);
      let ent = byChain.get(x.underChain);
      if (!ent) { ent = { m: new Float32Array(su.count).fill(-GAP_FAR), o: new Float32Array(su.count * 3).fill(-1) }; byChain.set(x.underChain, ent); }
      const tmp = ent.m;
      const offOf = (k: number): number => {
        let off = k * su.arcPer - uC;
        if (su.closed) { off = ((off % su.total) + su.total) % su.total; if (off > su.total / 2) off -= su.total; }
        return off;
      };
      for (let k = 0; k < su.count; k++) {
        const off = offOf(k);
        const v = (off >= 0 ? wp : wn) - Math.abs(off);
        if (v > tmp[k]) tmp[k] = v;
      }
      // K1458: where this crossing's window wins, the over arc nearest each under sample, marched out
      // from the crossing (each sample's descent starts at the last one's). A self crossing's over range
      // stops short of its own under pass (setupUnder's split).
      let ro = GAP_OVER_RANGE;
      if (self) {
        let sep = Math.abs(uC - oC);
        if (su.closed) sep = Math.min(sep % su.total, su.total - (sep % su.total));
        ro = Math.min(ro, Math.max(0.12, sep / 2 - 0.08));
      }
      let lo = oC - ro, hi = oC + ro;
      if (!so.closed) { lo = Math.max(0, lo); hi = Math.min(so.total, hi); }
      const step = so.arcPer;
      const kc = Math.round(uC / su.arcPer);
      const km = keptOf(x.overChain, so);
      const ks: number[] = [], wr: number[] = []; // K1482 s15: the slots this crossing wins (under sample) and their y, z (kept index, scan + pack)
      const rc: number[] = []; // K1584 s4: each slot's right-border code (x's fraction)
      // K1584 s4: each border's code at a slot: its own scales, or 0 past its joint room (the window runs on into the
      // joint, where the over thread, a member too, comes back within the cut's reach of the joint's outline: link A_c
      // j104; that stretch is the joint's own outline, which stays closed). Without jointLats both borders take the
      // side's scales. This replaces the joint flag (K1482 s15/s17/s18), which closed whole crossing sides.
      // K1584 s5: with GAP_CARVE the room closes nothing: the cut runs past the joint corner into the junction's outline,
      // to the border's own end (A_c j104's over coming back is past that end, so its stretch still stays closed).
      const codeAt = (off: number, b: number): number => {
        if (!perB) return off >= 0 ? pk(msP, fsP) : pk(msN, fsN);
        const o = (off >= 0 ? 2 : 0) + b, rm = bRoom[o];
        if (!GAP_CARVE && rm < 1e5 && Math.abs(off) > rm) return 0;
        // past the border's own gap (it cleared the over's fill, margin and fade) the window cuts nothing of it
        if (Math.abs(off) > gw[14 + o] + GAP_END_PAD + su.arcPer) return 0;
        const ms = gw[6 + 2 * o], fs = gw[7 + 2 * o];
        return bCode(ms, fs, ms > 0);
      };
      for (const dir of [1, -1]) {
        let a = oC;
        for (let j = dir > 0 ? 0 : 1; j <= su.count; j++) {
          let k = kc + dir * j;
          if (su.closed) k = ((k % su.count) + su.count) % su.count;
          else if (k < 0 || k >= su.count) break;
          if (su.closed && j > su.count / 2) break;
          const off = offOf(k);
          const v = (off >= 0 ? wp : wn) - Math.abs(off);
          if (!(v > -GAP_SLOT_OUT)) break;
          if (Math.fround(v) < tmp[k]) continue; // tmp is float32: its own window rounded up must still win
          const ux = su.positions[2 * k], uy = su.positions[2 * k + 1];
          const d2 = (s: number): number => {
            gapPointAt(so, so.closed ? ((s % so.total) + so.total) % so.total : s, gpt);
            const dx = gpt.x - ux, dy = gpt.y - uy;
            return dx * dx + dy * dy;
          };
          let d = d2(a);
          for (let it = 0; it < 4096; it++) {
            const aP = Math.min(a + step, hi), aN = Math.max(a - step, lo);
            const dP = d2(aP), dN = d2(aN);
            if (dP < d && dP <= dN) { a = aP; d = dP; } else if (dN < d) { a = aN; d = dN; } else break;
          }
          let s = a, w = scan;
          if (hi - lo > 2 * scan) s = Math.max(lo + scan, Math.min(hi - scan, a));
          else { s = (lo + hi) / 2; w = (hi - lo) / 2; }
          if (so.closed) s = ((s % so.total) + so.total) % so.total;
          // the shader scans the field's vertices, which are the kept samples: bake their index
          ks.push(k);
          rc.push(codeAt(off, 1) + (Math.abs(off) >= (off >= 0 ? flagP : flagN) ? GAP_FAR_OFF : 0));
          wr.push(km[Math.max(0, Math.min(so.count - 1, Math.round(s / so.arcPer)))], Math.ceil(w / so.arcPer) + codeAt(off, 0) / 1024);
        }
      }
      for (let i = 0; i < ks.length; i++) {
        const k = ks[i];
        ent.o[3 * k] = x.overChain + rc[i] / 4096;
        ent.o[3 * k + 1] = wr[2 * i];
        ent.o[3 * k + 2] = wr[2 * i + 1];
      }
    }
    let nPos = 0;
    for (let ch = 0; ch < nC; ch++) if (lookValid(r, ch)) nPos += r.chainSamples[ch]!.count + (r.kcv[ch].closed ? 1 : 0);
    const len = Math.max(1, Math.ceil(nPos / GF_TW)) * GF_TW * 4;
    const V = out && out.length >= len ? out : new Float32Array(len);
    for (let i = 0; i < len; i += 4) { V[i] = -GAP_FAR; V[i + 1] = -1; V[i + 2] = 0; V[i + 3] = 0; }
    let pb = 0;
    for (let ch = 0; ch < nC; ch++) {
      if (!lookValid(r, ch)) continue;
      const c = r.kcv[ch];
      const count = r.chainSamples[ch]!.count;
      const ent = byChain.get(ch);
      if (ent) {
        // compact to the kept samples and pad the tail, exactly as positions() does
        const xy = r.chainSamples[ch]!.positions;
        const put = (i: number, k: number): void => {
          V[4 * i] = ent.m[k]; V[4 * i + 1] = ent.o[3 * k]; V[4 * i + 2] = ent.o[3 * k + 1]; V[4 * i + 3] = ent.o[3 * k + 2];
        };
        let kv = 0;
        let l = -1;
        for (let k = 0; k < count; k++) {
          if (l >= 0 && xy[2 * k] === xy[2 * l] && xy[2 * k + 1] === xy[2 * l + 1]) continue;
          put(pb + kv++, k);
          l = k;
        }
        if (c.closed && kv > 1 && xy[2 * l] === xy[0] && xy[2 * l + 1] === xy[1]) kv--;
        const end = count + (c.closed ? 1 : 0);
        const padFrom = 4 * (c.closed ? pb : pb + kv - 1);
        for (let k = kv; k < end; k++) for (let q = 0; q < 4; q++) V[4 * (pb + k) + q] = V[padFrom + q];
      }
      pb += count + (c.closed ? 1 : 0);
    }
    this.nPos = nPos;
    this.ms = performance.now() - t0;
    return V;
  }
}

/**
 * K1500 (26K): the marker discs' gap for gf - today's marker slots (ribbon/crossing_gaps.ts
 * renderMarkerGaps): a start/exit disc is an over pass whose polyline is its centre point, hiding its
 * thread inside (radius + margin) and fading it back over fadeLength radially (sin 1), inside a window
 * marched along the thread to where the centreline clears radius + margin + fade + both half-widths.
 * gf's look had no port of it, so the thread stayed crisp at every fadeLength. Two vec4s a disc ride as
 * uniforms (uMkA/uMkB, at most GF_MARKER_SLOTS): A = (centreX, centreY, radius, chain),
 * B = (centreArc, winNeg, winPos, total | 0 open); chain -1 = no disc.
 */
export interface GfMarkerSource extends GfLookSource {
  markers: readonly { chain: number; ctrl: number; radius: number }[];
  fillHalf: number; margin: number; fade: number;
  // today's fan flank reach (joinery.ts FILLET_REACH_PER_HALF and the cusp slider) and, per chain, its
  // junction arcs and under-crossing arcs, for the fan clip in gfMarkerUniforms
  cuspRadius: number;
  junctionArcs: readonly (readonly number[] | undefined)[];
  underArcs: readonly (readonly number[] | undefined)[];
}
export interface GfMarkerUniforms { a: Float32Array; b: Float32Array }
export const GF_MARKER_SLOTS = 4;

/** renderMarkerGaps' winOf (both directions): arc along the thread until it clears exitD from the centre. */
export function markerWindow(S: GapSamples, center: number, cx: number, cy: number, exitD: number): [number, number] {
  const pt = { x: 0, y: 0 };
  const winOf = (dir: number): number => {
    const cap = S.closed ? S.total / 4 : dir > 0 ? S.total - center : center;
    for (let s = 0; ; s += GAP_MARCH_STEP) {
      const sc = Math.min(s, cap);
      gapPointAt(S, center + dir * sc, pt);
      if (Math.hypot(pt.x - cx, pt.y - cy) >= exitD) return Math.min(cap, sc + GAP_MARCH_STEP);
      if (sc >= cap) return cap;
    }
  };
  return [winOf(-1), winOf(1)];
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Today's marker cut (gap_mask.ts gapKeepAt, the n <= 1 branch): at radial distance d from the centre, arc offset off in the window. */
export function markerCutAt(d: number, radius: number, off: number, winNeg: number, winPos: number, margin: number, fade: number, pxW: number): number {
  const m = Math.min(off + winNeg, winPos - off);
  if (m <= -pxW) return 0;
  const inWin = clamp01(m / pxW + 0.5);
  const e = d - radius - margin;
  let k = clamp01((e + 0.5 * pxW) / Math.max(fade, pxW));
  k = k * k * (3 - 2 * k);
  let fs = clamp01(m / Math.max(0.5 * fade, pxW));
  fs = 1 + (fs * fs * (3 - 2 * fs) - 1) * clamp01(e / pxW);
  return (1 - k) * inWin * fs;
}

/**
 * Today's fan flank reach along an arm (joinery.ts armReach): the full reach L, capped by the arm's
 * domain, and stopped a fillHalf short of the arm's nearest under-gap (never below 0.3 L).
 */
export function markerArmReach(L: number, domain: number, near: number, fillHalf: number): number {
  const dom = Math.min(L, Math.max(L * 0.3, domain));
  return Math.min(dom, Math.max(L * 0.3, near - fillHalf));
}

/** The discs' look uniforms from the renderer's occluders, in the installed samples' frame. */
export function gfMarkerUniforms(r: GfMarkerSource): GfMarkerUniforms {
  const a = new Float32Array(GF_MARKER_SLOTS * 4);
  const b = new Float32Array(GF_MARKER_SLOTS * 4);
  for (let i = 0; i < GF_MARKER_SLOTS; i++) a[i * 4 + 3] = -1;
  const D = r.kd;
  const G = D.geom;
  const pt = { x: 0, y: 0 };
  let n = 0;
  for (const mk of r.markers) {
    if (n >= GF_MARKER_SLOTS) break;
    const ch = mk.chain;
    if (ch < 0 || ch >= r.chainSamples.length || !lookValid(r, ch)) continue;
    const c = r.kcv[ch];
    const sm = r.chainSamples[ch]!;
    const S: GapSamples = { positions: sm.positions, count: sm.count, closed: c.closed, total: G[c.geom * 4], arcPer: G[c.geom * 4 + 1] };
    const center = kArcOfCtrl(D, c, mk.ctrl);
    gapPointAt(S, center, pt);
    const exitD = mk.radius + r.margin + r.fade + r.fillHalf * 2 + GAP_EXIT_PAD;
    let [winNeg, winPos] = markerWindow(S, center, pt.x, pt.y, exitD);
    // Fan clip: today's fan material (silhouette gap only) replaces the ribbon inside a junction fan's
    // flank reach, so the marker fade never shows there - clip the window at each fan's near edge.
    const L = r.fillHalf * 1.25 * r.cuspRadius;
    if (L > 0) {
      const jns = [...(r.junctionArcs[ch] ?? [])].sort((x, y) => x - y);
      const unds = r.underArcs[ch] ?? [];
      for (const J of jns) {
        // the arm from J toward the disc: its domain runs to the next junction or the chain's end
        const discDir = center >= J ? 1 : -1;
        let domain = discDir > 0 ? S.total - J : J;
        for (const J2 of jns) {
          if (J2 === J) continue;
          const d2 = (J2 - J) * discDir;
          if (d2 > 0 && d2 < domain) domain = d2;
        }
        let near = Infinity;
        for (const U of unds) {
          const dU = (U - J) * discDir;
          if (dU > 0 && dU <= domain && dU < near) near = dU;
        }
        const reach = markerArmReach(L, domain, near, r.fillHalf);
        const side = Math.max(0, Math.abs(J - center) - reach);
        if (J >= center) winPos = Math.min(winPos, side);
        else winNeg = Math.min(winNeg, side);
      }
    }
    a.set([pt.x, pt.y, mk.radius, ch], n * 4);
    b.set([center, winNeg, winPos, c.closed ? S.total : 0], n * 4);
    n++;
  }
  return { a, b };
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
 * Texel 3 (K1447): (fanD, 0, 0, 0) - the sample's arc distance from the junction end its crest
 * comes from (d, or span - d for a two-ended arm's far end); the border fan gate reads it.
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

/**
 * CPU twin of the look shader's border indication (lkHiC / lkHiA, K1425): today's
 * border hi over an empty base (ribbon_shader: kComposePaintAcross over black,
 * then the telegraph and rim overs) and its coverage (the strongest of the gold
 * amount, the pulse, the scaled telegraph and the rim). teleT is the telegraph
 * field already scaled by its strength (lkTele x uTeleU.w, no across shaping:
 * today's hi branch composes the telegraph unshaped).
 */
export function lookHi(gold: ArrayLike<number>, gp: number, pulseCol: ArrayLike<number>, pulseV: number, teleCol: ArrayLike<number>, teleT: number, hov: ArrayLike<number>, rimV: number): [number, number, number, number] {
  const kb = PAINT_CONST.K_BAND;
  let r = gold[0] * gp, g = gold[1] * gp, b = gold[2] * gp;
  if (pulseV > 0) {
    const w = kb * Math.min(1, Math.max(0, pulseV));
    r += (pulseCol[0] - r) * w; g += (pulseCol[1] - g) * w; b += (pulseCol[2] - b) * w;
  }
  if (teleT > 0) {
    const k = Math.min(1, Math.max(0, teleT));
    r += (teleCol[0] - r) * k; g += (teleCol[1] - g) * k; b += (teleCol[2] - b) * k;
  }
  if (rimV > 0) {
    const w = kb * Math.min(1, Math.max(0, rimV));
    r += (hov[0] - r) * w; g += (hov[1] - g) * w; b += (hov[2] - b) * w;
  }
  return [r, g, b, Math.min(1, Math.max(0, Math.max(gp, pulseV, rimV, teleT)))];
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
    const rows = Math.max(1, Math.ceil((nPos * 4) / GF_TW));
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
      if (this.tmp.length < count * 16) this.tmp = new Float32Array(count * 16);
      const tmp = this.tmp;
      tmp.fill(0, 0, count * 16);
      const pp = pulses[ch];
      const tt = tele[ch];
      const gap = r.teleGap;
      for (let k = 0; k < count; k++) {
        const arc = k * arcPer;
        const o = k * 16;
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
          tmp[o + 12] = p.two ? (gA <= (p.dB ?? 0) + span - d ? d : span - d) : d;
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
        const so = (pb + kv) * 16;
        const ko = k * 16;
        for (let j = 0; j < 16; j++) V[so + j] = tmp[ko + j];
        kv++;
        l = k;
      }
      if (c.closed && kv > 1 && xy[2 * l] === xy[0] && xy[2 * l + 1] === xy[1]) kv--;
      const end = count + (c.closed ? 1 : 0);
      const po = (pb + (c.closed ? 0 : kv - 1)) * 16;
      for (let k = kv; k < end; k++) {
        const eo = (pb + k) * 16;
        for (let j = 0; j < 16; j++) V[eo + j] = V[po + j];
      }
      pb += end;
    }
    this.nPos = nPos;
    this.ms = performance.now() - t0;
    return V;
  }
}

/**
 * K1395 (24D): the appearance reveal's colours under the look. GfFxTable bakes, per kept sample in
 * GfLookTable.positions' layout (two RGBA texels a sample), what paint_math's kFxColor / kGlow give
 * today's shader at that sample this frame: texel 0 = (rainbow progress, materialize alpha, burn age,
 * interior solidity), texel 1 = (sample index, frontier glow, left cut margin, right cut margin). The burn age rides to the shader,
 * which runs kBurn's envelope over the label's section colour with the live flicker phases (uFxPh);
 * the rainbow's stripes and white wash run there too (their across coordinate is the pixel's own).
 * Interior solidity (kComposePaint's hiA over an empty base: the stronger of the glow and, while the
 * chain's FX live, the materialize alpha) rides o0.z to the composite, which in the border look fills
 * the interior with the FX colour while the reveal runs (today's border branch does the same).
 * gf_app re-bakes it every revealing frame (the FX clocks move), beside the reveal table.
 */
export class GfFxTable {
  /** The baked entries (samples, plus one a closed chain), in positions()' layout. */
  nPos = 0;
  ms = 0;
  private tmp = new Float32Array(0);
  private ign: KIgn = { hit: false, tA: 0, cFrom: 0, dir: 1, t0: 0, rate: 1, tEnd: 0, span: 0 };
  private rgb = [0, 0, 0];
  private pOut = { pRain: 0, alpha: 1 };
  private sScr = new Float64Array(0);

  /** Each kept sample's FX fields from the renderer's reveal state, in GfLookTable.positions' layout.
   * `jn` (K1459) adds today's junction cuts: L = the junction-cut reach (paint_state's formula),
   * caps = the renderer's g3Caps (+4 at a fused end), entries = its junctionCutEntries. */
  values(r: GfLookSource, out?: Float32Array, jn?: { L: number; caps: ArrayLike<number> | null; entries: ReadonlyArray<{ chain: number; center: number; lo: number; hi: number; left: boolean; right: boolean }> | null } | null): Float32Array {
    const t0 = performance.now();
    const U = knotUniformValues();
    const D = r.kd;
    const nC = r.chainSamples.length;
    const st = Math.round(U.uKFx[0]);
    let nPos = 0;
    for (let ch = 0; ch < nC; ch++) if (lookValid(r, ch)) nPos += r.chainSamples[ch]!.count + (r.kcv[ch].closed ? 1 : 0);
    const rows = Math.max(1, Math.ceil((nPos * 2) / GF_TW));
    const len = rows * GF_TW * 4;
    const V = out && out.length >= len ? out : new Float32Array(len);
    V.fill(0, 0, len);
    let pb = 0;
    for (let ch = 0; ch < nC; ch++) {
      if (!lookValid(r, ch)) continue;
      const c = r.kcv[ch];
      const count = r.chainSamples[ch]!.count;
      const n = c.nCtrl;
      if (this.tmp.length < count * 8) this.tmp = new Float32Array(count * 8);
      const tmp = this.tmp;
      tmp.fill(0, 0, count * 8);
      const fxHere = U.uKFx[3] > 0.5 && st > 0 && U.uKFx[2] < c.fxDone;
      // K1459: this chain's drawn arcs, and each sample's junction cut margins (max of the
      // fused-end margin and the covering side entries' margins, per side; -1e9 = no cut)
      const xyJ = r.chainSamples[ch]!.positions;
      if (this.sScr.length < count + 1) this.sScr = new Float64Array((count + 1) * 2);
      const SJ = this.sScr;
      SJ[0] = 0;
      for (let k = 1; k < count; k++) { const dx = xyJ[2 * k] - xyJ[2 * k - 2]; const dy = xyJ[2 * k + 1] - xyJ[2 * k - 1]; SJ[k] = SJ[k - 1] + Math.hypot(dx, dy); }
      let jRing = 0;
      if (c.closed && count > 1) jRing = SJ[count - 1] + Math.hypot(xyJ[0] - xyJ[2 * count - 2], xyJ[1] - xyJ[2 * count - 1]);
      const jEntries = jn && jn.L > 0 && jn.entries ? jn.entries.filter((e) => e.chain === ch) : [];
      const fusedS = !!(jn && jn.L > 0 && jn.caps && jn.caps[2 * ch] >= 4);
      const fusedE = !!(jn && jn.L > 0 && jn.caps && jn.caps[2 * ch + 1] >= 4);
      const jMargin = (k: number, left: boolean): number => {
        if (!jn || !(jn.L > 0)) return -1e9;
        let m = -1e9;
        const a = SJ[k];
        if (fusedS) m = Math.max(m, jn.L - a);
        if (fusedE) m = Math.max(m, jn.L - (SJ[count - 1] - a));
        for (const e of jEntries) {
          if (left ? !e.left : !e.right) continue;
          let rel = a - e.center;
          if (jRing > 0) rel -= jRing * Math.floor(rel / jRing + 0.5);
          if (rel < e.lo || rel > e.hi) continue;
          m = Math.max(m, Math.max(Math.abs(e.lo), Math.abs(e.hi)) - Math.abs(rel));
        }
        return m;
      };
      let slot = 0;
      for (let k = 0; k < count; k++) {
        const a = kSampleArc(c, k);
        while (slot < n - 1 && kCA(D, c, slot + 1) <= a) slot++;
        const a0 = kCA(D, c, slot);
        const a1 = slot < n - 1 ? kCA(D, c, slot + 1) : c.total;
        const ctrl = slot + (a1 > a0 ? Math.min(1, (a - a0) / (a1 - a0)) : 0);
        const o = k * 8;
        this.rgb[0] = 0; this.rgb[1] = 0; this.rgb[2] = 0;
        this.pOut.pRain = 0; this.pOut.alpha = 1;
        kFxColor(D, U, c, ctrl, k, this.rgb, this.pOut);
        // the burn age, under kFxColor's own skips (identity there bakes the recovered age 9)
        let burnAge = 9;
        if ((st === 4 || st === 5) && fxHere) {
          let settled = false;
          if (U.uKInk[1] < 0.5) {
            const sl = Math.max(0, Math.min(n - 1, Math.floor(ctrl)));
            if (U.uKFx[2] >= kWall(U, D.stat[(c.idx + sl) * 4 + 3]) + kFxTail(st)) settled = true;
          }
          if (!settled) {
            const g = kIgnition(D, U, c, ctrl, this.ign);
            if (g.hit && U.uKFx[1] >= g.tA) burnAge = kBurnAge(D, U, c, g, ctrl);
          }
        }
        const glow = kGlow(D, U, c, ctrl);
        tmp[o] = this.pOut.pRain;
        tmp[o + 1] = this.pOut.alpha;
        tmp[o + 2] = burnAge;
        tmp[o + 3] = Math.max(glow, fxHere ? this.pOut.alpha : 0);
        tmp[o + 4] = k;
        tmp[o + 5] = glow;
        tmp[o + 6] = jMargin(k, true);
        tmp[o + 7] = jMargin(k, false);
      }
      // compact to the kept samples and pad the tail, exactly as positions() does
      const xy = r.chainSamples[ch]!.positions;
      let kv = 0;
      let l = -1;
      for (let k = 0; k < count; k++) {
        if (l >= 0 && xy[2 * k] === xy[2 * l] && xy[2 * k + 1] === xy[2 * l + 1]) continue;
        const so = (pb + kv) * 8;
        const ko = k * 8;
        for (let j = 0; j < 8; j++) V[so + j] = tmp[ko + j];
        kv++;
        l = k;
      }
      if (c.closed && kv > 1 && xy[2 * l] === xy[0] && xy[2 * l + 1] === xy[1]) kv--;
      const end = count + (c.closed ? 1 : 0);
      const po = (pb + (c.closed ? 0 : kv - 1)) * 8;
      for (let k = kv; k < end; k++) {
        const eo = (pb + k) * 8;
        for (let j = 0; j < 8; j++) V[eo + j] = V[po + j];
      }
      pb += end;
    }
    this.nPos = nPos;
    this.ms = performance.now() - t0;
    return V;
  }
}

/** CPU twin of the look shader's lkFx over one baked sample (segment k, fraction u): (pRain, alpha, burnAge, hiA, kSample, glow, cutMarginL, cutMarginR). */
export function fxAt(V: ArrayLike<number>, b: number, n: number, closed: boolean, k: number, u: number): number[] {
  const last = closed ? n : n - 1;
  if (k < 0) { k = 0; u = 0; }
  if (k >= last) { k = last; u = 0; }
  const out: number[] = [];
  for (let j = 0; j < 8; j++) {
    const A = V[(b + k) * 8 + j];
    const B = V[(b + Math.min(k + 1, last)) * 8 + j];
    out.push(A + (B - A) * u);
  }
  return out;
}
const smooth01 = (x: number): number => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

/**
 * K1414: the hover rim's along-thread strength (paint_math kPaintAt's RIM, the lkRim GLSL's twin):
 * strength at the hover point, falling to 0 at `len` from it, and fading in from each end's gap
 * over the end fade (clamped to RIM_END_SHARE of the stretch from the gap to the run's middle).
 * All distances in world arc; span = the run's arc length.
 */
export function rimAlong(strength: number, d: number, dEnd: number, gap: number, len: number, fade: number, span: number): number {
  const f = Math.min(Math.max(fade, 1e-4), Math.max(1e-4, PAINT_CONST.RIM_END_SHARE * (0.5 * span - gap)));
  return strength * (1 - smooth01(d / Math.max(len, 1e-4))) * smooth01((dEnd - gap) / f);
}

/** The rim across the ribbon (paint_math kRimAcross): e = |2 side - 1| (0 centre, 1 edge), scale = kRimScale(width). */
export function rimAcross(e: number, scale: number): number {
  return 1 - smooth01(((1 - e) / PAINT_CONST.RIM_EDGE) * scale);
}

export interface GfRimSource extends GfLookSource {
  paintRim: { chain: number; c0: number; c1: number; at: number } | null;
  rimAt: number;
  rimGap: number;
  hoverGlow: number;
  hoverGlowLength: number;
  hoverGlowFade: number;
  hoverGlowWidth: number;
}

/** The lkRim uniforms: A = (chain, run start, run end, hover point) in sample floats; B = (gap, strength, length, fade) in world arc; C = (rim scale, K_BAND, arc per sample, closed). */
export interface GfRimUniforms { a: [number, number, number, number]; b: [number, number, number, number]; c: [number, number, number, number]; hov: [number, number, number] }

export function rimUniforms(r: GfRimSource): GfRimUniforms {
  const H = knotUniformValues().uKHlHover;
  const hov: [number, number, number] = H ? [H[0], H[1], H[2]] : [1, 1, 1];
  const off: GfRimUniforms = { a: [-1, 0, 0, 0], b: [0, 0, 1, 0], c: [1, PAINT_CONST.K_BAND, 1, 0], hov };
  const rim = r.paintRim;
  if (!rim || rim.chain < 0 || rim.chain >= r.kcv.length || !r.kcv[rim.chain]) return off;
  const c = r.kcv[rim.chain];
  const D = r.kd;
  const arcPer = Math.max(1e-9, D.geom[c.geom * 4 + 1]);
  return {
    a: [rim.chain, kArcU(D, c, rim.c0) / arcPer, kArcU(D, c, rim.c1) / arcPer, kArcU(D, c, r.rimAt) / arcPer],
    b: [r.rimGap, Math.max(0, r.hoverGlow), Math.max(1e-4, r.hoverGlowLength), r.hoverGlowFade],
    c: [kRimScale(r.hoverGlowWidth), PAINT_CONST.K_BAND, arcPer, c.closed ? 1 : 0],
    hov,
  };
}

/** A hash of the rim declaration and its uniforms' sources (gf_app's redraw key). */
export function rimKey(r: GfRimSource): number {
  let h = 2166136261;
  const mix = (v: number): void => { keyF[0] = v; h = Math.imul(h ^ keyU[0], 16777619); };
  const rim = r.paintRim;
  mix(rim ? rim.chain : -1); mix(rim ? rim.c0 : 0); mix(rim ? rim.c1 : 0); mix(r.rimAt);
  mix(r.rimGap); mix(r.hoverGlow); mix(r.hoverGlowLength); mix(r.hoverGlowFade); mix(r.hoverGlowWidth);
  return h >>> 0;
}

export interface GfRouteArmRef { chain: number; slot: number; dir: 1 | -1 }

export interface GfRouteSource extends GfLookSource {
  style: { threadWidth: number; casingWidth: number };
  cuspRadius: number;
  junctionArms: ReadonlyArray<{ arms: ReadonlyArray<GfRouteArmRef> }>;
  routesByJn: ReadonlyMap<number, ReadonlyArray<{ a: GfRouteArmRef; b: GfRouteArmRef | null }>>;
  // K1414 (24F): the fan's own resolved bands per junction (joinery's records via the
  // renderer's fieldProbe: arm refs plus the turn's d/m, turn-fit bisection included).
  // When present, bands and discs are built ONLY for these junctions and routes -
  // the fan draws nothing at a junction it has no record for, and its d is the shrunk one.
  // K1424 (26C): no fan-record source: under gf the joinery's records freeze at
  // attach (gf_app nulls filletLayer), so bands build from routesByJn alone and
  // the fan's d comes from routeCorner plus the turn-fit bisection below.
  fullJn: ReadonlySet<number>;
  armNextJointCtrl: (jn: number, a: GfRouteArmRef) => number | null;
}

export interface GfRouteBandInfo {
  chainA: number; chainB: number; nv: number; tau0: number; tau1: number;
  /** The suppression disc (routed-junction ordinal) this band belongs to. */
  disc: number;
  verts: [number, number, number][];
}

/** A hash of the route declaration and the band geometry's params (gf_app's rebuild key). */
export function routeDeclKey(r: GfRouteSource): number {
  let h = 2166136261;
  const mix = (v: number): void => { keyF[0] = v; h = Math.imul(h ^ keyU[0], 16777619); };
  mix(r.cuspRadius); mix(r.style.threadWidth); mix(r.style.casingWidth); mix(r.junctionArms.length); mix(r.routesByJn.size); mix(r.fullJn.size);
  for (const [ji, list] of r.routesByJn) {
    mix(ji); mix(list.length);
    for (const rt of list) {
      mix(rt.a.chain); mix(rt.a.slot); mix(rt.a.dir);
      mix(rt.b ? rt.b.chain : -1); mix(rt.b ? rt.b.slot : 0); mix(rt.b ? rt.b.dir : 0);
    }
  }
  for (const ji of r.fullJn) mix(ji + 1000003);
  // (26C: the fan records' d/m no longer ride the key: bands build from routesByJn.)
  for (let ch = 0; ch < r.chainSamples.length; ch++) mix(r.chainSamples[ch]?.count ?? -1);
  return h >>> 0;
}

interface GfArmLite {
  chain: number; slot: number; dir: number; ok: boolean;
  arc0: number; total: number; closed: boolean; dx: number; dy: number;
  domain: number; toEnd: number; sample0: number; step: number;
}

/**
 * K1414: the K81 route bands for the look form, packed beside the look tables (the K1362 digest
 * never sees them). The centreline of each resolved route (paint_state's routesByJn against the
 * renderer's junctionArms) is built as joinery builds it (its `along` + routeCubic turn, d from
 * routeCorner; the under-gap cap and the turn-fit bisection are the two omissions: under gf's lean
 * the under windows are empty, so the gap cap is infinite, and a turn that leaves the web only
 * recolours field pixels the web already covers). Layout, texels of a GF_TW-wide RGBA32F texture:
 * texel 0 = (band count, disc count, disc base, fan base); per band 6 header texels (the sixth
 * carries its disc ordinal) then, after the discs (4 texels each), every band's vertices
 * (x, y, tau), then the fan bake. K1424 (26C): the fan bake is one float per kept sample in
 * the look positions' layout (its disc ordinal + 1, 0 = no routed fan), the sample's arc
 * along any arm of a routed junction within the fan reach of its root; lkFan reads the
 * label's nearest sample, so suppression and bands act on fan pixels exactly as today's
 * fan does, instead of approximating the fan from labels and arcs.
 * discs (3 texels each: centre/radius/full, chain count + chains), every band's vertices (x, y, tau).
 * A disc per routed junction suppresses the gold in its web outside the bands (today's untraveled
 * base); a fully traveled junction's disc is flagged and suppresses nothing.
 */
export class GfRouteTable {
  nBands = 0;
  nDiscs = 0;
  rows = 0;
  ms = 0;
  bands: GfRouteBandInfo[] = [];
  /** K1424: the fan bake (per kept sample, look positions' layout): disc ordinal + 1, or 0. */
  fan = new Float32Array(0);
  /** The fan bake's first texel in the packed texture. */
  fanBase = 0;
  private scratch = new Float32Array(8);

  /** Build the packed table from the renderer's current samples and route declaration. */
  snapshot(r: GfRouteSource, out?: Float32Array): { data: Float32Array; rows: number } {
    const t0 = performance.now();
    const fh = r.style.threadWidth / 2;
    const casingGap = Math.max(0, (r.style.casingWidth - r.style.threadWidth) / 2);
    const L = fh * 1.25 * r.cuspRadius; // joinery FILLET_REACH_PER_HALF
    const drawWedges = r.cuspRadius > 0.05 && L > r.style.threadWidth * 0.3;
    const fieldReach = Math.max(L, fh * 2) + 0.25;
    const webR = fieldReach;
    const bandEndBase = Math.max(L, fh * 2) + fh;
    const S = this.scratch;
    const armAt = (arm: GfArmLite, s: number, o: number): void => {
      const smp = r.chainSamples[arm.chain] as unknown as SplineSamples;
      sampleAtSafe(smp, normArc(arm.arc0 + arm.dir * s, arm.total, arm.closed), arm.closed, S, 0);
      let tx = S[2] * arm.dir;
      let ty = S[3] * arm.dir;
      const tl = Math.hypot(tx, ty);
      if (tl > 1e-6) { tx /= tl; ty /= tl; } else { tx = arm.dx; ty = arm.dy; }
      S[o] = S[0]; S[o + 1] = S[1]; S[o + 2] = tx; S[o + 3] = ty;
      // (o is always 0 here: S then holds the point and the outward tangent)
    };
    const heads: number[] = [];
    const discs: { x: number; y: number; r: number; full: number; arms: { chain: number; sample: number; step: number }[] }[] = [];
    const vertsAll: number[] = [];
    const bands: GfRouteBandInfo[] = [];
    const fanArms: { chain: number; sample0: number; step: number; disc: number; closed: boolean; count: number; arcPer: number }[] = [];
    for (const [ji, list] of r.routesByJn) {
      if (!list || list.length === 0) continue;
      const jn = r.junctionArms[ji];
      if (!jn) continue;
      // the junction centre: the mean of the arms' joint points (joinery's flank centre)
      let jx = 0; let jy = 0; let nP = 0;
      const lites: GfArmLite[] = [];
      for (const a of jn.arms) {
        const smp = r.chainSamples[a.chain] as unknown as SplineSamples | null;
        const kc = r.kcv[a.chain];
        if (!smp || !kc) { lites.push({ chain: a.chain, slot: a.slot, dir: a.dir, ok: false, arc0: 0, total: 0, closed: false, dx: 1, dy: 0, domain: 0, toEnd: 0, sample0: 0, step: 0 }); continue; }
        const closed = kc.closed;
        const total = smp.totalLength;
        const arc0 = paintArcAt(smp, a.slot, closed);
        sampleAtSafe(smp, normArc(arc0, total, closed), closed, S, 0);
        jx += S[0]; jy += S[1]; nP++;
        lites.push({ chain: a.chain, slot: a.slot, dir: a.dir, ok: true, arc0, total, closed, dx: 1, dy: 0, domain: 0, toEnd: 0, sample0: 0, step: 0 });
      }
      if (nP === 0) continue;
      jx /= nP; jy /= nP;
      for (let i = 0; i < jn.arms.length; i++) {
        const arm = lites[i];
        if (!arm.ok) continue;
        const a = jn.arms[i];
        const smp = r.chainSamples[a.chain] as unknown as SplineSamples;
        sampleAtSafe(smp, paintArcAt(smp, a.slot + a.dir * 0.8, arm.closed), arm.closed, S, 0);
        let dx = S[0] - jx;
        let dy = S[1] - jy;
        const len = Math.hypot(dx, dy);
        if (len < 0.15) { arm.ok = false; continue; }
        dx /= len; dy /= len;
        arm.dx = dx; arm.dy = dy;
        const nextCtrl = r.armNextJointCtrl(ji, a);
        let nextJ = Infinity;
        if (nextCtrl !== null) {
          nextJ = (paintArcAt(smp, nextCtrl, arm.closed) - arm.arc0) * a.dir;
          if (arm.closed && arm.total > 0) { nextJ = ((nextJ % arm.total) + arm.total) % arm.total; }
          if (nextJ <= 1e-3) nextJ = Infinity;
        }
        arm.toEnd = arm.closed ? Infinity : a.dir > 0 ? arm.total - arm.arc0 : arm.arc0;
        arm.domain = Math.min(nextJ / 2, arm.toEnd);
        const arcPer = Math.max(1e-9, r.kd.geom[r.kcv[a.chain].geom * 4 + 1]);
        arm.sample0 = arm.arc0 / arcPer;
        arm.step = a.dir / arcPer;
      }
      const discArms: { chain: number; sample: number; step: number }[] = [];
      for (let i = 0; i < jn.arms.length; i++) if (lites[i].ok) discArms.push({ chain: jn.arms[i].chain, sample: lites[i].sample0, step: Math.abs(lites[i].step) });
      discs.push({ x: jx, y: jy, r: webR, full: r.fullJn.has(ji) ? 1 : 0, arms: discArms });
      // K1424: every arm of this routed junction marks its samples as fan of this disc
      for (let i = 0; i < jn.arms.length; i++) {
        const arm = lites[i];
        if (!arm.ok) continue;
        const a = jn.arms[i];
        const arcPer = Math.max(1e-9, r.kd.geom[r.kcv[a.chain].geom * 4 + 1]);
        fanArms.push({ chain: a.chain, sample0: arm.sample0, step: arm.step, disc: discs.length - 1, closed: arm.closed, count: (r.chainSamples[a.chain] as unknown as SplineSamples).count, arcPer });
      }
      const armReach = (arm: GfArmLite): number => Math.min(L, Math.max(0.3 * L, arm.domain));
      const coverCap = (arm: GfArmLite): number => Math.min(arm.domain, Math.max(fh + casingGap + 2 * CUT_BIAS, drawWedges ? L : 0));
      const bandEnd = (arm: GfArmLite): number => Math.min(arm.toEnd, bandEndBase);
      const along = (arm: GfArmLite, s0: number, s1: number, sign: number, cap: number, incStart: boolean, incEnd: boolean, out: [number, number, number][]): void => {
        const len = Math.abs(s1 - s0);
        const segs = len < 1e-4 ? 0 : Math.min(cap, Math.max(1, Math.ceil(len / 0.08)));
        const k0 = incStart ? 0 : 1;
        const k1 = incEnd ? segs : segs - 1;
        for (let k = k0; k <= k1; k++) {
          const s = segs > 0 ? s0 + ((s1 - s0) * k) / segs : s1;
          armAt(arm, s, 0);
          out.push([S[0], S[1], sign * s]);
        }
      };
      const find = (x: GfRouteArmRef): number => lites.findIndex((_arm, i) => jn.arms[i].chain === x.chain && jn.arms[i].slot === x.slot && jn.arms[i].dir === x.dir);
      for (const rt of list) {
        const ia = find(rt.a);
        const ib = rt.b ? find(rt.b) : -1;
        if (ia < 0 || (rt.b && ib < 0)) continue;
        const A = lites[ia];
        const B = ib >= 0 ? lites[ib] : null;
        if (!A.ok || (B && !B.ok)) continue;
        let d = 0;
        let m = 0.5 * fh;
        const verts: [number, number, number][] = [];
        if (!B) {
          along(A, bandEnd(A), 0, -1, 40, true, true, verts);
        } else {
          const alpha = Math.acos(Math.max(-1, Math.min(1, A.dx * B.dx + A.dy * B.dy)));
          const reach = drawWedges ? Math.min(armReach(A), armReach(B)) : fh;
          d = routeCorner(alpha, reach, fh, coverCap(A), coverCap(B)).d;
          m = Math.max(d, 0.5 * fh);
          // K1424 (26C): joinery's turn-fit bisection, rim-less form (the fan gate
          // in lkRoute keeps a turn that leaves the web from painting outside it):
          // the cubic's inner edge must stay inside either arm's ribbon or the
          // seal disc (0.92 fh), with joinery's 0.04 fh slack past them.
          const turnFits = (dt: number): boolean => {
            if (dt <= 1e-6) return true;
            armAt(A, dt, 0);
            const ax2 = S[0]; const ay2 = S[1]; const atx2 = S[2]; const aty2 = S[3];
            armAt(B, dt, 0);
            const cub: number[] = [];
            routeCubic(ax2, ay2, atx2, aty2, S[0], S[1], S[2], S[3], dt, 14, cub);
            const np = cub.length / 3;
            for (let i = 1; i + 1 < np; i++) {
              let tx = cub[(i + 1) * 3] - cub[(i - 1) * 3];
              let ty = cub[(i + 1) * 3 + 1] - cub[(i - 1) * 3 + 1];
              const tl = Math.hypot(tx, ty);
              if (tl < 1e-9) continue;
              tx /= tl; ty /= tl;
              let px = -ty; let py = tx;
              const cx = jx - cub[i * 3]; const cy = jy - cub[i * 3 + 1];
              if (px * cx + py * cy < 0) { px = -px; py = -py; }
              const ex = cub[i * 3] + px * fh - jx;
              const ey = cub[i * 3 + 1] + py * fh - jy;
              let e = Math.hypot(ex, ey) - 0.92 * fh;
              for (const X of [A, B]) {
                if (ex * X.dx + ey * X.dy < 0) continue;
                const lat = Math.abs(ex * X.dy - ey * X.dx) - fh;
                if (lat < e) e = lat;
              }
              if (e > 0.04 * fh) return false;
            }
            return true;
          };
          if (!turnFits(d)) {
            let lo = 0; let hi = d;
            for (let it = 0; it < 6; it++) { const mid = (lo + hi) / 2; if (turnFits(mid)) lo = mid; else hi = mid; }
            d = lo;
            m = Math.max(d, 0.5 * fh);
          }
          // (fan-record d/m override removed in 26C: see turnFits above)
          along(A, Math.max(bandEnd(A), d), d, -1, 24, true, false, verts);
          // the turn: arm frames at arc d, then routeCubic's points
          armAt(A, d, 0);
          const ax = S[0]; const ay = S[1]; const atx = S[2]; const aty = S[3];
          armAt(B, d, 0);
          const cubic: number[] = [];
          routeCubic(ax, ay, atx, aty, S[0], S[1], S[2], S[3], d, d > 1e-6 ? 14 : 1, cubic);
          for (let k = 0; k + 2 < cubic.length; k += 3) verts.push([cubic[k], cubic[k + 1], cubic[k + 2]]);
          along(B, d, Math.max(bandEnd(B), d), 1, 24, false, true, verts);
        }
        if (verts.length < 2) continue;
        if (verts.length > 64) verts.length = 64;
        // the turn's mid direction and wedge adjacency (the fan's inside-turn fill)
        let mid: [number, number, number] = verts[0];
        for (const v of verts) if (Math.abs(v[2]) < Math.abs(mid[2])) mid = v;
        let mdx = mid[0] - jx;
        let mdy = mid[1] - jy;
        const ml = Math.hypot(mdx, mdy);
        if (ml > 1e-9) { mdx /= ml; mdy /= ml; } else { mdx = A.dx; mdy = A.dy; }
        let inT = 0;
        if (B) {
          const order = lites.map((arm, i) => ({ i, ang: Math.atan2(arm.dy, arm.dx) })).sort((p, q) => p.ang - q.ang);
          const pa = order.findIndex((e) => e.i === ia);
          const pb = order.findIndex((e) => e.i === ib);
          const adjacent = pa >= 0 && pb >= 0 && ((pa + 1) % order.length === pb || (pb + 1) % order.length === pa);
          const cosA = Math.max(-1, Math.min(1, A.dx * B.dx + A.dy * B.dy));
          const between = A.dx * mdx + A.dy * mdy + (B.dx * mdx + B.dy * mdy) > 0;
          if (adjacent && Math.acos(cosA) < Math.PI - 1e-3 && between) inT = 1;
        }
        let boundR = webR;
        for (const v of verts) boundR = Math.max(boundR, Math.hypot(v[0] - jx, v[1] - jy) + fh);
        heads.push(verts.length, A.chain, B ? B.chain : -1, m, A.sample0, B ? B.sample0 : 0, A.step, B ? B.step : 0, jx, jy, webR, boundR, A.dx, A.dy, B ? B.dx : 0, B ? B.dy : 0, mdx, mdy, inT);
        bands.push({ chainA: A.chain, chainB: B ? B.chain : -1, nv: verts.length, tau0: verts[0][2], tau1: verts[verts.length - 1][2], disc: discs.length - 1, verts });
        for (const v of verts) vertsAll.push(v[0], v[1], v[2], 0);
      }
    }
    this.bands = bands;
    this.nBands = bands.length;
    this.nDiscs = discs.length;
    // K1424: the fan bake, in the look positions' layout (as GfPaintTable bakes)
    const fanByChain = new Map<number, typeof fanArms>();
    for (const fa of fanArms) { let l = fanByChain.get(fa.chain); if (!l) fanByChain.set(fa.chain, (l = [])); l.push(fa); }
    let nFan = 0;
    for (let ch = 0; ch < r.chainSamples.length; ch++) if (lookValid(r, ch)) nFan += r.chainSamples[ch]!.count + (r.kcv[ch].closed ? 1 : 0);
    const fan = new Float32Array(nFan);
    {
      let pb = 0;
      for (let ch = 0; ch < r.chainSamples.length; ch++) {
        if (!lookValid(r, ch)) continue;
        const c = r.kcv[ch];
        const count = r.chainSamples[ch]!.count;
        const rawC = new Float32Array(count);
        const fas = fanByChain.get(ch) ?? [];
        for (let k = 0; k < count; k++) {
          let best = -1; let bestAlong = Infinity;
          for (const fa of fas) {
            let dSf = k - fa.sample0;
            if (fa.closed && fa.count > 0) { dSf = ((dSf % fa.count) + fa.count) % fa.count; if (dSf > fa.count / 2) dSf -= fa.count; }
            const along = dSf * Math.sign(fa.step) * fa.arcPer;
            if (along < -1e-9 || along > webR) continue;
            if (along < bestAlong) { bestAlong = along; best = fa.disc; }
          }
          rawC[k] = best + 1;
        }
        const xy = r.chainSamples[ch]!.positions;
        let kv = 0; let l = -1;
        for (let k = 0; k < count; k++) {
          if (l >= 0 && xy[2 * k] === xy[2 * l] && xy[2 * k + 1] === xy[2 * l + 1]) continue;
          fan[pb + kv++] = rawC[k]; l = k;
        }
        if (c.closed && kv > 1 && xy[2 * l] === xy[0] && xy[2 * l + 1] === xy[1]) kv--;
        const end = count + (c.closed ? 1 : 0);
        const pad = c.closed ? fan[pb] : fan[pb + kv - 1];
        for (let k = kv; k < end; k++) fan[pb + k] = pad;
        pb += end;
      }
    }
    this.fan = fan;
    const fanBase = 1 + 6 * bands.length + 4 * discs.length + vertsAll.length / 4;
    this.fanBase = fanBase;
    const nTex = fanBase + nFan;
    const rows = Math.max(1, Math.ceil(nTex / GF_TW));
    const len = rows * GF_TW * 4;
    const data = out && out.length >= len ? out : new Float32Array(len);
    data.fill(0, 0, len);
    data[0] = bands.length; data[1] = discs.length; data[2] = 1 + 6 * bands.length; data[3] = fanBase;
    let vo = 1 + 6 * bands.length + 4 * discs.length;
    for (let bi = 0; bi < bands.length; bi++) {
      const h = heads.slice(bi * 19, bi * 19 + 19);
      const o = (1 + 6 * bi) * 4;
      data[o] = vo; data[o + 1] = h[0]; data[o + 2] = h[1]; data[o + 3] = h[2];
      data[o + 4] = h[3]; data[o + 5] = h[4]; data[o + 6] = h[5]; data[o + 7] = h[6];
      // H2 = (jx, jy, webR, boundR)
      // H2 = (jx, jy, webR, boundR): heads[8..11]
      data[o + 8] = h[8]; data[o + 9] = h[9]; data[o + 10] = h[10]; data[o + 11] = h[11];
      data[o + 12] = h[12]; data[o + 13] = h[13]; data[o + 14] = h[14]; data[o + 15] = h[15];
      // H4 = (stepB, mid dir x, mid dir y, inside-turn flag)
      data[o + 16] = h[7]; data[o + 17] = h[16]; data[o + 18] = h[17]; data[o + 19] = h[18];
      // H5 = (disc ordinal, 0, 0, 0)
      data[o + 20] = bands[bi].disc; data[o + 21] = 0; data[o + 22] = 0; data[o + 23] = 0;
      vo += bands[bi].nv;
    }
    for (let di = 0; di < discs.length; di++) {
      const o = (1 + 6 * bands.length + 4 * di) * 4;
      const D = discs[di];
      data[o] = D.x; data[o + 1] = D.y; data[o + 2] = D.r; data[o + 3] = D.full;
      for (let ai = 0; ai < 4; ai++) {
        const A = D.arms[ai];
        data[o + 4 + ai * 2] = A ? A.chain : -1; data[o + 5 + ai * 2] = A ? A.sample : 0;
        data[o + 12 + ai] = A ? A.step : 0;
      }
    }
    const vBase = (1 + 6 * bands.length + 4 * discs.length) * 4;
    for (let i = 0; i < vertsAll.length; i++) data[vBase + i] = vertsAll[i];
    for (let i = 0; i < nFan; i++) data[(fanBase + i) * 4] = fan[i];
    this.rows = rows;
    this.ms = performance.now() - t0;
    return { data, rows };
  }
}

/**
 * K1424: the shader lkFan's twin: chain c's fan disc ordinal at segment k and
 * fraction u in a baked fan array (positions layout: base b, n samples), or -1.
 * The nearest kept sample decides, as the shader's texel fetch does.
 */
export function fanAt(F: ArrayLike<number>, b: number, n: number, closed: boolean, k: number, u: number): number {
  const last = closed ? n : n - 1;
  let kk = u < 0.5 ? k : k + 1;
  if (kk < 0) kk = 0;
  if (kk > last) kk = last;
  return Math.round(F[b + kk]) - 1;
}

/** Today's crossing gap beyond the over thread's edge (world units): the casing's margin plus crossing_gaps' CUT_BIAS. */
export function lookGap(r: { style: { casingWidth: number; threadWidth: number } }): number {
  return Math.max(0, (r.style.casingWidth - r.style.threadWidth) / 2) + CUT_BIAS;
}

/** K1398: today's under-thread fade length at a crossing (world units): the renderer's fadeLength, gap_mask.ts's fade. */
export function lookFade(r: { fadeLength: number }): number {
  return Math.max(0, r.fadeLength);
}

/** K1458: a fused joint's clearance along a crossing's under thread (crossing_gaps.ts jointClear; JOINT_CLEAR_REACH_SCALE 0.55). */
export function gfJointClear(fillHalf: number, filletReachPerHalf: number, cuspRadius: number, gap: number): number {
  return Math.max(fillHalf * 1.1, fillHalf * filletReachPerHalf * cuspRadius * 0.55) + gap;
}

/** K1584 s3: the tables' fields gfJointArcs reads (tables.ts GfTables). */
export interface GfJointArcTables {
  nK: number; kThru: ArrayLike<number>; kCa: ArrayLike<number>; kCb: ArrayLike<number>; kSa: ArrayLike<number>; kSb: ArrayLike<number>;
  cV0: ArrayLike<number>; cNV: ArrayLike<number>; cClosed: ArrayLike<number>; cLen: ArrayLike<number>; vs: ArrayLike<number>;
  /** K1584 s4: the corner centres and the field vertices, for each tangent point's side (gfJointArcs' lats). */
  kCx?: ArrayLike<number>; kCy?: ArrayLike<number>; vx?: ArrayLike<number>; vy?: ArrayLike<number>;
  /** K1584 s11: the tight-turn gate and each corner's opening, for each point's wedge flag (gfJointArcs' wedges). */
  kTight?: ArrayLike<number>; kTheta?: ArrayLike<number>;
}

/**
 * K1584 s3: where each chain's outline turns into a fused joint's: every joint corner's tangent point on it (tables
 * kCa/kSa and kCb/kSb; a through pass's bend corner, kThru, is no joint), as a fractional field-vertex index (the kept
 * sample, past an open chain's pad vertex). GfGapTable measures a crossing side's joint room to these (GfGapSource.jointArcs).
 * K1584 s4: given lats (and T's corner centres and vertices), each point's side of its chain, in the same order: +1 when
 * the corner's centre lies left of the chain's direction (the left normal (-ty, tx)), -1 right, 0 unknown (both
 * borders). That border alone turns into the joint's outline there (GfGapSource.jointLats).
 * K1584 s7: given partners, each point's corner's other chain, in the same order (GfGapSource.jointPartners).
 * K1584 s11: given wedges, 1 where the point's corner is a tight turn opening under GAP_WEDGE_THETA (the test lkBall's
 * open form makes, on the same float32 values), else 0, in the same order (GfGapSource.jointWedges).
 */
export function gfJointArcs(T: GfJointArcTables, lats?: Map<number, number[]>, partners?: Map<number, number[]>, wedges?: Map<number, number[]>): Map<number, number[]> {
  const out = new Map<number, number[]>();
  const line = Math.fround(1 + GAP_WEDGE_THETA);
  const wedgeOf = (k: number): number => (T.kTight?.[k] === 1 && T.kTheta && Math.fround(1 + T.kTheta[k]) < line ? 1 : 0);
  const latOf = (k: number, c: number, f: number): number => {
    if (!T.kCx || !T.kCy || !T.vx || !T.vy) return 0;
    const v0 = T.cV0[c], n = T.cNV[c], pad = T.cClosed[c] !== 1 && T.vs[v0] < 0 ? 1 : 0, b = v0 + pad, last = v0 + n - 1;
    let i = Math.min(last, b + Math.floor(f)), j = Math.min(last, i + 1);
    if (j === i) i = Math.max(b, j - 1);
    if (j === i) return 0;
    const u = Math.max(0, Math.min(1, f - (i - b)));
    const tx = T.vx[j] - T.vx[i], ty = T.vy[j] - T.vy[i];
    const px = T.vx[i] + tx * u, py = T.vy[i] + ty * u;
    const cr = tx * (T.kCy[k] - py) - ty * (T.kCx[k] - px);
    return Number.isFinite(cr) && cr !== 0 ? Math.sign(cr) : 0;
  };
  for (let k = 0; k < T.nK; k++) {
    if (T.kThru[k] === 1) continue;
    for (const [c, s0, pc] of [[T.kCa[k], T.kSa[k], T.kCb[k]], [T.kCb[k], T.kSb[k], T.kCa[k]]]) {
      if (!(c >= 0 && c < T.cV0.length) || !Number.isFinite(s0)) continue;
      const v0 = T.cV0[c], n = T.cNV[c], closed = T.cClosed[c] === 1, pad = !closed && T.vs[v0] < 0 ? 1 : 0;
      let lo = v0 + pad, hi = v0 + n - 1;
      if (hi < lo) continue;
      let s = s0;
      if (closed && T.cLen[c] > 0) s = T.vs[lo] + ((((s - T.vs[lo]) % T.cLen[c]) + T.cLen[c]) % T.cLen[c]);
      let f: number;
      if (s <= T.vs[lo]) f = 0;
      else if (s >= T.vs[hi]) f = hi - lo;
      else {
        const b = lo;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.vs[m] <= s) lo = m; else hi = m; }
        const ds = T.vs[hi] - T.vs[lo];
        f = lo - b + (ds > 0 ? (s - T.vs[lo]) / ds : 0);
      }
      let L = out.get(c);
      if (!L) { L = []; out.set(c, L); }
      L.push(f);
      if (lats) {
        let A = lats.get(c);
        if (!A) { A = []; lats.set(c, A); }
        A.push(latOf(k, c, f));
      }
      if (partners) {
        let P = partners.get(c);
        if (!P) { P = []; partners.set(c, P); }
        P.push(pc);
      }
      if (wedges) {
        let Wd = wedges.get(c);
        if (!Wd) { Wd = []; wedges.set(c, Wd); }
        Wd.push(wedgeOf(k));
      }
    }
  }
  return out;
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
int lkJ; float lkS; float lkK; int lkJb; float lkSb; float lkKb; vec4 lkCo = vec4(0.0); float lkHi = 0.0; vec3 lkHiC = vec3(0.0); float lkHiA = 0.0; float lkE = 1.0;
int lkj[MAXS]; float lks[MAXS];
// K1584 s6: the ball's scale on the gap's margin and fade (lkBall), 1 everywhere else
float lkBs = 1.0;
float lkTw = 0.0;
`;
const M_ANCHOR = "\nvoid main() {\n";
function lkF(v: number): string { const s = String(v); return /[.eE]/.test(s) ? s : s + ".0"; }
const M_LOOK = `
uniform highp sampler2D uLk; uniform highp sampler2D uLkP; uniform float uLkG; uniform float uLkF;
uniform highp sampler2D uPt; uniform vec3 uGold;
uniform highp sampler2D uGw; uniform float uGwLive;
uniform vec4 uMkA[4]; uniform vec4 uMkB[4];
uniform highp sampler2D uRt;
uniform vec4 uRimA; uniform vec4 uRimB; uniform vec4 uRimC; uniform vec3 uHov;
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
vec4 GW4(int i) { return texelFetch(uGw, ivec2(i & TWM, i >> LOG), 0); }
float GW(int i) { return GW4(i).x; }
// K1423: chain c's gap-window winM at segment q (gf_look.ts GfGapTable's bake, lkPaint's walk)
float lkWinM(int c, vec2 q) {
  vec4 H = LKT(c);
  if (H.z < 1.0) return -64.0;
  bool closed = H.w > 0.5;
  int k = int(q.x); float u = q.y;
  if (!closed && F(uOV + int(F(uOCh + 3 * c).x)).z < 0.0) k -= 1;
  int last = closed ? int(H.z) : int(H.z) - 1;
  if (k < 0) { k = 0; u = 0.0; }
  if (k >= last) { k = last; u = 0.0; }
  int b = int(H.y);
  return mix(GW(b + k), GW(b + min(k + 1, last)), u);
}
// K1458: the over pass whose window wins at segment q (the bake's y, z, w: over chain, its kept sample
// nearest the under sample, the scan half-range in samples), or x < 0 when none does
vec3 lkGwSlot(int c, vec2 q) {
  vec4 H = LKT(c);
  if (H.z < 1.0) return vec3(-1.0, 0.0, 0.0);
  bool closed = H.w > 0.5;
  int k = int(q.x); float u = q.y;
  if (!closed && F(uOV + int(F(uOCh + 3 * c).x)).z < 0.0) k -= 1;
  int last = closed ? int(H.z) : int(H.z) - 1;
  if (k < 0) { k = 0; u = 0.0; }
  if (k >= last) { k = last; u = 0.0; }
  int b = int(H.y);
  vec4 A = GW4(b + k); vec4 B = GW4(b + min(k + 1, last));
  // K1584 s4: the scan range is the wider slot's, its border code (w's fraction) the nearer slot's, as x's is
  if (A.y >= 0.0 && floor(B.y) == floor(A.y) && abs(B.z - A.z) < A.w + B.w) return vec3(u < 0.5 ? A.y : B.y, mix(A.z, B.z, u), max(floor(A.w), floor(B.w)) + fract(u < 0.5 ? A.w : B.w));
  vec4 P = (u < 0.5 && A.y >= 0.0) || B.y < 0.0 ? A : B;
  return P.yzw;
}
// K1458: the nearest point to p on chain c within w samples of kept sample s: (distance, segment, fraction)
vec3 lkNearOn(int c, float s, float w, vec2 p, float aU, float sx) {
  vec4 C0 = F(uOCh + 3 * c); int cV0 = int(C0.x); int nseg = int(C0.y) - 1; bool closed = C0.z > 0.5;
  int k0 = int(s + 0.5);
  if (!closed && F(uOV + cV0).z < 0.0) k0 += 1;
  int n = min(int(w) + 1, 40);
  float per = closed ? F(uOV + cV0 + nseg).z : 0.0;
  float bd = BIG; vec2 bq = vec2(-1.0, 0.0);
  for (int i = -40; i <= 40; i++) {
    if (i < -n) continue;
    if (i > n) break;
    int q = k0 + i;
    if (closed) q = pmod(q, nseg); else if (q < 0 || q >= nseg) continue;
    vec4 A = F(uOV + cV0 + q); vec4 B = F(uOV + cV0 + q + 1);
    vec2 d = B.xy - A.xy; float l2 = dot(d, d);
    float t = l2 > 0.0 ? clamp(dot(p - A.xy, d) / l2, 0.0, 1.0) : 0.0;
    // K1460 s4: a self crossing (aU >= 0: the under pixel's own arc on this chain) skips a segment whose nearest
    // point lies within sx of that arc, as today's gapSegFull does (selfEx); the segment-count midpoint switch it
    // replaces cut the kink loop at its midpoint (a radial edge at long fades)
    if (aU >= 0.0) { float da = mix(A.z, B.z, t) - aU; if (per > 0.0) da -= per * floor(da / per + 0.5); if (abs(da) < sx) continue; }
    vec2 e = p - A.xy - d * t; float d2 = dot(e, e);
    if (d2 < bd) { bd = d2; bq = vec2(float(q), t); }
  }
  return vec3(sqrt(bd), bq);
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
  return mix(DT((b + k) * 4 + sub), DT((b + min(k + 1, last)) * 4 + sub), u);
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
// K1396: chain c's arc at segment q (the vertex arcs the scan's s interpolates)
float lkArc(int c, vec2 q) { vec4 C0 = F(uOCh + 3 * c); int v = int(C0.x) + int(q.x); vec4 A = F(uOV + v); vec4 B = F(uOV + v + 1); return mix(A.z, B.z, q.y); }
float lkTeleAcross(float e) { return 1.0 - lkSmooth((1.0 - e) / ${lkF(PAINT_CONST.RIM_EDGE)} * uTeleScale); }
// K1447: today's border fan fills its interior with the dark stroke and draws
// no pulse indication there; the field labels the fan's pixels by the arm
// piece whose crest runs to the junction, so the pulse hi would paint the
// fan (a white X at the head). The bake carries each sample's arc distance
// from its crest's junction (dyn texel 3); suppress the hi within the fan's
// reach of the junction, ramping back over half a halfwidth so the arm's
// pulse starts at the fan's rim, as today's ribbon pulse does.
float lkFanWin(int c, vec2 q) { return ss(${lkF(2.5)} * uH, ${lkF(3.0)} * uH, lkDyn(c, q, 3).x); }
uniform highp sampler2D uFx; uniform float uFxStyle; uniform vec4 uFxPh; uniform float uFxLive;
vec4 FT(int i) { return texelFetch(uFx, ivec2(i & TWM, i >> LOG), 0); }
// K1395: chain c's baked FX at segment q (gf_look.ts GfFxTable / fxAt, lkDyn's walk over the 2-texel groups)
vec4 lkFx(int c, vec2 q, int sub) {
  vec4 H = LKT(c);
  if (H.z < 1.0) return sub == 0 ? vec4(0.0, 1.0, 9.0, 0.0) : vec4(0.0, 0.0, -1e9, -1e9);
  bool closed = H.w > 0.5;
  int k = int(q.x); float u = q.y;
  if (!closed && F(uOV + int(F(uOCh + 3 * c).x)).z < 0.0) k -= 1;
  int last = closed ? int(H.z) : int(H.z) - 1;
  if (k < 0) { k = 0; u = 0.0; }
  if (k >= last) { k = last; u = 0.0; }
  int b = int(H.y);
  return mix(FT((b + k) * 2 + sub), FT((b + min(k + 1, last)) * 2 + sub), u);
}
// paint_glsl kBurn over the baked age (flicker phases live in uFxPh, as advanceClocks reduces them)
vec3 lkBurn(vec3 rgb, float t, float k, bool roots) {
  if (t >= ${lkF(PAINT_CONST.BURN_RECOVER_END)}) return rgb;
  if (roots) {
    float brown = 1.0 - lkSmooth((t - ${lkF(PAINT_CONST.ROOTS_START)}) / ${lkF(PAINT_CONST.ROOTS_FADE)});
    if (brown > 0.004) rgb += (vec3(0.35, 0.25, 0.18) - rgb) * brown;
    return rgb;
  }
  float heatW = 1.0 - lkSmooth((t - 0.015) / 0.05);
  float heatY = lkSmooth(t / 0.02) * (1.0 - lkSmooth((t - 0.1) / 0.12));
  float ember = lkSmooth(t / 0.08) * (1.0 - lkSmooth((t - ${lkF(PAINT_CONST.BURN_EMBER_END)}) / 0.25));
  float chr = lkSmooth((t - ${lkF(PAINT_CONST.BURN_EMBER_END)} * 0.55) / 0.25) * (1.0 - lkSmooth((t - ${lkF(PAINT_CONST.BURN_CHAR_END)}) / (${lkF(PAINT_CONST.BURN_RECOVER_END)} - ${lkF(PAINT_CONST.BURN_CHAR_END)})));
  rgb += (vec3(0.14, 0.11, 0.1) - rgb) * (chr * 0.92);
  if (ember > 0.01) {
    float spatial = 1.0 - chr;
    float fl = 0.5 + spatial * (0.3 * sin(uFxPh.x + k * 0.31) + 0.2 * sin(uFxPh.y + k * 0.83)) + (1.0 - spatial) * uFxPh.w;
    float e = ember * 0.85 * (1.0 - heatW * 0.7);
    rgb += (vec3(1.0 - 0.3 * fl, 0.54 - 0.35 * fl, 0.16 - 0.08 * fl) - rgb) * e;
  }
  if (heatY > 0.001) rgb += (vec3(1.0, 0.84, 0.3) - rgb) * heatY;
  if (heatW > 0.001) rgb += (vec3(1.0, 0.97, 0.88) - rgb) * heatW;
  return rgb;
}
// paint_glsl kRainbowBlend: the 6 stripes across the thread (side 0..1), then the white wash (the bulb).
// K1395 s1: side runs like today's vUV.y: 0 on the left normal (-t.y, t.x), where ribbon_mesh puts uv.y 0.
vec3 lkRainbow(vec3 base, float pIn, float side) {
  float p = min(pIn, 1.0);
  int bi = int(min(side, 0.99999) * 6.0);
  vec3 stripe = bi == 0 ? vec3(0.92, 0.15, 0.18) : bi == 1 ? vec3(1.0, 0.55, 0.08) : bi == 2 ? vec3(1.0, 0.88, 0.12) : bi == 3 ? vec3(0.12, 0.78, 0.3) : bi == 4 ? vec3(0.15, 0.42, 1.0) : vec3(0.58, 0.25, 0.95);
  float rb = smoothstep(0.30, 0.52, p);
  float wh = smoothstep(0.06, 0.26, p) * (1.0 - smoothstep(0.38, 0.60, p));
  base = mix(base, stripe, rb);
  return mix(base, vec3(0.93, 0.93, 0.95), wh * 0.6);
}
// K1389 s1: today's crossing gap: a piece above the label (key past zt) within h + gap of p, outside its own edge.
// K1398: the cut ramps over today's fade (uLkF = fadeLength, world units) instead of one pixel, so the
// under thread shades softly. K1415: the width is today's fadeP at p (gap_mask.ts's keep): fade scaled by
// max(sin, 0.2) between the under tangent at its foot (qU on chain cU) and the over piece's tangent at its
// foot, floored at one pixel (2 * uAA); the per-side junction-clearance scales (fadeScaleNeg/Pos) have no tables counterpart and stay 1. K1417: no casing band (the gap clears to the background in every look).
// K1396: explore_glsl.ts kExDotsSd (the dots/beacon end shape; lkExDot = the nearest shape is a dot)
float lkExDot;
float lkExDotsSd(float s, float la, float lf) {
  float tw = uExTw;
  float g = clamp(lf / (${lkF(EXPLORE_DOTS_SPAN)} * tw), 1e-3, 1.0);
  float ca = 0.5 * tw * g;
  float cb = 0.5 * tw;
  float k0 = length(vec2(s / ca, la / cb));
  float k1 = length(vec2(s / (ca * ca), la / (cb * cb)));
  float dCap = k1 > 1e-6 ? k0 * (k0 - 1.0) / k1 : -ca;
  float dDot = min(length(vec2(s - ${lkF(EXPLORE_DOT_AT[0])} * lf, la)) - ${lkF(EXPLORE_DOT_R[0])} * tw * g, length(vec2(s - ${lkF(EXPLORE_DOT_AT[1])} * lf, la)) - ${lkF(EXPLORE_DOT_R[1])} * tw * g);
  lkExDot = dDot < dCap ? 1.0 : 0.0;
  return min(dCap, dDot);
}
// K1396: explore_glsl.ts kExploreLook (la = the point's signed world distance from the centreline)
float lkExploreLook(int look, float v, float u, float s, float lf, float la, float sideFw, float pxW) {
  lkExDot = 0.0;
  if (u < 0.0 || look < 2) return v;
  if (look == 2) return 1.0 - lkSmooth((u - 0.4) / 0.6);
  if (look == 4) {
    float fl = la / max(uH, 1e-6);
    float cov = 0.0;
    for (int i = -1; i <= 1; i++) {
      float fi = float(i);
      float cf = fi * (0.5 + 0.3 * u) + 0.12 * u * sin(s * 7.0 + fi * 2.1);
      float wf = mix(0.34, 0.1, u);
      cov = max(cov, clamp((wf - abs(fl - cf)) / max(4.0 * sideFw, 1e-4) + 0.5, 0.0, 1.0));
    }
    cov = mix(1.0, cov, lkSmooth(u / 0.12));
    return cov * (1.0 - lkSmooth((u - 0.5) / 0.5));
  }
  float dd = lkExDotsSd(s, la, lf);
  return clamp(-dd / pxW + 0.5, 0.0, 1.0) * (uExOn > 1.5 ? 1.0 : 1.0 - 0.55 * u * u);
}
vec4 RT(int i) { return texelFetch(uRt, ivec2(i & TWM, i >> LOG), 0); }
// K1414: a band arm's material at sample sf (a segment+fraction position): its section colour mixed to gold
vec3 lkMat(int c, float sf) {
  vec4 H = LKT(c);
  if (H.z < 1.0) return vec3(0.0);
  bool closed = H.w > 0.5;
  float s = closed ? mod(sf, H.z) : clamp(sf, 0.0, max(H.z - 1.0, 0.0));
  vec2 q = vec2(floor(s), fract(s));
  vec4 col = lkColour(c, q);
  return mix(col.rgb, uGold, lkPaint(c, q));
}
// K1414: the label foot's sample float and the pixel's distance from the foot point (the rim's across)
vec2 lkFoot(int c, vec2 q, vec2 p) {
  vec4 C0 = F(uOCh + 3 * c); int v = int(C0.x) + int(q.x);
  vec4 A = F(uOV + v); vec4 B = F(uOV + v + 1);
  float sf = q.x + q.y;
  if (!(C0.z > 0.5) && F(uOV + int(C0.x)).z < 0.0) sf -= 1.0;
  return vec2(sf, length(p - mix(A.xy, B.xy, q.y)));
}
// K1424 (26C): the label's fan disc ordinal from the baked fan table (gf_look.ts fanAt's
// twin): the nearest kept sample's disc + 1, 0 = no routed fan. Fan pixels are exactly
// the samples on a routed junction's arms within the fan reach of their roots, so a
// turn-centre pixel won by a third arm still reads its junction here.
int lkFan(int c, vec2 q) {
  vec4 H = LKT(c);
  if (H.z < 1.0) return -1;
  bool closed = H.w > 0.5;
  int k = int(q.x); float u = q.y;
  if (!closed && F(uOV + int(F(uOCh + 3 * c).x)).z < 0.0) k -= 1;
  int last = closed ? int(H.z) : int(H.z) - 1;
  int kk = u < 0.5 ? k : k + 1;
  if (kk < 0) kk = 0;
  if (kk > last) kk = last;
  return int(RT(int(RT(0).w + 0.5) + int(H.y + 0.5) + kk).x + 0.5) - 1;
}
// K1414: the K81 route bands over the label's colour (junction_field's junctionField, band part):
// a routed junction's web outside its bands reads the untraveled material (its disc), inside a band
// the two arms' composed material blended over tau in [-m, m], oldest band first. ROUTE_BAND_RAMP
// 2.5 px centred on the thread half-width (uH); inside the turn the whole wedge takes the band.
vec3 lkRoute(vec3 col, int lab, vec2 lq, vec2 p, bool web) {
  vec4 hd = RT(0);
  int nB = int(hd.x + 0.5); int nD = int(hd.y + 0.5); int dBase = int(hd.z + 0.5);
  if (nB <= 0 && nD <= 0) return col;
  vec3 outc = col;
  float ls = lq.x + lq.y;
  // K1424: suppression by fan membership: a fan pixel of a routed junction reads the
  // untraveled material (its section colour, no gold) outside the bands, whatever
  // arm or corner won the pixel - today's fan base, exactly.
  int fanD = lkFan(lab, lq);
  if (fanD >= 0 && fanD < nD) {
    vec4 D0 = RT(dBase + 4 * fanD);
    if (length(p - D0.xy) < D0.z && !(D0.w > 0.5)) outc = lkColour(lab, lq).rgb;
  }
  // (26C: the former arc-based disc loop is the fanD test above)
  float rw = 1.25 * 2.0 * uAA;
  for (int bi = 0; bi < 256; bi++) {
    if (bi >= nB) break;
    vec4 H0 = RT(1 + 6 * bi); vec4 H1 = RT(2 + 6 * bi); vec4 H2 = RT(3 + 6 * bi); vec4 H3 = RT(4 + 6 * bi); vec4 H4 = RT(5 + 6 * bi); vec4 H5 = RT(6 + 6 * bi);
    int bDisc = int(H5.x + 0.5); bool inFan = fanD == bDisc;
    if (length(p - H2.xy) > H2.w) continue;
    int nv = int(H0.y + 0.5); int cA = int(H0.z + 0.5); int cB = int(H0.w + 0.5); int vo = int(H0.x + 0.5);
    vec2 bA = vec2(1e20, 0.0); vec2 bB = vec2(1e20, 0.0);
    vec4 q0 = RT(vo);
    for (int k = 0; k < 63; k++) {
      if (k + 1 >= nv) break;
      vec4 q1 = RT(vo + 1 + k);
      vec2 d = q1.xy - q0.xy;
      vec2 w = p - q0.xy;
      float l2 = dot(d, d);
      float u = l2 > 1e-12 ? clamp(dot(w, d) / l2, 0.0, 1.0) : 0.0;
      float dz = q1.z - q0.z;
      float uz = dz > 1e-9 ? clamp(-q0.z / dz, 0.0, 1.0) : step(q0.z, 0.0);
      if (q0.z <= 0.0) {
        float ua = min(u, uz);
        vec2 oa = w - d * ua;
        float da = dot(oa, oa);
        if (da < bA.x) bA = vec2(da, mix(q0.z, q1.z, ua));
      }
      if (q1.z >= 0.0) {
        float ub = max(u, uz);
        vec2 ob = w - d * ub;
        float db = dot(ob, ob);
        if (db < bB.x) bB = vec2(db, mix(q0.z, q1.z, ub));
      }
      q0 = q1;
    }
    bool nearA = bA.x <= bB.x;
    float bd = sqrt(nearA ? bA.x : bB.x);
    float cov = 1.0 - ss(uH - rw, uH + rw, bd);
    bool inT = false;
    if (inFan && H4.w > 0.5 && cB >= 0) {
      vec2 v = p - H2.xy; float lv = length(v);
      if (lv < H2.z && lv > 1e-6) {
        vec2 vn = v / lv; vec2 dirA = H3.xy; vec2 dirB = H3.zw; vec2 md = H4.yz;
        float cAm = dirA.x * md.y - dirA.y * md.x;
        float cmB = md.x * dirB.y - md.y * dirB.x;
        float cAv = dirA.x * vn.y - dirA.y * vn.x;
        float cvB = vn.x * dirB.y - vn.y * dirB.x;
        inT = cAv * cAm >= -1e-4 && cvB * cmB >= -1e-4;
      }
    }
    if (inT) cov = 1.0;
    // the label's own arm of this band (chain alone cannot tell a junction's two
    // same-chain arms apart: the third arm's along is negative from the root)
    float alongA = H1.w != 0.0 ? (ls - H1.y) / H1.w : -1.0;
    float alongB = H4.x != 0.0 ? (ls - H1.z) / H4.x : -1.0;
    bool armPixel = (lab == cA && alongA > -0.25) || (cB >= 0 && lab == cB && alongB > -0.25);
    if (cov > 0.0 && ((web && armPixel) || (!web && inFan && inT))) {
      float wB = nearA ? 0.0 : 1.0;
      if (inT) { float da = sqrt(bA.x); float db = sqrt(bB.x); float s = max(0.5 * min(da, db), 1e-6); wB = ss(-s, s, da - db); }
      vec3 bm = vec3(0.0); float wsum = 0.0;
      for (int sd = 0; sd < 2; sd++) {
        float ws = sd == 0 ? 1.0 - wB : wB;
        if (ws <= 0.0) continue;
        float tau = sd == 0 ? bA.y : bB.y;
        float sArm = sd == 0 ? H1.y + H1.w * max(-tau, 0.0) : H1.z + H4.x * max(tau, 0.0);
        float stp = abs(sd == 0 ? H1.w : H4.x);
        vec4 AH = LKT(sd == 0 ? cA : cB);
        float ad = abs(ls - sArm);
        if (AH.w > 0.5 && AH.z > 1.0) ad = min(ad, abs(AH.z - ad));
        // K1424: a fan pixel takes the band's material by tau alone (its label may
        // be a third arm, whose sample float cannot be compared to the band's)
        if (!inFan && (!(stp > 0.0) || ad / stp > 1.25)) continue;
        vec3 sm = lkMat(cA, H1.y + H1.w * max(-tau, 0.0));
        if (cB >= 0) sm = mix(sm, lkMat(cB, H1.z + H4.x * max(tau, 0.0)), ss(-H1.x, H1.x, tau));
        bm += ws * sm; wsum += ws;
      }
      if (wsum > 0.0) outc = mix(outc, bm / wsum, cov);
    }
  }
  return outc;
}
// K1414: the hover rim over the label's colour (paint_math kPaintAt's RIM along the run, shaped
// across by kRimAcross from the foot distance; kRimOver's whitening). uRimA = (chain, run start,
// run end, hover point) in sample floats, uRimB = (end gap, strength, length, end fade) in world
// arc, uRimC = (rim scale, K_BAND, arc per sample, closed). Not on webs: the end gap keeps the
// junction reach dark, as today's arm strips carry no across coordinate.
float lkRimF(int lab, vec2 lq, vec2 p) {
  int rc = int(uRimA.x + 0.5);
  // (the run's range check follows)
  if (rc < 0 || rc != lab || !(uRimB.y > 0.0)) return 0.0;
  vec2 ft = lkFoot(lab, lq, p);
  float s0 = uRimA.y; float s1 = uRimA.z;
  float s = ft.x;
  if (uRimC.w > 0.5) s = s0 + mod(s - s0, max(LKT(lab).z, 1.0));
  if (s < s0 || s > s1) return 0.0;
  float arcPer = uRimC.z;
  float d = abs(s - uRimA.w) * arcPer;
  float dEnd = min(s - s0, s1 - s) * arcPer;
  float span = (s1 - s0) * arcPer;
  float fade = min(max(uRimB.w, 1e-4), max(1e-4, 0.6 * (0.5 * span - uRimB.x)));
  float g = uRimB.y * (1.0 - ss(0.0, 1.0, d / max(uRimB.z, 1e-4))) * ss(0.0, 1.0, (dEnd - uRimB.x) / fade);
  if (!(g > 0.0)) return 0.0;
  float e = clamp(ft.y / uH, 0.0, 1.0);
  float rim = g * (1.0 - ss(0.0, 1.0, ((1.0 - e) / 0.85) * uRimC.x));
  return rim > 0.0 ? rim : 0.0;
}
vec3 lkRim(vec3 col, int lab, vec2 lq, vec2 p) {
  float rim = lkRimF(lab, lq, p);
  if (!(rim > 0.0)) return col;
  return col + (uHov - col) * (uRimC.y * clamp(rim, 0.0, 1.0));
}
vec2 lkTan(int c, float q) {
  vec4 C0 = F(uOCh + 3 * c); int v = int(C0.x) + int(q);
  vec4 A = F(uOV + v); vec4 B = F(uOV + v + 1);
  vec2 t = B.xy - A.xy; float l = length(t);
  return l > 0.0 ? t / l : vec2(1.0, 0.0);
}
// K1460: chain c's tangent at segment q.x, fraction q.y: central-difference tangents at the segment's ends blended
// by q.y (today's gap shader: its under tangent is the ribbon's per-vertex tangent, interpolated; its over tangent
// is blended so). lkTan's per-segment direction steps at every vertex, and the fade's width (fade * sin) with it:
// wedge-shaped bands and a stepped edge on a long fade along a curved thread.
vec2 lkTanS(int c, vec2 q) {
  vec4 C0 = F(uOCh + 3 * c); int v0 = int(C0.x); int nv = int(C0.y); bool closed = C0.z > 0.5;
  int k = int(q.x); int n = closed ? nv - 1 : nv;
  int im = closed ? pmod(k - 1, n) : max(k - 1, 0); int i0 = closed ? pmod(k, n) : k;
  int i1 = closed ? pmod(k + 1, n) : min(k + 1, nv - 1); int i2 = closed ? pmod(k + 2, n) : min(k + 2, nv - 1);
  vec2 ta = F(uOV + v0 + i1).xy - F(uOV + v0 + im).xy; vec2 tb = F(uOV + v0 + i2).xy - F(uOV + v0 + i0).xy;
  ta /= max(length(ta), 1e-6); tb /= max(length(tb), 1e-6);
  vec2 t = mix(ta, tb, q.y); float l = length(t);
  return l > 1e-6 ? t / l : lkTan(c, q.x);
}
// K1459: today's junction cuts over the baked per-side margins (fabric_sdf kJunctionCut /
// kJunctionSideCut): 1 outside, 0 deep inside the fan's share, a one-pixel ramp at the edge.
// The pixel's side is the sign of its lateral offset from the label's centreline, as the
// ribbon mesh's vUV.y side is (left = the entry's left, chain terms).
float lkJCut(int c, vec2 q, vec2 p, vec4 f1) {
  vec2 tn = lkTan(c, q.x);
  float sd = dot(p - lkFoot(c, q), vec2(-tn.y, tn.x));
  float mg = sd < 0.0 ? f1.z : f1.w;
  if (mg < -1e8) return 1.0;
  return 1.0 - clamp(mg / max(2.0 * uAA, 1e-5) + 0.5, 0.0, 1.0);
}
// the cut at distance d from an over centreline (gap_mask.ts gapKeepAt's ramp), inside today's window
// (K1423: the cut lives only inside the window marched along the under thread, and its fade part
// dissolves over the window's last half fade of arc)
// K1458: sc = the side's (margin, fade) clearance scales near a fused joint (today's marginScale / fadeScale)
// K1584 s6: lkBs (1 but at a ball, lkBall) scales an open border's margin and fade; a closed one (sc.x < 0) keeps its own
float lkCut(float d, float sinT, float exg, float wm, float pxw, vec2 sc) {
  float inner = ss(uH - uAA, uH + uAA, d);
  float bs = sc.x > 0.0 ? lkBs : 1.0;
  float fw = max(uLkF * sc.y * bs * max(sinT, 0.2), 2.0 * uAA);
  float e = d - uH - uLkG * sc.x * bs;
  float kk = clamp((e + 0.5 * pxw) / max(fw, pxw), 0.0, 1.0);
  float cut = (1.0 - kk * kk * (3.0 - 2.0 * kk)) * inner * exg;
  if (uGwLive > 0.5) {
    float fs = clamp(wm / max(0.5 * uLkF, pxw), 0.0, 1.0);
    fs = mix(1.0, fs * fs * (3.0 - 2.0 * fs), clamp(e / pxw, 0.0, 1.0));
    cut *= clamp(wm / pxw + 0.5, 0.0, 1.0) * fs;
  }
  return cut;
}
// K1584 s6 (Levi, 2026-11-24: "taper the gap--it should be widen out from the ball center, so it shows as a wedge cut
// out from the center; the fade should then also taper here"): a tight turn's ball (K1572 s41, the corner's texel 5 .w)
// on the label's own chain, within ${lkF(GAP_BALL_ARC)} of arc of the corner's tangent point there, scales the gap's
// margin and fade by the pixel's distance from the ball's centre over the ball's radius (fillet radius + W): no gap at
// the centre, the ordinary gap where the ball ends. The pixel's corner list (kk, nk) holds every corner in reach.
// K1584 s10: every tight turn scales its gap so (.x, as stage 8 did). A turn opening under GAP_WEDGE_THETA (.w = 1 +
// angle) also opens its wedge (.y): out to ${lkF(GAP_OPEN_FULL)} ball radii its own chain's gap takes the ordinary border
// code, tapering back to the slot's own code by ${lkF(GAP_OPEN_END)} radii, so the wedge leaves the ball at the ordinary
// gap's width. CPU twins: ballScaleAt, ballOpenAt.
vec2 lkBall(vec2 p, int c, float arc) {
  float s = 1.0; float tw = 0.0;
  for (int i = 0; i < nk; i++) {
    int k = kk[i] & 32767;
    vec4 K5 = F(uOK + 6 * k + 5);
    if (K5.w < 0.5) continue;
    vec4 K3 = F(uOK + 6 * k + 3);
    if (!((int(K3.x) == c && abs(arc - K3.z) < ${lkF(GAP_BALL_ARC)}) || (int(K3.y) == c && abs(arc - K3.w) < ${lkF(GAP_BALL_ARC)}))) continue;
    vec4 K0 = F(uOK + 6 * k);
    float r = length(p - K0.xy) / max(K0.z + uW, 1e-6);
    s = min(s, r);
    if (K5.w < ${lkF(Math.fround(1 + GAP_WEDGE_THETA))}) tw = max(tw, 1.0 - smoothstep(${lkF(GAP_OPEN_FULL)}, ${lkF(GAP_OPEN_END)}, r));
  }
  return vec2(clamp(s, 0.0, 1.0), tw);
}
vec2 lkGap(float key, vec2 p, vec2 qU, int cU) {
  float g = 0.0; float gA = 0.0;
  vec2 tu = lkTanS(cU, qU);
  float wm = uGwLive > 0.5 ? lkWinM(cU, qU) : 1e3;
  float pxw = 2.0 * uAA;
  vec3 sl = uGwLive > 0.5 && wm > -pxw ? lkGwSlot(cU, qU) : vec3(-1.0, 0.0, 0.0);
  // K1584 s4: the slot's border codes (GfGapTable: the left border's in z's fraction, the right border's in x's at quarter
  // scale, s7; (fade * 32 + margin) of 31): the pixel takes its own border's (its side of the under tangent at its foot).
  // Code 0 closes that border's outline cut as the joint flag did (margin -1 px, 0.3 of the fade): the slot lies past
  // that border's joint room, on the joint's own outline, or nothing fits before its joint corner. The coverage (scA)
  // never reads the closure: it keeps the old clearance floors there.
  // K1584 s7 corner rule: the right code's 1024 bit (GAP_FAR_OFF) turns the outline's far term off (fo).
  vec2 sc = vec2(1.0); vec2 scA = sc; bool jf = false; bool fo = false;
  if (sl.x >= 0.0) {
    int pk = int(fract(sl.z) * 1024.0 + 0.5); int pkR = int(fract(sl.x) * 4096.0 + 0.5);
    fo = pkR >= 1024; pkR -= fo ? 1024 : 0;
    if (pkR != pk) { vec2 fU = lkFoot(cU, qU); if ((tu.x * (p.y - fU.y) - tu.y * (p.x - fU.x)) < 0.0) pk = pkR; }
    if (lkTw >= 1.0) fo = false;
    jf = pk == 0;
    // K1482 s16: a closed border's margin is -1 px (lkCut's e = d - uH - uLkG * sc.x, so sc.x = -pxw / uLkG): with no
    // margin the short fade began at the over's outline, and the first pixel past it kept 0.13-0.53 of the cut, a 1 px
    // light line between the over's outline and the under's at the joint (link A j60, j36, j143, t16e, j146, j157, t70s)
    sc = jf ? vec2(uLkG > 0.0 ? -pxw / uLkG : 0.0, 0.3) : vec2(float(pk - (pk / 32) * 32), float(pk / 32)) / 31.0;
    scA = jf ? vec2(0.5, 0.45) : sc;
    // K1584 s10: a tight wedge's open form (lkBall .y): the ordinary code, the closure and the far-off flag lifted
    if (lkTw > 0.0) { sc = mix(sc, vec2(1.0), lkTw); scA = mix(scA, vec2(1.0), lkTw); if (lkTw >= 1.0) jf = false; }
  }
  // K1460 s4: the pixel's own arc and today's selfEx (both half-widths + margin + fade + the exit pad), for lkNearOn's
  // self crossing: its own thread is no over pass within sx of that arc (today's gapSegFull skip).
  float aU = lkArc(cU, qU);
  float sx = 2.0 * uH + uLkG + uLkF + ${lkF(GAP_EXIT_PAD)};
  // K1482 s8: inside a window the bake names, only that crossing's over thread cuts the OUTLINE (x: ink and the
  // border's flag lane; today's slot cuts by its own over pass alone). Any higher piece used to cut there too: a
  // tucked tail's host, which is a fused joint and no crossing (crossing_gaps.ts isJointPair), cut the tail's
  // outline in a neighbour crossing's window and left a dot or dash of it beside the host's outline (link A t1s,
  // t24s, t46e, t39s). K1561 (27Q): y (the coverage) takes the named over chain only inside a window too:
  // taking every higher piece there let a fused joint's host cut the coverage of a thread that had just come
  // out from under the named over thread and at once ended on the host (g41_user_tw64 j71), leaving a nub of
  // ground in the fill look beside the host. Outside a window (cS < 0) every higher piece still cuts both.
  int cS = sl.x >= 0.0 ? int(sl.x + 0.5) : -1;
  // K1482 s16: g0 is the outline cut without the closure (g where jf is false), which alone gates the coverage's
  // far-reach term below. Gated by the closed g (never above g0), a closed border could take that term where g0
  // had already passed 0.999, so the closure reached the coverage and with it the fill look; gated by g0 the
  // coverage (y) never reads the closure
  float g0 = 0.0;
  for (int j = 0; j < np; j++) {
    if (!(pkey[j] > key + uZt)) continue;
    vec2 qO = lookQ(j, p);
    vec2 to = lkTanS(PC(j), qO);
    float sinT = abs(tu.x * to.y - tu.y * to.x);
    float exg = uExLive > 0.5 ? exAt(PC(j), lkArc(PC(j), qO)).x : 1.0;
    float cj = lkCut(pd[j], sinT, exg, wm, pxw, scA);
    if (cS < 0) gA = max(gA, cj); // K1561: inside a window (cS >= 0) the named piece adds its coverage cut below, with its outline cut
    if (cS < 0) g = max(g, cj);
    else if (PC(j) == cS) { g = max(g, jf ? lkCut(pd[j], sinT, exg, wm, pxw, sc) : cj); g0 = max(g0, cj); gA = max(gA, cj); }
    // K1417: no casing term (the composite clears the gap to the background in every look).
  }
  // K1458: the over thread past the candidate list's reach. A piece enters the list only within
  // rc = h + W + 2aa of the pixel, so the loop above sees the over thread only about W past its edge:
  // the ramp stopped there, a hard edge whatever the fade. Inside a window, the bake names the over
  // pass and its arc near this sample; the pass's true nearest point gives today's distance.
  if (uGwLive > 0.5 && wm > -pxw && g < 0.999) {
    if (sl.x >= 0.0) {
      int cO = int(sl.x + 0.5);
      vec3 N = lkNearOn(cO, sl.y, sl.z, p, cO == cU ? aU : -1.0, sx);
      if (N.y >= 0.0) {
        vec2 to = lkTanS(cO, N.yz);
        float sinT = abs(tu.x * to.y - tu.y * to.x);
        float exg = uExLive > 0.5 ? exAt(cO, lkArc(cO, N.yz)).x : 1.0;
        float cN = lkCut(N.x, sinT, exg, wm, pxw, scA);
        if (!fo) g = max(g, jf ? lkCut(N.x, sinT, exg, wm, pxw, sc) : cN);
        if (gA < 0.999 && g0 < 0.999) gA = max(gA, cN);
      }
    }
  }
  return vec2(g, gA);
}
// K1500: today's marker-disc cut (gap_mask.ts gapKeepAt, the n <= 1 branch) at the label's foot: radial
// from the disc centre (sin 1), inside the marched window; the CPU twin is gf_look.ts markerCutAt.
// Piece labels only (the lkMarker site): today's fan material takes the silhouette only, so a stub a
// junction fan covers keeps no marker fade (the exit stub on link A, measured in .claude/probes/K1500).
float lkMarker(int c, float arc, vec2 p) {
  float cut = 0.0;
  float pxw = 2.0 * uAA;
  for (int i = 0; i < 4; i++) {
    if (int(uMkA[i].w + 0.5) != c) continue;
    float total = uMkB[i].w;
    float off = arc - uMkB[i].x;
    if (total > 0.0) off -= total * floor(off / total + 0.5);
    float m = min(off + uMkB[i].y, uMkB[i].z - off);
    if (m <= -pxw) continue;
    float inWin = clamp(m / pxw + 0.5, 0.0, 1.0);
    float d = length(p - uMkA[i].xy);
    float e = d - uMkA[i].z - uLkG;
    float k = clamp((e + 0.5 * pxw) / max(uLkF, pxw), 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);
    float fs = clamp(m / max(0.5 * uLkF, pxw), 0.0, 1.0);
    fs = mix(1.0, fs * fs * (3.0 - 2.0 * fs), clamp(e / pxw, 0.0, 1.0));
    float exg = uExLive > 0.5 ? exAt(c, uMkB[i].x).x : 1.0;
    cut = max(cut, (1.0 - k) * inWin * fs * exg);
  }
  return cut;
}
// K1460: an antialiased fringe pixel has coverage but no label (the label needs d < h), so the site above never
// cut it, and the composite paints it in a labelled neighbour's colour: along the edge where form B's burial ends
// the under thread beside an over pass, the uncut fringe drew a dotted line across the faded under thread. Cut the
// fringe by its lowest covering piece's gap, keeping whatever pieces above that one cover the pixel.
void lkFringe(vec2 p, inout float ink, inout float cov) {
  int jU = -1; float kU = BIG;
  for (int j = 0; j < np; j++) { if (pd[j] < uH + uAA && pkey[j] < kU) { kU = pkey[j]; jU = j; } }
  if (jU < 0) return;
  vec2 fq = lookQ(jU, p);
  vec2 g = lkGap(kU, p, fq, PC(jU));
  g = max(g, vec2(lkMarker(PC(jU), lkArc(PC(jU), fq), p)));
  if (!(g.y > 0.0)) return;
  float aT = 0.0;
  for (int j = 0; j < np; j++) { if (pkey[j] > kU + uZt) aT = max(aT, ss(-uAA, uAA, uH - pd[j])); }
  ink *= 1.0 - g.x * (1.0 - aT); cov *= 1.0 - g.y * (1.0 - aT);
}
`;
const SITES: [string | RegExp, string, number][] = [
  // the second target (K1389 s2): the colour
  ["#else\nout vec4 o0;\n#endif", "#else\nlayout(location = 0) out vec4 o0;\nlayout(location = 1) out vec4 o1;\nlayout(location = 2) out vec4 o2;\n#endif", 1],
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
    "    lkCo = vec4(0.0); lkHiC = vec3(0.0); lkHiA = 0.0;\n    if (lab >= 0) { vec2 lq = lkJb >= 0 ? lookQ(lkJb, p) : lookQs(lab, lkSb); lkCo = lkColour(lab, lq); float lkgp = lkPaint(lab, lq); lkCo.rgb = mix(lkCo.rgb, uGold, lkgp); lkCo.rgb = lkRoute(lkCo.rgb, lab, lq, p, lkJb >= 0); float lkRimV = lkRimF(lab, lq, p); lkCo.rgb = lkRim(lkCo.rgb, lab, lq, p); float lkD = length(p - lkFoot(lab, lq)); float lke = clamp(lkD / uH, 0.0, 1.0); lkE = 0.7 * ss(0.62, 0.85, lke); float lkv = lkPulse(lab, lq); if (lkv > 0.0) { if (uPulseW < 1.0) lkv *= clamp((uPulseW - lke) / max(3.0 * uAA / uH, 0.02) + 0.5, 0.0, 1.0); lkCo.rgb += (uPulseCol - lkCo.rgb) * (0.9315315315315316 * clamp(lkv, 0.0, 1.0)); } float lkt = lkTele(lab, lq); if (lkt > 0.0) lkCo.rgb += (uTeleU.rgb - lkCo.rgb) * clamp(lkt * lkTeleAcross(lke) * uTeleU.w, 0.0, 1.0); lkHiC = uGold * lkgp; float lkPulseHi = lkJb >= 0 ? lkv * lkFanWin(lab, lq) : 0.0; if (lkPulseHi > 0.0) lkHiC += (uPulseCol - lkHiC) * (0.9315315315315316 * clamp(lkPulseHi, 0.0, 1.0)); float lkTeleHi = lkt * uTeleU.w; if (lkTeleHi > 0.0) lkHiC += (uTeleU.rgb - lkHiC) * clamp(lkTeleHi, 0.0, 1.0); if (lkRimV > 0.0) lkHiC += (uHov - lkHiC) * (uRimC.y * clamp(lkRimV, 0.0, 1.0)); lkHiA = clamp(max(max(lkgp, lkPulseHi), max(lkRimV, lkTeleHi)), 0.0, 1.0); if (uFxLive > 0.5) { vec4 f0 = lkFx(lab, lq, 0); vec4 f1 = lkFx(lab, lq, 1); if (uFxStyle > 3.5) lkCo.rgb = lkBurn(lkCo.rgb, f0.z, f1.x, uFxStyle > 4.5); else if (uFxStyle > 0.5 && uFxStyle < 1.5 && f0.x > 0.0) { vec2 tn = lkTan(lab, lq.x); float sd = clamp(dot(p - lkFoot(lab, lq), vec2(-tn.y, tn.x)) / uH, -1.0, 1.0); lkCo.rgb = lkRainbow(lkCo.rgb, f0.x, 0.5 - 0.5 * sd); } if (f1.y > 0.0) lkCo.rgb += (vec3(1.0) - lkCo.rgb) * (0.9315315315315316 * clamp(f1.y, 0.0, 1.0)); ink *= f0.y; cov *= f0.y; lkHi = f0.w * lkJCut(lab, lq, p, f1); } vec2 lkg2 = lkKb < BIG ? lkGap(lkKb, p, lq, lab) : vec2(0.0); if (lkKb < BIG) { vec2 lkb2 = lkBall(p, lab, lkArc(lab, lq)); if (lkb2.y > 0.0 || ((lkg2.x > 0.0 || lkg2.y > 0.0) && lkb2.x < 1.0)) { lkBs = lkb2.x; lkTw = lkb2.y; lkg2 = lkGap(lkKb, p, lq, lab); lkBs = 1.0; lkTw = 0.0; } } float lkg = lkg2.x; if (lkJb >= 0) { float mk = lkMarker(lab, lkArc(lab, lq), p); lkg = max(lkg, mk); lkg2.y = max(lkg2.y, mk); } ink *= 1.0 - lkg; cov *= 1.0 - lkg2.y; lkHiA *= 1.0 - lkg2.y; if (lkCo.a > 0.0) lkCo.a = max(1.0 - lkg, 1.0 / 255.0); if (uExLive > 0.5) { vec4 exs = exAt(lab, lkArc(lab, lq)); float evv = exs.x; if (exs.y >= 0.0 && uExLook > 1) { vec2 etn = lkTan(lab, lq.x); float elat = dot(p - lkFoot(lab, lq), vec2(-etn.y, etn.x)); if (uExLook == 2) { float eg = lkSmooth(exs.y / 0.3) * (1.0 - lkSmooth((exs.y - 0.55) / 0.45)); lkCo.rgb = mix(lkCo.rgb, vec3(0.78, 0.94, 1.0), 0.85 * eg * uExBr); } evv = lkExploreLook(uExLook, exs.x, exs.y, exs.y * exs.z, exs.z, elat, (2.0 * uAA) / max(uExTw, 1e-6), 2.0 * uAA); if (uExOn > 1.5) lkCo.rgb = mix(lkCo.rgb, vec3(1.0), lkExDot); } vec3 exb = exBurnAt(lab, lkArc(lab, lq)); if (exb.x > 0.0 || exb.y > 0.0 || exb.z > 0.0) { vec2 btn = lkTan(lab, lq.x); float blat = dot(p - lkFoot(lab, lq), vec2(-btn.y, btn.x)); float bacr = abs(blat) / max(uExTw, 1e-6); float bsfw = max((2.0 * uAA) / max(uExTw, 1e-6), 1e-4); if (exb.x > 0.0) lkCo.rgb = lkCharLook(lkCo.rgb, exb.x, clamp((0.15000 - bacr) / bsfw + 0.5, 0.0, 1.0)); if (exb.y > 0.0) lkCo.rgb = lkEmberLook(lkCo.rgb, exb.y, clamp((0.22000 - bacr) / bsfw + 0.5, 0.0, 1.0)); if (exb.z > 0.0) lkCo.rgb = mix(lkCo.rgb, vec3(1.0, 0.23137, 0.12157), 0.9 * exb.z * clamp((0.22500 - bacr) / bsfw + 0.5, 0.0, 1.0)); } ink *= evv; cov *= evv; lkHiA *= evv; } } else if (ink > 0.0 || cov > 0.0) { lkFringe(p, ink, cov); }\n    oInk = min(1.0, ink); oCov = min(1.0, cov);", 1],
  ["  o0 = vec4(oInk, oCov, 0.0, 1.0);\n#endif", "  o0 = vec4(oInk, oCov, lkHi, lkE); o1 = lkCo; o2 = vec4(lkHiC, lkHiA);\n#endif", 1],
];

// K1396: the explore table's fetch (gf_explore.ts's layout; the JS twin is its exAt)
const F_DEF = "vec4 F(int i) { return texelFetch(uD, ivec2(i & TWM, i >> LOG), 0); }\n";
const EX_FN = `
uniform highp sampler2D uEx; uniform int uOExK; uniform float uExLive; uniform int uExLook; uniform float uExTw; uniform float uExOn; uniform float uExBr;
vec4 EX(int i) { return texelFetch(uEx, ivec2(i & TWM, i >> LOG), 0); }
// K1396: the explore state (vis, tip, lf) at arc s of chain c (gf_explore.ts exAt)
vec4 exAt(int c, float s) {
  vec4 H = EX(c);
  if (H.x < 0.5) return vec4(0.0, -1.0, 0.0, 0.0);
  if (H.x < 1.5) return vec4(1.0, -1.0, 0.0, 0.0);
  int lo = int(H.y); int n = int(H.z);
  if (H.w > 0.0) s -= H.w * floor(s / H.w);
  vec4 P = EX(lo);
  if (s <= P.x) return vec4(P.y, P.z, P.w, 0.0);
  vec4 Q = EX(lo + 2 * (n - 1));
  if (s >= Q.x) return vec4(Q.y, Q.z, Q.w, 0.0);
  int a = 0; int b = n - 1;
  for (int it = 0; it < 24; it++) { if (b - a <= 1) break; int h = (a + b) >> 1; if (EX(lo + 2 * h).x <= s) a = h; else b = h; }
  P = EX(lo + 2 * a); Q = EX(lo + 2 * b);
  float t = Q.x > P.x ? (s - P.x) / (Q.x - P.x) : 0.0;
  return vec4(mix(P.y, Q.y, t), mix(P.z, Q.z, t), mix(P.w, Q.w, t), 0.0);
}
// K1434: the burn state (char, ember, smolder) at arc s of chain c (gf_explore.ts exBurnAt)
vec3 exBurnAt(int c, float s) {
  vec4 H = EX(c);
  if (H.x < 1.5) return vec3(0.0);
  int lo = int(H.y); int n = int(H.z);
  if (n <= 0) return vec3(0.0);
  if (H.w > 0.0) s -= H.w * floor(s / H.w);
  vec4 P = EX(lo);
  if (s <= P.x) return EX(lo + 1).rgb;
  vec4 Q = EX(lo + 2 * (n - 1));
  if (s >= Q.x) return EX(lo + 2 * (n - 1) + 1).rgb;
  int a = 0; int b = n - 1;
  for (int it = 0; it < 24; it++) { if (b - a <= 1) break; int h = (a + b) >> 1; if (EX(lo + 2 * h).x <= s) a = h; else b = h; }
  P = EX(lo + 2 * a); Q = EX(lo + 2 * b);
  float t = Q.x > P.x ? (s - P.x) / (Q.x - P.x) : 0.0;
  return mix(EX(lo + 2 * a + 1).rgb, EX(lo + 2 * b + 1).rgb, t);
}
// K1434: explore_glsl.ts kCharLook / kEmberLook over a composed thread colour
vec3 lkCharLook(vec3 rgb, float ch, float ash) {
  rgb = mix(rgb, vec3(${lkF(EXPLORE_CHAR_RGB[0])}, ${lkF(EXPLORE_CHAR_RGB[1])}, ${lkF(EXPLORE_CHAR_RGB[2])}), ${lkF(EXPLORE_CHAR_ALPHA)} * ch);
  return mix(rgb, vec3(${lkF(EXPLORE_ASH_RGB[0])}, ${lkF(EXPLORE_ASH_RGB[1])}, ${lkF(EXPLORE_ASH_RGB[2])}), ${lkF(EXPLORE_ASH_ALPHA)} * ash * ch);
}
vec3 lkEmberLook(vec3 rgb, float e, float core) {
  rgb = mix(rgb, vec3(${lkF(EXPLORE_EMBER_RGB[0])}, ${lkF(EXPLORE_EMBER_RGB[1])}, ${lkF(EXPLORE_EMBER_RGB[2])}), ${lkF(EXPLORE_EMBER_ALPHA)} * e);
  return mix(rgb, vec3(${lkF(EXPLORE_EMBER_CORE_RGB[0])}, ${lkF(EXPLORE_EMBER_CORE_RGB[1])}, ${lkF(EXPLORE_EMBER_CORE_RGB[2])}), e * e * e * core);
}
`;
const SEG_PLAIN = "float d = sqrt(d2); float s = A.z + u * (B.z - A.z); int k = v - cV0;";
const SEG_REVEAL = "float d = sqrt(d2); float s = A.z + u * (B.z - A.z); float rvm = rvM(c, s); if (rvm <= 0.0) continue; d /= rvm; if (d >= uRc) continue; int k = v - cV0;";
const EX_DROP = "float exv = uExLive > 0.5 ? exAt(c, s).x : 1.0; if (exv <= 0.0) continue; ";
const CORNER_RE = /int k = int\(L4\(uOKL, q\)\);/g;

/** A gf program's look form (see the header); throws when an anchor is missing or repeats. */
export function lookForm(src: string): string {
  const count = (a: string): number => src.split(a).length - 1;
  if (count(G_ANCHOR) !== 1 || count(M_ANCHOR) !== 1) throw new Error(`gf look: anchors G ${count(G_ANCHOR)}, main ${count(M_ANCHOR)}`);
  if (count(F_DEF) !== 1) throw new Error(`gf look: explore anchor F ${count(F_DEF)}`);
  let out = src.replace(F_DEF, F_DEF + EX_FN).replace(G_ANCHOR, G_ANCHOR + G_LOOK).replace(M_ANCHOR, M_LOOK + M_ANCHOR);
  for (const [a, b] of SITES) {
    const s = a as string;
    const n = out.split(s).length - 1;
    // a site a program's form compiled out (the tiers' LABRUN, the full program's surfaces, FAST) may be absent
    if (n > 1) throw new Error(`gf look: site repeats (${s})`);
    if (n === 1) out = out.replace(s, b);
  }
  // K1396: the explore scan drop and corner gate (the reveal form's segment text when composed over it)
  if (out.includes(SEG_REVEAL)) out = out.split(SEG_REVEAL).join(SEG_REVEAL.replace("int k = v - cV0;", EX_DROP + "int k = v - cV0;"));
  else if (out.includes(SEG_PLAIN)) out = out.split(SEG_PLAIN).join(SEG_PLAIN.replace("int k = v - cV0;", EX_DROP + "int k = v - cV0;"));
  else throw new Error("gf look: explore scan anchor missing");
  out = out.replace(CORNER_RE, (m) => `${m} if (uExLive > 0.5 && EX(uOExK + k).x < 0.5) continue;`);
  // K1431: in the reveal form the thread's drawn halfwidth is uH x the reveal width (mask x swell,
  // rvM at the label's foot), and today's rainbow stripes run across that drawn width (the mesh's
  // vUV.y over the widthMul-grown strip), so the across coordinate divides by it, not by uH alone.
  if (out.includes("float rvM")) {
    const sdPlain = "float sd = clamp(dot(p - lkFoot(lab, lq), vec2(-tn.y, tn.x)) / uH, -1.0, 1.0);";
    if (!out.includes(sdPlain)) throw new Error("gf look: rainbow side anchor missing");
    out = out.replace(sdPlain, "float sd = clamp(dot(p - lkFoot(lab, lq), vec2(-tn.y, tn.x)) / (uH * max(rvM(lab, lkArc(lab, lq)), 1e-6)), -1.0, 1.0);");
  }
  // the sites every program carries
  for (const must of ["lkJb = lkJ;", "lkCo = vec4(0.0); lkHiC = vec3(0.0); lkHiA = 0.0;\n", "lkPulse(lab, lq)", "lkTele(lab, lq)", "lkBurn(lkCo.rgb", "lkRainbow(lkCo.rgb", "lkExploreLook(uExLook", "exAt(c, s)", "exBurnAt(lab, lkArc(lab, lq))", "lkCharLook(lkCo.rgb", "lkEmberLook(lkCo.rgb", "o0 = vec4(oInk, oCov, lkHi, lkE); o1 = lkCo; o2 = vec4(lkHiC, lkHiA);", "layout(location = 1) out vec4 o1;", "layout(location = 2) out vec4 o2;", "lkHiC = uGold * lkgp;", "ss(uW - max(3.0 * uAA, 0.02 * uH), uW, D)"]) if (!out.includes(must)) throw new Error(`gf look: ${must} missing`);
  return out;
}

// The look's composite: the pass's (ink, coverage) and colour targets over the canvas, premultiplied.
export const LOOK_COMP_FS = `#version 300 es
precision highp float;
uniform sampler2D uC;
uniform sampler2D uCo;
uniform sampler2D uHi;
uniform int uLook;
uniform vec4 uBd;
uniform vec3 uFill;
uniform float uRvFx;
uniform float uFlip;
out vec4 o;
void main() {
  ivec2 q = ivec2(gl_FragCoord.xy);
  if (uFlip > 0.5) q.y = textureSize(uC, 0).y - 1 - q.y;
  vec4 c = texelFetch(uC, q, 0);
  float ink = c.x; float cov = c.y;
  if (!(ink > 0.0) && !(cov > 0.0)) { o = vec4(0.0); return; }
  vec4 k = texelFetch(uCo, q, 0);
  vec4 hh = texelFetch(uHi, q, 0);
  if (!(k.a > 0.0)) {
    // the fringe outside h has no label: its nearest labelled neighbour's
    ivec2 sz = textureSize(uCo, 0); float bd = 1e9;
    for (int dy = -2; dy <= 2; dy++) for (int dx = -2; dx <= 2; dx++) {
      ivec2 r = clamp(q + ivec2(dx, dy), ivec2(0), sz - 1);
      vec4 j = texelFetch(uCo, r, 0);
      float dd = float(dx * dx + dy * dy);
      if (j.a > 0.0 && dd < bd) { bd = dd; k = j; hh = texelFetch(uHi, r, 0); }
    }
  }
  vec3 C = k.a > 0.0 ? k.rgb : uFill;
  vec3 S = mix(mix(C * 0.30, vec3(0.09, 0.085, 0.08), 0.5), uBd.rgb, uBd.w);
  // K1417: the crossing gap clears to the background in every look (no casing paint: today's border gap
  // is the background between its outlines). The border alpha strengthens form B's centre-sampled band
  // to today's area-averaged stroke (the pass target has no MSAA) and darkens S toward today's dark edge colour, so the faint continuous outline reads at today's darkness; fill and both keep the band and S as they are.
  // K1492: the alpha thresholds the band, so applied to the gap-cut ink it moved only while ink sat in [0.36, 0.65]:
  // the outline's crossing fade was a fifth of the fill's ramp, a few pixels however long the slider asked. The pass
  // keeps the gap's own factor (1 - lkg) in the colour target's flag lane (a labelled pixel's alpha, at least 1/255)
  // and the alpha thresholds the uncut ink, then takes the gap: the outline fades over the fill's ramp, and away
  // from a gap (m = 1) nothing changes.
  if (uLook == 0) o = vec4(C * cov, cov);
  else if (uLook == 1) { vec3 Sb = mix(S, vec3(0.055, 0.07, 0.10), 0.85); float m = k.a > 0.0 ? k.a : 1.0; float a = clamp((min(ink / m, 1.0) - 0.36) * 3.5, 0.0, 1.0) * m; if (uRvFx > 0.5) { float ia = clamp(c.z, 0.0, 1.0) * cov * (1.0 - a); o = vec4(C * ia + Sb * a * (1.0 - ia), ia + a * (1.0 - ia)); } else { float ia = clamp(hh.a, 0.0, 1.0) * cov * (1.0 - clamp(c.w, 0.0, 1.0)); o = vec4(hh.rgb * ia + Sb * a * (1.0 - ia), ia + a * (1.0 - ia)); } }
  else { float a = ink + (1.0 - ink) * cov; o = vec4(S * (0.9 * ink) + C * (a - 0.9 * ink), a); }
}`;
