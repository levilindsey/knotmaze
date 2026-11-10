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
