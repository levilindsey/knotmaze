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

## Handoff (2026-10-21, agent a178a00897a4044dc, stopped at the 2 h cap)

Items 1-5 and 7 are built and checked on the page; items 6 (the pulse)
and 8 (the HUD row, the share tag, the panel rows) are not built. The
beat is reachable by links only (`&clk=beat`).

**What landed** (WIP commits on the branch, rebased onto master):
- `src/game/beat_clock.ts`: the beat clock on the fixed 120 Hz step
  (CHASE_HZ). Beat k falls on tick ceil(7200 k / tempo), so 100 bpm is
  72 ticks (600 ms) a beat; `running` is false while the page is hidden
  or the pause holds it, and `reset()` releases a hold. `BeatFeed` locks
  `performance.now()` to the AudioContext's clock, so once audio runs
  the beats follow it.
- `src/game/beat_rider.ts`: the rider. A run takes max(1, round(length /
  L)) beats, at most the cap. The queue keeps the last tap. With no tap
  at a junction the dot takes the run straight on, else keeps right; an
  END turns it back.
- `src/app/beat_frame.ts` (`createBeat`): the frame side. Each departure
  commits through `moveAlong`, so the turn minotaur and the fire step
  once per committed move with no change in their files. A commit that
  would end the game is refused at the next junction and the dot rests.
  Each departure plucks its run's note (music mode's pitch map, strength
  0.8) at the beat's audio time. `needsFrame` is false once the dot
  rests (so the clock stops after a loss). The probe hook
  `__knotBeat()`: on, ticks, running, held, the run and the junction
  ahead, the queued arm, the start beat, t0/t1, tempo, phase and the
  departure order ahead. `on` is false until the first tap.
- `src/ui/beat_pause.ts`: the pause (`km-control km-beat-pause`, 48 px,
  bottom left where the cut's button sits, shown while the beat plays).
  Pressed, it holds the beat, hides the canvas
  (`:root[data-beat-paused='1'] canvas`) and shows a centred "Paused"
  pill; taps and moves do not queue while held. An open panel over it
  hides the button but keeps the pause; an ended game or the beat going
  off releases it.
- `src/ui/url_state.ts`: `CLOCK_MODES` gains `beat`, read in every game
  mode (`clockOf`); `minoClockOf` plays the minotaur on the turn clock
  under the beat; `fabricRulesOf` drops the cut (and so the walker) under
  the beat; `fireSettingsOf` plays the turn fire (fireClock ignored).
  Three numbers appended to the codec: `beatTempo` (`btp`, 100,
  [40, 180], rounded), `beatLength` (`btl`, L, 2, [0.5, 8]) and
  `beatCap` (`btc`, 4, [1, 8], rounded); `beatSettingsOf` clamps them in
  every reader. Under onClockChange in undo_stack.ts's LIVE_EFFECTS. Not
  daily-exempt, not MAZE keys.
- `src/main.ts` call sites: `createBeat`, the pause, Restart resets the
  beat and releases the pause, Undo off under the beat (`canUndo`),
  `moveAlong` queues taps and key moves while the beat drives, and the
  frame loop's `tickBeat` (`src/app/frame_loop.ts`). `src/game/walker.ts`
  exports what the rider shares; the walker is unchanged.
- `src/app/auto_audio.ts`: under the beat the auto tick plays no song and
  no random plucks and cancels no scheduled note (residual 1).
- Tests: `test/game/beat_clock.test.ts` and `test/game/beat_rider.test.ts`
  (22 tests: the beat grid at several tempos, holds and resets, the
  audio lock, the rider's routes, queues, END turn-backs and caps, whole
  games with the turn minotaur and with the fire), url_codec.test.ts
  (the defaults table, OVERRIDE_KEYS, the beat readers), and the table
  pin re-frozen. With `clock=turn` every other pin and digest held.

**The calls** (each built as the rec):
1. `beat` is a `clock` option read in every game mode. Alternatives: a
   param of its own; minotaur-only, like realtime.
2. Tempo 100 bpm. Seed 7 solved in 0:32-0:34 on the desktop (the hunter
   run 0:34) and 0:31 at the phone viewport, every run steered by the
   probe. Not yet felt by a person: Levi to try 80, 100 and 132.
3. L = 2, cap 4, so a typical run takes about two beats. Over 2117 runs
   (median length 4.24 ctrl), the share taking 1/2/3/4 beats:

   | L | 1 beat | 2 beats | 3 beats | 4 beats | mean |
   |---|---|---|---|---|---|
   | 2 | 34.3% | 22.7% | 16.3% | 26.7% | 2.35 |
   | 3 | 52.8% | 24.2% | 11.1% | 11.9% | 1.82 |
   | 4 | 66.7% | 19.7% | 6.9% | 6.7% | 1.54 |

   At L 2 a quarter of the runs hit the cap (long runs crawl); L 3 is the
   alternative if the feel says runs drag.
4. Each departure plays its run's own note (music mode's pitch map), no
   song. Alternative: the song's next note per departure. See residual 1.
5. The first tap starts the dot on the next beat. Tap to departure:
   676 ms desktop, 802 ms phone viewport, 664-719 ms in the hunter and
   fire runs. Alternative: a count-in after the intro.
6. One turn step per committed move; `fireClock` is ignored under the
   beat. Alternative: a step per beat.
7. The cut, the walker and Undo are off under the beat. Alternative: keep
   each.
8. A late tap gets no grace: it queues for the next junction.
   Alternative: a short grace that re-routes the departure.
9. The share tag (a note glyph plus the tempo): not built.
10. The pause, as described above (brief item 5's placement was mine).
    Alternative: a key (none yet) or pausing on blur only.

**Page results** (`.claude/probes/K114/beat/beat_page.mjs`: real clicks
in headed Chrome off-screen, a fresh profile per run, links
`?7&am=instant&snd=none&clk=beat[&extra]`; outputs and stills in
`out/`):
- desktop 1400x900: 12/12; phone viewport 411x753 with touch: 12/12;
  `mt=hunter`: 12/12, solved 0:34, never caught. Checked in each: the dot
  rests until the first tap, leaves on the next beat on the tapped arm,
  rides on with no tap (three runs in 5 s), a queued turn takes the
  tapped arm over the default, an END turns the dot back, the pause holds
  the ticks and the moves and hides the board, resume runs again, and the
  steered walk ends in the Solved banner.
- `fi=fuse` (the turn fire at its default 0.6 / 0): burnt at 0:14 after
  the beat's forced moves ("The fire reaches the end of every way on
  before you."), a legitimate standing loss; the pause hid with the
  ended game, so three checks failed and one did not run.
  `fi=fuse&fsp=0.1&fdl=40`: 12/12, solved 0:34 with the fire burning, the
  pause holds under the fire.
- Sound on (Chrome with `--mute-audio`, `snd=manual`): 13/13, 23 plucks
  for a 21-run path, context running.
- The ride's notes on the speakers (Chrome with `--mute-audio`, which
  leaves the analysers working; the master peak polled at each ride
  step): `snd=manual` before the auto tick's gate, 14/14, peak 0.144, 27
  of 63 polls over 0.01; `snd=music` after it (0773c56e), 14/14, peak
  0.094, 15 of 62 polls over 0.01, and 23 plucks for the 21-run path, as
  under manual: no song note played under the beat.

**Residuals:**
1. The auto tick's gate (`src/app/auto_audio.ts`, 0773c56e): under the
   beat, autoAudioTick returns before the random and music branches (no
   song, no random plucks) and before manual mode's per-frame
   `cancelScheduled()`. INFERRED from the code, not observed: without it
   the song played under the beat in music mode, and manual mode's cancel
   could drop a note scheduled ahead of the audio clock. The manual run
   before the gate still heard the ride (peak 0.144), so the cancel did
   not silence it; how many notes it dropped, if any, was not measured.
   Random mode was not run.
2. A note can land up to the output latency plus a frame late: its time
   is max(audio now, the beat's audio time).
3. No wait under the beat; the pause is the only stop, and it has no key.
4. Under the beat every forced move steps the fire, so the default turn
   fire (0.6 / 0) burns a hesitant player fast (the probe's walk at
   0:14). A beat-specific fire pace may be wanted.
5. The clock stops once the game ends or the dot rests (by design).
6. The pause sits where the cut's button is (both cannot show: the cut
   is off under the beat); K137's sprint button placement was checked at
   the rebase (see the handle).

**Remainder** (the next stage):
- Item 6: the head ring pulses on quarter notes; reduced motion gives
  brightness only.
- Item 8: the HUD tempo row, the share tag (note glyph plus tempo), the
  panel rows (clock option, tempo, L, cap).
- Keys and the move pad on the page (the moveAlong guard queues them;
  only unit-tested).
- Lore: "The beat rider (K114)" in `gameplay-mechanisms.md`, the BEAT
  RIDER PARAMS entry in `gameplay-links.md`, a `probes.md` entry for
  `beat_page.mjs` and `__knotBeat` (gotcha: `on` is false before the
  first tap; read the clock with `__knotParams().clock`).
- A real phone pass, and Levi's feel of the tempo and L.

**Handle fields:** HANDLE_FIELDS
