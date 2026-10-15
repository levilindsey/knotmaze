#!/usr/bin/env node
// K173: split the path-scoped rules lore (.claude/rules/*.md) by topic, so
// a read attaches only the lore of the files it is about. One command on
// any master that still has the unsplit files:
//
//   node scripts/split_rules.mjs --check   # parse, assign, prove; write nothing
//   node scripts/split_rules.mjs           # write the split, the rewrites, the index
//
// The manifest (scripts/split_rules.json, or --manifest <file>) holds:
//   sources   the rules files to split; each must exist (missing = already split)
//   outputs   { "<name>.md": { paths, header, footer, index, widen } }: the new
//             files, their `paths:`, the lines added before and after the moved
//             passages, and the one-line description for docs/lore_index.md;
//             `widen` lists the paths allowed to reach files that the sources'
//             old paths did not (lore otherwise never attaches somewhere new)
//   passages  [{ source, anchor, to }]: every passage of every source, found by
//             the start of its first line (must match exactly one passage)
//   rewrites  [{ file, from, to }]: pointer edits applied after the split, each
//             must match exactly once ("\n" stands for the file's line break)
//   movedNotes  { file, labels }: docs/history.md's "*[Moved to
//             `.claude/rules/X.md`: LABEL.]*" and "*[Lore: `X.md` (LABEL)]*"
//             notes are re-pointed at the file that now holds LABEL (labels:
//             { "X.md|LABEL": "<output>" } for one the words do not find)
//   index     { file, header, unchanged }: the lore index to write
//
// A passage starts at a heading, a top-level "- " bullet, or an unindented
// line after a blank line (not a table row or a fence); blank lines belong
// to the passage before them. The script fails, writing nothing, on a passage
// no anchor assigns, an anchor that matches 0 or 2+ passages, an output with
// no passages, a glob that matches no tracked file (outside .claude/probes),
// a glob that reaches a file the sources' old paths did not (unless widened),
// or a rewrite that does not match exactly once. It proves the split before
// writing: every old passage appears verbatim, as one contiguous block, in
// exactly the one new file it was assigned to, and the new files' non-blank
// lines are exactly the old passages' plus the declared frontmatter, headers
// and footers. After writing it reads the files back and compares.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function parseRules(text) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  let i = 0;
  const front = [];
  if (lines[0] === '---') {
    front.push(lines[i++]);
    while (i < lines.length && lines[i] !== '---') front.push(lines[i++]);
    if (i >= lines.length) throw new Error('unterminated frontmatter');
    front.push(lines[i++]);
  }
  while (i < lines.length && lines[i].trim() === '') i++;
  const passages = [];
  let cur = null;
  let inFence = false;
  let prevBlank = true;
  for (; i < lines.length; i++) {
    const l = lines[i];
    const blank = l.trim() === '';
    let start = false;
    if (!inFence) {
      if (/^#{1,6} /.test(l) || /^- /.test(l)) start = true;
      else if (prevBlank && !blank && !/^\s/.test(l) && !/^\|/.test(l) && !/^```/.test(l)) start = true;
    }
    if (/^\s*```/.test(l)) inFence = !inFence;
    if (start || !cur) {
      cur = { line: i + 1, lines: [] };
      passages.push(cur);
    }
    cur.lines.push(l);
    prevBlank = blank;
  }
  passages.forEach((p, k) => {
    let n = p.lines.length;
    while (n > 0 && p.lines[n - 1].trim() === '') n--;
    p.body = p.lines.slice(0, n);
    p.gap = p.lines.length - n;
    p.index = k;
  });
  const paths = front.filter((l) => /^\s+- /.test(l)).map((l) => l.replace(/^\s+- /, '').replace(/^"(.*)"$/, '$1'));
  return { eol, front, paths, passages };
}

// gitignore-style: "**" spans directories, "*" and "?" stay inside one; a
// pattern without wildcards matches the path itself and everything below it.
export function globToRegExp(g) {
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const ch = g[i];
    if (ch === '*' && g[i + 1] === '*') {
      re += '.*';
      i++;
      if (g[i + 1] === '/') i++;
    } else if (ch === '*') re += '[^/]*';
    else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '(/.*)?$');
}

function count(hay, needle) {
  let n = 0;
  for (let k = hay.indexOf(needle); k !== -1; k = hay.indexOf(needle, k + needle.length)) n++;
  return n;
}

function blockCount(lines, block) {
  let n = 0;
  for (let k = 0; k + block.length <= lines.length; k++) {
    let ok = true;
    for (let j = 0; j < block.length && ok; j++) ok = lines[k + j] === block[j];
    if (ok) n++;
  }
  return n;
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const mIdx = args.indexOf('--manifest');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(here, '..');
  const manifestPath = mIdx >= 0 ? path.resolve(args[mIdx + 1]) : path.join(here, 'split_rules.json');
  const M = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const rulesDir = path.join(root, M.rulesDir || '.claude/rules');
  const errors = [];
  const fail = (m) => errors.push(m);
  const bail = () => {
    if (!errors.length) return;
    console.error(`split_rules: ${errors.length} error(s), nothing written:\n  ` + errors.join('\n  '));
    process.exit(1);
  };

  // ---- 1. parse and assign ----
  const src = {};
  for (const s of M.sources) {
    const f = path.join(rulesDir, s);
    if (!fs.existsSync(f)) fail(`source ${s} is missing (already split?)`);
    else src[s] = parseRules(fs.readFileSync(f, 'utf8'));
  }
  bail();
  for (const e of M.passages) {
    const S = src[e.source];
    if (!S) { fail(`passage entry for unknown source ${e.source}: ${e.anchor}`); continue; }
    if (!M.outputs[e.to]) { fail(`${e.source} "${e.anchor}": unknown output ${e.to}`); continue; }
    const hits = S.passages.filter((p) => p.body[0].startsWith(e.anchor));
    if (hits.length !== 1) { fail(`${e.source}: anchor "${e.anchor}" matches ${hits.length} passages${hits.length ? ' (lines ' + hits.map((p) => p.line).join(', ') + ')' : ''}`); continue; }
    if (hits[0].to) { fail(`${e.source}:${hits[0].line} assigned twice (${hits[0].to}, ${e.to})`); continue; }
    hits[0].to = e.to;
  }
  for (const [s, S] of Object.entries(src)) {
    for (const p of S.passages) if (!p.to) fail(`${s}:${p.line} is not assigned: ${p.body[0].slice(0, 80)}`);
  }
  bail();

  // ---- 2. build the outputs (in memory) ----
  const tracked = execSync('git ls-files', { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  const built = {}; // name -> { text, lines, passages }
  for (const [name, O] of Object.entries(M.outputs)) {
    const ps = [];
    for (const s of M.sources) for (const p of src[s].passages) if (p.to === name) ps.push({ ...p, source: s });
    if (!ps.length) { fail(`output ${name} gets no passages`); continue; }
    for (const g of O.paths) {
      if (g.startsWith('.claude/probes/')) continue;
      const re = globToRegExp(g);
      if (!tracked.some((t) => re.test(t))) fail(`${name}: path "${g}" matches no tracked file`);
      // Never attach lore where it did not attach before: every tracked
      // file the new glob matches must match one of the sources' old globs,
      // unless the manifest widens to it on purpose (output.widen).
      if (O.widen?.includes(g)) continue;
      const olds = [...new Set(ps.map((p) => p.source))].flatMap((s) => src[s].paths).map(globToRegExp);
      for (const t of tracked) if (re.test(t) && !olds.some((o) => o.test(t))) fail(`${name}: "${g}" matches ${t}, which its source's old paths did not`);
    }
    for (const g of O.widen ?? []) if (!O.paths.includes(g)) fail(`${name}: widen "${g}" is not one of its paths`);
    const eol = src[ps[0].source].eol;
    const lines = ['---', 'paths:', ...O.paths.map((g) => `  - "${g}"`), '---', ''];
    if (O.header?.length) lines.push(...O.header, '');
    ps.forEach((p, k) => {
      if (k > 0) {
        const prev = ps[k - 1];
        const adjacent = prev.source === p.source && prev.index + 1 === p.index;
        for (let j = 0; j < (adjacent ? prev.gap : 1); j++) lines.push('');
      }
      lines.push(...p.body);
    });
    if (O.footer?.length) lines.push('', ...O.footer);
    built[name] = { eol, lines, passages: ps, text: lines.join(eol) + eol };
  }
  bail();

  // ---- 3. prove the split ----
  for (const [s, S] of Object.entries(src)) {
    for (const p of S.passages) {
      const same = S.passages.filter((q) => q.body.join('\n') === p.body.join('\n')).length;
      let total = 0;
      for (const [name, B] of Object.entries(built)) {
        const n = blockCount(B.lines, p.body);
        total += n;
        if (n && name !== p.to) fail(`${s}:${p.line} found in ${name}, assigned to ${p.to}`);
      }
      if (total !== same) fail(`${s}:${p.line} appears ${total} times in the new files (expected ${same})`);
    }
  }
  const multiset = (arr) => { const m = new Map(); for (const l of arr) if (l.trim()) m.set(l, (m.get(l) || 0) + 1); return m; };
  const want = [];
  for (const S of Object.values(src)) for (const p of S.passages) want.push(...p.body);
  for (const [name, O] of Object.entries(M.outputs)) want.push('---', 'paths:', ...O.paths.map((g) => `  - "${g}"`), '---', ...(O.header || []), ...(O.footer || []));
  const got = [];
  for (const B of Object.values(built)) got.push(...B.lines);
  const W = multiset(want);
  const G = multiset(got);
  for (const [l, n] of G) if ((W.get(l) || 0) !== n) fail(`line count differs (new ${n}, old+declared ${W.get(l) || 0}): ${l.slice(0, 80)}`);
  for (const [l, n] of W) if (!G.has(l)) fail(`line lost (old+declared ${n}): ${l.slice(0, 80)}`);
  bail();
  const oldBytes = Object.keys(src).reduce((a, s) => a + fs.statSync(path.join(rulesDir, s)).size, 0);
  const newBytes = Object.values(built).reduce((a, B) => a + Buffer.byteLength(B.text), 0);
  console.log(`split: ${Object.keys(src).length} files (${oldBytes} bytes, ${Object.values(src).reduce((a, S) => a + S.passages.length, 0)} passages) -> ${Object.keys(built).length} files (${newBytes} bytes); proof passed`);

  // ---- 4. pointer rewrites and history notes (in memory) ----
  const files = {}; // repo-relative -> text, for every file to write
  for (const [name, B] of Object.entries(built)) files[path.posix.join(M.rulesDir || '.claude/rules', name)] = B.text;
  const readRel = (rel) => (rel in files ? files[rel] : fs.readFileSync(path.join(root, rel), 'utf8'));
  for (const r of M.rewrites || []) {
    let text;
    try { text = readRel(r.file); } catch { fail(`rewrite: ${r.file} does not exist`); continue; }
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const from = r.from.replaceAll('\n', eol);
    const n = count(text, from);
    if (n !== 1) { fail(`rewrite in ${r.file} matches ${n} times: ${r.from.slice(0, 70)}`); continue; }
    files[r.file] = text.replace(from, () => r.to.replaceAll('\n', eol));
  }
  if (M.movedNotes) {
    // The history's bracketed notes name the rules file that holds a passage:
    // "*[Moved to `.claude/rules/X.md`: LABEL.]*", and inside "*[Lore: ...]*"
    // "`.claude/rules/X.md` (LABEL)" or "`X.md` (LABEL)". Each is re-pointed
    // at the output that now holds LABEL: the one output whose passages have
    // all of the label's words in their first three lines (tried for the
    // whole label, then without its parenthetical, then for each part split
    // at ", " / " and ", which must agree), or movedNotes.labels["X.md|LABEL"].
    // A label that resolves nowhere keeps its old file, which still exists.
    const rel = M.movedNotes.file;
    let text = readRel(rel);
    const done = [];
    const open = [];
    const head = (p) => p.body.slice(0, 3).join(' ').replace(/\s+/g, ' ');
    const tokens = (s) => s.match(/[A-Za-z0-9]{2,}/g) || [];
    const find = (S, t) => {
      if (!t.length) return null;
      const outs = [...new Set(S.passages.filter((p) => t.every((w) => head(p).includes(w))).map((p) => p.to))];
      return outs.length === 1 ? outs[0] : null;
    };
    const resolve = (file, lab) => {
      const forced = M.movedNotes.labels?.[`${file}|${lab}`];
      if (forced) return forced;
      for (const cand of [lab, lab.replace(/ \(.*$/, '')]) {
        const to = find(src[file], tokens(cand));
        if (to) return to;
      }
      const parts = lab.split(/, | and /).map((x) => find(src[file], tokens(x)));
      return parts.length > 1 && parts.every((x) => x && x === parts[0]) ? parts[0] : null;
    };
    const point = (all, file, label, rename) => {
      if (!src[file]) return all;
      const lab = label.replace(/\s+/g, ' ').trim();
      const to = resolve(file, lab);
      if (!to) { open.push(`${file}: ${lab}`); return all; }
      if (to === file) return all;
      if (!M.outputs[to]) { fail(`movedNotes label "${file}|${lab}" points at unknown output ${to}`); return all; }
      done.push(`${file} -> ${to}: ${lab}`);
      return rename(to);
    };
    text = text.replace(/\*\[Moved to `\.claude\/rules\/([\w-]+\.md)`: ([^\]]+?)\.\]\*/g, (all, file, label) =>
      point(all, file, label, (to) => all.replace(`\`.claude/rules/${file}\``, `\`.claude/rules/${to}\``)));
    text = text.replace(/\*\[Lore:[^\]]*\]\*/g, (note) =>
      note.replace(/`((?:\.claude\/rules\/\s*)?)([\w-]+\.md)` \(([^)]+)\)/g, (all, pre, file, label) =>
        point(all, file, label, (to) => `\`${pre}${to}\` (${label})`)));
    files[rel] = text;
    console.log(`${rel}: ${done.length} notes re-pointed, ${open.length} left on their old file (label not resolved)`);
    for (const d of done) console.log('  re-pointed ' + d);
    for (const o of open) console.log('  unresolved ' + o);
  }
  if (M.index) {
    const L = [...M.index.header, ''];
    const row = (name, paths, desc) => {
      L.push(`- \`${name}\`: ${desc}`);
      L.push(`  paths: ${paths.map((g) => '`' + g + '`').join(', ')}`);
    };
    for (const [name, O] of Object.entries(M.outputs)) row(name, O.paths, O.index);
    for (const [name, desc] of Object.entries(M.index.unchanged || {})) {
      const P = parseRules(fs.readFileSync(path.join(rulesDir, name), 'utf8'));
      row(name, P.paths, desc);
    }
    files[M.index.file] = L.join('\n') + '\n';
  }
  bail();
  for (const r of M.rewrites || []) console.log(`rewrite ${r.file}: ${r.from.split('\n')[0].slice(0, 60)}`);
  if (check) { console.log('--check: nothing written'); return; }

  // ---- 5. write: delete the sources, write everything, read back ----
  for (const s of Object.keys(src)) fs.unlinkSync(path.join(rulesDir, s));
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  for (const [rel, text] of Object.entries(files)) {
    if (fs.readFileSync(path.join(root, rel), 'utf8') !== text) fail(`read-back differs: ${rel}`);
  }
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`wrote ${Object.keys(files).length} files, deleted ${Object.keys(src).filter((s) => !(s in M.outputs)).length} old ones`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
