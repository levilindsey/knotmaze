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
import type { DistanceConstraint, SegmentTopology } from "./forces";
import {
  applyDistanceConstraints,
  applyRepulsion,
  applySegmentCollision,
} from "./forces";
import { SeededRNG } from "../util/random";
import { createNoise3D } from "simplex-noise";

export interface CrossingPass {
  chain: number; // Chain (strand) index.
  ctrl: number; // FRACTIONAL control position along the chain; slides live.
  // Set by slideCrossing each kinetic substep: the slide target was the
  // TRUE local polyline intersection (vs the nearest-point fallback).
  // Diagnostic bookkeeping (a fallback means the threads have locally
  // separated at the crossing).
  intersected?: boolean;
  // The other pass of the same crossing. When the partner is also this
  // pass's chain-order neighbor, the crossing is a self-crossing kink and
  // the ordering clamp holds the larger KINK_MIN_SEPARATION so the kink's
  // loop keeps enough material to render as an eyelet.
  partner?: CrossingPass;
  // |slide target - achieved ctrl| after the ordering clamps, updated
  // each kinetic substep. Nonzero means the clamp (or rate cap) is
  // holding this binding away from the true intersection; the coupling
  // scales down with it (see the coupling block).
  clampLag?: number;
  // RENDER-ONLY ctrl of the true local intersection (raw slide target,
  // before easing and ordering clamps; undefined while the threads are
  // locally separated). The renderer draws the crossing HERE: during a
  // tug the clamps can pin the physics binding away from where the
  // threads actually cross, and erase/fill patches drawn at the binding
  // land beside the real overlap - mangled, torn-looking crossings
  // mid-gesture. Physics never reads this.
  displayF?: number;
}

export interface CrossingInfo {
  over: CrossingPass;
  under: CrossingPass;
  // Initial sign of cross(overTangent, underTangent): the crossing's
  // orientation. The transversality torque steers toward this sign's
  // perpendicular, which both keeps crossings X-shaped (no tangential
  // gluing) and prevents orientation flips (fold-inversions).
  sign: number;
}

// Live physics tuning, applied per substep (no rebuild needed).
export interface PhysicsTuning {
  temperature: number; // [0, 1] Simplex agitation.
  slack: number; // [0, 1] rest-state looseness.
  drag: number; // [0, 1] 0 = ringy waves, 1 = heavily damped.
  repulsion: number; // Multiplier on the repulsion distance.
  bend: number; // Multiplier on bending stiffness.
  smooth: number; // [0, 1] Laplacian fairing: evens curvature along threads.
  stiffness: number; // Multiplier on the structural (adjacency) springs.
  gridAlign: boolean; // Soft-anchor every particle to its lattice position.
  threadWidth: number; // Render width; the hard collision floor honors it.
}

export const DEFAULT_TUNING: PhysicsTuning = {
  temperature: 0,
  slack: 0.55,
  drag: 0.5,
  repulsion: 1,
  bend: 1,
  smooth: 0.25,
  stiffness: 1,
  gridAlign: false,
  threadWidth: 0.42,
};

// Collision floor margin: centerlines may not come closer than
// threadWidth * this outside crossing lenses (surfaces just kiss at
// 1.0). This is a VISUAL floor, not just a physical one: at 1.05 the
// edge clearance was 0.02 - sub-pixel - so threads squeezed to the
// floor (tight twist eyes under bending pressure) rendered as touching/
// merged and were reported as "sinking into each other". 1.16 keeps a
// visible sliver of background (~0.07 at default width) between any two
// passing threads.
const COLLISION_MARGIN = 1.16;
const COLLISION_STIFFNESS = 0.5;

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
// Verlet velocity retention maps from the drag tuning: drag 0 keeps 99.5%
// per substep (waves ring), drag 1 keeps 80% (heavily damped).
const DAMPING_MIN_DRAG = 0.995;
const DAMPING_MAX_DRAG = 0.8;
const GRID_ALIGN_STIFFNESS = 0.08;

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
// Bindings track the geometric contact essentially at motion speed: wide
// projection window, strong easing, generous rate cap. The ordering clamp
// below (MIN_PASS_SEPARATION) remains the one deliberate restriction - it
// stops a loop-end twist's two crossings from sliding through each other
// and untwisting.
const SLIDE_WINDOW = 3; // Segments each side searched by the projection.
// Slide chase runs in two regimes: fast while the user is dragging (a
// grabbed thread can sweep an intersection along the threads far faster
// than material moves through space, and a lagging chase makes the
// coupling drag the other thread bodily), gentle at rest (fast chase
// amplifies contact chatter between closely-spaced twist crossings).
// Grabbed chase is EXACT (ease 1): any per-substep chase lag becomes a
// parasitic pull on the other thread - the coupling pulls the lagging
// binding's thread toward the leading one every substep, which integrates
// into bodily drag during sweeps and grabs at intersections.
const MAX_SLIDE_GRABBED = 0.6;
const SLIDE_EASE_GRABBED = 1.0;
const MAX_SLIDE_REST = 0.12;
const SLIDE_EASE_REST = 0.5;
// Chase deadband: numerical epsilon ONLY. A perceptible deadband is a
// friction trap: a weak tug moves material ~0.006 ctrl/substep - below
// any deadband of useful size - so the binding never slides, the
// exemption lens stays glued to the material, collision welds the two
// threads, and they translate together, which keeps the re-projection
// delta sub-threshold forever (measured: 99% of slide calls swallowed,
// binding slid 0.12 ctrl while the other thread was dragged 1.5 units).
// Rest-chatter suppression - the deadband's original job - is now
// handled by static friction freezing the crossing machinery entirely
// (CONTACT_STICK_EPS below).
const SLIDE_DEADBAND = 1e-4;
// Minimum binding separation along a chain. This is set by the DEPTH
// FIELD'S RESOLUTION, not by inversion guarding: the field lives on
// particles (resolution 1 ctrl), so passes closer than ~2 ctrl cannot be
// represented - their opposite-sign tents overlap and cancel, the
// exemption fails at segments the diagram requires to intersect, and the
// resulting coupling-vs-collision fight can never resolve (the post-play
// endless jiggle: an over-tightened interleaved twist pinned at the old
// 0.9 floor rang forever at ~5e-2). With the floor above DEPTH_WINDOW,
// neighbor tents never cancel at a crossing, and the window is wide
// enough that a clamp-pinned binding's intersection (lag <= ~1.3) stays
// covered. The ceiling is the corridor weave pitch: checkerboard
// corridors place passes exactly 2.0 apart, and a floor at 2.0 left zero
// slack - bindings could only slide as convoys, which re-created the
// pinned-intersection drag feel (grab-at-X crossing motion 0.59 -> 1.29
// measured). 1.6 restores 0.4 of independent play per crossing. The
// historical warning about large values ("forced bindings away from true
// intersections, coupling contorted threads") predates the depth model:
// the wide tents cover exactly that displacement, and the coupling
// additionally YIELDS under clamp lag instead of contorting.
const MIN_PASS_SEPARATION = 1.6;
// Between the two passes of a SELF-crossing (a kink: the thread crossing
// itself), the material between the passes IS the kink's visible eyelet.
// The generic 0.9 floor let kink loops starve to ~0.25 arc of material -
// unrenderable (the erase cuts ~1 unit of thread with nothing to repaint:
// the reported giant gaps at loop-end non-twists). ~2.6 ctrl of loop
// material renders as a legible eyelet at the default thread width.
const KINK_MIN_SEPARATION = 2.6;
// Crossing coverage for the anti-riding 2D floor (see PassCover in
// forces.ts): particles within RIDE_COVER_FULL ctrl of a pass are fully
// inside that crossing's rendered neighborhood (the erase gap spans
// >= 1.35 of thread), fading to uncovered by RIDE_COVER_REACH. The fade
// must reach past the sharpest arm curvature a fat thread produces
// beside its crossing (measured pump sites sat 1-2 ctrl off the pass).
const RIDE_COVER_FULL = 1.0;
const RIDE_COVER_REACH = 2.5;
const COUPLING_STIFFNESS = 0.7;
// Clamp lag (ctrl) at which the coupling has yielded to half strength.
const COUPLING_YIELD_LAG = 0.25;
// Static/kinetic contact friction. KINETIC (frictionless coupling -
// material slides through crossings) while the user drags, temperature
// agitates, or the knot is in motion; STATIC (full-vector coupling, the
// crossing grips its material points) once per-substep motion falls
// below STICK. Rationale: at rest the constraint set is a standing
// tug-of-war (bending/structural/collision each correct ~8e-2 per
// substep and cancel); friction pins its free tangential mode so the
// cancellation repeats identically and the knot can sleep, while a
// permanently frictionless contact lets the standoff wander forever
// (~3e-2 peaks, measured) - and no damping can quiet a constraint
// conflict. Hysteresis: re-release only on strong motion (UNSTICK), so
// the rest wander cannot unlock itself. A static weld is invisible at
// rest; kinetic sliding is active whenever the user can see motion.
// Engage must be SUB-VISIBLE: at 2.5e-2/substep the knot is still
// clearly flowing, and welding then reads as intersections snapping
// rigid to material points mid-motion. 1e-2 matches the historical rest
// oscillation floor. (Per-substep displacement conflates drift with
// oscillation; if freezing still reads wrong, the next refinement is
// net-displacement-over-a-window, which separates the two.)
const CONTACT_STICK_EPS = 1e-2; // Per-substep displacement, engage.
const CONTACT_UNSTICK_EPS = 2.5e-2; // Per-substep displacement, release.
// GRADUATED contact friction, the dissipation channel between fully
// kinetic and the deep-freeze above. Per crossing, from a smoothed
// contact speed: below LO the coupling keeps its full tangential
// component (weld); above HI it is fully projected off (frictionless);
// blended between. Rationale: the depth model removed the old exemption
// lens's parasitic tangential weld - which was ALSO the only dissipation
// for the PBD standoff (bending/structural/collision cancel ~1e-1 each
// at rest). Without any friction the standoff wanders at ~4e-2 forever,
// above the binary stick gate, and the knot never sleeps after play.
// Graduated + LOCAL: an active region (wave crest, agitation) stays
// slippery while quiet regions grip; while GRABBED the weld is released
// everywhere, so gestures never feel it (a weak tug moves material
// ~3e-3/substep - below LO - and would otherwise weld mid-gesture).
const CONTACT_WELD_HI = 3e-2;
const CONTACT_WELD_LO = 5e-3;
const CONTACT_SPEED_EMA = 0.15; // Per-substep blend into the average.
// Contacts within RADIUS of the grabbed particle are released (a weak
// tug moves material ~3e-3/substep - below WELD_LO - and would
// otherwise weld mid-gesture); the release tapers out by
// RADIUS + TAPER. Beyond that the speed sensing decides, keeping the
// response to a drag LOCAL. The release EASES in time (GATE_EASE per
// substep): welded crossings hold pent-up slide/torque corrections, and
// an instant release dumped them all at once - nearby crossings visibly
// twitched "in unrelated ways" at the start of every drag. Easing
// bleeds the stored stress out over ~100ms instead.
const GRAB_FREE_RADIUS = 1.2;
const GRAB_FREE_TAPER = 1.8;
const GRAB_GATE_EASE = 0.05;
// Depth field: the quasi-3D crossing model. Each pass tents its thread's
// depth to +/-amp over DEPTH_WINDOW ctrl around the binding; collision and
// repulsion treat threads as 3D capsules (required 2D separation
// sqrt(margin^2 - dz^2)). Contributions SUM, so a twist eye's midpoint
// (opposite-sign tents from its two crossings) returns to depth 0 and
// recovers the full width floor - eyes stay open with no tuned taper.
// The WINDOW must be NARROWER than MIN_PASS_SEPARATION (neighbor tents
// pinned at the ordering clamp must not cancel at the crossing - that
// cancellation was the post-play endless-jiggle pump) yet WIDE enough to
// keep a clamp-pinned binding's true intersection covered (lag reaches
// ~1.3 ctrl on over-tightened twists). 1.4 sits between the 1.6 clamp
// floor and the ~1.3 lag reach; see MIN_PASS_SEPARATION for the triangle
// of constraints.
// AMP_FACTOR is sized so the worst-case tent sampling (binding at ctrl
// x.5: nearest particles carry weight 1 - 0.5/W = 0.64 each) still fully
// exempts the crossing point: dz = 2 * 0.64 * amp >= margin.
const DEPTH_WINDOW = 1.4;
const DEPTH_AMP_FACTOR = 1.0;
// Per-substep ease of the real z toward its diagram target. Strong
// enough to enforce over/under ordering within a few substeps, soft
// enough that the (last-run, full-stiffness) collision projection wins
// wherever the layout genuinely overlaps.
const Z_EASE = 0.2;
// Laplacian fairing stiffness at smooth = 1.
const FAIRING_MAX = 0.3;
// Transversality torque: fraction of the angular error (toward the signed
// perpendicular) corrected per substep, and its per-substep clamp. The
// torque must rotate a WINDOW of particles around the binding, not just
// the binding segment: a single-segment rotation gets absorbed by bending
// and fairing as a local S-kink while the thread's course through the
// crossing stays tangential.
const TRANSVERSALITY_GAIN = 0.15;
const TRANSVERSALITY_MAX_STEP = 0.08;
const TRANSVERSALITY_WINDOW = 2; // Particles each side beyond the segment.
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
  // TRUE-3D depth: zPos is a real simulated per-particle coordinate
  // (collision/repulsion push it); zTargets are the soft diagram-derived
  // targets it eases toward (over passes +amp, under passes -amp, tents
  // along the thread, contributions summing).
  private zPos: Float32Array;
  private zTargets: Float32Array;
  private contacts: Float32Array;
  // Per-particle registered-crossing membership for the anti-riding
  // floor's crossing coverage (see PassCover in forces.ts). Rebuilt each
  // substep from pass ctrls - no incremental state, nothing to go stale.
  private passCoverSlot: Int32Array;
  private passCoverCov: Float32Array;
  private topology!: SegmentTopology;
  private emergentCollector = { data: new Float32Array(256 * 4), n: 0 };
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
    this.zPos = new Float32Array(this.particleCount);
    this.zTargets = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      this.homeX += this.initial[i * 2];
      this.homeY += this.initial[i * 2 + 1];
    }
    this.homeX /= this.particleCount;
    this.homeY /= this.particleCount;

    this.buildConstraints();
    this.crossings = this.assignCrossings(occurrences);
    this.buildPassOrder();
    this.contacts = new Float32Array(this.crossings.length * 2);
    this.prevContacts = new Float32Array(this.crossings.length * 2);
    this.prevBindings = new Float32Array(this.crossings.length * 4);
    // Seed high so contacts start kinetic; the EMA settles within ~10
    // substeps.
    this.contactSpeedEma = new Float32Array(this.crossings.length).fill(1);
    this.contactSlipEma = new Float32Array(this.crossings.length).fill(1);
    this.grabGate = new Float32Array(this.crossings.length).fill(1);
    this.passCoverSlot = new Int32Array(this.particleCount * 4);
    this.passCoverCov = new Float32Array(this.particleCount * 4);

    this.particleChain = new Int32Array(this.particleCount).fill(-1);
    this.chains.forEach((chain, chainIdx) => {
      for (const p of chain) {
        if (this.particleChain[p] < 0) this.particleChain[p] = chainIdx;
      }
    });

    // Segment topology for capsule collision: every particle starts the
    // segment to its chain successor.
    const next = new Int32Array(this.particleCount);
    const ctrlOf = new Int32Array(this.particleCount);
    const chainLen = new Int32Array(this.particleCount);
    this.chains.forEach((chain) => {
      for (let i = 0; i < chain.length; i++) {
        next[chain[i]] = chain[(i + 1) % chain.length];
        ctrlOf[chain[i]] = i;
        chainLen[chain[i]] = chain.length;
      }
    });
    this.topology = {
      next,
      chainOf: this.particleChain,
      ctrlOf,
      chainLen,
    };

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

        // Exclude nearby same-chain particles from repulsion: within ~6
        // steps the geodesic span along the thread is shorter than the
        // maximum repulsion distance, and repelling such pairs makes the
        // chain accordion into permanent buckling waves at high repulsion.
        for (let span = 1; span <= 6; span++) {
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
      const over = overFirst ? list[0].pass : list[1].pass;
      const under = overFirst ? list[1].pass : list[0].pass;

      const tangent = (pass: CrossingPass): [number, number] => {
        const chain = this.chains[pass.chain];
        const a = chain[pass.ctrl];
        const b = chain[(pass.ctrl + 1) % chain.length];
        return [
          this.initial[b * 2] - this.initial[a * 2],
          this.initial[b * 2 + 1] - this.initial[a * 2 + 1],
        ];
      };
      const [ox, oy] = tangent(over);
      const [ux, uy] = tangent(under);
      over.partner = under;
      under.partner = over;
      crossings.push({
        over,
        under,
        sign: Math.sign(ox * uy - oy * ux) || 1,
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

  // World position of a fractional control position along a chain
  // (optionally read from another position array, e.g. prev).
  pointOnChain(
    chainIndex: number,
    f: number,
    out: Float32Array,
    offset: number,
    source: Float32Array = this.positions
  ): void {
    const chain = this.chains[chainIndex];
    const len = chain.length;
    const i = Math.floor(f);
    const t = f - i;
    const a = chain[((i % len) + len) % len];
    const b = chain[(((i + 1) % len) + len) % len];
    out[offset] = source[a * 2] * (1 - t) + source[b * 2] * t;
    out[offset + 1] = source[a * 2 + 1] * (1 - t) + source[b * 2 + 1] * t;
  }

  bindingPoint(pass: CrossingPass, out: Float32Array, offset: number): void {
    this.pointOnChain(pass.chain, pass.ctrl, out, offset);
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
  private tangentScratch = new Float32Array(4);
  private slideScratch = new Float32Array(4);
  private stickyContacts = false;
  // TEMP A/B flag (probe_afterplay2): taper slide/transversality mobility
  // at chaotic contact speeds during free decay.
  abHighSpeedTaper = false;
  // TEMP A/B flag (probe_afterplay3): weld from relative SLIP at the
  // contact (|d(over binding) - d(under binding)| per substep) instead of
  // absolute contact motion, so co-moving crossings riding a wave weld.
  abSlipWeld = false;
  // TEMP A/B injector-fingerprint multipliers (probe_afterplay4).
  abCoupling = 1;
  abSlide = 1;
  abTrans = 1;
  abExtraDrag = 0;
  // Per-crossing smoothed contact speed (units/substep) and the previous
  // contact points, for GRADUATED contact friction (see weldFactor).
  private contactSpeedEma: Float32Array = new Float32Array(0);
  private contactSlipEma: Float32Array = new Float32Array(0);
  private prevContacts: Float32Array = new Float32Array(0);
  private prevBindings: Float32Array = new Float32Array(0);
  // Per-crossing eased grab-release gate: 1 = weld allowed, 0 = released.
  private grabGate: Float32Array = new Float32Array(0);

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
    this.stickyContacts = false;
    this.contactSpeedEma.fill(1);
    this.contactSlipEma.fill(1);
    this.grabGate.fill(1);
    this.prevContacts.fill(0);
    this.prevBindings.fill(0);
    this.zPos.fill(0);
    for (const [pass, ctrl] of this.initialCtrl) {
      pass.ctrl = ctrl;
      pass.displayF = undefined;
    }
  }

  get grabbedParticle(): number {
    return this.grabbed;
  }

  // True while contacts are in the STATIC (welded/frozen) regime.
  get contactsStatic(): boolean {
    return this.stickyContacts;
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

  // Thread pairs that tunneled through each other during motion: real
  // visual crossings absent from the graph. Over/under is assigned
  // deterministically (coarse ctrl compare, so it doesn't flap frame to
  // frame as bindings drift).
  get emergentCrossings(): Array<{ over: CrossingPass; under: CrossingPass }> {
    const out: Array<{ over: CrossingPass; under: CrossingPass }> = [];
    const { data, n } = this.emergentCollector;
    for (let k = 0; k < n; k++) {
      const i = data[k * 4];
      const u = data[k * 4 + 1];
      const j = data[k * 4 + 2];
      const v = data[k * 4 + 3];
      const a: CrossingPass = {
        chain: this.topology.chainOf[i],
        ctrl: this.topology.ctrlOf[i] + u,
      };
      const b: CrossingPass = {
        chain: this.topology.chainOf[j],
        ctrl: this.topology.ctrlOf[j] + v,
      };
      // Over/under from REAL z: with the simulated third coordinate, the
      // thread that rides higher at the overlap genuinely is the over
      // thread (collision separated them in z).
      const za = this.zPos[i] + (this.zPos[this.topology.next[i]] - this.zPos[i]) * u;
      const zb = this.zPos[j] + (this.zPos[this.topology.next[j]] - this.zPos[j]) * v;
      out.push(za >= zb ? { over: a, under: b } : { over: b, under: a });
    }
    return out;
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

  step(dt: number, tuning: PhysicsTuning = DEFAULT_TUNING): void {
    this.accumulator += Math.min(dt, MAX_FRAME_DT);
    let substeps = Math.floor(this.accumulator / SUBSTEP);
    substeps = Math.min(substeps, MAX_SUBSTEPS_PER_FRAME);
    this.accumulator = Math.max(0, this.accumulator - substeps * SUBSTEP);

    if (substeps > 0) this.frameMaxMoveSq = 0;
    for (let s = 0; s < substeps; s++) {
      this.substep(tuning);
    }
  }

  // Re-project a crossing's bindings onto their local chain geometry so
  // the crossing can slide along the threads toward wherever the threads
  // actually intersect. The target is the TRUE INTERSECTION of the two
  // local polylines when one exists: nearest-point projection onto a
  // polyline parks at vertices (a corner captures the projection for a
  // whole range of source points), which read as bindings snapping to
  // particles. Intersections move continuously through vertices.
  //
  // The search is JOINT - one candidate chosen for the crossing by
  // minimal combined cyclic ctrl distance from BOTH passes. Per-pass
  // nearest-candidate selection could lock the two passes onto DIFFERENT
  // intersections of the same two threads (a twist eye keeps two in the
  // window), and once the coupling goes silent at intersecting crossings
  // nothing reconciles the split (measured: sep 0.60 mid-drag).
  //
  // Projection of the other thread's bound point remains the fallback for
  // the moments when the threads have locally separated.
  private slideCrossing(crossing: CrossingInfo, mobility = 1): void {
    const over = crossing.over;
    const under = crossing.under;
    const chain = this.chains[over.chain];
    const len = chain.length;
    const i0 = Math.floor(over.ctrl);
    const oChain = this.chains[under.chain];
    const oLen = oChain.length;
    const j0 = Math.floor(under.ctrl);

    let bestFOver = Number.NaN;
    let bestFUnder = Number.NaN;
    let bestCost = Infinity;
    for (let s = i0 - SLIDE_WINDOW; s <= i0 + SLIDE_WINDOW; s++) {
      const a = chain[((s % len) + len) % len];
      const b = chain[(((s + 1) % len) + len) % len];
      const ax = this.positions[a * 2];
      const ay = this.positions[a * 2 + 1];
      const e1x = this.positions[b * 2] - ax;
      const e1y = this.positions[b * 2 + 1] - ay;
      for (let r = j0 - SLIDE_WINDOW; r <= j0 + SLIDE_WINDOW; r++) {
        const c = oChain[((r % oLen) + oLen) % oLen];
        const d = oChain[(((r + 1) % oLen) + oLen) % oLen];
        const cx = this.positions[c * 2];
        const cy = this.positions[c * 2 + 1];
        const e2x = this.positions[d * 2] - cx;
        const e2y = this.positions[d * 2 + 1] - cy;
        const denom = e1x * e2y - e1y * e2x;
        if (Math.abs(denom) < 1e-12) continue;
        const rx = cx - ax;
        const ry = cy - ay;
        const u = (rx * e2y - ry * e2x) / denom;
        if (u < 0 || u > 1) continue;
        const v = (rx * e1y - ry * e1x) / denom;
        if (v < 0 || v > 1) continue;
        const rawO = Math.abs(s + u - over.ctrl) % len;
        const cycO = Math.min(rawO, len - rawO);
        const rawU = Math.abs(r + v - under.ctrl) % oLen;
        const cycU = Math.min(rawU, oLen - rawU);
        const cost = cycO + cycU;
        if (cost < bestCost) {
          bestCost = cost;
          bestFOver = s + u;
          bestFUnder = r + v;
        }
      }
    }

    const found = !Number.isNaN(bestFOver);
    over.intersected = found;
    under.intersected = found;
    if (found) {
      over.displayF = ((bestFOver % len) + len) % len;
      under.displayF = ((bestFUnder % oLen) + oLen) % oLen;
      this.easePassToward(over, bestFOver, mobility);
      this.easePassToward(under, bestFUnder, mobility);
      return;
    }
    over.displayF = undefined;
    under.displayF = undefined;
    // Fallback: each binding chases the projection of the other's bound
    // point. Compute both q points BEFORE easing either pass.
    this.bindingPoint(under, this.slideScratch, 0);
    this.bindingPoint(over, this.slideScratch, 2);
    this.easePassToward(
      over,
      this.projectOntoChain(over, this.slideScratch[0], this.slideScratch[1]),
      mobility
    );
    this.easePassToward(
      under,
      this.projectOntoChain(under, this.slideScratch[2], this.slideScratch[3]),
      mobility
    );
  }

  private projectOntoChain(
    self: CrossingPass,
    qx: number,
    qy: number
  ): number {
    const chain = this.chains[self.chain];
    const len = chain.length;
    const i0 = Math.floor(self.ctrl);
    let bestDistSq = Infinity;
    let bestF = self.ctrl;
    for (let s = i0 - SLIDE_WINDOW; s <= i0 + SLIDE_WINDOW; s++) {
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
          ? Math.max(
              0,
              Math.min(1, ((qx - ax) * ex + (qy - ay) * ey) / lenSq)
            )
          : 0;
      const px = ax + ex * t;
      const py = ay + ey * t;
      const dSq = (px - qx) * (px - qx) + (py - qy) * (py - qy);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestF = s + t;
      }
    }
    return bestF;
  }

  // Accumulate one pass's depth tent: +/-amp at the binding, linear to
  // zero over DEPTH_WINDOW ctrl each side.
  private addDepthTent(pass: CrossingPass, amp: number): void {
    const chain = this.chains[pass.chain];
    const len = chain.length;
    const c = pass.ctrl;
    for (
      let k = Math.ceil(c - DEPTH_WINDOW);
      k <= Math.floor(c + DEPTH_WINDOW);
      k++
    ) {
      const w = 1 - Math.abs(k - c) / DEPTH_WINDOW;
      this.zTargets[chain[((k % len) + len) % len]] += amp * w;
    }
  }

  // Ease a pass toward its slide target with a rate limit, then keep
  // order against neighboring passes on the same chain. `mobility` scales
  // the chase (graduated friction: a quieting contact's slide fades out).
  private easePassToward(
    self: CrossingPass,
    bestF: number,
    mobility: number
  ): void {
    const len = this.chains[self.chain].length;
    const maxSlide =
      (this.grabbed >= 0 ? MAX_SLIDE_GRABBED : MAX_SLIDE_REST) * mobility;
    const ease =
      (this.grabbed >= 0 ? SLIDE_EASE_GRABBED : SLIDE_EASE_REST) * mobility;
    const delta = bestF - self.ctrl;
    this.slideStats.calls++;
    this.slideStats.requested += Math.abs(delta);
    if (Math.abs(delta) < SLIDE_DEADBAND) {
      this.slideStats.deadbandSkips++;
      self.clampLag = 0;
      return;
    }
    let f =
      self.ctrl + Math.max(-maxSlide, Math.min(maxSlide, delta * ease));
    const unclamped = f;
    const prev = this.passPrev.get(self);
    const next = this.passNext.get(self);
    if (prev && next && prev !== self) {
      const cyc = (d: number): number => ((d % len) + len) % len;
      const sepPrev =
        prev === self.partner ? KINK_MIN_SEPARATION : MIN_PASS_SEPARATION;
      const sepNext =
        next === self.partner ? KINK_MIN_SEPARATION : MIN_PASS_SEPARATION;
      if (cyc(f - prev.ctrl) < sepPrev) {
        f = prev.ctrl + sepPrev;
      }
      if (cyc(next.ctrl - f) < sepNext) {
        f = next.ctrl - sepNext;
      }
    }
    if (f !== unclamped) this.slideStats.clampHits++;
    {
      const raw = Math.abs(f - self.ctrl) % len;
      this.slideStats.applied += Math.min(raw, len - raw);
    }
    {
      const raw = Math.abs(bestF - f) % len;
      self.clampLag = Math.min(raw, len - raw);
    }
    self.ctrl = ((f % len) + len) % len;
  }

  // Slide telemetry, accumulated between readSlideStats() calls: answers
  // "are bindings actually sliding, and what stops them - deadband, rate
  // cap, or the ordering clamp?"
  readonly slideStats = {
    calls: 0,
    requested: 0,
    applied: 0,
    deadbandSkips: 0,
    clampHits: 0,
  };

  readSlideStats(): typeof this.slideStats {
    const out = { ...this.slideStats };
    this.slideStats.calls = 0;
    this.slideStats.requested = 0;
    this.slideStats.applied = 0;
    this.slideStats.deadbandSkips = 0;
    this.slideStats.clampHits = 0;
    return out;
  }

  // Phase probe: when enabled, records the max single-particle
  // displacement produced by each solver phase (accumulated across
  // substeps until read). Costs nothing when disabled.
  private phaseProbe: Map<string, number> | null = null;
  private probeSnap: Float32Array | null = null;

  enablePhaseProbe(): void {
    this.phaseProbe = new Map();
    this.probeSnap = new Float32Array(this.positions.length);
    this.probeSnap.set(this.positions);
  }

  readPhaseProbe(): Map<string, number> {
    const out = this.phaseProbe ?? new Map<string, number>();
    if (this.phaseProbe) this.phaseProbe = new Map();
    return out;
  }

  private probe(label: string): void {
    if (!this.phaseProbe || !this.probeSnap) return;
    let m = 0;
    for (let i = 0; i < this.particleCount * 2; i++) {
      const d = Math.abs(this.positions[i] - this.probeSnap[i]);
      if (d > m) m = d;
    }
    this.phaseProbe.set(
      label,
      Math.max(this.phaseProbe.get(label) ?? 0, m)
    );
    this.probeSnap.set(this.positions);
  }

  private substep(tuning: PhysicsTuning): void {
    this.time += SUBSTEP;
    this.substepCount++;
    if (this.probeSnap) this.probeSnap.set(this.positions);

    // Temperature: Simplex-noise agitation, injected as velocity.
    if (tuning.temperature > 0) {
      const amp = tuning.temperature * TEMPERATURE_SCALE;
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
    const damping =
      DAMPING_MIN_DRAG + (DAMPING_MAX_DRAG - DAMPING_MIN_DRAG) * tuning.drag;
    let substepMoveSq = 0;
    for (let i = 0; i < this.particleCount * 2; i++) {
      const current = this.positions[i];
      const d = current - this.prev[i];
      if (d * d > substepMoveSq) substepMoveSq = d * d;
      this.positions[i] = current + d * damping;
      this.prev[i] = current;
    }
    if (substepMoveSq > this.frameMaxMoveSq) {
      this.frameMaxMoveSq = substepMoveSq;
    }

    // Static/kinetic friction switch (see CONTACT_STICK_EPS).
    if (this.grabbed >= 0 || tuning.temperature > 0) {
      this.stickyContacts = false;
    } else if (substepMoveSq < CONTACT_STICK_EPS * CONTACT_STICK_EPS) {
      this.stickyContacts = true;
    } else if (substepMoveSq > CONTACT_UNSTICK_EPS * CONTACT_UNSTICK_EPS) {
      this.stickyContacts = false;
    }

    // Settle ramp: 0 at load (lattice equilibrium) -> 1 when fully relaxed.
    const x = Math.min(this.time / SETTLE_DURATION, 1);
    const settle = x * x * (3 - 2 * x);

    const slack = tuning.slack;
    const shrink = SHRINK_TAUT + (SHRINK_LOOSE - SHRINK_TAUT) * slack;
    const restScale = 1 - (1 - shrink) * settle;
    const bendScale =
      settle * (BEND_TAUT + (BEND_LOOSE - BEND_TAUT) * slack) * tuning.bend;
    const collisionDist = tuning.threadWidth * COLLISION_MARGIN;
    // Aesthetic spacing can never drop below the hard floor: at low
    // repulsion x wide threads the raw formula fell below the thread
    // width (rep 0.4 x taut 0.62 = 0.25 < width 0.52), silently
    // disabling all soft spacing.
    const repulseDist = Math.max(
      collisionDist * 1.02,
      (REPULSE_DIST_TAUT + (REPULSE_DIST_LOOSE - REPULSE_DIST_TAUT) * slack) *
        tuning.repulsion
    );

    // Slide bindings toward the other thread's current point, record each
    // crossing's contact point, and rebuild the z-target field.
    const depthAmp = collisionDist * DEPTH_AMP_FACTOR;
    this.zTargets.fill(0);
    for (let c = 0; c < this.crossings.length; c++) {
      const crossing = this.crossings[c];
      this.bindingPoint(crossing.over, this.bindScratch, 0);
      this.bindingPoint(crossing.under, this.bindScratch, 2);
      this.contacts[c * 2] = (this.bindScratch[0] + this.bindScratch[2]) / 2;
      this.contacts[c * 2 + 1] =
        (this.bindScratch[1] + this.bindScratch[3]) / 2;
      // Smoothed contact speed for graduated friction (weldFactor).
      this.contactSpeedEma[c] =
        this.contactSpeedEma[c] * (1 - CONTACT_SPEED_EMA) +
        Math.hypot(
          this.contacts[c * 2] - this.prevContacts[c * 2],
          this.contacts[c * 2 + 1] - this.prevContacts[c * 2 + 1]
        ) *
          CONTACT_SPEED_EMA;
      this.prevContacts[c * 2] = this.contacts[c * 2];
      this.prevContacts[c * 2 + 1] = this.contacts[c * 2 + 1];
      // Smoothed relative SLIP at the contact: how differently the two
      // binding points moved this substep. A crossing riding a wave
      // co-moves (slip ~0) even when its absolute speed is large.
      this.contactSlipEma[c] =
        this.contactSlipEma[c] * (1 - CONTACT_SPEED_EMA) +
        Math.hypot(
          this.bindScratch[0] -
            this.prevBindings[c * 4] -
            (this.bindScratch[2] - this.prevBindings[c * 4 + 2]),
          this.bindScratch[1] -
            this.prevBindings[c * 4 + 1] -
            (this.bindScratch[3] - this.prevBindings[c * 4 + 3])
        ) *
          CONTACT_SPEED_EMA;
      this.prevBindings[c * 4] = this.bindScratch[0];
      this.prevBindings[c * 4 + 1] = this.bindScratch[1];
      this.prevBindings[c * 4 + 2] = this.bindScratch[2];
      this.prevBindings[c * 4 + 3] = this.bindScratch[3];
      // Eased grab-release gate (see GRAB_GATE_EASE).
      {
        let target = 1;
        if (this.grabbed >= 0) {
          const d = Math.hypot(
            this.contacts[c * 2] - this.positions[this.grabbed * 2],
            this.contacts[c * 2 + 1] - this.positions[this.grabbed * 2 + 1]
          );
          target = Math.max(
            0,
            Math.min(1, (d - GRAB_FREE_RADIUS) / GRAB_FREE_TAPER)
          );
        }
        this.grabGate[c] += (target - this.grabGate[c]) * GRAB_GATE_EASE;
      }
      // STATIC contacts freeze the crossing machinery entirely: no
      // sliding, no transversality torque. Both serve motion; at rest the
      // springs hold the shape, and a welded binding that keeps
      // micro-adjusting its ctrl is itself a motor (the weld turns every
      // re-projection nudge into thread motion). Graduated friction
      // applies the same logic per crossing BEFORE the global freeze: a
      // quieting contact's slide/torque fade with its weld, so the local
      // constraint standoff becomes substep-identical and the whole knot
      // can reach the global stick threshold (anchors that keep
      // micro-moving hold the standoff in slow wander forever).
      if (!this.stickyContacts) {
        const weld = this.weldFactor(c, tuning.temperature);
        let mobility = 1 - weld;
        // TEMP A/B (probe_afterplay2): high-speed machinery taper.
        if (
          this.abHighSpeedTaper &&
          this.grabbed < 0 &&
          tuning.temperature === 0
        ) {
          const ema = this.contactSpeedEma[c];
          mobility *= Math.max(0, Math.min(1, (1.2e-1 - ema) / (1.2e-1 - 3e-2)));
        }
        if (mobility > 0) {
          if (this.abSlide > 0) {
            this.slideCrossing(crossing, mobility * this.abSlide);
          }
          if (this.abTrans > 0) {
            this.applyTransversality(crossing, c, mobility * this.abTrans);
          }
        }
      }

      // z-target tents from the diagram (see DEPTH_WINDOW).
      this.addDepthTent(crossing.over, depthAmp);
      this.addDepthTent(crossing.under, -depthAmp);
    }
    // Ease the REAL z toward its diagram target (overdamped - z carries
    // no inertia, so it cannot ring; collision's z-pushes stack on top
    // and, running last, win where the layout genuinely overlaps).
    for (let i = 0; i < this.particleCount; i++) {
      const target = Math.max(
        -depthAmp,
        Math.min(depthAmp, this.zTargets[i])
      );
      this.zPos[i] += (target - this.zPos[i]) * Z_EASE;
    }
    this.updatePassCover();
    this.probe("slide+transversality");

    for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
      // The grabbed particle chases the pointer stiffly; springs carry the
      // tug outward through the knot.
      if (this.grabbed >= 0) {
        const g = this.grabbed;
        this.positions[g * 2] += (this.grabX - this.positions[g * 2]) * 0.6;
        this.positions[g * 2 + 1] +=
          (this.grabY - this.positions[g * 2 + 1]) * 0.6;
      }
      // Structural stiffness scales with the tuning param, clamped so the
      // PBD correction fraction stays below 1 (0.7 base x 1.35 max = 0.95).
      applyDistanceConstraints(
        this.positions,
        this.structural,
        restScale,
        Math.max(0.1, Math.min(1.35, tuning.stiffness))
      );
      this.probe("structural");
      applyDistanceConstraints(
        this.positions,
        this.bending,
        restScale,
        bendScale
      );
      this.probe("bending");

      // Repulsion runs at full strength from the first substep: while the
      // settle ramp shrinks rests, parallel threads get dragged toward the
      // same corridor line, and weak early repulsion lets them pass through
      // each other and lock into braided local minima.
      applyRepulsion(
        this.positions,
        this.zPos,
        this.particleCount,
        repulseDist,
        REPULSION_STIFFNESS,
        this.excludedPairs
      );
      this.probe("repulsion");
      // Hard 3D floor: no two threads within the margin in 3D, ever. The
      // collector gathers tunneled (properly intersecting) pairs so the
      // renderer can gap emergent crossings.
      if (iter === 0) this.emergentCollector.n = 0;
      applySegmentCollision(
        this.positions,
        this.zPos,
        this.particleCount,
        this.topology,
        collisionDist,
        tuning.threadWidth,
        COLLISION_STIFFNESS,
        this.contacts,
        { slot: this.passCoverSlot, cov: this.passCoverCov },
        iter === 0 ? this.emergentCollector : undefined
      );
      this.probe("collision");

      // Coincidence coupling LAST, so nothing re-separates the crossing
      // within the iteration: pull each crossing's two bound points
      // together, distributing corrections to the surrounding particles.
      //
      // The coupling stays CONTINUOUS (with the kinetic tangential
      // projection) even while grabbed. Silencing it at intersecting
      // crossings during a grab was tried and made things WORSE: without
      // the coupling's organizing pull, raw segment collision outside the
      // exemption lens couples the threads instead and welds them
      // tangentially (weak-tug material flow dropped from 2.17 to 1.14
      // ctrl and bodily drag of the other thread returned). Disabling it
      // outright (the retired cp=0 experiment) also welded crossings and
      // left stress-torn bound pairs (sep 0.83) whose erase gaps rendered
      // as naked holes. The coupling is the crossing's lubricant in every
      // measured gesture.
      //
      // But the coupling YIELDS where the ordering clamp holds a binding
      // away from the true intersection (clampLag): coincidence at the
      // binding is then geometrically unachievable - the threads already
      // intersect elsewhere - and insisting on it demands tangential
      // overlap, a fight against collision that cannot resolve and pumps
      // energy forever (the post-play endless jiggle: an over-tightened
      // twist's bindings pinned at MIN_PASS_SEPARATION, coupling and
      // collision each correcting ~1.5e-1/substep indefinitely). Yielding
      // lets the pair separate slightly instead; when the clamp releases,
      // lag returns to zero and full coupling resumes.
      for (let ci = 0; ci < this.crossings.length; ci++) {
        const crossing = this.crossings[ci];
        // Yield ONLY while the threads genuinely intersect: coincidence
        // at the binding is then redundant and insisting on it fights
        // collision. In fallback (threads locally separated) the coupling
        // is the boundary guard - the only force that can pull an
        // uncrossing pair back together - and must act at full strength
        // (yielding there abandoned crossings: bound pairs torn 5.4
        // apart, weave visibly broken).
        const lag =
          crossing.over.intersected === true &&
          crossing.under.intersected === true
            ? Math.max(
                crossing.over.clampLag ?? 0,
                crossing.under.clampLag ?? 0
              )
            : 0;
        // As the weld engages, the yield fades back out: the yield exists
        // for the KINETIC fight (coupling vs collision while material
        // moves), but a resting crossing should close its bound pair
        // fully - the wide depth tents cover the clamp-lagged
        // intersection, so the pull no longer fights collision - or the
        // freeze would fossilize the pair mid-separation and render as a
        // displaced gap.
        const weld = this.weldFactor(ci, tuning.temperature);
        const give =
          (1 / (1 + (lag / COUPLING_YIELD_LAG) ** 2) * (1 - weld) + weld) *
          this.abCoupling;
        this.bindingPoint(crossing.over, this.bindScratch, 0);
        this.bindingPoint(crossing.under, this.bindScratch, 2);
        const dx =
          (this.bindScratch[2] - this.bindScratch[0]) *
          0.5 *
          COUPLING_STIFFNESS *
          give;
        const dy =
          (this.bindScratch[3] - this.bindScratch[1]) *
          0.5 *
          COUPLING_STIFFNESS *
          give;
        this.applyBindingCorrection(crossing.over, dx, dy, weld);
        this.applyBindingCorrection(crossing.under, -dx, -dy, weld);
      }
      this.probe("coupling");
    }

    // Laplacian fairing: nudge every particle toward its chain neighbors'
    // midpoint, evening out curvature so threads read as smooth continuous
    // curves (the structural springs preserve length against shrinkage).
    if (tuning.smooth > 0) {
      const k = tuning.smooth * FAIRING_MAX * settle;
      for (const chain of this.chains) {
        const len = chain.length;
        for (let i = 0; i < len; i++) {
          const p = chain[i];
          const a = chain[(i - 1 + len) % len];
          const b = chain[(i + 1) % len];
          this.positions[p * 2] +=
            ((this.positions[a * 2] + this.positions[b * 2]) / 2 -
              this.positions[p * 2]) *
            k;
          this.positions[p * 2 + 1] +=
            ((this.positions[a * 2 + 1] + this.positions[b * 2 + 1]) / 2 -
              this.positions[p * 2 + 1]) *
            k;
        }
      }
    }

    // Optional grid alignment: softly anchor every particle back toward
    // its lattice position, restoring the structured look.
    if (tuning.gridAlign) {
      for (let i = 0; i < this.particleCount * 2; i++) {
        this.positions[i] +=
          (this.initial[i] - this.positions[i]) * GRID_ALIGN_STIFFNESS;
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
    this.probe("fairing+align+center");

    // FINAL AUTHORITY collision projection: the last position operation
    // of every substep, at full stiffness. In-loop collision is one
    // voice in a committee - at high bend/smooth or minimum repulsion,
    // the other constraints outvote its 0.5-stiffness correction and the
    // equilibrium (which the quiescence gate then freezes) can sit in
    // visible interpenetration. Projecting the floor once more AFTER
    // everything else guarantees the substep-END state - the only state
    // ever rendered or frozen - honors the width floor everywhere the
    // depth field doesn't exempt it. Internal tug-of-wars continue
    // between substeps but can no longer appear on screen. TWO sweeps:
    // one Gauss-Seidel pass leaves residual where a particle sits
    // between two violated pairs (each correction pushes into the
    // other; measured 0.45 vs the 0.60 floor after one sweep).
    for (let fs = 0; fs < 2; fs++) {
      applySegmentCollision(
        this.positions,
        this.zPos,
        this.particleCount,
        this.topology,
        collisionDist,
        tuning.threadWidth,
        1.0,
        this.contacts,
        { slot: this.passCoverSlot, cov: this.passCoverCov },
        undefined
      );
    }
    this.probe("final-collision");

    // TEMP A/B (probe_afterplay4): extra velocity damping diagnostic.
    if (this.abExtraDrag > 0) {
      for (let i = 0; i < this.particleCount * 2; i++) {
        this.prev[i] += (this.positions[i] - this.prev[i]) * this.abExtraDrag;
      }
    }
  }

  // Rebuild the per-particle registered-crossing membership table used by
  // the anti-riding 2D floor's crossing coverage. 4 slots per particle,
  // slot value = crossing * 2 + side (0 over / 1 under), with a coverage
  // weight fading from 1 (within RIDE_COVER_FULL ctrl of the pass) to 0
  // at RIDE_COVER_REACH. Deterministic crossing-index order, first-come
  // on overflow - and rebuilt from scratch every substep, so slides move
  // the coverage with the binding and nothing goes stale.
  private updatePassCover(): void {
    this.passCoverSlot.fill(-1);
    const span = Math.ceil(RIDE_COVER_REACH) + 1;
    for (let c = 0; c < this.crossings.length; c++) {
      const crossing = this.crossings[c];
      for (let side = 0; side < 2; side++) {
        const pass = side === 0 ? crossing.over : crossing.under;
        const chain = this.chains[pass.chain];
        const len = chain.length;
        const base = Math.floor(pass.ctrl);
        for (let k = base - span; k <= base + span; k++) {
          let d = Math.abs(k - pass.ctrl);
          d = Math.min(d, len - d);
          const cov = Math.min(
            1,
            (RIDE_COVER_REACH - d) / (RIDE_COVER_REACH - RIDE_COVER_FULL)
          );
          if (cov <= 0) continue;
          const s = chain[((k % len) + len) % len] * 4;
          const value = c * 2 + side;
          for (let u = 0; u < 4; u++) {
            if (this.passCoverSlot[s + u] === value) {
              if (cov > this.passCoverCov[s + u]) {
                this.passCoverCov[s + u] = cov;
              }
              break;
            }
            if (this.passCoverSlot[s + u] < 0) {
              this.passCoverSlot[s + u] = value;
              this.passCoverCov[s + u] = cov;
              break;
            }
          }
        }
      }
    }
  }

  // Steer the two threads at a crossing toward the signed perpendicular:
  // rotate each binding's segment about the contact point so tangents can
  // never align (threads gluing along a stretch) or flip orientation.
  private applyTransversality(
    crossing: CrossingInfo,
    index: number,
    mobility = 1
  ): void {
    const segment = (
      pass: CrossingPass
    ): [number, number, number, number] => {
      const chain = this.chains[pass.chain];
      const len = chain.length;
      const i = Math.floor(pass.ctrl);
      return [
        chain[((i % len) + len) % len],
        chain[(((i + 1) % len) + len) % len],
        0,
        0,
      ];
    };

    const [a0, a1] = segment(crossing.over);
    const [b0, b1] = segment(crossing.under);
    let tax = this.positions[a1 * 2] - this.positions[a0 * 2];
    let tay = this.positions[a1 * 2 + 1] - this.positions[a0 * 2 + 1];
    let tbx = this.positions[b1 * 2] - this.positions[b0 * 2];
    let tby = this.positions[b1 * 2 + 1] - this.positions[b0 * 2 + 1];
    const la = Math.hypot(tax, tay) || 1;
    const lb = Math.hypot(tbx, tby) || 1;
    tax /= la;
    tay /= la;
    tbx /= lb;
    tby /= lb;

    // Angle from over-tangent to under-tangent, steered toward sign * 90deg.
    const theta = Math.atan2(tax * tby - tay * tbx, tax * tbx + tay * tby);
    let error = crossing.sign * (Math.PI / 2) - theta;
    if (error > Math.PI) error -= 2 * Math.PI;
    if (error < -Math.PI) error += 2 * Math.PI;

    const delta =
      Math.max(
        -TRANSVERSALITY_MAX_STEP,
        Math.min(TRANSVERSALITY_MAX_STEP, error * TRANSVERSALITY_GAIN)
      ) * mobility;
    if (delta === 0) return;

    const cx = this.contacts[index * 2];
    const cy = this.contacts[index * 2 + 1];
    const rotate = (p: number, angle: number): void => {
      const dx = this.positions[p * 2] - cx;
      const dy = this.positions[p * 2 + 1] - cy;
      this.positions[p * 2] += -dy * angle;
      this.positions[p * 2 + 1] += dx * angle;
    };
    // Rotating the under side CCW increases theta; the over side CW does
    // the same, splitting the correction between the two threads. Apply
    // across the window (weights falling off outward) so the thread's
    // course rotates rather than kinking at one segment.
    const rotateWindow = (pass: CrossingPass, angle: number): void => {
      const chain = this.chains[pass.chain];
      const len = chain.length;
      const base = Math.floor(pass.ctrl);
      for (
        let k = base - TRANSVERSALITY_WINDOW;
        k <= base + 1 + TRANSVERSALITY_WINDOW;
        k++
      ) {
        const distOut =
          k < base ? base - k : k > base + 1 ? k - (base + 1) : 0;
        const weight = 1 / (1 + distOut);
        rotate(chain[((k % len) + len) % len], angle * weight);
      }
    };
    rotateWindow(crossing.under, delta / 2);
    rotateWindow(crossing.over, -delta / 2);
  }

  // Graduated contact friction for one crossing: 0 (frictionless) while
  // agitated or near the grab point, else blended from its smoothed
  // contact speed - 1 (full weld) below CONTACT_WELD_LO, 0 above
  // CONTACT_WELD_HI. The grab release is LOCAL: a global release
  // unfroze every contact in the knot at once, dumping the whole
  // fabric's stored standoff stress on the first touch (reported as
  // "the ENTIRE tangle jiggles" on a small one-sided drag). Distant
  // contacts stay welded until the tension wave actually arrives and
  // raises their contact speed.
  private weldFactor(ci: number, temperature: number): number {
    if (temperature > 0) return 0;
    const speed = this.abSlipWeld
      ? this.contactSlipEma[ci]
      : this.contactSpeedEma[ci];
    return (
      Math.max(
        0,
        Math.min(
          1,
          (CONTACT_WELD_HI - speed) / (CONTACT_WELD_HI - CONTACT_WELD_LO)
        )
      ) * this.grabGate[ci]
    );
  }

  private applyBindingCorrection(
    pass: CrossingPass,
    dx: number,
    dy: number,
    weld: number
  ): void {
    const chain = this.chains[pass.chain];
    const len = chain.length;
    const i = Math.floor(pass.ctrl);
    const t = pass.ctrl - i;
    const a = chain[((i % len) + len) % len];
    const b = chain[(((i + 1) % len) + len) % len];
    // KINETIC contacts are frictionless: drop the component ALONG this
    // thread, keeping only the sideways push, so material slides through
    // the crossing and the slide re-projection alone owns the tangential
    // dimension. (Full-vector coupling welds the crossing to two material
    // points - correct for STATIC contacts at rest, but it made dragged
    // threads carry each other bodily.) `weld` grades between the two
    // regimes: 0 = frictionless, 1 = full weld (graduated friction; see
    // weldFactor). The tangent is a central difference across the
    // binding, NOT the raw segment direction, which jumps at every vertex
    // and made each particle a detent the binding snapped to.
    if (!this.stickyContacts && weld < 1) {
      this.pointOnChain(pass.chain, pass.ctrl - 0.5, this.tangentScratch, 0);
      this.pointOnChain(pass.chain, pass.ctrl + 0.5, this.tangentScratch, 2);
      const ex = this.tangentScratch[2] - this.tangentScratch[0];
      const ey = this.tangentScratch[3] - this.tangentScratch[1];
      const eLenSq = ex * ex + ey * ey;
      if (eLenSq > 1e-12) {
        const along = ((dx * ex + dy * ey) / eLenSq) * (1 - weld);
        dx -= ex * along;
        dy -= ey * along;
      }
    }
    // Normalize by the lerp-weight energy so the bound POINT moves by
    // exactly (dx, dy) rather than a t-dependent fraction of it.
    const w = (1 - t) * (1 - t) + t * t;
    this.positions[a * 2] += (dx * (1 - t)) / w;
    this.positions[a * 2 + 1] += (dy * (1 - t)) / w;
    this.positions[b * 2] += (dx * t) / w;
    this.positions[b * 2 + 1] += (dy * t) / w;
  }


}
