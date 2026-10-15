---
paths:
  - "src/audio/**"
  - "test/audio/**"
---

# Gameplay lore: audio

Moved verbatim from `gameplay.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `gameplay.md` lists the area's other files.

## Audio

- *From the 2026-10-11 small round 2, the audio autoplay gate:* AUDIO AUTOPLAY GATE (knot_synth.ts): no AudioContext exists
  until the first activation-triggering input (keydown, mousedown, mouse
  pointerdown, touch/pen pointerup, touchend; navigator.userActivation
  decides where supported), and the gate's capture-phase window listener
  creates + resumes it INSIDE that gesture (iOS unlocks only there) -
  music-mode plucks before it are silent no-ops, so Chrome's "AudioContext
  was not allowed to start" warning is gone.

- AUTO PLUCKS' VOLUME (K279 stage 1, 2026-10-14; brief
  `docs/design/K279.md`). Levi: "I want manual plucks to be louder than
  auto plucks". Auto plucks (the random and music sound modes) play
  through their own GainNode, `autoBus` in knot_synth.ts, which sits
  between their voices and the master gain. Its level is `autoPluckGain`
  (`pag`, [0, 1], default 0.5 = -6 dB). At 1 it is the mix before K279,
  since a gain of 1 multiplies exactly. `pluck(freq, strength, when,
  auto)` routes by the flag (`outFor`), and plucks queued before the
  context keep their flag. main.ts's fabricTick calls `synth.setAutoGain`
  every frame, which is safe before the context exists. Only the level
  moves: an auto pluck's strength, which also sets its brightness, is
  unchanged. Taps (TAP_STRENGTH 0.55) and drag releases play as before.
  A viewer preference (DAILY_EXEMPT_KEYS).
