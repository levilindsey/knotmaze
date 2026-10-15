# K313: a loader that looks like the maze

Status: approved by Levi on 2026-10-14 at about 21:20 ("sgtm", "Trail
should be a fixed length"). It runs after K307's stage 2 (the shader
warm-up). Nothing is built yet; this document is the source for the
stage briefs.

## The request

Levi, 2026-10-14 at about 20:58, answering K302 (4) ("The hidden
pre-settle and the trefoil stay, moved into the worker"), verbatim:

> 4. Good. That reminds me, I've been wanting to generate a more interesting trefoil spinner animation that resembles our maze. I'd like it to resemble the player progressing through a trefoil-shaped maze. Additionally, I'd love to make it spin and move around such that the player position actually stays in the same place in the screen, and the trefoil threads-shape moves around in a way that animates the player's position along the threads. I think we won't be able to do this procedurally in a way that is responsive enough  to show immediately at the start when the app opens, right, so we will need to create a more efficient artifact, like a GIF or something--lmk what will look best and be responsive enough.

## The options put to him (about 21:08)

> What keeps a loader smooth isn't whether it's procedural or pre-rendered, but which thread draws it. Anything drawn on the page's main thread freezes whenever the app is busy (the settle, the shader compiles). CSS transforms (today's trefoil), a canvas drawn by a worker, video and, I believe, animated images keep moving without it. And "immediately at open" means the loader has to live inside `index.html`, so it shows before the app's 256 KB (gzipped) bundle has downloaded.
>
> - **Procedural, drawn by a tiny worker (my pick).**
>   - An inline script in `index.html` hands the loader's canvas to a small worker that draws it. It's a few KB, sharp at any screen density, and never waits on the app.
>   - It can do everything you described: threads with real over/under gaps, a trail growing behind the player, the head glyph fixed at the center, and the maze turning and sliding beneath it.
>   - The player's heading turns around twice per lap of the trefoil, so a camera locked to it spins the maze two full turns per lap on its own.
>   - It will look close to the game, but it's a 2D drawing, not the game's shaders. Fallback: today's CSS trefoil.
> - **Pre-rendered from the real game** (animated WebP or AVIF, or video).
>   - The exact look, but heavy: by my estimate about 0.5-1 MB as WebP, or 60-200 KB as AVIF or video. That's a big share of the whole app, paid on the first visit, which is exactly when a loader matters.
>   - Video also brings transparency, autoplay and seamless-loop problems.
> - **CSS only.** The smallest, and instant. It can spin and slide the maze under a fixed player, but it can't grow a trail.
>
> One unknown affects every option: a long shader compile may also stall the browser's own compositor, and then nothing animates during it. The freeze trace is checking that now.
>
> 1. Do you want the worker-drawn loader, or a pre-rendered one?
> 2. Should the trail grow over a lap and then restart, or be a fixed-length tail behind the player?

## His answers (about 21:20)

> "Procedural, drawn by a tiny worker (my pick)" Are you sure this will animate early enough? sgtm
>
> Trail should be a fixed length

## Will it animate early enough (the answer, about 21:20)

> I'm confident it starts early. Whether it keeps moving through the intro's freezes is what K307 is checking now.
>
> - **Start.** The loader's script and the worker's code sit inline in index.html. They need no download, so they run while the 256 KB bundle is still loading. Today's loader is created by main.ts, so it can't appear until the bundle has downloaded and run. A static trefoil drawn in the HTML itself covers the worker's start-up. I estimate that at a few tens of ms; it still needs measuring. With that, the very first paint already shows the loader.
> - **Through the freezes.** The worker draws off the main thread, so main.ts's parsing, generation and pre-settle can't stop it. The risk is the intro's two freezes. If one of them is the GPU compiling shaders, the screen's compositor can stall too, and then any format stalls, a GIF or a video included. K307's trace is checking exactly that. If that's the cause, K307's shader warm-up is the fix.
> - **Measuring it.** The build will measure both on the phone: the first frame after navigation, and the frames through the freezes.

## The decision

- **It lives in `index.html`.** A classic (not module) inline script
  placed after the loader's elements runs as the parser reaches it,
  before the module bundle has downloaded. It makes a `<canvas>`, calls
  `transferControlToOffscreen()`, and posts the canvas to a worker built
  from inline code through a Blob URL (a few KB). Nothing waits on the
  network.
- **A tiny worker draws it** on an OffscreenCanvas 2D context with its
  own frame loop (the worker's `requestAnimationFrame` where the browser
  has it, else a timer), so main.ts's parsing, generation, pre-settle and
  shader compiles cannot stop it.
- **A static trefoil from the first paint:** an inline SVG of the same
  maze covers the worker's start-up, so the first paint already shows the
  loader. The worker's first frame replaces it.
- **The look:** a trefoil-shaped maze path drawn as ribbons with casings
  and real over/under gaps at its three crossings (each crossing is
  passed once over and once under, alternating, as in the game); the
  head glyph (K83's design) fixed at the center of the screen; a
  FIXED-LENGTH trail behind it. A 2D drawing close to the game's look,
  not the game's shaders.
- **The camera:** the maze slides and turns beneath the head, so the
  head stays put and the maze carries the motion. Fully locked to the
  head's heading, the maze turns 720 degrees per lap; how much of the
  heading the camera follows is tuned (open points).
- **The hand-off:** main.ts fades the loader out when today's loader
  would end, stops the worker and removes the elements.
- **Fallback:** without `transferControlToOffscreen` or workers, today's
  loader (`createLoader` in `src/main.ts`) as now.

## Facts to start from

- `src/main.ts` (at 459cc11): `LOADER_DELAY_MS = 300` (line 228),
  `LOADER_MIN_MS = 400` (line 229), and `createLoader()` (line 282),
  today's trefoil, turned by CSS transforms. main.ts creates it, so it
  cannot appear until the bundle has downloaded and run. K7's stage 1
  keeps these constants in main.ts with the loader they time
  (`docs/design/K7_worker.md`, "Stage 1 handoff").
- `index.html`: its only script is the module at line 39; the body
  background is `#fafaf8`; it has no CSP meta.
- No CSP anywhere today: knotmaze has no `_headers`, levi.dev's proxy
  (`functions/knotmaze/[[path]].js` in the levi.dev repo) adds none, and
  levi.dev's `static/_headers` sets COOP/COEP for `/kittenbaticorn/*`
  only. A Blob URL worker needs no allowance; a future CSP would need
  `worker-src blob:`.
- The bundle is 820 KB, 256 KB gzipped (2026-10-14).
- The curve: the trefoil z(t) = i·e^{-it} − 2i·e^{2it}, t in [0, 2π).
  Its tangent z′(t) = e^{-it} + 4e^{2it} winds twice around 0, so the
  heading turns 720 degrees per lap.
- The head glyph: `src/render/marker_glyphs.ts` (K83: the designs, the
  fit, an SVG). The game's memory trail: `src/render/trail_paint.ts`
  (K93: the paint spans and the fade start).
- The Motion setting: `src/ui/motion.ts` (K53/K79: a viewer preference,
  `data-motion`, its storage read in try/catch).
- A build-time hook to copy: `notices/vite_plugin.ts` (K122) hooks the
  Vite build to emit `licenses.html`.

## Interactions

- **K7, the physics worker.** Call 4, approved: "The hidden pre-settle
  and the trefoil stay". `docs/design/K7_worker.md`, "5. The settle and
  wakes": the pre-settle "runs flat out in the worker behind the
  trefoil… Main is idle meanwhile, which is room for K9's shader
  warm-up" (that warm-up is K307's now). The loader's worker is a second,
  separate worker that starts before the bundle. K7's stages 1 and 4 own
  main.ts's load sequence, so the hand-off is written against whatever
  has merged.
- **K307, the intro's freezes.** Its "Compositor during freezes" check
  (with an optional OffscreenCanvas spinner of about 20 lines) says
  whether a worker-drawn canvas keeps presenting while the GPU compiles.
  If the compositor stalls, no loader of any format moves through a
  freeze, and only K307's warm-up helps; that is why K313 follows K307's
  stage 2. K307's answer (stage 1, 2026-10-14 21:39): it stalls. On
  Windows the GPU's wait for a blocking link stops every present (a
  worker-drawn spinner showed 2 frames in 2.8 s), while with the
  parallel-compile prototype the screen kept presenting at about 56
  frames a second and today's CSS trefoil turned throughout.
- **K156, the round phone pass:** stage 2's measures run in its next
  pass.
- **K53/K79, Motion:** see the open points.

## What the build measures

On the desktop in stage 1 and on the phone in stage 2, from a fresh
navigation:
- when the static trefoil first paints (the first contentful paint) and
  when the worker's first frame lands (the worker posts it on the page's
  time origin);
- the loader's frame intervals through the load, which the worker posts:
  the longest and how many exceed 50 ms, set beside main's freezes (K307's
  trace times);
- the bytes the loader adds to `index.html`, gzipped;
- against today's loader, in K156's pass: the load cells (time to first
  frame, frames over 50 ms, first sleep) must not get worse.

## Open points for the brief

1. **Shipping a tested module inline.** Write the loader as TypeScript
   under `src/loader/`: the pure geometry and timing (the curve, the
   crossings and their gaps, the camera, the trail) in a module with
   Vitest tests, the worker's draw loop, and the boot script. A small Vite
   plugin (`transformIndexHtml`) bundles the worker and the boot script
   and inlines them into `index.html`, in dev and in the build, with a
   size budget a test checks. The head glyph comes from
   `marker_glyphs.ts` through the same bundle, so it matches the game.
2. **Colors:** the background (`#fafaf8` today), the threads and
   casings, the head and the trail, from the game's defaults.
3. **The hand-off:** a cross-fade from the loader to the app's first
   frame, and when main.ts stops the worker.
4. **The 300 ms delay.** `LOADER_DELAY_MS` keeps a fast load from
   flashing a loader; Levi asked for one "immediately at the start when
   the app opens". One way to keep both: the SVG and the canvas fade in
   after a CSS animation delay, which runs on the compositor without a
   script, so a load that ends inside it never shows them.
   `LOADER_MIN_MS` (400) likewise.
5. **Reduced motion and the Motion setting:** `prefers-reduced-motion`
   and the stored Motion setting, read as `src/ui/motion.ts` reads it
   (in try/catch; a test pins the inline script's storage key to
   motion.ts's). Reduced motion shows the static trefoil, or the head
   moving with the camera still.
6. **The camera's follow:** full heading lock (720 degrees a lap)
   against a partial or smoothed follow, the lap time, the trail's
   length, and whether its tail fades like K93's trail.
7. **Does it read as a maze?** The trefoil is one closed path. A few
   dead-end stubs or a junction or two may read more like the maze than
   like a knot; show Levi both.
8. **Two workers at load:** from K7's stage 3 the pre-settle runs in
   K7's worker behind the loader. Check the loader's own cost on the
   phone (it draws a few paths a frame).

## Proposed stages

1. **Desktop**, one Opus stage: the module and its tests, the worker,
   the inline boot and the plugin, the static SVG, the hand-off, the
   fallback and reduced motion; frame sheets and a short recording for
   Levi; the desktop measures above. Lore in a new topic file (narrow
   `paths:`, a line in `render.md`'s list, a row in
   `docs/lore_index.md`).
2. **Phone**, after K307's warm-up has merged: the measures in K156's
   next pass; then tune the camera, the lap and the trail with Levi.
