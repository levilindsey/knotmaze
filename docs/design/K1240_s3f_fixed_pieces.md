# K1240 S3f: the piece list is the diagram's; frame() moves only its points

Ledger: K1240 (and K1248, moving frames). One Muse run, started through Paseo from this committed
brief, which is the authority. Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1240-s1`
(reused, detached at this brief's commit, `node_modules` junctioned; never `npm ci`). Ports 5980-5989. Cap 2 h.

## Why

S3e (`4fd41c3c..72a27c50`; its Handoff and Claude's check are in `K1240_s3e_moving_frame.md`) made
structure() the diagram. It deep-equals under motion, and every junction lists its arms in cyclic
order. frame() rebuilds everything from positions, so a moved frame equals a fresh build exactly, and
a rigid motion of def holds to 4.8e-9. Three things still fail.
- **The piece list follows positions.** frame() splits each border at per-frame feature points
  (stations, folds, coverage changes), and caps follow coverage. Between S and S' the piece keys
  differ on 10 of 12 scenes at 0.1h. At 0.5h def goes from 4373 to 4330 pieces, ring from 923 to 854
  and fat from 3436 to 2828 (`proto/s3e_claude_pieces.ts`). S3e's Goal 2 ruled this out: "Nothing in
  frame() adds, removes or reorders a piece."
- **Collapsed pieces jump.** About 30% of pieces are one point or zero length (def: 1293 of 4373),
  parked on "the nearest exposed outline". In the 20-step sweep a piece moves up to 15.4 world units
  in one step on def (median of the per-step maxima 2.4), while no particle moves more than 0.009.
  The same points cost the gates: still is 19/24 (5 A rows), moved is 10/24 at 0.1h and 4/6 at 0.5h.
- **Cost.** def's frame takes 348 ms median (crossings, eyes and exposure 287 ms), against S3d's
  12.4 ms and K1247's 3 ms target.

## Goal

Levi's rule, all of it: "The structure is defined once: which pieces exist, which crossing cuts which
border, which corner joins which arms, and sharp or round. Only positions follow the frame." And:
"There's nothing to flip."

1. **structure() emits the piece list from the diagram alone,** in drawing order:
   - each chain side's runs, delimited by that chain's diagram features: the crossings where it passes
     under (cut by the over chain's two borders), its junction arms, its open ends;
   - one arc per corner (S3e's diagram pairing, minor sweep through π);
   - one cap per open end;
   - the regions and faces, if the table keeps them.
   The number, kinds, keys and order of pieces never change after structure().
2. **frame() computes points only.**
   - Borders, cut points (segment intersection near each crossing), corner solves (form B's r,
     collapsing onto V at r = 0) and cap arcs all come from this frame's positions.
   - A run's points are its border between its two end features. When the ends pass each other (an
     eye narrower than the tube, an arm shorter than its corners), the run is zero-length where they
     met and moves with that place. It is never parked on another surface.
   - A fold (the offset turns tighter than h) is trimmed inside its run, which stays one piece.
   - No pass decides, point by point, whether a border is covered.
3. **Where the diagram alone loses to form B,** record the scene, the place and a picture in the
   Handoff. Fix it in frame() with local, continuous geometry, never with a decision or with a piece
   that comes and goes.

The technique is yours. S3e's builder is reference, not a constraint.

## Done

Baselines (read-only, in the worktree; copies under `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1240\`
`s3d_out\` and `s3e_out\`): `out/s3/exact_*.json`, `out/s3/page_results.json` and
`out/s3d/fresh{0.1,0.5}_exact_*.json`. Tolerances are those of `cmp_s3d.mjs`: p99 within 0.01, and
over2 within max(1, 2%).

1. **Fixed pieces.** A test, built from `s3e_claude_pieces.ts` with order added, shows that
   frame(structure(S), S) and frame(structure(S), S') have identical piece keys in identical order. It
   covers 0.1h on all 12 scenes and 0.5h on def, ring and fat. structure(S) deep-equals structure(S'),
   as in S3e.
2. **Still.**
   - All 24 rows within tolerance of `out/s3/exact_*`.
   - S2's synthetic tests pass. Change a test only where it counts pieces the old way, and say so.
   - A rigid motion of def is exact within 1e-6.
3. **Moved.** Within tolerance of S3d's fresh rows at 0.1h (12 scenes) and 0.5h (def, ring, fat).
4. **Page tests** score no worse than `out/s3/page_results.json`.
5. **Reported, not gated.**
   - def's frame median, p95 and phases: at least 100 frames, under the lock, run twice.
   - The 20-step sweep (`s3e_sweep.ts`'s measure): per step, the largest piece motion against the
     largest particle motion, and where each happens.
   - Degenerate pieces (one point or zero length) per scene.
6. **A Handoff** appended to this brief: the numbers, what failed, the commands, and the start and
   stop times from `Get-Date`. Claude re-runs every check: report a failure as a failure (S3e's
   Handoff passed its Done 1 while frame() changed the piece list).

## How to work

- **The stop rule.**
  - Stop at the 2 h cap. Stop earlier only when every Done holds.
  - A Done that looks out of reach is not a stop. Spend the remaining time on the next most
    promising attempt, and report what each attempt measured.
  - Every stage from S2 to S3e stopped early with a Done failing. S3e stopped at 96 of 120 minutes.
- Re-run every reported number on the final code, after the last edit.
- Outputs go to `.claude/probes/K1240/out/s3f/`. Write new scripts rather than editing the S3e ones.
- Commit finished, tested parts, then push to master yourself.
  - The sequence: `git fetch`, rebase on origin/master, `npm test` green, then push `HEAD:master`.
  - Stage files by name; scripts under `.claude/` need `git add -f`.
  - Never force-push, skip hooks, or add `out/`.
- Write `outline.ts` through Node or the editor, never through PowerShell text IO.
- Browser and timing jobs run under the perf lock, `$env:TEMP\claude-perf.lock`, as owner `K1240-S3f`.
  - Wait for the lock inside one blocking command.
  - Use at most two headed, real-time browsers.
  - Kill every browser, server and runner of yours before you stop, then release the lock.
- **Ledger.** Leave K1240, K1247 and K1248 to Claude. File new items only with
  `node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs add --repo . ...`.
- No subagents.
- Run `Get-Date` at the start and at each milestone.
- When you stop: commit WIP, append the Handoff, push, and report.
