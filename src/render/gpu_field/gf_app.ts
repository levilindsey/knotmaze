// K1362 s2: form B's look drawn per pixel on the GPU in the app, under the
// link flag `rp=gf` (frame_loop.ts's label slot). Each changed frame the
// scene export and the tables (tables.ts) are built on main, packed and
// uploaded (gf_pack.ts), and the pass (gf_pass.ts) shades the tables' grid
// into an RGBA8 target of (ink, coverage); a RenderContainer in the ribbon's
// place composites it: the fill (one colour; section colours are a later
// stage) under the ink. The ribbon's base and fillets (root children 0, 1)
// are hidden while it runs, as outline_app.ts hides them.
//
// Probe access: globalThis.__knotGf (stats: build, pack, upload ms on main;
// the GPU pass's timer-query ms and the empty query's; pixels shaded; and
// counts(), the probe variant's candidates per pixel at the current frame).
import { RenderContainer, type Container, type WebGLRenderer } from "pixi.js";
import { buildFieldScene } from "../field/scene_export";
import { gatherSceneInput, type SceneExportCtx } from "../field/scene_export_hook";
import { buildTables, type GfTables } from "./tables";
import { GfComposite, GfPass, GfTarget, type GfMap } from "./gf_pass";

const CTRL_ARC = 0.47;
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

  const rebuild = (scale: number): void => {
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
    const t1 = performance.now();
    T = buildTables(scene, { aa: 0.5 / scale });
    const t2 = performance.now();
    pass!.upload(T);
    stats.exportMs.push(t1 - t0);
    stats.tablesMs.push(t2 - t1);
    stats.packMs.push(pass!.packMs);
    stats.uploadMs.push(pass!.uploadMs);
    stats.rebuilds++;
    dirty = true;
  };

  const frame = (): void => {
    if (off) return;
    const r = ctx.scene.renderer;
    const ps = ctx.scene.ps;
    if (!r || !ps) return;
    try {
      const g = gl();
      if (!g) return fallback("no WebGL2 context");
      if (!pass) {
        pass = new GfPass(g, false);
        target = new GfTarget(g, 1, false);
        comp = new GfComposite(g);
      }
      if (r !== lastR) {
        lastR = r;
        builtCount = -1;
        drawn = [];
        attach();
      }
      const cam = camera();
      const count = r.updateCount;
      if (count !== builtCount || cam.scale !== builtScale || !T) {
        builtCount = count;
        if (!T || cam.scale !== builtScale || moved()) {
          rebuild(cam.scale);
          builtScale = cam.scale;
          snapshot();
        }
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
      return { px: segs.length, segMean: sm, segP95: s95, kMean: km, kP95: k95 };
    } finally {
      pp.dispose();
      tg.dispose();
      ctx.app.renderer.resetState();
    }
  };

  const dispose = (): void => {
    release();
    off = true;
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
  };
  (globalThis as unknown as Record<string, unknown>).__knotGf = api;
  return { frame, after, dispose };
}
