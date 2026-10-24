// THE JUNCTION JOINERY (K5 R5): the fans' material lookups (the CPU
// junction field and the arm strips it reads: cpuChainMaterial, writeStripRow,
// cpuStripAt, cpuJunctionField), the section color at an arc (sectionAtArc,
// colorAtArc, armCtrlSlope) and rebuildFillets, which builds the junction
// records, fans, discs and K81 cover strips. Moved verbatim from
// ribbon_renderer.ts (48fc9ee lines below). A body changed in three ways
// only: a renderer member became `this.r.x`, a sampling helper
// `sampling.x(...)` (normArc joined them, from the facade's module level),
// and cpuJunctionField calls cpuStripAt through the renderer, so a probe's
// patch of it still sees every call. Outside the bodies, `private` left
// the methods and fields the facade calls or forwards (cpuStripAt,
// colorAtArc, sectionAtArc; fusedTips, filletLayer, filletTopLayer,
// fieldProfLen, fieldProbe, tipDiscScale are facade accessors onto these).
// RibbonRenderer owns one Joinery (its `joinery`): tickPaintPalette calls
// rebuildFillets through the facade delegation the probes patch, and
// G4-2 deletes this file (docs/design/K5_K6_split.md 2.3). Since the move,
// K580 s5 gave a glyph's fused spur tips the STADIUM (geometry in
// tip_stadium.ts), in the cap cover and in its host-axis fallback, and
// pushDisc returns its gate so the fallback's stadium can share it.
//
//   FILLET_REACH_PER_HALF .. DISC_SIN  372-432   joinery constants
//   ERASE_WIDTH_PAD                    495-497   rebuildFillets' pad
//   jointMaskPool, tipMaskScratch      557-559   fan mask scratch
//   tipDiscScale                       586-588   fused-tip disc radius
//   axisScratch                        713       axisAt's direction
//   fusedTips                          731-743   tucked tips
//   filletLayer, filletTopLayer        745-756   the two fan layers
//   acc4Scratch                        803       cpuJunctionField's cell
//   ignScratch                         816-817   ignition scratch
//   fieldProfPool, fieldProfLen        864-867   radial profiles
//   filletKey                          871       the rebuild key
//   fieldMbScratch                     872-873   field composition scratch
//   routeScratch                       874-875   corner frames
//   fieldProbe                         876-908   the probe hook
//   fieldLastArm                       909       fieldProbe's arms
//   stripRowsUsed, stripK0, stripK1    910-914   arm strip rows
//   exploreAtScratch                   915-916   kExploreAt's twin scratch
//   cpuChainMaterial                   4203-4250 a chain's composed material
//   writeStripRow                      4251-4278 one arm strip row
//   cpuStripAt                         4280-4307 a strip row at a texel
//   cpuJunctionField                   4309-4529 the field at a point
//   colorAtArc                         4542-4559 section + burn at an arc
//   armCtrlSlope                       4561-4578 ctrl per arc on an arm
//   sectionAtArc                       4580-4591 the section at an arc
//   rebuildFillets                     4593-6125 records, fans, strips

import type { Container } from "pixi.js";
import type { CrossingPass } from "../../physics/particle_system";
import type { SplineSamples } from "../../geometry/spline_generator";
import { TriFanMesh } from "../ribbon_mesh";
import { kData, knotUniformValues } from "../paint_model";
import { FX_STYLE } from "../paint_const";
import {
  kChain,
  kComposePaint,
  kCtrlOfArc,
  kCtrlOfArcNear,
  kExploreAt,
  kFxColor,
  kGlow,
  kPaintAt,
  kSectionAtArc,
  kWrap,
  knotSection,
} from "../paint_math";
import type { KExploreState } from "../paint_math";
import {
  FIELD_BLEND_MIN,
  FIELD_PROF_ARC,
  FIELD_PROF_DR,
  MAX_ARMS,
  MAX_ROUTES,
  MAX_ROUTE_VERTS,
  ROUTE_BAND_PAD,
  junctionShader,
  junctionShaderExplore,
  recordData,
  setFieldParams,
} from "../junction_field";
import { routeCorner, routeCubic } from "../junction_routes";
import { STRIP_W, setStripRows, stripTable } from "../arm_strip";
import { GAP_SLOTS } from "../gap_mask";
import { CUT_BIAS, GATE_LEAD, JOINT_CLEAR_REACH_SCALE } from "./crossing_gaps";
import { EXPLORE_JOINT_MIN } from "./explore_gaps";
import * as sampling from "./sampling";
import { stadiumRim } from "./tip_stadium";
import type { RibbonRenderer, RouteJArm } from "../ribbon_renderer";

// JUNCTION JOINERY. Fused arms (bridge/stub/merge terminals) tuck their
// rendered tip back by the host's half-width so the ribbon lands flush on
// the host's near edge instead of overhanging past its centerline - the
// overhang read as floating scraps and gapless fake crossings. Each wedge
// between adjacent arms then gets a rounded FILLET: a concave patch from
// one arm's edge to the next, split at its midpoint so each half wears its
// own arm's live paint color. Reach and curvature are in thread-width
// units; wedges flatter than FILLET_MAX_WEDGE (a near-straight pass-through
// side) get no fillet.
// Fillets hug the junction tightly: the arm edges are straight-line
// approximations from the junction point, and a host that curves away from
// them leaves any far-reaching patch floating in the background. The
// user's cuspRadius slider multiplies the reach (0 disables the fillets;
// the center/tip seal discs stay regardless).
export const FILLET_REACH_PER_HALF = 1.25; // * fillHalf, along each arm.
const FILLET_MAX_WEDGE = 2.6; // Radians.
const FILLET_CORNER_LIM = 2.2; // * edge half-width: skip distant corners.
const FILLET_BEZIER_STEPS = 8;
// Samples per curve-hugging wedge flank: at least FILLET_EDGE_PTS, more as
// the reach grows so no flank chord exceeds FILLET_EDGE_CHORD world (reach
// tops out near 3 world: threadWidth 0.8 at cuspRadius 6). The flank is a
// polyline through points on its arm's edge; where the arm wraps a small
// eye, each chord cuts across the curved edge and leaves a circular
// segment (sagitta c^2/8R) that neither web nor ribbon covers - a thin dark
// crescent. A fixed 5 made 0.48-world chords at cuspRadius 6 (crescents at
// 12 of 41 joints on the user's ring URL); 0.3 still left specks.
const FILLET_EDGE_PTS = 5;
const FILLET_EDGE_CHORD = 0.15;
const FILLET_EDGE_PTS_MAX = 20;
// Under-gap flank clamp (rebuildFillets armReach): stop this many
// fillHalfs short of the arm's nearest cut (underWindows carry MID-lane
// extents; the wedge-side lanes of an oblique crossing cut nearer - a
// 0.5 pad still left small points at the repro's oblique dives), never
// below this fraction of the full reach (the joint still needs rounding).
const FILLET_GAP_PAD = 1.0;
const FILLET_GAP_MIN_FRAC = 0.3;
// The junction field itself (profile grid, blend band, fill-joint radii)
// is configured in junction_field.ts and evaluated PER PIXEL on the GPU.
// (SECTION CACHE DRIFT is gone since G2.2: the vertex shader evaluates the
// section at each vertex's ctrl through the CURRENT arc table every frame,
// so a joint always converges - the old per-sample cache needed re-bakes
// past 0.1 ctrl of drift, ~30 per second under flow.)
// Layer vote: an under-near arm only pins its joint to the punchable
// bottom layer when its gap starts within this many fillHalfs (see
// rebuildFillets armDives).
const FILLET_DIVE_NEAR = 2.0;
const DISC_SEGS = 16; // Rim segments on tip/junction seal discs.
// K81 COVER STRIPS: at a routed junction every arm's ribbon is redrawn in
// the junction pass (the field's untraveled base under the route bands)
// out to its cover reach, from the arm's own extruded ribbon vertices: the
// arms' gold ribbons would otherwise square off the band's turn (the union
// of two straight gold ribbons fills the corner outside the arc). At most
// this many ribbon samples per strip.
const COVER_STRIP_PTS = 32;
// FUSED-TIP DISC radius, in half-widths. A tucked cap keeps a quarter
// half-width of overlap with its host (tuckFusedTips) that only the fans
// hide, and its corners sit a full half-width from the tuck point: at
// 0.99 the 16-gon's chords (cos(pi/16) inside the radius) left the corner
// strips uncovered, so whichever raw ribbon drew on top showed between
// the disc and the wedges - the light merge-core hairlines (user URL x160,
// masked on master by over-fills). 1.06 = the chord inset plus about a
// pixel of AA at the default fit; the rim is clamped to the bridge's own
// strip (TIP_DISC_SIDE half-widths each side, a hair inside its edges, so
// the ribbon's own AA edge stays untouched) - it never bulges past the
// bridge's sides into the backdrop or a neighbor's gap.
const TIP_DISC_SCALE = 1.06;
const TIP_DISC_SIDE = 0.995;
// Unit-circle rim of a disc fan (closed: the first point repeats).
const DISC_COS = new Float64Array(DISC_SEGS + 1);
const DISC_SIN = new Float64Array(DISC_SEGS + 1);
for (let i = 0; i <= DISC_SEGS; i++) {
  const th = ((i % DISC_SEGS) / DISC_SEGS) * Math.PI * 2;
  DISC_COS[i] = Math.cos(th);
  DISC_SIN[i] = Math.sin(th);
}
// rebuildFillets' old erase-width pad: its comment is
// JOINT_CLEAR_REACH_SCALE's, in ribbon/crossing_gaps.ts (K5 R2).
const ERASE_WIDTH_PAD = 0.02;

export class Joinery {
  readonly r: RibbonRenderer;
  // Per junction: the gap slots masking its fans (pooled; rebuildFillets).
  private jointMaskPool: Float32Array[] = [];
  private tipMaskScratch = new Float32Array(GAP_SLOTS);
  // K580 s5: the stadium cap cover's fan apex (tip_stadium.ts stadiumRim).
  private stadiumApex: number[] = [0, 0];
  // Junction-field arm profiles, pooled across fillet rebuilds (fixed
  // length per rebuild geometry; reset when the length changes).
  private fieldProfPool: Float32Array[] = [];
  fieldProfLen = 0;
  private filletKey = "";
  // Scratch for the junction-field composition (rebuildFillets).
  private fieldMbScratch = new Float32Array(4);
  // K81: the band corner's two arm frames (rebuildFillets cornerCubic).
  private routeScratch = new Float64Array(8);
  // The section color field: piecewise-linear rgb(ctrl) per chain from
  // section_colors (or spatial noise), baked to a per-SAMPLE RGB cache on
  // the first update. A cache entry of length 3 is a constant chain
  // color; otherwise it is 3 * sampleCount channel triplets.
  filletLayer: Container | null = null;
  // TWO-LAYER JOINERY (pre-per-pixel-gaps; kept for the junction-shader
  // merge): the per-wedge layer vote still sorts fans between this layer
  // and the bottom one, but with no erase layer between them the choice
  // no longer changes coverage - what used to depend on it (a diving
  // arm's gap punching its web) is now the fan's own gap mask (see
  // junction masks in rebuildFillets).
  filletTopLayer: Container | null = null;
  private acc4Scratch = new Float32Array(4);
  // Per-chain ignition scratch for the mask pass (sample ctrls).
  private ignScratch = { pRain: 0, alpha: 1 };
  private axisScratch = new Float32Array(2);
  // Fused (tucked) tips get the same disc treatment: it rounds the tucked
  // cap and covers its corner ears and the hairline sliver between the cap
  // and the host's edge. The disc lies mostly ON the host's face, so it
  // wears the HOST's paint at the junction (hostChain/hostCtrl) - coloring
  // it from the arm's own tip rendered floating pale/gold dots wherever
  // the two paints disagreed (pulsing arm over a traveled host, traveled
  // bridge over a backtracked host).
  fusedTips: Array<{
    chain: number;
    atEnd: boolean;
    hostChain: number;
    hostCtrl: number;
  }> = [];
  // A fused tip's disc radius in half-widths (TIP_DISC_SCALE; public for
  // same-state probes).
  tipDiscScale = TIP_DISC_SCALE;
  private fieldLastArm: number[] = [];
  // ARM STRIPS (arm_strip.ts): rows written by the current rebuild, and
  // the CPU mirror's scratch (two quantized texels).
  private stripRowsUsed = 0;
  private stripK0 = new Float32Array(4);
  private stripK1 = new Float32Array(4);
  // K268 stage 2: kExploreAt's CPU twin's scratch (cpuChainMaterial).
  private exploreAtScratch: KExploreState = { v: 0, tip: -1, solid: 0, end: 0, x: 0 };
  // PROBE HOOK (diagnostics only): the last rebuild's junction field -
  // `at(ji, x, y, out, px?, strip?)` writes the composed [r, g, b] at a
  // world point (junction index = junctionArms index; px = world units per
  // pixel, strip = a K81 cover-strip pixel); `arms(ji)` lists that joint's
  // arms, `routes(ji)` its K81 route bands. A CPU transliteration of the
  // GPU shader reading the SAME record + paint data the shader samples
  // (cpuJunctionField) - the ground truth for GPU-vs-CPU and
  // field-vs-ribbon censuses.
  fieldProbe: {
    at: (
      ji: number,
      x: number,
      y: number,
      out: Float32Array,
      px?: number,
      strip?: boolean
    ) => boolean;
    arms: (ji: number) => unknown[];
    routes: (ji: number) => unknown[];
    center: (ji: number) => [number, number] | null;
    // The joint's record texel index (-1: no field) - what a fan's aRec
    // carries.
    record: (ji: number) => number;
    // The joint's gate texel J1 = (tOn, tLast) (reveal-relative wall s).
    gate: (ji: number) => [number, number] | null;
    // The arms the last at() sampled: [chain, arc, seed] per arm (probes).
    lastArms: () => number[];
    // K127: the joint is fully traveled (its routed web reads composed).
    full: (ji: number) => boolean;
    // K169: the record's J1.z, how far the fully traveled web has faded in
    // (0 untraveled .. 1 composed; -1: no record).
    fade: (ji: number) => number;
  } | null = null;

  constructor(r: RibbonRenderer) {
    this.r = r;
  }

  // CPU REFERENCE of the GPU junction field (junction_field.ts FIELD_GLSL)
  // and of the arm strips it reads (arm_strip.ts), transliterated line for
  // line and reading the SAME record, strip table and paint data the
  // shaders sample - the fieldProbe ground truth. Not on any hot path.
  // GLSL twin (arm_strip STRIP_FRAG) chainMaterial: the COMPOSED material of a chain at a world
  // arc - the ribbon's section color there (its own Gouraud between
  // samples; `seed` = a ctrl near the arc), burn / roots, then the gameplay
  // paint and the reveal glow with edge coverage over `px` - into out[0..2].
  // untrav (K81): the paint without its gold amount (an untraveled row).
  // out[3]: the thread's visibility there under the thread reveal (K268
  // stage 2, withExploreStrip's kStripVis), else 1.
  private cpuChainMaterial(
    ch: number,
    a: number,
    out: Float32Array,
    seedIn: number,
    px = 0,
    untrav = false
  ): void {
    const D = kData();
    const U = knotUniformValues();
    const c = kChain(D, ch);
    // GLSL twin: the seed normalized onto the chain (rings wrap, runs clamp).
    const nc = c.nCtrl;
    const seed = c.closed ? kWrap(seedIn, nc) : Math.max(0, Math.min(nc - 1, seedIn));
    const total = c.total;
    if (!(total > 0) || c.count < 2) {
      knotSection(D, U, c, 0, out);
      out[3] = 1;
      return;
    }
    const an = c.closed ? kWrap(a, total) : Math.max(0, Math.min(total, a));
    const c0 = kSectionAtArc(D, U, c, a, seed, out);
    const actrl = kCtrlOfArcNear(D, c, an, c0);
    if (U.uKFx[3] >= 0.5 && U.uKFx[2] < c.fxDone) {
      const st = Math.round(U.uKFx[0]);
      if (st === FX_STYLE.burn || st === FX_STYLE.roots) {
        kFxColor(D, U, c, actrl, an / c.arcPer, out, this.ignScratch);
      }
    }
    if ((U.uKPaint[0] > 0.5 && c.paintOn) || U.uKFx2[2] > 0.5) {
      const st = kPaintAt(D, U, c, actrl, an, px, this.r.paintTmp);
      if (untrav) st.p = 0;
      kComposePaint(U, out, st, kGlow(D, U, c, actrl));
    }
    const E = U.uKExplore;
    out[3] = E && E[0] > 0.5 ? kExploreAt(D, U, c, actrl, this.exploreAtScratch).v : 1;
  }
  // Append one ARM STRIP row (arm_strip.ts table layout): texel k = the
  // material of `chain` at arc arc0 + arcStep * k (ctrl seed seed0 +
  // seedStep * k), paint edges antialiased over px; untrav 1 = the
  // untraveled material (K81). Returns the row.
  private writeStripRow(
    chain: number,
    arc0: number,
    arcStep: number,
    px: number,
    seed0: number,
    seedStep: number,
    untrav = 0
  ): number {
    const r = this.stripRowsUsed++;
    const tb = stripTable();
    tb.ensure(2 * r + 2);
    const d = tb.data;
    const o = r * 8;
    d[o] = chain;
    d[o + 1] = arc0;
    d[o + 2] = arcStep;
    d[o + 3] = px;
    d[o + 4] = seed0;
    d[o + 5] = seedStep;
    d[o + 6] = untrav;
    d[o + 7] = 0;
    return r;
  }
  // GLSL twin of arm_strip STRIP_LOOKUP_GLSL stripAt: strip row `row` at
  // texel coordinate x, from the two nearest texels - each the strip pass's
  // material (cpuChainMaterial at the row's arc / seed / px) quantized to
  // the render texture's 8 bits - lerped with exact weights.
  cpuStripAt(row: number, x: number, out: Float32Array): void {
    const T = stripTable().data;
    const o = row * 8;
    const xc = Math.max(0, Math.min(STRIP_W - 1, x));
    const k0 = Math.floor(xc);
    const k1 = Math.min(k0 + 1, STRIP_W - 1);
    const f = xc - k0;
    const q = (v: number): number => Math.round(Math.max(0, Math.min(1, v)) * 255) / 255;
    const m0 = this.stripK0;
    const m1 = this.stripK1;
    const un = T[o + 6] > 0.5;
    this.cpuChainMaterial(T[o], T[o + 1] + T[o + 2] * k0, m0, T[o + 4] + T[o + 5] * k0, T[o + 3], un);
    this.cpuChainMaterial(T[o], T[o + 1] + T[o + 2] * k1, m1, T[o + 4] + T[o + 5] * k1, T[o + 3], un);
    // K268 stage 2: the texels are premultiplied by the visibility (1 with
    // the reveal off: master's texels), and out[3] is the lerped alpha.
    const v0 = m0[3];
    const v1 = m1[3];
    for (let c = 0; c < 3; c++) {
      const a = q(m0[c] * v0);
      out[c] = a + (q(m1[c] * v1) - a) * f;
    }
    const a3 = q(v0);
    out[3] = a3 + (q(v1) - a3) * f;
  }
  // The composed junction-field color at (x, y) for the record at texel
  // `rec` into out[0..2] (the arms' materials come from their strip rows,
  // which antialias the paint over their own step): FIELD_GLSL
  // junctionField, K81 route bands included. px = world units per pixel
  // (the shader's pxW, floored the same way); strip = the pixel belongs to
  // a cover strip (the band's solid pad).
  // Under the thread reveal (K268 stage 2) the color is premultiplied and
  // out[3] is its alpha (the strips'); with the reveal off out[3] is 0.
  private cpuJunctionField(
    rec: number,
    x: number,
    y: number,
    out: Float32Array,
    px = 0,
    strip = false
  ): void {
    const J = recordData().data;
    const at = (i: number): number => i * 4;
    const TAU = Math.PI * 2;
    const fillHalf = this.r.style.threadWidth / 2;
    const profN = this.fieldProfLen;
    const last = profN - 1;
    const stride = 2 + profN;
    const hd = at(rec);
    const n = Math.round(J[hd + 2]);
    this.fieldLastArm.length = 0;
    const ex = x - J[hd];
    const ey = y - J[hd + 1];
    const mA = this.acc4Scratch;
    // (Materials arrive composed - the shader blends composed colors.)
    const exA = (knotUniformValues().uKExplore?.[0] ?? 0) > 0.5;
    const nc = exA ? 4 : 3;
    const compose = (m: Float32Array): void => {
      out[0] = m[0];
      out[1] = m[1];
      out[2] = m[2];
      out[3] = exA ? m[3] : 0;
    };
    if (n === 0) {
      const h = at(rec + 2);
      const ax = at(rec + 3);
      this.r.cpuStripAt(
        Math.round(J[h + 1]),
        (ex * J[ax + 1] + ey * J[ax + 2] + J[h + 3]) * J[h + 2],
        mA
      );
      compose(mA);
      return;
    }
    // K81: a routed record's base reads the untraveled rows (row + 1),
    // unless J1.z marks it fully traveled (K127); K169: J1.z is the level it
    // has faded in to, and in between the two bases blend.
    const nr = Math.round(J[at(rec + 1) + 3]);
    const routed = nr > 0;
    const fz = routed ? J[at(rec + 1) + 2] : 0;
    const armPaint = (
      ab: number,
      s: number,
      band: boolean,
      untrav: boolean,
      m: Float32Array
    ): void => {
      const h = at(ab);
      const a = at(ab + 1);
      const sc = Math.min(band ? Math.max(s, 1 / J[h + 3]) : s, J[a + 2]);
      // (Probes: the exact arc and ctrl seed the strip texel stands for.)
      this.fieldLastArm.push(Math.round(J[h]), J[a] + J[a + 1] * sc, J[a + 3] + J[a + 1] * sc * J[h + 1]);
      this.r.cpuStripAt(Math.round(J[h + 2]) + (untrav ? 1 : 0), sc * J[h + 3], m);
    };
    const profArc = (ab: number, rp: number): number => {
      const xg = rp / FIELD_PROF_DR;
      if (xg >= last) {
        return J[at(ab + 2 + last) + 1] + (rp - last * FIELD_PROF_DR);
      }
      const i = Math.floor(xg);
      const t = at(ab + 2 + i);
      return J[t + 1] + (J[t + 3] - J[t + 1]) * (xg - i);
    };
    const rho = Math.sqrt(ex * ex + ey * ey);
    const phi = Math.atan2(ey, ex);
    const gx = rho / FIELD_PROF_DR;
    let gi: number;
    let gf: number;
    if (gx >= last) {
      gi = last - 1;
      gf = 1;
    } else {
      gi = Math.floor(gx);
      gf = gx - gi;
    }
    let relA = 1e9;
    let relB = 1e9;
    let ia = 0;
    let ib = 0;
    for (let i = 0; i < Math.min(n, MAX_ARMS); i++) {
      const t = at(rec + 2 + i * stride + 2 + gi);
      let ra = phi - (J[t] + (J[t + 2] - J[t]) * gf);
      ra -= TAU * Math.floor(ra / TAU);
      const rb = ra > 0 ? TAU - ra : 0;
      if (ra < relA) {
        relA = ra;
        ia = i;
      }
      if (rb < relB) {
        relB = rb;
        ib = i;
      }
    }
    const abA = rec + 2 + ia * stride;
    const abB = rec + 2 + ib * stride;
    const mB = this.fieldMbScratch;
    // Probe views (uKBase.z 3 / 4): one bracketing arm's material alone.
    const dbg = Math.round(knotUniformValues().uKBase[2]);
    let onlyA = ia === ib || dbg === 3;
    let onlyB = !onlyA && dbg === 4;
    // The blend weight first (FIELD_GLSL: a pixel inside one arm's
    // footprint evaluates that arm alone - identical, mix at 0 / 1 is exact).
    let t = 0;
    if (!onlyA && !onlyB) {
      const span = relA + relB;
      const hw = rho > fillHalf ? Math.asin(fillHalf / rho) : Math.PI / 2;
      let lo = hw;
      let hi = span - hw;
      const minW = span * FIELD_BLEND_MIN;
      if (hi - lo < minW) {
        lo = (span - minW) * 0.5;
        hi = lo + minW;
      }
      t = hi > lo ? (relA - lo) / (hi - lo) : relA < span * 0.5 ? 0 : 1;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      t = t * t * (3 - 2 * t);
      if (t <= 0) onlyA = true;
      else if (t >= 1) onlyB = true;
    }
    const baseField = (untravSide: boolean): void => {
      if (!onlyB) {
        armPaint(abA, profArc(abA, relA < Math.PI / 2 ? rho * Math.cos(relA) : 0), false, untravSide, mA);
      }
      if (onlyA) {
        compose(mA);
      } else {
        armPaint(abB, profArc(abB, relB < Math.PI / 2 ? rho * Math.cos(relB) : 0), false, untravSide, mB);
        if (onlyB) {
          compose(mB);
        } else {
          // Composed colors blend (see FIELD_GLSL).
          for (let c = 0; c < nc; c++) out[c] = mA[c] + (mB[c] - mA[c]) * t;
          if (!exA) out[3] = 0;
        }
      }
    };
    baseField(routed && fz < 0.5);
    if (routed && fz > 0 && fz < 1) {
      // K169, mid-fade (FIELD_GLSL junctionField): the other side's base,
      // blended by the level. (lastArms then lists that second pass's arms.)
      const p0 = out[0];
      const p1 = out[1];
      const p2 = out[2];
      const p3 = out[3];
      this.fieldLastArm.length = 0;
      baseField(fz >= 0.5);
      // The first pass was untraveled below 0.5 and composed from there on.
      const lo = fz < 0.5;
      const o0 = out[0];
      const o1 = out[1];
      const o2 = out[2];
      out[0] = lo ? p0 + (o0 - p0) * fz : o0 + (p0 - o0) * fz;
      out[1] = lo ? p1 + (o1 - p1) * fz : o1 + (p1 - o1) * fz;
      out[2] = lo ? p2 + (o2 - p2) * fz : o2 + (p2 - o2) * fz;
      if (exA) {
        const o3 = out[3];
        out[3] = lo ? p3 + (o3 - p3) * fz : o3 + (p3 - o3) * fz;
      }
    }
    if (!routed || dbg === 3 || dbg === 4) return;
    // K81 ROUTE BANDS, oldest first (FIELD_GLSL junctionField): the nearest
    // point of each band's centerline polyline and its tau; a one-pixel
    // ramp centered on the half-width (a cover strip: solid ROUTE_BAND_PAD
    // pixels further first).
    const pxW = Math.max(px, 1e-5);
    const reach = fillHalf + (strip ? ROUTE_BAND_PAD + 1 : 0.5) * pxW;
    let base = Math.round(J[hd + 3]);
    const nrr = Math.min(nr, MAX_ROUTES);
    for (let r = 0; r < nrr; r++) {
      const r0 = at(base);
      const nv = Math.round(J[r0]);
      let best = 1e20;
      let tau = 0;
      let q0 = at(base + 1);
      for (let k = 0; k < MAX_ROUTE_VERTS - 1 && k + 1 < nv; k++) {
        const q1 = at(base + 2 + k);
        const dx = J[q1] - J[q0];
        const dy = J[q1 + 1] - J[q0 + 1];
        const wx = x - J[q0];
        const wy = y - J[q0 + 1];
        const l2 = dx * dx + dy * dy;
        const u = l2 > 1e-12 ? Math.max(0, Math.min(1, (wx * dx + wy * dy) / l2)) : 0;
        const ox = wx - dx * u;
        const oy = wy - dy * u;
        const dd = ox * ox + oy * oy;
        if (dd < best) {
          best = dd;
          tau = J[q0 + 2] + (J[q1 + 2] - J[q0 + 2]) * u;
        }
        q0 = q1;
      }
      const cov = Math.max(0, Math.min(1, (reach - Math.sqrt(best)) / pxW));
      if (cov > 0) {
        armPaint(rec + 2 + Math.round(J[r0 + 2]) * stride, -tau, true, false, mA);
        if (J[r0 + 3] > -0.5) {
          armPaint(rec + 2 + Math.round(J[r0 + 3]) * stride, tau, true, false, mB);
          const m = J[r0 + 1];
          let s = Math.max(0, Math.min(1, (tau + m) / (2 * m)));
          s = s * s * (3 - 2 * s);
          for (let c = 0; c < nc; c++) mA[c] = mA[c] + (mB[c] - mA[c]) * s;
        }
        for (let c = 0; c < nc; c++) out[c] = out[c] + (mA[c] - out[c]) * cov;
      }
      base += 1 + nv;
    }
  }
  // Section RGB at a world ARC along a chain into out[0..2] - the ribbon's
  // own color there (its vertex shader's section at the two bracketing
  // samples, lerped), so overlay geometry sampling through here matches the
  // adjacent ribbon exactly at a seam.
  colorAtArc(chain: number, arc: number, out: Float32Array): void {
    this.sectionAtArc(chain, arc, out);
    // Burn / roots wear on the CPU-drawn overlays too (pluck colors): the
    // shader's own FX function at the point, via the mirror - a plucked
    // stretch burns exactly as its ribbon does.
    if (!this.r.fxLive) return;
    const U = knotUniformValues();
    if (U.uKFx[0] !== FX_STYLE.burn && U.uKFx[0] !== FX_STYLE.roots) return;
    const D = kData();
    const c = kChain(D, chain);
    if (!(c.total > 0)) return;
    const a = sampling.normArc(arc, c.total, c.closed);
    kFxColor(D, U, c, kCtrlOfArc(D, c, a), a / c.arcPer, out, this.ignScratch);
  }
  // Mean ctrl per world arc along a junction arm over its first `d` of arc
  // (the fan shader's ctrl search seed slope; 0 when degenerate).
  private armCtrlSlope(
    a: { chain: number; slot: number; dir: number; arc0: number; total: number; closed: boolean },
    d: number
  ): number {
    if (!(d > 1e-6)) return 0;
    const D = kData();
    const c = kChain(D, a.chain);
    if (!(c.total > 0)) return 0;
    const ctrl = kCtrlOfArc(D, c, sampling.normArc(a.arc0 + a.dir * d, c.total, c.closed));
    let delta = ctrl - a.slot;
    if (c.closed) {
      const n = c.nCtrl;
      delta -= n * Math.round(delta / n);
    }
    return Math.abs(delta) / d;
  }
  // The section color at an arc: the ribbon's own Gouraud between its
  // vertices (paint_math kSectionAtArc - the vertex shader's knotSection at
  // the two bracketing samples, lerped).
  sectionAtArc(chain: number, arc: number, out: Float32Array): void {
    const D = kData();
    const c = kChain(D, chain);
    if (!(c.total > 0) || !this.r.chainSamples[chain]) {
      knotSection(D, knotUniformValues(), c, 0, out);
      return;
    }
    kSectionAtArc(D, knotUniformValues(), c, arc, -1, out);
  }
  // Rounded junction joinery: tip/seal discs and, for each wedge between
  // adjacent junction arms, a concave patch from one arm's edge to the
  // next (quadratic bezier with the edge-intersection corner as control).
  // Every fan is a window onto ONE continuous junction FIELD, evaluated
  // PER PIXEL on the GPU (junction_field.ts): the CPU builds only the fan
  // geometry (positions + the texel index of the fan's RECORD) and the
  // records (junction center, arms, radial profiles); the shader reads the
  // ribbons' own per-sample paint from the paint texture. A flat overlay
  // over a ramping section color drew a visible step (or a stamped circle
  // of junction color) at its boundary - the junction-blotch reports - and
  // per-vertex evaluation needed ring-subdivided fans to keep Gouraud from
  // faceting the field (5-30 ms per paint tick at big cuspRadius).
  //
  // GATED: the field animates on the GPU, so a paint-only tick just
  // flushes the paint rows its writes touched. The geometry rebuilds when
  // an update() ran (positions, gap windows - the fans' masks - and
  // visibility), a live joinery input moved, or a reveal / appearance FX
  // is gating joints and fading fans. `force` = rebuild regardless (probes).
  rebuildFillets(force = false): void {
    if (!this.filletLayer) return;
    const fillHalf = this.r.style.threadWidth / 2;
    const nDiscs =
      this.r.freeTips.length + this.fusedTips.length + this.r.junctionArms.length;
    if (nDiscs === 0) return;
    const key =
      this.r.geomRev +
      "|" +
      this.r.cuspRadius +
      "|" +
      this.r.cornerRoundShare +
      "|" +
      this.r.style.threadWidth +
      "|" +
      this.r.style.casingWidth +
      "|" +
      this.r.fadeLength +
      "|" +
      this.r.routeKey +
      this.r.explore.exploreJointsKey() +
      "|uw" +
      this.r.uwRev;
    // A reveal moves the joint gate times (their speed extrapolation) every
    // frame; the FX fades themselves animate on the GPU from the record's
    // J1 times (G2.1), so they need no rebuild.
    if (!force && !this.r.revealOn && key === this.filletKey) return;
    this.filletKey = key;
    this.stripRowsUsed = 0;
    if (!this.r.filletMesh) {
      let armTotal = 0;
      for (const jn of this.r.junctionArms) armTotal += jn.arms.length;
      const wedgeRim = 2 * FILLET_EDGE_PTS_MAX + FILLET_BEZIER_STEPS + 1;
      // + one K81 cover strip per arm (COVER_STRIP_PTS samples, two
      // vertices each, two triangles per segment).
      const verts =
        armTotal * (1 + wedgeRim + 2 * COVER_STRIP_PTS) +
        nDiscs * (2 + DISC_SEGS);
      const idx =
        (armTotal * (wedgeRim - 1 + 2 * (COVER_STRIP_PTS - 1)) +
          nDiscs * DISC_SEGS) *
        3;
      this.r.filletMesh = new TriFanMesh(verts, idx);
      this.r.filletMesh.mesh.shader = this.r.explorePieces ? junctionShaderExplore() : junctionShader();
      this.filletLayer.addChild(this.r.filletMesh.mesh);
      // The top mesh gets the same capacity: any junction can flip
      // layers frame to frame as threads move.
      this.r.filletTopMesh = new TriFanMesh(verts, idx);
      this.r.filletTopMesh.mesh.shader = this.r.explorePieces ? junctionShaderExplore() : junctionShader();
      this.filletTopLayer!.addChild(this.r.filletTopMesh.mesh);
    }
    const fmBottom = this.r.filletMesh;
    const fmTop = this.r.filletTopMesh!;
    fmBottom.begin();
    fmTop.begin();
    // All pushes below route through `fm`; per-junction code points it at
    // the voted layer and resets it to bottom afterward.
    let fm = fmBottom;

    // LAYER VOTES (see filletTopLayer), PER-ARM: an arm is "over-near"
    // when a nearby crossing on its chain side has the arm as the OVER
    // pass (a foreign thread dives under it - that crossing's erase
    // swath would clip the web beside the arm), "under-near" when the
    // arm itself dives. Each WEDGE then picks its layer from its own
    // two arms - the earlier per-junction binary let one diving arm
    // force the whole joint punchable, and webs still clipped at
    // crossing overpasses on the other arms.
    const underNear = new Set<string>();
    const overNear = new Set<string>();
    const armKey = (chain: number, slot: number, dir: number): string =>
      chain + ":" + slot + ":" + dir;
    if (this.r.junctionArcCtrls.size > 0) {
      const gapW = (this.r.style.casingWidth - this.r.style.threadWidth) / 2;
      const jointReach = Math.max(
        fillHalf * 1.1,
        fillHalf *
          FILLET_REACH_PER_HALF *
          this.r.cuspRadius *
          JOINT_CLEAR_REACH_SCALE
      );
      const voteReach =
        jointReach + fillHalf + ERASE_WIDTH_PAD + gapW + this.r.fadeLength + 0.3;
      // Joint arcs per chain, derived once per rebuild (every pass on a
      // chain compares against the same list).
      const jArcCache = new Map<number, Float64Array>();
      const visit = (
        pass: CrossingPass,
        isOver: boolean
      ): void => {
        const list = this.r.junctionArcCtrls.get(pass.chain);
        if (!list) return;
        const samples = this.r.chainSamples[pass.chain];
        if (!samples) return;
        const closed = this.r.ps.chainBreakAfter[pass.chain] < 0;
        const total = samples.totalLength;
        const pArc = sampling.paintArcAt(samples, sampling.renderCtrl(pass), closed);
        let jArcs = jArcCache.get(pass.chain);
        if (!jArcs) {
          jArcs = new Float64Array(list.length);
          for (let i = 0; i < list.length; i++) {
            jArcs[i] = sampling.paintArcAt(samples, list[i].ctrl, closed);
          }
          jArcCache.set(pass.chain, jArcs);
        }
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          const jArc = jArcs[i];
          let d = pArc - jArc;
          if (closed) {
            d = ((d % total) + total) % total;
            if (d > total / 2) d -= total;
          }
          if (Math.abs(d) >= voteReach || Math.abs(d) < 1e-4) continue;
          const key = armKey(pass.chain, e.ctrl, d > 0 ? 1 : -1);
          if (isOver) overNear.add(key);
          else underNear.add(key);
        }
      };
      for (const cr of this.r.ps.crossings) {
        visit(cr.over, true);
        visit(cr.under, false);
      }
    }

    // RECORDS for the GPU field (layout: junction_field.ts), appended as
    // junctions and tips are built and uploaded once at the end. ensure()
    // may swap the mirror, so writers re-read rd.data after it.
    const rd = recordData();
    let cursor = 0;
    // An AXIS record: the material of `chain` at a point's projection onto
    // the axis (ax, ay) through (cx, cy) at arc0 - a free tip's cap disc
    // (or the host-axis fallback) is a patch of that thread's own paint,
    // so it vanishes into ramped section colors instead of stamping a
    // circle.
    const writeAxis = (
      cx: number,
      cy: number,
      j1: [number, number],
      chain: number,
      arc0: number,
      ax: number,
      ay: number,
      ctrl0: number,
      rad: number
    ): number => {
      // The cap's strip row spans the axis projections [-rad, rad].
      const step = (2 * rad) / (STRIP_W - 1);
      const row = this.writeStripRow(chain, arc0 - rad, step, step, ctrl0, 0);
      rd.ensure(cursor + 4);
      const D = rd.data;
      const o = cursor * 4;
      D[o] = cx;
      D[o + 1] = cy;
      D[o + 2] = 0;
      D[o + 3] = 0;
      D[o + 4] = j1[0];
      D[o + 5] = j1[1];
      D[o + 6] = 0;
      D[o + 7] = 0;
      D[o + 8] = chain;
      D[o + 9] = row;
      D[o + 10] = 1 / step;
      D[o + 11] = rad;
      D[o + 12] = arc0;
      D[o + 13] = ax;
      D[o + 14] = ay;
      D[o + 15] = ctrl0; // The ctrl at arc0 (the shader's ctrl search seed).
      const base = cursor;
      cursor += 4;
      return base;
    };
    // Gates still far off skip their fans this rebuild (the rebuild runs
    // every frame while a reveal plays; J1 fades the rest in).
    const fxNowJ = knotUniformValues().uKFx[2];
    // A disc fan's rim (closed: DISC_SEGS + 1 points, first repeated).
    const discRim = (cx: number, cy: number, r: number): number[] => {
      const rim: number[] = [];
      for (let i = 0; i <= DISC_SEGS; i++) {
        rim.push(cx + DISC_COS[i] * r, cy + DISC_SIN[i] * r);
      }
      return rim;
    };
    const pushDisc = (
      cx: number,
      cy: number,
      r: number,
      chain: number,
      arc0: number,
      ax: number,
      ay: number,
      gateCtrl: number,
      flankFill?: number,
      half?: [number, number]
    ): [number, number] | null => {
      // A lone cap disc (free tip / host fallback) reads its own thread -
      // and gates on it (shown once revealed there, fading with its FX; a
      // gate still far off skips the cap this rebuild). Returns the gate
      // (null when skipped), so a glyph's stadium can share it.
      // `half` (K833): in the border look a free-end cap is a semicircle
      // - the full disc's rim drew a whole circle at the dead end, its
      // back half a circular stroke inside the thread. (ox, oy) is the
      // outward direction at the tip.
      const j1 = this.r.jointGate("c" + chain + ":" + gateCtrl, [[chain, gateCtrl]]);
      if (j1[0] > fxNowJ + GATE_LEAD) return null;
      const rb = writeAxis(cx, cy, j1, chain, arc0, ax, ay, gateCtrl, r);
      if (half) {
        const rim: number[] = [];
        const px = -half[1];
        const py = half[0];
        for (let i = 0; i <= DISC_SEGS / 2; i++) {
          const a = -Math.PI / 2 + (i / (DISC_SEGS / 2)) * Math.PI;
          rim.push(
            cx + (Math.cos(a) * half[0] + Math.sin(a) * px) * r,
            cy + (Math.cos(a) * half[1] + Math.sin(a) * py) * r
          );
        }
        fm.pushFan(cx, cy, rim, rb, null, false, flankFill);
      } else {
        fm.pushFan(cx, cy, discRim(cx, cy, r), rb, null, false, flankFill);
      }
      return j1;
    };
    // Local thread direction at an arc (two nearby probes), into
    // axisScratch.
    const axisAt = (chain: number, arc: number): void => {
      const samples = this.r.chainSamples[chain]!;
      const closed = this.r.ps.chainBreakAfter[chain] < 0;
      const total = samples.totalLength;
      sampling.sampleAtSafe(
        samples,
        sampling.normArc(arc + 0.2, total, closed),
        closed,
        this.r.sampleScratch,
        0
      );
      const x1 = this.r.sampleScratch[0];
      const y1 = this.r.sampleScratch[1];
      sampling.sampleAtSafe(
        samples,
        sampling.normArc(arc - 0.2, total, closed),
        closed,
        this.r.sampleScratch,
        0
      );
      const dx = x1 - this.r.sampleScratch[0];
      const dy = y1 - this.r.sampleScratch[1];
      const len = Math.hypot(dx, dy) || 1;
      this.axisScratch[0] = dx / len;
      this.axisScratch[1] = dy / len;
    };

    // THE JUNCTION FIELD: one continuous color function around each
    // junction, shared by EVERY overlay primitive there. A query point's
    // direction from the junction picks the two bracketing arms (by their
    // angles at the point's radius); each arm is sampled at the point's
    // distance PROJECTED onto it (a
    // point beside a thread reads its cross-section, a point along it
    // reads its ramp), composed with its own paint, and the two blend
    // edge-aware across the gap between their ribbons (FIELD_GLSL in
    // junction_field.ts evaluates it per pixel; cpuJunctionField is the CPU
    // reference). Disc rims, wedge rims, and the ribbons themselves then
    // agree wherever they meet. Per-primitive sampling (host-axis discs,
    // per-arm wedges) left faint rim arcs wherever one primitive's color
    // crossed ANOTHER arm's material - the circled phone-zoom reports.
    interface JArm {
      ang: number;
      dx: number;
      dy: number;
      chain: number;
      dir: number;
      slot: number;
      arc0: number;
      closed: boolean;
      total: number;
      // DOMAIN: how far along this arm the joint's joinery may reach or
      // sample - half way to the arm's next joint (a short bridge's far
      // half belongs to the OTHER joint: its ramp converges there), or to
      // an open chain's end. Without it both joints' webs spanned the
      // whole bridge and overlapped with two different fields.
      domain: number;
      // RADIAL PROFILE (see FIELD_PROF_DR): the arm centerline's angle
      // around the joint and its arc, at uniform radius steps - the field
      // follows CURVED arms (flanks hug the true silhouette; a straight
      // axis put curved arms' own edges outside their footprint).
      pth: Float32Array;
      ps: Float32Array;
      // Layer flags (see LAYER VOTES), resolved once per rebuild.
      top: boolean;
      dives: boolean;
      // Flank centerline samples [x, y, tx, ty] per flank point, shared
      // by the arm's two wedges (left and right flanks differ only in the
      // offset side). null until first used.
      flankPts: Float64Array | null;
      // Arc from the joint to an open chain's end along the arm (Infinity
      // on a closed chain): bounds the K81 route band's arm stretches.
      toEnd: number;
    }
    interface JRec {
      jx: number;
      jy: number;
      arms: JArm[];
      // REVEAL + FX GATE (record J1): shown once every arm-adjacent point is
      // revealed (half-drawn fillets over zero-width arms read as floating
      // scraps), fading in as its latest-ignited arm settles.
      j1: [number, number];
      jn: number; // Index into junctionArms (for the layer vote).
      rb: number; // Record texel index (-1: < 2 arms, no field).
      mask: Float32Array; // Gap slots masking this joint's fans.
      // The farthest any of its fan vertices lies from (jx, jy): bounds the
      // arc its arms' strip rows must cover.
      rMax: number;
      // K81 ROUTE BANDS through this joint, oldest first: arm indexes into
      // arms[0..n) (ib -1 = a one-arm band, the head), the turn's start
      // arc d along both arms and the half-length m of its A -> B blend.
      routes: Array<{ ia: number; ib: number; d: number; m: number }>;
    }
    // Radial profile of one arm around its joint (JArm.pth/ps): walk the
    // centerline outward in FIELD_PROF_ARC steps and resample angle + arc
    // onto a uniform radius grid, so field lookups are O(1). Radius that
    // stalls (an arm curling back) keeps the last outward sample; past the
    // walk, the profile extends straight.
    // Queries reach the wedge tips (L) and tip-disc rims (~2 fillHalf);
    // past the grid the profile extrapolates straight.
    const fieldReach =
      Math.max(fillHalf * FILLET_REACH_PER_HALF * this.r.cuspRadius, fillHalf * 2) +
      0.25;
    const profN = Math.ceil(fieldReach / FIELD_PROF_DR) + 2;
    if (this.fieldProfLen !== profN) {
      this.fieldProfPool.length = 0;
      this.fieldProfLen = profN;
    }
    let profUsed = 0;
    const buildProfile = (
      samples: SplineSamples,
      arc0: number,
      dir: number,
      closed: boolean,
      toEnd: number,
      jx: number,
      jy: number,
      ang0: number
    ): { pth: Float32Array; ps: Float32Array } => {
      // Pooled across rebuilds (this runs every paint tick).
      while (this.fieldProfPool.length < profUsed + 2) {
        this.fieldProfPool.push(new Float32Array(profN));
      }
      const pth = this.fieldProfPool[profUsed++];
      const ps = this.fieldProfPool[profUsed++];
      const total = samples.totalLength;
      const steps = Math.ceil((fieldReach * 1.4) / FIELD_PROF_ARC);
      let prevR = 0;
      let prevTh = ang0;
      let prevS = 0;
      let first = true;
      let g = 0;
      for (let k = 1; k <= steps && g < profN; k++) {
        const s = Math.min(k * FIELD_PROF_ARC, toEnd);
        sampling.sampleAtSafe(
          samples,
          sampling.normArc(arc0 + dir * s, total, closed),
          closed,
          this.r.sampleScratch,
          0
        );
        const ex = this.r.sampleScratch[0] - jx;
        const ey = this.r.sampleScratch[1] - jy;
        const r = Math.hypot(ex, ey);
        let th = Math.atan2(ey, ex);
        while (th - prevTh > Math.PI) th -= Math.PI * 2;
        while (th - prevTh < -Math.PI) th += Math.PI * 2;
        if (first) {
          prevTh = th; // The grid's innermost entries share the first ray.
          first = false;
        }
        if (r > prevR) {
          while (g < profN && g * FIELD_PROF_DR <= r) {
            const f = (g * FIELD_PROF_DR - prevR) / (r - prevR);
            pth[g] = prevTh + (th - prevTh) * f;
            ps[g] = prevS + (s - prevS) * f;
            g++;
          }
          prevR = r;
          prevTh = th;
          prevS = s;
        }
        if (s >= toEnd) break;
      }
      for (; g < profN; g++) {
        pth[g] = prevTh;
        ps[g] = prevS + (g * FIELD_PROF_DR - prevR);
      }
      return { pth, ps };
    };

    const recs: JRec[] = [];
    // K846: the junction side-cut entries (samp_table's RANGE_JUNCTION)
    // for the wedges this rebuild draws, published by finish() for
    // CrossingGaps.assignGapIds to pack behind the gap windows.
    const juncEntries: Array<{
      chain: number;
      center: number;
      lo: number;
      hi: number;
      left: boolean;
      right: boolean;
    }> = [];
    for (const jn of this.r.junctionArms) {
      // APEX FROM THE ARMS' OWN SAMPLES: the physics centroid +
      // flowOffset(point) rides a DIFFERENT displacement model than the
      // ribbons (per-control flow displacement re-splined, plus displayF
      // and tuck adjustments) - the two disagree by up to ~0.06 world
      // under flow (apex-drift census: 82/92 junctions over 0.05), so
      // wedge bases shifted against the curve-hugging flank tips and
      // fanned small ear slivers (the "jagged sticky-outy bits" seen
      // with fw > 0). The mean of each arm's arc0 sample IS the flank
      // pipeline's own junction point - zero mismatch by construction.
      let jx = 0;
      let jy = 0;
      let nA = 0;
      for (const a of jn.arms) {
        const samples = this.r.chainSamples[a.chain];
        if (!samples) continue;
        const closedA = this.r.ps.chainBreakAfter[a.chain] < 0;
        sampling.sampleAtSafe(
          samples,
          sampling.paintArcAt(samples, a.slot, closedA),
          closedA,
          this.r.sampleScratch,
          0
        );
        jx += this.r.sampleScratch[0];
        jy += this.r.sampleScratch[1];
        nA++;
      }
      if (nA > 0) {
        jx /= nA;
        jy /= nA;
      } else {
        // No live samples (shouldn't happen): physics-centroid fallback.
        for (const p of jn.particles) {
          jx += this.r.ps.positions[p * 2];
          jy += this.r.ps.positions[p * 2 + 1];
        }
        jx /= jn.particles.length;
        jy /= jn.particles.length;
        this.r.flowOffset(jx, jy, this.r.flowScratch);
        jx += this.r.flowScratch[0];
        jy += this.r.flowScratch[1];
      }
      const arms: JArm[] = [];
      for (const a of jn.arms) {
        const samples = this.r.chainSamples[a.chain];
        if (!samples) continue;
        const closedA = this.r.ps.chainBreakAfter[a.chain] < 0;
        sampling.sampleAtSafe(
          samples,
          sampling.paintArcAt(samples, a.slot + a.dir * 0.8, closedA),
          closedA,
          this.r.sampleScratch,
          0
        );
        let dx = this.r.sampleScratch[0] - jx;
        let dy = this.r.sampleScratch[1] - jy;
        const len = Math.hypot(dx, dy);
        if (len < 0.15) continue;
        dx /= len;
        dy /= len;
        const arc0 = sampling.paintArcAt(samples, a.slot, closedA);
        const total = samples.totalLength;
        const nextCtrl = this.r.armNextJointCtrl(recs.length, a);
        let nextJ = Infinity;
        if (nextCtrl !== null) {
          nextJ = (sampling.paintArcAt(samples, nextCtrl, closedA) - arc0) * a.dir;
          if (closedA) nextJ = ((nextJ % total) + total) % total;
          if (nextJ <= 1e-3) nextJ = Infinity;
        }
        const toEnd = closedA ? Infinity : a.dir > 0 ? total - arc0 : arc0;
        const ang = Math.atan2(dy, dx);
        const prof = buildProfile(
          samples,
          arc0,
          a.dir,
          closedA,
          toEnd,
          jx,
          jy,
          ang
        );
        arms.push({
          ang,
          dx,
          dy,
          chain: a.chain,
          dir: a.dir,
          slot: a.slot,
          arc0,
          closed: closedA,
          total,
          domain: Math.min(nextJ / 2, toEnd),
          pth: prof.pth,
          ps: prof.ps,
          top: false,
          dives: false,
          flankPts: null,
          toEnd,
        });
      }
      arms.sort((p, q) => p.ang - q.ang);
      const j1 = this.r.jointGate(
        "j" + recs.length,
        jn.arms.map((a) => [a.chain, a.slot + a.dir * 0.8] as [number, number])
      );
      let mask = this.jointMaskPool[recs.length];
      if (!mask) {
        mask = new Float32Array(GAP_SLOTS);
        this.jointMaskPool[recs.length] = mask;
      }
      recs.push({
        jx,
        jy,
        arms,
        j1,
        jn: recs.length,
        rb: -1,
        mask,
        rMax: 0,
        routes: [],
      });
    }
    // JUNCTION RECORDS (joints with >= 2 arms - nothing else draws or reads
    // a field): header, the gate texel J1 = (tOn, tLast), then per arm (in
    // angle order) its chain/arc header pair and its profile, one texel per
    // radius step carrying both ends of a lookup.
    setFieldParams(fillHalf, profN);
    const armStride = 2 + profN;
    this.r.recBaseByJn.clear();
    for (const rec of recs) {
      const n = Math.min(rec.arms.length, MAX_ARMS);
      if (n < 2) continue;
      rd.ensure(cursor + 2 + n * armStride);
      const D = rd.data;
      const o = cursor * 4;
      D[o] = rec.jx;
      D[o + 1] = rec.jy;
      D[o + 2] = n;
      D[o + 3] = 0;
      D[o + 4] = rec.j1[0];
      D[o + 5] = rec.j1[1];
      // K127: > 0 = fully traveled; K169: the level it has faded in to (0 =
      // the untraveled rows, 1 = the composed rows, between = their blend);
      // K191: a web that stopped being full fades back down through it.
      D[o + 6] = this.r.webFade.level(rec.jn, this.r.paintClock);
      D[o + 7] = 0;
      for (let i = 0; i < n; i++) {
        const a = rec.arms[i];
        const ab = (cursor + 2 + i * armStride) * 4;
        const pth = a.pth;
        const ps = a.ps;
        D[ab] = a.chain;
        // The ctrl search SEED along the arm: its joint ctrl (.w of the next
        // texel) plus the arc offset times this mean ctrl-per-arc over the
        // stretch the field samples (G2.2: the fans evaluate the ribbon's
        // section from the arc table; a seed from the joint alone cost the
        // fan shader ~0.6 ms/frame in walks at 3200x1800).
        D[ab + 1] = this.armCtrlSlope(a, Math.min(a.domain, ps[profN - 1]));
        // The arm's strip row and its texels per world arc: written in
        // finish(), once the fans have bounded the reach (rMax).
        D[ab + 2] = 0;
        D[ab + 3] = 0;
        D[ab + 4] = a.arc0;
        D[ab + 5] = a.dir;
        D[ab + 6] = Math.min(a.domain, 1e9);
        D[ab + 7] = a.slot; // The arm's joint ctrl (the shader's search seed).
        for (let g = 0; g < profN; g++) {
          const p = ab + 8 + g * 4;
          const g1 = g + 1 < profN ? g + 1 : g;
          D[p] = pth[g];
          D[p + 1] = ps[g];
          D[p + 2] = pth[g1];
          D[p + 3] = ps[g1];
        }
      }
      rec.rb = cursor;
      this.r.recBaseByJn.set(rec.jn, cursor);
      cursor += 2 + n * armStride;
    }
    // K81 ROUTES: each record's resolved routes as indexes into its arms
    // (the first n, in angle order - what the record holds). A route whose
    // arm has no record entry (shorter than 0.15 world, or past MAX_ARMS)
    // gets no band; its junction's caps are dropped all the same (residual).
    if (this.r.routesByJn.size > 0) {
      for (const rec of recs) {
        if (rec.rb < 0) continue;
        const list = this.r.routesByJn.get(rec.jn);
        if (!list) continue;
        const n = Math.min(rec.arms.length, MAX_ARMS);
        const find = (x: RouteJArm): number => {
          for (let i = 0; i < n; i++) {
            const a = rec.arms[i];
            if (a.chain === x.chain && a.slot === x.slot && a.dir === x.dir) {
              return i;
            }
          }
          return -1;
        };
        for (const r of list) {
          const ia = find(r.a);
          if (ia < 0) continue;
          const ib = r.b ? find(r.b) : -1;
          if (r.b && ib < 0) continue;
          rec.routes.push({ ia, ib, d: 0, m: 0.5 * fillHalf });
        }
      }
    }
    // Nearest under-gap near edge ahead along an arm (mid-lane extents of
    // underWindows), or Infinity.
    const gapNearOf = (arm: JArm): number => {
      const win = this.r.underWindows.get(arm.chain);
      if (!win) return Infinity;
      let near = Infinity;
      for (let i = 0; i < win.length; i += 3) {
        let along = (win[i] - arm.arc0) * arm.dir;
        if (arm.closed) {
          along = ((along % arm.total) + arm.total) % arm.total;
          if (along > arm.total / 2) along -= arm.total;
        }
        // [center, extNeg, extPos] along the chain -> near/far edges
        // along this arm's outward direction.
        const far = along + (arm.dir > 0 ? win[i + 2] : win[i + 1]);
        if (far <= 0) continue; // Entirely behind the joint.
        const nearEdge = along - (arm.dir > 0 ? win[i + 1] : win[i + 2]);
        if (nearEdge < near) near = nearEdge;
      }
      return near;
    };
    // TOP: some nearby crossing has this arm as its OVER pass, and none
    // has it diving. An arm DIVES AT THE JOINT only when its own gap
    // starts within FILLET_DIVE_NEAR fillHalfs: a farther dive is kept out
    // of the web by the reach clamp (armReach), so the joint may still
    // ride the top layer. Counting every under-near arm as diving pinned
    // "mixed" joints (one arm over-near, another diving ~1 world out) to
    // the bottom layer, where the OVER crossing's under-thread erase
    // punched their seal discs and wedges - the hairline cracks / dark
    // bites at fat widths (crossings 23/43/62 at the cr=3 tw=0.58 repro).
    // Resolved once per arm (the wedge loop asks per wedge).
    for (const rec of recs) {
      for (const a of rec.arms) {
        const k = armKey(a.chain, a.slot, a.dir);
        const under = underNear.has(k);
        a.top = overNear.has(k) && !under;
        a.dives = under && gapNearOf(a) < fillHalf * FILLET_DIVE_NEAR;
      }
    }
    const armTop = (a: JArm): boolean => a.top;
    const armDives = (a: JArm): boolean => a.dives;
    // Discs (seal + fused tips) stay junction-level: top only when some
    // arm needs cover and none dives.
    const layerFor = (rec: JRec): TriFanMesh =>
      rec.arms.some(armTop) && !rec.arms.some(armDives)
        ? fmTop
        : fmBottom;

    // EDGE-AWARE BLEND (the field's model; FIELD_GLSL evaluates it): the
    // two bracketing arms (by their rays' angles AT THE POINT'S RADIUS -
    // curved arms) blend only across the GAP between their ribbon edges;
    // inside an arm's own width the field IS that arm's material. The old
    // centerline-to-centerline angular blend painted neighbor colors onto
    // every arm's footprint off its centerline (~40% at a flank half a
    // world out), so wherever the web met the arm's own ribbon - flank
    // edges, disc rims, crossing over-fills drawn on top with exact colors
    // - a hard seam showed (masked until the section cache re-bake made
    // ramps converge AT the joint). Where the ribbons still overlap near
    // the joint, the blend keeps FIELD_BLEND_MIN of the wedge angle,
    // centered. PROBE HOOK: the CPU reference over THIS rebuild's records.
    this.fieldProbe = {
      at: (ji, x, y, out, px = 0, strip = false) => {
        const rec = recs[ji];
        if (!rec || rec.rb < 0) return false;
        this.cpuJunctionField(rec.rb, x, y, out, px, strip);
        return true;
      },
      arms: (ji) => recs[ji]?.arms ?? [],
      routes: (ji) => recs[ji]?.routes ?? [],
      center: (ji) => (recs[ji] ? [recs[ji].jx, recs[ji].jy] : null),
      record: (ji) => recs[ji]?.rb ?? -1,
      gate: (ji) => recs[ji]?.j1 ?? null,
      lastArms: () => [...this.fieldLastArm],
      full: (ji) => this.r.fullJn.has(ji),
      fade: (ji) => {
        const r = recs[ji];
        return r && r.rb >= 0 ? recordData().data[(r.rb + 1) * 4 + 2] : -1;
      },
    };

    // (The over-fill "fills wear the joint field" pass is gone with the
    // over fills themselves: crossing gaps are per-pixel, so no copy of an
    // over thread is drawn on top of the web.)
    // JUNCTION GAP MASKS (per-pixel gaps; see gap_mask.ts): a joint's fans
    // are masked by the gap slots of the crossings whose UNDER pass is one
    // of its arms, whose window comes within the joinery's reach, and
    // whose OVER pass is foreign to the joint. A junction fan hides only
    // inside that over thread's silhouette, so the thread passing over the
    // arm shows on top of the web (what its over-fill used to paint - fans
    // draw above every base ribbon); no casing grooves the joint's own
    // surfaces. Free-tip caps (below) are the under thread's own material
    // and take the full mask.
    const fanReach =
      Math.max(fillHalf * FILLET_REACH_PER_HALF * this.r.cuspRadius, fillHalf) +
      fillHalf;
    // A slot whose over pass is one of the joint's OWN arms (within the
    // joinery's reach of the joint) is not listed: the field already
    // renders that arm's material, and cutting the joint's disc along it
    // exposed raw tucked tips. Listed slots get the junction-fan id
    // -(slot + 2): the foreign over thread's silhouette only.
    const ownArm = (rec: JRec, slot: number): boolean => {
      const oc = this.r.slotOverChain[slot];
      if (oc < 0) return false;
      const oa = this.r.slotOverArc[slot];
      for (const a of rec.arms) {
        if (a.chain !== oc) continue;
        let along = (oa - a.arc0) * a.dir;
        if (a.closed) {
          along = ((along % a.total) + a.total) % a.total;
          if (along > a.total / 2) along -= a.total;
        }
        if (along > -fillHalf && along < fanReach + fillHalf) return true;
      }
      return false;
    };
    const jointMask = (rec: JRec): void => {
      rec.mask.fill(-1);
      const cand: number[] = [];
      for (const a of rec.arms) {
        const wins = this.r.chainWins.get(a.chain);
        if (!wins) continue;
        for (let w = 0; w < wins.length; w += 4) {
          let along = (wins[w + 1] - a.arc0) * a.dir;
          if (a.closed) {
            along = ((along % a.total) + a.total) % a.total;
            if (along > a.total / 2) along -= a.total;
          }
          const lo = along - (a.dir > 0 ? wins[w + 2] : wins[w + 3]);
          const hi = along + (a.dir > 0 ? wins[w + 3] : wins[w + 2]);
          if (hi < -fillHalf || lo > fanReach) continue;
          const slot = wins[w];
          if (ownArm(rec, slot)) continue;
          const dist = Math.max(0, lo);
          // Search the SLOT entries only: cand interleaves [slot, dist],
          // and slot 0 would match any dist of exactly 0.
          let at = -1;
          for (let i = 0; i < cand.length; i += 2) {
            if (cand[i] === slot) {
              at = i;
              break;
            }
          }
          if (at < 0) cand.push(slot, dist);
          else cand[at + 1] = Math.min(cand[at + 1], dist);
        }
      }
      // Nearest GAP_SLOTS crossings win.
      const n = cand.length / 2;
      for (let k = 0; k < Math.min(GAP_SLOTS, n); k++) {
        let bi = -1;
        let bd = Infinity;
        for (let i = 0; i < n; i++) {
          if (cand[i * 2] >= 0 && cand[i * 2 + 1] < bd) {
            bd = cand[i * 2 + 1];
            bi = i;
          }
        }
        if (bi < 0) break;
        rec.mask[k] = -(cand[bi * 2] + 2);
        cand[bi * 2] = -1;
      }
    };
    for (const rec of recs) jointMask(rec);
    const setFanMask = (ids: Float32Array | null): void => {
      if (ids) {
        fmBottom.maskIds.set(ids);
        fmTop.maskIds.set(ids);
      } else {
        fmBottom.maskIds.fill(-1);
        fmTop.maskIds.fill(-1);
      }
    };
    // Every junction fan (seal disc, fused-tip disc, wedge) goes through
    // here: geometry plus the joint's record index - the shader evaluates
    // the field per pixel, so one apex-to-rim triangle per rim segment
    // renders it exactly (no ring subdivision, no per-vertex colors).
    const emitFan = (
      rec: JRec,
      cx: number,
      cy: number,
      rim: number[],
      flank?: Float32Array | number[] | null,
      seal?: boolean,
      flankFill?: number
    ): void => {
      // A triangle's farthest point from the joint is one of its vertices.
      let r2 = (cx - rec.jx) * (cx - rec.jx) + (cy - rec.jy) * (cy - rec.jy);
      for (let i = 0; i < rim.length; i += 2) {
        const dx = rim[i] - rec.jx;
        const dy = rim[i + 1] - rec.jy;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) r2 = d2;
      }
      const r = Math.sqrt(r2);
      if (r > rec.rMax) rec.rMax = r;
      fm.pushFan(cx, cy, rim, rec.rb, flank, seal, flankFill);
    };
    const pushDiscField = (
      rec: JRec,
      cx: number,
      cy: number,
      r: number
    ): void => {
      // K815: a seal disc - in the border look the wedges carry the
      // junction's outline, so the seal draws nothing there.
      emitFan(rec, cx, cy, discRim(cx, cy, r), null, true);
    };

    // Tip positions read the ENDPOINT SAMPLE directly: sampleAt wraps its
    // arc modulo totalLength, so asking it for arc == total lands at arc 0
    // - every atEnd tip disc rendered at its chain's START, carrying the
    // far end's host color across the thread (the floating gold/pale dot
    // reports; the arcAt terminal-wrap bug's sibling).
    const tipXY = (samples: SplineSamples, atEnd: boolean): void => {
      const k = atEnd ? samples.count - 1 : 0;
      this.r.sampleScratch[0] = samples.positions[k * 2];
      this.r.sampleScratch[1] = samples.positions[k * 2 + 1];
    };
    // Rounded caps: dead-end tips get a disc at the terminal wearing
    // their own live material (nothing overlaps a free tip).
    const hideJn = this.r.exploreHideJn; // K76 2b: the joint gate.
    const taperJn = this.r.taperHideJn; // K580: a tapered root's joint.
    const hideFree = this.r.exploreHideFree;
    for (let ti = 0; ti < this.r.freeTips.length; ti++) {
      const tip = this.r.freeTips[ti];
      if (hideFree && hideFree[ti]) continue;
      const samples = this.r.chainSamples[tip.chain];
      if (!samples) continue;
      tipXY(samples, tip.atEnd);
      const cx = this.r.sampleScratch[0];
      const cy = this.r.sampleScratch[1];
      const k = tip.atEnd ? samples.count - 1 : 0;
      const tx = samples.tangents[k * 2];
      const ty = samples.tangents[k * 2 + 1];
      const tl = Math.hypot(tx, ty) || 1;
      // A tip diving under something wears that gap on its cap disc too.
      const tipArc = tip.atEnd ? samples.totalLength : 0;
      const tm = this.tipMaskScratch;
      tm.fill(-1);
      const tw = this.r.chainWins.get(tip.chain);
      for (let wi = 0, n = 0; tw && wi < tw.length && n < GAP_SLOTS; wi += 4) {
        const off = tipArc - tw[wi + 1];
        if (off >= -tw[wi + 2] - fillHalf && off <= tw[wi + 3] + fillHalf) {
          tm[n++] = tw[wi];
        }
      }
      setFanMask(tm);
      pushDisc(
        cx,
        cy,
        fillHalf * 0.99,
        tip.chain,
        tipArc,
        tx / tl,
        ty / tl,
        tip.atEnd ? this.r.ps.chains[tip.chain].length - 1 : 0,
        undefined,
        // K833: border look - the cap is the semicircle closing the
        // thread's two edge strokes, not a full circle (its back half
        // drew a circular stroke inside the thread).
        this.r.threadLook === 1
          ? [tip.atEnd ? tx / tl : -tx / tl, tip.atEnd ? ty / tl : -ty / tl]
          : undefined
      );
      setFanMask(null);
    }
    // Tucked fused tips get the same disc (rounds the cap, covers its
    // corner ears and the cap/host sliver). The tuck point IS a junction,
    // so the disc wears the shared junction field - axis-projected HOST
    // sampling painted host color over the bridge arm's ramp, a faint rim
    // arc on the bridge side (circled in the phone zooms).
    for (const tip of this.fusedTips) {
      const samples = this.r.chainSamples[tip.chain];
      const hostSamples = this.r.chainSamples[tip.hostChain];
      if (!samples || !hostSamples) continue;
      tipXY(samples, tip.atEnd);
      const cx = this.r.sampleScratch[0];
      const cy = this.r.sampleScratch[1];
      let rec: JRec | null = null;
      let best = fillHalf * fillHalf * 9;
      for (const r of recs) {
        if (r.arms.length < 2) continue;
        const ddx = r.jx - cx;
        const ddy = r.jy - cy;
        const dd = ddx * ddx + ddy * ddy;
        if (dd < best) {
          best = dd;
          rec = r;
        }
      }
      if (rec) {
        if (rec.j1[0] > fxNowJ + GATE_LEAD) continue;
        if ((hideJn && hideJn[rec.jn]) || (taperJn && taperJn[rec.jn])) continue;
        fm = layerFor(rec);
        setFanMask(rec.mask);
        // CAP COVER (TIP_DISC_SCALE): the disc reaches the tucked cap's
        // corners without bulging past the bridge's sides - every rim
        // point is clamped into the bridge's own strip (|lateral| <=
        // TIP_DISC_SIDE half-widths) and to 0.99 half-widths behind the
        // tuck point (the old disc's reach into the host). A plain wider
        // disc rounded into the backdrop and neighbors' casing gaps.
        const k = tip.atEnd ? samples.count - 1 : 0;
        let ux = samples.tangents[k * 2];
        let uy = samples.tangents[k * 2 + 1];
        const ul = Math.hypot(ux, uy) || 1;
        ux /= ul;
        uy /= ul;
        if (tip.atEnd) {
          // Inward, into the bridge.
          ux = -ux;
          uy = -uy;
        }
        const rim = discRim(cx, cy, fillHalf * this.tipDiscScale);
        const side = fillHalf * TIP_DISC_SIDE;
        const back = fillHalf * 0.99;
        for (let i = 0; i < rim.length; i += 2) {
          const dx = rim[i] - cx;
          const dy = rim[i + 1] - cy;
          const s = Math.max(-back, dx * ux + dy * uy);
          const l = Math.max(-side, Math.min(side, dy * ux - dx * uy));
          rim[i] = cx + ux * s - uy * l;
          rim[i + 1] = cy + uy * s + ux * l;
        }
        emitFan(rec, cx, cy, rim, null, false, 4);
        // K580 s5, THE STADIUM (tip_stadium.ts): a glyph spur's cover also
        // runs back along its untucked stroke to J, at +-TIP_DISC_SIDE
        // half-widths with a round end around J, filling the waist between
        // the disc above and the body's round piece at J. Glyph-only: maze
        // bridges keep the tuck and the disc alone.
        if (this.r.style.glyph && this.r.style.glyph[tip.chain]) {
          const st = this.r.glyphTipStroke[tip.chain * 2 + (tip.atEnd ? 1 : 0)];
          const band = st ? stadiumRim(st, side, this.stadiumApex) : null;
          if (band) emitFan(rec, this.stadiumApex[0], this.stadiumApex[1], band, null, false, 4);
        }
        setFanMask(null);
        fm = fmBottom;
        continue;
      }
      // No junction record within reach: host-axis fallback. It does
      // happen: a record whose arms' probes fall within 0.15 of its centre
      // (the records loop's `len < 0.15` skip) keeps fewer than 2 arms,
      // and the search above skips it. At xh 2 every glyph junction's
      // record does (K580 s5).
      if (
        this.r.explorePieces &&
        (this.r.exploreVisAt(tip.hostChain, tip.hostCtrl) <= EXPLORE_JOINT_MIN ||
          this.r.exploreVisAt(
            tip.chain,
            tip.atEnd ? this.r.ps.chains[tip.chain].length - 1 : 0
          ) <= EXPLORE_JOINT_MIN)
      ) {
        continue;
      }
      const closedH = this.r.ps.chainBreakAfter[tip.hostChain] < 0;
      const arcH = sampling.paintArcAt(hostSamples, tip.hostCtrl, closedH);
      axisAt(tip.hostChain, arcH);
      const j1H = pushDisc(
        cx,
        cy,
        fillHalf * 0.99,
        tip.hostChain,
        arcH,
        this.axisScratch[0],
        this.axisScratch[1],
        tip.hostCtrl,
        4
      );
      // K580 s5: a glyph junction can reach here. At xh 2 its arms' probes
      // 0.8 ctrl out all fall within 0.15 of J (the arm-drop rule in the
      // records loop), so its record keeps under two arms and the search
      // above skips it: the a's stem foot, the notaper J and the i's joint
      // take this fallback. The stadium (as in the cap cover) then wears
      // the fallback disc's host material through its own axis record,
      // its strip row wide enough to span the band.
      if (j1H && this.r.style.glyph && this.r.style.glyph[tip.chain]) {
        const st = this.r.glyphTipStroke[tip.chain * 2 + (tip.atEnd ? 1 : 0)];
        const band = st ? stadiumRim(st, fillHalf * TIP_DISC_SIDE, this.stadiumApex) : null;
        if (band) {
          let reach = fillHalf * 0.99;
          for (let i = 0; i < band.length; i += 2) {
            reach = Math.max(reach, Math.hypot(band[i] - cx, band[i + 1] - cy));
          }
          const rb = writeAxis(
            cx,
            cy,
            j1H,
            tip.hostChain,
            arcH,
            this.axisScratch[0],
            this.axisScratch[1],
            tip.hostCtrl,
            reach
          );
          fm.pushFan(this.stadiumApex[0], this.stadiumApex[1], band, rb, null, false, 4);
        }
      }
    }

    // Upload this rebuild's geometry and records.
    const finish = (): void => {
      // ARM STRIP ROWS (arm_strip.ts): each arm's row covers the arc its
      // fans can query - from the joint out to the profile's arc at the
      // record's outermost fan vertex (a pixel's projected radius never
      // exceeds its distance from the joint; the profile is monotone),
      // capped by the arm's domain - in STRIP_W texels.
      const last = profN - 1;
      const profArcAt = (ps: Float32Array, rp: number): number => {
        const x = rp / FIELD_PROF_DR;
        if (x >= last) return ps[last] + (rp - last * FIELD_PROF_DR);
        const i = Math.floor(x);
        const i1 = i + 1 < profN ? i + 1 : i;
        return ps[i] + (ps[i1] - ps[i]) * (x - i);
      };
      // K81: a routed record's bands run each arm's centerline out to
      // bandEnd - a half-width past the farthest fan or cover-strip vertex,
      // so no band's round end shows inside what the pass draws - and its
      // rows must cover that far.
      const bandEnd = (rec: JRec, a: JArm): number =>
        Math.min(a.toEnd, profArcAt(a.ps, rec.rMax) + fillHalf);
      const pts: number[] = [];
      for (const rec of recs) {
        if (rec.rb < 0) continue;
        const n = Math.min(rec.arms.length, MAX_ARMS);
        const routed = rec.routes.length > 0;
        // K127: a fully traveled record's base reads the composed rows;
        // K169: while it fades in, it still blends from the untraveled ones
        // (K191: and while it fades out, down to them).
        const untrav = routed && (!this.r.fullJn.has(rec.jn) || this.r.webFade.has(rec.jn));
        for (let i = 0; i < n; i++) {
          const a = rec.arms[i];
          const ab = (rec.rb + 2 + i * armStride) * 4;
          const sMax = Math.max(
            1e-4,
            Math.min(a.domain, routed ? bandEnd(rec, a) : profArcAt(a.ps, rec.rMax))
          );
          const step = sMax / (STRIP_W - 1);
          const slope = rd.data[ab + 1];
          const row = this.writeStripRow(
            a.chain,
            a.arc0,
            a.dir * step,
            step,
            a.slot,
            a.dir * step * slope
          );
          // A routed record's arms also get their UNTRAVELED row (row + 1).
          if (untrav) {
            this.writeStripRow(a.chain, a.arc0, a.dir * step, step, a.slot, a.dir * step * slope, 1);
          }
          rd.data[ab + 2] = row;
          rd.data[ab + 3] = 1 / step;
        }
        if (!routed) continue;
        // ROUTE BLOCKS (junction_field.ts ROUTES): per band R0 = (nVerts, m,
        // armA, armB or -1), then its centerline (x, y, tau, 0) - arm A's
        // own centerline in from bandEnd to the turn's start d, the turn,
        // arm B's out to bandEnd (tau = -arc along A, +arc along B); a
        // one-arm band (the head) runs in to the joint (tau 0 there).
        const routeBase = cursor;
        let nr = 0;
        for (const r of rec.routes) {
          const A = rec.arms[r.ia];
          pts.length = 0;
          const scratch = this.routeScratch;
          // Centerline points of `arm` from arc s0 to s1 in at most `cap`
          // segments of ~0.08 world, tau = sign * arc; each end included
          // on request. Vertex budget: 24 + 15 (the turn) + 24, or 41.
          const along = (
            arm: JArm,
            s0: number,
            s1: number,
            sign: number,
            cap: number,
            incStart: boolean,
            incEnd: boolean
          ): void => {
            const len = Math.abs(s1 - s0);
            const segs = len < 1e-4 ? 0 : Math.min(cap, Math.max(1, Math.ceil(len / 0.08)));
            const k0 = incStart ? 0 : 1;
            const k1 = incEnd ? segs : segs - 1;
            for (let k = k0; k <= k1; k++) {
              const s = segs > 0 ? s0 + ((s1 - s0) * k) / segs : s1;
              armAt(arm, s, scratch, 0);
              pts.push(scratch[0], scratch[1], sign * s);
            }
          };
          if (r.ib >= 0) {
            const B = rec.arms[r.ib];
            along(A, Math.max(bandEnd(rec, A), r.d), r.d, -1, 24, true, false);
            cornerCubic(A, B, r.d, pts);
            along(B, r.d, Math.max(bandEnd(rec, B), r.d), 1, 24, false, true);
          } else {
            along(A, bandEnd(rec, A), 0, -1, 40, true, true);
          }
          const nv = Math.min(pts.length / 3, MAX_ROUTE_VERTS);
          if (nv < 2) continue;
          rd.ensure(cursor + 1 + nv);
          const D = rd.data;
          const o = cursor * 4;
          D[o] = nv;
          D[o + 1] = r.m;
          D[o + 2] = r.ia;
          D[o + 3] = r.ib;
          for (let k = 0; k < nv; k++) {
            D[o + 4 + k * 4] = pts[k * 3];
            D[o + 5 + k * 4] = pts[k * 3 + 1];
            D[o + 6 + k * 4] = pts[k * 3 + 2];
            D[o + 7 + k * 4] = 0;
          }
          cursor += 1 + nv;
          nr++;
        }
        const D = rd.data;
        D[rec.rb * 4 + 3] = routeBase;
        D[rec.rb * 4 + 7] = nr;
      }
      this.r.junctionCutEntries = juncEntries; // K846
      const tb = stripTable();
      tb.markDirty(0, this.stripRowsUsed * 2);
      tb.flush();
      setStripRows(this.stripRowsUsed);
      fmBottom.commit();
      fmTop.commit();
      rd.markDirty(0, cursor);
      rd.flush();
    };
    if (recs.length === 0) {
      finish();
      return;
    }
    const w = fillHalf * 0.97;
    const L = fillHalf * FILLET_REACH_PER_HALF * this.r.cuspRadius;
    const drawWedges = this.r.cuspRadius > 0.05 && L > w * 0.3;
    // JOINERY HONORS THE WEAVE (the yarn's Stage 24b rule): a flank stops
    // short of its arm's nearest under-gap. Junction clearance never caps
    // a cut's COVERAGE, so a crossing parked near a joint cuts within the
    // web's reach (0.24 world vs L 0.55 at cr 2.1); the erase only spans
    // the under thread's width, so web material past the cut survived
    // beside it and floated into the dark gap as a pale spur.
    const armReach = (arm: JArm): number => {
      // The joint's own domain caps every flank (short bridges).
      const dom = Math.min(L, Math.max(L * FILLET_GAP_MIN_FRAC, arm.domain));
      const near = gapNearOf(arm);
      return Math.min(
        dom,
        Math.max(L * FILLET_GAP_MIN_FRAC, near - fillHalf * FILLET_GAP_PAD)
      );
    };

    // K81 ROUTE GEOMETRY. COVER CAP: how far along an arm its ribbon may be
    // re-emitted as a cover strip - short of its nearest under-gap (a fan
    // takes only a foreign over thread's silhouette, not the casing), within
    // its domain, and inside the pluck overlay's never-collapsed joint
    // footprint (pluckNodes: max(fillHalf + gap + 2 CUT_BIAS, the web
    // reach)), so a strip copied before a pluck never stands over a
    // collapsed base.
    const casingGap = (this.r.style.casingWidth - this.r.style.threadWidth) / 2;
    const footCap = Math.max(
      fillHalf + casingGap + 2 * CUT_BIAS,
      drawWedges ? L : 0
    );
    const coverCap = (X: JArm): number =>
      Math.min(gapNearOf(X) - FILLET_GAP_PAD * fillHalf, X.domain, footCap);
    // An arm's centerline point at arc s out from its joint and its OUTWARD
    // unit tangent, into out[o..o+3].
    const armAt = (arm: JArm, s: number, out: Float64Array, o: number): void => {
      sampling.sampleAtSafe(
        this.r.chainSamples[arm.chain]!,
        sampling.normArc(arm.arc0 + arm.dir * s, arm.total, arm.closed),
        arm.closed,
        this.r.sampleScratch,
        0
      );
      out[o] = this.r.sampleScratch[0];
      out[o + 1] = this.r.sampleScratch[1];
      let tx = this.r.sampleScratch[2] * arm.dir;
      let ty = this.r.sampleScratch[3] * arm.dir;
      const tl = Math.hypot(tx, ty);
      if (tl > 1e-6) {
        tx /= tl;
        ty /= tl;
      } else {
        tx = arm.dx;
        ty = arm.dy;
      }
      out[o + 2] = tx;
      out[o + 3] = ty;
    };
    // The band's turn from arm A at arc d to arm B at arc d (routeCubic:
    // tangent to both centerlines, tau -d -> +d), appended to out as
    // (x, y, tau) triples. routeScratch keeps the two arm frames.
    const cornerCubic = (A: JArm, B: JArm, d: number, out: number[]): void => {
      const q = this.routeScratch;
      armAt(A, d, q, 0);
      armAt(B, d, q, 4);
      routeCubic(q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7], d, d > 1e-6 ? 14 : 1, out);
    };
    // The web a route's turn crosses: the wedge between its two arms when
    // they are adjacent around the joint and that wedge is the turn's inner
    // side (narrower than a half turn); null = none drawn there.
    const routeRim = (
      arms: JArm[],
      ia: number,
      ib: number,
      rims: Array<number[] | null> | null
    ): number[] | null => {
      if (!rims) return null;
      const len = arms.length;
      const gapAfter = (k: number): number =>
        arms[(k + 1) % len].ang - arms[k].ang + (k === len - 1 ? Math.PI * 2 : 0);
      if (ib === (ia + 1) % len && gapAfter(ia) < Math.PI) return rims[ia];
      if (ia === (ib + 1) % len && gapAfter(ib) < Math.PI) return rims[ib];
      return null;
    };
    // Distance from (ox, oy) along the unit ray (ux, uy) to the nearest rim
    // segment it crosses (Infinity: none).
    const rayToRim = (
      ox: number,
      oy: number,
      ux: number,
      uy: number,
      rim: number[]
    ): number => {
      let best = Infinity;
      for (let i = 0; i + 3 < rim.length; i += 2) {
        const sx = rim[i + 2] - rim[i];
        const sy = rim[i + 3] - rim[i + 1];
        const den = ux * sy - uy * sx;
        if (Math.abs(den) < 1e-12) continue;
        const wx = rim[i] - ox;
        const wy = rim[i + 1] - oy;
        const t = (wx * sy - wy * sx) / den;
        const s = (wx * uy - wy * ux) / den;
        if (t > 0 && s >= 0 && s <= 1 && t < best) best = t;
      }
      return best;
    };
    // Does a turn starting at arc d keep the band's INNER edge (the side
    // the turn cuts across) inside what the junction pass draws there? A
    // point is covered within either arm's ribbon (a straight ray from the
    // joint) or the seal disc; elsewhere only the web covers it - out to its
    // rim less a quarter half-width (with no web, a 0.04 fillHalf slack).
    const fitPts: number[] = [];
    const turnFits = (
      rec: JRec,
      A: JArm,
      B: JArm,
      d: number,
      rim: number[] | null
    ): boolean => {
      if (d <= 1e-6) return true;
      fitPts.length = 0;
      cornerCubic(A, B, d, fitPts);
      const q = this.routeScratch;
      // Turning left (CCW) when travel in (-tA) crosses travel out (tB) > 0.
      const left = q[3] * q[6] - q[2] * q[7] > 0;
      const np = fitPts.length / 3;
      for (let i = 1; i < np - 1; i++) {
        let tx = fitPts[(i + 1) * 3] - fitPts[(i - 1) * 3];
        let ty = fitPts[(i + 1) * 3 + 1] - fitPts[(i - 1) * 3 + 1];
        const tl = Math.hypot(tx, ty);
        if (tl < 1e-9) continue;
        tx /= tl;
        ty /= tl;
        const ex = fitPts[i * 3] + (left ? -ty : ty) * fillHalf - rec.jx;
        const ey = fitPts[i * 3 + 1] + (left ? tx : -tx) * fillHalf - rec.jy;
        const rr = Math.hypot(ex, ey);
        let e = rr - 0.92 * fillHalf;
        for (const X of [A, B]) {
          if (ex * X.dx + ey * X.dy < 0) continue;
          const lat = Math.abs(ex * X.dy - ey * X.dx) - fillHalf;
          if (lat < e) e = lat;
        }
        if (e <= 0) continue;
        if (rim) {
          if (rr + Math.min(e, 0.25 * fillHalf) > rayToRim(rec.jx, rec.jy, ex / rr, ey / rr, rim)) {
            return false;
          }
        } else if (e > 0.04 * fillHalf) {
          return false;
        }
      }
      return true;
    };

    // K81: a routed record's wedge rims (flank tip A, the outer bezier,
    // flank tip B; null = a skipped wedge), kept for the route pass.
    const rimsOf = new Map<JRec, Array<number[] | null>>();
    for (const rec of recs) {
      const jx = rec.jx;
      const jy = rec.jy;
      const arms = rec.arms;
      if (arms.length < 2) continue;
      if (
        rec.j1[0] > fxNowJ + GATE_LEAD ||
        (hideJn && hideJn[rec.jn]) ||
        (taperJn && taperJn[rec.jn])
      ) {
        // Nothing of a gated joint draws this rebuild, its bands included
        // (K76 2b: nor of a joint the thread reveal hides).
        rec.routes.length = 0;
        continue;
      }
      fm = layerFor(rec);
      setFanMask(rec.mask);
      const jointTop = arms.some(armTop);
      const rims =
        drawWedges && rec.routes.length > 0
          ? new Array<number[] | null>(arms.length).fill(null)
          : null;
      if (rims) rimsOf.set(rec, rims);

      // Seal the junction center with a disc of the junction field under
      // the fillets: the concave-side miter clamp can thin a host ribbon
      // at a bend, opening a nick between a tucked cap and the receded
      // edge regardless of tuck depth.
      pushDiscField(rec, jx, jy, fillHalf * 0.92);

      if (!drawWedges) continue;
      // K846: the arm sides the drawn wedges face (A's left, B's right).
      const armCutL = new Array<boolean>(arms.length).fill(false);
      const armCutR = new Array<boolean>(arms.length).fill(false);

      for (let k = 0; k < arms.length; k++) {
        const A = arms[k];
        const B = arms[(k + 1) % arms.length];
        let gap = B.ang - A.ang;
        if (k === arms.length - 1) gap += Math.PI * 2;
        // Only the near-straight pass-through side gets no fillet (a patch
        // across ~180 degrees would bulge off the host's far edge).
        if (gap > FILLET_MAX_WEDGE) continue;

        // PER-WEDGE layer: this wedge rides above the erase stack iff a
        // nearby foreign thread dives under ANY arm of this joint and
        // neither of ITS arms dives itself. (Only its own arms was not
        // enough: a joint parked beside a crossing's OVER pass has its
        // other wedges - bridge vs the host's far side - sitting in that
        // crossing's under-thread erase footprint; they stayed bottom and
        // were punched - the dark notches/hairlines at cr=3, tw=0.58.)
        fm =
          (jointTop || armTop(A) || armTop(B)) &&
          !armDives(A) &&
          !armDives(B)
            ? fmTop
            : fmBottom;

        // A's wedge-facing edge is its LEFT edge; B's is its RIGHT edge.
        const o1x = jx - A.dy * w;
        const o1y = jy + A.dx * w;
        const o2x = jx + B.dy * w;
        const o2y = jy - B.dx * w;
        // Corner = the edge intersection when it is sane; otherwise (near-
        // parallel arms - junction arms relax to shallow angles, nothing
        // constrains them - or a curvature-displaced corner) fall back to
        // the midpoint between the edge origins, which collapses the
        // fillet into a sliver-filling patch instead of SKIPPING and
        // leaving the reported V-notch holes between shallow arms.
        const denom = A.dx * B.dy - A.dy * B.dx;
        const lim = w * FILLET_CORNER_LIM;
        let cx = (o1x + o2x) / 2;
        let cy = (o1y + o2y) / 2;
        if (Math.abs(denom) >= 0.08) {
          const rx = o2x - o1x;
          const ry = o2y - o1y;
          const t = (rx * B.dy - ry * B.dx) / denom;
          const s = (rx * A.dy - ry * A.dx) / denom;
          if (t >= -w * 0.5 && t <= lim && s >= -w * 0.5 && s <= lim) {
            cx = o1x + A.dx * t;
            cy = o1y + A.dy * t;
          }
        }

        // Each flank HUGS its arm's true curved silhouette: sample the
        // centerline along the arc out to L and offset to the wedge-
        // facing edge. The old straight-line extrapolation (edge origin
        // + dir * L) diverged from curved arms - fillet EARS poked past
        // the silhouette on a curve's outside and crotch GAPS opened on
        // its inside (user report at cr=1.25). The outer rim stays a
        // corner-controlled bezier between the two flanks' real tips.
        const flank = (
          arm: JArm,
          left: boolean,
          out: number[]
        ): [number, number] => {
          // The centerline points + outward tangents are shared by the
          // arm's two wedges (only the offset side differs).
          let fp = arm.flankPts;
          if (!fp) {
            const reach = armReach(arm);
            const samples = this.r.chainSamples[arm.chain]!;
            const np = Math.min(
              FILLET_EDGE_PTS_MAX,
              Math.max(
                FILLET_EDGE_PTS,
                Math.ceil((0.88 * reach) / FILLET_EDGE_CHORD) + 1
              )
            );
            fp = new Float64Array(np * 4);
            for (let e = 0; e < np; e++) {
              const sArc = (0.12 + (0.88 * e) / (np - 1)) * reach;
              const a0 = sampling.normArc(
                arm.arc0 + arm.dir * sArc,
                arm.total,
                arm.closed
              );
              const a1 = sampling.normArc(
                arm.arc0 + arm.dir * (sArc + 0.08),
                arm.total,
                arm.closed
              );
              sampling.sampleAtSafe(samples, a0, arm.closed, this.r.sampleScratch, 0);
              const px = this.r.sampleScratch[0];
              const py = this.r.sampleScratch[1];
              sampling.sampleAtSafe(samples, a1, arm.closed, this.r.sampleScratch, 0);
              // a1 already sits FARTHER OUT along the arm than a0 (both
              // step by arm.dir), so this difference IS the outward
              // tangent. Multiplying by arm.dir again (the Stage 16d form)
              // mirrored every dir = -1 flank onto its arm's FAR edge: the
              // fan swept across the whole arm, painting the junction-field
              // blend over the thread and cutting it with a diagonal rim
              // (pale shards / smudges ON the weave; 100% of dir = -1
              // flank vertices measured on the far edge).
              let tx = this.r.sampleScratch[0] - px;
              let ty = this.r.sampleScratch[1] - py;
              const tl = Math.hypot(tx, ty);
              if (tl > 1e-6) {
                tx /= tl;
                ty /= tl;
              } else {
                // Both probes inside a fused tip's tuck (samples collapsed
                // onto the tuck point): use the arm's junction direction.
                tx = arm.dx;
                ty = arm.dy;
              }
              fp[e * 4] = px;
              fp[e * 4 + 1] = py;
              fp[e * 4 + 2] = tx;
              fp[e * 4 + 3] = ty;
            }
            arm.flankPts = fp;
          }
          const sgn = left ? w : -w;
          for (let e = 0; e < fp.length / 4; e++) {
            const px = fp[e * 4];
            const py = fp[e * 4 + 1];
            out.push(px - fp[e * 4 + 3] * sgn, py + fp[e * 4 + 2] * sgn);
          }
          // K846: the tip's outward tangent (the rim's end tangent).
          const le = fp.length / 4 - 1;
          return [fp[le * 4 + 2], fp[le * 4 + 3]];
        };
        const edgeA: number[] = [];
        const edgeB: number[] = [];
        const tanA = flank(A, true, edgeA);
        const tanB = flank(B, false, edgeB);

        // Perimeter: A's flank inner->outer, bezier rim to B's outer tip
        // (control = corner), B's flank outer->inner. Every pixel
        // evaluates the shared junction field, so the wedge is a window
        // onto the same continuous material as the discs and ribbons.
        const n = FILLET_BEZIER_STEPS;
        const rim: number[] = [];
        const pushPt = (px: number, py: number): void => {
          rim.push(px, py);
        };
        const nA = edgeA.length / 2;
        const nB = edgeB.length / 2;
        for (let e = 0; e < nA; e++) {
          pushPt(edgeA[e * 2], edgeA[e * 2 + 1]);
        }
        const pax = edgeA[(nA - 1) * 2];
        const pay = edgeA[(nA - 1) * 2 + 1];
        const pbx = edgeB[(nB - 1) * 2];
        const pby = edgeB[(nB - 1) * 2 + 1];
        // K830: a sharp wedge's flanks meet at the same clamped corner
        // the rounded wedge uses as its bezier control; a rounded wedge
        // keeps the historic quadratic rim byte-for-byte.
        const roundedWedge = this.r.cornerWedgeRounded(rec.jn, A, B);
        if (roundedWedge) {
          // K846: a cubic whose end controls lie along each flank
          // tip's OWN tangent (the quadratic's control was the
          // straight-line corner, so its end tangents pointed at the
          // corner, not along the arm's curved edge - a visible kink
          // where rim met thread). The corner still sets each
          // control's length, by its projection on the tip tangent;
          // a corner behind a tip falls back to the quadratic.
          const projA = (cx - pax) * tanA[0] + (cy - pay) * tanA[1];
          const projB = (cx - pbx) * tanB[0] + (cy - pby) * tanB[1];
          const dA = projA > 0 ? projA * 0.62 : 0;
          const dB = projB > 0 ? projB * 0.62 : 0;
          if (dA > 1e-6 && dB > 1e-6) {
            const c1x = pax + tanA[0] * dA;
            const c1y = pay + tanA[1] * dA;
            const c2x = pbx + tanB[0] * dB;
            const c2y = pby + tanB[1] * dB;
            for (let i = 1; i < n; i++) {
              const q = i / n;
              const u = 1 - q;
              const m0 = u * u * u;
              const m1 = 3 * u * u * q;
              const m2 = 3 * u * q * q;
              const m3 = q * q * q;
              pushPt(
                m0 * pax + m1 * c1x + m2 * c2x + m3 * pbx,
                m0 * pay + m1 * c1y + m2 * c2y + m3 * pby
              );
            }
          } else {
            for (let i = 1; i < n; i++) {
              const q = i / n;
              const m0 = (1 - q) * (1 - q);
              const m1 = 2 * (1 - q) * q;
              const m2 = q * q;
              pushPt(
                m0 * pax + m1 * cx + m2 * pbx,
                m0 * pay + m1 * cy + m2 * pby
              );
            }
          }
        } else {
          pushPt(cx, cy);
        }
        for (let e = nB - 1; e >= 0; e--) {
          pushPt(edgeB[e * 2], edgeB[e * 2 + 1]);
        }
        // K815: the wedge's flank coordinate along its rim: +1 down
        // A's flank, across the bezier arc to -1 down B's flank.
        const flankArr: number[] = [];
        for (let e = 0; e < nA; e++) flankArr.push(1);
        if (roundedWedge) {
          for (let i = 1; i < n; i++) flankArr.push(1 - 2 * (i / n));
        } else {
          flankArr.push(0);
        }
        for (let e = 0; e < nB; e++) flankArr.push(-1);
        // Fan from the JUNCTION CENTER, not the edge-intersection corner:
        // the corner comes from a straight-line edge model and lands
        // OUTSIDE the true silhouette on curved hosts - fan triangles to
        // it poked jagged stick-outs past the edges (user report). The
        // center is always inside the joint; the corner survives only as
        // the outer rim's bezier control.
        if (rims)
          rims[k] = roundedWedge
            ? rim.slice((nA - 1) * 2, (nA + n) * 2)
            : [pax, pay, cx, cy, pbx, pby];
        armCutL[k] = true; // K846
        armCutR[(k + 1) % arms.length] = true; // K846
        emitFan(rec, jx, jy, rim, flankArr);
      }
      // K846: this junction's side-cut entries, over each marked arm's
      // own flank reach (armReach), in sample coordinates.
      for (let ai = 0; ai < arms.length; ai++) {
        if (!armCutL[ai] && !armCutR[ai]) continue;
        const arm = arms[ai];
        const samples = this.r.chainSamples[arm.chain];
        if (!samples || samples.count < 2) continue;
        const arcPer = arm.total / (arm.closed ? samples.count : samples.count - 1);
        if (!(arcPer > 0)) continue;
        const center = arm.arc0 / arcPer;
        const reachS = armReach(arm) / arcPer;
        const cutLeft = arm.dir > 0 ? armCutL[ai] : armCutR[ai];
        const cutRight = arm.dir > 0 ? armCutR[ai] : armCutL[ai];
        const lo0 = arm.dir > 0 ? center : center - reachS;
        const hi0 = arm.dir > 0 ? center + reachS : center;
        if (arm.closed) {
          if (lo0 < 0) {
            juncEntries.push(
              { chain: arm.chain, center, lo: lo0 + samples.count, hi: samples.count - 1, left: cutLeft, right: cutRight },
              { chain: arm.chain, center, lo: 0, hi: hi0, left: cutLeft, right: cutRight }
            );
          } else if (hi0 > samples.count - 1) {
            juncEntries.push(
              { chain: arm.chain, center, lo: lo0, hi: samples.count - 1, left: cutLeft, right: cutRight },
              { chain: arm.chain, center, lo: 0, hi: hi0 - samples.count, left: cutLeft, right: cutRight }
            );
          } else {
            juncEntries.push({ chain: arm.chain, center, lo: lo0, hi: hi0, left: cutLeft, right: cutRight });
          }
        } else {
          juncEntries.push({
            chain: arm.chain,
            center,
            lo: Math.max(0, lo0),
            hi: Math.min(samples.count - 1, hi0),
            left: cutLeft,
            right: cutRight,
          });
        }
      }
    }

    // K81 ROUTE PASS, per routed record: each band's corner (d, m), then
    // the COVER STRIPS - every arm's own ribbon quads re-emitted in the
    // junction pass out to its cover reach, so the field (the untraveled
    // base with the bands over it) decides those pixels: the arms' own
    // gold ribbons met in an L whose outer corner squared off the turn.
    for (const rec of recs) {
      if (rec.routes.length === 0 || rec.rb < 0) continue;
      const arms = rec.arms;
      const n = Math.min(arms.length, MAX_ARMS);
      const rims = rimsOf.get(rec) ?? null;
      // Per arm: the largest turn start of a band on it (-1: no band).
      const dArm = new Float64Array(n).fill(-1);
      let dMax = 0;
      for (const r of rec.routes) {
        if (r.ib < 0) {
          // The head: a one-arm band in to the joint center.
          r.d = 0;
          r.m = 0.5 * fillHalf;
          dArm[r.ia] = Math.max(dArm[r.ia], 0);
          continue;
        }
        const A = arms[r.ia];
        const B = arms[r.ib];
        const alpha = Math.acos(
          Math.max(-1, Math.min(1, A.dx * B.dx + A.dy * B.dy))
        );
        const rim = routeRim(arms, r.ia, r.ib, rims);
        let d = routeCorner(
          alpha,
          drawWedges ? Math.min(armReach(A), armReach(B)) : fillHalf,
          fillHalf,
          coverCap(A),
          coverCap(B)
        ).d;
        // The turn must stay inside what the junction pass draws: the arms'
        // ribbons, the seal disc and the web between them (its rim, less a
        // margin). Bisect the largest start that fits.
        if (!turnFits(rec, A, B, d, rim)) {
          let lo = 0;
          let hi = d;
          for (let it = 0; it < 6; it++) {
            const mid = (lo + hi) / 2;
            if (turnFits(rec, A, B, mid, rim)) lo = mid;
            else hi = mid;
          }
          d = lo;
        }
        r.d = d;
        r.m = Math.max(d, 0.5 * fillHalf);
        dArm[r.ia] = Math.max(dArm[r.ia], d);
        dArm[r.ib] = Math.max(dArm[r.ib], d);
        if (d > dMax) dMax = d;
      }
      setFanMask(rec.mask);
      const jointTop = arms.some(armTop);
      for (let i = 0; i < n; i++) {
        const X = arms[i];
        // A band's arm is covered a half-width past its turn; every other
        // arm past the farthest turn (a band's edge can cross its start).
        const want =
          dArm[i] >= 0
            ? Math.max(dArm[i] + 0.5 * fillHalf, 1.5 * fillHalf)
            : Math.max(1.25 * fillHalf, dMax + fillHalf);
        const R = Math.min(want, coverCap(X));
        if (!(R > 0)) continue;
        const samples = this.r.chainSamples[X.chain];
        const fill = this.r.fills[X.chain];
        if (!samples || !fill || fill.sampleCount !== samples.count) continue;
        const cnt = samples.count;
        const sp = samples.totalLength / (X.closed ? cnt : cnt - 1);
        if (!(sp > 0)) continue;
        // The ribbon samples from the joint out to R (nearest first, at
        // most COVER_STRIP_PTS), emitted in INCREASING sample order so the
        // strip's triangles are the ribbon's own (same diagonals).
        let kLo: number;
        let kHi: number;
        if (X.dir > 0) {
          kLo = Math.floor(X.arc0 / sp);
          kHi = Math.min(Math.ceil((X.arc0 + R) / sp), kLo + COVER_STRIP_PTS - 1);
        } else {
          kHi = Math.ceil(X.arc0 / sp);
          kLo = Math.max(Math.floor((X.arc0 - R) / sp), kHi - COVER_STRIP_PTS + 1);
        }
        if (!X.closed) {
          kLo = Math.max(0, kLo);
          kHi = Math.min(cnt - 1, kHi);
        }
        if (kHi - kLo < 1) continue;
        const pts: number[] = [];
        for (let k = kLo; k <= kHi; k++) {
          const kk = X.closed ? ((k % cnt) + cnt) % cnt : k;
          // K580 s3: a round join's sample brings its fan's pairs, as long
          // as the strip stays within COVER_STRIP_PTS pairs (its share of
          // the mesh's capacity): one pair is kept for every later sample.
          fill.coverPairs(kk, pts, COVER_STRIP_PTS - pts.length / 4 - (kHi - k));
        }
        for (let q = 0; q < pts.length; q += 2) {
          const r = Math.hypot(pts[q] - rec.jx, pts[q + 1] - rec.jy);
          if (r > rec.rMax) rec.rMax = r;
        }
        fm = jointTop && !X.dives ? fmTop : fmBottom;
        fm.pushStrip(pts, rec.rb);
      }
      fm = fmBottom;
    }
    setFanMask(null);
    finish();
  }
}
