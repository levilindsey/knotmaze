# K1247 stage 6: corners in closed form

Ledger: K1247 (K1240's frame cost). One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

K1240 is the redesign: one outline (offset-polyline borders, cuts, corner arcs) for both looks. Levi's
sketch asked for corner arcs "in closed form from each frame"; the prototype grows them by stepping
instead. The gate is def's `frame()` at ≤3 ms median and ≤6 ms p95; it takes about 17.5 ms, and corners
are the biggest phase.

Stage 5 (`docs/design/K1247_s5_growth.md`, Handoff 1 and its addendum) found:
- **Stepping can't get there.** Its 16-node growth with checked refinement took corners from 6.6 to 5.7
  ms. With the margin removed entirely they would still take 4.1 ms. The Newton steps and foot searches
  on every advance are the cost: about 14 µs a corner, and 1 ms leaves 0.8 µs.
- **A corner is about 10 pieces.** It crosses about 10 segments, with 9 state changes over 17 nodes. The
  margin is 0 in 95% of calls, and w = 1 on 27% of def's corners.
- **Today's 1e-3 h landing floor was the branch loss.** At 0.1 h (`kfJump`) the growth converges with N.
- **What's left is ties, not convergence.** Near-tied foot branches flip with N (muse_default_tw 0
  c303, 0.49 h).

## Goal

Replace the growth with closed-form pieces along the medial path. Between a segment and a segment the
path is a line; between a segment and a vertex it is a parabola. Each piece gives its feet and w in
closed form, so no Newton steps or foot searches remain. Where possible, bound the margin per corner or
per piece instead of walking it. If time allows, make the V solve cheaper too (about 0.8 ms on def).

Target: def's corners phase ≤1 ms median, under the lock, with the whole frame. The technique is yours.

**This stage is the rewrite.** Build it even if it won't finish in 2 h, and commit WIP at each
milestone. Don't spend the stage sizing or measuring alternatives.

## Start

Stage 5's branch holds the reference, the tools and the 0.1 h landing floor. Merge it into your
worktree first: `git merge --ff-only worktree-agent-a3deb5723f8c1b194`. Its growth is not on master;
you replace it.

## Accuracy (Claude's call, technical)

1. **Corners.** Within 0.01 h of the converged reference (`k1247s5_mkref.mjs`, `k1247s5_ref.ts`,
   `k1247s5_cmp.ts`) in every corner where the reference converges. List the ones where it doesn't.
   Near ties need a rule that doesn't depend on the previous frame (cold = warm). Say which rule you
   chose.
2. **Outside corners.** Run interiors stay within 1e-3 h of master (`k1247s5_outside.ts`). Run ends move
   with their corners. Counts, piece kinds and order stay the same; explain any change.
3. **No gap between fill and outline.** Stage 5's crop `out/k1247s5/pics/2_user_tw42.lightpaper_0_c31.png`
   shows a 1-pixel white sliver between the fill and the new corner (the middle panel's left edge).
   Find why, and show that none remains on any scene.
4. **Cold = warm** within 1e-6 h.
5. **Pictures.** Crop the 6 corners that move most from master (`k1247s5_pics.ts`). Claude looks at them.

## Checks

In `.claude/probes/K1240/proto/`:
- `k1247c_final.ps1` with
  `-Base ../../../../muse-k1240-s1/.claude/probes/K1240/out/k1247/base`. Corner moves will exceed
  its tolerances by design; judge them against the reference instead, per scene.
- `k1247c_coldwarm.ts`.
- `k1247c_time.ts` under the lock (`run_locked_k1247s4.ps1`), master against yours in one session.

## Done

Corners ≤1 ms with the checks above, from two locked runs, and `npm test` green. If you don't get there
by the cap, commit the fastest version that passes, or the rewrite as WIP with where it stands.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- Perf lock: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it for every
  timing and delete it when you're done. A lock older than 30 min is stale.
- Your files: `.claude/probes/K1240/proto/` only. No `src/` changes. Don't touch
  `.claude/probes/K1240/wasm/`. Commit WIP on your branch at each milestone, with `git add -f` for
  tools, never for outputs. Never push, never edit `LEDGER.md`, and never touch the main checkout.
- **Use the full 2 h.** Stop early only when Done holds.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone). Then
  commit WIP, append a handoff to this brief, and report. A compaction is not a stop: re-read this
  brief and `git log`.

## Report

Short and plain:
- def's median and p95, and its phases, before and after;
- per scene, the largest distance to the reference and the largest move from master;
- the tie rule;
- the sliver's cause;
- the crops' paths;
- what's left;
- your last SHA.

End with `Ledger items` and K1247's handle fields (owner, branch, last commit, evidence, next).
