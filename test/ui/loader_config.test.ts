// K828/K852: the loading trefoil's configuration wire
// (src/ui/loader_config.ts): the loader's OWN look params mapped onto
// the wire, and the localStorage mirror the boot script reads before
// the bundle exists. K852 split the look from the maze's params.
import { describe, expect, it } from "vitest";
import {
  LOADER_CFG_DEFAULTS,
  loaderCfgFromParams,
  readLoaderMirror,
} from "../../src/ui/loader_config";
import { PARAM_DEFAULTS } from "../../src/ui/url_state";

describe("K828/K852 loader config", () => {
  it("the defaults reproduce today's loader drawing", () => {
    expect(loaderCfgFromParams(PARAM_DEFAULTS)).toEqual({
      speed: 1,
      move: "maze",
      gapSamples: 0.6,
      threadW: 0.42,
      casingW: 0.6,
      thread: "#eccc41",
      bg: "#151b28",
      marker: 1,
      fill: "solid",
      trail: 2.6,
    });
    expect(LOADER_CFG_DEFAULTS).toEqual(loaderCfgFromParams(PARAM_DEFAULTS));
  });

  it("the loader's look comes from its own params, not the maze's", () => {
    const cfg = loaderCfgFromParams({
      ...PARAM_DEFAULTS,
      gap: PARAM_DEFAULTS.gap * 2,
      threadWidth: PARAM_DEFAULTS.threadWidth * 0.5,
      pathColor: "#ff0000",
      backgroundBase: "#001122",
    });
    // Maze look changes leave the loader alone (K852).
    expect(cfg.gapSamples).toBe(0.6);
    expect(cfg.threadW).toBe(0.42);
    expect(cfg.thread).toBe("#eccc41");
    expect(cfg.bg).toBe("#151b28");
    const own = loaderCfgFromParams({
      ...PARAM_DEFAULTS,
      loaderGap: 1.2,
      loaderThreadWidth: 0.21,
      loaderThreadColor: "#ff0000",
      loaderBgColor: "#001122",
      loaderIndicatorSize: 2,
      loaderFill: "outline",
      loaderTrail: 0,
    });
    expect(own.gapSamples).toBe(1.2);
    expect(own.threadW).toBeCloseTo(0.21);
    expect(own.casingW).toBeCloseTo(0.3);
    expect(own.thread).toBe("#ff0000");
    expect(own.bg).toBe("#001122");
    expect(own.marker).toBe(2);
    expect(own.fill).toBe("outline");
    expect(own.trail).toBe(0);
  });

  it("speed and motion pass through, including the centroid mode", () => {
    const cfg = loaderCfgFromParams({
      ...PARAM_DEFAULTS,
      loaderSpeed: 2,
      loaderMove: "above",
    });
    expect(cfg).toMatchObject({ speed: 2, move: "above" });
  });

  it("the mirror round-trips and falls back field by field", () => {
    const cfg = loaderCfgFromParams({ ...PARAM_DEFAULTS, loaderSpeed: 0.5 });
    expect(readLoaderMirror(JSON.stringify(cfg))).toEqual(cfg);
    expect(readLoaderMirror(null)).toEqual(LOADER_CFG_DEFAULTS);
    expect(readLoaderMirror("not json")).toEqual(LOADER_CFG_DEFAULTS);
    const partial = readLoaderMirror('{"move":"head","speed":-2}');
    expect(partial.move).toBe("head");
    expect(partial.speed).toBe(LOADER_CFG_DEFAULTS.speed);
    expect(readLoaderMirror('{"move":"above"}').move).toBe("above");
    expect(readLoaderMirror('{"move":"sideways"}').move).toBe("maze");
    expect(readLoaderMirror('{"fill":"flat"}').fill).toBe("flat");
    expect(readLoaderMirror('{"fill":"bogus"}').fill).toBe("solid");
    expect(readLoaderMirror('{"marker":0}').marker).toBe(1);
    expect(readLoaderMirror('{"trail":-1}').trail).toBe(2.6);
  });
});
