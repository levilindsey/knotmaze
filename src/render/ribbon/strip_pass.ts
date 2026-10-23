// THE STRIP PASS (K5 R4): the fill meshes and their extrusion -
// ThreadPass, G3-2's seam (G3-3 will delete this file). Moved verbatim
// from ribbon_renderer.ts (98d96fa5); a body changed in three ways only:
// a renderer member became `this.r.x`, a sampling helper
// `sampling.x(...)`, and the façade keeps the names other code calls
// (fills, reextrude behind the pluck host's collapse install). See
// docs/design/K5_R4.md: update() composes the taper itself and hands
// the composed width to extrude(); the pluck collapse composes inside,
// so collapse()'s bit-identity argument ("same inputs as update()
// everywhere outside the collapse") stays literal.

import type { SplineSamples } from "../../geometry/spline_generator";
import type { RibbonRenderer } from "../ribbon_renderer";
import { RibbonMesh } from "../ribbon_mesh";
import { sectionShader } from "./ribbon_shader";
import type { ThreadPass } from "./thread_pass";
import * as sampling from "./sampling";
import { tipStrokeWrite } from "./tip_stadium";

export class StripPass implements ThreadPass {
  readonly r: RibbonRenderer;
  constructor(r: RibbonRenderer) {
    this.r = r;
  }

  // The façade's shared state this part reads: the style, this frame's
  // samples and scratches, and the G3 write the collapse rides.
  private get style() { return this.r.style; }
  private get chainSamples() { return this.r.chainSamples; }
  private get sampleScratch() { return this.r.sampleScratch; }
  private get glyphTipStroke() { return this.r.glyphTipStroke; }
  private get widthLast() { return this.r.widthLast; }
  private sampleAt(samples: SplineSamples, arc: number, out: Float32Array, offset: number): void {
    sampling.sampleAt(samples, arc, out, offset);
  }

  /** @internal ribbon */ fills: RibbonMesh[] = [];

  // One chain's fill mesh (the constructor's loop): created with its
  // section shader; the façade adds it to the base layer.
  build(chain: number, count: number, closed: boolean): RibbonMesh {
    const fill = new RibbonMesh(count, closed, 0xffffff, true, chain);
    fill.mesh.shader = sectionShader();
    this.fills.push(fill);
    return fill;
  }

  // Extrude one chain's fill from this frame's samples and the width
  // update() composed (reveal x taper); the pluck collapse composes
  // inside. Returns the multiplier handed to the mesh (update()'s G3
  // chain write reads the same one).
  extrude(
    chain: number,
    samples: SplineSamples,
    width: Float32Array | null,
    lean?: Float32Array | null
  ): Float32Array | null {
    const mul = this.r.pluckHost.withPluckCollapse(chain, samples.count, width);
    this.fills[chain].update(
      samples.positions,
      samples.tangents,
      this.style.threadWidth / 2,
      0,
      mul,
      lean ?? null
    );
    return mul;
  }

  // The LIGHT PATH: re-extrude one chain's base ribbon from its cached
  // samples (pluck collapse on/off) - no spline, no crossing solve. Same
  // inputs as update() everywhere outside the collapse, so the vertices
  // there come out bit-identical.
  collapse(chain: number): void {
    const samples = this.chainSamples[chain];
    if (!samples) return;
    const mul = this.r.pluckHost.withPluckCollapse(
      chain,
      samples.count,
      this.widthLast[chain] ?? null
    );
    this.fills[chain].update(
      samples.positions,
      samples.tangents,
      this.style.threadWidth / 2,
      0,
      mul,
      this.r.taperLeanFor(chain, samples)
    );
    // G3-0: the collapse is part of the chain's radii.
    if (this.r.g3Data && this.r.g3Active()) {
      this.r.g3WriteRadii(chain, mul);
      this.r.g3WriteChainRecords();
      this.r.g3FlushNow();
    }
  }


  // Collapse the samples within one host half-width of a fused terminal
  // onto the tuck point, so the ribbon ends flush at the host's near edge.
  tuck(
    samples: SplineSamples,
    atStart: boolean,
    atEnd: boolean,
    chain: number
  ): void {
    const total = samples.totalLength;
    // Tuck 3/4 of the way to the host's near edge: the remaining overlap
    // hides under the fillets, so no background sliver can open between
    // the tucked cap and the (curved) host edge.
    const trim = Math.min((this.style.threadWidth / 2) * 0.75, total * 0.25);
    const arcPer = total / (samples.count - 1);
    // K580 s5: a glyph chain keeps each tucked end's untucked stroke, J to
    // T, for the stadium cap cover (joinery.ts), copied before any clamp.
    if (this.style.glyph && this.style.glyph[chain]) {
      const S = this.sampleScratch;
      if (atStart) {
        const kEnd = Math.min(samples.count - 1, Math.ceil(trim / arcPer));
        let buf = this.glyphTipStroke[chain * 2] ?? null;
        for (let k = 0; k < kEnd; k++) {
          const p = samples.positions;
          const t = samples.tangents;
          buf = tipStrokeWrite(buf, k, p[k * 2], p[k * 2 + 1], t[k * 2], t[k * 2 + 1]);
        }
        this.sampleAt(samples, trim, S, 0);
        buf = tipStrokeWrite(buf, kEnd, S[0], S[1], S[2], S[3]);
        this.glyphTipStroke[chain * 2] = buf;
      }
      if (atEnd) {
        const k0 = Math.max(1, samples.count - Math.ceil(trim / arcPer));
        let buf = this.glyphTipStroke[chain * 2 + 1] ?? null;
        let i = 0;
        // k0 can sit at or past T (its range rounds outward): stop at T.
        for (let k = samples.count - 1; k >= k0 && k * arcPer > total - trim; k--, i++) {
          const p = samples.positions;
          const t = samples.tangents;
          buf = tipStrokeWrite(buf, i, p[k * 2], p[k * 2 + 1], -t[k * 2], -t[k * 2 + 1]);
        }
        this.sampleAt(samples, total - trim, S, 0);
        buf = tipStrokeWrite(buf, i, S[0], S[1], -S[2], -S[3]);
        this.glyphTipStroke[chain * 2 + 1] = buf;
      }
    }
    const clamp = (arc: number, from: number, to: number): void => {
      this.sampleAt(samples, arc, this.sampleScratch, 0);
      const [x, y, tx, ty] = this.sampleScratch;
      for (let k = from; k < to; k++) {
        samples.positions[k * 2] = x;
        samples.positions[k * 2 + 1] = y;
        samples.tangents[k * 2] = tx;
        samples.tangents[k * 2 + 1] = ty;
      }
    };
    if (atStart) {
      clamp(trim, 0, Math.min(samples.count - 1, Math.ceil(trim / arcPer)));
    }
    if (atEnd) {
      const k0 = Math.max(1, samples.count - Math.ceil(trim / arcPer));
      clamp(total - trim, k0, samples.count);
    }
  }
}
