# K324: the real-time minotaur's telegraph, junction stops and controls

Design only (2026-10-14, design agent of claude session d8031183). Base:
master `b72d5dd`; every line number below is from that commit.
Companion: `K323_game_mode.md` (the Game folder, `gameMode`, the panel
labels and the codec bump this design appends after). Lore it builds on:
`.claude/rules/gameplay-minotaur.md` (K80 real time, K174 controls, the
turn-aligned minotaur, catch resets).

## Levi's words (2026-10-14, as relayed)

22:05: "I finally found the setting to turn on the minotaur. I was
expecting something like "gameMode" with dropdown values like
classic/minotaur/..., and then with a additional conditionally-shown
mode-specific controls like a realtime checkbox. Also, with realtime, we
can still telegraph the minotaur's next move. Also, there should be at
least a small pause of the minotaur at each junction, but with some
random variance. We should have a lot of param controls for the minotaur
actually. Probably "Game" or "Gameplay" or "Game mode" should be a
separate group."

22:06: "Do we have other game modes supported right now other than
realtime minotaur and vanilla maze? I thought we had an turn-based
minotaur version too?"

K323 answers the first and last sentences (the Game folder, `gameMode`)
and the 22:06 question. This doc answers the middle three: the telegraph
in real time, a pause at every junction, and many more controls.

## In brief

1. **Real time telegraphs too.** The minotaur's planned route is drawn
   ahead of it in the turn telegraph's red: from where it stands to the
   end of its current run, plus the next run it will take (one more by
   default, `minoTelegraphRuns`), with the turn telegraph's ring where a
   roaming leg will end. Faint while it roams, bright while it hunts.
   `minoTelegraph` ("Show its next move", default on) governs both
   clocks. A read-only `MinotaurChase.plan()` computes it with the same
   choice functions the chase uses, so it never lies; it is render-only,
   so replays and `K80_DIGESTS` do not move because of it.
2. **A short stop at every junction, roaming and hunting.** Proposed
   defaults: 0.2-0.6 s (uniform) while it roams, half that while it
   hunts. The lengths come from their own counter-based random stream
   (seed + arrival count), so a replay reproduces them and a stop range
   of 0 replays today's chase bit for bit. Today's chance-based long
   stop stays (relabeled "long stop") and replaces the short stop where
   it fires. A roaming leg picks its next destination on arrival, so the
   telegraph has something to show during a rest too.
3. **Many more controls.** Every real-time behavior constant that is a
   tuning choice becomes a param in K323's collapsed "Minotaur tuning"
   subfolder: three junction-stop rows, the turn-back margin, the roam
   pull as a strength slider (K245; replaces the `minoToward` checkbox
   in K323 stage 1's codec bump), the roam range's two shape factors and
   the telegraph's reach. The turn clock's two hard-coded rules
   (`LOSE_MARGIN`, `ROAM_MIN`) become knobs with K80 turns stage 3
   (K294). Kept as rules: the tick rate, the sanctuary, the lair exit.
4. **Stages** (one agent each): 1 the sim (stops, `plan()`, params,
   tests, a sim re-tune; after K323 stage 1); 2 the real-time telegraph
   in the renderer (after stage 1, and after K7 stage 2, K307 stage 2
   and K329 leave `main.ts`); 3 the guard and the stalker in real time
   (K323's question 6), after stage 1.

## 1. Today

### 1.1 The turn telegraph (minotaur_turns.ts, fabric_maze_renderer.ts)

- WHAT. After each turn, `TurnMinotaur` commits its next turn from where
  you stand. `telegraph()` (minotaur_turns.ts:516) returns
  `TurnTelegraph` (362): `from` (the vertex it leaves), `steps` (the
  runs it will take, `[edge, nextVertex]`; one, or two under charge or
  two; empty = it stays) and `dest` (where it ends the turn). It returns
  null without the telegraph or mid-animation (`progress < 1`), so the
  line shows only between moves.
- HOW IT IS DRAWN. `syncMinotaur(chase, fog, telegraph)` (renderer 929)
  places the marker through `spotCtrl(walk, g, spot)`, hides the whole
  minotaur layer while the intro reveal has not drawn its thread
  (`revealQuery < 0.98`, K271), and calls `drawTelegraph` (988-1040):
  every frame it clears `teleGfx`, walks from `from` along each whole
  run, sampling every TELEGRAPH_STEP 0.5 ctrl through `pointFlowed` (so
  the line rides the threads' flow), strokes it once (TELEGRAPH_COLOR
  0xff2418, width 0.55 thread widths, alpha 0.95, round caps and joins)
  and rings `dest` (radius 1.45 marker radii, width 0.32, a 48-gon). It
  is on `minoLayer`, so `minoFog` covers it.
- WHO PASSES IT. main.ts:2678 (`liveMino()`) and 2886 (`turnMino`) pass
  `turnMino.telegraph()`; real time's call at 2777 passes none:
  `fabric.syncMinotaur(chase, params.minoFog)`.
- THE PARAM. `minoTelegraph` (`mtg`, v5 index 110, default on), read on
  the turn clock only; `telegraphOn` (minotaur_turns.ts:114) forces it on
  at the charge and two speeds.

### 1.2 Real time's stops today (minotaur.ts)

- A stop is mode `pause` with a tick `timer`. `moveMinotaur` (574):
  while the mode is `lair` or `pause` it counts the timer down one tick
  at a time and does not move; at 0 it becomes `wander` and picks a
  destination if it has none or stands on it (`pickDest`, 645).
- ROAMING, at every vertex it reaches (608), `roamArrival` (615) draws
  u1 and u2 from the chase's sequential RNG (always both: K80's replay
  contract). At its destination it rests `pauseMin + (pauseMax -
  pauseMin) u2` (0.5-2 s) and picks the next destination when the rest
  ends. At a junction it passes (not a dead-end tip) it stops for the
  same random length with chance `pauseChance` (0.3). A stop discards
  the rest of that tick's movement (`return`).
- HUNTING, it never stops. It reaches a junction and leaves in the same
  tick; `huntEdge` (737) picks the first run of the shortest route to
  your exact spot when it leaves a vertex, and mid-run `maybeReverse`
  (769) turns it back when the route behind is shorter by REVERSE_MARGIN
  1.5.
- SPOTTING YOU CUTS A STOP SHORT: `detect` (787) sets the mode to `hunt`
  and `timer = 0` (799).
- THE LAIR: after a spawn or a catch it waits `wake` (2 s) there (517,
  526), then leaves by the exit tail.

So today it stops at about 30% of the junctions it passes while roaming,
for 0.5-2 s, rests at every destination, and never stops while hunting.
Levi's "at least a small pause at each junction, with some random
variance" is new for the other 70% of roaming junctions and for all of
hunting. The lore's note that "a player who hides on the entrance tail
is often caught on walking back out: the minotaur pauses at that tail's
junction" is today's long stop at work.

## 2. The real-time telegraph

### 2.1 What it shows

Real time has no "next move" to commit, so the telegraph shows the
minotaur's route a fixed reach ahead of it, computed every frame from
the chase's own state:

| Its state | Drawn | Look |
|---|---|---|
| Roaming, moving | its spot to the end of its current run, then `minoTelegraphRuns` (1) more runs of its route to the destination; a ring at the destination when the drawn route reaches it | faint (alpha about 0.45) |
| Roaming, junction stop | the next `minoTelegraphRuns` runs of its route from that junction | faint |
| Roaming, resting at a destination | the first runs of the next leg (picked on arrival, 2.3) | faint |
| Hunting, moving | its spot to the end of its current run (in the direction `maybeReverse` will keep), then the run `huntEdge` would take from there toward your spot now | bright (0.95, today's) |
| Hunting, junction stop | the run `huntEdge` would take now | bright |
| In its lair | nothing; during the last 0.5 s of its wait, the exit tail's run (it always leaves by it) | faint |

Further runs (reach 2 or 3) draw at half the first run's alpha, the
"second run dimmer" of `docs/design/K80_gameplay_additions.md` 2.7.

WHY THIS IS HONEST. A roaming route is deterministic once the
destination is picked (`roamEdge`, 709, draws nothing), so the drawn
route is the route it walks unless it spots you or takes a long stop on
the way (a stop delays the route, it does not change it). A hunting
route depends on where you are, so it is live: walk elsewhere and the
next run can change, which is exactly what the minotaur would do.
Recommended: live, with hysteresis only if a probe shows flicker at a
tie (keep the previous next run unless the new one is shorter by the
turn-back margin, the rule `maybeReverse` already uses).

READABILITY AT SPEED. It roams at 5 u/s (0.5 of your 10, +/-20%) and
hunts at 7. The line is a tongue in front of the marker that shortens
as it walks its run, and at each junction the new next run appears.
The junction stop (section 3) is the read moment: the line is still for
0.1-0.6 s with the next run drawn, before it moves. On a phone the
stroke is the turn telegraph's 0.55 thread widths; any later change of
look (K80 2.7's flowing chevrons, bolder strokes on phones) applies to
both clocks.

### 2.2 The model: `MinotaurChase.plan(reach)`

A read-only method; no state changes and no RNG draws:

```ts
interface ChasePlan {
  lead: { edge: number; pos: number; dir: 1 | -1 } | null; // its current run, from its spot
  steps: TurnStep[]; // whole runs after the lead ([edge, nextVertex], as TurnTelegraph)
  dest: number;      // the roaming destination when the route reaches it, else -1
  hunting: boolean;  // the look: bright when true
}
```

- It needs vertex-argument forms of the choice functions:
  `roamEdgeFrom(v)` and `huntEdgeFrom(v)` (today `roamEdge` and
  `huntEdge` read `this.mino.vertex`), plus the reverse test of
  `maybeReverse` as a pure predicate. The chase then calls the same
  functions, so the telegraph and the walk cannot disagree, and
  `K80_DIGESTS` guard the refactor.
- The renderer generalizes `drawTelegraph` to a route with an optional
  lead partial run: from `spotCtrl` of the minotaur's spot to the lead
  run's end, then whole runs as today, then the ring when `dest >= 0`.
  The turn telegraph is the same route with no lead. Alpha per segment:
  the first run (with the lead) at the look's alpha, the rest at half.
- main.ts:2777 passes `params.minoTelegraph ? chase.plan(reach) : null`.
- Cost: `huntEdgeFrom` is a shortest-route query, at most `reach + 1`
  of them a frame; `chase.advance` costs 0.008 ms a frame today
  (K174), so the plan should stay under 0.05 ms. Stage 2 measures it
  with `.claude/probes/K174/k174_page.mjs perfq`.
- Under fog it rides `minoLayer`, so `minoFog` covers it as it covers
  the turn telegraph; under K76's thread reveal it follows whatever K76
  2c settles for the turn telegraph (K271).

### 2.3 Picking the next destination on arrival

Today a roaming leg's next destination is picked when the rest at the
old one ENDS (583-584), so during a 0.5-2 s rest there is nothing to
telegraph. Recommended: pick it on ARRIVAL, right after `roamArrival`'s
two draws. The sequential RNG's draw order does not change (2 draws,
then pickDest's 3; nothing else draws in between), so the only
behavioral change is that the roam pull reads your position up to 2 s
earlier. It changes chases at the default pull 0.5 (not at pull 0), so
it lands in the same commit that re-freezes the digests at the new stop
defaults (3.3).

## 3. Junction stops

### 3.1 The rule

- WHERE. Every arrival at a junction (`!g.isEnd[v]`, so never at a
  dead-end tip), roaming and hunting. The lair's vertex and the
  sanctuary rules are unchanged.
- HOW LONG. Roaming: uniform in [`minoStopMin`, `minoStopMax`] seconds,
  proposed 0.2-0.6 s (0.2 s is about the shortest stop that reads as a
  stop at 60 fps; 0.6 s keeps a leg moving). Hunting: the same draw
  times `minoHuntStop` (proposed 0.5, so 0.1-0.3 s). A stop of 0
  everywhere is today's minotaur.
- THE LONG STOP STAYS. `roamArrival` runs first, unchanged. When it
  starts a long stop (a destination rest, or the `pauseChance` stop),
  that stop replaces the junction stop; otherwise the junction stop
  applies.
- SPOTTING YOU does not cut a junction stop short (it still cuts a long
  stop, as today). The rest of the stop, at most 0.6 s, reads as "it
  noticed you". A question for Levi (section 7, question 4).
- CATCHING. A stopped minotaur still catches you: contact is checked in
  `step` whatever it is doing, so walking past a stopped minotaur is
  still a catch.

### 3.2 Determinism

The chase is replayed tick for tick from the taps (`replayChase`, 822)
and pinned by `K80_DIGESTS` (test/game/minotaur.test.ts:438). Two rules
keep that:

- A SEPARATE STREAM. The stop lengths must not draw from the sequential
  `rng`: one extra draw shifts every later draw, so every chase would
  change even at a stop range of 0. Draw from a counter-based stream
  instead, `u = hash(seedMix, arrivals)`, where `arrivals` counts the
  junction arrivals since the chase began (chase state, reset with it).
  minotaur_turns.ts already has the pieces (`mix32`, 136, and the
  counter-based `TurnRng`, 143): share them, do not copy them.
- NO TICK FOR A ZERO STOP. A stop is a separate `hold` tick counter,
  checked in `moveMinotaur` after the lair/pause branch: `if (hold > 0)
  { hold--; return; }`. Setting it is `const t = ticksOf(s); if (t > 0)
  { hold = t; return; }`, so a stop that rounds to 0 ticks keeps the
  rest of the tick's movement. The mode stays `wander` or `hunt` during
  a hold, so the glow, `detect`, `huntTicks` and the hunt's live choice
  all keep working. A respawn, a catch and `place()` clear it.
  `__knotChase()` reports `hold` (probes).

### 3.3 Order of commits in stage 1, and the digests

1. The hold machinery, the stream and the new params with the stop
   range at 0 and pick-on-arrival off: `K80_DIGESTS` must pass
   unchanged (the refactor guard, and today's K80/K174 measurements stay
   comparable).
2. Pick-on-arrival and the new defaults: re-freeze `K80_DIGESTS`, and
   keep the old digests as a pinned "stops 0, pick on rest end" case
   only if pick-on-arrival is made a switch; otherwise say in the commit
   that the old pin moved (pre-launch, CLAUDE.md's first Key Design
   Decision).

### 3.4 What stops cost the minotaur, and the re-tune

A hunting stop of 0.2 s on average, on a run of 5 units (an assumed
typical length; stage 1 measures the real distribution), takes a 7 u/s
hunter from 0.71 s to 0.91 s a run: about 22% slower, so a fleeing
player escapes more and a still player is reached later. Recommended:
keep today's catch rates (section 7, question 3) by re-tuning on the
K80 sim harness on H1 mazes (`.claude/probes/K80/turns2/rt/`): stop
ranges 0 vs the proposal, hunt pace 0.7 to 0.9 of yours, against
today's greedy player (1.66 catches a game at pull 0.5), the fleers'
escapes (54-58%, 75-77% with queued taps) and the still-player test
(minotaur.test.ts: ratio 0.67, bound 0.8). The chosen defaults and the
table go into `gameplay-minotaur.md`.

The turn clock does not change: every turn already ends at a junction,
its stop is a whole turn (`minoPause`, 0.1) and its telegraph already
shows the move.

## 4. The controls

"Tuning" is K323's collapsed "Minotaur tuning" subfolder of the Game
folder. Real-time rows show only with Real time on, turn rows only with
it off (K323 3.1). Ranges are today's panel ranges for the existing
params. Keys marked new were checked unused in `src` and `test` at
`b72d5dd`.

### 4.1 Real time: existing params (labels from K323)

| Param (key) | Default | Range | Label |
|---|---|---|---|
| playerPace (plp) | 10 | [2, 30] | Game > Minotaur: "Your speed (units/s)" |
| minoWanderPace (mwp) | 0.5 | [0, 2] | "Wander speed (x yours)" |
| minoHuntPace (mhp) | 0.9 (stage 1's re-tune, 3.4; was 0.7) | [0, 2] | "Hunt speed (x yours)" |
| minoPaceJitter (mpj) | 0.2 | [0, 0.5] | "Speed variation" |
| minoPauseChance (mpc) | 0.3 | [0, 1] | "Chance of a long stop" |
| minoPauseMin (mpn) | 0.5 | [0, 10] | "Long stop, shortest (s)" |
| minoPauseMax (mpx) | 2 | [0, 10] | "Long stop, longest (s)" |
| minoDetect (mdt) | 15 | [0, 100] | "Spots you within" |
| minoLose (mls) | 25 | [0, 150] | "Loses you beyond" |
| minoCatch (mct) | 1 | [0.2, 5] | "Catch distance" |
| minoDeadEnds (mde) | 0.4 | [0, 1] | "Visits dead ends" |
| minoRoam (mrm) | 30 | [5, 150] | "Roam range" |
| minoWake (mwk) | 2 | [0, 20] | "Lair wait (s)" |

### 4.2 Real time: new params

| Param (key) | Default | Range | Label | Today |
|---|---|---|---|---|
| minoStopMin (mhn, new) | 0.2 | [0, 2] | "Junction stop, shortest (s)" | 0 (none) |
| minoStopMax (mhx, new) | 0.6 | [0, 2] | "Junction stop, longest (s)" | 0 |
| minoHuntStop (mhh, new) | 0.5 | [0, 1] | "Junction stop while hunting (x)" | 0 |
| minoTurnBack (mrv, new) | 1.5 | [0, 10] | "Turn-back margin" | REVERSE_MARGIN 1.5 |
| minoPull (mpl, new; replaces minoToward `mtw`) | 0.5 | [0, 1] | "Roams toward you" | roamPull 0.5 (on) / 0 (off) |
| minoTipReach (mdr, new) | 2 | [0.5, 4] | "Dead-end reach (x roam range)" | tips within 2x roamRange |
| minoRoamNear (mnr, new) | 0.25 | [0, 1] | "Nearest roam (x roam range)" | junctions from roamRange/4 |
| minoTelegraphRuns (mtn, new) | 1 | [0, 3] step 1 | "Telegraph reach (runs)" | (no telegraph) |

- The stop max clamps to at least the min in the reader (as the long
  stop's pair should; today `pauseMin > pauseMax` just inverts the draw).
- `minoPull` is a type change of `mtw` (boolean to number), so it needs
  a codec bump: K323 stage 1 bumps anyway (v5 to v6), so it should carry
  this change and K324 adds nothing to that bump. If K323 stage 1 lands
  without it, K324 stage 1 appends `mpl` and the next bump drops `mtw`.
- Defaults reproduce today's behavior except the three stop rows and
  `minoTelegraphRuns` (render only). Not daily-exempt; none changes the
  maze, so the golden dailies do not move.
- `minoTelegraph` ("Show its next move", `mtg`) is shared by both clocks
  (K323's table).

### 4.3 Turn clock: two rules become knobs (with K294)

| Param (key) | Default | Range | Label | Today |
|---|---|---|---|---|
| minoGiveUp (mlm, new) | 3 | [0, 10] step 1 | "Gives up after (runs past sight)" | LOSE_MARGIN 3 (minotaur_turns.ts:91, "a rule, not a knob") |
| minoRoamMin (mrn, new) | 3 | [1, 10] step 1 | "Nearest roam (runs)" | ROAM_MIN 3 (93), used as min(3, roam) |

Recommended: they ride with K80 turns stage 3's per-model tuning (K294),
which edits the same `TurnConfig` and may make them per model, rather
than with K324 stage 1, so two agents do not edit minotaur_turns.ts.

### 4.4 Kept as rules, not knobs

- CHASE_HZ 120 and MAX_STEPS_PER_ADVANCE 30: the tick is the unit of
  determinism and replay; changing it changes what a link means.
- The sanctuary: the tails are barred to it and hide you; the start and
  the exit hide you. They are the maze's rules, not the minotaur's.
- Leaving the lair by the exit tail; searching where it last saw you
  after losing you (`lastSeen`, 806), at its wander pace. "Search speed
  (x yours)" is a candidate knob if play asks for it (an idea, not
  proposed).
- The telegraph's look constants (color, width, ring): render tuning in
  code, shared with the turn telegraph.

## 5. Relations

- K80 TURNS STAGE 3 (K293, K294, K270) is turn-clock work: per-model
  tuning (K294) takes 4.3's two knobs; K293's residuals (stats under
  minoRestart and the share grid) and K270 (a lavender band at a turn
  catch) do not touch real time. Stage 2 should still look for K270's
  band at a real-time catch, since the telegraph clears there.
- K245 (how hard it roams toward you): `minoPull` is the strength
  slider; 0.5 stays the default.
- K247 (readable labels): K323 stage 1 relabels the existing rows; the
  rows here come labeled.
- K296 (roam 0 as a "sentry", turn clock): a real-time sentry would be
  roam range 0 = it stays at its lair's junction; not proposed here.
- K271 (the telegraph under K76's thread reveal): applies to the
  real-time telegraph too; stage 2 follows K76 2c's answer.
- K323 question 6 (the models in real time): stage 3 here.
- K263 (`undoAllowed` unused): unaffected.
- Real time has no "close calls" stat (K80 turns stage 2's stats are
  turn-clock): an idea for after stage 2 (a hunt that came within
  2x the catch distance and lost you).

## 6. Stages

One agent each, from this doc. All wait for K323 stage 1 (the Game
folder, the tuning subfolder, the codec bump, `minoPull`).

- STAGE 1, the sim (Opus: behavior and tuning). minotaur.ts (hold
  counter, counter stream, `roamEdgeFrom` / `huntEdgeFrom` / the reverse
  predicate, pick on arrival, `plan()`, the new ChaseParams),
  url_state.ts (params, defaults, clamps, `chaseParamsOf`),
  param_codec.ts (append after K323 stage 1 and K76 2c), the tuning
  rows in tweakpane_panel.ts, undo_stack.ts LIVE_EFFECTS (each row under
  the callback it runs). Tests in test/game/minotaur.test.ts: the commit
  order of 3.3; every junction arrival holds within its range, never at
  a tip; a long stop replaces it; a zero stop costs no tick; spotting
  keeps a junction stop and cuts a long one; `replayChase` reproduces a
  chase with stops; a roaming plan equals the runs then walked when
  nothing intervenes; a hunting plan's next run equals `huntEdge`'s
  choice for a still player. Plus url_codec.test.ts's defaults pin and
  param_codec.test.ts's table pin. The re-tune of 3.4.
- STAGE 2, the real-time telegraph (Opus: rendering).
  fabric_maze_renderer.ts (the route with a lead run, per-segment alpha,
  the ring only for a destination), main.ts:2777. A probe in
  `.claude/probes/K324/`: screenshots roaming, at a junction stop,
  resting, hunting and in the lair (desktop and 411x753), a count of how
  often the hunting telegraph's next run changes a second while you walk
  (the flicker check), and the perfq cost. Waits also for K7 stage 2,
  K307 stage 2 and K329, which edit main.ts.
- STAGE 3, the models in real time. The guard (roams within a territory
  around the exit's junction, in units) and the stalker (hunts whenever
  within sight, a best step with chance accuracy) on the real-time
  clock, the Behavior row shown in real time, per-model defaults in
  K294's shape, and a sim re-measure. Waits for stage 1.

## 7. Open questions for Levi

1. STOP LENGTHS. A stop at every junction of 0.2-0.6 s while it roams?
   Recommended: yes as the starting point, then tune by play.
2. HUNTING STOPS TOO. You said "each junction"; should it also stop
   while hunting, shorter (half, 0.1-0.3 s)? Recommended: yes; 0 keeps
   today's stop-free hunt.
3. EASIER, OR THE SAME? Stops slow it (about 22% while hunting). Keep
   today's catch rates by raising its hunt speed (the sim picks it, in
   0.7-0.9 of yours), or let the stops make it easier? Recommended: keep
   the catch rates.
4. SPOTTED DURING A STOP. Should spotting you cut a junction stop short,
   as it cuts a long stop? Recommended: no; the rest of the stop reads
   as "it noticed you".
5. TELEGRAPH REACH. Its current run plus the next run, with a ring where
   a roaming leg ends, faint while it roams and bright while it hunts?
   Recommended: yes, reach 1 by default, a slider to 3.
6. LIVE HUNT TELEGRAPH. While hunting, the next run follows where you
   are now, so it can change as you move. Live, or committed when it
   reaches a junction (then it would not re-plan when it leaves)?
   Recommended: live; add hysteresis only if the probe shows flicker.
7. PICK ON ARRIVAL. Pick a roaming leg's next destination when it
   arrives, so the telegraph shows the next leg during a rest (it reads
   your position up to 2 s earlier)? Recommended: yes.
8. MORE KNOBS. All of section 4.2 in the collapsed tuning subfolder, and
   4.3's two turn rules as knobs with K294? Recommended: yes.
9. THE LOOK LATER. K80 2.7's flowing chevrons for both telegraphs,
   after you have seen stage 2? Recommended: decide after stage 2.

## 8. Handoffs

(Stage agents append theirs here: what landed, measurements, residuals.)

- STAGE 1 (2026-10-20): the junction stops, pick on arrival, `plan()`,
  the seven params and the hunt pace 0.9. What landed, the baseline and
  re-tune tables, the pins and what is left: the Handoff at the end of
  `docs/design/K324_s1.md`.
