# K1314 stage 1: the artifact census of rp=outline (find, classify, count; no fixes)

Ledgers: K1314 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree, on
its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md` and the stage 11 handoff at
the end of `docs/design/K1283_s11.md`.

## Why

Levi, after a crop sheet of form B against rp=outline (`.claude/probes/K1240/out/k1310/sheet.png`):
"in general rp=outline looks a little better for most cases. But there are still plenty of unacceptable
artifacts." So the outline's own look is the target, and the bar is zero artifacts. Today no check counts
them: the census measures distance to form B, which also penalises places where the outline is better,
and the sweep reported "no stray ink" while j59 shows black bars. The fix stages need a count to drive to 0.

## Goal

A census that finds every artifact rp=outline draws at rest, says what kind it is and which part of the
outline draws it, and counts them. Artifacts, by kind (examples are from the sheet):
- **Stray ink:** dark ink that is not a thread's border or a cut's end, such as blocks, flecks, bars and
  spikes (x134's block at the salmon thread's end, j59's bars, j58's spike, the flecks in K1045's eye at
  muse_hash j73/j74).
- **Hard colour edges:** a sharp colour boundary inside a thread's fill where colours should blend or not
  meet (the teal wedges at g41_user_tw64 j8/j9; x201, x292 and x325's corners).
- **Paper holes:** paper showing inside a fill, or a notch bitten out of a border.
- **Broken ink:** a border that stops short, a gap in a border, or a cut that does not close.

The detection technique is yours. Today's look and form B can serve as references (where both agree and
the outline departs sharply, look closer), but an artifact is judged on its own: a spot where the outline
differs from form B and looks right is not one. This stage does not change `src/`.

## Done

- **The census tool** under `.claude/probes/K1314/`: one command that renders rp=outline on master's src
  and prints the count per kind, per scene. The scenes are the seam test's 12 plus def, fat, ring and
  muse_hash. It writes a JSON list of artifacts: scene, place (world and crossing or junction id), kind,
  size in px, and the part that draws it (border, cut, corner arc, fan, fill strip, tail or band, with its
  file).
- **Validated:** it finds the sheet's examples (x134, j59, j58, g41 j8 and j9, x201, x292, x325) and the
  K1045 eye. Its false positives are measured by viewing a random 20 of its finds; report how many were
  not artifacts, and tune until at most 2 are.
- **Crop sheets:** numbered crops, form B | today | rp=outline with the artifact circled, for every find,
  grouped by kind, in `.claude/probes/K1314/out/s1/`. Write the totals on the first sheet. I view them
  before reporting to Levi.
- **The fix plan:** the artifacts grouped by cause (the same part and the same reason), largest group
  first, each with the file and function it lives in. This is the next stages' list.
- **Checks:** `npm test` green (nothing in `src/` changes).

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never
  print a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long
  results to a file and read only the lines you need). The Read tool only right before an Edit, and for
  viewing crops. Junction `node_modules` from the main checkout; never `npm ci`. Read
  `.claude/rules/probes.md` before probing: a bare URL is today's daily. Real-time headed Chrome only;
  never `--virtual-time-budget`.
- **Your files:** your tools and outputs under `.claude/probes/K1314/`. Reuse the tools in
  `.claude/probes/K1240/proto/` (`k1283s11_crops.ts`, `k1279_census.ts`, `k1278s2_seam.ts`, the
  `k1283_vite.config.mjs` config) by copying them. `src/` is read only: the K1247 agent is changing
  `src/render/outline/` at the same time.
- **Load:** the K1247 agent times frames under `$env:TEMP\claude-perf.lock`. While that lock is held by
  someone else, don't run renders or builds; wait inside one blocking command (older than 30 min is
  stale). You don't time anything, so you never take the lock.
- **Commits:** WIP on your branch at each milestone. `git add -f` for tools, never for outputs. Never push,
  never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start. Never
  touch the phone.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Then commit WIP, append a handoff to this brief and report. Neither a compaction nor
  context size is a stop; after a compaction, re-read this brief and `git log`.

## Report

The counts per kind and scene; the validation (found or missed, false positives in 20); the fix plan's
groups with their files; crop paths; your last SHA. Under 40 lines. End with `Ledger items` and K1314's
handle fields.
