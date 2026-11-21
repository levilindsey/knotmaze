# K1500 (26K, Muse batch 26 Run K): rp=gf's crossing fade at the start and exit markers

Levi's report (`.claude/probes/K1495/out/sheet_dives.png`, K1495's handoff): at the start and
exit marker discs, today's renderer fades the thread away from the disc over the Crossing fade's
length, while rp=gf keeps the crisp `fl` 0 cut at every value. This run ports today's marker gap
to gf's look and measures it. **Done is met: gf = today at both markers, at every `fl`, live and
by URL, in the fill look, and the border look's outline follows the same ramp.**

## The measure

One frozen physics state (link A `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant`, physics hash
`10104c64`, DSF 2, ppw 42.6, thread half-width 0.4 world), captured today and under rp=gf on
master's preview build (:5490) and on a local build of this change (:5492), the Crossing fade set
live to 0, 0.14, 0.5, 1.2 in each thread look, plus `&fl=` URL reloads. Both markers sit at their
chain's start (arc 0, open chains 28 start / 35 exit), so each thread leaves its disc one way.
Ramp = x(0.9) − x(0.1) of the thread's coverage along its centreline (fill: centreline luminance
between the frame's background and the thread far along the same run; border: the outline's
darkness on each outline), against device px from the dot's edge, med3-smoothed, from
`.claude/probes/K1500/prof.py`. Tiles (today | master gf | gf new, 4x):
`.claude/probes/K1500/out/26K/tiles3fix3_m0.png` (start), `tiles3fix3_m1.png` (exit);
tables `out/26K/prof_fix3.json`.

Fill look, ramp in device px (x of the 10% point in brackets):

| marker | fl | today | gf master | gf new |
|---|---|---|---|---|
| start ch28 | 0 | 5.1 @ −1.7 | 1.3 @ −1.7 | 5.1 @ −1.7 |
| start ch28 | 0.14 | 9.4 @ −1.7 | 1.3 @ −1.7 | 9.4 @ −1.7 |
| start ch28 | 0.5 | 30.1 @ −1.7 | 1.3 @ −1.7 | 30.1 @ −1.7 |
| start ch28 | 1.2 | 40.7 @ −1.7 | 1.3 @ −1.7 | 40.7 @ −1.7 |
| exit ch35 | 0 / 0.14 / 0.5 / 1.2 | 0.0 (no fade) | 0.0 | 0.0 |

- **Start**: gf master keeps the crisp cut at every `fl` (1.3 px). gf new equals today exactly —
  same ramp and same 10% point, at all four values. Grafically smooth at every value (tiles):
  no stairs, bands or bright slivers at fl 1.2.
- **Exit**: neither renderer fades the thread at any `fl`, before or after (see the fan clip
  below). gf new reads 0.0 like today.
- **URL**: `&fl=` gives the same ramps as the live value at 0, 0.14, 0.5 (measured); at 1.2 the
  URL frame's centreline luminances are identical to the live frame's (`gf_url12/url_f_fl1.2.png`
  vs `gf_fix3/f_fl1.2.png`: 49 → 62 → 99 → 162 → 195 going out from the disc edge).

Border look (K1492's lane: the casing takes `max(1 − cut, 1/255)` so the outline follows the fill's
cut): at the start, gf new's outline ramps at fl 1.2 read 41.6 / 42.4 px against the fill's 40.7 —
the same ramp. At fl 0.5 the ring gauge reads 8.1 / 7.7, but that gauge samples the disc's own rim
beside the dot; the 4x crop (`out/26K/border05_gf_fix3.png` against master's) shows the outline
pulling back soft from the disc like the fill. At the exit the border reads 0.0 like the fill.

## Away from the markers

gf new against gf master at fl 0, both looks: 0 px differ > 8 outside the marker boxes in the
same-session control (gf_fix, the pre-clip build, vs gf_fix3); against master's own session the
only differences away from the discs are 40 isolated single pixels with no changed neighbour
(ember/rim sparkle between capture sessions; the same 40 appear between two of my own builds).

## The cause, in code

- Today's marker gap (existing code, unchanged): `renderMarkerGaps` in
  [crossing_gaps.ts](/C:/Users/lsl/Repositories/knotmaze/src/render/ribbon/crossing_gaps.ts:1429)
  solves one gap slot per disc — an over pass whose polyline is the disc's centre point (n = 0),
  hiding the thread inside radius + margin and fading it back over `fadeLength` radially
  ([gap_mask.ts](/C:/Users/lsl/Repositories/knotmaze/src/render/gap_mask.ts:694) `gapKeepAt`, the
  n ≤ 1 branch), inside a window marched along the thread
  ([crossing_gaps.ts](/C:/Users/lsl/Repositories/knotmaze/src/render/ribbon/crossing_gaps.ts:1443)).
  The discs and radii come from
  [fabric_maze_renderer.ts](/C:/Users/lsl/Repositories/knotmaze/src/render/fabric_maze_renderer.ts:1112)
  `syncMarkerOccluders`.
- gf had no port of it: [gf_look.ts](/C:/Users/lsl/Repositories/knotmaze/src/render/gpu_field/gf_look.ts)
  `lkGap`/`GfGapTable` hold only `ps.crossings`; `renderer.markerOccluders` was never read by gf.
  The cut gf showed at the disc was the disc mesh over an unfaded thread — crisp at every `fl`
  (measured: 1.3 px at all four values).

## The exit's missing fade (today's suppressor)

Today's exit slot is solved and handed to the shader (window arc [0, 3.99] on chain 35, vis 1 —
`.claude/probes/K1500/slotdbg.mjs`, `rangedbg.mjs`), yet no fade shows, and forcing
`gapKeepAt`'s marker branch to cut everywhere changes 0 px at either disc
(`patch_markerforce.json`, `out/26K/today_forcemarker/`): the stub the exit thread leaves on is
covered by the nearby junction's fan — fan material takes the silhouette only, so the marker fade
never reaches the screen there (forcing every gap slot cuts pixels only from radial 60 px out,
the crossing region: `today_allforce`). Chain 35's junction sits at arc 3.04; chain 28's at 4.67,
with an under-cut at 3.72 stopping its fan's flank short. Today's flank rule is `armReach`
([joinery.ts](/C:/Users/lsl/Repositories/knotmaze/src/render/ribbon/joinery.ts:2133)): full reach
L = fillHalf · 1.25 · cuspRadius (3.0 here), capped by the arm's domain, stopped a fillHalf short
of the arm's nearest under-gap, never below 0.3 L. The port clips each marker's window at every
junction fan's near edge by that rule (`markerArmReach`): the exit's window collapses to 0.04,
the start's stands. An early iteration without the clip faded the exit stub (tile in
`out/26K/tiles3fix2_m1.png`, right panel at fl 1.2) — that iteration is not what shipped.

## The change (one commit, on top of starting master `f8d5c07d`)

- [gf_look.ts](/C:/Users/lsl/Repositories/knotmaze/src/render/gpu_field/gf_look.ts):
  `gfMarkerUniforms` bakes each disc (≤ 4, `GF_MARKER_SLOTS`) into two vec4 uniforms —
  A (centre x, centre y, radius, chain), B (centre arc, winNeg, winPos, total | 0 open) — with
  `markerWindow` (today's march to radius + margin + fade + both half-widths + pad) and the fan
  clip (`markerArmReach`); `markerCutAt` is the CPU twin of today's ramp (window × radial
  smoothstep over `fadeLength` × the window-end dissolve), and GLSL `lkMarker` applies it at the
  label's foot for piece labels (fan/corner labels keep the silhouette only, as in today), also
  at the unlabelled fringe's lowest covering piece. The border look follows through K1492's
  `lkCo.a` lane with no border-specific path.
- [gf_pass.ts](/C:/Users/lsl/Repositories/knotmaze/src/render/gpu_field/gf_pass.ts): `setLook`
  takes the uniforms as a trailing parameter (`Mk`) and the draw sets `uMkA[0]`/`uMkB[0]` in the
  look block; no new texture.
- [gf_app.ts](/C:/Users/lsl/Repositories/knotmaze/src/render/gpu_field/gf_app.ts): `mkSnap`
  computes the discs from the renderer's occluders (+ junction/under arcs for the clip) at
  install and on every gap/fade change, so a live slider move re-derives windows with the bake,
  asleep like the crossing gaps (the fade-change branch marks dirty).

## Maintained tests

- [gf_marker.test.ts](/C:/Users/lsl/Repositories/knotmaze/test/render/gf_marker.test.ts) (new):
  the ramp's shape against `gapKeepAt`'s marker branch (0 at the margin, 1 a fade past it,
  10–90% ≈ 0.61 · fade, `fl` 0 crisp within a device pixel), the window march, the baked
  uniforms, `markerArmReach` = joinery's armReach (both link-A arms), the fan clip (exit
  collapses, start stands), and pins of `lkMarker`'s shader text at the label and fringe sites.
- [gf_look.test.ts](/C:/Users/lsl/Repositories/knotmaze/test/render/gf_look.test.ts): one pin
  moved to the new label line (the marker clause).
- [paint_ring_lap.test.ts](/C:/Users/lsl/Repositories/knotmaze/test/render/paint_ring_lap.test.ts)
  (K299): one new floor-of-a-division in `lkMarker` (`floor(off / total + 0.5)`, the closed-chain
  nearest lap) added to the reviewed list — a lap off puts |off| near the antipode, outside every
  marker window, where the cut is 0 either way.

## Evidence trail

Probes: `.claude/probes/K1500/` — `shots.mjs` (K1495's methodology with marker geometry, PATCH
support from K1495 kept), `prof.py`, `profdbg.py`, `tiles.py`/`tiles3.py`, `slotdbg.mjs`,
`slotab.mjs`, `chaindbg.mjs`, `rangedbg.mjs`, `xdbg.mjs`, `jdbg.mjs`, `patch_markerforce.json`,
`patch_allforce.json`. Output: `out/26K/` (`gf_master`, `today_master`, `gf_fix*`, `gf_url12`,
tiles, `prof_*.json`). Baseline was taken before any `src/` edit; `markers`, `prof`, `tiles`
commands and inputs are in the probe files.

Drag (K1458's net, `.claude/probes/K1492/dragcheck_b.mjs`, the machine's stands): **DRAG CHECK:
PASS** on this build — every stop (0, 0.5, 1.2, and the asleep 0.14) reads 0 of 4,357,572 px
differing > 24 between the dragged page and a fresh load at that fade. Two earlier attempts
failed at the asleep stop's fresh-load hash race (fresh loads landing on the state's other
attractor, `49c20566`, under capture contention); on a quiet machine every stop passes, and the
dragged page's rest state (`f9d72040`) is the same one master reaches.

Final table after the rebase onto `33bb0a9d` (K1482 s9's `lkGap` vec2 merge — the marker cut now
folds into both components): `.claude/probes/K1500/out/26K/gf_fix4` reproduces the table above
exactly (`prof_fix4.json`: start 5.1 / 9.4 / 30.1 / 40.7, exit 0.0, border 41.6 / 42.4 at fl 1.2).

For the checker (app): `pwsh scripts/preview.ps1 -Port 5490` serves master; the change is the
working tree until committed. Open
`http://127.0.0.1:5490/?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&phw=0&snd=none&prp=off&rp=gf`
(gf) or the same without `&rp=gf` (today), set the Crossing fade slider, and compare the start
marker.
