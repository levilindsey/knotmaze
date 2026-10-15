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

## Stage 1 results (2026-10-14, the K307 agent)

All on master 3e86fb5, on the desktop: RX 6800 XT, Chrome's renderer
"ANGLE (AMD, AMD Radeon RX 6800 XT (0x000073BF) Direct3D11 vs_5_0 ps_5_0,
D3D11)", 1600x900 at DPR 1.5, a fresh Chrome profile per load unless
noted, under the perf lock. The bare URL was Daily #3. Every run is in
`.claude/probes/K307/runs/<label>/` (`load<N>.json`; `table.mjs <label>`
prints one).

### 1. The harness

`.claude/probes/K307/trace_intro.mjs` (its header documents it; the
lore is in `probes.md`): a WebGL2 wrapper that times every call and ties
each program to its sources by hash and Pixi's `SHADER_NAME`, plus a
performance trace from navigation. Per frame it records the callback and
its GL time split into compile+link, status reads, queries, draws,
uploads and syncs.

**They agree** within about 1% on each program's cost. **Where they
differ:** the wrapper books the whole cost on the first
`getProgramParameter(LINK_STATUS)`, which Pixi's `generateProgram` reads
right after `linkProgram`. The trace shows where the time really goes:

- the renderer's main thread waits in `GLES2Implementation::GetProgramiv`
  → `CommandBufferProxyImpl::WaitForGetOffset` (2770 ms for section-rgb
  in daily-a);
- the GPU process's main thread (`CrGpuMain`) waits in
  `Program::MainLinkLoadEvent::wait`;
- the work runs on GPU-process `ThreadPoolForegroundWorker` threads.
  ANGLE translates GLSL to HLSL (`ShaderTranslateTaskD3D::run`, 20-33 ms)
  and then calls `D3DCompile`, Microsoft's FXC (HLSL to DXBC), in
  `GetPixelExecutableTask::run`. It starts about 26 ms after the link
  call. In daily-a: section-rgb 2737 ms, arm-strip 1698, junction-field
  381.5, bg-vellum 184.4, pluck-blur 33.1.

So a program's cost is FXC compiling its fragment shader. The link call
itself returns at once, a first draw after it costs about 0 ms, and the
length follows the fragment source: section-rgb 46850 characters,
arm-strip 32668, junction-field 28585, bg-vellum 2767.

### 2. Attribution

**The daily's front door** (the bare URL), runs daily-a / daily-b /
daily-long-a / daily-long-b. Times are from navigation; each freeze is
one rAF callback.

| Freeze | At | Length (ms) | Programs, ms each (the four runs) | Trigger |
|---|---|---|---|---|
| 1 | 0.32-0.37 s, hidden pre-settle | 279 / 280 / 277 / 286 | bg-vellum 187.5 / 188.6 / 187.5 / 187.6; bg-blit 4.9-5.4 | The background's first draw. Its container is visible from the start; only the knot's root is hidden. |
| 2 | 0.97-1.03 s, the first visible frame | 2895 / 2955 / 2936 / 2944 | section-rgb 2770 / 2811 / 2805 / 2798; pluck-blur 36.7-40.5; knot-marker 14.7-17.6; batch 8.5-8.9 | `finishPresettle()` makes the root visible: the first draw of the ribbons, the pluck overlay and the markers. |
| 3 | 3.90-3.98 s | 2175 / 2236 / 2230 / 2213 | arm-strip 1719 / 1773 / 1748 / 1754; junction-field 395 / 403 / 414 / 397; pixi-program 5.6-6 | The reveal reaches the first junction: the ArmStripSystem's prerender pass and the junction fans draw for the first time, and so do the burn intro's particles (a ParticleContainer). |
| (4) | about 14.1 s | 58 / 56 frame (long runs) | pluck-ripple 14.6 / 14.4 | Music mode's first pluck (a Filter). |

What else is in them: texture and buffer uploads of 2-7 ms a frame, no
layout, minor GCs of 3 ms or less, and no pipeline-state cost (the first
draw after a link is about 0 ms). **Not attributed:** freeze 1 holds
about 86 ms of JS that is not GL, and freeze 2 about 47 ms. Inferred:
the pre-settle's physics slice in the same frame. The first frame after
freeze 3 (80 / 84 / 96 / 80 ms at about 6.1 s) is non-GL JS too (1.3 ms
of GL). Inferred: K147's settle budget stepping after the long frame.
The frames after it run at 23-25 ms, so the intro is smooth from about
6.2 s.

**The other modes** (K7's designs, `am=instant&snd=none`), runs a / b.
With `am=instant` there is no pre-settle and no loader: every program
links inside the first frame.

| Link | First draw | Freeze (ms) | Programs, ms (a / b) |
|---|---|---|---|
| Fabric `?b` | 0.33 / 0.31 s | 5351 / 5334 | section-rgb 2769 / 2762, arm-strip 1764 / 1770, junction-field 415 / 400, bg-vellum 186 / 190, pluck-blur 41 / 40, knot-marker 15 / 16, batch 8.3 / 8.5, bg-blit 5 / 5 |
| Knot `?7k&mf=0` | 0.27 / 0.24 s | 3169 / 3113 | section-rgb 2860 / 2809, bg-vellum 192 / 189, pluck-blur 38 / 38, bg-blit 5 / 5 |
| Dense `?b&gs=24&wd=0.6&brd=0.6` | 0.38 / 0.40 s | 5407 / 5440 | section-rgb 2772 / 2765, arm-strip 1792 / 1800, junction-field 397 / 413, bg-vellum 188 / 186, pluck-blur 41 / 43, knot-marker 16 / 16, batch 8 / 8, bg-blit 5 / 5 |

The dense design then renders at about 53 ms a frame. That is render
cost, not compiles (K8's territory).

The program sites:

- section-rgb: `ribbon_renderer.ts:535` (the explore variant is at :563);
- arm-strip: `arm_strip.ts:251`, created lazily in `passScene`;
- junction-field: `junction_field.ts:428`, lazy;
- `bg-<effect>`: `background.ts:118` (vellum is the daily's);
- bg-blit: `background.ts:364`; bg-fog: `:441`;
- knot-marker: `marker_mesh.ts:141`;
- pluck-blur: `pluck_overlay.ts:417`; pluck-still: `:518`;
- pluck-ripple: `pluck_ripple.ts:167`, a Filter;
- batch: Pixi's DefaultBatcher, also used by the shaderless meshes in
  `ribbon_mesh.ts`, by Graphics and by Text;
- pixi-program: Pixi's ParticleContainer shader (the burn intro in
  `appear_fx.ts`, the confetti);
- the DisplacementFilter on the fog sprite (`fabric_maze_renderer.ts:1567`).

**Not measured:** the explore variant of section-rgb, the other
background effects, bg-fog, pluck-still, the DisplacementFilter and the
confetti. None of them drew in these intros.

### 3. Cold and warm caches

Runs cache-a / cache-b: four loads each (`--loads 3 --restart`), one
profile kept, localStorage cleared before each load. Every load played
the same intro: a pre-settle ended by work, and the trace and burn
reveal.

| Load | First visible (s) | Pre-settle (ms) | Frames over 50 ms |
|---|---|---|---|
| 1, cold | 1.029 / 1.072 | 712 / 711 | 285, 2924, 2282 / 274, 2898, 2201 |
| 2 | 0.698 / 0.696 | 513 / 516 | largest 97 / 105 |
| 3 | 0.715 / 0.735 | 520 / 509 | largest 95 / 89 |
| 4, after a Chrome restart | 0.717 / 0.717 | 506 / 520 | largest 96 / 101 |

On warm loads the status reads cost: section-rgb 20-24 ms, arm-strip
12-13, junction-field 8-9, bg-vellum 1-2, the rest 4.6 or less.

- **Observed:** Chrome's GPU program cache lives in the profile, removes
  every freeze, and survives a restart.
- **A returning player** on the same browser sees a 0.7 s intro with no
  freeze. The first visit, and the first visit after anything that
  empties the cache, pays the 5 s.
- **Inferred, not tested:** a Chrome update (ANGLE and its translator
  are part of the cache key) or a GPU driver update invalidates the
  cache. So does any build that changes a shader's source, for that
  program only. Every deploy that touches the paint shaders therefore
  hands every player a cold section-rgb (2.8 s) once. An incognito
  window starts empty.

### 4. The ANGLE backend

- **Chrome's default** (no `--use-angle`) is the same D3D11 backend:
  the same renderer string. angle-default-a / -b: freezes
  285 / 2908 / 2184 and 294 / 2913 / 2171 ms; section-rgb 2785 / 2769,
  arm-strip 1726 / 1712, junction-field 397 / 399; first visible 1.063 /
  1.047 s.
- **Vulkan** (`--use-angle=vulkan`, for comparison): the renderer is
  "ANGLE (AMD, Vulkan 1.4.315 (AMD Radeon RX 6800 XT (0x000073BF)), AMD
  proprietary driver)", and **`KHR_parallel_shader_compile` is not
  exposed**.
  - vulkan-a (traced): first visible 1.227 s; frames of 227 ms at 0.50
    s, 497 at 1.23 and 450 at 1.75. The status reads were bg-blit 137,
    pluck-blur 348, junction-field 274, pixi-program 102 and section-rgb
    25. Inferred: Vulkan builds pipelines lazily, so a cost lands at
    whichever call next synchronizes, not on its own program.
  - vulkan-b, a fresh profile: first visible 0.874 s, largest frame 101
    ms, every status 26 ms or less. Inferred: the AMD driver's own
    pipeline cache, outside the Chrome profile, was warm from vulkan-a.
- **The batcher's source depends on the backend:** its fragment is 1820
  characters on D3D11 (16 texture units) and 2972 on Vulkan. So a
  warm-up has to build its programs through the app's and Pixi's own
  constructors at run time. Sources captured from one machine would miss
  the cache on another.

### 5. The throwaway warm-ups

Branch `k307-proto`, commit 51f7480, never merged or pushed. The patch is
`.claude/probes/K307/k307-proto.patch`. `VITE_K307=block|par` picks the
variant at build time, and `#seq` in the URL makes the block variant
link in Pixi's order. Builds are in `builds/proto-block` and
`builds/proto-par`.

Both variants force the trefoil on from the first pre-settle slice. The
pre-settle cannot finish until the programs are warm, and keeps stepping
physics while it waits, so the first visible knot is more settled than
master's. The sources are master's, captured by the harness into
`src/k307_programs.json`.

- **(a) Blocking** (pre-settle slice 3, at about 0.63-0.70 s): compile
  and link all 10 programs, then read LINK_STATUS and draw one point
  into a 1x1 framebuffer for each, then `readPixels`.
  - block-a: one frame of 2904 ms at 0.63 s (the block itself 2876 ms:
    section-rgb 2856.9, the others 9.3 or less). First visible 3.856 s;
    then frames of 87 and 77 ms.
  - block-b: 2942 ms at 0.70 s (block 2910: section-rgb 2885.8). First
    visible 3.969 s; then 86 and 77 ms.
  - Freeze 1 is unchanged (281 ms at 0.31 / 0.38 s), because the
    background draws before slice 3.
  - Pixi's own links later are cache hits: section-rgb 25-26 ms,
    arm-strip 12.4-12.5, junction-field 9.1-9.2, pixi-program 3.1-3.5,
    pluck-blur 1.8-2.2, pluck-ripple 1.7-1.8, marker 0.8-0.9, batch
    0.6-0.8.
  - **Linking all of them before the first status read costs the
    longest compile, not the sum.** The block-a trace shows FXC on three
    workers at once (junction-field 403 ms, arm-strip 1777.5, section-rgb
    2832.5), and the block ends with section-rgb.
- **(a') Blocking in Pixi's order** (`#seq`: each status read before
  the next link): blocks of 5010 / 4962 ms, the sum (section-rgb 2802 /
  2769, arm-strip 1726 / 1705, junction-field 397 / 403, then 36-39, 16,
  13, 9 and 5). First visible 6.029 / 5.972 s, then frames of 107-108
  and 77-78 ms.
- **(b) Parallel** (pre-settle slice 1, at about 0.36-0.39 s): submit
  all 10 links, longest first, in 2.2-2.4 ms. Then poll
  `COMPLETION_STATUS_KHR` once a frame, read LINK_STATUS for each (11-12
  ms in all) and delete the programs.
  - **Main stays free.** Each run made 77 polls over 68 frames of
    waiting, 93.3 / 92.4 ms in all. The first poll, right after the
    submit, took about 73 ms of that, and the rest about 0.25 ms each.
    Inferred: the first poll waited for the GPU process's synchronous
    part of the 10 links. No link failed and nothing timed out. During the warm-up the
    frame interval had a median of 36 ms, a p95 of 53.7 and a max of
    54.1, set by the pre-settle's physics slices (callback median 41.7
    ms) (`warm_frames.mjs`).
  - **Wall time:** all programs were done 3115 / 3092 ms after the
    submit. The trace shows FXC running concurrently on the workers:
    section-rgb 2976.9 ms, arm-strip 1926, junction-field 439,
    bg-vellum 221.6 plus a duplicate of 199.8. These are slower than
    alone. Inferred: CPU contention with the pre-settle's physics and
    four or five parallel compiles.
  - First visible 3.470 / 3.465 s, then frames of 82 / 79 and 80 / 75
    ms: the cache-hit relinks (section-rgb 25.6-26, arm-strip 11.8-12.4,
    junction-field 9.1-10). Nothing else over 50 ms; pluck-ripple at
    11.6-12.5 s cost 1.6-1.9 ms.
  - **One freeze is left, and it is self-inflicted:** frames of 393 /
    378 ms in the first slice. The background drew in that same frame,
    and Pixi linked bg-vellum itself (202.3 / 202.6 ms) before the
    warm-up's copy had finished. That is a duplicate compile, plus the
    73 ms first poll and bg-blit's 5.6.

| Variant | First visible (s) | Frozen after it | Smooth from |
|---|---|---|---|
| master | 0.999 / 0.974 | 2895 + 2175 / 2955 + 2236 ms | about 6.2 s |
| (a) blocking | 3.856 / 3.969 | nothing over 87 ms | about 4.0 s |
| (a') blocking, Pixi's order | 6.029 / 5.972 | nothing over 108 ms | about 6.1 s |
| (b) parallel | 3.470 / 3.465 | nothing over 82 ms | about 3.6 s |

### Compositor during freezes (for K313)

Levi wants a richer loader for K313, a small maze animation drawn off
the main thread. So the question is whether anything reaches the screen
while a freeze holds main.

**Observed, master** (the daily-a trace;
`compositor.mjs runs/daily-a/load1.trace.json 150 --long --presents`):

- In every freeze, the GPU process's main thread (`CrGpuMain`) blocks in
  `Program::MainLinkLoadEvent::wait`, inside
  `CommandBufferStub::OnAsyncFlush` (WebGL's command buffer).
- `DCompPresenter::Present` (the swap that puts a frame on the screen)
  runs on that same thread, so the presents stop. The
  `VizCompositorThread` keeps issuing BeginFrames throughout, but nothing
  is presented.

| Freeze | GPU main's wait | Presents inside | Longest present gap |
|---|---|---|---|
| 1 | 186.5 ms at 422 ms | (the gap) | 191.9 ms |
| 2 | 2760 ms at 1058.5 ms | 0 | 2771 ms |
| 3 | 1714.5 ms at 3926.6 ms, then 391 ms at 5653 ms | 0 in each wait, one present between them | 1728.8 ms |

- **The contrast:** a 213 ms JS task on the renderer's main thread at
  114 ms (app init) kept presents at 56.2/s. A busy main thread alone
  does not stop the screen. A link wait on the GPU main thread does.
- On master the trefoil is up during freeze 2: the pre-settle hides it
  in the same task that makes the root visible, and that DOM change
  commits after the task. So the screen holds the trefoil's last frame
  for 2.8 s, then the knot's for 2.2 s.

**Observed, the prototypes:**

- (a) blocking (proto-block-a): the same stall. One present at 629.5 ms,
  then none for 2903.7 ms, while `CrGpuMain` waited 2852 ms. The forced
  trefoil cannot have moved.
- (b) parallel (proto-par-a, `--window=360,3490`): `CrGpuMain` presented
  164 times in the warm-up's 3.13 s (52.4/s; about 56/s outside the one
  gap). The longest gap was 212.8 ms: the duplicate bg-vellum link,
  waiting 201 ms at 486.6 ms. The renderer's main thread drew only 68
  frames there (`AnimationFrame::Presentation`, about 22 fps), so the
  other presents are compositor-only frames.
  - Inferred, not filmed: those are the CSS trefoil's animation, which
    keeps turning at about 56 fps during (b). Its spin and breathing are
    CSS transform and opacity animations with `will-change`
    (`createLoader`, main.ts), which the compositor runs without main.

**Which thread compiles:** GPU-process `ThreadPoolForegroundWorker`
threads (`ANGLEPlatformImpl::RunWorkerTask` → `GetPixelExecutableTask::run`
→ `D3DCompile`), several programs at once. `CrGpuMain` only waits when
something asks for the result: a LINK_STATUS read, or a draw with the
program. `COMPLETION_STATUS_KHR` does not wait.

**Observed, an off-main spinner** (`spinner/`: a page with a 2D spinner
on an OffscreenCanvas in a worker and a CSS spinner, which links
section-rgb cold 1.5 s after load; `run_spinner.mjs <origin> block|par`,
a fresh profile per load, 800x500 at DPR 1; `block` reads LINK_STATUS
right after `linkProgram` as Pixi does, `par` polls
`COMPLETION_STATUS_KHR` once a frame):

| Load | Link | Worker spinner frames | Page frames | Presents | `CrGpuMain` wait |
|---|---|---|---|---|---|
| block 1 | 2801.9 ms | 2 (longest gap 2770 ms) | 0 | 0 (gap 2801.9 ms) | 2797.1 ms |
| block 2 | 2895.4 ms | 2 (gap 2862.4 ms) | 0 | 0 (gap 2895.3 ms) | 2890.5 ms |
| par 1 | 2826.5 ms | 160, 56.6/s (gap 19.6 ms) | 160 | 159, 56.3/s (gap 20.7 ms) | 14.4 ms |
| par 2 | 2847.6 ms | 161, 56.5/s (gap 18.6 ms) | 162 | 161, 56.5/s (gap 18.7 ms) | 15.0 ms |

- In the second before each link: 57-58 worker frames and 57-58
  presents, longest gaps about 18.5 ms. Every present ran on `CrGpuMain`.
- Blocking: the worker's spinner stops with the page. Its
  requestAnimationFrame callbacks stop, not only its presents: two in
  2.8 s. Inferred, not traced: a worker's frames wait on the display
  compositor, which cannot swap while `CrGpuMain` waits.
- Parallel: the compile takes as long (2.8 s), but the worker, the page
  and the presents keep about 56.5 frames/s. The CSS spinner shares
  those presents (not filmed).

**Inferred** (not measured):

- Video, other tabs and Chrome's own UI on the same GPU process stop
  with it as well, because their frames reach the screen through
  `CrGpuMain`'s present too.
- On Android, DrDc gives the display compositor its own GPU thread, so a
  phone may keep presenting through a link wait. Measure it in the phone
  pass.

**For K313:** on Windows, no loader animates through a blocking link,
off-main or not. The only fix is to take the wait off `CrGpuMain`, which
is the parallel warm-up. Once that is in, the CSS trefoil already
animates, and an off-main maze animation would too.

### 6. The phone, by inference only

- The Pixel 11 (PowerVR) runs Android Chrome's GL path, through ANGLE or
  the native GLES driver; which one is unknown. There is no FXC: on
  D3D11 FXC was 2737 of section-rgb's 2770 ms. The driver's own compile
  of a 47k-character shader with loops is unknown, and could still be
  seconds on a mobile CPU.
- Whether `KHR_parallel_shader_compile` is exposed there is unknown.
- Android Chrome keeps a GPU program cache too (inferred), so returning
  players are warm there as well.
- DrDc may keep presents going through a wait (see above).
- **The phone pass (with K156) should measure:**
  - the renderer string (`WEBGL_debug_renderer_info`) and whether
    `KHR_parallel_shader_compile` is exposed;
  - per-program LINK_STATUS waits, cold and warm, with this harness's
    wrapper (`evaluateOnNewDocument` works over `adb forward`);
  - presents during the waits, from a trace (no DCompPresenter there;
    look for the swap events);
  - the first visible frame and the intro times.
- **A cold cache on the phone** cannot come from a fresh profile without
  wiping Levi's Chrome. Use a probe build that salts every shader source
  (a `#define K307_SALT <random>` line after `#version`). The source is
  the cache key, so every load compiles cold. The same trick gives cold
  loads on any profile.

## Stage 2: the warm-up

**What:** link every program the intro draws before the first visible
frame, in parallel, behind the trefoil, without blocking main or the GPU
main thread. Then let Pixi link the same sources as cache hits.

1. **Where it runs.**
   - **Today:** in K147's hidden pre-settle (`presettleTick`, main.ts).
     Start it right after `app.init`, before the first frame, so the
     compiles overlap the settle from 0 s.
     - The pre-settle may not end (`finishPresettle`, the root visible)
       until wave 1 completes or times out. Meanwhile it keeps stepping
       physics, so the first visible knot is more settled, as (a) and
       (b) showed.
     - Hold the background layer (`renderable = false`) until its
       program completes. Otherwise its first draw links bg-vellum
       itself while the warm-up's copy compiles: the 200 ms frame and
       duplicate compile in (b).
   - **Links without a pre-settle** (`am=instant`, `lds=0`, any link
     whose settle is skipped) freeze for 3.1-5.4 s in their first frame
     today. They need the same gate: the root hidden and the trefoil
     shown until wave 1 completes, then the first frame.
   - **After K7's stage 4:** the worker settles while main is idle
     (K7_worker.md Design 5, "Main is idle meanwhile"). The warm-up runs
     on main beside it. Its cost there is the submit (2-3 ms), the first
     poll (about 73 ms) and about 0.25 ms of polling a frame. The first
     frame waits for both the settle and the warm-up.
2. **Which programs.**
   - **Wave 1 (gating)** is what the current mode's intro draws, built
     with today's params and prefs:
     - every mode: the background's `bg-<effect>`, bg-blit and batch;
       section-rgb, or its explore variant when that look is on; and
       pluck-blur, or pluck-still under reduced motion;
     - fabric: also knot-marker, arm-strip, junction-field and
       pixi-program (the burn intro);
     - music mode: pluck-ripple.
   - **Wave 2 (never gating)** starts after the reveal or the first
     sleep, whichever is first: the other section variant, the other
     background effects, bg-fog, the DisplacementFilter, the confetti,
     and the other mode's set.
   - Parallel compiles cost wall time only up to the longest one
     (section-rgb), so wave 1 can take the whole mode set.
3. **Parallel, with a blocking fallback.**
   - With `KHR_parallel_shader_compile`:
     - submit every compile and link in one go;
     - from the next frame, poll `COMPLETION_STATUS_KHR` once a frame;
     - then read LINK_STATUS and delete each program.
     - Pixi's later link of the same source is a cache hit. Chrome's GPU
       process caches by source, so even a deleted program warms it.
   - Without the extension (desktop Vulkan; maybe phones), use (a):
     link everything before the first status read, then read the
     statuses behind the trefoil. That costs the longest compile, not
     the sum. On D3D11 the screen still stalls during that wait.
     - Inferred: on Vulkan the cost lands at a draw, so the fallback
       may need (a)'s 1x1 draw per program. Leave that to the phone
       pass's numbers.
4. **The same source as Pixi, without the paint shader's text.** Add a
   registry, `src/render/program_registry.ts`.
   - Each program site exports the factory that builds its `GlProgram`.
     `GlProgram.from` caches by source, so it returns the instance the
     site will use.
   - Pixi's own programs come from Pixi: the DefaultBatcher's shader
     built with the renderer's max texture units, the ParticleContainer's
     shader, the DisplacementFilter, and pluck-ripple's Filter.
   - The warm-up compiles `glProgram.vertex` and `.fragment`. Pixi 8.19
     preprocesses them in the `GlProgram` constructor, and
     `generateProgram` compiles exactly those strings (checked in
     `GlProgram.mjs` and `generateProgram.mjs`). So the warm-up never
     reads or edits a shader's source.
   - Captured sources (the prototype's `k307_programs.json`) would go
     stale with any shader edit, and differ per backend (the batcher).
     Never ship them.
5. **A program first created later** (a panel toggle, a mode change, a
   background switch) is warm once wave 2 has run. Before that, it links
   blocking as today: one freeze, no worse than master.
6. **Timeout and failure.**
   - Wave 1 gives up after 15 s (this desktop's slowest cold compile is
     about 3 s; a slow CPU or phone may be several times that). Then it
     shows the first frame, and Pixi's links block as today.
   - A link failure logs the program's name and moves on; Pixi reports
     the same failure itself.
   - A lost context aborts the warm-up.
7. **The loader.** Today the trefoil shows at `LOADER_DELAY_MS` (300 ms)
   if the settle is predicted to run past it.
   - New rule: show it at 300 ms if the settle is predicted long or the
     warm-up has not finished. `LOADER_MIN_MS` stays as it is.
   - A warm cache completes in a frame or two, so a returning player
     sees no loader, as today.
8. **Files.**
   - New: `src/render/shader_warmup.ts` (submit, poll, resolve, timeout,
     a `window.__knotWarmup()` probe hook) and
     `src/render/program_registry.ts`.
   - Each program site exports its factory, with no shader edits:
     `ribbon_renderer.ts`, `arm_strip.ts`, `junction_field.ts`,
     `background.ts`, `marker_mesh.ts`, `pluck_overlay.ts`,
     `pluck_ripple.ts`, `appear_fx.ts` / `confetti.ts` and
     `fabric_maze_renderer.ts`.
   - `main.ts`: the early start, the pre-settle gate, the gate for links
     without a pre-settle, the background hold and the loader rule.
9. **Tests.**
   - `test/render/program_registry.test.ts`: a source scan, like K108's
     `deterministic_math.test.ts`. It fails when a `GlProgram.from`,
     `Shader.from`, `new Filter`, `new *Filter` or `new
     ParticleContainer` site in `src/` has no registry entry.
   - `test/render/shader_warmup.test.ts`: the poll, timeout, failure and
     no-extension paths against a fake GL.
   - A dev-build check that warns when Pixi compiles a source the
     warm-up did not submit. A silent cache miss is the failure that
     tests cannot see.
   - The probe check: `trace_intro.mjs` on a fresh profile must show
     every Pixi link at 30 ms or less, and no frame over about 100 ms
     after the first visible one.
10. **Expected numbers** (this desktop, D3D11, a cold cache, the daily;
    from (b)):
    - first visible at about 3.2-3.5 s instead of 1.0 s, with the
      trefoil turning throughout (about 56 presents/s);
    - after that, no frame over about 90 ms (the cache-hit relinks,
      about 46 ms over the first two frames), so the intro is smooth
      from about 3.5 s instead of 6.2 s;
    - holding the background removes (b)'s 380-390 ms first-slice
      frame;
    - a warm cache is unchanged: visible at about 0.7 s, no loader.
    - K7 expects the daily's first sleep at about 7.3 s without the
      freezes (worker on), against about 11.9 s with them.
    - The remaining relink cost could go too, by creating Pixi's GL
      program during the pre-settle. Pixi 8.19's `GlShaderSystem` does
      that only through private methods (`_getProgramData`), so accept
      the 46 ms unless a 1x1 draw through Pixi is cheap to set up.

## Stage 1 handoff (2026-10-14, the K307 agent)

**Done:** stage 1's items 1-7 and K313's compositor question, all in
"Stage 1 results" above, on master 3e86fb5 with no tracked `src/`
change:

- the harness, and the attribution of the daily's three freezes and of
  the first frame of `am=instant` links (fabric, knot, dense);
- cold and warm caches (a restart included), and the default, D3D11 and
  Vulkan backends;
- the throwaway warm-ups: (a) blocking, (a') blocking in Pixi's order,
  and (b) parallel. They live on the branch `k307-proto` (51f7480; never
  merge or push it);
- the compositor during freezes, with the off-main spinner test;
- the stage 2 design above;
- lore: the new `.claude/rules/render-shaders.md` (compile costs, the
  cache, why presents stop, the warm-ups), the K307 entry in
  `probes.md`, a line in `render.md` and a row in `docs/lore_index.md`.

**Not done:**

- Programs not measured (listed in 2.): section-rgb's explore variant,
  the other background effects, bg-fog, pluck-still, the
  DisplacementFilter and the confetti. Stage 2's wave 2 covers them
  either way; `trace_intro.mjs` on a link that shows each one measures
  it.
- The phone (off-limits): 6. lists what its pass should measure.
- The trefoil was not filmed: that it turns during (b) is inferred from
  the presents.
- Stage 2 is not built.

**Evidence** (`.claude/probes/K307/`, untracked):

- scripts: `trace_intro.mjs`, `run_k307.ps1`, `table.mjs`,
  `compositor.mjs`, `who_compiles.mjs`, `warm_frames.mjs`,
  `programs_from_run.mjs`, `build_variant.mjs`, `serve.mjs`,
  `vite.k307.config.ts`; `spinner/` (the page, its worker, the program
  list and `run_spinner.mjs`). Each script's header says how to run it.
- `batch1.txt`-`batch4.txt` and their logs: every run, in order.
- `runs/<label>/load<N>.json` for every run. Traces kept: daily-a,
  proto-block-a, proto-par-a, angle-vulkan-a and the four spinner loads.
  The other traces were deleted for space; their load JSONs keep the
  summaries.
- `k307-proto.patch` (the prototype's diff against master) and
  `builds/` (master and both prototypes; rebuildable with
  `build_variant.mjs` and `vite.k307.config.ts`).

**Next:** stage 2 from "Stage 2: the warm-up" above, after K7 stage 1
and K298 land (both edit `main.ts`). Then the phone pass with K156 (6.).

## Stage 2 launch notes (2026-10-15, the coordinator)

What changed since the design above, and what rides this stage:

- **The physics worker becomes the default** with K7 stage 6 (call F6),
  which may land on master while you work; `&phw=0` runs the same
  pre-settle on main. Both hosts go through `host.presettleFrame` and
  `finishPresettle` (main.ts), so 1.'s gate is the same code either
  way. Verify with the worker on and off: pin each with `&phw=1` and
  `&phw=0`, whatever your branch's default.
- **K366 rides this stage.** K279 stage 2's ripple warms itself
  (`PluckRipples.warm(stage)`, one main.ts call once the stage is
  built; `render-shaders.md`, "The pluck ripple warms itself"). Move it
  onto the registry and the warm-up. Then take the first-tap residual:
  one 35-54 ms frame among tap 1's first five, on both builds, ripple or
  not. Attribute it before fixing it.
- **K268 stage 2's three thread-reveal variants** (`arm-strip-explore`,
  `junction-field-explore`, `pluck-still-explore`; `render-shaders.md`,
  "The thread reveal's variants") go on the registry beside section-rgb's
  explore variant, in wave 1 when the thread reveal is on.
- **K290 (burn stage 3a) runs alongside you** and edits `gap_mask.ts`
  and `explore_glsl.ts`; it may add programs or variants. Touch those
  two files only where a factory export needs it. If K290 lands first,
  the coordinator asks you to rebase; register its programs then.
  Otherwise they are a follow-up for your report.
- **main.ts: the gate only.** K5 stage M1 (main.ts split into
  `scene_ref.ts`, `src/ui/loader.ts`, `stamp.ts` and `probe_hooks.ts`)
  may run alongside you. Keep your main.ts edits to 8.'s list (the
  early start, the two gates, the background hold, the loader rule),
  each a few calls into `shader_warmup.ts`, where everything else
  lives. Whichever stage lands second rebases.
- **Stage 1's harness** is untracked, in the main checkout's
  `.claude/probes/K307/`. Copy what you need into your worktree's
  `.claude/probes/K307/stage2/` (not `builds/`), and leave the
  originals alone.
- **No phone.** Its measures ride K156's next pass (6.).

## Stage 2 handoff (2026-10-15, the K307 stage 2 agent)

**Done** on branch `worktree-agent-a11d7ce60428b687d` (worktree
`.claude/worktrees/agent-a11d7ce60428b687d`), rebased on master 326eabb:
- `c46d152`: the registry (`src/render/program_registry.ts`: every
  program site, `PROGRAM_SITES`, the wave-1 rules), factory exports in
  the seven site files (no shader edits), the warm-up
  (`src/render/shader_warmup.ts`), the main.ts gate (8.'s list, plus
  wave 2's start and the ripple's warm after wave 1) and both test files.
- `915ec69`: the burn rule (a fire race warms the explore variants in
  wave 1).
- `9e19e15`: the warm-up links BLOCKING by default (`PARALLEL_DEFAULT`).
- `4a1e474`: the lore (`render-shaders.md`, THE WARM-UP) and its index row.

**Departures from the design:**
- **3. ships blocking, not parallel.** The parallel path works and keeps
  the trefoil turning, but in Chrome on D3D11 the programs it links never
  reach the GPU program cache on disk, only the in-memory one, so EVERY
  later load was cold: 3.0-3.5 s to first visible with the loader, where
  master's restart is visible at 0.806 s. The blocking path persists. The
  parallel code stays behind `PARALLEL_DEFAULT`; the experiments are in
  render-shaders.md, THE WARM-UP.
- **The cost, against 10.:** on a cold cache, the warm-up's single status
  read blocks the first frame (2.77 s here), and no trefoil shows during
  it: it comes up only after, at 3.41 s.
- **5. does not hold:** wave 2 runs only on the parallel path, so it is
  skipped. A program first drawn later links blocking at its first draw,
  as on master, and persists.
- **2.:** the design's "pixi-program" is the ParticleContainer's program
  (`particles`, in wave 1 in every mode). Pixi's Graphics program is not
  registered: only the private
  `renderer.renderPipes.graphics._adaptor.shader.glProgram` reaches it,
  and it costs under 45 ms cold.
- **The burn** (K290 landed after the design): a fire race puts the
  explore variants of section-rgb, arm-strip and junction-field in wave 1,
  and pluck-still-explore under reduced motion. The fire's clock is the
  distance walked, so the first burn can come at the first move.
- **K366's ripple:** its program is on the registry (`pluck-ripple`, wave
  1 when ripples are on); `PluckRipples.warm(stage)` still runs, now after
  wave 1, for its texture pool.
- **10.'s last point** (creating Pixi's GL programs in the pre-settle) is
  not done: the cache-hit links cost section-rgb 20-26 ms, arm-strip 13,
  junction-field 8.

**Verification.** Observed: the desktop (D3D11, RX 6800 XT, 2400x1350),
the daily (`?daily&phw=1`), a fresh profile per run, `trace_intro.mjs`
with `--restart` for the warm load (the same profile).

| Build | Cold: first visible | Cold: that frame's callback, then the worst after | Warm restart: first visible | Warm: first sleep |
|---|---|---|---|---|
| master 97d7c31 | 1.04 s | 2906 ms, then 2204 ms at 3.93 s | 0.806 s | 6.93 s |
| parallel path (7fa6305, c46d152 before the rebase) | 3.30-3.43 s, trefoil turning | 86-92 ms, then 84-86 ms | 3.0-3.5 s: cold again | - |
| blocking, shipped (4a1e474) | 3.69 s; frozen 0.40-3.19 s, no trefoil until 3.41 s | 65 ms, then 64 ms | 0.826 s (trefoil 0.54-0.81 s) | 6.89 s |

- Every Pixi link after the warm-up was 30 ms or less, cold and warm; no
  failures and no unregistered programs (the dev check, the probe hook).
- Also observed on the parallel path: `phw=0` visible at 3.23 s, worst
  72 ms after; cold first sleep 10.95-11.14 s (master 12.1 s); the
  instant link (`?b&am=instant&snd=none`) visible at 3.24 s (`phw=1`) and
  3.41 s (`phw=0`), with 131 ms and 212 ms frames after it, not from GL
  (gl 35-37 ms) and not attributed; knot mode visible at 3.06 s.
- Not measured on the blocking build: `phw=0`, the instant link, knot
  mode, a cold first sleep (the run stopped at 7 s), a fire link.
- `tsc` clean and the suite green (84 files, 1148 tests) at 4a1e474.
- Inferred: why Chrome keeps parallel links off the disk; the burn's
  cold cost (about 0.4-0.7 s more to first visible, from source sizes).

**Not done:**
- K366's first-tap residual: not started.
  `.claude/probes/K307/stage2/k366_firsttap.mjs` is K279's probe with
  `&phw=1`, ready.
- The phone pass (rides K156): persistence and timing on Android.
- `report()`'s `gateOpenAt` and `wave1.doneAt` are the blocking poll's
  START (0.42 s on the cold load above); `firstPollMs` carries the 2.77 s.

**What the next stage needs:**
- **The cold freeze before the trefoil.** Cheapest: let the blocking
  read wait until the trefoil is up (the pre-settle runs about 0.5 s
  anyway, so a warm load loses nothing; inferred); the trefoil then
  shows, frozen, through the read.
- **A cold load that keeps turning AND persists.** Untested idea: link
  without the extension (ANGLE compiled concurrently even then: the
  blocking wait is the longest compile, not the sum) and read the
  statuses late, once the compiles are likely done. First check whether
  a link without the extension stops `CrGpuMain` at the link or only at
  the status read. If it works, wave 2 can come back the same way.
- The merge: K7 stage 6 (the worker default), K76 2d and K5 M1 touch
  main.ts, ribbon_renderer.ts and arm_strip.ts beside this branch.
- Evidence: the worktree's `.claude/probes/K307/stage2/` (untracked:
  `trace_intro.mjs` with `--restart` and `--inject`, `run_s2.ps1`,
  batches 1-7, `runs/`). Copy it to the main checkout's
  `.claude/probes/K307/` before the worktree goes.
