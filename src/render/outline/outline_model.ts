// K1240 S4: the redesign's per-scene state and per-frame update, as the
// prototype runs them (no GL; Node-testable).
//
// Structure (once per diagram): the diagram (outline.structure), the fill's
// triangles (fill_tri.fillStructure at the first frame's resolution) and the
// paint's vertex runs and provoking copies (draw.paintData).
// Frame (whenever positions move): the outline table (outline.frame), the
// fill's positions, keys, slot weights and s (fill_tri.fillFrame ->
// draw.paintFrame, with the section runs' spans on this frame), and the
// border band (band_gpu.bandGpu: one quad per border segment and the tables
// its fragment shader reads for the tie alpha; rebuilt, its vertex count
// follows the pieces). draw.bandData, the prototype's per-vertex band, is
// what test/render/outline_port.test.ts pins; band_gpu.test.ts ties the two.
// The first frame equals the prototype's page (buildOutline +
// buildDrawData(..., "app")); test/render/outline_port.test.ts pins it.
import { OB_DI, alignJunctionArms, frame, structure, type DiagramStructure, type OutlineTable, type SceneIn } from "./outline";
import { SLOTS, fillFrame, fillResolution, fillStructure, keyScale, recStrips, type FillFrame, type FillStructure, type StripItem } from "./fill_tri";
import { baseHueFor, paintData, paintFrame, zChains, type PaintData } from "./draw";
import { bandGpu, type BandGpu } from "./band_gpu";
import { BandRecState } from "./band_rec";
import { sectionPaint } from "./paint";

/** What fixes the structure: chains (id, closed), crossings (chains, over)
 *  and junction arms. A change means a new diagram (restructure).
 *  A junction's arms count in CYCLIC order: the scene lists them by angle
 *  from a fixed direction, so an arm swinging past it rotates the list
 *  (K1240 S4b: all 8 restructures of a def load were such rotations), and
 *  frame() already reads a rotated list by arm identity
 *  (outline.alignJunctionArms, K1247 s17). The key takes each list from
 *  its least token. */
export function diagramKey(scene: SceneIn): string {
  const p: string[] = [];
  for (const c of scene.chains) p.push(`${c.id}${c.closed ? "c" : "o"}`);
  p.push("|");
  for (const x of scene.crossings) p.push(`${x.a.chain}.${x.b.chain}${x.over}`);
  p.push("|");
  for (const j of scene.junctions) {
    const t = j.arms.map((a) => `${a.chain}${a.dir > 0 ? "+" : "-"}${a.kind[0]}`);
    let r = 0;
    for (let k = 1; k < t.length; k++) {
      for (let i = 0; i < t.length; i++) {
        const a = t[(k + i) % t.length]; const b = t[(r + i) % t.length];
        if (a !== b) { if (a < b) r = k; break; }
      }
    }
    p.push(`${j.id}:${t.map((_, i) => t[(r + i) % t.length]).join(",")}`);
  }
  return p.join(" ");
}

export class OutlineModel {
  readonly key: string;
  readonly st: DiagramStructure;
  readonly fs: FillStructure;
  readonly pd: PaintData;
  readonly baseHue: number;
  /** Every fill key lies in [-ks, ks] (the depth mapping). */
  readonly ks: number;
  table: OutlineTable;
  band: BandGpu;
  /** Wall ms of the last structure and the last frame (performance.now). */
  readonly structureMs: number;
  /** K1247 s21: the structure's parts, wall ms in the constructor's order. */
  readonly structureParts: Record<string, number>;
  frameMs = 0;
  /** K1247 s19 (look.fillRec 2, oe=1): the record layout (null otherwise) and this frame's strip table. */
  readonly rec: RecLayout | null;
  recFrame: FillFrame["rec"] | null = null;
  /** Wall ms of the last frame's parts, in update's order (K1240 S4b). */
  parts = { frame: 0, zChains: 0, fill: 0, paint: 0, band: 0 };
  /** K1247 s22 (look.bandRec 1, ob=1): the band's fixed layout across frames (null: today's bandGpu). */
  readonly bandRec: BandRecState | null = null;
  /** K1247 s22: frames whose records failed and fell back to bandGpu (a piece without a key). */
  bandRecFallbacks = 0;

  private bandOf(scene: SceneIn, zz: ReturnType<typeof zChains>): BandGpu {
    if (this.bandRec) {
      try { return this.bandRec.band(this.st, this.table, scene, zz); } catch { this.bandRecFallbacks++; }
    }
    return bandGpu(this.table, scene, zz);
  }

  constructor(scene: SceneIn) {
    const t0 = performance.now();
    const P: Record<string, number> = {}; let tl = t0;
    const lap = (k: string): void => { const n = performance.now(); P[k] = n - tl; tl = n; };
    this.key = diagramKey(scene);
    this.baseHue = baseHueFor(scene.name);
    this.st = structure(scene); lap("structure");
    this.bandRec = (scene.look as { bandRec?: number }).bandRec === 1 ? new BandRecState() : null;
    OB_DI.on = this.bandRec !== null;
    this.table = frame(this.st, scene); lap("frame");
    this.fs = fillStructure(this.st, fillResolution(this.st, this.table)); lap("fillStructure");
    const zz = zChains(scene); lap("zChains");
    // K1247 s19: with the records on the GPU (fillRec 2) the structure's paint is built from frame 0
    // placed whole on the CPU, then reordered (recLayout). K1247 s21: one fill, fillRec 3 (fillRec 2's
    // frame and table, the shader's columns placed as the shader places them), where s19/s20 ran a
    // whole-CPU fill (fillRec 1) and then fillRec 2's: the first structure's extra 200-280 ms.
    const gpu = scene.look.fillRec === 2;
    const sc1 = gpu ? { ...scene, look: { ...scene.look, fillRec: 3 } } : scene;
    const fr = fillFrame(this.fs, this.st, this.table, sc1, zz); lap("fill");
    this.pd = paintData(this.fs, this.st, fr, sc1, "app", this.baseHue); lap("paintData");
    this.rec = gpu ? recLayout(this.fs, this.pd) : null; lap("recLayout");
    if (gpu) this.recFrame = fr.rec ?? null;
    this.band = this.bandOf(scene, zz); lap("band");
    this.ks = keyScale(scene);
    this.structureMs = performance.now() - t0;
    this.structureParts = P;
  }

  /** A new frame of the same diagram (positions moved). */
  update(scene0: SceneIn): void {
    const t0 = performance.now();
    // Every part reads the junctions in the structure's arm order.
    const scene = alignJunctionArms(this.st, scene0);
    OB_DI.on = this.bandRec !== null;
    this.table = frame(this.st, scene);
    const t1 = performance.now();
    const zz = zChains(scene);
    const t2 = performance.now();
    const fr = fillFrame(this.fs, this.st, this.table, scene, zz);
    const t3 = performance.now();
    paintFrame(this.pd, fr, sectionPaint(scene, "app", this.baseHue), this.rec ? this.rec.nDyn : undefined);
    this.recFrame = fr.rec ?? null;
    const t4 = performance.now();
    this.band = this.bandOf(scene, zz);
    const t5 = performance.now();
    this.parts = { frame: t1 - t0, zChains: t2 - t1, fill: t3 - t2, paint: t4 - t3, band: t5 - t4 };
    this.frameMs = t5 - t0;
  }
}

/** K1247 s19 (oe=1): the paint vertices reordered so the ones the shader
 *  places (record strips' columns 2..N-2, copies included) sit after the
 *  nDyn the worker still writes; rec is 2 ints per paint vertex: the strip's
 *  ordinal in recStrips (-1 for a dynamic vertex), (row << 16) | column. */
export interface RecLayout { nDyn: number; rec: Int32Array; nStrips: number }

export function recLayout(fs: FillStructure, pd: PaintData): RecLayout {
  const strips = recStrips(fs);
  const tag = new Int32Array(2 * fs.nV).fill(-1);
  for (let o = 0; o < strips.length; o++) {
    const it = fs.items[strips[o]] as StripItem; const W = it.N + 1;
    for (let r = 0; r < 3; r++) for (let i = 2; i <= it.N - 2; i++) { const v = it.base + r * W + i; tag[2 * v] = o; tag[2 * v + 1] = (r << 16) | i; }
  }
  // inv[g] = the vertex's new index: the dynamic ones first, each group in its old order.
  const S0 = pd.src; const nG = S0.length; const inv = new Uint32Array(nG); let nDyn = 0;
  for (let g = 0; g < nG; g++) if (tag[2 * S0[g]] < 0) nDyn++;
  for (let g = 0, qd = 0, qr = nDyn; g < nG; g++) inv[g] = tag[2 * S0[g]] < 0 ? qd++ : qr++;
  const src = new Uint32Array(nG), run = new Int32Array(SLOTS * nG), pos = new Float32Array(2 * nG), key = new Float32Array(nG);
  const w = new Float32Array(SLOTS * nG), s = new Float32Array(SLOTS * nG), rec = new Int32Array(2 * nG);
  // K1247 s21: copied by runs of consecutive vertices (a few thousand: rows of record columns), not vertex by
  // vertex (the per-vertex loop took 70 ms of def's first structure, its arrays by property each time).
  const blk = (A: Uint32Array | Int32Array | Float32Array, D: Uint32Array | Int32Array | Float32Array, K: number, a: number, b: number, d: number): void => {
    if (b - a > 8) { D.set(A.subarray(K * a, K * b), K * d); return; }
    for (let i = K * a, j = K * d; i < K * b; i++, j++) D[j] = A[i];
  };
  const P0 = pd.pos, K0 = pd.key, R0 = pd.run, W0 = pd.w, Q0 = pd.s;
  for (let a = 0; a < nG;) {
    const dyn = tag[2 * S0[a]] < 0; let b = a + 1;
    while (b < nG && (tag[2 * S0[b]] < 0) === dyn) b++;
    const d = inv[a];
    blk(S0, src, 1, a, b, d); blk(P0, pos, 2, a, b, d); blk(K0, key, 1, a, b, d);
    blk(R0, run, SLOTS, a, b, d); blk(W0, w, SLOTS, a, b, d); blk(Q0, s, SLOTS, a, b, d);
    a = b;
  }
  for (let n = 0; n < nDyn; n++) rec[2 * n] = -1;
  for (let n = nDyn; n < nG; n++) { const v = src[n]; rec[2 * n] = tag[2 * v]; rec[2 * n + 1] = tag[2 * v + 1]; }
  const idx = pd.idx; for (let t = 0; t < idx.length; t++) idx[t] = inv[idx[t]];
  pd.src = src; pd.run = run; pd.pos = pos; pd.key = key; pd.w = w; pd.s = s;
  return { nDyn, rec, nStrips: strips.length };
}