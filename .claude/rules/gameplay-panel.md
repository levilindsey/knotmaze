---
paths:
  - "src/ui/tweakpane_panel.ts"
  - "src/app/panel_wiring.ts"
  - "src/ui/grid_align_curve.ts"
  - "test/ui/grid_align_curve.test.ts"
---

# Gameplay lore: the panel

Moved verbatim from `gameplay.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `gameplay.md` lists the area's other files.

## The panel

- pathViz LABELS ARE NOT ITS VALUES (K73, 2026-10-12): the panel shows
  fullPath / recentPath / string for the values gold / trail / string.
  Rename labels freely; never the values - links store the option's
  index, `pv=` names the value, and daily results record the value.

- DESIGN UNDO (K92, 2026-10-14; ui/undo_stack.ts, pure and tested;
  ui/undo_buttons.ts; brief docs/design/K92.md): undo and redo buttons
  left of the hamburger, shown only while the panel is open (setOpen puts
  `kp-open` on the root element); a button that cannot act stays,
  dimmed. A design change is every writeParams in main.ts except mid-drag
  (a slider drag commits once, on release: the row handler's `dragging`,
  read through `panel.midDrag()`): panel edits (playback prefs included),
  the seed, the Daily button, the badge's tap. An entry is the params +
  the daily on screen + its floating flag (designKey); cap 100, memory
  only, the address bar still replaced, never pushed. Undo puts a design
  back as its link would (restoreDesign): leaving a daily saves its
  attempt and toasts as any edit does; entering one rebuilds and resumes
  its saved attempt; a change of LIVE params only (LIVE_EFFECTS, keyed by
  panel callback) runs those rows' effects and keeps the solve. A param
  missing from LIVE_EFFECTS only costs a rebuild; never list one under an
  effect its own row does not run. The panel's top is `--kp-top` (the
  badge's open row sits between the hamburger and the panel). Probe:
  `.claude/probes/K92/undo.mjs <base> <out> desktop|daily|phone`; hook
  `__knotUndo` (state(): depth, current and live keys, flags, shown, the
  maze's walk fingerprint, daily, search; undo(); redo()).

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
  side is in `render-backgrounds.md` (SHAPE PARAMS + CUSTOM COLORS). SCALE, DETAIL,
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

- ACCESSIBILITY FOLDER (K111, 2026-10-14): the panel's FIRST folder,
  expanded by default (a call left to Levi), with two boolean rows,
  "Reduced motion" and "High contrast" (their lore: `gameplay-motion.md`).
  `PanelApi.syncAccessibility({motion, reducedMotion, highContrast})`
  refreshes only those rows' bindings under the `syncing` guard (the
  Motion dropdown and the box are one answer, and a refresh must not fire
  a handler) and `PanelApi.markOverridden(keys)` dims the design rows an
  override is hiding (class `kp-overridden`: value 0.4, label 0.6 italic,
  the tooltip prefixed with OVERRIDDEN_NOTE, the original kept in
  dataset.kpTip). The rows keep the STORED value, so a row never lies
  about the design, and `flowSpeedRow.hidden` still keys on the stored
  flowStrength.

- HOVER GLOW WIDTH ROW (K111 stage 4, 2026-10-14; Levi K264): "Hover
  glow width" (`hoverGlowWidthRow`) sits in the maze folder right under
  "Hover glow" and hides with it (`!fab`: fabric mode only). A slider,
  [0.3, 1] step 0.05; its tooltip says how far in from each edge the rim
  reaches and that it applies live. Its change runs onTrailChange, and
  undo_stack.ts lists it under that callback's LIVE_EFFECTS, so an undo
  applies it live. It still shows at strength 0 (a stage 5 candidate).
  Param: gameplay-links.md; shader: render-paint.md's WIDTH SLIDER.

- K298 ROWS (2026-10-14; Levi: "its own length setting", the end fade
  "give this a slider too", "a slider for its thickness", the pick
  margin "add a slider to control this" and "a separate slider for that
  ratio"). In the maze folder, between "Hover glow" and its width row,
  fabric mode only: "Hover glow length" ([0.5, 15], step 0.25) and "Hover
  glow end fade" ([0, 1.5], step 0.05), both onTrailChange. The width row
  is relabeled "Hover glow thickness" (the param keeps `hoverGlowWidth`,
  `hgw`). In Touch & feel, before tugLimit: "Mouse pick margin" ([0, 20]
  CSS px, always shown: knot mode picks threads too) and "Choice pick
  ratio" ([1, 4], fabric only: knot mode has no choices), both
  onSlackChange, with no step (K130) and an edit rounded to 2 decimals.
  The two pick rows carry word labels, like the hover glow rows, while
  the rest of Touch & feel shows camelCase keys (pluckRipple, tugLimit);
  unifying them is open. Tooltips say what each does and that it applies
  live. Params: gameplay-links.md.

- EXPLORATION ROWS (K76 stage 2c, 2026-10-15): the fog's checkbox became
  the "exploration" list (off / "fog of war" / "thread reveal"; the
  labels differ from the values off / fog / threads, as pathViz's do).
  The fog rows (fowRadius) show only under fog, "intro in the open"
  (fowIntro) under fog or threads unless the appearance is instant, and
  "reveal distance" ([1, 12], step 0.25), "reveal fade" ([0.35, 4], step
  0.05) and "reveal end" (the six looks) only under threads. All run
  onTrailChange. Params: gameplay-links.md. K465 (2026-10-15) added "show
  finish" (`revealFinish`, a checkbox, default on) after "reveal end",
  also only under threads and onTrailChange. Tooltip: "Show where the
  finish is from the start: its marker, the gap around it and the arrow
  at the screen edge while it is off screen, even over thread you have
  not explored. Off hides the finish until you have seen it. Applies
  live." K466 (2026-10-15) added "end at crossing" (`revealEndCross`,
  under / past / back, default under) and "end glow" (`revealEndGlow`,
  soft / bright, default bright) between "reveal end" and "show finish",
  both only under threads and onTrailChange. Tooltips: "Where a thread
  you have not explored ends when its end would lie under a crossing,
  hidden by the thread on top: under (it stays there), past (it shows a
  little further, beyond the crossing) or back (it ends before the
  crossing). Applies live." and "How strongly the light at the end of a
  thread you have not explored shows (the halo and beacon ends): soft or
  bright (larger and brighter). Applies live." The glow row shows for
  every look, though only halo and beacon draw a halo.

- BURNT ROW (K290 stage 3a, 2026-10-15): "burnt" (gone / char) in the
  Burn race folder, last since K440, hidden while the fire is off like
  fireSpeed and fireDelay; it runs onTrailChange (live, no restart). Params:
  gameplay-links.md; the look: gameplay-fire.md's BURNT THREAD.

- FRAGILE AND PAR ROWS (K137 stage 1, 2026-10-20): in the Game folder,
  fabric mode only, in every game mode: "Fragile runs" (off / crack /
  snap), "Par" (off / strict / strokes) and "Par slack (x fewest)" ([0,
  1], PAR_SLACK_MIN / MAX; hidden while par is off; no step, K130, and an
  edit keeps the 0.05 grid; two decimals shown). All three restart the
  solve (onClockChange; undo_stack.ts lists them there). The tooltips say
  what each mode does, that a dead-end tail, the entrance's and the
  exit's never break, that a strand is undone or restarted, and that
  strokes reads golf style (+2, E, -1). Params: gameplay-links.md's
  FRAGILE AND PAR PARAMS; the rules: gameplay-mechanisms.md.
- COLLAPSE ROW (K139, 2026-10-20): "Collapse" (off / finish / free) in
  the Game folder after "Par slack (x fewest)", fabric mode only, in every
  game mode; it restarts the solve (onClockChange; undo_stack.ts lists it
  there). The tooltip gives the rule and both modes, and says it overrides
  Fragile runs and Par (whose rows stay visible) and restarts the solve.
  Param: gameplay-links.md's COLLAPSE PARAM; the rules:
  gameplay-mechanisms.md's Collapse.
- CUT ROW (K114, 2026-10-20): "Cut" (off / on / lead / delay since the
  walker stage; the tooltip says what lead and delay ask) in the Game folder after
  "Collapse", fabric mode and the classic game only; it restarts the solve
  (onClockChange; undo_stack.ts lists it there). It stays visible while
  Fragile runs, Par or Collapse is on, which turn it off (setRules). The
  tooltip gives the scissors and their keys (X, Esc, U), the contraction,
  the refusal, the uncuttable runs, Undo and the scope. Param:
  gameplay-links.md's CUT PARAM; the rules: gameplay-mechanisms.md's The
  cut.

- LIVES ROW (K137 stage 3a, 2026-10-20): "Lives" (a 0..5 slider, step 1,
  0 shown as "off") is a shared chase row (both clocks) just before "Catch
  restarts level", hidden with the minotaur off. While it is above 0 the
  Catch restarts level row hides and is ignored, and the rows that hide
  under minoRestart (minoLair, minoRefog) show again (refreshCond's
  `restartOn = minoRestart && !livesOn`). The tooltip gives the rule, the
  recommended 3 and what off means. Applies live (onChaseChange). Param:
  gameplay-links.md's LIVES PARAM; the rules: gameplay-minotaur.md's
  LIVES.

- SWORD ROWS (K137 stage 3b, 2026-10-21): "Sword" (off / timed / one
  use, `sword`) and "Sword lasts" (`swordMoves`, a 4..20 slider, step 1)
  sit right after "Lives" in the Game folder, shared by both clocks and
  hidden with the minotaur off; "Sword lasts" also hides while the sword
  is off. Both restart the solve (onClockChange): a new chase lays the
  sword down, or none. Tooltips: "A sword lies a few runs off the
  shortest way. Take it and the minotaur flees you for a while: touch it
  then and timed sends it back to its lair, one use slays it for good.
  Restarts the solve." and "How long the minotaur flees once you take the
  sword: moves on the turn clock (a wait counts), runs walked in real
  time. Restarts the solve.". Params: gameplay-links.md's SWORD PARAMS;
  the rules: gameplay-minotaur.md's THE SWORD.

- FIRE CLOCK ROW (K114 stage 2, 2026-10-15): "clock" (turn / realtime,
  `fireClock`) in the Burn race folder, hidden while the fire is off; it
  runs onClockChange (a change restarts the solve; undo_stack.ts lists it
  there). Tooltip: "turn: the fire burns as far as you walk, so standing
  still to think is free. realtime: it burns on a clock from your first
  move, your dot walks at a fixed pace, and if the fire reaches you while
  you stand there, you burn. Each clock keeps its own fireSpeed and
  fireDelay. Restarts the solve." (the second-last sentence since K440).
- EACH CLOCK'S OWN ROWS (K440, 2026-10-15; brief `docs/design/K440.md`):
  the folder holds two speed/delay pairs, the turn clock's (`fireSpeed`,
  `fireDelay`) and the real-time clock's (`fireSpeedRt`, `fireDelayRt`,
  rows labeled "fireSpeed" / "fireDelay" too), and refreshCond shows only
  the clock's own pair, so the order the player sees is fire, clock,
  fireSpeed, fireDelay, burnt (the clock row moved up from after
  fireDelay so it sits above the pair it picks). A clock change only
  swaps which rows show: no value is refreshed, so no row's handler runs.
  Each reset glyph returns its own pair's default (0.6 / 0 turn since
  K280, 0.75 / 0 before; 0.2 / 20 realtime). Ranges [0.1, 0.95] (FIRE_SPEED_MIN since K440; 0.3 before)
  and [0, 40] for both pairs. The real-time tooltips quote the dot's fixed
  pace (12 lattice units a second; "a run is about 4"): 0.2 burns 2.4
  units a second, 1 for every 5 the dot walks; a delay of 20 is about 1.7
  s, 40 about 3.3 s. Every row restarts the solve (onClockChange). PROBE
  NOTE: the rows share labels, so find them by key or tooltip (the
  real-time pair's say "your dot's fixed pace"; the clock row's tooltip
  says "fixed pace" too, so match the longer phrase), not by label alone;
  `.claude/probes/K440/k440_page.mjs` does. Params: gameplay-links.md's
  REAL-TIME FIRE PAIR; the race: gameplay-fire.md's REAL-TIME FIRE.

- MINOTAUR BEHAVIOR ROWS BY MODEL (K80 turns stage 3a, 2026-10-15; K294,
  K324 section 4.3): the "Minotaur behavior" subfolder (shown while the
  turn minotaur is on) gains six rows and shows each model only the rows
  it reads (refreshCond, so a model or speed change re-runs it). Hunter:
  minoSight, minoGiveUp, minoRoamMin, minoRoamRuns, minoTurnPull,
  minoAccuracy. Guard: minoGuardSight, minoGiveUp, minoTerritory,
  minoTurnPull, minoGuardAccuracy. Stalker: minoStalkerAccuracy, plus
  minoSight at speed charge (its charge reads the shared sight; it never
  roams, so no pull, give-up or roam rows). Every model: minoPause and
  minoSleep. Folder order: minoSight, minoGuardSight, minoGiveUp,
  minoRoamMin, minoRoamRuns, minoTerritory, minoTurnPull, minoAccuracy,
  minoGuardAccuracy, minoStalkerAccuracy, minoPause, minoSleep. The run
  counts are integer sliders (sight [0, MINO_SIGHT_MAX], give-up [0,
  MINO_GIVE_UP_MAX 10], roam-min [MINO_RUNS_MIN 1, MINO_ROAM_MIN_MAX
  10]); the chances are chanceRow's ([0, 1], no step, an edit rounded to
  2 decimals). Labels stay the camelCase keys like the folder's other
  rows; each tooltip names the model it tunes ("Hunter:", "Guard:",
  "Stalker:"; minoSight's adds that the stalker charges within it) and
  says it applies live (onTurnMinoChange, LIVE_EFFECTS). K293 (e):
  minoSleep's tooltip says it waits again after each catch, in its lair
  or, with minoLair off, where it caught you. Params: gameplay-links.md;
  behavior: gameplay-minotaur.md.

- REAL-TIME TUNING ROWS (K324 stage 1, 2026-10-20; brief
  `docs/design/K324_s1.md`, q8): the collapsed "Minotaur tuning"
  subfolder (K323) now shows under BOTH clocks while the game is the
  minotaur (`fMinoBehavior.hidden = !gameMino`; before, only on the turn
  clock). The turn clock's model rows and minoPause / minoSleep hide in
  real time; real time's seven rows (in `rtRows`) hide on the turn clock.
  Real time's own rows (paces through the lair wait) are created before
  the subfolder, so it sits after them and before the shared rows
  (minoFog on); stage 3 moved them into it (REAL-TIME MODEL ROWS,
  below). The seven, in order: "Junction stop, min (s)", "Junction
  stop, max (s)", "Stop while hunting (x)", "Turn-back margin", "Dead-end
  reach (x roam)" and "Nearest roam (x roam)" (`tuneRow`: no step, K130;
  an edit keeps 2 decimals), then "Telegraph reach (runs)" (an integer
  slider, 0-3; since K324 stage 2 its tooltip reads "Real time: how many
  runs of its next move show (with Show its next move), past the run it
  is on. Applies live."). Each
  tooltip starts "Real time:" and says it applies live (onChaseChange,
  LIVE_EFFECTS). LABELS: the brief's five longer ones ("Junction stop,
  shortest (s)", "Junction stop, longest (s)", "Junction stop while
  hunting (x)", "Dead-end reach (x roam range)", "Nearest roam (x roam
  range)") break K327's 23 characters, so the rows carry the shorter
  ones; keys and values are the brief's. Params: gameplay-links.md's
  JUNCTION STOP PARAMS; behavior: gameplay-minotaur.md.
- REAL-TIME MODEL ROWS (K324 stage 3, 2026-10-20; brief
  `docs/design/K324_s3.md`): the Behavior row (`minotaur`: Hunter / Guard
  / Stalker, Game folder) shows under BOTH clocks while the game is the
  minotaur (`minotaurRow.hidden = !gameMino`; before, turn clock only)
  and picks real time's model too; it still restarts the solve
  (onClockChange). K80's real-time rows ("Wander speed" through "Lair
  wait (s)") are now created INSIDE "Minotaur tuning" by `chaseRow` (in
  `rtRows`, hidden on the turn clock); `chaseRow(..., true)` keeps the
  shared rows ("Seen through fog", "Catch restarts level", "Lair after a
  catch", "Catch restores fog") in the Game folder after the subfolder.
  New rows, after "Loses you beyond": the guard's "Territory" ([5, 150]
  u, step 1), "Spots you within" ([0, 100]), "Loses you beyond" ([0,
  150]) and "Accuracy", then the stalker's "Accuracy" (both [0, 1], no
  step, K130; an edit keeps 2 decimals). BY MODEL (refreshCond, real
  time): minoDetect / minoLose show for the hunter and the stalker (its
  charge reads them), the guard's four for the guard, the stalker's
  accuracy for the stalker; the long stops, "Visits dead ends" and
  "Roams toward you" for the hunter and the guard; "Roam range",
  "Dead-end reach" and "Nearest roam" for the hunter only; the paces,
  speed variation, catch distance, lair wait, the junction stops, the
  turn-back margin and the telegraph reach for all three. Labels repeat
  ("Spots you within", "Loses you beyond", "Accuracy"), so probes find
  rows by key or tooltip; each tooltip names its model ("Guard:",
  "Stalker:") and says it applies live (onChaseChange, LIVE_EFFECTS).
  Params: gameplay-links.md's REAL-TIME MODEL PARAMS; behavior:
  gameplay-minotaur.md's REAL-TIME GUARD AND STALKER.
- TELEGRAPH LOOK ROW (K525, 2026-10-20; brief
  `docs/design/K525_telegraph.md`): "Telegraph look" (Rims / Line /
  Both, `minoTelegraphLook`) sits in the Game folder right under "Show its
  next move", a turnRow (onTurnMinoChange, so undo_stack.ts lists it under
  that callback's LIVE_EFFECTS and an undo applies it live). refreshCond
  hides it unless the turn minotaur is on and a telegraph shows
  (`telegraphOn`: the checkbox, or speed charge or two, which force it
  on). Tooltip: "Telegraph look: rims light both edges of the run it will
  take in red; line draws a red line over it; both draws the two. The
  ring where it will stand shows in every look. Applies live." Param:
  gameplay-links.md's TELEGRAPH LOOK PARAM; the look: gameplay-minotaur.md.
  BOTH CLOCKS (K324 stage 2, 2026-10-20; brief `docs/design/K324_s2.md`):
  "Show its next move" (`minoTelegraph`) shows whenever the game is the
  minotaur (`minoTelegraphRow.hidden = !gameMino`), and real time draws
  it. Its tooltip: "Show its next move in red. Turn clock: the run it
  will take and where it will stand, decided when your move ends (forced
  on at charge and two). Real time: the rest of the run it is on and the
  runs it plans next (Telegraph reach), with a ring where it is headed
  once the route reaches it; faint while it roams, bright while it
  hunts. Applies live." The look row hides when `!gameMino || (realtime
  ? !params.minoTelegraph : !telegraphOn(...))`: in real time it follows
  the checkbox alone (no speed forces it there).
- ROW HELP (K467, 2026-10-15; brief `docs/design/K467.md`; Levi: "tooltip
  type information for param controls on mobile"; the coordinator's
  recommendation, no long press, no (i) buttons): a tap or click on a
  row's LABEL (`.tp-lblv_l`) toggles a help block inside the row,
  `div.kp-help#kp-help-N` appended by `wireHelp` in `row()`, showing the
  row's `title`. One source: the text is read from `el.title` when the
  block opens and again by `syncHelpText` after markOverridden changes it
  (OVERRIDDEN_NOTE rides along), never copied. One block at a time
  (`helpOpen`); `closeHelpIfHidden` (run by refreshCond and the folder
  toggles, from the classes, since a closed panel has no layout) closes a
  block whose row hid or whose folder collapsed. The row wraps only while
  a block is open (`.kp-row.kp-help-open{flex-wrap:wrap}`, the block is
  `flex:0 0 100%`); closed, the block and the mark are `display:none`, so
  a desktop panel with no block open is what it was. The reset glyph is
  not a help target (its own pointerdown, and the label's click handler
  skips `.kp-reset`).
- THE (i) AND THE LABEL AS A BUTTON (K467): the muted (i) is
  `span.kp-i` inserted before the reset glyph, shown only under
  `(pointer:coarse)` or SHEET_QUERY (desktop keeps its hover tooltip and
  shows no mark), and the "i" is `::before` CSS, not text: the label's
  `textContent` stays "weaveDensity⟲" and K92's undo probe, which finds
  rows by label text, keeps working. A labeled row gets `kp-has-help`;
  K482 (2026-10-15): it is a BUTTON only while `helpEnabled(coarse, sheet)`
  (`helpWanted()` in `tweakpane_panel.ts`, pure in `panel_sheet.ts`) -
  a coarse pointer or the sheet. Then: role=button, tabIndex 0,
  aria-expanded, aria-controls (the block's id), Enter and Space, and a
  focus-visible outline. Off (fine-pointer side panel) it carries no role
  or Tab stop, its click and keys do nothing, and the native `title`
  tooltip is the help (one Tab stop per row). The block and the mark stay
  in the DOM (`display:none` off), and `applyHelpGate`/`syncHelpGate`
  on `sheetMQ`/`coarseMQ` change move every row with the layout, so a
  resize or rotation switches help live. The label's click handler
  preventDefaults, so a tap on a CHECKBOX row's label opens help and
  never toggles the box (probe: "Reduced motion"). Long labels ("Hover
  glow end fade") wrap on the sheet with the reset glyph and the (i) on
  the second line: cosmetic.
- NO TOUCH HELP YET (K467): the buttons and non-row elements, whose
  titles still say what a player may need: "Reset path" (clear the traced
  path and start over from the entrance), "Replay settle" (restart the
  knot from its lattice state), "Reset to defaults" (every parameter,
  seed kept), the seed row and its dice, the Daily button, the stats
  button; of low value, the credit link (snoringcat.games), the licenses
  link and the version span (build time). Folder headers have none.
- THE SHEET ON PHONES (K468, 2026-10-15; `src/ui/panel_sheet.ts`, pure and
  tested in `test/ui/panel_sheet.test.ts`; Levi: "the settings menu should
  be full screen on mobile"): SHEET_QUERY = `(max-width: 700px), (pointer:
  coarse) and (max-height: 500px)` (a phone in either orientation, 753x411
  included; tablets and desktops keep the 320 px side panel), the one query
  the panel's CSS, the badge's CSS, camera.ts and `matchMedia` all read
  (`sheetLayout(w, h, coarse)` is the same rule on numbers). Under it the
  Tweakpane wrapper `.tp-dfwv` is position:fixed, left 0, right 0 (the
  inline top, right, width and max-height of the side panel lose to
  `!important`), z 28, height `100dvh - --kp-top`, opaque #28292e,
  padded by the safe-area insets and scrolling inside itself; unit size 32
  px, value column `min(50%, 440px)` (58% wrapped the long labels), font
  13 px (K483: `SHEET_FONT_PX` on `.tp-rotv`, `.kp-head`, `.kp-help`
  under SHEET_QUERY only; the side panel stays at Tweakpane's 11).
  A TOP BAR (`div.kp-bar`, z 29, fixed, `--kp-top` tall: 62
  px, safe-top + 52) sits behind the hamburger, which is the close button
  (X while open, aria-label "Close settings"), and undo and redo, which
  keep their place beside it; the badge keeps the bar's left (see
  gameplay-badge.md's OPEN-PANEL ROW). A LOAD STARTS WITH THE SHEET CLOSED
  whatever `knotmaze.panelOpen` holds (`panelStartsOpen`), and the sheet's
  open state is never stored there. A rotation or a window resize
  switches live (`sheetMQ` change): an open panel takes or gives back its
  history entry.
- BACK CLOSES THE SHEET (K468; `SheetHistory` in panel_sheet.ts): an open
  sheet owns ONE history entry (`pushState({kmSheet:1})` on open); Android
  Back pops it and `onPop` closes the sheet, a close by the button or a
  switch to the side panel gives it back (`history.back()`, counted in
  `pending` so the pop event it causes does not close a sheet reopened in
  the same moment). EVERY pop of ours then rewrites the design's link
  (`onSheetBack`, main.ts: `writeParams(params)`): the app replaces the
  address bar and never pushes, so the edits made in the sheet went to the
  pushed entry and the one Back returns to holds the link from before the
  sheet opened. The page itself stays (Back does not reload it). Probe:
  `page.goBack()` after a design edit in the sheet closes it, the document
  is the same (a marker on `window` survives) and `location.search` is the
  edited link; a button close, then reopen, then Back closes once and
  stays. KNOWN: a reload (or tab discard) with the sheet open leaves its
  stale entry under the fresh page, so the first Back lands on the same
  page (an unclaimed pop only rewrites the link: two Backs to leave); a
  close and reopen within tens of ms leaves one extra entry; a live
  switch to the sheet while the panel is open pushes without a user
  gesture, which Chrome's history-manipulation intervention may skip on
  Back (a desktop window dragged under 700 px).
- THE SHEET AND THE CAMERA (K468): `readPanel` in `src/app/camera.ts`
  returns false while SHEET_QUERY matches, so K198's pan range counts the
  sheet as no panel (gameplay-camera.md). `fitModeBadge` in main.ts passes
  no avoid-list (HUD, banners) while the sheet is open: they are under it.
- THE PEEK (K468; for Levi's review, tune freely): while a ROW is dragged
  on the sheet, everything but that row turns `visibility:hidden` and the
  sheet's background clears (root class `kp-peek`, the dragged row
  `kp-peeking`, a 90% panel color behind it so it stays readable; the top
  bar, close, undo, redo and the badge hide too), so the player watches
  the design change under their finger and the sheet returns on release.
  Visibility, not opacity or display, so the row shows inside its hidden
  parents and the drag keeps its element (the slider keeps tracking
  through the flip). It starts on the drag's SECOND change (a tap that
  only sets a value would flash the sheet away) and ends on any
  pointerup, touchend, mouseup, cancel or window blur, on the row's last
  change, on a close and on a layout switch. The sheet's scrollbar is
  made transparent while it lasts. Phone layouts only: the side panel
  never peeks.
- PROBES AND NUMBERS (K467 + K468): `.claude/probes/K467/sheet_probe.mjs
  <base> <out> portrait|landscape|live` (lib.mjs from K92; each mode ends
  with a checks summary; 36, 36 and 7 checks, no page errors; screenshots
  `<mode>_closed|open_top|help_open|scrolled_help|peek_mid_drag|
  after_peek|after_back.png`). Portrait 411x753 @2.625 touch: sheet
  0..411 x 62..753, bar 0..62, `--kp-top` 62; badge 123..241, undo and
  redo 259..351, close 359..401, all at y 10..52. Landscape 753x411: sheet
  0..753 x 62..411 (349 tall), badge 465..583, undo and redo 601..693,
  close 701..743. `live`: a 1400x900 desktop keeps the absolute side panel
  (width 250-340, right edge at least 1380, no bar, no (i) shown, the
  hover title kept), shrinking to 600x900 shows the sheet with its entry
  (history length +1, `history.state` kmSheet 1) and growing back gives
  the entry back (`history.state` null). `.claude/probes/K92/undo.mjs
  <base> <out> phone` passes 8 of its 9 phone checks as shipped and fails
  one BY DESIGN, "the badge sits below them, clear of the panel" (the badge
  now shares the top bar, left of undo and redo); its copy in
  `.claude/probes/K467/k92_undo.mjs` asks "left of them in the bar, clear of
  the sheet" and passes 9/9 on phone and 27/27 on desktop. K198's
  `stage2/pan.mjs` phone: gameplay-camera.md's SHEET note (3 of 16 checks
  expect a panel edge and fail by design). DESKTOP 1400x900, panel open and
  closed, master `803fbe9` against the branch `e26e05a`: 0 px, and the
  master-vs-master control 0 px too (`.claude/probes/K467/desktop_ab.mjs`,
  K83's pins; the build stamp and the panel's version span hidden, they
  differ per build). Gotchas: a probe taps a wrapped
  label at its first line near its left (x + 12), not at the middle of
  its box, where the reset glyph or the second line sits; a layout
  switch needs a reload after `setViewport` on a mobile emulation (probes.md).

- *K74 stage 3 (2026-10-16):* the Maze folder gains `exitCorridor`,
  `exitFlank`, `exitTaperRadius` and `exitTaperStrength` rows beside
  `exitClearance` (hidden with it, fabric only, all regenerating).

- PANEL STAGE A2 (K541, 2026-10-16; K339 tree, A1 was K534): the folder
  order is Accessibility (Reduced motion, High contrast, Motion), Design
  (grid, shape, weave, turn, seed, Daily), Game, Maze (generation only,
  anchors included), Path & view (path display, camera, pulses, marker
  size, maze stats, move pad, confetti; Hover glow and Off-screen arrows
  nested collapsed), Look (Backdrop tuning nested collapsed: speed,
  size, detail, fibers, grain, silk angle, colors, page color, accents),
  Motion & intro, Touch & feel, Sound (Muted, Volume, auto-pluck
  loudness first), Physics (agitation last), Developer (debug, stats,
  sim speed, settle budget, load settle; last, collapsed), then Reset to
  defaults at the root. Every row's label is words of at most 23
  characters (K327); keys and values never change with a label. The
  desktop panel is 320 px wide (`.tp-dfwv{width:320px}`; the sheet
  overrides it). All top-level folders are created in display order at
  the Design folder, so a row's code may live anywhere; the three nested
  folders are created just before their first row so they sit after
  their parent's own rows.

- *K336 (2026-10-20):* Path & view's confetti rows gain "Side cannons"
  (`confettiCannons`), "Cannon amount" (`cannonAmount`, 0-3) and
  "Streamers" (`streamerShare`, 0-1) after "Foil confetti". All three
  hide in knot mode and at confetti amount 0; Cannon amount also hides
  while the cannons are off, and Streamers while they are off or at 0
  (render-confetti.md, K336).
