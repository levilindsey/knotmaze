// K1040 S1d, step 2: does the free-end counter read OWN as a join? On one
// scene (default muse_hash), takes S1b's and F2's free-end lists (scenes.ts
// runs under out/s1c/scenes_s1b and scenes_f2) and, at every S1b free end
// that src's form B no longer has (no src free end within 2W), reads src's
// top surface at the site and on the counter's circle (R = 0.8h): how many of
// the inked circle samples are OWN, a group, or a group through a fill, and
// what the counter's runs are with OWN ink read as paper.
// Run: npx vite-node .claude/probes/K1040/s1/fe_own.ts [scene] > out/s1d/fe_own_<scene>.txt
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, OWN } from "../../../../src/render/field/form_b";
import { FieldModel, cornerRadius, type OracleParams } from "../../../../src/render/field/oracle";
import { exitsBoth } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K934/exits";

const name = process.argv[2] ?? "muse_hash";
const sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const out = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/k1040-field/.claude/probes/K1040/s1/out/s1c";
const s = JSON.parse(readFileSync(join(sceneDir, `${name}.json`), "utf8")) as FieldScene;
s.look.ctrlArc ??= 0.47;
const fb = new FormB(s);
const mp: OracleParams = { rRound: 0, rOf: (_j, _i, th, st) => (st === "round" ? cornerRadius(3, s.look.halfWidth, th) : 0), spans: "k883", crMax: 3 };
const om = new FieldModel(s, mp);
const h = fb.h;
const W = fb.W;
type FE = { at: [number, number]; chain: number; s: number; side: number; runs: number };
const list = (t: string): FE[] => (JSON.parse(readFileSync(join(out, t, `${name}.json`), "utf8")) as { freeEnds: { list: FE[] } }).freeEnds.list;
const s1b = list("scenes_s1b");
const f2 = list("scenes_f2");
const near = (a: FE, L: FE[], d: number) => L.some((b) => Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]) < d);
const lost = s1b.filter((e) => !near(e, f2, 2 * W));
const kept = s1b.filter((e) => near(e, f2, 2 * W));
const added = f2.filter((e) => !near(e, s1b, 2 * W));
console.log(`${name}: S1b ${s1b.length}, F2 ${f2.length}; S1b sites lost under src ${lost.length}, kept ${kept.length}; src sites new ${added.length}`);
const R = 0.8 * h;
const g = W / 2;
let nOwnSite = 0;
let nOwnRing = 0;
let nRunsUp = 0;
let nOrInk = 0;
let nOrFree = 0;
let nSrcInk = 0;
const rows: string[] = [];
for (const e of lost) {
  const [x, y] = e.at;
  const r = fb.evalPoint(x, y);
  const topSite = r.top < 0 ? "paper" : r.top >= OWN ? "own" : `g${r.top}`;
  if (r.top >= OWN) nOwnSite++;
  let inked = 0;
  let own = 0;
  for (let k = 0; k < 64; k++) {
    const a = (2 * Math.PI * k) / 64;
    const q = fb.evalPoint(x + R * Math.cos(a), y + R * Math.sin(a));
    if (q.ink >= 0.5) {
      inked++;
      if (q.top >= OWN) own++;
    }
  }
  if (own > 0) nOwnRing++;
  const runsAll = exitsBoth((px: number, py: number) => fb.evalPoint(px, py).ink >= 0.5, x, y, R, g).runs;
  const runsNoOwn = exitsBoth((px: number, py: number) => {
    const q = fb.evalPoint(px, py);
    return q.ink >= 0.5 && q.top < OWN;
  }, x, y, R, g).runs;
  if (runsNoOwn <= 1 && runsAll > 1) nRunsUp++;
  if (r.ink >= 0.5) nSrcInk++;
  const oInk = om.evalPoint(x, y, false).ink;
  if (oInk) nOrInk++;
  const oRuns = oInk ? exitsBoth((px: number, py: number) => om.evalPoint(px, py, false).ink, x, y, R, g).runs : -1;
  if (oInk && oRuns <= 1) nOrFree++;
  rows.push(`  (${x}, ${y}) chain ${e.chain} side ${e.side}: ink ${r.ink.toFixed(3)} top ${topSite}; ring inked ${inked}/64, own ${own}; runs ${runsAll}, OWN as paper ${runsNoOwn}; oracle ink ${oInk} runs ${oRuns}`);
}
console.log(`lost sites inked (>= 0.5) under src: ${nSrcInk}; inked in the oracle: ${nOrInk}; a free end in the oracle (inked, runs <= 1): ${nOrFree}`);
console.log(`lost sites with top OWN at the site: ${nOwnSite}; with OWN ink on the ring: ${nOwnRing}; free again with OWN read as paper: ${nRunsUp}`);
// Like for like at src's own free ends: is each one a free end in the oracle too?
let fOrInk = 0;
let fOrFree = 0;
for (const e of f2) {
  const [x, y] = e.at;
  const oInk = om.evalPoint(x, y, false).ink;
  if (!oInk) continue;
  fOrInk++;
  if (exitsBoth((px: number, py: number) => om.evalPoint(px, py, false).ink, x, y, R, g).runs <= 1) fOrFree++;
}
console.log(`src (F2) free ends ${f2.length}: inked in the oracle ${fOrInk}, a free end in the oracle too ${fOrFree}`);
for (const l of rows.slice(0, 20)) console.log(l);
