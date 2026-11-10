# K8: what rp=sdf's gaps cost the phone

Ledger: K8 (G3, SDF ribbons). One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

`?rp=sdf` now draws its crossing gaps (`docs/design/K8_sdf_gaps.md`, handoff 1), and the cost stage
(`docs/design/K8_sdf_cost.md`, handoff 1) cut the desktop's overdraw: knot gs 24 at 1.73x the default
path, dense 1.09x, max fabric 0.90x. The phone is much worse.

Round 2026-11-10c (`docs/design/K156.md`, its handoff) timed each K8 commit on the Pixel, rp=sdf on
both sides. Render-sync medians in ms (dense / max fabric / knot gs 24):

| commit | dense | max fabric | knot gs 24 |
|---|---|---|---|
| default path, no rp=sdf (round 2026-11-10b) | 110 | 284 | 32 |
| a145be26 (before the gaps) | 121.3 | 302.5 | 50.1 |
| c67a75ff (the turn: the gap windows start to match) | 388.0 | 511.8 | 118.5 |
| 42900cac (the vertex window scan) | 392.4 | 523.8 | 223.0 |
| d70fdf0d (one quad per pixel) = master | 278.5 | 422.1 | 163.3 |

So the phone pays mostly for the gap work that c67a75ff switched on: once fragments fall inside
gap windows, the casing cut runs. 42900cac adds +104 ms on knot gs 24 only, and +4 / +12 ms on the
other two links. That is unexplained. G3-3 (the SDF default flip) waits on this.

The links (`scripts/phone_pass/k539_g31.mjs`), each with `&rp=sdf` and without:
- dense: `?b&gs=24&wd=0.6&brd=0.6`
- max fabric: `?b&gs=24&wd=1&brd=1&ded=1&del=40&jsp=.5`
- knot gs 24: `?b&gs=24&wd=1&mf=0`

## Goal

rp=sdf no slower than the default path on the phone's three links, with the same gaps. The technique
is yours. The desktop can't show the phone's cost directly, so measure the work itself (per-fragment
and per-vertex counts, timer queries where they exist), and make the commits the phone round will
A/B.

## Done

1. **Where the work goes.** For each link: a per-fragment count of the gap search's iterations
   (a heatmap, and its mean and max over drawn pixels), and the per-vertex length of 42900cac's
   window walk. Say why knot gs 24 alone pays for 42900cac.
2. **Candidates.** Each fix is its own commit on your branch. For each one:
   - the gaps stay the same: a same-state pair against master on knot gs 24 and dense (as in
     `K8_sdf_gaps.md` handoff 1) shows only sub-pixel casing edges, and 4x crops of the three links;
   - the counts from step 1, before and after;
   - `scripts/bench_frame.mjs` on the desktop, before and after.
3. **The phone list.** The commits the next K156 round should A/B, with what each one should show.
   The coordinator runs that round. Don't use the phone yourself.
4. **No regressions:** gl.getError 0 and no context loss on the three links, with and without rp=sdf;
   the default path does not move (`test/physics/byte_identity.test.ts` and the paint pins green with
   no re-freeze); `npm test` and `npm run build` green.

## Rules

The Rules of `docs/design/K8_sdf_cost.md`, plus:
- **Other agents.** K268's agent works in `.claude/probes/K268/` and may touch
  `src/render/explore_glsl.ts`. K1247's agent works in `.claude/probes/K1240/proto/`. Don't touch either.
- **Perf lock.** K268's census takes the same lock. Wait for it inside one blocking command.

## Report

Short and plain: where the work goes (the counts, and why 42900cac hits only knot gs 24); each
candidate (what it changes, its counts and bench_frame before and after, its crops and same-state
pair); the phone list; the checks; what's left; your last SHA. End with `Ledger items` and K8's
handle fields.

## Handoff 1 (2026-11-10, K8 phone agent, claude session 09c7a672)

Items 1, 2 and 4 hold on the desktop; item 3 is the list below. The phone was not used. Tools and
outputs are in `.claude/probes/K8/sdf_phone/` (outputs in `out/`, untracked).

### Where the work goes (item 1)

`count.mjs <base> <outDir> <tag> <query>` rewrites GAP_FRAG_LIB in the page and counts per drawn
fragment: segments tested, gap searches, full searches, chunks, slots, windows. It also writes
heatmaps (`out/<dir>/<tag>_<pass>_heat.png`), and in mode 3 it waives the SDF's three discards ahead of
the search to count every rasterized fragment. It replays 42900cac's window walk on the CPU too.
**Always pass the pin `am=instant&snd=none&fw=0&phw=0`.** Without it the page runs the intro on
the worker host and never rests. The 04:4x runs (`out/m601`, `out/b82`) had no pin and are void:
their strip read 0 drawn px. 7e1c1beb's message blames count.mjs's first mode-3 cut for that; the
missing pin was the cause.

Master 601f5d99, pinned (`out/m601p`), per drawn fragment:

| link | pass | drawn px | frags | seg | searches | full | chunks | slots | raster frags (per drawn px) |
|---|---|---|---|---|---|---|---|---|---|
| knot gs 24 | strip | 403,524 | 495,781 | 7.86 | 0.64 | 1.31 | 1.02 | 0.73 | 495,781 (1.23) |
| knot gs 24 | sdf | 436,287 | 551,186 | 7.83 | 0.65 | 1.29 | 1.02 | 0.73 | 1,999,227 (4.58) |
| dense | strip | 353,906 | 415,259 | 8.31 | 0.45 | 1.47 | 1.05 | 0.48 | 415,259 (1.17) |
| dense | sdf | 385,490 | 548,634 | 7.00 | 0.38 | 1.24 | 0.88 | 0.41 | 2,547,494 (6.61) |
| max fabric* | strip | 432,049 | 512,054 | 4.91 | 0.28 | 0.64 | 0.63 | 0.30 | 512,054 (1.19) |
| max fabric* | sdf | 467,542 | 996,156 | 3.10 | 0.18 | 0.39 | 0.40 | 0.19 | 4,043,666 (8.65) |

\*max fabric never rested inside the 90 s cap (restMs -1), so its two runs are not one state; read
its rows as indicative. On max fabric the SDF pass shades 1.95 times the strip's fragments (2.13
per drawn px against 1.19): its quads overlap at the joins of a dense weave of short segments.
That shaded overdraw, not the search, is the SDF's open cost on max fabric, and none of A, B or C
touches it.

The gap search does the same work per fragment on both passes. What differs is the raster:
the strip has no discard ahead of the search, so it rasterizes only what it shades. The SDF quad
rasterizes 3.6 (knot gs 24) to 4.6 (dense) fragments for every one it shades, and its ownership,
edge and coverage discards drop the rest. On dense it also shades 32% more fragments than the strip
(overlapping quads at segment joins), with fewer segments and searches each, so its total search
work is close to the strip's. Heatmaps: `out/m601p/<link>_<pass>_heat.png`.

**Why only knot gs 24 pays for 42900cac.** Before it, the SDF vertex shader scanned a chain's first
16 windows. knot gs 24 is 24 closed chains, and every one has 47 windows. The old scan found 0.248 gap
ids per segment against the strip's 0.728: it dropped 17,065 ids, on 48% of the segments, so the SDF
pass missed about two thirds of the gap ids it owed. 42900cac's walk (a binary search of 5.67
steps, then a walk of 0.73 windows mean, 1 at most) finds 0.728, the strip's figure. Its step on the
phone (118.5 to 223 ms on knot gs 24) is the restored searches, not the walk itself.

dense has 178 chains, only 5 of them over 16 windows: the old scan lost 445 ids (0.454 against
0.462 per segment), so 42900cac barely changes its work (a binary search of 2.84 steps, walk 0.46
mean, 2 at most).
max fabric has 666 chains, 12 over 16 windows: 1,207 ids lost (0.243 against 0.258), a search of
1.77 steps and a walk of 0.26 mean. The phone's 42900cac step on dense (+4.4 ms) and max fabric
(+12 ms) fits that; knot gs 24's +105 ms is the restored third of its searches.

### Candidates (item 2)

Each candidate is rp=sdf only. The default path does not change.

- **A, 10615983: the fragment's derivatives before any discard (H2).** `kFragPoint(kc)` (dFdx/dFdy)
  moves up beside `fwS`, ahead of every discard. A derivative after a discard can keep the discarded
  lanes alive as helpers on some GPUs. Same-state vs master (`out/ss_A`): knot gs 24 0 px, dense
  0 px. GL clean.
- **B, 449a9ccf: the gap search before the paint (H3).** The gTurn/gapKeepAt call and its discard
  move ahead of `vec3 base = vSection;`, so a hidden fragment never runs the paint, and the paint's
  registers are not live across the search. 449a9ccf breaks the explore programs' link: their
  section code reads paint state. **df02cc23 fixes it**: `sdfGapLate()` keeps the late order for
  the explore and explore-root variants, and `test/render/sdf_explore.test.ts` pins both orders.
  **5a0550a9 is A+B alone** (C reverted) for the phone. Same-state (`out/ss_B`): 0 px on both
  links; crops (`out/crops_B`) are identical to master's.
- **C, 7e1c1beb: the trapezoid's end margin from max(uSdfPad, 2 px) to 1 CSS px (H1).** In the
  vertex shader, `trapPad = pxWorld`. The end margin is raster waste: on master, mode 3 rasterizes
  4.58 SDF fragments per drawn pixel on knot gs 24. **97834df3 is A+B+C** with the explore fix
  (the same text as df02cc23).
  Same-state vs master, rp=sdf (`out/ss_C`):
  - knot gs 24: 26,979 px differ, 26,704 of them by 1-4 levels (rounding); 73 isolated pixels
    by 25-46 levels; no cluster thicker than 1 px.
  - dense: 25,477 px differ (25,228 by 1-4); 86 isolated pixels by 25-46; no clusters.
  - Every visible difference is a single pixel on a casing edge, going both ways: a one-sample
    coverage change at the trapezoid's end. `diffspots.mjs` lists them. An 8x crop of the worst
    spot (`out/crops_C/spot_1086_447.png`) cannot be told from master's.
  - The 4x crops (`out/crops_C`: knot gs 24 centre and border, dense centre, max fabric weave and
    crumple) match master's.
  - The fix's own default-vs-sdf pairs match B's numbers (knot gs 24 90,827 px, dense 104,986 px,
    no thick clusters): the SDF pass's known sub-pixel casing edges, unchanged.
  - It is not bit-identical; the gaps are the same.

Counts before (601f5d99) and after (df02cc23 = A+B+C), pinned:
| link | SDF shaded frags | SDF rasterized frags (per drawn px) | per-fragment search work |
|---|---|---|---|
| knot gs 24 | 551,186 -> 551,231 | 1,999,227 (4.58) -> **1,276,045 (2.93)**, -36% | unchanged (7.83 seg, 0.65 searches) |
| dense | 548,634 -> 548,672 | 2,547,494 (6.61) -> **1,569,042 (4.07)**, -38% | unchanged (7.00 seg, 0.38 searches) |
| max fabric* | 996,156 -> 996,201 | 4,043,666 (8.65) -> **2,667,899 (5.71)**, -34% | unchanged (3.10 seg, 0.18 searches) |

A and B change no count (they reorder work inside a fragment); C cuts the rasterized fragments by a
third and shades the same ones. The strip rows are identical before and after.

`scripts/bench_frame.mjs`, desktop (1600x900 at dsf 2, ANGLE d3d11), gl.finish() frame P50 in ms,
2 rounds ABBA, 4 s per link, pin `am=instant&snd=none` (`out/bench_ABC`, no lost context, no GL
error):

| link | default (601f5d99) | sdf 601f5d99 | A 10615983 | A+B 5a0550a9 | A+B+C df02cc23 |
|---|---|---|---|---|---|
| knot gs 24 | 6.55 | 10.85 | 10.85 | 10.65 | **8.90** |
| dense | 18.15 | 19.75 | 19.65 | 19.45 | **18.55** |
| max fabric | 39.2 | 34.4 | 34.5 | 34.6 | 35.15 |

On the desktop only C moves: -1.95 ms (-18%) on knot gs 24 and -1.2 ms on dense. The max fabric
row is noise: its frame interval swung 150-178 ms between rows. A and B are flat here, which is
expected: a desktop GPU under D3D11 does not show PowerVR's helper-lane or register costs.

### The phone list (item 3)

The next K156 round A/Bs rp=sdf on the three links, against the default path at 601f5d99:

1. **601f5d99**, default and rp=sdf: the baseline (the last round read 278.5 / 422.1 / 163.3 ms
   for sdf on dense / max fabric / knot gs 24).
2. **10615983 (A)**: if H2 holds, rp=sdf drops on all three links, most where the SDF discards the
   most (knot gs 24). If it does not move, PowerVR doesn't keep helper lanes for it.
3. **5a0550a9 (A+B)**: the step from A shows what the paint costs on hidden fragments and in
   registers. A drop is largest on the dense links.
4. **97834df3 (A+B+C)**: the step from A+B shows the raster waste. It should be the largest step on
   knot gs 24, as on the desktop.

Don't use 449a9ccf or 7e1c1beb: they break the explore programs' link.

### Checks (item 4)

- gl.getError 0, and no context loss, on the three links with and without rp=sdf, for every
  candidate (`out/ss_A`, `ss_B`, `ss_C` meta; bench_ABC).
- `npm test` (220 files, 2895 tests) and `npm run build` green on 97834df3. Byte_identity and the
  paint pins pass and the tree stays clean: nothing was re-frozen.

### What's left

- The phone round above. The desktop cannot show A's or B's PowerVR costs, so they are unproven.
- C's margin is 1 CSS px, about 2.6 device px on the phone (dpr 2.625). A margin in device pixels
  is a further cut if C pays on the phone.
- The raster count is desktop-only: the phone's rasterized fragments per drawn pixel are not
  measured.
- C is not bit-identical to master (rounding, plus isolated one-sample pixels on casing edges).
- The SDF pass shades 1.3 to 1.95 times the strip's fragments (dense, max fabric): overlapping
  quads at segment joins. That overdraw is the next lead for dense and max fabric, where the phone
  gap to the default path is largest; no candidate here touches it.
- max fabric's counts are not same-state (it never rested in 90 s).
