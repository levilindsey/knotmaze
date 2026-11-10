# K8: what rp=sdf's crossing gaps cost, and making them cheap

Ledger: K8 (G3, SDF ribbons). One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

0f4c8233 made `?rp=sdf` draw its crossing gaps (`docs/design/K8_sdf_gaps.md`, Handoff 1: c67a75ff the
turn, 42900cac the window scan, d70fdf0d one quad per pixel). The phone then measured its cost (K156,
round 2026-11-10 in `docs/design/K156.md`; `scripts/phone_pass/k539_g31.mjs`, ABBA, 60 frames,
render-sync median ms):

| link | default | rp=sdf |
|---|---|---|
| dense `?b&gs=24&wd=0.6&brd=0.6` | 109 | 280 |
| max fabric `?b&gs=24&wd=1&brd=1&ded=1&del=40&jsp=.5` | 284 | 423 |
| knot gs 24 `?b&gs=24&wd=1&mf=0` | 31 | 163 |

Before the fix, rp=sdf without gaps cost about the same as the default. G3-3 (the SDF default flip) and
Levi's look at rp=sdf both wait on this.

## Goal

rp=sdf draws the same gaps at a cost no higher than the default path's on the three links. If that
can't be done, find the floor and its cause. The technique is yours. The default path doesn't move.

## Done

1. **Where the cost is.** Use `scripts/bench_frame.mjs` on the desktop, with and without rp=sdf, on
   the three links:
   - at a145be26 (before the fix), and at c67a75ff, 42900cac, d70fdf0d and master;
   - name the commit and the shader work (fragment or vertex, which loop) that adds the cost.
   If the desktop doesn't show the phone's ratio, say so, and find what the phone pays that the
   desktop doesn't.
2. **The fix,** on your branch: bench_frame numbers before and after on all three links, both paths.
3. **The gaps are unchanged:**
   - 4x crops of the same spots as Handoff 1 (`.claude/probes/K8/sdf_gaps/` tools; full-resolution
     shots, not the phone's 464 px), default against rp=sdf. Every crossing is cut. Claude looks at
     them.
   - A same-state pair on knot gs 24 and dense (`ss/ss_ab.mjs`) against 0f4c8233's rp=sdf: no cluster
     over 2 px, or each one attributed.
   - `test/render/sdf_gap_bind.test.ts` still passes.
4. **No regressions:** gl.getError 0 and no context loss on the three links. The default path is
   unchanged (byte_identity and the paint pins green with no re-freeze). `npm test` and
   `npm run build` green.

The phone's numbers come from the next K156 round, not from you.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- **Builds:** `pwsh scripts/preview.ps1 -Ref <sha> -Root <dir> -BuildOnly` builds any commit into
  its own directory. Serve from ports 5700-5719.
- **Shots:** `node scripts/diag_screenshot.mjs <url> <out.png> [settleMs]`, with a settle of 20000 ms
  or more. Never use Chrome's `--virtual-time-budget`. A bare URL is today's daily, so always use the
  `?b&...` links above.
- **Your files:** the SDF path in `src/render/` (`fabric_sdf.ts`, `samp_table.ts`, `gap_mask.ts`,
  `ribbon/`, the paint GLSL) and its tests, plus probes in `.claude/probes/K8/`. Another agent works
  in `.claude/probes/K1240/proto/`. Don't touch it.
- **Commits:** WIP on your branch at each milestone. Use `git add -f` for probe tools, never for
  outputs. Never push, never edit `LEDGER.md`, and never touch the main checkout.
- **Perf lock:** every timing and every batch of headed-Chrome shots takes `$env:TEMP\claude-perf.lock`
  (one line: owner, start time, what).
  - Keep each hold under 10 minutes, and delete the lock between batches.
  - While someone else holds it, wait inside one blocking command.
  - A lock older than 30 min is stale.
- **Stopping:** stop when Done holds or 2 h after your start (`Get-Date` at the start and at each
  milestone). Then commit WIP, append a handoff to this brief, and report. A compaction is not a
  stop: re-read this brief and `git log`.

## Report

Short and plain:
- where the cost is (the commit and the shader work);
- the fix, and bench_frame before and after;
- the crops' paths and the same-state pair;
- the checks;
- what's left;
- your last SHA.

End with `Ledger items` and K8's handle fields (owner, branch, last commit, evidence, next).
