# K1314 stage 6: the outline faults left after stage 5

Ledgers: K1314 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree, on
its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md` and the two handoffs at the end of
`docs/design/K1314_s5_joins_wedges.md`.

## Why

Stage 5 cleared x67's hard edge (census hard_edge 4 -> 3). Claude's crop review of stage 5 found rp=outline
better than form B at classes (a) and (c). K1321 takes those out of the census reference, in parallel with
this stage. The faults below are the outline's own. In order:
1. **g41_ring_tw64 x68:** a hard wedge, unchanged by stage 5. It needs c4's centre (item 196) lowered. At
   (20.096,20.627) form B shows c3 where a plain z(foot) - d zt / h comparison favours c4, and nobody knows
   why yet: start there. Keep muse_hash j50 clear. It is a near tie at z 0 that form B decides by distance.
2. **g41_ring_tw64 x67:** the leftover purple tongue, a narrower owner wedge
   (`k1314_s5_own.ts g41_ring_tw64 18.085 20.685`).
3. **g41_user_tw64 j71:** a hard wedge at (4.95,7.54). At a level tie, c32's tail fill (piece 912, item 561)
   is empty. The margin term is at or below 0, under TAIL_FILL_MARGIN 0.4. The handoff names two leads:
   trace endTailPts' fill walk from u 0, or let j71's fan defer to E's end at a tie.
4. **Specks inside the ink at the class (a) joints:** tiny specks or a dark blob at def j174, ring j12,
   g41_ring_tw42 j12 and g41_user_tw64 j28. They are in the "after" column of `out/s5/after/` (spots in
   `out/s5/spots.txt`).
5. **g41_user_tw64 j39:** white tick marks across the right-hand ink, on master too.
6. **muse_hash j78:** a hard wedge at (5.88,8.50): failed corner 235's tail 1878 at alpha 0. Find out
   whether it is a K1315 tail end. K1315 is waiting on Levi: a round dot or a square end. If it is a K1315
   tail end, leave its look and say so; if not, fix it.

Out of scope: the K1315 end look; the K1319 j73 eye tip; classes (b) and (d); the known false positives
(muse_hash j29, g41_user_tw64 j28 #0); the census reference (K1321).

## Goal

Each fault gone in rp=outline, by rules in the code that builds corners, pieces, fans and the fill, with no
new artifact of any kind. Don't copy a form B flaw. The technique is yours. Today's look (no `rp=outline`)
stays byte-identical.

## Done

- **Census** (`k1314_run.ps1 -Lock`, the reference as on master): the in-scope finds at 0, and no kind
  above stage 5's `census_s5c` (stray_ink 25, hard_edge 3, paper 0, broken_ink 13, k1049 0) less what you
  clear.
- **Crops:** reference | before (master) | after, from your final commit, for each in-scope spot and every new
  find of any kind, in `.claude/probes/K1314/out/s6/`. Crop the specks and the ticks at 4x or more. I view
  them before merging.
- **The gate's per-stage checks:** the desktop worker frame on def, ABBA under the perf lock: not worse than
  master by more than the run-to-run spread (`k1314_s3_bench.ps1`). `npm test` green, golden snapshots
  unchanged. `outline_port.test.ts`'s pins re-frozen only where your fix moves them, and named in the
  commit. Copy `.claude/probes/K868/scenes/g41_ring_tw42.json` from the main checkout first. It is untracked,
  so without it the test's second pin skips. Stage 5's run skipped it that way and master went red.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never
  print a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long
  results to a file and read only the lines you need). Use the Read tool only right before an Edit, and to
  view crops. Junction `node_modules` from the main checkout; never `npm ci`. Read
  `.claude/rules/probes.md` before probing: a bare URL is today's daily. Real-time headed Chrome only; never
  `--virtual-time-budget`.
- **Untracked inputs** (stage 1-5 censuses, crops, form B caches) are in the main checkout's
  `.claude/probes/K1314/out/`. Copy what you need into your worktree and never write there. Delete any form
  B cache you copy before you stop.
- **Your files:** `src/render/outline/outline.ts`, `fill_tri.ts` outside its record code, tests, and your tools
  and outputs under `.claude/probes/K1314/`. Two agents run at the same time:
  - **K1247 stage 24** works in `band_rec.ts`, `band_place.ts`, `draw.ts`, `band_gpu.ts`, the record code
    (`chain_frame.ts`, `rec_glsl.ts`, `fill_tri.ts`'s `fillStructure`/`recStrip`/`stripNb`, `outline_app.ts`,
    `outline_model.ts`, `outline_worker.ts`) and `src/app/frame_loop.ts`. It may add hooks behind `ob` in
    `outline.ts` (`OB_DI`); keep your edits off them.
  - **K1321** works in the census reference: `k1314_census.ts`'s `rasterFormB`, `filletHere`, `filletOf`,
    the `FILLET_*` flags, and `form_b_fillet.ts`.
  Stay out of all of those. If your fix needs one of them to follow, say so in the report.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did
  not start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time,
  and delete it after. While someone else holds it, wait inside one blocking command; a lock older than
  30 min is stale. Run the census with `-Lock`. It takes the lock for each scene, so don't hold the lock
  around it.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Before stopping for the cap, run `Get-Date` and check that 2 h have really passed. Two
  earlier agents stopped at about 70 minutes, believing the cap was reached. Leave the last 25 minutes
  for the checks. Then commit WIP, append a handoff to this brief with your start and stop times, and
  report. Neither a compaction nor context size is a stop; after a compaction, re-read this brief and
  `git log`.

## Report

Under 40 lines:
- the census counts per kind, before and after;
- each rule and where it lives (file and function);
- the worker frame on def, before and after;
- the crop paths;
- what is left, and whether j78 is K1315's;
- your last SHA.

End with `Ledger items` and K1314's handle fields.

## Handoff (stage 6 agent, 2026-11-12, start 1:20 AM, stop 2:50 AM)

Census (`k1314_run.ps1 -Tag s6 -Lock` at 85b9516a, out/s1/census_s6.*) against
census_k1321c (master's outline, K1321's reference): stray_ink 12 -> 12,
hard_edge 3 -> 2, paper 0 -> 0, broken_ink 13 -> 13, k1049 0 -> 0. The one
difference is x68's wedge gone (g41_ring_tw64); no new find of any kind.

Rules:
- `outline.ts` `arcEndFeet` (ARC_END_FEET, end of piecesPhaseC): an ok
  corner's arc takes the adjoining run's foot at each end it shares with a
  run. Clears j39's ticks.
- `fill_tri.ts` `fillFrame`, the strip loop: a strip whose two border pieces
  span different s ranges samples both sides on one s scale (their union; a
  side outside its span holds at its piece end) and keys its centre at the
  mid s. Clears x68 and x67's tongue. JEND_GATE: not where the ranges part
  at a junction end (stationS of that station non-null), which keep stage
  5's rows (else muse_hash j77, j20, j154 broke: 3 broken_ink).
- MATCH_MIRROR (off): mirroring the consumed side across the centreline
  clears j71, but the mirrored tube then lies under another arm's junction
  fill keyed above it (muse_hash j56: 7 hard edges, 4 paper on two scenes).

Bench (k1314_s3_bench.ps1, def, ABBA, perf lock; worker frame p50 ms):
A 4f3cbb0c 49.6 / 44.6, B b0340614 47.0 / 44.8 (out/s6/bench_s6b.json).
A first run under another agent's load read 67.0/67.2/66.7/48.8
(bench_s6.json), void.

Crops (fillet ref | master 4f3cbb0c | s6): out/s6/after (px 240) and
out/s6/after4x (px 480, zoom 2.5); master's own in out/s6/before{,4x}.

Left:
- j71 (g41_user_tw64, 4.95, 7.54): needs MATCH_MIRROR plus a junction fill
  that yields to an arm's own tube where it lies over it.
- Fault 4 specks (def j174, ring j12, g41_ring_tw42 j12, g41_user_tw64
  j28): unchanged; the ink fades there come from draw.ts tieAlpha /
  contactPasses tying two arms of one form B junction group (def j174:
  c71/c73, group 119). K1247's file.
- j78 (muse_hash 5.88, 8.50) is K1315's: c79's open start under c33, run
  1105 faded by runEndFade, tail 1878 at alpha 0.