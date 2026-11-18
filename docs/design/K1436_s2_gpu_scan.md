# K1436 stage 2: the bar test on what the screen shows, and as the one bar (Claude agent stage, probes only)

Stage 1 (`docs/design/K1436_bar_test_v2.md`, read Handoff K1436 whole) built scan v2
(`.claude/probes/K1436/k1436_scan.ts`, `k1436_lib.ts`): 88% of its finds are real by eye, it finds 11 of
K1451's 12 spots, and the 12 scenes at `gfh=1` read 156 finds where v1 read 2434. Two gaps keep it from being
the bar every gf stage is judged by:

- **It scans the CPU mirror (GfEval), so it cannot see the look.** The kink-loop tick, the fade's dotted line
  and the cfg dashes' colour were all drawn by `gf_look.ts`, and Levi judges the screen ("I still see plenty
  of border artifacts", 2026-11-17, on the live page).
- **The census bars the briefs quote are still v1's** (stray / hard / paper / broken, and the tie / ramp /
  plain counts of `k1451_scan.ts`), with v1's false finds.

## Do

1. **A screen scan.** Run v2's band profile and strays on GPU captures of rp=gf (`gfh=1` and flag off) of the
   same 12 scenes at a scale where a 1 css px fault is visible. K1451 has a GPU census that captures scenes
   and compares them to the mirror (Handoff K1451 s2 in `docs/design/K1451_s2_reach_window.md` on branch
   `worktree-agent-a53218bf2f47c89c2`, and `.claude/probes/K1451/`); reuse its capture. The geometry (exposed
   edges, crossings, labels) comes from the same tables as the mirror's. Where a capture cannot give what the
   scan needs (labels, depth), take it from the mirror at the same pixel and say so.
2. **One command, one verdict.** `k1436_bar.ps1 -Ref <commit> [-Base <commit>]`: builds or reuses the two
   commits, runs the mirror scan and the screen scan on both, matches finds by site, and prints PASS or FAIL
   with the new finds, the finds that grew by more than 10% and the finds that went away, per class, plus a
   crop sheet of the new and grown ones. It writes under `.claude/probes/K1436/out/bar/<ref>/` and deletes its
   builds and Chrome profile when it ends.
3. The residuals of Handoff K1436: vdip:ramp at clean band edges beside white (3 of 6 false), rstray's 3-6 px
   finds with no ink (try a 7 px floor), and a spots mode for the def seam notches the 100 px/unit scan
   cannot see.

## Done

1. The screen scan flags, by your own eyes at 4x: the kink-loop tick on c5fc87d1 and not on master; the
   dotted line across the faded under thread on c5fc87d1 at `fl=0.5` and not on master; K1451's twelve
   spots on master. Twenty clean stretches do not flag.
2. Precision of the screen scan on master: 40 finds sampled across classes, at least 85% real, no class
   under 70%; sheets under `.claude/probes/K1436/out/s2/`.
3. `k1436_bar.ps1` says FAIL for K1451 stage 2's tip (17053a36) against master with `gfh=1` and names the new
   finds near crossing x68 and junctions j50 and j36 of `.claude/probes/K1451/out/s2/bar_home_new.txt`
   (on that branch); and PASS for master against itself on two runs (the two-load noise is under its floors).
4. The 12-scene table: mirror v2 beside screen v2, per class, `gfh=1` and flag off, with the run time. A
   list of the twenty largest screen finds on master at `gfh=1` with a crop sheet: this is the work list for
   the next junction stages, so name what each one is (stub, wedge, dash, smear, notch, tick, colour seam).
5. The residuals' precision: vdip:ramp and rstray each at least 80% real on 10 sampled finds, with stage
   1's recall unchanged.
6. "How to run" at the top of `k1436_bar.ps1`, and a paragraph for `.claude/rules/render-gpu-field.md`
   written into your handoff (the coordinator files it): what the bar is, the command, what it cannot see.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `.claude/probes/K1436/` only. Nothing under `src/` or `test/`.
- **Disk.** C: filled to 0 bytes on 2026-11-17 from agents' Chrome profiles, preview builds and scan dumps.
  ONE Chrome profile directory and at most two preview builds at a time, under `$env:TEMP\k1436s2-*`;
  delete them when you stop. Scan dumps stay under your worktree and are deleted once tabulated. Check
  `(Get-PSDrive C).Free` at each milestone and stop to report if it is under 5 GB.
- **Load.** Run at most three scenes in parallel (twelve at once ran the machine out of memory), and wait on
  `$env:TEMP\claude-perf.lock` inside one blocking command while another owner holds it (a lock older than
  30 min is stale); do not take it yourself.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5600-5619. Headed, real-time Chrome, never `--virtual-time-budget`. A new build's first gf load
  takes about two minutes to compile.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files and sheets, not for dumps).
  Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work (scans, sheets), with this stop rule.
- Own the technique: the bar is Done 1-3.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1436 s2` here, commit, and report: what holds, the sheets' paths, the numbers, a
`Ledger items` list and the item's handle fields.

### Handoff K1436 s2

Stopped at 16:56 PT, 30 min before the 2 h cap (started ~15:27): the last K1460 capture died in a context loss again (pageerror "reading 'stats'" after gf's dispose), and every remaining Done needs captures. WIP in ad7c4480 (screen scan fixes, sheet tool) and 04dd9b32 (capture,
bar script, comparison). Probes only; nothing under src/ or test/.

**What holds**
- Mirror scan, rstray floor (Do 3): rstray finds need 7 px (`K1436_RSTRAY`, default 7 in k1436_scan.ts). On the 12
  scenes at gfh=1, rstray goes from 59 to 46 finds (plain 19 -> 9, ramp 19 -> 18, tie 21 -> 19), which is the
  stage 1 JSONs filtered to px >= 7, not a rerun. The 10-sample precision check was not done.
- Mirror v2 on the 12 scenes (before the floor): gfh=1 156 finds (tie 60, ramp 25, plain 71; v1 read 2434), wall
  58 s, cpu 173 s; flag off 1164 (dstray:tie 710, rstray:tie 284, vdip:tie 116; v1 3964), wall 56 s.
- vdip:ramp has 6 finds at gfh=1 and 3 with the flag off. By eye, 3 of the 9 are false (beside white or a clean band
  edge: muse_hash 11.337:32.443, def 3.936:8.398 h0, muse_default_tw 9.714:15.219 h0). Not fixed.
- Screen scan (Do 1) runs end to end on ring at gfh=1, master, DSF 3 (~100 device px per world unit): 921 finds
  went to 3 after four fixes, each checked on a crop sheet:
  - speck took a 7x7 same-chain median, which read the fade's own gradient (8 of 8 sampled specks false). It now
    takes the 8-neighbour median and flags a deviation over 0.35.
  - The zone was a same-chain arc window, which read the border look's fade as band dips (21 of 21 vdip false).
    It is now a world disc of radius L round each under pass, over every chain.
  - The border look's stroke colour is measured (the median where the mirror ink is full), not assumed white.
  - Markers: off-colour pixels are dilated 12 px, and a disc of 2.2x the equivalent radius is masked round each
    off-colour blob of 300 px or more.
  Ring's 3 left (sheet `out/s2/ring_h1_finds.png`): 2 are the start marker, which the mask still leaks round, and
  1 is a cut at x68 where the border look's under thread ends in a tapered stub, plausibly real. align 0.101
  device px rms (not diagnosed). One scene, 13.8 s.
- Not done: the other 11 scenes, flag off, the 12-scene table, the twenty largest finds, the 40-find precision
  sample, K1460's tick and dotted line (master vs c5fc87d1), the bar runs, the def notch spots mode.

**Why the time went: rp=gf capture on a fresh build is slow and unstable**
- After gf switches in (`__knotGf.stats.switchedMs > 0`, about 50 s after load on a cold profile), it compiles
  its other programs and the frame loop stalls for 1-3 min.
- At DSF 3, and at DSF 2 on the seed-3 1600x900 K1460 link, the stall ended in a WebGL context loss: gf is
  disposed, recreated and recompiled (`sw` back to -1).
- With a warm profile on the same build and link, a capture takes about 20 s.
- Another owner's Chrome (muse K1459, lock dated 15:38, stale by 16:08) was on the GPU the whole time; that load is
  inferred as a cause, not measured.
- The K868 recipe's hash matched only on the 3rd try (0a0ee15e vs 50dd4ffd) even stepping to t - 0.008.
- k1436_screen.mjs therefore waits for 20 frames after the switch, counts losses on connected canvases, retries
  (TRIES), and closes the panel through localStorage `knotmaze.panelOpen=0` and CSS.
- k1436_dbg.mjs prints gf state every 3 s through one capture: run it first on any new link.

**Labels and depth come from the mirror.** A capture has no chain, s, depth or class: the screen scan reads them
from the mirror's GfEval tables at the same device pixel (after the align step). A fault where the screen and
mirror geometry disagree by more than ~1 px is read against the wrong labels.

**Next (stage 3)**
1. Warm the profile once per build, before timing: load each link and wait out the compile, then capture.
2. Capture the 12 scenes at DSF 3, h1 and h0, three at a time; build the table.
3. Run K1460's link (`out/s2/jobs_k1460.json`) on master and c5fc87d1 and check the tick and dotted line.
4. Run the bar, and the 40 and 10 samples.
5. Mask markers from the fabric renderer's marker positions (put them in meta.json) instead of by colour.
6. Add the def notch spots mode.

**Paragraph for `.claude/rules/render-gpu-field.md`**
> K1436 s2 (2026-11-17), screening rp=gf on the GPU: `.claude/probes/K1436/k1436_screen.mjs` captures a frozen
> K868 state in fill and border looks at DSF 3, and `k1436_screen_scan.ts` runs scan v2's band profile and strays
> on the screen's ink (labels and depth from the mirror's tables at the same pixel). `k1436_bar.ps1 -Ref <c>`
> is the A/B (untested end to end). GOTCHAS:
> - A fresh build's first gf switch compiles the rest of gf's programs and stalls frames for 1-3 min; under GPU
>   load at DSF 3 it can lose the context (gf disposes and recompiles).
> - Warm the Chrome profile per build before timing.
> - Count `webglcontextlost` on the app's canvas and retry.
> - Close the panel with localStorage `knotmaze.panelOpen=0`, or it covers the knot.
> - Speck tests need an 8-neighbour median: a 7x7 one reads every fade ramp as specks.
