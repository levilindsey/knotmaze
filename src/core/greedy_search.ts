// K74 stage 4 (build half, K527/K532): the greedy-trap search seam.
// searchGreedyTraps (greedy_trap.ts) is pure walk-graph code; this module
// runs it H1-in-loop over maze plans: every trial is a fresh lattice with
// the plan applied and H1 fused (hCutShare as planned), scored by the two
// greedy walkers on the walk graph the player gets, and a deletion is a
// choice splice or 4-way merge removed from the plan. Spanning sites are
// never offered, so reachability holds by construction; the result is
// still checked with planReachesAll and a finite walk before it ships.
//
// Candidate mapping from the post-H1 walk graph, nearest the exit first:
// (1) an mnode_<k> splice junction by its splice order (the two junctions
// of combined splice k are mnode_2k and mnode_2k+1, spanning first);
// (2) a fused junction by its exact lattice position against the choice
// splices' endpoints; (3) a 4-way merge by its crossing id. Sites the
// plan's H1 exit guard protects (exitGuardCrossings, or inside the exit
// clearance of exitGuardPoint) are never offered.

import { generateLatticeKnotwork } from "./lattice_grower";
import type { GenerationParams, TangleGraph } from "./types";
import { NODE_TYPE } from "./types";
import type { MazeParams, MazePlan } from "./maze_plan";
import { planReachesAll } from "./maze_plan";
import { applyMazeCuts, applyMazePlan } from "./maze_apply";
import { buildWalkGraph } from "./walk_graph";
import type { WalkGraph } from "./walk_graph";
import { hypot2 } from "../util/det_math";
import {
  farEndScore,
  greedyWalk,
  greedyWalkRanked,
  headingComparator,
  searchGreedyTraps,
  trapCandidates,
  DEFAULT_TRAP_SEARCH,
} from "./greedy_trap";
import type {
  TrapEval,
  TrapSearchOptions,
  TrapSearchResult,
} from "./greedy_trap";

// The heading walker's look: the first polyline point at or past this
// arc along a run (the prototype's first 3 u, as an exact lattice point).
export const HEADING_LOOK = 3;

export function trapOptionsOf(
  p: Pick<
    MazeParams,
    | "trapTargetF"
    | "trapTargetH"
    | "trapMaxF"
    | "trapMaxH"
    | "trapMaxGrow"
    | "trapRadius"
    | "trapIters"
    | "trapTries"
    | "trapSurplus"
  >
): TrapSearchOptions {
  return {
    targetF: p.trapTargetF,
    targetH: p.trapTargetH,
    maxF: p.trapMaxF,
    maxH: p.trapMaxH,
    maxGrow: p.trapMaxGrow,
    iters: Math.max(0, Math.round(p.trapIters)),
    tries: Math.max(1, Math.round(p.trapTries)),
    surplus: p.trapSurplus,
    radius: p.trapRadius,
  };
}

const clonePlan = (plan: MazePlan): MazePlan =>
  JSON.parse(JSON.stringify(plan)) as MazePlan;

interface BuiltMaze {
  graph: TangleGraph;
  wg: WalkGraph;
  pos: Map<string, [number, number]>;
  headings: Map<string, [number, number]>;
}

function buildMaze(
  gen: GenerationParams,
  state: MazePlan
): BuiltMaze | null {
  const graph = generateLatticeKnotwork(gen);
  const plan = clonePlan(state);
  const hue = applyMazePlan(graph, plan);
  applyMazeCuts(graph, plan, hue);
  const wg = buildWalkGraph(graph);
  if (!wg || !Number.isFinite(wg.optimalLength)) return null;
  const pos = new Map<string, [number, number]>();
  for (const id of wg.vertices.keys()) {
    const p = graph.nodes.get(id)!.latticePos;
    pos.set(id, [p[0], p[1]]);
  }
  return { graph, wg, pos, headings: headingVectors(graph, wg) };
}

// A run's lattice polyline, va -> vb (as stored on its strand).
function runPoly(
  graph: TangleGraph,
  e: WalkGraph["edges"][number]
): Array<[number, number]> {
  const strand = graph.strands[e.chain];
  const nc = strand.isClosed ? strand.nodes.length - 1 : strand.nodes.length;
  const ne = strand.edgeIds.length;
  const a = e.ctrlA / 2;
  const b = e.ctrlB / 2;
  const pts: Array<[number, number]> = [];
  for (let k = a; k < b; k++) {
    const n0 = strand.nodes[k % nc];
    let lp = graph.edges.get(strand.edgeIds[k % ne])!.latticePoints;
    const p0 = graph.nodes.get(n0)!.latticePos;
    if (hypot2(lp[0][0] - p0[0], lp[0][1] - p0[1]) > 1e-6) {
      lp = [...lp].reverse();
    }
    for (let i = pts.length ? 1 : 0; i < lp.length; i++) {
      pts.push([lp[i][0], lp[i][1]]);
    }
  }
  return pts;
}

// Directed heading vectors per (vertex, walk edge): q - p, where q is
// the point HEADING_LOOK of arc along the run from p (the run's far end
// on a shorter run, as the prototype's look clamps there). Segment
// lengths go through hypot2 and the interpolation through division -
// both engine-exact operations (K108) - and the ranking itself
// (greedy_trap's headingComparator) needs no normalization division.
export function headingVectors(
  graph: TangleGraph,
  wg: WalkGraph
): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  for (const e of wg.edges) {
    const ab = runPoly(graph, e);
    if (ab.length < 2) continue;
    for (const from of [e.va, e.vb]) {
      const pts = from === e.va ? ab : [...ab].reverse();
      const p = pts[0];
      let acc = 0;
      let q = pts[pts.length - 1];
      for (let i = 1; i < pts.length; i++) {
        const seg = hypot2(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (acc + seg >= HEADING_LOOK && seg > 0) {
          const t = (HEADING_LOOK - acc) / seg;
          q = [
            pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
            pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t,
          ];
          break;
        }
        acc += seg;
      }
      out.set(`${from}|${e.id}`, [q[0] - p[0], q[1] - p[1]]);
    }
  }
  return out;
}

function evaluateMaze(
  built: BuiltMaze | null
): TrapEval | null {
  if (!built) return null;
  const { wg, pos, headings } = built;
  const exitPos = pos.get(wg.exit)!;
  const gF = greedyWalk(wg, wg.start, wg.exit, farEndScore(wg, pos, exitPos));
  const gH = greedyWalkRanked(
    wg,
    wg.start,
    wg.exit,
    headingComparator(pos, exitPos, (v, eid) =>
      headings.get(`${v}|${eid}`) ?? [0, 0]
    )
  );
  return {
    optimal: wg.optimalLength,
    gF: gF.walked / wg.optimalLength,
    gH: gH.walked / wg.optimalLength,
  };
}

// Run the H1-in-loop search over a finished plan. Returns the searched
// plan (the base plan when the searched one would not reach every piece
// or has no finite route - a searched design must stay solvable).
export function searchGreedyTrapPlan(
  gen: GenerationParams,
  basePlan: MazePlan,
  options: TrapSearchOptions = DEFAULT_TRAP_SEARCH
): MazePlan {
  return searchGreedyTrapPlanDetailed(gen, basePlan, options).state;
}

export function searchGreedyTrapPlanDetailed(
  gen: GenerationParams,
  basePlan: MazePlan,
  options: TrapSearchOptions = DEFAULT_TRAP_SEARCH
): TrapSearchResult<MazePlan> {
  const build = (state: MazePlan): BuiltMaze | null => buildMaze(gen, state);
  const result = searchGreedyTraps<MazePlan>(basePlan, {
    evaluate: (state) => evaluateMaze(build(state)),
    candidates: (state, current) => {
      const built = build(state);
      if (!built) return [];
      const { graph, wg, pos, headings } = built;
      const exitPos = pos.get(wg.exit)!;
      const paths: string[][] = [];
      if (current.gF < options.targetF) {
        paths.push(
          greedyWalk(wg, wg.start, wg.exit, farEndScore(wg, pos, exitPos))
            .finalPath
        );
      }
      if (current.gH < options.targetH) {
        paths.push(
          greedyWalkRanked(
            wg,
            wg.start,
            wg.exit,
            headingComparator(pos, exitPos, (v, eid) =>
              headings.get(`${v}|${eid}`) ?? [0, 0]
            )
          ).finalPath
        );
      }
      const verts = trapCandidates(
        paths,
        pos,
        exitPos,
        options.radius,
        (id) =>
          graph.nodes.get(id)?.type === NODE_TYPE.JUNCTION &&
          id !== wg.start &&
          id !== wg.exit
      );
      const guardCrossings = new Set(state.exitGuardCrossings ?? []);
      const guardPoint = state.exitGuardPoint;
      const guardClearance = state.exitGuardClearance ?? 0;
      const nSpan = state.spanningSplices.length;
      const out: string[] = [];
      const seen = new Set<string>();
      for (const c of verts) {
        if (guardCrossings.has(c.id)) continue;
        const p = pos.get(c.id);
        if (
          guardPoint &&
          guardClearance > 0 &&
          p &&
          hypot2(p[0] - guardPoint[0], p[1] - guardPoint[1]) < guardClearance
        ) {
          continue;
        }
        let id: string | null = null;
        const m = /^mnode_(\d+)$/.exec(c.id);
        if (m) {
          const k = Math.floor(Number(m[1]) / 2);
          if (k < nSpan) continue; // Spanning: reachability, never offered.
          const sp = state.choiceSplices[k - nSpan];
          if (sp) id = `splice:${sp.edgeA}|${sp.edgeB}`;
        }
        if (!id && p) {
          const sp = state.choiceSplices.find(
            (s) =>
              (s.a[0] === p[0] && s.a[1] === p[1]) ||
              (s.b[0] === p[0] && s.b[1] === p[1])
          );
          if (sp) id = `splice:${sp.edgeA}|${sp.edgeB}`;
        }
        if (!id && state.fourWayMerges.includes(c.id)) {
          id = `merge:${c.id}`;
        }
        if (id && !seen.has(id)) {
          seen.add(id);
          out.push(id);
        }
      }
      return out;
    },
    remove: (state, id) => {
      const next = clonePlan(state);
      if (id.startsWith("splice:")) {
        const key = id.slice("splice:".length);
        next.choiceSplices = next.choiceSplices.filter(
          (sp) => `${sp.edgeA}|${sp.edgeB}` !== key
        );
      } else if (id.startsWith("merge:")) {
        const cid = id.slice("merge:".length);
        next.fourWayMerges = next.fourWayMerges.filter((x) => x !== cid);
      }
      return next;
    },
  });
  if (result.state === basePlan || result.removed.length === 0) return result;
  // A deletion only removes choice junctions, but hold the searched plan
  // to the same checks the plan itself passes before it ships.
  const fresh = generateLatticeKnotwork(gen);
  if (!planReachesAll(fresh, result.state)) return { ...result, state: basePlan };
  if (!evaluateMaze(build(result.state))) return { ...result, state: basePlan };
  return result;
}
