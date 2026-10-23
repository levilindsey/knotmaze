// K828: the loading trefoil's configuration wire (src/ui/loader_config.ts):
// the design's look params mapped onto the loader, and the localStorage
// mirror the boot script reads before the bundle exists.
import { describe, expect, it } from "vitest";
import {
  LOADER_CFG_DEFAULTS,
  loaderCfgFromParams,
  readLoaderMirror,
} from "../../src/ui/loader_config";
import { PARAM_DEFAULTS } from "../../src/ui/url_state";

describe("K828 loader config", () => {
  it("the defaults reproduce today's loader drawing", () => {
    expect(loaderCfgFromParams(PARAM_DEFAULTS)).toEqual({
      speed: 1,
      move: "maze",
      gapSamples: 0.6,
      threadW: 0.42,
      casingW: 0.6,
      thread: PARAM_DEFAULTS.pathColor,
      bg: PARAM_DEFAULTS.backgroundBase,
    });
    expect(LOADER_CFG_DEFAULTS.bg).toBe("#151b28");
  });

  it("gap and thread width scale from their defaults", () => {
    const cfg = loaderCfgFromParams({
      ...PARAM_DEFAULTS,
      gap: PARAM_DEFAULTS.gap * 2,
      threadWidth: PARAM_DEFAULTS.threadWidth * 0.5,
    });
    expect(cfg.gapSamples).toBeCloseTo(1.2);
    expect(cfg.threadW).toBeCloseTo(0.21);
    expect(cfg.casingW).toBeCloseTo(0.3);
    // The gap clamps (a huge gap must not erase the knot).
    expect(
      loaderCfgFromParams({ ...PARAM_DEFAULTS, gap: 99 }).gapSamples
    ).toBe(2.4);
    expect(
      loaderCfgFromParams({ ...PARAM_DEFAULTS, gap: 0 }).gapSamples
    ).toBe(0);
  });

  it("speed, motion and colors pass through", () => {
    const cfg = loaderCfgFromParams({
      ...PARAM_DEFAULTS,
      loaderSpeed: 2,
      loaderMove: "head",
      pathColor: "#ff0000",
      backgroundBase: "#001122",
    });
    expect(cfg).toMatchObject({
      speed: 2,
      move: "head",
      thread: "#ff0000",
      bg: "#001122",
    });
  });

  it("the mirror round-trips and falls back field by field", () => {
    const cfg = loaderCfgFromParams({ ...PARAM_DEFAULTS, loaderSpeed: 0.5 });
    expect(readLoaderMirror(JSON.stringify(cfg))).toEqual(cfg);
    expect(readLoaderMirror(null)).toEqual(LOADER_CFG_DEFAULTS);
    expect(readLoaderMirror("not json")).toEqual(LOADER_CFG_DEFAULTS);
    const partial = readLoaderMirror('{"move":"head","speed":-2}');
    expect(partial.move).toBe("head");
    expect(partial.speed).toBe(LOADER_CFG_DEFAULTS.speed);
    expect(readLoaderMirror('{"move":"sideways"}').move).toBe("maze");
  });
});
