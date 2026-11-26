# K1626 finishing run: the width jump re-sleeps with the joint eyes open (numeric, 1 h)

Read first: `K1626_s2_brief.md` with its `## Handoff (stage 2)` on branch `k1626-s2` (your base), and the
tools under `.claude/probes/K1626/` (`widthjump.ts`, `wj_diag.ts`, `jeye.ts`, `eyetab.py`, `bench.ts`).

## State

Stage 2's joint-eye pressure opens the eyes (first-pass joint eyes under 1.5 widths: 44 -> 1; Levi's J138
0.80 -> 2.05) and the look is the one to keep. One binding fails: on Levi's link
(`?3.FCBQ1H6L4-6NPbeg8HHN09w`) a thread-width jump 0.75 -> 0.5 never re-sleeps within 40 s (master +3.5 s,
stage 1 +5.7 s; `?1` is fine at +5.6 s). Bisected: skipping joint eye 12 alone gives +3.9 s; the motion that
never stops is at chain 82 slot 53, outside every eye's arms. A global per-pair rate limit cannot keep both
the openings and the re-sleep (table in the handoff).

## This run

1. Name joint eye 12 (print after the settle in `wj_diag.ts`) and say, observed, why its pressure keeps the
   knot awake after the jump (target beyond what its arm material allows? a standoff with a neighbour?).
2. Fix it per eye in `applyJointEyePressure` (the handoff's lead: stop pushing an eye whose arms lack the
   material to meet its target, the P3.37 lesson), not with a global cap.
3. Pass, all of: the width jump re-sleeps on Levi's link and `?1` within 10 s; add that case to
   `test/physics/joint_crossing.test.ts` (or a sibling) so it stays; sleep and quiescence tests as written;
   the openings hold (under 1.5: at most 2 eyes over his link and `?1`..`?a`; J138, J64, J13 each within
   0.15 widths of stage 2's); step cost within 5% of master (`bench.ts`, under the perf lock); `npm test`
   green; `npm run build` passes; pins named.

No pictures needed unless an opening moves by more than 0.15 widths: then re-capture that eye with
`cap3.mjs` as `stage 2 | yours` and view it. Keep out of `src/render/`.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1626-s3`, branch `k1626-s3`, from branch
`k1626-s2`; `node_modules` as a directory junction to the main checkout's (never `npm install`). Write only
inside your worktree. Read code through the shell; the Read tool only just before an Edit. Perf lock through
`scripts/perf_lock.ps1` (another agent shares it: wait inside one blocking command), ports 5655 to 5659.
Commit WIP at every milestone (`git add -f` for probe tools, never their outputs). Never push, never bare
`git stash`, never edit LEDGER.md, never touch the phone, no Chrome `--virtual-time-budget`.

## Stop rule

Stop when every pass line holds or after 1 h of wall clock, whichever first. A compaction is not a stop:
re-read this brief and `git log`. If the re-sleep cannot be had with the openings, stop and give the best
trade measured (which eyes would have to close, by how much). On stopping: commit WIP, append
`## Handoff (finishing run)` here, commit, and report: verdict first (safe to land or not), numbers, a
`Ledger items` list and the handle fields.
