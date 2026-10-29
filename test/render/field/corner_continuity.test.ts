// K992: the corner rules are continuous in the geometry
// (docs/design/K992_corner_rules.md, the coordinator's call 1). Two sweeps
// move one arm in small steps through events that used to pop:
//  (A) a corner swept through the cap: t90's END cut back from 6h to 1h,
//      through its round corner;
//  (B) an arm swept through a graze: acute30's END rises at 30° to a height
//      H over the through and then runs parallel to it, H from 2.3h to 3.3h,
//      across 2(h + r), below which the strip between them is narrower than
//      the ball (master's solve jumped to another root there, about 900
//      times the step).
//  (C) the tangent feet through a second contact: (B)'s sweep with the
//      END's far part rising at 10° instead of parallel. Below about 2(h + r)
//      the ball stops where it touches the END twice (its rising part and
//      its far part) and the through once, and the branch past that point
//      is steep, not folded. c17f's feet were a fresh nearest point from q
//      there and jumped between the two contacts (K992 stage 3, F1 and F2).
// At every step the corner stays live, and V, q and r (and in (C) the
// tangent feet) move no more than three times the sweep's step.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type Corner, FieldModel, type OracleParams, cornerRadius } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";

const scene = (name: string) => JSON.parse(readFileSync(join(__dirname, "scenes", `${name}.json`), "utf8")) as FieldScene;
const params = (h: number): OracleParams => ({
  rRound: 0,
  rOf: (_j, _i, theta, style) => (style === "round" ? cornerRadius(3, h, theta) : 0),
  crMax: 3,
  spans: "k883",
});
const live = (c: Corner): boolean => c.ok && !c.noV && c.resV < 1e-9;

/** Chain ci cut at arc length L (the last point interpolated), its dead end moved there. */
function truncated(s0: FieldScene, ci: number, L: number): FieldScene {
  const s = JSON.parse(JSON.stringify(s0)) as FieldScene;
  const p = s.chains[ci].pts;
  const out = [p[0], p[1]];
  let acc = 0;
  for (let k = 2; k < p.length; k += 2) {
    const seg = Math.hypot(p[k] - p[k - 2], p[k + 1] - p[k - 1]);
    if (acc + seg >= L) {
      const u = (L - acc) / seg;
      out.push(p[k - 2] + u * (p[k] - p[k - 2]), p[k - 1] + u * (p[k + 1] - p[k - 1]));
      acc = L;
      break;
    }
    out.push(p[k], p[k + 1]);
    acc += seg;
  }
  s.chains[ci].pts = out;
  s.chains[ci].z = new Array(out.length / 2).fill(0);
  s.deadEnds = s.deadEnds.filter((d) => d.chain !== ci).concat([{ chain: ci, s: acc, offscreen: true }]);
  return s;
}

/** acute30 with its END rising at 30° to H off the through, then parallel or rising at `rise` (fixed point counts). */
function grazing(H: number, rise = 0): FieldScene {
  const s = scene("acute30");
  const h = s.look.halfWidth;
  const a = 30 * (Math.PI / 180);
  const x0 = 0.1 * h * Math.cos(a);
  const y0 = 0.1 * h * Math.sin(a);
  const run = (H - y0) / Math.tan(a);
  const pts: number[] = [];
  const n1 = 60;
  for (let i = 0; i <= n1; i++) pts.push(x0 + (run * i) / n1, y0 + ((H - y0) * i) / n1);
  const n2 = 90;
  for (let i = 1; i <= n2; i++) pts.push(x0 + run + (18 * h * i) / n2, H + ((18 * h * i) / n2) * Math.tan(rise));
  s.chains[1].pts = pts;
  s.chains[1].z = new Array(pts.length / 2).fill(0);
  let len = 0;
  for (let i = 2; i < pts.length; i += 2) len += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
  s.deadEnds = s.deadEnds.filter((d) => d.chain !== 1).concat([{ chain: 1, s: len, offscreen: true }]);
  return s;
}

/** Junction 0's corner `index` at every step of the sweep from `from` to `to`, and each step's motion. */
function sweep(make: (u: number) => FieldScene, from: number, to: number, n: number, index: number) {
  const step = Math.abs(to - from) / n;
  const out = { step, h: 1, dead: [] as number[], worst: { dV: 0, dq: 0, dr: 0, dfA: 0, dfB: 0, at: { dV: -1, dq: -1, dr: -1, dfA: -1, dfB: -1 } }, rounds: 0 };
  let prev: Corner | null = null;
  for (let i = 0; i <= n; i++) {
    const sc = make(from + ((to - from) * i) / n);
    out.h = sc.look.halfWidth;
    const c = new FieldModel(sc, params(out.h)).corners.find((x) => x.junction === 0 && x.index === index);
    if (!c || !live(c)) {
      out.dead.push(i);
      prev = null;
      continue;
    }
    if (c.r > 0) out.rounds++;
    if (prev) {
      const d = {
        dV: Math.hypot(c.V[0] - prev.V[0], c.V[1] - prev.V[1]),
        dq: Math.hypot(c.q[0] - prev.q[0], c.q[1] - prev.q[1]),
        dr: Math.abs(c.r - prev.r),
        // The tangent feet, arc length along each arm (both round).
        dfA: c.r > 0 && prev.r > 0 ? Math.abs(c.sTA - prev.sTA) : 0,
        dfB: c.r > 0 && prev.r > 0 ? Math.abs(c.sTB - prev.sTB) : 0,
      };
      for (const k of ["dV", "dq", "dr", "dfA", "dfB"] as const)
        if (d[k] > out.worst[k]) {
          out.worst[k] = d[k];
          out.worst.at[k] = i;
        }
    }
    prev = { ...c } as Corner;
  }
  return out;
}

type Motion = "dV" | "dq" | "dr" | "dfA" | "dfB";
function expectContinuous(r: ReturnType<typeof sweep>, what: string, keys: Motion[] = ["dV", "dq", "dr"]): void {
  expect(r.dead, `${what}: steps with no live corner`).toEqual([]);
  const bound = 3 * r.step + 1e-6 * r.h;
  for (const k of keys)
    expect(r.worst[k], `${what}: the largest ${k} (step ${r.worst.at[k]}), ${(r.worst[k] / r.step).toFixed(2)} sweep steps`).toBeLessThanOrEqual(bound);
}

describe("K992: corners are continuous in the geometry", () => {
  it("(A) a corner swept through the cap: t90's END cut from 6h to 1h", { timeout: 60_000 }, () => {
    const t90 = scene("t90");
    const r = sweep((L) => truncated(t90, 1, L), 6, 1, 100, 0);
    expectContinuous(r, "t90");
    // The sweep passes the cap: the corner is round at the start and fitted
    // smaller, down to sharp, as the END reaches the root.
    expect(r.rounds).toBeGreaterThan(0);
    expect(r.rounds).toBeLessThan(101);
  });

  it("(B) an arm swept through a graze: acute30's END parallel at H, 2.3h to 3.3h", { timeout: 60_000 }, () => {
    const r = sweep((H) => grazing(H), 2.3, 3.3, 100, 0);
    expectContinuous(r, "acute30 graze");
    expect(r.rounds).toBe(101);
  });

  it("(C) the tangent feet through a second contact: the END's far part rising at 10°", { timeout: 60_000 }, () => {
    const r = sweep((H) => grazing(H, (10 * Math.PI) / 180), 2.3, 3.3, 100, 0);
    expectContinuous(r, "acute30 graze feet", ["dV", "dq", "dr", "dfA", "dfB"]);
  });
});
