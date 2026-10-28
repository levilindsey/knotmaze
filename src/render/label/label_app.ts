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
//   label_band.ts    S3a3: the band pass, the ink drawn from L (and D2):
//                    its strips (pure CPU) and the composite
//
// The pieces come from a FieldModel (../field/oracle.ts, labelOnly) built
// on the main thread from the renderer's samples (the mirror's, under the
// worker) and the crossing table: field/scene_export_hook.ts's
// gatherSceneInput, then buildFieldScene. The worker's snapshot gains
// nothing.
//
// frame_loop.ts imports this module (dynamically) on the first repaint with
// the border look's label ink on, calls frame() before each app.render() and
// after() after it; with the flag off nothing here loads, runs, allocates or
// compiles. frame() renders the label (L, D2) and the band pass's coverage
// (C); after() draws C over the canvas in the ink's colour.
//
// When it rebuilds (S3a3 step 4): whenever the drawn positions (the
// renderer's samples, which the pieces are built from) changed since the
// last build, so every repaint while the knot moves, with the worker on or
// off. A geometry update that moved nothing (flow at rest, a paint-only
// change) keeps the pieces. S3b times the build.
import { cornerRadius, FieldModel, type OracleParams } from "../field/oracle";
import { buildFieldScene } from "../field/scene_export";
import { gatherSceneInput, type SceneExportCtx } from "../field/scene_export_hook";
import { buildLabelPieces, labelLimits, type LabelPieces } from "./label_pieces";
import { BandPass, buildBandStrips, type BandStrips } from "./label_band";
import { LabelPass, type LabelCamera } from "./label_pass";

// The scene export leaves look.ctrlArc unset; S3a's probes use 0.47 (the
// diagram depth's window is depthWindow x ctrlArc).
const CTRL_ARC = 0.47;
// The corner radii S3a v6 measured with (the round corners at cr 3).
const CR = 3;
// The ink's colour with no border colour picked: the border look's auto
// stroke, mix(rgb * 0.30, (0.09, 0.085, 0.08), 0.5), at a mid section
// colour. The look's own stroke follows each section's colour; this one
// colour is a residual (S3a3's handoff).
const INK_AUTO: [number, number, number] = [0.12, 0.11, 0.09];

export interface LabelApp {
  /** Before each app.render(): rebuild if due, then render the label and
   * the band pass's ink coverage. */
  frame(): void;
  /** After each app.render(): the ink over the canvas. */
  after(): void;
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
  let cam: LabelCamera | null = null;
  let band: BandPass | null = null;
  let strips: BandStrips | null = null;
  let bandDepth = false;
  // The drawn positions the pieces were built from, one copy per chain.
  let drawn: (Float32Array | null)[] = [];
  const stats = { rebuilds: 0, kept: 0, renders: 0, fallback: "" as string, chains: 0, clusters: 0 };

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
    band?.dispose();
    band = null;
    pieces = null;
    strips = null;
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
    strips = buildBandStrips(m, pieces);
    stats.rebuilds++;
    if (pass) pass.setPieces(pieces);
    if (band) band.setStrips(strips);
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
    const { L, D2 } = pass.textures;
    if (packed && pieces && strips && L && D2) {
      if (!band) {
        band = new BandPass(g);
        band.setStrips(strips);
      }
      // The ink's width in device pixels: W world units at the camera's scale.
      const px = Math.sqrt(Math.abs(cam.a * cam.d - cam.b * cam.c));
      band.render(L, D2, cam, w, hh, { W: strips.W * px, sigma: pieces.sigma, depth: bandDepth });
    }
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
      drawn = [];
    }
    try {
      if (count !== builtCount) {
        builtCount = count;
        if (!pieces || moved()) {
          rebuild();
          snapshot();
        } else stats.kept++;
      }
      if (off || !pieces) return;
      render();
    } catch (e) {
      // Never into the ticker: a failed build or compile turns the flag off.
      ctx.app.renderer.resetState();
      fallback(`failed (${e instanceof Error ? e.message : String(e)})`);
    }
  };

  // After app.render(): the band pass's coverage over the canvas.
  const after = (): void => {
    if (off || !band || !packed || !pieces) return;
    const bc = ctx.scene.renderer?.borderColor ?? 0;
    const ink: [number, number, number] = bc ? [((bc >> 16) & 255) / 255, ((bc >> 8) & 255) / 255, (bc & 255) / 255] : INK_AUTO;
    try {
      band.composite(ink);
    } catch (e) {
      fallback(`composite failed (${e instanceof Error ? e.message : String(e)})`);
    } finally {
      ctx.app.renderer.resetState();
    }
  };

  const dispose = (): void => {
    pass?.dispose();
    pass = null;
    band?.dispose();
    band = null;
    pieces = null;
    strips = null;
    off = true;
    const G = globalThis as unknown as Record<string, unknown>;
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
      if (force) {
        builtCount = -1;
        drawn = [];
      }
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
    get strips() {
      return strips;
    },
    /** The band pass with K923's depth rule (label_band.ts; off by default). */
    setBandDepth(on: boolean): void {
      bandDepth = on;
    },
    /** The ink's coverage from the last render, 0-255 a pixel, row 0 = the top. */
    readInk(): { w: number; h: number; data: Uint8Array } | null {
      if (!band || !band.width) return null;
      const data = band.read();
      ctx.app.renderer.resetState();
      return { w: band.width, h: band.height, data };
    },
  };
  (globalThis as unknown as Record<string, unknown>).__knotLabel = api;

  return { frame, after, dispose };
}
