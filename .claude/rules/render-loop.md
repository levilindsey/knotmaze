---
paths:
  - "src/app/frame_loop.ts"
  - "src/app/loop_flags.ts"
  - "test/app/loop_flags.test.ts"
---

# Render lore: the frame loop's flags (K6)

Written by K6-1 (2026-10-15). The brief, every flag's sources and the
measurements are in `docs/design/K6_1.md` ("The flags" and the Stage K6-1
handoff); `render.md` lists the area's other files.

## The flag ledger (K6-1)

- **What it is.** `src/app/loop_flags.ts` (pure: no Pixi, no DOM; tested
  in `test/app/loop_flags.test.ts`) keeps 14 bits: LOAD, PHYS, GEOM,
  FLOW, REVEAL, FX, PAINT, PAINT_AMBIENT, GAME, CAMERA, OVERLAY,
  BACKGROUND, AUDIO, INPUT. VISUAL is every bit but AUDIO and INPUT;
  AMBIENT is FLOW, PAINT_AMBIENT and BACKGROUND (the rest cadence's
  frames); SCENE_ACTIVE is VISUAL without BACKGROUND. main.ts creates the
  ledger FIRST (`createLoopFlags()`, before the camera, the scene and the
  lifecycle) and hands it to every module that pushes, so a module built
  before the loop can push (question 6).
- **Shadow only.** K6-1 records; every rAF still runs the whole tick and
  draws. The one reader is the background's drift pause (sceneActive,
  below). K6-2 skips CPU work by flag; K6-3 (= K24) skips the draw, stops
  the ticker and adds the rest cadence.
- **The frame boundary.** Frame N's need mask = the polls read at the end
  of frame N-1 | every push since. A POLL is read at a frame's end
  (`readPolls`, in `backgroundTick`) and asks for the next frame; a PUSH
  (`flags.push(bit)`) lands between frames or during one. Pushes: `wake()`
  PHYS|GEOM, `invalidate()` GEOM, a recolor GEOM, a rebuild LOAD|GEOM, a
  resize GEOM|CAMERA, the window's capture-phase input listeners INPUT
  (recorded only). The worker's sleep trip notes GEOM with
  `flags.defer(GEOM)` (question 2: the mirror jumps to the newest snapshot
  AFTER that frame's geometry pass, so nothing at fw=0 draws it until a
  later pass; K6-2's GEOM gating draws it).
- **The polls** are read-only and allocation-free: `host.needsFrame()`
  (PHYS: `!asleep` on both hosts, a WorkerHost delegating after a
  fallback; PHYS is also clear while paused, frozen or `halted`),
  `camera.converged()` and `indicators.needsFrame()` (CAMERA: no tween,
  homing, panel tween, fit or range ease, follow motion, or a show delay
  pending, at the root-move test's 0.01 px / 1e-5 scale),
  `renderer.paintNeedsFrame()` and `fabric.needsFrame()` (a two-bit
  number each: 2 ambient = declared pulses, the fog's wobble; 1 event = a
  pulse's fade-in window, a hovered pulse, a web fade, the fog's intro,
  the fire's FX, the explore growth and hold, the start fade, the halos),
  `background.needsFrame(dt)` (BACKGROUND, only on frames a texture pass
  is due; read in `backgroundTick` AFTER `background.tick`, since the
  clock answers "would a tick dt from now re-render": read before the
  tick, the flag landed a frame after each pass, and the shadow report
  counted every pass of a drift outliving the rest of the scene as
  UNDER), and the GAME and AUDIO accessors over state main.ts keeps.
  `src/render` and `src/ui` return plain numbers and import nothing from
  `src/app`.
- **A poll must never mutate.** Each one was checked to be a read
  (`exploreGrowing(0)` and WebFade's `level`, `has` and `active`
  included). A poll that stepped a clock would change what the frame
  draws, and the same-state A/B would not catch it under pinned clocks.
- **paintNeedsFrame has no dirty-rows term** (item 4 asked for one):
  rows written during a frame upload at that frame's render, and a write
  between frames comes from input, which is K6-3's push.
- **sceneActive replaces main.ts's sceneAnimating() as the background's
  input** (item 5). `backgroundTick` computes ((this frame's pushes | the
  polls read now) & SCENE_ACTIVE) != 0 and calls `background.tick(dt,
  active)`. The old body stays as the report's `legacy` observer
  (disagreements counted both ways); K6-2 deletes it. THE VISIBLE CHANGE:
  a fabric with no flow, no declared pulses and no fog (in practice a
  solved maze; an unsolved one declares its choices' pulses, which are
  PAINT_AMBIENT and so keep it active) pauses the drift 2.5 s after the
  confetti ends, and resumes with the next visual flag. The hook names
  stay (question 3): `loop.sceneWasAnimating`,
  `__knotConfetti().sceneAnimating` and `__knotA11y().animating` read
  sceneActive.
- **`halted` never clears on the main thread** (question 5; frame_loop's
  "Cleared on regenerate" is wrong): a halted page needs a reload.
  `__knotLoop().halted` reports it, and PHYS stays clear while it holds.
- **Probe hook:** `__knotLoop()` (probes.md, K6-1). Unarmed it costs the
  bit accounting and the polls; armed (`{track: true}`) it reads the whole
  framebuffer every frame, so timings taken while armed are void.
