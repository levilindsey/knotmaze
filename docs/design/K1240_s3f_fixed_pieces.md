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

## Handoff (Claude, in place of Muse, 2026-11-07)

A Claude Opus agent ran the rest of this stage after Muse's quota ran out. The coordinator was claude
session 09c7a672-a414-402a-97da-b3176839a2e5. The agent worked on `wip/k1240-s3f` in
`.claude/worktrees/muse-k1240-s1` and pushed nothing; the coordinator rebases, tests and pushes.

- **Times.** Started 08:28:07 and stopped 10:07 (PDT).
- **Why it stopped early.** No stop line had tripped: the cap was 10:28, and weekly usage read 94%
  against a line of 96%. This was a judgment call.
  - The last attempt (`logs_nost5`, 09:58) changed nothing.
  - Keeping any change means re-measuring every reported number under the lock. That takes about 17
    minutes, 12 of them for the two bench runs, and with this handoff it would not have fit before
    10:28.
- **The final code** is `c646c5f6`; its `outline.ts` is the one measured.
  - Page and bench ran from 09:39 to 09:52, after its commit (09:37) and before the reverted attempts
    nost4 and nost5.
  - The Node checks ran at 09:53, and again at the stop on the clean tree. The two outputs are
    identical apart from timings (`out/s3f/checks_final.txt`, `checks_stop.txt`).

### Dones

1. **Fixed piece keys and order: holds.**
   - Ordered piece keys are identical between S and S' at 0.1h on all 12 scenes, and at 0.5h on def,
     ring and fat.
   - structure(S) deep-equals structure(S'), and every junction is cyclic.
2. **Still: fails** on 4 of the 24 rows. All four are A rows over the over2 tolerance. Every p99 is
   0.000, and every B row is within tolerance. The numbers are over2 now (baseline):

   | Row | over2 now (baseline) |
   |---|---|
   | muse_default_tw A | 15 (12) |
   | user_tw42.lightpaper A | 23 (13) |
   | g41_ring_tw42 A | 9 (4) |
   | g41_user_tw42 A | 23 (12) |

   S2's synthetic tests pass. A rigid motion of def is exact to 4.809e-9 (the tolerance is 1e-6).
3. **Moved: fails.**
   - At 0.1h, 6 of 24 rows fail, all of them A rows:

     | Row | over2 now (baseline) |
     |---|---|
     | muse_default_tw A | 20 (5) |
     | def A | 16 (13) |
     | user_tw42.lightpaper A | 25 (6) |
     | g41_ring_tw42 A | 6 (3) |
     | g41_user_tw42 A | 24 (5) |
     | g41_user_tw64 A | 214 (189) |

   - At 0.5h, 5 of 6 rows fail (def B holds):

     | Row | p99 now (baseline) | over2 now (baseline) |
     |---|---|---|
     | def A | | 54 (41) |
     | ring A | 4.242 (0.005) | 258 (84) |
     | ring B | | 27 (18) |
     | fat A | 8.217 (0.000) | 1327 (129) |
     | fat B | | 71 (6) |

4. **Page tests: hold.**
   - `cmp_s3f.mjs page` reports ALL WITHIN TOLERANCE.
   - The run logged one console error: a 404 whose URL the log does not name. S3's baseline run
     (`out/s3/page_results.json`) logged the same one.
5. **Reported.**
   - **def's frame**, under the lock, timed over 120 frames after 10 warm-ups:

     | Run | Median | p95 | structure() |
     |---|---|---|---|
     | 1 | 323.1 ms | 448.6 ms | 5.9 ms |
     | 2 | 320.1 ms | 436.1 ms | 3.6 ms |

   - **def's phases**:

     | Phase | Run 1 | Run 2 |
     |---|---|---|
     | setupBorders | 21.5 ms | 20.8 ms |
     | corners | 25.4 ms | 25.0 ms |
     | cutsEyesExposure | 289.3 ms | 273.5 ms |
     | regions | 25.0 ms | 25.7 ms |
     | piecesCapsEtc | 14.1 ms | 13.8 ms |

     Every scene's rows are in `out/s3f/bench_final{1,2}.log` and `.json`.
   - **The 20-step sweep.** The largest piece motion was 74 (def), 108 (ring) and 152 (fat) times the
     largest particle motion. All pieces matched at every step:

     | Scene | Piece max | Where | Piece median | Particle max |
     |---|---|---|---|---|
     | def | 0.665 | step 20, run ch62 side1 | 0.267 | 0.0090 |
     | ring | 1.068 | step 20, run ch1 side1 | 0.273 | 0.0099 |
     | fat | 1.356 | step 20, run ch2 side1 | 0.069 | 0.0089 |

   - **Degenerate pieces**, S / S':

     | Scene | 0.1h | 0.5h |
     |---|---|---|
     | muse_hash | 202 / 197 | |
     | muse_default_tw | 44 / 47 | |
     | def | 61 / 65 | 61 / 87 |
     | fat | 0 / 0 | 0 / 0 |
     | ring | 11 / 13 | 11 / 24 |
     | user_tw42.lightpaper | 23 / 22 | |
     | g41_def_tw42 | 7 / 7 | |
     | g41_def_tw64 | 129 / 121 | |
     | g41_ring_tw42 | 1 / 1 | |
     | g41_ring_tw64 | 14 / 15 | |
     | g41_user_tw42 | 23 / 22 | |
     | g41_user_tw64 | 58 / 64 | |

6. **This handoff: done.**

### Goal 3: where our outline drew what form B does not

1. **Runs at crossings** (`e4a4fe08`). A run is now cut at each crossing, with its entry and exit
   ordered along the chain, and caps are whole.
2. **def's failing corners** (`4215336e`, `17725e0c`).
   - Runs now end where the two borders cross.
   - Where the tubes are layered, the meet cuts only the lower border.
   - Crops: `out/s3f/pics4`, `picsB1`.
3. **ring's tight twist** (`d77a79c5`). A tight twist was missing its crossing cut. A synthesized
   candidate (twistFlip) now ends the run where the under border comes on top. Crops: `picsR2` before,
   `picsR3` after.
4. **fat's x0 seam** (`94d011dc`).
   - A closed border's last segment runs from s near len back to s0. A plain lerp gave a point on it
     a wrong s, which ordered the crossing's entry after its exit.
   - `lerpS` now interpolates across the seam.
   - At 0.1h this fixed fat A (over2 30) and fat B (76). Still-frame failures went from 7 to 4, and
     moved-0.1h failures from 9 to 6.
   - Crop: `picsF1`.
5. **Open: junction stubs.** These are user_tw42.lightpaper j28, j29, j32 and j61, and ring j4, j5, j7
   and j16. Crops: `picsU1`, `picsR1`.
   - Our run starts at the arm's root, inside the union, where form B draws no border.
   - `K1240_CDBG=<junction,...>` shows each failing corner's meet (`c646c5f6`). In j29 and j61 the meet
     lies past the upper arm's cap: at 1.83h along an arm whose cap is at 1.49h (j29), and at 1.30h
     against 1.02h (j61).
     - There the upper chain reads free (-1) and the lower one reads as the junction's member, so the
       corner counts as layered and only the lower border is cut.
     - j28 and j32 have no meet at all.
   - **Tried and reverted.** These are over2 at the still frame, from each log's `cmp_exact.log`. A row
     passes at its baseline plus max(1, 2%): user_tw42 A at 14, user_tw42 B at 8, def B at 7 and
     muse_hash B at 96.

     | Log | Change | user_tw42 A | user_tw42 B | def B | muse_hash B |
     |---|---|---|---|---|---|
     | baseline (`out/s3`) | | 13 | 7 | 6 | 95 |
     | final (`c646c5f6`) | | 23 | 3 | 5 | 90 |
     | `logs_nost1` | Union whenever one arm reads free at the meet | 13 | 56 | 80 | 336 |
     | `logs_nost2` | nost1, only for meets under 0.5h past the cap | 17 | 21 | 41 | 100 |
     | `logs_nost3` | Every layered upper arm's fallback point at its cap | 19 | 369 | 763 | 1525 |
     | `logs_nost4` | Union only when the free arm is the upper one | 17 | 28 | 35 | 188 |
     | `logs_nost5` | nost3, only for a free upper arm (`out/s3f/nost5_capstart.diff`) | 23 | 3 | 5 | 90 |

   - **Why nost5 did nothing (inferred, not checked).** The stub arms get no point on either side, so
     the arm-station loop returns before making their junction station (`if (!nextPt && !prevPt)
     return;`), and they never reach mkFallback.
   - **Lead.** By form B's membership, the upper border's visible start is the nearer of its cap and
     the meet. The fix probably gives a stationless arm its station at that point. A corner-wide union
     rule is wrong: form B draws the layered border at most such corners.
6. **A correction to `c646c5f6`'s message.** It says the first union variant took user_tw42 A from 23
   to 17. It took it to 13, a pass (`logs_nost1`); 17 is the narrowed variant's number (`logs_nost2`).

### Left in the code

- **Debug toggles** in `outline.ts`. Each reads an environment variable and does nothing without it:

  | Variable | What it does |
  |---|---|
  | `K1240_NOMEET` | Turns the failing-corner meet off |
  | `K1240_XDBG=<crossing,...>` | Lists crossing cut candidates |
  | `K1240_CDBG=<junction,...>` | Lists failing-corner meets |

- **Two decisions frame() makes from the frame's positions:**
  - A failing corner's union-or-layered choice comes from z and member group at the meet.
  - The tight-twist flip (twistFlip) walks the frame.

  Both may belong in structure() under Levi's rule.

### Next

1. Give the stub arms their station at the nearer of the cap and the meet, as in the lead above.
2. Find why ring and fat fail at 0.5h (A p99 4.24 and 8.22).
3. Look at the small still-frame A regressions in muse_default_tw and g41_ring_tw42, which were not
   examined.

### Commands

- **Node checks:** `pwsh -NoProfile -File .claude/probes/K1240/proto/s3f_claude_checks.ps1 -Tag final`
  - It runs tests, structure, pieces, rigid, exact, exact_m01, exact_m05 and the sweep.
  - Logs go to `out/s3f/logs_<Tag>/`. The summary is its stdout, saved as `out/s3f/checks_final.txt`.
  - `-Skip sweep,move,rigid` runs the quick subset in about 75 s; the full run takes about 100 s.
- **Page tests:** `& .claude\probes\K1240\proto\run_locked_s3f.ps1 -ScriptName run_page.mjs`, then
  `node .claude/probes/K1240/proto/cmp_s3f.mjs page`.
- **Bench:** `& .claude\probes\K1240\proto\run_locked_s3f.ps1 -Script s3f_bench.ts -RunArgs @('bench_final1')`.
  Each run takes about 6 minutes.
- **Diagnosis.** Each script runs as `node scripts/run_node.mjs .claude/probes/K1240/proto/<script>`:

  | Script | What it shows |
  |---|---|
  | `s3f_claude_dbg.ts <scene>` | A spots by category and cluster. Its crossing-position column is broken ("@Infinity"). |
  | `s3f_claude_diag.ts <scene> [regex]` | frame()'s diagnostics, with the toggles above |
  | `s3f_claude_pics.ts` | Crops of the worst A spots: env `AT="x,y;..."`, args scene, tag, cropH and skip |
  | `s3f_claude_bpieces.ts [scene] x,y ...` | Form B's pieces and ink at a point |
  | `s3f_claude_run.ts <scene> <ids>` | One run piece, its stations and its points |

## Handoff 2 (Claude, second run, 2026-11-07)

- **Run:** started 10:17:45, stopped at 12:02, before the 12:17:45 cap. Re-running every number
  takes about 17 minutes (Node checks 2, page 2.5, two benches 12), so the last code change had to
  land by about 11:45. Usage of the week was 95% at 11:28 and 95% at the stop.
- **Where:** `wip/k1240-s3f` in `.claude/worktrees/muse-k1240-s1`, on base 5276cc0a. This run's
  commits are 17245115, a03d2f61, 99b83db1, 028f32dd and this handoff's.
- **Evidence:** every number below is on 028f32dd: `out/s3f/checks_final4.txt` (logs in
  `logs_final4/`), `cmp_page_final4.txt`, `bench_final4{a,b}.json` and `sweep.json`.

### Dones

1. **Fixed piece keys and order: holds.**
   - Ordered piece keys are identical between S and S' at 0.1h on all 12 scenes, and at 0.5h on def,
     ring and fat.
   - structure(S) deep-equals structure(S'), and every junction is cyclic.
   - frame() no longer chooses anything (a03d2f61, below).
2. **Still: fails** on 3 of the 24 rows (the first run: 4). Every p99 is within 0.01.

   | Row | over2 now | First run | Baseline |
   |---|---|---|---|
   | def B | 11 | holds | 6 |
   | g41_ring_tw42 A | 9 | 9 | 4 |
   | g41_user_tw42 A | 14 | 23 | 12 |

   muse_default_tw A (15 in the first run) and user_tw42.lightpaper A (23) now hold. S2's synthetic
   tests pass. A rigid motion of def is exact to 4.809e-9 (the tolerance is 1e-6).
3. **Moved: fails.**
   - At 0.1h, 7 of 24 rows fail (the first run: 6):

     | Row | over2 now | First run | Baseline |
     |---|---|---|---|
     | muse_default_tw A | 11 | 20 | 5 |
     | muse_default_tw B | 25 | holds | 21 |
     | def A | holds | 16 | 13 |
     | def B | 14 | holds | 7 |
     | user_tw42.lightpaper A | 19 | 25 | 6 |
     | g41_ring_tw42 A | 6 | 6 | 3 |
     | g41_user_tw42 A | 18 | 24 | 5 |
     | g41_user_tw64 A | 193 | 214 | 189 |

   - At 0.5h, all 6 rows fail (the first run: 5):

     | Row | over2 now | First run | Baseline | p99 now (first run; baseline) |
     |---|---|---|---|---|
     | def A | 45 | 54 | 41 | |
     | def B | 43 | holds | 34 | |
     | ring A | 253 | 258 | 84 | 3.865 (4.242; 0.005) |
     | ring B | 51 | 27 | 18 | 0.118 (within; 0.105) |
     | fat A | 1585 | 1327 | 129 | 8.591 (8.217; 0.000) |
     | fat B | 161 | 71 | 6 | |

   - The fat rows and 8 of ring B's 24 extra came with the nearest approach that replaced the twist
     walk (a03d2f61). def B and the other 16 of ring B's came with the cap stations (99b83db1).
4. **Page tests: hold.** `cmp_s3f.mjs page` reports ALL WITHIN TOLERANCE. The one console 404 is
   S3's baseline's too.
5. **Reported.**
   - **Frame time** under the lock: 120 timed frames per scene, two runs (`bench_final4a` /
     `bench_final4b`). def's median is where the first run's was (323.1 / 320.1 ms).

     | Scene | Median (ms) | p95 (ms) | structure() (ms) |
     |---|---|---|---|
     | muse_hash | 484.0 / 482.6 | 660.6 / 641.4 | 3.7 / 2.9 |
     | muse_default_tw | 299.5 / 301.4 | 428.6 / 432.0 | 3.3 / 4.3 |
     | def | 321.5 / 329.7 | 453.5 / 456.0 | 3.6 / 4.3 |
     | fat | 255.6 / 238.4 | 327.4 / 316.4 | 0.9 / 0.6 |
     | ring | 57.5 / 57.8 | 128.1 / 124.2 | 0.5 / 0.6 |
     | user_tw42.lightpaper | 117.9 / 116.8 | 179.8 / 175.9 | 1.7 / 1.2 |
     | g41_def_tw42 | 274.8 / 281.0 | 385.2 / 378.1 | 4.5 / 4.6 |
     | g41_def_tw64 | 390.8 / 393.6 | 523.6 / 528.1 | 3.8 / 4.1 |
     | g41_ring_tw42 | 47.0 / 45.6 | 87.0 / 82.6 | 0.4 / 0.6 |
     | g41_ring_tw64 | 62.6 / 62.6 | 110.7 / 108.5 | 0.5 / 0.4 |
     | g41_user_tw42 | 116.7 / 116.4 | 177.8 / 173.4 | 1.2 / 1.1 |
     | g41_user_tw64 | 178.4 / 178.1 | 258.3 / 257.7 | 1.3 / 1.4 |

   - **def's phases**, run a / run b:

     | Phase | Time (ms) |
     |---|---|
     | setupBorders | 21.5 / 20.3 |
     | corners | 24.9 / 24.8 |
     | cutsEyesExposure | 277.4 / 283.3 |
     | regions | 25.3 / 25.1 |
     | piecesCapsEtc | 13.0 / 13.4 |

   - **The 20-step sweep.** All pieces matched at every step. The largest piece motion fell to 25
     (def), 75 (ring) and 112 (fat) times the largest particle motion (the first run: 74, 108 and
     152):

     | Scene | Piece max | Where | Piece median | Particle max |
     |---|---|---|---|---|
     | def | 0.221 | step 19, run ch82 side1 | 0.143 | 0.0090 |
     | ring | 0.745 | step 3, arc ch1 side0 corner26 | 0.142 | 0.0099 |
     | fat | 0.998 | step 20, run ch2 side1 | 0.070 | 0.0089 |

   - **Degenerate pieces**, S / S'. muse_hash's were 202 / 197 in the first run.

     | Scene | 0.1h | 0.5h |
     |---|---|---|
     | muse_hash | 199 / 194 | |
     | muse_default_tw | 44 / 47 | |
     | def | 61 / 65 | 61 / 87 |
     | fat | 0 / 0 | 0 / 0 |
     | ring | 11 / 13 | 11 / 24 |
     | user_tw42.lightpaper | 23 / 22 | |
     | g41_def_tw42 | 7 / 7 | |
     | g41_def_tw64 | 129 / 121 | |
     | g41_ring_tw42 | 1 / 1 | |
     | g41_ring_tw64 | 14 / 15 | |
     | g41_user_tw42 | 23 / 22 | |
     | g41_user_tw64 | 58 / 64 | |

6. **A Handoff:** this one.

### What each commit did

- **17245115: continuous corner stations.**
  - A failing corner ("V outside spans", "arm span 0") with a meet puts each facing border's station
    a fraction w of the way from the meet to the root.
  - w = clamp((z_self - z_other) / zt, 0, 1) at the meet, with zt = 0.1 depthAmp, form B's depth
    scale. w = 0 is the union's corner, and w = 1 runs the layered border on to the root.
  - Nothing chooses between union and layered.
- **a03d2f61: nothing left to choose or flip.**
  - Gone:
    - the diagram's armLayer and armFirstX;
    - cornerFallback's union-or-layered decision (cutA, cutB, applyMeet);
    - the twist walk (twistFlip);
    - the env switches K1240_LEGACY, K1240_RULE, K1240_CV, K1240_OLDTWIST and K1240_CDBG.
  - K1240_NOMEET and K1240_XDBG remain.
  - A tight twist's missing cut is the under border's nearest approach to the over tube's far
    border, within the crossing's window (segSegClosest over the same segments). Once the two
    borders touch, it is the crossing itself.
  - Against the walk at 0.5h, the nearest approach costs: fat B 71 -> 161, fat A 1327 -> 1585,
    ring B 27 -> 35 and def A 59 -> 62.
- **99b83db1: the upper border stops at the nearer cap.**
  - Form B hides a border where both arms are full members of the junction's group.
  - So the station sits at max(1 - w, rCap) of the meet's distance.
  - rCap = min over the two arms of cap / d_meet, with cap = min(L, Lcut - h/2), the cap ramp's
    midpoint.
  - Still frames went from 5 failing rows to 3. At 0.5h, def A went 62 -> 45, but def B (which had
    held) went to 43, and ring B went 35 -> 51.
- **028f32dd:** comments and one unused constant (ztB) only. The Node checks' summary is identical
  to 99b83db1's.

### Tried and reverted

- **The stubs (goal 2).** Both tries made things worse:
  - The root tangent points as stations at no-meet corners: user_tw42 A 22 -> 39, g41_ring_tw42 A
    9 -> 31.
  - A station at the cap (d = L) for an arm without one, the brief's lead: still A 40, B 7 -> 60.
- **What the crop shows** (`out/s3f/capw5/g41_user_tw42_A0.png`, j28 and j32):
  - The stub arm (a87, a99) has no extent.
  - The neighbour arm's facing border (a85, and a97's side) hangs from the outline's notch, into the
    union's fill, down to its root.
  - Form B's corner joins that neighbour to the arm past the stub.
  - So the fix looks structural: a corner that steps over the stub arm, decided once in the diagram,
    or a station where the facing border meets the next arm's border.
- **Other cap rules:**
  - capw (each arm's own L, multiplied) fixed the A rows but made B much worse.
  - capw2, capw3 and capw4 each scored worse than 99b83db1 on the Node checks.
  - capw4, where each arm is limited by the other arm's extent past its root, is kept as
    `proto/s3f_capw4.patch`.

### Corrections to the first Handoff

- These items under its "Left in the code" are gone (a03d2f61):
  - K1240_CDBG;
  - the two frame-time decisions;
  - K1240_LEGACY, K1240_RULE, K1240_CV and K1240_OLDTWIST.
- `-Skip` needs the `-Command` form:
  `pwsh -NoProfile -Command "& .claude/probes/K1240/proto/s3f_claude_checks.ps1 -Tag <t> -Skip sweep"`.
  Under `-File`, the list arrives as one string.

### Next

1. **The stub corners** (user_tw42.lightpaper j28, j29, j32 and j61; ring j4, j5, j7 and j16). Give
   the diagram a corner that steps over a stub arm: stations at the roots and at the caps both made
   things worse.
2. **The twist's nearest approach.** Limit it, for instance to the span before the pair's next
   crossing, to win back fat and ring at 0.5h without restoring the walk.
3. **The still rows left:** def B 11 (since the cap stations), g41_ring_tw42 A 9 and g41_user_tw42
   A 14.
4. **ring and fat at 0.5h** (A p99 3.9 and 8.6). This run did not reach them, and the cause is still
   unknown.

### Commands

As in the first Handoff, with the `-Command` form for `-Skip`. The final run is tag `final4`.

## Handoff 3 (Claude, third run, 2026-11-07)

- **Run:** started 12:09:52. Measuring stopped at 13:00 for the coordinator's wrap-up, and this
  handoff was committed at 13:06 (the 2 h cap was 14:09:52). outline.ts last changed at 12:32
  (d1d4f6d3), and the re-run of every number below ran from about 12:41 to 12:58. Usage of the
  week read 96% at 12:21 (the coordinator's reading; 96% no longer stops this run) and 96% at
  12:59.
- **Where:** `wip/k1240-s3f` in `.claude/worktrees/muse-k1240-s1`, on base 3f0a9f03 (Handoff 2,
  merged). This run's commits are 7fcc9b39, f5a24dd8, 30d81dad (reverted by d1d4f6d3), d1d4f6d3,
  908fc373 and this handoff's. outline.ts is 7fcc9b39's.
- **Evidence:** every number below is on that outline.ts: `out/s3f/checks_final6.txt` (logs in
  `logs_final6/`), `cmp_page_final6.txt`, `bench_final6{a,b}.json` and `sweep.json`. The runs on a
  consistent S' (below) are `out/s3f/move{0.1,0.5}c_exact_*.json` and `fresh0.5c_exact_*.json`,
  and S3d's code on the same scenes is `out/s3f/s3dfresh{0,0.1c,0.5c}_exact_*.json` (`0` is the
  still S).

### Dones

1. **Fixed piece keys and order: holds.**
   - Ordered piece keys are identical between S and S' at 0.1h on all 12 scenes, and at 0.5h on def,
     ring and fat.
   - structure(S) deep-equals structure(S'), every junction is cyclic, and none lists its arms
     against the ccw order (reversed=0).
2. **Still: fails** on 2 of the 24 rows (Handoff 2: 3). Every p99 is within 0.01.

   | Row | over2 now | Handoff 2 | Baseline |
   |---|---|---|---|
   | def B | 11 | 11 | 6 |
   | g41_ring_tw42 A | 6 | 9 | 4 |

   g41_user_tw42 A (14 in Handoff 2) holds at 8 against 12. S2's synthetic tests pass after one
   fixture change outside the brief's allowance (f5a24dd8, below). A rigid motion of def is exact to
   4.809e-9 (the tolerance is 1e-6).
3. **Moved: fails** against S3d's baselines, which were made on a stale S' (the next section).
   - At 0.1h, 6 of 24 rows fail (Handoff 2: 7). g41_user_tw64 A (193) holds at 184 against 189.

     | Row | over2 now | Handoff 2 | Baseline |
     |---|---|---|---|
     | muse_default_tw A | 11 | 11 | 5 |
     | muse_default_tw B | 25 | 25 | 21 |
     | def B | 14 | 14 | 7 |
     | user_tw42.lightpaper A | 13 | 19 | 6 |
     | g41_ring_tw42 A | 6 | 6 | 3 |
     | g41_user_tw42 A | 12 | 18 | 5 |

   - At 0.5h, all 6 rows fail, as in Handoff 2: def A 45 and B 43, ring A 253 (p99 3.865) and B 51,
     fat A 1585 (p99 8.591) and B 161.
   - On a consistent S', against S3d's code run there, 1 of the 6 rows fails at 0.5h (def B, 9
     against 6) and 6 of the 24 at 0.1h: the next section.
4. **Page tests: hold.** `cmp_s3f.mjs page` reports ALL WITHIN TOLERANCE. The one console 404 is
   S3's baseline's too.
5. **Reported.**
   - **Frame time** under the lock: 120 timed frames per scene, two runs (`bench_final6a` /
     `bench_final6b`). def's median is where Handoff 2's was (321.5 / 329.7 ms).

     | Scene | Median (ms) | p95 (ms) | structure() (ms) |
     |---|---|---|---|
     | muse_hash | 487.0 / 510.0 | 632.6 / 661.0 | 3.0 / 3.0 |
     | muse_default_tw | 299.8 / 304.1 | 427.9 / 428.4 | 3.6 / 3.4 |
     | def | 321.9 / 325.0 | 467.4 / 454.5 | 4.7 / 3.6 |
     | fat | 234.4 / 234.7 | 304.4 / 321.1 | 0.5 / 0.7 |
     | ring | 58.9 / 58.6 | 126.5 / 131.4 | 0.6 / 0.6 |
     | user_tw42.lightpaper | 117.7 / 115.0 | 177.9 / 216.5 | 1.6 / 1.2 |
     | g41_def_tw42 | 281.2 / 275.0 | 404.5 / 404.4 | 3.7 / 3.3 |
     | g41_def_tw64 | 396.2 / 393.5 | 517.3 / 534.1 | 4.2 / 3.9 |
     | g41_ring_tw42 | 46.8 / 45.3 | 85.3 / 85.2 | 0.4 / 0.6 |
     | g41_ring_tw64 | 63.5 / 62.8 | 112.1 / 110.6 | 0.5 / 0.5 |
     | g41_user_tw42 | 116.6 / 116.9 | 193.1 / 173.8 | 1.1 / 1.2 |
     | g41_user_tw64 | 178.0 / 181.4 | 254.2 / 261.3 | 1.0 / 1.1 |

   - **def's phases**, run a / run b:

     | Phase | Time (ms) |
     |---|---|
     | setupBorders | 21.8 / 20.2 |
     | corners | 26.7 / 25.1 |
     | cutsEyesExposure | 306.4 / 279.9 |
     | regions | 29.0 / 25.9 |
     | piecesCapsEtc | 14.1 / 13.6 |

   - **The 20-step sweep.** All pieces matched at every step. The largest piece motion is 25 (def),
     69 (ring; Handoff 2: 75) and 112 (fat) times the largest particle motion:

     | Scene | Piece max | Where | Piece median | Particle max |
     |---|---|---|---|---|
     | def | 0.221 | step 19, run ch82 side1 | 0.143 | 0.0090 |
     | ring | 0.688 | step 20, run ch3 side-1 | 0.142 | 0.0099 |
     | fat | 0.998 | step 20, run ch2 side1 | 0.070 | 0.0089 |

   - **Degenerate pieces**, S / S': every count is Handoff 2's.
6. **A Handoff:** this one.

### Why the moved check fails at 0.5h: its S' keeps the old s

- `perturb` (s3f_exact.ts) moves every chain point by a smooth field of amplitude mult x h, but
  it keeps every crossing's, arm's and dead end's s. frame() places a crossing at pointAt(chain, s)
  on each pass, so on S' the two passes of one crossing land apart. The gap between them, over h
  (`s3f_claude_drift.ts`):

  | Scene (crossings) | S: p50 / max | 0.1h: p50 / max | 0.5h: p50 / p90 / max | Over 1h at 0.5h |
  |---|---|---|---|---|
  | def (353) | 0.071 / 0.240 | 0.132 / 0.548 | 0.510 / 1.540 / 2.913 | 70 |
  | ring (87) | 0.045 / 0.391 | 0.273 / 0.579 | 1.364 / 2.499 / 3.143 | 61 |
  | fat (428) | 0.074 / 0.272 | 0.384 / 0.901 | 2.042 / 3.324 / 5.211 | 327 |

- The app never builds such a scene: physics re-projects every crossing onto the two threads'
  intersection each substep. On the captured S the two passes sit p50 0.045-0.074h apart, at most
  0.391h (the S column).
- `--consistent` (908fc373) builds the S' the app would give. Each s is remapped to the same
  segment and fraction of the moved chain, and each junction centre moves with the field.
- `s3f_exact_s3dbase.ts` runs S3d's code (5290da82) through the same harness. On the stale S' it
  reproduces S3d's baseline exactly (def at 0.5h: A 41, B 34, the same p99s).
- Over2 at 0.5h, A / B. Every p99 on the consistent S' is within 0.01 of S3d's there.

  | Scene | Ours, consistent S' | S3d, consistent S' | Ours, stale S' | S3d, stale S' (the baseline) |
  |---|---|---|---|---|
  | def | 10 / 9 | 13 / 6 | 45 / 43 | 41 / 34 |
  | ring | 34 / 2 | 40 / 3 | 253 / 51 | 84 / 18 |
  | fat | 0 / 0 | 1 / 5 | 1585 / 161 | 129 / 6 |

- Against S3d's code on the same scenes, the rows that fail:

  | Scenes | Failing | Rows: ours against S3d's over2 |
  |---|---|---|
  | Still, S | 5 of 24 | muse_default_tw A 8 / 5, def B 11 / 6, user_tw42.lightpaper A 8 / 5, g41_ring_tw42 A 6 / 3, g41_user_tw42 A 8 / 5 |
  | Consistent S', 0.1h | 6 of 24 | the same five (11 / 4, 12 / 8, 9 / 6, 6 / 3, 8 / 5) and muse_default_tw B 25 / 20 |
  | Consistent S', 0.5h | 1 of 6 | def B 9 / 6 |

- So on a consistent S' the moved check measures what the still check does: our corners against
  S3d's. The moved frame equals the fresh build row for row there (`move0.5c` against
  `fresh0.5c`), as it should with structure the diagram.
- The brief's still baseline, S3's code, is looser than S3d's code on three A rows:
  muse_default_tw 12 (S3d 5), user_tw42.lightpaper 13 (5) and g41_user_tw42 12 (5). Ours holds
  them at 8 against S3's numbers and is 3 over S3d's.

### What each commit did

- **7fcc9b39: a corner faces its arms' diagram sides.**
  - A corner joins two arms that are adjacent in the junction's ccw listing, A then B. It now joins
    A's border on side A.dir and B's on side -B.dir, fixed by the diagram. Before, the sign of a
    cross product of the frame's arm directions picked the sides: a choice that followed the frame.
  - A corner that sweeps more than pi from A to B (reflex) takes cornerFallback, why "reflex".
  - Still: g41_user_tw42 A 14 -> 8 (holds), g41_ring_tw42 A 9 -> 6. At 0.1h: user_tw42.lightpaper
    A 19 -> 13, g41_user_tw42 A 18 -> 12, g41_user_tw64 A 193 -> 184 (holds). The ring's largest
    sweep motion went 0.745 -> 0.688. No 0.5h row moved.
  - Goal 1 so far: g41_user_tw42, the scene of Handoff 2's stub crop (j28, j32), holds against
    the brief's baseline. The rest of the stub list is Next 4.
- **f5a24dd8: the T test lists its arms by ascending angle.**
  - The generator lists every junction's arms by ascending angle (reversed=0 on all 12 scenes).
    The T test's fixture listed pi, pi/2, 0, so both of its corners swept 3pi/2 and read reflex.
  - Listed 0, pi/2, pi, each corner sweeps pi/2 and takes the sides the old rule gave it. The
    assertions are unchanged.
  - **Beyond the brief's allowance**, which lets a test change only where it counts pieces the old
    way. It needs the coordinator's or Levi's OK.
- **30d81dad, reverted by d1d4f6d3: a window on the twist's nearest approach** (goal 2). See
  "Tried and reverted".
- **908fc373: the moved check's S', measured.** `s3f_exact.ts --consistent` and
  `s3f_claude_drift.ts` (above). The checks' default S' is unchanged, so every Done number above
  compares with Handoff 2's.
- **This handoff's commit** adds `s3f_exact_s3dbase.ts` (S3d's code through the same harness) and
  `cmp_consistent.mjs` (the comparisons of the last section).

### Tried and reverted

- **The twist window (30d81dad), `K1240_TWW`:**
  - `full` limits the nearest approach to the span between the pair's neighbouring crossings along
    each chain, `half` to half of it, and `cands` is half that also keeps the real cuts as
    candidates.
  - `full` equals no window exactly: it never binds.
  - `half` at 0.5h: fat A p99 8.59 -> 9.22 and ring A 3.87 -> 4.42 got worse; fat B 161 -> 132 and
    ring B 51 -> 46 got better.
  - `cands`: fat A p99 10.13, ring A 8.61, def A 45 -> 94 and fat B 58.
  - No variant moved a still or 0.1h row. The 0.5h excess is not the near miss: it is the stale s
    (above).

### Corrections to Handoff 2

- Its SHAs are the ones from before the merge. On master they are 94050aab (its 17245115),
  5df27158 (a03d2f61), 500f65f2 (99b83db1), 9a5c5330 (028f32dd) and the handoff 3f0a9f03.
- Its Next 4 ("ring and fat at 0.5h ... the cause is still unknown"): the cause is the check's
  stale s, not the frame.

### Next

1. **Decide the moved check's S'** (for the coordinator or Levi):
   - (a) Gate Done 3 on the consistent S', with S3d's code re-run there as the baseline
     (`s3dfresh{0.1,0.5}c_*`, made this run). Done 3 then fails 1 of 6 rows at 0.5h (def B 9
     against 6) and 6 of 24 at 0.1h, the rows where ours trails S3d's code on the still scenes
     too.
   - (b) Keep the stale S' and have frame() put each crossing at its two passes' intersection
     nearest the old s. Where two passes cross more than once near s (the tight twists), "nearest"
     is a choice that follows the frame.
   - And whether Done 2's baseline should be S3d's code (`s3dfresh0_*`) rather than S3's: 5 rows
     fail against it, 2 against S3's.
2. **def B, still 11 against 6.** At T junctions j3, j1 and j151 an open chain's end arm (v0)
   meets a through chain.
   - One corner of the end arm is sharp: r = 0, and V = ta = tb at the meet. Form B fills that
     crotch, and its worst pixels are there (10.2, 9.2 and 8.7 px; S3 had 4.4 px).
   - The arm's other corner is round (r 0.29, 0.22 and 0.17).
3. **g41_ring_tw42 A, still 6 against 4.** j12's corner a37-a38 sweeps 3.192 rad (183 degrees), so
   it takes the reflex fallback, and our ink pokes 3.45 px out at its ta (9.756, 1.016). A reflex
   corner wants a convex round join: an arc of radius h about the junction's centre.
4. **The stub corners not yet checked one by one:** ring j4, j5, j7 and j16, and
   user_tw42.lightpaper j29 and j61. They are candidates for the 3 A pixels by which
   muse_default_tw, user_tw42.lightpaper and g41_user_tw42 trail S3d's code.
5. **The 0.1h rows.** On the consistent S' they are the still rows against S3d's code, plus
   muse_default_tw B (25 against 20; 27 against 26 still). On the stale S' they add the stale s.

### Commands

As in the first and second Handoffs; the final run is tag `final6`. New this run, from the
checkout's root:
- The consistent S': `node scripts/run_node.mjs .claude/probes/K1240/proto/s3f_exact.ts --move=0.5
  [--fresh] --consistent def,ring,fat` writes `out/s3f/{move,fresh}0.5c_exact_*.json`. With
  `--move=0.1` and no scene list, it runs all 12.
- S3d's code: `s3f_exact_s3dbase.ts` with the same arguments writes `s3dfresh*` / `s3dmove*`;
  `--move=0 --fresh` is the still scenes. It imports `proto/outline_s3d.ts`, S3d's outline.ts,
  untracked; its header has the one-line Node command that recreates it from 5290da82.
- `node .claude/probes/K1240/proto/cmp_consistent.mjs <0.1|0.5> [aPrefix] [bPrefix]` compares two
  sets of exact rows by the checks' tolerance (default: `s3dfresh<m>c` against `move<m>c`). The
  still rows against S3d's code: `... cmp_consistent.mjs 0.1 out/s3f/s3dfresh0_ out/s3f/`.
- The pass gaps on S': `node scripts/run_node.mjs .claude/probes/K1240/proto/s3f_claude_drift.ts
  [scene,...]`.
- One junction's arms, corners and nearby crossings: `node scripts/run_node.mjs
  .claude/probes/K1240/proto/s3f_claude_j.ts <scene> <ji,...>`.

## The coordinator's decisions after Handoff 3 (2026-11-07)

Claude re-ran Handoff 3 on 7e54021f, its rebased tip. The check log matches `checks_final6.txt`
line for line, and the page tests are within tolerance. The consistent S' at 0.5h gives the table
above. S3d's code through the harness gives S3d's def baseline (A 41, B 34), and npm test passes.
These decisions settle Handoff 3's ledger items 1 and 4. The next run starts from them.

1. **The moved check uses the consistent S'** (Handoff 3's option a).
   - The app's physics re-projects every crossing each substep. So a stale S', whose passes land
     up to 5h apart, is a scene the outline never receives.
   - Option b would put a choice made from positions, the nearest intersection, back into frame().
   - The next run makes `--consistent` the default of `s3f_exact.ts` and of the checks script.
     It also drops the stale S'.
2. **One baseline: S3d's code through the same harness** (`s3f_exact_s3dbase.ts`).
   - It applies to the still rows and the moved ones alike. It is the best result measured, and it
     re-runs on any S'. The tolerances are unchanged.
   - Done 2 then fails 5 rows (over2, S3d → ours):
     - muse_default_tw A 5 → 8
     - def B 6 → 11
     - user_tw42.lightpaper A 5 → 8
     - g41_ring_tw42 A 3 → 6
     - g41_user_tw42 A 5 → 8
   - Done 3 fails 6 rows at 0.1h: muse_default_tw A 4 → 11 and B 20 → 25, def B 8 → 12,
     user_tw42.lightpaper A 6 → 9, g41_ring_tw42 A 3 → 6 and g41_user_tw42 A 5 → 8. At 0.5h it
     fails 1 row: def B 6 → 9.
   - The next run points `s3f_claude_checks.ps1` at these rows.
3. **f5a24dd8 stands.** Every real junction lists its arms counter-clockwise (reversed=0 in all 15
   cases), and the T fixture now does too. Its assertions are unchanged.
4. **The next run, in order:**
   1. def B's sharp end-arm corners: the T junctions j3, j1 and j151, where form B fills the
      crotch.
   2. g41_ring_tw42 j12's reflex corner: a convex round join of radius h about the junction's
      centre. Where a corner's sweep passes π, the round join and the fillet must meet
      continuously, with no jump.
   3. The unchecked stub corners: ring j4, j5, j7 and j16, and user_tw42.lightpaper j29 and j61.
   4. muse_default_tw at 0.1h.

   K1247, the cost stage, then starts from this frame().
