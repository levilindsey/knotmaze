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
import { gatherSceneInput, gatherSceneInputLean, type SceneExportCtx } from "../field/scene_export_hook";
import { buildTables, type GfTables } from "./tables";
import { CTRL_ARC, gfBuild, tablesDiff } from "./gf_build";
import { GfComposite, GfPass, GfTarget, type GfMap } from "./gf_pass";

interface GfReply {
  hello?: boolean;
  id?: number;
  T?: GfTables;
  exportMs?: number;
  tablesMs?: number;
  workMs?: number;
  error?: string;
}
const FILL: [number, number, number] = [0.96, 0.93, 0.86];
const INK_AUTO: [number, number, number] = [0.12, 0.11, 0.09];

export interface GfApp { frame(): void; after(): void; dispose(): void }

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
  let rc: RenderContainer | null = null;
  let drawn: (Float32Array | null)[] = [];
  const stats = {
    rebuilds: 0, passes: 0, composites: 0, fallback: "",
    exportMs: [] as number[], tablesMs: [] as number[], packMs: [] as number[], uploadMs: [] as number[],
    px: [] as number[], cpuPassMs: [] as number[],
    // c1: where builds ran, main's share per rebuild (gather + post, then
    // pack + upload; in-thread builds add the export and tables), the
    // worker's whole build and the post-to-arrival latency.
    worker: "none", workerBuilds: 0, threadBuilds: 0, stale: 0,
    gatherMs: [] as number[], mainMs: [] as number[], workMs: [] as number[], latencyMs: [] as number[],
    verified: 0, mismatch: [] as string[], verifyMs: [] as number[],
  };

  // The build worker: started on the first frame; until it says hello (and
  // after it fails) builds run in-thread.
  let worker: Worker | null = null;
  let ready = false;
  let inFlight = false;
  let flightId = 0;
  let flightGen = 0;
  let flightT0 = 0;
  let flightMain = 0;
  let gen = 0;
  let pending: { T: GfTables; main: number } | null = null;
  const refs = new Map<number, GfTables>();
  const verifying = (): boolean => !!api.verify;
  const wantWorker = (): boolean =>
    typeof Worker !== "undefined" &&
    (globalThis as unknown as { __knotGfOpts?: { worker?: boolean } }).__knotGfOpts?.worker !== false;

  const dropWorker = (why: string): void => {
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    }
    worker = null;
    ready = false;
    inFlight = false;
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
      if (d.id !== flightId) return;
      inFlight = false;
      const ref = refs.get(d.id);
      refs.delete(d.id);
      if (flightGen !== gen || off) {
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
      stats.latencyMs.push(performance.now() - flightT0);
      stats.workerBuilds++;
      if (ref) check(d.T, ref);
      pending = { T: d.T, main: flightMain };
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
    rc = new RenderContainer({
      render: (renderer) => {
        if (!comp || !target || off || !T) return;
        const g = comp.gl;
        if (g.getParameter(g.FRAMEBUFFER_BINDING) !== null) return;
        try {
          const bc = ctx.scene.renderer?.borderColor ?? 0;
          const ink: [number, number, number] = bc ? [((bc >> 16) & 255) / 255, ((bc >> 8) & 255) / 255, (bc & 255) / 255] : INK_AUTO;
          comp.draw(target, FILL, ink);
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

  // Pack and upload a build's tables (main's last share of a rebuild).
  const install = (next: GfTables, mainSoFar: number): void => {
    const t0 = performance.now();
    T = next;
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
    if (useWorker && inFlight) return false;
    const t0 = performance.now();
    const { input, transfer }: { input: SceneExportInput; transfer: ArrayBuffer[] } = gatherSceneInputLean(ctx, "field");
    if (useWorker) {
      flightId++;
      flightGen = gen;
      flightT0 = t0;
      inFlight = true;
      worker!.postMessage({ id: flightId, input, aa }, transfer);
      flightMain = performance.now() - t0;
      stats.gatherMs.push(flightMain);
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

  const frame = (): void => {
    if (off) return;
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
        target = new GfTarget(g, 1, false);
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
        pending = null;
        T = null;
        attach();
      }
      if (pending) {
        const p = pending;
        pending = null;
        install(p.T, p.main);
      }
      const cam = camera();
      const count = r.updateCount;
      if (count !== builtCount || cam.scale !== builtScale || !T) {
        if (!T || cam.scale !== builtScale || moved()) {
          if (rebuild(cam.scale)) {
            builtCount = count;
            builtScale = cam.scale;
            snapshot();
          }
        } else builtCount = count;
      }
      if (!T || !target) return;
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
    counts,
    redraw() { dirty = true; requestFrame(); },
    /** c1: when true, every build is also made the old way and compared. */
    verify: false,
  };
  (globalThis as unknown as Record<string, unknown>).__knotGf = api;
  return { frame, after, dispose };
}
