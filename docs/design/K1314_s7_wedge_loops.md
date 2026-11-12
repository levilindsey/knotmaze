# K1314 stage 7: j71's wedge, the uncut loops and the class (d) spikes

Ledgers: K1314 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree, on
its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md`, the handoff at the end of
`docs/design/K1314_s6_faults.md`, and the "Left (stray_ink)" list in `docs/design/K1314_s2_spikes.md`'s
handoff.

## Why

Stage 6 cleared x68, x67 and j39. The census against K1321's reference (`out/s1/census_s6.*`) is now
stray_ink 12, hard_edge 2, paper 0, broken_ink 13, k1049 0. The broken_ink finds, muse_hash j78 and the
g41_user_tw64 j63/j64 cuts are tail ends waiting on Levi (K1315). The class (a) specks are draw.ts's (K1324).
What is left of the outline's own faults, in order:
1. **g41_user_tw64 j71:** a hard wedge at (4.95,7.54). Stage 6 found that MATCH_MIRROR (fill_tri `fillFrame`,
   off) clears it, but the mirrored tube then lies under another arm's junction fill keyed above it
   (muse_hash j56: 7 hard edges, 4 paper on two scenes). Its lead: a junction fill that yields to an arm's own
   tube where it lies over it.
2. **Class (b), uncut swallowtail loops:** muse_hash x15 (form B draws a smooth spiral, rp=outline a square
   loop) and j58 (two needles). `cutFoldsC` skips them on purpose: cutting them brought back K1283 s5's x300
   blot. Keep x300 clear.
3. **Class (d):** muse_hash j55 (a notch spike), x22 (like form B's own smear), x304 (a tail look) and
   g41_user_tw64 j30 (a hook overshoot).

For 2 and 3, crop the reference against rp=outline first. Where rp=outline draws the approved look and the
reference does not (a form B flaw, as K1321 found at classes (a) and (c)), don't change the outline to match:
report the spot with its crop. Levi's bar: zero artifacts; form B is only a reference, don't copy its flaws.

Out of scope: the K1315 tail ends; the K1319 j73 eye tip; the class (a) specks (K1324); the known false
positives (muse_hash j29, g41_user_tw64 j28 #0); muse_hash j49.

## Goal

Each in-scope fault gone in rp=outline, by rules in the code that builds corners, pieces, folds, fans and the
fill, with no new artifact of any kind. The technique is yours. Today's look (no `rp=outline`) stays
byte-identical.

## Done

- **Census** (`k1314_run.ps1 -Lock`, the reference as on master): each in-scope find at 0 or reported as a
  form B flaw with its crop, and no kind above `census_s6` (stray_ink 12, hard_edge 2, paper 0, broken_ink 13,
  k1049 0) less what you clear.
- **Crops:** reference | before (master) | after, from your final commit, for each in-scope spot and every new
  find of any kind, in `.claude/probes/K1314/out/s7/`, plus x300 and muse_hash j56 to show them still clear.
  Crop small marks at 4x or more. I view them before merging.
- **The gate's per-stage checks:** the desktop worker frame on def, ABBA under the perf lock: not worse than
  master by more than the run-to-run spread (`k1314_s3_bench.ps1`). `npm test` green, golden snapshots
  unchanged. `outline_port.test.ts`'s pins re-frozen only where your fix moves them, and named in the commit.
  Copy `.claude/probes/K868/scenes/g41_ring_tw42.json` from the main checkout first. It is untracked, so
  without it the test's second pin skips.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to
  a file and read only the lines you need). Use the Read tool only right before an Edit, and to view crops.
  Junction `node_modules` from the main checkout; never `npm ci`. Read `.claude/rules/probes.md` before
  probing: a bare URL is today's daily. Real-time headed Chrome only; never `--virtual-time-budget`.
- **Untracked inputs** (stage 1-6 censuses, crops, form B caches) are in the main checkout's
  `.claude/probes/K1314/out/`. Copy what you need into your worktree and never write there. Delete any form B
  cache you copy before you stop.
- **Your files:** `src/render/outline/outline.ts` (corners, pieces, folds, fans), `fill_tri.ts`'s `fillFrame`,
  tests, and your tools and outputs under `.claude/probes/K1314/`. One other agent runs at the same time:
  **K1247 stage 25** works in `band_place.ts`, `band_rec.ts`, `draw.ts`, `band_gpu.ts`, the record code
  (`chain_frame.ts`, `rec_glsl.ts`, `fill_tri.ts`'s `fillStructure`/`recStrip`/`stripNb`, `outline_app.ts`,
  `outline_model.ts`, `outline_worker.ts`) and `src/app/frame_loop.ts`. It may flip `ob` on and re-pin
  `outline_port.test.ts`; if you both re-pin, the coordinator re-pins at the second merge. It may add hooks
  behind `ob` in `outline.ts`; keep your edits off them. Leave the census reference (`k1314_census.ts`'s
  reference code, `form_b_fillet.ts`) as it is. If your fix needs any of those to follow, say so in the
  report.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min is
  stale. Run the census with `-Lock`. It takes the lock for each scene, so don't hold the lock around it.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Before stopping for the cap, run `Get-Date` and check that 2 h have really passed. Leave
  the last 25 minutes for the checks. Then commit WIP, append a handoff to this brief with your start and stop
  times, and report. Neither a compaction nor context size is a stop; after a compaction, re-read this brief
  and `git log`.

## Report

Under 40 lines:
- the census counts per kind, before and after;
- each rule and where it lives (file and function);
- the spots you judge a form B flaw, with their crops;
- the worker frame on def, before and after;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1314's handle fields.
