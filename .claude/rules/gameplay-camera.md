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

- FIT CAMERA PAN RANGE (K198, 2026-10-14, replacing K149's 0.3-screen
  slack; ui/view_clamp.ts, pure and tested; brief docs/design/K198.md).
  Levi: pan only "such that the right edge of the maze is shown to the
  left of the left edge of the panel". Fit view: screen = zoom x fitScreen
  + pan. The zoomed frame covers the screen (pan in [size (1 - zoom), 0]
  per axis; home, zoom 1, is one point), except that while the panel is
  open panX may go left until the maze's drawn right edge sits PANEL_GAP
  10 px (the panel's own margin) left of the panel: panX >= min(W (1 -
  zoom), panelLeft - 10 - zoom x mazeRight). Nothing more: not right, not
  vertically, not for a maze already clear of the panel. RIGHT EDGE
  (main.ts `fitRight`, fit-screen px): the threads' or a shown
  start/head/exit disc's, whichever is further (`markersRight`; the
  default `se` exit's disc pokes past the threads); under fog the fog
  box's. Not counted: the win ring (about 5 px past the disc, inside the
  gap), the head's glow, the minotaur. PANEL: the Tweakpane wrapper's
  rect, closed at width 0, height ignored. The panel snaps open and shut,
  but the range sees its edge through a TIME-BASED TWEEN (K198 stage 2):
  `stepPanelTween` (linear, PANEL_TWEEN_S 0.25 s on the camera's dt;
  reduced motion 0, a jump) and `easePanel` (smoothstep) give `panelT`,
  and `panRange` scales the panel's widening by it (`OpenPanel.open`).
  Each fit-mode frame `stepRange` eases against LAST frame's openness and
  then clamps to this frame's, so a view at the limit rides the tweened
  edge home in 0.25 s at any frame rate. Opening only widens the range,
  so it never moves the view. A resize or fit drift (the edge creeps a
  few px while the knot settles) EASES the view back: `easeIntoRange`
  keeps a per-side allowance of 0.85 of how far it is out (RANGE_EASE
  0.15 a frame, the reset's rate, so frame-rate dependent), and gestures
  clamp to range + allowance, so nothing snaps. MEASURED
  (`.claude/probes/K198/pan.mjs <base> <out>
  1000x800|800x700|1400x900|phone`): the zoom-1 left
  limit puts the edge 9-10 px left of the panel (725 vs 734, 525 vs 534,
  phone 71 vs 81; 1400x900 clears it at home, 1122 vs 1134). Closing at
  the limit rides home in 0.24-0.28 s, 8-9 frames in the probe window (143
  px at 1000x800, 192 at 800x700, 298 on phone; `.claude/probes/K198/
  stage2/pan.mjs`, whose closing check expects the glide on a build with
  `panelT`); before stage 2 it eased for 35 frames, about 1.05-1.1 s.
  Reset, zoom about a point and the FOLLOW camera
  (unclamped) are unchanged; zooming out with the panel closed slides the
  view in a little each step (64 px a 0.9x step at 1000x800, as before
  K149). Hooks: `__knotView()` adds panel, mazeRight, range, allow and
  panelT (stage 2);
  K149's `probe.mjs slack` checks the old rule. GOTCHA: puppeteer's
  `mouse.click(x, y, {clickCount: 2})` gave no dblclick; dispatch the
  event.

- *From RENDER-ONLY PLUCKS (2026-10-11), taps and drags:* TAPS + AUTO PLUCKS touch zero physics
  (bitwise: positions/prev/zPos/pass ctrls, 0 steps, never wake); a DRAG
  still tugs and its release keeps the snap-back plus the vibration. A
  press on a thread waits for a per-pointer slop (mouse 4 / pen 6 / touch
  10 CSS px): lift = tap-pluck on pointerup, move = tug grabbed at the
  PRESS point (physics off: a pan).
  K279 (2026-10-14) is Levi's exception ("maybe add a bit of the
  physics-based tug to it as well"): the zero-physics rule holds at
  `pluckTug` 0, the default. At `ptg` > 0 (stage 1's default 0.3), a tap
  displaces the tapped stretch (positions and prev together) and wakes
  the knot. Auto plucks tug only with `tugAuto`. Never with physics off
  or under reduced motion. The default went back to 0 after the wake
  probe: any wake runs at 7-9 fps at default sizes on the desktop, 3-4
  in a dense maze (render-pluck.md's K279 WAKE COST). The mechanism is the K279 entry in
  render-pluck.md.
