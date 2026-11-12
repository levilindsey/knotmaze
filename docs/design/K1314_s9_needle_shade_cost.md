# K1314 stage 9: j58a's needle, j71's shade cut and the cost of s8's cut

Ledgers: K1314 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree, on
its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md` and the handoff at the end of
`docs/design/K1314_s8_needles_notches.md`.

## Why

Stage 8 cut near-root bends (`cutFoldsC`) and turned end-fold chord normals to face the end's centre, which
cleared muse_hash j55, j58b and x15's inner step. Its census (`out/s1/census_s8f.*`, the baseline here) is
stray_ink 9, hard_edge 1, paper 0, broken_ink 13, k1049 0. In scope for this stage, all in `outline.ts`:
1. **muse_hash j58a** (67 px, near (4.71, 33.45)): the fold's second leg runs into c43's arm root, and its
   band, with feet along its own normal, crosses the first leg's band. s8's ha/hb rule (a leg running into an
   arm root within W takes the other leg's normal; EXP-gated in 8b1da324) cleared it but added j49 679 px (a
   black stroke across c75's fill), j58 142 px and j38 52 px. Find a narrower rule. s8's guess: only the leg
   inside the junction's covered area.
2. **g41_user_tw64 j71's shade** (near (5.2, 7.55)): the over-pass shade ends in a hard diagonal cut where run
   461 starts under c32's end arm (`out/s8/after4x/spot_005.png`). Not attempted in s8. If the cut is drawn by
   a file outside yours (below), report where and stop on it.
3. **The cost of s8's cut.** The desktop worker frame on def rose from 61.7 to 66.0 ms p50 (two ABBA rounds,
   15 of 16 pairs higher). Attribute it (s8 thinks: the extra bends that now reach the cut search) and win it
   back without changing the look.

Crop the reference against rp=outline first. Where rp=outline draws the approved look and the reference does
not, report the spot with its crop instead of changing the outline. Known form B flaws: muse_hash x304 and
g41_user_tw64 j30 (K1325). Levi's bar: zero artifacts; form B is only a reference.

Out of scope, each owned by another lane or waiting on Levi: muse_hash c8's quad (K1332, K1247 s27);
muse_hash x22 (K1331) and the class (a) specks (K1324), both draw.ts; the K1315 tail ends (broken_ink, muse_hash j78); the
K1319 j73 eye tip; the known false positives (muse_hash j29, g41_user_tw64 j28 #0); muse_hash j49.

## Goal

j58a and j71's cut gone in rp=outline by rules in the code that builds corners, pieces, folds and fans, with
no new artifact of any kind, and the worker frame on def back to master's before s8 or better. The technique
is yours. Today's look (no `rp=outline`) stays byte-identical.

## Done

- **Census** (`k1314_run.ps1 -Lock`): j58a and j71's cut at 0, or reported as a form B flaw with its crop. No
  bar kind above `census_s8f` less what you clear. Diff the finds by spot against `census_s8f` and name every
  one that moved. Copy `out/s1/census_s8f.*` from the main checkout. Never copy form B caches: the census
  builds its own, keyed by the reference's code.
- **Crops:** reference | before (master) | after, from your final commit, for each in-scope spot and every new
  find of any kind, in `.claude/probes/K1314/out/s9/`, plus j55, j58b, x15, x300 and muse_hash j56 to show
  them still clear. Crop small marks at 4x or more. `out/s8_spots.txt` has s8's spot list. I view them before
  merging.
- **The worker frame on def**, ABBA under the perf lock (`k1314_s8_bench.ps1`), master at the s8 merge against
  your branch, and the pre-s8 commit `ee53408f` against your branch: the split of s8's +4.3 ms by function,
  and your number against both.
- `npm test` green, golden snapshots unchanged. Re-freeze `outline_port.test.ts`'s pins only where your fix
  moves them, and name them in the commit. Copy `.claude/probes/K868/scenes/g41_ring_tw42.json`,
  `muse_hash.json` and `g41_user_tw64.json` from the main checkout first. They are untracked, so without them
  tests skip.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to
  a file and read only the lines you need). Use the Read tool only right before an Edit, and to view crops.
  Junction `node_modules` from the main checkout; never `npm ci`.
- **Untracked inputs** (stage 1-8 censuses and crops) are in the main checkout's `.claude/probes/K1314/out/`.
  Copy what you need into your worktree and never write there.
- **Your files:** `src/render/outline/outline.ts` (corners, pieces, folds, fans), tests, and your tools and
  outputs under `.claude/probes/K1314/`. Two other agents run at the same time: **K1247 s27** owns
  `fill_tri.ts` (fillFrame and the record code), `rec_glsl.ts`, `chain_frame.ts`, `outline_app.ts`,
  `outline_model.ts`, `outline_worker.ts` and `src/app/frame_loop.ts`; **K1324** owns `draw.ts` and the band
  files. If your fix needs one of theirs, report it rather than editing it. If you all re-pin
  `outline_port.test.ts`, the coordinator re-pins at the later merges. Leave the census reference
  (`k1314_census.ts`'s reference code, `form_b_fillet.ts`) as it is.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min is
  stale. Run the census with `-Lock` and hold no lock of your own around it. Three agents share the lock this
  round, so expect waits.
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
- the worker frame on def: master, pre-s8 and yours, with the split;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1314's handle fields.


## Handoff (s9 agent, 2026-11-12, start 06:10:15 PT, stop 07:41 PT)

Last commit: see `git log -1` on worktree-agent-a88e9bc054f3e16da (outline.ts work in 4cee7c5b).

- **j58a and j71's shade: one rule, `runRootRamp` (outline.ts, called from
  piecesPhaseC before ARC_END_FEET).** At each run root it multiplies form
  B's tie over the junction's other arms (draw.ts's tieAlpha: g = clamp((h-d)/W),
  sstep over the depth key with zt = 0.1 depthAmp) and, where that tie is
  below 0.5 and above a 0.05 floor, fades the run's own alpha in by a
  smoothstep over 0.35 h from the root. Lengths 0.35 / 0.45 / 0.6 h censused;
  0.35 is the shortest that clears j58a. The floor keeps fully tied roots
  (no band anyway) unchanged.
- **Census s9 vs s8f (bar):** stray 9 -> 7, hard 1 -> 1, paper 0, broken
  13 -> 12, k1049 0. Gone: muse_hash j58a stray 67 px, j29 stray 52 px (the
  known false positive), j96 broken_ink 294 px. j96 is RECLASSIFIED, not
  fixed: it is now a 433 px tail_look (band:run faded). No new bar find.
  tail_look moved: new muse_hash j99 47, j123 227, j15 61, j96 433, j58 tail
  44; def j55 64; g41_user_tw64 j59 68, j61 226, j3 153, j8 91. Grown:
  muse_hash j81 166->377, j45 100->199, j58 86->188; muse_default_tw j110
  owner_only 67->97, j120 71->100; g41_def_tw64 j72 91->122, j53 94->147;
  g41_user_tw64 j26 44->69, j9 93->129. In the crops each is a run's ink end
  that now fades in like form B's instead of ending square.
- **j71:** the hard diagonal cut is gone (out/s9/after/spot_002,
  after4x/spot_006). A small hard step at about (5.11-5.15, 7.75-7.86),
  present before too, remains. The real fix (a band continuing past the
  root) lives in draw.ts/band_rec.ts (K1324) or fill_tri.ts (K1247).
- **Cost of s8's cut:** not reproduced in the app. ABBA on def, drag
  worker frame p50: master 337d785d 66.0 / 66.8, pre-s8 ee53408f 66.6 / 58.2,
  mine 64.9 / 64.7 / 69.9 / 64.8 (out/s9/bench_final.json; the earlier
  pair, pre 66.9 vs master 65.8, is bench_pre_mst.json). Node frame() on
  def, interleaved (out/s9/fbench_final.txt): pre 34.81, master 35.46,
  mine 35.68 ms median. s8 = setupBorders +0.26 (cutFoldsC's extra chevron
  points and their diagnostics), pieces +0.11, corners +0.16 (noise level).
  Won back without a look change (checked frame-identical by
  k1314_s9_ident.ts): the diag pushes capped at 20, a loop for
  bendClusters' .some, the nearRoot test only at an end; setupBorders 7.06
  -> 6.92. runRootRamp adds about 0.6 ms in piecesCapsEtc (13.32 vs 12.70).
- **Crops** (form B | master | mine): out/s9/after (18), after4x (6, 4x:
  j58a, j58b, j55, x15, j56, j71shade), after_other (def j55, muse_default_tw
  j110 / j120, g41_def_tw64 j72 / j53). j58b, x15, x300 and j56 are unchanged
  or sub-visible. Form B flaws: none new.
- `npm test` green, goldens and outline_port.test.ts unchanged (no re-pin).
- k1314_s9_rampf.ts needs the removed `__k1314ramp` hook; it is inert.

Left: runRootRamp's cost (a quick reject before tailFoot); the j71 step;
j58a's residual soft dark fade where form B is pale (no census find).
