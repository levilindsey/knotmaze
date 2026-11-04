// K1040 S3d step 1: the tent pass's cost split from one variants batch
// (phone_time.mjs --variants), by render-sync p50 differences on one page:
//   fixed = empty - floor (upload + an empty pass: clears, stores, the sync's submit)
//   upload = tent - noup, VS = degen - empty (every primitive clipped),
//   raster = tent - degen (binning, parameter buffer, raster, HSR, FS),
//   FS = tent - fs0, varyings = fs0 - fsconst, half = tent - half, nw1 = tent - nw1.
// Usage: node split.mjs <label> [out.md]   (reads out/phone_time_<label><variant>_<scene>.json)
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
const cols = [
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
const text = `# ${label}: the tent pass's cost split (Pixel, render-sync p50 ms, differences on one page)\n\n${rows.join("\n")}\n`;
console.log(text);
if (process.argv[3]) writeFileSync(process.argv[3], text);
