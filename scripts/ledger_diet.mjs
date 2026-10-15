#!/usr/bin/env node
// K353: the ledger diet. Shortens LEDGER.md's items from a map and keeps the
// full original text in docs/ledger_notes.md (open items) and
// docs/ledger_done.md (Done items). Node, no dependencies.
//
//   node scripts/ledger_diet.mjs list [file]
//       every item as one JSON line: {id, section, sha, lines, text}
//   node scripts/ledger_diet.mjs apply <map.jsonl> [--dry-run] [--file LEDGER.md]
//                                      [--notes <file>] [--done <file>] [--date YYYY-MM-DD]
//   node scripts/ledger_diet.mjs verify <before-file> [--file LEDGER.md]
//                                      [--notes <file>] [--done <file>]
//   node scripts/ledger_diet.mjs pack <src>... [--snapshot LEDGER.md]
//                                      [--out docs/ledger_diet/map.jsonl] [--width 72]
//   node scripts/ledger_diet.mjs pointers <map.jsonl> [--snapshot LEDGER.md]
//
// An ITEM starts at a line matching /^- \*\*K\d+\*\* ·/ and ends before the
// next such line, a blank line or a heading. Prose that is not an item is
// never touched. An item's SHA is the sha1 of its text: lines joined with
// LF (CRLF turned to LF), trailing whitespace of the whole text trimmed.
//
// apply (map lines are {id, sha, text}):
//   - replaces an item only when its current sha equals the map's `sha`, and
//     lists the ones it skipped (changed since the snapshot, missing, bad text);
//   - appends the verbatim original of each replaced open item to
//     docs/ledger_notes.md under `## K<n> (<date>, shortened by the diet)`;
//   - appends the verbatim original of every Done item it touches to
//     docs/ledger_done.md under `## K<n> (Done <date>)`, creating the file;
//   - a Done item resolved before 2026-10-12 (the last YYYY-MM-DD in the
//     item decides), or with no date, leaves LEDGER.md entirely; the other
//     Done items are replaced by their map line (an item with no map line
//     stays as it is);
//   - keeps the file's line endings; a removed item takes one adjacent
//     blank line with it, so the separators that were there stay;
//   - sets the header's "Next free ID: K<n>." to the highest ID in the three
//     files plus one (never lower than the header already says).
// The notes and done files live in `docs/` next to the ledger file (so a copy
// of the ledger in a scratch folder never touches the real ones) unless
// --notes / --done name them.
//
// verify checks, against <before-file> (the ledger before the diet):
//   1. every ID in it is in LEDGER.md as an item exactly once (a Done entry
//      that was replaced by a one-liner also has its original in
//      docs/ledger_done.md), or, if it left LEDGER.md, in
//      docs/ledger_done.md exactly once; open items are never archived there;
//   2. every original item text appears verbatim, as a whole block, in
//      LEDGER.md, docs/ledger_notes.md or docs/ledger_done.md;
//   3. the headings and the non-item prose are unchanged (only the
//      "Next free ID" number may differ), items stay in their sections and
//      keep their order.
// It exits 1 on a failure and prints warnings (layout, items still long).
//
// pack turns authored blocks (a `- **K12** · ...` line, then its text; an
// indented `  - field:` line starts a sub-bullet) into map lines, wrapping
// the text at --width columns and taking each sha from the snapshot.
// pointers lists, per map line, the paths and commit ids of the original
// that the new text no longer mentions.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ITEM_RE = /^- \*\*K(\d+)\*\* ·/;
const HEAD_RE = /^#{1,6}\s/;
const NEXT_ID_RE = /^Next free ID: K(\d+)\.\s*$/;
const CUTOFF = '2026-10-12';

const isBlank = (s) => s.trim() === '';
const sha1 = (text) => crypto.createHash('sha1').update(text, 'utf8').digest('hex');
const normText = (s) => s.replace(/\r\n/g, '\n').replace(/\s+$/, '');
const isDoneSection = (name) => /^done\b/i.test(name);

function lastDate(text) {
  const all = text.match(/\d{4}-\d{2}-\d{2}/g);
  return all ? all[all.length - 1] : null;
}

function localDate() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---------------------------------------------------------------- parsing

export function parse(content) {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  let body = content;
  let finalEol = false;
  if (body.endsWith('\r\n')) { body = body.slice(0, -2); finalEol = true; }
  else if (body.endsWith('\n')) { body = body.slice(0, -1); finalEol = true; }
  const lines = content === '' ? [] : body.split(/\r?\n/);
  const items = [];
  const prose = []; // non-blank lines outside every item: {line, section}
  let section = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = ITEM_RE.exec(line);
    if (m) {
      let j = i + 1;
      while (j < lines.length && !isBlank(lines[j]) && !ITEM_RE.test(lines[j]) && !HEAD_RE.test(lines[j])) j++;
      const text = normText(lines.slice(i, j).join('\n'));
      items.push({
        id: 'K' + m[1], num: Number(m[1]), section, start: i, end: j,
        lines: j - i, text, sha: sha1(text),
      });
      i = j;
      continue;
    }
    if (/^##\s/.test(line)) section = line.replace(/^##\s+/, '').trim();
    if (!isBlank(line)) prose.push({ line, section });
    i++;
  }
  return { eol, finalEol, lines, items, prose };
}

function readFile(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function parseArgs(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') opt.dryRun = true;
    else if (a.startsWith('--')) { opt[a.slice(2)] = argv[++i]; }
    else pos.push(a);
  }
  return { pos, opt };
}

function paths(opt) {
  const ledger = path.resolve(opt.file || 'LEDGER.md');
  const base = path.dirname(ledger);
  return {
    ledger,
    notes: path.resolve(opt.notes || path.join(base, 'docs', 'ledger_notes.md')),
    done: path.resolve(opt.done || path.join(base, 'docs', 'ledger_done.md')),
  };
}

// highest item ID in the given files' contents: item lines and `## K<n>` headings
function highestId(contents) {
  let max = 0;
  for (const c of contents) {
    if (!c) continue;
    for (const line of c.split(/\r?\n/)) {
      const m = ITEM_RE.exec(line) || /^## K(\d+)\b/.exec(line);
      if (m) max = Math.max(max, Number(m[1]));
    }
  }
  return max;
}

// ------------------------------------------------------------------- list

function cmdList(file) {
  const content = readFile(file || 'LEDGER.md');
  if (content === null) throw new Error(`no such file: ${file || 'LEDGER.md'}`);
  for (const it of parse(content).items) {
    console.log(JSON.stringify({ id: it.id, section: it.section, sha: it.sha, lines: it.lines, text: it.text }));
  }
}

// ------------------------------------------------------------------ apply

function readMap(file) {
  const map = new Map();
  const errors = [];
  const raw = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  raw.forEach((line, n) => {
    if (isBlank(line)) return;
    let o;
    try { o = JSON.parse(line); } catch (e) { errors.push(`map line ${n + 1}: not JSON`); return; }
    if (!o || typeof o.id !== 'string' || typeof o.sha !== 'string' || typeof o.text !== 'string') {
      errors.push(`map line ${n + 1}: needs string id, sha, text`); return;
    }
    if (map.has(o.id)) { errors.push(`map line ${n + 1}: ${o.id} appears twice`); return; }
    const text = normText(o.text);
    const tl = text.split('\n');
    const bad = !text.startsWith(`- **${o.id}** · `) ? 'the first line must start "- **' + o.id + '** · "'
      : tl.some(isBlank) ? 'a blank line inside the text'
      : tl.slice(1).some((l) => ITEM_RE.test(l) || HEAD_RE.test(l)) ? 'a continuation line looks like an item or a heading'
      : null;
    if (bad) { errors.push(`map line ${n + 1}: ${o.id}: ${bad}`); return; }
    map.set(o.id, { sha: o.sha, text });
  });
  return { map, errors };
}

function archiveHeader(kind) {
  return kind === 'done'
    ? '# Ledger done\n\nDone items moved out of `LEDGER.md` by the ledger diet (K353, from\n2026-10-15), verbatim, under their ID: every entry resolved before\n2026-10-12 or undated, and the full text of the newer ones, which the\nledger keeps as a one-line entry. New entries go at the bottom.\n'
    : '';
}

function appendEntries(existing, entries, eol, kind) {
  let out = existing;
  if (out === null) out = archiveHeader(kind).replace(/\n/g, eol);
  if (out !== '' && !out.endsWith('\n')) out += eol;
  for (const e of entries) {
    out += eol + `## ${e.id} (${e.note})` + eol + eol + e.original.replace(/\n/g, eol) + eol;
  }
  return out;
}

function planApply(content, map, date) {
  const P = parse(content);
  const done = []; // {it, kind, text?}
  const report = { replaced: [], doneReplaced: [], doneRemoved: [], kept: 0, alreadyApplied: [], skipped: [], warnings: [] };
  const seen = new Map();
  for (const it of P.items) seen.set(it.id, (seen.get(it.id) || 0) + 1);
  for (const [id, n] of seen) if (n > 1) report.warnings.push(`${id} appears ${n} times in the ledger`);
  const used = new Set();
  for (const it of P.items) {
    const isDone = isDoneSection(it.section);
    const m = map.get(it.id);
    if (isDone) {
      const d = lastDate(it.text);
      if (!d || d < CUTOFF) { done.push({ it, kind: 'remove', date: d }); report.doneRemoved.push(it.id); if (m) used.add(it.id); continue; }
    }
    if (!m) { report.kept++; continue; }
    used.add(it.id);
    if (m.text === it.text) { report.alreadyApplied.push(it.id); continue; }
    if (m.sha !== it.sha) { report.skipped.push({ id: it.id, reason: 'changed since the snapshot (sha differs)' }); continue; }
    done.push({ it, kind: 'replace', text: m.text, date: isDone ? lastDate(it.text) : null });
    (isDone ? report.doneReplaced : report.replaced).push(it.id);
  }
  for (const id of map.keys()) if (!used.has(id)) report.skipped.push({ id, reason: 'not in the ledger as an item' });

  // line edits, bottom up
  const lines = P.lines.slice();
  for (const a of done.slice().reverse()) {
    if (a.kind === 'replace') {
      lines.splice(a.it.start, a.it.end - a.it.start, ...a.text.split('\n'));
    } else {
      let s = a.it.start;
      let e = a.it.end;
      if (e < lines.length && isBlank(lines[e])) e++;
      else if (e >= lines.length && s > 0 && isBlank(lines[s - 1])) s--;
      lines.splice(s, e - s);
    }
  }

  // archive entries, in the ledger's order
  const notes = [];
  const doneEntries = [];
  for (const a of done) {
    const orig = a.it.text;
    if (isDoneSection(a.it.section)) {
      doneEntries.push({ id: a.it.id, note: a.date ? `Done ${a.date}` : 'Done, undated', original: orig });
    } else {
      notes.push({ id: a.it.id, note: `${date}, shortened by the diet`, original: orig });
    }
  }
  return { P, lines, notes, doneEntries, report };
}

function cmdApply(mapFile, opt) {
  if (!mapFile) throw new Error('usage: apply <map.jsonl> [--dry-run] [--file LEDGER.md]');
  const p = paths(opt);
  const content = readFile(p.ledger);
  if (content === null) throw new Error(`no such file: ${p.ledger}`);
  const { map, errors } = readMap(mapFile);
  const date = opt.date || localDate();
  const plan = planApply(content, map, date);
  for (const e of errors) plan.report.skipped.push({ id: '(map)', reason: e });
  const { P } = plan;
  const notesOld = readFile(p.notes);
  const doneOld = readFile(p.done);
  const notesNew = appendEntries(notesOld, plan.notes, P.eol, 'notes');
  const doneNew = appendEntries(doneOld, plan.doneEntries, P.eol, 'done');

  // the header's next free ID
  let lines = plan.lines;
  const ledgerPre = lines.join(P.eol);
  const high = highestId([ledgerPre, notesNew, doneNew]);
  const idx = lines.findIndex((l) => NEXT_ID_RE.test(l));
  let nextId = high + 1;
  if (idx >= 0) {
    const cur = Number(NEXT_ID_RE.exec(lines[idx])[1]);
    if (cur > nextId) { plan.report.warnings.push(`header says K${cur} but the highest ID is K${high}: header kept`); nextId = cur; }
    lines = lines.slice();
    lines[idx] = `Next free ID: K${nextId}.`;
  } else {
    plan.report.warnings.push('no "Next free ID: K<n>." line in the ledger');
  }
  const out = lines.join(P.eol) + (P.finalEol ? P.eol : '');

  const r = plan.report;
  const bytes = (s) => Buffer.byteLength(s, 'utf8');
  console.log(`${opt.dryRun ? 'dry run: ' : ''}${p.ledger}`);
  console.log(`  items: ${P.items.length}; open rewritten ${r.replaced.length}; Done replaced by a one-liner ${r.doneReplaced.length}; Done archived (left the ledger) ${r.doneRemoved.length}; kept as they were ${r.kept}; already applied ${r.alreadyApplied.length}; skipped ${r.skipped.length}`);
  console.log(`  ledger: ${bytes(content)} -> ${bytes(out)} bytes, ${P.lines.length} -> ${lines.length} lines`);
  console.log(`  notes: ${notesOld === null ? 0 : bytes(notesOld)} -> ${bytes(notesNew)} bytes (${plan.notes.length} entries); done: ${doneOld === null ? 0 : bytes(doneOld)} -> ${bytes(doneNew)} bytes (${plan.doneEntries.length} entries)`);
  console.log(`  Next free ID: K${nextId}`);
  for (const s of r.skipped) console.log(`  SKIPPED ${s.id}: ${s.reason}`);
  for (const w of r.warnings) console.log(`  warning: ${w}`);
  if (opt.dryRun) return;
  fs.mkdirSync(path.dirname(p.notes), { recursive: true });
  fs.mkdirSync(path.dirname(p.done), { recursive: true });
  fs.writeFileSync(p.notes, notesNew);
  fs.writeFileSync(p.done, doneNew);
  fs.writeFileSync(p.ledger, out);
}

// ----------------------------------------------------------------- verify

function countBy(items) {
  const m = new Map();
  for (const it of items) m.set(it.id, (m.get(it.id) || 0) + 1);
  return m;
}

// does `text` (LF) appear in `hay` (LF) as a whole block: at a line start, ending at a line end
function hasBlock(hay, text) {
  let from = 0;
  for (;;) {
    const at = hay.indexOf(text, from);
    if (at < 0) return false;
    const before = at === 0 || hay[at - 1] === '\n';
    const end = at + text.length;
    const after = end === hay.length || hay[end] === '\n' || hay[end] === '\r';
    if (before && after) return true;
    from = at + 1;
  }
}

function cmdVerify(beforeFile, opt) {
  if (!beforeFile) throw new Error('usage: verify <before-file> [--file LEDGER.md]');
  const p = paths(opt);
  const beforeC = readFile(beforeFile);
  if (beforeC === null) throw new Error(`no such file: ${beforeFile}`);
  const afterC = readFile(p.ledger);
  if (afterC === null) throw new Error(`no such file: ${p.ledger}`);
  const notesC = readFile(p.notes) || '';
  const doneC = readFile(p.done) || '';
  const B = parse(beforeC);
  const A = parse(afterC);
  const D = parse(doneC);
  const lf = (s) => s.replace(/\r\n/g, '\n');
  const hays = [lf(afterC), lf(notesC), lf(doneC)];
  const fails = [];
  const warns = [];

  // 1. each ID exactly once
  const aCount = countBy(A.items);
  const dCount = countBy(D.items);
  const bCount = countBy(B.items);
  for (const it of B.items) {
    if (bCount.get(it.id) > 1 && B.items.find((x) => x.id === it.id) !== it) continue; // a duplicate in the snapshot itself: check once
    const inA = aCount.get(it.id) || 0;
    const inD = dCount.get(it.id) || 0;
    const wasDone = isDoneSection(it.section);
    const want = bCount.get(it.id);
    if (inA === 0) {
      if (!(wasDone && inD === 1)) fails.push(`${it.id}: gone from LEDGER.md and ${inD} times in ledger_done.md${wasDone ? '' : ' (an open item may not leave)'}`);
    } else if (inA !== 1 && inA !== want) {
      fails.push(`${it.id}: ${inA} times in LEDGER.md (before: ${want})`);
    } else if (inD > 1 || (inD === 1 && !wasDone)) {
      fails.push(`${it.id}: ${inD} entries in ledger_done.md${wasDone ? '' : ' (open item)'}`);
    }
  }

  // 2. every original text verbatim in one of the three files
  for (const it of B.items) {
    if (!hays.some((h) => hasBlock(h, it.text))) fails.push(`${it.id}: its original text is in none of the three files`);
  }

  // 3. headings and non-item prose unchanged; sections and order of items
  const norm = (l) => (NEXT_ID_RE.test(l) ? 'Next free ID: K#.' : l);
  const bp = B.prose.map((x) => norm(x.line));
  const ap = A.prose.map((x) => norm(x.line));
  if (bp.length !== ap.length) fails.push(`non-item lines: ${bp.length} before, ${ap.length} after`);
  for (let i = 0; i < Math.min(bp.length, ap.length); i++) {
    if (bp[i] !== ap[i]) { fails.push(`non-item line ${i + 1} differs:\n    before: ${bp[i].slice(0, 100)}\n    after:  ${ap[i].slice(0, 100)}`); break; }
  }
  const bPos = new Map();
  B.items.forEach((it, i) => { if (!bPos.has(it.id)) bPos.set(it.id, i); });
  let last = -1;
  for (const it of A.items) {
    const b = B.items.find((x) => x.id === it.id);
    if (!b) { fails.push(`${it.id}: in the ledger now but not before`); continue; }
    if (b.section !== it.section) fails.push(`${it.id}: moved from "${b.section}" to "${it.section}"`);
    const pos = bPos.get(it.id);
    if (pos < last) fails.push(`${it.id}: out of order`);
    last = Math.max(last, pos);
  }
  const nid = A.lines.map((l) => NEXT_ID_RE.exec(l)).find(Boolean);
  const high = highestId([afterC, notesC, doneC]);
  if (!nid) warns.push('no "Next free ID" line');
  else if (Number(nid[1]) < high + 1) fails.push(`Next free ID is K${nid[1]} but the highest ID in the three files is K${high}`);
  if (A.eol !== B.eol) warns.push('line endings differ from the before-file');

  // layout warnings
  const lay = { doneAdjacent: 0, openBlank: 0 };
  for (let i = 1; i < A.items.length; i++) {
    const a = A.items[i - 1];
    const b = A.items[i];
    if (a.section !== b.section) continue;
    const gap = b.start - a.end;
    if (isDoneSection(b.section) && gap === 0) lay.doneAdjacent++;
    if (!isDoneSection(b.section) && gap > 0 && A.lines.slice(a.end, b.start).every(isBlank)) lay.openBlank++;
  }
  if (lay.doneAdjacent) warns.push(`${lay.doneAdjacent} Done items follow each other with no blank line`);
  if (lay.openBlank) warns.push(`${lay.openBlank} open items are separated by a blank line`);
  const longOpen = A.items.filter((it) => !isDoneSection(it.section) && !/^in progress/i.test(it.section) && it.lines > 3);
  if (longOpen.length) warns.push(`${longOpen.length} open items (not In progress) still over three lines: ${longOpen.map((x) => x.id).join(' ')}`);
  const longDone = A.items.filter((it) => isDoneSection(it.section) && (lastDate(it.text) || '') >= CUTOFF && it.lines > 1);
  if (longDone.length) warns.push(`${longDone.length} Done items from ${CUTOFF} on still over one line: ${longDone.map((x) => x.id).join(' ')}`);

  console.log(`verify: ${B.items.length} items before, ${A.items.length} in the ledger now, ${D.items.length} in ledger_done.md`);
  for (const w of warns) console.log(`  warning: ${w}`);
  if (fails.length) {
    for (const f of fails) console.log(`  FAIL ${f}`);
    console.log(`verify: ${fails.length} failure(s)`);
    process.exit(1);
  }
  console.log('verify: ok');
}

// ------------------------------------------------------------------- pack

function wrapWords(first, rest, text, width) {
  const words = text.split(/\s+/).filter(Boolean);
  const out = [];
  let cur = first;
  let empty = true;
  for (const w of words) {
    if (empty) { cur += w; empty = false; continue; }
    if (cur.length + 1 + w.length > width) { out.push(cur); cur = rest + w; }
    else cur += ' ' + w;
  }
  out.push(cur);
  return out;
}

function wrapBlock(blockLines, width) {
  // paragraphs: the item line (continuation indent 2), then each "  - " line (indent 4)
  const paras = [];
  for (const l of blockLines) {
    if (ITEM_RE.test(l)) paras.push({ head: '', indent: '  ', text: l });
    else if (/^\s{2}- /.test(l)) paras.push({ head: '  ', indent: '    ', text: l.trim() });
    else if (paras.length) paras[paras.length - 1].text += ' ' + l.trim();
  }
  const out = [];
  for (const p of paras) {
    const t = p.text.trim();
    if (p.head === '' && ITEM_RE.test(t)) {
      // keep the "- **K12** · " lead intact
      out.push(...wrapWords('', p.indent, t, width));
    } else {
      out.push(...wrapWords(p.head, p.indent, t, width));
    }
  }
  return out.join('\n');
}

function cmdPack(srcs, opt) {
  if (!srcs.length) throw new Error('usage: pack <src>... [--snapshot LEDGER.md] [--out docs/ledger_diet/map.jsonl]');
  const snap = parse(readFile(opt.snapshot || 'LEDGER.md'));
  const byId = new Map();
  for (const it of snap.items) byId.set(it.id, it); // the bottom-most copy wins
  const width = Number(opt.width || 72);
  const out = [];
  const seen = new Set();
  let errors = 0;
  for (const src of srcs) {
    const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
    let cur = null;
    const blocks = [];
    for (const l of lines) {
      if (ITEM_RE.test(l)) { cur = [l]; blocks.push(cur); }
      else if (cur && !isBlank(l)) cur.push(l);
      else if (isBlank(l)) cur = null;
    }
    for (const b of blocks) {
      const id = 'K' + ITEM_RE.exec(b[0])[1];
      const it = byId.get(id);
      if (!it) { console.error(`${src}: ${id} is not in the snapshot`); errors++; continue; }
      if (seen.has(id)) { console.error(`${src}: ${id} appears twice in the sources`); errors++; continue; }
      seen.add(id);
      // a Done entry is ONE line (not wrapped); open items wrap at `width`
      const text = wrapBlock(b, isDoneSection(it.section) ? Infinity : width);
      out.push({ id, sha: it.sha, text });
      const tl = text.split('\n');
      const desc = tl.findIndex((l) => /^\s{2}- /.test(l));
      const n = desc < 0 ? tl.length : desc;
      if (isDoneSection(it.section) && tl.length > 1) console.error(`  note: ${id} (Done) is ${tl.length} lines`);
      else if (!isDoneSection(it.section) && n > 3) console.error(`  note: ${id} has ${n} description lines`);
      if (!isDoneSection(it.section) && tl.some((l) => l.length > width + 12)) console.error(`  note: ${id} has a line over ${width + 12} columns`);
      if (!/^in progress/i.test(it.section) && !isDoneSection(it.section) && desc >= 0) console.error(`  note: ${id} (${it.section}) has sub-bullets`);
    }
  }
  if (errors) process.exit(1);
  const file = opt.out || 'docs/ledger_diet/map.jsonl';
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, out.map((o) => JSON.stringify(o)).join('\n') + '\n');
  console.log(`pack: ${out.length} map lines -> ${file}`);
}

// --------------------------------------------------------------- pointers

const POINTER_RES = [
  /\.claude\/[\w./-]*[\w/-]/g,
  /\b(?:docs|src|scripts|test|notices)\/[\w./-]*[\w]/g,
  /\b[\w-]+\.(?:md|ts|mjs|json|jsonl|ps1|png|txt|js)\b/g,
  /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/g,
];

function pointersOf(text) {
  const set = new Set();
  for (const re of POINTER_RES) for (const m of text.matchAll(re)) set.add(m[0].replace(/[.,;:]+$/, ''));
  return set;
}

function cmdPointers(mapFile, opt) {
  const snap = parse(readFile(opt.snapshot || 'LEDGER.md'));
  const byId = new Map(snap.items.map((it) => [it.id, it]));
  const { map } = readMap(mapFile);
  let n = 0;
  for (const [id, m] of map) {
    const it = byId.get(id);
    if (!it) continue;
    const oldP = pointersOf(it.text);
    const newP = pointersOf(m.text);
    const lost = [...oldP].filter((x) => !newP.has(x) && !m.text.includes(x));
    if (lost.length) { n++; console.log(`${id}: ${lost.join('  ')}`); }
  }
  console.log(`pointers: ${n} of ${map.size} map lines drop at least one`);
}

// ------------------------------------------------------------------- main

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { pos, opt } = parseArgs(rest);
  switch (cmd) {
    case 'list': return cmdList(pos[0] || opt.file);
    case 'apply': return cmdApply(pos[0], opt);
    case 'verify': return cmdVerify(pos[0], opt);
    case 'pack': return cmdPack(pos, opt);
    case 'pointers': return cmdPointers(pos[0], opt);
    default:
      console.error('usage: ledger_diet.mjs list|apply|verify|pack|pointers (see the header of this file)');
      process.exit(2);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) main();
