import { describe, expect, it } from "vitest";
import { buildSceneGraph } from "../../src/core/scene_graph";
import { buildWalkGraph, walkDistances } from "../../src/core/walk_graph";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import { FabricMazeController } from "../../src/game/fabric_controller";
import {
  attemptRecord,
  mazeFormExact,
  mazeTaps,
  rawFingerprint,
  restoreAttempt,
  titlePrefix,
  walkFingerprint,
} from "../../src/game/daily_attempt";
import type { AttemptInfo } from "../../src/game/daily_attempt";
import { DailyStore, validAttempt } from "../../src/game/daily_store";
import type { DailyResult, StorageLike } from "../../src/game/daily_store";
import { efficiencyOf } from "../../src/game/maze_stats";
import { rateRun, walkedOf } from "../../src/game/star_rating";
import { shareText } from "../../src/game/share_text";
import { dailyParams, sceneTitle } from "../../src/ui/daily_link";

// K552: a daily attempt survives the title flag. Attempts are stored in
// maze form (game/daily_attempt.ts), so a solve begun with the title
// thread on restores with it off and back, the stats, stars, result and
// share text of a solve do not depend on the flag, and an untitled record
// is exactly K47's. The maze-portion pin is test/core/title_topology.test.ts.

const DAY = 8;

const walks = new Map<boolean, WalkGraph>();

// Daily #8's walk as a page builds it, flag off or on (main.ts: the scene
// takes `title: sceneTitle(daily, params)`; an untitled scene's walk is
// buildWalkGraph's).
function walkOf(titled: boolean): WalkGraph {
  let w = walks.get(titled);
  if (w) return w;
  const params = { ...dailyParams(DAY), dailyTitleThread: titled };
  const scene = buildSceneGraph({ ...params, title: sceneTitle(DAY, params) });
  w = scene.walk ?? buildWalkGraph(scene.graph)!;
  walks.set(titled, w);
  return w;
}

// The walk's maze runs in order: maze index k is mazeIds(w)[k].
function mazeIds(w: WalkGraph): number[] {
  return w.edges.filter((e) => !w.titleEdges?.has(e.id)).map((e) => e.id);
}

const mazeName = (w: WalkGraph, id: string): string => w.mazeNames?.get(id) ?? id;

// The cheapest next run (shortest route to the exit), the arrival run
// excluded unless it is the only choice.
function best(c: FabricMazeController): number {
  let pick = -1;
  let bestCost = Infinity;
  for (const eid of c.choices()) {
    if (eid === c.arrivalEdge) continue;
    const e = c.walk.edges[eid];
    const far = e.va === c.head ? e.vb : e.va;
    const cost = e.length + (c.walk.distToExit.get(far) ?? Infinity);
    if (cost < bestCost) {
      bestCost = cost;
      pick = eid;
    }
  }
  return pick;
}

// A wrong turn: the outgoing run off the best route with the lowest maze
// index (the same run on the titled and the untitled walk).
function detour(c: FabricMazeController): number {
  const ids = mazeIds(c.walk);
  const good = best(c);
  const off = c
    .choices()
    .filter((eid) => eid !== good && eid !== c.arrivalEdge && ids.includes(eid));
  off.sort((a, b) => ids.indexOf(a) - ids.indexOf(b));
  return off.length > 0 ? off[0] : -1;
}

class MemStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}

const info = (walk: WalkGraph, elapsedMs = 12_345.6): AttemptInfo => ({
  startedAt: 1_790_000_000_000,
  day: DAY,
  elapsedMs,
  maze: walkFingerprint(walk),
  def: 1,
  savedAt: 1_790_000_012_346,
});

// The solve state a restore must reproduce, in maze terms.
function state(c: FabricMazeController): Record<string, unknown> {
  const w = c.walk;
  const ids = mazeIds(w);
  return {
    head: mazeName(w, c.head),
    path: c.pathEdges.filter((e) => !w.titleEdges?.has(e)).map((e) => ids.indexOf(e)),
    taps: mazeTaps(c),
    backtrack: c.backtrackDist,
    walked: c.walkedDist,
    pathLength: c.pathLength,
    moves: c.moveLog.join(""),
    junctions: [...c.visitedJunctions].map((v) => mazeName(w, v)).sort(),
    deadEnds: [...c.deadEndTips].map((v) => mazeName(w, v)).sort(),
    solved: c.solved,
  };
}

describe("K552 attempts across the title flag", () => {
  it("both walks share one fingerprint, and the title's forced walk reaches the seam", () => {
    const U = walkOf(false);
    const T = walkOf(true);
    expect(T.mazeStart).toBeDefined();
    expect(walkFingerprint(T)).toBe(walkFingerprint(U));
    expect(titlePrefix(U)).toEqual([]);
    const prefix = titlePrefix(T);
    expect(prefix.length).toBeGreaterThan(0);
    expect(prefix.every((e) => T.titleEdges!.has(e))).toBe(true);
    const c = new FabricMazeController(T);
    expect(c.replay(prefix)).toBe(true);
    expect(c.head).toBe(T.mazeStart);
    // Title taps are no moves: nothing is logged or metered, and no record.
    expect(c.moveLog).toEqual([]);
    expect(c.pathLength).toBe(0);
    expect(c.walkedDist).toBe(0);
    expect(attemptRecord(c, info(T))).toBeNull();
  });

  it("an untitled record is K47's: the taps and path as the controller holds them", () => {
    const U = walkOf(false);
    const c = new FabricMazeController(U);
    for (let i = 0; i < 4; i++) c.tapEdge(i === 2 ? detour(c) : best(c));
    const rec = attemptRecord(c, info(U))!;
    expect(rec.taps).toEqual(c.taps);
    expect(rec.path).toEqual(c.pathEdges);
    expect(rec.moves).toBe(c.moveLog.join(""));
  });

  it("titled, three taps into the maze, saved, restores with the flag off and back on", () => {
    const U = walkOf(false);
    const T = walkOf(true);
    const ct = new FabricMazeController(T);
    expect(ct.replay(titlePrefix(T))).toBe(true);
    // Into the maze, a wrong turn, and back out of it.
    expect(ct.tapEdge(best(ct))).toBe("advance");
    const wrong = detour(ct);
    expect(wrong).toBeGreaterThanOrEqual(0);
    expect(ct.tapEdge(wrong)).toBe("advance");
    expect(ct.tapEdge(wrong)).toBe("backtrack");
    expect(ct.moveLog.length).toBe(3);
    expect(ct.backtrackDist).toBeGreaterThan(0);

    const rec = attemptRecord(ct, info(T))!;
    expect(rec.taps.length).toBe(3);
    expect(rec.path.length).toBe(1);
    // Store round trip (localStorage's JSON).
    const s = new MemStorage();
    new DailyStore(s).saveAttempt(DAY, rec);
    const back = new DailyStore(s).attempt(DAY)!;
    expect(validAttempt(back)).toEqual(rec);
    expect(back).toEqual(rec);

    // The flag off: a rebuild, the untitled walk.
    const cu = new FabricMazeController(U);
    expect(restoreAttempt(cu, back, walkFingerprint(U))).toBe("ok");
    expect(state(cu)).toEqual(state(ct));
    expect(cu.taps).toEqual(rec.taps);
    expect(cu.pathEdges).toEqual(rec.path);
    // The clock: main.ts restores `elapsedMs`; saving again carries it
    // and gives back the same record.
    const rec2 = attemptRecord(cu, info(U, back.elapsedMs))!;
    expect(rec2).toEqual(rec);

    // The flag back on: the same again, title walk included.
    const ct2 = new FabricMazeController(T);
    expect(restoreAttempt(ct2, rec2, walkFingerprint(T))).toBe("ok");
    expect(state(ct2)).toEqual(state(ct));
    expect(ct2.taps).toEqual(ct.taps);
    expect(ct2.pathEdges).toEqual(ct.pathEdges);
    expect(ct2.head).toBe(ct.head);
  });

  it("one scripted solve gives identical stats, stars, result and share text titled and untitled", () => {
    const U = walkOf(false);
    const T = walkOf(true);
    // The script, in maze indices, played on the untitled walk: the best
    // route with one wrong turn (and back) at the first junction.
    const cu = new FabricMazeController(U);
    const script: number[] = [];
    const play = (eid: number): string => {
      script.push(eid);
      return cu.tapEdge(eid);
    };
    play(best(cu));
    const wrong = detour(cu);
    if (wrong >= 0) {
      play(wrong);
      play(wrong);
    }
    for (let guard = 0; guard < 10_000 && !cu.solved; guard++) {
      expect(play(best(cu))).not.toBe("reject");
    }
    expect(cu.solved).toBe(true);

    // The same maze runs on the titled walk, after its forced title walk.
    const ct = new FabricMazeController(T);
    expect(ct.replay(titlePrefix(T))).toBe(true);
    const ids = mazeIds(T);
    for (const k of script) ct.tapEdge(ids[k]);
    expect(ct.solved).toBe(true);
    expect(state(ct)).toEqual(state(cu));

    const result = (c: FabricMazeController): DailyResult => ({
      at: 1_790_000_100_000,
      day: DAY,
      timeMs: 61_234,
      path: c.pathLength,
      optimal: c.walk.optimalLength,
      efficiency: efficiencyOf(c.walk.optimalLength, c.pathLength)!,
      backtrack: c.backtrackDist,
      junctions: c.visitedJunctions.size,
      deadEnds: dailyParams(DAY).deadEndDensity > 0 ? c.deadEndTips.size : null,
      moves: c.moveLog.join(""),
      viz: "gold",
      def: 1,
    });
    const stars = (c: FabricMazeController) =>
      rateRun(walkedOf(c.pathLength, c.backtrackDist), c.walk.optimalLength);
    const share = (c: FabricMazeController): string =>
      shareText({
        daily: DAY,
        replay: false,
        timeMs: 61_234,
        efficiency: efficiencyOf(c.walk.optimalLength, c.pathLength),
        moves: c.moveLog.join(""),
        stars: stars(c)?.stars ?? null,
      });
    expect(T.optimalLength).toBe(U.optimalLength);
    expect(result(ct)).toEqual(result(cu));
    expect(stars(ct)).toEqual(stars(cu));
    expect(stars(cu)).not.toBeNull();
    expect(share(ct)).toBe(share(cu));
    // The share grid shows maze moves only (C2): one letter per maze tap.
    expect(cu.moveLog.length).toBe(script.length);
    expect(ct.moveLog.length).toBe(script.length);
    // The stored results agree too.
    const su = new MemStorage();
    const st = new MemStorage();
    new DailyStore(su).recordSolve(DAY, result(cu));
    new DailyStore(st).recordSolve(DAY, result(ct));
    expect([...st.map]).toEqual([...su.map]);
  });
});

// A hand-built walk: lengths 1, start S, exit Z, seam T.
function synthWalk(runs: Array<[string, string, "maze" | "title"]>): WalkGraph {
  const vertices = new Map<string, WalkVertex>();
  const edges: WalkEdge[] = [];
  const titleEdges = new Set<number>();
  const titleVertices = new Set<string>(["S", "T"]);
  runs.forEach(([va, vb, kind], id) => {
    edges.push({ id, va, vb, chain: id, ctrlA: 0, ctrlB: 2, length: 1 });
    for (const v of [va, vb]) {
      if (!vertices.has(v)) {
        vertices.set(v, { id: v, isEnd: false, chain: id, ctrl: 0, edges: [] });
      }
    }
    vertices.get(va)!.edges.push(id);
    if (vb !== va) vertices.get(vb)!.edges.push(id);
    if (kind === "title") {
      titleEdges.add(id);
      titleVertices.add(va);
      titleVertices.add(vb);
    }
  });
  for (const v of vertices.values()) v.isEnd = v.edges.length === 1;
  return {
    vertices,
    edges,
    start: "S",
    exit: "Z",
    optimalLength: walkDistances(vertices, edges, "T").get("Z")!,
    distToExit: walkDistances(vertices, edges, "Z"),
    mazeStart: "T",
    titleLength: walkDistances(vertices, edges, "S").get("T")!,
    titleVertices,
    titleEdges,
  };
}

describe("K552 the maze form's one limit: a walk around a title cycle", () => {
  // The maze: the entrance run T-V, a loop V-W-V (two runs) and V-Z.
  const maze: Array<[string, string, "maze"]> = [
    ["T", "V", "maze"],
    ["V", "W", "maze"],
    ["W", "V", "maze"],
    ["V", "Z", "maze"],
  ];

  it("a tree title restores any walk, excursions into the title included", () => {
    // Title S-X, X-Y (a spur), X-T: a tree.
    const w = synthWalk([...maze, ["S", "X", "title"], ["X", "Y", "title"], ["X", "T", "title"]]);
    const c = new FabricMazeController(w);
    // The title, the loop, back up the entrance run (an advance), a walk
    // into the title and its spur and back, down the entrance run again.
    for (const eid of [4, 6, 0, 1, 2, 0, 6, 5, 5, 6, 0]) {
      expect(c.tapEdge(eid)).not.toBe("reject");
    }
    expect(mazeFormExact(c)).toBe(true);
    const rec = attemptRecord(c, { ...info(w), day: 3 })!;
    expect(rec.maze).toBe(walkFingerprint(w));
    const fresh = new FabricMazeController(w);
    expect(restoreAttempt(fresh, rec, walkFingerprint(w))).toBe("ok");
    expect(state(fresh)).toEqual(state(c));
  });

  it("a walk around a title cycle is saved raw: exact on its own scene, refused elsewhere", () => {
    // Title S-X, X-Y, Y-X (a cycle), X-T.
    const w = synthWalk([
      ...maze,
      ["S", "X", "title"],
      ["X", "Y", "title"],
      ["Y", "X", "title"],
      ["X", "T", "title"],
    ]);
    const c = new FabricMazeController(w);
    const steps = [4, 7, 0, 1, 2, 0, 7, 5, 6, 7];
    for (const eid of steps) expect(c.tapEdge(eid)).toBe("advance");
    // Up to here the maze form holds the walk (a maze tap after the cycle
    // that is not the entrance run would too).
    expect(mazeFormExact(c)).toBe(true);
    // Back at the seam by a maze advance, around the title's cycle (all
    // advances), then the entrance run again: an advance here, a
    // backtrack in the title-free replay.
    expect(c.tapEdge(0)).toBe("advance");
    expect(mazeFormExact(c)).toBe(false);
    const rec = attemptRecord(c, { ...info(w), day: 3 })!;
    expect(rec.maze).toBe(rawFingerprint(w));
    expect(rec.maze).not.toBe(walkFingerprint(w));
    expect(rec.taps).toEqual([...steps, 0]);
    expect(mazeTaps(c)).toEqual(rec.taps);
    expect(validAttempt(JSON.parse(JSON.stringify(rec)))).toEqual(rec);
    // A reload of the same titled scene restores it exactly.
    const fresh = new FabricMazeController(w);
    expect(restoreAttempt(fresh, rec, walkFingerprint(w))).toBe("ok");
    expect(state(fresh)).toEqual(state(c));
    expect(fresh.pathEdges).toEqual(c.pathEdges);
    // Any other walk (the other form, another title) refuses it.
    const other = synthWalk([...maze, ["S", "X", "title"], ["X", "Y", "title"], ["X", "T", "title"]]);
    const elsewhere = new FabricMazeController(other);
    expect(restoreAttempt(elsewhere, rec, walkFingerprint(other))).toBe("maze");
    expect(elsewhere.taps).toEqual([]);
    expect(rawFingerprint(walkOf(false))).toBe("");
  });
});
