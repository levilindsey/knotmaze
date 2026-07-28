// P4 maze mode overlay. The maze is a knot thread; this highlights the stretch
// of that thread the player has traced, ALONG the real (live) thread geometry,
// woven correctly: the highlight dips UNDER exactly where the maze strand dips
// under (read from the crossing over/under table), and rides over elsewhere -
// so it reads as the thread itself lighting up, not a line drawn on top.
//
// Two containers straddle the ribbon renderer in z-order (main.ts wires them):
// `underContainer` below the knot, `overContainer` above. Start/exit markers
// live in the over layer.

import { Container, Graphics } from "pixi.js";
import type { MazeGraph } from "../core/types";
import type { ParticleSystem } from "../physics/particle_system";
import type { MazeController } from "../game/maze_controller";

const START_COLOR = 0x46e35a;
const EXIT_COLOR = 0xff6b3d;
// The traveled thread is recolored to this (full width, opaque), so it reads
// as the strand itself changing color rather than a highlight drawn over it.
const PATH_COLOR = 0xffd24a;

// Control-sampling density along the thread (samples per control unit).
const SAMPLE_STEP = 0.25;

export class MazeRenderer {
  underContainer: Container;
  overContainer: Container;
  private ps: ParticleSystem;
  private maze: MazeGraph;
  private underGfx: Graphics;
  private overGfx: Graphics;
  private threadWidth: number;
  // 1 where the maze strand is the UNDER pass of a crossing (per control).
  private underAtCtrl: Uint8Array;
  private scratch = new Float32Array(2);

  constructor(ps: ParticleSystem, maze: MazeGraph, threadWidth: number) {
    this.ps = ps;
    this.maze = maze;
    this.threadWidth = threadWidth;
    this.underContainer = new Container();
    this.overContainer = new Container();
    this.underGfx = new Graphics();
    this.overGfx = new Graphics();
    this.underContainer.addChild(this.underGfx);
    this.overContainer.addChild(this.overGfx);

    // Where does the maze strand pass UNDER? Mark a small control window around
    // each crossing whose under-pass is on this strand. (Built once from the
    // initial, integer node controls; the over/under identity is topological
    // and fixed even as bindings slide.)
    this.underAtCtrl = new Uint8Array(maze.chainLen);
    for (const c of ps.crossings) {
      if (c.under.chain === maze.strand) {
        const u = Math.round(c.under.ctrl);
        for (let d = -1; d <= 1; d++) {
          this.underAtCtrl[(((u + d) % maze.chainLen) + maze.chainLen) % maze.chainLen] = 1;
        }
      }
    }
  }

  setVisible(visible: boolean): void {
    this.underContainer.visible = visible;
    this.overContainer.visible = visible;
  }

  setThreadWidth(w: number): void {
    this.threadWidth = w;
  }

  // Live world position of path node k (0 = start, maze.steps = exit).
  nodeWorld(k: number, out: Float32Array, offset: number): void {
    const f = (this.maze.ctrlStart + 2 * k) % this.maze.chainLen;
    this.ps.pointOnChain(this.maze.strand, f, out, offset);
  }

  // Nearest reachable path node to a world point, or -1 if none within range.
  nodeAt(x: number, y: number): number {
    let best = -1;
    let bestD = Infinity;
    const maxD = Math.max(0.9, this.threadWidth * 1.6);
    for (let k = 0; k <= this.maze.steps; k++) {
      this.nodeWorld(k, this.scratch, 0);
      const dx = this.scratch[0] - x;
      const dy = this.scratch[1] - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    return bestD <= maxD * maxD ? best : -1;
  }

  update(controller: MazeController): void {
    this.draw(controller);
  }

  private draw(controller: MazeController): void {
    const under = this.underGfx;
    const over = this.overGfx;
    under.clear();
    over.clear();

    // Highlight the traced stretch, woven under/over with the knot.
    if (controller.head > 0) {
      this.strokeWoven(under, over, controller.head);
    }

    // Start and exit markers (over layer, always visible).
    const r = Math.max(0.32, this.threadWidth * 0.95);
    this.nodeWorld(0, this.scratch, 0);
    over.circle(this.scratch[0], this.scratch[1], r);
    over.fill({ color: START_COLOR, alpha: 0.92 });

    this.nodeWorld(this.maze.steps, this.scratch, 0);
    over.circle(this.scratch[0], this.scratch[1], r);
    over.fill({ color: EXIT_COLOR, alpha: controller.solved ? 0.98 : 0.92 });
    if (controller.solved) {
      over.circle(this.scratch[0], this.scratch[1], r * 1.5);
      over.stroke({ color: EXIT_COLOR, width: this.threadWidth * 0.25, alpha: 0.9 });
    }
  }

  // Sample the thread from the start control to node `head`, and stroke it into
  // the under/over layers by the crossing weave.
  private strokeWoven(under: Graphics, over: Graphics, head: number): void {
    const { ctrlStart, chainLen } = this.maze;
    const endCtrl = 2 * head; // relative to ctrlStart
    const count = Math.max(2, Math.ceil(endCtrl / SAMPLE_STEP) + 1);

    // Sample world points + under flags along the arc.
    const xs = new Float32Array(count);
    const ys = new Float32Array(count);
    const isUnder = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const rel = Math.min(endCtrl, i * SAMPLE_STEP);
      const abs = (ctrlStart + rel) % chainLen;
      this.ps.pointOnChain(this.maze.strand, abs, this.scratch, 0);
      xs[i] = this.scratch[0];
      ys[i] = this.scratch[1];
      isUnder[i] = this.underAtCtrl[Math.floor(abs) % chainLen];
    }

    // Full thread width + opaque, so it overpaints the base ribbon and reads
    // as a recolor of the thread itself. Slightly proud of the base width to
    // cover the ribbon's miter at sharp turns.
    const width = Math.max(0.08, this.threadWidth * 1.06);
    const style = { color: PATH_COLOR, width, alpha: 1, cap: "round" as const, join: "round" as const };

    // Emit runs of equal flag, each extended one sample into its neighbors so
    // the under and over layers join seamlessly under the crossing threads.
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

  destroy(): void {
    this.underContainer.destroy({ children: true });
    this.overContainer.destroy({ children: true });
  }
}
