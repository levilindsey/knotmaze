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
  same-state A/Bs). FADE IN ONLY: a web that stops being full (a backtrack,
  a reset) is untraveled at once, as in K127; a web already full on the
  FIRST declaration after a scene is built (a saved attempt restored on
  load) shows full without a fade. `FabricMazeRenderer.webFading` feeds
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
