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

### Handoff 25B (Muse, 2026-11-17, partial: Done 1 and 3 met, the ghost improved but not met)

Started 08:15 PST, stopped 09:53 PST. Landed: the reveal's interior fill now windows at junctions. `GfFxTable` bakes each sample's drawn-arc distance to its chain's nearest junction (the tables' corner arm arcs, into FX texel 1.z; `gf_app` feeds the installed tables to the bake), and the look label site scales `lkHi` by `clamp((jDist - uLkJ) / pxW + 0.5)` with `uLkJ` from `gf_pass.setLook` — 0.45 of today's junction-cut reach (the corner arm arcs sit at the fan's root inside that reach). No `tables.ts`, `eval.ts`, `gf_keys.ts` or `gf_glsl.ts` field change; the window acts only under `uFxLive`, so the rest frame is unchanged by construction.

Floor first (24Ibase vs 24Irep, two today loads): count ratios 0.988-1.016, ghost floor f3 0.16 / f4 0.41 / f5 1.39 / f6 0.20 / f7 0.03%, so Done 2's bars are floor+1% (f5: 2.39%). Baseline on this build (25Bbase_def, burn): counts 1.27 / 1.24 / 1.30 at f4-f6, ghost 4.34 / 5.48 / 4.82%, burn R off by 15.9 / 13.2 at f2-f3.

Junction measured before changing anything (90 px box at (265, 260), `k1431_jn.mjs`): parity at f3 (410 vs 421), then gf 1.385x at f4 (2968 vs 4112) — the excess turns on as junctions complete. Pins at t=7.984 decomposed it: corner surfaces forced off and forced on moved the ratio by at most 0.013 (not the corners); `lkHi = 0` collapsed gf to 0.217x today (the counted ink is interior-fill dominated in both renderers); rest (`am=instant`) matched at 1.000. The mechanism: gf fills the border interior over the field coverage wherever the label's chain is FX-live, arm surfaces running through junction centres, while today's ribbons hand their material to the fan rim inside the junction-cut reach and the fan interior stays hollow (`junction_field` lookA = fanEdge; `ribbon_shader` kJunctionCut).

After: burn counts 0.938 / 0.946 / 0.922 / 0.927 / 0.923 / 0.941 / 0.942 (f1-f7; f8 is the fog end frame, 1.686 against master's 1.709), burn mean deviations at most 3.6 per channel (R at f2-f3: 3.6 / 2.2 — Done 3 met), rainbow counts 0.992 / 0.971 / 0.913 / 0.896 / 0.913 / 0.915 / 0.931 (Done 1 met). Ghost: burn 0.78 / 1.53 / 2.53 / 1.75 / 1.05 at f3-f7 (was 0.71 / 4.34 / 5.48 / 4.82 / 2.17) — under floor+1% at f3 only, over by 0.1-0.6 points at f4-f6; rainbow f5 3.16%. Done 2 not met: the residue is faint (at f5 only 1103 of 5202 ghost px differ by more than 24) and sits along threads, not at fans — the next angle is the field's edge profile against today's MSAA alpha within one thread width of crossings, on shared-ink pixels. Done 4: no pixel check landed — the instant pin recipe (`k1431_pin -1`) caught loader/settle frames on this loaded machine (both builds), so `am=instant` stands on the construction argument alone (the window is inside `uFxLive > 0.5`; the FX bake's new texel value is read nowhere else) and wants a sheet-based recheck. Crops (today | master gf | new gf, 4x) under `.claude/probes/K1395/out/25B/`: `crop_jn_f4_new.png`, `crop_def_f5_new.png`, sheets `25Bfix2_def`, `25Bfix2_trace-rainbow`; probe tools `k1431_jn/inkcmp/class/fb/vals/inst.mjs` (untracked). `npm test` green: 250 files, 3114 passed (new `gf_fx.test.ts` case: the junction-distance bake against the corner arcs, the shader window text). K1431 stays open for the ghost residue; K1448 and K1449 untouched. Perf lock released; preview server (5502) stopped.

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
