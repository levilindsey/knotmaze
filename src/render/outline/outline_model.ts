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
import { alignJunctionArms, frame, structure, type DiagramStructure, type OutlineTable, type SceneIn } from "./outline";
import { fillFrame, fillResolution, fillStructure, keyScale, type FillStructure } from "./fill_tri";
import { baseHueFor, paintData, paintFrame, zChains, type PaintData } from "./draw";
import { bandGpu, type BandGpu } from "./band_gpu";
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
  frameMs = 0;
  /** Wall ms of the last frame's parts, in update's order (K1240 S4b). */
  parts = { frame: 0, zChains: 0, fill: 0, paint: 0, band: 0 };

  constructor(scene: SceneIn) {
    const t0 = performance.now();
    this.key = diagramKey(scene);
    this.baseHue = baseHueFor(scene.name);
    this.st = structure(scene);
    this.table = frame(this.st, scene);
    this.fs = fillStructure(this.st, fillResolution(this.st, this.table));
    const zz = zChains(scene);
    const fr = fillFrame(this.fs, this.st, this.table, scene, zz);
    this.pd = paintData(this.fs, this.st, fr, scene, "app", this.baseHue);
    this.band = bandGpu(this.table, scene, zz);
    this.ks = keyScale(scene);
    this.structureMs = performance.now() - t0;
  }

  /** A new frame of the same diagram (positions moved). */
  update(scene0: SceneIn): void {
    const t0 = performance.now();
    // Every part reads the junctions in the structure's arm order.
    const scene = alignJunctionArms(this.st, scene0);
    this.table = frame(this.st, scene);
    const t1 = performance.now();
    const zz = zChains(scene);
    const t2 = performance.now();
    const fr = fillFrame(this.fs, this.st, this.table, scene, zz);
    const t3 = performance.now();
    paintFrame(this.pd, fr, sectionPaint(scene, "app", this.baseHue));
    const t4 = performance.now();
    this.band = bandGpu(this.table, scene, zz);
    const t5 = performance.now();
    this.parts = { frame: t1 - t0, zChains: t2 - t1, fill: t3 - t2, paint: t4 - t3, band: t5 - t4 };
    this.frameMs = t5 - t0;
  }
}
