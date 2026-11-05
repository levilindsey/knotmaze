// K782 (batch 18 Run B, task 1): find a stand where a snare springs
// with travel, so the "Snared!" toast's timing can be probed on the page.
//
//   node scripts/run_node.mjs .claude/probes/K782/search.ts
//
// Builds mazes the page's way (.claude/probes/K137/k137_lib.ts's
// buildDesign / designParams, as k137_sim.ts does) and drives a
// TurnMinotaur on each walk built as main.ts builds it
// (turnConfig(turnMinoParamsOf(params)), turnSeed(seed)).
//
// Params fixed because the search drives the model directly (the page
// gets them from the link): gameMode "minotaur" (the link's mt=hunter
// implies it), minotaur "hunter", lures 3, snares 2 (lur=3&snr=2), and
// minoSpeed "charge" (msp=charge). Charge is load-bearing: at the
// default speed "one" a turn's path is one step, so the springing
// turn's cut lastPath is always empty and the monster never visibly
// travels before the snare's near end; a charge takes two steps while
// it has the player in sight, so the cut path can hold one step.
//
// Script (tools_page.mjs's shape, in the model): walk toward the
// monster until it stands two runs off, lay a snare on the run at the
// player's head that its approach crosses, then wait (turn(-1)) until
// the snare springs. The first seed (1..100) whose springing turn's
// cut lastPath has at least one step, with no catch before it, is the
// stand. A literal waits-only script from the entrance cannot spring
// at all: the head's only run there is the entrance tail, and the
// monster never steps onto it (the sanctuary, minotaur_turns.ts
// allowed()); 5 seeds x 300 waits left every snare "set".
import { buildDesign, designParams } from "../K137/k137_lib.ts";
// @ts-ignore dynamic src imports (k137_lib's pattern)
const { TurnMinotaur, turnConfig, turnSeed } = await import("../../../src/game/minotaur_turns.ts");
// @ts-ignore
const { turnMinoParamsOf } = await import("../../../src/ui/url_state.ts");

type Action = { type: "move"; edge: number } | { type: "wait" };

function findStand(seed: number): Record<string, unknown> | null {
  const params = designParams(seed);
  params.gameMode = "minotaur";
  params.minotaur = "hunter";
  params.lures = 3;
  params.snares = 2;
  params.minoSpeed = "charge";
  const { walk } = buildDesign(params);
  const tm = new TurnMinotaur(walk, turnConfig(turnMinoParamsOf(params)), turnSeed(seed));
  const g = tm.tg;
  const ids = g.chase.ids;
  const actions: Action[] = [];
  let snareEdge = -1;
  let snareAfterInputs = -1;
  let waitsAfterSnare = 0;
  const hop = (a: number, b: number): number => g.hopd(a, b);
  const runsAt = (v: number): number[] => [...g.chase.adj[v]].sort((a, b) => a - b);
  const far = (e: number, v: number): number => g.other(e, v);

  for (let t = 0; t < 400; t++) {
    const player = tm.player;
    const mino = tm.state.v;
    const d = hop(player, mino);
    if (snareEdge >= 0) {
      const wasSet = tm.snares[0]?.phase === "set";
      const r = tm.turn(-1);
      tm.setProgress(1);
      actions.push({ type: "wait" });
      waitsAfterSnare++;
      if (wasSet && tm.snares[0]?.phase === "holding") {
        if (tm.lastPath.length >= 1 && tm.catches === 0) {
          return {
            seed,
            link: `?${seed}&am=instant&mt=hunter&lur=3&snr=2&msp=charge&snd=none`,
            actions,
            snareEdge,
            snareAfterInputs,
            springTurn: tm.turns,
            springResult: r,
            lastPath: tm.lastPath.map(([e, b]: [number, number]) => [e, ids[b]]),
            minoAt: ids[tm.state.v],
            playerAt: ids[tm.player],
            snare: tm.snares[0],
            catches: tm.catches,
            inputs: [...tm.inputs],
          };
        }
        return null; // Sprang without travel (or after a catch): not the stand.
      }
      if (r === "caught" || tm.finished || waitsAfterSnare > 60) return null;
      continue;
    }
    if (d === 2) {
      const cand = runsAt(player).filter((e) => hop(far(e, player), mino) === 1);
      if (cand.length === 0) return null;
      snareEdge = cand[0];
      snareAfterInputs = tm.inputs.length;
      if (!tm.setSnare(snareEdge)) return null;
      continue;
    }
    if (d > 2) {
      // Walk toward the monster (never onto the exit or its vertex).
      let best = -1;
      let bestD = Infinity;
      for (const e of runsAt(player)) {
        const w = far(e, player);
        if (w === g.exit || w === mino) continue;
        const dd = hop(w, mino);
        if (dd < bestD) { bestD = dd; best = e; }
      }
      if (best < 0) return null;
      const r = tm.turn(best);
      tm.setProgress(1);
      actions.push({ type: "move", edge: best });
      if (tm.finished) return null;
      if (r === "caught") return null; // The page defers a catch: keep the stand catch-free.
      continue;
    }
    // d <= 1 without a snare: step away to reopen the two-run gap.
    let best = -1;
    let bestD = -Infinity;
    for (const e of runsAt(player)) {
      const w = far(e, player);
      if (w === g.exit || w === mino) continue;
      const dd = hop(w, mino);
      if (dd > bestD) { bestD = dd; best = e; }
    }
    if (best < 0) return null;
    const r = tm.turn(best);
    tm.setProgress(1);
    actions.push({ type: "move", edge: best });
    if (tm.finished || r === "caught") return null;
  }
  return null;
}

let stand: Record<string, unknown> | null = null;
for (let seed = 1; seed <= 100 && !stand; seed++) {
  try {
    stand = findStand(seed);
  } catch (err) {
    console.log(`seed ${seed}: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (stand) console.log(JSON.stringify(stand, null, 2));
}
if (!stand) {
  console.log("NO STAND in seeds 1..100");
  process.exitCode = 1;
}
