---
paths:
  - "src/render/ribbon_renderer.ts"
  - "src/render/ribbon/**"
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
- **Where the freezes were** (a cold cache, master before K307 stage 2):
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
    about 25 ms. But a program linked this way reaches only the in-memory
    cache, never the one on disk, so the next visit is cold again: the
    warm-up links blocking (THE WARM-UP below).
  - Blocking: link everything before the first status read. The wall
    time is then the longest compile, not the sum: 2.9 s against 5.0 s
    in Pixi's order.
- **Build warm-up programs through the sites' own `GlProgram`s, never
  from captured text.** The batcher's source depends on the backend's
  texture units: 1820 characters on D3D11, 2972 on Vulkan.
  `GlProgram.from` caches by source. Pixi preprocesses in the
  constructor and compiles exactly `.vertex` and `.fragment`.
- **A new program site** (`GlProgram.from`, `new GlProgram`,
  `Shader.from`, a Filter, a ParticleContainer) freezes its first draw on
  a cold cache unless the warm-up knows it. Add it to
  `program_registry.ts`, with its file's count in `PROGRAM_SITES`:
  `test/render/program_registry.test.ts` scans `src/` and fails until both
  agree, and a dev build warns when Pixi links a source the registry does
  not list.
- **The pluck ripple warms itself** (K279 stage 2, 2026-10-15):
  `PluckRipples.warm(stage)`, one main.ts call once the stage is built,
  draws an empty box under a copy of the ripple filter for 3 ticks, which
  links its program and pools its screen-sized texture (render-pluck.md
  STAGE 2). Its program is now on the registry (`pluck-ripple`, wave 1
  when ripples are on), and main.ts calls `warm` once wave 1 is done
  (`warmup.afterWave1`), for the texture pool.
- **The thread reveal's variants** (K268 stage 2, 2026-10-15) are three
  more, each built lazily and linked at its first draw under the reveal:
  `arm-strip-explore` (34987 characters against arm-strip's 33023),
  `junction-field-explore` (32936 against 28482) and
  `pluck-still-explore` (23991 against 19958). They are on the registry
  beside the section's explore variant.
- **The burn's char changed two of them** (K290 stage 3a, 2026-10-15):
  the section's explore variant is 55976 characters (its fragment text
  with `kCharAt`/`kCharLook`) and `arm-strip-explore` 37011 (`kStripChar`);
  `junction-field-explore` and `pluck-still-explore` are unchanged. Both
  changed texts compile cold once. No new program site: the burn reuses
  the explore programs. But a FIRE RACE now switches every ribbon, strip
  and fan onto them at the first burnt stretch, reveal on or off
  (render-explore.md, THE BURN), so a fire link's warm-up must cover
  `section-rgb`'s explore variant, `arm-strip-explore` and
  `junction-field-explore` (likely `pluck-still-explore` too, for a still
  pluck during a burn; not checked), or the first burn freezes the screen
  while they link. Stage 2's warm-up does (THE WARM-UP, the burn rule).
- **High contrast dots changed all four** (K76 stage 2d, 2026-10-15,
  0ac54dc): the section's explore variant is 56595 characters,
  `arm-strip-explore` 37084 (only EXPLORE_VIS_GLSL's comment, through
  STRIP_EXPLORE_DECL_GLSL), `junction-field-explore` 33270 and
  `pluck-still-explore` 24325 (`kExDot` in kExploreLook); the masters are
  unchanged. Each compiles cold once; SwiftShader compiles all eight
  (`.claude/probes/K76/stage2d/dump_variants.ts`, `compile_glsl.mjs`).
  No new program site or variant (High contrast is a uniform value,
  uKExplore.x = 2), so the registry needed no entry.
- **The burn's fire grew two** (K290 stage 3b, 2026-10-15, ef7f08b):
  the section's explore variant 56595 -> 58529 characters and
  `arm-strip-explore` 37084 -> 38559 (the FRONT and SMOLDER items in
  kCharAt, kEmberLook); `junction-field-explore`, `pluck-still-explore`
  and the masters are unchanged. SwiftShader compiles all eight
  (`.claude/probes/K290/stage3b/out/variants/`, K76 stage 2d's
  `compile_glsl.mjs`), and the desktop's warm-up links the three explore
  variants in its first wave. No new program site or variant.
- **Growing a shader costs compile time.** section-rgb is the intro's
  critical path. After a large shader change, time a cold link:
  `trace_intro.mjs` on a fresh profile.

## THE WARM-UP (K307 stage 2, 2026-10-15)

- **What runs.** `startShaderWarmup` (main.ts, right after `app.init`)
  links every wave-1 program of `program_registry.ts`, reads each status
  and deletes it. Pixi's later link of the same source is a cache hit:
  section-rgb 19.9 ms, arm-strip 12.9, junction-field 8.4, the rest 3 ms or
  less. main.ts holds the hidden pre-settle, or an `am=instant` link's
  first frame, until `warmup.wave1Done` (a 15 s timeout, a link failure or
  a lost context also open it), keeps the background layer hidden until
  then, and shows the trefoil at 300 ms while it waits. Everything else
  lives in `shader_warmup.ts`; `window.__knotWarmup()` reports the waves,
  timings, relinks, failures and unregistered programs.
- **It links BLOCKING (`PARALLEL_DEFAULT = false`).** In Chrome on D3D11,
  a program linked after the page enabled `KHR_parallel_shader_compile`
  never reached the GPU program cache on DISK. On the parallel path,
  every restart on the same profile was cold (3.0-3.5 s to first visible,
  loader on), where master's restart is warm (0.806 s). With restarts on
  one profile (`trace_intro.mjs --restart`, observed): keeping the
  programs undeleted, calling useProgram after each link, waiting before
  the restart, or skipping wave 2 changed nothing. Hiding the extension
  (the blocking path) made the restart warm (0.805 s) and wrote the
  binary to the profile's `GPUCache`. Why Chrome drops them is inferred,
  not checked. The warm-up never calls `getExtension` for it, since that
  enables it on the context for every later link too.
- **The blocking path's cost:** on a cold cache, the trefoil stalls for
  the longest compile (about 2.7 s on the desktop) before the first
  visible frame (3.66 s). After it, no frame over 66 ms.
- **Wave 2** (what the intro does not draw) runs only on the parallel
  path, so it is off: those programs link blocking at their first draw,
  as on master, and persist.
- **Never make a second `new GlProgram` of a name to read its source.**
  Pixi's `setProgramName` numbers each new GlProgram of a name
  (`batch-fragment`, then `batch-fragment-2`) into its SHADER_NAME, so a
  twin's source differs and misses the cache. `GlProgram.from` returns one
  instance per source. The batcher's program comes from a throwaway
  `DefaultBatcher`: they all share one module-level shader.
- **Not covered: Pixi's Graphics program.** Only the private
  `renderer.renderPipes.graphics._adaptor.shader.glProgram` reaches it; it
  costs under 45 ms cold.
- **The burn rule.** A fire race (fabric with `fire` not off; broader than
  url_state's `fireSettingsOf` on purpose) puts the explore variants of
  section-rgb, arm-strip and junction-field in wave 1, and
  pluck-still-explore under reduced motion. The fire's clock is the
  distance walked, so the first burn can come at the first move. Inferred
  cost: about 0.4-0.7 s more to first visible on a cold cache; not
  measured.
