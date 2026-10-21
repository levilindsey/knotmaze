---
paths:
  - "src/ui/offscreen_indicators.ts"
  - "src/ui/head_indicator.ts"
  - "test/ui/offscreen_indicators.test.ts"
  - "test/ui/head_indicator.test.ts"
  - "src/app/frame_loop.ts"
  - "src/ui/share.ts"
  - "src/ui/toast_place.ts"
  - "test/ui/toast_place.test.ts"
---

# Gameplay lore: off-screen indicators and the toasts

Moved verbatim from `gameplay.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `gameplay.md` lists the area's other files.

- OFF-SCREEN INDICATORS (K73, 2026-10-13; ui/offscreen_indicators.ts):
  a disc at the screen's edge, with its target's icon and a chevron
  facing the target, for every registered target that is off screen. A
  target registers its world position, marker radius, icon (SVG markup
  in the GLYPH_R box), style, visibility predicate, label and tap; the
  module owns the off-screen test (EDGE_MARGIN, HYSTERESIS), the edge
  placement inside the safe area, keeping clear of the chrome (HUD,
  badge, hamburger, banner, stats stamp; the open panel through
  `env.panel`, see PANEL SLIDE) and of the targets placed before it
  (layoutIndicators, pure and tested), the DOM and the per-frame update -
  main.ts calls indicators.update(camDt) in fabricTick after the camera
  step (the camera's dt, for the head's show delay), so in every ticker
  branch. THE FINISH is the
  first client (main.ts; the minotaur is the second, see REAL-TIME
  MINOTAUR): a
  black disc wearing the exit marker's own glyph and radius (K83:
  markerGlyphSvgFit into the GLYPH_R box; its on-screen test reads
  fabric.markerDotRadius(), the colored dot, since K98 - a glyph or size
  swap reaches both), shown in fabric mode, unsolved, once the intro has
  revealed the exit (the 0.98 gate fabric's marker uses; under the thread
  reveal also from the start since K465's `revealFinish`, default on, and
  only once the exit has been seen with `rvx=0`: `finishHold` in
  game/explore_finish.ts) and under fog of
  war too (Levi, 2026-10-13: direction only); a tap peeks at the exit
  (K488; ui/finish_peek.ts plans it: center the exit at
  min(current scale, followScale), never zooming in; the camera's free
  tween eases out past the fit clamp, holds 2.5 s and eases back to the
  pre-tap view; the label says "Tap to peek at the exit."), under fog a
  toast only. (Before K488 the tap framed the exit with the head through
  placeWorldAt's clamps, so at a thread-reveal start it ended where it
  began and the exit stayed off screen: K465's finding.) VIEWER PREFERENCES (localStorage + panel checkboxes, both
  default on, K84 sorts them later): finishIndicator, and tapToPan - off,
  every indicator is inert and taps go through it to the maze. K76 HOOK:
  finishIndicator.gate(pred) ANDs in a predicate (returns its remover;
  main.ts calls it nowhere today - the thread reveal's hold on the
  finish's indicator is a clause of its own visible() since stage 2c,
  `finishHold`, which K465's `revealFinish` can lift).
  THE HEAD is the third client (K148, 2026-10-14; ui/head_indicator.ts holds
  the pure decisions; registered after the finish, before the minotaur): a
  black disc wearing K83's head glyph (`fabric.markerGlyphId("head")`, a
  ring and a dot by default) at the marker's radius, shown whenever the
  head is off screen in a built fabric maze - the intro, play, after a
  finish, under fog, either camera (`headIndicatorWhy`: only knot mode or
  no maze ("no maze") and the hidden load settle ("loading") hide it; probe
  hook `headWhy`; "setting off" while the viewer switched it off). A
  TAP (`returnToHead`, `headReturnPlan`): the FIT camera
  eases (0.6 s; reduced motion jumps) to center the head at the zoom the
  player is at, as near as the pan clamp allows (a head at the maze's far
  edge lands at the range's limit, on screen); the FOLLOW camera eases onto
  its own framing of the head (`followScale`) and the spring is at full
  strength the moment the tween ends (`camTween.hold` = -(FOLLOW_DELAY +
  FOLLOW_RAMP); the minotaur's tap still passes PEEK_HOLD), so the follow
  resumes at once; mid-intro the follow target is the whole knot, so a tap
  only pulls the spring to full strength. A follow run of 14 moves never
  showed it at 1400x900 and flashed it once for 0.33 s at 411x753 (a long
  run outpaced the spring, and the shared off-screen test says "off
  screen"); K198 stage 2's show delay hides that (below). GLYPH BUG
  found here: the indicator's icon group sets its own stroke, which the
  glyph's filled dots inherited at the default width 1 (12.6 px once
  scaled), so the head's dot and the minotaur's bull eyes drew as
  disc-sized white blobs; `markerGlyphSvgMarks` dots now say
  stroke="none" (pinned in marker_glyphs.test.ts). Probe:
  `.claude/probes/K148_K149/probe.mjs fit | follow | slack | solve |
  reduced | fog` (each with `:phone`), flicker.mjs, both.mjs, intro.mjs.

- INDICATOR SETTINGS, SHOW DELAY, PANEL SLIDE (K198 stage 2, 2026-10-14;
  brief docs/design/K198.md). SETTINGS (Levi: settings for these, never
  link params): `headIndicator` and `minotaurIndicator` switches
  (localStorage `knotmaze.headIndicator` / `knotmaze.minotaurIndicator`,
  "0" = off, default on; Maze-folder checkboxes after finishIndicator, the
  minotaur's row only while `clock === "realtime"`; it sits in the Maze
  folder, not K174's Minotaur folder). Off = hidden (`headWhy` "setting
  off"; the minotaur's `visible` ANDs it in), so a hidden indicator has no
  element and takes no taps; tapToPan still makes a shown one inert. ONE
  SIZE for all three, `indicatorSize` (`knotmaze.indicatorSize`, a
  multiplier on INDICATOR_SIZE 50 px, INDICATOR_SCALE_MIN 0.6 to MAX 1.8,
  2 decimals; `parseIndicatorScale` clamps a stored value,
  `indicatorPrefs` reads all three): disc, glyph and chevron scale
  together (`sizeNow()`), the disc keeps INDICATOR_EDGE from the screen
  edge (`indicatorFrame`) and the layout spaces discs by size +
  INDICATOR_GAP. K98's `markerSize` (the markers in the maze) stays
  separate. SHOW DELAY: the head's indicator shows only after
  HEAD_SHOW_DELAY_S 0.45 s of continuous off-screen time
  (`IndicatorTarget.showDelay`, `stepShowDelay` on the camera's dt; status
  "pending" meanwhile, left out of the layout so nothing makes room for
  it) and hides at once. Blips measured: 0.33 s (K148), 0.326 s and
  0.141 s before stage 2 (`.claude/probes/K198/stage2/blips.mjs`, seeds
  7-9 at 411x753); after it, the blips the same runs met (0.28 s and
  0.04 s; play is chaotic, so not the same episodes) stayed pending and
  never showed, and a head panned off screen showed 0.48 s after the pan
  (desk 475 ms, phone 483 ms; 0 before). Only showing waits: a tap's
  plan (`headReturnPlan`) is unchanged, and the finish's and the
  minotaur's have no delay. PANEL SLIDE: the open panel is no longer an
  avoid box; `env.panel()` hands its box and the camera's tweened
  openness (`panelT`, gameplay-camera.md's FIT CAMERA PAN RANGE), and
  `layoutWithPanel` places each indicator without and with the panel and
  blends the two (`blendPlacement`: along the frame's perimeter by arc
  length, the shorter way, the chevron re-aimed), so a displaced disc
  slides to its place in the panel's 0.25 s instead of jumping (319 px at
  1400x900, 399 px at 411x753, one frame about 0.1 s late, since the avoid
  boxes refresh every 10 frames). Measured (`stage2/strip.mjs`): 8-10
  frames, at most 89-107 px a frame, done by 0.22-0.25 s after the
  toggle. On phone the sliding disc crosses OVER the open panel while
  it slides (the indicators sit above the panel; a fade would hide it,
  left for Levi). Probes: `.claude/probes/K198/stage2/` (rows.mjs: the
  rows, the size at 0.6/1/1.5/1.8, a hidden indicator and its taps;
  strip.mjs, blips.mjs + run_blips.ps1, prompt_check.mjs, pan.mjs).

- THE TOASTS CLEAR THE CONTROLS (K698, 2026-10-21; brief
  `docs/design/K698_polish.md`; `src/ui/toast_place.ts` is the rule,
  pure; `src/ui/share.ts` placeToast measures). `.km-toast` stays
  centred, its CSS bottom (18 px, or the safe-area inset) the floor. At
  show time, and on a resize while it shows, it rises to TOAST_GAP 10 px
  above the highest top among the visible BOTTOM-ANCHORED controls
  (nearer the bottom edge than the top) whose box reaches its column
  (within TOAST_SIDE_MARGIN 8 px), never off the top. The controls: any
  element with the class `km-control` (TOAST_AVOID_CLASS; a new bottom
  control carries it, as K137 s3c's sprint button was told to), plus
  `.km-cut`, `.km-walk`, `.km-aid`, `.km-pad`, `.km-banner`, `.km-ind` and
  the indicators' avoid list (`setToastAvoid(() => indicators.chrome())`).
  Visible: a non-empty rect, visibility visible, opacity above 0 and
  pointer events on (the inert edge indicators excepted). A control beside
  the column leaves the toast at the floor (the desktop's pad, far right).
  The toast takes no touch (pointer-events none). Before K698 every toast
  sat at the floor and met the scissors' row and the walker's buttons on
  the phone, the aids group, and the move pad (K726, build 65ee13a6: the
  sword's three toasts by 13-38 px). NOT re-placed: a control that appears
  while a toast shows. Not avoided: the open panel and the phone sheet.
  Probe: `.claude/probes/K698/k698.mjs
  <cut|aids|lives|walker|sword|glow|pad> <phone|land|desk>` (`run.ps1`
  runs a batch in parallel; every toast is rect-checked in the page 400 ms
  after it shows).
