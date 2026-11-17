# K1449: home membership (gfh=1), what is left (Claude agent stage)

## Where it stands

K1438 and K1439 (merged; read both handoffs: `docs/design/K1438_home_membership.md`,
`docs/design/K1439_home_membership_glsl.md`) put junction membership from the arms' home intervals into the
tables, the CPU mirror and the shader, behind `gfh=1` (off by default; `GF_HOME=1` / `buildTables(scene,
{ home: true })` on the CPU). The junction fade follows `fadeLength` live. With it on, K1433's scan reads
435 tie+ramp finds over the 12 census scenes (1797 off) and 28 of 29 spots are clean. Levi has the link and
has not yet chosen it as the default; this stage works with the flag ON and must leave flag-off untouched.

The bar is Levi's: at a junction or under-tail end the over thread's outline runs on unbroken, with no dot,
stub, wedge, tick, notch or sliver. Where a thread dives under a junction, it fades over `fadeLength`.

## Do, in this order

1. **Flag-off pixels (K1445).** Rerun `.claude/probes/K1439/k1439_offab.ps1 -Branch 963029e8` (perf lock)
   or an equivalent: flag-off GPU pixels equal master-before-K1439's on def and muse_hash. If its page sticks
   in "loading" again, find out why. Report the number.
2. **Classify what is left with the flag on**, at the default `fadeLength`: the 435 finds
   (`.claude/probes/K1438/out/scan/`), and these named sites: muse_hash 5.88,8.50's left-edge stub and
   19.41,14.16's dash inside the curl (both visible in `.claude/probes/K1439/out/sheets/sheet_muse_hash.png`,
   in K1439's worktree `agent-ab538fa67ad6c86dd`); muse_hash 31.56,7.41, 33.64,9.23, 22.09,34.40, 34.29,18.93;
   ring 19.63,20.34; g41_ring_tw64 19.78,20.37 and 16.43,2.90; g41_def_tw64 11.21,8.29; def 9.06,6.41;
   g41_user_tw64 17.80,9.55. A table: class, count, px, one example crop each, the cause in the tables or the
   evaluator.
3. **Fix the largest classes** in `tables.ts`, `eval.ts`, `gf_keys.ts`, `gf_glsl.ts`, under the flag, CPU
   first then the mirror. Order stays per pixel (K1435 measured that crisp graph order leaves stubs).
4. **`fadeLength` 0.** K1439 found the hard step float-sensitive at a depth tent's foot, and K1438 that 0
   brings tie bands back (690 finds). Make 0 read as a crisp cut without those: say what you did.

## Done

1. Flag off: pixels equal (item 1), `gf_home_glsl.test.ts` green, no existing pin moved.
2. Flag on, default `fadeLength`: tie+ramp at most 250 finds over the 12 scenes; at 0, at most 435. Per-scene
   table, and the class table before and after.
3. The 29 spots (`.claude/probes/K1407/out/c4/spots.txt`): none worse than K1438's sheets; the named sites
   each fixed or reported with cause and attempts. Sheets under `.claude/probes/K1449/out/`
   (K1439 gfh | new gfh | rp=outline) at `fadeLength` 0, default, 1.2.
4. GPU = mirror with the flag on (K1439's `k1439_parity.ts`): def and muse_hash, at most the 3 px K1439 found.
5. Bench under the perf lock, flag on against K1439's flag on: within 5%.
6. `npm test` green.

## How to work

- Work in your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5540-5559. Screenshots from a headed, real-time Chrome, never `--virtual-time-budget`. Stop preview
  servers before a GPU census. One performance measurement at a time: `$env:TEMP\claude-perf.lock` (Muse
  batch 25 takes it too; wait inside one blocking command).
- Not yours: `gf_look.ts`, `gf_reveal.ts`, `gf_explore.ts`, and all but the flag's lines of `gf_pass.ts` /
  `gf_app.ts` (Muse batch 25 works there in the main checkout).
- Commit WIP at every milestone, broken or not (`git add -f` for probe files). Never push. Never edit
  LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work, with this stop rule.
- Look at every spot yourself at 4x. A junction's shape is Levi's to judge: show it, don't pick it by a metric.
  Own the technique: for anything open at the stop line, report what you tried and why it fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1449` here, commit, and report: what holds, sheet paths, numbers, a `Ledger items` list
and K1449's handle fields.


### Handoff K1449

2026-11-17, agent a02a2023ec92cd84f (claude session 01SUPGULDxvE5gKXozfaFaFG), 05:58 to 07:50, worktree
`.claude/worktrees/agent-a02a2023ec92cd84f`, branch `worktree-agent-a02a2023ec92cd84f`. Not pushed. Evidence
in `.claude/probes/K1449/` (scripts; `out/`).

**The change (f71f824c), flag on only.** `eval.ts` `homeRamp` and its mirror `gf_glsl.ts` `homeForm`: a home
arm is a full member down to the tie depth `zt` (0.1 amp), then fades to `Z = fadeLength*amp/win`
(`1 - ss(zt, Z, |z|)`); when `Z <= zt` (fadeLength at or under 0.1 win: 0.066 on the census scenes) it is a hard
step at `zt`. K1439's mapping was `1 - ss(0, Z, |z|)`, which at fadeLength 0 stepped at the tent's foot and left
the outline streaks and blobs the brief names. `gf_home.test.ts`'s two fade tests now pin the new extent (start at
zt, end at max(fl, zt)) and fadeLength 0's cut at zt. Flag-off text, tables and pixels are untouched.

**Done criteria.**
1. Holds. Flag-off GPU pixels against 963029e8: 0 px on def and muse_hash (`k1449_offab.ps1`, 0f70a23b).
   `gf_home_glsl.test.ts` green; no existing pin moved (only `gf_home.test.ts`'s flag-on fade expectations).
2. Half. fadeLength 0: tie+ramp 690 (K1439) -> **203** (<= 435, holds). Default: 435 -> **368** (target 250,
   **does not hold**). 1.2: 632 -> 582. Scan: `out/map2/` (`k1449_scanall.ps1`), table `out/map2/table.txt`.
3. Holds for "none worse": the 29 spots FLAG 11/28 (clip_d) against K1438's 11/28 (base_d); 11/28 against 12/27 at
   0; 7/32 at 1.2 both. Only muse_hash 19.41,14.16 (dstray:tie 6 px) flags in every variant, as in K1438, and
   rp=outline shows the same shade there. Sheets: `out/sheet_<scene>.png` (+ `.txt` legend; columns K1439 gfh 0 |
   new 0 | K1439 default | new default | K1439 1.2 | new 1.2 | rp=outline, 2x), per-spot logs `out/spots/spots_*.txt`,
   marked panels `out/mark/`, 4x strips `out/strip_muse_hash_*.png` (off | K1439 default | new default | outline).
4. Holds: GPU = mirror with the flag on, def 0 / 0 / 0 px and muse_hash 0 / 2 (1 over 0.1) / 0 px at fadeLength
   0 / default / 1.2; flag off 0 / 0 (`out/parity_k1449.json`). Caveat: Muse's batch rewrote the perf lock at
   06:45 while this ran (no context loss recorded).
5. Not settled. Round 1 against K1439's build 963029e8 (`out/bench_r1.json`, `out/bench_table.txt`; drag p50
   frame / work / GPU ms): b 16.0 / 16.3 / 13.04 -> 17.3 / 15.5 / 14.01 with the flag on (flag off on the branch
   build 17.3 / 15.8 / 13.76); p9ar6 16.1 / 17.8 / 13.00 -> 15.5 / 16.5 / 13.23 (off 16.0 / 16.2 / 13.44). Round 2
   timed out on its first page (120 s wait for rest). Two confounds: f71f824c also carries master's Muse commits
   since 963029e8 (K1423, K1425, K1431 in gf_look / gf_pass / gf_app), and main per rebuild rose from 2.3-2.9 to
   9.0-12.5 ms with the flag off as much as on, so that rise is not the flag (inferred; GfEval does not run in the
   app, so this change reaches only the gfh=1 shader's `homeForm`). Muse batch 25 rewrote the perf lock at 06:45 and
   07:25 while my parity and benches held it; the 07:25 bench's first page timed out under that load.
   The clean A/B of this change alone (5285760f gfh=1 against f71f824c gfh=1) ran twice (07:25, 07:28) and each
   time the FIRST page timed out waiting for `__knotPerf().state` to leave "loading" (120 s,
   `k1362c1_bench.mjs:164`); `out/bench2_r*.json` hold 0 runs. Measured with `k1449_load.mjs` (07:33, base build
   5285760f alone, headed): the state read "loading" at 10 s, then the next evaluate returned only at 121.8 s
   ("live"), so main was blocked about 110 s. Inferred, not isolated: the gfh=1 program's cold D3D compile on the
   bench's fresh profile (the base build has the same flag, so it is not this change). `k1449c1_bench.mjs` is the
   bench with a 300 s first-load wait. One round of it (07:39-07:47, `k1449_bench.ps1 -Master 5285760f -Branch f71f824c
   -Tag bench3 -NoOff -Rounds 1 -Runner k1449c1_bench.ps1`, `out/bench3_r1.json`; drag p50 frame / work / GPU ms,
   base -> branch, both gfh=1): b 17.3 / 17.3 / 14.09 -> 16.9 / 18.2 / 11.81 (-2.3% / +5.2% / -16%), but the
   branch page never reached rest (restWait hit its 120 s cap), so its drag started from a different state;
   p9ar6 15.7 / 16.7 / 13.24 -> 15.8 / 17.0 / 13.23 (+0.6% / +1.8% / -0.1%, both rested). p9ar6 is within 5% on
   all three; b is not a clean comparison. Muse's batch overwrote the perf lock during this round too ("25A muse
   fill check" at 07:45), so these numbers were taken under load. Next: two more rounds, alone, reversed order.
6. Holds: `npm test` 250 files / 3104 tests green on f71f824c (src unchanged since).

**Class table (tie+ramp finds, 12 scenes; K1439's mapping -> the new one).**

| kind:class | default | 0 | 1.2 |
|---|---|---|---|
| rthin:ramp | 178 -> 171 | 7 -> 5 | 520 -> 483 |
| rthin:tie | 101 -> 95 | 41 -> 26 | 33 -> 26 |
| rstray:tie | 74 -> 21 | 71 -> 21 | 2 -> 0 |
| dstray:tie | 24 -> 24 | 225 -> 24 | 24 -> 24 |
| dbreak:tie | 23 -> 23 | 170 -> 89 | 23 -> 23 |
| rstray:ramp | 17 -> 19 | 14 -> 14 | 10 -> 9 |
| rbreak:tie | 13 -> 13 | 159 -> 22 | 13 -> 13 |
| rbreak:ramp | 4 -> 2 | 3 -> 2 | 5 -> 3 |
| dstray:ramp | 1 -> 0 | 0 -> 0 | 2 -> 1 |
| **total** | **435 -> 368** | **690 -> 203** | **632 -> 582** |

Flag off (K1438's `out/scan/off_*`): 1797 tie+ramp finds.

**Per scene, tie+ramp finds (default K1439 -> new; 0 K1439 -> new).** def 17 -> 23, 63 -> 16; fat 0, 0;
g41_def_tw42 6 -> 3, 6 -> 5; g41_def_tw64 46 -> 44, 159 -> 23; g41_ring_tw42 1 -> 0, 1 -> 0; g41_ring_tw64 21 -> 21,
43 -> 17; g41_user_tw42 15 -> 13, 19 -> 14; g41_user_tw64 52 -> 42, 83 -> 14; muse_default_tw 12 -> 17, 36 -> 4;
muse_hash 241 -> 184, 243 -> 88; ring 9 -> 8, 18 -> 8; user_tw42.lightpaper 15 -> 13, 19 -> 14.

**Why the default stays at 368 (measured, `k1449_attr.ps1`, `out/map2/attr.txt`).** Each find was matched to a
flag-off find of the same kind within 0.15 world. At the default, 246 of the 368 (8169 px) sit on defects the
flag-off renderer has too: crossing-tie shade wedges, dashes and breaks that home membership does not touch
(muse_hash 31.56,7.41 and 22.09,34.40, ring 19.63,20.34, g41_ring_tw64 19.78,20.37 are identical with the flag
off). 122 (3954 px) are new to home: rthin:tie 62, rthin:ramp 47, rstray:tie 12, rstray:ramp 1, the largest on
muse_hash (16.43,4.77; 22.38,10.76; 5.09,8.32; 2.02,9.63; 16.03,19.68, about 110-200 px each). They are the fade's
outline taper where a diving arm leaves its junction (the judge reads the taper as a thin outline). At 0 only 1
find is new. So 250 needs either the crossing-tie defects fixed (outside home membership; they also cost the
flag-off renderer) or a different fade look, which is Levi's to choose from the sheets. Mappings tried at
the default: a ramp from zt to zt+Z (`zt`): 457 on 12 scenes, worse; a ramp centred on zt (`ctr`): equal to K1439
on the 4-scene scan `out/map1/` (356 / 356); a shifted ramp (`sh`): reduces to K1439 at the default and 1.2; the
clip (kept): 368. None removes the taper, since any fade along the arm draws one.

**Named sites (4x, new mapping at the default unless said).**
- muse_hash 5.88,8.50 (left-edge stub): fixed (the stub and the dash at the crossing are flag-off defects that home
  removes; K1439's fadeLength 0 step streak, rthin 2533 px, is gone at the new 0).
- muse_hash 19.41,14.16 (dash inside the curl): fixed; 6 px of dstray:tie remain at the upper crossing, the shade
  rp=outline draws there too.
- muse_hash 31.56,7.41: open, identical with the flag off (dbreak 4845, dstray 1130+1151 px): a crossing-tie shade
  wedge, not membership.
- muse_hash 33.64,9.23: rthin:ramp 3493 px; flag off has the same thin region (rthin:plain 3088 + rbreak 406);
  K1439's fadeLength 0 step streak is gone.
- muse_hash 22.09,34.40: open, identical with the flag off (crossing-point dstray / rthin tie).
- muse_hash 34.29,18.93: the flag-off stray (rstray:tie 2314, dstray 1470) fixed; an rthin streak of 312 px stays
  in every variant.
- ring 19.63,20.34: open, identical with the flag off (dstray 9897+9003, rbreak 580).
- g41_ring_tw64 19.78,20.37: open, identical with the flag off (rbreak:tie 940).
- g41_ring_tw64 16.43,2.90: rstray:tie 7406 -> 2763; at 0, dbreak 5808 + dstray 3201 -> dbreak 1137 + rthin 4586.
  Cause: c1 joins c0's junction group 2 with ramp 0.334, so c0's edge outline fades in as c1 dives (the fade by
  design); the crescent is now thinner. Shape is Levi's.
- g41_def_tw64 11.21,8.29: rstray 8092 -> 3222; at 0 the broad wedge with a stepped end is a crisp sliver.
- def 9.06,6.41: rstray 12029 -> 5591; at 0 the blob is a crisp tapered cut (rstray 77 px).
- g41_user_tw64 17.80,9.55: rstray 556 + rthin -> rthin 313 + rthin:ramp; at 0 a square-capped outline stub
  (dbreak 943; flag off dbreak 1862, dstray 798); at 1.2 it merges.

**fadeLength 0.** It is now a crisp cut at the tie depth zt (0.1 amp), past the tent's foot, with no ramp: no
streak, blob or stepped wedge at def 9.06,6.41, g41_def_tw64 11.21,8.29 or g41_ring_tw64 16.43,2.90 (sheets).
Side effect: every fadeLength up to 0.1 win (about 0.066 here) draws that same cut, a dead zone at the slider's
bottom.

**Open, for the coordinator.** The default-fadeLength remainder (criterion 2), the dead zone, and the fade's look
(sheets) for Levi.
