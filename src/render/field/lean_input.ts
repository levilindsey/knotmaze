// K1369 s4: the lean gather's pure parts, moved here so the gf build worker
// (gf_worker.ts, the snapshot channel) runs the same code as main's gather
// (scene_export_hook.ts gatherSceneInputLean) without importing the
// renderer: the emergent pool's slotting (EMERGENT_POOL and isJointPair,
// moved from crossing_gaps.ts, which re-exports them), a chain's export
// from its samples, a crossing pass, and the input's assembly from what main
// gathers once (the skeleton) and what each frame's physics gives.
import type { SplineSamples } from "../../geometry/spline_generator";
import type { CrossingPass } from "../../physics/particle_system";
import type { ExportChain, ExportCrossing, ExportPass, SceneExportInput } from "./scene_export";

// Gap slots for emergent (tunneled) crossings discovered by the physics.
// Sized for taut knots: at slack ~0 dozens of real emergent crossings can
// coexist, and a starved pool renders some overlaps gap-less.
export const EMERGENT_POOL = 64;

// A FUSED JOINT IS NOT A CROSSING (K397 stage 3). A tucked tip's end
// particle is fused to its host's, so the tip's last segment and the
// host's next one share an endpoint, and the physics' emergent collector
// (a proper intersection, sin > 0.25, no junction exclusion) finds an
// "emergent crossing" right at the tuck. Its slot cut the under thread
// around the over one's footprint: stub over host left a dark round-ended
// ring inside the host, cut square at the host's edge, with host color on
// both sides (Levi's knuckle U, levi_0801); host over stub left a dark
// band across the stub's root past the cap cover's reach (stage 1's
// node_12 sliver). The joint's own covers (the cap cover, the seal disc,
// the fans) own that overlap, so renderEmergent gives no slot to a pair
// whose two passes both lie within JOINT_PAIR_REACH ctrl of one fused
// junction (junctionArcCtrls). Physics keeps the pair.
export const JOINT_PAIR_REACH = 2;

export function isJointPair(
  a: { chain: number; ctrl: number },
  b: { chain: number; ctrl: number },
  joints: ReadonlyMap<number, ReadonlyArray<{ ctrl: number; jn: number }>>,
  chainLen: (chain: number) => number,
  closed: (chain: number) => boolean
): boolean {
  if (a.chain === b.chain) return false;
  const ja = joints.get(a.chain);
  const jb = joints.get(b.chain);
  if (!ja || !jb) return false;
  const near = (chain: number, ctrl: number, at: number): boolean => {
    let d = Math.abs(ctrl - at);
    if (closed(chain)) d = Math.min(d, chainLen(chain) - d);
    return d < JOINT_PAIR_REACH;
  };
  for (const x of ja) {
    if (!near(a.chain, a.ctrl, x.ctrl)) continue;
    for (const y of jb) {
      if (y.jn === x.jn && near(b.chain, b.ctrl, y.ctrl)) return true;
    }
  }
  return false;
}

/** A crossing pass as the export carries it. */
export function exportPass(p: CrossingPass): ExportPass {
  return p.displayF === undefined
    ? { chain: p.chain, ctrl: p.ctrl }
    : { chain: p.chain, ctrl: p.ctrl, displayF: p.displayF };
}

/** A chain's export from its samples (copies: the input is transferred). */
export function exportChain(
  s: SplineSamples,
  particles: number,
  fused: readonly [boolean, boolean]
): ExportChain {
  return {
    closed: s.closed,
    count: s.count,
    positions: s.positions.slice(0, s.count * 2),
    totalLength: s.totalLength,
    controlArcLengths: Float64Array.from(s.controlArcLengths),
    particles: { length: particles },
    tucked: [fused[0], fused[1]],
  };
}

/** The emergent crossings master gives a gap slot this frame
 * (crossing_gaps.ts renderEmergent, gate aside): joint pairs skipped,
 * physics binding points deduped within 0.8 of a registered crossing's
 * drawn centre (diagData) or of one already taken, at most EMERGENT_POOL. */
export function slotEmergent(
  emergent: Iterable<{ over: CrossingPass; under: CrossingPass }>,
  bindingPoint: (p: CrossingPass, out: Float32Array, offset: number) => void,
  diagData: ArrayLike<number>,
  skipJointPairs: boolean,
  joints: ReadonlyMap<number, ReadonlyArray<{ ctrl: number; jn: number }>>,
  chainLen: (chain: number) => number,
  closed: (chain: number) => boolean
): { list: ExportCrossing[]; jointPairs: number; dups: number; overPool: number } {
  const scratch = new Float32Array(2);
  const used: number[] = [];
  const list: ExportCrossing[] = [];
  let jointPairs = 0;
  let dups = 0;
  let overPool = 0;
  for (const em of emergent) {
    if (skipJointPairs && isJointPair(em.over, em.under, joints, chainLen, closed)) {
      jointPairs++;
      continue;
    }
    bindingPoint(em.over, scratch, 0);
    const ex = scratch[0];
    const ey = scratch[1];
    let dup = false;
    for (let c = 0; c * 5 < diagData.length; c++) {
      if (Math.hypot(diagData[c * 5] - ex, diagData[c * 5 + 1] - ey) < 0.8) {
        dup = true;
        break;
      }
    }
    for (let k = 0; !dup && k < used.length; k += 2) {
      if (Math.hypot(used[k] - ex, used[k + 1] - ey) < 0.8) dup = true;
    }
    if (dup) {
      dups++;
      continue;
    }
    if (list.length >= EMERGENT_POOL) {
      overPool++;
      continue;
    }
    used.push(ex, ey);
    list.push({ over: exportPass(em.over), under: exportPass(em.under) });
  }
  return { list, jointPairs, dups, overPool };
}

/** What main gathers once per scene and camera for the channel: the input
 * without its per-frame parts, each chain's particle count and tucks, and
 * the emergent slotting's renderer state. Structured-cloneable. */
export interface LeanSkeleton {
  rest: Omit<SceneExportInput, "chains" | "crossings" | "emergent">;
  particles: number[];
  tucked: [boolean, boolean][];
  skipJointPairs: boolean;
  joints: Map<number, { ctrl: number; jn: number }[]>;
}

/** The input from the skeleton and one frame's chains, crossings and
 * emergent slots: the same object gatherSceneInputLean returns. */
export function assembleLeanInput(
  sk: LeanSkeleton,
  chains: ExportChain[],
  crossings: ExportCrossing[],
  emergent: ExportCrossing[]
): SceneExportInput {
  const r = sk.rest;
  return {
    name: r.name,
    source: r.source,
    camera: r.camera,
    look: r.look,
    chains,
    zPos: r.zPos,
    physPositions: r.physPositions,
    crossings,
    emergent,
    dedupeEmergent: r.dedupeEmergent,
    junctions: r.junctions,
    corners: r.corners,
    freeTips: r.freeTips,
    anchoredTips: r.anchoredTips,
  };
}