// K1362 c1: the gf build worker. rp=gf's per-frame build (gf_build.ts: the
// lean scene and the tables) runs here, off main: gf_app.ts posts a gathered
// input `{ id, input, aa }` (the sample buffers transferred), and this posts
// back `{ id, T, exportMs, tablesMs }` (the tables' buffers transferred) or
// `{ id, error }`. One build at a time; gf_app.ts posts the next only after
// the last came back, so a build always reads the newest frame. The physics
// worker is untouched: this is a second module worker, rp=gf only.
//
// K1362 t2: this worker is the pool coordinator. It builds the lean scene,
// computes the raw vertices and the prefix here, then splits the rest of
// buildTables across a small pool of slice workers (gf_slice_worker.ts):
// arms and corners by junction range, chunk bins by chunk range, merged
// in order (tables.ts) — every frame's tables bit-identical to a cold
// buildTables of the same scene. Until the pool is ready, if it fails, for
// small scenes, or with `pool: false` in the request, the same build
// runs whole here (gfBuild's path: buildFieldSceneLean + buildTables), so
// the reply is unchanged. K1374 (23F): the pool also takes junction
// builds: since 23C the corner solve (exact V + closed-form growth) is
// the build's dominant cost and slices win it (see run()).
//
// K1369 s4: THE SNAPSHOT CHANNEL. `{ chan: "open" }` hands this worker a
// MessagePort whose other end the PHYSICS worker holds (worker_host.ts
// gfPort): its snapshots land here, in a mirror of the scene's particles
// (mirror_system.ts), and when this worker is free it samples the splines as
// the renderer does (the same controls, sampleClosed/OpenSpline and the
// tuck), gathers the lean input from them (field/lean_input.ts, the code
// main's gather runs) and builds, all off main. The reply also carries the
// samples, which main installs as the renderer's chainSamples (markers,
// yarn, fog read them), so nothing samples twice. Credit: at most `depth`
// replies main has not consumed (its acks carry the count consumed).
import type { ExportChain, ExportCrossing, SceneExportInput } from "../field/scene_export";
import { buildFieldSceneLean } from "../field/scene_export";
import type { FieldScene } from "../field/scene";
import { assembleLeanInput, exportChain, exportPass, slotEmergent, type LeanSkeleton } from "../field/lean_input";
import { tuckClamp, tuckTrim } from "../ribbon/sampling";
import { sampleClosedSpline, sampleOpenSpline, splineBend, type SplineSamples } from "../../geometry/spline_generator";
import { MirrorSystem } from "../../physics/mirror_system";
import { readSnapshot } from "../../physics/snapshot";
import type { TangleGraph } from "../../core/types";
import { CTRL_ARC, gfBuild, tablesTransfer } from "./gf_build";
import {
  assembleGfTables,
  buildGfPrefix,
  buildTables,
  gfArmTable,
  gfChunkMeta,
  gfRawChain,
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
  /** K1482 s23: the corner retry (`gfh=1` without `gfk=0`); absent = off. */
  kr?: boolean;
  // K1369 s4: a channel build's extra reply fields and their transfers.
  extra?: { msg: Record<string, unknown>; transfer: Transferable[] };
}

interface ChanOpen {
  chan: "open";
  cid: number;
  port: MessagePort;
  gen: number;
  graph: TangleGraph;
  skel: LeanSkeleton;
  passCounts: number[];
  threadWidth: number;
  aa: number;
  pool: boolean;
  depth: number;
  kr?: boolean; // K1482 s23
}
type ChanMsg =
  | ChanOpen
  | { chan: "skel"; skel: LeanSkeleton; aa: number }
  | { chan: "ack"; done: number; depth: number }
  | { chan: "close" };

interface WorkerScope {
  postMessage(msg: unknown, options?: { transfer: Transferable[] }): void;
  onmessage: ((e: MessageEvent<Req | ChanMsg>) => void) | null;
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

interface SolveReply { K: import("./tables").GfCorner[]; arms: import("./tables").GfArm[]; cellChN: Int32Array; cellChList: Int32Array }

/** The pooled build: same tables as buildTables(scene), split across the
 * ready slices. Throws on any pool failure; the caller falls back. */
async function pooledBuild(id: number, scene: FieldScene, aa: number, n: number, kRetry?: boolean): Promise<{ T: GfTables; cornersMs: number }> {
  // Raw vertices on the coordinator: gfRawChain over 24k points is ~1 ms,
  // cheaper than a pool round trip that copies every chain's points to a
  // slice and back (t2's two-phase split paid that latency per build).
  const blocks: { vx: Float64Array; vy: Float64Array; vs: Float64Array }[] = new Array(scene.chains.length);
  for (let ci = 0; ci < scene.chains.length; ci++) blocks[ci] = gfRawChain(scene.chains[ci].pts, scene.chains[ci].closed);
  const P = buildGfPrefix(scene, { aa, kRetry }, mergeGfRaw(scene, blocks), true);
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
      arms: [],
      junctions: P.junctions.slice(jr[0], jr[1]),
      jGroup: P.jGroup.slice(jr[0], jr[1]),
      jBase: jr[0],
    };
    const meta2 = { nCh: meta.nCh, chV0: new Int32Array(0), chN: new Int32Array(0), chC: new Int32Array(0), chBox, gx0: meta.gx0, gy0: meta.gy0, G: meta.G, gW: meta.gW, gH: meta.gH };
    return ask<SolveReply>(s, { kind: "solve", id, P: P2, meta: meta2, jLo: 0, jHi: jr[1] - jr[0], qLo: qr[0], qHi: qr[1] }, [vx.buffer as ArrayBuffer, vy.buffer as ArrayBuffer, vs.buffer as ArrayBuffer, chBox.buffer as ArrayBuffer]);
  }));
  const cornersMs = now() - tc0;
  let K: import("./tables").GfCorner[] = [];
  let allArms: import("./tables").GfArm[] = [];
  for (const r of solveReplies) { K = K.concat(r.K); allArms = allArms.concat(r.arms); }
  const armTab = gfArmTable(P.nC, allArms);
  P.nA = armTab.nA; P.aSR = armTab.aSR; P.aDir = armTab.aDir; P.aL = armTab.aL; P.aLcut = armTab.aLcut; P.aG = armTab.aG; P.cArm0 = armTab.cArm0; P.cArmN = armTab.cArmN; P.arms = armTab.arms;
  const bins = mergeGfChunkBins(solveReplies.map((r) => ({ cellChN: r.cellChN, cellChList: r.cellChList })), meta.gW * meta.gH);
  const T = assembleGfTables(P, K, { meta, bins }, { vtx: P.ms.vtx, pins: P.ms.pins, arms: P.ms.arms, corners: cornersMs }, now());
  return { T, cornersMs };
}

// --- The snapshot channel (K1369 s4) ------------------------------------------
interface Chan {
  cid: number;
  port: MessagePort;
  gen: number;
  mirror: MirrorSystem;
  skel: LeanSkeleton;
  passCounts: number[];
  tw: number;
  aa: number;
  pool: boolean;
  depth: number;
  kr?: boolean; // K1482 s23
  posted: number;
  done: number;
  fresh: boolean;
  snaps: number;
  snapSeq: number;
  // The newest snapshot's arrival, on the shared clock (timeOrigin + now).
  snapAbs: number;
}
let ch: Chan | null = null;
const leanPoint = new Float32Array(2);
const tuckScratch = new Float32Array(4);

function closeChan(why?: string): void {
  const c = ch;
  if (!c) return;
  ch = null;
  c.port.onmessage = null;
  try { c.port.close(); } catch { /* already closed */ }
  if (why) scope.postMessage({ chan: "closed", cid: c.cid, why });
}

function openChan(m: ChanOpen): void {
  closeChan();
  let mirror: MirrorSystem;
  try {
    mirror = new MirrorSystem(m.graph);
  } catch (err) {
    try { m.port.close(); } catch { /* gone */ }
    scope.postMessage({ chan: "closed", cid: m.cid, why: `mirror (${err instanceof Error ? err.message : String(err)})` });
    return;
  }
  const c: Chan = {
    cid: m.cid, port: m.port, gen: m.gen, mirror, skel: m.skel, passCounts: m.passCounts,
    tw: m.threadWidth, aa: m.aa, pool: m.pool, depth: Math.max(1, m.depth), ...(m.kr ? { kr: true } : {}),
    posted: 0, done: 0, fresh: false, snaps: 0, snapSeq: -1, snapAbs: 0,
  };
  ch = c;
  c.port.onmessage = (e: MessageEvent<{ type?: string; gen?: number; buf?: ArrayBuffer }>) => {
    const d = e.data;
    if (ch !== c || d.type !== "snap" || !d.buf) return;
    // Another build's snapshot: its pool is not this mirror's (main drops
    // them the same way); the buffer is not given back.
    if (d.gen !== c.gen) return;
    try {
      const v = readSnapshot(d.buf);
      c.mirror.applySnapshot(v);
      c.snapSeq = v.seq;
      // The gf channel's wallAt is on the shared clock (physics_worker_core
      // gfFlush: timeOrigin + now), when the physics wrote it.
      c.snapAbs = v.wallAt;
    } catch (err) {
      closeChan(`snapshot (${err instanceof Error ? err.message : String(err)})`);
      return;
    }
    c.snaps++;
    c.port.postMessage({ type: "give", buf: d.buf }, [d.buf]);
    c.fresh = true;
    pump();
  };
}

// The renderer's sampling of the mirror's state (ribbon_renderer.ts update:
// the controls copy, the spline, the fused tips' tuck), then main's lean
// gather (scene_export_hook.ts gatherSceneInputLean) over it. diagData's x, y
// are every crossing's bindingPoint(over), as the lean update writes them.
function chanReq(): Req | null {
  const c = ch;
  if (!c || !c.fresh || c.posted - c.done >= c.depth) return null;
  c.fresh = false;
  const t0 = now();
  const m = c.mirror;
  const pos = m.positions;
  splineBend.halfWidth = c.tw / 2;
  const samples: SplineSamples[] = [];
  const chains: ExportChain[] = [];
  for (let i = 0; i < m.chains.length; i++) {
    const chain = m.chains[i];
    const controls = new Float32Array(chain.length * 2);
    for (let k = 0; k < chain.length; k++) {
      controls[k * 2] = pos[chain[k] * 2];
      controls[k * 2 + 1] = pos[chain[k] * 2 + 1];
    }
    const brk = m.chainBreakAfter[i];
    const s = brk < 0 ? sampleClosedSpline(controls, c.passCounts[i]) : sampleOpenSpline(controls, c.passCounts[i], brk);
    if (brk >= 0) {
      const [fa, fb] = c.skel.tucked[i];
      if (fa || fb) tuckClamp(s, fa, fb, tuckTrim(c.tw, s.totalLength), tuckScratch);
    }
    samples.push(s);
    chains.push(exportChain(s, chain.length, c.skel.tucked[i]));
  }
  const nx = m.crossings.length;
  const diag = new Float32Array(nx * 5);
  for (let k = 0; k < nx; k++) {
    m.bindingPoint(m.crossings[k].over, leanPoint, 0);
    diag[k * 5] = leanPoint[0];
    diag[k * 5 + 1] = leanPoint[1];
  }
  const crossings: ExportCrossing[] = m.crossings.map((x) => ({ over: exportPass(x.over), under: exportPass(x.under) }));
  const em = slotEmergent(
    m.emergentCrossings,
    (p, out, offset) => m.bindingPoint(p, out, offset),
    diag,
    c.skel.skipJointPairs,
    c.skel.joints,
    (k) => m.chains[k].length,
    (k) => m.chainBreakAfter[k] < 0
  );
  const input = assembleLeanInput(c.skel, chains, crossings, em.list);
  const transfer: Transferable[] = [];
  const out = samples.map((s) => {
    transfer.push(s.positions.buffer as ArrayBuffer, s.tangents.buffer as ArrayBuffer);
    return { count: s.count, positions: s.positions, tangents: s.tangents, totalLength: s.totalLength, controlArcLengths: s.controlArcLengths, closed: s.closed };
  });
  c.posted++;
  return {
    id: 0,
    input,
    aa: c.aa,
    pool: c.pool,
    ...(c.kr ? { kr: true } : {}),
    extra: { msg: { chan: c.cid, samples: out, snapSeq: c.snapSeq, snapAbs: c.snapAbs, gatherMs: now() - t0 }, transfer },
  };
}

function onChan(d: ChanMsg): void {
  if (d.chan === "open") openChan(d);
  else if (d.chan === "close") closeChan();
  else if (!ch) return;
  else if (d.chan === "skel") {
    // A camera or look change: build again even if the knot is still.
    ch.skel = d.skel;
    ch.aa = d.aa;
    ch.fresh = ch.snaps > 0;
  } else if (d.chan === "ack") {
    ch.done = d.done;
    ch.depth = Math.max(1, d.depth);
  }
  pump();
}

// --- Requests ---------------------------------------------------------------
let busy = false;
const queued: Req[] = [];

// A reply, with a channel build's extra fields and transfers appended.
function reply(req: Req, msg: Record<string, unknown>, transfer?: Transferable[]): void {
  if (!req.extra) {
    if (transfer) scope.postMessage(msg, { transfer });
    else scope.postMessage(msg);
    return;
  }
  scope.postMessage({ ...msg, ...req.extra.msg }, { transfer: (transfer ?? []).concat(req.extra.transfer) });
}

async function run(req: Req): Promise<void> {
  const { id, input, aa } = req;
  const kr = req.kr === true ? true : undefined; // K1482 s23: off = the build's default (GF_KRETRY)
  const t0 = now();
  try {
    const ready = sliceReady.filter(Boolean).length;
    const usePool = req.pool !== false && !poolBroken && ready >= 2;
    if (!usePool) {
      const r = gfBuild(input, aa, kr);
      reply(
        req,
        { id, T: r.T, exportMs: r.exportMs, tablesMs: r.tablesMs, workMs: now() - t0, pool: 0 },
        tablesTransfer(r.T)
      );
      return;
    }
    const te0 = now();
    const scene = buildFieldSceneLean(input);
    scene.look.ctrlArc ??= CTRL_ARC;
    const exportMs = now() - te0;
    let totalPts = 0;
    for (const c of scene.chains) totalPts += c.pts.length >> 1;
    // K1374 (23F): pool every build with >= 6000 scene points, junction
    // builds included. At t2's bench the corner solve was cheap enough
    // that the coordinator's serial prefix ate the slice gain on them
    // (def neutral, muse_hash slower); 23C's exact-V + closed-form
    // corner solve made corners dominant, and the same bench now reads
    // def 19.5 -> 11.7, fat 18.9 -> 11.7, muse_hash 12.8 -> 9.5 ms p50
    // (k1362c1_bench, pool off vs on in one session). Small builds keep
    // the single build, where the pool's round trip cannot pay.
    if (totalPts < 6000) {
      const tt0 = now();
      const T = buildTables(scene, { aa, kRetry: kr });
      reply(req, { id, T, exportMs, tablesMs: now() - tt0, workMs: now() - t0, pool: 0 }, tablesTransfer(T));
      return;
    }
    const n = Math.min(ready, POOL_MAX);
    const { T } = await pooledBuild(id, scene, aa, n, kr);
    const workMs = now() - t0;
    reply(req, { id, T, exportMs, tablesMs: Math.max(0, workMs - exportMs), workMs, pool: n }, tablesTransfer(T));
  } catch (err) {
    if (poolBroken || err instanceof Error) {
      // Pool failed mid-build: the same build, whole, here.
      try {
        const r = gfBuild(input, aa, kr);
        reply(
          req,
          { id, T: r.T, exportMs: r.exportMs, tablesMs: r.tablesMs, workMs: now() - t0, pool: 0 },
          tablesTransfer(r.T)
        );
        return;
      } catch { /* fall through to the error reply */ }
    }
    reply(req, { id, error: err instanceof Error ? err.message : String(err) });
  }
}

// Main's posted requests first; when none waits, a channel build from the
// newest snapshot (K1369 s4), gathered the moment this worker is free.
function pump(): void {
  if (busy) return;
  let req = queued.shift() ?? null;
  if (!req) {
    try {
      req = chanReq();
    } catch (err) {
      closeChan(`gather (${err instanceof Error ? err.message : String(err)})`);
      req = null;
    }
  }
  if (!req) return;
  busy = true;
  void run(req).finally(() => { busy = false; pump(); });
}

scope.onmessage = (e: MessageEvent<Req | ChanMsg>): void => {
  const d = e.data;
  if ("chan" in d) {
    onChan(d);
    return;
  }
  queued.push(d);
  pump();
};
spawnPool();
scope.postMessage({ hello: true });
