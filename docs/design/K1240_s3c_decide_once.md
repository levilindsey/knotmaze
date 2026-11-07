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
