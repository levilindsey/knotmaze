// K1438: junction membership from each arm's home interval (tables.ts aHome, eval.ts member()), behind the
// GF_HOME switch. The fade where a thread dives out of its junction follows `fadeLength` live: full membership down
// to the tie depth zt, the ramp's end fadeLength along the arm (a full-window hat), a hard step at zt for small
// fadeLengths and 0, and changing it needs no table rebuild (K1449).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { FieldScene } from "../../src/render/field/scene";
import { buildTables, GF_HOME, GF_JOINT, type GfTables } from "../../src/render/gpu_field/tables";
import { GfEval, GF_FADE_LENGTH } from "../../src/render/gpu_field/eval";
import { GF_BIG, packTables } from "../../src/render/gpu_field/gf_pack";
import { PARAM_DEFAULTS } from "../../src/ui/url_state";

// K1575: the GF_* switches are read once at module load (tables.ts, eval.ts), so this file pins its own
// environment before those imports evaluate and restores the shell's values afterwards; no other file
// inherits the pin (vitest isolates files). Both switch states are then covered through GfOpts below.
const savedGfEnv = vi.hoisted(() => {
  const keys = ["GF_HOME", "GF_KRETRY", "GF_KEXT", "GF_KCAP", "GF_KRMAX", "GF_KSAG", "GF_KRMIN", "GF_KXB", "GF_KXTOL", "GF_KXZ", "GF_NOCLIP", "GF_TANG", "GF_SELFBUR", "GF_S34", "GF_S32", "GF_JOINT"];
  const saved: Record<string, string | undefined> = {};
  for (const k of keys) { saved[k] = process.env[k]; delete process.env[k]; }
  return saved;
});
afterAll(() => {
  for (const [k, v] of Object.entries(savedGfEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

const dir = join(__dirname, "field", "scenes");
const load = (n: string): FieldScene => {
  const s = JSON.parse(readFileSync(join(dir, n), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  return s;
};
const AA = 0.5 / 320;

// j_cross.json's arm 0 (chain 0, root s 16, dir +1): capped at aL 0.5, the crossing that cut it 2.5 ahead, so its
// home interval is [0, 2.5]; the crossing's hat starts 1.41 (win) before the pin, the dive's first sample at 1.09.
const ARM = 0;
/** The arm's samples d in [aL, aHome] with the membership eval() takes there. */
function profile(T: GfTables, fl: number, E = new GfEval(T)): { d: number; g: number; ramp: number }[] {
  E.fadeLength = fl;
  const c = 0; const out: { d: number; g: number; ramp: number }[] = [];
  const n = 2400;
  for (let k = 0; k <= n; k++) {
    const d = T.aL[ARM] + ((T.aHome[ARM] - T.aL[ARM]) * k) / n;
    const m = E.memberAt(c, T.aSR[ARM] + d * T.aDir[ARM]);
    out.push({ d, g: m.g, ramp: m.ramp });
  }
  return out;
}
/** The arc from the last full member to the last partial one (the fade's extent), and how many samples ramp. */
function extent(P: { d: number; g: number; ramp: number }[], g: number): { start: number; end: number; ramping: number } {
  let start = -1; let end = -1; let ramping = 0;
  for (const p of P) {
    if (p.g === g && p.ramp >= 1) start = p.d;
    if (p.g === g && p.ramp > 0) end = p.d;
    if (p.g === g && p.ramp > 0 && p.ramp < 1) ramping++;
  }
  return { start, end, ramping };
}

describe("K1438 home membership", () => {
  it("is off in the shipped build, and fadeLength defaults to url_state's", () => {
    expect(GF_HOME).toBe(false);
    expect(GF_FADE_LENGTH).toBe(PARAM_DEFAULTS.fadeLength);
    const T = buildTables(load("j_cross.json"), { aa: AA });
    expect(T.homeOn).toBe(false);
    expect(new GfEval(T).fadeLength).toBe(PARAM_DEFAULTS.fadeLength);
  });

  it("the fixture's arm: capped, home to the crossing ahead", () => {
    const T = buildTables(load("j_cross.json"), { aa: AA, home: true });
    expect(T.homeOn).toBe(true);
    expect(T.aL[ARM]).toBeCloseTo(0.5, 9);
    expect(T.aLcut[ARM]).toBeLessThan(Infinity);
    expect(T.aHome[ARM]).toBeCloseTo(2.5, 9);
    // The table is the same with the switch off: only homeOn differs.
    const off = buildTables(load("j_cross.json"), { aa: AA, home: false });
    expect(Array.from(off.aHome)).toEqual(Array.from(T.aHome));
  });

  it("switch off: past aL the arm is not a member (master's membership)", () => {
    const T = buildTables(load("j_cross.json"), { aa: AA, home: false });
    const P = profile(T, GF_FADE_LENGTH);
    const g = T.aG[ARM];
    expect(P.filter((p) => p.d > T.aL[ARM] + 1e-6 && p.g === g && p.ramp > 0)).toEqual([]);
  });

  // K1449: a full member down to the tie depth zt (0.1 amp: 0.1 win of arc into a full-window hat), then the fade
  // to fadeLength of arc; a fadeLength at or under 0.1 win (j_cross's win is 1.41) is a hard step at zt.
  it("the fade runs from the tie depth to fadeLength along the arm, set live on one table", () => {
    const T = buildTables(load("j_cross.json"), { aa: AA, home: true });
    const E = new GfEval(T);
    const g = T.aG[ARM];
    const step = (T.aHome[ARM] - T.aL[ARM]) / 2400;
    const dive = T.aHome[ARM] - T.win; // the crossing's hat starts here (one pin ahead, full window)
    expect(T.zt).toBeCloseTo(0.1 * T.amp, 12);
    const full = (T.zt * T.win) / T.amp; // the arc at which the hat reaches zt
    for (const fl of [0.05, 0.14, 0.4, 0.8, 1.2]) {
      const X = extent(profile(T, fl, E), g);
      expect(X.start - dive).toBeGreaterThan(full - 2 * step);
      expect(X.start - dive).toBeLessThanOrEqual(full + step);
      const end = Math.max(fl, full);
      expect(X.end - dive).toBeGreaterThan(end - 2 * step);
      expect(X.end - dive).toBeLessThanOrEqual(end + step);
      if (fl <= full) expect(X.ramping).toBe(0);
      else expect(X.ramping).toBeGreaterThan(0);
    }
  });

  it("fadeLength 0 is a hard step at the tie depth, past the tent's foot", () => {
    const T = buildTables(load("j_cross.json"), { aa: AA, home: true });
    const g = T.aG[ARM];
    const P = profile(T, 0);
    const X = extent(P, g);
    expect(X.ramping).toBe(0);
    const step = (T.aHome[ARM] - T.aL[ARM]) / 2400;
    const cut = T.aHome[ARM] - T.win + (T.zt * T.win) / T.amp;
    expect(Math.abs(X.end - cut)).toBeLessThanOrEqual(step);
    // Full member up to the cut (the tent's foot included), not a member after it.
    for (const p of P) {
      if (p.d < cut - step) expect(p.g === g && p.ramp === 1).toBe(true);
      if (p.d > cut + step) expect(p.g === g && p.ramp > 0).toBe(false);
    }
  });

  // K1588: nearer the root than the joint footprint (tables.ts armJoints: GF_JOINT h, retry builds only) the arm's
  // piece is a full member whatever its depth; past it the fade is today's. j_cross's dive starts 1.09 from the
  // root and the footprint ends at 2, so the footprint holds the piece through the first 0.91 of the dive.
  it("K1588: inside the joint footprint the arm's piece is a full member at any depth", () => {
    const T = buildTables(load("j_cross.json"), { aa: AA, home: true, kRetry: true });
    const off = buildTables(load("j_cross.json"), { aa: AA, home: true, kRetry: true });
    off.aJoint!.fill(0);
    const g = T.aG[ARM]; const J = T.aJoint![ARM];
    expect(GF_JOINT).toBe(2);
    expect(J).toBeCloseTo(GF_JOINT * T.h, 12);
    expect(J).toBeGreaterThan(T.aHome[ARM] - T.win); // the footprint reaches into the dive
    expect(J).toBeLessThan(T.aHome[ARM]);
    for (const fl of [0, 0.14, 0.8]) {
      const P = profile(T, fl); const Q = profile(off, fl);
      let kept = 0;
      for (let k = 0; k < P.length; k++) {
        const p = P[k]; const q = Q[k];
        if (p.d < J - 1e-9) { expect(p.g === g && p.ramp === 1).toBe(true); if (!(q.g === g && q.ramp === 1)) kept++; }
        else if (p.d > J + 1e-9) expect(p).toEqual(q);
      }
      expect(kept).toBeGreaterThan(0); // without the footprint the piece fades out of its junction inside it
    }
  });

  it("K1588: no footprint on an arm cut by a crossing with its own group, no table without a retry build", () => {
    const T = buildTables(load("j_hook_cross.json"), { aa: AA, home: true, kRetry: true });
    expect(Array.from(T.aJoint!)).toEqual([2, 2, 2, 2, 0, 2].map((v) => v * T.h));
    expect(T.aG[4]).toBe(T.aG[0]); // the hook: arm 4 is cut by the crossing with its own junction's arm
    expect(buildTables(load("j_hook_cross.json"), { aa: AA, home: true }).aJoint).toBeUndefined();
  });

  // The rule is for the under thread: an over arm made a member would lose its own border in the open.
  it("K1588: no footprint on an arm that passes over its crossing", () => {
    const S = load("j_cross.json");
    expect(S.crossings[0].over).toBe("a"); // as built, the arm (chain 0, side b) goes under
    expect(buildTables(S, { aa: AA, home: true, kRetry: true }).aJoint![ARM]).toBeGreaterThan(0);
    S.crossings[0].over = "b";
    const T = buildTables(S, { aa: AA, home: true, kRetry: true });
    expect(T.aJoint![ARM]).toBe(0);
    const g = T.aG[ARM];
    // the depth decides again: the over piece leaves its junction inside what was the footprint
    expect(profile(T, 0.14).some((p) => p.d < GF_JOINT * T.h && !(p.g === g && p.ramp === 1))).toBe(true);
  });

  it("packs aHome into the arm record's free .y only with the switch on", () => {
    for (const home of [false, true]) for (const kRetry of [false, true]) {
      const T = buildTables(load("j_cross.json"), { aa: AA, home, kRetry });
      const P = packTables(T);
      for (let a = 0; a < T.nA; a++) {
        const t = P.o.arm + 2 * a + 1;
        const want = home ? Math.fround(T.aHome[a] === Infinity ? GF_BIG : T.aHome[a]) : 0;
        expect(P.data[4 * t + 1]).toBe(want);
        expect(P.data[4 * t + 2]).toBe(home && kRetry ? (T.a34?.[a] ?? 0) : 0);
        // K1588: the joint footprint rides the free .w, retry builds only
        expect(P.data[4 * t + 3]).toBe(home && kRetry ? Math.fround(T.aJoint?.[a] ?? 0) : 0);
        if (!kRetry) expect(T.aJoint).toBeUndefined();
      }
    }
  });
});
