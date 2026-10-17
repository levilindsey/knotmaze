import { describe, expect, it } from "vitest";
import {
  clampParamValue,
  CODEC_PARAMS,
  CODEC_VERSION,
  decodeToken,
  encodeToken,
  numberText,
} from "../../src/ui/param_codec";
import type { CodecParam, ParamValue } from "../../src/ui/param_codec";
import { ENUM_OPTIONS, PARAM_DEFAULTS, REVEAL_LOOKS } from "../../src/ui/url_state";
import { EXPLORE_LOOKS } from "../../src/render/explore_glsl";

// Today's defaults, what every link is read against (the app passes the
// same object).
const D = PARAM_DEFAULTS as unknown as Record<string, ParamValue>;

// CODEC_PARAMS, pinned literally: [name, type, options?] per param, in table
// order (the index is the position). Every link depends on all of it.
// APPEND a new param or enum option, to the table and here. Anything else (a
// reorder, a removal, a type, an option renamed or moved) bumps
// CODEC_VERSION: update PIN_VERSION and this list together.
const PIN_VERSION = 6;
const ANCHORS = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const PIN: ReadonlyArray<readonly unknown[]> = [
  ["gridSize", "number"], // 0
  ["shape", "enum", ["rect", "heart", "star", "fish", "tree", "ring", "circle"]],
  ["startAnchor", "enum", ANCHORS],
  ["exitAnchor", "enum", ANCHORS],
  ["weaveDensity", "number"],
  ["turnBias", "number"], // 5
  ["slack", "number"],
  ["simSpeed", "number"],
  ["drag", "number"],
  ["repulsion", "number"],
  ["bend", "number"], // 10
  ["smooth", "number"],
  ["stiffness", "number"],
  ["gridAlign", "number"],
  ["threadWidth", "number"],
  ["gap", "number"], // 15
  ["moveSpeed", "number"],
  ["cuspRadius", "number"],
  ["fadeLength", "number"],
  ["flowStrength", "number"],
  ["flowSpeed", "number"], // 20
  ["tugLimit", "number"],
  ["snapBack", "number"],
  ["soundMode", "enum", ["none", "manual", "random", "music"]],
  [
    "pitchSpace", "enum",
    ["chromatic", "pentMajor", "pentMinor", "hirajoshi", "insen", "dorian",
      "lydian", "wholeTone", "harmMinor"],
  ],
  ["octaves", "number"], // 25
  ["soundSpeed", "number"],
  ["volume", "number"],
  ["reverb", "number"],
  ["brightness", "number"],
  ["sustain", "number"], // 30
  ["shimmer", "number"],
  ["pickPosition", "number"],
  ["snappiness", "number"],
  [
    "rootNote", "enum",
    ["seed", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  ],
  ["tonicEmphasis", "number"], // 35
  ["pulseSpacing", "number"],
  ["hueShift", "number"],
  ["gamutArc", "number"],
  ["palette", "enum", ["pastel", "jewel", "ember", "moss", "ink"]],
  ["pathColor", "color"], // 40
  ["branchDensity", "number"],
  ["fourWayFraction", "number"],
  ["deadEndDensity", "number"],
  ["pluckStyle", "enum", ["soft", "string"]],
  ["mazeFabric", "boolean"], // 45
  ["deadEnds", "boolean"],
  ["pathViz", "enum", ["gold", "trail", "string"]],
  ["cameraMode", "enum", ["fit", "follow"]],
  ["trailLength", "number"],
  ["tension", "number"], // 50
  // K76 stage 2c: the fog flag became the exploration mode (v6).
  ["exploration", "enum", ["off", "fog", "threads"]],
  ["fowRadius", "number"],
  ["fowIntro", "boolean"],
  ["colorScheme", "enum", ["mono", "strands", "depth", "segments", "noise"]],
  ["junctionBlend", "number"], // 55
  [
    "appearMode", "enum",
    ["instant", "ink-dust", "trace-burn", "trace-rainbow", "trace-roots",
      "bloom-comet", "random", "custom"],
  ],
  ["appearSequence", "enum", ["instant", "trace", "bloom", "draw", "ink"]],
  ["appearSpeed", "number"],
  ["appearFx", "enum", ["none", "rainbow", "comet", "dust", "burn", "roots"]],
  ["pluckSize", "number"], // 60
  ["pluckGhost", "number"],
  ["pluckReach", "enum", ["run", "lobe"]],
  ["physics", "boolean"],
  ["entranceClearance", "number"],
  ["exitClearance", "number"], // 65
  ["junctionSpacing", "number"],
  [
    "background", "enum",
    ["none", "vellum", "mist", "wash", "silk", "aurora", "contours"],
  ],
  ["backgroundIntensity", "number"],
  ["pulseReach", "number"],
  ["backgroundSpeed", "number"], // 70
  ["deadEndLength", "number"],
  ["backgroundScale", "number"],
  ["backgroundDetail", "number"],
  ["backgroundFibers", "number"],
  ["backgroundGrain", "number"], // 75
  ["backgroundAngle", "number"],
  ["backgroundColorMode", "enum", ["gamut", "custom"]],
  ["backgroundBase", "color"],
  ["backgroundAccent1", "color"],
  ["backgroundAccent2", "color"], // 80
  ["backgroundAccent3", "color"],
  ["settleBudget", "number"],
  ["loadSettle", "number"],
  ["clock", "enum", ["turn", "realtime"]],
  ["playerPace", "number"], // 85
  ["minoWanderPace", "number"],
  ["minoHuntPace", "number"],
  ["minoPaceJitter", "number"],
  ["minoPauseChance", "number"],
  ["minoPauseMin", "number"], // 90
  ["minoPauseMax", "number"],
  ["minoDetect", "number"],
  ["minoLose", "number"],
  ["minoCatch", "number"],
  ["minoDeadEnds", "number"], // 95
  ["minoRoam", "number"],
  ["minoWake", "number"],
  ["minoFog", "enum", ["always", "hunting", "never"]],
  ["confetti", "boolean"],
  ["confettiAmount", "number"], // 100
  ["pluckWhole", "number"],
  ["pluckCrossings", "enum", ["through", "ride", "pinch"]],
  ["pluckGlow", "enum", ["off", "instead", "with", "fallback"]],
  ["markerSize", "number"], // 104, K98
  ["hoverGlow", "number"], // 105, K145
  ["minoToward", "boolean"], // 106, K174
  ["minoRefog", "boolean"], // 107, K174
  // (v4 had K111 stage 2's highlightMode at 108; v5 removed it, K111 stage 3.)
  ["minotaur", "enum", ["off", "hunter", "guard", "stalker"]], // 108, K80 turns
  ["minoSpeed", "enum", ["half", "one", "charge", "two"]],
  ["minoTelegraph", "boolean"],
  ["minoSight", "number"],
  ["minoRoamRuns", "number"],
  ["minoTerritory", "number"],
  ["minoAccuracy", "number"],
  ["minoPause", "number"],
  ["minoSleep", "number"], // 116
  ["hCutShare", "number"], // 117, K74 stage 2 (H1)
  ["fire", "enum", ["off", "fuse"]], // 118, K114
  ["fireSpeed", "number"],
  ["fireDelay", "number"], // 120
  // K279 stage 1.
  ["pluckRipple", "enum", ["off", "wave", "glint", "ring"]], // 121
  ["rippleStrength", "number"],
  ["rippleAuto", "number"],
  ["pluckSheen", "number"],
  ["pluckTug", "number"],
  ["tugAuto", "boolean"],
  ["autoPluckGain", "number"], // 127
  ["minoRestart", "boolean"], // 128, K80 turns stage 2 (K273)
  ["minoLair", "boolean"], // 129
  ["hoverGlowWidth", "number"], // 130, K111 stage 4
  ["hoverGlowLength", "number"], // 131, K298
  ["hoverGlowFade", "number"], // 132
  ["pickMargin", "number"], // 133, K298
  ["pickChoiceRatio", "number"], // 134
  ["physicsWorker", "boolean"], // 135, K7 stage 3
  ["revealDistance", "number"], // 136, K76 stage 2c
  ["revealFade", "number"], // 137
  ["revealLook", "enum", ["fade", "halo", "glow", "dots", "fray", "beacon"]], // 138
  ["burnt", "enum", ["gone", "char"]], // 139, K290 (burn stage 3a)
  ["minoGiveUp", "number"], // 140, K80 turns 3a
  ["minoRoamMin", "number"], // 141
  ["minoTurnPull", "number"], // 142
  ["minoGuardSight", "number"], // 143, K294
  ["minoGuardAccuracy", "number"], // 144
  ["minoStalkerAccuracy", "number"], // 145
  ["fireClock", "enum", ["turn", "realtime"]], // 146, K114 stage 2
  ["fireSpeedRt", "number"], // 147, K440
  ["fireDelayRt", "number"], // 148
  ["revealFinish", "boolean"], // 149, K465
  ["revealEndCross", "enum", ["under", "past", "back"]], // 150, K466
  ["revealEndGlow", "enum", ["soft", "bright"]], // 151
  ["exitCorridor", "number"], // 152
  ["exitFlank", "enum", ["stub", "away", "near"]],
  ["exitTaperRadius", "number"],
  ["exitTaperStrength", "number"], // 155
];

const asPin = (p: CodecParam): readonly unknown[] =>
  p.type === "enum" ? [p.name, p.type, [...p.options]] : [p.name, p.type];

const B64URL =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
// A hand-written bit string ("1 0101 ...", spaces ignored) as base64url,
// zero-padded to whole chars - an encoder-independent reference.
const bitsToBlob = (bits: string): string => {
  const b = bits.replace(/\s+/g, "");
  let out = "";
  for (let i = 0; i < b.length; i += 6) {
    out += B64URL[Number.parseInt(b.slice(i, i + 6).padEnd(6, "0"), 2)];
  }
  return out;
};
// Elias gamma bits of n (so cases can follow the table's length).
const gamma = (n: number): string => {
  const b = n.toString(2);
  return "0".repeat(b.length - 1) + b;
};
// The version bits every blob starts with.
const V = gamma(CODEC_VERSION);

// Deterministic PRNG (mulberry32) for the property tests.
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

describe("codec table", () => {
  it("pins CODEC_PARAMS literally: order, types, enum options", () => {
    expect(CODEC_VERSION).toBe(PIN_VERSION);
    expect(CODEC_PARAMS.map(asPin)).toEqual(PIN);
  });

  // Fails when a param is added to PARAM_DEFAULTS but not APPENDED to the
  // codec table (or listed twice).
  it("lists every PARAM_DEFAULTS key exactly once, nothing else", () => {
    const names = CODEC_PARAMS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    expect([...names].sort()).toEqual(Object.keys(PARAM_DEFAULTS).sort());
  });

  it("types every param by its default; enums list every current option", () => {
    const enumNames = Object.keys(ENUM_OPTIONS);
    for (const p of CODEC_PARAMS) {
      const def = D[p.name];
      if (p.type === "number" || p.type === "boolean") {
        expect([p.name, typeof def]).toEqual([p.name, p.type]);
      } else if (p.type === "color") {
        expect([p.name, def]).toEqual([p.name, expect.stringMatching(/^#[0-9a-f]{6}$/)]);
        expect(enumNames).not.toContain(p.name);
      } else {
        expect(enumNames).toContain(p.name);
        expect(new Set(p.options).size).toBe(p.options.length);
        const options = ENUM_OPTIONS[p.name as keyof typeof ENUM_OPTIONS]!;
        for (const o of options) expect([p.name, p.options]).toEqual([p.name, expect.arrayContaining([o])]);
        expect(p.options).toContain(def);
      }
    }
    // Every string param is an enum except the colors.
    const stringParams = Object.keys(D).filter((k) => typeof D[k] === "string");
    expect(stringParams.filter((k) => !enumNames.includes(k))).toEqual([
      "pathColor",
      "backgroundBase",
      "backgroundAccent1",
      "backgroundAccent2",
      "backgroundAccent3",
    ]);
  });
});

// K76 stage 2c: a reveal look's codec option index is its shader code, so
// the param's option list is the shader's look list, in order.
describe("reveal looks", () => {
  it("lists the shader's end looks in the shader's order", () => {
    expect(REVEAL_LOOKS).toEqual([...EXPLORE_LOOKS]);
  });
});

describe("token format", () => {
  it("writes a bare seed when nothing differs from today's defaults", () => {
    expect(encodeToken(2430477599, PARAM_DEFAULTS, D)).toBe("1471kin");
    expect(encodeToken(0, {}, D)).toBe("0");
    expect(encodeToken(4294967295, {}, D)).toBe("1z141z3");
    expect(decodeToken("1471kin", D)).toEqual({ seed: 2430477599, values: D, error: null });
    // An all-default blob ("N" = version 6, no entries; earlier builds
    // wrote v5's "L" and v4's "J") still reads as today's defaults.
    expect(bitsToBlob(`${V} 1`)).toBe("N");
    expect(decodeToken("1471kin.N", D)).toEqual({ seed: 2430477599, values: D, error: null });
  });

  // Defaults come from the caller: a link reads whatever defaults it is
  // given, and a listed boolean is the given default flipped.
  it("reads a link against the defaults it is given", () => {
    const moved = { ...D, gridSize: 20, mazeFabric: false };
    const d = decodeToken("7.MUfTJ4ZJbGRMK", moved);
    expect(d.error).toBeNull();
    expect(d.values.gridSize).toBe(20); // not listed: the given default
    expect(d.values.mazeFabric).toBe(true); // listed: the given default flipped
    expect(d.values.threadWidth).toBe(0.64); // listed: its value
  });

  // Links written under codec v1-v3 (before K132) are another version: the
  // seed stays, every setting is today's default.
  it("reads another version's blob as its seed at today's defaults", () => {
    const cases: Array<[string, number, RegExp]> = [
      ["1471kin.U", 2430477599, /^old link version 2$/],
      // K76 stage 2c: v5 (before the exploration mode).
      ["1471kin.L", 2430477599, /^old link version 5$/],
      ["1471kin.c", 2430477599, /^old link version 3$/],
      ["7.ZR9MnhklsZEwo", 7, /^old link version 3$/],
      ["7.RR9MnhklsZEwo", 7, /^old link version 2$/],
      ["7.lH0yeGSWxkTCg", 7, /^old link version 1$/],
      [
        `7.${bitsToBlob(`${gamma(CODEC_VERSION + 1)} 1`)}`,
        7,
        new RegExp(`^unknown link version ${CODEC_VERSION + 1}$`),
      ],
    ];
    for (const [token, seed, why] of cases) {
      const d = decodeToken(token, D);
      expect([token, d.seed, d.error]).toEqual([token, seed, expect.stringMatching(why)]);
      expect(d.values).toEqual(D);
    }
  });

  // K79 stage B: the shape params and custom colors round-trip.
  it("writes the background shape and custom colors", () => {
    const values = {
      ...D,
      backgroundScale: 0.55,
      backgroundDetail: 2,
      backgroundFibers: 0,
      backgroundGrain: 2.75,
      backgroundAngle: 135,
      backgroundColorMode: "custom",
      backgroundBase: "#0a0b0c",
      backgroundAccent1: "#ffffff",
      backgroundAccent2: "#000000",
      backgroundAccent3: "#12ab9f",
    };
    const decoded = decodeToken(encodeToken(7, values, D), D);
    expect(decoded.error).toBeNull();
    expect(decoded.values).toEqual(values);
  });

  // backgroundSpeed's AUTO default is negative: the number codes carry the
  // sign ("-" = 11), and explicit speeds round-trip.
  it("writes the background speed: auto by omission, explicit values", () => {
    expect(numberText(-1)).toBe("-1");
    for (const speed of [0, 0.05, 1, 1.45, 3, 8]) {
      const token = encodeToken(7, { ...D, backgroundSpeed: speed }, D);
      expect([speed, decodeToken(token, D).values.backgroundSpeed]).toEqual([speed, speed]);
    }
    expect(encodeToken(7, { ...D, backgroundSpeed: -1 }, D)).toBe("7");
  });

  it("writes the documented bitstream", () => {
    const values = {
      ...D,
      threadWidth: 0.64,
      palette: "moss",
      pathColor: "#6c644c",
      mazeFabric: false,
    };
    const bits = [
      V, // version 5 = gamma(5) = "00101"
      "00101", // 4 entries = gamma(4 + 1)
      "0001111", // index 14 threadWidth: gamma(14 - -1 = 15)
      "1010 0110 0100 1111", // ".64", then the terminator 15
      "000011001", // index 39 palette: gamma(39 - 14 = 25)
      "00100", // "moss" = option 3: gamma(3 + 1)
      "1", // index 40 pathColor: gamma(1)
      "0110 1100 0110 0100 0100 1100", // 0x6c644c
      "00101", // index 45 mazeFabric: gamma(5); a boolean has no value bits
    ].join(" ");
    expect(encodeToken(7, values, D)).toBe(`7.${bitsToBlob(bits)}`);
    expect(encodeToken(7, values, D)).toBe("7.MUfTJ4ZJbGRMK");
    const back = decodeToken("7.MUfTJ4ZJbGRMK", D);
    expect(back.error).toBeNull();
    expect(back.values).toEqual(values);
  });

  it("writes numbers at 6 decimals, shortest text first", () => {
    expect(numberText(0.6000000000000001)).toBe(".6");
    expect(numberText(1.4500000000000002)).toBe("1.45");
    expect(numberText(1.734723475976807e-17)).toBe("0");
    expect(numberText(-0)).toBe("0");
    expect(numberText(-1e-7)).toBe("0");
    expect(numberText(-0.5)).toBe("-.5");
    expect(numberText(-15)).toBe("-15");
    expect(numberText(0.000001)).toBe(".000001");
    expect(numberText(312)).toBe("312");
    expect(numberText(1e21)).toBe("1000000000000000000000");
    expect(numberText(NaN)).toBeNull();
    expect(numberText(Infinity)).toBeNull();
  });

  it("leaves out unchanged values, omitted names and unwritable values", () => {
    const values = {
      repulsion: 1.4500000000000002, // = the default after rounding
      gridSize: 12,
      shape: "moon", // no such option
      pathColor: "not a color",
      gap: NaN,
      cuspRadius: 2.4,
    };
    const all = encodeToken(1, values, D);
    expect(decodeToken(all, D).values).toEqual({ ...D, gridSize: 12, cuspRadius: 2.4 });
    expect(encodeToken(1, values, D, new Set(["gridSize", "cuspRadius"]))).toBe("1");
  });

  it("reads `<seed>.` (a trailing sentence period) as the bare seed", () => {
    expect(decodeToken("1471kin.", D)).toEqual(decodeToken("1471kin", D));
    expect(decodeToken("7.MUfTJ4ZJbGRMK.", D)).toEqual(decodeToken("7.MUfTJ4ZJbGRMK", D));
    expect(decodeToken("1471kin", D).error).toBeNull();
  });
});

describe("token robustness", () => {
  const good = "7.MUfTJ4ZJbGRMK";

  it("rejects every truncation, keeping the seed", () => {
    const blob = good.slice(2);
    for (let n = 1; n < blob.length; n++) {
      const d = decodeToken(`7.${blob.slice(0, n)}`, D);
      expect(d.seed).toBe(7);
      expect(d.error).not.toBeNull();
      expect(d.values).toEqual(D);
    }
  });

  it("rejects malformed blobs, keeping the seed", () => {
    // Gamma bits (gamma, above), so the cases below follow the table.
    const size = CODEC_PARAMS.length;
    const cases: Array<[string, RegExp]> = [
      ["7.M!0y", /invalid character/], // "K" holds the version bits
      [`7.${bitsToBlob(`${V} 1`)}A`, /trailing data/], // a whole extra char
      // gridSize 1, then a non-zero padding bit.
      [`7.${bitsToBlob(`${V} 010 1 0001 1111 1`)}`, /trailing data/],
      [`7.${bitsToBlob(`${V} 00101`)}`, /truncated/], // 4 entries, none there
      // gridSize with an empty number (just the terminator).
      [`7.${bitsToBlob(`${V} 010 1 1111`)}`, /no number/],
      // gridSize with reserved code 12.
      [`7.${bitsToBlob(`${V} 010 1 1100 1111`)}`, /reserved number code/],
      // gridSize as ".": not a number.
      [`7.${bitsToBlob(`${V} 010 1 1010 1111`)}`, /no number/],
      // shape option 7 of 7.
      [`7.${bitsToBlob(`${V} 010 010 ${gamma(8)}`)}`, /option 7 out of range/],
      // One entry, at the first index past the end of the table.
      [
        `7.${bitsToBlob(`${V} 010 ${gamma(size + 1)}`)}`,
        new RegExp(`index ${size} out of range`),
      ],
      // More entries than the table has params.
      [`7.${bitsToBlob(`${V} ${gamma(size + 2)}`)}`, new RegExp(`${size + 1} entries`)],
      // 40 leading zeros: no sane count.
      [`7.${bitsToBlob(`${V} ${"0".repeat(40)} 1`)}`, /oversized/],
    ];
    for (const [token, why] of cases) {
      const d = decodeToken(token, D);
      expect([token, d.seed, d.error]).toEqual([token, 7, expect.stringMatching(why)]);
      expect(d.values).toEqual(D);
    }
    // The control: the same gridSize entry with zero padding reads.
    expect(decodeToken(`7.${bitsToBlob(`${V} 010 1 0001 1111`)}`, D)).toEqual({
      seed: 7,
      values: { ...D, gridSize: 1 },
      error: null,
    });
  });

  it("reports an unreadable seed", () => {
    for (const token of ["", "UPPER", "12345678", "a-b", ".AAA", "x y"]) {
      const d = decodeToken(token, D);
      expect([token, d.seed]).toEqual([token, null]);
      expect(d.error).toMatch(/unreadable seed/);
      expect(d.values).toEqual(D);
    }
  });

  it("never throws on random input", () => {
    const rand = rng(99);
    const alphabet = B64URL + ".=&%! é";
    for (let k = 0; k < 3000; k++) {
      let s = (Math.floor(rand() * 2 ** 32) >>> 0).toString(36) + ".";
      // Half the cases start on a v5 header, so the parse gets past it.
      if (rand() < 0.5) s += "K";
      const n = Math.floor(rand() * 30);
      for (let i = 0; i < n; i++) {
        s += alphabet[Math.floor(rand() * alphabet.length)];
      }
      const d = decodeToken(s, D);
      expect(d.seed).not.toBeNull();
      expect(Object.keys(d.values).sort()).toEqual(Object.keys(D).sort());
    }
  });
});

describe("token round trip (seeded property test)", () => {
  // A random value of the param's type: numbers mix short decimals, slider
  // float noise, negatives, big values and noisy copies of the default.
  const randomValue = (p: CodecParam, rand: () => number): ParamValue => {
    switch (p.type) {
      case "boolean":
        return rand() < 0.5;
      case "enum": {
        const options = ENUM_OPTIONS[p.name as keyof typeof ENUM_OPTIONS]!;
        return options[Math.floor(rand() * options.length)];
      }
      case "color": {
        const hex = Math.floor(rand() * 0x1000000).toString(16).padStart(6, "0");
        return "#" + (rand() < 0.2 ? hex.toUpperCase() : hex);
      }
      case "number": {
        const r = rand();
        const decimal =
          Math.floor(rand() * 10000) / 10 ** Math.floor(rand() * 7);
        if (r < 0.3) return decimal;
        if (r < 0.5) return decimal + (rand() - 0.5) * 1e-11;
        if (r < 0.6) return -decimal;
        if (r < 0.7) return Math.floor(rand() * 1e9) + decimal;
        if (r < 0.8) return (D[p.name] as number) + (rand() - 0.5) * 1e-10;
        return Math.floor(rand() * 1000);
      }
    }
  };
  // What a value reads back as: numbers at their written precision,
  // colors lowercased.
  const canonical = (p: CodecParam, v: ParamValue): ParamValue => {
    if (p.type === "number") return clampParamValue(p.name, Number(numberText(v as number)));
    if (p.type === "color") return (v as string).toLowerCase();
    return v;
  };

  it("decodes exactly what it encodes, over random subsets and values", () => {
    const rand = rng(20261011);
    for (let k = 0; k < 2000; k++) {
      const seed = Math.floor(rand() * 2 ** 32) >>> 0;
      const share = rand();
      const values: Record<string, ParamValue> = {};
      const omit = new Set<string>();
      for (const p of CODEC_PARAMS) {
        if (rand() < share) values[p.name] = randomValue(p, rand);
        else if (rand() < 0.5) values[p.name] = D[p.name];
        if (rand() < 0.05) omit.add(p.name);
      }
      const token = encodeToken(seed, values, D, omit);
      expect(token).toMatch(/^[0-9a-z]{1,7}(\.[A-Za-z0-9_-]+)?$/);
      const d = decodeToken(token, D);
      expect(d.error).toBeNull();
      expect(d.seed).toBe(seed);
      const expected: Record<string, ParamValue> = { ...D };
      for (const p of CODEC_PARAMS) {
        if (Object.hasOwn(values, p.name) && !omit.has(p.name)) {
          expected[p.name] = canonical(p, values[p.name]);
        }
      }
      expect(d.values).toEqual(expected);
      // One token per state: re-encoding the decoded values changes nothing.
      expect(encodeToken(seed, d.values, D, omit)).toBe(token);
    }
  });
});
