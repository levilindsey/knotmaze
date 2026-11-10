# K1247 stage 11: the jumps reduction still trips on

Ledgers: K1247 (the frame's speed) and K1240 (the redesign). One Claude Opus agent in its own
worktree, on its own branch. Cap 2 h.

## Why

Stage 10 (`docs/design/K1247_s10_reduce.md`, its handoff) moved `k1247s8_acc.ts` to the drawn union
and fixed two jumps: the span ramp and the tail blend. Plain reduction still fails 23 scenes at eps
0.1 and 26 at eps 0.2, and stage 10 listed what trips them. Each one is also a pop in motion.

## Goal

The same as stage 10: plain reduction at eps 0.1, then 0.2, passes on every scene, scored by the drawn
union. Levi's rule still binds: the structure is decided once, and only positions follow the frame.
No piece that comes and goes, and no decision made from positions. The technique is yours.

The places, from stage 10's "What's left". Re-measure each one first, and take them in this order:
1. **The end tail's extent.** It's picked by a sign test that can flip: the first positive stretch of
   f. It hits def tail 17 under a wider span ramp, muse_default_tw tail/51 (corner 247) and muse_hash
   tail/23 (corner 121, 5.0 px at 0.01 px jitter). Make the extent continuous. Then widen `SPAN_RAMP`
   toward h (form B's width), which stage 10 found quiets the run-end noise (ring #60/#77,
   g41_ring_tw64 #60), and re-score.
2. **g41_ring_tw64's shallow crossing cut 273:** 8.9-10.6 px at every eps from 0.05 up.
3. **Region-id key changes:** g41_def_tw64 run/10, g41_user_tw64 piece 34, and fat cyc18's twist cut
   at crossing 310 (368 keys, open since stage 9).
4. **Tangent noise at shallow crossings** reaching the cut-limited length (g41_def_tw64 cyc18 #164),
   and the folds near roots (muse_hash #200, #183).
5. **Undiagnosed:** muse_hash cyc10 run/54 (corner 255) and def cyc18 arc/72 (corner 327).

## Done

Done 1-6 of `docs/design/K1247_s10_reduce.md`, with these changes:
- Step 0 is `k1247s10_base.ps1` on master's outline, before any change. `k1247c_final.ps1` now exits
  nonzero when a step fails.
- The bar for `k1247s5_cmp` is stage 10's: 44/8/0/0.
- The bar for `k1247s9_union.ts --d=0.001,0.01`, still and `--cyc`, is stage 10's handoff. No scene
  gets more drawn moves over 0.25 px, and no move gets larger.
- The acc table covers eps 0.02, 0.05, 0.1 and 0.2, before and after, as stage 10's does.

## Rules

The Rules of `docs/design/K1247_s10_reduce.md` (your files: `outline.ts`, the `k1247s8_*` to
`k1247s11_*` tools and the check tools in `.claude/probes/K1240/proto/`; no `src/`), plus:
- **Load.** Another agent (K8) times things on this machine. While anyone else holds
  `$env:TEMP\claude-perf.lock`, run one scoring process at a time, at Idle priority. Stage 10's
  parallel scoring overlapped K8's locked bench.

## Report

As in stage 10's brief: the acc table before and after, each place (what it was, what you changed,
its numbers before and after), what's left, the checks, the crops' paths, the timing pair, your last
SHA. End with `Ledger items` and K1247's handle fields.

## Handoff (stage 11, 2026-11-10, claude session 09c7a672 agent ab0e33c2e4fe88918)

Done does not hold: no eps passes every scene. Two changes landed. The rest is diagnosis.

Commits on `worktree-agent-ab0e33c2e4fe88918`, after b60660a7:
- edef5587 and f4fa01fe (WIP): the continuous tail variants. All of them were measured and dropped,
  and 9044eb96 restores stage 10's tail code.
- 9044eb96: synthesized cuts search the s window exactly (`clipSegS`).
- dfb90df8: every kept interval gets a region, including one whose polygon has under 3 points.
  Adds `k1247s11_regions.ts`.

### Acc (`k1247s8_acc.ts`), drawn worst px / failures

| eps | before (stage 10, b60660a7) | after (dfb90df8) |
|---|---|---|
| 0.02 | 3.788 / 16 | 3.788 / 16 |
| 0.05 | 6.259 / 23 | 5.809 / 23 |
| 0.1 | 8.921 / 23 | 7.103 / 23 |
| 0.2 | 10.620 / 26 | 10.620 / 26 |

- **KEYS failures, before:** def cycle at frames 18/6, g41_def_tw64 at mult 0 and 0.1 at every eps,
  and g41_user_tw64 piece 34 at eps 0.1 and 0.2.
- **KEYS failures, after:** only def cycle and g41_user_tw64 piece 34. The failure counts stay the
  same because those g41_def_tw64 rows still fail on drawn distance.
- **Worst row now:**
  - eps 0.1: g41_def_tw64 0, tail/17 at corner 105, 7.103 px. The tail exists in the reduced frame
    only (n 0 full, 3 reduced).
  - eps 0.05: def cycle warm, 5.809 px.
  - eps 0.2: g41_ring_tw64 #88 run/1 and #253 run/13 at (11.27, 4.63) and (10.36, 5.13). This is
    new to the list at this eps.
- **Outputs:** `.claude/probes/K1240/out/s11/t9_deg_acc_<eps>.txt` (after) and
  `t7_clip_acc_<eps>.txt` (after 9044eb96 only).

### Places

1. **End tail extent.** Not changed.
   - Every continuous-extent variant I tried failed the union bar: t2, t4, t5 and t6, the level-band
     average of f's first stretch, a foot along smooth normals, a wide foot, and sign extent. They
     were behind env knobs in f4fa01fe; 9044eb96 removed the knobs.
   - Tail f noise comes from the depth tent's shallow zero crossing (tail 161, `k1247s11_tailz.ts`).
   - SPAN_RAMP was not widened, since that needs a continuous extent first.
   - The tail that comes and goes (g41_def_tw64 tail/17, corner 105) is now the eps 0.1 worst.
2. **g41_ring_tw64 cut 273.** Fixed by 9044eb96.
   - The synthesized cut searched whole segments that only overlapped the window s in [sC-R, sC+R],
     so it could land outside the window. `clipSegS` clips each segment to the window.
   - The cut moves 1.4 h, to the true interior minimum: 29.2487 full against 29.2483 reduced.
   - Numbers, at mult 0 / 0.1:
     - eps 0.05: 6.259 → 0.900 (pieces 3 → 2), 6.237 → 0.882.
     - eps 0.1: 8.921 → 0.995, 8.888 → 0.978.
     - eps 0.2: 16 moves over the bar → 15.
   - This changes the look. The run end now reaches further into the fill, as in the ring scene.
     See the crops below.
3. **Region-id key changes.** Partly fixed by dfb90df8.
   - The skip of polygons under 3 points renumbered every later region. Its point count follows
     the positions: g41_def_tw64 chain 81 has 9 points full and 2 reduced at eps 0.1. With the skip
     gone, the g41_def_tw64 run/10 failures are gone at every eps.
   - **Left:** g41_user_tw64 piece 34. Chain 26 has 18 regions reduced against 16 full, with
     identical cuts in both frames. The extra splits sit near the chain start, s 0.28-0.77, around
     the arcs at corners 137 and 139. This points at station activity or the 1e-9 cS dedupe near
     the corner tangent stations; not confirmed.
     - Tools: `k1247s11_regions.ts g41_user_tw64 0.1 0.1`, then the untracked
       `_k11_regseq.ts g41_user_tw64 0.1 0.1 26` for the per-chain stations and intervals.
   - **Left:** `memberGroup` / `memberGroupC` pick the group from the cap ramp at cMid. That ramp
     uses the geometric, cut-limited `a.L`, so the group flips near an arm's end. This is a decision
     made from positions.
   - **Left:** def cycle frame 18 (816 vs 817/818), and fat cyc18 crossing 310. Fat still changes
     368 keys.
4. **Tangent noise at shallow crossings.** Not changed.
   - Chord theta helped some scenes: t8_tc1 took muse_default_tw at eps 0.1 from 5.784 to 0.874.
   - Both t8_tc0.5 and t8_tc1 failed the union bar, so I reverted them.
5. **muse_hash cyc10 run/54 (corner 255).** Reach noise passed through spanRamp, the same cause as
   place 4. def cyc18 arc/72 (corner 327) was not diagnosed.

### Union bar (`k1247s9_union.ts --d=0.001,0.01`)

Holds against stage 10's handoff (`out/s11/t9_deg_union_*`, `t7_clip_union_*`):
- still: identical.
- cyc10: identical, except fat 0.001's piece max 0.002 → 0.005. Its drawn count is 0.
- cyc18: fat 0.001 went from 3 moves (4.224) to 1 (0.351, #658 run/2). fat 0.01 went from 1
  (1.448) to 0.

### Checks (9044eb96 and dfb90df8)

- `k1247c_final.ps1` (`out/k1247c_final/index.txt`, `out/s11/cfinal_run*.txt`):
  - verify fails 10 and faces fails 5. All of them are the intended move of cut 273
    (`out/s11/clip_verify.txt`, `clip_faces.txt`).
  - coldwarm, the cmp runs, structure, pieces, move_def, outline_test, rows and cmprows: ok.
  - dfb90df8's output is identical to 9044eb96's.
- s3f with `-Base` (`out/s11/s3f_run3.txt`):
  - tests ALL PASS; STRUCTURE IS THE DIAGRAM; FIXED PIECES identical.
  - rigid def maxDiff 4.809e-9.
  - exact still, m0.1 and m0.5: ALL WITHIN TOLERANCE.
- `k1247s5_cmp`: 44/8/0/0, which meets the bar.
- outside (`--base=s11base`): only the ring faces. sliver after: 0. diffcorners: 10 OTHER, all at
  runs 3/4 of the ring scenes (`out/s11/final2_*`).
- `npm test` on 9044eb96: 220 files passed, 2 skipped; 2893 tests passed, 9 skipped.
  dfb90df8 changes probes only.

### Crops (AT 20.08,20.86 and 17.87,20.66; 5 h)

- `out/s3f/s11_before_g64ring/g41_ring_tw64_A0.png` and `out/s3f/s11_after_g64ring/g41_ring_tw64_A0.png`
- `out/s3f/s11_before_ring/ring_A0.png` and `out/s3f/s11_after_ring/ring_A0.png` (AT 19.82,20.63)

### Timing

Measured under the lock, 03:14:51-03:15:35, on def at eps 0, 4 rounds alternating
(`out/s11/final_timing.txt`):

| | medians (ms) | p95 (ms) |
|---|---|---|
| master | 20.545, 20.703, 20.851, 20.600 | 28.6, 29.9, 28.5, 26.3 |
| mine | 20.914, 20.502, 20.833, 20.810 | 28.9, 26.0, 29.2, 28.4 |

No difference. A reduced eps is still untimed, because none passes.

### Setup a new session needs

The tools compare against stage 10, and several inputs were copied into this worktree, untracked:
- `out/k1247s5` (refs) and `out/k1247s5_master`, copied from worktree agent-a6b99b04c9c8fb2ef.
- `proto/outline_master.ts`, a copy of master's outline (= b60660a7), for the timing pair and
  `_pics_master.ts`.
- `out/s11base`, the stage 10 dump that outside compares against.

Recreate them in a new worktree, or run the checks from this one.

### Next

1. **Structural region numbering and group.**
   - Find why g41_user_tw64 chain 26 gets two extra intervals near its start (stations, or the cS
     dedupe).
   - Take the group from structure instead of `memberGroup`'s geometric L: the arm's
     structure-time L, or rank.
   - Then re-check def cycle frame 18 and fat crossing 310.
2. **The tail that comes and goes.** g41_def_tw64 tail/17 at corner 105 is the eps 0.1 worst.
   - Its existence has to come from structure.
   - Its extent needs a continuous measure that passes the union bar. None of t2-t6 did.
3. **Smooth the reach noise** that reaches spanRamp (places 4 and 5) without moving the union bar.
   Chord theta is the lead, but it needs a form that keeps cyc18 fat.
4. **g41_ring_tw64 at eps 0.2:** run/1 and run/13. Undiagnosed.
5. **def cyc18 arc/72 (corner 327).** Undiagnosed.
