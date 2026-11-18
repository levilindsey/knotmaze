# K1436: rp=gf bar test v2, a scan that sees what Levi sees (Claude agent stage, probes only)

Levi's bar for rp=gf (`docs/design/K1407_c1_bar.md`, first section): at a junction or under-tail end the over
thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver. Levi, 2026-11-17, on the
live page: "I still see plenty of border artifacts." Every gf stage is judged by a scan, so the scan has to
flag what the eye flags and nothing else. Today's does not:

- K1433's reference-free test (`.claude/probes/K1433/k1433_lib.ts`, `k1433_scan.ts`; Handoff K1433 in
  `docs/design/K1433_union_field_trial.md`, read its Part 1 whole) misses ink dips shallower than about 0.4:
  the def seam notches on d547dab6 (an ink dip of 0.10-0.22 over 31-35 px, c4's measurement) read clean
  (its validation 2b), and its `plain` class was 0 real of 9 looked at.
- Its descendants (`.claude/probes/K1449/k1449_scan.ts`, `.claude/probes/K1451/k1451_scan.ts` and
  `k1451_cls.ts`, which names a tie find's cause; Handoffs K1449 and K1451) inherit both faults.

## Do

1. A band-profile check: along each exposed edge, sample the outline band's ink at fixed offsets across its
   width and walk it by arc length; flag a dip, a step or a gap against the band's own running level (not a
   fixed 0.5-0.6 threshold), with a length and a depth floor you set from the measured two-load noise.
2. A crossing exemption that is geometric (the under thread's band is cut where the over thread covers it),
   so a clean crossing never flags and a smear across one does.
3. Fix or drop the `plain` class so that what it reports is real.
4. Keep the classes and the per-find output the later tools read (site, class, px), so `k1451_cls.ts` and
   the scan-all scripts can run on v2 unchanged or with a one-line change.

## Done

1. Validation 2b passes: the def notches flag on d547dab6 and not on master; validations 1, 2a and 3 of
   Handoff K1433 still pass.
2. Precision, by your own eyes at 4x: 40 finds sampled across classes and scenes on master (10 per class
   where a class has 10), each cropped with the flagged pixels marked, each named real or false; at least
   85% real overall and no class under 70%. Put the sheets under `.claude/probes/K1436/out/`.
3. Recall: the twelve spots of `.claude/probes/K1451/out/fix_a.png` / `fix_b.png` all flag on master; the
   kink-loop tick flags on c5fc87d1 and not on master (it is the look's: if the scan cannot see the look,
   say so and leave it); twenty clean stretches you pick (plain crossings, plain junctions) do not flag.
4. The 12-scene numbers on master, v1 beside v2, per class, at `gfh=1` and flag off, and the run time.
5. A short "how to run" at the top of the scan file, and the thresholds with the measurement behind each.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `.claude/probes/K1436/` only (copy what you need from K1433 / K1449 / K1451). Nothing under `src/`
  or `test/`: two agents are changing `src/render/gpu_field/` now, and the census bars stay as they are
  until this test is validated (replacing them is the next stage).
- Before any 12-scene scan, wait on `$env:TEMP\claude-perf.lock` inside one blocking command while another
  owner holds it (a lock older than 30 min is stale); do not take it yourself.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5600-5619 if you need a page. Headed, real-time Chrome, never `--virtual-time-budget`.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files and sheets, not for scan dumps
  you can regenerate). Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work (scans, sheets), with this stop rule.
- Own the technique: the checks named in Do are a starting point, the bar is Done 2 and 3.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1436` here, commit, and report: what holds, the sheets' paths, the numbers, a
`Ledger items` list and K1436's handle fields.

### Handoff K1436

Stage done 2026-11-17 15:10 (start 13:48). Tools and outputs: `.claude/probes/K1436/` (how to run and the thresholds
with their measurements: the header of `k1436_scan.ts`).

**v2.** The scan keeps v1's strays (dstray, rstray) and replaces dbreak, rbreak and rthin with a band profile
(`k1436_lib.ts`): per exposed-edge site a ray along the smoothed normal measures the band's width; the level is a
quadratic fit along the edge, and the residual's median flags vdip (thinner, or a hole in the core) and vwide (wider,
or ink past the inner edge). Corners (normal turns > 30 deg within 1 aa) are exempt. GEOMETRIC CROSSING EXEMPTION: the
ray stops where it crosses onto another surface, so a clean crossing never flags and a smear before it still does.
`plain` is fixed by construction: the plain finds that remain are real band faults (14 of 15 sampled real). A label
change with no band flags only when the fills either side differ by more than 0.08 (SEAM): a missing band between two
colours is real (K1451's g41_ring_tw64:19.78:20.37), a same-colour seam is not. At the scan's 100 px/unit, vwide is off
and band finds need 9 px (WIDE 0, MINPX 9, UPX 3, DWPX 0.6; the crops keep vwide and 4 px).
Output is k1451_scan's JSON (`finds` {kind, cls, x, y, px, peak}, `cnt`/`px`) plus v1's tally on the same raster
(`cnt1`/`px1`) and timings. `k1451_cls.ts` runs unchanged on files named `<variant>_<scene>.json` (scanall writes
`<tag>/<scene>.json`: copy or rename; on the h1 scan: cfg 21, zeq 14, zdiff 8, grp 17).

**Done 1, validations (crops, 480 px, `out/val/rows_final_*.txt`): all hold.** 2b: def:3.60, 30.88, 3.69 flag on
d547dab6 (vwide 4, vwide 5, vdip 8+8 + vwide 8) and are clean on u and src. 1: the four open spots flag on u. 2a:
muse_hash:5.53 flags on 1336 (vdip 12+4+12), clean on u and d547. 3: all 25 clean spots clean on u.

**Done 2, precision (`out/prec/judgements.txt`, sheets `sheet2_h1.png`, `sheet2_h0.png`, `sheet3_h1.png`,
`sheet3_h0.png`, keys `key2_*`, `key3_*`): holds.** 50 finds, 44 real = 88%; tie 16/16, plain 14/15, ramp 14/19
(74%). The false ones: vdip:ramp at clean band edges by white (3 of 6 sampled), rstray:ramp of 3-6 px with no ink (2),
one unclear vdip:plain. Sheet 1 (`sheet_h1.png`, `sheet_h0.png`, before WIDE 0 / MINPX 9 / SEAM) was ~55-60%: short
vwide and vdip at clean edges and corners.

**Done 3, recall.** The twelve K1451 spots (GF_HOME=1, src; `out/val/k1451/rows_v2.txt`, `scan_v2.txt`): all 12 flag
on the crops; in the 100 px/unit scan 11 of 12 have a find within 0.28 (19.78:20.37 by the SEAM test, vdip:tie 199
px). muse_hash:2.02:9.63 does not: at 100 px/unit its dip is 8 px, under MINPX 9 (it flags at MINPX 4). The kink-loop tick (c5fc87d1) is NOT visible to the CPU scan: that merge changed only
`gf_look.ts`, `gf_pass.ts`, `gf_app.ts` and `url_state.ts`, never `eval.ts`, so GfEval draws the same picture on both
sides; left. Twenty clean stretches (`k1436_clean.ts`, picked by geometry, `out/clean/`): all 20 clean by eye, none
flag (scan and local rerun). Caveat: the ten "junction" picks landed on plain band edges near junction groups, not
on webs.

**Done 4, 12 scenes on src, ppu 100, v1 / v2 finds per class:**

| class | gfh=1 v1 | gfh=1 v2 | flag off v1 | flag off v2 |
|---|---|---|---|---|
| tie | 176 | 60 | 1744 | 1162 |
| ramp | 192 | 25 | 53 | 19 |
| thru | 4 | 0 | 4 | 0 |
| plain | 2062 | 71 | 2163 | 43 |
| all | 2434 | 156 | 3964 | 1224 |

v2 by kind, gfh=1: dstray plain 2 / tie 24, rstray plain 19 / ramp 19 / tie 21, vdip plain 50 / ramp 6 / tie 15.
Flag off: dstray tie 710, rstray plain 12 / ramp 16 / tie 336, vdip plain 31 / ramp 3 / tie 116.
Run time: the 12 scenes in parallel, 61-84 s wall, 184-236 s CPU (the raster dominates; v2 adds ~1-2 s per scene).
Some scenes died out of memory in parallel runs while the disk was full (twice this hour, not this stage's files) and
were rerun alone; the table is from all 12 JSONs.

**Residuals.** vdip:ramp's precision (3 of 6 false); rstray (v1's, kept unchanged) has short 3-6 px false finds; the
scan cannot see the def seam notches (0.15-0.35 px at 100 px/unit; only the crops can), so a notch regression needs
the spots tool, not the scan. Scan dumps (`out/scan_h*/`, `out/noise/`) are regenerable and not committed.
