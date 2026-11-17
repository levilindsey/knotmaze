# K1435: grouping and over/under from the knot's graph, at table time (Claude agent stage, probes only)

## Why

K1433 (read its `### Handoff K1433` in `docs/design/K1433_union_field_trial.md` whole, Part 3 above all) found:
- Replacing step 4 of `eval.ts` with a union field is not the fix; step 4 stays.
- Spot 16, spot 6, the two smudges and about 2,030 tie- and ramp-class finds over the 12 census scenes are one
  decision, made per pixel from whichever pieces happen to be gathered: are these two pieces the same surface,
  and if not, which is on top. The graph knows both answers when the tables are built.

The bar is Levi's (`docs/design/K1407_c1_bar.md`, first section). Levi asked for this step back after weeks of
slow progress; this probe decides whether K1407 moves from patching the membership and tie rules to deciding them
in the tables.

K1407 c5 is editing `eval.ts`, `gf_glsl.ts` and `tables.ts` in another worktree, and Muse works in the main
checkout. **You change no file under `src/` or `test/`.** Everything goes under `.claude/probes/K1435/` and this
brief. Copy `eval.ts` (and `tables.ts` if you need more table data) into the probe directory and change the
copies. K1433's tools are yours: `.claude/probes/K1433/` (`k1433_lib.ts`, `k1433_spots.ts`, `k1433_scan.ts`,
`k1433_sample.ts`, `eval_u.ts` as an example of a probe evaluator).

## The probe

In the copies, keep steps 1 and 4 and change how steps 2, 3 and 5 decide:
- **Membership.** Which surface a piece belongs to comes from a table-built list of arc-length intervals per
  chain (junction arms, their cuts, the ramps' extents), not from which other pieces the pixel gathered.
- **Order.** Where two surfaces' keys tie, the order comes from the graph (crossing over/under, junction group),
  not from the per-pixel tie blend. Keep a blend only where the handoff says it must stay per pixel: sliding
  crossings' location, key interpolation along arc length, cap and reveal ramps, true-seam anti-aliasing.

The design within that is yours. If a part cannot be decided at table time, say which and why, with the spot that
shows it.

## Done

1. The four open spots (16, 6, both smudges) clean by K1433's test and by eye at 4x, next to master gf and
   rp=outline. For any that is not, what you tried and why it fell short.
2. The 25 other spots of `spots.txt` still clean, by the test and by eye.
3. K1433's scan over the 12 scenes, master against the probe: tie- and ramp-class finds per scene. They fall on
   every scene; report by how much. Look at a seeded sample of 20 remaining finds at 4x and say what they are.
4. Sheets for Levi under `.claude/probes/K1435/out/`: master gf | probe | rp=outline, for the 29 spots and 10
   of the worst tie-class sites on master. If the app's real look differs from the probe's debug colouring in a
   way that matters to judging a smudge, say so.
5. What moving this into `src/` takes: the table changes and their size, the shader's per-pixel work against
   today's (a count of loop trips or segment tests on two scenes), which pins move, and the stages you would
   brief, each with its bar.

## How to work

- Start with `git fetch origin`, `git merge --ff-only origin/master` and `Get-Date`.
- Use PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- CPU only. For a run of more than a few minutes on all cores, take `$env:TEMP\claude-perf.lock` (one line:
  owner, start, what), wait inside one blocking command if it is held, and delete it after.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files). Never push. Never edit LEDGER.md.
  Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work, with this stop rule.
- Report what you measured apart from what you infer. Look at every spot yourself before calling it clean.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1435` here, commit, and report. Lead the report with the verdict in plain words (move grouping to
the tables, or not), then the sheet paths, the numbers, the stages to brief, a `Ledger items` list and K1435's
handle fields.

### Handoff K1435

Stopped 2026-11-16 about 19:45 (started 19:06:44), all five Done items answered. Probe only: nothing under `src/` or `test/` changed.

**Verdict.** Move MEMBERSHIP to the tables, not the order. A piece inside a junction arm's home interval (arm root to the crossing that cuts it, a per-arm table fact) belongs to that junction's group, and the per-pixel part that must stay is one ramp: membership fades 1 -> 0 as the piece's own depth goes 0 -> 3 zt (probe mode `tgr`). Order from the graph with no blend (`tg`, `tgm`) is not the look: it trades the smears for crisp cut stubs, slivers and wedges. Fairly sure of the mechanism (measured on 12 scenes); the remaining look (a thread that fades in softly out of the fill) is Levi's call.

**Measured.**
- 29 spots, `tgr`: 27 clean by K1433's test. Spot 16 and smudge 1 clean by test and by eye. Spot 6 (muse_hash:29.74:20.26) flags `rstray:tie 2549`: by eye the fill is clean and the thread fades in softly (no smear, no cut end). Smudge 2 (muse_hash:19.41:14.16) flags `dstray:tie 6`, the same 6 px as master: a small soft wedge under the top thread, also on master and rp=outline. The 25 others: clean by the test, and identical to master by eye at 4x (all six sheets viewed).
- Scan, 12 scenes, tie+ramp finds / px: master 2030 / 82296; `tgm` 308 / 14854; `tgn` 695 / 24554; `tgr` 547 / 19287. Per scene: `out/scan_tgm.txt`, `scan_tgn.txt`, `scan_tgr.txt`. `tgr` by kind: dbreak:tie 174->23, dstray:tie 829->24, rbreak:tie 236->13, rstray:tie 411->99, rthin:tie 329->40, but rthin:ramp 20->285 and rstray:ramp 15->58 (the new membership ramp is itself flagged).
- Seeded sample of 20 of tgr's remaining finds, viewed at 4x (`out/sheet_sampletgr_1..4.png`): 9 show nothing visible (rthin:ramp of 3-22 px); 5 are a thread end fading softly out of a fill or a soft shadow where a thread dives under, the same on master; 2 are the multi-thread overlap sites (muse_hash:22.09:34.40, 20.02:3.95) where tgr removes the ghosts but leaves soft bands and a small crisp notch at an outline; 1 is tgr-only: a small soft dark nub on an outline (muse_hash:34.29:18.93); 1 is WORSE than master: g41_user_tw64:17.80:9.55, a soft dark band across the fill; 2 are faint soft creases weaker than master's.
- Worst 10 master tie sites (`out/sheet_worst_1..2.png`): tgr removes the ghost threads in 8; ring:19.63:20.34 and g41_ring_tw64:19.78:20.37 are unchanged in every mode (two threads lying along each other, not a demoted arm).
- Per-pixel work (scan `cost`, per active pixel; master -> tgr): muse_hash segment tests offered 39.2 -> 39.2, segments kept 2.6 -> 3.8, piece calls 0.23 -> 0.33, configurations 1.125 -> 1.063; def 27.8 -> 27.8, 2.5 -> 2.6, 0.29 -> 0.29, 1.09 -> 1.053. The probe's `home()` is one more pass over the chain's arms per piece (not in those counts); in `src/` it folds into `member()`'s arm loop. Timings in the JSONs were taken under load without the lock: do not quote them.

**Inferred, not verified.** The probe paints debug run colours; smudges are judged on ink, so the app's look should match, but it was not rendered in the app. RZ = 3 was the only ramp width tried; `tgs` (tgr + graph order) was scanned on spots only and not viewed.

**What `src/` takes.**
- Tables: per arm a home extent (`max(aL, min(dist to the next pin ahead, 4h))`, or aL when uncut). The arm record (`gf_pack.ts`, 2 texels) has three free floats, so zero growth; the `o.ka` key-arm records likewise. Filled in `tables.ts` next to aSR/aDir/aL/aLcut/aG (line ~307).
- Evaluator and shader: `member()` (eval.ts; gf_glsl.ts:871, called at 1367, 1466, 1487) gains the home test and the depth ramp. More pieces ramp, so the zc "no ramps" P0 depth class and MAXR = 2 need a look.
- Pins that move: `gf_pack.test.ts` (layout), `gf_build.test.ts` (tables bit for bit), `gf_keys.test.ts`, `gf_tier_forms.test.ts` (the grp / zc / zb / zk / zf text forms), `gf_split`, `gf_look`, and any gf census or golden.
- Stages: (A) tables + eval.ts on the CPU. Bar: 29 spots at least 27 clean with the 25 unchanged; scan tie+ramp at most 547 / 19287; table size unchanged. (B) GLSL mirror and tier forms. Bar: CPU-vs-GPU parity as today's gf tests; frame cost on muse_hash and def within noise under the perf lock. (C) Levi's look call on sheets: soft fade-in vs master, and RZ. (D) separate items: the lie-along sites no mode changes; the tgr-worse site g41_user_tw64:17.80:9.55; the rthin:ramp rise.

**Pictures** (`.claude/probes/K1435/out/`, columns in each `.txt`): `sheet_spots_1..6.png` (29 spots: master | tgr | rp=outline; the four open spots are rows 2-5 of sheet 1), `sheet_worst_1..2.png` (worst 10), `sheet_variants_open.png` and `sheet_variants_worst_1..2.png` (master | tgr | tgm | tgn | outline: soft vs crisp), `sheet_sampletgr_1..4.png` (tgr's sample), `sheet_sample_1..4.png` (tgm's sample: master | tgm | tgr | outline).

**Rebuild.** `node .claude/probes/K1435/k1435_mkprobe.mjs` regenerates `eval_t.ts`, `k1435_spots.ts`, `k1435_scan.ts` from the tracked sources; modes are `GfEval.MODE` (master, tg, tgo, tgu, tgx, tgm, tgn, tgr, tgs).
