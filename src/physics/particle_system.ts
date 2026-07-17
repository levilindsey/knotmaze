// Layer 3: Verlet-integrated particles over the tangle graph. Each strand
// becomes a closed chain of particles: one per graph node plus one per edge
// midpoint. Crossing particles are SHARED between the two passes, so threads
// stay joined at crossings and tugs propagate across the whole knot.

import type { TangleGraph } from "../core/types";
import { NODE_TYPE } from "../core/types";
import type { DistanceConstraint, AnchorConstraint } from "./forces";
import {
  applyDistanceConstraints,
  applyAnchors,
  applyRepulsion,
} from "./forces";
import { SeededRNG } from "../util/random";
import { createNoise3D } from "simplex-noise";

export interface CrossingPass {
  chain: number; // Chain (strand) index.
  ctrl: number;  // Control-point index within the chain.
}

export interface CrossingInfo {
  particle: number;
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
const ANCHOR_STIFFNESS = 0.25;
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

export class ParticleSystem {
  particleCount: number;
  positions: Float32Array;
  chains: number[][]; // Closed particle-index loops, one per strand.
  crossings: CrossingInfo[];

  private prev: Float32Array;
  private initial: Float32Array;
  private structural: DistanceConstraint[] = [];
  private bending: DistanceConstraint[] = [];
  private anchors: AnchorConstraint[] = [];
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

  constructor(graph: TangleGraph) {
    const particleByKey = new Map<string, number>();
    const initialPositions: number[] = [];

    const getParticle = (k: string, x: number, y: number): number => {
      let idx = particleByKey.get(k);
      if (idx === undefined) {
        idx = initialPositions.length / 2;
        initialPositions.push(x, y);
        particleByKey.set(k, idx);
      }
      return idx;
    };

    // Build closed chains: node, edge midpoint, node, edge midpoint, ...
    this.chains = graph.strands.map((strand) => {
      const chain: number[] = [];
      const nodeCount = strand.nodes.length - 1; // Last repeats the first.
      for (let i = 0; i < nodeCount; i++) {
        const node = graph.nodes.get(strand.nodes[i])!;
        chain.push(
          getParticle(node.id, node.latticePos[0], node.latticePos[1])
        );

        const edge = graph.edges.get(strand.edgeIds[i])!;
        const [pa, pb] = edge.latticePoints;
        chain.push(
          getParticle(edge.id, (pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2)
        );
      }
      return chain;
    });

    this.particleCount = initialPositions.length / 2;
    this.initial = new Float32Array(initialPositions);
    this.positions = new Float32Array(this.initial);
    this.prev = new Float32Array(this.initial);

    this.buildConstraints(graph, particleByKey);
    this.crossings = this.findCrossings(graph, particleByKey);

    // First chain each particle belongs to (crossings belong to two; the
    // first is fine for pluck-pitch purposes).
    this.particleChain = new Int32Array(this.particleCount).fill(-1);
    this.chains.forEach((chain, chainIdx) => {
      for (const p of chain) {
        if (this.particleChain[p] < 0) this.particleChain[p] = chainIdx;
      }
    });

    const noiseRng = new SeededRNG((graph.seed ^ 0x9e3779b9) >>> 0);
    this.noise3D = createNoise3D(() => noiseRng.next());
  }

  private buildConstraints(
    graph: TangleGraph,
    particleByKey: Map<string, number>
  ): void {
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

    // Crossings anchor to their lattice positions to preserve the tangle's
    // global layout while everything between them relaxes.
    for (const [nodeId, node] of graph.nodes) {
      if (node.type !== NODE_TYPE.CROSSING) continue;
      const p = particleByKey.get(nodeId)!;
      this.anchors.push({
        p,
        x: node.latticePos[0],
        y: node.latticePos[1],
        stiffness: ANCHOR_STIFFNESS,
      });
    }
  }

  private findCrossings(
    graph: TangleGraph,
    particleByKey: Map<string, number>
  ): CrossingInfo[] {
    // Collect the two passes through each crossing particle, with the
    // diagonal class of each pass taken from the initial geometry.
    const passes = new Map<
      number,
      Array<{ pass: CrossingPass; isSlash: boolean }>
    >();

    const crossingParticles = new Set<number>();
    for (const [nodeId, node] of graph.nodes) {
      if (node.type === NODE_TYPE.CROSSING) {
        crossingParticles.add(particleByKey.get(nodeId)!);
      }
    }

    this.chains.forEach((chain, chainIdx) => {
      const len = chain.length;
      for (let i = 0; i < len; i++) {
        const particle = chain[i];
        if (!crossingParticles.has(particle)) continue;

        const next = chain[(i + 1) % len];
        const vx = this.initial[next * 2] - this.initial[particle * 2];
        const vy = this.initial[next * 2 + 1] - this.initial[particle * 2 + 1];
        const entry = { pass: { chain: chainIdx, ctrl: i }, isSlash: vx * vy > 0 };

        const list = passes.get(particle);
        if (list) list.push(entry);
        else passes.set(particle, [entry]);
      }
    });

    const crossings: CrossingInfo[] = [];
    for (const [nodeId, node] of graph.nodes) {
      if (node.type !== NODE_TYPE.CROSSING) continue;
      const particle = particleByKey.get(nodeId)!;
      const list = passes.get(particle);
      if (!list || list.length !== 2) {
        throw new Error("Crossing does not have exactly two passes; bug.");
      }
      // isOver means the "/" pass goes over.
      const slashFirst = list[0].isSlash;
      const overFirst = node.isOver ? slashFirst : !slashFirst;
      crossings.push({
        particle,
        over: overFirst ? list[0].pass : list[1].pass,
        under: overFirst ? list[1].pass : list[0].pass,
      });
    }
    return crossings;
  }

  reset(): void {
    this.positions.set(this.initial);
    this.prev.set(this.initial);
    this.time = 0;
    this.accumulator = 0;
    this.grabbed = -1;
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

  // Simulated seconds since construction/reset; wall-clock comparison
  // reveals rAF throttling.
  get simTime(): number {
    return this.time;
  }

  // Largest single-component particle displacement in the most recent
  // substep, measured for free during Verlet integration. Drives the
  // renderer's quiescence detection.
  get maxMove(): number {
    return Math.sqrt(this.frameMaxMoveSq);
  }

  // The initial lattice state is itself an equilibrium, so quiescence
  // detection must not engage until the settle ramp has fully played out.
  get settleComplete(): boolean {
    return this.time > SETTLE_DURATION + 0.3;
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
      applyAnchors(this.positions, this.anchors);
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
        this.excludedPairs
      );
    }
  }
}
