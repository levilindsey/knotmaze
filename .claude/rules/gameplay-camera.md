---
paths:
  - "src/main.ts"
  - "src/ui/view_clamp.ts"
  - "test/ui/view_clamp.test.ts"
---

# Gameplay lore: camera, gestures and taps

Moved verbatim from `gameplay.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `gameplay.md` lists the area's other files.

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

- FIT CAMERA PAN SLACK (K149, 2026-10-14; ui/view_clamp.ts, pure and
  tested; brief docs/design/K148_K149.md). Levi: "we should support
  panning the maze a bit more off-screen at furthest zoom. Especially to
  get it out from under the menu." The fit view is screen = zoom x
  fitScreen + pan; until K149 the zoomed fit frame had to COVER the
  screen, so zoom 1 had no pan range. Now the frame may overhang the
  screen's edge by PAN_SLACK = 0.3 of the screen's size per side, at every
  zoom: pan in [size (1 - zoom) - 0.3 size, 0.3 size] per axis
  (`clampFitView`, called by main.ts's clampView). A fixed share of the
  SCREEN, so opening or closing the panel never moves the view. WHY 0.3:
  the desktop panel is 256 px at 10 px from the right, and a maze that
  fills the width has FIT_MARGIN 40, so it must move left by 226 px plus a
  gap: 17% of 1400, 23% of 1000, 29% of 800 (below 700 px the panel
  starts closed). MEASURED (`.claude/probes/K148_K149/probe.mjs slack`):
  at 1000x800 and 800x700 the maze overlaps the open panel at home (its
  right edge 850 against the panel's 734; 701 against 534) and clears it
  at the limit (550; 461); at 1400x900 it already clears it at home (1099
  against 1134). A PHONE (411x753): the open panel is 320 px wide at x
  81-401 (78%) and runs to the bottom, so no share short of about 70%
  clears it; 0.3 moves the maze 123 px, and the panel starts closed
  there. Left as is (open for Levi). WHAT FOLLOWS: zoom about a point
  (pinch, wheel) keeps the point under the cursor, and zooming back out
  returns to the slack view it left (at zoom 1 the pan range is no longer
  a point, so it is not snapped home); the RESET (double-click, double-tap
  on empty space; viewHoming) ended on |zoom - 1| alone, so from a
  slack-panned zoom-1 view it snapped on its first frame: it now waits
  for the pan too and eases; the FOLLOW camera has no clamp (placeWorldAt
  clamps only its zoom), is unchanged, and returns to the head by itself
  2.2 s after a gesture; indicators place themselves against the chrome
  whatever the pan (both discs clear of each other and of the open panel
  at 1400x900 and 411x753). Hooks: `__knotView()` also returns the fit
  camera's zoom, panX and panY, `__knotIndicators()` headWhy and
  followIdle. GOTCHA: puppeteer's `mouse.click(x, y, {clickCount: 2})`
  gave two pointerdowns and no dblclick here; dispatch the event.

- *From RENDER-ONLY PLUCKS (2026-10-11), taps and drags:* TAPS + AUTO PLUCKS touch zero physics
  (bitwise: positions/prev/zPos/pass ctrls, 0 steps, never wake); a DRAG
  still tugs and its release keeps the snap-back plus the vibration. A
  press on a thread waits for a per-pointer slop (mouse 4 / pen 6 / touch
  10 CSS px): lift = tap-pluck on pointerup, move = tug grabbed at the
  PRESS point (physics off: a pan).
