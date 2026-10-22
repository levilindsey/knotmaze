---
paths:
  - "src/ui/motion.ts"
  - "test/ui/motion.test.ts"
  - "src/ui/accessibility.ts"
  - "test/ui/accessibility.test.ts"
  - "src/app/lifecycle.ts"
---

# Gameplay lore: the Motion setting

Moved verbatim from `gameplay.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `gameplay.md` lists the area's other files.

- THE MOTION SETTING (K53, built in K79, 2026-10-13; ui/motion.ts):
  follow system (default) / full / reduced, the "motion" row in Motion &
  intro. A viewer preference like showMazeStats: localStorage
  `knotmaze.motion` (anything else reads as follow system), never in a
  link or a daily, kept by Reset to defaults. MotionSetting.reduced is
  the ONE answer: the background's drift, the render-only plucks (K104:
  a pluck started while reduced is STILL - its unit brightens toward
  white and fades, nothing moves, the sound is unchanged; one already
  ringing finishes without attack and ghost) and the camera tween to an edge
  marker's target (a jump) read it every frame, and CSS keys on the
  root's data-motion through whenReduced() - a new `@media
  (prefers-reduced-motion)` rule would miss the in-app choice. Follow
  system is live (the media query's change event). Storage missing,
  throwing or full: the page boots following the system and a choice
  lasts the session. NOT gated by Motion: the flow (the Reduced motion
  checkbox stills it, K111 below), the intros and the pulses (Levi,
  2026-10-13: reduced motion is not the intro and not the pulses). No
  cross-tab sync; K84 sorts it with the other viewer prefs.
  Probe: `.claude/probes/K79/k79_motion.mjs` (38 checks; K180 rewrote
  its four pluck checks for K104's still plucks: full motion moves,
  reduced stays still, attack and ghost only at full motion, the same
  decay clock, the still unit's cue scaled by its gain); after
  emulateMediaFeatures, wait two rAFs before reading the change.

- ACCESSIBILITY GROUP (K111 stage 1, 2026-10-14; ui/accessibility.ts,
  pure and tested; brief docs/design/K111.md): the panel's FIRST folder
  holds two master checkboxes, "Reduced motion" and "High contrast".
  Viewer preferences like Motion (never in a link, a daily or the undo
  stack, kept by Reset to defaults, storage failures survived), and NOT
  UrlParams, so DAILY_EXEMPT_KEYS and CODEC_PARAMS needed nothing. AN
  OVERRIDE NEVER WRITES A STORED SETTING: main.ts reads the look params
  through `look(key)` = effectiveParam(params, a11y, key) (allocation-free,
  the same object when nothing is on), so off restores the viewer's own
  values; the overridden design rows keep their stored value, dimmed
  (`kp-overridden`, tooltip note). A toggle renders one pass
  (renderDirty) and never calls writeParams or wake(). fabricTick used to
  set fadeLength, flowStrength and flowSpeed AFTER an asleep or paused
  frame's update(): a slider wakes the physics (whose later frames redo the
  update), a toggle does not, and the one forced pass solved the crossing
  cuts with the old fade (27k px off a fresh load; found by pixel-diffing a
  toggled page against a page loaded with the same setting). Since K239
  EVERY pass hands the look over first, through ONE function: main.ts
  `handRendererLook()` (worn values via look(), plus cuspRadius,
  pulseSpacing, pulseReach, hoverGlow and appearFx, see the K239 note
  below) runs before the load's first update (finishLoading,
  finishPresettle), flowRender (the rest, frozen and paused passes, a
  toggle's forced pass among them), the awake step, and in fabricTick for
  the readers between passes; applyAccessibility no longer assigns them.
  REDUCED MOTION is
  the Motion pref's checkbox face (one source of truth): it shows
  motion.reduced; on sets "reduced"; off sets "system" on a calm OS or
  "full" when the OS asks for reduced, so the box really clears; the
  dropdown stays as the detailed control (the only way back to follow
  system). On top of Motion's list it stills the FLOW (flowStrength and
  flowSpeed worn as 0), NOT the intro and NOT the pulses (Levi keeps the
  pulses under reduced motion). HIGH CONTRAST
  (pref `knotmaze.contrast`: system | normal | high; follows
  `prefers-contrast: more` OR `forced-colors: active` live until the
  viewer chooses, then the choice sticks; the root's data-contrast is
  "high" or "normal", for a CSS layer that is not written yet) wears,
  over the stored params: background "none", backgroundColorMode
  "custom" with backgroundBase #000000 (a black page, the fog follows),
  palette "pastel" (the lightest preset, already the default, so a no-op
  on default designs), pathColor #ffff00, fadeLength 0 (crisp crossing
  cuts), gap max(stored, 0.12) and markerSize max(stored, 1.5) (K225's
  default 2 sits above that floor, so since 2026-10-20 it lifts only a
  stored size under 1.5, not the default; raising it is open). Its
  choices keep the pulses (stage 3 removed stage 2's "contrast" mode)
  until Levi picks one of three PROTOTYPE looks (K111 stage 4, K265:
  "Maybe the high contrast highlights should get new treatment"):
  1 CONTRAST, white with a black center line (stage 2's; the brightest,
  but on a phone the line is about two device pixels); 2 OUTLINE, a dark
  thread outlined in white (the most luminance contrast against the
  light pastel threads, whatever their hue); 3 CHEVRONS, black and white
  chevrons pointing away from the junction (a pattern rather than a
  color, and direction without motion). All three are steady (no trains,
  no breath: calm under reduced motion too); a hovered choice goes solid
  white, a hovered non-choice run keeps its rim, and the choice's webs,
  fans and arm strips go flat white. TEMPORARY switches: `&hcl=1|2|3`
  after a link (read once at load; the address bar's rewrite then drops
  it; not a codec param) and `window.__knotHcLook(n)`. Render side:
  render-paint.md's HIGH CONTRAST LOOKS; sheets
  `.claude/probes/K111/stage4/sheet/K111_hc_looks_*.png`. NOT overridden
  (candidates):
  threadWidth (physics), colorScheme, junctionBlend, gamutArc, the fog's
  look, the DOM chrome. forced-colors recolors the DOM only, never
  canvas content. Probe: `.claude/probes/K111/k111_probe.mjs` (rm | hc |
  os | storage | ab; rendered thread positions via
  renderer.markerWorld). GOTCHA: puppeteer's emulateMediaFeatures refuses
  prefers-contrast and forced-colors; send CDP Emulation.setEmulatedMedia.
  K239 (2026-10-14, fixed what K111 found older than itself): a fresh
  STATIC page (phy=0 and fw=0) drew its first frame with the crossing cuts
  solved at fade 0, because the rest branches called renderer.update()
  BEFORE fabricTick assigned fadeLength. Same-state first frame vs a
  refreshed one (Reduced motion on, off), master f5207d1 -> K239, at
  1400x900 dsf 1: knot `?7k.J&mf=0` 31070 -> 0 px, fabric `?b.J` 29668 ->
  0, K111's `?k111.J` 28015 -> 0 (phone 411x753: 18570 -> 0), all with
  `&am=instant&snd=none&phy=0&fw=0`; and a link with every renderer input
  off its default (cr=5 psp=4 pr=1.5 hg=0.9 pv=trail afx=comet) 28477 -> 0.
  THE FIRST FIX WAS NOT ENOUGH on a fabric: the renderer's cuspRadius
  starts at 1 (the param's default is 3), update() builds every fan and
  web from it, and only fabricTick assigned it, so the static fabric kept
  cusp-1 fans (3936 px, ~100 short dashes at junctions, after the fade fix
  alone; the knot has no fused junctions and was already 0). Any renderer
  field that update() reads and whose default is not the param's belongs
  in handRendererLook. Builds before K239 still need a neutral refresh
  before a reference shot, or a pixel diff blames the feature under test.
  Probe: `.claude/probes/K235/k239_first.mjs <hostA> <hostB> <out> [cases]`
  (pins the paint, flow and background clocks, first frame, neutral
  refresh, refreshed frame, diffs). PHYSICS ON is unchanged: master vs K239
  at rest, pinned, is 0 px in all six cases (fabric with and without flow,
  knot with and without flow, dense, fabric phone), and two loads of one
  build are 0 px apart (the floor), so the 0 means something. NOT FIXED,
  the same on master and
  K239 (0 px between them): a link with sp=0 AND am=instant (or lds=0) and
  physics on (`?b.J&am=instant&fw=0&sp=0`) draws NO threads at load, 393401
  px off a refreshed frame: beginSettle's instant branch shows the root
  without an update() and leaves the first one to the awake step, which a
  paused page never runs (one manual `__knotRenderer().update()` brings
  the frame to 1665 px of the refreshed one: `k239_paused.mjs`). A
  non-instant intro updates in finishPresettle,
  so it is unaffected.
