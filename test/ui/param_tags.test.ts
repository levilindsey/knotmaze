import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PARAM_TAGS } from "../../src/ui/param_tags";

// K793: every settings panel row carries search tags (src/ui/param_tags.ts),
// so a player who forgot a row's name still finds it. The rule, named in
// .claude/rules/gameplay-panel.md's PANEL SEARCH entry: a new row gets 3-10
// lowercase tags, its link key among them. This test finds the rows by
// scanning tweakpane_panel.ts's source for the call forms that create them;
// a row made another way (a computed key in a new loop) trips the guard
// below, which asks for this scan to learn the new form.

const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const panel = read("../../src/ui/tweakpane_panel.ts");
const urlState = read("../../src/ui/url_state.ts");

const all = (re: RegExp, text: string): string[] => [...text.matchAll(re)].map((m) => m[1]);

// The row ids the panel creates: param keys, and `btn:<title>` for buttons.
function panelRowIds(): string[] {
  const ids = [
    // row(parent, obj, "key", ...)
    ...all(/(?<![\w.])row\(\s*[^,()]+,\s*[^,()]+,\s*"(\w+)"/g, panel),
    // The wrappers that take the key first.
    ...all(/(?<![\w.])(?:chaseRow|paceRow|accuracyRow|chanceRow|tuneRow|shapeRow)\(\s*"(\w+)"/g, panel),
    // turnRow(parent, "key", ...)
    ...all(/(?<![\w.])turnRow\(\s*[^,()]+,\s*"(\w+)"/g, panel),
    // A direct binding (the seed row).
    ...all(/\.addBinding\(\s*\w+,\s*"(\w+)"/g, panel),
    // The backdrop's custom color rows, made in a loop over customKeys.
    ...all(/"(\w+)"/g, /const customKeys = \[([^\]]*)\]/.exec(panel)?.[1] ?? ""),
    // Buttons: button(parent, "Title", ...) and the Daily button.
    ...all(/(?<![\w.])button\(\s*[^,()]+,\s*"([^"]+)"/g, panel).map((t) => `btn:${t}`),
    ...all(/\.addButton\(\{\s*title:\s*"([^"]+)"/g, panel).map((t) => `btn:${t}`),
  ];
  return [...new Set(ids)];
}

// The link key each param is read from (name: readX(query, "key", ...)),
// plus the keys url_state.ts reads by hand.
function linkKeys(): Record<string, string> {
  const keys: Record<string, string> = {};
  for (const m of urlState.matchAll(/(\w+):[^:;{}]*?read\w+\(\s*query,\s*"(\w+)"/g)) keys[m[1]] ??= m[2];
  Object.assign(keys, { exploration: "xp", minotaur: "mt", gameMode: "gm", appearMode: "am" });
  // The "Real time" row binds a view of `clock`.
  if (keys.clock) keys.realTime = keys.clock;
  return keys;
}

describe("param_tags (K793)", () => {
  const ids = panelRowIds();

  it("the scan finds the panel's rows", () => {
    // 228 rows on 2026-10-21 (the page's __knotPanelSearch().rows agreed).
    expect(ids.length).toBeGreaterThan(200);
    for (const id of ["threadWidth", "seed", "realTime", "backgroundAccent3", "minoStopMin", "minoSpeed", "btn:Daily", "btn:Reset to defaults"]) {
      expect(ids).toContain(id);
    }
  });

  it("no row is made with a computed key the scan cannot see", () => {
    // row(..., <identifier>, ...) calls: the bodies of chaseRow, turnRow,
    // paceRow, accuracyRow, chanceRow, tuneRow and shapeRow, and the
    // customKeys loop. A new one means a new way to make rows: teach
    // panelRowIds() about it, then update this count.
    const computed = [...panel.matchAll(/(?<![\w.])row\(\s*[^,()]+,\s*[^,()]+,\s*([A-Za-z_]\w*)\s*,/g)].length;
    expect(computed).toBe(8);
  });

  it("every panel row has tags", () => {
    const untagged = ids.filter((id) => !PARAM_TAGS[id]);
    expect(untagged, "rows with no entry in src/ui/param_tags.ts").toEqual([]);
  });

  it("no tags for a row the panel no longer has", () => {
    const stale = Object.keys(PARAM_TAGS).filter((id) => !ids.includes(id));
    expect(stale).toEqual([]);
  });

  it("3-10 tags a row, lowercase, trimmed, no repeats", () => {
    const bad: string[] = [];
    for (const [id, tags] of Object.entries(PARAM_TAGS)) {
      if (tags.length < 3 || tags.length > 10) bad.push(`${id}: ${tags.length} tags`);
      if (new Set(tags).size !== tags.length) bad.push(`${id}: a repeated tag`);
      for (const t of tags) {
        if (t !== t.toLowerCase() || t !== t.trim() || t === "" || /\s\s/.test(t)) bad.push(`${id}: "${t}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("a row's tags include its link key", () => {
    const keys = linkKeys();
    const missing = ids.filter((id) => keys[id] && !PARAM_TAGS[id]?.includes(keys[id])).map((id) => `${id} (${keys[id]})`);
    expect(missing).toEqual([]);
  });
});
