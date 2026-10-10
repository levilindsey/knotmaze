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

import { Container, Graphics } from "pixi.js";
import type { ParticleSystem } from "../physics/particle_system";
import type { WalkGraph } from "../core/walk_graph";
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

export class FabricMazeRenderer {
  overContainer: Container;
  private ps: ParticleSystem;
  private walk: WalkGraph;
  private ribbons: RibbonRenderer;
  private gfx: Graphics;
  private threadWidth: number;
  private hoverEdge = -1;
  private scratch = new Float32Array(2);

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

  // Refresh the paint declaration (traveled spans + pulse arms) and redraw
  // the markers.
  update(controller: FabricMazeController): void {
    const spans: PaintSpan[] = [];
    const onPath = new Set<number>();
    for (const eid of controller.pathEdges) {
      const e = this.walk.edges[eid];
      spans.push({ chain: e.chain, c0: e.ctrlA, c1: e.ctrlB });
      onPath.add(eid);
    }

    // Junction caps: at every vertex the path traversed, several ribbons
    // converge and overlap (bridge tips ride their hosts; merged crossings
    // overlap diagonally). Painting each arm's immediate neighborhood gold
    // hides the overlap footprint in both directions. The head vertex keeps
    // its pulse affordance instead (and wears the head marker), except once
    // solved.
    const caps: PaintCap[] = [];
    const capR = Math.max(0.3, this.threadWidth * 0.95);
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
            onPath: onPath.has(eid),
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

    // Markers.
    const g = this.gfx;
    g.clear();
    const rHead = Math.max(0.24, this.threadWidth * 0.72);
    this.vertexWorld(controller.head, this.scratch, 0);
    g.circle(this.scratch[0], this.scratch[1], rHead);
    g.fill({ color: 0xffffff, alpha: 0.92 });

    const r = Math.max(0.32, this.threadWidth * 0.95);
    this.vertexWorld(this.walk.start, this.scratch, 0);
    g.circle(this.scratch[0], this.scratch[1], r);
    g.fill({ color: START_COLOR, alpha: 0.95 });

    this.vertexWorld(this.walk.exit, this.scratch, 0);
    g.circle(this.scratch[0], this.scratch[1], r);
    g.fill({ color: EXIT_COLOR, alpha: 0.95 });
    if (controller.solved) {
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
