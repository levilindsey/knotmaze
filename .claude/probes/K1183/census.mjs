// K1183 census: which rules files attach to each file under
// src/render/field/ and test/render/field/, and how many files the
// field topic file (render-field.md) attaches to?
//
// Plain node, no browser:
//   node .claude/probes/K1183/census.mjs [--json out.json]
//
// It reads every .claude/rules/*.md frontmatter's `paths:` list, so the
// same script gives the before census (no render-field.md on the tree)
// and the after census (render-field.md present). The matcher is copied
// from .claude/probes/K999/census.mjs (globToRegExp and the frontmatter
// reader); no new glob reader is written here.
//
// Matching rule (copied from K999's header, stated so the coverage
// claim can be checked): a pattern and a file path are both
// repo-relative, forward-slash, whole-path strings. `**/` matches zero
// or more whole path segments, a trailing `/**` matches everything
// under that prefix (including nothing? no: at least the slash), `*`
// matches any run of characters except `/`, `?` matches one character
// except `/`, and every other character is literal. Matching is
// case-sensitive except that the file extension is compared as it
// stands on disk.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const RULES_DIR = join(ROOT, ".claude", "rules");
const WALK_DIRS = ["src/render/field", "test/render/field"];
const TOPIC_FILE = "render-field.md";

function readFrontmatterPatterns(file) {
  const text = readFileSync(file, "utf8");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return [];
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
  catch { return; } // unreadable: skip
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
    // symlinks / junctions are not followed
  }
}

const args = process.argv.slice(2);
let jsonOut = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--json") jsonOut = args[++i];
  else throw new Error(`unknown arg ${args[i]}`);
}

const rulesFiles = readdirSync(RULES_DIR).filter((f) => f.endsWith(".md")).sort();
const ruleMatchers = rulesFiles.map((file) => {
  const patterns = readFrontmatterPatterns(join(RULES_DIR, file));
  return { file, patterns, matchers: patterns.map((p) => ({ pattern: p, re: globToRegExp(p) })) };
});
const topic = ruleMatchers.find((r) => r.file === TOPIC_FILE) ?? null;

const files = [];
for (const d of WALK_DIRS) walk(join(ROOT, d), files);
files.sort();

const rows = [];
let topicAttachCount = 0;
const outsideWalk = [];
for (const abs of files) {
  const rel = relative(ROOT, abs).split(sep).join("/");
  const attaching = [];
  for (const r of ruleMatchers) {
    const hits = r.matchers.filter((m) => m.re.test(rel)).map((m) => m.pattern);
    if (hits.length > 0) attaching.push({ file: r.file, patterns: hits });
  }
  if (attaching.some((a) => a.file === TOPIC_FILE)) topicAttachCount++;
  rows.push({ rel, attaching });
}

// Every repo file the topic file attaches to, to prove it attaches
// nothing outside its two paths: walk src/ and test/ and test each.
if (topic) {
  const all = [];
  walk(join(ROOT, "src"), all);
  walk(join(ROOT, "test"), all);
  for (const abs of all) {
    const rel = relative(ROOT, abs).split(sep).join("/");
    if (rel.startsWith("src/render/field/") || rel.startsWith("test/render/field/")) continue;
    if (topic.matchers.some((m) => m.re.test(rel))) outsideWalk.push(rel);
  }
  outsideWalk.sort();
}

console.log(`rules files read: ${ruleMatchers.length} (${rulesFiles.join(", ")})`);
console.log(`walk dirs: ${WALK_DIRS.join(", ")}`);
console.log(`files walked: ${rows.length}`);
console.log("");
console.log("per file (attaching rules files):");
for (const r of rows) {
  const names = r.attaching.map((a) => a.file).join(", ") || "(none)";
  console.log(`  ${r.rel} -> ${names}`);
}
console.log("");
console.log(`${TOPIC_FILE} present: ${topic ? "yes" : "no"}`);
if (topic) console.log(`${TOPIC_FILE} paths: ${topic.patterns.join(", ")}`);
console.log(`files the field topic file attaches to (in walk dirs): ${topicAttachCount}`);
if (topic) console.log(`files the field topic file attaches to outside its two paths (src/+test/): ${outsideWalk.length}`);
for (const rel of outsideWalk) console.log(`  outside: ${rel}`);

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({
    rulesFiles, walkDirs: WALK_DIRS, total: rows.length,
    rows, topicPresent: !!topic,
    topicPatterns: topic ? topic.patterns : [],
    topicAttachCount, outsideWalk,
  }, null, 2));
  console.log(`json: ${jsonOut}`);
}
