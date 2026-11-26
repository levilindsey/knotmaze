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

## Handoff (stage 2)

Stopped 23:41 at the 2 h cap. Branch `k1395-s2` (worktree `.claude/worktrees/k1395-s2`); the code is in
dc615c6bc and d49141ea4.

**Cause (measured), and the two fixes.**
1. gf's `attach()` sets `filletLayer` to null. So `rebuildFillets` returned early under rp=gf, and
   `junctionCutEntries` stayed empty: 0 entries, against 427 for today's renderer on the link. K1459's FX
   bake therefore had no junction side cuts, and gf coloured every stretch that today's renderer cuts at a
   junction.
   - Fix: in `gf_app.ts`, `jnEntries` re-runs `rebuildFillets` with the hidden fillet layer on every frame
     that bakes the reveal (`if (rvDrawn) jnEntries(r)`).
   - Cost: about 7 ms of main per revealing frame on the desktop. The Pixel is not measured.
2. K1459 baked the LEFT margin into .z. But lkJCut reads .z on the `sd < 0` side, and that side is the RIGHT
   one: samp_table's left is (-t.y, t.x).
   - Fix: `GfFxTable` now bakes .z = right and .w = left. The shader text is unchanged.
   - `test/render/gf_fx.test.ts` follows the swap.

**Checks.**
- `npm test` is green and `npm run build` passes. No pin was re-frozen.
- Today's renderer is untouched: the golden tests are green.

**Coloured pixels, gf now / today** (frames f0..f7 at 0, .1, .25, .4, .55, .7, .85 and .97 of the reveal):

| mode | ratios | gf before | mean colour diff |
|---|---|---|---|
| levi | 1.00 .90 .90 .86 .90 .93 .99 1.00 | 1.96 max | 0-8.5 levels |
| dust | 1.00 1.00 .87 .86 .91 .87 .91 .94 | 1.43 max | 0-6.4 levels |
| roots | 1.02 1.02 .96 .97 .98 .99 .99 1.00 | 1.42 max | 0-13.3 levels (before: 0.1-14.1) |
| rainbow | 1.06 .89 .93 .92 .95 .92 .96 .96 | 1.43 max | 10-45 levels (before: 12-46) |
| comet | 1.00 1.04 **.74 .84** .86 .91 .97 .94 | 1.64 max | 0.2-4.8 levels |
| burn | 1.00 .90 **.81 .85** .88 .90 .96 1.00 | 1.93 max | 0-9.5 levels |

Notes on the table:
- Burn f3 is 18,914 / 22,287 = 0.849.
- Rainbow's colour difference is the reveal front's sparks. They land in different places on every load
  (`rainbow_f3_c1.png`), and gf before reads the same.
- Roots' 13 levels at f2 and f3 were there before this stage.

**At rest** (PINREST: clocks pinned, view bit-still), gf now against gf before:
- 0 px for instant, rainbow, dust, roots, levi and burn.
- Comet: 711 px. That load settled on a view 2.4e-6 off (21.2968325 against 21.2968301), the known split
  between two loads (render-gpu-field.md). This is inferred to be the view, not the renderer, because the
  five pairs whose views matched read 0 px.

**Modes.**
- Done: levi, dust and roots (roots' colour difference was already there).
- Rainbow: done on counts. Its colour bar is unmeasurable while the sparks dominate.
- Comet and burn: not done. They under-colour at f2/f3 (0.74 / 0.84 and 0.81 / 0.85).
  - The crops (`comet_f2_c1.png`, `comet_f3_c1.png`, `burn_f2_c1.png`) show gf's coloured stretches ending
    short of today's near the reveal front.
  - Candidates, neither tested: the composite's thresholded border fade (step 3 below); and junction cuts now
    reaching stretches at the front.
- Step 3 (a border fade linear in alpha) was not done.

**Sheets** in `.claude/probes/K1395/s2/out/sh/` (untracked):
- per mode, `<mode>_sheet_whole.png` and `<mode>_sheet_crop0.png` (comet also has `_crop1`);
- `<mode>_f<k>_c1.png`: today | gf before | gf now, at 3x;
- the frames and logs (`<mode>_<today|before|now>_f<k>.png`, `.log`).

**Recapture:** `sheets.ps1` under `scripts/perf_lock.ps1`, then `counts.py` and `sheet.py`. "Before" is the
b92885825 preview on 5631 (`scripts/preview.ps1 -Ref b92885825 -Root .claude/probes/K1395/s2/pv`), and "now"
is the worktree's dev server on 5630.

**Next.** Make the composite's border fade linear in alpha. In `LOOK_COMP_FS`, ink and cov are scaled by
alpha before the 0.36 threshold. This needs a cold compile. Then re-run the comet and burn sheets. If f2/f3
stay under, attribute the stretches at the front by turning the cuts off. Also measure `jnEntries`' cost on
the Pixel before landing.
