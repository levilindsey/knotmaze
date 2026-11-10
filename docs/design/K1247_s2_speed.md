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
