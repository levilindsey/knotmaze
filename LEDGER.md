# Knotmaze ledger

The to-do surface for work that isn't done yet: follow-ups, known
residuals, decisions waiting on Levi, and ideas. Claude Code sessions and
their agents keep it current (the convention lives in claude-config,
`rules/ledger.md`). Add an item the moment something is deferred,
proposed, or left over. Close it by moving it to **Done** with the commit
that resolved it. The daily transcript audit reconciles against this file.

Binding rules stay in `CLAUDE.md`; history and measurements live in
`docs/history.md` and the commit messages, subsystem lore in the
path-scoped `.claude/rules/` files, and design documents in
`docs/design/`. IDs are stable (`K<n>`)
and never reused.

## Waiting on Levi

- **K198** · The fit camera's pan and the off-screen indicators, decided
  (Levi, 2026-10-14 about 07:53, on K148 + K149's calls): "camera: I
  just want to be able to pan such that the right edge of the maze is
  shown to the left of the left edge of the panel. Flash: not sure what
  you're describing. Markers should have settings, and I guess we should
  prevent the excess pan." The coordinator's reading, emailed to him
  2026-10-14 to correct: (1) the pan clamp (K149, `src/ui/view_clamp.ts`)
  lets the maze's right edge reach the open panel's left edge (on the
  phone the panel covers x 81-401 of 411), in place of 0.3 of the screen
  on every side, and allows no more; with the panel closed the pan stops
  at the maze's edges, as before 10-13; (3) the edge indicators (finish,
  head, minotaur) get panel settings: show/hide, a size or both is email
  call 6.1 (K98 plans marker sizes); (2) the head indicator's flash in
  follow mode, a short delay or not, is call 6.2. Parts (2) and (3)
  touch main.ts, offscreen_indicators.ts, head_indicator.ts and
  tweakpane_panel.ts: not alongside K92 or K111 (the panel). Records:
  `docs/design/K148_K149.md` ("Stage 1 handoff"), `gameplay-indicators.md`
  THE HEAD and `gameplay-camera.md` FIT CAMERA PAN RANGE.
  - stage 1 MERGED in 5f6ceb9..d7373a4 (2026-10-14 09:29): the pan range
    (`src/ui/view_clamp.ts`: `panRange`, `clampFitView`,
    `easeIntoRange`; 16 tests). With the panel open, the maze's right
    edge (its threads, or a shown start, head or exit disc) may reach
    10 px left of the panel's left edge and no further; closing the
    panel, a resize or fit drift eases back in at 0.15 a frame and never
    snaps. Checked at 1000x800, 800x700, 1400x900 and 411x753. Lore
    `gameplay-camera.md` (FIT CAMERA PAN RANGE); handoff
    `docs/design/K198.md`; probes `.claude/probes/K198/`; follow-ups
    K221-K224.
  - parts (2) and (3) wait on Levi's email answers 6.1 (the indicators'
    settings) and 6.2 (the flash).
- **K219** · Since K93 the choice hover stops at `pulseReach` in every
  path mode, and at reach 0.5 it lights very little: does it need a
  floor? Asked 2026-10-14 about 09:33 with
  `.claude/probes/K93/K93_hover_sheet.png`.
- **K90** · A physical minimum bend radius, stage 1 (Levi, 2026-10-13:
  "ideally we'd have a more physics-based constraint to prevent loops
  from becoming too tight in the first place"). No thread folds tighter
  than half its width, so neither the pinch nor the filled lobe (K8)
  ever shows. Stage 1: a census of over-tight folds on the rendered
  centerline (fresh, gestures, violent play), then prototypes behind a
  flag that defaults OFF (not a codec param), and
  `docs/design/K90_bend_radius.md` with a recommendation. Guards: the K63
  sleep battery, the kink-eye censuses, the gesture battery, and the
  knot-mode golden (byte-identical with the flag off). Same-chain
  collision skips +-2 ctrl, so it cannot catch folds that short.
  - stage 1a MERGED in 6f97b92..ac5b880 (2026-10-14 07:32; no behavior
    change).
  - stage 1b MERGED in 10ddcac..feb12a0 (2026-10-14 09:03; flag off, no
    behavior change; 689 tests). The folds are the Catmull-Rom's own
    overshoot at the particle polyline's corners. A render-side bend
    bound (`boundBend`, `src/geometry/spline_generator.ts`: 1.2 h, each
    sample moved at most 0.5 h, 3 passes, a hard clamp or an optional
    soft one) takes fresh windows under 1.0 h from 2357 to 10, for +5-9%
    per ribbon rebuild. Try it live: `__knotSplineBend(true)`.
  - Levi's call (sent 2026-10-14 about 09:05 with the sheet
    `.claude/probes/K90/out_1b/sheet/sheet.png`): ship, tune or stop;
    default on or off; hard or soft clamp. Before it ships: K213.
  - Levi, 2026-10-14 about 09:20: he can't tell from the sheet and will
    test it live later (desktop console at levi.dev/knotmaze/:
    `__knotSplineBend(true)` / `(false)`). Told him no visible bug
    started it: K90 came from G3's filled-lobe-or-pinch question (K8),
    and the old seam (P3.34) stays fixed by the miter clamp. The
    coordinator recommends stopping it.
  - record `docs/design/K90_bend_radius.md`; handoff `docs/design/K90.md`
    ("Stage 1b handoff"); evidence `.claude/probes/K90/out_1b/`. Never
    alongside K8 (the same fold definition).
- **K210** · Near launch: since K132 a daily is today's `PARAM_DEFAULTS`,
  so a deployed default change moves that day's maze mid-day (a stale tab
  and a fresh load differ; saved attempts are refused, results stay).
  Re-pin the daily to a frozen definition at launch, or accept it
  (`docs/design/K132.md`, Stage 1 handoff).
- **K191** · K169's two calls (its agent's, 2026-10-14): a backtrack
  turns a gold web back at once, with no fade-out (as K127), and reduced
  Motion keeps the 0.25 s fade (a colour crossfade; `src/ui/motion.ts`
  gates movement only). Say if either should change
  (`docs/design/K154_K169.md`, "Stage 1 handoff").
- **K193** · The docked phone sits in LANDSCAPE (K156 3c: display
  2424x1080, pages 810x331-387 CSS px at dpr 2.625, not 411x753), so the
  phone pass and its A/A floor measure landscape. Pick one: (a) a person
  stands it upright before a round; (b) `-Viewport 411x753` emulation
  (CDP) with a new A/A floor; (c) the pass locks the rotation (`adb shell
  cmd window user-rotation lock 0`) and restores it after, which changes
  a phone setting, so it needs your OK. The 2026-10-14 round pass runs in
  landscape (still a fair A/B: its floor is landscape too).
- **K194** · K180's calls (`docs/design/K180.md`, "Stage 1 handoff";
  play: https://levi.dev/knotmaze/?7.J&pw=1&pcx=ride&pgl=fallback): (1)
  the defaults once you have played: crossings `through` (built; the
  census favours it), and the glow `off` (built) or `fallback`; (2)
  should sound-only taps in junction cores glow under fallback (21 of 284
  fabric taps get none now)? Its agent's calls: the 0-1.5 range; fallback
  decides once, at pluck time and zoom, and keeps W; `instead` and `with`
  light the glow even at pw 0; still plucks ignore all three params.
  - if fallback becomes a default: time `peakEstimate` under the perf
    lock and on the Pixel (unlocked on the desktop: 0.79-1.17 ms a tap at
    desktop size, 1.75 ms at phone size, `.claude/probes/K180/sheet*.log`;
    deduplicating its times halves the work).
- **K114** · Gameplay round 2 (Levi's notes, 2026-10-13) is designed
  in section R of `docs/design/K80_gameplay_additions.md` (9f0a9c3).
  Shortlist: the burn race (turn-based), the cut verb with an
  auto-walker ("Lead the walker" first), the beat rider, the spider, a
  Pluck Hero MVP. Ten calls in R.0: the first prototype (burn race), a
  `clock` param (turn | beat | realtime; with the beat rider), what a
  cut does (deletes the whole run), render + walk-graph cuts rather than
  splitting the thread, the cut gesture (a scissors button), healing
  cuts against monsters, the spider's form and an arachnophobia option,
  Pluck Hero as an MVP first, round 2 in free play first (the burn race
  as the first K46 modifier), and flow as a separate stat.
  - for the briefs: balance probes for "Keep it in" and burn-race
    tension; hiding runs needs an inverted reveal mask or per-run hiding
    (a new G2 term and its paint_math mirror, shared with K76), plus the
    cut's render details; `clock` brings timed, typed attempts (daily
    store v3). R.7's sources are unverified leads from memory (the
    Pac-Man speed figures among them). K80 sections 1 and 3.2 are stale
    since K101 (bracket notes added).
  - 2026-10-14 about 00:22: Levi took the recommendations for calls 1-6
    and 8-10 (`docs/design/levi_notes_2026-10-14.md` item 12: "Recs,
    plus a spider answer"). Call 7 waits: the spider's form (a
    `minotaur=spider` mode or its own enemy), its look, and an
    arachnophobia option (R.0 and R.3.2 of the design).
  - next: Levi's spider answer, then the burn-race brief.
- **K162** · K147's calls (`docs/design/K147.md`): (1) the trade: the
  first settle now plays in slow motion (first sleep 11.6 -> 21 s; at 4x
  CPU throttle 40 -> about 100 s) for a smooth intro (p95 159 -> 31 ms;
  719 -> 159 ms at 4x) with the knot on screen at 2.6 s instead of 4.3 s;
  (2) the defaults, `settleBudget` 12 ms and `loadSettle` 0.45 s (its max,
  5, settles first); (3) whether both stay daily-exempt; (4) whether drags
  at gs 18 get a budget too (165-170 ms frames, sim/wall 0.6).
  - 2026-10-14 about 00:22: Levi will test it later (item 7). He asked
    whether the web worker changes this; answered in session: K7's worker
    would keep frames smooth whatever the physics costs, and K7 is not
    scheduled.
  - On the phone (K156 3c, 2026-10-14): the first sleep came at 17.5-21.6
    s on both load links, the default and `gs=18`, so the settle budget,
    not the maze, sets it.
- **K174** · K80 stage 1's calls (`.claude/probes/K80/rt/results.md`).
  Play it: https://levi.dev/knotmaze/?7.J&clk=realtime
  - The minotaur's chase pace as a share of the player's: 0.7 (default)
    or 0.8? At 0.8 a player who stops to think at junctions escapes 16%
    of chases (53% at 0.7); one who queues taps mid-run, 67% (75%).
  - Detection starts at 15 (default) or 17.5? The greedy player's mean
    catches go 1.26 -> 1.73.
  - Should `minoFog` default to "always"?
  - Should a catch re-fog the explored maze? (It doesn't now.)
  - The caught row shows even with the stat rows off: confirm.
  - Presence: 45% of games never meet the minotaur. Fine, or should it
    seek the player more (K179)?
  - 2026-10-14 about 00:22: Levi will test it later ("Remind me
    tomorrow.", item 6). A reminder is set for 11:07 on 2026-10-14; if the
    coordinator session is gone by then, remind him that day.
- **K184** · K155's star calls (`docs/design/K155.md`, "Stage 1
  handoff"; play: https://levi.dev/knotmaze/?7.J): (1) greedy solves:
  exactly two stars (built: two up to 4x, which 52-53% of greedy solves
  earn) or at least two (the line moves to about 2.5x)? (2) catches cap a
  finish at two stars (built), or each catch takes one star off (the
  real-time two-star share goes 47% -> 33%)? (3) the banner shows "2.2×
  the shortest route" (built) or a percent?
- **K185** · The still pluck's cold-link stall: the first time reduced
  motion is switched on in a fresh profile, the still pluck's shader
  program links on the spot, about 340 ms. (a) Accept it (recommended),
  (b) `KHR_parallel_shader_compile`, or (c) warm it at load (+340 ms to
  the load)? (`docs/design/K104.md`, "Stage 1c handoff" step 6)
- **K186** · K140's confetti calls (`docs/design/K140.md`, "Stage 1
  handoff"; play: https://levi.dev/knotmaze/?7.J, `&cfa=3` for the most):
  (1) reduced motion: no rain and a 40% slow spray
  (`reduced_phone_1b_spray.png` in K140's probes), or no confetti? (2)
  confetti on every win banner, including a reload of a solved attempt
  (`pendingWin`, `src/main.ts` about line 2079) and the Reset path during
  the winning move, or only on a live finish? (3) the colors (a festive
  set built from the gold 0xffd23f) and the default amount, 1?

## In progress

- **K74** · Maze design, decided (Levi, 2026-10-13 13:17; his answers
  verbatim in `docs/design/levi_notes_2026-10-13.md`): every mechanism
  gets params whose neutral value turns it off, so difficulty and feel
  stay adjustable. Design: `docs/design/K74_maze_design.md` (dad40f8).
  Four stages from `docs/design/K74.md`, each re-freezing the pins it
  moves and running the K63 sleep checks:
  - stage 1 MERGED in fbf5b5c..8ba0c32 (2026-10-13 about 16:25; it
    deploys): `exitClearance` 12; long-tail dead ends (`deadEndLength`
    20, codec v4 index 71; 0 = the old placement, byte for byte), on at
    density 0.5 for links and the daily. Greedy median 1.96x -> 3.12x
    optimal; every daily moved (saved attempts refuse cleanly). Results
    and pins: the brief's "Stage 1 handoff"; the delegated pick, for
    Levi to review if he wants:
    `.claude/probes/K74/out/K74_stage1_before_after.png`;
  - stage 2: H1, the fused arm cut, with a slider for the share of H's it
    cuts (decision 4; the free-tip cut breaks sleep);
  - stage 3: the trap-zone finish (corridor and taper, away flank) beside
    the empty zone, with params for which and how much (decision 2);
  - stage 4: the greedy-trap search at load (decision 6: about 60 ms
    median on the desktop, engine-exact; time it on the phone), K46's
    greedy bands as difficulty params (decision 7), then the target band
    (greedy >= 2.5x optimal, <= 15% within 1.5x; decision 1) checked at
    the defaults.
  - owner: nobody since 2026-10-13 16:20 (stage 1's agent
    `afe7e8d13a4b8112b` finished; its worktree
    `.claude/worktrees/agent-afe7e8d13a4b8112b` is kept for follow-ups).
  - branch: mainline; last commit: `8ba0c32`.
  - evidence: `.claude/probes/K74/` (stage 1: `out/analyze_stage1.txt`,
    `out/phys1.jsonl`, `out/verify_*.txt`, `out/k47_refuse.txt`, the
    sheet; the design's `out/scan_final.jsonl` and the hooked plan copy
    `proto_plan_src.ts`); the design agent's worktree
    `.claude/worktrees/agent-aeaf1e61bcecaaf0b` is kept. Fisher's books,
    Abbott's essays and Buck's book-only chapters are unverified (doc
    section 1).
  - next: write stage 2's brief in `docs/design/K74.md` from the
    handoff's "For stage 2" notes, then launch it (item 12 of the
    order). K80's call 6 (Levi, 14:31: "Absolutely"): dead ends are the
    minotaur's hunting ground. Dead-end branches, several runs behind
    one bridge, would make deeper traps: a later K74 param, settled with
    K80's brief.
  - brief: `docs/design/K74.md` ("Stages", "Stage 1 handoff").
- **K80** · The minotaur, decided (Levi, 2026-10-13 14:31, verbatim in
  `docs/design/levi_notes_2026-10-13.md`; design
  `docs/design/K80_gameplay_additions.md` section 0, 17b729b). The
  telegraphed hunter, with the guard and stalker variants, and Abbott's
  rule as a puzzle mode (call 1); the telegraph on by default, as a
  param (call 2). Turn-aligned and real-time movement (call 3). In real
  time it has a wander pace and an approach pace, randomized pauses at
  junctions (maybe randomized paces), and detection starts and ends at
  distances measured along the threads to the player, not in runs.
  Every distance and speed is a param. A catch sends you back to the
  entrance and is counted (call 3). No undo with it, even in free play
  (call 4). A wait move only in turn-aligned mode (call 5). Dead ends
  stay its hunting ground (call 6). Dailies later (call 7: "Let's not
  worry yet"). The first music and rhythm experiment (call 8: "I do want
  to be able to play with alternate modes"). Section 5's order after it
  (call 9). Real time comes first, as a dedicated mode rather than a
  toggle on another (Levi, about 15:30: "I really want the real-time
  prototype. Maybe it's not a modifier of another gameplay mode, but
  rather a dedicated mode itself. Do implement it."); the turn-aligned
  hunter stays a modifier of the normal maze, later.
  - stage 1 MERGED in ae49553..5fed5c1 (2026-10-13 23:11; deployed): the
    `clk=realtime` mode and `src/game/minotaur.ts` (a 120 Hz fixed step,
    exact math, `replayChase`, `undoAllowed(clock)`; 15 tests); codec v4
    appends 84-98 (clock, playerPace, minoWanderPace, minoHuntPace,
    minoPaceJitter, minoPauseChance, minoPauseMin, minoPauseMax,
    minoDetect, minoLose, minoCatch, minoDeadEnds, minoRoam, minoWake,
    minoFog; legacy keys clk plp mwp mhp mpj mpc mpn mpx mdt mls mct mde
    mrm mwk mfg); `respawn()`, the marker and its glow, the panel's
    "Minotaur" folder, the HUD's caught row, a toast and an off-screen
    indicator; approachPace 8 -> 7 from the simulation. `clock` is not
    daily-exempt, so the dailies stay turn-based.
  - owner: nobody since 2026-10-13 about 22:00 (agent a9c90f15cd6a55710
    finished; its worktree `.claude/worktrees/agent-a9c90f15cd6a55710` is
    kept).
  - branch: mainline; last commit: `5fed5c1`.
  - evidence: `.claude/probes/K80/rt/` in the main checkout (`run_rt.ps1`,
    `results.md`, `rt_chase.mjs`, `rt_page.mjs`, `out/`); the research's
    `.claude/probes/K80/` and its kept worktree
    `.claude/worktrees/agent-a25726c24f262b138`.
  - next: Levi plays it and answers K174; its phone checks join the
    round's pass (K177); then the turn-aligned hunter (item 11 of the
    order).
  - brief: `docs/design/K80_realtime.md`; the research brief
    `docs/design/K80.md` and its doc
    `docs/design/K80_gameplay_additions.md`.
- **K156** · The round phone pass (K152 (1)): `scripts/phone_pass.ps1`,
  built from K81's gate kit. Two builds (the round's base and head) run
  interleaved through a frame bench (knot, fabric at 0, 10 and 21 moves,
  and a load scenario for K147), then looks from a JSON list, into a
  summary table and screenshot sheets.
  - 3a and 3b MERGED in 6521bb2..ae49553 (2026-10-13 about 21:50; sonnet
    agents a262df65dcc1489a7 and a957f7f1407f5df9f, desktop dry runs
    only). 3c MERGED in 74ce373..de5f39e (2026-10-14 01:46; sonnet agent
    a595ec530724dbba1, on the phone): the A/A smoke test, `-WaitReady`
    (K171 b: a read-only check every 3 min, two ready in a row start the
    pass; `retry_quiet.ps1` waits up to 240 min), the tracked noise floor
    (`scripts/phone_pass/noise.json`, landscape, K193), defaults `-Moves
    0,7,13` and `-LoadSeconds 30`, clean-origin looks, and the round's
    new looks. Its worktree is kept.
  - the round pass of 2026-10-14 01:55-02:20 (base ab6d330, head
    54a2b43 = 81d31a5's code; 3 reps, landscape, no watchdog trip):
    every at-rest cell (fabric at 0, 7 and 13 moves, knot) is within
    noise. Load: the longest frame fell 684 -> 167 ms (`?b.J`) and
    667 -> 150 ms (`gs=18`); first sleep rose 8.0 -> 19.3 s and
    9.3 -> 22.5 s, fps fell 46 -> 41 and 44 -> 35, p95 33 -> 50 ms, and
    `gs=18`'s frames over 50 ms 48 -> 84 (K197). Looks: all 18 ran on
    head (base lacks the new features).
  - owner: claude session d8031183 (the coordinator).
  - branch: mainline (no code); last commit: `81d31a5` (K192's pin in
    `walk.mjs`).
  - evidence: the pass's folder `.claude/probes/rounds/2026-10-14-81d31a5/`
    (`summary.md`, `sheets/`, `logs/run.log`) and its console log
    `.claude/probes/rounds/pass-2026-10-14.log`; 3c's
    `.claude/probes/K156/3c/`; the round's looks
    `.claude/probes/rounds/2026-10-13/looks.json`.
  - next: look over the sheets; sweep the 3a and 3b worktrees
    (`.claude/worktrees/agent-a262df65dcc1489a7`,
    `.claude/worktrees/agent-a957f7f1407f5df9f`) with
    `.claude/probes/K161/cleanup.ps1` (`-DryRun` first). The next round's
    pass runs after K198 and K93 merge and covers K146, K151, K148, K149,
    K120, K90 1a and 1b (no behavior change), K100, K132, K198 and K93,
    and adds K120's look `k120-pad`
    (`.claude/probes/K120/looks_k120.json`). The pad is on by default on
    the phone, so unpinned head shots and frame cells show it where the
    base shows nothing, and `makeMoves`' choice taps could land on it
    (0 of 50 measured): looks that don't test it set `knotmaze.movePad`
    to `0` and reload, or `makeMoves` skips points under `.km-pad`.
    Pinned looks hide it.
  - brief: `docs/design/K156.md` (the 3a, 3b and 3c handoffs).
- **K161** · Disk: C: had 24.4 GB free (2026-10-13 about 19:30, before
  K81's 1.6 GB probe copy). `$env:TEMP` holds 1145 `knotmaze-*` Chrome
  profiles (about 36.5 GB) that probe runs never delete; the worktrees
  take 3.8 GB and the probes 2.7 GB. Proposed: delete the profiles older
  than a day, sweep the stale worktrees, and have the probe libraries
  delete their profile on exit (with K150). Levi approved it on 2026-10-14 at about 00:22 ("Yes.", item 2); C: had 19.6 GB free at 00:32.
  - owner: claude session d8031183 (the coordinator), a background
    cleanup script under the perf lock.
  - branch: mainline (no code); last commit: n/a.
  - evidence: `.claude/probes/K161/cleanup.ps1` (`-DryRun` first) and
    `cleanup.log`. Run 2026-10-14 01:17: the five merged worktrees are
    swept (probes copied and verified first, branches kept); no profile
    was a day old yet (1094 of 1177 date from 10-13 13:16-16:16).
  - next: after 16:20 on 10-14, run `cleanup.ps1` again for the
    profiles (about 33 GB). The probe libraries' delete-on-exit goes
    with K150.
- **K98** · Marker sizes and two new glyphs (Levi, 2026-10-13: "I
  like all your icons. The defaults are good."). A slider for the
  player's dot diameter relative to the thread width, 0.25-3, defaulting
  to the pre-K83 head dot (radius 0.54 tw, so 1.08 tw across; K83's
  discs are 3 tw, `markerRadiusFor`). The black disc is what the slider
  sizes; each white icon fits inside its disc with a slight margin. The
  start, finish, minotaur and every other in-game icon match the
  player's. Colored dots return at the start and finish, larger than the
  icon disc, so a colored ring shows at the default (the pre-K83 discs
  were 0.95 tw in radius). Simple minotaur and spider glyphs
  (`src/render/marker_glyphs.ts` and its fit test). Call (3) unanswered:
  the head stays on top. Call (4), K121, stays as is (Levi, 2026-10-13).
  A codec append, after K79 stage B and K81.
  - owner: agent a4aa6adc47840272d (opus) of session d8031183, started
    2026-10-14 09:07; it stops at about 11:07 or when the stage is done.
  - branch: `worktree-agent-a4aa6adc47840272d`
    (`.claude/worktrees/agent-a4aa6adc47840272d`), from e17c2a2; last
    commit: none yet.
  - evidence: `.claude/probes/K98/` in its worktree (copy at merge).
  - next: its one stage; the size param is a codec append, daily-exempt.
    At merge, carry its lore edits into `render-markers.md` (Marker icons,
    K83), where K173 moved them.
  - brief: `docs/design/K98.md`.
  - env: dev servers on ports 5590-5599.

## Next, in order

Every stage merges after desktop verification, and the phone checks
each merge round in one scripted pass instead of a gate per feature
(K152 (1), Levi 2026-10-13 about 17:55: "sgtm"). Small UI items get
unit tests and a screenshot only, and render prototypes skip the CPU
mirror and parity tests until Levi picks a look (K152 (2) and (3),
Levi 2026-10-14 about 00:22: "Yes to both."). The phone stays on its
charger, awake and unlocked (Levi, 2026-10-13 10:40), and a pass's
watchdog stops it on any touch. A pass checks the lock first and stops
at once if the phone is locked (K81's gate waited 47 min on a locked
phone, 2026-10-13). At most three code agents at once, research on
top. Pre-launch, nothing keeps old links or dailies (Levi, 2026-10-13
13:17; CLAUDE.md "Pre-launch: no back-compat"), so codec appends no
longer wait for each other: the second branch to merge renumbers its
appends. Usage: don't hold agents back until the week nears 95% (Levi,
2026-10-13 07:40, raised from 90% at about 23:53; 42% at 07:17, 54% at
13:35, 57% at 15:33, 61% at 17:48, 63% at 19:15, 66% at 23:13, 68% at
23:54; on 10-14 69% at 00:25, 72% at 01:49, 76% at 07:38, 78% at 08:05,
80% at 08:37, 82% at 09:04 and 83% at 09:28; at 13:40 on 10-13 he said keep going at full speed, and on 10-14
at about 07:53 "Keep going at full pace."; it resets Mondays at 12:00).
Long work runs in stages from
committed briefs (Levi, 2026-10-13; the coordinator oversees it): each
brief names its stage boundary, where the agent writes a "Stage N
handoff" into the brief, commits and stops, and a fresh agent continues
from it. K81 alone was about a third of the overnight spend. From
2026-10-13 23:35 each brief stops at a wall-clock cap (2 h Opus, 1 h
Sonnet; a compaction is not a stop), and a watcher flags agents past it
(claude-config CC38). Sonnet agents don't compact at 200k yet
(claude-config CC45), so the cap is what bounds them.

Order from 2026-10-13 15:45, after Levi's answers at 09:35, 13:17,
13:30, 14:31-14:39 and 15:30-15:40, and on 2026-10-14 at about 00:22
(he may reorder). Running on 10-14: K198 stage 1 from 08:37, K93 (stage
1 of K93 + K145) from 08:45 and K98 from 09:07 (all opus, 2 h caps).
K100, K132, K90 stage 1b and K173 (the rules split) merged at
08:39-09:17; the coordinator carries the running agents' rules edits
into the topic files at their merges. Then, as code slots free up:
1. The round's phone pass (K156): the 01:53 pass on head 81d31a5 (K79 B,
   K122, K147, K81, K80 stage 1, K104 stage 1c, K155, K140, K154, K169
   and K180 against base ab6d330) is done (K197 filed); the next pass
   runs after K198 and K93 merge and covers K146, K151, K148, K149,
   K120, K90 1a and 1b, K100, K132, K198 and K93.
2. K80's real-time chase, its own mode (Levi, about 15:30: "I really
   want the real-time prototype... Do implement it."): stage 1 merged in
   5fed5c1; Levi plays it (K174).
3. K146 + K151 and K148 + K149: merged 2026-10-14 (b9cf882, fcc402b).
4. K120: merged 2026-10-14 (0acbce0).
5. K90 stage 1b: merged 2026-10-14 (feb12a0, flag off); Levi's call
   (ship, tune or stop) is in Waiting on Levi.
6. K132 and K100: merged 2026-10-14 (402eb4b, 458e1e5).
7. K93 + K145 (`docs/design/K93_K145.md`): stage 1 (K93) running from
   08:45; stage 2 (K145) from master after it.
8. K92, then K111 (both rework the panel).
9. K98, running from 09:07 (`docs/design/K98.md`).
10. K76 stage 2.
11. K80's turn-aligned hunter, a modifier of the normal maze; then
    K137's toggles, K138's M mechanisms and K139.
12. K74 stages 2-4, each after the one before.
13. The GPU pipeline: K8 (G3-0 + G3-1 first) and K23, then K9 (G4) and
    K42. K90's spline fix touches K8: never run the two at once.
14. K115's builder stages (no stage 1a: Levi, about 15:30).
15. K116, lowest priority.
16. K144, accounts and shared stats, after everything else (a stretch
    goal).

Waiting for Levi: K90's bend bound (he tests it live); K114's spider (call 7); the G3-3 and G4-2 old-path
deletions; K162, K174 and K184-K186 (play, then call); K191, K193 and
K194; K198's indicator settings and flash; K219 (a floor for the hover); near launch, K117 and K210;
after the churn, K46, K57 and K84. Emailed 2026-10-14 about 08:25, each with
enough detail to decide and numbered for a reply by number: K114 call 7
(1.x), K174 (2.x), K191 (3.x), K193 (4.1), K194 (5.x), K198 (6.1
settings, 6.2 flash) and claude-config's CC39 (7.1); the draft is in
`.claude/probes/levi_email/` (untracked).

K5-K7 (split, frame loop, worker) follow.

- **K145** · A subtle hover glow on runs that aren't choices (Levi,
  2026-10-13 about 16:00 and 16:12, verbatim in
  `docs/design/levi_notes_2026-10-13.md`): in the maze, hovering any run
  that isn't a choice at the player's junction (the choices keep their
  stronger hover) lights a glow along both edges of the thread, inside
  its bounds, fading quickly toward the center line and fading out with
  distance from the hover point and toward the run's junctions; the
  reach can borrow the choices' length param (`pulseReach`, which K93
  makes the hover's reach). A touch press shows it too, until the finger
  lifts (the tap-pluck still fires on release) or the press becomes a
  tug or a pan. For the brief: the pointer move in `src/main.ts` asks
  `fabric.edgeAt`, which picks only choosable runs, `setHover` tracks
  one run, and a touch press on a thread sets `pendingPluck` with no
  hover at all; the glow is a new G2 paint term plus its `paint_math`
  mirror (the hovered run and the hover point's arc position), measured
  along the thread like the pulses; a strength param (0 = off), proposed
  daily-exempt (K57). Stage 2 of `docs/design/K93_K145.md`, a fresh agent
  from master after K93's stage 1 merges.
- **K92** · Undo and redo for design changes (Levi, 2026-10-13). Two
  buttons beside the panel's open/close button, shown only while the
  panel is open, each enabled only when it can act; the mode badge moves
  to a row below them. An undo stack of design changes, including the
  "Free play" badge's tap (today it replaces the link, so an unshared
  design is lost). His call (2) stands: under fog, a tap on the finish
  indicator only shows a toast. Files: `src/ui/tweakpane_panel.ts`,
  `src/main.ts`, `src/ui/mode_badge.ts`, `src/ui/url_state.ts`;
  `.claude/rules/gameplay-badge.md` (MODE BADGE). Brief
  `docs/design/K92.md` (one stage); it launches after K198 stage 1 merges.
  - K80 (5fed5c1): real time has no move undo (`undoAllowed(clock)`); if K92's buttons ever reach maze moves, they consult it.
- **K111** · Accessibility (Levi, 2026-10-13). Reduced motion also
  stills the flow undulation, but not the intros or the pulses next to
  the player. Those pulses get a dropdown of alternative highlight modes,
  which also serves high contrast. An Accessibility group near the top of
  the panel holds "High contrast" and "Reduced motion" master checkboxes
  that override every relevant setting (today's Motion setting is
  `src/ui/motion.ts`, K79). The panel part after K79 stage B merges and
  after K92 (both rework the panel); the highlight modes after K81.
- **K76** · The thread-reveal mode, stage 2 (doc section 7), decided
  (Levi, 2026-10-13): the end look is a dropdown (fade, halo, glow, dots,
  fray, beacon; default beacon); the doc's other recommendations stand
  (`threadReveal`, `revealDistance` 2.5, `revealFade` 1; dailies via a
  theme, not a toggle; the literal reveal rule; the exit indicator hidden
  until the exit is seen); and, at his suggestion, fog and the reveal
  are the options of one `exploration` dropdown (off | fog | threads),
  which replaces the fog toggle in place (pre-launch, no back-compat).
  Design: `docs/design/K76_reveal_mode.md` (0474300); contact sheet
  `.claude/probes/K76/out/contact.html`. After K81. It must build the
  mode as a separate shader variant: compiled in, it costs mode-off
  frames 2.3 -> 2.8 ms on the desktop (measured while two of K74's CPU
  scans ran; re-time).
  - owner: nobody since 2026-10-13 00:01 (stage 1 done; the agent of
    session d8031183 can resume while the worktree is kept).
  - branch: `worktree-agent-aea102de995e1ce30`
    (`.claude/worktrees/agent-aea102de995e1ce30`); prototype WIP 1fbc0d2
    and 23907a5, doc c05dbfc (on master as 0474300).
  - evidence: `.claude/probes/K76/`.
  - env: the prototype server is in the doc's handle (port 5276, private
    cacheDir).
  - brief: `docs/design/K76.md`, then `docs/design/K76_reveal_mode.md`.
- **K137** · K80 section 4's cheap mechanisms, each behind a toggle
  (Levi, 2026-10-13 14:31: "I'd love to prototype all of these and have
  controls to toggle them"), after the minotaur. Sized S or S-M in the
  doc: 4.3 crack-then-break, 4.7 the sword, 4.9 sleepers, 4.10 lure
  plucks, 4.13 tunnels, 4.14 par, 4.15 Ariadne's spool, 4.16 chalk
  marks, 4.17 the lantern, 4.21 ghost race (after K85), 4.26 sonar
  pluck, 4.28 hints, 4.29 sprint, 4.30 snares, 4.32 lives, 4.33 mud,
  4.34 scent. Plus Levi's sleeper variant: an enemy that appears at a
  junction a turn or two after you leave it, then follows you, with
  some variance. The M ones are K138; the M-L and L ones wait in K141.
- **K138** · K80 section 4's M mechanisms, each behind a toggle
  (Levi, 2026-10-13 about 15:30, verbatim in
  `docs/design/levi_notes_2026-10-13.md`: "Let's defer those M-L or L
  items. Let's do all the M items."), after K137: 4.1 locks and keys
  and 4.2 one-way runs (both in call 9's order), 4.4 required pickups
  (then 4.5 stars, S), 4.6 fleeing critters (simulate first: K80's
  brief notes), 4.11 switches, 4.12 turnstiles, 4.18 color rules, 4.19
  ice, 4.20 rescue, 4.23 the myth, 4.24 tides, 4.27 hidden runs, 4.31
  more exits. The ones that change generation (4.1, 4.2, 4.4, 4.11,
  4.24, 4.31) need a solvability check there. The M-L and L ones are
  K141.
- **K139** · Collapse mode (Levi, 2026-10-13 about 15:10, verbatim in
  `docs/design/levi_notes_2026-10-13.md`): no backtracking, each run
  collapses behind you; collapse as much of the maze as you can and
  still reach the finish, or, a variant, without reaching it. It rides
  on 4.3's one-shot snap (`fragile`, in K137) and R.3.4's "longest
  thread" (`docs/design/K80_gameplay_additions.md`). A 3-way junction
  can be passed only once, and its third run stays standing unless the
  route ends there, so 100% is usually out of reach: the puzzle is which
  run to leave at each junction. With the finish, a dead end strands
  you; without it, a long dead end (K74's tails) is the best last move.
  Par at generation by depth-first search (exact for a few dozen
  junctions, R.3.4; time it on the phone). Arms that would cut you off
  from the finish draw cracked (R.3.3's smoldering rule). Score and
  share: thread collapsed vs par. Param `collapse` (off | finish |
  free). S-M after 4.3.
- **K46** · Daily variety, revisited after the feature churn (Levi,
  2026-10-12): no weekly or regular arc; THEMES, each a set of parameter
  constraints; manual per-day overrides later (K82). The measured
  proposal, with his direction at the top, is
  `docs/design/K46_daily_variety.md` (8b1eb90). Its probes are in
  `.claude/probes/K46/`, and the proposal agent's worktree
  (`.claude/worktrees/agent-a78c73cec4770a14d`) is kept. Pre-launch,
  the daily changes in place, with no `DAILY_V2` or `fromDay` (K132).
  Validation must use engine-exact math only (K108,
  `src/util/det_math.ts`). Today's trailLength default is 10, so
  memory-trail themes set 5 (K73). Brief: `docs/design/K46.md`.
- **K78** · The Knotmaze handbook: algorithms, architecture, decisions
  and trade-offs, and a per-param reference with figures (the
  half-lattice units diagram first). Write it once the churn settles.
  Levi (2026-10-13): public; Markdown, later also posted on his Blogger
  devlog (devlog.levi.dev), so figures are standalone images and the text
  needs no repo links or internal IDs. Plan:
  `docs/design/K78_handbook_plan.md`.

- **K5** · Split `main.ts` and `ribbon_renderer.ts` along the new data
  lines, once K1-K3 land.
- **K6** · One frame loop driven by what-changed flags (after K5).
  Replaces K21's stand-in `sceneAnimating()` in main.ts, and the
  render-on-demand loop (K24) asks `background.needsFrame()`.
- **K7** · Physics in a Web Worker, with render-side interpolation between
  physics steps (after K6). Smooths the UI; it does not speed up physics.
  Acceptance includes K28: the intro runs at full frame rate WHILE
  physics settles (no settle-first loader wait). K147's per-frame budget
  is the main-thread interim (a smooth intro over a slow-motion settle);
  the worker gives the settle a whole core.
- **K8** · G3: SDF ribbons drawn from one shared sample texture
  (`docs/design/G3G4_sdf_geometry.md`). Defaults: anchored tails keep
  flat caps, phones stay at a 2x resolution cap. Over-tight folds keep
  today's pinch, not the doc's filled lobe (Levi, 2026-10-13: "Pinching
  is probably better"): shrink the per-sample radii to the local bend
  radius inside the CPU-flagged fold windows. K90 aims to make such
  folds physically impossible. Fold in G1's GPU levers: a loop-free protect test
  (about 0.15 ms of register pressure at 3200x1800), a zoom-aware
  polyline tolerance, a per-point far-branch gate, and dropping the
  globals fetch.
- **K9** · G4: smooth-union SDF junction webs (cuspRadius = blend
  radius); A/B crops at cr 1, 3, 6 before the fans are deleted. Also
  closes G1's x160 leftover: a faint tick where a wedge flank meets a
  tucked bridge, and the merge-core hairline dashes at 4-way merges
  (`.claude/rules/render-gaps.md`), which K74's H3 (`fourWayFraction`
  0.9+) would multiply. From K81 (2026-10-13): the webs should carry the
  traveled route as the smooth union of the traveled pieces only.
- **K115** · Cursive text and shapes, decided (Levi, 2026-10-13 14:32,
  verbatim in `docs/design/levi_notes_2026-10-13.md`; design
  `docs/design/K115_cursive_text.md`, ded57f7). Its staged plan goes
  ahead without stage 1a's legibility test (Levi, about 15:30: "We can
  assume that text reads at phone zoom. You don't need to test that."):
  the text builder and a standalone welcome/credits scene, the title
  thread, text inside a maze, then shapes. Calls: pinned text (1).
  Junction+spur where a join meets a letter's body (a c d e g o q), the
  spur a real, travelable dead end, not decoration (2). Text first in
  the standalone scene (3). Hershey Script Simplex for Latin (4): its
  lowercase letters all join at mid x-height, so a word is one thread.
  Its capitals don't join, and Levi wants capitals (about 15:30: "I want
  to support capitals."): first a generated connector for every capital
  (a curve from the capital's last stroke to the next letter's lead-in,
  matching both directions), then hand-made joins (the capital's last
  stroke redrawn in the glyph data) where one measures badly, which also
  fixes the D's self-touching flourish. Text inside the one link token,
  so the codec gains a string type (5). No foreign threads inside words
  (6).
  - for the briefs: an explicit over-pass field on CROSSING nodes (the
    lattice keeps its path, so the golden stays byte-identical); a
    decorative walk-graph flag for dots and accents (spurs are walkable
    now); K109's piece model must count a text bridge and
    `repairTailRoute` (K110) must not cut it; `buildCellMask` keeps only
    the largest component; a TEXT run flag. Hershey's acknowledgements
    ship with the data (K122). The connector's worst case: W to e spans
    19 HU, about two letter widths, so the curve swoops and can cross
    letters at shallow angles. With stage 1a dropped, the builder
    calibrates the doc's section 3.4 thresholds as it goes. Evidence:
    `.claude/probes/K115/` (Hershey data and its license; SVG-proxy
    measurements, not the real renderer).
  - next: the builder's stage 1 brief, at its place in the order.
  - K122: in the commit that adds the Hershey data, set `shipped: true`
    on `hershey-fonts` in `notices/credits.ts` (a test fails while
    `src/` or `public/` names Hershey and the flag is false).
- **K116** · Alternate pluck instruments and accompaniment, lowest
  priority (Levi, 2026-10-13 13:30; his calls at 14:39 are verbatim in
  `docs/design/levi_notes_2026-10-13.md`; design
  `docs/design/K116_instruments.md`, 2e60b00). First the band skeleton
  (buses, ducking, a limiter, one clock), a drone and bass, and four
  `pluckVoice` presets: harp, koto-like, muted pizzicato and a bright
  12-string-like voice (3-4 days; calls 1-2); then marimba and bells on
  the modal engine. The band is on by default at first (call 3), about
  10-14 dB under the pluck (call 4); samples are deferred (call 5); a
  song's loop is whole bars, so Scarborough Fair's closing rest grows
  from 2 beats to 3 (call 6). For the brief: `pluckVoice` (pvc),
  `accompaniment` (acc: off|drone|band) and `accompLevel` (acl) are
  daily-exempt codec appends; first a Pixel 11 audio-CPU and voice-count
  probe. Section 6's sources are unverified leads from memory (the
  VSCO-2, FluidR3_GM and MusyngKite licenses, the mode ratios, iOS
  `navigator.audioSession`, Opus on Safari). The loop length is K125.
- **K144** · Accounts and shared stats, a stretch goal after
  everything else (Levi, 2026-10-13 about 15:40, verbatim in
  `docs/design/levi_notes_2026-10-13.md`): log in through an OAuth
  provider and keep stats across devices; an opt-in checkbox to share
  them (maybe only when logged in); simple backend services that scale
  cheaply; averages and percentile bands per metric and level for
  opted-in players; cheap anti-cheat that silently flags suspect
  accounts and leaves them out of the aggregates.
  - for the design: K108's determinism and K47's move records let the
    server replay a submitted walk (valid moves, a plausible time for
    `moveSpeed`), a cheap check. Backends to weigh: Cloudflare Workers +
    D1 beside the Pages site, or the SnoringCat platform (Nakama on
    Hetzner, hopnbop's). Accounts bring a privacy policy and account
    deletion.
  - next: a design doc, after everything else.
- **K10** · Phone benchmark after every stage. Baseline (Pixel 11, Chrome
  154, 2026-10-11, default maze settled): 30 fps at rest with defaults,
  51 fps with `fw=0`. Flow at rest halves the frame rate today. Compare
  builds only with the knot asleep (or `phy=0`): a stale K1 preview that
  had not slept after 19 s on the phone ran 5.8 fps on physics alone
  (158 ms/frame), while master at Levi's link settled and ran 40 fps.
  Measured 2026-10-12, Pixel 11 over Tailscale, `?b.c&am=instant&snd=none`
  settled, medians of 2 (`.claude/probes/K10/bench_2026-10-12.txt`):
  - pre-G1 40.5 fps with flow, 60 with flow off;
  - G1 58-60 with flow (the regression flow caused is gone);
  - master 56-59 with flow;
  - backgrounds: none 58-59, vellum 56-59, mist 55-58 (a small cost);
  - G2 about 44 with flow on or off (K4);
  - G2 with the fan fix, on K63 (merged): 59.5 with flow, 60.3 flow off
    (master 59.5 / 59.3).
  - K75 + K73 (ce331bc) vs 182b2cf, 2026-10-13: 58.3-60.5 vs 58.3-60.5
    with flow, 60.3 vs 60.3 flow off, 59.3 vs 60.3 with `pv=trail`; both
    sleep at sim 5.0 s (wall 9-20 s is load noise)
    (`bench_2026-10-13_K75K73*.txt`). The bench now records a sample
    from a hidden tab (screen timed out) as null instead of crashing.
  - K83 (5592f8c) vs ce331bc, 2026-10-13: 60.3 vs 60 with flow, 60.3 vs
    60.3 flow off, 60.5 vs 60.5 with `pv=trail`, p90 16.7 ms everywhere;
    every run asleep by sim 5.0 s on both (`bench_2026-10-13_K83.txt`).
  - K79 stage A (7225930 vs e25d202, 2026-10-13 11:06-12:03, wireless
    adb): PASS. 60.0-60.5 fps, p50 16.7 ms, on both builds at default,
    `fw=0` and `pv=trail`, all 36 runs asleep; frames 0 px in fabric,
    knot, mist and none; vellum at `bgs=1` costs less than the phone
    resolves (about 0.18 ms/frame, +-2 ms); the panel row 16/16
    (`.claude/probes/K79/phone/results.md`).

  Rerun after every stage: `scripts/preview.ps1` builds per ref,
  `scripts/phone.ps1 -Ports ...`, then `.claude/probes/K10/phone_bench.mjs`.
  The phone must be unlocked and awake. It heats up under back-to-back
  runs (light throttling at 39 C skin, on its charger), which lowers
  flow-on fps for every build alike: check `adb shell dumpsys
  thermalservice` (status 0) and park the tab between runs
  (`.claude/probes/K4/phone_blank.mjs`). Vsync-capped fps cannot show the
  headroom left; a load-amplified bench (a higher render resolution)
  would.

## Residuals (known, not fixed)

- **K224** · On the phone (411x753) the K120 move pad (z-index 18) draws
  over the open panel (seen in K198's phone probe). K92 reworks that
  chrome, so its launch takes the fix.
- **K223** · Tooling after K198: K149's `.claude/probes/K148_K149/probe.mjs
  slack` checks the old 0.3-screen rule and now fails by design (K198's
  `.claude/probes/K198/pan.mjs` replaces it), and K173's
  `scripts/split_rules.json` still anchors on the old FIT CAMERA PAN
  SLACK entry, which matters only if the split is re-run.
- **K222** · K198's maze edge leaves out the win ring (about 5 px past
  the disc, inside the 10 px gap), the head's glow and the minotaur, and
  the range ignores the panel's height, so a maze lower than a short
  panel still has to clear it (`docs/design/K198.md`, The calls).
- **K221** · K198's range reads the maze's right edge, which creeps while
  the knot settles (about 0.3 fit px per 200 ms), so at the left limit
  the gap to the open panel shrinks by zoom times the creep (0.2-1.2 px
  measured) (`docs/design/K198.md`).
- **K220** · Tooling: K75's `census_fan.mjs` misreads routed joints since
  K81 (it calls `fieldProbe.at` without `px` and `strip`, so it reports
  0.21 where the fans agree to 0.006). Use K169's `census_k81.mjs` or
  K93's `census_k81h.mjs` (`.claude/probes/K93/`); fix or retire it.
- **K218** · In trail mode, a junction cap inside the fade holds a flat p
  over its 0.31 radius, then steps at its edge (pre-existing, mostly
  under the web; `docs/design/K93_K145.md`, Stage 1 handoff).
- **K217** · K93's trail split is placed linearly in ctrl, but the trail
  measures lattice length and the paint is linear in arc, so the fade
  start sits slightly off in arc (pre-existing: the partial oldest span
  does the same), and a fading part narrower than a pixel blends
  sub-pixel at the split (`docs/design/K93_K145.md`, Stage 1 handoff).
- **K216** · The rules split's hand-kept parts: `docs/lore_index.md` and
  each area file's topic list are maintained by hand, and 26 design docs
  still name the area files, one hop from the topic (`docs/design/K173.md`).
- **K214** · `particle_system.ts` and `forces.ts` still attach 30.8 KB of
  lore after the split: all the physics lore is about them, so only
  trimming the text would cut it (`docs/design/K173.md`).
- **K213** · Before K90's bend bound ships (if Levi ships it): the min
  regression (the hard clamp tightens the worst window in 24 of 585
  scans, the soft one in 4; done when `k90_minrows.mjs` reports 0),
  `controlArcLengths`, unit tests and a CPU mirror, hit tests on the
  moved samples, the phone's rebuild cost (`docs/design/K90.md`, Stage
  1b handoff).
- **K212** · PixiJS warns "Attribute aGap/aGapId/aUV is not present in the
  shader" on every load, on master too (seen by K132's probes,
  `.claude/probes/K132/`).
- **K208** · `restoreYarn` keeps its own copy of the travel-direction
  rule; it could share `travelOrder` / `moveEnds` (`src/render/fog_arc.ts`,
  K100).
- **K207** · Fog stamps grow without bound within a solve: the spacing
  filter checks only the last stamp, and `renderFog` redraws every stamp.
  A spatial dedupe fixes both (`src/render/fabric_maze_renderer.ts`;
  `docs/design/K100.md`, Stage 1 handoff).
- **K206** · A restored attempt stamps its fog right after the intro,
  while the threads are still re-settling, so with physics it differs
  from the live fog by an IoU of about 0.96. Option: stamp after the
  first sleep (`docs/design/K100.md`, Stage 1 handoff).
- **K205** · K120's leftovers (`docs/design/K120.md`): the follow camera
  doesn't keep the dot clear of the move pad (a camera inset, K148's and
  K149's area); the maze is small at the phone's fit zoom; a toast at
  411 px wide can briefly overlap the pad; clicking the panel's empty
  area and then pressing an arrow moves in the maze instead of scrolling
  the panel; in principle a hold could loop around a cycle of runs that
  all match its key (not observed). Probe gotcha: alternately tapping and
  holding the best key can cycle forever.
- **K202** · A bare-URL daily left open past midnight with no move
  becomes practice when it is begun the next day (K146: begun after its
  day). An unstarted daily the bare URL opened could roll over to the new
  day instead (`docs/design/K146_K151.md`, "Open").
- **K201** · History's "Played" chip counts any record, practice
  included, so it can exceed the played tile (24 against 21 in K146's
  history probe); a practice row's count ("Practiced K times") shows only
  in its tooltip, which phones lack (`src/ui/daily_stats_view.ts`).
- **K197** · The phone's load settles later over ab6d330..54a2b43
  (K156's round pass of 2026-10-14): first sleep 8.0 -> 19.3 s, and
  over the first 30 s fps 46 -> 41 and p95 33 -> 50 ms, while the
  longest frame fell 684 -> 167 ms. K147's settle budget (b0a1c49..97293e7)
  is in the range and trades frame time for settle time (its own phone
  measure: first sleep about 17.5 s); the likely cause, unconfirmed.
  To attribute: the pass's frames phase with `-Base b0a1c49~1 -Head
  97293e7`; then whether 19 s is acceptable is Levi's call.
- **K190** · Unmeasured costs from K154+K169 (aaa3dda). The new hash
  costs the drifting backgrounds' programs 37-60% more on the desktop
  (vellum-drift 0.352 -> 0.50 ms a frame at 3200x1800; static vellum
  pays nothing); the phone, and the junction fan program during a web
  fade, are unmeasured. Measure at K79's K52 phone gate, vellum-drift
  first. If the phone pays, a cheaper hash needs another shape (three
  multiplies per lane fail the avalanche test) that avoids PCG2D's
  structure (`docs/design/K154_K169.md`, "Stage 1 handoff").
- **K195** · The phone pass's gaps (K156 3c, `docs/design/K156.md`,
  "Stage 3c handoff"): the watchdog's touch trip is untested (it needs a
  person); the noise floor is one 3-rep A/A pass, in landscape, for
  `-Moves 0,7,13` only (rerun A/A when the orientation, the phone or the
  load changes); every phone frame carries a blank white strip at the
  bottom (the screenshot is 387 CSS px high, the page 331); knot-mode
  render ms swings 7.5-20.5 ms in A/A, no use at rest; K80's indicator
  look shows the indicator but never taps it.
- **K196** · K180's crossings options at phone scale: `ride` and `pinch`
  leave most taps unreadable in the census (dense `ride` 93.8%, fabric
  `pinch` 71.1%); `through` reads best (`docs/design/K180.md`, "Stage 1
  handoff"; `.claude/probes/K180/`).
- **K123** · `.claude/probes/K10/phone_bench.mjs` drives the first
  visible `http://localhost:` tab on any port, so it can navigate one of
  Levi's own tabs. Use `.claude/probes/K79/phone/bench.mjs` (ports
  5371-5374 only), or filter by port (K79 stage A's gate, 2026-10-13).
- **K124** · Marker gaps keep their CPU reveal gate, so they still pop
  during the reveal (pre-existing; G2 agent a7d1f998's report,
  2026-10-12 18:43; from the LEDGERS inbox).
- **K125** · Scarborough Fair's loop is 50 beats
  (`src/audio/songs.ts`; K116 found it), not whole 3/4 bars, so a part
  that keeps bars would slip each loop. Grow its closing rest from 2
  beats to 3 before any band part (K116's call 6).
- **K128** · `src/render/marker_mesh.ts:32` declares `in vec2 aUV;`
  but never reads it while the marker geometry carries it, so PixiJS
  warns "Attribute aUV is not present" for each of the three marker
  meshes on every load (K83; found by K81 stage 3a). Read it in the
  shader or drop it from the geometry.
- **K130** · Panel rows with a slider step (`backgroundIntensity`,
  `pulseReach`, ...) snap to Tweakpane's step grid, which starts at the
  row's first value: after a link with an off-grid value, "Reset to
  defaults" can write a wrong default (e.g. intensity 0.48). Existing
  behavior (`src/ui/tweakpane_panel.ts`), found by K79 stage B1,
  2026-10-13. K147's `settleBudget` and `loadSettle` rows are stepped too.
- **K131** · The phone probe kit (`.claude/probes/K79/phone/`,
  untracked): `drift.mjs` and `frames.mjs` take full-size PNG shots,
  10-25 s each over Tailscale (frames took 10 min, drift 8; "10 s"
  windows ran 35-65 s): use JPEG or clipped shots. `bench.mjs`'s
  `thermal()` reads the stale "Cached temperatures" block, not "Current
  temperatures from HAL". Untested: whether the watchdog's 2 s `dumpsys`
  poll and the CDP traffic add to the phone's bursty frame stalls (seen
  with no background too). The phone has no GPU timer, so a tighter
  cost A/B needs many interleaved reps. K79 stage A's gate, 2026-10-13.
  K81's gate kit reads the live HAL block (`.claude/probes/K81/phone/lib.mjs`
  in K81's worktree); K79's `bench.mjs` and `lib.mjs` still read the stale
  one.
- **K11** · Ring + gridAlign: buckles lopsided below strength ~1.8e-3,
  wanders without sleeping at 5e-4..1.6e-3, never sleeps at ga=1.
- **K12** · Star shape, e-w anchors: 6/8 seeds sleep; 2 hover at the
  threshold. Broader per K46's scans at gs 20-24: star fails to sleep on
  4/60 seeds, tree 4/60 and fish 2/60, some with a loud visible thrash
  of about 1 unit per substep. Heart 0/60, ring 0/60, rect 0/400.
  The circle (2026-10-12, gs 18) is clean on its default nw/se anchors
  (7/7) and w/e (6/6), but with n/s anchors 3 of 7 seeds never sleep:
  seeds 1 and 4 thrash at mv 2-6e-2 (about 108 ms of physics per
  frame), and seed 7 holds a standing rider at mv 1e-3. The ring at seed
  7 n/s sleeps. Repro: `?4.c&shp=circle&sa=n&xa=s&am=instant`.
- **K62** · The `branchDensity` and `fourWayFraction` panel rows do
  nothing at the default `junctionSpacing` 2: the same maze for all 150
  seeds tested across 0.25-0.70. They look broken; rescale, relabel or
  hide them. `junctionSpacing` is the real density knob. (K46 finding.)
  K74 refines it: `branchDensity` 0.2-0.6 and `fourWayFraction` 0.4-0.7
  build the identical maze; 0.1, 0 and 0.8 or more change it.
- **K13** · Post-violent-play loud attractor at fat params (the open P3
  problem; fingerprint in `.claude/rules/physics-collision.md`).
- **K14** · Latent seam-window wraps on open chains
  (applyTransversality's window, the slide/project windows,
  updatePassCover's +-12 slots): agent-measured, unfixed.
- **K15** · During a reveal, a joint's fan can turn opaque while a fill
  beside it is still striped (K4 fixes it by construction). May be moot:
  G1 (99443cb) deleted the over-fills. Re-check fan vs base ribbon during
  a reveal.
- **K16** · Physics settle is slow: 100-190 ms/frame at gs 18 on a loaded
  desktop; on the phone 7 sim-seconds took 14 s. K6/K7 fix the UI side.
  It matters more now: the daily (K20) makes the 18x18 default design
  the front door, at about 6 fps for its first seconds on a loaded
  desktop. Every design used to sleep at exactly sim 7.0 s, set by the
  gate rather than the design; since K63 it is about 5.0 (phone: 8.8 s
  wall instead of 13), so settle cost is particles x thread width.
  Thread width costs +25% per substep at 0.58 and +47% at 0.64. Intro
  wall time also stretches with slow settle frames.
- **K65** · Low-gridAlign knots (`ga=0`, e.g. Levi's rect link) creep
  under the quiet threshold: a fresh settle drifts about 1.5 world over
  about 50 s, and a cinch up to about 0.9 world/s. Every sleep gate, old
  or new, freezes them mid-creep. A net-displacement test over the window
  would catch it, but would keep such knots awake for tens of seconds.
  Related: K11. (K63 finding.)
- **K29** · Boxed kinks at tw 0.64: 3 of ~152 kinks (8 seeds) rest at
  0.56-0.78 thread widths of eye hole - boxed in by a fused joint on one
  side and the 1.6 corridor floor on the other, they keep only lattice
  material. A stronger eye pressure (2.6) doesn't lift them; 2.8 left 2/8
  fat seeds awake. See "KINK EYES" in `.claude/rules/physics-kinks.md`. Since K41's chord law they
  rest a little smaller, because the flat law had pried their crossings
  open: five at 0.64-0.74 at tw .64, and X304 (seed 3zz2a1) at 0.78-0.80
  at the default width (was 0.83-0.86). K49 is the size decision. K90's
  census (2026-10-13): the boxed kink in `t64_1471kin` falls to 0.767
  widths after the r 2.5 drags.
- **K30** · Very wide threads (tw >= 0.72) never sleep - standing riders;
  the same counts as before the kink fix (2/4 seeds at 0.72, 0/4 at 0.8).
  After K41, 7/8 seeds sleep at tw .72 (was 4/8). Seed 1q2w3e's kink X360
  cycles material through its crossing at mv about 0.09 (df373b5 did the
  same); turning eye pressure off doesn't stop it. The slider reaches 0.8.
- **K50** · The riders gate measures overlap after the first final
  collision sweep but before the fusion snap, so a resting overlap of up
  to about 0.04 at joints can go unflagged. Measure the end-of-substep
  state instead. (K41 agent idea.)
- **K59** · Two windows that are BOTH visible, with moves interleaved on
  one daily, end with the last writer's attempt winning. A tab adopts a
  newer saved attempt only when it comes into view; adopting on the
  `storage` event would fix it, at the price of rebuilding the other
  window (intro included) on every move.
- **K54** · Background contrast varies with the palette: ember roughly
  halves mist's (luma spread 11.4 -> 6.1). Normalizing the accents'
  brightness would even it out.
- **K51** · Knot-mode braids: where one pass sits between two twist
  twins, the two ratchets still clamp one after the other. K41's
  ratchet-intersection rule could apply there; no failure seen yet.
- **K26** · Plucks at tight loops, seen zoomed in. Only the concave side
  of the swing is capped, so the time exposure leans outward and a loop's
  eye gets a slightly ragged, enlarged rim during the ring. A symmetric
  cap fixed the eye but carved every hook's outer blur into lumps at
  normal zoom, so it was rejected.
- **K27** · Plucks near junctions. Lobes inside a junction's fillet-web
  footprint (about 1 world at cr 3) keep their base intact, so they ring
  as a crisp thread with a halo rather than a blur, as crossing
  footprints already do.
- **K42** · Silhouette-level cyclic overlaps: three ribbons over one
  pixel, each over the next (user link x170/x93 after repeated cinches,
  x134/x135 in one squeezed cinch: chains 1 > 2 > 0 > 1). G1's per-pixel
  protect can't break a cycle; it needs a per-pixel winner. 52-198
  naked px in those captures.
- **K43** · A fused tail riding its host (user link tips 0/1) is still
  sensitive to draw order. Predates G1.
- **K44** · Probe tooling: the gap census stops a crossing's ideal over
  polyline at 0.5 of the neighbor gap where the renderer uses 0.8 (the
  false overcut at user x57), and its totals drift between two captures
  of one frozen state (cause unknown). Same-state pixel diffs are exact.
  Also: `.claude/probes/K19-K20/probe_daily.mjs`'s time-zone mode hung
  once in `browser.close()` after writing its report (not since, in
  three K47 runs). And a 4x CPU-throttled desktop runs about 5x slower
  than the Pixel 11 (68 s vs 14 s to sleep at V1): use it for ratios
  only. And any hold probe
  must first move past the 4 CSS px tug threshold: since df373b5 a still
  press is a pluck, so the KINK EYES battery's holds did nothing (the
  K41 copy in `.claude/probes/K41/` moves 12 px first). And with flow on,
  a kink census of one frozen state varies by about 0.1 widths between
  captures: A/B at `fw=0`, replacing a link's own `fw=` (a second copy
  is ignored). K63 moved where a `phy=0` link's hidden settle stops, so
  a same-state A/B must pair builds on the same side of K63. The fan
  census's per-arm debug views can swap the two bracketing arms where
  their angles tie (f32 on the GPU, f64 on the CPU); the blended field
  agrees there.
- **K69** · String mode (`pv=string`) on pre-G2.3 builds drew a 1-px
  diagonal sliver from the start to the exit marker inside the markers
  Graphics after a few moves (`?b.c&pv=string`, 6 moves; hiding that
  Graphics removes it). G2.3 does not show it, but it was never
  attributed; look again if it comes back (G2 doc section 7, Follow-ups).
  Since K83 (45aac50) that Graphics draws only the win ring; the markers
  are SDF quads.
- **K95** · Below about 340 px wide, the mode badge drops below the
  hamburger and covers the header of an open panel (K73; the fit levels
  are measured in `.claude/rules/gameplay-badge.md`, MODE BADGE).
- **K103** · Below 10 fps the fit camera, the move animation and the paint
  clock still slow down. The fit camera eases by a fixed fraction per
  frame (0.08 / 0.15), and `tickAnim` and the paint read the ticker's
  `deltaMS`, which Pixi caps at 100 ms. K96 (d8b9175) moved only the
  follow camera onto real elapsed time. Making the fit easing time-based
  would change its feel at the refresh rate it was tuned on. The pluck
  overlay too (`tickPlucks(ticker.deltaMS / 1000)`): since K101
  (e9e01ae) a music note's string motion waits lead + latency for its
  scheduled sound, and below 10 fps it trails the sound by (frame /
  100 ms - 1) x that delay, about 0.15 s at 150 ms frames.
- **K106** · A dark spike inside a hook's tight bend while it rings (the
  ribbon's inner corner). Present with the base collapse off, so not
  K77's: `.claude/probes/K77/out/s2r/s2r_hookspike.png`.
- **K107** · A dark "X" at the center of big knot-mode attack-lobe blurs,
  also present with the collapse off:
  `.claude/probes/K77/out/abknot/sheet_zoomL.png`.
- **K112** · Motion setting residuals (K79, 9ffda8a): no cross-tab sync
  (another tab picks a change up on reload; `src/ui/motion.ts`), and the
  camera's reduced-motion jump on an edge-indicator tap was
  code-reviewed, not probed.
- **K133** · Crossed join bridges: 108 plans built before K110 hold two
  join bridges that cross (the two diagonals of one cell), 20 of them
  dailies (#12 #32 #39 #60 #107 #113 #123 #131 #139 #151 #213 #260 #292
  #302 #338 #361 #370 #374 (twice) #380 #391). K110's joins skip such a
  splice; the older join code has no bridge-crossing check. Fixing it
  moves those plans and dailies, which the pre-launch policy allows;
  look first at whether a crossing reads wrong. Found by K110
  (`.claude/probes/K110/verify_run3.txt`).
- **K136** · Tree gs6 1389 with dead ends never sleeps (140 s of sim,
  still moving), on both 7e41a02 and ade3537, so not K110's doing; maybe
  the K13 attractor. The repro was `?12l.IS3ygt`; since K74 stage 1 it is
  `?12l.J&gs=6&shp=tree`, and K74's agent saw it at the new defaults and
  with the old placement too. Evidence:
  `.claude/probes/K110/sheet/results_run1_tree_awake.json`.
- **K142** · The A/B harness's first case in a fresh browser can read
  nonzero: 1 of 11 such runs (K79 B2b's `none_desk`, 274 px, max delta
  46, specks on thread edges). The master frame differed and the camera
  views matched; the cause is not found (a cold server or GPU cache is a
  suspect). Rerun before trusting it; a warm-up case is untested
  (`docs/design/K79.md`, "The 18/19 run").
- **K143** · Vellum's fibers read as long crossing hatching near
  scale 2, the slider's new max (K129). K79 B merged with it (58b77cf);
  a look for the round's phone pass (K156; sheets in
  `.claude/probes/K79/out/view/`).
- **K150** · Probe tooling isn't safe for concurrent agents (seen
  2026-10-13): `scripts/diag_screenshot.mjs` uses one fixed Chrome
  profile and an on-screen window, and `scripts/preview.ps1 -Ref` builds
  into fixed TEMP folders per commit (`src-<sha>`, `<sha>`), so two
  agents probing at once collide. Fix: per-run profiles and folders,
  off-screen windows (claude-config `rules/lessons.md`).
  - 2026-10-13: the coordinator gave K122's and K147's briefs the same
    port (5431); give each agent a disjoint port range. A probe that
    releases and re-takes the perf lock between samples leaves gaps
    another agent's builds can land in (K122 saw one in K81 3d's run).
  - 2026-10-13: `scripts/preview.ps1 -Root <dir>` builds into a per-run
    folder (K156 stage 1, 1f8be97). Callers that omit it still share the
    TEMP folder, and `diag_screenshot.mjs` still uses one fixed profile.
- **K157** · K79 B's color rows on the phone (B3): accent 3's picker
  opens 8 px below the viewport until the panel scrolls, and a second tap
  on a swatch doesn't close Tweakpane's popup (check the older color rows
  too). (`docs/design/K79.md`, "Stage B3 results")
- **K158** · Switching a design to custom colors isn't
  byte-identical: up to 2/255 on 5.3% of a strip (suspected: hex rounding
  of the design's colors). (`docs/design/K79.md`, "Stage B3 results")
- **K159** · K79's probe residuals: the `__knotSetBackgroundParams`
  hook doesn't sanitize its input; B2's sheet script has a first-frame
  wobble; B3's mist A/B got 1 rep of 3. (`.claude/probes/K79/`)
- **K163** · A first-frame hitch after load: two long tasks of about
  1.6 s, likely shader compilation; compile behind the loader instead.
  Found by K147 (`docs/design/K147.md`).
- **K164** · At 4x CPU throttle, rendering alone costs about 76 ms a
  frame, so the intro stays slow there whatever physics does. Found by
  K147 (`docs/design/K147.md`).
- **K165** · Two pre-existing loader bugs: `loadingTick` overwrites the
  HALTED stamp with " | loading", and the physics-off loader's
  `loadWall0` counts hidden-tab time. Found by K147.
- **K166** · K81's render residuals (`docs/design/K81.md`, "Residuals
  to report"): the pluck overlay draws over the gold band; band edge
  cases (a ribbon patch past a non-route arm's cover cap, a fixed-width
  band on a ribbon whose width varies, clipping at non-adjacent routes
  and skipped wedges, caps dropped past MAX_ROUTES and MAX_ARMS); and at
  a tap, setPaint runs a frame ahead of tickPaint.
- **K167** · K81's fan costs a +0.055 ms floor (+0.34 ms, about 9%, at
  15-20 moves); the early-out and the strip trim were deferred
  (`docs/design/K81.md`).
- **K168** · K81's untested ranges: more than 20 routed records,
  zoomed in, and a full web on the phone (the gate walks the cheapest
  route, so a full web was certified on the desktop only and never
  timed). The round's looks can cover some (K156).
- **K170** · `scripts/phone.ps1` sends KEYCODE_WAKEUP, against the
  phone rule (no key events; the phone stays awake on its charger).
  Proposed: no wake by default, a `-Wake` switch to opt in. (K156's
  `retry_quiet.ps1` drops its copy of the block.)
  - K156 3a proposed the same fix, as a `-NoWake` switch.
- **K172** · K156's screenshot sheets have no text labels, and its drift
  looks show drift only inside the intro window. (3c checked the speed-8
  looks on the phone: they show motion, consecutive frames differing by
  8k-190k of 2.16M px.)
- **K175** · K80's UI gaps (5fed5c1): a queued tap has no visual; the
  choice pulses go quiet during a move; the bull glyph is a placeholder
  (K98 has the glyph work); its off-screen indicator ignores
  `finishIndicator` (K84).
- **K176** · K80's entrance-tail trap: after losing a player on the
  entrance tail, the minotaur pauses at that tail's junction and catches
  them about 3 s later (`.claude/probes/K80/rt/results.md`).
- **K177** · K80 checks not run yet: the indicator on a phone, fog at
  `minoFog=always`, waiting out a non-instant intro, and frame time (the
  round's phone pass takes the phone ones). Chases are not saved or
  replayable: `replayChase` exists, and the dailies stay turn-based.
- **K178** · Since K122, the private-cache vite wrappers of K19-K20, K79
  and K99 (and K104's, after its rebase) fail with ERR_MODULE_NOT_FOUND.
  K80's wrapper (`.claude/probes/K80/rt/vite.private-cache.config.ts`)
  loads the config with `loadConfigFromFile` and works
  (`.claude/rules/probes.md`).
- **K181** · K104's residuals (`docs/design/K104.md`, "Stage 1b
  handoff"): the phone "can't tell" share stays 26% in fabric and 41% in
  dense; W deepens the raw collapse (+12% at pluckSize 1.75, +7% at 3);
  sound-only taps in junction cores, and taps bound by hide zones, can
  show only through a cue; the cue constants are unreviewed.
  - K104 stage 1c (`docs/design/K104.md`, "Stage 1c handoff"): G1's soft
    edge shows the under ribbon inside casing + CUT_BIAS at fabric and
    dense crossings of about 80-90 degrees, and still plucks brighten
    it; the census's outlier knot c3@523.23 (+2.87 px).
- **K188** · K140's residuals (`docs/design/K140.md`, "Stage 1 handoff"):
  `restartSolve()` leaves pieces in the air; the open desktop panel covers
  the spray when the exit is at the lower right; the rain takes 5.5-6.2 s
  to fall out, longer below 10 fps.
- **K189** · Fabric mode's `sceneAnimating()` is always true, so K24's
  ticker stop never fires in fabric: about 10 ms of JS a frame at 1x CPU,
  64 ms at 4x (K140's measurement, `docs/design/K140.md`).

## Approved, to schedule (2026-10-11)

- **K22** · Dynamic resolution scaler (2x up to 3x when frame time
  allows; down when struggling). Part of K6, refined after G3.
- **K23** · GPU particles (G2.4), GPU fog-of-war accumulation, the yarn as
  a gap-masked ribbon (G3-5).
- **K24** · Render on demand when the scene is fully static (battery);
  part of K6. An animated background (K21) must not defeat it.

## Ideas (not scheduled)

Offers from 2026-10-10 that Levi hasn't answered yet (filed from the
audit inbox; the first-tap sound offer is done, 82b6b6b).

- **K32** · Bigger tap targets for maze choices on touch screens; choices
  are tight at full-maze zoom on a small phone.
- **K33** · A share button that opens the phone's native share sheet with
  the link (the link holds the whole design). The daily's result share
  shipped with K20 (win banner and stats view); a general "share this
  design" button is what remains.
- **K34** · The settings panel as a bottom sheet in portrait on phones.
- **K35** · A short vibration on pluck (Android only; `navigator.vibrate`).
- **K36** · Add to home screen: a web app manifest and icons. Blocked on
  icon art (Levi has the prompt for another model). The same art fixes
  the `/favicon.ico` 404 on every load.
  - K122 found the Vite template's leftovers: `public/favicon.svg` (the
    Vite logo, shipped but never referenced), `public/icons.svg` and
    `src/assets/hero.png` (unreferenced). Delete them, or wire up the
    real favicon.
- **K37** · Fog-of-war edge wobble: stronger, or a slider (Stage 25b wobbles
  about 14 screen px).
- **K38** · Focus fade: softer, longer gap fades near the player's dot
  (depth-of-field feel), prototyped with a strength slider.
- **K39** · A manual battery/quality toggle for phones (fewer intro
  particles, lower resolution); may fold into K22's automatic scaler.
- **K60** · The panel's Daily button always opens today's daily. After
  leaving an older day, the way back is its stats-history row or
  `?daily=N`; the button could name the day you left.
- **K55** · An optional parallax background mode: it pans and zooms at a
  fraction of the camera, for depth. Today it is screen-fixed on
  purpose. (K21 agent idea.)
- **K66** · Why do bridges at joints, open tails and kink neighborhoods
  end the settle ramp near an unstable point? They snap to a new rest
  3.5-5 s in, mostly under the quiet threshold, which is what forces
  K63's 2.5 s window. Fixing it could make a 0.75 s window safe (K64).
  (K63 agent idea; harness in `.claude/probes/K63/`.)
- **K84** · After the churn: a pass over EVERY param (Levi, 2026-10-13).
  - Classify each as a viewer preference (localStorage) or a design param
    (the link).
  - Move the preferences into their own panel section.
  - Re-evaluate each param's worth and grouping, and audit names and
    tooltips.
  - Place K73's two viewer preferences, `finishIndicator` and
    `tapToPan` (localStorage, panel checkboxes), and K79's Motion
    setting (`knotmaze.motion`, today in Motion & intro).

  It meets K57 (the daily's exempt keys are mostly preferences) and
  feeds K78's param reference.
- **K85** · Replay links (Levi, 2026-10-13): record a playthrough, put it
  in a link, and replay it with the path animating. The link works for a
  finished session (watch) or an in-progress one (pick up where it left
  off). Builds on K47: an attempt already IS its tap list plus a
  walk-graph fingerprint, and choice indices encode in a few bits per
  move. A link needs the design token, the taps, and per-move timing for
  a faithful replay. The share link stays as it is.
- **K91** · A shorter quiet window for physics-off loads. They never wake,
  so a freeze 1-4 px short of rest can't snap later, and their hidden
  settle would drop from 5.0 sim-s back toward 3.25. The cost: for about
  4% of designs, the layout differs by 1-4 px from physics-on, which
  K57's exempt physics toggle assumes is the same. (K64 follow-up.)
- **K88** · Validate K74's difficulty measures (greedy walks, route
  turns, decision counts) against real daily solves: moves, backtracks
  and time. Only local results exist today. (K74 idea.)
- **K89** · Fisher-style pacing: loops in series with mid-maze
  bottlenecks, then a calm home stretch. Needs strand cuts and its own
  prototype (`docs/design/K74_maze_design.md`). (K74 idea.)
- **K82** · Manually override the daily maze for a given day (Levi,
  2026-10-12; "could be a follow-up thing"). It fits the pinned-daily
  model as a frozen per-day override table beside the versioned
  definitions. A published day's override must never change, like a
  definition (`.claude/rules/gameplay-daily.md`, daily rule 1).
- **K68** · If junction-web edges look soft at deep zoom, size the arm
  material strip rows from the camera's world-per-pixel (re-packed on
  zoom) instead of raising the 64-texel width for everyone. About 4x the
  default zoom puts a cr 3 median strip step near 1.5 CSS px. (K4 agent
  idea.)
- **K70** · A more dramatic hero settle (P2 polish): the splines round
  the lattice corners from the first frame, so the settle reads as a
  gentle tightening, not zigzags turning into curves. Blend the sampled
  positions toward the control polyline while settle progress is low
  (`docs/history.md`, Follow-ups).
- **K71** · Wobbly threads at slack ~0 (P2 polish): small waviness along
  runs and rope-tight twist chains at the taut end. Candidate knobs:
  constraint iterations, pullOnly bending, repulsion/structural balance
  (`docs/history.md`, Follow-ups).
- **K72** · Twist-eye openness as a user param instead of a constant
  (MIN_PASS_SEPARATION is the main compactness lever; P3.17,
  `docs/history.md`).
- **K97** · Promote K49's `kinkCensusPage` (`.claude/probes/K49/lib.mjs`,
  an in-page port of K41's kink census, within 0.009 of the node
  harness) to tracked `scripts/` for same-state browser A/Bs of eye size.
- **K102** · `src/audio/songs.ts` holds one song (Scarborough Fair): a
  small library of public-domain tunes would serve K80's melody path and
  a song per day (K80 doc section 3).
- **K113** · Two-layer vellum: render the fibers and grain once into a
  static texture (1 texel per CSS px) and drift only the mottling in a
  low-res pass; the drift pass costs about 2.1 ms at 1600x900 today
  (K79, `.claude/probes/K79/out/gpu_k79.log`).
- **K118** · Native mobile apps, eventually (Levi, 2026-10-13): not
  before everything else is iterated and finished. The mobile web app
  stays alongside them.
- **K119** · i18n, at the end (Levi, 2026-10-13): there is little
  text, and an LLM will drive the translations and other i18n work. The
  strings are mostly in `src/ui/` and `src/game/share_text.ts`; text
  drawn as threads is K115's question.
- **K126** · The K21 background breathes with the band's bass, gated
  by the Motion setting, once K116's accompaniment exists
  (`docs/design/K116_instruments.md`).
- **K134** · Forbid equal start and exit anchors in the panel: they
  cause most of K110's exit re-picks and rect moves.
- **K135** · Keep the start/exit pair when a join reaches the other
  flank of an untrimmed cut: 98 tiny designs (gs 2-4) got a longer
  optimal under K110, typically 4.563 -> 5.270.
- **K141** · K80 section 4's costlier mechanisms, deferred (Levi,
  2026-10-13 about 15:30: "Let's defer those M-L or L items."): 4.8
  sentries (call 9's "validated sentries"), 4.22 two-player (M
  hot-seat, L networked), 4.25 over-under swap
  (`docs/design/K80_gameplay_additions.md`). The M ones are K138.
- **K153** · Licenses page extras (K122's ideas): list the packages in
  the dev server too (it shows a placeholder; the module graph has the
  list), and a diffable `licenses.txt` beside the page.
- **K160** · The background speed slider is linear over 0-8 (about
  0.09 a pixel); a curve like gridAlign's (`src/ui/grid_align_curve.ts`)
  would give the slow end room. At 8x the 10-15 Hz texture pass may look
  steppy (not checked on the phone); if it does, scale the re-render rate
  with the speed. A look for the round's phone pass (K156).
- **K179** · K80 ideas: reversing mid-run in the real-time mode; a
  roaming bias toward the player, so fewer games pass without meeting the
  minotaur (K174).
- **K182** · K104 ideas: G1's exact mask for moving plucks too (today
  only still plucks use it), the curvature-aware clip as its fallback;
  check the still strip's concave-side clamp.
- **K57** · Confirm the daily's exempt settings: the ones a player may
  change without leaving the daily (`DAILY_EXEMPT_KEYS` in
  `src/ui/daily_link.ts`, persisted across dailies). Parked for the
  late-stage review with K46 and K84 (Levi, 2026-10-14 about 00:22,
  `docs/design/levi_notes_2026-10-14.md` item 13: "Let's review this
  list later, after all the other gameplay and system churn, when we're
  doing all the other late-stage wrap-up stuff.").
  - Levi's list: volume, soundMode, cameraMode, showStats, panel
    open/close/scroll.
  - The agent added: the rest of the Sound folder (pitchSpace, octaves,
    rootNote, tonicEmphasis, soundSpeed, reverb, brightness, sustain,
    shimmer, pickPosition), Touch & feel (pluckSize, pluckGhost,
    pluckReach, pluckStyle, tugLimit, snapBack), and physics on/off (the
    settled layout is the same).
  - Everything else leaves the daily, including moveSpeed, pathViz, fog,
    the intro and flow, and the physics tuning. K79's `backgroundSpeed`
    is not exempt either, like background and its intensity.
  - Exempt since: K140's confetti on/off and amount (`cf`, `cfa`), and K147's `settleBudget` and `loadSettle` (K162 (3) asks whether they stay); K180 adds its pluck params. Proposed: K145's hover glow
    strength.
- **K117** · Repo visibility (Levi's notes, 2026-10-13;
  `docs/design/levi_notes_2026-10-13.md`). Levi: private later, on his
  word; he won't share it for a while. Done in a756ca5: the panel's
  GitHub link is gone, `LICENSE` says all rights reserved (Snoring Cat
  LLC. holds them: 7a63ec4, Levi 2026-10-13), package.json
  says UNLICENSED, and a push touching only the ledger, docs, `.claude/`,
  README or LICENSE skips the deploy (Actions minutes count against the
  plan once private; deploys used about 330 minutes in the last 7 days,
  and the free plan has 2,000 a month). Obfuscating the bundle: not worth
  it (answered 2026-10-13; it is minified and ships no sourcemaps). K122
  (the bundled packages' license notices) is needed either way. On his
  word: `gh repo edit --visibility private
  --accept-visibility-change-consequences` (reversible; hides the code,
  history, docs and this ledger from then on, not copies already made;
  the Pages deploy keeps working).
  - Parked until near launch (Levi, 2026-10-14 about 00:22, item 11:
    "wait until we're closer to done to save on CI churn cost.").
- **K187** · K155's History rows explain their stars only on hover, which
  phones lack; add a tap to explain (`docs/design/K155.md`, "Stage 1
  handoff").
- **K199** · A follow camera that holds a panned-away view: today it has
  no pan clamp and returns to the head 2.2 s after a gesture (K148's
  handoff). A new decision for Levi, not a fix.
- **K204** · A key press that matches nothing or ties gives no feedback
  (K120; in its census presses match nothing 1.9% of the time and tie
  9.4%): maybe a nudge or a toast.
- **K209** · Fog of war on dailies? Off today; since K132 a daily is
  today's defaults, so turning it on is a default change or a daily
  override. A call for Levi whenever he wants it (raised by K100).
- **K211** · Drop the retired `snappiness` from `CODEC_PARAMS` at the
  next codec version bump; removing it now would bump the version (K132).
- **K215** · Move the per-feature probe recipes (K73, K79 B, K80, K104,
  K140, K146 + K151, K147, K100) out of `probes.md` (15.5k chars, attached
  by every script or probe read) into narrow files (K173).

## Done

- **K93** · Trail fade and hover reach (Levi, 2026-10-13: "Trail fade,
  yes; Hover vs pulseReach, hover should stop at pulseReach (and
  fade-out toward the end, same as pulseReach)"). The trail piece that
  holds the fade start splits in two (`src/render/trail_paint.ts`,
  `buildTrail`): solid gold out to the fade start, then the fade. The
  choice hover stops at `pulseReach` and fades over its end in every
  path mode (kPulseV's `kReachWin`, mirrored in `paint_math.ts`).
  Handoff `docs/design/K93_K145.md` ("Stage 1 handoff"); probes and the
  sheets sent to Levi in `.claude/probes/K93/`; follow-ups K217-K220;
  stage 2 is K145. Done in 82ca7d9..ed8f284 (2026-10-14).
- **K173** · Split the `.claude/rules/` lore by topic (Levi, 2026-10-14
  about 07:53: "Splitting the rules files seems worthwhile."). 32 new
  topic files with narrow `paths:` lists; the area files keep the general
  lore. Passages moved verbatim by a re-runnable script
  (`scripts/split_rules.mjs`), indexed in `docs/lore_index.md`. Lore
  attached per read: median 37.3 KB before, 5.8 after. Brief and handoff
  `docs/design/K173.md`, probes `.claude/probes/K173/`; follow-ups K214
  and K216, idea K215. Done in 62e7d5b..1fe468d (2026-10-14).
- **K132** · Drop link and daily back-compat (Levi, 2026-10-13; CLAUDE.md
  "Pre-launch: no back-compat"). One live codec table (`CODEC_PARAMS`,
  still version 4, defaults from `PARAM_DEFAULTS`): an all-default design
  writes `?<seed>`, a token of another version reads as its seed at
  today's defaults with one warning, `?daily=<n>.<x>` opens day n, and a
  daily is today's defaults on the day's seed (`DAILY_DEF` 2). Removed:
  CODEC_V1-V4, the delta blobs, `LEGACY_BASE`, `mc` / `trm` and
  DAILY_V1. Every short key still works after a token, pinned with the
  links sent to Levi (`?7.J` now rewrites to `?7`). No pin moved: DAILY_V1
  differed from today's defaults only in trailLength (render-only). Brief
  and handoff `docs/design/K132.md`, probes `.claude/probes/K132/`;
  follow-ups K210-K212. Done in 402eb4b (2026-10-14).
- **K100** · The fog of war resets on a restart only (Levi, 2026-10-13).
  The controller counts restarts and the renderer clears the stamps when
  the count moves; walking back, a daily's Reset path and a K80 catch
  keep the fog (a catch used to clear it, against the K80 lore). A
  restore re-explores every tap in travel direction, as live play does
  (exact on a static daily; IoU 0.977 with physics). After a backtrack
  the fog-fit camera keeps framing the explored area. Brief and handoff
  `docs/design/K100.md`, probes `.claude/probes/K100/`; follow-ups
  K206-K209. Done in 458e1e5 (2026-10-14).
- **K61** · `encodeDelta` (the old `?daily=N.<delta>` writer), used only
  by tests. Done in 402eb4b (2026-10-14): K132 removed it and the delta
  reader.
- **K203** · K120's calls (`docs/design/K120.md`): the move pad on by
  default on coarse pointers, bottom right at 132 px, the 15 deg tie rule
  and the 200 ms hold, confirmed by Levi ("ok", 2026-10-14 about 07:53).
  Nothing to change (K120 merged in 0acbce0).
- **K200** · K146 + K151's calls (`docs/design/K146_K151.md`): (1) free
  play's X always shows, on the desktop too; (2) the practice banner and
  share text, the daily badge's tap, the labels' daily numbers,
  History's rows and v2's late results, confirmed by Levi ("ok",
  2026-10-14 about 07:53). Done in 7950c7f (2026-10-14).
(items move here with the commit that resolved them)

- **K120** · Faster, smoother input (Levi, 2026-10-13): hold an arrow
  key to keep advancing, taking the branch that matches the key at each
  junction, and a quick control on phones.
  - Done in ba8b198..0acbce0 (2026-10-14): arrow keys and WASD move by
    direction (`src/ui/key_moves.ts`: a key matches a run within 70 deg,
    runs within 15 deg of each other tie, a hold goes on 200 ms after each
    arrival; thresholds from a census of 4259 junctions) and the move pad
    (`src/ui/move_pad.ts`: bottom right, 132 px, on for coarse pointers,
    a panel row). 674 tests at the merge; the key and pad probes all
    pass, and `pad.mjs indicator` 4/4 and `keys.mjs guards` 11/11 again
    on the merged code. Probes `.claude/probes/K120/` (`out/`,
    `census_report.txt`); worktree
    `.claude/worktrees/agent-a320fe823ac44486d` kept. Calls: K203; idea:
    K204; residuals: K205.
- **K146** · Past dailies, playable without credit (Levi, 2026-10-13
  about 16:15 and 16:25: "There should be some way to play previous
  dailys, but not get credit for them." / "Stats view is enough of a way
  in."). One agent with K151.
  - Done in df8929c..b9cf882 (2026-10-14): daily store v3 (an attempt
    begun after its day finishes as practice, outside every aggregate);
    History lists every past daily, unplayed ones included (month
    headers, All / Played / Not played chips past 10 rows); a practice
    finish has its own banner and share title. 642 tests at the merge;
    the free, daily, practice and history probes all OK, each also at
    phone size. Probes `.claude/probes/K146_K151/` (`shots/`); worktree
    `.claude/worktrees/agent-acbc2283475ab72df` kept. Calls: K200;
    residuals: K201, K202.
- **K151** · The mode badge (Levi, 2026-10-13 about 16:30, verbatim in
  `docs/design/levi_notes_2026-10-13.md`).
  - Done in df8929c..b9cf882 (2026-10-14, with K146): one badge always
    shows (`src/ui/mode_badge.ts`: Free play, Daily #N, replay,
    practice), the HUD's title row is gone, and free play's X fades in on
    hover and always shows on coarse pointers (`MODE_BADGE_X_ON_COARSE`).
    Calls: K200.
- **K148** · An off-screen indicator for the player (Levi, 2026-10-13
  about 16:25: "When panning away from the current position, we should
  also show an offscreen indicator for it."). One agent with K149.
  - Done in 2afca1d..fcc402b (2026-10-14): the head is K73's third
    indicator client (`src/ui/head_indicator.ts`; K83's head glyph; a tap
    returns the camera to the head), and indicator glyph dots no longer
    inherit the icon's stroke (the head's dot and the minotaur's eyes had
    been white blobs). 625 tests; page probes fit 22/22, follow 13/13,
    slack 9/9, solve 7/7, fog 5/5, phone and pinch included. Probes
    `.claude/probes/K148_K149/` (`out/*.png`); worktree
    `.claude/worktrees/agent-a9228d5ef5178136e` kept. Calls: K198; idea:
    K199.
- **K149** · Room to pan the maze partly off screen at the fit zoom
  (Levi, 2026-10-13 about 16:25).
  - Done in 2afca1d..fcc402b (2026-10-14, with K148):
    `src/ui/view_clamp.ts` (`PAN_SLACK`, 0.3 of the screen per side at
    every zoom); a reset from a slack-panned view eases instead of
    snapping. Calls: K198 (the phone's open panel).
- **K180** · K104's tuning calls as params, so Levi can try them by
  playing: pluckWhole (`pw`, 0-1.5, default 0.5), pluckCrossings (`pcx`:
  through | ride | pinch) and pluckGlow (`pgl`: off | instead | with |
  fallback); codec v4 appends 101-103, daily-exempt.
  - Done in 048e06c..0250564 (2026-10-14): 0 px against master at the
    defaults in 8 A/B cases; 605 tests. Probes `.claude/probes/K180/`
    (sheets `sheet/sheet_desktop.png`, `sheet_phone.png`); worktree
    `.claude/worktrees/agent-a5a195592e9da8700` kept. Calls: K194;
    residual: K196.
- **K192** · Probes that pin `paintClock` saw K169's gold web at fade
  level 0. Done in 81d31a5 (`scripts/phone_pass/walk.mjs` `pinAll()` sets
  `webFade.seconds = 0`; K81's untracked kits `g2lib.mjs`, `k83_ab.mjs`
  and `phone/k81phone.mjs` got the same line).
- **K154** · Our own hash in place of PCG2D, whose credit goes (Levi,
  2026-10-14 about 00:22, `docs/design/levi_notes_2026-10-14.md` item 10:
  "a, yes. b, swap in our own. c, none."): the Perlin and Scarborough Fair
  credits stay, and no technique gets a line. One agent with K169.
  - Done in 64d3296..aaa3dda (2026-10-14): `src/render/hash2d.ts` (a
    multiply-add per lane, then three multiply and xorshift rounds, its
    constants from a seeded search) replaces PCG2D, and the `pcg2d-hash`
    credit is gone. Avalanche, uniformity, lag, bijection and spectral
    tests in `test/render/hash2d.test.ts`; GPU parity 0 of 524288 words
    off; 598 tests. Desktop cost: the drifting backgrounds' programs
    +37-60% (K190). Probes in `.claude/probes/K154_K169/`
    (`out/sheets/sheet_bare.png`); worktree
    `.claude/worktrees/agent-a6caa78542c463088` kept.
- **K169** · Fade K127's gold web in over about 0.25 s instead of
  turning it gold in one frame (Levi, 2026-10-14 about 00:22,
  `docs/design/levi_notes_2026-10-14.md` item 9: "Fade.";
  `docs/design/K81.md`, "Stage 3d results"). One agent with K154.
  - Done in 64d3296..aaa3dda (2026-10-14): `src/render/web_fade.ts`, a
    0.25 s smoothstep from the untraveled base to the gold one (written
    into the junction record, no fillet rebuild); from 0.25 s on, 0 px
    against K127. Its two calls: K191; probes that pin `paintClock`:
    K192. Sheets: `.claude/probes/K154_K169/out/fade_zoom_desk.png` and
    `fade_zoom_phone.png`. Play: https://levi.dev/knotmaze/?7.J
- **K140** · Finish confetti (Levi, 2026-10-13 about 15:35, verbatim
  in `docs/design/levi_notes_2026-10-13.md`): a gratuitous confetti rain
  from the top of the screen when you finish the maze, and a smaller
  spray from around the finish spot, on every finish. Render-only: no
  physics wake, and the frame loop runs only while pieces live
  (`sceneAnimating()` in `src/main.ts`; K24). With the Motion setting
  reduced (`src/ui/motion.ts`), a small burst or none. Params: on/off
  and amount, proposed daily-exempt (K57). The phone gate checks fps
  during the effect. Small; Opus. After K80's real-time mode.
  - Done in 99b7161..bb55c9a (2026-10-14; deployed with ca7d3e6): a rain
    from the top plus a spray from the finish, render-only; `cf` and
    `cfa` at codec 99-100, daily-exempt; 574 tests. Desktop frame cost
    within noise (amount 1: 9.71 ms of JS a frame, master 9.79); the
    phone's fps goes to the round pass (K156). Probes in
    `.claude/probes/K140/`; worktree
    `.claude/worktrees/agent-a0b46db1354c23e20` kept. Levi's calls: K186;
    residuals: K188 and K189. Play: https://levi.dev/knotmaze/?7.J
    (`&cfa=3` for the most, `&cf=0` for none).
- **K155** · A star rating for each finish (Levi, 2026-10-13 about
  18:06, verbatim in `docs/design/levi_notes_2026-10-13.md`): stars from
  the run's time, backtracking, efficiency or a mode's own metric, with a
  phone-friendly explanation of where they come from; efficiency alone
  is likely clearest for the default solve. Proposed: three stars, with
  thresholds from simulated solvers (K74's greedy solver's median is
  3.12x the shortest route); K80's mode rates its catches; shown on the
  win banner and in the daily stats, explained on tap (phones have no
  hover), and in the daily share text (K20; Levi, 2026-10-13 about 21:15:
  "Stars appearing in the share text makes sense."). With K140 (the same
  finish screen).
  - Done in 18c9a2e..edfb65f (2026-10-14): stars from the distance walked
    over the shortest route: three at 1.5x or less and never caught, two
    at 4x or less, one for any finish. 551 tests. Probes in
    `.claude/probes/K155/`; worktree
    `.claude/worktrees/agent-aa916ee7fa628963f` kept. Levi's calls: K184;
    the History rows' hover-only explanation: K187.
- **K104** · Plucks you can see at a glance (Levi, 2026-10-13: "Even
  maxing pluckSize to 3, I can't tell when some segments are plucked"):
  a set-amount vibration of the whole plucked segment with today's local
  lobes on top (he likes the locality); a gentler collapse than
  `COLLAPSE_ROUND`'s 1 h ("better, but still a bit too acute"; K77's
  A/B: 0.5 h left shoulders, 2 h erased most of the thinning); its own
  reduced-motion version (K79's Motion setting). K105 folds in (goal 4).
  - Done in 5d672ec (2026-10-14): stage 1c merged as c3dbe0c..5d672ec on
    788bd85 (539 tests). Probes in `.claude/probes/K104/` (3595 files);
    worktree `.claude/worktrees/agent-a33278775816855b8` kept for
    follow-ups. The tuning calls went to K180 (with the `k79_motion.mjs`
    checks), the still pluck's cold-link stall to K185, its residuals to
    K181.
- **K183** · The phone was asleep and locked at 23:14 (2026-10-13). K156
  3c and the round's phone pass wait for Levi to unlock it and leave it
  awake on its charger; the coordinator never wakes or unlocks it.
  - Done 2026-10-14: Levi left the phone awake and unlocked on its
    charger; read-only checks found it ready at 00:44 and 00:47
    (`.claude/probes/K183/phone_wait.log`), and K156 3c launched at about
    00:56.
- **K152** · Leaner verification (proposed 2026-10-13, when Levi asked
  which careful testing could be deferred or combined): (1) one scripted
  phone pass per merge round instead of a gate per feature (K156); (2)
  small UI items (K140, K146, K148, K149, K151) get unit tests and a
  screenshot, no perf lock, phone or sleep sweep, and K148, K149 and K151
  share one agent; (3) render prototypes skip the CPU mirror and parity
  tests until Levi picks a look, and the merge stage adds them; (4) the
  pins and goldens, sleep checks for physics and generation, and parity
  for the GPU pipeline stay. Levi approved (1) on 2026-10-13 at 17:56
  ("sgtm"), and (2) and (3) on 2026-10-14 at about 00:22 ("Yes to
  both.", `docs/design/levi_notes_2026-10-14.md` item 4); the Next intro
  carries them. Decided 2026-10-14 (no code).
- **K171** · The phone pass's retry never wakes or unlocks the phone
  (`retry_quiet.ps1`, K156 3a), so with the phone asleep or off its
  charger the retry exits 3 and the pass stops. Accept that (a person
  restarts it), or should a pass wait for one?
  - Dropped: folded into K156 3c, which builds a read-only wait for the
    phone (Levi chose (b), a pass that waits, 2026-10-14 about 00:22,
    item 5).
- **K81** · The traveled highlight at junctions: a smooth gold arc from
  the arrival arm to the departure arm instead of the angular blend's flat
  nub (`src/render/junction_routes.ts`), and K127's fully traveled web.
  Checks: same-state A/Bs (only full webs change; a full web matches
  master outside its bands, 0 px in 10 of 11), the GPU against its CPU
  mirror (max 0), the fan's cost (+0.055 ms floor, +0.34 ms or about 9%
  at 15-20 moves), and 504 tests on master. Its phone gate stopped twice
  (a home swipe, then a power-button press); the round's phone pass
  (K156) takes over its frame check and looks. At j62, where two routes
  share an arm, the band's shade differs from master by up to 19, by
  design. Record: `docs/design/K81.md`; probes in `.claude/probes/K81/`.
  Residuals K166-K168, Levi's call K169. Done in 3c8433a (2026-10-13).
- **K127** · Fill a web with gold when every arm is traveled (K81's
  decision 4): built in K81's stage 3d. Done in 5d3170d (2026-10-13), with
  K81 (3c8433a).
- **K147** · A smooth intro on load. The first settle's catch-up spiral
  (each slow frame asked for more substeps on the next) is gone: a
  per-frame physics budget (`src/physics/settle_budget.ts`) holds from
  the first visible frame to the first sleep, and the hidden pre-settle
  runs in chunks behind the loader. Params `settleBudget` (`stb`, 12 ms,
  0 = off) and `loadSettle` (`lds`, 0.45 s; its max, 5, settles first),
  codec v4 indices 82-83, daily-exempt; `VisibleClock` caps; the
  `window.__knotSettle()` hook. On the desktop: intro p95 159 -> 31 ms
  (719 -> 159 ms at 4x CPU throttle), the knot on screen at 2.6 s instead
  of 4.3 s, and the first sleep later (11.6 -> 21 s; at 4x, 40 -> about
  100 s). Fixed in passing: `root.visible` after an interrupted
  physics-off load. Its phone probe (`phone_k147.mjs`) was written, not
  run; the round pass's load scenario covers it (K156). Levi's calls
  K162; residuals K163-K165; its two stepped panel rows join K130.
  Record: `docs/design/K147.md`; probes in `.claude/probes/K147/`. Done in
  97293e7 (2026-10-13).
- **K122** · Third-party license notices (K117): the build emits
  `licenses.html` ("Credits and licenses") from the packages the bundle
  really contains, the panel's credit line links to it ("Licenses"), and
  the build and `npm test` fail on a package with no license text or
  outside `ALLOWED_LICENSES`. Hand-written credits, V8's BSD notice for
  `hypot2` among them, live in `notices/credits.ts`; Levi's calls on them
  are K154. Live: https://levi.dev/knotmaze/licenses.html redirects (308)
  to `/knotmaze/licenses` (200, with the V8 credit). The panel link and
  the page get a look in the round's phone pass (K156). Record:
  `docs/design/K122.md`, `.claude/rules/notices.md`; probes in
  `.claude/probes/K122/`. Done in f0ef0e4 (2026-10-13).

- **K79** · Backgrounds: speed, params, colors, Motion. Stage A
  (9ffda8a, 2026-10-13 07:15): `backgroundSpeed` (codec v4 index 70,
  `bgs=`; -1 = auto, each effect's pre-K79 pace; 0 = static), vellum
  drift through its own lazily built program, and the Motion setting
  (`src/ui/motion.ts`, K53). Stage B: per-effect params and custom colors
  as ten codec v4 appends at 72-81 (`bgsz`, `bgdt`, `bgfb`, `bggr`,
  `bgan`, `bgcm`, `bgc0`-`bgc3`), and the speed's max 3 -> 8 (Levi, about
  16:30: "Max backgroundSpeed should be like x8"; `BACKGROUND_SPEED_MAX`,
  larger link values clamp). The all-default token stays `.J`. Checks:
  tsc, 421 tests, the A/B 19/19 at 0 px, the motion, smoke and speed-8
  probes, and B3's phone gate (59.5-60.5 fps; the -x programs cost at
  most 0.28 ms a frame). Record: `docs/design/K79.md`; probes in
  `.claude/probes/K79/` (`_b` suffixes on the stage B copies that
  clashed). Residuals K157-K159, idea K160. Done in 58b77cf (2026-10-13).
- **K110** · Join every piece of the maze to the start (Levi,
  2026-10-13). One join per unreachable piece (a splice or a merge;
  splices whose bridge would cross another are skipped), else the exit
  moves to the next-nearest edge. Over 3780 designs, 331 had unreachable
  pieces and 0 do now (210 joined, 121 exits moved); no daily and no
  default-anchor rect moved, and every other plan is byte-identical. The
  K87 pin is re-frozen and its commit names the moved designs. Probes
  copied to `.claude/probes/K110/`; worktree
  `.claude/worktrees/agent-aaf7c3f05e4b74d9c` kept. Done in b9038c7
  (2026-10-13).
- **K129** · K79 stage B's two calls (Levi, 2026-10-13: "For color
  defaults, sure. For vellum scale, whatever is best."): the custom
  colors keep their proposed defaults (base #151b28; accents #7ab8cd,
  #cdb17a, #aa7acd). Vellum keeps its fiber floor (shrinking the fibers
  would alias), and the scale's max drops from 3 to 2: at 3 the wash and
  contours are nearly empty and the fibers read as long hatching (sheets
  in `.claude/probes/K79/out/view/`). Done in 281b22b and b2ccfaf
  (2026-10-13), with K79 stage B (58b77cf).
- **K121** · The player's disc hides the start of each move pulse
  (K98's call 4). Dropped: Levi keeps it as is (2026-10-13: "This is fine
  as-is.").
- **K86** · Long dead ends (Levi: "ensure longer dead end paths with
  no junctions"). Dropped: folded into K74 stage 1 (Levi's decision 5,
  2026-10-13).
- **K105** · Scale a pluck's sympathetic lobes from the tapped lobe's
  capped amplitude (K77 finding). Dropped: folded into K104 (its goal 4),
  2026-10-13; done in f883c75 on K104's branch, landing with K104's
  merge.
- **K49** · Kink eye size: Levi kept 2.6 widths (2026-10-13) over 2.8,
  which opened every eye but widened the whole population instead of
  closing the tail (`.claude/probes/K49/`). Decided 2026-10-13, no
  change; the 2.8 one-liner stays on branch
  `worktree-agent-ac664e8a9e271757a` (4fa22e2), its worktree removed.
- **K52** · Default background: Levi kept `vellum` (2026-10-13), still
  static at auto speed. Decided 2026-10-13, no change. Vellum's drift,
  when on, costs 2.1 ms per pass (0.35 ms per 60 Hz frame) on the
  desktop at 3200x1800 (K79 B2b); its phone cost comes from K79's B3
  gate.
- **K94** · The mouse wheel still zooms on Levi's hardware
  (2026-10-13), so the fractional-delta test in `src/main.ts` stays.
  Decided 2026-10-13, no change.
- **K109** · Every maze has a route from the start to the exit. Small
  shaped designs could be built without one (K108's snapshot: 29 of
  3355 plans, optimal length Infinity): the exit's cut also split the
  entrance's loop into two arcs that nothing joined. A piece model
  (`planTailsJoined`) predicts the walk graph's verdict before surgery;
  a plan whose tails meet is kept byte-identical (every daily and every
  solvable link), any other is rebuilt with `repairTailRoute` after
  spanning. 1110 designs: model = walk graph on all, 0 solvable plans
  moved, 20/20 repaired with one splice. Test:
  `test/core/maze_solvable.test.ts`. Done in b722a12 (2026-10-13;
  `.claude/probes/K109/`). Follow-up K110.
- **K108** · Generation now builds the same maze in every browser. It
  uses only spec-exact operations plus `src/util/det_math.ts` (`hypot2`
  = V8's Math.hypot, built from exact ops), so no Chrome-built maze
  moved (a 3355-entry snapshot: 0 differ), and Firefox, which built a
  different plan for 31 of the first 60 dailies, now matches (real
  Chrome vs Firefox: 0 of 144 designs differ). The star mask folds by
  reflections. Guards: `test/core/deterministic_math.test.ts`,
  `test/util/det_math.test.ts`. The codec's integer `2 **` powers stay
  (exact in practice). Done in b62cea3 (2026-10-13;
  `.claude/probes/K108/`). Follow-up K109.

- **K87** · The maze plan's `pickFarthest` rescanned every candidate
  against every placed point on every pick (~88% of the plan). It now
  keeps a running minimum per candidate, pick-for-pick identical: 415 of
  415 whole plans in `.claude/probes/K87/identity.ts`, and the CI pin
  `test/core/maze_plan_identity.test.ts` against the frozen pre-K87
  module. Plan build at gs 24 defaults 174 -> 6.9 ms median (1.4 s ->
  30 ms worst), dense maps 1.7 s -> 25 ms (15.4 s -> 104 ms worst). Done
  in 62dd16d (2026-10-13). Follow-up K108.

- **K77** · Plucks showed sharp, wedge-like depressions (Levi): the base
  collapse met its limits (footprint ramps, tight bends, gap fades) in
  min()s. `roundCollapse` now opens the collapse depth with raised-cosine
  bumps, so the narrowed edge bends no tighter than 1 h; same-state worst
  second difference -5.7 -> -0.98 (bound -1). Cost per pluck layout
  (desktop, `.claude/probes/K77/k77_cost.ts`): 0.02-0.3 ms; a whole chain
  at full depth costs n x h/per (1 ms at n 2000, h/per 8). Done in
  eec4854 + 6e3f124 (2026-10-13; `.claude/probes/K77/`). Follow-ups
  K104-K107.

- **K101** · Music mode timed its notes from `performance.now()` in the
  render tick, so onsets landed up to a frame late and the tempo
  stretched (1.8% at 60 fps, 13.4% with 150 ms frames). Notes are now
  scheduled 0.3 s ahead on the audio clock and start sample-accurately
  in the worklet; measured at 60 fps and 150 ms frames, the interval
  error is at most 0.02 ms and the stretch is 0. Done in e9e01ae
  (2026-10-13; `.claude/probes/K101/`). Residual in K103.
- **K83** · Placeholder marker icons (Levi): black discs with white
  stroked glyphs for the start, finish and head; the finish's off-screen
  indicator wears the same glyph. Phone gate passed (K10, 2026-10-13).
  Done in 45aac50 + 5592f8c (2026-10-13; `.claude/probes/K83/`).
  Follow-ups K98, K99.
- **K96** · The follow camera reaches the head at the same real speed at
  any frame rate: it steps by real elapsed time in substeps of at most
  0.05 s. t95 at 151 ms frames went 8.6 s -> 4.4 s; 60 Hz is unchanged.
  Done in d8b9175 (2026-10-13; `.claude/probes/K96/`). Follow-up K103.
- **K99** · The fog of war lifts at fixed stations along a move's run,
  the same at any frame rate, move speed or mid-flight tap (0097801,
  2026-10-13; `.claude/probes/K99/`). Follow-up K100.
- **K73** · Levi's UI batch: pathViz labels read fullPath / recentPath
  (f917282); codec v4, recentPath lights twice as far, trailLength
  5 -> 10, dailies keep 5 (a99967e); the mode badge, "Free play" off the
  daily and "Replay · not scored" (0772f63); off-screen indicators, the
  finish points the way (ce331bc). Done 2026-10-13; follow-ups K92, K94,
  K95, K96.
- **K75** · recentPath's yellow pulse banding: pulses now brighten the
  thread's own paint (8b1ae7c); `pulseReach` ends the junction's pulse
  trains a set distance out, default 3 (59cba84). Done 2026-10-13; phone
  gate in K10; follow-up K93.
- **K67** · G2's visible changes (`docs/design/G2_shader_paint.md` 3.8,
  plus the fan fix's one-strip-step edge ramps): signed off by Levi on
  2026-10-13. No change needed.
- **K64** · Sleep window: Levi kept the recommended 2.5 sim-s
  (2026-10-13). No change needed; K91 is the physics-off follow-up.
- **K58** · Reset path inside a daily stays a timed backtrack with one
  backtrack per retracted run (Levi, 2026-10-13). No change needed.

- **K48** · Desktop Share keeps copying to the clipboard (Levi,
  2026-10-13). No change needed.
- **K53** · Reduced motion: Levi chose an in-app Motion setting (follow
  system / full / reduced, a viewer preference) on 2026-10-13. Built in
  K79.

- **K45** · CLAUDE.md slimmed from 2,250 lines (about 39k tokens) to
  about 240 (about 5k). History moved verbatim to `docs/history.md`, and
  subsystem lore to six path-scoped `.claude/rules/` files (physics,
  render, render-gaps, gameplay, generation, probes; the largest about
  7.6k tokens), which load only when matching files are touched.
  `.claude/rules/` is tracked; the rest of `.claude/` is ignored. Done in
  436eb37 and 6866d4b (2026-10-12).
  - 717 of 720 old sentences sit in exactly one new file; the other 3
    are pointer rewrites (`.claude/probes/K45/verify.py`).
  - Rules load checked in a `claude -p` transcript; vitest 315.

- **K4** · G2: per-sample color work runs in the shaders. Section colors,
  the reveal and its FX, and gameplay paint are evaluated per pixel from
  data textures (CPU mirror: `src/render/paint_math.ts`), and junction
  fans read per-arm material strips rendered once per frame
  (`src/render/arm_strip.ts`). Done in 72041df..a001b34 (2026-10-12).
  - Phone (Pixel 11, on K63): 59.5 fps with flow, 60.3 flow off (master
    59.5 / 59.3). Without the strips the fans had cost 60 -> 44 fps.
  - Desktop GPU (3200x1800, 5 moves): draw phase 2.07 (master) -> 2.14
    ms; fans 0.59 ms. CPU at rest: tickPaint 0.19 -> 0.01 ms, uploads
    151 -> 0 KB/frame.
  - Censuses against the CPU mirror within 2/255; vitest 315. Record:
    `docs/design/G2_shader_paint.md` section 7; probes
    `.claude/probes/K4/`. Sign-off of the visible changes: K67. G2.4
    (GPU particles) is K23.

- **K63** · The sleep gate counted 45 still FRAMES, so every real settle
  (physics-bound under 10 fps, frames capped at 0.1 s) slept at exactly
  sim 7.0. It now counts 2.5 SIMULATED seconds of quiet
  (`src/physics/sleep_gate.ts`), on every device. Done in 66b4db5,
  ed53344 and 7f75e8f (2026-10-12).
  - Sleep at about 5.0 sim-s on every set (8 seeds x default, fat, tw
    .64, and the five shapes at their daily sizes); desktop wall 12.3 ->
    8.9 s at the default; phone 13.0 -> 8.8 s.
  - The window is the shortest with no false sleep in about 250 harness
    settles and 130 gestures, each frozen state compared with a run that
    kept stepping, plus a margin (K64 is the speed trade).
  - Gap scans and kink censuses identical before and after; gesture
    battery 45/45 re-slept. Guarded by `test/physics/sleep_gate.test.ts`
    and the sleep regression test (a 10 vs 60 fps check).

- **K47 + K56** · Saved daily attempts, and the daily as the front door.
  Done in ba908bb and a72d91d (2026-10-12).
  - A bare URL opens today's daily; any other query, or a non-exempt
    panel edit, leaves it with a "your attempt is saved" toast.
  - The attempt (its taps, fingerprinted) is saved on every move and on
    hide, and restored with a paused clock. Reset path inside a daily is
    a timed backtrack.
  - Schema v2 with v1 migration; exempt preferences persist across
    dailies.
  - Verified: vitest 287, and 99/99 browser checks across 18 modes.
    Probes: `.claude/probes/K19-K20/` (results in `results_K47/`).

- **K21** · Shader noise backgrounds: `background` dropdown (none,
  vellum, mist, wash, silk, aurora, contours) and an intensity slider;
  screen-fixed, low-res and low-rate, colors from the design's gamut;
  fog draws the background in fogged areas; `none` is pixel-identical to
  master. Each effect adds 0.24-0.34 ms of GPU per frame at 3200x1800.
  Done in 66e80e9 (2026-10-12). Probes and contact sheets:
  `.claude/probes/K21/out/final/`.

- **K41** · Since the kink eyes (9920fab), Levi's rect link and the fat
  link never slept (93-95 ms of physics per frame at rest). Done in
  0e98804 and cb73eb5 (2026-10-12):
  - the capsule test solves its closest points in 3D (its 2D solve
    double-pushed twist-eye pairs, a cycle that predates the kink eyes);
  - the eye pressure follows a chord law, 2.6 widths;
  - ratchets intersect at every pass with both a joint and a twist twin;
  - crossing coverage continues through fused joints.

  Results: both links asleep at sim 7.0-7.3, and frame cost at rest
  111-119 -> 5.0-7.5 ms. Browser sweeps 32/32 asleep and gesture battery
  48/48. Guarded by `test/physics/sleep.regression.test.ts`.

- **K19 + K20** · Maze stats (time, efficiency, junctions, dead ends) in
  the HUD and win banner, and a Wordle-style daily maze: `?daily`, Daily
  #1 = 2026-10-12, pinned by the frozen `DAILY_V1`, results and streaks
  in localStorage, emoji-grid share. Also: the last three MazeParams
  joined the codec, and the app now starts with storage blocked. Done in
  3b3e028 and 29b42a1 (2026-10-12). Probes: `.claude/probes/K19-K20/`.

- **K40** · The lane-cut limiter stack (likely a no-op). Done in 99443cb:
  G1 deleted it along with the erase grid.

- **K1** · GPU migration G1: per-pixel crossing gaps. Done in 99443cb
  (casing masks in the ribbon fragment shader replace the erase grid,
  over-fills and fade strip; per-pixel protect for cyclic triangles,
  far-branch smooth-min for concave creases) and 0f25f0f (fused-tip cap
  cover) (2026-10-11). User URL: overcut 1098 -> 1 px and naked 510 -> 5
  (asleep, df373b5), draw calls 419 -> 47, update() 12.0 -> 5.7 ms; GPU
  0.79 -> 1.78 ms/frame at 3200x1800; phone defaults 39 -> 60 fps.
  History: "PER-PIXEL CROSSING GAPS" in `.claude/rules/render-gaps.md`.

- **K31** · Levi's phone collapsed crossing 305 (`?k88dtb.oHFEfg`) to
  3.37 ctrl. Re-checked on the phone (Pixel 11, USB) with the kink fix
  (9920fab): 305 rests at 8.58 ctrl with an open eye and a clean
  gap-faded crossing; all 22 kinks 8.0-15.0 ctrl (median 8.69); asleep
  at sim 7.0 s, wall 10.1 s. Closed in the commit that moved this item
  here (probe: `.claude/probes/probe_k31.mjs`).

- **K28** · Intro vs physics settle: Levi chose option (b) - no interim
  settle-first loader; the intro stays over the live settle until K7's
  worker lets it run at full frame rate (folded into K7's acceptance).

- **K25** · Pluck size default: Levi chose bigger. Done in the commit that
  moved this item here - pluckSize defaults to 1.75 (codec v3; v2 links
  keep 1), panel max 2 -> 3.

- **K2** · Kink loops squished shut. Done in 9920fab: an eye ratchet (7
  thread widths of rest length, rising at the twist-ratchet rate), eye
  pressure across each loop, and no fairing inside kink loops. Every
  kink eye at rest is now >= 0.8 thread widths on the five census URLs
  (user URL: min 0.17 -> 0.97, 16/21 -> 0 under target); fat + default
  sweeps 16/16 asleep (was 13/16).
- **K18** · vitest rewrote the byte-identity snapshot's line endings on
  Windows. Done in the commit that moved this item here: `.gitattributes`
  keeps `*.snap` LF in the working tree.
- **K3** · Render-only plucks plus a physics-off mode (settle, stop
  simulating, then the appear animation; pluck only, no tug). Done in
  df373b5.
- **K17** · Deep URLs such as `levi.dev/knotmaze/foo/bar` failed (the SPA
  fallback served the page under the wrong relative base). Done in the
  commit that moved this item here: `public/404.html` turns off Pages'
  SPA fallback and sends any unknown path to the app root, keeping the
  link's token.
