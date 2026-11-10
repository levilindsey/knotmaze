# K1247 stage 2: make the redesigned outline fast

Ledger: K1247 (K1240's frame cost). One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

K1240 is the redesign: one outline (offset-polyline borders, cuts, corner arcs) for both looks.
`structure()` decides the diagram once; `frame()` computes the points every frame. Stage 1 (Muse,
`docs/design/K1247_fast_frame.md`, last commit abb5891d) took def's frame from 322 ms to 38 ms
(Claude's re-run under the perf lock: 38.5 / 38.3 ms median, p95 46-49). The phases were:
- setupBorders 6.5 ms;
- corners 12 ms;
- cutsEyesExposure 17.5 ms.

The target is ≤3 ms median and ≤6 ms p95: the outline has to fit beside physics and paint in a 16.7 ms
frame, and the Pixel is several times slower than the desktop.

Levi, 2026-11-09, on falling back to the old GPU junction field: "I think that's probably a bad idea,
since you've wasted many weeks getting nowhere trying to get the outline, junction shapes, and fill
renderings (like with highlights) working correctly with our broken preexisting design. It seems like
we should be able to explore more ways to speed up the redesign." So this stage speeds up K1240's
outline itself. K1040's field and the old renderer are out of scope.

## Goal

`frame()` on def: ≤3 ms median and ≤6 ms p95 under the lock, with the same output.

The technique is yours. Explore. Measure each idea, keep what gains, and revert what doesn't. Some
starting points, none of them required:

1. **Decide more in `structure()`.** S3d's runtime frame took 12.4-13.2 ms because it decided more up
   front. Anything that depends only on the diagram moves into `structure()`, for example:
   - which segments can meet at each crossing;
   - which root a corner solve takes;
   - search windows;
   - index layouts.
2. **Warm starts with a proof.** A search may start from the previous frame's answer only when a cheap
   check proves it is the answer the cold search gives. Examples: a distance bound that rules out every
   other candidate, or a bracketed root. Handoff 2's bisect in the stage 1 brief says how each unproven
   warm start broke. Read it first.
3. **Recompute only what moved.** A piece whose inputs are bit-identical to the previous frame's is
   reused exactly. First measure how much of the knot moves per frame in the app (a drag, the load
   settle, agitation): the gate times the case where everything moves.
4. **Faster hot loops.** Typed arrays, fewer passes, and no per-frame allocation. WASM for the searches
   if JS is the limit.
5. **The physics worker (K7).** Running `frame()` beside the sim takes it off main's frame. It doesn't
   count toward the gate. Note what it would take.

## Same output (the checks)

All in `.claude/probes/K1240/proto/`:
- `k1247c_final.ps1` runs every non-timing check and logs to `out/k1247c_final/`. Read each log's last
  line, because `cmp_consistent.mjs` exits 0 even when it reports failures.
  - From your worktree, pass `-Base ../../../../muse-k1240-s1/.claude/probes/K1240/out/k1247/base`
    (the rows from before stage 1).
  - Before your first change, run `k1247c_dump.ts` once. It writes `out/k1247c_base/`, the baseline
    that `k1247c_faces.ts` reads.
- `k1247c_coldwarm.ts` checks that a frame's output never depends on earlier frames.
- `k1247c_time.ts` is the timing, run under the lock.

`structure()` may gain fields. It still depends on the diagram only (`k1247_structure.ts`).

## Done

Two timing runs of `k1247c_time.ts` under the lock, before and after, with def's phases. Every check
passes, and `npm test` is green. If 3 / 6 ms isn't reached by the cap, the fastest version that
passes every check is committed, with its numbers and what each route you tried gained.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- Perf lock: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what).
  - Take it for every timing and delete it when you're done.
  - While someone else holds it, wait inside one blocking command.
  - A lock older than 30 min is stale.
- Your files: `.claude/probes/K1240/proto/` (`outline.ts` and the checks). No `src/` changes. Commit
  WIP on your branch at each milestone, with `git add -f` for tools, never for outputs. Never push,
  never edit `LEDGER.md`, and never touch the main checkout.
- Stop when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Then commit WIP, append a handoff to this brief, and report. A compaction is not a
  stop: re-read this brief and `git log`.

## Report

Short and plain:
- def's median and p95, and its phases, before and after;
- each route you tried and what it gained;
- the checks' results;
- what's left;
- your last SHA.

End with `Ledger items` and K1247's handle fields (owner, branch, last commit, evidence, next).

## Handoff 1 (stage 2 agent, 2026-11-09 15:06 to 16:01)

Stopped before the cap with the gate not reached. Eight exact cuts took def from 37.5 to 20.7 ms. The
rest of the cost is the algorithm's call count, and exact micro-cuts are now worth about 0.1 ms each.
Branch `worktree-agent-a88fd0de163807829`, last commit `fd1573f8`.

### Numbers (locked `k1247c_time.ts`; `out/k1247c_time/time_s2*.json`)

| | before (s2before1, 86ca3a16) | after (s2after1 / s2after2, fd1573f8) |
|---|---|---|
| def median / p95 | 37.49 / 40.32 | 20.76 / 22.80, 20.60 / 22.43 |
| def setupBorders | 6.12 | 4.74, 4.71 |
| def corners | 11.16 | 8.44, 8.29 |
| def cutsEyesExposure | 16.81 | 4.51, 4.46 |
| def regions | 2.73 | 2.14, 2.03 |
| def piecesCapsEtc | 1.30 | 1.35, 1.30 |
| ring median / p95 | 9.52 / 10.47 | 4.66 / 5.43, 4.63 / 5.09 |
| fat median / p95 | 50.70 / 67.06 | 29.42 / 36.98, 30.49 / 38.39 |
| def (consistent) median / p95 | 47.02 / 63.37 | 28.47 / 30.53, 28.61 / 30.21 |

### Routes (route 4, faster hot loops; every cut bit-exact)

After each cut: verify 54/54 lines at 0.00e+0, coldwarm worst 0.00e+0. Each cut was A/B'd against
the previous commit, unlocked, by phase. Gains are on def.

| Cut | Commit | What | Gain |
|---|---|---|---|
| 1 | d74900fd | block-bbox prune in the crossing search, same visiting order (pads cover segInt's 1e-9) | cuts 9.1 |
| 2 | aff173f8 | segsNearC and the eye search without Sets or string-keyed grids | cuts 4.6 |
| 3 | fa4ebb2d | borderMeetC without closures, pruned by bbox | corners 2.7 |
| 4 | 3dacb8a0 | the junction fan skips its atan2 pair where the turn is clearly one step (KF_COS_FAN2) | median 0.6 |
| 5 | 953f8936 | extended chains filled without a concatenated point array (`fillPolyPP`) | setupBorders 0.26 |
| 6 | 76fd7888 | region rings without a per-region Int32Array slice or closures (`pushDedup`, `kfSegL`) | regions 0.5 |
| 7 | 96f1a63b | allocation-free extension feet (`footInWindowInto`); stations insertion-sorted per chain | setupBorders 0.25 |
| 8 | fd1573f8 | extension feet skip `Math.hypot` where the squared distance cannot win (1e-9 margin) | setupBorders 0.09 |

Tried and reverted as neutral (within the ±0.1 ms phase noise):
- a `scanRange` specialisation (`scanRangeF`);
- splitting `mergeBorders` and `frameFast` into smaller functions for the JIT;
- a `cornerNearThreadC` prune;
- `FFoot` objects created with double fields, to stop `footNearM`'s 3.5 MB per frame;
- `footNearM`'s closed-ring wrap as one add or subtract instead of a double modulo (corners -0.04).

### Where the 20.7 ms goes

- **Call counts per def frame:** footNearM 31.8k, marginOfC 16.7k, advanceToC 8.5k, scanRange 5.0k.
  - The corner integration runs about 32 Newton steps per corner over 386 corners, and each step
    re-foots both arms and re-walks both margins.
  - Hot lines (`k1247s2_lines.mjs`) are footNearM's segment loop, marginOfC's two walks, scanRange,
    doFull's segment loop, buildBorderC's writes (63k border points) and finishPoly (24k centreline
    points).
  - No single line is above 0.5 ms per frame.
- **Allocation:** about 25 MB per frame (26.9 MB before cut 5).
  - About 3.5 MB comes from footNearM's out objects. Double-field init did not remove it.
  - The rest is output arrays (pieces, regions, faces), which must be fresh.
- **JIT:** footNearM tiers Maglev to TurboFan with "Insufficient type feedback for generic named
  access" deopts. That is ordinary warm-up; it settles.

### Why 3 ms needs more than exact micro-cuts

Even making setupBorders, regions and pieces free leaves corners plus cuts at about 13 ms. Getting
corners near 1 ms needs one of these:
- (a) **Proven warm starts for the corner integration.** Start each corner's rho from the previous
  frame's, and accept only with a bracket check (Handoff 2 of `K1247_fast_frame.md` lists how the
  unproven ones broke).
- (b) **Fewer integration steps.** kfGN = 32 steps per corner. The tolerance allows that only if the
  rows checks still pass at 1e-9; it is not exact, so it needs Levi's word.
- (c) **Route 3, recompute only what moved.** This helps a drag, but not the gate's
  everything-moves case.
- (d) **WASM for footNearM, marginOfC and scanRange.** These are tight typed-array loops and should
  translate directly; 2-4x is plausible.

The cuts phase (4.5 ms) is now mostly doFull's segment pairs and the eye combos. A uniform grid over
border segments, built once per frame, would replace the per-pair block scan.

### Route 5 (physics worker, K7): what it would take

`frame()` would run in the module worker right after the sim step, on the same chain points:
- move `outline.ts` from the probe into `src/`;
- send `structure()`'s tables once per diagram;
- add the outline (pieces, regions, faces as flat typed arrays with offset tables) to the transferred
  snapshot layout in `src/physics/snapshot.ts`;
- have main's mirror draw from that.

It takes the 20 ms off main's frame but not off the worker's, so the worker's step plus outline
must still fit the frame allowance (it does not at 20 ms on the phone). It complements the gate
and does not replace it.

### Checks at fd1573f8

- `k1247c_final.ps1 -Base ../../../../muse-k1240-s1/...`: every step exits 0, and the last lines read:
  - verify: ALL KEYS AND FIELDS MATCH;
  - faces: no diffs;
  - coldwarm: COLD = WARM (worst 0.00e+0);
  - cmprows still / 0.1 / 0.5: ALL WITHIN TOLERANCE;
  - structure: STRUCTURE IS THE DIAGRAM;
  - pieces: ordered keys identical;
  - outline_test: ALL PASS.
- cmp_cold, warm and move show the same fast-versus-builder distances as before. The output is
  bit-identical to stage 1's, so these are unchanged.
- `npm test` is green: 220 files, 2887 tests.

### Tools (committed, `.claude/probes/K1240/proto/`)

- `k1247s2_prof.ts`: per-phase means over the time cycle. Set `K1247_AB=1` to time a scratch
  `outline_ab.ts` copy of another commit, and alternate the two for an A/B.
- `k1247s2_heap.ts`: allocation per frame, by function.
- `k1247s2_cpuagg.mjs`: self and total time per function from a `.cpuprofile`.
- `k1247s2_xf.mjs` plus `k1247s2_lines.mjs`: hot lines.
  - Profile with `node --cpu-prof --cpu-prof-interval 200 scripts/run_node.mjs
    .../k1247s2_prof.ts def`.
  - Then dump the Vite-transformed `outline.ts` (the profile's line numbers refer to it) and list
    the top lines with their text.
- `run_locked_k1247s2.ps1`: the perf-lock wrapper.

### Next

Start with (a): proven warm starts for the corner integration, the biggest phase. In parallel or
after, try (d), a WASM port of footNearM, marginOfC and scanRange behind the same checks. Then the
cuts phase's segment grid. Ask Levi whether (b), fewer steps within tolerance, is acceptable.
