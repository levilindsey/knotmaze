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

### Handoff K1460 s3

Stopped near the 2 h line (5:06 PM, started 3:27 PM). **No Done item holds except Done 6:** `npm test` is green on the final tip (3126 passed), and src/ changes only gf_look.ts, so the flag-off shader text, keys and pack are unchanged. test/render/paint_ring_lap.test.ts gained one reviewed floor-of-division entry for e1a4fea0's lap wrap. The tip is WIP: it rebases
cleanly on origin/master and its lkGap change is not verified.

**Committed (src/render/gpu_field/gf_look.ts and test/render/gf_gap.test.ts only):**
- 236f8f4e: a self crossing's gap window (the bake) takes today's over split (GAP_OVER_RANGE capped by
  splitP/splitN) and today's own-arc exclusion (selfEx = 2 fillHalf + margin + fade + GAP_EXIT_PAD). It is
  tested (gf_gap.test.ts, the "kink loop's self-crossing window" block). On the frozen state it removed
  master's ticks and seams at the self crossings 430,410, 955,360, 1068,615 and 810,468. It does NOT change
  the kink loop at 594,470: loop.py gives the same 0.125 as master.
- e1a4fea0: lkGap's candidate loop skips its own thread within the same selfEx of the pixel's arc (period-
  wrapped). The hypothesis: the loop's halves are keyed apart, so the upper half acts as an over piece at
  distance 0 and cuts the lower half out to its window's end, the radial edge. UNVERIFIED. The one tip frame
  (out/s3/loop_tip_1.2.png, right column) is at a different, unrelaxed state (hash 51f7740f), so it
  cannot be compared with today's. It shows hard spikes at BOTH self crossings (594,470 and jB). If a frame
  at the shared state confirms them, revert this commit's GLSL hunk and keep the bake change.
- e8fc6261 added today's protect term (a lower piece's cover pr of the labelled pixel, scaling sc by
  1 - pr); 9e8e7f05 took it out again. That commit message's reason ("the compile never finished") is NOT
  established. The 60 s probe of b5940951 was too short: the tip without it (333c29ed, now 9e8e7f05) switched in
  at 54 s on one load and 28 s on the next, and K1468 on master now covers gf's cold-load hang. The protect GLSL is
  in e8fc6261 to restore from.

**Numbers (fl 1.2, the frozen state f9d72040, loop.py `out/s3/loopgeo.json 0.45`, the excess step):**
- Kink loop 594,470: today 0.016; master 0.125 at +1.90 world (the -0.2h line, the loop's midpoint);
  59c072f8 0.125.
- At fl 0.5: master 0.016, today 0.011. This number fails on master as Done 2 asks.
- jB (`loopgeo_jb.json`): not discriminating yet. Centre today 0.021, master 0.029. The lateral lines
  cross other threads (0.15-0.23 for both renderers). It needs a dip measure on the centreline at full
  station resolution.

**Sheets:**
- No 4x sheets were made.
- Partial crops: out/s3/loop_1.2.png and out/s3/jb_zoom.png (today | master), out/s3/tipchg_1.2.png
  (master | 59c072f8) and out/s3/loop_tip_1.2.png (today | master | tip, wrong state).
- Spots: 594,470 open. 866,138 open (master's line at about 2 o'clock and its hard fade end at 12 o'clock
  at fl 1.2, its notch at fl 0). The other six were not checked on the tip.

**Harness: why the captures stalled.** Per the coordinator's K1468 note (received at the stop line): every gf
  capture in this stage ran with the GPU watchdog ON and mostly on cold profiles; none ran warm with
  `--disable-gpu-watchdog`. The stalls below are most likely K1468's cold-load GPU kill (context loss and a
  recompile loop), not this build's GLSL or the freeze; no Crashpad check was made. Rerun all of them warm
  with the watchdog off.
- shot.mjs hangs on gf loads of a new build. After switch-in under the EARLY freeze, composites do not
  advance on a redraw request (3 stays 3), so its `composites > c0 + 2` wait never ends.
- The base shots for today, ma and br at f9d72040 were taken before this happened.
- .claude/probes/K1460/oneshot.mjs captures right after switch-in, but its freeze landed on a different
  state (51f7740f). Make the two scripts freeze at the same point before trusting a tip frame.
- gfh: master's gfh load drew no composite in 15 min, so there are no mah/brh shots.

**Not started:** item 3's visual check, item 4 (hf.py on the second link), item 5 (darker tiles),
item 6 (b0707a26 five loads), Done 3 (hf.py rows, dotted count on c5fc87d1), Done 4 (twenty loads),
Done 5 (dragcheck, hold).

**Next:**
1. Add `--disable-gpu-watchdog` to shot.mjs, oneshot.mjs and gfhprobe.mjs, warm the profile once per build,
   then check that oneshot and shot freeze to the same state (f9d72040).
2. Capture the tip at fl 1.2 and 0. If the spikes hold, revert e1a4fea0's GLSL hunk and look for the
   radial edge in lkNearOn's self-crossing `du <= dv` midpoint switch instead. The edge sits at the loop's
   midpoint, +1.90 of 4.08 world.
3. Then items 2-6.
