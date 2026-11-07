# K1240 S3b: a frame step that is cheap and follows the frame

Ledger: K1240. Claude sent this run: one Muse run, started through Paseo from this committed brief,
which is the authority. Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1240-s1`
(reused, detached at this brief's commit, `node_modules` junctioned; never `npm ci`). Ports 5980-5989.
Cap 2 h.

## Why S3b

S3 (`1d366de6..246c572d`, Handoff in `docs/design/K1240_s3_outline_per_frame.md`) split the builder
into `structure()` and `frame()`. Claude re-ran its checks:
- **Still scenes are fine.** On all 12 scenes, `frame(structure(S), S)` gives S2's pieces, with ends
  within 4e-9. The page tests equal S2's, and the exact check equals S2's on 22 of 24 rows.
- **Too slow.** def's `frame` takes 26.9 ms median and 59.5 ms p95, against 3 ms. The time is spread
  out: corners 8.9 ms, offsets 7.4, regions 4.3, setup 4.0. Every call allocates objects for about
  77k border points, 3,053 pieces and 1,531 regions.
- **It doesn't follow the frame.** The structure stores segment indices: one segment pair per cut and
  an exposure flag per segment. When the threads move past them, `frame` falls back to the stored t
  or the recorded corner. Nudged 0.1h, the outline drifts from form B:
  - ring: ours->B p99 goes from 0.000 to 0.495 px;
  - def: B->ours max goes from 4.4 to 11.6 px, and the count over 1/2 px from 6 to 147.

## Goal

Rewrite `frame()`, and what `structure()` stores, so that every position comes from the frame being
drawn.
- **The structure names features, not segments:**
  - which borders a crossing cuts, and by which border;
  - the arms each corner joins, and sharp or round;
  - which pieces are buried, and by which feature;
  - each feature's s window on its chains, wide enough for the motion.
- **`frame()` solves each feature inside its window, from that frame's centrelines.**
  - Use a closed form or a bounded solve. Form B's tracked corner growth is allowed, since it is form
    B's own definition, but take its step and r0 from this frame's angle.
  - Never fall back to a position recorded by `structure()`.
  - A cut that stops intersecting gives a piece of zero length, never a missing piece, so pieces stay
    continuous.
- **Typed buffers.** Emit pieces and regions as views over shared typed buffers, and allocate nothing
  per frame that grows with the scene. Update `draw.ts` and the checks to read them.

## Done

1. **Still scenes.** On all 12 scenes, the exact check (`s3_exact.ts`) is no worse than S3's on every
   scene and direction: p99 within 0.01 px, and the count over 1/2 px within 2%. S3's results are in
   `out/s3/exact_summary.md`, copied to the main checkout's `.claude/probes/K1240/s3_out/`. S2's
   synthetic tests pass.
2. **Moving frames.** Use S3's smooth field, with the same code and seeds: 0.1h on all 12 scenes, and
   0.5h on def, ring and fat.
   - Run the exact check of `frame(structure(S), S')` against form B on S'. It must be no worse than
     a fresh `frame(structure(S'), S')`, within the tolerances in item 1.
   - Rigid motion: translate def by (0.37h, -0.21h) and rotate it 7 degrees. `frame(structure(S), S')`
     must give the same pieces as `frame(structure(S), S)`, moved the same way, within 1e-6.
3. **Cheap.** Under the lock, def's `frame` median is at most 3 ms and its p95 at most 6 ms. Report
   every scene's median and p95, `structure`'s time, and def's per-phase profile.
4. **Page tests.** They score no worse than S3's `out/s3/page_results.json`.
5. **A Handoff** appended to this brief: the numbers, what failed, the commands, and the real start
   and stop times from `Get-Date`.

## How to work

- **The stop rule.** Stop at the 2 h cap, or earlier only when every Done item holds. While an item
  fails, keep working on it. S2 and S3 both stopped about an hour early with Done failing, and those
  hours were lost.
- Commit finished, tested parts and push them to master yourself: `git fetch`, rebase on
  origin/master, get `npm test` green, then push `HEAD:master`.
  - Stage files by name.
  - Never force-push, skip hooks, or add anything under `out/`.
  - Outputs go to `.claude/probes/K1240/out/s3b/`.
- Write `outline.ts` through Node or the editor, never through PowerShell text IO.
- Browser and timing jobs run under the perf lock: `$env:TEMP\claude-perf.lock`, owner `K1240-S3b`.
  - Wait for the lock inside one blocking command.
  - Use at most two headed, real-time browsers.
  - Before you stop, kill every browser, dev server and runner of yours, and release the lock.
- File ledger follow-ups with `node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs add --repo . ...`.
  Leave K1240's handle alone; Claude keeps it.
- No subagents.
- Run `Get-Date` at the start and at each milestone. When you stop, commit your WIP, append the
  Handoff, push, and report.
