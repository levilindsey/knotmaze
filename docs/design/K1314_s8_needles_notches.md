# K1314 stage 8: j58's needles, j55's notch, x22's smear, the j71 shade cut and c8's wedge

Ledgers: K1314 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree, on
its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md` and the handoff at the end of
`docs/design/K1314_s7_wedge_loops.md`.

## Why

Stage 7 cleared j71's wedge, x15's square loop and the end-cap chevrons. Its census against a fresh reference
(`out/s1/census_s7f.*`, from the coordinator) is stray_ink 11, hard_edge 1, paper 0, broken_ink 13, k1049 0.
What is left of the outline's own faults, with s7's leads:
1. **muse_hash j58a and j58b:** a needle from the chevron of c43's side -1 bend at s 28.23, 0.54 from the root
   at 28.77. Form B is jagged there too; the approved look is a clean border, so don't match form B.
2. **muse_hash j55:** an ink notch at (29.84, 4.74), where c58's consumed R side (s 24.649 to 24.946) meets c21's
   end arm.
3. **muse_hash x22:** a smear, in form B and in the outline.
4. **g41_user_tw64 j71:** the over-pass shade ends in a hard diagonal cut near (5.2, 7.55), as on master
   (`.claude/probes/K1314/out/s7/after4x/spot_001.png`, right panel).
5. **muse_hash c8's open end (19.41, 14.16):** s7's end-cap clip turned master's wedge into a hard-edged pink
   quad with a jagged side (`out/s7/efafter/spot_005.png`). Clear the quad and its jagged edge. The end's own
   shape (round dot or square end) waits on Levi (K1315), so leave the cap's form as it is.
6. **muse_hash x15:** the inner corner keeps a small step where the black meets (`out/s7/after4x/spot_002.png`).
   The census now counts it as a tail_look (missing).

Crop the reference against rp=outline first. Where rp=outline draws the approved look and the reference does
not, report the spot with its crop instead of changing the outline. Known form B flaws: muse_hash x304 and
g41_user_tw64 j30 (`out/s7/after4x/spot_007`, `spot_008`). Levi's bar: zero artifacts; form B is only a
reference.

Out of scope: the K1315 tail ends (broken_ink, muse_hash j78); the K1319 j73 eye tip; the class (a) specks
(K1324); the known false positives (muse_hash j29, g41_user_tw64 j28 #0); muse_hash j49.

## Goal

Each in-scope fault gone in rp=outline, by rules in the code that builds corners, pieces, folds, fans and the
fill, with no new artifact of any kind. The technique is yours. Today's look (no `rp=outline`) stays
byte-identical.

## Done

- **Census** (`k1314_run.ps1 -Lock`): each in-scope find at 0 or reported as a form B flaw with its crop. No
  bar kind above `census_s7f` less what you clear. Diff the finds by spot against `census_s7f` and name every
  one that moved. Copy `out/s1/census_s7f.*` from the main checkout. Never copy form B caches: the census builds
  its own, keyed by the reference's code (0b10c10b). A copied cache from another build measures against the
  wrong reference, and that cost s7 its baseline.
- **Crops:** reference | before (master) | after, from your final commit, for each in-scope spot and every new
  find of any kind, in `.claude/probes/K1314/out/s8/`, plus x300, muse_hash j56 and muse_hash c1 to show them
  still clear. Crop small marks at 4x or more. I view them before merging.
- **The gate's per-stage checks:** the desktop worker frame on def, ABBA under the perf lock
  (`k1314_s7_bench.ps1`): not worse than master by more than the run-to-run spread. `npm test` green, golden
  snapshots unchanged. Re-freeze `outline_port.test.ts`'s pins only where your fix moves them, and name them in
  the commit. Copy `.claude/probes/K868/scenes/g41_ring_tw42.json` from the main checkout first. It is
  untracked, so without it the test's second pin skips.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to
  a file and read only the lines you need). Use the Read tool only right before an Edit, and to view crops.
  Junction `node_modules` from the main checkout; never `npm ci`.
- **Untracked inputs** (stage 1-7 censuses and crops) are in the main checkout's `.claude/probes/K1314/out/`.
  Copy what you need into your worktree and never write there.
- **Your files:** `src/render/outline/outline.ts` (corners, pieces, folds, fans), `fill_tri.ts`'s `fillFrame`,
  tests, and your tools and outputs under `.claude/probes/K1314/`. One other agent runs at the same time:
  **K1247 stage 26** works in `fill_tri.ts`'s record code (`recStrip`, `recStrips`, `fillStructure`,
  `stripNb`), `rec_glsl.ts`, `chain_frame.ts`, `draw.ts`, the band files, `outline_app.ts`, `outline_model.ts`,
  `outline_worker.ts` and `src/app/frame_loop.ts`. It ties the record fill to `fillFrame` with a test. If you
  change `fillFrame`, that test fails at the second merge, and the coordinator ports your rule there; say in
  the report what moved. If you both re-pin `outline_port.test.ts`, the coordinator re-pins at the second
  merge. Leave the census reference (`k1314_census.ts`'s reference code, `form_b_fillet.ts`) as it is.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min is
  stale. Run the census with `-Lock` and hold no lock of your own around it.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Before stopping for the cap, run `Get-Date` and check that 2 h have really passed. Leave
  the last 25 minutes for the checks. Then commit WIP, append a handoff to this brief with your start and stop
  times, and report. Neither a compaction nor context size is a stop; after a compaction, re-read this brief
  and `git log`.

## Report

Under 40 lines:
- the census counts per kind, before and after, and the finds that moved;
- each rule and where it lives (file and function);
- the spots you judge a form B flaw, with their crops;
- the worker frame on def, before and after;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1314's handle fields.
