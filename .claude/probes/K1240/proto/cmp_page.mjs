import { readFileSync, copyFileSync } from "node:fs";
const a = JSON.parse(readFileSync(".claude/probes/K1240/out/s3/page_results.json", "utf8"));
const b = JSON.parse(readFileSync(".claude/probes/K1240/out/page_results.json", "utf8"));
copyFileSync(".claude/probes/K1240/out/page_results.json", ".claude/probes/K1240/out/s3b/page_results.json");
for (const name of Object.keys(b)) {
  if (name === "__errors") continue;
  const x = a[name]; const y = b[name];
  if (!x) { console.log(`${name}: no S3 baseline`); continue; }
  const t = (o, k) => { const v = o?.tests?.[k]; return v && typeof v === "object" ? `${v.ok}/${v.total}` : JSON.stringify(v); };
  const bb = (o) => { const v = o?.tests?.borderBand; return v ? `${v.inOk}/${v.outOk}/${v.total}` : "-"; };
  const fe = (o) => { const v = o?.tests?.fillEdge; return v ? `${v.inOk}/${v.total}` : "-"; };
  console.log(`${name}:\n  fillSamples S3 ${t(x, "fillSamples")} S3b ${t(y, "fillSamples")}\n  overlap S3 ${t(x, "overlap")} S3b ${t(y, "overlap")}\n  borderBand(in/out/tot) S3 ${bb(x)} S3b ${bb(y)}\n  fillEdge S3 ${fe(x)} S3b ${fe(y)}`);
}
console.log("errors S3b:", JSON.stringify(b.__errors ?? null));
