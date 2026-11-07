# K1240 S3e: the structure is the diagram; frame() follows positions

Ledger: K1240 (and K1248, moving frames). One Muse run, started through Paseo from this committed
brief, which is the authority. Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1240-s1`
(reused, detached at this brief's commit, `node_modules` junctioned; never `npm ci`). Ports 5980-5989. Cap 2 h.

## Why

S3d (`275263cd..a0cd0a26`, Handoff and Claude's check in `K1240_s3d_cheap_frame.md`) restored a frame()
that decides nothing: still 24/24, the reference within 3e-7, page tests level with S3's. Moving frames
fail. frame(structure(S), S') against a fresh build at S' (S' = S perturbed by mult·h, `s3d_move.ts`
`perturb`) is outside tolerance on 15 of 24 rows at 0.1h and 6 of 6 at 0.5h (def B over2 34 -> 194).
The cause: structure() is the S2 builder's output at S, so it holds geometric decisions that go stale.
- Per-point exposure and covering candidates (`BorderStruct.exposed`, `cover*`).
- Corner feasibility: `CornerStruct.ok` and `why`, from "no V", "V outside spans" and "V outside wedge".
- The corner list itself comes from an atan2 sort that drops any pair with θ >= π (`outline.ts:656`, `:788`).
- Discarded intervals, cap runs and transitions.

At 0.5h on def, 42 of 386 corners flip ok, 26 of 182 cap runs differ, and only 44 of 184 borders keep their runs.

Levi's rule: "The structure is defined once: which pieces exist, which crossing cuts which border,
which corner joins which arms, and sharp or round. Only positions follow the frame." And: "There's
nothing to flip." All four are facts of the diagram, not of where the threads are.

## Goal

1. **structure() reads the scene's diagram and style, never a position.**
   - Diagram: chains and `closed`, crossings and `over`, junction arms and corner styles.
   - A junction lists its arms in cyclic order, and `corners[k]` joins arms k and k+1; the builder's
     style lookup (`outline.ts:791`) relies on this. Check that it holds and report any junction where it doesn't.
   - Every adjacent arm pair gets a corner, whatever its θ.
   - Point counts are fine; lengths, angles and crossing `s` values are frame data.
2. **frame() computes all geometry from this frame's positions, continuously.**
   - Cuts come from segment intersection.
   - Every corner's arc follows form B with no ok test: r >= 0, and the arc collapses onto V at r = 0.
     A corner whose two borders don't meet (θ >= π, for example) still needs a continuous piece, and
     choosing it is this stage's design work.
   - Run ends slide, a covered piece shrinks to zero length, and caps come from this frame's geometry.
   - Nothing in frame() adds, removes or reorders a piece.
3. Where the diagram alone loses a still case, record the scene, the place and a picture in the
   Handoff, then fix it continuously in frame(), never with a decision. S3d's 1e-6 reference no
   longer gates: this stage changes the output by design.

## Done

Baselines (read-only, in the worktree; copies under `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1240\s3d_out\`):
- `.claude/probes/K1240/out/s3/exact_*.json` and `out/s3/page_results.json`;
- `out/s3d/fresh{0.1,0.5}_exact_*.json`.

Tolerances are those of `cmp_s3d.mjs`: p99 within 0.01, and over2 within max(1, 2%).

1. **Structure is the diagram.** A test asserts structure(S) deep-equals structure(S') at 0.1h on all
   12 scenes and at 0.5h on def, ring and fat. The Handoff says what keeps positions out of structure().
2. **Still.**
   - All 24 rows within tolerance of `out/s3/exact_*`, as `cmp_s3d.mjs exact` checked S3d.
   - S2's synthetic tests pass.
   - A rigid motion of def is exact within 1e-6.
3. **Moved.** frame(structure(S), S'), scored against form B at S', must be within tolerance of S3d's
   fresh rows at the same S'. That covers 0.1h on all 12 scenes and 0.5h on def, ring and fat: the
   moved frame looks as right as a fresh build.
4. **Page tests** score no worse than `out/s3/page_results.json`.
5. **Reported, not gated.**
   - def's frame median, p95 and phases: at least 100 frames, under the lock, run twice.
   - A 20-step sweep from S to the 0.5h S' on def, ring and fat. Per step, report the largest piece
     motion (the Hausdorff distance between that piece's polylines on consecutive steps) and the
     largest particle motion, and say where each happens.
6. **A Handoff** appended to this brief: the numbers, what failed, the commands, and the start and
   stop times from `Get-Date`.

## How to work

- **The stop rule.**
  - Stop at the 2 h cap. Stop earlier only when every Done holds.
  - A Done that looks out of reach is not a stop. Spend the remaining time on the next most
    promising attempt, and report what each attempt measured.
  - S2, S3b, S3c and S3d all stopped early with a Done failing. S3d stopped at 70 of its 120 minutes.
- Re-run every reported number on the final code, after the last edit.
- Outputs go to `.claude/probes/K1240/out/s3e/`. Write new scripts rather than editing the S3d ones,
  which write into `out/s3d/`.
- Commit finished, tested parts, then push to master yourself.
  - The sequence: `git fetch`, rebase on origin/master, `npm test` green, then push `HEAD:master`.
  - Stage files by name.
  - Never force-push, skip hooks, or add `out/`.
- Write `outline.ts` through Node or the editor, never through PowerShell text IO.
- Browser and timing jobs run under the perf lock, `$env:TEMP\claude-perf.lock`, as owner `K1240-S3e`.
  - Wait for the lock inside one blocking command.
  - Use at most two headed, real-time browsers.
  - Kill every browser, server and runner of yours before you stop, then release the lock.
- **Ledger.** Leave K1240, K1247 and K1248 to Claude. File new items only with
  `node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs add --repo . ...`.
- No subagents.
- Run `Get-Date` at the start and at each milestone.
- When you stop: commit WIP, append the Handoff, push, and report.
