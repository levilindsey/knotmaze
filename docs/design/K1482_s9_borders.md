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

### Handoff K1482 s9

Stopped 2026-11-18 about 13:55 (started 12:44), with the cause still open. No source change: `git diff origin/master HEAD -- src` is empty, so no fix commit, no 4x fix sheets, and the dragchecks were not run (nothing to check).

**Done list**
- The sweep: 36 on link A, unchanged from s8 (`out/s8/classes_tip.txt`).
  - By class: wedge 10, notch 9, sliver 6, tick 3, break 3, dot 2, stub 2, pocket 1.
  - The 12 cause-B sites, as the brief lists them: ticks j49 j55 j87; stubs j36 t79s; breaks j22 j29 t65s; pocket t80s; wedge t81s; sliver t70s; dot j88.
- Fill look: 0 px against master by construction (no src diff). Hash fff8c9e5.
- `hold.mjs`: 60/60 warm on link A (`out/s9/hold.txt`; edges min 7076, max 8569).
- K1436 bar, STRICT=1, tag k1482s9: **PASS** (new 0, grown 0, gone 0) (`out/s9/bar.txt`).
  - Muse 26K's perf lock was stale, so the bar went on and bar_ref.ps1 was not needed.
  - Scene g41_user_tw64 settled to a different hash in each half, so its screen finds may move. That noise is not from this branch.
- `npm test`: green (254 files, 3174 tests).

**Step 1: what was measured (`s9/`, `out/s9/`)**

The probes:
- `xpos9.ts`: each crossing's window, the under and over joint arcs, and caps.
- `rmall.py`: the outline pixels gf's gap removes on master, measured against the s8 nogap patch.
- `jdist.ts`: those pixels' distance to the nearest joint, the over arc to its joint, and the third-thread room d3.
- `tday.py`, `miss9.py`, `ov9.py`: today's frame against master gf.

Everything was compared in one state: hash fff8c9e5, with an identical toDevA in both sites files. Local alignment found a shift of (0, 0) at every site.

What did NOT separate the 12 cause-B crossings from the near-joint controls (x9, x72, x59, x273, x182, x318):
- the over chain's joint arc (both groups sit at about 0.5-0.9);
- today's over caps;
- the distance from removed pixels to the joint (dJ, median 0.57-1.22 against 0.56-0.69);
- the third-thread room d3;
- 5x crops (both groups show the ordinary T gap).

E3, a patch that drops lkGap's N branch from x, barely changed the removed pixels.

The removed pixels sit in the over's margin and fade band (dO 0.46-0.66, dU 0.28-0.40), 0.4-0.7 arc along the under. That is inside gf's window (±1.0-1.3) and today's chainCuts (±0.85-1.05), but outside today's underWindows (±0.44-0.56).

**Today's frame**
- `out/s8/m/today.png` has a textured backdrop and section-coloured outlines, so `out/s9/today_at_removed.txt` (rb > 0) is **invalid** as a today-ink measure.
- A bg=none&cs=mono today shot was taken instead, in the same hash (raw, untracked: `out/s9/raw/tbn/`; cap9.ps1 `-Query "...&bg=none&cs=mono" -Env "GF=0,TODAY=1"`).
- With it, `out/s9/tday.txt` shows today inks only 0.16 of the removed pixels at the 12 crossings, against 0.26 at 90 other near-joint crossings. So the pixels rmall attributes to these crossings are mostly not outline that today keeps.
- **The crossing assignment is probably wrong.** For example, x235 (j87): its under chain's joint is 5.91 arc away, and only the over's joint is near.
- s8's text says the faulted outline is the arm "whose outline ends at the joint". That arm passes through the joint as one of its arms.

**Sheets**

`out/s9/b_today_tbn.png`: today | gf at 4x, all 12 sites.

`out/s9/b_ov_a.png` (j49 j55 j87 j36 t79s j22) and `out/s9/b_ov_b.png` (j29 t65s t80s t81s t70s j88) overlay the two frames at 3x, in 80 px boxes:
- **grey** = gf-only ink: mostly the fused joints' corner outlines, which today does not draw dark;
- **magenta** = today-only outline: long runs at j49, j55, j36 and t70s, where gf ends the arm;
- **green** = both.

`miss9.py` counts the magenta pixels per site, but it does not separate the sites from the controls.
- At D=7: cause-B mean 12.8, against j50 at 103 and j24 at 53; across all sites the median is 0 and p90 is 86.
- Today's strokes also sit 1-3 px off gf's in many places, which adds magenta that is not a fault.

**Next (stage 10)**
1. Build the step-2 count from detached components, not missing ink:
   - in the bg=none&cs=mono pair, take the magenta runs at least 15 px long that continue a green outline;
   - that is, today's outline running on where gf's stops.
2. From `b_ov_*.png`, name per site which arm the magenta run belongs to, and which crossing's window cuts it there. Read `__knotGf`'s window table at that point, not rmall's nearest crossing.
3. Then write the x-lane rule. If it needs the over chain's joint arc, that goes in the slot table, which is the bake (Run M's area): ask the coordinator first.

**Leftovers for the ledger**
- The s8 copy of cap.mjs dies with `__knotGf is not defined` (cap.mjs:105) on a today-only shoot, after writing today.png (`out/s9/raw/s8/m/cap.err`). cap9.ps1's GF=0,TODAY=1 run completed.
