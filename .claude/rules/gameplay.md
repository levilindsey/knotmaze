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
  definition (ui/daily_link.ts DAILY_V1 = codec v3's defaults + K74's
  maze overrides + a seed from the day number; K74 edited it in place,
  pre-launch), never PARAM_DEFAULTS; to change the daily, append
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

- STAR RATINGS (K155 stage 1, 2026-10-14; game/star_rating.ts, brief
  docs/design/K155.md). One to three stars for every finish. MEASURE:
  R = walked / optimal, where walked is every run walked, forward and
  back (FabricMazeController.walkedDist: each advance and backtrack adds
  its run, reset() zeroes it, respawn() keeps it, so the walk before a
  K80 catch counts); from a turn-based record, path + 2 x backtrack
  (walkedOf; trail mode never backtracks, its path is everything
  walked). Not the HUD's efficiency: it reads the route you ended on, so
  a wander that ends on the best route scores 100%. STARS (rateRun):
  three for R <= THREE_STAR_RATIO 1.5 and, in real time, never caught;
  two for R <= TWO_STAR_RATIO 4; one for any finish; no finite optimal or
  nothing walked, no rating (the edges carry a 1e-9 epsilon). THRESHOLDS
  from scripted solvers over 288 mazes at today's defaults / 288 dailies
  (`.claude/probes/K155/`: stars_sim.ts, `run_stars.ps1 -N 288 -Slices
  8`, stars_report.mjs, out/report_288*.md): greedy (K74's DFS walker)
  median 2.57x / 2.58x (p25 1.65 / 1.61, p75 4.46 / 4.61), stars 1/2/3
  = 28/52/19% and 28/53/19%; careful (sees the whole maze, so never
  enters a dead end, and takes the option with the shortest open route to
  the exit, each score x exp(0.1 N(0,1)) drawn per decision) median
  1.13x / 1.15x, three stars 94% / 93% (at noise 0.2: 1.6x, 41%); random
  walkers about 18x, 96% one star. The brief's "a
  greedy solve earns two about half the time" was read as EXACTLY two;
  AT LEAST two half the time would put T2 near 2.5 (open for Levi; T2
  3.5 gives 48% / 47%). A CATCH caps the rating at two (its walk is
  already in R). K80's harness with walked added (`rt/`, 288 mazes):
  greedy never caught 51%, median R 3.32 (2.19 uncaught, 5.86 caught),
  stars 42/47/11; fleer 46/42/12; smart 28/56/15. One star off per catch
  would charge a catch twice (greedy 56/33/11; open for Levi). DISPLAY:
  the ratio rounds UP to one decimal (ratioShown), so the number shown
  sits on the same side of each edge as R (1.5x three stars, 1.6x two);
  distances read as the HUD's (u x 10). WHERE: the win banner
  (maze_hud.ts starsWidget: a button under the heading, aria-expanded; a
  tap opens the three rules with the earned one lit, then "You walked
  2.2x the shortest route: 412 against 196, backtracks counted both
  ways.", plus "Caught once: the walk before it counts too." in real
  time, since a catch empties the HUD's path); the daily stats view
  (today's Solved line wears the widget and opens it under the today
  row; each History row a star cell explained on hover; the official
  results' star counts by the History heading; a legend note, since
  phones have no hover); the share text's title line (`Knotmaze Daily
  #3 🧶 ★★★`, designs too; no rating, no stars). RECORDS store nothing
  new: ratingForResult derives the stars from the stored path, optimal
  and backtrack (dailies are always turn-based), so old records rate
  too; unreadable data gives null, never a throw. No param, no codec
  append, no store version. PROBE: `.claude/probes/K155/probe_stars.mjs
  <base> <shotsDir> design|daily|realtime|caught[:phone]` (real taps;
  Share captured through navigator.share and the clipboard); hook
  `__knotFabric().walked`.

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

## The real-time minotaur

- REAL-TIME MINOTAUR (K80 stage 1, 2026-10-13; game/minotaur.ts, brief
  docs/design/K80_realtime.md). `clock` (`clk`) = turn (default) |
  realtime, a fabric-mode panel row with its own Minotaur folder. CLOCK:
  a fixed-step sim, CHASE_HZ 120, at most 30 ticks (0.25 s) an advance;
  main.ts advances it only while the page is visible, after the first tap
  and before the finish. A tick depends only on the tick count, the
  params, seedMix(seed) and the player's inputs (replayChase), and the
  module uses only exact math (K108). THE PLAYER: one run per tap at
  playerPace; a tap while moving QUEUES (the latest wins, it leaves on
  arrival); no undo (`undoAllowed(clock)`, which K92 must consult) and no
  wait move. THE MINOTAUR: waits `wake` s in its lair at the exit end,
  then wanders (shortest route to a junction roamRange/4..roamRange away,
  or with chance deadEndBias a dead-end tip; legs at wanderPace x
  (1 +- paceJitter), pauses pauseMin..pauseMax at its destination and
  with chance pauseChance at a junction it passes). HUNT: begins within
  detectStart and ends beyond detectEnd, both THREAD distance through the
  walk graph minus the two tails; it runs at approachPace on the shortest
  path to the player, re-planned every tick, and turns back mid-run only
  when that is shorter by REVERSE_MARGIN 1.5. THE TAILS ARE A SANCTUARY:
  barred to it, a player on either is unseen and uncatchable. A CATCH
  (catchDist) is a respawn, not a loss: the player goes back to the
  entrance (FabricMazeController.respawn: the path, yarn and trail follow
  an empty path; explored fog stays), the minotaur to its lair, the clock
  runs on; it counts in the HUD (the "caught N" row shows in real time
  even with stat rows off), a toast ("Caught! Back to the entrance.") and
  the win banner (caught, chased). Reset path restarts the chase.
  minoFog (shown only under fog of war) = when the minotaur shows THROUGH
  the fog: always (default, a decision for Levi) | hunting (only while it
  hunts) | never (only where the fog has lifted). Its off-screen
  indicator (#7a0c0c disc, the bull glyph) shows only once it has left
  the lair. The marker (a K83 marker wearing a placeholder bull) is
  markerRadius x 1.15 with a MINO_MIN_CSS_R 10 CSS px floor, over a red
  glow (dim in the lair, larger and full while it hunts), and like the
  exit marker waits for the intro to draw its thread. Live panel edits reach a running chase through
  setParams. CODEC: v4 appends 84-98 (clock, playerPace, the minotaur's
  paces, jitter and pauses, detect, lose, catch, deadEnds, roam, wake,
  minoFog; legacy keys clk plp mwp mhp mpj mpc mpn mpx mdt mls mct mde
  mrm mwk mfg). A retune edits DEFAULT_CHASE_PARAMS, the codec literals
  and the pins in param_codec.test.ts and url_codec.test.ts together.
  `clock` is not a DAILY_EXEMPT_KEY: the dailies stay turn-based.
  DEFAULTS come from a headless simulation of 288 mazes with scripted
  players (`.claude/probes/K80/rt/`, results.md): only approachPace
  moved (8 -> 7). At the defaults a greedy
  player is caught 1.26 times a game (median 0; 51% never), a fleeing one
  escapes 53% of hunts (75% with queued taps); think time decides
  escapes, most catches are in dead-end pockets, and 45% of games never
  meet it. A player who hides on the entrance tail is often caught on
  walking back out: the minotaur pauses at that tail's junction. PROBE
  HOOKS: `__knotChase()` (state, events, counts), `__knotChaseTap(edge)`,
  `__knotChaseObj()`.

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
  K74 (2026-10-13, pre-launch) EDITED V4 IN PLACE (`K74_V4_DEFAULTS` in
  param_codec.ts): exitClearance 5 -> 12, deadEnds on, deadEndDensity
  0.25 -> 0.5, and appended deadEndLength (index 71, default 20). v1-v3
  links still read the old values. A listed boolean is a flip of the
  default, so a pre-K74 v4 link that turned dead ends ON now turns them
  OFF (`?12l.IS3ygt`). DAILY_V1 takes the same four values as overrides
  on codec v3's defaults (its trailLength stays 5).

- LOAD SETTLE PARAMS (K147, 2026-10-13; the mechanism is physics.md's
  "The load settle"): `settleBudget` (`stb`, ms of physics a frame while a
  new knot first settles; 0 = off, i.e. real-time stepping and its
  catch-up spiral) and `loadSettle` (`lds`, seconds of hidden pre-settle
  stepping; 0 = none, the max 5 = settle first: hidden until the first
  sleep) are APPENDED to codec v4 at indices 82 and 83 (after K79 stage
  B's 72-81). Both are DAILY_EXEMPT_KEYS:
  they pace how a device plays a design's settle, they do not change the
  design (like physics on/off), so a daily stays the daily with either set
  and the golden dailies do not move. Panel: "Motion & intro", before
  Replay settle. url_state.ts clamps both (SETTLE_BUDGET_MAX 30,
  LOAD_SETTLE_MAX 5); legacy override keys `stb` / `lds`.

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
  next refresh). Range [0, BACKGROUND_SPEED_MAX] = [0, 8] (Levi,
  2026-10-13; the link clamp reads the same constant). Hidden while
  background is none.

- BACKGROUND SHAPE + COLOR ROWS (K79 stage B, 2026-10-13): the render
  side is in `render.md` (SHAPE PARAMS + CUSTOM COLORS). SCALE, DETAIL,
  FIBERS and GRAIN are plain sliders with NO step, like the speed row
  (Tweakpane's step grid starts at a row's first value, so a link's 0.37
  would snap on the next refresh, K130); an edit keeps 2 decimals
  (round2). Which rows show, by effect: scale for every effect but none;
  detail for mist, wash, silk and contours only (`readsDetail`: vellum's
  and aurora's moved 0.4 luma levels in the B2 sheets, so the row is
  hidden there and the param is inert); fibers and grain for vellum; the
  angle for silk. SILK'S ANGLE row is the speed row's view pattern: it
  shows `autoSilkAngle(seed)` (the seed's own direction in the panel's
  terms: whole degrees counterclockwise from screen right) and writes the
  param only when moved off it, the reset glyph returns to auto (-1), and
  the dice re-show the new seed's angle through `syncAngleView` without
  writing. The COLORS row ("Backdrop colors": design | custom): switching
  to custom while the four custom colors still hold their defaults copies
  the design's gamut colors in (`setCustomColors`, so nothing jumps), and
  switching back while they still equal the gamut's resets them to the
  defaults, so the link stays short; colors the player touched stay. In
  custom mode the page-color row always shows (the base IS the page, even
  under `none`); each accent row shows only where the effect reads it
  (`BACKGROUND_ACCENTS_USED`, held to the pixel by `k79b_sheet.mjs
  accents`: an unread accent changes 0 px): vellum 1, silk and contours 2
  and 3, mist, wash and aurora 1, 2 and 3. Probe:
  `.claude/probes/K79/k79b_smoke.mjs` (rows by effect, copy and reset,
  the angle row and the dice; 70 checks).

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
  lasts the session. NOT gated (left for Levi): flow, the intros, the
  pulses. No cross-tab sync; K84 sorts it with the other viewer prefs.
  Probe: `.claude/probes/K79/k79_motion.mjs` (38 checks; its tau x0.7
  and lobes x0.6 pluck checks predate K104's still plucks and fail by
  design until updated); after
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
