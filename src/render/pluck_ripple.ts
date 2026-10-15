// K279 PLUCK RIPPLES (stage 1 prototype; brief docs/design/K279.md). Levi,
// 2026-10-14: "a new non-physics-based shock-wave/ripple sort of
// undulation sort of effect around pluck points", subtler for auto plucks.
//
// A ripple is a ring that leaves the pluck point, slows as it spreads
// (ease-out to RIPPLE_RADIUS world units) and fades over RIPPLE_LIFE
// seconds. It is drawn by ONE page-lifetime pixi Filter on the world
// container (main.ts `root`: the threads, the gameplay overlay and the
// pluck overlay; the backdrop is not inside it). The filter is ATTACHED
// ONLY WHILE A RIPPLE LIVES, so with no ripple (or the look off) the scene
// renders exactly as before. Render-only: it never touches the physics.
//
// Looks (pluckRipple):
//   wave  - the world bends: a radial displacement band at the front (an
//           odd profile x e^{-x^2}, so the band reads as a moving lens),
//           plus a faint brightening on the crest;
//   glint - no bending: the crest brightens the threads it passes;
//   ring  - a white annulus over everything, threads and backdrop alike.
// Strength (rippleStrength for taps and releases, rippleAuto for auto
// plucks) scales the displacement, the glint and the ring's opacity.
//
// K279 stage 2: a ripple whose disc cannot reach the screen is not drawn
// (it adds nothing to any pixel), so the filter detaches while every live
// ripple is off-screen. warm() moves the first ripple's one-time cost (the
// program's link and the filter's pooled screen-sized texture) to load:
// see WARM_FRAMES. And on a small view (a phone) the whole ripple scales
// up so that its front ends at RIPPLE_FLOOR_CSS px at least.
import {
  Container,
  Filter,
  GlProgram,
  Rectangle,
  UniformGroup,
} from "pixi.js";
import type { PluckRipple } from "./pluck_model";

// Ripples at once; a new one past the cap replaces the oldest.
export const RIPPLE_MAX = 8;
// Seconds a ripple lives.
export const RIPPLE_LIFE = 0.9;
// Seconds the ripple takes to fade in (a pop in one frame reads as a flash).
const RIPPLE_ATTACK = 0.06;
// World units the front travels (ease-out) over its life.
export const RIPPLE_RADIUS = 3.6;
// The front band's half width, world units, at birth and at the end.
const RIPPLE_BAND0 = 0.45;
const RIPPLE_BAND1 = 0.9;
// Peak radial displacement of the wave look, world units, at strength 1.
export const RIPPLE_DISP = 0.18;
// The wave look's crest glint, relative to the glint look's.
const WAVE_GLINT = 0.3;
// The glint look's peak mix toward white at strength 1.
const GLINT_MIX = 0.45;
// The ring look's peak opacity at strength 1 (capped at 1).
const RING_ALPHA = 0.3;
// The shader skips a pixel more than this many band half widths from a
// ripple's front, so a disc reaches radius + REACH_BANDS x band.
const REACH_BANDS = 3;
// K279 stage 2 (K289 d): the smallest radius, CSS px, a ripple's front ends
// at. Below it the whole ripple (front, band and the wave's displacement)
// scales up by one factor. A phone's default view (~8.8 CSS px per world)
// would end it at 32 px, 5.6 mm on a Pixel 11: its strong first half then
// stays under the lifting fingertip (~5 mm), and it subtends about half the
// angle of the desktop ripple Levi picked. 56 px matches that angle (80 CSS
// px at ~60 cm against a phone CSS px, ~1.3-1.5x the angle at ~30 cm) and
// clears 5 mm at 0.19 s, at 63% strength (0.47 s and 23% without). A
// default desktop view (22 CSS px per world: 80 px) never reaches it.
export const RIPPLE_FLOOR_CSS = 56;
// K279 stage 2 (K289 a): ticks the warm-up box stays on the stage. main.ts
// ticks before pixi renders in the same frame, so 3 ticks draw it twice.
const WARM_FRAMES = 3;

const VERT = `in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

void main(void) {
  gl_Position = filterVertexPosition();
  vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
}
`;

const FRAG = `precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uInputClamp;

// Per ripple: (center x, center y, front radius, band half width), screen
// px; (displacement px, glint mix, ring alpha, unused).
uniform vec4 uRip[${RIPPLE_MAX}];
uniform vec4 uAmp[${RIPPLE_MAX}];
uniform float uCount;

void main(void) {
  vec2 px = uOutputFrame.xy + vTextureCoord * uInputSize.xy;
  vec2 off = vec2(0.0);
  float glint = 0.0;
  float ring = 0.0;
  for (int i = 0; i < ${RIPPLE_MAX}; i++) {
    if (float(i) >= uCount) break;
    vec4 r = uRip[i];
    vec4 a = uAmp[i];
    vec2 d = px - r.xy;
    float dist = length(d);
    float x = (dist - r.z) / r.w;
    if (abs(x) > ${REACH_BANDS.toFixed(1)}) continue;
    float g = exp(-x * x);
    // x e^{-x^2} peaks at 0.4289 (x = 0.7071): normalized to 1.
    float wave = x * g / 0.4289;
    // Fade the bend near the center, where the radial direction tears.
    float near = smoothstep(0.0, r.w, dist);
    off -= (dist > 1e-4 ? d / dist : vec2(0.0)) * (a.x * wave * near);
    glint = max(glint, a.y * g * near);
    ring = max(ring, a.z * exp(-3.0 * x * x));
  }
  vec2 uv = clamp(vTextureCoord + off * uInputSize.zw, uInputClamp.xy, uInputClamp.zw);
  vec4 c = texture(uTexture, uv);
  // Premultiplied: brighten toward white where there is material.
  c.rgb = mix(c.rgb, vec3(c.a), glint);
  finalColor = vec4(ring) + c * (1.0 - ring);
}
`;

// K307 WARM-UP: the ripple's program, for the warm-up registry
// (program_registry.ts). GlProgram.from caches by source.
export function rippleProgram(): GlProgram {
  return GlProgram.from({ vertex: VERT, fragment: FRAG, name: "pluck-ripple" });
}

interface Ripple {
  // World point (the world container's local coordinates).
  x: number;
  y: number;
  // Seconds since it started (negative while delayed).
  t: number;
  strength: number;
  look: Exclude<PluckRipple, "off">;
}

interface RippleValues {
  uRip: Float32Array;
  uAmp: Float32Array;
  uCount: number;
}

// The filter's uniforms: one ripple slot table.
function rippleUniforms(): UniformGroup {
  return new UniformGroup({
    uRip: {
      value: new Float32Array(RIPPLE_MAX * 4),
      type: "vec4<f32>",
      size: RIPPLE_MAX,
    },
    uAmp: {
      value: new Float32Array(RIPPLE_MAX * 4),
      type: "vec4<f32>",
      size: RIPPLE_MAX,
    },
    uCount: { value: 0, type: "f32" },
  });
}

// Whether a disc of radius `reach` px around (x, y) px touches the screen
// rectangle [0, w] x [0, h] (one px of slack).
export function discOnScreen(x: number, y: number, reach: number, w: number, h: number): boolean {
  const r = reach + 1;
  return x + r >= 0 && x - r <= w && y + r >= 0 && y - r <= h;
}

export class PluckRipples {
  // The look new ripples take; "off" adds none (live ones finish).
  look: PluckRipple = "off";
  // Reduced motion: no ripples (K53's Motion setting).
  reducedMotion = false;
  // Probe hook (__knotRipple): hold every ripple's clock.
  paused = false;
  private readonly live: Ripple[] = [];
  private readonly filter: Filter;
  private readonly values: RippleValues;
  private attached = false;
  private readonly area = new Rectangle();
  private readonly target: Container;
  private readonly screen: () => { width: number; height: number };
  // The warm-up (warm()): an empty box under its own copy of the filter,
  // on the stage for WARM_FRAMES ticks. Page-lifetime: never destroyed.
  private warmBox: Container | null = null;
  private warmFrames = 0;

  // `target`: the world container the filter goes on; `screen`: the
  // canvas's logical size (the filter covers the whole screen, so the ring
  // look draws over the backdrop too).
  constructor(target: Container, screen: () => { width: number; height: number }) {
    this.target = target;
    this.screen = screen;
    const uniforms = rippleUniforms();
    this.values = uniforms.uniforms as unknown as RippleValues;
    this.filter = PluckRipples.newFilter(uniforms);
  }

  private static newFilter(uniforms: UniformGroup): Filter {
    return new Filter({
      // GlProgram.from caches by source: the warm-up's copy links the very
      // program the ripples draw with.
      glProgram: rippleProgram(),
      resources: { rippleUniforms: uniforms },
      // The world is drawn into the filter's texture: at the canvas's own
      // resolution and MSAA, or a ripple would blur and alias the threads.
      resolution: "inherit",
      antialias: "inherit",
      padding: 0,
    });
  }

  // K279 stage 2 (K289 a): pay the first ripple's one-time cost at load.
  // The first tap's first frame spent 30-36 ms more in pixi's tick than a
  // later tap's: the program's first link (K307: ~14.5 ms cold) and the
  // filter's first pooled texture, screen-sized with the canvas's MSAA.
  // An EMPTY box on `stage`, under a copy of the filter (the same program,
  // no ripples: uCount 0) with a screen-sized filterArea, makes pixi do
  // both for WARM_FRAMES ticks. Its input is cleared to transparent and
  // the shader returns it unchanged, so the frame's pixels do not move.
  // The texture goes back to pixi's pool, sized and keyed as the first
  // ripple's (a resize before the first ripple allocates again).
  warm(stage: Container): void {
    if (this.warmBox) return;
    const box = new Container();
    const sc = this.screen();
    box.filters = [PluckRipples.newFilter(rippleUniforms())];
    box.filterArea = new Rectangle(0, 0, sc.width, sc.height);
    stage.addChild(box);
    this.warmBox = box;
    this.warmFrames = WARM_FRAMES;
  }

  // Ripples alive or waiting on their delay.
  get activeCount(): number {
    return this.live.length;
  }

  // Start a ripple at a world point. `delay` seconds hold it back (an auto
  // pluck lines up with its sound). False when nothing starts.
  add(x: number, y: number, strength: number, delay = 0): boolean {
    if (this.look === "off" || this.reducedMotion || !(strength > 0)) return false;
    if (this.live.length >= RIPPLE_MAX) this.live.shift();
    this.live.push({ x, y, t: -Math.max(0, delay), strength, look: this.look });
    return true;
  }

  // Drop every ripple (a new scene), detaching the filter.
  clear(): void {
    this.live.length = 0;
    this.sync();
  }

  // Probe hook (__knotRipple): set every live ripple's time, seconds.
  setTime(t: number): void {
    for (const r of this.live) r.t = t;
    this.sync();
  }

  // Advance by dt wall seconds and write this frame's uniforms, after the
  // camera's step. Runs every frame in every ticker branch.
  tick(dt: number): void {
    if (this.warmBox && --this.warmFrames <= 0) {
      this.warmBox.parent?.removeChild(this.warmBox);
      this.warmBox = null;
    }
    if (this.live.length === 0) {
      if (this.attached) this.sync();
      return;
    }
    const step = this.paused ? 0 : dt;
    for (let i = this.live.length - 1; i >= 0; i--) {
      this.live[i].t += step;
      if (this.live[i].t >= RIPPLE_LIFE) this.live.splice(i, 1);
    }
    this.sync();
  }

  private sync(): void {
    const v = this.values;
    // The world container is a direct child of the stage with a position
    // and a uniform scale (main.ts's camera), read as set this frame (its
    // worldTransform updates only when the stage renders).
    const sx = this.target.scale.x;
    const sy = this.target.scale.y;
    const tx = this.target.position.x;
    const ty = this.target.position.y;
    // Screen px per world unit.
    const scale = sx;
    // RIPPLE_FLOOR_CSS's factor: exactly 1 at the floor and above, so a
    // larger view's uniforms are bit for bit what they were without it.
    const grow = scale > 0 ? Math.max(1, RIPPLE_FLOOR_CSS / (RIPPLE_RADIUS * scale)) : 1;
    const sc = this.screen();
    let n = 0;
    for (const r of this.live) {
      if (r.t < 0) continue;
      const u = Math.min(1, r.t / RIPPLE_LIFE);
      const env = Math.min(1, r.t / RIPPLE_ATTACK) * (1 - u) * (1 - u);
      const radius = RIPPLE_RADIUS * (1 - (1 - u) ** 3);
      const band = RIPPLE_BAND0 + (RIPPLE_BAND1 - RIPPLE_BAND0) * u;
      const s = r.strength * env;
      const cx = sx * r.x + tx;
      const cy = sy * r.y + ty;
      const rPx = radius * scale * grow;
      const bPx = Math.max(1, band * scale * grow);
      // A disc wholly off-screen changes no pixel: leave it out (it still
      // ages, and draws again if the camera brings it back).
      if (!discOnScreen(cx, cy, rPx + REACH_BANDS * bPx, sc.width, sc.height)) continue;
      const k = n * 4;
      v.uRip[k] = cx;
      v.uRip[k + 1] = cy;
      v.uRip[k + 2] = rPx;
      v.uRip[k + 3] = bPx;
      v.uAmp[k] = r.look === "wave" ? RIPPLE_DISP * scale * grow * s : 0;
      v.uAmp[k + 1] =
        r.look === "glint" ? GLINT_MIX * s : r.look === "wave" ? GLINT_MIX * WAVE_GLINT * s : 0;
      v.uAmp[k + 2] = r.look === "ring" ? Math.min(1, RING_ALPHA * s) : 0;
      v.uAmp[k + 3] = 0;
      n++;
    }
    v.uCount = n;
    const want = n > 0;
    if (want) {
      // Cover the whole screen, in the world container's coordinates. Not
      // the discs alone: the world is drawn ONLY into the filter's texture,
      // so a smaller area clips every thread outside it (K279 stage 2;
      // docs/design/K279.md, "Stage 2 handoff").
      this.area.x = -tx / sx;
      this.area.y = -ty / sy;
      this.area.width = sc.width / sx;
      this.area.height = sc.height / sy;
      this.target.filterArea = this.area;
    }
    if (want !== this.attached) {
      this.attached = want;
      this.target.filters = want ? [this.filter] : null;
    }
  }
}
