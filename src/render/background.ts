// SHADER BACKGROUNDS (K21) - the pixi layer. See background_model.ts for
// the effect list, profiles, colors and the drift clock; the GLSL lives in
// background_shaders.ts.
//
// PIPELINE: the active effect's fragment shader draws one quad into a
// LOW-RES RenderTexture (BackgroundProfile.scale texels per CSS px) - only
// when the drift clock says so (10-15 fps while drifting, 6-10 on phones;
// once per change when static: speed 0, vellum at auto, reduced motion,
// the K24 pause). The drift is the effect's designed pace times the
// animation speed (K79 backgroundSpeed). A screen-sized BLIT mesh, the first child
// of the stage, stretches it over the canvas every frame (bilinear,
// dithered). The ribbons' crossing gaps discard their pixels (G1), so the
// gaps show this layer; nothing in the scene erases the framebuffer any
// more. SCREEN-FIXED: pans and zooms move the knot in front of it.
//
// "none" (and intensity 0) adds NOTHING to a frame: the layer is invisible
// (no draw call, no render-texture pass) and the canvas stays transparent
// over its flat CSS color, pixel-identical to the build before backgrounds.
//
// LIFETIME: the layer, its render texture, meshes and shaders live for the
// page (built lazily on first use, resized in place, never destroyed) - the
// PALETTE_CACHE lore: pixi's retained render state can reference a texture
// source the frame after it would have been replaced.

import {
  Container,
  Mesh,
  MeshGeometry,
  RenderTexture,
  Shader,
  Texture,
  UniformGroup,
} from "pixi.js";
import type { Renderer } from "pixi.js";
import {
  BACKGROUNDS,
  BACKGROUND_PROFILES,
  BACKGROUND_SHAPE_DEFAULTS,
  BACKGROUND_SPEED_AUTO,
  BackgroundClock,
  backgroundDrift,
  backgroundSeedOffset,
  detailGain,
  isAutoSpeed,
  needsShapeProgram,
  sanitizeBackgroundShape,
  silkAngleUniform,
} from "./background_model";
import type {
  BackgroundColors,
  BackgroundId,
  BackgroundShape,
} from "./background_model";
import {
  BLIT_FRAG,
  FOG_FRAG,
  FOG_VERT,
  QUAD_VERT,
  effectFragment,
  effectProgram,
} from "./background_shaders";

type TexShader = Shader & { texture: Texture };

// Largest render-texture side (a grain effect at one texel per CSS px on a
// huge window stays bounded).
const RT_MAX = 4096;

// Effect uniforms, shared by every effect program (see EFFECT_HEAD). Only
// the shaped programs (SHAPE_HEAD) declare uShape/uShape2; pixi's uniform
// sync skips a group member a program does not have.
let BG_UNIFORMS: UniformGroup | null = null;
function bgUniforms(): UniformGroup {
  if (!BG_UNIFORMS) {
    BG_UNIFORMS = new UniformGroup({
      uView: { value: new Float32Array([1, 1, 1, 0]), type: "vec4<f32>" },
      uParams: { value: new Float32Array([0, 0, 0.5, 0]), type: "vec4<f32>" },
      uInk: { value: new Float32Array(4), type: "vec4<f32>" },
      uA1: { value: new Float32Array(4), type: "vec4<f32>" },
      uA2: { value: new Float32Array(4), type: "vec4<f32>" },
      uA3: { value: new Float32Array(4), type: "vec4<f32>" },
      uShape: { value: new Float32Array([1, 0.5, 1, 1]), type: "vec4<f32>" },
      uShape2: { value: new Float32Array([-1, 0, 0, 0]), type: "vec4<f32>" },
    });
  }
  return BG_UNIFORMS;
}
interface BgUniformValues {
  uView: Float32Array;
  uParams: Float32Array;
  uInk: Float32Array;
  uA1: Float32Array;
  uA2: Float32Array;
  uA3: Float32Array;
  uShape: Float32Array;
  uShape2: Float32Array;
}
const bgValues = (): BgUniformValues =>
  bgUniforms().uniforms as unknown as BgUniformValues;

// The screen size the fog backdrop maps to texture coordinates with.
let SCREEN_UNIFORMS: UniformGroup | null = null;
function screenUniforms(): UniformGroup {
  if (!SCREEN_UNIFORMS) {
    SCREEN_UNIFORMS = new UniformGroup({
      uBgScreen: { value: new Float32Array([1, 1, 0, 0]), type: "vec4<f32>" },
    });
  }
  return SCREEN_UNIFORMS;
}

// Keyed by program id (effectProgram: an effect, "vellum-drift", or an
// effect's shaped program "<id>-x").
const EFFECT_SHADERS = new Map<string, TexShader>();
function effectShader(id: string): TexShader {
  let sh = EFFECT_SHADERS.get(id);
  if (!sh) {
    sh = Shader.from({
      gl: { vertex: QUAD_VERT, fragment: effectFragment(id), name: `bg-${id}` },
      resources: { bgUniforms: bgUniforms() },
    }) as TexShader;
    // Mesh wants a texture-carrying shader; this one samples none.
    sh.texture = Texture.WHITE;
    EFFECT_SHADERS.set(id, sh);
  }
  return sh;
}

// A quad mesh (positions written by setQuad).
function quadMesh(shader: TexShader): Mesh {
  const geometry = new MeshGeometry({
    positions: new Float32Array(8),
    uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  });
  return new Mesh({ geometry, shader, texture: Texture.WHITE });
}
function setQuad(mesh: Mesh, x0: number, y0: number, w: number, h: number): void {
  const g = mesh.geometry as MeshGeometry;
  const pos = g.positions;
  pos[0] = x0;
  pos[1] = y0;
  pos[2] = x0 + w;
  pos[3] = y0;
  pos[4] = x0 + w;
  pos[5] = y0 + h;
  pos[6] = x0;
  pos[7] = y0 + h;
  // Whole-buffer uploads only (the PARTIAL BUFFER UPLOADS lore).
  const b = g.getBuffer("aPosition");
  b.update(b.data.byteLength);
}

export class BackgroundLayer {
  // Screen-space layer: add it to the stage BEFORE the world root.
  readonly container = new Container();
  // Reduced motion (the Motion setting, ui/motion.ts - live): no drift, a
  // still backdrop at whatever time it reached.
  reducedMotion = false;
  // K24 policy: pause the drift once the rest of the scene is static.
  pauseWhenStatic = true;
  readonly clock = new BackgroundClock();
  // Diagnostics (probes): render-texture passes so far, the size in use.
  readonly stats = { renders: 0, rtW: 0, rtH: 0 };
  private effect: BackgroundId = "none";
  private intensity = 0.5;
  // The animation speed (backgroundSpeed; -1 = auto) and whether it leaves
  // the effect static at auto (vellum).
  private speed = BACKGROUND_SPEED_AUTO;
  private autoStatic = false;
  // The shape params (K79 stage B; sanitized - see setShape).
  private shape: BackgroundShape = { ...BACKGROUND_SHAPE_DEFAULTS };
  // The program the quad draws with (renderTexture picks it per pass).
  private program = "";
  private readonly phone: boolean;
  private readonly renderer: Renderer;
  private rt: RenderTexture | null = null;
  private scene: Container | null = null;
  private quad: Mesh | null = null;
  private blit: Mesh | null = null;
  private screenW = 1;
  private screenH = 1;

  constructor(renderer: Renderer, phone: boolean) {
    this.renderer = renderer;
    this.phone = phone;
    this.container.label = "background";
    this.container.visible = false;
  }

  get id(): BackgroundId {
    return this.effect;
  }

  // The program of the last render-texture pass (probes: GPU timings are
  // per program, bg-<program>).
  get programId(): string {
    return this.program;
  }

  // Drawing at all: an effect at a non-zero intensity. Intensity 0 IS the
  // flat ink, so it costs nothing - exactly like none.
  get active(): boolean {
    return this.effect !== "none" && this.intensity > 0;
  }

  // The live background texture (for the fog backdrop), or null when off.
  get texture(): Texture | null {
    return this.active ? this.ensure() : null;
  }

  // Effect, intensity and animation speed (the three params; speed < 0 =
  // auto, see backgroundDrift). Unknown ids read as none.
  configure(effect: BackgroundId, intensity: number, speed = BACKGROUND_SPEED_AUTO): void {
    const id = BACKGROUNDS.includes(effect) ? effect : "none";
    const k = Math.max(0, Math.min(1, Number.isFinite(intensity) ? intensity : 0));
    const was = this.active;
    if (k !== this.intensity) {
      this.intensity = k;
      bgValues().uParams[2] = k;
      this.clock.dirty = true;
    }
    const changed = id !== this.effect;
    if (changed) {
      this.effect = id;
      this.clock.dirty = true;
    }
    const auto = isAutoSpeed(speed);
    // A new effect starts at drift time 0, like a fresh page; so does an
    // effect that is static at auto (vellum) once its speed returns to
    // auto - its link then shows the canonical look, not wherever an
    // earlier speed left it.
    const autoStatic = auto && id !== "none" && backgroundDrift(id, speed) === 0;
    if ((changed || (autoStatic && !this.autoStatic)) && this.clock.time !== 0) {
      this.clock.time = 0;
      this.clock.dirty = true;
    }
    this.autoStatic = autoStatic;
    this.speed = auto ? BACKGROUND_SPEED_AUTO : speed;
    if (this.active && (changed || !was)) {
      this.ensure();
      this.layout();
    }
    this.container.visible = this.active;
  }

  // The design's colors and seed.
  setDesign(colors: BackgroundColors, seed: number): void {
    const v = bgValues();
    const put = (dst: Float32Array, c: readonly number[]): void => {
      dst[0] = c[0];
      dst[1] = c[1];
      dst[2] = c[2];
    };
    put(v.uInk, colors.ink);
    put(v.uA1, colors.accents[0]);
    put(v.uA2, colors.accents[1]);
    put(v.uA3, colors.accents[2]);
    const [sx, sy] = backgroundSeedOffset(seed);
    v.uParams[0] = sx;
    v.uParams[1] = sy;
    this.clock.dirty = true;
  }

  // The shape params (K79 stage B): scale and detail for every effect,
  // fibers and grain for vellum, the angle for silk. Garbage reads as the
  // defaults (sanitizeBackgroundShape). At the defaults every effect draws
  // with its own K21 program; see needsShapeProgram.
  setShape(shape: BackgroundShape): void {
    const s = sanitizeBackgroundShape(shape);
    const o = this.shape;
    if (
      s.scale === o.scale &&
      s.detail === o.detail &&
      s.fibers === o.fibers &&
      s.grain === o.grain &&
      s.angle === o.angle
    ) {
      return;
    }
    const rescaled = s.scale !== o.scale;
    this.shape = s;
    const v = bgValues();
    v.uShape[0] = 1 / s.scale;
    v.uShape[1] = detailGain(s.detail);
    v.uShape[2] = s.fibers;
    v.uShape[3] = s.grain;
    v.uShape2[0] = silkAngleUniform(s.angle);
    this.clock.dirty = true;
    if (rescaled && this.active) this.layout();
  }

  // The screen (CSS px) changed.
  resize(w: number, h: number): void {
    this.screenW = Math.max(1, w);
    this.screenH = Math.max(1, h);
    const v = bgValues();
    v.uView[0] = this.screenW;
    v.uView[1] = this.screenH;
    v.uView[2] = 1 / Math.min(this.screenW, this.screenH);
    const s = screenUniforms().uniforms as unknown as { uBgScreen: Float32Array };
    s.uBgScreen[0] = 1 / this.screenW;
    s.uBgScreen[1] = 1 / this.screenH;
    if (this.active) this.layout();
    this.clock.dirty = true;
  }

  // One frame: advance the drift and re-render the texture when due.
  // sceneActive: anything else on screen animated this frame (the K24
  // pause policy). Returns true when the background changed.
  tick(dt: number, sceneActive: boolean): boolean {
    if (!this.active) return false;
    const prof = BACKGROUND_PROFILES[this.effect as Exclude<BackgroundId, "none">];
    const drift = this.reducedMotion ? 0 : backgroundDrift(this.effect, this.speed);
    const fps = this.phone ? prof.phoneFps : prof.fps;
    if (!this.clock.tick(dt, drift, fps, sceneActive, this.pauseWhenStatic)) {
      return false;
    }
    this.renderTexture();
    return true;
  }

  // K24/K6 hook: would the next frame show a different background? (A
  // render-on-demand loop asks every vsync; false lets it skip drawing as
  // far as the background is concerned.)
  needsFrame(frameDt = 1 / 60): boolean {
    return this.active && this.clock.needsFrame(frameDt);
  }

  // Re-render now, whatever the clock says (probes, forced refresh).
  renderTexture(): void {
    if (!this.active) return;
    this.ensure();
    const program = this.currentProgram();
    if (program !== this.program) {
      this.quad!.shader = effectShader(program);
      this.program = program;
    }
    bgValues().uView[3] = this.clock.time;
    this.renderer.render({
      container: this.scene!,
      target: this.rt!,
      clear: false,
    });
    this.stats.renders++;
  }

  // Lazily build the page-lifetime pieces.
  private ensure(): RenderTexture {
    if (!this.rt) {
      this.rt = RenderTexture.create({
        width: 4,
        height: 4,
        resolution: 1,
        dynamic: true,
        antialias: false,
        scaleMode: "linear",
        autoGenerateMipmaps: false,
      });
      this.program = this.currentProgram();
      this.quad = quadMesh(effectShader(this.program));
      this.scene = new Container();
      this.scene.addChild(this.quad);
      const blitShader = Shader.from({
        gl: { vertex: QUAD_VERT, fragment: BLIT_FRAG, name: "bg-blit" },
        resources: {
          uBgTex: this.rt.source,
          uBgSampler: this.rt.source.style,
        },
      }) as TexShader;
      blitShader.texture = this.rt;
      this.blit = quadMesh(blitShader);
      // Opaque, the first draw over the cleared canvas: no blending.
      this.blit.blendMode = "none";
      this.container.addChild(this.blit);
      this.layout();
    }
    return this.rt;
  }

  // The program for the current effect, drift time and shape.
  private currentProgram(): string {
    if (!this.active) return effectProgram("mist", this.clock.time);
    return effectProgram(
      this.effect,
      this.clock.time,
      needsShapeProgram(this.effect, this.shape)
    );
  }

  // Size the render texture for the current effect + screen, and the blit.
  // A pattern drawn smaller than designed (backgroundScale < 1) gets
  // proportionally more texels, up to one per CSS px: the same sharpness.
  private layout(): void {
    if (!this.rt || !this.quad || !this.blit || !this.active) return;
    const prof = BACKGROUND_PROFILES[this.effect as Exclude<BackgroundId, "none">];
    const base = this.phone ? prof.phoneScale : prof.scale;
    const scale =
      this.shape.scale < 1 ? Math.max(base, Math.min(1, base / this.shape.scale)) : base;
    const w = Math.max(1, Math.min(RT_MAX, Math.ceil(this.screenW * scale)));
    const h = Math.max(1, Math.min(RT_MAX, Math.ceil(this.screenH * scale)));
    if (this.rt.width !== w || this.rt.height !== h) this.rt.resize(w, h, 1);
    this.stats.rtW = w;
    this.stats.rtH = h;
    setQuad(this.quad, 0, 0, w, h);
    setQuad(this.blit, 0, 0, this.screenW, this.screenH);
    this.clock.dirty = true;
  }
}

// THE FOG BACKDROP (fog of war over a shader background): the fog sprite
// paints a flat color, which over an effect would show as a flat square
// with flat blots - so with a background active the fog draws the
// background itself (FOG_FRAG). Built by FabricMazeRenderer.ensureFog
// beside its flat sprite; exactly one of the two is visible.
export class FogBackdrop {
  readonly mesh: Mesh;
  private readonly shader: TexShader;
  private readonly values: { uFogRect: Float32Array; uFogDisp: Float32Array };

  constructor(
    fogTex: Texture,
    dispTex: Texture,
    rect: { x0: number; y0: number; span: number },
    wobblePx: number
  ) {
    const fogUniforms = new UniformGroup({
      uFogRect: {
        value: new Float32Array([rect.x0, rect.y0, 1 / rect.span, wobblePx]),
        type: "vec4<f32>",
      },
      uFogDisp: {
        value: new Float32Array([rect.x0, rect.y0, 1 / rect.span, 0]),
        type: "vec4<f32>",
      },
    });
    this.values = fogUniforms.uniforms as unknown as {
      uFogRect: Float32Array;
      uFogDisp: Float32Array;
    };
    this.shader = Shader.from({
      gl: { vertex: FOG_VERT, fragment: FOG_FRAG, name: "bg-fog" },
      resources: {
        uFogTex: fogTex.source,
        uFogSampler: fogTex.source.style,
        uDispTex: dispTex.source,
        uDispSampler: dispTex.source.style,
        uBgTex: Texture.EMPTY.source,
        uBgSampler: Texture.EMPTY.source.style,
        fogUniforms,
        screenUniforms: screenUniforms(),
      },
    }) as TexShader;
    this.shader.texture = fogTex;
    this.mesh = quadMesh(this.shader);
    setQuad(this.mesh, rect.x0, rect.y0, rect.span, rect.span);
    this.mesh.visible = false;
  }

  // The background texture to show (null: none - the mesh stays hidden).
  setBackground(tex: Texture | null): void {
    const src = (tex ?? Texture.EMPTY).source;
    if (this.shader.resources.uBgTex !== src) {
      this.shader.resources.uBgTex = src;
      this.shader.resources.uBgSampler = src.style;
    }
  }

  // The drifting displacement map's world origin (the flat fog's map
  // sprite position).
  setDispOrigin(x: number, y: number): void {
    this.values.uFogDisp[0] = x;
    this.values.uFogDisp[1] = y;
  }
}
