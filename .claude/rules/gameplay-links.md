---
paths:
  - "src/ui/param_codec.ts"
  - "src/ui/url_state.ts"
  - "src/ui/daily_link.ts"
  - "test/ui/param_codec.test.ts"
  - "test/ui/url_codec.test.ts"
  - "test/ui/seed_text.test.ts"
  - "test/ui/appear_mode.test.ts"
---

# Gameplay lore: links and the codec

Moved verbatim from `gameplay.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `gameplay.md` lists the area's other files.

## Links and the codec

- *From COMPACT LINKS (2026-10-11), decoder details:* DETAILS beyond the spec, each for a measured reason:
  a TRAILING "=" on the token is tolerated (`new URL(link).searchParams
  .append(...)` re-serializes `?<token>` as `?<token>=&...`), as are
  trailing dots (sentence punctuation after a pasted link); `&key=value`
  pairs after a token apply as overrides, so probes keep writing
  `&am=instant` / `&mf=0`, and unknown keys (fbclid, utm_*) drop on the
  rewrite. The decoder is strict otherwise: an invalid char, truncation,
  a version other than CODEC_VERSION (K132), out-of-range index/option,
  reserved number code, or leftover bits beyond the zero padding rejects
  the whole blob (seed kept, today's defaults, one console.warn) -
  all-or-nothing, never a partial design. A listed boolean flips TODAY's
  default, so flipping a boolean default inverts every link that lists it
  (K74's deadEnds: `?12l.IS3ygt` turned dead ends on before it, off
  since).

- *From COMPACT LINKS, a query without a seed:* A query WITHOUT a seed (`?am=instant`) is no link at all: a fresh
  design at TODAY's defaults (the bare page too, until K56 made it the
  daily).

- trailLength's default is 10 (K73, 2026-10-12; Levi: recentPath should
  light "about twice as far"; slider max 30). The dailies read 5 until
  K132 and 10 since; K46's memory-trail days were designed around 5
  (docs/design/K46_daily_variety.md).

- LOAD SETTLE PARAMS (K147, 2026-10-13; the mechanism is physics-settle.md's
  "The load settle"): `settleBudget` (`stb`, ms of physics a frame while a
  new knot first settles; 0 = off, i.e. real-time stepping and its
  catch-up spiral) and `loadSettle` (`lds`, seconds of hidden pre-settle
  stepping; 0 = none, the max 5 = settle first: hidden until the first
  sleep) are APPENDED to codec v4 at indices 82 and 83 (after K79 stage
  B's 72-81). Both are DAILY_EXEMPT_KEYS:
  they pace how a device plays a design's settle, they do not change the
  design (like physics on/off), so a daily stays the daily with either set
  and the golden dailies do not move. Panel: "Motion & intro", before
  Replay settle. url_state.ts clamps both (SETTLE_BUDGET_MAX 30,
  LOAD_SETTLE_MAX 5); override keys `stb` / `lds`.

- MARKER SIZE PARAM (K98, 2026-10-14): `markerSize` (`mks`, the markers'
  diameter in thread widths, default 2 since K225, 1.08 before; clamped
  to [0.25, 3]) is
  APPENDED to codec v4 at index 104 and is a DAILY_EXEMPT_KEY: it changes
  only how the markers look, so the golden dailies do not move (K57
  reviews the exempt list). Panel: the maze folder, after the confetti
  rows, fabric mode only. The render side is render-markers.md's K98
  entry.

- HIGHLIGHT MODE PARAM: removed in K111 stage 3 (2026-10-14).
  `highlightMode` (`hm`, codec index 108, the table's last; a
  DAILY_EXEMPT_KEY) went with the modes: Levi (K248) kept the pulses on
  the choices (render-paint.md's HIGHLIGHT MODES line). A removal bumps
  the codec, so CODEC_VERSION is 5: a v4 token (`?<seed>.J...`) reads as
  its seed at today's defaults, with a warning, and an empty v5 blob is
  `.L`. Index 108 is free again: the next appended param takes it, and a
  branch that appended after 108 (K80's turns) renumbers when it rebases.

- H1 SHARE PARAM (K74 stage 2, 2026-10-14): `hCutShare` (`hcs`, [0, 1],
  default 1) is APPENDED to codec v5 at index 117, after K80 turns'
  108-116. It changes the maze, so it is NOT a DAILY_EXEMPT_KEY: it is in
  MAZE_PARAM_KEYS, and a change of its default moves the golden dailies
  (the mechanism is generation-plan.md's H1 entry). Panel: the maze
  folder, after deadEndLength, fabric mode only. A link that lists
  `hcs` keeps its share when the default changes.

- BURN RACE PARAMS (K114 stage 1, 2026-10-14): `fire` (`fi`, off | fuse),
  `fireSpeed` (`fsp`, 0.6 since K280, 0.75 before) and `fireDelay` (`fdl`,
  0) are APPENDED to
  codec v5 at 118-120, after K74's `hCutShare` (117); CODEC_VERSION stays
  5. Not daily-exempt. They were 117-119 on their branch until it rebased
  onto K74 stage 2, which renumbered them and re-froze the table pin
  (`test/ui/param_codec.test.ts`). The race itself is gameplay-fire.md.
  Since K440 `fsp` / `fdl` are the TURN clock's pair (REAL-TIME FIRE PAIR
  below), and `fsp`'s floor is 0.1 ([0.1, 0.95]; 0.3 before).
- PLUCK EMPHASIS PARAMS (K279 stage 1, 2026-10-14; brief
  `docs/design/K279.md`). Seven viewer preferences, APPENDED to codec v5
  at 121-127, after the burn race's 118-120 (K114):
  - `pluckRipple` (`prp`: off, wave, glint or ring; default glint since
    K279 stage 2, wave before; `url_codec.test.ts`'s defaults table and
    its unknown-look case moved with it);
  - `rippleStrength` (`prs`, [0, 2], default 1);
  - `rippleAuto` (`pra`, [0, 2], default 0.35);
  - `pluckSheen` (`psh`, [0, 1], default 0.5);
  - `pluckTug` (`ptg`, [0, 1] thread widths, default 0; 0.3 until the
    wake probe, render-pluck.md's K279 WAKE COST);
  - `tugAuto` (`pta`, a flag, default off);
  - `autoPluckGain` (`pag`, [0, 1], default 0.5).

  They sat at 118-124 on their branch until it rebased onto K114
  (61c8859), which put them at 121-127 and re-froze the table pin
  (`test/ui/param_codec.test.ts`).
- All seven are in DAILY_EXEMPT_KEYS, so a daily keeps the player's own.
  The strengths clamp to [0, 2] (RIPPLE_STRENGTH_MAX) and the rest to
  [0, 1]. An unknown look reads the default.
- The same round raised three existing defaults: `pluckSize` 1.75 -> 2,
  `pluckGhost` 0.35 -> 0.5 and `pluckWhole` 0.5 -> 0.75. That moved the
  pins in `url_codec.test.ts` (the full-defaults table and the `?7&pw=`
  round trips). A link that lists `psz`, `pgh` or `pw` keeps its value.
- Panel: Touch & feel, after pluckGlow and ahead of tugLimit.
  - The two strengths hide while the look is off.
  - The sheen hides at pluckSize 0.
  - The tug rows hide unless physics is live, and tugAuto also at tug 0.

  All seven are listed under onSlackChange in undo_stack.ts's
  LIVE_EFFECTS, the callback their rows run, so an undo of one applies
  it live instead of rebuilding.
- Neutral (master's look and sound):
  `&prp=off&psh=0&ptg=0&pag=1&psz=1.75&pgh=.35&pw=.5`, plus `&pgl=off`
  since K194 made the glow `fallback`.

- CATCH RESET PARAMS (K80 turns stage 2, K273, 2026-10-14):
  `minoRestart` (`mrs`, default off) and `minoLair` (`mlr`, default on)
  are APPENDED to codec v5 at 128-129, after K279's 121-127 (they were
  121-122 on their branch until it rebased onto K279, which renumbered
  them and re-froze the table pin). Not daily-exempt. The same stage
  retuned minoSight (2) and minoAccuracy (0.3) in place and clamps
  minoRoamRuns / minoTerritory to at least 1 in every reader
  (MINO_RUNS_MIN). What they do: gameplay-minotaur.md's CATCH RESETS.

- HOVER GLOW WIDTH PARAM (K111 stage 4, 2026-10-14; Levi K264: "Rim
  width,0.4 is good, make it a slider., and personal setting."):
  `hoverGlowWidth` (`hgw`: how far in from each edge the hover rim
  reaches, in half-widths; default 0.85, RIM_EDGE; `clampHoverGlowWidth`
  holds it to [0.3, 1]) is APPENDED to codec v5 at index 130, after K80
  turns stage 2's 128-129. It was 121 on its branch, then 128 after a
  rebase onto K279 (2409cb9), then 130 after one onto K80 turns stage 2
  (02194b4); each rebase re-froze the table pin
  (`test/ui/param_codec.test.ts`). A DAILY_EXEMPT_KEY (a viewer
  preference: a daily keeps the player's own). `hcl` (High contrast's
  prototype look, gameplay-motion.md) is NOT a codec param: a temporary
  key read once at load.

- HOVER GLOW AND PICK PARAMS (K298, 2026-10-14; brief
  `docs/design/K298_hover_glow.md`). Four viewer preferences, APPENDED to
  codec v5 at 131-134, after K111 stage 4's `hoverGlowWidth` (130); all
  four are DAILY_EXEMPT_KEYS, so the golden dailies do not move:
  - `hoverGlowLength` (`hgl`, default 3, [0.5, 15] world): how far the
    hover glow reaches from the hover point (pulseReach before);
  - `hoverGlowFade` (`hgf`, default 0.2, [0, 1.5] world): its fade-in
    from each end gap (the fixed 0.75 before);
  - `pickMargin` (`pkm`, default 4, [0, 20] CSS px): how far past a
    thread's drawn edge a mouse or pen still picks it;
  - `pickChoiceRatio` (`pkr`, default 1.5, [1, 4]): a choice's margin
    over that one.

  url_state.ts clamps each (`clampHoverGlowLength`, `clampHoverGlowFade`,
  `clampPickMargin`, `clampPickChoiceRatio`; a non-finite value reads as
  the default) in the codec path and the override keys alike. The glow
  pair is listed under onTrailChange in undo_stack.ts's LIVE_EFFECTS,
  the pick pair under onSlackChange (the callbacks their rows run), so an
  undo applies them live. Shader: render-paint.md's K298; picking:
  gameplay-camera.md's PICK MARGINS; rows: gameplay-panel.md.

- PHYSICS WORKER PARAM (K7 stage 3, 2026-10-14; brief
  `docs/design/K7_worker.md`): `physicsWorker` (`phw`, a flag, default
  ON since K7 stage 6 / call F6, 2026-10-15; it was off through stage 5)
  is APPENDED to codec v5 (v6 since K76 stage 2c) at index 135,
  after K298's 131-134. A
  DAILY_EXEMPT_KEY (it changes where the physics runs, not the design,
  like `stb` / `lds`), so the golden dailies do not move. No panel row
  and no LIVE_EFFECTS entry: main.ts reads it ONCE, when it creates the
  host, so it takes effect on a reload (`&phw=0` after a token works as
  an override key and runs the in-thread host). The codec lists only
  what differs from TODAY's default (K132), so a link that lists `phw`
  now means OFF, and a pre-flip link that listed it (on) reads as
  in-thread; accepted pre-launch. On (the default), the physics runs in
  a module Web Worker
  (physics/worker_host.ts + physics_worker.ts); a worker that cannot be
  constructed, errors, sends an unreadable message, gives no `ready`
  within 3 s or reports another fingerprint falls back to the in-thread
  host and rebuilds, and `__knotPerf().host` says which host runs and
  why (`kind`, `reason`). To revert the flip: `physicsWorker: false` in
  url_state.ts's `PARAM_DEFAULTS` and the same value in
  `test/ui/url_codec.test.ts`'s defaults table.

- EXPLORATION PARAMS (K76 stage 2c, 2026-10-15; brief
  `docs/design/K76.md`, "Stage 2c"). Index 51's flag `fogOfWar` became
  the choice `exploration` (`xp`: off | fog | threads; default off). A
  type change, so CODEC_VERSION is 6: a v5 token (`?<seed>.L...`) reads
  as its seed at today's defaults with a warning, and the empty v6 blob
  is `.N`. Old keys still read (url_state `readExploration`): `xp` wins,
  then `trv=1` (threads), then `fow=1` (fog) or `fow=0` (off). APPENDED
  at 136-138, after K7 stage 3's `phw` (135): `revealDistance` (`rvd`,
  2.5, clamped to [1, 12]), `revealFade` (`rvf`, 1, [0.35, 4]; used as
  min(rvf, rvd)) and `revealLook` (`rvl`: fade | halo | glow | dots |
  fray | beacon; default beacon). None is DAILY-EXEMPT or a MAZE key, as
  the fog's flag was not: turning the fog or the reveal on leaves a
  daily (`test/ui/daily_link.test.ts`). All four are LIVE_EFFECTS under
  onTrailChange. Panel: gameplay-panel.md; the mode: render-explore.md's
  "In the game".

- BURNT PARAM (K290 stage 3a, 2026-10-15; brief `docs/design/K114_burn.md`):
  `burnt` (`fbt`: gone | char; default gone) is APPENDED at 139, after
  `revealLook` (138); CODEC_VERSION stays 6, and the table pin
  (`test/ui/param_codec.test.ts`) and url_codec's table gained the key.
  Not daily-exempt (a daily plays with the fire off, so it never shows
  there). A LIVE_EFFECT under onTrailChange (undo_stack); main.ts
  `syncExploration` copies it to the fabric renderer's `burntLook` every
  tick. The look: gameplay-fire.md's BURNT THREAD.

- TURN MINOTAUR KNOBS (K80 turns stage 3a, 2026-10-15; brief
  `docs/design/K80_turns_stage3.md`): six numbers APPENDED at 140-145,
  after `burnt` (139); CODEC_VERSION stays 6. `minoGiveUp` (`mlm`,
  default 3, [0, 10], was LOSE_MARGIN) and `minoRoamMin` (`mrn`, default
  3, [1, 10], was ROAM_MIN; K324 section 4.3 reserved both keys),
  `minoTurnPull` (`mtp`, default 0, [0, 1]), and K294's per-model rows
  `minoGuardSight` (`mgs`, default 4, [0, MINO_SIGHT_MAX]),
  `minoGuardAccuracy` (`mga`, 0.3) and `minoStalkerAccuracy` (`msa`,
  0.3 since K421, 0.45 before), whose defaults read TURN_MODEL_DEFAULTS
  (minotaur_turns.ts);
  `minoSight` / `minoAccuracy` stay the hunter's. url_state.ts clamps
  each in every reader (link, override key, panel); turnMinoParamsOf
  picks the sight and accuracy by model. Not daily-exempt (a daily plays
  with the minotaur off). All six are LIVE_EFFECTS under
  onTurnMinoChange (undo_stack.ts). The table pin
  (`test/ui/param_codec.test.ts`) and url_codec.test.ts's defaults table
  gained the keys. What they do: gameplay-minotaur.md; rows:
  gameplay-panel.md.

- FIRE CLOCK PARAM (K114 stage 2, 2026-10-15; brief
  `docs/design/K114_stage2.md`): `fireClock` (`fck`: turn | realtime,
  default turn) is APPENDED at 146, after the turn minotaur knobs
  (140-145); CODEC_VERSION stays 6. Not daily-exempt (a daily plays with
  the fire off). `fireSettingsOf` carries it as `clock` (still null with
  K80's `clk=realtime` or the turn minotaur); override key `fck`. Under
  onClockChange in undo_stack.ts's LIVE_EFFECTS (a change restarts the
  solve). The table pin (`test/ui/param_codec.test.ts`) and
  url_codec.test.ts's defaults table, OVERRIDE_KEYS and fireSettingsOf
  cases gained the key. What it does: gameplay-fire.md's REAL-TIME FIRE;
  the row: gameplay-panel.md.

- REAL-TIME FIRE PAIR (K440, 2026-10-15; brief `docs/design/K440.md`;
  Levi: "K440: yes and yes"): the real-time clock plays its own speed and
  delay. `fireSpeedRt` (`fsr`, default 0.2) and `fireDelayRt` (`fdr`,
  default 20, about 1.7 s at FIRE_V_REF) are APPENDED at 147-148, after
  `fireClock` (146); CODEC_VERSION stays 6. The defaults are K114 stage
  2's proposal (`docs/design/K114_stage2.md`, "Stage 2 handoff" item 7:
  the best route affords 1.1-1.5 s a decision). Both pairs clamp to
  [FIRE_SPEED_MIN 0.1, 0.95] and [0, 40] in every reader (link, override
  key, panel, fireSettingsOf); an unreadable `fsr` / `fdr` reads the
  pair's own default, and a non-finite speed at a clamp reads its own
  pair's default too (`clampFireSpeed`'s fallback). Neither is
  daily-exempt or a MAZE key (a daily plays with the fire off). Under
  onClockChange in undo_stack.ts's LIVE_EFFECTS (a change restarts the
  solve), with `fireClock`. `fireSettingsOf` picks the pair by
  `fireClock`; the other pair is kept, not played. WHY TWO PARAMS, not
  one pair whose default follows the clock: a link lists only what
  differs from today's defaults (K132), so `&fi=fuse&fck=realtime` plays
  0.2 / 20 and every turn link keeps the turn pair's 0.6 / 0 (0.75 / 0
  until K280), and switching the clock never rewrites a value. Pins that moved: the table pin
  (`test/ui/param_codec.test.ts`), url_codec.test.ts's defaults table,
  OVERRIDE_KEYS (`fsr`, `fdr`) and the `fsp` floor cases (0 and 0.05 read
  0.1); its new test "plays each fire clock's own speed and delay". The
  rows: gameplay-panel.md's FIRE CLOCK ROW.

- REVEAL FINISH PARAM (K465, 2026-10-15; brief docs/design/K465.md; Levi:
  "With the thread reveal mode, we should show where the destination marker
  is, by default."): `revealFinish` (`rvx`, a flag, default ON) APPENDED
  at index 149 after `fireDelayRt` (148); CODEC_VERSION stays 6. A link
  lists only what differs from today's default (K132), so `&rvx=0` is the
  one that carries it. On, the exit's marker, its gap slot and its
  off-screen indicator show from the start under `xp=threads`, over thread
  not yet seen; off keeps K76's decision 6 (hidden until the exit has been
  seen). The rule is one pure pair in `src/game/explore_finish.ts`
  (`finishHold`, `markerGapHeld`; render-explore.md's MARKERS). Neither
  daily-exempt nor a MAZE key. Under onTrailChange in undo_stack.ts's
  LIVE_EFFECTS; main.ts's `syncExploration` copies it onto the fabric
  renderer. Panel: the maze folder's "show finish" checkbox after "reveal
  end", only under threads (gameplay-panel.md's EXPLORATION ROWS). Pins
  that moved: the table pin (`test/ui/param_codec.test.ts`),
  url_codec.test.ts's defaults table, OVERRIDE_KEYS (`rvx`) and its new
  test "reads the reveal's show-finish flag from rvx", undo_stack.test.ts's
  live-effects case; new: test/game/explore_finish.test.ts. The golden
  snapshot and the golden dailies did not move. A branch that also appends
  codec params (K466) renumbers when it rebases.

- REVEAL END PARAMS (K466, 2026-10-15; brief docs/design/K466.md; Levi:
  "we should do something to emphasize the unexplored thread ends a bit
  more, maybe especially for ends that lie under a crossing"): two
  choices APPENDED after K465's `revealFinish` (149); CODEC_VERSION
  stays 6. `revealEndCross` (`rve`, index 150: under | past | back,
  default under) says where a stub's end goes when its fade would lie
  under an over thread's casing; `revealEndGlow` (`rvg`, index 151: soft
  | bright, default bright) sizes the frontier halo. url_state reads both
  with readChoice (`REVEAL_END_CROSSES`, `REVEAL_END_GLOWS`); an unknown
  option reads the default. Neither daily-exempt nor a MAZE key (a daily
  plays with the reveal off). Under onTrailChange in undo_stack.ts's
  LIVE_EFFECTS; main.ts `syncExploration` copies both onto the fabric
  renderer (`explore.endCross`, `explore.endGlow`). K76's own look is
  `&rvg=soft` (rve's default is K76's behavior). What they do:
  render-explore.md's THE ENDS; rows: gameplay-panel.md's EXPLORATION
  ROWS. Pins that moved: the table pin (`test/ui/param_codec.test.ts`),
  url_codec.test.ts's defaults table, OVERRIDE_KEYS (`rve`, `rvg`) and
  its new test "reads the reveal's end params from rve and rvg"; new:
  explore_view.test.ts's K466 block. The golden snapshot and the golden
  dailies did not move. A branch that also appends codec params
  renumbers when it rebases.

- *K74 stage 3 (2026-10-16):* codec rows 152-155 appended - `exitCorridor`
  (number), `exitFlank` (stub | away | near), `exitTaperRadius`,
  `exitTaperStrength`; override keys `xcr`, `xfl`, `xtr`, `xtk`. Defaults
  corridor 24 / away / 0 / 0, so links without them build the trap-zone
  finish. CODEC_VERSION stays 6 (append only).

- FRAGILE AND PAR PARAMS (K137 stage 1, 2026-10-20; brief
  `docs/design/K137_s1.md`): `fragile` (`fg`: off | crack | snap, default
  off), `parMode` (`pa`: off | strict | strokes, default off) and
  `parSlack` (`par`, a number, default 1 since step 5 (0.25 before),
  clamped to [0, 1]: PAR_SLACK_MIN / MAX in game/par.ts; the codec's
  clamp table and the panel row read the same range) are APPENDED at
  182-184, after K525's `minoTelegraphLook` (181). They were 171-173 on
  their branch, 178-180 after the rebase onto b1ec927 (K324 stage 1) and
  182-184 after the one onto da03e7d (K336's 178-180, K525's 181); each
  renumber re-froze the table pin. K324 stage 3, rebased after it, took
  185-189 (REAL-TIME MODEL PARAMS below).
  CODEC_VERSION does not move (append only). The option lists
  follow FRAGILE_MODES and PAR_MODES. Neither daily-exempt nor MAZE
  keys: a daily plays with both off, and turning one on leaves the
  daily. All three are under
  onClockChange in undo_stack.ts's LIVE_EFFECTS (a change restarts the
  solve: FabricMazeController.setRules, then reset());
  `fabricRulesOf` (url_state.ts) carries them into the controller. Pins
  that moved: the table pin (`test/ui/param_codec.test.ts`),
  url_codec.test.ts's defaults table and OVERRIDE_KEYS (`fg`, `pa`,
  `par`). Probe links: `?<seed>&am=instant&fg=snap&pa=strict&par=0`. The
  rules: gameplay-mechanisms.md; the rows: gameplay-panel.md.

- FOUR DEFAULTS RETUNED (K194, K225, K280, K421, 2026-10-20; brief
  `docs/design/K194_defaults.md`; Levi's report-card calls): `pluckGlow`
  (`pgl`) off -> fallback, `markerSize` (`mks`) 1.08 -> 2 (the slider keeps
  its top, 3), `fireSpeed` (`fsp`) 0.75 -> 0.6 (`fireDelay` stays 0; the
  real-time pair `fsr` / `fdr` is unchanged; `clampFireSpeed` reads the
  default dynamically, so its fallback follows) and `minoStalkerAccuracy`
  (`msa`) 0.45 -> 0.3 (TURN_MODEL_DEFAULTS.stalker.accuracy, read only by
  PARAM_DEFAULTS and `turnMinoDefaults`). Pre-launch, so changed in place:
  no codec bump, and an older link that did not list one of the four now
  reads the new value (K132). Pins that moved: url_codec.test.ts (the
  defaults table and the `mks`, `fsp`, K440-pair and `pgl` cases),
  marker_glyphs.test.ts (the size range and the radius and dot cases) and
  minotaur_turns.test.ts (the six stalker rows of TURN_GAMES and four of
  LENGTH_GAMES; hunter and guard rows held). Held: the codec table pin
  (order did not change), the pinned tokens and the golden dailies.

- JUNCTION STOP PARAMS (K324 stage 1, 2026-10-20; brief
  `docs/design/K324_s1.md`, design 4.2): seven numbers APPENDED at
  171-177, after K337's `foilShare` (170); CODEC_VERSION stays 8.
  `minoStopMin` (`mhn`, 0.2, [0, 2]), `minoStopMax` (`mhx`, 0.6, [0, 2]),
  `minoHuntStop` (`mhh`, 0.5, [0, 1]), `minoTurnBack` (`mrv`, 1.5,
  [0, 10]; was REVERSE_MARGIN), `minoTipReach` (`mdr`, 2, [0.5, 4]),
  `minoRoamNear` (`mnr`, 0.25, [0, 1]) and `minoTelegraphRuns` (`mtn`, 1,
  [0, 3], an integer; inert until stage 2 draws plan()). The six chase
  knobs' defaults read DEFAULT_CHASE_PARAMS, and chaseParamsOf carries
  them into ChaseParams; a link may store a max below the min (the params
  keep it), and chaseParamsOf plays the max at least the min. url_state.ts
  clamps each in every reader (link, override key, panel). Neither
  daily-exempt nor MAZE keys (a daily plays without the minotaur). All
  seven are LIVE_EFFECTS under onChaseChange (undo_stack.ts). The same
  stage moved `minoHuntPace` (`mhp`) 0.7 -> 0.9 in place
  (HUNT_PACE_FRACTION; gameplay-minotaur.md's JUNCTION STOPS AND THE
  PLAN). Pins that moved: the table pin (`test/ui/param_codec.test.ts`),
  url_codec.test.ts's defaults table, OVERRIDE_KEYS, the override-keys
  case and the paces case, plus its new test "orders the junction stop
  pair and clamps K324's knobs". The golden dailies did not move. The
  confetti lane (K186 + K336) and K525 append too: whoever merges second
  renumbers (the brief's "param hotspot").

- CONFETTI CANNON PARAMS (K336, 2026-10-20; brief
  `docs/design/K336_cannons.md`): `confettiCannons` (`cfc`, default on),
  `cannonAmount` (`cfn`, [0, 3], default 1) and `streamerShare` (`cfs`,
  [0, 1], default 0.2) are APPENDED at 178-180, after K324 stage 1's
  171-177; CODEC_VERSION stays 8. They were 171-173 on their branch until
  it rebased onto K324 stage 1, which renumbered them and re-froze the
  table pin (`test/ui/param_codec.test.ts`). All three are
  DAILY_EXEMPT_KEYS (viewer preferences, like `cf` and `cfa`), so the
  golden dailies do not move. url_state.ts clamps the two numbers in
  every reader; override keys `cfc` / `cfn` / `cfs`. Pins that moved: the
  table pin, url_codec.test.ts's defaults table and OVERRIDE_KEYS (plus
  its cases for the three keys) and daily_link.test.ts's exempt set. The
  render side is render-confetti.md's K336 section. K324 stage 3 appends
  more minotaur params: whoever merges second renumbers.

- TELEGRAPH LOOK PARAM (K525, 2026-10-20; brief
  `docs/design/K525_telegraph.md`): `minoTelegraphLook` (`mtl`: rims |
  line | both, default rims) is APPENDED at 181, after K324's 171-177
  and K336's 178-180; CODEC_VERSION stays 8. It was 158 on its branch,
  178 after the rebase onto b1ec927 (K324 stage 1) and 181 after the one
  onto 62a70c1 (K336); each renumber re-froze the table pin.
  url_state reads it with readChoice (`TELEGRAPH_LOOKS`); an unknown
  option reads the default. Neither daily-exempt nor a MAZE key (a daily
  plays without the minotaur). A LIVE_EFFECT under onTurnMinoChange
  (undo_stack.ts); scene.ts and panel_wiring.ts copy it to
  `fabric.telegraphLook`. Override key `mtl`; `&mtl=line` draws stage
  3b's strokes with their desktop alphas unchanged in code (a coarse
  pointer's line roams at 0.7 now). On desktop it matched master pixel
  for pixel: a same-state A/B with the hunter (hm_probe ab, 1400x900,
  phy=0, clocks pinned) read 0 px in 24 of 24 shots, and the minotaur
  did draw (3735 px against the same probe without it;
  `.claude/probes/K525/s6/hm_line.log`). The tele_states sheets are
  separate runs, not same-state.
  Pins that moved: the table pin
  (`test/ui/param_codec.test.ts`), url_codec.test.ts's defaults table and
  OVERRIDE_KEYS. The golden snapshot, the golden dailies and K87 did not
  move. What it does: gameplay-minotaur.md's TELEGRAPH LOOK; the row:
  gameplay-panel.md.

- REAL-TIME MODEL PARAMS (K324 stage 3, 2026-10-20; brief
  `docs/design/K324_s3.md`): five numbers APPENDED at 185-189, after
  K137 stage 1's 182-184; CODEC_VERSION stays 8. `minoGuardRoam` (`mgr`,
  the guard's territory in world units around the exit's junction, 30,
  [5, 150]), `minoGuardDetect` (`mgd`, 20, [0, 100]), `minoGuardLose`
  (`mgl`, 30, [0, 150]; the chase plays it at least `mgd`),
  `minoGuardAccuracyRt` (`mgx`, 0.4, [0, 1]) and `minoStalkerAccuracyRt`
  (`msx`, 0.45, [0, 1]). Their defaults read CHASE_MODEL_DEFAULTS
  (minotaur.ts), as K294's turn rows read TURN_MODEL_DEFAULTS. The
  hunter keeps `minoDetect` / `minoLose`, and the stalker's charge reads
  that same pair. WHY NOT K294's rows (`mgs`, `mga`, `msa`): the turn
  clock's sight counts runs and the real-time one world units, and the
  two stalkers play different accuracies (0.3 and 0.45). A link lists
  only what differs from today's defaults (K132), so separate params mean
  switching the clock never rewrites a value (K440's fire pair, same
  reasoning). PARAM_RANGES clamps each in both link readers and the
  panel's sliders share the ranges; chaseParamsOf reads negative or
  non-finite values as 0 and the accuracies through clamp01, and carries
  `minotaur` (now both clocks' model) and the five into ChaseParams.
  Neither daily-exempt nor MAZE keys (a daily plays without the
  minotaur). All five are LIVE_EFFECTS under onChaseChange
  (undo_stack.ts). They were 178-182 on their branch, 182-186 after the
  rebase onto K336 (178-180) and K525 (181), and 185-189 after the one
  onto 07c0189 (K137); each renumber re-froze the table pin. Pins that
  moved: the table pin (`test/ui/param_codec.test.ts`), url_codec.test.ts's
  defaults table and OVERRIDE_KEYS, plus its new test "reads the
  real-time guard and stalker". The golden dailies, K87 and K80_DIGESTS
  did not move. What they do: gameplay-minotaur.md's REAL-TIME GUARD AND
  STALKER; the rows: gameplay-panel.md's REAL-TIME MODEL ROWS.

- COLLAPSE PARAM (K139, 2026-10-20; brief `docs/design/K139.md`):
  `collapse` (`cl`: off | finish | free, default off; the option list
  follows COLLAPSE_MODES in game/collapse.ts) is APPENDED at 190, after
  K324 stage 3's 185-189; CODEC_VERSION stays 8. Neither daily-exempt nor
  a MAZE key: a daily plays with it off, and turning it on leaves the
  daily. Under onClockChange in undo_stack.ts's LIVE_EFFECTS (a change
  restarts the solve: setRules, then reset()); `fabricRulesOf`
  (url_state.ts) carries it into the controller, where it overrides
  `fragile`, `parMode` and `parSlack` (their rows stay visible). Pins
  that moved: the table pin (`test/ui/param_codec.test.ts`),
  url_codec.test.ts's defaults table and OVERRIDE_KEYS (`cl`). The golden
  snapshot, the golden dailies and K87 did not move. Probe links:
  `?<seed>&am=instant&cl=finish` (or `cl=free`). The rules:
  gameplay-mechanisms.md's COLLAPSE; the row: the Game folder, after
  "Par slack (x fewest)", fabric only, in every game mode.

- CUT PARAM (K114, 2026-10-20; brief `docs/design/K114_cut.md`): `cut`
  (`ct`: off | on, default off; the option list follows CUT_MODES in
  game/cut.ts) is APPENDED at 191, after K139's collapse; CODEC_VERSION
  stays 8. Neither daily-exempt nor a MAZE key: a daily plays with it off,
  and turning it on leaves the daily. Under onClockChange in
  undo_stack.ts's LIVE_EFFECTS (a change restarts the solve);
  `fabricRulesOf` (url_state.ts) passes it for the classic game only, and
  setRules drops it while fragile, par or collapse is on. Pins that moved:
  the table pin (`test/ui/param_codec.test.ts`), url_codec.test.ts's
  defaults table and OVERRIDE_KEYS (`ct`). The golden snapshot, the golden
  dailies and K87 did not move. Probe links: `?<seed>&am=instant&ct=on`.
  The rules: gameplay-mechanisms.md's The cut; the row: gameplay-panel.md's
  CUT ROW. K114's walker stage (2026-10-20) APPENDED the options `lead` and
  `delay` (`ct=lead`, `ct=delay`; gameplay-mechanisms.md's The walker):
  an enum option appended, so CODEC_VERSION stays and only the table pin's
  option list moved.

- LIVES PARAM (K137 stage 3a, 2026-10-20; brief `docs/design/K137_s3a.md`):
  `lives` (`mlv`: a number, 0 off or 1..5 hearts, PARAM_RANGES [0, 5],
  default 0; game/lives.ts `livesOf` rounds and clamps) is APPENDED at
  192, after `cut`; CODEC_VERSION stays 8. Neither daily-exempt nor a
  MAZE key: a daily plays with it off, and turning it on leaves the daily.
  Under onChaseChange in undo_stack.ts's LIVE_EFFECTS (main.ts refills
  the hearts when the setting changes). Pins that moved: the table pin,
  url_codec.test.ts's defaults table and OVERRIDE_KEYS (`mlv`, otherValue
  3, since half of a 0 default is 0). The golden snapshot, the golden
  dailies, K87 and the minotaur digests did not move: off is
  bit-identical. Probe links: `?<seed>&am=instant&mt=hunter&mlv=3`. The
  rules: gameplay-minotaur.md's LIVES; the row: gameplay-panel.md's LIVES
  ROW.

- SWORD PARAMS (K137 stage 3b, 2026-10-21; brief `docs/design/K137_s3b.md`):
  `sword` (`swd`: off | timed | oneuse, SWORD_MODES) and `swordMoves`
  (`swm`: a number, PARAM_RANGES [4, 20], default 8) are APPENDED at
  193-194, after `lives`; CODEC_VERSION stays 8. Neither daily-exempt nor
  a MAZE key. Under onClockChange in undo_stack.ts's LIVE_EFFECTS (a
  change restarts the solve, which lays a new sword or none). Pins that
  moved: the table pin, url_codec.test.ts's defaults table and
  OVERRIDE_KEYS (`swd`, `swm`). The golden snapshot, the golden dailies,
  K87 and the minotaur digests did not move: off is bit-identical. Probe
  links: `?<seed>&am=instant&mt=hunter&swd=oneuse&swm=20` (add
  `&clk=realtime` for real time). The rules: gameplay-minotaur.md's THE
  SWORD; the rows: gameplay-panel.md's SWORD ROWS.

- AIDS PARAMS (K137 stage 2, 2026-10-21; brief `docs/design/K137_s2.md`):
  `spool` (`sp2`, a flag), `spoolSlack` (`sps`, a number, PARAM_RANGES
  [0.1, 1], default 0.3), `hints` (`hn`, PARAM_RANGES [0, 5], default 0)
  and `compass` (`cmp`, a flag) are APPENDED at 195-198, after the sword's;
  CODEC_VERSION stays 8. None daily-exempt, none a MAZE key. LIVE_EFFECTS:
  spool, spoolSlack and hints under onClockChange (a change restarts the
  solve), compass under onAidsChange (writeParams and a render). The chalk
  is a viewer pref (`knotmaze.chalk`), never a link. Pins that moved: the
  table pin, url_codec.test.ts's defaults table and OVERRIDE_KEYS. The
  golden snapshot, the golden dailies and K87 did not move: off is
  bit-identical. Probe links: `?<seed>&am=instant&sp2=1&sps=0.3&hn=3&cmp=1`.
  The rules: gameplay-mechanisms.md's The aids; the rows:
  gameplay-panel.md's AIDS ROWS.

- ICE AND COLOR RULE PARAMS (K138 stage 1, 2026-10-21; brief
  `docs/design/K138_s1.md`): `ice` (`ice`, a number, PARAM_RANGES [0, 0.5]
  = ICE_SHARE_MAX, default 0 = off; the panel keeps a 0.05 grid) and
  `colorRule` (`cru`, off | alternate | cycle, default off) are APPENDED at
  199-200, after the aids'; CODEC_VERSION stays 8. Neither daily-exempt nor
  a MAZE key. LIVE_EFFECTS: both under onClockChange (a change restarts the
  solve). `fabricRulesOf` passes them in the classic game only. Pins that
  moved: the table pin, url_codec.test.ts's defaults table and
  OVERRIDE_KEYS. The golden snapshot, the golden dailies and K87 did not
  move: off is bit-identical. Probe links: `?<seed>&am=instant&ice=0.25`,
  `?<seed>&am=instant&cru=cycle`. The rules: gameplay-mechanisms.md's Ice
  and the color rule; the rows: gameplay-panel.md's ICE AND COLOR RULE
  ROWS.
- SPRINT PARAM (K137 stage 3c, 2026-10-21; brief `docs/design/K137_s3c.md`):
  `sprint` (`spr`: off | on, SPRINT_MODES in game/sprint.ts) is APPENDED
  at 201, after K138 stage 1's ice and color rule; CODEC_VERSION stays 8. Not daily-exempt, not a
  MAZE key. Under onClockChange in undo_stack.ts's LIVE_EFFECTS (a change
  restarts the solve, which gives the sprint back). Pins that moved: the
  table pin, url_codec.test.ts's defaults table and OVERRIDE_KEYS (`spr`).
  The golden snapshot, the golden dailies, K87 and the minotaur digests
  did not move: off is bit-identical. Probe links:
  `?<seed>&am=instant&mt=hunter&spr=on&snd=none` (add `&clk=realtime` for
  real time). The rules: gameplay-minotaur.md's SPRINT; the row:
  gameplay-panel.md's SPRINT ROW.
- TURNSTILES AND HIDDEN RUNS PARAMS (K138 stage 2, 2026-10-21; brief
  `docs/design/K138_s2.md`): `turnstiles` (`tst`, a number, PARAM_RANGES
  [0, 8] = TURNSTILES_MAX, default 0 = off) and `hiddenRuns` (`hid`, [0, 4]
  = HIDDEN_MAX, default 0 = off) are APPENDED at 205-206, after K114's beat
  rider (202-204); CODEC_VERSION stays 8. They were 202-203 on their branch
  until it rebased onto 6e143bbf (the beat rider), which renumbered them and
  re-froze the table pin. Neither daily-exempt nor a MAZE key. LIVE_EFFECTS:
  both under onClockChange (a change restarts the solve and places them
  anew). `fabricRulesOf` passes them in the classic game only. Pins that
  moved: the table pin, url_codec.test.ts's defaults table, OVERRIDE_KEYS
  and its off-default values (4 and 2). The golden snapshot, the golden
  dailies and K87 did not move: off is bit-identical. Probe links:
  `?<seed>&am=instant&tst=4`, `?<seed>&am=instant&hid=4`. The rules:
  gameplay-mechanisms.md's Turnstiles and hidden runs; the rows:
  gameplay-panel.md's TURNSTILES AND HIDDEN RUNS ROWS.
- SLEEPERS PARAMS (K137 stage 3d, 2026-10-21; brief
  `docs/design/K137_s3d.md`): `sleepers` (`slp`, a number, PARAM_RANGES
  [0, 3] = SLEEPERS_MAX, default 0 = off) and `sleepKind` (`slk`: wake |
  follow | both, SLEEP_KINDS in game/monsters.ts, default wake) are
  APPENDED at 207-208, after K138 stage 2's turnstiles and hidden runs
  (205-206); CODEC_VERSION stays 8. They were 202-203 on their branch,
  205-206 after the rebase onto db557c31 (K114's beat rider, 202-204) and
  207-208 after the one onto 40dafa2a (K138 stage 2); each renumber
  re-froze the table pin. Neither daily-exempt nor a MAZE key. Both under
  onClockChange in undo_stack.ts's LIVE_EFFECTS (a change restarts the
  solve, which lays the monsters anew). Pins that moved: the table pin, url_codec.test.ts's defaults
  table and OVERRIDE_KEYS (`slp`, `slk`). The golden snapshot, the golden
  dailies, K87 and the minotaur digests did not move: off is
  bit-identical. Probe links:
  `?<seed>&am=instant&mt=hunter&slp=2&slk=both&snd=none` (turn clock
  only). The rules: gameplay-minotaur.md's SLEEPERS AND THE FOLLOWER; the
  rows: gameplay-panel.md's SLEEPERS ROWS.
- ONE-WAY RUNS PARAM (K138 stage 3, 2026-10-21; brief
  `docs/design/K138_s3.md`): `oneWay` (`ow`, a number, PARAM_RANGES [0,
  0.6] = ONE_WAY_MAX, default 0 = off; the panel keeps a 0.05 grid) is
  APPENDED at 209, after K137 stage 3d's sleepers (207-208); CODEC_VERSION
  stays 8. It was 207 on its branch until the rebase onto a71e7409 (K137
  stage 3d), which renumbered it and re-froze the table pin. Neither
  daily-exempt nor a MAZE key. LIVE_EFFECTS: under onClockChange (a change
  restarts the solve and lays the runs anew). `fabricRulesOf` passes it in
  the classic game only. Pins that moved: the table pin, url_codec.test.ts's
  defaults table, OVERRIDE_KEYS and its off-default value (0.4). The golden
  snapshot, the golden dailies and K87 did not move: off is bit-identical
  (share 0 draws nothing). Probe link: `?<seed>&am=instant&snd=none&ow=0.4`.
  The rules: gameplay-mechanisms.md's One-way runs; the row:
  gameplay-panel.md's ONE-WAY RUNS ROW.
- LURES AND SNARES PARAMS (K137 stage 4, 2026-10-21; brief
  `docs/design/K137_s4.md`): `lures` (`lur`, a number, PARAM_RANGES [0, 5]
  = LURES_MAX, default 0 = off) and `snares` (`snr`, [0, 3] = SNARES_MAX,
  default 0) are APPENDED at 210-211, after K138 stage 3's `oneWay` (209);
  CODEC_VERSION stays 8. They were 209-210 on their branch until the
  rebase onto 04c4d9e1 (K138 stage 3, whose `oneWay` took 209), which
  renumbered them and re-froze the table pin.
  Neither daily-exempt nor a MAZE key (free play only: a daily keeps 0).
  Both under onClockChange in undo_stack.ts's LIVE_EFFECTS (a change
  restarts the solve, which refills both stocks). Pins that moved: the
  table pin, url_codec.test.ts's defaults table and OVERRIDE_KEYS (`lur`,
  `snr`). The golden snapshot, the golden dailies, K87 and the minotaur
  digests did not move: off is bit-identical. Probe link:
  `?7&am=instant&mt=hunter&lur=3&snr=2&snd=none` (turn clock; snares by
  runs only). The rules: gameplay-minotaur.md's LURES AND SNARES; the
  rows: gameplay-panel.md's LURES AND SNARES ROWS.
- KEYS AND LOCK MODE PARAMS (K138 stage 4, 2026-10-21; brief
  `docs/design/K138_s4.md`): `keys` (`ky`, a number, PARAM_RANGES [0, 3] =
  KEYS_MAX, default 0 = off) and `lockMode` (`lkm`: exit, LOCK_MODES in
  game/locks.ts, default exit) are APPENDED at 212-213, after K137 stage
  4's lures and snares (210-211); CODEC_VERSION stays 8. The shortcut and
  colors forms will APPEND options to `lockMode` (no bump; only the table
  pin's option list moves). Neither daily-exempt nor a MAZE key. Both
  under onClockChange in undo_stack.ts's LIVE_EFFECTS (a change restarts
  the solve and places the keys anew). `fabricRulesOf` passes them in the
  classic game only. Pins that moved: the table pin, url_codec.test.ts's
  defaults table, OVERRIDE_KEYS (`ky`, `lkm`) and its off-default value
  for keys (2); with one form, `lockMode` has no other value, so its
  override case reads `?7.EQ&lkm=exit&ky=2` as keys 2. The golden
  snapshot, the golden dailies and K87 did not move: off is bit-identical
  (keys 0 draws nothing). Probe link: `?7&am=instant&snd=none&ky=2`. The
  rules: gameplay-mechanisms.md's Locks and keys; the rows:
  gameplay-panel.md's KEYS ROWS. A branch that also appends codec params
  (K793-K795 were running at the pause) renumbers when it merges second.
