# K1247 stage 27: c8's quad in both fills, the GPU twin's drift, and a mirrored fixture

Ledgers: K1247 (this), K1332 (c8), K1327 and K1328 (the fixes), K1314 (the census), K1310 (the gate). One
Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h. Read first:
`docs/design/K1240_gate.md`, the s26 handoff at the end of `docs/design/K1247_s26_rec_fill_specks.md` and the
s8 handoff at the end of `docs/design/K1314_s8_needles_notches.md`.

## Why

- **K1332, muse_hash c8's open end (19.41, 14.16):** a hard-edged pink quad with a stair edge
  (`.claude/probes/K1314/out/s8/after4x/spot_006.png`, reference | master | s8). K1314 s8 traced it to fill
  ownership: c8's fill strip owns c67's area near the end. It is not folds. The end's own shape (round dot or
  square end) waits on Levi (K1315), so leave the cap's form as it is and clear the quad and its stair edge.
  Since s26 the record fill keys every strip as `fillFrame` does and `test/render/rec_tie.test.ts` ties them,
  so the fix lands in both fills or the tie fails.
- **K1327:** the record fill's GPU shader drifts from its CPU twin by up to 1.85 px on muse_hash (FLOOR strips
  o375 and o850, row 2) and 1.63 px on def, in whole-span recCol rows, not the mirror. s19 measured 0.002 px,
  so it came in between s20 and s26; when is not verified. The app draws the GPU's fill, so the census (which
  rasters `fillFrame`) cannot see this drift.
- **K1328:** only the untracked muse_hash and g41_user_tw64 scenes have mirrored strips (K1314 s7's
  mirA/mirB), so CI never ties the mirror. A tracked fixture with a mirrored strip would.

## Goal

1. c8's quad and stair edge gone in rp=outline, in `fillFrame` and the record fill alike, with no new artifact
   of any kind. One shared strip rule that both fills call (K1329) is a fair way to get there if the change
   would otherwise be made twice; the tie must stay at 0 either way.
2. The GPU fill within 1/4 px of its CPU twin on every census scene, with the cause named.
3. A tracked fixture with a mirrored strip in `rec_tie.test.ts`.

The technique is yours. Today's look (no `rp=outline`) stays byte-identical.

## Done

1. **Census** (`.claude/probes/K1314/k1314_run.ps1 -Lock`): c8's quad at 0. No bar kind above
   `census_s8f` (stray_ink 9, hard_edge 1, paper 0, broken_ink 13, k1049 0) less what you clear, and every
   find that moved named with its spot. Copy `.claude/probes/K1314/out/s1/census_s8f.*` from the main
   checkout. Never copy form B caches: the census builds its own, keyed by the reference's code.
2. **Crops:** reference | master | after at 4x or more for c8's end and every new find, in
   `.claude/probes/K1247/out/s27/`. I view them before merging.
3. **The tie:** `rec_tie.test.ts` at 0 on every scene it covers, including the new tracked mirrored fixture.
4. **The drift:** the GPU against the twin, largest vertex difference per census scene, before and after
   (s26's measurement: muse_hash 1.85 px, def 1.63 px), and the commit that brought it in.
5. **Speed:** the main frame (rest and drag) and the worker frame on def and fat, ABBA under the perf lock
   (`k1247s26_bench.ps1`), master against your branch: no worse than the run-to-run spread.
6. `npm test` green, golden snapshots unchanged. Re-freeze `outline_port.test.ts`'s pins only where your fix
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
- **Your files:** `src/render/outline/fill_tri.ts` (`fillFrame` and the record code), `rec_glsl.ts`,
  `chain_frame.ts`, `outline_app.ts`, `outline_model.ts`, `outline_worker.ts`, `src/app/frame_loop.ts`, tests,
  and your tools and outputs under `.claude/probes/K1247/`. Two other agents run at the same time: **K1314 s9**
  owns `outline.ts` (corners, pieces, folds, fans); **K1324** owns `draw.ts` and the band files. If your fix
  needs one of theirs, report it rather than editing it. If you all re-pin `outline_port.test.ts`, the
  coordinator re-pins at the later merges. Leave the census reference (`k1314_census.ts`'s reference code,
  `form_b_fillet.ts`) as it is.
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
- c8: the rule and where it lives, the census counts per kind before and after, the finds that moved;
- the drift: per-scene numbers before and after, its cause and the commit that brought it in;
- the fixture and what it covers;
- the frame numbers, master against yours;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1247's handle fields.


## Handoff (stage 27, agent ac9acd27cfb1cf144, 2026-11-12)

Started 06:10:16, stopped 07:50. All three goals done; every Done check ran.

- **c8 (K1332)**: two rules in fill_tri, record fill and rec_glsl alike. (1) 5709f5e0: a junction fan's mid-mouth
  vertex M takes the cone key of its arm's centreline, `zAt(a.pi, sM)`, not `Zs - zt`. (2) 87d55749 FLOOR_EDGE: in
  REC_KEY_FLOOR mode (reKey, unmatched ranges, jEnd strips included) a border row's key is
  `max(zOwn - zt, 2 z(sQ) - zt - keyC)`, sQ the quarter s toward the centre, so the border edge's midpoint sits on
  the cone. Cause: c67's sheared jEnd strip 751 dipped its border vertex into an under-pass and lost to c8's
  strip 410. Crop: `.claude/probes/K1247/out/s27/after4x/spot_001.png` (fillet | master | after): quad and stair gone.
- **Census s27a** at 87d55749 (own cache; copies and diffs in `out/s27/census/`): bar kinds equal s8f
  (stray_ink 9, hard_edge 1, paper 0, broken_ink 13, k1049 0), no bar find moved. #234 is gone. owner_only
  2300 -> 1241 finds; at d 0.3: 1066 gone (957 disk-tagged at junction hubs, 101 junc, 8 strip), 117 moved,
  7 new (1752 px, crops `out/s27/new_after/spot_001..007`: n4 muse_hash j149 loses master's fan wedge, the
  other six match master by eye). jmis (fan cells vs form B's chain): 59240 -> 36374 (fan M) -> 36028.
- **Drift (K1327, c3b31eb7)**: GPU vs CPU max px, master -> after: def 0.59 -> 0.0004, fat 0.63 -> 0.0016,
  muse_hash 1.85 -> 0.0003, muse_default_tw 0.63 -> 0.0002, ring 2.88 -> 0.0004, g41_def_tw64 3.33 -> 0.0011,
  g41_ring_tw42 1.61 -> 0.0013, g41_ring_tw64 3.06 -> 0.0013; the four clean scenes stay <= 0.0012. Cause:
  span-end and column ties read differently in f32 and f64 (brought in by 49afe511). `out/s27/drift_*.txt`.
- **Fixture (K1328, 3d93fd29)**: `outline_mirror.json.gz` (g41_user_tw64 at 4 decimals, c32's mirrored strip) in
  rec_tie, plus a recSpan / recCs pin against chain_frame. rec_tie 0 on every scene.
- **Speed** (two ABBA rounds, `out/s27/bench/`, f2b87087 vs 87d55749): main frame identical (def rest 5.7-5.8
  both, drag p50 6.7-6.8 both; fat rest 5.9-6.1 vs 5.9-6.0, drag 6.9-7.1 vs 6.8-7.0); worker p50 def 141-149 vs
  130-147, fat 140-155 vs 145-150 (one master outlier 302): inside the run-to-run spread.
- **Tests**: npm test green at b356445c (paint_ring_lap's reviewed site now names recCs's `floor(r / S + 0.5)`);
  outline_port paint re-pinned (ring, g41_ring_tw42, f0 and f1), golden snapshots unchanged.
- **Left**: the 25 junctions FLOOR_EDGE made a few cells worse and the 7 the fan rule made worse
  (muse_hash j1390 +47 cells), all owner-only, none visible in the crops; the faint seam line inside c8's
  under-pass (in master too).
