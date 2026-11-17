# K1448: Muse batch 25, rp=gf's look leftovers (2026-11-17)

Four runs (tags 25A-25D), started by Claude through Paseo with the K1053 chain, one after another in the main
checkout. Batch 24's How to work (`docs/design/K1418_muse_batch24.md`, including "Every run from F on: measure
the floor first, and share the GPU") and batch 23's hold in full, with these changes:

- Your tag is `25<X>`; commit messages end `(Muse batch 25 Run <X>, 25<X>)`; append `### Handoff 25<X>`
  under your run's section here.
- **Hands off the junction field**: `tables.ts`, `eval.ts`, `gf_keys.ts` and the field evaluation in
  `gf_glsl.ts`. A Claude agent (K1449) is changing them behind the `gfh=1` flag. Without `gfh=1` the tables
  digest stays bit-identical and `test/render/gf_home_glsl.test.ts` stays green in every run.
- Leave K1448 and K1449 open.
- Crops at 4x go under `.claude/probes/<ID>/out/25<X>/` (today | master gf | new gf).
- Each run is a fix run with a stop line of 2 h. If the bar is not met at the stop line, land what is a real
  fix (0 px elsewhere), and write in the handoff what you measured, what you tried and why each fell short.

## Run A (25A): K1447, the pulse at the head junction fan in the border look

24H drew the pulses under `tlk=border`; at the head junction's fan gf draws pulse where today's fan fills dark
(ledger K1447; Handoff 24H). Probe and state: `.claude/probes/K1414/k1414h_ab.mjs` + `mask_h.mjs`.

**Done:** 1. Pulse mask within 15% of today's count and IoU at least 0.8 at clocks 100 / 100.45 / 101.3.
2. Telegraph unchanged from 24H (ratio 1.017, IoU 0.958) and the fill look 0 px against master gf.

### Handoff 25A (Muse, 2026-11-17, partial: counts and telegraph/fill Done, pulse IoU short at two clocks)

Started 05:58 PST, stopped 07:53 PST. The border pulse hi is now gated at junction fans: `GfDynTable` bakes a fourth texel per sample (fanD, the sample's arc distance from the junction end its crest comes from; dyn stride 3 -> 4 texels in `gf_look.ts`/`gf_pass.ts`), and the label site's `lkPulseHi` is scaled by `lkFanWin` = ss(2.5 uH, 3.0 uH, fanD). Fill never reads the hi target, so the fill look is unchanged by construction. No `tables.ts`, `eval.ts`, `gf_keys.ts` or `gf_glsl.ts` field change; `gf_home_glsl.test.ts` green.

Floor first (25at vs 25at2, two today loads): ratio 1.000, IoU 1.000 for pulse and telegraph at all three clocks, so the bars stand as written. Baseline (master gf, 24H numbers reproduced exactly on 25at/25an): pulse 1.134/IoU 0.679, 1.336/0.612, 1.022/0.795. After: **0.942/0.786, 1.033/0.748, 0.969/0.823** — every count within 15% (100.45's count now passes), IoU up at every clock, but 0.8 holds only at 101.3. Telegraph unchanged: 1.017, IoU 0.958 at all three times. Fill (25af9 vs fmaster): 552 px whole-frame, all in the panel stamp strip (x 1071-1169, y 110-116); 0 px in the thread area at all three times.

Why IoU stalls: the gf-only residue (61/89/59 px, r 12-20 px from the head) is crest bar inside the fan whose foot sits past the gate (fanD up to ~3.7 uH at the fan's rim wedges), while today's bars at the same clocks begin at the rim — a single arc-distance gate cannot separate them; wider gates (2.9-3.7 uH: IoU 0.815/0.719/0.844, count 0.832 at 100.45) and sharper (3.3-3.6: 0.830/0.706) trade gf-only for today-only at the rim, worst at 100.45 where the crest phase sits on the rim. Two dead ends measured: a piece-end-vertex gate in the shader (plo/phi are scan-local windows, not piece spans, so it never fired) and a lateral (lkD) gate (the fan X runs along the centrelines, lkD ~ 0). The per-arm rim (corner tangent arcs) is tables-side and hands-off this batch. Crops (today | master gf | new gf, 4x) under `.claude/probes/K1414/out/25A/crop_pulse_t100_45.png`: by eye the fan X is gone and the dashes sit where today's sit. `npm test` green: 250 files, 3113 passed. K1447 stays open for the IoU residue; K1448 and K1449 untouched.
3. Crops. 4. `npm test` green.

## Run B (25B): K1431, the reveal's ink counts and ghost

Read Handoff 24I whole (its two angles at the end) and ledger K1431. The excess sits at junctions and crossings
from frame 4 on (Y-shaped blobs at nearly every junction in `out/24I/diffmap_f4.png`) and in a 1-4 px fringe.
Find what today's reveal does at a junction fan that gf's does not (when the fan appears, its width mask) by
measuring one junction frame by frame before changing anything.

**Done:** 1. Burn and trace-rainbow on `b.FMKB4DIQ`'s sheet frames: gf's ink pixels within 15% of today's in
every frame. 2. The ghost under the measured floor plus 1% in every frame. 3. Burn's red channel within 10
levels at f2-f3. 4. `am=instant` 0 px against master gf. 5. Crops. 6. `npm test` green.

## Run C (25C): K1424, the route bands

Third run at this (24B, 24F); read ledger K1424 and Handoff 24F whole. Work one junction at a time, worst
first: ji80 (same-chain bands, 32 px against today's 80), then ji156 (96 against 231), then ji0 (287 against
110), then the gf-only clusters along the arms near ji80. For each, find the cause before the fix and write it
down.

**Done:** 1. On 24F's state (seed 7 walk): the same-state band mask within 15% of today's count and IoU at
least 0.7 overall, and each of the 8 routed junctions within 25% and IoU at least 0.6. 2. 0 px against master
gf with no route showing. 3. Crops per junction. 4. `npm test` green.

## Run D (25D): K1434, the burn's char and embers in the explore view

24E brought the K76 thread reveal to gf; under a burn (K290) gf draws the pieces' visibility but not the
explore shader's char, ember and smolder shading, and corner gates read the declared pieces, not the burn's
gate pieces (ledger K1434; Handoff 24E).

**Done:** 1. On 24E's probe state with a burn running, at three clock times: the mean colour of burnt pieces
within 10 levels per channel of today's, and gf pixels differing from today by more than 8 levels under the
measured floor plus 2%. 2. With no burn: 0 px against master gf. 3. Crops. 4. `npm test` green.
