// P4 branching-maze overlay for the fabric. Renders the player's traced path
// as a RECOLOR of the actual thread material (full width, opaque, gold),
// woven correctly: stretches where the path's chain dips UNDER a crossing go
// to the under layer (below the ribbons, so the over thread and its erase
// gap stay on top), everything else rides the over layer. Generalizes the
// old single-strand MazeRenderer to multi-chain walk-graph paths; under
// windows are read LIVE from the crossing bindings (displayF when present),
// so the recolor tracks crossings as they slide.
//
// Also draws the gameplay affordances: start/exit markers, the head marker,
// and a short translucent hint along each run tappable at the current branch
// point (the just-traversed run - the backtrack - hints in the path color).

import { Container, Graphics } from "pixi.js";
import type { ParticleSystem } from "../physics/particle_system";
import type { WalkGraph, WalkEdge } from "../core/walk_graph";
import type { FabricMazeController } from "../game/fabric_controller";

const START_COLOR = 0x46e35a;
const EXIT_COLOR = 0xff6b3d;
const PATH_COLOR = 0xffd24a;
const HINT_COLOR = 0xffffff;

// Control-sampling density along runs (samples per control unit).
const SAMPLE_STEP = 0.25;
// Half-width (in controls) of the under window around a crossing's under
// binding: matches the old overlay's +/-1 integer marking.
const UNDER_HALF = 1.05;
// Choice hints reach this far into each run from the branch point.
const HINT_REACH = 1.6;
// Hit-testing ignores samples this close (ctrl) to the branch point: all
// arms converge there, so taps on the junction blob itself stay ambiguous
// and are rejected rather than resolved arbitrarily.
const HEAD_EXCLUDE = 0.7;

export class FabricMazeRenderer {
  underContainer: Container;
  overContainer: Container;
  private ps: ParticleSystem;
  private walk: WalkGraph;
  private underGfx: Graphics;
  private overGfx: Graphics;
  private threadWidth: number;
  private scratch = new Float32Array(2);
  // chain -> live under-binding ctrls, rebuilt each draw.
  private underCtrls = new Map<number, number[]>();

  constructor(ps: ParticleSystem, walk: WalkGraph, threadWidth: number) {
    this.ps = ps;
    this.walk = walk;
    this.threadWidth = threadWidth;
    this.underContainer = new Container();
    this.overContainer = new Container();
    this.underGfx = new Graphics();
    this.overGfx = new Graphics();
    this.underContainer.addChild(this.underGfx);
    this.overContainer.addChild(this.overGfx);
  }

  setWidths(threadWidth: number): void {
    this.threadWidth = threadWidth;
  }

  // Live world position of a walk vertex (any fused occurrence works: the
  // junction coincidence holds them together).
  vertexWorld(id: string, out: Float32Array, offset: number): void {
    const v = this.walk.vertices.get(id)!;
    this.ps.pointOnChain(v.chain, this.ctrlMod(v.chain, v.ctrl), out, offset);
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
          this.ps.pointOnChain(
            e.chain,
            this.ctrlMod(e.chain, ff),
            this.scratch,
            0
          );
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

  update(controller: FabricMazeController): void {
    const under = this.underGfx;
    const over = this.overGfx;
    under.clear();
    over.clear();

    // Live under windows per chain (crossings slide; displayF is the true
    // intersection when the physics has one).
    this.underCtrls.clear();
    for (const c of this.ps.crossings) {
      const chain = c.under.chain;
      const ctrl = c.under.displayF ?? c.under.ctrl;
      const list = this.underCtrls.get(chain);
      if (list) list.push(ctrl);
      else this.underCtrls.set(chain, [ctrl]);
    }

    // 1. The traced path: every run on the stack, recolored woven.
    for (const eid of controller.pathEdges) {
      this.strokeRunWoven(under, over, this.walk.edges[eid]);
    }

    // 2. Choice hints at the branch point.
    if (!controller.solved) {
      const lastEdge =
        controller.pathEdges.length > 0
          ? controller.pathEdges[controller.pathEdges.length - 1]
          : -1;
      for (const eid of controller.choices()) {
        this.strokeHint(
          over,
          this.walk.edges[eid],
          controller.head,
          eid === lastEdge
        );
      }
    }

    // 3. Head marker (where the player stands).
    const rHead = Math.max(0.24, this.threadWidth * 0.72);
    this.vertexWorld(controller.head, this.scratch, 0);
    over.circle(this.scratch[0], this.scratch[1], rHead);
    over.fill({ color: 0xffffff, alpha: 0.92 });

    // 4. Start and exit markers.
    const r = Math.max(0.32, this.threadWidth * 0.95);
    this.vertexWorld(this.walk.start, this.scratch, 0);
    over.circle(this.scratch[0], this.scratch[1], r);
    over.fill({ color: START_COLOR, alpha: 0.95 });

    this.vertexWorld(this.walk.exit, this.scratch, 0);
    over.circle(this.scratch[0], this.scratch[1], r);
    over.fill({ color: EXIT_COLOR, alpha: 0.95 });
    if (controller.solved) {
      over.circle(this.scratch[0], this.scratch[1], r * 1.5);
      over.stroke({
        color: EXIT_COLOR,
        width: this.threadWidth * 0.25,
        alpha: 0.9,
      });
    }
  }

  // Is the run's chain the UNDER pass of a crossing near ctrl f?
  private isUnderAt(chain: number, f: number): boolean {
    const list = this.underCtrls.get(chain);
    if (!list) return false;
    const len = this.ps.chains[chain].length;
    const closed = this.ps.chainBreakAfter[chain] < 0;
    const ff = this.ctrlMod(chain, f);
    for (const u of list) {
      let d = Math.abs(ff - u);
      if (closed) d = Math.min(d, len - d);
      if (d <= UNDER_HALF) return true;
    }
    return false;
  }

  // Recolor one run, split into under/over stretches by the live crossing
  // windows (each stretch extended one sample into its neighbor so the two
  // layers join seamlessly beneath the over thread).
  private strokeRunWoven(under: Graphics, over: Graphics, e: WalkEdge): void {
    const span = e.ctrlB - e.ctrlA;
    const count = Math.max(2, Math.ceil(span / SAMPLE_STEP) + 1);
    const xs = new Float32Array(count);
    const ys = new Float32Array(count);
    const isUnder = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const f = e.ctrlA + Math.min(span, i * SAMPLE_STEP);
      this.ps.pointOnChain(e.chain, this.ctrlMod(e.chain, f), this.scratch, 0);
      xs[i] = this.scratch[0];
      ys[i] = this.scratch[1];
      isUnder[i] = this.isUnderAt(e.chain, f) ? 1 : 0;
    }

    // Full thread width + opaque so it reads as the strand itself
    // recolored; slightly proud of the base width to cover its miter.
    const width = Math.max(0.08, this.threadWidth * 1.06);
    const style = {
      color: PATH_COLOR,
      width,
      alpha: 1,
      cap: "round" as const,
      join: "round" as const,
    };

    let s = 0;
    for (let i = 1; i <= count; i++) {
      if (i === count || isUnder[i] !== isUnder[s]) {
        const g = isUnder[s] ? under : over;
        const start = Math.max(0, s - 1);
        const end = Math.min(count - 1, i);
        g.moveTo(xs[start], ys[start]);
        for (let k = start + 1; k <= end; k++) g.lineTo(xs[k], ys[k]);
        g.stroke(style);
        s = i;
      }
    }
  }

  // A short translucent stroke along a tappable run, reaching from the
  // branch point into the run. Self-loop runs hint at both of their ends.
  private strokeHint(
    g: Graphics,
    e: WalkEdge,
    head: string,
    isBacktrack: boolean
  ): void {
    const style = {
      color: isBacktrack ? PATH_COLOR : HINT_COLOR,
      width: Math.max(0.1, this.threadWidth * 1.5),
      alpha: isBacktrack ? 0.22 : 0.3,
      cap: "round" as const,
      join: "round" as const,
    };
    const span = e.ctrlB - e.ctrlA;
    const reach = Math.min(HINT_REACH, span);
    const fromA = e.va === head;
    const selfLoop = e.va === e.vb;
    const spans: Array<[number, number]> =
      selfLoop && span > 2 * reach
        ? [
            [e.ctrlA, e.ctrlA + reach],
            [e.ctrlB - reach, e.ctrlB],
          ]
        : fromA
          ? [[e.ctrlA, e.ctrlA + reach]]
          : [[e.ctrlB - reach, e.ctrlB]];
    for (const [f0, f1] of spans) {
      const count = Math.max(2, Math.ceil((f1 - f0) / SAMPLE_STEP) + 1);
      for (let i = 0; i < count; i++) {
        const f = f0 + Math.min(f1 - f0, i * SAMPLE_STEP);
        this.ps.pointOnChain(
          e.chain,
          this.ctrlMod(e.chain, f),
          this.scratch,
          0
        );
        if (i === 0) g.moveTo(this.scratch[0], this.scratch[1]);
        else g.lineTo(this.scratch[0], this.scratch[1]);
      }
      g.stroke(style);
    }
  }

  destroy(): void {
    this.underContainer.destroy({ children: true });
    this.overContainer.destroy({ children: true });
  }
}
