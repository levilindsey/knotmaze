---
paths:
  - "src/render/explore_glsl.ts"
  - "src/game/explore_view.ts"
  - "test/render/paint_explore.test.ts"
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
  the hover glow and every highlight mode fade with the thread. uKExplore
  = (on, look, breath, threadWidth). THE SIX LOOKS (`EXPLORE_LOOKS`, the
  end of a frontier fade): fade, halo, glow, dots, fray, and beacon (dots
  plus the halo), the default. They are GPU-only like K111's modes; halo and beacon also
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
- NOT IN 2a (stage 2b): the junction fans and webs (unvisited webs still
  show), the crossing gaps (a hidden over thread still cuts a gap in a
  visible under thread), the markers (the exit marker is not gated) and
  hit-testing of hidden runs.
- GPU (`gpu_batch.ps1`, 3200x1800, RX 6800 XT, 3 interleaved rounds of
  286 frames under the perf lock; ms/frame mean [range], `gpu_summary.mjs`):
  MODE OFF COSTS NOTHING, master's ribbon program 1.978 [1.948-2.004] vs the
  branch's 1.970 [1.956-1.989], 92.7 draws each, frames 2.779 vs 2.785.
  MODE ON (5 pieces, 3 frontiers): the explore program 0.730 [0.721-0.735]
  in 3 draws (a chain with a piece draws its whole mesh; hidden fragments
  still run the shader), frame 1.566; the fans (0.56) draw in full until 2b.
  THE BOUND (every chain on the explore program, 390 pieces, 228
  frontiers): 1.962 [1.954-1.968], the same as master's program; the 228
  halo sprites add about 0.06 ms (the sprite batch, 0.064 vs 0.008); frame
  2.824.
