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
It grew with the look: after 5e3b6944 (25C's route bands, +374 lines in `gf_look.ts`) the live page's first
gf composite came at 158 s on a warm profile (`hold.mjs`, coordinator, 2026-11-17 12:15), so take your
baseline on today's master.

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


### Handoff 26B (Muse, 2026-11-17, partial: fix landed, pixel bars unmeasured — the pinned-frame recipe blanks on master too)

Started 15:35 PST, stopped 17:41 PST. Landed in b98ff7a1: the reveal's interior fill is now cut at junctions by today's own two cuts instead of 25B's nearest-junction window. `GfFxTable` bakes each sample's per-side cut margins (FX texel 1's free pair) from the renderer's fused caps (`g3Caps`, +4) and `junctionCutEntries`, with paint_state's reach formula in `gf_app`'s fxSnap; `lkJCut` in the look form ramps the margin over one pixel by the pixel's lateral side and scales `lkHi` inside the `uFxLive` branch only, so the rest frame is unchanged by construction (no `gf_pass` change, no new uniform; no `tables.ts`/`eval.ts`/`gf_keys.ts`/`gf_glsl.ts` field change). One bug cost a round: `lkJCut` first landed before `lkTan`'s definition and the look programs never finished compiling; it now sits after `lkTanS` (the unit test pins both sites).

Guard first, as ordered: `.claude/probes/K1459/k1459_guard.mjs` (pixel components, cross-section widths) fails on b42188db with 442 station/run failures, and the geometry-anchored `k1459_guard2.mjs` (runs = chain spans between junction arcs, stations at quartiles plus 0.3 world inside each end, widths from each frame's own samples) fails there with 150 (f3-f6: 8-34 missing-run stations a frame; burn f5 ink ratio 0.940 reproduced). Its today-vs-today floor is not clean (settle shifts move stations by a pixel), so Done 1's pass on the new build is NOT claimed from it.

What is verified: `npm test` green (252 files, 3134 passed; new K1459 case in `test/render/gf_fx.test.ts` pins the margins against the fused-end and side-entry formulas, and no-cut = -1e9); `tsc` clean. In a browser on a warm profile the fixed build compiles (firstMs 143 ms, 12 issued / 11 ready, ~1000 composites) and draws the rest maze (`.claude/probes/K1459/out/diag_master.png`).

Not measured, and why: Done 1's pass, Done 2's per-frame counts/ghost (burn + trace-rainbow), Done 3's sheet instant check, Done 4's crops and Done 6's hold/dragcheck guards. The sheet/pin recipe cannot produce a drawn pinned gf reveal frame in this environment on ANY current build: on master (a3a9a6b4) `k1459_pinwait` shows the gf stats resetting between polls (issued 2->1, composites 3->0) and a background-only frame (1247 bright px), and on the fixed build the pinned frame's passes climb (rvPasses 626/frame) while the frame shows only frontier glow; fresh profiles also pay 33-42 s per program compile under the day's contention (K1456's lane). The same recipe on b42188db (synchronous compile) draws normally, so this is the K1456-era pin interaction, not this change — but until it is resolved the pixel bars above stand unmeasured, and the side-sign convention in `lkJCut` (lateral sign = the entry's left) is verified only by the bake's unit test, not by eye. Next: re-run `k1459_cap` + `k1459_guard2`, `k1431_inkcmp` counts/ghost, an instant sheet pair and the two 4x crops (today | master gf | new gf) under `.claude/probes/K1395/out/26B/` once pinned gf frames draw, then close K1459. K1464, K1451 and K1460 untouched and open; perf lock released; preview servers (5506, 5508) and probe Chromes stopped.
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

### Handoff 26C

Done at e820cadd: landed one real fix, pixel bars unmet (bars are Done 1 and Done 2). What landed: (1)
junction identity baked beside the tables (K1424's next angle): `GfRouteTable` now bakes, per kept
sample in the look positions' layout, the disc ordinal of the routed junction whose fan covers that
sample - the sample's arc along ANY arm of that junction (third arms included) within today's fan
reach; `lkFan(lab, lq)` reads the label's nearest sample, and suppression plus every band gate on
it. (2) Bands now build from `routesByJn` alone: measured in this run's own pages, the 24F fanBands
source is dead under rp=gf - attach() nulls `filletLayer`, joinery stops rebuilding (count stuck at
5), and the fan records freeze with zero routes, so a warm gf page drew no bands at all (master gf
measured 302 px on the whole state, caps only; 25C's 634 rode a cold profile whose late switch let
the fans rebuild). `gf_app`'s fieldProbe read is gone, joinery's turn-fit bisection is ported into
the bake in rim-less form, and each band header carries its disc ordinal. (3) The band gate is the
label's own arm by along sign (chain alone cannot tell a junction's two same-chain arms apart) for
pieces, and fan+wedge (`inT`) for corners.

Measured on 24F's state (seed 7 walk; tools `k1414_26c_ab.mjs` / `mask26c.mjs` / `comp26c.mjs`; all
in `.claude/probes/K1414/out/26C/`): floor first - two today loads same state, 747 px, ratio 1.000,
IoU 1.000, stands. Overall: gf 721 vs today 747, ratio 0.965 (inside 15%), IoU 0.366 (bar 0.7, unmet).
Per junction (union components): ji0 164/110 IoU 0.566, ji167 64/81 0.543, ji157 127/80 0.302,
ji80 27/80 0.115, ji156 79/231 0.230, ji155 73/49 0.525 (+37 fragment), ji169 109/75 0.586,
ji176's pixels lie in ji169/ji155's boxes. Done 2 (no component over 12 px either way) fails at every
junction still. Eyes on the 4x crops (`crop_ji<ji>.png`: today | master gf | new gf): the on-frames
are close to today's at ji80/ji156 (master gf broke the band there) and the 25C ji0 yellow tick is
gone; what remains is worse at ji0 where gf's band top is duller than today's (suppressed fan pixels
the band does not re-gilt, the 40 px component at ji0's centre), and ji157 keeps a dull patch on the
salmon third arm at centre. Why the mask stays low, traced in the code: the residual gap is not band
placement - it is the off frame. At the through junctions today's off-frame web is the angular blend
of both arms' materials, so turning routes on changes the whole fan; gf's off-frame corner reads its
nearer side only, already split gold/purple, so parts of today's mask have no gf counterpart at any
gate. That is the junction web (K1414H's composed base), not the bands: closing it means gf's
corner colour itself must blend its two arms off-route, which is outside this run's files. Next
angle: teach lkRoute to sharpen the off-frame too: when no route shows (or in GfPaintTable worlds)
a corner pixel inside a fan disc blends the bracketing arms' materials instead of reading one side -
then re-measure the same mask.

Done 3 (0 px against master gf with no route showing) not re-measured in this run - the mask keeps
the whole value and `lkRoute` still returns the colour untouched when nB and nD are both 0 - and
Done 1 and 2 above stand in its place. Crops are the ones this handoff names. `npm test` green (252
files: 3135 passed, 9 skipped; tsc clean; K1424 covered in test/render/gf_route.test.ts). Guards (the
last row, preview of e820cadd on :5520, one profileDir kept across runs
`%TEMP%\k1414-26c-guards`, saved under out/26C): `hold.mjs` 60 250 5000: plain link
?3&xp=off&am=instant&rp=gf PASS (first composite 83 s), fat link gfh=1 PASS (40 s);
`dragcheck.mjs` gf PASS and gfh PASS (every stop 0 px over TOL 24). Tools: `.claude/probes/K1414/k1414_26c_ab.mjs` (PROFILE env is a kept
preview profile: cold compiles take ~70 s and the mouse still changes images, so fresh-profile
captures must wait for passes>0 and keep the profile as it worked here; not run again since),
`mask26c.mjs`, `comp26c.mjs`, `maskvis26c.mjs`. Files: gf_look.ts (the bake, turnFits, lkFan,
the new gate), gf_app.ts (routesByJn only), test/render/gf_route.test.ts; gf_pass.ts untouched
beyond the unit it already had.

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

## Run E (26E): K1451, the reach windows' build time (home on)

Added 2026-11-17, after K1451's merge. K1451 gives each pin a key window that follows its reach, with
`gfh=1` only (`pinReach` and `clipPinWindows` in `tables.ts`; Handoff K1451 s3 in
`docs/design/K1451_s3_home_on_bar.md`). With home on the tables build got slower: over the 12 census scenes
166.3 to 182.8 ms (+9.9%), fat 5.44 to 7.11 ms (+30.6%), def +30.9%, user_tw42.lightpaper +37.1%
(`node scripts/run_node.mjs .claude/probes/K1451/k1451_buildtime.ts 5`). The cost is pinReach's walk plus
the partner search at every exit step.

For this run the hands-off rule above is lifted for `pinReach` and its callers in `tables.ts`, nothing
else. A Claude agent (K1451 s4) is changing `clipPinWindows` in the same file: do not change what any window
comes out as, pull before you start and before each push, and re-take your baseline when a pull moved the
digest.

Done: 1. The number first, failing on master: the build time per scene, home on and home off, for the 12
scenes, against a3a9a6b4 (the commit before K1451's merge), alone and under the perf lock, median of at
least 5. 2. Home on: every scene within 10% of a3a9a6b4's. Home off: within 2%. 3. The output does not
change: `k1362t2_digest` equal to your starting master's with home on and off, pooled builds equal to cold,
and every `pinWL` / `pinWR` value bit-equal on the 12 scenes (`.claude/probes/K1451/k1451_wcmp.ts`). 4. One
GPU capture at `gfh=1` on each of the two links: 0 px against your starting master. 5. `npm test` green
with no pin re-taken. 6. The guards.
