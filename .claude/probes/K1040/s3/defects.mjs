// K1040 S3: the DEFECT sites of out/verdict_<scene>.json, one line each:
// form B's top (chain, s, code, key, fade bits) against the GPU's and
// whether labelAt (the float64 mirror) gives the GPU's answer.
//   node .claude/probes/K1040/s3/defects.mjs [scene,...]
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "out");
const want = process.argv[2]?.split(",");
const files = readdirSync(out).filter((f) => /^verdict_.*\.json$/.test(f));
const tally = {};
for (const f of files) {
  const scene = f.slice(8, -5);
  if (want && !want.includes(scene)) continue;
  const v = JSON.parse(readFileSync(join(out, f), "utf8"));
  const def = v.sites.filter((s) => s.cls === "DEFECT");
  for (const s of def) {
    const r = s.ref, g = s.gpu, m = s.mirror;
    const same = m && m.chain === g.chain && Math.abs(m.s - g.s) < 1e-3 && m.code === g.code;
    const key = `${scene} ${s.why} mirror=${same ? "gpu" : "differs"}`;
    tally[key] = (tally[key] ?? 0) + 1;
    if (process.env.ALL || tally[key] <= 2)
      console.log(`${scene} ${s.i},${s.j} ${s.why} dk ${(g.key - r.key).toExponential(2)}: ref c${r.chain} s ${r.s.toFixed(3)} code ${r.code} key ${r.key.toFixed(4)} fade ${r.fade} nSurf ${r.nSurf} | gpu c${g.chain} s ${g.s.toFixed(3)} code ${g.code} key ${g.key.toFixed(4)} d ${g.d.toFixed(3)} fill ${g.fill} | mirror ${same ? "= gpu" : JSON.stringify(m)}`);
  }
}
console.log(JSON.stringify(tally, null, 1));
