# K1247 stage 16: the outline continuous in motion

Ledgers: K1247 (the frame's speed), K1280 and K1281 (the jumps), K1240 (the redesign). One Claude Opus
agent in its own worktree, on its own branch from master. Cap 2 h.

## Why

Stage 15 (`docs/design/K1247_s15_moved.md`, its handoff) recorded real motion on def (226 frames) and fat
(217). It found def's outline is not continuous. At 33 places within 0.8-2.6 half-widths of a junction,
the drawn outline jumps more than 0.25 px while the inputs nearby move less than 0.1 px (worst 1.355 px).
fat, which has no junctions, is continuous. The jumps show in motion as flicker. They also block K1268's
lever: no δ holds the bar while they exist.

Mechanisms found so far:
- **K1280:** a station whose s crosses a centreline vertex jumps by h × the vertex's turn (j47 chain 61
  1.24 px, j146 chain 58 1.0 px). The suspect is `borderPointAtBase`/`borderPointAtFinal` interpolating
  by foot s, where a convex vertex's two offset points share one s.
- **K1281:** corner 191 at j91 moves its arc end 0.46 px along chain 67's border per 0.03 px of input. It
  shimmers 0.33 px every ~3 frames through the whole settle, so the full recompute flickers at rest. Also
  j67's region 2056 moves 2.5 px on under 0.1 px of input (undiagnosed).
- **K1279's jitter check**, shared with master: muse_hash x61 and x182, g41_user_tw64 x54, g41_def_tw64
  x309 (cyc10).

## Goal

`k1247s15_gain.ts def` lists no jump: no drawn vertex moves more than 0.25 px between consecutive
recorded frames while every input within 2h moves less than 0.1 px. Do the same on fat, and on muse_hash
if you record it (`k1247s15_record.mjs`). The look at rest stays as it is. Levi's rule binds: the
structure is decided once, and only positions follow the frame. No piece that comes and goes, and no
decision made from positions. The technique is yours. A fix that makes a quantity continuous (an offset
that turns with the vertex, an arc end that slides) is in scope; a threshold that hides a jump is not.

Then, with the jumps gone, re-run `k1247s15_bound.ts def` at δ = 0.25 px ÷ the measured gain, and
report what recomputing only what moved would project.

## Done

- **Setup.**
  - Check HEAD, then `git reset --hard <the master SHA the coordinator gives you>`.
  - Copy the untracked inputs from K1279's worktree,
    `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a70157fa5e512c8ef\.claude\probes\K1240\`:
    `out/` (all of it) and `proto/outline_master.ts`, `proto/outline_base.ts`.
  - If your worktree lacks `.claude/probes/K868/scenes/`, copy it from the main checkout.
- **Bars:**
  - The gain tool: no jumps on def and fat. List each place you fixed, with its jump before and after.
  - At rest: the K1279 census (`k1279_census.ts`) is no worse than master on any crossing, and
    `k1247s12_facecrops.ts` changes nothing beyond edge pixels. Any scene that differs gets a
    before/after crop pair.
  - Stage 14's census: no scene worse than master.
  - `k1247s9_union.ts --d=0.001,0.01`, still and `--cyc`: no worse than master. `k1279_motion.ts`: fewer
    jump pixels than master.
  - `k1247s5_cmp`: 44/8/0/0.
  - `npm test` green.

## Rules

The Rules of `docs/design/K1247_s10_reduce.md`. Your files: `outline.ts`, your `k1247s16_*` tools and
the check tools in `.claude/probes/K1240/proto/`. No `src/`; form B is read only. Plus:
- **Not yours:** `draw.ts`, and the faces' draw order (K1282). K1277's agent is changing both in
  parallel. Leave `regionsPhaseC`'s sort as it is.
- **Load.** Another agent runs on this machine. While anyone else holds `$env:TEMP\claude-perf.lock`,
  run one scoring process at a time, at Idle priority.
- **Commit WIP at every milestone,** broken or not. Read code through the shell (`Select-String`,
  ranges of `Get-Content`), using Read only just before an Edit.
- **Stop** when the stage is done or at 2 h from your start, whichever comes first. Check `Get-Date` at
  the start and at each milestone. Then commit WIP, append a handoff to this brief and report. Neither a
  compaction nor context size is a stop; after a compaction, re-read this brief and `git log`.

## Report

Report these:
- each jump: its cause, the fix, and its size before and after;
- the gain tool's result on each scene;
- the bound at the new δ;
- the bars, with the crop pairs' paths;
- what's left;
- your last SHA.

End with `Ledger items` and K1247's handle fields.
