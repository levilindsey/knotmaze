# Knotmaze — Procedural Celtic Knot Maze Generator

A web-based procedural generator for celtic-knot-style mazes with physics-based relaxation, interactive tugging, and maze-solving gameplay.

**Open work lives in `LEDGER.md`** (follow-ups, residuals, decisions waiting on Levi, ideas - add an item whenever something is deferred, proposed or left over; close it with the resolving commit; convention: claude-config `rules/ledger.md`). Design documents live in `docs/design/`. History and measurements live in `docs/history.md`, and subsystem lore
in path-scoped `.claude/rules/` files (see "Lore and history" at the
end).

## Overview

Three-layer architecture:
- **Layer 1 (Combinatorial):** `TangleGraph` — planar multigraph on a lattice with nodes (crossing/junction/end) and edges (thread segments). Strand tracing, checkerboard alternation, pairwise-crossing invariants.
- **Layer 2 (Geometric):** Centripetal Catmull-Rom splines through lattice points; arc-length parameterization.
- **Layer 3 (Dynamic):** Verlet-integrated particles; each strand is an independent closed chain (springs, bending, repulsion — no lattice anchors). Crossings are SLIDING BINDINGS: a fractional position along each of the two threads, re-projected each substep (true polyline-intersection targeting, nearest-point fallback) so intersections migrate along threads, coupled by a coincidence constraint, with ordering clamps preserving diagram topology. Contacts have STATIC/KINETIC friction: kinetic (coupling projected off each thread's tangent — material slides through crossings; slide + transversality active) while grabbed/agitated/moving, static (full-vector weld, crossing machinery frozen) once per-substep motion drops below a stick threshold — kinetic-only contacts wander forever (a PBD constraint standoff pumps the free tangential mode; no damping fixes it — measured via the phase probe), static-only reads as pinned when dragging. The knot is QUASI-3D: each particle carries a depth derived from the crossing diagram (over passes tent to +amp, under to −amp, over DEPTH_WINDOW 1.2 ctrl; contributions SUM, so a twist eye's midpoint cancels back to 0), and collision/repulsion treat threads as 3D capsules — required 2D separation is sqrt(margin² − dz²). Crossings therefore exempt themselves exactly where the diagram says the threads overlap, at any angle, and the width floor applies everywhere else, including inside kink loops and twist eyes (same-chain collision skip is only ±2 ctrl; KINK_MIN_SEPARATION 2.6 keeps a self-crossing's loop stocked with enough material to render; a rest-material eye ratchet, across-eye pressure and a fairing exemption hold it OPEN - see the KINK EYES entry). This replaced the circular contact-lens exemption (CONTACT_RADIUS + taper), whose radius mismatched the true overlap span (margin/sinθ) at oblique crossings — the mismatch both welded threads tangentially and fought geometry in a standing conflict (the source of the "threads bound at intersections" feel and the loop-end gap artifacts). Contacts carry GRADUATED friction (per-crossing smoothed contact speed → weld 0 while grabbed/agitated/fast, weld 1 when quiet) applied to the coupling's tangential component and to slide/transversality mobility — the dissipation channel that lets the constraint standoff freeze and the knot sleep after interaction (the lens's parasitic weld used to provide this by accident); the coupling also yields under clamp lag while threads intersect. MIN_PASS_SEPARATION (1.6) / DEPTH_WINDOW (1.4) sit in a measured constraint triangle with the 2.0 corridor pitch — see the constants' comments before touching any of the three. Slide-chase corollaries that remain load-bearing: NO perceptible deadband (a weak tug moves material ~0.006 ctrl/substep — any useful deadband is a self-sustaining stick-slip trap), JOINT per-crossing intersection targeting (per-pass targeting can lock the two passes onto different intersections of a twist eye), and EXACT grabbed chase (ease 1.0 — chase lag feeds parasitic pull through the coupling). Gentle centroid centering + a bounds-following viewport replace grid anchoring. Simplex-noise temperature agitation. THE PHYSICS WORKER (K7, `phw`, ON by default since stage 6, call F6 of 2026-10-15, though the phone's start gate missed; `.claude/rules/physics-worker.md`): the sim runs in a module Web Worker on main's frame allowances, and main draws a non-stepping MIRROR fed by transferred snapshots; `phw=0`, or a worker that cannot start, runs the same code on the main thread, bit for bit. main.ts and `src/app/` write physics only through the host (`host_seam.test.ts`).

Rendering: PixiJS v8 custom ribbon meshes with depth-based over/under casing gaps.

## Key Design Decisions

- **Pre-launch: no back-compat** (Levi, 2026-10-13: "Breaking changes are 100% fine. We are not launched. We are still iterating a LOT."). Old links, old designs and past dailies need not survive a change: change a default, range or meaning in place (no new codec version), re-freeze the pins it moves (K87, the golden dailies, the codec pins) and name what moved in the commit. This overrides the bullets below, `.claude/rules/` and `docs/` wherever they say otherwise; K132 (2026-10-14) removed the old-link and old-daily machinery. Still binding: one link builds one maze on every device within a build (K108), and the pins stay as change detectors.
- **URL-as-complete-state:** Every design fully specified by `(seed, params)` serialized in the URL. Deterministic seeded RNG throughout. COMPACT LINKS (2026-10-11, `src/ui/param_codec.ts`, whose header is the format spec): the query is ONE token, `?<seed>.<blob>`, or a bare `?<seed>` when every setting is at its default (seed base-36; blob = a base64url bitstream: version, entry count, then per changed param its index delta + value). Self-describing, so slider ranges/steps can change freely. ONE LIVE TABLE (K132, 2026-10-14): a link lists only what differs from TODAY's `PARAM_DEFAULTS`, so a default edit changes what older links mean (accepted pre-launch; no new version). A link depends on `CODEC_PARAMS`: param ORDER, codec types, enum option lists. A new param or enum option is APPENDED; a reorder, removal or type change bumps `CODEC_VERSION` (5). A link of another version, or an unreadable blob, keeps its seed, reads today's defaults and warns once. `test/ui/param_codec.test.ts` pins the table's key order literally and fails until a new `PARAM_DEFAULTS` key is appended. `key=value` links (`?s=<seed>&tw=.64...`, `?seed=...`) read today's defaults and are rewritten to the token on load; `key=value` pairs AFTER a token override it (`?<token>&am=instant`).
- **ParamField abstraction:** All generator parameters read through a `ParamField` (constant | Simplex-modulated | painted), enabling region-biome variety natively.
- **Hero relaxation:** On load, lattice paths (angular 45° zigzags) visibly settle into smooth curves. Temperature slider allows re-agitation.
- **Knot-as-instrument:** Pluck threads → waves propagate; Web Audio maps loop-length to pitch.
- **Daily maze (K20, 2026-10-12):** one maze per LOCAL calendar day (Daily #1 = 2026-10-12), the same for everyone: THE BARE URL is today's (K56; `?daily` too) / `?daily=<n>`; any other query, or a panel edit other than a playback preference, is an ordinary design. A daily's design is today's `PARAM_DEFAULTS` on a seed from the day number, plus the player's playback preferences (`ui/daily_link.ts`; nothing freezes it since K132, so a default or generation change moves every daily). Results and unfinished attempts (K47: a reload resumes; a moved maze refuses the attempt) live in localStorage (first finish official, replays separate) and share as a Wordle-style move grid. Full record: the MAZE STATS + DAILY MAZE entry in `.claude/rules/gameplay-daily.md`.

## Project Structure

```
src/
  core/
    tangle_graph.ts       # Layer 1: combinatorial structure
    lattice_grower.ts     # Lattice-based generation
    param_field.ts        # ParamField abstraction
    maze_plan.ts          # P4: combinatorial maze plan (splices/merges/stubs)
    maze_apply.ts         # P4: graph surgery realizing the plan + corner cuts
    walk_graph.ts         # P4: player-facing junction/run multigraph + Dijkstra
    shapes.ts             # Shaped lattices: analytic inside/outside masks
    section_colors.ts     # Section color schemes (per-run color table)
    reveal_plan.ts        # Appearance sequences: per-chain reveal timing
    types.ts              # Layer 1 graph types (nodes, edges, strands)
    scene_graph.ts        # K7: the pure scene build (main and the worker both run it)
  geometry/
    spline_generator.ts   # Layer 2: splines from lattice (closed + open)
  physics/
    particle_system.ts    # Layer 3: Verlet particles (+ open chains, junctions)
    forces.ts             # Springs, bending, repulsion
    sleep_gate.ts         # K63: when the sim may sleep (sim-time quiet window)
    settle_budget.ts      # K147: the in-thread load settle's per-frame budget
    physics_host.ts       # K7: the PhysicsHost seam, PhysicsCore, InThreadHost
    worker_host.ts        # K7: WorkerHost (spawn, snapshots, interpolation, fallback)
    physics_worker.ts     # K7: the module worker's entry (port + MessageChannel)
    physics_worker_core.ts # K7: everything the worker runs (Node-testable)
    mirror_system.ts      # K7: main's non-stepping copy, fed by snapshots
    snapshot.ts           # K7: the transferred snapshot's layout
    probe_dump.ts         # K7: probe dumps + hashes of the stepping state
  game/
    fabric_controller.ts  # P4: branch-point-only solve state + metrics
    maze_stats.ts         # K19: stat definitions, SolveClock, move grid
    daily_calendar.ts     # K20: local-date daily numbering (DST-proof)
    daily_store.ts        # K20: versioned localStorage records + aggregates
    daily_attempt.ts      # K47: saved attempts - record, walk fingerprint, replay
    share_text.ts         # K20: Wordle-style share text
    minotaur.ts           # K80: the real-time chase (minotaur, fixed-step clock)
    star_rating.ts        # K155: stars from walked / optimal, their explanation
    explore_view.ts       # K76 pure: the thread reveal's visibility pieces and frontiers
  render/
    ribbon_renderer.ts    # PixiJS ribbon meshes
    ribbon/               # K5: the renderer's parts (ribbon_shader, sampling); headers map each file
    ribbon_mesh.ts        # Triangle strip extrusion
    junction_field.ts     # GPU junction field: records + fan shader
    junction_routes.ts    # K81: route bands - which arms the path joins, the band's corner
    arm_strip.ts          # Per-arm material strips the fans read (K4 fan fix)
    gap_mask.ts           # Per-pixel crossing gaps: slot table + shader lib
    paint_glsl.ts         # G2 shader paint: GLSL library (section, FX, paint)
    paint_math.ts         # G2: its line-for-line CPU mirror (census reference)
    paint_model.ts        # G2: data textures (KSTATIC/KGEOM/KREVEAL/KPAINT) + uniforms
    paint_const.ts        # G2: shared numeric constants (emitted into GLSL)
    float_rows.ts         # Row-partial RGBA32F data textures + uploader
    samp_table.ts         # K8 G3-0: pure packers for the SDF data tables (SAMP, RADII, CHAIN, RANGES)
    reveal.ts             # Appearance reveal: per-sample width masks
    appear_fx.ts          # Reveal-front particles (rainbow, comet, dust, burn, roots)
    confetti.ts           # K140: finish confetti view (two ParticleContainers)
    confetti_model.ts     # K140 pure: rain + spray counts, spawn and motion
    hash2d.ts             # K154: the backgrounds' own integer hash (GLSL + JS mirror)
    web_fade.ts           # K169 pure: the gold web's 0.25 s fade-in clock
    explore_glsl.ts       # K76: the thread reveal's shader variant (VIS items, six looks)
    pluck_overlay.ts      # Render-only pluck: time-exposure strip + base collapse
    pluck_model.ts        # Pure plucked-string math (modes, envelope, lobes)
    background.ts         # K21 shader backdrop: low-res texture + blit, fog backdrop
    background_model.ts   # K21 pure: effect list, profiles, colors, drift clock
    background_shaders.ts # K21 GLSL: noise lib, six effects, blit, fog
    fabric_maze_renderer.ts # P4: what gameplay paints; markers, yarn, fog of war
    trail_paint.ts        # K93 pure: the memory trail's paint spans (split at the fade start)
    fog_arc.ts            # K99 pure: fog stations along a move's run
    marker_glyphs.ts      # K83 pure: start/finish/head icon designs, fit, SVG
    marker_mesh.ts        # K83: a marker as one quad, glyph drawn by an SDF shader
    debug_renderer.ts     # Lattice/graph debug overlay
  audio/
    knot_synth.ts         # Web Audio pluck/strum
    pitch_space.ts        # Scales; segment pitch by length bucket
    songs.ts              # Music mode's songs ({note, beats})
    snore_sfx.ts          # K325: the credit link's snore (fetch, decode, play)
  ui/
    tweakpane_panel.ts    # Control panel
    grid_align_curve.ts   # gridAlign's exponential slider curve
    url_state.ts          # URL params, defaults, link parse/write (+ key=value links)
    param_codec.ts        # Compact link token: the live codec table + bitstream
    daily_link.ts         # K20/K56: the daily's design, seeds, routing, exempt prefs
    maze_hud.ts           # K19: maze HUD + win banner (DOM)
    daily_stats_view.ts   # K20: daily stats modal
    share.ts              # K20: native share sheet / clipboard + toast
    mode_badge.ts         # K151: the mode badge (free play + its X, daily, replay, practice)
    offscreen_indicators.ts # K73: edge indicators for off-screen targets
    motion.ts             # K53/K79: the Motion setting (viewer pref, data-motion)
    head_indicator.ts     # K148 pure: the player's edge indicator (when it shows, what a tap does)
    view_clamp.ts         # K198 pure: the fit camera's pan range (clears the open panel)
    key_moves.ts          # K120: moves by direction (arrows, WASD; picker, hold)
    move_pad.ts           # K120: the touch move pad (viewer pref, same picker)
    snore_link.ts         # K325: the credit link's snore and its touch delay
    loader.ts             # K5: the loading trefoil (createLoader)
  util/
    random.ts             # Seeded RNG
    det_math.ts           # K108: engine-exact math for generation (hypot2)
  app/                    # K5: main.ts's parts (scene_ref, stamp, probe_hooks); headers map each file
  build_info.ts           # Build identity (git SHA, build time; vite defines)
  main.ts                 # Entry point
notices/                  # K122 build-time Node code (own tsconfig), not app code; lore: .claude/rules/notices.md
  credits.ts              # Tracked credits, license fallbacks, license policy
  notices.ts, page.ts     # Collect + check the bundled packages; render the page
  vite_plugin.ts          # Emits licenses.html, fails the build on an unlicensed package
test/
  core/
    lattice_grower.test.ts, maze_plan.test.ts, maze_apply.test.ts,
    walk_graph.test.ts, shapes.test.ts, section_colors.test.ts,
    reveal_plan.test.ts, maze_plan_identity.test.ts (K87 pin),
    deterministic_math.test.ts (K108: no engine-rounded math)
  util/
    det_math.test.ts (hypot2 = V8's bits, frozen)
  geometry/
    spline_generator.test.ts
  physics/
    particle_system.test.ts, byte_identity.test.ts (golden guard),
    open_chain.test.ts, junction.test.ts, maze_fabric.test.ts,
    sleep_gate.test.ts, sleep.regression.test.ts (K41 links, K63 fps),
    settle_budget.test.ts (K147), tug.test.ts (K279),
    physics_host.test.ts (K7: both hosts in lockstep, bit for bit),
    worker_host.test.ts (fake Worker: ready, fallbacks, the gate),
    snapshot.test.ts, host_seam.test.ts (main + src/app write only via the host)
  audio/
    pitch_space.test.ts, snore_sfx.test.ts (K325)
  game/
    fabric_controller.test.ts (+ K19 stats), fabric_trail.test.ts,
    maze_stats.test.ts,
    daily_calendar.test.ts (zones, DST), daily_store.test.ts (schema,
    v1 migration, attempts, prefs, corrupt/newer data, quota, no storage,
    streaks), daily_attempt.test.ts (fingerprints, save/restore, refusals),
    minotaur.test.ts (K80: lair, wander, hunt, sanctuary, catch, replay),
    star_rating.test.ts (K155: edges, catches, display, records, share),
    explore_view.test.ts (K76: pieces, frontiers, ends, growth)
  render/
    pluck_model.test.ts  # String math vs a modal sum, coverage, lobes
    background_model.test.ts  # K21 drift clock (K24 hook), colors, order
    marker_glyphs.test.ts  # K83 glyph fit (margin = stroke), shader capacity, SVG
    fog_arc.test.ts  # K99 the same stations whatever the frame split
    junction_routes.test.ts  # K81 which arms a route joins, the band's corner and fit
    confetti_model.test.ts  # K140 counts, screen scale, reduced motion, falls out
    hash2d.test.ts  # K154 avalanche, uniformity, correlation, bijection, shader text
    web_fade.test.ts  # K169 the fade's levels at 0 / 0.12 / 0.25 s, retarget rules
    trail_paint.test.ts  # K93 the split at several trail lengths, the ideal fade, the eps skip
    paint_explore.test.ts  # K76 kExploreAt vs pieceVis, the four anchors, master's text untouched
    samp_table.test.ts  # K8 G3-0 packing, neighbours, RANGES = idScratch on real-scene fixtures
    paint_math / paint_fx / paint_section / paint_gameplay .test.ts  # G2
      mirror vs frozen pre-G2 code (fixtures/), exact skips, parity
  ui/
    param_codec.test.ts (the table pin + format),
    url_codec.test.ts (links, key=value forms), appear_mode.test.ts,
    seed_text.test.ts, grid_align_curve.test.ts,
    daily_link.test.ts (the daily's design, seeds, golden dailies, links,
    the front door, the exempt set, prefs)
    mode_badge.test.ts, offscreen_indicators.test.ts (edge layout,
    chrome avoidance), motion.test.ts (prefs, live follow, storage
    failures), head_indicator.test.ts (K148), view_clamp.test.ts (K198),
    key_moves.test.ts (K120: picker, ties, holds, guards),
    move_pad.test.ts (pref, arms), snore_link.test.ts (K325: the delay rule)
  notices/
    notices.test.ts (K122: collector, license policy, page, the real build)
  quiescence.regression.test.ts  # Guards the friction dissipation channel
  sweep.manual.test.ts           # Skip-gated; run via SWEEP=1
```

## Running Locally

```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm test         # Vitest
```

Phone and build A/Bs: `pwsh scripts/phone.ps1 [-Wireless] [-Ports 5173,5174] [-Url <link>]` tunnels the phone (USB, or over Tailscale after one `-Wireless` run while plugged in, until it reboots) to local servers and Chrome DevTools (probes in `.claude/probes/`, e.g. `phone_probe.mjs`); `pwsh scripts/preview.ps1 -Port <p> [-Ref <commit>]` builds any commit into its own directory and serves it.

## Commit Policy

Work lands directly on `master` (the GitHub default and only branch; there is no `main`). All changes must be end-to-end working before committing; no partial or broken work. Every push to `master` deploys (except one touching only the ledger, docs, `.claude/`, README or LICENSE): `.github/workflows/deploy.yml` runs `npm test` then publishes `dist` to Cloudflare Pages - a red suite leaves the previous deployment live. The code is all rights reserved (`LICENSE`, K117). The canonical URL is https://levi.dev/knotmaze/: levi.dev's Pages Function (`functions/knotmaze/[[path]].js` in the levi.dev repo, 2026-10-11) proxies it to https://knotmaze.pages.dev, so the address bar stays on levi.dev; `/knots` and its aliases 301 there with the query kept. That is why the Vite base is RELATIVE ("./") - absolute asset paths would load levi.dev's own files. Proxied non-HTML files get a 4-hour browser cache on levi.dev (hashed assets are unaffected; the HTML stays max-age=0), and Cloudflare injects levi.dev's Web Analytics beacon. Never run `wrangler pages project create` (or other project-scaffolding wrangler commands) inside this repo: it rewrites package.json, the lockfile and .gitignore and adds wrangler/vite configs.

## Versioning

`package.json` `version` is `0.<roadmap phase>.0` (P4 = 0.4.0): bump the
minor at a phase transition, 1.0.0 at public launch - nothing else bumps
it. The BUILD identity is derived, never hand-edited: `vite.config.ts`
defines the git short SHA (`+` = built with uncommitted changes to
tracked files) and the UTC build time, read through `src/build_info.ts`.
The panel header shows `v<version> · <sha>`; `BUILD_STAMP` (main.ts) is
built from the same values and keeps a leading phase tag (`P4`) because
`scripts/diag_screenshot.mjs` finds the stamp by `/^P\d/` - bump that
tag together with the version.

## Notes

- Phased roadmap: P0 (scaffold) → P1 (combinatorial) → P2 (beauty + live physics) → P3 (touch + audio) → P4 (maze mode) → P5 (growth animation) → P6 (flourishes).
- Each phase ships as a working demo starting from P2.

## Roadmap status — what's next (updated 2026-10-10, after P4 Stage 25)

**P0–P3 done** (their saga lives in the Follow-ups of `docs/history.md`;
the bounded post-VIOLENT-play loud attractor at fat params remains the
one open residual from P3 — a rare bistable non-sleep, not a blocker).

**P4 — maze mode: the branching maze is BUILT and PLAYABLE.** The maze
rearchitecture shipped as Stages 0–8 (commits `80fbb06..68032d4`,
2026-07-28 → 2026-10-09; each stage commit message is the detailed
record). Core insight, learned over three wrong iterations, still
binding: **the threads ARE the maze paths** — never reintroduce a
between-threads/cell-passage route.

- Knot mode is guarded BYTE-IDENTICAL by the golden snapshot
  (`test/physics/byte_identity.test.ts`) — keep it green.
- The stage-by-stage record (Stages 0–26 and the dated rounds since)
  is in `docs/history.md`; open P4 work is in `LEDGER.md`.

**Architecture audit (2026-10-10, agent-measured; full report was
delivered in-session).** Verdict: the stack (typed-array CPU PBD +
pixi WebGL mesh rendering + palette-texture recolor) is the right one
at this scale; CSS/DOM are chrome-only, SVG absent, canvas2d/WebGPU/
WASM-threads remain ruled out. Measured: knot-mode rest 94.5% idle;
mid-drag fat URL phys ~12ms / render ~10.5ms / 40fps (at or better
than P3.42 baselines); collision narrow-phase = 40.3% of drag CPU;
tickPaint + fillet refill 1.6-1.7ms. Perf levers, in order, each with
its trigger: (1) the sleep fix (DONE above); (2) flow-at-rest cost
(half-rate DONE; the full fix if flow is a keeper = shader
displacement, needs a gap-tracking visual A/B); (3) nothing else
until mid-drag fps bothers on target hardware — then worker+SAB per
the recorded plan, then WASM collision narrow-phase (2-4x on the ~40%
slice); never color the Gauss-Seidel solver. Micro: hypot→sqrt in
sampleAt/evalSegment/RibbonMesh.update (est 1-2ms), optional
ticker-stop when fully asleep.

**P5 — growth animation** (animate the knot being drawn/growing) and
**P6 — flourishes** (polish) remain untouched after P4.

## Verification rule (hard-won)

**Never use Chrome's `--virtual-time-budget` to screenshot anything
physics-dependent.** Virtual-time mode advances the sim only a fraction of
the nominal budget (~0.5 sim-seconds for a 12s budget), so screenshots show
an early mid-settle state, not equilibrium — an entire debugging session
chased "fixed" artifacts that only existed at true equilibrium. Use
`node scripts/diag_screenshot.mjs <url> <out.png> [settleMs]` instead: it
drives a headed, hardware-GPU Chrome in real time and reports the page's
build stamp, the `sim/wall` seconds (the on-page bottom-left stamp's
counters; since K147 sim trails wall while the knot settles, see
`probes.md`) and the frame rate (a ~1000 ms median frame = a throttled,
mid-settle capture).

## Lore and history: where things live

Subsystem lore loads on demand. Each `.claude/rules/*.md` file has a
`paths:` list, and Claude Code attaches the file when a session reads or
edits a matching file; open a rules file directly to read it otherwise.
An area's general file (`physics.md`, `render.md`, `generation.md`,
`gameplay.md`, `probes.md`) lists its topic files (`<area>-<topic>.md`,
K173), each attaching only with the files it is about;
`docs/lore_index.md` maps every rules file to its paths. New lore goes
to its topic file (a new one needs narrow `paths:`, a line in its area's
list and a row in the index), new history to `docs/history.md` or the
commit message, not to this file (claude-config
`rules/context-budget.md`). Read `probes.md` before probing: a bare URL
is today's daily (intro, saved attempt), not a fresh design.
`docs/history.md` is never imported: Stages 0–26, the dated rounds, the
old "Still open in P4" list and the P3 saga (Follow-ups), verbatim; a
bracketed note marks each passage that moved to a rules file.
