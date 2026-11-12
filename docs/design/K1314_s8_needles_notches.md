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

## Handoff (stage 8 agent, 2026-11-12)

Start 2026-11-12 04:40:02 -08:00, stop 2026-11-12 06:02:13 -08:00 (Done items run; not the cap).

**Landed** (f1dc5408 rules, 0c021be2 re-pin), all in `outline.ts` `cutFoldsC`:
- **Near-root bends are cut** (muse_hash j55 105 px, j58b 41 px -> 0). K1283 s5 left every bend within h of an
  arm root uncut. Now it stays uncut only when it also lies within h of an open end (`atEnd`), which keeps
  x300 and c8's end as on master.
- **End-fold chord normal faces the end's centre** (muse_hash x15's inner step; crop `out/s8/after_x15`).
  The flip comes after s7's `foldNormal` calls.
- Census s8f vs master s8m: stray 11 -> 9, hard 1, paper 0, broken 13, k1049 0. Nothing new. Only j55 and j58b moved.
- outline_port re-pinned: ring table, paint and band (f0, f1); g41_ring_tw42 table (f0, f1). Goldens unchanged.
- Bench, two ABBA rounds on def, worker `frame` p50: master 61.8, 61.3, 65.6, 58.2 (mean 61.7); s8 66.4, 63.4,
  66.0, 68.3 (mean 66.0). That is +4.3 ms, inside master's 7.4 ms spread, but s8 is higher in 15 of 16 pairs.
  Probably real: the bends that now reach the cut search. Not attributed.

**Tried and dropped** (8b1da324 has them EXP-gated):
- **ha/hb.** A fold leg running into an arm root within W takes the other leg's normal. It removed j58a's
  67 px but added j49 679 px (a black stroke across c75's fill), j58 142 px and j38 52 px.
- **gk.** No ghost pieces at self-crossings. It cleared x22's smear in the crop but took muse_hash stray 8 -> 39 and
  paper 0 -> 61, because those ghosts carry real under-pass border.

**Left:**
- **muse_hash j58a** (67 px). The fold's second leg runs into c43's arm root, and its band, with feet along its
  own normal, crosses the first leg's band. Needs a rule narrower than ha/hb (only the leg inside the
  junction's covered area?).
- **muse_hash x22.** The ghost is drawn at form B's tie alpha, and at a twist eye the depth tents cancel, so
  the keys tie and the ghost half fades in. Form B smears too. The fix belongs in the tie or the ghost's alpha
  at kinks (draw.ts tieAlpha is K1247's), not in dropping ghosts.
- **g41_user_tw64 j71.** The shade ends in a hard diagonal: run 461's start under c32's end arm. Not attempted.
- **muse_hash c8's end.** c8's fill strip owns c67's area near the end, giving the hard quad with a stair edge.
  The quad is a little lighter at f1dc5408 and still hard-edged. It is fill ownership (fill_tri), not folds.
- x304 and g41_user_tw64 j30 stay form B flaws (crops 012 and 013).

**Crops** in `.claude/probes/K1314/out/s8/`:
- `before`/`after` (360 px, 5 h) and `before4x`/`after4x` (480 px, 1.25 h) for 13 spots
  (`out/s8_spots.txt`): j58a, j58b, j55, x22, j71shade, c8end, x15, x300, j56, c1start, c1end, x304, j30.
- `x15b`/`after_x15` for the x15 step.
- `before_new`/`new`: ha/hb's finds.
- `after_x22`: x22's find.
