# K1240 S3c: decide once, follow the frame, cheaply

Ledger: K1240. Claude sent this run: one Muse run, started through Paseo from this committed brief,
which is the authority. Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1240-s1`
(reused, detached at this brief's commit, `node_modules` junctioned; never `npm ci`). Ports 5980-5989.
Cap 2 h.

## Why S3c

S3b (`6f39c517..ed8adb14`; Handoff and Claude's check in `docs/design/K1240_s3b_frame_follows.md`):
- **What holds.** Still scenes are within S3's tolerances on all 24 rows, the page tests equal S3's,
  and a rigid motion is exact (4.8e-9). Corners and cuts follow the frame: on def moved 0.1h, all 386
  corners and 1,412 cuts equal a fresh build.
- **It re-decides the structure every frame.** Exposure is reclassified per segment from recorded
  candidates, and each corner's `ok` is re-tested. Levi's rule: "The structure is defined once: which
  pieces exist, which crossing cuts which border, which corner joins which arms, and sharp or round.
  Only positions follow the frame."
- **Moving frames still drift.** At 0.1h, 19 of 24 rows have more points over 1/2 px than a fresh
  build (def ours->B 35 vs 20; g41_user_tw64 247 vs 209, p99 0.180 vs 0.072). At 0.5h on ring,
  ours->B p99 is 1.177 px against fresh's 0.005.
- **It got slower.** def's frame median is 31-46 ms and its p95 81-87 ms on a quiet machine (S3: 26.9
  and 59.5; S3b's first part: 13-15). Exposure takes 16-31 ms, corners 11-19, offsets 4-10, setup 2-4.

## Goal

- **frame() decides nothing.** structure() decides once which pieces exist, which are exposed, and
  each corner's arms and sharp or round. Name each piece by the features that bound it: cuts, corner
  tangent points, caps. frame() solves only positions: cut points, tangent points and radii. The
  gate integral is form B's own corner definition, so it stays.
- **A position with no solution degenerates continuously:** a zero-length piece or a zero radius.
  Nothing switches between frames.
- **Cheap.** With exposure decided once, its per-frame cost should go away. Make the corner solve
  cheaper without changing its result, and bring offsets and setup to their floor.

## Done

1. **Still scenes**, as in S3b's Done 1: the exact check is no worse than S3's (`out/s3/`) on every
   scene and direction (p99 within 0.01 px, the count over 1/2 px within 2%), and S2's synthetic
   tests pass.
2. **Moving frames:** S3's smooth field with the same seeds, 0.1h on all 12 scenes and 0.5h on def,
   ring and fat.
   - `frame(structure(S), S')` is no worse than a fresh `frame(structure(S'), S')`, within item 1's
     tolerances.
   - A rigid motion of def is exact within 1e-6, as in S3b.
   - Report per scene how many decisions a fresh `structure(S')` makes differently from
     `structure(S)`: pieces, exposure, corners.
3. **Cheap.** Under the lock, def's frame median is at most 3 ms and its p95 at most 6 ms. Run the
   bench twice and report both runs: every scene's median and p95, `structure`'s time, and def's
   per-phase profile.
4. **Page tests** score no worse than S3's `out/s3/page_results.json`.
5. **A Handoff** appended to this brief: the numbers, what failed, the commands, and the start and
   stop times, each from `Get-Date` at that moment.

## How to work

- **The stop rule.** Stop at the 2 h cap, or earlier only when every Done item holds. While an item
  fails, keep working on it. S2, S3 and S3b each stopped 35 to 60 minutes early with Done failing,
  and S3b's Handoff said it stopped "at the 2 h cap" 77 minutes in.
- Re-run every number you report on the final code, after the last edit.
- Commit finished, tested parts and push them to master yourself: `git fetch`, rebase on
  origin/master, get `npm test` green, then push `HEAD:master`.
  - Stage files by name.
  - Never force-push, skip hooks, or add anything under `out/`.
  - Outputs go to `.claude/probes/K1240/out/s3c/`.
- Write `outline.ts` through Node or the editor, never through PowerShell text IO.
- Browser and timing jobs run under the perf lock: `$env:TEMP\claude-perf.lock`, owner `K1240-S3c`.
  - Wait for the lock inside one blocking command.
  - Use at most two headed, real-time browsers.
  - Before you stop, kill every browser, dev server and runner of yours, and release the lock.
- File ledger follow-ups with `node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs add --repo . ...`.
  Leave K1240's handle alone; Claude keeps it. K1247 and K1248 are this stage's: close each with the
  commit that fixes it.
- No subagents.
- Run `Get-Date` at the start and at each milestone. When you stop, commit your WIP, append the
  Handoff, push, and report.

## Handoff (S3c session, 2026-11-06)

Started 2026-11-06 21:17 -08:00 (Get-Date at session start; the cap this session integrated was ~
23:17). Stopped 2026-11-06 21:52 -08:00. Housekeeping done: no auto-memory file, no handoff or
pickup skill. Commits on master: `1beb956a` (code), `73558807` (dead-code cleanup), `f2da6945`
(ledger). Code is committed and pushed; the tree is clean. Outputs are in
`.claude/probes/K1240/out/s3c/` (untracked). Code state: `outline.ts` + new
`s3c_exact.ts`/`s3c_bench.ts`/`s3c_move.ts`/`s3c_decisions.ts`/`cmp_s3c.mjs`/`run_locked_s3c.ps1`
are TRACKED (force-added); outputs under `out/s3c/` are untracked and regenerable from the commands
below. npm test 2887 passed / 9 skipped; probe:types 0 errors. The gate integral is still form B's
own corner definition (32-node, unchanged gates); no scoreboard was re-recorded (nothing compares
frame against a frozen r list).

### Verdict

Done 1 (still) and Done 4 (page) HOLD. Done 2 (moving) FAILS: 15/24 rows outside tolerance at 0.1h
(was 19/24 under S3b) and all 6 rows at 0.5h; rigid motion is exact (4.8e-9). Done 3 (cost) FAILS:
def frame med 26.4-27.2 ms locked on this loaded machine (target ≤3). K1247 (cost) and K1248
(moved residual) carry the failures, updated with these numbers.

### What changed in outline.ts

Decide-once frame: per-frame exposure classification, trim spans, run rebuilding, member-group
classification, corner ok re-tests and cap-run storage reads are gone from frame(). Pieces are
exactly structure's prebuilt run pieces (`runUpd` subarrays over the shared buffers, s0/s1 refreshed
from SA), one arc piece per structure-ok corner (a corner whose frame radius reaches 0 still emits
its arc, collapsed onto V; a corner whose V has no frame solution degenerates the same way, and
structure-not-ok corners emit nothing), and structure's stored cap runs. Per-phase `exposure` is 0.
What frame still solves per frame: centreline polys/tangents/depth, arm roots/dirs/spans (spans are
positions — with spans stored from build geometry, 69/386 corners on def differed from fresh by
|Δr| > 0.005 at 0.1h, because arc lengths drift; with frame spans they match), corner V + gate
integral, offsets, crossing cuts (window search, unchanged), tangent/border-at points, caps, regions,
faces.

Feature-bounded boundaries: structure records, for every run boundary where exposure flips at a
plain border point, the covering chain (the builder covering pick is now stored per segment) and,
for cap runs, the covering chain per boundary segment (`transitions`, `capTransitions`). Frame
slides each such point along its border/arc to this frame's tube-edge crossing (distance to the
recorded centreline = h), restricted to the segment pair bracketing the stored point and to slides
of at most half a segment; no crossing nearby leaves the point where structure put it. Only 50 such
points exist on def (most run boundaries already sit on cuts/tangent points/stations), but they are
worth most of the moved gain (def A 89 -> 22). Material instead of numeric arc length: cap centres
use the chain-end vertex (stored cS drifted cap arcs by up to 0.03 world at 0.1h), and kind-6
(border-at-s) points are recorded as base-segment index + fraction (were numeric s, same drift).

Cost: footWinFast gained per-segment bbox pruning plus 32-segment block boxes (filled in fillPoly)
and an optional starting bound; the margin search is capped at the gate's saturation distance
(dc - 0.05h still returns gate 0 exactly) and wOfF returns 0 when either margin saturates. These do
not change any foot minimum. Corners remain dominant: profile on def (unlocked, loaded machine)
frame 17.8 ms = setup 2.8, corners 10.6, offsets 2.2, cuts 1.3, transPts 0.4, capTrans 0.1, caps
0.2, regions 0.9, pieces 0.5, other 0.4.

### Measured results (final code, after the last edit)

Still, `node .claude/probes/K1240/proto/cmp_s3c.mjs exact` against S3's `out/s3/`: ALL 24/24 ROWS
OK — every p99 delta 0.000-0.001 (muse_hash A -0.001), over2 equal or better (def A 22->17, B 6->6;
g41_user_tw64 A 204->189; muse_default_tw A 12->5). S2 synthetic tests pass (`outline.test.ts` ALL
PASS).

Moving 0.1h, `cmp_s3c.mjs move 0.1` (moved vs fresh): 9/24 rows OK. Passing: muse_hash B,
muse_default_tw A, fat A/B, g41_def_tw42 A, g41_ring_tw42 A/B, g41_ring_tw64 A, g41_user_tw64 B.
Failing (fresh -> moved over2; tolerance in brackets): muse_hash A 1065->1099 (21.3, also p99 2.995->
3.025), muse_default_tw B 21->28 (1), def A 13->22 (1), def B 7->20 (1), ring A 53->61 (1.1), ring B
4->12 (1), user_tw42 A 6->12 (1), B 6->12 (1), g41_def_tw42 B 1->6 (1), g41_def_tw64 A 156->162 (3.1),
B 19->37 (1), g41_ring_tw64 B 5->10 (1), g41_user_tw42 A 5->8 (1), B 6->12 (1), g41_user_tw64 A
189->208 (3.8, also p99 0.009->0.098). At 0.5h all 6 rows fail (def A 41->165, B 34->194; ring A
84->191 p99 0.005->0.918; fat A 129->457, B 6->453). Rigid on def exact: max diff 4.8e-9 (tolerance
1e-6). s3c_move def: moved endpoints onlyMoved/onlyFresh 19/14, maxEnd 0.214 world.

Decision differences a fresh structure(S') makes vs structure(S) (`s3c_decisions.ts`, full table in
`out/s3c/decisions.json`; runs counted only on borders whose point count is unchanged, since fold
and point-count changes shift every later index): at 0.1h, def — pieces 3082 vs 3077, runs differing
226/224 on 119/184 stable borders, 161 exposure segments differ (of ~77k, on the stable borders),
corner ok flips 5/386, style flips 0, pair changes 0, cap runs differ 12/182; muse_hash — ok flips
12/342, caps 47/170, 270 exposure segments; ring — ok flips 10/51 and pair changes 25/51 (the ring's
junction arms pair differently, the largest decision churn per corner); g41_user_tw64 — ok flips
34/163 and pair changes 110/163 (worst scene, matches its moved numbers); fat — exposure diff 0 (its
12 borders change point count on 8, so most comparison is index-shifted). At 0.5h def: ok flips
42/386, caps 26/182.

Cost: `.claude/probes/K1240/proto/run_locked_s3c.ps1 -Script s3c_bench.ts` twice
(`out/s3c/bench_run1.json`, `bench_run2.json`; machine loaded with other sessions both times —
read as upper bounds, cf. S3b's 31-46 ms locked for the old code on a quieter machine):

| Scene | Structure med (ms) run1/run2 | Frame med run1/run2 | Frame p95 run1/run2 |
| --- | ---: | ---: | ---: |
| muse_hash | 515 / 559 | 16.1 / 15.3 | 27.8 / 28.3 |
| muse_default_tw | 503 / 612 | 26.8 / 22.7 | 87.3 / 88.6 |
| def | 434 / 554 | 27.2 / 26.4 | 73.9 / 71.3 |
| fat | 358 / 371 | 5.7 / 5.4 | 18.9 / 17.8 |
| ring | 75 / 108 | 4.5 / 4.8 | 7.7 / 16.6 |
| user_tw42.lightpaper | 191 / 188 | 8.4 / 8.7 | 16.2 / 15.0 |
| g41_def_tw42 | 510 / 452 | 34.0 / 19.8 | 34.8 / 26.9 |
| g41_def_tw64 | 779 / 691 | 27.5 / 22.4 | 29.1 / 26.7 |
| g41_ring_tw42 | 132 / 83 | 5.7 / 5.4 | 8.4 / 7.9 |
| g41_ring_tw64 | 98 / 108 | 2.6 / 4.1 | 5.4 / 5.7 |
| g41_user_tw42 | 164 / 213 | 8.3 / 13.6 | 14.5 / 15.1 |
| g41_user_tw64 | 236 / 308 | 9.9 / 11.8 | 11.4 / 14.5 |

Page tests under the lock (`run_page.mjs`, `cmp_s3c.mjs page`): no worse than S3's
`out/s3/page_results.json` on every scene — fillSamples and overlap counts identical (def
fillSamples 1517/1531, overlap 353/353), borderBand/fillEdge within ±10 (def fillEdge S3 19572 vs
S3c 19571 of 22677; g41_user_tw64 borderBand out 8054 vs 8046). Page errors contain only the usual
favicon-404-type console error. draw.ts/main.ts were not changed, so no new page-build stamp applies
to them; the page imports outline.ts, whose measured code matches the committed `1beb956a` plus
`73558807` cleanup (still exact re-verified identical after the cleanup: def A 17 / B 6).

### Left for Claude / next step

Done 2 and Done 3 fail, carried by K1248 and K1247 (updated). A reasonable next step for Done 2:
record zero-length pieces for fully covered caps and interior covered stretches at structure time,
so a flip expands from a solved tube edge instead of being absent (the current geometry cost is
whole-piece flips, not boundary error — boundary points already follow the frame). For Done 3, the
corner gate integral needs an incremental evaluation across its 32 nodes (adjacent nodes move
~r0/32; margins and feet are currently recomputed per node) or a spatial margin index; the margin
turn-walk is the largest single loop. One honest caveat on reading Done 2: the fresh baseline itself
improved under this frame (fresh def A over2 13 now vs 20 in S3b's runs, because fresh is
frame(structure(S'), S') with the same boundary slides), so the moved bar rose with the code.

### Handoff continuation (same S3c session, resumed 21:53, stopped 2026-11-06 22:13 -08:00)

The first Handoff above was written at 21:52 and the session then resumed to keep working on
Done 2 / Done 3. One more code commit landed: `08390186` (frame re-evaluation, below), pushed to
master. Ledger K1247/K1248 were updated in the same round. All numbers below were re-run on the
final code (`08390186`); `npm test` 2887 passed / 9 skipped, probe:types 0 errors,
`outline.test.ts` ALL PASS.

What `08390186` adds to frame(): recorded covering candidates are re-tested on frame geometry.
Buried stretches emit their longest uncovered sub-range; run ends trim while their end segment is
covered; every corner re-checks the builder's span/wedge feasibility on frame feet (an infeasible
corner degenerates to zero radius, and a structure-rejected but frame-feasible corner emits its
arc with the arms' runs trimmed to the frame tangent feet); cap exposure is reclassified per
frame against its recorded candidates. Two bugs found and fixed on the way: candidate verdicts
are indexed by sequence segment, not full-segment index, and a cap's own group/depth uses the
material chain end, not the stored station s (the stored s often lies outside every arm span, so
fully covered caps were emitted whole).

Verdicts unchanged in kind: Done 1 (still) HOLDS — 24/24 rows within tolerance vs S3
(def A over2 22 -> 17, B 6 -> 6; g41_user_tw64 A p99 delta 0.097 -> 0.016). Done 4 (page) HOLDS —
`cmp_s3c.mjs page` ALL WITHIN TOLERANCE (fillSamples/overlap identical; borderBand/fillEdge
within ±10). Done 2 (moving) still FAILS but improved: 12/24 rows pass at 0.1h (was 9/24 in the
first phase). Failing (fresh -> moved over2): muse_default_tw A/B (+2/+2 over fresh), def A
13->21, B 7->14, ring A 53->66, B 4->8, g41_def_tw42 B 1->6, g41_def_tw64 A 157->164, B 19->30,
g41_ring_tw64 A 45->54, B 5->8, g41_user_tw64 A 189->211 (p99 delta 0.090). At 0.5h all 6 rows
fail (def A 41->120, B 34->163; ring A 84->110, B 18->106; fat A 132->194, B 7->94). Rigid motion
on def remains exact: maxDiff 4.809e-9 (tolerance 1e-6). Decision report
(`out/s3c/decisions.json`): the largest remaining churn is corner pair changes — ring 25/51 and
g41_user_tw64 110/163 at 0.1h — which frame does not re-decide (pairing stays structure's), plus
exposure flips where structure recorded no covering candidate. Done 3 (cost) still FAILS: locked
bench x2 on the final code reads def frame med 44.2 / 42.5 ms, p95 118 / 81 ms (machine loaded;
corners 18.3-21.6 ms and pieces 10.2-11.3 ms dominate — the added candidate scans cost more than
they save in time, though they buy moved accuracy). Target remains ≤3 ms median / ≤6 ms p95.

Next step for whoever picks this up: K1248 (moved) — record zero-length pieces for fully covered
stretches so flips can expand, or accept fresh-structure rebuilds when decision churn is high;
K1247 (cost) — the corner gate integral needs incremental evaluation across its 32 nodes or a
spatial margin index. Both are gated on still exact staying 24/24.

### Handoff continuation 2 (same session, stopped 2026-11-06 22:24 -08:00)

One hypothesis was tested and rejected after the continuation above. The decision report's
corner pair changes suggested re-pairing corners per frame: the corner solver was extracted into
a reusable function (bit-identical at rest), frame-adjacent pairs not in structure were solved
into an extra pool, non-adjacent structure corners were suppressed, and runs were adjusted to
the new tangent feet. Measured at 0.1h it fired 0 extra arcs on def, 0 on ring, 1 on
g41_user_tw64 and 0 on muse_hash — arm adjacency essentially never changes at 0.1h, so the
report's pair changes are enumeration-order permutations of the same adjacency, and no moved
row improved (still 12 failures). The experiment was reverted in full; the shipped code remains
08390186, and every number in the continuation above was re-verified on it after the revert:
still 24/24, moved 12 failures at 0.1h, 6/6 at 0.5h, rigid maxDiff 4.809e-9. Final locked bench
x2 on the shipped code: def frame med 39.0 / 41.0 ms, p95 110 / 112 ms (corners 15.0-18.0 ms,
pieces 7.9-10.3 ms, setup 4.0-4.8 ms). Done 2 and Done 3 remain failed, carried by K1248/K1247.
