# K1290: border vertices placed forward from the centreline (an experiment)

Ledgers: K1290 (this), K1281 (the outline's jumps), K1288 (the fold flip), K1247 (the frame's speed),
K1240 (the redesign). One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h.

## Why

Stages 9-17 removed the outline's jumps one place at a time (def 33 -> 15, muse_hash 34 -> 17), and what
is left is one kind of jump: a border vertex placed at a NEAREST point (a corner's foot, an end arm's
extension foot, `addPointAtC`'s branch pick on a fold). A nearest point jumps across a concave bisector,
so every vertex placed on one inherits the jump. Form B's distance stays continuous there even though its
foot doesn't, which is why form B doesn't flicker. Making the foot continuous moves the look at rest at
exactly those spots (stage 17: `K16_CB=arc` takes def to 3 places, census vs form B +212, 3 crossings
over 12 px). The nearest-point searches are also much of `frame()`'s cost (corners were 7.3 of 13 ms
at S3d), and the frame is still about 21 ms against ≤3 median / ≤6 p95.

## The question

Can every border vertex be placed FORWARD instead: a station keeps its s from the structure, its position
is centre(s) ± h·n(s) with a normal continuous across centreline vertices, and the corners, cuts and caps
are closed-form intersections of those forward borders, with the structure choosing which ones? On a
concave side the forward borders overlap rather than being trimmed; the triangle fill's depth key and
draw order, which come from the diagram, may already handle that. If the look holds, the jump class is gone
by construction, the searches go, and the per-vertex work is the kind a vertex shader does.

Levi's rule binds: the structure is decided once, and only positions follow the frame. The technique is
yours, including where the forward placement stops and the existing code takes over.

## Done

An answer with evidence; I judge it from these:
- **Jumps:** `k1247s15_gain.ts` on def, fat and muse_hash against master's default.
- **Look at rest against form B:** `k1279_census.ts` total and worst crossings, the triangle fill on your
  table (`k1277_census.ts rest`), and crop rows form B | master | yours at the 3 worst crossings and at
  the corner-foot spots (def j91, j45, j54, j73, j30) in `.claude/probes/K1240/out/k1290/crops/`.
- **Cost:** `frame()` on def, median and p95, against master's, under the perf lock.
- **Where it fails,** with a crop of each failure.
- **Setup:** check HEAD, then `git reset --hard <the master SHA the coordinator gives you>`. Copy
  `.claude/probes/K1240/out/` (with `out/k1247s5/ref_*`) and `.claude/probes/K868/scenes/` from the main
  checkout if missing. `k1279_bars.ps1 -SkipMaster` leaves its s14 census empty; run
  `k1247s14_census.ts` directly.

## Rules

- PowerShell. Read code through the shell; the Read tool only right before an Edit. Junction
  `node_modules` from the main checkout; never `npm ci`.
- **Your files:** a new `.claude/probes/K1240/proto/outline_fwd.ts` (start from a copy of `outline.ts` if
  you like) and your `k1290_*` tools; point the check tools at your table through a flag of your own.
  `outline.ts`, `fill_tri.ts`, `paint.ts`, `draw.ts` and `src/` are read only: K1240 S4's agent is
  porting them into the app in parallel.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time,
  delete it after; while someone else holds it, wait inside one blocking command; older than 30 min is
  stale. While anyone else holds it, run one scoring process at a time, at Idle priority.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Then commit WIP, append a handoff to this brief and report. Neither a compaction nor
  context size is a stop; after a compaction, re-read this brief and `git log`.

## Report

The placement rule you used and where it stops; the four answers above with the crops' paths; your
recommendation (adopt, adopt in part, or drop) and why; your last SHA. End with `Ledger items` and
K1290's handle fields.
