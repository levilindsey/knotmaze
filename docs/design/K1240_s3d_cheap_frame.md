# K1240 S3d: frame() decides nothing and is cheap

Ledger: K1240 (and K1247, the cost). Claude sent this run: one Muse run, started through Paseo from
this committed brief, which is the authority. Work only in
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1240-s1` (reused, detached at this brief's
commit, `node_modules` junctioned; never `npm ci`). Ports 5980-5989. Cap 2 h.

## Why S3d

S3c (`1beb956a..7d992764`; Handoff and Claude's check in `docs/design/K1240_s3c_decide_once.md`):
- **What holds.** Still scenes are 24/24 against S3, the page tests are within 0.1 points of S3's,
  and a rigid motion is exact (4.8e-9).
- **Decisions came back into frame().** Its first part (`1beb956a`, `73558807`) made frame() decide
  nothing. `08390186` then re-tests covered stretches, run-end trims, corner feasibility and cap
  exposure every frame. Levi's rule: "The structure is defined once: which pieces exist, which
  crossing cuts which border, which corner joins which arms, and sharp or round. Only positions
  follow the frame."
- **Cost.** def's frame median is 31 ms and its p95 76-79 ms under the lock (target 3 and 6).
  Phases: corners 16-17 ms, pieces 9.4 (the per-frame re-tests), setup 4, offsets 3.6, cuts 1.6,
  regions 1.4.
- S3b and S3c both left def at about 30-45 ms a frame. Both Handoffs named the corner fix:
  evaluate the gate integral incrementally across its 32 nodes, or index the margin search
  spatially. S3c added bounding-box pruning to the foot search, and corners still take 16-17 ms.

## Goal

This stage is about cost only.
1. **Restore `73558807`'s frame():** drop the per-frame re-tests that `08390186` and `fca93b74`
   added, and keep any of their fixes to structure(). At `73558807` the still check was 24/24 and
   the 0.1h check failed 15 rows. Then record the reference from this code: frame()'s whole output
   (every piece, point and radius) for all 12 scenes, still and moved 0.1h (S3's smooth field,
   same seeds).
2. **Make frame() cheap without changing its output.** On every later version, every piece, point
   and radius equals the reference within 1e-6. The gate integral stays form B's corner definition,
   but you may evaluate it faster.

Moving-frame accuracy (K1248) belongs to the next stage. Report it here, and don't work on it.

## Done

1. **Same output:**
   - the reference check holds on the final code;
   - the still exact check is 24/24 against `out/s3/`, with S3c's tolerances (`cmp_s3c.mjs exact`);
   - S2's synthetic tests pass;
   - a rigid motion of def is exact within 1e-6.
2. **Cheap.** Under the lock, def's frame median is at most 3 ms and its p95 at most 6 ms, taken
   from at least 100 timed frames after a warm-up. (S3c's "p95" was the slowest of 15 frames.) Run
   the bench twice and report, for both runs, every scene's median and p95, structure()'s time, and
   def's per-phase profile.
3. **Page tests** score no worse than S3's `out/s3/page_results.json`.
4. **Reported, not gated:** on the final code, the moved checks against fresh (0.1h on all 12
   scenes; 0.5h on def, ring and fat) and the decision counts.
5. **A Handoff** appended to this brief: the numbers, what failed, the commands, and the start and
   stop times, each from `Get-Date` at that moment.

## How to work

- **The stop rule.** Stop at the 2 h cap, or earlier only when every Done item holds. While an item
  fails, keep working on it. S2 through S3c each stopped 35 to 60 minutes early with Done failing,
  and S3c stopped four times.
- Re-run every number you report on the final code, after the last edit.
- Commit finished, tested parts and push them to master yourself: `git fetch`, rebase on
  origin/master, get `npm test` green, then push `HEAD:master`.
  - Stage files by name.
  - Never force-push, skip hooks, or add anything under `out/`.
  - Outputs go to `.claude/probes/K1240/out/s3d/`.
- Write `outline.ts` through Node or the editor, never through PowerShell text IO.
- Browser and timing jobs run under the perf lock: `$env:TEMP\claude-perf.lock`, owner `K1240-S3d`.
  - Wait for the lock inside one blocking command.
  - Use at most two headed, real-time browsers.
  - Before you stop, kill every browser, dev server and runner of yours, and release the lock.
- File ledger follow-ups with `node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs add --repo . ...`.
  Leave K1240's handle alone; Claude keeps it. Close K1247 with the commit that meets Done 2, and
  leave K1248 open.
- No subagents.
- Run `Get-Date` at the start and at each milestone. When you stop, commit your WIP, append the
  Handoff, push, and report.
