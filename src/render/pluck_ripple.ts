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
import {
  Filter,
  GlProgram,
  Rectangle,
  UniformGroup,
  type Container,
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
    if (abs(x) > 3.0) continue;
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

  // `target`: the world container the filter goes on; `screen`: the
  // canvas's logical size (the filter covers the whole screen, so the ring
  // look draws over the backdrop too).
  constructor(target: Container, screen: () => { width: number; height: number }) {
    this.target = target;
    this.screen = screen;
    const uniforms = new UniformGroup({
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
    this.values = uniforms.uniforms as unknown as RippleValues;
    this.filter = new Filter({
      glProgram: GlProgram.from({ vertex: VERT, fragment: FRAG, name: "pluck-ripple" }),
      resources: { rippleUniforms: uniforms },
      // The world is drawn into the filter's texture: at the canvas's own
      // resolution and MSAA, or a ripple would blur and alias the threads.
      resolution: "inherit",
      antialias: "inherit",
      padding: 0,
    });
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
    let n = 0;
    for (const r of this.live) {
      if (r.t < 0) continue;
      const u = Math.min(1, r.t / RIPPLE_LIFE);
      const env = Math.min(1, r.t / RIPPLE_ATTACK) * (1 - u) * (1 - u);
      const radius = RIPPLE_RADIUS * (1 - (1 - u) ** 3);
      const band = RIPPLE_BAND0 + (RIPPLE_BAND1 - RIPPLE_BAND0) * u;
      const s = r.strength * env;
      const k = n * 4;
      v.uRip[k] = sx * r.x + tx;
      v.uRip[k + 1] = sy * r.y + ty;
      v.uRip[k + 2] = radius * scale;
      v.uRip[k + 3] = Math.max(1, band * scale);
      v.uAmp[k] = r.look === "wave" ? RIPPLE_DISP * scale * s : 0;
      v.uAmp[k + 1] =
        r.look === "glint" ? GLINT_MIX * s : r.look === "wave" ? GLINT_MIX * WAVE_GLINT * s : 0;
      v.uAmp[k + 2] = r.look === "ring" ? Math.min(1, RING_ALPHA * s) : 0;
      v.uAmp[k + 3] = 0;
      n++;
    }
    v.uCount = n;
    const want = n > 0;
    if (want) {
      // Cover the whole screen, in the world container's coordinates.
      const sc = this.screen();
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
