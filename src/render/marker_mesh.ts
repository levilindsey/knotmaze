// MARKER MESHES (K83): one quad per marker, drawn by a signed-distance
// fragment shader - a black disc and a white glyph (marker_glyphs.ts)
// evaluated PER PIXEL. Strokes are capsule unions (exact round caps and
// joins), circles and dots are exact, and every edge carries an analytic
// one-pixel ramp sized by the pixel's own footprint, so the marker stays
// crisp at every zoom with no tessellation to tune (pixi's adaptive circle
// and round-cap tessellation counts segments from the RAW local radius,
// which is a fraction of a world unit here - the N-gon marker lore).
//
// The quad lives in the DISC FRAME (disc radius 1, y down); place() sets
// the mesh's position and scale (the disc's world radius), so the stroke
// width scales with the marker. Meshes, shaders and uniform groups are
// built per marker and never destroyed mid-session (the PALETTE_CACHE
// lore); the program is shared (Shader.from caches it by source).

import { Mesh, MeshGeometry, Shader, Texture, UniformGroup } from "pixi.js";
import {
  GLYPH_MAX_CIRCLES,
  GLYPH_MAX_SEGMENTS,
  MARKER_STROKE,
  glyphSegmentCount,
} from "./marker_glyphs";
import type { MarkerGlyph } from "./marker_glyphs";

// Quad half-size in disc radii: room for the rim's antialiasing ramp down
// to discs a few pixels across.
const QUAD_HALF = 1.25;

const MARKER_VERT = /* glsl */ `#version 300 es
precision highp float;
in vec2 aPosition;
in vec2 aUV;
out vec2 vP;
out vec4 vColor;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform mat3 uTransformMatrix;
uniform vec4 uColor;
void main(void) {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vP = aPosition;
  vColor = uColor * uWorldColorAlpha;
}
`;

const MARKER_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vP;
in vec4 vColor;
out vec4 finalColor;
// Glyph: chord segments (x0, y0, x1, y1) and circles (cx, cy, r, dot) in
// the disc frame; uGlyph = (segments, circles, stroke half-width, -).
uniform vec4 uSeg[${GLYPH_MAX_SEGMENTS}];
uniform vec4 uCirc[${GLYPH_MAX_CIRCLES}];
uniform vec4 uGlyph;
uniform vec4 uInk;
uniform vec4 uDisc;
void main(void) {
  // Disc units per pixel - derivatives first, in uniform control flow.
  float px = max(length(dFdx(vP)), 1e-6);
  float r = length(vP);
  float disc = clamp((1.0 - r) / px + 0.5, 0.0, 1.0);
  if (disc <= 0.0) discard;
  float h = uGlyph.z;
  float d = 1e6;
  int ns = int(uGlyph.x + 0.5);
  for (int i = 0; i < ${GLYPH_MAX_SEGMENTS}; i++) {
    if (i >= ns) break;
    vec4 s = uSeg[i];
    vec2 pa = vP - s.xy;
    vec2 ba = s.zw - s.xy;
    float t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-12), 0.0, 1.0);
    d = min(d, length(pa - ba * t) - h);
  }
  int nc = int(uGlyph.y + 0.5);
  for (int i = 0; i < ${GLYPH_MAX_CIRCLES}; i++) {
    if (i >= nc) break;
    vec4 c = uCirc[i];
    float q = length(vP - c.xy) - c.z;
    d = min(d, c.w > 0.5 ? q : abs(q) - h);
  }
  float ink = clamp(0.5 - d / px, 0.0, 1.0);
  float a = disc * uDisc.a;
  finalColor = vec4(mix(uDisc.rgb, uInk.rgb, ink) * a, a) * vColor;
}
`;

interface MarkerUniformValues {
  uSeg: Float32Array;
  uCirc: Float32Array;
  uGlyph: Float32Array;
  uInk: Float32Array;
  uDisc: Float32Array;
}

export class MarkerMesh {
  readonly mesh: Mesh<MeshGeometry, Shader>;
  private readonly values: MarkerUniformValues;
  private glyphId = "";

  constructor() {
    const uniforms = new UniformGroup({
      uSeg: {
        value: new Float32Array(GLYPH_MAX_SEGMENTS * 4),
        type: "vec4<f32>",
        size: GLYPH_MAX_SEGMENTS,
      },
      uCirc: {
        value: new Float32Array(GLYPH_MAX_CIRCLES * 4),
        type: "vec4<f32>",
        size: GLYPH_MAX_CIRCLES,
      },
      uGlyph: {
        value: new Float32Array([0, 0, MARKER_STROKE / 2, 0]),
        type: "vec4<f32>",
      },
      uInk: { value: new Float32Array([1, 1, 1, 1]), type: "vec4<f32>" },
      uDisc: { value: new Float32Array([0, 0, 0, 1]), type: "vec4<f32>" },
    });
    this.values = uniforms.uniforms as unknown as MarkerUniformValues;
    const shader = Shader.from({
      gl: { vertex: MARKER_VERT, fragment: MARKER_FRAG, name: "knot-marker" },
      resources: { markerUniforms: uniforms },
    });
    const q = QUAD_HALF;
    const geometry = new MeshGeometry({
      positions: new Float32Array([-q, -q, q, -q, q, q, -q, q]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });
    this.mesh = new Mesh({ geometry, shader, texture: Texture.WHITE });
    this.mesh.visible = false;
  }

  get glyph(): string {
    return this.glyphId;
  }

  // Load a glyph into the uniforms (only when it changes).
  setGlyph(g: MarkerGlyph): void {
    if (g.id === this.glyphId) return;
    this.glyphId = g.id;
    const v = this.values;
    v.uSeg.fill(0);
    v.uCirc.fill(0);
    let n = 0;
    for (const l of g.lines) {
      for (let i = 0; i + 3 < l.length && n < GLYPH_MAX_SEGMENTS; i += 2) {
        v.uSeg.set([l[i], l[i + 1], l[i + 2], l[i + 3]], n * 4);
        n++;
      }
    }
    let c = 0;
    const circles = (list: Float32Array, dot: number): void => {
      for (let i = 0; i < list.length && c < GLYPH_MAX_CIRCLES; i += 3) {
        v.uCirc.set([list[i], list[i + 1], list[i + 2], dot], c * 4);
        c++;
      }
    };
    circles(g.rings, 0);
    circles(g.dots, 1);
    v.uGlyph[0] = Math.min(n, glyphSegmentCount(g));
    v.uGlyph[1] = c;
  }

  // Center the disc at a world point with a world radius (or hide it).
  place(x: number, y: number, radius: number): void {
    this.mesh.position.set(x, y);
    this.mesh.scale.set(radius);
    this.mesh.visible = true;
  }

  hide(): void {
    this.mesh.visible = false;
  }
}
