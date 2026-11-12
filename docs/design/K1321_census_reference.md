# K1321: the census reference draws the approved look where form B is flawed

Ledgers: K1321 (this), K1314 (the census it serves), K1310 (the gate). One Claude Opus agent in its own
worktree, on its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md` and the two
handoffs at the end of `docs/design/K1314_s5_joins_wedges.md`.

## Why

The K1314 census measures rp=outline against a reference: form B, with the S1b/S1c fillet at through bends
(K1049). Since stage 5 the fillet yields to form B away from its own bend (`filletHere`). Levi's decision
(2026-11-11): "K1045 / K1049: form B's open eye. Rounded corner." He also said not to copy form B's flaws.
Claude's crop review of stage 5 found spots where the outline draws the approved look and the reference
does not, so the census counts correct ink as stray ink:
- **Class (c):** g41_def_tw64 j45 and j48, g41_user_tw64 j39. Form B leaves a square smear where the
  outline rounds the corner.
- **Class (a):** def j174, ring j12, g41_ring_tw42 j12, g41_user_tw64 j28 (#1). These are near-straight or
  reflex failed corners. Form B leaves a V notch there; the outline fills it round.
- **The yield's blends:** muse_hash j135, the j78 spike, j98, and the g41_user_tw64 j49 spike. Where the
  fillet yields, the reference inks beyond the outline's arc band. This is the V merge of plain form B and
  the fillet, whose inner borders differ by up to 0.067.

Crops: `.claude/probes/K1314/out/s5/after/` (reference | before | after; spots in `out/s5/spots.txt`).

## Goal

The reference draws the approved look at those spots: a rounded corner, no notch, no smear, no merge seam.
Build it from form B and the fillet, never from the outline's own output, or the census becomes a rubber
stamp. Everywhere else the reference stays as it is. The technique is yours.

## Done

- **Reference crops:** old reference | new reference | rp=outline (master) at each listed spot, plus three
  untouched spots that show no change. Put them in `.claude/probes/K1321/out/`. I view them before merging.
- **Census:** the new reference against master's outline (`k1314_run.ps1 -Lock`). Report the counts per
  kind, before (stage 5's `census_s5c`) and after, and every find that disappeared or appeared, with its
  spot. A find may disappear only at the listed spots. Any other change is a reference bug: fix it or
  report it.
- `npm test` green.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never
  print a whole file. Keep each tool output under about 40 lines (write long results to a file and read
  only the lines you need). Use the Read tool only right before an Edit, and to view crops. Junction
  `node_modules` from the main checkout; never `npm ci`.
- **Untracked inputs** (stage 1-5 censuses, crops, form B caches) are in the main checkout's
  `.claude/probes/K1314/out/`. Copy what you need into your worktree and never write there. Delete any form
  B cache you copy before you stop.
- **Your files:** the census reference: `.claude/probes/K1314/k1314_census.ts` (`rasterFormB`,
  `filletHere`, `filletOf`, the `FILLET_*` flags, and new reference code), `form_b_fillet.ts`, and new tools
  under `.claude/probes/K1321/`. No `src/` edits. Two agents run at the same time:
  - **K1314 stage 6** fixes outline faults in `outline.ts` and `fill_tri.ts`, and runs this census from
    its own worktree with master's reference.
  - **K1247 stage 24** works in the band and record code.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did
  not start. Never touch the phone.
- **Perf lock:** run the census with `-Lock`. It takes `$env:TEMP\claude-perf.lock` for each scene, so don't
  hold the lock around it. While someone else holds the lock, wait inside one blocking command; a lock older
  than 30 min is stale.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Before stopping for the cap, run `Get-Date` and check that 2 h have really passed. Leave
  the last 20 minutes for the checks. Then commit WIP, append a handoff to this brief with your start and
  stop times, and report. Neither a compaction nor context size is a stop; after a compaction, re-read this
  brief and `git log`.

## Report

Under 30 lines:
- what the reference now does at each class, and where (function);
- the census counts per kind, before and after, and the finds that moved;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1321's handle fields.
