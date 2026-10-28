// K868 S3a2: the label pass in the app (docs/design/K868_s3a2_label.md).
//
// Module map (src/render/label/):
//   label_app.ts     the app's glue (this file): when the label rebuilds and
//                    renders, its camera, the limits' fallback, and
//                    window.__knotLabel for the probes
//   label_pieces.ts  pure CPU: the tube pieces (v6's, split where the depth
//                    bends and at every cluster switch), the corner fills,
//                    and the DATA texture (chain table, arm windows,
//                    crossing rows)
//   label_glsl.ts    the two programs (tubes, fills), PACKED or WIDE, and
//                    the label's bit layout
//   label_pass.ts    the GL targets (L, D2, T) and the two draws
//
// The pieces come from a FieldModel (../field/oracle.ts, labelOnly) built
// on the main thread from the renderer's samples (the mirror's, under the
// worker) and the crossing table: field/scene_export_hook.ts's
// gatherSceneInput, then buildFieldScene. The worker's snapshot gains
// nothing.
//
// frame_loop.ts imports this module (dynamically) on the first repaint with
// the border look's label ink on and calls frame() before each app.render();
// with the flag off nothing here loads, runs, allocates or compiles. Nothing
// draws the label yet: S3a3's band pass reads L and D2.
//
// When it rebuilds: the pieces follow the renderer's geometry (updateCount).
// A changed geometry rebuilds them once the physics sleeps, once two repaints
// pass without a geometry change, or when there are none yet; in between the
// label renders the last pieces with the current camera. S3b times the
// build and decides whether motion can afford more.
import { cornerRadius, FieldModel, type OracleParams } from "../field/oracle";
import { buildFieldScene } from "../field/scene_export";
import { gatherSceneInput, type SceneExportCtx } from "../field/scene_export_hook";
import { buildLabelPieces, labelLimits, type LabelPieces } from "./label_pieces";
import { LabelPass, type LabelCamera } from "./label_pass";

// The scene export leaves look.ctrlArc unset; S3a's probes use 0.47 (the
// diagram depth's window is depthWindow x ctrlArc).
const CTRL_ARC = 0.47;
// The corner radii S3a v6 measured with (the round corners at cr 3).
const CR = 3;

export interface LabelApp {
  /** Before each app.render(): rebuild if due, then render the label. */
  frame(): void;
  dispose(): void;
}

// One console warning per page, however often the flag comes back on.
let warned = false;

/** For tests: forget that the limits' warning was given. */
export function resetLabelWarning(): void {
  warned = false;
}

export function createLabelApp(ctx: SceneExportCtx, requestFrame: () => void): LabelApp {
  let pass: LabelPass | null = null;
  let packed = true;
  let pieces: LabelPieces | null = null;
  let off = false;
  let lastR: unknown = null;
  let builtCount = -1;
  let prevCount = -1;
  let quiet = 0;
  let cam: LabelCamera | null = null;
  const stats = { rebuilds: 0, renders: 0, fallback: "" as string, chains: 0, clusters: 0 };

  const gl = (): WebGL2RenderingContext | null => {
    const g = (ctx.app.renderer as unknown as { gl?: unknown }).gl;
    return typeof WebGL2RenderingContext !== "undefined" && g instanceof WebGL2RenderingContext ? g : null;
  };

  const fallback = (why: string): void => {
    off = true;
    stats.fallback = why;
    if (!warned) {
      warned = true;
      console.warn(`K868 label pass: ${why}; label ink off, the border look draws its own ink`);
    }
    ctx.params.labelInk = false;
    if (ctx.scene.renderer) ctx.scene.renderer.labelInk = false;
    pass?.dispose();
    pass = null;
    pieces = null;
    requestFrame();
  };

  const rebuild = (): void => {
    const ps = ctx.scene.ps!;
    const pre = labelLimits(ps.chains.length, 0);
    if (pre) return fallback(pre);
    const { input } = gatherSceneInput(
      ctx,
      { zPos: new Float64Array(ps.positions.length / 2), positions: ps.positions, simTime: 0 },
      "label",
      "label"
    );
    const { scene } = buildFieldScene(input);
    scene.look.ctrlArc ??= CTRL_ARC;
    const h = scene.look.halfWidth;
    const params: OracleParams = {
      rRound: 0,
      rOf: (_j, _i, th, st) => (st === "round" ? cornerRadius(CR, h, th) : 0),
      spans: "k883",
      crMax: CR,
      labelOnly: true,
    };
    const m = new FieldModel(scene, params);
    stats.chains = m.polys.length;
    stats.clusters = m.clusters.length;
    const lim = labelLimits(m.polys.length, m.clusters.length);
    if (lim) return fallback(lim);
    pieces = buildLabelPieces(m);
    stats.rebuilds++;
    if (pass) pass.setPieces(pieces);
  };

  const render = (): void => {
    const g = gl();
    if (!g) return fallback("no WebGL2 context");
    if (!pass) {
      pass = new LabelPass(g, packed);
      if (pieces) pass.setPieces(pieces);
    }
    // World to device pixels: the root's transform (as the scene export's
    // camera), scaled from the screen's CSS pixels to the canvas's.
    const canvas = ctx.app.canvas as HTMLCanvasElement;
    const w = canvas.width;
    const hh = canvas.height;
    const sx = w / ctx.app.screen.width;
    const sy = hh / ctx.app.screen.height;
    const root = ctx.root;
    const s = root.scale.x;
    const t = root.scale.y;
    cam = { a: s * sx, b: 0, c: 0, d: t * sy, tx: root.position.x * sx, ty: root.position.y * sy };
    pass.render(cam, w, hh, true);
    stats.renders++;
    ctx.app.renderer.resetState();
  };

  const frame = (): void => {
    if (off) return;
    const r = ctx.scene.renderer;
    const ps = ctx.scene.ps;
    if (!r || !ps) return;
    const count = r.updateCount;
    if (r !== lastR) {
      lastR = r;
      builtCount = -1;
      prevCount = -1;
    }
    quiet = count === prevCount ? quiet + 1 : 0;
    prevCount = count;
    try {
      if (count !== builtCount && (!pieces || ctx.host.asleep || quiet >= 2)) {
        builtCount = count;
        rebuild();
      }
      if (off || !pieces) return;
      render();
    } catch (e) {
      // Never into the ticker: a failed build or compile turns the flag off.
      ctx.app.renderer.resetState();
      fallback(`failed (${e instanceof Error ? e.message : String(e)})`);
    }
  };

  const dispose = (): void => {
    pass?.dispose();
    pass = null;
    pieces = null;
    off = true;
    const G = window as unknown as Record<string, unknown>;
    if (G.__knotLabel === api) delete G.__knotLabel;
  };

  // Probe access: the readback with its camera, the pieces' stats, and the
  // wide (128-bit) form the probes compare against.
  const api = {
    stats,
    get pieces() {
      return pieces;
    },
    get camera() {
      return cam;
    },
    get packed() {
      return packed;
    },
    /** Rebuild if the geometry changed, render now (as a repaint would). */
    renderNow(force = false): void {
      if (force) builtCount = -1;
      quiet = 2;
      prevCount = ctx.scene.renderer?.updateCount ?? -1;
      frame();
    },
    /** Switch between the packed (default) and the wide label. */
    setWide(wide: boolean): void {
      if (packed === !wide) return;
      packed = !wide;
      pass?.dispose();
      pass = null;
    },
    read(): { w: number; h: number; packed: boolean; camera: LabelCamera | null; data: Uint32Array } | null {
      if (!pass) return null;
      const data = pass.read();
      ctx.app.renderer.resetState();
      return { w: pass.width, h: pass.height, packed, camera: cam, data };
    },
  };
  (window as unknown as Record<string, unknown>).__knotLabel = api;

  return { frame, dispose };
}
