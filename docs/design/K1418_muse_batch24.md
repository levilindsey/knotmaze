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

## Run C (24C): K1414 part 2, the pulses and the telegraph

**Done:** 1. At three fixed sim times on the same state, each feature's mask against today's: count within 15%,
IoU at least 0.7. 2. With neither feature showing, 0 px against master gf. 3. Crops. 4. `npm test` green.

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
