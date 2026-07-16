// Renders the knot as smooth ribbons. Base layer: every strand's fill ribbon.
// Patch layer: at each crossing, the OVER pass is redrawn on top with a wider
// background-colored casing under it, producing the classic Celtic
// over/under gap. Patches recompute every frame, so the effect survives
// physics motion.

import { Container } from "pixi.js";
import type { ParticleSystem } from "../physics/particle_system";
import type { SplineSamples } from "../geometry/spline_generator";
import { sampleClosedSpline } from "../geometry/spline_generator";
import { RibbonMesh } from "./ribbon_mesh";

export interface RibbonStyle {
  threadWidth: number; // In lattice units.
  casingWidth: number;
  background: number;
  baseHue: number; // [0, 360) starting hue for the strand palette.
}

const SAMPLE_SPACING = 0.15;
const MIN_SAMPLES = 48;
const PATCH_SAMPLES = 16;
// Patch windows adapt per frame: long enough to sever the under thread,
// short enough to never reach the neighboring crossings on the same thread
// (whose patches would fight this one).
const PATCH_HALF_LENGTH_MAX = 0.65;
const PATCH_HALF_LENGTH_MIN = 0.35;
const PATCH_NEIGHBOR_CLEARANCE = 0.42; // Fraction of the arc gap to a neighbor.
const CASING_PLATEAU = 0.45; // Full casing width within this arc distance.

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

export class RibbonRenderer {
  root: Container;

  private ps: ParticleSystem;
  private style: RibbonStyle;
  private fills: RibbonMesh[] = [];
  private patchCasings: RibbonMesh[] = [];
  private patchFills: RibbonMesh[] = [];
  private chainControls: Float32Array[] = [];
  private chainSamples: (SplineSamples | null)[] = [];
  private patchWindow = new Float32Array(PATCH_SAMPLES * 4);
  private casingWidths = new Float32Array(PATCH_SAMPLES);
  // Per patch: ctrl indices of the nearest crossing passes (either over or
  // under) before/after the over pass along its own chain.
  private patchNeighbors: Array<{ prevCtrl: number; nextCtrl: number }> = [];

  constructor(ps: ParticleSystem, style: RibbonStyle) {
    this.ps = ps;
    this.style = style;
    this.root = new Container();

    const baseLayer = new Container();
    // All casings render below all patch fills: a casing must never notch
    // another crossing's already-drawn over ribbon.
    const patchCasingLayer = new Container();
    const patchFillLayer = new Container();
    this.root.addChild(baseLayer, patchCasingLayer, patchFillLayer);

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

    for (const crossing of ps.crossings) {
      const list = passesByChain.get(crossing.over.chain)!;
      const i = list.indexOf(crossing.over.ctrl);
      this.patchNeighbors.push({
        prevCtrl: list[(i - 1 + list.length) % list.length],
        nextCtrl: list[(i + 1) % list.length],
      });
    }

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

    for (let c = 0; c < ps.crossings.length; c++) {
      const casing = new RibbonMesh(PATCH_SAMPLES, false, style.background);
      const fill = new RibbonMesh(PATCH_SAMPLES, false, 0xffffff);
      this.patchCasings.push(casing);
      this.patchFills.push(fill);
      patchCasingLayer.addChild(casing.mesh);
      patchFillLayer.addChild(fill.mesh);
    }
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

    this.ps.crossings.forEach((crossing, c) => {
      const { chain, ctrl } = crossing.over;
      const samples = this.chainSamples[chain]!;
      const total = samples.totalLength;
      const center = samples.controlArcLengths[ctrl];

      // Stay clear of the neighboring crossings along this thread.
      const { prevCtrl, nextCtrl } = this.patchNeighbors[c];
      let gapPrev = total / 2;
      let gapNext = total / 2;
      if (nextCtrl !== ctrl) {
        gapNext =
          (((samples.controlArcLengths[nextCtrl] - center) % total) + total) %
          total;
        gapPrev =
          (((center - samples.controlArcLengths[prevCtrl]) % total) + total) %
          total;
      }
      const halfLen = Math.max(
        PATCH_HALF_LENGTH_MIN,
        Math.min(
          PATCH_HALF_LENGTH_MAX,
          PATCH_NEIGHBOR_CLEARANCE * gapNext,
          PATCH_NEIGHBOR_CLEARANCE * gapPrev,
          total / 4
        )
      );

      // Casing tapers from full width at the crossing down to the fill
      // width at the window ends, so its caps never notch nearby threads.
      const plateau = Math.min(CASING_PLATEAU, halfLen * 0.75);
      const casingHalf = this.style.casingWidth / 2;
      const fillHalf = this.style.threadWidth / 2;
      for (let k = 0; k < PATCH_SAMPLES; k++) {
        const offset = Math.abs((2 * k) / (PATCH_SAMPLES - 1) - 1) * halfLen;
        if (offset <= plateau) {
          this.casingWidths[k] = casingHalf;
        } else {
          const s = (offset - plateau) / (halfLen - plateau);
          const ease = s * s * (3 - 2 * s);
          this.casingWidths[k] = casingHalf + (fillHalf - casingHalf) * ease;
        }
      }

      for (let k = 0; k < PATCH_SAMPLES; k++) {
        let arc = center - halfLen + (2 * halfLen * k) / (PATCH_SAMPLES - 1);
        arc = ((arc % total) + total) % total;

        // Interpolate position and tangent from the uniform samples.
        const f = (arc / total) * samples.count;
        const i0 = Math.floor(f) % samples.count;
        const i1 = (i0 + 1) % samples.count;
        const frac = f - Math.floor(f);

        this.patchWindow[k * 4] =
          samples.positions[i0 * 2] +
          (samples.positions[i1 * 2] - samples.positions[i0 * 2]) * frac;
        this.patchWindow[k * 4 + 1] =
          samples.positions[i0 * 2 + 1] +
          (samples.positions[i1 * 2 + 1] - samples.positions[i0 * 2 + 1]) *
            frac;

        let tx =
          samples.tangents[i0 * 2] +
          (samples.tangents[i1 * 2] - samples.tangents[i0 * 2]) * frac;
        let ty =
          samples.tangents[i0 * 2 + 1] +
          (samples.tangents[i1 * 2 + 1] - samples.tangents[i0 * 2 + 1]) * frac;
        const len = Math.hypot(tx, ty) || 1;
        tx /= len;
        ty /= len;
        this.patchWindow[k * 4 + 2] = tx;
        this.patchWindow[k * 4 + 3] = ty;
      }

      this.patchCasings[c].updateFromWindow(this.patchWindow, this.casingWidths);
      this.patchFills[c].updateFromWindow(this.patchWindow, fillHalf);
      // Patch fill matches its strand's color.
      this.patchFills[c].mesh.tint = this.fills[chain].mesh.tint;
    });
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}
