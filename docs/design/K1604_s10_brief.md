# K1604 stage 10: bake the missing datum (inherited windows on end-chain arcs) and prove it in the CPU probe (rp=gf); no shader change, nothing lands

Read first: `K1604_s9_brief.md` with its `## Handoff (stage 9)` on branch `k1604-s9` (b8ebd464e; your base:
tools in `.claude/probes/K1604/s9/`: `gapmir.mts` the CPU mirror of `lkGap`, `exact.py`, `chk9.py`). Pages,
read only, look at them first: `...\worktrees\k1604-s9\.claude\probes\K1604\s9\out\pages\pg9_rows_1.png`,
`pg9_flecks_1.png`, `pg9_diff_1.png`.

## Known (stage 9, observed by per-pixel readback)

- Every stub Levi marked is border drawn by the END chain E of a T-junction whose through chain is the
  crossing's under U; the junction sits 0.72 to 1.73 along U from the crossing. Master withholds the cut
  because E has no window for that crossing (rows 5, 6, 9), or E's window belongs to another crossing and
  rejects this over (row 7, x292: two overs on one arc).
- A gate keyed to "a junction in this cell" cannot reach it (rows 6 and 9 have none in the cell). With the
  window gate off the cut is decided by depth alone, which cuts chains that are not at a crossing with that
  over: the flecks.
- No table links E's arc near the junction to U's pass. That is the missing datum.

## This stage

1. **Bake inherited windows** in the gap table build (`src/render/gpu_field/tables.ts` or where the windows
   are baked; behind a switch or in a probe copy, your choice): for a crossing whose under U has a
   T-junction within the band's reach along U, the end chain E's arc at that junction, on the edge that
   continues U's edge, inherits a window naming that crossing's over. Allow two overs on one arc (x292).
   Say how the reach, the side and the arc range are chosen, and what is done at sharp junctions.
2. **Prove it in the CPU probe before any shader change.** Feed the baked windows to `gapmir.mts` (the
   mirror), with the rule "a cut needs a window naming the cutting over" (no depth-only path), render
   A_3, A_4, A_6 and score with `chk9.py` against master, pW and stage 9's exm.
   Targets: r2 at or below exm's 353; loose pieces (r4l) at most master's 9; slivers (r4s) at most
   master's 153; border lost (r3) near 0; no new failing crossing that passes on master, or each one listed
   with its cause. Rows 2, 5, 6, 9 pass. Score separately the two hard kinds stage 9 named: borders almost
   parallel to the over, and merged wedges where U's edge and E's edge fuse (rows 7, 12, 17).
3. Fix the probe's flood entering marker ink if you still use the flood.
4. Say exactly what `lkGap` must change to read the datum (lookups, extra fetches, where), so the port is a
   mechanical stage. Do not port it.

Binding for the rule: never remove a thread's border outside a gap; the under pass keeps its width and
heading; tight turns keep today's ball (K1572); K1627's specks stay gone; away from T-junctions near a
crossing nothing changes (the bake adds entries only there).

## Done

1. The bake, with its entry count per maze, and tests for it if it lives in `src/` behind a switch.
2. Checker table: master | pW | exm | yours on A_3, A_4, A_6; then yours against master on all 21 mazes if
   time allows.
3. For Levi, pages `master | yours` (the mirror's output, drawn with the renderer's own fade so it reads as
   the real look, not grey patches), medium then close zoom centred on the changed pixels, under 7000 px
   tall, viewed by you: his nine rows; stage 8's nine fleck places; the 12 largest differences elsewhere;
   and one page of the parallel and merged-wedge cases as they come out, for his two look questions (how a
   near-parallel border should end; where a merged wedge's cut stops).
4. The port list for `lkGap`, and every place still wrong with its kind.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1604-s10`, branch `k1604-s10`, from
`origin/master`; bring tools with `git checkout k1604-s9 -- .claude/probes/K1604` (never merge that branch);
reuse stage 9's captures and frozen states read only. `node_modules` as a directory junction to the main
checkout's (never `npm install`). Write only inside your worktree. Read code through the shell; the Read tool
only just before an Edit, and for images. Any real-time capture under the perf lock (`scripts/perf_lock.ps1`;
read a lock before touching it, never delete another owner's), ports 5690 to 5694; refuse a busy port and
check the listener is your build; kill your servers and probe processes before you stop. Commit WIP at every
milestone (`git add -f` for probe tools, never their outputs). Never push, never bare `git stash`, never edit
LEDGER.md, never touch the phone, no Chrome `--virtual-time-budget`. Helpers on sonnet, mechanical work only;
looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. Order of value if time runs short: the bake and the A_3 score, then the pages. On
stopping: commit WIP, append `## Handoff (stage 10)` here, commit, and report: verdict first (does the datum
give the rule, yes or no, by the scores), page paths, the table, a `Ledger items` list and the handle fields.
