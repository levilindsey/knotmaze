# Muse batch 22, Run O: what the crossing-gap mask draws inside the junctions (K1218, K1219)

Ledger: K1208 (batch 22); the items K1218 and K1219. Chain tag 22O; ports 5980-5989. One Muse run
in the main checkout on master. Probes only: nothing in `src/` or `test/` is committed.

## Why

Levi, 2026-11-05 (K1211): "These junctions need to appear as though they are one whole fused
seamless unit." K1211 S2 (`docs/design/K1211_s2_gold_edge.md`, its Handoff) left three flaws on
master that the crossing-gap mask draws, not the junction's light:

- **K1218, the zigzags.** Straight zigzags in the walked gold at the T (loop ji 89) and the four
  (loop ji 12, loop ji 88). They are the same with no pulse bands, with no light at all and with
  the fan meshes hidden, and gone with the mask off (`maskEnabled = false`). S2 inferred from its
  crops that the fan is hidden inside a crossing over thread's silhouette there, and that what
  shows is that ribbon's own paint, split gold/untraveled straight across the ribbon at the
  joint. It did not identify the slot.
- **K1219, the triangle and the notch.** Loop ji 12's small dark triangle (in the pure colours
  shot too, bigger with the fans hidden, gone with the mask off), and x4 ji 149's small teal
  notch where the gold meets the dark crossing.

A fix needs to know which gap slot draws each, which ribbon's paint shows through it, and why the
paint splits there. This run answers that with shots, crops, numbers and code locations. It
fixes nothing.

## Read first

- Batch 22's How to work (`docs/design/K1208_muse_batch22.md`) and the pages it sends you to.
- `.claude/rules/probes.md`.
- The items (`node $HOME/Repositories/claude-config/tools/ledger.mjs show K1218 K1219 --repo .`)
  and S2's Handoff (Select-String `^## Handoff` in its brief; Task 0's note and the residuals).
- S2's tools, to copy from (never edit them): `.claude/probes/K1211/shoot2.mjs` (the `loop` and
  `x4` stands with their walks, the pinned clocks, and the `nomask`, `w0`, `pure` and `bg`
  shots), `run_shots2.ps1`, `crops2.mjs`, `lib.mjs`.
- S2's crops `rest_T.png`, `rest_four.png` and `rest_149.png`, in its kept worktree
  (`.claude/worktrees/agent-a39ebdc1635ca98dc/.claude/probes/K1211/out2/t4/`, read only).
- The headers of `src/render/gap_mask.ts`, `src/render/ribbon/crossing_gaps.ts` and
  `src/render/junction_field.ts`.

## Tasks

1. **Shots.** S2's `loop` and `x4` stands after their walks, at S2's size and dsf, at rest
   (phase 0, look 0). Name master's sha once. Shoot what `shoot2.mjs` shoots (live, `w0`, `np`,
   `pure`, `nomask`, `bg`), in real time (never `--virtual-time-budget`), under the perf lock
   (`$env:TEMP\claude-perf.lock`, owner `K1218-O`). Crop loop ji 89, 12 and 88 and x4 ji 149 at
   1:1 and at 3x.
2. **The slots.** For each spot, name the gap slot or slots whose footprint covers it: the
   crossing, its over and under threads, and the slot's shape there. Read the slot table through
   a probe hook, or a probe-only edit to `src/` that you restore before committing (say which).
   Draw each slot's footprint as an outline over the 3x crop.
3. **The zigzags.** For each zigzag: its segments (count, angle and length in device px); which
   ribbon's paint shows through the slot; where that ribbon's gold/untraveled split sits along it
   (sample index or ctrl from the junction); and why the split sits at the joint (name the code
   that places it, file:line and a one-line quote). Prove the attribution with one change that
   moves the zigzag in a shot, the same way as in task 2.
4. **The triangle and the notch.** The colour of their pixels, and the layer each takes it from
   (the gap's under-shadow, the background, an arm's untraveled paint, or something else), with
   the code that draws it (file:line and a one-line quote), proved the same way.
5. **What a fix would take.** A few sentences per flaw, for a junction that reads as one fused
   unit: for instance the mask leaving a junction's footprint alone, the slot showing the
   junction's own paint, or the ribbon's split following the gold's round edge; which files,
   what data the shader would need, and what else would move (the pins in `test/`, `k320_slim`,
   crossings away from junctions). No fix.

Looks stay with Claude: put each crop in the table and say what you measured, never whether it
looks right.

## Record

`.claude/probes/K1218/run_o/`: the scripts and `SUMMARY.md`: a table with a row per spot (stand,
master's sha, the slot, the ribbon whose paint shows, the numbers, the crops), then the code
locations and task 5. Crops tracked with `git add -f` (PNG, at most 30, each under 300 KB);
larger outputs stay untracked.

## Done and close

Done when every spot has a row and tasks 2-5 name their code, and `git status` shows nothing
changed in `src/` or `test/`. Commit message:
`K1218, K1219: what the crossing-gap mask draws inside the junctions (Muse batch 22 Run O, 22O)`.
Pull with rebase and autostash, then push to master (probes only, so nothing deploys). Leave the
ledger to Claude.

## Report

Plain words: master's sha; per spot the slot, the ribbon whose paint shows and the numbers; what
places the split and what draws the triangle and the notch (file:line); what a fix would take;
anything that stopped you; `Ledger items`.
