# K1482 stage 8: rp=gf's border faults on Levi's link, the crossing-gap family (Claude agent stage)

Read `### Handoff K1482 s7` in `docs/design/K1482_s7_borders.md` whole, and the bar in
`docs/design/K1482_levi_link_borders.md` (Levi's approved look: at junctions and under-tail ends the over
thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch, sliver, break or stray dash; gf's
border look itself stays as it is, and the Crossing fade keeps acting on the outline as K1492 made it).

**The scoreboard is the sweep**: link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`) at rest, border
look, 327 sites, faulted count by your own eyes on the 4x tiles. Master after stage 7: 41
(`.claude/probes/K1482/out/s7/classes.txt`). 17 of them are this stage's: the look's crossing gap (`lkGap`,
`lkCut`, `gapWindow` in `src/render/gpu_field/gf_look.ts`) cuts the border outline where today's renderer
draws it whole. Dots j2 j88 t1s t24s t46e; ticks j49 j55 j87; stubs j36 t79s; dash t39s; breaks j22 j29 t65s;
pocket t80s; wedge t81s; sliver t70s. Stage 7 showed each one changes when the gap is patched off
(`.claude/probes/K1482/s5/patch/nogap.json`; sheets `out/s7/gap_tiles_00.png`, `rest_tiles_00.png`).

## Not yours

- K1490's 22 sharp-V and notch sites, K1485's short tails, K1470's j71 seam, j64's pinhole: leave them.
- The parked home build (branch `worktree-agent-ad03e8b65a2afa540`): do not cherry-pick it.
- The fill look (`tlk=fill`) and today's renderer: no pixel of either may move.

## Do, in this order

1. **Split the family by cause.** For each of the 17 sites print, at the fragment's pixels, which gap window
   cuts the outline (its crossing or joint, its two ends, the kept fraction) and what today's renderer does
   with the same window (`src/render/ribbon/crossing_gaps.ts`). Stage 7's reading: dots and the dash are
   short islands of outline between two cuts; ticks and stubs are cuts at junction joins, not crossings,
   leaving a faded tip; breaks are cuts where no over thread is visible. Muse's K1502 (Handoff 26H in
   `docs/design/K1464_muse_batch26.md`) names another cause for stubs past a crossing, the surface key order
   with the pin key windows hands-off: tell the two apart at j36, t79s, j49, j55, j87 first, and leave to
   K1502 what is its.
2. **Fix one cause at a time, the largest first**, each its own commit: a count that fails on master (dark
   outline pixels missing against today's renderer in the site's box, or island components), the fix, the
   count passing, 4x tiles today | master gf | tip gf at every link A site whose screen changed, each looked at
   and named. No site clean on master turns faulty.
3. The Crossing fade still works: `.claude/probes/K1492/dragcheck_b.mjs` (border) and
   `.claude/probes/K1458/dragcheck.mjs` (fill) pass; at `fl` 0 and 1.2 the outline at three ordinary crossings
   is unchanged against master.

## Done

- The sweep's faulted count on your tip, by class, by your own eyes, with the class table.
- The fill look: 0 px against master on link A in the same physics hash (fff8c9e5).
- The K1436 bar with `STRICT=1`, once, at the end (`pwsh -NoProfile -File .claude/probes/K1436/k1436_bar.ps1
  -Ref <tip> -Base <your starting commit> -HomeFlag 1 -Scenes ring,def,muse_hash,g41_user_tw64 -Port <p> -Tag
  k1482s8`): no new find, or each one shown at 4x and named; a scene's two captures share a physics hash.
- `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`. If a fetch
  fails, retry a few times, then carry on from what you have.
- Files: `gf_look.ts` (the gap functions and the border composite's use of them), its tests, and the look's
  uniforms in `gf_pass.ts` if a fix needs one. Others at work: Muse batch 26 in the main checkout (the frame
  time on link A, then Run K: the marker gap's fade, also in `gf_look.ts` but in the marker code). Keep the
  diff small, stay out of the marker gap, and rebase on origin/master before the handoff. Do not change any
  file in the main checkout.
- **Time.** The look program compiles for 15-120 s on a cold profile and again after every shader edit: batch
  edits, warm each profile once per link, capture link A with `.claude/probes/K1482/cap.mjs` (its `PATCHF`
  patches the full program without a build, good for trying a rule before writing it), and keep the last 35
  minutes for the bar, the hold check and the handoff.
- **Memory and disk.** One Chrome at a time, at most two preview builds (`scripts/preview.ps1 -Port <p> -Ref
  <commit>`; it needs the worktree's node_modules complete), profiles under `$env:TEMP\k1482s8-*`, each
  deleted as soon as you are done with it. Before each build or Chrome launch wait in ONE blocking loop (15
  minutes at most) while `FreeVirtualMemory` is under 3 GB or `(Get-PSDrive C).Free` is under 8 GB.
- Captures of one build differ load to load by tens of thousands of 1-2 level pixels: compare frames in the
  same physics hash and count dark-ink pixels in a site's box, not whole-frame differences.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5760-5779. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock (Muse may hold it; its run does not stop yours).
- Commit WIP at every milestone, broken or not. Stage probe files with `git add -f` on the exact files or on
  your own new directories `.claude/probes/K1482/s8` and `.claude/probes/K1482/out/s8`, never on
  `.claude/probes` as a whole, and never raw frames. Never push. Never edit LEDGER.md. Never use bare
  `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried and
  why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1482 s8` here, commit, and report: the sweep's faulted count by class, the sheets' paths (each
site named), the numbers, which commits are confirmed on screen, a `Ledger items` list and K1482's handle
fields.
