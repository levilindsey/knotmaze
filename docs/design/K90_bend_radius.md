# K90 stage 1b: the bend bound

Stage 1b of K90 (`docs/design/K90.md`: its "Stage 1b handoff" and "Stage 1b
brief"), 2026-10-14, built on branch `worktree-agent-a15ef7bcac0582272`. The
evidence is untracked, in that worktree's `.claude/probes/K90/out_1b/` (paths
below are relative to `.claude/probes/K90/`); the coordinator copies it at
the merge.

Notation: h = the ribbon half-width. w1 / w115 = the fold census's
over-tight windows, those whose rendered centerline turns tighter than
1.0 h / 1.15 h (K90.md, "Census results"). "a | b" = all windows | the
windows outside the junction webs. States: `fresh` (the settle's rest),
`gEnd` (each gesture at the end of its hold, still grabbed), `gRest` (each
gesture's re-sleep), `after` (the rest after the gesture battery), `violent`
(the rest after each of the two drag sessions).

## Status and summary

- **Step 1, the crop check: done.** The junction webs cover junction-host
  folds within 0.92 h of a fused-junction center and nothing beyond it.
  `scripts/fold_census.ts` reports those windows under a new holder, `web`
  (counted separately, never dropped). Outside the webs, the maze sets keep
  0 to 13 windows per design at fresh rest, and the tw .64 set keeps 61.
- **Step 2, option 3: built, OFF by default.** The BEND BOUND relaxes the
  resampled centerline wherever it turns tighter than 1.2 h, in
  `src/geometry/spline_generator.ts`. The debug hook
  `window.__knotSplineBend` switches it; no link or codec param does.
  With it on, all sets: fresh 2357/4045 -> 10/13, after the gestures
  7423/12315 -> 44/55, after the drags 1592/2563 -> 21/25. Every holder is
  below the base in every state.
- **It stays in rendering.** Nothing in the physics reads the samples, so
  the physics guards and the knot golden cannot move. With the flag off,
  the full suite is green and the golden is byte-identical.
- **The sheet for Levi:** `out_1b/sheet/sheet.png`. Ribbon rebuild cost:
  +0.6 to +1.1 ms per `update()` (5-9%), desktop only.
- **One regression:** a scan's single tightest window can get tighter. At
  fresh rest that happens on one tw .64 design (0.299 h -> 0.132 h) and
  the standing links (0.409 -> 0.399 h); over every state it is 24 of the
  585 scans, mostly the links' gesture scans, worst star24_1471kin after a
  drag (0.355 -> 0.094 h).
- **The soft clamp (census r3, an option, off):** capping each relaxed run
  as a whole instead of each sample cuts those 24 scans to 4 on the same
  particles (0 at fresh rest; the t64 design's min 0.132 -> 0.339 h, above
  its base), so the per-sample clamp causes most of the regression. It
  leaves two drag scans (star24_1471kin 0.355 -> 0.112 h, the links 0.397
  -> 0.212 h) and costs some windows after the gestures (44/55 -> 55/61).
  Not the default: the sheet shows the hard clamp.
- **Recommendation: tune, then ship behind the flag once Levi has looked
  at the sheet.** Options 1 and 2 are not needed for the rendered folds.

## The baseline

1a's tables are in K90.md, "Census results" (lines 121-184), measured at
`66ee658`. This run's base (the bound off) matches 1a exactly on the knot
sets and the links, but not on the maze sets (w1/w115 summed per set,
fresh rest and the rest after the gestures; `out_1b/analyze_r2.txt`, first
section):

| set | 1a fresh | 1b fresh | 1a after | 1b after |
|---|---|---|---|---|
| def | 411/714 | 366/644 | 102/191 | 105/169 |
| fat | 431/638 | 374/594 | 120/167 | 101/152 |
| thin | 185/234 | 157/194 | 50/62 | 39/49 |
| t64 | 829/1364 | 802/1331 | 199/342 | 210/343 |
| star24 | 165/284 | 153/242 | 40/67 | 28/52 |
| tree22 | 126/230 | 110/199 | 39/67 | 29/50 |
| ring20 | 171/292 | 133/228 | 49/76 | 40/69 |
| knot sets, links | | equal | | equal |

Between `66ee658` and this branch, master gained K110 (`3b8495f`,
`6b03a75`: every piece reachable), K74 (`fbf5b5c`: long dead ends,
exitClearance 12, the `.J` defaults edited in place) and K147 (`b0a1c49`,
`1d31ffd`: the load settle). Maze designs moved and knots did not, which
points at the generation changes; that is inferred from the commit range,
not attributed. **Every comparison below uses this run's base, not 1a's.**

## Step 1: the crop check

Probe: `k90_crops.mjs cover`. Desktop 1400x900 at dpr 2, 8 designs, each
frozen at rest, every window under 1.0 h (370). Each frame is shot four
ways: everything, webs hidden (`filletMesh` and `filletTopMesh`), webs
only, nothing. That gives the exact web pixels and the pixels the webs
change. For each window the probe takes a disc of radius h around its
tightest sample and measures two fractions of it: the part under a web, and
the part that changes when the webs are hidden. `jw` = the distance from
that sample to the nearest fused-junction center (the mean of the group's
particles), in h.

| class (1a holder) | jw (h) | n | disc under web >= 90% | >= 50% | mean | changed by hiding the webs |
|---|---|---|---|---|---|---|
| jhost | 0-0.92 | 251 | 82% | 100% | 0.93 | 0.04 |
| jhost | 0.92-1.5 | 17 | 0% | 41% | 0.48 | 0.08 |
| jhost | 1.5-2.5 | 11 | 0% | 73% | 0.65 | 0.08 |
| 2-ctrl collision | 0.92-1.5 | 3 | 0% | 100% | 0.74 | |
| 2-ctrl collision | 1.5-2.5 | 43 | 2% | 53% | 0.49 | |
| far | | 45 | 0% | 4% | 0.10 | 0.00 |

All junction hosts: 279, 73% at least 90% covered. All 2-ctrl collisions:
46, 2% at 90%, 57% at 50%.

Verdict:
- **Junction hosts within 0.92 h of a junction center are under the web.**
  Hiding the webs changes only 4% of their disc, because the web draws over
  ribbon that already fills it. jw has a gap between 0.5 and 0.92 h, so the
  cut is clean, and none of the 28 junction-host windows beyond 0.92 h has
  90% of its disc covered.
- **The 2-ctrl collision cluster is not covered** (2% at 90%). It stays a
  target. So do the far windows (4% even at 50%).
- `fold_census.ts` now gives a window the holder `web` when its tightest
  sample lies within WEB_COVER (0.92 h; env `K90_WEB_COVER`) of a
  fused-junction center. The test comes after `grab` and before every other
  holder, and the holder 1a would have given is kept as `h0`. The census
  also records `fj` ([r, h0, jw]) for the worst 300 windows of each scan,
  and `WEB_STEPS` [0.92, 1.5, 2.5] report the count at each reach.
  `scripts/fold_census.mjs` lists the new holder; 1a's rows read it as 0.

Windows under 1.0 h per design in the cover set, and how many lie outside
the webs (by 1a holder):

| design | windows | outside the webs | jhost | 2-ctrl | far |
|---|---|---|---|---|---|
| def_1q2w3e | 41 | 6 | 2 | 3 | 1 |
| def_1471kin | 40 | 7 | 0 | 1 | 6 |
| def_k88dtb | 36 | 5 | 2 | 1 | 2 |
| fat_1471kin | 53 | 13 | 6 | 7 | 0 |
| t64_2b5fq1 | 121 | 79 | 17 | 32 | 30 |
| thin_3zz2a1 | 15 | 0 | | | |
| star24_9xk2m0 | 36 | 5 | 1 | 1 | 3 |
| ring20_7h7h7h | 28 | 4 | 0 | 1 | 3 |

**Windows per maze design** (census, fresh rest, w1 outside the webs):
default 9.6, fat 12.8, thin 0, tw .64 61.4, star 7, tree 7, ring 8.5. The
handoff estimated about 16.

Crops: `out_1b/cover/cover_sheet.png` (and `.html`; 217 crops, each
labeled with its class, r, jw and both fractions). Every row is in
`out_1b/cover/cover.json`; `node k90_cover_stats.mjs
out_1b/cover/cover.json` prints the tables above.

## Step 2: option 3, the spline side

### The curve, or the resampling?

The census measures the samples the renderer draws. Two variants
re-sample the same live state in every scan (`K90_VARIANTS`, census r1,
`out_1b/census.jsonl`, `out_1b/analyze_r092.txt`):

- `sub96`, the arc-length table at 96 subdivisions per segment instead of
  12: fresh 2381/4095 against the base's 2357/4045. The arc-length table
  is not the cause.
- `dense96x4`, 96 subdivisions and 4x the samples: 4833/7916, about twice
  the base. The curve itself turns tighter than today's sample spacing
  shows. Since the samples are what is drawn, the census at today's
  spacing is the rendered measure.

So the folds come from the curve's own overshoot at corners of the particle
polyline, not from the resampling.

### Why a bound, not another interpolant

Take one corner of the particle polyline: legs of length L, turn φ, the
legs beyond it straight. At the vertex, a Catmull-Rom segment (uniform and
centripetal agree on equal legs) has |p'| = L cos(φ/2) and
|p''| = 4L sin(φ/2), perpendicular, so its radius there is
r = L cos²(φ/2) / (4 sin(φ/2)). The polyline's own leg radius (bend_radius's
measure, the circle tangent to both legs at their midpoints) is
R_poly = (L/2) cot(φ/2). So

    r / R_poly = cos(φ/2) / 2:  0.48 at 30°, 0.35 at 90°, 0.19 at 135°.

The spline turns at least twice as tight as the polyline at every corner.
1a measured cr_corner = 0.35-0.52 on the samples (K90.md 171-184), a little
above the formula at large turns because the samples under-resolve the
peak, which agrees with dense96x4.

A uniform cubic B-spline doubles that ratio, to cos(φ/2), but no longer
interpolates: it moves every vertex off its particle by L sin(φ/2) / 3, and
crossings, junctions and the gaps are placed at the particles. Even so, at
the particle floor's limit (R_poly = 1.15 h with legs of about 2.5 h, so
φ ≈ 95°) it reaches only 0.78 h, still under 1.0. No interpolant through
these particles holds 1.0 h by itself, so the fix is a bound on the
samples.

### The algorithm

`boundBend(pos, count, closed)` in `src/geometry/spline_generator.ts` runs
in both `sampleClosedSpline` and `sampleOpenSpline`, after the uniform
arc-length resampling and before the tangents, so the tangents and normals
follow the moved samples. Flow displacement happens before it, the
bridge-tip tuck after it.

1. Detect: `overTightWindows` (bend_radius.ts, the census's own measure)
   at R = ratio × h.
2. Relax each run in place (Gauss-Seidel): over the run plus a margin each
   side, every sample whose turn radius is under R moves halfway to the
   midpoint of its two neighbors, clamped to maxShift × h from where the
   spline put it. That straightens the sample and passes part of its turn
   to its neighbors, so the turn spreads along the margin. At most 48
   sweeps, stopping when no sample moves by 1e-6.
3. The margin is the room the run's turn needs at radius R:
   ceil(R |turn| / spacing / 2) samples a side, at least 3 and at most
   marginMax.
4. Repeat detection and relaxation `passes` times: a later pass catches a
   turn the previous one pushed to the edge of its range.

Skipped: a window that covers its whole ring, and a run turning more than
maxTurn = 200° (two samples either side included), a loop that a local
relaxation could only shrink. The census skipped none. An open run keeps
its end samples.

Per K90's "For all three" rule, the bound is one-sided (it acts only under
R) and capped (maxShift). It needs no rate limit: it is recomputed from the
spline every frame and carries nothing between frames, so it cannot pump.

Defaults (`splineBend` in spline_generator.ts): enabled false, ratio 1.2,
maxShift 0.5 h, marginMax 24, passes 3, maxTurn 200°, iterations 48. The
renderer sets `halfWidth` = threadWidth / 2 in each `update()`.
Diagnostics accumulate in `moved`, `shiftMax`, `runs` and `skipped`.
`window.__knotSplineBend(on?, opts?)` (ribbon_renderer.ts) sets the flag
and any option, zeroes the diagnostics, re-runs `update()` and
`rebuildFillets(true)`, and returns the state; with no arguments it only
reports.

### The census

Census r1 (`out_1b/census.jsonl`, `analyze_r092.txt`), all sets, one pass:

| variant | fresh | gEnd | gRest | after | violent |
|---|---|---|---|---|---|
| on:1.05:0.5 | 9/3214 \| 7/1768 | 59/9760 | 63/9694 | 9/975 | 33/2054 |
| on:1.2:1.0 | 29/61 \| 28/56 | 122/212 | 116/205 | 10/19 | 32/52 |

Holding 1.05 h leaves the windows between 1.05 and 1.15 h in w115, which
barely moves, so the ratio went to 1.2.

Census r2 (`out_1b/census_r2.jsonl`, `out_1b/analyze_r2.txt`), all sets,
with the web class (variant = `on:ratio:maxShift[:marginMax[:passes]]`):

| state | base | on:1.2:0.5 (one pass) | **on:1.2:0.5:24:3 (chosen)** | on:1.2:1.0:24:3 |
|---|---|---|---|---|
| fresh | 2357/4045 \| 954/2189 | 28/60 \| 26/54 | **10/13 \| 8/10** | 10/12 \| 9/10 |
| gEnd | 7474/12420 \| 3323/6911 | 119/203 \| 110/190 | **46/56 \| 30/38** | 56/66 \| 45/53 |
| gRest | 7423/12315 \| 3292/6815 | 110/196 \| 103/184 | **44/55 \| 29/37** | 54/66 \| 44/53 |
| after | 746/1228 \| 340/686 | 10/19 \| 9/17 | **5/5 \| 3/3** | 6/6 \| 5/5 |
| violent | 1592/2563 \| 715/1441 | 35/52 \| 32/48 | **21/25 \| 17/18** | 20/25 \| 17/20 |

r2's one-pass rows reproduce r1's exactly (the census is deterministic),
and `on:1.2:0.5:24:1` equals one pass at the old margin cap of 12: the cap
alone changed nothing, the passes did.

Where the chosen variant leaves windows (w1/w115, all | outside the webs):
- fresh: fat 2/2 | 1/1, thin 1/1 | 0/0, t64 5/7, links 2/3 | 2/2, every
  other set 0;
- gRest: t64 10/12, kt64 3/4, links 31/39 | 16/21, the rest 0;
- violent: t64 3/3, kt64 1/2, star24 3/3, links 14/17 | 10/10, the rest 0.

Base per set, fresh, for scale: def 366/644 | 77/240, fat 374/594 |
102/261, thin 157/194 | 0/1, t64 802/1331 | 491/904, kdef 9/74, kfat 6/80,
kt64 81/199, star24 153/242 | 28/84, tree22 110/199 | 28/73, ring20
133/228 | 34/101, links 166/260 | 98/172.

**Per holder, base -> chosen** (w1/w115, all sets; from each scan's worst
300 windows, so the base sums are slightly capped):

| holder | fresh | gEnd | gRest | after | violent |
|---|---|---|---|---|---|
| grab | | 88/139 -> 0/2 | | | |
| web | 1403/1856 -> 2/3 | 4150/5508 -> 16/18 | 4131/5500 -> 15/18 | 406/542 -> 2/2 | 877/1122 -> 4/7 |
| jhost | 172/316 -> 2/2 | 682/1067 -> 11/13 | 695/1085 -> 11/15 | 72/111 -> 1/1 | 138/237 -> 2/3 |
| jtip | 56/95 -> 0/0 | 174/265 -> 0/0 | 155/237 -> 0/0 | 14/21 -> 0/0 | 40/61 -> 0/0 |
| tip | 0/1 -> 0/0 | 0/10 -> 0/0 | 0/10 -> 0/0 | 0/1 -> 0/0 | 0/2 -> 0/0 |
| kink | 300/805 -> 1/2 | 694/2054 -> 3/3 | 736/2092 -> 1/3 | 72/208 -> 0/0 | 147/403 -> 0/1 |
| crossing | 63/173 -> 2/3 | 381/899 -> 0/0 | 362/866 -> 1/2 | 43/92 -> 0/0 | 125/254 -> 3/3 |
| collision | 229/431 -> 1/1 | 874/1399 -> 5/8 | 911/1439 -> 5/7 | 93/144 -> 1/1 | 189/291 -> 6/6 |
| free | 131/368 -> 2/2 | 405/1079 -> 11/12 | 413/1086 -> 10/10 | 44/109 -> 1/1 | 71/193 -> 5/5 |

From one pass to three, the `web` holder rose in the gesture states (gEnd
9/13 -> 16/18): some windows moved under the webs, still far below the
base.

Diagnostics, fresh, all rows: one pass moved 14218 samples in 4824 runs;
the chosen variant 14283 in 4906 runs; on:1.2:1.0:24:3 14292. No run was
skipped. The largest shift equals maxShift in each variant (0.5 h, or 1.0 h).

### The tightest window gets tighter

The census also keeps each scan's tightest window (min r, in h). Fresh rest,
per set (base, one pass, chosen, on:1.2:1.0:24:3):

| set | base | one pass | chosen | maxShift 1.0 |
|---|---|---|---|---|
| def | 0.456 | 0.978 | 1.200 | 1.200 |
| fat | 0.449 | 0.722 | 0.722 | 0.722 |
| thin | 0.504 | 0.795 | 0.795 | 1.200 |
| **t64** | 0.299 | 0.231 | **0.132** | **0.049** |
| kdef | 0.875 | 1.200 | 1.200 | 1.200 |
| kfat | 0.957 | 1.200 | 1.200 | 1.200 |
| kthin | 1.549 | 1.549 | 1.549 | 1.549 |
| kt64 | 0.551 | 0.946 | 1.201 | 1.201 |
| star24 | 0.537 | 1.051 | 1.200 | 1.200 |
| tree22 | 0.475 | 1.200 | 1.200 | 1.200 |
| ring20 | 0.511 | 1.200 | 1.200 | 1.200 |
| **links** | 0.409 | 0.399 | **0.399** | 0.378 |

(`out_1b/analyze_r2.txt`, "min ratio".) The worst row is t64_1q2w3e (base
0.299). Others: link_user_rect 0.399
(base 0.409), fat_1q2w3e 0.722 (base 0.501), t64_1471kin 0.744 (base
0.572).

Over every state, the scans whose min falls below the base's on the same
particles (`node k90_minrows.mjs out_1b/census_r2.jsonl`,
`out_1b/minrows_r2.txt`; 79 fresh, 220 gEnd, 220 gRest, 22 after and 44
violent scans):

| variant | fresh | gEnd | gRest | after | violent | worst |
|---|---|---|---|---|---|---|
| one pass | 2 | 9 | 10 | 1 | 2 | star24_1471kin violent 0.355 -> 0.094 |
| chosen | 2 | 9 | 10 | 1 | 2 | the same; t64_1q2w3e fresh 0.132 |
| maxShift 1.0 | 2 | 10 | 10 | 1 | 3 | star24_1471kin violent 0.355 -> 0.019 |

Outside fresh rest every one of them is link_user_rect, except
star24_1471kin's drag. The passes deepen the t64 case only; a larger
maxShift deepens every case.

Hypothesis: the per-sample clamp. A sample that reaches maxShift stops,
its neighbors keep straightening, and the turn concentrates on the clamped
sample, more so with a larger maxShift. Census r3 tested it (next
section): it explains 20 of the 24 scans. `node k90_minsite.mjs
<census.jsonl> [variant] [n]` lists a variant's tightest fresh rows. The
counts above say these are a handful of samples; the min says that each
of them is worse than before.

### The soft clamp (census r3)

`splineBend.soft` (default false): relax each run with no per-sample clamp,
then blend the whole run back toward its positions before the relaxation,
pos = pre + t (relaxed - pre), with the largest t in [0, 1] that keeps every
sample of the run within maxShift of the spline (per sample, the larger
root of a quadratic in t; the stable form). A sample's second difference
is linear in the positions, so a blended run turns about no tighter than
the tighter of its two states, and no single sample is stopped while its
neighbors go on. The hard path is untouched: r3's `on:1.2:0.5:24:3` rows
equal r2's in every count and min.

Census r3 (`out_1b/census_r3.jsonl`, `out_1b/analyze_r3.txt`,
`out_1b/minrows_r3.txt`), all sets, w1/w115, all | outside the webs:

| state | base | on:1.2:0.5:24:3 (the default) | soft:1.2:0.5:24:3 | soft:1.2:1.0:24:3 |
|---|---|---|---|---|
| fresh | 2357/4045 \| 954/2189 | 10/13 \| 8/10 | 10/12 \| 8/9 | 9/11 \| 7/8 |
| gEnd | 7474/12420 \| 3323/6911 | 46/56 \| 30/38 | 54/63 \| 32/38 | 57/67 \| 36/44 |
| gRest | 7423/12315 \| 3292/6815 | 44/55 \| 29/37 | 55/61 \| 33/36 | 56/66 \| 36/43 |
| after | 746/1228 \| 340/686 | 5/5 \| 3/3 | 6/5 \| 4/3 | 6/6 \| 4/4 |
| violent | 1592/2563 \| 715/1441 | 21/25 \| 17/18 | 23/25 \| 19/19 | 21/26 \| 15/18 |
| scans with a tighter min | | 24 of 585 | **4 of 585** | 23 of 585 |
| min, fresh, all rows | 0.299 | 0.132 | **0.339** | 0.135 |

(w1 can exceed w115: one window under 1.15 h can hold two under 1.0 h.)

Soft at 0.5 h:
- fresh rest: no scan worse than its base. The t64 design's min rose to
  0.339 h (base 0.299), the links' to 0.648 (base 0.409), thin's to 1.165;
- the gestures: one scan each in gEnd and gRest (link_user_rect, 0.383 ->
  0.363 and 0.458 -> 0.441 h);
- the drags: two, star24_1471kin 0.355 -> 0.112 h (hard 0.094) and
  link_user_rect 0.397 -> 0.212 h (hard 0.309: worse);
- the counts: about the same at rest, 8-11 more windows under 1.0 h in the
  gesture states (gRest 44 -> 55), still 99.3% below the base.

Soft at 1.0 h brings the regression back (23 scans, t64 0.135 h,
star24_1471kin 0.045 h). So the per-sample clamp causes most of the
regression, and something that grows with the allowed shift causes the
rest. Untested candidate: the samples just outside a run's range, which
take more turn when the run's edge sample moves and which the last pass
never revisits. Attributing it needs the census to keep each variant's
worst windows (it keeps counts and the min only).

## Guards (K90.md, "Guards and acceptance")

- **Flag off: met.** `npx vitest run` green at 08:41 and again at 08:55
  with the soft clamp in the source (60 files passed and 1 skipped, 686
  tests passed and 1 skipped), the knot golden
  (`test/physics/byte_identity.test.ts`) byte-identical among them: the bound is behind `if (splineBend.enabled)`, and with it
  off the samplers run the same instructions as before.
- **Flag on, the physics guards** (the sleep regression, K63's census and
  gesture battery, quiescence, the kink-eye censuses, the step cost) **and
  the golden: not run, because the change cannot reach Layer 3.**
  Evidence:
  - Only `src/render/ribbon_renderer.ts` imports and calls
    `sampleClosedSpline`, `sampleOpenSpline` and `splineBend`;
    `pluck_overlay.ts` imports a type only. Nothing in `src/physics`,
    `src/game` or `main.ts` imports spline_generator, and neither does any
    physics test (the golden included).
  - A spline's `.samples` are read only in ribbon_renderer.ts and
    pluck_overlay.ts.
  - The census evaluates every variant on the same live state in each scan,
    so its physics is the base's by construction.
  - The sheet's control (flag off again, against the first off frame) is
    0 px on both viewports.
  So the golden cannot move with the flag on, and the physics guards would
  measure the same particles. What does see the moved samples: the ribbons,
  the crossing gaps, the junction webs and fans, the render-only plucks, and
  any hit-test that reads samples, all by at most maxShift (0.5 h).
- **The fold census, flag on, per holder: met.** Below the base at fresh
  rest and after the gestures and the drags, for every holder (tables
  above), with step 1's `web` class reported separately. A scan's single
  tightest window can be worse (24 of 585 scans; the soft clamp, 4).
- **The sheet:** `out_1b/sheet/sheet.png` (1485x7511; `sheet.html`,
  `sheet.json`, and the crops `desk_*` / `phone_*` with `_off`, `_on`,
  `_diff`). One settled default maze, def_1q2w3e, frozen, the flag flipped
  on the same page with the chosen options:
  - desktop 1400x900 at dpr 2: windows under 1.0 h 41 off -> 0 on; 21152
    device px changed; control 0 px;
  - phone 411x753 at dpr 2.625: 41 -> 0; 6841 px changed; control 0 px;
  - the bound moved 211 samples in 78 runs, skipped none, largest shift
    0.0556 world = 0.21 h (h = 0.26).
  - Rows: folds outside the webs (3), folds under a web (2), junction webs
    (2), crossings with their gaps (2), a self-crossing (1), kink eyes (2),
    twist eyes (2), each off | on | diff.
  - The page: sim 5.0 s, wall 26.2 s, settle lag ~15 s (K147's budget); the
    only console error is the favicon 404. The stamp reads 42d459e because
    the dev server started at that commit; it served the working tree, whose
    bound already had the three passes (they landed in 1daa934, before the
    sheet ran).
  - Read at crop scale, off and on look nearly the same: the visible changes
    are on the inner edges of the folds, plus faint speckle away from them
    that only a zero-threshold diff shows.
- **Ribbon rebuild cost, under the perf lock: +5-9%.** `k90_crops.mjs perf`:
  desktop viewport, frozen page, `update()` timed with the bound off and on,
  interleaved, 6 rounds of 20 (n = 120), median (p90):

  | design | off | on |
  |---|---|---|
  | def_1q2w3e | 11.7 (12.1) ms | 12.3 (13.0) ms |
  | fat_1471kin | 12.7 (13.2) ms | 13.4 (13.9) ms |
  | t64_2b5fq1 | 12.7 (13.2) ms | 13.8 (14.3) ms |

  `out_1b/perf/perf.json`. The phone is not measured.
- **K8: not running.** `src/geometry/bend_radius.ts` is unchanged; the bound
  calls its `overTightWindows` and `legTurnRadius`.
- **CPU mirror and parity tests: skipped** until Levi picks a look (K152).

## The calls (Levi was away)

1. **A bound on the resampled samples, not a new interpolant.** No
   interpolant through these particles reaches 1.0 h at the floor's limit
   (the analysis above), and dense96x4 shows the samples already
   under-resolve the overshoot.
2. **Where it runs:** after resampling and before the tangents, in both
   samplers, so the strip's normals follow the moved samples. Flow is
   applied before it and the bridge-tip tuck after it.
3. **`controlArcLengths` is not updated** for the moved samples: a small
   arc skew, accepted for a prototype.
4. **Skips:** whole-ring windows, and runs turning more than 200°. In
   practice none.
5. **The web's reach is 0.92 h**, from the crops (the gap in jw).
6. **Ratio 1.2,** because holding 1.05 h left w115 almost where it was.
7. **Junction centers** are the mean of the fused group's particles.
8. **The flag** is module-level and set only by the debug hook, never by a
   link or a codec param (K90's rule; codec tables are a Levi decision).
9. **The report** lists the web holder; 1a's rows read it as 0.
10. **The baseline** is this run's base, not 1a's (the maze sets moved).
11. **Three passes, a margin cap of 24:** 3-4x fewer windows than one pass
    in r2. The cap alone changed nothing.
12. **maxShift 0.5 h, not 1.0:** 1.0 gained nothing in the counts, did
    worse after the gestures (56/66 against 46/56) and set the worst min
    (0.049 h).
13. **The sheet counts any changed pixel** (threshold 0), so the count
    includes the faint speckle.
14. **The source defaults are r2's pick,** with `enabled` false.
15. **The soft clamp is an option, off by default** (`splineBend.soft`,
    census variant `soft:`). It fixes 20 of the 24 tighter-min scans, but
    adds 8-11 windows in the gesture states, makes one drag scan worse
    (the links 0.309 -> 0.212 h) and is not what the sheet shows. Levi's
    look comes first, so the defaults stay the ones the sheet shows.
16. **The min acceptance is read over every scan of every state**
    (`k90_minrows.mjs`), not only fresh rest: the fresh rows hid 22 of the
    24 scans.

## Recommendation

**Tune, then ship behind the flag once Levi has looked at the sheet.**

- The bound does what the census asks: 99.6% of the fresh windows and
  99.4% of the post-gesture windows are gone, for every holder, and it
  cannot touch the physics. Its cost is about 1 ms per ribbon rebuild on
  the desktop.
- Before it ships, finish the min regression. The soft clamp (census r3)
  removed it at rest and in all but two gesture scans, so the per-sample
  clamp was most of it. Left: two drag scans (star24_1471kin 0.355 ->
  0.112 h, the links 0.397 -> 0.212 h) and the soft clamp's 8-11 extra
  windows after the gestures. Next: let the census keep each variant's
  worst windows, dump those two sites per pass, test the run-edge
  candidate (the samples just outside a run's range), and re-run r3's
  variants with the fix beside them. Acceptance: no scan's min below its
  base in any state (`k90_minrows.mjs`), the counts no worse than the
  default's.
- Levi decides the look: whether the moved inner edges read better, and
  whether the bound becomes the default (flipping `enabled`, no codec
  change: the render does not enter a link).
- **Options 1 and 2 (material, the bend constraint) are not needed for the
  rendered folds:** the bound clears them without touching the particles.
  Reconsider them only if the tune cannot clear the t64 and links tails
  within maxShift, or if Levi wants the particle polyline itself rounder
  (for example, for hit-tests or plucks).

## Residuals

- The tightest-window regression: 24 of 585 scans with the default hard
  clamp (t64_1q2w3e 0.132 h, the links' gesture scans, star24_1471kin
  0.094 h after a drag); 4 with the soft clamp, whose remaining cause is
  not attributed.
- Tails the bound leaves: t64 fresh 5/7 and gRest 10/12, links gRest 31/39
  (16/21 outside the webs), star24 violent 3/3.
- `controlArcLengths` is not updated, so arcs measured from it are slightly
  off where samples moved.
- No unit tests for `boundBend` yet.
- No CPU mirror or parity tests (K152).
- Hit-tests and plucks see samples moved by up to maxShift.
- The phone's rebuild cost is unmeasured.
- The census stores no per-variant worst windows (needed to attribute the
  min regression).
- 1a's baseline moved with K74, K110 and K147 (inferred, not attributed).
- K8 reads the same fold definition; coordinate before either changes it.

## Reproduce

From the worktree root (`node_modules` is a junction to the main checkout):

- Census r2 (takes the perf lock itself; about 7 minutes at 10 jobs):
  `$env:K90_VARIANTS='on:1.2:0.5,on:1.2:0.5:24:1,on:1.2:0.5:24:3,on:1.2:1.0:24:3'`,
  `$env:K90_WEB_COVER='0.92'`, then
  `pwsh scripts/fold_census.ps1 -Jobs .claude/probes/K90/out_census/jobs.json -Out .claude/probes/K90/out_1b/census_r2.jsonl -Parallel 10`.
  Variants: `on:<ratio>:<maxShift>[:<marginMax>[:<passes>]]`, `soft:` with
  the same fields (the soft clamp), `sub<N>`, `dense<N>x<M>`.
- Census r3 (about 6 minutes):
  `$env:K90_VARIANTS='on:1.2:0.5:24:3,soft:1.2:0.5:24:3,soft:1.2:1.0:24:3'`,
  the same web cover and command, `-Out .claude/probes/K90/out_1b/census_r3.jsonl`.
- Tables: `node .claude/probes/K90/k90_analyze.mjs <census.jsonl>`
  (`out_1b/analyze_r2.txt`, `analyze_r3.txt`); against 1a:
  `k90_cmp1a.mjs`; tightest rows: `k90_minsite.mjs`; scans whose min fell
  below the base's, every state: `k90_minrows.mjs <census.jsonl> [n]`
  (`out_1b/minrows_r2.txt`, `minrows_r3.txt`).
- Crops, sheet and timing need a dev server with a private cache:
  `npx vite --config .claude/probes/K90/vite.private-cache.config.ts --port 5351 --strictPort --host 127.0.0.1`,
  then `node .claude/probes/K90/k90_crops.mjs cover|sheet|perf`
  (`K90_BEND_OPTS` = the options as JSON; the perf mode takes the perf lock).
- In a page: `__knotSplineBend(true)` turns the bound on with the defaults,
  `__knotSplineBend(true, {maxShift: 1})` retunes it (`{soft: true}` for
  the soft clamp), `__knotSplineBend()` reports.
