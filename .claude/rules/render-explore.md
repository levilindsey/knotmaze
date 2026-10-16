---
paths:
  - "src/render/explore_glsl.ts"
  - "src/game/explore_view.ts"
  - "test/render/paint_explore.test.ts"
  - "test/render/explore_gates.test.ts"
  - "test/render/explore_cut.test.ts"
  - "test/game/explore_view.test.ts"
  - "src/render/ribbon/explore_gaps.ts"
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

- GAP GATE (`ribbon/explore_gaps.ts` applyExploreGaps, `GapMaskTable.setVis`): a
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
  test, so neither shows on hidden thread. K465 (2026-10-15) lifts that
  for the EXIT by default: `revealFinish` (`rvx`), one pure rule in
  `src/game/explore_finish.ts` (`finishHold`, `markerGapHeld`; the
  constant moved there from explore_gaps.ts) read by the marker, its gap
  slot (`exploreFinish`, set by `setExploreFinish`, flagged on the exit's
  `markerOccluders` entry) and the indicator. The start marker's rule
  stands. "MARKERS, THE MINOTAUR, PULSES" below has the rest.
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
  gapStrength(P2.x) * exploreCutCover(row, fl, A, lat, pxW)` (K397:
  `lat = sqrt(best)`, the fragment's distance from the over centerline);
  0 skips the slot. The look is ONE function, `kExploreLook(look, v, u,
  s, lf, lat, sideFw, pxW)`, called by the thread's main and by the cut
  at lat 0 (fray cuts by its center fiber, so its cut flickers along the
  fiber); since K397 the dots and beacon cut by the dots' own shape
  instead (THE DOTS, at the end). The glow look's tint stays in main. CPU
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
  (unattributed; stage 2d's MEASURED entry below rules out two causes).

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
  the minotaur uses 0.98, and so do the markers, bar the exit's under
  K465's `revealFinish`). pickThread skips hidden
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
  exit marker's own rule (solid at vis 0.98; not sticky) - since K465
  (Levi, 2026-10-15: "show where the destination marker is, by default")
  only with `revealFinish` OFF (`&rvx=0`; panel "show finish", under
  threads). On (the default) the marker, its gap slot and the indicator
  behave as with the mode off: the exit shows over hidden thread from the
  start, the indicator sits at the screen edge while the exit is off
  screen, and its tap calls `frameWorld`, as with the mode off. MEASURED
  AT 411x753 (K465, links `?2gozcj` and `?k397a` with `&xp=threads&
  am=instant&snd=none&fw=0`, never moved): the fit camera starts at its
  cap (87-90 px/world, zoom 1, pan range 0) and the exit sits about 8
  viewports away (2gozcj: screen (3339, 3424); the disc at (380, 546)
  pointing at 0.77 rad), so a tap plays the 0.6 s tween and ENDS ON THE
  SAME VIEW (`placeWorldAt` clamps to the home view, and at zoom 1 the
  range is one point): the exit stays off screen, the indicator stays
  shown and its label "Tap to bring it into view" is untrue there. The
  follow camera's tap does zoom out (s 31.6 to 26.9 in 0.7 s, held 2.6 s)
  but the exit was still off screen at every sample, 0 frames on screen
  (2gozcj). PIXEL A/B of the marker itself (the exit is never on screen
  AND unseen at 411x753): `k83_ab.mjs` at 2600x1600 on `&gs=4` (the exit
  is on screen, unseen), master against this build: default 6355 px, all
  inside the exit's footprint (max 0.5 world from its center), 0 px at
  the start and the head; `&rvx=0` 0 px
  (`.claude/probes/K465/ab/big_gs4_*`; crops in `out/`). A decision for
  Levi (a toast as under fog, a camera that
  includes the exit, or accepting it); K465 left the cameras alone. What
  still holds it (`finishHold`): the intro's appearance
  reveal (`revealMulAtCtrl` < 0.98: "exit unrevealed"), and an exit
  point the burn has taken under `burnt` gone (`exitLifted` is false
  there, and the burn's own hiding of that point drops its vis under
  0.98, so the exit hides as with the mode off); the indicator's other
  clauses (setting off, loading, solved) are untouched. The fit camera is
  unchanged (it frames the seen thread, so the exit starts off screen
  and the indicator points to it). A minotaur that
  `minoFog` keeps under the fog (never, or hunting while it is not
  hunting) hides while its thread point's vis < 0.98, and
  `minotaurUnderFog` withholds its indicator; its telegraph can still
  draw over hidden thread while it shows. pulseReach is capped at
  revealDistance.
- THE HALO BREATHES between 0.6 and 0.85 over 2.5 s (`styleHalos`, every
  frame from tickExplore); Reduced motion holds 0.8; High contrast draws
  it at 1 in pure white (`exploreStill`, `exploreContrast`, set by
  main.ts each fabric tick).
- HIGH CONTRAST DOTS (K76 stage 2d, 2026-10-15, 0ac54dc): under High
  contrast `setExplore` writes uKExplore.x = 2 instead of 1 (every other
  test of it reads > 0.5); the fabric's `exploreContrast` setter forwards
  to `ribbons.setExploreContrast`, which also rewrites a live 1/2 (a
  uniform, no update()). kExploreLook then drops the dots' 1 - 0.55 u²
  dimming and sets `kExDot` (1 where the nearest shape is a dot, 0 on the
  cap and in every other look); the thread's main mixes rgb to white by
  it right after the call, before the char, so a burnt dot still
  darkens. The cap keeps the thread's color; the beacon's dots follow
  (the same code); the shaped cut draws its dots at full strength
  (exploreCutCover's dots branch, since K397). CPU twins:
  `kExploreLookCpu(..., hc, out)` and `exploreCutCoverCpu(..., hc)` in
  paint_math.ts, held by explore_cut.test.ts "K76 stage 2d: High
  contrast dots" (5 tests).
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
- MEASURED, STAGE 2d (2026-10-15, 1ba0c8c against master ce359aa;
  `.claude/probes/K76/stage2d/`, every desktop run under the perf lock).
  GPU PER PROGRAM (RX 6800 XT, 3200x1800, `k111.L` phy=0, 2 moves,
  `k268s2/gpu_by_program.mjs`: TIME_ELAPSED from the first draw, ms a
  frame): mode off 2.59 on master and 2.58 on the branch (ribbon 1.69 /
  1.66, fan 0.58, strip 0.06; 98.7 draws); mode on, 5 pieces, 0.86 (10
  draws); visitAll (392 pieces) 2.82, 9% over mode off; High contrast
  0.88; `phw=0` 0.83. THE CENSUS ON SHAPED SLOTS (`census2d.mjs`: K268
  stage 1's S/R/F proof inside 2b's census walk; `out/census_branch.txt`,
  `census_hc.txt`): 25/27 with High contrast off and on. The 8 shaped
  slots at reach 2.5 follow the CPU twin at p95 0.003 to 0.009 in fade,
  dots, beacon and halo and in HC dots and beacon, with 0 ghosts and 0
  under-cuts. A shaped slot restores through `applyExploreGaps` (setVis
  reads NaN there). The two fails are master's four joints (56, 57, 58,
  161). Two hypotheses FALSIFIED: the underlay (the fan-less frames are
  identical where the fans differ) and the gap gate (every live slot
  reset to solved: identical). Hidden chain 70 crosses shown chain 65
  at c273 to c279, beside 57 and 58. A third, the FAN PROGRAM, is ruled
  out too: with both fan meshes swapped onto master's junction-field
  program (captured in mode off), the four joints read the same counts as
  shot on both builds, and `k268s2/swapcheck.mjs`, which names each
  draw's program from its fragment source, shows the swap rendered (8
  `fan` draws and no `fan-explore`, then 8 `fan-explore` after the
  restore). So 57 and 58 (solid arms, slots solved) differ upstream of
  the fan's shader: its records, the strip rows it reads or the geometry
  (K268 stage 3). K290's fire-off A/B
  against master: 31/31, 0 px in every state (`out/k290ab.txt`). THE
  WORKER: the default against `&phw=0`, 31/31 at 0 px with phy=0 and with
  the physics on (both hosts sleep at sim 5.000000000000038 s). THE PHONE
  GATE (Pixel 11, section 5 of `K76_reveal_mode.md`;
  `phonekit/gate.mjs`, the default link, the worker, the flow on): 1
  PASSES (60.3 fps at the start, mode off and on; 60.5 mid-solve; 60.0
  with all 388 pieces shown; no interval over 33.4 ms) and 4 PASSES (the
  close-in, 80 frames, max 33.5 ms, none over 50). With the flow on, 2
  and 3 cannot be read: at rest the flow's half-rate update() runs 30
  times a second with the mode OFF too (main thread 9.8 ms a frame, p95
  20.8), and the mode on adds 0.2 ms mean and one update() in 4 s.
  With `&fw=0` (`phonekit/gate2.mjs`: mode off, then on in a fresh page,
  6 moves each) the rest is 0 update() calls in both modes (0.3-0.7 ms a
  frame), so those were the flow's. A move costs 0.5-0.8 ms a frame mean
  with the mode off and no update(); with it on, 1.5-2.5 ms (p95 2.0-3.5)
  but 1 to 5 update() calls a move (the first 0.36-0.41 s into a window
  opened just before the tap, 0.76 s in one move) and a worst frame of
  23.5-38.8 ms (11.2-20.5 off): 2 FAILS on "no update()" (inferred: the
  worst frames are those calls; likely source, read from the code and not
  traced: `applyExploreGaps` sets `exploreUpdatePending` at every slot
  flip, K76.md's stage 2d handoff). No rAF interval
  over 33.4 ms; four over 20 ms in the first move, none in the other
  five. So 3 shows no doubled interval at the arrivals, but the arrival
  frame's own cost was not isolated, and Chrome can keep vsync-aligned
  rAF stamps through a late main-thread frame (inferred). The phone has
  no GPU timer (PowerVR). THE
  HELD FRAME (`k76c_probe.mjs` D, HELD_T 9 and 12.5): the hold lasts
  about 7 s before the 1.6 s close-in (7.0 s desktop, 6.9 s phone-size,
  6.7 s on the phone), most of it on the whole-maze fit while the
  appearance draws: 1.6 s into the hold the upper-left half is drawn, 5.2
  s in nearly all of it. Clock times depend on the program cache: in a
  fresh probe profile the hold starts 6.6 to 7.4 s after load (the
  page's 50 ms sampler misses 6 to 7 s; inferred, K307's cold compiles),
  on the warm phone at 1.1 s, where the close-in ends by 9.4 s.
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

## THE BURN, stage 3b (K290, 2026-10-15): the fire's look

Stage 1's Graphics fire is gone; the fire draws through these programs
plus the `burn` FX. Brief and record: `docs/design/K114_burn.md`, "Stage
3b brief" and "Stage 3b handoff".

- MODEL: `BurnFront {chain, c, dir, kind}` (dir = the ctrl direction of
  the unburnt side; kind 0 a burning front, 1 the lit fuse) and
  `ExploreBurn.fronts` / `.smolder` (BurntSpans) beside gate and char.
  `FabricMazeRenderer.drawFire` builds them: a front for each burnt
  stretch `runBurnAt` pairs with one (`front[i]`; from the va end the
  unburnt side lies toward vb); while `L <= fire.delay` none of those,
  but a kind-1 front on each of the start's runs where the thread first
  lies marker radius + FIRE_FUSE_OUT 1.0 thread width (world) from the
  start disc's center (`runOut`: FIRE_FUSE_STEP 0.1 lattice samples,
  refined linearly, at most half the run); smolder on each smoldering
  choice from the head to its first burnt stretch, only at rest in a
  live race (no move, not solved, not lost). Fronts or smolder alone put
  explore on (`burnOnlyPieces`), as burnt spans do.
- SHADERS: items `EXPLORE_ITEM_FRONT` (7, T0 = (type, c, dir, kind)) and
  `EXPLORE_ITEM_SMOLDER` (8, a span) in the KPAINT item rows, read by
  kCharAt, which sets two globals: `kFireEmber` and `kFireSmolder`. A
  front darkens the unburnt side under char over FRONT_BAND 0.7 ctrl
  (meeting the span's own ramp, no seam); the ember peaks at the front,
  EMBER_AHEAD 0.25 ctrl into the unburnt side and EMBER_BEHIND 0.55 into
  the burnt one (0xff7a1a at 0.95, a hot core 0xffe08a inside |vUV.y -
  0.5| < 0.22); smolder is a centerline (0xff3b1f at 0.9, half 0.225).
  `kEmberLook` applies them after kCharLook inside `if (exHere)`, so the
  crossing gaps cut them like thread; the arm strip gets the ember, not
  the smolder line. Static: no fire clock in the shaders; the motion is
  the FX's. Band widths are in CTRL (about 1.93 ctrl per lattice unit),
  so short in world terms. K299's ring-lap scan lists the front's
  nearest-lap floor as a reviewed site.
- UNSEEN FRONTS DRAW AS NOTHING (`FIRE_UNSEEN_FRONTS` false; Levi
  accepted): under the reveal the ember scales by the declared
  visibility like char, and `tickFireFx` skips a front whose
  `chainVis` < 0.5. True would draw a small piece of thread
  (FIRE_UNSEEN_HALF 0.4 ctrl) and emit there.
- FX: one lazy `AppearFxSystem` (style `burn`, seed 0xf17e) in
  overContainer just under the start marker (over the yarn, under the
  markers and the fog); `spawnFrontier` at each front at FIRE_FX_RATE
  0.4 of the appearance's rates, shared past FIRE_FX_FRONTS 12 fronts,
  round-robin start; no spawns under Reduced motion (exploreStill) or a
  hidden tab; the pool ticks every frame, asleep too.
- FOG LIGHT: under fog, a soft hole at each kind-0 front
  (`fogFireLights`, FIRE_FOG_LIGHT 0.75 of the stamp radius, in
  renderFog); the fog redraws only when a light appears, goes, or moves
  FIRE_FOG_LIGHT_STEP 0.3 world.
- THE EMBER DRAWS; THE LIT FUSE HID UNDER THE START DISC (2026-10-15).
  3b's first probes found no ember. A TEMPORARY debug view (a dev-server
  edit of EXPLORE_MAIN_GLSL, never committed: uKBase.z 7 writes
  (kCharAt, kFireEmber, kFireSmolder) as RGB and returns) showed injected
  kind-0 fronts at c 12 and 20 where the CPU points put them
  (`ember_dbg2.mjs`, `ember_dbg3.mjs`, seed 7). Under char, a glowing
  band at the char's end in normal colors; under gone, the ember's
  behind part lies on gone thread, so only a rim at the cut end shows.
  The lit fuse used the world sum (marker radius + thread width) as a
  run's LATTICE distance (a lattice unit is about 0.65 world at seed 7's
  entrance), so its ember centered at 731 px against the disc's rim at
  733 (c 1.54). `runOut` fixed it: c 2.55, the ember at 746-757 px, partly
  under the burn FX's smoke. PROBE GOTCHA: the fabric re-declares its
  stored burn on every update() (`syncExplore`), so a probe that injects
  fronts through `setExplore` first sets `F.syncExplore = () => {}` and
  `F.drawFire = () => {}` (`F = __knotFabricRenderer()`); inferred to
  have hidden the earlier injections, not re-run.
- MEASURED (desktop RX 6800 XT, D3D11, under the perf lock;
  `.claude/probes/K290/stage3b/`): fire off, branch ef7f08b against
  21d701e (master's src; 3a's `k290_ab.mjs ab`, same link and pins):
  31/31 checks, every frame 0 px (reveal off at four pulse phases, a
  hovered choice, reveal on at two phases, on-then-off, A/A floors 0).
  Variant lengths: section explore 56595 -> 58529, arm-strip-explore
  37084 -> 38559, junction-field-explore and pluck-still-explore
  unchanged; the warm-up's wave 1 compiles all three explore variants
  (`__knotWarmup()`), no shader errors, no context loss.
- A RACE'S FRAMES (K382; `burn_page.mjs perf`, seed 7 `fsp=0.95`, at
  rest after the escape, 278 runs, under the perf lock; the branch at
  0df3eb3+ against 21d701e): the frame interval does not move (desktop
  P50 17.4-17.5 ms and P95 18.1, fire drawn or not, both builds; under
  4x CPU throttling 51-52 and 70-71). The fire's own CPU a frame:
  drawFire, which spawns the FX, 0.18-0.21 ms, and about 0.2 ms more
  pixi render, the FX (master, stage 1's cached Graphics: 0.06 and
  0.04-0.1); at 4x 0.85-0.89 and 0.8-0.9 (master 0.26-0.29 and 0.2-0.4).
  Desktop contact sheet (the lit fuse, early, mid and late; gone and
  char; the reveal off and on): `.claude/probes/K290/stage3b/out/sheet/`.

## THE DOTS (K397 stage 2, 2026-10-15)

Levi's call (c) (K423): "always two beacon dots, sized to fit the fade".
It fixes K397's issues 1 and 2 (a stub's end showed one dot, two, or a
dot and a half, cut square by the fade's end: the old fixed pitch of
0.95 tw against a hard end) and 5 (a dark band across a crossing under
a dot). Diagnosis, brief and handoff: `docs/design/K397.md`.

- THE SHAPE (`kExDotsSd(s, la, lf)`, explore_glsl.ts; CPU twin
  `kExDotsSdCpu`, paint_math.ts): the signed world distance from a
  point of a frontier fade (s along from the solid end, la across, lf
  the fade's arc length) to the nearer of a CAP and TWO DOTS. lf comes
  from `kExEnd`, the ctrl where the fade ends, which kExploreAt now sets
  beside kExSolid (`exLf = abs(kArcU(kc, kExEnd) - exA0)` in main). g =
  clamp(lf / (EXPLORE_DOTS_SPAN 2.15 tw), 1e-3, 1). The cap is half an
  ellipse, 0.5 tw across and 0.5 tw g along, so it meets the thread's
  edge at the solid end (it assumes the half-width is 0.5 tw; where a
  width multiplier is not 1 a small step shows there). The dots sit at
  EXPLORE_DOT_AT (0.44, 0.88) of lf, radii EXPLORE_DOT_R tw g (0.2472,
  0.1944: the old 0.3 (1 - 0.4 u) at those u). At lf = 2.15 tw that is
  the old dotted line's cap and first two dots (0.95 and 1.9 tw); below,
  everything scales by g, so the second dot's far edge stays at 0.97 lf
  and the fade's end never cuts a dot. It sets kExDot (1 when a dot is
  nearer). The dots and beacon looks (`kExploreLook(look, v, u, s, lf,
  lat, sideFw, pxW)`) are clamp(-sd / pxW + 0.5) times the strength,
  1 - 0.55 u² (1 under High contrast).
- A LOOK CHANGE (for Levi's review): a fade over 2.15 tw used to repeat
  a dot every 0.95 tw and now has two, spread along it; High contrast
  too.
- THE CUT BY THE DOTS' SHAPE: the shaped cut used to call the look on
  the over thread's centerline (lat 0), so a dot cut the full casing
  width wherever the centerline lay inside it: a band a casing wide
  across the under thread (issue 5). Now, for a dots or beacon frontier,
  `exploreCutCover(row, fl, A, lat, pxW)` (lat = sqrt(best), the
  fragment's distance from the over centerline) returns only the look's
  strength, sets `kExCutOn` and `kExCutSd = kExDotsSd(bs, lat, bf)`,
  and EXPLORE_GAP_SHAPE_GLSL (`if (exShaped && kExCutOn) d = hO +
  kExCutSd;`, an anchor before ANCHOR_CASING, placed by withExplore and
  by exploreGapEdits) measures the casing from that shape: a casing ring
  around each dot and around the cap. Past the fade's end the cover
  stays on at u = 1 (strength 0.45), so the second dot's ring is whole
  there too. The fans skip master's inside-silhouette branch while it
  is on (`best < exSure2 && !kExCutOn`). A MAX slot takes the winning
  ramp's dots (the best-of, ties to a solid ramp), a MIN slot the lower
  end's. CPU twin: `exploreCutCoverCpu(prof, A, look, tw, pxW, hc, lat,
  out)` (`out.on`, `out.sd`).
- TESTS: explore_cut.test.ts "K397: the dots fit the fade and cut by
  their own shape" (5: a cap and exactly two dots in every fade, the old
  layout at SPAN, a signed distance meeting the thread's edge, the cut
  at lat and past the end, the GLSL against the twin);
  explore_strip.test.ts "measures a dots cut's casing from the dots'
  shape (K397), once, before the casing"; paint_explore.test.ts's
  anchors. K299's ROUNDED_QUOTIENTS lost the old pitch's
  `floor(s / sp + 0.5)`.
- MEASURED (desktop RX 6800 XT under the perf lock, the phone's 411x753
  at 2.625, `?<seed>&xp=threads&snd=none&fw=0&am=instant`, 12-14 moves;
  `.claude/probes/K397/stage2/`). SURVEY (`survey.mjs`; 2gozcj, k397a,
  1x2y3z, bead5: 41 frontiers, the same fades as stage 1): dots cut by
  the fade's end 10 -> 0, and every one stage 1 found cut is whole (e.g.
  2gozcj f6's second dot, cut at s 1.07, is now [0.83, 1.07]). Two
  flags remain, 1x2y3z f1 and f6 (the drawn dots end at about 0.85 of
  the fade, the rule's 0.97), identical in stage 1: inferred an
  occlusion, not inspected. THE
  CUT (`zoomcrops.mjs`, 2gozcj f6, slot 174, the over pass at vis
  0.488): 11160 px change against the slot rejected (stage 1: 9718), all
  darker, at s 0.2-0.83: a ring around dot 1 and a short cut at the cap,
  where the band was (`out_s2/zoom/2gozcj_f6_s174_ab.png`). Program text:
  render-shaders.md. Not run: a K268-style census of the new cut, the
  K76 2d census, the phone, Levi's link.
- PROBE NOTES: the survey's s runs 0.02-0.06 ahead of the shader's fade
  end, and it skips segments that start before s 0.3, so a fade under
  about 0.9 world reports its second dot only. A slot rejection holds
  only on an `am=instant` link (probes.md, K397).
- TRUNCATED DOTS, K459 item 1 (2026-10-15; Levi at 13:39: "I'm still
  seeing truncated dots ... sometimes"; his call a: "Cap and two dots
  is good"): NOT REPRODUCED. His link `?2gozcj.MgaM` at the phone's
  411x753 at 2.625 (`&snd=none&fw=0&am=instant`), walks of 0, 1 and 2
  moves: the cap and two whole dots in every crop
  (`.claude/probes/K459/out_levi0|1|2/`, `out_levi_survey.log`). RULED
  OUT: stage 2's flags 1x2y3z f1 and f6 (whole on screen: the survey's
  sampling), 2gozcj f0 (an over thread's correct occlusion), f3's rings
  (the dots' cut, as designed) and the survey's one-dot reports (fades
  under about 0.9 world, PROBE NOTES above). LEADING, UNTESTED: (iii) a
  start or exit marker's concentric gap ring (render-gaps.md, marker
  gaps) bites dot 2 when a short stub's dots fall inside it; it fits the
  green crescent, convex to the lower left, in his screenshot
  (`.claude/probes/K459/levi_1339.png`; crops `out/levi_lowerleft.png`,
  `out/levi_sliver8.png`). No surveyed state put a dot inside a ring.
  Next: walk to a stub ending near a marker, reject the marker's gap
  slot on that state and diff. Also untested: (i) the cut's cover past
  the fade's end (strength 0.45) or an arc-frame mismatch between the
  cut and the thread; (ii) the joint gate, a fan or an arm strip at an
  unvisited junction drawing over a dot. Notes:
  `.claude/probes/K459/notes.md`.

## THE ENDS (K466, 2026-10-15)

Levi (15:49): "Also, we should do something to emphasize the unexplored
thread ends a bit more, maybe especially for ends that lie under a
crossing". Brief, results and handoff: `docs/design/K466.md`. Binding:
K423's "always two beacon dots, sized to fit the fade" and K397 stage
2's "Cap and two dots is good", so the cap and the dots (THE DOTS,
above) are untouched. Params: gameplay-links.md's REVEAL END PARAMS;
rows: gameplay-panel.md's EXPLORATION ROWS.

- THE CASES (`.claude/probes/K466/cases.mjs`, `out_cases.log`; the
  phone's 411x753 at 2.625, `?<seed>&xp=threads&am=instant&snd=none&
  fw=0`, 12 moves): 37 frontiers on 2gozcj (13), k397a (3), 1x2y3z (9)
  and bead5 (12). 22 fades lie partly under an over thread's casing, 7
  of them under a VISIBLE over pass that covers part of the end: 1x2y3z
  f0 (chain 19: the cap and both dots), f5 (chain 48: the cap and dot 1)
  and f6 (chain 48: dot 2); bead5 f0 (chain 2: dot 2), f1 (chain 2), f6
  (chain 58) and f11 (chain 90), the last three whole. The other 15 lie
  under HIDDEN over threads, which the gap gate draws as empty space, so
  they show whole until that thread is revealed (2gozcj's 6 and k397a's
  2 are all of this kind).
- THE CANDIDATES (brief item 2): A, a stronger end (`rvg=bright`); B,
  the end moved out from under the crossing, pushed past it (`rve=past`)
  or pulled back before it (`rve=back`); C, the end drawn through the
  over thread: NOT BUILT, since it needs shader text and every explore
  variant would then compile cold (render-shaders.md).
- A SHIPS, THE BRIGHT HALO (`drawFrontierMarks`, `styleHalos`; the halo
  and beacon looks only, `exploreLookHasHalo`): the halo at each
  frontier fade's middle grows from max(1.8, 3.8 tw) to
  max(HALO_BRIGHT_MIN 2.4, HALO_BRIGHT_D 5.2 tw) world across and
  breathes 0.75 to 1 (soft: 0.6 to 0.85) over the same HALO_BREATH_S
  2.5 s, tinted HALO_BRIGHT_TINT 0xd8f2ff (soft 0xa8e4ff). Reduced
  motion holds HALO_BRIGHT_STILL 0.9 (soft 0.8); High contrast draws it
  at 1 in white either way, the bright one larger. Sprites only: no
  shader text and no declaration change, so the pieces, the cap and the
  dots are master's (the sheet: A's frontiers match under + soft's on
  all four seeds, in count, flags and fade length to 3 decimals); a
  translucent dot's pixels change only by the brighter halo beneath it.
  WHY A: it marks every end, not only those under crossings; the halo
  lies beneath the weave, so where an over thread covers an end the halo
  still shows around that thread (seen once, in the A/B below: a halo
  crossed by an over thread lit on both sides of it); and it moves
  nothing, so it shows no unexplored thread.
- B, THE END MOVES (CPU only; off by default). THE STRETCHES:
  `ribbon/crossing_gaps.ts` pushes `[slot, underCenter, allNeg,
  allPos]` into `r.chainCuts` per under chain, beside chainWins: the arc
  that every lane of the over pass's casing covers, shown or not (an end
  must not move again when its over thread is revealed).
  `ribbons.underCutCtrls(chain, pad, shownOnly)` returns them as
  unwrapped chain ctrls grown by `pad` world of arc at each end. The
  fabric's `exploreKeepOut` pads by `ribbons.fadeLength + 0.25 tw`,
  caches each chain's stretches until the explore state moves (`koKey`:
  restart, refogs, seen vertices, runs and partials), so the flow's
  wobble cannot flip an end across a crossing, and passes `keepOut` to
  the model only when rve is not under.
- B, THE MODEL (`explore_view.ts`; `ExploreKeepOut {spans, ring,
  mode}`): `stub()` moves the end of a stub out of a visited end that a
  caught dot does not extend (p = 0) and that has a fade. It takes the
  FULLY GROWN stub's plain fade [eF - fF, eF] (lattice units from the
  near end; the run's stretches over every ring lap, `keepOutA`) and
  moves it with `endPushPast` (beyond each stretch it overlaps, up to
  the limit) or `endPullBack` (before them, down to the near web domain
  d0): the mode's way first, then the other, then the plain end. The
  past limit is the far junction's web domain (L - dF), and with the far
  end visited also the middle of the gap between the two grown plain
  tips (0.5 (eF + L - eFar)), so two stubs never pass each other. No
  move when the two grown reaches already make the run whole (`meets`).
  The move scales with the arm's growth (`gp`), so a growing arm reaches
  the moved end continuously; the fade keeps its length.
- ONE CROSSING AT MOST (`END_MOVE_STEPS` 1). The first sheet, at 32
  steps, chained pushes past up to three crossings (the fade plus the
  casing and the pads fill most of the room between two): 1x2y3z f5, f6
  and f7 moved 5.28, 4.67 and 7.6 ctrl and 2gozcj f12 3.7, up to about
  3.9 lattice units of unexplored thread shown; back mostly failed and
  fell back to past.
- THE SHEETS (`.claude/probes/K466/sheet.mjs`; `sheet/<seed>.png`,
  `sheet/full/`, `sheet/key.txt`; `out_sheet.log` at 32 steps,
  `out_sheet2.log` at 1; the cases' walks; columns under + soft (master's
  look), A = under + bright, Bpast, Bback, BA = past + bright; no context
  loss). At one step: ends under a visible over 7 -> 4 (1x2y3z 3 -> 2,
  bead5 4 -> 2) and under any over 22 -> 15 (2gozcj 6 -> 3, k397a
  2 -> 1, 1x2y3z 6 -> 5, bead5 8 -> 6), past and back alike. Moves:
  2gozcj f4, f5, f7 and f12 1.7 to 3.7 ctrl past (back failed on all
  four); k397a f1 0.22 back (past failed); 1x2y3z f6 4.67 past or 0.13
  back (dot 2 clear either way); bead5 f0 4.33 past or 0.59 back, f11
  2.39 past. NOT MOVED, not diagnosed: 1x2y3z f5, bead5 f1 and f6
  (inferred: neither way fits, past beyond its limit and back below d0).
  1x2y3z f0 moved 3.27 ctrl and the survey still flags its cap and dots
  under a visible over: either the survey's test is wider than the
  padded stretch or chain 19's stretches miss that crossing; not
  checked. key.txt's stamp reads d55b335: a dev server's stamp is the
  SHA at its start (vite.config.ts defines it at config load), not the
  source it serves.
- MODE OFF, THE A/B (K290's `k290_ab.mjs` same-state A/B, desktop
  1400x900, master d3fc17d against 001e8ca as two `vite preview` builds,
  link `k111&am=instant&snd=none&fw=0&phy=0`, under the perf lock;
  `.claude/probes/K466/out_ab_soft.log`, `out_ab_default.log`, `ab/`).
  With `&rvg=soft`, 31 of 31 at 0 px: mode off at four pulse phases, mode
  on at two, on then off, a hovered choice, A/A floors 0 px, no page
  errors, context loss or GL warnings. At the defaults, 29 of 31: every
  mode-off frame 0 px, and mode on differs by 33620 px (max delta 50) at
  both phases. `ab/blobs.mjs` puts every differing pixel in the three
  frontier halos (two overlapping at the head's stubs, one split in two
  by an over thread drawn above it, plus four 1-delta pixels at a halo's
  fringe; `out_ab_blobs.log`), the ribbons and the marker at 0
  (`ab/crop3.mjs`; `ab/out_default/crop_blob1.png`, `crop_blob23.png`).
  No shader or GLSL file changed, so no program compiles cold.
- PROBE HOOK: `__knotExplore({endCross, endGlow})` writes the params
  (the frame loop syncs them), alone or with `on`.
- TESTS: explore_view.test.ts "explore view (K466): the ends kept out
  from under crossings" (12: the two movers, one crossing at most, past,
  back, the fallback order, a visited far end's limit, meets, growth
  continuity, ring laps, the mirrored far end, caught and untouched
  stubs unchanged); url_codec.test.ts "reads the reveal's end params
  from rve and rvg".
- RESIDUALS (K466's handoff): past and back show unexplored thread (up
  to 4.67 ctrl on the sheet, one crossing); the cached stretches can go
  stale after a tug, the load settle or a Replay settle until the next
  arrival, and an end may jump then; the pad may double-count if the
  casing's cover already includes the gap's fade (unchecked).
