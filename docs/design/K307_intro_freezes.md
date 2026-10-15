# K307: the intro's two freezes: trace them, then warm the shaders

Levi, 2026-10-14 about 20:43, quoting the coordinator's report on K7's
design and then answering K302 (8), verbatim:

> The two intro freezes stay. They last 2.7 s (at 1.1 s) and 2.0 s (at
> 3.8 s), and they happen with physics paused too, so the worker can't
> remove them. I think they're shader compiles, but nobody has traced
> them yet. The shader warm-up work (K8/K9) would fix them.
>
> Let's prioritize this too.

The warm-up was a sub-part of K9 (G4's junction webs). It has its own
ID now, and it runs ahead of the rest of the GPU pipeline.

## What is known

All of it is from K7's design (`docs/design/K7_worker.md`, "The answer to
Levi's question", Design 5 and "10. Acceptance"), measured on 0d88091 on
the desktop (RX 6800 XT, Chrome with `--use-angle=d3d11`, 1600x900 at
DPR 1.5), each load in a fresh Chrome profile:

- **The daily's front door** (the bare URL, gs 18, 2977 particles), runs
  a / b: visible at 1.09 / 1.08 s. The freezes:
  - 2675 / 2686 ms at 1.09 s, the first visible frame;
  - 1978 / 1939 ms at 3.78 s;
  - about 300 ms at 0.4 s.
- **With physics paused** from the reveal's start (`k7_frames.mjs
  --pause`): 2574 / 1934 and 2809 / 2035 ms. So they are not physics.
  Past the freezes, the render alone runs at 56.2 fps.
- **What they cost:** K7 expects the daily's first sleep at about 11.9 s
  with the worker and about 7.3 s without the freezes.
- **Inferred, not traced:** shader compiles and links.
  - Pixi compiles a program at its first draw.
  - Pixi 8.19's `generateProgram` reads `LINK_STATUS` right after
    linking (`node_modules/pixi.js/lib/rendering/renderers/gl/shader/program/generateProgram.mjs`),
    so main waits for the GPU process to finish compiling.
  - On ANGLE D3D11 a large fragment shader with loops can take seconds
    to compile.
- **The probe:** `.claude/probes/K7/design/k7_frames.mjs` (its header
  documents it) records every frame from the first one. Its rows are in
  `frames/` and its summaries in `k7_results.jsonl`.
- **The programs.** `Shader.from` / `GlProgram` sites in `src/`:
  - `render/ribbon_renderer.ts` (2), `background.ts` (3),
    `junction_field.ts`, `arm_strip.ts`, `marker_mesh.ts` (2),
    `pluck_overlay.ts` (2) and `pluck_ripple.ts`;
  - Pixi's own (batcher, graphics, text, the confetti's
    ParticleContainer);
  - variants: the explore look (`explore_glsl.ts`), the background
    effects, and whatever defines switch.
- **The loader.** The trefoil (`createLoader` in `src/main.ts`) turns by
  CSS transforms on the compositor, so it keeps moving while main is
  blocked. It shows only when the settle is predicted to run past
  `LOADER_DELAY_MS` (300 ms), and then for at least `LOADER_MIN_MS`.
  K147's hidden pre-settle runs before the first visible frame: 734 ms
  of wall time on the daily, ended by work.

## Stage 1 (this stage): trace, attribute, and prove it with a throwaway warm-up

**Tracked `src/` does not change in this stage.** K7's stage 1 owns
`main.ts` now, and K298 is editing the paint shaders. Stage 2 builds the
warm-up after them.

- Prototype code goes on a local throwaway branch, `k307-proto` in your
  worktree. It is never merged and never pushed.
- Save each variant as a `.patch` in `.claude/probes/K307/`.
- Build each variant into its own directory under
  `.claude/probes/K307/builds/`.

1. **A trace harness.** Write `.claude/probes/K307/trace_intro.mjs`,
   taking its Chrome launch and timing from `k7_frames.mjs`.
   - It loads a URL in headed, hardware-GPU Chrome and records a
     performance trace from navigation through 8 s. Use puppeteer's
     `page.tracing.start` with the timeline and GPU categories
     (`devtools.timeline`, `disabled-by-default-devtools.timeline`,
     `gpu`, `disabled-by-default-gpu.service`, `gpu.angle`, `v8`,
     `blink`, `toplevel`).
   - It saves the trace and summarizes every main-thread task over 100
     ms: its start, its length, the JS frames and WebGL calls inside it,
     and the GPU-process events that overlap it (compile, link, texture
     upload, anything else).
   - It also wraps `WebGL2RenderingContext.prototype` through
     `evaluateOnNewDocument`. Wrap `compileShader`, `linkProgram`,
     `getProgramParameter`, `getShaderParameter`, the texture and buffer
     uploads, and the draws. Time every call, and tie each program to its
     source (a hash plus a name or its first lines).
   - The trace and the wrapper should agree. Say where they don't.
2. **Attribute each freeze** on the daily's front door: the ones at 0.4
   s, 1.09 s and 3.78 s.
   - Which programs compile and link in each freeze? Name them by
     source file and variant, with the ms each takes.
   - Which first draw triggers each one? In other words, what appears
     or turns on at that moment?
   - What else is inside each freeze (uploads, pipeline state, GC,
     layout)?
   - Then do the same for `?b` (fabric), the knot `?7k&mf=0` and dense,
     using the designs in K7's table, so the warm-up covers every mode.
   - Until midnight the bare URL is still K7's daily. `?1471kin.J` is
     the same gs 18 design as an ordinary link.
3. **Cold and warm caches.** `k7_frames` used a fresh profile for every
   load, so every shader compiled from scratch. Chrome keeps compiled
   programs in a disk cache.
   - Measure a second and a third load in the same profile, and a load
     after a Chrome restart with that profile kept.
   - Clear localStorage between those loads, but not the disk cache, so
     that each one plays the same intro. Check that it does.
   - Players come back daily: say what a returning player sees. Say
     whether a Chrome or driver update empties the cache (inferred is
     fine, but say so).
4. **The ANGLE backend.** Today's numbers are D3D11, from
   `k7_frames`' flag.
   - One cold load with Chrome's default, without `--use-angle`, to
     confirm that it is the same backend.
   - One with `--use-angle=vulkan`, for comparison only.
5. **Prove the attribution with a throwaway warm-up.** Patch a probe
   build so the programs compile before the first visible frame, behind
   the trefoil or the hidden pre-settle (force the trefoil on), and
   measure two variants:
   - **(a) Blocking.** Draw each program once into a 1x1 render texture
     before the reveal starts. The freezes should move into the loading
     time.
   - **(b) Parallel.** Check that `KHR_parallel_shader_compile` is
     exposed. Compile and link the same sources through it, and poll
     `COMPLETION_STATUS_KHR` each frame without blocking. Then let Pixi
     link the same sources: ANGLE's program cache should make that link
     cheap, so measure whether it does. Say whether main stays free (the
     trefoil and the pre-settle keep running) and how long the compiles
     take in wall time.
   - For each variant, give the freeze lengths, the time from load to
     the first visible frame, and where the time went.
6. **The phone, by inference only.** The phone is off-limits. Say what
   you expect there (PowerVR, Android Chrome's own cache) and what a
   phone pass should measure. The coordinator schedules that pass with
   K156.
7. **A stage 2 design**, written into this file under "Stage 2: the
   warm-up". Cover:
   - where the warm-up runs: today's main-thread pre-settle, and after
     K7's stage 4, beside the worker's settle (K7_worker.md Design 5,
     "Main is idle meanwhile");
   - which programs and variants it warms;
   - blocking or parallel;
   - a program first created later (a panel toggle, a mode change);
   - a timeout;
   - the loader's show-or-not prediction (`LOADER_DELAY_MS`);
   - the files it touches (it should not need the paint shader's
     source);
   - a test that every program the app creates is on the warm-up list
     (for example a registry);
   - the expected intro numbers.

### Verification

- Take the perf lock (`$env:TEMP\claude-perf.lock`, `probes.md`) for
  every timing. A compile is CPU time in the GPU process, so load on the
  machine changes it.
- Run at least two loads per condition. Report every run, not only the
  mean.
- Keep what you observed apart from what you inferred.
- Name anything you could not attribute.

### Setup

- **Your branch starts from master** at e5acafb or later. Run
  `git log -1 --oneline` first. If this file is missing, run
  `git merge --ff-only origin/master`.
- **`node_modules`:** link it to the main checkout's with a junction
  (`New-Item -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`). Before removing
  anything that contains it, run `(Get-Item node_modules).Delete()`. A
  recursive delete, or `git worktree remove --force`, follows the
  junction and empties the main checkout's packages.
- **Servers:** use ports 5820-5829, and give each vite server a private
  cacheDir (`probes.md`). Port 5173 is Levi's: leave it alone.
- **Chrome:** headed, hardware GPU, off-screen like `k7_frames`. Every
  instance gets its own `--user-data-dir` in your probes folder; delete
  them when you are done (K161). For the warm-cache test, keep one
  profile across the loads, then delete it.
- **Files:** probes, traces, logs and notes go in `.claude/probes/K307/`.
  It is untracked; the coordinator copies it at the merge. Keep the
  traces you cite and delete the rest, since traces are large.
- **Running alongside:** K7's stage 1 (the physics host, `main.ts`) until
  about 22:12, and K298 (the hover glow: the paint shaders, the panel,
  and a pick radius in `main.ts`). Neither is on master yet. Trace
  master.
- **The phone is off-limits.**

### Process

- **One stage.**
  - Run `Get-Date` at the start and at each milestone.
  - Commit WIP on your branch at every milestone, and never push.
  - Don't edit `LEDGER.md`.
- **The stop.** Stop when items 1-7 are done, or at your cap, whichever
  comes first. The cap is two hours on Opus.
  - Neither a compaction nor context size is a stop. After a compaction,
    re-read this brief and `git log`, then go on.
  - At the stop, commit WIP, append a "Stage 1 handoff" section to this
    file (done, not done, evidence paths, and the stage 2 design or how
    far it got), commit it and report.
- **The final report covers:**
  - an attribution table: each freeze, its programs, the ms each takes,
    and its trigger;
  - cold against warm, and the backends;
  - both prototypes' numbers;
  - the stage 2 design in brief;
  - the lore you added: the harness in the probes lore, and compile
    costs in the render lore;
  - a `Ledger items` list;
  - the handle fields: branch, last commit, evidence and next.
