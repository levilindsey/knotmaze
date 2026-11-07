import { readFileSync, copyFileSync, existsSync } from "node:fs";
const scenes = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const mode = process.argv[2] ?? "exact";
let fails = 0;
function checkRow(name, dir, a, b) {
  const dp99 = b.p99 - a.p99;
  const dOver = b.over2 - a.over2;
  const tolOver = Math.max(1, 0.02 * a.over2);
  const ok = dp99 <= 0.01 && dOver <= tolOver;
  if (!ok) fails++;
  console.log(`${name} ${dir}: p99 ${a.p99.toFixed(3)} -> ${b.p99.toFixed(3)} (d ${dp99.toFixed(3)}) over2 ${a.over2} -> ${b.over2} (d ${dOver}, tol ${tolOver.toFixed(1)}) ${ok ? "OK" : "FAIL"}`);
}
if (mode === "exact") {
  for (const n of scenes) {
    const a = JSON.parse(readFileSync(`.claude/probes/K1240/out/s3/exact_${n}.json`, "utf8"));
    const b = JSON.parse(readFileSync(`.claude/probes/K1240/out/s3f/exact_${n}.json`, "utf8"));
    checkRow(n, "A", a.A, b.A);
    checkRow(n, "B", a.B, b.B);
  }
} else if (mode === "move") {
  const mult = process.argv[3] ?? "0.1";
  const list = mult === "0.5" ? ["def", "ring", "fat"] : scenes;
  for (const n of list) {
    const a = JSON.parse(readFileSync(`.claude/probes/K1240/out/s3d/fresh${mult}_exact_${n}.json`, "utf8"));
    const b = JSON.parse(readFileSync(`.claude/probes/K1240/out/s3f/move${mult}_exact_${n}.json`, "utf8"));
    checkRow(n, "A", a.A, b.A);
    checkRow(n, "B", a.B, b.B);
  }
} else if (mode === "page") {
  copyFileSync(".claude/probes/K1240/out/page_results.json", ".claude/probes/K1240/out/s3f/page_results.json");
  const a = JSON.parse(readFileSync(".claude/probes/K1240/out/s3/page_results.json", "utf8"));
  const b = JSON.parse(readFileSync(".claude/probes/K1240/out/s3f/page_results.json", "utf8"));
  for (const name of Object.keys(b)) {
    if (name === "__errors") continue;
    const x = a[name]; const y = b[name];
    if (!x) { console.log(`${name}: no S3 baseline`); fails++; continue; }
    const t = (o, k) => { const v = o?.tests?.[k]; return v && typeof v === "object" ? `${v.ok}/${v.total}` : JSON.stringify(v); };
    const bb = (o) => { const v = o?.tests?.borderBand; return v ? `${v.inOk}/${v.outOk}/${v.total}` : "-"; };
    const fe = (o) => { const v = o?.tests?.fillEdge; return v ? `${v.inOk}/${v.total}` : "-"; };
    console.log(`${name}:\n  fillSamples S3 ${t(x, "fillSamples")} S3e ${t(y, "fillSamples")}\n  overlap S3 ${t(x, "overlap")} S3e ${t(y, "overlap")}\n  borderBand(in/out/tot) S3 ${bb(x)} S3e ${bb(y)}\n  fillEdge S3 ${fe(x)} S3e ${fe(y)}`);
  }
  console.log("errors S3e:", JSON.stringify(b.__errors ?? null));
  if (!existsSync(".claude/probes/K1240/out/s3f/page_results.json")) fails++;
}
console.log(fails ? `${fails} FAILURES` : "ALL WITHIN TOLERANCE");
