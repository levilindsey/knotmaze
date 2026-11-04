import { describe, it, expect, vi, afterEach } from "vitest";
import { InThreadHost, LOAD_WALL_CAP_MS } from "../../src/physics/physics_host";
import { fabricScene, fabricGraph } from "./fabric_scene";

// K1154: the physics-off load's wall cap and reported loadMs count
// visible time (VisibleClock), like the pre-settle and the budget
// already do. A tab hidden mid-load runs no frames, so the hour it
// was hidden must neither end the load by its last-resort cap nor
// appear in loadMs. performance.now is stubbed: a few ms a call,
// with one jump of an hour between beginLoad and the first loadFrame
// (the hidden tab). In the manner of physics_host.test.ts's load case
// (?7&gs=6, loop loadFrame until it is not running, then endLoad).

vi.setConfig({ testTimeout: 120_000 });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("K1154 physics-off load clock", () => {
  it("counts visible time: a hidden hour mid-load ends nothing", () => {
    const { params, tuning } = fabricScene("?7&gs=6");
    const graph = fabricGraph(params);

    let now = 10_000;
    vi.spyOn(performance, "now").mockImplementation(() => {
      const v = now;
      now += 2;
      return v;
    });

    const host = new InThreadHost();
    host.build(graph, params);
    host.beginLoad();
    // The hidden hour: no loadFrame runs while the tab is hidden.
    now += 3_600_000;
    const first = host.loadFrame({ ...tuning });
    // Before the fix this read "done" (the raw wall cap tripped on
    // the first frame back, with the sim barely begun) and loadMs
    // held the hour.
    expect(first).toBe("running");
    expect(host.view!.simTime).toBeLessThan(1);

    let st = first;
    for (let k = 0; k < 5000 && st === "running"; k++) {
      st = host.loadFrame({ ...tuning });
    }
    host.endLoad();
    expect(st).toBe("done");
    const loadMs = host.stats().loadMs;
    expect(loadMs).toBeLessThan(3_600_000);
    expect(loadMs).toBeLessThan(LOAD_WALL_CAP_MS);
    expect(loadMs).toBeGreaterThan(0);
  });
});
