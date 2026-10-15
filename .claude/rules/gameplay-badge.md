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
