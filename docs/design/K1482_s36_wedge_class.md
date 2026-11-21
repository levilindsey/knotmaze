# K1482 stage 36: the wedge class on link A's sister mazes

Added 2026-11-20 16:40 by the coordinator (claude session 09c7a672). One stage, one agent, 2 h.

## Why

Stages 7 to 35 fixed rp=gf's border look on link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`,
seed 3) one place at a time. Muse run 27L then counted fault kinds on 20 other mazes
(`### Handoff 27L` in `docs/design/K1531_muse_batch27.md`; tools `.claude/probes/K1551/census.py`, `calib.py`;
outputs, untracked, in the MAIN checkout: `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1551\out\27L\`,
one folder per maze with `gf.png`, `sites_gf.json`, `scores.tsv`). The commonest kind is the WEDGE (an ink
blob wider than 1.85 strokes at a junction or an under-tail end): on the ten mazes with link A's settings 264
of 3,602 sites; A_5 44, A_8 42, A_7 41; link A itself 21. On link A the detector is right about half the time
(even sites: 6 of 9 real wedges flagged; 2 clean and 3 other-kind sites flagged too). Not known: how many of
those 127 flags are faults by Levi's bar, and whether they share a cause. The census frames are of an older
build (before stage 34b, ac4387f28): capture again on your starting commit.

## The bar (Levi's approved look; binding)

- At junctions and under-tail ends the over thread's outline runs on unbroken: no dot, stub, wedge, tick,
  notch or sliver. Slivers are accepted (Levi: "Fix the wedges and notches, accept the slivers").
- The under pass keeps its width and its heading: never trade a hook for a point.
- Never remove a thread's border: every thread at the place still shows both borders, its width, its heading.
- A step where an under thread's edge meets the over thread's border is WANTED (t81s), not a fault.
- gf's border look is its own: today's renderer's border strokes are not a bar and not a target.

## The stage

Goal: on A_5, A_7 and A_8 the commonest REAL wedge cause is gone as a class: a rule read from the tables,
never a per-site patch. You own the technique. A way to get there:

1. Class the 127 wedge-flagged sites (4x tiles, `.claude/probes/K1482/tiles.py`): a fault by the bar or not;
   for the faults, the cause, read from the CPU mirror (`GfEval` in `src/render/gpu_field/eval.ts`: which
   piece and which rule inks the blob). Count per cause and per maze.
2. Fix the largest cause in `tables.ts` / `gf_pack.ts` / `eval.ts` / `gf_glsl.ts`, CPU mirror and shader line
   for line. Shader text is compile time on a first visit (K1565; run 27M's numbers): prefer a term in an
   existing loop to a new loop, and report the characters added.
3. If the flags are mostly not faults (detector noise on fat strokes), the classing with its numbers and
   sheets is the finished stage: say so and stop.

## Done

1. The classing table is in the handoff: 127 sites, fault or not, cause counts per maze, one sheet per cause.
2. Every site of the fixed cause viewed again after the fix: the fault is gone at 9 in 10 or more, and none
   is replaced by another fault (no hook traded for a point, no border removed, no new stub or notch).
3. Link A, border look, starting commit against yours in ONE capture session (stage 34's tools,
   `.claude/probes/K1482/s34/`; stage 35's are on branch `worktree-agent-a36a75a8057e449f5` under
   `.claude/probes/K1482/s35/`, read them with `git show`, copy what you use into `s36/`): every changed place
   listed and viewed. j59, t23e, t84e and t81s stay at 0 px: they are with Levi or closed. If your rule moves
   one of them, do not exempt the site: the stage ends as a CANDIDATE with their before and after pictures.
4. The other mazes: A_4, A_6, A_9 to A_d and the ten D mazes, changed places counted per maze; at least 20
   viewed across them, and every D-maze change. A place that got worse stops the landing: report it.
5. Guards on your last commit, `GF_KRETRY=1`: `.claude/probes/K1482/guards.ps1` (hold 60/60, hold_gfk0,
   panelopen, dragcheck, dragcheck_b, npm test) and the bar (`-BarOnly`, new 0, grown 0). `npm test` with
   `GF_KRETRY` unset. The fill look (`&tlk=fill`) and `&gfk=0`: 0 px on link A, or each place explained.
6. Pictures for the coordinator's look, untracked under `.claude/probes/K1482/out/s36/pics/`: per cause one
   before | after sheet of six sites, as drawn and contrast-stretched, with the threads around each site,
   no wider than 1800 px; link A's changed places the same way. Paths in the handoff.

## Rules of the run

- Out of scope: `gf_look.ts` (a Muse run edits it), `gf_app.ts`, `gf_pass.ts`, the fill look, slivers, the
  rounder corners (K1559, K1555), stage 35's candidate (do not merge or cherry-pick 9d42c8f90; if your rule
  touches `arms34()`, `member()` or `homeBurial()` say so in the handoff).
- Never change a file in the main checkout (`C:\Users\lsl\Repositories\knotmaze`): Muse works there. Read only.
- Captures go through `scripts/perf_lock.ps1` (one capture session at a time on this machine), every look
  link with `&snd=none`; an rp=gf shot counts only once `__knotGf.stats.passes` > 0; compare only loads of
  one session, and a session whose same-build loads differ is not counted. Ports 6291 to 6299. Do not delete
  the kept Chrome profile `$env:TEMP\k1482s27live-profile-20548`; copy it for your own profiles.
- PowerShell. Node probes: `$env:GF_KRETRY = '1'; node scripts/run_node.mjs <entry.ts> ...` (not `npx tsx`).
  Read code through the shell (`Select-String`, ranges of `Get-Content`); the Read tool only before an Edit.
- Tools tracked under `.claude/probes/K1482/s36/` (`git add -f`), outputs untracked under
  `.claude/probes/K1482/out/s36/`: never `git add -f` an output. This branch is on the new history: never
  merge or rebase onto a branch that holds d39e363fe.
- Commit WIP at every milestone, broken or not. Never push. Never edit `LEDGER.md`. No helpers.
- STOP RULE: stop when the stage is done or 2 h after your start (`Get-Date` at the start and at each
  milestone), whichever comes first; then commit WIP, append `### Handoff K1482 s36` to this file (what
  holds, what does not, numbers observed against inferred, picture paths) and report. Neither a compaction
  nor context size is a stop: after a compaction re-read this brief and `git log`.
- The report ends with a `Ledger items` list and the handle fields (owner, branch and worktree, last commit,
  evidence, next).
