# K318: win effects, one show in many themes

Status: Levi answered on 2026-10-14 at 22:32 and 22:40: build all
thirteen themes and every layer as prototypes, each behind panel rows,
with the runner replaying the whole walk; the order and the default are
the coordinator's pick ("Levi's answers", "Decisions" and "Build stages"
at the end). Nothing is built yet. The confetti half of Levi's first
message shipped separately as K317 (ab8b78f).

## The request

Levi, 2026-10-14 at 21:37 PDT, verbatim:

> We should show more confetti by default, both from the top, but especially from the finish marker.
>
> Also, I want to add some gratuitous effect along the entire length of the path traveled. Please give me ideas for this. Also, give me other ideas for general gratuitous celebratory effects. Possible idea for the path traveled effect could be a single rippling pulse thing perpendicularly outward in the background from all threads along the path, as well as some sort of glow/highlight pulse within the thread, as well as an animated rainbow sparkle blast/burst that shoots out of the start and travels along the traveled path to the end, at which point it blasts more glitter out from the finish marker. Also, I wonder if we can use our physics sim here to mimic an object with momentum pushing against all curves along the path, displacing threads outward from the curve, with more force against tighter curves. And also, slowing the speed of the glitter burst/heavy physics impulse thing around curves would probably make sense. But give me other ideas too.

At 21:38 PDT:

> We could probably support multiple options for gratuitous game-win effects. Like a blazing fire effect along the path, and fire blasting from the finish marker, and fireworks around other places.
>
> Again, please think of a bunch of ideas, and themes

## One show, many themes

Every theme plays the same show; a theme supplies only its looks and
sounds.

- **The runner.** At the finish, a runner leaves the start and replays
  the walk to the finish: the whole walk, detours included (Levi,
  22:40), in a few seconds that grow with the walk, up to a cap.
- **Momentum.** It brakes into tight curves and speeds out of them, as
  Levi suggested. Its speed follows a race car's speed plan: capped by
  the route's curvature, v_max(s) = sqrt(a_lat / kappa(s)), then a
  forward pass that limits acceleration and a backward pass that limits
  braking, and the whole profile scaled so the run takes the target
  time.
- **The lit path.** A glow band rides inside the ribbon at the runner,
  and the path behind it stays lit in the theme's colors.
- **Junction pops.** Each junction it passes pops a small effect.
- **The finish blast** when it arrives. Today's spray from the finish
  marker moves to this moment.
- **Ambient effects** elsewhere on the screen; today's confetti rain is
  one.
- **The world reacts:** the background, the physics, sound, the camera
  and haptics.
- **The setting:** one theme, or "random each win". A viewer preference
  like Motion, exempt from the daily (`src/ui/daily_link.ts`'s exempt
  set).

## Themes

| Theme | Along the path | At the finish | Elsewhere |
|---|---|---|---|
| Party (today's, upgraded) | A rainbow glitter comet; the thread flashes rainbow behind it | A confetti cannon and streamers | Rain from the top, balloons |
| Inferno (Levi's) | A lit fuse races the route; flames lick up behind it and leave embers and char (the burn race's fire and char, K290) | A fire blast or a fireball column with heat shimmer | Embers and ash drifting up; the background turns to dusk; local heat agitation in the physics |
| Fireworks (Levi's) | A sparkler fizzes along the route; each junction launches a rocket | The finale: one shell bursting in a trefoil or knot shape | Bursts around the edges; the background goes to night; the flashes light the threads |
| Storm | A lightning bolt hugs the route and forks into the dead ends; arcs jump at tight curves | A Tesla discharge to the screen's edges and a flash | Clouds, sheet lightning, thunder |
| Water | A droplet slides the route and leaves a boat's V-wake in the background | A splash crown and a fountain | Rain rings on a pond, caustics; water plinks |
| Cosmos | A comet with a stardust tail; the junctions become stars and the route a constellation | A supernova that swirls everything into a spiral galaxy | Shooting stars, a starfield |
| Garden | Vines grow along the route (appear_fx's roots); flowers open at the junctions | A big bloom | Petals, butterflies, fireflies |
| Frost | Frost crystals spread; the thread turns to ice and glints | An ice burst shattering into snowflakes | Snow instead of confetti; frost creeping in from the screen's edges |
| Gold | A gleam sweeps the route and gilds it | A coin fountain, god rays | Gold dust; perhaps reserved for a perfect route |
| Neon | Tubes buzz on one by one; a light-cycle runner | A neon "SOLVED" sign, lasers | A synthwave grid |
| Ink | A brush paints the route in bleeding ink | An ink splash and a red seal stamped with the daily's number | Ink drops blooming |
| Dragon | A dragon or serpent slithers the route | It breathes fire that bursts into fireworks | |
| Celtic | The route's over/under crossings flash in order | Knotwork blooms | Small knots burst like fireworks |

## Layers for any theme

- **The path's song.** Each run plucks as the runner enters it, pitched
  by its length as music mode does, and visibly vibrates through the
  pluck overlay; the finish strums the whole maze.
- **The physics push** (Levi's): a heavy object with momentum pushes
  outward against each curve as the runner passes, with a force
  proportional to speed squared times curvature (the centrifugal
  force), so tighter curves bulge more. Built as a `PhysicsHost`
  command, so it works in K7's worker; best after K7's stage 3.
- **Partial braking** (added 2026-10-14 22:02): a runner that brakes all
  the way to the curvature cap, v = sqrt(a_lat / kappa), pushes v^2 kappa
  = a_lat at every curve, so tight curves would not bulge more. Braking
  only partway, with speed proportional to kappa^(-1/4), keeps the push
  growing as sqrt(kappa).
- **The background wake** (Levi's ripple): a ripple runs out
  perpendicular to the route. Emitted all at once it is one band;
  emitted as the runner passes, it forms a boat's V-wake. It needs the
  distance to the route at the background's low resolution, with the
  time the runner passed the nearest point: jump flooding on the GPU, or
  a CPU field built once per win.
- **A shockwave:** a ring from the finish that warps the background and
  nudges the threads.
- **The dead ends fall away:** they dim, burn or crumble for a moment,
  then return.
- **An instant replay:** a ghost replays the whole walk at 10x.
- **A victory-lap camera:** it rides the runner, then pulls back.
- **Glitter that sticks:** sparkles ride the threads; confetti snags on
  them.
- **Bullet time:** a brief slow motion at the blast.
- **Haptics** on Android.
- **Stars scale the show (K155):** a perfect route upgrades it, e.g. to
  Gold.
- **The move grid in sync:** the HUD's move-grid tiles light as the
  runner passes each move.
- **The minotaur (K80)** is knocked tumbling, or bursts into confetti.
- **Streak milestones** get a bigger show.
- **A wave by walk distance** (added 2026-10-14 22:02): a pulse spreads
  through the whole maze from the finish, timed by each sample's walk
  distance from it.
- **A postcard** (added 2026-10-14 22:02): an image of the solved maze
  with the route lit, attached to the share sheet.

## Where it plugs in

| Piece | Builds on |
|---|---|
| The trigger | `showFabricWin` in `src/main.ts`, which ends with `throwConfetti()` (every banner: dailies, free play, replays, the real-time mode, a reload that restores a solved attempt; `render-confetti.md`, "WHEN") |
| The route and where the runner is | `src/game/fabric_controller.ts` (the walk), `src/game/walk_graph.ts` (runs, junctions, Dijkstra); stations along a run as in `src/render/fog_arc.ts` (K99) |
| The glow band and the lit path | the paint shader (G2: `src/render/paint_glsl.ts`, `paint_math.ts`, `paint_model.ts`; its pulses and K299's ring laps in `render-paint.md`), the memory trail's spans (`src/render/trail_paint.ts`, K93), the route bands at junctions (`src/render/junction_routes.ts`, K81) |
| The runner's particles | the reveal-front emitters in `src/render/appear_fx.ts` (rainbow, comet, dust, burn, roots) |
| Inferno's fire and char | the burn race's fire and its burnt looks (K290) |
| Blasts, rain, coins, petals, snow | the confetti's page-lifetime pools (`src/render/confetti.ts`, `confetti_model.ts`, K140) |
| Dusk, night, the wake, the shockwave | the shader backgrounds (`src/render/background.ts`, `background_model.ts`, `background_shaders.ts`, K21) |
| The song | `src/audio/knot_synth.ts`, `src/audio/pitch_space.ts` (pitch by length bucket), music mode |
| The vibration | `src/render/pluck_overlay.ts`, `pluck_model.ts` (K77, K104, K180, K279) |
| The physics push | `src/physics/particle_system.ts`, `forces.ts`, through K7's `PhysicsHost` |
| The finish and the runner's glyph | `src/render/marker_glyphs.ts`, `marker_mesh.ts` (K83) |
| Stars, the move grid, the minotaur | `src/game/star_rating.ts` (K155), `src/game/maze_stats.ts` and `src/ui/maze_hud.ts` (K19), `src/game/minotaur.ts` (K80) |
| Reduced motion | `src/ui/motion.ts` (K53, K79) |

## Constraints

- **Shader compiles (K307).** A program's first link blocks the page,
  and on Windows the GPU's wait stops every present, so a cold compile
  at the finish would freeze the win itself. Every new custom program
  joins K307's warm-up (its wave 2). Effects drawn with programs the
  game already has (the confetti's particle program, sprites, the
  existing paint and background programs) add no compile.
- **Reduced motion** keeps the glow and the sound and drops camera
  moves, flashes, shakes and full-screen effects, as the confetti drops
  its rain (`render-confetti.md`).
- **The phone.** Each theme gets a frame-rate check at the finish on
  the Pixel 11 (K156's pass).
- **Nothing recorded depends on it.** The show starts after the finish
  is recorded; attempts, the move grid, stars and the share text never
  read it. The physics push wakes the knot after the solve, and it must
  settle and sleep again (the sleep gate, K63).
- **Input (proposed).** A tap or a key skips the show; the banner's
  buttons work throughout.
- **Which wins play it** is an open point for the brief: a reload that
  restores a solved attempt probably shows only the lit path.

## Levi's answers (2026-10-14, verbatim)

At 22:32, under the ideas message's lines:

> > Win effects (K318). Your ideas fit one shared show that each theme reskins:
>
> Great
>
> > Themes (along the path → at the finish → elsewhere):
>
> I kinda want to prototype all of these.
> Again, dropdown params for all these, and please add appropriate conditionally-visible dependent params for each.

At 22:40:

> > Layers that work with any theme:
>
> Let's implement all these too, again with param controls.
>
> > Win effects: which themes should I build first? And should the default be one theme, or a random one each win?
>
> You pick.
>
> > Should the runner follow your route with its loops cut out (short and clean, my pick, with the dead ends you explored flashing as it passes them)? Or replay your whole walk with its detours?
>
> The whole thing.

## Decisions

- **Everything gets built**, as prototypes: the thirteen themes and
  every layer above, each behind panel rows.
- **A "Win effects" folder** in the panel:
  - **Theme:** a dropdown of the thirteen, plus "Random each win". The
    default is Party (the coordinator's pick); Random is worth trying as
    the default once more themes exist.
  - **Each theme's own rows** (its colors, densities, sizes, speeds),
    shown only while that theme is picked.
  - **Each layer:** an on/off, or a dropdown of its looks, with its own
    rows shown only while it is on.
  - **Route:** the runner replays the whole walk, detours included
    (Levi's answer). "The route, loops cut" stays as the dropdown's other
    option.
  - **Length:** the show's duration grows with the walk, up to a cap (a
    row), so a long walk doesn't blur past.
  - Every row is a viewer preference: appended to the codec and exempt
    from the daily (`DAILY_EXEMPT_KEYS`), like the confetti's `cf` and
    `cfa`.
- **The conditional rows** use one mechanism, shared with K323's Game
  folder and the confetti stage's rows (K335-K337); whichever lands
  first defines it.
- **The instant replay** folds into the runner: since the runner replays
  the whole walk, that layer becomes one of the runner's looks (the
  player's own head marker and trail, at speed).
- **Theme order** (the coordinator's pick): Party; then Levi's two,
  Inferno and Fireworks, with Storm; then Water, Cosmos and Garden;
  Frost, Gold and Neon; Ink, Dragon and Celtic.

## Build stages

One at a time, since codec appends and panel rows collide. Each theme
and layer lives in its own module where it can. Every new GPU program
joins K307's warm-up (its wave 2), and every stage ends with frame
sheets for Levi.

1. **The show and Party:** the runner over the whole walk (and the
   loops-cut option); the speed plan with partial braking (a row for the
   braking strength); the glow band and the lit path; the junction pops;
   the finish blast; the Win effects folder with the Theme dropdown
   (Random included) and the conditional-row mechanism. It runs after
   the confetti stage (K335-K337, whose cannons and streamers Party
   fires) and after K111 stage 5 (both it and this stage edit the paint
   shader).
2. **Inferno, Fireworks and Storm**, with the dusk and night
   backgrounds.
3. **Layers I:** the path's song, the move grid in sync, haptics, bullet
   time, stars scale the show (K155), streak milestones.
4. **Water, Cosmos and Garden.**
5. **Layers II:** the shockwave, the wave by walk distance, the dead ends
   fall away, glitter that sticks.
6. **Frost, Gold and Neon.**
7. **Layers III:** the victory-lap camera, the minotaur knocked
   tumbling, the replay look.
8. **Ink, Dragon and Celtic.**
9. **The background wake** (the walk's distance field).
10. **The postcard** (an image for the share sheet).
11. **The physics push**, after K7 stage 3.
12. **The phone:** every theme's and layer's frame rate at the finish
    (K156's pass).
