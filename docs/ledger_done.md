# Ledger done

Done items moved out of `LEDGER.md` by the ledger diet (K353, from
2026-10-15), verbatim, under their ID: every entry resolved before
2026-10-12 or undated, and the full text of the newer ones, which the
ledger keeps as a one-line entry. New entries go at the bottom.

## K257 (Done 2026-10-14)

- **K257** · K76 section 10's questions: Levi took every
  recommendation (2026-10-14 about 23:55); K76 2c builds them.

## K286 (Done 2026-10-14)

- **K286** · K268's draw order in a fading crossing: kept as built
  (Levi took the recommendation, 2026-10-14 about 23:55).

## K288 (Done 2026-10-14)

- **K288** · K279's pluck picks: glint is the default ripple (`prp`),
  the rest stays as built, and the wave keeps bending the markers, trail
  and fog (Levi, 2026-10-14 about 23:55). K279 stage 2 builds them.

## K329 (Done 2026-10-14)

- **K329** · The arrow keys at a 4-way junction (Levi, 2026-10-14
  about 22:15). Cause: K120's `keyMap` settled a tied key only by giving
  it a run no clear key had claimed, so at an X whose four arms all sit
  near diagonals every key tied (1 of 45 junctions in his maze; K7 not
  involved). Now each run gets at most one key: at an X each key takes
  the diagonal arm clockwise of it, elsewhere the assignment minimizes
  the worst key's error, and differences under KEY_TIE are ignored so it
  doesn't flicker. Calls for Levi (reversible): clockwise, the 80 ms
  chord window, and a lone press waiting only when a chord would pick
  another run. `src/ui/key_moves.ts`, `src/main.ts`; lore: TIE CYCLES,
  CHORDS AND THE MOVE WAIT in `gameplay-moves.md`; probes
  `.claude/probes/K329/`. Leftovers: K348-K350. Done in 56ddd6a..2c81a92 (2026-10-14
  23:38).

## K333 (Done 2026-10-14)

- **K333** · Diagonal chords (Levi, 2026-10-14 about 22:20): two
  adjacent keys within 80 ms pick from the four diagonals, a held chord
  holds, opposite keys never chord, and the move pad chords the same
  way. Built with K329. Done in 56ddd6a..2c81a92 (2026-10-14 23:38).

## K334 (Done 2026-10-14)

- **K334** · No snap on a second press (Levi, 2026-10-14 about 22:20
  and 22:50): a key, pad press, tap or click during a move waits
  (`MoveWait`: the latest wins, the hover shows its pick) and is taken on
  the arrival frame, and a held arrow chains at the next junction with no
  gap. The real-time chase keeps its own queue;
  `__knotKeyMoves().setTapsWait(false)` restores the snap for A/Bs.
  Built with K329. Done in 56ddd6a..2c81a92 (2026-10-14 23:38).

## K335 (Done 2026-10-14)

- **K335** · The confetti rain's top edge (Levi, 2026-10-14 about
  22:22): the rain's releases taper over 2.2 s (rate
  (m+1)/W·(1-t/W)^m, m = 4), so the opening wave keeps its weight and
  the rain runs out with no hard stop, and a later piece starts up to
  0.12 screen heights higher, so the wave's top thins out raggedly
  instead of ending in a line. Counts, the spray and the sim's per-frame
  cost are unchanged; knot mode animates 0.3-0.6 s longer after a finish
  (median; 0.9 s at most), by design. `src/render/confetti_model.ts`;
  lore: "The rain's taper (K335)" in `render-confetti.md`; sheets in
  `.claude/probes/K335/sheet/`. K336 and K337 stay deferred. Done in
  79c5a97..c7dacce (2026-10-14 23:32).

## K325 (Done 2026-10-14)

- **K325** · The snoring cat on the panel's credit link (Levi,
  2026-10-14 about 22:05): the snore (Levi's own recording, 22:50: "It's
  a recording I made.", from hopnbop's `single_cat_snore.wav` as a
  64 kbps mono MP3, 7.8 KB) plays on hover and on touch-down, and a touch
  holds the link open briefly so it can play (desktop Chrome needs no
  delay). `src/audio/snore_sfx.ts`, `src/ui/snore_link.ts`; lore: THE
  SNORING CAT LINK in `gameplay-audio.md`. Leftovers: K342, K343. Done
  in b8ee851..33f7a38 (2026-10-14 22:53).

## K298 (Done 2026-10-14)

- **K298** · The hover glow, its own stage (Levi, 2026-10-14 about 19:13
  and 20:25): `hoverGlowLength` (`hgl`, codec 131, default 3, master's
  effective length, so no default frame moved), `hoverGlowFade` (`hgf`,
  132, 0.2 instead of `RIM_END_FADE` 0.75), the thickness (`hgw`)
  relabeled, the glow also on a hovered choice, and mouse pick margins in
  screen px: `pickMargin` (`pkm`, 133, 4 CSS px past the drawn edge;
  master's 0.7 world was about 9.6 px) and `pickChoiceRatio` (`pkr`, 134,
  1.5). Touch keeps today's margins (K331). Same-state A/B: only the
  hovered choice and the end fade moved; GPU time within noise. Left
  over: K327 (labels), K328 (the rows at strength 0), K330 and K331.
  `docs/design/K298_hover_glow.md` ("Stage 1 handoff"). Done in
  44b19a3..813e098 (2026-10-14 22:20).

## K317 (Done 2026-10-14)

- **K317** · More confetti by default (Levi, 2026-10-14 21:37: "We should
  show more confetti by default, both from the top, but especially from
  the finish marker."): the rain per amount 140 -> 280 and the finish's
  spray 40 -> 160; reduced motion keeps its 16 pieces. The phone's frame
  rate at the finish rides K156's next pass. Done in ab8b78f (2026-10-14
  21:53).

## K253 (Done 2026-10-14)

- **K253** · K193's portrait A/A floor, taken on a quiet phone (Levi lent
  it at about 20:33: "The phone will be untouched for 40 minutes"):
  `aa4`, master 9a5eaa8 against itself, 20:37-21:02, 3 reps, no trip, 36
  of 36 samples at the emulated 411x753 @2.625. Installed as
  `scripts/phone_pass/noise.json` by `scripts/phone_pass/install_floor.mjs`;
  the landscape floor is kept as `noise.landscape.json`. The phone warmed
  from 29.4 to 40.0 C (skin), so the load floors are mostly heat;
  fabric@13 sat on the finish (K300). Lore: `probes-phone.md` ("THE
  PORTRAIT FLOOR"); evidence `.claude/probes/K253/aa4/`. Done in 459cc11
  (2026-10-14 21:24).

## K193 (Done 2026-10-14)

- **K193** · The phone pass's orientation (Levi, 2026-10-14 about 11:10,
  email 4.1: "b seems best"): the pass emulates a 411x753 portrait
  viewport over CDP and leaves the phone as it sits. Stage 1 merged in
  c36b57c..763067a (14:10): `-Viewport portrait|native`, the proof
  (`scripts/phone_pass/emulation.mjs`) and viewport-clipped screenshots,
  which fixed K195's strip. Its A/A tripped on a touch twice (13:59,
  19:37); K253 took the portrait floor. Left over: K300 and K254-K256.
  `docs/design/K193.md` ("Stage 1 handoff"). Done in 459cc11 (2026-10-14
  21:24).

## K302 (Done 2026-10-14)

- **K302** · K7's 11 calls (`docs/design/K7_worker.md`, "Design
  handoff", "Levi's calls"; recommended yes on each; asked at 20:15): (1)
  the worker becomes the default after the phone pass, with `phw=0` and
  an automatic fallback; (2) no SharedArrayBuffer and no COOP/COEP; (3)
  no pointer-led grab at first (the grab trails by about 40-50 ms); (4)
  the hidden pre-settle and the trefoil move into the worker; (5) physics
  pauses while main is frozen (the daily sleeps at about 12 s, not 7-8);
  (6) FYI: dense stays render-bound at about 30 fps, so a priority call on
  K8; (7) the phone pass gates the default; (8) K8/K9's warm-up next,
  beside stage 2, starting with a trace; (9) `phw` as a daily-exempt link
  param; (10) five stages instead of four; (11) FYI: 0.76x real time at
  gs 18. Answers, 2026-10-14: (8) at about 20:43, "Let's prioritize this
  too." (K307); yes to (1), (2), (4), (7), (8) and (9) at 20:58-21:05;
  "What?" to (3), (5), (10) and (11), explained at 21:08 with (2), then
  "All these recommendations sound good" at about 21:18. (6)'s "Yes." is
  read as noted, so K8 keeps its place. His question on multithreaded
  WASM was answered at about 21:20 (K316), and (4) led to K313. Closed
  2026-10-14 21:18: all yes.

## K299 (Done 2026-10-14)

- **K299** · The choice pulses and the trail misdrawn at one junction
  (Levi, 2026-10-14 about 19:15, on `?qoietk.KSIeBoGlf4-`). Cause:
  `kArcOfCtrl` wrapped a closed chain's ctrl through a float division
  that the GPU rounds (ANGLE D3D11 gave `floor(k*n/n)` = k-1 in 3275 of
  16384 pairs, n = 28 among them), so ctrl 28 at a chain's seam read the
  next chain's header as its arc; the float64 mirror divides exactly.
  Fixed with integer-corrected laps (`kLapOf`, `kWrap`) in
  `paint_glsl.ts`, `paint_math.ts`, `arm_strip.ts` and
  `ribbon_renderer.ts`, guarded by `test/render/paint_ring_lap.test.ts`
  (a source scan with a `ROUNDED_QUOTIENTS` allowlist). Named change: a
  full-lap run's choice pulse now draws (such runs are in 49 of dailies
  1-300). His link's A/B went from 6967 px off to 42 (all at 1/255).
  Done in 74ad307..e5acafb (merged 2026-10-14 20:45). Lore:
  `render-paint.md` ("RING LAPS"); sheets `.claude/probes/K299/sheet/`;
  `docs/design/K299_choice_pulse_bug.md` ("Stage 1 handoff").

## K264 (Done 2026-10-14)

- **K264** · The hover rim's width becomes a slider (Levi, 2026-10-14
  about 15:46, verbatim: "Rim width,0.4 is good, make it a slider., and
  personal setting."; read as a width slider, `hoverGlow` staying 0.4,
  both personal). Done in a47642d..f294247 (2026-10-14, K111 stage 4):
  `hoverGlowWidth` (`hgw`, codec v5 index 130, daily-exempt), default
  0.85, range 0.3-1 in steps of 0.05, the "Hover glow width" row under
  "Hover glow". `docs/design/K111.md` ("Stage 4 handoff"). Levi's 19:13
  follow-up (its own length, a shorter end fade, thickness, the glow on
  choices, a pick margin) is K298.

## K273 (Done 2026-10-14)

- **K273** · What a minotaur catch resets (Levi, 2026-10-14 about
  15:46, verbatim: "We should also have a toggle to conditionally reset
  the level/Minotaur/fog when dying to the Minotaur."). Done in
  86d404e..02194b4 (2026-10-14), on both clocks: `minoRestart` (`mrs`,
  off) restarts the level on a catch (the path, fog, fuse and clock; the
  tallies carry over), `minoLair` (`mlr`, on) off leaves the minotaur
  where it caught you, and `minoRefog` stays the fog's toggle (minoLair
  and minoRefog hide while minoRestart is on). `docs/design/K80_turns.md`
  ("Stage 2 handoff").

## K272 (Done 2026-10-14)

- **K272** · The turn minotaur's sliders at 0: roam 0 stood still while
  roaming, and territory 0 was a random walk (K80 turns stage 1). Done in
  86d404e..02194b4 (2026-10-14): both start at 1 (`MINO_RUNS_MIN`,
  `src/ui/url_state.ts`) in the panel, the codec reader and the
  key=value readers. Roam 0 as a sentry is K296.

## K283 (Done 2026-10-14)

- **K283** · The real game's end banners after K274, from a live solve.
  Done in K80 turns stage 2 (86d404e..02194b4, 2026-10-14): its copy of
  `probe_stars.mjs` passed every run in a headed, hardware-GPU Chrome
  with real taps (checks by run: design 16, design at 411x753 touch 16,
  daily 32, caught 18, realtime 17, turnmino 21, turnmino with `&mrs=1`
  21; no page errors). `.claude/probes/K80/turns2/banner/`; the original
  probe's two stale checks are K295.

## K274 (Done 2026-10-14)

- **K274** · Explain each stat behind the win banner's info button (Levi,
  2026-10-14 about 16:01). Done in 71a7c25..79805af (2026-10-14): a `STATS`
  table in `src/game/maze_stats.ts` (one plain line per row id; a test
  fails on a row without its line or a line without its row), the end
  banners' "What the numbers mean" list (the Burnt banner and an unrated
  win get the info button too) and the daily stats view's legend. Its
  lines are in `docs/design/K274_K277.md` ("Stage 1 handoff") for Levi's
  review. Follow-ups: K282, K283.

## K277 (Done 2026-10-14)

- **K277** · Credit the research and techniques on the credits page
  (Levi, 2026-10-14 about 16:07). Done in 71a7c25..79805af (2026-10-14): eleven
  `RESEARCH` entries in `notices/credits.ts`, shown in the page's
  "Research and techniques" section, each with its citation, its use and
  the files that carry its mark (tested), worded as use, never as
  endorsement. Follow-ups: K284, K285.

## K275 (Done 2026-10-14)

- **K275** · Junction joints and dead-end caps fade with their thread
  under thread reveal (K76). Levi, 2026-10-14 about 16:50: "Yes" to the
  recommendation (fade, so a cap and K268's shaped cut read one
  coverage, section 10's premultiplied strip alpha; not 2b's pop at vis
  0.98). K268 stage 2 and K76 stage 2c build it. `docs/design/K76.md`
  ("Stage 2b handoff", "For stage 2c").

## K237 (Done 2026-10-14)

- **K237** · The hover rim's strength: Levi, 2026-10-14 about 15:46:
  "0.4 is good ... and personal setting." `hoverGlow` stays 0.4 and
  daily-exempt (K57), as built in 6588ec0.

## K269 (Done 2026-10-14)

- **K269** · The turn hunter's catch rates on today's mazes (K80 turns
  stage 1: 14% of dailies for an attentive explorer, 32% at 80%, against
  the research's 1% and 13%). Levi, 2026-10-14 about 15:34: "Retune."
  Done in 86d404e..02194b4 (2026-10-14): sight 4 -> 2 and accuracy 0.9 ->
  0.3 take the hunter from 18% / 36% on today's H1 mazes to 1.0% / 13.1%
  (64 reps). The stalker and the treelike and dead-end sets paid for it:
  K294.

## K248 (Done 2026-10-14)

- **K248** · Levi's highlight pick (2026-10-14 about 13:28): the choices
  keep the pulses and a hovered choice keeps today's look;
  `highlightMode` and its glow, rims and contrast modes went (codec
  index 108 `hm` removed, CODEC_VERSION 5); a hover away from the
  choices gets K145's rim reshaped, brightest at the thread's edge and
  fading toward its center (`RIM_EDGE` 0.85), with K236's (c) short-run
  fade and (d) view 5. Done in 365bc45..6588ec0 (2026-10-14 14:58, K111
  stage 3; 835 tests, same-state A/B 0 px, census max 0.61/255, no GPU
  cost). Its calls are K264 (width), K265 (High contrast) and K237
  (strength). Lore `render-paint.md` (HOVER GLOW); brief
  `docs/design/K111.md` ("Stage 3 handoff"); evidence
  `.claude/probes/K111/stage3/`; the worktree
  `.claude/worktrees/agent-a39facd348b84a113` is kept.

## K249 (Done 2026-10-14)

- **K249** · K111's rims and contrast modes stopped hard at junction
  webs and fans. Dropped 2026-10-14: the modes were removed in 365bc45
  (K111 stage 3), and the rim stays inside its run by design (K248).

## K250 (Done 2026-10-14)

- **K250** · An idle-render skip for the steady highlight modes.
  Dropped 2026-10-14: the modes were removed in 365bc45 (K111 stage 3).

## K198 (Done 2026-10-14)

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
  tweakpane_panel.ts (stage 2 runs beside K111 stage 2 and K174, in
  other panel folders). Records:
  `docs/design/K148_K149.md` ("Stage 1 handoff"), `gameplay-indicators.md`
  THE HEAD and `gameplay-camera.md` FIT CAMERA PAN RANGE. Since K98
  (merged 2026-10-14) `markerSize` sizes the in-game markers; the edge
  indicators keep their own sizes until part (3).
  - stage 1 MERGED in 5f6ceb9..d7373a4 (2026-10-14 09:31): the pan range
    (`src/ui/view_clamp.ts`: `panRange`, `clampFitView`,
    `easeIntoRange`; 16 tests). With the panel open, the maze's right
    edge (its threads, or a shown start, head or exit disc) may reach
    10 px left of the panel's left edge and no further; closing the
    panel, a resize or fit drift eases back in at 0.15 a frame and never
    snaps. Checked at 1000x800, 800x700, 1400x900 and 411x753. Lore
    `gameplay-camera.md` (FIT CAMERA PAN RANGE); handoff
    `docs/design/K198.md`; probes `.claude/probes/K198/`; follow-ups
    K221-K224.
  - parts (2) and (3), decided (Levi, 2026-10-14 about 11:10, email 6):
    6.1 "both": each edge indicator (finish, head, minotaur) gets a
    show/hide switch and a size; 6.2 "yes": the head's disc shows only
    once the head has been off screen for a moment. Added in the same
    reply: "The panel limit should tween as the panel is toggled.
    Similarly, I want displaced off-screen indicators to also have their
    panel-offset positions tween as needed." (Stage 1 already eases the
    view back into range at 0.15 a frame when the panel closes; whether
    the range itself follows the panel's slide is for the brief to
    check.) The reading of part (1) stands: Levi corrected nothing.
  - stage 2 brief: `docs/design/K198.md` ("Stage 2", f06dfd9): a
    show/hide switch for the head and minotaur indicators beside the
    finish's, one size slider for all three, the head's delay, and
    time-based tweens for the panel limit and the displaced indicators.
  - Done in 96fa13a..af0f054 (2026-10-14 14:03): stage 2. The panel's edge
    of the pan range tweens over 0.25 s (`PANEL_TWEEN_S`, smoothstep;
    `stepRange` eases against last frame's openness and clamps to this
    frame's, so a view at the limit rides the panel's edge), and a
    displaced edge indicator slides along the screen's perimeter to its
    panel-offset place; the Tweakpane panel itself still snaps. New Maze
    rows: `headIndicator`, `minotaurIndicator` (real time only) and
    `indicatorSize` (0.6-1.8, one size for all three discs; K98's
    `markerSize` stays separate). The head's disc shows after 0.45 s
    off screen (`HEAD_SHOW_DELAY_S`; showing only, hiding is
    immediate; the finish and minotaur discs have no delay). Reduced
    motion jumps instead of tweening. A switched-off indicator is not
    drawn and takes no taps. Closing at the limit: 35 frames / 1042 ms
    before, 9 / 238 ms after; 806 tests passed at the merge (797 on the
    branch). The disc's slide across
    the open panel is K251, the residuals K252. Lore
    `gameplay-indicators.md`, `gameplay-camera.md`; handoff
    `docs/design/K198.md` ("Stage 2 handoff"); sheet and probes
    `.claude/probes/K198/stage2/` (`out/contact_sheet.png`; stage 1's
    `pan.mjs` closing check is superseded by stage 2's glide check).

## K111 (Done 2026-10-14)

- **K111** · Accessibility (Levi, 2026-10-13). Reduced motion also
  stills the flow undulation, but not the intros or the pulses next to
  the player. Those pulses get a dropdown of alternative highlight modes,
  which also serves high contrast. An Accessibility group near the top of
  the panel holds "High contrast" and "Reduced motion" master checkboxes
  that override every relevant setting (today's Motion setting is
  `src/ui/motion.ts`, K79). Brief `docs/design/K111.md` (3f011fa): stage
  1 is the group, reduced motion and high contrast as far as today's
  settings reach (merged 2026-10-14 11:58, 0e5a138..9c6cab3:
  `src/ui/accessibility.ts`, the Accessibility folder first in the
  panel; lore `gameplay-motion.md` ACCESSIBILITY GROUP and
  `gameplay-panel.md` ACCESSIBILITY FOLDER; Levi's review is K238).
  Stage 2, the highlight modes, ran 12:02-12:52 (brief b6c3832).
  - Done in 36d280a..5438a60 (2026-10-14 13:03): stage 2, the highlight
    modes. `highlightMode` (`hm`, codec index 108) is a dropdown of
    pulses (today's look), glow (0.75, a steady whitening of the
    thread's color), rims (a white edge band) and contrast (pure white
    with a black center line), set in `handRendererLook()`. Undo now
    applies `hoverGlow` live (`LIVE_EFFECTS.onTrailChange`, a K236 gap;
    test in `test/ui/undo_stack.test.ts`). 779 tests pass. Which modes
    stay is K248, the junction-web edges K249, the idle-render idea
    K250; stage 1's calls are K238. Lore `render-paint.md` (HIGHLIGHT
    MODES) and `gameplay-links.md` (HIGHLIGHT MODE PARAM); sheets
    `.claude/probes/K111/stage2/out/sheets/`; brief `docs/design/K111.md`
    ("Stage 2 handoff").

## K174 (Done 2026-10-14)

- **K174** · K80 stage 1's calls, decided (Levi, 2026-10-14 about
  11:10, email 2.x; play: https://levi.dev/knotmaze/?7&clk=realtime):
  2.1 the chase pace stays 0.7 of the player's, "let's try 0.7, but this
  should be a slider"; 2.2 detection stays 15 (the coordinator's reading
  of "fine, slider"); 2.3 the minotaur shows through fog always, as
  built (the reading of "fine, drop-down"); 2.4 a catch re-fogs the
  explored maze, "yes, but checkbox toggle control"; 2.5 the caught row
  stays visible with the stat rows off, "yes" (as built); 2.6 the
  minotaur roams toward the player (K179's bias), "roam toward, but
  again, add a control to toggle". The pace and detection sliders and
  the fog dropdown exist (the Minotaur folder). The work: the paces as
  fractions of `playerPace` (hunt 0.7, wander 0.5), a re-fog-on-catch
  checkbox (on) and a roam-toward checkbox (on) tuned on the K80 sim,
  plus K177's open checks. Brief `docs/design/K174.md` (d644ec5).
  - Done in ecf2169..6ec8275 (2026-10-14 12:53): the paces are
    fractions of `playerPace` (`mwp` wander 0.5, `mhp` hunt 0.7; panel
    sliders 0-2, "(x your pace)"); `minoToward` (`mtw`, on) roams toward
    the player (roamPull 0.5 and a "nearer" roam pick); `minoRefog`
    (`mrf`, on) re-fogs the explored maze on a catch (`respawn(refog)`,
    a `refogs` counter). Codec indices 106-107. On the K80 sim, games
    where the minotaur meets the player rose from 56% to 63% and catches
    from 1.32 to 1.68 a game; 74% of games end with 0-2 catches. Three
    of K177's four checks passed (K177 keeps the phone one). roamPull's
    strength is K245, the residuals K246, the ideas K247. Lore
    `gameplay-minotaur.md` (THE MINOTAUR'S CONTROLS); brief
    `docs/design/K174.md` ("Stage 1 handoff").

## K235 (Done 2026-10-14)

- **K235** · Taps inside junction cores make no sound (Levi, 2026-10-14
  about 11:10, on K194's 5.2: "Probably shouldn't.").
  - Done in 08d1383..05e6d4d (2026-10-14 12:44): `tapLobes()`
    (`pluck_model.ts`) finds the tapped lobe; a core tap (its vibrating
    span under `LOBE_MIN_LEN`) draws nothing and `tapPluck` returns
    before the synth. Real mouse and touch taps, master vs branch: every
    core tap is silent (21 of 1124 fabric taps, 51 of 2336 dense, at
    1400x900 and 411x753) and every thread tap sounds once. Auto plucks
    and a drag's release are unchanged (K244). Lore `render-pluck.md`;
    brief `docs/design/K235_K239.md` ("Stage 1 handoff").

## K239 (Done 2026-10-14)

- **K239** · A fresh static page drew its first frame before the
  renderer had its fade and flow (about 28k px off a refreshed frame;
  found by K111 stage 1).
  - Done in 08d1383..05e6d4d (2026-10-14 12:44): `handRendererLook()`
    (main.ts) hands the renderer every look param `update()` reads
    (fade, flow, cusp radius, the pulse and glow params, the FX style)
    before every `renderer.update()`. Static first frames now match a
    refreshed frame (0 px in five cases, from 18-31k px); physics-on
    pages are unchanged (0 px, six cases). Lore `gameplay-motion.md`
    (the rule for new renderer fields). A paused page with the instant
    intro is K243.

## K191 (Done 2026-10-14)

- **K191** · K169's two calls, decided (Levi, 2026-10-14 about 11:10,
  email 3.x): 3.1 "fade out": a web that stops being full fades its gold
  out over the same 0.25 s instead of losing it at once; 3.2 "yes":
  reduced Motion keeps the fade (as built).
  - Done in fafa340..3467117 (2026-10-14 12:04): `web_fade.ts` keeps a
    ramp per junction (fade-out levels 1 / 0.53 / 0 at 0 / 0.12 / 0.25
    s; a reversal continues from the current level and takes the full
    0.25 s); no shader or mirror change; frames from 0.25 s on match
    stage 1 (0 px). A web that leaves the routes too (a reset) still
    drops at once (K241). Lore `render-web-fade.md`; brief
    `docs/design/K154_K169.md` ("Stage 2 handoff").

## K145 (Done 2026-10-14)

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
  daily-exempt (K57). Stage 2 of `docs/design/K93_K145.md` (K93's stage 1
  merged in ed8f284).
  - Done in 06edef4..56b6f2d (2026-10-14 11:55): `hoverGlow` (`hg`,
    codec index 105, default 0.4, daily-exempt), a G2 rim term with its
    `paint_math` mirror (the GPU within 0.6/255 of it); with no hover, or
    at strength 0, frames equal master's; GPU +0.04-0.05 ms. Lore
    `render-paint.md` HOVER GLOW; handoff `docs/design/K93_K145.md`
    ("Stage 2 handoff (resumed)"); sheets `.claude/probes/K145/sheet2/`.
    The WIP commit's message says codec index 104; the code holds 105.
    Residuals: K236. The default and the exemption: K237.

## K219 (Done 2026-10-14)

- **K219** · Since K93 the choice hover stops at `pulseReach` in every
  path mode, and at reach 0.5 it lights very little: does it need a
  floor? Asked 2026-10-14 about 09:33 with
  `.claude/probes/K93/K93_hover_sheet.png`.
  - Answered 2026-10-14 about 10:57, in session: "Hover should honor the
    slider." No floor and nothing to change: since K93 the hover stops at
    `pulseReach` in every path mode. (Emailed at 10:11 as 8.1, just
    before.)

## K92 (Done 2026-10-14)

- **K92** · Undo and redo for design changes (Levi, 2026-10-13). Two
  buttons beside the panel's open/close button, shown only while the
  panel is open, each enabled only when it can act; the mode badge moves
  to a row below them. An undo stack of design changes, including the
  "Free play" badge's tap (today it replaces the link, so an unshared
  design is lost). His call (2) stands: under fog, a tap on the finish
  indicator only shows a toast. Files: `src/ui/tweakpane_panel.ts`,
  `src/main.ts`, `src/ui/mode_badge.ts`, `src/ui/url_state.ts`;
  `.claude/rules/gameplay-badge.md` (MODE BADGE). Brief
  `docs/design/K92.md` (one stage), plus K224 (the move pad over the open panel).
  - K80 (5fed5c1): real time has no move undo (`undoAllowed(clock)`); if K92's buttons ever reach maze moves, they consult it.
  - Done in d707bc1..e78ddcc (2026-10-14 10:08), with K224: a 100-step in-memory
    history (`src/ui/undo_stack.ts`), the buttons on the hamburger's row
    (`src/ui/undo_buttons.ts`), the badge on its own row below them, and
    the move pad hidden while the panel is open. Lore:
    `gameplay-panel.md`, `gameplay-badge.md`, `gameplay-moves.md`;
    handoff `docs/design/K92.md`; probe `.claude/probes/K92/undo.mjs`
    (desktop 27/27, daily 7/7, phone emulation 9/9). The panel's lower
    top is K229.

## K224 (Done 2026-10-14)

- **K224** · On the phone (411x753) the K120 move pad drew over the open
  panel. K92 hides the pad while the panel is open (the keyboard still
  moves the player). Done in d707bc1..e78ddcc (2026-10-14 10:08).

## K98 (Done 2026-10-14)

- **K98** · Marker sizes and two new glyphs (Levi, 2026-10-13). A
  `markerSize` slider (`mks`, codec index 104, daily-exempt): the black
  disc's diameter in thread widths, 0.25-3, default 1.08 (the pre-K83
  head dot), with every in-game marker at that size, the minotaur too
  (K80's 1.15x and its floor are gone). Colored dots are back at the
  start and finish (radius max(0.95 tw, r + 0.41 tw)); a horns glyph for
  the minotaur, and a spider glyph with no mesh yet (K226). Lore:
  `render-markers.md`; handoff: `docs/design/K98.md`; sheet:
  `.claude/probes/K98/sheet_k98.png`. Done in 68a9622..f5982cd
  (2026-10-14 10:03); the default size is K225.

## K93 (Done 2026-10-14)

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

## K173 (Done 2026-10-14)

- **K173** · Split the `.claude/rules/` lore by topic (Levi, 2026-10-14
  about 07:53: "Splitting the rules files seems worthwhile."). 32 new
  topic files with narrow `paths:` lists; the area files keep the general
  lore. Passages moved verbatim by a re-runnable script
  (`scripts/split_rules.mjs`), indexed in `docs/lore_index.md`. Lore
  attached per read: median 37.3 KB before, 5.8 after. Brief and handoff
  `docs/design/K173.md`, probes `.claude/probes/K173/`; follow-ups K214
  and K216, idea K215. Done in 62e7d5b..1fe468d (2026-10-14).

## K132 (Done 2026-10-14)

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

## K100 (Done 2026-10-14)

- **K100** · The fog of war resets on a restart only (Levi, 2026-10-13).
  The controller counts restarts and the renderer clears the stamps when
  the count moves; walking back, a daily's Reset path and a K80 catch
  keep the fog (a catch used to clear it, against the K80 lore). A
  restore re-explores every tap in travel direction, as live play does
  (exact on a static daily; IoU 0.977 with physics). After a backtrack
  the fog-fit camera keeps framing the explored area. Brief and handoff
  `docs/design/K100.md`, probes `.claude/probes/K100/`; follow-ups
  K206-K209. Done in 458e1e5 (2026-10-14).

## K61 (Done 2026-10-14)

- **K61** · `encodeDelta` (the old `?daily=N.<delta>` writer), used only
  by tests. Done in 402eb4b (2026-10-14): K132 removed it and the delta
  reader.

## K203 (Done 2026-10-14)

- **K203** · K120's calls (`docs/design/K120.md`): the move pad on by
  default on coarse pointers, bottom right at 132 px, the 15 deg tie rule
  and the 200 ms hold, confirmed by Levi ("ok", 2026-10-14 about 07:53).
  Nothing to change (K120 merged in 0acbce0).

## K200 (Done 2026-10-14)

- **K200** · K146 + K151's calls (`docs/design/K146_K151.md`): (1) free
  play's X always shows, on the desktop too; (2) the practice banner and
  share text, the daily badge's tap, the labels' daily numbers,
  History's rows and v2's late results, confirmed by Levi ("ok",
  2026-10-14 about 07:53). Done in 7950c7f (2026-10-14).
(items move here with the commit that resolved them)

## K120 (Done 2026-10-14)

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

## K146 (Done 2026-10-14)

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

## K151 (Done 2026-10-14)

- **K151** · The mode badge (Levi, 2026-10-13 about 16:30, verbatim in
  `docs/design/levi_notes_2026-10-13.md`).
  - Done in df8929c..b9cf882 (2026-10-14, with K146): one badge always
    shows (`src/ui/mode_badge.ts`: Free play, Daily #N, replay,
    practice), the HUD's title row is gone, and free play's X fades in on
    hover and always shows on coarse pointers (`MODE_BADGE_X_ON_COARSE`).
    Calls: K200.

## K148 (Done 2026-10-14)

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

## K149 (Done 2026-10-14)

- **K149** · Room to pan the maze partly off screen at the fit zoom
  (Levi, 2026-10-13 about 16:25).
  - Done in 2afca1d..fcc402b (2026-10-14, with K148):
    `src/ui/view_clamp.ts` (`PAN_SLACK`, 0.3 of the screen per side at
    every zoom); a reset from a slack-panned view eases instead of
    snapping. Calls: K198 (the phone's open panel).

## K180 (Done 2026-10-14)

- **K180** · K104's tuning calls as params, so Levi can try them by
  playing: pluckWhole (`pw`, 0-1.5, default 0.5), pluckCrossings (`pcx`:
  through | ride | pinch) and pluckGlow (`pgl`: off | instead | with |
  fallback); codec v4 appends 101-103, daily-exempt.
  - Done in 048e06c..0250564 (2026-10-14): 0 px against master at the
    defaults in 8 A/B cases; 605 tests. Probes `.claude/probes/K180/`
    (sheets `sheet/sheet_desktop.png`, `sheet_phone.png`); worktree
    `.claude/worktrees/agent-a5a195592e9da8700` kept. Calls: K194;
    residual: K196.

## K192 (Done, undated)

- **K192** · Probes that pin `paintClock` saw K169's gold web at fade
  level 0. Done in 81d31a5 (`scripts/phone_pass/walk.mjs` `pinAll()` sets
  `webFade.seconds = 0`; K81's untracked kits `g2lib.mjs`, `k83_ab.mjs`
  and `phone/k81phone.mjs` got the same line).

## K154 (Done 2026-10-14)

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

## K169 (Done 2026-10-14)

- **K169** · Fade K127's gold web in over about 0.25 s instead of
  turning it gold in one frame (Levi, 2026-10-14 about 00:22,
  `docs/design/levi_notes_2026-10-14.md` item 9: "Fade.";
  `docs/design/K81.md`, "Stage 3d results"). One agent with K154.
  - Done in 64d3296..aaa3dda (2026-10-14): `src/render/web_fade.ts`, a
    0.25 s smoothstep from the untraveled base to the gold one (written
    into the junction record, no fillet rebuild); from 0.25 s on, 0 px
    against K127. Its two calls: K191; probes that pin `paintClock`:
    K192. Sheets: `.claude/probes/K154_K169/out/fade_zoom_desk.png` and
    `fade_zoom_phone.png`. Play: https://levi.dev/knotmaze/?7

## K140 (Done 2026-10-14)

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
    residuals: K188 and K189. Play: https://levi.dev/knotmaze/?7
    (`&cfa=3` for the most, `&cf=0` for none).

## K155 (Done 2026-10-14)

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

## K104 (Done 2026-10-14)

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

## K183 (Done 2026-10-14)

- **K183** · The phone was asleep and locked at 23:14 (2026-10-13). K156
  3c and the round's phone pass wait for Levi to unlock it and leave it
  awake on its charger; the coordinator never wakes or unlocks it.
  - Done 2026-10-14: Levi left the phone awake and unlocked on its
    charger; read-only checks found it ready at 00:44 and 00:47
    (`.claude/probes/K183/phone_wait.log`), and K156 3c launched at about
    00:56.

## K152 (Done 2026-10-14)

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

## K171 (Done 2026-10-14)

- **K171** · The phone pass's retry never wakes or unlocks the phone
  (`retry_quiet.ps1`, K156 3a), so with the phone asleep or off its
  charger the retry exits 3 and the pass stops. Accept that (a person
  restarts it), or should a pass wait for one?
  - Dropped: folded into K156 3c, which builds a read-only wait for the
    phone (Levi chose (b), a pass that waits, 2026-10-14 about 00:22,
    item 5).

## K81 (Done 2026-10-13)

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

## K127 (Done 2026-10-13)

- **K127** · Fill a web with gold when every arm is traveled (K81's
  decision 4): built in K81's stage 3d. Done in 5d3170d (2026-10-13), with
  K81 (3c8433a).

## K147 (Done 2026-10-13)

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

## K122 (Done 2026-10-13)

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

## K79 (Done 2026-10-13)

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

## K110 (Done 2026-10-13)

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

## K129 (Done 2026-10-13)

- **K129** · K79 stage B's two calls (Levi, 2026-10-13: "For color
  defaults, sure. For vellum scale, whatever is best."): the custom
  colors keep their proposed defaults (base #151b28; accents #7ab8cd,
  #cdb17a, #aa7acd). Vellum keeps its fiber floor (shrinking the fibers
  would alias), and the scale's max drops from 3 to 2: at 3 the wash and
  contours are nearly empty and the fibers read as long hatching (sheets
  in `.claude/probes/K79/out/view/`). Done in 281b22b and b2ccfaf
  (2026-10-13), with K79 stage B (58b77cf).

## K121 (Done 2026-10-13)

- **K121** · The player's disc hides the start of each move pulse
  (K98's call 4). Dropped: Levi keeps it as is (2026-10-13: "This is fine
  as-is.").

## K86 (Done 2026-10-13)

- **K86** · Long dead ends (Levi: "ensure longer dead end paths with
  no junctions"). Dropped: folded into K74 stage 1 (Levi's decision 5,
  2026-10-13).

## K105 (Done 2026-10-13)

- **K105** · Scale a pluck's sympathetic lobes from the tapped lobe's
  capped amplitude (K77 finding). Dropped: folded into K104 (its goal 4),
  2026-10-13; done in f883c75 on K104's branch, landing with K104's
  merge.

## K49 (Done 2026-10-13)

- **K49** · Kink eye size: Levi kept 2.6 widths (2026-10-13) over 2.8,
  which opened every eye but widened the whole population instead of
  closing the tail (`.claude/probes/K49/`). Decided 2026-10-13, no
  change; the 2.8 one-liner stays on branch
  `worktree-agent-ac664e8a9e271757a` (4fa22e2), its worktree removed.

## K52 (Done 2026-10-13)

- **K52** · Default background: Levi kept `vellum` (2026-10-13), still
  static at auto speed. Decided 2026-10-13, no change. Vellum's drift,
  when on, costs 2.1 ms per pass (0.35 ms per 60 Hz frame) on the
  desktop at 3200x1800 (K79 B2b); its phone cost comes from K79's B3
  gate.

## K94 (Done 2026-10-13)

- **K94** · The mouse wheel still zooms on Levi's hardware
  (2026-10-13), so the fractional-delta test in `src/main.ts` stays.
  Decided 2026-10-13, no change.

## K109 (Done 2026-10-13)

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

## K108 (Done 2026-10-13)

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

## K87 (Done 2026-10-13)

- **K87** · The maze plan's `pickFarthest` rescanned every candidate
  against every placed point on every pick (~88% of the plan). It now
  keeps a running minimum per candidate, pick-for-pick identical: 415 of
  415 whole plans in `.claude/probes/K87/identity.ts`, and the CI pin
  `test/core/maze_plan_identity.test.ts` against the frozen pre-K87
  module. Plan build at gs 24 defaults 174 -> 6.9 ms median (1.4 s ->
  30 ms worst), dense maps 1.7 s -> 25 ms (15.4 s -> 104 ms worst). Done
  in 62dd16d (2026-10-13). Follow-up K108.

## K77 (Done 2026-10-13)

- **K77** · Plucks showed sharp, wedge-like depressions (Levi): the base
  collapse met its limits (footprint ramps, tight bends, gap fades) in
  min()s. `roundCollapse` now opens the collapse depth with raised-cosine
  bumps, so the narrowed edge bends no tighter than 1 h; same-state worst
  second difference -5.7 -> -0.98 (bound -1). Cost per pluck layout
  (desktop, `.claude/probes/K77/k77_cost.ts`): 0.02-0.3 ms; a whole chain
  at full depth costs n x h/per (1 ms at n 2000, h/per 8). Done in
  eec4854 + 6e3f124 (2026-10-13; `.claude/probes/K77/`). Follow-ups
  K104-K107.

## K101 (Done 2026-10-13)

- **K101** · Music mode timed its notes from `performance.now()` in the
  render tick, so onsets landed up to a frame late and the tempo
  stretched (1.8% at 60 fps, 13.4% with 150 ms frames). Notes are now
  scheduled 0.3 s ahead on the audio clock and start sample-accurately
  in the worklet; measured at 60 fps and 150 ms frames, the interval
  error is at most 0.02 ms and the stretch is 0. Done in e9e01ae
  (2026-10-13; `.claude/probes/K101/`). Residual in K103.

## K83 (Done 2026-10-13)

- **K83** · Placeholder marker icons (Levi): black discs with white
  stroked glyphs for the start, finish and head; the finish's off-screen
  indicator wears the same glyph. Phone gate passed (K10, 2026-10-13).
  Done in 45aac50 + 5592f8c (2026-10-13; `.claude/probes/K83/`).
  Follow-ups K98, K99.

## K96 (Done 2026-10-13)

- **K96** · The follow camera reaches the head at the same real speed at
  any frame rate: it steps by real elapsed time in substeps of at most
  0.05 s. t95 at 151 ms frames went 8.6 s -> 4.4 s; 60 Hz is unchanged.
  Done in d8b9175 (2026-10-13; `.claude/probes/K96/`). Follow-up K103.

## K99 (Done 2026-10-13)

- **K99** · The fog of war lifts at fixed stations along a move's run,
  the same at any frame rate, move speed or mid-flight tap (0097801,
  2026-10-13; `.claude/probes/K99/`). Follow-up K100.

## K73 (Done 2026-10-13)

- **K73** · Levi's UI batch: pathViz labels read fullPath / recentPath
  (f917282); codec v4, recentPath lights twice as far, trailLength
  5 -> 10, dailies keep 5 (a99967e); the mode badge, "Free play" off the
  daily and "Replay · not scored" (0772f63); off-screen indicators, the
  finish points the way (ce331bc). Done 2026-10-13; follow-ups K92, K94,
  K95, K96.

## K75 (Done 2026-10-13)

- **K75** · recentPath's yellow pulse banding: pulses now brighten the
  thread's own paint (8b1ae7c); `pulseReach` ends the junction's pulse
  trains a set distance out, default 3 (59cba84). Done 2026-10-13; phone
  gate in K10; follow-up K93.

## K67 (Done 2026-10-13)

- **K67** · G2's visible changes (`docs/design/G2_shader_paint.md` 3.8,
  plus the fan fix's one-strip-step edge ramps): signed off by Levi on
  2026-10-13. No change needed.

## K64 (Done 2026-10-13)

- **K64** · Sleep window: Levi kept the recommended 2.5 sim-s
  (2026-10-13). No change needed; K91 is the physics-off follow-up.

## K58 (Done 2026-10-13)

- **K58** · Reset path inside a daily stays a timed backtrack with one
  backtrack per retracted run (Levi, 2026-10-13). No change needed.

## K48 (Done 2026-10-13)

- **K48** · Desktop Share keeps copying to the clipboard (Levi,
  2026-10-13). No change needed.

## K53 (Done 2026-10-13)

- **K53** · Reduced motion: Levi chose an in-app Motion setting (follow
  system / full / reduced, a viewer preference) on 2026-10-13. Built in
  K79.

## K45 (Done 2026-10-12)

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

## K4 (Done 2026-10-12)

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

## K63 (Done 2026-10-12)

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

## K21 (Done 2026-10-12)

- **K21** · Shader noise backgrounds: `background` dropdown (none,
  vellum, mist, wash, silk, aurora, contours) and an intensity slider;
  screen-fixed, low-res and low-rate, colors from the design's gamut;
  fog draws the background in fogged areas; `none` is pixel-identical to
  master. Each effect adds 0.24-0.34 ms of GPU per frame at 3200x1800.
  Done in 66e80e9 (2026-10-12). Probes and contact sheets:
  `.claude/probes/K21/out/final/`.

## K41 (Done 2026-10-12)

- **K41** · Since the kink eyes (9920fab), Levi's rect link and the fat
  link never slept (93-95 ms of physics per frame at rest). Done in
  0e98804 and cb73eb5 (2026-10-12):
  - the capsule test solves its closest points in 3D (its 2D solve
    double-pushed twist-eye pairs, a cycle that predates the kink eyes);
  - the eye pressure follows a chord law, 2.6 widths;
  - ratchets intersect at every pass with both a joint and a twist twin;
  - crossing coverage continues through fused joints.

## K40 (Done, undated)

- **K40** · The lane-cut limiter stack (likely a no-op). Done in 99443cb:
  G1 deleted it along with the erase grid.

## K1 (Done 2026-10-11)

- **K1** · GPU migration G1: per-pixel crossing gaps. Done in 99443cb
  (casing masks in the ribbon fragment shader replace the erase grid,
  over-fills and fade strip; per-pixel protect for cyclic triangles,
  far-branch smooth-min for concave creases) and 0f25f0f (fused-tip cap
  cover) (2026-10-11). User URL: overcut 1098 -> 1 px and naked 510 -> 5
  (asleep, df373b5), draw calls 419 -> 47, update() 12.0 -> 5.7 ms; GPU
  0.79 -> 1.78 ms/frame at 3200x1800; phone defaults 39 -> 60 fps.
  History: "PER-PIXEL CROSSING GAPS" in `.claude/rules/render-gaps.md`.

## K31 (Done, undated)

- **K31** · Levi's phone collapsed crossing 305 (`?k88dtb.oHFEfg`) to
  3.37 ctrl. Re-checked on the phone (Pixel 11, USB) with the kink fix
  (9920fab): 305 rests at 8.58 ctrl with an open eye and a clean
  gap-faded crossing; all 22 kinks 8.0-15.0 ctrl (median 8.69); asleep
  at sim 7.0 s, wall 10.1 s. Closed in the commit that moved this item
  here (probe: `.claude/probes/probe_k31.mjs`).

## K28 (Done, undated)

- **K28** · Intro vs physics settle: Levi chose option (b) - no interim
  settle-first loader; the intro stays over the live settle until K7's
  worker lets it run at full frame rate (folded into K7's acceptance).

## K25 (Done, undated)

- **K25** · Pluck size default: Levi chose bigger. Done in the commit that
  moved this item here - pluckSize defaults to 1.75 (codec v3; v2 links
  keep 1), panel max 2 -> 3.

## K2 (Done, undated)

- **K2** · Kink loops squished shut. Done in 9920fab: an eye ratchet (7
  thread widths of rest length, rising at the twist-ratchet rate), eye
  pressure across each loop, and no fairing inside kink loops. Every
  kink eye at rest is now >= 0.8 thread widths on the five census URLs
  (user URL: min 0.17 -> 0.97, 16/21 -> 0 under target); fat + default
  sweeps 16/16 asleep (was 13/16).

## K18 (Done, undated)

- **K18** · vitest rewrote the byte-identity snapshot's line endings on
  Windows. Done in the commit that moved this item here: `.gitattributes`
  keeps `*.snap` LF in the working tree.

## K3 (Done, undated)

- **K3** · Render-only plucks plus a physics-off mode (settle, stop
  simulating, then the appear animation; pluck only, no tug). Done in
  df373b5.

## K17 (Done, undated)

- **K17** · Deep URLs such as `levi.dev/knotmaze/foo/bar` failed (the SPA
  fallback served the page under the wrong relative base). Done in the
  commit that moved this item here: `public/404.html` turns off Pages'
  SPA fallback and sends any unknown path to the app root, keeping the
  link's token.
