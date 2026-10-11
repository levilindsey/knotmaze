// RENDER-ONLY PLUCKS: the "time-exposure string" overlay. A tap or an auto
// pluck never touches the physics - no grab, no drag, no wake. The plucked
// thread's UNIT (fabric: the walk run under the tap, capped at +-6 lobes;
// knot: the tapped lobe +-2) is drawn over the finished weave as one strip
// mesh whose fragment shader computes the vibrating string's exact
// time-averaged coverage (render/pluck_model.ts), plus a faint strobe ghost
// for speed. Nothing else is re-solved: the overlay never calls the
// renderer's update(), and its per-frame cost is one small buffer write.
//
// THE FOUR WEAVE RULES (why crossings stay pixel-static):
//  1. The overlay layer sits ABOVE every ribbon, erase, fillet and fill.
//  2. Footprints are never modified. The plucked thread's BASE ribbon is
//     narrowed only outside every node footprint, and only to the width the
//     overlay's opaque core covers for the whole ring (collapse mask, fixed
//     at pluck start - amplitude only decreases). Over-fill windows copy
//     base vertices only inside footprints, so they never see it.
//  3. Under-gaps: per-station alpha is the renderer's underGapVisibility -
//     the overlay vanishes where its thread dives, exactly like the yarn.
//  4. Under-node partner clip: near a node where the plucked thread goes
//     UNDER, overlay pixels inside the partner's casing band are discarded,
//     so lateral blur tucks under the partner instead of painting over it.
//     (At over-nodes the overlay is SUPPOSED to draw over the partner.)
// Soft nodes keep the overlay's core opaque inside footprints (amplitude
// under 0.9 h there), where the static thread is still drawn beneath.

import {
  Buffer,
  BufferUsage,
  Container,
  Mesh,
  MeshGeometry,
  Shader,
  Texture,
  UniformGroup,
} from "pixi.js";
import type { SplineSamples } from "../geometry/spline_generator";
import {
  ATTACK_MIX,
  GHOST_HZ,
  GHOST_JITTER,
  GHOST_TINT,
  KILL_PX,
  NODE_SLOPE,
  ONSET_STAGGER,
  CLEAR_OVERLAP,
  clampBeta,
  envelope,
  ghostShape,
  nodeCap,
  peakShape,
  roundTau,
  segmentLobes,
  softMin,
  sympatheticAmplitude,
  tapAmplitude,
  visualTau,
} from "./pluck_model";

// A node the plucked thread passes (see the model's NODES AND LOBES).
export interface PluckNode {
  arc: number; // Arc along the chain, in [0, total].
  footNeg: number; // Static-footprint half-length toward -arc...
  footPos: number; // ...and toward +arc.
  // Arc radius around the node where the overlay HIDES and the static
  // render shows as-is (junction webs, marker gaps); 0 = none.
  hide: number;
  under: boolean; // The plucked thread dives UNDER a partner here.
  // The partner's centerline near the node, as a line [x, y, dx, dy] (unit
  // direction) - the under-node clip (rule 4). null at over / other nodes.
  line: [number, number, number, number] | null;
  key: number; // Stable identity on the chain (re-plucks merge by it).
}

// What the overlay needs from the ribbon renderer.
export interface PluckHost {
  halfWidth(): number;
  // Partner band the under-node clip hides: partner half-width + gap.
  casing(): number;
  samples(chain: number): SplineSamples | null;
  allSamples(): ReadonlyArray<SplineSamples | null>;
  closed(chain: number): boolean;
  nodes(chain: number): PluckNode[];
  sampleAt(
    samples: SplineSamples,
    arc: number,
    out: Float32Array,
    offset: number
  ): void;
  // Rule 3: 0 inside this chain's under-gaps, ramping to 1 past them.
  visibility(chain: number, arc: number): number;
  // The thread's composed color at an arc (section color + live gameplay
  // paint in fabric mode, the chain tint in knot mode), 0..1 RGB.
  color(chain: number, arc: number, out: Float32Array): void;
  // True when this frame's colors are static (knot mode): computed once
  // per layout instead of every frame.
  staticColors(): boolean;
  viewScale(): number; // CSS px per world unit.
  // A chain mid-reveal / mid-FX (plucks there are sound-only).
  hot(chain: number): boolean;
  // Install (or clear) a chain's base-ribbon width multiplier; the host
  // re-extrudes that one chain at once and composes it in update().
  setCollapse(chain: number, mul: Float32Array | null): void;
  geomRev(): number;
  baseSampleCount(chain: number): number;
}

export interface PluckRequest {
  chain: number;
  arc: number; // Where along the chain it was plucked.
  side: number; // +1 = the left normal (-ty, tx) side, -1 the other.
  gain: number; // Amplitude multiplier (tap 1; auto 0.75-1.25; drag 0.6-1.4).
  freq: number; // The segment's pitch: the decay clock follows the voice.
  reach: number; // Lobes kept each side of the plucked one.
  span?: [number, number] | null; // Unwrapped arc span (the walk run).
  beta?: number; // Pluck position in its lobe (default: from `arc`).
  delay?: number; // Seconds before the visual starts (audio latency).
  // An arc the unit must not contain (a particle the user is holding):
  // when it does, the pluck stays sound-only.
  avoidArc?: number;
}

// Station budget per pluck strip (node stations are duplicated at lobe
// boundaries so each lobe carries its own clip attributes).
const MAX_STATIONS = 480;
const STATION_DS = 0.07; // Target station spacing, world arc.
const MIN_LOBE_STATIONS = 8;
const LOBE_MIN_LEN = 0.05; // Shorter node pairs are not lobes.
const POOL_MAX = 8; // Simultaneous live plucks; the oldest is evicted.
const EVICT_TIME = 0.05; // Seconds an evicted pluck takes to damp out.
const STRIP_PAD = 0.04; // World margin past the swept edge (AA ramp).
const COLLAPSE_PAD = 0.02; // Base kept this far inside the overlay's core.
// The base collapse RAMPS IN over this much arc past a footprint, never
// stepping: a one-sample step from the intact thread to its narrowed width
// exposed the time exposure's translucent edge along a ragged line. Within
// the ramp the swing stays under NODE_CORE h, so the (wider) base never
// shows through a translucent center.
const COLLAPSE_RAMP = 0.3;
const HIDE_RAMP = 0.1; // Arc over which a hide zone fades back in.
// Ghost flash guard (WCAG 2.3.1): the ghost's on-screen area is capped.
const GHOST_AREA_PX = 15000;
// Under-node clip reach along the partner (world).
const CLIP_REACH = 1.5;
// Clearance measurement: neighbor search margin (world, past the swing).
const CLEAR_MARGIN = 0.6;
// Stations around a too-tight bend that keep the base intact (and so the
// swing under NODE_CORE h).
const TIGHT_K = 2;
// The concave-side swing cap may change by at most this much per unit of
// arc. The raw cap (0.9 x the local radius, minus the thread) follows a
// noisy curvature estimate, and at a tight loop it jumped 0.06 -> 0.52
// world within two stations; the envelope and the strip edge follow the
// cap, so every jump drew a radial crease through the blur and a ragged
// rim around the loop's eye. Limiting only ever LOWERS a cap, and the cap
// exists only to keep the strip from folding, so this is always safe.
const CAP_SLOPE = 1.0;

// In place, per lobe: v[i] = min over j of v[j] + slope * |arc[i] - arc[j]|
// (a two-pass running min; Infinity stays Infinity until a finite value
// spreads in).
function slopeLimit(
  v: Float32Array,
  arc: Float32Array,
  lobeOf: Int16Array,
  n: number,
  slope: number
): void {
  for (let i = 1; i < n; i++) {
    if (lobeOf[i] !== lobeOf[i - 1]) continue;
    const c = v[i - 1] + slope * Math.abs(arc[i] - arc[i - 1]);
    if (c < v[i]) v[i] = c;
  }
  for (let i = n - 2; i >= 0; i--) {
    if (lobeOf[i] !== lobeOf[i + 1]) continue;
    const c = v[i + 1] + slope * Math.abs(arc[i + 1] - arc[i]);
    if (c < v[i]) v[i] = c;
  }
}

const PLUCK_VERT = /* glsl */ `#version 300 es
precision highp float;

in vec2 aPosition;
in vec2 aUV;
in vec2 aEnv;
in vec4 aAux;
in vec3 aCol;
in vec4 aClipA;
in vec4 aClipB;
in vec2 aClipF;

out float vLat;
out vec2 vEnv;
out vec4 vAux;
out vec3 vCol;
out vec2 vPos;
out vec4 vClipA;
out vec4 vClipB;
out vec2 vClipF;
out vec4 vColor;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform mat3 uTransformMatrix;
uniform vec4 uColor;

void main(void) {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vLat = aUV.x;
  vEnv = aEnv;
  vAux = aAux;
  vCol = aCol;
  vPos = aPosition;
  vClipA = aClipA;
  vClipB = aClipB;
  vClipF = aClipF;
  vColor = uColor * uWorldColorAlpha;
}
`;

// aUV.x = lateral offset from the REST centerline (world, linear across the
// strip); aEnv = the swept interval [lo, hi]; aAux = (attack double-image
// mix m, ghost offset, ghost alpha, visibility); aCol = the thread color.
// Output is premultiplied (pixi's normal blend). At zero amplitude the
// coverage is exactly an anti-aliased band - the plain thread.
const PLUCK_FRAG = /* glsl */ `#version 300 es
precision highp float;

in float vLat;
in vec2 vEnv;
in vec4 vAux;
in vec3 vCol;
in vec2 vPos;
in vec4 vClipA;
in vec4 vClipB;
in vec2 vClipF;
in vec4 vColor;

out vec4 finalColor;

// (half-width h, partner casing band, ghost tint, unused)
uniform vec4 uPluck;

const float PI = 3.141592653589793;

// Integral of the arcsine CDF on [lo, hi]: 0 below, r at hi, slope 1
// beyond. Differencing it box-filters the dwell density over the pixel.
float G(float y, float lo, float hi) {
  float r = 0.5 * (hi - lo);
  float c = 0.5 * (hi + lo);
  if (r < 1e-6) return max(0.0, y - c);
  float t = (y - c) / r;
  if (t <= -1.0) return 0.0;
  if (t >= 1.0) return r * t;
  return r * (0.5 * t + (t * asin(t) + sqrt(max(0.0, 1.0 - t * t))) / PI);
}

// Time-averaged coverage of a thread of half-width h whose centerline
// dwells on [lo, hi] with the arcsine density, over a pixel of width p.
float cover(float u, float h, float lo, float hi, float p) {
  float a = G(u + h + 0.5 * p, lo, hi) - G(u + h - 0.5 * p, lo, hi);
  float b = G(u - h + 0.5 * p, lo, hi) - G(u - h - 0.5 * p, lo, hi);
  return clamp((a - b) / p, 0.0, 1.0);
}

float band(float v, float h, float p) {
  return clamp((h - abs(v)) / p + 0.5, 0.0, 1.0);
}

// Rule 4: inside the partner's casing band near an UNDER node -> hidden.
// The partner is a straight line through the crossing, trusted only out
// to reach along it (it curves away beyond), fading over the last 0.2.
float clipAt(vec4 L, float reach, vec2 P, float px) {
  if (reach <= 0.0) return 1.0;
  vec2 d = P - L.xy;
  float along = abs(dot(d, L.zw));
  if (along > reach) return 1.0;
  float perp = abs(d.x * L.w - d.y * L.z);
  float k = clamp((perp - uPluck.y) / px + 0.5, 0.0, 1.0);
  return mix(k, 1.0, smoothstep(reach - 0.2, reach, along));
}

void main(void) {
  float h = uPluck.x;
  float p = max(length(vec2(dFdx(vLat), dFdy(vLat))), 1e-4);
  float lo = vEnv.x;
  float hi = vEnv.y;
  float m = vAux.x;
  float c = (1.0 - m) * cover(vLat, h, lo, hi, p)
          + 0.5 * m * (band(vLat - hi, h, p) + band(vLat - lo, h, p));
  float g = vAux.z * band(vLat - vAux.y, h, p);
  vec3 gc = mix(vCol, vec3(1.0), uPluck.z);
  vec3 rgb = gc * g + vCol * c * (1.0 - g);
  float a = g + c * (1.0 - g);
  float px = max(length(dFdx(vPos)), 1e-4);
  float k = clipAt(vClipA, vClipF.x, vPos, px) * clipAt(vClipB, vClipF.y, vPos, px);
  finalColor = vec4(rgb, a) * (vAux.w * k) * vColor;
}
`;

// Page-lifetime singletons (never destroyed: pixi's retained render state
// can reference them the frame after a rebuild - the PALETTE_CACHE lore).
let PLUCK_UNIFORMS: UniformGroup | null = null;
// Mesh.shader wants a TextureShader (a Shader carrying its texture); this
// one samples nothing, so it carries the WHITE placeholder.
type PluckShader = Shader & { texture: Texture };
let PLUCK_SHADER: PluckShader | null = null;
function pluckUniforms(): UniformGroup {
  if (!PLUCK_UNIFORMS) {
    PLUCK_UNIFORMS = new UniformGroup({
      uPluck: {
        value: new Float32Array([0.21, 0.4, GHOST_TINT, CLIP_REACH]),
        type: "vec4<f32>",
      },
    });
  }
  return PLUCK_UNIFORMS;
}
function pluckShader(): PluckShader {
  if (!PLUCK_SHADER) {
    const sh = Shader.from({
      gl: { vertex: PLUCK_VERT, fragment: PLUCK_FRAG, name: "pluck-blur" },
      resources: { pluckUniforms: pluckUniforms() },
    }) as PluckShader;
    sh.texture = Texture.WHITE;
    PLUCK_SHADER = sh;
  }
  return PLUCK_SHADER;
}

function vertexBuffer(data: Float32Array, label: string): Buffer {
  return new Buffer({
    data,
    label,
    usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
  });
}

// One pluck's strip: two vertices per station, quads between consecutive
// stations of the SAME lobe (rebuilt per layout - lobes need not be laid
// out adjacent, e.g. after a re-pluck merge; unused index slots are zero,
// i.e. degenerate). Every upload sends the WHOLE buffer (pixi remembers
// partial sizes - the PARTIAL BUFFER UPLOADS lore).
class PluckBlurMesh {
  readonly mesh: Mesh;
  readonly indices = new Uint32Array((MAX_STATIONS - 1) * 6);
  readonly pos = new Float32Array(MAX_STATIONS * 4);
  readonly uv = new Float32Array(MAX_STATIONS * 4);
  readonly env = new Float32Array(MAX_STATIONS * 4);
  readonly aux = new Float32Array(MAX_STATIONS * 8);
  readonly col = new Float32Array(MAX_STATIONS * 6);
  readonly clipA = new Float32Array(MAX_STATIONS * 8);
  readonly clipB = new Float32Array(MAX_STATIONS * 8);
  readonly clipF = new Float32Array(MAX_STATIONS * 4);
  // Per-station layout state (CPU only).
  readonly lobeOf = new Int16Array(MAX_STATIONS);
  readonly xOf = new Float32Array(MAX_STATIONS);
  readonly arcOf = new Float32Array(MAX_STATIONS);
  readonly fOf = new Float32Array(MAX_STATIONS); // Soft-node cap factor.
  readonly visOf = new Float32Array(MAX_STATIONS);
  readonly dsOf = new Float32Array(MAX_STATIONS); // Arc share (ghost area).
  // Concave-side swing caps (+normal / -normal side; Infinity = free).
  readonly capLOf = new Float32Array(MAX_STATIONS);
  readonly capROf = new Float32Array(MAX_STATIONS);
  // The strip's narrower (concave-side) half-extent per station: where it
  // is under the thread's own half-width the base must stay intact.
  readonly wInOf = new Float32Array(MAX_STATIONS);
  readonly pkOf = new Float32Array(MAX_STATIONS); // Capped peak swing.
  readonly tightOf = new Uint8Array(MAX_STATIONS); // Bend tighter than the strip.
  readonly tightAllow = new Float32Array(MAX_STATIONS); // Collapse allowance.
  used = 0;

  constructor() {
    const geometry = new MeshGeometry({
      positions: this.pos,
      uvs: this.uv,
      indices: this.indices,
    });
    const add = (name: string, data: Float32Array, n: 2 | 3 | 4): void => {
      geometry.addAttribute(name, {
        buffer: vertexBuffer(data, "attribute-" + name),
        format: n === 2 ? "float32x2" : n === 3 ? "float32x3" : "float32x4",
        stride: n * 4,
        offset: 0,
      });
    };
    add("aEnv", this.env, 2);
    add("aAux", this.aux, 4);
    add("aCol", this.col, 3);
    add("aClipA", this.clipA, 4);
    add("aClipB", this.clipB, 4);
    add("aClipF", this.clipF, 2);
    this.mesh = new Mesh({ geometry, shader: pluckShader(), texture: Texture.WHITE });
    this.mesh.visible = false;
  }

  upload(names: string[]): void {
    const g = this.mesh.geometry;
    for (const n of names) {
      const b = g.getBuffer(n);
      b.update(b.data.byteLength);
    }
  }

  // Quads between consecutive stations of one lobe only.
  writeQuads(): void {
    const ix = this.indices;
    ix.fill(0);
    let o = 0;
    for (let i = 0; i + 1 < this.used; i++) {
      if (this.lobeOf[i] !== this.lobeOf[i + 1]) continue;
      const a = i * 2;
      ix[o++] = a;
      ix[o++] = a + 1;
      ix[o++] = a + 2;
      ix[o++] = a + 1;
      ix[o++] = a + 3;
      ix[o++] = a + 2;
    }
    const b = this.mesh.geometry.getIndex();
    b.update(b.data.byteLength);
  }
}

interface Lobe {
  keyA: number; // Node keys (-1: a pseudo lobe on a node-less loop).
  keyB: number;
  s0: number; // Last resolved arcs (unwrapped, s0 < s1).
  s1: number;
  k: number; // Offset from the plucked lobe.
  A0: number; // Initial amplitude (world), clearance-capped.
  beta: number;
  attack: boolean; // Shows the parallelogram attack (the plucked lobe).
  onset: number; // Seconds after the pluck's clock starts.
  phase: number; // Ghost phase offset (lobes ring independently).
  footA: number;
  footB: number;
  hideA: number;
  hideB: number;
  lineA: [number, number, number, number] | null;
  lineB: [number, number, number, number] | null;
  dead: boolean;
  drawn: boolean; // Got stations in the last layout (only drawn lobes collapse).
  st0: number; // Its first station index in the strip...
  segs: number; // ...and its station intervals.
  // The VIBRATING span (unwrapped arcs): the lobe minus its end nodes'
  // hide zones - a junction core or marker gap hides the overlay, so the
  // string's effective fret sits where its hide ramp ends. The shape
  // (triangle, lens, ghost) is laid over this span, not node to node.
  e0: number;
  e1: number;
}

// The vibrating span of a node-to-node lobe [s0, s1] (see Lobe.e0/e1).
function vibratingSpan(
  s0: number,
  s1: number,
  hideA: number,
  hideB: number
): [number, number] {
  const e0 = s0 + (hideA > 0 ? hideA + HIDE_RAMP : 0);
  const e1 = s1 - (hideB > 0 ? hideB + HIDE_RAMP : 0);
  return [e0, Math.max(e0, e1)];
}

interface ActivePluck {
  id: number;
  chain: number;
  t: number;
  tau: number;
  tauR: number;
  side: number;
  freq: number;
  lobes: Lobe[];
  mesh: PluckBlurMesh;
  evicting: boolean;
  fade: number;
  layoutRev: number;
  needsLayout: boolean;
  mask: Float32Array | null; // This pluck's base collapse (per base sample).
  ghostArea: number; // Last frame's on-screen ghost area (px^2).
  amp: Float64Array; // Per-lobe scratch: this frame's amplitude...
  qv: Float64Array; // ...and overtone weight.
}

const smooth01 = (x: number): number => {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
};

export class PluckOverlay {
  readonly layer = new Container();
  // Live tuning (main.ts syncs these every tick, like cuspRadius).
  size = 1; // pluckSize: visual amplitude multiplier (0 = sound only).
  ghost = 0.35; // pluckGhost: strobe-ghost strength.
  sustain = 0.5; // The voice's sustain (decay clock).
  reducedMotion = false;
  // Diagnostics: plucks drawn, requests skipped (and why), merges, evictions.
  readonly stats = {
    plucks: 0,
    skipped: 0,
    merged: 0,
    evicted: 0,
    skipHot: 0, // Chain mid-reveal / mid-FX.
    skipCore: 0, // The plucked stretch lies inside junction cores.
    skipHeld: 0, // The unit holds a particle the user is dragging.
    skipOther: 0, // No samples / no lobes / pluckSize 0.
  };
  private host: PluckHost;
  private active: ActivePluck[] = [];
  private free: PluckBlurMesh[] = [];
  private nextId = 1;
  private ghostPhase = 0;
  private ghostClock = 0;
  private scratch = new Float32Array(4);
  private env2 = new Float64Array(2);
  private rgb = new Float32Array(3);
  // Per-chain combined collapse (min over that chain's plucks).
  private collapseOf = new Map<number, Float32Array>();
  // SHADER WARM-UP: the first pluck used to land ~100 ms late while the
  // GPU compiled the program; a pool mesh of degenerate triangles (zero
  // indices) is drawn for the first few frames to compile it up front.
  private warm: PluckBlurMesh | null = null;
  private warmFrames = 3;

  constructor(host: PluckHost) {
    this.host = host;
    this.warm = this.newMesh();
    this.warm.mesh.visible = true;
  }

  get activeCount(): number {
    return this.active.length;
  }

  // Diagnostic snapshot (probes): one row per live pluck.
  state(): Array<Record<string, unknown>> {
    return this.active.map((p) => ({
      id: p.id,
      chain: p.chain,
      t: +p.t.toFixed(3),
      tau: +p.tau.toFixed(3),
      side: p.side,
      evicting: p.evicting,
      stations: p.mesh.used,
      lobes: p.lobes.map((l) => ({
        k: l.k,
        s0: +l.s0.toFixed(3),
        s1: +l.s1.toFixed(3),
        A0: +l.A0.toFixed(4),
        beta: +l.beta.toFixed(3),
        attack: l.attack,
        keys: [l.keyA, l.keyB],
      })),
    }));
  }

  // Start a pluck. Returns false when it is sound-only (a chain mid-
  // reveal, no samples yet, nothing vibrates, or pluckSize 0).
  add(req: PluckRequest): boolean {
    const host = this.host;
    const samples = host.samples(req.chain);
    if (host.hot(req.chain)) {
      this.stats.skipped++;
      this.stats.skipHot++;
      return false;
    }
    if (!samples || samples.totalLength <= 0 || this.size <= 0) {
      this.stats.skipped++;
      this.stats.skipOther++;
      return false;
    }
    const closed = host.closed(req.chain);
    const total = samples.totalLength;
    const nodes = host.nodes(req.chain);
    const spans = segmentLobes(
      nodes.map((n) => n.arc),
      total,
      closed,
      req.arc,
      Math.max(0, Math.round(req.reach)),
      req.span ?? null
    ).filter((s) => s.s1 - s.s0 >= LOBE_MIN_LEN);
    const tapped = spans.find((s) => s.k === 0);
    const avoid = req.avoidArc;
    const holds = (s0: number, s1: number): boolean => {
      if (avoid === undefined) return false;
      for (const shift of closed ? [-total, 0, total] : [0]) {
        if (avoid + shift >= s0 && avoid + shift <= s1) return true;
      }
      return false;
    };
    if (!tapped) {
      this.stats.skipped++;
      this.stats.skipOther++;
      return false;
    }
    if (spans.some((s) => holds(s.s0, s.s1))) {
      this.stats.skipped++;
      this.stats.skipHeld++;
      return false;
    }
    const h = host.halfWidth();
    const reduced = this.reducedMotion;
    // Vibrating spans (hide zones trimmed) set the shape and amplitude.
    const span = (s: { a: number; b: number; s0: number; s1: number }): [number, number] =>
      vibratingSpan(
        s.s0,
        s.s1,
        s.a >= 0 ? nodes[s.a].hide : 0,
        s.b >= 0 ? nodes[s.b].hide : 0
      );
    const [t0, t1] = span(tapped);
    const tapLen = t1 - t0;
    if (tapLen < LOBE_MIN_LEN) {
      // The whole plucked stretch sits inside a junction core: sound only.
      this.stats.skipped++;
      this.stats.skipCore++;
      return false;
    }
    const beta = clampBeta(req.beta ?? (req.arc - t0) / tapLen);
    const aTap =
      tapAmplitude(tapLen, h, this.size, req.gain) * (reduced ? 0.6 : 1);
    const lobes: Lobe[] = spans.map((s) => {
      const nA = s.a >= 0 ? nodes[s.a] : null;
      const nB = s.b >= 0 ? nodes[s.b] : null;
      const [e0, e1] = span(s);
      const len = e1 - e0;
      const isTap = s.k === 0;
      return {
        e0,
        e1,
        keyA: nA ? nA.key : -1,
        keyB: nB ? nB.key : -1,
        s0: s.s0,
        s1: s.s1,
        k: s.k,
        A0: len >= LOBE_MIN_LEN ? sympatheticAmplitude(aTap, s.k, len, tapLen) : 0,
        beta: isTap ? beta : 0.5,
        attack: isTap && !reduced,
        onset: Math.abs(s.k) * ONSET_STAGGER,
        phase: Math.random() * Math.PI * 2,
        footA: nA ? nA.footPos : 0,
        footB: nB ? nB.footNeg : 0,
        hideA: nA ? nA.hide : 0,
        hideB: nB ? nB.hide : 0,
        lineA: nA && nA.under ? nA.line : null,
        lineB: nB && nB.under ? nB.line : null,
        dead: false,
        drawn: false,
        st0: 0,
        segs: 0,
      };
    });
    this.capClearance(req.chain, samples, lobes, h);

    // RE-PLUCK: a ringing unit that shares a lobe with this one is absorbed
    // - shared lobes restart their attack at max(current, new) amplitude
    // (a harp re-pluck damps and re-excites), its other lobes ride along
    // at their current amplitude.
    for (let i = this.active.length - 1; i >= 0; i--) {
      const old = this.active[i];
      if (old.chain !== req.chain || old.evicting) continue;
      const shares = old.lobes.some((ol) =>
        lobes.some((nl) => nl.keyA === ol.keyA && nl.keyB === ol.keyB && ol.keyA >= 0)
      );
      if (!shares) continue;
      for (const ol of old.lobes) {
        if (ol.dead) continue;
        const cur = this.amplitudeOf(old, ol);
        const match = lobes.find((nl) => nl.keyA === ol.keyA && nl.keyB === ol.keyB);
        if (match) {
          match.A0 = Math.max(match.A0, cur);
        } else if (cur > 0) {
          lobes.push({
            ...ol,
            A0: cur,
            onset: 0,
            attack: false,
          });
        }
      }
      this.stats.merged++;
      this.release(i, false);
    }

    // Pool: the oldest live pluck damps out over EVICT_TIME.
    const live = this.active.filter((p) => !p.evicting);
    if (live.length >= POOL_MAX) {
      live[0].evicting = true;
      this.stats.evicted++;
    }
    const tau = visualTau(req.freq, this.sustain) * (reduced ? 0.7 : 1);
    const pl: ActivePluck = {
      id: this.nextId++,
      chain: req.chain,
      t: -Math.max(0, req.delay ?? 0),
      tau,
      tauR: roundTau(tau),
      side: req.side >= 0 ? 1 : -1,
      freq: req.freq,
      lobes,
      mesh: this.free.pop() ?? this.newMesh(),
      evicting: false,
      fade: 1,
      layoutRev: -1,
      needsLayout: true,
      mask: null,
      ghostArea: 0,
      amp: new Float64Array(lobes.length),
      qv: new Float64Array(lobes.length),
    };
    lobes.sort((p, q) => p.s0 - q.s0);
    this.active.push(pl);
    if (!this.layout(pl)) {
      this.release(this.active.length - 1, true);
      this.stats.skipped++;
      this.stats.skipOther++;
      return false;
    }
    this.refreshCollapse(pl.chain);
    this.writeFrame(pl);
    pl.mesh.mesh.visible = true;
    this.stats.plucks++;
    return true;
  }

  // Advance every live pluck by dt (wall seconds). Runs in every ticker
  // branch; never calls the renderer's update().
  tick(dt: number): void {
    if (this.warm && --this.warmFrames <= 0) {
      this.warm.mesh.visible = false;
      this.free.push(this.warm);
      this.warm = null;
    }
    if (this.active.length === 0) return;
    const host = this.host;
    // Ghost cadence: at most one phase step per frame, GHOST_HZ in wall
    // time (a 120 Hz display holds each phase for two frames).
    this.ghostClock += dt;
    if (this.ghostClock >= 1 / GHOST_HZ - 1e-4) {
      this.ghostClock = Math.min(this.ghostClock - 1 / GHOST_HZ, 1 / GHOST_HZ);
      this.ghostPhase +=
        Math.PI * (1 + GHOST_JITTER * (2 * Math.random() - 1));
    }
    const u = pluckUniforms().uniforms as { uPluck: Float32Array };
    u.uPluck[0] = host.halfWidth();
    u.uPluck[1] = host.casing();
    const rev = host.geomRev();
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.t += dt;
      if (p.evicting) {
        p.fade -= dt / EVICT_TIME;
        if (p.fade <= 0) {
          this.release(i, true);
          continue;
        }
      }
      if (p.needsLayout || p.layoutRev !== rev) {
        if (!this.layout(p)) {
          this.release(i, true);
          continue;
        }
        this.refreshCollapse(p.chain);
      }
      if (!this.writeFrame(p)) this.release(i, true);
    }
  }

  // Drop everything (scene rebuild / destroy): meshes die with the layer.
  clear(): void {
    for (let i = this.active.length - 1; i >= 0; i--) this.release(i, true);
  }

  // ---- internals ----------------------------------------------------------

  private newMesh(): PluckBlurMesh {
    const m = new PluckBlurMesh();
    this.layer.addChild(m.mesh);
    return m;
  }

  private release(index: number, restore: boolean): void {
    const p = this.active[index];
    this.active.splice(index, 1);
    p.mesh.mesh.visible = false;
    p.mesh.used = 0;
    this.free.push(p.mesh);
    p.mask = null;
    if (restore) this.refreshCollapse(p.chain);
  }

  private amplitudeOf(p: ActivePluck, l: Lobe): number {
    const tl = p.t - l.onset;
    if (tl < 0) return 0;
    return l.A0 * Math.exp(-tl / p.tau) * (p.evicting ? Math.max(0, p.fade) : 1);
  }

  // Cap each lobe's amplitude by its lateral room: the swing may run into
  // its nearest neighbor's edge by at most CLEAR_OVERLAP * h. Measured once
  // at pluck time over each lobe's middle 60%. Crossing partners and
  // junction arms are not neighbors: a point closer to an end node than
  // the station itself is (a cone around the node) is ignored, as is the
  // plucked thread's own nearby material.
  private capClearance(
    chain: number,
    samples: SplineSamples,
    lobes: Lobe[],
    h: number
  ): void {
    const host = this.host;
    const sc = this.scratch;
    // Bounding box of the unit, grown by the largest possible swing.
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const l of lobes) {
      for (let s = l.s0; s <= l.s1 + 1e-9; s += 0.25) {
        host.sampleAt(samples, s, sc, 0);
        if (sc[0] < x0) x0 = sc[0];
        if (sc[0] > x1) x1 = sc[0];
        if (sc[1] < y0) y0 = sc[1];
        if (sc[1] > y1) y1 = sc[1];
      }
    }
    const grow = 2.2 * h * this.size + 2 * h + CLEAR_MARGIN;
    x0 -= grow;
    y0 -= grow;
    x1 += grow;
    y1 += grow;
    // Candidate samples: [x, y, chain, arc].
    const cand: number[] = [];
    const all = host.allSamples();
    for (let c = 0; c < all.length; c++) {
      const s = all[c];
      if (!s) continue;
      const cl = host.closed(c);
      const per = s.totalLength / (cl ? s.count : s.count - 1);
      for (let k = 0; k < s.count; k++) {
        const x = s.positions[k * 2];
        const y = s.positions[k * 2 + 1];
        if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        cand.push(x, y, c, k * per);
      }
    }
    const total = samples.totalLength;
    const closed = host.closed(chain);
    const ownWindow = 0.6 + 2 * h;
    const ax = new Float32Array(2);
    const bx = new Float32Array(2);
    for (const l of lobes) {
      const L = l.e1 - l.e0;
      if (L <= 0 || l.A0 <= 0) continue;
      host.sampleAt(samples, l.s0, sc, 0);
      ax[0] = sc[0];
      ax[1] = sc[1];
      host.sampleAt(samples, l.s1, sc, 0);
      bx[0] = sc[0];
      bx[1] = sc[1];
      const steps = Math.max(4, Math.ceil((0.6 * L) / 0.1));
      let cap = l.A0;
      for (let j = 0; j <= steps; j++) {
        const x = 0.2 + (0.6 * j) / steps;
        const env = peakShape(l.beta, x, l.attack);
        if (env < 0.15) continue;
        const arc = l.e0 + x * L;
        host.sampleAt(samples, arc, sc, 0);
        const px = sc[0];
        const py = sc[1];
        // The cone around each END NODE (partners and junction arms).
        const dA = arc - l.s0;
        const dB = l.s1 - arc;
        let best = Infinity;
        for (let q = 0; q < cand.length; q += 4) {
          const qx = cand[q];
          const qy = cand[q + 1];
          const dx = qx - px;
          const dy = qy - py;
          const d2 = dx * dx + dy * dy;
          if (d2 >= best) continue;
          if (cand[q + 2] === chain) {
            let da = Math.abs(cand[q + 3] - (((arc % total) + total) % total));
            if (closed) da = Math.min(da, total - da);
            if (da < ownWindow) continue;
          }
          const ex = qx - ax[0];
          const ey = qy - ax[1];
          if (ex * ex + ey * ey < dA * dA) continue;
          const fx = qx - bx[0];
          const fy = qy - bx[1];
          if (fx * fx + fy * fy < dB * dB) continue;
          best = d2;
        }
        if (!Number.isFinite(best)) continue;
        const gap = Math.sqrt(best) - 2 * h;
        cap = Math.min(cap, (Math.max(0, gap) + CLEAR_OVERLAP * h) / env);
      }
      l.A0 = Math.max(0, Math.min(l.A0, cap));
    }
  }

  // (Re)build the strip geometry from the chain's current samples + nodes.
  // Returns false when nothing is left to draw.
  private layout(p: ActivePluck): boolean {
    const host = this.host;
    const samples = host.samples(p.chain);
    if (!samples || samples.totalLength <= 0) return false;
    const total = samples.totalLength;
    const closed = host.closed(p.chain);
    const h = host.halfWidth();
    p.layoutRev = host.geomRev();
    p.needsLayout = false;

    // Resolve each lobe's nodes on the live chain.
    const byKey = new Map<number, PluckNode>();
    for (const n of host.nodes(p.chain)) byKey.set(n.key, n);
    for (const l of p.lobes) {
      if (l.keyA < 0) continue; // Pseudo lobe: keeps its stored arcs.
      const a = byKey.get(l.keyA);
      const b = byKey.get(l.keyB);
      if (!a || !b) {
        l.dead = true;
        continue;
      }
      let s0 = a.arc;
      let s1 = b.arc;
      if (closed && s1 <= s0 + 1e-6) s1 += total;
      if (s1 - s0 < LOBE_MIN_LEN) {
        l.dead = true;
        continue;
      }
      l.s0 = s0;
      l.s1 = s1;
      l.footA = a.footPos;
      l.footB = b.footNeg;
      l.hideA = a.hide;
      l.hideB = b.hide;
      [l.e0, l.e1] = vibratingSpan(s0, s1, a.hide, b.hide);
      l.lineA = a.under ? a.line : null;
      l.lineB = b.under ? b.line : null;
    }
    const lobes = p.lobes;
    let unitLen = 0;
    let liveLobes = 0;
    for (const l of lobes) {
      if (l.dead) continue;
      unitLen += l.s1 - l.s0;
      liveLobes++;
    }
    if (liveLobes === 0) return false;
    // Spacing: the target, widened when the unit would overflow the strip
    // (each lobe also pays up to MIN_LOBE_STATIONS + 1 fixed stations).
    const ds = Math.max(
      STATION_DS,
      unitLen /
        Math.max(1, MAX_STATIONS - liveLobes * (MIN_LOBE_STATIONS + 2))
    );

    const m = p.mesh;
    const sc = this.scratch;
    let n = 0;
    for (let li = 0; li < lobes.length; li++) {
      const l = lobes[li];
      l.drawn = false;
      if (l.dead) continue;
      const L = l.s1 - l.s0;
      const segs = Math.max(MIN_LOBE_STATIONS - 1, Math.ceil(L / ds));
      if (n + segs + 1 > MAX_STATIONS) continue;
      l.drawn = true;
      l.st0 = n;
      l.segs = segs;
      // Under-node clip reach along the partner: past the swing + thread.
      const reach = Math.min(CLIP_REACH, host.casing() + l.A0 + h + 0.1);
      const eL = l.e1 - l.e0;
      for (let i = 0; i <= segs; i++) {
        const arc = l.s0 + (L * i) / segs;
        const dA = arc - l.s0;
        const dB = l.s1 - arc;
        // Shape coordinate over the vibrating span (0 / 1 at its frets).
        const x = eL > 1e-6 ? Math.max(0, Math.min(1, (arc - l.e0) / eL)) : 0;
        m.lobeOf[n] = li;
        m.xOf[n] = x;
        m.arcOf[n] = arc;
        m.dsOf[n] = L / segs;
        m.visOf[n] = this.visAt(p.chain, l, arc);
        // Amplitude-free soft-node ceiling (tight bends tighten it below).
        m.pkOf[n] = this.peakAt(l, x, dA, dB, h);
        host.sampleAt(samples, arc, sc, 0);
        m.pos[n * 4] = sc[0];
        m.pos[n * 4 + 1] = sc[1];
        // Stash the unit normal for the extrude pass below.
        m.pos[n * 4 + 2] = -sc[3];
        m.pos[n * 4 + 3] = sc[2];
        // Clip lines (rule 4); the flag carries the reach (0 = no clip).
        const la = l.lineA;
        const lb = l.lineB;
        for (let v = 0; v < 2; v++) {
          const o4 = (n * 2 + v) * 4;
          const o2 = (n * 2 + v) * 2;
          if (la) {
            m.clipA[o4] = la[0];
            m.clipA[o4 + 1] = la[1];
            m.clipA[o4 + 2] = la[2];
            m.clipA[o4 + 3] = la[3];
          } else {
            m.clipA.fill(0, o4, o4 + 4);
          }
          if (lb) {
            m.clipB[o4] = lb[0];
            m.clipB[o4 + 1] = lb[1];
            m.clipB[o4 + 2] = lb[2];
            m.clipB[o4 + 3] = lb[3];
          } else {
            m.clipB.fill(0, o4, o4 + 4);
          }
          m.clipF[o2] = la ? reach : 0;
          m.clipF[o2 + 1] = lb ? reach : 0;
        }
        n++;
      }
    }
    if (n < 2) return false;
    m.used = n;

    // Extrude with the CONCAVE-SIDE clamp (a strip wider than the local
    // turn radius folds over itself - the P3.34 lesson, which RibbonMesh
    // answers per sample). The strip is far wider than a ribbon, so the
    // radius comes from a 5-station baseline (the circumcircle of i-2, i,
    // i+2, within the lobe) and the clamp uses the smallest radius within
    // +-2 stations: offsets under the local radius of curvature cannot
    // fold. The ENVELOPE is capped to the clamped side too (capL / capR),
    // so the blur fades out before the strip edge instead of being cut.
    // TIGHT BENDS (the clamped side inside the thread itself) keep their
    // base intact (see the collapse below), so they act as soft nodes:
    // within TIGHT_K stations the swing stays under NODE_CORE h - the
    // overlay's core stays opaque over the intact thread.
    const cx = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      cx[i * 2] = m.pos[i * 4];
      cx[i * 2 + 1] = m.pos[i * 4 + 1];
    }
    const radius = new Float32Array(n);
    const turn = new Int8Array(n);
    for (let i = 0; i < n; i++) {
      const li = m.lobeOf[i];
      let a = i;
      let b = i;
      for (let k = 0; k < 2; k++) {
        if (a - 1 >= 0 && m.lobeOf[a - 1] === li) a--;
        if (b + 1 < n && m.lobeOf[b + 1] === li) b++;
      }
      let mid = i;
      if (mid === a || mid === b) mid = (a + b) >> 1;
      radius[i] = Infinity;
      if (b - a < 2 || mid === a || mid === b) continue;
      const ax = cx[mid * 2] - cx[a * 2];
      const ay = cx[mid * 2 + 1] - cx[a * 2 + 1];
      const bx = cx[b * 2] - cx[mid * 2];
      const by = cx[b * 2 + 1] - cx[mid * 2 + 1];
      const cr = ax * by - ay * bx;
      const la = Math.hypot(ax, ay);
      const lb = Math.hypot(bx, by);
      const lc = Math.hypot(ax + bx, ay + by);
      if (Math.abs(cr) > 1e-12) radius[i] = (la * lb * lc) / (2 * Math.abs(cr));
      turn[i] = cr > 0 ? 1 : cr < 0 ? -1 : 0;
    }
    const rMinOf = new Float32Array(n);
    const tightLimit = (h + STRIP_PAD) / 0.9;
    for (let i = 0; i < n; i++) {
      const li = m.lobeOf[i];
      let rMin = radius[i];
      for (let j = i - 2; j <= i + 2; j++) {
        if (j >= 0 && j < n && m.lobeOf[j] === li && radius[j] < rMin) {
          rMin = radius[j];
        }
      }
      rMinOf[i] = rMin;
      m.tightOf[i] = rMin < tightLimit ? 1 : 0;
    }
    // Arc distance to the nearest tight station of the same lobe: the
    // base stays intact within TIGHT_K stations, its collapse ramps in over
    // COLLAPSE_RAMP beyond, and the swing stays under NODE_CORE h until the
    // ramp is done (tightAllow = the collapse allowance).
    for (let i = 0; i < n; i++) {
      const li = m.lobeOf[i];
      let d = Infinity;
      for (let j = i - 60; j <= i + 60; j++) {
        if (j < 0 || j >= n || m.lobeOf[j] !== li || !m.tightOf[j]) continue;
        d = Math.min(d, Math.abs(m.arcOf[j] - m.arcOf[i]));
      }
      m.tightAllow[i] = 1;
      if (Number.isFinite(d)) {
        const d0 = d - (TIGHT_K + 1) * m.dsOf[i];
        m.tightAllow[i] = smooth01(d0 / COLLAPSE_RAMP);
        const c = nodeCap(h, d0, COLLAPSE_RAMP);
        if (m.pkOf[i] > c) m.pkOf[i] = c;
      }
    }
    // Toward the center of curvature the swing is capped by the local
    // radius (innerCap = 0.9 radius minus the thread), CONTINUOUSLY along
    // the lobe (CAP_SLOPE), so the strip never needs clamping - a clamped
    // strip edge drew a hard notch - except at a genuinely tight bend (the
    // thread alone is wider than 0.9 radius), where the base stays intact
    // and the strip's inner edge may cut inside it. (Only the concave side
    // is capped: capping the swing on both sides kept a loop's eye clean
    // when zoomed in, but at normal zoom the noisy curvature cap carved
    // the outer blur of every hook into lumps.)
    for (let i = 0; i < n; i++) {
      const innerCap = Math.max(0, 0.9 * rMinOf[i] - h - STRIP_PAD);
      m.capLOf[i] = turn[i] > 0 ? innerCap : Infinity;
      m.capROf[i] = turn[i] < 0 ? innerCap : Infinity;
    }
    slopeLimit(m.capLOf, m.arcOf, m.lobeOf, n, CAP_SLOPE);
    slopeLimit(m.capROf, m.arcOf, m.lobeOf, n, CAP_SLOPE);
    for (let i = 0; i < n; i++) {
      const l = lobes[m.lobeOf[i]];
      const raw = l.A0 * peakShape(l.beta, m.xOf[i], l.attack);
      m.fOf[i] = raw > 1e-9 ? Math.max(0, m.pkOf[i] / raw) : 1;
      // Half extent of the strip, per side: the (capped) swing + the thread
      // + AA pad; a concave edge past 0.9 radius (a tight bend) is clamped.
      const pk = m.pkOf[i];
      const r9 = 0.9 * rMinOf[i];
      const t = turn[i];
      const sideW = (cap: number, concave: boolean): number => {
        if (!Number.isFinite(cap)) return pk + h + STRIP_PAD;
        const ws = Math.min(pk, cap) + h + STRIP_PAD;
        return concave && ws > r9 ? Math.max(r9, 0.3 * h) : ws;
      };
      const wLeft = sideW(m.capLOf[i], t > 0);
      const wRight = sideW(m.capROf[i], t < 0);
      m.wInOf[i] = Math.min(wLeft, wRight);
      const nx = m.pos[i * 4 + 2];
      const ny = m.pos[i * 4 + 3];
      const px = cx[i * 2];
      const py = cx[i * 2 + 1];
      m.pos[i * 4] = px + nx * wLeft;
      m.pos[i * 4 + 1] = py + ny * wLeft;
      m.pos[i * 4 + 2] = px - nx * wRight;
      m.pos[i * 4 + 3] = py - ny * wRight;
      m.uv[i * 4] = wLeft;
      m.uv[i * 4 + 1] = 0;
      m.uv[i * 4 + 2] = -wRight;
      m.uv[i * 4 + 3] = 0;
    }
    // Unused stations repeat the last one (never indexed anyway).
    for (let i = n; i < MAX_STATIONS; i++) {
      m.pos.copyWithin(i * 4, (n - 1) * 4, n * 4);
      m.uv.copyWithin(i * 4, (n - 1) * 4, n * 4);
    }
    m.upload(["aPosition", "aUV", "aClipA", "aClipB", "aClipF"]);
    m.writeQuads();

    // Static colors (knot mode): once per layout.
    if (host.staticColors()) this.writeColors(p);

    // This pluck's base collapse: inside lobes, outside footprints, the
    // base narrows to what the overlay's opaque core always covers.
    const count = host.baseSampleCount(p.chain);
    if (count > 1) {
      if (!p.mask || p.mask.length !== count) p.mask = new Float32Array(count);
      const mask = p.mask;
      mask.fill(1);
      const per = total / (closed ? count : count - 1);
      for (const l of lobes) {
        if (l.dead || !l.drawn) continue;
        const L = l.s1 - l.s0;
        const k0 = Math.ceil(l.s0 / per);
        const k1 = Math.floor(l.s1 / per);
        for (let k = k0; k <= k1; k++) {
          const arc = k * per;
          const dA = arc - l.s0;
          const dB = l.s1 - arc;
          // Footprints stay static; past them the collapse ramps in.
          const dFoot = Math.min(
            l.keyA >= 0 ? dA - l.footA : Infinity,
            l.keyB >= 0 ? dB - l.footB : Infinity
          );
          if (dFoot <= 0) continue;
          let allow = smooth01(dFoot / COLLAPSE_RAMP);
          // The base edge tapers linearly to each neighboring sample, so
          // narrowing scales with the overlay's visibility across both
          // intervals (a narrowed sample inside a hide ramp or a gap fade
          // read as a bite out of the thread).
          allow *= Math.min(
            this.visAt(p.chain, l, arc - per),
            this.visAt(p.chain, l, arc),
            this.visAt(p.chain, l, arc + per)
          );
          // The strip must span the whole thread width (at a bend tighter
          // than the strip its concave side is clamped inside the thread).
          const j = l.st0 + Math.round((dA / L) * l.segs);
          let pk = 0;
          for (let q = j - 1; q <= j + 1; q++) {
            if (q < l.st0 || q > l.st0 + l.segs) continue;
            if (m.wInOf[q] < h + STRIP_PAD) allow = 0;
            allow = Math.min(allow, m.tightAllow[q]);
            if (m.pkOf[q] > pk) pk = m.pkOf[q];
          }
          if (allow <= 0) continue;
          // The overlay's opaque core is h minus the swing; the base keeps
          // no more than that (the peak of the nearest stations).
          const raw = Math.max(0, Math.min(1, 1 - (pk + COLLAPSE_PAD) / h));
          const mul = 1 - allow * (1 - raw);
          let kk = k;
          if (closed) kk = ((k % count) + count) % count;
          else if (k < 0 || k >= count) continue;
          if (mul < mask[kk]) mask[kk] = mul;
        }
      }
    } else {
      p.mask = null;
    }
    return true;
  }

  // The amplitude ceiling at a lobe station. A crossing node is a SOFT
  // node: inside its static footprint the swing stays under NODE_CORE h
  // (the overlay's core stays opaque over the static patches), opening at
  // NODE_SLOPE beyond. A hide-zone node (junction core, marker gap) is a
  // rigid fret where its hide ramp ends - the overlay is invisible before
  // it, so a swing there would only pop in at the ramp - and a soft node
  // past that, out to its footprint (a junction's spans the fillet web).
  private capAt(l: Lobe, dA: number, dB: number, h: number): number {
    const one = (key: number, d: number, foot: number, hide: number): number => {
      if (key < 0) return Infinity;
      const soft = nodeCap(h, d, foot + COLLAPSE_RAMP);
      if (hide > 0) {
        return Math.min(NODE_SLOPE * Math.max(0, d - hide - HIDE_RAMP), soft);
      }
      return soft;
    };
    return Math.min(
      one(l.keyA, dA, l.footA, l.hideA),
      one(l.keyB, dB, l.footB, l.hideB)
    );
  }

  // The lobe's capped peak swing at a station (x = position in the lobe).
  private peakAt(l: Lobe, x: number, dA: number, dB: number, h: number): number {
    const raw = l.A0 * peakShape(l.beta, x, l.attack);
    if (raw <= 1e-9) return 0;
    return Math.max(
      0,
      Math.min(raw, softMin(raw, this.capAt(l, dA, dB, h), 0.25 * h))
    );
  }

  // Overlay visibility at an arc of a lobe: the chain's under-gaps (rule 3)
  // times the end nodes' hide zones (junction cores, marker gaps).
  private visAt(chain: number, l: Lobe, arc: number): number {
    let vis = this.host.visibility(chain, arc);
    const dA = arc - l.s0;
    const dB = l.s1 - arc;
    if (l.hideA > 0) vis *= smooth01((dA - l.hideA) / HIDE_RAMP);
    if (l.hideB > 0) vis *= smooth01((dB - l.hideB) / HIDE_RAMP);
    return vis;
  }

  private writeColors(p: ActivePluck): void {
    const m = p.mesh;
    const rgb = this.rgb;
    for (let i = 0; i < m.used; i++) {
      this.host.color(p.chain, m.arcOf[i], rgb);
      const o = i * 6;
      m.col[o] = rgb[0];
      m.col[o + 1] = rgb[1];
      m.col[o + 2] = rgb[2];
      m.col[o + 3] = rgb[0];
      m.col[o + 4] = rgb[1];
      m.col[o + 5] = rgb[2];
    }
    m.upload(["aCol"]);
  }

  // Per-frame attributes: the swept envelope, attack mix, ghost, colors.
  // Returns false once the pluck has died away.
  private writeFrame(p: ActivePluck): boolean {
    const host = this.host;
    const m = p.mesh;
    const h = host.halfWidth();
    const scale = Math.max(2, host.viewScale());
    const reduced = this.reducedMotion;
    const ghost = reduced ? 0 : this.ghost;
    // WCAG 2.3.1 guard from last frame's measured ghost area.
    const areaScale =
      p.ghostArea > GHOST_AREA_PX ? GHOST_AREA_PX / p.ghostArea : 1;
    let area = 0;
    let alive = false;
    // Per-lobe time state.
    const lobes = p.lobes;
    const amp = p.amp;
    const qv = p.qv;
    amp.fill(0);
    qv.fill(0);
    for (let li = 0; li < lobes.length; li++) {
      const l = lobes[li];
      const tl = p.t - l.onset;
      if (l.dead) continue;
      if (tl < 0) {
        alive = true;
        continue;
      }
      const a = this.amplitudeOf(p, l);
      amp[li] = a;
      qv[li] = l.attack && !reduced ? Math.exp(-tl / p.tauR) : 0;
      if (a * scale >= KILL_PX) alive = true;
    }
    if (!alive) return false;
    const env = this.env2;
    for (let i = 0; i < m.used; i++) {
      const li = m.lobeOf[i];
      const l = lobes[li];
      const a = amp[li];
      const q = qv[li];
      const x = m.xOf[i];
      const s = a * m.fOf[i];
      let lo = 0;
      let hi = 0;
      let yg = 0;
      let gA = 0;
      if (s > 0) {
        envelope(l.beta, x, q, env);
        lo = env[0] * s;
        hi = env[1] * s;
        if (p.side < 0) {
          const t = lo;
          lo = -hi;
          hi = -t;
        }
        // Concave side: the strip is clamped there, so is the swing.
        const cL = m.capLOf[i];
        const cR = m.capROf[i];
        if (hi > cL) hi = cL;
        if (-lo > cR) lo = -cR;
        yg = p.side * s * ghostShape(l.beta, x, q, this.ghostPhase + l.phase);
        if (yg > cL) yg = cL;
        if (-yg > cR) yg = -cR;
        if (ghost > 0 && l.A0 > 0) {
          const span = 0.5 * (hi - lo);
          gA =
            ghost *
            Math.sqrt(Math.min(1, a / l.A0)) *
            smooth01((span - 0.15 * h) / (0.45 * h));
          if (gA > 0.004) area += 2 * h * m.dsOf[i] * scale * scale;
          gA *= areaScale;
        }
      }
      const vis = m.visOf[i];
      for (let v = 0; v < 2; v++) {
        const o2 = (i * 2 + v) * 2;
        const o4 = (i * 2 + v) * 4;
        m.env[o2] = lo;
        m.env[o2 + 1] = hi;
        m.aux[o4] = ATTACK_MIX * q;
        m.aux[o4 + 1] = yg;
        m.aux[o4 + 2] = gA;
        m.aux[o4 + 3] = vis;
      }
    }
    p.ghostArea = area;
    m.upload(["aEnv", "aAux"]);
    if (!host.staticColors()) this.writeColors(p);
    return true;
  }

  // Combine every live pluck's mask on a chain (min) and hand it to the
  // host, which re-extrudes that chain's base ribbon once.
  private refreshCollapse(chain: number): void {
    let combined: Float32Array | null = null;
    for (const p of this.active) {
      if (p.chain !== chain || !p.mask) continue;
      if (!combined) {
        combined = new Float32Array(p.mask);
      } else if (combined.length === p.mask.length) {
        for (let k = 0; k < combined.length; k++) {
          if (p.mask[k] < combined[k]) combined[k] = p.mask[k];
        }
      }
    }
    const prev = this.collapseOf.get(chain) ?? null;
    if (!combined && !prev) return;
    if (combined && prev && combined.length === prev.length) {
      let same = true;
      for (let k = 0; k < combined.length; k++) {
        if (combined[k] !== prev[k]) {
          same = false;
          break;
        }
      }
      if (same) return;
    }
    if (combined) this.collapseOf.set(chain, combined);
    else this.collapseOf.delete(chain);
    this.host.setCollapse(chain, combined);
  }
}
