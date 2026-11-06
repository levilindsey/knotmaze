# K863 J3j: the approved base (v6.8) as the kit's current build

Ledger: K863 (the cursive alphabet), with K1198 (v7.2's leftovers, held) and K1112 (one join
rule). Stage agent: Claude Opus in its own worktree, started by the coordinator session; cap 2 h.
This stage changes no join. It makes the version Levi approved the kit's current build, proves
it identical to the one Levi saw, accounts for what the later versions changed against it, and
draws the reference sheets every later card compares against.

## Why

Levi, 2026-11-05, on K1119's sheets (font, v6.8, v6.9, v7.0): "the v6.8 versions are WAY better
in all cases. The others are grossly incorrect and unsmooth". On K1197 (c's joins into a, d, g,
o, q and k: the old hand-set join against v7.2's rule): "the old one is better".

So every version after v6.8 moved joins away from the approved look:

- v6.9 (J3f) and v7.0 (J3g): b's, v's and w's exits and every join out of them, the six joins
  into a and q after them, and e's entry after them. Rejected (K1119).
- v7.1 (J3h): c's exit port; the joins out of c stopped reading J2's presets. Rejected (K1197).
- v7.2 (J3i): one rule for the cusp entries (a low exit enters i, j, p, r, s, t, u, w and y
  B u up the letter's upstroke). Levi has not judged it; its card called the change too small
  to see. Under "Judging a look" an unjudged change is not part of the approved version.

The approved version is therefore v6.8 as J3e built it (`work28/`), everywhere. c was untouched
through v7.0, so v6.8's c joins are the old hand-set joins. `docs/design/K863_trace.md`'s
"Judging a look" binds this stage and every later one.

## Goal

1. `work33/`: v6.8 rebuilt by one pipeline, piece for piece identical to
   `work28/census_v68.json`.
2. An account of every piece v6.9, v7.0, v7.1 and v7.2 changed against it, by cause.
3. Reference sheets: the font beside the approved version for every spot later cards are about,
   with each later version beside it where it differs.
4. v7.2's cusp-corner check run on the base, as a list (no fix).

## Read first

- `docs/design/K863_trace.md`, "Judging a look" (binding).
- `docs/design/K990_cursive_j3e.md` whole: v6.8's build and its Handoff.
- `docs/design/K1112_cursive_j3i.md`, its Handoff: the newest tools (side, strip, the cusp
  check, the `png` step).
- `.claude/probes/K863/trace/NOTES.md` is 480 KB: read only the stage entries, found with
  Select-String (`^J3e`, `^J3f`, `^J3g`, `^J3h`, `^J3i`), each from its headline to the next.

## Where to work

The trace kit is untracked: it lives only in the main checkout's `.claude/probes/K863/trace/`
(`C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace\`), with its `venv`. Run the
tools there, as J3e did (`venv\Scripts\python.exe -I work33\dbg\<tool>`, from that folder),
and write only `work33/`, `out33/` and one new NOTES.md entry. Never change an earlier work or
out folder, Levi's templates, J3d's generator, census or sheet tools, or `cnct.*`. Your
worktree branch carries copies of what you commit (`git add -f`: `.claude/probes` is
gitignored), as J3i's branch does. Muse runs in the main checkout on master: never touch its
git state, its tracked files or any other probe folder.

## Tasks

1. **Build.** Port J3e's steps (template, build, ctx, census_v68) to `work33/dbg/*_k863j.*`
   with a `mk_tools_k863j.py`, the way each stage ported the one before, and write
   `checks_k863j.ps1 [step ...]` that reruns everything (`K926_FINAL_E=shear`, `K1009_PINS`
   cleared, as J3e set them). The inputs are v6.8's (`work28/ports_k990e.json` and the template
   J3e built), never a later stage's.
2. **Identity.** Compare `work33`'s census with `work28/census_v68.json` using J3e's
   `cmpf_k990e.py` and `rowsame_k990e.py`: every piece, every field, NaN-aware. The bar is
   zero differences. A difference means a shared input drifted: find which one and build from
   v6.8's copy of it; never loosen the comparison. Run the build twice (J3e's det step):
   identical.
3. **c.** Confirm that c's pieces in v6.8 equal v7.0's (`work30/`'s census): the old hand-set
   joins of K1197's card. List any difference.
4. **The account.** `work33/account.txt`: every piece whose drawing differs between v6.8 and
   v6.9, v7.0, v7.1 or v7.2 (the censuses in `work29` to `work32`), grouped by the stage that
   moved it and its cause above, with counts per letter pair, and each piece's font distance,
   hooks and rough on both sides. A piece moved for a cause not listed above is the account's
   first finding: name it.
5. **Cusp corners.** J3i found 29 small corners where a join meets the top of i, j, p, r, s, t,
   u, w and y, and smoothed 23. Run its check on the base and list each corner (pair, size,
   where), with a full-size crop sheet of them: font, v6.8, v7.2. No fix.
6. **Sheets** (`out33/`, SVG, and PNG at J3i's `Png` dpi; each column labelled):
   - b, v and w joined to every letter, the six a/q joins after them, and e after b, v and w
     (the layout of `out30/`'s `b_v70`, `v_v70`, `w_v70`, `aq_joins_v70`, `e_after_bvw_v70`):
     font, approved (v6.8), v6.9, v7.0.
   - c alone and joined to every letter (the layout of `out32/png/c_v72.png`): font, approved
     (v6.8), v7.1, v7.2.
   - Joins into the tops of i, j, p, r, s, t, u, w and y (`cusp_v72`'s layout): font,
     approved, v7.2.
   - The test words: font, approved.
   View every sheet yourself as full-size crops, at least one per letter row, and confirm the
   approved column matches v6.8 on K1119's sheets and the blue (old) joins on K1197's
   (`out32/png/c_font_cmp_v72.png`, `c_spots_v72.png`). Say what you see; pick nothing.
7. **Record.** A NOTES.md entry `J3j (base = v6.8)` in the form of the others (what, the tools,
   the rerun command, the numbers), and the Handoff below.

## Checks to report (numbers)

- Pieces compared and their differences (0); the det rerun's differences (0).
- c: pieces compared with v7.0, and their differences.
- The account's counts per stage and cause, and per letter; anything with an unlisted cause.
- The cusp corners on the base: how many, the largest, where.
- The sheets' paths, and which crops you viewed.

## Out of scope

Changing any join (the next stage's work, judged against these sheets); K1112's rule; Plc1m and
the ij work (K1198, held); c's refit and batch 22's Run G (held); the app's `src/core/glyphs/`;
Drive (the coordinator uploads what a card needs); anything for Levi.

## Rules

- PowerShell. Read code and NOTES through the shell (Select-String, Get-Content ranges); use
  the Read tool only right before an Edit, and to view sheet crops.
- At most 4 Python processes at a time. No browser and no server unless a step needs one, and
  then ports 5950-5959 only. No phone, no perf measurements.
- No helpers.
- Commit WIP on your branch at every milestone, broken or not; never push; never edit
  LEDGER.md.
- Stop rule: stop when the tasks are done or 2 h after your start, whichever comes first
  (`Get-Date` at the start and at each milestone). Then commit WIP, append the Handoff and
  report. A compaction is not a stop: after one, re-read this brief and `git log`.

## Report

Plain words: the numbers above, what you viewed and what you saw, and your last commit's SHA;
then `Ledger items` (anything left over) and K863's handle fields (owner, branch, last commit,
evidence, next).

## Handoff

(The stage agent appends here.)