import { describe, expect, it } from "vitest";
import {
  buildPanelIndex,
  queryWords,
  searchPanel,
  withinOne,
} from "../../src/ui/panel_search";
import { QUERIES, ROWS } from "./panel_search_fixture";

const index = buildPanelIndex(ROWS);
const ids = (q: string): string[] =>
  (searchPanel(index, q) ?? []).map((m) => m.id);
const find = (q: string, id: string) =>
  (searchPanel(index, q) ?? []).find((m) => m.id === id);

describe("panel search: the fixed queries", () => {
  it("has at least 30 of them", () => {
    expect(QUERIES.length).toBeGreaterThanOrEqual(30);
  });
  for (const c of QUERIES) {
    it(`"${c.q}": ${c.why}`, () => {
      const got = ids(c.q);
      if (c.top === null) expect(got).toEqual([]);
      else if (c.top !== undefined) expect(got[0]).toBe(c.top);
      for (const id of c.has ?? []) expect(got).toContain(id);
      for (const id of c.not ?? []) expect(got).not.toContain(id);
      if (c.order) expect(got).toEqual(c.order);
    });
  }
});

describe("panel search: rules", () => {
  it("an empty or punctuation-only query is no filter", () => {
    expect(searchPanel(index, "")).toBeNull();
    expect(searchPanel(index, "   ")).toBeNull();
    expect(searchPanel(index, " - (,) ")).toBeNull();
  });

  it("every word must match (AND)", () => {
    expect(ids("fire xyzzy")).toEqual([]);
    expect(ids("thread width")).toEqual(["threadWidth"]);
  });

  it("marks the label's matched letters", () => {
    expect(find("ripple", "pluckRipple")?.ranges).toEqual([[5, 11]]);
    expect(find("thr wid", "threadWidth")?.ranges).toEqual([
      [0, 3],
      [7, 10],
    ]);
    expect(find("Weave Density", "weaveDensity")?.ranges).toEqual([
      [0, 5],
      [6, 13],
    ]);
    // A typo marks the whole word it matched.
    expect(find("lenght", "trailLength")?.ranges).toEqual([[6, 12]]);
    // A tag-only match marks nothing.
    expect(find("thick", "threadWidth")?.ranges).toEqual([]);
  });

  it("hints the tag or option that matched when the label did not", () => {
    expect(find("tw", "threadWidth")?.hint).toBe("tw");
    expect(find("thick", "threadWidth")?.hint).toBe("thick");
    expect(find("hunter", "minotaur")?.hint).toBe("Hunter");
    expect(find("guard", "minotaur")?.hint).toBe("Guard");
    expect(find("monster", "minotaur")?.hint).toBe("monster");
    expect(find("tempreature", "temperature")?.hint).toBe("temperature");
    expect(find("no sound", "muted")?.hint).toBe("no sound");
    // The label matched: no hint.
    expect(find("agit", "temperature")?.hint).toBeNull();
    expect(find("weave", "weaveDensity")?.hint).toBeNull();
    // A folder title shows above the row: no hint either.
    expect(find("burn", "fireDelay")?.hint).toBeNull();
    // Half label, half tag: the tag's half.
    expect(find("thread thick", "threadWidth")?.hint).toBe("thick");
  });

  it("ranks the label over a tag over an option over a folder", () => {
    const burn = searchPanel(index, "burn") ?? [];
    const score = (id: string) => burn.find((m) => m.id === id)?.score ?? 0;
    expect(score("burnt")).toBeGreaterThan(score("fireSpeed"));
    expect(score("fireSpeed")).toBeGreaterThan(score("gameMode"));
    expect(score("gameMode")).toBeGreaterThan(score("fireDelay"));
  });

  it("fuzzes only words with no exact or prefix match anywhere", () => {
    // seed -> speed is one insertion, but "seed" is a label.
    expect(ids("seed")).toEqual(["seed"]);
    expect(ids("speed")).not.toContain("seed");
    // Short words never fuzz.
    expect(ids("sed")).toEqual([]);
  });

  it("is deterministic", () => {
    for (const c of QUERIES) {
      expect(searchPanel(buildPanelIndex(ROWS), c.q)).toEqual(
        searchPanel(index, c.q)
      );
    }
  });
});

describe("panel search: pieces", () => {
  it("withinOne: one substitution, insertion, deletion or swap", () => {
    expect(withinOne("volume", "volume")).toBe(true);
    expect(withinOne("volune", "volume")).toBe(true);
    expect(withinOne("voluume", "volume")).toBe(true);
    expect(withinOne("volme", "volume")).toBe(true);
    expect(withinOne("vloume", "volume")).toBe(true);
    expect(withinOne("volmue", "volume")).toBe(true);
    expect(withinOne("vlume", "volume")).toBe(true);
    expect(withinOne("vulune", "volume")).toBe(false);
    expect(withinOne("vol", "volume")).toBe(false);
    expect(withinOne("ovlume", "volume")).toBe(true);
    // A letter moved two places is two edits.
    expect(withinOne("olvume", "volume")).toBe(false);
    expect(withinOne("ovlmue", "volume")).toBe(false);
  });

  it("queryWords folds case and accents and splits at punctuation", () => {
    expect(queryWords("Fire-Speed  (fsp)")).toEqual(["fire", "speed", "fsp"]);
    expect(queryWords("AGITATIÓN")).toEqual(["agitation"]);
    // The query is lowercased first: camelCase stays one word.
    expect(queryWords("fireSpeed")).toEqual(["firespeed"]);
  });
});
