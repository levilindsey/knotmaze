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
 *
 * `fj` (K1362 s12, the face loop; faceJoin below): one pass over the pieces, then the corners, then the tangent
 * points, each face updating its own surface's slot (v in sv, D in sa until the end), in place of a pass over every
 * piece per surface. The same faces on the same values; v and D are running maxima, so the order cannot change them.
 *
 * `lz` and `fs` (K1362 s13; lazyFaces, faceSkip below): lz runs the face loop in sorted order up to the first
 * opaque place; fs skips a face whose band cannot beat its surface's running maximum. fs "c" is fs in the corner
 * program only (GfPass cornerPlan); gfFs reads any truthy fs as fs.
 * `kp` (K1362 s14, cornerLists below): the scan's thru search and keep loop walk the cell's pruned corner lists
 * (tables.ts cellKPList); the corner program only (cornerPlan drops it from the free one). `kt` and `ko` (K1362 s14,
 * thruScalars, burialOrder below): the scan's thru chain ids as two scalars; a piece face's corner burial first.
 * `kg` (K1362 s14, cornerSurfaces below): kk carries each corner's surface, so layers() tests it before fetching.
 * `ki` (K1362 s14, cornerInside below): kIn 3 files rho > K0.z, so layers()'s first corner loop fetches no K0.
 * `km` (K1362 s14, cornerMerge below): the ring faces and the tangent faces share one corner loop and one burial.
 * `kd` (K1362 s14, tangentSkip below): fs's skip for the tangent faces includes their D factor.
 * `kh` (K1362 s14, cornerThru below; needs kg): kk also carries the thru bit, so the tangent loop fetches no K1.
 */
export type GfCornerForm = "route" | "frame" | "free" | "corner" | "zk";
export interface GfTier { p: number; k: number; ramps: boolean; half?: boolean; reg?: boolean; unroll?: boolean; pack?: GfPackForm; one?: boolean; bx?: boolean; fast?: boolean; s?: number; lab?: boolean; grp?: boolean; kq?: boolean; ks?: boolean; kl?: boolean; kr?: boolean; lh?: boolean; so?: boolean; cs?: boolean; vs?: boolean; ga?: boolean; sc?: boolean; kc?: boolean; kz?: GfCornerForm; fj?: boolean | "s"; lz?: boolean; fs?: boolean | "c"; kp?: boolean; kt?: boolean; ko?: boolean; kg?: boolean; ki?: boolean; km?: boolean; kd?: boolean | "g"; kh?: boolean; zc?: boolean; zb?: boolean; zk?: boolean; zf?: boolean }
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

/**
 * K1439: HOME MEMBERSHIP (K1438's eval.ts member(), T.homeOn) as a text form of any program gfFs makes, applied by
 * GfPass only behind the `gfh=1` render flag (gf_app.ts): without it no program changes, byte for byte
 * (gf_home_glsl.test.ts). member() takes the piece's depth z; loop 1 also finds the home arm, the nearest root
 * (smallest d) whose home interval [0, aHome] holds s (aHome rides the arm record's second texel .y, gf_pack.ts with
 * T.homeOn); a piece that is not already a full member takes that arm's group at 1 - ss(zt, Z, |z|) when that is
 * more than it has, Z = uHomeZ = fadeLength * amp / win (GfPass.homeFade, fed per frame: no table rebuild), a hard
 * step at |z| = zt while Z <= zt (K1449: eval.ts homeRamp, full membership down to the tie depth). The keys widen each arm's s set to aHome (gf_keys.ts). The depth classes (zc's P0 and P1, NORAMP)
 * call the same member() in the same keys loop, so a ramp still routes the pixel exactly as before.
 */
export function homeForm(src: string): string {
  const rep = (a: string, b: string, n: number): void => {
    const parts = src.split(a);
    if (parts.length - 1 !== n) throw new Error(`gfFs home: expected ${n} "${a.trim().slice(0, 48)}", found ${parts.length - 1}`);
    src = parts.join(b);
  };
  rep("uniform float uH, uW, uAA, uSigma, uZt, uWin, uRc;\n", "uniform float uH, uW, uAA, uSigma, uZt, uWin, uRc;\nuniform float uHomeZ; // K1439: home membership's fade depth\n", 1);
  rep("void member(int c, float s, vec4 KB) {\n", "void member(int c, float s, vec4 KB, float z) {\n", 1);
  rep("  int g = -1; float ramp = 0.0; float sRa = 0.0;\n", "  int g = -1; float ramp = 0.0; float sRa = 0.0; int hg = -1; float hb = 1e30;\n", 1);
  // loop 1's arm test, right after its d (the anchor text holds no wrap: K299's registry counts each mod site once)
  rep(
    "    if (d < -1e-12 || d > A.z + 1e-12) continue;\n",
    "    if (!(d < -1e-12 || d >= hb)) { vec4 A1 = F(KAB + 2 * i + 1); if (d <= A1.y + 1e-12) { hb = d; hg = int(A1.x); } }\n" +
    "    if (d < -1e-12 || d > A.z + 1e-12) continue;\n",
    1,
  );
  rep(
    "  mg = g; mramp = g < 0 ? 1.0 : ramp;\n}\n",
    "  if (g < 0) ramp = 1.0;\n" +
    "  if (hg >= 0 && !(g >= 0 && ramp >= 1.0)) {\n" +
    "    float az = abs(z);\n" +
    "    float r = uHomeZ > uZt ? 1.0 - ss(uZt, uHomeZ, az) : (az > uZt ? 0.0 : 1.0);\n" +
    "    if (r > 0.0 && !(g == hg && ramp >= r)) { g = hg; ramp = r; }\n" +
    "  }\n" +
    "  mg = g; mramp = ramp;\n}\n",
    1,
  );
  rep("member(PC(j), ps[j], KB);", "member(PC(j), ps[j], KB, mz);", 2);
  rep("member(PC(j), sj, KB);", "member(PC(j), sj, KB, mz);", 1);
  if (/member\(PC\(j\), [\w[\]]+, KB\)/.test(src)) throw new Error("gfFs home: a member() call without its depth is left");
  return src;
}

/**
 * K1482 s20: a retry corner (texel 5 .z = 1, gf_pack.ts; only in home membership's corner view) inks only: it
 * never raises its surface's D (eval.ts arc loop) and never covers or labels in layers() (eval.ts scov).
 * K1482 s23: a text form of homeForm's output, applied by GfPass only with the corner retry (`gfh=1` without `gfk=0`;
 * tables.ts GF_KRETRY): without it no program changes, byte for byte.
 */
export function retryForm(src: string): string {
  if (!src.includes("uniform float uHomeZ; // K1439: home membership's fade depth\n")) throw new Error("gfFs retry: homeForm first");
  src = src.split("uniform float uHomeZ; // K1439: home membership's fade depth\n").join(
    "uniform float uHomeZ; // K1439: home membership's fade depth\n#define KXT(k) (F(uOK + 6 * (k) + 5).z < 0.5)\n");
  src = src.split("Dk > D) D = Dk;").join("Dk > D && KXT(k)) D = Dk;");
  src = src.split("Dk > sa[e]) sa[e] = Dk;").join("Dk > sa[e] && KXT(k)) sa[e] = Dk;");
  src = src.split("if (KRI > K0.z && (key > labK").join("if (KRI > K0.z && KXT(k) && (key > labK");
  src = src.split("if (KRI > K0.z) { scov[e] = true;").join("if (KRI > K0.z && KXT(k)) { scov[e] = true;");
  src = src.split("if (kIn[i] == 3 && (key > labK").join("if (kIn[i] == 3 && KXT(k) && (key > labK");
  src = src.split("if (kIn[i] == 3) { scov[e] = true;").join("if (kIn[i] == 3 && KXT(k)) { scov[e] = true;");
  if (/Dk > (D|sa\[e\])\)|KRI > K0\.z\)|KRI > K0\.z && \(|kIn\[i\] == 3\)|kIn\[i\] == 3 && \(/.test(src)) throw new Error("gfFs home: a corner raise or cover without its retry test is left");
  return homeBurial(src);
}

/**
 * K1482 s28 (part of retryForm): eval.ts layers()'s home burial. A piece outside every group in its configuration
 * carries the group it is heading into in its surface id, -1 - j - MAXP * (B + 1) (the id PGRP already gave a
 * ramping piece): B = its ramp's group (pg >= 0), else its arm's home group while member() leaves it out for depth
 * (mhb; pg = -2 - mhb in the pg array, packed + 32769 by the split). Its faces are buried by B's tubes of other
 * chains, so its outline ends at theirs (j47), but only by pieces out of every crossing's depth window (z 0): where
 * the partner dips under the piece at a crossing, the piece's outline is the over-pass line (t56s). The term reads
 * pd[], ps[] and the depth tables (exact in P0 too), so zb's P0 needs no route for it.
 */
function homeBurial(src: string): string {
  const rep = (a: string, b: string, n?: number): void => {
    const parts = src.split(a);
    if (n !== undefined && parts.length - 1 !== n) throw new Error(`gfFs s28: expected ${n} "${a.trim().slice(0, 48)}", found ${parts.length - 1}`);
    src = parts.join(b);
  };
  rep("int mg; float mramp;\n", "int mg; float mramp; int mhb; // K1482 s28: the home group of a piece left out for depth\n", 1);
  rep("  mg = g; mramp = ramp;\n}\n", "  mg = g; mramp = ramp; mhb = g < 0 ? hg : -1;\n}\n", 1);
  rep("pg[j] = mg;", "pg[j] = mg >= 0 ? mg : -2 - mhb;");
  rep(": mg >= 0 && pr >= 1.0 ? mg : -1 - j)", ": mg >= 0 && pr >= 1.0 ? mg : -1 - j - MAXP * ((mg >= 0 ? mg : mhb) + 1))");
  rep("psurf[j] = mem ? pg[j] : -1 - j;", "psurf[j] = mem ? pg[j] : -1 - j - MAXP * ((pg[j] >= 0 ? pg[j] : -2 - pg[j]) + 1);");
  rep("uint(pg[j] + 1) << 16", "uint(pg[j] + 32769) << 16");
  rep("pg[j] + 1 >= 65536", "pg[j] + 32769 >= 65536 || pg[j] + 32769 < 0");
  rep("pg[j] = int(E.x >> 16) - 1;", "pg[j] = int(E.x >> 16) - 32769;");
  if (/-1 - j\)|\? pg\[j\] : -1 - j;|pg\[j\] \+ 1\b|int\(E\.x >> 16\) - 1;/.test(src)) throw new Error("gfFs s28: an own surface id or pg pack without the home group is left");
  // the term reads only pd[] (exact, no loop over segments), so zb's P0 computes it as P1 does: no route needed
  // (bx's form reads fb, its band2(h - X) computed before the loops)
  const VAL = ["      float val = (1.0 - bur) * band2(h - X);\n", "      float val = (1.0 - bur) * fb;\n"].filter((s) => src.includes(s));
  if (VAL.length !== 1) throw new Error(`gfFs s28: the piece face's value moved (${VAL.length} forms)`);
  // (m's depth only where the term would raise bur: the partner must sit out of every crossing's window, t56s)
  const HB = "      if (bur < 1.0 && S < -MAXP) { int B = (-1 - j - S) / MAXP - 1; for (int m = 0; m < np && bur < 1.0; m++) { if (PSURF(m) != B || PC(m) == PC(j)) continue;" +
    " float wb2 = 1.0 - ss(h - W - aa, h - W + aa, pd[m]); if (!(wb2 > bur)) continue;" +
    " wb2 *= 1.0 - ss(0.004, 0.02, abs(depth(PC(m), ps[m], keyBin(PC(m), ps[m])))); if (wb2 > bur) bur = wb2; } } // K1482 s28: home burial\n";
  rep(VAL[0], HB + VAL[0], 1);
  return src;
}

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
  if (tier?.kz && !probe) { // the probe draws the tier's own pixels: kz leaves it untouched, like the other flags
    if (form.split || form.reg || form.pack || form.unroll) throw new Error("gfFs: kz is a plain-form tier (no split, reg, pack or unroll)");
    if (tier.kz !== "free" && tier.kz !== "corner" && tier.kz !== "zk") throw new Error(`gfFs: kz "${tier.kz}" is GfPass's to expand into its programs (free, corner)`);
    if (tier.kz === "zk" && !tier.zc) throw new Error("gfFs: kz zk is a zc P0 form");
    src = cornerRoute(src, tier.kz);
  }
  if (tier?.lz && !probe) {
    if (form.split || form.reg || form.pack || form.unroll || tier.fj || tier.ga) throw new Error("gfFs: lz is a plain-form tier (no split, reg, pack, unroll, fj or ga)");
    src = lazyFaces(src);
  }
  if (tier?.kp && !probe && tier.kz !== "free") { // the free program has no corner scan (cornerPlan drops kp)
    if (form.split || form.reg || form.pack || form.unroll) throw new Error("gfFs: kp is a plain-form tier (no split, reg, pack or unroll)");
    src = cornerLists(src);
  }
  if ((tier?.kt || tier?.ko) && !probe && tier.kz !== "free") {
    if (form.split || form.reg || form.pack || form.unroll || tier.bx) throw new Error("gfFs: kt and ko are plain-form tiers (no split, reg, pack, unroll or bx)");
    if (tier.kt) src = thruScalars(src);
    if (tier.ko) src = burialOrder(src);
  }
  if (tier && tier.kg && !probe && tier.kz !== "free") {
    if (form.split || form.reg || form.pack || form.unroll || tier.bx || tier.fj || tier.half || tier.kl || tier.kr || tier.kc) {
      throw new Error("gfFs: kg is a plain-form tier (no split, reg, pack, unroll, bx, fj, half, kl, kr or kc)");
    }
    src = cornerSurfaces(src);
    if (tier.kh) src = cornerThru(src);
  }
  if (tier && tier.kh && !tier.kg) throw new Error("gfFs: kh needs kg");
  if (tier && tier.ki && !probe && tier.kz !== "free") {
    if (form.split || form.reg || form.pack || form.unroll || tier.bx || tier.fj || tier.half || tier.kl || tier.kr || tier.kc) {
      throw new Error("gfFs: ki is a plain-form tier (no split, reg, pack, unroll, bx, fj, half, kl, kr or kc)");
    }
    src = cornerInside(src);
  }
  if (tier?.fs && !probe) {
    if (form.split || form.reg || form.pack || form.unroll || tier.fj || tier.bx) throw new Error("gfFs: fs is a plain-form tier (no split, reg, pack, unroll, fj or bx)");
    src = faceSkip(src);
  }
  if (tier && tier.km && !probe && tier.kz !== "free") {
    if (!tier.fs || form.split || form.reg || form.pack || form.unroll || tier.bx || tier.fj || tier.half || tier.kl || tier.kr || tier.kc || tier.kg || tier.ki) {
      throw new Error("gfFs: km is a plain-form fs tier (fs; no split, reg, pack, unroll, bx, fj, half, kl, kr, kc, kg or ki)");
    }
    src = cornerMerge(src);
  }
  if (tier && tier.kd && !probe && tier.kz !== "free") {
    if (!tier.fs || tier.km || form.split || form.reg || form.pack || form.unroll || tier.bx || tier.fj || tier.half) {
      throw new Error("gfFs: kd is a plain-form fs tier (fs; no km, split, reg, pack, unroll, bx, fj or half)");
    }
    src = tangentSkip(src, tier.kd === "g");
  }
  if (tier?.fj && !probe) {
    if (form.split || form.reg || form.pack || form.unroll || tier.kq || tier.kl || tier.kr || tier.kc || tier.vs || tier.ga || tier.one || tier.bx) throw new Error("gfFs: fj is a plain-form tier (no split, reg, pack, unroll, kq, kl, kr, kc, vs, ga, one or bx)");
    src = faceJoin(src, tier.fj === "s");
  }
  if (tier?.zc && !probe) {
    if (tier.ramps || tier.one || tier.bx || tier.fast || form.split || form.reg || form.pack || form.unroll) throw new Error("gfFs: zc is a plain-form tier without ramps (no one, bx, fast, split, reg, pack or unroll)");
    src = zClass(src);
    if (tier.zb) src = zBur(src);
    if (tier.zf) src = zFast(src);
  }
  if (!probe && tangentTerms && !tier && !form.split && !form.reg && !form.pack && !form.unroll) src = oneFaceLoop(src); // K1456 26J: the full program only
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
/**
 * K1362 s12 `fj`: layers()'s faces in one pass. Before: for each surface e, every piece (those of other surfaces
 * skipped), then every corner, then every tangent point, v and D scalars written to sv[e] / sa[e] at the end. After:
 * sv[e] = 0 and sa[e] = -BIG for every surface, then each piece, corner and tangent point updates the slot of its
 * own surface (slotOf: the first sid entry equal to it; sid is unique, and a surface outside it is skipped as the
 * old loop skipped it), then sa[e] = ss(-aa, aa, sa[e]). Every face is the same statements on the same values, each
 * (surface, face) pair is visited once either way, D is final before the tangent points read it, and v and D are
 * strict running maxima (a NaN never enters), so the order cannot change them. `fj: "s"` reads sv[e] once per face
 * into a scalar v and writes it back where it rises (v and sv[e] stay equal), in place of sv[e] at every comparison.
 */
/** K1407 c3: layers()'s vertex-cap line, last before the per-surface write (fj and km move it). */
const VTX_LINE = "    if (v < 1.0 && D > -aa) { vec3 VX = vtx(S, p); float vxv = VX.x * ss(-aa, aa, D); if (vxv > v) { v = vxv; PR(wk = 6; wa = int(VX.y); wb = int(VX.z);) } } // K1407 c3: the vertex cap\n";
function faceJoin(src: string, scalar: boolean): string {
  const START = "  for (int e = 0; e < ns; e++) {\n    int S = sid[e]; float D = -BIG; float v = 0.0; PR(int wk = 0; int wa = -1; int wb = 0;)\n";
  const END = "    SVW(e, v) SAW(e, ss(-aa, aa, D)) PR(swk[e] = wk; swa[e] = wa; swb[e] = wb;)\n  }\n";
  const swap = (s: string, from: string, to: string, n: number) => {
    const c = s.split(from).length - 1;
    if (c !== n) throw new Error(`gfFs fj: expected ${n} of ${JSON.stringify(from.slice(0, 48))}, found ${c}`);
    return s.split(from).join(to);
  };
  const i0 = src.indexOf(START); const i1 = src.indexOf(END, i0);
  if (i0 < 0 || i1 < 0 || src.indexOf(START, i0 + 1) >= 0) throw new Error("gfFs fj: the face loop not found once");
  let b = src.slice(i0 + START.length, i1);
  const V = scalar ? " float v = sv[e];" : "";
  b = swap(b, "      if (PSURF(j) != S || !(pd[j] < h + aa)) continue;\n      float X = pd[j]; if (h - X > D) D = h - X;\n",
    `      if (!(pd[j] < h + aa)) continue;\n      int S = PSURF(j); int e = slotOf(S); if (e < 0) continue;${V}\n      float X = pd[j]; if (h - X > sa[e]) sa[e] = h - X;\n`, 1);
  b = swap(b, "if (int(K1.z) != S || !kSec[i] || !(K0.z > 0.0)) continue;\n      float rho = krho[i]; float Dk = rho - K0.z;\n      if (kIn[i] == 2 && Dk > D) D = Dk;\n",
    `if (!kSec[i]) continue; int S = int(K1.z); int e = slotOf(S); if (e < 0) continue;${V}\n      float rho = krho[i]; float Dk = rho - K0.z;\n      if (kIn[i] == 2 && Dk > sa[e]) sa[e] = Dk;\n`, 1);
  b = swap(b, "if (int(K1.z) != S || K1.x > 0.5) continue;\n", `if (K1.x > 0.5) continue; int S = int(K1.z); int e = slotOf(S); if (e < 0) continue; float D = sa[e];${V}\n`, 1);
  b = swap(b, "if (val > v) { v = val;", scalar ? "if (val > v) { v = val; sv[e] = val;" : "if (val > sv[e]) { sv[e] = val;", 3);
  // K1407 c3: the vertex cap reads its surface's final v and D, so it runs per slot after every face
  b = swap(b, VTX_LINE, "", 1);
  src = src.slice(0, i0) + "  for (int e = 0; e < ns; e++) { sv[e] = 0.0; sa[e] = -BIG; } // K1362 s12 fj: v and D per surface slot\n" + b
    + "  for (int e = 0; e < ns; e++) if (sv[e] < 1.0 && sa[e] > -aa) { vec3 VX = vtx(sid[e], p); float vxv = VX.x * ss(-aa, aa, sa[e]); if (vxv > sv[e]) sv[e] = vxv; } // K1407 c3 fj\n"
    + "  for (int e = 0; e < ns; e++) sa[e] = ss(-aa, aa, sa[e]);\n" + src.slice(i1 + END.length);
  return swap(src, "void layers(vec2 p) {\n", "int slotOf(int id) { for (int i = 0; i < ns; i++) if (sid[i] == id) return i; return -1; }\nvoid layers(vec2 p) {\n", 1);
}

const KZ_CELL = "    vec4 CE = F(uOCell + cell);\n";
const KZ_SCAN = "    // corners near p\n    int k0 = int(CE.z); int kn = int(CE.w);\n";
const KZ_SCAN_END = "#ifdef TIER\n    if (ovf) { discard; return; } // never past the arrays: D3D runs on past a discard\n#endif\n";
/**
 * K1362 s15 `zk` (a zc P0 on corner frames): the corner-free program, with the corner scan cut to a route. A pixel
 * the tier would keep a corner for, or take a through corner at, goes to P1 (depth 0); the rest have nk 0, thruK -1
 * and yielded false in the tier, which are the free program's constants, so P0 draws them the same. The count is the
 * tier's keep test without the yield (a superset), so a pixel it puts past MAXK goes to full; P1 runs uncapped
 * surfaces (cornerPlan), since P0 cannot see the corners' surfaces.
 */
const ZK_SCAN = `    int thruK = -1; float thruQ = 0.0; bool yielded = false; // K1362 s15 zk: P0 holds no corner
    int zkN = 0; bool zkR = false;
    for (int q = int(CE.z); q < int(CE.z) + int(CE.w); q++) {
      int k = int(L4(uOKL, q)); vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1);
      float rx = x - K0.x; float ry = y - K0.y; float d2 = rx * rx + ry * ry; float rho = sqrt(d2);
      bool keep = rho > K0.z - aa - W && !(rho > K0.w + W + 2.0 * aa);
      if (K1.x > 0.5) { float lim = K1.y + W + 4.0 * aa; if (d2 <= lim * lim && inSector(k, p)) zkR = true; else keep = false; }
      if (keep) { zkR = true; zkN++; }
    }
    if (zkN > MAXK) ovf = true;
`;
const ZK_ROUTE = "    if (zkR) { gl_FragDepth = 0.0; return; } // K1362 s15 zk: a corner pixel: P1 (the corner tier) draws it\n";
function cornerRoute(src: string, form: "free" | "corner" | "zk"): string {
  const count = (what: string) => src.split(what).length - 1;
  const need = (what: string, n: number) => { if (count(what) !== n) throw new Error(`gfFs kz: expected ${n} of ${JSON.stringify(what.slice(0, 48))}, found ${count(what)}`); };
  need(KZ_CELL, 1);
  if (form === "corner") return src.replace(KZ_CELL, `${KZ_CELL}    if (int(CE.w) == 0) { discard; return; } // K1362 s12 kz: the corner-free program drew this pixel\n`);
  need(KZ_SCAN, 1); need(" int nk;", 2); need("np = 0; nk = 0; ns = 0;", 1);
  const i0 = src.indexOf(KZ_SCAN); const i1 = src.indexOf(KZ_SCAN_END, i0);
  if (i1 < 0) throw new Error("gfFs kz: the corner scan's end not found");
  if (form === "zk") {
    src = src.slice(0, i0) + ZK_SCAN + KZ_SCAN_END + ZK_ROUTE + src.slice(i1 + KZ_SCAN_END.length);
    return src.split(" int nk;").join(" const int nk = 0;").replace("np = 0; nk = 0; ns = 0;", "np = 0; ns = 0;");
  }
  src = src.slice(0, i0) +"    int thruK = -1; float thruQ = 0.0; bool yielded = false; // K1362 s12 kz: no corner in this cell\n" + src.slice(i1);
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
 * K1362 s15 `zc`: the ramp tier split in two by a depth class, so the program most pixels run compiles one
 * configuration. P0 (this form, on a tier without ramps) draws every pixel and writes the pixel's class as its depth:
 * 0.5 drawn here, 0 ramping (nr > 0: the ramp tier P1 draws it, depth-tested GEQUAL at 0), 1 overflow (every
 * discard of the tier: the full program draws it, LEQUAL at 1). Its configuration loop is the constant cfg 0 only:
 * on nr == 0 the tier runs exactly that, the same statements on the same values. A ramping pixel still runs cfg 0
 * here so that P0 sees every overflow P1 could hit: the scan is the same, and configuration cfg >= 1 merges some of
 * cfg 0's surfaces (a ramping piece joins its group), so it never needs more surface slots than cfg 0. P1 and full
 * write no depth, so their test can run before the shader (stage 4's KEEP argument); P0 runs everywhere anyway.
 */
const ZC_RAMP = "    if (nr > 0) { discard; return; } // ramping pieces: the configurations below; a later program draws the pixel\n";
const ZC_MAIN = "void main() {\n";
function zClass(src: string): string {
  const a = src.indexOf(CFG_LOOP);
  if (src.indexOf(ZC_RAMP) < 0 || a < 0 || src.indexOf(CFG_LOOP, a + 1) >= 0 || src.split(ZC_MAIN).length !== 2) {
    throw new Error("gfFs zc: the ramp discard, configuration loop or main moved");
  }
  src = src.replace(ZC_RAMP, "    if (nr > 0) gl_FragDepth = 0.0; // K1362 s15 zc: the ramp tier (P1) draws this pixel\n");
  src = src.replace(CFG_LOOP, "    for (int cfg = 0; cfg <= 0; cfg++) { // K1362 s15 zc: one configuration (nr == 0, or P1's cfg 0 overflow check)\n");
  src = src.split("discard; return;").join("gl_FragDepth = 1.0; return;");
  return src.replace(ZC_MAIN, `${ZC_MAIN}  gl_FragDepth = 0.5; // K1362 s15 zc: drawn here unless a route below says otherwise\n`);
}

/**
 * K1362 s15 `zb` (on zc's P0): no burial code. Every burial loop becomes a bound check: a face is buried only by a
 * piece m on its surface within h of the face's point q (or, for a piece face, a corner key on that surface whose ring
 * holds q), and |q - p| is known (|h - X| for a piece face, |Dk| for a corner face, dT for a tangent), so
 * |q - piece m| >= pd[m] - |q - p| (pd[m] is p's distance to m's visited segments; a segment of m's range the scan did
 * not visit is beyond the candidate reach h + W + 2aa of p, and |q - p| < W + aa wherever the face's band is above 0,
 * which the face skip before it has checked). A face whose bound clears h (plus a margin far above float error) has
 * burial exactly 0, and P0 keeps the face's band; any other face sets zbR and breaks, and main sends the pixel to P1
 * (depth 0), whose ramp tier computes the burial (main tests sOvf first, so an overflowing pixel still goes to full).
 * A flag and a break, never a return from inside layers()'s loops: that linked on ANGLE D3D11 but lost the WebGL
 * context when drawn (and it doubled the program on the PowerVR compiler, 1942 against 3863 instructions).
 */
const ZB_MARGIN = "(0.25 * uAA)";
const ZB_LOOPS: [RegExp, (m: string) => string][] = [
  [/for \(int m = 0; m < np && bur < 1\.0; m\+\+\) \{\s*if \(m == j \|\| PSURF\(m\) != S\) continue;\s*float wb2 = 1\.0 - ss\(h - 2\.0 \* aa, h, sqrt\(pieceD\(m, q\)\)\);\s*if \(wb2 > bur\) bur = wb2;\s*\}/,
    () => `for (int m = 0; m < np; m++) { if (m == j || PSURF(m) != S) continue; if (!(pd[m] - (abs(h - X) + ${ZB_MARGIN}) >= h)) { zbR = true; break; } } // K1362 s15 zb`],
  [/for \(int i = 0; i < nk && bur < 1\.0; i\+\+\) \{\s*(int k = kk\[i\]; vec4 K0 = F\(uOK \+ 6 \* k\); vec4 K1 = F\(uOK \+ 6 \* k \+ 1\); if \(int\(K1\.z\) != S\) continue;)\s*float rq = length\(q - K0\.xy\);\s*if \(rq > K0\.z && rq < K0\.w && inSector\(k, q\) && outsideArms\(k, PC\(j\), q\)\) bur = 1\.0;\s*\}/,
    (m) => `for (int i = 0; i < nk; i++) { ${/\{\s*(int k[^\n]*continue;)/.exec(m)![1]} float rp = length(p - K0.xy); float zr = abs(h - X) + ${ZB_MARGIN}; if (rp + zr > K0.z && rp - zr < K0.w) { zbR = true; break; } } // K1362 s15 zb`],
  // K1407 c1: the corner faces' loops skip the corner's own arms; P0 still routes on every piece of the surface (a
  // superset, so exact), and the other corners' fills (fillBur) are computed in P0 as in full
  [/for \(int m = 0; m < np && bur < 1\.0; m\+\+\) \{\s*if \(PSURF\(m\) != S(?: \|\| PC\(m\) == cA \|\| PC\(m\) == cB)?\) continue;\s*float wb2 = 1\.0 - ss\(h - 2\.0 \* aa, h, sqrt\(pieceD\(m, q\)\)\);\s*if \(wb2 > bur\) bur = wb2;\s*\}/,
    () => `for (int m = 0; m < np; m++) { if (PSURF(m) != S) continue; if (!(pd[m] - (abs(Dk) + ${ZB_MARGIN}) >= h)) { zbR = true; break; } } // K1362 s15 zb`],
  [/for \(int m = 0; m < np && bur < 1\.0; m\+\+\) \{\s*if \(PSURF\(m\) != S(?: \|\| PC\(m\) == cA \|\| PC\(m\) == cB)?\) continue;\s*float wb2 = 1\.0 - ss\(h - 2\.0 \* aa, h, sqrt\(pieceD\(m, T\)\)\);\s*if \(wb2 > bur\) bur = wb2;\s*\}/,
    () => `for (int m = 0; m < np; m++) { if (PSURF(m) != S) continue; if (!(pd[m] - (dT + ${ZB_MARGIN}) >= h)) { zbR = true; break; } } // K1362 s15 zb`],
];
const ZB_OVF = "if (sOvf) { gl_FragDepth = 1.0; return; }";
const ZB_FOLD = "      if (bur < 1.0) { float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(foldD(j, S, p, q))); if (wb2 > bur) bur = wb2; } // K1482 s7: a hairpin's own fold\n";
function zBur(src: string): string {
  for (const [re, f] of ZB_LOOPS) {
    const m = re.exec(src); if (!m) { if (re === ZB_LOOPS[0][0]) throw new Error("gfFs zb: the piece faces' burial loop moved"); continue; }
    src = src.replace(re, f(m[0]));
    if (re.exec(src)) throw new Error("gfFs zb: a burial loop appears twice");
  }
  // K1482 s7: the fold burial applies only where p is inside another piece m of S (pd[m] < h), and the piece loop
  // above routes every such face to P1 (pd[m] - |h - X| - margin < h), so P0 drops the line
  if (src.split(ZB_FOLD).length !== 2) throw new Error("gfFs zb: the fold burial moved");
  src = src.replace(ZB_FOLD, "");
  if (src.split(ZB_OVF).length !== 2) throw new Error("gfFs zb: the overflow route moved");
  src = src.replace(ZB_OVF, `${ZB_OVF} if (zbR) { gl_FragDepth = 0.0; return; } // K1362 s15 zb: a face P0 cannot prove unburied`);
  src = src.replace("float band2(float D)", "bool zbR; // K1362 s15 zb\nfloat band2(float D)");
  return src.replace(ZC_MAIN, `${ZC_MAIN}  zbR = false;\n`);
}
// K1362 s15 zf: P0 keeps only stage 9's layers1() (one piece, no corner, no ramp: the same statements on the same
// values as layers()) and routes every other pixel to P1 at depth 0, so P0 compiles without layers() at all. Exact
// by routing: P1 draws what P0 does not. P1's surface cap must still hold on what it gets: on a free frame np <= p
// and nk == 0, so ns <= p = s; a corner frame's P1 runs uncapped (cornerPlan).
const ZF_LAYERS = "#ifdef FAST\n      if (fast) layers1(); else\n#endif\n      layers(p);\n";
function zFast(src: string): string {
  if (src.split(ZF_LAYERS).length !== 2) throw new Error("gfFs zf: the layering call moved");
  return src.replace(ZF_LAYERS, "      if (!fast) { gl_FragDepth = 0.0; return; } // K1362 s15 zf: more than one piece: P1\n      layers1();\n");
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
  const C3A = "      vec4 C3 = F(uOK + 6 * k + 3); int cA = int(C3.x); int cB = int(C3.y); // K1407 c1: the corner's own arms never bury its faces\n";
  rep(`      vec2 q = K0.xy + (K0.z * (p - K0.xy)) / rho;\n${C3A}      float bur = 0.0;\n      ${LOOP_M}`,
    `      vec2 q = K0.xy + (K0.z * (p - K0.xy)) / rho;\n      float bx2 = band2(Dk); if (!(bx2 > v)) continue;\n${C3A}      float bur = 0.0;\n      ${LOOP_M}        ${BX_CHECK}\n`);
  if (src.includes("#ifdef TANGENT\n    for (int i = 0; i < nk; i++) {")) {
    rep(`        float dT = length(p - T); if (!(dT < W + aa)) continue;\n        float bur = 0.0;\n        ${LOOP_M}`,
      `        float dT = length(p - T); if (!(dT < W + aa)) continue;\n        float bx2 = band(dT); if (!(bx2 > v)) continue; // K1407 23A: band\n        float bur = 0.0;\n        ${LOOP_M}          ${BX_CHECK}\n`);
  }
  return src;
}

/**
 * K1362 s13 `lz`: layers()'s faces only for the surfaces composite() reads. The face loop runs in sorted order (e =
 * SORD(i), the sort is before it) and stops after the first place whose D > 2 aa: there ss(-aa, aa, D) clamps to
 * exactly 1 in any precision, so comp() multiplies Tt by exactly 0 and breaks at that place or earlier. comp(-1)
 * then reads no later place; comp(i) for i below it permutes places up to it; comp(i) above it repeats comp(-1)'s
 * reads (r2 == r). Only comp(i) AT it reads the next place, so when the next gap is not >= 2 zt (composite's tie
 * test is gap < zt) that place is computed too. Each computed surface is the same statements on the same values;
 * an uncomputed one is never read. Not with ga (the gaps are then taken from skey after the face loop writes it).
 */
function lazyFaces(src: string): string {
  const rep = (a: string, b: string): void => {
    const parts = src.split(a);
    if (parts.length !== 2) throw new Error(`gfFs lz: expected one "${a.trim().slice(0, 48)}", found ${parts.length - 1}`);
    src = parts.join(b);
  };
  rep("  for (int e = 0; e < ns; e++) {\n    int S = sid[e]; float D = -BIG; float v = 0.0; PR(int wk = 0; int wa = -1; int wb = 0;)\n",
    "  bool lzX = false; // K1362 s13 lz: the faces in sorted order, up to the first opaque place (plus the next on a near tie)\n" +
    "  for (int lzI = 0; lzI < ns; lzI++) {\n    int e = SORD(lzI);\n    int S = sid[e]; float D = -BIG; float v = 0.0; PR(int wk = 0; int wa = -1; int wb = 0;)\n");
  rep("    SVW(e, v) SAW(e, ss(-aa, aa, D)) PR(swk[e] = wk; swa[e] = wa; swb[e] = wb;)\n  }\n",
    "    SVW(e, v) SAW(e, ss(-aa, aa, D)) PR(swk[e] = wk; swa[e] = wa; swb[e] = wb;)\n" +
    "    if (lzX) break;\n" +
    "    if (D > 2.0 * aa) { if (!(lzI + 1 < ns) || skey[SORD(lzI)] - skey[SORD(lzI + 1)] >= 2.0 * uZt) break; lzX = true; }\n  }\n");
  return src;
}

/**
 * K1362 s13 `fs`: stage 8's face skip made exact. Each face's band2 is taken once into fb, right after D's update and
 * the face's own guard, and the face is skipped when !(fb > v); its value then multiplies that same fb by the burial
 * term (and, for a tangent point, by ss(-aa, aa, D)). Every factor is in [0, 1], and a rounded product of such
 * factors, in any order, fused or not (no sums), is at most each factor, so the value is at most fb <= v and could
 * not have passed `val > v` (a tie keeps v either way; a NaN fb skips, as a NaN value never passes). Unlike bx there
 * is no break inside the burial loops (bur is not final there) and no second band2 call.
 */
function faceSkip(src: string): string {
  const rep = (a: string, b: string): void => {
    const parts = src.split(a);
    if (parts.length !== 2) throw new Error(`gfFs fs: expected one "${a.trim().slice(0, 48)}", found ${parts.length - 1}`);
    src = parts.join(b);
  };
  const SKIP = " if (!(fb > v)) continue; // K1362 s13 fs\n";
  rep("      if (!(X > h - W - aa && X > 1e-12)) continue;\n", "      if (!(X > h - W - aa && X > 1e-12)) continue;\n      float fb = band2(h - X);" + SKIP);
  rep("      float val = (1.0 - bur) * band2(h - X);\n", "      float val = (1.0 - bur) * fb;\n");
  rep("      if (!(rho > 1e-12)) continue;\n      vec2 q = K0.xy", "      if (!(rho > 1e-12)) continue;\n      float fb = band2(Dk);" + SKIP + "      vec2 q = K0.xy");
  rep("      float val = (1.0 - bur) * band2(Dk);", "      float val = (1.0 - bur) * fb;"); // K1407 c1: the arc is buried again (by other arms and fills)
  if (src.includes("#ifdef TANGENT\n    for (int i = 0; i < nk; i++) {")) {
    rep("        float dT = length(p - T); if (!(dT < W + aa)) continue;\n", "        float dT = length(p - T); if (!(dT < W + aa)) continue;\n        float fb = band(dT);" + SKIP); // K1407 23A: the tangent's bound is band, not band2
    rep("        float val = (1.0 - bur) * band(dT) * ss(-aa, aa, D);", "        float val = (1.0 - bur) * fb * ss(-aa, aa, D);"); // K1407 c1: buried as the arc
  }
  return src;
}

/**
 * K1362 s14 `kp` (tier letter P): the scan's thru search and keep loop walk the cell's pruned lists (tables.ts
 * cellKPList, at texel cellK0: (nThru, nKeep), then the thru list, then the keep list) instead of its whole corner
 * list. Exact: a pruned corner fails that loop's test at every pixel of the cell (prunedCornerLists' bound), and
 * both lists keep cellKList's order, so thruK, thruQ, tj, kk and the overflow are unchanged. The yielded search (a
 * sector test without distance) still walks the whole list. A cell without corners skips the header fetch.
 */
const KP_THRU = "    for (int q = k0; q < k0 + kn; q++) {\n      int k = int(L4(uOKL, q)); vec4 K1 = F(uOK + 6 * k + 1); if (K1.x < 0.5) continue;\n";
const KP_KEEP = "#ifdef TIER\n    for (int q = k0; q < k0 + kn; q++) {\n#else\n    for (int q = k0; q < k0 + kn && nk < MAXK; q++) {\n#endif\n      int k = int(L4(uOKL, q)); nK++;\n";
const KP_UNI = "uniform int uOCh, uOV, uOPin, uOArm, uOK, uOChk, uOCell, uOChL, uOKL, uOKC, uOKB, uOKA;\n";
function cornerLists(src: string): string {
  const rep = (a: string, b: string): void => {
    const parts = src.split(a);
    if (parts.length !== 2) throw new Error(`gfFs kp: expected one "${a.trim().slice(0, 48)}", found ${parts.length - 1}`);
    src = parts.join(b);
  };
  rep(KP_UNI, KP_UNI + "uniform int uOKP; // K1362 s14 kp\n");
  rep(KP_THRU, "    int kpB = 4 * k0 + 2; int kpT = 0; int kpN = 0; // K1362 s14 kp: the cell's pruned lists\n"
    + "    if (kn > 0) { vec4 KH = F(uOKP + k0); kpT = int(KH.x); kpN = int(KH.y); }\n"
    + "    for (int q = kpB; q < kpB + kpT; q++) {\n      int k = int(L4(uOKP, q)); vec4 K1 = F(uOK + 6 * k + 1);\n");
  rep(KP_KEEP, "#ifdef TIER\n    for (int q = kpB + kpT; q < kpB + kpT + kpN; q++) {\n#else\n    for (int q = kpB + kpT; q < kpB + kpT + kpN && nk < MAXK; q++) {\n#endif\n      int k = int(L4(uOKP, q)); nK++;\n");
  return src;
}

/**
 * K1362 s14 `kt` (tier letter T): the scan keeps the passing thru corners' kJ in two scalars instead of tj[8] (an
 * array written at a dynamic index); a third passing thru corner overflows the tier, so the full program draws that
 * pixel (none of the 12 scenes has a pixel where more than two pass reach). The yielded test reads the scalars.
 */
function thruScalars(src: string): string {
  const rep = (a: string, b: string): void => {
    const parts = src.split(a);
    if (parts.length !== 2) throw new Error(`gfFs kt: expected one "${a.trim().slice(0, 48)}", found ${parts.length - 1}`);
    src = parts.join(b);
  };
  rep("bool yielded = false; int nTj = 0; int tj[8];\n", "bool yielded = false; int nTj = 0; int tjA = -1; int tjB = -1; // K1362 s14 kt\n");
  rep("if (nTj < 8) tj[nTj++] = int(K1.w); }", "if (nTj == 0) tjA = int(K1.w); else if (nTj == 1) tjB = int(K1.w); else ovf = true; nTj++; }");
  rep("bool same = false; for (int i = 0; i < nTj; i++) if (tj[i] == int(K1.w)) same = true;", "int cJ = int(K1.w); bool same = (nTj > 0 && tjA == cJ) || (nTj > 1 && tjB == cJ);");
  return src;
}

/**
 * K1362 s14 `ko` (tier letter O): a piece face's burial tests the corners before the pieces. bur is the maximum of
 * the pieces' wb2 and the corners' 1.0, each loop leaving at 1.0, so the order cannot change it; a corner that
 * buries the face skips every pieceD.
 */
const KO_PIECES = "      for (int m = 0; m < np && bur < 1.0; m++) {\n        if (m == j || PSURF(m) != S) continue;\n        float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(pieceD(m, q)));\n        if (wb2 > bur) bur = wb2;\n      }\n";
const KO_CORNERS = "      for (int i = 0; i < nk && bur < 1.0; i++) {\n        int k = kk[i]; vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S) continue;\n        float rq = length(q - K0.xy);\n        if (rq > K0.z && rq < K0.w && inSector(k, q) && outsideArms(k, PC(j), q)) bur = 1.0;\n      }\n";
function burialOrder(src: string): string {
  const parts = src.split(KO_PIECES + KO_CORNERS);
  if (parts.length !== 2) throw new Error(`gfFs ko: expected one piece-face burial, found ${parts.length - 1}`);
  return parts.join(KO_CORNERS + KO_PIECES);
}

/**
 * K1362 s14 `kg` (tier letter G): the scan keeps each kept corner's surface in kk (k + 65536 * surface; a corner
 * index over 65535 or a surface outside [0, 32767] overflows to full), so layers() tests a corner's surface before
 * any fetch, and drops the K1 fetches it made only for that test. Every other statement reads the same values.
 */
/**
 * K1362 s14 `kh` (tier letter H, after kg): the scan also packs the corner's thru bit (K1.x > 0.5) into kk as bit 15
 * (k + 32768 * thru + 65536 * surface; a corner index past 32767 overflows to full), so the tangent loop skips a thru
 * corner, or one of another surface, without fetching K1. Every other decode masks k with 32767.
 */
function cornerThru(src: string): string {
  const rep = (a: string, b: string, n?: number): void => {
    const parts = src.split(a);
    if (n !== undefined && parts.length - 1 !== n) throw new Error(`gfFs kh: expected ${n} "${a.trim().slice(0, 48)}", found ${parts.length - 1}`);
    src = parts.join(b);
  };
  rep("if (k > 65535 || ", "if (k > 32767 || ", 1);
  rep("kk[nk] = k + 65536 * int(K1.z);", "kk[nk] = k + (K1.x > 0.5 ? 32768 : 0) + 65536 * int(K1.z);", 1);
  rep("int k = kk[i] & 65535;", "int k = kk[i] & 32767;");
  rep("int k2 = kk[i2] & 65535;", "int k2 = kk[i2] & 32767;", 1); // K1407 c1: fillBur's decode
  rep("if (kS != S) continue; vec4 K1 = F(uOK + 6 * k + 1); if (K1.x > 0.5) continue;", "if (kS != S || (kk[i] & 32768) != 0) continue;", 1);
  if (src.includes("& 65535")) throw new Error("gfFs kh: a 16-bit corner decode is left");
  return src;
}
function cornerSurfaces(src: string): string {
  const rep = (a: string, b: string, n?: number): void => {
    const parts = src.split(a);
    if (n !== undefined && parts.length - 1 !== n) throw new Error(`gfFs kg: expected ${n} "${a.trim().slice(0, 48)}", found ${parts.length - 1}`);
    src = parts.join(b);
  };
  rep("kSec[nk] = sec; kk[nk] = k; krho[nk] = rho;",
    "if (k > 65535 || !(K1.z >= 0.0 && K1.z < 32767.5)) { ovf = true; break; } kSec[nk] = sec; kk[nk] = k + 65536 * int(K1.z); krho[nk] = rho;", 1);
  rep("int k = kk[i];", "int k = kk[i] & 65535; int kS = kk[i] >> 16;");
  rep("int k2 = kk[i2]; if (k2 == k) continue; vec4 L0 = F(uOK + 6 * k2); vec4 L1 = F(uOK + 6 * k2 + 1); if (int(L1.z) != S) continue;",
    "int k2 = kk[i2] & 65535; if (k2 == k || (kk[i2] >> 16) != S) continue; vec4 L0 = F(uOK + 6 * k2);", 1); // K1407 c1: fillBur
  rep("vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); vec4 K3 = F(uOK + 6 * k + 3);", "vec4 K0 = F(uOK + 6 * k); vec4 K3 = F(uOK + 6 * k + 3);", 1);
  rep("int e = entry(int(K1.z));", "int e = entry(kS);", 1);
  rep("vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S) continue;", "if (kS != S) continue; vec4 K0 = F(uOK + 6 * k);");
  rep("vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S || !kSec[i] || !(K0.z > 0.0)) continue;", "if (kS != S || !kSec[i]) continue; vec4 K0 = F(uOK + 6 * k); if (!(K0.z > 0.0)) continue;", 1); // K1407 23A: the r > 0 arc gate rides along
  rep("vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S || K1.x > 0.5) continue;", "if (kS != S) continue; vec4 K1 = F(uOK + 6 * k + 1); if (K1.x > 0.5) continue;");
  if (src.includes("int(K1.z) != S")) throw new Error("gfFs kg: a corner surface test still fetches K1");
  return src;
}

/**
 * K1362 s14 `kd` (tier letter D): the tangent faces' fs skip tests fb * cD > v, with cD = ss(-aa, aa, D) hoisted
 * before the loop (the same expression the value used), and the loop runs only when cD > 0. Exact: the value is
 * round(round((1 - bur) * fb) * cD) <= round(fb * cD) (rounding is monotone and (1 - bur) * fb <= fb), so a skipped
 * face cannot beat v; at cD = 0 every tangent value is 0 and v starts at 0. The guard is a loop BOUND
 * (nkT = cD > 0 ? nk : 0): written as `i < nk && cD > 0.0` in the loop condition, D and Dg alike were 2-29 px off
 * full on 6 of 12 scenes on the desktop (ANGLE's `&&` loop condition again, render-gpu-field.md), and the bound form
 * is 0 px on all 12. `kd: "g"` (letter Dg) keeps only the guard, the skip test and the value as fs wrote them.
 */
function tangentSkip(src: string, guardOnly: boolean): string {
  const rep = (a: string, b: string): void => {
    if (src.split(a).length !== 2) throw new Error("gfFs: kd expects exactly one " + JSON.stringify(a.slice(0, 50)));
    src = src.replace(a, () => b);
  };
  rep("#ifdef TANGENT\n    for (int i = 0; i < nk; i++) {\n", "#ifdef TANGENT\n    float cD = ss(-aa, aa, D); int nkT = cD > 0.0 ? nk : 0; // K1362 s14 kd\n    for (int i = 0; i < nkT; i++) {\n");
  if (guardOnly) return src;
  rep("float fb = band(dT); if (!(fb > v)) continue; // K1362 s13 fs", "float fb = band(dT); if (!(fb * cD > v)) continue; // K1362 s14 kd"); // K1407 23A: band
  rep("float val = (1.0 - bur) * fb * ss(-aa, aa, D);", "float val = (1.0 - bur) * fb * cD;"); // K1407 c1: buried again
  return src;
}

/**
 * K1362 s14 `km` (tier letter M): layers()'s ring-face loop and tangent-face loop become one loop over the corners
 * with one burial (one inlined pieceD fewer, K1 fetched once). Exact: a ring face's value does not read D; a tangent
 * face's value is round(a * c) with a = fb and c = ss(-aa, aa, D) in [0, 1] taken from the final D, and a
 * float product by a fixed c >= 0 is monotone, so max_t round(a_t * c) = round(max_t a_t * c): the loop keeps the
 * best a (tv) and multiplies once after D is final. A tangent face is skipped when fb <= max(v, tv): then a <= fb, so
 * it can neither raise tv nor (a * c <= a <= v) the final v. The face's identity (PR) is the probe's only, and the
 * probe never takes a tier.
 */
function cornerMerge(src: string): string {
  const svw = "    SVW(e, v) SAW(e, ss(-aa, aa, D))";
  const end = src.indexOf(svw);
  const start = src.lastIndexOf("    for (int i = 0; i < nk; i++) {\n#ifdef KLEAN\n", end);
  if (end < 0 || src.indexOf(svw, end + 1) >= 0 || start < 0) throw new Error("gfFs: km found no ring-face loop");
  const old = src.slice(start, end);
  if (old.split("// K1362 s13 fs").length !== 3 || !old.includes("#ifdef TANGENT\n") || !old.includes("float val = (1.0 - bur) * fb * ss(-aa, aa, D);")) {
    throw new Error("gfFs: km expects the fs ring and tangent loops");
  }
  const merged = `    float tv = 0.0; // K1362 s14 km: the best tangent face before its D factor
    for (int i = 0; i < nk; i++) {
      int k = kk[i]; vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S) continue;
      float rho = krho[i]; float Dk = rho - K0.z; bool ring = kSec[i];
      if (ring && kIn[i] == 2 && Dk > D) D = Dk;
      ring = ring && rho > 1e-12 && K0.z > 0.0;
#ifdef TANGENT
      bool tng = !(K1.x > 0.5); vec4 K4 = vec4(0.0); vec4 K5 = vec4(0.0);
      if (tng) { K4 = F(uOK + 6 * k + 4); K5 = F(uOK + 6 * k + 5); }
      int nf = tng ? 3 : 1;
#else
      int nf = 1;
#endif
      vec4 C3 = F(uOK + 6 * k + 3); int cA = int(C3.x); int cB = int(C3.y); // K1407 c1: the corner's own arms never bury its faces
      for (int f = 0; f < nf; f++) {
        vec2 q; float fb;
        if (f == 0) {
          if (!ring) continue;
          fb = band2(Dk); if (!(fb > v)) continue;
          q = K0.xy + (K0.z * (p - K0.xy)) / rho;
        } else {
          q = f == 2 ? K5.xy : K4.zw;
          float dT = length(p - q); if (!(dT < W + aa)) continue;
          fb = band(dT); if (!(fb > max(v, tv))) continue; // K1407 23A: band
        }
        float bur = 0.0;
        for (int m = 0; m < np && bur < 1.0; m++) {
          if (PSURF(m) != S || PC(m) == cA || PC(m) == cB) continue;
          float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(pieceD(m, q)));
          if (wb2 > bur) bur = wb2;
        }
        if (bur < 1.0) bur = max(bur, fillBur(k, q, p, S));
        float val = (1.0 - bur) * fb; // K1407 c1: both faces buried by other arms and other corners' fills
        if (f == 0) { if (val > v) v = val; } else if (val > tv) tv = val;
      }
    }
    float tvD = tv * ss(-aa, aa, D); if (tvD > v) v = tvD;
`;
  if (old.split(VTX_LINE).length !== 2) throw new Error("gfFs: km expects the vertex cap once"); // K1407 c3: kept last
  return src.slice(0, start) + merged + VTX_LINE + src.slice(end);
}

/**
 * K1362 s14 `ki` (tier letter I): the scan files a kept corner whose rho is past its ring radius (rho > K0.z, the
 * same rho krho keeps and the same texel) as kIn 3, a subset of class 2 since K0.z - aa <= K0.z in floats; every
 * class-2 test reads >= 2. layers()'s first corner loop then reads `KRI > K0.z` as kIn 3 and fetches neither K0 nor
 * (until a label changes) K3.
 */
function cornerInside(src: string): string {
  const rep = (a: string, b: string, n?: number): void => {
    const parts = src.split(a);
    if (n !== undefined ? parts.length - 1 !== n : parts.length < 2) throw new Error(`gfFs ki: expected ${n ?? "some"} "${a.trim().slice(0, 48)}", found ${parts.length - 1}`);
    src = parts.join(b);
  };
  rep("kIn[nk] = !inR ? 0 : rho > K0.z - aa ? 2 : 1;", "kIn[nk] = !inR ? 0 : rho > K0.z ? 3 : rho > K0.z - aa ? 2 : 1;", 1);
  rep("kIn[i] = !inR ? 0 : rho > K0.z - aa ? 2 : 1;", "kIn[i] = !inR ? 0 : rho > K0.z ? 3 : rho > K0.z - aa ? 2 : 1;");
  rep("if (kIn[i] != 2) continue;", "if (kIn[i] < 2) continue;", 1);
  rep("if (kIn[i] == 2 && Dk > D) D = Dk;", "if (kIn[i] >= 2 && Dk > D) D = Dk;");
  if (src.includes("vec4 K0 = F(uOK + 6 * k); vec4 K3 = F(uOK + 6 * k + 3); vec4 K4")) rep("vec4 K0 = F(uOK + 6 * k); vec4 K3 = F(uOK + 6 * k + 3); vec4 K4", "vec4 K4", 1);
  else rep("vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); vec4 K3 = F(uOK + 6 * k + 3); vec4 K4", "vec4 K1 = F(uOK + 6 * k + 1); vec4 K4", 1);
  rep("if (KRI > K0.z && (key > labK || (key == labK && e < labE))) { labK = key; labE = e; labC =",
    "if (kIn[i] == 3 && (key > labK || (key == labK && e < labE))) { labK = key; labE = e; vec4 K3 = F(uOK + 6 * k + 3); labC =", 1);
  rep("if (KRI > K0.z) { scov[e] = true; if (key > sckey[e]) { sckey[e] = key; scch[e] =",
    "if (kIn[i] == 3) { scov[e] = true; if (key > sckey[e]) { sckey[e] = key; vec4 K3 = F(uOK + 6 * k + 3); scch[e] =", 1);
  if (src.includes("KRI > K0.z") || /kIn\[\w+\] [!=]= 2/.test(src)) throw new Error("gfFs ki: a class-2 test is left");
  return src;
}


/**
 * K1456 26J: layers()'s corner faces in one loop. The arc faces and the tangent-point faces were two loops over
 * kk, each with its own piece-burial loop and fillBur call; the driver compiler inlines fillBur at every call
 * site, and the copies are most of the full look program's compile time (.claude/probes/K1456/s2/ctime.mjs on
 * master's dumped sources: 21.4 s median for the full look program, one fillBur site measured at about 5 s).
 * One loop walks the faces in the old order (every arc, fi < nk, then every tangent point in (corner, side)
 * order), so D is final before a tangent face reads it, v keeps the same running maximum with the same first
 * winner on a tie, and each face is the same statements on the same values (same guards, burial and fillBur
 * arguments, same band factors); fillBur and the burial appear once. Programs without tangent terms keep the
 * old text, as do probe programs, every tier program (the tiers own forms anchor on the two loops) and the
 * split, reg, pack and unroll forms: their sources are unchanged. Only the tier-less full program, the one
 * that gates the first composite, is rewritten.
 */
const ONE_FACE_OLD = `    for (int i = 0; i < nk; i++) {
#ifdef KLEAN
      int k = kk[i]; vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S) continue;
      float rho; bool ksJ; int kiJ; KST(i, k, rho, ksJ, kiJ) if (!ksJ || !(K0.z > 0.0)) continue; float Dk = rho - K0.z;
      if (kiJ == 2 && Dk > D) D = Dk;
#else
      int k = kk[i]; vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S || !kSec[i] || !(K0.z > 0.0)) continue;
      float rho = krho[i]; float Dk = rho - K0.z;
      if (kIn[i] == 2 && Dk > D) D = Dk;
#endif
      if (!(rho > 1e-12)) continue;
      vec2 q = K0.xy + (K0.z * (p - K0.xy)) / rho;
      vec4 C3 = F(uOK + 6 * k + 3); int cA = int(C3.x); int cB = int(C3.y); // K1407 c1: the corner's own arms never bury its faces
      float bur = 0.0;
      for (int m = 0; m < np && bur < 1.0; m++) {
        if (PSURF(m) != S || PC(m) == cA || PC(m) == cB) continue;
        float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(pieceD(m, q)));
        if (wb2 > bur) bur = wb2;
      }
      if (bur < 1.0) bur = max(bur, fillBur(k, q, p, S));
      float val = (1.0 - bur) * band2(Dk); // K1407 c1: buried by other arms' tubes and other corners' fills
      if (val > v) { v = val; PR(wk = 2; wa = k; wb = 0;) }
    }
#ifdef TANGENT
    for (int i = 0; i < nk; i++) {
      int k = kk[i]; vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S || K1.x > 0.5) continue;
      vec4 K4 = F(uOK + 6 * k + 4); vec4 K5 = F(uOK + 6 * k + 5);
      vec4 C3 = F(uOK + 6 * k + 3); int cA = int(C3.x); int cB = int(C3.y); // K1407 c1: as the arc
      for (int t = 0; t < 2; t++) {
        vec2 T = t == 1 ? K5.xy : K4.zw;
        float dT = length(p - T); if (!(dT < W + aa)) continue;
        float bur = 0.0;
        for (int m = 0; m < np && bur < 1.0; m++) {
          if (PSURF(m) != S || PC(m) == cA || PC(m) == cB) continue;
          float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(pieceD(m, T)));
          if (wb2 > bur) bur = wb2;
        }
        if (bur < 1.0) bur = max(bur, fillBur(k, T, p, S));
        float val = (1.0 - bur) * band(dT) * ss(-aa, aa, D); // K1407 c1: buried as the arc
        if (val > v) { v = val; PR(wk = 4; wa = k; wb = t;) }
      }
    }
#endif`;
const ONE_FACE_NEW = `    for (int fi = 0; fi < 3 * nk; fi++) { // K1456 26J: oneFaceLoop, the corner faces in the old order
      bool isArc = fi < nk;
      int i = isArc ? fi : (fi - nk) / 2;
      int t = isArc ? 0 : (fi - nk) - 2 * i;
      int k = kk[i]; vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S) continue;
#ifdef KLEAN
      float rho; bool ksJ; int kiJ; KST(i, k, rho, ksJ, kiJ)
      float Dk = rho - K0.z;
      if (isArc) {
        if (!ksJ || !(K0.z > 0.0)) continue;
        if (kiJ == 2 && Dk > D) D = Dk;
        if (!(rho > 1e-12)) continue;
      }
#else
      float rho = krho[i]; float Dk = rho - K0.z;
      if (isArc) {
        if (!kSec[i] || !(K0.z > 0.0)) continue;
        if (kIn[i] == 2 && Dk > D) D = Dk;
        if (!(rho > 1e-12)) continue;
      }
#endif
      vec4 K4 = F(uOK + 6 * k + 4); vec4 K5 = F(uOK + 6 * k + 5);
      vec2 T = t == 1 ? K5.xy : K4.zw;
      float dT = length(p - T);
      if (!isArc && (K1.x > 0.5 || !(dT < W + aa))) continue;
      vec2 pt = isArc ? K0.xy + (K0.z * (p - K0.xy)) / rho : T;
      vec4 C3 = F(uOK + 6 * k + 3); int cA = int(C3.x); int cB = int(C3.y); // K1407 c1: the corner's own arms never bury its faces
      float bur = 0.0;
      for (int m = 0; m < np && bur < 1.0; m++) {
        if (PSURF(m) != S || PC(m) == cA || PC(m) == cB) continue;
        float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(pieceD(m, pt)));
        if (wb2 > bur) bur = wb2;
      }
      if (bur < 1.0) bur = max(bur, fillBur(k, pt, p, S));
      float val = isArc ? (1.0 - bur) * band2(Dk) : (1.0 - bur) * band(dT) * ss(-aa, aa, D); // K1407 c1: buried as the arc
      if (val > v) { v = val; PR(wk = isArc ? 2 : 4; wa = k; wb = isArc ? 0 : t;) }
    }`;
function oneFaceLoop(src: string): string {
  const parts = src.split(ONE_FACE_OLD);
  if (parts.length !== 2) return src; // no tangent terms (a gated rewrite is excluded in gfFs, not here)
  return parts.join(ONE_FACE_NEW);
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
${tier && (tier.fast || tier.zf) && !probe ? "#define FAST 1" : ""}
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

// K1482 s2: an open chain's end cap (the foot clamped to the chain's tip) sinks one pass (amp = 10 zt) when the piece
// belongs to a junction group: a fused tail's cap yields to the thread it meets (eval.ts tipSink mirrors it). K1482 s3:
// the sink tapers to 0 over the last h/2 of arc length, so the key has no step at the tip's perpendicular
float tipSink(int c, float s) {
  vec4 C0 = F(uOCh + 3 * c); if (C0.z > 0.5) return 0.0;
  int v0 = int(C0.x); float e = min(s - F(uOV + v0).z, F(uOV + v0 + int(C0.y) - 1).z - s);
  return 10.0 * uZt * (1.0 - smoothstep(0.0, 0.5 * uH, e));
}
int mg; float mramp;
void member(int c, float s, vec4 KB) {
  vec4 C0 = F(uOCh + 3 * c);
  int a0 = int(KB.z); int an = int(KB.w); float lam = uH; bool closed = C0.z > 0.5; float len = C0.w;
  int g = -1; float ramp = 0.0; float sRa = 0.0;
  for (int i = a0; i < a0 + an; i++) {
    vec4 A = F(KAB + 2 * i);
    float d = (s - A.x) * A.y; if (closed) d = mod(d, len);
    if (d < -1e-12 || d > A.z + 1e-12) continue;
    float Lc = A.w;
    float rp = Lc >= BIGT ? 1.0 : ss(Lc, Lc - lam, d);
    if (g < 0 || rp > ramp) { g = int(F(KAB + 2 * i + 1).x); ramp = rp; sRa = A.x; }
  }
  if (g >= 0 && ramp > 0.0) {
    for (int i = a0; i < a0 + an; i++) {
      vec4 A = F(KAB + 2 * i); float Lc = A.w;
      // K1407 c5: not the arms rooted where loop 1's arm is (eval.ts member's comment)
      if (int(F(KAB + 2 * i + 1).x) != g || Lc >= BIGT || abs(A.x - sRa) < 1e-4) continue;
      float d = (s - A.x) * A.y; if (closed) { d = mod(d, len); if (d > len / 2.0) d -= len; }
      if (!(d < 1e-12 && d > Lc - lam)) continue;
      ramp = min(ramp, ss(Lc, Lc - lam, d));
    }
  }
  mg = g; mramp = g < 0 ? 1.0 : ramp;
}

float hat(float z, float d, float w) { return w <= 1e-12 ? (d <= 0.0 ? z : 0.0) : d >= w ? 0.0 : z * (1.0 - d / w); }
// K1451: depth() returns the KEY depth (each pin's hat over its own window on the facing side, PIN .z left / .w
// right, cut at the pin gap) and leaves today's diagram depth (both hats over min(win, the gap)) in mz, which
// home membership reads (homeForm)
float mz;
float depth(int c, float s, vec4 KB) {
  vec4 C0 = F(uOCh + 3 * c); vec4 C1 = F(uOCh + 3 * c + 1);
  int n = int(C1.z); mz = 0.0; if (n == 0) return 0.0;
  int b = uOPin + int(C1.y); float win = uWin; bool closed = C0.z > 0.5; float len = C0.w;
  float u = s;
  if (closed) { u = mod(s - C1.x, len); u += C1.x; }
  int lo = int(KB.x); int hi = int(KB.y);
  while (hi - lo > 1) { int m = (lo + hi) >> 1; if (F(b + m).x <= u) lo = m; else hi = m; }
  float zL = 0.0; float dL = 0.0; float zR = 0.0; float dR = 0.0; float w = win; float wL = win; float wR = win;
  if (closed) {
    int iL = lo < 0 ? n - 1 : lo; vec4 PL = F(b + iL); float sL = lo < 0 ? PL.x - len : PL.x;
    int iR = lo + 1 >= n ? 0 : lo + 1; vec4 PR = F(b + iR); float sR = lo + 1 >= n ? PR.x + len : PR.x;
    float g = sR - sL; w = min(win, g); wL = min(PL.w, g); wR = min(PR.z, g); zL = PL.y; dL = u - sL; zR = PR.y; dR = sR - u;
  } else if (lo < 0) { vec4 P = F(b); zR = P.y; dR = P.x - u; dL = BIG; wR = P.z; }
  else if (lo + 1 >= n) { vec4 P = F(b + n - 1); zL = P.y; dL = u - P.x; dR = BIG; wL = P.w; }
  else { vec4 PL = F(b + lo); vec4 PR = F(b + lo + 1); float g = PR.x - PL.x; w = min(win, g); wL = min(PL.w, g); wR = min(PR.z, g); zL = PL.y; dL = u - PL.x; zR = PR.y; dR = PR.x - u; }
  mz = hat(zL, dL, w) + hat(zR, dR, w);
  return hat(zL, dL, wL) + hat(zR, dR, wR);
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
// K1482 s7: a hairpin's own fold (eval.ts foldD, statement for statement): piece j buries its side face's point q
// by its own segments turned more than 120 degrees from p's nearest one, only where p lies inside another piece of
// surface S (a junction); BIG otherwise
float foldD(int j, int S, vec2 p, vec2 q) {
#ifdef PLH
  int qlo = PLO(j); int qhi = PHI(j);
#else
  int qlo = plo[j]; int qhi = phi[j];
#endif
  if (!(qhi - qlo > 1)) return BIG;
  bool inOther = false;
  for (int m = 0; m < np; m++) if (m != j && PSURF(m) == S && pd[m] < uH) { inOther = true; break; }
  if (!inOther) return BIG;
  int c = PC(j); vec4 C0 = F(uOCh + 3 * c); int v0 = int(C0.x); int nseg = int(C0.y) - 1; bool closed = C0.z > 0.5;
  vec2 t = vec2(0.0); float dp = BIG;
  for (int r = qlo; r <= qhi; r++) {
    int k = r; if (closed) k = pmod(k, nseg); else if (k < 0 || k >= nseg) continue;
    vec4 A = F(uOV + v0 + k); vec4 B = F(uOV + v0 + k + 1);
    vec2 a = A.xy; vec2 dd = B.xy - a;
    float l2 = dot(dd, dd); float u = l2 > 0.0 ? clamp(dot(p - a, dd) / l2, 0.0, 1.0) : 0.0;
    vec2 e = p - a - dd * u; float e2 = dot(e, e);
    if (e2 < dp) { dp = e2; t = dd; }
  }
  float tl = length(t); float d2 = BIG;
  for (int r = qlo; r <= qhi; r++) {
    int k = r; if (closed) k = pmod(k, nseg); else if (k < 0 || k >= nseg) continue;
    vec4 A = F(uOV + v0 + k); vec4 B = F(uOV + v0 + k + 1);
    vec2 a = A.xy; vec2 dd = B.xy - a;
    float l2 = dot(dd, dd); if (!(dot(dd, t) < -0.5 * sqrt(l2) * tl)) continue;
    float u = l2 > 0.0 ? clamp(dot(q - a, dd) / l2, 0.0, 1.0) : 0.0;
    vec2 e = q - a - dd * u; float e2 = dot(e, e);
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
  sec = inSector(k, p); bool inR = rho <= K0.w && sec && K0.z > 0.0;
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
  sec = rho >= 0.0; bool inR = rho <= K0.w && sec && K0.z > 0.0;
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
  int cA = int(K3.x); int cB = int(K3.y);
  // K1456 26J: one pass over the pieces in place of one per arm: the same set is tested (both arms' chains, the
  // own chain left out either way; a chain twice in K3 is tested once where the two passes tested it twice), so
  // the same pieces reach pieceD and the result is the same.
  for (int m = 0; m < np; m++) { int c = PC(m); if ((c == cA || c == cB) && c != own && pieceD(m, p) < lim2) return false; }
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
float band(float D) { return 1.0 - ss(uW - uAA, uW + uAA, D); } // K1407 23A: form B's band
float band2(float D) { return (1.0 - ss(uW - uAA, uW + uAA, D)) * ss(-uAA, uAA, D); }
// K1407 c2: a corner face (arc or tangent point q of corner k, seen from the pixel p) against the other corners'
// fills of its surface. q is tested a step aa toward k's own ball; when a fill k2 covers it, the paper next to k's
// circle there is the lens of the two balls, which ends where the circles cross: the face keeps only band(|p - X|),
// X the crossing nearest q, and nothing when the circles do not cross or X lies inside a tube of the surface.
// K1407 c4: the burial is 1 - band(|p - X|) / band(|p - q|), and it starts where q itself leaves k2's ball when
// the circles cross, so at the switch q = X and the face keeps its unburied value (no seam notch).
// eval.ts's fillBur, line for line.
float fillBur(int k, vec2 q, vec2 p, int S) {
  vec4 Q0 = F(uOK + 6 * k); float inF = Q0.z > 0.0 ? min(uAA, 0.5 * Q0.z) / Q0.z : 0.0; vec2 iq = q + (Q0.xy - q) * inF;
  float bq = band(length(p - q));
  float lim = uH - 2.0 * uAA; float lim2 = lim * lim;
  float fbur = 0.0;
  for (int i2 = 0; i2 < nk; i2++) {
    int k2 = kk[i2]; if (k2 == k) continue; vec4 L0 = F(uOK + 6 * k2); vec4 L1 = F(uOK + 6 * k2 + 1); if (int(L1.z) != S) continue;
    float rq = length(iq - L0.xy); float rqq = length(q - L0.xy);
    if (!((rq > L0.z || rqq > L0.z) && rq < L0.w && inSector(k2, iq) && outsideArms(k2, -1, iq))) continue;
    float b = rq > L0.z ? 1.0 : 0.0;
    vec2 dv = L0.xy - Q0.xy; float d2 = dot(dv, dv); float d = sqrt(d2);
    if (d > 1e-9) {
      float a = (Q0.z * Q0.z - L0.z * L0.z + d2) / (2.0 * d); float hh2 = Q0.z * Q0.z - a * a;
      if (hh2 >= 0.0) {
        vec2 u = dv / d; vec2 bc = Q0.xy + a * u; float hh = sqrt(hh2);
        float sg = (q.x - bc.x) * -u.y + (q.y - bc.y) * u.x >= 0.0 ? hh : -hh;
        vec2 xc = vec2(bc.x - u.y * sg, bc.y + u.x * sg);
        bool inTube = false;
        for (int m = 0; m < np; m++) { if (PSURF(m) == S && pieceD(m, xc) < lim2) { inTube = true; break; } }
        if (!inTube) { float bX = band(length(p - xc)); b = bq > bX ? 1.0 - bX / bq : 0.0; }
      }
    }
    if (b > fbur) fbur = b;
    if (fbur >= 1.0) break;
  }
  return fbur;
}
// K1407 c3: pieceD, and the nearest point in g. eval.ts's pieceF, line for line.
float pieceF(int j, vec2 p, out vec2 g) {
  int c = PC(j); vec4 C0 = F(uOCh + 3 * c); int v0 = int(C0.x); int nseg = int(C0.y) - 1; bool closed = C0.z > 0.5;
  float d2 = BIG; g = p;
#ifdef PLH
  int glo = PLO(j); int ghi = PHI(j);
#else
  int glo = plo[j]; int ghi = phi[j];
#endif
  for (int q = glo; q <= ghi; q++) {
    int k = q; if (closed) k = pmod(k, nseg); else if (k < 0 || k >= nseg) continue;
    vec4 A = F(uOV + v0 + k); vec4 B = F(uOV + v0 + k + 1);
    vec2 a = A.xy; vec2 dd = B.xy - a;
    float l2 = dot(dd, dd); float u = l2 > 0.0 ? clamp(dot(p - a, dd) / l2, 0.0, 1.0) : 0.0;
    vec2 e = p - a - dd * u; float e2 = dot(e, e);
    if (e2 < d2) { d2 = e2; g = a + dd * u; }
  }
  return d2;
}
#ifdef PKQ
#define VFOOT(j) footQ(j, p.x, p.y)
#else
#define VFOOT(j) vec2(pfx[j], pfy[j])
#endif
// K1407 c3: the vertex cap, eval.ts's vtx line for line (its comment is the why): where two of surface S's member
// tubes cross, both side bands stop at their burial lines and the outline broke at two straight cuts; V, the
// outlines' crossing, is a point of the outline, so band(|p - V|) bounds the band from above. Returns (the term,
// its two chains).
vec3 vtx(int S, vec2 p) {
  float vh = uH; float va = uAA; float vW = uW;
  float best = 0.0; float bA = -1.0; float bB = -1.0;
  for (int j = 0; j < np; j++) {
    float Xj = pd[j]; if (PSURF(j) != S || !(Xj < vh + vW + va && Xj > 1e-12)) continue;
    vec2 nj = (p - VFOOT(j)) / Xj; float cj = vh - Xj;
    for (int m = j + 1; m < np; m++) {
      float Xm = pd[m]; if (PSURF(m) != S || !(Xm < vh + vW + va && Xm > 1e-12)) continue;
      vec2 nm = (p - VFOOT(m)) / Xm; float cm = vh - Xm;
      float det = nj.x * nm.y - nj.y * nm.x; if (!(abs(det) > 1e-6)) continue;
      vec2 r0 = vec2(cj * nm.y - cm * nj.y, nj.x * cm - nm.x * cj) / det;
      if (!(dot(r0, r0) < 4.0 * (vW + va) * (vW + va))) continue;
      vec2 V0 = p + r0;
      vec2 gj; float ej = pieceF(j, V0, gj); vec2 gm; float em = pieceF(m, V0, gm);
      if (!(ej > 1e-24 && em > 1e-24)) continue;
      vec2 uj = (V0 - gj) / sqrt(ej); float kj = vh + dot(uj, gj - p);
      vec2 um = (V0 - gm) / sqrt(em); float km = vh + dot(um, gm - p);
      float det2 = uj.x * um.y - uj.y * um.x; if (!(abs(det2) > 1e-6)) continue;
      vec2 V = p + vec2(kj * um.y - km * uj.y, uj.x * km - um.x * kj) / det2;
      float dV = length(p - V); if (!(dV < vW + va)) continue;
      float fV = 1.0 - ss(vW - va, vW + va, dV); if (!(fV > best)) continue;
      if (!(abs(sqrt(pieceD(j, V)) - vh) < va && abs(sqrt(pieceD(m, V)) - vh) < va)) continue;
      float vb = 0.0;
      for (int n2 = 0; n2 < np; n2++) {
        if (n2 == j || n2 == m || PSURF(n2) != S) continue;
        float b2 = 1.0 - ss(vh - 2.0 * va, vh, sqrt(pieceD(n2, V)));
        if (b2 > vb) vb = b2;
        if (vb >= 1.0) break;
      }
      for (int i3 = 0; i3 < nk; i3++) {
        if (vb >= 1.0) break;
        int k3 = kk[i3]; vec4 G0 = F(uOK + 6 * k3); vec4 G1 = F(uOK + 6 * k3 + 1); if (int(G1.z) != S) continue;
        float rV = length(V - G0.xy);
        if (rV > G0.z && rV < G0.w && inSector(k3, V) && outsideArms(k3, -1, V)) vb = 1.0;
      }
      float val = (1.0 - vb) * fV;
      if (val > best) { best = val; bA = float(PC(j)); bB = float(PC(m)); }
    }
  }
  return vec3(best, bA, bB);
}

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
      if (bur < 1.0) { float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(foldD(j, S, p, q))); if (wb2 > bur) bur = wb2; } // K1482 s7: a hairpin's own fold
      float val = (1.0 - bur) * band2(h - X);
      if (val > v) { v = val; PR(wk = pend[j] ? 3 : 1; wa = PC(j); wb = ptx[j] * (p.y - pfy[j]) - pty[j] * (p.x - pfx[j]) >= 0.0 ? 1 : -1;) }
    }
    for (int i = 0; i < nk; i++) {
#ifdef KLEAN
      int k = kk[i]; vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S) continue;
      float rho; bool ksJ; int kiJ; KST(i, k, rho, ksJ, kiJ) if (!ksJ || !(K0.z > 0.0)) continue; float Dk = rho - K0.z;
      if (kiJ == 2 && Dk > D) D = Dk;
#else
      int k = kk[i]; vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S || !kSec[i] || !(K0.z > 0.0)) continue;
      float rho = krho[i]; float Dk = rho - K0.z;
      if (kIn[i] == 2 && Dk > D) D = Dk;
#endif
      if (!(rho > 1e-12)) continue;
      vec2 q = K0.xy + (K0.z * (p - K0.xy)) / rho;
      vec4 C3 = F(uOK + 6 * k + 3); int cA = int(C3.x); int cB = int(C3.y); // K1407 c1: the corner's own arms never bury its faces
      float bur = 0.0;
      for (int m = 0; m < np && bur < 1.0; m++) {
        if (PSURF(m) != S || PC(m) == cA || PC(m) == cB) continue;
        float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(pieceD(m, q)));
        if (wb2 > bur) bur = wb2;
      }
      if (bur < 1.0) bur = max(bur, fillBur(k, q, p, S));
      float val = (1.0 - bur) * band2(Dk); // K1407 c1: buried by other arms' tubes and other corners' fills
      if (val > v) { v = val; PR(wk = 2; wa = k; wb = 0;) }
    }
#ifdef TANGENT
    for (int i = 0; i < nk; i++) {
      int k = kk[i]; vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S || K1.x > 0.5) continue;
      vec4 K4 = F(uOK + 6 * k + 4); vec4 K5 = F(uOK + 6 * k + 5);
      vec4 C3 = F(uOK + 6 * k + 3); int cA = int(C3.x); int cB = int(C3.y); // K1407 c1: as the arc
      for (int t = 0; t < 2; t++) {
        vec2 T = t == 1 ? K5.xy : K4.zw;
        float dT = length(p - T); if (!(dT < W + aa)) continue;
        float bur = 0.0;
        for (int m = 0; m < np && bur < 1.0; m++) {
          if (PSURF(m) != S || PC(m) == cA || PC(m) == cB) continue;
          float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(pieceD(m, T)));
          if (wb2 > bur) bur = wb2;
        }
        if (bur < 1.0) bur = max(bur, fillBur(k, T, p, S));
        float val = (1.0 - bur) * band(dT) * ss(-aa, aa, D); // K1407 c1: buried as the arc
        if (val > v) { v = val; PR(wk = 4; wa = k; wb = t;) }
      }
    }
#endif
    if (v < 1.0 && D > -aa) { vec3 VX = vtx(S, p); float vxv = VX.x * ss(-aa, aa, D); if (vxv > v) { v = vxv; PR(wk = 6; wa = int(VX.y); wb = int(VX.z);) } } // K1407 c3: the vertex cap
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
      member(PC(j), ps[j], KB); pg[j] = mg; pramp[j] = mramp; if (mg >= 0) pkey[j] -= tipSink(PC(j), ps[j]);
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
      bool sec = inSector(k, p); bool inR = rho <= K0.w && sec && K0.z > 0.0;
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
      pkey[j] = pz - pd[j] * zK; if (mg >= 0) pkey[j] -= tipSink(PC(j), sj);
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
      member(PC(j), ps[j], KB); pg[j] = mg; pramp[j] = mramp; if (mg >= 0) pkey[j] -= tipSink(PC(j), ps[j]);
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
      bool sec = inSector(k, p); bool inR = rho <= K0.w && sec && K0.z > 0.0;
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
