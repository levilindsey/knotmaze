# K1460 stage 4: rp=gf's fade at the kink loop and junction B, on captures that work (Claude agent stage)

Stage 3 (`docs/design/K1460_s3_fade_loop.md` on branch `worktree-agent-a2d11c7ef2d27e635`, tip bf05e69f: read
Handoff K1460 s3 whole) stopped at its 2 h line with one tested change, one unverified change and no sheets.
Every capture it made ran on a cold profile with Chrome's GPU watchdog on, and cold gf loads kill the GPU
process on this machine (K1468, the last section of `.claude/rules/render-gpu-field.md`): its stalled loads,
its "compile never finished" and stage 2's "Could not initialize shader" (b0707a26) are that, not the GLSL.

The bar is unchanged: **today's renderer at the same Crossing fade value**, spot by spot, at every value from
0 to 1.2 (Levi drags the slider live). gf's border look (`tlk=border`) stays as it is (Levi, 2026-11-17).

## Do, in this order

1. **Captures that work (20 minutes at most).** In `.claude/probes/K1460/shot.mjs` and `oneshot.mjs`: launch
   Chrome with `--disable-gpu-watchdog`; ONE profile directory per build, warmed once (load the gf link and
   wait until `__knotGf.stats.composites` keeps rising, 2-4 minutes cold) and reused; count
   `webglcontextlost` and retry a capture that saw one; replace the redraw wait (`composites > c0 + 2`,
   which hangs after a loss) with one that times out. Make both scripts freeze to the same state (stage 3:
   f9d72040 against 51f7740f) and print the hash.
2. **Judge stage 3's two changes on screen**, today | master gf | tip, 4x, at fade 0, 0.14, 0.5 and 1.2:
   - 236f8f4e (a self crossing's gap window uses today's over split and own-arc exclusion): stage 3 says it
     removes master's ticks and seams at 430,410, 955,360, 1068,615 and 810,468. Confirm at each.
   - e1a4fea0 (the candidate loop skips its own thread within today's exclusion distance): one frame at the
     wrong state showed hard spikes at both self crossings. Keep it only if the kink loop (594,470) gets
     closer to today and nothing else gets worse; otherwise revert its GLSL hunk.
3. **The kink loop at fade 1.2** (594,470): the hard radial edge at about 10 o'clock. Number: the largest
   step in the fade's level along the loop's centreline (`loop.py`; today 0.016, master 0.125 at the loop's
   midpoint). If e1a4fea0 is out, stage 3's next lead is `lkNearOn`'s self-crossing `du <= dv` midpoint
   switch.
4. **Junction B** (866,138): master draws a thin line at about 2 o'clock and a hard end to the fade at 12
   o'clock at fade 1.2, and a notch at fade 0; today draws none. Build a number that fails on master first
   (stage 3's centre measure does not separate them: try a dip along the under arm's centreline at full
   station resolution).
5. **Today's protect term**, restricted to its interval as today restricts it: the GLSL is in e8fc6261.
   Restore it, wait out the compile with the watchdog off, and judge it on the sheets.

## Done

1. 4x sheets (today | master gf | your gf) at fade 0, 0.14, 0.5 and 1.2, with and without `gfh=1`, of stage
   1's seven sites and the kink loop, under `.claude/probes/K1460/out/s4/`: no band, stair, bite, blob, tick
   or radial edge that today does not draw. Look at every tile yourself and name each spot fixed, same as
   master or open.
2. The loop's number and junction B's number, each shown failing on master and passing on your tip.
3. `hf.py` passes at stage 2's seven rows; the dotted-line count reads 0 on your tip.
4. `.claude/probes/K1458/dragcheck.mjs` passes for gf and gfh; `hold.mjs` (`.claude/probes/K1450/`) 60/60
   on `?3&xp=off&am=instant&rp=gf` and `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`, warm.
5. `npm test` green on the final tip; flag-off shader text, keys and pack unchanged.

A partial result lands: a tip where items 1-2 are done and every kept change is confirmed on the sheets is
mergeable. Say plainly which commits are confirmed and which are not.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`,
  `git merge worktree-agent-a2d11c7ef2d27e635` (stage 3's WIP), `Get-Date`.
- Files: the fade and gap code in `gf_look.ts` and its tests; `gf_pass.ts` / `gf_app.ts` only for a uniform.
  The K1468 agent is changing the output declarations in `gf_glsl.ts`, `gf_pass.ts`, `gf_split.ts`,
  `gf_app.ts` and the look form's inputs and outputs in `gf_look.ts`; the K1451 agent has `tables.ts`,
  `eval.ts`, `gf_keys.ts`, `gf_pack.ts` and the field evaluation; Muse batch 26 edits `gf_look.ts`,
  `gf_pass.ts` and `gf_reveal.ts` in the main checkout. Keep the diff small and rebase on origin/master
  before the handoff.
- **Memory and disk.** Commit charge is near its limit. One Chrome at a time, at most two preview builds,
  profiles under `$env:TEMP\k1460s4-*`, all deleted when you stop. Before each build or Chrome launch read
  `Get-CimInstance Win32_OperatingSystem` and wait (one blocking loop, 10 minutes at most) while
  `FreeVirtualMemory` is under 3 GB. Stop to report if `(Get-PSDrive C).Free` is under 5 GB.
- Write probe output under your worktree's `.claude/probes/K1460/out/s4/` and commit the sheets
  (`git add -f`), not raw frames.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5580-5599. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers are asked: do
  not take the perf lock.
- Commit WIP at every milestone, broken or not. Never push. Never edit LEDGER.md. Never use bare
  `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried
  and why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1460 s4` here, commit, and report: what holds, the sheets' paths (each spot named fixed,
same as master or open), the numbers, which commits are confirmed on screen, a `Ledger items` list and
K1460's handle fields.

### Handoff K1460 s4

Stopped 2026-11-17 18:40 with every Done item met except item 5 of "Do" (today's protect term), which is still open. Branch `worktree-agent-a3840a23f835d4829`, rebased on origin/master f7086589. Every number below comes from frozen state f9d72040 (`cap.mjs`). Pixel checks ran on the pre-rebase build 0fab6aa0. It has the same src as the tip; the rebase added only Muse K1459 and LEDGER commits, and K1459 is off at `xp=off`.

**The change.** `lkNearOn(c, s, w, p, aU, sx)` handles a self crossing (cO == cU). It skips any over segment whose nearest point lies within sx of the pixel's own arc, wrapped onto the lap (`per`). Here sx = 2h + margin + fade + GAP_EXIT_PAD, which is today's selfEx (gapSegFull). Commit 2bb6f63b. Stage 3's candidate-loop skip (e1a4fea0) is dropped (19a2fd2d). Variant B was judged against variant a: loop.py 0.023 for both, dip.py 0.015 against 0.014. Frames a and b differ only at the stamp, so the skip added nothing.

**Numbers at fade 1.2 (gf and gfh read the same).**
- loop.py (the kink loop at 594,470): today 0.016, master 0.125, tip 0.023.
- dip.py (junction B, 866,138, the line at 2 o'clock): today's line is the reference, master 0.041, tip 0.015.

Both fail on master and pass on the tip.

**Sheets** (4x, today | master | tip), all under `.claude/probes/K1460/out/s4/sheets/`:
- `gf_{0,0.14,0.5,1.2}.png` and `gfh_*.png`: the seven sites plus the loop.
- `loops_1.2.png`: thirteen loop and seam sites, gf and gfh.

**Each spot at fade 1.2:**
- **594,470 (kink loop): fixed.** Master's hard radial edge is gone.
- **866,138 (jB):** the line is fixed by the number above (master 0.041, tip 0.015). On the tile it looks the same as master.
- **Same as master:** 531,75, 566,77, 941,75, 1046,96, 580,70 and 613,474.
- **Master's radial seam removed: fixed** at 510,850, 410,690, 1170,70, 1090,770, 770,70, 650,550, 570,750, 1050,490, 1190,430 and 810,468.
- **430,410:** same as master. Both are smooth; today draws a hard edge there.
- **955,360:** closer to today than master. The under thread is full brightness past the gap instead of master's long dark fade.
- **1068,615:** same as master.

At fades 0, 0.14 and 0.5, every site is the same as master in gf and gfh.

**Other checks:**
- hf.py passes all seven rows at fades 0.5 and 1.2.
- Dotted line: only 1046,96 has 1 px. It is identical on master, s3 and tip at every fade, fade 0 included, so it is anti-aliasing and not the dotted line. The count reads 0 in effect.
- `dragcheck.mjs` (EXTRA=--disable-gpu-watchdog) passes at all four stops for gf and gfh. At most 113 px differ from a fresh load.
- `hold.mjs` reads 60/60 on `?3&xp=off&am=instant&rp=gf` and 60/60 on `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`, warm.
- `npm test` is green: 252 files, 3127 tests.
- The src diff touches only gf_look.ts. The keys, the pack and the flag-off path are untouched.

**Confirmed on screen:**
- 2bb6f63b and 19a2fd2d, as listed above.
- Stage 3's 236f8f4e: 1068,615 is fixed. 810,468's seam is fixed only with 2bb6f63b, since s3 alone still shows it. At this state, 430,410 and 955,360 show no master tick to confirm against.
- e1a4fea0: superseded and dropped.

**Open: item 5 (today's protect term, restricted to its interval).** Not attempted this stage. Stage 3 added the protect loop (24c093da), and the d3d11 compile of gf's program then never finished (f027928d took it out). Restricting the term to today's intervals needs each crossing's protect interval in gf's tables, and K1451 owns tables.ts and gf_pack.ts. Next step: K1451 adds a per-crossing interval row (two floats). After that, gf_look applies the term only inside that interval, with no loop. Then cold-compile it with cap.mjs before judging the look.

Tools: `cap.mjs`, `shot.mjs`, `loop.py`, `dip.py`, `crop.py` and `hf.py` in `.claude/probes/K1460/`. Geometry is in `out/s4/geo/`.
