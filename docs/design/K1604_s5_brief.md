# K1604 stage 5: the gap by a junction cuts clean through the border, parallel to the over thread (rp=gf)

Read first: the K1604 stage 3 handoff on branch `k1604-s3` (c1cb7eac3, not landed; its `.claude/probes/K1604/`
has the capture recipe, `screen.py` and place lists), K1627's stage 3 handoff (`docs/design/K1627_s3_brief.md`,
landed: how a corner's other arm cuts it), and the capture tools on branch `k1604-s4-shots`
(`.claude/probes/K1604/s4/`: `run.ps1`, `cap.ps1`, `go.ps1`, `finder.cjs`, `sheet4.py`). Base: `origin/master`.

## Levi, 2026-11-26

His rule: "the gap should cut through the border parallel to the overthread of the crossing", and no partial
cuts that leave dangling parts (confirmed). Shown 18 places on master bca87a4f2, each at three zooms
(`...\worktrees\k1604-s4-shots\.claude\probes\K1604\s4\out\border_01.png` .. `_03.png`, and
`border_clean_*.png` without overlays; read only: look at them first), he marked: "2, 5, 6, 7, 9, 11, 12, 13,
17 are the most wrong". Those rows (maze, crossing, junction):

- 2: A_6 x326 j2. 5: A_3 x37 j51. 6: A_3 x195 j101. 7: A_3 x292 j123 (61 px apart: check the pair is right).
- 9: A_3 x73 j103. 11: A_3 x166 j54. 12: A_3 x316 j83. 13: A_4 x301 j88. 17: A_4 x22 j106.

The rows he did not mark (1, 3, 4, 8, 10, 14, 15, 16, 18) are the reference for right, or less wrong.

## This stage

1. Say, per marked row and observed (switch-offs on a frozen state, as K1627 did), what draws the wrong shape:
   which rule leaves the stub, the wedge, the angled or missing cut. Say what the marked rows share that the
   unmarked ones lack.
2. Fix it in `src/render/gpu_field/`: where a crossing sits by a junction, the under thread's border (corner
   arcs and arm borders included) is cut along a line parallel to the over thread's edge, all the way through,
   at the same gap width as a plain crossing; nothing of the under border survives inside the gap, and no
   piece is left attached only by a neck or hanging free. You own the technique. Confirm on a frozen state by
   a patch before building.

Binding: never remove a thread's border outside a gap; the under pass keeps its width and heading; tight turns
keep today's ball (K1572); K1627's specks stay gone; plain crossings away from junctions do not change (pixel
diff 0 beyond 2.5 world from any junction on the 21 mazes and his link `?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1`);
do not use today's (non-gf) border strokes as the bar; keep out of the reveal path; no new per-pixel texture
reads away from junction pixels. Every changed place is listed and viewed: a place that got worse is a fail,
say so.

## Done

1. The cause per marked row, observed.
2. Src, tests, `npm test` green, `npm run build` passes, pins named.
3. For Levi: pages `master | yours`, all 18 rows (marked ones first), at the s4 pages' medium and close zooms,
   border look, no overlays, same frozen state both sides, real time, under 7000 px tall each, viewed by you;
   plus a page of the 12 largest changes elsewhere on the 21 mazes.
4. `screen.py` counts and the changed-pixel count per maze, master against yours.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1604-s5`, branch `k1604-s5`, from `origin/master`;
`node_modules` as a directory junction to the main checkout's (never `npm install`). Bring the probe tools
over with `git checkout <branch> -- .claude/probes/K1604` (never merge those branches). Write only inside
your worktree. Read code through the shell; the Read tool only just before an Edit, and for images.
Real-time captures only, under the perf lock (`scripts/perf_lock.ps1`; read a lock before touching it, never
delete another owner's), ports 5665 to 5669; refuse a busy port and check the listener is your build (stage
leftovers have been shot by mistake). Commit WIP at every milestone (`git add -f` for probe tools, never
their outputs). Never push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
`--virtual-time-budget`. Helpers on sonnet, mechanical work only; looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. If some marked rows cannot be fixed without breaking a binding, fix the rest and
show those with pictures. On stopping: commit WIP, append `## Handoff (stage 5)` here, commit, and report:
verdict first (safe to land or not), page paths, counts, a `Ledger items` list and the handle fields.
