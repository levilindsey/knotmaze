# K1324 stage 2: x22's twist-eye smear, and j28's faint shades

Ledgers: K1324 (this), K1331 (x22), K1314 (the census), K1325 (the census reference), K1310 (the gate). One
Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h. Read first:
`docs/design/K1240_gate.md` and the s1 handoff at the end of `docs/design/K1324_s1_group_ties_x22.md`.

## Why

- **K1331, muse_hash x22 (31.53, 7.36), 148 px stray_ink:** a smear at a twist eye
  (`.claude/probes/K1314/out/s8/after4x/spot_004.png`; `.claude/probes/K1324/out/s1/crops_after/spot_005.png`,
  `x22_master/`). At a twist eye the depth tents cancel, so `tieAlpha`'s keys tie and the ghost (p2065) sits
  mid-ramp and half fades in. Form B draws the same smear, so it is a form B flaw too, but Levi's bar is zero
  artifacts in rp=outline. K1324 s1 traced the fix to a self-pass burial rule in `draw.ts` `tieAlpha` and the
  same rule in its GLSL twin in `outline_app.ts`. Dropping ghosts at self-crossings is ruled out: it took
  muse_hash stray 8 -> 39 and paper 0 -> 61, because those ghosts carry real under-pass border. A wider zb
  tent was tried and failed (s1 handoff).
- **g41_user_tw64 j28's right side:** two faint shades beside the outline, identical in master, where form B
  draws a hairline sliver (`.claude/probes/K1324/out/s1/j28r_after/spot_001.png`). No run pass reaches that
  border (s1). Say what draws them and clear them if they are the outline's; if they are the reference's,
  report it with the crop (K1325 owns the reference).

## Goal

x22's smear gone in rp=outline, then j28's shades, with no new artifact of any kind. The CPU rule and its GLSL
twin must agree. The technique is yours. Today's look (no `rp=outline`) stays byte-identical.

## Done

1. **Census** (`.claude/probes/K1314/k1314_run.ps1 -Lock`): x22 at 0. If the reference's own smear then
   counts as a find at x22, report it with its crop as the reference's. No bar kind above `census_s9`
   (stray_ink 7, hard_edge 1, paper 0, broken_ink 12, k1049 0) less what you clear, and every find that moved
   named with its spot. Copy `.claude/probes/K1314/out/s1/census_s9.*` from the main checkout. Never copy form
   B caches: the census builds its own, keyed by the reference's code.
2. **Crops:** reference | master | after at 4x or more for x22, j28's right and every new find, in
   `.claude/probes/K1324/out/s2/`. I view them before merging.
3. **The twin:** a test that ties the CPU `tieAlpha` to the GLSL twin on the burial case (or a probe that
   reads the GPU's ink at x22 against the CPU's, if the GLSL cannot run in Node), and a test that fails if x22's
   tie comes back.
4. **Speed:** the desktop worker frame on def, ABBA under the perf lock (`.claude/probes/K1314/k1314_s8_bench.ps1`),
   master against your branch: no worse than the run-to-run spread.
5. `npm test` green, golden snapshots unchanged. Re-freeze `outline_port.test.ts`'s pins only where your fix
   moves them, and name them in the commit. Copy `.claude/probes/K868/scenes/g41_ring_tw42.json`,
   `muse_hash.json` and `g41_user_tw64.json` from the main checkout first. They are untracked, so without them
   tests skip.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to
  a file and read only the lines you need). Use the Read tool only right before an Edit, and to view crops.
  Junction `node_modules` from the main checkout; never `npm ci`.
- **Untracked inputs** (censuses, crops, scenes) are in the main checkout's `.claude/probes/`. Copy what you
  need into your worktree and never write there.
- **Your files:** `src/render/outline/draw.ts` (`tieAlpha`, `contactPasses`, the ghosts), `outline_app.ts`
  (the GLSL twin), tests, and your tools and outputs under `.claude/probes/K1324/`. Two other agents run at the
  same time: **K1314 s10** owns `outline.ts` and the band files (`band_gpu.ts`, `band_place.ts`,
  `band_rec.ts`); **K1325** owns the census (`k1314_census.ts`, `form_b_fillet.ts`, `k1314_run.ps1`). If your
  fix needs one of theirs, report it rather than editing it. If you both re-pin `outline_port.test.ts`, the
  coordinator re-pins at the later merge.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min is
  stale. Run the census with `-Lock` and hold no lock of your own around it. Three agents share the lock, so
  expect waits.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Before stopping for the cap, run `Get-Date` and check that 2 h have really passed. Leave
  the last 25 minutes for the checks. Then commit WIP, append a handoff to this brief with your start and stop
  times, and report. Neither a compaction nor context size is a stop; after a compaction, re-read this brief
  and `git log`.

## Report

Under 40 lines:
- x22: the rule, where it lives (CPU and GLSL), and how the twin is tied;
- j28's right: what draws the shades, and the fix or whose they are;
- the census counts per kind, before and after, and the finds that moved;
- the worker frame on def, before and after;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1324's and K1331's handle fields.
