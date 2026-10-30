// K810: Fuse.js, uFuzzy and fuzzysort against the shipped panel search
// (src/ui/panel_search.ts) on the fixed fixture (test/ui/panel_search_fixture.ts).
// Run: npx tsx .claude/probes/K810/compare.ts
import Fuse from "fuse.js";
import uFuzzy from "@leeoniya/ufuzzy";
import fuzzysort from "fuzzysort";
import { ROWS, QUERIES } from "../../../test/ui/panel_search_fixture";
import { buildPanelIndex, searchPanel } from "../../../src/ui/panel_search";

interface Doc {
  id: string;
  text: string;
}
const docs: Doc[] = ROWS.map((r) => ({
  id: r.id,
  text: [r.label, r.id.replace(/^btn:/, ""), ...(r.tags ?? []), ...(r.options ?? []), ...(r.folders ?? [])].join(" "),
}));
const texts = docs.map((d) => d.text);

function pass(ids: string[], c: (typeof QUERIES)[number]): boolean {
  if (c.top === null) {
    if (ids.length !== 0) return false;
  } else if (c.top !== undefined && ids[0] !== c.top) return false;
  for (const id of c.has ?? []) if (!ids.includes(id)) return false;
  for (const id of c.not ?? []) if (ids.includes(id)) return false;
  if (c.order && JSON.stringify(ids) !== JSON.stringify(c.order)) return false;
  return true;
}

// Shipped matcher.
const index = buildPanelIndex(ROWS);
const shipped = (q: string): string[] => (searchPanel(index, q) ?? []).map((m) => m.id);

// Fuse.js (weighted fields like the panel's: label heaviest).
const fuse = new Fuse(
  ROWS.map((r) => ({
    id: r.id,
    label: r.label,
    key: r.id.replace(/^btn:/, ""),
    tags: (r.tags ?? []).join(" "),
    options: (r.options ?? []).join(" "),
    folders: (r.folders ?? []).join(" "),
  })),
  {
    keys: [
      { name: "label", weight: 1 },
      { name: "key", weight: 0.6 },
      { name: "tags", weight: 0.6 },
      { name: "options", weight: 0.3 },
      { name: "folders", weight: 0.25 },
    ],
    includeScore: true,
    threshold: 0.4,
    ignoreLocation: true,
  }
);
const fuseIds = (q: string): string[] => fuse.search(q).map((r) => r.item.id);

// uFuzzy over one joined text per row.
const uf = new uFuzzy({});
const ufIds = (q: string): string[] => {
  const [idxs, info, order] = uf.search(texts, q);
  if (!info) return [];
  const ord = order ?? idxs.map((_, i) => i);
  return ord.map((i) => docs[info.idx[i]].id);
};

// fuzzysort over the same texts.
const fzTargets = docs.map((d) => ({ id: d.id, text: d.text }));
const fzIds = (q: string): string[] =>
  fuzzysort.go(q, fzTargets, { key: "text", threshold: -10000 }).map((r) => r.obj.id);

const libs: Array<[string, (q: string) => string[]]> = [
  ["shipped (panel_search)", shipped],
  ["Fuse.js", fuseIds],
  ["uFuzzy", ufIds],
  ["fuzzysort", fzIds],
];

function timeUs(fn: (q: string) => string[]): number {
  const reps = 300;
  const rounds: number[] = [];
  for (let r = 0; r < 5; r++) {
    const t0 = performance.now();
    for (let i = 0; i < reps; i++) for (const c of QUERIES) fn(c.q);
    rounds.push(((performance.now() - t0) * 1000) / (reps * QUERIES.length));
  }
  rounds.sort((a, b) => a - b);
  return rounds[2];
}

console.log(`queries: ${QUERIES.length}, rows: ${ROWS.length}`);
const summary: Array<{ name: string; pass: number; us: number }> = [];
for (const [name, fn] of libs) {
  let n = 0;
  const failed: string[] = [];
  for (const c of QUERIES) {
    if (pass(fn(c.q), c)) n++;
    else failed.push(c.q);
  }
  const us = timeUs(fn);
  summary.push({ name, pass: n, us });
  console.log(`${name}: ${n}/${QUERIES.length} pass, ${us.toFixed(1)} us/query; failed: ${failed.join(" | ") || "none"}`);
}
