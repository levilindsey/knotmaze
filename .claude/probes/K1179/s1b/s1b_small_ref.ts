// K1179 S1b: the small-round clause (r0 >= 1h, r < 0.25h) counted for
// Run I's form B, task 2's reference and the lean solve, with Run I's
// null bands (foot past span, cap band room <= 0.5h, root band,
// omega = 0). Run: npx.cmd vite-node .claude/probes/K1179/s1b/s1b_small_ref.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";
import { loadScene, rootBandEff, SCENES_12 } from "../outline";
import { FormB as FormBRef } from "./form_b_ref";
import { leanCorners } from "./lean";
import { fmt } from "./lib_s1b";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });

function count(fb: any, corners: any[]): { total: number; inside: number; outside: number } {
  let total = 0;
  let inside = 0;
  for (const c of corners) {
    if (!(c.r0 >= fb.h && c.r < 0.25 * fb.h)) continue;
    total++;
    const rb = rootBandEff(fb, c.theta);
    const inNull = c.dA > fb.arms[c.a].L + 1e-9 || c.dB > fb.arms[c.b].L + 1e-9
      || c.room <= 0.5 * fb.h || Math.min(c.dVa, c.dVb) < rb || c.omega <= 0;
    if (inNull) inside++;
  }
  return { total, inside, outside: total - inside };
}

const txt: string[] = [];
const rows: any[] = [];
for (const name of SCENES_12) {
  const sc = loadScene(name);
  const before: any = new FormB(sc);
  const ref: any = new FormBRef(sc);
  const lean = leanCorners(ref);
  const row = { scene: name, before: count(before, before.corners), ref: count(ref, ref.corners), lean: count(ref, lean) };
  rows.push(row);
  txt.push(`${name}: small total/outside before ${row.before.total}/${row.before.outside} ref ${row.ref.total}/${row.ref.outside} lean ${row.lean.total}/${row.lean.outside}`);
  console.log(txt[txt.length - 1]);
}
const tot = (k: "before" | "ref" | "lean") => rows.reduce((m, r) => ({ total: m.total + r[k].total, inside: m.inside + r[k].inside, outside: m.outside + r[k].outside }), { total: 0, inside: 0, outside: 0 });
txt.push(`TOTAL before ${JSON.stringify(tot("before"))} ref ${JSON.stringify(tot("ref"))} lean ${JSON.stringify(tot("lean"))}`);
writeFileSync(`${OUT}/small_ref.json`, JSON.stringify({ rows, totals: { before: tot("before"), ref: tot("ref"), lean: tot("lean") } }, null, 1));
writeFileSync(`${OUT}/small_ref.txt`, txt.join("\n") + "\n");
console.log(txt[txt.length - 1]);
void fmt;
