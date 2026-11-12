# K1324 stage 1: the group specks without the stray ink, and x22's twist-eye smear

Ledgers: K1324 (this), K1331 (x22), K1314 (the census), K1247 (frame cost, whose s26 tried the first skip),
K1310 (the gate). One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h. Read
first: `docs/design/K1240_gate.md`, the s26 handoff at the end of `docs/design/K1247_s26_rec_fill_specks.md`
and the s8 handoff at the end of `docs/design/K1314_s8_needles_notches.md`.

## Why

- **K1324, the specks:** specks or a dark blob inside the ink at def j174 (c71 and c73, group 119), ring j12,
  g41_ring_tw42 j12 and g41_user_tw64 j28 (crops: `.claude/probes/K1314/out/s6/after4x/spot_016.png` to
  `spot_019.png`; `.claude/probes/K1247/out/s26/master4x` | `after4x`). `draw.ts` `tieAlpha` /
  `contactPasses` tie two arms of one form B junction group, so the band fades ink there. K1247 s26 skipped
  every contact pass between two arms of one group (`groupArms`, slack 0.25 h, cut at the sentinel; switch
  `CONTACT_GROUPS`, now false). That cleared the four spots but added 20 stray_ink finds to the census
  (`.claude/probes/K1314/out/s1/census_s26b*` against `census_s26off*`, which equals the s7 baseline):
  muse_hash (19.30, 10.81) 358 px, (5.34, 21.58) 1522 px, (10.92, 14.46), (21.21, 21.32), (26.58, 21.03)
  690 px, (24.65, 23.28), (33.02, 23.00), (12.76, 31.58); g41_def_tw64 (30.55, 6.42), (19.34, 14.50),
  (29.56, 13.35), (31.24, 19.62), (10.46, 31.50); muse_default_tw 0 -> 2; g41_user_tw64 3 -> 8. Nobody has
  cropped those finds, so what ink the skip removed there is not known. Start there.
- **K1331, muse_hash x22:** a smear at a twist eye, in form B and in rp=outline
  (`.claude/probes/K1314/out/s8/after4x/spot_004.png`, `out/s8/after_x22/`). K1314 s8 traced it: the ghost is
  drawn at form B's tie alpha, and at a twist eye the depth tents cancel, so the keys tie and the ghost half
  fades in. Dropping ghosts at self-crossings cleared the smear but took muse_hash stray 8 -> 39 and paper
  0 -> 61, because those ghosts carry real under-pass border. The fix belongs in the tie or in the ghost's
  alpha at kinks.

## Goal

The four specks and x22's smear gone in rp=outline, with no new artifact of any kind. The technique is yours:
a narrower skip, a different tie rule, or something else. Form B is only a reference; Levi's bar is zero
artifacts. Today's look (no `rp=outline`) stays byte-identical.

## Done

1. **Census** (`.claude/probes/K1314/k1314_run.ps1 -Lock`): the five spots at 0, or reported as a form B flaw
   with its crop. No bar kind above `census_s8f` (stray_ink 9, hard_edge 1, paper 0, broken_ink 13, k1049 0)
   less what you clear, and every find that moved named with its spot. Copy
   `.claude/probes/K1314/out/s1/census_s8f.*` from the main checkout. Never copy form B caches: the census
   builds its own, keyed by the reference's code.
2. **Crops:** reference | master | after at 4x or more for the five spots and every new find, in
   `.claude/probes/K1324/out/s1/`, plus the s26 skip's 20 finds to show them clear. I view them before
   merging.
3. **A test** that fails if the specks' tie comes back (re-enable or rewrite `test/render/contact_groups.test.ts`,
   now skipped), and one for x22's tie if your fix is a rule.
4. **Speed:** the desktop worker frame on def, ABBA under the perf lock
   (`.claude/probes/K1314/k1314_s8_bench.ps1`), master against your branch: no worse than the run-to-run
   spread.
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
- **Your files:** `src/render/outline/draw.ts` (`tieAlpha`, `contactPasses`, `groupArms`, the ghosts), the
  band files (`band_gpu.ts`, `band_place.ts`, `band_rec.ts`), tests, and your tools and outputs under
  `.claude/probes/K1324/`. Two other agents run at the same time: **K1314 s9** owns `outline.ts` (corners,
  pieces, folds, fans); **K1247 s27** owns `fill_tri.ts`, `rec_glsl.ts`, `chain_frame.ts`, `outline_app.ts`,
  `outline_model.ts`, `outline_worker.ts` and `src/app/frame_loop.ts`. If your fix needs one of theirs, report
  it rather than editing it. If you all re-pin `outline_port.test.ts`, the coordinator re-pins at the later
  merges. Leave the census reference (`k1314_census.ts`'s reference code, `form_b_fillet.ts`) as it is.
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
- what the s26 skip's 20 finds were (what ink it removed);
- each rule and where it lives (file and function);
- the census counts per kind, before and after, and the finds that moved;
- the spots you judge a form B flaw, with their crops;
- the worker frame on def, before and after;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1324's handle fields.

## Handoff (K1324 s1 agent, 2026-11-12, start 06:10:20, stop 07:13)

Done holds for the four specks; x22 is a form B flaw whose fix needs K1247's file.

- **The s26 skip's 20 finds:** s26 skipped every contact pass between two arms of one group (whole arms, no cap
  ramp, no behind cut). At those 20 arm roots one side was OWN or a partial member, so the pass's tie fade
  (tieAlpha) was real: without it the behind thread's band stayed at full ink under the front thread's fill
  (stray_ink: 8 muse_hash, 2 muse_default_tw, 5 g41_def_tw64, 5 g41_user_tw64). All 20 are back to master
  (sheets `out/s1/s26_sheet/`, crops `crops_after/spot_006..025`).
- **The rule:** `src/render/outline/draw.ts`. `contactPasses` (its `sameGroup`) skips a pass only when both
  sides are FULL members (ramp >= `contactOpts.tau` 0.999) of one group. `groupArms` ports form B's arm cuts
  (Lcut = min over front passes of d - reach - h, behind cut k*uB, L = max(0, min(Lroot, Lcut))) and
  `groupMember` form B's member() cap ramp (ss(Lcut, Lcut - h, d), max over arms, back reach on same-group
  arms). `CONTACT_GROUPS = true`. Guard: `test/render/contact_groups.test.ts` (form B's own member() on the
  ring fixture, at rest and moved; a groups-off control shows it can fail).
- **Census k1324h (729e8b6d)** = census_s8f on every counted kind: stray_ink 9, hard_edge 1, paper 0,
  broken_ink 13, k1049 0. No counted find moved: every scene, kind, place (0.06) and pixel count is equal
  (`.claude/probes/K1324/k1324_s1_cmp.cjs`). Informational kinds: tail_look 175 -> 174 (gone: g41_user_tw64
  j10, 108 px; g41_def_tw64 j53 94 -> 47 px; crops `tail_after/`, after is closer to form B in both),
  owner_only stays 2300 with pixel shifts at 13 junction fills.
- **The five spots** (`k1324_s1_spots.ts`, ppu 320): def j174, ring j12 and g41_ring_tw42 j12 have 0 holes,
  0 stray, lowest ink 0.77-0.83 -> 0.94-0.99. g41_user_tw64 j28: the speck is gone (`crops_after/spot_004`),
  and its 44 holes / 51 stray, the same off and on, are form B's own broken outline at j28's left (the
  reference panel). j28's right keeps two faint shades beside the outline, identical in master
  (`j28r_after/spot_001`, zoom 2), where form B draws a hairline sliver. No run pass reaches that border,
  so it is not a run tie; not chased.
- **x22 (K1331), a form B flaw:** form B draws the same smear (`crops_after/spot_005`, `x22_master/`). At the
  twist eye the two passes' depth tents cancel beyond the window, so tieAlpha's sstep(-zt, zt, keyO - keyC)
  sits mid-ramp and half-fades ghost p2065. The fix is a self-pass burial rule in draw.ts tieAlpha AND the
  same in outline_app.ts's GLSL twin (K1247's file), so it is reported, not made. A wider zb tent was tried
  and rejected: it makes p47 opaque where form B fades it.
- **Worker frame on def** (outline `frame` p50, ABBA under the lock, `out/s1/bench.json`): master 66.0 / 67.0
  ms, branch 62.8 / 61.8 ms (band p50 26.0 / 15.9 -> 13.5 / 14.8). Not worse: about 4 ms faster, with a
  1 ms spread.
- **Tests:** `npm test` green (229 files, 2936 tests), golden snapshots unchanged. outline_port.test.ts
  re-pinned, band digests only: ring f0/f1 and g41_ring_tw42 f0/f1 (729e8b6d).
- **Disk full** (C: from about 06:43 to 06:55): census k1324g lost 6 scenes and left 3 zero-byte form B
  tiles (deleted). The rerun k1324h is clean, and git fsck is clean.
- **Next:** merge. x22 needs the K1247 owner of outline_app.ts plus a tieAlpha rule in draw.ts. j28's right
  shades and form B's own breaks at j28 and x22 are for the reference's owner.