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

## Handoff (K1324 s2 agent, 2026-11-12, start 07:52:03, stop 08:31)

- **x22 (K1331): cleared.** The rule: a SELF pass (`P.o` is the pass's own chain) whose crossing anchors
  order clearly, `|D| > 10 zt` with `D = zAtC(partner, P.so) - zAtC(own, P.s)`, shifts the tie's key
  difference by `sign(D) * 2 zt * lam`, `lam = 1 - min(1, |zO - zC| / (2 zt))`: whole where the depths tie,
  gone once they differ by 2 zt, so a pass the depths already order is untouched. CPU: draw.ts `selfBury`,
  called in `tieAlpha` (`buryOpts.on` switches it off for probes). GLSL: outline_app.ts BAND_FS, `zAtS` (zAtC
  on the band's chain table) and the bury block before `f`. Tied by `test/render/self_bury.test.ts`
  (selfBury's cases; x22 on the tracked fixture `fixtures/outline_x22.json.gz`: over border min 0.46 -> >0.999,
  the under ghost 0.20 -> <1e-3, so it fails if the tie comes back; BAND_FS's lines pinned and a JS zAtS on
  bandGpu's chainTex against zAtC, < 1e-5) and the GPU probe `.claude/probes/K1324/k1324_s2_gpu.ts` (BAND_FS
  in headed Chrome at x22: max |gpu - cpu| 0.0000 over 1109 samples with the rule on and off, 95 moved by it on both, under the perf lock; out/s2/gpu_twin_x22.txt).
  band_gpu.ts `alphaCpu` (K1314 s10's) has no bury term; if anything compares it to BAND_FS, it needs one.
- **j28's right (g41_user_tw64): not draw.ts.** The shades are chain 28's two end tails (pieces p838 and
  p839). Their per-point alpha is outline.ts `tailAlpha`: form B's tie mix sampled at W 0.25 and W 0.75 and
  extrapolated to the edges (outer 0.10-0.86, inner 0), and the band pokes past the black's inner edge.
  Zeroing the two pieces changes 6354 px (max 0.258) in exactly the two shade regions
  (`k1324_s2_tailoff.ts g41_user_tw64 3.5 3.33 2 480 838,839`). Form B draws a crisp hairline sliver at the
  lower shade, so the tails are a soft copy of the reference's sliver: the fix is in outline.ts
  `tailAlpha` / `endTailPts` (K1314 s10) or in the reference (K1325).
- **Census** (`k1314_run.ps1 -Tag k1324s2a -Lock` against census_s9; `k1324_s1_cmp.cjs`): stray_ink 7 -> 10,
  hard_edge 1 -> 1, paper 0 -> 0, broken_ink 12 -> 12, k1049 0 -> 0. No find gone. x22 148 -> 414 px stray_ink,
  and three new band:run stray_ink finds on muse_hash: x345 (19.996, 3.944) 225 px, j116 (25.518, 13.825)
  696 px, x58 (0.113, 15.187) 527 px. In all four the reference and master smear the over pass and the branch
  draws the crossing whole: the reference's own self-crossing tie smear, counted now that the outline no
  longer copies it (K1325's). owner_only 2300 -> 1241 and tail_look 185 -> 184 are not bar kinds; inferred
  from master's changes since census_s9, not checked with a master census.
- **Speed** (`k1324_s2_bench.ps1`, def, drag, ABBA, efd82460 vs fdf0b790, under the lock alone): worker p50
  master 159.6 / 156.0, branch 149.1 / 139.0 ms; band part 26.1 / 18.5 vs 18.6 / 16.2; frame part 67.5 / 66.1
  vs 70.5 / 67.2 (frame() is untouched). out/s2/bench_abba1.json.
- `npm test` green (230 files, 2941 tests); goldens and outline_port.test.ts unchanged, no re-pin.
- **Crops** (reference | master | after; out/s2/): 4x (px 480, zoom 2.5) `x4_after/` spot_001 x22,
  spot_002 j28, spot_003 x345, spot_004 j116, spot_005 x58; 8x of x22's lower join `x8_after/`; j28's right
  at 5x `j28r_after/`; 2x `crops_after/`, `new_after/`. Master panels in the matching `*_master/`.
- **Left:** at 8x a faint near-black seam remains where x22's under band meets the over border (x8_after,
  below the census bar); the reference's self-crossing smear at x22, x345, j116, x58 (K1325); j28's tails
  (K1314 s10); band_gpu `alphaCpu`'s bury term (K1314 s10); a master census to confirm the owner_only shift.
