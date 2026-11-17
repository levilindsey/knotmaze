# K1418: Muse batch 24, rp=gf's look matches today's (2026-11-16)

Five runs, started by Claude through Paseo with the K1053 chain (tags 24A-24E), one after another in the
main checkout. This brief is the authority. Levi (2026-11-15): "try to maximize muse delegation"; rp=gf's
junction spots are the top priority, and a Claude agent is on them (K1407 c1, `docs/design/K1407_c1_bar.md`).
These runs carry the rest of today's look into rp=gf: the gap casing, the play features and the two reveals.
rp=gf is opt-in (`rp=gf` in the link), so the default look must not move, but every push deploys.

## How to work (every run)

Batch 23's How to work (`docs/design/K1408_muse_batch23.md`) holds in full, with these changes:

- Your tag is `24<X>`; commit messages end `(Muse batch 24 Run <X>, 24<X>)`; append `### Handoff 24<X>` under
  your run's section here.
- **Hands off the junction field.** Don't edit `src/render/gpu_field/tables.ts`, the field evaluation in
  `gf_glsl.ts`, or the census tools: the K1407 c1 agent is changing them. The tables digest (`k1362t1_digest.ts`)
  stays bit-identical in every run. If your fix needs a change there, stop and report.
- **Leave K1407, K1416 and K1418 open.**
- **Matching today's look:** today's look (no `rp=gf`) is the reference for every run. Measure on the same
  state (`probes.md`'s same-state recipe, K83 and K550). Crops at 4x go under `.claude/probes/<ID>/out/24<X>/`
  (today | master gf | new gf).

### Handoff 24D (Run D, written last, read first)

Run D (K1395, the reveal's colours) landed in 01411434 and is pushed: the look draws over the reveal form, the reveal table carries widthMulFor's width (the rainbow swell), GfFxTable bakes the FX per sample each revealing frame (burn/roots age, rainbow progress, materialize alpha, interior solidity, glow), the look shades the label with ported lkBurn/lkRainbow, and the border composite fills the FX interior while the reveal runs. Full suite green (3085 tests). It is NOT Done by the brief's bars: on b.FMKB4DIQ, burn mean colour went from 40-80 levels off to ~1-11 mid-reveal but counts run 1.08-1.29x today (want within 15% every frame), rainbow R/B means run +14-26 (want within 10), and ink-dust/bloom-comet/trace-roots are unmeasured on the new build. The leftovers are filed as K1431. The t=10.16 answer: master gf drew widths in one cream fill with the look held off, so cooled burn threads read as full cream where today shows char-dark section colours with only the hot fronts bright. One environmental note that cost an hour: the stock k1387_sheet.mjs 60 s waits starve on this machine right now (master gf blocks ~56 s in its first frame too); Run D measured with a patient copy (.claude/probes/K1395/k1395_sheet.mjs, 300 s waits) against a vite preview build. Remaining: Runs E, F, G, H as written below.

## Run A (24A): K1417 and K1415, the gap casing and fade

2830d103 (K1398) paints the casing only in the gap band, so the border look shows a dark dash at every
crossing where today draws a faint continuous casing along the outline
(`.claude/probes/K1398/out/crop_border_150.png`, `crop_border_270.png`: today | master gf | new gf). K1415: gf's
fade uses the full fadeLength, where today's scales by the crossing angle and per side.

**Done:** 1. Border look, K1389 scenes (`k1389_sheet.mjs`, `b.FMKB4DIQ`, dpr 1 and 2): the darker-than-background
masks of gf and today (lum < mode - 4) overlap with IoU at least 0.5 after a 1 px dilation of both, and the counts
are within 20%. Report 2830d103's IoU as the baseline. 2. Fill: at 5 or more shallow crossings (sin < 0.5), the fade
amount at today's a=0.5 pixel within 0.1 of today's. 3. Crops. 4. `npm test` green.

### Handoff 24A (Muse, 2026-11-16, partial: Done 1 and 2 not met)

What landed (finished part, still to commit when this handoff is reviewed with the code): `src/render/gpu_field/gf_look.ts` removes the 2830d103 gap-band casing paint in all looks (the composite clears the gap to the background; no CASE paint), changes `lkGap` to compute per-pixel fadeP `max(fadeLength * max(sin, 0.2), 1 px)` from under/over tangents at the feet (side scales stay 1; there is no per-side table in gf), and re-aims the border composite at the faint continuous outline. `test/render/gf_look.test.ts` updated to the new shader text. Tables digest after change: SHA-256 `7004D6E3B44759323D2EC848322C81940EA99107A6E130CF94745DDDE9FDC106` (5446 lines), bit-identical to `.claude/probes/K1362/out/t1_digest_fix23c.txt`; census untouched, `npm test` green (243 passed).

Border (Done 1, not met): baseline 2830d103 dpr1 dilated IoU **0.1413** (counts 2,546 / 2,398). After: counts **2,268 / 2,398 (pass, within 20%)**, dilated IoU **0.2141 (fail, needs 0.5)**. The dash artifact is gone and the remaining mismatch is centre-sampled field ink speckling against today's MSAA mesh coverage, not dash placement. No dpr2 pair was run because dpr1 already fails the IoU clause. Fix direction filed as K1422.

Fade (Done 2, not met): sin-scaled fade is in; seed3 ci77 improved (gf amount error 0.048 to 0.033), ci345 holds 0.063, ci346 is 0.110 (just outside), seed5 ci248 is 0.481 and is dominated by window-end / along-eye behaviour plus section-colour scan contamination, not fadeP width. Only two clean task crossings are inside 0.1, so the 5-crossing clause is not met. Filed as K1423.

Evidence: `.claude/probes/K1417/out/24A/crop_border_150.png`, `crop_border_270.png`, `crop_fill_150.png`, `crop_fill_270.png` (today | master gf | new gf), `.claude/probes/K1417/out/24A/fade_base_seed3.txt`, `fade_new_seed3.txt`, `fade_base_seed5.txt`, `fade_new_seed5.txt`, `.claude/probes/K1389/out/24A_base_border_today.png`, `.claude/probes/K1389/out/24A_new6_border_gf.png`. K1417, K1415, and K1418 stay open; K1407 and K1416 untouched.

## Run B (24B): K1414 part 1, the K81 route bands and the hover rim

Today's shader draws these off uniforms; gf draws neither (K1405's handoff in K1408's brief).

**Done:** 1. For each feature, its mask (today with the feature, minus today without) against gf's: pixel count
within 15%, IoU at least 0.8. 2. With neither feature showing, gf moves 0 px against master gf. 3. Crops.
4. `npm test` green.

### Handoff 24B (stopped, not landed: kept as a patch)

2026-11-16 13:23 → 15:05 PST (main checkout, started level at ba3cac81; origin
moved under the run — K1407 c2/c3 landed (9f38d587, 46c4f05b), so the
implementation was committed on ba3cac81, rebased clean onto 1a1a72e6 as
71c2f3e6, measured there, then reverted whole per this batch's stop rule;
nothing of Run B is on master. The full work — `gf_look.ts` GfRouteTable +
lkRoute + routed-cap drop + lkRim, `gf_pass.ts` unit 9, `gf_app.ts`
snapshots, tests in `test/render/gf_route.test.ts`, `gf_paint.test.ts`,
`paint_ring_lap.test.ts` — is `.claude/probes/K1414/k1414_part1_full.patch`
(56,806 bytes, `git apply --check` clean on 1a1a72e6; also in reflog at
71c2f3e6). K1414 stays open; the band follow-up is K1424. No `tables.ts`,
`gf_glsl.ts` field or `eval.ts` change is in the patch, so the tables digest
is bit-identical by construction.

State recipe (`.claude/probes/K1414/k1414_ab.mjs`, ports 5488/5489, both
killed after; perf lock held 13:40 → end): seed 7 `am=instant&mt=hunter
&snd=none&fw=0&phw=0`, cheapest-choice walk (edges 0,220,203,173,172,171,209,
273, head node_248), `__knotPinClocks(100)`. Three probe traps cost most of
the run; all are now in the probe: (1) the first capture after the walk is
pre-settle in gf (a final-pose build lands across it) — take and discard a
warm-up capture, or every mask is inflated by the settle shift (an early
bands pass, 37,372 vs 34,232 = ratio 1.09, IoU 0.886, was exactly this
artifact in both renderers, matched); (2) re-pin the background before every
shot (a pinned background asked to re-render comes back black); (3) today's
rim only renders if the hover lands before the clock pin freezes its paint
tick (K145's recipe), and a gf capture wants `__knotGf.stats` rebuild
counters still.

Done, against settled (post-warm) captures on the rebased tree:

1. Hover rim: passes inside the patch. Mask (on−off, hover edge 0 verified by
   `glowEdge`, rim chain 0 ctrl 0–36 at 12.60 in both renderers): today 470
   px, gf 456, ratio 0.970, IoU 0.929. `master2` gf (1a1a72e6 via a temp
   worktree server, removed after): 0 px.
   Route bands: fail. Today 747 px, gf 1,721, ratio 2.30, IoU 0.147.
   Gf-only pixels are solid gold strips on section-coloured thread near the
   start (e.g. (270,111), on gold (236,204,65) vs today section (193,122,180))
   plus speckle at band/disc boundaries on the through-route's gold thread
   (see `cmp_junction.png`). Prime suspects for the next run: junctions
   today's fan has no record for (turnstiles, stubs — joinery skips them,
   the patch's table builds a band for every `routesByJn` entry) and the
   disc still being wider than the fan + cover strips. The band geometry
   otherwise reads right by eye (`crop_bands.png`: through-route gold and
   the untraveled wedge match today; the master's gold wedge is the wider,
   wrong one).
2. Neither feature showing: `master2_gf_bands_off` vs the patch's
   `new2_gf_bands_off` — 0 px in the thread area; 501 px total, all inside a
   panel strip (x 1081–1179, y 110–116, UI noise). Pre-rebase the same pair
   was 0 px whole-frame.
3. Crops (today | master2 gf | patch gf) at 3–4x under
   `.claude/probes/K1414/out/24B/`: `crop_bands.png`, `crop_rim.png`, plus
   the per-mode captures (`new2_*`, `new3_gf_*`, `master2_gf_*`) and
   `cmp_junction.png` (today on | off | gf on | off).
4. `npm test` green on the full implementation after the rebase (3081
   passed, 244 files; the later band label-gate + disc-shrink got typecheck
   + the focused 25 tests only). The patch's own commits were never pushed.

Left for the next run: extract the rim as its own commit from the patch (it
needs no band machinery; a rim-only split was attempted at the stop line,
broke `gf_app.ts` surgery, and was restored rather than shipped broken),
then close the band mask per-junction against the fan before re-measuring.

## Run C (24C): K1414 part 2, the pulses and the telegraph

**Done:** 1. At three fixed sim times on the same state, each feature's mask against today's: count within 15%,
IoU at least 0.7. 2. With neither feature showing, 0 px against master gf. 3. Crops. 4. `npm test` green.

### Handoff 24C (Muse, 2026-11-16, done: every Done holds)

Started 15:06 PST, code on master in c688b198 (deploy watched). The pulses and the telegraph now
draw under rp=gf. `GfDynTable` (`gf_look.ts`) bakes each pulse arm's field (gA/gB/flags/endWin) and
the telegraph's strongest piece (unwrapped arc span, gaps, signed fades) per kept sample in the look
positions' layout; `lkPulse`/`lkTele` in the look form evaluate `kPulseCrest` from the clocks
`gf_pass.ts` reduces to uniforms (travel, reach, hover breath, head, pulse colour, telegraph
colour/strength/scale, the riding spot's arc), composed in ribbon order after the gold mix, the
telegraph shaped across by the foot's distance over uH. `gf_app.ts` snapshots the bake with each
build, re-bakes on `dynKey`, and redraws while pulses live or the telegraph end rides. No
`tables.ts`, field-evaluation or census change, so the tables digest is bit-identical by construction.

Checks (perf lock held; own server on 5491; `.claude/probes/K1414/k1414c_ab.mjs`: seed 7, 10
cheapest moves - at 8 the telegraph's run is under two rim gaps and today draws nothing, at 10 it is
9.2 world - `mt=hunter&fw=0&phw=0`, clocks pinned at 100 / 100.45 / 101.3; mask = on minus off by
>8, the off frames re-declared with the feature removed and `pulseBorn` re-pinned):

1. Pulses: today 1475 / 921 / 1396 px against gf 1410 / 888 / 1337 (ratio 0.956-0.964), IoU
   0.938 / 0.931 / 0.937. Telegraph: today 961 against gf 928 (0.966), IoU 0.958 at all three times.
2. Neither feature showing: new gf against master gf (stash A/B on the same server) 0 px whole frame;
   master gf's own feature mask is 0, the new gf's is 2338 px.
3. Crops (today | master gf | new gf, 4x): `.claude/probes/K1414/out/24C/crop_pulse_t100.png`,
   `crop_tele_t100.png`, beside the per-mode captures (`new_*`, `master_gf_*`).
4. `npm test` green: 244 files, 3080 passed. New `test/render/gf_dyn.test.ts` (6 tests) pins the
   bake against `kPulseV` / `kPulseV2` / `kPaintAt` including a riding end; the K299 quotient
   scanner gained `gf_look.ts`'s crest phase as a reviewed benign site, twin to `paint_glsl`'s.

Left. K1414 stays open (route bands K1424 and the rim landing are Run F's). Filed K1425: in the
border look the pulse/telegraph indications do not draw in gf's cleared interior (today composes
them over an empty base with their own coverage; gf's `o1` carries no indication-coverage channel).
The fill look, the default and the measured state, is unaffected.

## Run D (24D): K1395, the appearance reveal's look

gf draws the reveal's widths and fronts but not its colours: the burn tint, the rainbow stripes and its swell
and white bulb, the materialize alpha (`.claude/probes/K1383/out/b_J_*_sheet.png`,
`docs/design/K1383_s1_gf_reveal.md`'s handoff). The frames also differ. At t=10.16 s on `b.FMKB4DIQ`, today's
burn shows fragments while gf draws the whole maze in cream (`.claude/probes/K1404/out/today_t10.16.png`
against `after_gf_t10.16.png`). Find out why as part of this run.

**Done:** 1. For each appear mode, on the K1387 sheet frames (`k1387_sheet.mjs`): gf's ink pixels per frame within
15% of today's, and the mean ink colour within 10 levels per channel. 2. `am=instant` unchanged (0 px against
master gf). 3. Crops. 4. `npm test` green.

## Run E (24E): K1396, the K76 thread reveal (explore view)

gf handles the appearance reveal only; the explore view's hidden and growing pieces don't draw under gf.

**Done:** 1. On a walk in the explore view, at three states, gf's visible-thread mask against today's: IoU at
least 0.9. 2. Outside the explore view, 0 px against master gf. 3. Crops. 4. `npm test` green.

### Handoff 24E (Muse, 2026-11-16, done: every Done holds)

Started 18:03 PST, stopped 18:37 PST. Code on master in 0a5e2d1c (rebased over 648d3df9; deploy watched). The explore view now draws under rp=gf. `GfExploreTable` (`src/render/gpu_field/gf_explore.ts`) bakes the renderer's visibility pieces into a knots table beside the K1362 tables (per sample vis / frontier tip / fade length at its drawn arc, whole and hidden chain headers, a gate flag per corner: both arms past the joint gate's 0.002 at their slots). The look form reads it (unit 11, `gf_pass.ts` `setExplore`): the segment scan drops a hidden segment, a corner draws only under its flag, `lkGap`'s cut scales by the over piece's visibility at its foot, and at the label `lkExploreLook` (the glow tint, fray and dots/beacon shapes) reshapes the visibility over ink and coverage. `gf_app.ts` rebuilds the table when the declaration or the installed sample positions move. No `tables.ts`, `gf_glsl.ts` field-evaluation or census-tool change, so the tables digest is bit-identical by construction (the commit touches gf_app/gf_look/gf_pass plus the new file only).

Checks (perf lock held; own vite preview on 5492; `.claude/probes/K1396/k1396_ab.mjs`: seed 7 `xp=threads&am=instant&snd=none&fw=0&phw=0`, cheapest-choice walk 0,220,203,173,172,171,209,273,272,271, clocks pinned by `__knotPinClocks` with growth full; mask = any channel > 24 from the frame's mode colour, as in the reveal sheets):

1. Visible-thread mask against today's: at 0 / 5 / 10 moves, master gf read 68,236 vs 126,235 px (IoU 0.540), 84,600 vs 234,928 (0.354), 74,209 vs 246,639 (0.297). New gf: 68,232 (ratio 1.000, IoU 0.996), 84,363 (0.997, 0.992), 73,967 (0.997, 0.992). Bar 0.9 holds at all three states.
2. Outside the explore view (explore off after the walk): new gf against master gf differs by 449 px whole-frame, 0 px in the thread area (every differing pixel inside the panel strip x 1071–1169, y 110–116, the same UI noise 24B recorded).
3. Crops (today | master gf | new gf, 4x) under `.claude/probes/K1396/out/24E/`: `crop_s0.png`, `crop_s5.png`, `crop_s10.png`, beside the per-mode captures (`base_today_*`, `base_gf_*`, `new_gf_*`).
4. `npm test` green: 246 files, 3091 passed. New `test/render/gf_explore.test.ts` (6 tests: the bake against `pieceVis`, knots, corner gates, headers, the look form's sites); the K299 quotient registry gains `exAt`'s ring wrap.

Left. K1396 closes here. Filed K1434: under a burn the explore shader's char/ember/smolder shading is not ported (the burnt-gone holes already cut through the pieces), and corner gates read the declared pieces rather than the burn gate pieces. The look-off gf programs (the `look: false` A/B) do not carry the explore sites, as they carry no look at all. K1407, K1416 and K1418 stay open.

## Run F (24F): K1414 part 1 again, land the hover rim, then the route bands (K1424)

24B kept its work as `.claude/probes/K1414/k1414_part1_full.patch` and landed nothing (Handoff 24B): the rim passed
(gf 456 px against today's 470, IoU 0.929), the bands did not (1,721 against 747, IoU 0.147). Use 24B's state recipe
and probe (`.claude/probes/K1414/k1414_ab.mjs`, with its warm-up capture, background re-pin and hover-before-pin).

**Done:** 1. The hover rim lands as its own commit, pushed and deployed green: mask count within 15% of today's and
IoU at least 0.8. 2. The route bands: count within 15% and IoU at least 0.8, measured per junction against today's
fan first (24B's suspects: junctions today's fan has no record for, such as turnstiles and stubs, and a disc wider
than the fan and cover strips). If the bands miss at the stop line, the rim stays landed and you report the
per-junction numbers. 3. With neither feature showing, 0 px against master gf in the thread area. 4. Crops under
`.claude/probes/K1414/out/24F/` (today | master gf | new gf). 5. `npm test` green.

## Run G (24G): K1423, the shallow-crossing fade at eye walls

24A brought the fill look's fade to today's at ci77 and ci345 but not at the eye walls (seed3 ci346 err 0.110, seed5
ci248 0.481; `.claude/probes/K1417/out/24A/fade_*.txt`, `fade_probe.mjs`). Its handoff names window-end and along-eye
behaviour, plus section colour leaking into the scan. First make the scan read the fade alone (for example by A/B with
one section colour, or by reading alpha directly) and report the corrected numbers; then fix what is still off.

**Done:** 1. At 5 or more shallow crossings (sin < 0.5), including seed3 ci346 and seed5 ci248, the fade amount at
today's a=0.5 pixel is within 0.1 of today's. 2. Steep crossings (sin > 0.8, 5 or more) no worse than master. 3.
Crops (today | master gf | new gf) under `.claude/probes/K1417/out/24G/`. 4. `npm test` green.

## Run H (24H): K1425, the pulses and telegraph in the border look

24C drew the pulses and the telegraph under rp=gf in the fill look; in the border look (`tlk=border`) gf draws
neither inside the cleared interior, because `o1` carries no indication coverage (K1425).

**Done:** 1. 24C's probe and state (`.claude/probes/K1414/k1414c_ab.mjs`, seed 7, 10 cheapest moves, clocks at 100 /
100.45 / 101.3) with `tlk=border`: pulse and telegraph masks within 15% of today's count and IoU at least 0.8 at all
three times. 2. The fill look unchanged: 0 px against master gf with both features showing. 3. Crops under
`.claude/probes/K1414/out/24H/` (today | master gf | new gf). 4. `npm test` green.

## Run I (24I): K1431, the reveal's colours to today's bars

24D (01411434) brought the reveal's colours to gf but missed Run D's bars (Handoff 24D, K1431). Claude's look at its
crops (`.claude/probes/K1395/out/24D/crop_def_f5_150_60.png`, `crop_trace-rainbow_f5_60_300.png`; today | master gf
| new gf) shows three differences from today:
- In the burn, a faint dashed purple outline of every not-yet-revealed thread runs across the whole maze, where
  today shows only background.
- The rainbow's stripes are about twice today's width and fill the whole thread with saturated red and purple, where
  today shows narrower stripes.
- Threads read slightly wider than today's.

Measure with `.claude/probes/K1395/k1395_sheet.mjs` (the patient waits) against a vite preview build.

**Done:**
1. For burn (the default) and trace-rainbow on `b.FMKB4DIQ`'s sheet frames, in every frame:
   - gf's ink pixels within 15% of today's;
   - the mean ink colour within 10 levels per channel.
2. The ghost: in each frame, gf pixels that are background in today's frame but differ from it by more than 8 levels
   cover under 1% of today's background.
3. ink-dust, bloom-comet and trace-roots measured with bar 1, each reported as passing or not.
4. `am=instant` measured at 0 px against master gf.
5. Crops under `.claude/probes/K1395/out/24I/` (today | master gf | new gf).
6. `npm test` green.

## Every run from F on: measure the floor first, and share the GPU

Added by Claude after 24D. Two lessons from Runs A-D apply to every run from F on.

**Bars.** Several of this batch's pixel bars were never measured against what an exact match would score. 24A's IoU
0.5 on a 1 px casing is an example: a centre-sampled field cannot match today's MSAA mesh pixel for pixel. So
before working to a pixel bar (count, IoU, mean colour, fade amount):
1. Measure its floor. Use two captures of today on the same state and frame, or today at dpr 1 against dpr 2 where
   the bar compares across them.
2. Report the floor next to the result.
3. If the floor already misses the bar, the bar becomes the floor plus half the bar's margin; say so in the handoff.
   The crops still decide by eye: a result that meets a loosened bar but looks wrong next to today's is not Done.

**GPU.** A Claude agent's census (K1407) runs on the same GPU as your captures. 24D lost an hour to starved 60 s
waits, and the agents lost WebGL contexts twice. So:
- Take `$env:TEMP\claude-perf.lock` while capturing sheets or crops: one line with owner, start time and what.
- If another owner holds the lock, wait inside one blocking command. A lock older than 30 minutes is stale.
- Delete the lock when the captures are done.
