import { describe, expect, it } from "vitest";
import {
  CODEC_TABLES,
  CODEC_V1,
  CODEC_VERSION,
  codecDefaults,
  codecTable,
  decodeToken,
  encodeToken,
  numberText,
} from "../../src/ui/param_codec";
import type { CodecParam, ParamValue } from "../../src/ui/param_codec";
import { ENUM_OPTIONS, PARAM_DEFAULTS } from "../../src/ui/url_state";

// CODEC_V1, pinned literally: [name, type, default, options?] per param, in
// table order (the index is the position). Every link written with v1
// depends on all of it. If this fails:
// - you APPENDED a param (or an enum option) to the current table: append
//   the same here. That is the only edit v1 allows.
// - anything else (a default, the order, a type, an option's name or
//   position): don't edit v1 - add a CODEC_V2 (see param_codec.ts).
const V1_PIN: ReadonlyArray<readonly unknown[]> = [
  ["gridSize", "number", 18], // 0
  ["shape", "enum", "rect", ["rect", "heart", "star", "fish", "tree", "ring"]],
  ["startAnchor", "enum", "nw", ["nw", "n", "ne", "e", "se", "s", "sw", "w"]],
  ["exitAnchor", "enum", "se", ["nw", "n", "ne", "e", "se", "s", "sw", "w"]],
  ["weaveDensity", "number", 0.35],
  ["turnBias", "number", 0.7], // 5
  ["slack", "number", 0.55],
  ["simSpeed", "number", 5],
  ["drag", "number", 0.5],
  ["repulsion", "number", 1.45],
  ["bend", "number", 2], // 10
  ["smooth", "number", 0.75],
  ["stiffness", "number", 1],
  ["gridAlign", "number", 0.1],
  ["threadWidth", "number", 0.52],
  ["gap", "number", 0.04], // 15
  ["moveSpeed", "number", 1],
  ["cuspRadius", "number", 3],
  ["fadeLength", "number", 0.14],
  ["flowStrength", "number", 0.3],
  ["flowSpeed", "number", 0.5], // 20
  ["tugLimit", "number", 2],
  ["snapBack", "number", 4],
  ["soundMode", "enum", "music", ["none", "manual", "random", "music"]],
  [
    "pitchSpace", "enum", "chromatic",
    ["chromatic", "pentMajor", "pentMinor", "hirajoshi", "insen", "dorian",
      "lydian", "wholeTone", "harmMinor"],
  ],
  ["octaves", "number", 3], // 25
  ["soundSpeed", "number", 1],
  ["volume", "number", 0.33],
  ["reverb", "number", 0.42],
  ["brightness", "number", 0.5],
  ["sustain", "number", 0.5], // 30
  ["shimmer", "number", 0.4],
  ["pickPosition", "number", 0.4],
  ["snappiness", "number", 0.88],
  [
    "rootNote", "enum", "seed",
    ["seed", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  ],
  ["tonicEmphasis", "number", 0.5], // 35
  ["pulseSpacing", "number", 2.5],
  ["hueShift", "number", 300],
  ["gamutArc", "number", 130],
  ["palette", "enum", "pastel", ["pastel", "jewel", "ember", "moss", "ink"]],
  ["pathColor", "color", "#eccc41"], // 40
  ["branchDensity", "number", 0.35],
  ["fourWayFraction", "number", 0.12],
  ["deadEndDensity", "number", 0.25],
  ["pluckStyle", "enum", "string", ["soft", "string"]],
  ["mazeFabric", "boolean", true], // 45
  ["deadEnds", "boolean", false],
  ["pathViz", "enum", "gold", ["gold", "trail", "string"]],
  ["cameraMode", "enum", "fit", ["fit", "follow"]],
  ["trailLength", "number", 5],
  ["tension", "number", 0.45], // 50
  ["fogOfWar", "boolean", false],
  ["fowRadius", "number", 4],
  ["fowIntro", "boolean", false],
  [
    "colorScheme", "enum", "segments",
    ["mono", "strands", "depth", "segments", "noise"],
  ],
  ["junctionBlend", "number", 0], // 55
  [
    "appearMode", "enum", "custom",
    ["instant", "ink-dust", "trace-burn", "trace-rainbow", "trace-roots",
      "bloom-comet", "random", "custom"],
  ],
  [
    "appearSequence", "enum", "trace",
    ["instant", "trace", "bloom", "draw", "ink"],
  ],
  ["appearSpeed", "number", 2.2],
  [
    "appearFx", "enum", "burn",
    ["none", "rainbow", "comet", "dust", "burn", "roots"],
  ],
];

const asPin = (p: CodecParam): readonly unknown[] =>
  p.type === "enum"
    ? [p.name, p.type, p.def, [...p.options]]
    : [p.name, p.type, p.def];

const current = (): readonly CodecParam[] => codecTable(CODEC_VERSION)!.params;

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

describe("codec tables", () => {
  it("pins CODEC_V1 literally: order, types, enum options, defaults", () => {
    expect(CODEC_V1.version).toBe(1);
    expect(CODEC_V1.params.map(asPin)).toEqual(V1_PIN);
  });

  it("registers every table, oldest first; new links use the newest", () => {
    expect(CODEC_TABLES.map((t) => t.version)).toEqual(
      CODEC_TABLES.map((_, i) => i + 1)
    );
    expect(CODEC_TABLES[0]).toBe(CODEC_V1);
    expect(CODEC_VERSION).toBe(CODEC_TABLES.length);
    expect(codecTable(CODEC_VERSION + 1)).toBeUndefined();
  });

  // Fails when a param is added to PARAM_DEFAULTS but not APPENDED to the
  // current codec table (or listed twice).
  it("lists every PARAM_DEFAULTS key exactly once, nothing else", () => {
    const names = current().map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    expect([...names].sort()).toEqual(Object.keys(PARAM_DEFAULTS).sort());
  });

  // Fails when a default changes: that needs a new codec version, since
  // every link written so far omits the old default.
  it("has PARAM_DEFAULTS as the current table's defaults", () => {
    const D = PARAM_DEFAULTS as unknown as Record<string, ParamValue>;
    for (const p of current()) expect([p.name, p.def]).toEqual([p.name, D[p.name]]);
  });

  it("types every param by its default; enums list every current option", () => {
    const D = PARAM_DEFAULTS as unknown as Record<string, ParamValue>;
    const enumNames = Object.keys(ENUM_OPTIONS);
    for (const p of current()) {
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
        expect(p.options).toContain(p.def);
      }
    }
    // Every string param is an enum except the one color.
    const stringParams = Object.keys(D).filter((k) => typeof D[k] === "string");
    expect(stringParams.filter((k) => !enumNames.includes(k))).toEqual(["pathColor"]);
  });

  it("defaults of a version cover every param of the current table", () => {
    for (const t of CODEC_TABLES) {
      const d = codecDefaults(t.version);
      for (const p of current()) expect(Object.hasOwn(d, p.name)).toBe(true);
    }
  });
});

describe("token format", () => {
  it("is a bare base-36 seed when nothing differs from the v1 defaults", () => {
    expect(encodeToken(2430477599, PARAM_DEFAULTS)).toBe("1471kin");
    expect(encodeToken(0, {})).toBe("0");
    expect(encodeToken(4294967295, {})).toBe("1z141z3");
  });

  it("writes the documented bitstream", () => {
    const values = {
      ...PARAM_DEFAULTS,
      threadWidth: 0.64,
      palette: "moss",
      pathColor: "#6c644c",
      mazeFabric: false,
    };
    const bits = [
      "1", // version 1 = gamma(1)
      "00101", // 4 entries = gamma(4 + 1)
      "0001111", // index 14 threadWidth: gamma(14 - -1 = 15)
      "1010 0110 0100 1111", // ".64", then the terminator 15
      "000011001", // index 39 palette: gamma(39 - 14 = 25)
      "00100", // "moss" = option 3: gamma(3 + 1)
      "1", // index 40 pathColor: gamma(1)
      "0110 1100 0110 0100 0100 1100", // 0x6c644c
      "00101", // index 45 mazeFabric: gamma(5); a boolean has no value bits
    ].join(" ");
    expect(encodeToken(7, values)).toBe(`7.${bitsToBlob(bits)}`);
    expect(encodeToken(7, values)).toBe("7.lH0yeGSWxkTCg");
    const back = decodeToken("7.lH0yeGSWxkTCg");
    expect(back.error).toBeNull();
    expect(back.values).toEqual(values);
  });

  it("writes numbers as the legacy short links did", () => {
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
    const all = encodeToken(1, values);
    expect(decodeToken(all).values).toEqual({
      ...codecDefaults(1),
      gridSize: 12,
      cuspRadius: 2.4,
    });
    expect(encodeToken(1, values, new Set(["gridSize", "cuspRadius"]))).toBe("1");
  });

  it("reads `<seed>.` (a trailing sentence period) as the bare seed", () => {
    expect(decodeToken("1471kin.")).toEqual(decodeToken("1471kin"));
    expect(decodeToken("7.lH0yeGSWxkTCg.").values).toEqual(
      decodeToken("7.lH0yeGSWxkTCg").values
    );
    expect(decodeToken("1471kin").error).toBeNull();
  });
});

describe("token robustness", () => {
  const good = "7.lH0yeGSWxkTCg";

  it("rejects every truncation, keeping the seed", () => {
    const blob = good.slice(2);
    for (let n = 1; n < blob.length; n++) {
      const d = decodeToken(`7.${blob.slice(0, n)}`);
      expect(d.seed).toBe(7);
      expect(d.error).not.toBeNull();
      expect(d.values).toEqual(codecDefaults(CODEC_VERSION));
    }
  });

  it("rejects malformed blobs and unknown versions, keeping the seed", () => {
    // Gamma bits, so the cases below follow the table's length.
    const gamma = (n: number): string => {
      const b = n.toString(2);
      return "0".repeat(b.length - 1) + b;
    };
    const size = CODEC_V1.params.length;
    const cases: Array<[string, RegExp]> = [
      ["7.l!0y", /invalid character/],
      [`7.${bitsToBlob("010 1")}`, /unknown version 2/], // gamma(2) = v2
      [`7.${bitsToBlob("1 1")}A`, /trailing data/], // a whole extra char
      [`7.${bitsToBlob("1 1 01")}`, /trailing data/], // non-zero padding
      [`7.${bitsToBlob("1 00101")}`, /truncated/], // 4 entries, none there
      // gridSize with an empty number (just the terminator).
      [`7.${bitsToBlob("1 010 1 1111")}`, /no number/],
      // gridSize with reserved code 12.
      [`7.${bitsToBlob("1 010 1 1100 1111")}`, /reserved number code/],
      // gridSize as ".": not a number.
      [`7.${bitsToBlob("1 010 1 1010 1111")}`, /no number/],
      // shape option 6 of 6.
      [`7.${bitsToBlob("1 010 010 00111")}`, /option 6 out of range/],
      // One entry, at the first index past the end of v1.
      [
        `7.${bitsToBlob(`1 010 ${gamma(size + 1)}`)}`,
        new RegExp(`index ${size} out of range`),
      ],
      // More entries than v1 has params.
      [`7.${bitsToBlob(`1 ${gamma(size + 2)}`)}`, new RegExp(`${size + 1} entries`)],
      // 40 leading zeros: no sane count.
      [`7.${bitsToBlob("1" + "0".repeat(40) + "1")}`, /oversized/],
    ];
    for (const [token, why] of cases) {
      const d = decodeToken(token);
      expect([token, d.seed, d.error]).toEqual([token, 7, expect.stringMatching(why)]);
      expect(d.values).toEqual(codecDefaults(CODEC_VERSION));
    }
  });

  it("reports an unreadable seed", () => {
    for (const token of ["", "UPPER", "12345678", "a-b", ".AAA", "x y"]) {
      const d = decodeToken(token);
      expect([token, d.seed]).toEqual([token, null]);
      expect(d.error).toMatch(/unreadable seed/);
    }
  });

  it("never throws on random input", () => {
    const rand = rng(99);
    const alphabet = B64URL + ".=&%! é";
    for (let k = 0; k < 3000; k++) {
      let s = (Math.floor(rand() * 2 ** 32) >>> 0).toString(36) + ".";
      const n = Math.floor(rand() * 30);
      for (let i = 0; i < n; i++) {
        s += alphabet[Math.floor(rand() * alphabet.length)];
      }
      const d = decodeToken(s);
      expect(d.seed).not.toBeNull();
      expect(Object.keys(d.values).sort()).toEqual(
        Object.keys(codecDefaults(1)).sort()
      );
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
        if (r < 0.8) return p.def + (rand() - 0.5) * 1e-10;
        return Math.floor(rand() * 1000);
      }
    }
  };
  // What a value reads back as: numbers at their written precision,
  // colors lowercased.
  const canonical = (p: CodecParam, v: ParamValue): ParamValue => {
    if (p.type === "number") return Number(numberText(v as number));
    if (p.type === "color") return (v as string).toLowerCase();
    return v;
  };

  it("decodes exactly what it encodes, over random subsets and values", () => {
    const rand = rng(20261011);
    const params = current();
    for (let k = 0; k < 2000; k++) {
      const seed = Math.floor(rand() * 2 ** 32) >>> 0;
      const share = rand();
      const values: Record<string, ParamValue> = {};
      const omit = new Set<string>();
      for (const p of params) {
        if (rand() < share) values[p.name] = randomValue(p, rand);
        else if (rand() < 0.5) values[p.name] = p.def;
        if (rand() < 0.05) omit.add(p.name);
      }
      const token = encodeToken(seed, values, omit);
      expect(token).toMatch(/^[0-9a-z]{1,7}(\.[A-Za-z0-9_-]+)?$/);
      const d = decodeToken(token);
      expect(d.error).toBeNull();
      expect(d.seed).toBe(seed);
      const expected: Record<string, ParamValue> = { ...codecDefaults(1) };
      for (const p of params) {
        if (Object.hasOwn(values, p.name) && !omit.has(p.name)) {
          expected[p.name] = canonical(p, values[p.name]);
        }
      }
      expect(d.values).toEqual(expected);
      // One token per state: re-encoding the decoded values changes nothing.
      expect(encodeToken(seed, d.values, omit)).toBe(token);
    }
  });
});
