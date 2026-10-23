// THE CROSSING GAPS (K5 R2): the gap-slot solve - per crossing the under
// thread's arc window, the over thread's local polyline, the protect
// intervals and the junction clearances (computeGapSlot); the emergent pool
// (renderEmergent), the marker discs (renderMarkerGaps), and the vertex slot
// ids with G3-0's RANGES (assignGapIds). Moved verbatim from
// ribbon_renderer.ts (c22de79 lines below). A body changed in three ways
// only: a renderer member became `this.r.x`, a sampling helper
// `sampling.x(...)`, and renderEmergent calls computeGapSlot through the
// renderer, so a probe's patch of it still sees every solve. The two module
// names the code reads, G3 and FILLET_REACH_PER_HALF, are renderer getters
// of the same names (`this.r.G3`): nothing imports a value from
// ribbon_renderer.ts. REVEAL_CROSSING_MIN, which only renderMarkerGaps
// reads, is destructured from PAINT_CONST here as it was there. Outside
// the bodies, `private` left the four methods the renderer calls and the
// five constants other files use are exported.
// RibbonRenderer owns one CrossingGaps (its `crossing`): update() calls
// renderEmergent and renderMarkerGaps here; computeGapSlot and assignGapIds
// keep one-line delegations there, which the class and the probes call;
// smoothMin, protect, gapMode and gapOverflow are accessors onto these
// (docs/design/K5_K6_split.md 2.3; render-ribbon.md, THE PARTS).
// Added since the move (not in c22de79): JOINT_PAIR_REACH and isJointPair
// below EMERGENT_POOL, the skipJointPairs toggle (a façade accessor too)
// and its chainLen / chainClosed readers, and renderEmergent's joint skip
// (K397 stage 3).
//
//   REVEAL_CROSSING_MIN            465        destructured from PAINT_CONST
//   GATE_LEAD                      477-480    the reveal gate's look-ahead
//   MARCH_STEP .. MARKER_SLOTS     543-615    slot geometry, CUT_BIAS, pools
//   JOINT_CLEAR_REACH_SCALE ..     630-640    junction clearance terms
//     FADE_JOINT_FLOOR
//   coarseO, coarseU, fineO        685-687    the march polylines
//   nearIdx                        689        polyDist's out-param
//   clearScratch .. protPolyPos    693-705    clearance and protect scratch
//   smoothMin, protect, gapMode,   735-742    the probes' toggles
//     gapOverflow
//   g3Accepted                     961        assignGapIds' kept windows
//   buildPoly                      1505-1531  a centerline span as a polyline
//   polyDist                       1533-1567  nearest-vertex distance
//   protectReach                   1569-1616  a protect interval's half-length
//   twinNeighbor                   2613-2630  is a neighbor pass a twist twin
//   computeGapSlot                 2632-3301  one crossing's slot
//   renderEmergent                 3303-3361  the emergent pool's slots
//   renderMarkerGaps               3363-3464  the marker discs' slots
//   assignGapIds                   3466-3521  vertex slot ids, G3-0's RANGES

import type { CrossingPass } from "../../physics/particle_system";
import type { SplineSamples } from "../../geometry/spline_generator";
import { knotUniformValues } from "../paint_model";
import { PAINT_CONST } from "../paint_const";
import {
  GAP_SLOTS,
  gapChunkBounds,
  gapRangeCircle,
  gapSampRange,
  type GapSampRef,
} from "../gap_mask";
import {
  RANGE_FLOATS,
  assignWindowLanes,
  maxRangeEntries,
  packRanges,
} from "../samp_table";
import * as sampling from "./sampling";
import type { PassNeighbors } from "./sampling";
import type { RibbonRenderer } from "../ribbon_renderer";

// The reveal's crossing threshold (paint_const.ts; the renderer's reveal
// comment says what it gates): renderMarkerGaps' occluder test reads it.
const { REVEAL_CROSSING_MIN } = PAINT_CONST;

// A gated crossing's slot is solved from this many seconds before its show
// time (earlier it is cleared and skipped - the solve is update()'s main
// cost, and early in a reveal most crossings are still hidden).
export const GATE_LEAD = 0.1;

// GAP SLOT GEOMETRY (per-pixel gaps; see gap_mask.ts). Marches walk one
// thread's centerline in MARCH_STEP arc steps against the OTHER thread's
// coarse local polyline (COARSE_SPACING, nearest-vertex distance - within
// ~0.01 of the curve at casing range).
const MARCH_STEP = 0.07;
const COARSE_SPACING = 0.1;
const COARSE_MAX = 128;
// (G3-1 deleted the fine shader polyline and its adaptive spacing: the
// shader measures SEGMENT distance to the over chain's own SAMP samples.)
// Far-branch smooth-min radius: SMIN_K_PER x (half-width + margin),
// clamped (gap_mask.ts).
const SMIN_K_PER = 0.3;
const SMIN_K_MIN = 0.03;
const SMIN_K_MAX = 0.15;
// Arc padding on each protect interval (computeGapSlot), in half-widths
// plus a constant. Generous on purpose: the interval only bounds the search,
// the protect polyline decides per pixel (an interval ending at the
// measured overlap still left 11 margin-band px over the covered ribbon
// at a squeezed self-twist, user x31 after the gesture battery).
const PROTECT_PAD_PER_HALF = 1.0;
const PROTECT_PAD = 0.02;
// Measured protect extents (protectReach): march step and the most it may
// add past the straight-thread estimate.
const PROTECT_STEP = 0.03;
const PROTECT_MARCH_MAX = 1.5;
// Longest stretch of the covered thread a protect range spans per side:
// every margin-band fragment inside a protect interval tests its
// segments, so a short range keeps that cheap.
const PROT_POLY_SPAN_MAX = 3.0;
// Render-only pluck over-node footprints (computeGapSlot): the cover's
// slack past the casing band, and its floor - the over-fill window's
// OVER_PATCH_MARGIN / OVER_HALF_LENGTH_MIN, which they replace.
const PLUCK_OVER_PAD = 0.12;
const PLUCK_OVER_MIN = 0.35;
// Reach caps scale with thread width (the P3.27 lesson: caps calibrated at
// tw 0.42 truncated fat shallow overlaps) and admit the long cinched-twist
// rides (P3.36). Both marches stop where the threads actually part, so
// the caps only bound pathological runs.
const CUT_REACH_PER_HALF = 6.5;
const OVER_REACH_PER_HALF = 5.8;
const CUT_REACH_MIN = 1.35;
const OVER_REACH_MIN = 1.2;
const RIDE_REACH_CAP = 4.5;
// Neighbor clearance: a window (along the under chain) or polyline (along
// the over chain) stops this fraction of the way to the next crossing pass
// in that direction. TWINS (the neighbor crossing pairs the same two
// chains - a twist, where the over/under roles swap) and self-crossings
// split at the midpoint, so the two gaps meet at one flip line instead of
// overlapping (both threads hidden = a dark pinch band).
const NB_CLEAR = 0.8;
const NB_CLEAR_TWIN = 0.5;
// A window ends one step after the under ribbon's footprint (centerline
// offset up to the 2x miter clamp) has left the over thread's casing +
// fade; the over polyline likewise past the window's footprint.
const UNDER_FOOT_PER_HALF = 2.0;
const GAP_EXIT_PAD = 0.05;
// Visible margin bias, kept from the erase era for gap-width parity: the
// gap reads as `gap + CUT_BIAS` of arc along the under thread.
export const CUT_BIAS = 0.03;
// Gap slots for emergent (tunneled) crossings discovered by the physics.
// Sized for taut knots: at slack ~0 dozens of real emergent crossings can
// coexist, and a starved pool renders some overlaps gap-less.
export const EMERGENT_POOL = 64;

// A FUSED JOINT IS NOT A CROSSING (K397 stage 3). A tucked tip's end
// particle is fused to its host's, so the tip's last segment and the
// host's next one share an endpoint, and the physics' emergent collector
// (a proper intersection, sin > 0.25, no junction exclusion) finds an
// "emergent crossing" right at the tuck. Its slot cut the under thread
// around the over one's footprint: stub over host left a dark round-ended
// ring inside the host, cut square at the host's edge, with host color on
// both sides (Levi's knuckle U, levi_0801); host over stub left a dark
// band across the stub's root past the cap cover's reach (stage 1's
// node_12 sliver). The joint's own covers (the cap cover, the seal disc,
// the fans) own that overlap, so renderEmergent gives no slot to a pair
// whose two passes both lie within JOINT_PAIR_REACH ctrl of one fused
// junction (junctionArcCtrls). Physics keeps the pair.
export const JOINT_PAIR_REACH = 2;

export function isJointPair(
  a: { chain: number; ctrl: number },
  b: { chain: number; ctrl: number },
  joints: ReadonlyMap<number, ReadonlyArray<{ ctrl: number; jn: number }>>,
  chainLen: (chain: number) => number,
  closed: (chain: number) => boolean
): boolean {
  if (a.chain === b.chain) return false;
  const ja = joints.get(a.chain);
  const jb = joints.get(b.chain);
  if (!ja || !jb) return false;
  const near = (chain: number, ctrl: number, at: number): boolean => {
    let d = Math.abs(ctrl - at);
    if (closed(chain)) d = Math.min(d, chainLen(chain) - d);
    return d < JOINT_PAIR_REACH;
  };
  for (const x of ja) {
    if (!near(a.chain, a.ctrl, x.ctrl)) continue;
    for (const y of jb) {
      if (y.jn === x.jn && near(b.chain, b.ctrl, y.ctrl)) return true;
    }
  }
  return false;
}
// Gap slots for marker discs (start/exit dots).
export const MARKER_SLOTS = 4;

// Fillet layer-vote reach terms (rebuildFillets): how much of the wedge
// reach (fillHalf * FILLET_REACH_PER_HALF * cuspRadius) counts as a
// joint's clearance, and the old erase-width pad - both kept so the vote
// classifies exactly as before.
export const JOINT_CLEAR_REACH_SCALE = 0.55;
// Junction clearance floors (computeGapSlot): a squeezed side keeps at
// least half its cosmetic margin (zero read as a "busted gap on one
// side") and FADE_JOINT_FLOOR of its fade (zero room rendered an ABRUPT
// edge beside the other side's full roll-off) - the erase era's values.
const JOINT_MARGIN_FLOOR = 0.5;
const FADE_JOINT_FLOOR = 0.45;

export class CrossingGaps {
  readonly r: RibbonRenderer;
  private coarseO = new Float32Array(COARSE_MAX * 2);
  private coarseU = new Float32Array(COARSE_MAX * 2);
  private nearIdx = 0; // Out-param of polyDist (nearest vertex index).
  // [marginNeg, fadeNeg, marginPos, fadePos] clearance scales
  // (computeGapSlot).
  private clearScratch = new Float32Array(4);
  // [negA, negB, posA, posB] protect intervals (computeGapSlot).
  private protScratch = new Float32Array(4);
  // protectReach's samples of the two threads.
  private protScA = new Float32Array(4);
  private protScB = new Float32Array(4);
  // The two protect SAMP ranges of the slot being written (negative
  // side, positive side), with their bounding circles.
  private protNegRef: GapSampRef | null = null;
  private protPosRef: GapSampRef | null = null;
  private protNegCircle: [number, number, number] | null = null;
  private protPosCircle: [number, number, number] | null = null;
  // The gap slots' far-branch smooth-min (gap_mask.ts); off = A/B probes.
  smoothMin = true;
  // The gap slots' protect intervals (computeGapSlot); off = A/B probes.
  protect = true;
  // The emergent pool skips a fused joint's own pairs (isJointPair, K397
  // stage 3); off = A/B probes (master's slots at the tuck points).
  skipJointPairs = true;
  private readonly chainLen = (c: number): number => this.r.ps.chains[c].length;
  private readonly chainClosed = (c: number): boolean =>
    this.r.ps.chainBreakAfter[c] < 0;
  gapMode: "arc" | "perp" = "perp";
  // Windows dropped because a sample already carried GAP_SLOTS slots
  // (diagnostic; should stay 0).
  gapOverflow = 0;
  private g3Accepted: number[] = [];

  constructor(r: RibbonRenderer) {
    this.r = r;
  }

  // Sample a chain's centerline over arcs [center - neg, center + pos] into
  // a flat [x, y, ...] polyline of at most maxPts points about `spacing`
  // apart; returns the point count (>= 2). Open chains clamp at their ends
  // (sampleAt), which only repeats an endpoint.
  private buildPoly(
    poly: Float32Array,
    samples: SplineSamples,
    center: number,
    neg: number,
    pos: number,
    spacing: number,
    maxPts: number
  ): number {
    const span = Math.max(0, neg + pos);
    const n = Math.max(2, Math.min(maxPts, Math.ceil(span / spacing) + 1));
    for (let m = 0; m < n; m++) {
      sampling.sampleAt(
        samples,
        center - neg + (span * m) / (n - 1),
        this.r.sampleScratch,
        0
      );
      poly[m * 2] = this.r.sampleScratch[0];
      poly[m * 2 + 1] = this.r.sampleScratch[1];
    }
    return n;
  }

  // Nearest-VERTEX distance from (x, y) to an n-point polyline (dense
  // enough that this is within ~0.01 of the curve at casing range); the
  // nearest index lands in nearIdx. ex > 0 = the SELF-CROSSING exclusion
  // (gap_mask.ts): vertices whose chain arc (s0 + m * st) lies within ex of
  // fa (wrapped by per on rings) are skipped. Infinity if all are.
  private polyDist(
    poly: Float32Array,
    n: number,
    x: number,
    y: number,
    ex = 0,
    fa = 0,
    s0 = 0,
    st = 0,
    per = 0
  ): number {
    let best = Infinity;
    let bi = 0;
    for (let m = 0; m < n; m++) {
      if (ex > 0) {
        let da = s0 + m * st - fa;
        if (per > 0) da -= per * Math.floor(da / per + 0.5);
        if (Math.abs(da) < ex) continue;
      }
      const dx = poly[m * 2] - x;
      const dy = poly[m * 2 + 1] - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) {
        best = d2;
        bi = m;
      }
    }
    this.nearIdx = bi;
    return Math.sqrt(best);
  }

  // A protect interval's half-length on one side (computeGapSlot): how far
  // along thread A, from its crossing over thread B at aArc, some lane of
  // A's ribbon still overlaps B's ribbon. A lane at A-arc s overlaps while
  // |delta| < h (1 + |cos|), delta = A's centerline distance to its nearest
  // point on B and cos taken between the two tangents there - for straight
  // threads exactly the estimate w0 = h (1 + |cos|) / sin. So the estimate
  // is probed first (one probe in the common case, and never less than it
  // is returned); only where A is still on B there - the threads bend
  // along each other - does the march continue outward. A short interval
  // left the far end of such an overlap to the cosmetic margin of the
  // crossing where A is the under thread: a dark notch in A exactly where
  // it covers B (19 px at the user URL's x170, all freed by +0.15).
  private protectReach(
    aS: SplineSamples,
    aArc: number,
    dir: number,
    bS: SplineSamples,
    bArc: number,
    h: number,
    w0: number
  ): number {
    const a = this.protScA;
    const b = this.protScB;
    let sb = bArc;
    const overlaps = (s: number): boolean => {
      sampling.sampleAt(aS, aArc + dir * s, a, 0);
      // Nearest point on B: Newton steps along B from the last one.
      for (let it = 0; it < 3; it++) {
        sampling.sampleAt(bS, sb, b, 0);
        const step = (a[0] - b[0]) * b[2] + (a[1] - b[1]) * b[3];
        sb += step;
        if (!bS.closed) sb = Math.max(0, Math.min(bS.totalLength, sb));
        if (Math.abs(step) < 1e-4) break;
      }
      sampling.sampleAt(bS, sb, b, 0);
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      const c = Math.abs(a[2] * b[2] + a[3] * b[3]);
      return Math.sqrt(dx * dx + dy * dy) < h * (1 + c);
    };
    if (!overlaps(w0)) return w0;
    let s = w0;
    while (s < w0 + PROTECT_MARCH_MAX) {
      s += PROTECT_STEP;
      if (!overlaps(s)) return s - 0.5 * PROTECT_STEP;
    }
    return s;
  }

  // Is the neighbor pass `nb` (along `pass`'s chain) part of a crossing
  // with the SAME other chain as this crossing - a twist twin, where the
  // over/under roles swap - or this crossing's own partner? Those split at
  // the midpoint (NB_CLEAR_TWIN).
  private twinNeighbor(
    crossing: { over: CrossingPass; under: CrossingPass },
    pass: CrossingPass,
    nb: CrossingPass
  ): boolean {
    if (nb === pass) return false;
    if (nb === crossing.over || nb === crossing.under) return true;
    const info = this.r.passInfo.get(nb);
    if (!info) return false;
    const cr = this.r.ps.crossings[info.index];
    const nbOther = info.isUnder ? cr.over : cr.under;
    const other = pass === crossing.over ? crossing.under : crossing.over;
    return nbOther.chain === other.chain;
  }

  // Solve one crossing's GAP SLOT: the under thread's arc window, the
  // over thread's local polyline, and the under centerline's hidden span
  // (underWindows). slot = the table row; index = the registered crossing
  // (-1 for emergent ones: no neighbor lists, no diagnostics).
  computeGapSlot(
    slot: number,
    crossing: { over: CrossingPass; under: CrossingPass; sign?: number },
    index: number,
    overNbIn: PassNeighbors | null,
    underNbIn: PassNeighbors | null,
    fillHalf: number,
    gap: number,
    strength: number,
    shown = true
  ): void {
    const overNb = overNbIn ?? { prev: crossing.over, next: crossing.over };
    const underNb =
      underNbIn ?? { prev: crossing.under, next: crossing.under };
    const overSamples = this.r.chainSamples[crossing.over.chain]!;
    const underSamples = this.r.chainSamples[crossing.under.chain]!;
    const overCtrl = sampling.renderCtrl(crossing.over);
    const overCenter = sampling.arcAt(overSamples, overCtrl);
    const underCenter = sampling.arcAt(
      underSamples,
      sampling.renderCtrl(crossing.under)
    );
    const totalO = overSamples.totalLength;
    const totalU = underSamples.totalLength;
    this.r.slotOverChain[slot] = crossing.over.chain;
    this.r.slotOverArc[slot] = overCenter;
    // K76 2b: a crossing whose over thread the reveal hides (vis <= 0.5 at
    // the over pass) keeps no pluck footprint, as a gate not yet open; its
    // under window ramps with the visibility instead (K430, below).
    // The slot itself is still solved; applyExploreGaps scales it.
    this.r.slotOverCtrl[slot] = overCtrl;
    this.r.slotLive[slot] = 1;
    // K430: this solve's window push below is provisional; applyExploreGaps
    // owns the ramped windows and re-derives them in the same update().
    this.r.slotUwRamp[slot] = Number.NaN;
    this.r.slotProtChain[slot * 2] = -1;
    this.r.slotProtChain[slot * 2 + 1] = -1;
    // K76 2b: the over pass's visibility (1 with the reveal off). The pluck
    // footprints stay binary at 0.5 (shown = false below); the under window
    // RAMPS with it instead (K430: uwShown, at the window push).
    const exploreVis =
      this.r.explorePieces !== null
        ? this.r.exploreVisAt(crossing.over.chain, overCtrl)
        : 1;
    const exploreHid = exploreVis <= 0.5;
    const uwShown = shown;

    this.r.slotExploreHid[slot] = exploreHid ? 1 : 0;
    if (exploreHid) shown = false;
    // K76 next: the ungated solve, for applyExploreGaps' re-derivation.
    this.r.slotUnderChain[slot] = crossing.under.chain;
    this.r.slotUnderCenter[slot] = underCenter;

    // SELF-crossings: the arc between the two passes splits at its
    // midpoint (less a small guard) between the over polyline and the
    // under window, so the window never masks the over pass's own
    // material and the polyline never measures the under region against
    // itself. fwd/bwd = arc from the over pass forward/backward to the
    // under pass (an open chain reaches it in one direction only).
    const selfCross = crossing.over.chain === crossing.under.chain;
    let splitFwd = Infinity;
    let splitBwd = Infinity;
    let selfDist = -1;
    if (selfCross) {
      let fwd: number;
      let bwd: number;
      if (overSamples.closed) {
        fwd = (((underCenter - overCenter) % totalO) + totalO) % totalO;
        bwd = totalO - fwd;
      } else {
        fwd = underCenter > overCenter ? underCenter - overCenter : Infinity;
        bwd = overCenter > underCenter ? overCenter - underCenter : Infinity;
      }
      splitFwd = Math.max(0.12, fwd / 2 - 0.08);
      splitBwd = Math.max(0.12, bwd / 2 - 0.08);
      selfDist = Math.min(fwd, bwd);
    }

    const margin = gap + CUT_BIAS;
    const fade = this.r.fadeLength;
    const perp = this.gapMode === "perp";
    // Footprint reach: a point farther than this from the other thread's
    // centerline can neither be hidden nor hide anything.
    const exitD =
      fillHalf * (1 + UNDER_FOOT_PER_HALF) + margin + fade + GAP_EXIT_PAD;
    // SELF-CROSSING exclusion (gap_mask.ts): a thread never measures itself
    // within this much arc - along an unfolded thread that is farther than
    // any hide reach (both half-widths + margin + fade).
    const selfEx = selfCross
      ? 2 * fillHalf + margin + fade + GAP_EXIT_PAD
      : 0;
    const per = selfCross && overSamples.closed ? totalO : 0;
    const cutReach = Math.max(
      CUT_REACH_MIN,
      fillHalf * CUT_REACH_PER_HALF,
      RIDE_REACH_CAP
    );
    const overReach = Math.max(
      OVER_REACH_MIN,
      fillHalf * OVER_REACH_PER_HALF,
      RIDE_REACH_CAP
    );
    const [oGapPrev, oGapNext] = sampling.neighborGaps(
      overSamples,
      crossing.over,
      overNb
    );
    const [uGapPrev, uGapNext] = sampling.neighborGaps(
      underSamples,
      crossing.under,
      underNb
    );
    const clr = (pass: CrossingPass, nb: CrossingPass): number =>
      this.twinNeighbor(crossing, pass, nb) ? NB_CLEAR_TWIN : NB_CLEAR;
    const room = (
      samples: SplineSamples,
      center: number,
      dir: number
    ): number =>
      samples.closed
        ? samples.totalLength / 4
        : dir > 0
          ? samples.totalLength - center
          : center;
    const oCapPos = Math.max(
      0.12,
      Math.min(
        overReach,
        clr(crossing.over, overNb.next) * oGapNext,
        splitFwd,
        room(overSamples, overCenter, 1)
      )
    );
    const oCapNeg = Math.max(
      0.12,
      Math.min(
        overReach,
        clr(crossing.over, overNb.prev) * oGapPrev,
        splitBwd,
        room(overSamples, overCenter, -1)
      )
    );
    // From the under pass, forward reaches the over pass after `bwd`.
    const uCapPos = Math.max(
      0.15,
      Math.min(
        cutReach,
        clr(crossing.under, underNb.next) * uGapNext,
        splitBwd,
        room(underSamples, underCenter, 1)
      )
    );
    const uCapNeg = Math.max(
      0.15,
      Math.min(
        cutReach,
        clr(crossing.under, underNb.prev) * uGapPrev,
        splitFwd,
        room(underSamples, underCenter, -1)
      )
    );

    // UNDER MARCH (each direction) against the coarse over polyline, for
    // two arcs along the under centerline:
    //  - the CUT: where its own mask excess first turns >= 0 - the hidden
    //    span of the centerline (the yarn's dip-under window);
    //  - the WINDOW: the CONNECTED overlap only. The march stops where the
    //    two ribbons stop overlapping (centerline distance >= both half
    //    widths: every lane has left the over silhouette), and the window
    //    extends past that by the margin's reach along a lane (arc mode:
    //    exactly margin + fade; perp mode: their arc projection). A window
    //    sized by "the footprint could still touch the casing" ran all the
    //    way around a fat kink loop and shaved its eye walls across the eye
    //    (no crossing there) - the per-pixel test is exact INSIDE the
    //    window, so the window must hold only material connected, lane by
    //    lane, to the crossing core (the erase grid's first-exit lanes had
    //    this property by construction).
    const nO = this.buildPoly(
      this.coarseO,
      overSamples,
      overCenter,
      oCapNeg,
      oCapPos,
      COARSE_SPACING,
      COARSE_MAX
    );
    const co = this.coarseO;
    const sc4 = this.r.sampleScratch;
    const oS0 = overCenter - oCapNeg;
    const oSt = (oCapNeg + oCapPos) / (nO - 1);
    const overlapD = 2 * fillHalf;
    let cutPos = 0;
    let cutNeg = 0;
    let silPos = 0;
    let silNeg = 0;
    let winPos = 0;
    let winNeg = 0;
    // The arc where every lane of the under ribbon has left the casing, per
    // side (the erase era's extents: a render-only pluck's under-node
    // footprint).
    let allPos = 0;
    let allNeg = 0;
    for (let dir = -1; dir <= 1; dir += 2) {
      const cap = dir > 0 ? uCapPos : uCapNeg;
      let cut = Number.NaN;
      let sil = Number.NaN;
      let win = Number.NaN;
      // Arc where EVERY lane has left the casing (fade not included), and
      // the crossing angle there.
      let all = Number.NaN;
      let allSin = 1;
      let prevS = 0;
      let prevE = Number.NaN;
      let prevF = Number.NaN;
      let prevD = Number.NaN;
      for (let s = 0; ; s += MARCH_STEP) {
        const sc = Math.min(s, cap);
        sampling.sampleAt(underSamples, underCenter + dir * sc, sc4, 0);
        const d = this.polyDist(
          co,
          nO,
          sc4[0],
          sc4[1],
          selfEx,
          underCenter + dir * sc,
          oS0,
          oSt,
          per
        );
        const i = this.nearIdx;
        const i0 = Math.max(0, i - 1);
        const i1 = Math.min(nO - 1, i + 1);
        const ox = co[i1 * 2] - co[i0 * 2];
        const oy = co[i1 * 2 + 1] - co[i0 * 2 + 1];
        const ol = Math.hypot(ox, oy) || 1;
        const sinT = Math.abs(sc4[2] * oy - sc4[3] * ox) / ol;
        // The centerline's SILHOUETTE exit (where the margin starts) - the
        // junction clearance caps only what lies beyond it.
        if (Number.isNaN(sil)) {
          const f = d - fillHalf;
          if (f >= 0) {
            sil = Number.isNaN(prevF)
              ? sc
              : prevS + (sc - prevS) * (-prevF / (f - prevF));
          }
          prevF = f;
        }
        if (Number.isNaN(cut)) {
          const e = d - fillHalf - (perp ? margin : margin * sinT);
          if (e >= 0) {
            cut = Number.isNaN(prevE)
              ? sc
              : prevS + (sc - prevS) * (-prevE / (e - prevE));
          }
          prevE = e;
        }
        // Arc mode: the hide region reaches exactly margin + fade of arc
        // past each lane's silhouette exit, and every lane has exited once
        // the centerlines are both half widths apart. Perp mode: every lane
        // is clear of the casing + fade once the centerlines are that much
        // farther apart (at shallow angles that is far along the arc, so it
        // is marched, not projected).
        const allD = perp ? overlapD + margin : overlapD;
        if (Number.isNaN(all) && d >= allD) {
          all =
            (Number.isNaN(prevD) || !Number.isFinite(d)
              ? sc
              : prevS + (sc - prevS) * ((allD - prevD) / (d - prevD))) +
            (perp ? 0 : margin);
          allSin = sinT;
        }
        const exitD2 = perp ? overlapD + margin + fade : overlapD;
        if (Number.isNaN(win) && d >= exitD2) {
          const exit =
            Number.isNaN(prevD) || !Number.isFinite(d)
              ? sc
              : prevS + (sc - prevS) * ((exitD2 - prevD) / (d - prevD));
          win = Math.min(
            cap,
            exit + (perp ? 0 : margin + fade) + MARCH_STEP + GAP_EXIT_PAD
          );
        }
        // EYE-WALL LIMIT (casing look): the fade is an ARC past the casing
        // exit, so once the march has gone that far past it the window
        // ends even if the thread still lingers inside the fade band - a
        // narrow twist eye's far wall (it followed the whole wall: a dark
        // wedge where master's lane caps stop) or a parallel ride. The
        // shader's window-end ramp dissolves whatever fade remains.
        if (
          perp &&
          Number.isNaN(win) &&
          !Number.isNaN(all) &&
          sc >= all + fade / Math.max(allSin, 0.2) + MARCH_STEP
        ) {
          win = Math.min(cap, sc + GAP_EXIT_PAD);
        }
        prevD = d;
        prevS = sc;
        if ((!Number.isNaN(cut) && !Number.isNaN(win)) || sc >= cap) break;
      }
      if (Number.isNaN(win)) win = cap;
      if (Number.isNaN(cut)) cut = win;
      cut = Math.min(cut, win);
      if (Number.isNaN(sil)) sil = cut;
      sil = Math.min(sil, cut);
      const allX = Number.isNaN(all) ? win : Math.min(all, win);
      if (dir > 0) {
        cutPos = cut;
        silPos = sil;
        winPos = win;
        allPos = allX;
      } else {
        cutNeg = cut;
        silNeg = sil;
        winNeg = win;
        allNeg = allX;
      }
    }

    // OVER MARCH against the window's centerline: the polyline must hold
    // every over point within the hide reach of the window's footprint (a
    // truncated polyline OVER-measures the distance and leaves material
    // standing).
    const nU = this.buildPoly(
      this.coarseU,
      underSamples,
      underCenter,
      winNeg,
      winPos,
      COARSE_SPACING,
      COARSE_MAX
    );
    const uS0 = underCenter - winNeg;
    const uSt = (winNeg + winPos) / (nU - 1);
    let reachPos = 0;
    let reachNeg = 0;
    // The over pass's stretch that covers the under thread's gap, per side:
    // a render-only pluck's over-node footprint (the over-fill window it
    // replaced: out to where the over ribbon clears the casing band).
    const coverD = overlapD + margin + 0.05;
    let coverPos = 0;
    let coverNeg = 0;
    for (let dir = -1; dir <= 1; dir += 2) {
      const cap = dir > 0 ? oCapPos : oCapNeg;
      let r = cap;
      let cover = Number.NaN;
      let prevS = 0;
      let prevD = Number.NaN;
      for (let s = 0; ; s += MARCH_STEP) {
        const sc = Math.min(s, cap);
        sampling.sampleAt(overSamples, overCenter + dir * sc, sc4, 0);
        const d = this.polyDist(
          this.coarseU,
          nU,
          sc4[0],
          sc4[1],
          selfEx,
          overCenter + dir * sc,
          uS0,
          uSt,
          per
        );
        if (Number.isNaN(cover) && d >= coverD) {
          cover = Number.isNaN(prevD)
            ? sc
            : prevS + (sc - prevS) * ((coverD - prevD) / (d - prevD));
        }
        prevS = sc;
        prevD = d;
        if (d >= exitD) {
          r = Math.min(cap, sc + MARCH_STEP);
          break;
        }
        if (sc >= cap) break;
      }
      const coverX = Math.min(
        cap,
        Math.max(
          PLUCK_OVER_MIN,
          (Number.isNaN(cover) ? r : cover) + PLUCK_OVER_PAD
        )
      );
      if (dir > 0) {
        reachPos = r;
        coverPos = coverX;
      } else {
        reachNeg = r;
        coverNeg = coverX;
      }
    }
    this.r.slotCoverNeg[slot] = coverNeg;
    this.r.slotCoverPos[slot] = coverPos;
    this.r.slotAllNeg[slot] = allNeg;
    this.r.slotAllPos[slot] = allPos;
    this.r.slotCutNeg[slot] = cutNeg;
    this.r.slotCutPos[slot] = cutPos;
    if (index >= 0) {
      // A gated crossing not yet shown has no footprint to pluck around.
      this.r.pluckHost.overHalfNeg[index] = shown ? coverNeg : 0;
      this.r.pluckHost.overHalfPos[index] = shown ? coverPos : 0;
      this.r.pluckHost.eraseExtentNeg[index] = shown ? allNeg : 0;
      this.r.pluckHost.eraseExtentPos[index] = shown ? allPos : 0;
    }
    // G3-1: the shader reads the over chain's own SAMP samples (the CPU
    // no longer builds a fine polyline; the march reaches above are the
    // range, rounded outward to whole samples by gapSampRange, strided
    // to the 64-segment cap at most 3 - never stretched, never cut).
    // K573 step 2: strided as coarse as the pre-G3-1 polyline's bounds
    // allow (chord <= 0.3, sagitta <= 0.0015 on the range's tightest bend).
    const { ref: overRef, arcPer: overArcPer } = gapSampRange(
      totalO,
      overSamples.count,
      overSamples.closed,
      overCenter,
      reachNeg,
      reachPos,
      overSamples.positions
    );
    overRef.base = this.r.g3SampBase(crossing.over.chain);
    const overAt = (j: number): readonly [number, number] => {
      const raw = overRef.kStart + j * overRef.stride;
      const idx = overSamples.closed
        ? ((raw % overSamples.count) + overSamples.count) % overSamples.count
        : Math.max(0, Math.min(overSamples.count - 1, raw));
      return [overSamples.positions[idx * 2], overSamples.positions[idx * 2 + 1]];
    };
    const overChunks = gapChunkBounds(overAt, overRef.n);
    const polyStep = Math.max(overArcPer * overRef.stride, 1e-6);
    // FAR-BRANCH SMOOTH-MIN (gap_mask.ts): a straight run's points beyond
    // farK segments are at least sqrt(2 * reach * sminK) * 1.3 + one step
    // of arc from the nearest one, i.e. more than sminK farther - the blend
    // is exact there; only a range that bends back gets it. Today's
    // smooth-min, ported AS-IS (K399: G3-1 before K268 item 4).
    const sminK = Math.min(
      SMIN_K_MAX,
      Math.max(SMIN_K_MIN, SMIN_K_PER * (fillHalf + margin))
    );
    const hideReach = fillHalf + margin + fade;
    const farK = Math.ceil(
      (Math.sqrt(2 * hideReach * sminK) * 1.3 + polyStep) / polyStep
    );


    // PROTECT: where the under thread A is itself the OVER pass of a
    // neighboring crossing (A over B), this slot's cosmetic margin and fade
    // are waived for A's fragments over B's ribbon (gap_mask.ts). The arc
    // interval bounds the stretch of A that can cover B (per side: h (1 +
    // |cos|) / sin, sin floored at 0.25, or the MEASURED overlap where the
    // threads bend along each other - see protectReach); the protect
    // polyline is B's centerline over the stretch of B that A's ribbon can
    // reach. A compressed cyclic triangle (a over b over c over a)
    // otherwise hid each thread exactly where it must cover the next one.
    const prot = this.protScratch;
    prot[0] = 0;
    prot[1] = 0;
    prot[2] = 0;
    prot[3] = 0;
    this.protNegRef = null;
    this.protPosRef = null;
    this.protNegCircle = null;
    this.protPosCircle = null;
    if (index >= 0 && this.protect) {
      for (const nb of [underNb.prev, underNb.next]) {
        if (nb === crossing.under) continue;
        const info = this.r.passInfo.get(nb);
        if (!info || info.isUnder || info.index === index) continue;
        const xc = this.r.ps.crossings[info.index];
        const bSamples = this.r.chainSamples[xc.under.chain];
        if (!bSamples) continue;
        let off = sampling.arcAt(underSamples, sampling.renderCtrl(nb)) - underCenter;
        if (underSamples.closed) {
          off = ((off % totalU) + totalU) % totalU;
          if (off > totalU / 2) off -= totalU;
        }
        sampling.sampleAt(underSamples, underCenter + off, sc4, 0);
        const tax = sc4[2];
        const tay = sc4[3];
        const bArc = sampling.arcAt(bSamples, sampling.renderCtrl(xc.under));
        sampling.sampleAt(bSamples, bArc, sc4, 0);
        const sinX = Math.abs(tax * sc4[3] - tay * sc4[2]);
        const cosX = Math.abs(tax * sc4[2] + tay * sc4[3]);
        const w0 = (fillHalf * (1 + cosX)) / Math.max(sinX, 0.25);
        const aArc = underCenter + off;
        const o = off < 0 ? 0 : 2;
        // K268 PROTECT: B (xc.under) and its pass, for the reveal's waiver
        // factor on this side (applyExploreGaps).
        this.r.slotProtChain[slot * 2 + (o === 0 ? 0 : 1)] = xc.under.chain;
        this.r.slotProtCtrl[slot * 2 + (o === 0 ? 0 : 1)] = sampling.renderCtrl(xc.under);
        const pad = PROTECT_PAD_PER_HALF * fillHalf + PROTECT_PAD;
        prot[o] =
          off -
          this.protectReach(underSamples, aArc, -1, bSamples, bArc, fillHalf, w0) -
          pad;
        prot[o + 1] =
          off +
          this.protectReach(underSamples, aArc, 1, bSamples, bArc, fillHalf, w0) +
          pad;
        // B's centerline wherever A's ribbon can reach it: the same overlap
        // measured along B, plus a half-width.
        const bNeg = Math.min(
          PROT_POLY_SPAN_MAX,
          this.protectReach(bSamples, bArc, -1, underSamples, aArc, fillHalf, w0) +
            fillHalf
        );
        const bPos = Math.min(
          PROT_POLY_SPAN_MAX,
          this.protectReach(bSamples, bArc, 1, underSamples, aArc, fillHalf, w0) +
            fillHalf
        );
        // B's centerline as a SAMP range, read in place by the shader
        // (the loop-free protect; no copied polyline since G3-1).
        const { ref: pref } = gapSampRange(
          bSamples.totalLength,
          bSamples.count,
          bSamples.closed,
          bArc,
          bNeg,
          bPos,
          bSamples.positions
        );
        pref.base = this.r.g3SampBase(xc.under.chain);
        const bAt = (j: number): readonly [number, number] => {
          const raw = pref.kStart + j * pref.stride;
          const idx = bSamples.closed
            ? ((raw % bSamples.count) + bSamples.count) % bSamples.count
            : Math.max(0, Math.min(bSamples.count - 1, raw));
          return [bSamples.positions[idx * 2], bSamples.positions[idx * 2 + 1]];
        };
        const circ = gapRangeCircle(bAt, pref.n);
        if (o === 0) {
          this.protNegRef = pref;
          this.protNegCircle = circ;
        } else {
          this.protPosRef = pref;
          this.protPosCircle = circ;
        }
      }
    }

    // JUNCTION CLEARANCE (the erase era's rule): every fused joint on the
    // under thread is a virtual neighbor; the room to its rendered edge
    // caps that side's cosmetic margin (floored at half) and then its fade
    // (floored at FADE_JOINT_FLOOR) by the SHORTFALL only, so gaps stop
    // eating into seal discs and webs ("gaps extending into the
    // intersection") without trimming a fade that already fits. Required
    // coverage - the over silhouette - is never reduced (the P3.36/P3.40
    // theorem). A per-pixel switch to the floors past the room compressed
    // fade roll-offs into hard edges once big cuspRadius values pushed
    // the clearance over most crossings.
    let jRoomPos = 1e6;
    let jRoomNeg = 1e6;
    const jCtrls = this.r.junctionArcCtrls.get(crossing.under.chain);
    if (jCtrls) {
      const jointClear =
        Math.max(
          fillHalf * 1.1,
          fillHalf *
            this.r.FILLET_REACH_PER_HALF *
            this.r.cuspRadius *
            JOINT_CLEAR_REACH_SCALE
        ) +
        gap +
        CUT_BIAS;
      for (const jc of jCtrls) {
        let d =
          sampling.paintArcAt(underSamples, jc.ctrl, underSamples.closed) -
          underCenter;
        if (underSamples.closed) {
          d = ((d % totalU) + totalU) % totalU;
          if (d > totalU / 2) d -= totalU;
        }
        if (d >= 0) jRoomPos = Math.min(jRoomPos, Math.max(0, d - jointClear));
        else jRoomNeg = Math.min(jRoomNeg, Math.max(0, -d - jointClear));
      }
    }
    const clearScales = (
      room: number,
      sil: number,
      cut: number,
      out: Float32Array,
      o: number
    ): void => {
      out[o] = 1;
      out[o + 1] = 1;
      if (!(room < 1e5)) return;
      const mArc = Math.max(cut - sil, 1e-6);
      const ms = Math.min(1, Math.max(JOINT_MARGIN_FLOOR, (room - sil) / mArc));
      out[o] = ms;
      if (fade > 0) {
        const cutEff = sil + mArc * ms;
        out[o + 1] = Math.min(
          1,
          Math.max(FADE_JOINT_FLOOR, (room - cutEff) / fade)
        );
      }
    };
    const cs = this.clearScratch;
    clearScales(jRoomNeg, silNeg, cutNeg, cs, 0);
    clearScales(jRoomPos, silPos, cutPos, cs, 2);

    sampling.sampleAt(underSamples, underCenter, sc4, 0);
    this.r.gaps.writeSlot(slot, {
      hOver: fillHalf,
      margin,
      fade,
      strength,
      perp,
      arcScale: underSamples.closed ? totalU : totalU / 0.45,
      centerArc: underCenter,
      winNeg,
      winPos,
      closed: underSamples.closed,
      totalU,
      tanX: sc4[2],
      tanY: sc4[3],
      selfExcl: selfEx,
      marginScaleNeg: cs[0],
      marginScalePos: cs[2],
      fadeScaleNeg: cs[1],
      fadeScalePos: cs[3],
      centerX: sc4[0],
      centerY: sc4[1],
      sminK: this.smoothMin ? sminK : 0,
      farK,
      protNegA: prot[0],
      protNegB: prot[1],
      protPosA: prot[2],
      protPosB: prot[3],
      over: overRef,
      overArcPer,
      overChunks,
      protNeg: this.protNegRef,
      protPos: this.protPosRef,
      protNegCircle: this.protNegCircle,
      protPosCircle: this.protPosCircle,
    });
    let wins = this.r.chainWins.get(crossing.under.chain);
    if (!wins) {
      wins = [];
      this.r.chainWins.set(crossing.under.chain, wins);
    }
    wins.push(slot, underCenter, winNeg, winPos);
    // K466: the stretch the over pass covers (every lane under its casing),
    // shown or not, so a frontier's end can keep out of it.
    let cuts = this.r.chainCuts.get(crossing.under.chain);
    if (!cuts) {
      cuts = [];
      this.r.chainCuts.set(crossing.under.chain, cuts);
    }
    cuts.push(slot, underCenter, allNeg, allPos);
    // K430 RAMP: the window's extents scale with the over pass's
    // visibility (exploreVis; 1 with the reveal off), so the junction web
    // retracts smoothly as the gap fades in instead of stepping at vis
    // 0.5. applyExploreGaps re-derives this push (slotUwRamp is NaN).
    if (uwShown && exploreVis > 0) {
      let uw = this.r.underWindows.get(crossing.under.chain);
      if (!uw) {
        uw = [];
        this.r.underWindows.set(crossing.under.chain, uw);
      }
      uw.push(underCenter, cutNeg * exploreVis, cutPos * exploreVis);
    }

    if (index >= 0) {
      if (this.r.diagData.length < this.r.ps.crossings.length * 5) {
        this.r.diagData = new Float32Array(this.r.ps.crossings.length * 5);
      }
      this.r.ps.bindingPoint(crossing.over, sc4, 0);
      this.r.diagData[index * 5] = sc4[0];
      this.r.diagData[index * 5 + 1] = sc4[1];
      this.r.diagData[index * 5 + 2] = cutNeg + cutPos;
      this.r.diagData[index * 5 + 3] = reachNeg + reachPos;
      this.r.diagData[index * 5 + 4] = selfDist;
      if (index === this.r.inspectIndex) {
        this.r.inspectIndex = -1;
        const round = (v: number): number => Math.round(v * 1000) / 1000;
        console.log(
          "CROSSING INSPECT " +
            JSON.stringify({
              crossing: index,
              slot,
              selfCross,
              over: {
                chain: crossing.over.chain,
                ctrl: round(crossing.over.ctrl),
              },
              under: {
                chain: crossing.under.chain,
                ctrl: round(crossing.under.ctrl),
              },
              sign: crossing.sign,
              overCenter: round(overCenter),
              underCenter: round(underCenter),
              split: [round(splitBwd), round(splitFwd)],
              uCaps: [round(uCapNeg), round(uCapPos)],
              oCaps: [round(oCapNeg), round(oCapPos)],
              cut: [round(cutNeg), round(cutPos)],
              win: [round(winNeg), round(winPos)],
              reach: [round(reachNeg), round(reachPos)],
              polyPts: overRef.n,
              strength: round(strength),
              mode: this.gapMode,
            })
        );
      }
    }
  }

  // Gap slots for emergent (tunneled) crossings, deduped against
  // registered crossings and each other.
  renderEmergent(fillHalf: number, gap: number): void {
    let poolUsed = 0;
    const used: number[] = [];
    const fxNow = knotUniformValues().uKFx[2];
    for (const em of this.r.ps.emergentCrossings) {
      if (poolUsed >= EMERGENT_POOL) break;
      // A fused joint's own pair is not a crossing (isJointPair): no slot,
      // and no gate either.
      if (
        this.skipJointPairs &&
        isJointPair(
          em.over,
          em.under,
          this.r.junctionArcCtrls,
          this.chainLen,
          this.chainClosed
        )
      ) {
        continue;
      }
      // REVEAL + FX: the registered crossings' gate - and since G2.1 the
      // same fade-in (the show time travels with the slot, so a pooled,
      // unstably indexed slot needs no per-crossing clock).
      const tShow = this.r.crossingShowTime(em);
      // A gate still well in the future skips the solve (as master skipped
      // unrevealed emergent crossings - before the dedup, which reads the
      // registered slots, and those are skipped while pending too).
      if (fxNow < tShow - GATE_LEAD) {
        if (tShow > this.r.gateOpenAt) this.r.gateOpenAt = tShow;
        continue;
      }
      this.r.ps.bindingPoint(em.over, this.r.sampleScratch, 0);
      const ex = this.r.sampleScratch[0];
      const ey = this.r.sampleScratch[1];

      let dup = false;
      for (let c = 0; c * 5 < this.r.diagData.length; c++) {
        if (
          Math.hypot(
            this.r.diagData[c * 5] - ex,
            this.r.diagData[c * 5 + 1] - ey
          ) < 0.8
        ) {
          dup = true;
          break;
        }
      }
      for (let k = 0; !dup && k < used.length; k += 2) {
        if (Math.hypot(used[k] - ex, used[k + 1] - ey) < 0.8) dup = true;
      }
      if (dup) continue;

      used.push(ex, ey);
      const pool = poolUsed++;
      this.r.computeGapSlot(
        this.r.emergentBase + pool,
        em,
        -1,
        null,
        null,
        fillHalf,
        gap,
        this.r.gateStrength(tShow, fxNow),
        fxNow >= tShow
      );
    }
    for (let k = poolUsed; k < EMERGENT_POOL; k++) {
      this.r.gaps.clearSlot(this.r.emergentBase + k);
      this.r.slotLive[this.r.emergentBase + k] = 0;
    }
  }

  // MARKER DISC GAPS: a start/exit disc is an "over pass" whose
  // polyline is its center point - its thread is hidden inside the
  // CONCENTRIC circle of radius (disc + gap): the gap's edge curves like a
  // disc grown to reach it (user spec), not like the disc slid outward.
  renderMarkerGaps(fillHalf: number, gap: number): void {
    const margin = gap + CUT_BIAS;
    for (let m = 0; m < MARKER_SLOTS; m++) {
      const slot = this.r.markerBase + m;
      const occ = this.r.markerOccluders[m];
      const samples = occ ? this.r.chainSamples[occ.chain] : null;
      if (
        !occ ||
        !samples ||
        (this.r.revealOn &&
          this.r.revealMulAtCtrl(occ.chain, occ.ctrl) < REVEAL_CROSSING_MIN)
      ) {
        this.r.gaps.clearSlot(slot);
        continue;
      }
      const closed = this.r.ps.chainBreakAfter[occ.chain] < 0;
      const total = samples.totalLength;
      const center = sampling.paintArcAt(samples, occ.ctrl, closed);
      sampling.sampleAtSafe(samples, center, closed, this.r.sampleScratch, 0);
      const cx = this.r.sampleScratch[0];
      const cy = this.r.sampleScratch[1];
      const tx = this.r.sampleScratch[2];
      const ty = this.r.sampleScratch[3];
      const exitD =
        occ.radius +
        margin +
        this.r.fadeLength +
        fillHalf * UNDER_FOOT_PER_HALF +
        GAP_EXIT_PAD;
      const winOf = (dir: number): number => {
        const cap = closed ? total / 4 : dir > 0 ? total - center : center;
        for (let s = 0; ; s += MARCH_STEP) {
          const sc = Math.min(s, cap);
          sampling.sampleAtSafe(
            samples,
            center + dir * sc,
            closed,
            this.r.sampleScratch,
            0
          );
          const d = Math.hypot(
            this.r.sampleScratch[0] - cx,
            this.r.sampleScratch[1] - cy
          );
          if (d >= exitD) return Math.min(cap, sc + MARCH_STEP);
          if (sc >= cap) return cap;
        }
      };
      const winNeg = winOf(-1);
      const winPos = winOf(1);
      // The marker disc: n 0, the "polyline" is the disc center (texel 5).
      this.r.gaps.writeSlot(slot, {
        hOver: occ.radius,
        margin,
        fade: this.r.fadeLength,
        strength: 1,
        perp: true,
        arcScale: closed ? total : total / 0.45,
        centerArc: center,
        winNeg,
        winPos,
        closed,
        totalU: total,
        tanX: tx,
        tanY: ty,
        selfExcl: 0,
        marginScaleNeg: 1,
        marginScalePos: 1,
        fadeScaleNeg: 1,
        fadeScalePos: 1,
        centerX: cx,
        centerY: cy,
        sminK: 0,
        farK: 0,
        protNegA: 0,
        protNegB: 0,
        protPosA: 0,
        protPosB: 0,
        over: { base: 0, kStart: 0, n: 0, stride: 1, count: 1, closed: false },
        overArcPer: 1,
        overChunks: new Float32Array(32),
        protNeg: null,
        protPos: null,
        protNegCircle: null,
        protPosCircle: null,
      });
      let wins = this.r.chainWins.get(occ.chain);
      if (!wins) {
        wins = [];
        this.r.chainWins.set(occ.chain, wins);
      }
      wins.push(slot, center, winNeg, winPos);
    }
  }

  // Vertex slot ids from this frame's windows: each window's samples
  // (padded by one, so every quad touching the window carries the id at
  // both ends - the fragment's exact arc test does the real windowing,
  // independent of the flat-varying provoking-vertex convention) get the
  // slot in ONE component, free across the whole range, so the per-quad
  // value is consistent. Uploads only chains whose ids changed. The lane
  // packing is samp_table.ts assignWindowLanes (moved verbatim); G3-0 also
  // packs each chain's kept windows into the frame's RANGES.
  assignGapIds(): void {
    const g3 = this.r.g3Data && this.r.G3 !== null;
    let entries = 0;
    // K832: iterate chains, not fills - the SDF pass has no strip fills,
    // but its fragment reads the same RANGES (windows come from
    // chainWins, solved pass-independently in update()). Without this
    // the SDF ribbons had no crossing gaps at all.
    for (let c = 0; c < this.r.chainSamples.length; c++) {
      const fill = this.r.fills[c];
      const count = fill ? fill.sampleCount : (this.r.chainSamples[c]?.count ?? 0);
      let ids = this.r.idScratch.get(c);
      if (!ids) {
        ids = new Float32Array(count * GAP_SLOTS);
        this.r.idScratch.set(c, ids);
      }
      const samples = this.r.chainSamples[c];
      const closed = samples ? samples.closed : false;
      this.gapOverflow += assignWindowLanes(
        this.r.chainWins.get(c),
        count,
        closed,
        samples ? samples.totalLength : 0,
        GAP_SLOTS,
        ids,
        g3 ? this.g3Accepted : null
      );
      if (g3) {
        const need =
          (entries + maxRangeEntries(this.g3Accepted.length / 4)) *
          RANGE_FLOATS;
        if (need > this.r.g3RangeScratch.length) {
          const next = new Float32Array(
            Math.max(need, this.r.g3RangeScratch.length * 2)
          );
          next.set(this.r.g3RangeScratch);
          this.r.g3RangeScratch = next;
        }
        const n = packRanges(
          this.g3Accepted,
          count,
          closed,
          this.r.g3RangeScratch,
          entries
        );
        this.r.g3WinBase[c] = entries;
        this.r.g3NWin[c] = n;
        entries += n;
      }
      if (fill) fill.setMaskIds(ids);
    }
    if (g3) this.r.g3WriteRanges(entries);
  }
}
