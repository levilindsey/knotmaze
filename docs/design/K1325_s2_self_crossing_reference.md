# K1325 stage 2: the census reference where a chain crosses itself

Ledgers: K1325 (this), K1334 (the self-crossing finds, folded in here), K1314 (the census), K1324 (draw.ts's
self-pass burial), K1310 (the gate). One Claude Opus agent in its own worktree, on its own branch from master.
Cap 2 h. Read first: `docs/design/K1240_gate.md`, the s1 handoff at the end of
`docs/design/K1325_s1_reference_shared_cache.md` and the s2 handoff at the end of
`docs/design/K1324_s2_x22_burial.md`.

## Why

The K1314 census compares rp=outline with form B. Where a chain crosses itself, form B fades or smears the over
pass, and since K1324 s2 (943ae592, `draw.ts` `selfBury`) the outline draws it whole, so the census counts form
B's flaw against the outline:

- muse_hash x304 (28.51, 18.01; 717 px): chain 67, form B's depth window ends at 0.658 while the two passes
  still overlap (0.85 / 0.80); `.claude/probes/K1325/out/s1/x304_before_plateau_outline.png`.
- muse_hash x22 (31.53, 7.36; 414 px), x345 (19.996, 3.944; 225 px), j116 (25.518, 13.825; 696 px), x58
  (0.113, 15.187; 527 px): `.claude/probes/K1324/out/s2/x4_after/spot_001.png`, `spot_003-005.png` (reference |
  master before K1324 s2 | after).

s1's global `--plateau` (K922's overlap depth) clears x304 but moves the reference at 66 muse_hash and 18
g41_user_tw64 crossings and adds 21 finds where the outline matches today's reference: ruled out as the default.

## Goal

The reference draws each self-crossing as form B with the approved look would draw it with the over pass whole,
and nothing else in the reference moves. A rule scoped to a chain crossing itself (or to whatever condition the
data shows separates these five from the crossings the plateau should not touch). Fix the reference's flaw,
never hide an outline fault: if the outline is wrong at a spot too, say so with a crop. Also say whose the faint
smear below x304's Y is on today's master (`.claude/probes/K1325/out/s1/diag/x304_smear_z3.png`; before K1324 s2
both drew it).

## Done

1. **Census** (`.claude/probes/K1314/k1314_run.ps1 -Lock`): first master as it is (tag `m1`, the new baseline;
   the shared cache serves its form B tiles), then your branch: the five at 0, every other find in `m1` unchanged
   (same scene, kind, junction, place and size within 2 px). Any find that moves is named with its crop and a
   reason it belongs to the reference.
2. **Crops:** reference before | reference after | rp=outline at 4x for the five and for every moved find, in
   `.claude/probes/K1325/out/s2/`. I view them before merging.
3. `npm test` green, golden snapshots unchanged (your files are probe tools; no app code changes).

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file. Keep each tool output under about 40 lines (write long results to a file and read only the
  lines you need). Use the Read tool only right before an Edit, and to view crops. Junction `node_modules`
  from the main checkout; never `npm ci`.
- **Untracked inputs** (censuses, crops, scenes) are in the main checkout's `.claude/probes/`. Copy what you
  need into your worktree. The one exception to never writing in the main checkout is the shared form B cache
  (`.claude/probes/K1314/out/fb`, `fbf` there), which the census writes itself.
- **Your files:** `.claude/probes/K1314/k1314_census.ts`, `form_b_fillet.ts`, `k1314_run.ps1`, `k1314_crops.ts`,
  and your tools and outputs under `.claude/probes/K1325/`. No `src/` file. Two speed agents run at the same
  time on `src/render/outline/` (K1247 s28 and s29) and time under the perf lock.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never kill a process you did not start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Run the census with `-Lock`
  and hold no lock of your own around it. While someone else holds it, wait inside one blocking command; a lock
  older than 30 min is stale. Agents share the lock, so expect waits.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Before stopping for the cap, run `Get-Date` and check that 2 h have really passed. Leave
  the last 25 minutes for the checks. Then commit WIP, append a handoff to this brief with your start and stop
  times, and report. Neither a compaction nor context size is a stop; after a compaction, re-read this brief
  and `git log`.

## Report

Under 40 lines:
- the rule: what separates the five, where it lives;
- the census counts per kind, m1 and after, and any find that moved;
- x304's smear below the Y: whose;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1325's handle fields.
