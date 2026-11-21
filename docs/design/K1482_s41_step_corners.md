# K1482 stage 41: rounder corners at t81s's step and at t4s (K1559, K1555)

Brief for one Claude agent (model opus), 2026-11-20. Render work in `src/render/gpu_field/eval.ts` and
`gf_glsl.ts` (the mirror and the shader, in step) and their tests. `gf_look.ts` is hands-off (a Muse run
works there). First try at both corners.

**What Levi asked.** Both places are on link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`,
3200x1800 frame, border look `&tlk=border`).
- t81s, at (929, 1153): where the under thread's tail ends at the over thread, the outline makes a step.
  Levi, 2026-11-20: "we want the step. Ideally the step corner would be a be rounder though". The step is
  WANTED (a written look rule): it stays where it is and as high as it is; only its corner changes.
- t4s, at (2172, 615): a square inside corner. Levi: "this would be nice to round out, but is not too
  critical of the fix becomes too difficult to make or too costly".

**Goal.** A rule, yours to design, that draws each of the two corners ROUND: an arc that meets both border
lines without a kink, the border stroke unbroken through it at its full width. Choose the radius so that the
corner reads as the same hand as the rounded corners gf already draws on the frame (look at a few first;
`&gfk=0` shows the frame without the second corner try). t81s comes first. If the rule that rounds t81s does
not reach t4s and t4s needs its own, finish t81s and say what t4s would take. The result is a CANDIDATE:
Levi decides, nothing is pushed.

**The bar, binding.** At junctions and thread ends the outline runs on unbroken, with no dot, stub, wedge,
tick, notch or slit. Every thread at a place keeps BOTH borders, its width and its heading (never trade a
hook for a point; never thin, merge or drop a border). gf's border look is its own: do not move its strokes
toward the older render's, and do not use that render as a bar. A rounding rule fires at every corner of its
kind on every maze: each place it changes must be as the start draws it, or cleaner. A rule that rounds the
two named corners and breaks one other place is not a candidate as built (stage 37's ball: 8 places cleaner,
2 broken on sister mazes; `docs/design/K1482_s40_ball_narrow.md`).

**Done.**
1. Start pictures of both places (wide and close, as drawn and brightened), and in two or three lines each:
   what draws the corner (which pieces meet, which term makes it square), shown in the mirror.
2. The rule in the mirror and the shader; pins that move re-frozen and named; `npm test` green (with
   `GF_KRETRY` unset). A Vitest case for the rule if a scene fixture makes it cheap; else say so.
3. EVERY changed place against the start over ALL the test mazes (A_3 = link A to A_d, D_1 to D_a; links as
   in `.claude/probes/K1551/` and `.claude/probes/K1482/s36/`), border look. The mirror lists them without a
   capture (start against candidate on one frozen scene; stage 40's tools under `.claude/probes/K1482/s40/`
   and its handoff show how, and how far its list matched the captures): run it on every maze and write the
   list with coordinates and px. Captures confirm: ONE session per maze, loads start, candidate,
   start, candidate, compared only within the session (start against start and candidate against candidate
   must be 0 px). Capture link A first, then the mazes with the most listed places. A maze takes about
   4.7 min under the lock: name every maze you did not capture.
4. For EVERY captured changed place one sheet in stage 39's layout (before | candidate; wide and close, as
   drawn and brightened; two pictures per row, at most 1800 px wide), a `places.txt`, and a table: maze,
   coordinates, px changed, one plain line on what is drawn before and after. For t81s and t4s also the fill
   look (`&tlk=fill`) and `&gfk=0`.
5. Cost, as numbers for Levi: the largest program's text growth in chars, and its cold compile seconds
   against the start's with Run M's tools (`.claude/probes/K1552/`; `### Handoff 27M` in
   `docs/design/K1531_muse_batch27.md`), under the lock.
6. Guards on your candidate with `GF_KRETRY=1`: `guards.ps1 -Tag s41 -Port <p> -Ref <your commit> -BaseRef
   <your start commit> -BarPort <p2> -OutDir .claude/probes/K1482/out/s41/guards -Owner <you> -NoBar`; then,
   if 35 min remain, the K1436 bar (`-BarOnly`): new / grown / gone per scene and its verdict line.

**Setup and rules.** `Get-Date` first. Your worktree starts from master: name its commit in the handoff
(Muse runs land fixes on master while you work: your start commit is the base of every comparison). The
stages' tools live on stage 40's branch; take the tools only, never its `src/`: `git checkout worktree-agent-ac98db1b4872d612b --
.claude/probes/K1482/s37 .claude/probes/K1482/s39 .claude/probes/K1482/s40`, then commit them. Stage 38's
candidate at t81s (the under thread's width; not landed) is not your start. Never push, never rebase, never
merge another stage's branch. Ports 6360-6379. Outputs under `.claude/probes/K1482/out/s41/` (untracked;
never `git add -f` them), tools under `.claude/probes/K1482/s41/` (tracked). A build of a commit:
`scripts/preview.ps1 -Port <p> -Ref <commit>`. One capture at a time, machine-wide: every capture and guard
through `scripts/perf_lock.ps1` (Muse runs share the lock; wait inside ONE blocking command; leave no lock
behind). `&snd=none` in every shot; never Chrome's `--virtual-time-budget`; Node probes as `node
scripts/run_node.mjs <entry.ts>`. Do not edit `LEDGER.md`. Commit at each milestone (WIP counts), and keep
two or three lines of notes under `### Notes K1482 s41` in this file as you go. Keep tool output short (cut
long lines; view pictures as crops, not whole sheets). Read code through the shell (`Select-String`, ranges
of `Get-Content`); the Read tool only just before an Edit. Clean up at the end: previews stopped, no lock
held, your temp folders and Chrome profiles removed; never touch `$env:TEMP\k1482s27live-profile-20548` or
another stage's folders.

**Stop rule.** Stop when the list is done or 2 hours after your start (`Get-Date` at the start and at each
milestone), whichever comes first; then commit WIP, append `### Handoff K1482 s41` to this file (what draws
each corner, the rule, the numbers, the cost, what did not run, the sheets' paths, the commit to build as
the candidate) and report. A compaction or context size is not a stop: after one, re-read this brief and
`git log`. If no rule rounds t81s's corner without breaking another place, say so with the numbers and stop.
The report ends with a `Ledger items` list and the handle fields (owner, branch, last commit, evidence,
next).
