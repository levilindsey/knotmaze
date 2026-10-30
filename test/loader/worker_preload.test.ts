// K1060: pin the worker preload's phw reader (src/loader/
// worker_preload.ts). The inline script vite.config.ts injects into
// index.html runs before the app loads, so it walks the link codec
// itself; a wrong decision costs a download or the head start, never
// behaviour, so nothing else would notice one. This suite runs the
// generated script against a stub location and document and compares
// its decision (modulepreload added or not) with what the app reads
// (parseParams' physicsWorker) across the probe's URL forms, seeded
// random links written by the codec's own writer, key=value links,
// overrides after a token, another codec version and a garbage blob.
import { describe, expect, it, vi } from "vitest";
import {
  CODEC_PARAMS,
  encodeToken,
  type CodecParam,
  type ParamValue,
} from "../../src/ui/param_codec";
import { PARAM_DEFAULTS, parseParams } from "../../src/ui/url_state";
import {
  PHW_DEFAULT_ON,
  PHW_INDEX,
  workerPreloadScript,
} from "../../src/loader/worker_preload";

const HREF = "./assets/physics_worker-test.js";
const D = PARAM_DEFAULTS;

// Run the generated inline script the way the page's head would: it
// sees only location.search and document, and its whole decision is
// the modulepreload link it appends (or does not).
function preloads(search: string): boolean {
  const appended: Array<{ rel: string; href: string; crossOrigin: string }> =
    [];
  const documentStub = {
    createElement: (_tag: string) => ({ rel: "", href: "", crossOrigin: "" }),
    head: {
      appendChild: (el: { rel: string; href: string; crossOrigin: string }) => {
        appended.push(el);
      },
    },
  };
  const run = new Function("location", "document", workerPreloadScript(HREF)) as (
    location: { search: string },
    document: typeof documentStub
  ) => void;
  run({ search }, documentStub);
  if (appended.length === 0) return false;
  expect(appended).toHaveLength(1);
  expect(appended[0]).toEqual({
    rel: "modulepreload",
    href: HREF,
    crossOrigin: "",
  });
  return true;
}

function appPhw(search: string): boolean {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    return parseParams(search).physicsWorker;
  } finally {
    warn.mockRestore();
  }
}

function expectAgreement(search: string): void {
  expect([search, preloads(search)]).toEqual([search, appPhw(search)]);
}

// Deterministic PRNG (mulberry32, as test/ui/param_codec.test.ts).
const rng = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// A value of the param's type that differs from its default (and so is
// listed by the codec's writer).
function nonDefault(p: CodecParam, rand: () => number): ParamValue {
  const def = D[p.name as keyof typeof D] as ParamValue;
  switch (p.type) {
    case "boolean":
      return !(def as boolean);
    case "enum":
      return p.options.find((o) => o !== def) ?? p.options[0];
    case "color":
      return def === "#123456" ? "#654321" : "#123456";
    case "string":
      return `probe${Math.floor(rand() * 1000)}`;
    case "number":
      return (def as number) + 1 + Math.floor(rand() * 5);
  }
}

describe("worker preload phw reader (K1060)", () => {
  it("derives the default it assumes from PARAM_DEFAULTS", () => {
    expect(PHW_DEFAULT_ON).toBe(PARAM_DEFAULTS.physicsWorker);
    expect(PARAM_DEFAULTS.physicsWorker).toBe(true);
    expect(CODEC_PARAMS[PHW_INDEX].name).toBe("physicsWorker");
    expect(CODEC_PARAMS[PHW_INDEX].type).toBe("boolean");
  });

  // The 14 forms K1055's probe decision-tested in Node (its commit:
  // bare, legacy, token phw off incl mixed value types, overrides both
  // ways, garbage blob).
  it("agrees with parseParams on the probe's 14 forms", () => {
    const phwOff = encodeToken(
      7,
      { ...D, physicsWorker: false },
      D
    );
    const mixedOff = encodeToken(
      7,
      {
        ...D,
        gridSize: 12,
        soundMode: "manual",
        pathColor: "#123456",
        physicsWorker: false,
        revealDistance: 5,
        burnt: "char",
        text: "hi",
      },
      D
    );
    const forms = [
      "",
      "?7",
      "?phw=0",
      "?phw=1",
      "?s=7&phw=0",
      "?seed=7&phw=1&snd=none",
      `?${phwOff}`,
      `?${mixedOff}`,
      // Entries only after phw's index: every value skipped to reach
      // the end without finding phw.
      `?${encodeToken(7, { ...D, revealDistance: 5, burnt: "char", text: "hi" }, D)}`,
      // Entries only before it (number, enum, color to skip).
      `?${encodeToken(7, { ...D, gridSize: 12, soundMode: "manual", pathColor: "#123456" }, D)}`,
      `?${encodeToken(7, { ...D }, D)}&phw=0`,
      `?${phwOff}&phw=1`,
      "?7.c", // another codec version (v3): seed at today's defaults
      "?7.###", // an unreadable blob: seed at today's defaults
    ];
    expect(forms).toHaveLength(14);
    for (const q of forms) expectAgreement(q);
  });

  it("agrees on key=value links and on overrides after a token", () => {
    const phwOff = encodeToken(7, { ...D, physicsWorker: false }, D);
    const forms = [
      "?am=instant&phw=0&snd=none",
      "?am=instant&phw=1",
      "?s=7&phw=0&am=instant",
      "?7&phw=0&snd=none&am=instant",
      "?7&snd=none&am=instant",
      `?${encodeToken(7, { ...D, gridSize: 12 }, D)}&phw=0`,
      `?${encodeToken(7, { ...D, gridSize: 12 }, D)}&phw=1`,
      `?${phwOff}&phw=0`,
      `?${phwOff}&phw=1`,
    ];
    for (const q of forms) expectAgreement(q);
  });

  it("agrees on seeded random links from the codec's own writer", () => {
    const rand = rng(20261029);
    const before = CODEC_PARAMS.slice(0, PHW_INDEX);
    const after = CODEC_PARAMS.slice(PHW_INDEX + 1);
    const typesSeen = new Set<string>();
    const decisions = new Set<boolean>();
    for (let k = 0; k < 200; k++) {
      const values: Record<string, ParamValue> = { ...D };
      const changed: CodecParam[] = [];
      const pick = (pool: CodecParam[], n: number): void => {
        for (let i = 0; i < n; i++) {
          const p = pool[Math.floor(rand() * pool.length)];
          values[p.name] = nonDefault(p, rand);
          changed.push(p);
        }
      };
      pick(before, 2);
      pick(after, 2);
      // Rotate a forced type through the change set, so every codec
      // type is among the changed params whatever the draws picked.
      const type = ["number", "boolean", "enum", "color", "string"][k % 5];
      const pool = [...before, ...after].filter((p) => p.type === type);
      const forced = pool[Math.floor(rand() * pool.length)];
      values[forced.name] = nonDefault(forced, rand);
      changed.push(forced);
      values.physicsWorker = k % 2 === 0 ? false : true;
      const seed = Math.floor(rand() * 2 ** 32) >>> 0;
      const q = `?${encodeToken(seed, values, D)}`;
      for (const p of changed) typesSeen.add(p.type);
      decisions.add(appPhw(q));
      expectAgreement(q);
    }
    expect([...typesSeen].sort()).toEqual([
      "boolean",
      "color",
      "enum",
      "number",
      "string",
    ]);
    expect([...decisions].sort()).toEqual([false, true]);
  });
});
