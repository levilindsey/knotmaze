// K883: no group holds both passes of a crossing (§3.4), the round corner
// fitted inside its arms' spans, and the corner slider's mapping (§3.8).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { borderCensus, check15, check16, checkContext, oracleProbe } from "../../../src/render/field/checks";
import { dS, normS, pointAt } from "../../../src/render/field/geom";
import { FieldModel, type OracleParams, cornerRadius, cornerRadiusMax } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";

const scene = (name: string) => JSON.parse(readFileSync(join(__dirname, "scenes", `${name}.json`), "utf8")) as FieldScene;
const D2R = Math.PI / 180;

const mapped = (h: number, cr: number, spans: "k883" | "s2" = "k883"): OracleParams => ({
  rRound: 0,
  rOf: (_j, _i, theta, style) => (style === "round" ? cornerRadius(cr, h, theta) : 0),
  crMax: cr,
  spans,
});

describe("the corner slider's mapping", () => {
  it("cr 0 is sharp, cr 3 is the approved corner, cr 6 is twice as round", () => {
    const h = 0.4;
    for (const deg of [10, 18.4, 30, 60, 90, 106, 120, 170]) {
      const th = deg * D2R;
      const approved = Math.min(2 * h, 1.5 * h * Math.tan(th / 2));
      expect(cornerRadius(0, h, th)).toBe(0);
      expect(cornerRadius(3, h, th)).toBeCloseTo(approved, 12);
      expect(cornerRadius(6, h, th)).toBeCloseTo(2 * approved, 12);
      for (const cr of [0, 3, 6]) expect(cornerRadius(cr, h, th)).toBeLessThanOrEqual(cornerRadiusMax(cr, h) + 1e-12);
    }
    // The 2h cap takes over where 1.5·tan(θ/2) = 2, at θ ≈ 106.26°.
    expect(cornerRadius(3, h, 90 * D2R)).toBeCloseTo(1.5 * h, 12);
    expect(cornerRadius(3, h, 120 * D2R)).toBeCloseTo(2 * h, 12);
    expect(cornerRadiusMax(0, h)).toBe(0);
    expect(cornerRadiusMax(3, h)).toBeCloseTo(2 * h, 12);
    expect(cornerRadiusMax(6, h)).toBeCloseTo(4 * h, 12);
  });

  it("the oracle builds t90 and y120's corners at the mapped radius", () => {
    for (const name of ["t90", "y120"]) {
      const s = scene(name);
      const h = s.look.halfWidth;
      for (const cr of [0, 3, 6]) {
        const m = new FieldModel(s, mapped(h, cr));
        expect(m.diagnostics, `${name} cr ${cr}`).toEqual([]);
        for (const c of m.corners) {
          expect(c.ok, `${name} cr ${cr} corner ${c.index}`).toBe(true);
          const want = c.style === "round" ? cornerRadius(cr, h, c.theta) : 0;
          expect(c.r / h, `${name} cr ${cr} corner ${c.index}`).toBeCloseTo(want / h, 9);
          expect(c.fit, `${name}: long arms need no fit`).toBeUndefined();
        }
      }
    }
  });
});

describe("§3.4 on j_pair_cross: two Ts whose ENDs cross 4.9h out", () => {
  const s = scene("j_pair_cross");
  const h = s.look.halfWidth;

  it("stops the arm short of its pass, by the overlap's reach and h", () => {
    const m = new FieldModel(s, mapped(h, 3));
    expect(m.diagnostics).toEqual([]);
    // The ENDs cross at 60°: the overlap reaches h·cot(30°) along each pass,
    // and K900's margin of h lets the round cap clear the over pass's border.
    const cap = m.armCaps[0][1];
    expect(cap.why).toMatch(/^crossing 0's pass 4\.90h out/);
    expect(cap.len / h).toBeCloseTo(4.9 - (1 / Math.tan(30 * D2R) + 1), 6);
    // One cut is enough: the tie goes to the first pass, and j1's END keeps its span.
    expect(m.armCaps[1][1].why).toBe("the chain's end");
    // The through stops at the next T.
    for (const [ji, ai] of [[0, 0], [1, 2]]) {
      expect(m.armCaps[ji][ai].why).toBe("the next junction");
      expect(m.armCaps[ji][ai].len / h).toBeCloseTo(5, 9);
    }
    // j0's span on its END ends at the cap.
    const span = m.junctionSpans[0].find((q) => q[0] === m.idxOf.get(1));
    expect(span).toBeDefined();
    expect(span![2] - s.junctions[0].arms[1].s).toBeLessThanOrEqual(cap.len + 1e-9);
  });

  it("fits the 60° corner's round inside the capped arm", () => {
    const m = new FieldModel(s, mapped(h, 3));
    const c = m.corners.find((k) => k.junction === 0 && Math.abs(k.theta - 60 * D2R) < 1e-3)!;
    expect(c.ok).toBe(true);
    expect(c.r).toBeLessThan(cornerRadius(3, h, c.theta));
    expect(c.r).toBeGreaterThan(0);
    expect(c.fit).toMatch(/crossing 0's pass/);
    const cap = m.armCaps[0][1].len;
    const armB = c.armIdxB === 1 ? { p: m.polys[c.b], arm: c.armB, sT: c.sTB } : { p: m.polys[c.a], arm: c.armA, sT: c.sTA };
    expect(Math.abs(dS(armB.p, armB.arm.s, armB.sT))).toBeLessThanOrEqual(cap - m.W + 1e-6 * h);
    // The mirror corner at j1 keeps its full round.
    const c1 = m.corners.find((k) => k.junction === 1 && Math.abs(k.theta - 60 * D2R) < 1e-3)!;
    expect(c1.r / h).toBeCloseTo(cornerRadius(3, h, c1.theta) / h, 9);
    expect(c1.fit).toBeUndefined();
  });

  it("the no-merge check (#15) and the over pass's borders (#16) pass, and fail on S2's spans", () => {
    const after = new FieldModel(s, mapped(h, 3));
    const a15 = check15(checkContext(after));
    expect(a15.status, a15.details?.join("; ")).toBe("pass");
    expect(a15.value).toContain("1 of 1 crossings");
    expect(check16(checkContext(after), oracleProbe(after)).status).toBe("pass");
    expect(borderCensus(after).missing).toBe(0);

    const before = new FieldModel(s, mapped(h, 3, "s2"));
    const b15 = check15(checkContext(before));
    expect(b15.status).toBe("fail");
    expect(b15.details?.[0]).toMatch(/^crossing 0 .*one group via cluster/);
    expect(check16(checkContext(before), oracleProbe(before)).status).toBe("fail");
    expect(borderCensus(before).missing).toBeGreaterThan(0);
  });
});

describe("§3.4 on the synthetic crossing scenes", () => {
  it("no group holds both passes of a crossing", () => {
    for (const name of ["j_cross", "oblique30", "k42", "j_hook_cross"]) {
      const s = scene(name);
      const m = new FieldModel(s, mapped(s.look.halfWidth, 3));
      const r = check15(checkContext(m));
      expect(r.status, `${name}: ${r.value} ${r.details?.join("; ")}`).toBe("pass");
    }
  });
});

describe("§3.4 on j_hook_cross: an END that hooks back over its own through (muse_hash's crossing 292)", () => {
  const s = scene("j_hook_cross");
  const h = s.look.halfWidth;
  const r15 = (p: OracleParams) => check15(checkContext(new FieldModel(s, p)));

  it("needs both K900 rules: the cut at L + h and the refused same-chain joins", () => {
    const head = r15(mapped(h, 3));
    expect(head.status, head.details?.join("; ")).toBe("pass");
    // 5048670e's rule, and each fix alone, leave one group holding both passes.
    for (const p of [
      { ...mapped(h, 3), passJoins: "k883" as const, passMargin: 0.5 },
      { ...mapped(h, 3), passJoins: "k883" as const },
      { ...mapped(h, 3), passMargin: 0.5 },
    ]) {
      const r = r15(p);
      expect(r.status, `${p.passJoins ?? "k900"} m ${p.passMargin ?? 1}`).toBe("fail");
      expect(r.details?.[0]).toMatch(/^crossing 0 .*one group via cluster/);
    }
  });

  it("cuts the END's span at L + h before the over pass and keeps the over pass's borders", () => {
    const m = new FieldModel(s, mapped(h, 3));
    expect(m.diagnostics).toEqual([]);
    const cx = s.crossings[0];
    const L = h / Math.tan((47 * D2R) / 2);
    const span = m.junctionSpans[0].find((q) => q[0] === m.idxOf.get(cx.a.chain))!;
    expect(span[1] - cx.a.s).toBeCloseTo(L + h, 2);
    expect(check16(checkContext(m), oracleProbe(m)).status).toBe("pass");
  });
});

describe("K909: junction groups from geometry", () => {
  const geo = (h: number, extra: Partial<OracleParams> = {}): OracleParams => ({ ...mapped(h, 3), groups: "geo", ...extra });

  it("groups geo keeps #15 and #16 on the synthetic crossing scenes", () => {
    for (const name of ["j_cross", "oblique30", "k42", "j_hook_cross", "j_pair_cross"]) {
      const s = scene(name);
      const m = new FieldModel(s, geo(s.look.halfWidth));
      expect(m.diagnostics, name).toEqual([]);
      const r = check15(checkContext(m));
      expect(r.status, `${name}: ${r.value} ${r.details?.join("; ")}`).toBe("pass");
      expect(check16(checkContext(m), oracleProbe(m)).status, name).toBe("pass");
    }
  });

  it("floors each arm's span at the K883 span", () => {
    for (const name of ["t90", "y120", "acute30", "acute20"]) {
      const s = scene(name);
      const h = s.look.halfWidth;
      const k = new FieldModel(s, mapped(h, 3));
      const g = new FieldModel(scene(name), geo(h));
      k.junctionSpans.forEach((l, ji) =>
        l.forEach(([, lo, hi, ai], n) => {
          const q = g.junctionSpans[ji][n];
          expect(q[3]).toBe(ai);
          expect(q[2] - q[1], `${name} j${ji} arm ${ai}`).toBeGreaterThanOrEqual(hi - lo - 1e-9);
        }),
      );
    }
  });

  it("walks each side: on t90 the END's two sides and the through's END side are in the group, the through's far side is not", () => {
    const s = scene("t90");
    const h = s.look.halfWidth;
    const g = new FieldModel(s, geo(h));
    const G = g.geoGroups!;
    s.junctions[0].arms.forEach((a, ai) => {
      const [p, q] = G.sides[0][ai];
      if (a.kind === "end") {
        expect(Math.min(p, q) / h, `END arm ${ai}`).toBeGreaterThan(0.5);
      } else {
        expect(Math.max(p, q) / h, `through arm ${ai}`).toBeGreaterThan(0.5);
        expect(Math.min(p, q), `through arm ${ai}`).toBe(0);
      }
    });
  });

  it("truth geo asks the crossing first: j_hook_cross's over pass shows within L + h of the crossing", () => {
    const s = scene("j_hook_cross");
    const h = s.look.halfWidth;
    const m = new FieldModel(s, mapped(h, 3));
    const cx = s.crossings[0];
    const over = cx[cx.over];
    const reach = h / Math.tan((47 * D2R) / 2) + h;
    const none = { cov: () => 0, exact: true, label: "none" } as unknown as Parameters<typeof borderCensus>[1] extends infer O ? O extends { probe?: infer P } ? P : never : never;
    const shown = borderCensus(m, { truth: "geo", probe: none }).stretches.filter(
      (q) => q.chain === over.chain && (Math.min(Math.abs(q.s0 - over.s), Math.abs(q.s1 - over.s)) <= reach || (q.s0 - over.s) * (q.s1 - over.s) < 0),
    );
    // Both sides of the over pass, up to the crossing: K900's geoHider called them inside j0's node overlap.
    expect(new Set(shown.map((q) => q.side)).size).toBe(2);
  });

  it("hookLook (sheet G): j_hook_cross's END is the one hook arm; cap hides its free cap, carry draws its side back to the root", () => {
    const s = scene("j_hook_cross");
    const h = s.look.halfWidth;
    const look = (hookLook: "now" | "carry" | "cap") => new FieldModel(s, { ...mapped(h, 3), hookLook });
    const now = look("now");
    expect(now.hooks.map((k) => [k.junction, k.arm, k.crossing])).toEqual([[0, 1, 0]]);
    // The free cap at the cut, inside the through.
    expect(now.evalPoint(0.917, 0.733).ink).toBe(true);
    expect(look("cap").evalPoint(0.917, 0.733).ink).toBe(false);
    // The hook side's border band between the root and the cut: inside the group's body now.
    const H = now.hooks[0];
    const p = now.polys[H.pi];
    const at = pointAt(p, normS(p, H.root + H.dir * 0.25 * h));
    const q = [at.x - H.side * at.ty * 0.8 * h, at.y + H.side * at.tx * 0.8 * h] as const;
    expect(now.evalPoint(q[0], q[1]).ink).toBe(false);
    expect(look("carry").evalPoint(q[0], q[1]).ink).toBe(true);
  });
});
