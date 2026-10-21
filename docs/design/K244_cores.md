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

## Handoff (2026-10-20, 17:4x, stage done inside the 1 h cap)

Steps 1-7 are done. The branch is `worktree-agent-ae12adbf3756a741a`
(6e3e913..HEAD, 11 files, +802 -53), never pushed. `src/main.ts` and every
file owned by another agent are untouched.

**What changed.**
- `src/render/pluck_model.ts`: `drawsPluck(TapLobes)` and `wouldPluck(nodes,
  total, closed, tapArc)`, the pure "would a pluck here draw anything"
  predicate on `tapLobes` (1eed989). `src/render/pluck_overlay.ts`:
  `PluckOverlay.siteTester()`, `(chain, ctrl) => boolean`, geometry only,
  caches samples and nodes per chain, one tester per decision.
- Auto plucks (5a66c38): `src/app/auto_pick.ts` (new, pure:
  `pickRandomSegment`, `pickMusicSegment`, `findValidCtrl`,
  `nearestValidCtrl`), `segmentsNear(assign, freq, valid?)` in
  `src/audio/pitch_space.ts`, `siteResolver()` and `triggerAutoPluck` in
  `src/app/auto_audio.ts` (the site is resolved BEFORE `synth.pluck`; none
  means a silent return), `src/app/audio_map.ts`. Random and music pick
  only segments with a drawable site, and music falls back to the nearest
  valid pitch.
- A release in a core (7308442): `endDrag` in `src/app/input_pointer.ts`
  asks the tester about the grabbed particle's site (`pluckable`). It gates
  `synth.pluck`, and in the string style `renderer.pluck` and
  `startRipple`; it is passed to `beginRelease` for the soft style. The drag
  still ends and the thread eases home (physics, not a pluck). `tapPluck`
  is untouched (taps in a core have been silent since K235).
- Tests: `test/render/pluck_model.test.ts` +9, `test/app/auto_pick.test.ts`
  (new, 16), `test/audio/pitch_space.test.ts` +2. The release gate has no
  headless test (`input_pointer.ts` needs a pixi app and a canvas), so the
  probe covers it.
- Lore (6f7916b, 3079625): `.claude/rules/render-pluck.md`: K235's "OTHER
  SOUND PATHS" and K459's "STILL SOUNDING" corrected, the `pluckWhole`
  default fixed to 0.75 (since K279), a new "Nothing plucks a junction core
  (K244)" section holding the rule, the tests and the measured numbers.
- Verified at 7308442 (the later commits are docs only): `npm test` exit 0
  (115 files passed + 1 skipped, 1612 tests passed + 1 skipped), `tsc
  --noEmit` exit 0, `vite build` exit 0. No golden, codec or param pin
  moved, and there is no new param.

**Before and after** (`.claude/probes/K244/`, untracked: 24 one-Chrome runs
plus 4 ripple runs on 2026-10-20, base 6e3e913 against 7308442, each a
`vite preview` of its own build; desktop Chrome at 1400x900 DSF 2, and
411x753 at 2.625 with touch emulated, NOT the phone; sound = the synth's
own `__knotSynth().plucks`, drawn = a spy on `renderer.pluck`).
- Auto plucks, sounded with nothing drawn / notes sounded, base -> K244:
  random fabric 3/76 -> 0/74, dense 0/78 -> 0/75, phone 5/60 -> 0/59, knot
  0/79 -> 0/72; music fabric 4/144 -> 0/145, dense 4/145 -> 0/144, phone
  4/127 -> 0/131, knot 0/144 -> 0/144. After K244 every note drew (0
  skipCore, 0 soundNoDraw in all 8 auto runs, 844 notes).
- Releases (a real press, four moves, a release; 12 core sites plus 8 drawn
  per run), core-verdict releases that sounded: string fabric 4/4 -> 0/4,
  phone touch 4/4 -> 0/4, dense 2/2 -> 0/2; soft fabric: all 19 grabbed
  releases sounded on base (classified by sound) -> 0/4 core-verdict ones.
  Ripples (string only; a soft release starts none), core-verdict: 4/4 ->
  0/4 on the desktop and on the phone viewport. The 15 drawn-verdict
  releases per run sounded once and rippled 15/15, before and after.
- Taps unchanged, drawn / core / maze move, base vs K244: fabric desktop
  975/12/3 vs 976/12/2 (one press near the head moved the maze on one load
  and plucked on the other; inferred: K550's worker host does not repeat a
  state), phone 858/12/18 both, dense 1861/11/2 both, knot 832/0/0 both.
- The runs are shorter than the brief's: random 50 s (40 s on the phone),
  music 45 s (40 s on the phone), not 60 s and a full song; taps at stride
  1 (fabric and knot desktop) and 3 (phone, dense); 20 drag sites per run;
  `dense_phone` was not run.
- 8 of the 12 core sites in each run grabbed a particle OUTSIDE the core,
  so that release plucked a drawn neighbor, on both builds (the gate reads
  the grabbed particle's site, not the press point's).

**What is left** (the Ledger items list of the report):
- A real-phone (Pixel 11) pass: touch releases in a core (no sound, ripple
  or vibration), and random and music auto plucks. Not run: Levi was on the
  phone until 18:25 and the coordinator barred phone passes.
- The unfretted predicate against the thread reveal: under the reveal the
  overlay clips with `fret: true` (K397), so a mid-reveal chain can still
  sound with nothing drawn from an auto pluck or a release. Not exercised
  (`am=instant` only). The fix passes the same `exploreSolidSpan` span to
  the tester, which needs `ribbon_renderer.ts` (K409's file): wait for
  K409's merge.
- The site is tested at schedule time and drawn up to MUSIC_LOOKAHEAD 0.3 s
  plus output latency later. Not observed (0 soundNoDraw in 844 notes).
- Hot, held and `pluckSize` 0 plucks stay sound-only for auto plucks and
  releases, by design.
- Decision for Levi: should the press point's verdict gate a release too
  (8 of 12 core presses pluck a drawn neighbor)?
- Gaps: no headless release test; the soft style is classified by sound
  alone on base and has no ripple to count; `dense_phone` never run.

**Handle fields.**
- owner: nobody since 2026-10-20 17:4x (agent K244, `ae12adbf3756a741a`, of
  claude session `91b19e11-7759-4638-ba60-4705b011b94f`; stage done)
- branch: `worktree-agent-ae12adbf3756a741a`, worktree
  `.claude/worktrees/agent-ae12adbf3756a741a`; last commit: the one that
  holds this handoff (see `git log`), unpushed
- evidence: `.claude/probes/K244/` (untracked: `k244_probe.mjs`,
  `run_k244.mjs`, `summarize.mjs`, results in `out/`)
- next: the coordinator merges (`tools/agent_merge.ps1`) and files the
  ledger items above; the phone pass waits for Levi's phone
- brief: `docs/design/K244_cores.md`
- env: two `vite preview --outDir <build dir> --port 5181|5182` servers
  (base 6e3e913 and 7308442; rebuild with `scripts/preview.ps1 -Port <p>
  -Ref <commit>`), then `node .claude/probes/K244/run_k244.mjs 8` and `node
  .claude/probes/K244/summarize.mjs`; both servers are stopped now
