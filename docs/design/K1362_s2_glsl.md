# K1362 stage 2: the per-pixel look in GLSL, in the app, timed

Ledgers: K1362 (this), K1240 (the redesign), K1314 (the census). One Claude Opus agent in its own worktree, on its
own branch from master. Cap 2 h. Read first: the stage 1 handoff at the end of `docs/design/K1362_s1_gpu_formb.md`,
and its "How the result is judged" section, which holds here too.

## Why

This is the main route to fast junctions now (Levi, 2026-11-12: "I'm very bullish on the GPU distance approach.
Don't give up on that easily"). Stage 1 built the CPU tables (`src/render/gpu_field/tables.ts`) and a per-pixel
evaluator written to port to GLSL (`eval.ts`, `GfEval`). Away from the corners it has not copied from form B yet,
its pixels match form B closely and are smoother than rp=outline's polygon edges
(`.claude/probes/K1362/out/s1/x8/cornerR.png`, `awayJunction.png`). The GPU pass is the half nobody has measured,
and the only part that could rule the route out (fill rate). This stage measures it.

Not in this stage: matching form B's corner set (stage 1's 76 missing corners and 45 stray arcs), K1319, K1315,
and the table build's speed (16.5 ms on def, mostly the corner solve). Later stages take them, so don't start them
here.

## Goal

`eval.ts` ported to a fragment shader, drawn in the app under a new `rp` value (name it in your report), with
today's look and rp=outline untouched. Ink and fill first; section colour through `paint_glsl.ts` if it fits the
time. Keep the per-pixel winning term (which side, arc, cap, tangent point or K1049 arc, and which piece) available
to the shader, never a blend: the outline's later uses (dashes, pencil, things travelling along it) build on it.
The table build may run on main for now; report its time there separately from the GPU pass.

## Done

1. **It renders** all 12 census scenes in the app (the list is in `.claude/probes/K1314/k1314_run.ps1`), at rest
   and through the s18 drags.
2. **GLSL equals the CPU mirror:** read the shader's pixels back on the 12 scenes and compare with `GfEval`'s at
   the same pixels. Report the max and p99 difference per channel and where the largest are. A difference over
   float32 noise is a port bug: fix it. Then run the census on the read-back pixels against stage 1's
   `census_h` counts.
3. **Speed,** desktop, under the perf lock, on the def, muse_hash and fat drags:
   - the GPU pass in ms: a timer query (`EXT_disjoint_timer_query_webgl2`) minus an empty one. If Chrome hides the
     extension, time `gl.finish()` around the pass and say so;
   - pixels shaded and candidates tested per pixel (mean, p95), against stage 1's floor (def 11.5 / 21);
   - the table build on main (ms) and main frameMs p50/p95, against master's rp=outline and today's look.
   Use `node scripts/diag_screenshot.mjs` or a headed real-time probe, never `--virtual-time-budget`. Never touch
   the phone: the Pixel is timed in the phone round (K156).
4. **From the GPU number, a Pixel estimate,** with its working: the desktop pass time and the two devices'
   fill-rate ratio, or the shader's per-pixel cost. Mark it as an estimate.
5. Today's look and rp=outline are byte-identical with the new `rp` value off, the golden snapshots don't move, and
   `npm test` is green.

A failing check is work to do, not a reason to stop. A pass that is over budget gets a breakdown (where the time
goes) and its floor, and the biases toward failure are named, as stage 1's judging rule says.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print a
  whole file. Keep each tool output under about 40 lines. Use the Read tool only right before an Edit, and to view
  images. Junction `node_modules` from the main checkout; never `npm ci` or `npm install`. Before deleting any
  directory, delete each junction inside it with `(Get-Item <path>).Delete()`.
- **Your files:** `src/render/gpu_field/` (new files, plus `tables.ts` and `eval.ts` when the readback finds a bug:
  keep the two in step), the minimal `rp` hook (stage 1 named `src/app/frame_loop.ts`; name yours), tests, and
  tools and outputs under `.claude/probes/K1362/` (`k1362s2_*`). No other agent is working in these files.
- **Untracked inputs** (scenes, drags, the census's form B tiles) are in the main checkout's `.claude/probes/`. Copy
  what you need, and never write there.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs. Never
  push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and delete it
  after. Run the census with `-Lock` and hold no lock of your own around it.
- **Stop** when Done holds or 2 h after your start, whichever comes first. Run `Get-Date` at the start and write the
  time into your first commit message; run it at each milestone. Before stopping for the cap, run `Get-Date` and check
  that 2 h have really passed (stage 1 stopped 30 minutes early). Leave the last 25 minutes for the checks. Then commit
  WIP, append a handoff to this brief with your start and stop times, and report. Neither a compaction nor context size
  is a stop.

## Report

Under 30 lines:
- what you built, where, and the `rp` value;
- the GLSL vs mirror difference, and the census on the read-back pixels;
- the speed table (GPU pass, candidates per pixel, table build, frameMs) by drag, with the load, and the Pixel
  estimate;
- your verdict, in stage 1's three forms, and what stage 3 needs;
- your last SHA.

End with `Ledger items` and the handle fields for K1362.
