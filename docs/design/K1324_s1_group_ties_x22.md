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
