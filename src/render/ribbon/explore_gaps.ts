// THE THREAD REVEAL'S GAPS (K5 R2): the reveal's declaration (setExplore,
// setExploreContrast); the gap gate, which makes a crossing's gap as strong
// as its over thread is visible and shapes the cut where a piece ends
// (applyExploreGaps, exploreCutAt); the joint gate, which hides the
// junctions and free tips of unvisited thread (syncExploreJoints,
// exploreJointShown, exploreGateVisAt, exploreJointsKey); a pluck's shown
// and solid stretches (exploreShownSpan, exploreSolidSpan); and the two
// probe views (exploreGapState, exploreJointState). Moved verbatim from
// ribbon_renderer.ts (fb5cd8a lines below). A body changed in three ways
// only: a renderer member became `this.r.x`, the arc helper
// `sampling.arcAt(...)`, and the calls to applyExploreGaps, exploreCutAt,
// exploreJointShown and exploreGateVisAt go through the renderer, so a
// probe's patch of one still sees every call. Outside the bodies,
// `private` left every method the renderer calls (seven) and
// exploreContrast, which its accessor reads; EXPLORE_JOINT_MIN, which
// rebuildFillets reads, is exported.
// RibbonRenderer owns one ExploreGaps (its `explore`): rebuildFillets
// calls exploreJointsKey here and pluck() exploreSolidSpan; the other
// methods the class, the fabric or the probes call keep one-line
// delegations there, and exploreContrast is an accessor there. The joint
// gate's hidden sets (exploreHideJn, exploreHideFree) stay on the
// renderer, where rebuildFillets reads them (docs/design/K5_K6_split.md
// 2.3; render-ribbon.md, THE PARTS).
//
//   samePieces, sameBurn,          491-539    whether a declaration changed
//     sameSpans
//   EXPLORE_JOINT_MIN              544-553    the joint floor (EXPLORE_MARKER_VIS,
//                                             the marker gate's rule, moved to
//                                             game/explore_finish.ts, K465)
//   exploreGateByChain             3646       the burn gate's pieces per chain
//   exploreRev                     3653-3654  the declaration's revision
//   exploreContrast                3655-3658  High contrast
//   exploreGapCounts               3837-3848  the last gap gate's counts
//   exploreJointRev                4132-4144  THE JOINT GATE, its revision
//   exploreJointKey                4147       the hidden joints' key
//   setExploreContrast             3660-3667  High contrast's setter
//   setExplore                     3669-3756  declare the visible pieces
//   applyExploreGaps               3758-3811  THE GAP GATE
//   exploreCutAt                   3813-3835  a slot's cut by visibility
//   exploreGapState                3849-3870  the gap gate's probe view
//   syncExploreJoints              4148-4177  the hidden junctions and tips
//   exploreJointsKey               4179-4183  the fillet key's joint part
//   exploreJointShown              4185-4203  whether a junction draws
//   exploreGateVisAt               4205-4218  the reveal's own visibility
//   exploreJointState              4220-4230  the joint gate's probe view
//   exploreShownSpan               4259-4301  a pluck's shown stretch
//   exploreSolidSpan               4303-4352  a pluck's solid stretch

import { knotUniformValues } from "../paint_model";
import { junctionShader, junctionShaderExplore } from "../junction_field";
import { chainWhole, classifyExploreCut, exploreArcMap } from "../explore_glsl";
import type { ExploreCut } from "../explore_glsl";
import { markerGapHeld } from "../../game/explore_finish";
import { pieceVis } from "../../game/explore_view";
import type {
  BurntSpan,
  ExploreBurn,
  ExplorePiece,
} from "../../game/explore_view";
import { setStripExplore } from "../arm_strip";
import { GAP_UPLOAD_STATS } from "../gap_mask";
import { sectionShader, sectionShaderExplore } from "./ribbon_shader";
import * as sampling from "./sampling";
import { MARKER_SLOTS } from "./crossing_gaps";
import type { RibbonRenderer } from "../ribbon_renderer";

function samePieces(a: readonly ExplorePiece[], b: readonly ExplorePiece[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const p = a[i];
    const q = b[i];
    if (
      p.chain !== q.chain ||
      p.c0 !== q.c0 ||
      p.c1 !== q.c1 ||
      p.f0 !== q.f0 ||
      p.f1 !== q.f1 ||
      p.tip0 !== q.tip0 ||
      p.tip1 !== q.tip1
    ) {
      return false;
    }
  }
  return true;
}

// K290: whether two burn declarations are the same (null = no burn).
function sameBurn(a: ExploreBurn | null, b: ExploreBurn | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const g = a.gate === b.gate || (!!a.gate && !!b.gate && samePieces(a.gate, b.gate));
  if (!g) return false;
  if (!sameSpans(a.char, b.char) || !sameSpans(a.smolder ?? null, b.smolder ?? null)) return false;
  const f = a.fronts ?? null;
  const h = b.fronts ?? null;
  if (f === h) return true;
  if (!f || !h || f.length !== h.length) return false;
  for (let i = 0; i < f.length; i++) {
    const p = f[i];
    const q = h[i];
    if (p.chain !== q.chain || p.c !== q.c || p.dir !== q.dir || p.kind !== q.kind) return false;
  }
  return true;
}

function sameSpans(a: BurntSpan[] | null, b: BurntSpan[] | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const p = a[i];
    const q = b[i];
    if (p.chain !== q.chain || p.b0 !== q.b0 || p.b1 !== q.b1) return false;
  }
  return true;
}

// K1082 (K441 s2 sketch a/b): the chains a redeclaration actually has to
// rewrite - a chain whose pieces changed, or whose burn (gate, char,
// fronts, smolder) changed. Everything else keeps its declared slots.
export function groupPiecesByChain(
  pieces: readonly ExplorePiece[]
): Map<number, ExplorePiece[]> {
  const out = new Map<number, ExplorePiece[]>();
  for (const p of pieces) {
    let l = out.get(p.chain);
    if (!l) out.set(p.chain, (l = []));
    l.push(p);
  }
  return out;
}

function spansTouched(
  out: Set<number>,
  a: readonly BurntSpan[] | null | undefined,
  b: readonly BurntSpan[] | null | undefined
): void {
  const ga = new Map<number, BurntSpan[]>();
  for (const s of a ?? []) {
    let l = ga.get(s.chain);
    if (!l) ga.set(s.chain, (l = []));
    l.push(s);
  }
  const gb = new Map<number, BurntSpan[]>();
  for (const s of b ?? []) {
    let l = gb.get(s.chain);
    if (!l) gb.set(s.chain, (l = []));
    l.push(s);
  }
  for (const c of new Set([...ga.keys(), ...gb.keys()])) {
    if (!sameSpans(ga.get(c) ?? null, gb.get(c) ?? null)) out.add(c);
  }
}

export function exploreTouchedChains(
  prevByChain: ReadonlyMap<number, ExplorePiece[]>,
  pieces: readonly ExplorePiece[],
  prevBurn: ExploreBurn | null,
  burn: ExploreBurn | null
): Set<number> {
  const out = new Set<number>();
  const next = groupPiecesByChain(pieces);
  for (const c of new Set([...prevByChain.keys(), ...next.keys()])) {
    if (!samePieces(prevByChain.get(c) ?? [], next.get(c) ?? [])) out.add(c);
  }
  spansTouched(out, prevBurn?.char, burn?.char);
  spansTouched(out, prevBurn?.smolder, burn?.smolder);
  const fa = prevBurn?.fronts ?? null;
  const fb = burn?.fronts ?? null;
  if (fa !== fb) {
    const ga = new Map<number, { c: number; dir: number; kind: number }[]>();
    for (const f of fa ?? []) {
      let l = ga.get(f.chain);
      if (!l) ga.set(f.chain, (l = []));
      l.push(f);
    }
    const gb = new Map<number, { c: number; dir: number; kind: number }[]>();
    for (const f of fb ?? []) {
      let l = gb.get(f.chain);
      if (!l) gb.set(f.chain, (l = []));
      l.push(f);
    }
    for (const c of new Set([...ga.keys(), ...gb.keys()])) {
      const x = ga.get(c) ?? [];
      const y = gb.get(c) ?? [];
      let diff = x.length !== y.length;
      for (let i = 0; !diff && i < x.length; i++) {
        diff = x[i].c !== y[i].c || x[i].dir !== y[i].dir || x[i].kind !== y[i].kind;
      }
      if (diff) out.add(c);
    }
  }
  const gateA = prevBurn?.gate ?? null;
  const gateB = burn?.gate ?? null;
  if (gateA !== gateB) {
    const ga = gateA ? groupPiecesByChain(gateA) : new Map<number, ExplorePiece[]>();
    const gb = gateB ? groupPiecesByChain(gateB) : new Map<number, ExplorePiece[]>();
    for (const c of new Set([...ga.keys(), ...gb.keys()])) {
      if (!samePieces(ga.get(c) ?? [], gb.get(c) ?? [])) out.add(c);
    }
  }
  return out;
}

// K268 stage 2 (K275), the joint gate: a junction's web and fans emit no
// record once an arm's visibility at its slot is at most this, nor a free
// tip's cap once its thread's is at the tip (exploreJointShown). Above it
// they draw, faded with their threads by the arm strips' premultiplied
// alpha (arm_strip.ts withExploreStrip, junction_field.ts withExploreField).
export const EXPLORE_JOINT_MIN = 0.002;

// K430 (K268 stage 2 item 2, the ramp Levi picked): an under window's
// extents scale with its over pass's visibility - the same scalar the gap
// strength rides - so as the over thread fades in (vis 0 -> 1) the gap
// fades in and the under thread's junction web retracts smoothly with it.
// This replaces 2b's binary step at vis 0.5 (the window existed whole or
// not at all). At vis 1 the window is mode off's exactly; at 0, absent.
export function uwRampScale(vis: number): number {
  return vis <= 0 ? 0 : vis >= 1 ? 1 : vis;
}

// One ramped window triplet ([center, cutNeg, cutPos] scaled by `scale`)
// appended to a chain's flat window list; scale 0 appends nothing.
// K268 PROTECT (stage 2 item 2, the protect part): the waiver A keeps
// where it covers B scales by B's visibility at B's pass (a per-slot
// factor the CPU writes, GapMaskTable.setProtVis) - the same clamp as
// the ramp: no waiver where B is hidden, the full waiver where B shows,
// and no step at the old binary 0.5 (the pluck footprints keep theirs).
export function protVisScale(vis: number): number {
  return vis <= 0 ? 0 : vis >= 1 ? 1 : vis;
}

export function pushRampedWindow(
  out: number[],
  center: number,
  cutNeg: number,
  cutPos: number,
  scale: number
): void {
  if (scale > 0) out.push(center, cutNeg * scale, cutPos * scale);
}

export class ExploreGaps {
  readonly r: RibbonRenderer;
  private exploreGateByChain: Map<number, ExplorePiece[]> | null = null;
  // Bumped by every declaration change; the joint gate follows it.
  private exploreRev = 0;
  // K76 stage 2d (question 9): High contrast. uKExplore.x is 2 instead of 1
  // while the mode is on, and the dots look draws its dots at full strength
  // in pure white (kExploreLook, kExDot).
  /** @internal ribbon */ exploreContrast = false;
  // K268: what the last gap gate made of the live crossing slots (counts by
  // kind; mismatch = a hidden slot with vis != 0 or a solid one with vis !=
  // 1 at the over pass, which should not happen) and the slot table's
  // upload totals (probes).
  private readonly exploreGapCounts = {
    hidden: 0,
    solid: 0,
    shaped: 0,
    fallback: 0,
    approx: 0,
    mismatch: 0,
  };
  // K76 2b, THE JOINT GATE (K76_reveal_mode.md 2.4): which joints the
  // thread reveal hides - junction webs and fans (by junctionArms index),
  // free-tip caps (by freeTips index) - recomputed when the declaration
  // changes, and the key rebuildFillets adds to its own (the fans rebuild
  // when the hidden SET changes, not on growth frames). Since K268 stage 2
  // (K275) the gate is no longer binary: a junction hides once any arm's
  // visibility at its slot is at most EXPLORE_JOINT_MIN, a free tip's cap
  // once its thread's is at the tip, and whatever draws fades with its
  // threads through the arm strips' premultiplied alpha. In the model's
  // states the hidden set is 2b's: a visited junction's arms are solid
  // through its web domain (at least 2.3 half-widths, at most half the
  // run), and a stub fades out INTO an unvisited one (vis 0 at its slot).
  private exploreJointRev = -1;
  private exploreJointKey = "";
  // K1082: probe counters for the incremental declare (calls, chains
  // actually rewritten, crossing slots the gap gate visited).
  readonly declareStats = { calls: 0, chains: 0, gapIter: 0 };
  // K1082: the stale-check hook's full redeclare (fabric probeBurnRedeclare).
  forceFullExplore = false;
  private charredCache: Uint8Array | null = null;
  // K1082: the last gap kind per slot (0 none, 1 hidden, 2 solid,
  // 3 shaped, 4 fallback), so an incremental gate keeps the counts.
  private gapKind = new Int8Array(0);
  private gapKindApprox = new Uint8Array(0);

  constructor(r: RibbonRenderer) {
    this.r = r;
  }

  // High contrast for the reveal's end look (the fabric forwards a11y's
  // setting each tick). Takes effect at the next draw: uKExplore is a
  // uniform, no update() needed.
  setExploreContrast(on: boolean): void {
    this.exploreContrast = on;
    const E = knotUniformValues().uKExplore!;
    if (E[0] > 0.5) E[0] = on ? 2 : 1;
  }

  // K1082: a redeclaration whose pieces and burn changed on `touched`
  // chains only (a burning frame's fronts and charred spans): rewrite
  // those chains' declaration, mesh state, paint items and gap slots;
  // every other chain keeps what the last declare wrote.
  private setExploreTouched(
    pieces: ExplorePiece[],
    burn: ExploreBurn | null,
    touched: Set<number>
  ): void {
    const r = this.r;
    r.explorePieces = pieces;
    r.exploreBurn = burn;
    const grouped = groupPiecesByChain(pieces);
    for (const c of touched) {
      const l = grouped.get(c);
      if (l) r.exploreByChain.set(c, l);
      else r.exploreByChain.delete(c);
    }
    if (burn?.gate) {
      const g = this.exploreGateByChain ?? new Map<number, ExplorePiece[]>();
      const gg = groupPiecesByChain(burn.gate);
      for (const c of touched) {
        const l = gg.get(c);
        if (l) g.set(c, l);
        else g.delete(c);
      }
      this.exploreGateByChain = g;
    } else {
      this.exploreGateByChain = null;
    }
    const n = r.ps.chains.length;
    let flagsChanged = false;
    for (const c of touched) {
      if (c < 0 || c >= n) continue;
      const l = r.exploreByChain.get(c);
      const w =
        l && chainWhole(l, r.ps.chains[c].length, r.ps.chainBreakAfter[c] < 0) ? 1 : 0;
      if (r.exploreWhole[c] !== w) {
        r.exploreWhole[c] = w;
        flagsChanged = true;
      }
    }
    let charred = this.charredCache;
    const hasBurnItems =
      (burn?.char?.length ?? 0) > 0 ||
      (burn?.fronts?.length ?? 0) > 0 ||
      (burn?.smolder?.length ?? 0) > 0;
    if (charred === null && hasBurnItems) {
      charred = new Uint8Array(n);
      this.charredCache = charred;
      flagsChanged = true;
    }
    if (charred) {
      for (const c of touched) {
        if (c < 0 || c >= n) continue;
        let v = 0;
        for (const s of burn?.char ?? []) {
          if (s.chain === c && s.b1 > s.b0) {
            v = 1;
            break;
          }
        }
        if (!v) {
          for (const f of burn?.fronts ?? []) {
            if (f.chain === c) {
              v = 1;
              break;
            }
          }
        }
        if (!v) {
          for (const s of burn?.smolder ?? []) {
            if (s.chain === c && s.b1 > s.b0) {
              v = 1;
              break;
            }
          }
        }
        if (charred[c] !== v) {
          charred[c] = v;
          flagsChanged = true;
        }
      }
    }
    for (const c of touched) {
      if (c < 0 || c >= r.fills.length) continue;
      r.fills[c].mesh.renderable = r.exploreByChain.has(c);
    }
    if (flagsChanged) r.paintScene.setExploreFlags(r.exploreWhole, charred);
    if (r.style.paletteMode) r.writePaintItemsExplore(touched);
    this.declareStats.chains += touched.size;
    this.exploreRev++;
    if (r.applyExploreGaps(touched)) r.gaps.upload();
  }

  // Declare the visible pieces (null = the mode off: every chain draws on
  // master's program again). With the mode on, the ribbons draw with the
  // explore program, a chain with no piece is not drawn at all, and the
  // pieces ride the paint declaration as VIS items. look = an
  // EXPLORE_LOOKS index, breath = the glow look's strength.
  // K290 (burn stage 3a): `burn` = the fire's part (explore_view
  // ExploreBurn; null = none): under "gone" the pieces already lack the
  // burnt thread and `burn.gate` (the reveal's own pieces) decides which
  // junctions hide; under "char" `burn.char` lists the stretches to darken.
  setExplore(
    pieces: ExplorePiece[] | null,
    look = 0,
    breath = 1,
    burn: ExploreBurn | null = null
  ): void {
    const E = knotUniformValues().uKExplore!;
    E[0] = pieces ? (this.exploreContrast ? 2 : 1) : 0;
    E[1] = look;
    E[2] = breath;
    E[3] = this.r.style.threadWidth;
    if (!pieces) burn = null;
    const prev = this.r.explorePieces;
    this.declareStats.calls++;
    const forceFull = this.forceFullExplore;
    this.forceFullExplore = false;
    if (!forceFull && prev && pieces && this.r.exploreWhole.length === this.r.ps.chains.length) {
      const sameAll =
        (prev === pieces || samePieces(prev, pieces)) && sameBurn(this.r.exploreBurn, burn);
      if (!sameAll) {
        const touched = exploreTouchedChains(this.r.exploreByChain, pieces, this.r.exploreBurn, burn);
        if (touched.size === 0) {
          this.r.explorePieces = pieces;
          this.r.exploreBurn = burn;
          return;
        }
        this.setExploreTouched(pieces, burn, touched);
        return;
      }
    }
    if (
      !forceFull && (prev === pieces || (prev && pieces && samePieces(prev, pieces))) &&
      sameBurn(this.r.exploreBurn, burn)
    ) {
      return;
    }
    this.r.explorePieces = pieces;
    this.r.exploreBurn = burn;
    this.r.exploreByChain.clear();
    for (const p of pieces ?? []) {
      let l = this.r.exploreByChain.get(p.chain);
      if (!l) {
        l = [];
        this.r.exploreByChain.set(p.chain, l);
      }
      l.push(p);
    }
    this.exploreGateByChain = null;
    if (burn?.gate) {
      const g = new Map<number, ExplorePiece[]>();
      for (const p of burn.gate) {
        let l = g.get(p.chain);
        if (!l) g.set(p.chain, (l = []));
        l.push(p);
      }
      this.exploreGateByChain = g;
    }
    const n = this.r.ps.chains.length;
    const whole = new Uint8Array(n);
    for (const [c, l] of this.r.exploreByChain) {
      if (c < n && chainWhole(l, this.r.ps.chains[c].length, this.r.ps.chainBreakAfter[c] < 0)) {
        whole[c] = 1;
      }
    }
    this.r.exploreWhole = whole;
    let charred: Uint8Array | null = null;
    const fronts = burn?.fronts ?? [];
    const smolder = burn?.smolder ?? [];
    if ((burn?.char && burn.char.length > 0) || fronts.length > 0 || smolder.length > 0) {
      charred = new Uint8Array(n);
      for (const s of burn?.char ?? []) if (s.chain < n && s.b1 > s.b0) charred[s.chain] = 1;
      // K290 stage 3b: kCharAt scans these chains for FRONT and SMOLDER too.
      for (const f of fronts) if (f.chain < n) charred[f.chain] = 1;
      for (const s of smolder) if (s.chain < n && s.b1 > s.b0) charred[s.chain] = 1;
    }
    // K825: a meshless pass (the SDF quads) swaps its one mesh too.
    this.r.stripPass.setExplore?.(!!pieces);
    const root = this.r.rootPaint;
    const sh = pieces ? sectionShaderExplore(root) : sectionShader(root);
    for (let c = 0; c < this.r.fills.length; c++) {
      const m = this.r.fills[c].mesh;
      if (m.shader !== sh) m.shader = sh;
      m.renderable = !pieces || this.r.exploreByChain.has(c);
    }
    // K268 stage 2 (K275): the arm strips write the visibility as
    // premultiplied alpha, and the fans read them so (a web fades with its
    // arms, a cap with its thread). The fans and the still plucks also take
    // the shaped crossing cut (a cut fades with its over thread).
    setStripExplore(!!pieces);
    this.r.plucks.setExplore(!!pieces);
    const fsh = pieces ? junctionShaderExplore() : junctionShader();
    if (this.r.filletMesh) this.r.filletMesh.mesh.shader = fsh;
    this.charredCache = charred;
    this.r.paintScene.setExploreFlags(pieces ? whole : null, charred);
    if (this.r.style.paletteMode) this.r.writePaintItems();
    this.declareStats.chains += pieces ? this.r.exploreByChain.size : 0;
    this.exploreRev++;
    // The gap gate follows at once (the slots keep their last solve).
    if (this.r.applyExploreGaps()) this.r.gaps.upload();
  }

  // K76 2b, THE GAP GATE (K76_reveal_mode.md 2.3, 2.5): a crossing's gap is
  // as strong as its over thread is visible at the over pass (the slot's
  // strength times vis; vis 0 rejects the slot in texel 0, for ribbons and
  // fans alike), so a hidden over thread cuts nothing and a visible
  // crossing keeps its gap exactly. A marker disc's gap shows only once its
  // thread point is fully visible (EXPLORE_MARKER_VIS, the exit marker's own
  // rule), unless K465's revealFinish lifts the exit's hold
  // (game/explore_finish.ts markerGapHeld). With the mode off every slot is
  // restored as solved. Flags
  // exploreUpdatePending when update()'s bookkeeping no longer matches
  // (see there). Returns whether the slot table changed.
  //
  // K268 stage 1, THE SHAPED CUT (docs/design/K268.md): with the mode on, a
  // slot whose footprint holds one or two piece ends gets a visibility
  // profile instead (GapMaskTable.setShape): the explore program cuts each
  // under fragment by the over thread's visibility at its projection, so a
  // fade's gap fades along the over thread exactly as the thread does.
  // Hidden, solid and fallback slots keep 2b's scalar (setVis); a shaped
  // slot's texel 1.w still carries it for the fans and the still pluck.
  applyExploreGaps(touched: Set<number> | null = null): boolean {
    const on = this.r.explorePieces !== null;
    let changed = false;
    const dirtyUnder = new Set<number>();
    const st = this.exploreGapCounts;
    if (this.gapKind.length < this.r.markerBase) {
      this.gapKind = new Int8Array(this.r.markerBase);
      this.gapKindApprox = new Uint8Array(this.r.markerBase);
    }
    if (!touched) {
      st.hidden = st.solid = st.shaped = st.fallback = st.approx = st.mismatch = 0;
      this.gapKind.fill(0);
      this.gapKindApprox.fill(0);
    }
    for (let s = 0; s < this.r.markerBase; s++) {
      if (!this.r.slotLive[s]) continue;
      if (touched && on) {
        const oc = this.r.slotOverChain[s];
        if (
          !touched.has(oc) &&
          !touched.has(this.r.slotProtChain[s * 2]) &&
          !touched.has(this.r.slotProtChain[s * 2 + 1])
        ) {
          continue;
        }
      }
      this.declareStats.gapIter++;
      const v = on ? this.r.exploreVisAt(this.r.slotOverChain[s], this.r.slotOverCtrl[s]) : 1;
      const cut = on ? this.r.exploreCutAt(s, v) : null;
      if (cut && cut.shape) {
        if (this.r.gaps.setShape(s, cut.shape)) changed = true;
      } else {
        if (this.r.gaps.setShape(s, null)) changed = true;
        if (this.r.gaps.setVis(s, v)) changed = true;
      }
      if (cut) {
        const kindCode = cut.kind === "hidden" ? 1 : cut.kind === "solid" ? 2 : cut.kind === "shaped" ? 3 : 4;
        const prevKind = this.gapKind[s];
        if (prevKind !== kindCode) {
          if (prevKind === 1) st.hidden--;
          else if (prevKind === 2) st.solid--;
          else if (prevKind === 3) st.shaped--;
          else if (prevKind === 4) st.fallback--;
          this.gapKind[s] = kindCode;
          st[cut.kind]++;
        }
        if (cut.approx !== (this.gapKindApprox[s] === 1)) {
          st.approx += cut.approx ? 1 : -1;
          this.gapKindApprox[s] = cut.approx ? 1 : 0;
        }
        // (approx counted with the kind above, K1082)
        if ((cut.kind === "hidden" && v !== 0) || (cut.kind === "solid" && v !== 1)) {
          st.mismatch++;
        }
      }
      // K268 PROTECT: this slot's waiver follows the covered thread B's
      // visibility per side (recorded at the solve; -1 = no protect there,
      // and the mode off restores the full waiver).
      const protNegCh = this.r.slotProtChain[s * 2];
      const protPosCh = this.r.slotProtChain[s * 2 + 1];
      const protNeg =
        on && protNegCh >= 0
          ? protVisScale(this.r.exploreVisAt(protNegCh, this.r.slotProtCtrl[s * 2]))
          : 1;
      const protPos =
        on && protPosCh >= 0
          ? protVisScale(this.r.exploreVisAt(protPosCh, this.r.slotProtCtrl[s * 2 + 1]))
          : 1;
      if (this.r.gaps.setProtVis(s, protNeg, protPos)) changed = true;
      const hid = on && v <= 0.5 ? 1 : 0;
      // K430 RAMP: the window follows the visibility continuously, not
      // only at the 0.5 flip below (the footprints stay binary). A fresh
      // solve marked the scale NaN, so every solved slot re-derives here.
      const scale = on ? uwRampScale(v) : 1;
      if (scale !== this.r.slotUwRamp[s]) {
        this.r.slotUwRamp[s] = scale;
        const ucR = this.r.slotUnderChain[s];
        if (ucR >= 0) dirtyUnder.add(ucR);
      }
      if (hid !== this.r.slotExploreHid[s]) {
        // K76 next: re-derive this slot's gated CPU bookkeeping here, from
        // the last solve's ungated data, instead of forcing an update():
        // the pluck footprints (registered slots: slot == crossing index)
        // and the under chain's windows (rebuilt below, once per chain).
        this.r.slotExploreHid[s] = hid;
        if (s < this.r.ps.crossings.length) {
          this.r.pluckHost.overHalfNeg[s] = hid ? 0 : this.r.slotCoverNeg[s];
          this.r.pluckHost.overHalfPos[s] = hid ? 0 : this.r.slotCoverPos[s];
          this.r.pluckHost.eraseExtentNeg[s] = hid ? 0 : this.r.slotAllNeg[s];
          this.r.pluckHost.eraseExtentPos[s] = hid ? 0 : this.r.slotAllPos[s];
        }
        const uc = this.r.slotUnderChain[s];
        if (uc >= 0) dirtyUnder.add(uc);
      }
    }
    // K430: rebuilt once per dirty chain, ramped windows (uwRampScale).
    for (const uc of dirtyUnder) {
      const win: number[] = [];
      for (let s = 0; s < this.r.markerBase; s++) {
        if (!this.r.slotLive[s]) continue;
        if (this.r.slotUnderChain[s] !== uc) continue;
        pushRampedWindow(win, this.r.slotUnderCenter[s], this.r.slotCutNeg[s], this.r.slotCutPos[s], this.r.slotUwRamp[s]);
      }
      if (win.length) this.r.underWindows.set(uc, win);
      else this.r.underWindows.delete(uc);
    }
    if (dirtyUnder.size) this.r.uwRev++;
    for (let m = 0; m < MARKER_SLOTS; m++) {
      const occ = this.r.markerOccluders[m];
      const lifted = occ?.exit === true && this.r.exploreFinish;
      const k =
        on && occ && markerGapHeld(this.r.exploreVisAt(occ.chain, occ.ctrl), lifted) ? 0 : 1;
      if (this.r.gaps.setVis(this.r.markerBase + m, k)) {
        changed = true;
        this.r.exploreUpdatePending = true;
      }
    }
    return changed;
  }

  // K268: how the over thread's visibility runs across slot s's footprint
  // (the arc range its polyline spans), given 2b's scalar v at the over
  // pass (the shaped slot's texel 1.w).
  exploreCutAt(s: number, v: number): ExploreCut {
    const ch = this.r.slotOverChain[s];
    const samples = this.r.chainSamples[ch];
    if (ch < 0 || !samples || this.r.exploreWhole[ch]) {
      return classifyExploreCut([], true, 0, false, 0, 0, 0, () => 0, v);
    }
    const oc = this.r.slotOverCtrl[s];
    const n = this.r.ps.chains[ch].length;
    const closed = this.r.ps.chainBreakAfter[ch] < 0;
    const [aLo, aHi] = this.r.gaps.polyRange(s);
    const arc = exploreArcMap(
      samples.controlArcLengths,
      samples.totalLength,
      closed,
      oc,
      sampling.arcAt(samples, oc)
    );
    const pieces = this.r.exploreByChain.get(ch) ?? [];
    return classifyExploreCut(pieces, false, n, closed, oc, aLo, aHi, arc, v);
  }

  exploreGapState(): {
    hidden: number;
    solid: number;
    shaped: number;
    fallback: number;
    approx: number;
    mismatch: number;
    uploadBytes: number;
    uploadCalls: number;
    shapedSlots: number[];
  } {
    const shapedSlots: number[] = [];
    for (let s = 0; s < this.r.markerBase; s++) {
      if (this.r.slotLive[s] && this.r.gaps.isShaped(s)) shapedSlots.push(s);
    }
    return {
      ...this.exploreGapCounts,
      uploadBytes: GAP_UPLOAD_STATS.bytes,
      uploadCalls: GAP_UPLOAD_STATS.calls,
      shapedSlots,
    };
  }

  private syncExploreJoints(): void {
    if (this.exploreJointRev === this.exploreRev) return;
    this.exploreJointRev = this.exploreRev;
    if (!this.r.explorePieces) {
      this.r.exploreHideJn = null;
      this.r.exploreHideFree = null;
      this.exploreJointKey = "";
      return;
    }
    const hideJn = new Uint8Array(this.r.junctionArms.length);
    const hideFree = new Uint8Array(this.r.freeTips.length);
    const parts: string[] = [];
    for (let jn = 0; jn < this.r.junctionArms.length; jn++) {
      if (!this.r.exploreJointShown(jn)) {
        hideJn[jn] = 1;
        parts.push("j" + jn);
      }
    }
    for (let i = 0; i < this.r.freeTips.length; i++) {
      const tip = this.r.freeTips[i];
      const n = this.r.ps.chains[tip.chain].length;
      if (this.r.exploreVisAt(tip.chain, tip.atEnd ? n - 1 : 0) <= EXPLORE_JOINT_MIN) {
        hideFree[i] = 1;
        parts.push("t" + i);
      }
    }
    this.r.exploreHideJn = hideJn;
    this.r.exploreHideFree = hideFree;
    this.exploreJointKey = "x" + parts.join(",");
  }

  // The joint gate's part of the fillet key ("" with the mode off).
  exploreJointsKey(): string {
    this.syncExploreJoints();
    return this.exploreJointKey;
  }

  // Whether a junction draws under the reveal (the joint gate): every arm
  // visible past EXPLORE_JOINT_MIN at its slot. An unvisited junction, whose
  // stubs fade out into it, hides; a drawn web fades with its arms.
  // K290 (burn stage 3a): under a burn the reveal's own pieces (the gate)
  // apply that rule, and the declared pieces (which lack the burnt thread)
  // hide a junction only when every arm is gone; otherwise the web draws
  // and a burnt arm's lobe fades out with its strip (the joint fade).
  // Without a burn the two are the same pieces: the rule above, exactly.
  exploreJointShown(jn: number): boolean {
    let any = false;
    for (const a of this.r.junctionArms[jn].arms) {
      const n = this.r.ps.chains[a.chain].length;
      const closed = this.r.ps.chainBreakAfter[a.chain] < 0;
      const c = closed ? a.slot : Math.max(0, Math.min(n - 1, a.slot));
      if (this.r.exploreGateVisAt(a.chain, c) <= EXPLORE_JOINT_MIN) return false;
      if (this.r.exploreVisAt(a.chain, c) > EXPLORE_JOINT_MIN) any = true;
    }
    return any || this.r.junctionArms[jn].arms.length === 0;
  }

  // K290: the reveal's own visibility at a chain point (exploreVisAt with
  // no burn; 1 with a burn and the reveal off).
  exploreGateVisAt(chain: number, ctrl: number): number {
    if (!this.r.exploreBurn) return this.r.exploreVisAt(chain, ctrl);
    const g = this.exploreGateByChain;
    if (!g) return 1;
    const l = g.get(chain);
    if (!l) return 0;
    const n = this.r.ps.chains[chain].length;
    const closed = this.r.ps.chainBreakAfter[chain] < 0;
    let best = 0;
    for (const p of l) best = Math.max(best, pieceVis(p, ctrl, n, closed));
    return best;
  }

  // Probe view of the joint gate: hidden junctionArms / freeTips indices
  // (empty with the mode off).
  exploreJointState(): { junctions: number[]; freeTips: number[] } {
    this.syncExploreJoints();
    const pick = (a: Uint8Array | null): number[] => {
      const out: number[] = [];
      if (a) a.forEach((v, i) => v && out.push(i));
      return out;
    };
    return { junctions: pick(this.r.exploreHideJn), freeTips: pick(this.r.exploreHideFree) };
  }

  // K76 stage 2c: the shown stretch (unwrapped ctrls, found in 0.25 ctrl
  // steps) around a chain ctrl, inside `lim` (a pluck unit's span; else
  // half a loop each way, or the open chain); null when the point itself
  // is hidden. A pluck's unit is clipped to it.
  exploreShownSpan(
    chain: number,
    ctrl: number,
    lim: [number, number] | null,
    len: number,
    closed: boolean
  ): [number, number] | null {
    const STEP = 0.25;
    let u = ctrl;
    let lo0: number;
    let hi0: number;
    if (lim) {
      [lo0, hi0] = lim;
      if (closed && u < lo0) u += len;
      u = Math.max(lo0, Math.min(hi0, u));
    } else if (closed) {
      lo0 = u - len / 2;
      hi0 = u + len / 2;
    } else {
      lo0 = 0;
      hi0 = len - 1;
    }
    const at = (c: number): boolean =>
      this.r.exploreShownAt(chain, closed ? ((c % len) + len) % len : Math.max(0, Math.min(len - 1, c)));
    if (!at(u)) return null;
    let lo = u;
    while (lo > lo0) {
      const n = Math.max(lo0, lo - STEP);
      if (!at(n)) break;
      lo = n;
    }
    let hi = u;
    while (hi < hi0) {
      const n = Math.min(hi0, hi + STEP);
      if (!at(n)) break;
      hi = n;
    }
    return [lo, hi];
  }

  // K397: the solid part (unwrapped ctrls, in `shown`'s frame) of a shown
  // stretch (exploreShownSpan's) nearest a chain ctrl: the pieces' solid
  // parts inside it, the one holding the ctrl or else the nearest, grown
  // through any that meet it. Null when none lies inside (only a fade shows).
  exploreSolidSpan(
    chain: number,
    ctrl: number,
    shown: [number, number],
    len: number,
    closed: boolean
  ): [number, number] | null {
    const l = this.r.exploreByChain.get(chain);
    if (!l) return null;
    const [s0, s1] = shown;
    const mid = 0.5 * (s0 + s1);
    let u = ctrl;
    if (closed) u += len * Math.round((mid - u) / len);
    const iv: Array<[number, number]> = [];
    for (const p of l) {
      const base = closed ? len * Math.round((mid - 0.5 * (p.c0 + p.c1)) / len) : 0;
      for (const k of closed ? [-1, 0, 1] : [0]) {
        const a = Math.max(s0, p.c0 + base + k * len);
        const b = Math.min(s1, p.c1 + base + k * len);
        if (b >= a) iv.push([a, b]);
      }
    }
    if (iv.length === 0) return null;
    let lo = 0;
    let hi = 0;
    let bd = Infinity;
    for (const [a, b] of iv) {
      const d = Math.max(a - u, u - b, 0);
      if (d < bd) {
        bd = d;
        lo = a;
        hi = b;
      }
    }
    for (let grew = true; grew; ) {
      grew = false;
      for (const [a, b] of iv) {
        if (a <= hi + 1e-3 && b >= lo - 1e-3 && (a < lo || b > hi)) {
          lo = Math.min(lo, a);
          hi = Math.max(hi, b);
          grew = true;
        }
      }
    }
    return [lo, hi];
  }
}
