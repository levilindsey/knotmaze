// K868 S3a4: the switch search's topology cache (label_switch.ts). The label
// app keeps switchTopo while switchKey holds and reruns only the geometry
// part each rebuild; a topology kept from one geometry, applied to another
// with the same key, must give the uncached search's lines to the bit, and a
// changed key (an over flip, a crossing gone) must be seen.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cornerRadius, FieldModel, type OracleParams } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";
import {
  findSwitchLines,
  sameKey,
  sameSwitchLines,
  switchKey,
  switchLinesFrom,
  switchTopo,
} from "../../../src/render/label/label_switch";

const DIR = join(__dirname, "..", "field", "scenes");
const NAMES = [
  "acute20", "acute30", "curved", "dead_end", "j_cross", "j_hook_cross", "j_pair_cross", "k42",
  "kink", "oblique30", "t90", "tight_curve", "x4_ends", "x4_throughs", "y120",
];
const load = (n: string): FieldScene => JSON.parse(readFileSync(join(DIR, `${n}.json`), "utf8")) as FieldScene;

/** The label app's model (label_app.ts rebuild); sigma narrowed for the
 * scenes that should switch. */
function model(s: FieldScene, sigma?: number): FieldModel {
  const h = s.look.halfWidth;
  const params: OracleParams = {
    rRound: 0,
    rOf: (_j, _i, th, st) => (st === "round" ? cornerRadius(3, h, th) : 0),
    spans: "k883",
    crMax: 3,
    labelOnly: true,
    sigma,
  };
  return new FieldModel(s, params);
}

const flip = (s: FieldScene): FieldScene => ({ ...s, crossings: s.crossings.map((x) => ({ ...x, over: x.over === "a" ? ("b" as const) : ("a" as const) })) });

/** The scene moved the way a frame moves it: every sample and junction
 * centre by a smooth field of amplitude a, every crossing's arc lengths by
 * ds (opposite signs on its two passes). */
function moved(s: FieldScene, a: number, ds: number, k: number): FieldScene {
  const f = (x: number, y: number): [number, number] => [x + a * Math.sin(k * y + 0.3), y + a * Math.cos(k * x + 0.7)];
  return {
    ...s,
    chains: s.chains.map((c) => {
      const pts = c.pts.slice();
      for (let i = 0; i + 1 < pts.length; i += 2) [pts[i], pts[i + 1]] = f(pts[i], pts[i + 1]);
      return { ...c, pts };
    }),
    crossings: s.crossings.map((x) => ({ ...x, a: { ...x.a, s: x.a.s + ds }, b: { ...x.b, s: x.b.s - ds } })),
    junctions: s.junctions.map((j) => ({ ...j, c: f(j.c[0], j.c[1]) })),
  };
}

describe("K868 S3a4 the switch search's topology cache", () => {
  it("a kept topology gives the uncached lines on moved geometry with the same key", () => {
    let held = 0;
    let withLines = 0;
    let moves = 0;
    // Each scene as built, and with its crossings flipped at sigma 1.2 h: on
    // j_cross that puts chain 0 over chain 2 inside the T's corner reach, so
    // the window's upper end is a switch (1 line at s = 17.2).
    const cases = NAMES.flatMap((n) => [
      { name: n, s0: load(n), sigma: undefined as number | undefined },
      { name: `${n} flipped`, s0: flip(load(n)), sigma: 1.2 * load(n).look.halfWidth },
    ]);
    for (const { name, s0, sigma } of cases) {
      const h = s0.look.halfWidth;
      const T = switchTopo(model(s0, sigma));
      for (const [a, ds, k] of [
        [0.02 * h, 0, 1],
        [0.05 * h, 0.03 * h, 0.7],
        [0.15 * h, -0.08 * h, 0.4],
      ] as const) {
        const m = model(moved(s0, a, ds, k), sigma);
        moves++;
        if (!sameKey(T.key, switchKey(m))) continue;
        held++;
        const want = findSwitchLines(m);
        if (want.length > 0) withLines++;
        expect(sameSwitchLines(switchLinesFrom(T, m), want), `${name} a=${a} ds=${ds}`).toBe(true);
      }
    }
    // Not vacuous: the key holds under these small moves, and some scenes switch.
    expect(held).toBeGreaterThanOrEqual(moves - 3);
    expect(withLines).toBeGreaterThan(0);
  });

  it("the key sees an over flip and a crossing gone", () => {
    for (const name of ["j_cross", "j_pair_cross", "x4_throughs"]) {
      const s0 = load(name);
      if (s0.crossings.length === 0) continue;
      const k0 = switchKey(model(s0));
      const flipped: FieldScene = { ...s0, crossings: s0.crossings.map((x, i) => (i === 0 ? { ...x, over: x.over === "a" ? "b" : "a" } : x)) };
      expect(sameKey(k0, switchKey(model(flipped))), `${name} flip`).toBe(false);
      const fewer: FieldScene = { ...s0, crossings: s0.crossings.slice(1) };
      expect(sameKey(k0, switchKey(model(fewer))), `${name} crossing gone`).toBe(false);
      expect(sameKey(k0, switchKey(model(s0))), `${name} rebuilt`).toBe(true);
    }
  });

  it("sameSwitchLines compares every field to the bit", () => {
    const m = model(flip(load("j_cross")), 1.2);
    const lines = findSwitchLines(m);
    expect(sameSwitchLines(lines, findSwitchLines(m))).toBe(true);
    expect(lines.length).toBe(1);
    const off = lines.map((L) => ({ ...L, s: L.s + Number.EPSILON * Math.max(1, Math.abs(L.s)) }));
    expect(sameSwitchLines(lines, off)).toBe(false);
    expect(sameSwitchLines(lines, lines.slice(1))).toBe(false);
  });
});
