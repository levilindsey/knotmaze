#!/usr/bin/env node
// Check that docs/lore_index.md matches the paths: front matter of every
// .claude/rules/*.md file. Run it after editing a rules file's paths:
//
//   node scripts/lore_index_check.mjs
//
// It prints, per rules file, the paths its index row lacks and the row's
// paths the rules file does not have, and any rules file with no row (or
// a row with no rules file). It exits 1 when any of those turn up, and 0
// when the index and the front matter agree. It is not part of npm test:
// a forgotten row should not block a deploy.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rulesDir = path.join(root, '.claude', 'rules');
const indexPath = path.join(root, 'docs', 'lore_index.md');

function parseRulesPaths(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') return [];
  const paths = [];
  let inPaths = false;
  for (let i = 1; i < lines.length && lines[i] !== '---'; i++) {
    if (/^paths:\s*$/.test(lines[i])) { inPaths = true; continue; }
    if (inPaths) {
      const m = lines[i].match(/^\s+-\s+"?([^"]+)"?\s*$/);
      if (m) paths.push(m[1]);
    }
  }
  return paths;
}

function parseIndexRows(text) {
  const lines = text.split(/\r?\n/);
  const rows = {};
  let current = null;
  let inPaths = false;
  for (const line of lines) {
    const head = line.match(/^- `([^`]+\.md)`:/);
    if (head) {
      current = head[1];
      rows[current] = [];
      inPaths = false;
      continue;
    }
    if (/^- /.test(line)) { current = null; inPaths = false; continue; }
    if (current === null) continue;
    if (/^\s+paths:/.test(line)) {
      inPaths = true;
      for (const m of line.matchAll(/`([^`]+)`/g)) rows[current].push(m[1]);
      continue;
    }
    // A paths list may wrap onto following indented lines of backticked
    // paths (the row's description, which also wraps, never does this).
    if (inPaths && /^\s+(`[^`]+`(,\s*)?)+$/.test(line)) {
      for (const m of line.matchAll(/`([^`]+)`/g)) rows[current].push(m[1]);
      continue;
    }
    if (inPaths && !/^\s*$/.test(line)) inPaths = false;
  }
  return rows;
}

const rows = parseIndexRows(fs.readFileSync(indexPath, 'utf8'));
const files = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.md')).sort();
let mismatches = 0;
for (const file of files) {
  const inRules = parseRulesPaths(fs.readFileSync(path.join(rulesDir, file), 'utf8'));
  if (!(file in rows)) {
    console.log(`MISSING ROW: ${file} (${inRules.length} paths)`);
    mismatches++;
    continue;
  }
  const inIndex = rows[file];
  for (const p of inRules) {
    if (!inIndex.includes(p)) {
      console.log(`${file}: in rules, not index: ${p}`);
      mismatches++;
    }
  }
  for (const p of inIndex) {
    if (!inRules.includes(p)) {
      console.log(`${file}: in index, not rules: ${p}`);
      mismatches++;
    }
  }
}
for (const name of Object.keys(rows)) {
  if (!files.includes(name)) {
    console.log(`INDEX ROW FOR MISSING FILE: ${name}`);
    mismatches++;
  }
}
console.log(`mismatches: ${mismatches}`);
process.exit(mismatches === 0 ? 0 : 1);
