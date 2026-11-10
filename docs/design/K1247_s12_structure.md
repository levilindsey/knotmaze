# K1247 stage 12: decisions the reduced frame still makes from positions

Ledgers: K1247 (the frame's speed) and K1240 (the redesign). One Claude Opus agent in its own
worktree, on its own branch. Cap 2 h.

## Why

Stage 11 (`docs/design/K1247_s11_tails.md`, its handoff; merged at b6103dd1) clipped the synthesized
cut's search to its window (g41_ring_tw64 cut 273: 8.9 → 1.0 px at eps 0.1) and gave every kept
interval a region. Plain reduction still fails 23 scenes at eps 0.1 (worst 7.103 px) and 26 at 0.2
(worst 10.620 px). Most of what is left is a decision that follows the positions, so the reduced
frame decides differently from the full one. Each one is also a pop in motion.

## Goal

The same as stages 10 and 11: plain reduction at eps 0.1, then 0.2, passes on every scene, scored by
the drawn union. Levi's rule still binds: the structure is decided once, and only positions follow
the frame. No piece that comes and goes, and no decision made from positions. The technique is yours.

Cut 273's new end is a look change that waits on Levi (K1247's ask in the ledger). Keep it as merged.

The places, from stage 11's Next. Re-measure each one first, and take them in this order:
1. **Region numbering and group from structure.**
   - g41_user_tw64 chain 26 has 18 regions reduced and 16 full, with the same cuts. The two extra
     splits sit near the chain's start (s 0.28-0.77, the arcs at corners 137 and 139): station
     activity, or the 1e-9 cS dedupe near the corner tangent stations. Find which, and fix it.
   - `memberGroup` / `memberGroupC` read the group from the cap ramp at cMid, with the cut-limited
     `a.L`, so the group flips near an arm's end. Take it from structure (the arm's structure-time L,
     or a rank).
   - Then re-check def cycle frame 18 (816 vs 817/818) and fat cyc18 crossing 310 (368 keys).
2. **The tail that comes and goes:** g41_def_tw64 tail/17 at corner 105, the eps 0.1 worst (n 0 full,
   3 reduced). Its existence has to come from structure. Its extent needs a continuous measure that
   passes the union bar; stage 11's t2-t6 did not (its handoff lists them). Then widen `SPAN_RAMP`
   toward h if that still quiets the run-end noise.
3. **Reach noise into spanRamp** (stage 11's places 4 and 5: g41_def_tw64 cyc18 #164, muse_hash cyc10
   run/54). Chord theta helped (muse_default_tw at eps 0.1: 5.784 → 0.874) but failed the union bar
   at cyc18 fat. Find a form that keeps it.
4. **g41_ring_tw64 at eps 0.2:** #88 run/1 and #253 run/13. Undiagnosed.
5. **def cyc18 arc/72 (corner 327).** Undiagnosed.

## Done

Done 1-6 of `docs/design/K1247_s10_reduce.md`, with these changes:
- **Setup.** Copy stage 11's untracked inputs from its worktree,
  `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-ab0e33c2e4fe88918\.claude\probes\K1240\`:
  `out/k1247s5` and `out/k1247s5_master`. Write `proto/outline_master.ts` from
  `git show b6103dd1:.claude/probes/K1240/proto/outline.ts`.
- **Step 0** is `k1247s10_base.ps1 -Sub s12base` on master's outline, before any change. The outside
  check compares against `s12base`.
- The bar for `k1247s5_cmp` is 44/8/0/0.
- The bar for `k1247s9_union.ts --d=0.001,0.01`, still and `--cyc`, is stage 11's handoff
  (`out/s11/t9_deg_union_*` in its worktree). No scene gets more drawn moves over 0.25 px, and no
  move gets larger.
- The acc table covers eps 0.02, 0.05, 0.1 and 0.2, before and after.
- Any change that moves what is drawn at rest gets a before/after crop pair, as stage 11's did.

## Rules

The Rules of `docs/design/K1247_s10_reduce.md` (your files: `outline.ts`, the `k1247s8_*` to
`k1247s12_*` tools and the check tools in `.claude/probes/K1240/proto/`; no `src/`), plus:
- **Load.** Other agents (K268's census, the phone round) time things on this machine. While anyone
  else holds `$env:TEMP\claude-perf.lock`, run one scoring process at a time, at Idle priority. Take
  the lock yourself only for the timing pair.

## Report

As in stage 11's brief: the acc table before and after, each place (what it was, what you changed,
its numbers before and after), what's left, the checks, the crops' paths, the timing pair, your last
SHA. End with `Ledger items` and K1247's handle fields.
