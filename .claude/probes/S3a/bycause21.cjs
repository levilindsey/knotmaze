// K992 s3: pops (count and area) by census cause, per tag, on one run.
// node .claude/probes/S3a/bycause21.cjs <run> <tag>...   (tags under cmpdir19)
const fs = require("fs");
const [run, ...tags] = process.argv.slice(2);
const rows = new Map();
for (const t of tags) {
  const J = JSON.parse(fs.readFileSync(`.claude/probes/S3a/cmpdir19/${t}/${run}.json`, "utf8"));
  for (const T of J.transitions)
    for (const p of T.pops) {
      const k = p.cause ?? "?";
      if (!rows.has(k)) rows.set(k, {});
      const r = rows.get(k);
      r[t] ??= [0, 0];
      r[t][0]++;
      r[t][1] += p.area;
    }
}
console.log(`${run} | ${tags.map((t) => `${t} pops/px`).join(" | ")}`);
const tot = Object.fromEntries(tags.map((t) => [t, [0, 0]]));
for (const [k, r] of [...rows].sort()) {
  console.log(`${k} | ${tags.map((t) => { const v = r[t] ?? [0, 0]; tot[t][0] += v[0]; tot[t][1] += v[1]; return `${v[0]}/${v[1]}`; }).join(" | ")}`);
}
console.log(`ALL | ${tags.map((t) => `${tot[t][0]}/${tot[t][1]}`).join(" | ")}`);
