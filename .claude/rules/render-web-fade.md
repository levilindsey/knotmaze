---
paths:
  - "src/render/web_fade.ts"
  - "test/render/web_fade.test.ts"
---

# Render lore: the gold web's fade (K169)

Moved verbatim from `render.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `render.md` lists the area's other files.

## The gold web's fade (K169)

- THE FULLY TRAVELED WEB FADES IN (K169, 2026-10-14; Levi: "Fade."). K127
  filled a web with gold the frame its last arm was traveled; now the web
  crossfades from its untraveled material to the arms' composed paint over
  `WEB_FADE_S` 0.25 s (smoothstep: neither end jumps). `web_fade.ts` is the
  pure half (a per-junction clock, `webFadeLevel`); the renderer starts a
  fade in `resolveRoutes` for each junction NEWLY in `fullJn`, writes the
  eased level into the record's J1.z each paint tick (`tickWebFade`: a
  texel and its row upload, no fillet rebuild), and scales the paint of the
  junction's caps by it (`fadingArmLevels` in `writePaintItems`: a full web
  keeps its caps, which would pop in otherwise). J1.z was K127's 0 / 1 flag
  and is now the LEVEL: the junction shader (and its CPU mirror,
  `cpuJunctionField`, in the same commit) blends the untraveled and the
  composed base by it, calling the second base only for a level strictly
  between 0 and 1, so the primary path (and every non-fading frame) is the
  K127 code. A fading record keeps its untraveled strip rows until it
  reaches 1. The clock is the renderer's PAINT CLOCK (`paintClock`, which
  probes pin: a pinned clock holds a fade at its level, so a probe shows any
  frame of it by setting `r.paintClock` and waiting two rAFs), and
  `r.webFade.seconds = 0` turns the fade off (K127's single frame, for
  same-state A/Bs). A web that stops being full (a backtrack, a reset) fades OUT
  too (K191, below); a web already full on the FIRST declaration after a
  scene is built (a saved attempt restored on load) shows full without a
  fade. `FabricMazeRenderer.webFading` feeds
  main.ts's sceneAnimating(). REDUCED MOTION keeps the fade: it moves
  nothing, it is a 0.25 s crossfade of colors, and ui/motion.ts gates
  movement (the background's drift, the plucks, the camera ease), not fades
  (the pulses and the move animation are not gated either); the code reads
  no motion setting, and a reduced page measures the same timeline.
  MEASURED (`.claude/probes/K154_K169/fade_page.mjs`, `?b.c&am=instant&snd=
  none&phy=0&fw=0&bg=none`, K81's "twice" plan: the cheapest move, the
  shortest cycle, one move forward, which makes joint 0's fourth arm
  traveled): pinned, the joint's J1.z is 0, 0.145, 0.470, 0.809, 1, 1 at
  0, 0.06, 0.12, 0.18, 0.25 and 0.4 s. Against the K127 build (ca7d3e6) at
  the same state, at desktop (1400x900) and phone (411x753 at 2.625)
  size: the frames at 0.25 s and later are 0 px different (the whole phone
  frame, the desktop joint's crop; the full desktop frame differs by the
  build stamp's text only) and the frame before the tap is 0 px
  different; the web's own pixels at 0 and 0.12 s differ from K127's by
  158 and 157 px at desktop (max delta 130 then 69 of 255) and 306 and 299
  at phone, all inside the web's footprint. In real time (no pins) the
  level runs 0.013 .. 1 over 226 ms in 14 frames at 60 fps (reduced motion
  the same), and `webFading` is false after. SAME-STATE A/B of the whole
  frame against the K127 build with `bg=none` (the hash moved the
  background): 0 px at fabric rest, in knot mode, under fog and at phone
  width, so no non-fading frame changed. CENSUS (GPU vs the mirror,
  K81's census_k81.mjs patched to force a level: `r.webFade.born.set(ji,
  r.paintClock - 0.12)` on every full web before the rebuild, level 0.470,
  fans on a 5 px grid, strips on a 2 px grid, the six moves above): the
  full web's 375 fan points max 0.0037 (0 over 2/255), its 420 strip
  points 0, routed fans 1500 points max 0.0060, unrouted 73125 max 0.0062
  (K75's fan baseline 0.0062; `census/census_k81.mjs`, the probes folder).
  Not measured: the fan program's GPU cost (the new branch runs only for a
  fading web).

## The gold web fades OUT too (K191)

- THE WEB FADES OUT TOO (K191, 2026-10-14; Levi: "fade out"; brief
  `docs/design/K154_K169.md`, Stage 2). A web that stops being fully
  traveled (a backtrack takes an arm out of the traveled passes)
  crossfades from the composed gold back to the untraveled material over
  `WEB_FADE_S` 0.25 s with the same smoothstep, caps and untraveled strip
  rows with it, instead of going untraveled in one frame. LEVELS: in 0 /
  0.470 / 1 at 0 / 0.12 / 0.25 s (K169, unchanged), out 1 / 0.530 / 0
  (`1 - webFadeLevel`). `web_fade.ts` is now a per-junction ramp (`from`,
  `to`, `t0`); `retarget(full, now, routed)` replaces K169's born-clock
  API, `levels(now)` reads, `step(now)` reads and forgets finished fades,
  and the renderer calls `retarget` from `resolveRoutes`. NO JUMPS: a web
  that turns around mid-fade (full again while fading out, not full while
  fading in) starts the opposite ramp from the level it shows at that
  moment and takes the full 0.25 s from there. The first `retarget` of a
  scene only learns the set (a web full on the first declaration shows
  full, no fade). No shader or `cpuJunctionField` change: both blend two
  bases by J1.z for a routed record, whichever way the level moves.
- WHAT DOES NOT FADE OUT: a web that leaves full AND leaves the routes (a
  reset, a string-mode switch, the trail aging out, a path that backs off
  the junction entirely). The shader only blends a ROUTED record's two
  bases, so there is nothing to blend and its fade ends at once; its arms
  lose their gold in that same frame, so the web has none of its own left
  to fade. A reset that empties many webs therefore looks as it did
  before K191 (every web leaves in one frame, not a staggered fade); webs
  that stay routed (a backtrack leaves the path on the junction) fade
  together on one clock; a fading-out web that then loses its last route
  mid-fade pops from its current level to untraveled. CAPS: the caps a
  full web keeps (traveled arms of visited, non-head vertices) follow the
  web out: `fadingArmLevels()` reads `webFade.levels(paintClock)`, a cap is
  skipped only when its arm has no level and the junction and the arm are
  routed (the K127 rule), and a fading-out web's remaining caps draw at
  `strength * level` until the fade ends. REDUCED MOTION keeps both fades
  (no motion setting is read); `webFading` (sceneAnimating) turns false
  when the last fade ends.
- MEASURED (`.claude/probes/K191/`; `?b.c&am=instant&snd=none&phy=0&fw=0&
  bg=none`: K81's "twice" plan, then one FRESH forward arm, edge 120,
  which makes joint 0 full at the tap, then the back move, which leaves
  full at its END about 1.05 s later; `fade_out_page.mjs`, modes pinned |
  revout | revin | realtime | reduced | revrt). Pinned, the level at 0 /
  0.06 / 0.12 / 0.18 / 0.25 / 0.4 s after the web leaves full is 1, 0.855,
  0.530, 0.191, 0, 0, and `webFading` is false from 0.25 s. Reversals: out,
  then full again at 0.12 s, reads 0.530, then 0.598, 0.765, 0.910, 1 at
  +0.06, 0.125, 0.18, 0.25 s; in, then not full at 0.12 s (0.470), reads
  0.470, 0.402, 0.235, 0.090, 0. Real time: 14 intermediate frames over
  248 ms (reduced motion: 14 frames, 249 ms), biggest frame step 0.107,
  no jump, `webFading` false at the end; a reversal about 80 ms into a
  real-time fade: 19 frames, biggest step 0.094, ends full. Against the
  stage-1 build (e2f96b8, `bg=none`), desktop 1400x900 and phone 411x753
  at 2.625: the frame before the back tap is 0 px different (desktop: the
  build stamp's text only, 189 px) and every frame from 0.25 s on is 0 px
  different (the whole phone frame, the desktop joint's crop); the frames
  at 0 to 0.18 s differ only inside the web's footprint (desktop 355-365
  px, phone 280-344, max delta 113 of 255 at the first). No sector pop of
  the popped arm's row at the first fade-out frame (zoomed montage,
  `out/montage_desk_fadeout_z.png`). CENSUS (GPU vs `cpuJunctionField`,
  `census_out.mjs`, level 0.529984, fans on a 5 px grid, strips on a 2 px
  grid): the fading web's 379 fan points max 0.0058 and its 484 strip
  points max 0.0059 (0 over 2/255), routed fans 1137 max 0.0059, unrouted
  68599 max 0.0063 (K75's fan baseline 0.0062). The K169 census recipe
  above (`webFade.born.set`) is obsolete: `census_out.mjs` pins the clock
  and drives real taps (`e<edge>` a move, `b` the back move, `t<clock>`
  sets the paint clock), and it must NOT call g2lib's `freeze()`, which
  resets the clock and sets `webFade.seconds = 0`, so it ends any running
  fade (the first run read no fade for exactly that reason).
- PROBE GOTCHAS (K191): (1) a forward move that should make a web full
  must take a FRESH arm (an edge not yet in `pathEdges`); K169's "cheapest
  non-last" rule picks the cycle's own edge and never makes the web full
  on this tree. (2) A pinned probe's `step()` deletes a finished fade, so
  rewinding the clock after a fade ended shows none: reverse inside it.
  (3) Not measured: the fan program's GPU cost during fades, and a
  fading-out web whose junction holds a cap on the head vertex (the
  tap-time case: a 3-arm junction passed twice, head on the second
  arrival, was not built on a real page).
