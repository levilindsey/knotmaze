# K114: the beat rider

Ledger: K114 (the beat rider stage). One stage, opus, 2 h cap. The design
is `docs/design/K80_gameplay_additions.md` R.5.1 (shortlisted in R.0,
whose decision 2 is the `clock` param, "built with the beat rider").

## Read first

Narrowly (Grep -n, then Read with offset/limit):
- `docs/design/K80_gameplay_additions.md`: R.5.1 (line ~2003), R.4.2
  (~1941, the clock param: determinism, the queue, pause, phones), R.4.4
  (~1984, the audio clock minus output latency), R.0 decision 2 (~1467),
  R.6 question 3 (~2108), 3.5 (~835, latency) and 3.6 (~848, the visual
  beat and "no mode may require rhythm").
- `src/game/walker.ts`'s header: directed runs, the WalkerMap (headings,
  strand continuations) and LEAD's preference list (the continuation,
  then clockwise from straight on, then back; an END's list is back
  alone). That is the straight-on rule this stage shares.
- `src/audio/song_scheduler.ts`, the music path in `src/app/auto_audio.ts`
  (`synth.audioTime()`, `songSched.due`) and `src/audio/songs.ts`. Sound
  off creates no AudioContext (K720): the beat must run without one.
- The fixed-step clocks: `CLOCK` / `CHASE_HZ` in `src/game/minotaur.ts`,
  `src/game/fire_clock.ts`, and `SolveClock` in `src/game/maze_stats.ts`
  (paused while hidden).
- `src/ui/url_state.ts`: `CLOCK_MODES` ("K114's beat clock would append
  an option") and `clockOf`.
- `.claude/rules/gameplay-mechanisms.md`: The cut and The walker.

## This stage, in order

What the cap leaves goes in the Handoff as the remainder.

1. **The clock option.** Append `beat` to `CLOCK_MODES` (an enum option
   appended: CODEC_VERSION stays, only the table pin's option list moves).
   `clockOf` reads `beat` in every game mode (classic, minotaur, burn);
   `realtime` stays the minotaur's alone.
2. **The beat clock**, pure and Node-testable (a new module): beats are
   integers on a fixed-step game clock (R.4.2), fed from the audio clock
   minus output latency when a context runs and from `performance.now()`
   otherwise, paused while the page is hidden. A change of source keeps
   the beat's place (as SongScheduler does). The renderer animates toward
   the game state, never the reverse.
3. **The rider.** The dot never stops. Each run takes
   max(1, round(length / L)) beats, capped (a param, default 4), and the
   dot reaches each junction on a beat. A tap on an arm of the junction
   ahead queues it (mid-flight taps queue; the last tap before the
   junction wins); keys and the move pad queue the arm their picker
   picks. With no tap it goes straight on (the continuation, then keep
   right); an END turns it back. A move commits to the controller as a
   normal move, so the trail, stats, par, fragile and collapse rules see
   ordinary moves.
4. **Notes.** On each departure the dot plucks its run's note on the beat
   (scheduled on the audio clock, like music mode). Silent with sound
   off; the clock still runs.
5. **Pause hides the board** (R.4.2): a pause control stops the beat and
   hides the maze until resumed, so pausing is not free thinking. Restart
   restarts the beat.
6. **The visual beat** (3.6): the head dot's ring pulses on quarter
   notes; under reduced motion a brightness change only. Sound off stays
   fully playable.
7. **Enemies and the fire** under beat step exactly as on the turn clock,
   once per committed move (call 6). The beat only paces the player.
8. **HUD, share and panel.** A HUD row (tempo), the share tag, the panel
   rows (the clock row offers beat in every game mode, plus the beat
   params, shown only under beat).

Each comes with tests on hand-built graphs and real mazes: the clock
(advance, pause, a source change), beats per run (rounding, the cap), the
default choice (continuation, keep right, an END), the queue (last wins,
cleared on arrival, a tap off the arms ignored), and a whole game driven
by beats with the minotaur and with the fire. With `clock` at turn every
pin and digest stays identical.

Then:
- **The page**, with real taps on desktop and at 411x753: start a beat
  game, queue a turn before a junction, ride straight on with no tap, hit
  an END and come back, pause (the board hides) and resume, finish; once
  with the minotaur and once with the fire. Stills of the riding dot, the
  pulse, the paused board and the HUD row. One run with sound on in a
  Chrome started with `--mute-audio` (the audio clock path; the speakers
  stay silent), every other run with `&snd=none`.
- **Lore** for what you built: a mechanism entry in
  `.claude/rules/gameplay-mechanisms.md`, the param entry in
  `gameplay-links.md`, the rows in `gameplay-panel.md`.

**Calls.** Build the recs, and list each in the Handoff with its
alternatives:
1. Where `beat` lives: rec the `clock` option read in every game mode.
   Alternatives: a param of its own; minotaur-only like realtime.
2. Tempo default: rec slower than the song's 132 bpm (R.6 asks whether
   132 and slower are fun); start near 100, try it on the page, report.
3. L and the run cap: rec L so a typical run takes about two beats, cap
   4. Report the beats-per-run distribution on a few real mazes.
4. Which notes: rec the run's own note (music mode's pitch map), no song
   underneath. Alternative: the song's next note on each departure.
5. How a game starts: rec the first tap starts the dot on the next beat.
   Alternative: a count-in after the intro.
6. Enemies and the fire: rec one turn step per committed move, `fireClock`
   ignored under beat. Alternative: a step per beat.
7. The cut, the walker and Undo under beat: rec off (setRules drops the
   cut and the walker as it does under fragile, par or collapse; Undo
   hidden). Alternative: keep each, and say how it reads mid-run.
8. A late tap: rec no grace in this stage (it queues for the next
   junction). Alternative: a short grace that re-routes the departure.
9. The share tag: rec a note glyph plus the tempo.

**Out of scope:** Pluck Hero and quantized or judged taps (R.4.4's
intensities 2 and 3); timed taps in attempts and the store version (a
daily plays with `clock=turn`); haptics; more songs and the band (K116);
healing cuts (K688); a real phone pass.

## Constraints

- **Agents beside you.** Stay out of their files. If a change seems to
  need one, stop and report. The coordinator updates this table at
  launch.

  | Agent | Files |
  |---|---|
  | K137 s3c, sprint, more monsters, sleepers, the follower (until about 04:40) | `minotaur.ts`, `minotaur_turns.ts`, `mino_feedback.ts` and their tests; new modules for sprint, the monster list, sleepers and the follower; `syncMinotaur` and the new markers in `fabric_maze_renderer.ts`, plus `marker_glyphs.ts` and `marker_mesh.ts`; main.ts's catch code, the minotaur frame and sprint's state; sprint's button and key; its rows in `fabric_controller.ts`, `maze_hud.ts`, `maze_stats.ts` and `share_text.ts`; its params, panel rows and lore |
  | K138, the rule kit (see its running stage's brief, "Yours") | `rule_search.ts`, `ice.ts`, `color_rule.ts` and their tests; its rows in `fabric_controller.ts`, `maze_hud.ts`, `maze_stats.ts`, `share_text.ts` and `src/app/rule_loss.ts`; the run-table override in `src/app/scene.ts` and `section_colors.ts`; `carryStep`'s gate and its refusal toast in `src/main.ts`; its params, panel rows and lore |

  Put the rider in new modules (the clock, the rider, its frame code) and
  keep `src/main.ts` to a few call sites: three agents touch it. The
  enemies step through the same hook a turn move already calls, so you
  need no change in the minotaur's or the fire's files. Draw the riding
  dot through the head marker's existing path, the way the walker and the
  real-time minotaur draw a dot mid-run.
- **Yours:**
  - `walker.ts` (export what the rider shares, without changing what the
    walker does);
  - the new modules and their tests;
  - `CLOCK_MODES`, `clockOf` and the beat params in `url_state.ts`;
  - the pause control and its board hiding;
  - your rows in `fabric_controller.ts`, `maze_hud.ts`, `maze_stats.ts`
    and `share_text.ts`, your call sites in `src/main.ts` and
    `src/app/auto_audio.ts`;
  - your panel rows and lore.
- **Params.** Each defaults off (`clock` stays turn), appended after the
  last param on master at your rebase (K137 s3c's and K138's may land
  first). Re-freeze only the key-order pin in
  `test/ui/param_codec.test.ts`. Not daily-exempt, not MAZE keys.
- **Probes and ports.** Probes go in `.claude/probes/K114/beat/` in your
  worktree (untracked). Use ports 5730-5733. Never use
  `--virtual-time-budget`. Give every Chrome a fresh temp profile. Every
  link carries `&snd=none` (except the one `--mute-audio` run); never load
  the bare URL (it is today's daily). Take no performance measurements.
- **Rebase** onto master before your final report (`git fetch`, then
  `git rebase origin/master`), and check that `npm test` and
  `npm run build` pass and the golden stays byte-identical.

## Stop rule

Stop when the stage is done or at the 2 h wall-clock cap, whichever comes
first. Run `Get-Date` at the start and at each milestone. Commit WIP to
your branch at every milestone, green or not, and never push.

A compaction is not a stop: after one, re-read this brief and `git log`
before going on. Keep reads narrow. Any helper runs on sonnet with a 1 h
cap under this same rule.

When you stop:
- commit WIP;
- append a "Handoff" section to this brief: what landed, the calls, the
  page results, the residuals, the remainder and the handle fields;
- report, ending with the K114 handle fields and a `Ledger items` list.
