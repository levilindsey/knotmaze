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
