# K1460 stage 5: today's protect term in rp=gf's gap window, and junction B (Claude agent stage)

Stages 1-4 (`docs/design/K1460_s4_fade_loop.md`: read Handoff K1460 s4 whole) removed the dotted line, the
kink-loop tick, the radial bands, the kink loop's hard edge and the radial seams at long fades (all merged).
The bar is unchanged: **today's renderer at the same Crossing fade value**, spot by spot, at every value from
0 to 1.2 (Levi drags the slider live). gf's border look (`tlk=border`) stays as it is (Levi, 2026-11-17).

Since stage 4: K1451 stage 4 (ae2b4dfb, `tables.ts`) and K1468 (fc520c2d: every gf program writes one packed
RGBA32UI target, so a cold load no longer hangs the GPU process) are merged. A fresh build's first gf
composite takes 85-180 s cold and no longer needs `--disable-gpu-watchdog`; a profile is warm only for the
exact links it has loaded.

## Do

1. **Today's protect term.** Today scales a crossing's cut by a lower piece's cover inside an interval
   (`gap_mask.ts`: pr = gapInterval x gapProtCover). gf's gap window has no such term. Stage 3's per-pixel
   loop form (the GLSL is in commit e8fc6261 on branch `worktree-agent-a2d11c7ef2d27e635`) was taken out
   unjudged. Stage 4's plan: a per-crossing protect-interval row (two floats) in gf's tables (`tables.ts`,
   `gf_pack.ts`), read in `gf_look.ts` with no loop. First find the spots where it matters: sites on
   `?3` and `?3.FGH1HtvQeDjm6e4BII` where today's protect is over 0.2 (dump them from today's gap data), and
   crop today | master gf there at fade 0, 0.14, 0.5 and 1.2. If no site shows a difference you can see at 4x,
   stop this item, say so with the sheet, and go to item 2.
2. **Junction B** (866,138 on `?3`, 1600x900 DSF 2, state f9d72040): stage 4's `dip.py` number passes on
   master's tip (0.015 against 0.041), yet the tile looks the same as before: a thin line at about 2 o'clock
   and a hard end to the fade at 12 o'clock at fade 1.2, a notch at fade 0; today draws none. Make a number
   for each that fails on master, then fix them.
3. `hold.mjs` (`.claude/probes/K1450/`) takes extra Chrome args from `EXTRA`, as `dragcheck.mjs` does.

## Done

1. 4x sheets (today | master gf | your gf) at fade 0, 0.14, 0.5 and 1.2, with and without `gfh=1`, of the
   protect sites, junction B, stage 1's seven sites and the kink loop, under `.claude/probes/K1460/out/s5/`.
   Look at every tile yourself and name each spot fixed, same as master or open.
2. Each number shown failing on master and passing on your tip; `loop.py`, `dip.py` and `hf.py`'s seven rows
   still pass.
3. `.claude/probes/K1458/dragcheck.mjs` passes for gf and gfh; `hold.mjs` 60/60 on
   `?3&xp=off&am=instant&rp=gf` and `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`, warm.
4. A cold load of each link on a fresh profile with the watchdog ON reaches gf's first composite with no
   context loss on the app's canvas and no dump under `<profile>/Crashpad/reports`
   (`.claude/probes/K1468/gfts.mjs <url> <profileDir> 240`; its one CTXLOST in the first second is a
   detached 0x0 probe canvas, not the app's); say how long it took beside master's.
5. `npm test` green on the final tip; with home off and the fade at its default, gf's digest is unchanged
   unless a spot above needed it (say which).

A partial result lands: say plainly which commits are confirmed on the sheets and which are not.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `tables.ts`, `gf_pack.ts`, the fade and gap code in `gf_look.ts`, their tests. Another agent (K1468
  stage 2) edits the targets and output writes in `gf_pass.ts`, `gf_app.ts`, `gf_split.ts`, `gf_glsl.ts` and
  the look form's inputs and outputs; Muse batch 26 edits `gf_look.ts`, `gf_pass.ts` and `gf_reveal.ts` in
  the main checkout. Keep the diff small and rebase on origin/master before the handoff.
- **Memory and disk.** One Chrome at a time, at most two preview builds, profiles under
  `$env:TEMP\k1460s5-*`, all deleted when you stop. Before each build or Chrome launch read
  `Get-CimInstance Win32_OperatingSystem` and wait (one blocking loop, 10 minutes at most) while
  `FreeVirtualMemory` is under 3 GB. Stop to report if `(Get-PSDrive C).Free` is under 5 GB.
- Write probe output under your worktree's `.claude/probes/K1460/out/s5/` and commit the sheets
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
append `### Handoff K1460 s5` here, commit, and report: what holds, the sheets' paths (each spot named fixed,
same as master or open), the numbers, which commits are confirmed on screen, a `Ledger items` list and
K1460's handle fields.

### Handoff K1460 s5

Agent of the coordinating claude session, stopped 2026-11-17 ~20:50 (stage done, inside the 2 h cap). The tip's `src/` and `test/` equal origin/master: both items ended without a code change.

- **Do 1, today's protect term: dropped, no visible difference.** d23f3473 baked the protect level per sample (bits 10..13 of the gap entry's V[4i+3] fraction) and multiplied it by the cover of the pieces below the label, as today does. At the 8 largest protect sites (`protsites.mjs`, `out/s5/prot_3.json`) the 4x sheets `out/s5/prot_{0,0.14,0.5,1.2}.png` (today | master gf | s5 gf | master gfh | s5 gfh) show s5 = master at every site and fade; `protlum.py`'s luminance ratios moved at most 0.03, in both directions (1031,127 at 1.2: today 0.95, master 0.92, s5 0.91). e25d042f reverts it.
- **Do 2, junction B (866,138): no gap or fade fault on master.** The fade along the loop's centreline (`prof.py`, `geo_jb.json`) matches today's within 0.03 normalised (same ramp). With gf's thread colour mapped onto today's (`recol.py`), the interior diff (`jbdiff.py`) is max 0/1/3/9-11 at fades 0/0.14/0.5/1.2, 0 px over 20, for gf and gfh alike; what is left is edge pixels and the border-look rim. The "line / hard end / notch" is gf's lighter thread colour (e195e8 against today's cc7ac0) and the Mach band it makes at the fade's end: K1389. Sheets `out/s5/jb_{0,0.14,0.5,1.2}.png` (today | master gf | gf in today's colour | master gfh | gfh in today's colour) and `out/s5/sites_{f}.png` (the seven sites and the kink loop 594,470: same as master).
- **Do 3:** `hold.mjs` takes `EXTRA` (exercised with `--mute-audio`).
- **Checks (master build 6ae3e994 on 5580 = the tip's src):** `npm test` 253 files / 3162 tests green. `hold.mjs` 60/60 on both links (gf first composite 43.2 s on the warm profile's first load, gfh 1.2 s). `dragcheck.mjs` gfh PASS at 0.5/1.2/0.14; gf PASS at 0/0.5/0.14, and at 1.2 on a rerun (the first two runs found no fresh load in state f9d72040 in 4 tries, the worker host's K550 nondeterminism, not a pixel failure). `hf.py` at 1.2 (box 20 css) and `dip.py` on jB (max 0.015) read master as before. Cold loads (`K1468/gfts.mjs`, fresh profile, watchdog on): gf first composite at 135.6 s (compileFirstMs 125.5 s), gfh at 119.9 s (109.1 s); the only CTXLOST is Pixi's probe canvas in the first second; 0 Crashpad reports. Logs: `out/s5/checks.log`, `checks2.log`, `cold1.log`, `cold2.log`.
- **Next:** K1389 (gf honours the thread look) is what is left at junction B; nothing for K1460's gap code from this stage.
