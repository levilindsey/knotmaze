---
paths:
  - "src/ui/motion.ts"
  - "test/ui/motion.test.ts"
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
  lasts the session. NOT gated (left for Levi): flow, the intros, the
  pulses. No cross-tab sync; K84 sorts it with the other viewer prefs.
  Probe: `.claude/probes/K79/k79_motion.mjs` (38 checks; K180 rewrote
  its four pluck checks for K104's still plucks: full motion moves,
  reduced stays still, attack and ghost only at full motion, the same
  decay clock, the still unit's cue scaled by its gain); after
  emulateMediaFeatures, wait two rAFs before reading the change.
