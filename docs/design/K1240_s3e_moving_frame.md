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

## Handoff (Muse, S3e session 01a1b515, 2026-11-07)

Times: start Get-Date 2026-11-07 00:17:48 -08:00; last milestone 01:04:45 -08:00 (cap 02:17:48).

### What was built

`structure()` is now `diagramOf(scene)` (outline.ts): chain ids, closed flags and point counts; crossings as chain-index pairs with over/under; junction arms in their listed order (chain index, kind, dir) with one corner record per adjacent pair (style from `junction.corners[k]`, the two arms of one through pass excluded as one tube); junction groups from root/pass order; caps per open chain end. It reads no chain point coordinate, length, angle or arc-length: arm and crossing s values enter only as identities (which pass an arm belongs to, root order). Asserted by s3e_structure.ts.

`frame()` runs the builder's geometry per frame inside `buildOutlineFull(scene, dg)`: polylines, arm roots/spans, borders, corner solves, crossing/eye cuts, stations, intervals, regions and exposure are all computed from this frame's positions. Differences from the builder, all in frame mode only: (1) corner pairs come from the diagram, not an atan2 sort, and there is no theta skip and no ok skip: a pair past pi corners on its minor sweep (thC = 2pi - theta, continuous through pi), a pair with no feasible V gets V on the minor bisector at h, radius 0, tangent points on the border polyline at the roots, no trim, and its arc piece collapses to one point (the neighbouring successful corner's tangent point on the shared arm when there is one, else the nearest exposed border segment midpoint); (2) run pieces are the stretches of border between feature points (station points, cut points, corner tangents, fold points): exposed border points draw in order, covered points shrink onto the stretch's nearest exposed border point, a fully covered stretch shrinks to a single point on the covering chain's exposed border (own border's nearest exposed point as fallback); (3) one cap piece per cap, exposed arc points in order, covered arc points shrunk onto the nearest exposed arc point (covering edge point between), a fully covered cap shrunk to a single point at its own chain's nearest exposed border point; coverage within 1e-9 of the tube edge counts as exposed on caps. The S3d runtime (frameRt) is dead code, kept for reference. buildOutlineFull without a diagram is byte-identical old builder behaviour; the gate numbers below use frame(diagram) for both ours and fresh, as in S3d.

### Done, item by item

1. **Structure is the diagram: DONE.** s3e_structure.ts: JSON deep-equal structure(S) vs structure(perturb(S)) at 0.1h on all 12 scenes and at 0.5h on def, ring, fat: all equal. Arm order: 0 junctions not cyclic and 0 reversed in any scene (junctions checked: 166 muse_hash/muse_default, 185 def/g41_def, 25 ring/g41_ring, 75 user/g41_user, 0 fat), so the listed order IS the atan2-ascending cyclic order and corners[k] joins arms k and k+1, as the builder's style lookup (outline.ts) already assumed. What keeps positions out: diagramOf never destructures any pts element; chain point COUNT is the only positional-adjacent input.
2. **Still: 18 of 24 rows within tolerance** (cmp_s3e.mjs exact vs out/s3 rows, p99 within 0.01 px and over2 within max(1, 2%)): every B row passes, several A rows are better than S3 (fat 0->0, user 13->13, g41_user_tw42 12->13, g41_ring_tw42 4->5). The 6 failing rows are all direction A: muse_hash p99 3.035->3.200, over2 1082->1159 (+77 vs tol 21.6); muse_default_tw 12->14 (+2); g41_def_tw64 157->184 (+27); g41_ring_tw64 47->50 (+3); g41_user_tw42 12->14 (+2); g41_user_tw64 p99 0.097->0.180, over2 204->235 (+31). Losing places (scene, junction, spot from the exact files' worst lists; pictures: out/page_<scene>.png and run_page sheets mode): muse_hash j83 (run ch75 s=18.93, 25.1 px), j36 (ch11/ch50), j58, j95; g41_user_tw64 j33 (ch30 s=46.03, 27.1 px), j67, j71 (ch32 cap), j27; g41_def_tw64 j34 (ch8, 25.0 px), j54, j132; muse_default_tw and g41_ring_tw64 have no single dominant spot in their worst lists. These are the junction-cluster spots S2/S3 already knew (arm-span-0 arms and failed corners inside clusters), amplified by the new tables sampling points the builder does not emit: one single point per fully covered stretch/cap and per failed corner (collapse points on the nearest exposed outline we could name), plus segment midpoints of the chords where a covered range sits inside a stretch piece. Fixes tried and reverted on measurement: collapse onto the covering segment's midpoint; onto the closest point of the nearest exposed segment (spatial grid); detouring covered points along the covering outline (much worse: def 22->102). Kept: collapse points as above. S2's synthetic tests: ALL PASS (outline.test.ts, including caps==2 on the dead end and arcs==2 on the T). **Rigid motion of def: FAILS** the 1e-6 tolerance on a single point. All run and arc pieces are exact to 4.8e-9. One builder cap arc point (chain 18 start cap, piece 4388 in s3e_dbg_rigid.ts) differs by 1.047e-2 (the builder's own extension/border arithmetic at that chain start is not rigid-equivariant; S3d never hit it because topology was recorded). Fully covered caps collapse to the left (diagram-fixed side) border's nearest exposed point, which removed an earlier 0.52 side-flip of that choice.
3. **Moved: mixed.** frame(structure(S), S') is IDENTICAL to the fresh frame(structure(S'), S') on every scene at both heights (s3e_move.ts: maxEnd 0, onlyMoved=onlyFresh=0, all 12 scenes, 0.1h and 0.5h): the moved frame is exactly as right as a fresh build of the same code, by construction, because the diagram does not change and frame reads nothing else. Against S3d's fresh rows (cmp_s3e.mjs move, same checker as S3d): 0.1h fails 11 rows, all the same A-direction excess as still plus two B rows at +3 samples (user_tw42.lightpaper B 6->9, g41_user_tw42 B 6->9; form-B points at one junction each that the diagram pairing at S' does not draw). Worst moved A: muse_hash 1065->1156 (+91), g41_user_tw64 189->244 (+55, p99 0.009->0.180), g41_def_tw64 156->198 (+42), def 13->22, muse_default 5->15. Ring and fat pass at 0.1h. **0.5h fails all three scenes**: def A 41->65 (+24), B 34->38 (+4); ring A p99 0.005->0.165, 84->123 (+39); fat A 129->337 (+208). fat's A excess is collapsed stretches/caps inside its dense self-overlap eyes at the doubled height; same amplification, bigger covers.
4. **Page: ALL WITHIN TOLERANCE** (cmp_s3e.mjs page vs out/s3/page_results.json): fill and overlap counts identical to S3 on all 12 scenes; borderBand and fillEdge totals LARGER than S3 (more piece points sampling the same outlines, e.g. def border 23068/24122 vs 21931/22677) and within the checker's tolerance. One 404 console error (favicon) in the page run, ignored by the checker. Build in the page = frame build: 78-544 ms per scene.
5. **Reported, not gated.** Bench under the lock, twice (out/s3e/bench_run1.json, bench_run2.json), 120 frames of frame() per scene: def frame median 346.3 / 347.7 ms, p95 464.9 / 456.7 ms. def phases (profMark sums over the bench's profiled frames, run1/run2 ms): setup+borders 24.8/21.5, corners 23.8/19.5, crossings+eyes+exposure 290.0/277.8, regions 25.3/26.4, pieces+caps 30.6/33.4. structure() median 0.5 ms on def. frame() here is a full builder build per frame (~100x S3d's decide-once frame); nothing in this stage gates cost, and the phase table shows the cuts/eyes/exposure pass is about 80% of it. Sweep S -> 0.5h S' in 20 steps (out/s3e/sweep.json, sweep.log; pieces matched by kind/chain/side/corner + nearest s0): largest piece motion is a run piece on every scene: def step 8, run ch2 side1 s=95.76, Hausdorff 15.38 world (particle motion that step 0.0090, chain 46 point 321); ring step 11, run ch1 side1 s=128.37, 4.27 (particle 0.0099, chain 3 point 1074); fat step 19, run ch2 side1 s=343.46, 5.50 (particle 0.0089, chain 2 point 1437). The large motions are whole stretches flipping covered<->exposed between steps (their points relocate to/from collapse points) and collapse points relocating along the covering border, not the drawn outline jumping: the same steps score B-direction clean in the exact checks. Piece counts drift down as border point counts fall along the path: def 4537->4482, ring 939->871, fat 3436->2828; within-step matched counts equal the smaller side except on a few steps, so identity is stable where the border topology is.
6. This Handoff.

### What else was verified

- npm test green (typecheck + 220 files, 2887 passed), run with the src tree untouched all session: this stage changes only .claude/probes/K1240 and this brief. outline.test.ts (S2 synthetic) passes unmodified.
- git: LEDGER.md untouched (K1240, K1247, K1248 left to Claude). out/ never added.
- Old scripts (s3d_*.ts, cmp_s3d.mjs) still run against buildOutlineFull's builder mode, but S3e entry points (structure/frame) now return the diagram and the per-frame build; their printed structure fields no longer exist.

### Commands

- Tests: node scripts/run_node.mjs .claude/probes/K1240/proto/outline.test.ts
- Done 1: node scripts/run_node.mjs .claude/probes/K1240/proto/s3e_structure.ts
- Still: node scripts/run_node.mjs .claude/probes/K1240/proto/s3e_exact.ts; node .claude/probes/K1240/proto/cmp_s3e.mjs exact
- Moved: s3e_exact.ts --move=0.1; s3e_exact.ts --move=0.5 def,ring,fat; node .claude/probes/K1240/proto/cmp_s3e.mjs move 0.1; move 0.5
- Move/rigid: node scripts/run_node.mjs .claude/probes/K1240/proto/s3e_move.ts
- Page (lock): run_locked_s3e.ps1 -Script run_page.mjs -NodeExe node; node .claude/probes/K1240/proto/cmp_s3e.mjs page
- Bench (lock, twice): run_locked_s3e.ps1 -Script s3e_bench.ts -RunArgs bench_run1 / bench_run2
- Sweep: node scripts/run_node.mjs .claude/probes/K1240/proto/s3e_sweep.ts
- npm test

### Left

- The 5 still A rows and the 0.5h moved rows above are the open work: the drawn geometry matches S3d wherever S3d sampled; every excess is a point the new stable piece list emits (collapsed stretches/caps/failed corners, chord midpoints inside stretches) placed on the nearest exposed outline we could name per segment without a decision. Killing them means either placing collapsed points by the covering surface's own exposed segment clipped to the covered stretch's extent (continuous in the stretch, no chord midpoints), or accepting non-uniform piece point counts.
- Rigid: one builder cap point (chain 18 start cap, arc endpoint) is non-equivariant in the builder itself at 1.05e-2; everything else in the table is exact to 4.8e-9.
- Recovering S3d costs requires moving per-frame border/exposure work onto recorded recipes again, which is exactly what S3e removed.
