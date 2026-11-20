// K1479: build k1436_screen.mjs jobs exactly as k1436_bar.ps1's Get-Jobs does (strip the paint
// keys from the K868 diag link, add the census look), so a freeze here is the bar's freeze.
//   node .claude/probes/K1479/make_jobs.mjs <out.json> <scene[,scene...]> [repeat]
// With repeat>1 each scene is emitted that many times under names <scene>_r01... (10 ring loads).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [, , out, list, repS = "1"] = process.argv;
const rep = +repS;
const sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const jobs = [];
for (const s of list.split(",")) {
  const d = JSON.parse(readFileSync(join(sceneDir, `${s}.diag.json`), "utf8"));
  const u = String(d.job.url);
  let q = u.slice(u.indexOf("?") + 1);
  q = q.split("&").filter((kv) => !/^(bg|bgcm|bgc0|cs|rp|gfh|tlk)=/.test(kv)).join("&");
  q += "&tlk=fill&cs=mono&bg=none&rp=gf&gfh=1";
  for (let k = 1; k <= rep; k++)
    jobs.push({ name: rep > 1 ? `${s}_r${String(k).padStart(2, "0")}` : s, query: q, hash: String(d.step.frozenHash), t: +d.step.frozenSim, w: 1240, h: 900 });
}
writeFileSync(out, JSON.stringify(jobs, null, 1));
console.log(`${jobs.length} jobs -> ${out}`);
for (const j of jobs) console.log(`${j.name} hash=${j.hash} t=${j.t}`);
