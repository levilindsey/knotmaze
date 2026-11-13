// K1362 c1: rp=gf's per-frame table build, as one pure function of a gathered
// input (`gatherSceneInputLean`): the lean scene (`buildFieldSceneLean`, the
// export's scene without its diag) and `buildTables`. The gf build worker
// (gf_worker.ts) runs it off main; gf_app.ts runs the same function in-thread
// when there is no worker (or `__knotGfOpts.worker === false`), so both give
// the same tables for the same input.
import { buildFieldSceneLean, type SceneExportInput } from "../field/scene_export";
import { buildTables, type GfTables } from "./tables";

/** The ctrl-arc the tables' depth window scales by (gf_app.ts's since s2). */
export const CTRL_ARC = 0.47;

export interface GfBuilt {
  T: GfTables;
  exportMs: number;
  tablesMs: number;
}

const now = (): number => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function gfBuild(input: SceneExportInput, aa: number): GfBuilt {
  const t0 = now();
  const scene = buildFieldSceneLean(input);
  scene.look.ctrlArc ??= CTRL_ARC;
  const t1 = now();
  const T = buildTables(scene, { aa });
  const t2 = now();
  return { T, exportMs: t1 - t0, tablesMs: t2 - t1 };
}

/** The distinct buffers under the tables' typed arrays (a transfer list). */
export function tablesTransfer(T: GfTables): ArrayBuffer[] {
  const out = new Set<ArrayBuffer>();
  for (const v of Object.values(T)) {
    if (ArrayBuffer.isView(v) && v.buffer instanceof ArrayBuffer) out.add(v.buffer);
  }
  return [...out];
}

/** Every typed array field of two table sets compared bit for bit (and the
 * scalars), `ms` aside: the field names that differ. */
export function tablesDiff(a: GfTables, b: GfTables): string[] {
  const bad: string[] = [];
  for (const k of Object.keys(a) as (keyof GfTables)[]) {
    if (k === "ms") continue;
    const x = a[k] as unknown;
    const y = b[k] as unknown;
    if (ArrayBuffer.isView(x) && ArrayBuffer.isView(y)) {
      const u = new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
      const v = new Uint8Array(y.buffer, y.byteOffset, y.byteLength);
      let same = u.length === v.length && x.constructor === y.constructor;
      for (let i = 0; same && i < u.length; i++) if (u[i] !== v[i]) same = false;
      if (!same) bad.push(k);
    } else if (!Object.is(x, y)) bad.push(k);
  }
  return bad;
}
