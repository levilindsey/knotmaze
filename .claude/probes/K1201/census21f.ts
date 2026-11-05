// K1201 (batch 21 Run F, 21F): the census in Node — how often play meets
// S4b's joint step. CPU only: no browser, no renderer, no lock, no timing.
// For every named maze, every junction that can be a head (every non-end
// walk vertex) and every arm pulseTree lights from both ends: both ends'
// hand-off distance xR, the arm's span/W, dA, dB, whether the arm is on a
// cycle, and — for arm-ends with xR < 0.5 — the step ridge_joint.ts's
// metric predicts at that hand-off (parent crest against child kPulseV2
// at the joint, max over 400 clocks, both directions, computed here with
// paint_math.ts's twins at the arm's own dA, dB, span and W).
//
// Span source: lattice WalkEdge.length throughout (spanOf = the walk
// edge's lattice length), never a page dump. pulseTree runs with
// arrival -1 and no gate/blocked, over the whole walk graph (reach
// Infinity; the primary table) — an upper bound on play, whose gate can
// only remove arms (20E's sweep used the same no-gate bound). A second
// pass at each maze's own pulseReach is reported beside it. 20E's dumps,
// census predecessors and tables in this folder stay as they are; this
// run's work is census21f.* beside them.
//   node scripts/run_node.mjs .claude/probes/K1201/census21f.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSceneGraph } from "../../../src/core/scene_graph";
import type { SceneParams } from "../../../src/core/scene_graph";
import { buildWalkGraph } from "../../../src/core/walk_graph";
import type { WalkGraph } from "../../../src/core/walk_graph";
import { pulseTree } from "../../../src/render/pulse_path";
import { kPulseCrest, kPulseV2 } from "../../../src/render/paint_math";
import type { KUniforms } from "../../../src/render/paint_math";
import { dailyParams, dailySeed } from "../../../src/ui/daily_link";
import { formatDayDate, todayNumber } from "../../../src/game/daily_calendar";
import { fabricScene } from "../../../test/physics/fabric_scene";
import { STANDS, linkOf } from "./stands_cyc.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "out");
mkdirSync(OUT, { recursive: true });

// --- ridge_joint.ts's metric, replicated on the src twins ---------------
const SPACING = 2.5;
function uniforms(clock: number): KUniforms {
  const K = new Float32Array(64 * 4);
  K.set([0, 0, 1, 1]);
  const s = Math.max(0.5, SPACING);
  const mod = (x: number): number => x - s * Math.floor(x / s);
  return {
    uKBase: new Float32Array([0, 0, 0, 1]),
    uKFx: new Float32Array(4),
    uKFx2: new Float32Array(4),
    uKShape: new Float32Array([1, 0, 1, 0]),
    uKInk: new Float32Array([1, 0, 0, 0]),
    uKKnots: K,
    uKGamut: new Float32Array([0, 280, 0.45, 0.64]),
    uKSect: new Float32Array([0, 0, 1e6, 0.75]),
    uKPaint: new Float32Array([1, 0, 0, 0.5]),
    uKPulse: new Float32Array([mod(clock * 1.6), mod((clock + 0.3) * 1.6), s, 1]),
    uKReach: new Float32Array([1e6, 1, 0, 0]),
    uKGold: new Float32Array([1, 0.8, 0.3, 1]),
  } as KUniforms;
}
function stepAt(dA: number, dB: number, W: number): number {
  let best = 0;
  for (let i = 0; i < 400; i++) {
    const clock = 100 + (i * 2 * (SPACING / 1.6)) / 400;
    const U = uniforms(clock);
    for (const [inwA, inwB] of [
      [false, false],
      [true, false],
      [false, true],
      [true, true],
    ] as Array<[boolean, boolean]>) {
      const par = kPulseCrest(U, dA, inwA, false, 1, 1);
      const kid = kPulseV2(U, 0, W, dA, dB, inwA, inwB, false);
      const r = Math.abs(par - kid);
      if (r > best) best = r;
    }
  }
  return best;
}

// Can `from` reach `to` without walk edge `skip`? (the arm's cycle test)
function leadsBack(walk: WalkGraph, from: string, to: string, skip: number): boolean {
  const seen = new Set<string>([from]);
  const q = [from];
  while (q.length) {
    const v = q.shift()!;
    if (v === to) return true;
    for (const eid of walk.vertices.get(v)!.edges) {
      if (eid === skip) continue;
      const e = walk.edges[eid];
      const w = e.va === v ? e.vb : e.va;
      if (!seen.has(w)) {
        seen.add(w);
        q.push(w);
      }
    }
  }
  return false;
}

interface EndRow {
  head: string;
  edge: number;
  near: string;
  far: string;
  loop: boolean;
  onCycle: boolean;
  span: number;
  dA: number;
  dB: number;
  endVertex: string;
  xR: number;
  step: number | null;
}
interface MazeRow {
  name: string;
  source: string;
  playReach: number;
  headsTried: number;
  vertices: number;
  endsExcluded: number;
  twoInc: number;
  twoDistinct: number;
  armEnds: number;
  meetEnds: number;
  meetHeads: number;
  smallestXR: number | null;
  largestStep: number | null;
  ends: EndRow[];
  error?: string;
}

function censusMaze(
  name: string,
  source: string,
  params: SceneParams,
  playReach: number
): { whole: MazeRow; play: MazeRow } {
  const scene = buildSceneGraph(params);
  const walk = scene.walk ?? buildWalkGraph(scene.graph);
  if (!walk) throw new Error("buildWalkGraph returned null (no cut ends)");
  const heads: string[] = [];
  let endsExcluded = 0;
  for (const v of walk.vertices.values()) {
    if (v.isEnd) endsExcluded++;
    else heads.push(v.id);
  }
  heads.sort();
  const spanOf = (eid: number): number => walk.edges[eid].length;
  const run = (reach: number): MazeRow => {
    const ends: EndRow[] = [];
    const distinct = new Set<number>();
    const meetHeads = new Set<string>();
    let smallest: number | null = null;
    let largestStep: number | null = null;
    for (const head of heads) {
      const { items } = pulseTree(walk, head, -1, reach, spanOf);
      for (const it of items) {
        if (!it.two) continue;
        distinct.add(it.edge);
        const e = walk.edges[it.edge];
        const loop = e.va === e.vb;
        const onCycle = loop ? true : leadsBack(walk, it.far, it.near, it.edge);
        const gR = (it.dist0 + it.dB + it.span) / 2;
        const xRnear = gR - it.dist0;
        const xRfar = gR - it.dB;
        const endDefs: Array<{ vertex: string; xR: number }> = loop
          ? [{ vertex: it.near, xR: xRnear }]
          : [
              { vertex: it.near, xR: xRnear },
              { vertex: it.far, xR: xRfar },
            ];
        // The metric is evaluated at each end's own joint, in that end's
        // orientation (ridge_joint.ts: parent crest at the joint against
        // the child read from that end, dA/dB swapped for the far end).
        const stepNear = endDefs.some((d) => d.vertex === it.near && d.xR < 0.5)
          ? stepAt(it.dist0, it.dB, it.span)
          : null;
        const stepFar = loop
          ? stepNear
          : endDefs.some((d) => d.vertex === it.far && d.xR < 0.5)
            ? stepAt(it.dB, it.dist0, it.span)
            : null;
        for (const d of endDefs) {
          const step = d.vertex === it.near ? stepNear : stepFar;
          if (smallest === null || d.xR < smallest) smallest = d.xR;
          if (d.xR < 0.5) {
            meetHeads.add(head);
            if (step !== null && (largestStep === null || step > largestStep))
              largestStep = step;
          }
          ends.push({
            head,
            edge: it.edge,
            near: it.near,
            far: it.far,
            loop,
            onCycle,
            span: it.span,
            dA: it.dist0,
            dB: it.dB,
            endVertex: d.vertex,
            xR: d.xR,
            step: d.xR < 0.5 ? step : null,
          });
        }
      }
    }
    return {
      name,
      source,
      playReach,
      headsTried: heads.length,
      vertices: walk.vertices.size,
      endsExcluded,
      twoInc: new Set(ends.map((r) => `${r.head}:${r.edge}`)).size,
      twoDistinct: distinct.size,
      armEnds: ends.length,
      meetEnds: ends.filter((r) => r.xR < 0.5).length,
      meetHeads: meetHeads.size,
      smallestXR: smallest,
      largestStep,
      ends,
    };
  };
  return { whole: run(Infinity), play: run(playReach) };
}

// --- the mazes (Run F task 1, named) -------------------------------------
const today = todayNumber();
const mazes: Array<{ name: string; source: string; params: SceneParams; playReach: number }> = [];
for (const key of ["cyc", "loop", "x4"] as const) {
  const st = STANDS[key];
  const link = linkOf(st);
  const { params } = fabricScene(`?${link}`);
  mazes.push({
    name: key,
    source: `stand ${key}, link ?${link} (verbatim from stands_cyc.mjs; moves choose only the stand head, the census enumerates every head)`,
    params,
    playReach: params.pulseReach,
  });
}
for (let n = today - 6; n <= today; n++) {
  const p = dailyParams(n);
  mazes.push({
    name: `daily-${n}`,
    source: `Daily #${n} (${formatDayDate(n)}), seed dailySeed(${n})=${dailySeed(n)}, today's PARAM_DEFAULTS via dailyParams(${n})`,
    params: { ...p, title: "", glyphs2: "" } as SceneParams,
    playReach: p.pulseReach,
  });
}

// Metric self-check against ridge_joint.ts's printed table (dA 5, W 2.5).
const metricCheck = [0.4, 0.3, 0.2, 0.1, 0].map((xR) => {
  const dA = 5;
  const W = 2.5;
  const dB = dA + 2 * xR - W;
  return { xR, step: +stepAt(dA, dB, W).toFixed(4) };
});

const wholes: MazeRow[] = [];
const plays: MazeRow[] = [];
for (const m of mazes) {
  try {
    const { whole, play } = censusMaze(m.name, m.source, m.params, m.playReach);
    wholes.push(whole);
    plays.push(play);
    console.log(
      `${m.name}: heads ${whole.headsTried}, two-ended (head,arm) ${whole.twoInc}, arm-ends ${whole.armEnds}, meet xR<0.5: ${whole.meetEnds} ends / ${whole.meetHeads} heads, smallest xR ${whole.smallestXR}, largest step ${whole.largestStep}`
    );
  } catch (err) {
    const row: MazeRow = {
      name: m.name, source: m.source, playReach: m.playReach, headsTried: 0,
      vertices: 0, endsExcluded: 0, twoInc: 0, twoDistinct: 0, armEnds: 0,
      meetEnds: 0, meetHeads: 0, smallestXR: null, largestStep: null, ends: [],
      error: err instanceof Error ? err.message : String(err),
    };
    wholes.push(row);
    plays.push(row);
    console.log(`${m.name}: DID NOT BUILD: ${row.error}`);
  }
}

// 20E reproduction check (drawn spans there, lattice here; brief tol 0.05).
function check20E(maze: string, edge: number, head: string): EndRow[] {
  const w = wholes.find((r) => r.name === maze);
  if (!w) return [];
  return w.ends.filter((r) => r.edge === edge && r.head === head);
}
const checkRows: Array<{ maze: string; edge: number; head: string; latticeXR: number[]; drawn20E: number }> = [];
for (const [maze, edge, heads, drawn] of [
  ["cyc", 210, ["node_218", "node_221"], 0.68],
  ["loop", 102, ["node_635", "mnode_77", "node_649"], 3.835],
] as Array<[string, number, string[], number]>) {
  for (const h of heads) {
    const rows = check20E(maze, edge, h);
    checkRows.push({ maze, edge, head: h, latticeXR: rows.map((r) => +r.xR.toFixed(3)), drawn20E: drawn });
  }
}

const built = wholes.filter((r) => !r.error);
const sum = (rows: MazeRow[], f: (r: MazeRow) => number): number => rows.reduce((a, r) => a + f(r), 0);
const allMeet = built.flatMap((r) => r.ends.filter((e) => e.xR < 0.5));
const overall = {
  mazesBuilt: built.length,
  headsTried: sum(built, (r) => r.headsTried),
  twoInc: sum(built, (r) => r.twoInc),
  armEnds: sum(built, (r) => r.armEnds),
  meetEnds: sum(built, (r) => r.meetEnds),
  meetHeads: sum(built, (r) => r.meetHeads),
  smallestXR: built.reduce<number | null>((m, r) => (r.smallestXR === null ? m : m === null ? r.smallestXR : Math.min(m, r.smallestXR)), null),
  smallestWhere: allMeet.length || built.length ? (() => { let best: EndRow | null = null; let maze = ""; for (const r of built) for (const e of r.ends) if (best === null || e.xR < best.xR) { best = e; maze = r.name; } return best ? { maze, ...best } : null; })() : null,
  largestStep: allMeet.reduce<number | null>((m, e) => (e.step === null ? m : m === null ? e.step : Math.max(m, e.step)), null),
};

const lines: string[] = [];
lines.push(`K1201 census (21F): CPU only (Node, scripts/run_node.mjs), lattice spans (WalkEdge.length), pulseTree arrival -1, no gate/blocked.`);
lines.push(`Run day: todayNumber()=${today}; dailies #${today - 6}..#${today}. Primary reach: Infinity (whole walk graph); play reach per maze beside it.`);
lines.push(`Metric self-check (dA 5, W 2.5; ridge_joint.txt reads 0.18/0.36/0.54/0.72/0.90): ${metricCheck.map((c) => `xR ${c.xR} -> ${c.step}`).join(", ")}`);
lines.push("");
lines.push("20E reproduction (lattice xR here vs 20E drawn-span xR; brief tolerance 0.05):");
for (const c of checkRows) lines.push(`  ${c.maze} e${c.edge} head ${c.head}: lattice ends [${c.latticeXR.join(", ")}], 20E drawn B-end 0.680/3.835 = ${c.drawn20E}`);
lines.push("");
const fmtRow = (r: MazeRow): string =>
  `${r.name.padEnd(10)} heads ${String(r.headsTried).padStart(4)}  two(head,arm) ${String(r.twoInc).padStart(5)}  distinct ${String(r.twoDistinct).padStart(3)}  arm-ends ${String(r.armEnds).padStart(5)}  meet<0.5 ${String(r.meetEnds).padStart(4)} ends / ${String(r.meetHeads).padStart(3)} heads  smallest xR ${r.smallestXR === null ? "-" : r.smallestXR.toFixed(3)}  largest step ${r.largestStep === null ? "-" : r.largestStep.toFixed(4)}${r.error ? `  ERROR ${r.error}` : ""}`;
lines.push("Per maze, whole-graph reach (primary):");
for (const r of wholes) lines.push("  " + fmtRow(r));
lines.push(`  OVERALL    heads ${overall.headsTried}  two(head,arm) ${overall.twoInc}  arm-ends ${overall.armEnds}  meet<0.5 ${overall.meetEnds} ends / ${overall.meetHeads} heads  smallest xR ${overall.smallestXR?.toFixed(3)}  largest step ${overall.largestStep === null ? "-" : overall.largestStep.toFixed(4)}`);
lines.push("");
lines.push("Per maze, play reach (pulseReach param; sensitivity, same trees):");
for (const r of plays) lines.push("  " + fmtRow(r));
lines.push("");
lines.push("Meeting arm-ends (xR < 0.5) at play reach, every one:");
const playMeet = plays.filter((r) => !r.error).flatMap((r) => r.ends.filter((x) => x.xR < 0.5).map((e) => ({ maze: r.name, e })));
if (playMeet.length === 0) lines.push("  none");
for (const { maze, e } of playMeet) {
  lines.push(`  ${maze} head ${e.head} e${e.edge} ${e.near}->${e.far}${e.loop ? " (self-loop)" : ""} end ${e.endVertex} xR ${e.xR.toFixed(3)} span/W ${e.span.toFixed(3)} dA ${e.dA.toFixed(3)} dB ${e.dB.toFixed(3)} onCycle ${e.onCycle} step ${e.step?.toFixed(4)}`);
}
lines.push("");
lines.push("Whole-graph reach meeting ends are too many to list (count in the table);");
lines.push("the whole-graph rows for every maze are in census21f.json as compact tuples.");
lines.push(`Smallest xR overall (whole-graph): ${JSON.stringify(overall.smallestWhere)}`);
writeFileSync(join(OUT, "census21f.txt"), lines.join("\n") + "\n");
// JSON: play-reach ends in full; whole-graph meeting ends as compact tuples.
const wholeMeetTuples = built.flatMap((r) =>
  r.ends.filter((x) => x.xR < 0.5).map((e) => [r.name, e.head, e.edge, e.endVertex, +e.xR.toFixed(4), e.step === null ? null : +e.step.toFixed(4)])
);
writeFileSync(join(OUT, "census21f.json"), JSON.stringify({ today, metricCheck, checkRows, wholes: wholes.map((r) => ({ ...r, ends: undefined })), plays, overall, wholeMeetTuples }, null, 1));
console.log(lines.slice(0, 30).join("\n"));
