# K336 + K186: side cannons and streamers; no confetti under reduced motion

Ledger: K336 (the handle). K186 rides it. One stage, opus, 2 h cap.
Build on master.

## Levi's calls

- **K336** (2026-10-14, 22:24, `docs/design/K335_confetti.md`, quoted
  exactly): "Let's also add some blasts of confetti and streamers from
  specific points just outside the left and rigth sides of the screen,
  angled in and up, and then apply gravity to make these fall in an arc".
  He deferred it that night and has now put it on the sooner list.
- **K186** (2026-10-20): **"None on reduced motion. Confetti on every win
  banner."** The ledger adds that the colors and the amount stay as the
  sliders set them.

## Where it stands

- **The design** is `docs/design/K335_confetti.md`, "The stage", items
  2, 3, 5, 6 and 7 (the cannons, the streamers, the settings, reduced
  motion and bounded lives), plus its "Verification". Item 1 (K335) and
  item 4 (K337's shine) have landed.
- **The draft** is `docs/design/K336_K337_draft.patch`. It is model only
  (`src/render/confetti_model.ts`) and contains:
  - the cannon emitter: `CannonSpec`, `aimCannon`, `finishCannons`,
    `spawnCannon` and `stepCannon`;
  - the streamers: `stepStreamers` and `streamerSegLook`. Each segment is
    drawn as one particle, so no new shader is needed.

  It was made before K337, K568 and K570, so it won't apply. Port the
  cannons and streamers by hand, as K337 did with the shine
  (`docs/design/K337.md`). Today's model already has:
  - the material field (`MAT`) and the shine (`specular`, `shadeNormal`,
    `litHex`, `pieceLook`);
  - K568's longer rain and finer spray, and K570's spray gravity.

  The draft's counts (`CANNON_PER_AMOUNT` 90) predate K317's and K568's
  increases, so retune them from the sheet.
- **The code.**
  - `src/render/confetti.ts`: `ConfettiLayer` (:136) with `burst`, `clear`
    and `tick`. It holds two ParticleContainers above the world root.
  - `src/main.ts`: `throwConfetti` (about :1497) and `showFabricWin`
    (about :1383-1473). `banner.show` is called only there, and
    `throwConfetti()` follows it.
  - `confettiPlan` (`confetti_model.ts` :191). Today, under reduced
    motion it returns no rain and `REDUCED_SPRAY_SHARE` (0.05) of the
    spray, slow and without shine.
- **The panel's hidden-row pattern** is the sync block in
  `src/ui/tweakpane_panel.ts` (about :2503). For example,
  `deadEndLengthRow.hidden = !fab || params.deadEndDensity === 0`.
- **Params.**
  - The confetti keys are `cfa`, `cfh` and `cff` (`url_state.ts` about
    :849 and :1487-1498).
  - They are viewer preferences in `DAILY_EXEMPT_KEYS`
    (`src/ui/daily_link.ts` :152).
  - `CODEC_PARAMS` ends with `foilShare`. `CODEC_VERSION` is 8.
- **K578** (a cache of the still maze under the confetti,
  `docs/design/K578.md`) is parked and unmerged. If it resumes, it
  rebases onto this lane. So that its cache can still treat a fall as
  confetti-only:
  - draw every new piece inside `ConfettiLayer`, above the world root;
  - raise no visual need but the one `throwConfetti` already raises
    (`Flag.OVERLAY`);
  - stay out of `src/app/frame_loop.ts`.

## Steps

1. **K186: none under reduced motion.**
   - `confettiPlan` returns zero rain and zero spray when reduced, so
     `throwConfetti` returns early.
   - Delete what that leaves dead: `REDUCED_SPRAY_SHARE`, the plan's
     `slow` flag and the reduced branches in the spawn and look code.
   - If the Motion setting has a live change hook (`src/ui/motion.ts`),
     clear the layer when it turns reduced mid-fall.
   - Update the reduced tests in `test/render/confetti_model.test.ts`.
   - **Commit.**
2. **K186: every win banner.**
   - Confirm in the page that each path to the banner throws: a live
     finish, the reload of a solved attempt (Levi's yes), a replay,
     practice, free play, real time and an escaped burn race.
   - Count `__knotConfetti()` pieces after each one. The code says they
     all go through `showFabricWin` (`pendingWin`: main.ts :1258, :1670
     and :2374; `frame_loop.ts` :619; `panel_wiring.ts` :281).
   - Fix any path that doesn't throw.
3. **The cannons, model.**
   - Port the emitter onto today's pool layout: `F`, the fields and
     `MAT`, so cannon pieces take the shine.
   - It is screen space like the rain, counts scale by `rainScreenScale`,
     and it is reusable (K318's themes will aim cannons elsewhere).
   - Keep the paper pieces' motion closed-form: linear drag and constant
     gravity. K579 (GPU confetti) will port it.
   - Add the tests the design's "Verification" lists for the cannons,
     plus counts at amounts 0, 1 and 3.
4. **The cannons, view and settings.**
   - Add a pool in `ConfettiLayer`, in screen space with the rain.
   - Append `confettiCannons` (`cfc`, on) and `cannonAmount` (`cfn`, 1,
     [0, `CANNON_AMOUNT_MAX`]).
   - Add both to `DAILY_EXEMPT_KEYS`.
   - Add panel rows in the confetti folder. The amount row is hidden while
     the cannons are off.
   - Re-freeze the codec, defaults and exempt pins.
   - **Commit.**
5. **The streamers.**
   - Port `stepStreamers` and `streamerSegLook` onto today's shine.
   - Draw each segment as a particle in a ParticleContainer, which reuses
     the warmed particle program.
   - If anything needs a new GL program, register it in K307's warm-up
     (the program registry), or it compiles cold at the finish and the
     win freezes. Say so in the handoff.
   - Append `streamerShare` (`cfs`, a share of each cannon's pieces in
     [0, 1]), daily-exempt. Its row is hidden while the cannons are off.
   - Settle from the sheet whether the finish's spray throws a few
     streamers. The draft says no.
   - **Commit.**
6. **Tune from a sheet.** Pick the following from frame sheets:
   - the launch points, angles, speeds, spread and volley timing;
   - the cannon count;
   - the streamer share default (start near 0.2).

   The arcs' tops must land well inside the screen.
7. **Verify.**
   - Sheets in `.claude/probes/K336/sheet/`, at 1400x900 and 411x753,
     master beside branch. They show the burst at about 0.1, 0.3, 0.6,
     1.0, 1.5 and 2.5 s, and a strip of streamers curling.
   - A desktop frame A/B (`k140_ab.mjs`, from the main checkout's
     `.claude/probes/K140/`) at amounts 1 and 3, cannons on and off,
     under the perf lock. Also time the pure sim per frame (K140's
     `bench_sim.mjs`).
   - Confirm that the layer's animating flag holds the loop awake until
     the last cannon piece and streamer dies, then lets it stop.
   - `npm test` and `npm run build` pass. The codec, defaults and exempt
     pins grow only by the appended keys. The golden dailies, K87 and the
     knot-mode golden don't move.
   - The phone is optional, under the phone lock
     (`pwsh -NoProfile -File .claude/probes/agents/phone_lock_take.ps1 -Owner "K336" -What "confetti fps" -MaxWaitMin 40`).
     If you skip it, the phone's frame rate rides K156's next pass.
8. **Lore.** Update `render-confetti.md` (the cannons, the streamers, the
   counts, reduced motion means none) and the lines elsewhere that say
   reduced motion keeps a small spray. The panel and links rows go in
   `gameplay-panel.md` and `gameplay-links.md`.

## Constraints

- **Pre-launch, no back-compat** (CLAUDE.md, Key Design Decisions).
  - Append the params, and don't bump the codec version.
  - Change defaults in place.
  - Re-freeze every pin a change moves, and name each one in the commit.
- **The param hotspot.** K324 stage 1 appends seven real-time minotaur
  params (`mhn`, `mhx`, `mhh`, `mrv`, `mdr`, `mnr`, `mtn`). Whichever of
  you merges second:
  - rebases on master;
  - re-appends its rows after the other's and renumbers the index
    comments;
  - re-freezes `test/ui/param_codec.test.ts`'s key-order pin and
    `test/ui/url_codec.test.ts`'s defaults table.

  Check that your keys are still free right before you append.
- **Agents beside you.** Stay out of their files. If a change seems to
  need one, stop and report.

  | Agent | Files |
  |---|---|
  | K324 stage 1 | `src/game/minotaur.ts`, `test/game/minotaur.test.ts`, the minotaur rows in the param files, `undo_stack.ts`'s minotaur rows |
  | K546 stage 1 | `src/game/minotaur_turns.ts`, `test/game/minotaur_turns.test.ts`, main.ts's catch code (`turnCaught`, the deferral) |
  | K409, then K525 | `src/render/paint_*.ts`, `explore_glsl.ts`, `ribbon_renderer.ts`, `src/render/ribbon/` |
  | K244 | `src/app/input_pointer.ts`, `src/app/auto_audio.ts`, `src/app/audio_map.ts`, `src/render/pluck_*.ts` |
  | K580 stage 2 | `src/core/glyphs/` |

  In `main.ts`, keep to `throwConfetti`. `probe_hooks.ts` is shared with
  K324 stage 1, so keep your edit to `__knotConfetti`'s report.
- **Out of scope:**
  - the confetti's colors, the rain's and the spray's look and counts;
  - GPU confetti (K579);
  - the win effects' themes (K318);
  - the loss effect (K546).
- **Locks.**
  - Hold the perf lock (`$env:TEMP\claude-perf.lock`: one line with the
    owner, the start time and what) for the A/B and the bench.
  - Hold the phone lock for the phone.
  - Wait for either inside one blocking command.
- **Probes:**
  - Never use `--virtual-time-budget`, and use fresh temp Chrome
    profiles.
  - A bare URL is today's daily, so pass a query.
  - Probes and results go in `.claude/probes/K336/`, untracked.

## Stop rule

Stop when the stage is done or at the 2 h wall-clock cap, whichever comes
first. Run `Get-Date` at the start and at each milestone.

When you stop:
- commit WIP;
- append a "Handoff" section to this doc, with:
  - what landed and the defaults picked;
  - the sheets' paths and the A/B numbers;
  - the pins moved;
  - what's left;
  - the item's handle fields;
- report.

Commit to your branch at every milestone (K186, the cannons, the
streamers), and never push. A compaction is not a stop: after one,
re-read this brief and `git log` before going on. Any helper runs on
sonnet with a 1 h cap under this same rule.

End your report with the item's handle fields and a `Ledger items` list.

## Handoff (2026-10-20, agent ac1c3e02f6979bc7f, at the cap)

Steps 1-5 and 8 are done, and so is most of 7. Step 6 was tuned from
the pure-model census, not from frame sheets, and the master-vs-branch
sheets were never shot. The branch is rebased onto master `635ae58`
(after K324 stage 1, K546 stage 1 and K580 stage 2) and was never
pushed.

### What landed

- `34b7c45` **K186: no confetti under reduced motion.**
  - The plan is empty under reduced motion, throwConfetti returns early,
    and turning reduced motion on mid-fall clears the layer
    (panel_wiring.ts).
  - REDUCED_SPRAY_SHARE and the slowed fall are gone.
  - Banner paths: `.claude/probes/K336/banners/results.md`. Every
    finish path throws one burst; a reload after an official finish
    shows no banner, by design.
  - Path 8 is Levi's call: Reset path during the winning move throws
    the confetti and records the result, but shows no banner.
- `f0d8f5d` **K336: the side cannons** (model, view, settings).
- `cbc42a9` **K336: the streamers** (model, view, setting). The finish
  spray throws none. That was the draft's call, kept without a sheet.
- `e32bb3e` lore; `f4cea42` the rebase's renumber; `d2c8364` and the
  next commit, this handoff.
- Every new piece is drawn inside ConfettiLayer: two more
  ParticleContainers above the world root (spray, streamers, cannons,
  rain). Only Flag.OVERLAY is raised, and `src/app/frame_loop.ts` is
  untouched.

### The defaults picked

- Side cannons on (`cfc`).
- Cannon amount 1 (`cfn`, 0-3).
- Streamers 0.2 (`cfs`, 0-1).
- Codec 178-180, CODEC_VERSION 8, daily-exempt.

The constants:

- Cannons just off each side at 0.8 of the height.
- Arcs top out 0.3 w in from their side and 0.32 h down.
- Speed 0.75-1.1x, spread +-0.12 rad.
- Volley 0.22 s, with the right cannon 0.08 s later.
- Drag 1.2/s toward a terminal fall of 0.3 h/s.
- 150 pieces a cannon at amount 1 on the phone, scaled by
  rainScreenScale (309 at 1400x900), capped at 2700.
- Streamers have 14 segments, at most 100 a cannon, and sag 0.06 h/s.
- The 7 s and 8 s backstops never fired in the census.

The full record is render-confetti.md's "Side cannons and streamers
(K336)" section.

### Verification

- **Tests.** `npm test` after the rebase onto `635ae58`: 1658 passed,
  1 skipped (the same on `b1ec927`).
  `tsc --noEmit` is clean. `npm run build` was green before the rebase
  (a8a2985) and was not re-run after it.
- **Census** (pure model, 8 seeds):
  - cannon paper: `.claude/probes/K336/cannon_census_a8a2985.txt`;
  - streamers: render-confetti.md's CENSUS entry.

  Every piece leaves by the bottom edge, and the last one leaves
  5.0-5.9 s after the burst, before the rain (6.2-7.7 s).
- **The animating flag** (page check on a8a2985 under the perf lock;
  `flag_bench_a8a2985.log`): PASS at desktop 1600x900 and phone
  411x753.
  - The last cannon paper died at 5.07 s (desktop) and 4.91 s (phone)
    after the burst.
  - The last streamer died at 5.46 s and 5.21 s.
  - The last rain died at 6.81 s and 6.40 s.
  - The loop stopped at 6.92 s and 6.46 s.
  - No sample had a piece alive with the layer inactive or the loop
    stopped.
  - The unit tests hold `active` on cannon paper alone and on streamers
    alone.
- **CPU bench** (`bench_sim.mjs`, 1400x900; per frame, mean / p95 in
  ms; full table in render-confetti.md's COST entry):

  | Cannons | Amount 1 | Amount 3 |
  |---|---|---|
  | Off | 0.065 / 0.12 | 0.19 / 0.37 |
  | Defaults | 0.22 / 0.37 | 0.34 / 0.61 |
  | Max (cfn 3, cfs 1) | 0.39 / 0.65 | 0.51 / 0.89 |

  A streamer costs about 13 paper pieces.
- **A first look** (`look.mjs` on a8a2985 under the perf lock at 18:50,
  after a first try waited 14 min behind K525's GPU batch and skipped;
  frames in `.claude/probes/K336/look_a8a2985/`, 1400x900 and 411x753,
  0.15-3.5 s after `__knotConfettiBurst()` on a knot at rest).
  - Both cannons fire up and inward from the sides.
  - The paper turns over and falls in two clouds, about 0.3 w in from
    each side.
  - The streamers read as curling ribbons.
  - No context loss.
  - Alive per side: 247 paper and 62 streamers on the desktop, 120 and
    30 on the phone (309 and 150 pieces a cannon).
  - It is only a sanity look: there is no master beside it, and nothing
    was tuned from it.
- **Not done:**
  - the master-vs-branch sheets (`.claude/probes/K336/sheet/`) and the
    curl strip;
  - K140's frame A/B (the GPU side);
  - the phone pass. Levi had the phone until 18:25.

### Pins moved

- `test/ui/param_codec.test.ts`'s table pin: +3 rows, after K324's
  171-177.
- `test/ui/url_codec.test.ts`'s defaults table and OVERRIDE_KEYS, plus
  new cases for `cfc`, `cfn` and `cfs`.
- `test/ui/daily_link.test.ts`'s exempt set.
- `test/render/confetti_model.test.ts`: reduced motion now expects
  nothing, and there are new K336 blocks.

The golden dailies, K87 and the knot-mode golden did not move.

### What's left

1. **The sheets.** `.claude/probes/K336/sheet.mjs` is ready and has
   never run. It is a copy of K335's with this agent's lock owner, the
   `owner | start | what` lock line, a wait of `MAXWAIT` minutes
   (default 10), no rain chart, and `MASTER` / `BRANCH` env labels. Run
   `node sheet.mjs <masterBase> <branchBase> [outDir]` against two
   `scripts/preview.ps1` builds: master `4d57c02` against the branch
   `a8a2985` (the pre-rebase head), or a fresh pair. It shoots 1400x900
   and 411x753 at 0.1-1.0 s and 1.5-3.0 s. Still to add: a strip of
   streamers curling (2x crops). Re-tune if the arcs or the 0.2 share
   look wrong.
2. **K140's frame A/B** (`k140_ab.mjs` and `run_ab.ps1` in the main
   checkout's `.claude/probes/K140/`), at amounts 1 and 3 with the
   cannons on and off, under the perf lock.
3. **The phone pass:**
   - the cannons and streamers' look and frame time at amounts 1 and 3;
   - the K186 banner paths on the phone;
   - a `banners/banners.mjs` rerun on the final build.
4. **Path 8**, for Levi (above).
5. **Residuals:**
   - The streamer body's sag is only approximately frame-rate
     independent: the follow runs once a frame.
   - On the phone the closest cannon arc tops out 0.081 w from its edge
     (the median is 0.26 w).

### Handle

- owner: nobody since 2026-10-20 18:55 (agent ac1c3e02f6979bc7f of
  claude session 91b19e11-7759-4638-ba60-4705b011b94f, stopped at its
  2 h cap)
- branch: `worktree-agent-ac1c3e02f6979bc7f`, worktree
  `.claude/worktrees/agent-ac1c3e02f6979bc7f`; last commit: this
  handoff (on master `635ae58`, unpushed)
- evidence: `.claude/probes/K336/` (untracked): the censuses,
  `flag_check.mjs`, `bench_sim.mjs`, `bench_locked.ps1`,
  `flag_bench_a8a2985.log`, `banners/`, `look.mjs` + `look_locked.ps1`
  (frames: `look_a8a2985/`), `sheet.mjs`
- next: the sheets and the curl strip, then K140's frame A/B under the
  perf lock, then the phone pass
- brief: `docs/design/K336_cannons.md`
