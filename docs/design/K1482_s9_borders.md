# K1482 stage 9: rp=gf's border faults on Levi's link, the cut beside a fused joint (Claude agent stage)

Read `### Handoff K1482 s8` in `docs/design/K1482_s8_borders.md` whole, and the bar in
`docs/design/K1482_levi_link_borders.md` (Levi's approved look: at junctions and under-tail ends the over
thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch, sliver, break or stray dash; gf's
border look itself stays as it is, and the Crossing fade keeps acting on the outline as K1492 made it).

**The scoreboard is the sweep**: link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`) at rest, border
look, 327 sites, faulted count by your own eyes on the 4x tiles. Master after stage 8: 36
(`.claude/probes/K1482/out/s8/classes_tip.txt`). 12 are this stage's, stage 8's cause B: at a crossing 0.45 to
1.4 arc units from a fused joint the look's gap cuts the under arm's outline back and leaves a detached,
faded tip at the joint, where today's renderer draws the outline whole. Ticks j49, j55, j87; stubs j36, t79s;
breaks j22, j29, t65s; pocket t80s; wedge t81s; sliver t70s; dot j88. Turning the gap off joins every one
(`out/s8/b_look3.png`, `b_a.png`, `b_b.png`). 156 of link A's 350 crossings lie within 1.5 arc units of a
joint, so "no cut near a joint" is not the rule.

## Not yours

- K1490's 22 sharp-V and notch sites, K1485's short tails, K1470's j71 seam, j64's pinhole and speck: leave them.
- The parked home build (branch `worktree-agent-ad03e8b65a2afa540`): do not cherry-pick it.
- The fill look (`tlk=fill`) and today's renderer: no pixel of either may move. Stage 8 split `lkGap`'s
  result in two for this (the outline's cut, the coverage's cut): a rule here goes in the outline's cut only.

## Do, in this order

1. **Find what today's renderer does differently at these 12.** For j49, j87, j55, j36 and t79s first print,
   at the detached tip's pixels: the window that cuts (its crossing, its two ends, the kept fraction), the
   arc distance from the window's near end to the joint, and what `src/render/ribbon/crossing_gaps.ts` and the
   junction joinery do with the same stretch (does today's gap end at the joint room, does the fused joint's
   fan paint over it, or is the outline there another piece's). Name the difference in the code before
   writing a rule; the 144 near-joint crossings that are clean on master are the control (print the same
   numbers for ten of them and say what separates the two groups).
2. **Fix it as a border-only rule**, the five first, then the other seven, each cause its own commit: a
   count that fails on master (outline ink missing against today's renderer in the site's box, or detached
   components), the fix, the count passing, 4x tiles today | master gf | tip gf at every link A site whose
   screen changed, each looked at and named. No site clean on master turns faulty.
3. The Crossing fade still works: `.claude/probes/K1492/dragcheck_b.mjs` (border; stage 8 did not re-run it
   on its last build, so run it on master first) and `.claude/probes/K1458/dragcheck.mjs` (fill) pass; at
   `fl` 0 and 1.2 the outline at three ordinary crossings away from any joint is unchanged against master.

## Done

- The sweep's faulted count on your tip, by class, by your own eyes, with the class table.
- The fill look: 0 px against master on link A in the same physics hash (fff8c9e5).
- The K1436 bar with `STRICT=1`, once, at the end, as stage 8 ran it (`-Tag k1482s9`; if it waits on the perf
  lock, use `.claude/probes/K1482/s8/bar_ref.ps1`): no new find, or each one shown at 4x and named.
- `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`. If a fetch
  fails, retry a few times, then carry on from what you have. `npm test` and `scripts/preview.ps1` need the
  worktree's `node_modules` (a junction to the main checkout's; remove the junction, never its target, when
  you finish).
- Files: `gf_look.ts` (the gap functions and the border composite's use of them), its tests, and the look's
  uniforms in `gf_pass.ts` if a fix needs one. Others at work: Muse batch 26 in the main checkout (Run K: the
  marker gap's fade, in `gf_look.ts`'s marker code; then Run L in `tables.ts`; then Run M, the baked gap
  window sides and a speck at j64, in `gf_look.ts`). Keep the diff small, stay out of the marker gap and the
  window bake, and rebase on origin/master before the handoff. Do not change any file in the main checkout.
- **Time.** The look program compiles for 15-120 s on a cold profile and again after every shader edit: batch
  edits, warm each profile once per link, capture link A with `.claude/probes/K1482/cap.mjs` (its `PATCHF`
  patches the full program without a build; its first shot can come before the view settles, so take a
  second), reuse stage 8's probes in `.claude/probes/K1482/s8/`, and keep the last 35 minutes for the bar,
  the hold check and the handoff.
- **Memory and disk.** One Chrome at a time, at most two preview builds, profiles under
  `$env:TEMP\k1482s9-*`, each deleted as soon as you are done with it. Before each build or Chrome launch
  wait in ONE blocking loop (15 minutes at most) while `FreeVirtualMemory` is under 3 GB or
  `(Get-PSDrive C).Free` is under 8 GB.
- Captures of one build differ load to load by tens of thousands of 1-2 level pixels: compare frames in the
  same physics hash and count dark-ink pixels in a site's box, not whole-frame differences.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5780-5799. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock.
- Commit WIP at every milestone, broken or not. Stage probe files with `git add -f` on the exact files or on
  your own new directories `.claude/probes/K1482/s9` and `.claude/probes/K1482/out/s9`, never on
  `.claude/probes` as a whole, and never raw frames. Never push. Never edit LEDGER.md. Never use bare
  `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried and
  why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1482 s9` here, commit, and report: the sweep's faulted count by class, the sheets' paths (each
site named), the numbers, which commits are confirmed on screen, a `Ledger items` list and K1482's handle
fields.
