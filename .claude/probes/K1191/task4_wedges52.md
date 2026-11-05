# K1191 task 4: ji 147's 52 GPU-only wedges (Muse batch 19 Run D)

From Stage 4's x4 dump (read only). The copied `wedge_s4.mjs`
reproduces Stage 4's table exactly (candidate 19,971, masked 5,784,
GPU only 52 under both the fan-only and the composite scorings).
`wedges52.mjs` lists every one of the 52 (raw table `wedges52.txt`).

| by phase | t1 | t2 | t4 | t5 | t6 | t7 |
|---|---|---|---|---|---|
| GPU-only px | 2 | 1 | 12 | 10 | 12 | 15 |

(t0 and t3 have none.) By sample kind: fan x4 51, mixed f3 s1 1 - no
other record's sample on any of the 52, so task 2's record map
answers none of this: these are ji 147's own fan pixels. 40 of them
sit beyond strip reach (e < -1.5 px), 48 are bare in the fan twin
(both bands cov 0).

Luma, GPU minus composite model, pixel by pixel (`wedges52.txt` has
all 52): min -1.00, p10 -0.70, median -0.70, p90 -0.11, max -0.11 -
every value a sub-one-level step (the GPU frame is 8-bit; the twin
is float). The model side of the census line: ref - model ranges
1.05..1.99 (median 1.75) - every one of the 52 sits within 1 luma of
the 2/255 line on the model side, and 2.01..2.45 past it on the GPU
side.

Threshold test (a pixel is a wedge when its luma < ref - T, both
sides scored at the same T):

| census line T | 2 | 1.5 | 1 | 0.5 | 0 |
|---|---|---|---|---|---|
| of the 52, still GPU-only | 52 | 11 | 0 | 0 | 0 |

No pixel's structure explains any of them: no band switch, strip
edge or cover boundary is involved (51/52 are 4-fan-sample pixels,
their fan-twin and composite lumas identical; the one mixed pixel
differs by -0.59 like the rest).

Cause: the handoff's inference is CONFIRMED - threshold flips, not a
structure. The GPU sits 0.11..1.00 luma darker than the float model
at these pixels (8-bit quantisation of the same colour), which
carries them across the census's 2/255 line while the model stays
1.05..1.99 short of it; at a line of 1 the count empties.

Merge call: does not block K1139's merge (a threshold artefact in
the census, not a drawing defect).
