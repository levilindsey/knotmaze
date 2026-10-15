---
paths:
  - "src/ui/offscreen_indicators.ts"
  - "src/ui/head_indicator.ts"
  - "test/ui/offscreen_indicators.test.ts"
  - "test/ui/head_indicator.test.ts"
---

# Gameplay lore: off-screen indicators

Moved verbatim from `gameplay.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `gameplay.md` lists the area's other files.

- OFF-SCREEN INDICATORS (K73, 2026-10-13; ui/offscreen_indicators.ts):
  a disc at the screen's edge, with its target's icon and a chevron
  facing the target, for every registered target that is off screen. A
  target registers its world position, marker radius, icon (SVG markup
  in the GLYPH_R box), style, visibility predicate, label and tap; the
  module owns the off-screen test (EDGE_MARGIN, HYSTERESIS), the edge
  placement inside the safe area, keeping clear of the chrome (HUD,
  badge, hamburger, banner, open panel, stats stamp) and of the targets
  placed before it (layoutIndicators, pure and tested), the DOM and the
  per-frame update - main.ts calls indicators.update() in fabricTick
  after the camera step, so in every ticker branch. THE FINISH is the
  first client (main.ts; the minotaur is the second, see REAL-TIME
  MINOTAUR): a
  black disc wearing the exit marker's own glyph and radius (K83:
  markerGlyphSvgFit into the GLYPH_R box, fabric.markerRadius() - a glyph
  or size swap reaches both), shown in fabric mode, unsolved, once the intro has
  revealed the exit (the 0.98 gate fabric's marker uses) and under fog of
  war too (Levi, 2026-10-13: direction only); a tap eases the camera to
  frame the exit with the head (camTween through placeWorldAt; the
  follow camera holds it PEEK_HOLD before easing back), under fog a
  toast only. VIEWER PREFERENCES (localStorage + panel checkboxes, both
  default on, K84 sorts them later): finishIndicator, and tapToPan - off,
  every indicator is inert and taps go through it to the maze. K76 HOOK:
  finishIndicator.gate(pred) ANDs in a predicate (the thread-reveal mode
  hides the finish's until the exit has been seen; returns its remover).
  THE HEAD is the third client (K148, 2026-10-14; ui/head_indicator.ts holds
  the pure decisions; registered after the finish, before the minotaur): a
  black disc wearing K83's head glyph (`fabric.markerGlyphId("head")`, a
  ring and a dot by default) at the marker's radius, shown whenever the
  head is off screen in a built fabric maze - the intro, play, after a
  finish, under fog, either camera (`headIndicatorWhy`: only knot mode or
  no maze ("no maze") and the hidden load settle ("loading") hide it; probe
  hook `headWhy`). NO VIEWER SETTING of its own (the brief left it open):
  the finish's can be switched off because it gives a direction away, the
  head's gives nothing away, the minotaur's has none either; tapToPan still
  makes it inert. A TAP (`returnToHead`, `headReturnPlan`): the FIT camera
  eases (0.6 s; reduced motion jumps) to center the head at the zoom the
  player is at, as near as the pan clamp allows (a head at the maze's far
  edge lands at the range's limit, on screen); the FOLLOW camera eases onto
  its own framing of the head (`followScale`) and the spring is at full
  strength the moment the tween ends (`camTween.hold` = -(FOLLOW_DELAY +
  FOLLOW_RAMP); the finish's tap still passes PEEK_HOLD), so the follow
  resumes at once; mid-intro the follow target is the whole knot, so a tap
  only pulls the spring to full strength. A follow run of 14 moves never
  showed it at 1400x900 and flashed it once for 0.33 s at 411x753 (a long
  run outpaced the spring, and the shared off-screen test says "off
  screen"); a short debounce would hide that, left for Levi. GLYPH BUG
  found here: the indicator's icon group sets its own stroke, which the
  glyph's filled dots inherited at the default width 1 (12.6 px once
  scaled), so the head's dot and the minotaur's bull eyes drew as
  disc-sized white blobs; `markerGlyphSvgMarks` dots now say
  stroke="none" (pinned in marker_glyphs.test.ts). Probe:
  `.claude/probes/K148_K149/probe.mjs fit | follow | slack | solve |
  reduced | fog` (each with `:phone`), flicker.mjs, both.mjs, intro.mjs.
