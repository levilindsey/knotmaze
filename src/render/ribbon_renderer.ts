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
import { RibbonMesh } from "./ribbon_mesh";

export interface RibbonStyle {
  threadWidth: number; // In lattice units.
  casingWidth: number; // Thread width + twice the crossing gap.
  background: number;
  baseHue: number; // [0, 360) starting hue for the strand palette.
}

const SAMPLE_SPACING = 0.15;
const MIN_SAMPLES = 48;
const PATCH_SAMPLES = 16;
// Patch half-lengths clamp to a fraction of the arc distance to the nearest
// crossing pass along the same thread, so neighboring patches never fight.
const NEIGHBOR_CLEARANCE = 0.42;
const OVER_HALF_LENGTH_MIN = 0.35;
const OVER_PATCH_MARGIN = 0.12;
// Slight overhang so the erase fully covers the under ribbon's antialiased
// edges.
const ERASE_WIDTH_PAD = 0.02;
const MIN_CROSSING_SIN = 0.5;
// Boundary-march parameters: the over centerline is sampled as a local
// polyline, and each under-ribbon edge marches outward until it exits the
// cut region (distance to that polyline >= cut boundary).
const OVER_LOCAL_SAMPLES = 24;
const OVER_LOCAL_REACH = 1.7;
const MARCH_STEP = 0.12;
const CUT_REACH_MAX = 1.15;

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
  private underErases: RibbonMesh[] = [];
  private overFills: RibbonMesh[] = [];
  private chainControls: Float32Array[] = [];
  private chainSamples: (SplineSamples | null)[] = [];
  private window = new Float32Array(PATCH_SAMPLES * 4);
  private pairScratch = new Float32Array(PATCH_SAMPLES * 4);
  private sampleScratch = new Float32Array(4);
  private overLocal = new Float32Array(OVER_LOCAL_SAMPLES * 2);
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

      const erase = new RibbonMesh(PATCH_SAMPLES, false, style.background);
      const fill = new RibbonMesh(PATCH_SAMPLES, false, 0xffffff);
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

  private buildWindow(
    samples: SplineSamples,
    center: number,
    halfLen: number
  ): void {
    for (let k = 0; k < PATCH_SAMPLES; k++) {
      const arc = center - halfLen + (2 * halfLen * k) / (PATCH_SAMPLES - 1);
      this.sampleAt(samples, arc, this.window, k * 4);
    }
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

      // March both under-ribbon edges away from the crossing until each
      // exits the cut region, refining the exit arc by linear interpolation.
      // Returns [leftCut, rightCut] as signed arcs relative to underCenter.
      const march = (dir: number, gapLimit: number): [number, number] => {
        const sMax = Math.max(
          0.15,
          Math.min(
            CUT_REACH_MAX,
            NEIGHBOR_CLEARANCE * gapLimit,
            underSamples.totalLength / 4
          )
        );

        this.sampleAt(underSamples, underCenter, this.sampleScratch, 0);
        let prevGL =
          this.distToOverLocal(
            this.sampleScratch[0] - this.sampleScratch[3] * eraseW,
            this.sampleScratch[1] + this.sampleScratch[2] * eraseW
          ) - cutBoundary;
        let prevGR =
          this.distToOverLocal(
            this.sampleScratch[0] + this.sampleScratch[3] * eraseW,
            this.sampleScratch[1] - this.sampleScratch[2] * eraseW
          ) - cutBoundary;
        let cutL = prevGL >= 0 ? 0.01 * dir : Number.NaN;
        let cutR = prevGR >= 0 ? 0.01 * dir : Number.NaN;

        let prevS = 0;
        for (let s = MARCH_STEP; ; s += MARCH_STEP) {
          const clamped = Math.min(s, sMax);
          this.sampleAt(
            underSamples,
            underCenter + dir * clamped,
            this.sampleScratch,
            0
          );
          if (Number.isNaN(cutL)) {
            const gL =
              this.distToOverLocal(
                this.sampleScratch[0] - this.sampleScratch[3] * eraseW,
                this.sampleScratch[1] + this.sampleScratch[2] * eraseW
              ) - cutBoundary;
            if (gL >= 0) {
              cutL =
                dir * (prevS + (clamped - prevS) * (prevGL / (prevGL - gL)));
            } else {
              prevGL = gL;
            }
          }
          if (Number.isNaN(cutR)) {
            const gR =
              this.distToOverLocal(
                this.sampleScratch[0] + this.sampleScratch[3] * eraseW,
                this.sampleScratch[1] - this.sampleScratch[2] * eraseW
              ) - cutBoundary;
            if (gR >= 0) {
              cutR =
                dir * (prevS + (clamped - prevS) * (prevGR / (prevGR - gR)));
            } else {
              prevGR = gR;
            }
          }
          if (!Number.isNaN(cutL) && !Number.isNaN(cutR)) break;
          if (clamped >= sMax) break;
          prevS = clamped;
        }

        if (Number.isNaN(cutL)) cutL = dir * sMax;
        if (Number.isNaN(cutR)) cutR = dir * sMax;
        return [cutL, cutR];
      };

      const [cutLPos, cutRPos] = march(1, uGapNext);
      const [cutLNeg, cutRNeg] = march(-1, uGapPrev);

      // Build the erase strip: each edge spans its own solved cut interval,
      // so the cap edges connect corners that are exactly equidistant from
      // the over thread.
      for (let k = 0; k < PATCH_SAMPLES; k++) {
        const t = k / (PATCH_SAMPLES - 1);
        const sL = cutLNeg + (cutLPos - cutLNeg) * t;
        const sR = cutRNeg + (cutRPos - cutRNeg) * t;

        this.sampleAt(underSamples, underCenter + sL, this.sampleScratch, 0);
        this.pairScratch[k * 4] =
          this.sampleScratch[0] - this.sampleScratch[3] * eraseW;
        this.pairScratch[k * 4 + 1] =
          this.sampleScratch[1] + this.sampleScratch[2] * eraseW;

        this.sampleAt(underSamples, underCenter + sR, this.sampleScratch, 0);
        this.pairScratch[k * 4 + 2] =
          this.sampleScratch[0] + this.sampleScratch[3] * eraseW;
        this.pairScratch[k * 4 + 3] =
          this.sampleScratch[1] - this.sampleScratch[2] * eraseW;
      }
      this.underErases[c].updateFromVertexPairs(this.pairScratch);

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
      this.buildWindow(overSamples, overCenter, overHalf);
      this.overFills[c].updateFromWindow(this.window, fillHalf);
      this.overFills[c].mesh.tint = this.fills[crossing.over.chain].mesh.tint;
    });
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}
