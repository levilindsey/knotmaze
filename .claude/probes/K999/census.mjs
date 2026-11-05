// K999 census: which files under .claude/probes/ does probes.md's
// `paths:` cover, before and after narrowing it?
//
// Plain node, no browser:
//   node .claude/probes/K999/census.mjs [--patterns "a,b,c"] [--json out.json]
//
// With no --patterns it reads the `paths:` list from
// .claude/rules/probes.md's frontmatter, so the same script gives the
// before census (the old frontmatter) and the after census (the new
// one). Pass --patterns to ask about a candidate list without editing
// the rules file first.
//
// Matching rule (the one this script implements, stated so the
// coverage claim can be checked): a pattern and a file path are both
// repo-relative, forward-slash, whole-path strings. `**/` matches zero
// or more whole path segments, a trailing `/**` matches everything
// under that prefix (including nothing? no: at least the slash), `*`
// matches any run of characters except `/`, `?` matches one character
// except `/`, and every other character is literal. Matching is
// case-sensitive except that the file extension is compared as it
// stands on disk (the patterns below are all lower-case, and the tree's
// script extensions are lower-case). This mirrors the house style:
// K173 measured that `scripts/*.mjs` does not match
// `scripts/phone_pass/summary.mjs` (`*` stops at `/`).
//
// Classes (the split the K999 fix turns on):
//   script (core)   .mjs .ps1 .ts         - task 1's probe scripts
//   script (other)  .js .cjs .mts .cts .html .sh .bat .cmd
//                     script-like extensions the census finds in the
//                     tree; each one the fix keeps covered is named
//                     in the run's report
//   trace / data    everything else (.py .svg .png .jpg .json .md
//                     .txt .csv and the rest), including .py scripts
//                     under K863, which the brief classes as trace
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const PROBES = join(ROOT, ".claude", "probes");
const RULES = join(ROOT, ".claude", "rules", "probes.md");

const CORE = new Set([".mjs", ".ps1", ".ts"]);
const OTHER_SCRIPT = new Set([".js", ".cjs", ".mts", ".cts", ".html", ".sh", ".bat", ".cmd"]);
const K863_FORBIDDEN = new Set([".py", ".svg", ".png", ".csv", ".md"]);

function extOf(name) {
  const i = name.lastIndexOf(".");
  if (i <= 0) return "(none)";
  return name.slice(i).toLowerCase();
}
function klass(ext) {
  if (CORE.has(ext)) return "script-core";
  if (OTHER_SCRIPT.has(ext)) return "script-other";
  return "trace";
}

function readFrontmatterPatterns() {
  const text = readFileSync(RULES, "utf8");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error("no frontmatter in probes.md");
  const pats = [];
  let inPaths = false;
  for (const line of m[1].split(/\r?\n/)) {
    if (/^paths:\s*$/.test(line)) { inPaths = true; continue; }
    if (inPaths) {
      const item = line.match(/^\s+-\s+"([^"]+)"\s*$/);
      if (item) { pats.push(item[1]); continue; }
      if (line.trim() !== "") inPaths = false;
    }
  }
  return pats;
}

function globToRegExp(glob) {
  let re = "^";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // `**/` = zero or more whole segments; trailing `**` = the rest
        if (glob[i + 2] === "/") { re += "(?:[^/]+/)*"; i += 2; }
        else { re += ".*"; i += 1; }
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(re + "$");
}

function walk(dir, out) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return; } // unreadable (a live Chrome profile lock etc): skip
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
    // symlinks / junctions are not followed: a junction's target is
    // counted at its real path, not once per link to it
  }
}

const args = process.argv.slice(2);
let patterns = null;
let jsonOut = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--patterns") patterns = args[++i].split(",").map((s) => s.trim()).filter(Boolean);
  else if (args[i] === "--json") jsonOut = args[++i];
  else throw new Error(`unknown arg ${args[i]}`);
}
if (!patterns) patterns = readFrontmatterPatterns();
const matchers = patterns.map((p) => ({ pattern: p, re: globToRegExp(p) }));
const coveredBy = (rel) => matchers.filter((m) => m.re.test(rel)).map((m) => m.pattern);

const files = [];
walk(PROBES, files);

const byTop = new Map();   // top folder -> {total, covered, byClass...}
const byExt = new Map();   // ext -> {total, covered, klass}
const k863 = { total: 0, covered: 0, scriptCovered: 0, scriptTotal: 0, forbiddenCovered: new Map(), traceCoveredByExt: new Map() };
let uncoveredScripts = []; // {rel, ext}
let coveredTraceElsewhere = new Map(); // ext -> count (outside K863)

function bump(map, key, field) {
  if (!map.has(key)) map.set(key, { total: 0, covered: 0, scriptCore: 0, scriptOther: 0, trace: 0, scriptCovered: 0, scriptTotal: 0 });
  const r = map.get(key); r.total++; if (field) r[field]++;
  return r;
}

for (const abs of files) {
  const rel = relative(ROOT, abs).split(sep).join("/");
  const ext = extOf(abs.split(sep).pop());
  const k = klass(ext);
  const cov = coveredBy(rel).length > 0;
  const parts = rel.split("/");
  const top = parts.length > 3 ? parts[2] : "(root)"; // .claude/probes/<top>/...
  const isK863 = rel.startsWith(".claude/probes/K863/");

  const t = bump(byTop, top);
  if (cov) t.covered++;
  if (k === "script-core") t.scriptCore++; else if (k === "script-other") t.scriptOther++; else t.trace++;
  if (k !== "trace") { t.scriptTotal++; if (cov) t.scriptCovered++; }

  if (!byExt.has(ext)) byExt.set(ext, { total: 0, covered: 0, klass: k });
  const e = byExt.get(ext); e.total++; if (cov) e.covered++;

  if (k !== "trace" && !cov) uncoveredScripts.push({ rel, ext });
  if (k === "trace" && cov && !isK863) coveredTraceElsewhere.set(ext, (coveredTraceElsewhere.get(ext) ?? 0) + 1);

  if (isK863) {
    k863.total++; if (cov) k863.covered++;
    if (k !== "trace") { k863.scriptTotal++; if (cov) k863.scriptCovered++; }
    if (K863_FORBIDDEN.has(ext) && cov) k863.forbiddenCovered.set(ext, (k863.forbiddenCovered.get(ext) ?? 0) + 1);
    if (k === "trace" && cov) k863.traceCoveredByExt.set(ext, (k863.traceCoveredByExt.get(ext) ?? 0) + 1);
  }
}

const rows = (map) => [...map.entries()].sort((a, b) => b[1].total - a[1].total);
console.log(`patterns (${patterns.length}):`);
for (const p of patterns) console.log(`  ${p}`);
console.log(`files under .claude/probes/: ${files.length}`);
console.log("");
console.log("by extension (class, total, covered):");
for (const [ext, e] of rows(byExt)) console.log(`  ${ext.padEnd(14)} ${e.klass.padEnd(12)} ${String(e.total).padStart(7)} ${String(e.covered).padStart(7)}`);
console.log("");
console.log("by top folder (total, covered, script-core, script-other, trace, scripts covered/total):");
for (const [top, t] of rows(byTop)) console.log(`  ${top.padEnd(28)} ${String(t.total).padStart(7)} ${String(t.covered).padStart(7)} ${String(t.scriptCore).padStart(6)} ${String(t.scriptOther).padStart(6)} ${String(t.trace).padStart(7)}  ${t.scriptCovered}/${t.scriptTotal}`);
console.log("");
console.log(`K863 subtree: total ${k863.total}, covered ${k863.covered}, scripts covered ${k863.scriptCovered}/${k863.scriptTotal}`);
console.log(`K863 forbidden trace covered (.py/.svg/.png/.csv/.md): ${[...k863.forbiddenCovered.entries()].map(([k, v]) => `${k}=${v}`).join(" ") || "none"}`);
console.log(`K863 any trace covered: ${[...k863.traceCoveredByExt.entries()].map(([k, v]) => `${k}=${v}`).join(" ") || "none"}`);
console.log(`uncovered script files: ${uncoveredScripts.length}`);
const uncByExt = {};
for (const u of uncoveredScripts) uncByExt[u.ext] = (uncByExt[u.ext] ?? 0) + 1;
for (const [ext, n] of Object.entries(uncByExt).sort((a, b) => b[1] - a[1])) console.log(`  uncovered ${ext}: ${n}`);
console.log(`trace covered outside K863: ${[...coveredTraceElsewhere.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(" ") || "none"}`);

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({
    patterns, total: files.length,
    byExt: Object.fromEntries(byExt), byTop: Object.fromEntries(byTop),
    k863: { ...k863, forbiddenCovered: Object.fromEntries(k863.forbiddenCovered), traceCoveredByExt: Object.fromEntries(k863.traceCoveredByExt) },
    uncoveredScripts: uncoveredScripts.slice(0, 200),
    coveredTraceElsewhere: Object.fromEntries(coveredTraceElsewhere),
  }, null, 2));
  console.log(`json: ${jsonOut}`);
}
