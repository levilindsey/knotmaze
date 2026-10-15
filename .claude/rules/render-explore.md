---
paths:
  - "src/render/explore_glsl.ts"
  - "src/game/explore_view.ts"
  - "test/render/paint_explore.test.ts"
  - "test/render/explore_gates.test.ts"
  - "test/render/explore_cut.test.ts"
  - "test/game/explore_view.test.ts"
---

# Render lore: the thread reveal (K76)

The exploration mode that shows only what the player has seen. Design:
`docs/design/K76_reveal_mode.md` (section 10: what the re-base onto
5438a60 changed, and Levi's open questions); stages and handoffs:
`docs/design/K76.md`. General render lore: `render.md`; the paint
declaration it rides: `render-paint.md`.

## THE THREAD REVEAL, stage 2a (2026-10-14)

- MODEL (`game/explore_view.ts`, pure, tested): from the walk graph, the
  visited vertices (each with its arms' growth 0 -> 1), the walked runs and
  the move in flight, `exploreView` returns VISIBILITY PIECES per chain
  (solid [c0, c1] in the walk graph's unwrapped ctrls, a fade length at each
  end, a frontier flag per end) and the FRONTIERS (where each fade starts
  and ends, for the looks drawn beside the thread). The rule is in its
  header: walked runs whole; `reach` lattice units out from every visited
  vertex, the last `fade` fading; an END within reach shows to its tip;
  meeting reaches make a run whole; joints are binary (a stub stays solid
  through its junction's web domain, `web`); fades at least FADE_MIN 0.35.
  `pieceVis` / `chainVis` are the CPU visibility.
- DATA: a piece is a VIS item in the KPAINT declaration (`visItem`: T0 =
  (5, c0, c1, f0), T1 = (f1, tips)), referenced from every control slot its
  `visRange` touches. VIS is NOT a PAINT_ITEM (glslConstBlock would emit a
  PI_ constant into the shared program text), kPaintAt skips it, and a VIS
  item sets no chain's paint flag (KGEOM G0.w): `writePaintItems` keeps a
  `painted` array of real paint only. THE WHOLE-CHAIN FLAG is KPAINT texel
  `chain` .x (below the first slot table, otherwise unused; KGEOM's G0 is
  full): `chainWhole` sets it when a chain's solid intervals cover it, and
  such a chain gets no VIS item at all (kExploreAt answers 1 without a
  scan). A chain with no piece is culled (`mesh.renderable = false`).
- SHADER: `withExplore(SECTION_FRAG)` inserts the declarations and the
  multiply at four exact-once anchors; the result is a SECOND program
  ("section-rgb-explore", the same resources, built lazily the first time
  the mode turns on, `bindGap` binds its uGapData too). The visibility
  multiplies the fragment's alpha, so the section color, paint, pulses,
  and the hover glow fade with the thread. uKExplore
  = (on, look, breath, threadWidth). THE SIX LOOKS (`EXPLORE_LOOKS`, the
  end of a frontier fade): fade, halo, glow, dots, fray, and beacon (dots
  plus the halo), the default. They are GPU-only, as K111 stage 2's highlight modes were; halo and beacon also
  place a sprite per frontier (fabric_maze_renderer's haloLayer, beneath the
  weave). Parity: `paint_math.ts kExploreAt` is the line-for-line CPU twin,
  `test/render/paint_explore.test.ts` holds it to explore_view's pieceVis
  and checks the four anchors and that master's program text is untouched.
- MODE OFF IS MASTER'S FRAME, by construction: no ribbon binds the second
  program, no VIS item exists, `setExploreFlags(null)` clears the flags,
  the halo layer is an empty container. Measured on the desktop
  (`.claude/probes/K76/stage2a/k76_probe.mjs ab`, same state, clocks pinned):
  master vs branch 0 px at four pulse phases and a hovered choice; on then
  off again 0 px. Turning it on with every chain whole (`visitAll`, reach
  1000) also draws master's frame exactly (the flag path).
- PROBE HOOK (stage 2a only; params, panel and codec are stage 2c):
  `__knotExplore({on, reach, fade, look (name or index), visitAll})`
  returns `fabric.exploreState()` (the switch, the last view, the seen
  vertices and walked runs). Its model is PROBE-ONLY: it reads the
  controller's visited sets, which record a tap when the move STARTS and
  survive a catch, so stage 2c feeds the model from move events instead
  (section 10). It forgets on a restart (`c.restarts`, K100's signal).
- NOT IN 2a: the crossing gaps, the junction webs and fans and the
  markers (stage 2b, below). Still open after 2b (stage 2c): hit-testing
  of hidden runs, the move-event model, params, panel and codec.
- GPU (`gpu_batch.ps1`, 3200x1800, RX 6800 XT, 3 interleaved rounds of
  286 frames under the perf lock; ms/frame mean [range], `gpu_summary.mjs`):
  MODE OFF COSTS NOTHING, master's ribbon program 1.978 [1.948-2.004] vs the
  branch's 1.970 [1.956-1.989], 92.7 draws each, frames 2.779 vs 2.785.
  MODE ON (5 pieces, 3 frontiers): the explore program 0.730 [0.721-0.735]
  in 3 draws (a chain with a piece draws its whole mesh; hidden fragments
  still run the shader), frame 1.566; the fans (0.56) draw in full until 2b
  (its numbers below).
  THE BOUND (every chain on the explore program, 390 pieces, 228
  frontiers): 1.962 [1.954-1.968], the same as master's program; the 228
  halo sprites add about 0.06 ms (the sprite batch, 0.064 vs 0.008); frame
  2.824.

## THE THREAD REVEAL, stage 2b (2026-10-14): the gates

Everything drawn around the thread follows its visibility. NO SHADER
CHANGED: each gate is data the existing programs already read (a gap
slot's strength, which records rebuildFillets emits, whether a marker
draws), so the gap, strip and fan programs run master's text in both
modes and the mode off is master's frame by construction.

- GAP GATE (`ribbon_renderer.applyExploreGaps`, `GapMaskTable.setVis`): a
  crossing slot's strength is its solved strength times the over thread's
  visibility at the over pass (`slotOverCtrl`, the render ctrl
  computeGapSlot placed it at). A factor <= 0 rejects the slot in texel 0
  (radii -1), for the ribbons and the fans alike; a gated negative
  strength (the intro reveal's ramp) passes through. So a hidden over
  thread cuts nothing, a fading one a fading gap, and a visible crossing
  keeps its gap exactly. The table keeps each slot's SOLVED strength and
  two reject radii (`noteSolved`, at the end of writeSlot and clearSlot,
  which also reset the factor to 1), so a factor re-applies without a
  re-solve and the mode off restores every slot. computeGapSlot also drops a hidden
  crossing's CPU side (vis <= 0.5 at the over pass: no under window for
  the yarn and the fillets' armReach, no pluck footprint), as for a
  reveal gate not yet open; `slotExploreHid` remembers it, and
  applyExploreGaps sets `exploreUpdatePending` when a slot crosses 0.5,
  so the next update() re-solves.
- MARKERS: the exit marker draws only once its thread point is solid
  (`exploreVisAt` >= EXPLORE_MARKER_VIS 0.98; `fabric_maze_renderer`
  drawMarkers), and a marker disc's gap slot is on or off by the same
  test, so neither shows on hidden thread.
- JOINT GATE (`syncExploreJoints`, recomputed when `exploreRev` moves): a
  junction's web and fans draw only when EVERY arm is solid (vis >=
  EXPLORE_JOINT_VIS 0.98) at its slot and EXPLORE_JOINT_OUT (0.25 ctrl, at
  most 0.45 of the run) out. The model holds a visited junction's arms
  solid through its web domain and fades a stub INTO an unvisited
  junction (vis 0 at its slot), so the rule hides exactly the unvisited
  junctions. Not the design's 0.8 ctrl: at thin threads the web domain is
  shorter. A free tip's cap draws when its thread is solid at the tip
  (the host-axis fallback disc checks both threads). A hidden joint emits
  no fan, wedge or fused-tip record. The gates are binary: a cap or web
  pops in at 0.98 rather than fading (strip alpha was deferred).
- WHEN IT REBUILDS: rebuildFillets appends the hidden set
  (`exploreJointsKey`) to its cache key, so the fans rebuild when the SET
  changes (an arrival, a fade crossing 0.98), not on growth frames.
  setExplore applies the gap gate and uploads the slot table at once (the
  declaration and the gaps change in the same frame), update() re-applies
  it after each solve, and needsFxRender stays true while
  `exploreUpdatePending`, so a declaration change gets its update() while
  the knot sleeps.
- TESTS: `test/render/explore_gates.test.ts` (setVis on a solved slot;
  the joint census on seeds 5, 42 and 777 at arrival, the entrance, two
  moves and ten: a junction is hidden exactly when its walk vertex is
  unvisited, CPU only).
- MEASURED (desktop, `.claude/probes/K76/stage2b/`): mode off against
  master 6588ec0 is 0 px at four pulse phases, a hovered choice and on
  then off again (`k76_probe.mjs ab`); `visitAll` at reach 1000 matches
  the mode-off frame at 0 px. THE CENSUS (`census.mjs <base> <out>
  <moves>`: each crossing's cut = the frame minus the frame with its slot
  rejected, in a clip; each joint's pixels = the frame minus the frame
  without the fan meshes), two moves in: 405 hidden over threads cut
  nothing (643 px of cut kept off visible under threads), the 2 crossings
  visible on both threads keep their gaps exactly, 181 of 181 junctions
  hidden exactly when unvisited, the 179 hidden paint no fan pixel and the
  2 shown paint mode-off's exactly. Ten moves in: the same numbers (the
  walk bounced over the same three vertices; the away filter reads
  `far` now), but mode off again differed from the first frame in 967414
  of 1260000 px once, with npm test running beside it; the check alone
  (`offagain.mjs`) passed at 0 px, and a clean rerun passed 17 of 17.
  The changed share is about the dark backdrop's (72-73% of the frame),
  so the probe lesson's backdrop below is the leading candidate, not
  caught; the census now saves both frames.
  GPU (`gpu_batch.ps1` as in 2a, 3200x1800): mode off costs nothing
  (master's ribbon program 1.975 vs 1.960, fans 0.552 vs 0.548, frame
  2.769 vs 2.762). Mode on, two moves in: the fans 0.56 -> 0.088 (the
  joint gate), frame 1.566 -> 1.154. The bound (`visitAll`) is 1.766
  against master's 1.975 in the same batch, while 2a's measured them
  equal. A same-batch check (`gpu_bound.ps1`, two interleaved rounds) put
  master at 1.946 and 1.979, 2a at 1.965 and 1.964, and 2b at 1.757 and
  1.761. So the drop is 2b's own, not K111 stage 3 and not the session.
  Inferred, not counted: the gap gate rejects hidden over passes' slots in
  texel 0, which skips their work. The same check put 2b's fans at 0.58
  against 0.55 (not investigated).
- PROBE LESSON (2026-10-14): never run two GPU probes at once. Observed:
  with another agent's GPU batch running, two contact sheets of the 2b
  build lost the vellum backdrop in 10 of 12 frames (black behind a
  normal knot); alone, the same build passed 12/12, and an 81 s watch
  never lost it. Inferred, not caught in the act: a WebGL context loss
  under the load. Pixi restores buffers and textures from their CPU
  copies, but a RenderTexture comes back empty, and a probe that pins
  the background (`L.tick = () => false`) never renders it again. The
  stage 2b probes record `webglcontextlost` (`window.__ctxLost`) and fail
  on it.

## THE SHAPED CUT, K268 stage 1 (2026-10-14)

A crossing whose over thread FADES inside the gap's footprint cuts by
the fade's coverage at each point of the cut, not by 2b's one scalar per
slot. Design and calls: `docs/design/K268.md` ("Stage 1 design", "Stage
1 handoff").

- PROFILE (`gap_mask.ts`): three texels end every slot row (GAP_PROF_BASE
  111, GAP_TEX_W 114; master's GLSL never reads them). P0 and P1, one per
  ramp, `[aS, F, dK, tK]`: the arc where the solid part ends (in the slot
  polyline's frame, through `exploreArcMap`'s unwrapped arc), the fade's
  SIGNED arc length (its sign says which side is hidden; a hard end is
  +-1e-6), and one interior knot of the ctrl-linear fade in arc ((1, 1)
  for none; a fade over more than one knot keeps the middle one and
  counts as approx). P2: `[solved strength, flags, 0, 0]`, flags
  GAP_PROF_R0 1, R1 2 (ramp present), F0 4, F1 8 (a frontier: the end
  look applies), MAX 16 (two pieces: best-of; else MIN). `setShape(slot,
  shape | null)` writes it and the GATE BIT, texel 3.w's bit 4
  (GAP_FLAG_SHAPED; 1 perp and 2 self are master's), not 8.w: 3.w is
  fetched before the search in every program. null clears both and
  hands the slot back to setVis; noteSolved (a re-solve) clears them.
- THE CUT (the explore program only): two more exact-once anchors in
  gapKeepAt, placed by `withExplore`. EXPLORE_GAP_SURE: a full ribbon
  slot (not a fan) with the bit, mode on, sets `sure2 = 0`, so the search
  finds the TRUE nearest segment (no early stop inside the silhouette,
  which misplaces the projection by up to the half-width). EXPLORE_GAP_CUT,
  after `if (bk < 0) continue;`: `A = polyStart + min(bk + bt, kLast) *
  polyStep` (texel 4, self-exclusion's formula) and `gst =
  gapStrength(P2.x) * exploreCutCover(row, A, pxW)`; 0 skips the slot.
  The look is ONE function, `kExploreLook(look, v, u, s, lat, sideFw,
  pxW)`, called by the thread's main and by the cut at lat 0 (dots and
  beacon cut a casing per dot; fray cuts by its center fiber, so its cut
  flickers along the fiber). The glow look's tint stays in main. CPU
  twins: `paint_math.ts` kExploreLookCpu, exploreCutCoverCpu.
- THE CLASSIFIER (`classifyExploreCut`; `applyExploreGaps` runs it on
  every declaration change and after every solve, live crossing slots
  only, mode on): the footprint is the polyline's arc range. A whole
  chain is solid, a chain with no piece hidden; per piece, its ring copy
  nearest the over pass; a piece whose solid part covers the range makes
  the slot solid; an end inside the range matters (an open chain's
  terminal never does). No end: hidden. One or two: shaped. More: 2b's
  scalar (fallback). Hidden, solid and fallback slots take 2b's setVis
  path EXACTLY. A shaped slot keeps its solved reject radii (never
  rejected), and its texel 1.w carries 2b's scalar, so the fans and the
  still pluck see 2b's gate unchanged (stage 2 shapes them).
  underWindows and `slotExploreHid` stay binary (0.5), as in 2b.
- ROW-PARTIAL UPLOAD: the gap texture is a row-dirty source with its own
  uploader, `knot-gap-rows` (registered at module load, as float_rows'),
  so every write marks its row and `upload()` sends each dirty run with
  texSubImage2D, or nothing while clean. `GAP_UPLOAD_STATS` counts bytes
  and calls. The probe hook's `gaps` reports them with the slot kinds:
  hidden, solid, shaped, fallback, approx, mismatch (classifier vs
  table), uploadBytes, uploadCalls, shapedSlots.
- TESTS: `test/render/explore_cut.test.ts` (the encoding, the hand-back
  to setVis, a re-solve clears, the classifier's cases, exploreCutCoverCpu
  against the model's chainVis through every fade, the end looks against
  kExploreLookCpu, the row-dirty uploader); `paint_explore.test.ts` pins
  the two anchors.
- MEASURED (2026-10-14, k111 two moves in; `.claude/probes/K268/`
  `run_k268.ps1`): mode off is master's frame exactly (0 px at four pulse
  phases, after on then off, hovered). Census (beacon): 412/412 slots; the
  405 hidden over threads cut nothing; both crossings seen on both threads
  keep mode-off's cut exactly; hidden 405, solid 5, shaped 2, fallback 0,
  approx 1, mismatch 0; joints 181/181; visitAll at reach 1000 is mode
  off's frame. THE PROOF (`census.mjs`: each shaped slot drawn as shaped
  S, with no cut R and with the full cut F; coverage (S-R)/(F-R) against
  exploreCutCoverCpu at the pixel's projection arc), 11 look x reach
  configurations: 1540 px, 0 ghosts, 0 under-cuts, error p95 <= 0.011,
  max 0.016 (halo). Only the one-ramp slot carried pixels: the two-piece
  (MAX) slot cut nothing, so MAX is unmeasured on the GPU. Upload, one
  move: 5.4 MB in 91 texSubImage2D calls (master: 34 whole-table uploads,
  30.9 MB); upload() ran 85 times, since setShape reports every move of a
  profile. GPU by program (ms/frame, 3200x1800, 2 rounds): mode off,
  ribbon 1.971 against master's 1.965, total 2.772 both; mode on, the
  explore program 0.724 (master 0.732; 2b's scalar on every slot 0.715;
  2 shaped slots); visitAll (about 162 shaped, 57 fallback), the explore
  program 1.830 against 1.773 with 2b's scalar everywhere and master's
  1.760, total 2.712 against master's 2.632 (+3%).
