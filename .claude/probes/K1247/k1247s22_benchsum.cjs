// K1247 s22: one line per run and phase from a k1247s22_bench.mjs output: frame, worker parts, reply bytes, band count and resizes.
//   node .claude/probes/K1247/k1247s22_benchsum.cjs <out.json>
const fs = require("fs"); const t = fs.readFileSync(process.argv[2], "utf8").trim();
let recs; try { recs = JSON.parse(t); } catch { recs = t.split(/\n/).map((l) => JSON.parse(l)); }
if (!Array.isArray(recs)) recs = recs.runs ?? recs.results ?? [recs];
const p = (o) => (o && o.n ? o.p50 : "-");
for (const r of recs) {
  const tag = (r.url.includes("ob=1") ? "on " : "off") + (r.drag?.outline?.bandRec ? "[rec]" : "[--]");
  const ph = (k) => { const x = r[k] ?? {}; const o = x.outline ?? {}; return `${k}: frame ${p(x.frameMs)} iv ${p(x.intervalMs)} | worker ${p(o.worker)} (frame ${p(o.frame)} zC ${p(o.zChains)} fill ${p(o.fill)} paint ${p(o.paint)} band ${p(o.band)}) rt ${p(o.roundTrip)} up ${p(o.upload)} draw ${p(o.draw)} replies ${o.replies ?? "-"} bytes ${o.replyBytes ?? "-"} bandV ${o.bandCount ?? "-"} resizes ${o.bandResizes ?? "-"}`; };
  console.log(tag, ph("rest")); console.log("   ", ph("drag"));
}
