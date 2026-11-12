# K1314 stage 10: muse_hash j36, g41_def_tw64 j97, j71's step, j58a's dark fade, the ramp's cost

Ledgers: K1314 (this), K1310 (the gate), K1315 and K1319 (looks waiting on Levi), K1325 (the census
reference), K1331 (x22). One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h.
Read first: `docs/design/K1240_gate.md` and the s9 handoff at the end of
`docs/design/K1314_s9_needle_shade_cost.md`.

## Why

census_s9 (stray_ink 7, hard_edge 1, paper 0, broken_ink 12, k1049 0) is master's baseline. Its finds split:

- **Yours:** muse_hash j36 broken_ink (29.74, 20.26) 2816 px, the largest find left; g41_def_tw64 j97
  broken_ink (31.05, 12.20) 319 px; muse_hash j49 stray_ink (22.56, 34.84) 44 px (s8 once grew it to 679 px,
  a black stroke across c75's fill: say whether today's 44 px is real). Then from s9: j71's small hard step
  near (5.13, 7.8) on g41_user_tw64, where the run root still cuts the band (s9 traced the real fix to a band
  that continues past the root, in the band files or fill_tri.ts); j58a's soft dark fade where form B is
  pale (`.claude/probes/K1314/out/s9/after4x/spot_001.png`); `runRootRamp`'s 0.6 ms (a quick reject before
  `tailFoot`). Delete `.claude/probes/K1314/k1314_s9_rampf.ts`: its hook is gone, so it is inert.
- **Not yours, leave their look as master draws it:** the junction under-tail ends (K1315, waiting on Levi:
  muse_default_tw j129/j130 and j11/j150, def and g41_def_tw64 j20/j76, g41_user_tw64 j63/j64, muse_hash j78's
  hard edge, and the tail fades s9's ramp brought); the j73 eye tip (K1319); x22 (K1331, K1324's next stage);
  x304 and g41_user_tw64 j30 (form B's own flaws, K1325 fixes the reference). If one of yours turns out to be
  one of these, say so with its crop and move on.

## Goal

The yours list at 0 in rp=outline, with no new artifact of any kind, and the ramp's 0.6 ms back. Form B is
only a reference; Levi's bar is zero artifacts. The technique is yours. Today's look (no `rp=outline`) stays
byte-identical.

## Done

1. **Census** (`.claude/probes/K1314/k1314_run.ps1 -Lock`): no bar kind above `census_s9` less what you
   clear, every find that moved named with its spot, and no tail_look grown at the K1315 ends. Copy
   `.claude/probes/K1314/out/s1/census_s9.*` from the main checkout. Never copy form B caches: the census
   builds its own, keyed by the reference's code.
2. **Crops:** reference | master | after at 4x or more for every spot you touch and every new find, in
   `.claude/probes/K1314/out/s10/`. I view them before merging.
3. **Speed:** the desktop worker frame on def, ABBA under the perf lock (`.claude/probes/K1314/k1314_s8_bench.ps1`),
   master against your branch: no worse than the run-to-run spread.
4. `npm test` green, golden snapshots unchanged. Re-freeze `outline_port.test.ts`'s pins only where your fix
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
- **Your files:** `src/render/outline/outline.ts` (corners, pieces, folds, fans, `runRootRamp`), the band files
  (`band_gpu.ts`, `band_place.ts`, `band_rec.ts`), tests, and your tools and outputs under
  `.claude/probes/K1314/`. Two other agents may run at the same time: **K1247 s27** owns `fill_tri.ts`,
  `rec_glsl.ts`, `chain_frame.ts`, `outline_app.ts`, `outline_model.ts`, `outline_worker.ts` and
  `src/app/frame_loop.ts`; **K1325** owns the census reference (`k1314_census.ts`'s reference code,
  `form_b_fillet.ts`). `draw.ts` is K1324's next. If your fix needs one of theirs, report it rather than
  editing it.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min is
  stale. Run the census with `-Lock` and hold no lock of your own around it. Agents share the lock, so expect
  waits.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Before stopping for the cap, run `Get-Date` and check that 2 h have really passed. Leave
  the last 25 minutes for the checks. Then commit WIP, append a handoff to this brief with your start and stop
  times, and report. Neither a compaction nor context size is a stop; after a compaction, re-read this brief
  and `git log`.

## Report

Under 40 lines:
- each spot: what drew it, the rule and where it lives, or why it is not yours (with its crop);
- the census counts per kind, before and after, and the finds that moved;
- the worker frame on def, before and after;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1314's handle fields.

