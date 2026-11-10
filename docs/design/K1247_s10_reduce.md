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
