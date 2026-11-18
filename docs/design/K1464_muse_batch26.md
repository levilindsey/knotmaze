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

Continuation (same run, after this handoff first landed): Done 3 measured - a no-route gf frame
(noroute26c.mjs, seed 7, no walk) against the code commit's parent 93aa4ef4 differs by 181 px, all
of it the panel's build-stamp text (x 1080-1200); in the knot area (x < 870) the count is 0 px, and
master against itself is 0, so Done 3 passes where it is defined. Two off-frame web fixes were then
tried and reverted on measurement: a fan-wide angle blend at every junction (a GfWebTable beside
the look tables, uWeb on unit 14) took the overall mask to gf 1834, IoU 0.253 (the blend reaches
ribbon and wedge pixels today's fan never touches, so gf's webs differ from their off frames far
outside today's fan), and confining the blend to lkRoute's suppression (the disc's own arms) took
it to IoU 0.332 with the ji155/169 boxes at ratio 1.95. Both are worse than the landed 0.366, so
the tree stands at e820cadd; the numbers stay here as the record that the naive angle blend is not
the missing half either - today's mask is shaped by the fan mesh's wedge polygons and striations,
and matching it needs the fan's own per-pixel (jbA, jbB, jbT), not a centre-angle weight. Crops are the ones this handoff names. `npm test` green (252
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

### Handoff 26D (Muse, 2026-11-17, fix landed in b01cc37b; Done 1 met on the displaced mask, Done 2 and 6 unmeasured — the perf lock never freed)

Started 21:26 PST, stopped 23:08 PST (the brief's 2 h stop line is 23:26). Landed in b01cc37b (pushed): the composite now draws into the pluck ripple's filter texture instead of to the canvas past it, so the ripple refracts the threads. In gf_app's RenderContainer callback a bound framebuffer in a screen-bound frame no longer rebinds the canvas: GfComposite.draw takes the bound framebuffer's viewport and a flip flag; COMP_FS (gf_pass.ts) and LOOK_COMP_FS (gf_look.ts) read their target at the mirrored row under uFlip (Pixi renders a non-root target Y-flipped, calculateProjection's flipY; the filter texture is canvas-sized at this link, so the fetch is texel-exact). One bug cost a round: the composite's alpha blend kept the destination alpha (ZERO, ONE), which is 0 in the cleared filter texture, so Pixi added the backdrop over every thread (+26/+29/+44 on a far thread pixel, 313k px differing); in the filter texture the composite now writes its own alpha (ONE, ONE_MINUS_SRC_ALPHA), on the canvas nothing changed. No tables.ts / eval.ts / gf_keys.ts / gf_glsl.ts field change.

Done 1 (probe first: .claude/probes/K1454/k1454_ab.mjs, seed 3 chain 49 at 843,441, phw=0 same state, ages 0.12/0.3/0.55 s; floor 0 px > 24 on every kind): the raw mask (diff > 24 from the no-ripple frame) reads today 21216/22192/21797, master gf 2029/2062/2172 (ratio 0.09-0.10, IoU 0.09 — fails, as the brief requires showing), new gf 2887/4153/3881 (ratio 0.14-0.19). The raw count cannot pass for a grid-locked renderer: about 90% of today's raw mask is the filter re-rasterizing today's meshes (1-px dotted outlines on threads 600+ px from the ripple, where the shader displacement is identically zero; final2/diff_today_a1.png). On the displaced mask (k1454_mask2.py: 1.2-px blur removes that sub-pixel noise, threshold 16, blurred two-load floor exactly 0): new gf ratio 0.987/0.992/1.000, IoU 0.895/0.890/0.837 at the three ages — inside the bars at every age; master gf ratio 0.446-0.659, IoU 0.424-0.613 — fails. Ripple-only (vibration cleared, out/26D/isolated): new 1.016/1.006/1.032, IoU 0.852/0.858/0.705; master 0. Done 3: no ripple live, new gf against master gf 0 px, max 0 (against the starting master and against 0007c8df). Done 4: 4x crops today | master gf | new gf at each age under .claude/probes/K1454/out/26D/ (crop_a0/a1/a2.png from final2): the ring sits where today's sits and the threads move with it; gf's band is crisper than today's resampled one, nothing else worse. Done 5: npm test green on b01cc37b (254 files, 3178 passed; new K1454 cases in test/render/gf_packout.test.ts pin the flip, its packComp survival and the filter-texture alpha; they failed before the fix).

Not measured: Done 2 (hold.mjs 60/60 on both links with the ripple on, and DRAG=1) and Done 6 (the same holds plus dragcheck gf/gfh) on the b01cc37b preview (127.0.0.1:5492 at the stop). The shared perf lock was held from 21:29 to the stop line (the K1468 agent, the coordinator, then Run 26E's build-time baseline), so no guard capture ran; the probe and crops above ran in the windows before 26E took it. Next: on that preview with profile %TEMP%\knotmaze-26d-profile, run hold.mjs 60 250 5000 on ?3&xp=off&am=instant&rp=gf and ?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1, the DRAG=1 hold, and dragcheck.mjs gf + gfh, then close K1454. K1464, K1451 and K1460 untouched and open; preview servers (5490, 5492) stopped; 26E's untracked tables_26e_base.ts left alone.

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

### Handoff 26E (Muse, 2026-11-17/18, fix landed, Done 2 not met)

Started 2026-11-17 22:35 PST; code on master in 7c739b42 (deploy 44260141669 green); guards finished 2026-11-18 after two network drops. Landed in tables.ts only: pinReach walks chain c segment by segment (setQ: the segment chainAtInto would find, its own interpolation, the unused tangent not recomputed) instead of a binary search + hypot per step, and its stretch search rejects a segment whose midpoint/half-length - one prep map per build from buildGfPrefix, built lazily per partner chain - already puts it past the best distance (|Q-mid| - halfLen bounds the segment distance; the 1e-9 margin sits far above both computations' rounding). pinReach gained an optional prep argument; clipPinWindows and every window value are untouched.

Done 1, the number first (k1451_26e_buildtime.ts, alternating medians of 5 under the perf lock against a byte copy of a3a9a6b4's tables.ts): on master, home-on totals 164.2 -> 194.2 ms over the 12 scenes (+18.2%), per scene +6.7% (muse_default_tw) to +59.7% (fat), 11 of 12 over the bar. The pins phase is the delta (k1451_26e_profile.ts: 0.30-3.76 ms a scene); an instrumented copy (k1451_26e_reachstats.ts) shows 348-1712 walks a scene, 1.2-11.8 steps a walk, and a full stretch search (~77-129 segment distances) on nearly every walk, 91-98% of them exits (k1451_26e_mstats.ts: the stretch minimum beats the hill distance in only 2-10%).

Done 2 not met. After the fix the same tool (medians of 7) reads home-on 162.4 -> 190.6 ms (+17.3%), per scene +2.8% to +68.8% (fat); home-off totals -1.4%. The pin loop itself, timed old-verbatim against new in one process with per-pin arrays compared (k1451_26e_ab.ts), runs 10-25% faster on the pin-heavy scenes and level within noise on the smallest two; total-build medians on this machine do not resolve that (the home-off control, an identical code path, swings +/-20-40% a scene between runs). Fat is the structural worst: its a3a build is ~4.3-5.3 ms with no corners, so the ~2.4 ms pin loop is half of it and the bar needs it under ~0.5 ms - a ~5x cut I did not find (below).

Done 3 met. k1362t2_digest: home off b0fc8ce3377f... and home on 89b5303687f8..., both equal to starting master's (re-checked after the final pull; upstream did not touch tables.ts), 297 pooled builds 0 mismatches each way. pinWL/pinWR SHA-256 identical before/after on all 12 scenes, home on and off (k1451_26e_pinhash.ts; out_26e_pinhash_before.txt against after6); k1451_wcmp.ts runs (its probe-vs-src differences are the pre-existing reach-model difference; the src windows are bit-identical, so they stand as they were).

Done 4 met. Same-state captures (asleep, __knotPinClocks(100), background re-pin, gf builds settled, forced update+redraw; kept profile %TEMP%\k1451-26e-profile) at gfh=1 on both links, 1885e499 (the code commit's parent) against 7c739b42: 279 px differ on each link, 0 in the knot area (x < 1070), all in the build-stamp strip (x 1526-1569, y 110-116) where the two builds' SHA text differs. .claude/probes/K1451/out/26E/cap2_{parent,new}_{plain,fat}.png (the first, unfrozen cap_* pair differs by settle state and is not evidence).

Done 5 met. npm test green (254 files, 3178 passed, 9 skipped), tsc clean, no pin re-taken and no test changed.

Done 6 met (preview of 7c739b42 on :5526, the same kept profile): hold.mjs 60 250 5000 - plain ?3&xp=off&am=instant&rp=gf PASS (first composite 35.5 s, the kept profile's first load of this build; 60/60, ~103k edges a frame), fat ?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1 PASS (first composite 2.0 s warm; 60/60, min 7168 edges). dragcheck.mjs PASS for gf and for gfh (every stop 0 px over TOL 24 against its fresh load).

Tried and not landed, each measured in-process: per-segment (dx, dy, l2) arrays carried on the build (slower - the property loads cost more than recomputing); a per-segment bbox prune (94-95% of segments pruned, no gain - the test costs what the distance costs and the scan still visits every segment); 16-segment chunk bboxes jumped whole (the fabric's threads sit ~2h apart, so 16-segment bboxes rarely prune); a two-level 32->4 hierarchy (exact evaluations fall 8x, fat 131k -> 16k a build, but the jump/cnt overhead cancels it in wall time). Arm-capped walks (stop at clipPinWindows' distance) measured on raw windows (GF_NOCLIP=1, k1451_26e_clipstats.ts): the clip cuts 38% of widened sides on muse_hash/g41_def_tw64 but nothing on fat (no arms), and def's cost is the 96% of sides that never widen - not the lever, and it duplicates s4's clip in the prefix. Next angle: attack the visit count itself - a per-pin candidate list (stretch segments that can ever come within sep of the walk corridor) or the tables' own chunk grid - keeping kp's first-argmin semantics; and re-measure Done 2 on a quiet machine, where the per-scene 10%/2% bars sit below this machine's current noise floor. K1451, K1464 and K1460 left open; perf lock released; preview server (5526) stopped.

## Run F (26F): K1474, rp=gf's thread fill is lighter than today's

Added 2026-11-17, after K1460 stage 5. On `?3&xp=off&am=instant` (default look) today's thread at junction B
(866,138 at 1600x900 DSF 2) reads cc7ac0 and rp=gf's reads e195e8, with and without `gfh=1`. The lighter fill
is visible at a glance and makes an edge where a long crossing fade ends; with gf's colour mapped onto
today's, the same crop matches today within 11 levels at every fade (sheets
`.claude/probes/K1460/out/s5/jb_*.png`; tools `recol.py`, `jbdiff.py`, `shot.mjs` there). Nobody has traced
where the colour departs: K1389's colour table (`gf_look.ts`), the look composite, the section colour's
shading, or a blend or colour-space step.

Scope: the fill colour of thread interiors with the default look (`tlk=fill`). The border look
(`tlk=border`) stays exactly as it is (Levi, 2026-11-17): its captures must not change. A Claude agent
(K1472 stage 2) is editing the reveal's code in `gf_reveal.ts`, `gf_look.ts` (`lkJCut`, `lkFx`), `gf_app.ts`
and `gf_pass.ts`: keep out of those functions, pull before you start and before each push.

Done: 1. The number first, failing on master: over thread interiors (pixels at least 3 px inside both
renderers' ink, away from crossings' fades and junction fans) on `?3`, `?7` and `?b.FMKB4DIQ` with
`xp=off&am=instant`, the max and mean channel difference between today and gf, per section colour, with and
without `gfh=1`. 2. Where the colour departs, named in the code, with the value at each step for one pixel.
3. Fixed: max channel difference 6 or less and mean 2 or less on all three links. 4. `tlk=border` on
`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`: 0 px against your starting master. 5. 4x crops
today | master gf | new gf at junction B and five more spots, looked at. 6. `npm test` green; a pin that
moves because the colour moved is re-taken and named in the commit. 7. The guards.


### Handoff 26F

Run 2026-11-18 01:14-04:00 PST, Muse (no subagents). Starting master 517f508c; master moved twice under the
required pulls (bfb9017b, then 82405bf9), which matters below. Fix on top: cfe66a7d. Probes and inputs:
.claude/probes/K1474/ (interiors.py, trace.mjs, trace.ts, ord.mjs; captures under out/26F/, servers
127.0.0.1:5480-5483, previews of 517f508c / bfb9017b / the fix in %TEMP%; perf lock held 01:31-04:00).

1. **The number first, failing on master** (517f508c; K1460 recipe, SIMT 20, DSF 2; interiors = at least
3 px inside both inks, 5x5 flat, at most 2 plateau colours in 31x31; interiors.py). Floor (two today
loads): max 1, mean 0.00 on all three links, so the 6/2 bar stands. gf and gfh alike: ?3 max 51, mean
(12.09, 15.55, 23.02); ?7 max 46, mean (11.83, 15.21, 22.52); ?b.FMKB4DIQ max 22, mean (0.00, 0.01, 0.01).
Per section colour (s3): every saturated section colour is off by a constant (21, 27, 40); grey and marker
colours (55,56,61), (173,175,184), (252,252,252) are exact.

2. **Where the colour departs.** One pixel (junction B, seed 3): today cc7ac0 = (204,122,192); gf reads
e195e8 = (225,149,232) = today + (21,27,40), and (21,27,40) is the flat backdrop colour. The value at
each step: the live look table is innocent (trace.mjs/trace.ts: the page's paint mirror and a Node
rebuild of GfLookTable both give lookColour = knotSection = kSectionAtArc = (205,122,192) at chain 82
sample 362, ctrl 54.92; slot 54 run 239, R2 = (0.802, 0.478, 0.754)). The pass and the composite shaders
are innocent (BLEND off in the pass, colour packed to 8 bits by gfB, composite out = C*cov). The step
that departs is GfComposite.draw's blend state in gf_pass.ts: on the canvas it kept the destination
alpha (ONE, ONE_MINUS_SRC_ALPHA, ZERO, ONE). With a transparent backdrop - background none (or
intensity 0: the layer writes nothing, .claude/rules via background.ts) - destination alpha under a
thread is 0, so the browser composites the page CSS colour (21,27,40) over the premultiplied thread. On
an opaque backdrop (default vellum) the same frames are already exact.

3. **Fixed (cfe66a7d):** the composite writes its own coverage alpha on the canvas too (one
blendFuncSeparate(ONE, ONE_MINUS_SRC_ALPHA, ONE, ONE_MINUS_SRC_ALPHA), the call the ripple-filter
destination already used; comment rewritten; pin in test/render/gf_packout.test.ts re-taken, plus a
K1474 case - it fails 1/33 without the fix). Not in lkJCut/lkFx or any reveal function. On the committed
build (SIMT 90, same-build today/gf pairs, fix90_* sets): ?3 gf mean (0,0,0), per-section max <= 2,
overall max 18 (15 interior pixels at 4 section-ramp spots, 7-18 levels - the stated max <= 6 is not
met on those pixels); gfh mean (0.10, 0.05, 0.10). ?7 gf mean (0,0,0), max 12. ?b gf mean (0,0,0), max 2.

4. **Border:** no literal 0 px. border_master vs border_fix differ by 138,792 px > 0, but the fat
link's same-build floor is 117,909 px > 0 (two loads of the fixed build), so the capture difference is
the load floor, not the change; by construction the change cannot move an opaque-backdrop frame (RGB
factors untouched, written alpha lands on 1).

5. **Crops** (out/26F/crop_sheet.png, crop_jb_*.png; today | master gf | new gf, 4x, junction B and
five spots at (500,200), (1200,300), (400,650), (1100,700), (750,480) CSS): at every spot the three
panels are indistinguishable in fill colour; the fade ends read the same as today's; nothing in the new
gf panels reads worse. (Sheets shot on the SIMT 90 sets; the first master2 sets at SIMT 20 landed on an
angular pre-settle renderer state and were discarded.)

6. **Tests:** npm test green (254 files, 3179 passed, 9 skipped) including the new K1474 case.

7. **Guards** (build of cfe66a7d, preview 5483, one kept profile): hold PASS on both links
(?3 rp=gf: 60/60 frames, min edge 102,751 vs max 104,060; fat gfh link: 60/60, min 7,383 vs max 9,902).
Dragcheck PASS for gf and gfh (all stops 0, 0.5, 1.2, 0.14: 0-4 px differ by more than 24 outside the panel against the fresh-load frames, limit 200; frames in out/26F/guards_fade/) NOTE: fade.mjs's own guard prints FAIL on this build
(fl=0: 677/679 sides pass; fl=1.2: 439/451) - not one of Run F's Done items; worth a look by whoever
owns fade, as it may be that guard's crossing-completeness criterion rather than a distance failure
(p90 |d-today| 0.0001-0.0124 world).

Caveat for the next reader: after the mid-run pull, master bfb9017b (K1481's compile-poll change landed
there) no longer reproduces the lightening in frozen or ordinary captures (junction B correct on
master90_gf and on an ordinary bg=none load), so on current master the defect is masked, not absent;
the composite still kept the destination alpha until cfe66a7d. The masking mechanism itself was not
traced to its line (inferred from the 517-vs-bfb A/B and K1481's change list; the other two upstream
src changes, gf_glsl/eval tipSink, cannot lighten a thread). K1474 stays open: the 15 ramp pixels above
Done 3's max, the literal 0 px of Done 4 unproven under the fat link's load floor, and the question of
whether today's 517-era visibility returns under some other frame state. K1464, K1451 and K1460 left
as instructed (K1460 was already done). Stopped at the 2-hour line with Done 1, 2, 6 and the hold half
of 7 measured, Done 3 met on mean and per-section max but not on 15 ramp pixels, Done 4 floored, Done 5
looked at.


### Handoff 26F, continued (Done 3 and 4 closed)

Continued the same day on Levi's instruction to meet the bars. Two findings closed them:

**Done 3.** The SIMT 90 sets' residue (15 px to 18 on ?3) was the loose interior mask admitting
crossing-fade shoulders and a kink eye (out/26F/ramp_clusters.png: both clusters sit on crossings).
Node traces (trace_ramp.ts, trace_shift.ts) show lkAt(positions) equals knotSection at the kept-vertex
ctrl - the apparent +2 sample shift is positions' duplicate compaction matching the field's kept
indexing, not a colour departure. With interiors read as Done 1 defines them (at least 3 px inside
both inks, flat over 15x15, one plateau colour in 31x31; interiors2.py), the fixed build measures:
?3 max 1 (?gfh 1), ?7 max 4, ?b.FMKB4DIQ max 0, means at most 0.001, with and without gfh=1 - the
6/2 bar is met on all three links (fixSS_* sets, same-state recipe; gated build's fill frame agrees:
gated_s3 max 1). The loose mask's per-section table from the first measurement stands (every section
colour exact after the fix).

**Done 4.** The unconditional alpha write moved border edges on transparent backdrops by CSS*cov
(44,183 px outside the panel on the shot recipe), so 5c058f5c scopes the write to the fill look only
(look.mode === 0; the filter texture still always writes; test pin updated). Border thereafter,
stability-verified captures (bordercap.mjs: screenshots byte-identical twice; state hash fff8c9e5 on
both): master bfb9017b against 5c058f5c differs by 0 px outside the panel; the only differing pixels
(1,741) are the panel's build stamp. The earlier 138,792 px was the ungated write plus mid-flight
renderer states.

**Guards re-run on 5c058f5c's build (5486):** hold PASS on both links (60/60 frames each); dragcheck
PASS for gf and for gfh (every stop 0 px > 24 against the fresh load; one earlier gfh FAIL re-ran
PASS and reads as a fresh-load flake). npm test green (3180 passed). K1474 is closed by this handoff;
K1494 (the fade guard question) stays open for its owner.

## Run G (26G): K1476, rp=gf's stray dark line across the fill at j64

Added 2026-11-17, from K1436 stage 3's work list of gf's largest faults on screen
(`.claude/probes/K1436/out/s3/worklist_named.tsv`; sheets `out/s3/sheets/worklist_h1_1.png` row 3 and
`worklist_h1_2.png` row 1, each row today fill | gf fill || today border | gf border at 4x; read Handoff
K1436 s3 in `docs/design/K1436_s3_screen_bar.md` for the tools and their traps). On the census scenes
muse_default_tw and muse_hash (K868 frozen states), at junction j64, world (5.6, 2.8), gf's fill shows a soft
dark line running from the junction across the section (362 px and 182 px in the screen scan, cut:plain), and
on muse_default_tw a small dark notch at the junction's top edge. Today's fill has neither (it has a small
sliver hole of its own there, which is not the bar). `gfh=1` and `gfh=0` show the same.

The scan's precision is 75%: read a find on its tile before acting on it. Cold gf loads hang under load: cap
each load and retry, as the handoff says. A Claude agent (K1472 stage 2) is editing the reveal's code in
`gf_reveal.ts`, `gf_look.ts` (`lkJCut`, `lkFx`), `gf_app.ts` and `gf_pass.ts`: keep out of those functions.

Done: 1. The number first, failing on master: the screen scan's find at j64 on both scenes
(`k1436_screen.mjs` then `k1436_screen_scan.ts`, as `k1436_s3_screenscan.ps1` runs them, STRICT=1), and a 4x
tile today | master gf. 2. The cause named in the code: which piece's ink draws the line (the label, home
and gap values at three pixels on it). 3. Fixed: no find at j64 on either scene with `gfh=1` and with
`gfh=0`; `k1436_bar.ps1 -Ref <your tip> -Base <your starting master> -Scenes muse_default_tw,muse_hash
-HomeFlag 1` under STRICT=1 prints PASS (new 0, grown 0) with j64 under gone, and the same with
`-HomeFlag 0`. 4. 4x tiles today | master gf | new gf at j64 on both scenes, fill and border capture,
looked at: the line and the notch gone, nothing new. 5. Every other census scene: output unchanged by the
digests batch 25 defines, or every changed spot named and looked at. 6. `npm test` green. 7. The guards.

## Run H (26H): K1477, rp=gf's border stroke ends in a stub past a crossing (ring x68)

Added 2026-11-17, from the same work list (`worklist_h1_1.png` rows 1, 2 and 4). On the census scene ring at
crossing x68, world (19.4, 20.0), and on g41_ring_tw64 at j24 (19.7, 20.1: the same spot) and x67
(18.0, 20.6), the border capture shows the under thread's border stroke tapering to a point and stopping
past the crossing; today's stroke runs through. The fill matches today's. 963, 660 and 296 px in the screen
scan (cut:plain). gf's border look stays darker than today's (Levi, 2026-11-17): the bar here is that the
stroke runs on unbroken, not its shade. A hint, unchecked: x68 is a site K1436's bar is expected to name
on 17053a36 against a3a9a6b4 (K1451 stage 2), so read K1451's reach windows (`tables.ts`) early.

The same cautions as Run G (precision, hung loads, K1472 stage 2's functions).

Done: 1. The number first, failing on master: the screen scan's finds at the three sites (STRICT=1), and
4x tiles today | master gf, fill and border capture. 2. The cause named in the code, with the values at
three pixels where the stroke should be. 3. Fixed: no find at x68, j24 or x67 with `gfh=1` and with
`gfh=0`; `k1436_bar.ps1 -Ref <your tip> -Base <your starting master> -Scenes ring,g41_ring_tw64 -HomeFlag 1`
under STRICT=1 prints PASS (new 0, grown 0) with the three sites under gone, and the same with
`-HomeFlag 0`. 4. 4x tiles today | master gf | new gf at the three sites, looked at: the stroke runs
through as today's does, and the fill still matches. 5. Every other census scene: output unchanged by the
digests batch 25 defines, or every changed spot named and looked at. 6. `npm test` green. 7. The guards.

## Run I (26I): K1468, link A's frame time on master against ae2b4dfb

Added 2026-11-17. On `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (link A) at rest, master is slower
than ae2b4dfb: rAF interval 24.5 / 24.8 ms against 18.0 / 17.9 ms and 409 / 405 composites per 10 s against
561 / 563 (two clean rounds under the perf lock, 2026-11-17 22:16-22:44; Handoff K1468 s2 (second run) in
`docs/design/K1468_s2_frame_time.md`: read it whole). The time is GPU wait, not CPU submit (0.2-0.4 ms
everywhere). It is not K1468's packed target: a probe build with the old three RGBA8 targets ran 27.7-28.7 ms.
The pass programs cost the same in every build (gf:3/2 4.6-5.3 ms). Candidates, unchecked: 158f75be (K1468's
context-loss guard), e820cadd (K1424's route bands, `gf_look.ts` +203 lines, paid with no route showing?),
01933aa3 (K1472's RGBA32F table uploads; least likely). Link B (`?3&xp=off&am=instant&rp=gf`) shows no gap.

Tools: `.claude/probes/K1468/s2/attr.ps1` (per-program GPU timers), `rest_gpu.mjs`, `interleave.ps1`,
`common.ps1`; results so far in `out/run2_base`, `out/run2_attr`. Warm each Chrome profile first with the
watchdog off and `SEC` of 40 or more: an unwarmed build's look program can take over 10 minutes to compile
(fc520c2d did), and a frame counts only once gf composes. Per-program timers read 16-19 ms whenever another
Chrome shares the GPU, so measure only under the perf lock (`$env:TEMP\claude-perf.lock`) and say what else
was running.

Files: `gf_look.ts`, `gf_pass.ts`, `gf_app.ts`. Hands off the junction field (`tables.ts`, `eval.ts`,
`gf_keys.ts`, the field evaluation in `gf_glsl.ts`) and the reveal (`gf_reveal.ts`, `lkJCut`, `lkFx`).

Done: 1. The bisect, under the lock: interleaved rounds (three or more) of ae2b4dfb, the candidates' parents
and children, and master, each build's rAF interval and composites per 10 s on link A; the commit where the
interval rises by 15% or more is named. 2. The cause named in the code, with the per-program GPU time (or
the per-frame work) that pays it, on that commit and its parent. 3. Fixed: in the same interleaved rounds
master's tip is within 5% of ae2b4dfb's interval on link A, and link B is no slower than master by more than
5%. 4. The picture does not move: 0 px against master gf at rest on both links at the same physics hash, and
on 24F's state with a route showing (the K1424 bands), or every differing pixel named and looked at.
5. `npm test` green. 6. The guards. If the bar is not met at the stop line, land what is a real saving with
0 px moved, and write the table and what each attempt saved.

## Run J (26J): K1456, the look program's compile time (the corner code of `layers()`)

Added 2026-11-18, after K1456 stage 2 (read `### Handoff K1456 s2` in `docs/design/K1456_s2_first_visit.md`
whole). On a first visit to Levi's link (`?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1`) gf's first composite waits for
ONE program, the look's full program (78.7k characters), which the compile worker links in 40-96 s; the
first composite came 55-106 s after the load. A salted single compile (`.claude/probes/K1456/s2/ctime.mjs`,
`variants.mjs`, results `out/ct1-3.json`) puts the cost in the corner code of `layers()` (`gf_glsl.ts`):
the full program 143 s, with `layers()` stubbed 18 s, with all the piece / arc / tip loops stubbed 42.6 s,
with fillBur stubbed 65.4 s, any single loop stubbed 76-91 s; the loop bounds (MAXP / MAXK / MAXS) barely
matter. So the driver's compiler is slow on this source's shape, not its size.

Scope: the GLSL text of `layers()` and what it calls, in `gf_glsl.ts`. The picture must not change at all:
this run restructures source, it never changes a value. Candidates, yours to choose and replace: fold the
piece / arc / tip loops into one loop over a shared record; move fillBur out of the per-entry loop; replace
branches on uniforms with arithmetic selects; shorten the longest functions so the compiler inlines less;
find by bisection (the `lvar` variants) which construct the compiler multiplies. The CPU mirror (`eval.ts`)
stays as it is, since no value changes.

Done: 1. The number first, failing on master, under the perf lock: `ctime.mjs` on the full look program,
median of three salted compiles, and the same for the two other look programs (idx 1 and 2 in the handoff's
table). 2. That median cut by at least half on the full program, with no other program slower by more than
10%. 3. The picture: at rest on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` and on
`?3&xp=off&am=instant&rp=gf`, frozen at the same physics hash (`.claude/probes/K1472/restab.mjs`,
`.claude/probes/K1456/s2/inkbox.py`), 0 px differ between your build and your starting master, with a
master-against-master control beside it; the same on `?b.FMKB4DIQ&xp=off&am=instant&rp=gf` and at Crossing
fade (`fl`) 0 and 1.2 on the first link. 4. The K1436 bar (`STRICT=1`, `-Scenes ring,def -HomeFlag 1`, your
tip against your starting master): no new find. 5. `npm test` green; the shader digests in
`test/render/gf_home_glsl.test.ts` re-frozen and named in the commit, nothing else re-taken.
6. `hold.mjs` 60/60 warm on the first link; a cold visit's seconds from load to the first composite before
and after (one run each is enough, labelled with what else was running).

A partial result lands: each restructuring that keeps Done 3 at 0 px and cuts the median is its own commit.
If a restructuring changes even one pixel, drop it and say which.

Others at work: a Claude agent on the border faults (K1482) edits the key and composite terms in
`gf_glsl.ts`, `eval.ts`, `tables.ts`, `gf_keys.ts`: pull before you start and before each push, keep each
commit small, and if a pull conflicts in `layers()`, redo your change on top of theirs. Another Claude agent
(K1456 stage 3) has the compile worker and its start (`gf_app.ts`, `gf_pass.ts`, `gf_compile_worker.ts`,
`gf_split.ts`, `frame_loop.ts`): keep out of those.

## Run K (26K): K1500, rp=gf has no crossing fade at the start and exit markers

Added 2026-11-18. Today's renderer fades a thread away from a marker disc (start, exit) over the Crossing
fade's length (`fadeLength`, URL key `fl`, 0 to 1.2, default 0.14): `renderMarkerGaps` in
`src/render/ribbon/crossing_gaps.ts`. rp=gf draws the same cut at the disc and keeps it crisp at every `fl`:
`gf_look.ts` has no port of the marker gap's fade (K1495's handoff in `docs/design/K1495_fade_reach.md`, last
bullet of its sheets list; its probes in `.claude/probes/K1495/`: `shots.mjs` sets the fade live, `prof2.py`
measures a ramp along a thread's centre line). Levi drags that slider on
`?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1` and wants it to act on the fly. K1492 (3d7acffe) made the border look's
outline fade by the gap's kept fraction (`lkCo.a` in the label pass): the marker's fade must reach the border
look the same way.

The same cautions as Run G (precision, hung loads, K1472 stage 2's functions). `gf_look.ts` is also Runs G
and H's file: start from master as those runs left it.

Done: 1. The number first, failing on master: on link A with markers shown
(`?3.FGH1HtvQeDjm6e4BII&am=instant&rp=gf&gfh=1&tlk=fill`, and today's renderer on the same link without
`rp=gf` and `gfh`), at rest in one physics hash, at `fl` 0, 0.14, 0.5 and 1.2 (set live, as a slider drag
does, and by `&fl=<v>`): at both markers, every thread that meets the disc, the 10%-90% ramp of the thread's
coverage along its centre line against distance from the disc's edge, today | gf, in device px. 2. The cause
named in the code. 3. Fixed: gf's ramp equals today's within 15% or 2 device px (whichever is larger) at
every such thread and all four values, in the fill look, and the border look's outline follows the same ramp
(`&tlk=border`); it follows a live slider move with no reload, awake and asleep; `fl` 0 stays today's crisp
cut. 4. 4x tiles today | master gf | new gf at both markers at `fl` 0, 0.14 and 1.2, fill and border, looked
at: smooth, no stairs, bands, ticks or dots. 5. Away from the markers nothing moves: with the same physics
hash, 0 px against master outside a box of 3 world units around each marker, at `fl` 0.14 and 1.2, both
looks. 6. `.claude/probes/K1458/dragcheck.mjs` (fill) and `.claude/probes/K1492/dragcheck_b.mjs` (border)
pass. 7. `npm test` green. 8. The guards.
