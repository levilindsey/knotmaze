// K1000: the label's arm caps are continuous in the geometry
// (docs/design/K1000_continuous_caps.md, the coordinator's calls 2 and 3).
// Each sweep moves one thing in small steps through a choice master's cut
// loop makes all at once (the traced sites, the brief's Findings H1-H5):
//  (A) the side at a tie: j1's END leans from 110° to 130°, so the farthest
//      holders of the two passes swap (fa − fb from about +0.5h to −0.5h; H4);
//  (B) membership: j1 slides in along the through, so the crossing slides
//      along j0's END into the padded span of that END, whose span ends at a
//      T (j2) 2h out, and the pass's farthest holder on that side jumps from
//      j2 to j0 (H1);
//  (C) θ: j1's END bends on an arc and j1 slides, so the crossing passes
//      polyline vertices, where segment directions turn (H2, H3);
//  (D) the cluster: j1 moves away until j0's and j1's spans on the through
//      stop touching, and the two passes' holders leave one cluster (H4, H5).
// Continuity is read by zooming in: each step where a cap moves more than
// 0.05h is bisected 16 times, following the half where that cap moves more;
// a jump keeps its size, a ramp shrinks below 0.01h. A cut that enters moves
// its cap from the base to the arm's reach over a weight of 0.05, steeply by
// design, so the test reads continuity, not a Lipschitz bound. (B) also reads
// monotony: as the pass slides in, the deep holder's cap only falls.

import { describe, expect, it } from "vitest";
import { FieldModel, type OracleParams, cornerRadius } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";
import { pairCrossScene } from "./scenes/gen";

// labelOnly: the caps come before the primitives, which only cost time here.
const params = (h: number): OracleParams =>
  ({
    rRound: 0,
    rOf: (_j: number, _i: number, theta: number, style: string) => (style === "round" ? cornerRadius(3, h, theta) : 0),
    crMax: 3,
    spans: "k883",
    labelOnly: true,
  }) as OracleParams;

/** Every arm's cap, junction by junction. */
function capsOf(s: FieldScene): number[] {
  return new FieldModel(s, params(s.look.halfWidth)).armCaps.flatMap((l) => l.map((c) => c.len));
}

const gap = (a: number, b: number): number => (a === b ? 0 : Math.abs(a - b));

/** The caps along u in [from, to] (n steps), and every step where a cap moves more than 0.05h, zoomed in. */
function sweep(make: (u: number) => FieldScene, from: number, to: number, n: number) {
  const h = make(from).look.halfWidth;
  const at = (u: number) => capsOf(make(u));
  const us = Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);
  const caps = us.map(at);
  const jumps: { arm: number; u: number; coarse: number; fine: number }[] = [];
  for (let i = 1; i <= n; i++)
    for (let k = 0; k < caps[i].length; k++) {
      const coarse = gap(caps[i - 1][k], caps[i][k]);
      if (!(coarse > 0.05 * h)) continue;
      let [u0, u1, c0, c1] = [us[i - 1], us[i], caps[i - 1][k], caps[i][k]];
      for (let d = 0; d < 16; d++) {
        const um = (u0 + u1) / 2;
        const cm = at(um)[k];
        if (gap(cm, c0) >= gap(c1, cm)) [u1, c1] = [um, cm];
        else [u0, c0] = [um, cm];
      }
      jumps.push({ arm: k, u: us[i - 1], coarse, fine: gap(c0, c1) });
    }
  return { h, caps, us, jumps };
}

function expectContinuous(r: ReturnType<typeof sweep>, what: string): void {
  for (const j of r.jumps)
    expect(j.fine / r.h, `${what}: arm ${j.arm} after u = ${j.u.toFixed(4)} (${(j.coarse / r.h).toFixed(3)}h a step)`).toBeLessThanOrEqual(0.01);
}

// Until the caps land (K1000 step 4) master's cut loop fails every sweep, so
// the suite runs only on a probe oracle (ORACLE19, .claude/probes/S3a/
// vitest19.config.ts) or with CAP19=1; landing the caps removes this gate.
const run = process.env.ORACLE19 !== undefined || process.env.CAP19 === "1";

describe.runIf(run)("K1000: the arm caps are continuous in the geometry", () => {
  it("(A) the side at a tie: j1's END leans from 110° to 130°", { timeout: 120_000 }, () => {
    const r = sweep((phi) => pairCrossScene({ phi }), 110, 130, 40);
    expectContinuous(r, "lean");
    // The sweep crosses the tie: some cap moves.
    expect(r.jumps.length + r.caps.filter((c, i) => i && c.some((x, k) => gap(x, r.caps[i - 1][k]) > 0)).length).toBeGreaterThan(0);
  });

  it("(B) membership: the crossing slides into the padded span of j0's END", { timeout: 120_000 }, () => {
    const make = (X: number) => pairCrossScene({ X, tAt: 2 });
    const r = sweep(make, 5.6, 4.2, 40);
    expectContinuous(r, "slide");
    // j2's forward arm holds the pass throughout; as j0's END takes the pass
    // in, its cap only falls.
    const s = make(5);
    const off = s.junctions.slice(0, 2).reduce((a, j) => a + j.arms.length, 0);
    const k = off + s.junctions[2].arms.findIndex((a) => a.chain === 1 && a.dir === 1);
    for (let i = 1; i < r.caps.length; i++)
      expect(r.caps[i][k], `j2's forward arm at X ${r.us[i].toFixed(3)}`).toBeLessThanOrEqual(r.caps[i - 1][k] + 1e-9 * r.h);
    expect(r.caps[r.caps.length - 1][k]).toBeLessThan(r.caps[0][k]);
  });

  it("(C) θ: the crossing slides over the vertices of an arc", { timeout: 120_000 }, () => {
    const r = sweep((X) => pairCrossScene({ X, bendAt: 2, bendR: 6 }), 4.6, 5.4, 40);
    expectContinuous(r, "arc");
  });

  it("(D) the cluster: j1 moves away until the Ts' spans on the through part", { timeout: 120_000 }, () => {
    const r = sweep((X) => pairCrossScene({ X }), 5, 8, 60);
    expectContinuous(r, "part");
  });
});
