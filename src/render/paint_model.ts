// G2 SHADER PAINT - the pixi glue: the page-lifetime data textures and the
// shared uniform group the GLSL library (paint_glsl.ts) reads, and the
// per-scene PaintScene that lays them out and writes them. The CPU mirror
// (paint_math.ts) reads the very same Float32Array mirrors and uniform
// value arrays.
//
// Lifetime: the textures and the uniform group are PAGE singletons, never
// destroyed (pixi's retained render state can reference a source the frame
// after a rebuild - the PALETTE_CACHE lore); a new scene rewrites them in
// place and grows them with ensure().

import { UniformGroup } from "pixi.js";
import { FloatRows, ROW_W } from "./float_rows";
import { PAINT_CONST } from "./paint_const";
import type { KData, KPiece, KUniforms } from "./paint_math";
import {
  MAX_KNOTS,
  layoutSources,
  sourceHints,
  writeChainHeader,
  writeGeomTable,
} from "./paint_math";

let K_STATIC: FloatRows | null = null;
let K_GEOM: FloatRows | null = null;
let K_REVEAL: FloatRows | null = null;
let K_PAINT: FloatRows | null = null;
export function kStatic(): FloatRows {
  if (!K_STATIC) K_STATIC = new FloatRows(ROW_W, 4);
  return K_STATIC;
}
export function kGeom(): FloatRows {
  if (!K_GEOM) K_GEOM = new FloatRows(ROW_W, 2);
  return K_GEOM;
}
export function kReveal(): FloatRows {
  if (!K_REVEAL) K_REVEAL = new FloatRows(ROW_W, 1);
  return K_REVEAL;
}
export function kPaint(): FloatRows {
  if (!K_PAINT) K_PAINT = new FloatRows(ROW_W, 1);
  return K_PAINT;
}

let K_UNIFORMS: UniformGroup | null = null;
export function knotUniforms(): UniformGroup {
  if (!K_UNIFORMS) {
    const v4 = (a = 0, b = 0, c = 0, d = 0) => ({
      value: new Float32Array([a, b, c, d]),
      type: "vec4<f32>" as const,
    });
    // isStatic false: pixi re-syncs the group at every draw (each vec4
    // setter compares its cached copy first), so in-place mutation of the
    // value arrays is all a writer does.
    K_UNIFORMS = new UniformGroup({
      uKBase: v4(),
      uKFx: v4(),
      uKFx2: v4(),
      uKShape: v4(1, 0, 1, 0),
      uKInk: v4(1, 0),
      uKKnots: {
        value: new Float32Array(MAX_KNOTS * 4),
        type: "vec4<f32>",
        size: MAX_KNOTS,
      },
    });
    const k = (K_UNIFORMS.uniforms as unknown as KUniforms).uKKnots;
    k.set([0, 0, 1, 1]);
  }
  return K_UNIFORMS;
}
export function knotUniformValues(): KUniforms {
  return knotUniforms().uniforms as unknown as KUniforms;
}

// Every texture's current mirror (re-read after any ensure()).
export function kData(): KData {
  return {
    stat: kStatic().data,
    geom: kGeom().data,
    reveal: kReveal().data,
    paint: kPaint().data,
  };
}

export interface PaintChainInfo {
  nCtrl: number; // Physics chain length (control slots).
  closed: boolean;
  count: number; // Ribbon sample count.
  paintBase: number; // Junction-field PAINT texture base (palette mode).
}

// Per-scene layout of the data textures. KSTATIC regions start on row
// boundaries so an event rewrites (and uploads) only its own rows.
export class PaintScene {
  readonly chains: PaintChainInfo[];
  // KSTATIC: CHAINS at texel 0, then the ctrl index (one texel per control
  // slot per chain).
  readonly idxBase: Int32Array;
  readonly idxEnd: number;
  // KGEOM: per chain, G0 + the packed control arcs.
  readonly geomBase: Int32Array;
  readonly geomEnd: number;
  // Reveal sources per chain (KREVEAL), for the C1 header.
  private srcFirst: Int32Array;
  private srcCount: Int32Array;
  // Diagnostics: slots whose covering sources exceed the shader's scan.
  hintOverflow = 0;
  // Per chain [first start, last finish] of its reveal (anim seconds):
  // the CPU mask's fast paths.
  private span: Float64Array;

  constructor(chains: PaintChainInfo[]) {
    this.chains = chains;
    const n = chains.length;
    const rowUp = (t: number): number => Math.ceil(t / ROW_W) * ROW_W;
    this.idxBase = new Int32Array(n);
    let t = rowUp(2 * n);
    for (let c = 0; c < n; c++) {
      this.idxBase[c] = t;
      t += chains[c].nCtrl;
    }
    this.idxEnd = t;
    this.geomBase = new Int32Array(n);
    let g = 0;
    for (let c = 0; c < n; c++) {
      this.geomBase[c] = g;
      g += 1 + Math.ceil(chains[c].nCtrl / 4);
    }
    this.geomEnd = g;
    this.srcFirst = new Int32Array(n);
    this.srcCount = new Int32Array(n);
    this.span = new Float64Array(2 * n);

    const st = kStatic();
    st.ensure(this.idxEnd);
    st.data.fill(0, 0, this.idxEnd * 4);
    for (let c = 0; c < n; c++) this.writeHeader(c);
    // No reveal yet: every source hint is -1.
    for (let c = 0; c < n; c++) {
      const b = this.idxBase[c] * 4;
      for (let s = 0; s < chains[c].nCtrl; s++) st.data[b + s * 4 + 1] = -1;
    }
    st.markDirty(0, this.idxEnd);
    st.flush();

    const ge = kGeom();
    ge.ensure(this.geomEnd);
    ge.data.fill(0, 0, this.geomEnd * 4);
    ge.markDirty(0, this.geomEnd);
    ge.flush();
  }

  private writeHeader(c: number): void {
    const ch = this.chains[c];
    writeChainHeader(kStatic().data, c, {
      nCtrl: ch.nCtrl,
      closed: ch.closed,
      count: ch.count,
      idxBase: this.idxBase[c],
      geomBase: this.geomBase[c],
      srcFirst: this.srcFirst[c],
      srcCount: this.srcCount[c],
      paintBase: ch.paintBase,
    });
  }

  // One chain's arc table for this frame (update(), right after sampling).
  writeGeom(
    chain: number,
    total: number,
    count: number,
    closed: boolean,
    controlArcLengths: ArrayLike<number>
  ): void {
    const ge = kGeom();
    const base = this.geomBase[chain];
    const n = writeGeomTable(
      ge.data,
      base,
      total,
      count,
      closed,
      controlArcLengths
    );
    ge.markDirty(base, base + n);
  }

  flushGeom(): void {
    kGeom().flush();
  }

  // A reveal starts: the sources (KREVEAL) and every control's source hint
  // (CTRLIDX .y) and ink ignition time (.w; null = interval mode).
  setReveal(
    pieces: KPiece[][] | null,
    inkTign: Float32Array[] | null,
    inkSpeed = 1
  ): void {
    const st = kStatic();
    const n = this.chains.length;
    this.hintOverflow = 0;
    for (let c = 0; c < n; c++) {
      let a = Infinity;
      let b = -Infinity;
      if (pieces) {
        for (const p of pieces[c]) {
          a = Math.min(a, p.t0);
          b = Math.max(b, p.tEnd);
        }
      } else if (inkTign) {
        for (const v of inkTign[c]) {
          a = Math.min(a, v);
          b = Math.max(b, v);
        }
        b += PAINT_CONST.INK_TAPER_WORLD / inkSpeed;
      }
      this.span[2 * c] = a;
      this.span[2 * c + 1] = b;
    }
    if (pieces) {
      const lay = layoutSources(pieces);
      const rv = kReveal();
      rv.ensure(lay.data.length / 4);
      rv.data.set(lay.data);
      rv.markDirty(0, lay.data.length / 4);
      rv.flush();
      this.srcFirst = lay.first;
      this.srcCount = lay.count;
      const d = st.data;
      for (let c = 0; c < n; c++) {
        const h = sourceHints(pieces[c], lay.first[c], this.chains[c].nCtrl);
        this.hintOverflow += h.overflow;
        const b = this.idxBase[c] * 4;
        for (let s = 0; s < this.chains[c].nCtrl; s++) {
          d[b + s * 4 + 1] = h.hints[s];
          d[b + s * 4 + 3] = 0;
        }
      }
    } else {
      this.srcFirst.fill(0);
      this.srcCount.fill(0);
      const d = st.data;
      for (let c = 0; c < n; c++) {
        const b = this.idxBase[c] * 4;
        const tig = inkTign ? inkTign[c] : null;
        for (let s = 0; s < this.chains[c].nCtrl; s++) {
          d[b + s * 4 + 1] = -1;
          d[b + s * 4 + 3] = tig ? tig[s] : 0;
        }
      }
    }
    for (let c = 0; c < n; c++) this.writeHeader(c);
    st.markDirty(0, this.idxEnd);
    st.flush();
  }

  // A chain's reveal window [first start, last finish] (anim seconds).
  revealSpan(c: number): [number, number] {
    return [this.span[2 * c], this.span[2 * c + 1]];
  }
}
