// K1187 stand search (Node, run_node.mjs): over real designs built the
// page's way (K137's buildDesign/designParams), with the page's fire
// (fi=fuse: fireSettingsOf at today's defaults, r 0.6 h 0 turn) and
// breaking runs (fg=snap, then fg=crack: fabricRulesOf), find the first
// seed and move list where, mid-move, the anim run is in brokenRuns()
// and the fire's no-predicate answer on its unswept stretch is
// non-empty at the break's clock. Per seed and mode, walkers in order:
// the shortest route to the exit, a fresh-run DFS, and four seeded
// random walks over choices(). A breaking tap is checked at progress
// 0.05..0.95 (renderer clock L = walkedDist - (1-p) * len; the unswept
// stretch is the part of the run ahead of the dot); any positive
// overlap of a burnt stretch with that stretch is a stand. Prints the
// stand as JSON, or the no-stand verdict for seeds 1..100.
import { buildDesign, designParams, mulberry32 } from "../K137/k137_lib.ts";
import { FabricMazeController } from "../../../src/game/fabric_controller.ts";
import { buildFire, runBurnAt } from "../../../src/game/fire.ts";
import { fabricRulesOf, fireSettingsOf } from "../../../src/ui/url_state.ts";

type Any = any;

function overlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

function tryWalk(
  seed: number,
  mode: string,
  walker: string,
  pick: (c: Any, choices: number[], used: Set<number>) => number
): Any | null {
  const params = { ...designParams(seed), gameMode: "burn", fragileRuns: mode };
  const { walk } = buildDesign(params);
  const fs = fireSettingsOf(params)!;
  const c = new FabricMazeController(
    walk,
    false,
    buildFire(walk, fs.speed, fs.delay, fs.clock),
    fabricRulesOf(params)
  );
  const moves: number[] = [];
  const used = new Set<number>();
  for (let step = 0; step < 600; step++) {
    if (c.solved || c.fireLost || c.stranded) break;
    const choices: number[] = c.choices();
    if (!choices.length) break;
    const eid = pick(c, choices, used);
    if (eid < 0) break;
    const depart = c.head;
    const e = walk.edges[eid];
    const r = c.tapEdge(eid);
    if (r !== "advance" && r !== "win" && r !== "backtrack") break;
    moves.push(eid);
    used.add(eid);
    if (c.justBroke !== eid || !c.brokenRuns().includes(eid)) continue;
    // The anim run broke behind the dot on this move.
    const len = e.length;
    const fromVa = e.va === depart;
    for (const p of [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95]) {
      const L = c.walkedDist - (1 - p) * len;
      const b = runBurnAt(walk, c.fire!, eid, L);
      if (b.state === "unburnt") continue;
      const burnt: Array<[number, number]> = b.state === "burnt" ? [[0, len]] : b.burnt;
      const u0 = fromVa ? p * len : 0;
      const u1 = fromVa ? len : (1 - p) * len;
      let over = 0;
      const parts: Array<[number, number]> = [];
      for (const [x0, x1] of burnt) {
        const o = overlap(x0, x1, u0, u1);
        if (o > 0) parts.push([Math.max(x0, u0), Math.min(x1, u1)]);
        over += o;
      }
      if (over <= 0) continue;
      const entered: string[] = [];
      for (const [x0, x1] of burnt) {
        if (x0 <= 1e-9) entered.push(`va (${e.va})`);
        if (x1 >= len - 1e-9) entered.push(`vb (${e.vb})`);
      }
      return {
        seed,
        mode,
        walker,
        link: `?${seed}&am=instant&fi=fuse&fg=${mode}&phw=0&snd=none`,
        fireSettings: fs,
        moves: [...moves],
        animEdge: eid,
        depart,
        arrive: c.head,
        edge: { va: e.va, vb: e.vb, length: len, chain: e.chain, ctrlA: e.ctrlA, ctrlB: e.ctrlB },
        progress: p,
        clockAtProgress: L,
        walkedDist: c.walkedDist,
        burnAtProgress: b,
        unsweptLattice: [u0, u1],
        unsweptBurntLattice: parts,
        overlapLattice: over,
        enteredFrom: entered.length ? entered : ["(neither end: the stretches met inside)"],
        broken: c.brokenRuns(),
        taps: [...c.taps],
      };
    }
  }
  return null;
}

const shortest = (c: Any, choices: number[]): number => {
  let best = -1;
  let bestCost = Infinity;
  for (const eid of choices) {
    const e = c.walk.edges[eid];
    const far = e.va === c.head ? e.vb : e.va;
    const cost = e.length + (c.walk.distToExit.get(far) ?? Infinity);
    if (cost < bestCost) {
      bestCost = cost;
      best = eid;
    }
  }
  return best;
};
const dfs = (_c: Any, choices: number[], used: Set<number>): number => {
  const fresh = choices.filter((e) => !used.has(e));
  return fresh.length ? fresh[0] : choices[0];
};

let found: Any = null;
for (let seed = 1; seed <= 100 && !found; seed++) {
  for (const mode of ["snap", "crack"]) {
    found = tryWalk(seed, mode, "shortest", shortest);
    if (!found) found = tryWalk(seed, mode, "dfs", dfs);
    for (let k = 0; k < 4 && !found; k++) {
      const rng = mulberry32((seed * 7919) ^ (k * 104729) ^ 0x1187);
      found = tryWalk(seed, mode, `random${k}`, (_c: Any, choices: number[]) =>
        choices[Math.floor(rng() * choices.length)]
      );
    }
    if (found) break;
  }
  if (seed % 25 === 0) console.log(`...searched seeds 1..${seed}, no stand yet`);
}
console.log(found ? JSON.stringify(found, null, 2) : "NO STAND in seeds 1..100");
