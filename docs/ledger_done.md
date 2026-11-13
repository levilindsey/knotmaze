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
  near diagonals every key tied (1 of 45 junctions in Levi's maze; K7 not
  involved). Now each run gets at most one key: at an X each key takes
  the diagonal arm clockwise of it, elsewhere the assignment minimizes
  the worst key's error, and differences under KEY_TIE are ignored so it
  doesn't flicker. Calls for Levi (reversible): clockwise, the 80 ms
  chord window, and a lone press waiting only when a chord would pick
  another run. `src/ui/key_moves.ts`, `src/main.ts`; lore: TIE CYCLES,
  CHORDS AND THE MOVE WAIT in `gameplay-moves.md`; probes
  `.claude/probes/K329/`. Leftovers: K348-K350. Done in 97f2840..2014dd0 (2026-10-14
  23:38).

## K333 (Done 2026-10-14)

- **K333** · Diagonal chords (Levi, 2026-10-14 about 22:20): two
  adjacent keys within 80 ms pick from the four diagonals, a held chord
  holds, opposite keys never chord, and the move pad chords the same
  way. Built with K329. Done in 97f2840..2014dd0 (2026-10-14 23:38).

## K334 (Done 2026-10-14)

- **K334** · No snap on a second press (Levi, 2026-10-14 about 22:20
  and 22:50): a key, pad press, tap or click during a move waits
  (`MoveWait`: the latest wins, the hover shows its pick) and is taken on
  the arrival frame, and a held arrow chains at the next junction with no
  gap. The real-time chase keeps its own queue;
  `__knotKeyMoves().setTapsWait(false)` restores the snap for A/Bs.
  Built with K329. Done in 97f2840..2014dd0 (2026-10-14 23:38).

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
  a7eb4a5..38b81d5 (2026-10-14 23:32).

## K325 (Done 2026-10-14)

- **K325** · The snoring cat on the panel's credit link (Levi,
  2026-10-14 about 22:05): the snore (Levi's own recording, 22:50: "It's
  a recording I made.", from hopnbop's `single_cat_snore.wav` as a
  64 kbps mono MP3, 7.8 KB) plays on hover and on touch-down, and a touch
  holds the link open briefly so it can play (desktop Chrome needs no
  delay). `src/audio/snore_sfx.ts`, `src/ui/snore_link.ts`; lore: THE
  SNORING CAT LINK in `gameplay-audio.md`. Leftovers: K342, K343. Done
  in 3adc864..e02bcc7 (2026-10-14 22:53).

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
  55c7a16..526b16b (2026-10-14 22:20).

## K317 (Done 2026-10-14)

- **K317** · More confetti by default (Levi, 2026-10-14 21:37: "We should
  show more confetti by default, both from the top, but especially from
  the finish marker."): the rain per amount 140 -> 280 and the finish's
  spray 40 -> 160; reduced motion keeps its 16 pieces. The phone's frame
  rate at the finish rides K156's next pass. Done in 46d9cf4 (2026-10-14
  21:53).

## K253 (Done 2026-10-14)

- **K253** · K193's portrait A/A floor, taken on a quiet phone (Levi lent
  it at about 20:33: "The phone will be untouched for 40 minutes"):
  `aa4`, master f3ab684 against itself, 20:37-21:02, 3 reps, no trip, 36
  of 36 samples at the emulated 411x753 @2.625. Installed as
  `scripts/phone_pass/noise.json` by `scripts/phone_pass/install_floor.mjs`;
  the landscape floor is kept as `noise.landscape.json`. The phone warmed
  from 29.4 to 40.0 C (skin), so the load floors are mostly heat;
  fabric@13 sat on the finish (K300). Lore: `probes-phone.md` ("THE
  PORTRAIT FLOOR"); evidence `.claude/probes/K253/aa4/`. Done in 54ef27a
  (2026-10-14 21:24).

## K193 (Done 2026-10-14)

- **K193** · The phone pass's orientation (Levi, 2026-10-14 about 11:10,
  email 4.1: "b seems best"): the pass emulates a 411x753 portrait
  viewport over CDP and leaves the phone as it sits. Stage 1 merged in
  d0bbfad..7b17da5 (14:10): `-Viewport portrait|native`, the proof
  (`scripts/phone_pass/emulation.mjs`) and viewport-clipped screenshots,
  which fixed K195's strip. Its A/A tripped on a touch twice (13:59,
  19:37); K253 took the portrait floor. Left over: K300 and K254-K256.
  `docs/design/K193.md` ("Stage 1 handoff"). Done in 54ef27a (2026-10-14
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
  read as noted, so K8 keeps its place. Levi's question on multithreaded
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
  1-300). Levi's link's A/B went from 6967 px off to 42 (all at 1/255).
  Done in e452556..34031a4 (merged 2026-10-14 20:45). Lore:
  `render-paint.md` ("RING LAPS"); sheets `.claude/probes/K299/sheet/`;
  `docs/design/K299_choice_pulse_bug.md` ("Stage 1 handoff").

## K264 (Done 2026-10-14)

- **K264** · The hover rim's width becomes a slider (Levi, 2026-10-14
  about 15:46, verbatim: "Rim width,0.4 is good, make it a slider., and
  personal setting."; read as a width slider, `hoverGlow` staying 0.4,
  both personal). Done in 80042d9..169835a (2026-10-14, K111 stage 4):
  `hoverGlowWidth` (`hgw`, codec v5 index 130, daily-exempt), default
  0.85, range 0.3-1 in steps of 0.05, the "Hover glow width" row under
  "Hover glow". `docs/design/K111.md` ("Stage 4 handoff"). Levi's 19:13
  follow-up (its own length, a shorter end fade, thickness, the glow on
  choices, a pick margin) is K298.

## K273 (Done 2026-10-14)

- **K273** · What a minotaur catch resets (Levi, 2026-10-14 about
  15:46, verbatim: "We should also have a toggle to conditionally reset
  the level/Minotaur/fog when dying to the Minotaur."). Done in
  40f74d1..dea013f (2026-10-14), on both clocks: `minoRestart` (`mrs`,
  off) restarts the level on a catch (the path, fog, fuse and clock; the
  tallies carry over), `minoLair` (`mlr`, on) off leaves the minotaur
  where it caught you, and `minoRefog` stays the fog's toggle (minoLair
  and minoRefog hide while minoRestart is on). `docs/design/K80_turns.md`
  ("Stage 2 handoff").

## K272 (Done 2026-10-14)

- **K272** · The turn minotaur's sliders at 0: roam 0 stood still while
  roaming, and territory 0 was a random walk (K80 turns stage 1). Done in
  40f74d1..dea013f (2026-10-14): both start at 1 (`MINO_RUNS_MIN`,
  `src/ui/url_state.ts`) in the panel, the codec reader and the
  key=value readers. Roam 0 as a sentry is K296.

## K283 (Done 2026-10-14)

- **K283** · The real game's end banners after K274, from a live solve.
  Done in K80 turns stage 2 (40f74d1..dea013f, 2026-10-14): its copy of
  `probe_stars.mjs` passed every run in a headed, hardware-GPU Chrome
  with real taps (checks by run: design 16, design at 411x753 touch 16,
  daily 32, caught 18, realtime 17, turnmino 21, turnmino with `&mrs=1`
  21; no page errors). `.claude/probes/K80/turns2/banner/`; the original
  probe's two stale checks are K295.

## K274 (Done 2026-10-14)

- **K274** · Explain each stat behind the win banner's info button (Levi,
  2026-10-14 about 16:01). Done in 63a72c6..1c42943 (2026-10-14): a `STATS`
  table in `src/game/maze_stats.ts` (one plain line per row id; a test
  fails on a row without its line or a line without its row), the end
  banners' "What the numbers mean" list (the Burnt banner and an unrated
  win get the info button too) and the daily stats view's legend. Its
  lines are in `docs/design/K274_K277.md` ("Stage 1 handoff") for Levi's
  review. Follow-ups: K282, K283.

## K277 (Done 2026-10-14)

- **K277** · Credit the research and techniques on the credits page
  (Levi, 2026-10-14 about 16:07). Done in 63a72c6..1c42943 (2026-10-14): eleven
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
  daily-exempt (K57), as built in 3de7cdb.

## K269 (Done 2026-10-14)

- **K269** · The turn hunter's catch rates on today's mazes (K80 turns
  stage 1: 14% of dailies for an attentive explorer, 32% at 80%, against
  the research's 1% and 13%). Levi, 2026-10-14 about 15:34: "Retune."
  Done in 40f74d1..dea013f (2026-10-14): sight 4 -> 2 and accuracy 0.9 ->
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
  fade and (d) view 5. Done in d199033..3de7cdb (2026-10-14 14:58, K111
  stage 3; 835 tests, same-state A/B 0 px, census max 0.61/255, no GPU
  cost). Its calls are K264 (width), K265 (High contrast) and K237
  (strength). Lore `render-paint.md` (HOVER GLOW); brief
  `docs/design/K111.md` ("Stage 3 handoff"); evidence
  `.claude/probes/K111/stage3/`; the worktree
  `.claude/worktrees/agent-a39facd348b84a113` is kept.

## K249 (Done 2026-10-14)

- **K249** · K111's rims and contrast modes stopped hard at junction
  webs and fans. Dropped 2026-10-14: the modes were removed in d199033
  (K111 stage 3), and the rim stays inside its run by design (K248).

## K250 (Done 2026-10-14)

- **K250** · An idle-render skip for the steady highlight modes.
  Dropped 2026-10-14: the modes were removed in d199033 (K111 stage 3).

## K198 (Done 2026-10-14)

- **K198** · The fit camera's pan and the off-screen indicators, decided
  (Levi, 2026-10-14 about 07:53, on K148 + K149's calls): "camera: I
  just want to be able to pan such that the right edge of the maze is
  shown to the left of the left edge of the panel. Flash: not sure what
  you're describing. Markers should have settings, and I guess we should
  prevent the excess pan." The coordinator's reading, emailed to Levi
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
  - stage 1 MERGED in 6d3774a..2f5c3fb (2026-10-14 09:31): the pan range
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
  - stage 2 brief: `docs/design/K198.md` ("Stage 2", fa656e3): a
    show/hide switch for the head and minotaur indicators beside the
    finish's, one size slider for all three, the head's delay, and
    time-based tweens for the panel limit and the displaced indicators.
  - Done in cf7010f..36f9ea7 (2026-10-14 14:03): stage 2. The panel's edge
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
  `src/ui/motion.ts`, K79). Brief `docs/design/K111.md` (37cc4b0): stage
  1 is the group, reduced motion and high contrast as far as today's
  settings reach (merged 2026-10-14 11:58, 698aba5..1da3cbc:
  `src/ui/accessibility.ts`, the Accessibility folder first in the
  panel; lore `gameplay-motion.md` ACCESSIBILITY GROUP and
  `gameplay-panel.md` ACCESSIBILITY FOLDER; Levi's review is K238).
  Stage 2, the highlight modes, ran 12:02-12:52 (brief 5df62e6).
  - Done in ce66042..a2b2f1a (2026-10-14 13:03): stage 2, the highlight
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
  plus K177's open checks. Brief `docs/design/K174.md` (824e090).
  - Done in 52a4e53..f258161 (2026-10-14 12:53): the paces are
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
  - Done in f0268b2..8960c18 (2026-10-14 12:44): `tapLobes()`
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
  - Done in f0268b2..8960c18 (2026-10-14 12:44): `handRendererLook()`
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
  - Done in 07bb21b..72faa82 (2026-10-14 12:04): `web_fade.ts` keeps a
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
  merged in c2eefd5).
  - Done in d0503b9..c795b42 (2026-10-14 11:55): `hoverGlow` (`hg`,
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
  design is lost). Levi's call (2) stands: under fog, a tap on the finish
  indicator only shows a toast. Files: `src/ui/tweakpane_panel.ts`,
  `src/main.ts`, `src/ui/mode_badge.ts`, `src/ui/url_state.ts`;
  `.claude/rules/gameplay-badge.md` (MODE BADGE). Brief
  `docs/design/K92.md` (one stage), plus K224 (the move pad over the open panel).
  - K80 (113ae4d): real time has no move undo (`undoAllowed(clock)`); if K92's buttons ever reach maze moves, they consult it.
  - Done in 4e61570..525819d (2026-10-14 10:08), with K224: a 100-step in-memory
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
  moves the player). Done in 4e61570..525819d (2026-10-14 10:08).

## K98 (Done 2026-10-14)

- **K98** · Marker sizes and two new glyphs (Levi, 2026-10-13). A
  `markerSize` slider (`mks`, codec index 104, daily-exempt): the black
  disc's diameter in thread widths, 0.25-3, default 1.08 (the pre-K83
  head dot), with every in-game marker at that size, the minotaur too
  (K80's 1.15x and its floor are gone). Colored dots are back at the
  start and finish (radius max(0.95 tw, r + 0.41 tw)); a horns glyph for
  the minotaur, and a spider glyph with no mesh yet (K226). Lore:
  `render-markers.md`; handoff: `docs/design/K98.md`; sheet:
  `.claude/probes/K98/sheet_k98.png`. Done in f036998..c9df8c9
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
  stage 2 is K145. Done in 2577ae2..c2eefd5 (2026-10-14).

## K173 (Done 2026-10-14)

- **K173** · Split the `.claude/rules/` lore by topic (Levi, 2026-10-14
  about 07:53: "Splitting the rules files seems worthwhile."). 32 new
  topic files with narrow `paths:` lists; the area files keep the general
  lore. Passages moved verbatim by a re-runnable script
  (`scripts/split_rules.mjs`), indexed in `docs/lore_index.md`. Lore
  attached per read: median 37.3 KB before, 5.8 after. Brief and handoff
  `docs/design/K173.md`, probes `.claude/probes/K173/`; follow-ups K214
  and K216, idea K215. Done in 484ecd6..0f9c8fe (2026-10-14).

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
  follow-ups K210-K212. Done in cf5bcde (2026-10-14).

## K100 (Done 2026-10-14)

- **K100** · The fog of war resets on a restart only (Levi, 2026-10-13).
  The controller counts restarts and the renderer clears the stamps when
  the count moves; walking back, a daily's Reset path and a K80 catch
  keep the fog (a catch used to clear it, against the K80 lore). A
  restore re-explores every tap in travel direction, as live play does
  (exact on a static daily; IoU 0.977 with physics). After a backtrack
  the fog-fit camera keeps framing the explored area. Brief and handoff
  `docs/design/K100.md`, probes `.claude/probes/K100/`; follow-ups
  K206-K209. Done in 354fadc (2026-10-14).

## K61 (Done 2026-10-14)

- **K61** · `encodeDelta` (the old `?daily=N.<delta>` writer), used only
  by tests. Done in cf5bcde (2026-10-14): K132 removed it and the delta
  reader.

## K203 (Done 2026-10-14)

- **K203** · K120's calls (`docs/design/K120.md`): the move pad on by
  default on coarse pointers, bottom right at 132 px, the 15 deg tie rule
  and the 200 ms hold, confirmed by Levi ("ok", 2026-10-14 about 07:53).
  Nothing to change (K120 merged in 47d9223).

## K200 (Done 2026-10-14)

- **K200** · K146 + K151's calls (`docs/design/K146_K151.md`): (1) free
  play's X always shows, on the desktop too; (2) the practice banner and
  share text, the daily badge's tap, the labels' daily numbers,
  History's rows and v2's late results, confirmed by Levi ("ok",
  2026-10-14 about 07:53). Done in 35bf7e1 (2026-10-14).
(items move here with the commit that resolved them)

## K120 (Done 2026-10-14)

- **K120** · Faster, smoother input (Levi, 2026-10-13): hold an arrow
  key to keep advancing, taking the branch that matches the key at each
  junction, and a quick control on phones.
  - Done in 26a2319..47d9223 (2026-10-14): arrow keys and WASD move by
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
  - Done in 5a51164..a8bbb5f (2026-10-14): daily store v3 (an attempt
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
  - Done in 5a51164..a8bbb5f (2026-10-14, with K146): one badge always
    shows (`src/ui/mode_badge.ts`: Free play, Daily #N, replay,
    practice), the HUD's title row is gone, and free play's X fades in on
    hover and always shows on coarse pointers (`MODE_BADGE_X_ON_COARSE`).
    Calls: K200.

## K148 (Done 2026-10-14)

- **K148** · An off-screen indicator for the player (Levi, 2026-10-13
  about 16:25: "When panning away from the current position, we should
  also show an offscreen indicator for it."). One agent with K149.
  - Done in 818ad90..18b76be (2026-10-14): the head is K73's third
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
  - Done in 818ad90..18b76be (2026-10-14, with K148):
    `src/ui/view_clamp.ts` (`PAN_SLACK`, 0.3 of the screen per side at
    every zoom); a reset from a slack-panned view eases instead of
    snapping. Calls: K198 (the phone's open panel).

## K180 (Done 2026-10-14)

- **K180** · K104's tuning calls as params, so Levi can try them by
  playing: pluckWhole (`pw`, 0-1.5, default 0.5), pluckCrossings (`pcx`:
  through | ride | pinch) and pluckGlow (`pgl`: off | instead | with |
  fallback); codec v4 appends 101-103, daily-exempt.
  - Done in d6795ca..85541bc (2026-10-14): 0 px against master at the
    defaults in 8 A/B cases; 605 tests. Probes `.claude/probes/K180/`
    (sheets `sheet/sheet_desktop.png`, `sheet_phone.png`); worktree
    `.claude/worktrees/agent-a5a195592e9da8700` kept. Calls: K194;
    residual: K196.

## K192 (Done, undated)

- **K192** · Probes that pin `paintClock` saw K169's gold web at fade
  level 0. Done in f054bbb (`scripts/phone_pass/walk.mjs` `pinAll()` sets
  `webFade.seconds = 0`; K81's untracked kits `g2lib.mjs`, `k83_ab.mjs`
  and `phone/k81phone.mjs` got the same line).

## K154 (Done 2026-10-14)

- **K154** · Our own hash in place of PCG2D, whose credit goes (Levi,
  2026-10-14 about 00:22, `docs/design/levi_notes_2026-10-14.md` item 10:
  "a, yes. b, swap in our own. c, none."): the Perlin and Scarborough Fair
  credits stay, and no technique gets a line. One agent with K169.
  - Done in acdd1f9..e03bbd2 (2026-10-14): `src/render/hash2d.ts` (a
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
  - Done in acdd1f9..e03bbd2 (2026-10-14): `src/render/web_fade.ts`, a
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
  - Done in 8b18498..9df308a (2026-10-14; deployed with 6b25b50): a rain
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
  - Done in 32df850..5d5b549 (2026-10-14): stars from the distance walked
    over the shortest route: three at 1.5x or less and never caught, two
    at 4x or less, one for any finish. 551 tests. Probes in
    `.claude/probes/K155/`; worktree
    `.claude/worktrees/agent-aa916ee7fa628963f` kept. Levi's calls: K184;
    the History rows' hover-only explanation: K187.

## K104 (Done 2026-10-14)

- **K104** · Plucks you can see at a glance (Levi, 2026-10-13: "Even
  maxing pluckSize to 3, I can't tell when some segments are plucked"):
  a set-amount vibration of the whole plucked segment with today's local
  lobes on top (Levi likes the locality); a gentler collapse than
  `COLLAPSE_ROUND`'s 1 h ("better, but still a bit too acute"; K77's
  A/B: 0.5 h left shoulders, 2 h erased most of the thinning); its own
  reduced-motion version (K79's Motion setting). K105 folds in (goal 4).
  - Done in 77225b0 (2026-10-14): stage 1c merged as 8bcd032..77225b0 on
    54ce560 (539 tests). Probes in `.claude/probes/K104/` (3595 files);
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
  Residuals K166-K168, Levi's call K169. Done in fd05619 (2026-10-13).

## K127 (Done 2026-10-13)

- **K127** · Fill a web with gold when every arm is traveled (K81's
  decision 4): built in K81's stage 3d. Done in 8133bdf (2026-10-13), with
  K81 (fd05619).

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
  b1897da (2026-10-13).

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
  `.claude/probes/K122/`. Done in 75d6fed (2026-10-13).

## K79 (Done 2026-10-13)

- **K79** · Backgrounds: speed, params, colors, Motion. Stage A
  (4a89e63, 2026-10-13 07:15): `backgroundSpeed` (codec v4 index 70,
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
  clashed). Residuals K157-K159, idea K160. Done in bbd71dc (2026-10-13).

## K110 (Done 2026-10-13)

- **K110** · Join every piece of the maze to the start (Levi,
  2026-10-13). One join per unreachable piece (a splice or a merge;
  splices whose bridge would cross another are skipped), else the exit
  moves to the next-nearest edge. Over 3780 designs, 331 had unreachable
  pieces and 0 do now (210 joined, 121 exits moved); no daily and no
  default-anchor rect moved, and every other plan is byte-identical. The
  K87 pin is re-frozen and its commit names the moved designs. Probes
  copied to `.claude/probes/K110/`; worktree
  `.claude/worktrees/agent-aaf7c3f05e4b74d9c` kept. Done in 98c4023
  (2026-10-13).

## K129 (Done 2026-10-13)

- **K129** · K79 stage B's two calls (Levi, 2026-10-13: "For color
  defaults, sure. For vellum scale, whatever is best."): the custom
  colors keep their proposed defaults (base #151b28; accents #7ab8cd,
  #cdb17a, #aa7acd). Vellum keeps its fiber floor (shrinking the fibers
  would alias), and the scale's max drops from 3 to 2: at 3 the wash and
  contours are nearly empty and the fibers read as long hatching (sheets
  in `.claude/probes/K79/out/view/`). Done in 28a5a64 and e936e48
  (2026-10-13), with K79 stage B (bbd71dc).

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
  `worktree-agent-ac664e8a9e271757a` (3b97e25), its worktree removed.

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
  `test/core/maze_solvable.test.ts`. Done in fcad57d (2026-10-13;
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
  (exact in practice). Done in 5402a45 (2026-10-13;
  `.claude/probes/K108/`). Follow-up K109.

## K87 (Done 2026-10-13)

- **K87** · The maze plan's `pickFarthest` rescanned every candidate
  against every placed point on every pick (~88% of the plan). It now
  keeps a running minimum per candidate, pick-for-pick identical: 415 of
  415 whole plans in `.claude/probes/K87/identity.ts`, and the CI pin
  `test/core/maze_plan_identity.test.ts` against the frozen pre-K87
  module. Plan build at gs 24 defaults 174 -> 6.9 ms median (1.4 s ->
  30 ms worst), dense maps 1.7 s -> 25 ms (15.4 s -> 104 ms worst). Done
  in d4564a4 (2026-10-13). Follow-up K108.

## K77 (Done 2026-10-13)

- **K77** · Plucks showed sharp, wedge-like depressions (Levi): the base
  collapse met its limits (footprint ramps, tight bends, gap fades) in
  min()s. `roundCollapse` now opens the collapse depth with raised-cosine
  bumps, so the narrowed edge bends no tighter than 1 h; same-state worst
  second difference -5.7 -> -0.98 (bound -1). Cost per pluck layout
  (desktop, `.claude/probes/K77/k77_cost.ts`): 0.02-0.3 ms; a whole chain
  at full depth costs n x h/per (1 ms at n 2000, h/per 8). Done in
  5091ff3 + 4c9eba4 (2026-10-13; `.claude/probes/K77/`). Follow-ups
  K104-K107.

## K101 (Done 2026-10-13)

- **K101** · Music mode timed its notes from `performance.now()` in the
  render tick, so onsets landed up to a frame late and the tempo
  stretched (1.8% at 60 fps, 13.4% with 150 ms frames). Notes are now
  scheduled 0.3 s ahead on the audio clock and start sample-accurately
  in the worklet; measured at 60 fps and 150 ms frames, the interval
  error is at most 0.02 ms and the stretch is 0. Done in a913d58
  (2026-10-13; `.claude/probes/K101/`). Residual in K103.

## K83 (Done 2026-10-13)

- **K83** · Placeholder marker icons (Levi): black discs with white
  stroked glyphs for the start, finish and head; the finish's off-screen
  indicator wears the same glyph. Phone gate passed (K10, 2026-10-13).
  Done in 21a525e + 2c4c603 (2026-10-13; `.claude/probes/K83/`).
  Follow-ups K98, K99.

## K96 (Done 2026-10-13)

- **K96** · The follow camera reaches the head at the same real speed at
  any frame rate: it steps by real elapsed time in substeps of at most
  0.05 s. t95 at 151 ms frames went 8.6 s -> 4.4 s; 60 Hz is unchanged.
  Done in a24f104 (2026-10-13; `.claude/probes/K96/`). Follow-up K103.

## K99 (Done 2026-10-13)

- **K99** · The fog of war lifts at fixed stations along a move's run,
  the same at any frame rate, move speed or mid-flight tap (ff33b24,
  2026-10-13; `.claude/probes/K99/`). Follow-up K100.

## K73 (Done 2026-10-13)

- **K73** · Levi's UI batch: pathViz labels read fullPath / recentPath
  (0a9e57b); codec v4, recentPath lights twice as far, trailLength
  5 -> 10, dailies keep 5 (f136d42); the mode badge, "Free play" off the
  daily and "Replay · not scored" (1cc7896); off-screen indicators, the
  finish points the way (7a6bba2). Done 2026-10-13; follow-ups K92, K94,
  K95, K96.

## K75 (Done 2026-10-13)

- **K75** · recentPath's yellow pulse banding: pulses now brighten the
  thread's own paint (a1e1cc1); `pulseReach` ends the junction's pulse
  trains a set distance out, default 3 (ecd6b22). Done 2026-10-13; phone
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
  77e1aad and 73d2365 (2026-10-12).
  - 717 of 720 old sentences sit in exactly one new file; the other 3
    are pointer rewrites (`.claude/probes/K45/verify.py`).
  - Rules load checked in a `claude -p` transcript; vitest 315.

## K4 (Done 2026-10-12)

- **K4** · G2: per-sample color work runs in the shaders. Section colors,
  the reveal and its FX, and gameplay paint are evaluated per pixel from
  data textures (CPU mirror: `src/render/paint_math.ts`), and junction
  fans read per-arm material strips rendered once per frame
  (`src/render/arm_strip.ts`). Done in bfa17d8..77a1e8f (2026-10-12).
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
  (`src/physics/sleep_gate.ts`), on every device. Done in f308bb9,
  01b5c26 and fdc7772 (2026-10-12).
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

## K19 + K20 (Done 2026-10-12)

- **K19 + K20** · Maze stats (time, efficiency, junctions, dead ends) in
  the HUD and win banner, and a Wordle-style daily maze: `?daily`, Daily
  #1 = 2026-10-12, pinned by the frozen `DAILY_V1`, results and streaks
  in localStorage, emoji-grid share. Also: the last three MazeParams
  joined the codec, and the app now starts with storage blocked. Done in
  3b3e028 and 29b42a1 (2026-10-12). Probes: `.claude/probes/K19-K20/`.

## K41 (Done 2026-10-12)

- **K41** · Since the kink eyes (9920fab), Levi's rect link and the fat link never slept: the capsule test now solves its closest points in 3D, the eye pressure follows a chord law (2.6 widths), ratchets intersect at every pass, and crossing coverage continues through fused joints (`test/physics/sleep.regression.test.ts`). Done in 0e98804 and cb73eb5 (2026-10-12).

  Results: both links asleep at sim 7.0-7.3, and frame cost at rest
  111-119 -> 5.0-7.5 ms. Browser sweeps 32/32 asleep and gesture battery
  48/48. Guarded by `test/physics/sleep.regression.test.ts`.

## K21 (Done 2026-10-12)

- **K21** · Shader noise backgrounds: a `background` dropdown (none, vellum, mist, wash, silk, aurora, contours) and an intensity slider; screen-fixed, low-res and low-rate, and `none` is pixel-identical to master. Done in 66e80e9 (2026-10-12).

## K47 + K56 (Done 2026-10-12)

- **K47 + K56** · Saved daily attempts, and the daily as the front door.
  Done in 359b458 and b3f96c9 (2026-10-12).
  - A bare URL opens today's daily; any other query, or a non-exempt
    panel edit, leaves it with a "your attempt is saved" toast.
  - The attempt (its taps, fingerprinted) is saved on every move and on
    hide, and restored with a paused clock. Reset path inside a daily is
    a timed backtrack.
  - Schema v2 with v1 migration; exempt preferences persist across
    dailies.
  - Verified: vitest 287, and 99/99 browser checks across 18 modes.
    Probes: `.claude/probes/K19-K20/` (results in `results_K47/`).

## K63 (Done 2026-10-12)

- **K63** · The sleep gate counted 45 still frames, so every real settle slept at exactly sim 7.0; it now counts 2.5 simulated seconds of quiet (`src/physics/sleep_gate.ts`), on every device. K64 is the speed trade. Done in f308bb9, 01b5c26 and fdc7772 (2026-10-12).

## K4 (Done 2026-10-12)

- **K4** · G2: per-sample color work runs in the shaders. Section colors, the reveal and its FX, and gameplay paint are evaluated per pixel from data textures (CPU mirror `src/render/paint_math.ts`), and junction fans read per-arm material strips (`src/render/arm_strip.ts`); record `docs/design/G2_shader_paint.md` section 7. Sign-off K67; G2.4 (GPU particles) is K23. Done in bfa17d8..77a1e8f (2026-10-12).

## K45 (Done 2026-10-12)

- **K45** · CLAUDE.md slimmed from 2,250 lines (about 39k tokens) to about 240 (about 5k): history moved verbatim to `docs/history.md`, subsystem lore to path-scoped `.claude/rules/` files. Done in 77e1aad and 73d2365 (2026-10-12).

## K53 (Done 2026-10-13)

- **K53** · Reduced motion: Levi chose an in-app Motion setting (follow system / full / reduced, a viewer preference); built in K79. Done (2026-10-13).

## K48 (Done 2026-10-13)

- **K48** · Desktop Share keeps copying to the clipboard (Levi); no change needed. Done (2026-10-13).

## K58 (Done 2026-10-13)

- **K58** · Reset path inside a daily stays a timed backtrack with one backtrack per retracted run (Levi); no change needed. Done (2026-10-13).

## K64 (Done 2026-10-13)

- **K64** · Sleep window: Levi kept the recommended 2.5 sim-s, no change needed (K91 is the physics-off follow-up). Done (2026-10-13).

## K67 (Done 2026-10-13)

- **K67** · G2's visible changes (`docs/design/G2_shader_paint.md` 3.8, plus the fan fix's one-strip-step edge ramps): signed off by Levi, no change needed. Done (2026-10-13).

## K75 (Done 2026-10-13)

- **K75** · recentPath's yellow pulse banding: pulses now brighten the thread's own paint, and `pulseReach` ends the junction's pulse trains a set distance out (default 3). Follow-up K93. Done in a1e1cc1 and ecd6b22 (2026-10-13).

## K73 (Done 2026-10-13)

- **K73** · Levi's UI batch: pathViz labels, codec v4 (recentPath lights twice as far, trailLength 5 -> 10, dailies keep 5), the mode badge, and off-screen indicators (the finish points the way). Follow-ups K92, K94, K95, K96. Done in 0a9e57b, f136d42, 1cc7896 and 7a6bba2 (2026-10-13).

## K99 (Done 2026-10-13)

- **K99** · The fog of war lifts at fixed stations along a move's run, the same at any frame rate, move speed or mid-flight tap. Follow-up K100. Done in ff33b24 (2026-10-13).

## K96 (Done 2026-10-13)

- **K96** · The follow camera reaches the head at the same real speed at any frame rate (real elapsed time, substeps of at most 0.05 s). Follow-up K103. Done in a24f104 (2026-10-13).

## K83 (Done 2026-10-13)

- **K83** · Placeholder marker icons: black discs with white stroked glyphs for the start, finish and head; the finish's off-screen indicator wears the same glyph. Follow-ups K98, K99. Done in 21a525e + 2c4c603 (2026-10-13).

## K101 (Done 2026-10-13)

- **K101** · Music mode timed its notes from the render tick, so onsets landed up to a frame late and the tempo stretched; notes are now scheduled 0.3 s ahead on the audio clock. Residual in K103. Done in a913d58 (2026-10-13).

## K77 (Done 2026-10-13)

- **K77** · Plucks showed sharp, wedge-like depressions: `roundCollapse` now opens the collapse depth with raised-cosine bumps, so the narrowed edge bends no tighter than 1 h. Follow-ups K104-K107. Done in 5091ff3 + 4c9eba4 (2026-10-13).

## K87 (Done 2026-10-13)

- **K87** · The maze plan's `pickFarthest` rescanned every candidate against every placed point; it now keeps a running minimum per candidate, pick-for-pick identical (CI pin `test/core/maze_plan_identity.test.ts`). Follow-up K108. Done in d4564a4 (2026-10-13).

## K108 (Done 2026-10-13)

- **K108** · Generation builds the same maze in every browser: only spec-exact operations plus `src/util/det_math.ts` (`hypot2` = V8's Math.hypot), guarded by `test/core/deterministic_math.test.ts` and `test/util/det_math.test.ts`. Follow-up K109. Done in 5402a45 (2026-10-13).

## K109 (Done 2026-10-13)

- **K109** · Every maze has a route from the start to the exit: a piece model (`planTailsJoined`) predicts the walk graph's verdict before surgery, and a plan whose tails do not meet is rebuilt with `repairTailRoute` (`test/core/maze_solvable.test.ts`). Follow-up K110. Done in fcad57d (2026-10-13).

## K94 (Done 2026-10-13)

- **K94** · The mouse wheel still zooms on Levi's hardware, so the fractional-delta test in `src/main.ts` stays. Decided, no change (2026-10-13).

## K52 (Done 2026-10-13)

- **K52** · Default background: Levi kept `vellum`, static at auto speed. Decided, no change (2026-10-13).

## K49 (Done 2026-10-13)

- **K49** · Kink eye size: Levi kept 2.6 widths over 2.8 (`.claude/probes/K49/`); the 2.8 one-liner stays on branch `worktree-agent-ac664e8a9e271757a` (3b97e25). Decided, no change (2026-10-13).

## K105 (Done 2026-10-13)

- **K105** · Scale a pluck's sympathetic lobes from the tapped lobe's capped amplitude (K77 finding). Dropped: folded into K104 (its goal 4), done in f883c75 (2026-10-13).

## K86 (Done 2026-10-13)

- **K86** · Long dead ends (Levi: "ensure longer dead end paths with no junctions"). Dropped: folded into K74 stage 1 (Levi's decision 5, 2026-10-13).

## K121 (Done 2026-10-13)

- **K121** · The player's disc hides the start of each move pulse (K98's call 4). Dropped: Levi keeps it as is (2026-10-13).

## K129 (Done 2026-10-13)

- **K129** · K79 stage B's two calls: the custom colors keep their proposed defaults, and the vellum scale's max drops from 3 to 2 (the fiber floor stays). Done in 28a5a64 and e936e48 (2026-10-13), with K79 stage B (bbd71dc).

## K110 (Done 2026-10-13)

- **K110** · Join every piece of the maze to the start: one join per unreachable piece (a splice or a merge), else the exit moves to the next-nearest edge; the K87 pin was re-frozen. Done in 98c4023 (2026-10-13).

## K79 (Done 2026-10-13)

- **K79** · Backgrounds: `backgroundSpeed` (`bgs`, max 8), vellum drift, the Motion setting (`src/ui/motion.ts`, K53), and per-effect params and custom colors as codec v4 appends 72-81 (`docs/design/K79.md`). Residuals K157-K159, idea K160. Done in bbd71dc (2026-10-13).

## K122 (Done 2026-10-13)

- **K122** · Third-party license notices (K117): the build emits `licenses.html` from the packages the bundle really contains, the panel's credit line links to it, and the build and `npm test` fail on an unlicensed package; hand-written credits live in `notices/credits.ts` (`docs/design/K122.md`, `.claude/rules/notices.md`). Levi's calls on them: K154. Done in 75d6fed (2026-10-13).

## K147 (Done 2026-10-13)

- **K147** · A smooth intro on load: a per-frame physics budget (`src/physics/settle_budget.ts`) from the first visible frame to the first sleep, and the hidden pre-settle in chunks behind the loader (`stb`, `lds`; `docs/design/K147.md`). Calls K162; residuals K163-K165. Done in b1897da (2026-10-13).

## K127 (Done 2026-10-13)

- **K127** · Fill a web with gold when every arm is traveled (K81's decision 4), built in K81's stage 3d. Done in 8133bdf (2026-10-13), with K81 (fd05619).

## K81 (Done 2026-10-13)

- **K81** · The traveled highlight at junctions: a smooth gold arc from the arrival arm to the departure arm (`src/render/junction_routes.ts`) and K127's fully traveled web (`docs/design/K81.md`). Residuals K166-K168, call K169. Done in fd05619 (2026-10-13).

## K171 (Done 2026-10-14)

- **K171** · The phone pass's retry never wakes or unlocks the phone, so with the phone asleep it exits 3. Dropped: folded into K156 3c, which builds a read-only wait for the phone (Levi chose a pass that waits, 2026-10-14).

## K152 (Done 2026-10-14)

- **K152** · Leaner verification: one scripted phone pass per merge round (K156), small UI items without a perf lock or phone gate, render prototypes skipping the CPU mirror until a look is picked; the pins, sleep checks and GPU parity stay. Levi approved all of it; the Next intro carries it. Done (2026-10-14).

## K183 (Done 2026-10-14)

- **K183** · The phone was asleep and locked at 23:14 (2026-10-13); Levi left it awake and unlocked on its charger and K156 3c launched at about 00:56. Done (2026-10-14).

## K104 (Done 2026-10-14)

- **K104** · Plucks you can see at a glance: a set-amount vibration of the whole segment with today's local lobes on top, a gentler collapse and its own reduced-motion version. Tuning calls went to K180, the cold-link stall to K185, residuals to K181. Done in 77225b0 (2026-10-14).

## K155 (Done 2026-10-14)

- **K155** · A star rating for each finish: stars from the distance walked over the shortest route (three at 1.5x or less and never caught, two at 4x or less, one for any finish). Calls K184; the History rows' hover-only explanation K187. Done in 32df850..5d5b549 (2026-10-14).

## K140 (Done 2026-10-14)

- **K140** · Finish confetti: a rain from the top plus a spray from the finish, render-only; `cf` and `cfa` at codec 99-100, daily-exempt. Calls K186; residuals K188, K189. Done in 8b18498..9df308a (2026-10-14).

## K169 (Done 2026-10-14)

- **K169** · Fade K127's gold web in over about 0.25 s: `src/render/web_fade.ts`, a smoothstep from the untraveled base to the gold one. Calls K191; probes that pin `paintClock`: K192. Done in acdd1f9..e03bbd2 (2026-10-14).

## K154 (Done 2026-10-14)

- **K154** · Our own hash in place of PCG2D, whose credit goes: `src/render/hash2d.ts` (tests in `test/render/hash2d.test.ts`; GPU parity 0 of 524288 words off). The desktop cost is K190. Done in acdd1f9..e03bbd2 (2026-10-14).

## K180 (Done 2026-10-14)

- **K180** · K104's tuning calls as params: pluckWhole (`pw`), pluckCrossings (`pcx`) and pluckGlow (`pgl`), codec v4 indices 101-103, daily-exempt; 0 px against master at the defaults. Calls K194; residual K196. Done in d6795ca..85541bc (2026-10-14).

## K149 (Done 2026-10-14)

- **K149** · Room to pan the maze partly off screen at the fit zoom (`src/ui/view_clamp.ts`, `PAN_SLACK`). Calls K198. Done in 818ad90..18b76be (2026-10-14, with K148).

## K148 (Done 2026-10-14)

- **K148** · An off-screen indicator for the player: the head is K73's third indicator client (`src/ui/head_indicator.ts`; a tap returns the camera to the head). Calls K198; idea K199. Done in 818ad90..18b76be (2026-10-14).

## K151 (Done 2026-10-14)

- **K151** · The mode badge: one badge always shows (`src/ui/mode_badge.ts`: Free play, Daily #N, replay, practice) and free play's X fades in on hover. Calls K200. Done in 5a51164..a8bbb5f (2026-10-14, with K146).

## K146 (Done 2026-10-14)

- **K146** · Past dailies, playable without credit: daily store v3 (a late attempt finishes as practice, outside every aggregate), a History listing every past daily, a practice banner and share title. Calls K200; residuals K201, K202. Done in 5a51164..a8bbb5f (2026-10-14).

## K120 (Done 2026-10-14)

- **K120** · Faster, smoother input: arrow keys and WASD move by direction (`src/ui/key_moves.ts`: 70 deg match, 15 deg tie, 200 ms hold) and a touch move pad (`src/ui/move_pad.ts`). Calls K203; idea K204; residuals K205. Done in 26a2319..47d9223 (2026-10-14).

## K200 (Done 2026-10-14)

- **K200** · K146 + K151's calls (`docs/design/K146_K151.md`): free play's X always shows, and the practice banner, share text, badge tap, labels' daily numbers, History's rows and v2's late results; Levi confirmed ("ok"). Done in 35bf7e1 (2026-10-14).

## K203 (Done 2026-10-14)

- **K203** · K120's calls (`docs/design/K120.md`): the move pad on by default on coarse pointers, bottom right at 132 px, the 15 deg tie rule and the 200 ms hold; Levi confirmed ("ok"), nothing to change. Done (2026-10-14).

## K61 (Done 2026-10-14)

- **K61** · `encodeDelta` (the old `?daily=N.<delta>` writer), used only by tests. Done in cf5bcde (2026-10-14): K132 removed it and the delta reader.

## K100 (Done 2026-10-14)

- **K100** · The fog of war resets on a restart only (walking back, a daily's Reset path and a K80 catch keep it): the controller counts restarts and the renderer clears the stamps when the count moves (`docs/design/K100.md`). Follow-ups K206-K209. Done in 354fadc (2026-10-14).

## K132 (Done 2026-10-14)

- **K132** · Drop link and daily back-compat: one live codec table (`CODEC_PARAMS`), CODEC_V1-V4, the delta blobs and DAILY_V1 removed, an all-default design writes `?<seed>`; no pin moved (`docs/design/K132.md`). Follow-ups K210-K212. Done in cf5bcde (2026-10-14).

## K173 (Done 2026-10-14)

- **K173** · Split the `.claude/rules/` lore by topic: 32 new topic files with narrow `paths:`, moved verbatim by `scripts/split_rules.mjs` and indexed in `docs/lore_index.md` (`docs/design/K173.md`). Follow-ups K214, K216; idea K215. Done in 484ecd6..0f9c8fe (2026-10-14).

## K93 (Done 2026-10-14)

- **K93** · Trail fade and hover reach: the trail piece holding the fade start splits in two (`src/render/trail_paint.ts`), and the choice hover stops at `pulseReach` and fades in every path mode (`docs/design/K93_K145.md`). Follow-ups K217-K220; stage 2 is K145. Done in 2577ae2..c2eefd5 (2026-10-14).

## K98 (Done 2026-10-14)

- **K98** · Marker sizes and two new glyphs: a `markerSize` slider (`mks`, codec 104, daily-exempt, default 1.08), colored dots back at the start and finish, a horns glyph for the minotaur (lore `render-markers.md`; `docs/design/K98.md`). The spider glyph is K226, the default size K225. Done in f036998..c9df8c9 (2026-10-14).

## K224 (Done 2026-10-14)

- **K224** · The K120 move pad drew over the open panel on the phone; K92 hides the pad while the panel is open. Done in 4e61570..525819d (2026-10-14).

## K92 (Done 2026-10-14)

- **K92** · Undo and redo for design changes: a 100-step history (`src/ui/undo_stack.ts`), buttons beside the panel button (`src/ui/undo_buttons.ts`), the badge on its own row (lore `gameplay-panel.md`, `gameplay-badge.md`; `docs/design/K92.md`). The panel's lower top is K229. Done in 4e61570..525819d (2026-10-14).

## K219 (Done 2026-10-14)

- **K219** · Whether the choice hover needs a floor at low `pulseReach`: Levi, "Hover should honor the slider." No floor; nothing to change. Done (2026-10-14).

## K145 (Done 2026-10-14)

- **K145** · A subtle hover glow on runs that aren't choices: `hoverGlow` (`hg`, codec 105, default 0.4, daily-exempt), a G2 rim term with its `paint_math` mirror (lore `render-paint.md`, HOVER GLOW; `docs/design/K93_K145.md`). Residuals K236; the default and exemption K237. Done in d0503b9..c795b42 (2026-10-14).

## K191 (Done 2026-10-14)

- **K191** · K169's two calls: a web that stops being full fades its gold out over the same 0.25 s, and reduced Motion keeps the fade (`web_fade.ts`; lore `render-web-fade.md`; `docs/design/K154_K169.md`). Done in 07bb21b..72faa82 (2026-10-14).

## K239 (Done 2026-10-14)

- **K239** · A fresh static page drew its first frame before the renderer had its fade and flow: `handRendererLook()` in `main.ts` now hands the renderer every look param before each `update()` (lore `gameplay-motion.md`). A paused page with the instant intro is K243. Done in f0268b2..8960c18 (2026-10-14).

## K235 (Done 2026-10-14)

- **K235** · Taps inside junction cores make no sound (`tapLobes()` in `pluck_model.ts`; lore `render-pluck.md`; `docs/design/K235_K239.md`). Done in f0268b2..8960c18 (2026-10-14).

## K174 (Done 2026-10-14)

- **K174** · The minotaur's controls (Levi's K80 stage 1 calls): the paces as fractions of `playerPace` (`mwp` 0.5, `mhp` 0.7), and `minoToward` (`mtw`) and `minoRefog` (`mrf`) checkboxes, tuned on the K80 sim (lore `gameplay-minotaur.md`; `docs/design/K174.md`). Follow-ups K245-K247. Done in 52a4e53..f258161 (2026-10-14).

## K111 (Done 2026-10-14)

- **K111** · Accessibility: an Accessibility folder first in the panel with High contrast and Reduced motion master checkboxes (`src/ui/accessibility.ts`; stage 1 698aba5..1da3cbc, review K238); stage 2's highlight modes were later removed (K248). Done in ce66042..a2b2f1a (2026-10-14).

## K198 (Done 2026-10-14)

- **K198** · The fit camera's pan and the off-screen indicators: the pan range lets the maze's edge reach the open panel's edge (`src/ui/view_clamp.ts`), the finish, head and minotaur indicators get show/hide switches and one size slider, the head's disc waits 0.45 s off screen, and the panel limit and displaced indicators tween (lore `gameplay-camera.md`, `gameplay-indicators.md`; `docs/design/K198.md`). The disc's slide across the panel is K251, residuals K252. Stage 1 6d3774a..2f5c3fb. Done in cf7010f..36f9ea7 (2026-10-14).

## K250 (Done 2026-10-14)

- **K250** · An idle-render skip for the steady highlight modes. Dropped: the modes were removed in d199033 (2026-10-14).

## K249 (Done 2026-10-14)

- **K249** · K111's rims and contrast modes stopped hard at junction webs and fans. Dropped: the modes were removed in d199033 (2026-10-14).

## K248 (Done 2026-10-14)

- **K248** · Levi's highlight pick: the choices keep the pulses and a hovered choice keeps today's look; `highlightMode` and its modes went (CODEC_VERSION 5), and a hover off the choices gets K145's rim reshaped (lore `render-paint.md`, HOVER GLOW; `docs/design/K111.md`, "Stage 3 handoff"). Calls: K264, K265, K237. Done in d199033..3de7cdb (2026-10-14).

## K269 (Done 2026-10-14)

- **K269** · The turn hunter's catch rates on today's mazes: Levi said retune; sight 4 -> 2 and accuracy 0.9 -> 0.3 take the hunter to 1.0% / 13.1% on H1 mazes. The stalker and the treelike sets paid for it: K294. Done in 40f74d1..dea013f (2026-10-14).

## K237 (Done 2026-10-14)

- **K237** · The hover rim's strength: `hoverGlow` stays 0.4 and daily-exempt (K57), as built. Done in 3de7cdb (2026-10-14).

## K275 (Done 2026-10-14)

- **K275** · Junction joints and dead-end caps fade with their thread under thread reveal (K76): Levi said yes to the fade (`docs/design/K76.md`, "Stage 2b handoff"); K268 stage 2 and K76 stage 2c build it. Done (2026-10-14).

## K277 (Done 2026-10-14)

- **K277** · Credit the research and techniques on the credits page: eleven `RESEARCH` entries in `notices/credits.ts`, worded as use, never endorsement. Follow-ups K284, K285. Done in 63a72c6..1c42943 (2026-10-14).

## K274 (Done 2026-10-14)

- **K274** · Explain each stat behind the win banner's info button: a `STATS` table in `src/game/maze_stats.ts`, the banners' "What the numbers mean" list and the stats view's legend (`docs/design/K274_K277.md`). Follow-ups K282, K283. Done in 63a72c6..1c42943 (2026-10-14).

## K283 (Done 2026-10-14)

- **K283** · The real game's end banners after K274, checked from a live solve (`.claude/probes/K80/turns2/banner/`; the original probe's two stale checks are K295). Done in 40f74d1..dea013f (2026-10-14).

## K272 (Done 2026-10-14)

- **K272** · The turn minotaur's sliders at 0 (roam 0 stood still, territory 0 was a random walk): both now start at 1 (`MINO_RUNS_MIN`); roam 0 as a sentry is K296. Done in 40f74d1..dea013f (2026-10-14).

## K273 (Done 2026-10-14)

- **K273** · What a minotaur catch resets: `minoRestart` (`mrs`, off) restarts the level, `minoLair` (`mlr`, on) off leaves the minotaur where it caught you, `minoRefog` stays the fog's toggle (`docs/design/K80_turns.md`, "Stage 2 handoff"). Done in 40f74d1..dea013f (2026-10-14).

## K264 (Done 2026-10-14)

- **K264** · The hover rim's width becomes a slider: `hoverGlowWidth` (`hgw`, codec 130, daily-exempt, default 0.85); Levi's follow-up is K298 (`docs/design/K111.md`, "Stage 4 handoff"). Done in 80042d9..169835a (2026-10-14).

## K299 (Done 2026-10-14)

- **K299** · The choice pulses and the trail misdrawn at one junction: `kArcOfCtrl` wrapped a closed chain's ctrl through a float division the GPU rounds; fixed with integer-corrected laps (`kLapOf`, `kWrap`; lore `render-paint.md`, RING LAPS; `docs/design/K299_choice_pulse_bug.md`). Done in e452556..34031a4 (2026-10-14).

## K302 (Done 2026-10-14)

- **K302** · K7's 11 calls (`docs/design/K7_worker.md`, "Levi's calls"): all yes, as recommended; Levi's multithreaded-WASM question went to K316 and call (4) led to K313. Done (2026-10-14).

## K193 (Done 2026-10-14)

- **K193** · The phone pass's orientation: it emulates a 411x753 portrait viewport over CDP (`-Viewport portrait|native`, `scripts/phone_pass/emulation.mjs`; stage 1 d0bbfad..7b17da5); K253 took the portrait floor. Left over: K300, K254-K256; `docs/design/K193.md`. Done in 54ef27a (2026-10-14).

## K253 (Done 2026-10-14)

- **K253** · K193's portrait A/A floor, taken on a quiet phone (`aa4`, 36 of 36 samples at 411x753), installed as `scripts/phone_pass/noise.json` (lore `probes-phone.md`, THE PORTRAIT FLOOR; evidence `.claude/probes/K253/aa4/`). Done in 54ef27a (2026-10-14).

## K317 (Done 2026-10-14)

- **K317** · More confetti by default (the rain per amount 140 -> 280, the finish's spray 40 -> 160; reduced motion keeps its 16 pieces); the phone's frame rate rides K156's next pass. Done in 46d9cf4 (2026-10-14).

## K298 (Done 2026-10-14)

- **K298** · The hover glow, its own stage: `hoverGlowLength` (`hgl`), `hoverGlowFade` (`hgf`), the glow also on a hovered choice, and mouse pick margins in screen px (`pickMargin` `pkm`, `pickChoiceRatio` `pkr`; touch keeps today's, K331). Left over: K327, K328, K330, K331; `docs/design/K298_hover_glow.md`. Done in 55c7a16..526b16b (2026-10-14).

## K325 (Done 2026-10-14)

- **K325** · The snoring cat on the panel's credit link: Levi's own recording plays on hover and touch-down (`src/audio/snore_sfx.ts`, `src/ui/snore_link.ts`; lore `gameplay-audio.md`, THE SNORING CAT LINK). Leftovers K342, K343. Done in 3adc864..e02bcc7 (2026-10-14).

## K335 (Done 2026-10-14)

- **K335** · The confetti rain's top edge: the rain's releases taper over 2.2 s and a later piece starts up to 0.12 screen heights higher, so the wave thins out raggedly (`src/render/confetti_model.ts`; lore `render-confetti.md`). K336 and K337 stay deferred. Done in a7eb4a5..38b81d5 (2026-10-14).

## K334 (Done 2026-10-14)

- **K334** · No snap on a second press: a key, pad press, tap or click during a move waits (`MoveWait`, the latest wins) and is taken on the arrival frame; built with K329. Done in 97f2840..2014dd0 (2026-10-14).

## K333 (Done 2026-10-14)

- **K333** · Diagonal chords: two adjacent keys within 80 ms pick from the four diagonals, opposite keys never chord, and the move pad chords the same way; built with K329. Done in 97f2840..2014dd0 (2026-10-14).

## K329 (Done 2026-10-14)

- **K329** · The arrow keys at a 4-way junction: each run now gets at most one key (at an X, the diagonal arm clockwise of the key; differences under KEY_TIE ignored), in `src/ui/key_moves.ts` (lore `gameplay-moves.md`, TIE CYCLES, CHORDS AND THE MOVE WAIT). Leftovers K348-K350. Done in 97f2840..2014dd0 (2026-10-14).

## K288 (Done 2026-10-14)

- **K288** · K279's pluck picks: glint is the default ripple (`prp`), the rest stays as built, and the wave keeps bending the markers, trail and fog; K279 stage 2 builds them. Done (2026-10-14).

## K286 (Done 2026-10-14)

- **K286** · K268's draw order in a fading crossing: kept as built (Levi took the recommendation). Done (2026-10-14).

## K257 (Done 2026-10-14)

- **K257** · K76 section 10's questions: Levi took every recommendation; K76 2c builds them. Done (2026-10-14).

## K344 (Done 2026-10-15)

- **K344** · The pluck blur's sharp cusp in a self-crossing loop: an under node's clip now stops short of the loop's own over pass. Done in c76a367..ec114b4 (2026-10-15).

## K353 (Done 2026-10-15)

- **K353** · The ledger diet: `scripts/ledger_diet.mjs` shortened the open items and made Done one-liners; the originals are in `docs/ledger_notes.md` and `docs/ledger_done.md`. Done in 82d31e7..477e48f, applied in a543dd3 (2026-10-15).

## K279 (Done 2026-10-15)

- **K279** · Plucks you can see, feel and hear: the ripple (glint by default), vibration, an optional tug, quieter auto plucks. Done in 2600523, c6f15f9 and 823f44e..faaa5e2 (2026-10-15); follow-ups K365-K369.

## K24 (Done 2026-10-15)

- **K24** · Render on demand when the scene is static. Dropped: folded into K6-3 (`docs/design/K5_K6_split.md`, 5.4), 2026-10-15.

## K381 (Done 2026-10-15)

- **K381** · The K83 PIN recipe (`probes.md`) and `k83_ab` pin the fabric's explore clock. Done in 2012623 (2026-10-15).

## K357 (Done 2026-10-15)

- **K357** · Is K344's cusp gone? Answered by Levi (2026-10-15 07:04, on the phone): not quite, a seam and a pinch remain at a loop's tip; K395 carries it.

## K383 (Done 2026-10-15)

- **K383** · K290 3a's calls. Answered by Levi (2026-10-15): as built, except the start marker hides once its thread has burnt (sent to stage 3b); 3b draws unseen fronts as nothing; recorded in `K114_burn.md` ("Stage 3a handoff").

## K377 (Done 2026-10-15)

- **K377** · K5/K6's seven calls. Answered by Levi (2026-10-15): all seven recs taken; recorded in `K5_K6_split.md` 8.

## K362 (Done 2026-10-15)

- **K362** · K76 2c's calls. Answered by Levi (2026-10-15): recs taken; recorded in `K76.md` ("Stage 2c handoff"); the start view's widening is in K76's next.

## K361 (Done 2026-10-15)

- **K361** · G3/G4's calls. Answered by Levi (2026-10-15): recs taken except the spline bend (q13), which stays open in K90; recorded in `G3G4_sdf_geometry.md` §6.

## K311 (Done 2026-10-15)

- **K311** · Pixi's aGap/aGapId/aUV warnings at load. Dropped: duplicate of K212 (2026-10-15).

## K293 (Done 2026-10-15)

- **K293** · K80 turns stage 2's residuals: (a), (c), (e) fixed in 40d947d; (b), (g), (h) needed no code; (d), (f) kept by design and written into lore. Done in 43457c1 (2026-10-15).

## K294 (Done 2026-10-15)

- **K294** · Per-model minotaur defaults: guard sight 4, accuracy 0.3; stalker accuracy 0.45; the hunter keeps 2 and 0.3 (stalker call K421). Done in 875b05a (2026-10-15).

## K418 (Done 2026-10-15)

- **K418** · ledger_diet.mjs archives undated Done items silently. Dropped: superseded by CC65's `ledger.mjs archive` (claude-config fdbcf79), which leaves undated entries in place and warns (2026-10-15).

## K423 (Done 2026-10-15)

- **K423** · Levi: dots (c), always two sized to fit; the vibration stops at the stub's solid end. Done in 556b8ee (2026-10-15).

## K430 (Done 2026-10-15)

- **K430** · The underWindows step (K268 3a): when a crossing's over pass reaches vis 0.5, the under thread's junction web retracts in one frame while the gap fades in. Dropped: Levi picked the ramp (2026-10-15); K268's next stage builds it (`docs/design/K268.md`, Stage 3a handoff, item 1) (2026-10-15).

## K408 (Done 2026-10-15)

- **K408** · The start marker fades out once the fire passes its thread point (K114 s2). Done in e60821a (2026-10-15).

## K411 (Done 2026-10-15)

- **K411** · A phone window for K8's bench: Levi lent the phone 2026-10-15 13:45 (K395, K8). Done.

## K449 (Done 2026-10-15)

- **K449** · K397 stage 2's looks: Levi keeps the cap and two dots, and the fade tap's pluck ("If we make a pluck sound, then we should show the pluck effect"); their 13:39 report is K397's and K459. Done in 1039c5d (2026-10-15).

## K395 (Done 2026-10-15)

- **K395** · Pluck blur seam and heart pinch at a kink loop's tip; the phone check passed on live 3e5717c. Done in 4c730f0 (2026-10-15).

## K440 (Done 2026-10-15)

- **K440** · Real-time fire defaults: real time plays its own pair, 0.2 / 20 (`fsr`, `fdr`); turn kept 0.75 / 0
  then (0.6 / 0 since K280, 2026-10-20); speed floor 0.1. Done in 395756b (2026-10-15).

## K448 (Done 2026-10-15)

- **K448** · Real-time fire tooltips give seconds: the delay its head start (20 is about 1.7 s, 40 about 3.3 s), the speed its units a second (K440). Done in 395756b (2026-10-15).

## K467 (Done 2026-10-15)

- **K467** · Mobile row help: show each row's tooltip text on touch (Levi 2026-10-15 ~15:58). Done in d973369 (2026-10-15).

## K468 (Done 2026-10-15)

- **K468** · Settings menu full screen on mobile (Levi 2026-10-15 ~15:58): a top bar with close, undo and redo; Android back closes it; phones in landscape too. Done in d973369 (2026-10-15).

## K465 (Done 2026-10-15)

- **K465** · Thread reveal: show the finish marker and its off-screen indicator by default (Levi 2026-10-15 15:49); K76 decision 6 hides both until the exit's thread is seen (drawMarkers, main.ts finishIndicator, EXPLORE_MARKER_VIS). Done in 1159902 (2026-10-15).

## K466 (Done 2026-10-15)

- **K466** · Thread reveal: emphasize unexplored thread ends more, especially ends that lie under a crossing (Levi 2026-10-15 15:49). Done in dc96a82 (2026-10-15).

## K479 (Done 2026-10-15)

- **K479** · Taps prefer the outgoing runs (Levi 2026-10-15: taps meant for the next run take the arrival run): in `edgeAt` the arrival run should win only by a clear margin, and the hover must pick what a tap takes. Done in 8651d59 (2026-10-15).

## K492 (Done 2026-10-15)

- **K492** · Thread reveal ends (K466): Levi kept A (`rvg=bright`, `rve=under`) as the default; B stays opt-in (K494). Done in dc96a82 (2026-10-15).

## K496 (Done 2026-10-15)

- **K496** · Tap preference (K479): Levi kept all three calls as built (the retraced run stays an ordinary choice, a tap inside both ribbons at a crossing goes outgoing, ARRIVAL_BIAS 1.5 for both pointers). Done in 8651d59 (2026-10-15).

## K488 (Done 2026-10-15)

- **K488** · The finish indicator's tap became a peek: zoom out to frame the exit, hold 2.5 s, ease back; the label says so. Done in 4454643 (2026-10-15).

## K483 (Done 2026-10-15)

- **K483** · Phone sheet font 13 px under SHEET_QUERY only (the side panel stays at 11). Done in 41d6d67 (2026-10-15).

## K482 (Done 2026-10-15)

- **K482** · Desktop panel: row-help labels are buttons only on coarse pointers and in the sheet (the desktop keeps the title tooltip, one Tab stop per row). Done in 41d6d67 (2026-10-15).

## K463 (Done 2026-10-15)

- **K463** · K5 R2's unrun checks under the perf lock (a9e8040 vs 2a688a6): fog phw=0 PASS (same-state cross-build 0 px; branch spread was capture noise, K390); cross-build threads round trip FAIL filed as K507 (capture transfer faithful, render differs). Done (probes only, HEAD 2a688a6, 2026-10-15).

## K471 (Done 2026-10-15)

- **K471** · K6-1's unrun checks: &phw=0 PHYS clear at rest on both hosts; the fabric/chase/reduced non-tug was a loop_shadow probe bug (pressed the entrance choice run), fixed in the probe; m2_input_ab's pins fixed (pluck clock, syncExplore, fogTime, waitStill) - controls now 0 px. Done in ced002e (2026-10-15).

## K507 (Done 2026-10-16)

- **K507** · K507 isolated: a9e8040-vs-b88376c round trip 0 px both ways (R2 cleared); the 43,385 px vs 2a688a6 bisects to K466's 2856678 (new `rve`/`rvg` defaults), and pins to 0 px with `&rve=under&rvg=soft` - intentional, not a code-move regression; follow-up K512. Done (probes only, this commit, 2026-10-16; evidence `.claude/probes/K5/R2/checks/k507/`, original pairing preserved in `checks/k463_c22_3166/`).

## K505 (Done 2026-10-16)

- **K505** · K5 M5 same-state pixel proof (e30edb8 vs 2a688a6, perf lock, scripted input): knot 0 px, fabric 0 px, fog 43 px vs 8,555 px control, threads load-state 0 px (post-move divergence in the same-build control's range); hook inventory identical (50 `__knot*` hooks, renderer prototype/own surface, 153 params, panel labels). No regression. Done (probes only, 2026-10-16; evidence `.claude/probes/K5/K502K505/`).

## K502 (Done 2026-10-16)

- **K502** · K5 R5 same-state pixel proof (b8d28ca vs c6444e6, perf lock, &phw=0): knot 0 px, fabric 0 px, fog 258 px vs 283 px same-build control, threads load-state 0 px (post-move divergence 572,889 px below its 604,864 px control - follow-camera non-repeatability, K428); rebuildFillets(true) on fabric 4.23 -> 4.30 ms mean (+1.6%), median 4.355 = 4.355 ms. No regression. Done (probes only, 2026-10-16; evidence `.claude/probes/K5/K502K505/`).

## K499 (Done 2026-10-16)

- **K499** · Gamepad support: d-pad + left stick (deadzone, eight sectors) feed the key picker as held keys, held-at-arrival like keys; A/confirm is a tap-class step (no mid-move queue). Pure mapping `src/ui/gamepad.ts`, lore GAMEPAD in `gameplay-moves.md`; unprobed on real hardware. Done in 15f1a00 (2026-10-16).

## K510 (Done 2026-10-16)

- **K510** · K5 M6: pointer input, auto audio and keys moved to `src/app/input_pointer.ts`, `auto_audio.ts`, `input_keys.ts` (pure move; tsc clean, 1333 tests, scripted-input A/B knot/fabric 0 px, fog/threads within same-build controls, k7_frames rest+drag within noise on both hosts). Done in 1161cd5 (2026-10-16).

## K509 (Done 2026-10-16)

- **K509** · K6-1 Q2 sleep-trip GEOM miss measured 0 px (knot fw=0 with worker, first-sleep shot vs after invalidate(), controls 0 px, before and after K6-2) - GEOM gating loses nothing. Done in 4e3781e (2026-10-16; evidence `.claude/probes/K6/K6-2/`).

## K513 (Done 2026-10-16)

- **K513** · Phone-pass frames gate: the 88-row flat strip was Android capture tiling (landscape surface 2125x1017 repeated every 1017 rows), not a blank render; `emulation.mjs` re-checks a strip at dpr 1 and frames then ran A/A 2 reps on 8fe3d20 within noise. Done (this commit, 2026-10-16; evidence `.claude/probes/K513/`, `.claude/probes/rounds/2026-10-16-65a7787/`).

## K480 (Done 2026-10-16)

- **K480** · Multi-run taps (Levi 2026-10-15): stage 2, the light - pulses and hover branch through short runs to `pulseReach` (`litArms` in route_plan.ts; `kPulseV` phases by global distance in shader + CPU mirror), and a hover lights the whole route its tap would take. Done (stage 2, this commit, 2026-10-16; stage 1 in 2bcf771; evidence `.claude/probes/K480/stage2/`). Residuals K500, look K515.

## K6 (Done 2026-10-16)

- **K6** · One frame loop driven by what-changed flags: K6-1 shadow flags, K6-2 skip-CPU (4e3781e), K6-3 (= K24) skip-draw/stop-ticker/30 fps rest cadence, screen-aware CAMERA scale bound, continuous `__knotLoop` + pre-load global, idle stamp refresh, diag `idle`. Done in c8156fe (2026-10-16; evidence `.claude/probes/K6/K6-3/`). Residual K516.

## K523 (Done 2026-10-16)

- **K523** · census2d ported census3a's `attributedUW` underWindows swap + `fadeModel` and an exit-aware MARKERS rule (K465's lifted exit passes at vis 0); m10 recipe 30/30 (was 17/29), joints' product side stays K268's K430 ramp after G3-1. Done in this commit (2026-10-16; `docs/design/K397.md` Stage 6 handoff).

## K522 (Done 2026-10-16)

- **K522** · census2d taught the measured flicker floor (hard diffs >1 level, `FLOOR_CLIP_PX` 23 from K519, edge/colour tolerance, contemporaneous restore references; first-frame diff is a drift report, K528). Done in this commit (2026-10-16; probe + docs only, evidence `.claude/probes/K76/stage2d/out_k522_m10e/`).

## K501 (Done 2026-10-16)

- **K501** · K481 by-length difficulty answered by Levi (2026-10-16): add a travel scale, tuned on the turn sim toward today's nine-cell catch rates, not a by-length-only retune and not shipping it deadlier; K481 stage 2 tunes it. Evidence `.claude/probes/K481/sweep_length_32.md`.

## K517 (Done 2026-10-16)

- **K517** · K385's branches answered by Levi (2026-10-16): ship (b) late enable in K307 stage 3 proper and file crbug (d); (a) was probe-only, (c) parked. Evidence `.claude/probes/K307/stage3/`.

## K399 (Done 2026-10-16)

- **K399** · G3-1's launch gates answered by Levi (2026-10-16): G3-1 before K268 item 4 and never beside it; a gap slot over 64 SAMP points strides at most 3, never a cut reach; GAP stays one slot a row, K398 clamps links. G3-1 unlocked.

## K519 (Done 2026-10-16)

- **K519** · K518's census leftovers attributed (no product bug; no `src/` change): visible cuts, hidden leaks, c214's restore and visitAll/off-again are one-level capture flicker (slot bytes identical off/on); JOINTS (2d) is census3a's attributedUW case; MARKERS i1 is K465's lifted exit by design; the 1,633 px attribution restore reads 0 px now. Done in this commit (2026-10-16; evidence `.claude/probes/K397/stage5/`, `docs/design/K397.md` Stage 5 handoff). Residuals K522, K523.

## K518 (Done 2026-10-16)

- **K518** · K397/K76 census ported after K6-3 (continuous `__knotLoop` + freeze of the per-frame slot re-derivation during mutation shots; stale PROOF_UNTIL default removed) and re-run on master: dots-cut PROOF PASS non-vacuous (32 shaped slots, 11,381 px, ghosts/under 0, dots p95 err 0.059). Done (probes + docs only, 2026-10-16; evidence `.claude/probes/K397/stage4/out_k518_m10c/`, `docs/design/K397.md` Stage 4 handoff). Residuals K519; phone/Levi link still owed under K397.

## K516 (Done 2026-10-16)

- **K516** · K6-3 phone cadence check: knot fw=0 draws 0/s at rest (ticker stopped), fabric ambient cadence 23.8 drawn/s (rAF p95 16.9 ms, smooth), continuous mode 60.2 / 44.0 drawn/s; load first sleep 10.5-12.9 s. Done in 5accab1 (2026-10-16; `.claude/probes/K516/results.md`). Residual K520.

## K514 (Done 2026-10-16)

- **K514** · Looks screenshots no longer tile with the phone sitting in landscape: `shotViewport` captures at a surface-fitting scale on the page's emulation CDP session (464x850 for 411x753). Done in this commit (2026-10-16).

## K76 (Done 2026-10-16)

- **K76** · Thread-reveal mode, stage 2: criterion 2 fixed (applyExploreGaps re-derives underWindows/pluck footprints from the last solve ungated slot data, no update() per move; phone gate2 fw=0: 0 updates/move, was 1-5), K362 start view widened to 2x(revealDistance+2), HC phone shot taken (capture tiles, K513 path). Done in 28f4c2f (2026-10-16; evidence .claude/probes/K76/stage2e/).

## K284 (Done 2026-10-16)

- **K284** · K74's sources credited (Pullen; Zhao and Marquez 2013) in `src/` and RESEARCH. Done in 83d4405 (2026-10-16).

## K402 (Done 2026-10-16)

- **K402** · K74 stage 3's questions, built as recommended (corridor 24, away flank, exit taper off; codec 152-155, never daily-exempt). Done in 83d4405 (2026-10-16).

## K270 (Done 2026-10-16)

- **K270** · K80 turns 3b diagnosed the lavender band: a stale pre-catch telegraph/glow frame at the catch site; turnCaught now re-syncs the minotaur in the same call. Done in 6d8bb4a (2026-10-16).

## K521 (Done 2026-10-16)

- **K521** · K74 stage 3 items 7-8 measured: prototype port byte-identical 640/640 (K109/K110 exception list empty); greedy bar fails on dailies 1-240 (gF median 2.86x, 20.0% within 1.5x vs the 15% bar) - owned by stage 4's search (K527), not a stage-3 retune. Done in c79bb74 (2026-10-16; evidence `.claude/probes/K74/stage3/out/results_k521.md`).

## K524 (Done 2026-10-16)

- **K524** · K80 turns 3b's real-phone contact sheet: shot 2026-10-16 on the real Pixel 11 at 411x753 (master bc1b4f9, PowerVR Vulkan; roam turn 2, hunt turn 47, caught turn 48, all checks pass). `.claude/probes/K80/stage3b/contact_sheet_real.png` beside the emulated sheet; frames + look notes in `shots/phone_real/` (probe `turns_phone_real.mjs`). Done 2026-10-16 (probe evidence only, no commit).

## K398 (Done 2026-10-16)

- **K398** · Link values clamp to the panel ranges (PARAM_RANGES in param_codec.ts: on encode, and in url_state's readers; the codec's decode stays lossless, hueShift/background sentinels/junctionBlend's floor keep their pins), so a gs 66+ knot link can no longer overflow the GAP texture. Done in this commit (2026-10-16).

## K346 (Done 2026-10-16)

- **K346** · A NaN displacement now raises the frame's max move (particle_system's Verlet loop), so maxMove reads non-finite and the physics halt fires on a NaN state. Done in this commit (2026-10-16).

## K314 (Done 2026-10-16)

- **K314** · Same defect as K436 (the watchdog comment now holds). Done in this commit (2026-10-16).

## K469 (Done 2026-10-16)

- **K469** · Same defect as K436. Done in this commit (2026-10-16).

## K454 (Done 2026-10-16)

- **K454** · Same defect as K436. Done in this commit (2026-10-16).

## K436 (Done 2026-10-16)

- **K436** · Regenerate clears the frame loop's halted flag on the main thread (lifecycle beginLoading/beginSettle), so a halted page recovers without a reload; K454, K469 and K314 were the same defect. Done in this commit (2026-10-16).

## K373 (Done 2026-10-16)

- **K373** · Boot fixes: safeAreaInsets is cached and read lazily on the first indicator update (was a forced layout at boot), and formatDayDate reuses one Intl formatter per locale. Done in this commit (2026-10-16).

## K526 (Done 2026-10-16)

- **K526** · Footsteps pan by screen x: KnotSynth gains a StereoPanner pan on pluck (clampPan), and the turn minotaur's footstep pans by its vertex's screen x (footstepPan in mino_feedback). Done in this commit (2026-10-16).

## K461 (Done 2026-10-16)

- **K461** · rt_page.mjs (and perf_batch/perf_attr via its default) now pass the realtime pair &fsr=0.3&fdr=40, not the turn pair. Done 2026-10-16 (probe only, .claude/probes/K114/stage2/; no commit).

## K500 (Done 2026-10-16)

- **K500** · The realtime chase's multi-run tap is page-probed: real clicks walk the whole route in order, uncaught, with the hover glow on the tapped beyond run (desktop; build 1bc13b4). Done 2026-10-16 (probe only, .claude/probes/K500/; no commit). Touch-press half is K529.

## K82 (Done 2026-10-16)

- **K82** · Manually override the daily maze for a given day. Done: folded into K531 (2026-10-16; frozen per-day override table, published days immutable).

## K323 (Done 2026-10-16)

- **K323** · Game folder / `gameMode` answered by Levi (2026-10-16, with K339): all recommendations taken. Done (answered 2026-10-16); Stage A (panel rebuild, codec 7) unlocked as K534.

## K339 (Done 2026-10-16)

- **K339** · The settings panel's audit answered by Levi (2026-10-16): all recommendations taken. Done (answered 2026-10-16); Stage A unlocked as K534, K340's nested-folder look follows (rec. look F).

## K210 (Done 2026-10-16)

- **K210** · Daily determinism answered by Levi (2026-10-16): past dailies reconstructible as (app version -> frozen PARAM_DEFAULTS) merged with per-day overrides; post-launch changes must not significantly alter previous dailies. Done (answered 2026-10-16); the implementation item is K531 (folds K82, launch prep).

## K366 (Done 2026-10-16)

- **K366** · The first-tap residual measured and attributed on the shipped K307 stage 3 build (a7e199e): the 35-54 ms frame reproduces only on fabric (39 ms, ripple off; ~50 ms first pointerup handling), so it is not a shader link (inferred first-pluck allocation / paint re-declare; no fix this stage). Done in a7e199e (2026-10-16); the fix is K535.

## K536 (Done 2026-10-16)

- **K536** · G3-1's browser verification: brute vs pruned 0 px on all 10 G1 links (phw=0) and on def/user/ring on the worker host; G1 census unchanged parent vs 93a231f (naked 0 on the clean set, overcut within ~1%); census2d 23/30 parent vs 24/30 G3-1 (same fail families, PROOF passes only on G3-1), census3a 21/30 on G3-1 within K537's pre-existing set; held still pluck (still:true) and routed web (6 moves) brute 0 px on both builds, cross-build diffs single-level casing edges (gt8 = 4 px); GAP GL readback GPU == CPU mirror exactly (25-texel rows, 4 links x worker + phw=0, gl.getError 0, no lost context); frame bench at rest unchanged (default p50 0.2 ms both, dense mean 5.32 vs 5.24 ms). Section cold compiles equal; the cold first-visible gap is K540 and the phone half is K539. Done 2026-10-16 (verification only, no code commit; evidence `.claude/probes/K8/G3-1/`).

## K534 (Done 2026-10-16)

- **K534** · Panel Stage A1 (K323 stage 1 + K339 merges, codec 7): `gameMode` (classic/minotaur/burn) in a new Game folder after Design, exploration in Game, Real time as a checkbox over `clock` (`clockOf`), burn as a mode, `minoPull` slider for `minoToward`, minotaur without off, confetti/deadEnds/snappiness/fire codec entries gone (density 0 = braided, amount 0 = none), K340 look F CSS, K263 closed. Golden dailies and K74 pins unchanged (no default moves a maze). Done in this commit (2026-10-16); the rest of Stage A is K541.

## K532 (Done 2026-10-16)

- **K532** · K527 answered in full by Levi (2026-10-16): all calls taken, every threshold a slider beside `greedyTrap`. Done in b728fbf (2026-10-16).

## K527 (Done 2026-10-16)

- **K527** · K74 stage 4 build half (`docs/design/K74_stage4.md`): greedy-trap search shipped H1-in-loop only behind `greedyTrap`. Done in b728fbf (2026-10-16).

## K481 (Done 2026-10-16)

- **K481** · Turns by length (toggle `minoByLength`, stages 1-3): stage 3 done in 610ef96 (K530); item complete - close or keep only the K545 look call. Done in 610ef96 (2026-10-16).

## K530 (Done 2026-10-16)

- **K530** · K481 stage 3: telegraph hover/press + wait tick, phone ticks/tint, toggle-off A/Bs. Done in 610ef96 (2026-10-16).

## K541 (Done 2026-10-16)

- **K541** · Panel Stage A2: remaining moves, word labels (at most 23 chars) on every row, desktop width 320 px, inventory rerun. Done in e77c974 (2026-10-16).

## K369 (Done 2026-10-18)

- **K369** · Favicon linked relatively (./favicon.svg) in index.html. Done in 2a42c8e (2026-10-18).

## K489 (Done 2026-10-18)

- **K489** · Dead finishIndicator.gate() hook removed (visible() composes the hold; never wired). Done in 2a42c8e (2026-10-18).

## K243 (Done 2026-10-18)

- **K243** · Paused instant intro draws no threads: beginSettle instant branch now draws its first frame. Done in 2a42c8e (2026-10-18).

## K161 (Done 2026-10-19)

- **K161** · Disk cleanup: profiles and 78 worktrees swept 2026-10-15; the last three worktrees, the empty folder and two dead branches went 2026-10-19 (`.claude/probes/K161/cleanup.log`). Profiles return until K150 lands. Done in this commit (2026-10-19).

## K551 (Done 2026-10-19)

- **K551** · Crossing gaps gone on every half-float GPU since 2026-10-18 (K320's split turned on by capability and drew no gaps on D3D11): the split stays dark, the warm-up follows the draw flag. Done in 7b8f068 (2026-10-19).

## K553 (Done 2026-10-19)

- **K553** · K320's split drew no gaps off dsf 1: the gap mask was sized in CSS px but read by gl_FragCoord in device px; gap_prepass sizes it in device px (fitGapTarget), guarded by gap_split.test.ts and k553_probe.mjs splitAssert. Done in be5a079 (2026-10-19).

## K558 (Done 2026-10-19)

- **K558** · Text crossings follow pen order (the later stroke over; penReverse, pnr=1, reverses it); maze and emblem crossings keep alternation. Done in 05c935b (2026-10-19).

## K552 (Done 2026-10-19)

- **K552** · Dailies draw no title thread by default; dailyTitleThread (dtt=1) draws it over the same maze (maze-form attempts, title moves off the share grid, the row disabled off a daily). Done in aa3106c (2026-10-19).

<!-- K812, K813, K815-K827, K833-K843: recovered 2026-10-27 from their commits; no ledger line ever parsed for them (LEDGERS.md inbox, 2026-10-23). -->

## K812 (Done 2026-10-22)

- **K812** · Preview win/loss effect buttons in the panel; threadLook hides fill-only Look rows. Done in 704e26bd (2026-10-22).

## K813 (Done 2026-10-22)

- **K813** · Border look keeps fill-area highlights; highlight colors/widths as params. Done in 0fdbafb3 (2026-10-22).

## K815 (Done 2026-10-22)

- **K815** · Junction fans draw outline only in border look (rim + flanks, seal silent). Done in e438bae6 (2026-10-22).

## K816 (Done 2026-10-22)

- **K816** · SDF ribbons behind rp=sdf (G3-2 steps 2-3). Done in 70e2fe12 (2026-10-22).

## K817 (Done 2026-10-22)

- **K817** · Gap search rounds negative kStart half up (K592). Done in 7dc79767 (2026-10-22).

## K818 (Done 2026-10-22)

- **K818** · Shape-injection param collection (K814 stages 1-3). Done in 43f0c443 (2026-10-22).

## K819 (Done 2026-10-22)

- **K819** · CannonSpread param (wider side-cannon fan) + backdrop/path colors join LOOK_KEYS. Done in d2ce8e94 (2026-10-22).

## K820 (Done 2026-10-22)

- **K820** · BorderWidth/borderColor/goldTextureStrength params. Done in 9aa64b6a (2026-10-22).

## K821 (Done 2026-10-22)

- **K821** · Panel order Maze before Game; End effects subfolder; Thread look above its rows; Path color beside the gold rows. Done in 1c161acc (2026-10-22).

## K822 (Done 2026-10-22)

- **K822** · Panel subfolders Text & emblem, Exit traps, Exploration, Burn race, Classic rules. Done in af3e6310 (2026-10-22).

## K823 (Done 2026-10-22)

- **K823** · Bespoke trefoil favicon/icon set + web app manifest (K36). Done in 8f1cc74b (2026-10-22).

## K824 (Done 2026-10-22)

- **K824** · Bespoke inline trefoil loader (K313 stage 1). Done in 63e70d45 (2026-10-22).

## K825 (Done 2026-10-22)

- **K825** · SDF ribbons get the thread-reveal explore variant. Done in 184127ef (2026-10-22).

## K826 (Done 2026-10-22)

- **K826** · SDF mitered silhouette at joints (sdMiterQuad). Done in 2f6d0ceb (2026-10-22).

## K827 (Done 2026-10-22)

- **K827** · Grab chase rate try key (gcr, K792) and the cap raised 0.6 -> 0.8 (K610). Done in 1db9f2dd (2026-10-22).

## K833 (Done 2026-10-22)

- **K833** · No disc rims inside border junctions; semicircle dead-end caps. Done in f99d4693 (2026-10-22).

## K834 (Done 2026-10-22)

- **K834** · Intro chrome gating on loader persistence + reset confirmation. Done in d5aefd25 (2026-10-22).

## K835 (Done 2026-10-22)

- **K835** · Path irregularity + excursion sliders (string sag, hand-drawn fills). Done in 16689838 (2026-10-22).

## K836 (Done 2026-10-22)

- **K836** · The cursive a as tangent attachments on the undisturbed oval. Done in 791a4f4b (2026-10-22).

## K837 (Done 2026-10-22)

- **K837** · Offset link-look chip below dropped mode badge. Done in 9477616a (2026-10-22).

## K838 (Done 2026-10-22)

- **K838** · A hint lasts until the next move; one hint at a time. Done in 7f683b43 (2026-10-22).

## K839 (Done 2026-10-22)

- **K839** · 'Show shortest path' checkbox draws the whole route. Done in 3199c9af (2026-10-22).

## K840 (Done 2026-10-22)

- **K840** · Fragile runs break at the ends too. Done in 0484e32f (2026-10-22).

## K841 (Done 2026-10-22)

- **K841** · The loader's followed rotation turns one way only. Done in 952e37b9, c62ea5f0 (2026-10-22).

## K842 (Done 2026-10-22)

- **K842** · Overlays dive where their thread passes under. Done in 8c82ff73 (2026-10-22).

## K843 (Done 2026-10-22)

- **K843** · Junction flares - fat at the junction, tapering away. Done in 387c373a (2026-10-22).

## K568 (Done 2026-10-20)

- **K568** · Confetti retune (Levi, 2026-10-20): the rain from the top lasts a bit longer; the finish spray gets smaller pieces, twice the top speed, a wider speed spread and twice the pieces. Done in 2550d4e (2026-10-20).

## K563 (Done 2026-10-20)

- **K563** · K552's C4, the title-loop walk: Levi (2026-10-20) took (a) as built and (d), a tree title, with K115's redesign (now in `docs/design/K115_stage9.md`, "No title loops"). Done in aa3106c (2026-10-20).

## K570 (Done 2026-10-20)

- **K570** · Spray gravity: the finish spray falls under gravity (Levi, 2026-10-20). Done in d63a45e (2026-10-20).

## K559 (Done 2026-10-20)

- **K559** · K115's glyph call 3: Levi took the looped hand with no spread turns, a junction and a dead-end spur where one would go (K115_glyphs.md section 11). Done in b7b8fa1 (2026-10-20).

## K561 (Done 2026-10-20)

- **K561** · K320 2c's pre-flip checks. Dropped: K550 kills the split, Levi's call (2026-10-20).

## K544 (Done 2026-10-20)

- **K544** · Phone timing for searched designs (round 2026-10-20): median 125 ms, p90 260, max 364 with greedyTrap on vs 67 ms off, 1.7x the desktop's median. Done in 4bd5bd4 (2026-10-20).

## K539 (Done 2026-10-20)

- **K539** · G3-1's phone half (round 2026-10-20): pruned = brute at 0 px, GL clean, no context loss; the head's 1.5-3.7x render cost went to K572. Done in 4bd5bd4 (2026-10-20).

## K447 (Done 2026-10-20)

- **K447** · The real-time fire on the phone (round 2026-10-20): escaped, 3 stars, 47.6 fps in the race vs 49.5 at rest; the burn costs about 2 fps (0.23 ms a frame). Done in 4bd5bd4 (2026-10-20).

## K572 (Done 2026-10-20)

- **K572** · The phone's render regression is G3-1's gap search (`93a231f`): 57 ms a frame on the phone where the old search cost 10; K320 stage 1 adds about 4 ms; K568's own confetti costs about 2 fps. Done in 71d4b6f (2026-10-20).

## K550 (Done 2026-10-20)

- **K550** · K320's gap split killed: its six code commits reverted, Stage 1 kept (211cc24); 0 px in 8 A/B cells, 27 of 29 programs byte-identical (two vertex shaders lose a dead vChain). Done in 38cedd0 (2026-10-20).

## K320 (Done 2026-10-20)

- **K320** · Split section-rgb: killed by K550 (revert 24ea5cb); Stage 1's slim kept (211cc24). Done in 24ea5cb (2026-10-20).

## K291 (Done 2026-10-20)

- **K291** · CI's actions moved to their Node 24 releases (checkout v7, setup-node v7, wrangler-action v4); the deploy passed on `ubuntu-latest` with no Node 20 warning, so no runner pin. Done in 776055c (2026-10-20).

## K337 (Done 2026-10-20)

- **K337** · Confetti shine: one light from the upper left; foil pieces flash, paper ones sheen (`cfh` strength 1, `cff` foil share 0.3); strength call K586. Done in aaff92b (2026-10-20).

## K470 (Done 2026-10-20)

- **K470** · No app-level WebGL context-loss handling: only `probe_hooks.ts` listens for `webglcontextlost`, to count losses. Dropped: duplicate of K456 (2026-10-20).

## K372 (Done 2026-10-20)

- **K372** · Fabric ?b's after-drag non-sleep is a same-chain collision limit cycle (fix K595, residual K596). Done in 061735b (2026-10-20).

## K456 (Done 2026-10-20)

- **K456** · A lost WebGL context: the loop suspends, a cover (message + Reload after 3 s) blocks input, the restore redraws exactly. Done in 88ecf93 (2026-10-20).

## K573 (Done 2026-10-20)

- **K573** · G3-1's phone gap search: step 1 (cec6d6a) plus step 2, a per-slot curvature stride (knot gs24 search 60.7 -> 19.3 ms on the phone; fixes K591). Done in 4c7f4db (2026-10-20).

## K591 (Done 2026-10-20)

- **K591** · The gap search dropped a gap run's tail past 65 SAMP points: fixed by K573 step 2. Done in 4c7f4db (2026-10-20).

## K90 (Done 2026-10-20)

- **K90** · Min bend radius (1a-1b merged b6635b4..be9cdba): ship, tune or stop (rec. stop; the design doc says tune, then ship)? Dropped: Levi 2026-10-20 (report card): stop. The bound stays parked, off and console-only; G3-2 builds on today's points (2026-10-20).

## K213 (Done 2026-10-20)

- **K213** · Before K90's bend bound ships: the min regression (hard clamp worsens 24 of 585 scans, soft 4; `k90_minrows.mjs`), `controlArcLengths`, tests and a CPU mirror, hit tests on moved samples, the phone's rebuild cost (`docs/design/K90.md`, Stage 1b handoff). Dropped: K90 stopped (Levi 2026-10-20), so the bend bound never ships (2026-10-20).

## K282 (Done 2026-10-20)

- **K282** · The HUD's stats have no explanation during play (only the end banners explain them). Dropped: Levi 2026-10-20: leave it; the end banners explain the stats (2026-10-20).

## K194 (Done 2026-10-20)

- **K194** · four defaults (pluck glow fallback, marker size 2, fire speed 0.6, stalker accuracy 0.3) and peakEstimate deduped (0.11-0.16 ms a tap). Done in e5ec489 (2026-10-20).

## K225 (Done 2026-10-20)

- **K225** · Levi 2026-10-20: the markers' default size (`markerSize`) goes 1.08 -> 2 (1.08 is about 5 CSS px on the phone). Done in e5ec489 (2026-10-20).

## K280 (Done 2026-10-20)

- **K280** · Levi 2026-10-20: the turn clock's burn race cools, `fireSpeed` 0.75 -> 0.6 with `fireDelay` 0 (real time keeps `fsr`/`fdr`). Done in e5ec489 (2026-10-20).

## K421 (Done 2026-10-20)

- **K421** · Levi 2026-10-20: the stalker's accuracy default (`minoStalkerAccuracy`) goes 0.45 -> 0.3 (0.45 caught 27.9% at 80% against a 20% target). Done in e5ec489 (2026-10-20).

## K603 (Done 2026-10-20)

- **K603** · `src/app/frame_loop.ts` (about line 307): `stepUnflagged = false;` sits after a `return`, so K6-1's observer flag never resets once set (predates K456). Done in e012cfe (2026-10-20).

## K410 (Done 2026-10-20)

- **K410** · The fire's FRONT and SMOLDER paint items into `paint_math`'s mirror and the parity tests, once K409 settles the look (K152 item 3; `K114_burn.md` 3b handoff). Done in cf70caa (2026-10-20).

## K599 (Done 2026-10-20)

- **K599** · `.claude/rules/render-explore.md` THE BURN (and a test comment) says the dark band draws under Char only; it draws under Gone too (K409's card). Done in cf70caa (2026-10-20).

## K290 (Done 2026-10-20)

- **K290** · Burnt threads, a toggle (Levi, 2026-10-14): `burnt` (`fbt`), gone (default: cut out of the reveal's pieces, so gaps close and fans drop the arm) or char (CHAR items in the explore programs). Done in cf70caa (2026-10-20).

## K578 (Done 2026-10-20)

- **K578** · While confetti falls, every frame redraws the whole maze (phone 60 -> 45 fps, K572, before K573). Dropped: the phone's fall is ~50 fps and not CPU-bound (a tenfold CPU cut gave +0.5 fps), and the cache never engages in the maze (PAINT_AMBIENT every frame). Branch kept; K634 (2026-10-20).

## K244 (Done 2026-10-20)

- **K244** · No junction-core plucks: auto plucks pick only drawn sites and a release in a core is silent (0 of 844 notes undrawn). Done in 56b8ebc (2026-10-20).

## K336 (Done 2026-10-20)

- **K336** · Side cannons and streamers (codec 178-180), with K186 (none under reduced motion, every banner throws). Done in afc47fc (2026-10-20).

## K186 (Done 2026-10-20)

- **K186** · K140's confetti calls: none under reduced motion, every win banner throws. Done in afc47fc (2026-10-20).

## K525 (Done 2026-10-20)

- **K525** · The telegraph lights the route's rims by default (mtl at codec 181; the line stays an option); follow-ups K649-K654. Done in 629c242 (2026-10-20).

## K637 (Done 2026-10-20)

- **K637** · The minotaur sim's 1.66 to 2.50 greedy catches is 83d4405 (K74 s3's trap-zone finish), intended; harness ruled out; 2.50 is the baseline (`.claude/probes/K637/`). Done in d25327b (2026-10-20).

## K653 (Done 2026-10-20)

- **K653** · syncMinotaur fog-bleed layer flip fixed (no lift-back while it bleeds): 0 moves in 208 syncs, was 209 of 209; K650 b and K645 a done (K653_checks.md Handoff). Done in 032e4e7 (2026-10-20).

## K139 (Done 2026-10-20)

- **K139** · collapse mode (cl, codec 190): every run collapses once crossed; finish and free; score = share collapsed against a 20k-step par; calls K681, residuals K682-K685. Done in a76071a (2026-10-20).

## K587 (Done 2026-10-20)

- **K587** · Confetti shine on the Pixel (round 2026-10-20): shine 0 vs 2 both 24% of frames over 25 ms, no measurable cost (`.claude/probes/K662/results.md`). Done in 5a0a7b4 (2026-10-20).

## K651 (Done 2026-10-20)

- **K651** · Pixel sheet for K525 rims (round 2026-10-20): red edges and the destination circle read well; the fog glow is a dim dot (K649). Done in 5a0a7b4 (2026-10-20).

## K644 (Done 2026-10-20)

- **K644** · Phone pass for K580 glyphs (round 2026-10-20): 16 stills at xh 2 and 3, all asleep by 5.9 s; the J smooth, no s2 regression; the a stem notch is K676. Done in 5a0a7b4 (2026-10-20).

## K646 (Done 2026-10-20)

- **K646** · Phone pass for K336 + K186 (round 2026-10-20): six banner paths show 1 burst each; frames flat in amount (23-26% over 25 ms, max 34 ms, hot and with audio on); daily paths 2b/3 and a quiet rerun in K687. Done in 5a0a7b4 (2026-10-20).

## K631 (Done 2026-10-20)

- **K631** · K244 on the phone (round 2026-10-20): auto plucks with nothing drawn 0 of 372 on the K244 builds (base 8 of 186); drawn releases 47 of 47; taps alike on both builds. Done in 5a0a7b4 (2026-10-20).

## K662 (Done 2026-10-20)

- **K662** · The phone sitting (2026-10-20, 20:06-20:50): parts 1-4 ran (K631, K646, K587, K651, K644 closed); Levi took the phone back before the daily paths (K687). Done in 5a0a7b4 (2026-10-20).

## K620 (Done 2026-10-20)

- **K620** · the glyph root paints as a blend of the stroke section colours from R to the spur at J (CPU mirror, KGEOM and KSTATIC data, GLSL); maze and burn moved 3-5 px of one level (the vertex block). Done in 0594ace (2026-10-20).

## K324 (Done 2026-10-20)

- **K324** · the real-time telegraph: lead, whole runs, ring on the real-time clock; uKTeleAt (K654); no line look over hidden thread (K652, K271); panel rows on both clocks. Done in af0f823 (2026-10-20).

## K697 (Done 2026-10-20)

- **K697** · maze_plan_identity and the physics_host lockstep test run near the 30 s timeout under parallel agent load (45 and 60 s a file loaded, 11 and 24 s clean): raise their timeouts before they flake an agent merge or CI (K324 s2 report). Done in d31ecd9 (2026-10-20).

## K675 (Done 2026-10-20)

- **K675** · K580 s3 partial round blends: the a J2 at xh 2 (113.5 deg) is only partly round (1.824 h to 1.389 h), the i joint sample at xh 3 (110.8 deg) barely. Done in 789c13b (2026-10-20).

## K676 (Done 2026-10-20)

- **K676** · Open-end crescents beside spur tips (the a stem bite, the notaper J bites, about 0.1 LU) in the K580 s3 fills-only raster; the Pixel shows the a stem notch by its foot disc too (K662). Done in b52cd63 (2026-10-20).

## K703 (Done 2026-10-21)

- **K703** · Overnight phone sitting 1: K687 paths 2b and 3 pass, K114 cut 15 of 15, the K324 s2 telegraph sheet (K695), K698 confirmed; Part 4 (K177) lost to an adb death. Done in 55b3efb (2026-10-21).

## K717 (Done 2026-10-21)

- **K717** · Phone sitting 2 (2026-10-21 00:04-00:55): kit silenced (K704), adb reconnect built (K709), lives, the walker, K177 and K687 ran; findings in K698, K715, K720. Done in 080d1ad (2026-10-21).

## K704 (Done 2026-10-21)

- **K704** · Phone kit links all carry snd=none (K578 kit, phone_conf, k578_confetti, lib717; K717) plus the GOTCHA in probes-phone.md; the app side is K720. Done in 43b8b66 (2026-10-21).

## K177 (Done 2026-10-21)

- **K177** · Minotaur indicator on the Pixel (K717): shown at the edge; a real tap frames the minotaur (scale 31.6 to 7.5 in 0.9 s), holds past 3 s, and the follow camera eases back by 5 s. Done in 080d1ad (2026-10-21).

## K687 (Done 2026-10-21)

- **K687** · Quiet confetti cell (K717, build c9de592, thermal 0, audiobook paused): 97 of 308 frames over 25 ms (31%, none over 34) vs 23% hot and playing (K662), so neither explains the misses; the cost is K645. Done in 080d1ad (2026-10-21).

## K708 (Done 2026-10-21)

- **K708** · lives and sword sims: 3 hearts bite only blind real-time play; at swordMoves 8 the sword is a breather (slays in 0.5% even for a seeker); K708.md Handoff. Done in c7bcf22b (2026-10-21).

## K720 (Done 2026-10-21)

- **K720** · sound off opens no audio: no AudioContext until sound is on and something plays (plucks, song, snore; the minotaur sounds now obey Muted and none too); switching sound on works without a reload; K720.md Handoff. Done in 389a8ce1 (2026-10-21).

## K643 (Done 2026-10-21)

- **K643** · lintGlyph takes the taper part; bulge and crotch probe flags; both bounds kept (taperBulgeLU 0.01; forkMaxLU 1.2, crotches proven to 0.79 LU). Done in adc6535b (2026-10-21).

## K726 (Done 2026-10-21)

- **K726** · Phone sitting 3 (02:16-03:02, tested build dbd95f5b): the K718 glyph pages and sheets, the sword on real touches on both clocks (0 failures), K720 silence verified (0 AudioContexts); sword toasts over the pad went to K698; `.claude/probes/K726/out/`. Done in dbd95f5b (2026-10-21).

## K698 (Done 2026-10-21)

- **K698** · Toasts clear the bottom controls (src/ui/toast_place.ts: 10 px above the highest control in their column, re-placed on resize; controls found by class km-control and the known control classes); with K713: the walker glow, no move pad in Lead or Delay, par at most P for an upper-bound Lead par. Done in 2f8f8346 (2026-10-21).

## K713 (Done 2026-10-21)

- **K713** · K114 walker leftovers: the walker glow (K739 asks Levi about its size), no move pad in Lead or Delay, par at most P for an upper-bound par; in K698. Done in 2f8f8346 (2026-10-21).

## K749 (Done 2026-10-21)

- **K749** · Phone sitting 4 (04:23-04:41, tested build cdd3ed53): K698 toasts clear every control on real touches (settled gap 9.9 css px, none cut off); ice slides and both color rules pass with backtracks; sprint passes on both clocks; K738 confirmed as a real overlap and K744 blips seen at real size; `.claude/probes/K749/out/`. Done in cdd3ed53 (2026-10-21).

## K767 (Done 2026-10-21)

- **K767** · Phone sitting 5 on real touches (turnstiles, hidden runs, the beat rider): all three play; found the beat-plus-hunter catch bug (K774) and the hidden runs HUD overflow (K775); K764 unsettled; sheets in .claude/probes/K767/out/. Done in 045ec6cb (2026-10-21).

## K764 (Done 2026-10-21)

- **K764** · A press on a hidden, burnt or cut run grabs and tugs the unseen thread instead of panning, which gives its position away (from the code: `grabAt`/`onThread` in `src/app/input_pointer.ts` skip none of them; fix: skip them there). Dropped: not reproduced (K138 s3, desktop, both hosts): a press on an unrevealed hidden run pans, since every unseen span reaches the ribbons as explore pieces (exploreOn true) and the pickers skip it; cut, broken and burnt runs share that code; touch goes to K784 (2026-10-21).

## K774 (Done 2026-10-21)

- **K774** · Beat rider catches land exactly once (moveAlong lands a pending catch before the next departure; test/app/beat_catch.test.ts). Done in 2d0ffd69 (2026-10-21).

## K777 (Done 2026-10-21)

- **K777** · Refreshed the open-work report (K585) to v7: 68 decision cards (41 confirm, 25 open), 18 tests to mark and a What changed block, built from the ledger at c6d2a3d8; pipeline and gaps in the `docs/design/K777.md` Handoff. Done in 025ecce8 (2026-10-21).

## K793 (Done 2026-10-21)

- **K793** · Settings panel search (fuzzy over row names, tags, folders and options) with collapse and expand all. Done in 9b2a4ea7 (2026-10-21).

## K795 (Done 2026-10-21)

- **K795** · Panel rows for every param, the beat timing toggle and four tunables. Done in d338bab4 (2026-10-21).

## K794 (Done 2026-10-21)

- **K794** · Walked gold stays gold (the gold derives from the taps). Done in d508d6d3 (2026-10-21).

## K796 (Done 2026-10-21)

- **K796** · String burns away with its thread in the burn race (burntAt in explore_view.ts; drawYarn hides burnt stations). Done in 48468919 (2026-10-21).

## K798 (Done 2026-10-21)

- **K798** · Border-at-a-time intros (edges / edgesAll sequences). Done in 903d7cbb (2026-10-21).

## K799 (Done 2026-10-21)

- **K799** · The traveled path's look (goldWidth + goldTexture). Done in c26d5cf4 (2026-10-21).

## K800 (Done 2026-10-21)

- **K800** · Looks set by the link (LOOK_KEYS exempt; Link look chip). Done in 7e97bc4b (2026-10-21).

## K828 (Done 2026-10-22)

- **K828** Loader params: loaderSpeed/loaderMove (codec 243-244, LOOK_KEYS), gap/threadWidth/pathColor/backgroundBase drive the loading trefoil, keep-loading-animation preview switch. Done in 32bc3d67 (2026-10-22).

## K829 (Done 2026-10-22)

- **K829** The tapered glyph root leans onto its swept-disc envelope (K718 call 1: the a's-J 0.031-0.059 LU scoop; `gln=0` keeps the square offset for A/B). Done in 238a78a3 (2026-10-22).

## K792 (Done 2026-10-22)

- **K792** · A try key for the K610 grab chase rate: `?gcr=` (0, 2] sets PhysicsTuning.grabChase (default in MAX_SLIDE_GRABBED). Done in 1db9f2dd (K827) (2026-10-22).

## K36 (Done 2026-10-22)

- **K36** · Add to home screen: a trefoil icon set from the loader's geometry (favicon.svg, icon-192/512, apple-touch-icon, manifest.webmanifest); template leftovers deleted. Done in 8f1cc74b (K823) (2026-10-22).

## K852 (Done 2026-10-23)

- **K852** · Loader motion dropdown + loader-only look params (Levi, by 2026-10-23: the move param becomes a 3-way dropdown and the loader gets its own gap/thread-size/colors/fill/marker params, separate from the maze's): `loaderMove` gains `"above"` (codec-appended option; old links unaffected) - the threads still move around the centered marker, but the knot turns so its strand centroid (arc-weighted, `shapeCentroid`) stays directly above the marker every frame (exact angle per frame via `rotationForCentroidAbove`, accumulated continuously, no following lag). New codec-appended params (defaults reproduce the pre-K852 drawing exactly): `loaderGap` 0.6, `loaderThreadWidth` 0.42, `loaderThreadColor` #eccc41, `loaderBgColor` #151b28, `loaderIndicatorSize` 1, `loaderFill` solid/outline/flat, `loaderTrail` 2.6 - `loaderCfgFromParams` no longer reads the maze's gap/threadWidth/pathColor/backgroundBase, so tuning the maze's look no longer dresses the loader (the pre-K852 loader on an old link with a non-default maze look now shows the loader defaults instead; accepted, recorded here). Marker size scales the head glyph and its K851 dive margin in both moving modes and head mode. Verified: full suite 2306 passed; probe `.claude/probes/K852/` - pixel centroid in `above` mode x≈320-324 vs marker 319.4 in every frame (maze control wanders ±130 px), marker still dives 2/8 frames, flat/outline/pink stills + Loading rows in the DOM. Done in 405320d3 (2026-10-23).

## K853 (Done 2026-10-23)

- **K853** · Loader fourth motion + speed cap (Levi, by 2026-10-23): `loaderMove` gains `"spin"` (codec-appended) - the knot's centroid stays pinned at the screen centre, the knot spins around it (exact rotation per frame via `rotationForHeadBelowCentroid`, accumulated continuously), and the marker stays directly below the centroid at the head's own distance, diving at under crossings as in the other modes. Loading-speed range max 3 -> 9 (x3, Levi). Verified: geometry tests (below-centroid rotation + duality with the above mode), full suite 2307 passed; probe `.claude/probes/K852/check_spin.mjs` - pixel centroid pinned ~(322, 307) of 640 across 8 frames, marker x≈319.5 riding y 378-490 below centre. (Headless probes must seed `knotmaze.motion=full`: headless Chrome reports reduced motion and the boot then never spawns the loader worker.) Done in 8e8199a3 (2026-10-23).

## K854 (Done 2026-10-23)

- **K854** · Border-mode junction outline, fixed as measured (Levi, by 2026-10-23: borders still ran across junctions and around them "awful"; probes `.claude/probes/K854/`, classifier = K849's silhouette judge upgraded to joinery's exact armReach + cubic rim, physics frozen `phy=0` so geometry can't drift mid-measurement): (1) the ribbon side-cut window now reaches the FLANK TIP (`max(capsule-exit, armReach - 0.05)` in joinery's entries; K849's capsule-exit alone was 0.39 world vs the 0.97 tip at cr 3 - the border redrew beside every rim: double strokes + interior spokes; the -0.05 overlaps the rim's tangent departure so the two solid strokes merge); (2) the fan rim band is SOLID (it was a `smoothstep(0.05, 0.95)` gradient across the whole band = pale crescents beside the ribbons' solid strokes), as wide as the ribbons' band (`borderWidth x casingHalf`), inset PERPENDICULAR to the rim (the apex-ward inset collapsed the band to a point at tips), with an outer ring so the band straddles the rim line like the ribbons' band straddles their edge (drawn only in border look; `vLook 2`, discarded otherwise - knot-mode byte identity stays green); (3) rim tips carry the arc's own flank value (0.75) and the flank fade steps in ~1px at 0.79, so arcs land on the borders instead of fading short or tonguing where the rim doubles back along the edge. Numbers (seed 3, core = junction disc, "interior" = stroke >0.05 world inside the union silhouette): ji96 937->620, ji100 833->566 (strip, upgraded oracle; fan-owned share at ji100 89->49), ji144 590->359; SDF path 1562/1589/1110 -> 1226/1259/719 (still worse than strip - pre-existing: SDF ribbons draw wider than the strip silhouette; the flip stays Levi-gated). Full suite 2307 passed incl. byte identity; K320 junction-frag budget raised 29,940 -> 30,650 with the measured note. RESIDUALS: deep strokes owned by ribbons at CROSSINGS just outside the junction core (crossing gap windows, the K849 class - not the junction outline; visible in classifier deep counts ji100 170), and ~0.03-world tip notches at 300px/world inspection zoom (subpixel at playing zoom). Border islands between a junction cut and a nearby dive gap remain by design (they are silhouette there) and now connect at both ends. Done in 3a8fde68 (2026-10-23).

## K855 (Done 2026-10-23)

- **K855** · Loader marker clips partially at crossings (Levi, by 2026-10-23: only the portion overlapping the thread/gap clips; the rest keeps rendering): K851's whole-glyph dive (hide while inside gap + radius) replaced by an even-odd canvas clip: the band along the OVER pass's line through the crossing, half-width casing/2 + gapSamples x sin(crossing angle), cut out of the glyph in all four motion modes (device px in the moving modes, world units inside the head-mode transform). New pure geometry: `TrefoilShape.crossings` (under pass's arc/point + both headings) and `nearestUnderCrossing`, both tested. Verified: frame bursts in maze mode now show marker white counts between full (1844) and 0 (355..1765, 10 partial frames of 60) instead of binary full/gone, stills `.claude/probes/K854/clip/`; full suite 2309 passed. (At the exact crossing centre the band is wider than the glyph, so it still fully covers there - that IS the overlap.) Done in df32e1d2 (2026-10-23).

## K856 (Done 2026-10-23)

- **K856** · In-game markers clip partially at crossings, same rule as the loader's K855 (Levi, by 2026-10-23: "and the in-game markers should behave the same"): the head's and minotaur's MarkerMesh discs are cut by a band along the over pass (only the overlapping slice; the K842 whole-marker alpha dip is retired for these two). `RibbonRenderer.underClipBand(chain, arc, rWorld)` measures the strip (over casing/2 + gap x sin(crossing angle), the K855 form) at the under crossing nearest the marker's arc; `MarkerMesh.setClipBand` converts it to the disc frame (`src/render/clip_band.ts`, pure + tested) and MARKER_FRAG discards inside it. The band's shader half length covers every disc fragment so the across test alone decides (a fixed length let fragments escape at shallow angles). Station markers (start/exit/sword/extras/ticks) sit at vertices and keep the old rule. Verified: `test/render/clip_band.test.ts` (7 tests), full suite 2316 passed; probes `.claude/probes/K856/` - head: 865 band frames in bounded runs while walking seed 7's solution, white-core counts 39 (deepest) / 209-270 (partial) / ~520 (whole); burst21 shows the head sliced along the over thread with the rest rendering; minotaur (turn clock): 1707 band frames, mino_burst2/6 show the disc cut along the pink over thread. Done in 54556322 (2026-10-23).

## K857 (Done 2026-10-23)

- **K857** · Borders running across junctions (across the joining thread's end), fixed (Levi, by 2026-10-23, after K854): ROOT CAUSE - joinery skipped every wedge flatter than FILLET_MAX_WEDGE (2.6 rad ≈ 149°): no rim AND no side-cut. That skip is only correct between one chain's own two arms (the near-straight pass-through side, whose ribbon already draws both edges through). A wide wedge between DIFFERENT chains is a real outline corner: skipping it left both facing ribbon edges uncut, so the through thread's border ran straight across the joining arm's mouth. Audit (`.claude/probes/K857/audit.mjs`, frozen seed 3): 5 such junctions of 166 (gaps 150-163°). Fix: the skip now requires `A.chain === B.chain`; wide different-chain wedges get flanks, rim and cuts like any other wedge (one line in `src/render/ribbon/joinery.ts` + comments). Verified: cut entries at j164 flip to left/right true on the previously uncut flanks; the before/after pixel diff at j164 (792 px) is exactly the removed cross-mouth stroke with the rim completing the outline (`.claude/probes/K857/out/j164_diff_crop.png`); same class fixed at a neighbour junction in j110's frame. Classifier (K854 oracle upgraded to mirror the new skip rule, baseline rebuilt via stash): j164 boundary 1048 -> 1250 (outline completed), interior 598 -> 557; j110 interior unchanged (its deep pixels are the crossing-window class). No regression at the K854 trio: interior 620/566/359, identical to K854. Full suite 2316 passed; fill look at j164 shows no fan bulge. The K854 residuals stand (crossing-gap-window strokes near junctions; SDF path still denser, gated). Done in 91bc9b49 (2026-10-23).

## K859 (Done 2026-10-23)

- **K859** · Rim curve extracted and measured; the research's premise corrected (curves research §3.2): the wedge rim's math moved verbatim into pure `src/render/ribbon/rim_curve.ts` (pinned by `test/render/rim_curve.test.ts`, frozen-maze diff vs the pre-extraction build = 0 px). Measurement overturned the plan: the corner-projection cubic (K846, "tangent rims") fires only when the edge-line corner lies beyond BOTH flank tips along their tangents - at cuspRadius 3 that needs wedges under ~29°, and on the frozen seed-3 maze the projection is negative on at least one side at 392/392 wedges (`.claude/probes/K859/fallback_count.mjs`, spot-checked ji0: tips ~0.59 out, corner ~0.25). The de-facto rim is the quadratic through the corner (union-outline-exact; G0 joins softened by K854's straddling band). A tangent-Hermite replacement (arc-fit lengths, G1 by construction) was implemented, unit-tested, and measured WORSE - outward bulge overshooting into neighbouring threads at tight junctions, 163k px churn on the frozen maze (`.claude/probes/K857/out/old_site1.png` vs `k859_site1.png`) - so it stays out and `rim_curve.ts` documents why. `rimCurvePoints` is the seam for the next candidate (a biarc through the corner region). Curves §3.1 was already shipped semantics (K854/K857); §3.3 (field-shaded border band) remains deferred insurance. Full suite 2320 passed. Done in badb6bd9 (2026-10-23).

## K860 (Done 2026-10-23)

- **K860** · Cursive fairness measurement (cursive research shortlist 1, measurement half): new pure `src/core/glyphs/glyph_fairness.ts` (K108-exact: densePath's signed curvature only) reports per path: min radius, curvature sign flips (deadbanded), monotone-κ pieces (swing-split), total κ variation, excess variation (ripple the piece skeleton cannot explain), max |dκ/ds|; `FAIR` targets (0 flips / ≤3 pieces / ≤0.004 excess) as a report, not a lint gate; synthetic tests (straight/arc/S/wiggle/jittered arc) in `test/core/glyph_fairness.test.ts`. Measured on the shipped K850 data (`.claude/probes/K860/measure.mts`): lint-clean (0 errors xh 2/3) but measurably unfair - a body: 5 sign flips, 10 pieces, excess 0.0339, minR 11.2 GU; a spur: 4 flips, 8 pieces; i body: 4 flips, 6 pieces, excess 0.0085; i stem spur clean (1 deadband flip). Intrinsic flips (entry blend, exit/bottom sweeps) account for ~2 of the body's - the rest is the lumpiness Levi rejected, now a number. Re-authoring registered as K861 with per-path targets pre-registered from this measurement. Done in a00fb6d5 (2026-10-23).

## K830 (Done 2026-10-23)

- **K830** · Junction corner style (Levi, 2026-10-22): one `cornerRoundShare` slider (`crs`) that rounds broad gaps first and keeps narrow points sharp; stills `.claude/probes/K830/`. Done in a89f8203 (2026-10-23).

## K831 (Done 2026-10-23)

- **K831** · Cursive a/i redesign (Levi, 2026-10-22), with its follow-up after Levi rejected the first stills (`docs/design/K831.md`). Done in 1c6eb062 (2026-10-23).

## K832 (Done 2026-10-23)

- **K832** · SDF + border residuals (Levi, 2026-10-22): SDF gaps bound to the scene's gap table, junction interiors cut in the border look, SDF border darkness; the G3-3 SDF-by-default flip stays gated on Levi's phone look. Done in 4b02e2dc (2026-10-23).

## K592 (Done 2026-10-22)

- **K592** · Gap search rounded a negative kStart the wrong way: kStart can go negative (ring seam crossings, pinned in gap_mask.test.ts), and its three decodes use floor(x + 0.5) now (K817). Done in 7dc79767 (2026-10-22).

## K862 (Done 2026-10-26)

- **K862** · G1 fillet rims (two Hermite halves through the old rim's midpoint). Dropped: never committed; parked at 060151d7 (`park/muse-2026-10-26`), superseded by K868 (2026-10-26).

## K864 (Done 2026-10-26)

- **K864** · K862 follow-up: cosine-warped rim samples, per-side side-cut windows. Dropped: never committed; parked at 060151d7 (`park/muse-2026-10-26`), superseded by K868 (2026-10-26).

## K865 (Done 2026-10-26)

- **K865** · SDF union-field junction border, ?sfb=1. Dropped: superseded by K868; never committed, code parked at 060151d7 (branch park/muse-2026-10-26) (2026-10-26).

## K866 (Done 2026-10-26)

- **K866** · Global union-field border, ?fbd=1. Dropped: superseded by K868 (its global union fused crossings too, then un-fused them with gates); never committed, code parked at 060151d7 (branch park/muse-2026-10-26) (2026-10-26).

## K861 (Done 2026-10-26)

- **K861** · Fair re-authoring of a/i against K860's targets. Dropped: rejected by Levi ('they are bad'), superseded by K863's clean slate; its re-fit (c6e1c326) stays the live a/i data until K863 lands (2026-10-26).

## K858 (Done 2026-10-26)

- **K858** · Research adoption round: curves 3.2 became K859, cursive K860/K861; curves 3.3 (one field-shaded border) is now K868. Done in badb6bd9 (K859) and a00fb6d5 (K860) (2026-10-26).

## K869 (Done 2026-10-26)

- **K869** · K868 S1a: the scene exporter (`__knotSceneExport`, `scripts/export_scene.mjs`) and 21 real scenes (65 variants) for S1b. Done in 329324f3 (2026-10-26).

## K870 (Done 2026-10-26)

- **K870** · K868 S1b: the CPU oracle (`src/render/field/geom.ts`, `oracle.ts`, `checks.ts`), checks 1-9 and 11, 12 synthetic scenes, contact sheets A-D. Done in 7b278662 (2026-10-26).

## K882 (Done 2026-10-27)

- **K882** · K868 S2b, only if K881 picked G2: why both G2 curves cross a side at acute corners. Dropped: K881 kept G1 (2026-10-27).

## K879 (Done 2026-10-27)

- **K879** · K863 tracer v2: crossing repair where a letter crosses itself, and the eight answer combinations for K878. Dropped: superseded by K886; v2 was delivered untracked (`.claude/probes/K863/trace/out5*`, all 13 crossings true X) and never uploaded (2026-10-27).

## K874 (Done 2026-10-27)

- **K874** · K868 S1b sheets B and C. Answered by Levi (2026-10-27): B, the oracle's look is right but misses some borders; C, the corner rule is taken and the `cr` slider stays, now scaling the approved corner. Both go to K883.

## K878 (Done 2026-10-27)

- **K878** · Cursive trace v2's three questions. Answered by Levi (2026-10-27): ss02's `p.jmc` (the retraced stem, with an exit and no pen lift), joins generated per letter pair, the font's proportions at x-height 120; K886 builds v3.

## K881 (Done 2026-10-27)

- **K881** · K868 sheet E: G2 corners against G1's rolling-ball arcs. Answered by Levi (2026-10-27): "In sheet E, I don't see any difference with G1 vs the others"; G1 stays, K882 dropped.

## K883 (Done 2026-10-27)

- **K883** · K868 oracle: the K883 span rule (no group holds both passes of a crossing) and the `cr` mapping; missing border samples 1540 to 208; follow-ups K891, K898-K900. Done in 972228b5 (2026-10-27).

## K886 (Done 2026-10-27)

- **K886** · K863 cursive v3: letter bodies with join frames, G2 connectors per letter pair, template and word sheet. Done 2026-10-27 (no commit; outputs in `.claude/probes/K863/trace/out6/`, template on Drive `K863/`; follow-ups K901-K903).

## K891 (Done 2026-10-27)

- **K891** · K883's sheets B2 / F / worst12. Answered 2026-10-27: B2 shows about twice the blue-marked misses (census undercounts; K900 redirected), F lgtm (cr 0-6, default 3).

## K893 (Done 2026-10-27)

- **K893** · Phone round 2026-10-27b: G3-1 undone at head by hand wins 14.5 / 15.9 / 11.2 ms (dense / max-fabric / knot) but is not clean; the week's steps are K573 1b (knot -21.4), K620's root GLSL (+22.6 max-fabric) and K854's outline (+15.3). Done in 6319be72 (2026-10-27).

## K900 (Done 2026-10-27)

- **K900** · Oracle holes: crossing 292 fixed (same-chain joins refused, crossing cut at L + h), census positions, two independent checks (geometric truth, image free ends), sheet B3; handoff in its brief. Done in cd025b84 (2026-10-27).

## K902 (Done 2026-10-27)

- **K902** · Cursive v4 (probe-only, untracked `.claude/probes/K863/trace/` `out7/`): join frames by a walk to the font's connector (smooth-end angle mean 22.1 -> 4.7 deg), calibration mean 3.218 -> 2.175 u, test-word pairs over 4 u 22 -> 10, a's fused entry (0.3 u); r after high exits and the variants measured; two-mode design in its brief's ## Results. Done in 482f259 (2026-10-27).

## K910 (Done 2026-10-27)

- **K910** · K900's sheet B3: do the magenta free border ends cover every missing border on muse_hash? Answered by Levi (2026-10-27): "Yes, I think so"; the free-end image check judges K909.

## K905 (Done 2026-10-27)

- **K905** · Root paint GLSL compiled out unless a root is drawn (K_ROOT): phone render sync -18.9 dense, -25.7 max-fabric, -12.3 ms knot; pixels unchanged. Done in e2d379ca (2026-10-27).

## K909 (Done 2026-10-27)

- **K909** · Geometric junction groups behind groups: "geo" (free ends 228 to 227, so k883 stays the default), truth geo's crossing order, the hookLook switch and sheet G; leftovers in its handoff. Done in 5d85a213 (2026-10-27).

## K907 (Done 2026-10-27)

- **K907** · The phone kit tracked: scripts/phone_pass/ (12 files with headers), tested on the phone in round 2026-10-27c; k539_g31.mjs and pixdiff_g31.mjs only parse-checked. Done in 9383defc (2026-10-27).

## K906 (Done 2026-10-27)

- **K906** · Phone round 2026-10-27c: T1 = K525's TELE paint item (`9d23dab1`, dense +11.0 ms), T2 = K137's fray (`d8675df1`, dense -13.1 ms); `docs/design/K156.md` round 27c. Done in 9383defc (2026-10-27).

## K904 (Done 2026-10-27)

- **K904** · Cursive v5: a, c, d, g, o and q fused at 60 u, the high entry mode, every split a G2 blend (peak curvature ratio max 120.5 -> 4.8), r after a high exit both ways; steps 4-5 moved to K916. Done in 0d0e8797 (2026-10-27).

## K901 (Done 2026-10-27)

- **K901** · Cursive: r after a high exit dips, as the font's does (Levi: "dip"); `docs/design/K863_trace.md` ## Levi's calls. Done in ebf1fef2 (2026-10-27).

## K915 (Done 2026-10-27)

- **K915** · Borders from the visible surface: oracle `ink` surface and label (free ends 228 to 100 on the real scenes, extra ink 71 to 94; d1-d4 close with angular cuts), `hookLook` seam, form B rejected, S3 as two passes, sheet H; verdict adapt; follow-ups under K868. Done in 150ac009 (2026-10-27).

## K918 (Done 2026-10-27)

- **K918** · K909's oracle leftovers (extra ink, #16's group on top, sheet F's spur, hairlines, seam and speck, S3's far pieces, geo's shorter spans). Dropped: superseded by K924: K915's label ink removes S3's far pieces and most group-on-top ends; the rest moved to K924 (2026-10-27).

## K916 (Done 2026-10-27)

- **K916** · Cursive v5.1: whole-stroke fairing (`--split fair`), leads into a/c/d/g/o/q from the left, the join refit, the K917 sheet; leftovers in K925-K928 and K917. Done in fc44d084 (2026-10-27).

## K917 (Done 2026-10-27)

- **K917** · Cursive junction heights. Answered by Levi (2026-10-27): "sgtm"; 60 u for a, c, d, g and q; o at 86 u, chosen on the sheet ("Seems better than the other two sets"). `K863_trace.md` ## Levi's calls. Done in eae3a581 (2026-10-27).

## K923 (Done 2026-10-27)

- **K923** · S3's Pixel bench (K868): as specified 4.8-5.5 ms at fit and 2x, over the 4 ms budget; with a screen-space LOD and a packed 32-bit label 1.6-2.7 ms at every zoom (p95 at most 3.43); a disc search 4.5-6.75 ms against G3-1's 24.5-48. `K923_s3_bench.md` ## Handoff. Done in 4dbd9e98 (2026-10-27).

## K922 (Done 2026-10-27)

- **K922** · K868 stage: depth over the whole overlap, endSnap (a float bug; real free ends 105 to 83) and extent part, behind switches that default off; sheet I. Brief ## Results, ## Handoff. Done in f8881166 (2026-10-27).

## K925 (Done 2026-10-27)

- **K925** · Cursive v5.2: the a/c/d/g/q dip fixed (eye check a 9.27 to 1.91, q 8.09 to 1.92), one eye scale, o's junction at 86 u (its joins stay inside the font's fill). `K925_cursive_v52.md` ## Handoff. Done in 05ccdb2f (2026-10-27).

## K924 (Done 2026-10-27)

- **K924** · Label ink artifacts traced to their rules (M1 cap cut, M2 fill over a foreign tube, M6 fill z, M3 tie; S, a crossing inside a cluster, is a K868 design call); five diagnostic flips in OracleParams, off by default; rule changes ranked. `K924_label_artifacts.md` ## Results, ## Handoff. Done in 1f48441b (2026-10-27).

## K930 (Done 2026-10-27)

- **K930** · Cursive v5.3: few-node G2 strokes (m 157 to 26 nodes, a 109 to 19; bodies a median 13 nodes, within 0.94 u of v5.2); the `--from-svg` hold is prototyped, not wired (K944). `K930_cursive_smooth.md` ## Handoff. Done in 8d5cb66e (2026-10-27).

## K929 (Done 2026-10-27)

- **K929** · Cursive: a word-final e draws its exit, cut where it has risen as far as the m/n/y/d tails (51.1 u, ending 1.46 u from the font's exit; the cut rule is K950). Done in e1c9ad64 (2026-10-27).

## K926 (Done 2026-10-27)

- **K926** · Cursive v5.4: e's two high entries from the font (o entry after b o v w, g entry after c g j y z; be 31.17 to 2.89 u off the font's connector, ve 31.17 to 3.46, ze 12.45 to 2.05), en 7.08 to 1.15 u, er 8.35 to 2.36. `K926_cursive_e.md` ## Handoff. Done in e1c9ad64 (2026-10-27).

## K940 (Done 2026-10-27)

- **K940** · Label ink rule fixes behind switches, all off (`labFill: "yieldOrder"` with `labYieldChain`, `labCapReach`): the crossed yield form is right where plain yield was 82% wrong; change 2 hides crossing lines. Sheet J and S's crops. `K940_label_fixes.md` ## Results. Done in c8e9f622 (2026-10-27).

## K934 (Done 2026-10-27)

- **K934** · K868 re-count: the free-end check counts runs of ink (31 free ends, not 83); the settled rules are the oracle defaults (K942); extent part; sheet K at play size. Done in 5bbe3790 (2026-10-27).

## K942 (Done 2026-10-27)

- **K942** · Label ink's settled rules are the oracle's defaults (the crossed yield order, unit-tested; labTie "surface"); its other switches removed. Done in 5bbe3790 (2026-10-27).

## K928 (Done 2026-10-27)

- **K928** · Cursive: `--split fair` is the default (v5.5); reading Levi's edited template as drawn is K944. Done in d8e369a8 (2026-10-27).

## K939 (Done 2026-10-27)

- **K939** · Cursive: the a/g/q stem tops are corners at the font's V (0.13, 0.26 and 0.00 u from it; d starts at its cusp), no U. `work13/vtops/vtops.png`. Done in d8e369a8 (2026-10-27).

## K945 (Done 2026-10-27)

- **K945** · Cursive v5.5: the centreline is the medial axis of the font's thinnest outline (on the font's axis, 0.00-0.57 u in the moved runs; v5.4 0.4-2.8 u), fair is the default, the roughness ceilings tightened; leftovers K959-K963. `K945_cursive_v55.md` ## Handoff. Done in d8e369a8 (2026-10-27).

## K959 (Done 2026-10-28)

- **K959** · Cursive v5.6's exit ends: each body faired 40 fu past its smooth cuts, its end frames re-taken from the faired centreline; o's hook and e's flick gone. `K959_cursive_v56.md` ## Handoff. Done in c011bc49 (2026-10-28).

## K960 (Done 2026-10-28)

- **K960** · Cursive v5.6's eye flags over 3 (r@669, w@618, k@2136): gone in v5.7, none new; the looser band clears w and k, the junction stretches r. Done in 5af5ed72 (2026-10-28).

## K965 (Done 2026-10-28)

- **K965** · Cursive v5.6's peaks and ceilings: in v5.7 every stroke is at or below its v5.6 peak (x2 0.13 -> 0.16 aside), k, q, r, y and i under v5.4's, q and r under the ceilings; f's hook stays in K963, o's exit in K969. `K965_cursive_v57.md` ## Handoff. Done in 5af5ed72 (2026-10-28).

## K963 (Done 2026-10-28)

- **K963** · Cursive f's hook: v5.8's new fair peaks 3.85 (v5.7 5.21), its S and the bottom-loop lobe gone; three close nodes stay (K977). Done in 17ff48ef (2026-10-28).

## K968 (Done 2026-10-28)

- **K968** · Cursive's checker read one-cubic strokes as 0: `rough_k969` reads x 1.40, x2 0.17, t2 0.26; v5.7's one-curve x kept. Done in 17ff48ef (2026-10-28).

## K969 (Done 2026-10-28)

- **K969** · Cursive v5.7's small comb bumps: a's, k's crotch ripple, y's exit corner and b's spike gone in v5.8; o's exit is K976, the rest K977. Done in 17ff48ef (2026-10-28).

## K970 (Done 2026-10-28)

- **K970** · Cursive tools: `eye`, `fid_cmp`, `nodes_pairs`, fewnode's G2 tally and the `--end-budget` header, fixed in the `_k969` copies. Done in 17ff48ef (2026-10-28).

## K944 (Done 2026-10-28)

- **K944** · Cursive `--from-svg` reads Levi's edits as drawn: an Inkscape save reads back within 6.05e-7 u, the build from it matches v5.8's byte for byte, nine scripted edits read back exactly (`work17/dbg/build_from_svg.ps1`). Done in e347eb16 (2026-10-28).

## K983 (Done 2026-10-28)

- **K983** · The docs name Levi instead of the old pronouns: 211 of 225 hits fixed in 66 files under `docs/` and `.claude/rules/`; the 14 left are quotes, named other people, game characters and one letter pair. Done in 3698078a (2026-10-28).

## K981 (Done 2026-10-28)

- **K981** · Cursive retrace rule: a smooth fork's departing handle stays collinear, so n's far fork no longer turns (G1 only: K987; rough still fails n: K986). Done in 7c7248dc (2026-10-28).

## K980 (Done 2026-10-28)

- **K980** · Cursive J1: every derived piece local (v5.8's shared fits frozen in the map), the e variants a continuous fit; K944's nine edits pass with untouched pieces at 0 u (baseline up to 5.12 u). Done in 7c7248dc (2026-10-28).

## K950 (Done 2026-10-28)

- **K950** · Cursive word-final e tail: long (Levi, 2026-10-28: "Long tail on e seems goood"), already the default of J1's `build_from_svg.ps1` (7c7248dc). Done (2026-10-28).

## K975 (Done 2026-10-28)

- **K975** · Cursive v5.8, Levi's review: another pass before the hand edits: o's exit (K976), the a k p f bodies (K990), the b h t p entries (K991). Answered 2026-10-28.

## K988 (Done 2026-10-28)

- **K988** · Cursive: maze's z exit hook (the capped comb spike) gone in J2, ze 2.28 u; a seam micro-hook, like the J1-kept sets still at the floor (K948). Done in 0a5712e7 (2026-10-28).

## K946 (Done 2026-10-28)

- **K946** · Cursive generator hooks: d's entry fixed in J2 (nd and lead d, no hooks); b's lead spike gone (its knee is K995); the hippo lead-in is K991, na and nq (unmeasured) K998. Done in 0a5712e7 (2026-10-28).

## K962 (Done 2026-10-28)

- **K962** · Cursive joins J2: one frozen setting per key, nothing fitted at build time; hooks 28 to 10, comb spikes 62 to 16; minimum's m tail, hippo's po, ma and la smooth (fo's burst is f's body, K996; h's entry K991). Done in 0a5712e7 (2026-10-28).

## K996 (Done 2026-10-28)

- **K996** · Cursive body edits J2 measured: p's end and h's start done in B1; f's loop end continues as K990, the b, v and w exits as K948. Done in 1522a265 (2026-10-28).

## K995 (Done 2026-10-28)

- **K995** · Cursive b's lead-in as one even curve: B1 took out the knee (score 0.0357 to 0.0004; 3.20 u off the font's lead). Done in 1522a265 (2026-10-28).

## K976 (Done 2026-10-28)

- **K976** · Cursive o's exit as an abrupt cusp, then a slight overstroke (Levi): built in B1 (v6.0); whether it looks right is K1004. Done in 1522a265 (2026-10-28).

## K1004 (Done 2026-10-28)

- **K1004** · Cursive o and a after B1: Levi likes a's top corner; o's exits are bad, and J3 takes them (K1009). Answered 2026-10-28.

## K1012 (Done 2026-10-28)

- **K1012** · Cursive B2: g and q take a's top-right corner, one point with two tangents (v6.2; Levi's request); g's top is K1020. Done in 5b084d1a (2026-10-28).

## K1013 (Done 2026-10-28)

- **K1013** · Cursive o's join, by look: Levi picked B (a point at o's top, then a short run back: "B for o's exit"); J3b builds it and fixes its dips and the oe crossing (K1009). Recorded in 3f2fd5c5 (2026-10-28).

## K1019 (Done 2026-10-28)

- **K1019** · Cursive reader: frames carried by true arclength (B3's `asdrawn_k1019.py`): ba, va, wa 6.8-7.0 -> 2.5-2.6 u, bq, vq, wq 22.9-23.3 -> 5.0-5.4 u; the census measures a solved join at its own ends (K1028). Done in e3d89333 (2026-10-28).

## K1020 (Done 2026-10-28)

- **K1020** · Cursive g's top refit to curve evenly from the corner, like a's and q's (B3, v6.3; largest |dk/ds| 6.66e-3 -> 7.07e-4 /u^2); the joins into g it moved are K1026. Done in e3d89333 (2026-10-28).

## K1025 (Done 2026-10-28)

- **K1025** · Cursive v6.3, by look: Levi likes g's new top (2026-10-28); a's and q's tops follow (K1029), the joins into g go to J3c (K1026). Done in 2bcbf84a (2026-10-28).

## K1026 (Done 2026-10-28)

- **K1026** · Cursive joins into g after B3's refit: Levi likes bg and vg where v6.3 lands them (2026-10-28); J3c keeps that attach, wg's with them. Done in 4d082218 (2026-10-28).

## K1028 (Done 2026-10-28)

- **K1028** · Cursive tools for J3b: own-ends census and sheets, the run-on font reference, bg/wg/vg census words; b0 built through B3's reader (`work24/b0_build.log`). Done in 7c382e05 (2026-10-28).

## K1030 (Done 2026-10-28)

- **K1030** · Cursive og: Levi kept v6.4's (o meets g's left shoulder at 50.5 u). Done in 0f532318 (2026-10-28).

## K1034 (Done 2026-10-28)

- **K1034** · Cursive v6.4 looks: Levi picked b0's joins out of o, ot's tangent entry (Ht) and v6.4's og. Done in 0f532318 (2026-10-28).

## K868 (Done 2026-10-28)

- **K868** · Border look, junctions done right: one field renderer with exact G1 fillets, checked against a CPU oracle (`K868_field_border.md`). Dropped: superseded by K1040, which carries its goals (F1, F6, F7); worktree `k868-s3a` kept (oracle30, the recordings) (2026-10-28).

## K992 (Done 2026-10-28)

- **K992** · K868 corner rules continuous in the geometry: the corner march (stage 4's c23w landed in 27a183b9). Dropped: superseded by K1040, whose corners are closed form (F2, F6); worktree `k992-corners` kept (the census kit) (2026-10-28).

## K1007 (Done 2026-10-28)

- **K1007** · K868 S3a8c, S3a8a's leftovers (window range records, the near test, the p95 spread). Dropped: moot, K1040 replaces the CPU label path they measure (F6) (2026-10-28).

## K1010 (Done 2026-10-28)

- **K1010** · K868 S3a8d, the switch lines found on the GPU. Dropped: moot, K1040's label has no switch lines (F6) (2026-10-28).

## K1015 (Done 2026-10-28)

- **K1015** · K868 label: passReach steps by h/8. Dropped: moot, K1040's depth needs no passReach walk (F6) (2026-10-28).

## K1022 (Done 2026-10-28)

- **K1022** · K992's c23w makes the label's CPU build 1.75x master's. Dropped: moot, the corner march goes and K1040's corners are closed form (F6) (2026-10-28).

## K979 (Done 2026-10-28)

- **K979** · K868 S3a4's measurement leftovers. Dropped: moot, the per-frame FieldModel they measured leaves the frame (K1040 F6) (2026-10-28).

## K984 (Done 2026-10-28)

- **K984** · K868's readback call before S3a10. Dropped: moot, K1040 reads nothing back and rules out S3a10 (F4) (2026-10-28).

## K964 (Done 2026-10-28)

- **K964** · K868's label residue after S3a2. Dropped: moot, the S3a label path goes (K1040 S8); its class B is K1040 S1's question 1 (2026-10-28).

## K971 (Done 2026-10-28)

- **K971** · K868's label rebuild with `lbi` at 0.44 s a frame. Dropped: moot, K1040 drops the per-frame FieldModel (F4) (2026-10-28).

## K1011 (Done 2026-10-28)

- **K1011** · K868 label's GPU band edges (BORROW, sub-float32 pieces). Dropped: moot, K1040's band strips borrow no clusters (F7) (2026-10-28).

## K1016 (Done 2026-10-28)

- **K1016** · K992 stage 3's tracked foot hops at a concave vertex. Dropped: moot, the march goes (K1040); S1's recordings gate covers a foot at a vertex (2026-10-28).

## K1017 (Done 2026-10-28)

- **K1017** · K992's census, the unexplained classes. Dropped: moot, K1040 S6 recensuses the new field and master's path goes at S8 (2026-10-28).

## K1018 (Done 2026-10-28)

- **K1018** · K868 flip_0, a 13 px row that differs between the label paths. Dropped: moot, both label paths go (K1040 S8) (2026-10-28).

## K1023 (Done 2026-10-28)

- **K1023** · K992 stage 4's untraced spots. Dropped: moot, the march goes (K1040) (2026-10-28).

## K1031 (Done 2026-10-28)

- **K1031** · K992 stage 5's branch rule leftovers. Dropped: moot, the march goes (K1040) (2026-10-28).

## K1038 (Done 2026-10-28)

- **K1038** · K992's F19 landing-bound residual. Dropped: moot, the march goes (K1040) (2026-10-28).

## K1029 (Done 2026-10-29)

- **K1029** · Cursive v6.5's a and q tops (B4): approved by Levi's look, with g's, 2026-10-29 (untracked `K863/trace/work25/base`, no commit).

## K994 (Done 2026-10-29)

- **K994** · audit clean: vitest ^4.1.12, @xmldom 0.8.15 (npm audit fix). Done in 5982aa16 (2026-10-29).

## K788 (Done 2026-10-29)

- **K788** · placement rejects trapping one-way draws (ruleHasTrap); census 42/50+44/50 -> 0/50. Done in f35f6725 (2026-10-29).

## K743 (Done 2026-10-29)

- **K743** · planRouteRuled plans ruled taps; renderer targetAt uses it; the real-time chase's tap does not yet (K1054). Done in 34c31872 (2026-10-29).

## K762 (Done 2026-10-29)

- **K762** · backtrack remembers retraced run; turnstile re-entry allowed. Done in ba8aaccc (2026-10-29).

## K763 (Done 2026-10-29)

- **K763** · hidden counter only when a hidden run was placed. Done in 6e27a088 (2026-10-29).

## K747 (Done 2026-10-29)

- **K747** · sword takenAt/slainAt count player moves (inputs.length). Done in bfa3a639 (2026-10-29).

## K807 (Done 2026-10-29)

- **K807** · nine constants to panel rows (follow, sword/sleeper rings, nearHops, routeWeight). Done in f641fc0a (2026-10-29).

## K810 (Done 2026-10-29)

- **K810** · shipped 44/44, Fuse 35, uFuzzy 31, fuzzysort 34 (.claude/probes/K810/results.md). Done in 5add2671 (2026-10-29).

## K393 (Done 2026-10-29)

- **K393** · Option B: probe:types groundwork shipped (92 errors/32 files), gates unchanged. Done in 9a8a6e7a (2026-10-29).

## K1050 (Done 2026-10-29)

- **K1050** · Muse batch 1 (8828b9e2..3f68b7c5), reviewed: K994, K788, K743/K762/K763, K747, K807, K810, K393, K414 and K932 landed; K783/K728 reopened (42a1e8ed measured other things); left K1052, K1054 (K743's chase tap), K1055 (K414's preload); batch 2 is K1053. Done in 3f68b7c5 (2026-10-29).

## K414 (Done 2026-10-29)

- **K414** · static worker preload dropped; phw=0 downloads no worker chunk, and default pages lost K7 s7's head start (back in K1055). Done in b6cd031d (2026-10-29).

## K932 (Done 2026-10-29)

- **K932** · bench_frame readPixels sync; K923 runner folded to scripts/k923 (.claude/probes/K932/results.md). Done in f7839f4e (2026-10-29).

## K728 (Done 2026-10-29)

- **K728** · real-time seeker measured: taken 99.9-100%, slew/banish 4.4-8.9% vs blind 0.2-0.7% (docs/design/K708.md). Done in 80d5c354 (2026-10-29).

## K1052 (Done 2026-10-29)

- **K1052** · test type errors fixed 92 -> 0 in 4 batches; tsconfig.tests.json folded into npm run typecheck. Done in ce1961e2 (2026-10-29).

## K1054 (Done 2026-10-29)

- **K1054** · no K138 rule can be on in a realtime chase (fabricRulesOf zeroes them outside classic; chase needs minotaur), so handleChaseTap needs no ruled twin; gate pinned in url_codec.test.ts. Done in df40887c (2026-10-29).

## K1055 (Done 2026-10-29)

- **K1055** · Worker preload back for worker pages: an inline head script modulepreloads the worker chunk unless phw=0 (hello about 26 ms sooner on first loads). Done in 1c8fe970 (2026-10-29).

## K1059 (Done 2026-10-29)

- **K1059** · K1055's request count. Dropped: decided by Claude: count network downloads. The worker fetch is served from the HTTP cache, so K1055's check holds (1c8fe970) (2026-10-29).

## K783 (Done 2026-10-29)

- **K783** · a chase starts with 2 lures and 1 snare (PARAM_DEFAULTS; sliders already existed); url_codec defaults pin 0/0 -> 2/1 only, page checks in .claude/probes/K783/ passed. Done in 3e42d9cf (2026-10-29).

## K1057 (Done 2026-10-29)

- **K1057** · scripts/run_node.mjs tracked (was .claude/probes/K708/run_node.mjs); rules recipes rewritten to it, no vite-node left in rules; burn_sim and par_census run through it. Done in 00a7bc0e (2026-10-29).

## K1060 (Done 2026-10-29)

- **K1060** · workerPreloadScript moved to src/loader/worker_preload.ts (default derived from PARAM_DEFAULTS.physicsWorker); test/loader/worker_preload.test.ts pins its decision against parseParams (probe forms, seeded writer links, overrides, other version, garbage). Done in 2a347a53 (2026-10-29).

## K1061 (Done 2026-10-29)

- **K1061** · run_node --config; last vite-node recipes pointed at it, panel/fold runs pass. Done in 7f802e12 (2026-10-29).

## K396 (Done 2026-10-29)

- **K396** · scripts/dev.ps1 LAN dev server, checks verified on 5531. Done in 179ecd64 (2026-10-29).

## K1053 (Done 2026-10-29)

- **K1053** · Muse batch 2, runs A-F, reviewed on master. Done in 9b9ea6be (2026-10-29).

## K650 (Done 2026-10-29)

- **K650** · the TELE census, GPU vs mirror with the riding lead (K324 s2). Done in 9cfe77af (2026-10-29).

## K654 (Done 2026-10-29)

- **K654** · the moving lead rides uKTeleAt, no texel rewrite (K324 s2). Done in 754f06a8 (2026-10-29).

## K1056 (Done 2026-10-30)

- **K1056** · Real-time lure lasts until the target (run G, K1062): detect() no longer re-spots a lured monster, both clocks suggest the shipped 2 lures / 1 snare. Done in ab055498 (2026-10-30).

## K321 (Done 2026-10-30)

- **K321** · Credits page: licenses.html became credits.html, Levi header first, Scarborough Fair in Music and sound, Built with Claude Code below art/music. Done in 9de9d25e (2026-10-30).

## K658 (Done 2026-10-30)

- **K658** · K137 page gaps checked: 155 checks in docs/design/K658_page_checks.md, FAILs K1064-K1074, sounds K1075. Done in 7d00fc06 (2026-10-30).

## K814 (Done 2026-10-30)

- **K814** · Text & emblem rows built from SHAPE_INJECTION_PARAMS. Done in 82dd37a5 (2026-10-30).

## K441 (Done 2026-10-30)

- **K441** · Owed same-state rerun done: 8/8 stands asleep at both ends, tick gap +4.24 ms (1x) / +13.16 ms (4x) vs +0.23/+1.85 prediction in docs/design/K441_fire_frame.md. Done in 8308ea15 (2026-10-30).

## K645 (Done 2026-10-30)

- **K645** · K140 frame A/B on one build 72bff312: cannons cost unresolved at 1x, +3.2/+5.6 ms at 4x (K653_checks.md). Done in 295d28c4 (2026-10-30).

## K1062 (Done 2026-10-30)

- **K1062** · Muse batch 3, runs G and A-F, reviewed on master. Done in 5debde5a (2026-10-30).

## K1064 (Done 2026-10-30)

- **K1064** · K658 check: exempt tail crossing. Dropped: stale check, K840 (0484e32f) breaks run ends too (K658_page_checks.md) (2026-10-30).

## K1066 (Done 2026-10-30)

- **K1066** · K658 check: exempt tail crossing. Dropped: stale check, K840 (0484e32f) breaks run ends too (K658_page_checks.md) (2026-10-30).

## K1067 (Done 2026-10-30)

- **K1067** · K658 check: exempt tail crossing. Dropped: stale check, K840 (0484e32f) breaks run ends too (K658_page_checks.md) (2026-10-30).

## K1068 (Done 2026-10-30)

- **K1068** · K658 check: exempt tail crossing. Dropped: stale check, K840 (0484e32f) breaks run ends too (K658_page_checks.md) (2026-10-30).

## K1069 (Done 2026-10-30)

- **K1069** · K658 check: exempt tail crossing. Dropped: stale check, K840 (0484e32f) breaks run ends too (K658_page_checks.md) (2026-10-30).

## K1065 (Done 2026-10-30)

- **K1065** · K658 check: fog IoU 0.9613 after Undo. Dropped: inside K137's 0.956-0.981 spread, the 0.97 line is too tight (K658_page_checks.md) (2026-10-30).

## K1070 (Done 2026-10-30)

- **K1070** · K658 check: real-time Undo. Dropped: by design, the real-time Stranded banner offers Restart only (K658_page_checks.md) (2026-10-30).

## K1071 (Done 2026-10-30)

- **K1071** · K658 check: real-time Undo. Dropped: by design, the real-time Stranded banner offers Restart only (K658_page_checks.md) (2026-10-30).

## K1072 (Done 2026-10-30)

- **K1072** · K658 check: real-time Undo. Dropped: by design, the real-time Stranded banner offers Restart only (K658_page_checks.md) (2026-10-30).

## K1073 (Done 2026-10-30)

- **K1073** · K658 check: real-time Undo. Dropped: by design, the real-time Stranded banner offers Restart only (K658_page_checks.md) (2026-10-30).

## K1074 (Done 2026-10-30)

- **K1074** · K658 check: c4 stub. Dropped: stale check, K840 leaves snap no exempt stub; c5 covers snap (K658_page_checks.md) (2026-10-30).

## K785 (Done 2026-10-30)

- **K785** · Lore attach cost: the hubs now attach only their own lore (re-measured 2026-10-30: frame_loop.ts 2 rules files, 3k tokens, was 11 / 28k; K774's five files 7, 30k, was about 60k, 16k of it the minotaur lore for minotaur_turns.ts). Done in 65c4e1bd (2026-10-30).

## K327 (Done 2026-10-30)

- **K327** · Labels that say what they size: 'Off-screen arrow size' and 'Maze marker size' (K534, 2605bf6b), word labels for the rest (K541); the panel inventory at HEAD shows no row labelled with its key. Done in e77c9746 (2026-10-30).

## K331 (Done 2026-10-30)

- **K331** · touch picks in pixels (touchPickMargin); with K330 glow on press. Done in 20b66f6e (2026-10-30).

## K330 (Done 2026-10-30)

- **K330** · touch press on a choice lights its hover glow at once. Done in 20b66f6e (2026-10-30).

## K549 (Done 2026-10-30)

- **K549** · Text scenes fit beside the open panel (fitArea/fitPlacement in view_clamp, camera reads panel only for params.text); probe .claude/probes/K549/. Done in 48cf34fa (2026-10-30).

## K486 (Done 2026-10-30)

- **K486** · Touch help for the panel's nine buttons (K467's mechanism on buttons); probe .claude/probes/K486/. Done in 4935f769 (2026-10-30).

## K1077 (Done 2026-10-30)

- **K1077** · prof5-prof8 attribute the residual: 82% of +4.24 x1, 87% of +13.16 x4; three clusters (button-tick rects, fillet rebuild, gap-slot pass) filed as K1081-K1083. Done in d21a05d2 (2026-10-30).

## K412 (Done 2026-10-30)

- **K412** · preload verified on real network: through levi.dev proxy chunk downloads once, worker fetch transfer 0 (5 fresh + 5 warm per origin, desktop Chrome); pages.dev revalidates (max-age=0), fix filed K1084. Done in c24d5801 (2026-10-30).

## K1079 (Done 2026-10-30)

- **K1079** · Muse batch 4: A K331+K330 20b66f6e, B K549 48cf34fa, C K486 4935f769, D K1077 d21a05d2, E K412 c24d5801; all passed review (K1081, K1083, K1084 amended; residuals K1085, K1086 filed). Done in c24d5801 (2026-10-30).

## K1087 (Done 2026-11-02)

- **K1087** · The phone's network path off USB (5555 over Tailscale closes on every reboot). Dropped: decided 2026-11-02: re-arm 5555 over USB after each phone reboot, automated; the job is claude-config CC132 (2026-11-02).

## K715 (Done 2026-11-02)

- **K715** · adb deaths: Godot's shutdown_adb_on_exit is now false (claude-config Setup-GodotAndroid.ps1 step 5; applied on the desktop). Done in claude-config f914c3a4 (2026-11-02).

## K1051 (Done 2026-11-02)

- **K1051** · Turn on Dependabot for knotmaze. Done by Levi in the repo settings: alerts and security updates on (2026-11-02).

## K896 (Done 2026-11-02)

- **K896** · Confetti recheck on the phone (round 2026-10-30): master 45.0/45.3 fps vs 8fe3d20 60.1/60.3 over the 8 s fall, both orders; cost reproduced. Done in 7ef119c5 (2026-11-02).

## K309 (Done 2026-11-02)

- **K309** · K299 ring-lap fix on the PowerVR: 319/16384 division misses (all k-1); every seam case 0 px on master. Done in 7ef119c5 (2026-11-02).

## K485 (Done 2026-11-02)

- **K485** · Pixel sheet pass on the phone: 34/34 portrait checks ok on master (keys, landscape, live skipped). Done in 7ef119c5 (2026-11-02).

## K671 (Done 2026-11-02)

- **K671** · Remove 16 merged, clean agent worktrees with K161's cleanup.ps1. Dropped: already gone: removed after 10-27 without a K161 run (inferred: Claude Code's sweep of old clean worktrees); branches kept, all merged; the open items' probes were copied at merge (2026-11-02).

## K1089 (Done 2026-11-02)

- **K1089** · Cursive J3c's look calls: Levi kept v6.6 on all four (oe, ot's dip, the dips into m n v x z, the entries into i j p s u w y; `K863_trace.md` Levi's calls). Done in 54900768 (2026-11-02).

## K1078 (Done 2026-11-02)

- **K1078** · Hand K1040's gated stages to Muse. Dropped: Levi (2026-11-02) left Claude agents or Muse to the coordinator per task; the junction stages stay with Claude agents (S3 runs as K1097's agent) (2026-11-02).

## K1085 (Done 2026-11-02)

- **K1085** · Reduced motion snaps the camera's fit on a jump and its range ease (9e7fd3f8). Done in 9e7fd3f8 (2026-11-02).

## K228 (Done 2026-11-02)

- **K228** · pointerleave clears the choice hover too (probe K228 before 0 stays, after -1; guard held). Done in e5408241 (2026-11-02).

## K442 (Done 2026-11-02)

- **K442** · walked/fire lead lines true under both fire clocks; tests pin old phrases gone. Done in 715049f5 and 91b54050 (2026-11-02).

## K741 (Done 2026-11-02)

- **K741** · cutRules(upper) drops 'fewest cuts' for upper-bound par; exact-par pinned. Done in 221b5ad5 (2026-11-02).

## K1084 (Done 2026-11-02)

- **K1084** · hashed /assets/* now max-age=31536000 immutable on Pages; worker fetch cache-served 10/10, levi fresh hello 941->347 ms. Done in a4cc20ee (2026-11-02).

## K1063 (Done 2026-11-02)

- **K1063** · run_node.mjs server.ws false; parallel probes no longer print Port 24678 error. Done in a869f4a6 (2026-11-02).

## K593 (Done 2026-11-02)

- **K593** · preview.ps1 junctions main node_modules into bare worktrees or fails naming npm ci. Done in f0a871a9 (2026-11-02).

## K775 (Done 2026-11-02)

- **K775** · HUD's hidden-runs row wraps inside the box (shots at 411x753, 360x740 and 320x640 matched the rects: `.claude/probes/K775/shots/sheet.png`). Done in 1a6823ea (2026-11-02).

## K738 (Done 2026-11-02)

- **K738** · Free play badge re-fits (icon only, beside or below the menu button) when the HUD grows; clear of the HUD in all 8 shot states (`.claude/probes/K775/shots/`). Done in 1a6823ea (2026-11-02).

## K1096 (Done 2026-11-02)

- **K1096** · Levi checked the HUD's before/after sheet in place of the phone check: fine (`.claude/probes/K775/shots/sheet.png`). Done in 1a6823ea (2026-11-02).

## K443 (Done 2026-11-02)

- **K443** · Two panel rows labelled `clock`. Dropped: the rows already read Clock and Fire clock (tweakpane_panel.ts 1270, 1276, 1917; K1094) (2026-11-02).

## K404 (Done 2026-11-02)

- **K404** · Inferred: the hover path ignores onHead. Dropped: hover and click both gate on inWaitZone (input_pointer.ts:766, main.ts:3277, 6b5b88df; K1094) (2026-11-02).

## K801 (Done 2026-11-02)

- **K801** · K138 s4 slice 2 calls (keys at core junctions, placeholder icons). Dropped: duplicate of K789 (K1094) (2026-11-02).

## K1098 (Done 2026-11-02)

- **K1098** · Look check: reduced motion's panel and resize snap. Dropped: nothing to see on a maze: there a panel toggle or a resize does not move the fit at all (K1085's probe, cases a and c, the same before and after); the text-scene toggle measured 89 -> 2 frames under reduce (`.claude/probes/K1085/`) (2026-11-02).

## K1094 (Done 2026-11-02)

- **K1094** · Ledger hygiene from the K1091 planner: K443, K404, K801 dropped, K497 reworded, the Next narrative moved to docs/history.md; K604 stays (still true: `mf` is outside the codec until K326 drops knot mode) and K1081-K1083 keep K1077 as their origin (their pointers hold). Done in 4e26f8a0 (2026-11-02).

## K1092 (Done 2026-11-02)

- **K1092** · Form B's Lcut reach: S1f's quadratic reach (the default) is continuous by construction, ending the phantom reach at near-tangent passes (`K1040_s1f_reach.md` F1). Done in b4b036e7 (2026-11-02).

## K1027 (Done 2026-11-02)

- **K1027** · Cursive: the six high joins of b, v and w into a and q solved in v6.7 (J3d), replacing the presets; the look call is K1102. Done in 4e88a54f (2026-11-02).

## K1039 (Done 2026-11-02)

- **K1039** · K868's gate-tool leftovers: S3's verdict runner requests no favicon (a data: URL) and drops any favicon request from its error count; same24, same28 and raster26 are K868's, superseded by K1040. Done in 15d0ea13 (2026-11-02).

## K1091 (Done 2026-11-02)

- **K1091** · Muse batch 5, runs 5A-5E (1a6823ea..a1a7e12a), reviewed; Claude fixed K442's fire-lead line (91b54050); K1086, K1095 and K1099-K1101 stay open. Done in a1a7e12a (2026-11-02).

## K343 (Done 2026-11-02)

- **K343** · Snore decoded on OfflineAudioContext before the gate (KnotSynth.decodeOffline, SnoreSfx falls back to context decode); first touch plays it. Probe .claude/probes/K343/snore.mjs: decodes 1 before input, one tap plays 1, never stacked. Done in 2b539fc8 (2026-11-02).

## K130 (Done 2026-11-02)

- **K130** · Reset to defaults writes the exact default for backgroundIntensity, pulseReach, settleBudget and loadSettle (step removed, edits keep 2 decimals / whole numbers). Done in 9e617d7a (2026-11-02).

## K495 (Done 2026-11-02)

- **K495** · End glow row shows only under thread reveal with the halo or beacon look. Done in 9e617d7a (2026-11-02).

## K1102 (Done 2026-11-02)

- **K1102** · Cursive a/q joins: Levi chose v6.6's ("aq: definitely 6.6", 2026-11-02); J3e restored them exactly for ba, va, wa, bq, vq and wq. Done in 636bd685 (2026-11-02).

## K1104 (Done 2026-11-02)

- **K1104** · Cursive v6.7 (J3d): the joins into a and q attach on their lower bounds; the after-high stretch's [0, 90] was picked by a sweep with 85 tying; b's, v's and w's other high exits are still presets (`K1027_cursive_j3d.md` ## Handoff). Dropped: folded into K1113: the six are v6.6's presets again (K1102), so their attach bounds and the sweep's stretch are moot, and b's, v's and w's other high exits are K1113's scope (2026-11-02).

## K128 (Done 2026-11-02)

- **K128** · marker aUV slot dropped from the geometry and the dead declaration removed; PixiJS aUV warning gone (probe .claude/probes/K212/). Done in ae6316fe (2026-11-02).

## K212 (Done 2026-11-02)

- **K212** · pluck strip split into one geometry per program (blur vs still); all eight attribute warnings (aGap, aGapId, aUV, aEnv, aCol, aClipA/B/F) gone, pictures pixel-identical. Done in ae6316fe (2026-11-02).

## K490 (Done 2026-11-02)

- **K490** · explained, not reproduced: no 404 on master dev or preview build across the brief's links, a K466-style xp=threads load or a panel open; every file index.html/manifest names serves 200, and K466's log never recorded the URL. Done in ae6316fe (2026-11-02).

## K787 (Done 2026-11-02)

- **K787** · whole-game beat test lands catches (respawn+restAt+refuse), asserts every turn result, sees K774 (b). Done in be6e15a3 (2026-11-02).

## K584 (Done 2026-11-02)

- **K584** · already guarded: SCENE_FIELDS Record<keyof SceneParams> fails tsc TS2741 on optional field; name-build tests round-trip. Done in be6e15a3 (2026-11-02).

## K112 (Done 2026-11-02)

- **K112** · cross-tab sync only; the camera half is K1109. Done in 758dfe1e (2026-11-02).

## K1113 (Done 2026-11-02)

- **K1113** · Cursive b, v and w (J3f, v6.9): ends rounded out (about -8°; the font's -12 to -16°), exit ports, every join out of them solved, their presets deleted; out of b/v/w hooks 43→0, spikes 49→3, rough 47→27. Levi's look: K1119. Done in 4d0fc282 (2026-11-02).

## K1033 (Done 2026-11-02)

- **K1033** · form B names a surface by its covering pieces only (`labelBy: "cover"`, S3b F1-F2): the census reads 0 DEFECT and 0 fade on all 12 scenes (was 137 and 216). Done in 239fba3f (2026-11-02).

## K403 (Done 2026-11-03)

- **K403** · abbott comment stage 4, codec citation by name, K74 stage 3 sections 4.2-4.3 and handoff files. Done in cb9e6fdb (2026-11-03).

## K263 (Done 2026-11-03)

- **K263** · lore and K80 brief no longer cite undoAllowed (removed 2605bf6b/K534). Done in 5316c39a (2026-11-03).

## K600 (Done 2026-11-03)

- **K600** · gameplay-links.md gains gm key and K534 entry. Done in 6ef60f05 (2026-11-03).

## K609 (Done 2026-11-03)

- **K609** · pluck docs point at chain 2 key 427, rechecked live on 5585. Done in b4d15403 (2026-11-03).

## K462 (Done 2026-11-03)

- **K462** · K323 table and undo list updated to shipped burn rows (2026-11). Done in 7760bf01 (2026-11-03).

## K1125 (Done 2026-11-03)

- **K1125** · K309 control from failing (k, n) pairs (seed 4 chain 7 n 82: pre-fix 359-389 px, master 0 px) and rimSeam whole-frame diff explained as a first-capture blank frame (K156 round 2026-11-03). Done in e7ebb1c4 (2026-11-03).

## K1124 (Done 2026-11-03)

- **K1124** · K895 (b): installer refuses finish samples (fa39d0bd, test test/phone_pass/install_floor.test.ts); portrait A/A retaken at -Moves 0,7,11 and installed as scripts/phone_pass/noise.json (d4c1dc41). Done in d4c1dc41 (2026-11-03).

## K895 (Done 2026-11-03)

- **K895** · phone_pass kit (K156 round 2026-11-02): (a) the median averages at even n and (d) a phase refuses once its pass has `state/watchdog.trip` (452cf61b, test `test/phone_pass/k895.test.ts`); (c) servers and watchdog start detached through WMI (f8c7669e). (b), the A/A floor, continues as K1124. Done in f8c7669e (2026-11-03).

## K1107 (Done 2026-11-03)

- **K1107** · Muse batch 6: runs A-F passed their gates (2026-11-02 20:20 to 2026-11-03 00:28) and closed all 14 items (K343, K130, K495, K128, K212, K490, K787, K584, K112, K403, K263, K600, K609, K462); Levi checks K1110, K1111 and K1118. Done in b4d15403 (2026-11-03).

## K368 (Done 2026-11-03)

- **K368** · High contrast wears the ring. Done in 89836d3b (2026-11-03).

## K1100 (Done 2026-11-03)

- **K1100** · non-breaking joins in the hidden row. Done in 22b5ebab (2026-11-03).

## K748 (Done 2026-11-03)

- **K748** · no focus ring after a pointer click; phone pass and fragile check split out. Done in 70a1a43b (2026-11-03).

## K1109 (Done 2026-11-03)

- **K1109** · probed: the taps jump. Done in 977ad2f8 (2026-11-03).

## K1099 (Done 2026-11-03)

- **K1099** · reset snaps; jump threshold checked; follow spring to Levi. Done in 977ad2f8 (2026-11-03).

## K1101 (Done 2026-11-03)

- **K1101** · 119 pairs merged under one heading. Done in e5996c10 (2026-11-03).

## K426 (Done 2026-11-03)

- **K426** · index rows complete; scripts/lore_index_check.mjs. Done in 13906317 (2026-11-03).

## K437 (Done 2026-11-03)

- **K437** · rules name frame_loop.ts; half rate added. Done in 13906317 (2026-11-03).

## K1108 (Done 2026-11-03)

- **K1108** · Muse batch 7: runs A-F passed their gates (2026-11-03 00:29 to 03:06) and closed K368, K1100, K748, K1109, K1099, K1101, K426, K437; filed K1126, K1127, K1129 (Levi) and K1128. Done in 13906317 (2026-11-03).

## K332 (Done 2026-11-03)

- **K332** · key hints after the first direction press. Done in 698a2924 (2026-11-03).

## K657 (Done 2026-11-03)

- **K657** · win banner shows snapped and par rows. Done in 85decf22 (2026-11-03).

## K1081 (Done 2026-11-03)

- **K1081** · one panel rect read a frame (camera cache). Done in ac42b67a (2026-11-03).

## K1082 (Done 2026-11-03)

- **K1082** · incremental burn declare; fillets split out. Done in e0ec49f3 (2026-11-03).

## K1115 (Done 2026-11-03)

- **K1115** · one general Reset fix in row/doReset. Done in 0ad79ddc (2026-11-03).

## K1131 (Done 2026-11-03)

- **K1131** · Muse batch 8: K332, K657, K1081 and K1115 done, K1082's declare half; K1083 and K1133 were measured with `fw=0`, not on K1077's flow-on stand (the brief's error), so both retrace. Done in 0ad79ddc (2026-11-03).

## K1134 (Done 2026-11-03)

- **K1134** · Gap slots stand pat on the K1083 burn stands (cause none on 120/120 frames; 0 updates and 0 gap solves a frame, realtime and turn, on master and pre-K1082 alike), so K1077 cluster 3 does not reproduce there; solves still run per awake update (drag 287/frame) (split from K1083). Dropped: its stands were `fw=0`, which removes K1077's flow trigger; folded into K1083's retrace (the drag stand's re-solve per awake update is expected: the geometry moves) (2026-11-03).

## K1110 (Done 2026-11-03)

- **K1110** · Levi heard the snore on the phone's first touch (2026-11-03: 'The snore sound is good'). Done in 2b539fc8 (2026-11-03).

## K1083 (Done 2026-11-03)

- **K1083** · retraced with the flow on: no realtime extra. Done in 0451032c (2026-11-03).

## K1135 (Done 2026-11-03)

- **K1135** · behavior test on a real Pane, plus a warn-once. Done in d18d0be3 (2026-11-03).

## K1111 (Done 2026-11-03)

- **K1111** · Levi 2026-11-03: the finer-step sliders feel right ("Pulse reach is good"; "Settle params are probably good for now"). Done in 9e617d7a (2026-11-03).

## K1118 (Done 2026-11-03)

- **K1118** · Levi 2026-11-03: Motion follows across tabs without a reload. Done in 758dfe1e (2026-11-03).

## K1129 (Done 2026-11-03)

- **K1129** · With Reduced motion on and the camera following the player, the view still glides after every move. Dropped: Levi 2026-11-03: "camera glide with reduced motion is fine", so the view keeps gliding (2026-11-03).

## K1137 (Done 2026-11-03)

- **K1137** · Muse batch 9: A, K1132's key-hint pictures; B, K1083 closed and K1133 kept open on the flow-on retrace; C, K1135's Reset test; D, batch 10's draft (K1141). Done in ff87d810 (2026-11-03).

## K1141 (Done 2026-11-03)

- **K1141** · Muse batch 10: A, K1138's backdrop tuning (6aa02f19; the slider's top waits on Levi); B, batch 11's draft, reviewed into K1146 with its Run B dropped. Done in 39d47cce (2026-11-03).

## K1142 (Done 2026-11-03)

- **K1142** · Phone kit guard: one shared read-only readiness check (`scripts/phone_pass/phone_ready.mjs`: screen on, unlocked, the launcher in front, 120 s without a touch) that every tracked phone runner calls before opening anything. Done in d773eb10 (2026-11-03).

## K234 (Done 2026-11-03)

- **K234** · `scripts/phone_pass.ps1`'s `-Phase check` and `-WaitReady` called a phone in use ready: K1142's shared check (`scripts/phone_pass/phone_ready.mjs`) now needs the launcher in front and 120 s without a touch. Done in d773eb10 (2026-11-03).

## K804 (Done 2026-11-03)

- **K804** · beat indicator dropdown: pulse and ring at the dot; dots split out. Done in 4f6ff982 (2026-11-03).

## K1146 (Done 2026-11-03)

- **K1146** · Muse batch 11: K252 (a), the pan range's ease by time (0bbdc36b); K144's accounts doc (61a24a82); K804's beat ring (4f6ff982); K207's fog dedupe, partial (16b1c56f); K688's healing-cuts doc (182cfc8d). Done in 55df4231 (2026-11-03).

## K202 (Done 2026-11-03)

- **K202** · an unstarted floating daily rolls to the new day at midnight. Done in 20ee92c0 (2026-11-03).

## K201 (Done 2026-11-03)

- **K201** · the Played chip counts the tile's days; a practice row shows its count. Done in 9cf52379 (2026-11-03).

## K125 (Done 2026-11-03)

- **K125** · Scarborough Fair loops on whole bars (closing rest 3). Done in 26455925 (2026-11-03).

## K165 (Done 2026-11-03)

- **K165** · a halted load keeps its HALTED stamp; the load wall clock split out. Done in 0efcead7 (2026-11-03).

## K170 (Done 2026-11-03)

- **K170** · scripts/phone.ps1 wakes the phone only under -Wake. Done in 620ddf93 (2026-11-03).

## K308 (Done 2026-11-03)

- **K308** · the contours' fifth line counts exactly (integer-corrected). Done in cd1f0087 (2026-11-03).

## K1153 (Done 2026-11-03)

- **K1153** · Muse batch 12: K202's midnight rollover (20ee92c0); K201's Played chip (9cf52379); K125's whole bars (26455925); K165 (a)'s HALTED stamp (0efcead7, K1154 split off); K170's opt-in wake (620ddf93); K308's exact fifth contour (cd1f0087). Done in 57b60232 (2026-11-03).

## K1152 (Done 2026-11-03)

- **K1152** · phone_ready.mjs states its check in its own words (no deleted file, no rebased hash). Done in 1bb70ac1 (2026-11-03).

## K1148 (Done 2026-11-03)

- **K1148** · --ready guards bench_frame --cdp, k923 sync --target phone and close_tabs; the adb fold split out. Done in 1bb70ac1 (2026-11-03).

## K1155 (Done 2026-11-03)

- **K1155** · scripts/phone.ps1 finds the phone among online android peers; -TailscaleHost is the override, default empty. Done in 2e188c47 (2026-11-03).

## K1154 (Done 2026-11-03)

- **K1154** · the physics-off load's wall cap and reported time count visible time (both hosts). Done in 746284a4 (2026-11-03).

## K351 (Done 2026-11-03)

- **K351** · the panel inventory's Read by follows url_state's *Of builders. Done in 0a16e218 (2026-11-03).

## K685 (Done 2026-11-03)

- **K685** · a respawn into stranded or out of strokes shows its banner without a tap. Done in 630da3c0 (2026-11-03).

## K1156 (Done 2026-11-03)

- **K1156** · Muse batch 13: B K1152+K1148 (1bb70ac1), C K1155 (2e188c47), D K1154 (746284a4), E K351 (0a16e218), F K392's seam half (e611bc2e), G K685 (630da3c0); all reviewed. Done in b3ca3046 (2026-11-03).

## K1160 (Done 2026-11-03)

- **K1160** · scripts/phone_pass.ps1 finds the phone among online android peers; -TailscaleHost is the override, default empty. Done in 0904b7ce (2026-11-03).

## K1159 (Done 2026-11-03)

- **K1159** · adb lookup folded into phone_ready.mjs (findAdb picker); phone_pass.ps1 delegates with --find-adb; phone.ps1's own lookup left beside them. Done in 0904b7ce (2026-11-03).

## K710 (Done 2026-11-03)

- **K710** · a real-time catch (and an extra's, and the sword's touch) cannot land through a broken run; contact counts tails but not broken runs. Done in 4b347cad (2026-11-03).

## K1161 (Done 2026-11-03)

- **K1161** · Muse batch 14: runs B-F landed K1160+K1159, K710, K711 (c), K732's desktop half and K740's first gap. Done in e11beadd (2026-11-03).

## K1114 (Done 2026-11-03)

- **K1114** · S1i: corner rounding back at the junction roots (rootBand 0.5). Done in 8b436272 (2026-11-03).

## K1138 (Done 2026-11-03)

- **K1138** · The backdrop speed slider tops out at 16x (Levi's call, 2026-11-03). Done in 56e6262f (2026-11-03).

## K628 (Done 2026-11-03)

- **K628** · Confetti (Levi 2026-11-03): the finish spray throws no streamers (as built); GPU confetti (K579) goes after K318 stage 1, where it is queued. Done in this commit (2026-11-03).

## K1164 (Done 2026-11-03)

- **K1164** · Master's history rewritten without the device addresses (force-pushed 2026-11-03; 2,456 commits from 7645fe67 on) and 3,823 quoted SHAs remapped; the old history is mirrored in ~/Backups, the map is `.claude/probes/K1164/commit-map`; leftovers K1166, K1167. Done in 82aa5072 (2026-11-03).

## K1170 (Done 2026-11-03)

- **K1170** · The key hints show the d-pad button that takes each run (Levi 2026-11-03: the arrows point along the runs, mostly diagonals no pad button presses; `hintMap` picks the smallest err). Done in 81081ab9 (2026-11-03).

## K778 (Done 2026-11-03)

- **K778** · an Undo button in the HUD's rules row; ruleUndos 0-5 (default 1) sets how many a run gets; the Stranded banner's Undo unchanged. Done in 82537593 (2026-11-03).

## K1158 (Done 2026-11-03)

- **K1158** · K1040's label pass keeps GL state from Pixi's tracking, without draw()'s queries (S3f step 1). Done in 1aac725b (2026-11-03).

## K1132 (Done 2026-11-03)

- **K1132** · key hints (the d-pad button that takes each run, K1170) sit out past the head marker; the reach placement and __knotKeyHintPlace are gone. Done in 415d131f (2026-11-03).

## K1162 (Done 2026-11-04)

- **K1162** · Doc and item-text errata from the ask-card pass, all 15 checked: Muse run 15C fixed the docs (b2ca45af; claims 4, 11 and half of 8 were wrong), Claude applied its seven item-text lines (K440, K626, K1128, K887, K656, K693 and the K207 note). Done in b2ca45af (2026-11-04).

## K1169 (Done 2026-11-04)

- **K1169** · Muse batch 15 (`docs/design/K1169_muse_batch15.md`): runs A (K1139 S2), B (K778) and C (K1162) done, each reviewed against its report and CI. Done in 95f8f0b0 (2026-11-04).

## K1171 (Done 2026-11-04)

- **K1171** · One Rules dropdown, Fragile runs: off, crack, snap, collapse, collapse (free); one link param (codec v10, `&cl=` gone); the Par rows disabled under the collapse options (Muse run 15E; shots checked). Done in 9a655597 (2026-11-04).

## K1173 (Done 2026-11-04)

- **K1173** · A Tug threads checkbox in Touch & feel (per browser, on by default, never in a link): off, a drag pans wherever it starts and a tap still plucks (Muse run 15F). Done in d41a02c9 (2026-11-04).

## K435 (Done 2026-11-04)

- **K435** · probes.md's FX-off burn pin waits two frames and says container.visible = false does not stop the burn FX; THE BURN's under-both-looks line was already corrected by K599. Done in 08e2165e (2026-11-04).

## K390 (Done 2026-11-04)

- **K390** · probes.md's fog A/B recipe passes &phw=0 (same-build controls about 700 px instead of 4054-7979); the start marker's two states stay unexplained, and the recipe says so. Done in 08e2165e (2026-11-04).

## K69 (Done 2026-11-04)

- **K69** · String mode (`pv=string`) on pre-G2.3 builds drew a 1-px diagonal sliver from the start to the exit marker (`?b.c&pv=string`, 6 moves); G2.3 doesn't show it, never attributed (G2 doc section 7, Follow-ups). Dropped: moot: G2.3 and later never showed the sliver, and since K83 (21a525e) that Graphics draws only the win ring (2026-11-04).

## K511 (Done 2026-11-04)

- **K511** · K334/K348 note (2026-10-15): K334's pointer queueing is superseded by Levi's correction in 2bcf771; K348's mid-move wait-tap leftover is now intentional for pointers. Dropped: a note, not open work: K334's queueing was superseded by 2bcf771 and K348's leftover is intentional (2026-11-04).

## K701 (Done 2026-11-04)

- **K701** · Section shader lengths rose again, limits now 47,750 / 64,150 characters (K324 s2: +85 each; `test/render/k320_slim.test.ts`). Dropped: a record, not open work: k320_slim.test.ts pins the section shader limits (57,430 and 73,850 today) (2026-11-04).

## K1166 (Done 2026-11-04)

- **K1166** · After the history rewrite (K1164), two things only you can do: send GitHub Support the drafted request so closed PR #1 stops serving the old commits, and reset the laptop's knotmaze copy before its next use. Dropped: Levi 11-04: “let's ignore this”: the Support request is not sent; the laptop reset is Residual K1181 now (2026-11-04).

## K1163 (Done 2026-11-04)

- **K1163** · Corner rounding's softer root gate (the root band scaled by the tip factor, Muse batch 16 Run H): the ten near-straight cusp corners now match S1f; row 15's corner goes on in K1180. Done in ab7cad9a (2026-11-04).

## K1175 (Done 2026-11-04)

- **K1175** · key hints recompute while the flow is on, so a disc never names a stale key on a bisector run. Done in 2a856876 (2026-11-04).

## K999 (Done 2026-11-04)

- **K999** · probes.md's paths narrowed to the probe scripts; K863's trace and data reads no longer carry it. Done in 2b302a3f (2026-11-04).

## K178 (Done 2026-11-04)

- **K178** · K79, K99 and K104 private-cache wrappers load the config with loadConfigFromFile, as K1139's tracked copy does. Done in 1a02e2b8 (2026-11-04).

## K1178 (Done 2026-11-04)

- **K1178** · Muse batch 16 (runs A-L, `docs/design/K1178_muse_batch16.md`), each through the chain's gate; the open leftovers stay on their own items (K484, K648, K1179). Done in 20453e7c (2026-11-04).

## K1179 (Done 2026-11-04)

- **K1179** · Thread geometry (Levi 11-04: rethink how thread bodies, junction rounds and gaps are built, maybe as a skin on the thread centres): reviewed (`docs/design/K1179_geometry_review.md`), no simulated skin; its one-rule outline failed the spike five times (S1-S1e, `docs/design/K1179_s1e.md`), so no rebuild. Done in b6174b00 (2026-11-04).

## K1183 (Done 2026-11-04)

- **K1183** · .claude/rules/render-field.md covers src/render/field/ and test/render/field/ with narrow paths, distilling only the binding form B and field-scene grammar from the design docs and code headers; no open K1179 question settled. Done in 9ebf6ace (2026-11-04).

## K1184 (Done 2026-11-04)

- **K1184** · Muse batch 17 (runs B-G: K1183 rules file, K711 b, K737 fire piece, K782 follower, K188 restart, K292 dog-ears gated for the look) reviewed by Claude. Done in 06a41d1d (2026-11-04).

## K292 (Done 2026-11-04)

- **K292** · the panel's corner marks and key line show for everyone, Seed row marked too (Levi 2026-11-04: yes as shown). Done in 38116577 (2026-11-04).

## K1187 (Done 2026-11-04)

- **K1187** · Fire with breaking runs: a broken anim run's unswept stretch draws its burn again (Muse batch 18 run D; Claude scoped the cut to a broken run in 222452e3). Done in 0a776aa0 (2026-11-04).

## K1188 (Done 2026-11-04)

- **K1188** · scripts/preview.ps1 reproduced and fixed: a -Root whose -Ref worktree files pass 260 chars is refused before creating anything (git 2.33: GIT_DIR too big); a killed -Ref server's temp worktree is cleaned by the next run under the same -Root, junction unlinked first, live siblings untouched (Claude read the cleanup: src-* under that root only, any doubt kept). Done in f5035e0d (2026-11-04).

## K1189 (Done 2026-11-04)

- **K1189** · Muse batch 18: K292 corner marks (38116577), K782 toast (8ba8dc69), K711 chase tap (ee46522e), K1187 burn (0a776aa0, scoped by 222452e3), K1188 preview.ps1 (f5035e0d). Done in f5035e0d (2026-11-04).

## K1192 (Done 2026-11-04)

- **K1192** · Muse batch 19 (`docs/design/K1192_muse_batch19.md`): K1186's flip count, K1182's biarc and Run F's look at its corners, K1191's examinations, K782's waiting follower. Done in 3ddaec22 (2026-11-04).

## K1182 (Done 2026-11-05)

- **K1182** · 19C's biarc rim, its rimCurveBiarc flag and their tests removed; the header beside K859's Hermite says why it stays out (the quadratic reads smooth, the biarc notched at all four targets). Done in b05e7a5a (2026-11-05).

## K1199 (Done 2026-11-05)

- **K1199** · Muse batch 20 (`docs/design/K1199_muse_batch20.md`): K1139 S5 (B), K1202's cause (C), K1186's crops (D), K1201's GPU step (E), K1196's timing (F), K1198's Plc1m and ij (G). Done in c3ab0a46 (2026-11-05).

## K1202 (Done 2026-11-05)

- **K1202** · cyc e210's kymograph step at the other band's cover edge: Muse's wider ramp (5e0d5914) changed nothing visible at 1x and stays off; the step is the two fields' mismatch, not the edge (K1190's fronts; notes). Done in 5e0d5914 (2026-11-05).

## K1203 (Done 2026-11-05)

- **K1203** · A pulse band ignored its child arm's end window: Run D's fix (a0f1d634, behind a switch) judged on by a GPU positive control, its `table_cyc.mjs` copy reads BAND EXTENT past the arm (notes); K1207 makes the window the only path. Done in a0f1d634 (2026-11-05).

## K1206 (Done 2026-11-05)

- **K1206** · Batch 22's Run A brief (`docs/design/K1208_muse_batch22_run_a.md`) has its draft check every path it cites, quote each number from the file that holds it, and list the paths in its report. Done in 76f3dbc6 (2026-11-05).

## K1186 (Done 2026-11-05)

- **K1186** · Fill look: no hold-and-fade, a layer-vote flip draws 0 px (21E). Done in 080d4b49 (2026-11-05).

## K1204 (Done 2026-11-05)

- **K1204** · Muse batch 21 (Runs B to G) ran through the chain, and Claude judged each run. Done in e43b2cfc (2026-11-05).

## K1119 (Done 2026-11-05)

- **K1119** · Cursive v7.0: Levi chose v6.8 on every sheet. Done in f7be8548 (2026-11-05).

## K1197 (Done 2026-11-05)

- **K1197** · Cursive c joins: Levi kept the old hand-set joins. Done in f7be8548 (2026-11-05).

## K1207 (Done 2026-11-05)

- **K1207** · In Muse batch 22 (K1208): remove Run C's switch (`setPulseCoverRamp`, 5e0d5914, off by K1202) and make Run D's end window (`setPulseBandEndWindow`, a0f1d634, on by K1203) the only path, re-freezing the pins it moves; it also says whether 21D's twin point is a fan pixel (K1203's notes). Done in 0af054cc (2026-11-05).

## K1190 (Done 2026-11-05)

- **K1190** · K1139 Stage 4's look calls (card `docs/asks/K1190.md`; sheets t4, t6 in `.claude/probes/K1139/out/s4/sheets/`): soften the sharp fronts (ji 33, ji 149); smooth ji 33's straight edges; ji 149's gold edge round again; fill the notch. Dropped: superseded by K1211 (Levi 2026-11-05: the light inside a junction must read as one seamless unit) (2026-11-05).

## K1200 (Done 2026-11-05)

- **K1200** · Light on loops (K1139 S4): pulses entering a loop from both ends meet halfway and fade out in pairs; Levi 2026-11-05: "Fine as is". Done in 4ac52bb0 (2026-11-05).

## K1126 (Done 2026-11-05)

- **K1126** · High contrast shows the ring ripple whatever ripple was picked (K368); Levi 2026-11-05: "It reads well". Done in 89836d3b (2026-11-05).

## K1001 (Done 2026-11-05)

- **K1001** · Corners where two threads split: Levi kept K830's rule (broad gaps round, narrow points sharp), so a split stays sharp. Done in 73186e5c (2026-11-05).

## K1196 (Done 2026-11-05)

- **K1196** · Two-ended pulses (K1139 S4) cost nothing measurable on the desktop (22E: head-base within the +0.22 ms drift between builds timed one after another; S4 alone +0.15 at rest, ~0 in play), so no Pixel run; the frame-tail watch is K1214 (notes). Done in 34d1e863 (2026-11-05).

## K1198 (Done 2026-11-05)

- **K1198** · Cursive ij: i and j on v6.8 (22G: the font's type-4 ligature lookups emptied, calt kept; only ij moved, 712 pieces equal); the six pins stay, each moves without it; the kit adopts it in K863's next stage (notes). Done in 5f5025de (2026-11-05).

## K1120 (Done 2026-11-05)

- **K1120** · Cursive v6.9 joins out of b, v and w (J3f): into b, f, h, k and l a straight climb to the 100 u attach limit, 53-57 u from the font (next: an entry rule after high exits); br, vr and wr meet r's cusp in a V; be and we show small repeated spikes; e after b/v/w has its own rule, landing up to 60 u into e (keep it, or fold it into K948's e-after-o rule, which moves oe) (`K1113_cursive_j3f.md` ## Handoff). Dropped: superseded: Levi kept v6.8's joins (K1119) and its c (K1197), so v6.9 to v7.2 are not used (2026-11-05).

## K1121 (Done 2026-11-05)

- **K1121** · Cursive v6.9 gates (J3f): locality fails, 157 of 1448 untouched pieces moved by up to 0.33 u (b's, v's and w's whole strokes were refitted; next: refit only the exit's stretch); seven rows newly fail rough (bt, vt, wt, ba, wa, and the ba and wa in bad and wave); 41 of the 78 joins sit at a bound; b/v/w font distance about 24 u (was about 3) (`K1113_cursive_j3f.md` ## Handoff). Dropped: superseded: Levi kept v6.8's joins (K1119) and its c (K1197), so v6.9 to v7.2 are not used (2026-11-05).

## K1144 (Done 2026-11-05)

- **K1144** · Cursive v7.0's leftovers (K1119's Handoff in `docs/design/K1119_cursive_j3g.md`): br, vr and wr dip into r as a tighter V (br newly fails roughness); five of six a/q joins fail it; q's low point is 0.4 u above the band; be, ve and we sit 40.8-42.0 u from the font (Levi: the v7.0 or the e60 column). Dropped: superseded: Levi kept v6.8's joins (K1119) and its c (K1197), so v6.9 to v7.2 are not used (2026-11-05).

## K1193 (Done 2026-11-05)

- **K1193** · Cursive c (v7.1, J3h): 14 of the 26 c joins sit at the 10 u bound of c's exit port (`docs/design/K1112_cursive_j3h.md`, Handoff). Dropped: superseded: Levi kept v6.8's joins (K1119) and its c (K1197), so v6.9 to v7.2 are not used (2026-11-05).

## K1145 (Done 2026-11-05)

- **K1145** · Cursive x5 (`R_DX=22 R_A1=-15 R_L1=10`): a steeper b, v and w exit (about -22 deg), if Levi wants v7.0's exits further down (K1119's Handoff). Dropped: superseded: Levi kept v6.8's joins (K1119) and its c (K1197), so v6.9 to v7.2 are not used (2026-11-05).

## K1209 (Done 2026-11-05)

- **K1209** · Retire the fillet layer vote (one fan layer; K1186), Muse Run I (22I): no pin moved; 0 px but the accepted fat11 ji104 drag3 (23/14 px). Done in cb5a7301 (2026-11-05).

## K1212 (Done 2026-11-05)

- **K1212** · K863's trace kit: g2 reads the angle, census rows keyed by id, word lists each id once (J3k). Done in 0136f455 (2026-11-05).

## K647 (Done 2026-11-05)

- **K647** · Path 8 (K336): Reset path during the winning move records the result but shows no card. Done in adee40a6 (2026-11-05).

## K744 (Done 2026-11-05)

- **K744** · Junction blips under the rule colors: gone on master at K749's junctions, alternate and cycle (desktop; Run K, 22K). Done in 0f63e3d5 (2026-11-05).

## K734 (Done 2026-11-05)

- **K734** · The hairline seam inside the i fork at xh 3: gone on master (Run K, 22K); the fork's pale disc and steps are K1220. Done in 0f63e3d5 (2026-11-05).

## K15 (Done 2026-11-05)

- **K15** · A joint's fan ahead of its arm during a reveal: gone, the fan follows the joint gate's knotFanAlpha (Run K, 22K). Done in 0f63e3d5 (2026-11-05).

## K218 (Done 2026-11-05)

- **K218** · Trail-mode junction caps' flat p step: gone at 7 stands, routed junctions skip the caps (Run K, 22K). Done in 0f63e3d5 (2026-11-05).

## K678 (Done 2026-11-05)

- **K678** · A K81 cover strip with fewer than 9 pairs of room drops a round join arc (falls back to the sample pair); no A/B scene reaches it (`RibbonMesh.coverPairs`, the joinery.ts cover loop; K580 s3). Dropped: unreachable today: cover strips exist only at routed fabric junctions, which carry no round join, and text scenes have joins but no routes (Run K, 22K: 50 seeds, 35,288 calls, 0 fallbacks) (2026-11-05).

## K987 (Done 2026-11-05)

- **K987** · Cursive: a G2 rule at a smooth node's retrace follower (n's kinks). Dropped: gone on v6.8: 22L (734c55b9) found n's smooth nodes at 0 deg turns and 0 jumps, 0 internal kinks in 713 census rows (2026-11-05).

## K927 (Done 2026-11-05)

- **K927** · Cursive fits stopping at nfev 600. Dropped: superseded: v6.8's bodies come from the few-node writer, with no trace fit (a 0.40, q 0.42 u off the trace; 22L, 734c55b9) (2026-11-05).

## K912 (Done 2026-11-05)

- **K912** · Cursive o and b exits per class, f's exit walk, per-left sets (K902). Dropped: superseded: v6.8 solves each join per pair from its port, no per-left sets or exit walk (22L, 734c55b9); ok's distance is K1090's (2026-11-05).

## K938 (Done 2026-11-05)

- **K938** · Cursive v5.2: zo at 142 u, five crossings into o. Dropped: gone on v6.8 (22L, 734c55b9): zo 2.96 u; ob, of, oh, ok and ol cross a body once each, as allowed (2026-11-05).

## K948 (Done 2026-11-05)

- **K948** · Cursive: the e after o, b, v and w (an elbow). Dropped: superseded on v6.8 (22L, 734c55b9): oe solved anew with no hook (its 12.69 u is K998's); be, we, ve keep the presets Levi kept (K1112) (2026-11-05).

## K990 (Done 2026-11-05)

- **K990** · Cursive f ends its lower loop in a corner into its exit, no curl (J3e, v6.8; 22L measured it, 734c55b9). Done in 636bd685 (2026-11-05).

## K1219 (Done 2026-11-05)

- **K1219** · Loop ji 12's dark triangle: slot 28's casing fade on ch5's gold (22O; `gap_mask.ts:802`, K1218 S1's). x4 ji 149's teal notch: not the mask, the fan's untraveled web past the gold band's round edge (`junction_field.ts:358`): after K1211 S5, in its file; notes `## K1218 (2026-11-05, 22O reviewed)`. Dropped: folded into K1218 S2 (docs/design/K1218_s2_fused_junctions.md) (2026-11-05).

## K1208 (Done 2026-11-05)

- **K1208** · Muse batch 22: runs B to P through the chain; Run D dropped, since K1211 S6 removed the pulse bands it crossfaded. Done in 27d103d1 (2026-11-05).

## K1213 (Done 2026-11-05)

- **K1213** · Cursive v6.8: word-final s and p run on in a flat tongue, the i and j dots are dashes, the q tail steps at 5x; J3k's S2, P1, D2 and Q1 follow the font, each local. Dropped: Levi answered 2026-11-05: "all word-end letters should have a tail, but both the s and p tails are currently bad. Tails should match the curvature they pass by and swoop up more. D2 for [the dots] is good. ... Q1 is good." K863 J3l builds it (docs/design/K863_cursive_j3l.md) (2026-11-05).
