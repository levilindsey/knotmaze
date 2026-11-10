// THE SDF PASS (K8 G3-2 step 2; docs/design/K8_G3-2.md, design
// G3G4_sdf_geometry.md 3.2/3.3): ThreadPass drawing every thread as
// per-segment quads over the G3 SAMP centreline. The vertex stage
// fetches the segment's four samples and radii from the G3 tables and
// emits the segment's quad; the fragment stage takes the signed distance
// to the own/-1/+1 cones (sdCone), covers analytically (aaCov), then
// runs the strip fragment's paint orchestration (FX, gameplay paint,
// telegraph, fray, the thread look) with the side measured from the
// cone's lateral distance and the casings from gapKeepAt over the
// segment's RANGES windows. Chosen at construction by rp=sdf; the
// strip stays the default (G3-3 flips it after Levi's phone check).
//
// K832: the pass binds the scene's gap-slot table through fabric_sdf's
// gapSource (bindGap's binding list), so the casings actually cut; the
// across coordinate reads the winning cone, so cone joints no longer
// crease the border into per-segment sawteeth; and the border look
// cuts cone material inside a fused junction's fan reach, handing the
// outline to the fan's rim exactly as the strip does.
//
// K8 (sdf cost, docs/design/K8_sdf_cost.md): the vertex stage emits the
// bisector trapezoid the fragment's ownership keeps (the box only at
// folds, sharp joints and zero-length segments), not a capsule box.
//
// Deviations from the design, recorded in the K8_G3-2 brief: no fold pinch
// or joint-cluster discard (G4); the paint varyings ride the strip's
// wrap pairs from the segment ends, so paint reads the owning
// segment's ends exactly as the design's caller contract requires.

import { GlProgram, Mesh, MeshGeometry, Shader, Texture, UniformGroup } from "pixi.js";
import type { SplineSamples } from "../../geometry/spline_generator";
import { FABRIC_GLSL, G3_CHAIN_GLSL, JUNCTION_CUT_GLSL, SDF_CONE_GLSL, SDF_TEX_GLSL, fabricUniforms, gapSource, sampSource } from "../fabric_sdf";
import { withExploreSdf } from "../explore_glsl";
import { GAP_FRAG_LIB, defaultGapTexture } from "../gap_mask";
import { addFloatAttribute } from "../junction_field";
import {
  KNOT_UNIFORMS_GLSL,
  PAINT_CONST_GLSL,
  PAINT_DATA_GLSL,
  PAINT_FRAG_DECL,
  PAINT_FRAG_LIB,
  PAINT_FX_GLSL,
  PAINT_GATE_THREAD_GLSL,
  PAINT_PAINT_RIBBON_GLSL,
  PAINT_SECTION_GLSL,
  PAINT_VERT_DECL,
  PAINT_VERT_MAIN,
  ROOT_FRAG_GLSL,
  withRoot,
} from "../paint_glsl";
import { kGeom, kPaint, kReveal, kStatic, knotUniforms } from "../paint_model";
import type { RibbonRenderer } from "../ribbon_renderer";
import type { RibbonMesh } from "../ribbon_mesh";
import type { ThreadPass } from "./thread_pass";
import { StripPass } from "./strip_pass";

// K8: the unit normal of the joint at b between the legs a->b and b->c (the
// bisector of the two leg directions); a hairpin takes the outgoing leg's,
// and a zero-length leg borrows the other leg's direction. Shared by the
// vertex (the trapezoid's ends) and the fragment (ownership), so both read
// the same line from the same three samples.
const SDF_JOINT_GLSL = /* glsl */ `// K8: the unit normal of the joint at b between the legs a->b and b->c (the
// bisector of the two leg directions); a hairpin takes the outgoing leg's,
// and a zero-length leg borrows the other leg's direction.
vec2 sdfJointT(vec2 a, vec2 b, vec2 c) {
  vec2 d0 = b - a;
  vec2 d1 = c - b;
  float q0 = dot(d0, d0);
  float q1 = dot(d1, d1);
  d0 = q0 > 1e-14 ? d0 * inversesqrt(q0) : vec2(0.0);
  d1 = q1 > 1e-14 ? d1 * inversesqrt(q1) : d0;
  if (q0 <= 1e-14) d0 = d1;
  vec2 n = d0 + d1;
  float qn = dot(n, n);
  return qn > 1e-8 ? n * inversesqrt(qn) : d1;
}`;

/** K8 (sdf cost): a quad with a joint whose bisector meets the segment at
 *  a cosine below this keeps the whole box (tan(theta/2) <= 0.75 keeps the
 *  trapezoid inside the box). Mirrored by test/render/sdf_gap_bind.test.ts. */
export const SDF_TRAP_COS = 0.8;

export const SDF_VERT = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

in vec2 aPosition;
in vec4 aSeg;
${PAINT_VERT_DECL}
out vec2 vPos;
out vec4 vColor;
flat out vec4 vSegInfo;
flat out vec4 vRadii;
flat out vec4 vP01;
flat out vec4 vP23;
flat out vec2 vDir;
flat out vec4 vIds;
out vec3 vSection;
out vec2 vUV;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform mat3 uTransformMatrix;
uniform vec4 uColor;
uniform float uSdfPad;
${KNOT_UNIFORMS_GLSL}
${PAINT_CONST_GLSL}
${PAINT_DATA_GLSL}
${PAINT_SECTION_GLSL}
${FABRIC_GLSL}
${SDF_TEX_GLSL}
${SDF_JOINT_GLSL}

int idxOf(KChain kc, int j) {
  if (kc.closed) {
    int n = kc.count;
    int m = j % n;
    return m < 0 ? m + n : m;
  }
  return clamp(j, 0, kc.count - 1);
}

void main(void) {
  int chain = int(aKey.x + 0.5);
  int segK = int(aSeg.x + 0.5);
  vec4 kc0 = kS(2 * chain);
  vec4 kc1 = kS(2 * chain + 1);
  vec4 kg0 = kG(int(kc1.x + 0.5));
  KChain kc = kChainOf(chain, kc0, kc1, kg0);
  vec4 ch0 = g3ChainAt(chain, 0);
  vec4 ch1 = g3ChainAt(chain, 1);
  int sampBase = int(ch0.x + 0.5);
  int radBase = int(ch0.y + 0.5);
  int k0 = idxOf(kc, segK - 1);
  int k1 = idxOf(kc, segK);
  int k2 = idxOf(kc, segK + 1);
  int k3 = idxOf(kc, segK + 2);
  vec2 P0 = sampAt(sampBase + k0);
  vec2 P1 = sampAt(sampBase + k1);
  vec2 P2 = sampAt(sampBase + k2);
  vec2 P3 = sampAt(sampBase + k3);
  // A missing neighbour on an open chain reads radius -1 (the fragment
  // then skips that cone): never a last-to-first chord.
  float r0 = kc.closed || segK > 0 ? radAt(radBase, k0) : -1.0;
  float r1 = radAt(radBase, k1);
  float r2 = radAt(radBase, k2);
  float r3 = kc.closed || segK + 2 < kc.count ? radAt(radBase, k3) : -1.0;
  vec2 dir = P2 - P1;
  float dl = length(dir);
  dir = dl > 1e-9 ? dir / dl : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float R = max(max(r0, r1), max(r2, r3)) + uSdfPad;
  float end = aSeg.y;
  float side = aSeg.z;
  // K8 (sdf cost): a TRAPEZOID, not the capsule box. The fragment keeps
  // only the slab between the two joints' bisector lines (ownership), but
  // the box ran R past both ends: at SAMP spacing (0.09 against R 0.33)
  // about eight boxes covered each pixel, and every one ran the gap search
  // before the ownership discard could drop it (the SIMD group runs the
  // union). The lateral sides stay at +-R; each end follows its bisector
  // line (along offset s R tan(theta/2) at side s), pushed out by a margin
  // past a pixel's half-diagonal (MSAA writes only the samples inside the
  // triangle, and ownership is per pixel centre). An end with no neighbour
  // keeps the box end. A joint sharper than SDF_TRAP_COS (where its line
  // would leave the box), a zero-length segment or a fold (the two lines
  // cross within +-R: the fragment's nearest-cone fallback) keeps the
  // whole box. The trapezoid lies inside the box and holds every pixel
  // of it this quad owns, so the drawn pixels are the box's.
  // K8 (phone): the margin is ONE CSS pixel along dir, no more. It sits
  // trapPad * cos >= 0.8 px off the bisector line (cos >= SDF_TRAP_COS),
  // past any MSAA sample of an owned pixel (half-diagonal 0.71 px), and a
  // CSS pixel is at least a device pixel. The old max(uSdfPad, 2 px) ran
  // each end 2 px past a segment of SAMP spacing (0.09 world, a pixel or
  // two at the links' fit): most of every quad was its neighbours'
  // pixels, rasterized here only to be discarded.
  // (uSdfPad still pads the sides, through R.)
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  mat3 wts = uWorldTransformMatrix * uTransformMatrix;
  float pxWorld = 1.0 / max(length(wts[0].xy), 1e-6);
  float trapPad = pxWorld;
  bool hasA = r0 > -0.5;
  bool hasB = r3 > -0.5;
  vec2 jA = sdfJointT(P0, P1, P2);
  vec2 jB = sdfJointT(P1, P2, P3);
  float cA = dot(dir, jA);
  float cB = dot(dir, jB);
  float tA = hasA ? -dot(nrm, jA) / max(cA, 1e-3) : 0.0;
  float tB = hasB ? -dot(nrm, jB) / max(cB, 1e-3) : 0.0;
  bool whole = dl < 1e-6 || (hasA && cA < ${SDF_TRAP_COS.toFixed(2)}) || (hasB && cB < ${SDF_TRAP_COS.toFixed(2)})
    || (hasA && hasB && dl <= R * abs(tB - tA));
  float uA = whole || !hasA ? -R : max(side * R * tA - trapPad, -R);
  float uB = whole || !hasB ? dl + R : min(dl + side * R * tB + trapPad, dl + R);
  vec2 corner = P1 + dir * (end < 0.5 ? uA : uB) + nrm * side * R;
  gl_Position = vec4((mvp * vec3(corner, 1.0)).xy, 0.0, 1.0);
  vPos = corner;
  vColor = uColor * uWorldColorAlpha;
  vSegInfo = vec4(float(chain), float(segK), 0.0, 0.0);
  // Flat caps only at an open chain's own ends (CHAIN caps 2 = flat).
  // K832: the caps carry +4 at a FUSED end (samp_table capWithFused);
  // vSegInfo.z/w pack the flat flag (bit 0) with the fused flag (bit 1)
  // for the fragment's junction cut.
  float capS = ch0.z >= 4.0 ? ch0.z - 4.0 : ch0.z;
  float capE = ch0.w >= 4.0 ? ch0.w - 4.0 : ch0.w;
  if (ch0.z >= 4.0) vSegInfo.z = 2.0;
  if (ch0.w >= 4.0) vSegInfo.w = 2.0;
  if (!kc.closed && segK == 0 && capS > 1.5) vSegInfo.z += 1.0;
  if (!kc.closed && segK == kc.count - 2 && capE > 1.5) vSegInfo.w += 1.0;
  vRadii = vec4(r0, r1, r2, r3);
  vP01 = vec4(P0, P1);
  vP23 = vec4(P2, P3);
  vDir = dir;
  // The segment's gap-slot windows: every RANGES entry (slot, kLo, kHi,
  // flags) whose samples cover segK. K8: the entries sort by kLo and carry
  // their reach (samp_table RANGE_REACH), so a binary search finds the
  // last kLo <= segK and the walk back stops at the first entry whose
  // reach falls short. A scan of a chain's first 16 entries left most of
  // a long strand with no ids (and so no crossing gaps). At most 4 windows
  // cover a sample, one per lane.
  vec4 ids = vec4(-1.0);
  int winBase = int(ch1.x + 0.5);
  int nWin = int(ch1.y + 0.5);
  float fk = float(segK);
  int wLo = 0;
  int wHi = nWin;
  for (int it = 0; it < 20; it++) {
    if (wLo >= wHi) break;
    int mid = (wLo + wHi) >> 1;
    if (rangeAt(winBase + mid).y <= fk + 0.5) wLo = mid + 1;
    else wHi = mid;
  }
  int slot = 0;
  for (int w = 0; w < 64; w++) {
    int wi = wLo - 1 - w;
    if (wi < 0 || slot > 3) break;
    vec4 e = rangeAt(winBase + wi);
    if (floor(e.w / 64.0) - 1.0 < fk - 0.5) break;
    if (e.z >= fk - 0.5) {
      ids[slot] = e.x;
      slot++;
    }
  }
  vIds = ids;
${PAINT_VERT_MAIN}
  vSection = kVertSection;
  vUV = vec2(aKey.y / max(float(kc.count), 1.0), aSeg.z * 0.5 + 0.5);
}
`;

export const SDF_FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

in vec2 vPos;
in vec4 vColor;
in vec3 vSection;
in vec2 vUV;
${PAINT_FRAG_DECL}
flat in vec4 vSegInfo;
flat in vec4 vRadii;
flat in vec4 vP01;
flat in vec4 vP23;
flat in vec2 vDir;
flat in vec4 vIds;

out vec4 finalColor;

${KNOT_UNIFORMS_GLSL}
${PAINT_CONST_GLSL}
${PAINT_DATA_GLSL}
${PAINT_GATE_THREAD_GLSL}
${PAINT_FX_GLSL}
${PAINT_PAINT_RIBBON_GLSL}
${PAINT_FRAG_LIB}
${ROOT_FRAG_GLSL}
${GAP_FRAG_LIB}
${SDF_CONE_GLSL}
${G3_CHAIN_GLSL}
${JUNCTION_CUT_GLSL}
${SDF_JOINT_GLSL}
void main(void) {
  vec2 gfw = fwidth(vPos);
  float pxW = max(max(gfw.x, gfw.y), 1e-5);
  KChain kc = kFragChain();
  int segK = int(vSegInfo.y + 0.5);
  float t1, l1, t0, l0, t2, l2;
  float a1 = sdCone(vPos, vP01.zw, vP23.xy, vRadii.y, vRadii.z, t1, l1);
  float a0 = vRadii.x < -0.5 ? 1e9 : sdCone(vPos, vP01.xy, vP01.zw, vRadii.x, vRadii.y, t0, l0);
  float a2 = vRadii.w < -0.5 ? 1e9 : sdCone(vPos, vP23.xy, vP23.zw, vRadii.z, vRadii.w, t2, l2);
  // K8: the across derivative, taken here in uniform control flow (before
  // any discard) from the own cone, which is the winning one wherever this
  // quad owns the pixel (below).
  float fwS = fwidth(0.5 - 0.5 * clamp(l1 / max(mix(vRadii.y, vRadii.z, t1), 1e-6), -1.0, 1.0));
  // K8 (phone): the chain point's two fwidths here too, so no derivative
  // follows a discard. A derivative after a discard keeps the discarded
  // lanes alive as helpers (their quads must still feed it), and those
  // lanes ride through the gap search below; with none after, a
  // discarded quad can end where it discards.
  vec2 kpt = kFragPoint(kc);
  // K8: ONE QUAD PER PIXEL. Neighbouring segment boxes overlap by R, so a
  // pixel was drawn by up to three quads and every partial alpha (the
  // gap's fade, the AA rim) compounded, 1 - (1 - a)^n: a narrow, hard
  // casing, and rims stepped per segment. A quad now owns the pixels
  // between its two joints' bisectors, the strip's partition. Both quads
  // that share a joint compute its bisector from the same three samples
  // with the same function, and own a hair (oe) past it, so the
  // interpolation noise in vPos never leaves a hole. Where the bisectors
  // cross inside the box (a fold tighter than the box), the nearest cone
  // of the three owns.
  vec2 jA = sdfJointT(vP01.xy, vP01.zw, vP23.xy);
  vec2 jB = sdfJointT(vP01.zw, vP23.xy, vP23.zw);
  float oe = 2e-3 * pxW + 1e-5;
  float sA = vRadii.x < -0.5 ? 1e9 : dot(vPos - vP01.zw, jA);
  float sB = vRadii.w < -0.5 ? -1e9 : dot(vPos - vP23.xy, jB);
  bool own = (sA >= -oe && sB < oe) || (sA < 0.0 && sB >= 0.0 && a1 <= a0 && a1 < a2);
  if (!own) discard;
  if (mod(vSegInfo.z, 2.0) > 0.5) a1 = max(a1, dot(vP01.zw - vPos, vDir));
  if (mod(vSegInfo.w, 2.0) > 0.5) a1 = max(a1, dot(vPos - vP23.xy, vDir));
  float a = a1;
  // K832: the across coordinate (the border stroke, the rim, the grain)
  // reads the WINNING cone's lateral, not always the own cone's: the
  // own cone's lateral creases at every joint, which drew the border
  // stroke as a dark sawtooth seam per segment (the reported SDF
  // aliasing) and doubled it where cones overlap. Paint attribution
  // (arc, the gap windows) stays with the own cone below.
  float lW = l1;
  float rW = mix(vRadii.y, vRadii.z, t1);
  if (a0 < a) { a = a0; lW = l0; rW = mix(vRadii.x, vRadii.y, t0); }
  if (a2 < a) { a = a2; lW = l2; rW = mix(vRadii.z, vRadii.w, t2); }
  // K826: the strip's mitered silhouette at the joints (coverage only;
  // paint attribution stays with the own cone's t/l above).
  a = min(a, sdMiterQuad(vPos, vP01.xy, vP01.zw, vP23.xy, vP23.zw, vRadii.y, vRadii.z));
  if (a > 0.5 * pxW) discard;
  float r = rW;
  float cov = aaCov(a, pxW) * clamp(2.0 * r / pxW, 0.0, 1.0);
  if (cov <= 0.002) discard;
  float arc = (float(segK) + t1) * kc.arcPer;
  float side01 = 0.5 - 0.5 * clamp(lW / max(r, 1e-6), -1.0, 1.0);
  float vUVx = arc * 0.02;
  float pxArc = pxW * (abs(vDir.x) + abs(vDir.y));
  if (uKBase.z > 0.5 && uKBase.z < 4.5) {
    float kv = uKBase.z < 1.5 ? kCtrlNear(kc, kpt.x, kpt.y) : kpt.x;
    finalColor = vec4(fract(kv), fract(kv * 16.0), float(kc.ch % 64) / 63.0, 1.0);
    return;
  }
  // K8: gapKeepAt reads a TURN, the strip's aArcPos encoding (i / count
  // on rings, 0.45 i / (count - 1) on open runs; the slot's arcScale
  // turns it back into arc). Passing the arc itself put every fragment
  // outside every window: rp=sdf drew no crossing gaps from K832 on.
  // K8 (phone): the search runs BEFORE the paint, while little else is
  // live, and a fragment it hides whole ends here: lookA and frayA are at
  // most 1, so the final test below would drop it anyway (the probe tint
  // keeps it, as there).
  float gTurn = (float(segK) + t1) * (kc.closed ? 1.0 / float(kc.count) : 0.45 / float(max(kc.count - 1, 1)));
  float gk = gapKeepAt(pxW, vPos, gTurn, vDir, vIds);
  if (gk <= 0.002 && !gapProbe()) discard;
  vec3 base = vSection;
#ifdef K_ROOT
  if (vKR0.x > 0.5 && kpt.x < vKR0.z) base = kRootSection(kpt.x, pxW);
#endif
  float pRain = 0.0;
  float aM = 1.0;
  bool fxHere = uKFx.w > 0.5 && uKFx.x > 0.5 && uKFx.z < kc.fxDone;
  bool paintHere = (uKPaint.x > 0.5 && kc.paintOn) || uKFx2.z > 0.5;
  float kctrl = fxHere || paintHere ? kCtrlNear(kc, kpt.x, kpt.y) : 0.0;
  if (fxHere) base = kFxColor(kc, kctrl, kpt.x / kc.arcPer, base, pRain, aM);
  if (pRain > 0.0) base = kRainbowBlend(base, pRain, side01);
  vec4 kst = paintHere ? kPaintAt(kc, kctrl, kpt.x, pxArc, false) : vec4(0.0);
  float kgl = paintHere ? kGlow(kc, kctrl) : 0.0;
  if (paintHere && kst.x > 0.0 && (uKPath.x < 1.0 || uKPath.y > 0.5)) {
    float ge = abs(2.0 * side01 - 1.0);
    // K835: fill wobble (uKPathB.x) + smooth excursion swell (uKPathB.y).
    if (uKPath.y > 0.5 && (uKPathB.x > 0.0 || uKPathB.y > 0.0)) ge += sin(vUVx * 43.0 + sin(vUVx * 17.0) * 1.7) * 0.22 * uKPathB.x + sin(vUVx * 9.0 + sin(vUVx * 23.0) * 0.7) * 0.45 * uKPathB.y;
    float fwG = max(fwS * 3.0, 0.02);
    float gw2 = uKPath.y > 2.5 ? min(uKPath.x * 1.15, 1.0) : uKPath.x;
    float gm = clamp((gw2 - ge) / fwG + 0.5, 0.0, 1.0)
      * step(0.001, uKPath.x);
    if (uKPath.y > 0.5 && uKPath.y < 1.5) {
      gm *= mix(1.0, 0.7 + 0.3 * fract(sin(dot(
        floor(vec2(vUVx * 260.0, ge * 7.0)),
        vec2(12.9898, 78.233))) * 43758.5453), uKHlPulse.w);
    } else if (uKPath.y > 1.5 && uKPath.y < 2.5) {
      gm *= mix(1.0, 0.45 + 0.55 * fract(sin(dot(
        floor(vec2(vUVx * 90.0, ge * 4.0)),
        vec2(26.651, 41.313))) * 28001.8384), uKHlPulse.w);
    } else if (uKPath.y > 2.5) {
      gm *= mix(1.0, 0.55, uKHlPulse.w);
    }
    kst.x *= gm;
  }
  if (paintHere && kst.y > 0.5 && uKPath.z < 1.0) {
    float pe = abs(2.0 * side01 - 1.0);
    float pfw = max(fwS * 3.0, 0.02);
    kst.z *= clamp((uKPath.z - pe) / pfw + 0.5, 0.0, 1.0);
  }
  float krim = kst.w > 0.0 ? kst.w * kRimAcross(side01) : 0.0;
  vec3 rgb = paintHere ? kComposePaintAcross(base, kst, kgl, side01) : base;
  if (kTele > 0.0) rgb = kTeleOver(rgb, kTele * kTeleAcross(side01) * uKTele.w);
  if (krim > 0.0) rgb = kRimOver(rgb, krim);
  float frayA = 1.0;
  vec3 frayTint = vec3(0.0);
  if (paintHere && kFrayHere > 0.0) {
    float lumF = dot(rgb, vec3(0.299, 0.587, 0.114));
    frayTint = mix(vec3(lumF) * 0.85, uKHlFray.rgb, uKHlFray.w);
    rgb = mix(rgb, frayTint, 0.75 * kFrayHere);
    float eF = abs(2.0 * side01 - 1.0);
    float fwF = max(fwS * 3.0, 0.02);
    frayA = mix(1.0, clamp((uKPath.w - eF) / fwF + 0.5, 0.0, 1.0), kFrayHere);
  }
  float hiA = 0.0;
  vec3 hiRgb = vec3(0.0);
  if (uKLook.x > 0.5 && uKLook.x < 1.5) {
    if (paintHere) {
      hiRgb = kComposePaintAcross(vec3(0.0), kst, kgl, side01);
      if (kTele > 0.0) hiRgb = kTeleOver(hiRgb, kTele * uKTele.w);
    }
    if (krim > 0.0) hiRgb = kRimOver(hiRgb, krim);
    if (kFrayHere > 0.0) hiRgb = mix(hiRgb, frayTint, 0.75 * kFrayHere);
    hiA = clamp(
      max(max(kst.x, kst.y > 0.5 ? kst.z : 0.0), max(krim, max(kgl, kTele * uKTele.w))),
      0.0, 1.0);
    if (kFrayHere > 0.0) hiA = max(hiA, kFrayHere);
    if (fxHere) {
      hiRgb = rgb;
      hiA = max(hiA, aM);
    }
  }
  float lookA = 1.0;
  bool edgesIntro = uKLook.y > 0.5 && uKLook.z > 0.5;
  if (uKLook.x > 0.5 || edgesIntro) {
    float eAcross = abs(2.0 * side01 - 1.0);
    float fwA = max(fwS * 3.0, 0.02);
    float edge = smoothstep(1.0 - uKLook.w, 1.0 - uKLook.w + fwA, eAcross);
    vec3 stroke = mix(mix(rgb * 0.30, vec3(0.09, 0.085, 0.08), 0.5), uKBorder.rgb, uKBorder.w);
    if (uKLook.x > 0.5 && uKLook.x < 1.5) {
      rgb = mix(hiRgb, stroke, edge);
      lookA = max(edge, hiA * (1.0 - edge));
    }
    else {
      rgb = mix(rgb, stroke, edge * 0.9);
      if (edgesIntro) {
        float fillOn = uKLook.y < 1.5
          ? (uKFx.z >= kc.fxDone ? 1.0 : 0.0)
          : 0.0;
        lookA = mix(fillOn, 1.0, edge);
      }
    }
  }
  // K832: the junction cut, as the strip's (fabric_sdf kJunctionCut);
  // the caps' fused bits ride vSegInfo.z/w (bit 1, from the vertex).
  if (uKLook.x > 0.5 && uKLook.x < 1.5) {
    vec4 jcaps = vec4(0.0, 0.0, vSegInfo.z >= 1.5 ? 4.0 : 0.0, vSegInfo.w >= 1.5 ? 4.0 : 0.0);
    lookA *= 1.0 - kJunctionCut(kc.closed, kc.total, arc, jcaps, pxW);
    // K846: and at every junction arm, on the sides a wedge faces
    // (lW > 0 is the chain's left, as the strip's aUV.y = 0 side).
    lookA *= 1.0 - kJunctionSideCut(kc.ch, arc, kc.total, kc.closed, lW > 0.0 ? -1.0 : 1.0, pxW);
  }
  if (uKBase.z > 4.5) {
    if (gk <= 0.002) discard;
    finalColor = vec4(clamp(kst.x, 0.0, 1.0), kst.y > 0.5 ? kst.z : 0.0, max(kgl, krim), 1.0);
    return;
  }
  if (gk < 1.0 && gapProbe()) {
    rgb = mix(rgb, vec3(1.0, 0.0, 0.85), (1.0 - gk) * 0.75);
    gk = 1.0;
  }
  if (gk * lookA * frayA <= 0.002) discard;
  finalColor = vec4(rgb, 1.0) * vColor * (aM * gk * lookA * frayA * cov);
}
`;

// K8 (phone): the explore variant keeps the gap search where it was, after
// the paint. withExploreSdf (explore_glsl.ts) inserts the reveal's main
// before the gk line, and that block reads rgb, aM and kctrl, which the
// early search runs ahead of; its gapKeepAt reads the reveal's state too.
// So the explore text is SDF_FRAG with the early block moved back, the
// pre-move text byte for byte.
const SDF_GAP_EARLY =
  "  // K8: gapKeepAt reads a TURN, the strip's aArcPos encoding (i / count\n" +
  "  // on rings, 0.45 i / (count - 1) on open runs; the slot's arcScale\n" +
  "  // turns it back into arc). Passing the arc itself put every fragment\n" +
  "  // outside every window: rp=sdf drew no crossing gaps from K832 on.\n";
const SDF_GAP_EARLY_TAIL =
  "  // K8 (phone): the search runs BEFORE the paint, while little else is\n" +
  "  // live, and a fragment it hides whole ends here: lookA and frayA are at\n" +
  "  // most 1, so the final test below would drop it anyway (the probe tint\n" +
  "  // keeps it, as there).\n";
const SDF_GAP_CALL =
  "  float gTurn = (float(segK) + t1) * (kc.closed ? 1.0 / float(kc.count) : 0.45 / float(max(kc.count - 1, 1)));\n" +
  "  float gk = gapKeepAt(pxW, vPos, gTurn, vDir, vIds);\n";
const SDF_GAP_DISCARD = "  if (gk <= 0.002 && !gapProbe()) discard;\n";
const SDF_GAP_LATE_AT = "  if (uKBase.z > 4.5) {\n    if (gk <= 0.002) discard;";
function onceAt(s: string, a: string): number {
  const i = s.indexOf(a);
  if (i < 0 || s.indexOf(a, i + 1) >= 0) throw new Error("ribbon_sdf: anchor not found once: " + a.slice(0, 40));
  return i;
}
export function sdfGapLate(frag: string): string {
  const early = SDF_GAP_EARLY + SDF_GAP_EARLY_TAIL + SDF_GAP_CALL + SDF_GAP_DISCARD;
  const i = onceAt(frag, early);
  let s = frag.slice(0, i) + frag.slice(i + early.length);
  const j = onceAt(s, SDF_GAP_LATE_AT);
  s = s.slice(0, j) + SDF_GAP_EARLY + SDF_GAP_CALL + s.slice(j);
  return s;
}

// K905: `root` adds K_ROOT to both texts (the -root programs, master's
// K620 code); without it the root code compiles out (ribbon_shader.ts).
let SDF_PROGRAM: GlProgram | null = null;
let SDF_EXPLORE_FRAG: string | null = null;
let SDF_ROOT_VERT: string | null = null;
let SDF_ROOT_FRAG: string | null = null;
let SDF_ROOT_EXPLORE_FRAG: string | null = null;
export function sdfProgram(explore = false, root = false): GlProgram {
  if (root) {
    SDF_ROOT_VERT ??= withRoot(SDF_VERT);
    if (!explore) {
      SDF_ROOT_FRAG ??= withRoot(SDF_FRAG);
      return GlProgram.from({ vertex: SDF_ROOT_VERT, fragment: SDF_ROOT_FRAG, name: "ribbon-sdf-root" });
    }
    SDF_ROOT_EXPLORE_FRAG ??= withRoot(withExploreSdf(sdfGapLate(SDF_FRAG)));
    return GlProgram.from({ vertex: SDF_ROOT_VERT, fragment: SDF_ROOT_EXPLORE_FRAG, name: "ribbon-sdf-explore-root" });
  }
  if (!explore) {
    SDF_PROGRAM ??= GlProgram.from({ vertex: SDF_VERT, fragment: SDF_FRAG, name: "ribbon-sdf" });
    return SDF_PROGRAM;
  }
  SDF_EXPLORE_FRAG ??= withExploreSdf(sdfGapLate(SDF_FRAG));
  return GlProgram.from({ vertex: SDF_VERT, fragment: SDF_EXPLORE_FRAG, name: "ribbon-sdf-explore" });
}

type SdfShader = Shader & { texture: Texture };
type G3Sources = { radii: unknown; chain: unknown; ranges: unknown };
// K905: one shared shader per root flag, [no root, root].
const SDF_SHADERS: (SdfShader | null)[] = [null, null];
// The G3 sources ride creation: a Shader's resources accessor is
// fixed at construction, so the pass's tables bind here, not after.
export function sdfShader(g3?: G3Sources, root = false): SdfShader {
  const k = root ? 1 : 0;
  let shared = SDF_SHADERS[k];
  if (!shared) {
    if (!g3) throw new Error("sdfShader: the first build needs the G3 sources");
    const sh = new Shader({
      glProgram: sdfProgram(false, root),
      resources: {
        // K832: the scene's gap-slot table (bindGap points gapSource at
        // it); the empty default only until the first scene binds.
        uGapData: gapSource() ?? defaultGapTexture().source,
        uSamp: sampSource(),
        uRadii: g3.radii as never,
        uG3Chain: g3.chain as never,
        uRanges: g3.ranges as never,
        fabricUniforms: fabricUniforms(),
        uKStatic: kStatic().source,
        uKGeom: kGeom().source,
        uKReveal: kReveal().source,
        uKPaintData: kPaint().source,
        knotUniforms: knotUniforms(),
        sdfUniforms: new UniformGroup({ uSdfPad: { value: 0.03, type: "f32" } }),
      },
    }) as SdfShader;
    sh.texture = Texture.WHITE;
    SDF_SHADERS[k] = sh;
    shared = sh;
  }
  // K832: a later scene's gap table re-points the live shader too
  // (rootMesh / setExplore call this per scene, after bindGap).
  const gs = gapSource();
  if (gs && shared.resources.uGapData !== gs) shared.resources.uGapData = gs;
  return shared;
}

// K825: the explore variant's shader (the same resources; built the
// first time the thread reveal turns on under rp=sdf, so a master page
// never pays for it). K905: per root flag.
const SDF_EXPLORE_SHADERS: (SdfShader | null)[] = [null, null];
export function sdfShaderExplore(g3?: G3Sources, root = false): SdfShader {
  const k = root ? 1 : 0;
  let shared = SDF_EXPLORE_SHADERS[k];
  if (!shared) {
    const master = sdfShader(g3, root);
    const sh = new Shader({
      glProgram: sdfProgram(true, root),
      resources: {
        uGapData: master.resources.uGapData,
        uSamp: sampSource(),
        uRadii: master.resources.uRadii,
        uG3Chain: master.resources.uG3Chain,
        uRanges: master.resources.uRanges,
        fabricUniforms: fabricUniforms(),
        uKStatic: kStatic().source,
        uKGeom: kGeom().source,
        uKReveal: kReveal().source,
        uKPaintData: kPaint().source,
        knotUniforms: knotUniforms(),
        sdfUniforms: new UniformGroup({ uSdfPad: { value: 0.03, type: "f32" } }),
      },
    }) as SdfShader;
    sh.texture = Texture.WHITE;
    SDF_EXPLORE_SHADERS[k] = sh;
    shared = sh;
  }
  // K832: as sdfShader - follow the scene's gap table.
  const gs = gapSource();
  if (gs && shared.resources.uGapData !== gs) shared.resources.uGapData = gs;
  return shared;
}

// The pass itself: no per-chain meshes. build() only records the
// chain's shape; rootMesh() (the façade calls it once the G3 layout
// exists) builds one instanced-by-attribute quad per segment.
export class SdfPass implements ThreadPass {
  readonly r: RibbonRenderer;
  private readonly strip: StripPass;
  private counts: number[] = [];
  private closedArr: boolean[] = [];
  private meshBuilt: Mesh | null = null;
  private g3src: { radii: unknown; chain: unknown; ranges: unknown } | null = null;
  private exploreOn = false;
  readonly fills: readonly RibbonMesh[] = [];

  constructor(r: RibbonRenderer) {
    this.r = r;
    this.strip = new StripPass(r);
  }

  build(chain: number, count: number, closed: boolean): null {
    this.counts[chain] = count;
    this.closedArr[chain] = closed;
    return null;
  }

  rootMesh(): Mesh | null {
    if (this.meshBuilt) return this.meshBuilt;
    let total = 0;
    for (let c = 0; c < this.counts.length; c++) {
      total += this.closedArr[c] ? this.counts[c] : this.counts[c] - 1;
    }
    if (total <= 0) return null;
    const verts = total * 4;
    const positions = new Float32Array(verts * 2);
    const keys = new Float32Array(verts * 2);
    const segs = new Float32Array(verts * 4);
    const indices = new Uint32Array(total * 6);
    let v = 0;
    let ix = 0;
    for (let c = 0; c < this.counts.length; c++) {
      const count = this.counts[c];
      const n = this.closedArr[c] ? count : count - 1;
      for (let k = 0; k < n; k++) {
        const corners: ReadonlyArray<readonly [number, number, number]> = [
          [k, 0, -1],
          [k, 0, 1],
          [k + 1, 1, -1],
          [k + 1, 1, 1],
        ];
        for (const [sample, end, side] of corners) {
          keys[v * 2] = c;
          keys[v * 2 + 1] = sample;
          segs[v * 4] = k;
          segs[v * 4 + 1] = end;
          segs[v * 4 + 2] = side;
          v++;
        }
        const b = v - 4;
        indices[ix++] = b;
        indices[ix++] = b + 1;
        indices[ix++] = b + 2;
        indices[ix++] = b + 1;
        indices[ix++] = b + 3;
        indices[ix++] = b + 2;
      }
    }
    const geometry = new MeshGeometry({ positions, indices });
    const uvBuffer = geometry.attributes.aUV.buffer;
    delete geometry.attributes.aUV;
    geometry.buffers.splice(geometry.buffers.indexOf(uvBuffer), 1);
    addFloatAttribute(geometry, "aKey", keys, 2);
    addFloatAttribute(geometry, "aSeg", segs, 4);
    const mesh = new Mesh({ geometry, texture: Texture.WHITE });
    this.g3src = this.r.g3SdfSources();
    const root = this.r.rootPaint;
    mesh.shader = this.exploreOn ? sdfShaderExplore(this.g3src, root) : sdfShader(this.g3src, root);
    this.meshBuilt = mesh;
    return mesh;
  }

  // K825: the thread reveal swaps the one mesh onto the explore
  // program (explore_gaps.setExplore calls this through ThreadPass).
  setExplore(on: boolean): void {
    this.exploreOn = on;
    if (this.meshBuilt && this.g3src) {
      const root = this.r.rootPaint;
      const sh = on ? sdfShaderExplore(this.g3src, root) : sdfShader(this.g3src, root);
      if (this.meshBuilt.shader !== sh) this.meshBuilt.shader = sh;
    }
  }

  private unitMul: Float32Array[] = [];

  extrude(chain: number, samples: SplineSamples, width: Float32Array | null): Float32Array | null {
    // No mesh to extrude: SAMP (written by the façade's G3 write from
    // the returned multiplier) is the geometry. The collapse still
    // composes here, as the strip's does. Never null: a null return
    // tells the G3 write the chain has no radii (the strip's extrude
    // likewise always hands one back).
    const mul = this.r.pluckHost.withPluckCollapse(chain, samples.count, width);
    if (mul) return mul;
    let unit = this.unitMul[chain];
    if (!unit || unit.length !== samples.count) {
      unit = new Float32Array(samples.count).fill(1);
      this.unitMul[chain] = unit;
    }
    return unit;
  }

  collapse(chain: number): void {
    const samples = this.r.chainSamples[chain];
    if (!samples) return;
    const mul = this.extrude(chain, samples, this.r.widthLast[chain] ?? null);
    if (this.r.g3Data && this.r.g3Active()) {
      this.r.g3WriteRadii(chain, mul);
      this.r.g3WriteChainRecords();
      this.r.g3FlushNow();
    }
  }

  tuck(samples: SplineSamples, atStart: boolean, atEnd: boolean, chain: number): void {
    // Sample clamping is mesh-independent: the strip's, verbatim.
    this.strip.tuck(samples, atStart, atEnd, chain);
  }
}
