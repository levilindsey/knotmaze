# K1482 stage 23: the gated second corner try on master, behind a switch (Claude agent stage)

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** Three stages have built and
measured, and nothing is in `src/`. Stage 22's tip **C1** (a294f3271 on branch
`worktree-agent-adabb55bc67661562`; read `### Handoff K1482 s22` in
`docs/design/K1482_s22_landable_corners.md` whole) finishes j14, passes the K1436 bar on four mazes and every
guard, but on link A it also rounds 98 sharp corners Levi did not name. Whether that rounding is welcome is
his call (K1524, card out, unanswered). This stage puts C1 on master **switched off**, so that Levi can compare
the two live on his own link, the code stops ageing on a branch while master's gpu_field moves (Muse run 26Z2
edits `gf_look.ts` or `gf_pass.ts` later today), and the next corner stages start from master.

Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5). The border look draws the
outlines; `&tlk=fill` the fill.

## Do

1. `git merge origin/master` in your worktree first. Bring C1's source: `git diff a83721537 a294f3271 -- src
   test` is the whole change (87fc67c16's probe filter is gone again in 1881d319c). Cherry-pick 87fc67c16,
   1881d319c and a294f3271, or apply the net diff.
2. Add the switch: `gfk=1` under `rp=gf` (another free name if `gfk` is taken), read where `gfh` is read
   (`frame_loop.ts` about line 228, `gf_app.ts` about line 239).
   - **Off, the default: master's tables and master's picture, exactly.** No retry corner is built, nothing is
     uploaded differently, and no program text changes (the model is gfh=1's own rule in `gf_glsl.ts` about
     line 110: "without it no program changes, byte for byte").
   - **On: C1, exactly.**
   - The switch reaches every place that builds or uploads tables (the page, the worker, the Node build:
     `gf_app.ts`, `gf_worker.ts`, `gf_build.ts`, `gf_pass.ts`) and the mirror (`eval.ts`).
3. A unit test: off, a real-scene fixture's tables equal master's (the existing pins stay untouched and
   green); on, retry corners exist and every one respects both gates (GF_KRMIN, GF_KSAG).
4. Lore, in the same commits: three or four lines on the switch in `.claude/rules/render-gpu-field.md` (what it
   draws, the two gates, that K1524 decides whether it becomes the default or goes); and in
   `.claude/rules/probes.md`, where `scripts/preview.ps1` is described, stage 22's lesson: a worktree needs
   `node_modules` through a junction for `preview.ps1`, and the junction is unlinked
   (`(Get-Item <path>).Delete()`) before any `git worktree remove --force`.

Do not widen the stage: no new corner work, no knob changes. C1's 29 px fill change at 1 level (switch on) is
a filed residual; leave it.

## Done

- **Off = master.** Link A, border look and `&tlk=fill`: 0 px against a preview of origin/master on loads of
  one physics state and one view (pin the background clock and compare only loads that agree: stage 21's
  handoff, `The 76,609 px fill difference`, in `docs/design/K1482_s21_corners_rest.md`). Report the floor
  first: two captures of one build. `npm test` green with no pin re-frozen.
- **On = C1.** Link A with the switch, border look: 0 px against a preview of a294f3271 under the same
  conditions, and j14 finished by your own eye in a context crop and a detail crop.
- **The bar** on your tip (its scenes load with the switch off): `.claude/probes/K1436/k1436_bar.ps1`,
  `STRICT=1 -NoPerfLock`, scenes `ring,def,muse_hash,g41_user_tw64`, `-Base` origin/master's SHA, `-Tag
  k1482s23`: new 0, grown 0, gone 0. C1's own pass with the retry on is stage 22's (`k1482s22`); repeat it with
  the switch on only if the tool takes a link suffix without a change to it.
- Under the perf lock, on your tip: `hold.mjs` 60/60 on link A, off and on;
  `.claude/probes/K1482/s15/panelopen.mjs`; both dragchecks, off.
- The commits on your branch, in landing order, each green, holding only the switch, C1's source, the test and
  the lore lines.

## How to work

As stage 22's `How to work` (and the one in `docs/design/K1482_s20_wedges_notches.md` it points to), with
these changes: ports 6070-6089, profiles `$env:TEMP\k1482s23-*`, probe directories `.claude/probes/K1482/s23`
and `.claude/probes/K1482/out/s23` (untracked: do not `git add` raw captures or dumps). Stage 22's tools and
captures are in its worktree,
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adabb55bc67661562\.claude\probes\K1482\s22` and
`...\out\s22`: copy what you use, change nothing there. At most three preview builds alive at once; stop
yours and remove their directories when you finish (the disk is short). Muse runs capture work in the main
checkout (batch 27): it keeps off the six gf files and takes `$env:TEMP\claude-perf.lock` for up to 25 minutes
at a time, so wait for the lock in ONE blocking loop (60 min at most).

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first. This is a small stage: about an hour. Off being exact is the
stage's job, not a finding to report: if a pixel differs, find what differs and remove it. A compaction is not
a stop: re-read this brief and `git log`. On stopping: commit WIP, append `### Handoff K1482 s23` here, commit,
and report: the commits to land by SHA in order, the numbers, the sheets' absolute paths, a `Ledger items`
list and K1482's handle fields. Never push, never edit `LEDGER.md`.
