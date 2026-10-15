---
paths:
  - "src/render/explore_glsl.ts"
  - "src/game/explore_view.ts"
  - "test/render/paint_explore.test.ts"
  - "test/render/explore_gates.test.ts"
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
  2 shown paint mode-off's exactly. CENSUS_M10_LORE
  GPU (`gpu_batch.ps1` as in 2a, 3200x1800): mode off costs nothing
  (master's ribbon program 1.975 vs 1.960, fans 0.552 vs 0.548, frame
  2.769 vs 2.762). Mode on, two moves in: the fans 0.56 -> 0.088 (the
  joint gate), frame 1.566 -> 1.154. The bound (`visitAll`) is 1.766
  against master's 1.975 in the same batch, while 2a's measured them
  equal (BOUND_CHECK_LORE).
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
