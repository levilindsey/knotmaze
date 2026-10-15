# K5 + K6: split main.ts and ribbon_renderer.ts, then one frame loop

Design for K5 (split `src/main.ts` and `src/render/ribbon_renderer.ts`
along the data lines that K1-K3 drew) and K6 (one frame loop driven by
what-changed flags, which includes K24's render on demand). Docs only:
this round changed no code.

Written 2026-10-15 by agent `agent-aa60ed52201f75682` of claude session
d8031183. **Line numbers are from master `f04aa4b`** (K7 stage 4 merged).
K7 stage 5 is editing main.ts now, so stage 1 begins with a re-map.

## Summary

- `main.ts` (5,637 lines) is one `async function main()` closure, running
  from line 359 to the end of the file, with 108 `let`s. It becomes
  `src/app/` (about 18 modules), and `main.ts` shrinks to about 400 lines
  that build those modules in order.
- `ribbon_renderer.ts` (7,000 lines) is one class. Its largest method,
  `rebuildFillets`, is 1,515 lines. It becomes `src/render/ribbon/`, nine
  parts behind an unchanged `RibbonRenderer` façade. Neither importer
  (`main.ts`, `fabric_maze_renderer.ts`) changes a line.
- Every stage is a pure move, one module per commit. Each commit carries
  an "old place → new place" map. Each stage is checked by git's
  moved-code view, `npm test`, a same-state pixel A/B and, where a hot
  path moves, a frame-time check under the perf lock.
- Three renderer parts are the G3/G4 swap points:
  - `crossing_gaps.ts` (G3-1);
  - `strip_pass.ts` (G3-2);
  - `joinery.ts` (G4-1).

  Each G stage then adds a sibling file behind the same interface, and
  G3-3 and G4-2 delete a whole file instead of carving it out.
- K6 has two kinds of flag:
  - events push `loop.invalidate(flag)`;
  - animators answer `needsFrame()` at the end of every frame.

  The loop skips the geometry pass, then the draw, and finally stops
  requestAnimationFrame (rAF) once everything is quiet.
- K6 does not strictly need K5. It needs the frame loop out of main.ts
  (stage M3) to stay a small diff. Run it after the main.ts stages.
- At defaults the fabric never idles: pulses, flow and the fog all
  animate. K24's full stop helps only static scenes. At defaults, the
  battery lever is a rest cadence, which is Levi's call (question 1).

## 1. The map

### 1.1 main.ts by region (f04aa4b)

| ID | Lines | Region | Owns | Reads | Writes outside itself |
|---|---|---|---|---|---|
| M1 | 1-168 | imports | - | - | - |
| M2 | 170-355 | module constants (BACKGROUND, FIT_MARGIN, BUILD_STAMP 179, storage keys 182-187, MAX_ZOOM, FOLLOW_*, CAM_*, PRESETTLE_SIM, LOADER_*, NOMINAL_SLEEP_SIM, SETTLE_WALL_CAP_MS, TAP_*, RUN_REACH, LOBE_REACH, MUSIC_LOOKAHEAD); `createLoader()` 247-355 (pure DOM) | constants | - | - |
| M3 | 357-490 | boot: `app` (357), `main()` (359), motion, contrast, a11y, hcl, `app.init` (391), the canvas, dailyStore + parseLaunch, `look` (424, `effectiveParam(params, a11y, key)`), daily state, undo, writeParams, prefs, PanelSettings | app, params, look, motion, a11y, dailyStore, undo, settings | URL, localStorage | - |
| M4 | 493-530 | synth, snore, background (`addChild` 513), root, ripples, confetti | the layers | settings, motion | `app.stage` |
| M5 | 539-640 | scene state: host (539: `params.physicsWorker ? new WorkerHost(() => rebuild()) : new InThreadHost()`), ps, renderer, debug, walkGraph, fabric, chase, turnMino, fabricController, reveal; physState (`live` / `loading` / `settling` / `frozen`), settleWall0, frozenSig, loaderShownAt, physicsTuning, physSig (609), physicsLive, loader, the audio map | the scene `let`s (rebuild reassigns them) | params | - |
| M6 | 642-1026 | camera: computeFitTarget, view and cam, follow, the tween, the panel tween, clampView, easeView, applyView 808, zoomAt 875, panBy 886, resetCamera 892, updateCamera 949, fitToScreen 1026 | view, cam, follow and tween state | bounds from renderer and fabric, the head, panel open, settings | root's transform |
| M7 | 1042-1250 | load and settle (K147): startAppearance, beginLoading, loadingTick, finishLoading, replaySettle, ink and gamut, beginSettle 1162, presettleTick 1191, finishPresettle 1230 | physState's transitions, the loader | host, reveal, params | renderer (beginReveal), background (the hold) |
| M8 | 1250-1560 | scene build: syncBackground, recolorScene, rebuild 1315-1457; the audio map (rebuildAudioMap, runForCtrl, freqForCtrl, pluckUnit) | every M5 `let` | params, look | everything in M5 |
| M9 | 1562-1926 | panel: the buildPanel callbacks (about 285 lines; `renderDirty = true` at 1818 and 1865), applyAccessibility 1846, handRendererLook 1887, resize 1919 | - | params, look, settings | params, renderDirty, the renderer's look fields, rebuild |
| M10 | 1927-1993 | picking (pickRadius 1942, onThread 1955, grabAt 1965, grabRadius 1980) | - | renderer.pickThread, fabric, view | - |
| M11 | 1993-3270 | game session, about 1,280 lines: attempts, HUD, badges, indicators 2105-2376, saves, visibility, prefs, the daily, win/loss/confetti, chase 2779-2921, turn minotaur 2922-3017, share/stats/playDaily, undo/redo, autosave, handleFabricTap 3189, moveAlong 3225 | attempt and daily state, HUD, badge, indicators | fabricController, walkGraph, fabric, dailyStore | fabric paint, params (playDaily), rebuild |
| M12 | 3270-3635 | key moves (K120) | key state, holds | walkGraph, fabricController | moves (M11) |
| M13 | 3635-4318 | pointer, drag and pluck input: soft snap, pinch, the canvas listeners, triggerAutoPluck, autoAudioTick | drag, pinch, soft snap | picking, view | the host (drag and tug, through the host), camera, renderer.pluck, synth |
| M14 | 4318-4734 | the frame loop: flowParity, halted, renderDirty (4333), wake 4334, startSettling 4340, freeze 4345, applyPhysicsMode 4355, physicsInputsChanged 4368, the cost rings, sceneAnimating 4391-4422, backgroundTick, `app.ticker.add` 4432-4449, tick 4451-4734 | renderDirty, halted, flowParity | everything | everything, each frame |
| M15 | 4736-4766 | stamp and perf readout (probes read sim/wall from it) | the stamp | host stats, the cost rings | DOM |
| M16 | 4774-5637 | probe hooks `window.__knot*`, about 860 lines (`renderDirty = true` at 4903, 4908, 5619; `__knotRenderer` 4946; a `needsFrame` read at 5465) | - | everything | renderDirty, params, the physics (through the host) |

References inside `main()`, which show how the modules will couple:
params 304, fabric 229, fabricController 132, renderer 120, ps 89,
root 87, app 78, chase 77, host 71, view 64, reveal 58, look 52,
panel 52, turnMino 49, motion 45, walkGraph 41, background 38, wake 34,
physState 32, cam 32, rebuild 27, settings 25, writeParams 23,
dailyStore 21, synth 20, indicators 17, renderDirty 11.

### 1.2 The frame today (M14)

The frame matters to both K5's M3 stage and K6.

`app.init` (391) passes no `autoStart`, so Pixi's ticker starts at once
and renders the stage on every requestAnimationFrame (Pixi's
TickerPlugin adds `app.render` at LOW priority). `app.ticker.add`
(4432-4449) runs, in order:
1. `tick`;
2. `ripples.tick`;
3. `confetti.tick`;
4. `backgroundTick`, which is `background.tick(dt, sceneWasAnimating)`;
5. the cost rings.

Then Pixi draws.

`tick()` (4451-4734):
1. The loading branch, then the simSpeed multiplier.
2. The reveal ticks on wall time.
3. `renderer.advanceClocks(dt)` runs every frame, before any `update()`.
4. Helpers:
   - **fabricTick** runs, in order:
     - autoAudioTick, handRendererLook and the pluck params;
     - then, in fabric mode: the params sync, syncExploration, tickFog,
       tickExplore, either tickChase or (tickAnim + tickTurnMino),
       keyStep, the pendingWin/pendingLoss banners and drawFire;
     - then movePad.setShown, `renderer.tickPaint`,
       `renderer.tickPlucks`, `updateCamera(camDt)` and
       `indicators.update`.
   - **flowRender(force)** returns early when `!force && flow <= 0 &&
     !revealing && !needsFxRender`. Otherwise it runs handRendererLook,
     `renderer.update()` and `fabric.update()`.
   - **restFrame** toggles flowParity, which gives half-rate flow at rest
     and full rate while revealing or while FX run. Then it calls
     fabricTick and updateStamp.
5. The branches, in order:
   1. frozen → restFrame;
   2. paused → flowRender + fabricTick;
   3. the soft snap (`host.dragTo` / `release`);
   4. asleep → restFrame.
6. The awake path:
   1. `host.frame(requestDt, physicsTuning(), t0, physState === "live",
      params.settleBudget)`, which sets `halted` if the result is not
      finite;
   2. handRendererLook, `renderer.update()`, `renderDirty = false`,
      `fabric.update()`, fabricTick;
   3. `host.gateFrame(settling)`: a freeze if the gate trips while
      settling. Then the SETTLE_WALL_CAP_MS freeze, the perf counters and
      updateStamp.

So at rest, every frame still runs:
- the clocks;
- every fabricTick part;
- the camera spring;
- the indicators;
- a full draw.

With flow on, the geometry pass runs at half rate.

`sceneAnimating()` (4391-4422) is K21's stand-in for K6's flags. Its only
reader is `backgroundTick`. It returns true when any of these holds:
- the view moved;
- confetti or ripples run;
- `fabric.webFading`;
- physState is loading or settling, or `!host.asleep`;
- flowStrength > 0, or the reveal runs;
- `needsFxRender()`, or plucks are active.

In fabric mode it is **always** true, so the background drift never
pauses there.

### 1.3 ribbon_renderer.ts by region (f04aa4b)

| ID | Lines | Region | Owns | Notes |
|---|---|---|---|---|
| R0 | 1-735 | module level: imports; exported RibbonStyle, PaintSpan, PulseArm, PaintCap, PaintRim (158-253); constants 254-392 (pluck keys, FILLET_*, DISC, normArc, FLOW_*, FX, GATE_LEAD, RAINBOW_SWELL_END); the strip program 393-585 (SECTION_VERT/FRAG 408-534, sectionShader 539, sectionShaderExplore 567); samePieces 586; **bindGap 610, the one binding list**; gap-solver constants 620-718; hslToHex; PassNeighbors | programs, the bind list | K307 stage 2 registers the program sites (535/563) |
| R1 | 736-1383 | 139 fields (736-1135, 114 of them `private`; getters stripStats, stripRT, stripTableData 1101-1107); the constructor (1136-1383; `rebuildFillets(true)` at 1158; installs the `__knotSplineBend` probe hook) | all state | the constructor takes `(ps, style)` |
| R2 | 1384-1645 | sampling helpers: knotChainRgb, sampleAt, buildPoly, polyDist, protectReach, arcAt, renderCtrl, neighborGaps | - | pure reads of samples and passes |
| R3 | 1646-1742 | small API: getDiag, requestInspect, setWidths, flowOffset, arcForCtrl, underGapVisibility | - | - |
| R4 | 1743-2452 | reveal and appearance FX: beginReveal, syncFxStyle, addKnot, revealMulAtCtrl, revealShape, chainFxDone, passShowTime, jointGate, crossingShowTime, gateStrength, widthMulFor, finishReveal, drawRevealTips, appearFxAlive, probeTris, paintMirror 2204, revealPin, tickAppearFx, spawnTipFrontier, spawnInkFrontier | reveal state, appear FX | - |
| R5 | 2453-2616 | **`update()`, the geometry pass** (order below) | geomRev, updateCount | the pipeline |
| R6 | 2617-3529 | crossing gaps (K1): twinNeighbor, computeGapSlot 2636-3304 (about 670 lines), renderEmergent, renderMarkerGaps, assignGapIds | writes the slot table and underWindows | - |
| R7 | 3530-3635 | section colors: setSectionRuns, installRuns, syncSectionUniforms, recolor | section runs | - |
| R8 | 3636-3876 | gameplay paint: noiseV, armNextJointCtrl, setPaint, setRim, setRimAt, rimItemKey, syncRimItem, rimGap, routeArmSlot, resolveRoutes, `tickPaint` 3856 | spans, rim, routes | - |
| R9 | 3877-4009 | picking: pickThread, ctrlAtArc | - | - |
| R10 | 4010-4385 | plucks (K3): pluck, pluckPoint, arcOfPluck, tugSpan, tickPlucks, makePluckHost 4147, withPluckCollapse, reextrude 4201, pluckColor, composedAtArc, pluckNodes | plucks | the pluck host interface (G3 invariant 21) |
| R11 | 4386-4669 | clocks and paint items: `needsFxRender` 4386, `advanceClocks` 4402, `tickPaintPalette` 4443 (pulse uniforms, hover breath, syncRimItem, the key-gated `rebuildFillets()`, tickWebFade), fadingArmLevels, tickWebFade, syncGold, writePaintItems 4529 | paintClock, pulseBorn, FX uniforms | probes pin `advanceClocks`, `paintClock`, `pulseBorn` |
| R12 | 4670-4987 | thread reveal (K76, K268): setExplore, applyExploreGaps, exploreCutAt, exploreGapState, syncExploreJoints, exploreJointsKey, exploreJointShown, exploreJointState, exploreOn, exploreVisAt, exploreShownAt, exploreShownSpan | explore state | K268 stage 2 works here now |
| R13 | 4988-5067 | tuckFusedTips, setMarkerOccluders, markerWorld, sectionColorAt | - | - |
| R14 | 5068-5477 | material lookups and arm strips: paintArcAt, cpuChainMaterial, writeStripRow, cpuStripAt, **cpuJunctionField** 5184-5395, sampleAtSafe, colorAtArc, armCtrlSlope, sectionAtArc | the arm strips | - |
| R15 | 5478-6993 | **`rebuildFillets`, one 1,515-line method**. Phases: layer votes; writeAxis records; discs; profiles; junction records; K81 routes; armTop and dives; jointMask; emitFan; free tips; fused tips; finish and upload; armReach; route geometry (coverCap, cornerCubic, turnFits); wedges per record (6685); the route pass and cover strips (6890) | fillet caches, fan meshes, the junction field | G4-2 deletes most of it |
| R16 | 6994-7000 | destroy | - | - |

What `update()` (R5) does, in order:
1. updateCount++, geomRev++, `underWindows.clear()`, finishReveal;
2. flowOffset, sampleClosedSpline / sampleOpenSpline, tuckFusedTips,
   `paintScene.writeGeom`, chainFxDone, widthMulFor and
   withPluckCollapse (which also update the fills);
3. the gates (renderCtrl, passShowTime), `gaps.clearSlot`,
   computeGapSlot, gateStrength;
4. renderEmergent, renderMarkerGaps, assignGapIds, applyExploreGaps;
5. `gaps.upload`, `paintScene.flushGeom`, drawRevealTips.

`this.ps` (the physics view, read-only since K7 and main's mirror under
the worker) is read about 90 times, spread over every region. The
renderer reads the physics **view**, never writes it, and modules keep
that.

Importers:
- `main.ts` uses about 37 names: plucks, pluck, update, beginReveal,
  pickThread, markerWorld, needsFxRender, tugSpan, setWidths,
  requestInspect, the look fields, updateCount, exploreOn, getDiag,
  appearFx / appearFxAlive, tickPlucks, tickPaint, setSectionRuns,
  root, revealMulAtCtrl, destroy, pluckPoint, exploreVisAt, flowOffset,
  recolor and advanceClocks.
- `fabric_maze_renderer.ts` (a type import plus its `ribbons` field)
  uses: setPaint, markerWorld, exploreVisAt, sectionColorAt, setExplore,
  setRim, setRimAt, arcForCtrl, cuspRadius, exploreGapState, exploreOn,
  exploreShownAt, flowOffset, setMarkerOccluders, underGapVisibility and
  webFade.
- **Probes** reach in through `__knotRenderer()`. They read, write and
  patch fields and methods by name: `advanceClocks`, `paintClock`,
  `pulseBorn`, `paintDebug`, `filletMesh` / `filletTopMesh`,
  `chainSamples`, `fieldProbe`, `maskEnabled`, `gapMode`, `smoothMin`,
  `protect`, `tipDiscScale`, `paintKey`, `paintSpans` and more. They are
  the third importer, and the strictest one (section 2.3).

### 1.4 The data lines K1-K3 drew

- **K1 (G1 per-pixel gaps, 99443cb/0f25f0f):**
  - the gap solve (R6, R12) writes a page-lifetime RGBA32F slot table
    and `underWindows`;
  - the shader reads the table through `bindGap`'s one list;
  - plucks and joinery read `underWindows`.

  The solve's only outputs are the table and the windows.
- **K2 (kink eye ratchet, 9920fab):** the change is inside the physics.
  For K5 its line is the K7 one: physics state lives behind the host,
  main reads the view, and every write goes through the host (guarded by
  `test/physics/host_seam.test.ts`).
- **K3 (render-only plucks and physics-off mode, df373b5):**
  - a pluck is an overlay with its own host (`makePluckHost`); the base
    ribbon only collapses (`withPluckCollapse`);
  - with physics off, the renderer works from frozen samples.

  The pluck host's interface is the line.
- **The hub is the samples.** `update()` turns the physics view into
  spline samples. Every consumer reads them: the strips, the gaps, the
  explore gaps, the paint (G2's KGEOM rows), the plucks and the joinery.
  G3-0 (running) adds the GPU copy of the hub (`samp_table.ts`). G3 and
  G4 then swap each consumer for a GPU version, one at a time. The split
  follows that: one part per consumer, with the hub on the façade.

In main.ts the lines are:
- URL state (params, look) → scene build (rebuild) → host → renderer and
  fabric → frame;
- game state (controller, chase, daily) → fabric paint;
- input → host, camera and moves.

## 2. Target modules

### 2.1 Rules for every move

- **Pure moves.** No logic edits, renames or reformatting, except the
  mechanical edits listed per file below. Each commit is checked with
  `git show --color-moved=plain --color-moved-ws=allow-indentation-change`:
  every line is either shown as moved or is one of the listed edits.
- **One module per commit.** The message carries the map, for example:

  ```
  K5 M2: the camera moves to src/app/camera.ts

  Old place -> new place (f04aa4b..<base> line numbers, pure move):
    main.ts 188-203 (MAX_ZOOM, FOLLOW_*, CAM_*)        -> camera.ts top
    main.ts 642-1026 (computeFitTarget .. fitToScreen) -> createCamera()
  Non-move edits: imports; CameraDeps; renderer -> scene.renderer (n);
  main.ts destructures createCamera()'s functions under their old names.
  ```

- **Behavior-neutral**, proven by the checks in 5.1.
- **Lore follows code.** When a region moves, every `.claude/rules/` file
  whose lore covers it gets the new file in its `paths:`. To find them,
  grep the rules for the region's function names. `docs/lore_index.md`
  gets the matching rows in the same commit.

  Today:
  - `src/main.ts` is in `gameplay.md` and `gameplay-camera.md`;
  - `ribbon_renderer.ts` is in `render-gaps.md`, `render-ribbon.md` and
    `render-shaders.md`;
  - `render.md` takes `src/render/**`, and `gameplay.md` takes
    `src/ui/**`.

### 2.2 main.ts → `src/app/`

**Mechanism.** `main()` is a closure, so moved code captures names from
it. There are three kinds of capture:

1. **Assigned once** (app, look, motion, settings, panel, synth,
   background, dailyStore, root, and `params` if the re-map confirms
   nothing reassigns it). The module's factory takes these as
   `deps`, directly.
2. **Reassigned by rebuild or a mode switch** (ps, renderer, debug,
   walkGraph, fabric, chase, turnMino, fabricController, reveal, the
   host if `phw` can switch it live). These are read through **one
   `SceneRef`**, an object of getters defined once in main.ts:
   `const scene: SceneRef = { get renderer() { return renderer; }, ... }`.
   Moved code says `scene.renderer`. **Never destructure a SceneRef or
   cache one of its values.** The getter keeps moved code reading the
   current value, as the closure did.
3. **Written by several regions** (renderDirty, physState, halted). The
   owner module keeps the variable and exports a method: `renderDirty =
   true` becomes `loop.invalidate()`, and `physState = "frozen"` becomes
   `life.freeze()`. Until the owner has moved, main.ts passes a closure,
   for example `invalidate: () => { renderDirty = true; }`.

**Method, per module.**
1. Cut the block into `export function createX(deps: XDeps, scene:
   SceneRef) { ...moved code...; return { ... } }`.
2. Run `npx tsc --noEmit`. Each "Cannot find name" is a capture: add it
   to deps (kind 1), prefix it with `scene.` (kind 2), or route it
   through its owner (kind 3).
3. main.ts destructures the returned functions under their **old names**
   (`const { applyView, zoomAt, panBy, ... } = camera;`), so no other
   line of main.ts changes.
4. A `let` the module now owns that main.ts still reads goes through a
   getter on the returned object. A mutated-in-place object (for
   example `view`, if it is one) can be handed back directly.

| Module | From (f04aa4b) | Owns | Exports | Takes |
|---|---|---|---|---|
| `src/ui/loader.ts` | 242-355 | the trefoil DOM | `createLoader()` | - |
| `src/app/stamp.ts` | 173-183 (BUILD_STAMP, STATS_KEY, MAZE_STATS_KEY), 4736-4766, and the cost rings if only perf code uses them | stamp, perf rings | `BUILD_STAMP`, `createStamp()` → update, the rings | host, settings, scene |
| `src/app/probe_hooks.ts` | 4774-5637 | none (it installs `window.__knot*`) | `installProbeHooks(ctx: ProbeCtx)` | everything, through ctx |
| `src/app/camera.ts` | 188-203, 642-1026, plus startCamTween and frameWorld wherever they sit | view, cam, follow, tweens | applyView, zoomAt, panBy, resetCamera, updateCamera(dt), fitToScreen, startCamTween, frameWorld, `converged()` (new in K6) | app, root, settings, scene |
| `src/app/frame_loop.ts` | 4318-4339 and 4391-4734 (flowParity, halted, renderDirty, wake, sceneAnimating, backgroundTick, the ticker callback, tick) | renderDirty (→ invalidate), halted, flowParity | `invalidate()`, `wake()`, `start()`, `sceneAnimating()` (until K6) | every module, as deps |
| `src/app/lifecycle.ts` | 205-226, 1042-1250, 4340-4390 (startSettling, freeze, applyPhysicsMode, physicsInputsChanged), physState and its siblings from M5 | physState, settleWall0, frozenSig, loaderShownAt, physSig, physicsLive | beginLoading, loadingTick, finishLoading, replaySettle, beginSettle, presettleTick, finishPresettle, startSettling, freeze, applyPhysicsMode, physicsInputsChanged, `state` | host, reveal, loader, background, scene |
| `src/app/scene.ts` | 539-640 (the scene `let`s), 1250-1457 (syncBackground, recolorScene, rebuild) | the scene `let`s, the SceneRef | `createScene()` → SceneRef, rebuild, recolorScene, syncBackground | params, look, app, root |
| `src/app/audio_map.ts` | 1458-1560 | the audio map | rebuildAudioMap, runForCtrl, freqForCtrl, pluckUnit | scene, synth, params |
| `src/app/panel_wiring.ts` | 1562-1926 | - | `wirePanel()` → applyAccessibility, handRendererLook, resize | params, settings, scene, invalidate, rebuild |
| `src/app/input_pointer.ts` | 1927-1993 (picking), 3635-4318 minus auto audio | drag, pinch, soft snap, pending tap | `attachPointerInput()` → softSnapStep (for the frame), grabAt, pickRadius | camera, the host, scene, session (handleFabricTap) |
| `src/app/auto_audio.ts` | triggerAutoPluck, autoAudioTick (in 3635-4318) | music mode's schedule | autoAudioTick(dt), triggerAutoPluck | synth, scene, audio map |
| `src/app/input_keys.ts` | 3270-3635 | key state, holds | `attachKeyMoves()` → keyStep(dt) | session moves, scene |
| `src/app/session/daily_session.ts` | M11: attempts, saves, visibility, prefs, the daily, share/stats/playDaily, autosave | attempt and daily state | (re-mapped in M7) | dailyStore, scene, hud |
| `src/app/session/hud_wiring.ts` | M11: HUD, badges, win/loss banners, confetti trigger | HUD, badge, banners | - | - |
| `src/app/session/indicators_wiring.ts` | 2105-2376 | indicators | update | camera, scene |
| `src/app/session/chase_wiring.ts` | 2779-3017 (chase, turn minotaur) | chase timers | tickChase etc. | scene, hud |
| `src/app/session/design_history.ts` | M11: undo/redo | the undo stack's wiring | - | undo, params, rebuild |
| `src/app/session/fabric_moves.ts` | 3189-3270 (handleFabricTap, moveAlong) | - | handleFabricTap, moveAlong | scene, session |
| `src/app/boot.ts` | 359-530 | the boot order | `boot()` → the singletons | - |

End state: `main.ts` imports, calls `boot()`, creates scene, camera,
lifecycle, panel, session, input, loop and probe hooks in order, and
starts the loop. That is under about 400 lines. An optional last step
folds the SceneRef getters into a `SceneState` object owned by
`scene.ts`, so main.ts keeps no `let`s at all. That step is not needed
for anything below.

The M11 session ranges other than chase, indicators and the two move
functions are approximate. Stage M7 re-maps them first.

### 2.3 ribbon_renderer.ts → `src/render/ribbon/`

**The façade stays.** `RibbonRenderer` keeps its name, file, constructor
and public API. It also keeps the **shared scene fields**:
- the samples and controls;
- passInfo and neighbors;
- geomRev, updateCount and underWindows;
- flow, the widths and look;
- the containers;
- `ps`, the read-only view.

It becomes the hub. `update()` stays on it as the pipeline that calls
the parts in order.

**Parts.** Each part is a class the façade constructs with `(r:
RibbonRenderer)`, or a set of functions taking `r` where the part has no
state of its own. A part owns the fields **only it** uses. Moved methods
keep their bodies, with `this.x` becoming `this.r.x` (or `r.x`) for
shared fields. A public method that moves leaves a one-line delegation
on the façade. Parts use `import type { RibbonRenderer }`, which is a
type-only cycle and fine in TypeScript.

**`private`.** Parts cannot read `private` members. A shared field that
a part reads drops `private` and gets an `/** @internal ribbon */` tag
(about 60 to 100 of the 114). The alternative is a separate RibbonScene
object, which would rewrite every `this.x` in the class to `this.s.x`,
a global edit that conflicts with every renderer item in flight
(question 7).

**The probe surface stays on the façade.** Every field or method that a
probe reads, writes or patches stays reachable on the instance under the
same name, with the same effect. Concretely:
- fields probes touch stay on the façade, or become get/set accessors
  that forward to the part;
- methods probes patch (`r.advanceClocks = () => {}`) stay façade
  methods that the frame calls **through the instance**. A part may not
  call another part's copy directly where a probe patches the façade's.

R1 builds the inventory first: `__knotRenderer()` and `renderer.` uses
under the main checkout's `.claude/probes/**`, `scripts/**` and
`test/**`. Breaking the K83 A/B recipe (`paintClock`, `pulseBorn`) would
break the very check that proves the move.

**A helper moves with its only calling region.** A helper with callers
in two parts goes to `sampling.ts` if it is a pure read, and otherwise
stays on the façade.

| Part | From (f04aa4b) | Owns | Interface | G role |
|---|---|---|---|---|
| `ribbon/ribbon_shader.ts` | 393-618 (the strip program, sectionShader, sectionShaderExplore, samePieces, bindGap) | the strip program, the bind list | sectionShader, sectionShaderExplore, bindGap | G3-1 extends bindGap; G3-3 deletes the strip program |
| `ribbon/sampling.ts` | 1384-1645, plus paintArcAt, sampleAtSafe (R14) and arcForCtrl (R3) if their callers allow | none (functions of `r`) | sampleAt, sampleAtSafe, buildPoly, polyDist, protectReach, arcAt, paintArcAt, renderCtrl, neighborGaps | reads the hub; G3-0's SAMP rows mirror it |
| `ribbon/crossing_gaps.ts` | 620-718, R6 2617-3529 | the solve's scratch, the emergent pool | `GapSource`: `solve(fillHalf, gap)` writes slots and underWindows; renderMarkerGaps; assignGapIds | **G3-1's seam** |
| `ribbon/explore_gaps.ts` | R12 4670-4987 | explore state | setExplore, applyExploreGaps, exploreGapState, exploreVisAt, exploreShownAt, exploreJointState, exploreOn | K268, K290 and K76 2d work here |
| `ribbon/reveal_fx.ts` | R4 1743-2452 (paintMirror and probeTris go with paint if their callers say so) | reveal state, appear FX, the ink frontier | beginReveal, revealMulAtCtrl, revealPin, appearFxAlive, widthMulFor, the gates | - |
| `ribbon/paint_state.ts` | R7 3530-3635, R8 3636-3876, R11 4386-4669 | spans, rim, routes, section runs, the clocks (accessors on the façade for paintClock and pulseBorn) | setPaint, setRim, setRimAt, setSectionRuns, recolor, tickPaint, advanceClocks, needsFxRender, `paintNeedsFrame()` (new in K6) | where K6's paint poll lives |
| `ribbon/pluck_host.ts` | R10 4010-4385 | plucks | pluck, pluckPoint, tugSpan, tickPlucks, makePluckHost, withPluckCollapse, composedAtArc, pluckNodes | invariant 21; G3-2's setCollapse writes radii |
| `ribbon/strip_pass.ts` | the fills extrusion in `update()`, reextrude 4201, R13 4988-5067 (tuckFusedTips, markers) | the fill meshes | `ThreadPass`: extrude(chain), collapse(chain, radii), tuck(), the meshes | **G3-2's seam**; G3-3 deletes this file |
| `ribbon/joinery.ts` | R14 5068-5477 (cpuJunctionField, the arm strips, the material lookups only fans read), R15 5478-6993 | fillet caches, fan meshes, the junction field, arm strips, cover strips | `JointPass`: rebuild(force), the junction-field records | **G4-1's seam**; G4-2 deletes this file |

`rebuildFillets` moves **as one method**, with no phase refactor: G4-2
deletes it, and a refactor would be the riskiest edit in the split for
code with the shortest future. Splitting it into phase functions is
worth doing only if G4 slips past several more fan fixes (question 3).

### 2.4 What does not move

- `fabric_maze_renderer.ts` (about 2,400 lines) is not part of K5. It
  owns K6 polls (fog, fire, the dot, the web fade), and K6 adds
  `fabric.needsFrame()` to it in place.
- `src/physics/` is K7's. K6 adds `host.needsFrame()` (4.4) there after
  K7 stage 5 merges.
- `tweakpane_panel.ts` is not split here.

## 3. Seams for K8 (G3) and K9 (G4)

G3/G4's plan (`G3G4_sdf_geometry.md`, re-based by `K8_stage1.md`):
- G3-0 (running): `samp_table.ts`, FloatRows writes in `update()`,
  captureScene/restoreScene.
- G3-1:
  - the gap row and search GLSL in `gap_mask.ts`;
  - a new `fabric_sdf.ts`;
  - in the renderer: computeGapSlot, renderMarkerGaps and the bindGap
    list.
- G3-2:
  - a new `ribbon_sdf.ts` and the `rp=strip|sdf` switch;
  - the pluck host's setCollapse writes radii;
  - withExplore;
  - one main.ts line.
- G3-3 deletes the strip, RibbonMesh, section-rgb and GAP_VERT.
- G4-0 is the cluster builder, and G4-1 the joint SDF pass
  (`jp=fans|sdf`).
- G4-2 deletes the fans, TriFanMesh, the arm strips, the cover strips,
  the tuck and the junction field.

The parts in 2.3 make each step a module swap:

| G step | Before K5 | After K5 |
|---|---|---|
| G3-0 | FloatRows writes in `update()` | lands before R1, which moves the writes with whichever region holds them |
| G3-1 | edits inside R6 (900 lines in the big file) plus bindGap | edits `crossing_gaps.ts` and `ribbon_shader.ts` only; the GapSource contract (the slot table, underWindows, underGapVisibility) is what every reader already uses |
| G3-2 | threads an `rp` switch through `update()`'s extrusion, reextrude, tuck and the pluck host | adds `ribbon_sdf.ts` implementing `ThreadPass`; the façade picks a pass by `rp` at construction; the pluck host's `collapse` goes to the pass |
| G3-3 | carves the strip out of the class | deletes `strip_pass.ts` and the strip program in `ribbon_shader.ts` |
| G4-1 | threads `jp=fans|sdf` through `rebuildFillets` and tickPaintPalette | adds a `JointPass` beside `joinery.ts` |
| G4-2 | deletes about 2,000 lines from inside the class | deletes `joinery.ts` |

The G3 invariants all keep holding:
- page-lifetime textures;
- bindGap's one list (in `ribbon_shader.ts`);
- underGapVisibility and underWindows stay on the façade;
- the pluck host interface (invariant 21);
- `__knotRenderer()` is G3's only main.ts hook. After M1 that hook lives
  in `src/app/probe_hooks.ts`.

G3-2's one main.ts line (`rp` at construction) lands in `scene.ts`'s
rebuild once M4 has merged, or in main.ts before then.

**Order.** Each R stage only has to precede the G stage that swaps its
part:
- R1 and R2 before G3-1;
- R4 before G3-2;
- R5 before G4-1.

R3 can go anywhere. The R stages therefore interleave with K8 instead of
holding it up as a block (section 6).

## 4. K6: one frame loop driven by flags

### 4.1 Goals

1. Do only the work a frame needs:
   - a geometry pass only when geometry changed;
   - a draw only when something visible changed;
   - no frame at all when nothing animates (K24).
2. Replace `sceneAnimating()` with the same flags, so the background
   pauses exactly when the rest of the scene is still.
3. No visible change while anything moves, and the same frames as today
   whenever a probe asks for them.

### 4.2 Two mechanisms

- **Push**, `loop.invalidate(flag)`, for one-shot events: a param edit,
  rebuild, recolor, resize, wake, tap, camera command, or a WebGL context
  restore. The loop does the matching work at its next frame, starts the
  rAF if it was stopped, and clears the flag.
- **Poll**, `needsFrame()` on each animator, for continuing animation.
  Each animator knows whether it is mid-animation. The loop asks all of
  them at the end of each frame and keeps the union for the next frame.

### 4.3 The flags

| Flag | Set by | Work it asks for | Visual | Clears when |
|---|---|---|---|---|
| LOAD | lifecycle: physState loading or settling, the pre-settle | the whole tick, every frame | yes | finishLoading / finishPresettle |
| PHYS | poll `host.needsFrame()` (new, 4.4); pushed by wake, drag, tug, a physics param | `host.frame` + the geometry pass + `host.gateFrame` | yes | asleep, and the view has reached the last state |
| GEOM | push: today's `renderDirty` sites (panel 1818 and 1865, hooks 4903, 4908 and 5619), applyAccessibility, a look change (handRendererLook made change-detecting), rebuild, recolor, setWidths, resize | one geometry pass (`renderer.update()` + `fabric.update()`) | yes | after the pass |
| FLOW | poll: flowStrength > 0 and Motion not reduced | the geometry pass at the flow cadence (half rate at rest, as today) | yes, ambient | flow off |
| REVEAL | poll: the reveal runs (wall time) | the geometry pass every frame | yes | the reveal ends |
| FX | poll: `renderer.needsFxRender()` (exploreUpdatePending, the rainbow swell, the gate ramp), `appearFxAlive()` | the geometry pass | yes | the tails end |
| PAINT | poll: `renderer.paintNeedsFrame()` (new: pulses live, hover breath, web fade, ring laps, explore halo or clock) and `fabric.needsFrame()` (new: fog drift and fog intro, fire, the dot's move animation, webFading) | the clocks + the draw, no geometry pass | yes; pulses and fog drift are ambient | quiet |
| GAME | poll: the chase or turn minotaur runs, a key hold, pending win/loss banners, the move pad showing or hiding | the game tick + the draw | yes | idle |
| CAMERA | poll `camera.converged()` false (follow spring, tween, panel tween, easeView); push from zoom and pan | updateCamera + indicators + the draw | yes | converged |
| OVERLAY | poll: plucks active, ripples, confetti | their ticks + the draw | yes | done |
| BACKGROUND | poll `background.needsFrame(dt)` (exists: dirty, or a drift frame is due) | backgroundTick + the draw | yes, ambient | not dirty, not drifting |
| AUDIO | poll: music mode's scheduler has notes within MUSIC_LOOKAHEAD (0.3 s) | autoAudioTick only | no | stopped |
| INPUT | push: one capture-phase listener on `window` (pointerdown/move/up, wheel, keydown/up, resize, visibilitychange, focus) | starts the rAF; the region's own handler sets the specific flags | - | - |

Ambient means the scene is moving by itself, not because of the user or
the game: flow, pulses, the fog drift and the background drift.

### 4.4 The physics host and the worker (K7)

- **In-thread host:** `needsFrame()` is `!asleep`. Asleep, today's
  restFrame path is the whole physics cost.
- **Worker host:**
  - the worker steps on allowances main posts each frame;
  - main draws the state at now − D, interpolated between the newest two
    snapshots;
  - `asleep` holds once the newest snapshot says slept and main's inputs
    are acknowledged;
  - asleep, the worker posts nothing and discards allowances (K7 design,
    sections 4-5).

  So stopping the rAF while the worker sleeps loses nothing. One catch:
  when `asleep` flips, the picture may still be up to D behind the
  newest snapshot. `needsFrame()` must stay true until the interpolated
  view has reached it, or the last D of the settle never reaches the
  screen. K6-1 reads WorkerHost and adds whatever `asleep` lacks.
- **Wake:** input → `host.wake()` / `dragTo` / tug → push PHYS → the
  rAF starts → `host.frame` posts allowances again.
- K7's design (section 4) stands: "the worker needs nothing from K6; K24
  reads `host.asleep`". K6 adds one method to the PhysicsHost interface
  and changes nothing in the worker.

### 4.5 The background (K21, K24)

- `background.tick(dt, sceneActive)` gets K6's **precise** sceneActive:
  any visual flag other than BACKGROUND. The drift then pauses after
  BACKGROUND_PAUSE_GRACE (2.5 s) of a still scene, as K21 designed.
  Today it never pauses in fabric mode, because `sceneAnimating()` is
  always true there (question 6).
- `needsFrame(frameDt)` is dirty || (drifting && sinceRender + frameDt
  >= interval). Its drift renders at 6-15 fps, and only that frame
  draws. A drifting background behind a still scene therefore costs
  6-15 draws a second for 2.5 s, then nothing. This is K24's "an
  animated background must not defeat it".
- The background's hold during loading (K307 stage 2 adds one) keeps
  working: LOAD runs every frame.

### 4.6 Reveal, FX and paint

- The reveal runs on wall time, so REVEAL keeps the loop running until
  it ends. It never spans a stop.
- FX tails (`needsFxRender`, `appearFxAlive`) keep the geometry pass
  running until they end, as `flowRender` does today.
- **Paint is draw-only.** Pulses, the rim and the web fade are uniforms
  and data-texture rows (G2), not geometry. PAINT asks for the clocks
  and a draw, never a geometry pass, except through today's key-gated
  `rebuildFillets()` in tickPaintPalette, which keeps its key.
- `paintNeedsFrame()` belongs in `paint_state.ts` (R3). Before R3 it is a
  new façade method. It is true when:
  - the pulses are live (a declared pulse and pulseSpacing > 0);
  - the hover breath, web fade or ring laps animate;
  - the explore clock runs.

### 4.7 Input, the sleep gate and the camera

- The sleep gate (K63, a sim-time quiet window) is unchanged. It lives
  in `host.gateFrame` in-thread and in the worker at batch ends. K6
  only reads its result.
- A drag holds PHYS. After the release, the gate runs its quiet window
  and PHYS clears when the host sleeps.
- One window listener in the capture phase wakes the loop for any input.
  The region's own handler then pushes what it changed: a hover rim is
  PAINT, a pan is CAMERA, a tap is GAME. An event that changes nothing
  costs one frame.
- Camera: `converged()` is true when the view equals its target and no
  tween, spring or panel tween runs. The follow camera's spring
  (FOLLOW_W) keeps CAMERA set while the head moves.

### 4.8 The frame's decision

At the end of each frame the loop collects its pushes and polls, then
decides:

1. **Tick.** Run the parts whose flags are set, **in today's order**. K6
   reorders nothing.
2. **Geometry pass** if PHYS, GEOM, REVEAL or FX is set, or FLOW is set
   and the flow cadence is due.
3. **Draw** if any visual flag is set. Otherwise skip `app.render()`:
   the canvas keeps its last frame, and the compositor shows it.
4. **Rest cadence.** If every visual flag set is ambient, run the whole
   tick only every 1/R s and pass it the accumulated dt. The rAFs in
   between return at once. R is Levi's call (question 1); any
   non-ambient flag restores full rate on the next frame. Today's
   flowParity (the flow pass at half rate at rest) becomes this
   cadence.
5. **Stop** when no flag is set for two frames in a row, so the last
   change is drawn: `app.ticker.stop()`. Any `invalidate()` or input
   calls `start()`.

Mechanics (Pixi v8, to be checked against the installed version in
K6-3):
- `app.ticker.remove(app.render, app)`, then the loop calls
  `app.render()` itself at the end of a frame that draws;
- `ticker.stop()` / `start()`. `start()` resets the last time, so the
  first dt after an idle stretch is one frame's, not the idle's length.

### 4.9 Clocks across a stop

- The dt clocks pause while the loop is stopped and resume where they
  were: the paint clock (`advanceClocks`), flow time (`tickPaint`), fog
  time and the background's drift clock.
- Wall-time animations (the reveal, banners with timers) poll true while
  they run, so they never span a stop.
- K6-1's audit lists every animation that reads `performance.now()` or
  `Date.now()` instead of dt. Each one either polls true while it runs or
  is changed to dt.

### 4.10 Probes

After K6-3 an idle page draws nothing. That affects three kinds of
probe:
- probes that wait for frames, or time them;
- `diag_screenshot.mjs`, which reads the frame rate from the stamp (a
  median near 1000 ms means a throttled capture);
- probes that write params through `__knotParams()` and expect the
  per-frame re-sync to pick the change up.

The proposal (question 2):
- `__knotLoop()` reports the flags, the frames each flag kept the loop
  busy, and the mode.
- `__knotLoop({ continuous: true })` restores today's every-frame loop.
- A pre-load global, `window.__knotLoopMode = "continuous"` (set with
  `evaluateOnNewDocument`), makes a probe continuous from the first
  frame. It needs no codec param and no hash, which the URL rewrite
  drops.
- While stopped, the stamp refreshes once a second from a timer, as DOM
  only with no canvas draw, so sim/wall stay readable.
- `diag_screenshot.mjs` reports `idle: true` instead of a frame rate
  when the loop is stopped.
- The probes in `probes.md` that time frames or poll rAF (k147_measure,
  k7_frames, k174 perf, k114 perf) set continuous mode. K6-3 runs each
  once.

### 4.11 What it saves (to measure, not assumed)

- **Knot mode at rest, flow 0:** today Pixi draws 60 frames a second of
  a still scene (the 2026-10-10 audit measured the CPU 94.5% idle at
  rest; the draw is about 0.8-1.9 ms of GPU on the desktop). After K24,
  about 2.5 s of background drift, then no frames at all.
- **Fabric at defaults:** pulses, flow and fog keep PAINT and FLOW set,
  so nothing stops. Only a rest cadence saves anything there. At 30 fps
  it would halve the draws, while the flow pass stays at today's
  30 Hz.
- **Every frame, everywhere:** K6-2 removes the per-frame fabricTick
  parts that have nothing to do, the camera spring at rest, the
  indicator layout and the param re-syncs.
- K6-3 measures CPU and GPU ms per wall second and frames drawn per
  second at rest, on the desktop and the phone, before and after.

### 4.12 Does K6 need K5 first?

Not strictly. K6 could be built inside today's main.ts. But it touches
the frame loop (M14) and adds a `needsFrame()` or `converged()` to the
camera (M6), the lifecycle (M7), the session (chase, turn minotaur,
banners in M11), key holds (M12), input (M13) and auto audio. Inside the
5,600-line closure that is one diff across about ten regions, and it
conflicts with every main.ts item in the queue. After K5's M stages,
each module gains its poll in its own file, and `frame_loop.ts` collects
them.

**Recommendation:**
- K6-1 (shadow flags) right after M3, which extracts the frame loop;
- K6-2 and K6-3 after the M stages, at least M6.

The renderer's `paintNeedsFrame()` needs no R stage. It is a new façade
method that R3 later moves into `paint_state.ts`.

## 5. Stages

Each stage is one opus agent for at most 2 h. Each is behavior-neutral
except where marked, and is one module per commit.

### 5.1 Checks every stage runs

1. `npx tsc --noEmit`, `npm test` (the golden byte-identity, the codec
   pins, `host_seam`), `npm run build`.
2. **The moved-code review:** `git show --color-moved=plain
   --color-moved-ws=allow-indentation-change <sha>` per commit. Every
   line not shown as moved is one of the edits the message lists.
3. **A same-state pixel A/B**, master vs branch, under the perf lock
   (`$env:TEMP\claude-perf.lock`; `lock_take.ps1` / `lock_release.ps1`
   in the main checkout's `.claude/probes/K268/`):
   - `scripts/preview.ps1 -Port <p> -Ref <commit>` serves both builds;
   - both builds use the K83 recipe (`probes.md`): `phy=0` for a
     deterministic layout, `fw=0`, `am=instant`; pin `advanceClocks`,
     `paintClock` and `pulseBorn`; pin `__knotBackgroundLayer()`;
   - check each build's stamp SHA;
   - capture with `scripts/diag_screenshot.mjs`, or the
     `.claude/probes/K83/k83_ab.mjs` pattern;
   - 0 px of difference is expected.

   The URLs:
   - knot (`mf=0`);
   - fabric at defaults;
   - a fog design;
   - a thread-reveal design (`exploration` threads);
   - for stages that move input, camera or session code, the same
     scripted input on both builds: a tap on a choice, a move, a pinch
     zoom, a pan and a pluck, each captured once the view holds still.
4. **A frame-time check under the perf lock**, where a hot path moves:
   - M3 (the frame loop) and M6 (the drag path):
     `.claude/probes/K7/stage4/k7_frames.mjs`, rest plus a fixed
     wall-time drag, on master and on the branch;
   - R1, R2 and R4: `update()` ms per call (a timing loop at rest);
   - R3: `tickPaint` and `advanceClocks`;
   - R5: `rebuildFillets(true)` in a timing loop (rebuildFillets is
     gated: `probes.md`, 2026-10-11).

   A pure move should land within noise. Flag anything over 5% and look
   at V8's inlining before going on: a delegation adds a call, and a
   part's method sees a new receiver type.

Probe outputs go in untracked `.claude/probes/K5/<stage>/` (K6 in
`.claude/probes/K6/`), never the scratchpad. Ports **5840-5849** are
free of K7 (5798-5799), K268 (5820-5829) and K8 (5830-5839).

### 5.2 K5, the main.ts lane (after K7 stage 5 merges)

| Stage | Moves | Owns | Hot path |
|---|---|---|---|
| **M1** | re-map; `src/app/` + SceneRef; `createLoader` → `src/ui/loader.ts`; stamp → `stamp.ts`; probe hooks → `probe_hooks.ts`; `host_seam` scans `src/app/**` | main.ts, `src/app/*`, `src/ui/loader.ts`, `test/physics/host_seam.test.ts`, rules `paths:`, lore_index, the CLAUDE.md tree | no |
| **M2** | camera → `camera.ts` | main.ts, `src/app/camera.ts`, `gameplay-camera.md` paths | no |
| **M3** | frame loop → `frame_loop.ts` (renderDirty → `invalidate()`) | main.ts, `src/app/frame_loop.ts` | **yes** |
| **M4** | lifecycle → `lifecycle.ts`; scene build → `scene.ts`; audio map → `audio_map.ts` | main.ts, those three | no (rebuild is not per-frame) |
| **M5** | panel callbacks → `panel_wiring.ts` | main.ts, `panel_wiring.ts` | no |
| **M6** | pointer input → `input_pointer.ts`; `auto_audio.ts`; keys → `input_keys.ts` | main.ts, those three | **yes** (drag) |
| **M7a** | session part 1: `daily_session.ts`, `design_history.ts`, `hud_wiring.ts` | main.ts, `src/app/session/*` | no |
| **M7b** | session part 2: `indicators_wiring.ts`, `chase_wiring.ts`, `fabric_moves.ts` | main.ts, `src/app/session/*` | no (the chase tick is small; measure if it moves) |
| **M8** | boot → `boot.ts`; main.ts to about 400 lines; optional SceneState | main.ts, `boot.ts`, `scene.ts` | no |

### 5.3 K5, the renderer lane (after G3-0 and K268 stage 2 merge)

Each R stage needs ribbon_renderer.ts to itself for its duration
(section 6).

| Stage | Moves | Seam | Must precede |
|---|---|---|---|
| **R1** | the probe-surface inventory; the part convention; `ribbon_shader.ts`; `sampling.ts`; rules `paths:` gain `src/render/ribbon/**` (render-gaps, render-ribbon, render-shaders) | - | everything |
| **R2** | `crossing_gaps.ts` (R6); `explore_gaps.ts` (R12) | GapSource | G3-1 |
| **R3** | `reveal_fx.ts` (R4); `paint_state.ts` (R7, R8, R11) | the paint poll | K6-2 (optional) |
| **R4** | `pluck_host.ts` (R10); `strip_pass.ts` (the extrusion, reextrude, R13) | ThreadPass | G3-2 |
| **R5** | `joinery.ts` (R14, R15), moved whole | JointPass | G4-1 |

### 5.4 K6 (after M3; K6-2 and K6-3 after M6)

| Stage | Does | Behavior | Checks beyond 5.1 |
|---|---|---|---|
| **K6-1** | shadow flags: compute every push and poll each frame and change nothing; `__knotLoop()` reports them, plus the frames where today's loop drew with no flag set (K24's opportunity) and where a flag was set but the frame was pixel-identical to the last; `host.needsFrame()`; replace `sceneAnimating()` with the precise sceneActive | one change: the background drift may pause in a still fabric scene (question 6) | a shadow report on six links (knot fw=0, knot default, fabric default, the daily, a chase, reduced motion): every animation seen on screen shows as a flag |
| **K6-2** | skip CPU work: the geometry pass only on its flags; handRendererLook change-detecting (it pushes GEOM); the fabricTick parts only when their flag says; the per-frame param re-syncs become pushes from the panel and URL paths | none visible | the A/B; frame time at rest and mid-drag |
| **K6-3 = K24** | skip the draw; stop and start the ticker; the rest cadence (if Levi says yes); `__knotLoop` continuous mode and the pre-load global; the idle stamp refresh; diag_screenshot's `idle` | idle pages stop drawing; ambient-only scenes run at the rest cadence | power proxy (ms per wall second, frames drawn) at rest on the desktop and the phone (phone lock); every frame-timing probe in `probes.md` once in continuous mode |

## 6. Coexisting with the queue

A pure move conflicts only with an item that edits **the region it
moves**. A clean text merge is fine: the coordinator merges one, then
the other rebases. When an item edits a region that has since moved,
whichever lands second ports the other's hunks by hand into the new
file. That is mechanical, but it costs a merge round.

| Item | Files it edits | Conflicts with | Advice |
|---|---|---|---|
| **K7 stage 5** (running, owns main.ts and `src/physics/`) | main.ts (the default, the phone), `src/physics/` | all M stages, K6 | M1 starts after it merges. The R lane does not wait for it. |
| **K8 G3-0** (running) | ribbon_renderer.ts `update()`, `samp_table.ts`, captureScene/restoreScene | R1-R5 | R1 starts after it merges. If it adds a main.ts hook, M1's re-map picks it up. |
| **K268 stage 2** (running) | ribbon_renderer.ts (applyExploreGaps, slotOverCtrl, slotExploreHid, exploreUpdatePending), gap_mask.ts, explore_glsl.ts, paint_math.ts, explore_view.ts | R1 (the same file), R2 | R1 after it merges. |
| **K307 stage 2** (waiting) | new `shader_warmup.ts` and `program_registry.ts`; the program sites in ribbon_renderer.ts (sectionShader 535/563), arm_strip.ts, junction_field.ts; main.ts: the early start (boot), the pre-settle gate (finishPresettle), the gate for links without a pre-settle, the background hold, the loader rule | M1 (the loader, maybe a hook), M4 (lifecycle), M8 (boot), R1 (the shader sites, two lines) | Can run alongside M1-M3: its main.ts edits sit in M3 boot and M7 lifecycle, which those stages do not move. M4 waits for it. If M1 merges first, its new hook goes in `probe_hooks.ts`. Its two renderer lines port trivially to `ribbon_shader.ts`. |
| **K290 burn stage 3** (after K268 s2) | main.ts handleFabricTap, moveAlong, keyMoveAlong, fabricTick; the panel ("Burn race"), maze_hud.ts, appear_fx.ts, fabric drawFire; for "gone", the renderer's explore gaps and fans | M3 (fabricTick), M5 (panel callbacks), M6 (keys), M7b (moves); R2, R5 | Let K290 run alongside M1, M2 and R1. M3, M5, M6, M7b, R2 and R5 wait for it, or K290 lands in the new files. Recommendation: K290 before R2 and R5 (question 4). |
| **K76 stage 2d** (after K268 s2 and K290) | explore_glsl.ts, the renderer's explore (R12), maybe the panel and look | R2, M5 | R2 after 2d, or 2d lands in `explore_gaps.ts`. |
| **K8 G3-1** (after K268 s2 and K290) | gap_mask.ts, `fabric_sdf.ts`, computeGapSlot, renderMarkerGaps, bindGap | R1, R2 | After R1 and R2. |
| **K8 G3-2** (after K76 2d) | `ribbon_sdf.ts`, `rp`, the pluck host's setCollapse, withExplore, one main.ts line | R4, M4 | After R4. |
| **K9 (G4)** | the fans and the junction field | R5 | After R5. |
| **K24** | = K6-3 | - | - |
| main.ts gameplay items in general (K370-K374 and later) | main.ts regions | the M stage that moves their region | Schedule by region using section 1.1. Small items can run alongside any M stage that does not move their region. |

Lanes, given two or three code agents per repo:
- **main.ts lane:** M1 → M2 → M3 → (K6-1) → M4 → M5 → M6 → M7a → M7b →
  M8 → K6-2 → K6-3. Each stage needs main.ts to itself, except for items
  that touch other regions (the table above).
- **Renderer lane:** R1 → R2 → (G3-1) → R3 → R4 → (G3-2) → R5 → (G4).
  Each R stage needs ribbon_renderer.ts to itself.
- The two lanes touch different files and can run at the same time.
  K307 stage 2 and K290 fit beside them as the table says.

**When stage 1 (M1) can start:** right after K7 stage 5 merges into
master. Its agent's cap is 04:35 today. A worktree agent's branch is
created from `origin/master`, so the brief tells it to `git merge
--ff-only master` first if the push lags. R1 can start as soon as G3-0
and K268 stage 2 have both merged, even while M1 runs.

## 7. Stage 1 brief

**Stage:** K5 M1. `src/app/` scaffolding: the re-map, the SceneRef, and
three moves (the loader, the stamp, the probe hooks).

**Start:** after K7 stage 5 has merged into master. Run `Get-Date` first
and note the time: your cap is **2 hours** from then. If your branch
lacks K7 stage 5's merge, `git merge --ff-only master` (worktree
branches start from `origin/master`).

**Read first:** this doc's sections 1.1, 2.1, 2.2 and 5.1. Do not read
the whole of main.ts. Read the regions you move.

**Scope, in order, one commit per step:**

1. **Re-map main.ts** at the new master. Write a small TypeScript-parser
   script (untracked, `.claude/probes/K5/stage1/remap.ts`) that lists:
   - every top-level declaration inside `main()` (each `let`, `const`
     and function) with its line;
   - for each `let`, whether it is reassigned after boot, and by which
     region;
   - for every name, the regions that reference it.

   Regenerate section 1.1's table from it. Put the new table and the
   capture classification (assigned once / rebuild-reassigned / written
   by several regions) under "### Stage 1 handoff" at the end of this
   doc. Every later M stage starts from it. Commit the doc (WIP).
2. **`src/app/scene_ref.ts`:** the `SceneRef` interface, one getter per
   reassigned scene `let`. main.ts builds the object once, right after
   the scene declarations.
3. **Move `createLoader()`** with its comment (242-355 at f04aa4b) to
   `src/ui/loader.ts`. It has no captures.
4. **Move the stamp and perf readout** (4736-4766, plus BUILD_STAMP and
   its comment, plus STATS_KEY / MAZE_STATS_KEY and the cost rings only
   if nothing else uses them) to `src/app/stamp.ts`. BUILD_STAMP keeps
   its exact text: `scripts/diag_screenshot.mjs` finds the stamp by
   `/^P\d/`.
5. **Move the probe hooks** (4774-5637) to `src/app/probe_hooks.ts` as
   `installProbeHooks(ctx: ProbeCtx)`. ProbeCtx holds:
   - the assigned-once singletons;
   - the SceneRef;
   - the functions the hooks call;
   - a setter or owner method for each `let` the hooks write
     (`renderDirty = true` becomes `ctx.invalidate()`, for now
     `() => { renderDirty = true; }` in main.ts).

   It is installed at the same point in `main()` as today. The hooks
   read ctx at call time, never at install time. **Hook inventory:**
   - before the move, collect every `window.__knot*` name defined on
     master: load a page and list them, or grep;
   - after the move, collect them on the branch;
   - the two sets must be equal.

   The K90 `__knotSplineBend` hook in the renderer's constructor stays
   where it is.
6. **The host seam:** extend `test/physics/host_seam.test.ts` to scan
   `src/main.ts` plus every file under `src/app/`. The system can now
   also be reached through a SceneRef or ProbeCtx field typed
   `ParticleSystem` (`scene.ps`, `ctx.ps`, `ctx.host.view`), so collect
   the annotated fields across the scanned files. Add negative tests
   showing that `ctx.ps.step = ...` and `scene.ps.positions.set(...)` in
   an `src/app/` source are reported.
7. **Lore and the tree:**
   - add `src/app/**` to `gameplay.md`'s `paths:` and
     `src/app/probe_hooks.ts` to `probes.md`'s;
   - add their rows to `docs/lore_index.md`;
   - add one terse line each to CLAUDE.md's Project Structure for
     `src/app/` and `src/ui/loader.ts` (CLAUDE.md is near its context
     budget, so add no more).

**Files you own:**
- `src/main.ts`;
- new files under `src/app/`;
- new `src/ui/loader.ts`;
- `test/physics/host_seam.test.ts`;
- the `paths:` lists of `.claude/rules/gameplay.md` and `probes.md`;
- `docs/lore_index.md`;
- CLAUDE.md's Project Structure lines;
- this doc's "Stage 1 handoff" section.

**Stay out of:**
- `src/physics/**` (K7);
- `src/render/**` (G3-0, K268, the R lane);
- `src/ui/tweakpane_panel.ts`;
- `scripts/**`;
- `LEDGER.md`;
- every test except host_seam.

Make no logic edits anywhere. If a move seems to need one, stop and
write it into the handoff instead.

**Checks** (section 5.1):
- tsc, `npm test`, `npm run build`;
- the moved-code review per commit, with the old → new map in each
  message;
- the hook inventory;
- three hook-heavy probes against a build of the branch:
  - `scripts/diag_screenshot.mjs` (stamp, timing, frames);
  - `.claude/probes/K7/stage4/k7_frames.mjs` (the freeze / step / dump
    bridge, on both hosts: `phw=0` and `phw=1`);
  - `.claude/probes/K19-K20/probe_daily.mjs front`;
- the same-state pixel A/B of three links (knot, fabric, fog) under the
  perf lock, expecting 0 px.

No hot path moves in M1, so it needs no frame-time check. The stamp
update runs every frame but only moves files.

Use ports 5840-5849. Probe outputs go in
`.claude/probes/K5/stage1/` (untracked). Hold the perf lock for every
pixel-exact probe, and wait for it inside one blocking command.

**Helpers:** only for mechanical work (the re-map script, the hook
inventory). Run them on `model: sonnet` with a 1 h cap and this stop
rule.

**Stop rule:** stop when M1 is done or at the 2 h cap, whichever comes
first. Run `Get-Date` at the start and at each milestone. Commit WIP at
each milestone (each numbered step), broken or not, and never push. A
compaction is not a stop: after one, re-read this brief, `git log -5`
and the handoff section before going on.

At the stop:
1. Append "### Stage 1 handoff" to this doc: the re-map, the SceneRef
   list, what moved (with SHAs), what is left, the check results with
   their paths, and any surprise.
2. Report through SubagentHandback:
   - the commits;
   - the checks;
   - a `Ledger items` list;
   - K5's handle fields: owner, branch and last commit, evidence, next,
     brief.

## 8. Open questions for Levi

1. **A rest cadence at defaults?** The fabric never idles at defaults:
   pulses, flow and fog always animate, so K24's full stop never
   applies there.
   - **Recommendation:** run ambient-only animation at 30 fps (no input,
     physics, camera, game or overlay motion), and go back to full rate
     on the first frame anything else moves. Confirm on the phone that
     the pulses still read smooth before it ships.
   - Alternative: keep full rate, and save only in truly static scenes.
2. **May K24's idle change how probes see the page?**
   - **Recommendation:** yes, with `__knotLoop({continuous: true})`, a
     pre-load global for probes that measure from the load, a 1 s stamp
     refresh while idle, and `idle: true` in diag_screenshot. Probes
     that time frames switch to continuous mode in K6-3.
3. **Split the renderer before G3/G4?**
   - **Recommendation:** yes, interleaved: R1 and R2 before G3-1, R4
     before G3-2, R5 before G4-1. It delays G3-1 by about two stages
     (R1 and R2, about 4 h of agent time). It turns G3-3 and G4-2 into
     file deletions and puts every fan and gap fix until then in a
     1,000-1,700-line file.
   - `rebuildFillets` moves whole and is not refactored, since G4-2
     deletes it.
   - Alternative: skip the R lane and let G3/G4 work inside the big
     file.
4. **K290 before or after R2 and R5?** K290's "gone" edits the explore
   gaps and the fans.
   - **Recommendation:** K290 first. It is a feature you asked for and
     waits only on K268 stage 2. R1 can run beside it, and R2 and R5
     then move K290's code along with the rest, with no porting.
5. **CLAUDE.md's Project Structure:**
   - **Recommendation:** one line for `src/app/` and one for
     `src/render/ribbon/`, naming their parts, with each file's header
     comment as the per-file map. One line per file would add about 27
     lines to a file near its context budget.
6. **May the background drift pause in a still fabric scene?** Today it
   never pauses in fabric mode, because `sceneAnimating()` is always
   true there.
   - **Recommendation:** yes, after 2.5 s, as K21 designed. It matters
     only when pulses, flow and fog are all off. It is K24's intent.
7. **The renderer's `private` fields:** the parts read the shared scene
   fields through the façade, so 60-100 fields lose `private` and gain
   an `@internal ribbon` tag.
   - **Recommendation:** do that.
   - The alternative is a separate RibbonScene object, which needs a
     global `this.x` → `this.s.x` rewrite that conflicts with every
     renderer item in flight. M8's optional SceneState is the main.ts
     version of the same choice, and the same answer holds there: it is
     optional, and it comes last.
