import { describe, expect, it } from "vitest";
import {
  edgeArm,
  legRoutes,
  pathLegs,
  pickRoutes,
  routeCorner,
  routeCubic,
  traveledRoutes,
} from "../../src/render/junction_routes";
import type {
  PaintRoute,
  RouteAnim,
  RouteEdge,
} from "../../src/render/junction_routes";

// A small walk: S -e0-> J1 -e1 (run B -> A)-> J2 -e2-> H, plus a self-loop
// e3 at J2 and two runs e4/e5 that bring the path back through J1.
const E: RouteEdge[] = [
  { va: "S", vb: "J1", chain: 0, ctrlA: 0, ctrlB: 10, length: 5 },
  { va: "J2", vb: "J1", chain: 1, ctrlA: 20, ctrlB: 30, length: 4 },
  { va: "J2", vb: "H", chain: 2, ctrlA: 3, ctrlB: 9, length: 3 },
  { va: "J2", vb: "J2", chain: 3, ctrlA: 40, ctrlB: 50, length: 6 },
  { va: "J2", vb: "J1", chain: 4, ctrlA: 0, ctrlB: 8, length: 2 },
  { va: "J1", vb: "X", chain: 5, ctrlA: 12, ctrlB: 2, length: 7 },
];

const route = (
  chain: number,
  ctrl: number,
  dir: 1 | -1,
  out?: [number, number, 1 | -1]
): PaintRoute =>
  out
    ? { chain, ctrl, dir, outChain: out[0], outCtrl: out[1], outDir: out[2] }
    : { chain, ctrl, dir };

describe("edgeArm", () => {
  it("leaves the A end toward increasing ctrl, the B end toward decreasing", () => {
    expect(edgeArm(E[0], true)).toEqual({ chain: 0, ctrl: 0, dir: 1 });
    expect(edgeArm(E[0], false)).toEqual({ chain: 0, ctrl: 10, dir: -1 });
  });
});

describe("pathLegs", () => {
  it("directs every run from the vertex the path left", () => {
    const legs = pathLegs(E, ["S", "J1", "J2", "H"], [0, 1, 2], null);
    expect(legs.map((l) => [l.e.chain, l.fromA, l.len])).toEqual([
      [0, true, 5],
      [1, false, 4],
      [2, true, 3],
    ]);
  });

  it("runs a self-loop A -> B", () => {
    const legs = pathLegs(E, ["S", "J1", "J2", "J2"], [0, 1, 3], null);
    expect(legs[2].fromA).toBe(true);
  });

  it("counts only the swept part of an advance in flight", () => {
    // The controller already pushed e2; the dot is a third of the way.
    const anim: RouteAnim = { e: E[2], from: 3, to: 9, cur: 5, kind: "advance" };
    const legs = pathLegs(E, ["S", "J1", "J2", "H"], [0, 1, 2], anim);
    expect(legs.length).toBe(3);
    expect(legs[2].len).toBeCloseTo(1, 12);
    expect(legs[2].fromA).toBe(true);
  });

  it("appends a backtrack's remnant, departing the new head", () => {
    // The controller already popped e2; the dot retreats H -> J2.
    const anim: RouteAnim = { e: E[2], from: 9, to: 3, cur: 7, kind: "backtrack" };
    const legs = pathLegs(E, ["S", "J1", "J2"], [0, 1], anim);
    expect(legs.length).toBe(3);
    expect(legs[2].e).toBe(E[2]);
    expect(legs[2].fromA).toBe(true);
    expect(legs[2].len).toBeCloseTo(2, 12);
  });

  it("gives a zero-length move no length", () => {
    const anim: RouteAnim = { e: E[2], from: 3, to: 3, cur: 3, kind: "advance" };
    const legs = pathLegs(E, ["S", "J1", "J2", "H"], [0, 1, 2], anim);
    expect(legs[2].len).toBe(0);
  });
});

describe("legRoutes", () => {
  it("is empty for an empty path", () => {
    expect(legRoutes(pathLegs(E, ["S"], [], null))).toEqual([]);
  });

  it("joins each vertex's arrival arm to its departure arm", () => {
    const routes = legRoutes(pathLegs(E, ["S", "J1", "J2", "H"], [0, 1, 2], null));
    expect(routes).toEqual([
      route(0, 0, 1), // The start: its departure arm only (a free tip).
      route(0, 10, -1, [1, 30, -1]), // J1: in on e0's B end, out e1's B end.
      route(1, 20, 1, [2, 3, 1]), // J2: in on e1's A end, out e2's A end.
      route(2, 9, -1), // The head: its arrival arm only.
    ]);
  });

  it("routes both ends of an advance in flight", () => {
    const anim: RouteAnim = { e: E[2], from: 3, to: 9, cur: 5, kind: "advance" };
    const routes = legRoutes(pathLegs(E, ["S", "J1", "J2", "H"], [0, 1, 2], anim));
    expect(routes[2]).toEqual(route(1, 20, 1, [2, 3, 1]));
    expect(routes[3]).toEqual(route(2, 9, -1));
  });

  it("routes the new head through the remnant while a backtrack retracts", () => {
    const anim: RouteAnim = { e: E[2], from: 9, to: 3, cur: 7, kind: "backtrack" };
    const routes = legRoutes(pathLegs(E, ["S", "J1", "J2"], [0, 1], anim));
    expect(routes.length).toBe(4);
    expect(routes[2]).toEqual(route(1, 20, 1, [2, 3, 1]));
    expect(routes[3]).toEqual(route(2, 9, -1)); // The old head, one arm.
    // Once it lands, the new head keeps one arm and the old head none.
    const after = legRoutes(pathLegs(E, ["S", "J1", "J2"], [0, 1], null));
    expect(after[after.length - 1]).toEqual(route(1, 20, 1));
    expect(after.length).toBe(3);
  });

  it("gives a self-loop's joint one route per end", () => {
    const routes = legRoutes(pathLegs(E, ["S", "J1", "J2", "J2"], [0, 1, 3], null));
    expect(routes[2]).toEqual(route(1, 20, 1, [3, 40, 1]));
    expect(routes[3]).toEqual(route(3, 50, -1));
  });

  it("gives a joint the path passes twice two routes, in path order", () => {
    // S -e0-> J1 -e1-> J2 -e4-> J1 -e5-> X: J1 twice, over different arms.
    const routes = legRoutes(
      pathLegs(E, ["S", "J1", "J2", "J1", "X"], [0, 1, 4, 5], null)
    );
    expect(routes[1]).toEqual(route(0, 10, -1, [1, 30, -1]));
    expect(routes[3]).toEqual(route(4, 8, -1, [5, 12, 1]));
  });

  it("filters by the distance behind the visual head (trail mode)", () => {
    const seen: number[] = [];
    const legs = pathLegs(E, ["S", "J1", "J2", "H"], [0, 1, 2], null);
    legRoutes(legs, (dv) => {
      seen.push(dv);
      return true;
    });
    expect(seen).toEqual([12, 7, 3, 0]);
    const kept = legRoutes(legs, (dv) => dv < 8);
    expect(kept.map((r) => r.chain)).toEqual([0, 1, 2]);
    expect(kept[0]).toEqual(route(0, 10, -1, [1, 30, -1]));
  });
});

describe("traveledRoutes (K127)", () => {
  // Every arm a list of routes arrives or leaves by, as "chain:ctrl:dir".
  const arms = (rs: PaintRoute[]): string[] =>
    rs
      .flatMap((r) => [
        `${r.chain}:${r.ctrl}:${r.dir}`,
        ...(r.outChain !== undefined ? [`${r.outChain}:${r.outCtrl}:${r.outDir}`] : []),
      ])
      .sort();

  it("is every route of the path at rest, the head's arrival arm included", () => {
    const legs = pathLegs(E, ["S", "J1", "J2", "H"], [0, 1, 2], null);
    expect(traveledRoutes(legs, false)).toEqual(legRoutes(legs));
  });

  it("ignores the trail: a pass the trail no longer paints still counts", () => {
    const legs = pathLegs(E, ["S", "J1", "J2", "J1", "X"], [0, 1, 4, 5], null);
    const trail = legRoutes(legs, (dv) => dv < 8); // J1's first pass is gone.
    expect(arms(trail)).not.toContain("1:30:-1");
    // J1's arms in this walk: e0's and e1's B ends (the first pass), e4's B
    // end and e5's A end (the second) - both passes count.
    const t = arms(traveledRoutes(legs, false));
    for (const a of ["0:10:-1", "1:30:-1", "4:8:-1", "5:12:1"]) {
      expect(t).toContain(a);
    }
  });

  it("counts an advance's arriving arm only on arrival", () => {
    const anim: RouteAnim = { e: E[2], from: 3, to: 9, cur: 5, kind: "advance" };
    const flying = traveledRoutes(pathLegs(E, ["S", "J1", "J2", "H"], [0, 1, 2], anim), true);
    // The departure arm at J2 counts at the tap; H's arm does not yet.
    expect(arms(flying)).toContain("2:3:1");
    expect(arms(flying)).not.toContain("2:9:-1");
    const landed = traveledRoutes(pathLegs(E, ["S", "J1", "J2", "H"], [0, 1, 2], null), false);
    expect(arms(landed)).toContain("2:9:-1");
  });

  it("stops counting a backtracked arm at the tap, its near end on landing", () => {
    const anim: RouteAnim = { e: E[2], from: 9, to: 3, cur: 7, kind: "backtrack" };
    const flying = traveledRoutes(pathLegs(E, ["S", "J1", "J2"], [0, 1], anim), true);
    // H (the old head) drops at once; J2 keeps the remnant's arm meanwhile.
    expect(arms(flying)).not.toContain("2:9:-1");
    expect(arms(flying)).toContain("2:3:1");
    const landed = traveledRoutes(pathLegs(E, ["S", "J1", "J2"], [0, 1], null), false);
    expect(arms(landed)).not.toContain("2:3:1");
  });

  it("drops nothing at rest and never fails on an empty path", () => {
    expect(traveledRoutes(pathLegs(E, ["S"], [], null), false)).toEqual([]);
  });
});

describe("pickRoutes", () => {
  it("keeps a repeated pass once, at its newest, oldest first", () => {
    expect(pickRoutes(["a", "b", "a", "c"], (r) => r, 4)).toEqual(["b", "a", "c"]);
  });

  it("keeps only the newest max", () => {
    expect(pickRoutes(["a", "b", "c", "d", "e"], (r) => r, 4)).toEqual([
      "b",
      "c",
      "d",
      "e",
    ]);
    expect(pickRoutes(["a", "b", "a", "c"], (r) => r, 2)).toEqual(["a", "c"]);
  });

  it("treats a pair of arms in either order as one pass", () => {
    const key = (r: { a: string; b: string }): string => [r.a, r.b].sort().join("|");
    const out = pickRoutes(
      [
        { a: "x", b: "y" },
        { a: "y", b: "x" },
      ],
      key,
      4
    );
    expect(out).toEqual([{ a: "y", b: "x" }]);
  });
});

describe("routeCorner", () => {
  const fh = 0.3;
  const big = 10;
  // How far the turn's circle passes from the joint center.
  const clearance = (alpha: number, d: number): number =>
    (d * (1 - Math.sin(alpha / 2))) / Math.cos(alpha / 2);

  it("joins the centerlines through the joint on a straight route", () => {
    const { d, m } = routeCorner(Math.PI, 1, fh, big, big);
    expect(d).toBe(0);
    expect(m).toBeCloseTo(0.5 * fh, 12);
  });

  it("turns a right angle at the web reach, within 0.9 fh of the center", () => {
    const { d, m } = routeCorner(Math.PI / 2, 0.5, fh, big, big);
    expect(d).toBeCloseTo(0.5, 12);
    expect(m).toBeCloseTo(0.5, 12);
    const tight = routeCorner(Math.PI / 2, 1, fh, big, big);
    expect(clearance(Math.PI / 2, tight.d)).toBeCloseTo(0.9 * fh, 9);
  });

  it("widens the turn with the turn angle", () => {
    let last = -1;
    for (let k = 0; k <= 16; k++) {
      const alpha = Math.PI - (k / 16) * (Math.PI / 2);
      const { d } = routeCorner(alpha, 0.5, fh, big, big);
      expect(d).toBeGreaterThanOrEqual(last - 1e-12);
      expect(clearance(alpha, d)).toBeLessThanOrEqual(0.9 * fh + 1e-9);
      last = d;
    }
  });

  it("caps a U-turn at 0.9 fh", () => {
    const { d } = routeCorner(0, 1, fh, big, big);
    expect(d).toBeCloseTo(0.9 * fh, 12);
  });

  it("stays half a thread inside the cover caps", () => {
    expect(routeCorner(Math.PI / 2, 1, fh, 0.4, big).d).toBeCloseTo(0.25, 12);
    expect(routeCorner(Math.PI / 2, 1, fh, big, 0.35).d).toBeCloseTo(0.2, 12);
    const none = routeCorner(Math.PI / 2, 1, fh, 0.1, big);
    expect(none.d).toBe(0);
    expect(none.m).toBeCloseTo(0.5 * fh, 12);
  });

  it("never blends materials over less than half a thread", () => {
    for (const alpha of [0, 0.3, 1, Math.PI / 2, 2.5, Math.PI]) {
      for (const reach of [0, 0.1, 0.5, 2]) {
        const { d, m } = routeCorner(alpha, reach, fh, 0.6, big);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(m).toBeGreaterThanOrEqual(0.5 * fh - 1e-12);
        expect(m).toBeGreaterThanOrEqual(d);
      }
    }
  });
});

describe("routeCubic", () => {
  it("runs from pa to pb with tau -d..+d", () => {
    const out: number[] = [];
    routeCubic(0.5, 0, 1, 0, 0, 0.5, 0, 1, 0.5, 14, out);
    expect(out.length).toBe(3 * 15);
    expect(out[0]).toBeCloseTo(0.5, 12);
    expect(out[1]).toBeCloseTo(0, 12);
    expect(out[2]).toBeCloseTo(-0.5, 12);
    expect(out[42]).toBeCloseTo(0, 12);
    expect(out[43]).toBeCloseTo(0.5, 12);
    expect(out[44]).toBeCloseTo(0.5, 12);
    for (let i = 0; i <= 14; i++) {
      expect(out[3 * i + 2]).toBeCloseTo(-0.5 + i / 14, 12);
    }
  });

  it("leaves along A inward and arrives along B outward", () => {
    // Arm A points along +x, arm B along +y (outward from the joint).
    const out: number[] = [];
    const steps = 400;
    routeCubic(0.5, 0, 1, 0, 0, 0.5, 0, 1, 0.5, steps, out);
    const ax = out[3] - out[0];
    const ay = out[4] - out[1];
    const n0 = Math.hypot(ax, ay);
    expect(ax / n0).toBeCloseTo(-1, 4);
    expect(ay / n0).toBeCloseTo(0, 2);
    const k = 3 * steps;
    const bx = out[k] - out[k - 3];
    const by = out[k + 1] - out[k - 2];
    const n1 = Math.hypot(bx, by);
    expect(bx / n1).toBeCloseTo(0, 2);
    expect(by / n1).toBeCloseTo(1, 4);
  });

  it("approximates the circle tangent to both arms", () => {
    // Tangent to the x axis at (d, 0) and the y axis at (0, d): center
    // (d, d), radius d. The standard cubic handle is within 3e-4 R.
    const d = 0.5;
    const out: number[] = [];
    routeCubic(d, 0, 1, 0, 0, d, 0, 1, d, 32, out);
    for (let i = 0; i < out.length; i += 3) {
      const r = Math.hypot(out[i] - d, out[i + 1] - d);
      expect(Math.abs(r - d)).toBeLessThan(3e-4 * d);
    }
  });

  it("is the straight centerline, evenly spaced, when the arms are opposite", () => {
    const d = 0.4;
    const out: number[] = [];
    routeCubic(d, 0, 1, 0, -d, 0, -1, 0, d, 8, out);
    for (let i = 0; i <= 8; i++) {
      expect(out[3 * i]).toBeCloseTo(d - (2 * d * i) / 8, 12);
      expect(out[3 * i + 1]).toBeCloseTo(0, 12);
      // tau is the arc along the band: here exactly -x.
      expect(out[3 * i + 2]).toBeCloseTo(-out[3 * i], 12);
    }
  });

  it("collapses to the joint center when d is 0", () => {
    const out: number[] = [];
    routeCubic(0, 0, 1, 0, 0, 0, -1, 0, 0, 1, out);
    expect(out.length).toBe(6);
    for (const v of out) expect(v).toBeCloseTo(0, 12);
  });
});
