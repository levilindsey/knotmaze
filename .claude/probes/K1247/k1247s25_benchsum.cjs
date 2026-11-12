// K1247 s25: one line per run from a k1247s24_bench.mjs output: rest frame, drag frame (all, reply, quiet) p50 / p95,
// and the TF placement's GPU / CPU ms on reply frames.
//   node .claude/probes/K1247/k1247s25_benchsum.cjs <bench.json>
const fs = require("fs");
const out = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const q = (o) => (o && o.n ? `${o.p50}/${o.p95}` : "-");
for (const r of out.runs) {
  const ob = /[?&]ob=0/.test(r.url) ? "ob0" : "ob1";
  const d = r.drag ?? {};
  console.log(`${ob} rec=${d.outline?.bandRec ? 1 : 0} rest ${q(r.rest?.frameMs)} | drag all ${q(d.frameMs)} reply ${q(d.frameReplyMs)} (n ${d.frameReplyMs?.n ?? 0}) quiet ${q(d.frameQuietMs)} | tf gpu ${q(d.tfGpuMs)} cpu ${q(d.tfCpuMs)}`);
}
