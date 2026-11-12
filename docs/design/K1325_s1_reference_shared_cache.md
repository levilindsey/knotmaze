# K1325 stage 1: the census reference at x304 and j30, and one shared form B cache (K1333)

Ledgers: K1325 (this), K1333 (the cache), K1314 (the census), K1321 (the last reference fix), K1310 (the
gate). One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h. Read first:
`docs/design/K1240_gate.md`, the s7 handoff at the end of `docs/design/K1314_s7_wedge_loops.md` and the header of
`.claude/probes/K1314/k1314_census.ts`.

## Why

- **K1325:** the K1314 census compares rp=outline against form B with the approved rounded look
  (`form_b_fillet.ts`, K1321). At muse_hash x304 (28.51, 18.01; 717 px) and g41_user_tw64 j30 (7.55, 3.15;
  201 px) the reference draws stray ink where rp=outline is clean
  (`.claude/probes/K1314/out/s7/after4x/spot_007.png`, `spot_008.png`), so the census counts form B's flaw
  against the outline. K1321 fixed the same kind of flaw at classes (a) and (c) in a8bab56a.
- **K1333:** the census caches form B tiles per checkout (`out/fb`, `out/fbf`, about 7.8 GB each). Eleven
  agent worktrees filled C: on 2026-11-12. The keys are a hash of the reference's code
  (`refCacheDirs`), so every checkout can share one cache. Two processes writing one tile at once must not
  leave a short or broken file (K1247 s26 hit EPERM; the disk-full window left zero-byte tiles).

## Goal

1. The reference draws at x304 and j30 what form B with the approved look would draw there, without the
   stray ink, and nothing else in the reference moves. Fix the reference's flaw, never hide an outline fault:
   if the outline is wrong at either spot too, say so with a crop.
2. One form B cache for every checkout, under the main checkout's `.claude/probes/K1314/out/fb` and `fbf`
   (find it from any worktree with `git rev-parse --path-format=absolute --git-common-dir`), with writes that
   cannot leave a partial tile under concurrent runs, and pruning that is safe while another checkout's census
   runs. Update `k1314_run.ps1`'s header (it says never copy another checkout's caches) to match.

## Done

1. **Census** (`.claude/probes/K1314/k1314_run.ps1 -Lock`): x304 and j30 at 0, and every other find in
   `census_s9` unchanged (same scene, kind, junction, place and size within 2 px). Any find that moves is named
   with its crop and a reason it belongs to the reference. Copy `.claude/probes/K1314/out/s1/census_s9.*` from
   the main checkout to compare.
2. **Crops:** reference before | reference after | rp=outline at 4x for both spots, in
   `.claude/probes/K1325/out/s1/`. I view them before merging.
3. **The cache:** two census runs at once on one scene from two checkouts (yours and a second worktree of your
   branch you make and remove) share one key directory, finish with the same counts as one run, and leave no
   `.tmp` or short file. Report the shared directory's size after your runs, and delete your worktree's own
   `out/fb` and `out/fbf` once the shared cache works.
4. `npm test` green, golden snapshots unchanged (your files are probe tools; no app code changes).

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file. Keep each tool output under about 40 lines (write long results to a file and read only the
  lines you need). Use the Read tool only right before an Edit, and to view crops. Junction `node_modules`
  from the main checkout; never `npm ci`.
- **Untracked inputs** (censuses, crops, scenes) are in the main checkout's `.claude/probes/`. Copy what you
  need into your worktree. The one exception to never writing in the main checkout is the shared cache
  itself, `.claude/probes/K1314/out/fb` and `out/fbf` there, once your change writes to it.
- **Your files:** `.claude/probes/K1314/k1314_census.ts`, `form_b_fillet.ts`, `k1314_run.ps1`, `k1314_crops.ts`,
  and your tools and outputs under `.claude/probes/K1325/`. No `src/` file. Two other agents run at the same
  time: **K1314 s10** owns `outline.ts` and the band files, **K1247 s27** owns `fill_tri.ts` and the record
  fill's files. Their censuses run on master's census code until they rebase, with their own caches.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never kill a process you did not start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Run the census with `-Lock`
  and hold no lock of your own around it; for the two-run cache check, run both inside one `-Lock` window or
  take the lock yourself and pass its owner in `$env:K1314_LOCK_OWNER`. While someone else holds it, wait
  inside one blocking command; a lock older than 30 min is stale. Agents share the lock, so expect waits.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Before stopping for the cap, run `Get-Date` and check that 2 h have really passed. Leave
  the last 25 minutes for the checks. Then commit WIP, append a handoff to this brief with your start and stop
  times, and report. Neither a compaction nor context size is a stop; after a compaction, re-read this brief
  and `git log`.

## Report

Under 40 lines:
- x304 and j30: what the reference drew wrong, the fix and where it lives;
- the census counts per kind, before and after, and any find that moved;
- the cache: where it lives, how a write stays whole, how pruning stays safe, the two-run check, its size;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1325's and K1333's handle fields.
