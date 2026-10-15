# K353: the ledger diet

Levi, 2026-10-14 23:43: "Ledger diet sgtm."

Why it's needed:
- `LEDGER.md` has grown to about 216 KB and 3,375 lines.
- Only 64 of its 248 open items keep to the convention's one to three
  lines (claude-config `rules/ledger.md`).
- The Done section alone is 59 KB.
- Keeping the file current took about 45% of the coordinating session's
  spend on 10-14.

One sonnet agent, 1 h cap, scripts and docs only. **You do not edit
`LEDGER.md`.** The ledger keeps changing while you work. The coordinator
applies your output to master at a quiet moment, and skips any item
changed since your snapshot, which is `LEDGER.md` at your branch's base
commit.

## Deliverables (commit each on your branch; never push)

1. **`scripts/ledger_diet.mjs`** (Node, no dependencies), with three
   commands:
   - **`list [file]`** prints every item as one JSON line:
     `{id, section, sha, lines, text}`.
     - An item starts at a line matching `^- \*\*K\d+\*\* ·`. It ends
       before the next such line, a blank line, or a `## ` heading.
     - `sha` is the sha1 of the item's text, with CRLF turned to LF and
       trailing whitespace trimmed.
     - Prose that isn't an item is never touched.
   - **`apply <map.jsonl> [--dry-run] [--file LEDGER.md]`** reads map
     lines `{id, sha, text}`:
     - It replaces an item only if its current sha equals `sha`, and
       lists the ones it skipped.
     - The original of each replaced open item is appended verbatim to
       `docs/ledger_notes.md`, under `## K<n>`. That file exists; keep
       its format.
     - Each Done item's original goes to `docs/ledger_done.md`, under
       `## K<n>`. Create that file with a short header like
       `ledger_notes.md`'s.
     - A Done item resolved before 2026-10-12 (judged by the last
       YYYY-MM-DD in the item), or with no date at all, leaves
       `LEDGER.md` entirely. The other Done items are replaced by their
       map line.
     - It keeps the file's CRLF endings and its blank-line layout: Done
       items are separated by blank lines, other sections' items are
       not.
     - It updates the header's "Next free ID: K<n>." to the highest ID
       in the three files, plus one.
   - **`verify <before-file>`** checks that:
     - every ID in `<before-file>` appears exactly once, in `LEDGER.md`
       or in `docs/ledger_done.md`;
     - every original item text in `<before-file>` appears verbatim in
       `LEDGER.md`, `docs/ledger_notes.md` or `docs/ledger_done.md`;
     - the headings and the non-item prose are unchanged.

   Test it on copies, never on the real files: apply your map to a copy
   of the snapshot, then verify.
2. **`docs/ledger_diet/map.jsonl`**: one line per item to shorten.
   - Which items:
     - every open item over three lines;
     - every Done item resolved 2026-10-12 or later, as a one-liner:
       `- **K<n>** · <what it was>. Done in <commit or range> (<date>).`
   - Rules for the new text:
     - The first line keeps its format (`- **K<n>** · `). Continuation
       lines are indented two spaces and wrapped near 72 columns, like
       the file.
     - Keep what the item is, its current state or blocker, any decision
       made, and its pointers (design doc, rules file, commit, probe
       path).
     - Drop verbatim quotes, history, measurements and rationale; the
       notes keep them. A few words of a quote may stay when the wording
       is the decision.
     - **Waiting on Levi:** keep each question answerable, with its
       recommendation. With more than two questions, point to the doc
       section that lists them.
     - **In progress:** one to three lines of description, then the
       handle fields (owner, branch + last commit, evidence, next,
       brief, and env when present), one line each.
     - Never change an ID, an item's section, or the order of items.
     - Work section by section, and commit the map after each section.
3. **A "Stage 1 handoff"** at the end of this brief, with:
   - the number of items rewritten, left as they were, and archived
     from Done;
   - the file's size after a dry-run apply;
   - any item you judged too risky to shorten (left as it was).

## Process

- **Stop rule:**
  - Run `Get-Date` at the start and at each milestone.
  - Stop when the work is done or at 1 h, whichever comes first.
  - A compaction is not a stop. After one, re-read this brief and
    `git log` before going on.
  - On stopping, commit, write the handoff, commit again, and report.
- **Final report:**
  - the commits;
  - the counts;
  - `Ledger items`: anything left over;
  - the handle fields: owner, branch + last commit, evidence, next,
    brief.

## Stage 1 handoff (2026-10-15, sonnet agent a18f9a57206d9475d)

Done and committed on `worktree-agent-a18f9a57206d9475d` (from d741412).
Nothing is pushed and nothing is applied: `LEDGER.md`,
`docs/ledger_notes.md` and `docs/ledger_done.md` are untouched. Every
test ran on copies (`.claude/probes/K353/`, untracked).

**What the branch holds**
- `scripts/ledger_diet.mjs` (no dependencies; its header is the manual):
  `list`, `apply` and `verify` as briefed, plus `pack` (builds the map
  from the editable sources) and `pointers` (lists the URLs and paths a
  map line dropped).
- `docs/ledger_diet/map.jsonl`: 249 lines. `docs/ledger_diet/src/` has
  the same text, one block per item, in eight files (`1_waiting`,
  `2_inprogress`, `3_next`, `4a_residuals`, `4b_residuals`,
  `5_approved_ideas`, `6a_done`, `6b_done`). Rebuild the map with
  `node scripts\ledger_diet.mjs pack <the eight files in that order>
  --snapshot <d741412's LEDGER.md> --out docs\ledger_diet\map.jsonl`
  (shas come from the snapshot; without `--snapshot` it reads
  `LEDGER.md` in the working directory).

**Counts** (348 items in the snapshot; a dry-run apply on a copy)

| Section | Items | Rewritten | Left as they were |
|---|---|---|---|
| Waiting on Levi | 20 | 20 | 0 |
| In progress | 11 | 11 | 0 |
| Next | 36 | 35 | 1 (K309) |
| Residuals | 118 | 70 | 48 |
| Approved | 4 | 1 (K322) | 3 |
| Ideas | 58 | 21 | 37 |
| Done | 101 | 91 one-liners | 0; 10 archived |

- Open items rewritten: 158 (119,603 -> 62,421 characters, 52%).
- Done items replaced by a one-liner: 91 (the format stays one physical
  line each, about 250 bytes).
- Left as they were: 89 open items. 66 were already within three lines;
  23 are over three lines (see below).
- Archived from Done (left `LEDGER.md` entirely): 10, namely K192, K40,
  K1, K31, K28, K25, K2, K18, K3 and K17. All 101 Done originals are in
  `docs/ledger_done.md`.

**Size after a dry-run apply on the snapshot**
- `LEDGER.md`: 208,605 -> 110,601 bytes (-47%), 3,202 -> 1,534 lines.
  By section: Waiting 4.5 KB, In progress 12.1 KB, Next 16.6 KB,
  Residuals 37.6 KB, Approved 0.7 KB, Ideas 13.3 KB, Done 22.9 KB.
- `docs/ledger_notes.md`: 18,198 -> 151,906 bytes (158 originals
  appended). `docs/ledger_done.md`: new, 62,753 bytes (101 entries).
  Neither is imported anywhere, so they cost nothing until opened.
- Against master at 1e7456c (dry run on a copy): 205,187 -> 110,495
  bytes; K279, K8 and K344 are skipped (changed since the snapshot),
  and Next free ID follows master's header (K358).

**Tested** (copies only): the real files are CRLF, and a CRLF ledger
and notes file give an all-CRLF result; an LF copy of master's ledger
applies cleanly too; `verify` ends `verify: ok`; a second `apply`
reports 249 already applied and changes no byte (it appends nothing
twice).

**To apply** (coordinator, on master, at a quiet moment with no agent
editing the ledger)
1. Merge the branch (it adds the script, `docs/ledger_diet/` and this
   brief).
2. `Copy-Item LEDGER.md $env:TEMP\LEDGER.before.md`
3. `node scripts\ledger_diet.mjs apply docs\ledger_diet\map.jsonl
   --dry-run`; read the counts and the SKIPPED lines.
4. `node scripts\ledger_diet.mjs apply docs\ledger_diet\map.jsonl`
5. `node scripts\ledger_diet.mjs verify $env:TEMP\LEDGER.before.md` must
   end `verify: ok`. Run it before any other ledger edit: it wants each
   original text of the before file in one of the three files.
6. Commit `LEDGER.md`, `docs/ledger_notes.md` and `docs/ledger_done.md`
   (a ledger-only push does not deploy); close K353 with that commit.
7. Later, delete `docs/ledger_diet/` (git history keeps map and sources).

An item is replaced only while its text still has the snapshot's sha.
For a skipped item, leave it long, or after its agent finishes edit its
block in `docs/ledger_diet/src/` and re-pack with `--snapshot
LEDGER.md` (the live ledger). The re-pack gives every block the sha of
the ledger as it is then, so first delete the blocks of any other item
that changed since: their old rewrite would overwrite the new text.
Items already applied just count as "already applied".

**Left as they were, or too risky to shorten**
- K227 (Ideas): three real lines, then a two-line prose pair ("Offers
  from 2026-10-10 ...") with no blank line, so the scanner sees five
  lines and a rewrite would swallow the prose. A blank line after K227
  fixes it (it is then within three lines). The script never touches
  prose.
- `- **K47 + K56** ·` and `- **K19 + K20** ·` (Done, 2026-10-12) name two
  IDs, so they are prose to the scanner: untouched, still long.
- 22 rewrites saved under 5% and were dropped from the map (K188, K15,
  K308, K213, K207, K196, K27, K255, K221, K305, K309, K285, K70, K113,
  K166, K157, K128, K346, K125, K112, K220, K205): they stay 4-8 lines.
- In progress: all 11 are rewritten but stay 14-23 lines, because each
  carries its six handle fields (live agent ids, caps, worktrees). Five
  items (K7, K76, K279, K344 and K8) are being edited by running agents;
  a dry run on master at 1e7456c already skips K279, K8 and K344.
- 152 open items other than In progress are still over three lines
  (49 at four lines, 33 at five, 27 at six, 21 at seven, 22 longer).
  They hold a pointer, a decision, or an (a)(b)(c) list whose parts are
  separate questions, so cutting more would drop a question. A second
  pass could take them to three lines; the Done one-liners could also
  go from about 250 to about 160 bytes.
- K192 has no date although it finished 2026-10-14; by the rule an
  undated Done item leaves the ledger, so it is archived with the old ones.

**Warnings `verify` prints (expected)**: 71 Done items follow each other
with no blank line (the layout is kept); 2 open items (K78 and K297, in
Next) are separated by a blank line; the Next free ID header is kept
when it is already above the highest ID plus one (K354 against a highest
K352 in the snapshot).

**Checks I made by hand**: the In progress handle fields (owner, branch,
evidence, next, brief) are all present; the Waiting questions are still
answerable and keep their recommendations; about 20 other items were
compared with their originals. What a rewrite dropped (worktree paths,
probe file names, commit ids, quotes) is in the originals appended to
`docs/ledger_notes.md` and `docs/ledger_done.md`.
