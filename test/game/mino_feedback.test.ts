import { describe, it, expect } from "vitest";
import {
  CATCH_BURST_R1,
  CATCH_BURST_S,
  MINO_FOG_BLEED_ALPHA,
  TELEGRAPH_ALPHA_HUNT,
  TELEGRAPH_ALPHA_ROAM,
  catchBurstAt,
  catchNotes,
  footstepStrength,
  telegraphAlphas,
  turnCue,
} from "../../src/game/mino_feedback";
import { TurnMinotaur, turnConfig } from "../../src/game/minotaur_turns";
import type { TurnMinoParams } from "../../src/game/minotaur_turns";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";

// K80 turns stage 3b: the telegraph's brightness split, the catch burst's
// clock, the sound cues, and the recorded catch site (sections 2.7, 2.8,
// 2.10 of docs/design/K80_gameplay_additions.md).

describe("telegraphAlphas (2.7)", () => {
  it("is faint roaming, bright hunting, second run at half", () => {
    expect(telegraphAlphas(false, 1)).toEqual([TELEGRAPH_ALPHA_ROAM]);
    expect(telegraphAlphas(true, 2)).toEqual([
      TELEGRAPH_ALPHA_HUNT,
      TELEGRAPH_ALPHA_HUNT * 0.5,
    ]);
    expect(telegraphAlphas(false, 2)).toEqual([
      TELEGRAPH_ALPHA_ROAM,
      TELEGRAPH_ALPHA_ROAM * 0.5,
    ]);
    expect(telegraphAlphas(true, 0)).toEqual([]);
  });
});

describe("catchBurstAt (2.8)", () => {
  it("expands and fades over CATCH_BURST_S, then is done", () => {
    const f0 = catchBurstAt(0, false);
    expect(f0.done).toBe(false);
    expect(f0.alpha).toBeGreaterThan(0.8);
    const mid = catchBurstAt(CATCH_BURST_S / 2, false);
    expect(mid.radius).toBeGreaterThan(f0.radius);
    expect(mid.alpha).toBeLessThan(f0.alpha);
    expect(catchBurstAt(CATCH_BURST_S, false)).toEqual({
      radius: CATCH_BURST_R1,
      alpha: 0,
      done: true,
    });
    expect(catchBurstAt(-1, false).alpha).toBe(0);
  });

  it("is a static fading ring under reduced motion", () => {
    const f = catchBurstAt(CATCH_BURST_S / 2, true);
    expect(f.done).toBe(false);
    expect(f.radius).toBe(catchBurstAt(0, true).radius);
    expect(f.alpha).toBeGreaterThan(0);
    expect(f.alpha).toBeLessThan(catchBurstAt(0, true).alpha);
  });
});

describe("sound cues (2.10)", () => {
  it("growls only on the turn it first sees you", () => {
    expect(turnCue(false, true, 5, 1)).toBe("growl");
    expect(turnCue(true, true, 5, 1)).toBe("footstep");
  });

  it("heartbeats within two runs while hunting", () => {
    expect(turnCue(true, true, 2, 1)).toBe("heartbeat");
    expect(turnCue(true, true, 1, 0)).toBe("heartbeat");
    expect(turnCue(true, true, 3, 1)).toBe("footstep");
  });

  it("footsteps only when it walked, fading with distance", () => {
    expect(turnCue(false, false, 3, 1)).toBe("footstep");
    expect(turnCue(false, false, 3, 0)).toBeNull();
    expect(footstepStrength(0)).toBeGreaterThan(footstepStrength(3));
    expect(footstepStrength(3)).toBeGreaterThan(0);
    expect(footstepStrength(6)).toBe(0);
    expect(footstepStrength(Infinity)).toBe(0);
  });

  it("catch notes are an octave down plus a semitone neighbor", () => {
    const [lo, nb] = catchNotes(220);
    expect(lo).toBe(110);
    expect(nb / lo).toBeCloseTo(Math.pow(2, 1 / 12), 10);
    expect(catchNotes(40)[0]).toBe(30); // floored
  });

  it("the fog bleed is faint", () => {
    expect(MINO_FOG_BLEED_ALPHA).toBeGreaterThan(0);
    expect(MINO_FOG_BLEED_ALPHA).toBeLessThan(0.3);
  });
});

// The recorded catch site: a tiny graph S-0-A-1-B-2-C-3-X where a stalker
// at speed two can be walked into.
function graph(runs: [string, string, number][], start: string, exit: string): WalkGraph {
  const vertices = new Map<string, WalkVertex>();
  const edges: WalkEdge[] = [];
  runs.forEach(([va, vb, length], id) => {
    edges.push({ id, va, vb, chain: id, ctrlA: 0, ctrlB: length, length });
    for (const v of [va, vb]) {
      if (!vertices.has(v)) {
        vertices.set(v, { id: v, isEnd: false, chain: id, ctrl: 0, edges: [] });
      }
      vertices.get(v)!.edges.push(id);
    }
  });
  for (const v of vertices.values()) {
    v.isEnd = v.edges.length === 1;
  }
  return { vertices, edges, start, exit, optimalLength: 0, distToExit: new Map() };
}

describe("TurnMinotaur.lastCatch (2.8)", () => {
  it("records the player's and the minotaur's vertices on a catch", () => {
    const g = graph(
      [
        ["S", "A", 5],
        ["A", "B", 5],
        ["B", "C", 5],
        ["C", "X", 5],
      ],
      "S",
      "X"
    );
    const params: TurnMinoParams = {
      model: "stalker",
      speed: "two",
      telegraph: true,
      sight: 4,
      giveUp: 3,
      roam: 8,
      roamMin: 3,
      territory: 6,
      accuracy: 1,
      pause: 0,
      sleep: 0,
      pull: 0,
      lair: true,
    };
    const tm = new TurnMinotaur(g, turnConfig(params), 7);
    expect(tm.lastCatch).toBeNull();
    // Walk toward the exit; the stalker charges down the chain. A catch
    // must land within a few turns on this graph.
    let caught = false;
    for (let i = 0; i < 12 && !caught; i++) {
      const at = tm.player;
      const adj = tm.tg.chase.adj[at];
      // Step toward C (away from S) along the chain when possible.
      const fwd = adj.find((e) => {
        const o = tm.tg.other(e, at);
        return o !== tm.tg.start && o !== at;
      });
      const r = tm.turn(fwd ?? adj[0]);
      if (r === "caught") caught = true;
      if (r === "win") break;
    }
    expect(caught).toBe(true);
    expect(tm.catches).toBe(1);
    expect(tm.lastCatch).not.toBeNull();
    expect(tm.lastCatch!.player).toBeGreaterThanOrEqual(0);
    expect(tm.lastCatch!.mino).toBeGreaterThanOrEqual(0);
    // After the catch the player is back at the entrance.
    expect(tm.player).toBe(tm.tg.start);
  });
});
