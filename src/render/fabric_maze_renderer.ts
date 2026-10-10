// P4 branching-maze overlay for the fabric. Since Stage 10 the traveled
// path, the branch-point choice indication, and the hover highlight all
// recolor the ACTUAL thread ribbons (RibbonRenderer palette mode: per-vertex
// palette coordinates; crossing patches copy UVs, so the weave is
// pixel-identical) - this class declares WHAT to paint and draws only the
// markers on top. The old overdrawn Graphics strokes (which could never sit
// perfectly on the ribbon) are gone.
//
// Choice arms pulse: a steady alternate tint near the junction, fading with
// distance, plus a crest that radiates OUT of the junction along each
// choosable run - while on the arrival run (the backtrack) the crest slides
// IN, phase-synced so the flow reads as continuous through the junction.
// Hovering a choosable run lights it steadily.
//
// MEMORY-TRAIL MODE (Stage 23, `trailMode`): instead of the full traveled
// path, only the trailing SUFFIX of the path stays gold - walked backward
// from the visual head accumulating each run's deterministic lattice
// length until `trailLength` is spent; the oldest included run gets a
// partial ctrl span and the tail ramps gold->base over the oldest 30% of
// the budget (fading footprints). Junction caps appear only inside the
// trail, at the trail's local intensity. The head-junction pulse/choice/
// hover machinery is untouched.

import { Container, Graphics } from "pixi.js";
import type { ParticleSystem } from "../physics/particle_system";
import type { WalkGraph, WalkEdge } from "../core/walk_graph";
import type { FabricMazeController } from "../game/fabric_controller";
import type {
  RibbonRenderer,
  PaintSpan,
  PulseArm,
  PaintCap,
} from "./ribbon_renderer";

const START_COLOR = 0x46e35a;
const EXIT_COLOR = 0xff6b3d;

// Hit-test sampling density along runs (ctrl units).
const SAMPLE_STEP = 0.25;
// Hit-testing ignores samples this close (ctrl) to the branch point: all
// arms converge there, so taps on the junction blob itself stay ambiguous
// and are rejected rather than resolved arbitrarily.
const HEAD_EXCLUDE = 0.7;
// Traversal animation: a CONSTANT base rate (deliberately independent of
// the run's length - long runs take proportionally longer), slowed through
// bends like natural motion: the live rate is base / (1 + k * turn), where
// turn is the local bend angle per ctrl at the dot's position. The user's
// moveSpeed slider multiplies the base.
const MOVE_CTRL_PER_S = 34;
const MOVE_CURVE_SLOWDOWN = 2.2; // Per radian-per-ctrl of local turn.
const MOVE_MIN_FACTOR = 0.3;
// Memory-trail tail fade: the oldest fraction of the trail budget ramps
// gold -> base (per-end PaintSpan intensities; the renderer interpolates).
const TRAIL_FADE_FRAC = 0.3;

interface MoveAnim {
  e: WalkEdge;
  from: number; // Ctrl at the departure end.
  to: number; // Ctrl at the destination end (the controller's new head).
  cur: number; // Current dot position (ctrl).
  kind: "advance" | "backtrack";
}

// One traversed (possibly partial) piece of the path, directed from the
// older end toward the visual head, with its lattice length.
interface TrailSeg {
  e: WalkEdge;
  from: number;
  to: number;
  len: number;
}

interface TrailPaint {
  spans: PaintSpan[];
  caps: PaintCap[];
  // Span records by walk edge, for pulse-band attribution at the head.
  recs: { eid: number; span: PaintSpan }[];
}

export class FabricMazeRenderer {
  overContainer: Container;
  private ps: ParticleSystem;
  private walk: WalkGraph;
  private ribbons: RibbonRenderer;
  private gfx: Graphics;
  private threadWidth: number;
  private hoverEdge = -1;
  private anim: MoveAnim | null = null;
  private scratch = new Float32Array(2);
  private flowScratch = new Float32Array(2);
  // Live traversal-speed multiplier (the moveSpeed slider; main.ts keeps
  // it synced every tick).
  moveSpeed = 1;
  // Memory-trail mode + budget (lattice units of recent path kept lit);
  // main.ts syncs both every tick and refreshes the paint on change.
  trailMode = false;
  trailLength = 5;

  constructor(
    ps: ParticleSystem,
    walk: WalkGraph,
    threadWidth: number,
    ribbons: RibbonRenderer
  ) {
    this.ps = ps;
    this.walk = walk;
    this.ribbons = ribbons;
    this.threadWidth = threadWidth;
    this.overContainer = new Container();
    this.gfx = new Graphics();
    this.overContainer.addChild(this.gfx);
  }

  setWidths(threadWidth: number): void {
    this.threadWidth = threadWidth;
  }

  // Track the hovered choosable run; returns true when it changed (the
  // caller then refreshes the paint declaration).
  setHover(edgeId: number): boolean {
    if (edgeId === this.hoverEdge) return false;
    this.hoverEdge = edgeId;
    return true;
  }

  // World position on a chain plus the ribbons' flow-undulation offset:
  // the ribbons render their splines through RibbonRenderer's flow field,
  // so every position this overlay draws or hit-tests must ride the same
  // field or the markers detach from the undulating threads. Exact
  // pass-through at flowStrength 0.
  private pointFlowed(
    chain: number,
    ctrl: number,
    out: Float32Array,
    offset: number
  ): void {
    this.ps.pointOnChain(chain, ctrl, out, offset);
    this.ribbons.flowOffset(out[offset], out[offset + 1], this.flowScratch);
    out[offset] += this.flowScratch[0];
    out[offset + 1] += this.flowScratch[1];
  }

  // Live world position of a walk vertex (any fused occurrence works: the
  // junction coincidence holds them together).
  vertexWorld(id: string, out: Float32Array, offset: number): void {
    const v = this.walk.vertices.get(id)!;
    this.pointFlowed(v.chain, this.ctrlMod(v.chain, v.ctrl), out, offset);
  }

  private ctrlMod(chain: number, f: number): number {
    const len = this.ps.chains[chain].length;
    return ((f % len) + len) % len;
  }

  // Nearest tappable run to a world point among the current choices, or -1.
  // Samples each run's full span, excluding the neighborhood of the branch
  // point where all arms coincide.
  edgeAt(x: number, y: number, controller: FabricMazeController): number {
    const maxD = Math.max(0.9, this.threadWidth * 1.6);
    let best = -1;
    let bestD = maxD * maxD;
    for (const eid of controller.choices()) {
      const e = this.walk.edges[eid];
      // Exclude the neighborhood of every end that touches the head (both
      // ends of a self-loop run return to the branch point).
      const exA = e.va === controller.head;
      const exB = e.vb === controller.head;
      for (let f = e.ctrlA; ; f += SAMPLE_STEP) {
        const ff = Math.min(f, e.ctrlB);
        const nearHead =
          (exA && ff - e.ctrlA <= HEAD_EXCLUDE) ||
          (exB && e.ctrlB - ff <= HEAD_EXCLUDE);
        if (!nearHead || e.ctrlB - e.ctrlA <= 2 * HEAD_EXCLUDE) {
          this.pointFlowed(e.chain, this.ctrlMod(e.chain, ff), this.scratch, 0);
          const dx = this.scratch[0] - x;
          const dy = this.scratch[1] - y;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = eid;
          }
        }
        if (ff >= e.ctrlB) break;
      }
    }
    return best;
  }

  // --- Traversal animation: game state moves instantly; the dot and the
  // gold front travel the thread's actual curve to catch up (ctrl-space
  // interpolation through pointOnChain, so the motion follows every bend).

  get animating(): boolean {
    return this.anim !== null;
  }

  // Start animating the move the controller just performed. The controller
  // head is already at the destination; the dot departs the other end.
  beginMove(
    edgeId: number,
    kind: "advance" | "backtrack",
    controller: FabricMazeController
  ): void {
    this.anim = null; // A tap mid-flight snaps the previous move.
    const e = this.walk.edges[edgeId];
    const head = controller.head;
    let from: number;
    let to: number;
    if (e.va === head && e.vb === head) {
      // Self-loop run: direction is unknowable; sweep A -> B.
      from = e.ctrlA;
      to = e.ctrlB;
    } else if (e.va === head) {
      from = e.ctrlB;
      to = e.ctrlA;
    } else {
      from = e.ctrlA;
      to = e.ctrlB;
    }
    this.anim = { e, from, to, cur: from, kind };
    this.emitAnimFrame(controller);
  }

  cancelMove(): void {
    this.anim = null;
  }

  // Advance the in-flight move; on arrival, hand back to the full refresh.
  // The rate slows through bends (natural motion): local turn measured
  // from three points one ctrl apart around the dot.
  tickAnim(dt: number, controller: FabricMazeController): void {
    const a = this.anim;
    if (!a) return;
    const dir = Math.sign(a.to - a.from) || 1;

    const chain = this.ps.chains[a.e.chain];
    const len = chain.length;
    const closed = this.ps.chainBreakAfter[a.e.chain] < 0;
    const at = (f: number): [number, number] => {
      const fc = closed
        ? ((f % len) + len) % len
        : Math.max(0, Math.min(len - 1, f));
      this.pointFlowed(a.e.chain, fc, this.scratch, 0);
      return [this.scratch[0], this.scratch[1]];
    };
    const [x0, y0] = at(a.cur - 1);
    const [x1, y1] = at(a.cur);
    const [x2, y2] = at(a.cur + 1);
    const v1x = x1 - x0;
    const v1y = y1 - y0;
    const v2x = x2 - x1;
    const v2y = y2 - y1;
    const n1 = Math.hypot(v1x, v1y) || 1;
    const n2 = Math.hypot(v2x, v2y) || 1;
    const cosT = Math.max(
      -1,
      Math.min(1, (v1x * v2x + v1y * v2y) / (n1 * n2))
    );
    const turn = Math.acos(cosT); // Radians over ~2 ctrl.
    const factor = Math.max(
      MOVE_MIN_FACTOR,
      1 / (1 + MOVE_CURVE_SLOWDOWN * turn)
    );

    a.cur += dir * MOVE_CTRL_PER_S * this.moveSpeed * factor * dt;
    if ((dir > 0 && a.cur >= a.to) || (dir < 0 && a.cur <= a.to)) {
      this.anim = null;
      this.update(controller);
      return;
    }
    this.emitAnimFrame(controller);
  }

  // --- Memory-trail paint (Stage 23).

  // Traversal segments in path order, each directed older-end -> head
  // (self-loop runs sweep A -> B, matching beginMove's convention). With an
  // advance mid-flight, the last path edge contributes only its swept
  // partial; a backtrack remnant (reachable only by toggling trail mode on
  // mid-retract) contributes the leftover between the new head and the dot.
  // Lattice lengths scale partials by their swept ctrl fraction.
  private trailSegments(
    controller: FabricMazeController,
    anim: MoveAnim | null
  ): TrailSeg[] {
    const segs: TrailSeg[] = [];
    const pe = controller.pathEdges;
    const pv = controller.pathVertices;
    const nFull = anim && anim.kind === "advance" ? pe.length - 1 : pe.length;
    for (let i = 0; i < nFull; i++) {
      const e = this.walk.edges[pe[i]];
      const fromA = e.va === e.vb || pv[i] === e.va;
      segs.push({
        e,
        from: fromA ? e.ctrlA : e.ctrlB,
        to: fromA ? e.ctrlB : e.ctrlA,
        len: e.length,
      });
    }
    if (anim) {
      const fullCtrl = Math.abs(anim.to - anim.from);
      const isAdv = anim.kind === "advance";
      const fromC = isAdv ? anim.from : anim.to;
      const sweptCtrl = Math.abs(anim.cur - fromC);
      if (sweptCtrl > 1e-9 && fullCtrl > 1e-9) {
        segs.push({
          e: anim.e,
          from: fromC,
          to: anim.cur,
          len: (anim.e.length * sweptCtrl) / fullCtrl,
        });
      }
    }
    return segs;
  }

  // Walk backward from the visual head accumulating lattice length until
  // trailLength is exhausted; the oldest included segment keeps only the
  // suffix nearest the head (ctrl span interpolated by the remaining
  // budget). Intensity ramps gold -> base over the oldest TRAIL_FADE_FRAC
  // of the budget. Junction caps only inside the trail, at the trail's
  // local intensity (a full-gold cap on a faded ribbon would float - the
  // overlays-sample-what-they-overlap rule).
  private buildTrail(
    controller: FabricMazeController,
    anim: MoveAnim | null
  ): TrailPaint {
    const segs = this.trailSegments(controller, anim);
    const L = Math.max(1e-6, this.trailLength);
    const fadeStart = L * (1 - TRAIL_FADE_FRAC);
    const pAt = (d: number): number =>
      d <= fadeStart ? 1 : Math.max(0, (L - d) / (L - fadeStart));

    const spans: PaintSpan[] = [];
    const recs: { eid: number; span: PaintSpan }[] = [];
    let d = 0; // Path distance behind the visual head.
    for (let i = segs.length - 1; i >= 0 && d < L; i--) {
      const s = segs[i];
      if (s.len <= 1e-9) continue;
      const dNear = d;
      let dFar = d + s.len;
      let fromC = s.from;
      if (dFar > L) {
        const keep = (L - dNear) / s.len;
        fromC = s.to - (s.to - s.from) * keep;
        dFar = L;
      }
      const toIsC0 = s.to <= fromC;
      const span: PaintSpan = {
        chain: s.e.chain,
        c0: Math.min(fromC, s.to),
        c1: Math.max(fromC, s.to),
        p0: toIsC0 ? pAt(dNear) : pAt(dFar),
        p1: toIsC0 ? pAt(dFar) : pAt(dNear),
      };
      spans.push(span);
      recs.push({ eid: s.e.id, span });
      d += s.len;
    }
    // Oldest first: where consecutive runs share a junction sample, the
    // newest (brightest) write wins.
    spans.reverse();

    // Caps: vertex i departs segment i (segment counts mirror path-edge
    // indices in every anim case), so its distance behind the head is the
    // summed length of segments i..end. Most-recent-first keeps a
    // revisited junction's brightest occurrence; the head keeps its pulse
    // affordance (no cap) until solved, mirroring buildCaps.
    const caps: PaintCap[] = [];
    const capR = Math.max(0.22, this.threadWidth * 0.6);
    const seenCap = new Set<string>();
    const addCaps = (vid: string, p: number): void => {
      const v = this.walk.vertices.get(vid)!;
      for (const eid of v.edges) {
        const e = this.walk.edges[eid];
        const atA = e.va === v.id;
        const ctrl = atA ? e.ctrlA : e.ctrlB;
        const key = `${e.chain}:${ctrl}`;
        if (!seenCap.has(key)) {
          seenCap.add(key);
          caps.push({ chain: e.chain, ctrl, radius: capR, p });
        }
        if (atA && e.vb === v.id) {
          const key2 = `${e.chain}:${e.ctrlB}`;
          if (!seenCap.has(key2)) {
            seenCap.add(key2);
            caps.push({ chain: e.chain, ctrl: e.ctrlB, radius: capR, p });
          }
        }
      }
    };
    if (controller.solved && !anim) addCaps(controller.head, 1);
    let dv = 0;
    for (let i = segs.length - 1; i >= 0; i--) {
      dv += segs[i].len;
      if (dv >= L) break;
      if (!controller.solved && i >= controller.pathVertices.length - 1) {
        continue; // The unsolved head (backtrack-remnant edge case).
      }
      const p = pAt(dv);
      if (p > 0.01) addCaps(controller.pathVertices[i], p);
    }
    return { spans, caps, recs };
  }

  // Is this edge's given ctrl painted goldish by the trail? Picks the
  // pulse band at the head: band B (gold side) only where the underlying
  // ribbon actually wears gold - the palette-order invariant.
  private trailGoldAt(
    trail: TrailPaint,
    eid: number,
    ctrl: number
  ): boolean {
    for (const r of trail.recs) {
      if (r.eid !== eid) continue;
      const s = r.span;
      if (ctrl < s.c0 - 1e-6 || ctrl > s.c1 + 1e-6) continue;
      const t =
        s.c1 > s.c0
          ? (Math.min(Math.max(ctrl, s.c0), s.c1) - s.c0) / (s.c1 - s.c0)
          : 1;
      const p0 = s.p0 ?? 1;
      const p1 = s.p1 ?? 1;
      if (p0 + (p1 - p0) * t >= 0.5) return true;
    }
    return false;
  }

  // Paint + markers for one animation frame: the stack minus the in-flight
  // run, plus the swept part of it (growing behind the dot on an advance,
  // the shrinking remnant ahead of it on a backtrack); pulses stay quiet
  // until arrival. In trail mode the spans are the trailing suffix instead,
  // with the in-flight partial as the newest material.
  private emitAnimFrame(controller: FabricMazeController): void {
    const a = this.anim!;
    if (this.trailMode) {
      const trail = this.buildTrail(controller, a);
      this.ribbons.setPaint(trail.spans, [], trail.caps);
      this.drawMarkers(controller, a.e.chain, a.cur, false);
      return;
    }
    const spans: PaintSpan[] = [];
    for (const eid of controller.pathEdges) {
      if (a.kind === "advance" && eid === a.e.id) continue;
      const e = this.walk.edges[eid];
      spans.push({ chain: e.chain, c0: e.ctrlA, c1: e.ctrlB });
    }
    const lo = Math.min(a.cur, a.kind === "advance" ? a.from : a.to);
    const hi = Math.max(a.cur, a.kind === "advance" ? a.from : a.to);
    if (hi - lo > 1e-6) {
      spans.push({ chain: a.e.chain, c0: lo, c1: hi });
    }
    this.ribbons.setPaint(spans, [], this.buildCaps(controller));
    this.drawMarkers(controller, a.e.chain, a.cur, false);
  }

  // Refresh the paint declaration (traveled spans + pulse arms) and redraw
  // the markers. While a move is animating, tickAnim owns the frame. In
  // trail mode the spans/caps come from the trailing suffix instead of the
  // full path; the pulse machinery is identical, with the band choice
  // following the trail's actual paint at each arm's junction end.
  update(controller: FabricMazeController): void {
    if (this.anim) {
      this.emitAnimFrame(controller);
      return;
    }
    const trail = this.trailMode ? this.buildTrail(controller, null) : null;
    const spans: PaintSpan[] = trail ? trail.spans : [];
    const onPath = new Set<number>();
    if (!trail) {
      for (const eid of controller.pathEdges) {
        const e = this.walk.edges[eid];
        spans.push({ chain: e.chain, c0: e.ctrlA, c1: e.ctrlB });
        onPath.add(eid);
      }
    }

    const caps = trail ? trail.caps : this.buildCaps(controller);

    const pulses: PulseArm[] = [];
    if (!controller.solved) {
      const last =
        controller.pathEdges.length > 0
          ? controller.pathEdges[controller.pathEdges.length - 1]
          : -1;
      for (const eid of controller.choices()) {
        const e = this.walk.edges[eid];
        const hovered = eid === this.hoverEdge;
        const inward = eid === last;
        const arm = (cJunction: number, cFar: number): void => {
          pulses.push({
            chain: e.chain,
            cJunction,
            cFar,
            inward,
            onPath: trail
              ? this.trailGoldAt(trail, eid, cJunction)
              : onPath.has(eid),
            hovered,
          });
        };
        if (e.va === e.vb) {
          // A self-loop run returns to the branch point: pulse both ends.
          arm(e.ctrlA, e.ctrlB);
          arm(e.ctrlB, e.ctrlA);
        } else if (e.va === controller.head) {
          arm(e.ctrlA, e.ctrlB);
        } else {
          arm(e.ctrlB, e.ctrlA);
        }
      }
    }
    this.ribbons.setPaint(spans, pulses, caps);
    this.drawMarkers(controller, -1, 0, controller.solved);
  }

  // Junction caps: at every vertex the path traversed, several ribbons
  // converge and overlap (bridge tips ride their hosts; merged crossings
  // overlap diagonally). Painting each arm's immediate neighborhood gold
  // hides the overlap footprint in both directions. The head vertex keeps
  // its pulse affordance instead (and wears the head marker), except once
  // solved.
  private buildCaps(controller: FabricMazeController): PaintCap[] {
    const caps: PaintCap[] = [];
    // Just enough to cover the overlap footprint at the junction center
    // (~half a thread width): the tuck + fillets own the joint geometry
    // now, and bigger caps painted gold ticks on every unchosen side arm.
    const capR = Math.max(0.22, this.threadWidth * 0.6);
    const seenCap = new Set<string>();
    const nVisited =
      controller.pathVertices.length - (controller.solved ? 0 : 1);
    for (let i = 0; i < nVisited; i++) {
      const v = this.walk.vertices.get(controller.pathVertices[i])!;
      for (const eid of v.edges) {
        const e = this.walk.edges[eid];
        const atA = e.va === v.id;
        const ctrl = atA ? e.ctrlA : e.ctrlB;
        const key = `${e.chain}:${ctrl}`;
        if (seenCap.has(key)) continue;
        seenCap.add(key);
        caps.push({ chain: e.chain, ctrl, radius: capR });
        // A self-loop run touches the vertex at BOTH its ends.
        if (atA && e.vb === v.id) {
          const key2 = `${e.chain}:${e.ctrlB}`;
          if (!seenCap.has(key2)) {
            seenCap.add(key2);
            caps.push({ chain: e.chain, ctrl: e.ctrlB, radius: capR });
          }
        }
      }
    }
    return caps;
  }

  // Markers: start/exit discs, the head dot (at the given chain position
  // mid-move, at the head vertex otherwise), and the win ring.
  private drawMarkers(
    controller: FabricMazeController,
    dotChain: number,
    dotCtrl: number,
    showRing: boolean
  ): void {
    const g = this.gfx;
    g.clear();
    const rHead = Math.max(0.24, this.threadWidth * 0.72);
    if (dotChain >= 0) {
      this.pointFlowed(dotChain, this.ctrlMod(dotChain, dotCtrl), this.scratch, 0);
    } else {
      this.vertexWorld(controller.head, this.scratch, 0);
    }
    g.circle(this.scratch[0], this.scratch[1], rHead);
    g.fill({ color: 0xffffff, alpha: 0.92 });

    const r = Math.max(0.32, this.threadWidth * 0.95);
    this.vertexWorld(this.walk.start, this.scratch, 0);
    g.circle(this.scratch[0], this.scratch[1], r);
    g.fill({ color: START_COLOR, alpha: 0.95 });

    this.vertexWorld(this.walk.exit, this.scratch, 0);
    g.circle(this.scratch[0], this.scratch[1], r);
    g.fill({ color: EXIT_COLOR, alpha: 0.95 });
    if (showRing) {
      g.circle(this.scratch[0], this.scratch[1], r * 1.5);
      g.stroke({
        color: EXIT_COLOR,
        width: this.threadWidth * 0.25,
        alpha: 0.9,
      });
    }
  }

  destroy(): void {
    this.overContainer.destroy({ children: true });
  }
}
