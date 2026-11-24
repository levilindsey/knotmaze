# K1584: crossing gaps under rp=gf (stage 1)

**Levi, 2026-11-23, on review tile A_3 b1 (rp=gf gfh=1):** "All over the maze we are missing gaps at an
extremely high frequency."

## The look to reach

At every crossing the under thread stops short of the over thread on both sides: its two border lines end
before the over thread's border, with clear ground between, so the eye reads over and under at a glance. The
fade ramp (K1423, K1492) is how a border ends; a border that runs into the over thread's border, or a fade that
ends touching it, is the fault. Binding rules: the under pass keeps its width and heading; never remove a
thread's border anywhere else; never trade a hook for a point; do not move gf's border strokes toward today's
ribbon renderer and do not use it as a bar.

You own the technique. The goal is the look above on the test mazes, not a number.

## What is known (check it, do not trust it)

- Muse run 27Z8 (`### Handoff 27Z8` in `docs/design/K1531_muse_batch27.md`, tools in `.claude/probes/K1584/`)
  counted 12,634 of 14,902 crossing sides with no gap on the 21 mazes, and found 602 of A_3's 700 already so on
  Nov 17 (7c739b425); the s18 merge 905abef19 added 45 on D_1. So this is mostly not a recent regression.
- The coordinator doubts the census rule: its ray starts looking for ink 0.01 world outside the over thread's
  half width, where the over thread's own border stroke sits, and no crossing on A_3 reads a gap on both sides.
  A sheet of eight of its no-gap crossings showed some with a visible fade and some with borders butting
  straight in. Build your own check, preferably from the renderer's own numbers (`eval.ts`, the CPU mirror)
  instead of pixels: per crossing side, where the under border's ink ends and how far that is from the over
  border.
- A_3's link values: thread width 0.80, casing 0.88, fade length 0.14, gap margin 0.07 world (about 3 px in a
  3200 px frame). If the gap is that small by construction, say so: then the fault is the size the look rule
  gives, not lost gaps, and the fix is the rule.

## This stage

1. Find why borders reach the over thread: which code paths decide a side's cut and fade, and for A_3 how many
   sides take each path (plain, fused joint arm, near a junction or tail, self crossing of a kink loop).
2. Fix it in `src/render/gpu_field/` so every crossing side shows the gap. Keep `gf_glsl.ts` and its CPU mirror
   in step.
3. Look at it yourself: before and after crops at a size where the gap is plain to see, at least 30 crossings
   on each of A_3, A_8 and D_1 spread over the four kinds, and whole-frame checks on all 21 mazes for anything
   else that moved (K1578 recipe; `scripts/perf_lock.ps1` around captures; never Chrome's
   --virtual-time-budget). Save sheets under `.claude/probes/K1584/s1/` (untracked) and name them in the
   handoff. A_3 b1's top-left quarter must be one of the sheets: it is the tile Levi named.
4. `npm test` green. Do not push and do not land: commit on your branch. The coordinator views the sheets,
   runs the guards and shows Levi.

Not this stage: junction stubs (K1585), the eye loop's border gap (K1586), the single shared border (K1587).
Note any you see change, for better or worse.

## Stop rule

Stop when the stage is done or 2 hours after your start (`Get-Date` at the start and at each milestone),
whichever comes first; then commit WIP (broken or not), append a handoff to this file (what you found, what
changed, the sheets, what is left) and report. A compaction is not a stop: re-read this brief and `git log`.
Read code through the shell (`Select-String`, ranges of `Get-Content`); the Read tool only just before an Edit.
No ledger edits: end your report with a `Ledger items` list. Helpers, if any, run on sonnet for mechanical work
only and follow this stop rule.
