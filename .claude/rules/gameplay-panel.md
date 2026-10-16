---
paths:
  - "src/ui/tweakpane_panel.ts"
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
  onTrailChange. Params: gameplay-links.md.

- BURNT ROW (K290 stage 3a, 2026-10-15): "burnt" (gone / char) in the
  Burn race folder, after fireDelay, hidden while the fire is off like
  fireSpeed and fireDelay; it runs onTrailChange (live, no restart). Params:
  gameplay-links.md; the look: gameplay-fire.md's BURNT THREAD.

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
