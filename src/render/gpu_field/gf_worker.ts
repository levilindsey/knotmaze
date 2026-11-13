// K1362 c1: the gf build worker. rp=gf's per-frame build (gf_build.ts: the
// lean scene and the tables) runs here, off main: gf_app.ts posts a gathered
// input `{ id, input, aa }` (the sample buffers transferred), and this posts
// back `{ id, T, exportMs, tablesMs }` (the tables' buffers transferred) or
// `{ id, error }`. One build at a time; gf_app.ts posts the next only after
// the last came back, so a build always reads the newest frame. The physics
// worker is untouched: this is a second module worker, rp=gf only.
//
// K1362 t2: this worker is the pool coordinator. It builds the lean scene,
// then splits buildTables across a small pool of slice workers
// (gf_slice_worker.ts): raw chain vertices by chain, corners by junction
// range, chunk bins by chunk range, merged in order (tables.ts) — every
// frame's tables bit-identical to a cold buildTables of the same scene.
// Until the pool is ready, if it fails, for small scenes, or with
// `pool: false` in the request, the same build runs whole here (gfBuild's
// path: buildFieldSceneLean + buildTables), so the reply is unchanged.
import type { SceneExportInput } from "../field/scene_export";
import { buildFieldSceneLean } from "../field/scene_export";
import type { FieldScene } from "../field/scene";
import { CTRL_ARC, gfBuild, tablesTransfer } from "./gf_build";
import {
  assembleGfTables,
  buildGfPrefix,
  buildTables,
  gfChunkMeta,
  mergeGfChunkBins,
  mergeGfRaw,
  partitionWeighted,
  type GfTables,
} from "./tables";

interface Req {
  id: number;
  input: SceneExportInput;
  aa: number;
  pool?: boolean;
}

interface WorkerScope {
  postMessage(msg: unknown, options?: { transfer: Transferable[] }): void;
  onmessage: ((e: MessageEvent<Req>) => void) | null;
}
const scope = self as unknown as WorkerScope;

const now = (): number => performance.now();

// --- Slice pool -------------------------------------------------------------
const hc = typeof navigator !== "undefined" ? navigator.hardwareConcurrency ?? 4 : 4;
const POOL_MAX = hc >= 16 ? 8 : hc >= 8 ? 5 : hc >= 4 ? 3 : hc >= 3 ? 2 : 0;
let poolBroken = false;
const slices: (Worker | null)[] = [];
const sliceReady: boolean[] = [];
type Waiter = { resolve: (v: never) => void; reject: (e: Error) => void };
const waiters = new Map<string, Waiter>();
const waiterKey = (kind: string, id: number, slice: number): string => `${kind}:${id}:${slice}`;

function failPool(why: string): void {
  if (poolBroken) return;
  poolBroken = true;
  for (const w of slices) {
    try { w?.terminate(); } catch { /* already gone */ }
  }
  slices.length = 0;
  const err = new Error(`gf pool failed (${why})`);
  for (const w of waiters.values()) w.reject(err);
  waiters.clear();
}

function spawnPool(): void {
  if (POOL_MAX < 2 || poolBroken || slices.length) return;
  try {
    for (let i = 0; i < POOL_MAX; i++) {
      const w = new Worker(new URL("./gf_slice_worker.ts", import.meta.url), { type: "module", name: `knot-gf-slice-${i}` });
      const idx = i;
      slices.push(w);
      sliceReady.push(false);
      w.onmessage = (e: MessageEvent<{ hello?: boolean; kind?: string; id?: number; error?: string }>) => {
        const d = e.data;
        if (d.hello) { sliceReady[idx] = true; return; }
        if (d.kind === undefined || d.id === undefined) return;
        const key = waiterKey(d.kind, d.id, idx);
        const waiter = waiters.get(key);
        if (!waiter) return;
        waiters.delete(key);
        if (d.error !== undefined) waiter.reject(new Error(d.error));
        else waiter.resolve(d as never);
      };
      w.onerror = () => failPool("slice error");
      w.onmessageerror = () => failPool("slice messageerror");
    }
  } catch {
    failPool("spawn");
  }
}

function ask<T>(slice: number, msg: unknown, transfer?: Transferable[]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const w = slices[slice];
    if (!w || poolBroken) { reject(new Error("no slice")); return; }
    const m = msg as { kind: string; id: number };
    waiters.set(waiterKey(m.kind, m.id, slice), { resolve: resolve as (v: never) => void, reject });
    try {
      if (transfer) w.postMessage(msg, { transfer });
      else w.postMessage(msg);
    } catch (err) {
      waiters.delete(waiterKey(m.kind, m.id, slice));
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

interface RawReply { blocks: { ci: number; vx: Float64Array; vy: Float64Array; vs: Float64Array }[] }
interface SolveReply { K: import("./tables").GfCorner[]; cellChN: Int32Array; cellChList: Int32Array }

/** The pooled build: same tables as buildTables(scene), split across the
 * ready slices. Throws on any pool failure; the caller falls back. */
async function pooledBuild(id: number, scene: FieldScene, aa: number, n: number): Promise<{ T: GfTables; cornersMs: number }> {
  const chainRanges = partitionWeighted(scene.chains.map((c) => c.pts.length >> 1), n);
  const rawReplies = await Promise.all(chainRanges.map((range, s) => {
    const chains = [];
    const transfer: Transferable[] = [];
    for (let ci = range[0]; ci < range[1]; ci++) {
      const pts = Float64Array.from(scene.chains[ci].pts);
      chains.push({ ci, pts, closed: scene.chains[ci].closed });
      transfer.push(pts.buffer);
    }
    return ask<RawReply>(s, { kind: "raw", id, chains }, transfer);
  }));
  const blocks: { vx: Float64Array; vy: Float64Array; vs: Float64Array }[] = new Array(scene.chains.length);
  for (const r of rawReplies) for (const b of r.blocks) blocks[b.ci] = b;
  const P = buildGfPrefix(scene, { aa }, mergeGfRaw(scene, blocks));
  const meta = gfChunkMeta(P);
  const jRanges = partitionWeighted(scene.junctions.map((J) => J.arms.length), n);
  const qRanges = partitionWeighted(new Array(meta.nCh).fill(1), n);
  // Pad to n assignments with empty tail ranges, so a slice with no
  // junctions (fat: none at all) still bins its chunk range, in order.
  const pad = (ranges: [number, number][], total: number): [number, number][] => {
    const out = ranges.slice();
    while (out.length < n) out.push([total, total]);
    return out;
  };
  const jPad = pad(jRanges, scene.junctions.length);
  const qPad = pad(qRanges, meta.nCh);
  const tc0 = now();
  const solveReplies = await Promise.all(jPad.map((jr, s) => {
    const qr = qPad[s];
    // Trimmed slice prefix: only this range's arms/junctions (the cold
    // prefix clone measured ~1.8 ms per slice), the big vertex arrays as
    // transferred copies. The slice's solve is bit-identical (tables.ts).
    const vx = P.vx.slice(); const vy = P.vy.slice(); const vs = P.vs.slice();
    const chBox = meta.chBox.slice();
    const P2 = {
      ...P,
      vx, vy, vs,
      arms: P.arms.filter((A) => A.j >= jr[0] && A.j < jr[1]),
      junctions: P.junctions.slice(jr[0], jr[1]),
      jGroup: P.jGroup.slice(jr[0], jr[1]),
      jBase: jr[0],
    };
    const meta2 = { nCh: meta.nCh, chV0: new Int32Array(0), chN: new Int32Array(0), chC: new Int32Array(0), chBox, gx0: meta.gx0, gy0: meta.gy0, G: meta.G, gW: meta.gW, gH: meta.gH };
    return ask<SolveReply>(s, { kind: "solve", id, P: P2, meta: meta2, jLo: 0, jHi: jr[1] - jr[0], qLo: qr[0], qHi: qr[1] }, [vx.buffer as ArrayBuffer, vy.buffer as ArrayBuffer, vs.buffer as ArrayBuffer, chBox.buffer as ArrayBuffer]);
  }));
  const cornersMs = now() - tc0;
  let K: import("./tables").GfCorner[] = [];
  for (const r of solveReplies) K = K.concat(r.K);
  const bins = mergeGfChunkBins(solveReplies.map((r) => ({ cellChN: r.cellChN, cellChList: r.cellChList })), meta.gW * meta.gH);
  const T = assembleGfTables(P, K, { meta, bins }, { vtx: P.ms.vtx, pins: P.ms.pins, arms: P.ms.arms, corners: cornersMs }, now());
  return { T, cornersMs };
}

// --- Requests ---------------------------------------------------------------
let busy = false;
const queued: Req[] = [];

async function run(req: Req): Promise<void> {
  const { id, input, aa } = req;
  const t0 = now();
  try {
    const ready = sliceReady.filter(Boolean).length;
    const usePool = req.pool !== false && !poolBroken && ready >= 2;
    if (!usePool) {
      const r = gfBuild(input, aa);
      scope.postMessage(
        { id, T: r.T, exportMs: r.exportMs, tablesMs: r.tablesMs, workMs: now() - t0, pool: 0 },
        { transfer: tablesTransfer(r.T) }
      );
      return;
    }
    const te0 = now();
    const scene = buildFieldSceneLean(input);
    scene.look.ctrlArc ??= CTRL_ARC;
    const exportMs = now() - te0;
    let totalPts = 0;
    for (const c of scene.chains) totalPts += c.pts.length >> 1;
    // Measured (k1362t2 bench): the pool wins where the build is vertex/bin
    // bound (no junctions: fat), and loses where corners dominate, because
    // the coordinator's serial prefix + merge floor exceeds the corner
    // slice saving. Pool only the scenes it speeds up; the rest keep the
    // single build, so no scene gets slower.
    if (totalPts < 6000 || scene.junctions.length > 0) {
      const tt0 = now();
      const T = buildTables(scene, { aa });
      scope.postMessage(
        { id, T, exportMs, tablesMs: now() - tt0, workMs: now() - t0, pool: 0 },
        { transfer: tablesTransfer(T) }
      );
      return;
    }
    const n = Math.min(ready, POOL_MAX);
    const { T } = await pooledBuild(id, scene, aa, n);
    const workMs = now() - t0;
    scope.postMessage(
      { id, T, exportMs, tablesMs: Math.max(0, workMs - exportMs), workMs, pool: n },
      { transfer: tablesTransfer(T) }
    );
  } catch (err) {
    if (poolBroken || err instanceof Error) {
      // Pool failed mid-build: the same build, whole, here.
      try {
        const r = gfBuild(input, aa);
        scope.postMessage(
          { id, T: r.T, exportMs: r.exportMs, tablesMs: r.tablesMs, workMs: now() - t0, pool: 0 },
          { transfer: tablesTransfer(r.T) }
        );
        return;
      } catch { /* fall through to the error reply */ }
    }
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
}

function pump(): void {
  if (busy) return;
  const req = queued.shift();
  if (!req) return;
  busy = true;
  void run(req).finally(() => { busy = false; pump(); });
}

scope.onmessage = (e: MessageEvent<Req>): void => {
  queued.push(e.data);
  pump();
};
spawnPool();
scope.postMessage({ hello: true });
