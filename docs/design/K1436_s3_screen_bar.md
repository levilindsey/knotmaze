# K1436 stage 3: the screen scan on all twelve scenes, and the bar run end to end (Claude agent stage, probes only)

Stage 2 (`docs/design/K1436_s2_gpu_scan.md`: read Handoff K1436 s2 whole, and the last section of
`.claude/rules/render-gpu-field.md`) built the screen scan (`.claude/probes/K1436/k1436_screen.mjs`,
`k1436_screen_scan.ts`) and `k1436_bar.ps1`, and got one scene through (ring, gfh=1: 921 finds down to 3)
before its captures died to cold-load GPU kills. That is fixed (K1468, fc520c2d: gf's programs write one
packed target): a cold load stays up with the watchdog on. What a cold load still costs is 85-180 s to gf's
first composite, and a profile is warm only for the exact links it has loaded.

The point of this stage: Levi judges the screen ("I still see plenty of border artifacts", 2026-11-17), and
the junction lane needs a work list of what the screen shows, largest first.

## Do

1. Warm one profile per build with every link the run will load (wait for gf's composites to rise on each),
   then capture the 12 scenes at DSF 3, `gfh=1` and flag off, three at a time. Build the table: mirror v2
   beside screen v2, per class, with the run time.
2. **The work list.** The twenty largest screen finds on origin/master at `gfh=1`, and the twenty largest
   with the flag off, each on a 4x crop sheet (today | gf), each named by what it is (stub, wedge, dash,
   smear, notch, tick, colour seam, false find) and by its site (scene, crossing or junction id, world
   position). Look at every tile yourself. This list is the stage's main product.
3. K1460's link (`out/s2/jobs_k1460.json`) on origin/master and on c5fc87d1: the scan flags the kink-loop
   tick and the dotted line across the faded under thread on c5fc87d1 and not on master.
4. Run `k1436_bar.ps1` end to end: PASS for origin/master against itself on two runs; FAIL for 17053a36
   (K1451 stage 2's tip) against a3a9a6b4 at `gfh=1`, naming the new finds near crossing x68 and junctions
   j50 and j36.
5. Precision on master: 40 screen finds sampled across classes, at least 85% real and no class under 70%;
   vdip:ramp and rstray each at least 80% real on 10 sampled finds.
6. Residuals, as time allows: mask markers from the fabric renderer's marker positions (write them into
   meta.json) instead of by colour; vdip:ramp's false finds beside white; a spots mode for the def seam
   notches.

## Done

Items 1-5 hold, with sheets under `.claude/probes/K1436/out/s3/`, "How to run" at the top of
`k1436_bar.ps1` matching what you ran, and a paragraph for `.claude/rules/render-gpu-field.md` in your
handoff (the coordinator files it). A partial result lands: items 1 and 2 alone are worth merging.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `.claude/probes/K1436/` only. Nothing under `src/` or `test/`.
- **Memory and disk.** ONE Chrome profile directory per build and at most two preview builds at a time,
  under `$env:TEMP\k1436s3-*`, deleted when you stop. At most three scenes in parallel. Before each build or
  batch of Chromes read `Get-CimInstance Win32_OperatingSystem` and wait (one blocking loop, 10 minutes at
  most) while `FreeVirtualMemory` is under 3 GB. Scan dumps stay under your worktree and are deleted once
  tabulated. Stop to report if `(Get-PSDrive C).Free` is under 5 GB.
- Do not take `$env:TEMP\claude-perf.lock`; while another owner holds it, run one Chrome at a time.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5600-5619. Headed, real-time Chrome, never `--virtual-time-budget`.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files and sheets, not for dumps).
  Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work (captures, scans, sheets), with this stop rule.
- Own the technique.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1436 s3` here, commit, and report: what holds, the sheets' paths, the table, the work
list, a `Ledger items` list and K1436's handle fields.
