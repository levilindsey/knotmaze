---
paths:
  - "src/render/junction_routes.ts"
  - "src/render/junction_field.ts"
  - "test/render/junction_routes.test.ts"
---

# Render lore: route bands (K81)

Moved verbatim from `render.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `render.md` lists the area's other files.

## Route bands (K81)

- ROUTE BANDS (K81, 2026-10-13; worktree agent, stages 1-3b). Levi
  (2026-10-12, `.claude/probes/K81/levi_junction_nub.png`): the
  traversed highlight showed "a discontinuous flat nub" across a
  junction; Levi wanted "a smooth continuous arc from right to left".
  DIAGNOSIS: a web took its color from an angular blend of the
  bracketing arms' strips (the edge-aware field; K4's per-arm strips), so
  between a gold arm and an untraveled one the gold-to-section change ran
  as a straight line (the nub), and gold also filled wedges the route
  never crossed. FIX: each traversed joint gets a ROUTE BAND, one
  thread-width gold arc from the arrival arm to the departure arm,
  continuous with both arms' gold; outside every band the web shows the
  untraveled material.
- PURE PART (`junction_routes.ts`; its header holds the decisions): which
  arms each joint's route joins (`pathLegs` / `legRoutes` / `pickRoutes`)
  and the corner (`routeCorner`, `routeCubic`: a cubic between the two
  arms' band ends, tangent to both; d grows with the turn angle, capped
  so the turn's centerline passes within 0.9 fh of the joint center, 0.5
  fh inside the cover caps and 0.25 fh inside the wedge rim, by turnFits
  bisection; a straight route is the two centerlines joined).
- RECORD + SHADER (`junction_field.ts`). A routed record holds a ROUTE
  block per band at `routeBase`: R0 = nv, m, ia, ib, then nv <=
  MAX_ROUTE_VERTS vertices x, y, tau, 0 (arm A's centerline in from its
  band end, the corner, arm B's centerline out; tau = arc along the band,
  the corner from -d to +d). A record keeps the newest MAX_ROUTES = 4
  distinct arm pairs. Every arm of a routed record writes its composed
  strip row (stripRow) AND an untraveled one (stripRow + 1). The fan
  shader: `routed = nRoutes > 0 && hd.z > 0.5`; outside every band it
  shows the arms' UNTRAVELED paint (pulses, hover and glow stay, no
  gold); inside a band, the band's arms' COMPOSED paint, A -> B blended
  over tau in [-m, m], with a one-pixel ramp at thread half-width. It
  reads the composed rows, so the band follows K93's and trail mode's
  fades with no clock of its own. COVER STRIPS (ribbon_renderer.ts): one
  per routed arm, out to min(want, coverCap), redraw the arm's ribbon
  beside the web with the same field, so the band continues past the web
  edge. A strip fragment is `fract(vRec) > 0.125`: pushStrip
  (ribbon_mesh.ts) tags strip records `rec + STRIP_REC_TAG` (0.25), so
  NOTHING ELSE may push a fractional record into the fillet mesh. Caps
  are dropped at routed junctions. The CPU mirror is `cpuJunctionField(
  rec, x, y, out, px, strip)` (reached by `fieldProbe.at`; `fieldProbe.
  routes(ji)` lists a record's bands): a GLSL change is mirrored in the
  same commit.
- WIRING. `setPaint`'s 4th argument is `routes`; fabric_maze_renderer
  feeds it: fullPath = the whole path, trail = the joints the trail still
  reaches, string = none, a move in flight folded in. The fillet rebuild
  is keyed by the routes' JSON (routeKey): a probe that edits routes goes
  through setPaint or calls `rebuildFillets(true)`. Paint debug views 3
  and 4 bypass the band (they show the base field).
- K794 (2026-10-21): walked gold stays gold. The gold, its route bands
  and its caps derive from the controller's `taps` via the pure
  `src/render/walked_gold.ts` (first-walk-order spans, walk legs,
  walked/visited sets), not the path stack: a backtrack or re-walk
  leaves a run full, a first-time advance sweeps as before, and the
  gold clears on a restart or a refogging catch (the renderer's gold
  epoch), agreeing with the fog's explored runs. The win shows the
  walk. Tests: `test/render/walked_gold.test.ts`; probe:
  `.claude/probes/K794/erasures.mjs`.
- DECISIONS. (1) Backtracks: the band follows the path STACK like the
  gold; a popped pass's band goes. A joint truly passed twice holds two
  bands, newest drawn last. (2) The head: a one-arm band (arrival arm to
  the joint center, round end) under the K83 marker; start, exit and dead
  ends are free tips, keep their caps and get no band. (3) A move in
  flight: both ends carry a band (the gold slides along it). (4) A routed
  web shows untraveled material outside the bands. OPEN FOR LEVI: at a
  joint passed twice whose arms are ALL gold, small purple slivers of
  untraveled material show between its two bands where the web used to be
  all gold (`.claude/probes/K81/results/ab/zoom.png`, sheet row 2); the
  amendment is to fill outside the bands with the composed rows when
  every arm of the web is traveled. (5) Caps dropped. (6) Composed rows,
  no clock of its own. (7) The corner geometry above. (8) Width: thread
  width in webs, cover strips pad 0.5 px.
- MEASURED. SMOKE: no shader compile or link error; the console's 404s
  are favicon.ico, and the three "Attribute aUV is not present in the
  shader" warnings are K83's (marker_mesh.ts declares `in vec2 aUV;` and
  never reads it; 4deeda1 logs them too). CENSUS (GPU vs the mirror,
  `census_k81.mjs`; fans on a 5 px grid, cover strips on a 2 px grid):
  0 points over 2/255 in gold (5 moves), trail (`pv=trail&trl=5`, 8
  moves), passed twice and in flight; max 0.0056-0.0065 (routed fans /
  unrouted fans / strips; K75's fan baseline 0.0062). SAME-STATE A/B vs
  4deeda1 (`k81_ab.mjs`, every clock pinned, A/A 0 px): 2004-4222 changed
  px per scenario (max delta 137-138/255, trail 50), 0 beyond a routed
  joint's footprint + 2 px, untraveled joints 0 px. GPU (3200x1800, the
  5-move state with 5 routed records, 8 interleaved runs per side under
  the perf lock, machine quiet: CPU ~5%, 3D GPU ~1% before each run;
  master d9a7d47 vs the rebased branch, `gpu_k81.ps1` + `gpu_sum.mjs`):
  FAN 0.577 +-0.010 -> 0.778 +-0.019 ms (+0.20, ranges do not overlap),
  strip pass 0.070 -> 0.071, ribbons 1.707 -> 1.641 (noise), total 2.66
  -> 2.79 ms, same draw counts. The fan growth is the 5 routed webs plus
  their cover strips; how it scales with more routed joints on screen,
  and the phone's cost (K10; the Pixel has no GPU timer), are not
  measured.
- RESIDUALS. The pluck overlay draws over the band. A band crossing a
  non-route arm beyond that arm's cover cap leaves a ribbon patch, and a
  non-route gold arm shows untraveled material in its strip. Strip
  quantization differs by 1-2/255; the ramp shifts about 1 px where the
  band leaves the strips; a tiny far-side sliver lies beyond the 0.92 fh
  disc. The band is fh wide while the ribbon's width varies (reveal,
  swell). A self-loop's direction is taken as A -> B; passes beyond
  MAX_ROUTES lose their band; gated joints, arms shorter than 0.15 and
  arms beyond MAX_ARMS drop their caps with no band. At a tap the old
  head's route switches from one arm to two (setPaint runs a frame ahead
  of tickPaint in main.ts). Band clipping at non-adjacent routes, at
  skipped wedges (gap > 2.6) and in small webs; turnFits uses the arms'
  straight rays. In flight, the far end's band reads its arrival arm
  before that arm is painted (a faint change beside the marker). G4's SDF
  webs (K9) should carry the route as the smooth union of the traveled
  pieces only.
- PROBES (`.claude/probes/K81/`, untracked): k81lib.mjs (`open`,
  `move(page, cheapest | back | nth(k))`, `joints(page)` with each
  record's bands; a joint passed twice = walk `nth(k)` and watch for n >=
  2), smoke.mjs, census_k81.mjs, k81_ab.mjs (gold5 | back | twice |
  flight | trail), mk_k81_sheet.mjs, sheet.png, gpu_k81.ps1 +
  gpu_sum.mjs (GPU A/B). Before/after builds: detach to the base commit,
  `vite build --config .claude\probes\K81\vite.private-cache.config.ts
  --outDir ...`, switch back, `vite preview` on 5312/5313.
