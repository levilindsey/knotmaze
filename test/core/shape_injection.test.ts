// K814: the shape-injection collection agrees with the tables it indexes
// (flat param defaults, the codec literal, the daily lists, the shape and
// emblem definitions). Any drift fails here instead of moving a link.
import { describe, expect, it } from "vitest";
import {
  EMBLEM_CHOICES,
  SHAPE_INJECTION_DEFAULTS,
  SHAPE_INJECTION_KEYS,
  SHAPE_INJECTION_PARAMS,
  SHAPE_REGISTRY,
  shapeInjectionOf,
} from "../../src/core/shape_injection";
import { SHAPES } from "../../src/core/shapes";
import { EMBLEM_IDS } from "../../src/core/emblem_data";
import { PARAM_DEFAULTS } from "../../src/ui/url_state";
import { CODEC_PARAMS } from "../../src/ui/param_codec";
import { DAILY_EXEMPT_KEYS, MAZE_PARAM_KEYS } from "../../src/ui/daily_link";

describe("K814 shape-injection collection", () => {
  it("defaults equal today's PARAM_DEFAULTS, key for key", () => {
    expect([...SHAPE_INJECTION_KEYS].sort()).toEqual(
      SHAPE_INJECTION_PARAMS.map((d) => d.key).sort()
    );
    for (const key of SHAPE_INJECTION_KEYS) {
      expect(SHAPE_INJECTION_DEFAULTS[key], key).toEqual(PARAM_DEFAULTS[key]);
    }
  });

  it("descriptors match the codec literal (type and options)", () => {
    const byName = new Map(CODEC_PARAMS.map((c) => [c.name, c]));
    for (const d of SHAPE_INJECTION_PARAMS) {
      const c = byName.get(d.key);
      expect(c, d.key).toBeDefined();
      if (d.codec === "enum") {
        expect(c?.type, d.key).toBe("enum");
        expect(c && "options" in c ? [...c.options] : [], d.key).toEqual([...(d.options ?? [])]);
      } else {
        expect(c?.type, d.key).toBe(d.codec === "string" ? "string" : "boolean");
      }
    }
    // The group's codec indices stay where the links put them.
    const indexOf = (name: string) => CODEC_PARAMS.findIndex((c) => c.name === name);
    expect(indexOf("shape")).toBe(1);
    expect(indexOf("startAnchor")).toBe(2);
    expect(indexOf("exitAnchor")).toBe(3);
    expect(indexOf("text")).toBe(163);
    expect(indexOf("cartouche")).toBe(164);
    expect(indexOf("emblem")).toBe(165);
    expect(indexOf("cartoucheShape")).toBe(166);
    expect(indexOf("penReverse")).toBe(167);
    expect(indexOf("dailyTitleThread")).toBe(168);
  });

  it("daily flags match the daily lists", () => {
    for (const d of SHAPE_INJECTION_PARAMS) {
      expect(MAZE_PARAM_KEYS.includes(d.key as never), d.key).toBe(d.daily === "maze");
      expect(DAILY_EXEMPT_KEYS.includes(d.key as never), d.key).toBe(d.daily === "exempt");
    }
  });

  it("the registry lists every mask and emblem, once per role", () => {
    const masks = SHAPE_REGISTRY.filter((e) => e.kind === "mask");
    expect(masks.map((e) => (e.kind === "mask" ? e.shape : ""))).toEqual([...SHAPES]);
    for (const kind of ["emblem-standalone", "emblem-cartouche"] as const) {
      const entries = SHAPE_REGISTRY.filter((e) => e.kind === kind);
      expect(entries.map((e) => (e.kind === kind ? e.emblem : ""))).toEqual([...EMBLEM_IDS]);
    }
    const ids = SHAPE_REGISTRY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...EMBLEM_CHOICES]).toEqual(["", ...EMBLEM_IDS]);
  });

  it("shapeInjectionOf picks exactly the group", () => {
    const picked = shapeInjectionOf({ ...PARAM_DEFAULTS, seed: 7 } as never);
    expect(Object.keys(picked).sort()).toEqual([...SHAPE_INJECTION_KEYS].sort());
    expect(picked).toEqual(SHAPE_INJECTION_DEFAULTS);
  });
});
