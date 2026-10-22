// THE APPEARANCE REVEAL AND ITS FX (K5 R3): the Stage 22 reveal's state,
// masks and frontier glow, the G2.1 gate clocks (a crossing's or joint's
// show time and the caches that keep it cheap), and the Stage 26
// appearance particles. Moved verbatim from ribbon_renderer.ts
// (4c860ce9); a body changed in three ways only: a renderer member became
// `this.r.x`, a sampling helper `sampling.x(...)`, and the façade keeps
// one-line delegations for the names other code calls (beginReveal,
// revealMulAtCtrl, appearFxAlive, revealPin, gateStrength, jointGate,
// crossingShowTime) and accessors for revealOn, fxLive, appearFx and
// gateOpenAt (crossing_gaps writes the last). RibbonRenderer owns one
// RevealFx (its `revealFx`): update() runs the lifecycle and the gap
// pass's gate here; tickPaint calls tickAppearFx (docs/design/K5_R3.md).

import { Graphics } from "pixi.js";
import type { AppearFxMode } from "../../core/reveal_plan";
import type { RevealAnimator } from "../reveal";
import { AppearFxSystem } from "../appear_fx";
import type { RibbonRenderer } from "../ribbon_renderer";
import type { SplineSamples } from "../../geometry/spline_generator";
import type { CrossingPass } from "../../physics/particle_system";
import { FX_STYLE, PAINT_CONST } from "../paint_const";
import { knotUniformValues } from "../paint_model";
import * as sampling from "./sampling";
import {
  MAX_KNOTS,
  kCA,
  kChain,
  kFxAge,
  kFxDoneWall,
  kFxSettleWall,
  kIgnition,
  kRevealMaskAt,
  kRevealTime,
  kSampleArc,
  kSwell,
  kWall,
  smoothInv,
  sourcePieces,
} from "../paint_math";

const {
  REVEAL_TAPER_ARC,
  REVEAL_GLOW_ARC,
  RAINBOW_GLOW_ARC,
  RAINBOW_GLOW_HOLD,
} = PAINT_CONST;
// Comet streak tail polyline: points sampled along the host thread
// behind each reveal tip (spawnTipFrontier -> AppearFxSystem).
const FX_PATH_PTS = 8;
const FX_PATH_STEP = 0.5;
// Every appearance FX settles within this many wall seconds of its last
// ignition (burn's recovery, the longest, plus a margin): fxOn drops
// after. Exported: the façade's advanceClocks arms fxEnd with it.
export const FX_TAIL = PAINT_CONST.BURN_RECOVER_END + 0.15;
// Pass ctrl drift (ctrl units) under which a pending gate's show-time
// solve is reused (the gateCache below).
const GATE_CTRL_EPS = 0.1;
// Wall seconds after ignition the rainbow width swell lasts.
const RAINBOW_SWELL_END =
  PAINT_CONST.RAINBOW_HOLD +
  PAINT_CONST.RAINBOW_FADE * smoothInv(1 - PAINT_CONST.RAINBOW_SWELL_MIN_P);

export class RevealFx {
  readonly r: RibbonRenderer;
  constructor(r: RibbonRenderer) {
    this.r = r;
  }

  // The façade's shared state this part reads (the hub pattern of
  // ribbon/crossing_gaps.ts): the physics, the style, the paint scene,
  // update()'s mirrors and scratches, and the paint clock it pins.
  private get ps() { return this.r.ps; }
  private get style() { return this.r.style; }
  private get paintScene() { return this.r.paintScene; }
  private get kd() { return this.r.kd; }
  private get kcv() { return this.r.kcv; }
  private get ignTmp() { return this.r.ignTmp; }
  private get sampleScratch() { return this.r.sampleScratch; }
  private get flowScratch() { return this.r.flowScratch; }
  private get chainSamples() { return this.r.chainSamples; }
  private get root() { return this.r.root; }
  private get paintClock() { return this.r.paintClock; }
  private set paintClock(v: number) { this.r.paintClock = v; }
  private flowOffset(x: number, y: number, out: Float32Array): void {
    this.r.flowOffset(x, y, out);
  }
  private paintArcAt(samples: SplineSamples, ctrl: number, closed: boolean): number {
    return sampling.paintArcAt(samples, ctrl, closed);
  }
  private sampleAt(samples: SplineSamples, arc: number, out: Float32Array, offset: number): void {
    sampling.sampleAt(samples, arc, out, offset);
  }
  private renderCtrl(pass: CrossingPass): number {
    return sampling.renderCtrl(pass);
  }

  // update()'s reveal lifecycle: refresh the active flag, and on the
  // completion frame restore the full render exactly once.
  lifecycle(): void {
    const ra = this.revealAnim;
    this.revealOn = ra !== null && !ra.done;
    if (!this.revealOn && this.revealWas) this.finishReveal();
    this.revealWas = this.revealOn;
  }

  // Crossing VISIBILITY GATES (G2.1): a gated crossing's gap slot carries
  // its SHOW TIME (reveal-relative wall seconds, encoded in the slot's
  // strength) and the GPU ramps it in from the clock - no per-crossing
  // fade state on the CPU. `gateOpenAt` = the latest show time written this
  // frame (update() keeps running until it has passed, so the CPU-side
  // bookkeeping that follows a gate - underWindows, pluck footprints -
  // catches up).
  /** @internal ribbon */ gateOpenAt = -Infinity;
  // LATCHED show times (registered crossings by index; joints / lone caps
  // by key): once a gate has opened it keeps the time it opened at. The
  // estimate is re-solved every frame from the live arc tables, which keep
  // moving while the knot settles under the reveal - an open gap or fan
  // must never fade back out (master latched its fade start the same way).
  /** @internal ribbon */ gateLatch = new Float64Array(0);
  /** @internal ribbon */ jointLatch = new Map<string, [number, number]>();
  // Show-time CACHE for gates not yet open: an exact solve is reused while
  // its inputs are unchanged (gateRev: the speed knots, the FX style, the
  // reveal taper shape) and every point's ctrl stays
  // within GATE_CTRL_EPS of the solved one (a show time moves by about
  // 1/rate per ctrl - milliseconds per GATE_CTRL_EPS - while the solve was
  // update()'s largest new cost: every pending crossing, every frame).
  // Registered crossings: [tShow, overCtrl, underCtrl, gateRev] by index.
  /** @internal ribbon */ gateRev = 0;
  /** @internal ribbon */ gateCache = new Float64Array(0);
  /** @internal ribbon */ jointCache = new Map<
    string,
    { rev: number; ctrls: Float64Array; out: [number, number] }
  >();

  // REVEAL CLOCKS (G2.1; advanceClocks): the paint clock at reveal start
  // (fxNow = paintClock - revealWall0), the speed knot count, and the wall
  // time after which every appearance FX has settled (fxOn drops).
  /** @internal ribbon */ revealWall0 = 0;
  /** @internal ribbon */ knotCount = 1;
  /** @internal ribbon */ fxEnd = -Infinity;
  // Whether the live reveal (or its FX tail) is attached to the shaders.
  /** @internal ribbon */ fxLive = false;
  private widthScratch = new Map<number, Float32Array>();

  // REVEAL state (Stage 22): the animator, the per-chain width masks
  // (null = fully revealed - the zero-cost resting state), the frontier
  // tips cached once per paint tick for the glow, and the knot-mode tip
  // glow overlay. `revealOn` is refreshed at the top of update() and read
  // by the paint/fillet/emergent passes in the same frame.
  /** @internal ribbon */ revealAnim: RevealAnimator | null = null;
  /** @internal ribbon */ revealOn = false;
  /** @internal ribbon */ revealWas = false;
  /** @internal ribbon */ revealMask: (Float32Array | null)[] = [];
  /** @internal ribbon */ revealMaskPool = new Map<number, Float32Array>();
  private revealTipGfx: Graphics | null = null;
  // APPEARANCE FX (Stage 26): frontier particles while revealing. The
  // style is synced from params every tick (live dropdown switches, no
  // rebuild); the pooled system + its ParticleContainer are created
  // lazily on the first revealing frame with a non-none style and then
  // live for the renderer's lifetime (the shared texture is page-lifetime
  // - see appear_fx.ts).
  appearFx: AppearFxMode = "none";
  private appearFxSys: AppearFxSystem | null = null;
  private fxScanStart = 0;
  // Reusable tail polyline handed to comet streak emission (consumed
  // synchronously per frontier).
  private fxPathScratch = new Float32Array(FX_PATH_PTS * 2);

  // --- REVEAL (Stage 22 appearance animation; G2.1 per-pixel FX) ---

  // Attach a running appearance animator; masks start collapsed and grow
  // as the animator's clock advances. Passing null (or the animator
  // finishing) restores the exact non-reveal render. G2.1: the plan's
  // sources (or ink's per-control ignition times) go to the GPU once, here;
  // every pixel then finds its own ignition time, so the FX need no
  // per-frame CPU state - a Replay simply starts a fresh clock.
  beginReveal(anim: RevealAnimator | null): void {
    this.revealAnim = anim;
    this.revealMask = this.ps.chains.map(() => null);
    // Fresh reveal, fresh particle field: a Replay-settle resets particle
    // positions, and motes from the previous run would float over the
    // re-angular knot.
    this.appearFxSys?.clear();
    const U = knotUniformValues();
    if (!anim) {
      this.paintScene.setReveal(null, null);
      this.fxLive = false;
      this.fxEnd = -Infinity;
      this.gateOpenAt = -Infinity;
      U.uKFx[3] = 0;
      U.uKFx2[2] = 0;
      U.uKInk[1] = 0;
      return;
    }
    const plan = anim.planData;
    const nCh = this.ps.chains.length;
    if (anim.mode === "ink") {
      // INK IS STATELESS (G2.1): every control's ignition time from its
      // REVEAL-START position (physics + flow, the dye origin likewise) -
      // the dye no longer re-reads settling positions, its edge wobble is
      // the same seeded noise, and the duration is exact.
      const o = plan.origin;
      const olen = this.ps.chains[o.chain].length;
      this.ps.pointOnChain(
        o.chain,
        ((o.ctrl % olen) + olen) % olen,
        this.sampleScratch,
        0
      );
      this.flowOffset(this.sampleScratch[0], this.sampleScratch[1], this.flowScratch);
      const ox = this.sampleScratch[0] + this.flowScratch[0];
      const oy = this.sampleScratch[1] + this.flowScratch[1];
      const pos = this.ps.positions;
      let maxT = 0;
      const tig = this.ps.chains.map((chain) => {
        const out = new Float32Array(chain.length);
        for (let k = 0; k < chain.length; k++) {
          let x = pos[chain[k] * 2];
          let y = pos[chain[k] * 2 + 1];
          this.flowOffset(x, y, this.flowScratch);
          x += this.flowScratch[0];
          y += this.flowScratch[1];
          const d = Math.max(0, Math.hypot(x - ox, y - oy) + anim.inkPerturb(x, y));
          out[k] = d / plan.inkSpeed;
          if (out[k] > maxT) maxT = out[k];
        }
        return out;
      });
      anim.setDuration(maxT + PAINT_CONST.INK_TAPER_WORLD / plan.inkSpeed);
      this.paintScene.setReveal(null, tig, plan.inkSpeed);
    } else {
      const pieces = [];
      for (let c = 0; c < nCh; c++) {
        pieces.push(
          sourcePieces(
            plan.sources[c],
            this.ps.chains[c].length,
            this.ps.chainBreakAfter[c] < 0
          )
        );
      }
      this.paintScene.setReveal(pieces, null, plan.inkSpeed);
      if (this.paintScene.hintOverflow > 0) {
        console.warn(
          `G2 reveal: ${this.paintScene.hintOverflow} control slots are ` +
            "touched by more sources than the shader scans"
        );
      }
    }
    // Clocks: fxNow counts wall seconds from now; one speed knot.
    this.revealWall0 = this.paintClock;
    const K = U.uKKnots;
    K.fill(0);
    K[0] = 0;
    K[1] = 0;
    K[2] = 1 / Math.max(1e-6, anim.speed);
    K[3] = 1;
    this.knotCount = 1;
    this.fxLive = true;
    this.fxEnd = Infinity;
    this.gateOpenAt = Infinity;
    if (this.gateLatch.length !== this.ps.crossings.length) {
      this.gateLatch = new Float64Array(this.ps.crossings.length);
    }
    this.gateLatch.fill(Number.NaN);
    this.jointLatch.clear();
    this.gateRev++;
    if (this.gateCache.length !== 4 * this.ps.crossings.length) {
      this.gateCache = new Float64Array(4 * this.ps.crossings.length);
    }
    this.gateCache.fill(Number.NaN);
    this.jointCache.clear();
    U.uKInk[0] = plan.inkSpeed;
    U.uKInk[1] = anim.mode === "ink" ? 1 : 0;
    U.uKFx[1] = 0;
    U.uKFx[2] = 0;
    U.uKFx[3] = 1;
    U.uKFx2[2] = 1;
    this.syncFxStyle();
  }

  // The FX style and frontier shape uniforms from the live dropdown. Knot
  // mode never wears appearance colors (as before G2); ink never burns
  // (it has no fronts - unchanged behavior, K4).
  /** @internal ribbon */ syncFxStyle(): void {
    const U = knotUniformValues();
    const ink = this.revealAnim?.mode === "ink" || U.uKInk[1] > 0.5;
    let st: number = FX_STYLE[this.appearFx];
    if (!this.style.paletteMode) st = FX_STYLE.none;
    if (ink && (st === FX_STYLE.burn || st === FX_STYLE.roots)) st = FX_STYLE.none;
    const was0 = U.uKFx[0];
    const was1 = U.uKShape[0];
    const was2 = U.uKShape[1];
    U.uKFx[0] = st;
    const [taperMul, tipFloor] = this.revealShape();
    U.uKShape[0] = REVEAL_TAPER_ARC * taperMul;
    U.uKShape[1] = tipFloor;
    // Show-time inputs changed: cached gate solves lapse.
    if (U.uKFx[0] !== was0 || U.uKShape[0] !== was1 || U.uKShape[1] !== was2) {
      this.gateRev++;
    }
    const rainbow = this.appearFx === "rainbow";
    U.uKShape[2] = rainbow ? RAINBOW_GLOW_ARC : REVEAL_GLOW_ARC;
    U.uKShape[3] = rainbow ? RAINBOW_GLOW_ARC * RAINBOW_GLOW_HOLD : 0;
  }

  // Append a speed knot (anim time, reveal wall time, 1 / speed). A knot
  // within one frame of the last one REPLACES its speed (slider drags);
  // a full table folds history that is long since cooled (every FX settles
  // within FX_TAIL of ignition) into the FLOOR knot (wall -1e4, inv 0).
  /** @internal ribbon */ addKnot(animT: number, wallT: number, inv: number): void {
    this.gateRev++; // Every path below edits the table (gate caches lapse).
    const K = knotUniformValues().uKKnots;
    const last = (this.knotCount - 1) * 4;
    if (wallT - K[last + 1] < 1 / 30) {
      // Re-anchor the last knot so the curve stays continuous at animT.
      const w = K[last + 1] + (animT - K[last]) * K[last + 2];
      K[last] = animT;
      K[last + 1] = w;
      K[last + 2] = inv;
      return;
    }
    if (this.knotCount >= MAX_KNOTS) {
      // Drop knots whose successor started before (now - FX_TAIL): their
      // material is fully cooled whatever wall time it maps to.
      let keep = 1;
      while (keep < this.knotCount - 1 && K[(keep + 1) * 4 + 1] < wallT - FX_TAIL) {
        keep++;
      }
      if (keep > 1) {
        const tail = K.slice(keep * 4, this.knotCount * 4);
        K.fill(0, 4);
        K[0] = 0;
        K[1] = -1e4;
        K[2] = 0;
        K[3] = 1;
        K.set(tail, 4);
        this.knotCount = 1 + tail.length / 4;
      }
      if (this.knotCount >= MAX_KNOTS) {
        const l = (this.knotCount - 1) * 4;
        const w = K[l + 1] + (animT - K[l]) * K[l + 2];
        K[l] = animT;
        K[l + 1] = w;
        K[l + 2] = inv;
        return;
      }
    }
    const o = this.knotCount * 4;
    K[o] = animT;
    K[o + 1] = wallT;
    K[o + 2] = inv;
    K[o + 3] = 1;
    this.knotCount++;
  }

  // Reveal multiplier at a chain ctrl (1 once fully revealed / inactive).
  // Public: the fabric overlay gates its exit marker on this, and main.ts
  // wires it through to probes.
  revealMulAtCtrl(chain: number, ctrl: number): number {
    const mask = this.revealMask[chain];
    if (!mask) return 1;
    const samples = this.chainSamples[chain];
    if (!samples || samples.totalLength <= 0) return 0;
    const closed = this.ps.chainBreakAfter[chain] < 0;
    const arc = this.paintArcAt(samples, ctrl, closed);
    const count = mask.length;
    const k = closed
      ? Math.round((arc / samples.totalLength) * count) % count
      : Math.max(
          0,
          Math.min(
            count - 1,
            Math.round((arc / samples.totalLength) * (count - 1))
          )
        );
    return mask[k];
  }

  // Per-style frontier shaping, [taper multiplier, tip width floor] (the
  // uKShape uniforms; the mask and the per-pixel ages read them).
  private revealShape(): [number, number] {
    switch (this.appearFx) {
      case "comet":
        return [8, 0.5];
      case "rainbow":
        // A short rounded head that blooms straight into the width swell
        // - the old long needle taper hid the swell.
        return [1.6, 0.55];
      case "roots":
        return [16, 0];
      default:
        return [1, 0];
    }
  }

  // The wall time (reveal-relative) from which chain `chain`'s appearance
  // FX are all the identity (KGEOM G0.z; paint_math kFxDoneWall): the
  // shaders skip the FX evaluation there. 1e9 = never skip.
  /** @internal ribbon */ chainFxDone(chain: number): number {
    if (!this.fxLive) return 1e9;
    return kFxDoneWall(knotUniformValues(), this.paintScene.revealSpan(chain)[1]);
  }

  // The wall time (reveal-relative) a crossing pass may show its gap: its
  // reveal mask has reached REVEAL_CROSSING_MIN and its appearance FX have
  // settled (rainbow past its swell, dust/comet opaque). The GPU ramps the
  // gap in from it (paint_math kRevealTime / kFxSettleWall).
  /** @internal ribbon */ passShowTime(chain: number, ctrl: number): number {
    const D = this.kd;
    const U = knotUniformValues();
    const c = this.kcv[chain] ?? kChain(D, chain);
    const n = c.nCtrl;
    const x = c.closed ? ctrl - n * Math.floor(ctrl / n) : Math.max(0, Math.min(n - 1, ctrl));
    const g = kIgnition(D, U, c, x, this.ignTmp);
    const fallback = this.revealAnim ? this.revealAnim.planDuration : 0;
    const tRev = kRevealTime(D, U, c, g, x, fallback);
    return Math.max(kWall(U, tRev), kFxSettleWall(U, g));
  }

  // A joint's (or a lone cap's) gate texel J1 = (tOn, tLast), wall times:
  // shown once every given point is revealed, fading in as the latest-
  // ignited one's appearance FX settles (paint_glsl knotFanAlpha).
  // Ungated (no reveal, FX settled): far past.
  /** @internal ribbon */ jointGate(
    key: string,
    points: Array<[number, number]>
  ): [number, number] {
    if (!this.fxLive) return [-1e9, -1e9];
    const D = this.kd;
    const U = knotUniformValues();
    const fallback = this.revealAnim ? this.revealAnim.planDuration : 0;
    let tOn = -1e9;
    let tLast = -1e9;
    // Open joints keep their times (latched; nothing left to solve).
    const L = this.jointLatch.get(key);
    if (L !== undefined) return L;
    // A pending joint reuses its last solve while its points hold still
    // (see gateCache).
    const C = this.jointCache.get(key);
    let fresh = C !== undefined && C.rev === this.gateRev && C.ctrls.length === points.length;
    for (let i = 0; fresh && i < points.length; i++) {
      if (Math.abs(points[i][1] - C!.ctrls[i]) >= GATE_CTRL_EPS) fresh = false;
    }
    let out: [number, number];
    if (fresh) {
      out = C!.out;
    } else {
      for (const [chain, ctrl] of points) {
        const c = this.kcv[chain] ?? kChain(D, chain);
        const n = c.nCtrl;
        const x = c.closed
          ? ctrl - n * Math.floor(ctrl / n)
          : Math.max(0, Math.min(n - 1, ctrl));
        const g = kIgnition(D, U, c, x, this.ignTmp);
        tOn = Math.max(tOn, kWall(U, kRevealTime(D, U, c, g, x, fallback)));
        if (g.hit) tLast = Math.max(tLast, kWall(U, g.tA));
      }
      out = [tOn, tLast];
      const ctrls = C && C.ctrls.length === points.length ? C.ctrls : new Float64Array(points.length);
      for (let i = 0; i < points.length; i++) ctrls[i] = points[i][1];
      this.jointCache.set(key, { rev: this.gateRev, ctrls, out });
    }
    if (U.uKFx[2] >= out[0]) {
      this.jointLatch.set(key, out);
      this.jointCache.delete(key);
    }
    return out;
  }

  // A crossing's show time (-Infinity when no reveal / FX gates it).
  /** @internal ribbon */ crossingShowTime(crossing: {
    over: CrossingPass;
    under: CrossingPass;
  }): number {
    if (!this.fxLive) return -Infinity;
    return Math.max(
      this.passShowTime(crossing.over.chain, this.renderCtrl(crossing.over)),
      this.passShowTime(crossing.under.chain, this.renderCtrl(crossing.under))
    );
  }

  // The gap slot strength for a show time: 1 (ungated or long open), or the
  // GATED encoding -(1 + tShow) the gap shader ramps from the clock
  // (gap_mask.ts). Tracks the latest pending show time (gateOpenAt).
  /** @internal ribbon */ gateStrength(tShow: number, fxNow: number): number {
    if (!(tShow > -1e8) || fxNow >= tShow + PAINT_CONST.CROSSING_FADE_IN) {
      return 1;
    }
    if (tShow > this.gateOpenAt) this.gateOpenAt = tShow;
    return -(1 + Math.max(0, tShow));
  }

  // One chain's ribbon WIDTH multiplier for this frame (CPU mirror of the
  // reveal mask, times the rainbow swell), or null when every sample is at
  // full width - the fills then take their untouched fast path, so the
  // finished state is bit-identical to a non-reveal render. Also records
  // the pure mask in revealMask[chain] (null = fully revealed).
  /** @internal ribbon */ widthMulFor(chain: number, samples: SplineSamples): Float32Array | null {
    this.revealMask[chain] = null;
    if (!this.fxLive) return null;
    const U = knotUniformValues();
    const reveal = this.revealOn;
    const swell = U.uKFx[0] === FX_STYLE.rainbow && U.uKFx[3] > 0.5;
    if (!reveal && !swell) return null;
    const D = this.kd;
    const c = this.kcv[chain];
    const count = samples.count;
    let mask = this.revealMaskPool.get(chain);
    if (!mask || mask.length !== count) {
      mask = new Float32Array(count);
      this.revealMaskPool.set(chain, mask);
    }
    let width = this.widthScratch.get(chain);
    if (!width || width.length !== count) {
      width = new Float32Array(count);
      this.widthScratch.set(chain, width);
    }
    const n = c.nCtrl;
    const t = U.uKFx[1];
    // FAST PATHS from the chain's reveal window (anim seconds, from the
    // plan): wholly revealed (and past its swell) -> null; not started ->
    // all zero.
    const [tStart, tDone] = this.paintScene.revealSpan(chain);
    const swellHere =
      swell && t >= tStart && U.uKFx[2] < kWall(U, tDone) + RAINBOW_SWELL_END;
    const maskDone = !reveal || t >= tDone;
    if (maskDone && !swellHere) return null;
    if (reveal && t < tStart) {
      mask.fill(0);
      this.revealMask[chain] = mask;
      return mask;
    }
    let minM = 1;
    let anyW = false;
    let slot = 0;
    for (let k = 0; k < count; k++) {
      // The sample's ctrl: the bake's monotone walk over this frame's arc
      // table (paint_math kCtrlOfArc, incrementally).
      const a = kSampleArc(c, k);
      while (slot < n - 1 && kCA(D, c, slot + 1) <= a) slot++;
      const a0 = kCA(D, c, slot);
      const a1 = slot < n - 1 ? kCA(D, c, slot + 1) : c.total;
      const ctrl = slot + (a1 > a0 ? Math.min(1, (a - a0) / (a1 - a0)) : 0);
      const m = maskDone ? 1 : kRevealMaskAt(D, U, c, ctrl);
      mask[k] = m;
      if (m < minM) minM = m;
      let w = m;
      if (swellHere && m > 0) {
        const g = kIgnition(D, U, c, ctrl, this.ignTmp);
        if (g.hit && t >= g.tA) w *= kSwell(kFxAge(U, g));
      }
      width[k] = w;
      if (w !== 1) anyW = true;
    }
    if (reveal && minM < 1) this.revealMask[chain] = mask;
    return anyW ? width : null;
  }

  // One-shot restore when the animator completes (or is detached): masks
  // dropped, tip glow cleared (every crossing's gap slot is rewritten by
  // this same update). The next paint tick clears any frontier glow (its
  // chain set goes empty). The FX tail (fxEnd) is armed by advanceClocks.
  private finishReveal(): void {
    this.revealAnim = null;
    this.revealMask = this.ps.chains.map(() => null);
    this.revealTipGfx?.clear();
  }

  // Knot-mode frontier glow: small additive discs at the advancing tips
  // (fabric mode rides the palette instead - flat overlays cannot
  // represent the blended field there).
  /** @internal ribbon */ drawRevealTips(): void {
    if (this.style.paletteMode) return;
    const anim = this.revealAnim;
    const active = this.revealOn && anim !== null && anim.mode !== "ink";
    if (!active) {
      this.revealTipGfx?.clear();
      return;
    }
    if (!this.revealTipGfx) {
      // NORMAL blending, deliberately: the canvas is TRANSPARENT (Stage
      // 18 - gaps clip the thread layer), so an additive halo over empty
      // canvas adds into nothing and composites as a muddy grey disc on
      // the page backdrop. Bright warm fills under normal blending read
      // as a glow over both the backdrop and the threads.
      this.revealTipGfx = new Graphics();
      this.root.addChild(this.revealTipGfx);
    }
    const g = this.revealTipGfx;
    g.clear();
    const tw = this.style.threadWidth;
    for (const tip of anim!.tips()) {
      const len = this.ps.chains[tip.chain].length;
      const closed = this.ps.chainBreakAfter[tip.chain] < 0;
      const f = closed
        ? ((tip.ctrl % len) + len) % len
        : Math.max(0, Math.min(len - 1, tip.ctrl));
      this.ps.pointOnChain(tip.chain, f, this.sampleScratch, 0);
      this.flowOffset(
        this.sampleScratch[0],
        this.sampleScratch[1],
        this.flowScratch
      );
      const x = this.sampleScratch[0] + this.flowScratch[0];
      const y = this.sampleScratch[1] + this.flowScratch[1];
      g.circle(x, y, tw * 1.35);
      g.fill({ color: 0xffedb8, alpha: 0.26 });
      g.circle(x, y, tw * 0.75);
      g.fill({ color: 0xfff6d8, alpha: 0.6 });
      g.circle(x, y, tw * 0.4);
      g.fill({ color: 0xffffff, alpha: 0.95 });
    }
  }

  // Live particle count (diagnostics / probes).
  appearFxAlive(): number {
    return this.appearFxSys?.aliveCount ?? 0;
  }


  // PROBE: pin the running reveal at anim time `t` (and the FX clock at its
  // wall time through the speed knots), then stop both clocks - the next
  // update() evaluates masks and gates there, and the shaders render that
  // instant. Returns false when no reveal is attached.
  revealPin(t: number): boolean {
    const anim = this.revealAnim;
    if (!anim) return false;
    const a = anim as unknown as { t: number; done: boolean; tick: () => void };
    a.t = t;
    a.done = t >= anim.planDuration;
    a.tick = () => {};
    this.paintClock = this.revealWall0 + kWall(knotUniformValues(), t);
    if (!anim.done) this.fxEnd = Infinity;
    Object.getPrototypeOf(this.r).advanceClocks.call(this.r, 0);
    this.r.advanceClocks = () => {};
    return true;
  }

  // APPEARANCE FX: spawn at every advancing frontier, then advance the
  // pool. Runs with tickPaint in every ticker branch (awake, asleep,
  // paused) so the particles keep flying while the physics sleeps. With no
  // system and no reveal this is a two-compare early-return, and once the
  // reveal ends the pool drains and tick() degenerates to one compare -
  // zero per-frame work after the field empties. Spawning skips while the
  // tab is hidden (a resumed tab would burst the whole backlog at once).
  /** @internal ribbon */ tickAppearFx(dt: number): void {
    const anim = this.revealAnim;
    const emitting =
      this.revealOn && anim !== null && this.appearFx !== "none";
    if (!this.appearFxSys) {
      if (!emitting) return;
      this.appearFxSys = new AppearFxSystem((this.style.flowSeed ?? 1) >>> 0);
      // Topmost thread-layer child: above every ribbon/fill (and the
      // knot-mode tip glow, created by this frame's earlier update()).
      this.root.addChild(this.appearFxSys.container);
    }
    const fx = this.appearFxSys;
    if (emitting && !document.hidden) {
      fx.style = this.appearFx as Exclude<AppearFxMode, "none">;
      fx.unit = this.style.threadWidth;
      if (anim!.mode === "ink") this.spawnInkFrontier(fx, anim!, dt);
      else this.spawnTipFrontier(fx, anim!, dt);
    }
    fx.tick(dt);
  }

  // Interval modes (trace/bloom/draw): one emitter per advancing reveal
  // tip. Position and tangent come from the live chain samples through the
  // clamping paint-arc path (the arc-wrap family bites open-chain
  // terminals otherwise), so emitters ride flow displacement and tip tucks
  // exactly like the ribbons. The travel direction is the sample tangent
  // signed by the plan's ctrl-axis dir; speed converts ctrl/s to world
  // units through the chain's arc-per-ctrl.
  private spawnTipFrontier(
    fx: AppearFxSystem,
    anim: RevealAnimator,
    dt: number
  ): void {
    const tips = anim.tips();
    if (tips.length === 0) return;
    // Rotate which tip gets first claim on the pool budget.
    const offset = this.fxScanStart++ % tips.length;
    for (let k = 0; k < tips.length; k++) {
      const tip = tips[(k + offset) % tips.length];
      const samples = this.chainSamples[tip.chain];
      if (!samples || samples.totalLength <= 0) continue;
      const closed = this.ps.chainBreakAfter[tip.chain] < 0;
      const arc = this.paintArcAt(samples, tip.ctrl, closed);
      const perCtrl =
        samples.totalLength / Math.max(1, this.ps.chains[tip.chain].length);
      // Comet streaks lie along the HOST THREAD: hand the emitter a short
      // polyline over the revealed side (tip backward), so its strokes
      // orient to the thread's local tangents instead of the head chord.
      // Built BEFORE the tip sample below - both share sampleScratch.
      let path: Float32Array | null = null;
      let pathPts = 0;
      if (this.appearFx === "comet") {
        path = this.fxPathScratch;
        pathPts = FX_PATH_PTS;
        for (let j = 0; j < FX_PATH_PTS; j++) {
          const aj = arc - tip.dir * j * FX_PATH_STEP;
          this.sampleAt(samples, aj, this.sampleScratch, 0);
          path[j * 2] = this.sampleScratch[0];
          path[j * 2 + 1] = this.sampleScratch[1];
        }
      }
      this.sampleAt(samples, arc, this.sampleScratch, 0);
      fx.spawnFrontier(
        this.sampleScratch[0],
        this.sampleScratch[1],
        this.sampleScratch[2] * tip.dir,
        this.sampleScratch[3] * tip.dir,
        tip.rate * anim.speed * perCtrl,
        dt,
        path,
        pathPts
      );
    }
  }

  // Ink mode has no plan tips (the dye front is a world-distance field);
  // the frontier is wherever a chain's mask crosses half-reveal. Scan the
  // live masks for 0.5-crossings between adjacent samples and emit there,
  // travel direction toward the unrevealed side, speed = the dye's radial
  // rate. Budgeted + chain-rotated so dye rings that slice many threads
  // neither explode the spawn count nor starve high-numbered chains.
  private spawnInkFrontier(
    fx: AppearFxSystem,
    anim: RevealAnimator,
    dt: number
  ): void {
    const chains = this.ps.chains.length;
    if (chains === 0) return;
    const speed = anim.inkRate;
    const start = this.fxScanStart++ % chains;
    let budget = 48;
    for (let ci = 0; ci < chains && budget > 0; ci++) {
      const chain = (ci + start) % chains;
      const mask = this.revealMask[chain];
      if (!mask) continue;
      const samples = this.chainSamples[chain];
      if (!samples || samples.totalLength <= 0) continue;
      const count = mask.length;
      const closed = this.ps.chainBreakAfter[chain] < 0;
      const arcPer = closed
        ? samples.totalLength / count
        : samples.totalLength / (count - 1);
      const lim = closed ? count : count - 1;
      for (let k = 0; k < lim && budget > 0; k++) {
        const m0 = mask[k];
        const m1 = mask[(k + 1) % count];
        if (m0 === m1 || (m0 - 0.5) * (m1 - 0.5) > 0) continue;
        const f = (0.5 - m0) / (m1 - m0);
        this.sampleAt(samples, (k + f) * arcPer, this.sampleScratch, 0);
        const dir = m0 > m1 ? 1 : -1; // Toward the unrevealed side.
        fx.spawnFrontier(
          this.sampleScratch[0],
          this.sampleScratch[1],
          this.sampleScratch[2] * dir,
          this.sampleScratch[3] * dir,
          speed,
          dt
        );
        budget--;
      }
    }
  }

}
