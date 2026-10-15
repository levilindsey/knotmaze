import { ParticleSystem, EMERGENT_MAX, EMERGENT_ROW } from "./particle_system";
import type { CrossingPass, PhysicsTuning } from "./particle_system";
import type { TangleGraph } from "../core/types";
import type { SnapshotView } from "./snapshot";

// THE MIRROR (K7 stage 2, docs/design/K7_worker.md, design 1): main's copy
// of the worker's ParticleSystem, built from main's own graph (the same
// graph: generation is deterministic, and `ready`'s fingerprint checks it).
// It never steps. applySnapshot overwrites its positions and each pass's
// ctrl and displayF IN PLACE, on the same pass objects (the renderer keys
// maps by them), and keeps the flags and emergent rows the getters below
// serve. So every reader keeps reading the object and fields it reads
// today; only writes become messages.
//
// Everything built once (chains, chainBreakAfter, crossings' topology,
// passNeighbors, fusedJunctions, anchors, initial) comes from the
// constructor, as in the worker. What the mirror does NOT have: prev, zPos,
// the contact state and the slide stats, which stay in the worker
// (readSlideStats and the phase probe read nothing here; stage 4's bridge,
// __knotPhysDump, fetches prev, zPos and the passes from the worker).
//
// Input: grabAt and dragTo record the grab as in the live class, so main
// reads grabbedParticle right after its own call; release clears it. The
// stepping writes (step, beginFrame, runSubstep, tug, reset) throw: they
// go to the worker, and a write here would be overwritten by the next
// snapshot.
export class MirrorSystem extends ParticleSystem {
  private mSim = 0;
  private mPending = 0;
  private mMaxMove = 0;
  private mSettle = false;
  private mStatic = false;
  private mRiders = 0;
  private mAsleep = false;
  private mSeq = -1;
  private mWallAt = 0;
  private mInputs = 0;
  private readonly mEmergent = new Float32Array(EMERGENT_MAX * EMERGENT_ROW);
  private mEmergentN = 0;

  constructor(graph: TangleGraph) {
    super(graph);
  }

  // Copies one snapshot in. Throws on a snapshot of another build's size.
  applySnapshot(s: SnapshotView): void {
    const n = this.particleCount;
    const c = this.crossings.length;
    if (s.n !== n || s.c !== c) {
      throw new Error(`snapshot of ${s.n}/${s.c}, mirror holds ${n}/${c}`);
    }
    this.positions.set(s.positions);
    const p = s.passes;
    for (let k = 0; k < c; k++) {
      const x = this.crossings[k];
      x.over.ctrl = p[k * 4];
      const of = p[k * 4 + 1];
      x.over.displayF = Number.isNaN(of) ? undefined : of;
      x.under.ctrl = p[k * 4 + 2];
      const uf = p[k * 4 + 3];
      x.under.displayF = Number.isNaN(uf) ? undefined : uf;
    }
    const rows = s.emergentCount * EMERGENT_ROW;
    this.mEmergent.set(s.emergent.subarray(0, rows));
    this.mEmergentN = s.emergentCount;
    this.mSim = s.simTime;
    this.mPending = s.pending;
    this.mMaxMove = s.maxMove;
    this.mSettle = s.settleComplete;
    this.mStatic = s.contactsStatic;
    this.mRiders = s.ridersPending;
    this.mAsleep = s.asleep;
    this.mSeq = s.seq;
    this.mWallAt = s.wallAt;
    this.mInputs = s.inputs;
  }

  // The applied snapshot's sequence number (-1: none yet) and write time.
  get snapshotSeq(): number {
    return this.mSeq;
  }
  get snapshotWallAt(): number {
    return this.mWallAt;
  }
  // The worker's input count when it wrote the applied snapshot (H.inputs).
  get snapshotInputs(): number {
    return this.mInputs;
  }
  // The worker's sleep gate had tripped when the snapshot was written.
  get workerAsleep(): boolean {
    return this.mAsleep;
  }

  override get simTime(): number {
    return this.mSim;
  }
  override get pendingTime(): number {
    return this.mPending;
  }
  override get maxMove(): number {
    return this.mMaxMove;
  }
  override get settleComplete(): boolean {
    return this.mSettle;
  }
  override get contactsStatic(): boolean {
    return this.mStatic;
  }
  override get ridersPending(): number {
    return this.mRiders;
  }

  override get emergentCrossings(): Array<{ over: CrossingPass; under: CrossingPass }> {
    const out: Array<{ over: CrossingPass; under: CrossingPass }> = [];
    const d = this.mEmergent;
    for (let k = 0; k < this.mEmergentN; k++) {
      const o = k * EMERGENT_ROW;
      out.push(this.emergentPair(d[o], d[o + 1], d[o + 2], d[o + 3], d[o + 4] !== 0));
    }
    return out;
  }

  // The live class reads prev for the release speed; the mirror has none,
  // and main discards the return (design 1's table).
  override release(): { particle: number; chain: number; speed: number } | null {
    const r = super.release();
    return r && { particle: r.particle, chain: r.chain, speed: 0 };
  }

  // The live class's signatures, so a call compiles wherever it did and
  // fails loudly at run time.
  override step(_dt: number, _tuning?: PhysicsTuning): void {
    throw new Error("MirrorSystem.step: the physics steps in the worker");
  }
  override beginFrame(_dt: number): number {
    throw new Error("MirrorSystem.beginFrame: the physics steps in the worker");
  }
  override runSubstep(_tuning?: PhysicsTuning): void {
    throw new Error("MirrorSystem.runSubstep: the physics steps in the worker");
  }
  override tug(
    _chain: number,
    _c0: number,
    _c1: number,
    _cTap: number,
    _side: number,
    _amp: number
  ): number {
    throw new Error("MirrorSystem.tug: post tug to the worker");
  }
  override reset(): void {
    throw new Error("MirrorSystem.reset: post reset to the worker");
  }
}

// K7 stage 4 (design 8): the probes' freeze patch (`__knotPS().step =
// function(){}`) and step-timing wrappers assign to `step`. On the mirror
// that would freeze nothing, silently, so the assignment throws and says
// what to use instead. (An accessor, which a class body cannot declare
// over the base class's method.)
const mirrorStep = MirrorSystem.prototype.step;
Object.defineProperty(MirrorSystem.prototype, "step", {
  configurable: true,
  get() {
    return mirrorStep;
  },
  set() {
    throw new Error(
      "KnotMaze: physics runs in a Web Worker (the default), so ps.step cannot be " +
        "patched: freeze with __knotPhysFreeze(true) (a Promise), or load the " +
        "page with &phw=0 for the in-thread system."
    );
  },
});
