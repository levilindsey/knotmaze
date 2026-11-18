# K1460 stage 3: rp=gf's fade at the kink loop and junction B (Claude agent stage)

Stages 1 and 2 (`docs/design/K1460_gf_fade_leftovers.md`, `docs/design/K1460_s2_fade_bands.md`: read both
handoffs whole) removed the dotted line, the kink-loop tick and the radial bands on long fades (`lkTanS`,
8d0430c4, merged). The bar is unchanged: **today's renderer at the same Crossing fade value**, spot by spot,
at every value from 0 to 1.2 (Levi drags the slider live). Stage 2 lost most of an hour to a full C: drive,
so several of its Done items carry over.

## What is left (1600x900, DSF 2, state 49c20566; stage 2's crops `.claude/probes/K1460/out/b1/kj2.png`, `s12.png`)

1. **The kink loop at fade 1.2** (594,470): gf's fade ends in a hard radial edge at about 10 o'clock on the
   loop; today fades only the lower left and has no edge. First step (Handoff s2): in a probe build switch
   off the baked gap window (`lkWinM`), the far reach (`lkNearOn`) and the candidate loop, one at a time, to
   find what draws the edge.
2. **Junction B** (866,138): a thin dark line at about 4 o'clock on the ring where the under arm meets the
   junction, at 0.5 and 1.2, and a small round blob at fade 0. Today draws neither.
3. Today's protect term (pr), restricted to its interval as today restricts it, is not in gf's gap window.
4. The bands number on the second link: three sites you pick on `?3.FGH1HtvQeDjm6e4BII` (`hf.py`).
5. Today's tiles read darker than gf's in every sheet: capture or look? Compare one ordinary load of each
   on the same link and state (`?3&xp=off&am=instant` with and without `rp=gf`); report it, and fix it only
   if it is in the fade's code.
6. `b0707a26` ("Could not initialize shader"): stage 2 found the message is Pixi's and that master failed
   the same way on the overloaded machine. Load b0707a26 alone, five times, to close it.

## Done

1. 4x sheets (today | master gf | your gf) at fade 0, 0.14, 0.5 and 1.2, with and without `gfh=1`, of stage
   1's seven sites and the kink loop, under `.claude/probes/K1460/out/s3/`: no band, stair, bite, blob or
   radial edge that today does not draw. Look at every tile yourself and name each spot fixed or open.
2. A number for item 1 and one for item 2, each built first and shown failing on master (for the loop: the
   largest step in the fade's level along the loop's centreline against today's).
3. `hf.py` passes at stage 2's seven rows and the three new sites; the dotted-line count fails on c5fc87d1
   and passes on your tip.
4. Twenty loads of your tip (ten per link) with no shader error.
5. `.claude/probes/K1458/dragcheck.mjs` passes for gf and gfh; `hold.mjs` (`.claude/probes/K1450/`) 60/60
   on `?3&xp=off&am=instant&rp=gf` and `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`.
6. `npm test` green on the final tip; flag-off shader text, keys and pack unchanged.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `gf_look.ts` and its tests; `gf_pass.ts` / `gf_app.ts` only if the fix needs a uniform. Muse batch
  26 edits `gf_pass.ts`, `gf_app.ts` and `gf_look.ts` in the main checkout: keep the diff small and rebase on
  origin/master before the handoff. Hands off `tables.ts`, `eval.ts`, `gf_keys.ts`, `gf_pack.ts` and the
  field evaluation in `gf_glsl.ts` (the K1451 agent).
- gf's border look (`tlk=border`) stays as it is (Levi, 2026-11-17).
- **Disk.** C: filled to 0 bytes on 2026-11-17 from agents' Chrome profiles and preview builds. Use ONE
  Chrome profile directory and at most two preview builds at a time, under `$env:TEMP\k1460s3-*`; delete
  them when you stop. Check `(Get-PSDrive C).Free` at each milestone and stop to report if it is under 5 GB.
- Write probe output under your own worktree's `.claude/probes/K1460/out/s3/` and commit the sheets
  (`git add -f`), not raw frames.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5580-5599. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers are asked: do
  not take the perf lock. A new build's first gf load takes about two minutes to compile.
- Commit WIP at every milestone, broken or not. Never push. Never edit LEDGER.md. Never use bare
  `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried
  and why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1460 s3` here, commit, and report: what holds, the sheets' paths (each spot named fixed
or open), the numbers, a `Ledger items` list and K1460's handle fields.
