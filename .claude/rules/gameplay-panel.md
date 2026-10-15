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
