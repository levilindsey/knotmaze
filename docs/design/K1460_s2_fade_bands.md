# K1460 stage 2: rp=gf's long fades, bands and stairs (Claude agent stage)

Stage 1 (`docs/design/K1460_gf_fade_leftovers.md`, read it whole, Handoff K1460 above all; and
`docs/design/K1458_gf_crossing_fade.md` for the fade itself) removed the dotted line across the faded under
thread (a8d36be3) and the dashed tick across a kink loop (3e8f23bb). The bar is unchanged: **today's renderer
at the same Crossing fade value**, spot by spot. Levi adjusts the slider live, so every value from 0 to 1.2
has to hold.

## What is left (stage 1's sheets, `.claude/probes/K1460/out/sheet_12.png`, `sheet_05.png`, `kink4.png`)

1. **Radial bands and a stepped edge on long fades in curved threads**: the fade's ramp follows the centreline
   sample by sample, so on a curve it shows as wedge-shaped bands, and where it starts the edge steps. Sites
   (1600x900, DSF 2, state 49c20566): jB 866,138, ci3 580,70, the purple under thread at 941,75. Today's ramp
   is smooth there.
2. **The kink loop at fade 1.2** (594,470): gf's fade reaches around the loop's top and ends in a hard radial
   edge; today fades only the lower left of the loop.
3. **A dark bite at jB** where the under arm meets the junction, at 0.5 and 1.2 (master gf has it too; today
   does not), and the small round blob there at fade 0 (Handoff K1458).
4. Today's protect term (pr) is not in gf's gap window.
5. Stage 1's set-aside attempt (b0707a26: a smoothed tangent `lkTanS` for item 1, a per-pixel protect for
   item 4) failed to load with Pixi's "Could not initialize shader" and was never seen on screen. Get the
   GLSL info log first (`.claude/probes/K1460/console.mjs`), find out which change breaks the compile, and
   only then judge `lkTanS` on the bands.
6. In stage 1's sheets today's tiles are darker and duller than gf's at every site. Find out whether that is
   the capture (the frozen state, `phw=0`, SIMT) or the look, with one ordinary load of each; report it, and
   fix it only if it is in the fade's code.

## Done

1. A number for item 1 that fails on master and passes on your branch, built first: for example, along each
   faded span, the ramp's level against arc length sampled across the thread's width (today's is one smooth
   monotone ramp: count the steps over 8 levels and the width-wise spread per station), at the three sites and
   three more you pick on `?3.FGH1HtvQeDjm6e4BII`.
2. A number for stage 1's dotted line that fails on c5fc87d1 and passes on master (count only pixels within
   2 px of the over thread's edge across a faded span; stage 1's `spikes.py` drowned in 3000 shared spikes).
3. 4x sheets (today | master gf | your gf) at fade 0, 0.14, 0.5 and 1.2, with and without `gfh=1`, of stage
   1's seven sites and the kink loop: no band, stair, bite, blob or radial edge that today does not draw.
   Look at every tile yourself and name each spot fixed or open.
4. Twenty loads of your tip (ten per link, a warm and a fresh profile) with no "Could not initialize shader".
5. `.claude/probes/K1458/dragcheck.mjs` passes for gf and gfh; `hold.mjs` (`.claude/probes/K1450/`) 60/60 on
   `?3&xp=off&am=instant&rp=gf` and `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`.
6. `npm test` green on the final tip; flag-off shader text, keys and pack unchanged.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `gf_look.ts`, `gf_pass.ts`, `gf_app.ts`. Muse batches 25 and 26 edit `gf_look.ts` and `gf_pass.ts`
  in the main checkout (the burn's char, the cold first load, the reveal's ink, route bands): keep the diff
  small and rebase on origin/master before the handoff. Hands off `tables.ts`, `eval.ts`, `gf_keys.ts` and
  the field evaluation in `gf_glsl.ts` (the K1451 agent).
- gf's border look (`tlk=border`) stays as it is (Levi, 2026-11-17): do not move its strokes toward today's.
- Write your probe output under your own worktree's `.claude/probes/K1460/out/` and commit the sheets
  (`git add -f`); stage 1 wrote them into the main checkout.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5580-5599. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers are asked: do not
  take the perf lock. A new build's first gf load takes 1-3 minutes to compile. Stop your preview servers
  when done.
- Commit WIP at every milestone, broken or not. Never push. Never edit LEDGER.md. Never use bare `git stash`.
  Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried and
  why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1460 s2` here, commit, and report: what holds, the sheets' paths (each spot named fixed
or open), the numbers, a `Ledger items` list and K1460's handle fields.
