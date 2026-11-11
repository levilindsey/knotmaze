// K1240 S4: the redesign's per-scene state and per-frame update, as the
// prototype runs them (no GL; Node-testable).
//
// Structure (once per diagram): the diagram (outline.structure), the fill's
// triangles (fill_tri.fillStructure at the first frame's resolution) and the
// paint's vertex runs and provoking copies (draw.paintData).
// Frame (whenever positions move): the outline table (outline.frame), the
// fill's positions, keys, slot weights and s (fill_tri.fillFrame ->
// draw.paintFrame, with the section runs' spans on this frame), and the
// border band (draw.bandData, rebuilt: its vertex count follows the pieces).
// The first frame equals the prototype's page (buildOutline +
// buildDrawData(..., "app")); test/render/outline_port.test.ts pins it.
import { frame, structure, type DiagramStructure, type OutlineTable, type SceneIn } from "./outline";
import { fillFrame, fillResolution, fillStructure, keyScale, type FillStructure } from "./fill_tri";
import { bandData, baseHueFor, paintData, paintFrame, zChains, type BandData, type PaintData } from "./draw";
import { sectionPaint } from "./paint";

/** What fixes the structure: chains (id, closed), crossings (chains, over)
 *  and junction arms. A change means a new diagram (restructure). */
export function diagramKey(scene: SceneIn): string {
  const p: string[] = [];
  for (const c of scene.chains) p.push(`${c.id}${c.closed ? "c" : "o"}`);
  p.push("|");
  for (const x of scene.crossings) p.push(`${x.a.chain}.${x.b.chain}${x.over}`);
  p.push("|");
  for (const j of scene.junctions) p.push(`${j.id}:${j.arms.map((a) => `${a.chain}${a.dir > 0 ? "+" : "-"}${a.kind[0]}`).join(",")}`);
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
  band: BandData;
  /** Wall ms of the last structure and the last frame (performance.now). */
  readonly structureMs: number;
  frameMs = 0;

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
    this.band = bandData(this.table, scene, zz);
    this.ks = keyScale(scene);
    this.structureMs = performance.now() - t0;
  }

  /** A new frame of the same diagram (positions moved). */
  update(scene: SceneIn): void {
    const t0 = performance.now();
    this.table = frame(this.st, scene);
    const zz = zChains(scene);
    const fr = fillFrame(this.fs, this.st, this.table, scene, zz);
    paintFrame(this.pd, fr, sectionPaint(scene, "app", this.baseHue));
    this.band = bandData(this.table, scene, zz);
    this.frameMs = performance.now() - t0;
  }
}
