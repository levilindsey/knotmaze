# K1278 stage 1: the redesign's fill painted seamlessly across junctions

Ledgers: K1278 (this), K1283 (junctions vs form B), K1250 (a pulse's glow at a junction) and K1240 (the
redesign). One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h.

## Why

Levi, 2026-11-10: the fill logic has to "handle seamless continuous perfectly smooth blending across
junctions for segment color blending and highlight pulses". K1277 (merged, 4d168bb4) made the fill plain
triangles fixed at structure (`.claude/probes/K1240/proto/fill_tri.ts`, its header is the spec), but it
paints one flat colour per chain. Every vertex already carries chain and s (`FillFrame.s`), and the
strip rows give the distance across.

K1277 also left one regression: at end-arm junctions the through-thread's mirrored strip pokes a sliver
of its colour over the end thread's round end, where form B shows the end thread (muse_hash x73, x47,
x292, x177; g41_user_tw64 x14; g41_def_tw64 x349; crop `.claude/probes/K1240/out/k1277/crops/k1279_worse.png`).

## Goal

The fill's colour comes per pixel from fields that are continuous across every triangle edge, face edge
and junction: chain and s along the thread, the distance across, and at a junction per-arm weights that
ease to an exact hand-off, the way form B and the app's paint blend there. Never a colour per face or per
triangle. This stage paints the section colours (`src/render/section_colors.ts`, the app's paint in
`src/render/paint_math.ts` / `paint_glsl.ts`); stage 2 adds the highlight pulses on the same fields.

Levi's rule binds: the structure is decided once, and only positions follow the frame. The technique is
yours.

## Done

- **Setup.**
  - Check HEAD, then `git reset --hard <the master SHA the coordinator gives you>`.
  - Copy the untracked inputs from K1277's worktree,
    `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-aa92acf32efe15555\.claude\probes\K1240\`:
    `out/` (all of it) and `proto/outline_master.ts`, `proto/outline_base.ts`.
  - If your worktree lacks `.claude/probes/K868/scenes/`, copy it from the main checkout.
- **Bars:**
  - A seam test (build it first, run it on master as the baseline): on every scene, sample the paint on
    both sides of every shared triangle edge, face edge and junction ring, with section colours that step
    and that kink. No difference over 1/255 per channel across any edge, and near junctions no per-pixel
    colour step larger than form B's at the same spot.
  - The section colours at rest match the app's paint against form B's surface: crops form B | master |
    yours at the 6 worst junctions by colour difference, in `.claude/probes/K1240/out/k1278/crops/`.
  - The end-arm sliver: the top colour at the six crossings above matches form B (K1279's census thread
    term no worse than master there), with a crop row.
  - K1277's bars hold: the rest census (`k1277_census.ts rest`) and the motion census on def and fat no
    worse than K1277's handoff; `k1277_k1279.ts` no crossing worse; `k1247s5_cmp` 44/8/0/0; `npm test`
    green.

## Rules

The Rules of `docs/design/K1247_s10_reduce.md`. Your files: `draw.ts`, `fill_tri.ts`, new files of your
own in `.claude/probes/K1240/proto/`, your `k1278_*` tools, and the check tools there. No `src/`; form B
and the app's paint are read only. Plus:
- **`outline.ts` is read only.** K1247 stage 16's agent is changing it in parallel. If the fill needs
  something the table lacks, add it in your own file, or report it.
- **Load.** Another agent runs on this machine. While anyone else holds `$env:TEMP\claude-perf.lock`,
  run one scoring process at a time, at Idle priority.
- **Commit WIP at every milestone,** broken or not. Read code through the shell (`Select-String`,
  ranges of `Get-Content`), using Read only just before an Edit.
- **Stop** when the stage is done or at 2 h from your start, whichever comes first. Check `Get-Date` at
  the start and at each milestone. Then commit WIP, append a handoff to this brief and report. Neither a
  compaction nor context size is a stop; after a compaction, re-read this brief and `git log`.

## Report

Report these:
- the paint fields: what each vertex and pixel carries, and how a junction hands off between arms;
- the seam test on master and on yours;
- the end-arm sliver, before and after;
- the crops' paths, and the bars;
- what stage 2's pulses will need, and what's left;
- your last SHA.

End with `Ledger items` and K1278's handle fields.
