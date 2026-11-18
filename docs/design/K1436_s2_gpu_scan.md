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
