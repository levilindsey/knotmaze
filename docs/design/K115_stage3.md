# K115 Stage 3 brief: the title thread (E3)

Design `docs/design/K115_cursive_text.md` sections 4.2, 4.4, 4.6, 4.7
and 5. Stages 1b-2 are in: `buildTextGraph` emits a pinned word with
`mentr_a`/`mexit_a`, one `waypoint` per glyph plus the exit
(`src/core/text_graph.ts:586`, `:817-826`), the walk graph stops at
waypoints (`src/core/walk_graph.ts:103-109`), and a standalone word is
walkable end to end (`src/app/scene.ts:253`, `:286-311`; stage 2 shots
`.claude/probes/K115/stage2/solved_load.png`, `solved_tap1.png`,
`solved_win.png`). This stage hangs that word on a maze's entrance
tail: the player writes the title, crosses a seam, then solves the
maze. Levi's calls still bind: pinned; spurs travelable; capitals via
connectors; one-token links. Decisions this brief makes where the
design left the mechanism open are marked (picked); the genuinely
open ones are Calls for Levi at the end, each with a recommendation -
build the recommendation unless Levi says otherwise before the stage
starts.

## The title string (picked: derived, not a param)

- A daily's title is `Daily #${n}` for daily `n`, from a pure
  `dailyTitle(n: number): string` in `src/ui/daily_link.ts` beside
  `dailyParams` (`:65-67`). It is NOT a `UrlParams` field: a
  `?daily=12` (or bare) link must rebuild the same title on every
  device, and derivation from `n` guarantees that with no codec
  change, no new `CODEC_PARAMS` entry (`src/ui/param_codec.ts:309`
  stays last at `text`) and no `CODEC_VERSION` bump. Editing it can
  never leave the daily, so it does not join `DAILY_EXEMPT_KEYS` or
  `MAZE_PARAM_KEYS` (`src/ui/daily_link.ts:74-105`, `:131-192`) -
  tests pin both lists untouched.
- Ordinary (non-daily) designs get no title in this stage (Call C1).
  `params.text` keeps meaning the standalone scene
  (`src/core/scene_graph.ts:59-65` early return stays first) and wins
  over any title; knot mode (`mazeFabric` off) has no tails and gets
  no title.

## Builder: the exit connector (`src/core/text_graph.ts`)

- New export `attachTitle(graph: TangleGraph, title: string): string | null`
  in `text_graph.ts` (it owns the Hermite connector `hermitePts`
  `:556-580`, the resample rule `MAX_EDGE_LU` `:24` and the `t`
  namespace). It mutates the applied maze graph in place and returns
  the seam node id, or null when `title` builds no glyphs (empty,
  all-unsupported: the maze ships untitled, no error). Steps:
  1. Build the word with the existing builder at the fitted x-height
     (Width rule below). Its strands keep `pinned: true` (`:966-971`).
  2. Place it in a band above the maze: maze bounds from every edge's
     `latticePoints`; translate the word so its bounds are centered
     on the maze's x-center and its bottom sits `TITLE_GAP = 2` LU
     above the maze's top. Translation only - no rotation (K108
     exact ops, reading stays horizontal).
  3. The word's `mexit_a` is retyped END -> TURN and keeps its
     `waypoint` (the builder already flags it, `:826`): the last tap
     of the writing stops at the word's end.
  4. Extend the word's main strand from that point with a connector:
     Hermite samples (tangents from the word's exit and from the
     tail's outward direction, the `:563-564` 0.45 rule) to the seam,
     resampled into TURN edges of at most `MAX_EDGE_LU`, appended to
     the main strand's `edgeIds`/`nodes`. Main-strand order and the
     per-letter waypoints are untouched; the connector is part of the
     pinned strand, so the seam particle is anchored through it
     (`src/physics/particle_system.ts:718-724`).
  5. The seam (tail junction): the chosen entrance END (see Attach)
     is retyped END -> JUNCTION, its `anchor` deleted, id renamed to
     `tseam`. Two strand occurrences meet there (title main, tail
     strand), so the existing fusion makes one particle
     (`particle_system.ts:704-710`) and the pinned title holds it
     where the anchored END held the tail. The seam is a walk vertex
     by its type; it is never a branch (two arms).
  6. Crossings: run the word's crossings through the existing
     run-phase solver path only - the connector must create NO
     crossing with maze material (asserted, Tests). The connector
     runs in the empty band and down to the tail tip, which the tail
     escape already cleared (`src/core/maze_apply.ts:141-155`
     `TAIL_CLEAR`); if a Hermite segment still proper-intersects a
     maze edge, retry once with the connector's mid control pushed
     to the band's top edge, else return null (untitled maze).

## Attach: after start/exit selection (`src/core/scene_graph.ts`)

The maze's start/exit pair is the longest-optimal choice among the
tail combinations, made inside `buildWalkGraph`
(`src/core/walk_graph.ts:202-220`) - attaching first would let the
title's arc pick a different start (design 4.2). Order in
`buildSceneGraph` (`:58`), maze branch only, after
`applyMazePlan`/`applyMazeCuts` (`:121-122`):

1. When `params.title === ""`, build exactly as today. Nothing below
   runs; every pin in Determinism stays byte-identical.
2. `walk0 = buildWalkGraph(graph)`; if null, ship untitled. Record
   `walk0.start` (the seam-to-be) and `walk0.exit`.
3. `seam = attachTitle(graph, params.title)`; null ships untitled.
   Title strands are APPENDED to `graph.strands` (never prepended),
   their edges/nodes added under the `t` namespace, and one entry
   per appended strand pushed onto `hueGroup` (all the first title
   strand's index: one hue slot in the strands scheme,
   `src/core/section_colors.ts:258-261`; `RUN_FLAG.TEXT` stays a
   later stage).
4. Rebuild the walk with the ends forced - see Walk. The exit stays
   `walk0.exit`; the maze's own arc seam->exit is the stats optimal.

`SceneParams` (`scene_graph.ts:18-50`) gains `title: string`.
Callers: `src/app/scene.ts:233` and `:236` today pass `UrlParams`
straight through; rebuild instead passes `{ ...params, title }`
where `title` comes from a new `SceneDeps.dailyTitle: () => string`
(main.ts owns `dailyN`; it returns `dailyTitle(dailyN)` on a daily,
else `""`). The worker name must carry the new field:
`SCENE_FIELDS` in `src/physics/physics_worker_core.ts:205-237` is a
`Record<keyof SceneParams, ...>`, so `title: "string"` lands there
or the build fails - that compile error is the checklist.
`test/physics/host_seam.test.ts` keeps main + worker in lockstep.

## Walk and stats: walked, but outside the meters

The title IS walked (waypoints already give one tap per letter,
stage 2) and is outside every maze meter:

- `WalkGraph` (`walk_graph.ts:50-59`) gains optional `mazeStart`
  (the seam id), `titleLength` (lattice arc `start` -> `mazeStart`)
  and the title's vertex/edge membership. `buildWalkGraph` gains an
  optional `{ start, exit }` force parameter; without it, lattice
  and standalone-text behavior is today's, byte for byte. With a
  title: `start` is the word's `mentr_a` (the maze tail's `mentr_a`
  no longer exists - it is `tseam`), `exit` is forced from step 2,
  and `optimalLength` is REDEFINED for titled graphs as
  dist(`mazeStart` -> `exit`) (the maze's own shortest route);
  `distToExit` still covers the whole graph from `exit`, so `g`/`d`
  move classification (`src/game/fabric_controller.ts:362-369`) and
  hints work across the seam. Appended title edges keep every maze
  walk-edge index stable.
- Seam crossing: at the seam the choices are exactly the connector
  run (back) and the tail run (in) - no branch, no dead end. Spur
  junctions inside the word behave as in the standalone scene
  (travelable dead ends, stage 2).
- `FabricMazeController`: when `walk.mazeStart` is set, title
  traversals add 0 to `walkedDist` (both add sites, `:315` and
  `:326`; the fire clock and the star rating read it,
  `src/game/star_rating.ts:54-64`) and `pathLength` (`:231-235`)
  reports the maze-only route (0 while the head is in the title,
  raw minus `titleLength` once the path stack includes the seam).
  `arrive` (`:371-378`) never counts a title vertex (word waypoints,
  spur tips, the seam) in `visitedJunctions`/`deadEndTips`.
  `taps` and `moveLog` keep the title taps (they are real moves;
  `DailyAttempt.moves.length === taps.length` must hold,
  `src/game/daily_store.ts:226-227`; Call C4) and `replay(taps)`
  reproduces the whole solve, title included.
- The solve clock (`src/main.ts:1272-1273`, first move starts it)
  starts instead on the first arrival AT `mazeStart` for a titled
  daily: writing the title is not timed. HUD path/optimal then read
  maze-only on both sides (`efficiencyOf`, `src/game/maze_stats.ts:203`).
- Markers, reveal, fog: the start marker sits at the word's
  `mentr_a` and the finish at `exit` through the existing walk-keyed
  machinery (`scene.ts:286-311`). Trace/bloom floods start at the
  word and write it before flooding the maze
  (`src/core/reveal_plan.ts:200-201`); no reveal change. Under fog /
  thread-reveal the title is simply the first ground walked.

## Camera, placement size, phone rule

- Bounds: `computeFitTarget` already frames every particle
  (`src/app/camera.ts:79-86`), so title + connector particles widen
  the fit with no camera change; `fitRight`/`markersRight`
  (`camera.ts:114-121`) follow. Verify, do not assume: the framed
  right edge must clear the open panel exactly as a maze's does
  (`src/ui/view_clamp.ts:94-113`); the wide-word panel overlap is
  K549, already filed - out of scope here beyond the check.
- Width rule (design 4.2: about 7 glyphs at x-height 3): build at
  x-height 3, measure the word's LU width; if it exceeds the maze's
  width (`2 * gridSize`), rebuild at `3 * mazeWidth / wordWidth`
  (shrink only, never grow). `Daily #12` at gs 18 fits unsqueezed or
  near it; `Daily #999` is the squeeze test case. The follow camera
  is not used: fit framing must show word + maze at once.

## Determinism, dailies, records (picked: all dailies, pre-launch)

- No text machinery runs when `title === ""`, and `buildMazePlan`,
  `applyMazePlan`, `applyMazeCuts`, `buildWalkGraph` (unforced) and
  the lattice grower are untouched: K87's plan pin
  (`test/core/maze_plan_identity.test.ts`), the K74 walk pins, the
  golden dailies (`test/ui/daily_link.test.ts:102-119`, whose
  `walkOf` builds without a title) and the physics golden
  (`test/physics/byte_identity.test.ts`) all stay green UNREFROZEN.
  The title changes a daily's PLAYED walk graph (new start, added
  edges), never its maze plan or its maze arc.
- Because the played walk changes, `walkFingerprint`
  (`src/game/daily_attempt.ts:19-32`) changes for titled dailies: a
  saved pre-title attempt is refused by the existing K47 path
  (attempt dropped, results kept) instead of mis-replaying on
  shifted edge indices - and appended title strands keep maze edge
  indices stable as a second line of defence. Recorded results keep
  their numbers; new results store maze-only `path`/`optimal` (see
  Walk and stats), so best-time/efficiency aggregates stay
  comparable across the change. `DAILY_DEF` stays 2
  (`src/ui/daily_link.ts:44`): pre-launch, titles land on every
  daily at once rather than gating from a day (design 4.7's DAILY_V2
  alternative; Call C3), and K531's launch freeze later freezes the
  title in with the rest of the daily design.
- K108: placement, fitting and the connector use only `+ - * /`,
  `Math.sqrt` via `hypot2` and the existing Hermite arithmetic; the
  string is `Daily #${n}` (integer -> text). Building the same
  titled scene twice is bit-identical (test).

## Stages within the stage

- 3a (this brief, one code stage): `dailyTitle`, `SceneParams.title`
  + worker field + scene wiring, `attachTitle` (placement, seam,
  connector), forced walk + stats exclusion, tests, screenshots.
- 3b (only on Call C1): a general `title` link param for ordinary
  designs - appended `str("title")` LAST in `CODEC_PARAMS`
  (append-only rule, `param_codec.ts:37-39`; no version bump), a
  panel Text-like row, `MAZE_PARAM_KEYS` untouched. Not in 3a.

## Out of scope

Cartouche (E2, stage 4), shapes, `RUN_FLAG.TEXT` color and the
reading-order gradient (design 4.5), per-letter draw reveal,
exit-side titles, title on shaped-anchor entrances beyond what the
band placement gives free, live (unpinned) title, K549's panel fit.

## Tests

- `test/core/text_graph.test.ts`: `attachTitle` on an applied maze -
  `checkStructure`/`checkAlternation`/`checkStrandPartition` pass;
  no `mexit_a`; `mentr_a` is the word start; `tseam` is a degree-2
  JUNCTION with no anchor; every title strand pinned; the connector
  proper-intersects no maze edge (segment test over both graphs);
  unsupported-only title returns null and the graph is untouched.
- `test/core/scene_graph.test.ts` (or walk tests): titled vs untitled
  same seed - forced exit equals `walk0.exit`, seam equals
  `walk0.start`, `optimalLength` equals the untitled maze optimal,
  `titleLength > 0`, maze walk-edge indices/lengths unchanged,
  `buildSceneGraph` twice identical; gs 6 and a shaped (`heart`)
  case; `Daily #999` width-fits its maze.
- `test/game/fabric_controller.test.ts` style: scripted walk through
  the title - one tap per letter, connector tap, seam tap, then the
  maze's first run; backtracking across the seam returns into the
  word; after the seam, `pathLength`/`walkedDist` count maze arc
  only, `visitedJunctions`/`deadEndTips` hold no title vertex, and
  `replay(taps)` arrives at the same state.
- Daily: `dailyTitle` pins (`Daily #1`, `Daily #12`, `Daily #999`);
  `dailyParams`, exempt and maze-key lists unchanged; K87, K74,
  golden-daily and byte-identity suites green unmodified.
- Full `npm test` + `npm run build`. Real screenshots via
  `scripts/diag_screenshot.mjs` (never virtual time): a titled
  `?daily=12` at load and after writing two letters, phw default AND
  `phw=0`, panel closed; a phone-width (411 px) shot for the fit.

## Kill criteria

- The connector crosses maze material on any daily 1-30 or any shape
  at gs 6/12/18 (the segment test sweeps them), or the seam's 2-arm
  junction fan renders as a blob/break at phone zoom.
- A titled maze never sleeps, or the pinned seam pumps its tail
  strand awake (add the titled daily to the sleep battery; a
  standing fight at the seam kills the JUNCTION seam - fall back to
  keeping the anchored END and starting the walk at the tail, word
  as a preceding standalone scene per design 4.7).
- Forcing moves the exit or the maze optimal on any swept seed
  (selection leaked the title in): the attach order is wrong; do
  not ship around it.
- `Daily #12` at phone width is illegible or squeezes the maze under
  playable size in the real renderer: drop daily titles to the
  standalone pre-scene (design 5) and keep E3 for short custom words.

## Calls for Levi

- C1. Scope: dailies only (rec.), or any design via a `title` link
  param (stage 3b above)? Dailies-only needs no codec/panel change.
- C2. Wording: `Daily #12` (rec.; Hershey has `#`, digits and the
  capital D join by connector), `Daily 12`, or the date spelled out?
  Longer strings hit the width rule sooner.
- C3. Rollout: every daily at once, pre-launch (rec.; saved attempts
  in flight are refused by fingerprint, results keep maze-only
  numbers), or titles only from a chosen day, which needs a
  `DAILY_DEF` bump and a day gate in `dailyTitle`?
- C4. Share grid: title taps appear as leading `g` squares in the
  move grid and share text (rec.; taps/moves stay one list and old
  records stay valid), or are title taps logged but hidden from the
  grid (the grid code learns a prefix to skip)?
- C5. Seam feel: two taps at the end (word-end waypoint, then the
  connector run into the seam, rec. - the word finishes, then you
  step in) or one flourish tap that writes the last letter and the
  swash together?
