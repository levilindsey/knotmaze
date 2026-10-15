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
