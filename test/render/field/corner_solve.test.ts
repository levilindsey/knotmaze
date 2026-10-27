// K868 S2 step 2: the corner solve. One-sided foot windows (each arm's own
// side of the root), Newton restarts along the bisector, and a bracketed
// march along arm A's offset as the last resort. On muse_hash this took the
// failed solves from 59 to 1 (j58/1, which has no V: its arms stay closer
// than 2h; see the S2 handoff in docs/design/K868_s2_g2.md).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { footInWindow } from "../../../src/render/field/geom";
import { FieldModel, type OracleParams } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";

const scene = (name: string) => JSON.parse(readFileSync(join(__dirname, "scenes", `${name}.json`), "utf8")) as FieldScene;

const NAMES = ["t90", "y120", "acute30", "acute20", "x4_throughs", "x4_ends", "j_cross", "kink", "dead_end", "oblique30", "k42", "tight_curve", "curved"];

/** §3.8's proposed r: master's mapping, capped at 2h. */
const rule =
  (h: number, cr: number): OracleParams["rOf"] =>
  (_j, _i, theta, style) =>
    style === "round" ? Math.min(2 * h, h * Math.max(0, 1.25 * cr * Math.tan(theta / 2) - 0.97)) : 0;

describe("corner solve", () => {
  it("every synthetic corner solves: §3.8's r under the web cap, and r = 2h", () => {
    for (const name of NAMES) {
      const s = scene(name);
      const h = s.look.halfWidth;
      for (const p of [{ rRound: 0, rOf: rule(h, s.look.cuspRadius), webCap: 1.5 * h }, { rRound: 2 * h }] as OracleParams[]) {
        const m = new FieldModel(s, p);
        expect(
          m.diagnostics.filter((d) => d.startsWith("corner")),
          name,
        ).toEqual([]);
        for (const c of m.corners) {
          expect(c.ok, `${name} corner ${c.junction}/${c.index}`).toBe(true);
          if (c.r <= 0) continue;
          // q sits h + r from both arms, inside each arm's own window.
          const fa = footInWindow(m.polys[c.a], c.q[0], c.q[1], c.winA[0], c.winA[1]);
          const fb = footInWindow(m.polys[c.b], c.q[0], c.q[1], c.winB[0], c.winB[1]);
          expect(fa.d).toBeCloseTo(h + c.r, 8);
          expect(fb.d).toBeCloseTo(h + c.r, 8);
          // The feet lie on the arms' own sides of the root (h/4 of slack).
          expect((fa.s - c.armA.s) * c.armA.dir).toBeGreaterThan(-0.25 * h - 1e-9);
          expect((fb.s - c.armB.s) * c.armB.dir).toBeGreaterThan(-0.25 * h - 1e-9);
        }
      }
    }
  });

  it("the one-sided windows agree with S1b's two-sided ones where both solve", () => {
    for (const name of ["t90", "y120", "acute30", "acute20", "tight_curve", "curved"]) {
      const s = scene(name);
      const h = s.look.halfWidth;
      const p: OracleParams = { rRound: 0, rOf: rule(h, s.look.cuspRadius), webCap: 1.5 * h };
      const a = new FieldModel(s, p);
      const b = new FieldModel(s, { ...p, cornerTwoSided: true });
      a.corners.forEach((c, i) => {
        const d = b.corners[i];
        if (!d.ok) return;
        expect(Math.hypot(c.q[0] - d.q[0], c.q[1] - d.q[1]), `${name} ${i}`).toBeLessThan(1e-9);
        expect(Math.hypot(c.V[0] - d.V[0], c.V[1] - d.V[1]), `${name} ${i}`).toBeLessThan(1e-9);
      });
    }
  });

  it("a corner whose arms stay closer than 2h has no V, and says so", () => {
    // acute20 with its END bent to run parallel to the through, 1.2h off
    // its centreline (a short END with a capped tip would not do: the cap
    // meets the through's outline, and that point is a V).
    const s = scene("acute20");
    const h = s.look.halfWidth;
    const pts: number[] = [];
    const ds = 0.2 * h;
    // Leave at 30° until 1.2h off the through, then run parallel to it.
    const rise = 1.2 * h;
    const run = rise / Math.tan((30 * Math.PI) / 180);
    const x0 = 0.1 * h * Math.cos((30 * Math.PI) / 180);
    const y0 = 0.1 * h * Math.sin((30 * Math.PI) / 180);
    const n1 = Math.ceil(Math.hypot(run, rise) / ds);
    for (let i = 0; i <= n1; i++) pts.push(x0 + (run * i) / n1, y0 + ((rise - y0) * i) / n1);
    const n2 = Math.ceil((18 * h) / ds);
    for (let i = 1; i <= n2; i++) pts.push(x0 + run + (18 * h * i) / n2, rise);
    s.chains[1].pts = pts;
    s.chains[1].z = new Array(pts.length / 2).fill(0);
    let len = 0;
    for (let i = 2; i < pts.length; i += 2) len += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
    s.deadEnds = s.deadEnds.filter((d) => d.chain !== 1).concat([{ chain: 1, s: len, offscreen: true }]);
    const m = new FieldModel(s, { rRound: 0.5 * h });
    const msg = m.diagnostics.find((d) => d.includes("no V"));
    expect(msg, m.diagnostics.join("; ")).toBeDefined();
    expect(msg).toMatch(/max gap 1\.\d+h/);
  });
});
