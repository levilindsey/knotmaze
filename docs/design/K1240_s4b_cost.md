# K1240 S4b: `rp=outline` at the prototype's cost, then merge-ready

Ledgers: K1240 (the redesign), K1247 (its frame cost). One Claude Opus agent in its own worktree. Cap 2 h.
Builds on S4 (`docs/design/K1240_s4_app.md` and its handoff, on branch `worktree-agent-a5393aa1f25f2ff33`
at 60f934b7).

## Why

S4 ported the prototype's default path into `src/render/outline/` behind `rp=outline`. The port equals
the prototype on the 12 scenes, but in the app it runs about 100 times slower. A def maze frame takes
about 3 s in the outline worker against the prototype's `frame()` at about 29 ms median (K1290, today).
The band, the per-frame vertex buffer, holds 6.3M vertices and takes about 2.5 s of that. In knot mode a
build takes 17-19 s. Equal output on the same scene with 100x the cost suggests the app gives the
outline different input (sample density, scale, DPR, scene size, or a band built at screen resolution),
but that is unmeasured. Two more problems:
- The structure is rebuilt in 12 of 18 replies on def maze, because the diagram key changes or the frame
  update throws. Levi's rule: the structure is decided once, and only positions follow the frame.
- With flow on (`fw=1`) the outline rebuilds continuously and never settles.

Until the cost is fixed, Levi can't judge the redesign on his phone.

## Done

- **Cost:** the outline worker's frame on def maze (`?b&am=instant&snd=none&fw=0&rp=outline`) is within
  1.5x of the prototype's `frame()` on the same state. Otherwise, numbers that say where the remainder
  goes and why it can't go. Say what the 100x was.
- **Structure once:** over a 5 s drag on def maze, the structure is built once unless the diagram
  changes. Log each rebuild with its cause. Flow on settles.
- **Tests:** `npm test` green, and the golden snapshots (`test/physics/byte_identity.test.ts`) unchanged.
- **Timing:** `scripts/bench_frame.mjs` on def at rest and mid-drag, with and without `rp=outline`,
  under the perf lock. Report build, per-frame update, upload and draw, median and p95.
- **Crops:**
  - Fix `k1240s4_crops` picking the wrong canvas: def's fbb column is white. Use
    `scripts/export_scene.mjs`'s rule: the largest on-screen canvas, skipping `knot-loading-canvas`.
  - Regenerate the rows in `.claude/probes/K1240/out/s4/crops/`.
  - At def_j156, the outline column has a thin green-grey line along the seam between two runs. Say
    whether the prototype draws it too. If only the app does, fix it.

The look (the corner bites, K1283; junction colour hand-off, K1278 stage 2) and the missing app pieces
(palette, overlays inside the base layer) are not this stage.

## Setup

`git reset --hard 60f934b7`, then `git rebase <the master SHA the coordinator gives you>`. Nothing
overlaps, so it applies cleanly. Copy `.claude/probes/K1240/out/` and `.claude/probes/K868/scenes/`
from the main checkout if your worktree lacks them. The g41_ring_tw64 capture now reads physics hash
a4b8c1bf, not ea67fc77; the defaults moved, and that's expected.

## Rules

- PowerShell. Read code through the shell; the Read tool only right before an Edit. Junction
  `node_modules` from the main checkout; never `npm ci`.
- **Your files:** `src/render/outline/`, `src/app/frame_loop.ts` and the `__knotLookAt` hook in `main.ts`
  (both from S4), tests under `test/`, and the tools in `.claude/probes/K1240/s4/`. The prototype in
  `.claude/probes/K1240/proto/` is read only. The flag-off app must stay byte-identical.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout. Never kill a process you did
  not start.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time,
  delete it after. While someone else holds it, wait inside one blocking command; older than 30 min is
  stale. Never touch the phone.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Then commit WIP, append a handoff to this brief and report. Neither a compaction nor
  context size is a stop; after a compaction, re-read this brief and `git log`.

## Report

Say what the 100x was and what fixed it, with numbers before and after. Then the rebuild causes, the
timings, the crop paths, the def_j156 line, and your last SHA. End with `Ledger items` and K1240's
handle fields.
