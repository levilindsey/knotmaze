# K1395 stage 2: rp=gf's reveal colours only what today's colours, mid-reveal

Read first: `K1395_s1_brief.md` with its handoff (stage 1's tools are on master under
`.claude/probes/K1395/s1/`: `run.ps1`, `pinsheet.mjs`, `sheet.py`, `sat.py`, `overlay.*`, `fxdone.mjs`,
`cmp.py`). Base: `origin/master` (stage 1's rainbow stripe order landed; `rp=outline` is deleted, K1618, and
with it `RevealFx.revealWidth`).

## Goal

Mid-reveal, in every appearance mode, gf colours whole stretches of thread that today's look leaves
uncoloured: 35 to 60% more coloured pixels (comet 44.7k against 73.8k at the 0.4 frame, levi 39.7k against
64.2k at 0.55). Stage 1 ruled out the reveal masks and widths, the clocks, which threads have effects
running, and the thread positions. Its untested suspect: gf works out each thread's fade-in alpha once per
sample point ahead of time, today's works it out per pixel.

## This stage

1. Find the cause by measurement, starting with stage 1's next step: on one comet thread at the 0.4 frame,
   gf's per-sample alpha beside a readback of today's per-pixel alpha; find where gf shows a stretch today
   hides.
2. Fix it, so that mid-reveal gf colours the stretches today's colours (coloured pixel count within 15% of
   today's at every sheet frame, in each mode you finish), with the colour where both colour staying within
   stage 1's 4 to 11 levels.
3. If time remains: the border's fade for dust and comet follows the alpha linearly as today's does, and a
   capture of burn.

Files: gf's reveal path in `src/render/gpu_field/` and what it reads. Nobody else is working in `gpu_field/`
now; still keep out of the gap pass (`lkBall`, `lkCut`, `lkGap`) and the junction rule unless the border fade
needs it, and name it if so. Today's renderer stays byte-identical (the golden tests). With the reveal
finished and with `am=instant`, gf's picture equals master's pixel for pixel (clocks pinned, the view held
still, as stage 1 did).

## Done

1. Src, tests, `npm test` green, `npm run build` passes, every re-frozen pin named.
2. Per mode (levi, rainbow, dust, roots, comet, burn): one sheet `today | gf before | gf now` at the same
   reveal times on `?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1`, large enough to read (crops, not only the whole
   maze), viewed by you, with the coloured pixel counts per frame.
3. The at-rest equality above.
4. Modes done and not done, with what each lacks.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1395-s2`, branch `k1395-s2`, from `origin/master`;
`node_modules` as a directory junction to the main checkout's (never `npm install`). Write ONLY inside your
worktree (stage 1 slipped a file into the main checkout). Read code through the shell; the Read tool only
just before an Edit, and for images. Real-time captures only, under the perf lock (`scripts/perf_lock.ps1`),
ports 5630 to 5634. Commit WIP at every milestone (`git add -f` for probe tools, never their outputs). Never
push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome `--virtual-time-budget`.
Helpers on sonnet, mechanical work only; looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first; finish whole modes. A compaction is
not a stop: re-read this brief and `git log`. This is the second stage: if the over-colouring cannot be
fixed, stop and say so with pictures. On stopping: commit WIP, append `## Handoff (stage 2)` here, commit,
and report: verdict first (safe to land or not, which modes), sheet paths, counts, a `Ledger items` list and
the handle fields.
