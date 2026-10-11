import { describe, expect, it } from "vitest";
import {
  PARAM_DEFAULTS,
  URL_KEYS,
  encodeParams,
  parseParams,
} from "../../src/ui/url_state";
import type { UrlParams } from "../../src/ui/url_state";

const withSeed = (seed: number, over: Partial<UrlParams> = {}): UrlParams => ({
  ...PARAM_DEFAULTS,
  seed,
  ...over,
});

describe("short links", () => {
  // Short links OMIT defaults, so every s= link means "these values unless
  // stated". If this fails because a default changed on purpose: freeze the
  // OLD table (copy it from here) as the table s= links read with, write new
  // links under a new seed key (s2=), and update this pin to the new table.
  it("pins the defaults table that s= links are read with", () => {
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
      pluckStyle: "string", mazeFabric: true, deadEnds: false, pathViz: "gold",
      cameraMode: "fit", trailLength: 5, tension: 0.45, fogOfWar: false,
      fowRadius: 4, fowIntro: false, colorScheme: "segments",
      appearMode: "custom", appearSequence: "trace", appearSpeed: 2.2,
      appearFx: "burn",
    });
  });

  it("has exactly one URL key per param, all distinct", () => {
    const names = URL_KEYS.map(([name]) => name).sort();
    expect(names).toEqual(Object.keys(PARAM_DEFAULTS).sort());
    const keys = URL_KEYS.map(([, key]) => key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).not.toContain("s");
    expect(keys).not.toContain("seed");
  });

  it("writes only the seed for an all-default design", () => {
    expect(encodeParams(withSeed(2430477599))).toBe("s=1471kin");
    expect(parseParams("?s=1471kin")).toEqual(withSeed(2430477599));
  });

  it("round-trips changed params in their shortest form", () => {
    const p = withSeed(4294967295, {
      threadWidth: 0.6000000000000001, // slider-step float noise
      gap: 0,
      shape: "ring",
      mazeFabric: false,
      pathColor: "#ffd24a",
      hueShift: -15,
    });
    const q = encodeParams(p);
    expect(q).toBe("s=1z141z3&shp=ring&tw=.6&gap=0&hs=-15&pc=ffd24a&mf=0");
    const back = parseParams("?" + q);
    expect(back).toEqual({ ...p, threadWidth: 0.6 });
  });

  it("drops float noise that equals a default", () => {
    const q = encodeParams(withSeed(7, { repulsion: 1.4500000000000002 }));
    expect(q).toBe("s=7");
  });

  it("leaves out appearance values a mode implies", () => {
    const preset = withSeed(7, {
      appearMode: "trace-rainbow",
      appearSequence: "trace",
      appearFx: "rainbow",
      appearSpeed: 2,
    });
    expect(encodeParams(preset)).toBe("s=7&am=trace-rainbow");
    expect(parseParams("?s=7&am=trace-rainbow")).toEqual(preset);
    const custom = withSeed(7, { appearFx: "dust" });
    expect(encodeParams(custom)).toBe("s=7&afx=dust");
    expect(parseParams("?s=7&afx=dust")).toEqual(custom);
  });

  it("reads older links: seed=, every param written out, legacy keys", () => {
    const old =
      "?seed=2430477599&gs=18&shp=rect&sa=nw&xa=se&wd=0.35&tb=0.7&sl=0.55&sp=5&dr=0.5&rep=1.4500000000000002&bd=2&sm=0.75&st=1&ga=0.1&tw=0.52&gap=0.04&ms=1&cr=3&fl=0.14000000000000004&fw=0.3&fv=0.5000000000000001&tl=2&sb=4&snd=music&sc=chromatic&oct=3&ss=0.9999999999999996&vol=0.33&rv=0.42&brt=0.5&sus=0.5&shm=0.4&pp=0.4&snpy=0.88&rn=seed&tnc=0.5&psp=2.5&hs=300&arc=130&pal=pastel&pc=eccc41&brd=0.35&fwf=0.12&ded=0.25&pk=string&mf=1&de=0&pv=gold&cam=fit&trl=5&tn=0.45&fow=0&fr=4&fwi=0&cs=segments&ap=trace&as=2.1999999999999997&afx=burn";
    expect(encodeParams(parseParams(old))).toBe("s=1471kin");
    expect(parseParams("?seed=1&mc=1").colorScheme).toBe("strands");
    expect(parseParams("?seed=1&mc=0").colorScheme).toBe("mono");
    expect(parseParams("?seed=1&trm=1").pathViz).toBe("trail");
    expect(parseParams("?seed=1&ga=1").gridAlign).toBe(1);
  });
});

