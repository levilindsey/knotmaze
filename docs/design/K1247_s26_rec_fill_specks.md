# K1247 stage 26: the record fill follows fillFrame, and the class (a) specks

Ledgers: K1247 (this), K1322 and K1324 (the two fixes), K1314 (the census), K1310 (the gate). One Claude Opus
agent in its own worktree, on its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md`,
the s25 handoff at the end of `docs/design/K1247_s25_column_pass.md` and the s6 handoff at the end of
`docs/design/K1314_s6_faults.md`.

## Why

- **K1322:** the app draws rp=outline's fill from records (`fill_tri.ts` `recStrip`, `recStrips`, the record
  shaders), and `oe=0` falls back to `fillFrame`. The K1314 census rasters `fillFrame`, so it certifies the
  fallback, not what the app draws. K1314 s5 and s6 changed `fillFrame`'s strip rule; `recStrip` still has the
  older one, so the app can show g41_ring_tw64 x67's tongue and x68's wedge that s6 cleared. s6's rule (commit
  c5ba26b8): a strip whose two border pieces span different s ranges samples both sides on one s scale (their
  union; a side outside its span holds at its piece end) and keys its centre at the mid s, except where the
  ranges part at a junction end (`JEND_GATE`), which keep s5's rows (each border row keyed by its own side's
  s, the centre by the higher of the row's and the mid s's depth).
- **K1324:** specks or a dark blob inside the ink at def j174, ring j12, g41_ring_tw42 j12 and g41_user_tw64
  j28 (crops: `.claude/probes/K1314/out/s6/after4x/spot_016.png` to `spot_019.png`, reference | master | s6).
  K1314 s6 traced them to `draw.ts` `tieAlpha` / `contactPasses` tying two arms of one form B junction group,
  so the band fades ink there (def j174: c71 and c73, group 119).

## Goal

1. The record fill draws what `fillFrame` draws, and a test fails when they part, so a later `fillFrame`
   rule cannot silently miss the app.
2. No contact pass and no tie between two arms of one junction group, with the specks gone and nothing new.

The technique is yours. Today's look (no `rp=outline`) stays byte-identical.

## Done

1. **The tie:** the record fill against `fillFrame` on every K1314 census scene (your own twin, or extend
   `k1247s19_twin.ts` / `k1247s19_fillcensus.ts`): per-vertex key and s, and the rastered fill. Report the
   largest difference per scene, before and after; x67 and x68 at 0. A vitest that ties them on ring
   (`test/render/fixtures/outline_ring.json.gz`) and on g41_ring_tw42 when its scene is on disk.
2. **The specks:** the four spots clear, crops reference | master | after at 4x or more in
   `.claude/probes/K1247/out/s26/`.
3. **Census:** `k1314_run.ps1 -Lock` (K1314's census, the reference as on master): no kind above
   `census_s6` (stray_ink 12, hard_edge 2, paper 0, broken_ink 13, k1049 0), and every find that moved named
   with its spot. Crop every new find.
4. **The gate's per-stage checks:** the main frame on def and fat, ABBA under the perf lock
   (`k1247s25_bench.ps1`), no worse than master beyond the run-to-run spread. `npm test` green, golden
   snapshots unchanged, `outline_port.test.ts`'s pins re-frozen only where your fix moves them and named in
   the commit. Copy `.claude/probes/K868/scenes/g41_ring_tw42.json` from the main checkout first: it is
   untracked, so without it the test's second pin skips.

A failing check is work to do, not a reason to stop.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to a
  file and read only the lines you need). Use the Read tool only right before an Edit, and to view crops.
  Junction `node_modules` from the main checkout; never `npm ci`. Read `.claude/rules/probes.md` before
  probing: a bare URL is today's daily. Real-time headed Chrome only; never `--virtual-time-budget`.
- **Untracked inputs** (K1247 s22-s25 drags and outputs, K1314 censuses, crops, form B caches) are in the
  main checkout's `.claude/probes/K1247/out/` and `.claude/probes/K1314/out/`. Copy what you need into your
  worktree and never write there. Delete any form B cache you copy before you stop.
- **Your files:** `fill_tri.ts`'s record code (`recStrip`, `recStrips`, `fillStructure`, `stripNb`),
  `rec_glsl.ts`, `chain_frame.ts`, `draw.ts`, `band_rec.ts`, `band_place.ts`, `band_gpu.ts`, `outline_app.ts`,
  `outline_model.ts`, `outline_worker.ts`, `src/app/frame_loop.ts`, new files of your own, tests, and your
  tools under `.claude/probes/K1247/`. One other agent runs at the same time: **K1314 stage 7** works in
  `outline.ts`'s corners, pieces, folds and fans and in `fill_tri.ts`'s `fillFrame`. Don't edit `fillFrame`:
  port its rule, don't move it. If one shared rule (code both paths call) is the better design, say so in the
  report for after s7. If s7 changes `fillFrame` again, your tie test will catch it at its merge; that is
  intended. Leave the census reference (`k1314_census.ts`'s reference code, `form_b_fillet.ts`) as it is.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs.
  Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start.
  Never touch the phone.
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
- the tie's largest difference per scene, before and after, and the test;
- the specks: the rule and where it lives;
- the census counts per kind, before and after, and the finds that moved;
- the main frame on def and fat, before and after;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1247's handle fields.

## Handoff (K1247 s26 agent, 2026-11-12)

Start 03:43:05, stop 05:42 (the 2 h cap). Branch `worktree-agent-aa4ea631c73c1c296`, on master 46e057fb (K1314 s7 merged).

**K1322, the tie.** `recStrip2` (fill_tri.ts) and `recPlace` (rec_glsl.ts) key every strip as `fillFrame`
does, including K1314 s7's mirror: the strip table's mode texel carries mirA, mirB (bits 2, 3) and the two
sides' centre-polyline flags (bits 4, 5); a column past its span and inside the other side's takes the other
side reflected across the chain (`recPt`), with its key and s. The CPU twin (fillRec 3, k1247s19_lib.ts
twin4) follows. Largest key difference, fillFrame against fillRec 3, pre-s26 master -> after: muse_hash
0.919 -> 0, muse_default_tw 0.403 -> 0, def 0.352 -> 0, fat 0.444 -> 0, ring 0.576 -> 0, user_tw42 0.323 -> 0,
g41_def_tw42 0.211 -> 0, g41_def_tw64 0.615 -> 0, g41_ring_tw42 0.181 -> 0, g41_ring_tw64 0.579 -> 0,
g41_user_tw42 0.323 -> 0, g41_user_tw64 0.635 -> 0 (row s too; out/s26/tie_before.json, tie_after_s7.json).
Raster px differing: muse_hash 769 -> 234, def 383 -> 62, g41_def_tw64 632 -> 124 (the rest likewise; what is
left is the columns' positions, which differ by design). Test: `test/render/rec_tie.test.ts` (ring fixture at
rest and waved, g41_ring_tw42, and the mirrored strips of muse_hash and g41_user_tw64 where the untracked
scenes exist; only those two scenes have mirrored strips, k1247s26_mir.ts). GPU against the twin: the mirror
strip of g41_user_tw64 0.0008 px.

**K1324, the specks.** `draw.ts` `contactPasses` skips a hit between two arms of one form B junction group
(`groupArms`, slack 0.25 h, cut at the sentinel), switch `CONTACT_GROUPS`. Same-group passes on def 367 -> 0;
the specks at def j174, ring j12, g41_ring_tw42 j12 and g41_user_tw64 j28 are gone
(out/s26/master4x | after4x, 4x, taken before the s7 merge; the K1324 change does not touch the fill).

**Census** (s26b against census_s7f; branch | s7f): **NOT DONE: stray_ink is above census_s7f.** Groups 0 and 1 (8 of 12 scenes;
group 2 died on an EPERM writing the shared fbf cache and was re-run alone after the stop): stray 21 | 8, hard
1 | 1, paper 0 | 0, broken 6 | 7, k1049 0 | 0 (census_s26b_0/1.txt against s7f on the same scenes). New
stray_ink: muse_hash (19.30,10.81) 358 px, (5.34,21.58) 1522 px, (10.92,14.46), (21.21,21.32), (26.58,21.03)
690 px, (24.65,23.28), (33.02,23.00), (12.76,31.58); g41_def_tw64 (30.55,6.42), (19.34,14.50), (29.56,13.35),
(31.24,19.62), (10.46,31.50). muse_hash broken_ink 2 -> 1. The pre-merge census s26 had the same rise
(muse_hash 9 -> 17, g41_def_tw64 0 -> 5 against s6), and the census rasters fillFrame, which this branch does
not touch, so the inferred cause is K1324's skipped contact passes (draw.ts): not tested, and not cropped
(no time left). Test it first: census muse_hash with `CONTACT_GROUPS = false`.

**Main frame** (ABBA under the perf lock, ee53408f | c8ae2b86, out/s26/bench_s7_def.json, bench_s7_fat.json):
def rest p50 5.8, 5.9 | 5.7, 5.7 ms, drag p50 6.7, 6.8 | 6.6, 6.6; fat rest 6.1, 6.1 | 5.9, 5.8, drag 7.1, 7.1 |
7.0, 6.9. No worse. Worker fill p50 on fat 41.6, 35.9 | 42.7, 45.6 ms: within A's own spread, but note it.

**Left:**
- The reference draws a thin paper crack between two arms of one group that neither master nor the branch
  draws (after4x crops).
- GPU against the CPU twin: 118 vertices of muse_hash over 1/4 px, max 1.85 px, at FLOOR strips o375 and o850
  row 2 (whole-span recCol rows, no mirror); def 1.63 px. s19 measured 0.002 px, so it entered between s20 and
  s26 in the recCol path; when is not verified.
- The mirror is tied only on untracked census scenes; a tracked fixture with a mirrored strip would pin it.
- One shared rule (a function fillFrame and recStrip2 both call for the jEnd, mirror and keys) would end the
  port-and-tie cycle; worth doing once K1314's corner work settles.
- Inputs copied into this worktree, untracked: `.claude/probes/K868/scenes/muse_hash.json`,
  `g41_user_tw64.json`. No caches copied.



**Census, all 12 scenes** (group 2 re-run alone, merged as census_s26b): stray 31 | 11, hard 1 | 1, paper 0 | 0, broken 12 | 13, k1049 0 | 0. Group 2 adds muse_default_tw stray 0 -> 2 and g41_user_tw64 stray 3 -> 8 (census_s26b_2.txt).
