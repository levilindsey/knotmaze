# K1279: the redesign's crossings look like form B's

Ledgers: K1279 (this) and K1240 (the redesign). One Claude Opus agent in its own worktree, on its own
branch from master. Cap 2 h.

## Why

Levi, 2026-11-10, on cut 273 (g41_ring_tw64, a shallow crossing): the border lines overlap badly, in
both the old and the new version of the run end, and "we should ensure gaps are working correctly too".
Picture: `.claude/probes/K1247/asks/cut273_old_new_formb.png`. The bottom row is form B
(`src/render/field/form_b.ts`), the approved look, at the same two spots: (20.08, 20.86) and
(17.87, 20.66), each 1.6 units wide at 280 px/unit. That bottom row is the target.

## Goal

At every crossing of the 12 scenes, the redesign's look (`draw.ts`, border and fill from the one
outline table) matches form B's:
- the under-thread's two edge lines stop where form B's do, and fade the way form B's burial does;
- the over-thread's edge lines run unbroken across;
- no edge line lies across the other thread's fill where form B shows none, at shallow crossings too;
- no paper where form B has fill, and no fill where it has paper.

Levi's rule binds: the structure is decided once, and only positions follow the frame. No piece that
comes and goes, and no decision made from positions about which pieces exist. Where a run ends and how
it fades may follow positions continuously. The technique is yours.

In this order:
1. **The gap census.** Build a tool that scores every crossing of every scene in a window around it.
   It compares the redesign's ink (edge lines, with their fade) and its fill/paper against form B's,
   then lists the crossings worst first.
   `.claude/probes/K1240/proto/_k1271_ink.ts` renders form B's ink over its top surface, and
   `k1247s13_triple.ts` and `k1247s14_census.ts` show how to render both sides.
   Run the census on master first: that is the baseline.
2. **Fix** cut 273 and the census's worst crossings, then what the census says next, until time runs
   out or no crossing differs from form B by more than its edge pixels.
3. **The census again**, plus the bars below.

## Done

- **Setup.**
  - Check HEAD, then `git reset --hard <the master SHA the coordinator gives you>`.
  - Copy the untracked inputs from stage 15's worktree,
    `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a6cd6c8845ac7e543\.claude\probes\K1240\`:
    `out/` (all of it) and `proto/outline_master.ts`, `proto/outline_base.ts`.
  - If your worktree lacks `.claude/probes/K868/scenes/`, copy it from the main checkout.
- **Bars:**
  - The gap census: no crossing worse than master.
  - Cut 273's two spots and the 10 worst crossings, each as a crop row of form B | master | yours, at
    the K1271 picture's scale (`.claude/probes/K1240/out/k1279/crops/`). The coordinator looks at these
    before merging.
  - Stage 14's census (`k1247s14_census.ts`): no scene worse than master.
  - `k1247s5_cmp`: 44/8/0/0.
  - `k1247s9_union.ts --d=0.001,0.01`, still and `--cyc`: no worse than master. A drawn move you add
    has to be a fade sliding continuously, not a jump.
  - `npm test` green.

## Rules

The Rules of `docs/design/K1247_s10_reduce.md`, with these files as yours: `outline.ts`, `draw.ts`,
your `k1279_*` tools and the check tools in `.claude/probes/K1240/proto/`. No `src/`; form B is read
only. Plus:
- **Not yours:** the outline's jumps in motion (K1280-K1282) and the fill as triangles (K1277). Leave
  them unless a crossing can't be fixed without them, and if so, say so in the report.
- **Load.** Other agents time things on this machine. While anyone else holds
  `$env:TEMP\claude-perf.lock`, run one scoring process at a time, at Idle priority.
- **Commit WIP at every milestone,** broken or not. Read code through the shell (`Select-String`,
  ranges of `Get-Content`), using Read only just before an Edit.
- **Stop** when the stage is done or at 2 h from your start, whichever comes first. Check `Get-Date` at
  the start and at each milestone. Then commit WIP, append a handoff to this brief and report.
  Neither a compaction nor context size is a stop; after a compaction, re-read this brief and
  `git log`.

## Report

Report these:
- the census on master and on yours: the worst crossings, and how many crossings differ;
- what you changed, and why each change is decided from structure;
- the crop rows' paths;
- the bars;
- what's left;
- your last SHA.

End with `Ledger items` and K1279's handle fields.
