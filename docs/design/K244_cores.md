# K244: nothing plucks a junction core

Ledger: K244. One stage, sonnet, 1 h cap. No new params.

## Levi's call (2026-10-20)

**"Players shouldn't be able to pluck junction cores."** The ledger
records the scope: nothing plucks a junction core. Auto plucks (random
and music) choose only valid segments up front, and a drag released in a
core plucks nothing. Taps in a core have been silent since K235.

## Where it stands

- **Taps are done.** `tapPluck` (`src/app/input_pointer.ts`, about :306)
  draws first, then returns on `lastSkip === "core"`, and since K459 it
  sounds only when the pluck drew. Leave that path alone.
- **The core test** has one home: `tapLobes` (`src/render/pluck_model.ts`,
  pure, tested by "a tap inside a junction core (K235)" in
  `test/render/pluck_model.test.ts`). A site is in a core when its tapped
  lobe exists but its vibrating length (`vibratingSpan`) is under
  `LOBE_MIN_LEN`. `PluckOverlay.add()` reports why it drew nothing in
  `lastSkip` (`src/render/pluck_overlay.ts`).
- **Auto plucks** (`src/app/auto_audio.ts`):
  - they call `synth.pluck` (about :87) before `renderer.pluck` (about
    :105), so the note sounds even when the overlay skips;
  - random mode picks any segment (about :151-153), and music mode picks
    from `segmentsNear(audioAssign, f)` (about :181);
  - the site is `audioSegSite[seg]` (`src/app/audio_map.ts` :80-98). In
    a fabric it is the run's ctrl midpoint, so a short run's midpoint can
    sit in a core; in a knot it is a random ctrl along the strand.
- **A drag's release** (`input_pointer.ts`, about :786-796) calls
  `synth.pluck` and then `beginRelease`, whose string style calls
  `renderer.pluck` at the grabbed particle's ctrl. In a core the overlay
  draws nothing, but the note has already played.
- **K235's harness** is in the main checkout, untracked:
  `.claude/probes/K235/k235_taps.mjs`. It makes real mouse and touch
  taps and counts the synth's own plucks (`__knotSynth().plucks`). Its
  links (`?b.J`, the dense `?b.J&gs=24&wd=0.6&brd=0.6`, the knot
  `?7k.J&mf=0`) predate codec 8, so check what they load with
  `window.__knotParams()` and re-derive them if they moved.
- K194 just landed in the pluck files (`peakEstimateOf`, deduped onset
  times). Build on it; don't touch it.

## Steps

1. **Baseline.** On a build of your base, count sounds against drawn
   plucks:
   - auto plucks over 60 s of random mode and one song of music mode
     (`snd`), on the fabric, dense and knot links: how many sounded with
     nothing drawn, and how many of those were core skips;
   - drags released at a core: how many sounded.
   - Copy what you reuse into `.claude/probes/K244/`.
2. **One predicate.** Expose a pure "would this site pluck?" check built
   on `tapLobes`: false in a core, false for a degenerate lobe. Do not
   copy the core test.
3. **Auto plucks pick valid sites up front.**
   - Random mode picks only among valid segments. Music mode picks among
     the valid segments nearest the note's pitch (`segmentsNear` over the
     valid set), so the song's pitch still plays and a valid segment
     moves.
   - In a knot, the random ctrl resamples inside a valid lobe.
   - Compute validity when the audio map is built if it depends only on
     ctrl ranges; otherwise check at pick time with a bounded retry.
   - If no segment is valid, auto plucks play nothing.
4. **A release in a core plucks nothing.** When the released particle's
   site is in a core, play no sound, draw no vibration and start no
   ripple, under both pluck styles. The drag still ends and the thread
   eases home as today (that is physics, not a pluck).
5. **Tests.**
   - The predicate: a core site and a degenerate lobe refuse, and a
     mid-run site plucks.
   - The selection: over many picks, random and music never choose an
     invalid segment, and music falls back to the nearest valid pitch.
   - Headless release coverage if the code allows it; otherwise the
     probe covers it.
6. **Lore.** Correct the lines that say auto plucks and releases can
   still land in a core and sound: render-pluck.md's K235 entry ("OTHER
   SOUND PATHS") and its K459 entry ("STILL SOUNDING").
7. **Verify.**
   - The baseline counts again, at 1400x900 and 411x753 (touch drags
     too): 0 core plucks from auto plucks and releases, and the tap
     counts exactly as before.
   - `npm test` and `npm run build` pass. No golden or codec pin should
     move; if one does, stop and find out why.

## Constraints

- **Agents beside you.**
  - K578: `src/app/frame_loop.ts`, `src/app/still_cache.ts`,
    `src/render/confetti*.ts`.
  - K580: `src/core/glyphs/`.
  - K409: `src/render/explore_glsl.ts`, `paint_math.ts`,
    `ribbon_renderer.ts`, `src/render/ribbon/`.
  - K324 stage 1: `src/game/minotaur.ts`, `src/ui/url_state.ts`,
    `param_codec.ts`, `tweakpane_panel.ts`, `undo_stack.ts`.
  - K546 stage 1: `src/game/minotaur_turns.ts`, `src/main.ts`.
  - Stay out of those files. `ribbon_renderer.ts` has its own core skip
    (about :2859-2895); if your change seems to need that file, or any
    other file above, stop and report.
- **Out of scope:**
  - the tap path, already silent in a core;
  - degenerate-lobe taps, already silent since K459, keeping their
    ripple and tug;
  - key moves, the pluck's look, and `peakEstimate`.
- **Locks.** No timings or phone work are needed. If you take any timing,
  hold the perf lock (`$env:TEMP\claude-perf.lock`: one line with the
  owner, the start time and what), and wait for it inside one blocking
  command.
- **Probes:**
  - Never use `--virtual-time-budget`, and use fresh temp Chrome
    profiles.
  - A bare URL is today's daily, so pass a query for a fresh design.
  - Probes and results go in `.claude/probes/K244/`, untracked.

## Stop rule

Stop when the stage is done or at the 1 h wall-clock cap, whichever comes
first. Run `Get-Date` at the start and at each milestone.

When you stop:
- commit WIP;
- append a "Handoff" section to this doc: what changed, the before and
  after counts, what's left, and the item's handle fields;
- report.

Commit to your branch at every milestone (the predicate, auto plucks, the
release), and never push. A compaction is not a stop: after one, re-read
this brief and `git log` before going on. No helpers.

End your report with the item's handle fields and a `Ledger items` list.
