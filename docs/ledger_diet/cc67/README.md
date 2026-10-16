# CC67: the second ledger diet (open items over three lines)

Docs only, no code. `LEDGER.md` has about 165 open items over three
lines each; the convention (claude-config `rules/ledger.md`) allows one to
three. CC67 shortens them with `scripts/ledger_diet.mjs` (K353, generalized
by CC64) and writes a map that the coordinator applies at the merge.

Snapshot: `LEDGER.md` at commit 023f780 (master, the worktree's base),
copied to `docs/ledger_diet/cc67/snapshot.md`. `apply` skips any item that
changed after the snapshot, so a later edit is never overwritten.

## In scope

The items over three lines in: "Waiting on Levi", "Next, in order",
"Residuals (known, not fixed)", "Approved, to schedule (2026-10-11)" and
"Ideas (not scheduled)". Out of scope: "In progress" (live resume handles)
and "Done" (the nightly job archives it).

## Rules

- Never merge, split, renumber or move an item between sections.
- A new item is one to three lines, keeps its ID, its decision or ask, and
  every pointer of the original: file paths, design docs and sections,
  commits, URLs and links, probe, sheet and crop paths, and the item IDs it
  names. A Waiting on Levi item keeps its options and its recommendation.
- History and reasoning go. `apply` keeps the verbatim original of every
  shortened item in `docs/ledger_notes.md`.
- A pointer dropped on purpose is named in the report, with the reason.
- Never write the real `LEDGER.md`, `docs/ledger_notes.md` or
  `docs/ledger_done.md`; the coordinator applies the map.

## Files

- `src/<n>_<section>.txt`: the authored blocks, one file per section (the
  form is K353's in `docs/ledger_diet/src/`).
- `map.jsonl`: `pack` output (`--snapshot docs/ledger_diet/cc67/snapshot.md`).
- `dry/` (untracked): copies of the ledger, notes and done files where the
  dry run of `apply` and `verify` ran.

## Commands

PowerShell does not expand the glob for node, so `pack` takes the files by
name. `--width 100` is deliberate: the newest ledger items (K394, K399-K421)
are already wrapped at about 100 columns, and 100 keeps an item at three
lines with its pointers; at the tool's default 72 about a third of the items
would need more cutting.

    node scripts/ledger_diet.mjs pack docs/ledger_diet/cc67/src/1_waiting.txt docs/ledger_diet/cc67/src/3_next.txt docs/ledger_diet/cc67/src/4a_residuals.txt docs/ledger_diet/cc67/src/4b_residuals.txt docs/ledger_diet/cc67/src/5_approved_ideas.txt --snapshot docs/ledger_diet/cc67/snapshot.md --out docs/ledger_diet/cc67/map.jsonl --width 100
    node scripts/ledger_diet.mjs pointers docs/ledger_diet/cc67/map.jsonl --snapshot docs/ledger_diet/cc67/snapshot.md
    node scripts/ledger_diet.mjs apply docs/ledger_diet/cc67/map.jsonl --file docs/ledger_diet/cc67/dry/LEDGER.md
    node scripts/ledger_diet.mjs verify docs/ledger_diet/cc67/snapshot.md --file docs/ledger_diet/cc67/dry/LEDGER.md

## Status

All 165 in-scope items are authored (Waiting on Levi 16, Next 29,
Residuals 95, Approved 1, Ideas 24) and packed. `pointers` lists nothing.
The dry run (`dry/`, untracked) took the ledger from 1719 to 1297 lines
(139723 to 123232 bytes), the notes file gains the 165 verbatim originals,
and `verify` passes. Merge this branch, then from the main checkout:
`apply ... --dry-run`, `apply`, `verify` against the snapshot.

Prose the tool cannot touch, for a hand edit after the apply:

- K10 (Next) keeps a trailing prose paragraph ("Rerun after every stage:
  ...", the thermal notes: `dumpsys thermalservice`, `phone_blank.mjs`). It
  repeats the item's rerun line; fold the thermal sentences into
  `.claude/rules/probes-phone.md` if wanted, then delete the paragraph.
- K84 (Ideas) keeps a stray duplicate tail after a blank line ("It meets K57
  ... and feeds K78's param reference."). The shortened K84 already says
  "Meets K57, feeds K78."; delete the tail.
- The "Offers from 2026-10-10 that Levi hasn't answered yet" paragraph before
  K32 (Ideas) is not an item and is left alone.

## Restart

If the agent stops, a restart reads this file, `git log` on the branch, and
the files already in `src/`; it writes the sections that have no file yet.
