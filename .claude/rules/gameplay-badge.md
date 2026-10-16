---
paths:
  - "src/ui/mode_badge.ts"
  - "test/ui/mode_badge.test.ts"
---

# Gameplay lore: the mode badge

Moved verbatim from `gameplay.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `gameplay.md` lists the area's other files.

## Corner chrome

- MODE BADGE (K73, 2026-10-12; K151 stage 1, 2026-10-14, brief
  docs/design/K146_K151.md; ui/mode_badge.ts): a pill left of the
  hamburger naming what the solve on screen is. Since K151 it is ALWAYS
  shown: the daily's name moved here from the HUD's title row, which is
  gone (the HUD shows only with its stat rows on or a real-time chase).
  modeBadgeFor (pure, tested) decides from the daily on screen, the
  store's official result, this attempt's finish record and `late`
  (K146: the attempt began, or unstarted would begin, after its day).
  KINDS: "Free play" (slate, compass) off the daily, knot mode included
  - a tap does what the panel's Daily button does (today's daily,
  replacing the design's link); "Daily #N" (the HUD's gold on navy, a
  chart; ` · <date>` for any day but today's, ` · solved` once this
  attempt set the official result) during the attempt that counts - a
  tap opens the daily stats (the title row's old job); "Daily #N replay
  · not scored" (amber, circling arrow) on a daily whose official result
  exists, before or after this run's finish; "Daily #N practice · not
  scored" (violet, calendar) on one begun after its day. A replay's or
  practice run's tap explains it in a toast (touch has no hover). THE X
  (Levi: without it the free pill read as a button that STARTS free
  play): free play only, the one tap that leaves a mode (the daily's
  leaves nothing; replay and practice only explain). It always shows,
  on the desktop too (K200, Levi 2026-10-14; it had faded in on hover
  and shown always only on coarse pointers), brightens on hover, and
  drops out at the icon levels. FIT: fit() steps the label down (long;
  short = "Daily #N", "Daily #N replay", "Daily #N practice"; one word =
  "Replay", "Practice"; the bare icon; the icon below the hamburger)
  until it clears the HUD and the win banner by 8 px and stays on
  screen; main.ts re-fits on every HUD update, resize and banner hide.
  Measured (2026-10-14, `.claude/probes/K146_K151/`): desktop 1400x900, a
  32 px pill, "Free play" 1233..1340 with its X's room. Phone 411x753
  (touch, a 42 px pill ending at x 351): with stat rows off every label
  shows whole ("Free play" 233..351, "Daily #3" 253..351, "Daily #3 ·
  solved" 205..351 beside the win banner, the replay's long label
  140..351, practice's 132..351); with stat rows on (the HUD ends near x
  207) "Daily #3" keeps 46 px clear, solved under the banner it steps to
  "Daily #3" (24 px clear), and the replay and practice step to one word
  ("Replay" 262..351 and "Practice" 255..351, both 55 px clear) - before
  the one-word level they fell to the bare icon. The panel never collides (it opens
  below the hamburger row) except at the last level.

- OPEN-PANEL ROW (K92, 2026-10-14): while the panel is open the undo and
  redo buttons take the hamburger's row and the badge drops to a row of
  its own below, right-aligned with the hamburger (`.kp-open .km-mode` in
  ui/mode_badge.ts; main.ts re-fits on every open and close). Closed,
  nothing moved: "Free play" 1233..1340 at 1400x900 and 233..351 at
  411x753, the K151 numbers. Open: desktop 1283..1390 at y 60..92 with
  the panel from y 100; phone 283..401 at y 60..102 with the panel from
  y 110 (`.claude/probes/K92/undo.mjs`).
  THE SHEET (K468, 2026-10-15): on the phone's full-screen settings sheet
  (SHEET_QUERY, gameplay-panel.md's THE SHEET ON PHONES) the badge sits IN
  the top bar, left of undo and redo: `top` max(10px, safe-top) + 5 px
  (coarse pointers: safe-top, the badge being 42 px tall there) and
  `right` max(10px, safe-right) + 160 px, which clears the close button
  and the undo/redo pair (150 px plus the margin). Measured at 411x753:
  badge 123..241, undo and redo 259..351, close 359..401, all at y 10..52
  in a bar from 0 to 62 (`--kp-top` 62 px, not 100); at 753x411: badge
  465..583, undo and redo 601..693, close 701..743. main.ts's
  `fitModeBadge` passes no avoid-list (HUD, banners) while the sheet is
  open, since they lie under it, so the label keeps its longest level (only
  the labels grow leftward from the right edge, x 241 at 411 px and 190 at
  360; fit() still keeps the left edge on screen. Measured, `badge_long.mjs`:
  at 411 "Free play" 123..241, "Daily #4" 143..241 and "Daily #1 practice ·
  not scored" 22..241, undo from 259; at 360 the practice label steps down
  to "Daily #1 practice" 44..190, undo from 208; the replay label was not
  run). The peek (a slider drag on the sheet)
  hides the badge with the rest of the bar. Probe: `.claude/probes/K467/sheet_probe.mjs`.
