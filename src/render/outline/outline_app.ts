// K1240 S4: the redesign in the app, behind the link flag `rp=outline`.
// The threads draw from src/render/outline (the outline's border band and
// the triangle fill with the section paint) in place of the ribbon
// renderer's base and fillet layers; everything else (plucks, the reveal's
// FX, markers, the gameplay layers) draws as before.
//
// WHERE IT BUILDS: a module worker of its own (outline_worker.ts), fed the
// scene export's SceneIn (gathered on main, as field_b_app gathers it).
// Measured on def in Node (k1240s4_eq.ts / k1240s4_parts.ts, 2026-11-10):
// a structure + first frame takes ~3.0 s and every moved frame ~2.9 s
// (the band alone ~2.5 s: 6.3M vertices, 68.6k of 73.8k piece points tied).
// On main that is a 3 s freeze per moved frame; in K7's physics worker it
// would stall the sim for as long. Its own worker keeps both live: the
// outline trails the threads by one build while they move and catches up
// when they rest. One request in flight; a move during it sends the next.
//
// DRAW: when new data or a new camera arrives, the fill (paint program,
// depth LEQUAL on the fill key, as the prototype's page) and the band
// (tie alpha, blended) go into an offscreen target the canvas's size,
// premultiplied; a RenderContainer at the ribbon root's slot 2 (over the
// hidden base and fillet layers, under the plucks) composites it, one
// texel per pixel. When pixi draws the root into another target (a pluck
// ripple's filter), the composite instead runs after app.render(), over
// the whole canvas.
//
// Failure never reaches the ticker: a worker or GL error turns the pass
// off and brings the ribbon layers back.
import { RenderContainer, type Container, type WebGLRenderer } from "pixi.js";
import { gatherSceneInput, type SceneExportCtx } from "../field/scene_export_hook";
import { buildFieldScene } from "../field/scene_export";
import { pixiLabelHost } from "../field/label_b_host";
import {
  KNOT_UNIFORMS_GLSL,
  PAINT_CONST_GLSL,
  PAINT_DATA_GLSL,
  PAINT_FX_GLSL,
  PAINT_GATE_THREAD_GLSL,
  PAINT_PAINT_STRIP_GLSL,
  PAINT_SECTION_GLSL,
} from "../paint_glsl";
import { EXPLORE_GLOW_RGB, EXPLORE_LOOK_GLSL, EXPLORE_VIS_GLSL } from "../explore_glsl";
import { kGeom, kPaint, kReveal, kStatic, knotUniformValues } from "../paint_model";
import type { SceneIn } from "./outline";
import { RUN_MAP_W, RV_W, SWELL_STRIDE, appRunMap, chainArcMap, revealMaskTex, swellStrip, type SwellStrip } from "./paint";
import type { OutlineReply, OutlineRequest } from "./outline_worker";
import { REC_PLACE_FS, REC_PLACE_OUT, REC_PLACE_STRIDE, REC_PLACE_VS } from "./rec_glsl";
import { BAND_PLACE_FS, BAND_QUAD_OUT, BAND_QUAD_STRIDE, BAND_QUAD_VS, bandQuadVs } from "./band_place";

const CTRL_ARC = 0.47;
// K1247 s18: the record fill, as src/app/frame_loop.ts read it (the link rewrite drops the key before this loads; K1247 s20: on unless oe=0).
const FILL_REC = (globalThis as { __knotOutlineFillRec?: boolean }).__knotOutlineFillRec === true;
/** K1247 s22: ob=1, the band as a fixed layout of records (band_rec.ts). */
const BAND_REC = (globalThis as { __knotOutlineBandRec?: boolean }).__knotOutlineBandRec === true;

/** K1247 s18: a reply's typed-array bytes, top level and one level down (the bench's reply size). */
function replyBytes(r: object): number {
  let n = 0;
  for (const v of Object.values(r)) {
    if (ArrayBuffer.isView(v)) n += v.byteLength;
    else if (v && typeof v === "object") for (const w of Object.values(v)) if (ArrayBuffer.isView(w)) n += w.byteLength;
  }
  return n;
}
const RUN_TEX_W = 1024;
const BAND_TEX_W = 1024; // band_gpu.BAND_TEX_W (not imported: it would pull draw.ts into main)

const PAINT_VS = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=2) in float aKey;
layout(location=3) in ivec4 aRun;
layout(location=4) in vec4 aW;
layout(location=5) in vec4 aS;
uniform mat3 uMat;
uniform float uKS;
flat out ivec4 vRun;
out vec4 vW;
out vec4 vS;
void main() {
  vec3 p = uMat * vec3(aPos, 1.0);
  gl_Position = vec4(p.xy, clamp(-aKey / uKS, -1.0, 1.0), 1.0);
  vRun = aRun; vW = aW; vS = aS;
}`;
// draw.ts's paint fragment shader, verbatim.
const PAINT_FS = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D uRuns;
flat in ivec4 vRun;
in vec4 vW;
in vec4 vS;
out vec4 o;
vec4 tx(int q) { return texelFetch(uRuns, ivec2(q % ${RUN_TEX_W}, q / ${RUN_TEX_W}), 0); }
float ez(float u, float e) { return u + (u * u * (3.0 - 2.0 * u) - u) * e; }
vec3 runCol(int r, float s) {
  vec4 t0 = tx(4 * r); vec4 t1 = tx(4 * r + 1); vec4 t2 = tx(4 * r + 2); vec4 t3 = tx(4 * r + 3);
  float cu = s;
  if (t2.w > 0.0) cu = s + t2.w * floor((0.5 * (t0.x + t0.y) - s) / t2.w + 0.5);
  float da = cu - t0.x; float db = t0.y - cu;
  if (t0.z > 0.0 && da < t0.z) return mix(t1.rgb, t2.rgb, ez(clamp(da / t0.z, 0.0, 1.0), t1.w));
  if (t0.w > 0.0 && db < t0.w) return mix(t3.rgb, t2.rgb, ez(clamp(db / t0.w, 0.0, 1.0), t1.w));
  return t2.rgb;
}
void main() {
  vec3 c = vec3(0.0); float W = 0.0;
  for (int k = 0; k < 4; k++) {
    int r = vRun[k]; float w = vW[k];
    if (r < 0 || !(w > 0.0)) continue;
    c += w * runCol(r, vS[k]); W += w;
  }
  o = vec4(W > 0.0 ? c / W : vec3(0.0), 1.0);
}`;
// K1291 s2: THE APPEARANCE REVEAL. Today's ribbon draws each chain at its
// reveal width (revealMask, paint.ts revealMaskTex packs it). rvMask reads
// an app chain's width at an arc; rvMaskS a scene chain's at its s through
// the per-scene-chain map (appRunMap over 0..n-1). uRvOn 0 = no reveal
// running: every read below is skipped.
const RV_MASK_GLSL = `
uniform highp sampler2D uRv;
uniform highp sampler2D uCm;
uniform int uRvOn;
float rvT(int i) { return texelFetch(uRv, ivec2(i % ${RV_W}, i / ${RV_W}), 0).x; }
float rvMask(int c, highp float a) {
  if (c < 0) return 1.0;
  float fl = rvT(4 * c + 3);
  if (fl < -0.5) return 1.0;
  int off = int(rvT(4 * c) + 0.5); int n = int(rvT(4 * c + 1) + 0.5); highp float T = rvT(4 * c + 2);
  if (!(T > 0.0)) return rvT(off);
  if (fl > 0.5) {
    highp float u = a / T * float(n); u -= float(n) * floor(u / float(n));
    int k0 = clamp(int(floor(u)), 0, n - 1); int k1 = k0 + 1 == n ? 0 : k0 + 1;
    return mix(rvT(off + k0), rvT(off + k1), clamp(u - float(k0), 0.0, 1.0));
  }
  highp float u = clamp(a / T, 0.0, 1.0) * float(n - 1);
  int k0 = min(n - 2, int(floor(u)));
  return mix(rvT(off + k0), rvT(off + k0 + 1), u - float(k0));
}
float rvMaskS(int i, highp float s) {
  if (i < 0) return 1.0;
  highp vec4 m = texelFetch(uCm, ivec2(i % ${RUN_MAP_W}, i / ${RUN_MAP_W}), 0);
  if (m.x < -0.5) return 1.0;
  return rvMask(int(m.x + 0.5), m.y + s * m.z);
}
`;
// K1291 s3: the rainbow's swell (reveal_fx.ts revealWidth, packed as the
// masks are: revealMaskTex) on uSw, read as RV_MASK_GLSL reads uRv. The band
// steps aside wherever its chain swells past 1: the swell (paint.ts
// swellStrip) draws its own border there.
const SW_MASK_GLSL = `
uniform highp sampler2D uSw;
uniform int uSwOn;
${RV_MASK_GLSL.slice(RV_MASK_GLSL.indexOf("float rvT("))
  .replace(/\brvT\(/g, "swT(")
  .replace(/\buRv\b/g, "uSw")
  .replace(/\brvMask\b/g, "swMask")
  .replace(/\brvMaskS\b/g, "swMaskS")}`;
// The fill's distance to a scene chain's centerline (band_gpu's chain
// samples) within r of s, and the foot's s: the fill has no across
// coordinate, so the narrowed reveal width needs it.
const RV_FOOT_GLSL = `
uniform highp sampler2D uChainS;
uniform highp sampler2D uCi;
highp vec4 rvS(int i) { return texelFetch(uChainS, ivec2(i % ${BAND_TEX_W}, i / ${BAND_TEX_W}), 0); }
highp float rvdS(highp float len, highp float a, highp float c) { highp float d = c - a; if (len > 0.0) { d = mod(d, len); if (d > 0.5 * len) d -= len; } return d; }
highp vec3 rvFoot(int i, highp float s, highp vec2 p, highp float r) {
  highp vec4 I = texelFetch(uCi, ivec2(i % ${BAND_TEX_W}, i / ${BAND_TEX_W}), 0);
  int b = int(I.x + 0.5); int n = int(I.y + 0.5); highp float L = I.z;
  bool ring = L > 0.0;
  int segs = ring ? n : n - 1;
  if (segs < 1) return vec3(1e30, s, 1.0);
  highp float sw = ring ? s - L * floor(s / L) : s;
  int lo = 0; int hi = n - 1;
  for (int it = 0; it < 24 && lo < hi; it++) { int m = (lo + hi + 1) / 2; if (rvS(b + m).z <= sw) lo = m; else hi = m - 1; }
  highp float best = 1e30; highp float bs = sw; highp float sg = 1.0;
  for (int dir = 0; dir < 2; dir++) {
    for (int t = 0; t < 64; t++) {
      int k = dir == 0 ? lo + t : lo - 1 - t;
      if (ring) { k = k % n; if (k < 0) k += n; } else if (k < 0 || k >= segs) break;
      int j = k + 1 == n ? 0 : k + 1;
      highp vec4 A = rvS(b + k); highp vec4 B = rvS(b + j);
      highp float lk = j == 0 ? L - A.z : B.z - A.z;
      if (dir == 0 && rvdS(L, sw, A.z) > r) break;
      if (dir == 1 && rvdS(L, sw, A.z + lk) < -r) break;
      highp vec2 e = B.xy - A.xy; highp float l2 = dot(e, e);
      highp float tt = l2 > 0.0 ? clamp(dot(p - A.xy, e) / l2, 0.0, 1.0) : 0.0;
      highp float d = length(p - A.xy - tt * e);
      if (d < best) { best = d; bs = A.z + tt * lk; sg = e.x * (p.y - A.y) - e.y * (p.x - A.x) < 0.0 ? -1.0 : 1.0; }
    }
  }
  return vec3(best, bs, sg);
}
`;
// PAINT_VS plus the world position (the reveal front's distance).
const APP_VS = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=2) in float aKey;
layout(location=3) in ivec4 aRun;
layout(location=4) in vec4 aW;
layout(location=5) in vec4 aS;
uniform mat3 uMat;
uniform float uKS;
flat out ivec4 vRun;
out vec4 vW;
out vec4 vS;
out vec2 vPos;
void main() {
  vec3 p = uMat * vec3(aPos, 1.0);
  gl_Position = vec4(p.xy, clamp(-aKey / uKS, -1.0, 1.0), 1.0);
  vRun = aRun; vW = aW; vS = aS; vPos = aPos;
}`;
// K1291: THE APP'S FILL. The same slots as PAINT_FS, but each slot's
// colour is the app's own material at that point of its chain: the run
// map (paint.ts appRunMap) names the run's chain and maps the slot's s to
// the renderer's arc, and appMaterial composes there exactly as
// arm_strip.ts's chainMaterial (mode 0, roots aside) composes the joinery:
// the ribbon's section colour (kSectionAtArc), the reveal FX that tint
// (burn, roots), then the gameplay paint and the reveal glow, flat (no
// across coordinate, as the fans and strips). The data are the app's
// page-lifetime paint textures and knot uniforms (paint_model.ts), so a
// palette, a move, a trail fade or a reveal frame shows on the next frame.
/** K1291 s2: the thread reveal's end looks (kExDotsSd, kExploreLook) without
 * the shaped cut after them, which reads the ribbon's gap table. */
export const EX_LOOK_GLSL = exLookGlsl(EXPLORE_LOOK_GLSL);
export function exLookGlsl(src: string): string {
  const at = src.indexOf("highp float kExCutSd;");
  if (at < 0 || src.indexOf("kExploreLook(") > at) throw new Error("K1291: EXPLORE_LOOK_GLSL's shaped cut moved");
  return src.slice(0, at);
}
/** K1291 s2: kSmooth alone (the end looks need it; the band takes no gate
 * lib), cut from today's text so the two never differ. */
export const K_SMOOTH_GLSL = glslFn(PAINT_GATE_THREAD_GLSL, "highp float kSmooth(");
export function glslFn(src: string, head: string): string {
  const at = src.indexOf(head);
  const end = at < 0 ? -1 : src.indexOf("\n}\n", at);
  if (end < 0) throw new Error(`K1291: ${head} moved`);
  return src.slice(at, end + 3);
}
const APP_FS = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D uRunMap;
uniform float uPx;
uniform vec3 uInk;
uniform float uH;
uniform float uW;
flat in ivec4 vRun;
in vec4 vW;
in vec4 vS;
in vec2 vPos;
uniform int uFp;
out vec4 o;
#if KRV
// K1291 s3: 1 while drawing the rainbow's swell (paint.ts swellStrip): the
// strip carries its own ink (vW.y) and stripe side (vW.z).
uniform int uSwl;
#endif
${RV_MASK_GLSL}
${RV_FOOT_GLSL}
${KNOT_UNIFORMS_GLSL}
${PAINT_CONST_GLSL}
${PAINT_DATA_GLSL}
${PAINT_SECTION_GLSL}
${PAINT_GATE_THREAD_GLSL}
${PAINT_FX_GLSL}
${PAINT_PAINT_STRIP_GLSL}
${EXPLORE_VIS_GLSL}
${EX_LOOK_GLSL}
// K1291 s2: al = the intro's materialize alpha (comet, dust; 1 otherwise)
// times the thread reveal's visibility (K76 kExploreAt, the plain fade end),
// and side01 the point's side across the thread (the rainbow's stripes).
// scn / s: the slot's scene chain and its s (the end look's foot).
vec3 appMaterial(int ch, highp float a, highp float side01, int scn, highp float s, out float al) {
  al = 1.0;
  KChain c = kChain(ch);
  highp float total = c.total;
  if (total <= 0.0 || c.count < 2) return knotSection(c, 0.0);
  highp float an = c.closed ? kWrap(a, total) : clamp(a, 0.0, total);
  vec3 m = kSectionAtArc(c, an, -1.0);
  highp float actrl = kCtrlOfArcNear(c, an, kSecK0);
#if KRV
  if (uKFx.w > 0.5 && uKFx.z < c.fxDone) {
    int st = int(uKFx.x + 0.5);
    if (st >= 1) {
      highp float pR;
      m = kFxColor(c, actrl, an / c.arcPer, m, pR, al);
      if (pR > 0.0) m = kRainbowBlend(m, pR, side01);
    }
  }
#endif
  if ((uKPaint.x > 0.5 && c.paintOn) || uKFx2.z > 0.5) {
    highp vec4 st = kPaintAt(c, actrl, an, uPx, false);
    m = kComposePaintFlat(m, st, kGlow(c, actrl));
  }
#if KRV
  if (uKExplore.x > 0.5) {
    // The thread reveal (EXPLORE_MAIN_GLSL's look, by the same inputs: lat
    // from the foot distance over the thread width, a pixel in world units).
    highp float ev = kExploreAt(c, actrl);
    int look = int(uKExplore.y + 0.5);
    if (kExTip >= 0.0 && look >= 2) {
      highp float u = kExTip;
      if (look == 2) {
        highp float g = kSmooth(u / 0.3) * (1.0 - kSmooth((u - 0.55) / 0.45));
        m = mix(m, vec3(${EXPLORE_GLOW_RGB.join(", ")}), 0.85 * g * uKExplore.z);
      }
      highp float exS = 0.0;
      highp float exLf = 0.0;
      highp float lat = 0.0;
      if (look != 2) {
        highp float exA0 = kArcU(c, kExSolid);
        exS = abs(kArcU(c, kExX) - exA0);
        exLf = abs(kArcU(c, kExEnd) - exA0);
        highp vec3 f = rvFoot(scn, s, vPos, 2.0 * uH);
        if (f.x < 1e29) lat = f.z * f.x / max(uKExplore.w, 1e-6);
      }
      ev = kExploreLook(look, ev, u, exS, exLf, lat, uPx / max(uKExplore.w, 1e-6), uPx);
      if (uKExplore.x > 1.5) m = mix(m, vec3(1.0), kExDot);
    }
    al *= ev;
  }
#endif
  return m;
}
void main() {
  // K1291 s2: the reveal. The heaviest slot's chain decides: away from a
  // front (its width 1 or 0 for 2h either side) the fill is whole or
  // gone; near one, the centerline distance d against the narrowed half
  // width h m(foot) gives the coverage, and the last W of it is the
  // border's ink (the band steps aside wherever its own width is below 1).
  float ink = 0.0;
  float side = 0.5;
#if KRV
  if (uSwl == 1) { ink = vW.y; side = vW.z; } else {
  if (uRvOn > 0) {
    int kb = -1; float wb = 0.0;
    for (int k = 0; k < 4; k++) if (vRun[k] >= 0 && vW[k] > wb) { wb = vW[k]; kb = k; }
    if (kb >= 0) {
      int r = vRun[kb];
      highp vec4 m = texelFetch(uRunMap, ivec2(r % ${RUN_MAP_W}, r / ${RUN_MAP_W}), 0);
      if (m.x > -0.5) {
        int ac = int(m.x + 0.5);
        highp float s = vS[kb];
        float m0 = rvMask(ac, m.y + s * m.z);
        float m1 = rvMask(ac, m.y + (s - 2.0 * uH) * m.z);
        float m2 = rvMask(ac, m.y + (s + 2.0 * uH) * m.z);
        float mn = min(m0, min(m1, m2));
        if (max(m0, max(m1, m2)) <= 0.0) discard;
        if (mn < 1.0) {
          highp vec3 f = rvFoot(int(m.w + 0.5), s, vPos, 2.0 * uH);
          bool hit = f.x < 1e29;
          float mf = hit ? rvMask(ac, m.y + f.y * m.z) : m0;
          float hm = uH * mf;
          float d = hit ? f.x : 0.0;
          // A hard edge, as the outline's own (no MSAA, depth-tested
          // opaque fill): a partial alpha here would hide the thread under.
          if (!(d < hm)) discard;
          ink = clamp((d - (hm - uW)) / uPx + 0.5, 0.0, 1.0);
        }
      }
    }
  }
  // The rainbow's stripes run across the thread: the side from the signed
  // distance to the heaviest slot's centerline (0.5 = on it).
  if (uKFx.w > 0.5 && int(uKFx.x + 0.5) == 1) {
    int kb = -1; float wb = 0.0;
    for (int k = 0; k < 4; k++) if (vRun[k] >= 0 && vW[k] > wb) { wb = vW[k]; kb = k; }
    if (kb >= 0) {
      int r = vRun[kb];
      highp vec4 m = texelFetch(uRunMap, ivec2(r % ${RUN_MAP_W}, r / ${RUN_MAP_W}), 0);
      if (m.x > -0.5) {
        highp vec3 f = rvFoot(int(m.w + 0.5), vS[kb], vPos, 2.0 * uH);
        if (f.x < 1e29) side = clamp(0.5 + 0.5 * f.z * f.x / uH, 0.0, 1.0);
      }
    }
  }
  }
#endif
  vec3 c = vec3(0.0); float W = 0.0; float A = 0.0;
  for (int k = 0; k < 4; k++) {
    int r = vRun[k]; float w = vW[k];
    if (r < 0 || !(w > 0.0)) continue;
    highp vec4 m = texelFetch(uRunMap, ivec2(r % ${RUN_MAP_W}, r / ${RUN_MAP_W}), 0);
    if (m.x < -0.5) continue;
    float al;
    c += w * appMaterial(int(m.x + 0.5), m.y + vS[k] * m.z, side, int(m.w + 0.5), vS[k], al); W += w; A += w * al;
  }
  vec3 col = mix(W > 0.0 ? c / W : vec3(0.0), uInk, ink);
#if !KRV
  // K1291 s3: no reveal, intro FX or thread reveal: the opaque write, and
  // no discard (it would cost the fill its early depth test).
  o = vec4(col, 1.0);
#else
  // The intro's materialize alpha (comet, dust), premultiplied; the fill
  // blends only while those styles run (1 otherwise: the opaque write).
  float al = W > 0.0 ? A / W : 1.0;
  if (al <= 0.002) discard;
  // Fade mode's two passes: the opaque fill writes depth, then the
  // translucent fill blends over it without (a fading over pass must not
  // punch through a seen under pass).
  if (uFp == 1 && al < 0.999) discard;
  if (uFp == 2 && al >= 0.999) discard;
  o = vec4(col * al, al);
#endif
}`;
/** The knot uniforms APP_FS reads (paint_model.ts knotUniforms). */
const KNOT_NAMES = [
  "uKBase", "uKFx", "uKFx2", "uKShape", "uKInk", "uKKnots", "uKGamut", "uKSect", "uKPaint", "uKPulse",
  "uKHead", "uKReach", "uKGold", "uKLook", "uKPath", "uKPathB", "uKHlPulse", "uKHlHover", "uKHlFray", "uKBorder",
  "uKExplore",
] as const;
/** The paint data textures' samplers, on units 1-4 (paint_glsl PAINT_DATA_GLSL). */
const APP_TEX = ["uKStatic", "uKGeom", "uKReveal", "uKPaintData"] as const;
/** What APP_FS reads beyond the outline's own arrays: the app's paint
 * textures (pixi's GL handles, fetched each draw), its knot uniform values,
 * and the world size of one device pixel (kPaintAt's antialiasing). */
export interface AppPaint {
  tex: readonly WebGLTexture[];
  knot: Readonly<Record<string, Float32Array>>;
  px: number;
}
// band_gpu's band: one quad per border segment, the tie alpha per fragment.
// The fragment shader is band_gpu.alphaCpu line for line (that function's
// test ties it to the prototype's per-vertex alphaAt).
const BAND_VS = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=1) in vec4 aA;
layout(location=2) in int aCh;
layout(location=3) in ivec4 aSl;
uniform mat3 uMat;
out vec2 vPos;
out vec4 vA;
flat out ivec4 vSl;
flat out int vCh;
void main() {
  vec3 p = uMat * vec3(aPos, 1.0);
  gl_Position = vec4(p.xy, 0.0, 1.0);
  vPos = aPos;
  vA = aA;
  vSl = aSl;
  vCh = aCh;
}`;
const BAND_FS = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D uChain;
uniform sampler2D uPass;
uniform vec3 uInk;
uniform float uH;
uniform float uW;
uniform float uZt;
in vec2 vPos;
in vec4 vA;
flat in ivec4 vSl;
flat in int vCh;
uniform int uPre;
out vec4 o;
${RV_MASK_GLSL}
#if KRV
${SW_MASK_GLSL}
#endif
${KNOT_UNIFORMS_GLSL}
${PAINT_CONST_GLSL}
${PAINT_DATA_GLSL}
${EXPLORE_VIS_GLSL}
uniform float uPx;
${K_SMOOTH_GLSL}
${EX_LOOK_GLSL}
// K1291 s2: a scene chain's visibility at s under the thread reveal (1
// when it is off), with the fill's end look at the edge: where the look
// hides a frontier's fill, its border and its crossings go too.
highp float exVisS(int i, highp float s) {
  if (!(uKExplore.x > 0.5) || i < 0) return 1.0;
  highp vec4 cm = texelFetch(uCm, ivec2(i % ${RUN_MAP_W}, i / ${RUN_MAP_W}), 0);
  if (cm.x < -0.5) return 1.0;
  KChain c = kChain(int(cm.x + 0.5));
  if (!(c.total > 0.0) || c.count < 2) return 1.0;
  highp float a = cm.y + s * cm.z;
  a = c.closed ? kWrap(a, c.total) : clamp(a, 0.0, c.total);
  highp float v = kExploreAt(c, kCtrlOfArc(c, a));
  int look = int(uKExplore.y + 0.5);
  if (kExTip >= 0.0 && look >= 2) {
    highp float exS = 0.0; highp float exLf = 0.0;
    if (look != 2) {
      highp float exA0 = kArcU(c, kExSolid);
      exS = abs(kArcU(c, kExX) - exA0);
      exLf = abs(kArcU(c, kExEnd) - exA0);
    }
    v = kExploreLook(look, v, kExTip, exS, exLf, 0.5, uPx / max(uKExplore.w, 1e-6), uPx);
  }
  return v;
}
const int TW = ${BAND_TEX_W};
vec4 T(int q, int k) { int i = q * 4 + k; return texelFetch(uPass, ivec2(i % TW, i / TW), 0); }
vec4 S(int i) { return texelFetch(uChain, ivec2(i % TW, i / TW), 0); }
float dS(float len, float a, float c) { float d = c - a; if (len > 0.0) { d = mod(d, len); if (d > 0.5 * len) d -= len; } return d; }
float sst(float e0, float e1, float x) { float t = clamp((x - e0) / (e1 - e0), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
// K1324 s2: draw.ts zAtC on one chain's samples (base b, count n; len > 0 when closed).
float zAtS(int b, int n, float len, float s) {
  if (n <= 0) return 0.0;
  float last = S(b + n - 1).z;
  float u = len > 0.0 ? mod(s, len) : clamp(s, 0.0, last);
  if (u >= last) {
    if (!(len > 0.0)) return S(b + n - 1).w;
    float l = len - last; float t = l > 0.0 ? (u - last) / l : 0.0;
    return S(b + n - 1).w + (S(b).w - S(b + n - 1).w) * t;
  }
  int lo = 0; int hi = n - 1;
  while (hi - lo > 1) { int m = (lo + hi) >> 1; if (S(b + m).z <= u) lo = m; else hi = m; }
  vec4 A = S(b + lo); vec4 B = S(b + lo + 1);
  float l = B.z - A.z; float t = l > 0.0 ? (u - A.z) / l : 0.0;
  return A.w + (B.w - A.w) * t;
}
void main() {
  float s = vA.x;
#if KRV
  // K1291 s3: an arc (a junction corner, slot 0 = -2 - its entry) runs
  // from chain A's sA to chain B's sB: it shows where BOTH arms show at its
  // ends (band_gpu.ts).
  float sA = s; int chB = -1; float sB = 0.0;
  if (vSl.x <= -2) { vec4 e = T(-2 - vSl.x, 0); sA = e.y; chB = int(e.z + 0.5); sB = e.w; }
  // K1291 s2: under a reveal, the band is the whole-width border only; a
  // narrowed stretch's border is the fill's (APP_FS), none is unrevealed.
  bool rv = uRvOn > 0;
  if (rv && vCh >= 0 && min(rvMaskS(vCh, sA), chB >= 0 ? rvMaskS(chB, sB) : 1.0) < 0.999) discard;
  // K1291 s3: where the rainbow swells the thread, its swell draws the border.
  if (uSwOn > 0 && vCh >= 0 && max(swMaskS(vCh, sA), chB >= 0 ? swMaskS(chB, sB) : 1.0) > 1.0005) discard;
  // K1291 s2: under the thread reveal, the border shows with its OWN
  // thread (a hidden thread's border would cross a seen one's fill).
  float exV = exVisS(vCh, sA);
  if (chB >= 0) exV = min(exV, exVisS(chB, sB));
  if (exV <= 0.002) discard;
#else
  // K1291 s3: no reveal: whole, as stage 1's band.
  const bool rv = false;
  const float exV = 1.0;
#endif
  float keyC = vA.z - vA.y * uZt / uH;
  float seenO[4]; float seenS[4]; float seenL[4]; float seenF[4];
  int n = 0;
  for (int q = 0; q < 4; q++) {
    int pid = vSl[q];
    if (pid < 0) continue;
    vec4 t0 = T(pid, 0); vec4 t1 = T(pid, 1); vec4 t2 = T(pid, 2); vec4 t3 = T(pid, 3);
    float ds = dS(t2.y, t0.x, s);
    if (ds < -t0.y || ds > t0.z) continue;
    float r = t0.w; float so = t1.x; int ob = int(t1.y); int on = int(t1.z);
    float oLen = t2.x; float skipR = t2.z;
    float best = 1e30; float bs = 0.0; float bz = 0.0;
    for (int w = 0; w < 2; w++) {
      int k0 = int(w == 0 ? t3.x : t3.z); int k1 = int(w == 0 ? t3.y : t3.w);
      for (int k = k0; k <= k1; k++) {
        int j = k + 1 == on ? 0 : k + 1;
        vec4 A = S(ob + k); vec4 B = S(ob + j);
        float lk = j == 0 ? max(oLen, 0.0) - A.z : B.z - A.z;
        float mid = A.z + 0.5 * lk;
        if (abs(dS(oLen, so, mid)) > r + 0.5 * lk) continue;
        if (skipR > 0.0 && abs(dS(oLen, s, mid)) < skipR) continue;
        vec2 e = B.xy - A.xy; float l2 = dot(e, e);
        float t = l2 > 0.0 ? clamp(dot(vPos - A.xy, e) / l2, 0.0, 1.0) : 0.0;
        float d = length(vPos - A.xy - t * e);
        if (d < best) { best = d; bs = A.z + t * lk; bz = A.w + (B.w - A.w) * t; }
      }
    }
    // The covering thread at its reveal width (unrevealed covers nothing).
    float hO = rv ? uH * rvMaskS(int(t1.w + 0.5), bs) : uH;
    if (!(best < hO)) continue;
    // ... and under the thread reveal, a hidden thread covers nothing.
#if KRV
    float vO = exVisS(int(t1.w + 0.5), bs);
    if (vO <= 0.002) continue;
#else
    const float vO = 1.0;
#endif
    float g = clamp((hO - best) / uW, 0.0, 1.0) * vO;
    float keyO = bz - best * uZt / uH;
    // K1324 s2 (K1331): the self-pass burial rule, draw.ts selfBury's twin
    // (test/render/self_bury.test.ts). A self pass's partner samples are
    // the own chain's, so both anchors read the same table.
    float bury = 0.0;
    if (vCh >= 0 && int(t1.w + 0.5) == vCh) {
      float lam = 1.0 - min(1.0, abs(bz - vA.z) / (2.0 * uZt));
      if (lam > 0.0) {
        float dA = zAtS(ob, on, oLen, so) - zAtS(ob, on, oLen, t0.x);
        if (abs(dA) > 10.0 * uZt) bury = sign(dA) * 2.0 * uZt * lam;
      }
    }
    float f = 1.0 - g * sst(-uZt, uZt, keyO - keyC + bury);
    int m = -1;
    for (int u = 0; u < 4; u++) if (m < 0 && u < n && seenO[u] == t1.w && abs(dS(seenL[u], seenS[u], bs)) < uH) m = u;
    if (m < 0) { seenO[n] = t1.w; seenS[n] = bs; seenL[n] = oLen; seenF[n] = f; n++; }
    else if (f < seenF[m]) { seenS[m] = bs; seenF[m] = f; }
  }
  float a = vA.w * exV;
  for (int u = 0; u < 4; u++) if (u < n) a *= seenF[u];
  // K1291 s2: while a materializing intro runs, premultiplied (blended by
  // the fill's alpha under it, so a border fades with its thread).
  o = uPre > 0 ? vec4(uInk * a, a) : vec4(uInk, a);
}`;
const COMP_VS = `#version 300 es
void main() {
  int id = gl_VertexID;
  gl_Position = vec4(id == 1 ? 3.0 : -1.0, id == 2 ? 3.0 : -1.0, 0.0, 1.0);
}`;
const COMP_FS = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uC;
out vec4 o;
void main() {
  vec4 c = texelFetch(uC, ivec2(gl_FragCoord.xy), 0);
  if (c.a <= 0.0) discard;
  o = c;
}`;

/** K1291 s3: a fill or band shader with its reveal code in (KRV 1) or out
 *  (KRV 0). Exported for the tests. */
export function krvSource(src: string, on: boolean): string {
  const m = /^#version 300 es\r?\n/.exec(src);
  if (!m) throw new Error("krvSource: no #version line");
  return `${m[0]}#define KRV ${on ? 1 : 0}\n${src.slice(m[0].length)}`;
}
/** K1291 s3: the shaders krvSource builds both ways (for the tests). */
export const KRV_SHADERS = { APP_FS, BAND_FS };

type U = WebGLUniformLocation | null;
type UA = { mat: U; ks: U; map: U; px: U; tex: U[]; knot: U[]; ink: U; h: U; w: U; rv: U; cm: U; rvOn: U; chainS: U; ci: U; fp: U; swl: U };
type UB = { mat: U; chain: U; pass: U; ink: U; h: U; w: U; zt: U; rv: U; cm: U; rvOn: U; pre: U; tex: U[]; knot: U[]; px: U; sw: U; swOn: U };

/** The GL side: programs, the outline's buffers, the offscreen target. */
class OutlinePass {
  readonly gl: WebGL2RenderingContext;
  w = 0;
  h = 0;
  private paint: WebGLProgram;
  private band: WebGLProgram;
  private comp: WebGLProgram;
  private uP: { mat: U; ks: U; runs: U };
  /** K1291: the app's fill (APP_FS) and its uniforms. */
  private app: WebGLProgram;
  private uA: UA;
  private runMap: WebGLTexture;
  hasMap = false;
  private uB: UB;
  /** K1291 s3: the fill and band programs twice: [0] with the reveal, intro
   *  FX and thread reveal code (KRV 1), [1] without (KRV 0, stage 1's
   *  programs: no discard, so the fill keeps its early depth test). A frame
   *  where none of the three runs draws [1]; app/uA and band/uB are this
   *  frame's pick. */
  private appV: [WebGLProgram, WebGLProgram];
  private uAV: [UA, UA];
  private bandV: [WebGLProgram, WebGLProgram];
  private uBV: [UB, UB];
  /** K1291 s3: the swell depth-tested against the fill (true: under the
   *  threads that pass over it) or drawn over everything (false, today's
   *  rainbow head: no thread's casing shows across it). A probe's A/B. */
  swDepth = false;
  /** K1291 s3: force a pair (a probe's A/B: true = [1], false = [0]); null = by the frame. */
  lite: boolean | null = null;
  /** K1291 s3: the pair the last draw used (1 = without the reveal code). */
  drewLite = -1;
  private chainTex: WebGLTexture;
  private passTex: WebGLTexture;
  /** K1291 s2: the reveal masks (paint.ts revealMaskTex), the per-scene-chain
   *  map (appRunMap over 0..n-1) and band_gpu's chain table (base, n, len). */
  private rvTex: WebGLTexture;
  private cmTex: WebGLTexture;
  private ciTex: WebGLTexture;
  /** A reveal is running (a mask packed and uploaded this frame or before). */
  rvOn = false;
  /** K1291 s3: the rainbow's swell - its multipliers (revealMaskTex of
   *  reveal_fx revealWidth) for the band, its strip (paint.ts swellStrip)
   *  for the fill; swOn while any chain swells. */
  private swTex: WebGLTexture;
  /** K1247 s19 (oe=1): the record tag buffer, the strip table and fallback rows, their uniforms per program. */
  private recBuf: WebGLBuffer | null = null;
  private recStripTex: WebGLTexture | null = null;
  private recFbTex: WebGLTexture | null = null;
  private recPfTex: WebGLTexture | null = null;
  private recU = new Map<WebGLProgram, Record<"chain" | "ci" | "strip" | "fb" | "pf" | "hw" | "zt" | "sag", U>>();
  private recV = { hw: 0, zt: 0, sag: 0 };
  /** K1247 s19 (oe=1): the placement pass (transform feedback, once per reply), its VAO over the
   *  reply's buffers, and the placed vertices the fill programs draw from (REC_PLACE_STRIDE floats). */
  private place: WebGLProgram | null = null;
  private placeVao: WebGLVertexArrayObject | null = null;
  private placeTf: WebGLTransformFeedback | null = null;
  private placedBuf: WebGLBuffer | null = null;
  private placedN = -1;
  /** K1247 s23 (ob=1): the band's placement pass (band_place.ts, once per reply), its tables, the placed
   *  quads (s25: BAND_QUAD_STRIDE words a quad, BAND_QUAD_VS) and the VAO the band's quad programs (rv)
   *  draw them through as instances; hw: the h, W the last placement used. */
  private bp: { prog: WebGLProgram; u: Record<"tab" | "fb" | "sl" | "pass" | "chain" | "ci" | "pf" | "nd" | "h" | "w", U>; tf: WebGLTransformFeedback; buf: WebGLBuffer; vao: WebGLVertexArrayObject; tex: Record<"tab" | "fb" | "sl" | "pf", WebGLTexture>; n: number; rv: [WebGLProgram, WebGLProgram]; uRV: [UB, UB]; qU: [Record<"fb" | "sl" | "h" | "w", U>, Record<"fb" | "sl" | "h" | "w", U>]; hw: [number, number] } | null = null;
  private bpOn = false;
  /** K1247 s24 (ob=1): the placement pass waiting for the next draw (nD, h, W): it runs at the start of
   *  the frame that draws the reply, not in the reply's message task, so the frame pays for it. */
  private bpPend: [number, number, number] | null = null;
  /** K1247 s24 probes: the last placement's inputs, and how many more draws re-run it (no reply, no upload:
   *  the pass's own GPU cost, `__knotOutline.replace(n)`). */
  private bpLast: [number, number, number] | null = null;
  bpRep = 0;
  /** K1247 s24: the placement pass's GPU ms (EXT_disjoint_timer_query_webgl2, when exposed) and its CPU
   *  dispatch ms, the last 512 each. */
  readonly tfGpu: number[] = [];
  readonly tfCpu: number[] = [];
  private tq: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null | undefined = undefined;
  private tqPend: WebGLQuery[] = [];
  /** K1247 s25: each BAND_TEX_W-wide data texture's height at its last upload. */
  private readonly ftexH = new WeakMap<WebGLTexture, number>();
  private recOk = false;
  private recN = 0;
  private nPaint = 0;
  private swBuf: WebGLBuffer;
  private swVao: WebGLVertexArrayObject;
  swOn = false;
  private swChains: SwellStrip["chains"] = [];
  /** The last reply's band chain samples (swellStrip reads them). */
  zTab: { chainTex: Float32Array; chainInfo: Float32Array } | null = null;
  private hasCm = false;
  private band_: { ink: [number, number, number]; h: number; W: number; zt: number } = { ink: [0, 0, 0], h: 1, W: 1, zt: 0 };
  private uC: U;
  private pVao: WebGLVertexArrayObject;
  private bVao: WebGLVertexArrayObject;
  private cVao: WebGLVertexArrayObject;
  private bufs: Record<"pos" | "key" | "w" | "s" | "run" | "idx" | "bPos" | "bAttr" | "bSl" | "bCh", WebGLBuffer>;
  private runTex: WebGLTexture;
  private fbo: WebGLFramebuffer;
  private color: WebGLTexture | null = null;
  private depth: WebGLRenderbuffer | null = null;
  nIdx = 0;
  nBand = 0;
  ks = 1;
  hasData = false;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const mk = (vs: string, fs: string, what: string, tf?: string[]): WebGLProgram => {
      const sh = (type: number, src: string): WebGLShader => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`outline ${what}: ${gl.getShaderInfoLog(s)}`);
        return s;
      };
      const p = gl.createProgram()!;
      const v = sh(gl.VERTEX_SHADER, vs);
      const f = sh(gl.FRAGMENT_SHADER, fs);
      gl.attachShader(p, v);
      gl.attachShader(p, f);
      if (tf) gl.transformFeedbackVaryings(p, tf, gl.INTERLEAVED_ATTRIBS);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`outline ${what} link: ${gl.getProgramInfoLog(p)}`);
      gl.deleteShader(v);
      gl.deleteShader(f);
      return p;
    };
    this.paint = mk(PAINT_VS, PAINT_FS, "paint");
    this.bandV = [mk(BAND_VS, krvSource(BAND_FS, true), "band"), mk(BAND_VS, krvSource(BAND_FS, false), "band (no reveal)")];
    this.band = this.bandV[0];
    this.comp = mk(COMP_VS, COMP_FS, "composite");
    this.uP = { mat: gl.getUniformLocation(this.paint, "uMat"), ks: gl.getUniformLocation(this.paint, "uKS"), runs: gl.getUniformLocation(this.paint, "uRuns") };
    this.appV = [mk(APP_VS, krvSource(APP_FS, true), "app paint"), mk(APP_VS, krvSource(APP_FS, false), "app paint (no reveal)")];
    if (FILL_REC) {
      const p = mk(REC_PLACE_VS, REC_PLACE_FS, "record placement", REC_PLACE_OUT);
      this.place = p;
      const u = (n: string): U => gl.getUniformLocation(p, n);
      this.recU.set(p, { chain: u("uRecChain"), ci: u("uRecCi"), strip: u("uRecStrip"), fb: u("uRecFb"), pf: u("uRecPf"), hw: u("uRecHW"), zt: u("uRecZt"), sag: u("uRecSag") });
    }
    if (BAND_REC) {
      const p = mk(BAND_QUAD_VS, BAND_PLACE_FS, "band placement", BAND_QUAD_OUT);
      const u = (n: string): U => gl.getUniformLocation(p, n);
      const tx = (): WebGLTexture => gl.createTexture()!;
      const rvs = bandQuadVs(BAND_VS);
      const rv: [WebGLProgram, WebGLProgram] = [mk(rvs, krvSource(BAND_FS, true), "band quads"), mk(rvs, krvSource(BAND_FS, false), "band quads (no reveal)")];
      const qu = (q: WebGLProgram): Record<"fb" | "sl" | "h" | "w", U> => ({ fb: gl.getUniformLocation(q, "uBqFb"), sl: gl.getUniformLocation(q, "uBqSl"), h: gl.getUniformLocation(q, "uBqH"), w: gl.getUniformLocation(q, "uBqW") });
      this.bp = { prog: p, u: { tab: u("uBpTab"), fb: u("uBpFb"), sl: u("uBpSl"), pass: u("uBpPass"), chain: u("uRecChain"), ci: u("uRecCi"), pf: u("uRecPf"), nd: u("uBpND"), h: u("uBpH"), w: u("uBpW") }, tf: gl.createTransformFeedback()!, buf: gl.createBuffer()!, vao: gl.createVertexArray()!, tex: { tab: tx(), fb: tx(), sl: tx(), pf: tx() }, n: -1, rv, uRV: [this.bandUniforms(rv[0]), this.bandUniforms(rv[1])], qU: [qu(rv[0]), qu(rv[1])], hw: [0, 0] };
      // The band's quad programs read the placed quads as instances (qO, qI, qS, qM, qL; divisor 1).
      gl.bindVertexArray(this.bp.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bp.buf);
      const sb = 4 * BAND_QUAD_STRIDE;
      for (let k = 0; k < 5; k++) { gl.enableVertexAttribArray(k); gl.vertexAttribPointer(k, 4, gl.FLOAT, false, sb, 16 * k); gl.vertexAttribDivisor(k, 1); }
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    this.uAV = [this.appUniforms(this.appV[0]), this.appUniforms(this.appV[1])];
    this.uBV = [this.bandUniforms(this.bandV[0]), this.bandUniforms(this.bandV[1])];
    this.app = this.appV[0];
    this.uA = this.uAV[0];
    this.uB = this.uBV[0];
    this.runMap = gl.createTexture()!;
    this.uC = gl.getUniformLocation(this.comp, "uC");
    const nb = (): WebGLBuffer => gl.createBuffer()!;
    this.bufs = { pos: nb(), key: nb(), w: nb(), s: nb(), run: nb(), idx: nb(), bPos: nb(), bAttr: nb(), bSl: nb(), bCh: nb() };
    const attr = (b: WebGLBuffer, loc: number, n: number, int = false): void => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.enableVertexAttribArray(loc);
      if (int) gl.vertexAttribIPointer(loc, n, gl.INT, 0, 0);
      else gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
    };
    if (FILL_REC) {
      // K1247 s19: the placement pass reads the reply's buffers and the record tags.
      this.recBuf = nb();
      this.placedBuf = nb();
      this.placeTf = gl.createTransformFeedback();
      this.placeVao = gl.createVertexArray()!;
      gl.bindVertexArray(this.placeVao);
      attr(this.bufs.pos, 0, 2);
      attr(this.bufs.key, 2, 1);
      attr(this.bufs.s, 5, 4);
      attr(this.recBuf, 6, 2, true);
    }
    this.pVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.pVao);
    if (this.placedBuf) {
      // K1247 s19: the fill draws aPos, aKey and aS from the placed vertices.
      gl.bindBuffer(gl.ARRAY_BUFFER, this.placedBuf);
      const sb = 4 * REC_PLACE_STRIDE;
      for (const [loc, n, at] of [[0, 2, 0], [2, 1, 2], [5, 4, 4]]) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, n, gl.FLOAT, false, sb, 4 * at);
      }
    } else {
      attr(this.bufs.pos, 0, 2);
      attr(this.bufs.key, 2, 1);
      attr(this.bufs.s, 5, 4);
    }
    attr(this.bufs.run, 3, 4, true);
    attr(this.bufs.w, 4, 4);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufs.idx);
    this.bVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.bVao);
    attr(this.bufs.bPos, 0, 2);
    attr(this.bufs.bAttr, 1, 4);
    attr(this.bufs.bSl, 3, 4, true);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufs.bCh);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribIPointer(2, 1, gl.SHORT, 0, 0);
    this.cVao = gl.createVertexArray()!;
    // K1291 s3: the swell strip (paint.ts swellStrip, SWELL_STRIDE floats a
    // vertex) as the fill's aPos, aKey, aW and aS; aRun stays a constant.
    this.swBuf = gl.createBuffer()!;
    this.swVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.swVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.swBuf);
    const sb = 4 * SWELL_STRIDE;
    for (const [loc, n, at] of [[0, 2, 0], [2, 1, 2], [4, 4, 3], [5, 1, 7]]) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, sb, 4 * at);
    }
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.runTex = gl.createTexture()!;
    this.chainTex = gl.createTexture()!;
    this.passTex = gl.createTexture()!;
    this.rvTex = gl.createTexture()!;
    this.cmTex = gl.createTexture()!;
    this.ciTex = gl.createTexture()!;
    this.swTex = gl.createTexture()!;
    if (FILL_REC) { this.recStripTex = gl.createTexture()!; this.recFbTex = gl.createTexture()!; this.recPfTex = gl.createTexture()!; }
    this.fbo = gl.createFramebuffer()!;
  }

  /** K1247 s19: program p's record uniforms and the record textures on units 9-12. */
  private recBind(p: WebGLProgram): void {
    const u = this.recU.get(p); if (!u || !this.recStripTex || !this.recFbTex || !this.recPfTex) return;
    const gl = this.gl;
    ([[this.chainTex, u.chain], [this.ciTex, u.ci], [this.recStripTex, u.strip], [this.recFbTex, u.fb], [this.recPfTex, u.pf]] as [WebGLTexture, U][]).forEach(([tx, l], i) => {
      gl.activeTexture(gl.TEXTURE9 + i);
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.uniform1i(l, 9 + i);
    });
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1f(u.hw, this.recV.hw);
    gl.uniform1f(u.zt, this.recV.zt);
    gl.uniform1f(u.sag, this.recV.sag);
  }

  private appUniforms(p: WebGLProgram): UA {
    const ua = (n: string): U => this.gl.getUniformLocation(p, n);
    return {
      fp: ua("uFp"), mat: ua("uMat"), ks: ua("uKS"), map: ua("uRunMap"), px: ua("uPx"),
      tex: APP_TEX.map(ua), knot: KNOT_NAMES.map(ua), ink: ua("uInk"), h: ua("uH"), w: ua("uW"),
      rv: ua("uRv"), cm: ua("uCm"), rvOn: ua("uRvOn"), chainS: ua("uChainS"), ci: ua("uCi"), swl: ua("uSwl"),
    };
  }

  private bandUniforms(p: WebGLProgram): UB {
    const ub = (n: string): U => this.gl.getUniformLocation(p, n);
    return {
      mat: ub("uMat"), chain: ub("uChain"), pass: ub("uPass"), ink: ub("uInk"), h: ub("uH"), w: ub("uW"), zt: ub("uZt"),
      rv: ub("uRv"), cm: ub("uCm"), rvOn: ub("uRvOn"), pre: ub("uPre"),
      tex: APP_TEX.map(ub), knot: KNOT_NAMES.map(ub), px: ub("uPx"), sw: ub("uSw"), swOn: ub("uSwOn"),
    };
  }

  /** A worker reply into the buffers (idx and run only on a restructure). */
  upload(r: OutlineReply): void {
    const gl = this.gl;
    const put = (b: WebGLBuffer, d: ArrayBufferView): void => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, d, gl.DYNAMIC_DRAW);
    };
    // K1247 s19: a frame with the records on the GPU sends only the first nDyn paint vertices.
    const sub = r.nDyn >= 0 && !r.restructured && 2 * r.nDyn <= r.pos.length && this.nPaint > 0;
    const putP = (b: WebGLBuffer, d: ArrayBufferView): void => {
      if (!sub) return put(b, d);
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, d);
    };
    putP(this.bufs.pos, r.pos);
    putP(this.bufs.key, r.pkey);
    putP(this.bufs.w, r.w);
    putP(this.bufs.s, r.s);
    if (!sub) this.nPaint = r.pkey.length;
    if (r.rec && this.recBuf) {
      put(this.recBuf, r.rec);
      this.recN = r.rec.length >> 1;
    }
    if (r.run) put(this.bufs.run, r.run);
    if (r.idx) {
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufs.idx);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, r.idx, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      this.nIdx = r.idx.length;
    }
    this.bpOn = !!(r.bandRec && this.bp);
    if (!this.bpOn) {
      put(this.bufs.bPos, r.bandPos);
      put(this.bufs.bAttr, r.bandAttr);
      put(this.bufs.bSl, r.bandSlots);
      put(this.bufs.bCh, r.bandChain);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.nBand = r.bandCount;
    this.band_ = { ink: r.ink, h: r.h, W: r.W, zt: r.zt };
    this.ks = r.ks;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.runTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, r.texW, r.texH, 0, gl.RGBA, gl.FLOAT, r.tex);
    const ftex = (t: WebGLTexture, d: Float32Array, h: number): void => {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      // K1247 s25: same height as the last reply's: overwrite in place (texImage2D redefines the storage).
      if (this.ftexH.get(t) === h) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, BAND_TEX_W, h, gl.RGBA, gl.FLOAT, d);
      else { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, BAND_TEX_W, h, 0, gl.RGBA, gl.FLOAT, d); this.ftexH.set(t, h); }
    };
    ftex(this.chainTex, r.chainTex, r.chainTexH);
    ftex(this.passTex, r.passTex, r.passTexH);
    const ciH = Math.max(1, Math.ceil(r.chainInfo.length / 4 / BAND_TEX_W));
    const ci = new Float32Array(4 * BAND_TEX_W * ciH);
    ci.set(r.chainInfo);
    ftex(this.ciTex, ci, ciH);
    if (this.recStripTex && this.recFbTex && this.recPfTex && r.recStrip && r.recFb && r.recPf) {
      const pad = (d: Float32Array): [Float32Array, number] => {
        const h = Math.max(1, Math.ceil(d.length / 4 / BAND_TEX_W)); if (d.length === 4 * BAND_TEX_W * h) return [d, h];
        const o = new Float32Array(4 * BAND_TEX_W * h); o.set(d); return [o, h];
      };
      ftex(this.recStripTex, ...pad(r.recStrip));
      ftex(this.recFbTex, ...pad(r.recFb));
      ftex(this.recPfTex, ...pad(r.recPf));
      this.recV = { hw: r.recHW, zt: r.recZt, sag: r.recSag };
      this.recOk = true;
    }
    if (this.bpOn && this.bp && r.bandRec) {
      const pad = (d: Float32Array): [Float32Array, number] => {
        const h = Math.max(1, Math.ceil(d.length / 4 / BAND_TEX_W)); if (d.length === 4 * BAND_TEX_W * h) return [d, h];
        const o = new Float32Array(4 * BAND_TEX_W * h); o.set(d); return [o, h];
      };
      const B = r.bandRec;
      ftex(this.bp.tex.tab, ...pad(B.tab));
      ftex(this.bp.tex.fb, ...pad(B.fb));
      ftex(this.bp.tex.sl, ...pad(B.fbSl));
      ftex(this.bp.tex.pf, ...pad(B.pf));
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.placeFill();
    this.bpPend = this.bpOn && r.bandRec ? [r.bandRec.nD, r.h, r.W] : null;
    this.zTab = { chainTex: r.chainTex, chainInfo: r.chainInfo };
    this.hasData = true;
  }

  /** K1247 s19 (oe=1): the fill's vertices placed into placedBuf, once per reply (transform
   *  feedback through REC_PLACE_VS); the fill programs draw from it. Before the record tables
   *  arrive, every vertex passes through as the worker placed it. */
  private placeFill(): void {
    const gl = this.gl;
    const p = this.place;
    const n = this.nPaint;
    if (!p || !this.placeVao || !this.placeTf || !this.placedBuf || n <= 0) return;
    if (this.placedN !== n) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.placedBuf);
      gl.bufferData(gl.ARRAY_BUFFER, 4 * REC_PLACE_STRIDE * n, gl.DYNAMIC_COPY);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      this.placedN = n;
    }
    gl.useProgram(p);
    this.recBind(p);
    gl.bindVertexArray(this.placeVao);
    if (this.recOk && this.recN === n) gl.enableVertexAttribArray(6);
    else {
      gl.disableVertexAttribArray(6);
      gl.vertexAttribI4i(6, -1, 0, 0, 0);
    }
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.placeTf);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.placedBuf);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  /** K1247 s24: the pending placement pass, timed (CPU dispatch; GPU by a timer query read back frames
   *  later), then the finished queries collected. */
  private placeBandTimed(): void {
    const gl = this.gl;
    // K1247 s25: the query only when a probe asks (`obt=1`): on ANGLE D3D11 an empty query reads 0.94 ms.
    if (this.tq === undefined) this.tq = (globalThis as { __knotBandTfTime?: boolean }).__knotBandTfTime ? gl.getExtension("EXT_disjoint_timer_query_webgl2") : null;
    const tq = this.tq;
    if (tq && this.tqPend.length) {
      const disjoint = gl.getParameter(tq.GPU_DISJOINT_EXT);
      while (this.tqPend.length) {
        const q = this.tqPend[0];
        if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
        const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number;
        if (!disjoint) { this.tfGpu.push(ns / 1e6); if (this.tfGpu.length > 512) this.tfGpu.shift(); }
        gl.deleteQuery(q);
        this.tqPend.shift();
      }
    }
    let P = this.bpPend;
    if (P) this.bpLast = P;
    else if (this.bpRep > 0 && this.bpLast) { P = this.bpLast; this.bpRep--; }
    if (!P) return;
    this.bpPend = null;
    const t0 = performance.now();
    const q = tq && this.tqPend.length < 8 ? gl.createQuery() : null;
    if (q && tq) gl.beginQuery(tq.TIME_ELAPSED_EXT, q);
    this.placeBand(P[0], P[1], P[2]);
    if (q && tq) { gl.endQuery(tq.TIME_ELAPSED_EXT); this.tqPend.push(q); }
    this.tfCpu.push(performance.now() - t0);
    if (this.tfCpu.length > 512) this.tfCpu.shift();
  }

  /** K1247 s23 (ob=1): the band placed into bp.buf, once per reply (transform feedback); the band's quad
   *  programs draw from it. s25: one invocation per QUAD (BAND_QUAD_VS over gl_VertexID = quad), each
   *  column placed once at both widths, the slots once; s23 ran BAND_PLACE_VS over every vertex. */
  private placeBand(nD: number, h: number, W: number): void {
    const gl = this.gl; const bp = this.bp; const n = Math.floor(this.nBand / 6);
    if (!bp || n <= 0) return;
    bp.hw = [h, W];
    if (bp.n !== n) {
      gl.bindBuffer(gl.ARRAY_BUFFER, bp.buf);
      gl.bufferData(gl.ARRAY_BUFFER, 4 * BAND_QUAD_STRIDE * n, gl.DYNAMIC_COPY);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      bp.n = n;
    }
    gl.useProgram(bp.prog);
    ([[bp.tex.tab, bp.u.tab], [bp.tex.fb, bp.u.fb], [bp.tex.sl, bp.u.sl], [this.passTex, bp.u.pass], [this.chainTex, bp.u.chain], [this.ciTex, bp.u.ci], [bp.tex.pf, bp.u.pf]] as [WebGLTexture, U][]).forEach(([tx, l], i) => {
      gl.activeTexture(gl.TEXTURE9 + i);
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.uniform1i(l, 9 + i);
    });
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(bp.u.nd, nD);
    gl.uniform1f(bp.u.h, h);
    gl.uniform1f(bp.u.w, W);
    gl.bindVertexArray(null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, bp.tf);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, bp.buf);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.useProgram(null);
  }

  /** The last reply's band widths (h, W) and depth step (zt). */
  bandParams(): { h: number; W: number; zt: number } {
    return this.band_;
  }

  /** K1291 s3: this frame's swell (multipliers and strip); off when none. */
  uploadSwell(m: { tex: Float32Array; w: number; h: number; on: boolean }, s: SwellStrip | null): void {
    this.swOn = m.on && !!s && s.chains.length > 0;
    if (!this.swOn || !s) { this.swChains = []; return; }
    this.tex2d(this.swTex, this.gl.R32F, m.w, m.h, m.tex);
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.swBuf);
    gl.bufferData(gl.ARRAY_BUFFER, s.data, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.swChains = s.chains;
  }

  private tex2d(t: WebGLTexture, fmt: number, w: number, h: number, d: Float32Array): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    if (fmt === gl.R32F) gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, w, h, 0, gl.RED, gl.FLOAT, d);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, d);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /** K1291 s2: the per-scene-chain map (appRunMap over 0..n-1) of a reply. */
  uploadChainMap(m: { tex: Float32Array; w: number; h: number }): void {
    this.tex2d(this.cmTex, this.gl.RGBA32F, m.w, m.h, m.tex);
    this.hasCm = true;
  }

  /** K1291 s2: this frame's reveal masks (paint.ts revealMaskTex); off when none. */
  uploadReveal(m: { tex: Float32Array; w: number; h: number; on: boolean }): void {
    this.rvOn = m.on;
    if (m.on) this.tex2d(this.rvTex, this.gl.R32F, m.w, m.h, m.tex);
  }

  /** K1291: the run map (paint.ts appRunMap) for the reply just uploaded. */
  uploadRunMap(m: { tex: Float32Array; w: number; h: number }): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.runMap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, m.w, m.h, 0, gl.RGBA, gl.FLOAT, m.tex);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.hasMap = true;
  }

  private target(w: number, h: number): void {
    const gl = this.gl;
    if (w === this.w && h === this.h && this.color) return;
    if (this.color) gl.deleteTexture(this.color);
    if (this.depth) gl.deleteRenderbuffer(this.depth);
    this.color = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.color);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.depth = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.color, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth);
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`outline target: framebuffer status ${st}`);
    this.w = w;
    this.h = h;
  }

  /** The fill, then the band, into the offscreen target (premultiplied). */
  draw(mat: Float32Array, w: number, h: number, ap: AppPaint | null = null): void {
    const gl = this.gl;
    if (this.bpOn || this.bpPend || this.bpRep || this.tqPend.length) this.placeBandTimed();
    this.target(w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.viewport(0, 0, w, h);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(true, true, true, true);
    gl.depthMask(true);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // The reveal needs the app's run map (the fill's chain) and the chain map.
    const rvOn = this.rvOn && this.hasCm && !!ap && this.hasMap;
    if (this.hasData) {
      // The fill: the highest key wins (LEQUAL: a tie goes to the later
      // triangle, as the prototype's page).
      // K1291 s2: a materializing intro (comet, dust) fades the fill in:
      // premultiplied over what is under it (alpha 1 elsewhere: the same
      // write as no blending).
      const kfx = ap?.knot["uKFx"];
      const kex = ap?.knot["uKExplore"];
      const fade =
        (!!kfx && kfx[3] > 0.5 && (Math.round(kfx[0]) === 2 || Math.round(kfx[0]) === 3)) ||
        (!!kex && kex[0] > 0.5);
      // K1291 s3: no reveal, intro FX or thread reveal this frame: the
      // programs without their code (stage 1's cost).
      const lite = this.lite ?? (!rvOn && !this.swOn && !(!!kfx && kfx[3] > 0.5) && !(!!kex && kex[0] > 0.5));
      const li = lite ? 1 : 0;
      this.app = this.appV[li];
      this.uA = this.uAV[li];
      this.band = this.bpOn && this.bp ? this.bp.rv[li] : this.bandV[li];
      this.uB = this.bpOn && this.bp ? this.bp.uRV[li] : this.uBV[li];
      this.drewLite = li;
      if (fade) {
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      } else gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      if (ap && this.hasMap) {
        // K1291: the app's material per slot (APP_FS).
        const A = this.uA;
        gl.useProgram(this.app);
        gl.uniformMatrix3fv(A.mat, false, mat);
        gl.uniform1f(A.ks, this.ks);
        gl.uniform1f(A.px, ap.px);
        for (let i = 0; i < KNOT_NAMES.length; i++) {
          const v = ap.knot[KNOT_NAMES[i]];
          if (v && A.knot[i]) gl.uniform4fv(A.knot[i], v);
        }
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.runMap);
        gl.uniform1i(A.map, 0);
        for (let i = 0; i < APP_TEX.length; i++) {
          gl.activeTexture(gl.TEXTURE1 + i);
          gl.bindTexture(gl.TEXTURE_2D, ap.tex[i]);
          gl.uniform1i(A.tex[i], 1 + i);
        }
        // K1291 s2: the reveal's textures on units 5-8.
        const B = this.band_;
        gl.uniform1i(A.rvOn, rvOn ? 1 : 0);
        gl.uniform3f(A.ink, B.ink[0], B.ink[1], B.ink[2]);
        gl.uniform1f(A.h, B.h);
        gl.uniform1f(A.w, B.W);
        const rvUnits: [WebGLTexture, U][] = [[this.chainTex, A.chainS], [this.rvTex, A.rv], [this.cmTex, A.cm], [this.ciTex, A.ci]];
        rvUnits.forEach(([t, u], i) => {
          gl.activeTexture(gl.TEXTURE5 + i);
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.uniform1i(u, 5 + i);
        });
      } else {
        gl.useProgram(this.paint);
        gl.uniformMatrix3fv(this.uP.mat, false, mat);
        gl.uniform1f(this.uP.ks, this.ks);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.runTex);
        gl.uniform1i(this.uP.runs, 0);
      }
      gl.bindVertexArray(this.pVao);
      if (fade && ap && this.hasMap) {
        gl.uniform1i(this.uA.fp, 1);
        gl.drawElements(gl.TRIANGLES, this.nIdx, gl.UNSIGNED_INT, 0);
        gl.depthMask(false);
        gl.uniform1i(this.uA.fp, 2);
        gl.drawElements(gl.TRIANGLES, this.nIdx, gl.UNSIGNED_INT, 0);
        gl.depthMask(true);
        gl.uniform1i(this.uA.fp, 0);
      } else gl.drawElements(gl.TRIANGLES, this.nIdx, gl.UNSIGNED_INT, 0);
      const swl = !fade && !!ap && this.hasMap && li === 0 && this.swOn && this.hasCm;
      if (ap && this.hasMap) {
        for (let i = APP_TEX.length + 4; i >= 1; i--) {
          gl.activeTexture(gl.TEXTURE0 + i);
          gl.bindTexture(gl.TEXTURE_2D, null);
        }
      }
      if (FILL_REC) for (let i = 12; i >= 9; i--) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, null); }
      if (FILL_REC) gl.activeTexture(gl.TEXTURE0);
      gl.disable(gl.DEPTH_TEST);
      // The band over it at its tie alpha; alpha accumulates premultiplied.
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      if (fade) gl.blendFuncSeparate(gl.DST_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
      else gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(this.band);
      gl.uniform1i(this.uB.pre, fade ? 1 : 0);
      gl.uniformMatrix3fv(this.uB.mat, false, mat);
      const B = this.band_;
      gl.uniform3f(this.uB.ink, B.ink[0], B.ink[1], B.ink[2]);
      gl.uniform1f(this.uB.h, B.h);
      gl.uniform1f(this.uB.w, B.W);
      gl.uniform1f(this.uB.zt, B.zt);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.chainTex);
      gl.uniform1i(this.uB.chain, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.passTex);
      gl.uniform1i(this.uB.pass, 1);
      gl.uniform1i(this.uB.rvOn, rvOn ? 1 : 0);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.rvTex);
      gl.uniform1i(this.uB.rv, 2);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.cmTex);
      gl.uniform1i(this.uB.cm, 3);
      // K1291 s2: the thread reveal's visibility (paint data on units 4-7).
      if (ap) {
        for (let i = 0; i < KNOT_NAMES.length; i++) {
          const v = ap.knot[KNOT_NAMES[i]];
          if (v && this.uB.knot[i]) gl.uniform4fv(this.uB.knot[i], v);
        }
        gl.uniform1f(this.uB.px, ap.px);
        for (let i = 0; i < APP_TEX.length; i++) {
          gl.activeTexture(gl.TEXTURE4 + i);
          gl.bindTexture(gl.TEXTURE_2D, ap.tex[i]);
          gl.uniform1i(this.uB.tex[i], 4 + i);
        }
      } else {
        const i = KNOT_NAMES.indexOf("uKExplore");
        if (this.uB.knot[i]) gl.uniform4f(this.uB.knot[i], 0, 0, 0, 0);
      }
      // K1291 s3: the swell's multipliers on unit 8 (the band steps aside).
      gl.uniform1i(this.uB.swOn, swl ? 1 : 0);
      if (swl) {
        gl.activeTexture(gl.TEXTURE8);
        gl.bindTexture(gl.TEXTURE_2D, this.swTex);
        gl.uniform1i(this.uB.sw, 8);
      }
      if (this.bpOn && this.bp) {
        // K1247 s25: the placed quads as instances of 6 corners; worker-placed quads read uBpFb / uBpSl.
        const bp = this.bp; const qu = bp.qU[this.bp.rv[0] === this.band ? 0 : 1];
        gl.activeTexture(gl.TEXTURE9);
        gl.bindTexture(gl.TEXTURE_2D, bp.tex.fb);
        gl.uniform1i(qu.fb, 9);
        gl.activeTexture(gl.TEXTURE10);
        gl.bindTexture(gl.TEXTURE_2D, bp.tex.sl);
        gl.uniform1i(qu.sl, 10);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1f(qu.h, bp.hw[0]);
        gl.uniform1f(qu.w, bp.hw[1]);
        gl.bindVertexArray(bp.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, Math.floor(this.nBand / 6));
      } else {
        gl.bindVertexArray(this.bVao);
        gl.drawArrays(gl.TRIANGLES, 0, this.nBand);
      }
      gl.disable(gl.BLEND);
      if (swl && ap) {
        // K1291 s3: the rainbow's swell (paint.ts swellStrip) after the band,
        // so it covers the lines of the threads it passes over, as today's
        // swelled ribbon does; the fill's depth still puts it under the
        // threads that pass over it. The fill's program and textures, the
        // per-scene-chain map in the run map's place.
        if (this.swDepth) {
          gl.enable(gl.DEPTH_TEST);
          gl.depthFunc(gl.LEQUAL);
        }
        gl.useProgram(this.app);
        gl.uniform1i(this.uA.swl, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.cmTex);
        for (let i = 0; i < APP_TEX.length; i++) {
          gl.activeTexture(gl.TEXTURE1 + i);
          gl.bindTexture(gl.TEXTURE_2D, ap.tex[i]);
        }
        [this.chainTex, this.rvTex, this.cmTex, this.ciTex].forEach((t, i) => {
          gl.activeTexture(gl.TEXTURE5 + i);
          gl.bindTexture(gl.TEXTURE_2D, t);
        });
        gl.bindVertexArray(this.swVao);
        for (const c of this.swChains) {
          gl.vertexAttribI4i(3, c.scene, -1, -1, -1);
          gl.drawArrays(gl.TRIANGLES, c.first, c.count);
        }
        gl.uniform1i(this.uA.swl, 0);
        gl.disable(gl.DEPTH_TEST);
      }
      for (let i = 8; i >= 1; i--) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, null);
      }
      gl.activeTexture(gl.TEXTURE0);
    }
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** The target over whatever is bound, one texel per pixel. */
  composite(): void {
    if (!this.color) return;
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(true, true, true, true);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.comp);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.color);
    gl.uniform1i(this.uC, 0);
    gl.bindVertexArray(this.cVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
  }

  dispose(): void {
    const gl = this.gl;
    for (const b of Object.values(this.bufs)) gl.deleteBuffer(b);
    gl.deleteVertexArray(this.pVao);
    gl.deleteVertexArray(this.bVao);
    gl.deleteVertexArray(this.cVao);
    gl.deleteProgram(this.paint);
    for (const p of this.appV) gl.deleteProgram(p);
    gl.deleteTexture(this.runMap);
    for (const p of this.bandV) gl.deleteProgram(p);
    gl.deleteProgram(this.comp);
    gl.deleteTexture(this.runTex);
    gl.deleteTexture(this.chainTex);
    gl.deleteTexture(this.passTex);
    gl.deleteTexture(this.rvTex);
    gl.deleteTexture(this.cmTex);
    gl.deleteTexture(this.ciTex);
    if (this.recBuf) gl.deleteBuffer(this.recBuf);
    if (this.recStripTex) gl.deleteTexture(this.recStripTex);
    if (this.recFbTex) gl.deleteTexture(this.recFbTex);
    if (this.recPfTex) gl.deleteTexture(this.recPfTex);
    if (this.place) gl.deleteProgram(this.place);
    if (this.placeVao) gl.deleteVertexArray(this.placeVao);
    if (this.placeTf) gl.deleteTransformFeedback(this.placeTf);
    if (this.placedBuf) gl.deleteBuffer(this.placedBuf);
    if (this.bp) {
      gl.deleteProgram(this.bp.prog);
      for (const p of this.bp.rv) gl.deleteProgram(p);
      gl.deleteTransformFeedback(this.bp.tf);
      gl.deleteBuffer(this.bp.buf);
      gl.deleteVertexArray(this.bp.vao);
      for (const t of Object.values(this.bp.tex)) gl.deleteTexture(t);
    }
    if (this.color) gl.deleteTexture(this.color);
    if (this.depth) gl.deleteRenderbuffer(this.depth);
    gl.deleteFramebuffer(this.fbo);
  }
}

export interface OutlineApp {
  frame(): void;
  after(): void;
  dispose(): void;
}

let warned = false;

export function createOutlineApp(ctx: SceneExportCtx, requestFrame: () => void): OutlineApp {
  let pass: OutlinePass | null = null;
  let host: { restore(): void } | null = null;
  let worker: Worker | null = null;
  let off = false;
  let lastR: unknown = null;
  let hidden: Container[] = [];
  let rc: RenderContainer | null = null;
  let seenCount = -1;
  let inFlight = false;
  let nextId = 1;
  let sentAt = 0;
  let dirty = false;
  let camKey = "";
  let composited = false;
  let drawn: (Float32Array | null)[] = [];
  // K1291: each request's chain maps (scene chain index -> the app's chain
  // and arc map), read back by its reply's run map; the paint textures'
  // update events and the knot uniforms' last drawn values (an overlay
  // change redraws on the next frame, no worker build).
  let sentMaps: ({ chain: number; arcLo: number; scale: number } | undefined)[] = [];
  let rvSeen = -1;
  const paintSources = [kStatic(), kGeom(), kReveal(), kPaint()].map((r) => r.source);
  const onPaint = (): void => {
    dirty = true;
  };
  for (const s of paintSources) s.on("update", onPaint);
  const knotSeen = new Float32Array(4 * (KNOT_NAMES.length + 7));
  const knotChanged = (k: Readonly<Record<string, Float32Array>>): boolean => {
    let o = 0;
    let changed = false;
    for (const n of KNOT_NAMES) {
      const v = k[n];
      if (!v) continue;
      for (let i = 0; i < v.length && o < knotSeen.length; i++, o++) {
        if (knotSeen[o] !== v[i]) {
          knotSeen[o] = v[i];
          changed = true;
        }
      }
    }
    return changed;
  };
  const stats = {
    posts: 0,
    replies: 0,
    restructures: 0,
    errors: 0,
    fallback: "",
    gatherMs: 0,
    postMs: 0,
    workerMs: 0,
    structureMs: 0,
    /** K1247 s21: the structure's parts (OutlineModel.structureParts). */
    structureParts: null as Record<string, number> | null,
    frameMs: 0,
    roundTripMs: 0,
    uploadMs: 0,
    drawMs: 0,
    draws: 0,
    composites: 0,
    compositesAfter: 0,
    bandCount: 0,
    /** K1247 s22: replies whose band vertex count differed from the reply before (the band restructured). */
    bandResizes: 0,
    /** K1247 s18: the last reply's typed-array bytes (top level and one level down). */
    replyBytes: 0,
    /** K1247 s18: oe=1 is on (the fill's strips placed as records). */
    fillRec: FILL_REC,
    /** K1247 s22: ob=1 is on (the band as a fixed layout of records). */
    bandRec: BAND_REC,
    triangles: 0,
    chains: 0,
    key: "",
    /** The last frame's parts in the worker (OutlineModel.parts). */
    parts: null as { frame: number; zChains: number; fill: number; paint: number; band: number } | null,
    /** The last 512 replies' [frame, round trip, upload, then parts in OutlineModel.parts order] ms and draws' ms, for medians (K1240 S4b). */
    replyMs: [] as number[][],
    drawMsLog: [] as number[],
    /** K1247 s24 (ob=1): the band placement pass's GPU ms (timer query; empty when not exposed) and CPU ms. */
    bandTfGpuMs: [] as number[],
    bandTfCpuMs: [] as number[],
    /** Each restructure: when (performance.now ms), why (the worker's cause), its worker ms. */
    rebuilds: [] as { at: number; cause: string; ms: number }[],
  };

  const gl = (): WebGL2RenderingContext | null => {
    const g = (ctx.app.renderer as unknown as { gl?: unknown }).gl;
    return typeof WebGL2RenderingContext !== "undefined" && g instanceof WebGL2RenderingContext ? g : null;
  };

  // The ribbon layers the outline replaces: base (child 0) and fillets (1).
  const attach = (): void => {
    const r = ctx.scene.renderer;
    if (!r) return;
    detach();
    const root = r.root;
    hidden = [root.children[0], root.children[1]].filter((c): c is Container => !!c && c.visible);
    for (const c of hidden) c.visible = false;
    rc = new RenderContainer({
      render: (renderer) => {
        if (!pass || off) return;
        const g = pass.gl;
        // Only the canvas itself maps one texel to one pixel.
        if (g.getParameter(g.FRAMEBUFFER_BINDING) !== null) return;
        try {
          pass.composite();
          composited = true;
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
    worker?.terminate();
    worker = null;
    inFlight = false;
    pass?.dispose();
    pass = null;
    detach();
  };

  const fallback = (why: string): void => {
    off = true;
    stats.fallback = why;
    if (!warned) {
      warned = true;
      console.warn(`K1240 outline: ${why}; rp=outline off`);
    }
    try {
      release();
    } finally {
      ctx.app.renderer.resetState();
      requestFrame();
    }
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

  // World to clip through the root's transform (CSS px) and the canvas's
  // device pixels; GLSL's mat3 is column-major.
  const camera = (): { mat: Float32Array; w: number; h: number; key: string } => {
    const canvas = ctx.app.canvas as HTMLCanvasElement;
    const w = canvas.width;
    const h = canvas.height;
    const sx = w / ctx.app.screen.width;
    const sy = h / ctx.app.screen.height;
    const root = ctx.root;
    const a = root.scale.x * sx;
    const d = root.scale.y * sy;
    const e = root.position.x * sx;
    const f = root.position.y * sy;
    const mat = new Float32Array([(2 * a) / w, 0, 0, 0, (-2 * d) / h, 0, (2 * e) / w - 1, 1 - (2 * f) / h, 1]);
    return { mat, w, h, key: `${w}x${h} ${a} ${d} ${e} ${f}` };
  };

  const onReply = (e: MessageEvent<OutlineReply>): void => {
    inFlight = false;
    const r = e.data;
    if (off) return;
    stats.replies++;
    stats.roundTripMs = performance.now() - sentAt;
    if (r.error) {
      stats.errors++;
      fallback(`worker failed (${r.error})`);
      return;
    }
    const g = gl();
    if (!g) return fallback("no WebGL2 context");
    try {
      if (!pass) {
        pass = new OutlinePass(g);
        stats.bandTfGpuMs = pass.tfGpu; stats.bandTfCpuMs = pass.tfCpu;
        host = pixiLabelHost(ctx.app.renderer as unknown as WebGLRenderer);
      }
      const t0 = performance.now();
      pass.upload(r);
      pass.uploadRunMap(appRunMap(r.runChain, sentMaps));
      pass.uploadChainMap(appRunMap(sentMaps.map((_, i) => i), sentMaps));
      stats.uploadMs = performance.now() - t0;
      if (r.restructured) {
        stats.restructures++;
        const at = Math.round(performance.now());
        stats.rebuilds.push({ at, cause: r.cause ?? "?", ms: Math.round(r.ms) });
        if (stats.rebuilds.length > 64) stats.rebuilds.shift();
        console.info(`K1240 outline: restructure (${r.cause}) ${Math.round(r.ms)} ms`);
      }
      stats.workerMs = r.ms;
      stats.structureMs = r.structureMs; stats.structureParts = r.structureParts;
      if (!r.restructured) {
        stats.frameMs = r.frameMs;
        stats.parts = r.parts;
        const p = r.parts;
        stats.replyMs.push([r.frameMs, stats.roundTripMs, stats.uploadMs, p?.frame ?? 0, p?.zChains ?? 0, p?.fill ?? 0, p?.paint ?? 0, p?.band ?? 0]);
        if (stats.replyMs.length > 512) stats.replyMs.shift();
      }
      if (stats.bandCount > 0 && r.bandCount !== stats.bandCount) stats.bandResizes++;
      stats.bandCount = r.bandCount;
      stats.replyBytes = replyBytes(r);
      stats.triangles = pass.nIdx / 3;
      stats.key = r.key.length > 64 ? `${r.key.slice(0, 64)}...` : r.key;
      dirty = true;
    } catch (err) {
      fallback(`upload failed (${err instanceof Error ? err.message : String(err)})`);
      return;
    } finally {
      ctx.app.renderer.resetState();
    }
    requestFrame();
  };

  const send = (): void => {
    const ps = ctx.scene.ps;
    if (!ps) return;
    const t0 = performance.now();
    const { input } = gatherSceneInput(
      ctx,
      { zPos: new Float64Array(ps.positions.length / 2), positions: ps.positions, simTime: 0 },
      "outline",
      "outline"
    );
    const { scene } = buildFieldScene(input);
    scene.look.ctrlArc ??= CTRL_ARC;
    // K1247 s18: the record fill places the fill's strips as records (fill_tri.ts recStrip2). On unless oe=0 (K1247 s20).
    if (FILL_REC) (scene.look as { fillRec?: number }).fillRec = 2;
    if (BAND_REC) Object.assign(scene.look, { bandRec: 1, bandRecGpu: 1 }); // K1247 s23: main places the records (band_place.ts)
    // K1247 s18 probe: a page that sets window.__knotOutlineCapture to an
    // array gets every sent scene as JSON (the drag's frames, replayed in Node).
    const cap = (globalThis as { __knotOutlineCapture?: string[] }).__knotOutlineCapture;
    if (Array.isArray(cap)) cap.push(JSON.stringify(scene));
    sentMaps = scene.chains.map((sc, i) => {
      const ch = input.chains[i];
      return ch ? { chain: sc.id, ...chainArcMap(ch, sc.pts, input.look.halfWidth) } : undefined;
    });
    stats.gatherMs = performance.now() - t0;
    stats.chains = scene.chains.length;
    snapshot();
    if (!worker) {
      worker = new Worker(new URL("./outline_worker.ts", import.meta.url), { type: "module", name: "outline" });
      worker.onmessage = onReply;
      worker.onerror = (ev) => fallback(`worker error (${ev.message})`);
    }
    const t1 = performance.now();
    const req: OutlineRequest = { id: nextId++, scene: scene as unknown as SceneIn };
    worker.postMessage(req);
    stats.postMs = performance.now() - t1;
    stats.posts++;
    sentAt = performance.now();
    inFlight = true;
  };

  const frame = (): void => {
    if (off) return;
    const r = ctx.scene.renderer;
    if (!r || !ctx.scene.ps) return;
    try {
      if (r !== lastR) {
        lastR = r;
        seenCount = -1;
        rvSeen = -1;
        drawn = [];
        attach();
      }
      if (!inFlight && (r.updateCount !== seenCount || drawn.length === 0)) {
        seenCount = r.updateCount;
        // Before the renderer's first update there are no samples yet:
        // wait for them (the export throws on a chain without any).
        if (r.chainSamples.length < ctx.scene.ps.chains.length || r.chainSamples.some((s) => !s)) seenCount = -1;
        else if (drawn.length === 0 || moved()) send();
      }
      if (!pass) return;
      // K1291 s2: the reveal's width masks as the ribbon computed them this
      // update (reveal_fx.ts widthMulFor), on the GPU the same frame.
      if (r.updateCount !== rvSeen) {
        rvSeen = r.updateCount;
        const M = r.revealFx.revealMask;
        if (pass.rvOn || M.some((m) => !!m)) {
          const ss = r.chainSamples;
          pass.uploadReveal(
            revealMaskTex(ss.map((s, c) => (s && M[c] ? { mask: M[c], count: s.count, total: s.totalLength, closed: s.closed } : null)))
          );
          dirty = true;
        }
        // K1291 s3: the rainbow's swell behind its front (revealWidth: the
        // ribbon's width multipliers while any passes 1).
        const SW = r.revealFx.revealWidth;
        if (pass.swOn || SW.some((m) => !!m)) {
          const ss = r.chainSamples;
          const swT = revealMaskTex(ss.map((s, c) => (s && SW[c] ? { mask: SW[c], count: s.count, total: s.totalLength, closed: s.closed } : null)));
          const B = pass.bandParams();
          pass.uploadSwell(swT, swT.on && pass.zTab ? swellStrip(swT, pass.zTab, sentMaps, B.h, B.W, B.zt) : null);
          dirty = true;
        }
      }
      const cam = camera();
      const knot = knotUniformValues() as unknown as Record<string, Float32Array>;
      if (knotChanged(knot)) dirty = true;
      if (dirty || cam.key !== camKey) {
        const t0 = performance.now();
        // The app's paint textures as pixi holds them (getGlSource creates
        // and uploads one the base layer has not drawn yet).
        const wr = ctx.app.renderer as unknown as WebGLRenderer;
        const tex = paintSources.map((s) => wr.texture.getGlSource(s).texture);
        const a = (cam.mat[0] * cam.w) / 2;
        pass.draw(cam.mat, cam.w, cam.h, { tex, knot, px: a > 0 ? 1 / a : 1 });
        host?.restore();
        stats.drawMs = performance.now() - t0;
      stats.drawMsLog.push(stats.drawMs);
      if (stats.drawMsLog.length > 512) stats.drawMsLog.shift();
        stats.draws++;
        dirty = false;
        camKey = cam.key;
      }
      composited = false;
    } catch (e) {
      ctx.app.renderer.resetState();
      fallback(`failed (${e instanceof Error ? e.message : String(e)})`);
    }
  };

  const after = (): void => {
    if (off || !pass || composited || (rc && !rc.visible)) return;
    // The root went through another target this render (a pluck ripple's
    // filter): composite over the canvas instead.
    try {
      const g = pass.gl;
      g.bindFramebuffer(g.FRAMEBUFFER, null);
      g.viewport(0, 0, pass.w, pass.h);
      g.disable(g.SCISSOR_TEST);
      g.disable(g.STENCIL_TEST);
      pass.composite();
      stats.compositesAfter++;
    } catch (e) {
      fallback(`composite failed (${e instanceof Error ? e.message : String(e)})`);
    } finally {
      ctx.app.renderer.resetState();
    }
  };

  const dispose = (): void => {
    for (const s of paintSources) s.off("update", onPaint);
    release();
    off = true;
    const G = globalThis as unknown as Record<string, unknown>;
    if (G.__knotOutline === api) delete G.__knotOutline;
  };

  // Probe access: the stats, a forced resend, and whether the last build
  // is the threads' current pose (nothing in flight, nothing moved since).
  const api = {
    stats,
    get settled(): boolean {
      return !inFlight && !dirty && drawn.length > 0 && !moved();
    },
    resend(): void {
      drawn = [];
      seenCount = -1;
      requestFrame();
    },
    /** K1291 probes: show today's base and fillet layers in place of the
     *  outline (false) or the outline again (true), on the same page and
     *  state: a same-state A/B without a reload; null hides both (the
     *  threads' mask against what is left). */
    show(on: boolean | null): void {
      for (const c of hidden) c.visible = on === false;
      if (rc) rc.visible = on === true;
      dirty = true;
      requestFrame();
    },
    /** K1291 s3 probes: force the fill/band pair (true = without the reveal
     *  code, false = with it, null = by the frame); drewLite = the last
     *  draw's (1 = without). */
    setLite(v: boolean | null): void {
      if (pass) pass.lite = v;
      dirty = true;
      requestFrame();
    },
    get drewLite(): number {
      return pass ? pass.drewLite : -1;
    },
    /** K1247 s24 probes (ob=1): re-run the last band placement on the next n draws, with no reply and no
     *  upload, so stats.bandTfGpuMs reads the pass alone. */
    replace(n: number): void {
      if (pass) pass.bpRep = n;
      dirty = true;
      requestFrame();
    },
  };
  (globalThis as unknown as Record<string, unknown>).__knotOutline = api;

  return { frame, after, dispose };
}
