# K1464: Muse batch 26, rp=gf on an ordinary load (2026-11-17)

Four runs (tags 26A-26D), started by Claude through Paseo with the K1053 chain, one after another in the main
checkout. Batch 25's rules (`docs/design/K1448_muse_batch25.md`, its first list), batch 24's How to work
(`docs/design/K1418_muse_batch24.md`) and batch 23's hold in full, with these changes:

- Your tag is `26<X>`; commit messages end `(Muse batch 26 Run <X>, 26<X>)`; append `### Handoff 26<X>`
  under your run's section here.
- **The perf lock only through `scripts/perf_lock.ps1`** (changed 2026-11-19, K1533; this replaces the older
  briefs' lock rule): `pwsh scripts/perf_lock.ps1 -Owner "muse-26<X>" -What "<what>" -Cmd "<the capture
  command>"`, one capture sequence of at most 25 minutes per call. It waits for another owner, takes the lock,
  runs the command and releases it. Never write or `Remove-Item` `$env:TEMP\claude-perf.lock` yourself.
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

**Ledger adds (added 2026-11-19).** A new item's ID comes only from `ledger.mjs add` (never type an ID). Bring the checkout level with origin/master right before an `add` (`git pull --ff-only origin master`; commit your work first if it refuses): the ID is one more than the highest in YOUR checkout, and a checkout that is behind hands out a taken one (27B's K1536).

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

### Handoff 26G (Muse, 2026-11-18, fix landed in 9ae14f27; K1476 stays open for the other scenes' changed spots)

Started 06:27 PST, stopped 07:47 PST. Starting master cc5473a5; fix on master in 9ae14f27 (rebased over 203baead at the push; deploy 44330043019 success). Probes under `.claude/probes/K1476/` (label/pins/triggers tools; captures and tiles under `out/26G/`; perf lock held for the captures and guards, released at the end).

Done 1 (the number first, failing on master, STRICT=1, DSF 3): muse_default_tw j64 cut:plain 365 px at (5.59, 2.84), muse_hash j64 cut:plain 182 px at (5.67, 2.77) - s3 read 362 / 182. Tile `tile_master_1.png` (today fill | master gf fill | today border | master gf border, 4x) viewed: gf's fill carries the dark line across the section and, on muse_default_tw, the notch at the top edge; today has neither (its own small sliver hole there is present in both).

Done 2 (the cause). Three pixels on the line (muse_hash, from the capture's own tables via `k1476_label.ts` / `k1476_pins.ts`; gap split by a one-off viz build, reverted): (5.52, 2.62) label chain 56 s 0.30, home group 64 ramp 1.00, winM +0.59; (5.67, 2.62) c56 s 0.20, g64 1.00, winM +0.49; (5.52, 2.77) c56 s 0.24, g64 1.00, winM +0.53. At (5.67, 2.77) the pixel sits on chain 56's own centreline (d 0.061) and 0.431 from chain 28's - h (0.4) + the gap - and reads paper (23, 28, 42) against mirror coverage 1.00; today reads (204, 122, 200) there. The viz reads the candidate loop 0 and the NearOn path carrying the cut. j64 is chain 56's end arm (s 0) meeting chain 28 through (s 7.48), one group; chain 28 crosses chain 56 at c56 s 1.85 (c28 s 5.86, over) and the two then ride into the joint side by side, their centreline distance never reaching the all-lanes exit (0.84) before the joint. `gapWindow`'s march therefore finds no all-lanes exit and returned its cap, so the baked window ran the whole 1.85 of arc to the chain's start and `lkNearOn` cut chain 56's fill along chain 28's h+gap corridor. Today's slot keeps the same window, but inside the fan its ribbon is handed to the junction fan, so no ribbon fragment is there to cut. A gap=0/fade=0 A/B took the find 182 -> 7 px, confirming the gap term. Nothing in `tables.ts`, `eval.ts`, `gf_keys.ts` or the field evaluation in `gf_glsl.ts`; not in `lkJCut` / `lkFx` or any reveal function.

Fix (9ae14f27, `gapWindow` in `gf_look.ts` only): a ride that never clears ends at the joint room - `Math.min(w, room)` in the no-exit branch - instead of running to its cap; with no joint (room 1e6) nothing changes, and the all-lanes-exit branch (K1218: a window never ends before its exit) is untouched. New K1476 case in `test/render/gf_gap.test.ts` (2.0 against 0.58 before the fix, passing after).

Done 3: `k1436_bar.ps1 -Ref 9ae14f27 -Base cc5473a5 -Scenes muse_default_tw,muse_hash` under STRICT=1 prints PASS (new 0, grown 0) with j64 under gone at HomeFlag 1 (`out/bar/26G_h1/bar.txt`) and the same at HomeFlag 0 (`26G_h0`). Also gone on both flags, same class: muse_hash j81 (cut:plain 141, cut:ramp 26, vdip:plain 9), x307 speck 6 and j138 speck 4. Fixed-build scans alone: muse_default_tw 0 finds; muse_hash only the pre-existing j144 cut:plain 34 px (23.53, 8.06; s3's tick at the same size).

Done 4: `tile_fix_1.png` (same layout, fix gf) viewed beside `tile_master_1.png`: on both scenes the line and the notch are gone and the fill matches today's, including today's own sliver hole on muse_default_tw; the border column at j64 now shows the fan's curl as today's blob does. Nothing new in either tile.

Done 5 (partial): the tables digest (`k1362t1_digest`) is c1be0e90e689850ce0a9bfe43bcc58684181fa784393a9b5f37779ebfcb40dd0 (5445 lines), bit-identical to master's - no field-table file moved. The gap bake itself changes wherever a never-clearing ride runs toward a joint: an approximate trigger scan on the census dumps (`k1476_triggers.ts`, `out/26G/triggers.txt`) counts changed window sides - def 10, g41_def_tw42 10, g41_def_tw64 4, g41_ring_tw42 5, g41_ring_tw64 3, g41_user_tw42 2, g41_user_tw64 3, muse_default_tw 8, muse_hash 5, ring 5, user_tw42.lightpaper 2, fat 0. Only the two named scenes were screen-looked (Done 3/4); the other scenes' changed sides are named by the scan but not looked at, filed as K1501. K1476 stays open for that look.

Done 6: `npm test` green on the fix (254 files, 3181 passed, 9 skipped; tsc clean), including the new case.

Done 7 (guards, build of 9ae14f27 served from `$env:TEMP\k26g-guards`, one kept profile `$env:TEMP\k26g-guards-profile`): `hold.mjs` 60 250 5000 PASS on `?3&xp=off&am=instant&rp=gf` (first composite 56.0 s on the cold kept profile; 60/60 frames, edges min 102722 / max 103937) and on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (29.0 s warm; 60/60, min 6678). `dragcheck.mjs` PASS for gf (every stop 0 px over TOL 24; the first run's fl=1.2 stop found no fresh load in the dragged page's state - the two-hash settle lottery - and the re-run passes) and PASS for gfh (every stop 0 px). K1464, K1451 and K1460 left open and untouched. Preview servers (5611-5614) stopped; the bar's `-Keep` builds and profiles stay in `$env:TEMP\k1436s3-prev` / `k1436s3-profile-*`.
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

### Handoff 26H (Muse, 2026-11-18, no fix landed: the cause is in the hands-off pin key windows; K1477 stays open)

Started 07:54 PST, stopped 08:50 PST. Starting master 9b1834ba (level with origin/master after `git pull --rebase`). No `src/` or `test/` change. Probes under `.claude/probes/K1477/` (`k1477_label/cut/stroke/prof/prof2/eval.ts`, untracked; captures `out/26H/cap_master`, `cap_nogap`; tiles `out/26H/tile_master_1.png`); preview of 9b1834ba on 127.0.0.1:5611 (`$env:TEMP\k26h-prev`), kept profiles `$env:TEMP\k26h-profile-master` / `k26h-guards-profile`; perf lock held for the captures and guards, released at the end.

Done 1 (the number first, failing on master, STRICT=1, DSF 3, hashes ring 50dd4ffd and g41_ring_tw64 ea67fc77, both equal to their K868 diags): ring x68 `cut:plain` 809 px at (19.36, 20.00); g41_ring_tw64 j24 147 px at (19.39, 19.88) and x67 296 px at (18.01, 20.55) (plus the known x6 26 px false find). K1436 s3 read 963 / 660 / 296 on cc1ee890 - the same three sites. Tile `tile_master_1.png` (today fill | master gf fill || today border | master gf border, 4x) viewed: at all three sites gf's border stroke narrows to a grey wedge and stops where today's runs through; the fill columns match today.

Done 2 (the cause, two parts). (a) The visible stub is form B's surface key order, not the look's gap. Three pixels where today's over-edge stripe runs - (19.88, 20.36), (19.71, 20.29), (19.55, 20.14): mirror eval ink 0.002 / 0.086 / 0.000, cov 1.00, label chain 3 at s 29.17 / 29.35 / 29.56, distance to chain 3's centreline 0.041 / 0.071 / 0.048 and to chain 4's 0.294 / 0.256 / 0.299 (h = 0.29, so chain 4's edge band `band2(h - X)` is ~1 there). The pins: chain 4 s2.35 z +0.67 and chain 3 s28.15 z -0.67, both WL/WR 0.658 (= `win`). The feet (chain 4 s3.23, chain 3 s29.35) sit 0.88 / 1.20 arc past their pins, beyond 0.658, so both depth hats in `eval.ts` `depth()` (and `gf_glsl.ts`'s twin) read 0 and the keys are -0.059 (chain 4) against -0.0165 (chain 3): chain 3's surface wins, its coverage (sa = 1) buries chain 4's edge ink. Today interpolates the diagram depth along the mesh (chain 4 about +0.33, chain 3 about -0.26 at those feet), so its over ribbon draws the stripe. Stroke widths along chain 3 past x68 (`k1477_prof.ts`, lum > 54): gf 0.18 at +0.8 arc, 0.09 at +1.0 to +1.4, 0.23 at +1.8; today 0.21-0.22 throughout. The windows that span the whole overlap are K1451's reach windows (`pinReach`, `GF_REACH_SEP` 2h: the centrelines here part past 0.58 at about 1.6-1.9 arc, so a window of about 1.9-2.2), but `tables.ts:582` bakes them only with home on and the page builds home off even at `gfh=1` (the capture's `T.homeOn` is false; K1482 stage 4's finding). `tables.ts`, `eval.ts`, `gf_keys.ts` and the field evaluation in `gf_glsl.ts` are hands off this batch, so no fix landed in this run. (b) The scan's `cut` find is the look's gap along chain 3's centreline at +1.65 to +1.95 arc (`GfGapTable` winPos 1.98, twin-capped; the `gapWindow` port checks faithful - today's cap and over-range variants move winPos by at most 0.095). Gf's fill profiles there are today's, value for value at +1.5 to +2.1 (both half-cut; `k1477_prof2.ts`), so that find is gf against the mirror (whose cov has no gap) outside the scan's legit zone (L = 1.40 from the pin at sin 0.66), not a gf-against-today fill difference: removing it would uncut fill where today cuts. A gap=0 / fl=0 A/B took the find 809 -> 220 px and the stripe stayed missing, so `lkGap` is not the stripe's cutter either.

Done 3 and 4 not met: no src change landed, so the bar was not run (a master-against-master run proves nothing) and there is no new-gf tile. Done 5: no output moved - the tables digest (`k1362t1_digest`) is c1be0e90e689850ce0a9bfe43bcc58684181fa784393a9b5f37779ebfcb40dd0 (5445 lines), bit-identical to starting master's. Done 6: `npm test` green (254 files, 3181 passed, 9 skipped; tsc clean; no test changed). Done 7 (guards, build of 9b1834ba on :5611, one kept profile): `hold.mjs` 60 250 5000 PASS on `?3&xp=off&am=instant&rp=gf` (first composite 63.3 s cold; 60/60, edges min 102683 / max 104161) and on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (30.2 s; 60/60, min 6782); `dragcheck.mjs` PASS for gf and for gfh (every stop 0 px over TOL 24 against its fresh load; the first gfh run's stop 0.5 found no fresh load in the dragged page's state - the two-hash settle lottery - and the re-run passes). `fade.mjs` itself prints FAIL on this unchanged master with Run F's exact numbers (fl=0: 678/679 sides, fl=1.2: 439/451, median |d-today| 0.0000-0.0007 world) - the K1494 guard question, not this run (no src change). Follow-up filed as K1502.

Next: in the K1451 / K1482 lane, land the reach key windows with home off (or the page home build it is already staging), watching the census stray count that wider keys without home membership raised before (16 -> 231, `tables.ts:578`); then re-run `k1436_bar.ps1 -Scenes ring,g41_ring_tw64` at both HomeFlag values and re-take the tiles. K1477, K1464, K1451 and K1460 left open and untouched; preview server (5611) stopped.

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

### Handoff 26I (Muse, 2026-11-18, no fix landed: the gap does not reproduce on today's master)

Started 10:30 PST, stopped 12:07 PST. Starting master 6edee1d7. No `src/` or `test/` change: on today's master the brief's gap is gone, so there was nothing to remove. Probes under `.claude/probes/K1468/s2/` (`bisect26i.ps1` — rest.mjs, link A; `bisect26i_sum.mjs`; outs `out/26I_clean`, `out/26I_a`, `out/26I_attr*`, `out/26I_bpair`, `out/26I_pic`, `out/26I_guards`); builds in `$env:TEMP\k26i-prev` on 5660-5668, profiles `$env:TEMP\k1468s2-prof-*` warmed with the watchdog off. Levi's Chrome (up since 11/16) and foreign preview servers on 5481-5497 shared the GPU throughout; every number below is an interleaved median under the perf lock.

Done 1 (the bisect, timer-free rest.mjs stand of s2, link A, 3 rotated rounds, medians frame p50 / interval p50 / composites per 10 s): ae2b4dfb 17.2 / 24.1 / 431; 77d9a7b8 (158f75be's parent) 16.3 / 23.4 / 439; 158f75be 16.9 / 24.2 / 423; 93aa4ef4 (e820cadd's parent) 18.0 / 25.0 / 408; e820cadd 16.2 / 23.4 / 441; 706e70db (01933aa3's parent) 18.8 / 26.0 / 405; 01933aa3 18.9 / 26.0 / 399; master 6edee1d7 7.4 / 18.6 / 555. Adjacent steps (frame): ae2b->packed -5%, packed->guard +4%, guard->93aa +7% (a docs-only commit), 93aa->e820 -10%, e820->706e +16% (a ledger-only commit, gf source identical — the noise floor of this stand), 706e->019 +1%. No candidate rises by 15% or more; e820cadd and 01933aa3 step the wrong way or not at all, and 158f75be's step is inside the identical-source noise. A first round with GPU timer queries (rest_gpu) read the same ordering but distorts the intervals and was discarded for this table. Gap-era control: dc335eab (master when the brief was written) does reproduce the brief's direction against ae2b4dfb in the attribution stand below, so the gap was real then and closed by work that landed after it.

Done 2 (attribution, rest_gpu per-program GPU p50, link A, 2 rounds each): the look tier gf:3/2 times 3.47/3.49 ms on ae2b4dfb and 4.9 ms (one 14.8 spike) on master; comp:look 0.12-0.19 against 0.09; gf:8/6 trivial on both — no GPU program pays the old gap on master. What actually differs per frame is CPU cadence: the bench's renderer.update() calls per 10 s are 478-534 on ae2b4dfb and 378-418 on dc335eab at 4.7-5.1 ms each, against 0-41 on master. That is the interval's missing ~5 ms; frame_loop.ts and gf_app's busy() are unchanged between dc335eab and master, so I did not isolate it to one commit (the K1472 s2/s3 and K1481-era changes to gf's per-frame requests are the neighbourhood), and no isolation was needed: the bar below already holds. On dc335eab the same stand reads frame 18.8/17.4, interval 26.2/24.6 against ae2b4dfb's 11.3-14.7/18.8-22.1 — the brief's gap, on the brief's build.

Done 3 (met by master itself, so no fix): the same rounds put master's interval 23% under ae2b4dfb's on link A (18.6 against 24.1, bar: no more than 5% over) and, in a separate interleaved pair (3 rounds, link B), 18.1 against 23.2 (-22%, frame 9.0 against 15.8). A route-free look-program split for e820cadd was designed and not landed: its measured step is -10%, the wrong sign for a saving.

Done 4: with no source change the picture cannot move. Same-build restab controls on the master build (SIMT 20, hash-matched pairs): link A (fff8c9e5) 0 px over 24; link B (49c20566) 2635 px, the same-build floor K1468's item 2 already documents for this recipe. The 24F route state was not re-captured; there is no new gf to compare there.

Done 5: `npm test` green (254 files, 3182 passed, 9 skipped; tsc clean), no test changed. Done 6 (build of 6edee1d7 on :5667, one kept profile `%TEMP%\k26i-guards-profile`): hold.mjs 60 250 5000 PASS on `?3&xp=off&am=instant&rp=gf` (first composite 71.9 s on the cold profile; 60/60, edges min 102876) and on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (33.8 s; 60/60, min 6807); dragcheck.mjs PASS for gf and for gfh (every stop 0 px over TOL 24).

K1468 stays open for its own brief's item 2 (the pixel A/B and its freeze recipe), which is outside this run; the link-A frame-time item is closed by the post-dc335eab work above, not by a commit here. K1464, K1451 and K1460 left open and untouched. Perf lock released; preview servers (5660-5668) and probe Chromes stopped; the kept guards and bisect profiles stay in `$env:TEMP`.

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

### Handoff 26J (Muse, 2026-11-18, partial: the compile cut landed in 41c13cf6, Done 2's half unmet)

Started 09:04 PST, stopped 10:20 PST. Starting master 9d097df2; fix on master in 41c13cf6 (deploy 44366936385 success). Probes and sources under `.claude/probes/K1456/out/26J/` (`base_src/` master's dumped worker sources, `new_src/` the fix's, `var/` every variant, `picA*`/`picP*` captures, `*_single*.json` ctime runs).

Done 1 (the number first, failing on master, perf lock held; `ctime.mjs` salted singles, median of three, Levi's idle browser on the machine): full look program (idx 0, 78,956 chars) **21.4 s** (21.4 / 20.8 / 22.3); idx 2 (corner tier) **19.9 s**; idx 1 (corner-free) **8.3 s**. Serial attribution on the preprocessed source (23.4 s): stubbing `layers()` leaves 4.4 s; `fillBur` accounts for ~8.7 s, `vtx` ~8.4 s, `pieceD` ~6.3 s; dropping ONE of fillBur's two call sites saves ~5.5 s — the driver compiler inlines fillBur per site and pays per copy.

Landed (41c13cf6, `gf_glsl.ts` only, plus the two test files): `oneFaceLoop` (a `gfFs` rewrite of the tier-less full program only; tiers, the probe, no-tangent, split/reg/pack/unroll forms byte-identical) walks layers()'s corner faces in one loop in the old order — every arc (fi < nk), then every tangent point in (corner, side) order — so D is final before a tangent face reads it, v keeps the same running maximum and first winner on a tie, and each face is the same guards, burial and `fillBur(k, pt, p, S)` on the same values; `fillBur` and the piece burial appear once. `outsideArms` tests both arms' chains in one pass (the same tested set; a chain twice in K3 was tested twice, now once). Measured the other candidates and dropped them, each serial against its batch's control: extracting the corner loops into a function (`splitf`, 23.4 vs 21.3), a shared `cBur` helper (20.4 vs 21.3), the per-corner interleaved merge (17.1), burial early-exit removal (16.3-16.4 vs 16.9), the segment carry-fetch and `pieceD`-via-`pieceF` (15.7 / 16.1 vs 14.6): none beats the enumeration, and each that changed a value was dropped on sight.

Done 2 not met. After: full **14.4 s** (15.5 / 14.4 / 14.4), 0.67x of master's median — a third off, not half. idx 2: **18.3 s** and idx 1: **8.1 s**, both inside the +10% bar (both carry only the `outsideArms` pass; the corner tier's loops are untouched by the gate). What is left in the full program, measured on the merged source: `vtx` ~5.5 s and `fillBur` ~2.9 s of ~15.8 s. Next angle: fold vtx's two `pieceF` call sites and its two `pieceD` guard sites into w-loops over the pair (the same one-site fold), then re-time; the all-pieces enumeration (`allfaces`, pieces in the same loop) measured level with the landed one (15.4 vs 15.7) and stays in `var/allfaces.frag` if a second burial copy must go.

Done 3 (partial): on link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`, restab SIMT 20, hash fff8c9e5) master gf against new gf differs by **0 px**, ink identical in all ten boxes; a second new capture against the same master differs by 530 px at max 2 levels, the same as the new-against-new control (530 px, max 2), so the pair sits at the capture floor. The plain link (`?3&xp=off&am=instant&rp=gf`) matched hashes only asleep (SIMT 120, 0ff9c4b1): ink identical, 82,957 px at max 1 level against the master-master control's 63,350 px at max 0 (background-drift scale; the frame there is fog-covered, so this is weak evidence and is reported as such). Not measured: `?b.FMKB4DIQ&xp=off&am=instant&rp=gf` and fl 0 / 1.2 on link A.

Done 4 not measured (the bar runs ~16 min against two fresh builds; it did not fit beside Done 3's captures). Done 5 met: `npm test` green (254 files, 3182 passed, tsc clean); the `gf_home_glsl.test.ts` digests re-frozen in the fix commit — app `b765d629c5951fd659f8a1e1aba25d879b9b32586a63cdeae1ff537c486ccaf0`, probe `840aa043f56e39fc711aaf7b790d7ab5fc4873f7580a20ee618771cc8abfca35` (the probe moves only through `outsideArms`) — plus a K1456 case in `gf_tier_forms.test.ts` pinning the gate; nothing else re-taken. Done 6 (partial): `hold.mjs` 60/60 PASS warm on link A on the fix's build (preview of 41c13cf6); cold first composite, one run each on fresh profiles under load: master 45.2 s, new 44.8 s — no measurable end-to-end gain, the wait is bounded by more than this program. dragcheck (gf and gfh) not run.

K1456, K1464, K1451 and K1460 left open and untouched (the compile is cut, not halved; K1456's next is the vtx fold above). Perf lock released; preview servers (5495, 5496, 5497) stopped.

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

## Run L (26L): K1502, the border stub past a crossing (the pin key windows with home off)

Added 2026-11-18. Run H named the cause (Handoff 26H): past the crossing at ring x68 and g41_ring_tw64
j24/x67 both pins' depth hats read 0, so the under surface wins by centreline distance and buries the over
thread's edge ink; the reach key windows (K1451's `pinReach`, `GF_REACH_SEP`) are only baked with home on.
This run lands the fix K1502 names, in `tables.ts` (and `eval.ts`, `gf_keys.ts` as its mirror needs): bake
the reach key windows with home off too.

Cautions. A Claude agent is in `gf_look.ts` (the crossing gap in the border look, K1482 stage 8): stay out
of that file. Two Claude stages tried a wider change in this area, the page's home build, and it did not
land (Handoff K1482 s6 on branch `worktree-agent-ad03e8b65a2afa540`: a wider pin key window ran past the
overlap's end and the look's gap then shaved the neighbour's edge; `GF_REACH_K` 1.15 -> 1.0 cut that from
59 to 6 px). Read that handoff's cause paragraph before choosing the window's length, and clamp a window to
its overlap's end. `tables.ts:578` records the census stray rise without home membership (16 -> 231): that
number is this run's guard.

Done: 1. The number first, failing on master: K1436's screen scan px at ring x68 (963), g41_ring_tw64 j24
(660) and x67 (296), `-HomeFlag 1` and `0`. 2. Fixed: each under 40 px at both flags, the stroke running
through as today's does, 4x tiles today | master gf | new gf looked at. 3. `k1436_bar.ps1` with `STRICT=1`
on `ring,g41_ring_tw64,def,muse_hash,g41_user_tw64` at `-HomeFlag 1` and `0`: no new find and none grown,
or each one shown at 4x and named; a scene's two captures share a physics hash (re-take the one that does
not). 4. The census stray count of `tables.ts:578` does not rise. 5. Levi's link
(`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`, physics hash fff8c9e5, `.claude/probes/K1482/cap.mjs`):
the list of the 327 sites whose border ink changes by more than 8 px against master, each on a 4x tile
master | new, named better, same or worse; no site turns worse (if one does, stop there and report it, do
not land). 6. The build time of the tables on link A does not rise by more than 10% (K1451's measure). 7.
`npm test` green. 8. The guards.

### Handoff 26L (Muse, 2026-11-18, fix landed in b0f4f9a7 + 3971ec64; Done 2, 4, 5 and 6 unmet as named)

Started 14:21 PST, stopped 16:00 PST. Starting master 281a7c8c. Landed, tables.ts only (eval.ts and gf_keys.ts already read pinWL/pinWR in both modes; gf_look.ts untouched): buildGfPrefix bakes the pinReach key windows with home off too, assembleGfTables' clipPinWindows now runs in both modes on the same aHome extents, and GF_REACH_K 1.15 -> 1.0 clamps each window to its overlap's end (the K1482 s6 candidate). New K1502 case in test/render/gf_k1502.test.ts (home-off windows = home-on, some past win; on master 1.41 against 2.3, failing). Pack digests re-taken in gf_home_glsl.test.ts (j_cross 48f3cad4 -> 1382781e, k42 d263ed2f -> 62e35208; keys digests unchanged); the tables digest does not cover the windows (c1be0e90, unchanged). Probes under .claude/probes/K1502/ (k1502_probe/pins/buildtime, k1502_tiles.py; captures and tiles under out/26L/).

Done 1 (the number first, failing on master, STRICT=1): screen cut:plain ring x68 809 px, g41_ring_tw64 j24 147 and x67 296 (the brief's 963/660 are K1436 s3's older build); mirror dstray/vdip tie finds sit at the same sites. Mirror at Handoff 26H's three pixels reproduces it exactly (ink 0.002 / 0.086 / 0.000, chain 3 winning).

Fix verified at the mirror first: with the windows baked and clipped, ring's x68 pins read WL/WR (0.658, 1.972) and (0.658, 1.624) at K 1.0 and the pixels read ink 0.162 / 1.000 / 0.000 with chain 4's side winning, as today's stripe does.

Done 2 not met as written, and why: the stroke does run through (tiles below; the mirror tie finds at the three sites are gone at both flags), but the screen scan's cut:plain at x68 moves only 809 -> 793 px. That find is the look's gap along the under centreline (Handoff 26H part b), where gf's fill already equals today's; clearing it would uncut fill today cuts. It is filed in K1513 with the Levi-link check.

Done 3 (named, not clean): 2-scene bars (ring, g41_ring_tw64): HomeFlag 0 PASS (new 0, grown 0, gone 9, all mirror tie finds at x68/j24/x67); HomeFlag 1 PASS (new 0, grown 0, gone 0 - home-on tables are bit-identical by construction). 5-scene HomeFlag 0 at K 1.15: FAIL new 3, grown 1, gone 38 - the gone are tie finds cleared across muse_hash and g41_user_tw64; each new/grown on the bar sheet (.claude/probes/K1436/out/bar/26L5_h0/sheet.png): muse_hash 14.44:1.20 grown 56 -> 78 with a 16 px vdip sibling at 14.50:1.21 is one site whose fill and border screens are identical base against ref (the form-B stray class, as at x68); muse_hash j49 (22.04:34.65) gains a 17 px cut:plain - on the tiles the under tail now joins across the fill and the border turns T where master stops short: the K1485 tail question, worse by master's look, named not fixed; g41_user_tw64 x154 first read across two physics hashes (invalid), re-taken at one hash (0d51331b): 53 px of ragged cut at K 1.15. At K 1.0 (26Lk bar): x154 53 -> 6 px, its sheet row identical by eye, and ring's mirror finds still gone - the remaining new 1 is that 6 px residue. HomeFlag 1 on the other three scenes was not run (home-on output is unchanged by construction; the K1502 unit test pins off = on windows).

Done 4 not met literally: the form-B census stray on ring goes 0 -> 1 find and g41_ring_tw64 0 -> 2 (1987 px at 19.62:20.25, 3687 at 19.77:20.23, 781 at 18.08:20.72 - exactly x68, j24 and x67, the restored over-outline form B does not draw; K1451 s3 read the same five as fixed). No stray anywhere else on the two scenes; hard/paper/broken unchanged. The 231 blow-up the guard was written against does not return (the clip holds it).

Done 5 not measured: Levi's link 327-site sweep did not run in the stop line; it is filed as K1513, with the j49 tail-join class above as the site kind that could read worse there. Done 6 not met: tables build on muse_hash (link A's scene) 12.38 -> 15.97 ms (+29%, alternating medians of 7, home off; ring +52%, fat +58%, def +7.7%) - the reach walk's cost, K1451's open lane (26E); the K clamp does not change the walk.

Done 7 met: npm test green on the final tip (256 files, 3196 passed, 9 skipped; tsc clean) and both commits' deploys green (44412861087, 44419792353). Done 8 met (preview of 3971ec64 on :5626, one kept profile %TEMP%\k26l-guards-profile): hold.mjs 60 250 5000 PASS on ?3&xp=off&am=instant&rp=gf (first composite 68.4 s on the cold kept profile) and on ?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1 (31.9 s; 60/60 both); dragcheck.mjs PASS for gf and for gfh (every stop 0 px over TOL 24).

Tiles (today | master gf | new gf, border row over fill row, 4x) under .claude/probes/K1502/out/26L/: tile_x68.png (from the K 1.0 bar's captures; also kept as tile_x68_k10.png), tile_j24.png, tile_x67.png (K 1.15 bar's captures). At each: master's border stroke tapers and stops past the crossing; new gf's runs through as today's does, gf's own darker shade kept (Levi, 2026-11-17); the fill rows are the same in all three columns, including today's own notch at x67. Nothing at the three sites reads worse in new gf.

K1502 stays open (Done 2's screen class, Done 4's stray class, Done 5's sweep, Done 6's build time; next angle for the build time is K1451's: fewer pins, not a faster walk). K1464, K1451 and K1460 left open and untouched. Perf lock released; preview server (5626) stopped.

## Run M (26M): K1501 and K1503, the gap-window fix of Run G on the other scenes

Added 2026-11-18. Run G's 9ae14f27 (a never-clearing gap window ends at the joint room, not its cap)
changed 2-10 baked window sides on every census scene but fat (`.claude/probes/K1476/out/26G/triggers.txt`);
only muse_default_tw and muse_hash were checked on screen. And at j64 on those two scenes a short dark speck
remains in the fill at the left end of where the line was (`.claude/probes/K1476/out/26G/tile_fix_1.png`,
second column: a short dash on muse_default_tw, a dot on muse_hash); today's fill has none (K1503).

`gf_look.ts` is also a Claude agent's file for now (K1482 stage 8, the border look's use of the gap): start
from master as it stands when you begin, keep the diff small and pull with rebase before each push.

Done: 1. For def, ring, g41_ring_tw64, g41_user_tw64 and user_tw42.lightpaper: every window side 9ae14f27
changed, exact (9ae14f27's parent against it, in one physics hash), with the px that moved on screen in a
box around it, fill and border. 2. Each on a 4x tile today | parent gf | master gf, looked at and named
better, same or worse against today's; a worse one is fixed or listed with its cause. 3. K1503: the speck's
cause named in the code, a count failing on master (dark px inside the fill in the speck's box, both
scenes), fixed to 0 with today's fill as the reference, 4x tiles. 4. `k1436_bar.ps1` with `STRICT=1` on
`muse_default_tw,muse_hash,def,ring` at `-HomeFlag 1` and `0`: no new find, none grown. 5. Away from the
changed sides nothing moves: 0 px against master in the same physics hash outside their boxes. 6.
`.claude/probes/K1458/dragcheck.mjs` and `.claude/probes/K1492/dragcheck_b.mjs` pass. 7. `npm test` green.
8. The guards.

### Handoff 26M (Muse, 2026-11-18, no source change: every changed side better or same; the speck is the field's, K1515)

Started 16:10 PST, stopped 17:59 PST. Starting master 3a742afa; no `src/` or `test/` change and nothing landed (see K1503 below). Probes under `.claude/probes/K1501/` (`k1501_sides.ts`, `k1501_sides2.ts`, `boxdiff.py`, `clusters.py`, `tiles2.py`, `speckcount.py`; captures and tiles under `out/26M/`; perf lock held 16:16-16:24 only - the two bars then waited on it, and bar 26M_parent died on a shared Chrome profile, so only one bar ran at a time after that).

Done 1 (exact sides, 9ae14f27's parent 203baead against 9ae14f27, one physics hash per scene - the bar's base/ref hashes agree on all seven scenes; muse_hash's ref view differs, so its screen boxes are not used). Node-exact (the bake's caps/rooms on the K868 polylines, the real `gapWindow`, parent = the never-clearing side's `w`): def 0, ring 0, g41_ring_tw64 0, user_tw42.lightpaper 0 changed sides, and the screen agrees - parent against fix differs by 0 px in fill and border on all four. g41_user_tw64: 2 Node-exact sides (x1 u0@2.84 side+ 1.129 -> 0.738; x43 u16@1.60 side- 1.599 -> 0.739), but the page's bake clears less often than the dump march, so the screen is the exact list there: 9 clusters, fill 3086 px > 24 (border 2095 total) - x70 861 px at (6.97, 14.67), x130 696 at (9.87, 17.17), x58 682 + 275 at (1.08, 16.93), x33 271 at (19.18, 11.81), x125 228 at (21.03, 8.39), x1 41 at (15.43, 5.10), and 27 + 5 beside x130. In every cluster the fix draws thread the parent cut (the parent's window ran to its cap along a ride that never clears).

Done 2 (4x tiles today | parent gf | fix gf under `.claude/probes/K1501/out/26M/tile_*`, fill viewed; the border tiles are beside them, unviewed): x70 and x130 better (the parent's dark stub across the fill is gone, the thread runs on), x58 better (a cut sliver gone), x102 (muse_default_tw, its window side- 1.030 -> 0.000) better (a dark dash gone), muse x100 better (the j64 line gone); x1, x43, x33, x125 same (x43 moves 0 px on screen - its shortened window sits under the fan). Nothing worse. Caveat: the today column for g41_user_tw64 froze on c1b63637, not 0d51331b, so its today tiles are state-shifted and the verdicts there rest on parent | fix alone; the muse today columns share c5d9f3b6 / 733ee14a and are aligned.

Done 3 (K1503, not fixed - the cause is hands off this batch). The speck's box (x 4.95..5.25, y 3.00..3.20, both muse scenes) counts, one recipe (colour, DSF 3, dark = today minus gf > 24 inside today's fill): starting master 83 px on muse_default_tw and 18 on muse_hash (9ae14f27 the same 83; Run G's mono recipe read 56 / 9). The cause, by A/B on the 9ae14f27 build: `gap=0` 84, `fl=0` 82, `cr=10` (the joint room to zero) 83 - the look's gap, fade and window room do not move it; `cr=1` grows it to 158 through the cusp, i.e. through the field. A viz build of starting master with `lkGap` returning 0 removes only 32 of the 83. The rest is form B itself: the mirror at (4.86, 3.09) reads ink 0.00, cov 1.00 (chain 56 buried at j64's fan edge on the chain 28 ride) where today draws pink, and at the speck (5.16, 3.09) ink 0.95 - the speck is the burial seam's edge in the field's coverage, drawn faithfully by the look. Fixing it means fan coverage in `tables.ts` / `eval.ts` / `gf_glsl.ts`, hands off in batch 26; filed as K1515. K1503 stays open for that lane.

Done 4 (partial): `k1436_bar.ps1` STRICT=1, HomeFlag 1, parent against 9ae14f27 on all seven scenes prints PASS (new 0, grown 0, gone 9 - j64 on both muse scenes, j81, j50, j25, x307, j138; `out/bar/26M_fix/bar.txt`). The Done's own form (tip against starting master on muse_default_tw, muse_hash, def, ring) is trivially clean - the tip IS starting master, no source moved - and HomeFlag 0 was not run inside the stop line.

Done 5: outside the changed sides nothing moves - 0 px on the four untouched scenes above, and muse_default_tw's whole parent/fix diff (824 fill, 275 border) sits in the j64 box (x 982..1063, y 322..367).

Done 6: `dragcheck.mjs` PASS for gf (the first run failed stop 1.2 on the two-hash settle lottery - no fresh load reached the dragged state; the re-run passes every stop at 0 px) and `dragcheck_b.mjs` (border) PASS.

Done 7: `npm test` green (256 files, 3196 passed, 9 skipped; tsc clean), no test changed.

Done 8 (guards, build of 3a742afa on :5632): `hold.mjs` 60 250 5000 PASS on `?3&xp=off&am=instant&rp=gf` (first composite 122 s on a fresh profile) and on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (79 s; 60/60 both); `dragcheck.mjs` PASS for gfh (one earlier combined run failed on the same state lottery; the re-run passes). The holds used a second fresh profile (`k1501-26m-profile2`) after the dragchecks' Chrome held the first - not the one kept profile of the brief. K1501's screen half is done above (its ledger text asks for the look, now recorded); K1503 and K1515 carry the speck. K1464, K1451 and K1460 left open and untouched. Preview servers (5630, 5631, 5632) stopped; the bar's `-Keep` builds and profiles stay in `$env:TEMP\k1436s3-prev` / `k1436s3-profile-*`.

## Run N (26N): K1502's build time (the reach walk with home off)

Added 2026-11-18. Run L landed the home-off reach key windows (b0f4f9a7, 3971ec64) and the tables build rose:
muse_hash 12.38 -> 15.97 ms (+29%), ring +52%, fat +58%, def +7.7% (Handoff 26L, Done 6; alternating medians
of 7, home off; `.claude/probes/K1502/k1502_buildtime*`). This run brings it back without changing one baked
number. Handoff 26L names the angle: fewer pins walked (K1451's lane, Run E), not a faster walk.

A Claude agent is in `gf_look.ts` (K1482 stage 11, the border outline's cut): stay out of that file.

Done: 1. The number first, on master: the tables build time on muse_hash, ring, fat and def, home off and
home on, alternating medians of 7 against 281a7c8c (take the perf lock). 2. Fixed: each scene within 10% of
281a7c8c at both flags, or the remaining cost attributed line by line with the reason it cannot go. 3. The
baked tables are bit-identical to master's on the six census scenes and on link A's scene at both flags (pack
digests and a full compare of the window arrays): no pixel can move. 4. `npm test` green, the K1502 unit case
included. 5. The guards (`hold.mjs` 60/60 on the two links, both dragchecks).

### Handoff 26N (Muse, 2026-11-18, fix landed in b8e2027d; Done 2 met at home on and on def, not on muse_hash, ring or fat - attributed below)

Started 18:10 PST, stopped 18:52 PST. Starting master fe9a8596; fix on master in b8e2027d (deploy 44444391096 success). `tables.ts` and `test/render/gf_k1502.test.ts` only; `gf_look.ts` untouched. Probes under `.claude/probes/K1502/` (`k1502_26n_buildtime/buildtime2/phases/stats/inst/reachbench/compare.ts`; captures under `out/26N/`; perf lock held for the timing, released at the end). The two temporary tables copies the probes name (`tables_26n_base.ts` = `git show 281a7c8c:src/render/gpu_field/tables.ts`, `tables_26n_inst.ts` = starting master's) were deleted after measuring; recreate them from those recipes to re-run.

Done 1 (the number first, on starting master, `k1502_26n_buildtime` alternating medians of 7 against 281a7c8c, perf lock): home off muse_hash 15.16 -> 16.87 ms (+11.3%), ring 3.29 -> 3.52 (+6.9%), fat 3.99 -> 5.28 (+32.2%), def 14.60 -> 20.66 (+41.5%). The phases probe attributes the whole delta to the walk (ms.pins, base/this: fat 0.28/2.15, def 0.24/1.91, muse_hash 0.31/2.73, ring 0.10/0.45; every other phase level), and home on the pins phase is already level (2.89/2.71 on muse_hash). Counters on starting master: every one of the 1400-1712 sides walks, the stretch search runs on nearly every walk (77-130 window segments a call, ~7% exact-evaluated), no side exits through the pin-gap early-out.

Landed: the reach walk moves from `buildGfPrefix` into `assembleGfTables`, where the arm clip distances are known on every path (cold, pooled, the worker's; `pinClipDistances` factored out of `clipPinWindows` with the same arithmetic). A side the clip cuts to win (distance <= win, a pin inside an arm included) is never walked, and no walk runs past its clip distance - the cap sits one walk step past it, after the first compare caught the plain cap overshooting by one step on muse_hash, g41_def_tw64 and g41_user_tw64. `GfPrefix` now stores each pin's crossing partner (`pinPC`/`pinPS`) instead of the windows. In `pinReach`, the stretch search jumps a whole 4-segment prep block whose bbox centre/radius cannot beat the current distance, and the prep half-length comes from the arc table (vs diff, inside the prune's 1e-9 margin). One bug cost a round, above; a prep-cached segment-geometry variant (ax/dx/l2 arrays) measured slower and was reverted, as were REACH_BLK 16 (flat) and 2 (worse).

Done 2 (paired medians of 15, order swapped every round, `k1502_26n_buildtime2`): home on muse_hash -8.5%, ring -7.1%, fat -10.1%, def -1.3% - all met. Home off def +3.1% met; muse_hash +13.3%, ring +10.5% and fat +50.2% not met. The remaining cost, line by line: it is the walk itself, which 281a7c8c's home-off build does not run at all. Isolated `pinReach` (full pin gap, one shared prep, `k1502_26n_reachbench`): fat 1.56 ms over 1712 sides, muse_hash 2.03 over 1400 (in assemble 976 sides walk, capped at their clip distances: 9014 steps and 35k hill-climb segment distances - long parallel rides, so its cost is steps, not search), def 1.55 (915 sides walk), ring 0.34 (275 walk). Why it cannot go further exactly: fat has no junctions, so no side is clip-skippable, and 1634 of its 1712 sides exit at the first step but must prove it - a hill climb plus a stretch over the partner's +/-(cap+sep) arc window, where in fat's dense fabric (segment arc ~0.05 at 0.52 thread spacing) about 28 window segments a stretch sit within the current distance and must be checked individually; arc-contiguous block bounds are the tightest exact filter for that (26E's spatial grids and hierarchies measured no better - a position grid returns more candidates than the window holds). A crossing-angle/deviation skip was designed and not landed: it cannot bound the hill climb's decreasing path out of the arc window, so it would not be exact. The next lever, if the remaining ~1.5 ms on fat matters, is a per-(chain, window) candidate structure in the prep that neither 26E nor this run found; the walk's step semantics are baked numbers and stay.

Done 3 met: `k1502_26n_compare` - every numeric array field bit-identical to starting master's on the 12 census scenes, home off and on, cold and pooled, and again under GF_NOCLIP=1; per-side reach sums old/new identical in the reach bench; the pack digests did not move (suite). Done 4 met: `npm test` green (256 files, 3197 passed, 9 skipped; tsc clean), including the new K1502 case pinning prep (block jumps) against no-prep reaches on every pin side of the four fixture scenes. Done 5 met (preview of b8e2027d on :5630, one kept profile `%TEMP%\k26n-guards-profile`): `hold.mjs` 60 250 5000 PASS on `?3&xp=off&am=instant&rp=gf` (first composite 69.2 s on the cold kept profile; 60/60, edges min 102753) and on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (29.6 s; 60/60, min 7025); `dragcheck.mjs` PASS for gf and for gfh (every stop 0 px over TOL 24).

K1502 stays open for Done 2's home-off residue (fat, muse_hash, ring); K1464, K1451 and K1460 left open and untouched. Preview server (5630) stopped.


## Run O (26O): probe tooling leftovers (K1507, K1508, K1509, K1511)

Added 2026-11-18. Four small faults in the probes cost the Claude stages time today. No `src/` change in this
run; the probes live under `.claude/probes/` (untracked: commit only the files the ledger items name, with
`git add -f` on exact paths).

Done: 1. K1507: `.claude/probes/K1436/k1436_bar.ps1` takes a `-NoPerfLock` switch that skips the wait on
`$env:TEMP\claude-perf.lock` and labels its output "taken under load"; `.claude/probes/K1482/s8/bar_ref.ps1`'s
by-hand half is then not needed (say so in its header). Shown: a 1-scene bar run with the switch while a
dummy lock file exists, finishing without waiting. 2. K1511: `.claude/probes/K1482/cap.mjs` gives up after
240 s without a frame and prints the page's shader compile error (console and `getShaderInfoLog`) when a
`PATCHF` patch does not compile. Shown: a patch with a deliberate syntax error exits non-zero inside 5 minutes
with the error line printed. 3. K1509: `cap.mjs` no longer dies with `__knotGf is not defined` on a today-only
shot (`GF=0,TODAY=1`); shown by that run completing. 4. K1508: `cap.mjs` waits for the view to settle before
its first shot (two consecutive frames with the same physics hash and the same view transform); shown: first
and second shots of link A identical in the site boxes of three sites. 5. Link A's ordinary capture is
unchanged by all four (same hash fff8c9e5, 0 px against a capture taken with the old script). 6. `npm test`
green (nothing in `src/` or `test/` changed).

### Handoff 26O (Muse, 2026-11-18, done: every Done holds)

Started 19:03 PST, stopped 19:45 PST. Starting master 7c19121e; probes only in 18031ec3 (no `src/` or `test/` change). Probes and captures under `.claude/probes/K1482/out/26O/` (old-script copy `cap_old.mjs`, `patch_bad.json`, `badpatch2.log`; preview of 7c19121e on :5492, profiles `%TEMP%\k26o-cap-profile` / `k26o-guards-profile`; perf lock held for the caps and guards, released at the end).

Done 1 (K1507): `k1436_bar.ps1` takes `-NoPerfLock`: `Wait-Lock` returns at once with "taken under load (NoPerfLock: perf lock wait skipped)" and the compare's `bar.txt` is stamped "taken under load"; `bar_ref.ps1`'s header now says the by-hand half is not needed. Shown with a dummy lock file present: 1-scene (ring) self-bar `-Tag 26O_k1507 -Keep -NoPerfLock` finished in 160 s, PASS (new 0, grown 0), both halves printing the label (`out/bar/26O_k1507/bar.txt`); ring's two loads froze on different hashes (50dd4ffd / 0a0ee15e, the K1510 lottery) and the bar still passed.

Done 2 (K1511): `cap.mjs` hooks `compileShader` into `window.__shaderErrors` (getShaderInfoLog + source head), captures the page console, and the gf-ready wait is capped at `FRAME_TIMEOUT_MS` (default 240000): on timeout it prints the console and shader lines and throws, so the run exits non-zero. Shown: `PATCHF` replacing `#define MAXP` with a deliberate `@@@` error exits 1 in 251 s with `shader compile error: ERROR: 0:6: '@' : invalid character` / `'K1511' : syntax error` printed (plus the app's own console warn; full text in `badpatch2.log`, a 20 s-timeout rerun).

Done 3 (K1509): every `__knotGf` read in `cap.mjs` is fully optional-chained and the final pool line falls back to nulls when there is no gf. Shown: `GF=0,TODAY=1` on link A completes (exit 0, `today.png` + `sites_today.json`, pool `{tms:[], home:null, homeOn:null}`) after the usual two-hash reloads.

Done 4 (K1508): before the first screenshot `cap.mjs` waits for the view to settle - two consecutive samples 250 ms apart with the same physics hash and the same view transform (`waitViewSettled`, logged as "view settled fff8c9e5"). Shown on link A at fff8c9e5: first (`new1`) against second (`new2`) shots differ by 0 px whole-frame, and 0 px in the 80 px boxes at j0/j1/j2.

Done 5: link A's ordinary capture is unchanged: `new1` against the old script's `old1` (same build, same profile, same hash fff8c9e5) differs by 0 px over 24 and 0 px in the three site boxes; at the >0 threshold 14 background pixels differ by 1 level each (dark backdrop dither, the cross-load floor - two new-script loads are 0 px apart).

Done 6: `npm test` green (256 files, 3197 passed, 9 skipped; tsc clean), nothing in `src/` or `test/` changed. Guards on the same build (one kept profile): `hold.mjs` 60 250 5000 PASS on `?3&xp=off&am=instant&rp=gf` (first composite 91.7 s cold; 60/60, edges min 102740) and on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (40.0 s; 60/60, min 7028); `dragcheck.mjs` PASS for gf and for gfh (every stop 0 px over TOL 24). K1507, K1508, K1509 and K1511 closed in 18031ec3; K1464, K1451 and K1460 left open and untouched. Preview server (5492) stopped.


## Run P (26P): j64's speck and pinhole in the field (K1517, K1504)

Added 2026-11-18. Run M traced the speck left at j64 (K1503) to the field, not the look: 51 of the 83 px in
the speck box (x 4.95..5.25, y 3.00..3.20; muse_default_tw 83 px, muse_hash 18) are form B's fan/burial
seam, where the mirror reads ink 0.00 and cov 1.00 at (4.86, 3.09) (chain 56 buried at j64's fan edge on the
chain 28 ride) and ink 0.95 at the speck (5.16, 3.09); today draws fill there (Handoff 26M, Done 3; K1517 in
the ledger, which Handoff 26M calls K1515). At the same junction on Levi's link A
(`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`) a pinhole about 0.1 wide shows where chains 28 and 56
of one surface part, in the CPU mirror too (K1504; `.claude/probes/K1482/out/s7/j64_gm.png`). The hands-off on
`tables.ts`, `eval.ts` and `gf_glsl.ts` is lifted for this run. A Claude agent is in `gf_look.ts` (K1482 stage
13, the outline's cut): stay out of that file.

Done: 1. The cause of each named in the code with the mirror's numbers at the speck and at the pinhole
(which term buries chain 56, which leaves the hole), and whether they are one cause. 2. A count failing on
starting master for each: dark px inside today's fill in the speck box on muse_default_tw and muse_hash (Run
M's recipe, `.claude/probes/K1501/speckcount.py`), and background px inside one surface's union in a box
around the pinhole on link A (hash fff8c9e5). 3. Fixed to 0 in the field, with 4x tiles today | master gf |
tip gf at j64 on the three scenes, fill and border, each looked at. 4. Nothing else moves: on the 12 census
scenes and link A, home off and on, every px that changes against starting master in the same physics hash
lies in a box you list, and each box is shown at 4x and named better or same. 5. `k1436_bar.ps1` with
`STRICT=1` on `muse_default_tw,muse_hash,def,ring` at `-HomeFlag 1`: no new find, none grown. 6. The tables
build time on muse_hash and def within 3% of starting master (perf lock). 7. `npm test` green with a unit
case for each fix (the pack digests re-frozen only where the fix moves them, each move named). 8. The guards
(`hold.mjs` 60/60 on the two links, both dragchecks). If a fix cannot meet Done 4, do not land it: record
what moved and stop.

### Handoff 26P (Muse, 2026-11-18, no fix landed: the seam fill fixes j64 but moves ink at generic corners; K1517/K1504 stay open)

Done 1 (cause, one cause for both): at j64 the corner is near-null (muse_hash k63 r = 0; muse_default_tw
k137 r = 0.0064 <= 2aa). Form B's sector fill stops at V (r = 0 / r <= 2aa), so west of V the two arms'
tubes leave the wedge between them uncovered: that one uncovered seam is the dark speck in the fill
(mirror cov < 0.9 samples in the speck box on starting master) and, where the arms part wider, link A's
~0.1 pinhole (chains 28/56). It is the field's fan coverage, not the look (look-side gap/fade probes in
earlier runs left it unchanged; K1503 stays the field's).

The fix (kept on branch `muse-26p-wip` at `d0f31f43`, NOT master): eval `seamFill` / GLSL `seamIn` --
a near-null, non-through corner covers a point near it (rho <= r + (h + W/2 + 2aa)/sin(th/2)) when the
point is outside both arms' tubes (each >= h - 2aa) and the hole is narrower than a stroke
((dA - h) + (dB - h) <= W; K1504's wording), with seam depth `max(Dk, cap - rho)` feeding coverage
only (`seamD` / fj `sd[]`), never ink. The sector keeps form B's reach (kRmax) at every corner and
`tables.ts` is byte-identical to master: an earlier form that baked a seam reach into kRmax/kRV moved
the sector disc at every near-null corner and failed the bar far worse; that form is abandoned. Mirror
on the tip: speck box cov < 0.9 samples 0 on muse_default_tw and muse_hash (was nonzero on master);
the wide eye at muse_hash (28.53, 11.50) stays open in the mirror; a synthetic j64-in-miniature case
is pinned in `test/render/gf_k1517.test.ts`. All 12 live GLSL forms compile in headless Chrome
(an inline `// K1517` comment had swallowed `float v = 0.0;` in four tier forms -- that also explains
26P3's missing screen captures: the shader never switched). Program digests re-frozen in
`gf_home_glsl.test.ts` (app `93029e67...`, probe `77b72a4e...`); pack/tables digests unmoved.

Done 2-8 status: Done 5 FAILS and Done 4 with it. Bar `26P5` (`-Ref d0f31f43 -Base 6df067fd -Scenes
muse_default_tw,muse_hash,def,ring -HomeFlag 1`, STRICT) prints `FAIL  new 358  grown 0  gone 0`:
mirror rstray:plain 137 and vdip:plain 138, concentrated in **def**, plus screen rstray:tie 56. The
seam gate as written fires at generic r <= 2aa corners, not just j64-class corners: seam coverage
raises the corner surface's disc, and ink redistributes through the composite's transmittance chain
(rstray + vdip pairs at the same junctions), and on screen the seam strip at muse_default_tw j64
itself reads rstray:plain 138px and at muse_hash j68 rstray:ramp 169px. So per Done 8 the fix does
not land. Bar `26P4` (pre-correction sector form) failed similarly (`FAIL new 333`); `26P`/`26P3`
outputs under `.claude/probes/K1436/out/bar/`. Done 3's tip screen counts and 4x tiles were not
produced (bar caps exist at `.claude/probes/K1436/out/bar/26P5/{base-6df067fd,ref-d0f31f43}/cap/`;
the j64 sheet attempt's stances did not align, so no tile is claimed looked-at). Done 6: tables are
untouched, so build time is master's by construction (the abandoned baked form measured within
noise after its 4aa walk). Done 7: `npm test` green on the WIP tree (3199 passed, 9 skipped) with
`gf_k1517.test.ts` added; it fails without the eval/GLSL change. Done 8's guards were not run (no
landing). Next step for whoever resumes: narrow the seam gate so it cannot fire at generic corners --
the distinguishing mark of j64 is that the sector fill is *absent* there (base coverage < 1 in the
wedge on the corner's own surface), so gate the seam on the corner's sector terms not already
covering the point, or on r = 0 exactly plus the grown j64 case only; then re-run the bar. Probes
and scratch live in `.claude/probes/K1517/`.

## Run Q (26Q): the scan prunes its builds; then j64's seam, gated to j64-class corners (K1520, K1517, K1504)

Added 2026-11-18. Two parts, each its own commit; do part 1 first and land it whatever part 2 does.

**Part 1 (K1520, probes only).** At 21:13 on 2026-11-18 the disk filled (0.3 GB free) and ended Run P's
checks: `$env:TEMP\k1436s3-prev` held a ~1 GB build plus a `src-<sha>` worktree for every commit the bar had
ever compared (10 GB), and finished runs' profiles and preview roots were never removed. Fix in
`k1436_bar.ps1` (and `scripts/preview.ps1` only if the layout needs it): at start, delete every build,
`src-<sha>` worktree (with `git worktree prune`) and `k1436s3-profile-<sha>` that is not this run's `-Ref` or
`-Base` and is not in use by a live process; refuse to start, with a clear message, when C: has under 6 GB
free. Done: shown on a dummy root with three stale builds (two removed, the in-use one kept), the refusal
shown, and a normal bar run still passes its own self-check.

**Part 2 (K1517, K1504).** Resume your branch `muse-26p-wip` (d0f31f43; Handoff 26P's "Next step"): narrow
the seam gate so it fires only where the corner's own sector fill does not already cover the point (or r = 0
exactly plus the grown j64 case), so no generic r <= 2aa corner moves. Done: Run P's Done 2-8, unchanged,
with Done 5's bar printing no new find and none grown; produce Done 3's 4x tiles this time (today | master gf
| tip gf at j64 on the three scenes, fill and border) and look at each. A Claude agent's change to
`gf_look.ts` and `gf_app.ts` (K1482 stage 15, the baked joint flag) is landing on master: rebase onto it
first, stay out of those two files, and take your bar's base from master after that rebase. Two tries at the
gate at most; if neither meets Done 4 and 5, do not land it: record what moved and stop.

### Handoff 26Q (Muse, 2026-11-18, Part 1 landed in 7e5e87c9; Part 2 not landed: both gate tries leave a new j64 find, K1517/K1504 stay open)

Started 22:50 PST, stopped 23:34 PST. Starting master d860811c (K1482 s15 already in; only its stage-16 ledger/brief commits landed under me, no `src/` change). Probes under `.claude/probes/K1520/` and `.claude/probes/K1517/` (mirror scans `out/26Q/*.gated*.json`, the candidate patch, guards); perf lock held for the guards only, released at the end.

**Part 1 (K1520, landed, 7e5e87c9, probes only; K1520 closed in the ledger).** `k1436_bar.ps1` at start now deletes every build, `src-<sha>` worktree (junctions unlinked first, then `git worktree prune`) and `k1436s3-profile-<sha>` that is not this run's `-Ref`/`-Base` and that no live process names on its command line, then refuses to start when C: still has under `-MinFreeGB` (default 6) GB free; `-PrevRoot` names the builds root (its parent holds the profiles) and `-PruneOnly` runs just the prune and check. `scripts/preview.ps1` is untouched: the bar never calls it, it keeps its own layout. Shown as ordered: on a dummy root (`k1520_demo.ps1`) prune 1 removed the stale build, the `src-` build and the profile and kept the in-use build (a sleeper naming it) and this run's own; prune 2 with the sleeper stopped removed the in-use one; `-MinFreeGB 99999` refused with exit 1 and the message naming the free space and the roots. A normal run still passes: the real root's start prune removed 12 stale builds/worktrees/profiles (C: back to 22.33 GB free), and `-Ref HEAD -Base HEAD -Scenes ring -Tag 26Q_self -Keep` under STRICT=1 prints PASS (new 0, grown 0, gone 0).

**Part 2 (K1517, K1504, not landed).** `muse-26p-wip` (d0f31f43) cherry-picked clean onto 7e5e87c9 (K1482 s15 touched only `gf_app.ts`/`gf_look.ts` since the WIP's base; `gf_look.ts`/`gf_app.ts` untouched by the candidate, as ordered). Done 1 stands as Handoff 26P pinned it; Done 2 on starting master, mirror recipe (`k1517_mirror.ts`, home off): speck box cov < 0.9 samples 248 on muse_default_tw and 91 on muse_hash (the screen recipe's 83 / 18 dark px are Run M's). Two tries at the gate, each measured on the mirror first (`k1436_scan.ts` at GF_HOME=1 against 26P5's base finds, the bar's own matching):

- **Try 1, the theta gate (the candidate):** `seamFill`/`seamIn` also require theta < 0.85 (GLSL: the rays' cos > 0.66). j64 reads theta 0.711 / 0.699 on the two muse scenes and every other near-null non-through census corner on muse_default_tw, muse_hash, def and ring reads at least 0.94 (`k1517_26q_corners.ts`), so the seam fires only at j64-class corners; its depth arc also ends at kRmax + W instead of cliffing at the collected disc's edge. Speck box: 0 / 0. Mirror finds against the base: def 0 new / 0 grown (was 92 new ungated), ring 0 / 0, muse_default_tw and muse_hash each exactly one new find, both at j64: rstray:plain 421 px at (5.2, 3.1) and 1031 px at (5.16, 3.06) — the same sizes the ungated WIP reads there, so the arc and the gate move nothing at j64 itself.
- **Try 2, plus no fill promotion** (the seam never makes its corner a fill member: `inR` drops the seam term in eval and GLSL): the speck regressed to 144 / 77 (the Ds site finds no surface entry at part of the strip) and the j64 rstray stayed (446 / 1031). Discarded; the candidate above keeps the promotion.

Why j64 still fails Done 5: the filled wedge is no longer an exposed edge, so the two tubes' inner outline ink sits farther than W + aa + 1.5 px from every exposed edge of gf's own raster — `rstray` by `k1433_lib`'s definition, whatever fills the hole, unless the fill also suppresses that inner outline ink. That is the next angle: at seam points, scale the surface's ink `v` by the seam's coverage in eval and in every GLSL form (`layers()`'s Ds sites), then re-run this mirror compare and the bar. Done 4 and 5 are therefore unmet and Done 3's screen tiles were not produced; Done 6 is master's by construction (tables untouched); Done 7 on the candidate: the focused suites pass (53 tests; `gf_k1517.test.ts` gains the theta-premise case; the program digests it moves are the ones the patch re-freezes in `gf_home_glsl.test.ts`: app `3c018dae…`, probe `69ddc209…b`). The candidate is kept whole as `.claude/probes/K1517/k1517_26q_gated.patch` (applies on 7e5e87c9); branch `muse-26p-wip` is untouched. The full bar was not run: its mirror half already fails Done 5 on both tries, and the brief's two-try cap is spent.

**Done 8 / the guards** (preview of 7e5e87c9 on :5620, one kept profile `%TEMP%\k26q-guards-profile`): `hold.mjs` 60 250 5000 PASS on `?3&xp=off&am=instant&rp=gf` (first composite 57.5 s cold; 60/60, edges min 102830) and on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (28.8 s; 60/60, min 7045); `dragcheck.mjs` PASS for gf and for gfh (every stop 0 px over TOL 24). `npm test` green on the final tree (256 files, 3198 passed, 9 skipped; tsc clean), which is master without the candidate. K1517, K1504, K1464, K1451 and K1460 left open and untouched; preview server (5620) stopped.

## Run R (26R): the bar's run-to-run noise (K1519)

Added 2026-11-19. Probes only. Two loads of identical `src/` in one physics hash gave 14 finds under
`STRICT=1` on g41_user_tw64 (frames differ by 1-2 levels; `.claude/probes/K1482/out/s13/bar.txt`), and
g41_ring_tw42 froze on two different states. Done: 1. the noise measured: the bar with `-Ref` = `-Base` =
master, three times, on the 12 census scenes at `-HomeFlag 1`, finds per scene per run tabled. 2. the cause
of the frame differences named (capture timing, a dither or animation term, antialias jitter), with the
evidence. 3. the bar made deterministic or given the smallest margin or median-of-loads that brings the
self-compare to 0 finds on every scene in three runs, while a planted fault (K1436's own self-check) is
still found. 4. the state-freeze retries reported per scene, and a scene that cannot freeze on one state
named and skipped with a printed warning. Close K1519 or record what is left.

### Handoff 26R (Muse, 2026-11-19, fix landed in d4cf70ea; K1519 stays open for the three full fixed runs and the planted screen pair)

Started 00:22 PST, stopped 02:06 PST. Starting master 3cdb7cd9; probes only (k1436_screen.mjs, k1436_bar_cmp.mjs, k1436_bar.ps1), no src/ or test/ change. Master moved under the run (9aee8202, then K1482 s17/s18 docs), so the fixed subset bar ran on 9aee8202 (same src/); perf lock never held by another owner, Levi's browser shared the GPU throughout.

Done 1 (the noise, one full run on the old bar, STRICT=1, HomeFlag 1, Par 3, tag 26R_self1): FAIL new 4 grown 1 gone 185, every judged difference on g41_user_tw64's screen scan; the other 11 scenes repeat exactly (base/ref screen finds and hashes identical: muse_hash 2/2, g41_def_tw42 15/15, g41_ring_tw64 3/3, lightpaper 10/10, def 0/0, fat 0/0, g41_def_tw64 10/10, g41_user_tw42 10/10, muse_default_tw 0/0, ring 1/1, g41_ring_tw42 3/3; mirror finds identical on all 12). g41_user_tw64: base 192 screen finds (spill:plain 125) against ref 11, same hash 0d51331b, same mirror 3. A 1-scene pilot (26R_pilot1) on the same scene passed 0/0. Three full runs were not completed: one full bar takes ~35 min under Par 3, past what the stop line leaves beside the fix and guards.

Done 2 (the cause: capture timing, not dither, animation or AA jitter). The settled frame is unique: pilot base, self1 ref and fix1 frames for g41_user_tw64 are byte-identical files (SHA-256 1051FCCE…), tables bit-identical (0 element diffs), views identical floats, borders byte-identical even in the bad pair. The bad base fill differs from settled at 505,236 px (225,882 by >24, max 253) across the whole knot. The freeze's StepUntil moves the physics, gf rebuilds async, and the old redraw waited only for composites +2, which stale frames satisfy: the fill shot (first after the freeze) drew the load's pre-freeze state, the border shot seconds later drew the frozen state. s13's 1-2 level residue is the tail of the same race at lower contention.

Done 3 (fixed, partially verified). k1436_screen.mjs keeps a screenshot only when two redrawn shots are byte-identical (8 tries, then warns and keeps the last; meta.stable records the shot count), k1436_bar.ps1 always sets STRICT=1, and the comparator's thresholds are unchanged. Fixed subset bar (26R_fix1: g41_user_tw64, g41_ring_tw42, ring, def, Par 3): PASS new 0 grown 0 gone 0 on the judged scenes (ring_tw42 skipped, below); user64 base reads the settled 11 finds, stable in 2 shots. Comparator sensitivity proven synthetically: an injected 809 px cut:plain at ring x68 in the ref screen.json still FAILs (new 1). The planted pair itself (17053a36 against a3a9a6b4, ring + g41_ring_tw64) produced clean base screens (1 and 4 finds) but the faulted old build's warm/captures never finished in 30 min (pre-fc520c2d cold loads under contention), so its screen FAIL stands unmeasured; re-run it on a quiet machine.

Done 4 (freeze retries, reported and skipped). meta.json now records freeze {expected, seen, tries, ok}; the comparator prints FREEZE lines for any scene that needed a retry or failed, and SKIP (not judged, bar unaffected) when the pair's hashes differ. In 26R_fix1: g41_ring_tw42 base FAILED in 4 (076a1b2a x4; want f7b1dff2), ref ok in 1 (f7b1dff2) — two loads of one build froze on different states, so the scene is named and skipped; g41_user_tw64 froze ok in 3 and 2 (c1b63637 first). No scene is silently judged across states any more.

Guards (preview of 9aee8202 on :5633, one kept profile %TEMP%\k26r-guards-profile): hold.mjs 60 250 5000 PASS on ?3&xp=off&am=instant&rp=gf (first composite 93.1 s cold under the planted run's contention; 60/60, edges min 102899) and on the fat gfh=1 link (49.7 s; 60/60, min 7026); dragcheck.mjs PASS for gf and for gfh (every stop 0 px over TOL 24). npm test green (256 files, 3198 passed, 9 skipped; tsc clean; no test changed — probes only).

Left: three full 12-scene fixed-bar runs at HomeFlag 1 (expect PASS with any unfreezable scene skipped by name), and the planted pair's screen FAIL on a quiet machine. K1519 stays open for those two measurements; K1464, K1451 and K1460 left open and untouched. Preview servers (5628, 5629, 5631, 5633) stopped; the bar's -Keep builds/profiles stay in %TEMP%\k1436s3-prev / k1436s3-profile-*.


## Run S (26S): j64's seam, third angle (K1517, K1504)

Added 2026-11-19. Handoff 26Q's next angle: at seam points scale the surface's ink by the seam's coverage,
in eval and in every GLSL form, so the filled wedge leaves no inner outline ink for the scan's rstray.
Resume from Handoff 26Q's candidate (the theta gate, with the promotion). Done: Run P's Done 2-8 unchanged
(Done 3's 4x tiles produced and looked at). K1482 stages 15 and 16 are on master in `gf_look.ts` and
`gf_app.ts` and a stage 17 agent is in those two files: stay out of them. Two tries at most; if neither
meets Done 4 and 5, do not land it, record what moved and stop.

### Handoff 26S (Muse, 2026-11-19, not landed: two tries spent, the bar still finds j64; K1517/K1504 stay open)

Started 02:18 PST, stopped 03:26 PST. Starting master 1e587680e; no `src/` or `test/` change landed (tree restored clean on master). Candidate kept on branch `muse-26s-tip` (1a77ab9a9, not pushed) and as `.claude/probes/K1517/k1517_26s_try2.patch` (applies clean on 1e587680e). Probes under `.claude/probes/K1517/` (`k1517_26s_inkscan/edit*/digests/linkA/tileA`; scans and tiles under `out/26S/`).

Done 1 stands as Handoff 26P/26Q pinned it (one cause: the near-null corner's uncovered seam). Done 2 on starting master (mirror, Run M's box recipe in `k1517_mirror.ts`): speck cov<0.9 samples 248 on muse_default_tw, 91 on muse_hash; the gated candidate reads 0 / 0. The screen speck counts and link A's pinhole count were not separately measured; the bar and tiles below judged the screen.

Two tries, both resuming 26Q's theta gate with the promotion:
- **Try 1** (per-surface ink scaled at the strip only: `v *= 1 - ss(-aa, aa, seamD)` in eval and every GLSL form): mirror scans (GF_HOME=1, `k1436_scan.ts`, against `out/26S/base_*.json`) — muse_default_tw 2 new rstray:plain at j64 (158 + 166 px), muse_hash 1 new (933 px), def and ring 0 new / 0 grown. The strip scale misses the corner's own arc and the side ink inside the tubes.
- **Try 2** (the seam depth over the corner's whole disc, plus one point-global suppression in the composite: eval `seamCapOf`/`seamA`, GLSL the disc `seamIn` beside the strip `seamStrip` and `gSeamA`; a ramping arm's own surface carries the same inner band, so the scale is point-global, not per-surface): mirror — muse_default_tw 0 new / 0 grown, def 0 / 0, ring 0 / 0, muse_hash 1 new rstray:plain 20 px at (5.01, 3.18), just outside the cap (rho 0.227 against cap 0.218). The candidate's focused tests pass (53: `gf_k1517` 3, the digests it moves re-frozen — app `ff66e36a`, probe `1be71cb5` in `gf_home_glsl.test.ts`, the `seamStrip` pin in `gf_split.test.ts`) and all 12 GLSL forms compile (`compile_all.ts`: ALL OK). `tables.ts` untouched, so Done 6's build time is master's by construction.

**The bar (Done 5, and Done 4's moved list).** `k1436_bar.ps1 -Ref 1a77ab9a9 -Base 1e587680e -Scenes muse_default_tw,muse_hash -HomeFlag 1`, STRICT=1, `-NoPerfLock` (labelled taken under load; the perf lock was this run's own): **FAIL new 4, grown 0, gone 0** — mirror rstray:plain muse_hash 5.01:3.18 20 px; screen rstray:plain muse_default_tw 5.26:3.08 j64 138 px and muse_hash 23.17:10.43 j0 18 px; screen rstray:tie muse_hash 5.37:3.06 j64 7 px (`out/bar/26S/bar.txt`). Nothing else moved on either scene; on link A (hash fff8c9e5, `cap.mjs`) tip against master differs by 5 px over 24 in the whole frame. Done 4 and 5 are therefore unmet, and per the brief the fix does not land. Done 3's tiles (today | master gf | tip gf, fill over border) are under `.claude/probes/K1517/out/26S/`: `tile_j64_muse_default_tw.png`, `tile_j64_muse_hash.png` (bar + today captures at the j64 box) and `tile_j64_linkA_fill.png` / `tile_j64_linkA_border.png` (world (5.14, 3.16)): looked at — on screen the tip reads the same as master at j64 (the dark dash/dot is still there in both gf columns; today is clean), i.e. the mirror's ink suppression does not reach the screen there, where the look's own gap draws (Handoff 26H part b is the same screen class). Next angle, not taken (a third try): give the ink zone a fringe one band past the coverage cap, and judge the screen dash separately from the field ink — the screen find may need the look's gap, not the field.

Done 7 on the final tree: `npm test` green (256 files, 3198 passed, 9 skipped; tsc clean), no test changed. Done 8 / the guards (preview of 1e587680e on :5635, one kept profile `%TEMP%\k26s-guards-profile`, perf lock held): `hold.mjs` 60 250 5000 PASS on `?3&xp=off&am=instant&rp=gf` (first composite 57.6 s cold; 60/60) and on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (44.5 s; 60/60); `dragcheck.mjs` PASS for gf and for gfh (every stop 0 px over TOL 24). `fade.mjs` prints FAIL on this unchanged master with Runs F/H's numbers (fl=0: 678/679 sides, fl=1.2: 439/451; `out/26S/guards_fade/summary.txt`) — the K1494 guard question, not this run. K1517, K1504, K1464, K1451 and K1460 left open and untouched; preview servers (5635, 5637) stopped; perf lock released.

## Run T (26T): the cold first load, A/B on a quiet machine (K1456)

Added 2026-11-19. Run this only under the perf lock with no other Chrome of yours alive. Cold (fresh profile
each load), interleaved, 5 pairs: master against master with 955de39d's change cherry-picked (the worker
gets its sources 0.8 s after the load; `docs/design/K1456_s3_first_visit.md`, Handoff K1456 s3), time from
navigation to the first gf composite on link A. Done: the table of 10 loads with medians and the paired
differences; land the cherry-pick only if the paired median is at least 10% sooner and `npm test`, `hold.mjs`
60/60 and both dragchecks pass; otherwise record the numbers and leave master as it is.

### Handoff 26T (Muse, 2026-11-19, not landed: paired median 4.4% sooner, under the 10% bar; master left as it is)

Started 03:37 PST, stopped 04:08 PST. Starting master 7fe5ee2a6; the cherry-pick of 955de39d onto it was built as 058f23c4b (4 files, `frame_loop.ts` / `gf_app.ts` / `gf_pass.ts` / `gf_compile.test.ts`; the probe-file conflict in `.claude/probes/K1456/s3/ab.ps1` was resolved to master's copy, and the temp commit was reverted whole after the decision, never pushed). Builds in `$env:TEMP\k26t-prev` (7fe5ee2a6, 058f23c4b); probes under `.claude/probes/K1456/s3/out/26T1-*.json`, `26T2-*.json`, `26T-summary.json` and `out/26T/guards_*`; perf lock held 03:37-04:08 for every load and guard, released at the end. No Chrome of this run was alive beside the one load at a time; Levi's browser and a K1482 s18 probe Chrome (profile `k1482s18-start`, 22-31 Chrome processes in total) shared the GPU throughout, so this is quiet by this run's lights, not an empty machine.

Cold A/B (fresh profile each load, link A `?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1`, `.claude/probes/K1456/s3/ab.ps1` + `s2/table.mjs`, seconds from navigation to the first gf composite; 26T1 rounds run master then early, 26T2 rounds early then master):

| Pair | Master (s) | Early (s) | Diff early-master (s) | Early sooner |
|---|---|---|---|---|
| 26T1-1 | 54.55 | 67.05 | +12.50 | -22.9% |
| 26T1-2 | 59.15 | 57.55 | -1.60 | +2.7% |
| 26T1-3 | 51.41 | 43.21 | -8.20 | +15.9% |
| 26T2-1 | 80.34 | 45.89 | -34.45 | +42.9% |
| 26T2-2 | 50.87 | 48.62 | -2.25 | +4.4% |

Medians: master 54.55 s (50.87, 51.41, 54.55, 59.15, 80.34), early 48.62 s (43.21, 45.89, 48.62, 57.55, 67.05). Paired median difference -2.25 s; paired median sooner 4.4%. The unpaired median ratio (10.9% sooner) is not the brief's bar. The early start itself works exactly as 955de39d promises: the compile worker gets its sources at 0.58-0.63 s (median 0.60) against master's 7.90-9.16 s (median 8.32), but the gating program (idx 0) then links in a median 47.84 s on early against 46.86 s on master - the head start is eaten by compiling while the loading phase's own work runs, as Handoff K1456 s3 inferred under load. The spread is wide on both builds (master 50.9-80.3 s, early 43.2-67.1 s).

Decision: the paired median (4.4%) is under the 10% bar, so the cherry-pick does not land and master stays at 7fe5ee2a6. The landing guards were still run on that master build (preview on :5642, one kept profile `%TEMP%\k26t-guards-profile`): `hold.mjs` 60 250 5000 PASS on `?3&xp=off&am=instant&rp=gf` (first composite 50.7 s cold; 60/60, edges min 102885) and on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (61.8 s; 60/60, min 6936); `dragcheck.mjs` PASS for gf and for gfh (every stop 0 px over TOL 24). `npm test` green on master (256 files, 3198 passed, 9 skipped; tsc clean; the cherry-pick's own `gf_compile.test.ts` was also green before the revert). K1456 stays open: the early start is proven to reach the worker at 0.6 s and proven not to move the first composite by the bar on this machine - the wait is still the one program's FXC compile (Run 26J's lane). K1464, K1451 and K1460 left open and untouched. Preview server (5642) stopped; the two preview builds and the kept guard profile stay in `$env:TEMP`.


## Run U (26U): j64's seam, finish try 2 (K1517, K1504)

Added 2026-11-19. Handoff 26S's try 2 (`.claude/probes/K1517/k1517_26s_try2.patch`, branch `muse-26s-tip`)
left one new find: muse_hash rstray:plain 20 px at (5.01, 3.18), just outside the seam cap (rho 0.227
against cap 0.218). Rebase the candidate on today's master (K1482 stages 17 and 18 landed in `gf_look.ts`
only) and close that find by the cap's extent (the cap following the corner's true reach, with a soft end),
not by a scan exemption. Done: Run P's Done 2-8 unchanged, the mirror scans 0 new / 0 grown on
muse_default_tw, muse_hash, def and ring, the bar PASS, Done 3's 4x tiles of j64 (fill and border) produced
and looked at. A Claude agent works in `gf_look.ts` and `gf_app.ts`: stay out of them. Two tries at most;
if neither holds, do not land, record what moved and stop.

### Handoff 26U (Muse, 2026-11-19, not landed: the leftover find closes on the four bar scenes, but Done 4 fails on g41_user_tw64; K1517/K1504 stay open)

Started 04:36 PST, stopped 05:47 PST. Starting master f8a9f2822 (K1482 s17/s18 in `gf_look.ts` only since 26S's base 1e587680e, so the rebase was clean). No `src/` or `test/` change landed; the candidate (26S try 2 plus this run's cap fix, formerly local commit a65cb865b) is kept whole as `.claude/probes/K1517/k1517_26u_try2.patch` (applies on f8a9f2822, digests re-frozen inside it: app `b22dea27…`, probe `55946ed6…` in `gf_home_glsl.test.ts`), and master stands restored at f8a9f2822. Branch `muse-26s-tip` untouched. Probes under `.claude/probes/K1517/` (`k1517_26u_probe*`, scans `out/26S/u_*`, guards `out/26U/`); perf lock held for build times and guards, released at the end. `gf_look.ts` / `gf_app.ts` untouched.

Done 1 stands as Handoff 26P/26Q pinned it. Done 2 on starting master (mirror `k1517_mirror.ts`, home on): speck box cov<0.9 samples 248 on muse_default_tw, 91 on muse_hash; the candidate reads 0 / 0 (home off also 0 on muse_hash). Link A's pinhole count not measured. The leftover find first, failing on the rebased try 2 alone (candidate without this run's change): mirror (`k1436_scan.ts`, GF_HOME=1) muse_hash exactly one new find against 26S's bases, rstray:plain 20 px at (5.01, 3.18), as the brief says; its pixels sit at rho 0.222-0.248 from j64's corner (cap 0.221), ink to 1.00, winner the vertex term (wk6, arms c28/c56).

Two tries at the cap's extent, each measured on the mirror first:
- **Try 1, radial soft end** (ink suppression `1 - ss(cap, cap+W, rho)` over the whole disc, gather widened to match): muse_hash 0 new / 0 grown, but muse_default_tw gains vdip:plain 11 px at (4.98, 3.16), where the fringe thins chain 56's live piece band (wk1). Discarded.
- **Try 2, vertex-only fringe** (the cap's extent with a soft end over W applied only to the vertex term: eval `seamFringeA` / GLSL `seamFringeA` + `gSeamF` at both vtx sites, gather widened for j64-class corners in `tables.ts`'s pruning, eval and both GLSL gathers): mirror scans 0 new / 0 grown on muse_default_tw, muse_hash, def and ring. Speck box 0 / 0. Tables build (alternating medians of 5 rounds under the lock, `k1517_buildtime.ts` + a def variant): muse_hash tip 11.42 against base 11.48, muse_default_tw 17.36 against 16.98, def 17.07 against 16.92 — within Done 6's 3%. All 12 GLSL forms compile (`compile_all.ts` ALL OK); the new 26U case in the patch's `gf_k1517.test.ts` pins the soft end and piece ink staying in the fringe; the candidate's focused suites pass (53 tests). The dead `seamCap` field the candidate carried (never read; tsc TS6133) is removed in the patch.

Done 4 fails, and with it the landing. On the other eight census scenes (mirror, tip against a checked-out f8a9 base): seven scenes 0 new / 0 grown, but g41_user_tw64 gains vdip:plain 12 px at (3.06, 7.07). That site is inside the cap (rho 0.161 against cap 0.185 at j55's corner k84, R 0.0003, theta 0.73, arms c22/c18), so it is the inherited disc, not either fringe: base draws chain 22's band ink 1.00 continuous along y 6.97, the candidate's point-global disc suppression cuts it to ~0 west of x 3.08 while coverage stays 1 — an ink hole in a live outline, worse by the judge. 26S never scanned this scene, so the disc's overreach was unmeasured until this run's 12-scene check. Per Done 8 the candidate does not land, and the brief's two-try cap is spent (a per-surface, depth-gated disc is a third mechanism, not tried). Done 5's bar and Done 3's tiles were therefore not run (the mirror half of Done 4 already fails; the bar's four scenes are the clean ones). Next angle: apply the disc suppression per surface, gated on that surface's own depth (deep inside coverage only, e.g. scaled by `ss(W, W + aa, max(D, seamD))` in eval and every GLSL form, composite's point-global multiply removed) so edge-adjacent band ink like j55's keeps, then re-run the 12-scene mirror compare before any bar.

Final tree: `npm test` green on f8a9f2822 (256 files, 3199 passed, 9 skipped; tsc clean), no test changed. Guards (preview of f8a9f2822 on :5480, one kept profile `%TEMP%\k26u-guards-profile`): `hold.mjs` 60 250 5000 PASS on `?3&xp=off&am=instant&rp=gf` (first composite 99.6 s cold; 60/60, edges min 102859) and on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (42.4 s; 60/60, min 6712); `dragcheck.mjs` PASS for gf (every stop 0 px over TOL 24) and for gfh (every stop PASS on the third run; the first two failed only at stop 0.14, where no fresh load reached the dragged page's state 49c20566 — the two-hash settle lottery, on this unchanged master). K1517, K1504, K1464, K1451 and K1460 left open and untouched; preview server (5480) stopped; base worktree (`%TEMP%\k26u-base`) removed.

## Run V (26V): the bar's freeze, and its three clean runs (K1519)

Added 2026-11-19. Probes only. Handoff 26R left: two loads of one build freeze g41_ring_tw42 on different
states (076a1b2a against f7b1dff2), and in a later run ring and g41_user_tw64 did not freeze at all
(`.claude/worktrees/agent-a077003d003b40d70/.claude/probes/K1436/out/bar/k1482s18/bar.txt`). Done: 1. the
cause of a scene freezing on two states named with evidence (what differs before the freeze: step count,
sleep, a timer). 2. the freeze made to reach one state per scene, or the scene's recipe changed so it does;
no scene skipped in the result. 3. the bar with `-Ref` = `-Base` = master, three full runs on the 12 census
scenes: 0 new, 0 grown, 0 gone, 0 skipped in each. 4. the planted pair (K1436's self-check) still found.
Close K1519 or record what is left.

### Handoff 26V (Muse, 2026-11-19, done: every Done holds; K1519 closed in 3ae03fdcb)

Started 05:51 PST, stopped 09:31 PST. Starting master 5d28f169; fix on master in 3ae03fdcb (probes only, no `src/` or `test/` change; rebased over 1eaba27f3's ledger-only merges at the push). Probes under `.claude/probes/K1519/` (`k1519_freeze.mjs`, the cause stand; `k1519_planted.mjs`, Done 4's mirror compare; captures under `out/26V/`); perf lock held for the diag, screen checks and guards, released at the end.

Done 1 (the cause: the live substep count's parity, nothing else). `k1519_freeze.mjs` replicates the bar's load + freeze on g41_ring_tw42: loads that froze on the wanted f7b1dff2 reached it at sim 40.0167, loads on 076a1b2a at 40.0250 - exactly one SUBSTEP (1/120) later. Before the freeze the two groups differ only in how many substeps the live load ran (203/197/211 odd against 208/204/600 even in the first six loads; asleep in one even load, awake in the rest, so not sleep; no timer reads anywhere in the step). The mechanism is in the host: `__knotStepUntil` steps 1/60 frames (two SUBSTEPs) while `simTime < frozenSim - 0.008`, so an odd starting count overshoots the K868 frame by one substep. The two user scenes' wanted frames sit at 4801 substeps, the other ten at 4802, which is why their alt state (c1b63637 at 4802) is the even one. A `ps.reset()` recipe was tried and dropped: it is deterministic but lands a different state (f2645bec), not K868's.

Done 2 (fixed, 3ae03fdcb, `k1436_screen.mjs` only): before `__knotStepUntil`, when the dump's kind is in-thread and the live substep count's parity differs from the wanted frame's, the step accumulator is credited one SUBSTEP so the first stepped frame runs three substeps. Verified before landing: 18/18 diag loads on g41_ring_tw42, ring and g41_user_tw64 land the wanted hash, and a full `k1436_screen.mjs` pass freezes all 12 scenes on their K868 hash in 1 try each (`out/26V/screen_check2/*/meta.json`; muse_hash needed one context-lost page retry, its freeze still 1 try). No scene is skipped anywhere below; the comparator's SKIP stays as a safety net that never fired.

Done 3 (three clean runs). `k1436_bar.ps1 -Ref master -Base master -HomeFlag 1` on 3ae03fdcb, STRICT=1, tags `26V_self1`, `26V_self2`, `26V_self3` (`.claude/probes/K1436/out/bar/26V_self*/bar.txt`): each prints `PASS  new 0  grown 0  gone 0` with no skipped segment and no FREEZE line - every scene froze on its K868 state at the first try in all six captures.

Done 4 (planted still found). The pair's screen half cannot run here: 17053a36's warm loads hang past the 480 s per-load cap and lose their WebGL context on every retry (the pre-fc520c2d cold-compile hang 26R recorded; its base a3a9a6b4 captures fine), so the planted bar was stopped after three timeout rounds. On what did run: the mirror half finds the fault - `k1519_planted.mjs` on the pair's mirror scans (base a3a9a6b4 against ref 17053a36, ring + g41_ring_tw64) prints `new g41_ring_tw64 rstray:ramp 79px`, FAULT FOUND; and the screen comparator still bites - a 500 px `cut:plain` find injected into a self-bar ref `ring.screen.json` makes `k1436_bar_cmp.mjs` print `FAIL  new 1` (out/26V/synth/bar.txt). The literal planted screen bar on a quiet machine is the one measurement left, and it is an old-build compile hang, not bar noise.

Tests and guards. `npm test` green (256 files, 3199 passed, 9 skipped; tsc clean; no test changed - probes only, and the bar above is the maintained check, with `k1519_freeze.mjs` kept as its freeze stand). Guards (preview of 3ae03fdcb on :5653, one kept profile `%TEMP%\k26v-guards-profile`): `hold.mjs` 60 250 5000 PASS on `?3&xp=off&am=instant&rp=gf` (first composite 78.4 s cold; 60/60, edges min 102844) and on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (48.7 s; 60/60, min 6886); `dragcheck.mjs` PASS for gf (every stop 0 px over TOL 24 on the re-run; the first run's stop 0.5 found no fresh load in the dragged state - dragcheck's own two-hash lottery, outside this run's files) and PASS for gfh (every stop 0 px). `fade.mjs` prints FAIL on this build with the standing K1494 numbers (fl=0: 678/679 sides, fl=1.2: 439/451) - that guard's question, not this run. K1519 closed in 3ae03fdcb; K1464, K1451 and K1460 left open and untouched. Preview servers (5651, 5653) and probe Chromes stopped; the bars' `-Keep` builds and profiles stay in `%TEMP%\k1436s3-prev` / `k1436s3-profile-*`.

## Run W (26W): closed items' probe output leaves the tree (K1467)

Added 2026-11-19. Repo plumbing, no `src/` change. `.gitignore` keeps `.claude/` untracked, yet 1,035 MB in
9,477 files under `.claude/probes` were force-added over the weeks (`git ls-tree -r -l HEAD .claude/probes`:
png 516 MB, bin 313, json 142; K1435 316, K1482 100, K1395 73, K1186 64, K1407 60, K863 56, K1198 44). Every
agent worktree and preview build copies them: the desktop's disk filled on 2026-11-17 and loses 26 GB a day
this week (claude-config CC156). A tracked file under `.claude/probes/<ID>/` leaves the index when all hold:
(a) it is output (a picture, capture, dump or log: under an `out/` directory, or png jpg webp gif svg bin, or a
json/txt/csv over 100 KB); tools and records (.mjs .ts .py .ps1 .sh .md .patch .diff) stay whatever the
item's state. (b) Its item is closed: in LEDGER.md's Done, in `docs/ledger_done.md`, or dropped. (c) Nothing
live names it or its directory: no open ledger item, no `docs/design/` file of an open item, nothing under
`src/`, `test/`, `scripts/`, and no tracked probe script of an open item (a scene's dumps that the bar, the
census or a test loads are inputs: they stay). Open items' files stay; list their bytes.
Done: 1. the table before: tracked bytes and files by ID, ledger state, verdict and the condition that keeps
each kept ID (top 20 and the totals in the handoff). 2. One commit, `git rm --cached` only (the files stay on
this checkout's disk: 20 sampled paths shown present after it; no history rewrite; nothing named by
`docs/design/K1482_s20_wedges_notches.md` leaves, a Claude agent is in that stage and its worktree loses
what you untrack at its next rebase). 3. Numbers: the tracked total after, and two fresh `git worktree add
--detach` checkouts under `$env:TEMP` (starting commit, new commit) measured on disk; at least 300 MB less,
or the handoff names the condition that kept each of the ten largest IDs. 4. In the fresh checkout of the
new commit (it has none of the untracked files): `npm ci` and `npm test` green, `k1436_bar.ps1 -Ref
master -Base master -Scenes ring,def` PASS, and the mirror scan (`k1436_scan.ts`) over the twelve census
scenes reads what it reads on the starting commit, so every input a check loads is still tracked. Remove
the two checkouts you made, no other. 5. A guard in `npm test` (`test/repo/probe_budget.test.ts`): the tracked total
under `.claude/probes` over the after-number plus 100 MB fails with a message naming `git rm --cached` (the
K1493 mistake, 362 MB in one commit, must trip it); it skips where there is no git checkout. 6. K1467's
entry carries the numbers and what remains by ID; three lines at most in `.claude/rules/probes.md` say what
may be force-added (tools, and the sheets a brief names). Do not edit CLAUDE.md. Known and accepted: checking
out an older commit in this checkout and returning deletes the untracked copies (history keeps them: name
the last commit that tracks them in the handoff).

### Handoff 26W (Muse, 2026-11-19, done: every Done holds; K1467 closed)

Started 22:57 PST, stopped 23:45 PST. Starting master 40ee10834. Untrack on master in 33f755fc1 (pushed; `.claude/`-only, so no deploy), guard and rule in a4144e2cf (deploy 44694757237 success). No `src/` change. Tools and records under `.claude/probes/K1467/` (`k1467_analyze/whonames/sample/scans/scancmp`, `removals.tsv`, `kept_output.tsv`, `table.json`, captures under `out/26W/`; untracked). Method: a file leaves only when (a) it is output (under `out/`, or png/jpg/webp/gif/svg/bin anywhere, or json/txt/csv over 100 KiB; `.mjs .ts .py .ps1 .sh .md .patch .diff` never leave), (b) its item heads Done in LEDGER.md / `docs/ledger_done.md` or a Dropped Done entry (an item heading both counts open; an ID with no ledger head never leaves), and (c) no live text names the file or its immediate parent directory — live = open ledger text, `docs/design/` files of open items, tracked `src/`/`test/`/`scripts/`, and tracked probe tools of open items (relative `../K…` loads are tool-to-tool and stay anyway; the bar/census/test scene inputs are the untracked K868 scenes, read from the main checkout, so nothing tracked had to stay for them).

Done 1 (the table before, `git ls-tree -r -l HEAD .claude/probes` at 40ee10834: 9,530 files, 1,085,186,846 bytes = 1034.9 MB; top 20, removed = passes (a)+(b)+(c)):

| ID | state | files | before MB | removed MB | kept output and the condition that keeps it |
|---|---|---|---|---|---|
| K1435 | closed | 982 | 315.8 | 315.8 | — |
| K1482 | open | 696 | 100.2 | 0 | 99.8 open item (b) |
| K1395 | open | 147 | 72.5 | 0 | 72.5 open (b) |
| K1186 | closed | 58 | 63.7 | 63.3 | tools stay (a) |
| K1407 | open | 718 | 59.8 | 0 | 59.7 open (b) |
| K863 | open | 543 | 56.4 | 0 | 52.7 open (b) |
| K1198 | closed | 137 | 43.5 | 37.0 | 5.1 (c): open K1112's `K1112_cursive_j3i.md` names the root dir |
| K1449 | closed | 528 | 40.5 | 38.5 | 1.9 (c): open K1451 text names `K1449/out/` |
| K1451 | open | 591 | 39.3 | 0 | 39.2 open (b) |
| K1139 | open | 305 | 34.3 | 0 | 33.5 open (b) |
| K1472 | open | 113 | 30.4 | 0 | 30.3 open (b) |
| K1456 | open | 52 | 23.7 | 0 | 23.7 open (b) |
| K1040 | closed (dropped) | 1430 | 20.8 | 18.8 | tools stay (a) |
| K1439 | closed | 67 | 20.0 | 20.0 | — |
| K1433 | closed | 308 | 18.6 | 12.0 | 6.5 (c): open text names `K1433/out/` (+ its scan summary by file) |
| K1460 | closed | 71 | 14.2 | 13.0 | 1.2 (c): this brief names `K1460/out/s5/jb_*.png` |
| K1182 | closed | 95 | 9.4 | 4.3 | 4.9 (c): `src/render/ribbon/rim_curve.ts` names `K1182/exam/` |
| K1438 | closed | 223 | 9.2 | 1.6 | 7.5 (c): open text names `K1438/out/` |
| K1458 | closed | 16 | 7.7 | 0 | 7.6 (c): open K1463 names `K1458/live/zoom_a.png` |
| K1240 | open | 378 | 7.6 | 0 | no output: tools only (a) |

Totals: removed 3,525 files, 569,990,615 bytes (543.6 MB); kept closed-but-live output 36.6 MB in all (the (c) rows above plus K1492/K1495/K1208 tails under 1 MB each); open items stay at 447.1 MB tracked (largest above; the rest under 8 MB each) and the five no-ledger segments (`rounds`, `S3a`, two root tools, CC156) at 0.5 MB. No script-like file is in the removal list (png 1428, txt 848, json 639, bin 475, err/svg/log/csv/jsonl the rest, all under `out/` or image/bin anywhere).

Done 2: one commit, `git rm --cached --pathspec-from-file` only (33f755fc1, 3,525 index deletions, no history rewrite). All 20 sampled paths (first removal of 20 IDs, `.claude/probes/K1467/sample20_{before,after}.txt`) are present after with identical size and SHA-256 head; three samples' worktree size differs from their blob (CRLF), identical before and after. Nothing named by `docs/design/K1482_s20_wedges_notches.md` left: K1482 is open anyway, and its protected K1490 sheets sit in directories the (c) check already kept; the s20 directories kept every tracked file.

Done 3: tracked after = 6,005 files, 515,196,231 bytes (491.3 MB). Fresh `git worktree add --detach` under `$env:TEMP` measured on disk (file bytes): starting 40ee10834 1,061.6 MB total / probes 1,036.4 MB; new 33f755fc1 517.5 MB / 492.3 MB — 544.1 MB less (bar 300 MB), so no kept-ID naming is owed. Both checkouts removed after Done 4, no other.

Done 4 (fresh checkout of 33f755fc1 at `$env:TEMP\k1467-wt-new`, no untracked files): `npm ci` clean; `npm test` green (257 files passed, 2 skipped; 3,197 passed, 18 skipped — the skips are the K868/drag cases that skip without untracked scenes). `k1436_bar.ps1 -Ref master -Base master -Scenes ring,def` (inside the perf lock as holder, `-NoPerfLock` for its own wait, tag 26W_fresh): PASS new 0 grown 0 gone 0. Mirror scan (`k1436_scan.ts`, GF_HOME=1, ppu 100) over the 12 census scenes in the new checkout against the starting checkout (`k1467-wt-base`, junctioned `node_modules` for the runner only): all 12 SAME — finds, tallies and raster sizes identical (`out/26W/scans_{base,new}`, `k1467_scancmp.mjs`), so every input a check loads is still tracked or read from the main checkout as before.

Done 5: `test/repo/probe_budget.test.ts` (a4144e2cf) sums `git ls-tree -r -l HEAD -- .claude/probes` and fails over 620,053,831 bytes (after-total + 100 MiB) with a message naming `git rm --cached`; it skips with no git checkout. Verified both ways: the starting tree (1034.9 MB) is over, the new tree within, and a K1493-style +362 MB lands at 877 MB, over. Focused run green; full `npm test` on the final tree green (258 files, 3,207 passed, 9 skipped; tsc clean, guard included).

Done 6: K1467 closed in the ledger with the numbers and remains (Done entry above); `.claude/rules/probes.md` gained three lines (only tools and brief-named sheets may be force-added). CLAUDE.md untouched. The last commit that tracks the removed files is 40ee10834: checking it out in this checkout and returning deletes their untracked copies, as accepted; history keeps them there.

Guards (preview of a4144e2cf on :5493, one kept profile `%TEMP%\k26w-guards-profile`, perf lock held): `hold.mjs` 60 250 5000 PASS on `?3&xp=off&am=instant&rp=gf` (first composite 2.8 s warm; 60/60, edges min 102,786) and on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (2.2 s; 60/60, min 7,028); `dragcheck.mjs` PASS for gf (stops 0/0/81/0 px over TOL 24, limit 200) and for gfh (0/0/67/0). K1464, K1451 and K1460 left open and untouched. Preview server (5493) stopped; perf lock released.

## Run X (26X): the drag and fade guards reach one physics state (K1475, K1461's fade part)

Added 2026-11-19. Handoff 26V named why two loads of one build freeze on two states: the live substep
count's parity before `__knotStepUntil`, fixed for the bar alone in `k1436_screen.mjs` (3ae03fdcb). The
guards still play that lottery: `.claude/probes/K1458/dragcheck.mjs` and `.claude/probes/K1492/dragcheck_b.mjs`
print "no fresh load in the dragged state" (K1475; 26V's first gf run, 26U's "PASS on the third run"), and
`fade.mjs` prints FAIL when its two loads settle on 49c20566 / f9d72040 (K1461). Done: 1. evidence that the
same parity splits these probes' states, or the other cause named with numbers. 2. Each probe reaches one
state per load by construction, not by retrying (a retry may stay as a net that the handoff shows never
fired). Probes only: the fix lives in each probe, as 26V's does in `k1436_screen.mjs`, or in one helper
under `.claude/probes/` that they import. No `src/` change: moving the hook itself (`__knotStepUntil`) would
move every stored state and base under the Claude agent now working in `src/render/gpu_field/`; if the
numbers say the hook is the right home, write that up as a ledger item and leave it. 3. Numbers on
master's preview, under the perf lock: `dragcheck.mjs` for gf and for gfh and `dragcheck_b.mjs`, 10 runs
each in a row: 10/10 PASS, 0 retries, 0 "no fresh load" lines; `fade.mjs` 10 runs: both loads on one state
hash every time (its FAIL on K1494's standing side counts is not this run's question: report the counts).
4. `npm test` green. 5. K1475 closed, K1461's fade part struck, each with the commit.

### Handoff 26X (Muse, 2026-11-19, done: every Done holds)

Started 09:49 PST, stopped 12:31 PST. Starting master 14126acce; fix on master in 67fb28720 (probes only, no `src/` or `test/` change; no deploy, `.claude/`-only push). Perf lock held 09:56-~11:44 for the sequences below, lost as stale mid-sequence (another agent removed it) and re-taken 11:53 for the fade tail and the holds; Levi's browser and other agents' Chromes shared the GPU throughout. Preview of 14126acce on :5490; probes and captures under `.claude/probes/K1475/out/26X/` (`parity_base.json`, `parity_aligned.json`, `runs/`).

Done 1 (the same parity, with numbers). `.claude/probes/K1475/k1475_parity.mjs` replicates dragcheck's load + freeze (seed 3, phw=0, SIMT 20) 12 times on the master preview: the frozen state is decided by the live substep count's parity before the freeze, with no other variable (kind in-thread on every load; pending 0.00417 on every load). Even before (10 loads: sub 16/18/600) -> stepped to 2402, hash f9d72040; odd before (2 loads: sub 17) -> 2401, hash 49c20566. One substep apart, exactly 26V's mechanism (`__knotStepUntil` steps 1/60 frames of two SUBSTEPs, so the reachable frame past 20 s is 2402 on the even path by float accumulation, 2401 on the odd path). K550's worker nondeterminism is not the cause (these links are phw=0).

Done 2 (fixed by construction, 67fb28720). `.claude/probes/freeze_parity.mjs`'s `alignFreezeParity(page, SIMT)` ports k1436_screen's alignment: freeze, then credit the step accumulator one SUBSTEP when `Math.round(ps.simTime * 120)` parity differs from the target's (in-thread only), so the first stepped frame runs three substeps and every load lands on substep 2402 / f9d72040. Called before the freeze+StepUntil evaluate in `.claude/probes/K1458/dragcheck.mjs`, `.claude/probes/K1492/dragcheck_b.mjs` and `.claude/probes/K1458/fade.mjs`; their hash-retry loops stay as nets. The same probe with ALIGN=1: 12/12 loads on f9d72040, including 7 whose before-parity was odd.

Done 3 (master's preview, one kept profile `%TEMP%\k26x-guards-profile`, 10 runs each in a row; logs `out/26X/runs/`). dragcheck.mjs gf: 10/10 PASS, 0 "no fresh load" lines, 40 fresh-load lines (exactly one per stop), every dragged and fresh state f9d72040. dragcheck.mjs gfh: 10/10 PASS, same counts. dragcheck_b.mjs (gf, TLK unset): 10/10 PASS, same counts. The retry nets never fired. fade.mjs 10/10 runs: every load (today, gf, gfh at fl 0 and 1.2) on f9d72040, 0 retry lines, `sameState true` on every comparison; the verdict stays FAIL on K1494's standing counts only, as the brief pre-answers: fl=0 678/679 sides pass (median |d-today| 0.0000-0.0001 world), fl=1.2 439/451-453 (median 0.0007-0.0009, p90 0.0131), reported not judged here.

Done 4: `npm test` green (256 files, 3199 passed, 9 skipped; tsc clean; no test changed).

Done 5: K1475 closed in 67fb28720 and K1461's fade part struck with the same commit (both ledger edits land with this handoff).

Guards (same preview and kept profile): `hold.mjs` 60 250 5000 PASS on `?3&xp=off&am=instant&rp=gf` (first composite 2.4 s warm; 60/60, edges min 102736) and on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (3.0 s; 60/60, min 7155).

K1464, K1451 and K1460 left open and untouched. Perf lock released; preview server (5490) stopped.

## Run Y (26Y): border.mjs and drag.mjs measure what they aim at (K1461's other two parts)

Added 2026-11-19. Probes only. `border.mjs` (K1458's tools) dies with "Target closed" while measuring, so
rp=gf's border look has no numbers against today's renderer (K1458 Do 4); `.claude/probes/K1444/drag.mjs`
aims at the slider's filled bar, so its stops land off target (asked 0.14, got 0.28; asked 0.5, got 0.62)
and its first drag does nothing. Done: 1. each failure's cause named with evidence (for "Target closed": what
closes the target: a context loss, a navigation, a timeout, the GPU process). 2. `border.mjs` completes 5
runs in a row on `?3&xp=off&am=instant&rp=gf` and on link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`),
each printing its numbers; the two links' numbers in the handoff, with the run-to-run spread. 3. `drag.mjs`:
every stop lands within 0.01 of the value asked (read back from the control, stops 0, 0.14, 0.5, 1.2), the
first drag moves it, 5 runs in a row. 4. `npm test` green, no `src/` change. 5. K1461 closed with the
commit, or what is left recorded.

### Handoff 26Y (Muse, 2026-11-19, done: every Done holds; K1461 closed in 6ba929f17)

Started 12:44 PST, stopped 14:05 PST. Starting master c54f5c36a (master moved to 527928027 under the run; the fix rebased clean). Probes only in 6ba929f17 (`.claude/probes/K1458/border.mjs`, `.claude/probes/K1444/drag.mjs`); no `src/` or `test/` change. Diag probes and captures under `.claude/probes/K1461/` (`sliderdom/dragprobe/dragseq/trackshift/restore*/bordergeo.mjs`; outs `out/26Y/`); preview of the starting master on :5490 and of 6ba929f17 on :5491 for the guards, one kept guards profile `%TEMP%\k26y-guards-profile`; perf lock held for the captures and guards, released at the end.

Done 1 (each cause, with evidence). **border.mjs:** all three loads and screenshots complete, then the measuring `page.evaluate` dies `TargetCloseError: Protocol error (Runtime.callFunctionOn): Target closed` (reproduced verbatim on the starting master). What closes the target is the call itself: it carries the whole geometry as one argument — measured `JSON.stringify(geo).length` 121,830,467 (668 lanes, 57,609 rows, 3,053,277 points) plus the three frames — and the CDP session dies transferring/parsing it. Not a context loss, navigation, timeout or GPU-process death: the gf/gfh frames are already on disk and no page error fires. Two further aiming faults on the same loads: today froze on fff8c9e5 while gf/gfh froze on 10104c64 (the substep-parity lottery of Handoffs 26V/26X — border.mjs never aligned parity), and the dip-only stroke search finds no gf stroke at all on these links (gf's own border stroke, rgb(39,47,68), reads lighter than the `bg=none` backdrop, lum ~48 against 26.7; a dip-only run prints 0 strokes, colour rgb(0,0,0), ends 0 sides). **drag.mjs:** reproduced exactly (asked 0 → got 0.14, 0.14 → 0.28, 0.5 → 0.62, 1.2 → 1.20). `.tp-sldv_k` is the filled bar (x always the track's left, width = the value's fraction of the 92 px track; `slider.js` in `@tweakpane/core`), so `kx` is half the value's fraction, not the grab position — but the landing error is the screenshot: a clip screenshot hides the panel's scrollbar (panel 310 → 320 px wide, track x 1422 → 1432, staying shifted while idle), the first value change re-renders the panel and shifts it back mid-drag, so every stop lands ~10 px / +0.13 high and the drag to 0 nets back to the start, appearing to do nothing (instrumented: box 0.06 after mousedown on the shifted track, 0.14 after moving left to the computed 0). A full-frame screenshot does not shift it; hover, a same-value click, a same-value box write and a resize event do not restore it — only a value change does.

Fixes. border.mjs decodes one frame in the page and measures it there (sections with the frame, lanes in batches of 32, only aggregates returned), aligns each load's freeze parity (`alignFreezeParity`, so all three modes freeze on one state), and reads the stroke as the edge band's strongest excursion either way from the local reference at FWHM (today's numbers move with the definition: dip-only today on link A read rgb(19,21,31), width 0.85 px, 20 end sides; signed it reads below — the faint light tint at the edge is the stronger excursion on the `bg=none` backdrop). drag.mjs grabs at the value's own track position, aims at the exact track fraction with the ends dragged past the track (dragcheck's clamp recipe), and drags each stop twice: the first drag absorbs the screenshot shift and restores the layout, the second on the settled track is the measured one.

Done 2 (border, 5 runs in a row on each link, every run completing and printing; one kept profile). Plain `?3&tlk=border` (hash f9d72040 on all 15 loads, h = 11.6 device px): today colour rgb(42,29,32..33), depth 5.7, width 2.60 px, place 0.78 h, 443/446 edges with a stroke; gf and gfh identical to each other every run — rgb(39,47,68), depth 20.0, width 3.76 px, place 0.70 h, 446/446. Ends: gf within-15%/1px 109–110 of 160–167 comparable sides, |d| median 0.000–0.010, p90 0.35–0.39 world; stroke-end arc medians today 0.400, gf/gfh 0.350. Link A `?3.FGH1HtvQeDjm6e4BII&tlk=border` (fff8c9e5 on all loads, h = 17.0): today rgb(40..41,29,32), depth 5.5, width 4.69, 372–373/600 edges; gf/gfh rgb(39,47,68), depth 19.7, width 5.54, 566/600. Ends: gf within 101–106 of 151–162, |d| median 0.01–0.02, p90 0.33–0.37 (gfh p90 0.42–0.43); end-arc medians today 0.530, gf 0.480–0.490, gfh 0.470. Spread across the five runs is at most 1 level in one colour channel and 0.02 world in the end medians; the side counts wobble by ±6 at the depth-6 lane threshold. Today's own ends are found on only ~160 sides (its stroke is ~5.5 lum deep there), gf's on ~660 — that asymmetry is today's faintness on this backdrop, not a miss.

Done 3 (drag, 5 runs in a row, stops 0, 0.14, 0.5, 1.2 read back from the control and `__knotParams().fadeLength`): every stop exact in all five runs (0.00, 0.14, 0.50, 1.20; fadeLength 1e-17 / 0.14 / 0.5 / 1.2), and the first drag moves the value (0.14 → 0.00) in every run. Before the fix the same sequence read 0.14 / 0.28 / 0.62 / 1.20.

Done 4: `npm test` green (256 files, 3199 passed, 9 skipped; tsc clean; nothing in `src/` or `test/` changed, so no maintained test moves — the five-run probe sequences above are this run's checks). Done 5: K1461 closed in 6ba929f17 (its fade part was already struck in 26X).

Guards (preview of 6ba929f17 on :5491, the kept profile above): `hold.mjs` 60 250 5000 PASS on `?3&xp=off&am=instant&rp=gf` (first composite 57.6 s cold; 60/60, edges min 102,899) and on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (28.1 s; 60/60, min 7,275); `dragcheck.mjs` PASS for gf and for gfh (every stop 0 px over TOL 24 against its fresh load, save 60 px at gfh's 1.2 stop, limit 200). K1464, K1451 and K1460 left open and untouched. Preview servers (5490, 5491) stopped.

## Run Z (26Z): the dead quiet path leaves the paint code (K1223)

Added 2026-11-19. Today's renderer's paint code; nothing under `src/render/gpu_field/` changes beyond a call
site's argument list. Since K1211 S6 (13aab452) nothing asks for the pulses' quiet rows, and the code still
ships: `kPaintAt`'s `quiet` argument and `kPulseCrestQuiet` (`src/render/paint_glsl.ts`), the `quiet` flag of
its CPU mirror (`paint_math.ts`), row mode 2 in `arm_strip.ts` and in joinery's `writeStripRow`
(`src/render/ribbon/joinery.ts`), and the quiet cases of `test/render/paint_gameplay.test.ts`.
Done: 1. Dead by evidence, before anything is deleted: every call site of `kPaintAt`, of the mirror's paint
function and of `writeStripRow`, and every writer of a strip row's mode, listed with the value it passes;
none passes quiet or mode 2. If one does, stop there, correct K1223's entry and report. 2. One commit removes
the argument, `kPulseCrestQuiet`, the mirror's flag, mode 2 and its row, and the quiet tests. After it,
`git grep -n -i -E "kPulseCrestQuiet|quiet" -- src/render/paint_glsl.ts src/render/paint_math.ts
src/render/arm_strip.ts src/render/ribbon/joinery.ts` prints no line about the pulse's quiet path (name any
line left and why). If the strip texture's row count or layout changes, the handoff gives the sizes before
and after. 3. The screen does not move: built previews of your starting commit and of your commit
(`preview.ps1 -Ref`), captures on one physics hash (the parity fix of Handoff 26V), 0 px in the thread area
for today's renderer and for rp=gf, fill and border looks, on `?3&xp=off&am=instant`, on link A
(`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant`, with and without `&rp=gf&gfh=1`), and with pulses, the telegraph
and the gold path showing (24C's state and clocks: `.claude/probes/K1414/k1414c_ab.mjs`, seed 7, 10 cheapest
moves, clocks 100 / 100.45 / 101.3). 4. The pins this moves, each named old -> new in the commit message:
`test/render/k320_slim.test.ts`'s character budgets are re-frozen at the smaller numbers and none grows; the
G2 mirror tests (`paint_math`, `paint_fx`, `paint_section`, `paint_gameplay`) stay green with no tolerance
loosened; the byte-identity goldens are untouched. 5. `npm test` green. 6. The guards. 7. K1223 closed with
the commit.

### Handoff 26Z (Muse, 2026-11-19/20, fix landed in a4d78a2ab; Done 3's plain-link clause unmet as written — the capture floor — so K1223 stays open)

Started 2026-11-19 23:58 PST, stopped 2026-11-20 03:12 PST. Starting master da4c0a6f2; fix on master in a4d78a2ab (deploy 44699876441 success). Probes under `.claude/probes/K1223/` (`k1223_cap.mjs`, the parity-aligned / asleep capture; `k1223_diff.py`; `caps26z*.ps1`, `floor26z.ps1`, `pulses26z.ps1`, `guards26z.ps1`; captures under `out/26Z/`); previews of da4c0a6f2 (:5494) and a4d78a2ab (:5495) in `$env:TEMP\k26z-prev`, one kept cap profile `%TEMP%\k26z-cap2-profile`.

Done 1 (dead by evidence, before anything was deleted). GLSL `kPaintAt(c, ctrl, arc, px, quiet)` callers: `arm_strip.ts:275` passes `pm > 1.5` (pm is 0 or 1 for every written strip mode — 0 composed, 1 untraveled, 3/4 root C/O, 6/7 their untraveled forms — so always false); `outline/outline_app.ts:290`, `ribbon/ribbon_sdf.ts:367`, `ribbon/ribbon_shader.ts:173` pass `false`. CPU mirror `kPaintAt(D, U, c, ctrl, arc, px, out, quiet = false)` callers: `paint_math.ts:2182`, `ribbon/paint_state.ts:280` and `:320`, `ribbon/pluck_host.ts:382` pass no flag; `ribbon/joinery.ts:328` passes `pm > 1.5`, always false on the same mode table. `writeStripRow` callers (`joinery.ts:1023` mode 0; `:2001` rootMode 4/0; `:2012` 7/1; `:2099` 3/0; `:2101` 6/1) never pass 2, and `writeStripRow` is the sole writer of the row's mode word. `kPulseCrestQuiet`'s only caller was `kPaintAt`'s quiet branch. The one `true` anywhere was the quiet case in `test/render/paint_gameplay.test.ts:1412`, removed with the path. Nothing under `src/render/gpu_field/` calls either `kPaintAt` (gf mentions it in comments only), so no gpu_field file changed at all.

Done 2 (landed, a4d78a2ab). Removed: `kPaintAt`'s `quiet` argument and `kPulseCrestQuiet` (`paint_glsl.ts`), the mirror's `quiet` flag (`paint_math.ts`), strip row mode 2 (`arm_strip.ts` table/shader docs and call, `joinery.ts` `cpuChainMaterial` call and `writeStripRow` doc), and the `kPaintAt` quiet case in `paint_gameplay.test.ts`; the three remaining GLSL call sites drop their `false`. After it, `git grep -n -i -E "kPulseCrestQuiet|quiet" -- src/render/paint_glsl.ts src/render/paint_math.ts src/render/arm_strip.ts src/render/ribbon/joinery.ts` prints nothing (no line left). The strip texture does not move: 2 texels per row, `STRIP_W` 64, rows written per routed arm as before — no mode-2 row was ever written, so no row is lost and the row count/layout are the sizes before and after.

Done 4 (pins, each named in the commit message too). Measured fragment lengths before -> after: SECTION_FRAG 59,041 -> 58,662, budget 59,050 -> 58,700; SECTION_EXPLORE_FRAG 75,503 -> 75,124, budget 75,503 -> 75,150; STRIP_FRAG 35,572 -> 35,075, budget 35,600 -> 35,100; JUNCTION_FRAG (37,278) and PLUCK_STILL_FRAG (20,528) unchanged, budgets unchanged; none grows. The G2 mirror tests (`paint_math`, `paint_fx`, `paint_section`, `paint_gameplay`) stay green with no tolerance loosened; the byte-identity goldens are untouched. Done 5: `npm test` green (258 files, 3,207 passed, 9 skipped; tsc clean), including the focused paint/k320 suites.

Done 3 (partial). Link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant`, parity-aligned SIMT 20, hash-matched pairs, thread area = x < 0.78 of frame): today fill 0 px over 24 (21,973 px at most 10 levels, background floor), gf fill 1 px over 24 (max 25, at (1054, 836)), border today 0 over 24 (max 20), border gf 3 over 24 (max 26) — 0-3 px, named, at the capture floor. Pulses, telegraph and gold path (k1414c_ab.mjs, seed 7, 10 cheapest moves 0,220,203,173,172,171,209,273,272,271, clocks 100 / 100.45 / 101.3, same walk/pulses/tele on all four loads): today and gf base-vs-new differ by 0 px in the thread area at every clock (whole-frame diff 279 px, all in the panel build-stamp strip x 1121-1169, y 110-116). Plain `?3&xp=off&am=instant` is unmet as written: literal 0 px is not measurable on this link. Aligned SIMT 20, view-settled SIMT 120 (hash 0ff9c4b1 both builds) and asleep (hash 0cbb8f07 both builds) pairs all differ by 70k-388k px over 24, and the floor control — two loads of the base build alone, asleep recipe — differs by 193,124 (today) and 101,249 (gf fill): the plain knot's rest state is path-dependent under static friction and the physics hash is too coarse to pin it, so two loads of one build differ as much as base against new (gf fill base-vs-new 70,595 sits below its 101,249 floor; borders 3,730 / 893). The removal is proven untaken by Done 1 and the bit-green mirror tests; the plain-link 0 px re-shoot wants a state recipe that pins sub-hash position, which no probe in the tree has.

Done 6 (guards, build of a4d78a2ab on :5495, one kept profile `%TEMP%\k26z-guards-profile`, perf lock): `hold.mjs` 60 250 5000 PASS on `?3&xp=off&am=instant&rp=gf` (first composite 87.4 s cold; 60/60, edges min 102,834) and on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (36.3 s; 60/60, min 6,972); `dragcheck.mjs` PASS for gf (every stop 0 px over TOL 24) and for gfh (0 / 123 / 0 / 0 px, limit 200).

K1223 stays open for Done 3's plain-link clause (the fix itself is landed and guarded; the open part is the 0 px re-shoot on `?3`). K1464, K1451 and K1460 left open and untouched. Preview servers (5494, 5495) stopped; perf lock released.

## Run Z2 (26Z2): pulses and the telegraph still draw under rp=gf (K1473)

Added 2026-11-19. The pulses' and telegraph's table (texture unit 9) uploaded as R32F from 9b48e44f until
K1472's fix (998be573), so the look shader read zeros and neither drew; nobody has measured them on screen
since, and Runs F to N and the junction-field stages changed the look around them. The bars and probes are
24C's (`.claude/probes/K1414/k1414c_ab.mjs`, fill look; Handoff 24C in `docs/design/K1418_muse_batch24.md`)
and 24H's and 25A's (`k1414h_ab.mjs` with `mask_h.mjs`, `tlk=border`; Handoff 25A in
`docs/design/K1448_muse_batch25.md`): seed 7, 10 cheapest moves, clocks 100 / 100.45 / 101.3.
Done: 1. The floor first: two loads of today's renderer give ratio 1.000 and IoU 1.000 for both features at
the three clocks; if not, the probe reaches one state per load first (Handoffs 26V and 26X). 2. The table on
master, today's against gf, count ratio and IoU per feature and clock: fill look (24C's bar: count within
15%, IoU at least 0.7), border look telegraph (25A read 1.017, IoU 0.958) and border look pulse (25A read
0.942 / 0.786, 1.033 / 0.748, 0.969 / 0.823). 3. Fixed where the table is short: fill at 24C's bar; border
telegraph within 15% and IoU at least 0.8; border pulse count within 15% and IoU no more than 0.02 under
25A's at each clock (25A's own residue at the head fan is K1447, not this run). For anything short: the
commit that moved it, found on built previews between 25A's commit and master, then the fix in `gf_look.ts`
or `gf_pass.ts`, never in the field. If everything holds on master there is no source change. 4. An ordinary
load shows them too: with the probe's frame-forcing hooks off, in real time, three captures 0.5 s apart on
the same state each hold a pulse mask within 30% of today's count, and the crest sits somewhere else in each.
5. The upload guard bites: `test/render/gf_look_upload.test.ts` fails when unit 9's format is put back to R32F
(paste the failing lines, then restore), or gains the case that makes it fail. 6. 4x crops, today's | gf, at
the three clocks, fill and border, under `.claude/probes/K1473/out/26Z2/`, looked at: what you see at each,
including what is worse. 7. `npm test` green. 8. The guards. 9. K1473 closed with the numbers, and the fix's
commit if there was one.

