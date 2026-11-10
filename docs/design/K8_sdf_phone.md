# K8: what rp=sdf's gaps cost the phone

Ledger: K8 (G3, SDF ribbons). One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

`?rp=sdf` now draws its crossing gaps (`docs/design/K8_sdf_gaps.md`, handoff 1), and the cost stage
(`docs/design/K8_sdf_cost.md`, handoff 1) cut the desktop's overdraw: knot gs 24 at 1.73x the default
path, dense 1.09x, max fabric 0.90x. The phone is much worse.

Round 2026-11-10c (`docs/design/K156.md`, its handoff) timed each K8 commit on the Pixel, rp=sdf on
both sides. Render-sync medians in ms (dense / max fabric / knot gs 24):

| commit | dense | max fabric | knot gs 24 |
|---|---|---|---|
| default path, no rp=sdf (round 2026-11-10b) | 110 | 284 | 32 |
| a145be26 (before the gaps) | 121.3 | 302.5 | 50.1 |
| c67a75ff (the turn: the gap windows start to match) | 388.0 | 511.8 | 118.5 |
| 42900cac (the vertex window scan) | 392.4 | 523.8 | 223.0 |
| d70fdf0d (one quad per pixel) = master | 278.5 | 422.1 | 163.3 |

So the phone pays mostly for the gap work that c67a75ff switched on: once fragments fall inside
gap windows, the casing cut runs. 42900cac adds +104 ms on knot gs 24 only, and +4 / +12 ms on the
other two links. That is unexplained. G3-3 (the SDF default flip) waits on this.

The links (`scripts/phone_pass/k539_g31.mjs`), each with `&rp=sdf` and without:
- dense: `?b&gs=24&wd=0.6&brd=0.6`
- max fabric: `?b&gs=24&wd=1&brd=1&ded=1&del=40&jsp=.5`
- knot gs 24: `?b&gs=24&wd=1&mf=0`

## Goal

rp=sdf no slower than the default path on the phone's three links, with the same gaps. The technique
is yours. The desktop can't show the phone's cost directly, so measure the work itself (per-fragment
and per-vertex counts, timer queries where they exist), and make the commits the phone round will
A/B.

## Done

1. **Where the work goes.** For each link: a per-fragment count of the gap search's iterations
   (a heatmap, and its mean and max over drawn pixels), and the per-vertex length of 42900cac's
   window walk. Say why knot gs 24 alone pays for 42900cac.
2. **Candidates.** Each fix is its own commit on your branch. For each one:
   - the gaps stay the same: a same-state pair against master on knot gs 24 and dense (as in
     `K8_sdf_gaps.md` handoff 1) shows only sub-pixel casing edges, and 4x crops of the three links;
   - the counts from step 1, before and after;
   - `scripts/bench_frame.mjs` on the desktop, before and after.
3. **The phone list.** The commits the next K156 round should A/B, with what each one should show.
   The coordinator runs that round. Don't use the phone yourself.
4. **No regressions:** gl.getError 0 and no context loss on the three links, with and without rp=sdf;
   the default path does not move (`test/physics/byte_identity.test.ts` and the paint pins green with
   no re-freeze); `npm test` and `npm run build` green.

## Rules

The Rules of `docs/design/K8_sdf_cost.md`, plus:
- **Other agents.** K268's agent works in `.claude/probes/K268/` and may touch
  `src/render/explore_glsl.ts`. K1247's agent works in `.claude/probes/K1240/proto/`. Don't touch either.
- **Perf lock.** K268's census takes the same lock. Wait for it inside one blocking command.

## Report

Short and plain: where the work goes (the counts, and why 42900cac hits only knot gs 24); each
candidate (what it changes, its counts and bench_frame before and after, its crops and same-state
pair); the phone list; the checks; what's left; your last SHA. End with `Ledger items` and K8's
handle fields.
