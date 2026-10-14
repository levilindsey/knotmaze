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
import { DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";

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
// ...as a v3 link...
const USER_COMPACT_V3 = "1471kin.YTiXiR-P6JfQfpk_Ql6Kk-H6JfjQr56GPFGJeiWxkTB4eyofQ-";
// ...and as today's (v4) link. The design predates junctionBlend's 0.88,
// pluckSize's 1.75 and trailLength's 10 defaults, so it keeps 0, 1 and 5 -
// written out.
const USER_COMPACT = "1471kin.IFIl4kfj-iX0H6ZP0JeipPh-iX40K-ehjxRiXolsZEwSvmD2VD6Hw";
const USER = withSeed(2430477599, {
  junctionBlend: 0,
  pluckSize: 1,
  trailLength: 5,
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
// K74 (2026-10-13) changed v4's maze defaults IN PLACE, before launch (Levi:
// no back-compat): long dead ends on at density 0.5, and the exit 12 u from
// the start. v1-v3 and legacy links still read the pre-K74 maze below, so
// the page's rewrite of one writes those three values out; a v4 link
// written before K74 now opens with the new maze.
const PRE_K74: Partial<UrlParams> = {
  deadEnds: false,
  deadEndDensity: 0.25,
  exitClearance: 5,
};
// The user's design as its v1-v3 and legacy links read it...
const USER_OLD = { ...USER, ...PRE_K74 };
// ...and the token the page rewrites them to.
const USER_OLD_COMPACT =
  "1471kin.IF4l4kfj-iX0H6ZP0JeipPh-iX40K-ehjxRiXolsZEx0S-2vmD2VD6Hyr4";

const warnings =(): ReturnType<typeof vi.spyOn> =>
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
  // pin moves to the new table. (Before launch, K74 edited v4's in place
  // instead: deadEndDensity, deadEnds, exitClearance; see PRE_K74.)
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
      branchDensity: 0.35, fourWayFraction: 0.12, deadEndDensity: 0.5,
      pluckStyle: "string", pluckSize: 1.75, pluckGhost: 0.35, pluckReach: "run",
      physics: true, mazeFabric: true, deadEnds: true, pathViz: "gold",
      cameraMode: "fit", trailLength: 10, tension: 0.45, fogOfWar: false,
      fowRadius: 4, fowIntro: false, colorScheme: "segments",
      junctionBlend: 0.88, appearMode: "custom", appearSequence: "trace", appearSpeed: 2.2,
      appearFx: "burn",
      entranceClearance: 2.5, exitClearance: 12, junctionSpacing: 2,
      background: "vellum", backgroundIntensity: 0.5,
      pulseReach: 3, backgroundSpeed: -1, deadEndLength: 20,
      backgroundScale: 1, backgroundDetail: 1, backgroundFibers: 1,
      backgroundGrain: 1, backgroundAngle: -1, backgroundColorMode: "gamut",
      backgroundBase: "#151b28", backgroundAccent1: "#7ab8cd",
      backgroundAccent2: "#cdb17a", backgroundAccent3: "#aa7acd",
    });
  });

  it("keeps the maze-plan knobs equal to DEFAULT_MAZE_PARAMS", () => {
    // Every link before 2026-10-12 read these from DEFAULT_MAZE_PARAMS; a
    // different default here would move all of their mazes.
    expect({
      entranceClearance: DEFAULT_MAZE_PARAMS.entranceClearance,
      exitClearance: DEFAULT_MAZE_PARAMS.exitClearance,
      junctionSpacing: DEFAULT_MAZE_PARAMS.junctionSpacing,
      deadEndLength: DEFAULT_MAZE_PARAMS.deadEndLength,
    }).toEqual({
      entranceClearance: PARAM_DEFAULTS.entranceClearance,
      exitClearance: PARAM_DEFAULTS.exitClearance,
      junctionSpacing: PARAM_DEFAULTS.junctionSpacing,
      deadEndLength: PARAM_DEFAULTS.deadEndLength,
    });
  });

  it("is the seed plus a version tag for an all-default design", () => {
    // A bare seed is a v1 link: today's defaults except junctionBlend 0,
    // pluckSize 1 and trailLength 5 (later versions moved those defaults),
    // so current links name their version.
    expect(encodeParams(withSeed(2430477599))).toBe("1471kin.J");
    expect(parseParams("?1471kin.J")).toEqual(withSeed(2430477599));
    // An all-default v3 link keeps v3's trailLength (and the pre-K74 maze).
    expect(parseParams("?1471kin.c")).toEqual(
      withSeed(2430477599, { ...PRE_K74, trailLength: 5 })
    );
    const v1 = withSeed(2430477599, {
      ...PRE_K74,
      junctionBlend: 0,
      pluckSize: 1,
      trailLength: 5,
    });
    expect(parseParams("?1471kin")).toEqual(v1);
    expect(parseParams("1471kin")).toEqual(v1);
    expect(parseParams("?1471kin.")).toEqual(v1);
  });

  it("packs the user's rect design into one token", () => {
    expect(encodeParams(USER)).toBe(USER_COMPACT);
    expect(USER_COMPACT.length).toBe(61);
    expect(USER_LEGACY.length).toBe(121);
    expect(parseParams("?" + USER_COMPACT)).toEqual(USER);
    expect(parseParams("?" + USER_COMPACT_V3)).toEqual(USER_OLD); // v3 keeps its look
    expect(parseParams("?" + USER_COMPACT_V2)).toEqual(USER_OLD); // v2 keeps its look
    expect(parseParams("?" + USER_COMPACT_V1)).toEqual(USER_OLD); // v1 keeps its look
    expect(parseParams("?" + USER_LEGACY)).toEqual(USER_OLD);
    expect(encodeParams(USER_OLD)).toBe(USER_OLD_COMPACT);
  });

  // K73: trailLength 5 -> 10 is codec v4. A v3 link at v3's default reads
  // 5, and the token the page rewrites it to on load keeps 5.
  it("keeps a v3 link's trailLength (5) through the load rewrite", () => {
    const old = parseParams("?7.c");
    expect(old.trailLength).toBe(5);
    expect(old).toEqual(withSeed(7, { ...PRE_K74, trailLength: 5 }));
    const rewritten = encodeParams(old);
    // v4, four entries: trailLength "5" and the pre-K74 maze's three values.
    expect(rewritten).toBe("7.IUFlEvtr4QXw");
    expect(parseParams("?" + rewritten)).toEqual(old);
    // Legacy links read v1's 5; today's defaults (a v4 link, or no link)
    // are 10.
    expect(parseParams("?s=7&pv=trail").trailLength).toBe(5);
    expect(parseParams("?7.J").trailLength).toBe(10);
    expect(parseParams("?am=instant").trailLength).toBe(10);
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
    expect(q).toBe("1z141z3.IdGG03w8LWK-__SSig");
    expect(parseParams("?" + q)).toEqual({ ...p, threadWidth: 0.6 });
    // Written under v3, it read back the same (with v3's trailLength).
    expect(parseParams("?1z141z3.Z0YbTfDwtYr7_9JKK")).toEqual({
      ...p,
      ...PRE_K74,
      threadWidth: 0.6,
      trailLength: 5,
    });
  });

  it("drops float noise that equals a default", () => {
    expect(encodeParams(withSeed(7, { repulsion: 1.4500000000000002 }))).toBe("7.J");
    expect(encodeParams(withSeed(7, { junctionBlend: 0.8800000000000001 }))).toBe("7.J");
    expect(encodeParams(withSeed(7, { pluckSize: 1.7500000000000002 }))).toBe("7.J");
    expect(encodeParams(withSeed(7, { trailLength: 10.000000000000002 }))).toBe("7.J");
  });

  it("leaves out appearance values a mode implies", () => {
    const preset = withSeed(7, {
      appearMode: "trace-rainbow",
      appearSequence: "trace",
      appearFx: "rainbow",
      appearSpeed: 2,
    });
    expect(encodeParams(preset)).toBe("7.Igck");
    expect(parseParams("?7.Igck")).toEqual(preset);
    const instant = withSeed(7, {
      appearMode: "instant",
      appearSequence: "instant",
    });
    expect(encodeParams(instant)).toBe("7.Igcw");
    expect(parseParams("?7.Igcw")).toEqual(instant);
    const custom = withSeed(7, { appearFx: "dust" });
    expect(encodeParams(custom)).toBe("7.IgeE");
    expect(parseParams("?7.IgeE")).toEqual(custom);
    // The same three as v3 links (trailLength 5 then, and the pre-K74 maze).
    expect(parseParams("?7.aByQ")).toEqual({ ...preset, ...PRE_K74, trailLength: 5 });
    expect(parseParams("?7.aBz")).toEqual({ ...instant, ...PRE_K74, trailLength: 5 });
    expect(parseParams("?7.aB4Q")).toEqual({ ...custom, ...PRE_K74, trailLength: 5 });
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
    // Legacy links read the v1 defaults (junctionBlend 0, pluckSize 1,
    // trailLength 5), so they rewrite with those values explicit.
    expect(parseParams("?s=1471kin")).toEqual(
      withSeed(2430477599, { ...PRE_K74, junctionBlend: 0, pluckSize: 1, trailLength: 5 })
    );
    expect(encodeParams(parseParams("?s=1471kin"))).toBe("1471kin.IcFlEvtr5g8o-Vf");
    expect(encodeParams(parseParams("?" + USER_LEGACY))).toBe(USER_OLD_COMPACT);
    expect(encodeParams(parseParams("?s=7&am=trace-rainbow"))).toBe("7.IIBZRL7a-YPkIPlXw");
    expect(parseParams("?s=7&afx=dust")).toEqual(
      withSeed(7, {
        ...PRE_K74,
        appearFx: "dust",
        junctionBlend: 0,
        pluckSize: 1,
        trailLength: 5,
      })
    );
  });

  it("reads seed= links: every param written out, legacy keys", () => {
    const old =
      "?seed=2430477599&gs=18&shp=rect&sa=nw&xa=se&wd=0.35&tb=0.7&sl=0.55&sp=5&dr=0.5&rep=1.4500000000000002&bd=2&sm=0.75&st=1&ga=0.1&tw=0.52&gap=0.04&ms=1&cr=3&fl=0.14000000000000004&fw=0.3&fv=0.5000000000000001&tl=2&sb=4&snd=music&sc=chromatic&oct=3&ss=0.9999999999999996&vol=0.33&rv=0.42&brt=0.5&sus=0.5&shm=0.4&pp=0.4&snpy=0.88&rn=seed&tnc=0.5&psp=2.5&hs=300&arc=130&pal=pastel&pc=eccc41&brd=0.35&fwf=0.12&ded=0.25&pk=string&mf=1&de=0&pv=gold&cam=fit&trl=5&tn=0.45&fow=0&fr=4&fwi=0&cs=segments&ap=trace&as=2.1999999999999997&afx=burn";
    expect(encodeParams(parseParams(old))).toBe("1471kin.IcFlEvtr5g8o-Vf");
    const user = parseParams(
      "?seed=2430477599&gs=12&shp=rect&sa=nw&xa=se&wd=0.35&tb=0.7&sl=0.55&sp=5&dr=0.5&rep=1&bd=1&sm=0.25&st=1&ga=0&tw=0.64&gap=0.12&ms=1&cr=2.4&fl=1.734723475976807e-17&fw=0.25&fv=1.1500000000000001&tl=2&sb=4&snd=music&sc=chromatic&oct=3&ss=0.9999999999999996&vol=0.18&rv=0.42&brt=0.5&sus=0.5&shm=0.4&pp=0.4&snpy=0.88&rn=seed&tnc=0.5&psp=2.5&hs=312&arc=130&pal=moss&pc=6c644c&brd=0.35&fwf=0.12&ded=0.25&pk=string&mf=1&de=0&pv=gold&cam=fit&trl=5&tn=0.45&fow=0&fr=4&fwi=0&cs=segments&ap=trace&as=2.1&afx=burn"
    );
    expect(encodeParams(user)).toBe(USER_OLD_COMPACT);
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
    expect(encodeParams(parseParams("?1471kin&fbclid=IwAR0x"))).toBe("1471kin.IcFlEvtr5g8o-Vf");
  });

  it("reads a token re-serialized by URLSearchParams (a trailing =)", () => {
    const url = new URL(`https://levi.dev/knotmaze/?${USER_COMPACT}`);
    url.searchParams.append("ref", "newsletter");
    expect(url.search).toBe(`?${USER_COMPACT}=&ref=newsletter`);
    expect(parseParams(url.search)).toEqual(USER);
    expect(parseParams("?1471kin=")).toEqual(
      withSeed(2430477599, { ...PRE_K74, junctionBlend: 0, pluckSize: 1, trailLength: 5 })
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
    expect(q).toBe("7.IUHo0vw-o");
    expect(parseParams("?" + q)).toEqual(p);
    // Links written before they existed read their defaults (a v2 link)...
    expect(parseParams("?7.U")).toEqual(
      withSeed(7, { ...PRE_K74, pluckSize: 1, trailLength: 5 })
    );
    // ...and a token takes them as overrides (probe URLs: &phy=0).
    expect(parseParams("?7.U&psz=1.5&pgh=0&prc=lobe&phy=0")).toEqual({
      ...p,
      ...PRE_K74,
      trailLength: 5,
    });
  });

  it("round-trips the maze-plan knobs (appended to v3)", () => {
    const p = withSeed(7, {
      entranceClearance: 4,
      exitClearance: 0,
      junctionSpacing: 3.25,
    });
    const q = encodeParams(p);
    expect(parseParams("?" + q)).toEqual(p);
    // Every older link reads the values it was always built with...
    for (const old of ["?7", "?7.U", "?7.c", "?s=7"]) {
      expect(parseParams(old)).toMatchObject({
        entranceClearance: 2.5,
        exitClearance: 5,
        junctionSpacing: 2,
      });
    }
    // ...but v4's, which K74 moved in place (pre-launch).
    expect(parseParams("?7.J")).toMatchObject({
      entranceClearance: 2.5,
      exitClearance: 12,
      junctionSpacing: 2,
      deadEnds: true,
      deadEndDensity: 0.5,
      deadEndLength: 20,
    });
    expect(parseParams("?7.J&ecl=4&xcl=0&jsp=3.25")).toEqual(p);
  });

  it("round-trips the shader background params (appended to v3)", () => {
    const p = withSeed(7, { background: "aurora", backgroundIntensity: 0.8 });
    const q = encodeParams(p);
    // v4, 2 entries, index 67 (gamma 68) = option 5, index 68 = ".8".
    expect(q).toBe("7.IwIhtR4");
    expect(parseParams("?" + q)).toEqual(p);
    // Every effect round-trips.
    for (const id of ENUM_OPTIONS.background!) {
      const b = withSeed(9, { background: id as UrlParams["background"] });
      expect(parseParams("?" + encodeParams(b))).toEqual(b);
    }
    // Links written before they existed read the defaults...
    expect(parseParams("?7.c")).toEqual(withSeed(7, { ...PRE_K74, trailLength: 5 }));
    expect(parseParams("?" + USER_COMPACT)).toEqual(USER);
    // ...and a token takes them as overrides (probe URLs: &bg=mist&bgi=.7).
    expect(parseParams("?7.J&bg=mist&bgi=.7")).toEqual(
      withSeed(7, { background: "mist", backgroundIntensity: 0.7 })
    );
    // An unknown effect reads as the default; the intensity clamps to [0, 1].
    expect(parseParams("?7.J&bg=lava&bgi=3")).toEqual(
      withSeed(7, { backgroundIntensity: 1 })
    );
    const hot = encodeParams(withSeed(7, { backgroundIntensity: 3 }));
    expect(parseParams("?" + hot).backgroundIntensity).toBe(1);
  });

  it("round-trips the background speed (appended to v4; -1 = auto)", () => {
    for (const speed of [0, 0.5, 1, 2.25, 3]) {
      const p = withSeed(7, { background: "vellum", backgroundSpeed: speed });
      expect(parseParams("?" + encodeParams(p))).toEqual(p);
    }
    // Auto is the default: the all-default token, and every older link.
    expect(encodeParams(withSeed(7))).toBe("7.J");
    expect(parseParams("?7.c").backgroundSpeed).toBe(-1);
    expect(parseParams("?" + USER_COMPACT).backgroundSpeed).toBe(-1);
    // A token takes it as an override (probe URLs: &bgs=2); any negative
    // value is auto, and explicit speeds clamp to the slider's max 3.
    expect(parseParams("?7.J&bgs=2")).toEqual(withSeed(7, { backgroundSpeed: 2 }));
    expect(parseParams("?7.J&bgs=-.5").backgroundSpeed).toBe(-1);
    expect(parseParams("?7.J&bgs=9").backgroundSpeed).toBe(3);
    expect(parseParams("?7.J&bgs=x").backgroundSpeed).toBe(-1);
    const fast = encodeParams(withSeed(7, { backgroundSpeed: 9 }));
    expect(parseParams("?" + fast).backgroundSpeed).toBe(3);
    const neg = encodeParams(withSeed(7, { backgroundSpeed: -0.25 }));
    expect(parseParams("?" + neg).backgroundSpeed).toBe(-1);
  });

  it("round-trips the background shape and colors (appended to v4)", () => {
    const p = withSeed(7, {
      background: "silk",
      backgroundScale: 1.75,
      backgroundDetail: 0,
      backgroundFibers: 3,
      backgroundGrain: 0.25,
      backgroundAngle: 90,
      backgroundColorMode: "custom",
      backgroundBase: "#203040",
      backgroundAccent1: "#ffcc66",
      backgroundAccent2: "#0a0b0c",
      backgroundAccent3: "#a1b2c3",
    });
    expect(parseParams("?" + encodeParams(p))).toEqual(p);
    // At their defaults they cost nothing: the all-default token.
    expect(encodeParams(withSeed(7))).toBe("7.J");
    // Older links read the defaults (as designed, in the design's colors).
    for (const q of ["?7.c", "?" + USER_COMPACT, "?s=7"]) {
      expect(parseParams(q)).toMatchObject({
        backgroundScale: 1,
        backgroundDetail: 1,
        backgroundFibers: 1,
        backgroundGrain: 1,
        backgroundAngle: -1,
        backgroundColorMode: "gamut",
        backgroundBase: "#151b28",
        backgroundAccent1: "#7ab8cd",
        backgroundAccent2: "#cdb17a",
        backgroundAccent3: "#aa7acd",
      });
    }
    // Out-of-range values clamp (a hand-edited or future link), in tokens...
    const wild = encodeParams(
      withSeed(7, {
        backgroundScale: 9,
        backgroundDetail: -1,
        backgroundFibers: 7,
        backgroundGrain: -2,
        backgroundAngle: 450,
      })
    );
    expect(parseParams("?" + wild)).toMatchObject({
      backgroundScale: 2,
      backgroundDetail: 0,
      backgroundFibers: 3,
      backgroundGrain: 0,
      backgroundAngle: 90,
    });
    const tiny = encodeParams(withSeed(7, { backgroundScale: 0.1, backgroundAngle: -7 }));
    expect(parseParams("?" + tiny)).toMatchObject({
      backgroundScale: 0.5,
      backgroundAngle: -1,
    });
  });

  it("takes the background shape and colors as overrides", () => {
    // Probe URLs: &bgsz=2&bgdt=0&bgfb=3&bggr=0&bgan=90&bgcm=custom&bgc0=...
    expect(
      parseParams(
        "?7.J&bgsz=2&bgdt=0&bgfb=3&bggr=0&bgan=90&bgcm=custom" +
          "&bgc0=101820&bgc1=FFCC66&bgc2=000000&bgc3=a1b2c3"
      )
    ).toEqual(
      withSeed(7, {
        backgroundScale: 2,
        backgroundDetail: 0,
        backgroundFibers: 3,
        backgroundGrain: 0,
        backgroundAngle: 90,
        backgroundColorMode: "custom",
        backgroundBase: "#101820",
        backgroundAccent1: "#ffcc66",
        backgroundAccent2: "#000000",
        backgroundAccent3: "#a1b2c3",
      })
    );
    // Clamps, wraps, auto and garbage.
    expect(parseParams("?7.J&bgsz=.1&bgdt=5&bgfb=-1&bggr=9&bgan=370")).toMatchObject({
      backgroundScale: 0.5,
      backgroundDetail: 2,
      backgroundFibers: 0,
      backgroundGrain: 3,
      backgroundAngle: 10,
    });
    // The slider's old top (3, before K129) clamps to the new one (2).
    expect(parseParams("?7.J&bgsz=3").backgroundScale).toBe(2);
    expect(
      parseParams("?7.J&bgsz=x&bgdt=1e999&bgan=-30&bgcm=plaid&bgc0=%23101820&bgc1=fff&bgc2=zzzzzz")
    ).toEqual(withSeed(7));
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
    // (A legacy link reads the v1 defaults: pluckSize 1, trailLength 5.)
    expect(parseParams("?s=7&ga=5&jbl=-2")).toEqual({
      ...p,
      ...PRE_K74,
      pluckSize: 1,
      trailLength: 5,
    });
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
