// K1362 s2: form B's look drawn per pixel on the GPU in the app, under the
// link flag `rp=gf` (frame_loop.ts's label slot). Each changed frame the
// scene export and the tables (tables.ts) are built on main, packed and
// uploaded (gf_pack.ts), and the pass (gf_pass.ts) shades the tables' grid
// into an RGBA8 target of (ink, coverage); a RenderContainer in the ribbon's
// place composites it: the fill (one colour; section colours are a later
// stage) under the ink. The ribbon's base and fillets (root children 0, 1)
// are hidden while it runs, as outline_app.ts hides them.
//
// K1362 c1: the build leaves main. A frame whose samples moved gathers a lean
// input (`gatherSceneInputLean`: copies of the sample buffers, the crossing
// and junction slots; no diag) and posts it to the gf build worker
// (gf_worker.ts), which runs `gfBuild` (gf_build.ts: the lean scene and
// `buildTables`) and transfers the tables back; the frame after they arrive
// uploads them. One build in flight; a renderer change drops the one in
// flight. The first build after a renderer change, and every build without a
// worker (none, failed, or `__knotGfOpts.worker === false`), runs the same
// `gfBuild` in-thread. `__knotGf.verify = true` also builds each frame's
// tables the old way (the full export) in-thread and compares them bit for
// bit with what the pass receives (stats.verified, stats.mismatch).
//
// Probe access: globalThis.__knotGf (stats: build, pack, upload ms on main;
// the GPU pass's timer-query ms and the empty query's; pixels shaded; and
// counts(), the probe variant's candidates per pixel at the current frame).
import { RenderContainer, type Container, type WebGLRenderer } from "pixi.js";
import { buildFieldScene, type SceneExportInput } from "../field/scene_export";
import { gatherLeanSkeleton, gatherSceneInput, gatherSceneInputLean, type SceneExportCtx } from "../field/scene_export_hook";
import { splineBend, type SplineSamples } from "../../geometry/spline_generator";
import { buildTables, type GfTables } from "./tables";
import { CTRL_ARC, gfBuild, gfDepth, gfLookDraws, tablesDiff } from "./gf_build";
import { GfRevealTable, gfRevealing } from "./gf_reveal";
import { GfDynTable, GfFxTable, GfLookGate, GfLookTable, GfPaintTable, dynKey, lookFade, lookGap, lookKey, paintKey, type GfDynSource, type GfPaintSource } from "./gf_look";
import { kArcU, kWrap } from "../paint_math";
import { GfComposite, GfPass, GfTarget, type GfMap } from "./gf_pass";

interface GfReply {
  hello?: boolean;
  id?: number;
  T?: GfTables;
  exportMs?: number;
  tablesMs?: number;
  workMs?: number;
  pool?: number;
  error?: string;
  // K1369 s4: a channel build (its channel's id) and what it carries; or,
  // with `why`, the worker closed that channel.
  chan?: number | "closed";
  cid?: number;
  why?: string;
  samples?: SplineSamples[];
  snapSeq?: number;
  snapAbs?: number;
  gatherMs?: number;
}
const FILL: [number, number, number] = [0.96, 0.93, 0.86];
const INK_AUTO: [number, number, number] = [0.12, 0.11, 0.09];

export interface GfApp { frame(): void; after(): void; dispose(): void; busy(): boolean }
// K1369 s4: the builds in flight by gesture (gf_build.ts gfDepth; the
// `__knotGfOpts` knobs `depth` and `gesture` override it).
let warned = false;

export function createGfApp(ctx: SceneExportCtx, requestFrame: () => void): GfApp {
  let pass: GfPass | null = null;
  let target: GfTarget | null = null;
  let comp: GfComposite | null = null;
  let T: GfTables | null = null;
  let off = false;
  let lastR: unknown = null;
  let builtCount = -1;
  let builtScale = 0;
  let drawnKey = "";
  let dirty = true;
  let rect: [number, number, number, number] = [0, 0, 0, 0];
  let map: GfMap = [1, 0, 1, 0];
  let hidden: Container[] = [];
  // K1369 s2: the renderer whose fillet layer attach() took, and the layer.
  let filletsOff: { r: { filletLayer: Container | null }; layer: Container } | null = null;
  // K1369 s3: the renderer attach() put in lean mode.
  let leanOn: { lean: boolean } | null = null;
  let rc: RenderContainer | null = null;
  let drawn: (Float32Array | null)[] = [];
  let rvTab: GfRevealTable | null = null;
  let rvDrawn = false;
  // K1389 s1: today's thread look. s2: the static colour table, its gate and the key it was built with; the
  // installed tables' sample positions (taken when their build was gathered) and their version; spare position
  // arrays; the gap drawn
  let lkTab: GfLookTable | null = null;
  const lkGate = new GfLookGate();
  let lkKey = -1;
  let lkP: Float32Array | null = null;
  let lkPVer = 0;
  const lkPool: Float32Array[] = [];
  let lkGap = -1;
  let lkFadeV = -1;
  // K1405: the baked gold paint (gf_look.ts GfPaintTable), snapshotted like the look positions
  let ptTab: GfPaintTable | null = null;
  let ptP: Float32Array | null = null;
  let ptVer = 0;
  let ptKey = -1;
  const ptPool: Float32Array[] = [];
  // K1414 part 2 (24C): the baked pulse/telegraph geometry (gf_look.ts GfDynTable), snapshotted like the paint
  let dynTab: GfDynTable | null = null;
  let dynP: Float32Array | null = null;
  let dynVer = 0;
  let dynKeyV = -1;
  const dynPool: Float32Array[] = [];
  let teleAtU = 0;
  // K1395 (24D): the baked reveal FX (gf_look.ts GfFxTable), re-baked every revealing frame
  let fxTab: GfFxTable | null = null;
  let fxP: Float32Array | null = null;
  let fxVer = 0;
  const fxPool: Float32Array[] = [];
  const stats = {
    rebuilds: 0, passes: 0, composites: 0, fallback: "",
    exportMs: [] as number[], tablesMs: [] as number[], packMs: [] as number[], uploadMs: [] as number[],
    px: [] as number[], cpuPassMs: [] as number[],
    // K1383 s1: the reveal table's CPU build per drawn reveal frame, its knots and active chains, the reveal
    // frames drawn and the frame the reveal form was last drawn on (performance.now()).
    rvMs: [] as number[], rvKnots: [] as number[], rvActive: [] as number[], rvPasses: 0, rvLast: 0,
    // K1389 s1: the look table's CPU builds (ms) and its colour texels. s2: the hashes the gate let through, the
    // table's rows and positions, each build's positions walk and each positions upload (ms)
    lkMs: [] as number[], lkColors: 0, lkKeys: 0, lkRows: 0, lkPos: 0, lkPosMs: [] as number[], lkUpMs: [] as number[],
    // K1405: the paint table's CPU bakes per snapshot (ms)
    ptMs: [] as number[],
    // K1414 part 2 (24C): the dyn table's CPU bakes per snapshot (ms)
    dynMs: [] as number[],
    // c1: where builds ran, main's share per rebuild (gather + post, then
    // pack + upload; in-thread builds add the export and tables), the
    // worker's whole build and the post-to-arrival latency.
    worker: "none", workerBuilds: 0, threadBuilds: 0, stale: 0, pool: 0,
    gatherMs: [] as number[], mainMs: [] as number[], workMs: [] as number[], latencyMs: [] as number[],
    verified: 0, mismatch: [] as string[], verifyMs: [] as number[],
    // K1369 s2: post to install (the frame that uploads it), the replies a
    // newer one replaced before install, and the frames busy() let main skip
    // the ribbon update on. showAt: [post, install] time pairs, flat.
    showMs: [] as number[], showAt: [] as number[], superseded: 0, gated: 0,
    // K1369 s4: each worker post's depth in force (a probe's window slices it).
    postDepth: [] as number[],
    // K1369 s4, the snapshot channel: its state, opens, builds installed,
    // the gf worker's sample + gather ms per build, and the replies dropped
    // (an older channel's).
    chan: "", chanOpens: 0, chanBuilds: 0, chanGatherMs: [] as number[], chanStale: 0,
  };

  // The build worker: started on the first frame; until it says hello (and
  // after it fails) builds run in-thread.
  let worker: Worker | null = null;
  let ready = false;
  // K1369 s2: the builds in flight (id -> its generation, post time and
  // main's share), up to `depth` at once; the worker queues them in order.
  const flights = new Map<number, { gen: number; t0: number; main: number; lk: Float32Array | null; pt: Float32Array | null; dyn: Float32Array | null }>();
  let flightId = 0;
  let gen = 0;
  let pending: { T: GfTables; main: number; t0: number; samples?: SplineSamples[]; lk?: Float32Array | null; pt?: Float32Array | null; dyn?: Float32Array | null } | null = null;
  // K1369 s4: THE SNAPSHOT CHANNEL (`__knotGfOpts.chan`, off by default).
  // Once the first tables exist, gf_app asks the physics host for a port to
  // the physics worker (worker_host.ts gfPort) and hands it to the gf
  // worker, which then builds from the physics' own snapshots (gf_worker.ts)
  // and returns the samples with the tables: main skips the ribbon update
  // (busy() is true), installs both and updates the fabric overlay from the
  // installed samples. Off, back to the posted path (force), while a pluck
  // is live (it draws from the full update), with flow (a displaced copy
  // of the controls) or the bend bound on, and without a port (phw=0).
  let chanOn = false;
  let chanId = 0;
  let chanDone = 0;
  let chanDepth = 0;
  let chanKey = "";
  let chanRefused: unknown = null;
  const refs = new Map<number, GfTables>();
  let force = false;
  // Probe-only knobs (K1369 A/Bs, all off by default): `freeze` stops
  // rebuilding once tables exist (the pass keeps the last ones), `redraw`
  // draws the pass every frame even when nothing changed (the GPU's load
  // without the build's CPU). K1369 s2: `depth` is the builds in flight
  // (default DEPTH); `gate: false` keeps main's ribbon update on every frame
  // (frame_loop.ts asks busy()); `fillets: true` keeps the joinery's fan
  // rebuild, which attach() otherwise switches off (see there). K1369 s3:
  // `lean: false` keeps the renderer's full gap solve and fill extrude,
  // which attach() otherwise switches off (see there).
  type GfOpts = {
    worker?: boolean; verify?: boolean; pool?: boolean; freeze?: boolean; redraw?: boolean; cap?: number;
    depth?: number; gate?: boolean; fillets?: boolean; lean?: boolean; gesture?: boolean; chan?: boolean;
    /** K1383 s1: false draws no reveal (the pre-K1383 gf look, for A/Bs). */
    reveal?: boolean;
    /** K1389 s1: false draws the pre-K1389 look (cream fill, ink outlines) in place of today's thread look. */
    look?: boolean;
  };
  const opts = (): GfOpts => (globalThis as unknown as { __knotGfOpts?: GfOpts }).__knotGfOpts ?? {};
  // K1369 s4: by gesture (a thread grabbed or not); an A/B's `depth` wins.
  const depth = (): number => gfDepth(opts(), (ctx.scene.ps?.grabbedParticle ?? -1) >= 0);
  const verifying = (): boolean => !!api.verify || !!opts().verify;
  const wantWorker = (): boolean => typeof Worker !== "undefined" && opts().worker !== false;

  const dropWorker = (why: string): void => {
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    }
    worker = null;
    ready = false;
    flights.clear();
    chanOn = false;
    stats.worker = why;
    requestFrame();
  };

  const startWorker = (): void => {
    if (worker || stats.worker !== "none") return;
    if (!wantWorker()) {
      stats.worker = "off";
      return;
    }
    try {
      worker = new Worker(new URL("./gf_worker.ts", import.meta.url), { type: "module", name: "knot-gf-build" });
    } catch (e) {
      stats.worker = `failed (${e instanceof Error ? e.message : String(e)})`;
      return;
    }
    stats.worker = "starting";
    worker.onerror = (e) => dropWorker(`failed (onerror: ${e.message || "worker failed to load"})`);
    worker.onmessageerror = () => dropWorker("failed (messageerror)");
    worker.onmessage = (e: MessageEvent<GfReply>) => {
      const d = e.data;
      if (d.hello) {
        ready = true;
        stats.worker = "ready";
        return;
      }
      if (d.chan === "closed") {
        // The gf worker gave up the channel (a mirror or snapshot error):
        // back to posted builds, and no reopen for this renderer.
        if (chanOn && d.cid === chanId) {
          chanOn = false;
          chanRefused = lastR;
          stats.chan = `closed (${d.why ?? "worker"})`;
          force = true;
          requestFrame();
        }
        return;
      }
      if (typeof d.chan === "number") {
        if (!chanOn || d.chan !== chanId || off) {
          stats.chanStale++;
          return;
        }
        if (d.error !== undefined || !d.T || !d.samples) {
          fallback(`failed (worker channel: ${d.error ?? "no tables"})`);
          return;
        }
        stats.exportMs.push(d.exportMs ?? 0);
        stats.tablesMs.push(d.tablesMs ?? 0);
        stats.workMs.push(d.workMs ?? 0);
        stats.chanGatherMs.push(d.gatherMs ?? 0);
        stats.workerBuilds++;
        stats.pool = d.pool ?? 0;
        // A newer reply replaces a pending older one: consumed, uninstalled.
        if (pending) {
          stats.superseded++;
          if (pending.samples) chanDone++;
        }
        // t0: the snapshot's arrival at the gf worker, on main's clock.
        const t0 = d.snapAbs !== undefined ? d.snapAbs - performance.timeOrigin : performance.now();
        stats.latencyMs.push(performance.now() - t0);
        pending = { T: d.T, main: 0, t0, samples: d.samples };
        requestFrame();
        return;
      }
      const fl = d.id === undefined ? undefined : flights.get(d.id);
      if (!fl || d.id === undefined) return;
      flights.delete(d.id);
      const ref = refs.get(d.id);
      refs.delete(d.id);
      if (fl.gen !== gen || off) {
        stats.stale++;
        requestFrame();
        return;
      }
      if (d.error !== undefined || !d.T) {
        fallback(`failed (worker: ${d.error ?? "no tables"})`);
        return;
      }
      stats.exportMs.push(d.exportMs ?? 0);
      stats.tablesMs.push(d.tablesMs ?? 0);
      stats.workMs.push(d.workMs ?? 0);
      stats.latencyMs.push(performance.now() - fl.t0);
      stats.workerBuilds++;
      stats.pool = d.pool ?? 0;
      if (ref) check(d.T, ref);
      // Replies come in post order: a newer one replaces a pending older one.
      if (pending) stats.superseded++;
      pending = { T: d.T, main: fl.main, t0: fl.t0, lk: fl.lk, pt: fl.pt, dyn: fl.dyn };
      requestFrame();
    };
  };

  // The old path (s2's): the full export of the same state, in-thread.
  const reference = (aa: number): GfTables => {
    const t0 = performance.now();
    const ps = ctx.scene.ps!;
    const { input } = gatherSceneInput(
      ctx,
      { zPos: new Float64Array(ps.positions.length / 2), positions: ps.positions, simTime: 0 },
      "field",
      "field"
    );
    const { scene } = buildFieldScene(input);
    scene.look.ctrlArc ??= CTRL_ARC;
    const R = buildTables(scene, { aa });
    stats.verifyMs.push(performance.now() - t0);
    return R;
  };
  const check = (got: GfTables, ref: GfTables): void => {
    const bad = tablesDiff(got, ref);
    if (bad.length) stats.mismatch.push(`${stats.rebuilds}:${bad.join("+")}`);
    else stats.verified++;
  };

  const snapshot = (): void => {
    const ss = ctx.scene.renderer?.chainSamples ?? [];
    drawn = ss.map((s) => (s ? s.positions.slice(0, s.count * 2) : null));
  };
  const moved = (): boolean => {
    const ss = ctx.scene.renderer?.chainSamples ?? [];
    if (ss.length !== drawn.length) return true;
    for (let c = 0; c < ss.length; c++) {
      const s = ss[c];
      const d = drawn[c];
      if (!s || !d) {
        if (s !== null || d !== null) return true;
        continue;
      }
      const n = s.count * 2;
      if (n !== d.length) return true;
      const p = s.positions;
      for (let i = 0; i < n; i++) if (p[i] !== d[i]) return true;
    }
    return false;
  };

  const gl = (): WebGL2RenderingContext | null => {
    const g = (ctx.app.renderer as unknown as { gl?: unknown }).gl;
    return typeof WebGL2RenderingContext !== "undefined" && g instanceof WebGL2RenderingContext ? g : null;
  };

  const attach = (): void => {
    const r = ctx.scene.renderer;
    if (!r) return;
    detach();
    const root = r.root;
    hidden = [root.children[0], root.children[1]].filter((c): c is Container => !!c && c.visible);
    for (const c of hidden) c.visible = false;
    // K1369 s2: the fan layer (child 1) is hidden, so its rebuild (joinery
    // rebuildFillets, on every geometry change: ~7 ms of main's ~30 per
    // build on the desktop) draws nothing. A null layer is the renderer's
    // own no-fillets state (rebuildFillets returns at once); gf's tables
    // read none of what it writes (junctionCutEntries and recBaseByJn feed
    // the ribbon's RANGES and paint, jointGate the fans). detach() puts the
    // layer back and the next paint tick rebuilds it.
    if (!opts().fillets && r.filletLayer) {
      filletsOff = { r, layer: r.filletLayer };
      r.filletLayer = null;
    }
    // K1369 s3: the renderer's LEAN mode (ribbon_renderer.ts `lean`) by
    // default. Of update()'s per-crossing gap solve (~8.8 ms of a desktop
    // drag update) gf's gather reads only diagData's x, y (slottedEmergent's
    // dedupe), and it reads none of the base fill meshes (~2.5 ms), which
    // it hides; lean computes only the former and skips both. The renderer
    // runs the full solve while a pluck is live and refreshes before a pick
    // or a pluck, so a pluck looks as it does without lean. `lean: false`
    // keeps it off for A/Bs; detach() turns it off, and the next update
    // re-solves.
    if (opts().lean !== false) {
      r.lean = true;
      leanOn = r;
    }
    rc = new RenderContainer({
      render: (renderer) => {
        if (!comp || !target || off || !T) return;
        const g = comp.gl;
        if (g.getParameter(g.FRAMEBUFFER_BINDING) !== null) return;
        try {
          const bc = ctx.scene.renderer?.borderColor ?? 0;
          const ink: [number, number, number] = bc ? [((bc >> 16) & 255) / 255, ((bc >> 8) & 255) / 255, (bc & 255) / 255] : INK_AUTO;
          const lt = !!pass?.looking;
          const lr = ctx.scene.renderer;
          // K1389 s1: today's thread look (gf_look.ts): the section colours by fill / border / both
          comp.draw(target, FILL, ink, lt && lr ? { mode: lr.threadLook, bd: bc ? [ink[0], ink[1], ink[2], 1] : [0, 0, 0, 0], fx: rvDrawn } : null);
          stats.composites++;
        } finally {
          const wr = renderer as unknown as WebGLRenderer;
          wr.shader.resetState();
          wr.geometry.resetState();
          wr.texture.resetState();
          wr.state.resetState();
          wr.buffer.resetState();
        }
      },
    });
    root.addChildAt(rc, Math.min(2, root.children.length));
  };
  const detach = (): void => {
    for (const c of hidden) c.visible = true;
    hidden = [];
    if (filletsOff) {
      if (filletsOff.r.filletLayer === null) filletsOff.r.filletLayer = filletsOff.layer;
      filletsOff = null;
    }
    if (leanOn) {
      leanOn.lean = false;
      leanOn = null;
    }
    if (rc) {
      rc.parent?.removeChild(rc);
      rc.destroy();
      rc = null;
    }
  };

  const release = (): void => {
    pass?.dispose();
    pass = null;
    target?.dispose();
    target = null;
    comp?.dispose();
    comp = null;
    T = null;
    pending = null;
    gen++;
    detach();
  };

  const fallback = (why: string): void => {
    off = true;
    stats.fallback = why;
    if (!warned) {
      warned = true;
      console.warn(`K1362 gf: ${why}; rp=gf off`);
    }
    release();
    requestFrame();
  };

  // The camera: world to device pixels (field_b_app.ts's), and its inverse
  // as the pass's map from gl_FragCoord (bottom-up) to world.
  const camera = (): { a: number; d: number; e: number; f: number; w: number; h: number; scale: number } => {
    const canvas = ctx.app.canvas as HTMLCanvasElement;
    const w = canvas.width;
    const h = canvas.height;
    const sx = w / ctx.app.screen.width;
    const sy = h / ctx.app.screen.height;
    const root = ctx.root;
    return { a: root.scale.x * sx, d: root.scale.y * sy, e: root.position.x * sx, f: root.position.y * sy, w, h, scale: root.scale.x * sx };
  };

  // K1389 s2: the sample positions of this frame's state (gf_look.ts positions), into a spare array; null while the
  // look is off or its table not built. Taken when a build is gathered, so they match its samples.
  const lkSnap = (): Float32Array | null => {
    const r = ctx.scene.renderer;
    if (!r || !lkTab || lkKey < 0 || !pass?.lookable || opts().look === false) return null;
    const t0 = performance.now();
    const P = lkTab.positions(r, lkPool.pop());
    stats.lkPosMs.push(performance.now() - t0);
    return P;
  };
  // the positions to draw from now on (the old array back to the spares)
  const lkShow = (P: Float32Array | null): void => {
    if (!P) return;
    if (lkP && lkP !== P && lkPool.length < 4) lkPool.push(lkP);
    lkP = P;
    lkPVer++;
  };

  // K1405: this frame's baked gold paint (gf_look.ts GfPaintTable), into a spare array; null on
  // the same gates as lkSnap (the layout is the look positions', so it needs the look table).
  const ptSnap = (): Float32Array | null => {
    const r = ctx.scene.renderer;
    if (!r || !ptTab || lkKey < 0 || !pass?.lookable || opts().look === false) return null;
    const t0 = performance.now();
    const ps = (r as unknown as { paintState: { paintSpans: GfPaintSource["paintSpans"]; paintCaps: GfPaintSource["paintCaps"] } }).paintState;
    const src = r as unknown as GfPaintSource;
    const P = ptTab.values({ kd: src.kd, kcv: src.kcv, chainSamples: src.chainSamples, paintSpans: ps.paintSpans, paintCaps: ps.paintCaps }, ptPool.pop());
    stats.ptMs.push(performance.now() - t0);
    return P;
  };
  const ptShow = (P: Float32Array | null): void => {
    if (!P) return;
    if (ptP && ptP !== P && ptPool.length < 4) ptPool.push(ptP);
    ptP = P;
    ptVer++;
  };

  // K1414 part 2 (24C): this frame's baked pulse/telegraph geometry, into a spare array; null on
  // the same gates as ptSnap (the layout is the look positions', so it needs the look table).
  const dynSnap = (): Float32Array | null => {
    const r = ctx.scene.renderer;
    if (!r || !dynTab || lkKey < 0 || !pass?.lookable || opts().look === false) return null;
    const t0 = performance.now();
    const ps = (r as unknown as { paintState: { paintSpans: GfDynSource["paintSpans"]; paintCaps: GfDynSource["paintCaps"]; paintPulses: GfDynSource["paintPulses"]; paintTele: GfDynSource["paintTele"]; rimGap(): number } }).paintState;
    const src = r as unknown as GfDynSource;
    const P = dynTab.values({ kd: src.kd, kcv: src.kcv, chainSamples: src.chainSamples, paintSpans: ps.paintSpans, paintCaps: ps.paintCaps, paintPulses: ps.paintPulses, paintTele: ps.paintTele, teleGap: ps.rimGap() }, dynPool.pop());
    stats.dynMs.push(performance.now() - t0);
    return P;
  };
  // K1395 (24D): this frame's baked reveal FX (gf_look.ts GfFxTable), in the look positions' layout
  const fxSnap = (): Float32Array | null => {
    const r = ctx.scene.renderer;
    if (!r || !fxTab || lkKey < 0 || !pass?.lookable || opts().look === false) return null;
    const src = r as unknown as GfPaintSource;
    return fxTab.values({ kd: src.kd, kcv: src.kcv, chainSamples: src.chainSamples }, fxPool.pop());
  };
  const fxShow = (P: Float32Array | null): void => {
    if (!P) return;
    if (fxP && fxP !== P && fxPool.length < 4) fxPool.push(fxP);
    fxP = P;
    fxVer++;
  };
  const dynShow = (P: Float32Array | null): void => {
    if (!P) return;
    if (dynP && dynP !== P && dynPool.length < 4) dynPool.push(dynP);
    dynP = P;
    dynVer++;
  };
  // The riding telegraph end's arc in the baked frame (dynTab's ride frame), from the live spot ctrl.
  const dynTeleAtU = (): number => {
    const r = ctx.scene.renderer;
    if (!r || !dynTab || dynTab.rideChain < 0) return 0;
    const src = r as unknown as GfDynSource;
    const c = src.kcv[dynTab.rideChain];
    if (!c) return 0;
    const at = (r as unknown as { paintState: { teleAt: number } }).paintState.teleAt;
    const a = kArcU(src.kd, c, at);
    return dynTab.rideClosed ? dynTab.rideA0 + kWrap(a - dynTab.rideA0, dynTab.rideTotal) : a;
  };

  // Pack and upload a build's tables (main's last share of a rebuild).
  const install = (next: GfTables, mainSoFar: number, lkNext?: Float32Array | null, ptNext?: Float32Array | null, dynNext?: Float32Array | null): void => {
    const t0 = performance.now();
    T = next;
    // K1389 s2: the positions gathered with this build (else this frame's: an in-thread or channel build)
    lkShow(lkNext ?? lkSnap());
    ptShow(ptNext ?? ptSnap());
    dynShow(dynNext ?? dynSnap());
    pass!.upload(T);
    stats.packMs.push(pass!.packMs);
    stats.uploadMs.push(pass!.uploadMs);
    stats.mainMs.push(mainSoFar + performance.now() - t0);
    stats.rebuilds++;
    dirty = true;
  };

  // Gather this frame's input; build it in the worker when one is ready and
  // the tables already show something (else in-thread, now). Returns false
  // when a build is already in flight (the caller retries next frame).
  const rebuild = (scale: number): boolean => {
    const aa = 0.5 / scale;
    const useWorker = !!worker && ready && !!T;
    const d = depth();
    if (useWorker && flights.size >= d) return false;
    if (useWorker) stats.postDepth.push(d);
    const t0 = performance.now();
    const { input, transfer }: { input: SceneExportInput; transfer: ArrayBuffer[] } = gatherSceneInputLean(ctx, "field");
    if (useWorker) {
      flightId++;
      worker!.postMessage({ id: flightId, input, aa, pool: opts().pool !== false }, transfer);
      const main = performance.now() - t0;
      flights.set(flightId, { gen, t0, main, lk: lkSnap(), pt: ptSnap(), dyn: dynSnap() });
      stats.gatherMs.push(main);
      // The reference reads the same state now (outside main's share).
      if (verifying()) refs.set(flightId, reference(aa));
      return true;
    }
    const tg = performance.now() - t0;
    const r = gfBuild(input, aa);
    stats.gatherMs.push(tg);
    stats.exportMs.push(r.exportMs);
    stats.tablesMs.push(r.tablesMs);
    stats.threadBuilds++;
    const mainSoFar = performance.now() - t0;
    if (verifying()) check(r.T, reference(aa));
    install(r.T, mainSoFar);
    return true;
  };

  // K1369: `cap` (probe-only) is the Pixi ticker's maxFPS while gf runs (0 = none; restored on dispose). Pixi
  // truncates the frame delta to whole ms, so 31 keeps a 30 Hz pair of 60 Hz vsyncs (33 ms) and 30 would not.
  let capped = 0;
  const applyCap = (fps: number): void => {
    if (fps === capped) return;
    ctx.app.ticker.maxFPS = fps;
    capped = fps;
  };
  // K1369 s4: the snapshot channel's open, close, and what its skeleton
  // depends on per frame (the camera and the look; the rest is per scene).
  type Rnd = NonNullable<SceneExportCtx["scene"]["renderer"]>;
  const chanWanted = (r: Rnd): boolean =>
    !!opts().chan && !!worker && ready && !!T && chanRefused !== r &&
    r.pluckHost.plucks.activeCount === 0 && !(r.flowStrength > 0) && !splineBend.enabled &&
    // K1383 s1: closed until the reveal ends (its masks follow main's samples: the reveal table reads them)
    !gfRevealing(r);
  const skelKey = (r: Rnd, scale: number): string => {
    const root = ctx.root;
    const p = ctx.params;
    return [root.scale.x, root.position.x, root.position.y, ctx.app.screen.width, ctx.app.screen.height,
      ctx.app.renderer.resolution, scale, r.style.threadWidth, r.borderWidth, r.cornerRoundShare,
      p.cuspRadius, p.backgroundBase, p.borderColor].join(",");
  };
  const chanClose = (why: string): void => {
    if (!chanOn) return;
    chanOn = false;
    try { worker?.postMessage({ chan: "close" }); } catch { /* worker gone */ }
    stats.chan = why;
    // A pending channel build is dropped: the ribbon update's samples
    // follow from here, and the next frame builds the posted way.
    if (pending?.samples) pending = null;
    force = true;
  };
  const chanOpen = (r: Rnd, scale: number): void => {
    const host = ctx.host as unknown as { gfPort?: () => { port: MessagePort; gen: number; graph: unknown } | null };
    const h = host.gfPort?.() ?? null;
    if (!h) {
      chanRefused = r;
      stats.chan = "unavailable";
      return;
    }
    chanId++;
    try {
      worker!.postMessage({
        chan: "open", cid: chanId, port: h.port, gen: h.gen, graph: h.graph,
        skel: gatherLeanSkeleton(ctx, "field"),
        passCounts: (r as unknown as { passCounts: number[] }).passCounts.slice(),
        threadWidth: r.style.threadWidth, aa: 0.5 / scale, pool: opts().pool !== false, depth: depth(),
      }, [h.port]);
    } catch (e) {
      chanRefused = r;
      stats.chan = `failed (${e instanceof Error ? e.message : String(e)})`;
      try { h.port.close(); } catch { /* gone */ }
      return;
    }
    chanOn = true;
    chanDone = 0;
    chanDepth = depth();
    chanKey = skelKey(r, scale);
    stats.chan = "open";
    stats.chanOpens++;
  };
  const chanFrame = (r: Rnd, scale: number): void => {
    if (!opts().chan) {
      if (chanOn) chanClose("off");
      return;
    }
    const want = chanWanted(r);
    if (chanOn && !want) chanClose(gfRevealing(r) ? "closed (reveal)" : "closed (pluck, flow or bend)");
    else if (!chanOn && want) chanOpen(r, scale);
    else if (chanOn) {
      const k = skelKey(r, scale);
      if (k !== chanKey) {
        chanKey = k;
        worker!.postMessage({ chan: "skel", skel: gatherLeanSkeleton(ctx, "field"), aa: 0.5 / scale });
      }
      const d = depth();
      if (d !== chanDepth) {
        chanDepth = d;
        worker!.postMessage({ chan: "ack", done: chanDone, depth: d });
      }
    }
  };
  // The gameplay overlay follows the installed samples (frame_loop.ts runs
  // it after the ribbon update, which the channel skips).
  const fabricFollow = (): void => {
    const sc = ctx.scene as unknown as { fabric?: { update(c: unknown): void } | null; fabricController?: unknown };
    if ((ctx.params as unknown as { mazeFabric?: boolean }).mazeFabric && sc.fabric && sc.fabricController) {
      sc.fabric.update(sc.fabricController);
    }
  };

  const frame = (): void => {
    if (off) return;
    applyCap(opts().cap ?? 0);
    const r = ctx.scene.renderer;
    const ps = ctx.scene.ps;
    if (!r || !ps) return;
    // Before the renderer's first update there are no samples yet: wait
    // for them (the export throws on a chain without any; outline_app's).
    if (r.chainSamples.length < ps.chains.length || r.chainSamples.some((s) => !s)) return;
    try {
      const g = gl();
      if (!g) return fallback("no WebGL2 context");
      if (!pass) {
        pass = new GfPass(g, false);
        // K1389 s2: the look writes its colours to a second attachment
        target = new GfTarget(g, pass.lookable ? 2 : 1, false);
        comp = new GfComposite(g);
      }
      startWorker();
      if (r !== lastR) {
        lastR = r;
        builtCount = -1;
        drawn = [];
        // A build in flight read the old renderer: drop it, and build the
        // new one's first tables in-thread (no stale or empty frame).
        gen++;
        if (chanOn) chanClose("renderer changed");
        chanRefused = null;
        pending = null;
        T = null;
        attach();
      }
      if (pending) {
        const p = pending;
        pending = null;
        if (p.samples) {
          // K1369 s4: the channel build's samples become the renderer's.
          const ss = r.chainSamples;
          for (let c = 0; c < p.samples.length; c++) ss[c] = p.samples[c];
          fabricFollow();
          chanDone++;
          stats.chanBuilds++;
          worker?.postMessage({ chan: "ack", done: chanDone, depth: depth() });
        }
        install(p.T, p.main, p.lk, p.pt, p.dyn);
        const now = performance.now();
        stats.showMs.push(now - p.t0);
        stats.showAt.push(p.t0, now);
      }
      const cam = camera();
      const count = r.updateCount;
      const o = opts();
      if (o.redraw) dirty = true;
      chanFrame(r, cam.scale);
      if (chanOn) builtCount = count;
      else if (o.freeze && T && !force) builtCount = count;
      else if (force || count !== builtCount || cam.scale !== builtScale || !T) {
        if (force || !T || cam.scale !== builtScale || moved()) {
          if (rebuild(cam.scale)) {
            builtCount = count;
            builtScale = cam.scale;
            force = false;
            snapshot();
          }
        } else builtCount = count;
      }
      if (!T || !target) return;
      // K1383 s1: while the appearance reveal runs, draw its form over this frame's masks (gf_reveal.ts); the
      // frame it ends, the original programs again
      if (pass.revealable && o.reveal !== false && gfRevealing(r)) {
        rvTab ??= new GfRevealTable();
        rvTab.build(r, T);
        pass.setReveal(rvTab);
        rvDrawn = true;
        dirty = true;
        stats.rvMs.push(rvTab.ms); stats.rvKnots.push(rvTab.nKnots); stats.rvActive.push(rvTab.nActive);
      } else if (rvDrawn) {
        pass.setReveal(null);
        rvDrawn = false;
        dirty = true;
      }
      // K1389 s1: today's thread look. s2: the colour table is static: rebuilt only when what knotSection reads
      // changes (the gate's revisions, then the hash), and the positions with it; each build's positions arrive
      // with its tables (install).
      if (pass.lookable && o.look !== false) {
        lkTab ??= new GfLookTable();
        ptTab ??= new GfPaintTable();
        dynTab ??= new GfDynTable();
        fxTab ??= new GfFxTable();
        if (lkGate.changed(r)) {
          stats.lkKeys++;
          const key = lookKey(r);
          if (key !== lkKey) {
            lkKey = key;
            if (lkTab.build(r)) dirty = true;
            stats.lkMs.push(lkTab.ms); stats.lkColors = lkTab.nColors; stats.lkRows = lkTab.rows; stats.lkPos = lkTab.nPos;
            lkShow(lkSnap());
            dirty = true;
          }
        }
        if (!lkP) lkShow(lkSnap());
        if (!ptP) ptShow(ptSnap());
        if (!dynP) dynShow(dynSnap());
        if (!fxP) fxShow(fxSnap());
        // K1405: a moved paint declaration (a walk, a trail shift) re-bakes and redraws at once,
        // even at rest, when no tables build follows it
        const pk = paintKey(r.paintState);
        if (pk !== ptKey) { ptKey = pk; ptShow(ptSnap()); dirty = true; }
        // K1414 part 2 (24C): a moved pulse/telegraph declaration re-bakes at once; live pulses
        // (their clocks) and a riding telegraph end redraw every frame, as today's paint tick does
        const dk = dynKey({ paintPulses: r.paintState.paintPulses, paintTele: r.paintState.paintTele, teleGap: r.paintState.rimGap() });
        if (dk !== dynKeyV) { dynKeyV = dk; dynShow(dynSnap()); dirty = true; }
        if (r.paintState.paintPulses.length > 0) dirty = true;
        const atU = dynTeleAtU();
        if (atU !== teleAtU) { teleAtU = atU; dirty = true; }
        const gap = lookGap(r);
        const fade = lookFade(r);
        if (gap !== lkGap || fade !== lkFadeV) { lkGap = gap; lkFadeV = fade; dirty = true; }
        // K1395 (24D): the look draws over the reveal form while the reveal runs, shaded by the
        // FX baked above (fxShow per revealing frame); gfLookDraws holds it off only for an A/B's
        // look: false. (K1404 held the look off here: its border interior was clear, so the ribbons
        // vanished at fabric scales; the FX interior fills it now, LOOK_COMP_FS's uRvFx.)
        if (!gfLookDraws(o.look, rvDrawn)) {
          if (pass.looking) { pass.setLook(null); dirty = true; }
        } else {
          const up = pass.lkPMs;
          if (rvDrawn) fxShow(fxSnap());
          pass.setLook(lkTab, gap, lkP, lkPVer, ptP, ptVer, fade, dynP, dynVer, teleAtU, fxP, fxVer, rvDrawn);
          if (pass.lkPMs !== up) stats.lkUpMs.push(pass.lkPMs);
        }
      } else if (lkGap >= 0) {
        pass.setLook(null);
        lkGap = -1;
        lkFadeV = -1;
        ptKey = -1;
        dynKeyV = -1;
        dirty = true;
      }
      const key = `${cam.a},${cam.d},${cam.e},${cam.f},${cam.w},${cam.h}`;
      if (key !== drawnKey) dirty = true;
      pass.poll();
      if (!dirty) return;
      target.resize(cam.w, cam.h);
      // world x = (fragX - e) / a; world y = (H - fragY - f) / d
      map = [1 / cam.a, -cam.e / cam.a, -1 / cam.d, (cam.h - cam.f) / cam.d];
      rect = pass.gridRect(map, cam.w, cam.h);
      const t0 = performance.now();
      pass.draw(target, map, rect);
      stats.cpuPassMs.push(performance.now() - t0);
      if (rvDrawn) { stats.rvPasses++; stats.rvLast = performance.now(); }
      stats.px.push((rect[2] - rect[0]) * (rect[3] - rect[1]));
      stats.passes++;
      drawnKey = key;
      dirty = false;
    } catch (e) {
      ctx.app.renderer.resetState();
      fallback(`failed (${e instanceof Error ? e.message : String(e)})`);
      return;
    }
    ctx.app.renderer.resetState();
  };

  const after = (): void => {};

  // K1369 s2: true when this frame's gf work can neither install a build nor
  // start one (worker builds at depth, none waiting): the ribbon's CPU update
  // would feed nothing gf draws, so frame_loop.ts skips it (main's frame then
  // leaves the big core to the physics worker). Asked once per awake frame.
  const busy = (): boolean => {
    // K1369 s4: with the channel open the gf worker samples; main never
    // runs the ribbon update (a pick or pluck still refreshes it).
    if (chanOn && !off) {
      stats.gated++;
      return true;
    }
    if (off || !worker || !ready || !T || pending || force || opts().gate === false) return false;
    if (flights.size < depth()) return false;
    stats.gated++;
    return true;
  };

  // Probe: the candidates per pixel at the current frame (the probe variant
  // over the same rect, read back): segments and corners, mean and p95 over
  // the pixels the grid covers, and those with any segment.
  const counts = (): Record<string, number> | null => {
    const g = gl();
    if (!g || !T || !target) return null;
    const pp = new GfPass(g, true);
    const tg = new GfTarget(g, 3, true);
    try {
      pp.upload(T);
      tg.resize(target.w, target.h);
      pp.draw(tg, map, rect, false);
      const w = tg.w; const h = tg.h;
      const a1 = new Float32Array(w * h * 4); const a2 = new Float32Array(w * h * 4);
      tg.read(1, a1); tg.read(2, a2);
      const segs: number[] = []; const ks: number[] = [];
      for (let y = rect[1]; y < rect[3]; y++)
        for (let x = rect[0]; x < rect[2]; x++) {
          const i = 4 * (y * w + x);
          segs.push(a1[i + 3]); ks.push(a2[i]);
        }
      const st = (v: number[]): [number, number] => {
        if (!v.length) return [0, 0];
        const m = v.reduce((s, x) => s + x, 0) / v.length;
        const srt = Float64Array.from(v).sort();
        return [m, srt[Math.min(srt.length - 1, Math.floor(0.95 * srt.length))]];
      };
      const [sm, s95] = st(segs); const [km, k95] = st(ks);
      // Over the pixels with any candidate segment (stage 1's floor counted pixels within reach).
      const live = segs.filter((x) => x > 0);
      const [lm, l95] = st(live);
      return { px: segs.length, segMean: sm, segP95: s95, kMean: km, kP95: k95, livePx: live.length, liveMean: lm, liveP95: l95 };
    } finally {
      pp.dispose();
      tg.dispose();
      ctx.app.renderer.resetState();
    }
  };

  const dispose = (): void => {
    release();
    applyCap(0);
    off = true;
    if (worker) dropWorker("disposed");
    const G = globalThis as unknown as Record<string, unknown>;
    if (G.__knotGf === api) delete G.__knotGf;
  };

  const api = {
    stats,
    get gpuMs() { return pass?.gpuMs ?? []; },
    get emptyMs() { return pass?.emptyMs ?? []; },
    get timed() { return !!pass?.timed; },
    get disjoint() { return pass?.disjoint ?? 0; },
    get rect() { return rect; },
    /** K1369 s4: the tables the pass holds (a probe compares them). */
    get tables() { return T; },
    counts,
    redraw() { dirty = true; requestFrame(); },
    /** c1: when true (or `__knotGfOpts.verify`), every build is also made
     * the old way and compared. */
    verify: false,
    /** c1: build again from the current state (in the worker when ready). */
    rebuild() { force = true; requestFrame(); },
  };
  (globalThis as unknown as Record<string, unknown>).__knotGf = api;
  return { frame, after, dispose, busy };
}
