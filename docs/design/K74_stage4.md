# K74 stage 4: the greedy-trap search and K46's bands

Sim-first half (2026-10-16, measurement + brief; no generation change).
The build half is the follow-up this brief scopes. Read first:
`K74_maze_design.md` 4.4 (option D), 4.5 (option E, K46's bands), 5
(shipping rules) and 6; `K74_stage3.md`'s K521 measurement (stage 3's
bar fails on dailies 1-240: far-end greedy gF median 2.86x but 20.0%
within 1.5x against the ≤ 15% bar); `.claude/rules/generation-plan.md`.

## What landed in this half

- `src/core/greedy_trap.ts`: the pure search core - the two-walker DFS
  (`greedyWalk`, far-end score by exact squared distance), the final-path
  rebuild, the near-exit trap candidates, the acceptance rule, the
  search loop over a caller-supplied evaluate/candidates/remove seam,
  and K46's band table with pass-share pricing. Nothing calls it from
  generation yet.
- `test/core/greedy_trap.test.ts` (11 tests): synthetic walker, tie,
  backtrack, candidate, acceptance, loop-stop and band cases, plus the
  walkers on two real mazes at today's defaults.
- Probe (untracked, coordinator copies): `.claude/probes/K74/stage4/`
  (`search.ts`, `analyze.mjs`, `out_search*.jsonl`,
  `results_stage4*.md`). It runs the search at plan level on dailies
  1-80 (today's defaults: corridor 24 away, exitClearance 12, stage-1
  tails), deleting choice splices / 4-way merges - spanning sites are
  never offered, so reachability holds by construction.

## Measured (dailies 1-80; K521's 1-240 baseline in brackets)

Two modes were run. **H0**: search evaluated with `hCutShare` 0 (the
prototype's substrate, splice-exact candidate mapping), removal sets
then re-scored with H1 on. **H1-in-loop**: every evaluation and every
candidate comes from the shipped maze (H1 at 1), candidates mapped by
mnode order or by exact splice-endpoint position.

| Mode | gF median | gF ≤ 1.5x | gH median | Both targets met |
|---|---|---|---|---|
| Shipped today (H1) | 3.39 | 15.0% | 5.66 | 46% |
| H0 search, its own substrate | 3.39 → 3.73 | 13.8% → 5.0% | 5.18 → 5.92 | 44% → 65% |
| H0 removals transferred to H1 | 3.39 → 3.44 | 15.0% → 12.5% | 5.66 → 5.91 | 46% → 45% |
| **H1-in-loop search** | **3.39 → 4.06** | **15.0% → 5.0%** | **5.66 → 6.01** | **46% → 70%** |

[On 1-240 the shipped maze reads gF 2.86 median, 20.0% within 1.5x
(K521); this half measured 1-80 only, where shipped sits exactly at
the 15.0% share. The build half must re-run 1-240.]

Findings:

1. **The search finds traps beyond stage 3's corridor** - on its own
   substrate. Median 0 deletions (52-54 of 80 mazes need none: they
   already meet the 2.5x / 3.5x targets or no offered deletion helps),
   p90 3, max 6-7. Of mazes below targets, 17/45 (H0) and 19/43
   (H1-in-loop) reach both; the rest stop `no-improvement` (28 and 24
   mazes). Route growth stays inside the 15% cap by construction
   (max 1.146 / 1.130 measured).
2. **H1 does not commute with the search.** Traps found with H1 off
   mostly evaporate when H1 then cuts the remaining H's (target-band
   pass 46% → 45%; daily #1's H1 gF 8.71 → 1.07 after its five H0
   removals). With H1 inside the evaluation loop the same search
   reaches 70% at both targets and 5.0% within 1.5x. The build must
   therefore search the maze the player gets, not the pre-H1 plan.
3. **The acceptance objective trades walkers.** `min(gF/2.5, gH/3.5)`
   can rise while the already-passing walker falls (gF fell on 5/80
   mazes in H0 mode, gF on 2 and gH on 4 in H1 mode; daily #1's H0 gF
   4.66 → 3.41 while its gH was fixed). A shipped search should not
   spend difficulty it already has (call 3 below).
4. **Cost.** H1-in-loop: median 71.5 ms per maze, p90 229 ms (desktop
   Node, plan excluded - it is built once; trials re-apply surgery and
   walkers only). The prototype's ~60 ms median estimate holds; a phone
   at ~5x (K74 4.4's inference) pays ~0.35-1.1 s per searched design.
5. **Physics was not run on searched mazes** in this half. Deletions
   only remove junctions, and the prototype slept 16/16 (K74 4.4), but
   the build half gates on the stage-3 sleep harness (call 6).

## What K46's bands say about placing them

Bands place nothing: a band is a seed filter (K46 section 5), so its
only placement statement is "keep a maze that already has traps, wherever
they are". Priced on the same 80 dailies (share passing / expected
candidates per day by reroll):

| Band (gF / gH floors) | Shipped (H1) | After H1-in-loop search |
|---|---|---|
| K46 draft 1.1 / - | 98% / 1.03 | 99% / 1.01 |
| 1.5 / 2 (K74's proposed step) | 71% / 1.40 | 89% / 1.13 |
| 1.8 / 2.5 | 60% / 1.67 | 80% / 1.25 |
| 2.5 / 3.5 (search targets) | 46% / 2.16 | 70% / 1.43 |

Reading: the draft 1.1 band remains vacuous after stage 3 (98% pass).
At 1.5 / 2 the filter costs 1.40 candidates a day and still accepts
mazes the search could have fixed in place; the search instead puts
traps at one specific place - on the greedy walkers' final paths,
within 20 u of the exit, nearest first - which is also where stage 3's
corridor already works, so the two compose. For the 30% the search
cannot fix (`no-improvement`), a band reroll is the fallback, and after
searching it costs 1.43 candidates a day at the full target band
against 2.16 before. Recommendation: the daily gets the search first
and, only if Levi wants every day over the bar, the 1.5 / 2 band as a
seed reroll on top; never the band alone at 1.1.

## Calls for Levi

1. **Ship the search at all?** Rec: yes, H1-in-loop only (finding 2).
   The H0 form is measured not to transfer and should not ship.
2. **The param.** Rec: one appended maze param, default off (K74's
   rule: every mechanism's neutral value turns it off) - `greedyTrap`
   (enum `off | on`, codec key free at build time; never daily-exempt,
   targets and caps as code constants beside `DEFAULT_TRAP_SEARCH`).
   Ordinary links stay byte-identical with it off; the daily turns it
   on by recipe when K46's DAILY_V2 lands, not by a default change.
3. **Acceptance floor.** Rec: a trial may not drop a walker that is
   already over its target below that target (nor raise the objective
   by spending the other walker's surplus past, say, 1.25x target).
   This deviates from the prototype's pure `min()` objective on
   purpose (finding 3); it costs some `no-improvement` stops.
4. **Exact heading score.** The far-end walker is exact (squared
   lattice distances). The prototype's heading score normalizes a run
   direction by its length - a division that is not engine-exact. Rec:
   rank heading candidates by the exact integer cross/dot form the
   build designs (compare `(q-p)·g` scaled by run length via squared
   cross-multiplication, ties by edge id), and pin it against the
   prototype's float score on 1-240 (name any maze whose pick differs).
   Until this exists, the search must not run at load in shipped code.
5. **Where it runs.** Options: (a) inside generation after H1 - needs
   the applied walk graph, so a new seam beside `buildMazePlan`
   (scene_graph builds plan -> apply -> cuts; the search would loop
   fresh lattice + apply per trial, as the probe does); (b) offline
   into a per-day table (K46's alternative) - no load cost, a table to
   extend. Rec: (a), it keeps one link = one maze from the code alone;
   take (b) only if the phone timing in item 6 of the build fails.
6. **The bar on 1-240.** Rec: decision 1's bar as stage 3 left it
   (gF median ≥ 2.5x, ≤ 15% within 1.5x) plus both-targets share
   reported, measured on dailies 1-240 with tails and H1 on, and the
   sleep gate over the searched sample. If `no-improvement` mazes keep
   the share over 15% on 1-240, the follow-up is call 1's band reroll,
   not looser targets.

## Build half: scope and sizing

Opus, 2 h cap. Ports 5940-5949; probes in
`.claude/probes/K74/stage4/` (this half's harness is the starting
point - port `search.ts`'s H1 mode, do not re-derive it).

1. Exact heading score (call 4) in `greedy_trap.ts`, with a parity
   test against the float prototype score over real mazes.
2. Acceptance floor (call 3) in `acceptsTrap` + tests; re-run the
   1-80 probe: expect fewer walker regressions, more `no-improvement`.
3. The seam: a `greedyTrap` step that takes (graph params, plan) and
   returns a searched plan, running fresh-lattice trials with H1 on.
   Candidate mapping from the post-H1 walk graph (mnode order, then
   exact endpoint position, then 4-way merge id); spanning sites and
   sites H1's exit guard protects are never offered. Check:
   `planReachesAll` / walk solvability on every searched design.
4. Plumbing, in stage 3's shape: MazeParams field, SceneParams +
   `sceneParamsOf` (the copies-every-key test guards it), url_state
   field/default/clamp, ONE codec row appended after 155,
   `MAZE_PARAM_KEYS`, one hidden Maze panel row, PRE_K74-style neutral
   in the identity fixtures. Check: every pin holds with the param
   off, byte for byte (that is the whole safety argument).
5. Identity for the on state: pin a few searched plans/walks in
   `maze_plan_identity.test.ts` the way stage 3 pins its defaults, so
   later refactors cannot move a published searched maze silently.
6. Measure on dailies 1-240 (tails, H1, param on): the bar (call 6),
   route growth, junction loss, generation time under the perf lock
   (search trials included), sleep via stage 3's `phys.ts` on the
   searched sample, and a before/after sheet of three finishes.
   Phone timing rides K156's next pass, as stage 3's did.
7. Defaults and pins: the param stays OFF in `PARAM_DEFAULTS`; only a
   K46 recipe enables it (that stage re-freezes the golden dailies and
   name-moves its pins then). If Levi instead wants ordinary links
   searched by default, that is a deliberate default change - re-freeze
   and name every pin it moves, per stage 3 item 10.
8. Lore: a `generation-plan.md` entry beside stage 3's (the search,
   its order after H1, the exactness rule, its measured numbers).

Out of scope: K46's DAILY_V2 itself and its reroll (K46/K82), the
entrance-side search (walkers run entrance -> exit only, as in the
prototype; backward walkers measured as hard already, K74 3.3),
dead-end-branch traps (K74 stage 3 brief item 5), and any change to
the corridor, taper, flank or H1.
