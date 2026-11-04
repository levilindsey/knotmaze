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
  if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8")).sync.p50;
  // Desktop (s3.mjs many): one file a scene, the variants inside it.
  const m = join(here, "out", `many_${label}_${s}.json`);
  return existsSync(m) ? JSON.parse(readFileSync(m, "utf8")).variants[v].sync.p50 : NaN;
};
const p50b = (v, s) => {
  if (!label2) return NaN;
  const f = join(here, "out", `phone_time_${label2}${v}_${s}.json`);
  if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8")).sync.p50;
  const m = join(here, "out", `many_${label2}_${s}.json`);
  return existsSync(m) ? JSON.parse(readFileSync(m, "utf8")).variants[v].sync.p50 : NaN;
};
const segsOf = (s) => {
  const f = join(here, "out", `phone_time_${label}ftentv_${s}.json`);
  if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8")).segs;
  const m = join(here, "out", `many_${label}_${s}.json`);
  return existsSync(m) ? JSON.parse(readFileSync(m, "utf8")).segs : NaN;
};
// K1040 S3f: the variant's upload p50 (its main-thread time in the upload calls, outside the sync).
const up50 = (v, s) => {
  const f = join(here, "out", `phone_time_${label}${v}_${s}.json`);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")).upload?.p50 ?? NaN : NaN;
};
const set = process.argv[4] ?? "s3d1";
const label2 = process.argv[5] ?? "";
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
// K1040 S3e step 1 (s3e1: page.ts's ideal family beside S3d's controls), each
// minus floor unless named: ideal = K923's floor (a 32-bit target cleared and
// stored, depth a renderbuffer invalidated); its parts; the depth store
// (idealnoinv - ideal); the clears over a DONT_CARE load (idealpt -
// idealnoclr); a clear as a full-screen draw (idealfsq - ideal); today's fixed
// part over the ideal (empty - ideal, emptynoup - ideal).
const cols4 = [
  ["ideal", (g) => g("ideal") - g("floor")],
  ["noinv", (g) => g("idealnoinv") - g("floor")],
  ["nod", (g) => g("idealnod") - g("floor")],
  ["rgba8ui", (g) => g("ideal8") - g("floor")],
  ["d32f", (g) => g("ideal32f") - g("floor")],
  ["pt", (g) => g("idealpt") - g("floor")],
  ["pt d32f", (g) => g("idealpt32f") - g("floor")],
  ["noclr", (g) => g("idealnoclr") - g("floor")],
  ["fsq", (g) => g("idealfsq") - g("floor")],
  ["D store", (g) => g("idealnoinv") - g("ideal")],
  ["clears", (g) => g("idealpt") - g("idealnoclr")],
  ["fsq - ideal", (g) => g("idealfsq") - g("ideal")],
  ["kick", (g) => g("kick") - g("floor")],
  ["empty pass", (g) => g("emptynoup") - g("floor")],
  ["fixed", (g) => g("empty") - g("floor")],
  ["fixed - ideal", (g) => g("empty") - g("ideal")],
];
// K1040 S3e step 3 (s3e3: the lean pass beside the ideal on one page), each
// minus floor unless named: the gate's first condition, leanempty - ideal <=
// 0.3 on every scene (and against ideal32f: lean's D is D32F); the at-rest
// empty pass (leanemptynoup); today's fixed part (empty); tentv with today's
// and the lean fixed part, moving and at rest; the lean D's store; the D24
// hedge (leanempty24, leantentv24: D a DEPTH_COMPONENT24 renderbuffer); draw()'s
// GL state save and restore (leanemptynoup - leanemptynoupns), the lean empty
// pass without it against the ideal, and what is left once neither uploads nor
// saves (leanemptynoupns - ideal32f).
const cols5 = [
  ["ideal", (g) => g("ideal") - g("floor")],
  ["ideal d32f", (g) => g("ideal32f") - g("floor")],
  ["leanempty", (g) => g("leanempty") - g("floor")],
  ["leanempty - ideal", (g) => g("leanempty") - g("ideal")],
  ["leanempty - d32f", (g) => g("leanempty") - g("ideal32f")],
  ["lean noup", (g) => g("leanemptynoup") - g("floor")],
  ["empty", (g) => g("empty") - g("floor")],
  ["tentv", (g) => g("tentv") - g("floor")],
  ["leantentv", (g) => g("leantentv") - g("floor")],
  ["at rest", (g) => g("leantentvrest") - g("floor")],
  ["D store", (g) => g("leantentvst") - g("leantentv")],
  ["leanempty24 - ideal", (g) => g("leanempty24") - g("ideal")],
  ["leantentv24", (g) => g("leantentv24") - g("floor")],
  ["save", (g) => g("leanemptynoup") - g("leanemptynoupns")],
  ["ns - ideal", (g) => g("leanemptyns") - g("ideal")],
  ["noupns - d32f", (g) => g("leanemptynoupns") - g("ideal32f")],
];
// K1040 S3f step 1-2 (s3f1: the new pass, K1158 - no state queries, a Pixi
// host's restore - beside S3e's lean pass and the ideal family on one page;
// ffloor is the host floor: the restore and the sync, no pass). The new empty
// pass against S3e's (saved) and against S3e's without its save (ns - fempty,
// step 1); the host's restore (femptynoup - femptynouph0); what is left
// against the ideal (fempty - d32f, fnouph0 - d32f: step 2's 0.6 ms, S3e's
// noupns - d32f); the ideal family's parts (page.ts IDEAL: k binds nothing
// back, z binds framebuffer null, d sets depth state, r S3e's readback); the
// new tentv's setup (binds, no draws) and drawing; tentv's cost, S3e's and
// the new one's, and the new one's with its upload calls' main-thread time
// (the gate's cost, phone_table.ps1 -Upload).
const cols6 = [
  ["floor - ffloor", (g) => g("floor") - g("ffloor")],
  ["ideal d32f", (g) => g("ideal32f") - g("floor")],
  ["fempty", (g) => g("fempty") - g("ffloor")],
  ["leanempty", (g) => g("leanempty") - g("floor")],
  ["saved", (g) => g("leanempty") - g("fempty")],
  ["ns - fempty", (g) => g("leanemptyns") - g("fempty")],
  ["fempty - d32f", (g) => g("fempty") - g("ideal32f")],
  ["host restore", (g) => g("femptynoup") - g("femptynouph0")],
  ["upload", (g) => g("fempty") - g("femptynoup")],
  ["noupns - d32f", (g) => g("leanemptynoupns") - g("ideal32f")],
  ["fnouph0 - d32f", (g) => g("femptynouph0") - g("ideal32f")],
  ["query+restore", (g) => g("ideal32f") - g("ideal32fk")],
  ["bind null", (g) => g("ideal32fz") - g("ideal32fk")],
  ["depth state", (g) => g("ideal32fd") - g("ideal32fk")],
  ["old readback", (g) => g("ideal32fr") - g("ideal32f")],
  ["setup", (g) => g("ftentvsetup") - g("fempty")],
  ["drawing", (g) => g("ftentv") - g("ftentvsetup")],
  ["ftentv", (g) => g("ftentv") - g("ffloor")],
  ["leantentv", (g) => g("leantentv") - g("floor")],
  ["ftentv up", (g, u) => u("ftentv")],
  ["ftentv + up", (g, u) => g("ftentv") - g("ffloor") + u("ftentv")],
];
// K1040 S3f2 (s3f2: the new pass's fixed part split further, and its upload
// at rest): bind+viewport alone (femptyb: binds the target, sets the
// viewport, hands back); the clears (femptynoup - femptynoupnc); keeping
// D's store (femptynoupst - femptynoup: what the invalidation saves); the
// rest upload's main-thread time, the skip (ftentvrest) against S3e's row
// diff (leantentvrest).
const cols7 = [
  ["floor - ffloor", (g) => g("floor") - g("ffloor")],
  ["ideal d32f", (g) => g("ideal32f") - g("floor")],
  ["fempty", (g) => g("fempty") - g("ffloor")],
  ["fempty - d32f", (g) => g("fempty") - g("ffloor") - (g("ideal32f") - g("floor"))],
  ["bind+viewport", (g) => g("femptyb") - g("ffloor")],
  ["clears", (g) => g("femptynoup") - g("femptynoupnc")],
  ["no-clear rest", (g) => g("femptynoupnc") - g("ffloor")],
  ["D store kept", (g) => g("femptynoupst") - g("femptynoup")],
  ["host restore", (g) => g("femptynoup") - g("femptynouph0")],
  ["upload", (g) => g("fempty") - g("femptynoup")],
  ["rest up skip", (g, u) => u("ftentvrest")],
  ["rest up diff", (g, u) => u("leantentvrest")],
  ["setup", (g) => g("ftentvsetup") - g("fempty")],
  ["drawing", (g) => g("ftentv") - g("ftentvsetup")],
  ["ftentv", (g) => g("ftentv") - g("ffloor")],
  ["ftentv up", (g, u) => u("ftentv")],
  ["ftentv + up", (g, u) => g("ftentv") - g("ffloor") + u("ftentv")],
];
// K1040 S3f4 (the drawing's bound, on the split page: ftentv beside
// ftentvsetup, fempty and ffloor and the six S3f4 variants; vertex
// counts from out/vert_count_s3f4.md). Per scene and run, from each
// variant's sync p50; with a second run's label (argv 5) every column
// gets its two runs' difference beside it, and a reading smaller than
// that spread decides nothing:
//   drawing          ftentv - ftentvsetup (S3f2's column)
//   a pass that draws ftentvone - ftentvsetup (one segment, no caps/fills)
//   segments         2 * (ftentv - ftentvhalf)
//   caps/fills/rest  drawing - a pass that draws - segments
//   vertex side      ftentvclip - ftentvone (vertex work + primitive
//                    assembly past one segment, no fragments)
//   fragment side    ftentv - ftentvclip
//   shading          ftentv - ftentvflat (the label arithmetic's share)
//   vertex slope     (ftentv - ftentvnw1c) per 100k segment vertices
//                    it saves (4 a segment: 12 -> 8; slightly more covered)
//   instancing       ftentv - ftentvvid (the instanced draw against the
//                    same strips in one non-instanced draw)
const cols8 = [
  ["drawing", (g) => g("ftentv") - g("ftentvsetup")],
  ["a pass that draws", (g) => g("ftentvone") - g("ftentvsetup")],
  ["segments", (g) => 2 * (g("ftentv") - g("ftentvhalf"))],
  ["caps/fills/rest", (g) => g("ftentv") - g("ftentvsetup") - (g("ftentvone") - g("ftentvsetup")) - 2 * (g("ftentv") - g("ftentvhalf"))],
  ["vertex side", (g) => g("ftentvclip") - g("ftentvone")],
  ["fragment side", (g) => g("ftentv") - g("ftentvclip")],
  ["shading", (g) => g("ftentv") - g("ftentvflat")],
  ["vertex slope /100k", (g, u, segs) => (g("ftentv") - g("ftentvnw1c")) / (4 * segs / 100000)],
  ["instancing", (g) => g("ftentv") - g("ftentvvid")],
];
const cols = set === "s3f4" ? cols8 : set === "s3f2" ? cols7 : set === "s3f1" ? cols6 : set === "s3e3" ? cols5 : set === "s3e1" ? cols4 : set === "s3d3" ? cols3 : set === "s3d2" ? cols2 : cols1;
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(set.startsWith("s3e") || set.startsWith("s3f") ? 2 : 1) : "-");
const two = set === "s3f4" && !!label2;
const head = two ? cols.flatMap((c) => [c[0], `${c[0]} d`]) : cols.map((c) => c[0]);
const rows = [`| scene | ${head.join(" | ")} |`, `|---|${head.map(() => "---").join("|")}|`];
const sums = cols.map(() => []);
const sumsD = cols.map(() => []);
for (const s of SCENES) {
  const g = (v) => p50(v, s);
  const u = (v) => up50(v, s);
  const sg = segsOf(s);
  const vals = cols.map((c) => c[1](g, u, sg));
  vals.forEach((x, i) => Number.isFinite(x) && sums[i].push(x));
  if (!two) { rows.push(`| ${s} | ${vals.map(f1).join(" | ")} |`); continue; }
  const g2 = (v) => p50b(v, s);
  const vals2 = cols.map((c) => c[1](g2, u, sg));
  const cells = [];
  vals.forEach((x, i) => { const d = vals2[i] - x; if (Number.isFinite(d)) sumsD[i].push(d); cells.push(f1(x), f1(d)); });
  rows.push(`| ${s} | ${cells.join(" | ")} |`);
}
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
rows.push(two ? `| median | ${cols.flatMap((c, i) => [f1(med(sums[i])), f1(med(sumsD[i]))]).join(" | ")} |` : `| median | ${sums.map((a) => f1(med(a))).join(" | ")} |`);
const what = set === "s3f4" ? "what bounds the label drawing (S3f4; d = run 2 - run 1)" : set === "s3f2" ? "the new pass's fixed part and rest upload (S3f2)" : set === "s3f1" ? "the new pass (K1158) against S3e's and the ideal" : set === "s3e1" ? "the floor before building (the ideal family)" : set === "s3e3" ? "the lean empty pass against the ideal floor" : set === "s3d3" ? "the fixed part against one GPU round trip (kick)" : set === "s3d2" ? "the vertex-light tent's and the fixed part's split" : "the tent pass's cost split";
const text = `# ${label}${label2 ? ` + ${label2}` : ""}: ${what} (render-sync p50 ms, differences on one page)\n\n${rows.join("\n")}\n`;
console.log(text);
if (process.argv[3]) writeFileSync(process.argv[3], text);
