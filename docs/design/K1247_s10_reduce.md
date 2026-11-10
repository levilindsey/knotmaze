# K1247 stage 10: point reduction that holds, scored by what is drawn

Ledgers: K1247 (the frame's speed), K1240 (the redesign) and K1263 (stale baselines). One Claude Opus
agent in its own worktree, on its own branch. Cap 2 h.

## Why

The frame costs about 7.6 + 11.2 × (the fraction of chain points kept) ms on def (stage 8), so plain
reduction at eps 0.1 / 0.2 would take def's 18.8-21 ms frame to about 13.0 / 11.5 ms. It's blocked
on accuracy: `k1247s8_acc.ts` reads 25 failures at eps 0.1 and 28 at 0.2.

Stage 9 (`docs/design/K1247_s9_continuity.md`, its handoff) made the outline continuous in its
points, and found that `k1247s8_jitter`'s per-piece Hausdorff counts a split point sliding along an
unchanged curve as a move of both pieces. `k1247s9_union.ts` measures what is drawn instead.
`k1247s8_acc.ts` scores pieces with the same per-piece Hausdorff (its line 64), so some or most of
its failures may be the same overcount.

## Goal

Plain reduction at eps 0.1, then 0.2, passes on every scene, scored by what is drawn. Levi's rule
still binds: the structure is decided once, and only positions follow the frame. No piece that comes
and goes, and no decision made from positions. The technique is yours.

Known places (re-measure each first):
- fat cyc18's twist cut at crossing 310: two borders pass 0.0035 h apart, and whether they really
  cross switches a station on and shifts region ids (`k1247s9_regions.ts`);
- the end tails: muse_hash tail/23 at corner 121 (4.6 px at 0.01 px jitter), cyc10's tails 5 and 30,
  g41_def_tw64 tail/22/35;
- g41_user_tw64 at eps 0.2: 25.56 px, and piece 34's key changes;
- undiagnosed: muse_hash cyc10 run/54 (corner 255), def cyc18 arc/72 (corner 327).

## Done

0. **Baselines (K1263), on master's outline before any change.**
   - Re-make verify's tables (`k1247c_dump.ts <sub>`) and the row baselines (`k1247_exact.ts
     --out=<sub>`, at still, 0.1 and 0.5). `k1247c_final.ps1 -Base <yours>` then reads verify 0.
   - Make `k1247c_final.ps1` exit nonzero when any step fails. Until it does, read each step's log.
1. **The score.** `k1247s8_acc.ts` scores by the drawn union (keep the per-piece column beside it).
   At eps 0.02, 0.05, 0.1 and 0.2, list the failures per scene with their place, before any fix.
2. **The fixes.** At eps 0.1 and then 0.2: no key changes, and no drawn move over acc's bar (0.25 device px)
   on any scene, unless form B moves there too. List what's left, with its place and cause.
3. **The redesign holds:**
   - `s3f_claude_checks.ps1`: every row within tolerance of S3d's baseline.
   - K1247's checks against step 0's baselines: verify, coldwarm, `k1247s5_cmp` (no worse than
     44/8/0/0), `k1247s5_outside`, `k1257_sliver`.
   - `k1247s9_union.ts --d=0.001,0.01`, still and `--cyc`: no worse than stage 9 (def 0,
     muse_default_tw 0, muse_hash 1 drawn move over 0.25 px).
   - Every difference is a corner you changed on purpose: list them.
4. **Crops:** before and after at each place you change (`s3f_claude_pics.ts`, AT= or JIT=). Claude
   looks at them.
5. **The payoff, measured:** a locked `k1247s8_pair.mjs` pair through `k1247s8_run_locked.ps1`, master
   against yours, at eps 0 and at the largest eps that passes every scene: def's median and p95, and
   the phase where a change lands. A negative result is a result.
6. `npm test` green.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- **Your files:** `outline.ts`, the `k1247s8_*`, `k1247s9_*` and `k1247s10_*` tools, and the check
  tools in `.claude/probes/K1240/proto/` (`k1247c_final.ps1` included). No `src/` changes: form B is
  the reference.
- **Commits:** WIP on your branch at each milestone. Use `git add -f` for tools, never for outputs.
  Never push, never edit `LEDGER.md`, and never touch the main checkout or any Muse worktree.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what).
  - Take it only to time something, and delete it when you're done.
  - While someone else holds it, wait inside one blocking command.
  - A lock older than 30 min is stale.
- **Stopping:** stop when Done holds or 2 h after your start (`Get-Date` at the start and at each
  milestone). Then commit WIP, append a handoff to this brief, and report. A compaction is not a
  stop: re-read this brief and `git log`.

## Report

Short and plain:
- the re-scored failures at each eps, before and after;
- each place: what it was, what you changed, and its numbers before and after;
- what's left;
- the checks;
- the crops' paths;
- the timing pair;
- your last SHA.

End with `Ledger items` and K1247's handle fields (owner, branch, last commit, evidence, next).

## Handoff (stage 10, 2026-11-10, 01:35 to 02:20)

**Result:** no eps passes every scene. eps 0.02 is the closest. Two changes landed in `outline.ts`.
Both are positions only (no key changes), and both are continuity fixes at fallback corners. Each
fixes one large move and costs a few small ones at low eps.

**Changes** (`outline.ts`, da70e389 and 45af051c):
1. **Span ramp.** The "V outside spans" fallback's station fraction now ramps from 0 at the span end
   to 1 at `SPAN_RAMP` = 0.5 h past it (`spanRamp`). The stations meet the r = 0 V continuously.
   Before, they jumped to a fixed fraction the moment the V left the spans. This fixed def tail 17
   at (18.69, 7.86): 5.809 px at eps 0.1 (def 0.1) and in the 0.02 cycle.
2. **Tail blend.** An end tail now leaves its corner's point and blends into the border over
   `TAIL_BLEND` = 0.5 h (smoothstep). This applies at fallback corners and at ok r = 0 V corners,
   whose tip sits off the border. Before, the tail started on the border and a stub appeared at the
   corner. Example: def corner 111 at (10.90, 9.60).
3. **Ramp width.** A width of 0.75 h or h (form B's) quiets reach noise but tips def tail 17 into the
   end tail's first-positive-stretch flip: 5.809 px in union def still. So the width stays 0.5 h. The
   reason is in the constant's comment.

**acc, failing rows, drawn max px** (pre = 6704319e, final = 45af051c; `out/s10/acc_pre_*`,
`final_acc_0.02/0.05`, `vb_acc_0.1/0.2`; K = KEYS row):

| eps | pre | final |
|---|---|---|
| 0.02 | 13 | 16 |
| 0.05 | 20 | 23 |
| 0.1 | 23 | 23 |
| 0.2 | 26 | 26 |

Improved rows:

| row | eps | pre | final |
|---|---|---|---|
| def 0.1 | 0.02 | 5.809 | 0.350 |
| def cycle | 0.02 | 5.809 K | 3.065 K |
| g41_def_tw42 0 | 0.02 | 1.712 | pass |
| g41_user_tw64 0 | 0.02 | 2.301 | 0.907 |
| g41_user_tw64 0.1 | 0.02 | 2.456 | 0.983 |
| def 0 | 0.05 | 5.809 | 0.503 |
| g41_def_tw64 0 | 0.05 | 3.746 K | 1.004 K |
| g41_def_tw64 0.1 | 0.05 | 3.619 K | 1.015 K |
| g41_user_tw64 0 | 0.05 | 2.985 | 1.245 |
| g41_user_tw64 0.1 | 0.05 | 3.126 | 0.983 |
| def 0 | 0.1 | 5.809 | 1.064 |
| g41_def_tw42 0 | 0.1 | 1.713 | 0.920 |
| g41_def_tw42 0.1 | 0.1 | 1.746 | 0.731 |
| g41_def_tw64 0.1 | 0.1 | 3.619 K | 1.376 K |
| g41_user_tw64 0 | 0.1 | 3.025 | 1.547 |
| g41_user_tw64 0.1 | 0.1 | 3.160 K | 1.014 K |
| muse_default_tw 0 | 0.2 | 5.753 | 3.168 |
| ring 0 | 0.2 | 5.203 | 5.082 |
| ring 0.5 | 0.2 | 6.826 | 3.873 |
| g41_user_tw64 0 | 0.2 | 10.523 K | 2.719 K |
| g41_user_tw64 0.1 | 0.2 | 5.966 K | 2.477 K |

Worse:

| row | eps | pre | final |
|---|---|---|---|
| muse_hash 0 | 0.05 | 5.285 | 5.705 |
| muse_hash 0 | 0.1 | 4.747 | 5.167 |
| muse_default_tw 0 | 0.1 | 0.854 | 1.478 |

New failures (pass before):
- eps 0.02: muse_default_tw 0.1 (0.261), def 0.5 (0.413), g41_ring_tw64 0 and 0.1 (0.357 and
  0.364);
- eps 0.05: ring 0, 0.1 and 0.5 (0.352, 0.400 and 0.402).

Ring #60 and #77 are run ends at "V outside spans" corners 12 and 16 (`k1247s10_piece.ts ring 0 0.05
60,77`). The ramp's 1/(0.5 h) slope turns the span end's small reduction shift into a run-end move.
Master's fixed fraction did not move there. That is the cost of change 1.

The rest is unchanged. The largest unchanged rows:
- g41_ring_tw64 at 8.9 to 10.6 px;
- muse_hash 0.2 at 8.519;
- def 0.1 and 0.5 at eps 0.1 and 0.2 (5.4 to 5.8);
- muse_default_tw 0.1 at 5.784;
- g41_def_tw64 0 at 7.103 K.

**union** (`k1247s9_union.ts --d=0.001,0.01`; drawn moves over 0.25 px summed over both jitters,
max px; stage 9 = `base_*`, final = `vb_*`; scenes not listed have 0 both ways):

| mode | scene | stage 9 | final |
|---|---|---|---|
| still | def | 0 | 0 |
| still | muse_default_tw | 0 | 0 |
| still | muse_hash | 1 @ 4.600 | 1 @ 5.018 |
| still | g41_def_tw64 | 3 @ 0.459 | 3 @ 0.318 |
| cyc10 | g41_def_tw64 | 4 | 1 @ 0.514 |
| cyc18 | g41_def_tw64 | 1 @ 0.403 | 2 @ 0.816 (worse) |

- Still meets the bar (def 0, muse_default_tw 0, muse_hash 1).
- cyc18 g41_def_tw64's new move is run #164. It is reach noise: passTheta's tangent at a shallow
  crossing, about 1 px under 0.01 px of jitter, feeds the cut-limited L, and the ramp passes it to
  the station.
- Everything else, cyc10 and cyc18, is unchanged. That includes fat cyc18: keys changed 368, 4 @
  4.224.

**Checks** (on 45af051c):
- `s3f_claude_checks.ps1`: tests ALL PASS; exact still, m0.1 and m0.5 ALL WITHIN TOLERANCE.
- `k1247c_final.ps1` (base `out/k1247/s10base`): coldwarm, the three cmp runs, structure, pieces,
  move_def, outline_test, rows and cmprows are ok. verify (44) and faces (22 cases) fail only on the
  intended moves:
  - `k1247s10_diffcorners.ts` (`out/s10/final_diffcorners.txt`, master's outline against this one,
    cold, every scene and mult): 22 scene and mult cases differ, with no key or piece-count changes.
  - Every moved piece is at a fallback corner: "V outside spans" 240, its tails 99, arm span 0's
    tails 7, r = 0 V tails 35.
  - The other 2 are muse_default_tw corner 104's tail at 0.0004 h: an ok corner whose tip is just
    off the border.
- `k1247s5_cmp`: 44/8/0/0, the same as stage 9.
- `k1247s5_outside` and `k1257_sliver` (after 0 over 0.5 px): unchanged.
- `npm test` (at 45af051c): green. 220 files passed and 2 skipped; 2893 tests passed and 9 skipped.

**Crops** (`out/s3f/`, 5 h; before = `s3f_claude_pics.ts` on master's outline, after = this one;
Claude looked at each pair):
- `s10_before_def/def_A0.png`, `s10_after_def/def_A0.png`: def tail 17 and corner 111's tail. Before,
  both leave the corner as stubs into the fill. After, both sit at the corner.
- `s10_{before,after}_muse/muse_hash_A0.png`: corner 121, tail/23. No visible change at this scale.
- `s10_{before,after}_g64/g41_def_tw64_A0.png`: corner 102, still. The tail is shorter and starts at
  the corner.
- `s10_{before,after}_g64c18/g41_def_tw64_A0.png`: the same place at MOVE=0.45 JIT=0.01. About the
  same.

**Timing** (`k1247s10_ab.mjs` under `k1247s8_run_locked.ps1`; def, eps 0, 4 alternating rounds,
02:13 to 02:14):

| | median (ms) | p95 (ms) |
|---|---|---|
| master | 20.65, 20.79, 21.09, 21.22 | 24.2, 24.9, 36.1, 30.3 |
| mine | 21.42, 20.93, 20.61, 20.60 | 28.4, 29.3, 28.7, 29.6 |

- No difference beyond the noise, and no phase moved beyond its round-to-round spread. The two
  changes add work only at fallback corners and end tails.
- No eps passes every scene, so there is no reduced eps to time: the payoff is still unmeasured.
- At 02:02 my parallel acc and union runs overlapped the K8 agent's locked bench (lock at 02:02:07).
  Its numbers from that window carry load. Later runs used Idle priority.

**Left** (place and cause):
1. **The end tail's first-positive-stretch flip.** It decides from the margin's sign, so it is
   discontinuous. Examples: def tail 17 under a wider ramp, muse_default_tw tail/51 at corner 247,
   muse_hash tail/23 at corner 121. It blocks widening the ramp.
2. **Reach noise into L.** passTheta's tangent at shallow crossings reaches the cut-limited L and
   the stations: g41_def_tw64 cyc18 #164 at 0.816 px. A wider ramp would also halve the new
   low-eps run-end moves (ring #60 and #77, g41_ring_tw64 #60).
3. **The shallow crossing cut.** g41_ring_tw64 cut 273, 8.9 to 10.6 px at every eps from 0.05.
4. **Folds and spikes near roots.** muse_hash #200 and #183 (muse_hash 0 and 0.2).
5. **Region-id key changes.** g41_def_tw64 run/10 (1325 vs 1324) and g41_user_tw64 piece 34 (579 vs
   581). def cycle warm is a KEYS row too.
6. **Fat cyc18's twist cut at crossing 310.** 368 keys changed, unchanged from stage 9.
7. **Undiagnosed:** muse_hash cyc10 run/54 at corner 255, and def cyc18 arc/72 at corner 327.

**Next:**
1. Decide the end tail's extent continuously, without the first-positive flip. Then widen
   `SPAN_RAMP` to h and re-score.
2. Smooth or bound the reach's tangent noise before it reaches L.
3. Fix the shallow crossing cut (g41_ring_tw64).

`outline_master.ts` (untracked) is needed by `k1247s10_diffcorners.ts` and `k1247s10_ab.mjs`.
Recreate it with:
`git show master:.claude/probes/K1240/proto/outline.ts > .claude/probes/K1240/proto/outline_master.ts`