---
paths:
  - "src/game/beat_rider.ts"
  - "src/game/beat_clock.ts"
  - "src/app/beat_frame.ts"
  - "test/game/beat_rider.test.ts"
  - "test/game/beat_clock.test.ts"
  - "test/app/beat_catch.test.ts"
---

# Gameplay lore: the beat rider

The beat clock (`clock=beat`, K114 beat; brief `docs/design/K114_beat.md`)
and its run timing (K795). `gameplay.md` lists the area's other files. The
K114 entry proper (the clock, the queue, the catch, the pause) is still to
write: until it is, the headers of `beat_clock.ts`, `beat_rider.ts` and
`app/beat_frame.ts` are the record. Params: gameplay-links.md's BEAT RIDER
PARAMS; the rows: gameplay-panel.md's CLOCK AND BEAT ROWS.

## Run timing (K795)

- RUN TIMING (K795, 2026-10-21; brief `docs/design/K795.md`; Levi, via the
  coordinator: "with beat rider mode, the actual beat/rhythm is
  important... make traversal speed variable so that each segment is
  traveled in the same amount of time", then "a toggle between today's
  multi-beat runs and one beat per run"): `beatTiming` picks how many beats
  a run takes. even (the default) gives every run `beatPerRun` beats (1 to
  4, default 1), so the dot reaches a junction every that many beats at a
  steady interval (72 ticks a beat at 100 bpm: TICKS_PER_MINUTE 7200 / 100)
  and rides a long run fast and a short one slow. length is K114's rule,
  beatsForRun(length, beatLength, beatCap) = max(1, round(length / unit)),
  at most cap, which keeps one pace. `runBeats(length, timing, perRun,
  unit, cap)` is the one rule; BeatRider.advance sets t0 = beatTick(beat)
  and t1 = beatTick(beat + runBeats(...)), so an arrival stays an exact
  integer tick on every device (K108).
- DEFAULTS: the param's default is even, the one default K795 changed on
  purpose (the pins it moved: gameplay-links.md's BEAT RIDER PARAMS).
  BeatRider's CONSTRUCTOR still defaults to length (perRun 1), so K114's
  tests keep their rule; the game always passes `beatSettingsOf(params)`
  (main.ts), never the constructor's defaults.
- EVERY FIELD, OR A NEW RIDER EACH FRAME: `beat_frame.ts` `ensure()`
  rebuilds the rider when tempo, unit, cap, timing or perRun differs from
  the one it has, so a settings object missing a field (undefined is not
  "length") rebuilds it every frame and the dot never leaves the start.
  beat_catch.test.ts's settings hit this when the fields were added (two
  tests saw no moves), and `tsc --noEmit -p .` did not catch it: tsconfig
  includes only `src`, so the tests are not type-checked.
- HOOK: `__knotBeat()` reports `timing` and `perRun` beside `tempo`,
  `ticks`, `t0` / `t1` (the run's departure and arrival ticks), `run` and
  `startBeat`, so a probe reads the arrivals directly: under even,
  consecutive t1 differ by 72 x perRun at 100 bpm.
- TESTS: `test/game/beat_rider.test.ts` (runBeats; even at 1, 2 and 4:
  each departure takes perRun beats, arrivals perRun beats and 72 x perRun
  ticks apart at 100 bpm; length equals beatsForRun on a spec whose runs
  differ in length; whole games on the beat under both timings) and
  `test/app/beat_catch.test.ts` (the catch under both timings).