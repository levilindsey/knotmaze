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
  `src/app/` (about 19 modules), and `main.ts` shrinks to about 400 lines
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
- At defaults the fabric never idles: the pulses and the flow
  animate. K24's full stop helps only static scenes. At defaults, the
  battery lever is a rest cadence, which is Levi's call (question 1).

## 1. The map

### 1.1 main.ts by region (f04aa4b)

Region IDs name today's code: MR for main.ts, RR for
ribbon_renderer.ts. M1-M8 and R1-R5 name the stages (section 5).

| ID | Lines | Region | Owns | Reads | Writes outside itself |
|---|---|---|---|---|---|
| MR1 | 1-168 | imports | - | - | - |
| MR2 | 170-355 | module constants (BACKGROUND, FIT_MARGIN, BUILD_STAMP 179, storage keys 182-187, MAX_ZOOM, FOLLOW_*, CAM_*, PRESETTLE_SIM, LOADER_*, NOMINAL_SLEEP_SIM, SETTLE_WALL_CAP_MS, TAP_*, RUN_REACH, LOBE_REACH, MUSIC_LOOKAHEAD); `createLoader()` 247-355 (pure DOM) | constants | - | - |
| MR3 | 357-490 | boot: `app` (357), `main()` (359), motion, contrast, a11y, hcl, `app.init` (391), the canvas, dailyStore + parseLaunch, `look` (424, `effectiveParam(params, a11y, key)`), daily state, undo, writeParams, prefs, PanelSettings | app, params, look, motion, a11y, dailyStore, undo, settings | URL, localStorage | - |
| MR4 | 493-530 | synth, snore, background (`addChild` 513), root, ripples, confetti | the layers | settings, motion | `app.stage` |
| MR5 | 539-640 | scene state: host (539: `params.physicsWorker ? new WorkerHost(() => rebuild()) : new InThreadHost()`), ps, renderer, debug, walkGraph, fabric, chase, turnMino, fabricController, reveal; physState (`live` / `loading` / `settling` / `frozen`), settleWall0, frozenSig, loaderShownAt, physicsTuning, physSig (609), physicsLive, loader, the audio map | the scene `let`s (rebuild reassigns them) | params | - |
| MR6 | 642-1026 | camera: computeFitTarget, view and cam, follow, the tween, the panel tween, clampView, easeView, applyView 808, zoomAt 875, panBy 886, resetCamera 892, updateCamera 949, fitToScreen 1026 | view, cam, follow and tween state | bounds from renderer and fabric, the head, panel open, settings | root's transform |
| MR7 | 1042-1250 | load and settle (K147): startAppearance, beginLoading, loadingTick, finishLoading, replaySettle, ink and gamut, beginSettle 1162, presettleTick 1191, finishPresettle 1230 | physState's transitions, the loader | host, reveal, params | renderer (beginReveal), background (the hold) |
| MR8 | 1250-1560 | scene build: syncBackground, recolorScene, rebuild 1315-1457; the audio map (rebuildAudioMap, runForCtrl, freqForCtrl, pluckUnit) | every MR5 `let` | params, look | everything in MR5 |
| MR9 | 1562-1926 | panel: the buildPanel callbacks (about 285 lines; `renderDirty = true` at 1818 and 1865), applyAccessibility 1846, handRendererLook 1887, resize 1919 | - | params, look, settings | params, renderDirty, the renderer's look fields, rebuild |
| MR10 | 1927-1993 | picking (pickRadius 1942, onThread 1955, grabAt 1965, grabRadius 1980) | - | renderer.pickThread, fabric, view | - |
| MR11 | 1993-3270 | game session, about 1,280 lines: attempts, HUD, badges, indicators 2105-2376, saves, visibility, prefs, the daily, win/loss/confetti, chase 2779-2921, turn minotaur 2922-3017, share/stats/playDaily, undo/redo, autosave, handleFabricTap 3189, moveAlong 3225 | attempt and daily state, HUD, badge, indicators | fabricController, walkGraph, fabric, dailyStore | fabric paint, params (playDaily), rebuild |
| MR12 | 3270-3635 | key moves (K120) | key state, holds | walkGraph, fabricController | moves (MR11) |
| MR13 | 3635-4318 | pointer, drag and pluck input: soft snap, pinch, the canvas listeners, triggerAutoPluck, autoAudioTick | drag, pinch, soft snap | picking, view | the host (drag and tug, through the host), camera, renderer.pluck, synth |
| MR14 | 4318-4734 | the frame loop: flowParity, halted, renderDirty (4333), wake 4334, startSettling 4340, freeze 4345, applyPhysicsMode 4355, physicsInputsChanged 4368, the cost rings, sceneAnimating 4391-4422, backgroundTick, `app.ticker.add` 4432-4449, tick 4451-4734 | renderDirty, halted, flowParity | everything | everything, each frame |
| MR15 | 4736-4766 | stamp and perf readout (probes read sim/wall from it) | the stamp | host stats, the cost rings | DOM |
| MR16 | 4774-5637 | probe hooks `window.__knot*`, about 860 lines (`renderDirty = true` at 4903, 4908, 5619; `__knotRenderer` 4946; a `needsFrame` read at 5465) | - | everything | renderDirty, params, the physics (through the host) |

References inside `main()`, which show how the modules will couple:
params 304, fabric 229, fabricController 132, renderer 120, ps 89,
root 87, app 78, chase 77, host 71, view 64, reveal 58, look 52,
panel 52, turnMino 49, motion 45, walkGraph 41, background 38, wake 34,
physState 32, cam 32, rebuild 27, settings 25, writeParams 23,
dailyStore 21, synth 20, indicators 17, renderDirty 11.

### 1.2 The frame today (MR14)

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
| RR0 | 1-735 | module level: imports; exported RibbonStyle, PaintSpan, PulseArm, PaintCap, PaintRim (158-253); constants 254-392 (FILLET_*, DISC_*, TIP_DISC_* and more); the strip program 393-585 (SECTION_VERT/FRAG 408-534, sectionShader 539, sectionShaderExplore 567); samePieces 586; **bindGap 610, the one binding list**; gap-solver constants 620-718; hslToHex; PassNeighbors | programs, the bind list | K307 stage 2 registers the program sites (535/563) |
| RR1 | 736-1383 | 163 fields (736-1135: 114 `private`, 48 plain, 1 `readonly`; getters stripStats, stripRT, stripTableData 1101-1107); the constructor (1136-1383; `rebuildFillets(true)` at 1158; installs the `__knotSplineBend` probe hook) | all state | the constructor takes `(ps, style)` |
| RR2 | 1384-1645 | sampling helpers: knotChainRgb, sampleAt, buildPoly, polyDist, protectReach, arcAt, renderCtrl, neighborGaps | - | pure reads of samples and passes |
| RR3 | 1646-1742 | small API: getDiag, requestInspect, setWidths, flowOffset, arcForCtrl, underGapVisibility | - | - |
| RR4 | 1743-2452 | reveal and appearance FX: beginReveal, syncFxStyle, addKnot, revealMulAtCtrl, revealShape, chainFxDone, passShowTime, jointGate, crossingShowTime, gateStrength, widthMulFor, finishReveal, drawRevealTips, appearFxAlive, probeTris, paintMirror 2204, revealPin, tickAppearFx, spawnTipFrontier, spawnInkFrontier | reveal state, appear FX | - |
| RR5 | 2453-2616 | **`update()`, the geometry pass** (order below) | geomRev, updateCount | the pipeline |
| RR6 | 2617-3529 | crossing gaps (K1): twinNeighbor, computeGapSlot 2636-3304 (about 670 lines), renderEmergent, renderMarkerGaps, assignGapIds | writes the slot table and underWindows | - |
| RR7 | 3530-3635 | section colors: setSectionRuns, installRuns, syncSectionUniforms, recolor | section runs | - |
| RR8 | 3636-3876 | gameplay paint: noiseV, armNextJointCtrl, setPaint, setRim, setRimAt, rimItemKey, syncRimItem, rimGap, routeArmSlot, resolveRoutes, `tickPaint` 3856 | spans, rim, routes | - |
| RR9 | 3877-4009 | picking: pickThread, ctrlAtArc | - | - |
| RR10 | 4010-4385 | plucks (K3): pluck, pluckPoint, arcOfPluck, tugSpan, tickPlucks, makePluckHost 4147, withPluckCollapse, reextrude 4201, pluckColor, composedAtArc, pluckNodes | plucks | the pluck host interface (G3 invariant 21) |
| RR11 | 4386-4669 | clocks and paint items: `needsFxRender` 4386, `advanceClocks` 4402, `tickPaintPalette` 4443 (pulse uniforms, hover breath, syncRimItem, the key-gated `rebuildFillets()`, tickWebFade), fadingArmLevels, tickWebFade, syncGold, writePaintItems 4529 | paintClock, pulseBorn, FX uniforms | probes pin `advanceClocks`, `paintClock`, `pulseBorn` |
| RR12 | 4670-4987 | thread reveal (K76, K268): setExplore, applyExploreGaps, exploreCutAt, exploreGapState, syncExploreJoints, exploreJointsKey, exploreJointShown, exploreJointState, exploreOn, exploreVisAt, exploreShownAt, exploreShownSpan | explore state | K268 stage 2 works here now |
| RR13 | 4988-5067 | tuckFusedTips, setMarkerOccluders, markerWorld, sectionColorAt | - | - |
| RR14 | 5068-5477 | material lookups and arm strips: paintArcAt, cpuChainMaterial, writeStripRow, cpuStripAt, **cpuJunctionField** 5184-5395, sampleAtSafe, colorAtArc, armCtrlSlope, sectionAtArc | the arm strips | - |
| RR15 | 5478-6993 | **`rebuildFillets`, one 1,515-line method**. Phases: layer votes; writeAxis records; discs; profiles; junction records; K81 routes; armTop and dives; jointMask; emitFan; free tips; fused tips; finish and upload; armReach; route geometry (coverCap, cornerCubic, turnFits); wedges per record (6685); the route pass and cover strips (6890) | fillet caches, fan meshes, the junction field | G4-2 deletes most of it |
| RR16 | 6994-7000 | destroy | - | - |

What `update()` (RR5) does, in order:
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

- **K1 (G1 per-pixel gaps, 99443cb):**
  - the gap solve (RR6, RR12) writes a page-lifetime RGBA32F slot table
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
| `src/app/camera.ts` | 188-203, 642-1026 | view, cam, follow, tweens | applyView, zoomAt, panBy, resetCamera, updateCamera(dt), fitToScreen, `converged()` (new in K6) | app, root, settings, scene |
| `src/app/frame_loop.ts` | 4318-4339 and 4391-4734 (flowParity, halted, renderDirty, wake, sceneAnimating, backgroundTick, the ticker callback, tick) | renderDirty (→ invalidate), halted, flowParity | `invalidate()`, `wake()`, `start()`, `sceneAnimating()` (until K6) | every module, as deps |
| `src/app/lifecycle.ts` | 205-226, 1042-1250, 4340-4390 (startSettling, freeze, applyPhysicsMode, physicsInputsChanged), physState and its siblings from MR5 | physState, settleWall0, frozenSig, loaderShownAt, physSig, physicsLive | beginLoading, loadingTick, finishLoading, replaySettle, beginSettle, presettleTick, finishPresettle, startSettling, freeze, applyPhysicsMode, physicsInputsChanged, `state` | host, reveal, loader, background, scene |
| `src/app/scene.ts` | 539-640 (the scene `let`s), 1250-1457 (syncBackground, recolorScene, rebuild) | the scene `let`s, the SceneRef | `createScene()` → SceneRef, rebuild, recolorScene, syncBackground | params, look, app, root |
| `src/app/audio_map.ts` | 1458-1560 | the audio map | rebuildAudioMap, runForCtrl, freqForCtrl, pluckUnit | scene, synth, params |
| `src/app/panel_wiring.ts` | 1562-1926 | - | `wirePanel()` → applyAccessibility, handRendererLook, resize | params, settings, scene, invalidate, rebuild |
| `src/app/input_pointer.ts` | 1927-1993 (picking), 3635-4318 minus auto audio | drag, pinch, soft snap, pending tap | `attachPointerInput()` → softSnapStep (for the frame), grabAt, pickRadius | camera, the host, scene, session (handleFabricTap) |
| `src/app/auto_audio.ts` | triggerAutoPluck, autoAudioTick (in 3635-4318) | music mode's schedule | autoAudioTick(dt), triggerAutoPluck | synth, scene, audio map |
| `src/app/input_keys.ts` | 3270-3635 | key state, holds | `attachKeyMoves()` → keyStep(dt) | session moves, scene |
| `src/app/session/daily_session.ts` | MR11: attempts, saves, visibility, prefs, the daily, share/stats/playDaily, autosave | attempt and daily state | (re-mapped in stage M7a) | dailyStore, scene, hud |
| `src/app/session/hud_wiring.ts` | MR11: HUD, badges, win/loss banners, confetti trigger | HUD, badge, banners | - | - |
| `src/app/session/indicators_wiring.ts` | 2105-2376 | indicators | update | camera, scene |
| `src/app/session/chase_wiring.ts` | 2779-3017 (chase, turn minotaur) | chase timers | tickChase etc. | scene, hud |
| `src/app/session/design_history.ts` | MR11: undo/redo | the undo stack's wiring | - | undo, params, rebuild |
| `src/app/session/fabric_moves.ts` | 3189-3270 (handleFabricTap, moveAlong) | - | handleFabricTap, moveAlong | scene, session |
| `src/app/boot.ts` | 359-530 | the boot order | `boot()` → the singletons | - |

End state: `main.ts` imports, calls `boot()`, creates scene, camera,
lifecycle, panel, session, input, loop and probe hooks in order, and
starts the loop. That is under about 400 lines. An optional last step
folds the SceneRef getters into a `SceneState` object owned by
`scene.ts`, so main.ts keeps no `let`s at all. That step is not needed
for anything below.

The MR11 session ranges other than chase, indicators and the two move
functions are approximate. Stage M7a re-maps them first.

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
(R1 counts them). The alternative is a separate RibbonScene
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
| `ribbon/sampling.ts` | 1384-1645, plus paintArcAt, sampleAtSafe (RR14) and arcForCtrl (RR3) if their callers allow | none (functions of `r`) | sampleAt, sampleAtSafe, buildPoly, polyDist, protectReach, arcAt, paintArcAt, renderCtrl, neighborGaps | reads the hub; G3-0's SAMP rows mirror it |
| `ribbon/crossing_gaps.ts` | 620-718, RR6 2617-3529 | the solve's scratch, the emergent pool | `GapSource`: `solve(fillHalf, gap)` writes slots and underWindows; renderMarkerGaps; assignGapIds | **G3-1's seam** |
| `ribbon/explore_gaps.ts` | RR12 4670-4987 | explore state | setExplore, applyExploreGaps, exploreGapState, exploreVisAt, exploreShownAt, exploreJointState, exploreOn | K268, K290 and K76 2d work here |
| `ribbon/reveal_fx.ts` | RR4 1743-2452 (paintMirror and probeTris go with paint if their callers say so) | reveal state, appear FX, the ink frontier | beginReveal, revealMulAtCtrl, revealPin, appearFxAlive, widthMulFor, the gates | - |
| `ribbon/paint_state.ts` | RR7 3530-3635, RR8 3636-3876, RR11 4386-4669 | spans, rim, routes, section runs, the clocks (accessors on the façade for paintClock and pulseBorn) | setPaint, setRim, setRimAt, setSectionRuns, recolor, tickPaint, advanceClocks, needsFxRender, `paintNeedsFrame()` (new in K6) | where K6's paint poll lives |
| `ribbon/pluck_host.ts` | RR10 4010-4385 | plucks | pluck, pluckPoint, tugSpan, tickPlucks, makePluckHost, withPluckCollapse, composedAtArc, pluckNodes | invariant 21; G3-2's setCollapse writes radii |
| `ribbon/strip_pass.ts` | the fills extrusion in `update()`, reextrude 4201, RR13 4988-5067 (tuckFusedTips, markers) | the fill meshes | `ThreadPass`: extrude(chain), collapse(chain, radii), tuck(), the meshes | **G3-2's seam**; G3-3 deletes this file |
| `ribbon/joinery.ts` | RR14 5068-5477 (cpuJunctionField, the arm strips, the material lookups only fans read), RR15 5478-6993 | fillet caches, fan meshes, the junction field, arm strips, cover strips | `JointPass`: rebuild(force), the junction-field records | **G4-1's seam**; G4-2 deletes this file |

Where things went (R1, `K5_R1.md` questions 1-5): `sampling.ts` took the
six pure helpers and PassNeighbors, forwarded from the façade; buildPoly,
polyDist and protectReach go to `crossing_gaps.ts` (R2), samePieces,
sameBurn and sameSpans to `explore_gaps.ts` (R2), knotChainRgb and
hslToHex to `paint_state.ts` (R3); arcForCtrl stays on the façade.

`rebuildFillets` moves **as one method**, with no phase refactor: G4-2
deletes it, and a refactor would be the riskiest edit in the split for
code with the shortest future. Splitting it into phase functions is
worth doing only if G4 slips past several more fan fixes (question 3).

### 2.4 What does not move

- `fabric_maze_renderer.ts` (about 2,600 lines) is not part of K5. It
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
| G3-1 | edits inside RR6 (900 lines in the big file) plus bindGap | edits `crossing_gaps.ts` and `ribbon_shader.ts` only; the GapSource contract (the slot table, underWindows, underGapVisibility) is what every reader already uses |
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
  - asleep, the worker posts nothing and discards allowances
    (`K7_worker.md`).

  So stopping the rAF while the worker sleeps loses nothing. One catch:
  when `asleep` flips, the picture may still be up to D behind the
  newest snapshot. `needsFrame()` must stay true until the interpolated
  view has reached it, or the last D of the settle never reaches the
  screen. K6-1 reads WorkerHost and adds whatever `asleep` lacks.
- **Wake:** input → `host.wake()` / `dragTo` / tug → push PHYS → the
  rAF starts → `host.frame` posts allowances again.
- K7's design stands (`K7_worker.md`, "K24 and K6"): the worker needs
  nothing from K6, and K24 reads `host.asleep` instead of the sleep
  gate. K6 adds one method to the PhysicsHost interface and changes
  nothing in the worker.

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
- The probes in `probes.md` that time frames or poll rAF set continuous
  mode: `k147_measure.mjs`, `k7_frames.mjs`, `k7_latency.mjs`,
  `k174_page.mjs perf|perfq`, K114's `burn_page.mjs perf` and
  `k96_cam.mjs`. K6-3 runs each once.

### 4.11 What it saves (to measure, not assumed)

- **Knot mode at rest, flow 0:** today Pixi draws 60 frames a second of
  a still scene (the 2026-10-10 audit measured the CPU 94.5% idle at
  rest; G1 measured the fabric's draw at 1.78-1.94 ms of desktop GPU).
  After K24, about 2.5 s of background drift, then no frames at all.
- **Fabric at defaults:** the pulses and the flow keep PAINT and FLOW
  set, so nothing stops. Only a rest cadence saves anything there. At
  30 fps it would halve the draws, while the flow pass keeps today's
  half rate.
- **Every frame, everywhere:** K6-2 removes the per-frame fabricTick
  parts that have nothing to do, the camera spring at rest, the
  indicator layout and the param re-syncs.
- K6-3 measures CPU and GPU ms per wall second and frames drawn per
  second at rest, on the desktop and the phone, before and after.

### 4.12 Does K6 need K5 first?

Not strictly. K6 could be built inside today's main.ts. But it touches
the frame loop (MR14) and adds a `needsFrame()` or `converged()` to the
camera (MR6), the lifecycle (MR7), the session (chase, turn minotaur,
banners in MR11), key holds (MR12), input (MR13) and auto audio. Inside the
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

Probe scripts and outputs go in the main checkout's untracked
`.claude/probes/K5/<stage>/` (K6: `.claude/probes/K6/`), which outlives
a worktree; never the scratchpad. Ports **5840-5849** are free of K7
(5798-5799), K268 (5820-5829) and K8 (5830-5839).

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
| **R2** | `crossing_gaps.ts` (RR6); `explore_gaps.ts` (RR12) | GapSource | G3-1 |
| **R3** | `reveal_fx.ts` (RR4); `paint_state.ts` (RR7, RR8, RR11) | the paint poll | K6-2 (optional) |
| **R4** | `pluck_host.ts` (RR10); `strip_pass.ts` (the extrusion, reextrude, RR13) | ThreadPass | G3-2 |
| **R5** | `joinery.ts` (RR14, RR15), moved whole | JointPass | G4-1 |

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
| **K7 stage 5** (running, owns main.ts and `src/physics/`) | main.ts and `src/physics/`: the phone pass, the worker by default, the lore | all M stages, K6 | M1 starts after it merges. The R lane does not wait for it. |
| **K8 G3-0** (running) | ribbon_renderer.ts `update()`, `samp_table.ts`, captureScene/restoreScene | R1-R5 | R1 starts after it merges. If it adds a main.ts hook, M1's re-map picks it up. |
| **K268 stage 2** (running) | ribbon_renderer.ts (applyExploreGaps, slotOverCtrl, slotExploreHid, exploreUpdatePending), gap_mask.ts, explore_glsl.ts, paint_math.ts, explore_view.ts | R1 (the same file), R2 | R1 after it merges. |
| **K307 stage 2** (waiting) | new `shader_warmup.ts` and `program_registry.ts`; the program sites in ribbon_renderer.ts (sectionShader 535/563), arm_strip.ts, junction_field.ts; main.ts: the early start (boot), the pre-settle gate (finishPresettle), the gate for links without a pre-settle, the background hold, the loader rule | M1 (the loader, maybe a hook), M4 (lifecycle), M8 (boot), R1 (the shader sites, two lines) | Can run alongside M1-M3: its main.ts edits sit in the boot (MR3) and the load settle (MR7), which those stages do not move. M4 waits for it. If M1 merges first, its new hook goes in `probe_hooks.ts`. Its two renderer lines port trivially to `ribbon_shader.ts`. |
| **K290 burn stage 3** (after K268 s2) | main.ts handleFabricTap, moveAlong, keyMoveAlong, fabricTick; the panel ("Burn race"), maze_hud.ts, appear_fx.ts, fabric drawFire; for "gone", the renderer's explore gaps and fans | M3 (fabricTick), M5 (panel callbacks), M6 (keys), M7b (moves); R2, R5 | Let K290 run alongside M1, M2 and R1. M3, M5, M6, M7b, R2 and R5 wait for it, or K290 lands in the new files. Recommendation: K290 before R2 and R5 (question 4). |
| **K76 stage 2d** (after K268 s2 and K290) | explore_glsl.ts, the renderer's explore (RR12), maybe the panel and look | R2, M5 | R2 after 2d, or 2d lands in `explore_gaps.ts`. |
| **K8 G3-1** (after K268 s2 and K290) | gap_mask.ts, `fabric_sdf.ts`, computeGapSlot, renderMarkerGaps, bindGap | R1, R2 | After R1 and R2. |
| **K8 G3-2** (after K76 2d) | `ribbon_sdf.ts`, `rp`, the pluck host's setCollapse, withExplore, one main.ts line | R4, M4 | After R4. |
| **K9 (G4)** | the fans and the junction field | R5 | After R5. |
| **K24** | = K6-3 | - | - |
| Other main.ts items | main.ts regions | the M stage that moves their region | Schedule by region using section 1.1. Small items can run alongside any M stage that does not move their region. |

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

**Setup** (as in `K7_worker.md`, "Every build stage: setup and
process"):
- **`node_modules`:** a junction to the main checkout's (`New-Item
  -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`). Before anything
  removes your worktree, delete it with `(Get-Item node_modules).Delete()`,
  never a recursive delete.
- **Probes** live in the main checkout's `.claude/probes/`, which is
  untracked and so absent from your worktree: run them by absolute path.
  Keep your scripts and results in the main checkout's untracked
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K5\stage1\`, which
  outlives your worktree.
- **Servers:** ports 5840-5849, each server with a private vite cacheDir
  (K80's wrapper, `probes.md`). Serve master and your branch with
  `scripts/preview.ps1 -Port <p> -Ref <commit>` and check each page's
  stamp SHA.
- **Chrome:** a probe that launches Chrome gets its own `--user-data-dir`
  inside your probes folder, deleted when you are done (K161).
  `diag_screenshot.mjs` already makes one per run.
- **The perf lock:** hold `$env:TEMP\claude-perf.lock` for every frame
  timing and every pixel-exact GPU probe, waiting for it inside one
  blocking command.

**Scope, in order, one commit per step:**

1. **Re-map main.ts** at the new master. Write a small TypeScript-parser
   script (`remap.ts`, in the probes folder above) that lists:
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

   The `__knotSplineBend` hook in the renderer's constructor stays
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
  - `.claude/probes/K7/stage4/k7_frames.mjs` (a fixed wall-time drag,
    on both hosts: `phw=0` and `phw=1`);
  - `.claude/probes/K19-K20/probe_daily.mjs front`;
- the same-state pixel A/B of three links (knot, fabric, fog) under the
  perf lock, expecting 0 px.

No hot path moves in M1, so it needs no frame-time check. The stamp
update runs every frame but only moves files.

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

**Answered (Levi, 2026-10-15, K377): all seven recommendations taken.**

1. **A rest cadence at defaults?** The fabric never idles at defaults:
   the pulses and the flow always animate, so K24's full stop never
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
   - **Recommendation:** K290 first. It is a feature you asked for
     (2026-10-14) and builds on K268's shaped gaps (`K114_burn.md`,
     stage 3). R1 can run beside it, and R2 and R5 then move K290's
     code along with the rest, with no porting.
5. **CLAUDE.md's Project Structure:**
   - **Recommendation:** one line for `src/app/` and one for
     `src/render/ribbon/`, naming their parts, with each file's header
     comment as the per-file map. One line per file would add about 27
     lines to a file near its context budget.
6. **May the background drift pause in a still fabric scene?** Today it
   never pauses in fabric mode, because `sceneAnimating()` is always
   true there.
   - **Recommendation:** yes, after 2.5 s, as K21 designed. It matters
     only in a fabric scene with no pulses, flow or fog drift. It is
     K24's intent.
7. **The renderer's `private` fields:** the parts read the shared scene
   fields through the façade, so those (R1 counts them) lose `private`
   and gain an `@internal ribbon` tag.
   - **Recommendation:** do that.
   - The alternative is a separate RibbonScene object, which needs a
     global `this.x` → `this.s.x` rewrite that conflicts with every
     renderer item in flight. M8's optional SceneState is the main.ts
     version of the same choice, and the same answer holds there: it is
     optional, and it comes last.

## Stage 1 launch notes (2026-10-15, the coordinator)

Master has moved since the design (4931204), so the brief's line numbers
(f04aa4b) are stale; step 1's re-map is for that.
`git log --oneline 4931204..master -- src/main.ts` lists the merges.

- **The physics worker is the default** (K7 stages 5 and 6; `url_state.ts`
  `physicsWorker: true`), and `&phw=0` runs in-thread. A probe that
  patches `ps.step` throws on a default build (`probes.md`, the K7
  worker note), so run the checks' probes with an explicit `phw=0` and
  `phw=1`, as the brief's `k7_frames.mjs` line does.
- **K290's burnt thread** added two main.ts lines that move with their
  regions: `f.burntLook = params.burnt` in syncExploration, and a
  `burnt` key in the `__knotExplore` hook.
- **Running alongside you:** K307 stage 2 (the shader warm-up) edits
  main.ts's gate only: the early start, the two gates on
  `finishPresettle`, the background hold and the loader rule, each a few
  calls into `shader_warmup.ts`. The loader rule touches
  `createLoader()`, which your step 3 moves. Whichever lands second
  rebases; if K307 lands first, your moved loader carries its edit and
  the hook inventory gains `__knotWarmup`. K76 stage 2d (the thread
  reveal's phone gate and High contrast dots) may make small main.ts
  edits. The coordinator may ask you to rebase mid-stage; do it when
  asked, and redo the hook inventory against the new base.
- **K7 stage 7** (the worker's start-gate lever) waits for M1: both edit
  main.ts's boot.
- **No helpers tonight:** write the re-map script and take the hook
  inventory yourself (this overrides the brief's Helpers line).
- **The perf lock** covers tests and builds too:
  `pwsh C:\Users\lsl\Repositories\knotmaze\.claude\probes\K268\lock_take.ps1 -Owner 'K5 M1' -What '<what>'`,
  then `lock_release.ps1 -Owner 'K5 M1'`. No phone.

### Stage 1 handoff

(K5 M1 agent, 2026-10-15; written step by step, completed at the stop.)

#### The re-map (1646491)

Generated by `.claude/probes/K5/stage1/remap.ts` (main checkout,
untracked): `node --no-warnings remap.ts <repo> report <out.md>` from a
checkout with `node_modules`, Node 23.6+ (type stripping). It resolves
names through the type checker, so shadowing is handled. Regions start
at ANCHORS (`anchors.json` beside it: a declared name, `@<statement
prefix>` or `#<line>`); edit them when a region moves, and the script
fails loudly on a missing or out-of-order anchor. Output at 1646491:
`remap_1646491.md` (this table, every main() declaration with its
references by region, every `let` write with its region and whether it
runs at boot or later, references to every import) and
`list_1646491.txt` (main()'s top-level statements). main.ts is 5653
lines; main() runs 359-5651 with 185 `const`s, 108 `let`s and 22
functions at its top level.

| ID | Lines | Region | Owns (lets) | Reads (other regions' names: count, top 12 by refs) | Writes outside itself |
|---|---|---|---|---|---|
| MR1 | 1-169 | imports | - | - | - |
| MR2 | 170-356 | module constants (BACKGROUND, FIT_MARGIN, BUILD_STAMP 179, storage keys 182-187, MAX_ZOOM, FOLLOW_*, CAM_*, PRESETTLE_SIM, LOADER_*, NOMINAL_SLEEP_SIM, SETTLE_WALL_CAP_MS, TAP_*, RUN_REACH, LOBE_REACH, MUSIC_LOOKAHEAD); `createLoader()` 247 (pure DOM) | - | - | - |
| MR3 | 357-512 | boot: `app` (357), `main()` (359), motion, contrast, a11y, hcl, dailyStore + parseLaunch, `params` (401), the physics host (417; K7 stage 5 makes it before `app.init`), `app.init`, the canvas, `look` (444), daily state, undo, writeParams, prefs, PanelSettings (497) | hcLookChoice, dailyN, dailyFloating, undoStack, undoRestoring, panelMidDrag, syncUndoButtons, statsShown, mazeStatsShown, finishIndicatorShown, tapToPan, indPrefs, movePadOn | 7: rebuild 1, BACKGROUND 1, syncDaily 1, STATS_KEY 1, MAZE_STATS_KEY 1, FINISH_INDICATOR_KEY 1, TAP_TO_PAN_KEY 1 | - |
| MR4 | 513-551 | synth (513), snore, background (528, `addChild`), root, ripples, confetti (547) | - | 3: app 8, params 2, settings 1 | - |
| MR5 | 552-651 | scene state: ps (552), renderer, debug, walkGraph, fabric, chase, turnMino, fabricController, reveal; physState (596: `live` / `loading` / `settling` / `frozen`), settleWall0, frozenSig, loaderShownAt, physicsTuning, physSig (619), physicsLive, loader (634), the audio map, songSched | ps, renderer, debug, walkGraph, buildHueGroup, buildStrandCount, fabric, chase, chaseRunning, turnMino, turnWait, turnWaitDur, fabricController, pendingLoss, reveal, physState, settleWall0, frozenSig, loaderShownAt, audioAssign, audioRuns, audioSegSite, nextRandomPluck | 3: params 12, settings 1, createLoader 1 | - |
| MR6 | 652-1052 | camera: fitTarget, computeFitTarget 655, view and cam (728), follow, the tween, the panel tween, clampView, easeView, applyView 818, syncExploration 844, zoomAt 886, panBy, resetCamera 903, updateCamera 960, fitToScreen 1037 | fitRight, camFollow, camTouchedAt, viewHoming, camTween, panelWrap, panelU, panelT, panelTPrev, panelBox, fitFrames | 14: app 20, params 16, root 16, fabric 8, ps 4, MAX_ZOOM 3, FIT_MARGIN 2, FOLLOW_DELAY 2, reveal 2, motion 1, FOLLOW_SPAN 1, FOLLOW_RAMP 1 | - |
| MR7 | 1053-1260 | load and settle (K147): startAppearance 1053, beginLoading, loadingTick, finishLoading, replaySettle 1134, ink and gamut, beginSettle 1173, presettleTick 1202, finishPresettle 1241 | canvasInk | 23: params 18, renderer 13, fabric 12, host 12, ps 8, loader 8, root 7, BACKGROUND 4, fabricController 4, loaderShownAt 4, look 3, physicsTuning 2 | physState (MR5), reveal (MR5), halted (MR14), perfLine (MR15), frozenSig (MR5), loaderShownAt (MR5) |
| MR8 | 1261-1572 | scene build: syncBackground 1261, recolorScene, rebuild 1326; the audio map (rebuildAudioMap 1468, runForCtrl, freqForCtrl, pluckUnit) | - | 41: params 56, fabric 17, ps 13, walkGraph 10, look 10, renderer 6, debug 6, audioRuns 6, root 5, audioAssign 5, background 4, view 3 | ps (MR5), fabric (MR5), viewHoming (MR6), camTween (MR6), renderer (MR5), walkGraph (MR5), fabricController (MR5), canvasInk (MR7), buildHueGroup (MR5), buildStrandCount (MR5), debug (MR5), pendingWin (MR11), pendingLoss (MR5), audioAssign (MR5), audioRuns (MR5), audioSegSite (MR5), nextRandomPluck (MR5) |
| MR9 | 1573-1937 | panel: `panel` = buildPanel(...) and its callbacks (1573), applyAccessibility 1857, handRendererLook 1898, the resize listener | - | 49: params 54, fabric 20, renderer 16, fabricController 16, writeParams 14, wake 8, a11y 7, look 7, motion 6, synth 6, dailyN 5, updateHud 5 | panelWrap (MR6), pendingWin (MR11), renderDirty (MR14) |
| MR10 | 1938-2003 | picking (toLattice 1938, pickRadius 1953, onThread, grabAt 1976, grabRadius 1991) | - | 4: ps 6, root 5, params 4, renderer 4 | - |
| MR11 | 2004-3280 | game session: the solve clock (2004), attempts, HUD (2035), badges, indicators (2116), saves, visibility, prefs, the daily, win/loss/confetti, chase 2790, turn minotaur 2933, share/stats/playDaily 3065, undo/redo (3090; the `__knotUndo` hook), the daily label, autosave, handleFabricTap 3200, moveAlong 3236 | attemptDaily, attemptDay, attemptStartedAt, attemptRecord, pendingExplored, attemptSyncedAt, adopting, lastWin, finishWhy, finishIconId, finishIconSvg, headWhy, headIconId, headIconSvg, minoIconSvg, prefsTimer, prefsFrom, pendingWin, chaseWarned, turnWarned, labelDay, lastAutosave, smolderToastAt | 45: fabric 72, fabricController 49, params 42, dailyN 31, turnMino 28, chase 17, walkGraph 14, root 13, dailyStore 12, app 12, undoStack 10, renderer 10 | dailyN (MR3), dailyFloating (MR3), undoRestoring (MR3), panelMidDrag (MR3), syncUndoButtons (MR3), chase (MR5), turnMino (MR5), camTouchedAt (MR6), viewHoming (MR6), camTween (MR6), pendingLoss (MR5), chaseRunning (MR5), turnWait (MR5), turnWaitDur (MR5) |
| MR12 | 3281-3645 | key moves (K120) (3281), the move pad (3622) | keyHold, keyHoldSince, keyHoldFc, keyHoldTaps, keyHoldChase, keyHoldTurnMino, keyHoldInputs, keyHoldCatches, keyHoldTick, keyQueued, keyQueuedOn, keyQueuedDir, keyHover, moveWaitStamp, keyLast, tapsWait | 13: chase 24, fabricController 17, turnMino 11, fabric 8, walkGraph 4, ps 2, renderer 2, moveAlong 2, params 1, pendingWin 1, pendingLoss 1, sceneReady 1 | - |
| MR13 | 3646-4333 | pointer, drag and pluck input: soft snap, tug, release, tapPluck, pinch, the canvas listeners, triggerAutoPluck 4206, autoAudioTick 4268 | dragVel, lastMoveT, snapMode, pinch, touchLocked, pendingTap, dragPan, pendingPluck, lastEmptyTap | 36: ps 33, params 25, fabric 21, app 20, renderer 15, fabricController 13, host 9, synth 8, wake 5, pickRadius 5, settings 4, onThread 4 | nextRandomPluck (MR5) |
| MR14 | 4334-4752 | the frame loop: flowParity, halted, renderDirty (4344), wake 4345, startSettling 4351, freeze 4356, applyPhysicsMode 4366, physicsInputsChanged, the cost rings (4385), sceneAnimating 4402, backgroundTick, `app.ticker.add`, tick 4462 | flowParity, halted, renderDirty, frameCostN, frameCostTotal, revealMs, revealMsTotal, lastViewX, lastViewY, lastViewS, sceneWasAnimating | 48: params 29, fabric 25, renderer 17, perf 14, physState 11, host 11, root 8, fabricController 8, dragPos 8, reveal 7, ps 6, updateStamp 5 | physState (MR5), perfLine (MR15), frozenSig (MR5), pendingWin (MR11), pendingLoss (MR5), snapMode (MR13), settleWall0 (MR5) |
| MR15 | 4753-4787 | stamp and perf readout (4753; probes read sim/wall from it), the boot console line (4780) | perfLine | 5: host 2, BUILD_STAMP 2, app 1, settings 1, ps 1 | - |
| MR16 | 4788-5649 | probe hooks `window.__knot*` | - | 84: params 33, fabricController 23, fabric 19, renderer 19, root 17, host 14, background 11, walkGraph 9, confetti 7, ps 7, look 7, motion 6 | renderDirty (MR14), hcLookChoice (MR3), chaseRunning (MR5), tapsWait (MR12) |
| MR17 | 5650-5653 | the boot's first `rebuild()`, then `main().catch` | - | 2: rebuild 1, main 1 | - |

What changed since f04aa4b, for the later stages:
- **The host left MR5.** K7 stage 5 makes it in MR3 (417), before
  `app.init`, as a `const host: PhysicsHost`. Nothing reassigns it (a
  worker fallback swaps the host's inside, not the binding), so it is an
  assigned-once singleton, not a SceneRef field.
- MR16 also writes `hcLookChoice` (`__knotHcLook`), `chaseRunning`
  (`__knotChaseTap`) and `tapsWait` (`__knotKeyMoves`), not only
  `renderDirty` (now at 4917, 4922 and 5635).
- `perfLine` (MR15) is written by MR7 (1101, 1220) and MR14 (4469, 4639,
  4650, 4700, 4736): kind 3, owned by the stamp's readers, not the stamp.
- STATS_KEY, MAZE_STATS_KEY, FINISH_INDICATOR_KEY and TAP_TO_PAN_KEY are
  read by MR3 and MR9, so they stay in main.ts (step 4's "only if nothing
  else uses them"). BUILD_STAMP is read only by MR15.
- The cost rings (frameCost, frameCostN, frameCostTotal, revealCost,
  revealMs, revealMsTotal; 4385-4392) are written by MR14 and read by the
  `__knotPerf` hook, not by the stamp: they stay with the frame loop (M3).
- MR17 is new: the first `rebuild()` runs after the hooks are installed.

#### Capture classification (main() `let`s, 1646491)

- **Assigned once** (no write after boot): panelMidDrag, syncUndoButtons,
  statsShown, mazeStatsShown, finishIndicatorShown, tapToPan, indPrefs,
  movePadOn (MR3), panelWrap (MR6). Plus every `const`, `params`, `look`,
  `host` and the module-level `app` among them.
- **Rebuild-reassigned** (written inside `rebuild()`): ps, renderer, debug,
  walkGraph, buildHueGroup, buildStrandCount, fabric, fabricController
  (only there), and pendingLoss, viewHoming, camTween, pendingWin (also
  elsewhere). Reassigned by a mode switch instead: chase, turnMino
  (`restartChase`, MR11) and reveal (MR7's startAppearance, beginLoading,
  beginSettle).
- **Written by several regions** (a write from outside the home region, or
  from two or more regions): hcLookChoice, dailyN, dailyFloating,
  undoRestoring (MR3); chase, chaseRunning, turnMino, turnWait,
  turnWaitDur, pendingLoss, reveal, physState, settleWall0, frozenSig,
  loaderShownAt, audioAssign, audioRuns, audioSegSite, nextRandomPluck
  (MR5); camTouchedAt, viewHoming, camTween (MR6); canvasInk (MR7);
  pendingWin (MR11); tapsWait (MR12); snapMode (MR13); halted,
  renderDirty (MR14); perfLine (MR15). The rebuild-reassigned scene
  `let`s count here too (MR8 writes MR5's).
- **Reassigned in their own region only**: undoStack (MR3); fitRight,
  camFollow, panelU, panelT, panelTPrev, panelBox, fitFrames (MR6); the
  MR11 attempt, indicator, prefs, warning, label and autosave state (22
  `let`s); the MR12 key-hold state (15); the MR13 drag, pinch and tap
  state (8 besides snapMode); flowParity, the cost-ring counters,
  lastView*, sceneWasAnimating (MR14).

#### The SceneRef (step 2, a829d70)

(Commit SHAs in this handoff are the rebased ones; the rebase section
below maps them to the pre-rebase SHAs that some evidence files name.)

`src/app/scene_ref.ts`: `interface SceneRef`, one readonly field per scene
`let` that `rebuild()` or a mode switch reassigns: ps, renderer, debug,
walkGraph, buildHueGroup, buildStrandCount, fabric, chase, turnMino,
fabricController, reveal. main.ts builds `const scene: SceneRef` once,
one getter per field, right after `let reveal` (472-509 at 37ddbf3,
with its comment).
Readers so far: stamp.ts (`scene.ps`) and probe_hooks.ts
(`ctx.scene.<field>`, 90 sites). Not in it:
- the host: an assigned-once `const` since K7 stage 5 (a worker fallback
  swaps its inside, not the binding), so it is passed as a value;
- the other `let`s that several regions write (physState, pendingWin,
  perfLine, ...): state, not scene objects. Until a module owns one, code
  moved out of main() reads it through a getter, or a get/set pair, in
  the object main.ts passes (StampDeps, ProbeCtx).

#### What moved (steps 3-5)

Old lines are main.ts at 1646491. Each commit message carries the same
map and its non-move edits. With those edits undone the moved text is
byte-identical (observed: the `--color-moved` review of all three
commits, and for step 5 a mechanical undo, `verify_step5.mjs`).

| Step | Commit | Old | New | Non-move edits |
|---|---|---|---|---|
| 3 | 8af95e0 | 242-355: the comment and `createLoader()` | `src/ui/loader.ts` 3-116 | `export`; loader.ts imports `whenReduced` (main.ts no longer does); main.ts imports createLoader |
| 4 | bf5b3e3 | 168 (the build_info import); 173-180 (BUILD_STAMP and its comment); 4747-4762 and 4764-4784 (the stamp, wallStart, perf, updateStamp and its first call, the gl console line) | `src/app/stamp.ts` 2; 7-14; 43-79, inside `createStamp(deps, scene)` | `ps?.simTime` → `scene.ps?.simTime`; `perfLine` → `deps.perfLine()` (main.ts keeps `let perfLine`, 4763 at 1646491, and passes a getter); `export` on BUILD_STAMP, text unchanged; StampDeps, StampPerf, Stamp; main.ts destructures `{ stamp, perf, updateStamp }` under the old names |
| 5 | f0035bb | 4786-5648 (MR16: the "live design params" comment and the 45 statements that set the hooks) | `src/app/probe_hooks.ts` 160-1022, the body of `installProbeHooks(ctx: ProbeCtx)` | 253 of the 863 lines: 208 `ctx.<name>`, 90 `ctx.scene.<field>`, 10 shorthand `{ x }` → `{ x: ctx.x }`, 3 `renderDirty = true` → `ctx.invalidate()`; the nine imports only MR16 used move with it; main.ts calls `installProbeHooks({...})` at the same place, before the first `rebuild()` |

main.ts loses 840 lines: 5653 to 4813 before the rebase, 5709 (master
bca7dd6) to 4869 after it. The re-map at the branch head is
`rebased/remap_37ddbf3.md` (before the rebase, `remap_c49f63f.md`), made
with `anchors_c49f63f.json` (env `ANCHORS=<file>`; the 1646491 anchors
name statements that moved). At 37ddbf3: `main()` 231-4867, `scene` 475,
`createLoader()`'s call 560, `let perfLine` 4712, `createStamp` 4713,
`installProbeHooks` 4719-4865, the first `rebuild()` 4866 (at c49f63f:
230-4811, 462, 543, 4656, 4657, 4663-4809, 4810).

ProbeCtx (probe_hooks.ts 46-157) holds the SceneRef, 26 assigned-once
values, 24 functions, 24 read-only `let`s as getters, 3 read-write `let`s
as get/set pairs (hcLookChoice, chaseRunning, tapsWait) and `invalidate()`.
Every hook reads ctx when it runs. MR16 had no install-time read of a
reassigned name, so moving the install changes no ordering.

**Hook inventory** (observed): 48 `window.__knot*` names set and 49
named across `src/`, at 1646491 and at step 5 before the rebase (c5520b9),
the same sets (`hooks_master_1646491.txt`, `hooks_branch_step5.txt`).
After the rebase: 49 set and 50 named at bca7dd6 and at 37ddbf3, the
same sets (`rebased/hooks_set_*.txt`, `rebased/hooks_named_*.txt`); the
one new name is K307's `__knotWarmup`, set in
`src/render/shader_warmup.ts`, outside the moved code. `__knotHostOpts`
is named (read) but never set. `__knotUndo` stays in main.ts (the undo
region, MR11), and `__knotSplineBend` stays in the renderer.

#### The host seam (step 6, 0f789b5)

`test/physics/host_seam.test.ts` scans main.ts and every `.ts` under
`src/app/` (keys `main.ts` and `app/<file>`). It collects the fields
annotated `ParticleSystem` or a host type across the scanned files
(interface and type-literal members, class fields, getters; today
SceneRef.ps and ProbeCtx's ps and host). It reports a write through such
a field, or through a destructured copy of one (`const { host } = deps`,
`({ ps }: SceneRef)`). New tests:
- the scanned keys and the collected fields;
- three writes planted in probe_hooks.ts, each reported once;
- ten writes through cross-file fields, each reported (among them
  `ctx.ps.step = () => {};` and `scene.ps!.positions.set(other);`), and a
  block of reads and host calls that reports nothing.

vitest: 6 passed (observed, `vitest_host_seam_step6.txt`). Limits: a field
matches by name across files, so an unrelated `.ps` or `.host` would count
(nothing writes through one today); nested binding patterns and element
access (`x["ps"]`) are not covered.

#### Lore and the tree (step 7, c454fe9)

gameplay.md's `paths:` gains `src/app/**` and probes.md's
`src/app/probe_hooks.ts`; their `docs/lore_index.md` rows match.
CLAUDE.md's Project Structure gains `ui/loader.ts` and one `app/` line
(scene_ref, stamp, probe_hooks; each file's header maps it), and its
host_seam line says main + src/app.

#### The rebase onto K307 stage 2 (bca7dd6)

At 05:50 the coordinator asked for a rebase onto master, where K307
stage 2 (the shader warm-up, ce5e4d9..14d34b5, ledger bca7dd6) had
landed, before the final checks. It was light: `git rebase master`
applied all eight commits without a conflict. K307 adds 63 lines to
main.ts and removes 7, in ten hunks, none inside a moved region
(observed, `git diff 1646491 bca7dd6 -- src/main.ts`): an import (MR1),
the `warmup` const and its wave-1 callback (MR4), `let warmHoldFrom`
(MR5), the gate in beginLoading, loadingTick, beginSettle, presettleTick
and the new warmHoldTick (MR7), and the ticker's background hold, wave 2
and `warmup.poll()` (MR14). All of it stays in main.ts. The launch notes
expected its loader rule to touch `createLoader()`. On master the rule
is in main.ts's `loader.show()` conditions (`!warmup.wave1Done`) and
`createLoader()` is unchanged, so the moved loader carries the gate with
no edit and its behavior is unchanged.

`test/render/program_registry.test.ts` scans `src/` for program sites
and must match its per-file table exactly. main.ts, `src/app/` and
`src/ui/loader.ts` have none, so the moves change no count (inferred
from its pattern; `npm test` passes after the rebase, see Checks).

| Step | Before the rebase | After |
|---|---|---|
| 1, the re-map | 686e5ad | 2d2b6d2 |
| 2, SceneRef | 163724a | a829d70 |
| 3, the loader | 4366783 | 8af95e0 |
| 4, the stamp | a0dd1bd | bf5b3e3 |
| 5, the probe hooks | c5520b9 | f0035bb |
| 6, the host seam | 86fb67b | 0f789b5 |
| 7, lore and the tree | c49f63f | c454fe9 |
| the handoff's WIP | cbeb92f | 37ddbf3 |

The commit messages' line maps and the Old column above are main.ts at
1646491, and they stay valid: K307's lines sit outside them, and step
5's mechanical undo matches MR16 at bca7dd6 byte for byte (observed,
`rebased/verify_step5_vs_bca7dd6.txt`). At 37ddbf3 the re-map puts
`warmup` in MR4 (418; read 6 times by MR7 and 4 by MR14) and
`warmHoldFrom` in MR5 (532; written by MR7, read by MR7 and by MR14's
ticker), so the load (M4) and the frame loop (M3) share one more `let`,
as they share `perfLine`.

#### What is left

- **M2 onward** (section 5.2). Re-run the re-map at each stage's base,
  with `anchors_c49f63f.json` (or its successor).
- **An owner replaces a getter.** When a stage moves a `let` that the
  stamp or the hooks read (ProbeCtx's 24 getters and 3 get/set pairs,
  `perfLine`, `invalidate`), the `createStamp(...)` and
  `installProbeHooks({...})` arguments point at the new owner. MR7 (M4)
  and MR14 (M3) write `perfLine`. The cost rings, which `__knotPerf` reads,
  go with the frame loop (M3).
- **PhysState** is spelled out in ProbeCtx, because main.ts's local
  `type PhysState` is not exported. Export it from its owner (M3 or M4)
  and import it in probe_hooks.ts.
- **`__knotUndo`** moves with the undo region (M7a, `design_history.ts`).
  `__knotWarmup` (K307) is set in `src/render/shader_warmup.ts`, so no
  stage moves it.
- **K307's warm-up state** (`warmup` in MR4, `warmHoldFrom` in MR5, the
  gate in MR7 and MR14) moves with those regions; see the rebase section.
- **Not mine to edit:** `.claude/rules/physics-worker.md`'s invariant line
  and CLAUDE.md's overview sentence say "main.ts writes physics only
  through the host (`host_seam.test.ts`)". The scan now covers src/app
  too.

#### Checks

Paths are under `.claude/probes/K5/stage1/` (untracked). Two rounds, each
in one perf-lock hold by `checks.ps1`: after the rebase (base master
bca7dd6, ref 37ddbf3) and before it (base 1646491, ref c49f63f). Each
build is made by `scripts/preview.ps1` and served on 5840 / 5841. 37ddbf3
is the handoff's WIP commit; this commit changes only this document, so
its `src/` and `test/` are what the round tested.

##### After the rebase (bca7dd6 vs 37ddbf3)

The checks that need no lock ran by `rebased_checks.ps1` (summary
`rebased/rebased.log`). The rest ran in one perf-lock hold, 05:53-06:01
(`checks.ps1 -Base bca7dd6 -DiagSettleMs 20000`; summary
`checks_rebased/checks.log`).

- **tsc at each rebased commit** (observed): exit 0 at 2d2b6d2 and at
  every commit from bf5b3e3 to 37ddbf3. a829d70 and 8af95e0 give
  TS6133, as they did before the rebase (Surprises;
  `rebased/tsc_<sha>.txt`).
- **Step 5's mechanical undo** (observed): the body equals bca7dd6's
  MR16 byte for byte (`rebased/verify_step5_vs_bca7dd6.txt`).
- **The hook inventory** (observed): under `src/`, 49 hooks are set and
  50 named, and the sets are the same at bca7dd6 and at 37ddbf3
  (`rebased/hooks_*.txt`). The one hook K307 adds is `__knotWarmup`.
- **The re-map at 37ddbf3** (observed): `rebased/remap_37ddbf3.md`.
- **`npm test`** (observed): exit 0, 107 s. 84 files passed and 1 was
  skipped; 1150 tests passed and 1 was skipped
  (`checks_rebased/npm_test.txt`).
- **`npm run build`** (observed): exit 0, 5 s.
- **The bare link at a 20 s settle** (`scripts/diag_screenshot.mjs`;
  `checks_rebased/diag_*`), observed on both builds:
  - the worker host, asleep at sim 5.0 s / wall 19.9 s, settle lag 1.35
    and 1.36 s;
  - the first sleep ended the budget phase after 6166 and 6197 ms (sim
    5.03 and 5.04), and the pre-settle took 492 and 498 ms (ended by
    work);
  - frames: median 17.7 ms, p95 18.1, max 2818 and 2786 (n 958 and 960);
  - no errors, and the same 12 console lines once the SHA is masked.

  At 20 s the capture no longer races the first sleep, as the 12 s one
  did before the rebase.
- **The same-state A/B** (`checks_rebased/ab*`), observed:
  - knot: 0 px (k83_ab exits 1 after its captures, as before);
  - fabric, three moves: 0 px;
  - fog, three moves: 912 px, maxΔ 43. k83_ab puts 148 in the start
    marker's footprint, 1 in the head's and 763 outside;
  - the fog control, base against base: 185 px, maxΔ 53, none in a
    marker.

  The start marker's 148 px looked like the one difference no control
  shows. Later same-build controls show them too: see "The start marker
  under fog" below.
- **The daily's front door** (observed): 4/14 on both builds. The same
  ten checks fail with the same values as before the rebase, and there
  are no page errors.
- **K7's frames** (`checks_rebased/k5m1r_*.txt`), observed: the builds
  match within noise. K307's warm-up moved both builds against the round
  before the rebase: the first sleep comes earlier and the intro runs
  faster.

  | | base phw=0 | ref phw=0 | base phw=1 | ref phw=1 |
  |---|---|---|---|---|
  | host | in-thread | in-thread | worker | worker |
  | first sleep: wall s, sim s | 18.76, 5.0 | 18.59, 5.0 | 9.90, 5.0 | 9.88, 4.98 |
  | intro fps; ms per substep | 39.2; 10.44 | 39.5; 10.43 | 55.7; 10.66 | 55.6; 10.69 |
  | drag fps; frame p50 ms | 7; 141.8 | 7; 142.1 | 55.7; 17.7 | 56.2; 17.7 |
  | errors; contexts lost | 0; 0 | 0; 0 | 0; 0 | 0; 0 |

  The worker's after-intro window is 6 frames long (0.11-0.14 s), so its
  fps (42.8 on base, 56.7 on ref) turns on one 35 ms frame. From first
  visible to sleep they read 55.4 and 55.6 fps.

##### The start marker under fog

Both rounds' fog A/Bs put exactly 148 px in the start marker's
footprint (all Δ 1 before the rebase, on the ring's and the glyph's
anti-aliased edges), and both base-against-base controls put 0 there.
`fog_bisect.ps1` asked whether that is M1, in two perf-lock holds
(06:05-06:07 and, with `-Controls`, 06:09-06:11; summary
`fogbisect/fogbisect.log`). Each pair is one k83_ab run of the same fog
recipe, three moves:

| A against B | px | maxΔ | in the start footprint |
|---|---|---|---|
| bca7dd6 against 2d2b6d2 (step 1: bca7dd6's `src/`, another SHA) | 7840 | 1 | 148 |
| 37ddbf3 against itself | 7979 | 49 | 148 (and 1 in the head's) |
| bca7dd6 against itself | 6260 | 43 | 148 |
| 2d2b6d2 against itself | 5515 | 49 | 0 |
| bca7dd6 against itself, again | 4054 | 1 | 148 |

- Observed: the 148 px come and go between runs of one build on one
  server. Over all nine fog runs they appear in six: every run against
  another build and three of the six same-build controls.
- Inferred: they are not M1's. A build with base's own `src/` shows them,
  and so does base against itself. Every run that differs there differs
  by exactly 148 px, which points to two discrete states of something
  the recipe does not pin at the start marker, not to a drift; which
  state a page lands in varies by run. What it is has not been
  identified (ledger item).

##### Before the rebase (1646491 vs c49f63f)

One perf-lock hold, 05:38-05:46; the summary is `checks/checks.log`.

- **tsc** (observed): `npx tsc --noEmit` exits 0 at c49f63f
  (`tsc_c49f63f.txt`, empty).
- **The moved-code review** (observed): `review_moves.mjs` runs git's
  `--color-moved` on each move commit. The lines it does not show as
  moved are listed in `review_<sha>.txt` (summary `review_moves.md`),
  and they are the edits in the table above.
- **Step 5's mechanical undo** (observed): `verify_step5.mjs` undoes the
  253 edits, and the body then equals MR16 byte for byte, against HEAD's
  main.ts before the move (`verify_step5.txt`) and against 1646491's
  (`verify_step5_vs_1646491.txt`).
- **The hook inventory** (observed): see above.
- **host_seam** (observed): 6 passed (`vitest_host_seam_step6.txt`).
- **`npm test`** (observed): exit 0, 107 s. 82 files passed and 1 was
  skipped; 1133 tests passed and 1 was skipped (the manual sweep)
  (`checks/npm_test.txt`).
- **`npm run build`** (observed): exit 0 (`checks/npm_build.txt`).
- **The bare link (today's daily), `scripts/diag_screenshot.mjs` at its
  default 12 s settle** (`checks/diag_base.*`, `checks/diag_ref.*`):
  - Observed on both: exit 0, the worker host, no errors, and a frame
    median of 17.6 ms. Each stamp names its SHA.
  - Observed difference: base was captured asleep, with its first sleep
    11.0 s into the budget phase. Ref was awake at the same sim 5.0 s /
    wall 11.9 s (`mv 2.1e-3`) and had no first-sleep record yet.
  - Inferred: a race at the capture, not a regression. On the worker,
    the first sleep lands within about 0.2 s of the 12 s capture (K7's
    frames below: 12.13 s on base, 12.12 s on ref). M1 touches neither
    the host, the worker nor the frame loop.
  - `recheck_sleep.ps1` (settle 20 s, base, ref, ref, base) was written
    to test that but never ran: the lock was busy, and the rebased
    round's 20 s capture (above) took its place.
- **The same-state A/B** (`.claude/probes/K83/k83_ab.mjs`, base vs ref,
  query `k5ab&phy=0&am=instant&fw=0&snd=none`). `ab_compare.mjs` counts
  the raw pixels. Outputs: `checks/ab/`, `checks/ab_*.txt`,
  `checks/abcmp_*.txt`.
  - Knot (`&mf=0`) (observed): 0 px. k83_ab exits 1 after its captures
    (no markers, see Surprises).
  - Fabric, three moves (observed): 0 px.
  - Fog (`&xp=fog`), three moves (observed): 1003 px, maxΔ 49, spread
    over the frame (x 135-1212, y 0-839), mostly along the fog's fringe
    around the revealed knot (`checks/ab/fog3_diff.png`). k83_ab puts 148
    inside the start marker's footprint: all Δ 1, on the ring's and the
    glyph's anti-aliased edges (`diff_regions.mjs` on the box 380,245 to
    470,335: 148 px, maxΔ 1; `checks/ab/fog3_start_box.png`; the control
    has none there). Only 25 px lie in the top 20 rows
    (`checks/ab_fog3_regions.txt`): k83_ab's `outPts`, which looked
    like a top-left strip, lists just the first 20 points in scan order.
  - The fog control, base against base (`checks/abctl/`) (observed):
    5512 px, maxΔ 43, none in a marker, mostly one patch in the left
    background (x 66-1164, y 0-899; `checks/abctl/fog3_diff.png`,
    `checks/abctl_fog3_regions.txt`).
  - Inferred: under fog the recipe leaves a dither-level field unpinned
    (the fog or the background it draws), so this case does not reach
    0 px even for master against itself (probes.md records 0, or 76 px
    with mist). The A/B differs less than the control does. Its 148
    start-marker pixels also appear when a build is compared with
    itself ("The start marker under fog" above), so they are not M1's.
- **The daily's front door** (`.claude/probes/K19-K20/probe_daily.mjs
  front`; `checks/daily_front_*.txt`):
  - Observed: 4/14 on both builds. The same ten checks fail with the
    same values; only `?am=instant`'s random seed differs. No page errors.
  - Inferred: probe drift, not M1.
    - The eight daily cases want a HUD title (`#maze-hud .km-title`)
      that neither build has (`hudTitle: null`).
    - `?daily=1.aBMge` wants a design; both builds open daily #1.
    - `?1471kin.c`, a v3 token, wants a token; both write a bare seed
      (K132).
- **K7's frames** (a copy of `.claude/probes/K7/stage4/k7_frames.mjs`,
  `?1471kin.J&phw=0|1 --drag`; `checks/k5m1_*.txt`, `k7_results.jsonl`):
  observed, the two builds match within noise.

  | | base phw=0 | ref phw=0 | base phw=1 | ref phw=1 |
  |---|---|---|---|---|
  | host | in-thread | in-thread | worker | worker |
  | first sleep: wall s, sim s | 20.95, 5.0 | 20.85, 5.0 | 12.13, 5.03 | 12.12, 5.03 |
  | intro fps; ms per substep | 21.8; 10.42 | 21.8; 10.51 | 30.3; 10.67 | 30.4; 10.65 |
  | drag fps; frame p50 ms | 7.0; 141.9 | 7.0; 141.8 | 55.8; 17.6 | 55.8; 17.7 |
  | errors; contexts lost | 0; 0 | 0; 0 | 0; 0 | 0; 0 |

  The in-thread drag (12 substeps a frame) runs at 7 fps on both builds.
- **The re-map at c49f63f** (observed): `remap_c49f63f.md`, made in 2 s.
- **Not run:** the phone, and a frame-time check (section 7: M1 moves no
  hot path).

#### Surprises

- The host is an assigned-once `const` (K7 stage 5), not the SceneRef
  field the design expected.
- The design's SceneRef lacked buildHueGroup and buildStrandCount, which
  rebuild() reassigns like the rest.
- STATS_KEY, MAZE_STATS_KEY and the cost rings stay in main.ts: MR3 and
  MR9 read the keys, and the frame loop and `__knotPerf` use the rings.
- MR7 and MR14 write `perfLine`, so it stays in main.ts behind a getter.
- MR17 is new: the first `rebuild()` runs after the hooks are installed.
- MR16 also writes hcLookChoice, chaseRunning and tapsWait; they now go
  through setters.
- Steps 2 and 3 fail tsc with TS6133 ('scene' is declared but never
  read: main.ts 605 at a829d70, 491 at 8af95e0); step 4's stamp is its
  first reader, and every commit from step 4 on is tsc-clean (observed at
  each rebased commit, `rebased/tsc_<sha>.txt`). `npm run build` runs tsc
  first, so it fails at those two commits; `scripts/preview.ps1` runs
  `vite build` alone and builds them (inferred from the scripts, not
  run). A bisect through them uses preview.ps1 or skips them. If every
  commit on master must pass `npm run build` (the commit policy's "no
  partial or broken work"), squash steps 2-4 at the merge.
- The launch notes expected K307's loader rule to edit `createLoader()`;
  it went into main.ts's `loader.show()` conditions instead, so the
  rebase was conflict-free.
- 25 lines of probe_hooks.ts pass 80 columns against MR16's 12: the
  `ctx.` prefixes lengthen them, and a pure move does not reflow. Prettier
  is not installed in the checkout.
- `tsconfig.json` includes `src` only, and vitest strips types without
  checking them, so nothing type-checks the tests. Step 6's test was
  checked through a temp config (`tsconfig.seam.json`).
- k83_ab attributes a difference to the fabric's markers, so a knot link
  (no markers) stops after its captures. ab_compare.mjs counts the raw
  pixels instead.
- The re-map's first report said main.ts had 5654 lines: it counted the
  empty string after the final newline. Fixed in remap.ts and the
  report.
## Stage M2 brief (2026-10-15, the coordinator)

**Stage:** K5 M2, the camera to `src/app/camera.ts` (section 5.2's M2
row). One stage: stop after M2 even with time left; M3 is its own brief.

**Start:** `Get-Date` first; your cap is **2 hours** from then. Your
branch must hold master `fdb38ac` or later (K7 stage 7's one boot line,
`new WorkerHost(() => rebuild(), { prebuild: params })`); if it does not,
`git merge --ff-only master`.

**Read first:** sections 2.1, 2.2 and 5.1, then "Stage 1 handoff" ("The
re-map", "Capture classification", "The SceneRef", "What is left",
"Surprises"). Do not read the whole of main.ts; read the regions you move.

**Setup and process:** as section 7 ("Setup"), with these changes:
- probes and results in the main checkout's untracked
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K5\M2\`; stage 1's
  tools (`remap.ts`, `checks.ps1`, `ab_compare.mjs`, `diff_regions.mjs`)
  are in `..\stage1\`: copy, don't edit them there;
- ports **5840-5849**;
- the perf lock covers tests and builds too:
  `pwsh C:\Users\lsl\Repositories\knotmaze\.claude\probes\K268\lock_take.ps1 -Owner 'K5 M2' -What '<what>'`,
  then `lock_release.ps1 -Owner 'K5 M2'`. No phone.

**Scope, one commit per step:**
1. **Re-map** main.ts at your base with stage 1's `remap.ts` and
   `anchors_c49f63f.json` (or its successor): the camera region's
   declarations, the `let`s it owns, who else reads or writes them, and
   what it calls. Write the camera's capture list under "### Stage M2
   handoff" at the end of this doc; commit (WIP).
2. **Move the camera** to `src/app/camera.ts` as `createCamera(deps:
   CameraDeps, scene: SceneRef)` (section 2.2). A `let` another region
   writes becomes an owner method; a `let` the stamp or the probe hooks
   read gets its `createStamp(...)` / `installProbeHooks({...})` argument
   pointed at the new owner ("What is left": an owner replaces a
   getter). The move is pure: no logic edits. If one seems needed, stop
   and write it into the handoff.
3. **Lore:** add `src/app/camera.ts` to `gameplay-camera.md`'s `paths:`
   and its row in `docs/lore_index.md`. Change no CLAUDE.md line.

**Files you own:** `src/main.ts` (the camera region and its call sites
only), `src/app/camera.ts`, the `createStamp`/`installProbeHooks`
arguments and `ProbeCtx` fields the move retargets, `gameplay-camera.md`'s
`paths:`, `docs/lore_index.md`, and this doc's "Stage M2 handoff".

**Running beside you:** K80 turns 3a edits main.ts's input and minotaur
paths (onHead, waitTurn, resetPathAction, the pad's wait). Stay out of
those; whoever merges second rebases. Stay out of `src/physics/**`,
`src/render/**` (K397's diagnosis and the R lane), `tweakpane_panel.ts`,
`scripts/**`, `LEDGER.md`, and every test.

**Checks** (section 5.1): tsc, `npm test`, `npm run build` at every
code commit (stage 1's TS6133 surprise: keep each commit tsc-clean); the
moved-code review per commit with the old → new map in each message; the
hook inventory, unchanged; `diag_screenshot.mjs` and
`.claude/probes/K7/stage4/k7_frames.mjs` on `phw=0` and `phw=1`; and the
same-state pixel A/B with the scripted input (a tap on a choice, a move,
a pinch zoom, a pan, a pluck, each captured once the view holds still)
on knot, fabric, fog and thread-reveal links, expecting 0 px. No hot
path moves, so no frame-time check.

**Helpers:** none.

**Stop rule:** stop when M2 is done or at the 2 h cap, whichever comes
first. `Get-Date` at the start and at each milestone. Commit WIP at
each step, broken or not; never push. A compaction is not a stop: after
one, re-read this brief, `git log -5` and your handoff before going on.
At the stop, finish "### Stage M2 handoff" (the capture list, what moved
with SHAs, what is left for M3, the checks with paths, surprises) and
report the commits, the checks, a `Ledger items` list and K5's handle
fields (owner, branch and last commit, evidence, next, brief).

### Stage M2 handoff

(K5 M2 agent, 2026-10-15, base master eb8436a; written step by step,
completed at the stop.)

#### The re-map (eb8436a)

`.claude/probes/K5/M2/remap_eb8436a.md` and `list_eb8436a.txt`, made by
stage 1's `remap.ts` (copied) with `anchors_c49f63f.json` (env
`ANCHORS=<file>`): every anchor still resolves. main.ts is 4872 lines;
`main()` runs 231-4870. The regions: MR1 imports 1-164, MR2 module
constants 165-228, MR3 boot 229-387, MR4 388-438, MR5 scene state
439-580 (`scene` 478), **MR6 camera 581-981**, MR7 load and settle
982-1221, MR8 scene build 1222-1533 (rebuild 1287), MR9 panel 1534-1898,
MR10 picking 1899-1964, MR11 session 1965-3241, MR12 keys 3242-3606, MR13
pointer 3607-4294, MR14 frame loop 4295-4714, MR15 stamp 4715-4721, MR16
`installProbeHooks({...})` 4722-4868, MR17 the first `rebuild()`
4869-4872.

#### The camera's capture list (MR6, eb8436a)

MR6 is 581-981, with its leading comment at 579-580. Its declarations and
who else uses them (line: name, outside users):
- 581 `fitTarget`, 584 `computeFitTarget()`, 658 `cam`, 698 `readPanel`,
  704 `stepPanel`, 712 `openPanelAt`, 722 `clampView`, 735 `easeView`,
  747 `applyView`, 754 `applyCam`, 841 `stepCamTween`: MR6 only.
  (`applyView` is in the design's export list, but nothing outside MR6
  calls it at eb8436a.)
- 656 `fitCur`, 687 `panAllow`, 720 `openPanel`: MR16 (ProbeCtx values).
- 657 `view`: MR8's rebuild writes its fields (1411-1413); MR16.
- 678 `headScratch`: MR11, 8 uses (frameWorld 2128-2132, returnToHead
  2258 and 2261).
- 679 `nowSec`: MR13 (4101, the double tap); MR16.
- 680 `touchCamera`: MR13 (3832, the pinch).
- 764 `followScale`: MR11 (2263, returnToHead).
- 784 `placeWorldAt`: MR13 (3825). 815 `zoomAt`: MR13 (3889). 826 `panBy`:
  MR13 (3891, 4050). 832 `resetCamera`: MR13 (3900, 4103).
- 862 `setCamFollow`: MR8 (1410). 884 `introPlaying`: MR11 (2264), MR14
  (4411, K307's wave 2). 889 `updateCamera`: MR14 (4553).
- 966 `function fitToScreen`: MR7 (1050 in finishLoading, 1211 in
  finishPresettle), MR8 (1419), MR9 (1894, the resize listener).
- **Not camera code, in MR6's span:** 770-783 `function syncExploration`
  (the exploration params onto the fabric; MR8 1368, MR9 1658, MR14 4506,
  MR16) and 837-839 `PEEK_HOLD` (read only by MR11's frameWorld, 2148).

The `let`s it owns (writes outside MR6 in bold):
- `fitRight` (583): MR6 writes; MR16's getter reads.
- `camFollow` (659): MR6 writes (setCamFollow); MR11 reads (2260), and
  MR16's getter.
- `camTouchedAt` (660): MR6 writes, and **MR11 2273** (returnToHead);
  MR16's getter reads.
- `viewHoming` (661): MR6 writes, and **MR8 1414** (rebuild) and **MR11
  2274** (returnToHead).
- `camTween` (667): MR6 writes, and **MR8 1415**, **MR11 2107**
  (startCamTween) and **MR11 2271** (returnToHead); MR16's getter reads.
- `panelWrap` (688): written once, at boot, by **MR9 1810** (after MR6).
- `panelT` (695), `panelBox` (697): MR6 writes; MR11 reads both (2095,
  the indicators' `panel`), and MR16's getter reads `panelT`.
- `panelU`, `panelTPrev`, `fitFrames`: MR6 only.

What it reads from outside (stage 1's three kinds):
- assigned once: `app` (module level), `root`, `params`, `motion`;
- the scene: `ps` 4 times (computeFitTarget), `fabric` 8
  (computeFitTarget 5, updateCamera 3), `reveal` 2 (introPlaying);
- module constants: FIT_MARGIN (166), MAX_ZOOM, FOLLOW_SPAN, FOLLOW_DELAY,
  FOLLOW_RAMP, FOLLOW_W and CAM_STEP (175-189). MR11 also reads
  FOLLOW_DELAY and FOLLOW_RAMP (2266); CAM_MAX_DT (190) is read only by
  MR14 (4552);
- imports only MR6 uses: `PANEL_TWEEN_S`, `clampFitView`, `easePanel`,
  `noAllowance`, `stepPanelTween`, `stepRange`, `OpenPanel`
  (`ui/view_clamp`), `Rect` (`ui/offscreen_indicators`). `EXPLORE_LOOKS`
  and `FabricMazeRenderer` are syncExploration's.

At boot MR6 only declares and calls `noAllowance()`. `fitToScreen` is the
one hoisted function other regions call. Its callers run after boot: the
ticker (loadingTick, presettleTick, both behind `if (!ps || !renderer)`),
rebuild (which calls `setCamFollow`, a `const`, first) and the resize
listener. So a `const` in its place, bound where MR6 was, is never read
before it exists.

The plan for step 2:
- `createCamera({ app, root, params, motion }, scene)` replaces MR6 at the
  same place; `ps`, `fabric` and `reveal` become `scene.<name>`.
- Handed back and destructured under the old names: the in-place objects
  (`fitCur`, `view`, `panAllow`, `headScratch`) and the functions other
  regions call.
- Getters for the `let`s others read (`fitRight`, `camFollow`, `panelT`,
  `panelBox`). The `let`s others write get a get/set pair, the owner's
  accessor (`camTouchedAt`, `viewHoming`, `camTween`, `panelWrap`), so a
  write such as `camTween = null` becomes `camera.camTween = null`, one
  token per line. The five ProbeCtx getters return `camera.<name>`.
- The module constants move to camera.ts's top. FOLLOW_DELAY, FOLLOW_RAMP
  and CAM_MAX_DT are exported for MR11 and MR14.
- syncExploration and PEEK_HOLD stay in main.ts.

#### What moved (2167d26, f47be3b)

- **2167d26** moves MR6 to `src/app/camera.ts` (494 lines) as
  `createCamera(deps: CameraDeps, scene: SceneRef)`, with CameraDeps =
  { app, root, params, motion }. main.ts goes from 4872 to 4493 lines.
  The commit message holds the old → new line map and lists every edit
  that is not a move.
- main.ts calls it where MR6 was: `const camera = createCamera({ app,
  root, params, motion }, scene)` (562 at f47be3b), then destructures the
  16 names other regions call or mutate in place (563-580). Those are
  the objects `fitCur`, `view`, `headScratch` and `panAllow`, and the
  functions `nowSec`, `touchCamera`, `openPanel`, `followScale`,
  `placeWorldAt`, `zoomAt`, `panBy`, `resetCamera`, `setCamFollow`,
  `introPlaying`, `updateCamera` and `fitToScreen`.
- The 8 `let`s other regions use stay on `camera`, never destructured:
  getters `fitRight`, `camFollow`, `panelT`, `panelBox`, and get/set
  pairs `camTouchedAt`, `viewHoming`, `camTween`, `panelWrap`. Their
  main.ts sites at f47be3b:
  - rebuild 1035-1036 (`viewHoming`, `camTween`);
  - the panel 1431 (`panelWrap`);
  - the indicators 1716 (`panelBox`, `panelT`);
  - startCamTween 1728 (`camTween`);
  - returnToHead 1881-1895 (`camFollow`, `camTween`, `camTouchedAt`,
    `viewHoming`);
  - the probe hooks 4408-4450.
- The module constants FIT_MARGIN, MAX_ZOOM, FOLLOW_SPAN, FOLLOW_DELAY,
  FOLLOW_RAMP, FOLLOW_W, CAM_STEP and CAM_MAX_DT now open camera.ts.
  main.ts imports three of them: FOLLOW_DELAY and FOLLOW_RAMP
  (returnToHead, 1887) and CAM_MAX_DT (the ticker, 4173).
- `ps`, `fabric` and `reveal` became `scene.<name>` (14 sites). The other
  edits are imports: the view_clamp import's path, `Rect` leaving
  main.ts's offscreen_indicators import, and camera.ts's type imports.
- The five ProbeCtx getters that read the camera's `let`s (camFollow,
  camTouchedAt, camTween, fitRight, panelT) return `camera.<name>`.
  ProbeCtx is unchanged, and so is `createStamp(...)`: the stamp reads
  none of the camera's state.
- **f47be3b** adds `src/app/camera.ts` to `gameplay-camera.md`'s
  `paths:` and to its row in `docs/lore_index.md`.

#### Checks

Everything is under the main checkout's untracked
`.claude/probes/K5/M2/`, and every path below is relative to it.
- **tsc, tests, build** ran at 2167d26, the one code commit (6dc5ac5 and
  f47be3b touch only docs and lore), under the perf lock:
  - tsc: clean;
  - `npm test`: 84 files (1 skipped), 1168 tests, 108 s;
  - `npm run build`: 5 s.

  Files: `step2/` (tests.ps1, tests.log, npm_test.txt, npm_build.txt).
- **Moved-code review**: `node review_moves.mjs step2 2167d26` wrote
  `step2/review_2167d26.txt`. camera.ts: +408 moved, +86 not. main.ts:
  -402/+3 moved, -20/+40 not. Every line that did not move is an edit
  the commit message lists.
- **Hook inventory**: unchanged, 49 `window.__knot*` hooks set and 50
  named at both eb8436a and f47be3b (`checks/hooks_set_*.txt`,
  `checks/hooks_named_*.txt`). Stage 1's `hooks_scan.ts` has been
  obsolete since M1, so this is a git grep.
- **The browser checks** compare eb8436a (base) with f47be3b (ref), using
  preview builds served by `vite preview` on 5840 and 5841, under the
  perf lock from 09:31 to 09:47. `checks_m2.ps1` ran them (phases up,
  probes and down), and `checks/checks.log` is its summary.
- **diag_screenshot**, bare link (Daily #4, the worker host): both builds
  were asleep at sim 5.0 s, wall 11.9 s. Frame median 17.9 ms on both;
  p95 18.1 ms (base) and 18.2 ms (ref). The consoles match, each with one
  `/favicon.ico` 404 from `vite preview`. Files: `checks/diag_base.*`,
  `checks/diag_ref.*`.
- **Same-state input A/B**, `m2_input_ab.mjs` (new): the scripted input
  runs on both builds with clocks pinned, and each step is captured once
  the view holds still. The base link is
  `?k5ab&phy=0&am=instant&fw=0&snd=none`. Per case:
  `checks/ab_<case>.txt` and `checks/ab/`; base-vs-base controls:
  `checks/abctl_<case>.txt` and `checks/abctl/`.

| Case | Steps | ref vs base | base vs base |
|---|---|---|---|
| knot (`&mf=0`) | pluck, zoom (3.32x), pan | 0 px | - |
| fabric | move, zoom, pan, pluck, move | 0 px | - |
| fabric2 (`checks_fabric2/`) | move, zoom, pan, pluck, zoomout, move | 0 px | - |
| follow (`&cam=follow`, 12 s settle) | move, zoom, pan, move | 767 px, all at load | 1718 px, all at load |
| fog (`&xp=fog`) | move x3, zoom, pan | 136 px (moves 1 and 3) | 7232 px |
| thread reveal (`&xp=threads`) | move x3, zoom, pan | 107210 px | 186026 px |

  The non-zero rows are capture timing, not the move:
  - in each differing step the two views differ by the camera's
    unfinished ease (follow's load scale is 69.230397 on base and
    69.230376 on ref, both on the way to 69.230769; after the reveal's
    third move it is 89.213 and 89.236);
  - every base-vs-base control differs in the same way and by more;
  - every step whose views match is 0 px.

  In the fabric case, the last tap missed on both builds: after the zoom
  its choice sat off-screen, so neither build moved. fabric2 zooms back
  out first, and both of its moves land on both builds (mentr_b → node_0
  → mnode_154). The script in `M2/` is that version: it adds `zoomout`
  and records each move's to, moved and onScreen.
- **The daily's front door**, `K19-K20/probe_daily.mjs front`: the same
  on both builds, 4/14 checks ok (`checks/daily_front_*.txt`,
  `checks/daily_base/`, `checks/daily_ref/`). The 10 failures come from
  the probe's stale expectations and fail on base too:
  - it reads the HUD title `#maze-hud .km-title`, which src no longer
    has;
  - it expects two old blobs (`?daily=1.aBMge`, `?1471kin.c`) to stay
    tokens.

  The only difference is `?am=instant`'s random seed.
- **k7_frames** (`K7/stage4/k7_frames.mjs`, copied here; link
  `?1471kin.J`, with the drag). Files:
  `checks/k5m2_<base|ref>_phw<0|1>.txt`.

| | phw=0 base | phw=0 ref | phw=1 base | phw=1 ref |
|---|---|---|---|---|
| host | in-thread | in-thread | worker | worker |
| first sleep (s); sim | 19.23; 5.00 | 18.97; 5.00 | 10.39; 5.03 | 9.97; 4.98 |
| visible to sleep: fps; cb p50 | 36.3; 27.0 ms | 37.0; 26.7 ms | 54.3; 16.1 ms | 55.1; 15.3 ms |
| drag: fps; cb p50 | 6.9; 143.0 ms | 6.9; 144.2 ms | 53.1; 17.8 ms | 55.2; 17.2 ms |
| errors; context lost | 0; 0 | 0; 0 | 0; 0 | 0; 0 |

  Every row agrees within run-to-run noise.

#### Left for M3 and later

- **The re-map**: M3 runs it with `anchors_f47be3b.json`. There, MR6
  anchors on `camera`, and MR2's text names the constants camera.ts now
  owns. It resolves at f47be3b: `remap_f47be3b.md` and `list_f47be3b.txt`
  (main.ts 4493 lines, `main()` 211-4491, MR6 562-602, MR14 3916-4335).
- **M3** (the frame loop) reads `introPlaying()` (4032, K307's wave 2)
  and, at 4173-4174, `CAM_MAX_DT` and `updateCamera(camDt)`. It can take
  `camera` itself as a dep instead of the destructured names
  (`ReturnType<typeof createCamera>`: camera.ts exports no named type
  yet).
- **M4** takes the camera calls in lifecycle and the scene build:
  - `fitToScreen()` in finishLoading (671) and finishPresettle (832);
  - in rebuild: `setCamFollow(false)` (1031), `camera.viewHoming =
    false; camera.camTween = null` (1035-1036) and `fitToScreen()`
    (1040);
  - syncExploration (581-594), which rebuild (989), a panel callback
    (1279) and the ticker (4127) call.
- **M5** (panel wiring): the `camera.panelWrap` write (1431) and the
  resize listener's `fitToScreen()` (1515).
- **M6** (pointer input) calls placeWorldAt, zoomAt, panBy, resetCamera,
  touchCamera and nowSec.
- **M7b**:
  - the indicators' `panelBox`/`panelT` (1716);
  - startCamTween (1720, its `camTween` write at 1728);
  - frameWorld (1744), which uses `headScratch` (1749-1753) and
    PEEK_HOLD (597, read at 1769);
  - returnToHead (1878-1895).
- Once a get/set pair's last writer has left main.ts, the pair can
  become a named owner method or a plain getter.
- `converged()`, from section 2.2's table, belongs to K6.

#### Surprises

- syncExploration and PEEK_HOLD sat inside MR6's span (eb8436a 770-783
  and 837-839). The move therefore took three ranges, and both stay in
  main.ts (581-597).
- Section 2.2's export list includes `applyView` (line 311), but nothing
  outside MR6 calls it, so camera.ts does not export it.
- The deps are `params` and `motion`, not 2.2's `settings`. The camera
  reads the URL params (threadWidth, mazeFabric, cameraMode, exploration,
  fowRadius) and `motion.reduced` (the panel tween), but never
  PanelSettings.
- Owner methods versus accessors: the brief says a `let` another region
  writes becomes an owner method. I used get/set pairs instead, which
  line 865 ("a setter or owner method") and lines 1139-1141 ("a getter,
  or a get/set pair") allow while the writers stay in main.ts. Each
  write keeps its shape with one prefix (`camTween = null` became
  `camera.camTween = null`), so the diff still reads as a move.
- `headScratch` is not the camera's alone: MR11's frameWorld and
  returnToHead use it as their own scratch. It is handed back as a
  shared object.
- computeFitTarget (every third frame, in every ticker branch) now reads
  `scene.ps` through the SceneRef getter three times per particle
  (camera.ts 64-66), where it used to read a closure `let`. k7_frames
  shows no difference, and no other frame-time check was asked for.
  Hoisting `const ps = scene.ps` would be a logic edit, so it is left.
- The prefixes pushed five lines past 80 columns: camera.ts 78, 93, 341
  and 353 (`scene.`) and main.ts 1431 (`camera.`). camera.ts 107, 181 and
  304 were over 80 already. The repo has no formatter config.
- gameplay-camera.md's K198 entry still says "main.ts `fitRight`"
  (line 38), and gameplay.md lists the file as "(with `src/main.ts`)".
  The brief allowed only the `paths:` edit, so I left both.

Stopped with M2 done, inside the 2 h cap (start 09:05).

## Stage M3 brief (2026-10-15, the coordinator)

**Stage:** K5 M3, the frame loop to `src/app/frame_loop.ts` (section
5.2's M3 row). One stage: stop after M3 even with time left; M4 is its
own brief.

**Start:** `Get-Date` first; your cap is **2 hours** from then. Your
branch must hold the master commit the launch prompt names (K80 turns 3a
merged) or later; if it does not, `git merge --ff-only master`.

**Read first:** sections 1.2, 2.1, 2.2 (the `frame_loop.ts` row and the
three kinds of capture) and 5.1; "Stage 1 handoff" ("Capture
classification", "The SceneRef", "What is left", "Surprises"); "Stage M2
handoff" ("The camera's capture list" as the pattern, "Left for M3 and
later", "Surprises"). Section 4 is K6's design: read 4.8 so the module
leaves K6 a place for the frame's decision, and build none of it. Do not
read the whole of main.ts; read the region you move and the call sites
the re-map lists.

**Setup and process:** as section 7 ("Setup"), with these changes:
- probes and results in the main checkout's untracked
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K5\M3\`; stage 1's
  tools (`remap.ts`, `checks.ps1`, `ab_compare.mjs`, `diff_regions.mjs`)
  are in `..\stage1\` and M2's anchors in `..\M2\`: copy, don't edit
  them there;
- ports **5840-5849**;
- the perf lock covers tests, builds and every timing:
  `pwsh C:\Users\lsl\Repositories\knotmaze\.claude\probes\K268\lock_take.ps1 -Owner 'K5 M3' -What '<what>'`,
  then `lock_release.ps1 -Owner 'K5 M3'`. Wait for it inside one
  blocking command. No phone.

**Scope, one commit per step:**
1. **Re-map** main.ts at your base with `remap.ts` and
   `..\M2\anchors_f47be3b.json` (MR14 was 3916-4335 at f47be3b; K80 3a
   has moved lines since). List MR14's declarations, the `let`s it owns
   (renderDirty, halted, flowParity and any others the re-map finds),
   every other region that reads or writes them (each
   `renderDirty = true` site), and every name the loop calls. Write the
   capture list under "### Stage M3 handoff" at the end of this doc;
   commit (WIP).
2. **Move the loop** to `src/app/frame_loop.ts` as
   `createFrameLoop(deps: FrameLoopDeps, scene: SceneRef)` (section
   2.2's row): flowParity, halted, renderDirty, wake, sceneAnimating,
   backgroundTick, the ticker callback, and tick with its helpers
   (fabricTick, flowRender, restFrame). It exports `invalidate()`,
   `wake()`, `start()` and `sceneAnimating()` (until K6).
   - Each `renderDirty = true` elsewhere becomes `invalidate()` (kind
     3).
   - A `let` the loop owns that another region reads goes through a
     getter.
   - A `let` another region owns that the loop writes (physState, whose
     owner is M4's lifecycle) comes in as a closure or a get/set pair, as
     M2 did.
   - The camera can come in as `camera` itself ("Left for M3").

   The move is pure: no logic edits. If one seems needed, stop and write
   it into the handoff.
3. **Lore:** add `src/app/frame_loop.ts` to the `paths:` of each rules
   file whose lore is about the frame (the ticker, the sleep gate, the
   settle budget, flow's half rate, the rest frame; `docs/lore_index.md`
   shows which ones name `src/main.ts`), and update their rows in
   `docs/lore_index.md`. Change no CLAUDE.md line.

**Files you own:** `src/main.ts` (MR14 and the call sites the move
retargets), `src/app/frame_loop.ts`, the `createStamp` and
`installProbeHooks` arguments main.ts passes, the `paths:` lines of step
3, `docs/lore_index.md`, and this doc's "Stage M3 handoff". K5 R1 edits
`src/app/probe_hooks.ts`: unless R1 is already in master, keep
`ProbeCtx`'s type and retarget only the arguments. A type change then
waits for R1's merge and goes into the handoff.

**Running beside you:** the launch prompt names them. Stay out of
`src/physics/**`, `src/render/**`, `tweakpane_panel.ts`, `scripts/**`,
`LEDGER.md`, and every test. Whoever merges second rebases; a hunk
another item adds to MR14 is ported by hand into `frame_loop.ts`
(section 6).

**Checks** (section 5.1):
- tsc, `npm test` and `npm run build` at every code commit (keep each
  commit tsc-clean);
- the moved-code review per commit, with the old → new map in each
  message;
- the hook inventory, unchanged;
- `diag_screenshot.mjs` and `.claude/probes/K7/stage4/k7_frames.mjs` on
  `phw=0` and `phw=1`;
- the same-state pixel A/B with the scripted input (a tap on a choice, a
  move, a pinch zoom, a pan, a pluck, each captured once the view holds
  still) on knot, fabric, fog and thread-reveal links, expecting 0 px;
- **the frame-time check: this stage moves a hot path.**
  `k7_frames.mjs`, rest plus a fixed wall-time drag, on master and on the
  branch, `phw=0` and `phw=1`, at least three runs each, under the perf
  lock. A pure move lands within noise. Over 5% on any row, look at V8's
  inlining before going on (section 5.1, item 4) and report what you
  find.

**Helpers:** none.

**Stop rule:** stop when M3 is done or at the 2 h cap, whichever comes
first. `Get-Date` at the start and at each milestone. Commit WIP at
each step, broken or not; never push. A compaction is not a stop: after
one, re-read this brief, `git log -5` and your handoff before going on.
At the stop, finish "### Stage M3 handoff" (the capture list, what moved
with SHAs, the frame-time table, what is left for M4 and later, the
checks with paths, surprises) and report the commits, the checks, a
`Ledger items` list and K5's handle fields (owner, branch and last
commit, evidence, next, brief).

### Stage M3 handoff

(K5 M3 agent, 2026-10-15, base master e6e1734; written step by step,
completed at the stop.)

#### The re-map (e6e1734)

`.claude/probes/K5/M3/remap_e6e1734.md` and `list_e6e1734.txt`, made by
stage 1's `remap.ts` (copied) with M2's `anchors_f47be3b.json`: every
anchor still resolves. main.ts is 4612 lines; `main()` runs 212-4610.
The regions: MR1 imports 1-162, MR2 module constants 163-209, MR3 boot
210-368, MR4 369-419, MR5 scene state 420-568 (`scene` 465), MR6 camera
569-609, MR7 load and settle 610-849, MR8 scene build 850-1161, MR9
panel 1162-1531, MR10 picking 1532-1597, MR11 session 1598-2911, MR12
keys 2912-3332, MR13 pointer 3333-4023, **MR14 frame loop 4024-4453**
(its leading comment is 4019-4023), MR15 stamp 4454-4460, MR16
`installProbeHooks({...})` 4461-4608, MR17 the first `rebuild()`
4609-4612.

#### The frame loop's capture list (MR14, e6e1734)

MR14's declarations, in order (line: name; outside users, writes in
bold):
- 4024 `flowParity`: MR14 only (restFrame).
- 4031 `halted`: **MR7 656** (loadingTick) and **786** (presettleTick),
  both `halted = true`; read only by tick (4160).
- 4034 `renderDirty`: **MR9 1423** (onMarkerSizeChange), **MR9 1470**
  (applyAccessibility) and **MR16 4605** (ProbeCtx `invalidate`), each
  `renderDirty = true`; read and cleared only by tick (takeDirty
  4326-4330, and 4416).
- 4035 `wake`: MR7 702 (replaySettle); MR9 1165, 1170, 1176, 1262, 1270,
  1272, 1300, 1316; MR11 2081, 2438, 2709, 2741; MR13 3397, 3657, 3729,
  3792, 3864; applyPhysicsMode 4060; MR16 4512 (ProbeCtx `wake`).
- 4041 `startSettling`, 4046 `freeze`, 4056 `applyPhysicsMode`, 4069
  `physicsInputsChanged`: the physics lifecycle (section 2.2 gives it to
  M4's `lifecycle.ts`), inside MR14's span. They stay in main.ts. tick
  calls freeze (4429, 4435); MR9 and MR16 use the other two.
- 4075 `frameCost`, 4080 `revealCost`: MR16 (ProbeCtx values).
- 4076 `frameCostN`, 4077 `frameCostTotal`, 4082 `revealMsTotal`: MR16's
  getters (4550-4555, 4577-4579). 4081 `revealMs`: MR14 only.
- 4089-4091 `lastViewX`, `lastViewY`, `lastViewS`: sceneAnimating only.
- 4092 `sceneAnimating`: MR14 only (backgroundTick).
- 4126 `sceneWasAnimating`: MR16's getter (4580-4582).
- 4127 `backgroundTick`, 4134 the ticker callback (`app.ticker.add`),
  4158 `tick` with its helpers fabricTick (4199), flowRender (4307),
  takeDirty (4326) and restFrame (4339): MR14 only.

The `let`s other regions own that the loop uses:
- MR5: `physState` (508), `settleWall0` (511), `warmHoldFrom` (522),
  `waitCueGlyph` (444), `waitCueHead` (446), all read only; **`pendingLoss`**
  (458; `= false` at 4267);
- MR11: **`pendingWin`** (2222; `= false` at 4263);
- MR13: **`snapMode`** (3337; `= "none"` at 4381 and 4385);
- MR15: **`perfLine`** (4454; the loop writes it at 4166, 4346, 4357,
  4407 and 4443, MR7 at 659 and 790).

What it reads from outside (stage 1's three kinds):
- assigned once: `app` (module level), `motion`, `a11y`, `params`,
  `host`, `look`, `settings` (MR3), `synth`, `background`, `root`,
  `ripples`, `warmup`, `confetti` (MR4), `panel` (MR9), `indicators`
  (MR11), `movePad` (MR12), `grabOrigin`, `dragPos` (MR13), and `perf`
  and `updateStamp` (MR15, declared after MR14; only the callbacks read
  them);
- functions: `physicsTuning` (MR5), `introPlaying`, `updateCamera` and
  `syncExploration` (MR6), `loadingTick`, `presettleTick`,
  `warmHoldTick` (MR7), `handRendererLook` (MR9), `showFabricWin`,
  `showFireLoss`, `tickChase`, `setWaitCue`, `tickTurnMino` (MR11),
  `keysLive`, `keyStep` (MR12), `autoAudioTick` (MR13), `freeze`
  (MR14, staying);
- the scene: `ps`, `renderer`, `fabric`, `fabricController`, `reveal`,
  `chase`, `turnMino`;
- module constants and imports only MR14 uses: `SETTLE_WALL_CAP_MS`
  (MR2 194, with its comment from 188), `CAM_MAX_DT` (camera.ts),
  `PLUCK_WHOLE_MAX` (`render/pluck_model`) and the `Ticker` type.

Timing: main() has no `await` after line 4019, so between MR14's
declarations and the first `rebuild()` only MR15's createStamp (which
reads `perfLine`) and the hook install run. src has one `ticker.add`
(4134), and Pixi's own render runs after it at LOW priority.

The plan for step 2:
- `createFrameLoop(deps, scene)` cannot stand where MR14 was: `perf` and
  `updateStamp` exist only after createStamp (MR15). main.ts calls it
  after createStamp, destructures `wake`, `invalidate`, `frameCost` and
  `revealCost`, then calls `loop.start()`, which registers the ticker
  callback. The registration moves from before MR15 to after it, with no
  `await` and no other ticker in between.
- startSettling, freeze, applyPhysicsMode and physicsInputsChanged stay
  in place for M4.
- The loop owns `halted` (a get/set pair: MR7's two writes become
  `loop.halted = true`), `renderDirty` (private: the three writes become
  `invalidate()`) and the counters MR16 reads (getters).
- The `let`s main.ts keeps come in through accessors on `deps`: getters
  for physState, settleWall0, warmHoldFrom, waitCueGlyph and waitCueHead,
  get/set pairs for pendingWin, pendingLoss, snapMode and perfLine. Moved
  lines say `deps.<name>`, one token, as M2's `camera.<name>`.
- introPlaying and updateCamera come in as the two functions, not
  `camera`, so their lines stay as they are.
- SETTLE_WALL_CAP_MS (with its comment) moves to frame_loop.ts's top;
  CAM_MAX_DT, PLUCK_WHOLE_MAX and `Ticker` are imported there and leave
  main.ts's imports.

#### What moved (2c8821c, 2f37306)

- **efa70f9** (WIP) wrote the re-map and the capture list above.
- **2c8821c** moves MR14 to `src/app/frame_loop.ts` (585 lines) as
  `createFrameLoop(deps: FrameLoopDeps, scene: SceneRef)`. main.ts goes
  from 4612 to 4286 lines. The commit message holds the old → new line
  map and lists every edit that is not a move. Moved (e6e1734 main.ts →
  frame_loop.ts):
  - 188-194 → 34-40: SETTLE_WALL_CAP_MS with its comment;
  - 4019-4040 → 137-158: the quiescence comment, flowParity, halted,
    renderDirty, wake, the sleep gate's comment;
  - 4073-4452 → 160-539: the cost rings, the K24/K6 hook, sceneAnimating,
    sceneWasAnimating, backgroundTick, the ticker callback (now the const
    `onTick`), and tick with fabricTick, flowRender, takeDirty and
    restFrame.
- main.ts calls it once, right after createStamp (4052-4132 at 2c8821c),
  then `const { wake, invalidate, frameCost, revealCost } = loop;` (4133)
  and `loop.start();` (4134), which registers the ticker callback.
- FrameLoopDeps (frame_loop.ts 45-94): the 37 names main() assigns once
  (values, and the functions the loop calls: introPlaying and
  updateCamera from the camera, freeze from the lifecycle that stays,
  loadingTick, presettleTick, warmHoldTick, tickChase, keyStep, ...), then
  accessors for the `let`s main.ts keeps: getters physState, settleWall0,
  warmHoldFrom, waitCueGlyph and waitCueHead; get/set pairs snapMode,
  pendingWin, pendingLoss and perfLine. Moved lines say `deps.<name>` for
  those and `scene.<name>` for ps, renderer, fabric, fabricController,
  reveal, chase and turnMino: 73 lines differ from e6e1734 only by those
  prefixes.
- The returned object: wake, invalidate, start, sceneAnimating, frameCost
  and revealCost; a get/set pair for halted; getters frameCostN,
  frameCostTotal, revealMsTotal and sceneWasAnimating. renderDirty is
  private.
- The retargeted sites in main.ts: loadingTick (647) and presettleTick
  (777) write `loop.halted = true`; onMarkerSizeChange (1414) and
  applyAccessibility (1461) call `invalidate()` (kind 3); ProbeCtx's
  getters frameCostN, frameCostTotal, revealMsTotal and sceneWasAnimating
  return `loop.<name>` (4227-4257), and its `invalidate` is the loop's.
  ProbeCtx's type and createStamp's arguments are unchanged.
- The `Ticker` type, PLUCK_WHOLE_MAX and CAM_MAX_DT left main.ts's
  imports (only the loop used them); frame_loop.ts imports them.
- A comment at frame_loop.ts 541-544 marks where K6 puts the frame's
  decision (section 4.8); none of it is built.
- **2f37306** adds `src/app/frame_loop.ts` to ten rules files' `paths:`
  and to their rows in `docs/lore_index.md`:
  - physics-sleep (the sleep gate's call), physics-settle (the settle
    budget; the loop holds SETTLE_WALL_CAP_MS and drives the presettle
    and the visible settle), physics-worker (the clock and the frame, the
    host-seam rule for `src/app/`);
  - gameplay-camera (the camera steps in every ticker branch),
    gameplay-motion (K239's hand-over before each pass, flowRender's
    rest passes), gameplay-indicators (indicators.update in every
    branch);
  - render-confetti (confetti.tick, a sceneAnimating term),
    render-backgrounds (the K24/K6 hook, backgroundTick, sceneAnimating),
    render-web-fade (the fade feeds sceneAnimating), render-shaders
    (K307's warm-up gates in the tick).

  Left out as passing mentions: gameplay-audio (setAutoGain each
  fabricTick), gameplay-moves (setWait from fabricTick), render-markers,
  render-explore and gameplay-fire (half-rate measurement notes),
  render-pluck, render-gaps and render.md. No CLAUDE.md line changed.

#### Checks

Everything is under the main checkout's untracked
`.claude/probes/K5/M3/`, and every path below is relative to it.
- **tsc, tests, build** of 2c8821c's code, the one code commit (efa70f9
  and 2f37306 touch only the doc and lore; they ran at 2f37306), under
  the perf lock:
  - tsc: clean (before the commit too);
  - `npm test`: 84 files passed (1 skipped), 1177 tests passed (1
    skipped), 108 s;
  - `npm run build`: 5 s.

  Files: `step2/` (tests.log, tsc.txt, npm_test.txt, npm_build.txt), run
  by `tests.ps1`.
- **Moved-code review**: `node review_moves.mjs step2 2c8821c` wrote
  `step2/review_2c8821c.txt`. frame_loop.ts: +359 moved, +226 not.
  main.ts: -346/+16 moved, -79/+83 not. `verify_step2.mjs` (new) then
  places every line by number (`step2/verify_2c8821c.txt`):
  - of the 409 moved lines, 334 are identical and 73 differ only by
    `scene.`/`deps.`; the other two are the ticker callback's first line
    (`app.ticker.add((ticker) => {` → `const onTick = (ticker: Ticker):
    void => {`) and its `});` → `};`;
  - the kept main.ts lines are identical except the 9 listed edits, and
    base lines 2, 157 and 4604-4606 are the listed cuts;
  - every line git leaves unmoved is one of the listed edits: 0 flagged.
- **Free names**: `step2/globals_check.txt`. The seven names in
  frame_loop.ts that resolve to the standard library (ArrayBuffer,
  Float32Array, Float64Array, Math, NaN, console, performance) were
  never main.ts locals at e6e1734, so none changed meaning.
- **Hook inventory**: unchanged, 49 `window.__knot*` hooks set and 50
  named at both e6e1734 and 2f37306 (`checks/hooks_set_*.txt`,
  `checks/hooks_named_*.txt`).
- **The browser checks** compare e6e1734 (base) with 2f37306 (ref), using
  preview builds served by `vite preview` on 5840 and 5841, from 11:17 to
  11:31. The perf lock was ours from 11:15 (the tests) to 11:31, and
  `checks.log` has no `LOCK NOT OURS` line. `checks_m3.ps1` ran them
  (phases up, probes and down), and `checks/checks.log` is its summary.
- **diag_screenshot**, 12 s settle (`checks/diag_*.png`, `.txt`):
  - the bare link (Daily #4, the worker host): both builds were asleep at
    sim 5.0 s, wall 11.9 s (lag 1.4 s base, 1.5 s ref). Frame median 17.9
    ms and p95 18.1 ms on both;
  - `?1471kin.J&phw=0` (in-thread): neither was asleep yet at wall
    11.9 s, as the in-thread first sleep near 19 s predicts. Sim 3.1 s
    (base) and 3.0 s (ref), settle lag 5.2 and 5.4 s; frame median 18.1
    and 18.2 ms, p95 36.1 ms on both;
  - the stamps name e6e1734 and 2f37306. The consoles hold the same lines
    in the same order: `vite preview`'s favicon 404, the build and seed
    lines, the same PixiJS attribute warnings (9 on the bare link, 5
    in-thread) and, on `.J`, the old-link warning that probes.md expects.
- **Same-state input A/B**, M2's `m2_input_ab.mjs` (copied), base link
  `?k5ab&phy=0&am=instant&fw=0&snd=none`. Per case: `checks/ab_<case>.txt`
  and `checks/ab/`; base-vs-base controls: `checks/abctl_<case>.txt` and
  `checks/abctl/`.

| Case | Steps | ref vs base | base vs base |
|---|---|---|---|
| knot (`&mf=0`) | pluck, zoom, pan | 0 px | - |
| fabric | move, zoom, pan, pluck, move | 0 px | - |
| fabric2 | move, zoom, pan, pluck, zoomout, move | 0 px | - |
| fog (`&xp=fog`) | move x3, zoom, pan | 438 px (moves 2, 3) | 4752 px (moves 1, 3) |
| thread reveal (`&xp=threads`) | move x3, zoom, pan | 246020 px | 460981 px |

  `checks/ab_summary.txt` (from `ab_summary.mjs`, new) lists every step's
  pixels, views and moves. Each non-zero row's control differs by more,
  and as in M2 I read them as capture timing, not the move:
  - fog: ref and base differ in moves 2 and 3 (355 and 83 px, maxΔ 35
    and 43), whose views match; in move 1 the scale differs in the sixth
    decimal and the pixels match. The two diffs I looked at
    (`ab/fog_2_move_diff.png`, `abctl/fog_3_move_diff.png`) are scattered
    single pixels inside the fogged knot and in the dark at the screen's
    left, the same in the control as in the A/B. That is the same-build
    fog difference K390 records (K5 M1's controls: 4054-7979 px);
  - the thread reveal: move 1 differs by 6 px (maxΔ 1). From move 2 on,
    the two views differ at capture (after move 2, x 487.597 vs 486.492;
    after move 3, s 89.176 vs 89.234), and the control's differ the same
    way (after move 3, s 89.969 vs 88.950): the camera's unfinished
    ease;
  - fabric's last tap misses on both builds, as in M2: after the zoom its
    choice is off-screen. fabric2's two moves land on both (node_0, then
    mnode_154).

- **The daily's front door**, `K19-K20/probe_daily.mjs front`: the same
  on both builds, 4/14 checks ok, with M2's 10 failures (the probe's
  stale expectations: the HUD title it reads is gone from src, and it
  expects two old blobs to stay tokens). The one line that differs is
  `?am=instant`'s random seed. Files: `checks/daily_front_*.txt`,
  `checks/daily_base/`, `checks/daily_ref/`.
- **Frame time**, `K7/stage4/k7_frames.mjs` (copied here), link
  `?1471kin.J`, rest then a 5 s drag, three runs per build and host with
  the build order alternating run to run. Files:
  `checks/k5m3_<base|ref>_phw<0|1>_r<1-3>.txt`; `k7_table.mjs` (new)
  wrote the table to `checks/k7_table.md`. Means of the three runs, with
  the range:

| | phw=0 base | phw=0 ref | change | phw=1 base | phw=1 ref | change |
|---|---|---|---|---|---|---|
| host | in-thread | in-thread | | worker | worker | |
| first sleep (s) | 19.43 (19.40-19.47) | 19.21 (18.96-19.46) | -1.1% | 10.17 (10.06-10.22) | 10.04 (10.02-10.07) | -1.2% |
| sim at sleep (s) | 5.00 (5.00-5.00) | 5.00 (5.00-5.00) | 0.0% | 5.02 (5.01-5.03) | 5.01 (4.99-5.03) | -0.2% |
| visible to sleep: fps | 36.1 (35.8-36.5) | 36.5 (36.0-36.8) | +1.0% | 55.0 (53.9-55.6) | 55.2 (55.0-55.4) | +0.4% |
| visible to sleep: cb p50 (ms) | 27.3 (27.1-27.4) | 27.0 (26.8-27.3) | -1.1% | 15.6 (15.4-15.7) | 15.3 (15.3-15.3) | -1.7% |
| visible to sleep: cb minus physics p50 (ms) | 16.5 (16.3-16.7) | 16.4 (16.2-16.6) | -1.0% | 15.6 (15.4-15.7) | 15.3 (15.3-15.3) | -1.7% |
| drag: fps | 6.87 (6.8-6.9) | 6.90 (6.9-6.9) | +0.5% | 55.2 (55.1-55.4) | 54.6 (53.3-55.3) | -1.1% |
| drag: cb p50 (ms) | 144.0 (142.9-145.2) | 143.2 (143.0-143.3) | -0.6% | 17.1 (17.0-17.2) | 17.3 (17.1-17.7) | +1.4% |
| drag: cb minus physics p50 (ms) | 18.3 (17.9-18.5) | 18.2 (17.9-18.4) | -0.5% | 17.1 (17.0-17.2) | 17.3 (17.1-17.7) | +1.4% |
| errors; context lost | 0; 0 | 0; 0 | | 0; 0 | 0; 0 | |

  No row moves past 5%. The largest change is 1.7%, the worker's
  visible-to-sleep callback, where ref is the faster: it read 15.3 ms in
  all three runs against base's 15.4-15.7 ms (cb minus physics equals cb
  with the worker, since the stepping runs off main). On all the other
  rows the two builds' ranges overlap. The move lands within noise, so V8's
  inlining (section 5.1, item 4) was not examined. M2's single runs
  agree: in-thread drag 6.9 fps at a cb of 143-144 ms, worker drag 53-55
  fps at about 17 ms, and first sleep near 19 s in-thread and 10 s with
  the worker.

#### Left for M4 and later

- **M4, the lifecycle**: startSettling, freeze, applyPhysicsMode and
  physicsInputsChanged stay in main.ts (4010-4040 at 2c8821c), just
  above the loop's creation. The loop and the lifecycle call each other:
  the loop takes `freeze`, `loadingTick`, `presettleTick` and
  `warmHoldTick` as deps, while applyPhysicsMode calls `wake()` and
  loadingTick and presettleTick write `loop.halted`. Whichever is
  created first takes the other's half as closures (for example
  `freeze: () => life.freeze()`), or one of them takes the other later.
  SETTLE_WALL_CAP_MS (frame_loop.ts 40) caps the visible re-settle that
  startSettling begins; it can follow the lifecycle or stay with the
  check in tick.
- **The deps accessors**, by owner: physState, settleWall0 and
  warmHoldFrom are the lifecycle's (M4); snapMode is the pointer
  input's (M6); waitCueGlyph, waitCueHead, pendingWin and pendingLoss are
  the session's (M7); perfLine is written by the load (MR7), read by the
  stamp, and written by the loop. Each pair becomes its owner's getter or
  method once the owner moves.
- **The camera**: the loop takes introPlaying and updateCamera, not
  `camera` itself, so those lines did not change. Passing `camera` is a
  retarget left for later.
- **ProbeCtx**: unchanged. Once R1 merges, it can take the loop (four
  getters, `invalidate`, `wake`, `frameCost` and `revealCost` in one), for
  which frame_loop.ts would export `type FrameLoop = ReturnType<typeof
  createFrameLoop>`.
- **K6**: the frame's decision goes at the comment at frame_loop.ts
  541-544. `start()` becomes the ticker's start/stop, flowParity the rest
  cadence, and invalidate() a ticker start.
- **Stale prose**: rules entries that name main.ts for code that now
  lives in frame_loop.ts. The brief allowed only `paths:` edits, so all
  are left:
  - gameplay-indicators.md 25: "main.ts calls indicators.update(camDt)
    in fabricTick";
  - gameplay-audio.md 32: "main.ts's fabricTick calls
    `synth.setAutoGain`";
  - render-backgrounds.md 35 and render-web-fade.md 39: "main.ts
    sceneAnimating()";
  - render-explore.md 373: exploreStill and exploreContrast "set by
    main.ts each fabric tick";
  - render-shaders.md 134-136: the background layer hidden until
    `warmup.wave1Done` is now backgroundTick's gate (the hold of the
    pre-settle is still main.ts's).
- **No lore on flow's half rate**: the brief lists it as a frame topic,
  but no rules file documents flowParity, so nothing attaches for it.

#### Surprises

- **The loop's `halted` is never cleared.** Its comment (frame_loop.ts
  148) says "Cleared on regenerate", the HALTED stamp line says
  "regenerate to reset", and 8838340 (2026-07-22), which added it, says
  regenerating clears the halt. But `git log -S 'halted = false'` finds
  only its own declaration (8838340, then 2c8821c's move) and the worker
  core's separate flag (270afbc), which a build and a settle job do clear
  (physics_worker_core.ts 479, 610). On the main thread only a reload
  clears it. Moved as it is, since a fix would be a logic edit.
- **The ticker callback now registers after createStamp**, because
  `perf` and `updateStamp` exist only from there. No order changes: it is
  the only `ticker.add` in src, Pixi's own render runs at its lower
  priority, and main() has no `await` between the two points.
- **Declaration order**: `loop.halted` (647, 777) and `invalidate()`
  (1414, 1461) sit above `const loop` (4052) in the file, as `halted =
  true` and `renderDirty = true` sat above their `let`s (4031, 4034)
  before. Each is inside a callback that first runs from the ticker or a
  user action, and nothing between the old and the new declaration
  points calls one.
- The prefixes pushed eight lines past 80 columns: frame_loop.ts 198,
  201, 204, 299, 309, 323, 371 and 494. Lines 227 and 331 were over 80
  already (e6e1734 4140 and 4244).
- Of the frame lore's rules files only gameplay-camera named
  `src/main.ts`; the others attached through their own modules' paths, so
  step 3 mapped the brief's topics to the files that hold them.
- Git's color-moved pairs some removals with unrelated new lines: 24 new
  frame_loop lines (braces, blanks, invalidate's `renderDirty = true`,
  the getters' returns) and 16 in main.ts's new block (braces). It is
  harmless, and `verify_step2.mjs` places every line by number instead.
- tsc was clean on the first compile of the move.

Stopped with M3 done at 11:35, inside the 2 h cap (started 10:17, cap
12:17). Nothing is pushed.

## Stage M4 brief (2026-10-15, the coordinator)

**Stage:** K5 M4: the lifecycle to `src/app/lifecycle.ts`, the scene
build to `src/app/scene.ts` and the audio map to `src/app/audio_map.ts`
(section 2.2's three rows, 5.2's M4 row). One stage: stop after M4 even
with time left; M5 is its own brief. If the cap comes first, stop after
a whole module, in this order: lifecycle, scene, audio map. Each module
is its own tsc-clean, tested commit, so a partial M4 still merges.

**Start:** `Get-Date` first; your cap is **2 hours** from then. Your
branch must hold master 8fecac3 (K114 stage 2 merged at cebb75e) or
later; if it does not, `git merge --ff-only master`.

**Read first:** sections 2.1, 2.2 (the three rows and the three kinds of
capture) and 5.1; "Stage M3 handoff" ("The frame loop's capture list" as
the pattern, "Left for M4 and later", "Surprises"); "Stage M2 handoff"
("Surprises"). Do not read the whole of main.ts; read the regions you
move and the call sites the re-map lists.

**Setup and process:** as section 7 ("Setup"), with these changes:
- probes and results in the main checkout's untracked
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K5\M4\`. M3's tools
  are in `..\M3\` (`remap.ts`, `anchors_f47be3b.json`,
  `remap_e6e1734.md`, `checks_m3.ps1`, `review_moves.mjs`,
  `verify_step2.mjs`, `ab_compare.mjs`, `m2_input_ab.mjs`,
  `globals_check.mjs`): copy, don't edit them there;
- ports **5980-5989**;
- the perf lock covers tests, builds and every timing:
  `pwsh C:\Users\lsl\Repositories\knotmaze\.claude\probes\K268\lock_take.ps1 -Owner 'K5 M4' -What '<what>'`,
  then `lock_release.ps1 -Owner 'K5 M4'`. Wait for it inside one
  blocking command. No phone.

**Scope, one commit per step:**
1. **Re-map** main.ts at your base (K114 stage 2 added fire-clock lines
   since e6e1734). For each of the three modules, list its declarations,
   the `let`s it owns (the lifecycle: physState, settleWall0, frozenSig,
   loaderShownAt, physSig, physicsLive, warmHoldFrom and any others the
   re-map finds; the scene: the `let`s behind the SceneRef; the audio
   map's), every other region that reads or writes them, and every name
   each calls. Write the capture lists under "### Stage M4 handoff" at
   the end of this doc; commit (WIP).
2. **The lifecycle** to `src/app/lifecycle.ts` as
   `createLifecycle(deps, scene)`, exporting 2.2's list (beginLoading,
   loadingTick, finishLoading, replaySettle, beginSettle, presettleTick,
   finishPresettle, startSettling, freeze, applyPhysicsMode,
   physicsInputsChanged, `state`).
   - Break the loop/lifecycle cycle as "Left for M4" says: whichever is
     created first takes the other's half as closures (for example
     `freeze: () => life.freeze()`); `loop.halted` writes stay calls on
     the loop.
   - physState, settleWall0 and warmHoldFrom become the lifecycle's
     getters where FrameLoopDeps reads them now; `type PhysState` is
     exported from lifecycle.ts.
   - SETTLE_WALL_CAP_MS stays in frame_loop.ts or follows the lifecycle:
     your call, named in the handoff.
3. **The scene build** to `src/app/scene.ts`: the scene `let`s,
   syncBackground, recolorScene and rebuild. `createScene()` returns the
   SceneRef plus rebuild, recolorScene and syncBackground; main.ts's
   SceneRef getters go with the `let`s. The SceneState fold is M8's.
4. **The audio map** to `src/app/audio_map.ts`: rebuildAudioMap,
   runForCtrl, freqForCtrl and pluckUnit.
5. **Lore:** add the new files to the `paths:` of each rules file whose
   lore is about the moved code (the load, the settle and its budget,
   the loader, the pre-settle and K307's warm-up gate, rebuild, the audio
   map), and update their rows in `docs/lore_index.md`. Change no
   CLAUDE.md line.

Each move is pure: no logic edits. If one seems needed, stop and write
it into the handoff.

**Files you own:** `src/main.ts` (the moved regions and the call sites
the moves retarget), `src/app/lifecycle.ts`, `src/app/scene.ts`,
`src/app/audio_map.ts`, `src/app/scene_ref.ts` if the SceneRef's type
has to change, `src/app/frame_loop.ts`'s deps (FrameLoopDeps' lifecycle
accessors, nothing else), the `createStamp` and `installProbeHooks`
arguments main.ts passes, the `paths:` lines of step 5,
`docs/lore_index.md`, and this doc's "Stage M4 handoff". R1 has merged,
so ProbeCtx's type may change; keep such changes small, since K5 R2 may
launch beside you.

**Running beside you:** the launch prompt names them. Stay out of
`src/physics/**`, `src/render/**`, `tweakpane_panel.ts`, `scripts/**`,
`LEDGER.md`, and every test. Whoever merges second rebases; a hunk
another item adds to a moved region is ported by hand into the new file
(section 6).

**Checks** (section 5.1):
- tsc, `npm test` and `npm run build` at every code commit (keep each
  commit tsc-clean);
- the moved-code review per commit, with the old → new map in each
  message;
- the hook inventory, unchanged;
- `diag_screenshot.mjs` on `phw=0` and `phw=1`;
- the same-state pixel A/B on the knot, fabric, fog and thread-reveal
  links, expecting 0 px; on fabric, also after a regenerate (a new seed,
  through the panel or a hook) and after a physics-mode switch (physics
  off, then on), since rebuild and applyPhysicsMode move;
- the load path moves (loadingTick, presettleTick and warmHoldTick run
  every frame while a design loads): time to the first sleep (the
  stamp's sim/wall, which `diag_screenshot.mjs` reports) on knot and
  fabric, `phw=0` and `phw=1`, master and branch, three runs each under
  the perf lock. A pure move lands within noise;
- the audio map: if a hook exposes runForCtrl or freqForCtrl, compare
  them over every ctrl on the knot and fabric links, master and branch;
  if none does, say so in the handoff.

**Helpers:** none.

**Stop rule:** stop when M4 is done or at the 2 h cap, whichever comes
first. `Get-Date` at the start and at each milestone. Commit WIP at
each step, broken or not; never push. A compaction is not a stop: after
one, re-read this brief, `git log -5` and your handoff before going on.
At the stop, finish "### Stage M4 handoff" (the capture lists, what
moved with SHAs, the checks with paths, what is left for M5 and later,
surprises) and report the commits, the checks, a `Ledger items` list
and K5's handle fields (owner, branch and last commit, evidence, next,
brief).
