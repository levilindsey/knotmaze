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

J3j, stage agent of coordinator session 7301c55b, 09:22:19 to 10:48 on 2026-11-05 (cap 11:22:19).
Every task is done; nothing was changed in any join. The full record is the kit's NOTES.md entry
`## K863 base` (a copy is `work33/NOTES_k863j.md` on this branch); the tools are `work33/dbg/*_k863j.*`,
and `pwsh -NoProfile -File work33\dbg\checks_k863j.ps1 [step ...]` reruns everything from the trace
folder (steps tools, template, build, ctx, base, census, cmp, det, account, c, cusp, probe, sheets,
png, sheetcol, crops, guard).

- Build, identity, det: `work33/base` rebuilds v6.8 from `out28/cursive_template.svg` (byte-identical,
  8F72C6A8F11D8F4C) and `work28/ports_k990e.json` M. Against `work28/base`, bodies.json,
  join_params.json and every SVG and PNG are byte-identical (11 logs differ in paths and times only);
  the census: 349 pieces compared, 0 differences (cmpf's totals equal; rowsame 349 equal). J3i's word
  list on v6.8 (census_v68x) against J3e's census: 347 in both, 0 differences; against work29's: 519,
  0. The det rerun: 25 files byte-identical, 8 logs differ as in J3e's det, its census 349 equal, 0
  differ.
- c against v7.0: 110 c pieces in the dumps, 101 equal raw coefficients, 9 differ: the joins bc, vc,
  wc (b's, v's and w's exits), cb, cv, cw (numeric only, under 1e-4 u) and c's stroke after bc, vc,
  wc. Census: 20 compared on K1119's words, 14 differ (bc, vc, wc, 11 in kmax_p95 only); 73 on J3h's,
  20 differ (those six joins, 14 in kmax_p95 only). Every join out of c is v7.0's, K1197's old joins.
- The account (`work33/account.txt`; 234 words, 1356 pieces a version; moved = 1e-4 u or more):
  J3f 301 moved (exits 97, joins out of b/v/w 78, into a/q 8, into e 11, stroke after 78; 29
  unlisted), largest 88.2 u (wl); J3g 244 (97, 78, 8, 11, 34; 16 unlisted); J3h 78, all listed (c's
  exit 28, joins out of c 31, stroke after 19); J3i 180, all listed (cusp entries 66, rule joins 82,
  cut exits 32). The 45 unlisted pieces all come from b's, v's and w's new bodies as the SECOND letter
  of a pair (the joins into b, v and w, the strokes after them, e's lead out of ew and f's out of fw;
  up to 21.2 u). Per-letter counts and each version against v6.8 are in the NOTES entry.
- Cusp corners on the base (`work33/cusp_corners.txt`): 19 (of 25 undesigned seams; the other 6 are
  the q$ tails), every one an entry into r, s or i on its port that retraces the join; the largest dk
  0.0462 /u at nr, dr and er (after, lawgiver, jumps over the lazy dog), then ds and as (0.0436). v7.1
  has 23, v7.2 none. Drawn on `out33/corners_v68.svg` (font, approved, v7.2): approved and v7.2 draw
  them alike, a sharp point the font has too.
- Sheets (`out33/*.svg`, PNGs in `out33/png/`, crops in `work33/sheets/png/` and `out33/png/`; the
  guard clean on all 10): b, v, w, aq_joins, e_after_bvw (font, approved, v6.9, v7.0), c (font,
  approved, v7.1, v7.2), cusp and corners (font, approved, v7.2), cursive_v68_words (font, approved).
  Every crop was viewed (`work33/crops_viewed.txt`, one paragraph each). Sheetcol confirms the
  approved column is v6.8 on K1119's b, v and w sheets (27/27 each) and aq (10/10), and the blue (old)
  joins on K1197's c sheets (approved = out32's v7.0 column on 24 of 27 c rows; the 3 others are cb,
  cv, cw, whose second letter is v6.8's). K1119's e sheet has no v6.8 column (approved = out29's v6.8
  on the 3 rows both hold).
- Left as found: the unlisted body cause above; SU.g2 reads `angle_deg`, the census writes `ang_deg`;
  rowsame keys rows by word number; duplicate word-list ids (v68x 718 rows, 713 ids; J3e's 349, 347);
  the 6 q$ tail seams; ij draws no j (K1198, held); p and s end with no tail; the dots are ticks.
- Next: the next stage changes joins, judged against these sheets (approved = v6.8 beside v6.9 to
  v7.2).