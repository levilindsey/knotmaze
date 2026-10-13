---
paths:
  - "src/game/**"
  - "src/ui/**"
  - "src/audio/**"
  - "src/main.ts"
  - "test/game/**"
  - "test/ui/**"
  - "test/audio/**"
---

# Gameplay, daily and UI lore

Binding lore for the game state, the daily maze, links, the panel,
the camera and gestures, and audio, moved verbatim from CLAUDE.md by
K45 (2026-10-12). The link format and codec versioning rules stay in
CLAUDE.md (Key Design Decisions). A passage taken from inside a longer
entry is labeled with its source; the narrative is in
`docs/history.md`. Daily probes and the probe tooling are in
`probes.md`. Add new gameplay and UI lore here, not to CLAUDE.md.

## The daily maze and stats (binding)

- MAZE STATS + DAILY MAZE (K19 + K20, then K47 + K56 saved attempts and
  the front door, 2026-10-12; the commit messages hold the design notes
  and verification records). STATS: the definitions live in
  game/maze_stats.ts (time = first move to the dot's arrival, hidden time
  excluded; efficiency = optimal / the route you ended on, shown once
  solved, rounded down; distinct junctions; distinct dead-end tips, only
  with deadEnds on; a g/d/b move log for sharing).
  DAILY - binding rules: (1) a daily's design comes ONLY from its frozen
  definition (ui/daily_link.ts DAILY_V1 = codec v3's defaults + a seed
  from the day number), never PARAM_DEFAULTS; to change the daily, append
  DAILY_V<n+1> with fromDay a few days ahead (open tabs cannot learn
  it), never edit a published one; test/ui/daily_link.test.ts pins
  dailies #1-#3 (a failure there means generation code moved every
  daily and every link). (2) Day numbers are the player's LOCAL date
  counted in UTC calendar days (game/daily_calendar.ts), Daily #1 =
  2026-10-12. (3) A page is the daily only while every param but
  DAILY_EXEMPT_KEYS (playback preferences: the Sound folder, cameraMode,
  Touch & feel, physics on/off) equals the day's design (isDailyDesign,
  K56). Any other edit (panel, seed row, dice) LEAVES it: the attempt is
  parked, a toast ("Left Daily #N. Your attempt is saved."), the bar
  becomes a token, the solve on screen plays on as an ordinary one; the
  Daily button returns. Exempt edits made on a daily are stored as
  prefs (only what the player changed) that every daily opens with.
  MAZE_PARAM_KEYS (sameMaze) names the walk-graph params: a test requires
  every DEFAULT_MAZE_PARAMS key there, and none may be exempt. (4) Links:
  NO query = today's daily, the bar stays bare; `?daily` = the same
  (rewritten bare); `?daily=<n>` (1..today+2) stays in the bar; `&k=v`
  after it keep the daily only for exempt keys; ANY other query is an
  ordinary design; K20's `?daily=<n>.<delta>` opens as the design it
  describes and is no longer written. (5) Records: localStorage
  `knotmaze.daily`, ONE document `{v: 2, days, prefs}` (v1 reads as v2
  without attempts) - bump `v` for any shape change, never overwrite a
  newer one; every access is wrapped and the page must boot and play
  without storage (then all of it is session-only). The first finish is
  official, later ones replays; streaks count results whose attempt
  began on or before their day. Share = a Wordle-style move grid + the
  `?daily=<n>` link, native sheet on coarse pointers. (6) SAVED ATTEMPTS
  (K47, game/daily_attempt.ts): an attempt IS its tap list
  (FabricMazeController.taps; replay() rebuilds path, meters, stats, move
  log) plus active time, start time + day, and a walk-graph fingerprint
  (a moved maze refuses the replay). Saved after every move, on hide and
  pagehide, every 10 s while running and before any rebuild; restored
  whenever its daily opens, the clock PAUSED at the saved time until the
  intro ends or the next move. In an unfinished official attempt Reset
  path backtracks to the entrance (logged, priced, clock running; none
  in trail mode); in a replay it starts over. A finish drops the
  attempt; a tab coming into view adopts a newer one another tab saved.

## Corner chrome

- MODE BADGE (K73, 2026-10-12; ui/mode_badge.ts): a pill left of the
  hamburger whenever the solve on screen does not count toward the daily
  stats. modeBadgeFor (pure, tested) decides from the daily on screen,
  the store's official result and this attempt's finish record: "Free
  play" (slate, compass) off the daily, knot mode included - a tap does
  what the panel's Daily button does (today's daily, replacing the
  design's link like that button); "Replay · not scored" (amber, circling
  arrow) on a daily whose official result exists, before or after this
  run's finish - a tap explains it in a toast (touch has no hover);
  nothing during the official attempt or once it has set the official
  result. fit() steps the label down (long, short, bare icon, icon below
  the hamburger) until it clears the HUD and the win banner by 8 px;
  main.ts re-fits on every HUD update, resize and banner hide. Measured
  (2026-10-13, HUD stat rows opt-in): free play has no HUD beside it and
  shows "Free play" down to 300 px; a replay's HUD title row ("Daily #1 ·
  Oct 12 · replay", 228 px on a phone) leaves room for "Replay · not
  scored" down to 700 px on desktop, "Replay" on a 412 px phone, the bare
  icon at 360 px and the icon below the hamburger at 340 px and less. The
  panel never collides (it opens below the hamburger row) except at that
  last level.

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
  first client (main.ts; the minotaur, K80, is meant to be next): a
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

## Links and the codec

- *From COMPACT LINKS (2026-10-11), decoder details:* DETAILS beyond the spec, each for a measured reason:
  a TRAILING "=" on the token is tolerated (`new URL(link).searchParams
  .append(...)` re-serializes `?<token>` as `?<token>=&...`), as are
  trailing dots (sentence punctuation after a pasted link); `&key=value`
  pairs after a token apply as legacy overrides, so probes keep writing
  `&am=instant` / `&mf=0`, and unknown keys (fbclid, utm_*) drop on the
  rewrite. The decoder is strict otherwise: an invalid char, truncation,
  unknown version, out-of-range index/option, reserved number code, or
  leftover bits beyond the zero padding rejects the whole blob (seed kept,
  defaults, one console.warn) - all-or-nothing, never a partial design.
  Legacy readers now fall back to the frozen v1 defaults (LEGACY_BASE), so
  a future default change (codec v2) leaves old s= links' meaning alone.

- *From COMPACT LINKS, a query without a seed:* A query WITHOUT a seed (`?am=instant`) is no link at all: a fresh
  design at TODAY's defaults (the bare page too, until K56 made it the
  daily).

- CODEC V4 (K73, 2026-10-12): trailLength's default went 5 -> 10 (Levi:
  recentPath should light "about twice as far"; the panel slider's max
  went 15 -> 30). v1-v3 links read 5, and the token the page rewrites
  them to on load writes that 5 out. The dailies keep 5: DAILY_V1 pins
  codec v3's defaults. A future DAILY_V<n> built on codec v4 gets 10
  unless its overrides say otherwise - K46's memory-trail days were
  designed around 5 (docs/design/K46_daily_variety.md).

## The panel

- pathViz LABELS ARE NOT ITS VALUES (K73, 2026-10-12): the panel shows
  fullPath / recentPath / string for the values gold / trail / string.
  Rename labels freely; never the values - links store the option's
  index in the frozen codec tables, legacy `pv=` links name the values,
  `trm=1` reads as trail, and daily results record the value.

- *From APPEARANCE FX round 3 (2026-10-10), live recolor:* Look color controls (scheme/hue/gamut/palette/pathColor)
  now RECOLOR IN PLACE (renderer.recolor) - the rebuild they used to
  trigger reset the knot, replayed the reveal and wiped progress.

- *From the 2026-10-11 APPEARANCE MODES round, panel lore:* PANEL LORE: Tweakpane 4's
  refresh() FIRES change handlers whenever the shown value changes -
  programmatic refreshes need a guard (appearSync), and the reset glyph
  runs a row's effects only if refresh() did not; slider step constraints
  write float noise (1.4500000000000002) back into params.

- *From the gridAlign EXPONENTIAL SLIDER (2026-10-11), the strength and view rules:* The URL (ga=) and physics keep the STRENGTH, so links
  keep their look; the panel row binds a view object holding the slider
  position (no step - a step would snap the default 0.669 off its exact
  value; 2-decimal display) and writes the strength on change; Reset to
  defaults resyncs the view before pane.refresh(). Strengths snap to 12
  significant digits so decimal values round-trip bit-exactly.

- BACKGROUND SPEED ROW (K79, 2026-10-13): gridAlign's view pattern. The
  row binds a view showing the EFFECTIVE speed (auto shows 1, or
  vellum's 0) and writes backgroundSpeed only when the slider leaves that
  value (2 decimals); the reset glyph writes auto through row()'s custom
  {modified, reset}. No step (it would snap an off-step link speed on the
  next refresh). Hidden while background is none.

- THE MOTION SETTING (K53, built in K79, 2026-10-13; ui/motion.ts):
  follow system (default) / full / reduced, the "motion" row in Motion &
  intro. A viewer preference like showMazeStats: localStorage
  `knotmaze.motion` (anything else reads as follow system), never in a
  link or a daily, kept by Reset to defaults. MotionSetting.reduced is
  the ONE answer: the background's drift, the render-only plucks (no
  attack, tau x0.7, no ghost, lobes x0.6) and the camera tween to an edge
  marker's target (a jump) read it every frame, and CSS keys on the
  root's data-motion through whenReduced() - a new `@media
  (prefers-reduced-motion)` rule would miss the in-app choice. Follow
  system is live (the media query's change event). Storage missing,
  throwing or full: the page boots following the system and a choice
  lasts the session. NOT gated (left for Levi): flow, the intros, the
  pulses. No cross-tab sync; K84 sorts it with the other viewer prefs.
  Probe: `.claude/probes/K79/k79_motion.mjs` (38 checks); after
  emulateMediaFeatures, wait two rAFs before reading the change.

## Camera, gestures and plucks

- *From the MOBILE + CAMERA ROUND (late 2026-10-10), camera and gestures:* Every
  gesture goes through ONE primitive (placeWorldAt: world point to
  screen point at a scale) that each mode maps onto its own state.
  GESTURES: pinch (world-anchored midpoint) + two-finger pan; touch taps
  on choices resolve on RELEASE and a pinch cancels a tug without a
  pluck (its first finger can never move the player); empty-space drag
  pans (mouse + touch), middle-drag pans anywhere; wheel = mouse zoom at
  the cursor / trackpad two-finger scroll pans / trackpad pinch
  (ctrl+wheel) zooms; double-click / double-tap empty space resets. The
  camera steps in EVERY ticker branch (moves and fog growth happen while
  the physics sleeps).

- *From RENDER-ONLY PLUCKS (2026-10-11), taps and drags:* TAPS + AUTO PLUCKS touch zero physics
  (bitwise: positions/prev/zPos/pass ctrls, 0 steps, never wake); a DRAG
  still tugs and its release keeps the snap-back plus the vibration. A
  press on a thread waits for a per-pointer slop (mouse 4 / pen 6 / touch
  10 CSS px): lift = tap-pluck on pointerup, move = tug grabbed at the
  PRESS point (physics off: a pan).

## Audio

- *From the 2026-10-11 small round 2, the audio autoplay gate:* AUDIO AUTOPLAY GATE (knot_synth.ts): no AudioContext exists
  until the first activation-triggering input (keydown, mousedown, mouse
  pointerdown, touch/pen pointerup, touchend; navigator.userActivation
  decides where supported), and the gate's capture-phase window listener
  creates + resumes it INSIDE that gesture (iOS unlocks only there) -
  music-mode plucks before it are silent no-ops, so Chrome's "AudioContext
  was not allowed to start" warning is gone.
