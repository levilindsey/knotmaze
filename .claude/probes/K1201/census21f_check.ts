// K1201 (21F) independent check: recompute every play-reach arm-end xR in
// census21f.json from walk_graph.ts's own Dijkstra (walkDistances), a
// different code path from pulse_path.ts's tree sums, and confirm the
// meeting classification (xR < 0.5) and each meeting arm's alternative
// path (the far end reached without the arm itself).
//   node scripts/run_node.mjs .claude/probes/K1201/census21f_check.ts
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSceneGraph } from "../../../src/core/scene_graph";
import type { SceneParams } from "../../../src/core/scene_graph";
import { buildWalkGraph, walkDistances } from "../../../src/core/walk_graph";
import { dailyParams } from "../../../src/ui/daily_link";
import { fabricScene } from "../../../test/physics/fabric_scene";
import { STANDS, linkOf } from "./stands_cyc.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const census = JSON.parse(readFileSync(join(here, "out", "census21f.json"), "utf8"));

function walkFor(name: string) {
  let params: SceneParams;
  if (name.startsWith("daily-")) {
    const n = Number(name.slice(6));
    params = { ...dailyParams(n), title: "", glyphs2: "" } as SceneParams;
  } else {
    params = fabricScene(`?${linkOf(STANDS[name as "cyc" | "loop" | "x4"])}`).params;
  }
  const scene = buildSceneGraph(params);
  const walk = scene.walk ?? buildWalkGraph(scene.graph);
  if (!walk) throw new Error(`${name}: no walk graph`);
  return walk;
}

let checked = 0;
let worst = 0;
let bad = 0;
for (const maze of census.plays) {
  if (maze.error) continue;
  const walk = walkFor(maze.name);
  const byHead = new Map<string, ReturnType<typeof walkDistances>>();
  const distOf = (head: string) => {
    let d = byHead.get(head);
    if (!d) {
      d = walkDistances(walk.vertices, walk.edges, head);
      byHead.set(head, d);
    }
    return d;
  };
  for (const e of maze.ends) {
    const dist = distOf(e.head);
    const dNear = dist.get(e.near)!;
    const dFar = dist.get(e.far)!;
    const span = walk.edges[e.edge].length;
    const xR = e.loop
      ? span / 2
      : e.endVertex === e.near
        ? (dFar + span - dNear) / 2
        : (dNear + span - dFar) / 2;
    const diff = Math.abs(xR - e.xR);
    if (diff > worst) worst = diff;
    if (diff > 0.002 || (xR < 0.5) !== (e.xR < 0.5)) {
      bad++;
      console.log(`MISMATCH ${maze.name} head ${e.head} e${e.edge} end ${e.endVertex}: census ${e.xR} vs walkDistances ${xR}`);
    }
    checked++;
    if (e.xR < 0.5 && !e.loop) {
      // The dB end leads back: without this arm, near still reaches far.
      const alt = walkDistances(walk.vertices, walk.edges, e.near, new Set([e.edge])).get(e.far)!;
      if (!Number.isFinite(alt)) {
        bad++;
        console.log(`NO ALT PATH ${maze.name} head ${e.head} e${e.edge}`);
      }
    }
  }
  console.log(`${maze.name}: ${maze.ends.length} play-reach ends recomputed`);
}
console.log(`checked ${checked} ends, worst |dxR| ${worst.toExponential(3)}, mismatches ${bad}`);
if (bad > 0) process.exit(1);
