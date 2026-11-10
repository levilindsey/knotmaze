# K1247: frame() in 3 ms

Ledger: K1247 (K1240's cost stage). One Muse run, started by Claude through Paseo from this committed
brief, which is the authority. Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1240-s1`
(reused, detached at this brief's commit, `node_modules` junctioned; never `npm ci`). Cap 2 h.

## Why

S3f (`K1240_s3f_fixed_pieces.md`, last commit 7e54021f) fixed the structure: structure() is the
diagram, and frame() computes points only. frame() is still the whole builder re-run,
`buildOutlineFull(scene, st, profile).table` (`proto/outline.ts`, about line 2747). def takes 322-325 ms
a frame against a target of ≤3 ms median and ≤6 ms p95: the outline has to fit beside physics and
paint in a 16.7 ms frame, and the Pixel is several times slower than the desktop. Handoff 3's phases on
def, in ms: setupBorders 20-22, corners 25-27, cutsEyesExposure 280-306, regions 26-29,
piecesCapsEtc 14. Levi's decision on the junction lanes waits on this number.

## Goal

frame(st, scene) returns today's table, fast. The technique is yours.

- Whatever depends only on the structure and the look is computed once per structure and cached:
  indices, which segments to test near each crossing, search windows, array layouts. S3d's
  getRuntime did this.
- Per frame: no string keys or Maps, no object per point, no all-pairs loops, no grid rebuilt from
  scratch. Places in cutsEyesExposure that do so today: `stationByKey` (about line 1163), the segment
  pairs near each crossing (1222-1280), refs found by a hypot scan of a border's points (1553), and
  the centreline grid for burial tests (1561).
- Searches may start from the previous frame's answers. The output may depend on that history only
  within the tolerance below.
- S3d's runtime frame (`frameRt` and its helpers, about line 2751 to the end of the file) is unused.
  Reuse its parts (typed arrays, `footNearM` and `footWinFast` warm starts, `evalCut`), then delete
  what nothing calls.
- The table may change shape, for example arrays reused across frames, if every reader (the check
  scripts, `draw.ts`, `main.ts`) goes through one accessor.
- One implementation at the end: frame() is the fast one. Keep today's builder only as `frameRef`,
  the oracle for the checks below. The next stage (S3f's round 4) edits the fast frame and retires
  `frameRef`.

## Done

1. **Baseline, before any edit.** Save today's rows and tables under `.claude/probes/K1240/out/k1247/base/`:
   24 still rows (12 scenes, looks A and B), the consistent S' at 0.1h (12 scenes) and at 0.5h (def,
   ring, fat). `s3f_exact.ts --consistent` makes the rows.
2. **Same output.**
   - Every row within the checks' tolerance of the baseline: p99 within 0.01, over2 within
     max(1, 2%). `cmp_consistent.mjs` compares two row sets.
   - Identical piece keys, kinds and order in every case.
   - Reported: the largest point distance from the baseline tables per scene, cold (new cache) and
     warm (after a frame at another position).
3. **Unchanged.** structure(S) deep-equals structure(S') in the 15 cases. `outline.test.ts` passes.
   A rigid motion of def is exact within 1e-6.
4. **Speed, the gate.** def: median ≤3 ms and p95 ≤6 ms.
   - Time frames in motion: cycle def through the 20 sweep steps from S to the 0.5h S' and back
     (`s3f_sweep.ts` makes them). `s3f_bench.ts` repeats one scene, which a warm start would flatter.
   - At least 100 timed frames after warm-up, under the lock, two runs, with def's phases.
   - Also reported: ring and fat, structure() plus the first cold frame, and the repeated-scene
     number.
5. **A Handoff** appended to this brief: the numbers, what is left and where the time goes, the
   commands, and start and stop times from `Get-Date`. Claude re-runs every check: report a failure
   as a failure.

## How to work

- **The stop rule.** Stop at the 2 h cap. Stop earlier only when every Done holds. A Done that looks
  out of reach is not a stop: spend the time left on the next most promising cut, and report what
  each measured.
- Work one hot spot at a time: change, check Done 2 on a few scenes, commit, profile again.
- Re-run every reported number on the final code, after the last edit.
- Outputs go to `.claude/probes/K1240/out/k1247/`. Name new scripts `k1247_*`; copy an S3f script
  rather than edit it. Make `--consistent` the default in your copies.
- Commit finished, tested parts, then push to master yourself.
  - The sequence: `git fetch`, rebase on origin/master, `npm test` green, then push `HEAD:master`.
  - Stage files by name; scripts under `.claude/` need `git add -f`.
  - Never force-push, skip hooks, or add `out/`.
- Write `outline.ts` through Node or the editor, never through PowerShell text IO.
- Timing runs under the perf lock, `$env:TEMP\claude-perf.lock`, as owner `K1247`
  (`run_locked_s3f.ps1` with the owner renamed). Wait for the lock inside one blocking command, and
  release it before you stop.
- **Ledger.** Leave K1240 and K1247 to Claude. File new items only with
  `node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs add --repo . ...`.
- No subagents. Run `Get-Date` at the start and at each milestone.
- When you stop: commit WIP, append the Handoff, push, and report.
