// Renders the knot as smooth ribbons. Base layer: every strand's fill ribbon.
// At each crossing, two patches recompute every frame:
//   1. An "under erase" patch: a background-colored ribbon that follows the
//      UNDER thread through the crossing, slightly wider than the thread, so
//      its footprint never exceeds the under thread's own and it cannot
//      notch anything else. Its end caps are the visible cut ends of the
//      under thread. Each cap corner is found by marching along its
//      under-ribbon edge until "perpendicular distance to the over
//      CENTERLINE CURVE equals overHalfWidth" (the over ribbon's
//      SILHOUETTE) flips, against a locally sampled polyline of the over
//      centerline - then the cap is pushed outward by `gap` as ARC LENGTH
//      along the under thread. The margin must be constant ALONG the
//      thread, not perpendicular to the over thread: a perpendicular
//      margin projects as gap/sin(angle) of bare background at oblique
//      crossings, which reads as a giant naked gap at loop-end twists
//      (spans up to 1.07 at 30-degree crossings measured, vs gap 0.06).
//   2. The OVER pass fill, redrawn on top so the over thread rides above
//      the hole, with a length that adapts to the crossing angle.
// All erases render below all fills, so patches never slice each other.

import { Container } from "pixi.js";
import type { ParticleSystem, CrossingPass } from "../physics/particle_system";
import type { SplineSamples } from "../geometry/spline_generator";
import { sampleClosedSpline } from "../geometry/spline_generator";
import { RibbonMesh, PatchGridMesh } from "./ribbon_mesh";

export interface RibbonStyle {
  threadWidth: number; // In lattice units.
  casingWidth: number; // Thread width + twice the crossing gap.
  background: number;
  baseHue: number; // [0, 360) starting hue for the strand palette.
}

// Dense enough that tight bends near crossings (low slack) stay resolved;
// patch outlines interpolate this same data, keeping them aligned with the
// base ribbons.
const SAMPLE_SPACING = 0.09;
const MIN_SAMPLES = 48;
// The over-fill patch copies base-ribbon vertices verbatim, so its capacity
// just needs to cover the longest window (in samples) a crossing can need.
// Sized for the widest thread: over windows scale with fillHalf.
const OVER_PATCH_MAX_SAMPLES = 56;
// The over-fill window clamps to a fraction of the arc distance to the
// nearest crossing pass along the same thread. The erase march gets a larger
// budget: truncating a lane's boundary solve leaves that cap corner short
// (visibly closer to the over thread), and any overreach toward the
// neighboring crossing is repainted by its vertex-exact over-fill - the two
// fractions summing past 1.0 guarantees the windows overlap.
const NEIGHBOR_CLEARANCE = 0.5;
const ERASE_NEIGHBOR_CLEARANCE = 0.8;
const OVER_HALF_LENGTH_MIN = 0.35;
const OVER_PATCH_MARGIN = 0.12;
// Slight overhang so the erase fully covers the under ribbon's antialiased
// edges.
const ERASE_WIDTH_PAD = 0.02;
// Boundary-march parameters: each thread's centerline is sampled as a local
// polyline around the crossing, and marches measure distances against it.
// The erase marches several lanes across the under ribbon outward until
// each exits the cut region (multiple lanes let cap edges curve with the
// over thread); the over-fill window marches along the over thread until
// it is provably beyond the erase's reach - direct measurement, robust to
// kinked centerlines and any crossing angle.
const LOCAL_SAMPLES = 24;
const MARCH_STEP = 0.07;
// Reach limits SCALE WITH THREAD WIDTH (fillHalf): they were absolute
// constants calibrated at width 0.42, and at wider threads a shallow
// crossing's overlap extends past them - the erase cap then sits INSIDE
// the overlap and everything beyond renders as an uncut merge (reported
// as "heavy penetration" at tw 0.52; the physics state was clean).
const CUT_REACH_PER_HALF = 6.5; // * fillHalf, floored at the 0.42 values.
const OVER_REACH_PER_HALF = 5.8;
const CUT_REACH_MIN = 1.35;
const OVER_REACH_MIN = 1.2;
const LOCAL_REACH_PAD = 0.8; // Local polylines must out-reach the marches.
// Matches the base ribbon's sample spacing so the erase's miter factor
// tracks the base extrusion's at kinks.
const MITER_PROBE = 0.09;
const ERASE_STATIONS = 16;
const ERASE_LANES = 5;
// Patch pool for emergent (tunneled) crossings discovered by the physics.
// Sized for taut knots: at slack ~0 dozens of real emergent crossings can
// coexist, and a starved pool renders some overlaps gap-less.
const EMERGENT_POOL = 64;
// Cut arcs extend outward by this much: widens the gap imperceptibly while
// swallowing base-ribbon slivers that poke past the cap at tight bends.
const CUT_BIAS = 0.03;
// At a hairpin (end-of-loop twist) the inside lane's march exits far later
// than the outside lane's; unclamped, the erase grid shears across the loop
// tip and bites it. Lane cuts stay within this arc distance of their
// median - wide enough for legitimate oblique-crossing skew.
const LANE_SPREAD_CLAMP = 0.4;
// Soft-clamp scale for a cap point's WORLD deviation from the world cap
// chord. The true offset curve hooks sharply on the inside of tight bends
// (curvature is amplified by 1/(1 - d*k)); compressing large deviations
// keeps the cut reading parallel to the over thread while gentle curvature
// stays intact. Measured in world space so a genuinely straight cap (e.g.
// straight over thread) is a fixed point regardless of under-thread
// curvature.
const CAP_DEVIATION_SOFT = 0.08;
// Corner rounding for cap polylines: a kinked over centerline makes the
// distance level set genuinely angular; clamping each interior cap point's
// second difference rounds corners while leaving gentle bows untouched.
const CAP_D2_MAX = 0.03;

function hslToHex(h: number, s: number, l: number): number {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (
    (Math.round(f(0) * 255) << 16) |
    (Math.round(f(8) * 255) << 8) |
    Math.round(f(4) * 255)
  );
}

interface PassNeighbors {
  prev: { chain: number; ctrl: number };
  next: { chain: number; ctrl: number };
}

export class RibbonRenderer {
  root: Container;

  private ps: ParticleSystem;
  private style: RibbonStyle;
  private fills: RibbonMesh[] = [];
  private underErases: PatchGridMesh[] = [];
  private overFills: RibbonMesh[] = [];
  private emergentErases: PatchGridMesh[] = [];
  private emergentFills: RibbonMesh[] = [];
  private chainControls: Float32Array[] = [];
  private chainSamples: (SplineSamples | null)[] = [];
  private sampleScratch = new Float32Array(4);
  private overLocal = new Float32Array(LOCAL_SAMPLES * 2);
  private underLocal = new Float32Array(LOCAL_SAMPLES * 2);
  private laneCutsPos = new Float32Array(ERASE_LANES);
  private laneCutsNeg = new Float32Array(ERASE_LANES);
  private lanePrevG = new Float32Array(ERASE_LANES);
  private capScratch = new Float32Array(ERASE_LANES * 4); // [x, y, tx, ty]
  // Per crossing: neighbor crossing passes along the over and under threads.
  private overNeighbors: PassNeighbors[] = [];
  private underNeighbors: PassNeighbors[] = [];

  constructor(ps: ParticleSystem, style: RibbonStyle) {
    this.ps = ps;
    this.style = style;
    this.root = new Container();

    const baseLayer = new Container();
    const eraseLayer = new Container();
    const overLayer = new Container();
    this.root.addChild(baseLayer, eraseLayer, overLayer);

    ps.chains.forEach((chain, i) => {
      this.chainControls.push(new Float32Array(chain.length * 2));
      this.chainSamples.push(null);

      // Sample count fixed from the initial (longest) arc; relaxation only
      // shortens strands, so uniform resampling stays dense enough.
      let arc = 0;
      for (let k = 0; k < chain.length; k++) {
        const a = chain[k];
        const b = chain[(k + 1) % chain.length];
        arc += Math.hypot(
          ps.positions[b * 2] - ps.positions[a * 2],
          ps.positions[b * 2 + 1] - ps.positions[a * 2 + 1]
        );
      }
      const count = Math.max(MIN_SAMPLES, Math.round(arc / SAMPLE_SPACING));

      const hue = (style.baseHue + i * 137.508) % 360;
      const fill = new RibbonMesh(count, true, hslToHex(hue, 0.45, 0.64));
      this.fills.push(fill);
      baseLayer.addChild(fill.mesh);
    });

    // Neighboring crossing passes along each thread come from the particle
    // system; passes slide live, so we hold references and read their
    // current fractional positions each frame.
    for (const crossing of ps.crossings) {
      this.overNeighbors.push(ps.passNeighbors(crossing.over));
      this.underNeighbors.push(ps.passNeighbors(crossing.under));

      const erase = new PatchGridMesh(
        ERASE_STATIONS,
        ERASE_LANES,
        style.background
      );
      const fill = new RibbonMesh(OVER_PATCH_MAX_SAMPLES, false, 0xffffff);
      this.underErases.push(erase);
      this.overFills.push(fill);
      eraseLayer.addChild(erase.mesh);
      overLayer.addChild(fill.mesh);
    }

    for (let k = 0; k < EMERGENT_POOL; k++) {
      const erase = new PatchGridMesh(
        ERASE_STATIONS,
        ERASE_LANES,
        style.background
      );
      const fill = new RibbonMesh(OVER_PATCH_MAX_SAMPLES, false, 0xffffff);
      erase.mesh.visible = false;
      fill.mesh.visible = false;
      this.emergentErases.push(erase);
      this.emergentFills.push(fill);
      eraseLayer.addChild(erase.mesh);
      overLayer.addChild(fill.mesh);
    }
  }

  // Interpolate position and unit tangent at an arc position into `out`
  // as [x, y, tx, ty].
  private sampleAt(
    samples: SplineSamples,
    arc: number,
    out: Float32Array,
    offset: number
  ): void {
    const total = samples.totalLength;
    const wrapped = ((arc % total) + total) % total;
    const f = (wrapped / total) * samples.count;
    const i0 = Math.floor(f) % samples.count;
    const i1 = (i0 + 1) % samples.count;
    const frac = f - Math.floor(f);

    out[offset] =
      samples.positions[i0 * 2] +
      (samples.positions[i1 * 2] - samples.positions[i0 * 2]) * frac;
    out[offset + 1] =
      samples.positions[i0 * 2 + 1] +
      (samples.positions[i1 * 2 + 1] - samples.positions[i0 * 2 + 1]) * frac;

    let tx =
      samples.tangents[i0 * 2] +
      (samples.tangents[i1 * 2] - samples.tangents[i0 * 2]) * frac;
    let ty =
      samples.tangents[i0 * 2 + 1] +
      (samples.tangents[i1 * 2 + 1] - samples.tangents[i0 * 2 + 1]) * frac;
    const len = Math.hypot(tx, ty) || 1;
    out[offset + 2] = tx / len;
    out[offset + 3] = ty / len;
  }

  // Distance from a point to a locally sampled centerline polyline. The
  // polylines are dense (~0.15 spacing), so nearest-vertex distance is
  // within ~0.007 of the true curve distance at the ranges we care about.
  private distToLocal(poly: Float32Array, x: number, y: number): number {
    let best = Infinity;
    for (let m = 0; m < LOCAL_SAMPLES; m++) {
      const dx = poly[m * 2] - x;
      const dy = poly[m * 2 + 1] - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) best = d2;
    }
    return Math.sqrt(best);
  }

  // guardCenter/guardHalf mask an arc neighborhood out of the polyline
  // (sentinel far away): for SELF-crossings the "other thread" is the same
  // chain, and without the mask the under region measures distance to
  // itself (always ~0), blowing the boundary marches out to their clamps.
  private buildLocal(
    poly: Float32Array,
    samples: SplineSamples,
    center: number,
    reach: number,
    guardCenter = Number.NaN,
    guardHalf = 0
  ): void {
    const total = samples.totalLength;
    for (let m = 0; m < LOCAL_SAMPLES; m++) {
      const arc = center - reach + (2 * reach * m) / (LOCAL_SAMPLES - 1);
      if (!Number.isNaN(guardCenter)) {
        let d = Math.abs(arc - guardCenter) % total;
        d = Math.min(d, total - d);
        if (d < guardHalf) {
          poly[m * 2] = 1e9;
          poly[m * 2 + 1] = 1e9;
          continue;
        }
      }
      this.sampleAt(samples, arc, this.sampleScratch, 0);
      poly[m * 2] = this.sampleScratch[0];
      poly[m * 2 + 1] = this.sampleScratch[1];
    }
  }

  // Arc position of a fractional control position, wrapping around the loop.
  private arcAt(samples: SplineSamples, ctrl: number): number {
    const n = samples.controlArcLengths.length;
    const i = Math.floor(ctrl);
    const t = ctrl - i;
    const i0 = ((i % n) + n) % n;
    const i1 = (i0 + 1) % n;
    const a0 = samples.controlArcLengths[i0];
    let a1 = samples.controlArcLengths[i1];
    if (a1 <= a0) a1 += samples.totalLength;
    return (a0 + (a1 - a0) * t) % samples.totalLength;
  }

  // Ctrl a pass RENDERS at: the true intersection when the physics has
  // one (displayF), else the binding. During a tug the ordering clamps
  // can pin the binding away from where the threads actually cross;
  // drawing there mangles the crossing.
  private renderCtrl(pass: CrossingPass): number {
    return pass.displayF ?? pass.ctrl;
  }

  // Arc gap to the neighboring crossing passes, wrapping around the loop.
  private neighborGaps(
    samples: SplineSamples,
    pass: CrossingPass,
    neighbors: PassNeighbors
  ): [number, number] {
    const total = samples.totalLength;
    if (
      neighbors.next === pass ||
      neighbors.next.ctrl === pass.ctrl
    ) {
      return [total / 2, total / 2];
    }
    const center = this.arcAt(samples, this.renderCtrl(pass));
    const gapNext =
      (((this.arcAt(samples, this.renderCtrl(neighbors.next)) - center) %
        total) +
        total) %
      total;
    const gapPrev =
      (((center - this.arcAt(samples, this.renderCtrl(neighbors.prev))) %
        total) +
        total) %
      total;
    return [gapPrev, gapNext];
  }

  private inspectIndex = -1;
  // Per-crossing diagnostic summary, refreshed each update():
  // [worldX, worldY, eraseSpanMean, overSpan, selfPassDist(-1 if not self)]
  private diagData = new Float32Array(0);

  getDiag(): { stride: number; data: Float32Array } {
    return { stride: 5, data: this.diagData };
  }

  // Diagnostic: mark the crossing nearest (x, y) in lattice space; the next
  // update() logs its full render state to the console once.
  requestInspect(x: number, y: number): void {
    let best = -1;
    let bestDist = 1.5;
    const scratch = new Float32Array(2);
    this.ps.crossings.forEach((c, i) => {
      this.ps.bindingPoint(c.over, scratch, 0);
      const d = Math.hypot(scratch[0] - x, scratch[1] - y);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    this.inspectIndex = best;
    if (best < 0) console.log("INSPECT: no crossing within 1.5 units");
  }

  // Widths are read per frame during update(), so they apply live.
  setWidths(threadWidth: number, gap: number): void {
    this.style.threadWidth = threadWidth;
    this.style.casingWidth = threadWidth + gap * 2;
  }

  update(): void {
    const { positions } = this.ps;

    this.ps.chains.forEach((chain, i) => {
      const controls = this.chainControls[i];
      for (let k = 0; k < chain.length; k++) {
        controls[k * 2] = positions[chain[k] * 2];
        controls[k * 2 + 1] = positions[chain[k] * 2 + 1];
      }
      const samples = sampleClosedSpline(controls, this.fills[i].sampleCount);
      this.chainSamples[i] = samples;
      this.fills[i].update(
        samples.positions,
        samples.tangents,
        this.style.threadWidth / 2
      );
    });

    const fillHalf = this.style.threadWidth / 2;
    const gap = (this.style.casingWidth - this.style.threadWidth) / 2;

    this.ps.crossings.forEach((crossing, c) => {
      this.renderCrossing(
        crossing,
        c,
        this.underErases[c],
        this.overFills[c],
        this.overNeighbors[c],
        this.underNeighbors[c],
        fillHalf,
        gap
      );
    });
    this.renderEmergent(fillHalf, gap);
  }

  // Render one crossing's erase + over-fill patches. index < 0 marks an
  // emergent (unregistered) crossing: no neighbor lists, no diagnostics.
  private renderCrossing(
    crossing: { over: CrossingPass; under: CrossingPass; sign?: number },
    index: number,
    eraseMesh: PatchGridMesh,
    fillMesh: RibbonMesh,
    overNbIn: PassNeighbors | null,
    underNbIn: PassNeighbors | null,
    fillHalf: number,
    gap: number
  ): void {
    const c = index;
    const overNb = overNbIn ?? { prev: crossing.over, next: crossing.over };
    const underNb =
      underNbIn ?? { prev: crossing.under, next: crossing.under };
    {
      const overSamples = this.chainSamples[crossing.over.chain]!;
      const underSamples = this.chainSamples[crossing.under.chain]!;
      const overCenter = this.arcAt(overSamples, this.renderCtrl(crossing.over));
      const underCenter = this.arcAt(
        underSamples,
        this.renderCtrl(crossing.under)
      );

      // Local centerline polylines around the crossing. The cut boundary is
      // "distance to the over polyline == fillHalf" (the over ribbon's
      // silhouette), with the visible margin added afterward as ARC LENGTH
      // (see the header comment); the over-fill window is measured against
      // the under polyline. For SELF-crossings each polyline masks out the
      // other pass's neighborhood, and the arc between the passes is split
      // between the over window and the erase zone so the fill can never
      // repaint the gap.
      const selfCross = crossing.over.chain === crossing.under.chain;
      const total = overSamples.totalLength;
      let splitPos = Infinity;
      let splitNeg = Infinity;
      let maskHalf = 0.5;
      if (selfCross) {
        const dPos = (((underCenter - overCenter) % total) + total) % total;
        const dNeg = total - dPos;
        splitPos = Math.max(0.12, dPos / 2 - 0.08);
        splitNeg = Math.max(0.12, dNeg / 2 - 0.08);
        // The mask must never swallow the crossing's own neighborhood: at
        // tight tips the pass separation bounds it.
        maskHalf = Math.max(
          0.1,
          Math.min(0.5, Math.min(dPos, dNeg) / 2 - 0.05)
        );
      }
      const cutReachMax = Math.max(CUT_REACH_MIN, fillHalf * CUT_REACH_PER_HALF);
      const overReachMax = Math.max(
        OVER_REACH_MIN,
        fillHalf * OVER_REACH_PER_HALF
      );
      this.buildLocal(
        this.overLocal,
        overSamples,
        overCenter,
        Math.min(cutReachMax + LOCAL_REACH_PAD, overSamples.totalLength / 4),
        selfCross ? underCenter : Number.NaN,
        maskHalf
      );
      this.buildLocal(
        this.underLocal,
        underSamples,
        underCenter,
        Math.min(overReachMax + LOCAL_REACH_PAD, underSamples.totalLength / 4),
        selfCross ? overCenter : Number.NaN,
        maskHalf
      );

      const cutBoundary = fillHalf;
      const eraseW = fillHalf + ERASE_WIDTH_PAD;
      const [uGapPrev, uGapNext] = this.neighborGaps(
        underSamples,
        crossing.under,
        underNb
      );

      // Lane offsets span the erase width: lane 0 = left edge (+eraseW),
      // last lane = right edge (-eraseW).
      const laneOffset = (l: number): number =>
        eraseW * (1 - (2 * l) / (ERASE_LANES - 1));

      // March all lanes away from the crossing until each exits the cut
      // region, refining every exit arc by linear interpolation. Writes
      // signed arcs (relative to underCenter, biased outward) into cuts.
      const march = (
        dir: number,
        gapLimit: number,
        cuts: Float32Array,
        selfLimit: number
      ): void => {
        const sMax = Math.max(
          0.15,
          Math.min(
            cutReachMax,
            ERASE_NEIGHBOR_CLEARANCE * gapLimit,
            selfLimit,
            underSamples.totalLength / 4
          )
        );

        let unfinished = 0;
        this.sampleAt(underSamples, underCenter, this.sampleScratch, 0);
        for (let l = 0; l < ERASE_LANES; l++) {
          const u = laneOffset(l);
          const g =
            this.distToLocal(this.overLocal, 
              this.sampleScratch[0] - this.sampleScratch[3] * u,
              this.sampleScratch[1] + this.sampleScratch[2] * u
            ) - cutBoundary;
          if (g >= 0) {
            cuts[l] = 0.01 * dir;
          } else {
            cuts[l] = Number.NaN;
            this.lanePrevG[l] = g;
            unfinished++;
          }
        }

        let prevS = 0;
        for (let s = MARCH_STEP; unfinished > 0; s += MARCH_STEP) {
          const clamped = Math.min(s, sMax);
          this.sampleAt(
            underSamples,
            underCenter + dir * clamped,
            this.sampleScratch,
            0
          );
          for (let l = 0; l < ERASE_LANES; l++) {
            if (!Number.isNaN(cuts[l])) continue;
            const u = laneOffset(l);
            const g =
              this.distToLocal(this.overLocal, 
                this.sampleScratch[0] - this.sampleScratch[3] * u,
                this.sampleScratch[1] + this.sampleScratch[2] * u
              ) - cutBoundary;
            if (g >= 0) {
              const prevG = this.lanePrevG[l];
              cuts[l] =
                dir * (prevS + (clamped - prevS) * (prevG / (prevG - g)));
              unfinished--;
            } else {
              this.lanePrevG[l] = g;
            }
          }
          if (clamped >= sMax) break;
          prevS = clamped;
        }

        for (let l = 0; l < ERASE_LANES; l++) {
          if (Number.isNaN(cuts[l])) cuts[l] = dir * sMax;
          // The visible margin, applied as arc length so it stays `gap`
          // wide along the under thread at every crossing angle.
          cuts[l] += dir * (CUT_BIAS + gap);
        }
      };

      // Forward along the under thread heads into the over->under span's
      // complement (splitNeg); backward heads into the splitPos span.
      march(1, uGapNext, this.laneCutsPos, splitNeg);
      march(-1, uGapPrev, this.laneCutsNeg, splitPos);

      // Clamp each cap's lane spread around its median so hairpin-divergent
      // marches can't shear the grid across a loop tip.
      for (const cuts of [this.laneCutsPos, this.laneCutsNeg]) {
        const sorted = [...cuts].sort((a, b) => a - b);
        const median = sorted[(ERASE_LANES - 1) >> 1];
        for (let l = 0; l < ERASE_LANES; l++) {
          cuts[l] = Math.max(
            median - LANE_SPREAD_CLAMP,
            Math.min(median + LANE_SPREAD_CLAMP, cuts[l])
          );
        }
      }

      // Soft-clamp interior cap points toward the world-space cap chord so
      // inside-bend offset hooks don't read as sharp cut-ins. Working in
      // world space matters: a straight-in-arc-space reference bows in
      // world space whenever the under thread curves, which would bend a
      // correctly straight cap concave.
      for (const cuts of [this.laneCutsPos, this.laneCutsNeg]) {
        for (let l = 0; l < ERASE_LANES; l++) {
          const u = laneOffset(l);
          this.sampleAt(
            underSamples,
            underCenter + cuts[l],
            this.sampleScratch,
            0
          );
          this.capScratch[l * 4] =
            this.sampleScratch[0] - this.sampleScratch[3] * u;
          this.capScratch[l * 4 + 1] =
            this.sampleScratch[1] + this.sampleScratch[2] * u;
          this.capScratch[l * 4 + 2] = this.sampleScratch[2];
          this.capScratch[l * 4 + 3] = this.sampleScratch[3];
        }

        // Round genuine corners in the solved boundary before the chord
        // clamp: clamp each interior point's second difference.
        for (let l = 1; l < ERASE_LANES - 1; l++) {
          const midX =
            (this.capScratch[(l - 1) * 4] + this.capScratch[(l + 1) * 4]) / 2;
          const midY =
            (this.capScratch[(l - 1) * 4 + 1] +
              this.capScratch[(l + 1) * 4 + 1]) /
            2;
          const dx = this.capScratch[l * 4] - midX;
          const dy = this.capScratch[l * 4 + 1] - midY;
          const m = Math.hypot(dx, dy);
          if (m <= CAP_D2_MAX) continue;
          const scale = CAP_D2_MAX / m;
          const tx = this.capScratch[l * 4 + 2];
          const ty = this.capScratch[l * 4 + 3];
          const ds =
            (midX + dx * scale - this.capScratch[l * 4]) * tx +
            (midY + dy * scale - this.capScratch[l * 4 + 1]) * ty;
          cuts[l] += ds;
          this.capScratch[l * 4] += tx * ds;
          this.capScratch[l * 4 + 1] += ty * ds;
        }

        const x0 = this.capScratch[0];
        const y0 = this.capScratch[1];
        const xn = this.capScratch[(ERASE_LANES - 1) * 4];
        const yn = this.capScratch[(ERASE_LANES - 1) * 4 + 1];

        for (let l = 1; l < ERASE_LANES - 1; l++) {
          const t = l / (ERASE_LANES - 1);
          const dx = this.capScratch[l * 4] - (x0 + (xn - x0) * t);
          const dy = this.capScratch[l * 4 + 1] - (y0 + (yn - y0) * t);
          const dev = Math.hypot(dx, dy);
          if (dev < 1e-6) continue;
          const keep = 1 / (1 + dev / CAP_DEVIATION_SOFT);
          // Move the point toward the chord along its lane (~ the local
          // tangent direction), converting the world correction back into
          // an arc adjustment.
          const correction = keep - 1; // Fraction of the deviation to remove.
          cuts[l] +=
            (dx * this.capScratch[l * 4 + 2] +
              dy * this.capScratch[l * 4 + 3]) *
            correction;
        }
      }

      // Build the erase grid: each lane spans its own solved cut interval,
      // so the cap rows are polylines lying on the over ribbon's offset
      // curve - they curve with the over thread.
      const erase = eraseMesh;
      const midLane = (ERASE_LANES - 1) / 2;
      for (let k = 0; k < ERASE_STATIONS; k++) {
        const t = k / (ERASE_STATIONS - 1);

        // Station miter factor from the local turn of the under centerline,
        // matching the base ribbon's mitered extrusion so the erase keeps
        // covering it at kinks.
        const sMid =
          underCenter +
          this.laneCutsNeg[midLane] +
          (this.laneCutsPos[midLane] - this.laneCutsNeg[midLane]) * t;
        this.sampleAt(underSamples, sMid - MITER_PROBE, this.sampleScratch, 0);
        const pax = this.sampleScratch[0];
        const pay = this.sampleScratch[1];
        this.sampleAt(underSamples, sMid + MITER_PROBE, this.sampleScratch, 0);
        const pbx = this.sampleScratch[0];
        const pby = this.sampleScratch[1];
        this.sampleAt(underSamples, sMid, this.sampleScratch, 0);
        let ax = this.sampleScratch[0] - pax;
        let ay = this.sampleScratch[1] - pay;
        let bx = pbx - this.sampleScratch[0];
        let by = pby - this.sampleScratch[1];
        const la = Math.hypot(ax, ay) || 1;
        const lb = Math.hypot(bx, by) || 1;
        ax /= la;
        ay /= la;
        bx /= lb;
        by /= lb;
        const miter =
          1 / Math.sqrt(Math.max((1 + ax * bx + ay * by) / 2, 0.25));

        for (let l = 0; l < ERASE_LANES; l++) {
          const s =
            this.laneCutsNeg[l] +
            (this.laneCutsPos[l] - this.laneCutsNeg[l]) * t;
          const u = laneOffset(l) * miter;
          this.sampleAt(underSamples, underCenter + s, this.sampleScratch, 0);
          erase.setVertex(
            k,
            l,
            this.sampleScratch[0] - this.sampleScratch[3] * u,
            this.sampleScratch[1] + this.sampleScratch[2] * u
          );
        }
      }
      erase.commit();

      // Over fill: redraw the over thread across the hole. The window is
      // measured directly: march along the over thread until its centerline
      // is provably beyond the erase's reach of the under thread. No angle
      // estimates, so kinked centerlines can't undersize it.
      const [oGapPrev, oGapNext] = this.neighborGaps(
        overSamples,
        crossing.over,
        overNb
      );
      const overlapReach = eraseW + fillHalf + ERASE_WIDTH_PAD + 0.05;
      const reachAlongOver = (dir: number, gapLimit: number): number => {
        // Floor sits below the self-crossing split so tight tips can clamp
        // the window all the way down.
        const rMax = Math.max(
          0.12,
          Math.min(
            overReachMax,
            NEIGHBOR_CLEARANCE * gapLimit,
            dir > 0 ? splitPos : splitNeg,
            overSamples.totalLength / 4
          )
        );
        for (let s = MARCH_STEP; s < rMax; s += MARCH_STEP) {
          this.sampleAt(overSamples, overCenter + dir * s, this.sampleScratch, 0);
          const d = this.distToLocal(
            this.underLocal,
            this.sampleScratch[0],
            this.sampleScratch[1]
          );
          if (d >= overlapReach) {
            return Math.min(s + OVER_PATCH_MARGIN, rMax);
          }
        }
        return rMax;
      };
      // The comfort floor must never override the self-crossing split, or
      // the fill repaints the gap at tight tips.
      const halfPos = Math.min(
        Math.max(OVER_HALF_LENGTH_MIN, reachAlongOver(1, oGapNext)),
        splitPos
      );
      const halfNeg = Math.min(
        Math.max(OVER_HALF_LENGTH_MIN, reachAlongOver(-1, oGapPrev)),
        splitNeg
      );

      // Repaint the over thread across the hole by copying the base
      // ribbon's vertices for the window's sample range - pixel-identical
      // to the base ribbon, so no width change and no outline mismatch.
      const overFill = this.fills[crossing.over.chain];
      const arcPerSample = overSamples.totalLength / overSamples.count;
      const startSample = Math.floor((overCenter - halfNeg) / arcPerSample);
      const endSample = Math.ceil((overCenter + halfPos) / arcPerSample);
      const span = Math.min(
        endSample - startSample + 1,
        OVER_PATCH_MAX_SAMPLES,
        overSamples.count
      );
      fillMesh.updateFromRibbonWindow(overFill, startSample, span);
      fillMesh.mesh.tint = overFill.mesh.tint;

      if (index >= 0) {
        if (this.diagData.length < this.ps.crossings.length * 5) {
          this.diagData = new Float32Array(this.ps.crossings.length * 5);
        }
        let spanSum = 0;
        for (let l = 0; l < ERASE_LANES; l++) {
          spanSum += this.laneCutsPos[l] - this.laneCutsNeg[l];
        }
        this.ps.bindingPoint(crossing.over as CrossingPass, this.sampleScratch, 0);
        this.diagData[c * 5] = this.sampleScratch[0];
        this.diagData[c * 5 + 1] = this.sampleScratch[1];
        this.diagData[c * 5 + 2] = spanSum / ERASE_LANES;
        this.diagData[c * 5 + 3] = halfPos + halfNeg;
        this.diagData[c * 5 + 4] = selfCross
          ? Math.min(
              (((underCenter - overCenter) % total) + total) % total,
              (((overCenter - underCenter) % total) + total) % total
            )
          : -1;
      }

      if (index >= 0 && c === this.inspectIndex) {
        this.inspectIndex = -1;
        const round = (v: number): number => Math.round(v * 1000) / 1000;
        console.log(
          "CROSSING INSPECT " +
            JSON.stringify({
              crossing: c,
              selfCross,
              over: { chain: crossing.over.chain, ctrl: round(crossing.over.ctrl) },
              under: {
                chain: crossing.under.chain,
                ctrl: round(crossing.under.ctrl),
              },
              sign: crossing.sign,
              overCenter: round(overCenter),
              underCenter: round(underCenter),
              splitPos: round(splitPos),
              splitNeg: round(splitNeg),
              maskHalf: round(maskHalf),
              uGaps: [round(uGapPrev), round(uGapNext)],
              oGaps: [round(oGapPrev), round(oGapNext)],
              halfPos: round(halfPos),
              halfNeg: round(halfNeg),
              cutsPos: [...this.laneCutsPos].map(round),
              cutsNeg: [...this.laneCutsNeg].map(round),
              startSample,
              span,
              totalLength: round(total),
            })
        );
      }
    }
  }

  // Pooled patches for emergent (tunneled) crossings, deduped against
  // registered crossings and each other.
  private renderEmergent(fillHalf: number, gap: number): void {
    let poolUsed = 0;
    const used: number[] = [];
    for (const em of this.ps.emergentCrossings) {
      if (poolUsed >= EMERGENT_POOL) break;
      this.ps.bindingPoint(em.over, this.sampleScratch, 0);
      const ex = this.sampleScratch[0];
      const ey = this.sampleScratch[1];

      let dup = false;
      for (let c = 0; c * 5 < this.diagData.length; c++) {
        if (
          Math.hypot(
            this.diagData[c * 5] - ex,
            this.diagData[c * 5 + 1] - ey
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
      this.emergentErases[pool].mesh.visible = true;
      this.emergentFills[pool].mesh.visible = true;
      this.renderCrossing(
        em,
        -1,
        this.emergentErases[pool],
        this.emergentFills[pool],
        null,
        null,
        fillHalf,
        gap
      );
    }
    for (let k = poolUsed; k < EMERGENT_POOL; k++) {
      this.emergentErases[k].mesh.visible = false;
      this.emergentFills[k].mesh.visible = false;
    }
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}
