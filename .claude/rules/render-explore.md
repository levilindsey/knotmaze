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
- PROBE HOOK: `__knotExplore({on, reach, fade, look (name or index),
  visitAll})` returns `fabric.exploreState()` (the switch, the last view,
  the seen vertices and walked runs; since 2c also `held`, `hold` and
  `partial`). Since stage 2c it writes the params (`exploration`,
  `revealDistance`, `revealFade`, `revealLook`; the numbers raw, past the
  panel's ranges) and the model is fed by move events (below). In 2a it
  read the controller's visited sets, which record a tap when the move
  STARTS and survive a catch.
- NOT IN 2a: the crossing gaps, the junction webs and fans and the
  markers (stage 2b, below). Hit-testing of hidden runs, the move-event
  model, params, panel and codec: stage 2c, at the end.
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
  junction's web and fans draw unless an arm is hidden at its slot (vis
  <= EXPLORE_JOINT_MIN 0.002). K268 stage 2 (2026-10-15) replaced 2b's
  rule, every arm solid (EXPLORE_JOINT_VIS 0.98) at the slot and
  EXPLORE_JOINT_OUT (0.25 ctrl) out, under which a web popped in whole.
  The model holds a visited junction's arms solid through its web domain
  and fades a stub INTO an unvisited junction (vis 0 at its slot), so
  both rules hide exactly the unvisited junctions. A free tip's cap draws
  unless its thread is hidden at the tip (the host-axis fallback disc
  checks both threads). A hidden joint emits no fan, wedge or fused-tip
  record. What draws fades with its threads: THE JOINT FADE, below.
- WHEN IT REBUILDS: rebuildFillets appends the hidden set
  (`exploreJointsKey`) to its cache key, so the fans rebuild when the SET
  changes (an arrival, an arm's vis at a slot crossing 0.002), not on
  growth frames.
  setExplore applies the gap gate and uploads the slot table at once (the
  declaration and the gaps change in the same frame), update() re-applies
  it after each solve, and needsFxRender stays true while
  `exploreUpdatePending`, so a declaration change gets its update() while
  the knot sleeps.
- THE JOINT FADE (K268 stage 2, K275, 2026-10-15): under the reveal the
  arm strips write the thread's visibility as premultiplied alpha
  (`arm-strip-explore`, withExploreStrip: chainMaterial x vis, alpha vis;
  vis is kExploreAt at the strip sample, the plain visibility, not the
  end look), and the fans read them premultiplied (`junction-field-explore`,
  withExploreField: stripAtP; armPaint, junctionBase and junctionField
  return vec4 through the angular blend, the K169 web fade and the K81
  band mixes; finalColor = exC x vColor x aM x gk, discarded at alpha <=
  0.002). A web fades with its arms and a cap with its thread; over solid
  arms the color is master's. The strip quad still draws with blendMode
  none, so its texels are exact. setExplore swaps the strip pass and both
  fan meshes onto these programs, and fan meshes made under the reveal
  take them. CPU twins: cpuChainMaterial's out[3], cpuStripAt
  (premultiplied texels, lerped alpha), cpuJunctionField's alpha. Mode
  off draws master's programs (`explore_strip.test.ts` undoes every edit
  and gets master's text back). In the model's states a fade shows where
  arms are partly visible at a slot (the intro's close-in), not on
  growth frames.
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
  rejected), and its texel 1.w still carries 2b's scalar, which every
  explore program fetches and replaces by the profile since stage 2 gave
  the fans and the still pluck the shaped cut (THE CUT IN THE FANS,
  below); only a master program would use it.
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
- MAX MEASURED, BROKEN AND FIXED (K76 2c's census walk found it; K268
  stage 2 fixed it in 711c34f, 2026-10-15): at a MAX slot whose two
  threads are both walked (crossing 275, flags 19, P0 = P1 = [5.7462, ~0,
  1, 1]) mode off cut 1010 px and mode on 0 px, so the two threads fused.
  The written profile was wrong, not the GPU branch: classifyExploreCut's
  ramp read the side off the signed fade (`fs < 0`), and a HARD low end
  passes -0, so every hard low end got F = +1e-6 (hidden above the end)
  instead of -1e-6. The ramp takes the side as an argument now
  (`explore_cut.test.ts` fails on the old code). GPU, the same walk
  (`.claude/probes/K268/stage2/max_probe.mjs`): c275's second ramp went
  from F = +1e-6 and 0 px to -1e-6 and 1010 px, mode off's own count; the
  walk's other MAX slots (c101, c214, c277, c279: hidden under threads)
  cut 0 px in both builds.
- THE CUT IN THE FANS (K268 stage 2, 2026-10-15): `exploreGapEdits(fan,
  decl)` (explore_glsl.ts) puts the end looks (EXPLORE_LOOK_GLSL, split
  out of EXPLORE_DECL_GLSL byte for byte) before gapKeepAt and the shaped
  cut into its slot loop, in any program. The junction field (the last
  three FIELD_EXPLORE_EDITS) takes the FAN texts: the search runs
  without the early stop (the true nearest point), and once the shaped
  strength is known the fan re-applies master's inside-silhouette branch
  (`best < exSure2`, master's own sure2, so exactly master's condition).
  A junction fan keeps its one-pixel-inset foreign silhouette and a
  free-tip cap its full mask, each scaled by the over thread's coverage.
  The still pluck (`pluck-still-explore`, withExploreStill) draws a
  ribbon, so it takes the ribbons' texts, plus uKExplore and paint_glsl's
  kSmooth, which its fragment lacks; PluckOverlay.setExplore (from the
  renderer's setExplore) moves live still plucks onto it. No new CPU twin:
  nothing mirrors gapKeepAt, and the coverage has exploreCutCoverCpu.
  MEASURED (K76 2c's census walk, ten moves, cam=follow; probes in
  `.claude/probes/K268/stage2/`): mode off 0 px against master. Mode on,
  483 px changed against the build before this step, all within 40 px of
  junction 101, which now paints mode off's pixels exactly (its fan had
  painted the web over a fully shown gold thread: 224 fan px against mode
  off's 94, a mismatch master has too). Inferred: the fan had scaled a
  shaped slot's silhouette cut by 2b's scalar (crossing 100, over pass at
  vis 0.47, whose mode-on cut grew 225 px in the same run). Junctions 56,
  57, 58 and 161 still differ from mode off, with master's counts
  (unattributed).

## In the game (stage 2c, 2026-10-15)

Brief and handoff: `docs/design/K76.md`, "Stage 2c". Params and codec:
gameplay-links.md's EXPLORATION PARAMS.

- PARAMS TO RENDERER: main.ts `syncExploration` runs every tick:
  `exploration` fog sets `fogOfWar`, threads sets `explore.on` (the two
  never coexist), `explore.fade` = min(revealFade, revealDistance).
- THE MODEL IS FED BY MOVE EVENTS (fabric `exploreArrive`, stopMove),
  recorded with the mode off too, so turning it on mid-solve shows the
  real walk. A dot that LANDS (tickAnim or setMoveProgress arrival, a
  move snapped by the next, a cancel) walked its run and saw its far end.
  A CAUGHT dot (stopMove, K80) saw its run only up to the dot: a PARTIAL
  `{edge, from, cur}`, drawn from the departure end to the dot with a
  lead fade and a frontier there. The controller's taps (recorded when a
  move STARTS) feed only a K47 restore (`exploreRestore`, grown at once;
  a restored caught partial shows its run whole) and a daily's Reset path
  (`exploreRuns`). EPOCH (`exploreEpoch`): a restart (`c.restarts`) or a
  re-fogging catch (`c.refogs`: minoRefog, one setting for both modes)
  forgets everything; the entrance and the head at rest are always seen.
- THE INTRO (fowIntro on and an intro playing; fowIntro defaults to off):
  the reveal HOLDS (every run whole), then CLOSES IN over EXPLORE_CLOSE_S
  1.6 s (the fog's FOG_INTRO_DUR) as a front contracting by walk distance
  from the seen set (`exploreDistances`, `exploreHoldRadius`, a smoothstep
  level), never a dissolve: no thread draws two translucent copies, so
  the brief's doubled-alpha transient cannot arise. `tickExplore` runs
  every frame in every clock mode (clk=realtime runs tickChase, never
  tickAnim).
- HIDDEN THREAD IS EMPTY SPACE for input. `ribbons.exploreShownAt` =
  vis >= EXPLORE_PICK_VIS 0.5 (a fading stub answers to its half-fade;
  the markers and the minotaur use 0.98). pickThread skips hidden
  samples, and fabric `shownAt` gates edgeAt and runDistance, so hover,
  the cursor, taps, presses and tugs all see empty space there: a drag
  pans, a double-tap resets, and main.ts `grabAt` grabs through
  pickThread (the particle at the rounded ctrl). `onThread` asks only
  pickThread under the reveal (ps.nearest knows nothing of visibility).
  A PLUCK clips its unit to the shown interval (`exploreShownSpan`,
  0.25-ctrl steps); one that lands on hidden thread (an auto pluck) is
  sound-only. Key moves need no filter: they pick runs at the head, which
  always show.
- THE FIT CAMERA frames `fogVisibleBounds() ?? exploreVisibleBounds()`:
  each piece's solid part and half its fades, sampled every
  EXPLORE_FIT_STEP 2 ctrl, grown by EXPLORE_FIT_PAD 1 world (plus main's
  0.3), cached per declaration (syncExplore runs on every update() and
  move frame). Master's 90 px/world cap binds at the start (the fog's
  start view sits at the same cap). While the intro holds it frames the
  whole maze, and the close-in zooms onto what was seen. Follow mode
  keeps FOLLOW_SPAN 13.
- MARKERS, THE MINOTAUR, PULSES: the exit's K73 indicator follows the
  exit marker's own rule (solid at vis 0.98; not sticky). A minotaur that
  `minoFog` keeps under the fog (never, or hunting while it is not
  hunting) hides while its thread point's vis < 0.98, and
  `minotaurUnderFog` withholds its indicator; its telegraph can still
  draw over hidden thread while it shows. pulseReach is capped at
  revealDistance.
- THE HALO BREATHES between 0.6 and 0.85 over 2.5 s (`styleHalos`, every
  frame from tickExplore); Reduced motion holds 0.8; High contrast draws
  it at 1 in pure white (`exploreStill`, `exploreContrast`, set by
  main.ts each fabric tick). The dots under High contrast are still the
  look's (stage 2d: an explore-program change plus its CPU twin).
- KEPT AS 2b BUILT, calls for Levi: K268's draw order (K286). (The
  joints' binary pop at 0.98 became THE JOINT FADE in K268 stage 2.)
- MEASURED (2026-10-15, 53a161f, `.claude/probes/K76/stage2c/`;
  desktop 1400x900, phone 411x753). Mode off: master 2c81a92 and the
  branch drew 0 px apart in the same state (pulse phases 0-3, after an
  on/off round trip, with a hovered choice; A/A 0 px); the mode on
  changed 382,333 px. Fit at the start: s 90 (the cap) against 21.9 off
  (desktop) and 8.9 (phone); mid-walk s 42.0 (desktop, fill y 0.81) and
  32.2 (phone, fill x 0.60, y 0.74). Eight hidden points: pickThread
  null with the mode on, a hit at all eight with it off; six clicks
  there moved nothing, plucked nothing and kept the default cursor; six
  press-drags grabbed nothing, while a press on shown thread grabbed
  (cursor "grab"); no page errors. A catch (desktop, 6.8 s) left the
  partial {edge 8, from 0, cur 8.60}; a re-fogging catch (mrf) forgot
  all but the entrance. The intro's hold reached 1 by 6.2 s, and its
  close-in took 1.59 s, monotone, ending at s 90. The intro camera
  opens at s 90 on the start stub, pulls out to the whole maze (s 21.0)
  1.1 s after the hold starts and zooms straight in during the close-in;
  master's fog intro opens and pulls out the same way, but its close-in
  first zooms OUT to s 11.7 for about a second (`introcam.mjs`).
- PROBE GOTCHAS: the fit camera now moves with the mode and after every
  move, so a same-state on/off probe waits for `__knotView()` to hold
  still after each toggle (k76_probe.mjs's viewStill) or pins
  `cam=follow`, and a choice's screen point read before the camera
  settles goes stale. fowIntro defaults to off: an intro probe passes
  `fwi=1`. Probes: `.claude/probes/K76/stage2c/` (`k76c_probe.mjs <host>
  <outDir> desktop|phone [ABCD]`: A fit and hidden input, B a catch's
  partial, C a re-fogging catch, D the intro; `k76_probe.mjs ab`;
  `run_2c.ps1`, under the perf lock).

## THE BURN (K290 stage 3a, 2026-10-15)

The burn race's burnt thread (gameplay-fire.md's BURNT THREAD) draws
through this mode's programs. Brief and record: `docs/design/K114_burn.md`,
"Stage 3a plan" and "Stage 3a handoff".

- MODEL (`game/explore_view.ts`, tested in `test/game/explore_burn.test.ts`):
  `BurntSpan {chain, b0, b1}` (chain ctrl, b0 < b1, a ring's span may run
  past n); `subtractBurnt(pieces, spans, ringN)` cuts burnt stretches out
  of declared pieces (`cutPiece`, CUT_EPS: a cut through a piece's solid
  part is a hard end, fade 0 and no frontier; a cut through a fade
  shortens the fade); `wholePieces(chains)` is every chain whole (the reveal-off
  base). `ExploreBurn {gate, char}`: `gate` = the reveal's own pieces
  (null with the reveal off), `char` = the spans to darken (null under
  gone).
- DECLARATION (`FabricMazeRenderer.syncExplore`): reveal on: the reveal's
  pieces, less the burnt spans under gone; reveal off and something burnt:
  `burnOnlyPieces` (whole chains, less the burnt spans under gone); reveal
  off and nothing burnt: `setExplore(null)`, master's path and programs.
  `ribbons.setExplore(pieces, look, breath, burn)` skips identical
  declarations (`sameBurn`). The char items cover every burnt span, but
  the section and strip programs scale char by the declared visibility
  (`aM *= ev`), so under the reveal char shows only seen burnt thread
  (the sheet's a12: the walked route only; with the reveal off, the whole
  burnt half).
- CHAR IN THE SHADERS: items of type `EXPLORE_ITEM_CHAR` (6) in the
  KPAINT item rows (`charItem`; `charRange`, the span plus
  EXPLORE_CHAR_EDGE at each end, is the unwrapped range its slot
  references cover), like VIS not a PAINT_ITEM, and a per-chain flag in
  the chain texel's .y (`paint_model.setExploreFlags(flags, char)`).
  `kCharAt(chain, ctrl)` sums each span's ramp (EXPLORE_CHAR_EDGE 0.08
  ctrl centered on each end, so abutting spans sum to 1: no seam);
  `kCharLook` mixes char (0x22140e, 0.9) and the ash core (0x7a3a22,
  0.75, |vUV.y - 0.5| < EXPLORE_ASH_HALF 0.15). The section program
  recolors rgb only, just before `aM *= ev`, so the crossing gaps cut
  char like thread; the arm strip (`kStripChar`) chars without the ash
  core. No CPU twin (K152 item 3).
- JOINTS: the gate decides which junctions hide (2b's rule, on the
  reveal's own pieces through `exploreGateVisAt`); the declared pieces,
  which lack the burnt thread, hide a junction only when every arm is gone.
  Otherwise the web draws and a burnt arm's lobe fades with its strip (the
  joint fade). Without a burn the two are the same pieces, so the 2b rule
  holds exactly.
- INPUT AND HALOS: `shownAt` (taps, hover) reads `exploreShownAt` whenever
  `ribbons.exploreOn`, so gone thread is empty space with the reveal off
  too, and `onThread` uses pickThread for the whole race once anything
  burns. Frontier halos whose midpoint is burnt under gone are dropped
  (`burntGoneAt`).
- PROBE HOOK: `__knotExplore({burnt: "gone" | "char"})` sets the param
  (the frame loop syncs it), alone or with `on`; the fabric renderer's
  `burnSpans` are the declared stretches (`.claude/probes/K290/stage3a/
  sheet.mjs` sums them into the burnt share).
- MEASURED (desktop RX 6800 XT, D3D11, under the perf lock;
  `.claude/probes/K290/stage3a/`): fire off, branch c7a03e0 against master
  f799991 (`k290_ab.mjs ab`, link `k111&am=instant&snd=none&fw=0&phy=0`):
  reveal off 0 px at four pulse phases, a hovered choice 0 px, reveal on
  (beacon) 0 px at two phases, on-then-off 0 px, A/A floors 0. The probe's
  PIN must hold the halo breath (`exploreClock = 1000`, tickExplore with
  dt 0), or the halos differ by 14-18k px between pages. Fire on with
  nothing burnt (env `LINK=` the same link plus `&fi=fuse&fdl=40`, two
  moves in, the lit fuse drawn): the same 31 checks, all 0 px.
  `sheet.mjs` is the contact sheet; `warn_check.mjs` showed
  master and branch print the same 13 PixiJS "Attribute aGap / aGapId /
  aUV is not present in the shader" warnings at load in a fire race, so
  they predate 3a.
