import { describe, it, expect } from "vitest";
import { MazeController } from "../../src/game/maze_controller";
import type { MazeGraph } from "../../src/core/types";

// A maze thread of 10 nodes (chainLen 20), start->exit spanning 5 node-steps.
function thread(): MazeGraph {
  return { strand: 0, chainLen: 20, ctrlStart: 0, steps: 5 };
}

describe("maze controller", () => {
  it("advances along the thread (and fills in a forward jump)", () => {
    const c = new MazeController(thread());
    expect(c.head).toBe(0);
    expect(c.tapNode(1)).toBe("advance");
    expect(c.head).toBe(1);
    expect(c.tapNode(3)).toBe("advance");
    expect(c.head).toBe(3);
  });

  it("backtracks when tapping behind the head", () => {
    const c = new MazeController(thread());
    c.tapNode(4);
    expect(c.tapNode(2)).toBe("backtrack");
    expect(c.head).toBe(2);
  });

  it("wins on reaching the exit node and then ignores taps", () => {
    const c = new MazeController(thread());
    expect(c.tapNode(5)).toBe("win");
    expect(c.solved).toBe(true);
    expect(c.total).toBe(5);
    expect(c.tapNode(2)).toBe("noop");
  });

  it("noops on tapping the current head", () => {
    const c = new MazeController(thread());
    c.tapNode(2);
    expect(c.tapNode(2)).toBe("noop");
    expect(c.head).toBe(2);
  });

  it("rejects out-of-range nodes", () => {
    const c = new MazeController(thread());
    expect(c.tapNode(-1)).toBe("reject");
    expect(c.tapNode(6)).toBe("reject");
    expect(c.head).toBe(0);
  });

  it("resets to the start, unsolved", () => {
    const c = new MazeController(thread());
    c.tapNode(3);
    c.reset();
    expect(c.head).toBe(0);
    expect(c.solved).toBe(false);
  });
});
