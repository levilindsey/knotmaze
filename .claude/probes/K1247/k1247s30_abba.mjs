// K1247 s29: one line per run of a k1240s4b_bench output (k1247s29_bench.ps1): the outline worker's parts
// (p50 over the phase), the draw and the page frame; then each port's mean over its runs and its spread
// (max - min), so A B B A reads as master vs branch with the run-to-run spread beside it.
//   node .claude/probes/K1247/k1247s29_abba.mjs <out.json> [phase=drag|rest] [q=p50|p95]
import { readFileSync } from "node:fs";
const [file, ...rest] = process.argv.slice(2);
const arg = (k, d) => rest.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const phase = arg("phase", "drag"); const q = arg("q", "p50");
const J = JSON.parse(readFileSync(file, "utf8"));
const cols = ["worker", "frame", "zChains", "fill", "paint", "band", "roundTrip", "upload", "draw"];
const by = new Map();
console.log(`${phase} ${q}: port   ${cols.map((c) => c.padStart(9)).join("")}  frameMs  replies`);
for (const r of J.runs) {
  const port = (r.url.match(/:(\d+)\//) ?? [])[1] ?? "?";
  const P = r[phase]; if (!P || !P.outline) { console.log(`${port} no ${phase} outline ${JSON.stringify(r.errors ?? [])}`); continue; }
  const v = cols.map((c) => P.outline[c]?.[q] ?? NaN);
  v.push(P.frameMs?.[q] ?? NaN);
  (by.get(port) ?? by.set(port, []).get(port)).push(v);
  console.log(`        ${port}   ${v.slice(0, cols.length).map((x) => x.toFixed(2).padStart(9)).join("")}  ${v[cols.length].toFixed(2).padStart(7)}  ${P.outline.replies}`);
}
for (const [port, rows] of by) {
  const m = rows[0].map((_, i) => rows.reduce((s, r) => s + r[i], 0) / rows.length);
  const sp = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i])) - Math.min(...rows.map((r) => r[i])));
  console.log(`mean    ${port}   ${m.slice(0, cols.length).map((x) => x.toFixed(2).padStart(9)).join("")}  ${m[cols.length].toFixed(2).padStart(7)}  (n ${rows.length})`);
  if (rows.length > 1) console.log(`spread  ${port}   ${sp.slice(0, cols.length).map((x) => x.toFixed(2).padStart(9)).join("")}  ${sp[cols.length].toFixed(2).padStart(7)}`);
}
