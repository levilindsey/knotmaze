// Renders the knot as smooth ribbons. Base layer: every strand's fill ribbon.
// At each crossing, two patches recompute every frame:
//   1. An "under erase" patch: a background-colored ribbon that follows the
//      UNDER thread through the crossing, slightly wider than the thread, so
//      its footprint never exceeds the under thread's own and it cannot
//      notch anything else. Its end caps are the visible cut ends of the
//      under thread. The correct cut boundary is "perpendicular distance to
//      the over CENTERLINE CURVE equals overHalfWidth + gap" (the offset
//      curve of the over ribbon), so each cap corner is found by marching
//      along its under-ribbon edge until that distance condition flips,
//      against a locally sampled polyline of the over centerline. Both
//      corners of a cap therefore sit at the same distance from the over
//      thread, curvature included, at any crossing angle.
//   2. The OVER pass fill, redrawn on top so the over thread rides above
//      the hole, with a length that adapts to the crossing angle.
// All erases render below all fills, so patches never slice each other.

import { Container } from "pixi.js";
import type { ParticleSystem } from "../physics/particle_system";
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
const OVER_PATCH_MAX_SAMPLES = 36;
// The over-fill window clamps to a fraction of the arc distance to the
// nearest crossing pass along the same thread. The erase march gets a larger
// budget: truncating a lane's boundary solve leaves that cap corner short
// (visibly closer to the over thread), and any overreach toward the
// neighboring crossing is repainted by its vertex-exact over-fill - the two
// fractions summing past 1.0 guarantees the windows overlap.
const NEIGHBOR_CLEARANCE = 0.42;
const ERASE_NEIGHBOR_CLEARANCE = 0.65;
const OVER_HALF_LENGTH_MIN = 0.35;
const OVER_PATCH_MARGIN = 0.12;
// Slight overhang so the erase fully covers the under ribbon's antialiased
// edges.
const ERASE_WIDTH_PAD = 0.02;
const MIN_CROSSING_SIN = 0.35;
// Boundary-march parameters: the over centerline is sampled as a local
// polyline, and several lanes across the under ribbon march outward until
// each exits the cut region (distance to that polyline >= cut boundary).
// Multiple lanes let the cap edges curve with the over thread.
const OVER_LOCAL_SAMPLES = 24;
const OVER_LOCAL_REACH = 1.7;
const MARCH_STEP = 0.12;
const CUT_REACH_MAX = 1.15;
const ERASE_STATIONS = 16;
const ERASE_LANES = 5;
// Cut arcs extend outward by this much: widens the gap imperceptibly while
// swallowing base-ribbon slivers that poke past the cap at tight bends.
const CUT_BIAS = 0.03;
// Soft-clamp scale for a cap point's WORLD deviation from the world cap
// chord. The true offset curve hooks sharply on the inside of tight bends
// (curvature is amplified by 1/(1 - d*k)); compressing large deviations
// keeps the cut reading parallel to the over thread while gentle curvature
// stays intact. Measured in world space so a genuinely straight cap (e.g.
// straight over thread) is a fixed point regardless of under-thread
// curvature.
const CAP_DEVIATION_SOFT = 0.08;

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
  prevCtrl: number;
  nextCtrl: number;
}

export class RibbonRenderer {
  root: Container;

  private ps: ParticleSystem;
  private style: RibbonStyle;
  private fills: RibbonMesh[] = [];
  private underErases: PatchGridMesh[] = [];
  private overFills: RibbonMesh[] = [];
  private chainControls: Float32Array[] = [];
  private chainSamples: (SplineSamples | null)[] = [];
  private sampleScratch = new Float32Array(4);
  private overLocal = new Float32Array(OVER_LOCAL_SAMPLES * 2);
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

    // Every crossing pass (over and under) along each chain, sorted by ctrl.
    const passesByChain = new Map<number, number[]>();
    for (const crossing of ps.crossings) {
      for (const pass of [crossing.over, crossing.under]) {
        const list = passesByChain.get(pass.chain);
        if (list) list.push(pass.ctrl);
        else passesByChain.set(pass.chain, [pass.ctrl]);
      }
    }
    for (const list of passesByChain.values()) list.sort((a, b) => a - b);

    const neighborsOf = (chain: number, ctrl: number): PassNeighbors => {
      const list = passesByChain.get(chain)!;
      const i = list.indexOf(ctrl);
      return {
        prevCtrl: list[(i - 1 + list.length) % list.length],
        nextCtrl: list[(i + 1) % list.length],
      };
    };

    for (const crossing of ps.crossings) {
      this.overNeighbors.push(
        neighborsOf(crossing.over.chain, crossing.over.ctrl)
      );
      this.underNeighbors.push(
        neighborsOf(crossing.under.chain, crossing.under.ctrl)
      );

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

  // Distance from a point to the locally sampled over centerline. The
  // polyline is dense (~0.14 spacing), so nearest-vertex distance is within
  // ~0.005 of the true curve distance at the ranges we care about.
  private distToOverLocal(x: number, y: number): number {
    let best = Infinity;
    for (let m = 0; m < OVER_LOCAL_SAMPLES; m++) {
      const dx = this.overLocal[m * 2] - x;
      const dy = this.overLocal[m * 2 + 1] - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) best = d2;
    }
    return Math.sqrt(best);
  }

  // Arc gap to the neighboring crossing passes, wrapping around the loop.
  private neighborGaps(
    samples: SplineSamples,
    ctrl: number,
    neighbors: PassNeighbors
  ): [number, number] {
    const total = samples.totalLength;
    if (neighbors.nextCtrl === ctrl) return [total / 2, total / 2];
    const center = samples.controlArcLengths[ctrl];
    const gapNext =
      (((samples.controlArcLengths[neighbors.nextCtrl] - center) % total) +
        total) %
      total;
    const gapPrev =
      (((center - samples.controlArcLengths[neighbors.prevCtrl]) % total) +
        total) %
      total;
    return [gapPrev, gapNext];
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
      const overSamples = this.chainSamples[crossing.over.chain]!;
      const underSamples = this.chainSamples[crossing.under.chain]!;
      const overCenter = overSamples.controlArcLengths[crossing.over.ctrl];
      const underCenter = underSamples.controlArcLengths[crossing.under.ctrl];

      // Local polyline of the over centerline; the cut boundary is
      // "distance to this curve == fillHalf + gap", i.e. the offset curve
      // of the over ribbon.
      const reach = Math.min(OVER_LOCAL_REACH, overSamples.totalLength / 4);
      for (let m = 0; m < OVER_LOCAL_SAMPLES; m++) {
        const arc =
          overCenter - reach + (2 * reach * m) / (OVER_LOCAL_SAMPLES - 1);
        this.sampleAt(overSamples, arc, this.sampleScratch, 0);
        this.overLocal[m * 2] = this.sampleScratch[0];
        this.overLocal[m * 2 + 1] = this.sampleScratch[1];
      }

      const cutBoundary = fillHalf + gap;
      const eraseW = fillHalf + ERASE_WIDTH_PAD;
      const [uGapPrev, uGapNext] = this.neighborGaps(
        underSamples,
        crossing.under.ctrl,
        this.underNeighbors[c]
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
        cuts: Float32Array
      ): void => {
        const sMax = Math.max(
          0.15,
          Math.min(
            CUT_REACH_MAX,
            ERASE_NEIGHBOR_CLEARANCE * gapLimit,
            underSamples.totalLength / 4
          )
        );

        let unfinished = 0;
        this.sampleAt(underSamples, underCenter, this.sampleScratch, 0);
        for (let l = 0; l < ERASE_LANES; l++) {
          const u = laneOffset(l);
          const g =
            this.distToOverLocal(
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
              this.distToOverLocal(
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
          cuts[l] += dir * CUT_BIAS;
        }
      };

      march(1, uGapNext, this.laneCutsPos);
      march(-1, uGapPrev, this.laneCutsNeg);

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
      const erase = this.underErases[c];
      for (let k = 0; k < ERASE_STATIONS; k++) {
        const t = k / (ERASE_STATIONS - 1);
        for (let l = 0; l < ERASE_LANES; l++) {
          const s =
            this.laneCutsNeg[l] +
            (this.laneCutsPos[l] - this.laneCutsNeg[l]) * t;
          const u = laneOffset(l);
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

      // Over fill: redraw the over thread across the hole. Its length must
      // cover the crossing lens (where the erase overlaps the over ribbon),
      // which grows as the crossing angle shallows.
      this.sampleAt(overSamples, overCenter, this.sampleScratch, 0);
      const otx = this.sampleScratch[2];
      const oty = this.sampleScratch[3];
      this.sampleAt(underSamples, underCenter, this.sampleScratch, 0);
      const utx = this.sampleScratch[2];
      const uty = this.sampleScratch[3];
      const sinTheta = Math.max(
        Math.abs(utx * oty - uty * otx),
        MIN_CROSSING_SIN
      );
      const cosTheta = Math.abs(utx * otx + uty * oty);

      const [oGapPrev, oGapNext] = this.neighborGaps(
        overSamples,
        crossing.over.ctrl,
        this.overNeighbors[c]
      );
      const overHalf = Math.max(
        OVER_HALF_LENGTH_MIN,
        Math.min(
          (eraseW + fillHalf * cosTheta) / sinTheta + OVER_PATCH_MARGIN,
          NEIGHBOR_CLEARANCE * oGapPrev,
          NEIGHBOR_CLEARANCE * oGapNext,
          overSamples.totalLength / 4
        )
      );
      // Repaint the over thread across the hole by copying the base
      // ribbon's vertices for the window's sample range - pixel-identical
      // to the base ribbon, so no width change and no outline mismatch.
      const overFill = this.fills[crossing.over.chain];
      const arcPerSample = overSamples.totalLength / overSamples.count;
      const startSample = Math.floor((overCenter - overHalf) / arcPerSample);
      const endSample = Math.ceil((overCenter + overHalf) / arcPerSample);
      const span = Math.min(
        endSample - startSample + 1,
        OVER_PATCH_MAX_SAMPLES,
        overSamples.count
      );
      this.overFills[c].updateFromRibbonWindow(overFill, startSample, span);
      this.overFills[c].mesh.tint = overFill.mesh.tint;
    });
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}
