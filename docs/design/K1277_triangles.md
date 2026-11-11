# K1277: the redesign's fill as triangles fixed at structure

Ledgers: K1277 (this), K1282 (the draw order), K1273 (the speck), K1278 (the paint that comes next) and
K1240 (the redesign). One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h.

## Why

Levi, 2026-11-10: "if we know we have a closed polygon formed from these polylines, it should be easy to
divide it into seamless triangles". Today `draw.ts` fills each face with a stencil fan from its first
vertex (INVERT, which is even-odd) and then a bbox quad. That has three problems:
- **It drops folds.** A fold winds -2, so even-odd leaves it out. That is K1273's 2 px speck on
  muse_hash at (26.86, 22.32).
- **Draw order follows positions.** Faces are drawn in a depth order computed from positions
  (`regionsPhaseC`'s sort by `depthAtC`, K1282), and near-equal depths swap between frames: 14 faces
  between def's settle frames 200 and 201 (`docs/design/K1247_s15_moved.md`).
- **It can't carry continuous paint.** Each face is one flat colour, so it can't carry the
  per-pixel paint K1278 needs: the section colours and highlight pulses blending seamlessly across
  junctions, the way form B does.

## Goal

The fill drawn as plain triangles whose topology is decided once, at structure. The index buffer, each
face's vertex count and the draw order come from the diagram. Per frame, only vertex positions change.
No stencil.

The pieces:
- a strip per face between its two borders' stations;
- each junction face triangulated once;
- the faces drawn in an order decided from the crossing diagram (over before under), so a fold overdraws
  instead of cracking.

Where a fixed triangle would spill under large deformation, the census below shows it. Each vertex
carries chain and s (and whatever K1278's paint will need), so the next stage can paint continuously
across face, triangle and junction edges. Painting a flat colour per chain is still fine for this stage.

Levi's rule binds: the structure is decided once, and only positions follow the frame. No piece that
comes and goes, and no decision made from positions. The technique is yours.

## Done

- **Setup.**
  - Check HEAD, then `git reset --hard <the master SHA the coordinator gives you>`.
  - Copy the untracked inputs from K1279's worktree,
    `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a70157fa5e512c8ef\.claude\probes\K1240\`:
    `out/` (all of it) and `proto/outline_master.ts`, `proto/outline_base.ts`.
  - If your worktree lacks `.claude/probes/K868/scenes/`, copy it from the main checkout.
- **Bars:**
  - At rest, on every scene: stage 14's census (`k1247s14_census.ts`, cracks and spill against form B)
    is no worse than master. K1273's speck is closed, and loop eyes stay paper.
  - The top colour at shallow overlaps matches form B's top thread. Cut 273's top-left is pink in
    form B and cyan today (`.claude/probes/K1240/out/k1279/crops/cut273.png`).
  - On stage 15's recorded motion (`out/s15/rec_def`, `rec_fat`), every frame:
    - the topology is identical to frame 0's (assert it);
    - against form B on the same frame (stage 14's census measure), the fill shows no more crack
      (paper where form B has fill) and no more spill (fill where it has paper) than master's stencil
      fill on that frame.
  - Crops: form B | master | yours at cut 273, at K1273's speck, and at the worst crack and the worst
    spill, in `.claude/probes/K1240/out/k1277/crops/`.
  - The K1279 census (`k1279_census.ts`): no crossing worse than master.
  - `k1247s5_cmp`: 44/8/0/0.
  - `npm test` green.

## Rules

The Rules of `docs/design/K1247_s10_reduce.md`. Your files: `draw.ts`, new files of your own in
`.claude/probes/K1240/proto/` (for example `fill_tri.ts`), your `k1277_*` tools, and the check tools
there. No `src/`; form B is read only. Plus:
- **`outline.ts` is read only.** K1247 stage 16's agent is changing it in parallel. Build your
  structure from the table it exports. If a face lacks something you need, add it in your own file, or
  report it if you can't.
- **Load.** Another agent runs on this machine. While anyone else holds `$env:TEMP\claude-perf.lock`,
  run one scoring process at a time, at Idle priority.
- **Commit WIP at every milestone,** broken or not. Read code through the shell (`Select-String`,
  ranges of `Get-Content`), using Read only just before an Edit.
- **Stop** when the stage is done or at 2 h from your start, whichever comes first. Check `Get-Date` at
  the start and at each milestone. Then commit WIP, append a handoff to this brief and report. Neither a
  compaction nor context size is a stop; after a compaction, re-read this brief and `git log`.

## Report

Report these:
- how the triangles are built, and why each decision comes from structure;
- the census at rest and on the motion;
- crack and spill, worst first;
- the crops' paths;
- the bars;
- what K1278's paint will need, and what's left;
- your last SHA.

End with `Ledger items` and K1277's handle fields.

## Handoff (K1277 agent, 2026-11-10, stage done at 2 h less 50 min)

Every bar passes. Code: `.claude/probes/K1240/proto/fill_tri.ts` (the triangles; its header is the
spec) and `draw.ts` (draws them depth-tested, no stencil). Tools: `k1277_census.ts` (`rest`,
`motion def|fat`), `k1277_k1279.ts` (K1279's crossing census, master vs triangles), `k1277_crops.ts`,
`k1277_cracks.ts` (`--near=x,y,r`), `k1277_base_draw.ts` (master's draw.ts, for the A side).

- **Structure.** Items come from `DiagramStructure` only: a strip per interval with border pieces
  (ghost strips first, then runs), a cap fan per cap, a tail strip per tail piece (form B's end-arm
  round end), a fan per junction over its ring (per arm P, N, then 16 corner points). The draw order is
  the item index. Over and under is a per-pixel depth key (form B's z - d zt / h), so no order
  comes from positions. The one frame-0 measurement is each strip's resolution N.
- **Per frame.** Positions only. A missing side of a strip, which the frame leaves empty next to a
  junction or a crossing, is the other side mirrored across its centreline feet. Before, a copied side
  made the strip zero-width, and paper showed in the tube (muse_hash iv 477).
- **At rest** (ppu 40, master fill/paper -> triangles fill/paper): muse_hash 422/2021 -> 241/267,
  muse_default_tw 376/908 -> 70/82, def 200/406 -> 44/60, fat 0/42 -> 0/42, ring 30/44 -> 3/44,
  user_tw42.lightpaper 47/21 -> 12/20, g41_def_tw42 208/138 -> 45/44, g41_def_tw64 182/644 -> 34/103,
  g41_ring_tw42 24/21 -> 8/21, g41_ring_tw64 29/70 -> 6/66, g41_user_tw42 47/19 -> 15/18,
  g41_user_tw64 52/216 -> 9/56. K1273's speck: paper 2 -> 0 px.
- **Motion.** def: 226 frames, topology identical to frame 0 on all, worse than master on 0; fill
  32069 -> 548, paper 78508 -> 66. Worst crack f63 2 px at (22.60, 23.13); worst spill 1 px at
  (33.26, 7.34). fat: 217 frames, 0 and 0, the same as master.
- **K1279 census** (ppu 80): 0 crossings worse, 38 better; total 27594 -> 26926, fill 668 -> 0;
  top thread differs 41225 -> 32928 px (worse on 30 crossings, better on 114).
- `k1247s5_cmp` 44/8/0/0; `npm test` green (220 files).
- **Crops** in `.claude/probes/K1240/out/k1277/crops/`: `cut273.png` (pink, as form B),
  `k1273_speck.png`, `rest_worst.png`, `motion_worst.png`, `k1279_worse.png`.
- **Left.** (1) Top colour at end-arm junctions: the mirrored through-chain strip pokes a sliver of
  its colour over the end chain's round end, where form B shows the end chain (muse_hash x73 / x47,
  g41_user_tw64 x14; K1279's thread term is worse there). That is depth at junctions, K1283's
  question. (2) muse_hash keeps 58 px of cracks at rest in 49 spots, worst 5 px at (31.11, 1.22).
  (3) Up to 16 dense border pieces on def use the equal-fraction fallback, and def's chain point
  counts change on 7 frames with the same diagram. (4) For K1278: every vertex carries chain and s
  (`FillFrame.s`); the paint needs the distance across (0 at the centre row, 1 at the borders),
  which the rows already give.
