// K1040 S3d step 1: the tent pass's cost split from one variants batch
// (phone_time.mjs --variants), by render-sync p50 differences on one page:
//   fixed = empty - floor (upload + an empty pass: clears, stores, the sync's submit)
//   upload = tent - noup, VS = degen - empty (every primitive clipped),
//   raster = tent - degen (binning, parameter buffer, raster, HSR, FS),
//   FS = tent - fs0, varyings = fs0 - fsconst, half = tent - half, nw1 = tent - nw1.
// Step 2's set (s3d2: the vertex-light tent, mode tentv, and the fixed part):
//   tentv = tentv - floor, tent = tent - floor, tent - tentv,
//   VS(v) = tentvdegen - empty, raster(v) = tentv - tentvdegen,
//   upload = empty - emptynoup (and uponly - floor: an upload no draw uses),
//   empty pass = emptynoup - floor (clears, D's store, the submit),
//   D store = empty - emptyinv, tentv D = tentv - tentvinv, tentvinv = tentvinv - floor.
// The kick set (s3d3: variants kick,emptynoup,empty,tentv,floor): kick = kick - floor
//   (a 1x1 target cleared and read: one submit and its wait, no store to speak of),
//   store = emptynoup - kick (the full-size clears and stores beyond that), upload =
//   empty - emptynoup, tentv = tentv - floor, tentv - kick (the label cost past one round trip).
// Usage: node split.mjs <label> [out.md] [s3d1|s3d2|s3d3]   (reads out/phone_time_<label><variant>_<scene>.json)
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const label = process.argv[2] ?? "s3d1";
const SCENES = [
  "muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper",
  "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64",
];
const p50 = (v, s) => {
  const f = join(here, "out", `phone_time_${label}${v}_${s}.json`);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")).sync.p50 : NaN;
};
const set = process.argv[4] ?? "s3d1";
const cols2 = [
  ["tentv", (g) => g("tentv") - g("floor")],
  ["tent", (g) => g("tent") - g("floor")],
  ["tent - tentv", (g) => g("tent") - g("tentv")],
  ["fixed", (g) => g("empty") - g("floor")],
  ["tentv - empty", (g) => g("tentv") - g("empty")],
  ["VS(v)", (g) => g("tentvdegen") - g("empty")],
  ["raster(v)", (g) => g("tentv") - g("tentvdegen")],
  ["upload", (g) => g("empty") - g("emptynoup")],
  ["uponly", (g) => g("uponly") - g("floor")],
  ["empty pass", (g) => g("emptynoup") - g("floor")],
  ["D store", (g) => g("empty") - g("emptyinv")],
  ["tentv D", (g) => g("tentv") - g("tentvinv")],
  ["tentvinv", (g) => g("tentvinv") - g("floor")],
];
const cols1 = [
  ["label cost", (g) => g("tent") - g("floor")],
  ["fixed", (g) => g("empty") - g("floor")],
  ["tent - empty", (g) => g("tent") - g("empty")],
  ["upload", (g) => g("tent") - g("noup")],
  ["VS", (g) => g("degen") - g("empty")],
  ["raster", (g) => g("tent") - g("degen")],
  ["FS", (g) => g("tent") - g("fs0")],
  ["varyings", (g) => g("fs0") - g("fsconst")],
  ["half segs", (g) => g("tent") - g("half")],
  ["nw1", (g) => g("tent") - g("nw1")],
];
const cols3 = [
  ["tentv", (g) => g("tentv") - g("floor")],
  ["kick", (g) => g("kick") - g("floor")],
  ["store", (g) => g("emptynoup") - g("kick")],
  ["empty pass", (g) => g("emptynoup") - g("floor")],
  ["upload", (g) => g("empty") - g("emptynoup")],
  ["tentv - kick", (g) => g("tentv") - g("kick")],
  ["tentv - empty", (g) => g("tentv") - g("empty")],
];
const cols = set === "s3d3" ? cols3 : set === "s3d2" ? cols2 : cols1;
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : "-");
const rows = [`| scene | ${cols.map((c) => c[0]).join(" | ")} |`, `|---|${cols.map(() => "---").join("|")}|`];
const sums = cols.map(() => []);
for (const s of SCENES) {
  const g = (v) => p50(v, s);
  const vals = cols.map((c) => c[1](g));
  vals.forEach((x, i) => Number.isFinite(x) && sums[i].push(x));
  rows.push(`| ${s} | ${vals.map(f1).join(" | ")} |`);
}
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
rows.push(`| median | ${sums.map((a) => f1(med(a))).join(" | ")} |`);
const what = set === "s3d3" ? "the fixed part against one GPU round trip (kick)" : set === "s3d2" ? "the vertex-light tent's and the fixed part's split" : "the tent pass's cost split";
const text = `# ${label}: ${what} (Pixel, render-sync p50 ms, differences on one page)\n\n${rows.join("\n")}\n`;
console.log(text);
if (process.argv[3]) writeFileSync(process.argv[3], text);
