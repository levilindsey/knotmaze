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
const SUBSTEP = 1 / 120;
const MAX_SUBSTEPS_PER_FRAME = 5;
const CONSTRAINT_ITERATIONS = 2;
const DAMPING = 0.9;

// The hero settle: structural rest lengths are stored at their full lattice
// values, so the angular initial state is a true equilibrium. Over
// SETTLE_DURATION seconds a smoothstep ramp shrinks rests toward REST_SHRINK
// and fades bending in, so corners visibly open into smooth curves while the
// constraints themselves stay stiff (crisp at every moment).
const SETTLE_DURATION = 2.2;
const REST_SHRINK = 0.82;
const STRUCTURAL_STIFFNESS = 0.7;
const BENDING_STIFFNESS = 0.18;
const ANCHOR_STIFFNESS = 0.25;
const REPULSION_MIN_DIST = 0.65;
const REPULSION_STIFFNESS = 0.15;
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
  }

  step(dt: number, temperature: number): void {
    this.accumulator += Math.min(dt, 0.1);
    let substeps = Math.floor(this.accumulator / SUBSTEP);
    substeps = Math.min(substeps, MAX_SUBSTEPS_PER_FRAME);
    this.accumulator = Math.max(0, this.accumulator - substeps * SUBSTEP);

    for (let s = 0; s < substeps; s++) {
      this.substep(temperature);
    }
  }

  private substep(temperature: number): void {
    this.time += SUBSTEP;

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

    // Verlet integration.
    for (let i = 0; i < this.particleCount * 2; i++) {
      const current = this.positions[i];
      this.positions[i] = current + (current - this.prev[i]) * DAMPING;
      this.prev[i] = current;
    }

    // Settle ramp: 0 at load (lattice equilibrium) -> 1 when fully relaxed.
    const x = Math.min(this.time / SETTLE_DURATION, 1);
    const settle = x * x * (3 - 2 * x);
    const restScale = 1 - (1 - REST_SHRINK) * settle;

    for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
      applyDistanceConstraints(this.positions, this.structural, restScale);
      applyAnchors(this.positions, this.anchors);
      applyDistanceConstraints(this.positions, this.bending, restScale, settle);
      applyRepulsion(
        this.positions,
        this.particleCount,
        REPULSION_MIN_DIST,
        REPULSION_STIFFNESS * settle,
        this.excludedPairs
      );
    }
  }
}
