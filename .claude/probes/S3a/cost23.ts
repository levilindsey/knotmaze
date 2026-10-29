// K992 s4: cost14.ts with master = oracle_m23.ts (90d4290c's oracle.ts) and fe8's loadScene inline.
// K868 S3a6: the from-scratch label build's CPU cost, master's corner rules
// (oracle_m23.ts, frozen at 90d4290c) against the branch's (src), on the 12
// scenes. The build is the page's: FieldModel, labelLimits, the pieces, the
// switch lines and the band strips. Per scene: 3 warm-up builds of each,
// then REPS rounds of A B B A; p50 of the FieldModel alone and of the whole
// build. Run under the perf lock.
// node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\cost23.ts [reps] [out.md]
import { writeFileSync } from "node:fs";
import * as M from "./oracle_m23";
import * as N from "../../../src/render/field/oracle";
import { buildLabelPieces, labelLimits } from "../../../src/render/label/label_pieces";
import { buildBandStrips } from "../../../src/render/label/label_band";
import { findSwitchLines } from "../../../src/render/label/label_switch";
import type { FieldScene } from "../../../src/render/field/scene";
import { readFileSync } from "node:fs";
const loadScene = (name: string): FieldScene => {
  const scene = JSON.parse(readFileSync(`.claude/probes/S3a/scenes/${name}.json`, "utf8")) as FieldScene;
  scene.look.ctrlArc ??= 0.47;
  return scene;
};

const SCENES = [
  "def", "fat", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64",
  "g41_user_tw42", "g41_user_tw64", "muse_default_tw", "muse_hash", "ring", "user_tw42.lightpaper",
];
const REPS = Number(process.argv[2] ?? "6");
const OUT = process.argv[3] ?? ".claude/probes/S3a/pops14/cost14.md";

type Mod = typeof N;
const once = (O: Mod | typeof M, scene: FieldScene): { model: number; total: number } => {
  const hw = scene.look.halfWidth;
  const params = {
    rRound: 0,
    rOf: (_j: number, _i: number, th: number, st: string) => (st === "round" ? O.cornerRadius(3, hw, th) : 0),
    spans: "k883",
    crMax: 3,
    labelOnly: true,
  } as N.OracleParams;
  const t0 = performance.now();
  const m = new (O.FieldModel as typeof N.FieldModel)(scene, params);
  const t1 = performance.now();
  const lim = labelLimits(m.polys.length, m.clusters.length);
  if (lim) throw new Error(`label limits: ${lim}`);
  const pieces = buildLabelPieces(m);
  const lines = findSwitchLines(m);
  buildBandStrips(m, pieces, lines);
  const t2 = performance.now();
  return { model: t1 - t0, total: t2 - t0 };
};
const p50 = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const f2 = (v: number): string => v.toFixed(2);

const lines: string[] = [
  "# K868 S3a6: the label build's CPU cost, master's rules against the branch's",
  "",
  `Node ${process.version}, ${REPS} rounds of A B B A after 3 warm-up builds each; p50 ms. Taken while other agents ran Python fits on this machine (under load).`,
  "",
  "| scene | model: master | model: branch | ratio | build: master | build: branch | ratio |",
  "|---|---|---|---|---|---|---|",
];
let sm = 0;
let sn = 0;
let tm = 0;
let tn = 0;
for (const name of SCENES) {
  const scene = loadScene(name);
  for (let k = 0; k < 3; k++) {
    once(M, scene);
    once(N, scene);
  }
  const a = { model: [] as number[], total: [] as number[] };
  const b = { model: [] as number[], total: [] as number[] };
  const push = (t: { model: number[]; total: number[] }, r: { model: number; total: number }) => {
    t.model.push(r.model);
    t.total.push(r.total);
  };
  for (let k = 0; k < REPS; k++) {
    push(a, once(M, scene));
    push(b, once(N, scene));
    push(b, once(N, scene));
    push(a, once(M, scene));
  }
  const am = p50(a.model);
  const bm = p50(b.model);
  const at = p50(a.total);
  const bt = p50(b.total);
  sm += am;
  sn += bm;
  tm += at;
  tn += bt;
  const row = `| ${name} | ${f2(am)} | ${f2(bm)} | ${f2(bm / am)} | ${f2(at)} | ${f2(bt)} | ${f2(bt / at)} |`;
  lines.push(row);
  console.log(row);
}
lines.push(`| sum of p50s | ${f2(sm)} | ${f2(sn)} | ${f2(sn / sm)} | ${f2(tm)} | ${f2(tn)} | ${f2(tn / tm)} |`, "");
writeFileSync(OUT, lines.join("\n"));
console.log(lines[lines.length - 2]);
console.log(`wrote ${OUT}`);
