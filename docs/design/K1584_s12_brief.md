# K1584 stage 12: the short border inside A_3's small hook keeps its lower half

Base: `origin/master`. Worktree `...\worktrees\k1584-s12`, branch `k1584-s12`. Your files: the gap step
(`src/render/gpu_field/gf_look.ts`, `gf_app.ts`, `gf_pack.ts`, the gap tables). Keep out of `eval.ts` and
`gf_glsl.ts`: another agent is changing the junction rule there now.

## Levi (2026-11-25, on review picture place 3: "agreed. Fix them")

A_3, corner k148 (ledger K1608; picture `.claude/probes/K1584/review12/out/review12_1.png` row 3 in
worktree `k1584-s11`, place list `review12/places12.json`). Today a short dark border runs diagonally from
the bottom line up into the small hook. Now its lower part is gone, leaving a dark triangle hanging from
the top of the hook with a gray smudge under it. Wanted: the border drawn whole, as today, unless a real
crossing's gap belongs there (then a clean gap with angled ends, no triangle, no smudge). Stage 8's
handoff (`docs/design/K1584_s8_brief.md`) calls this place "a partial flag miss".
## Bindings

Every other pixel on all 21 test mazes equals a capture of master's build, or you list and view the place
and report it. Never remove a thread's border; never trade a hook for a point; the under pass keeps its
width and heading; every under-thread border at a real crossing keeps its gap; stage 4's angled cut ends
stay; tight balls keep the stage 11 wedge. You own the technique. If the fix cannot hold these, stop and
report with pictures: no second rule on top.

## Done

1. Src, CPU mirror and tests; `npm test` green; every re-frozen pin named; `npm run build` passes.
2. Captures of all 21 mazes from master's build and yours (the stage 11 recipe: `.claude/probes/K1584/s11/`
   tools `run11`, `warm7.ps1`, the perf lock through `scripts/perf_lock.ps1`, never by hand; if another
   owner holds the lock, wait inside one blocking command).
3. One large sheet (14x) per named place: `today | master | yours`, the spot circled, viewed by you, plus
   every other changed place on all 21 mazes listed and viewed.
4. Counts in one `screen.py` run, master against yours: closed sides, loose pieces.

## How to work

- `Get-Date` first. PowerShell. Read code through the shell; the Read tool only just before an Edit, and
  for images. Write only inside your worktree; `node_modules` is a directory junction to the main
  checkout's (never `npm install`, never remove the junction's target).
- Commit WIP at every milestone, broken or not (`git add -f` for probe tools, never their outputs). Never
  push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
  `--virtual-time-budget`.
- Helpers on sonnet, mechanical work only, with this stop rule. Looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock (`Get-Date` at each milestone), whichever comes
first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append a
`## Handoff` here, commit, and report: verdict first (safe to land or not), what holds and what does not
with numbers, sheet paths, counts, a `Ledger items` list and the handle fields (owner, branch, last
commit, evidence, next).

## Handoff (2026-11-25 18:25, stage 12 agent; all four Done items hold, about 1 h 05 of the 2 h used)

**Verdict: built, and no binding was seen broken, but not safe to land without Levi's call on place 3.**
Levi's wording at place 3 asks for one of two looks. The stage gives the second, "a clean gap with angled
ends", at the crossing x254, not "drawn whole, as today". All 191 changed places are that same kind of
place, and today drew most of them whole and joined.

**The rule** (362a261, `gf_look.ts` gapWindow, `GAP_S12`; env `GF_S12=0` turns it off for A/Bs).
- It applies to a rule-K border (K1601's keep-to-the-joint) whose crossing's over is the partner at its
  pair corner, when that border clears the over's margin (cutB) but never clears margin + fade before the
  joint.
- Before, such a border kept the whole gap window to `rm - 0.12` with full margin and fade. That faded the
  border away along its whole length, which left master's triangle and smudge.
- It now keeps the full margin and no fade, and ends the window at cutB: a crisp cut at the 3 px margin,
  with stage 4's angled end.
- x254 itself: under 59 at ctrl 2.15, about 2 ctrl from its joint k148, over 84.
- Test: `test/render/gf_gap.test.ts` "K1584 s12: ...". `npm test` is green (260 files, 3257 tests), no pin
  re-frozen, and `npm run build` passes.

**Captures.**
- All 21 mazes, master (m12) and 362a261 (s12a), on port 5631 with the perf lock through
  `scripts/perf_lock.ps1` (taken 18:06:38 after a 706 s wait, released 18:14:41). Both used the s11
  recipe (`run12.ps1`, pinned views).
- Every view line is the same.

**Changes.** 4790 px in 191 places (`chg12.py`, `out/chg12_s12a.txt`):

| Maze | A_3 | A_4 | A_5 | A_6 | A_7 | A_8 | A_9 | A_a | A_b | A_c | A_d | D_4 | D_5 | D_6 | D_8 | D_9 | D_a |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Places | 16 | 16 | 19 | 10 | 14 | 26 | 16 | 23 | 10 | 15 | 13 | 4 | 3 | 1 | 3 | 1 | 1 |

- D_1, D_2, D_3 and D_7 have no change.
- 0 places are unexplained by the 181 changed gap-table runs.
- All 191 are viewed in `out/sheets/all_01..24.png` (`grid12.py`).
- Each one is the same change: master's soft gray fade at a joint crossing becomes a crisp angled cut at the
  3 px margin.
- No border was removed, no lone triangle appeared and no gap was lost. Near-parallel crossings (#90, #98,
  #109, #128, #169) keep a light sliver.
- At acute angles (#140, #164) the cut's corner meets the over at margin distance.

**Counts** (`an12.ps1`, one screen.py run per maze, m12 against s12a, in `out/an_s12a/an.txt`):

| Count | m12 | s12a |
|---|---|---|
| Closed sides | 132 | 132 |
| Part sides | 249 | 251 |
| Gap sides | 29137 | 29135 |
| Loose pieces | 497/14/34/1370 | 497/13/34/1370 |

- **The two sides that moved from gap to part** (`side12.py`, `band12.py` -> `out/sheets/band_gp.png`):
  - A_3 x254 dir -1 lat -1 (place 3 itself): margin-band ink 0.125 -> 0.465.
  - A_9 x320 dir +1 lat +1 (#103): 0.000 -> 0.317.
- In both, a gap remains visible, but the margin-only gap is 1 to 2 light px at the cut's acute corner.
  screen.py samples the band 0.03 to 0.08, which reaches past the 0.07 margin.
- Loose pieces: A_3 loses one 9-40 px piece, the place 3 triangle. None appear.

**Sheets** (`.claude/probes/K1584/s12/out/sheets/`):
- `place3_1.png` (14x, today | master | yours; tracked);
- `place3wide_1.png` (6x);
- `today8_1.png` (eight other places with today's look);
- `band_gp.png`;
- `all_01..24.png`.

**Open: Levi's call.**
- **Gap (this stage):** land 362a261.
- **Whole as today:**
  - Draw a rule-K border whole and joined where its crossing sits within about 2 ctrl of its joint with
    that over. That would drop the gap at those crossings, which needs his OK against "every under-thread
    border at a real crossing keeps its gap".
  - It is a new stage, not a second rule on this one.
- Either way, he may want the two "part" corners widened.
