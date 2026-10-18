// K320 STAGE 2a: THE GAP PRE-PASS DATA PLANE (docs/design/K320_stage2.md
// sections 3.2 and 6, sub-step 2a). The ribbons draw twice per dirty frame
// from 2b on: a gap-only pass into a canvas-sized mask texture, then the
// paint pass sampling it. 2a lands only the data plane - the page-lifetime
// target, the gap programs (ribbon/ribbon_shader.ts sectionGapProgram), the
// prerender system and its dirty rule - and renders the pass anyway so its
// output can be proven before anything consumes it. The section programs
// still draw with their in-shader gapKeep, so a frame with the pass on is
// pixel-identical to one with it off (the A/B this stage proves).
//
//   TARGET: one RenderTexture for the page (grown in place, never
//   destroyed - the PALETTE_CACHE rule), rgba16float, NEAREST, no mipmaps,
//   no MSAA, 1:1 device pixels with the canvas (renderer.width x height).
//   R = gapKeep (half float resolves ~0.0005 near 1, two orders below the
//   0.002 discard), G = draw index + 1 as an exact integer (half float is
//   exact to 2048), B = 0, A = 1. 0 in G = no ribbon covers the texel.
//
//   DRAW: a WebGL system (ArmStripSystem's pattern, priority -99: after
//   the arm strips' -100, before any render that draws ribbons) hides the
//   ribbon root's non-base children, swaps every fill mesh onto the mode's
//   gap shader, renders the root into the target cleared to (0,0,0,0) with
//   the camera transform passed explicitly (Pixi renders a container by
//   its LOCAL transform, so the world matrix is composed fresh here), then
//   swaps back and unhides. Blending off per mesh: the last ribbon over a
//   texel owns it, which is the only fragment whose gap can show there.
//   Base-layer child order is ps.chains order, and vChain (aKey.x) encodes
//   the same index, so G needs no per-mesh uniform.
//
//   Y ORIENTATION (pinned here, measured for 2b's sampler): Pixi flips
//   render-target projections (calculateProjection's flipY = !isRoot), so
//   a world point at canvas fragCoord y lands at target texel row
//   height - 1 - y. gapMaskTexel() is that mapping; 2b's paint sample must
//   use it (brief 3.3: do not guess - this is the flip, from the projection
//   code; the asymmetric-scene browser pattern remains the 2b proof).
//
//   RATE: the pass runs in prerender iff the mask is dirty (gapMaskDirty):
//   the SAMP revision, a gap-table write, the renderer's geometry
//   revision, the view transform or canvas size, uFabricGap, the explore
//   mode or its shape rows, or the FX clock still ticking. Asleep with a
//   static view none move and the texture persists across frames and
//   scene rebuilds.

import {
  Container,
  ExtensionType,
  Matrix,
  RenderTexture,
  extensions,
} from "pixi.js";
import type { Mesh, Renderer, Shader } from "pixi.js";
import { fabricUniforms, gapSplitActive, setGapMaskSize, setGapSplitActive } from "./fabric_sdf";
import { knotUniformValues } from "./paint_model";
import { bindGap, bindGapMask, sectionGapShader } from "./ribbon/ribbon_shader";

// ---------------------------------------------------------------------------
// Pure parts (test/render/gap_split.test.ts; no GL).

// One mask texel as the gap fragment writes it (R keep, G index + 1).
export function gapMaskEncode(keep: number, chain: number): [number, number, number, number] {
  return [keep, chain + 1, 0, 1];
}

// The texel's owner: the chain whose paint fragment may apply its keep
// (-1 = no ribbon covers the texel; that fragment keeps 1.0, brief 3.3).
export function gapMaskChain(texel: ArrayLike<number>): number {
  return Math.round(texel[1]) - 1;
}

// The paint fragment's sampler (GAP_MASK_FRAG gapKeepFromMask), CPU twin:
// 1.0 where another ribbon owns the texel, else the stored keep.
export function gapKeepFromMask(texel: ArrayLike<number>, self: number): number {
  return gapMaskChain(texel) !== self ? 1.0 : texel[0];
}

// The paint pass's mask coordinate for a canvas fragment: Pixi flips the
// render-target projection, so the row mirrors (see the header).
export const GAP_MASK_FLIP_Y = true;
export function gapMaskTexel(fragX: number, fragY: number, height: number): [number, number] {
  return [fragX, GAP_MASK_FLIP_Y ? height - 1 - fragY : fragY];
}

// The registry/pass fallback (brief section 5): a half-float color buffer
// (either extension) can hold the target; otherwise the combined programs
// stay the only path and no pass runs. Never both.
export function gapSplitSupported(hasColorBufferFloat: boolean, hasColorBufferHalfFloat: boolean): boolean {
  return hasColorBufferFloat || hasColorBufferHalfFloat;
}

type GlLike = { getExtension(name: string): unknown };
let SPLIT_GL: GlLike | null = null;
let SPLIT_OK: boolean | null = null;
export function detectGapSplit(gl: GlLike | null): boolean {
  if (!gl) return false;
  if (SPLIT_GL === gl && SPLIT_OK !== null) return SPLIT_OK;
  SPLIT_OK = gapSplitSupported(
    !!gl.getExtension("EXT_color_buffer_float"),
    !!gl.getExtension("EXT_color_buffer_half_float"),
  );
  SPLIT_GL = gl;
  setGapSplitActive(SPLIT_OK);
  return SPLIT_OK;
}

// Everything the search reads, as one comparable snapshot.
export interface GapDirtyInputs {
  sampRev: number;
  gapRev: number;
  geomRev: number;
  // The view (camera world) matrix, a b c d tx ty.
  view: readonly [number, number, number, number, number, number];
  canvasW: number;
  canvasH: number;
  fabricGap: readonly [number, number, number];
  explore: boolean;
  shapeRev: number;
  fxTicking: boolean;
}

export function gapMaskDirty(prev: GapDirtyInputs | null, next: GapDirtyInputs): boolean {
  if (!prev) return true;
  // While the FX clock ticks, gated strengths ramp on it every frame.
  if (next.fxTicking) return true;
  if (
    prev.sampRev !== next.sampRev ||
    prev.gapRev !== next.gapRev ||
    prev.geomRev !== next.geomRev ||
    prev.canvasW !== next.canvasW ||
    prev.canvasH !== next.canvasH ||
    prev.explore !== next.explore ||
    prev.shapeRev !== next.shapeRev ||
    prev.fxTicking !== next.fxTicking
  ) {
    return true;
  }
  for (let i = 0; i < 6; i++) if (prev.view[i] !== next.view[i]) return true;
  for (let i = 0; i < 3; i++) if (prev.fabricGap[i] !== next.fabricGap[i]) return true;
  return false;
}

// ---------------------------------------------------------------------------
// The target: page-lifetime, resized in place to the canvas's device size.

let MASK: RenderTexture | null = null;
export function gapMaskTexture(): RenderTexture {
  if (!MASK) {
    MASK = RenderTexture.create({
      width: 1,
      height: 1,
      resolution: 1,
      format: "rgba16float",
      dynamic: true,
      antialias: false,
      scaleMode: "nearest",
      autoGenerateMipmaps: false,
    });
  }
  return MASK;
}

function ensureMaskSize(w: number, h: number): boolean {
  const rt = gapMaskTexture();
  const width = Math.max(1, Math.round(w));
  const height = Math.max(1, Math.round(h));
  setGapMaskSize(width, height);
  bindGapMask(rt);
  if (rt.width === width && rt.height === height) return false;
  rt.resize(width, height, 1);
  return true;
}

// ---------------------------------------------------------------------------
// The live scene the pass draws (registered by RibbonRenderer; one at a
// time, like the G3 tables' writer).

export interface GapSceneSource {
  root: Container;
  base: Container;
  gapTex: import("pixi.js").Texture;
  fills: ReadonlyArray<{ mesh: Mesh }>;
  explore(): boolean;
  geomRev(): number;
  sampRev(): number;
  gapRev(): number;
  shapeRev(): number;
  fxTicking(): boolean;
}

let SCENE: GapSceneSource | null = null;
export function registerGapScene(src: GapSceneSource): void {
  SCENE = src;
}
export function clearGapScene(src: GapSceneSource): void {
  if (SCENE === src) SCENE = null;
}

// Probes: passes so far and their main-thread ms; the A/B switch (off =
// today's rendering exactly, no pass at all).
export const GAP_PREPASS_STATS = { renders: 0, ms: 0 };
let PREPASS_ON = true;
export function setGapPrepassEnabled(on: boolean): void {
  PREPASS_ON = on;
}
export function gapPrepassEnabled(): boolean {
  return PREPASS_ON;
}

// The root's fresh world matrix (Pixi renders a container by its local
// transform, so the camera chain is composed here, root last).
const VIEW_SCRATCH = new Matrix();
function freshWorld(root: Container): Matrix {
  const chain: Container[] = [];
  for (let c: Container | null = root; c; c = c.parent) chain.push(c);
  VIEW_SCRATCH.identity();
  for (let i = chain.length - 1; i >= 0; i--) {
    chain[i].updateLocalTransform();
    VIEW_SCRATCH.append(chain[i].localTransform);
  }
  return VIEW_SCRATCH;
}

let LAST: GapDirtyInputs | null = null;
let FRAMEBUFFER_CHECKED = false;

// One-time framebuffer-completeness check on the actual target (brief
// section 5: drivers lie by extension). False kills the pass for the page.
function targetComplete(renderer: Renderer): boolean {
  if (FRAMEBUFFER_CHECKED) return SPLIT_OK !== false;
  FRAMEBUFFER_CHECKED = true;
  try {
    const gl = (renderer as unknown as { gl?: WebGL2RenderingContext }).gl;
    if (!gl) return true;
    renderer.renderTarget.bind(gapMaskTexture());
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      SPLIT_OK = false;
      setGapSplitActive(false);
    }
  } catch {
    // No check possible: the extension answer stands.
  }
  return SPLIT_OK !== false;
}

// Render the mask now (the system's prerender, or a probe).
export function renderGapMask(renderer: Renderer): void {
  const src = SCENE;
  if (!src || !PREPASS_ON || !gapSplitActive() || src.fills.length === 0) return;
  const gl = (renderer as unknown as { gl?: WebGL2RenderingContext }).gl ?? null;
  if (!detectGapSplit(gl)) return;
  ensureMaskSize(renderer.width, renderer.height);
  if (!targetComplete(renderer)) return;
  const t0 = performance.now();
  const world = freshWorld(src.root);
  const fg = (fabricUniforms().uniforms as unknown as { uFabricGap: Float32Array }).uFabricGap;
  const next: GapDirtyInputs = {
    sampRev: src.sampRev(),
    gapRev: src.gapRev(),
    geomRev: src.geomRev(),
    view: [world.a, world.b, world.c, world.d, world.tx, world.ty],
    canvasW: renderer.width,
    canvasH: renderer.height,
    fabricGap: [fg[0], fg[1], fg[2]],
    explore: src.explore(),
    shapeRev: src.shapeRev(),
    fxTicking: src.fxTicking(),
  };
  if (!gapMaskDirty(LAST, next)) return;
  LAST = next;
  bindGap(src.gapTex);
  const gapShader: Shader = sectionGapShader(next.explore);
  const root = src.root;
  const hidden: Array<[Container, boolean]> = [];
  for (const child of root.children) {
    if (child === src.base) continue;
    hidden.push([child as Container, child.visible]);
    child.visible = false;
  }
  const saved: Array<{ mesh: Mesh; shader: unknown; blend: unknown }> = [];
  for (const f of src.fills) {
    saved.push({ mesh: f.mesh, shader: f.mesh.shader, blend: f.mesh.blendMode });
    f.mesh.shader = gapShader as never;
    f.mesh.blendMode = "none";
  }
  try {
    renderer.render({
      container: root,
      target: gapMaskTexture(),
      transform: new Matrix().copyFrom(world),
      clear: true,
      clearColor: [0, 0, 0, 0],
    });
  } finally {
    for (const s of saved) {
      s.mesh.shader = s.shader as never;
      s.mesh.blendMode = s.blend as never;
    }
    for (const [child, visible] of hidden) child.visible = visible;
  }
  GAP_PREPASS_STATS.renders++;
  GAP_PREPASS_STATS.ms += performance.now() - t0;
}

// The pixi system: before every render that is not our own pass, refresh
// the mask if any input changed. After the arm strips (-100).
class GapPrepassSystem {
  static extension = {
    type: [ExtensionType.WebGLSystem],
    name: "knotGapPrepass",
    priority: -99,
  };
  private readonly renderer: Renderer;
  private busy = false;
  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }
  prerender(options: { container: Container; target?: unknown }): void {
    if (this.busy || !SCENE || !PREPASS_ON || !gapSplitActive()) return;
    if (options.target === (MASK as unknown)) return;
    this.busy = true;
    try {
      renderGapMask(this.renderer);
    } finally {
      this.busy = false;
    }
  }
  // A restored context drops the target's contents: re-render next frame.
  contextChange(): void {
    LAST = null;
    FRAMEBUFFER_CHECKED = false;
    SPLIT_OK = null;
    SPLIT_GL = null;
    setGapSplitActive(true);
  }
  destroy(): void {}
}
extensions.add(GapPrepassSystem);

// The FX clock as the dirty rule reads it (gap strengths ramp on uKFx.z
// while it ticks; knotUniformValues is the CPU mirror all writers share).
export function fxClockTicking(fxLive: boolean): boolean {
  return fxLive && knotUniformValues().uKFx[3] > 0.5;
}

