import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPEAR_PRESETS,
  ENUM_OPTIONS,
  PARAM_DEFAULTS,
  applyAppearMode,
  encodeParams,
  parseParams,
  writeParams,
} from "../../src/ui/url_state";
import type { AppearPreset, UrlParams } from "../../src/ui/url_state";
import { CODEC_V1, numberText } from "../../src/ui/param_codec";

const withSeed = (seed: number, over: Partial<UrlParams> = {}): UrlParams => ({
  ...PARAM_DEFAULTS,
  seed,
  ...over,
});

// The user's rect design as a legacy short link (2026-10-11 morning)...
const USER_LEGACY =
  "s=1471kin&gs=12&rep=1&bd=1&sm=.25&ga=0&tw=.64&gap=.12&cr=2.4&fl=0&fw=.25&fv=1.15&vol=.18&hs=312&pal=moss&pc=6c644c&as=2.1";
// ...as the v1 compact link written this afternoon (121 -> 55 chars)...
const USER_COMPACT_V1 = "1471kin.hGJeJH4_ol9B-mT9CXoqT4fol-NCvnoY8UYl6JbGRMCRUPg";
// ...as a v2 link...
const USER_COMPACT_V2 = "1471kin.QSiXiR-P6JfQfpk_Ql6Kk-H6JfjQr56GPFGJeiWxkTB4eyof";
// ...and as today's (v3) link. The design predates junctionBlend's 0.88
// and pluckSize's 1.75 defaults, so it keeps 0 and 1 - written out.
const USER_COMPACT = "1471kin.YTiXiR-P6JfQfpk_Ql6Kk-H6JfjQr56GPFGJeiWxkTB4eyofQ-";
const USER = withSeed(2430477599, {
  junctionBlend: 0,
  pluckSize: 1,
  gridSize: 12,
  repulsion: 1,
  bend: 1,
  smooth: 0.25,
  gridAlign: 0,
  threadWidth: 0.64,
  gap: 0.12,
  cuspRadius: 2.4,
  fadeLength: 0,
  flowStrength: 0.25,
  flowSpeed: 1.15,
  volume: 0.18,
  hueShift: 312,
  palette: "moss",
  pathColor: "#6c644c",
  appearSpeed: 2.1,
});

const warnings = (): ReturnType<typeof vi.spyOn> =>
  vi.spyOn(console, "warn").mockImplementation(() => {});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("links", () => {
  // Links OMIT defaults, so the defaults are part of every link's meaning.
  // ADDING a param is safe (append it to the codec table too - the codec
  // tests say so). If this fails because an EXISTING default changed on
  // purpose: that is a new codec version (see param_codec.ts), and this
  // pin moves to the new table.
  it("pins the defaults table", () => {
    expect(PARAM_DEFAULTS).toEqual({
      gridSize: 18, shape: "rect", startAnchor: "nw", exitAnchor: "se",
      weaveDensity: 0.35, turnBias: 0.7, slack: 0.55, simSpeed: 5, drag: 0.5,
      repulsion: 1.45, bend: 2, smooth: 0.75, stiffness: 1, gridAlign: 0.1,
      threadWidth: 0.52, gap: 0.04, moveSpeed: 1, cuspRadius: 3,
      fadeLength: 0.14, flowStrength: 0.3, flowSpeed: 0.5, tugLimit: 2,
      snapBack: 4, soundMode: "music", pitchSpace: "chromatic", octaves: 3,
      soundSpeed: 1, volume: 0.33, reverb: 0.42, brightness: 0.5,
      sustain: 0.5, shimmer: 0.4, pickPosition: 0.4, snappiness: 0.88,
      rootNote: "seed", tonicEmphasis: 0.5, pulseSpacing: 2.5, hueShift: 300,
      gamutArc: 130, palette: "pastel", pathColor: "#eccc41",
      branchDensity: 0.35, fourWayFraction: 0.12, deadEndDensity: 0.25,
      pluckStyle: "string", pluckSize: 1.75, pluckGhost: 0.35, pluckReach: "run",
      physics: true, mazeFabric: true, deadEnds: false, pathViz: "gold",
      cameraMode: "fit", trailLength: 5, tension: 0.45, fogOfWar: false,
      fowRadius: 4, fowIntro: false, colorScheme: "segments",
      junctionBlend: 0.88, appearMode: "custom", appearSequence: "trace", appearSpeed: 2.2,
      appearFx: "burn",
    });
  });

  it("is the seed plus a version tag for an all-default design", () => {
    // A bare seed is a v1 link: today's defaults except junctionBlend 0
    // (v2 moved that default), so current links name their version.
    expect(encodeParams(withSeed(2430477599))).toBe("1471kin.c");
    expect(parseParams("?1471kin.c")).toEqual(withSeed(2430477599));
    const v1 = withSeed(2430477599, { junctionBlend: 0, pluckSize: 1 });
    expect(parseParams("?1471kin")).toEqual(v1);
    expect(parseParams("1471kin")).toEqual(v1);
    expect(parseParams("?1471kin.")).toEqual(v1);
  });

  it("packs the user's rect design into one token", () => {
    expect(encodeParams(USER)).toBe(USER_COMPACT);
    expect(USER_COMPACT.length).toBe(58);
    expect(USER_LEGACY.length).toBe(121);
    expect(parseParams("?" + USER_COMPACT)).toEqual(USER);
    expect(parseParams("?" + USER_COMPACT_V2)).toEqual(USER); // v2 keeps its look
    expect(parseParams("?" + USER_COMPACT_V1)).toEqual(USER); // v1 keeps its look
    expect(parseParams("?" + USER_LEGACY)).toEqual(USER);
  });

  it("round-trips changed params at their written precision", () => {
    const p = withSeed(4294967295, {
      threadWidth: 0.6000000000000001, // slider-step float noise
      gap: 0,
      shape: "ring",
      mazeFabric: false,
      pathColor: "#ffd24a",
      hueShift: -15,
    });
    const q = encodeParams(p);
    expect(q).toBe("1z141z3.Z0YbTfDwtYr7_9JKK");
    expect(parseParams("?" + q)).toEqual({ ...p, threadWidth: 0.6 });
  });

  it("drops float noise that equals a default", () => {
    expect(encodeParams(withSeed(7, { repulsion: 1.4500000000000002 }))).toBe("7.c");
    expect(encodeParams(withSeed(7, { junctionBlend: 0.8800000000000001 }))).toBe("7.c");
    expect(encodeParams(withSeed(7, { pluckSize: 1.7500000000000002 }))).toBe("7.c");
  });

  it("leaves out appearance values a mode implies", () => {
    const preset = withSeed(7, {
      appearMode: "trace-rainbow",
      appearSequence: "trace",
      appearFx: "rainbow",
      appearSpeed: 2,
    });
    expect(encodeParams(preset)).toBe("7.aByQ");
    expect(parseParams("?7.aByQ")).toEqual(preset);
    const instant = withSeed(7, {
      appearMode: "instant",
      appearSequence: "instant",
    });
    expect(encodeParams(instant)).toBe("7.aBz");
    expect(parseParams("?7.aBz")).toEqual(instant);
    const custom = withSeed(7, { appearFx: "dust" });
    expect(encodeParams(custom)).toBe("7.aB4Q");
    expect(parseParams("?7.aB4Q")).toEqual(custom);
    // Every preset round-trips, values implied.
    for (const id of Object.keys(APPEAR_PRESETS) as AppearPreset[]) {
      const p = withSeed(9, { appearMode: id });
      applyAppearMode(p);
      expect(parseParams("?" + encodeParams(p))).toEqual(p);
    }
  });

  it("re-rolls a random appearance on every load", () => {
    const q = encodeParams(withSeed(7, { appearMode: "random" }));
    const seen = new Set<string>();
    for (let k = 0; k < 40; k++) {
      const p = parseParams("?" + q);
      expect(p.appearMode).toBe("random");
      expect(p.appearSequence).not.toBe("instant");
      expect(p.appearFx).not.toBe("none");
      expect(encodeParams(p)).toBe(q);
      seen.add(`${p.appearSequence} ${p.appearFx} ${p.appearSpeed}`);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("writes a relative URL, so a path prefix survives", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("history", { replaceState });
    writeParams(USER);
    expect(replaceState).toHaveBeenCalledWith(null, "", "?" + USER_COMPACT);
  });
});

describe("legacy links", () => {
  it("reads s= short links and rewrites them compactly", () => {
    // Legacy links read the v1 defaults (junctionBlend 0), so they rewrite
    // with that value explicit.
    expect(parseParams("?s=1471kin")).toEqual(
      withSeed(2430477599, { junctionBlend: 0, pluckSize: 1 })
    );
    expect(encodeParams(parseParams("?s=1471kin"))).toBe("1471kin.bBwHlHw");
    expect(encodeParams(parseParams("?" + USER_LEGACY))).toBe(USER_COMPACT);
    expect(encodeParams(parseParams("?s=7&am=trace-rainbow"))).toBe("7.ZAcB8hB8");
    expect(parseParams("?s=7&afx=dust")).toEqual(
      withSeed(7, { appearFx: "dust", junctionBlend: 0, pluckSize: 1 })
    );
  });

  it("reads seed= links: every param written out, legacy keys", () => {
    const old =
      "?seed=2430477599&gs=18&shp=rect&sa=nw&xa=se&wd=0.35&tb=0.7&sl=0.55&sp=5&dr=0.5&rep=1.4500000000000002&bd=2&sm=0.75&st=1&ga=0.1&tw=0.52&gap=0.04&ms=1&cr=3&fl=0.14000000000000004&fw=0.3&fv=0.5000000000000001&tl=2&sb=4&snd=music&sc=chromatic&oct=3&ss=0.9999999999999996&vol=0.33&rv=0.42&brt=0.5&sus=0.5&shm=0.4&pp=0.4&snpy=0.88&rn=seed&tnc=0.5&psp=2.5&hs=300&arc=130&pal=pastel&pc=eccc41&brd=0.35&fwf=0.12&ded=0.25&pk=string&mf=1&de=0&pv=gold&cam=fit&trl=5&tn=0.45&fow=0&fr=4&fwi=0&cs=segments&ap=trace&as=2.1999999999999997&afx=burn";
    expect(encodeParams(parseParams(old))).toBe("1471kin.bBwHlHw");
    const user = parseParams(
      "?seed=2430477599&gs=12&shp=rect&sa=nw&xa=se&wd=0.35&tb=0.7&sl=0.55&sp=5&dr=0.5&rep=1&bd=1&sm=0.25&st=1&ga=0&tw=0.64&gap=0.12&ms=1&cr=2.4&fl=1.734723475976807e-17&fw=0.25&fv=1.1500000000000001&tl=2&sb=4&snd=music&sc=chromatic&oct=3&ss=0.9999999999999996&vol=0.18&rv=0.42&brt=0.5&sus=0.5&shm=0.4&pp=0.4&snpy=0.88&rn=seed&tnc=0.5&psp=2.5&hs=312&arc=130&pal=moss&pc=6c644c&brd=0.35&fwf=0.12&ded=0.25&pk=string&mf=1&de=0&pv=gold&cam=fit&trl=5&tn=0.45&fow=0&fr=4&fwi=0&cs=segments&ap=trace&as=2.1&afx=burn"
    );
    expect(encodeParams(user)).toBe(USER_COMPACT);
    expect(parseParams("?seed=1&mc=1").colorScheme).toBe("strands");
    expect(parseParams("?seed=1&mc=0").colorScheme).toBe("mono");
    expect(parseParams("?seed=1&trm=1").pathViz).toBe("trail");
    expect(parseParams("?seed=1&ga=1").gridAlign).toBe(1);
    expect(parseParams("?seed=1&afx=sparks").appearFx).toBe("burn");
  });

  it("gives a link without any seed a fresh random design", () => {
    for (const q of ["", "?", "?am=instant", "?fbclid=x"]) {
      const p = parseParams(q);
      expect(Number.isInteger(p.seed) && p.seed >= 0 && p.seed < 2 ** 32).toBe(true);
    }
    expect(parseParams("?am=instant").appearMode).toBe("instant");
    // No seed = no link: today's defaults, not the v1 table legacy links use.
    expect(parseParams("").junctionBlend).toBe(PARAM_DEFAULTS.junctionBlend);
    expect(parseParams("?am=instant").junctionBlend).toBe(
      PARAM_DEFAULTS.junctionBlend
    );
    expect(parseParams("?s=7").junctionBlend).toBe(0);
  });
});

describe("token + overrides", () => {
  it("applies legacy key=value pairs after the token, then folds them in", () => {
    const p = parseParams(`?${USER_COMPACT}&am=instant&tw=.5`);
    expect(p).toEqual({
      ...USER,
      threadWidth: 0.5,
      appearMode: "instant",
      appearSequence: "instant",
    });
    // Folded into one token; instant implies its values, so the inert speed
    // reads back as the default (as with every instant link).
    expect(encodeParams(p)).toMatch(/^1471kin\.[A-Za-z0-9_-]+$/);
    expect(parseParams("?" + encodeParams(p))).toEqual({
      ...p,
      appearSpeed: PARAM_DEFAULTS.appearSpeed,
    });
    expect(parseParams("?7&mf=0").mazeFabric).toBe(false);
    // The token's own seed wins over s=/seed= after it.
    expect(parseParams("?7&s=zz&seed=5").seed).toBe(7);
  });

  it("ignores unknown keys (click ids, utm tags)", () => {
    expect(parseParams(`?${USER_COMPACT}&fbclid=IwAR0x&utm_source=x`)).toEqual(USER);
    expect(encodeParams(parseParams("?1471kin&fbclid=IwAR0x"))).toBe("1471kin.bBwHlHw");
  });

  it("reads a token re-serialized by URLSearchParams (a trailing =)", () => {
    const url = new URL(`https://levi.dev/knotmaze/?${USER_COMPACT}`);
    url.searchParams.append("ref", "newsletter");
    expect(url.search).toBe(`?${USER_COMPACT}=&ref=newsletter`);
    expect(parseParams(url.search)).toEqual(USER);
    expect(parseParams("?1471kin=")).toEqual(
      withSeed(2430477599, { junctionBlend: 0, pluckSize: 1 })
    );
  });

  it("round-trips the pluck and physics params (appended to v2)", () => {
    const p = withSeed(7, {
      pluckSize: 1.5,
      pluckGhost: 0,
      pluckReach: "lobe",
      physics: false,
    });
    const q = encodeParams(p);
    expect(q).toBe("7.ZQejS_D6g");
    expect(parseParams("?" + q)).toEqual(p);
    // Links written before they existed read their defaults...
    expect(parseParams("?7.U")).toEqual(withSeed(7, { pluckSize: 1 })); // a v2 link
    // ...and a token takes them as overrides (probe URLs: &phy=0).
    expect(parseParams("?7.U&psz=1.5&pgh=0&prc=lobe&phy=0")).toEqual(p);
  });
});

describe("unreadable links", () => {
  it("keeps the seed and warns once for a malformed blob", () => {
    for (const blob of ["@@", "hGJeJH4_ol9B", "Y", "w-"]) {
      const warn = warnings();
      expect(parseParams(`?1471kin.${blob}`)).toEqual(withSeed(2430477599));
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    }
  });

  it("clamps gridAlign to [0, 1] and junctionBlend at 0, like the legacy reader", () => {
    const q = encodeParams(withSeed(7, { gridAlign: 5, junctionBlend: -2 }));
    const p = parseParams("?" + q);
    expect([p.gridAlign, p.junctionBlend]).toEqual([1, 0]);
    // (A legacy link reads the v1 defaults, so its pluckSize is 1.)
    expect(parseParams("?s=7&ga=5&jbl=-2")).toEqual({ ...p, pluckSize: 1 });
    // junctionBlend is a distance: no upper clamp.
    expect(parseParams("?" + encodeParams(withSeed(7, { junctionBlend: 9 }))).junctionBlend).toBe(9);
  });

  it("warns once and rolls a new design for an unreadable seed", () => {
    const warn = warnings();
    const p = parseParams("?NOT-A-SEED.AAAA");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(p).toEqual(withSeed(p.seed));
  });

  it("never throws on random queries", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let s = 7;
    const rand = (): number => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    const alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.=&%?é ";
    for (let k = 0; k < 2000; k++) {
      let q = "?";
      const n = Math.floor(rand() * 40);
      for (let i = 0; i < n; i++) q += alphabet[Math.floor(rand() * alphabet.length)];
      const p = parseParams(q);
      expect(Object.keys(p).sort()).toEqual(
        ["seed", ...Object.keys(PARAM_DEFAULTS)].sort()
      );
    }
  });
});

describe("links round trip (seeded property test)", () => {
  // A random design: each param changed with a random share, numbers mixing
  // short decimals, slider noise, negatives and big values.
  const randomParams = (rand: () => number): UrlParams => {
    const p = withSeed(Math.floor(rand() * 2 ** 32) >>> 0) as unknown as Record<
      string,
      unknown
    >;
    const share = rand();
    for (const c of CODEC_V1.params) {
      if (rand() >= share) continue;
      if (c.type === "boolean") p[c.name] = !c.def;
      else if (c.type === "color") {
        p[c.name] = "#" + Math.floor(rand() * 0x1000000).toString(16).padStart(6, "0");
      } else if (c.type === "enum") {
        const options = ENUM_OPTIONS[c.name as keyof typeof ENUM_OPTIONS]!;
        p[c.name] = options[Math.floor(rand() * options.length)];
      } else {
        const d = Math.floor(rand() * 10000) / 10 ** Math.floor(rand() * 7);
        const r = rand();
        p[c.name] =
          r < 0.4 ? d : r < 0.6 ? d + (rand() - 0.5) * 1e-11 : r < 0.7 ? -d : Math.floor(rand() * 400);
      }
    }
    // gridAlign never leaves [0, 1] and junctionBlend (a distance) never
    // goes negative in the app - both readers clamp (see "clamps ...").
    p.gridAlign = rand();
    p.junctionBlend = rand() * 6;
    return p as unknown as UrlParams;
  };
  // What a design reads back as: numbers at their written precision, the
  // clamped gridAlign / junctionBlend, and the values its appearance mode
  // implies.
  const expected = (p: UrlParams, back: UrlParams): UrlParams => {
    const e = { ...p } as unknown as Record<string, unknown>;
    for (const c of CODEC_V1.params) {
      if (c.type === "number") e[c.name] = Number(numberText(e[c.name] as number));
    }
    const out = e as unknown as UrlParams;
    out.gridAlign = Math.max(0, Math.min(1, out.gridAlign));
    out.junctionBlend = Math.max(0, out.junctionBlend);
    if (out.appearMode !== "custom") {
      out.appearSequence = PARAM_DEFAULTS.appearSequence;
      out.appearSpeed = PARAM_DEFAULTS.appearSpeed;
      out.appearFx = PARAM_DEFAULTS.appearFx;
    }
    if (out.appearMode === "random") {
      out.appearSequence = back.appearSequence;
      out.appearSpeed = back.appearSpeed;
      out.appearFx = back.appearFx;
    } else {
      applyAppearMode(out);
    }
    return out;
  };

  it("reads back what it writes, and writes it back the same", () => {
    let s = 20261011;
    const rand = (): number => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    for (let k = 0; k < 1500; k++) {
      const p = randomParams(rand);
      const q = encodeParams(p);
      expect(q).toMatch(/^[0-9a-z]{1,7}(\.[A-Za-z0-9_-]+)?$/);
      const back = parseParams("?" + q);
      expect(back).toEqual(expected(p, back));
      expect(encodeParams(back)).toBe(q);
    }
  });
});
