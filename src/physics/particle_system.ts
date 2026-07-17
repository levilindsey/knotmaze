// Layer 3: Verlet-integrated particles over the tangle graph. Each strand is
// an INDEPENDENT closed chain of particles (one per graph node occurrence
// plus one per edge midpoint) - nothing is anchored to the lattice, and
// crossings are SLIDING BINDINGS rather than shared particles: each crossing
// tracks a fractional position along each of its two threads, re-projects
// onto the local geometry every substep (so the intersection point migrates
// along both threads), and a coincidence constraint holds the two points
// together. Ordering clamps keep crossings from sliding past their neighbors
// along a thread, preserving the diagram's topology while the overall shape
// relaxes into an organic, force-directed equilibrium.

import type { TangleGraph } from "../core/types";
import { NODE_TYPE } from "../core/types";
import type { DistanceConstraint } from "./forces";
import { applyDistanceConstraints, applyRepulsion } from "./forces";
import { SeededRNG } from "../util/random";
import { createNoise3D } from "simplex-noise";

export interface CrossingPass {
  chain: number; // Chain (strand) index.
  ctrl: number; // FRACTIONAL control position along the chain; slides live.
}

export interface CrossingInfo {
  over: CrossingPass;
  under: CrossingPass;
}

// Fixed physics timestep; frames accumulate real time into substeps.
// The per-frame cap must be generous: Chrome throttles rAF to ~1fps for
// occluded (or occlusion-misdetected) windows, and a small cap would pin
// the sim at a few percent of real time - the knot freezes mid-settle,
// which reads as kinked threads and notched crossings. A large cap lets
// throttled tabs catch up in bursts.
const SUBSTEP = 1 / 120;
const MAX_SUBSTEPS_PER_FRAME = 30;
const MAX_FRAME_DT = 0.25;
const CONSTRAINT_ITERATIONS = 2;
const DAMPING = 0.9;

// The hero settle: structural rest lengths are stored at their full lattice
// values, so the angular initial state is a true equilibrium. Over
// SETTLE_DURATION seconds a smoothstep ramp shrinks rests toward the slack-
// dependent target and fades bending in, so corners visibly open into smooth
// curves while the constraints themselves stay stiff (crisp at every moment).
const SETTLE_DURATION = 2.2;
const STRUCTURAL_STIFFNESS = 0.7;
const BENDING_STIFFNESS = 0.18;
const REPULSION_STIFFNESS = 0.15;

// Slack [0, 1] shapes the rest state: 0 = taut threads pulled tight against
// the crossings, 1 = loose threads with round, continuous curvature and
// generous spacing. It interpolates three knobs:
const SHRINK_TAUT = 0.82; // Rest-length fraction at slack 0...
const SHRINK_LOOSE = 0.97; // ...and at slack 1.
// The taut floor must stay high enough that threads never kink at
// crossings at TRUE equilibrium (validate with a real-time run, not a
// virtual-time screenshot): taut string over a peg bends at a small round
// radius, not a corner. Tautness comes from the structural shrink, not
// from bending going slack.
const BEND_TAUT = 2.8; // Bending-stiffness multiplier at slack 0...
const BEND_LOOSE = 3.0; // ...and at slack 1.
const REPULSE_DIST_TAUT = 0.62; // Repulsion min distance at slack 0...
const REPULSE_DIST_LOOSE = 0.95; // ...and at slack 1.

const TEMPERATURE_SCALE = 0.05;
const NOISE_SPATIAL_FREQ = 0.3;
const NOISE_TIME_FREQ = 0.8;

// Sliding-crossing tuning. Bindings re-project within a small local window
// each substep, rate-limited for stability; passes along one chain keep a
// minimum separation (in control units, 2 per lattice edge) so crossings
// never swap order; the coincidence constraint is applied inside the
// iteration loop; particles inside a crossing's windows are exempt from
// repulsion against the other side (the threads are supposed to touch).
const MAX_SLIDE_PER_SUBSTEP = 0.04;
const SLIDE_EASE = 0.2;
const MIN_PASS_SEPARATION = 1.1;
const COUPLING_STIFFNESS = 0.45;
// Zones must cover everything within repulsion range of the contact point,
// or boundary particles get pushed while the coupling pulls - a limit cycle.
const CROSSING_ZONE_HALF = 4;
// Without lattice anchors the knot free-floats; a gentle pull keeps its
// centroid where it started (applied to positions and prev alike, so it
// injects no velocity).
const CENTER_PULL = 0.04;

export class ParticleSystem {
  particleCount: number;
  positions: Float32Array;
  chains: number[][]; // Closed particle-index loops, one per strand.
  crossings: CrossingInfo[];

  private prev: Float32Array;
  private initial: Float32Array;
  private structural: DistanceConstraint[] = [];
  private bending: DistanceConstraint[] = [];
  private excludedPairs = new Set<number>();
  private noise3D: (x: number, y: number, z: number) => number;
  private time = 0;
  private accumulator = 0;
  private substepCount = 0;
  private frameMaxMoveSq = 0;
  private grabbed = -1;
  private grabX = 0;
  private grabY = 0;
  private particleChain: Int32Array;
  private passesByChain: CrossingPass[][] = [];
  private passPrev = new Map<CrossingPass, CrossingPass>();
  private passNext = new Map<CrossingPass, CrossingPass>();
  private initialCtrl = new Map<CrossingPass, number>();
  private repulsionZone: Int32Array;
  private homeX = 0;
  private homeY = 0;

  constructor(graph: TangleGraph) {
    const initialPositions: number[] = [];
    const addParticle = (x: number, y: number): number => {
      initialPositions.push(x, y);
      return initialPositions.length / 2 - 1;
    };

    // Build fully independent chains: every node occurrence gets its own
    // particle (crossings appear once per pass).
    const occurrences = new Map<
      string,
      Array<{ pass: CrossingPass; isOver: boolean }>
    >();

    this.chains = graph.strands.map((strand, chainIdx) => {
      const chain: number[] = [];
      const nodeCount = strand.nodes.length - 1; // Last repeats the first.
      for (let i = 0; i < nodeCount; i++) {
        const node = graph.nodes.get(strand.nodes[i])!;
        if (node.type === NODE_TYPE.CROSSING) {
          const pass: CrossingPass = { chain: chainIdx, ctrl: chain.length };
          const list = occurrences.get(node.id);
          const entry = { pass, isOver: node.isOver === true };
          if (list) list.push(entry);
          else occurrences.set(node.id, [entry]);
        }
        chain.push(addParticle(node.latticePos[0], node.latticePos[1]));

        const edge = graph.edges.get(strand.edgeIds[i])!;
        const [pa, pb] = edge.latticePoints;
        chain.push(addParticle((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2));
      }
      return chain;
    });

    this.particleCount = initialPositions.length / 2;
    this.initial = new Float32Array(initialPositions);
    this.positions = new Float32Array(this.initial);
    this.prev = new Float32Array(this.initial);
    this.repulsionZone = new Int32Array(this.particleCount).fill(-1);

    for (let i = 0; i < this.particleCount; i++) {
      this.homeX += this.initial[i * 2];
      this.homeY += this.initial[i * 2 + 1];
    }
    this.homeX /= this.particleCount;
    this.homeY /= this.particleCount;

    this.buildConstraints();
    this.crossings = this.assignCrossings(occurrences);
    this.buildPassOrder();

    this.particleChain = new Int32Array(this.particleCount).fill(-1);
    this.chains.forEach((chain, chainIdx) => {
      for (const p of chain) {
        if (this.particleChain[p] < 0) this.particleChain[p] = chainIdx;
      }
    });

    const noiseRng = new SeededRNG((graph.seed ^ 0x9e3779b9) >>> 0);
    this.noise3D = createNoise3D(() => noiseRng.next());
  }

  private buildConstraints(): void {
    const dist = (a: number, b: number): number =>
      Math.hypot(
        this.initial[b * 2] - this.initial[a * 2],
        this.initial[b * 2 + 1] - this.initial[a * 2 + 1]
      );

    for (const chain of this.chains) {
      const len = chain.length;
      for (let i = 0; i < len; i++) {
        const a = chain[i];
        const b = chain[(i + 1) % len];
        // Rests stored at full lattice length; the settle ramp scales them.
        this.structural.push({
          a,
          b,
          rest: dist(a, b),
          stiffness: STRUCTURAL_STIFFNESS,
        });

        // Bending: pull i-1 and i+1 apart toward a straight line.
        const p = chain[(i - 1 + len) % len];
        this.bending.push({
          a: p,
          b,
          rest: dist(p, a) + dist(a, b),
          stiffness: BENDING_STIFFNESS,
          pullOnly: true,
        });

        // Exclude chain neighbors (within 2 steps) from repulsion.
        for (const span of [1, 2]) {
          const c = chain[(i + span) % len];
          const lo = Math.min(a, c);
          const hi = Math.max(a, c);
          if (lo !== hi) this.excludedPairs.add(lo * 65536 + hi);
        }
      }
    }
  }

  // Pair up the two passes of each crossing and assign over/under from the
  // graph's checkerboard bit (isOver = the "/" pass goes over), using the
  // initial geometry for the diagonal class of each pass.
  private assignCrossings(
    occurrences: Map<string, Array<{ pass: CrossingPass; isOver: boolean }>>
  ): CrossingInfo[] {
    const crossings: CrossingInfo[] = [];
    for (const list of occurrences.values()) {
      if (list.length !== 2) {
        throw new Error("Crossing does not have exactly two passes; bug.");
      }
      const isSlash = (pass: CrossingPass): boolean => {
        const chain = this.chains[pass.chain];
        const p = chain[pass.ctrl];
        const next = chain[(pass.ctrl + 1) % chain.length];
        const vx = this.initial[next * 2] - this.initial[p * 2];
        const vy = this.initial[next * 2 + 1] - this.initial[p * 2 + 1];
        return vx * vy > 0;
      };
      const slashFirst = isSlash(list[0].pass);
      const overFirst = list[0].isOver ? slashFirst : !slashFirst;
      crossings.push({
        over: overFirst ? list[0].pass : list[1].pass,
        under: overFirst ? list[1].pass : list[0].pass,
      });
    }
    return crossings;
  }

  // Sorted pass lists per chain, with cyclic prev/next links used by the
  // slide's ordering clamps (and by the renderer's patch clearances).
  private buildPassOrder(): void {
    this.passesByChain = this.chains.map(() => []);
    for (const c of this.crossings) {
      this.passesByChain[c.over.chain].push(c.over);
      this.passesByChain[c.under.chain].push(c.under);
      this.initialCtrl.set(c.over, c.over.ctrl);
      this.initialCtrl.set(c.under, c.under.ctrl);
    }
    for (const list of this.passesByChain) {
      list.sort((a, b) => a.ctrl - b.ctrl);
      for (let i = 0; i < list.length; i++) {
        this.passNext.set(list[i], list[(i + 1) % list.length]);
        this.passPrev.set(list[i], list[(i - 1 + list.length) % list.length]);
      }
    }
  }

  passNeighbors(pass: CrossingPass): { prev: CrossingPass; next: CrossingPass } {
    return {
      prev: this.passPrev.get(pass) ?? pass,
      next: this.passNext.get(pass) ?? pass,
    };
  }

  // World position of a fractional control position along a chain.
  bindingPoint(pass: CrossingPass, out: Float32Array, offset: number): void {
    const chain = this.chains[pass.chain];
    const len = chain.length;
    const i = Math.floor(pass.ctrl);
    const t = pass.ctrl - i;
    const a = chain[((i % len) + len) % len];
    const b = chain[(((i + 1) % len) + len) % len];
    out[offset] =
      this.positions[a * 2] * (1 - t) + this.positions[b * 2] * t;
    out[offset + 1] =
      this.positions[a * 2 + 1] * (1 - t) + this.positions[b * 2 + 1] * t;
  }

  // Separation between a crossing's two bound points (diagnostic/tests).
  crossingSeparation(c: CrossingInfo): number {
    this.bindingPoint(c.over, this.bindScratch, 0);
    this.bindingPoint(c.under, this.bindScratch, 2);
    return Math.hypot(
      this.bindScratch[2] - this.bindScratch[0],
      this.bindScratch[3] - this.bindScratch[1]
    );
  }
  private bindScratch = new Float32Array(4);

  get simTime(): number {
    return this.time;
  }

  get maxMove(): number {
    return Math.sqrt(this.frameMaxMoveSq);
  }

  get settleComplete(): boolean {
    return this.time > SETTLE_DURATION + 0.3;
  }

  reset(): void {
    this.positions.set(this.initial);
    this.prev.set(this.initial);
    this.time = 0;
    this.accumulator = 0;
    this.grabbed = -1;
    for (const [pass, ctrl] of this.initialCtrl) pass.ctrl = ctrl;
  }

  get grabbedParticle(): number {
    return this.grabbed;
  }

  // Nearest particle within radius (lattice units), or -1. Pure query.
  nearest(x: number, y: number, radius: number): number {
    let best = -1;
    let bestDistSq = radius * radius;
    for (let i = 0; i < this.particleCount; i++) {
      const dx = this.positions[i * 2] - x;
      const dy = this.positions[i * 2 + 1] - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = i;
      }
    }
    return best;
  }

  // Grab the nearest particle within radius; returns its index or -1.
  // While grabbed, substeps pull it stiffly toward the drag target, and
  // the springs propagate the tug through the knot.
  grab(x: number, y: number, radius = 0.7): number {
    this.grabbed = this.nearest(x, y, radius);
    if (this.grabbed >= 0) {
      this.grabX = x;
      this.grabY = y;
    }
    return this.grabbed;
  }

  dragTo(x: number, y: number): void {
    this.grabX = x;
    this.grabY = y;
  }

  // Release the grabbed particle; reports which chain was plucked and the
  // release speed (lattice units/second) for pluck loudness.
  release(): { particle: number; chain: number; speed: number } | null {
    if (this.grabbed < 0) return null;
    const p = this.grabbed;
    this.grabbed = -1;
    const vx = this.positions[p * 2] - this.prev[p * 2];
    const vy = this.positions[p * 2 + 1] - this.prev[p * 2 + 1];
    return {
      particle: p,
      chain: this.particleChain[p],
      speed: Math.hypot(vx, vy) / SUBSTEP,
    };
  }

  // Current arc length of a chain, for mapping loop size to pluck pitch.
  chainArcLength(chainIdx: number): number {
    const chain = this.chains[chainIdx];
    let arc = 0;
    for (let k = 0; k < chain.length; k++) {
      const a = chain[k];
      const b = chain[(k + 1) % chain.length];
      arc += Math.hypot(
        this.positions[b * 2] - this.positions[a * 2],
        this.positions[b * 2 + 1] - this.positions[a * 2 + 1]
      );
    }
    return arc;
  }

  step(dt: number, temperature: number, slack = 0.5): void {
    this.accumulator += Math.min(dt, MAX_FRAME_DT);
    let substeps = Math.floor(this.accumulator / SUBSTEP);
    substeps = Math.min(substeps, MAX_SUBSTEPS_PER_FRAME);
    this.accumulator = Math.max(0, this.accumulator - substeps * SUBSTEP);

    if (substeps > 0) this.frameMaxMoveSq = 0;
    for (let s = 0; s < substeps; s++) {
      this.substep(temperature, slack);
    }
  }

  // Re-project a binding onto its local chain geometry so the crossing can
  // slide along the thread toward wherever the other thread actually is.
  private slideBinding(self: CrossingPass, qx: number, qy: number): void {
    const chain = this.chains[self.chain];
    const len = chain.length;
    const i0 = Math.floor(self.ctrl);

    let bestF = self.ctrl;
    let bestDistSq = Infinity;
    for (let s = i0 - 1; s <= i0 + 1; s++) {
      const a = chain[((s % len) + len) % len];
      const b = chain[(((s + 1) % len) + len) % len];
      const ax = this.positions[a * 2];
      const ay = this.positions[a * 2 + 1];
      const bx = this.positions[b * 2];
      const by = this.positions[b * 2 + 1];
      const ex = bx - ax;
      const ey = by - ay;
      const lenSq = ex * ex + ey * ey;
      const t =
        lenSq > 1e-12
          ? Math.max(0, Math.min(1, ((qx - ax) * ex + (qy - ay) * ey) / lenSq))
          : 0;
      const px = ax + ex * t;
      const py = ay + ey * t;
      const dSq = (px - qx) * (px - qx) + (py - qy) * (py - qy);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestF = s + t;
      }
    }

    // Ease toward the projection with a hard rate limit, then keep order
    // against neighboring passes on this chain.
    let f =
      self.ctrl +
      Math.max(
        -MAX_SLIDE_PER_SUBSTEP,
        Math.min(MAX_SLIDE_PER_SUBSTEP, (bestF - self.ctrl) * SLIDE_EASE)
      );
    const prev = this.passPrev.get(self);
    const next = this.passNext.get(self);
    if (prev && next && prev !== self) {
      const cyc = (d: number): number => ((d % len) + len) % len;
      if (cyc(f - prev.ctrl) < MIN_PASS_SEPARATION) {
        f = prev.ctrl + MIN_PASS_SEPARATION;
      }
      if (cyc(next.ctrl - f) < MIN_PASS_SEPARATION) {
        f = next.ctrl - MIN_PASS_SEPARATION;
      }
    }
    self.ctrl = ((f % len) + len) % len;
  }

  private substep(temperature: number, slack: number): void {
    this.time += SUBSTEP;
    this.substepCount++;

    // Temperature: Simplex-noise agitation, injected as velocity.
    if (temperature > 0) {
      const amp = temperature * TEMPERATURE_SCALE;
      const t = this.time * NOISE_TIME_FREQ;
      for (let i = 0; i < this.particleCount; i++) {
        const nx = this.positions[i * 2] * NOISE_SPATIAL_FREQ;
        const ny = this.positions[i * 2 + 1] * NOISE_SPATIAL_FREQ;
        this.prev[i * 2] -= this.noise3D(nx, ny, t) * amp;
        this.prev[i * 2 + 1] -= this.noise3D(nx + 137, ny + 71, t) * amp;
      }
    }

    // Verlet integration. (current - prev) is the net displacement of the
    // previous substep, so quiescence tracking is free here.
    for (let i = 0; i < this.particleCount * 2; i++) {
      const current = this.positions[i];
      const d = current - this.prev[i];
      if (d * d > this.frameMaxMoveSq) this.frameMaxMoveSq = d * d;
      this.positions[i] = current + d * DAMPING;
      this.prev[i] = current;
    }

    // Settle ramp: 0 at load (lattice equilibrium) -> 1 when fully relaxed.
    const x = Math.min(this.time / SETTLE_DURATION, 1);
    const settle = x * x * (3 - 2 * x);

    const shrink = SHRINK_TAUT + (SHRINK_LOOSE - SHRINK_TAUT) * slack;
    const restScale = 1 - (1 - shrink) * settle;
    const bendScale = settle * (BEND_TAUT + (BEND_LOOSE - BEND_TAUT) * slack);
    const repulseDist =
      REPULSE_DIST_TAUT + (REPULSE_DIST_LOOSE - REPULSE_DIST_TAUT) * slack;

    // Slide bindings toward the other thread's current point, then mark
    // repulsion-exempt zones around every binding.
    this.repulsionZone.fill(-1);
    for (let c = 0; c < this.crossings.length; c++) {
      const crossing = this.crossings[c];
      this.bindingPoint(crossing.over, this.bindScratch, 0);
      this.bindingPoint(crossing.under, this.bindScratch, 2);
      this.slideBinding(crossing.over, this.bindScratch[2], this.bindScratch[3]);
      this.slideBinding(crossing.under, this.bindScratch[0], this.bindScratch[1]);

      for (const pass of [crossing.over, crossing.under]) {
        const chain = this.chains[pass.chain];
        const len = chain.length;
        const base = Math.floor(pass.ctrl);
        for (
          let k = base - CROSSING_ZONE_HALF;
          k <= base + CROSSING_ZONE_HALF + 1;
          k++
        ) {
          this.repulsionZone[chain[((k % len) + len) % len]] = c;
        }
      }
    }

    for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
      // The grabbed particle chases the pointer stiffly; springs carry the
      // tug outward through the knot.
      if (this.grabbed >= 0) {
        const g = this.grabbed;
        this.positions[g * 2] += (this.grabX - this.positions[g * 2]) * 0.6;
        this.positions[g * 2 + 1] +=
          (this.grabY - this.positions[g * 2 + 1]) * 0.6;
      }
      applyDistanceConstraints(this.positions, this.structural, restScale);
      applyDistanceConstraints(
        this.positions,
        this.bending,
        restScale,
        bendScale
      );

      // Repulsion runs at full strength from the first substep: while the
      // settle ramp shrinks rests, parallel threads get dragged toward the
      // same corridor line, and weak early repulsion lets them pass through
      // each other and lock into braided local minima.
      applyRepulsion(
        this.positions,
        this.particleCount,
        repulseDist,
        REPULSION_STIFFNESS,
        this.excludedPairs,
        this.repulsionZone
      );

      // Coincidence coupling LAST, so nothing re-separates the crossing
      // within the iteration: pull each crossing's two bound points
      // together, distributing corrections to the surrounding particles.
      for (const crossing of this.crossings) {
        this.bindingPoint(crossing.over, this.bindScratch, 0);
        this.bindingPoint(crossing.under, this.bindScratch, 2);
        const dx =
          (this.bindScratch[2] - this.bindScratch[0]) *
          0.5 *
          COUPLING_STIFFNESS;
        const dy =
          (this.bindScratch[3] - this.bindScratch[1]) *
          0.5 *
          COUPLING_STIFFNESS;
        this.applyBindingCorrection(crossing.over, dx, dy);
        this.applyBindingCorrection(crossing.under, -dx, -dy);
      }
    }

    // Keep the free-floating knot centered without injecting velocity.
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < this.particleCount; i++) {
      cx += this.positions[i * 2];
      cy += this.positions[i * 2 + 1];
    }
    cx /= this.particleCount;
    cy /= this.particleCount;
    const shiftX = (this.homeX - cx) * CENTER_PULL;
    const shiftY = (this.homeY - cy) * CENTER_PULL;
    for (let i = 0; i < this.particleCount; i++) {
      this.positions[i * 2] += shiftX;
      this.positions[i * 2 + 1] += shiftY;
      this.prev[i * 2] += shiftX;
      this.prev[i * 2 + 1] += shiftY;
    }
  }

  private applyBindingCorrection(
    pass: CrossingPass,
    dx: number,
    dy: number
  ): void {
    const chain = this.chains[pass.chain];
    const len = chain.length;
    const i = Math.floor(pass.ctrl);
    const t = pass.ctrl - i;
    const a = chain[((i % len) + len) % len];
    const b = chain[(((i + 1) % len) + len) % len];
    // Normalize by the lerp-weight energy so the bound POINT moves by
    // exactly (dx, dy) rather than a t-dependent fraction of it.
    const w = (1 - t) * (1 - t) + t * t;
    this.positions[a * 2] += (dx * (1 - t)) / w;
    this.positions[a * 2 + 1] += (dy * (1 - t)) / w;
    this.positions[b * 2] += (dx * t) / w;
    this.positions[b * 2 + 1] += (dy * t) / w;
  }
}
