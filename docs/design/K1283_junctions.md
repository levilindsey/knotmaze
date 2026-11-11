# K1283: the outline's junction borders against form B (in `src/`)

Ledgers: K1283 (this), K1240 (the redesign), K1281 (its jumps), K1278 (its paint, run in parallel). One
Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h.

## Why

The redesign is in the app behind `rp=outline` (K1240 S4/S4b, 8d56f5c0; code in `src/render/outline/`,
equal to the prototype's default path and pinned in `test/render/outline_port.test.ts`). Its crossings
now match form B (K1279), so every remaining difference sits at a junction. Two kinds:
- **Concave corners bite** where form B's corner is round: the border steps in at the corner arc's foot
  and leaves a notch. Spots: def j55, j156, j91, j45, j54, j73, j30, x81. Crops:
  `.claude/probes/K1240/out/k1290/crops/fail_j55_j156.png`, `rest_feet.png`, `fail_census.png`, and the
  app's `.claude/probes/K1240/out/s4/crops/def_j156.png`, `def_j16.png`, `muse_j150.png`.
- **End-arm round ends and tails** don't cover where form B shows them (muse_hash x47, x73, x349; K1278
  stage 1's handoff in `docs/design/K1278_paint.md`).

The 25 worst census crossings all sit at junctions (muse_hash x77, 846 px, is the worst).

## Goal

At rest, the outline's borders at junctions match form B at every spot above. Form B is the approved look:
judge spot by spot against it, not against today's outline. The technique is yours, including the corner
construction; K1290 (`docs/design/K1290_forward.md`) found that forward-placed arc ends don't remove the
bites. Levi's rule binds: the structure is decided once, and only positions follow the frame.

## Done

- **Tools on `src/`.** `k1279_census.ts`, `k1277_census.ts rest` and `k1247s15_gain.ts` read
  `src/render/outline/`, not the prototype; point them through a flag of yours, or copy them as `k1283_*`.
  Show they reproduce the prototype's numbers on today's code before you change anything.
- **Look.** Census against form B: the total, and the junction crossings before and after. Crop rows
  form B | before | after at every spot above and at the census's 10 worst, in
  `.claude/probes/K1240/out/k1283/crops/`. I view them before merging.
- **Nothing gets worse.** No crossing worse by more than 12 px, K1277's triangle-fill bars hold, the jump
  places (`k1247s15_gain.ts` on def, fat and muse_hash) are no worse than today's, and the worker frame on
  def stays within 10% (S4b's `k1240s4b_bench.mjs`, under the perf lock).
- **Tests.** `npm test` green, the golden snapshots unchanged, and `outline_port.test.ts`'s pin updated on
  purpose (the prototype is now history, not the reference).

## Rules

- PowerShell. Read code through the shell; the Read tool only right before an Edit. Junction
  `node_modules` from the main checkout; never `npm ci`.
- **Your files:** `src/render/outline/outline.ts` and `outline_model.ts`, tests under `test/`, your
  `k1283_*` tools. `paint.ts`, `fill_tri.ts`, `draw.ts` and `band_gpu.ts` belong to K1278 stage 2's agent,
  working in parallel: if you need a change there, report it rather than making it. The prototype is read
  only.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did
  not start.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time,
  delete it after. While someone else holds it, wait inside one blocking command; older than 30 min is
  stale. Never touch the phone.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Then commit WIP, append a handoff to this brief and report. Neither a compaction nor
  context size is a stop; after a compaction, re-read this brief and `git log`.

## Report

What the bite was and what fixed it; census and crop paths, before and after; the guard numbers; what's
left; your last SHA. End with `Ledger items` and K1283's handle fields.
