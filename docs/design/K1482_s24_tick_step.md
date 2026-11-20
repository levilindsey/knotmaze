# K1482 stage 24: the outline takes its fill's corner at t81s and t4s (K1527; Claude agent stage)

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** His bar: at junctions and
under-tail ends the over thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.
Of the 14 sites he named on link A (`The sites` in `docs/design/K1482_s20_wedges_notches.md`), one is
finished, and only behind a switch: stage 23 (`docs/design/K1482_s23_corner_switch.md`) put stage 22's second
corner try on master as `gfk=1`, off by default, until Levi answers K1524.

This stage takes **t81s's tick and t4s's step**. Stage 22 (`### Handoff K1482 s22` in
`docs/design/K1482_s22_landable_corners.md`: read it whole, `Kind 2` twice) found that t81s's tick is not the
crossing cut stage 21 took it for: at 6x the fill's edge turns a corner there, and the ink follows the rising
part and ends square instead of taking that corner. Five probes on `lkCut` left the tick as it was; dropping
the s8 slot rule moved it and opened a new gap. Its patches, `notes.md` and 6x crops are in
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adabb55bc67661562\.claude\probes\K1482\s22` and
`...\out\s22` (`v_t81s_*.png`): read `notes.md` first and do not repeat those probes.

Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5). The border look draws the
outlines; `&tlk=fill` the fill.

## The goal

On link A, with the switch off and with it on: **the tick at the top of t81s and the step at the bottom of
t4s are gone**. The outline lies on the edge of its own fill through the corner (the fill look at the same
place shows where that edge goes), and no dot, stub, wedge, tick, notch, sliver or gap appears anywhere else.
You own the technique. The cause is not the finish line: a stage that ends with a diagnosis and nothing in
`src/` has not reached the goal while time remains.

## Do

1. `git merge origin/master` in your worktree first (stage 23's switch must be there: `gfk` in
   `src/render/gpu_field/`; if it is not, stop and report).
2. Trace t81s's tick: at points along the fill's edge through the corner, list what the mirror (`eval.ts`)
   gives for every term (each chain's side distances, the corner terms, home, the cuts, the slots), which
   term the fill takes and which the ink takes, and where the two part.
3. Fix it so the ink takes the corner its fill takes. This is a fault Levi named, so the fix is the
   **default** (not behind `gfk`), and it holds with `gfk=1` too.
4. t4s's step: the same trace. If it is the same class, the same fix covers it. If not, say what it is and
   fix it in the time left.
5. Every place the fix moves, on link A and on the bar's four mazes, goes on a sheet (the surrounding threads
   with a red box, then the box closer; today | new), and you judge each by eye: a clean place that changes
   is a regression to remove, a fault of the same kind that goes away is a gain to list.

## Done

- **By eye**, t81s and t4s, context crop and detail crop, today | new, switch off and switch on.
- **Link A**, loads of one state and one view (pin the background clock; stage 21's handoff, `The 76,609 px
  fill difference`, in `docs/design/K1482_s21_corners_rest.md`; report the floor first): every place outside
  the two sites where the border look changes is on the sheet and explained; the fill look 0 px, or each
  place named.
- **The bar** on your tip: `.claude/probes/K1436/k1436_bar.ps1`, `STRICT=1 -NoPerfLock`, scenes
  `ring,def,muse_hash,g41_user_tw64`, `-Base` origin/master's SHA, `-Tag k1482s24`: new 0 and grown 0; each
  gone find shown as a fault the fix removed.
- Under the perf lock on your tip: `hold.mjs` 60/60 on link A; `.claude/probes/K1482/s15/panelopen.mjs`; both
  dragchecks; `npm test` green (a pin that moves is re-frozen in the same commit and named in its message).
- Three or four lines of lore in `.claude/rules/render-gpu-field.md`: what owned the corner and what the ink
  took.
- The commits on your branch, in landing order, each green.

## How to work

As stage 22's `How to work` (and the one in `docs/design/K1482_s20_wedges_notches.md` it points to), with
these changes: ports 6090-6109, profiles `$env:TEMP\k1482s24-*`, probe directories `.claude/probes/K1482/s24`
and `.claude/probes/K1482/out/s24` (untracked: do not `git add` raw captures or dumps). Copy what you use
from the s22 worktree and change nothing there. At most three preview builds alive at once; stop yours and
remove their directories when you finish (the disk is short); a worktree needs `node_modules` through a
junction for `scripts/preview.ps1`, unlinked with `(Get-Item <path>).Delete()` when you finish. Muse runs
capture work in the main checkout and holds the perf lock for up to 25 minutes at a time. **Take the lock only
through `scripts/perf_lock.ps1`** (K1533): `pwsh scripts/perf_lock.ps1 -Owner "claude K1482 s24" -What "<what>"
-Cmd "<one command that runs the whole guard sequence>"`; it waits (60 min by default), takes the lock, runs
the command and releases it. Never write or remove `$env:TEMP\claude-perf.lock` yourself. If it exits 3 (the
lock never freed), report the guards as not run; do not run them without the lock. Stage 23's four guards
(hold off and on, panelopen, both dragchecks) did not run before it landed; the coordinator runs them on
master, so if one fails on your tip, run it on your merge base too before calling it yours
(`.claude/probes/K1482/s23/run23.ps1` in the s23 worktree, `agent-a5016731195d015ff`, is the whole sequence).
Later today Muse's run 26Z2 edits `gf_look.ts` or
`gf_pass.ts` on master: `git merge origin/master` again before your final checks.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; keep the last 30 minutes for the checks. A compaction is not a
stop: re-read this brief and `git log`. On stopping: commit WIP, append `### Handoff K1482 s24` here, commit,
and report: the commits to land by SHA in order, the numbers, the sheets' absolute paths, a `Ledger items`
list and K1482's handle fields. Never push, never edit `LEDGER.md`.

### Handoff K1482 s24 (final, 17:00): nothing lands in src; t81s and t4s stay open

Outcome. The dN reach gate (83708a88a) removed t81s's tick, switch off and on, but it opened the outline at about
270 joint corners of link A (border look, gf_b2 against master's: 3902 px removed at 274 places, luminance step > 6,
nothing added; 678 px at a step > 12; the same 678 px with gfk=1; fill 150 px off and 0 px on, the load floor).
At j63, j15, j148 and t57e an arm's outline now fades out before the joint's outline it should meet (the s18
failure again). 9b98e47b0 backs it out: src and tests equal master, so no bar or perf guard was run.
- Why the gate failed: the flags that hold those corners have dN 0.2-0.75, which overlaps t81s's (0.39-0.59). The
  over thread's membership (dM finite or none) does not separate them either, and neither does an offset-fold
  proxy (q nearer than 0.9 of the offset to another under sample; it is true for 3436 of the 9631 flags, and j63 and
  j64 are among them). So the 16:40 note's "s18 sites dN >= 0.68" held only at the sites s18 tested.
- What t81s is (`.claude/probes/K1482/out/s24/t81s_flags_gf_fill.png`): chain 45's spine makes a sharp V bend at
  k 355-360, and its +1 side is the bend's INNER side. The +1 outline points run down the pink V edge, pile up at
  the V tip (903-906, 1128-1135; k 355-364 within 3 px of each other) and then run along purple's upper edge. The
  under rule flags k 348-367 there. The tick is the inner corner of chain 45's own bend at the V tip, where its
  outline meets the over thread's band. It is not a crossing-proper effect.
- Next idea (untested): the tick may be the RADIAL STEP where a side's flag changes between neighbouring slots
  inside the over thread's reach. The cut contour jumps there from fh + 0.3 fd to fh + mg + fd. To test it, log
  every slot's bits for crossing 9 (both sides, both rules) and plot them on the crop. If that is the cause, the fix
  is to blend the reach across the change, not to remove the flag. Any such change must be diffed over the whole of
  link A against master's gf_b2 (the floor is 1063 px, 764 of them at j160/j39): the gate's damage was invisible at
  the two sites.
- t4s (unchanged by the gate): chain 4's arm extension end v0 sits on chain 66's spine. Its disc partly buries
  chain 66's -1 band through that side's swallowtail outline points (self-burial is off), which leaves the step and
  the hole at (2177,634). Options:
  - (a) In eval.ts's burial loop and gf_glsl.ts's copy, ignore another piece's burial where its pieceD < h - 2aa at
    a point the piece's own fold covers. The GLSL loop text is regex-transformed (zBur, burialExit, burialOrder), so
    keep the loop's text shape.
  - (b) Pull the extension end off the bar's spine by W + 2aa. This is broad.

- t81s: chain 45's +1 outline pokes across the 9-over-45 crossing gap. gapJointFlags' s18 UNDER rule flags slots `9:45:*:+1` (chain 45's group-103 home samples lie within reach of q), so lkGap gives that side the short joint cut and the outline ends square against chain 9's band. With the under rule off (`__k15.u24=1`) the tick goes and the outline ends along the fill edge, but the under rule moves 399 places (4749 px, luminance step > 6, floor 1063 px of which 764 at j160/j39), so it cannot go wholesale.
- (16:40 notes, kept as written; superseded by the final notes above.) Discriminator: dN (q to the over chain's nearest non-member sample). t81s's flags have dN 0.45-0.50 (q inside the over thread's own cut reach fh+mg+fd = 0.61); the s18 sites have dN >= 0.68. Trying: the under rule only when dN >= reach (`__k15.dn=-1`, WIP knob in gf_look.ts). WRONG over the whole link: see above.
- t4s is NOT the under-rule class (the u24=1 capture leaves it unchanged). It is chain 4's start (a T on chain 66, group 12): the bottom reflex corner (about 2178.5,639.5 device) has no corner record (only k11, the top one, r 0); the ink there is chain 66's -1 side plus a vertex cap 6/4/66, and the band's inner edge should be a radius-W arc but has a hole at (2177,634) (side term ink 0.03 at h-d 0.108 < W) and extra ink at (2176,633).
- Tools: `.claude/probes/K1482/s24/` (cap24.ps1, card24.py sheets, inkd24.py diffs with a luminance step, geo24.ts mirror terms). Outputs: `.claude/probes/K1482/out/s24/`.
