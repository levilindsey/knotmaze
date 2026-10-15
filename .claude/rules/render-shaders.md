---
paths:
  - "src/render/ribbon_renderer.ts"
  - "src/render/paint_glsl.ts"
  - "src/render/explore_glsl.ts"
  - "src/render/arm_strip.ts"
  - "src/render/junction_field.ts"
  - "src/render/background.ts"
  - "src/render/background_shaders.ts"
  - "src/render/marker_mesh.ts"
  - "src/render/pluck_overlay.ts"
  - "src/render/pluck_ripple.ts"
  - "src/render/shader_warmup.ts"
  - "src/render/program_registry.ts"
  - "test/render/program_registry.test.ts"
  - "test/render/shader_warmup.test.ts"
---

# Render lore: shader compiles (K307)

Measured by K307 stage 1 (2026-10-14). The brief and every number are in
`docs/design/K307_intro_freezes.md`; the harness is in `probes.md`.

## SHADER COMPILES FREEZE THE SCREEN (K307)

- **The cost is FXC.** On Windows Chrome the default backend is ANGLE on
  D3D11. There, a program's cold cost is `D3DCompile` compiling its
  fragment shader, and it grows with the source. On the desktop (RX 6800
  XT):
  - section-rgb, 46850 characters: 2.8 s;
  - arm-strip, 32668: 1.7 s;
  - junction-field, 28585: 0.4 s;
  - bg-vellum: 0.19 s;
  - every other program: under 45 ms.
- **Pixi links at a program's first draw** and reads LINK_STATUS at once
  (`generateProgram`), so main waits out the whole compile.
- **The whole screen stops, not just the page.** The GPU process's main
  thread (`CrGpuMain`) waits as well (`Program::MainLinkLoadEvent::wait`),
  and on Windows every present (`DCompPresenter::Present`) runs on that
  thread. Nothing reaches the screen during the wait: not the CSS
  trefoil, not a compositor animation, and not a 2D spinner on an
  OffscreenCanvas in a worker (its requestAnimationFrame stops too). A
  busy renderer main thread alone does not stop presents; a 213 ms JS
  task kept them at 56/s.
- **Where the freezes are today** (a cold cache, until K307 stage 2):
  - the daily's intro: bg-vellum in the hidden pre-settle (0.28 s);
    section-rgb, pluck-blur, knot-marker and batch at the first visible
    frame (2.9 s); arm-strip, junction-field and the particles when the
    reveal reaches the first junction (2.2 s);
  - an `am=instant` link: one first frame of 3.1-5.4 s.
- **The cache.** Chrome's GPU program cache lives in the profile, is keyed
  by source, and survives a restart. Warm, every link costs 25 ms or less
  and a returning player sees no freeze. Any change to a shader's text
  (a paint_glsl.ts edit, a define, a constant emitted into GLSL) makes
  that program cold again, once, for every player. Inferred: a Chrome or
  driver update empties the cache.
- **Warming up.**
  - Parallel: link everything, then poll `COMPLETION_STATUS_KHR`
    (`KHR_parallel_shader_compile`) once a frame. Neither main thread
    waits, and presents go on at about 56/s. D3D11 exposes it; desktop
    Vulkan does not. A warm-up program that is deleted after it links
    still warms the cache: Pixi's later link of the same source took
    about 25 ms.
  - Blocking: link everything before the first status read. The wall
    time is then the longest compile, not the sum: 2.9 s against 5.0 s
    in Pixi's order.
- **Build warm-up programs through the sites' own `GlProgram`s, never
  from captured text.** The batcher's source depends on the backend's
  texture units: 1820 characters on D3D11, 2972 on Vulkan.
  `GlProgram.from` caches by source. Pixi preprocesses in the
  constructor and compiles exactly `.vertex` and `.fragment`.
- **A new program site** (`GlProgram.from`, `Shader.from`, a Filter, a
  ParticleContainer) freezes its first draw on a cold cache. Once stage 2
  lands it must go on the warm-up registry.
- **The pluck ripple warms itself** (K279 stage 2, 2026-10-15):
  `PluckRipples.warm(stage)`, one main.ts call once the stage is built,
  draws an empty box under a copy of the ripple filter for 3 ticks, which
  links its program and pools its screen-sized texture (render-pluck.md
  STAGE 2). Move it onto the registry when that lands.
- **The thread reveal's variants** (K268 stage 2, 2026-10-15) are three
  more, each built lazily and linked at its first draw under the reveal:
  `arm-strip-explore` (34987 characters against arm-strip's 33023),
  `junction-field-explore` (32936 against 28482) and
  `pluck-still-explore` (23991 against 19958). They go on the registry
  beside the section's explore variant.
- **Growing a shader costs compile time.** section-rgb is the intro's
  critical path. After a large shader change, time a cold link:
  `trace_intro.mjs` on a fresh profile.
