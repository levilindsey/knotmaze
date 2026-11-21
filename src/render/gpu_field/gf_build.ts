// K1362 c1: rp=gf's per-frame table build, as one pure function of a gathered
// input (`gatherSceneInputLean`): the lean scene (`buildFieldSceneLean`, the
// export's scene without its diag) and `buildTables`. The gf build worker
// (gf_worker.ts) runs it off main; gf_app.ts runs the same function in-thread
// when there is no worker (or `__knotGfOpts.worker === false`), so both give
// the same tables for the same input.
import { buildFieldSceneLean, type SceneExportInput } from "../field/scene_export";
import { buildKeys, keysTransfer, type GfKeys } from "./gf_keys";
import { buildTables, withHome, type GfTables } from "./tables";

/** The ctrl-arc the tables' depth window scales by (gf_app.ts's since s2). */
export const CTRL_ARC = 0.47;

// K1369 s4: the builds in flight BY GESTURE: GF_DEPTH_IDLE while no thread
// is grabbed (the intros: on the Pixel, depth 2 installs 51-54 builds a
// second with the physics within noise of today's), GF_DEPTH_DRAG while one
// is (depth 2 there costs the physics a third of its sim/wall: it waits for
// a core). An A/B's fixed `depth` wins; `gesture: false` is stage 3's one
// depth (GF_DEPTH_DRAG throughout).
// K1383 s1 tried depth 1 outside the reveal too (K1393: depth 2 costs intro-i
// 0.03-0.07 of sim/wall). On the Pixel that cut intro-i to 19.5 builds a
// second (show 50 ms) at sim/wall .87-.91, against depth 2's 50-54 at .81
// (today's look: 17.8 fps at .84, K1369 s4): below the 30-a-second target
// for .06-.09 of physics, so the rule stays by gesture alone.
export const GF_DEPTH_IDLE = 2;
export const GF_DEPTH_DRAG = 1;
export function gfDepth(o: { depth?: number; gesture?: boolean }, grabbed: boolean): number {
  if (o.depth !== undefined) return Math.max(1, Math.floor(o.depth));
  if (o.gesture === false || grabbed) return GF_DEPTH_DRAG;
  return GF_DEPTH_IDLE;
}

/** K1395 (24D): whether the look (K1389) draws this frame: also while the appearance reveal runs (K1404's hold-off, superseded: the look now carries the reveal's colours, gf_look.ts GfFxTable, and the border interior fills while the FX live).
 * K1404's reason (the border stroke sub-pixel at fabric scales, its interior clear) is answered
 * by the FX interior; an A/B's look: false wins at all times. (The K1383 sheet at 03102199 is
 * the pre-K1404 reference.) The `revealing` argument stays for the call site's shape.
 */
export function gfLookDraws(lookOpt: boolean | undefined, revealing: boolean): boolean {
  void revealing;
  return lookOpt !== false;
}

/** K1375: the worker's key finish for built tables: the home variant applied, then its keys. */
export function gfKeysFor(T0: GfTables, home?: boolean): { T: GfTables; K: GfKeys } {
  const T = home ? withHome(T0, true) : T0;
  return { T, K: buildKeys(T) };
}

export interface GfBuilt {
  T: GfTables;
  K: GfKeys;
  exportMs: number;
  tablesMs: number;
  keysMs: number;
}

const now = (): number => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** K1482 s23: kRetry, the corner retry (the page passes it with `gfh=1` unless `gfk=0`; undefined = tables.ts GF_KRETRY). */
export function gfBuild(input: SceneExportInput, aa: number, kRetry?: boolean, home?: boolean): GfBuilt {
  const t0 = now();
  const scene = buildFieldSceneLean(input);
  scene.look.ctrlArc ??= CTRL_ARC;
  const t1 = now();
  const { T, K } = gfKeysFor(buildTables(scene, { aa, kRetry }), home);
  const t2 = now();
  const t3 = now();
  return { T, K, exportMs: t1 - t0, tablesMs: t2 - t1, keysMs: t3 - t2 };
}

/** The distinct buffers under the tables' typed arrays (a transfer list). */
export function tablesTransfer(T: GfTables): ArrayBuffer[] {
  const out = new Set<ArrayBuffer>();
  for (const v of Object.values(T)) {
    if (ArrayBuffer.isView(v) && v.buffer instanceof ArrayBuffer) out.add(v.buffer);
  }
  return [...out];
}

/** K1375: the tables' and keys' buffers together, each once. */
export function builtTransfer(T: GfTables, K: GfKeys): ArrayBuffer[] {
  return [...new Set([...tablesTransfer(T), ...keysTransfer(K)])];
}

export { keysTransfer } from "./gf_keys";

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
