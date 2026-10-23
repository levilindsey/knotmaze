// THE GAMEPLAY PAINT STATE (K5 R3): the G2 declaration (spans, caps,
// pulses, the hover rim, the telegraph pieces, the fray), the section
// runs, the K81 route declarations and the paint clocks, plus K6's
// paintNeedsFrame poll and the CPU mirror (paintMirror). Moved verbatim
// from ribbon_renderer.ts (6ce5ced8); a body changed in three ways only:
// a renderer member became `this.r.x`, a sampling helper
// `sampling.x(...)`, and the façade keeps one-line delegations for the
// names other code calls (setPaint, setRim, setTelegraph, tickPaint,
// advanceClocks, paintNeedsFrame, needsFxRender, paintMirror) and
// accessors for paintClock, pulseBorn, rimAt, webFade and
// lastPaintUpload. RibbonRenderer owns one PaintState (its
// `paintState`). Shared scene state stays on the façade (style, ps,
// paintScene, paintTmp, the route resolution tables, the live slider
// fields), read here through `this.r` (docs/design/K5_R3.md).

import { createNoise2D } from "simplex-noise";
import { SeededRNG } from "../../util/random";
import type { ColorScheme, SectionRuns } from "../../core/section_colors";
import { blendEase, constantSectionRuns, gamutConfig, gamutRgb } from "../../core/section_colors";
import type {
  PaintCap,
  PaintRim,
  PaintSpan,
  PaintTele,
  PulseArm,
  RibbonRenderer,
  RouteJArm,
  ResolvedRoute,
} from "../ribbon_renderer";
import type { PaintRoute } from "../junction_routes";
import { pickRoutes } from "../junction_routes";
import { MAX_ROUTES, recordData } from "../junction_field";
import { WebFade } from "../web_fade";
import { FILLET_REACH_PER_HALF } from "./joinery";
import { setFabricJunctionCut } from "../fabric_sdf";
import { FX_STYLE, ITEM_FLAG, PAINT_CONST, PAINT_ITEM, PAINT_ITEM_FRAY, PAINT_ITEM_TELE } from "../paint_const";
import {
  EXPLORE_ITEM_CHAR,
  EXPLORE_ITEM_FRONT,
  EXPLORE_ITEM_SMOLDER,
  EXPLORE_ITEM_VIS,
  charItem,
  charRange,
  frontItem,
  frontRange,
  smolderItem,
  visItem,
  visRange,
} from "../explore_glsl";
import { FX_TAIL } from "./reveal_fx";
import { kData, knotUniformValues } from "../paint_model";
import {
  kChain,
  kComposePaint,
  kCtrlNear,
  kCtrlOfArc,
  kFxAge,
  kGlow,
  kIgnition,
  kPaintAt,
  kRimAcross,
  kRimOver,
  kRimScale,
  kShadeFx,
  kTeleOver,
  knotSection,
  type KPaintState,
} from "../paint_math";

// K525: the telegraph rims' end fades (rimGap): a junction end fades
// over TELE_JUNCTION_FADE past the web's reach, a mid-run end over
// TELE_MID_FADE, both capped at RIM_END_SHARE of half the piece.
const TELE_JUNCTION_FADE = 0.2;
const TELE_MID_FADE = 0.3;

export class PaintState {
  readonly r: RibbonRenderer;
  constructor(r: RibbonRenderer) {
    this.r = r;
  }

  // The façade's shared state this part reads (the hub pattern of
  // ribbon/crossing_gaps.ts): the physics and style, the paint scene and
  // its CPU scratch, the section scheme's material, the route resolution
  // tables (the façade's, K81's readers live there), the live slider
  // fields the uniforms mirror, and the flow clock.
  private get ps() { return this.r.ps; }
  private get style() { return this.r.style; }
  private get paintScene() { return this.r.paintScene; }
  private get paintDebug() { return this.r.paintDebug; }
  private get paintTmp() { return this.r.paintTmp; }
  private get knotRgb() { return this.r.knotRgb; }
  private get baseRgb() { return this.r.baseRgb; }
  private get initialControls() { return this.r.initialControls; }
  private get junctionBlend() { return this.r.junctionBlend; }
  private set junctionBlend(v: number) { this.r.junctionBlend = v; }
  private get junctionArms() { return this.r.junctionArms; }
  private get routesByJn() { return this.r.routesByJn; }
  private set routesByJn(v: Map<number, ResolvedRoute[]>) { this.r.routesByJn = v; }
  private get routedArms() { return this.r.routedArms; }
  private set routedArms(v: Set<string>) { this.r.routedArms = v; }
  private get fullJn() { return this.r.fullJn; }
  private set fullJn(v: Set<number>) { this.r.fullJn = v; }
  private get armJunction() { return this.r.armJunction; }
  private set armJunction(v: Map<string, number> | null) { this.r.armJunction = v; }
  private get recBaseByJn() { return this.r.recBaseByJn; }
  private get hcLook() { return this.r.hcLook; }
  private get teleStrength() { return this.r.teleStrength; }
  private get teleColor() { return this.r.teleColor; }
  private get pulseSpacing() { return this.r.pulseSpacing; }
  private get pulseReach() { return this.r.pulseReach; }
  private get hoverGlow() { return this.r.hoverGlow; }
  private get hoverGlowWidth() { return this.r.hoverGlowWidth; }
  private get hoverGlowLength() { return this.r.hoverGlowLength; }
  private get hoverGlowFade() { return this.r.hoverGlowFade; }
  private get threadLook() { return this.r.threadLook; }
  private get goldWidth() { return this.r.goldWidth; }
  private get borderWidth() { return this.r.borderWidth; }
  private get borderColor() { return this.r.borderColor; }
  private get goldTextureStrength() { return this.r.goldTextureStrength; }
  private get goldTexture() { return this.r.goldTexture; }
  private get pulseColor() { return this.r.pulseColor; }
  private get pulseWidth() { return this.r.pulseWidth; }
  private get hoverColor() { return this.r.hoverColor; }
  private get telegraphWidth() { return this.r.telegraphWidth; }
  private get frayColor() { return this.r.frayColor; }
  private get frayWidth() { return this.r.frayWidth; }
  private get flowSpeed() { return this.r.flowSpeed; }
  private get flowTime() { return this.r.flowTime; }
  private set flowTime(v: number) { this.r.flowTime = v; }
  private get explorePieces() { return this.r.explorePieces; }
  private get nextJointCache() { return this.r.nextJointCache; }
  private get junctionArcCtrls() { return this.r.junctionArcCtrls; }
  private get fills() { return this.r.fills; }
  private get routeKey() { return this.r.routeKey; }
  private set routeKey(v: string) { this.r.routeKey = v; }
  private get cuspRadius() { return this.r.cuspRadius; }
  private get joinery() { return this.r.joinery; }
  // (TELE_MID_FADE / TELE_JUNCTION_FADE are module consts below.)
  private get chainSamples() { return this.r.chainSamples; }
  private get exploreWhole() { return this.r.exploreWhole; }
  private get exploreBurn() { return this.r.exploreBurn; }
  private knotChainRgb(i: number): Float32Array {
    return this.r.knotChainRgb(i);
  }
  private rebuildFillets(force?: boolean): void {
    this.r.rebuildFillets(force);
  }

  // Palette-mode paint state (see PaintSpan/PulseArm). The paint pass is
  // deliberately decoupled from update(): it rewrites only UV buffers, so
  // the pulse animation can run while the physics sleeps.
  /** @internal ribbon */ paintSpans: PaintSpan[] = [];
  /** @internal ribbon */ paintPulses: PulseArm[] = [];
  /** @internal ribbon */ pulseKey = "";
  /** @internal ribbon */ pulseBorn = -1e9;
  /** @internal ribbon */ paintCaps: PaintCap[] = [];
  // K145: the hover glow's run (setRim) and the key of the KPAINT item it
  // last wrote; the hover point rides a uniform (setRimAt).
  /** @internal ribbon */ paintRim: PaintRim | null = null;
  /** @internal ribbon */ rimKey = "";
  /** @internal ribbon */ rimAt = 0;
  // K525: the telegraph's route pieces (setTelegraph) and the key of the
  // KPAINT items they last wrote; the colour and strength ride uKTele.
  /** @internal ribbon */ paintTele: PaintTele[] | null = null;
  // K137 fray (4.3's look): the cracked fragile runs' spans (setFray).
  /** @internal ribbon */ fraySpans: PaintSpan[] = [];
  /** @internal ribbon */ frayKey = "";
  /** @internal ribbon */ teleKey = "";
  // K654: the riding end's ctrl (uKTeleAt.x; 0 with no riding piece).
  /** @internal ribbon */ teleAt = 0;
  /** @internal ribbon */ paintClock = 0;
  /** @internal ribbon */ paintRoutes: PaintRoute[] = [];
  /** @internal ribbon */ paintTraveled: PaintRoute[] = [];
  webFade = new WebFade();
  /** @internal ribbon */ sectionNoise: ((x: number, y: number) => number) | null = null;
  // Texels the last paint declaration change uploaded (probes).
  lastPaintUpload = 0;
  private paintOverflowWarned = false;
  // The declaration last written to KPAINT (setPaint skips identical ones).
  /** @internal ribbon */ paintKey = "";

  // The CPU mirror's view of this frame (paint_math.ts): the data-texture
  // mirrors, the uniform values, and helpers for probe scripts.
  paintMirror(): {
    data: ReturnType<typeof kData>;
    uniforms: ReturnType<typeof knotUniformValues>;
    chain: (ch: number) => ReturnType<typeof kChain>;
    ctrlOfArc: (ch: number, arc: number) => number;
    ctrlNear: (ch: number, arc: number, approx: number) => number;
    // The section color at an arc (the ribbon's own Gouraud), exactly at
    // the arc's ctrl (what a probe vertex there evaluates), and at a ctrl.
    sectionAt: (ch: number, arc: number) => number[];
    sectionExact: (ch: number, arc: number) => number[];
    sectionAtCtrl: (ch: number, ctrl: number) => number[];
    // The section shader's full color at the material point exactly at
    // the arc's ctrl (section, FX, paint + glow; px = edge coverage):
    // [r, g, b, alpha] - what a probe vertex there renders (G2.3 census).
    shadeAll: (ch: number, arc: number, side: number, px?: number) => number[];
    // The section shader's color at a material point before the gameplay
    // accent: [r, g, b, alpha] (FX on the given base color).
    shadeFx: (ch: number, arc: number, side: number, base: number[]) => number[];
    // The point's ignition (anim time; Infinity = none) and FX age.
    ignition: (ch: number, arc: number) => { tA: number; age: number };
    // The gameplay paint state at the material point exactly at the arc's
    // ctrl (kPaintAt, px = edge coverage) and its reveal glow (kGlow).
    paintState: (
      ch: number,
      arc: number,
      px?: number
    ) => KPaintState & { glow: number };
  } {
    const data = kData();
    const U = knotUniformValues();
    const scratch = new Float32Array(3);
    return {
      data,
      uniforms: U,
      chain: (ch) => kChain(data, ch),
      ctrlOfArc: (ch, arc) => kCtrlOfArc(data, kChain(data, ch), arc),
      ctrlNear: (ch, arc, approx) =>
        kCtrlNear(data, kChain(data, ch), arc, approx),
      sectionAt: (ch, arc) => {
        this.joinery.sectionAtArc(ch, arc, scratch);
        return [scratch[0], scratch[1], scratch[2]];
      },
      sectionExact: (ch, arc) => {
        const c = kChain(data, ch);
        knotSection(data, U, c, kCtrlOfArc(data, c, arc), scratch);
        return [scratch[0], scratch[1], scratch[2]];
      },
      sectionAtCtrl: (ch, ctrl) => {
        knotSection(data, U, kChain(data, ch), ctrl, scratch);
        return [scratch[0], scratch[1], scratch[2]];
      },
      shadeAll: (ch, arc, side, px = 0) => {
        const c = kChain(data, ch);
        const ctrl = kCtrlOfArc(data, c, arc);
        const rgb = [0, 0, 0];
        knotSection(data, U, c, ctrl, rgb);
        const a = kShadeFx(data, U, c, ctrl, arc / c.arcPer, side, rgb);
        const st = kPaintAt(data, U, c, ctrl, arc, px, this.paintTmp);
        // The hover glow (K145), shaped across at `side` and composed over
        // the paint (K298) as SECTION_FRAG does.
        const rim = st.rim > 0 ? st.rim * kRimAcross(side, U.uKGold[3]) : 0;
        // K525: the telegraph's rims, the same shape across at the strength
        // uKTele.w, mixed toward its colour before the hover's whitening.
        const tl =
          st.tele > 0 && U.uKTele
            ? st.tele * kRimAcross(side, U.uKHlHover ? U.uKHlHover[3] : U.uKGold[3]) * U.uKTele[3]
            : 0;
        kComposePaint(U, rgb, st, kGlow(data, U, c, ctrl));
        if (tl > 0) kTeleOver(U, rgb, tl);
        if (rim > 0) kRimOver(rgb, rim, U);
        return [rgb[0], rgb[1], rgb[2], a];
      },
      shadeFx: (ch, arc, side, base) => {
        const c = kChain(data, ch);
        const rgb = [base[0], base[1], base[2]];
        const a = kShadeFx(
          data,
          U,
          c,
          kCtrlOfArc(data, c, arc),
          arc / c.arcPer,
          side,
          rgb
        );
        return [rgb[0], rgb[1], rgb[2], a];
      },
      ignition: (ch, arc) => {
        const c = kChain(data, ch);
        const g = kIgnition(data, U, c, kCtrlOfArc(data, c, arc));
        return {
          tA: g.hit ? g.tA : Infinity,
          age: g.hit ? kFxAge(U, g) : -Infinity,
        };
      },
      paintState: (ch, arc, px = 0) => {
        const c = kChain(data, ch);
        const ctrl = kCtrlOfArc(data, c, arc);
        const st = kPaintAt(data, U, c, ctrl, arc, px, {
          p: 0,
          band: false,
          v: 0,
          rim: 0,
          tele: 0,
        });
        return { ...st, glow: kGlow(data, U, c, ctrl) };
      },
    };
  }

  // Install a scheme's section runs (core/section_colors buildSectionRuns)
  // and junctionBlend (lattice units - a uniform, no table change). The
  // noise scheme reads a seeded simplex field at each control's initial
  // position (its coordinate rides the material: CTRLIDX.z).
  setSectionRuns(
    sr: SectionRuns,
    scheme: ColorScheme,
    seed: number,
    blendDist = 0
  ): void {
    if (scheme === "noise") {
      const rng = new SeededRNG((seed ^ 0x5ec7c0) >>> 0);
      this.sectionNoise = createNoise2D(() => rng.next());
    } else {
      this.sectionNoise = null;
    }
    this.junctionBlend = blendDist;
    this.installRuns(sr);
  }

  // Write a run table (null = the constant default: palette mode's gamut
  // midpoint, or knot mode's strand tints - knot mode always uses those).
  // Event time; only changed texels upload (an identical rebuild - a
  // junctionBlend drag - sends nothing), then the uniforms.
  /** @internal ribbon */ installRuns(sr: SectionRuns | null): void {
    const chains = this.ps.chains.map((c, i) => ({
      len: c.length,
      closed: this.ps.chainBreakAfter[i] < 0,
    }));
    let runs: SectionRuns;
    if (!this.style.paletteMode) {
      runs = constantSectionRuns(chains, (i) => [
        this.knotRgb[i][0],
        this.knotRgb[i][1],
        this.knotRgb[i][2],
      ]);
    } else {
      runs =
        sr ??
        constantSectionRuns(chains, () => [
          this.baseRgb[0],
          this.baseRgb[1],
          this.baseRgb[2],
        ]);
    }
    let noise: Float32Array[] | null = null;
    if (runs.noise && this.sectionNoise) {
      noise = this.initialControls.map((ic) => {
        const z = new Float32Array(ic.length / 2);
        for (let k = 0; k < z.length; k++) {
          z[k] = this.noiseV(ic[k * 2], ic[k * 2 + 1]);
        }
        return z;
      });
    }
    this.lastRunUpload = this.paintScene.setRuns(runs.runs, runs.slotRun, noise);
    this.syncSectionUniforms();
  }

  // Texels the last run install uploaded (probes: a jbl drag sends 0).
  lastRunUpload = 0;

  // uKGamut (the live gamut: baseHue + gamutConfig) and uKSect (the
  // junctionBlend distance and its ease).
  /** @internal ribbon */ syncSectionUniforms(): void {
    const U = knotUniformValues();
    const [arc, sat, light] = gamutConfig();
    U.uKGamut[0] = this.style.baseHue;
    U.uKGamut[1] = arc;
    U.uKGamut[2] = sat;
    U.uKGamut[3] = light;
    U.uKSect[0] = Math.max(0, this.junctionBlend);
    U.uKSect[1] = blendEase(this.junctionBlend);
  }

  // LIVE RECOLOR (the Look panel's color controls): swap every color
  // input in place - physics, the reveal and the player's progress all
  // survive, where a scene rebuild reset them. The caller has already
  // applied the gamut config (setGamutConfig) and built the new field.
  // Fans read the live paint texture (there are no thread copies to
  // re-sync: the gaps are cut per pixel in the base ribbons).
  recolor(
    baseHue: number,
    pathColor: number,
    hueGroup: number[] | undefined,
    sr: SectionRuns,
    scheme: ColorScheme,
    seed: number,
    blendDist = 0
  ): void {
    this.style.baseHue = baseHue;
    this.style.hueGroup = hueGroup;
    this.baseRgb.set(gamutRgb(baseHue, 0.5));
    if (this.style.paletteMode) {
      if (this.style.pathColor !== pathColor) {
        this.style.pathColor = pathColor;
        this.syncGold();
      }
      // Sections are evaluated per vertex from the run table + uniforms:
      // nothing to repaint (the gameplay U does not depend on them).
      this.setSectionRuns(sr, scheme, seed, blendDist);
    } else {
      this.fills.forEach((_, i) => {
        this.knotRgb[i] = this.knotChainRgb(i);
      });
      this.installRuns(null);
    }
  }

  // The noise scheme's gamut coordinate at a world point.
  private noiseV(x: number, y: number): number {
    const n = this.sectionNoise!(x * 0.16, y * 0.16);
    return Math.max(0, Math.min(1, 0.5 + 0.62 * n));
  }

  // The ctrl of the next fused joint along a junction arm (its chain, in
  // the arm's direction), or null - static (joint ctrls are fixed chain
  // slots), so cached once; the arc is re-derived live by the caller.
  /** @internal ribbon */ armNextJointCtrl(
    jn: number,
    a: { chain: number; slot: number; dir: 1 | -1 }
  ): number | null {
    const key = jn + ":" + a.chain + ":" + a.slot + ":" + a.dir;
    const hit = this.nextJointCache.get(key);
    if (hit !== undefined) return hit;
    const len = this.ps.chains[a.chain].length;
    const closed = this.ps.chainBreakAfter[a.chain] < 0;
    let best: number | null = null;
    let bestD = Infinity;
    for (const e of this.junctionArcCtrls.get(a.chain) ?? []) {
      if (e.jn === jn) continue;
      let d = (e.ctrl - a.slot) * a.dir;
      if (closed) d = ((d % len) + len) % len;
      if (d > 1e-6 && d < bestD) {
        bestD = d;
        best = e.ctrl;
      }
    }
    this.nextJointCache.set(key, best);
    return best;
  }


  // Declare the current gameplay paint (traveled spans + branch-point
  // pulse arms + junction caps + K81 route bands, and K127's traveled
  // passes: junction_routes.ts traveledRoutes). Called every awake
  // frame; KPAINT is rewritten only when the declaration's content changed
  // (a traversal move changes its swept span every frame - a few texels),
  // the routes re-resolve only when they changed (a tap, a move's end).

  setPaint(
    spans: PaintSpan[],
    pulses: PulseArm[],
    caps: PaintCap[],
    routes: PaintRoute[] = [],
    traveled: PaintRoute[] = []
  ): void {
    this.paintSpans = spans;
    this.paintPulses = pulses;
    this.paintCaps = caps;
    const rk = JSON.stringify(routes) + "|" + JSON.stringify(traveled);
    if (rk !== this.routeKey) {
      this.routeKey = rk;
      this.paintRoutes = routes;
      this.paintTraveled = traveled;
      this.resolveRoutes();
    }
    // The routes key the caps too: a routed junction drops its caps
    // (unless fully traveled, K127).
    const declKey = JSON.stringify([spans, pulses, caps]) + "|" + rk;
    if (declKey !== this.paintKey && this.style.paletteMode) {
      this.paintKey = declKey;
      this.writePaintItems();
    }
    // PULSE FADE-IN: pulses live around the current head junction; when
    // that junction changes, restart the fade clock so the gradient
    // animation breathes in instead of popping (the "appear too
    // abruptly" report). Keyed by the inbound arm's junction ctrl.
    const key =
      pulses.length > 0
        ? pulses[0].chain + ":" + Math.round(pulses[0].cJunction * 4)
        : "";
    if (key !== this.pulseKey) {
      this.pulseKey = key;
      this.pulseBorn = this.paintClock;
    }
  }

  // K145: declare the hover glow's run (null = none). KPAINT is rewritten
  // only when the run or its end gap changes, or the glow turns on or off
  // (hoverGlow 0 writes no item, so the paint is exactly the glow-less
  // one); a pointer moving along the run only moves the hover point, a
  // uniform (setRimAt).
  setRim(rim: PaintRim | null): void {
    this.paintRim = rim;
    if (rim) this.rimAt = rim.at;
    this.syncRimItem();
  }

  setRimAt(at: number): void {
    this.rimAt = at;
  }

  // The KPAINT key of the hover glow's item ("" = no item).
  /** @internal ribbon */ rimItemKey(): string {
    const r = this.paintRim;
    return r && this.hoverGlow > 0
      ? `${r.chain}|${r.c0}|${r.c1}|${this.rimGap()}`
      : "";
  }

  /** @internal ribbon */ syncRimItem(): void {
    if (!this.style.paletteMode) return;
    if (this.rimItemKey() !== this.rimKey) this.writePaintItems();
  }

  // K145: the stretch at each end of a glowing run that stays dark - the
  // junction web's reach along an arm (its wedge flanks, else the tip-disc
  // rims). The webs draw over the ribbons there from arm strips, which
  // carry no across coordinate, so a glow reaching under them would end
  // at their silhouettes.
  /** @internal ribbon */ rimGap(): number {
    const fillHalf = this.style.threadWidth / 2;
    return Math.max(fillHalf * FILLET_REACH_PER_HALF * this.cuspRadius, 2 * fillHalf);
  }

  // K525: declare the minotaur's telegraph route as rim pieces (null or
  // empty = none). KPAINT is rewritten only when a piece, the junction gap
  // or the strength turning on or off changes; the colour and the strength
  // ride uKTele, so a roam turning into a hunt rewrites no texel. The
  // turn minotaur's route changes only on a tap. K654: the real-time
  // minotaur's lead rides its spot (`ride`, `at`): the key leaves `at` out
  // and the tick sends it as uKTeleAt.x, so a walking minotaur rewrites no
  // texel until its pieces change (a new run, a new plan).
  setTelegraph(pieces: PaintTele[] | null): void {
    this.paintTele = pieces && pieces.length > 0 ? pieces : null;
    this.teleAt = 0;
    if (this.paintTele) for (const p of this.paintTele) if (p.ride !== undefined) this.teleAt = p.at ?? 0;
    this.syncTeleItem();
  }

  // The KPAINT key of the telegraph's items ("" = none).
  /** @internal ribbon */ teleItemKey(): string {
    const t = this.paintTele;
    if (!t || !(this.teleStrength > 0)) return "";
    let k = `${this.rimGap()}`;
    for (const p of t) {
      k += `|${p.chain},${p.c0},${p.c1},${p.alpha},${p.j0 ? 1 : 0}${p.j1 ? 1 : 0}${p.ride ?? ""}`;
    }
    return k;
  }

  /** @internal ribbon */ syncTeleItem(): void {
    if (!this.style.paletteMode) return;
    if (this.teleItemKey() !== this.teleKey) this.writePaintItems();
  }

  // K137 fray (4.3's look): declare the cracked fragile runs (empty =
  // none). Like the telegraph, KPAINT is rewritten only when the set
  // changes (a run cracks or snaps).
  setFray(spans: PaintSpan[]): void {
    this.fraySpans = spans;
    if (!this.style.paletteMode) return;
    const k = spans.map((s) => `${s.chain},${s.c0},${s.c1}`).join("|");
    if (k !== this.frayKey) {
      this.frayKey = k;
      this.writePaintItems();
    }
  }

  // K81: a walk ctrl's particle slot on its chain (walk ctrls are particle
  // slots; a closed chain's may be unwrapped past its length), -1 for a
  // chain that does not exist.
  /** @internal ribbon */ routeArmSlot(chain: number, ctrl: number): number {
    const ch = this.ps.chains[chain];
    if (!ch || ch.length === 0) return -1;
    const len = ch.length;
    const s = Math.round(ctrl);
    return this.ps.chainBreakAfter[chain] < 0
      ? ((s % len) + len) % len
      : Math.max(0, Math.min(len - 1, s));
  }

  // K81: resolve the declared routes against the junction arms. A route
  // needs its arrival arm on a junction and its departure arm on the SAME
  // junction (or none, or the arrival arm again: a one-arm route); free
  // tips (start, exit, dead ends) resolve to nothing and keep their caps.
  // Each junction keeps its newest MAX_ROUTES passes over distinct arm
  // pairs (junction_routes pickRoutes), and every arm of a routed junction
  // is listed in routedArms: its paint caps are dropped (writePaintItems).
  // K127: a routed junction whose every arm a traveled pass arrives or
  // leaves by is FULLY TRAVELED (fullJn): it keeps its caps, and its
  // record's base reads the composed rows (J1.z = 1). K191: one that stops
  // being full while it holds a route fades its gold back out (webFade).
  /** @internal ribbon */ resolveRoutes(): void {
    if (!this.armJunction) {
      const m = new Map<string, number>();
      this.junctionArms.forEach((jn, ji) => {
        for (const a of jn.arms) m.set(a.chain + ":" + a.slot + ":" + a.dir, ji);
      });
      this.armJunction = m;
    }
    const aj = this.armJunction;
    const armKey = (x: RouteJArm): string => x.chain + ":" + x.slot + ":" + x.dir;
    const perJn = new Map<number, ResolvedRoute[]>();
    for (const r of this.paintRoutes) {
      const sa = this.routeArmSlot(r.chain, r.ctrl);
      if (sa < 0) continue;
      const a: RouteJArm = { chain: r.chain, slot: sa, dir: r.dir };
      const ja = aj.get(armKey(a));
      if (ja === undefined) continue;
      let b: RouteJArm | null = null;
      if (
        r.outChain !== undefined &&
        r.outCtrl !== undefined &&
        r.outDir !== undefined
      ) {
        const sb = this.routeArmSlot(r.outChain, r.outCtrl);
        if (sb < 0) continue;
        b = { chain: r.outChain, slot: sb, dir: r.outDir };
        if (aj.get(armKey(b)) !== ja) continue;
        if (armKey(b) === armKey(a)) b = null;
      }
      let list = perJn.get(ja);
      if (!list) {
        list = [];
        perJn.set(ja, list);
      }
      list.push({ a, b });
    }
    // K127: the arms the traveled passes arrive or leave by.
    const covered = new Set<string>();
    const cover = (chain: number, ctrl: number, dir: 1 | -1): void => {
      const s = this.routeArmSlot(chain, ctrl);
      if (s >= 0) covered.add(chain + ":" + s + ":" + dir);
    };
    for (const r of this.paintTraveled) {
      cover(r.chain, r.ctrl, r.dir);
      if (r.outChain !== undefined && r.outCtrl !== undefined && r.outDir) {
        cover(r.outChain, r.outCtrl, r.outDir);
      }
    }
    this.routesByJn = new Map();
    this.routedArms = new Set();
    this.fullJn = new Set();
    for (const [ji, list] of perJn) {
      this.routesByJn.set(
        ji,
        pickRoutes(
          list,
          (r) => (r.b ? [armKey(r.a), armKey(r.b)].sort().join("|") : armKey(r.a)),
          MAX_ROUTES
        )
      );
      const arms = this.junctionArms[ji].arms;
      if (arms.every((a) => covered.has(a.chain + ":" + a.slot + ":" + a.dir))) {
        this.fullJn.add(ji);
        continue;
      }
      for (const a of arms) {
        this.routedArms.add(a.chain + ":" + a.slot);
      }
    }
    // K169: a newly full web starts its fade in; K191: one that stopped being
    // full fades out, if it still holds a route (perJn) to blend over.
    this.webFade.retarget(this.fullJn, this.paintClock, perJn);
  }

  // The light per-frame paint pass: advances the pulse clock and rewrites
  // the UV buffers of affected chains (animated chains every tick, static
  // ones only when the declaration changed, dropped ones reset once) -
  // crossings recolor with them for free (their gaps are cut per pixel in
  // the same ribbons). Touches no positions and no splines - safe to run
  // while the physics sleeps. Also owns the flow-undulation clock
  // (it receives real dt every frame in all ticker branches, both modes).
  tickPaint(dt: number): void {
    knotUniformValues().uKBase[2] = this.paintDebug;
    knotUniformValues().uKLook![0] = this.threadLook; // K797b
    // K798: the border-at-a-time intros (mode, running) for the shader.
    const rm = this.r.revealFx.revealAnim?.mode;
    knotUniformValues().uKLook![1] = rm === "edges" ? 1 : rm === "edgesAll" ? 2 : 0;
    knotUniformValues().uKLook![2] = this.r.revealFx.revealAnim && !this.r.revealFx.revealAnim.done ? 1 : 0;
    knotUniformValues().uKPath![0] = this.goldWidth; // K799
    knotUniformValues().uKPath![1] = this.goldTexture;
    knotUniformValues().uKPath![2] = this.pulseWidth; // K813
    knotUniformValues().uKPath![3] = this.frayWidth; // K813
    knotUniformValues().uKLook![3] = this.borderWidth; // K820
    // K832: the border look's junction cut reach - the wedge fans'
    // reach L (the joinery's drawWedges gate, mirrored), so ribbon
    // strokes end where the fan rims begin; 0 while the fans are off.
    {
      const fh = this.style.threadWidth / 2;
      const cr = this.cuspRadius;
      const L = fh * FILLET_REACH_PER_HALF * cr;
      setFabricJunctionCut(cr > 0.05 && L > fh * 0.97 * 0.3 ? L : 0);
    }
    this.tickPaintPalette(dt);
    this.r.revealFx.tickAppearFx(dt);
    // Flow clock, advanced AFTER the palette/fillet pass so everything
    // rendered this frame (update()'s chain samples, the fillet
    // centroids) read ONE field time. Scaling the ACCUMULATOR by the live
    // speed keeps a flowSpeed slider change from phase-jumping the field,
    // which multiplying at evaluation time would.
    this.flowTime += dt * this.flowSpeed;
  }

  needsFxRender(): boolean {
    // K76 2b: the thread reveal changed what update() derives (a gap's
    // under window, a marker's gap - and the fabric's markers ride the pass).
    if (this.r.exploreUpdatePending) return true;
    if (!this.r.fxLive) return false;
    const U = knotUniformValues();
    if (U.uKFx[0] === FX_STYLE.rainbow && U.uKFx[3] > 0.5) return true;
    // Through the last gate's ramp: the CPU then writes it at full strength.
    return U.uKFx[2] < this.r.gateOpenAt + PAINT_CONST.CROSSING_FADE_IN;
  }

  // K6-1 (question 1), the frame loop's PAINT polls: what the gameplay
  // paint still animates. Bit 2 (PAINT_AMBIENT): pulses are declared (their
  // trains run on the paint clock for as long as they live). Bit 1 (PAINT):
  // the pulses' fade-in window, a hovered pulse's breath or a web fade
  // (K169). Paint rows written during a frame upload at its own render, so
  // no pending-upload term (a write between frames is an input's push).
  paintNeedsFrame(): number {
    if (!this.style.paletteMode) return 0;
    let need = 0;
    const pulses = this.paintPulses;
    if (pulses.length > 0) {
      need |= 2;
      if (this.paintClock - this.pulseBorn < PAINT_CONST.PULSE_FADE_IN) need |= 1;
      for (const p of pulses) {
        if (p.hovered) {
          need |= 1;
          break;
        }
      }
    }
    if (this.webFade.active) need |= 1;
    return need;
  }

  // THE PAINT CLOCK (G2): advanced once per frame by main.ts right after
  // the reveal animator's tick - BEFORE update() - so every CPU mirror
  // evaluation inside update() (reveal masks, crossing and joint gates) and
  // this frame's shader uniforms read one clock. Probes freeze the paint
  // animation by overriding this method (tickPaint no longer advances it).
  advanceClocks(dt: number): void {
    this.paintClock += dt;
    if (!this.r.fxLive) return;
    // REVEAL FX CLOCKS (G2.1), reduced here in float64 so no absolute
    // clock reaches the GPU: fxNow = wall seconds since the reveal began,
    // the anim clock, speed knots (the animator advanced by dt * speed
    // just before this call), and the burn flicker's phases mod 2 pi.
    const U = knotUniformValues();
    const anim = this.r.revealFx.revealAnim;
    const fxNow = this.paintClock - this.r.revealFx.revealWall0;
    if (anim) {
      const inv = 1 / Math.max(1e-6, anim.speed);
      const last = (this.r.revealFx.knotCount - 1) * 4;
      // (The knot table is f32: compare at f32 resolution.)
      if (!anim.done && Math.abs(U.uKKnots[last + 2] - inv) > 1e-6 * inv) {
        this.r.revealFx.addKnot(anim.clock - dt * anim.speed, fxNow - dt, inv);
      }
      U.uKFx[1] = anim.clock;
      // The FX tail starts once the last front has finished.
      if (anim.done && this.r.revealFx.fxEnd === Infinity) this.r.revealFx.fxEnd = fxNow + FX_TAIL;
    }
    U.uKFx[2] = fxNow;
    const revealOn = anim !== null && !anim.done;
    U.uKFx2[2] = revealOn ? 1 : 0;
    const fxOn = revealOn || fxNow < this.r.revealFx.fxEnd;
    U.uKFx[3] = fxOn ? 1 : 0;
    // The burn flicker runs on the REVEAL clock (fxNow), not the absolute
    // paint clock: an instant of the reveal then renders the same whatever
    // happened before it (the old phase was the page's paint clock).
    const TAU = Math.PI * 2;
    const c = fxNow;
    U.uKFx2[0] = (13 * c) % TAU;
    U.uKFx2[1] = (29 * c) % TAU;
    U.uKFx2[3] = 0.3 * Math.sin(13 * c) + 0.2 * Math.sin(29 * c);
    this.r.revealFx.syncFxStyle();
    if (!fxOn) {
      this.r.fxLive = false;
      this.r.gateOpenAt = -Infinity;
    }
  }

  /** @internal ribbon */ tickPaintPalette(_dt: number): void {
    if (!this.style.paletteMode) return;
    // GAMEPLAY PAINT (G2.3): every pixel evaluates the declaration (KPAINT,
    // written by setPaint when it changes) and the reveal glow; the tick
    // only reduces the animation clocks to uniforms - in float64, mod the
    // crest spacing, so no absolute clock reaches the GPU.
    const U = knotUniformValues();
    const clock = this.paintClock;
    const spacing = Math.max(0.5, this.pulseSpacing);
    const modS = (x: number): number => x - spacing * Math.floor(x / spacing);
    U.uKPulse[0] = modS(clock * PAINT_CONST.PULSE_SPEED);
    U.uKPulse[1] = modS((clock + PAINT_CONST.PULSE_OUT_LEAD) * PAINT_CONST.PULSE_SPEED);
    U.uKPulse[2] = spacing;
    const fi = Math.min(1, Math.max(0, (clock - this.pulseBorn) / PAINT_CONST.PULSE_FADE_IN));
    U.uKPulse[3] = fi * fi * (3 - 2 * fi);
    // The trains' and the hover's reach window (finite on the GPU: 1e6 =
    // whole arms).
    const reach = Math.min(1e6, Math.max(0, this.pulseReach));
    U.uKReach[0] = reach;
    U.uKReach[1] = Math.min(PAINT_CONST.PULSE_REACH_FADE, 0.5 * reach);
    // Hover: a slow breath between 0.2 and 0.8 strength, out to the reach.
    U.uKPaint[3] = 0.5 + 0.3 * Math.sin(clock * PAINT_CONST.HOVER_PULSE_W);
    // K145, the hover glow: its strength (steady, no breath) and the hover
    // point; its item follows the strength turning on or off.
    this.syncRimItem();
    U.uKReach[2] = this.paintRim ? Math.max(0, this.hoverGlow) : 0;
    U.uKReach[3] = this.rimAt;
    // K111 stage 4: its width, as the scale kRimAcross reads (1 at the default).
    U.uKGold[3] = kRimScale(this.hoverGlowWidth);
    // K298: its own length and end fade (the shader floors both at 1e-4).
    U.uKSect[2] = Math.min(1e6, Math.max(0, this.hoverGlowLength));
    U.uKSect[3] = Math.max(0, this.hoverGlowFade);
    // K111 stage 4: High contrast's highlight prototype (0 = the pulses).
    U.uKBase[1] = this.hcLook;
    // K525, the telegraph rims: their items follow the route and the
    // strength turning on or off; the colour and the strength are uniforms
    // (0 while no item is written, so the paint is the telegraph-less one).
    this.syncTeleItem();
    const T = U.uKTele;
    if (T) {
      const tc = this.teleColor;
      T[0] = ((tc >> 16) & 255) / 255;
      T[1] = ((tc >> 8) & 255) / 255;
      T[2] = (tc & 255) / 255;
      T[3] = this.teleKey !== "" ? Math.max(0, this.teleStrength) : 0;
    }
    // K813: the highlights' colors; the telegraph rims' across scale.
    if (U.uKHlPulse) {
      const pc = this.pulseColor;
      U.uKHlPulse[0] = ((pc >> 16) & 255) / 255;
      U.uKHlPulse[1] = ((pc >> 8) & 255) / 255;
      U.uKHlPulse[2] = (pc & 255) / 255;
      U.uKHlPulse[3] = this.goldTextureStrength; // K820: the gold grain
    }
    if (U.uKBorder) {
      const bc = this.borderColor;
      U.uKBorder[0] = ((bc >> 16) & 255) / 255;
      U.uKBorder[1] = ((bc >> 8) & 255) / 255;
      U.uKBorder[2] = (bc & 255) / 255;
      U.uKBorder[3] = bc === 0 ? 0 : 1; // 0 = auto darkened stroke
    }
    if (U.uKHlHover) {
      const hc = this.hoverColor;
      U.uKHlHover[0] = ((hc >> 16) & 255) / 255;
      U.uKHlHover[1] = ((hc >> 8) & 255) / 255;
      U.uKHlHover[2] = (hc & 255) / 255;
      U.uKHlHover[3] = 1 / Math.max(0.05, this.telegraphWidth);
    }
    if (U.uKHlFray) {
      const fc = this.frayColor;
      U.uKHlFray[0] = ((fc >> 16) & 255) / 255;
      U.uKHlFray[1] = ((fc >> 8) & 255) / 255;
      U.uKHlFray[2] = (fc & 255) / 255;
      U.uKHlFray[3] = fc === 0 ? 0 : 1; // 0 = auto pale
    }
    // K654: the riding end (the walking minotaur's spot), every frame.
    if (U.uKTeleAt) U.uKTeleAt[0] = this.teleAt;
    // Junction fillets ride the same tick: live positions, live paint.
    this.rebuildFillets();
    this.tickWebFade();
  }

  // K169: the arms ("chain:slot") of the webs fading, in or (K191) out, with
  // their level.
  /** @internal ribbon */ fadingArmLevels(): Map<string, number> {
    const out = new Map<string, number>();
    for (const [ji, lv] of this.webFade.levels(this.paintClock)) {
      for (const a of this.junctionArms[ji].arms) out.set(a.chain + ":" + a.slot, lv);
    }
    return out;
  }

  // K169: advance the fully traveled webs' fades, in and (K191) out. Each
  // fading web's J1.z (the level the junction shader blends its two bases
  // by) is rewritten in place - a texel and its row upload, no fillet
  // rebuild - and the caps' paint is rewritten at the same level. The step
  // that reaches 1 (or 0) writes it once; the fade is then forgotten and the
  // record is the K127 one (full) or an untraveled one.
  /** @internal ribbon */ tickWebFade(): void {
    if (!this.webFade.active) return;
    const steps = this.webFade.step(this.paintClock);
    const rd = recordData();
    let wrote = false;
    for (const [ji, lv] of steps) {
      const rb = this.recBaseByJn.get(ji);
      if (rb === undefined) continue;
      rd.data[(rb + 1) * 4 + 2] = lv;
      rd.markDirty(rb + 1, rb + 2);
      wrote = true;
    }
    if (wrote) rd.flush();
    if (this.style.paletteMode) this.writePaintItems();
  }

  // The path color as the uKGold uniform (0xRRGGBB -> 0..1 floats).
  /** @internal ribbon */ syncGold(): void {
    const g = this.style.pathColor ?? 0xffd24a;
    const U = knotUniformValues();
    U.uKGold[0] = ((g >> 16) & 255) / 255;
    U.uKGold[1] = ((g >> 8) & 255) / 255;
    U.uKGold[2] = (g & 255) / 255;
  }

  // The declaration as KPAINT records (paint_math kPaintAt): items in the
  // retired pass's evaluation order (spans, caps, pulses), each referenced
  // from every control slot it can touch - spans and pulses over their ctrl
  // range, caps over their arc radius at the chain's tightest slot (doubled:
  // the knot keeps moving under a static declaration), every range widened
  // by a slot for the edge coverage ramp. Only changed texels upload.
  // K138 slice 4: the yarn's dye (the colors form's latest key), set
  // per move by main; the panel's recolor owns the color otherwise.
  setPathColor(hex: number): void {
    if (!this.style.paletteMode) return;
    if (this.style.pathColor !== hex) {
      this.style.pathColor = hex;
      this.syncGold();
    }
  }

  /** @internal ribbon */ writePaintItems(): void {
    const items: number[] = [];
    const n = this.ps.chains.length;
    const slots: Array<Array<number[] | undefined> | null> = new Array(n).fill(null);
    let overflow = 0;
    // The chains carrying gameplay paint (KGEOM G0.w): K76's VIS items set
    // none, so the paint evaluation stays gated on real paint.
    const painted = new Uint8Array(n);
    const touch = (chain: number, lo: number, hi: number, item: number): void => {
      const type = items[item * 8];
      if (
        type !== EXPLORE_ITEM_VIS &&
        type !== EXPLORE_ITEM_CHAR &&
        type !== EXPLORE_ITEM_FRONT &&
        type !== EXPLORE_ITEM_SMOLDER
      ) {
        painted[chain] = 1;
      }
      const len = this.ps.chains[chain].length;
      const closed = this.ps.chainBreakAfter[chain] < 0;
      let s0 = Math.floor(lo) - 1;
      let s1 = Math.floor(hi) + 1;
      if (!closed) {
        s0 = Math.max(0, s0);
        s1 = Math.min(len - 1, s1);
      } else if (s1 - s0 >= len) {
        s0 = 0;
        s1 = len - 1;
      }
      let sc = slots[chain];
      if (!sc) {
        sc = new Array(len);
        slots[chain] = sc;
      }
      for (let s = s0; s <= s1; s++) {
        const k = closed ? ((s % len) + len) % len : s;
        let l = sc[k];
        if (!l) {
          l = [];
          sc[k] = l;
        }
        if (l[l.length - 1] === item) continue;
        if (l.length >= 32) {
          overflow++;
          continue;
        }
        l.push(item);
      }
    };
    const minArcPerCtrl = (chain: number): number => {
      const smp = this.chainSamples[chain];
      if (!smp) return 0.05;
      const cal = smp.controlArcLengths;
      let m = Infinity;
      for (let k = 0; k + 1 < cal.length; k++) m = Math.min(m, cal[k + 1] - cal[k]);
      return Math.max(0.05, Number.isFinite(m) ? m : 0.05);
    };
    for (const s of this.paintSpans) {
      const i = items.length / 8;
      items.push(PAINT_ITEM.SPAN, s.c0, s.c1, s.p0 ?? 1, s.p1 ?? 1, 0, 0, 0);
      touch(s.chain, Math.min(s.c0, s.c1), Math.max(s.c0, s.c1), i);
    }
    // K137 fray (4.3's look): cracked runs, strength in T0.w (p0).
    for (const s of this.fraySpans) {
      const i = items.length / 8;
      items.push(PAINT_ITEM_FRAY, s.c0, s.c1, s.p0 ?? 1, 0, 0, 0, 0);
      touch(s.chain, Math.min(s.c0, s.c1), Math.max(s.c0, s.c1), i);
    }
    // K169: the caps of a web that is fading wear its level (K191: out as
    // well as in).
    const fadeArms = this.webFade.active ? this.fadingArmLevels() : null;
    for (const cp of this.paintCaps) {
      // K81: a routed junction's band and untraveled web decide its
      // pixels; a cap there would paint gold down every arm's ribbon. A
      // fully traveled one (K127) is not in routedArms: it keeps its caps.
      // K191: nor is one fading out (routed, no longer full): its caps stay
      // at its level until the fade ends.
      const armKey = cp.chain + ":" + this.routeArmSlot(cp.chain, cp.ctrl);
      const lvl = fadeArms?.get(armKey);
      if (lvl === undefined && this.routedArms.size > 0 && this.routedArms.has(armKey)) {
        continue;
      }
      const i = items.length / 8;
      items.push(
        PAINT_ITEM.CAP,
        cp.ctrl,
        cp.ctrl,
        (cp.p ?? 1) * (lvl ?? 1),
        0,
        0,
        cp.radius,
        0
      );
      const r = (2 * cp.radius) / minArcPerCtrl(cp.chain);
      touch(cp.chain, cp.ctrl - r, cp.ctrl + r, i);
    }
    for (const p of this.paintPulses) {
      const i = items.length / 8;
      const flags =
        (p.inward ? ITEM_FLAG.INWARD : 0) | (p.hovered ? ITEM_FLAG.HOVER : 0);
      items.push(PAINT_ITEM.PULSE, p.cJunction, p.cFar, p.dist0 ?? 0, 0, flags, p.cont ? 1 : 0, 0);
      touch(p.chain, Math.min(p.cJunction, p.cFar), Math.max(p.cJunction, p.cFar), i);
    }
    // K76: the thread reveal's visibility pieces (explore_glsl.ts), but
    // none on a whole chain (its flag answers without a scan).
    if (this.explorePieces) {
      for (const p of this.explorePieces) {
        if (p.chain >= n || this.exploreWhole[p.chain]) continue;
        const i = items.length / 8;
        items.push(...visItem(p));
        const [lo, hi] = visRange(p);
        touch(p.chain, lo, hi, i);
      }
      // K290: the char look's burnt stretches (kCharAt), whole chains too.
      for (const s of this.exploreBurn?.char ?? []) {
        if (s.chain >= n || !(s.b1 > s.b0)) continue;
        const i = items.length / 8;
        items.push(...charItem(s));
        const [lo, hi] = charRange(s);
        touch(s.chain, lo, hi, i);
      }
      // K290 stage 3b: the fire's fronts and the smoldering arms (kCharAt).
      // K409: a front's widths are world lengths; under gone (no char
      // spans) the whole ember lies ahead of the cut.
      const gone = this.exploreBurn?.char === null;
      for (const f of this.exploreBurn?.fronts ?? []) {
        if (f.chain >= n) continue;
        const i = items.length / 8;
        items.push(...frontItem(f, gone));
        const [lo, hi] = frontRange(f, gone, minArcPerCtrl(f.chain));
        touch(f.chain, lo, hi, i);
      }
      for (const s of this.exploreBurn?.smolder ?? []) {
        if (s.chain >= n || !(s.b1 > s.b0)) continue;
        const i = items.length / 8;
        items.push(...smolderItem(s));
        const [lo, hi] = charRange(s);
        touch(s.chain, lo, hi, i);
      }
    }
    // K525: the telegraph's route pieces, (TELE, c0, c1, alpha, gap0, gap1,
    // fade0, fade1), before the hover glow's RIM so that one stays last. A
    // junction end skips the web's reach (rimGap, as the glow does), a
    // mid-run end none. K654: a riding end (a mid-run end) writes its fade
    // NEGATIVE, which tells the shader to read its ctrl from uKTeleAt.x.
    this.teleKey = this.teleItemKey();
    if (this.teleKey !== "" && this.paintTele) {
      const gap = this.rimGap();
      for (const t of this.paintTele) {
        if (t.chain >= n || !(t.c1 > t.c0)) continue;
        const i = items.length / 8;
        items.push(
          PAINT_ITEM_TELE,
          t.c0,
          t.c1,
          t.alpha,
          t.j0 ? gap : 0,
          t.j1 ? gap : 0,
          t.ride === 0 ? -TELE_MID_FADE : t.j0 ? TELE_JUNCTION_FADE : TELE_MID_FADE,
          t.ride === 1 ? -TELE_MID_FADE : t.j1 ? TELE_JUNCTION_FADE : TELE_MID_FADE
        );
        touch(t.chain, t.c0, t.c1, i);
      }
    }
    // K145: the hover glow's run, (RIM, c0, c1, end gap).
    this.rimKey = this.rimItemKey();
    const rim = this.paintRim;
    if (this.rimKey !== "" && rim) {
      const i = items.length / 8;
      items.push(PAINT_ITEM.RIM, rim.c0, rim.c1, this.rimGap(), 0, 0, 0, 0);
      touch(rim.chain, rim.c0, rim.c1, i);
    }
    if (overflow > 0 && !this.paintOverflowWarned) {
      this.paintOverflowWarned = true;
      console.warn(`G2 paint: ${overflow} slot references beyond the shader's 32 per slot`);
    }
    this.paintScene.setPaintFlags(painted);
    this.lastPaintUpload = this.paintScene.setPaintItems(
      Float32Array.from(items),
      items.length / 8,
      slots
    );
  }
}
