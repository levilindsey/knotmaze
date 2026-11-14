// K1362 s2: the per-pixel junction look as a fragment shader, a line-for-line
// port of eval.ts's GfEval (the CPU mirror; keep the two in step). The
// tables come from one RGBA32F texture (gf_pack.ts's layout).
//
// Two variants: the app's (PROBE off) writes (ink, coverage, 0, 1) into an
// RGBA8 target the app composites; the probe's writes three RGBA32F targets:
// (ink, coverage, label chain, label s), (winKind, winA, winB, nSeg),
// (nK, pieces, surfaces, 0), read back against GfEval. The winning term per
// pixel (side, arc, cap, tangent point, K1049 arc, and which piece / corner)
// is computed in both, never blended.
//
// World position: x = uMap.x * fragX + uMap.y, y = uMap.z * fragY + uMap.w
// (gl_FragCoord, pixel centres): the app maps device pixels through the
// camera, the probe maps its tile rows bottom-up (readPixels' row order).
import { GF_LOG } from "./gf_pack";
import { MAXP } from "./tables";
import { MAXK, MAXR } from "./eval";
import { constantLoops, GF_PACK, packArrays, scalarizeArrays } from "./gf_reg";

export const GF_VS = `#version 300 es
void main() {
  int id = gl_VertexID;
  gl_Position = vec4(id == 1 ? 3.0 : -1.0, id == 2 ? 3.0 : -1.0, 0.0, 1.0);
}`;

/**
 * K1362 s4: a TIER is the same program with smaller per-pixel arrays (p pieces, k corners), drawn first under a
 * stencil route (gf_pass.ts): a pixel that would need more than the tier holds (a (p+1)th piece, a (k+1)th corner,
 * or, without `ramps`, a ramping piece) is DISCARDED, and a later tier or the full program draws it. Where a tier
 * writes, its state is the full program's state step for step, so its output is the full program's (the mirror's).
 * `half`: the tier keeps its integer and [0, 1] per-pixel state in mediump (fp16 on mobile; ignored by desktop GPUs).
 * `reg` (K1362 s6): the tier's arrays become scalars read through selects (gf_reg.ts). `unroll` (K1362 s6): every
 * loop over the per-pixel lists gets a constant trip count (the list's capacity) and breaks at the list's end, so a
 * compiler can unroll it and index the arrays by constants. `pack` (K1362 s6): the per-piece arrays share one vec4
 * and one ivec4 array (gf_reg.ts packArrays); "f" packs only the floats, "i" only the ints.
 * `one` (K1362 s8): a pixel without ramping pieces (nr == 0) runs the configuration loop's body under a constant
 * trip count of one (a second copy of the body), the rest the loop; the same statements on the same values.
 * `bx` (K1362 s8): the burial loops stop once their face cannot beat the surface's best value (see burialExit);
 * bench only, inexact on the Pixel.
 * `fast` (K1362 s9): a pixel with at most one piece, no corner and no ramping piece (np <= 1, nk == 0, nr == 0) runs
 * layers1() for layers(): one surface of one face with no sort and no burial, the same statements on the same values;
 * composite() and the accumulation stay shared. (A written-out composite was 1 ulp off in coverage on 0.2-0.4% of
 * the canvas on D3D, probably the compiler regrouping the straight-line form; cause not isolated.)
 * `s` (K1362 s9): surface slots (MAXS) below p + k. A pixel that needs one more discards to the next program, exact by
 * overflow like the piece and corner caps (not with `reg`, whose scalarized arrays assume p + k).
 * `lab` (K1362 s9): the label's top covered surface tracked as it is found (labK, labE, labC) in place of the
 * per-surface sckey / scch / scov arrays. Exact by construction: a covered contribution replaces the running best
 * when its key is greater, or equal on a lower surface index, which is the arrays' choice (each surface's first
 * maximum, then the first covered surface with the greatest one; -BIG and NaN keys leave labC at -1 both ways). No
 * float arithmetic changes. Ignored in the probe program (it keeps scs for labS).
 * K1362 s10, the tier's per-pixel arrays (the Pixel's cost follows them). Plain form only (no split, reg or pack), and
 * ignored in the probe program. Each moves the same values through fewer slots; no float arithmetic changes:
 * grp: the ramp membership (pg, pramp) goes into psurf, written once in the keys loop: a member's group, a ramping
 * piece's -1 - j - MAXP (g + 1) until its configuration takes it, else -1 - j; rIdx and r ride the swap.
 * ks: pkey reuses ps (ps is dead once the key is taken). kq: footQ re-derives the foot from pkq (slower on the Pixel).
 * lh: plo, phi (and pkq with kq) pack into one int; a span over 255 segments, or lo below -32768, discards.
 * so (needs lab): the insertion sort moves sid and skey in place of building sord; the same comparisons in the same
 * order, so the same order, ties and NaN included. cs (needs grp): psurf rides pc's high 16 bits (a chain over
 * 65535 or a surface outside int16 discards).
 * kr: the corners keep kk and krho and rebuild the sector and ring class from them (kSK). kl: rho too (bench
 * only: the rebuilt rho rounds differently on D3D, 1-2 px).
 * K1362 s11, the layering's per-surface arrays, by lifetime (a slot a value no longer needs takes the next one):
 * vs: sv rides in sid (floatBitsToInt): a surface's id is read once, at the top of its face loop, and its v is
 * written at the bottom. ga (MAXS <= 3): composite()'s gaps are taken right after the sort (the same subtractions on
 * the same keys) into two scalars, and sa then rides in skey, which nothing reads after them. sc (MAXS <= 4, not
 * so): the sort order as 2 bits an entry in one int (the same insertion sort, the same comparisons in the same
 * order). kc: the corners keep kk and krho, a corner outside its sector as rho -1 (rho is a square root), and the
 * ring class is the scan's own two comparisons on it (kSG; kr rebuilt the sector with inSector). No float
 * arithmetic changes.
 *
 * `kz` (K1362 s12, the corner-free cells; cornerRoute below): "free" is the tier for the pixels whose cell lists
 * no corner, with the corner code compiled out; "corner" is the tier itself for the pixels whose cell lists one.
 * GfPass expands the other two: "route" draws free, then corner (skipped while no cell lists a corner), then full;
 * "frame" draws free then full while no cell lists a corner, else the plain tier then full.
 */
export type GfCornerForm = "route" | "frame" | "free" | "corner";
export interface GfTier { p: number; k: number; ramps: boolean; half?: boolean; reg?: boolean; unroll?: boolean; pack?: GfPackForm; one?: boolean; bx?: boolean; fast?: boolean; s?: number; lab?: boolean; grp?: boolean; kq?: boolean; ks?: boolean; kl?: boolean; kr?: boolean; lh?: boolean; so?: boolean; cs?: boolean; vs?: boolean; ga?: boolean; sc?: boolean; kc?: boolean; kz?: GfCornerForm }
export type GfPackForm = boolean | "f" | "i";

/** The program's source forms (gf_reg.ts); a tier's own flags set them by default. The probe keeps the plain form. */
/** oldKeys: the keys over the chain's whole pin and arm lists (before gf_keys.ts's bins; a bench's A/B). */
/**
 * split (K1362 s7, gf_split.ts): the tier in two passes. 1 = the scan, keys and corners, packed into four unsigned
 * targets (RGBA32UI x3 for the pieces, RG32UI for the corners and counts; a value that does not fit discards, so
 * the full program draws that pixel); 2 = layers() and composite() from them, rebuilding pd, pfx, pfy, the corner
 * radii and thruQ from their indices with the scan's own lines. Needs a tier (its p and k size the targets' use).
 * splitKeys: the keys move to pass 2 (SPLITK): pass 1 stores only each piece's chain and segments (8 bytes) in two
 * RGBA32UI targets (32 bytes a pixel), and pass 2 rebuilds ps with the scan's line and runs the keys' own loop.
 */
export interface GfForm { reg?: boolean; unroll?: boolean; pack?: GfPackForm; oldKeys?: boolean; split?: 1 | 2; splitSkip?: boolean; splitKeys?: boolean }

export function gfFs(probe: boolean, tangentTerms = true, tier?: GfTier, form: GfForm = { reg: tier?.reg, unroll: tier?.unroll, pack: tier?.pack }): string {
  let src = gfSrc(probe, tangentTerms, tier);
  if (tier?.one) src = oneConfig(src);
  if (tier?.bx) src = burialExit(src);
  if (form.oldKeys) src = src.replace("precision highp float;\n", "precision highp float;\n#define OLDKEYS 1\n");
  if ((tier?.grp || tier?.kq || tier?.ks || tier?.kl || tier?.kr || tier?.lh || tier?.so || tier?.cs || tier?.vs || tier?.ga || tier?.sc || tier?.kc) && !probe && (form.split || form.reg || form.pack)) throw new Error("gfFs: grp, kq, ks, kl, kr, lh, so, cs, vs, ga, sc and kc are plain-form tiers (no split, reg or pack)");
  const nS = tier ? (tier.s && tier.s < tier.p + tier.k ? tier.s : tier.p + tier.k) : MAXP + MAXK;
  if (tier?.ga && nS > 3 && !probe) throw new Error("gfFs: ga keeps two gaps, so it needs at most 3 surface slots");
  if (tier?.sc && (nS > 4 || tier.so) && !probe) throw new Error("gfFs: sc packs the order 2 bits an entry, so it needs at most 4 surface slots and not so");
  if (tier?.so && !tier.lab && !probe) throw new Error("gfFs: so sorts sid and skey in place, so it needs lab (no scov, sckey or scch to carry)");
  if (tier?.kc && (tier.kl || tier.kr) && !probe) throw new Error("gfFs: kc is its own corner form (not with kl or kr)");
  if (tier?.cs && !tier.grp && !probe) throw new Error("gfFs: cs packs the surface into pc, so it needs grp (no pg)");
  if (form.split) {
    if (probe || !tier || tier.p > 3 || tier.k > 2) throw new Error("gfFs: split needs a non-probe tier of at most p3/k2");
    // a tier without ramps discards ramping pixels after the keys: pass 2 cannot route, so its keys stay in pass 1
    if (form.splitKeys && !tier.ramps) throw new Error("gfFs: splitKeys needs a tier with ramps");
    src = src.replace("precision highp float;\n", `precision highp float;\n#define SPLIT${form.split} 1\n${form.splitSkip ? "#define SPLITSKIP 1\n" : ""}${form.splitKeys ? "#define SPLITK 1\n" : ""}`);
  }
  if (tier?.kz) {
    if (probe || form.split || form.reg || form.pack || form.unroll) throw new Error("gfFs: kz is a plain-form tier (no probe, split, reg, pack or unroll)");
    if (tier.kz !== "free" && tier.kz !== "corner") throw new Error(`gfFs: kz "${tier.kz}" is GfPass's to expand into its programs (free, corner)`);
    src = cornerRoute(src, tier.kz);
  }
  if (probe) return src;
  const mp = tier ? tier.p : MAXP;
  const mk = tier ? tier.k : MAXK;
  if (form.unroll) src = constantLoops(src, { np: mp, nk: mk, ns: mp + mk, nr: MAXR, nTj: 8 });
  if (form.pack) {
    const pick = form.pack === "f" ? "pPF" : form.pack === "i" ? "pPI" : "";
    src = packArrays(src, pick ? GF_PACK.filter((g) => g.name === pick) : GF_PACK);
  }
  if (form.reg) src = scalarizeArrays(src, { MAXP: mp, MAXK: mk, MAXS: mp + mk });
  return src;
}

/**
 * K1362 s12 `kz`: the corner-free cells. A cell whose list holds no corner (kn == 0) runs none of the scan's corner
 * loops, so every pixel in it has thruK = -1, yielded = false and nk = 0, and layers() and the composite make no
 * corner trip. "free" compiles that in: nk a constant 0, the corner scan gone, and a pixel whose cell lists a corner
 * discarded right after the cell fetch (its stencil stays 0, so the next program draws it). Every other statement is
 * the tier's, on the same values, so a pixel it draws is the tier's pixel. "corner" is the tier plus the opposite
 * guard: a middle program's stencil test runs late, so on the pixels free drew it costs a fetch and a discard; a
 * corner-free pixel free discarded (piece or surface overflow) passes on to full.
 */
const KZ_CELL = "    vec4 CE = F(uOCell + cell);\n";
const KZ_SCAN = "    // corners near p\n    int k0 = int(CE.z); int kn = int(CE.w);\n";
const KZ_SCAN_END = "#ifdef TIER\n    if (ovf) { discard; return; } // never past the arrays: D3D runs on past a discard\n#endif\n";
function cornerRoute(src: string, form: "free" | "corner"): string {
  const count = (what: string) => src.split(what).length - 1;
  const need = (what: string, n: number) => { if (count(what) !== n) throw new Error(`gfFs kz: expected ${n} of ${JSON.stringify(what.slice(0, 48))}, found ${count(what)}`); };
  need(KZ_CELL, 1);
  if (form === "corner") return src.replace(KZ_CELL, `${KZ_CELL}    if (int(CE.w) == 0) { discard; return; } // K1362 s12 kz: the corner-free program drew this pixel\n`);
  need(KZ_SCAN, 1); need(" int nk;", 2); need("np = 0; nk = 0; ns = 0;", 1);
  const i0 = src.indexOf(KZ_SCAN); const i1 = src.indexOf(KZ_SCAN_END, i0);
  if (i1 < 0) throw new Error("gfFs kz: the corner scan's end not found");
  src = src.slice(0, i0) + "    int thruK = -1; float thruQ = 0.0; bool yielded = false; // K1362 s12 kz: no corner in this cell\n" + src.slice(i1);
  src = src.replace(KZ_CELL, `${KZ_CELL}    if (int(CE.w) > 0) { discard; return; } // K1362 s12 kz: a cell with corners is the next program's\n`);
  return src.split(" int nk;").join(" const int nk = 0;").replace("np = 0; nk = 0; ns = 0;", "np = 0; ns = 0;");
}

/**
 * K1362 s8 `one`: the configuration loop as `if (nr == 0) { <body, cfg = 0..0> } else { <the loop> }`. With nr == 0
 * the loop runs once with cfg = 0, so the copy is the same statements on the same values; a constant trip count
 * lets a compiler unroll it. A single compiled configuration (inexact, timing only) was 0.3 of def's 1.05 ms on the
 * desktop, but this split measured no gain there: the loop's copy still sets the program's registers.
 */
const CFG_LOOP = "    for (int cfg = 0; cfg <= nr; cfg++) {\n";
const CFG_END = "\n    }\n    if (thruK >= 0) {";
function oneConfig(src: string): string {
  const a = src.indexOf(CFG_LOOP); const b = src.indexOf(CFG_END, a);
  if (a < 0 || b < 0 || src.indexOf(CFG_LOOP, a + 1) >= 0) throw new Error("gfFs one: the configuration loop moved");
  const body = src.slice(a + CFG_LOOP.length, b);
  const one = `    if (nr == 0) {\n    for (int cfg = 0; cfg <= 0; cfg++) {\n${body}\n    }\n    } else {\n${CFG_LOOP}${body}\n    }\n    }`;
  return src.slice(0, a) + one + src.slice(b + "\n    }".length);
}

/**
 * K1362 s8 `bx`: layers() keeps, per surface, the best face value v (replaced only by a larger one), and a face's
 * value is (1 - bur) * band2(...) (the tangent face's times one more ss), with bur the max over its burial loop's
 * terms; every factor is in [0, 1]. A rounded product of values in [0, 1] is at most each factor, and bur only
 * grows, so once (1 - bur) * band2(...) <= v the face cannot replace v: the face is skipped before its loops when
 * band2 <= v (bur = 0 there), and each burial loop breaks when its next trip could not change the outcome. The
 * check is the value's own leading product (the same expression), so the value is at most v whenever the check
 * says so, and nothing else reads bur. The burial is the most divergent loop (an 8x8 tile's max trips 4-5x the mean,
 * desktop counts). BENCH ONLY: exact on the desktop (0 px on 12 scenes) but NOT on the Pixel (8-97 px on 11 of 12
 * scenes at 822): its compiler evidently forms the value and the check differently (a fused or reordered product
 * rounds the other way), so the argument holds only where both are the same rounded expression.
 */
const BX_CHECK = "if (!((1.0 - bur) * bx2 > v)) break;";
function burialExit(src: string): string {
  const rep = (a: string, b: string): void => {
    const parts = src.split(a);
    if (parts.length !== 2) throw new Error(`gfFs bx: expected one "${a.trim().slice(0, 48)}", found ${parts.length - 1}`);
    src = parts.join(b);
  };
  const LOOP_M = "for (int m = 0; m < np && bur < 1.0; m++) {\n";
  rep(`      vec2 q = f + (h * (p - f)) / X;\n      float bur = 0.0;\n      ${LOOP_M}`,
    `      vec2 q = f + (h * (p - f)) / X;\n      float bx2 = band2(h - X); if (!(bx2 > v)) continue;\n      float bur = 0.0;\n      ${LOOP_M}        ${BX_CHECK}\n`);
  rep("      for (int i = 0; i < nk && bur < 1.0; i++) {\n",
    `      for (int i = 0; i < nk && bur < 1.0; i++) {\n        ${BX_CHECK}\n`);
  rep(`      vec2 q = K0.xy + (K0.z * (p - K0.xy)) / rho;\n      float bur = 0.0;\n      ${LOOP_M}`,
    `      vec2 q = K0.xy + (K0.z * (p - K0.xy)) / rho;\n      float bx2 = band2(Dk); if (!(bx2 > v)) continue;\n      float bur = 0.0;\n      ${LOOP_M}        ${BX_CHECK}\n`);
  if (src.includes("#ifdef TANGENT\n    for (int i = 0; i < nk; i++) {")) {
    rep(`        float dT = length(p - T); if (!(dT < W + aa)) continue;\n        float bur = 0.0;\n        ${LOOP_M}`,
      `        float dT = length(p - T); if (!(dT < W + aa)) continue;\n        float bx2 = band2(dT); if (!(bx2 > v)) continue;\n        float bur = 0.0;\n        ${LOOP_M}          ${BX_CHECK}\n`);
  }
  return src;
}

function gfSrc(probe: boolean, tangentTerms: boolean, tier?: GfTier): string {
  const mp = tier ? tier.p : MAXP;
  const mk = tier ? tier.k : MAXK;
  const half = !!(tier && tier.half);
  return `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
#define MAXP ${mp}
#define MAXK ${mk}
#define MAXR ${MAXR}
#define MAXS ${tier && tier.s && tier.s < mp + mk ? tier.s : mp + mk}
${tier && tier.s && tier.s < mp + mk ? "#define SCAP 1" : ""}
#define LOG ${GF_LOG}
#define TWM ${(1 << GF_LOG) - 1}
#define BIG 1e30
#define BIGT 1e29
#define IQ ${half ? "mediump" : "highp"}
#define FQ ${half ? "mediump" : "highp"}
${probe ? "#define PROBE 1" : ""}
${tangentTerms ? "#define TANGENT 1" : ""}
${tier ? "#define TIER 1" : ""}
${tier && !tier.ramps ? "#define NORAMP 1" : ""}
${tier && tier.fast && !probe ? "#define FAST 1" : ""}
${tier && tier.lab && !probe ? "#define LABRUN 1" : ""}
${tier && tier.grp && !probe ? "#define PGRP 1" : ""}
${tier && tier.kq && !probe ? "#define PKQ 1" : ""}
${tier && tier.lh && !probe ? "#define PLH 1" : ""}
${tier && tier.so && !probe ? "#define SORTIN 1" : ""}
${tier && tier.cs && !probe ? "#define PCS 1" : ""}
${tier && tier.ks && !probe ? "#define PKS 1" : ""}
${tier && (tier.kl || tier.kr || tier.kc) && !probe ? "#define KLEAN 1" : ""}
${tier && (tier.kr || tier.kc) && !probe ? "#define KRHO 1" : ""}
${tier && tier.kc && !probe ? "#define KSGN 1" : ""}
${tier && tier.vs && !probe ? "#define SVSID 1" : ""}
${tier && tier.ga && !probe ? "#define SGAP 1" : ""}
${tier && tier.sc && !probe ? "#define SCODE 1" : ""}
uniform sampler2D uD;
uniform int uOCh, uOV, uOPin, uOArm, uOK, uOChk, uOCell, uOChL, uOKL, uOKC, uOKB, uOKA;
uniform float uH, uW, uAA, uSigma, uZt, uWin, uRc;
uniform vec4 uGrid; // gx0, gy0, G, 0
uniform ivec2 uGDim; // gW, gH
uniform vec4 uMap;
#ifdef PROBE
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
layout(location = 2) out vec4 o2;
#elif defined(SPLIT1) && defined(SPLITK)
// pieces 0 and 1, then piece 2 and the corners (gf_split.ts, 32 bytes)
layout(location = 0) out uvec4 o0;
layout(location = 1) out uvec4 o1;
#elif defined(SPLIT1)
// one target per piece the tier holds, then the corners (gf_split.ts)
layout(location = 0) out uvec4 o0;
#if MAXP > 1
layout(location = 1) out uvec4 o1;
#endif
#if MAXP > 2
layout(location = 2) out uvec4 o2;
#endif
layout(location = MAXP) out uvec2 o3;
#else
out vec4 o0;
#endif
#ifdef SPLIT2
uniform highp usampler2D uP0, uP1, uP2, uP3;
#endif
#ifdef PROBE
#define PR(x) x
#else
#define PR(x)
#endif
#if defined(SPLIT1) || defined(PKQ)
#define S1(x) x
#else
#define S1(x)
#endif
#ifdef PKQ
#define FXY(x)
#else
#define FXY(x) x
#endif

vec4 F(int i) { return texelFetch(uD, ivec2(i & TWM, i >> LOG), 0); }
float L4(int base, int i) { vec4 t = F(base + (i >> 2)); int c = i & 3; return c == 0 ? t.x : c == 1 ? t.y : c == 2 ? t.z : t.w; }
float ss(float e0, float e1, float x) { float t = clamp((x - e0) / (e1 - e0), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
int pmod(int k, int n) { int r = k - n * int(floor(float(k) / float(n))); if (r < 0) r += n; if (r >= n) r -= n; return r; }

// pieces (ptx, pty, pend, the surfaces' scs / swk / swa / swb and cWk / cWa / cWb feed only the probe's label
// and winner outputs, never ink or coverage: the app's program, without PROBE, does not carry them)
#ifdef PLH
IQ int pc[MAXP]; float ps[MAXP]; float pd[MAXP];
IQ int plh[MAXP]; // K1362 s10: (plo + 32768) | (phi - plo) << 16 [| (pkq - plo) << 24 with PKQ] in one int; a piece past the fields overflows
#define PLO(j) ((plh[j] & 0xffff) - 32768)
#define PHI(j) (PLO(j) + ((plh[j] >> 16) & 0xff))
#define PKQV(j) (PLO(j) + ((plh[j] >> 24) & 0xff))
#else
IQ int pc[MAXP]; float ps[MAXP]; float pd[MAXP]; IQ int plo[MAXP]; IQ int phi[MAXP];
#define PKQV(j) pkq[j]
#endif
#ifndef PKQ
float pfx[MAXP]; float pfy[MAXP];
#endif
#ifdef PKS
#define pkey ps // K1362 s10: the keys overwrite the scan's ps (dead after them) in place
#else
float pkey[MAXP];
#endif
#ifndef PGRP
IQ int pg[MAXP]; FQ float pramp[MAXP];
#endif
#if (defined(SPLIT1) || defined(PKQ)) && !defined(PLH)
IQ int pkq[MAXP]; // K1362 s7: the nearest segment's index as the scan unwrapped it (plo <= pkq <= phi): pass 2 rebuilds pd, pfx, pfy from it
#endif
#ifdef PROBE
float ptx[MAXP]; float pty[MAXP]; bool pend[MAXP];
#endif
#ifdef PCS
int np; // K1362 s10: a piece's surface rides in pc's high 16 bits (+ 32768); a surface id past them overflows
#define PC(j) (pc[j] & 0xffff)
#define PSURF(j) (int(uint(pc[j]) >> 16) - 32768)
#define SETSURF(j, v) { int sv_ = (v); if (sv_ < -32768 || sv_ > 32767) { discard; return; } pc[j] = int((uint(pc[j]) & 0xffffu) | (uint(sv_ + 32768) << 16)); }
#else
IQ int psurf[MAXP]; int np;
#define PC(j) pc[j]
#define PSURF(j) psurf[j]
#define SETSURF(j, v) psurf[j] = (v);
#endif
// corners near p
#ifdef KLEAN
IQ int kk[MAXK]; int nk; // K1362 s10: rho, the sector and the ring class rebuilt by KST()
#ifdef KRHO
float krho[MAXK];
#endif
#else
IQ int kk[MAXK]; float krho[MAXK]; IQ int kIn[MAXK]; bool kSec[MAXK]; int nk;
#endif
// surfaces
#ifdef LABRUN
IQ int sid[MAXS]; float skey[MAXS];
#else
IQ int sid[MAXS]; float skey[MAXS]; float sckey[MAXS]; IQ int scch[MAXS]; bool scov[MAXS];
#endif
#if defined(SVSID) || defined(SGAP) || defined(SCODE)
// K1362 s11: sv in sid, sa in skey (after the gaps), the order in one int; each slot holds one value at a time
#ifndef SVSID
FQ float sv[MAXS];
#endif
#ifndef SGAP
FQ float sa[MAXS];
#endif
int ns;
#ifdef SORTIN
#define SORD(i) (i)
#define SO1(x)
#elif defined(SCODE)
int sordc; // entry of sorted place i in bits 2i, 2i + 1 (228 = 0, 1, 2, 3: the identity)
#define SORD(i) ((sordc >> (2 * (i))) & 3)
#define SCSET(i, v) sordc = (sordc & ~(3 << (2 * (i)))) | ((v) << (2 * (i)));
#define SO1(x) sordc = 228;
#else
IQ int sord[MAXS];
#define SORD(i) sord[i]
#define SO1(x) x
#endif
#elif defined(SORTIN)
FQ float sv[MAXS]; FQ float sa[MAXS]; int ns; // K1362 s10: no sord, the surfaces are sorted in place (sid, skey)
#define SORD(i) (i)
#define SO1(x)
#else
FQ float sv[MAXS]; FQ float sa[MAXS]; IQ int sord[MAXS]; int ns;
#define SORD(i) sord[i]
#define SO1(x) x
#endif
#ifdef SVSID
#define SVW(e, x) sid[e] = floatBitsToInt(x);
#define SVR(e) intBitsToFloat(sid[e])
#else
#define SVW(e, x) sv[e] = x;
#define SVR(e) sv[e]
#endif
#ifdef SGAP
float gp0; float gp1;
#define SAW(e, x) skey[e] = x;
#define SAR(e) skey[e]
#else
#define SAW(e, x) sa[e] = x;
#define SAR(e) sa[e]
#endif
#ifdef PROBE
float scs[MAXS]; int swk[MAXS]; int swa[MAXS]; int swb[MAXS];
#endif
int labC; float labS; int cWk; int cWa; int cWb; float cCov;

// K1362 s6 keys per bin (gf_keys.ts): the piece's bin on its chain, (pin search lo, hi, first candidate arm, count).
// u is depth()'s own u; the bin's bounds and candidates hold for any u within half a bin of it.
#ifdef OLDKEYS
#define KAB uOArm
vec4 keyBin(int c, float s) { vec4 C1 = F(uOCh + 3 * c + 1); return vec4(-1.0, C1.z, C1.w, F(uOCh + 3 * c + 2).x); }
#else
#define KAB uOKA
vec4 keyBin(int c, float s) {
  vec4 C0 = F(uOCh + 3 * c); vec4 C1 = F(uOCh + 3 * c + 1);
  float u = s;
  if (C0.z > 0.5) { u = mod(s - C1.x, C0.w); u += C1.x; }
  vec4 KC = F(uOKC + c);
  float bi = clamp(floor((u - KC.w) / KC.z), 0.0, KC.y - 1.0);
  return F(uOKB + int(KC.x) + int(bi));
}
#endif

int mg; float mramp;
void member(int c, float s, vec4 KB) {
  vec4 C0 = F(uOCh + 3 * c);
  int a0 = int(KB.z); int an = int(KB.w); float lam = uH; bool closed = C0.z > 0.5; float len = C0.w;
  int g = -1; float ramp = 0.0;
  for (int i = a0; i < a0 + an; i++) {
    vec4 A = F(KAB + 2 * i);
    float d = (s - A.x) * A.y; if (closed) d = mod(d, len);
    if (d < -1e-12 || d > A.z + 1e-12) continue;
    float Lc = A.w;
    float rp = Lc >= BIGT ? 1.0 : ss(Lc, Lc - lam, d);
    if (g < 0 || rp > ramp) { g = int(F(KAB + 2 * i + 1).x); ramp = rp; }
  }
  if (g >= 0 && ramp > 0.0) {
    for (int i = a0; i < a0 + an; i++) {
      vec4 A = F(KAB + 2 * i); float Lc = A.w;
      if (int(F(KAB + 2 * i + 1).x) != g || Lc >= BIGT) continue;
      float d = (s - A.x) * A.y; if (closed) { d = mod(d, len); if (d > len / 2.0) d -= len; }
      if (!(d < 1e-12 && d > Lc - lam)) continue;
      ramp = min(ramp, ss(Lc, Lc - lam, d));
    }
  }
  mg = g; mramp = g < 0 ? 1.0 : ramp;
}

float hat(float z, float d, float w) { return w <= 1e-12 ? (d <= 0.0 ? z : 0.0) : d >= w ? 0.0 : z * (1.0 - d / w); }
float depth(int c, float s, vec4 KB) {
  vec4 C0 = F(uOCh + 3 * c); vec4 C1 = F(uOCh + 3 * c + 1);
  int n = int(C1.z); if (n == 0) return 0.0;
  int b = uOPin + int(C1.y); float win = uWin; bool closed = C0.z > 0.5; float len = C0.w;
  float u = s;
  if (closed) { u = mod(s - C1.x, len); u += C1.x; }
  int lo = int(KB.x); int hi = int(KB.y);
  while (hi - lo > 1) { int m = (lo + hi) >> 1; if (F(b + m).x <= u) lo = m; else hi = m; }
  float zL = 0.0; float dL = 0.0; float zR = 0.0; float dR = 0.0; float w = win;
  if (closed) {
    int iL = lo < 0 ? n - 1 : lo; vec4 PL = F(b + iL); float sL = lo < 0 ? PL.x - len : PL.x;
    int iR = lo + 1 >= n ? 0 : lo + 1; vec4 PR = F(b + iR); float sR = lo + 1 >= n ? PR.x + len : PR.x;
    w = min(win, sR - sL); zL = PL.y; dL = u - sL; zR = PR.y; dR = sR - u;
  } else if (lo < 0) { vec4 P = F(b); zR = P.y; dR = P.x - u; dL = BIG; }
  else if (lo + 1 >= n) { vec4 P = F(b + n - 1); zL = P.y; dL = u - P.x; dR = BIG; }
  else { vec4 PL = F(b + lo); vec4 PR = F(b + lo + 1); w = min(win, PR.x - PL.x); zL = PL.y; dL = u - PL.x; zR = PR.y; dR = PR.x - u; }
  return hat(zL, dL, w) + hat(zR, dR, w);
}

float pieceD(int j, vec2 p) {
  int c = PC(j); vec4 C0 = F(uOCh + 3 * c); int v0 = int(C0.x); int nseg = int(C0.y) - 1; bool closed = C0.z > 0.5;
  float d2 = BIG;
#ifdef PLH
  int qlo = PLO(j); int qhi = PHI(j);
  for (int q = qlo; q <= qhi; q++) {
#else
  for (int q = plo[j]; q <= phi[j]; q++) {
#endif
    int k = q; if (closed) k = pmod(k, nseg); else if (k < 0 || k >= nseg) continue;
    vec4 A = F(uOV + v0 + k); vec4 B = F(uOV + v0 + k + 1);
    vec2 a = A.xy; vec2 dd = B.xy - a;
    float l2 = dot(dd, dd); float u = l2 > 0.0 ? clamp(dot(p - a, dd) / l2, 0.0, 1.0) : 0.0;
    vec2 e = p - a - dd * u; float e2 = dot(e, e);
    if (e2 < d2) d2 = e2;
  }
  return d2;
}
#ifdef PKQ
// K1362 s10: piece j's foot point, rebuilt from its nearest segment (pkq) by the scan's own lines (as stage 7's
// pass 2 rebuilds it), in place of the scan's pfx / pfy arrays
vec2 footQ(int j, float x, float y) {
  int c = PC(j); vec4 C0 = F(uOCh + 3 * c); int cV0 = int(C0.x); int nseg = int(C0.y) - 1; bool closed = C0.z > 0.5;
  int kq = PKQV(j);
  int v = cV0 + (closed ? pmod(kq, nseg) : kq);
  vec4 A = F(uOV + v); vec4 B = F(uOV + v + 1);
  float ax = A.x; float ay = A.y; float dx = B.x - ax; float dy = B.y - ay;
  float l2 = dx * dx + dy * dy; float u = l2 > 0.0 ? clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0.0, 1.0) : 0.0;
  float fx = ax + dx * u; float fy = ay + dy * u;
  return vec2(fx, fy);
}
#endif

bool inSector(int k, vec2 p) {
  vec4 K0 = F(uOK + 6 * k); vec4 K2 = F(uOK + 6 * k + 2);
  float rx = p.x - K0.x; float ry = p.y - K0.y;
  float cab = K2.x * K2.w - K2.y * K2.z;
  float c1 = K2.x * ry - K2.y * rx; float c2 = rx * K2.w - ry * K2.z;
  return cab >= 0.0 ? c1 >= 0.0 && c2 >= 0.0 : c1 <= 0.0 && c2 <= 0.0;
}

#ifdef KLEAN
// K1362 s10: corner k's rho, sector and ring class at p, the scan's own lines (in place of krho, kSec, kIn)
void kSK(int k, vec2 p, float rho, out bool sec, out int kin) {
  vec4 K0 = F(uOK + 6 * k);
  sec = inSector(k, p); bool inR = rho <= K0.w && sec;
  kin = !inR ? 0 : rho > K0.z - uAA ? 2 : 1;
}
void kState(int k, vec2 p, out float rho, out bool sec, out int kin) {
  vec4 K0 = F(uOK + 6 * k);
  float rx = p.x - K0.x; float ry = p.y - K0.y; rho = sqrt(rx * rx + ry * ry);
  kSK(k, p, rho, sec, kin);
}
#ifdef KSGN
// K1362 s11: the scan keeps rho for a corner in its sector and -1 for one outside (rho is a square root, never
// negative or NaN here); the ring class is the scan's own two comparisons on that rho
void kSG(int k, float rho, out bool sec, out int kin) {
  vec4 K0 = F(uOK + 6 * k);
  sec = rho >= 0.0; bool inR = rho <= K0.w && sec;
  kin = !inR ? 0 : rho > K0.z - uAA ? 2 : 1;
}
#define KR(x) x
#define KSV(r, s) (s ? r : -1.0)
#define KST(i, k, r, s, n) r = krho[i]; kSG(k, r, s, n);
#elif defined(KRHO) // the scan's rho kept, the sector and the ring class rebuilt
#define KR(x) x
#define KSV(r, s) r
#define KST(i, k, r, s, n) r = krho[i]; kSK(k, p, r, s, n);
#else
#define KR(x)
#define KST(i, k, r, s, n) kState(k, p, r, s, n);
#endif
#endif

bool outsideArms(int k, int own, vec2 p) {
  float lim = uH - 2.0 * uAA; float lim2 = lim * lim;
  vec4 K3 = F(uOK + 6 * k + 3);
  for (int side = 0; side < 2; side++) {
    int c = side == 0 ? int(K3.x) : int(K3.y); if (c == own) continue;
    for (int m = 0; m < np; m++) if (PC(m) == c && pieceD(m, p) < lim2) return false;
  }
  return true;
}

#ifdef SCAP
bool sOvf; // K1362 s9: a tier with fewer surface slots than pieces + corners: a pixel that needs one more goes to full
#endif
int entry(int id) {
  for (int i = 0; i < ns; i++) if (sid[i] == id) return i;
#ifdef SCAP
  if (ns == MAXS) { sOvf = true; return MAXS - 1; }
#endif
#ifdef LABRUN
  int i = ns++; sid[i] = id; skey[i] = -BIG; return i;
#else
  int i = ns++; sid[i] = id; skey[i] = -BIG; sckey[i] = -BIG; scch[i] = -1; PR(scs[i] = 0.0;) scov[i] = false; return i;
#endif
}
float band2(float D) { return (1.0 - ss(uW - uAA, uW + uAA, D)) * ss(-uAA, uAA, D); }

void layers(vec2 p) {
  float h = uH; float aa = uAA; float W = uW;
  ns = 0;
#ifdef SCAP
  sOvf = false;
#endif
#ifdef LABRUN
  labC = -1; float labK = -BIG; int labE = -1;
#endif
  for (int j = 0; j < np; j++) {
    if (!(pd[j] < h + aa)) continue;
    int e = entry(PSURF(j));
    if (pkey[j] > skey[e]) skey[e] = pkey[j];
#ifdef LABRUN
    if (pd[j] < h && (pkey[j] > labK || (pkey[j] == labK && e < labE))) { labK = pkey[j]; labE = e; labC = PC(j); }
#else
    if (pd[j] < h) { scov[e] = true; if (pkey[j] > sckey[e]) { sckey[e] = pkey[j]; scch[e] = PC(j); PR(scs[e] = ps[j];) } }
#endif
  }
  float zt = uZt;
  for (int i = 0; i < nk; i++) {
#ifdef KLEAN
    int k = kk[i]; float krI; bool ksI; int kiI; KST(i, k, krI, ksI, kiI) if (kiI != 2) continue;
#define KRI krI
#else
    int k = kk[i]; if (kIn[i] != 2) continue;
#define KRI krho[i]
#endif
    vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); vec4 K3 = F(uOK + 6 * k + 3); vec4 K4 = F(uOK + 6 * k + 4); vec4 K5 = F(uOK + 6 * k + 5);
    vec2 ta = p - K4.zw; vec2 tb = p - K5.xy;
    bool nearerA = dot(ta, ta) <= dot(tb, tb);
    float z = nearerA ? K4.x : K4.y; float key = z - zt;
    int e = entry(int(K1.z));
    if (key > skey[e]) skey[e] = key;
#ifdef LABRUN
    if (KRI > K0.z && (key > labK || (key == labK && e < labE))) { labK = key; labE = e; labC = nearerA ? int(K3.x) : int(K3.y); }
#else
    if (KRI > K0.z) { scov[e] = true; if (key > sckey[e]) { sckey[e] = key; scch[e] = nearerA ? int(K3.x) : int(K3.y); PR(scs[e] = nearerA ? K3.z : K3.w;) } }
#endif
  }
#ifdef SORTIN
  // the same insertion sort, the same comparisons in the same order, moving (sid, skey) in place of an order array
  for (int i = 1; i < ns; i++) { int vid = sid[i]; float vk = skey[i]; int m = i - 1; while (m >= 0 && skey[m] < vk) { sid[m + 1] = sid[m]; skey[m + 1] = skey[m]; m--; } sid[m + 1] = vid; skey[m + 1] = vk; }
#elif defined(SCODE)
  // K1362 s11: the same insertion sort on the order packed 2 bits an entry
  sordc = 228;
  for (int i = 1; i < ns; i++) { int v = SORD(i); int m = i - 1; while (m >= 0 && skey[SORD(m)] < skey[v]) { SCSET(m + 1, SORD(m)) m--; } SCSET(m + 1, v) }
#else
  for (int i = 0; i < ns; i++) sord[i] = i;
  for (int i = 1; i < ns; i++) { int v = sord[i]; int m = i - 1; while (m >= 0 && skey[sord[m]] < skey[v]) { sord[m + 1] = sord[m]; m--; } sord[m + 1] = v; }
#endif
#ifdef SGAP
  // K1362 s11: composite()'s gaps, its own subtractions, taken before sa overwrites skey
  gp0 = 0.0; gp1 = 0.0;
  if (ns > 1) gp0 = skey[SORD(0)] - skey[SORD(1)];
  if (ns > 2) gp1 = skey[SORD(1)] - skey[SORD(2)];
#endif
  for (int e = 0; e < ns; e++) {
    int S = sid[e]; float D = -BIG; float v = 0.0; PR(int wk = 0; int wa = -1; int wb = 0;)
    for (int j = 0; j < np; j++) {
      if (PSURF(j) != S || !(pd[j] < h + aa)) continue;
      float X = pd[j]; if (h - X > D) D = h - X;
      if (!(X > h - W - aa && X > 1e-12)) continue;
#ifdef PKQ
      vec2 f = footQ(j, p.x, p.y);
#else
      vec2 f = vec2(pfx[j], pfy[j]);
#endif
      vec2 q = f + (h * (p - f)) / X;
      float bur = 0.0;
      for (int m = 0; m < np && bur < 1.0; m++) {
        if (m == j || PSURF(m) != S) continue;
        float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(pieceD(m, q)));
        if (wb2 > bur) bur = wb2;
      }
      for (int i = 0; i < nk && bur < 1.0; i++) {
        int k = kk[i]; vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S) continue;
        float rq = length(q - K0.xy);
        if (rq > K0.z && rq < K0.w && inSector(k, q) && outsideArms(k, PC(j), q)) bur = 1.0;
      }
      float val = (1.0 - bur) * band2(h - X);
      if (val > v) { v = val; PR(wk = pend[j] ? 3 : 1; wa = PC(j); wb = ptx[j] * (p.y - pfy[j]) - pty[j] * (p.x - pfx[j]) >= 0.0 ? 1 : -1;) }
    }
    for (int i = 0; i < nk; i++) {
#ifdef KLEAN
      int k = kk[i]; vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S) continue;
      float rho; bool ksJ; int kiJ; KST(i, k, rho, ksJ, kiJ) if (!ksJ) continue; float Dk = rho - K0.z;
      if (kiJ == 2 && Dk > D) D = Dk;
#else
      int k = kk[i]; vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S || !kSec[i]) continue;
      float rho = krho[i]; float Dk = rho - K0.z;
      if (kIn[i] == 2 && Dk > D) D = Dk;
#endif
      if (!(rho > 1e-12)) continue;
      vec2 q = K0.xy + (K0.z * (p - K0.xy)) / rho;
      float bur = 0.0;
      for (int m = 0; m < np && bur < 1.0; m++) {
        if (PSURF(m) != S) continue;
        float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(pieceD(m, q)));
        if (wb2 > bur) bur = wb2;
      }
      float val = (1.0 - bur) * band2(Dk);
      if (val > v) { v = val; PR(wk = 2; wa = k; wb = 0;) }
    }
#ifdef TANGENT
    for (int i = 0; i < nk; i++) {
      int k = kk[i]; vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S || K1.x > 0.5) continue;
      vec4 K4 = F(uOK + 6 * k + 4); vec4 K5 = F(uOK + 6 * k + 5);
      for (int t = 0; t < 2; t++) {
        vec2 T = t == 1 ? K5.xy : K4.zw;
        float dT = length(p - T); if (!(dT < W + aa)) continue;
        float bur = 0.0;
        for (int m = 0; m < np && bur < 1.0; m++) {
          if (PSURF(m) != S) continue;
          float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(pieceD(m, T)));
          if (wb2 > bur) bur = wb2;
        }
        float val = (1.0 - bur) * band2(dT) * ss(-aa, aa, D);
        if (val > v) { v = val; PR(wk = 4; wa = k; wb = t;) }
      }
    }
#endif
    SVW(e, v) SAW(e, ss(-aa, aa, D)) PR(swk[e] = wk; swa[e] = wa; swb[e] = wb;)
  }
#ifndef LABRUN
  int top = -1;
  for (int i = 0; i < ns; i++) if (scov[i] && (top < 0 || sckey[i] > sckey[top])) top = i;
  labC = top >= 0 ? scch[top] : -1; PR(labS = top >= 0 ? scs[top] : 0.0;)
#endif
}
#ifdef FAST

// K1362 s9: layers() for a pixel with at most one piece, no corner and no ramp. There is at most one surface, so no
// sort, no burial (the burial loops skip the piece itself and there is no corner) and no corner face; v, D and the
// label are layers()'s statements on the same values, and composite() and the accumulation stay shared.
void layers1() {
  float h = uH; float aa = uAA; float W = uW;
  ns = 0; labC = -1;
#ifdef SCAP
  sOvf = false;
#endif
  if (np == 1 && pd[0] < h + aa) {
    ns = 1; SO1(sord[0] = 0;)
    float D = -BIG; float v = 0.0;
    float X = pd[0]; if (h - X > D) D = h - X;
    if (X > h - W - aa && X > 1e-12) { float bur = 0.0; float val = (1.0 - bur) * band2(h - X); if (val > v) v = val; }
    SVW(0, v) SAW(0, ss(-aa, aa, D))
    if (pd[0] < h) labC = PC(0);
  }
}
#endif

float comp(int sw) {
  float Tt = 1.0; float ink = 0.0; float best = 0.0;
  for (int i = 0; i < ns; i++) {
    int e = SORD(i); if (sw >= 0 && i == sw) e = SORD(i + 1); else if (sw >= 0 && i == sw + 1) e = SORD(i - 1);
    float c = Tt * SVR(e);
    if (c > 0.0) { ink += c; PR(if (c > best && sw < 0) { best = c; cWk = swk[e]; cWa = swa[e]; cWb = swb[e]; }) }
    Tt *= 1.0 - SAR(e);
    if (!(Tt > 0.0)) break;
  }
  if (sw < 0) cCov = 1.0 - max(Tt, 0.0);
  return min(1.0, ink);
}

float composite() {
  float zt = uZt;
  cWk = 0; cWa = -1; cWb = 0;
  float r = comp(-1);
  for (int i = 0; i + 1 < ns; i++) {
#ifdef SGAP
    float gap = i == 0 ? gp0 : gp1;
#else
    float gap = skey[SORD(i)] - skey[SORD(i + 1)];
#endif
    if (!(gap < zt)) continue;
    float r2 = comp(i);
    if (r2 == r) continue;
    float t = ss(-zt, zt, gap);
    r = t * r + (1.0 - t) * r2;
    break;
  }
  return r;
}

void main() {
  vec2 p = vec2(uMap.x * gl_FragCoord.x + uMap.y, uMap.z * gl_FragCoord.y + uMap.w);
  float x = p.x; float y = p.y;
  float h = uH; float aa = uAA; float W = uW;
  int nSeg = 0; int nK = 0;
  float oInk = 0.0; float oCov = 0.0; int oCh = -1; float oS = 0.0; int oWk = 0; int oWa = -1; int oWb = 0;
  np = 0; nk = 0; ns = 0; bool ovf = false;
  int gx = int(floor((x - uGrid.x) / uGrid.z)); int gy = int(floor((y - uGrid.y) / uGrid.z));
#ifdef SPLIT1
  uint s3x = 0u; uint s3y = 0u; // K1362 s7: pass 1's corners and counts (outside the grid: none)
  uvec4 e0 = uvec4(0u); uvec4 e1 = uvec4(0u); uvec4 e2 = uvec4(0u);
#endif
  if (gx >= 0 && gy >= 0 && gx < uGDim.x && gy < uGDim.y) {
#ifdef SPLIT2
    // K1362 s7 pass 2 (gf_split.ts): pass 1's pieces, keys and corners, read back; everything pass 1 dropped
    // (ps, the scan's state) is not needed below, and pd, pfx, pfy, krho, kSec, kIn and thruQ are rebuilt from
    // their indices by the same lines that made them.
    ivec2 pix = ivec2(gl_FragCoord.xy);
#ifdef SPLITK
    uvec4 T0 = texelFetch(uP0, pix, 0); uvec4 T1 = texelFetch(uP1, pix, 0); uvec2 S3 = T1.zw;
#else
    uvec2 S3 = texelFetch(uP3, pix, 0).xy;
#endif
    np = int((S3.y >> 19) & 3u); nk = int((S3.y >> 17) & 3u);
    int thruK = int(S3.y & 0xffffu) - 1; bool yielded = ((S3.y >> 16) & 1u) != 0u; float thruQ = 0.0;
    if (thruK >= 0) { vec4 K0 = F(uOK + 6 * thruK); float rx = x - K0.x; float ry = y - K0.y; float d2 = rx * rx + ry * ry; thruQ = sqrt(d2); }
    int nr = 0; int rIdx0 = 0; int rIdx1 = 0;
    for (int j = 0; j < np; j++) {
#ifdef SPLITK
      uvec2 E = j == 0 ? T0.xy : j == 1 ? T0.zw : T1.xy;
      int c = int(E.x); pc[j] = c;
#else
      uvec4 E = j == 0 ? texelFetch(uP0, pix, 0) : j == 1 ? texelFetch(uP1, pix, 0) : texelFetch(uP2, pix, 0);
      int c = int(E.x & 0xffffu); pc[j] = c; pg[j] = int(E.x >> 16) - 1;
#endif
      plo[j] = int(E.y & 0xffffu) - 32768; phi[j] = plo[j] + int((E.y >> 16) & 0xffu); int kq = plo[j] + int(E.y >> 24);
#ifndef SPLITK
      pkey[j] = uintBitsToFloat(E.z); pramp[j] = uintBitsToFloat(E.w);
#endif
      vec4 C0 = F(uOCh + 3 * c); int cV0 = int(C0.x); int nseg = int(C0.y) - 1; bool closed = C0.z > 0.5;
      int v = cV0 + (closed ? pmod(kq, nseg) : kq);
      vec4 A = F(uOV + v); vec4 B = F(uOV + v + 1);
      float ax = A.x; float ay = A.y; float dx = B.x - ax; float dy = B.y - ay;
      float l2 = dx * dx + dy * dy; float u = l2 > 0.0 ? clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0.0, 1.0) : 0.0;
      float fx = ax + dx * u; float fy = ay + dy * u; float ex = x - fx; float ey = y - fy; float d2 = ex * ex + ey * ey;
      pd[j] = sqrt(d2); pfx[j] = fx; pfy[j] = fy;
#ifdef SPLITK
      float s = A.z + u * (B.z - A.z); ps[j] = s;
#else
      if (pg[j] >= 0 && pramp[j] > 0.0 && pramp[j] < 1.0) { if (nr == 0) rIdx0 = j; else rIdx1 = j; nr++; }
#endif
    }
#ifdef SPLITK
    // the keys, pass 1's loop line for line (gf_split.test.ts counts it)
    float zK = uZt / h;
    for (int j = 0; j < np; j++) {
      vec4 KB = keyBin(PC(j), ps[j]);
      float pz = depth(PC(j), ps[j], KB); pkey[j] = pz - pd[j] * zK;
      member(PC(j), ps[j], KB); pg[j] = mg; pramp[j] = mramp;
      if (mg >= 0 && mramp > 0.0 && mramp < 1.0) {
        if (nr < MAXR) { if (nr == 0) rIdx0 = j; else rIdx1 = j; nr++; }
        else pramp[j] = mramp >= 0.5 ? 1.0 : 0.0;
      }
    }
#endif
    if (nk > 0) kk[0] = int(S3.x & 0xffffu);
    if (nk > 1) kk[1] = int(S3.x >> 16);
    for (int i = 0; i < nk; i++) {
      int k = kk[i]; vec4 K0 = F(uOK + 6 * k);
      float rx = x - K0.x; float ry = y - K0.y; float rho = sqrt(rx * rx + ry * ry);
      bool sec = inSector(k, p); bool inR = rho <= K0.w && sec;
      kSec[i] = sec; krho[i] = rho; kIn[i] = !inR ? 0 : rho > K0.z - aa ? 2 : 1;
    }
#else
    int cell = gy * uGDim.x + gx; float rc = uRc; float rc2 = rc * rc;
    vec4 CE = F(uOCell + cell);
    int c0 = int(CE.x); int cn = int(CE.y);
    for (int q = c0; q < c0 + cn; q++) {
#ifdef TIER
      if (ovf) break; // not in the loop's condition: ANGLE's D3D translation of "q < c0 + cn && !ovf" lost pieces (K1362 s4)
#endif
      int ch = int(L4(uOChL, q));
      vec4 H0 = F(uOChk + 2 * ch); vec4 BX = F(uOChk + 2 * ch + 1);
      float bx = max(max(BX.x - x, 0.0), x - BX.z); float by = max(max(BX.y - y, 0.0), y - BX.w);
      if (bx * bx + by * by >= rc2) continue;
      int c = int(H0.z); int v0 = int(H0.x); int chn = int(H0.y);
      vec4 C0 = F(uOCh + 3 * c); int cV0 = int(C0.x); int nseg = int(C0.y) - 1; bool closed = C0.z > 0.5; float len = C0.w;
      for (int i = 0; i < chn; i++) {
        int v = v0 + i; nSeg++;
        vec4 A = F(uOV + v); vec4 B = F(uOV + v + 1);
        float ax = A.x; float ay = A.y; float dx = B.x - ax; float dy = B.y - ay;
        float l2 = dx * dx + dy * dy; float u = l2 > 0.0 ? clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0.0, 1.0) : 0.0;
        float fx = ax + dx * u; float fy = ay + dy * u; float ex = x - fx; float ey = y - fy; float d2 = ex * ex + ey * ey;
        if (d2 >= rc2) continue;
        float d = sqrt(d2); float s = A.z + u * (B.z - A.z); int k = v - cV0;
        bool isEnd = !closed && ((k == 0 && u <= 0.0) || (k == nseg - 1 && u >= 1.0));
        int j = -1;
        for (int m = 0; m < np; m++) {
          if (PC(m) != c) continue;
          float ds = abs(s - ps[m]); if (closed) ds = min(ds, len - ds);
          if (ds < uSigma) { j = m; break; }
        }
        if (j >= 0) {
          int q2 = k;
#ifdef PLH
          int lo = PLO(j); int hi = PHI(j); int kq0 = PKQV(j);
          if (closed) { int ref = lo; float hn = float(nseg) / 2.0; while (float(q2 - ref) > hn) q2 -= nseg; while (float(ref - q2) > hn) q2 += nseg; }
          if (q2 < lo) lo = q2; if (q2 > hi) hi = q2;
          if (d < pd[j]) { pd[j] = d; ps[j] = s; FXY(pfx[j] = fx; pfy[j] = fy;) kq0 = q2; }
          if (lo < -32768 || hi - lo >= 256) { ovf = true; break; } // the full program keeps this piece: it draws the pixel
#ifdef PKQ
          plh[j] = (lo + 32768) | ((hi - lo) << 16) | ((kq0 - lo) << 24);
#else
          plh[j] = (lo + 32768) | ((hi - lo) << 16);
#endif
#else
          if (closed) { int ref = plo[j]; float hn = float(nseg) / 2.0; while (float(q2 - ref) > hn) q2 -= nseg; while (float(ref - q2) > hn) q2 += nseg; }
          if (q2 < plo[j]) plo[j] = q2; if (q2 > phi[j]) phi[j] = q2;
          if (d < pd[j]) { pd[j] = d; ps[j] = s; FXY(pfx[j] = fx; pfy[j] = fy;) PR(ptx[j] = dx; pty[j] = dy; pend[j] = isEnd;) S1(pkq[j] = q2;) }
#endif
          continue;
        }
        if (np < MAXP) j = np++;
#ifdef TIER
        else { ovf = true; break; } // the full program keeps this piece: it draws the pixel
#else
        else { int far = 0; for (int m = 1; m < MAXP; m++) if (pd[m] > pd[far]) far = m; if (pd[far] <= d) continue; j = far; }
#endif
#ifdef PCS
        if (c > 65535) { ovf = true; break; }
#endif
#ifdef PLH
        if (k >= 32768) { ovf = true; break; }
        pc[j] = c; pd[j] = d; ps[j] = s; FXY(pfx[j] = fx; pfy[j] = fy;) plh[j] = k + 32768;
#else
        pc[j] = c; pd[j] = d; ps[j] = s; FXY(pfx[j] = fx; pfy[j] = fy;) plo[j] = k; phi[j] = k; PR(ptx[j] = dx; pty[j] = dy; pend[j] = isEnd;) S1(pkq[j] = k;)
#endif
      }
    }
#ifdef TIER
    if (ovf) { discard; return; } // D3D (ANGLE on Windows) runs on past a discard: end the pixel outright
#endif
#if !(defined(SPLIT1) && defined(SPLITK))
    // keys and membership
    float zK = uZt / h;
    int nr = 0; int rIdx0 = 0; int rIdx1 = 0;
#if defined(PGRP) || defined(PKS)
    // K1362 s10: the same keys and membership. PKS: s read once (pkey overwrites ps); PGRP: no pg / pramp arrays.
    // A piece's cfg-0 surface goes to psurf here; a ramping piece's id there is a singleton that still carries its
    // group (-1 - j - MAXP * (g + 1)), and the configuration loop makes it a member when its configuration comes.
#ifdef PGRP
    float r0 = 0.0; float r1 = 0.0;
#endif
    for (int j = 0; j < np; j++) {
      float sj = ps[j];
      vec4 KB = keyBin(PC(j), sj);
      float pz = depth(PC(j), sj, KB);
      member(PC(j), sj, KB);
      pkey[j] = pz - pd[j] * zK;
#ifdef PGRP
      float pr = mramp; bool rmp = false;
      if (mg >= 0 && mramp > 0.0 && mramp < 1.0) {
        if (nr < MAXR) { if (nr == 0) { rIdx0 = j; r0 = mramp; } else { rIdx1 = j; r1 = mramp; } nr++; rmp = true; }
        else pr = mramp >= 0.5 ? 1.0 : 0.0;
      }
      SETSURF(j, rmp ? -1 - j - MAXP * (mg + 1) : mg >= 0 && pr >= 1.0 ? mg : -1 - j)
#else
      pg[j] = mg; pramp[j] = mramp;
      if (mg >= 0 && mramp > 0.0 && mramp < 1.0) {
        if (nr < MAXR) { if (nr == 0) rIdx0 = j; else rIdx1 = j; nr++; }
        else pramp[j] = mramp >= 0.5 ? 1.0 : 0.0;
      }
#endif
    }
#else
    for (int j = 0; j < np; j++) {
      vec4 KB = keyBin(PC(j), ps[j]);
      float pz = depth(PC(j), ps[j], KB); pkey[j] = pz - pd[j] * zK;
      member(PC(j), ps[j], KB); pg[j] = mg; pramp[j] = mramp;
      if (mg >= 0 && mramp > 0.0 && mramp < 1.0) {
        if (nr < MAXR) { if (nr == 0) rIdx0 = j; else rIdx1 = j; nr++; }
        else pramp[j] = mramp >= 0.5 ? 1.0 : 0.0;
      }
    }
#endif
#endif
#ifdef NORAMP
    if (nr > 0) { discard; return; } // ramping pieces: the configurations below; a later program draws the pixel
#endif
    // corners near p
    int k0 = int(CE.z); int kn = int(CE.w);
    int thruK = -1; float thruQ = 0.0; bool yielded = false; int nTj = 0; int tj[8];
    for (int q = k0; q < k0 + kn; q++) {
      int k = int(L4(uOKL, q)); vec4 K1 = F(uOK + 6 * k + 1); if (K1.x < 0.5) continue;
      vec4 K0 = F(uOK + 6 * k);
      float rx = x - K0.x; float ry = y - K0.y; float d2 = rx * rx + ry * ry; float lim = K1.y + W + 4.0 * aa;
      if (d2 <= lim * lim && inSector(k, p)) { if (thruK < 0) { thruK = k; thruQ = sqrt(d2); } if (nTj < 8) tj[nTj++] = int(K1.w); }
    }
    if (thruK >= 0) {
      for (int q = k0; q < k0 + kn && !yielded; q++) {
        int k = int(L4(uOKL, q)); vec4 K1 = F(uOK + 6 * k + 1); if (K1.x > 0.5) continue;
        bool same = false; for (int i = 0; i < nTj; i++) if (tj[i] == int(K1.w)) same = true;
        if (!same && inSector(k, p)) yielded = true;
      }
    }
#ifdef TIER
    for (int q = k0; q < k0 + kn; q++) {
#else
    for (int q = k0; q < k0 + kn && nk < MAXK; q++) {
#endif
      int k = int(L4(uOKL, q)); nK++;
      vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1);
      if (K1.x > 0.5) {
        if (yielded) continue;
        float tx = x - K0.x; float ty = y - K0.y; float lim = K1.y + W + 4.0 * aa;
        if (!(tx * tx + ty * ty <= lim * lim) || !inSector(k, p)) continue;
      }
      float rx = x - K0.x; float ry = y - K0.y; float rho = sqrt(rx * rx + ry * ry);
      if (!(rho > K0.z - aa - W) || rho > K0.w + W + 2.0 * aa) continue;
      bool sec = inSector(k, p); bool inR = rho <= K0.w && sec;
#ifdef TIER
      if (nk == MAXK) { ovf = true; break; } // the full program keeps this corner: it draws the pixel
#endif
#ifdef KLEAN
      kk[nk] = k; KR(krho[nk] = KSV(rho, sec);) nk++;
#else
      kSec[nk] = sec; kk[nk] = k; krho[nk] = rho; kIn[nk] = !inR ? 0 : rho > K0.z - aa ? 2 : 1; nk++;
#endif
    }
#ifdef TIER
    if (ovf) { discard; return; } // never past the arrays: D3D runs on past a discard
#endif
#endif
#ifdef SPLIT1
    // K1362 s7 pass 1: pack the pieces and corners for pass 2. A value that does not fit its field discards, so
    // the stencil stays 0 and the full program draws the pixel (exact by construction, like the tier's overflow).
    bool bad = thruK + 1 >= 65536;
    for (int j = 0; j < np; j++) {
      int span = phi[j] - plo[j]; int ko = pkq[j] - plo[j];
#ifdef SPLITK
      if (plo[j] < -32768 || plo[j] >= 32768 || span >= 256 || ko < 0 || ko >= 256) bad = true;
#else
      if (PC(j) >= 65535 || pg[j] + 1 >= 65536 || plo[j] < -32768 || plo[j] >= 32768 || span >= 256 || ko < 0 || ko >= 256) bad = true;
#endif
    }
    for (int i = 0; i < nk; i++) if (kk[i] >= 65535) bad = true;
    if (bad) { discard; return; }
    s3x = nk > 0 ? uint(kk[0]) | (nk > 1 ? uint(kk[1]) << 16 : 0u) : 0u;
    s3y = uint(thruK + 1) | (yielded ? 1u << 16 : 0u) | (uint(nk) << 17) | (uint(np) << 19);
#ifdef SPLITK
    // pieces 0 and 1 in target 0, piece 2 and the corners in target 1: the chain and the segments, 8 bytes a piece
    e1.zw = uvec2(s3x, s3y);
    for (int j = 0; j < np; j++) {
      uvec2 E = uvec2(uint(PC(j)), uint(plo[j] + 32768) | (uint(phi[j] - plo[j]) << 16) | (uint(pkq[j] - plo[j]) << 24));
      if (j == 0) e0.xy = E; else if (j == 1) e0.zw = E; else e1.xy = E;
    }
#else
    for (int j = 0; j < np; j++) {
      uvec4 E = uvec4(uint(PC(j)) | (uint(pg[j] + 1) << 16), uint(plo[j] + 32768) | (uint(phi[j] - plo[j]) << 16) | (uint(pkq[j] - plo[j]) << 24),
        floatBitsToUint(pkey[j]), floatBitsToUint(pramp[j]));
      if (j == 0) e0 = E; else if (j == 1) e1 = E; else e2 = E;
    }
#endif
#else
    // configurations over the ramping pieces
#ifdef PGRP
    if (nr == 2 && r0 < r1) { int t = rIdx0; rIdx0 = rIdx1; rIdx1 = t; float tr = r0; r0 = r1; r1 = tr; }
#else
    if (nr == 2 && pramp[rIdx0] < pramp[rIdx1]) { int t = rIdx0; rIdx0 = rIdx1; rIdx1 = t; }
#endif
    float ink = 0.0; float cov = 0.0; int lab = -1; PR(float labSv = 0.0; int wk = 0; int wa = -1; int wb = 0;) float bestW = -1.0;
    // Under NORAMP nr == 0 here (the discard above), so the loop runs once: one layering, weight 1. It stays a loop
    // on a runtime bound: inlined straight-line, D3D's compiler (ANGLE on Windows) failed the program at draw.
#ifdef FAST
    bool fast = np <= 1 && nk == 0 && nr == 0;
#endif
    for (int cfg = 0; cfg <= nr; cfg++) {
#ifdef PGRP
      // configuration cfg makes the first cfg ramping pieces members (they stay members in the later ones)
      if (cfg >= 1) { int jr = cfg == 1 ? rIdx0 : rIdx1; int id = PSURF(jr); if (id < -MAXP) SETSURF(jr, (-1 - jr - id) / MAXP - 1) }
      float hiR = cfg == 0 ? 1.0 : cfg == 1 ? r0 : r1;
      float loR = cfg == nr ? 0.0 : cfg == 0 ? r0 : r1;
      float wgt = hiR - loR; if (!(wgt > 0.0) && nr > 0) continue;
#else
      float hiR = cfg == 0 ? 1.0 : pramp[cfg == 1 ? rIdx0 : rIdx1];
      float loR = cfg == nr ? 0.0 : pramp[cfg == 0 ? rIdx0 : rIdx1];
      float wgt = hiR - loR; if (!(wgt > 0.0) && nr > 0) continue;
      for (int j = 0; j < np; j++) {
        bool mem = pg[j] >= 0 && pramp[j] >= 1.0;
        if (pg[j] >= 0 && pramp[j] > 0.0 && pramp[j] < 1.0) { mem = (cfg >= 1 && rIdx0 == j) || (cfg >= 2 && rIdx1 == j); }
        psurf[j] = mem ? pg[j] : -1 - j;
      }
#endif
#ifdef FAST
      if (fast) layers1(); else
#endif
      layers(p);
#ifdef SCAP
      if (sOvf) { discard; return; }
#endif
      float r = composite();
      float w = nr == 0 ? 1.0 : wgt;
      ink += w * r; cov += w * cCov;
      if (w > bestW) { bestW = w; lab = labC; PR(labSv = labS; wk = cWk; wa = cWa; wb = cWb;) }
    }
    if (thruK >= 0) {
      vec4 K0 = F(uOK + 6 * thruK); vec4 K3 = F(uOK + 6 * thruK + 3);
      int own = int(K3.x); float r = K0.z; float outv = 1.0 - ss(r + W - aa, r + W + aa, thruQ);
      if (!yielded) { if (lab < 0 || lab == own) { ink = ss(r - aa, r + aa, thruQ) * outv; if (lab < 0 && ink > 0.0) { lab = own; PR(labSv = K3.z;) } PR(wk = 5; wa = thruK;) } }
      else if (lab == own) ink = min(ink, outv);
    }
    oInk = min(1.0, ink); oCov = min(1.0, cov); PR(oCh = lab; oS = labSv; oWk = wk; oWa = wa; oWb = wb;)
#endif
  }
#ifdef PROBE
  o0 = vec4(oInk, oCov, float(oCh), oS);
  o1 = vec4(float(oWk), float(oWa), float(oWb), float(nSeg));
  o2 = vec4(float(nK), float(np), float(ns), 0.0);
#elif defined(SPLIT1) && defined(SPLITK)
  o0 = e0; o1 = e1;
#elif defined(SPLIT1)
  o0 = e0; o3 = uvec2(s3x, s3y);
#if MAXP > 1
  o1 = e1;
#endif
#if MAXP > 2
  o2 = e2;
#endif
#else
  o0 = vec4(oInk, oCov, 0.0, 1.0);
#endif
#if defined(SPLIT1) && defined(SPLITSKIP)
  // no piece, corner or through corner (s3y == 0): the pixel's output is (0, 0), the target's clear; depth 1 keeps
  // pass 2 off it (pass 2 draws depth 0.5 GREATER), depth 0 lets it draw
  gl_FragDepth = s3y == 0u ? 1.0 : 0.0;
#endif
}
`;
}
