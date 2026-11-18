# K1464: Muse batch 26, rp=gf on an ordinary load (2026-11-17)

Four runs (tags 26A-26D), started by Claude through Paseo with the K1053 chain, one after another in the main
checkout. Batch 25's rules (`docs/design/K1448_muse_batch25.md`, its first list), batch 24's How to work
(`docs/design/K1418_muse_batch24.md`) and batch 23's hold in full, with these changes:

- Your tag is `26<X>`; commit messages end `(Muse batch 26 Run <X>, 26<X>)`; append `### Handoff 26<X>`
  under your run's section here.
- **Hands off the junction field**: `tables.ts`, `eval.ts`, `gf_keys.ts` and the field evaluation in
  `gf_glsl.ts`. A Claude agent (K1451 s2) is changing them, flag off and on, and its merge moves the tables
  digest and the flag-off pins: after a pull, re-take your "master gf" baseline from the new master.
- Leave K1464, K1451 and K1460 open.
- **Every run's Done list ends with the ordinary-load guards** (Levi found a blink and a dead slider that
  every forced-frame probe had missed): on a build of your commit (`preview.ps1 -Ref`), one profileDir kept
  across runs, `node .claude/probes/K1450/hold.mjs <url> <outDir> <profileDir> 60 250 5000` passes on
  `?3&xp=off&am=instant&rp=gf` and `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (no `prp=off`, no
  `snd=none`, no frame-forcing hooks), and `.claude/probes/K1458/dragcheck.mjs` passes for gf and gfh (the
  Crossing fade slider still moves the fade; Handoff K1458 in `docs/design/K1458_gf_crossing_fade.md`).
- **A pixel count is never the whole bar.** 25B met its ink count by deleting thread runs and was reverted.
  Each run below has a per-feature guard beside its counts; look at your 4x crops next to today's and write
  down what you see at each, including what is worse.
- Crops at 4x go under `.claude/probes/<ID>/out/26<X>/` (today | master gf | new gf).
- Each run is a fix run with a stop line of 2 h. If the bar is not met at the stop line, land what is a real
  fix (0 px elsewhere), and write in the handoff what you measured, what you tried and why each fell short.

## Run A (26A): K1456, rp=gf's cold first load

A new build's first rp=gf load shows no maze for about a minute on the desktop (58-71 s to the first composite
on a warm profile after a deploy; 115 s and a 105 s main-thread block on a fresh profile; Levi's link blocks
38 s and 29 s more when the reveal's variants compile). Read ledger K1456, K1452 and Handoff K1450's "Cold
compile" (`docs/design/K1450_gf_blink.md`; probe `.claude/probes/K1450/cold.mjs`). Its order: (1)
KHR_parallel_shader_compile, polling COMPLETION_STATUS_KHR, with today's renderer drawing until gf's programs
are ready; (2) compile only the program the first frame routes to, the others on demand or idle; (3) smaller
programs. Files: `gf_pass.ts`, `gf_app.ts`, `gf_split.ts`, `gf_reveal.ts`.

**Done:** 1. Fresh profile, `?3&xp=off&am=instant&rp=gf` and `?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1` (through the
end of its reveal): the longest main-thread block under 3 s (baseline 105 s), and `hold.mjs` with waitMs 5000
passes from the fresh profile (the maze is on screen in every frame while gf compiles, and across the switch
to gf). 2. Time to the first gf composite reported for both, no longer than baseline. 3. Warm profile: first
gf composite within 2 s, and 0 px against master gf once gf draws. 4. `npm test` green. 5. The guards.

## Run B (26B): K1459, the reveal's ink at junctions, per thread

Read ledger K1459, Handoff 25B (its mechanism stands: today hands the fill to the fan rim inside the junction
cut; its implementation is reverted in 0a4482e9) and Handoff 24I. Files: `gf_look.ts`, `gf_reveal.ts`,
`gf_app.ts`.

**Done:** 1. Per-thread guard, burn and trace-rainbow on `b.FMKB4DIQ`'s sheet frames: every partly revealed
run today draws is drawn by gf (no run missing), with the stroke width within 1 px of today's at three
stations per run. Build this check first and show that it fails on b42188db. 2. gf's ink pixels within 15% of
today's in every frame; the ghost under the measured floor plus 1%. 3. `am=instant` 0 px against master gf
(a sheet-based check, not the pin recipe). 4. Crops of the two spots of ledger K1459. 5. `npm test` green.
6. The guards.

## Run C (26C): K1424, the route bands by fan membership

Read ledger K1424 and Handoff 25C. Its next angle: bake junction identity beside the tables (as
`GfExploreTable` bakes pieces) so suppression and bands act on fan pixels exactly. New in 25C and yours to
remove: at ji0 gf draws a yellow tick on the fan's left edge and a dull patch at the junction centre
(`.claude/probes/K1414/out/25C/crop_ji0.png`, right tile). Files: `gf_look.ts`, `gf_pass.ts`, `gf_app.ts`.

**Done:** 1. On 24F's state (seed 7 walk): the same-state band mask within 15% of today's count and IoU at
least 0.7 overall; each of the 8 routed junctions within 25% and IoU at least 0.6. 2. Per-junction guard: no
gf-only connected component over 12 px and no today-only component over 12 px at any routed junction (the
ji0 tick and patch, ji80's purple centre). 3. 0 px against master gf with no route showing. 4. Crops per
junction. 5. `npm test` green. 6. The guards.

## Run D (26D): K1454, a pluck ripple bends the threads under rp=gf

(This run was K1455, the border look's strokes. Levi, 2026-11-17: "Keep gf as it is". gf's border strokes
stay; do not move them toward today's.)

Under rp=gf a pluck ripple (K279, `pluck_ripple.ts`) draws over the maze instead of refracting the threads:
K1450's blink fix draws the maze to the screen past the ripple's filter, so the maze is not in the filter's
texture. Read ledger K1454, the "While a pluck ripple lives" paragraph of `.claude/rules/render-gpu-field.md` and Handoff K1450
(`docs/design/K1450_gf_blink.md`): the full fix composites into the filter texture through Pixi's projection.
Files: the composite shaders in `gf_pass.ts` / `gf_look.ts`, `gf_app.ts`.

**Done:** 1. A probe that plucks one fixed thread point on `?3&xp=off&am=instant` and captures the frame at
three ripple ages, today and gf on the same physics state, plus the same state with `prp=off`. The displaced
mask (pixels that differ from the `prp=off` frame by more than the two-load floor): gf's within 25% of
today's count and IoU at least 0.6 at each age; on master gf it fails (show the numbers). 2. The blink must
not come back: `hold.mjs` 60/60 on both links with the ripple on and music mode's auto plucks running, and
`DRAG=1` (Handoff K1450). 3. With no ripple live, 0 px against master gf. 4. 4x crops of the ring at each
age (today | master gf | new gf). 5. `npm test` green. 6. The guards.
