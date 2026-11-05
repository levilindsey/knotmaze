# K1191 task 3: ji 147's unlit arm 1, 276 px (Muse batch 19 Run D)

From Stage 4's x4 dump (read only), with the copied `crotch_fill.mjs`
(reproduces the handoff line exactly: fan px 58,740, unlit arms [1]
px 276, no fill over 0.02 at E = 1.56 / 2.5 / 3.0) and the new
`unlit147.mjs` / `unlit147_detail.mjs` (raw tables `unlit147.txt`,
`unlit147_detail.txt`).

ji 147 (centre 25.884, 1.362) has 4 arms; its two pulse bands run
0>3 and 0>2. Arm 1 (chain 58 slot 68 dir -1, direction (0.671,-0.741))
is the one arm no band uses - crotch_fill's "unlit arm".

## The 276 px

Phase-summed fan-footprint pixels on arm 1's ray (0.3..fanR 0.975
world from the centre, within 0.8 fh = 0.208 world of the ray; the
counted pixels actually sit 0.67..0.97 world out, at the fan's rim):

| phase | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | total |
|---|---|---|---|---|---|---|---|---|---|
| arm-1 fan px | 36 | 36 | 36 | 32 | 32 | 32 | 36 | 36 | 276 |

By what the GPU's samples show there (cover_lib kinds, all phases):
fan x4 93, this record's cover strip x4 119, mixed fan/strip/none 64,
another record's sample 0. Ruled out: a neighbour's fan over arm 1.

By GPU against the composite model (luma, per phase):

| class | t0 | t1 | t2 | t3 | t4 | t5 | t6 | t7 |
|---|---|---|---|---|---|---|---|---|
| GPU = composite (within 2) | 4 | 5 | 9 | 26 | 26 | 26 | 13 | 7 |
| GPU = webs-off (within 2) | 0 | 0 | 3 | 6 | 6 | 6 | 3 | 0 |
| neither within 2 | 32 | 31 | 24 | 0 | 0 | 0 | 20 | 29 |

So at the pulse's bright phases the GPU shows ribbon-bright colours
(up to luma 218) where the fan twin paints its quiet base; at t3-t5
most pixels match the model. The cover model does not explain the
bright pixels (its unmodelled input is gk, a foreign over thread's
silhouette discard - cover_lib's header); no input the brief lists
differs there in the model: strip twin = fan twin (both luma 148),
no other record's samples. This departure is recorded, not attributed;
it is not what "unlit" counts (crotch_fill counts footprint pixels
regardless of their colour), and it does not change the cause below.

## Why arm 1 is unlit there

| input | at the 276 px |
|---|---|
| pulse band declares it | NO - bands are 0>3 and 0>2; arm 1 is in no band (all 276 px) |
| a band's cover / crest reaches it | band cov max 0 at every px; crotch fill wW exactly 0 at every px, at every far edge E |
| which fill factor zeroes it | the SIDE factor at 276/276 (arm 1's pixels are on the same side of both bands - both bands turn out of arm 0 to arms 2 and 3, and rule (d) only fills between two bands on opposite sides); the distance factor also zeroes 16, min(f*y) 210, but side alone suffices everywhere |
| the fan's own base | NOT dark: fan base luma 144.2..150.6 (mean 148.0), uniform, and the fan twin's out = base at every px (no band, no fill) - the quiet base a banded record shows where nothing lights it |
| the light (bands' f) | the bands' crest f reads up to 213/255 at their feet, but with cov 0 and fill 0 none of it lands on arm 1 |

Cause: no pulse band declares arm 1, and rule (d)'s crotch fill
cannot reach it by construction (its side test requires the pixel to
lie between the two drawing bands; arm 1's rim pixels lie outside
both). The fan there is its ordinary quiet base - unlit in exactly
the sense e79/e134 are lit-with-no-band's mirror: a declaration
question for S4's pulse tree, not a drawing defect. (The bright
GPU-only colours above sit on top of this and are unexplained by the
cover model; they do not make arm 1 lit by a band - debug-5 G there
is the fan twin's 0 too, e.g. px_s4 at (180,70) t0: GPU G 0, fan
twin G 0.)

Merge call: does not block K1139's merge (a declaration/design
matter for S4, not a defect proved in the fan).
