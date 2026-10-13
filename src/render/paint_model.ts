// G2 SHADER PAINT - the pixi glue: the three page-lifetime data textures
// and the shared uniform group the GLSL library (paint_glsl.ts) reads, and
// the per-scene PaintScene that lays them out and writes them. The CPU
// mirror (paint_math.ts) reads the very same Float32Array mirrors.
//
// Lifetime: the textures and the uniform group are PAGE singletons, never
// destroyed (pixi's retained render state can reference a source the frame
// after a rebuild - the PALETTE_CACHE lore); a new scene rewrites them in
// place and grows them with ensure().

import { UniformGroup } from "pixi.js";
import { FloatRows, ROW_W } from "./float_rows";
import type { KData } from "./paint_math";
import { writeChainHeader, writeGeomTable } from "./paint_math";

let K_STATIC: FloatRows | null = null;
let K_GEOM: FloatRows | null = null;
let K_PAINT: FloatRows | null = null;
export function kStatic(): FloatRows {
  if (!K_STATIC) K_STATIC = new FloatRows(ROW_W, 4);
  return K_STATIC;
}
export function kGeom(): FloatRows {
  if (!K_GEOM) K_GEOM = new FloatRows(ROW_W, 2);
  return K_GEOM;
}
export function kPaint(): FloatRows {
  if (!K_PAINT) K_PAINT = new FloatRows(ROW_W, 1);
  return K_PAINT;
}

// The uniform VALUES (shared with the mirror: paint_math reads the same
// Float32Arrays the group uploads).
export interface KnotUniformValues {
  uKBase: Float32Array; // (runBase, srcBase, debugView, paletteMode)
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
    });
  }
  return K_UNIFORMS;
}
export function knotUniformValues(): KnotUniformValues {
  return knotUniforms().uniforms as unknown as KnotUniformValues;
}

// Every texture's current mirror (re-read after any ensure()).
export function kData(): KData {
  return { stat: kStatic().data, geom: kGeom().data, paint: kPaint().data };
}

export interface PaintChainInfo {
  nCtrl: number; // Physics chain length (control slots).
  closed: boolean;
  count: number; // Ribbon sample count.
}

// Per-scene layout of the data textures. Regions start on row boundaries
// so an event rewrites (and uploads) only its own rows.
export class PaintScene {
  readonly chains: PaintChainInfo[];
  // KSTATIC: CHAINS at texel 0, then the ctrl index (one texel per control
  // slot per chain).
  readonly idxBase: Int32Array;
  readonly idxEnd: number;
  // KGEOM: per chain, G0 + the packed control arcs.
  readonly geomBase: Int32Array;
  readonly geomEnd: number;

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

    const st = kStatic();
    st.ensure(this.idxEnd);
    const d = st.data;
    d.fill(0, 0, this.idxEnd * 4);
    for (let c = 0; c < n; c++) {
      const ch = chains[c];
      writeChainHeader(d, c, {
        nCtrl: ch.nCtrl,
        closed: ch.closed,
        count: ch.count,
        idxBase: this.idxBase[c],
        geomBase: this.geomBase[c],
        srcFirst: 0, // Reveal sources (G2.1).
        srcCount: 0,
      });
    }
    st.markDirty(0, this.idxEnd);
    st.flush();

    const ge = kGeom();
    ge.ensure(this.geomEnd);
    ge.data.fill(0, 0, this.geomEnd * 4);
    ge.markDirty(0, this.geomEnd);
    ge.flush();
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
}
