// THE RENDER-ONLY PLUCKS' HOST (K5 R4): the PluckHost the overlay
// (pluck_overlay.ts, unmoved) reads - every registered crossing pass,
// fused junction, marker disc and chain end as a node; the thread's
// composed colour at an arc; the per-chain collapse the overlay
// installs, composed into the width multiplier - plus the calls that
// start and tick plucks. Moved verbatim from ribbon_renderer.ts
// (2ba92123); a body changed in three ways only: a renderer member
// became `this.r.x`, a sampling helper `sampling.x(...)`, and the
// façade keeps delegations for the called names (pluck, pluckPoint,
// tugSpan, tickPlucks, the plucks overlay itself) - see
// docs/design/K5_R4.md. The footprint arrays (overHalf*, eraseExtent*)
// live here: crossing_gaps and explore_gaps write them through
// `this.r.pluckHost`, and the constructor's sizing does too.

import type { SplineSamples } from "../../geometry/spline_generator";
import type { RibbonRenderer } from "../ribbon_renderer";
import { PluckOverlay } from "../pluck_overlay";
import type { PluckHost, PluckNode } from "../pluck_overlay";
import * as sampling from "./sampling";
import { kChain, kComposePaint, kCtrlOfArc, kGlow, kPaintAt } from "../paint_math";
import { kData, knotUniformValues } from "../paint_model";
import { EXPLORE_DOTS_SPAN } from "../explore_glsl";
import { CUT_BIAS } from "./crossing_gaps";
import { FILLET_REACH_PER_HALF } from "./joinery";
import { FX_STYLE } from "../paint_const";

const PLUCK_KEY_JOINT = 1e6;
const PLUCK_KEY_MARKER = 2e8;
const PLUCK_KEY_END = 3e8;

export class PluckHostPart {
  readonly r: RibbonRenderer;
  readonly plucks: PluckOverlay;
  constructor(r: RibbonRenderer) {
    this.r = r;
    this.plucks = new PluckOverlay(this.makePluckHost());
  }

  // The façade's shared state this part reads (the hub pattern): the
  // physics, style and this frame's samples, the scene tables the nodes
  // are built from, and the picking/colour helpers that stayed.
  private get ps() { return this.r.ps; }
  private get style() { return this.r.style; }
  private get chainSamples() { return this.r.chainSamples; }
  private get sampleScratch() { return this.r.sampleScratch; }
  private get paintTmp() { return this.r.paintTmp; }
  private get geomRev() { return this.r.geomRev; }
  private get idScratch() { return this.r.idScratch; }
  private get junctionArcCtrls() { return this.r.junctionArcCtrls; }
  private get markerOccluders() { return this.r.markerOccluders; }
  private get cuspRadius() { return this.r.cuspRadius; }
  private get root() { return this.r.root; }
  private get explore() { return this.r.explore; }
  private get explorePieces() { return this.r.explorePieces; }
  private get exploreWhole() { return this.r.exploreWhole; }
  private get exploreByChain() { return this.r.exploreByChain; }
  private ctrlAtArc(samples: SplineSamples, arc: number): number {
    return this.r.ctrlAtArc(samples, arc);
  }
  private get fadeLength() { return this.r.fadeLength; }
  private get fills() { return this.r.fills; }
  private sampleAt(samples: SplineSamples, arc: number, out: Float32Array, offset: number): void {
    sampling.sampleAt(samples, arc, out, offset);
  }
  private paintArcAt(samples: SplineSamples, ctrl: number, closed: boolean): number {
    return sampling.paintArcAt(samples, ctrl, closed);
  }
  private renderCtrl(pass: import("../../physics/particle_system").CrossingPass): number {
    return sampling.renderCtrl(pass);
  }
  private underGapVisibility(chain: number, arc: number): number {
    return this.r.underGapVisibility(chain, arc);
  }
  private colorAtArc(chain: number, arc: number, out: Float32Array): void {
    this.r.colorAtArc(chain, arc, out);
  }
  private exploreShownSpan(
    chain: number,
    ctrl: number,
    lim: [number, number] | null,
    len: number,
    closed: boolean
  ): [number, number] | null {
    return this.r.exploreShownSpan(chain, ctrl, lim, len, closed);
  }
  private reextrude(chain: number): void {
    this.r.reextrude(chain);
  }

  // RENDER-ONLY PLUCKS (pluck_overlay.ts): the overlay itself, each
  // crossing's static footprints - along its over thread (the over pass's
  // stretch that covers the under thread's gap) and along its under
  // thread (the arc where any lane of the under ribbon is hidden, the
  // erase era's extents) - both solved by computeGapSlot, and the
  // per-chain base COLLAPSE multipliers the overlay installs (composed into
  // widthMul here, never inside a footprint).
  // (the overlay itself is the field above)
  /** @internal ribbon */ overHalfNeg = new Float32Array(0);
  /** @internal ribbon */ overHalfPos = new Float32Array(0);
  /** @internal ribbon */ eraseExtentNeg = new Float32Array(0);
  /** @internal ribbon */ eraseExtentPos = new Float32Array(0);
  private pluckCollapse = new Map<number, Float32Array>();
  private collapseScratch = new Map<number, Float32Array>();

  // Start a render-only pluck on a chain at a ctrl (or an arc). spanCtrl =
  // the unit's ctrl span (the fabric walk run, unwrapped c1 >= c0); reach =
  // lobes kept each side. Returns false when it is sound-only (a chain
  // mid-reveal, or nothing to vibrate). K76 stage 2c: under the thread
  // reveal the unit is clipped to the thread that shows around the plucked
  // point (exploreShownSpan), and a pluck on hidden thread is sound-only.
  // K397: and to that stretch's solid part (exploreSolidSpan), whose ends
  // are hard frets: the vibration stops at a stub's solid end, and a tap in
  // a fade plucks the solid stretch beside it.
  // K459: a solid end that ends in the dots' rounded cap (stubCaps) is a
  // FREE end instead: the span reaches the cap's tip and the overlay swings
  // the stub most there, cap included. And a tap that finds no solid
  // stretch (hidden thread, or a fade alone) draws nothing, so it sounds
  // nothing (Levi: "If we make a pluck sound, then we should show the
  // pluck effect"): it reports a "core" skip, which tapPluck silences.
  pluck(req: {
    chain: number;
    ctrl?: number;
    arc?: number;
    side: number;
    gain: number;
    freq: number;
    reach: number;
    spanCtrl?: [number, number] | null;
    beta?: number;
    delay?: number;
    // A ctrl on this chain the unit must not contain (a held particle):
    // when it does, the pluck stays sound-only.
    avoidCtrl?: number;
  }): boolean {
    const samples = this.chainSamples[req.chain];
    if (!samples) return false;
    const closed = this.ps.chainBreakAfter[req.chain] < 0;
    const len = this.ps.chains[req.chain].length;
    const ctrlArc = (c: number): number =>
      this.paintArcAt(
        samples,
        closed ? ((c % len) + len) % len : Math.max(0, Math.min(len - 1, c)),
        closed
      );
    const arc = req.arc ?? ctrlArc(req.ctrl ?? 0);
    let sc = req.spanCtrl ?? null;
    let fret = false;
    let freeLo = 0;
    let freeHi = 0;
    if (this.explorePieces && !this.exploreWhole[req.chain]) {
      const at = req.ctrl ?? this.ctrlAtArc(samples, arc);
      sc = this.exploreShownSpan(req.chain, at, sc, len, closed);
      if (sc) sc = this.explore.exploreSolidSpan(req.chain, at, sc, len, closed);
      if (!sc || !(sc[1] > sc[0])) {
        this.plucks.lastSkip = "core";
        return false;
      }
      fret = true;
      if (!this.plucks.reducedMotion) {
        [freeLo, freeHi] = this.stubCaps(req.chain, sc, len, closed, ctrlArc, samples.totalLength);
      }
    }
    let span: [number, number] | null = null;
    if (sc) {
      const a0 = ctrlArc(sc[0]);
      let a1 = ctrlArc(sc[1]);
      // A wrap run on a closed chain (c1 past the seam) or a whole loop.
      if (closed && (a1 < a0 || sc[1] - sc[0] >= len)) {
        a1 += samples.totalLength;
      }
      span = [a0 - freeLo, a1 + freeHi];
    }
    return this.plucks.add({
      chain: req.chain,
      arc,
      side: req.side,
      gain: req.gain,
      freq: req.freq,
      reach: req.reach,
      span,
      fret,
      freeLo: freeLo > 0 ? freeLo : undefined,
      freeHi: freeHi > 0 ? freeHi : undefined,
      beta: req.beta,
      delay: req.delay,
      avoidArc:
        req.avoidCtrl !== undefined ? ctrlArc(req.avoidCtrl) : undefined,
    });
  }

  // K459: the rounded caps at a solid span's ends (unwrapped ctrls, as
  // exploreSolidSpan returns them). An end that is a piece's FRONTIER end
  // with a fade, under the dots or beacon look, ends in the dots' cap
  // (explore_glsl.ts kExDotsSd: half an ellipse, 0.5 tw g along, g = the
  // fade's world length over EXPLORE_DOTS_SPAN tw, at most 1). Returns each
  // end's cap length in world arc (0 = a hard fret: no cap there).
  private stubCaps(
    chain: number,
    sc: [number, number],
    len: number,
    closed: boolean,
    ctrlArc: (c: number) => number,
    total: number
  ): [number, number] {
    const E = knotUniformValues().uKExplore;
    const look = E ? Math.round(E[1]) : -1;
    const tw = E ? E[3] : 0;
    const pieces = this.exploreByChain.get(chain);
    if ((look !== 3 && look !== 5) || !(tw > 0) || !pieces) return [0, 0];
    // The fade's world arc length from the solid end c, f ctrls along dir.
    const capLen = (c: number, f: number, dir: number): number => {
      let lf = dir > 0 ? ctrlArc(c + f) - ctrlArc(c) : ctrlArc(c) - ctrlArc(c - f);
      if (closed && lf < 0) lf += total;
      const g = Math.max(1e-3, Math.min(1, Math.abs(lf) / (EXPLORE_DOTS_SPAN * tw)));
      return 0.5 * tw * g;
    };
    let lo = 0;
    let hi = 0;
    for (const p of pieces) {
      for (const k of closed ? [-2, -1, 0, 1, 2] : [0]) {
        const d = k * len;
        if (hi === 0 && p.tip1 && p.f1 > 0 && Math.abs(p.c1 + d - sc[1]) < 1e-4) {
          hi = capLen(p.c1, p.f1, 1);
        }
        if (lo === 0 && p.tip0 && p.f0 > 0 && Math.abs(p.c0 + d - sc[0]) < 1e-4) {
          lo = capLen(p.c0, p.f0, -1);
        }
      }
    }
    return [lo, hi];
  }

  // K279: the drawn thread's world point at an arc (or a ctrl) of a chain,
  // where a pluck's ripple starts. Null when the chain has no samples.
  pluckPoint(chain: number, at: { ctrl?: number; arc?: number }): { x: number; y: number } | null {
    const samples = this.chainSamples[chain];
    if (!samples) return null;
    const out = this.sampleScratch;
    this.sampleAt(samples, this.arcOfPluck(chain, samples, at), out, 0);
    return { x: out[0], y: out[1] };
  }

  // A pluck's arc: `at.arc`, or the arc of `at.ctrl` (pluck()'s ctrlArc).
  private arcOfPluck(
    chain: number,
    samples: SplineSamples,
    at: { ctrl?: number; arc?: number }
  ): number {
    if (at.arc !== undefined) return at.arc;
    const closed = this.ps.chainBreakAfter[chain] < 0;
    const len = this.ps.chains[chain].length;
    const c = at.ctrl ?? 0;
    return this.paintArcAt(
      samples,
      closed ? ((c % len) + len) % len : Math.max(0, Math.min(len - 1, c)),
      closed
    );
  }

  // K279 TUG: the stretch a tap's physical tug may move, as fractional ctrls
  // c0 < tap < c1 (unwrapped past the seam of a closed chain): from the
  // tapped arc out to the nearest pluck node on each side (a crossing pass,
  // a joint, a marker, an open end), at most `maxCtrl` ctrl each way - a
  // string stopped at its contacts. The crest sits at the tap, kept to the
  // middle half of the stretch (a crest beside a crossing would kink the
  // thread at it). Null when the tap sits inside a node's hide zone (a
  // junction core, a marker disc) or the stretch holds no particle. Stage 1
  // first stopped the stretch at the nodes' FOOTPRINTS (the overlay's lobe
  // bounds): that left most fabric spans, 1.2-2 world between crossings,
  // with no particle to move (one tug in four fabric taps).
  tugSpan(
    chain: number,
    at: { ctrl?: number; arc?: number },
    maxCtrl: number
  ): { c0: number; c1: number; tap: number } | null {
    const samples = this.chainSamples[chain];
    if (!samples) return null;
    const closed = this.ps.chainBreakAfter[chain] < 0;
    const len = this.ps.chains[chain].length;
    const total = samples.totalLength;
    if (!(total > 0) || len < 3) return null;
    const a = sampling.normArc(this.arcOfPluck(chain, samples, at), total, closed);
    let lo = closed ? a - total / 2 : 0;
    let hi = closed ? a + total / 2 : total;
    for (const n of this.pluckNodes(chain)) {
      let d = n.arc - a;
      if (closed) d -= total * Math.round(d / total);
      if (Math.abs(d) <= n.hide) return null;
      if (d > 0) hi = Math.min(hi, a + d);
      else lo = Math.max(lo, a + d);
    }
    const at0 = this.ctrlAtArc(samples, a);
    let c0 = this.ctrlAtArc(samples, sampling.normArc(lo, total, closed));
    let c1 = this.ctrlAtArc(samples, sampling.normArc(hi, total, closed));
    if (closed) {
      if (c0 > at0) c0 -= len;
      if (c1 < at0) c1 += len;
    }
    c0 = Math.max(c0, at0 - maxCtrl);
    c1 = Math.min(c1, at0 + maxCtrl);
    if (!(c0 < at0 && at0 < c1) || Math.ceil(c1) - Math.floor(c0) < 2) return null;
    const q = 0.25 * (c1 - c0);
    const tap = Math.max(c0 + q, Math.min(c1 - q, at0));
    return { c0, c1, tap };
  }

  // Per-frame pluck pass (every ticker branch, after tickPaint so fabric
  // colors read this frame's paint). Never calls update().
  tickPlucks(dt: number): void {
    this.plucks.tick(dt);
  }

  private makePluckHost(): PluckHost {
    return {
      halfWidth: () => this.style.threadWidth / 2,
      casing: () => this.style.casingWidth / 2 + CUT_BIAS,
      samples: (c) => this.chainSamples[c] ?? null,
      allSamples: () => this.chainSamples,
      closed: (c) => this.ps.chainBreakAfter[c] < 0,
      nodes: (c) => this.pluckNodes(c),
      sampleAt: (s, a, out, o) => this.sampleAt(s, a, out, o),
      visibility: (c, a) => this.underGapVisibility(c, a),
      color: (c, a, out) => this.pluckColor(c, a, out),
      staticColors: () => !this.style.paletteMode,
      viewScale: () => {
        const wt = this.root.worldTransform;
        return Math.hypot(wt.a, wt.b);
      },
      // Mid-reveal chains, and every chain while appearance FX still
      // animate (they settle within FX_TAIL of the reveal's end).
      hot: (c) =>
        (this.r.revealOn && this.r.revealFx.revealMask[c] !== null) ||
        (this.r.fxLive && knotUniformValues().uKFx[0] !== FX_STYLE.none),
      setCollapse: (c, mul) => {
        if (mul) this.pluckCollapse.set(c, mul);
        else this.pluckCollapse.delete(c);
        this.reextrude(c);
      },
      geomRev: () => this.geomRev,
      baseSampleCount: (c) => this.fills[c].sampleCount,
      gapIds: (c) => this.idScratch.get(c) ?? null,
    };
  }

  // Compose a chain's pluck collapse into the width multiplier update()
  // (or reextrude) hands its base ribbon. Inert without a collapse.
  /** @internal ribbon */ withPluckCollapse(
    chain: number,
    count: number,
    base: Float32Array | null
  ): Float32Array | null {
    const col = this.pluckCollapse.get(chain);
    if (!col || col.length !== count) return base;
    let buf = this.collapseScratch.get(chain);
    if (!buf || buf.length !== count) {
      buf = new Float32Array(count);
      this.collapseScratch.set(chain, buf);
    }
    for (let k = 0; k < count; k++) buf[k] = (base ? base[k] : 1) * col[k];
    return buf;
  }

  // The thread's composed color at an arc, 0..1 RGB: the section color,
  // the burn / roots tint, then the gameplay paint and the reveal glow -
  // the section shader's own composition (through the mirror).
  private pluckColor(chain: number, arc: number, out: Float32Array): void {
    this.composedAtArc(chain, arc, 0, out);
  }

  // The ribbon's composed color at a world arc (no FX stripes or alpha):
  // colorAtArc's section (the ribbon's Gouraud) + burn, then the paint at
  // the exact point with edge coverage over `px` (0 = hard).
  private composedAtArc(chain: number, arc: number, px: number, out: Float32Array): void {
    this.colorAtArc(chain, arc, out);
    if (!this.style.paletteMode) return;
    const D = kData();
    const c = kChain(D, chain);
    if (!(c.total > 0)) return;
    const U = knotUniformValues();
    const an = sampling.normArc(arc, c.total, c.closed);
    const ctrl = kCtrlOfArc(D, c, an);
    kComposePaint(U, out, kPaintAt(D, U, c, ctrl, an, px, this.paintTmp), kGlow(D, U, c, ctrl));
  }

  // The NODES a plucked chain passes (pluck_overlay.ts PluckNode): every
  // registered crossing pass (footprint = its erase extents + fade when
  // the chain goes under, its over-fill half-lengths when over), every
  // fused junction (hide zone = the joint's overlap core, see below),
  // start/exit marker discs, and an open chain's two ends. Sorted by arc.
  private pluckNodes(chain: number): PluckNode[] {
    const samples = this.chainSamples[chain];
    if (!samples) return [];
    const closed = this.ps.chainBreakAfter[chain] < 0;
    const total = samples.totalLength;
    const fillHalf = this.style.threadWidth / 2;
    const gap = (this.style.casingWidth - this.style.threadWidth) / 2;
    const fade = this.fadeLength;
    const sc = this.sampleScratch;
    const out: PluckNode[] = [];
    this.ps.crossings.forEach((cr, ci) => {
      for (let u = 0; u < 2; u++) {
        const isUnder = u === 1;
        const pass = isUnder ? cr.under : cr.over;
        if (pass.chain !== chain) continue;
        const arc = this.paintArcAt(samples, this.renderCtrl(pass), closed);
        let line: [number, number, number, number] | null = null;
        let selfArc: number | undefined;
        let footNeg: number;
        let footPos: number;
        if (isUnder) {
          footNeg = this.eraseExtentNeg[ci] + fade;
          footPos = this.eraseExtentPos[ci] + fade;
          const os = this.chainSamples[cr.over.chain];
          if (os) {
            const oc = this.ps.chainBreakAfter[cr.over.chain] < 0;
            const oArc = this.paintArcAt(os, this.renderCtrl(cr.over), oc);
            this.sampleAt(os, oArc, sc, 0);
            line = [sc[0], sc[1], sc[2], sc[3]];
            // K344: a self-crossing's clip stops short of its own over pass.
            if (cr.over.chain === chain) selfArc = oArc;
          }
        } else {
          footNeg = this.overHalfNeg[ci];
          footPos = this.overHalfPos[ci];
        }
        out.push({
          arc,
          footNeg,
          footPos,
          hide: 0,
          under: isUnder,
          line,
          selfArc,
          key: ci * 2 + u,
        });
      }
    });
    const joints = this.junctionArcCtrls.get(chain);
    if (joints) {
      // The overlay hides only over the joint's OVERLAP CORE: the seal disc
      // (0.92 fillHalf) where the chain passes THROUGH the joint, and for a
      // TERMINAL arm its tucked tip (0.75 fillHalf in) plus the fused-tip
      // disc (0.99 fillHalf) that rounds it. The edge-aware junction field
      // is each arm's own material across that arm's width, so beyond the
      // core the vibrating arm repaints exactly its own color. (Hiding the
      // whole fillet reach - ~1 world at cuspRadius 3 - and later 2
      // fillHalf on every arm left half of all fabric taps without a
      // single vibrating stretch.) The static FOOTPRINT spans the fillet
      // web's flank: each wedge paints a tapering triangle of joint material
      // ON its arms, out to the wedge reach, above the base - a base
      // collapsing under it left that triangle standing as a pale static
      // sliver beside a dark gap (the "spike" at an eye between two arms).
      // Inside it the base stays intact and the swing under NODE_CORE h,
      // as at a crossing.
      const len = this.ps.chains[chain].length;
      const webReach = fillHalf * FILLET_REACH_PER_HALF * this.cuspRadius;
      const web = this.cuspRadius > 0.05 && webReach > fillHalf * 0.97 * 0.3;
      for (const j of joints) {
        const terminal = !closed && (j.ctrl < 0.5 || j.ctrl > len - 1.5);
        const hide = fillHalf * (terminal ? 1.75 : 1.0) + gap;
        const foot = Math.max(hide + 2 * CUT_BIAS, web ? webReach : 0);
        out.push({
          arc: this.paintArcAt(samples, j.ctrl, closed),
          footNeg: foot,
          footPos: foot,
          hide,
          under: false,
          line: null,
          key: PLUCK_KEY_JOINT + j.jn * 1e5 + j.ctrl,
        });
      }
    }
    this.markerOccluders.forEach((mk, mi) => {
      if (mk.chain !== chain) return;
      const r = mk.radius + gap + fade + CUT_BIAS;
      out.push({
        arc: this.paintArcAt(samples, mk.ctrl, closed),
        footNeg: r,
        footPos: r,
        hide: r,
        under: false,
        line: null,
        key: PLUCK_KEY_MARKER + mi,
      });
    });
    if (!closed) {
      out.push({
        arc: 0,
        footNeg: 0,
        footPos: fillHalf,
        hide: 0,
        under: false,
        line: null,
        key: PLUCK_KEY_END,
      });
      out.push({
        arc: total,
        footNeg: fillHalf,
        footPos: 0,
        hide: 0,
        under: false,
        line: null,
        key: PLUCK_KEY_END + 1,
      });
    }
    out.sort((a, b) => a.arc - b.arc || a.key - b.key);
    // Coincident nodes (a fused tip or a marker sitting on a chain end)
    // merge into one: the larger footprint and hide zone, the lower key.
    const merged: PluckNode[] = [];
    for (const n of out) {
      const prev = merged[merged.length - 1];
      if (prev && n.arc - prev.arc < 0.02 && (n.key >= PLUCK_KEY_JOINT || prev.key >= PLUCK_KEY_JOINT)) {
        prev.footNeg = Math.max(prev.footNeg, n.footNeg);
        prev.footPos = Math.max(prev.footPos, n.footPos);
        prev.hide = Math.max(prev.hide, n.hide);
        if (n.key < prev.key) {
          prev.key = n.key;
          prev.under = n.under;
          prev.line = n.line;
          prev.selfArc = n.selfArc;
        }
        continue;
      }
      merged.push({ ...n });
    }
    return merged;
  }
}
