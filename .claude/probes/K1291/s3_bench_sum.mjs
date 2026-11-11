// K1291 s3: one line per bench run (s3_bench.ps1's JSON files):
// port, rest / drag frame p50 (ms), the pair drawn (lite 1 = without the
// reveal code), GPU p50 per outline program at rest and mid-drag, errors.
//   node s3_bench_sum.mjs <file.json> ...
import { readFileSync } from "node:fs";
const f2 = (x) => (x && Number.isFinite(x.p50) ? x.p50.toFixed(2) : "-");
const g = (r) => Object.entries(r?.gpuMs ?? {}).map(([k, v]) => `${k} ${f2(v)}`).join(", ");
for (const file of process.argv.slice(2)) {
  const j = JSON.parse(readFileSync(file, "utf8"));
  for (const r of j.runs) {
    const port = new URL(r.url).port;
    console.log(`${file.split(/[\\/]/).pop()} ${port} rest ${f2(r.rest?.frameMs)} drag ${f2(r.drag?.frameMs)} lite ${r.rest?.drewLite}/${r.drag?.drewLite}${r.pinned ? ` pin ${r.pinned.toFixed(2)}` : ""}${r.lite !== undefined ? ` LITE ${r.lite}` : ""} | gpu rest {${g(r.rest)}} drag {${g(r.drag)}} | err ${r.errors.length}`);
  }
}
