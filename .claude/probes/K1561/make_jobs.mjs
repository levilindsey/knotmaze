// K1561 (27Q): write the K1436 bar's jobs (its Get-Jobs: diag query stripped of bg/cs/rp/gfh/tlk,
// then tlk=fill&cs=mono&bg=none&rp=gf&gfh=1) for screen3.mjs.
import { readFileSync, writeFileSync } from "node:fs";
const SCENES = ["muse_hash", "g41_def_tw42", "g41_ring_tw64", "user_tw42.lightpaper", "def", "fat", "g41_def_tw64", "g41_user_tw42", "muse_default_tw", "ring", "g41_ring_tw42", "g41_user_tw64"];
const dir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const jobs = SCENES.map((s) => {
  const d = JSON.parse(readFileSync(`${dir}/${s}.diag.json`, "utf8"));
  const u = String(d.job.url); let q = u.slice(u.indexOf("?") + 1);
  q = q.split("&").filter((p) => !/^(bg|bgcm|bgc0|cs|rp|gfh|tlk)=/.test(p)).join("&");
  q += "&tlk=fill&cs=mono&bg=none&rp=gf&gfh=1";
  return { name: s, query: q, hash: String(d.step.frozenHash), t: +d.step.frozenSim, w: 1240, h: 900 };
});
writeFileSync(process.argv[2], JSON.stringify(jobs, null, 1));
console.log("jobs", jobs.length, jobs.map((j) => `${j.name}:${j.hash}@${j.t}`).join(" "));
