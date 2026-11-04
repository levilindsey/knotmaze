// K1040 S3d: the gate's two tables from the phone runs (render-sync p50 ms,
// K923's method). The gate: each mode's label cost, its p50 minus floorall's
// (s3d_gate.ps1's runs s3dfit, s3dtent, s3dtentv, s3dfloorall), against 2 ms.
// What bounds it: differences on one page (the variants runs s3d2, s3d3; see
// split.mjs): fixed = empty - floor = upload + empty pass, the empty pass =
// kick (one round trip) + store, and the vertex-light tent past the empty pass
// = VS(v) + raster(v). Also flags a run the phone guard saw touched.
// Usage: node s3d_table.mjs [out.md]
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SCENES = [
  "muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper",
  "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64",
];
const touched = new Set();
const load = (name) => {
  const f = join(here, "out", `phone_time_${name}.json`);
  if (!existsSync(f)) return null;
  const j = JSON.parse(readFileSync(f, "utf8"));
  if (j.touchedDuring) touched.add(name);
  return j;
};
const p50 = (name) => load(name)?.sync?.p50 ?? NaN;
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : "-");
const med = (a) => { const b = a.filter(Number.isFinite).sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };

function table(cols) {
  const rows = [`| scene | ${cols.map((c) => c[0]).join(" | ")} |`, `|---|${cols.map(() => "---").join("|")}|`];
  const all = cols.map(() => []);
  for (const s of SCENES) {
    const vals = cols.map((c) => c[1](s));
    vals.forEach((x, i) => all[i].push(x));
    rows.push(`| ${s} | ${vals.map((x, i) => (cols[i][2] ? cols[i][2](x) : f1(x))).join(" | ")} |`);
  }
  rows.push(`| median | ${all.map((a, i) => (cols[i][2] ? "" : f1(med(a)))).join(" | ")} |`);
  rows.push(`| max | ${all.map((a, i) => (cols[i][2] ? "" : f1(Math.max(...a.filter(Number.isFinite))))).join(" | ")} |`);
  return rows.join("\n");
}

const cost = (label) => (s) => p50(`${label}_${s}`) - p50(`s3dfloorall_${s}`);
const v2 = (a, b) => (s) => p50(`s3d2${a}_${s}`) - p50(`s3d2${b}_${s}`);
const v3 = (a, b) => (s) => p50(`s3d3${a}_${s}`) - p50(`s3d3${b}_${s}`);
const gate = table([
  ["S3b capsule (fit)", cost("s3dfit")],
  ["S3c tent", cost("s3dtent")],
  ["S3d tentv", cost("s3dtentv")],
  ["tent - tentv", (s) => cost("s3dtent")(s) - cost("s3dtentv")(s)],
  ["tentv <= 2 ms", (s) => cost("s3dtentv")(s), (x) => (Number.isFinite(x) ? (x <= 2 ? "pass" : "MISS") : "-")],
]);
const bound = table([
  ["tentv", v2("tentv", "floor")],
  ["fixed", v2("empty", "floor")],
  ["upload", v2("empty", "emptynoup")],
  ["empty pass", v2("emptynoup", "floor")],
  ["D store", v2("empty", "emptyinv")],
  ["kick (s3d3)", v3("kick", "floor")],
  ["store (s3d3)", v3("emptynoup", "kick")],
  ["VS(v)", v2("tentvdegen", "empty")],
  ["raster(v)", v2("tentv", "tentvdegen")],
  ["tentv - kick (s3d3)", v3("tentv", "kick")],
]);
const text = [
  "# K1040 S3d: the gate on the Pixel (render-sync p50 ms)",
  "",
  "## The gate: label cost = p50 - floorall's p50 (K923's method), one run per mode",
  "",
  gate,
  "",
  "## What bounds it: differences on one page (variants runs s3d2, s3d3)",
  "",
  bound,
  "",
  `Runs the phone guard saw touched: ${touched.size ? [...touched].join(", ") : "none"}.`,
  "",
].join("\n");
console.log(text);
if (process.argv[2]) writeFileSync(process.argv[2], text);
