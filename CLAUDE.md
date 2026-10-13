# Knotmaze — Procedural Celtic Knot Maze Generator

A web-based procedural generator for celtic-knot-style mazes with physics-based relaxation, interactive tugging, and maze-solving gameplay.

**Open work lives in `LEDGER.md`** (follow-ups, residuals, decisions waiting on Levi, ideas - add an item whenever something is deferred, proposed or left over; close it with the resolving commit; convention: claude-config `rules/ledger.md`). Design documents live in `docs/design/`. This file keeps history, measurements and lore.

## Overview

Three-layer architecture:
- **Layer 1 (Combinatorial):** `TangleGraph` — planar multigraph on a lattice with nodes (crossing/junction/end) and edges (thread segments). Strand tracing, checkerboard alternation, pairwise-crossing invariants.
- **Layer 2 (Geometric):** Centripetal Catmull-Rom splines through lattice points; arc-length parameterization.
- **Layer 3 (Dynamic):** Verlet-integrated particles; each strand is an independent closed chain (springs, bending, repulsion — no lattice anchors). Crossings are SLIDING BINDINGS: a fractional position along each of the two threads, re-projected each substep (true polyline-intersection targeting, nearest-point fallback) so intersections migrate along threads, coupled by a coincidence constraint, with ordering clamps preserving diagram topology. Contacts have STATIC/KINETIC friction: kinetic (coupling projected off each thread's tangent — material slides through crossings; slide + transversality active) while grabbed/agitated/moving, static (full-vector weld, crossing machinery frozen) once per-substep motion drops below a stick threshold — kinetic-only contacts wander forever (a PBD constraint standoff pumps the free tangential mode; no damping fixes it — measured via the phase probe), static-only reads as pinned when dragging. The knot is QUASI-3D: each particle carries a depth derived from the crossing diagram (over passes tent to +amp, under to −amp, over DEPTH_WINDOW 1.2 ctrl; contributions SUM, so a twist eye's midpoint cancels back to 0), and collision/repulsion treat threads as 3D capsules — required 2D separation is sqrt(margin² − dz²). Crossings therefore exempt themselves exactly where the diagram says the threads overlap, at any angle, and the width floor applies everywhere else, including inside kink loops and twist eyes (same-chain collision skip is only ±2 ctrl; KINK_MIN_SEPARATION 2.6 keeps a self-crossing's loop stocked with enough material to render; a rest-material eye ratchet, across-eye pressure and a fairing exemption hold it OPEN - see the KINK EYES entry). This replaced the circular contact-lens exemption (CONTACT_RADIUS + taper), whose radius mismatched the true overlap span (margin/sinθ) at oblique crossings — the mismatch both welded threads tangentially and fought geometry in a standing conflict (the source of the "threads bound at intersections" feel and the loop-end gap artifacts). Contacts carry GRADUATED friction (per-crossing smoothed contact speed → weld 0 while grabbed/agitated/fast, weld 1 when quiet) applied to the coupling's tangential component and to slide/transversality mobility — the dissipation channel that lets the constraint standoff freeze and the knot sleep after interaction (the lens's parasitic weld used to provide this by accident); the coupling also yields under clamp lag while threads intersect. MIN_PASS_SEPARATION (1.6) / DEPTH_WINDOW (1.4) sit in a measured constraint triangle with the 2.0 corridor pitch — see the constants' comments before touching any of the three. Slide-chase corollaries that remain load-bearing: NO perceptible deadband (a weak tug moves material ~0.006 ctrl/substep — any useful deadband is a self-sustaining stick-slip trap), JOINT per-crossing intersection targeting (per-pass targeting can lock the two passes onto different intersections of a twist eye), and EXACT grabbed chase (ease 1.0 — chase lag feeds parasitic pull through the coupling). Gentle centroid centering + a bounds-following viewport replace grid anchoring. Simplex-noise temperature agitation.

Rendering: PixiJS v8 custom ribbon meshes with depth-based over/under casing gaps.

## Key Design Decisions

- **URL-as-complete-state:** Every design fully specified by `(seed, params)` serialized in the URL. Deterministic seeded RNG throughout. COMPACT LINKS (2026-10-11, `src/ui/param_codec.ts`): the query is ONE token - `?<seed>.<blob>` (a bare `?<seed>` is a v1 all-default link; since v2 every new link names its version, so an all-default design is `?<seed>.c` under v3 (`.U` was v2)) (seed base-36; blob = base64url bitstream: version, entry count, then per changed param its index delta + value - booleans flip in 0 bits, enums as an option index, colors 24 bits, numbers as their 6-decimal shortest text in 4-bit codes; all counts Elias-gamma). Self-describing, so slider ranges/steps can change freely. What a link DOES depend on is the frozen codec table of its version: param ORDER, codec types, enum option lists, DEFAULTS (links list only what differs, after 6-decimal rounding; an appearMode preset/random/instant implies the three appearance values). A new param or enum option is APPENDED to the current table; anything else (a default change included) = a new codec version, old tables kept for decoding. `test/ui/param_codec.test.ts` pins `CODEC_V1` literally (frozen) and `CODEC_V2` as v1 + its one edit, and fails until a new `PARAM_DEFAULTS` key is appended to the current table. VERSIONS: v1 (the first table); v2 (2026-10-11) = junctionBlend default 0 -> 0.88, plus the appended pluck/physics params; v3 (2026-10-11) = pluckSize default 1 -> 1.75, plus the appended maze-plan knobs entranceClearance / exitClearance / junctionSpacing (2026-10-12; defaults = DEFAULT_MAZE_PARAMS), then background / backgroundIntensity (K21, 2026-10-12). DELTA BLOBS (2026-10-12, `encodeDelta`/`decodeDelta`): the same bitstream measured against a BASE design instead of the table defaults (a listed boolean is base's flipped) - K20's `?daily=<n>.<delta>` links (only read since K56). Legacy links still parse and are rewritten to the token on load: `?s=<seed>&tw=.64...` short links and `?seed=...` full links (legacy keys mc/trm), both read with the v1 defaults; legacy `key=value` pairs AFTER a token override it (`?<token>&am=instant`). Unreadable blobs keep the seed, default the rest, warn once.
- **ParamField abstraction:** All generator parameters read through a `ParamField` (constant | Simplex-modulated | painted), enabling region-biome variety natively.
- **Hero relaxation:** On load, lattice paths (angular 45° zigzags) visibly settle into smooth curves. Temperature slider allows re-agitation.
- **Knot-as-instrument:** Pluck threads → waves propagate; Web Audio maps loop-length to pitch.
- **Daily maze (K20, 2026-10-12):** one maze per LOCAL calendar day (Daily #1 = 2026-10-12), the same for everyone: THE BARE URL is today's (K56; `?daily` too) / `?daily=<n>`; any other query, or a panel edit other than a playback preference, is an ordinary design. A daily's design is PINNED by a frozen, versioned daily definition (`ui/daily_link.ts` DAILY_V1 = codec v3's defaults + a seed from the day number), never by today's PARAM_DEFAULTS. Results and unfinished attempts (K47: a reload resumes) live in localStorage (first finish official, replays separate) and share as a Wordle-style move grid. Full record: the MAZE STATS + DAILY MAZE entry below.

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
    maze.ts               # P4 LEGACY (md=1): single-strand maze graph
  geometry/
    spline_generator.ts   # Layer 2: splines from lattice (closed + open)
  physics/
    particle_system.ts    # Layer 3: Verlet particles (+ open chains, junctions)
    forces.ts             # Springs, bending, repulsion
  game/
    fabric_controller.ts  # P4: branch-point-only solve state + metrics
    maze_stats.ts         # K19: stat definitions, SolveClock, move grid
    daily_calendar.ts     # K20: local-date daily numbering (DST-proof)
    daily_store.ts        # K20: versioned localStorage records + aggregates
    daily_attempt.ts      # K47: saved attempts - record, walk fingerprint, replay
    share_text.ts         # K20: Wordle-style share text
    maze_controller.ts    # P4 LEGACY (md=1): single-strand solve state
  render/
    ribbon_renderer.ts    # PixiJS ribbon meshes
    ribbon_mesh.ts        # Triangle strip extrusion
    junction_field.ts     # GPU junction field: float data textures + shaders
    gap_mask.ts           # Per-pixel crossing gaps: slot table + shader lib
    pluck_overlay.ts      # Render-only pluck: time-exposure strip + base collapse
    pluck_model.ts        # Pure plucked-string math (modes, envelope, lobes)
    background.ts         # K21 shader backdrop: low-res texture + blit, fog backdrop
    background_model.ts   # K21 pure: effect list, profiles, colors, drift clock
    background_shaders.ts # K21 GLSL: noise lib, six effects, blit, fog
    fabric_maze_renderer.ts # P4: woven gold path recolor + markers + hints
    maze_renderer.ts      # P4 LEGACY (md=1): single-strand overlay
    debug_renderer.ts     # Lattice/graph debug overlay
  audio/
    knot_synth.ts         # Web Audio pluck/strum
  ui/
    tweakpane_panel.ts    # Control panel
    url_state.ts          # URL params, defaults, link parse/write (+ legacy keys)
    param_codec.ts        # Compact link token: frozen codec tables + bitstream
    daily_link.ts         # K20/K56: daily definitions, seeds, routing, exempt prefs
    maze_hud.ts           # K19: maze HUD + win banner (DOM)
    daily_stats_view.ts   # K20: daily stats modal
    share.ts              # K20: native share sheet / clipboard + toast
  main.ts                 # Entry point
test/
  core/
    lattice_grower.test.ts, maze_plan.test.ts, maze_apply.test.ts,
    walk_graph.test.ts, maze.test.ts
  geometry/
    spline_generator.test.ts
  physics/
    particle_system.test.ts, byte_identity.test.ts (golden guard),
    open_chain.test.ts, junction.test.ts, maze_fabric.test.ts
  game/
    fabric_controller.test.ts (+ K19 stats), maze_stats.test.ts,
    daily_calendar.test.ts (zones, DST), daily_store.test.ts (schema,
    v1 migration, attempts, prefs, corrupt/newer data, quota, no storage,
    streaks), daily_attempt.test.ts (fingerprints, save/restore, refusals)
  render/
    pluck_model.test.ts  # String math vs a modal sum, coverage, lobes
    background_model.test.ts  # K21 drift clock (K24 hook), colors, order
  ui/
    param_codec.test.ts (codec table pins + format + delta blobs),
    url_codec.test.ts (links, legacy forms), appear_mode.test.ts,
    daily_link.test.ts (frozen definition, seeds, golden dailies, links,
    the front door, the exempt set, prefs)
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

Work lands directly on `master` (the GitHub default and only branch; there is no `main`). All changes must be end-to-end working before committing; no partial or broken work. Every push to `master` deploys: `.github/workflows/deploy.yml` runs `npm test` then publishes `dist` to Cloudflare Pages - a red suite leaves the previous deployment live. The canonical URL is https://levi.dev/knotmaze/: levi.dev's Pages Function (`functions/knotmaze/[[path]].js` in the levi.dev repo, 2026-10-11) proxies it to https://knotmaze.pages.dev, so the address bar stays on levi.dev; `/knots` and its aliases 301 there with the query kept. That is why the Vite base is RELATIVE ("./") - absolute asset paths would load levi.dev's own files. Proxied non-HTML files get a 4-hour browser cache on levi.dev (hashed assets are unaffected; the HTML stays max-age=0), and Cloudflare injects levi.dev's Web Analytics beacon. Never run `wrangler pages project create` (or other project-scaffolding wrangler commands) inside this repo: it rewrites package.json, the lockfile and .gitignore and adds wrangler/vite configs.

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

**P0–P3 done** (their saga lives in Follow-ups; the bounded
post-VIOLENT-play loud attractor at fat params remains the one open
residual from P3 — a rare bistable non-sleep, not a blocker).

**P4 — maze mode: the branching maze is BUILT and PLAYABLE.** The maze
rearchitecture shipped as Stages 0–8 (commits `80fbb06..68032d4`,
2026-07-28 → 2026-10-09; each stage commit message is the detailed
record). Core insight, learned over three wrong iterations, still
binding: **the threads ARE the maze paths** — never reintroduce a
between-threads/cell-passage route.

- Stages 0–4 — physics generalized: open chains (`chainBreakAfter`),
  anchored ends, seam-aware crossing machinery, junction fusion. Knot
  mode is guarded BYTE-IDENTICAL by the golden snapshot
  (`test/physics/byte_identity.test.ts`) — keep it green.
- Stages 5a–5d — the combinatorial plan (`core/maze_plan.ts`): SPLICES
  as the 3-way workhorse (bridge between near-parallel edges → two
  degree-3 junctions, parity-paired, no dead-end), occasional 4-WAY
  MERGES (crossing retyped JUNCTION; self-crossings excluded),
  independent DEAD-END STUBS, largest-component culling, splice-first
  reachability spanning, corner cuts. `core/maze_apply.ts` realizes it
  at GRAPH level (splice/stub/merge surgery + entrance/exit cuts with
  anchored END nodes) BEFORE the particle system builds.
- Stages 6a–6b — physics builds the fabric natively (native open
  strands, fused junctions with a final-authority coincidence
  projection, pinned corner ends); on screen behind `mf=1` / the panel
  "mazeFabric" toggle. Entrance runs off the top-left, exit the
  bottom-right, each with an unmarked decoy twin. Tug/pluck stays live.
- Stage 7a — bridges/stubs/cut halves inherit host hue (`hueGroup`);
  7b — open-ribbon tips get clean perpendicular caps (no phantom miter).
- Stage 8 — GAMEPLAY on the fabric: `core/walk_graph.ts` (JUNCTION/END
  vertices, thread-run multigraph edges carrying chain ctrl spans +
  deterministic LATTICE lengths; Dijkstra; start/exit from the cut
  tails), `game/fabric_controller.ts` (BRANCH-POINT-ONLY taps — one run
  per tap, never past a later branch point; backtrack = re-tap the last
  run; the two recorded metrics: current-path length vs optimal AND
  cumulative backtrack distance, separate meters), HUD + win banner in
  `main.ts`. Both 2026-07-27 follow-ups are DONE. Verification recipe
  (scripted REAL pointer taps via `__knotFabric`) is in the Stage 8
  commit message; the scripted solve lands exactly on optimal.
- Stage 9 — BRAIDED BY DEFAULT + TRIMMED CORNERS: deadEndDensity
  defaults to 0 (stubs behind the `deadEnds` checkbox / `de=1`), and
  each corner cut keeps ONE anchored tail — the other flank merges into
  its first crossing (fused 3-way; stub deleted at graph level).
  Self-crossing merges are allowed when the kept loop spans >=
  SELF_MERGE_MIN_LOOP strand edges (the corner-lobe case, which is the
  typical corner geometry — measured 10/10 across the test seeds).
  Side effect: the default fabric now actually sleeps.
- Stage 10 — THREAD-TRUE GAMEPLAY PAINT: gameplay rendering recolors
  the ACTUAL ribbons via per-chain 256x1 palette textures + per-vertex
  UVs (RibbonRenderer palette mode; over-fill patches copy UVs, so the
  weave recolors pixel-identically). Traveled runs gold; choice arms
  carry a lightened distance-fading tint with traveling crests (OUT of
  the junction on choices, INTO it on the arrival run, phase-staggered
  into one continuous flow); hover lights a run steady near-white;
  traversed junctions wear small gold caps on every arm (hides the
  overlapping-ribbon footprint at fusions — attributed via
  `__knotFabric().near()`, not guessed). The paint pass (`tickPaint`)
  rewrites only UV buffers, so the pulse animates while the knot
  sleeps. Distance labels are x10 integers. This RETIRED the Stage 8
  stroke overlay and its ~1px handoff-hairline residual wholesale.

- Stage 11 — LONG DEAD-END THREADS: dead ends (the `deadEnds` toggle)
  are no longer stubs ("not interesting") — a dead end is a closed maze
  strand cut open, one flank fused into its first crossing, the other
  left as a FREE unanchored tip: a long woven thread you branch into
  through real choices and only later discover goes nowhere.
  deadEndDensity = fraction of eligible closed strands cut (1 =
  maximally tree-like). The stub machinery is deleted.
- Stage 12 — ANIMATED TRAVERSAL: the head dot travels the thread's
  curve (ctrl-space interpolation) with the gold front sweeping in
  sync; backtrack retracts; game state stays instant (mid-flight taps
  snap the previous move); the win banner waits for arrival. Runs in
  the asleep/paused ticker branches like the pulse.

- Stage 13 — JUNCTION JOINERY + paint fixes: fused arm tips TUCK flush
  to the host's near edge (the overhang read as gapless fake crossings
  and floating scraps — attributed via a renderability census to
  bridge terminals at fused junctions); rounded FILLETS fill every
  junction wedge, split per arm and colored from the live paint (CPU
  palette sample; redrawn each paint tick); free dead-end tips get
  rounded caps; the branch pulse has ONE global period/phase with
  smooth end windows (the hard boundary line was the crest popping
  against the d>R cutoff); `multiColor` checkbox / `mc=1` (DEFAULT
  OFF: whole fabric one hue — much stronger gold route). GOTCHA worth
  keeping: `arcAt`'s closing modulo wraps an OPEN chain's terminal arc
  (== total) to ZERO — traveled bridges' spans collapsed to a point
  and stayed base-colored; the paint pass uses `paintArcAt` (clamping)
  while the crossing machinery keeps `arcAt` untouched.

- Stage 14 — SPEED + POLISH ROUND: traversal base rate 1.7x (34
  ctrl/s) under a moveSpeed slider (`ms=`); tip discs read endpoint
  samples directly (the `sampleAt` terminal-wrap kill — floating gold
  discs at unvisited junctions); the fillet corner solve falls back to
  the edge-origin midpoint so shallow near-parallel junction wedges
  SEAL instead of being skipped (the V-notch holes); host-colored
  junction center-seal disc + smaller caps; both palette bands
  converge to one near-white accent and crest amplitude ramps with
  distance (CREST_RAMP) so pulses swell out of the core glow instead
  of popping in full-strength.
- Stage 15 — cuspRadius slider (`cr=`, [0, 3] - max raised to 6 on
  2026-10-11, default 1, live): multiplies fillet reach — 0 = sharp
  joints, 3+ = wide cast-metal webs. Fillet color probes scale with patch reach (`paintUAtArc`,
  ~0.45·L); fixed-offset probes rendered dark wings inside the head
  glow at large radii.
- Stage 16 — SECTION COLOR SCHEMES on a 2D palette: palette textures
  gain a V axis (256x64 — U stays the gameplay-paint strip with the
  gold rows identical on every row, V picks a row from a bounded
  280-degree gamut ramp; bilinear filtering blends section colors
  along threads and through junctions on the GPU; fillets/discs
  sample the same field via a CPU bilinear lookup).
  `core/section_colors.ts` emits piecewise-linear v(ctrl) per chain;
  every junction converges to ONE coordinate vJ with ~1.2-world ramps,
  so any number of arms always meet in a single shared color. Schemes
  (`colorScheme` dropdown / `cs=`; replaces the multiColor checkbox,
  `mc=1` reads as strands): mono (default) | strands | depth
  (distance-from-start Dijkstra gradient) | segments (random gamut
  color per run) | noise (seeded spatial dye field).
- Stages 16b/16c — JOINERY WEARS THE FIELD: junction overlays moved
  off flat Graphics fills onto ONE palette-textured fan mesh
  (`TriFanMesh`; capacity fixed at first build, refilled per paint
  tick, unused indices zeroed) with per-vertex UVs. 16c unified the
  sampling into a SHARED JUNCTION FIELD: a query point's direction
  picks the two bracketing arms by angle, each sampled at the point's
  cos-projected distance, blended by angular fraction — disc rims,
  wedge rims, and the arriving ribbons agree wherever they meet, for
  section V and animated gameplay U alike. (vitest.config.ts also
  landed here: it excludes `.claude/**` so agent worktrees inside the
  repo don't triple the suite.)
- Stage 17 — FLOW UNDULATION (worktree agent): the fabric sways in a
  seeded simplex field — render-only displacement of each chain's
  control COPIES in `renderer.update()`, so splines, crossing
  machinery, fades, and joinery ride it coherently; physics never
  touched. `fw=`/`fv=` sliders (default 0.3/1); paused/asleep ticker
  branches run a render-only `flowRender()`; markers/dot/hit-tests
  route through `flowOffset()`. Knot-mode guard: fw=0 asleep frames
  byte-identical.
- Stage 18 — UNDER-GAP CLIPPING + FADE (worktree agent): erase patches
  draw with pixi's core `'erase'` blend over a TRANSPARENT canvas
  (background hex moved to canvas CSS) — gaps CLIP the thread layer,
  so a textured page backdrop drops in later with zero renderer
  changes. `fadeLength` (`fl=`, [0, 1.2], default 0) extends each
  erase grid past the solved caps with a per-vertex fade coordinate
  into a cached premultiplied alpha-ramp texture; fl=0 is bit-identical
  sharp. laneCuts/eraseExtent bookkeeping untouched.
- Stage 19 — BOUNDED TUG + SNAP-BACK, pointer-layer only (grab
  machinery untouched; knot byte identity holds): drag target
  rubber-bands around the grab origin (eff = L·tanh(r/L), L =
  `tugLimit` (`tl=`) thread widths); on release the target eases home
  at `snapBack` 1/s (`sb=`, 0 = off) before the grab frees. The pluck
  voice fires at POINTERUP from tracked drag speed (actual release is
  near-still by design).
- Stages 20+21 — THE INSTRUMENT: `audio/pitch_space.ts` (9 scales
  incl. chromatic; octaves 1-4; root = seed%12 at A2) assigns every
  SEGMENT (walk run / strand) a stable pitch by LENGTH BUCKET
  (quantile, longer = lower; unit-tested). `soundMode` (`snd=`):
  none | manual | random (self-plucks at bounded random intervals) |
  music (`audio/songs.ts` — {note, beats}; demo: Scarborough Fair,
  Dorian; each note physically plucks a random segment with the
  nearest assigned pitch). Auto plucks run a scripted 0.15s
  perpendicular pull on the SHARED grab machinery, then release into
  the string ring. `pitchSpace`/`octaves` re-derive the assignment
  via onAudioChange with NO scene rebuild. `pluckStyle` (`pk=`,
  default string): release snaps back sharply and RINGS (damped
  cosine, ~4 visible cycles, 3-8Hz rising with the audible pitch) -
  only the grabbed point is driven, springs localize the ring;
  "soft" keeps the Stage 19 ease.
- FABRIC SLEEP FIX + half-rate flow (2026-10-10, from the architecture
  audit): the fabric had silently lost the ability to sleep somewhere
  in Stages 10-19 — 2-4 standing anti-riding violations at fused
  bridge-terminal junctions held `ridersPending` nonzero forever
  (~25-30ms/frame burned at rest in the flagship mode). Fix = a graded
  2-slot JUNCTION COVER (forces.ts `JunctionCover`): marks walked ±3
  ctrl along each fused arm at fusion time fade the 2D anti-riding
  floor for pairs near arms of the SAME junction — the P3.31 theorem
  again (the tuck/fillet joinery RENDERS that overlap as a joint, so
  the floor may not demand separation there). 3D capsule unconditional;
  knot mode never allocates the cover (byte identity green). All
  fabric configs now sleep at sim ~3.7s. Also: `flowRender` runs at
  HALF RATE while asleep (the full crossing re-solve cost ~10ms/frame;
  30fps sway is imperceptible).
- Stage 22 (worktree agent) — APPEARANCE ANIMATION: `appearMode`
  (`ap=`, default instant = byte-identical): trace | bloom | draw |
  ink + `appearSpeed` (`as=`). Per-sample WIDTH-MULTIPLIER reveal
  masks (`core/reveal_plan.ts` + `render/reveal.ts`); crossings hide
  erase+fill until BOTH passes revealed; pre-sim ~1.2 sim-s hidden
  before the first frame; finished reveal nulls the masks.
- Stage 23 (worktree agent) + Stage 24 — PATH-VIZ DROPDOWN
  (`pathViz` / `pv=`, absorbing trailMode; `trm=1` reads as trail):
  gold | trail (memory mode: every tap advances, no backtracking,
  only `trailLength` (`trl=`) units of recent path stay gold with a
  fading tail) | string (ARIADNE'S THREAD: a thin white yarn unspools
  along everywhere you walk — one append-only pass per move, U-turn
  return passes on backtracks, never picked up; slack-cotton seeded
  wander + per-pass lane bias; `tension` (`tn=`) reshapes the laid
  string live; drop shadow for self-crossings; stations resolve
  through pointFlowed so the yarn rides flow/deformation). Per-mode
  sliders show dynamically (tweakpane row `.hidden`). 24b: the yarn
  HONORS THE WEAVE - the renderer records per-chain UNDER-GAP windows
  from the live crossing solve each frame ([centerArc, extNeg,
  extPos], emergent included; `underGapVisibility()` ramps over the
  fadeLength extension), and the yarn strokes alpha-bucketed runs so
  it fades out and dips under exactly where its host thread does,
  instead of bridging over the gaps.
- Stage 25 — FOG OF WAR (`fow=` + `fowRadius` / `fr=`, dynamic
  slider): the maze hides until explored; explored stays visible.
  One sprite over the gameplay overlay, offscreen-2D-canvas texture
  (background fill + destination-out radial holes), stamps follow the
  head at 0.8-unit spacing, redraws only on change; spatial memory
  (deliberately does not ride the flow field). Exit/pulses/labels
  emerge only as explored. 25b: the fog EDGES UNDULATE - a
  DisplacementFilter over the fog sprite driven by a slowly drifting
  tileable noise map (page-lifetime cached); displacing the uniform
  interior is invisible, so only the lifted regions' edges breathe,
  one GPU pass, animating even while physics sleeps.
- 2026-10-10 fix round (commits a37f4f5+2fa7e79): the ARC-WRAP FOURTH
  BITE (see the updated lore entry - sampleAt itself used ring math on
  open chains; SplineSamples now carries `closed`); GRADED FADE TAILS
  (FADE_TAIL_STATIONS=3 pinned per tail - uniform spread starved long
  rides' tails to <1 station = hard jittering edges; fl=0 bit-identical)
  + the P3.38 fill reserve subtracts reserve+fadeLength so fills stop
  clear of neighbor fade tails; AUDIO: EKS harp voice (pick-position
  comb, body EQ, generated-IR reverb, equal-energy normalization,
  burst.stop() main-thread race REMOVED - the music silent-note bug),
  songs.ts rewritten from the musicaviva ABC (the from-memory melody
  was wrong), music-mode buckets from the song's actual pitch set,
  soundSpeed (ss=) + volume (vol=) params, tap-pluck visible-ring
  floor; PANEL: refreshCond conditional-visibility map, folder+scroll
  localStorage persistence, temperature max 0.5; MARKERS: head dot
  inside its thread + under-weave halo (underContainer BELOW the
  ribbon root; erases legitimately punch it), explicit N-gon marker
  circles (pixi tessellates from raw sub-unit radius), stronger crest,
  outbound pulse leads inbound by PULSE_OUT_LEAD 0.3s.
- Stage 26 (worktree agent, merged d99aee8) - PER-VERTEX SECTION RGB:
  the 256x64 palette collapses to a 256x1 accent strip + a custom
  section shader (mix(vSection, acc.rgb, acc.a) * vColor); RibbonMesh
  carries an aColor vec3 buffer; vCache/vAtArc/fieldV became
  rgbCache/colorAtArc/fieldRGB; segments scheme = pure hash01 per run
  (junction color = channel-wise RGB MEAN of incident runs, straight
  RGB ramps - zero association between segment colors, per request);
  depth/strands emit through a gamut subdivider so their looks hold.
  KNOWN FOLLOW-UP (user-reported): circular blend artifacts + hard
  color seams at some intersections under segments. RESOLVED
  2026-10-11 by the JUNCTION BLEND ROUND below (both suspects were
  real: the field model AND the over-fill copy, plus a stale cache).
- Gameplay/visual round (b440fe9): FULL-LENGTH PULSE TRAINS (crests
  march whole runs at `pulseSpacing` (psp=, default 2.5, live);
  inbound/outbound combs, outbound leads 0.3s; floor glow still hugs
  the junction; far-end-only dissolve); SEGMENTS = 12 stride-spread
  swatches + junction-sharing collision walk (uniform hue draws over a
  pastel arc read as clumped; SEG_RAMP_CTRL 1.0 / 18%-of-run blends -
  the old 2.4 ramps diffused the whole maze toward neighborhood
  means); start/exit discs wear their thread's section color with a
  capsule erase notch under the connecting tail only (full ring
  punched the head glow); black-ringed head dot; gold caps only on
  TRAVELED arms (stubs on unchosen arms); backtrack-to-start keeps the
  Ariadne yarn (explicit Reset clears via clearYarn); pluck ring band
  5-13Hz / decay 0.22 (interim - render-side standing wave queued).
- APPEARANCE FX merge (worktree agent): reveal frontiers emit pooled
  particles - `appearFx` (afx=, sparks | comet | dust | none, default
  sparks, hidden when appearMode=instant). 600-slot Float32Array pool,
  one ParticleContainer, NORMAL blending (additive reads muddy grey
  over the Stage 18 transparent canvas), frontier positions via the
  clamping samplers + tipsAt dir/rate, ink mode emits at the mask's
  0.5-crossings; drains to a one-compare no-op after the reveal.
- SHAPED LATTICES (worktree agent, user-requested): `shape` (shp=:
  rect | heart | star | fish | tree | ring) sculpts the lattice via
  analytic inside/outside masks sampled at cell centers
  (core/shapes.ts; largest-connected-component keep, holes = out-of-
  mask interiors - the ring proves them); the grower confines tree +
  weave openings to in-mask pairs, mask boundaries act like the outer
  border. rect = null mask, BYTE-IDENTICAL path (unit-tested + the
  physics golden). Maze entrance/exit generalize to ANCHORS (sa=/xa=,
  compass points): maskExtremePoint -> thick-material nudge (cuts at
  silhouette slivers parked tails beside boundary-hairpin kink eyes
  that tore and stood - shapes were FATTENED instead of touching
  physics, per the convexify rule) -> nearest maze-strand edge.
  Battery: 24/24 shape x mode x seed settles; scripted star solve
  lands exactly on optimal; invariants unit-tested per shape. Known
  residual: star e-w 6/8 sleeps, 2 stragglers hover at threshold
  (bistable-attractor class, no blowups).
- PHYSICS JUNCTION SPACING (worktree agent, user-requested): fused
  joints keep their nearest crossing at jnSep = max(2.2,
  5.7*threadWidth) ctrl per arm via a P3.39-style rate-limited ratchet
  (JN_SEP_RATE 0.015, mobility-scaled) in easePassToward BEFORE the
  ordering clamps (they always win - never forces topology). Corridor
  lesson: a pass flanked by TWO joints needs each side's budget capped
  at half the joint-to-joint span, or last-writer dominance CONVEYS it
  tighter than before. Census at the repro seed: sub-2.0-ctrl tail
  41 -> 9, worst 1.39 -> 1.90, survivors parked sub-stick (fabric
  still sleeps 3.9). Knot mode structurally untouched (no fusions ->
  no clamp records). Full battery green (sweeps knot+fabric incl. the
  P3.39 pin seed, quiescence, gesture battery 9/9 re-sleep, scans).
  The flagged easePassToward seam-end guard bug was REAL and is fixed
  (633d290 - see the late-2026-10-10 round below).
- JUNCTION CLEARANCE (fix A) + TWO-LAYER FILLETS (fix B), same round,
  REFIT in e78909c: junctions were invisible to the crossing
  bookkeeping, so gap cuts + fade tails marched into seal discs/webs
  (worse with gap, fl, cr) - every fused joint acts as a VIRTUAL
  NEIGHBOR on its arm chains (junctionArcCtrls). The clearance caps
  ONLY the cosmetic margin (floored at half a band - zero margin read
  as a "busted gap on one side") and the fade room; the MARCH is never
  capped (capping it truncated real coverage = ragged twists near
  big-cr joints - the P3.36/P3.40 theorem). jointClear = max(1.1 *
  fillHalf, 0.55 * wedge reach) + gap + CUT_BIAS; a squeezed side's
  fade keeps >= FADE_JOINT_FLOOR 0.45 of fadeLength (zero room
  rendered skinny + ABRUPT beside the twin side's full roll-off).
  Fillets split onto TWO TriFanMeshes: filletTopLayer sits ABOVE the
  erases but BELOW the over fills (above the fills, its field
  approximation overpainted them - "discontinuous intersection
  blends"); per-ARM votes pick each wedge's layer (arm-under keeps the
  bottom layer so the joint's own gap still punches). Fan apex = mean
  of the arms' arc0 SAMPLES (the flow-offset physics centroid drifted
  0.06 world off the flanks - ear slivers), fan colors composed CPU-
  side (raw U across band families swept phantom gold mid-triangle).
  Probe note: layer-toggle attribution must hide BOTH filletMesh and
  filletTopMesh.
- FX + FEEL rounds (e78909c, 877ee00): RENDER-ONLY PLUCK RING - physics
  releases at pointer-up and a damped standing wave displaces ONLY the
  plucked chain's render controls (cos^2 window PLUCK_WAVE_R 3.0), so
  crossing partners hold still (measured 0.525 vs 0.015 world/frame;
  the grab-driven ring shook the neighborhood through the couplings).
  `snappiness` (snpy=) scales FREQUENCY only (x(0.35+1.8s), capped 24Hz
  under the 60fps Nyquist - past it the render-sampled ring aliases
  into a slow beat); decay stays 0.55s (a taut string rings fast AND
  long). BURN + ROOTS appearFx as TEMPORAL COOLING: per-sample ignition
  ages in ping-pong pools (writePaint's reference skip froze a single
  mutated scratch); tip-POSITION-keyed gradients popped whenever a
  front finished, ages cannot; cooling outlives the reveal; joinery
  reads the pools via colorAtArc. Per-style reveal shaping lives in
  revealShape() (comet/rainbow taper x8 with width floors, roots x16).
- APPEARANCE FX round 3 + LIVE RECOLOR (2026-10-10): `sparks` RENAMED
  `rainbow` (afx=sparks falls back to the default, which is rainbow):
  six stripes across the ribbon width (vUV.y in the section shader)
  under a white-hot tip (the reveal glow), then a faded-white wash,
  then the section color; full-wheel saturated sparks. Mechanism = a
  per-vertex `aFx` channel, SIGN-CODED ((0,1] rainbow progress,
  [-1,0) materialize transparency), copied into over-fills; every
  geometry drawn with the section shader must carry aFx. dust + comet
  MATERIALIZE from transparent. OVERLAYS VS FX: fans fade in only as
  their least-settled arm settles (opaque fans over translucent or
  striped arms read as pale stars); crossings wait for both passes to
  go solid (a fill copying a translucent host double-covers its window
  beyond the erase); every reveal-gated gap FADES IN over 0.3s (erase
  mesh alpha) instead of popping. SUB-FRAME IGNITION: FX ages are
  back-dated by taper depth - igniting everything one frame exposed at
  age 0 stepped the effect once per frame of front travel (bands
  along every fresh thread). Comet streaks lie along the host thread
  (tip-backward polyline, local tangents), blue..blue-green tints;
  dust x2 (pool 1200); roots dirt x2 + bigger; hover breathes
  0.2..0.8. Look color controls (scheme/hue/gamut/palette/pathColor)
  now RECOLOR IN PLACE (renderer.recolor) - the rebuild they used to
  trigger reset the knot, replayed the reveal and wiped progress.
- ROOT-CAUSE ROUND (late 2026-10-10; three measuring agents):
  GAP JITTER (4th report) lived in the OVER-FILLS, not the erase cuts:
  windows copied WHOLE samples (floor/ceil), so fill ends rode the
  resampling grid - which slides along the material as flow breathes
  a chain's length - re-snapping one sample (0.082 arc) 2-7x/s per
  crossing, visible as a hard edge stepping inside a neighbor's soft
  fade. Fill ends are now CONTINUOUS (end pairs lerped on the source
  strip's quad edges; the paint pass replays the same trims), the
  over-reach exit interpolates, and open runs map over count-1
  segments (the window used total/count - the arc-wrap family again).
  The three lane-cut limiter rounds were filtering an already-smooth
  signal (raw cut change < 0.0063 arc/frame); at rest only the micro
  one-pole ever fires - candidate for removal after a drag battery.
  FILLETS: the pale jagged spurs were a Stage 16d sign regression (the
  flank tangent already pointed outward; multiplying by arm.dir again
  mirrored every dir = -1 flank onto the arm's FAR edge, 988/988
  measured), and webs overhanging an arm's under-gap now stop short of
  its nearest underWindows cut. PHYSICS: easePassToward's open-chain
  terminal passes clamp against their REAL neighbors (the first pass
  skipped all ordering clamps; the last clamped against its own
  pre-step ctrl - 1.6-ctrl sawtooth jumps, order inversions, a
  fallback runaway; 4/28 fabrics incl. seed 20 at defaults never
  slept). RAINBOW now swells (up to 1.6x, easing to normal as the
  stripes fade; swell-aware concave clamp in RibbonMesh.update) under
  a longer plateaued white head; crossings wait out the swell, and a
  gated crossing whose UNDER pass draws on top (chain/strip order)
  crossfades its fill in BEFORE its gap fades (fading both at once
  dims the crossing mid-fade). The asleep flow-0 ticker keeps calling
  update() while FX pools are hot (needsFxRender) - else gated
  crossings stayed hidden until the next wake.
- MOBILE + CAMERA ROUND (late 2026-10-10): the settings panel hides
  behind a HAMBURGER (no Tweakpane title bar - it would be a second,
  competing collapse; a custom header shows the name + version; open by
  default on wide pointer-precise screens, closed on phones, persisted;
  finger-sized rows under pointer:coarse); the footer stamp is a
  persisted showStats toggle (hidden by default - the text still updates
  for the diag scripts); safe-area insets (viewport-fit=cover). CAMERA
  (`cameraMode`, cam=): fit = the eased auto-fit + user zoom/pan
  composed in screen space (clamped so zoom 1 is exactly the home view;
  under fog the fit frames only the FOG-VISIBLE region) | follow = a
  chase camera on the head with a critically damped pull-back spring,
  OFF for FOLLOW_DELAY after the last gesture, stiffness eased in over
  FOLLOW_RAMP (it frames the whole knot during the intro). Every
  gesture goes through ONE primitive (placeWorldAt: world point to
  screen point at a scale) that each mode maps onto its own state.
  GESTURES: pinch (world-anchored midpoint) + two-finger pan; touch taps
  on choices resolve on RELEASE and a pinch cancels a tug without a
  pluck (its first finger can never move the player); empty-space drag
  pans (mouse + touch), middle-drag pans anywhere; wheel = mouse zoom at
  the cursor / trackpad two-finger scroll pans / trackpad pinch
  (ctrl+wheel) zooms; double-click / double-tap empty space resets. The
  camera steps in EVERY ticker branch (moves and fog growth happen while
  the physics sleeps). FOG: `fowIntro` (fwi=) holds the fog off during
  the intro animation, then closes it in (fade + reveal radius
  contracting from the whole maze to fowRadius).
- SHAPED START/EXIT CLEARANCE (late 2026-10-10): on every non-rect
  shape the start/exit dots sat among other threads (settled clearance
  0.4-1.3 vs 2.3-2.5 at rect corners) - the anchor target is nudged into
  thick material (the sliver/kink-eye stability fix) and the fixed
  CUT_REACH tail parked the pin inside the weave. PLANARITY is the root:
  a cut on an interior edge can never hand its tail to open space without
  crossing threads. Shaped plans (plan.escapeTails) therefore cut only
  OUTER-FACE edges (maze_plan outerFaceEdges: rasterize every edge, flood
  the exterior from the raster border), and the tail follows a
  shortest path through a clearance field (maze_apply escapePath:
  chamfer distance transform + Dijkstra biased toward the compass
  direction; tiers [pass, clear] = [0.45, 3] -> [0.45, 2.2] -> [0.3, 3]
  -> [0.3, 2.2], else the historic fixed tail) with the path written in
  as real lattice points. Rect keeps the exact historic search and tails
  (the default-plan JSON identity test holds). checkAlternation now reads
  each pass's diagonal from its own edge's FIRST segment, as physics
  does (an escaped END sits far down a bent path). Settle battery: 5
  shapes x 3 seeds x 3 anchor pairs all asleep; ends clear 1.8-3.5
  except the rare no-trim decoy pairs (two close tails by design) and
  one physics outlier (fish seed 11 n/s: a loose loop swings past the
  start dot while settling). `tree` is now a broadleaf: a bushy lobed
  round canopy on a long two-cell trunk.
- JUNCTION BLEND ROUND (2026-10-11; fillet agent + integration): the
  "jagged discontinuities of color blending in intersections" report
  was FOUR stacked causes. (1) FACETED FANS: one apex-to-rim triangle
  per spoke Gouraud-smeared the nonlinear junction field into straight
  streaks - fans subdivide into concentric rings (`TriFanMesh.pushRings`,
  one per FAN_RING_STEP 0.35 world of radius, <= 4, crowded apex-ward;
  commit uploads only the used ranges). (2) STALE SECTION CACHE: the
  per-sample RGB cache mapped sample -> ctrl through the LATTICE-time
  arc table; relaxation shifts ctrl/arc ~1 ctrl near joints (a whole
  SEG_RAMP_CTRL), so 29/41 (ring URL) and 68/89 (default segments)
  junctions never reached their shared color. `cacheDrift` re-bakes a
  chain past CACHE_REBAKE_CTRL 0.1 ctrl (-> 0-1 non-converged; ~30
  re-bakes/s at rest under flow, ~0.1 ms each). (3) Fixing (2) EXPOSED
  the field's own error (render lore below): the 16c blend ran
  centerline-to-centerline, painting neighbor colors onto every arm's
  footprint off its centerline. The field is now EDGE-AWARE (blends only
  across the gap between ribbon edges; inside an arm's width it IS that
  arm's material; the overlap core keeps FIELD_BLEND_MIN 0.5 of the
  wedge, centered) and CURVE-FOLLOWING (per-arm radial profiles on a
  FIELD_PROF_DR grid; brackets chosen by the arms' angles AT the query
  radius, continuous at switches). Footprint census (fieldProbe vs
  colorAtArc, true overlap excluded): mean err 0.031 -> 0.005, >0.05
  20.5% -> 2.8% (ring URL); 0.035 -> 0.015 at default (its small web
  lies inside the overlap core). (4) OVER-FILLS AT JOINTS: a third of
  all over-fills reach within 1.5 fillHalf of a joint center (23/88
  ring, 49/183 default) and repainted exact colors over the web, their
  window ends cutting hard lines through the blend. Capping them short
  is a wrong weave (fillBound also restricts the erase), so fill
  vertices within FILL_JOINT_IN 2 fillHalf wear the junction field,
  easing to exact by FILL_JOINT_OUT 3 (`RibbonMesh.blendTowardField`
  over an exact-color shadow refreshed on every window copy -
  idempotent across paint ticks). Also from the agent: per-arm joinery
  DOMAIN (reach/sampling capped half way to the arm's next joint) and
  the LAYER VOTE fix (an under-near arm pins its joint to the punchable
  bottom layer only when its gap starts within FILLET_DIVE_NEAR 2
  fillHalf; any over-near arm lifts the joint's non-diving wedges to
  the top layer): bottom-web bites 0.56-0.60 -> 0.06-0.34 punched area.
  COST: fillet rebuild per paint tick 1.5 -> 4.3 ms (ring, cr=3), 3.0 ->
  4.9 ms (default); the lever if it matters is caching each junction's
  RGB field across paint-only ticks (only U animates). Verified: all 41
  junction crops at the user's ring URL (live | agent patch | final),
  default-URL A/B, suite green. Known leftover: a gameplay PULSE CREST
  (a narrow paint-U band) crossing a junction web still Gouraud-streaks
  along fan triangles at the player's junction (seen in a frozen-paint
  diff) - finer rings or a U-only ring refinement would cure it. (Both
  the cost and the leftover were closed by the GPU JUNCTION FIELD round
  below: rings are gone, the field runs per pixel.)
- GPU JUNCTION FIELD (2026-10-11; worktree agent, user request "compute
  the junction blend per pixel in a shader"): the field moved from
  per-vertex CPU evaluation (ring-subdivided fans; 8-11 ms per paint tick
  at the user's rect URL, main thread saturated) to PER-PIXEL fragment
  shaders (render/junction_field.ts). DATA = two page-lifetime RGBA32F
  textures, linear texel index, read with texelFetch + manual lerp:
  PAINT (one texel per ribbon sample = section rgb + paint U, written by
  `writeFillPaint` beside every ribbon writePaint - so the field reads
  exactly what the ribbons wear, burn cooling / reveal glow / gameplay
  paint included; a custom "knot-float-rows" uploader sends only touched
  rows) and RECORDS (per joint: center, nArms, fan fx; per arm in angle
  order: (paintBase, count, closed, total), (arc0, dir, domain), then one
  texel per FIELD_PROF_DR step (angle[g], arc[g], angle[g+1], arc[g+1]);
  nArms 0 = an AXIS record - free-tip caps). Fans (TriFanMesh) carry only
  positions + `aRec`; over/emergent fills carry `aJoint` (up to four
  record candidates; the fill shader picks the nearest per pixel, smooth
  hand-off on bisectors). The CPU rebuilds fan geometry + records only
  when update() ran (geomRev), a joinery slider moved, or a reveal / FX
  animates; a paint-only tick just flushes paint rows (rebuildFillets
  takes `force` for probes). `renderer.fieldProbe` is now a line-for-line
  CPU transliteration of the shader reading the SAME mirrors
  (`cpuJunctionField`; `fieldProbe.record(ji)` = a joint's texel index).
  Two model fixes ride along (user/coordinator requirement: gameplay
  paint must stay clean at joints): (1) each arm is COMPOSED with its own
  accent before the edge-aware blend (render lore below); (2) a patch
  wears a joint's field only where it IS one of that joint's arms (same
  chain, window within the arm's reach) - foreign threads passing a
  joint were painted with its colors and pulse glow (183 -> 88 wearing
  patches at the tw 0.64 traversal state; the original j4 fill-seam site
  at the ring URL is unchanged). Plus a PAINT-ONLY over-fill refresh
  (`repaintFromRibbonWindow`: used pairs' UV/RGB/FX, prefix upload) -
  the full 128-station window re-copy was 2/3 of the paint pass.
  MEASURED (desktop Chrome, interleaved runs): user URL rebuildFillets
  7.9-10.7 -> 0.95-0.99 ms/call (forced full rebuild 8.0 -> 2.1),
  tickPaint 9.1-12.7 -> 1.1-1.2 ms, main-thread script 96-98% -> 49-52%,
  rest 41-57 -> 60 fps (vsync-bound); ring 4.5 -> 0.46, default 5.5 ->
  0.79 ms/call; draw-phase GPU 0.34 -> 0.62 ms/frame at 3200x1800.
  GPU-vs-CPU census (probe_gpucensus: tiny triangles injected into the fan
  mesh carry record indices, read back vs fieldProbe): max |err| 0.0024
  (< 1/255) over 30-42k points per URL, gameplay paint included. Probes
  (repo .claude/probes, untracked): probe_gpucensus, probe_absheet,
  probe_pulseframes (HOVER=1), probe_filldiff, probe_gpudraw,
  probe_jstats. Known residual, PRE-EXISTING (identical on master):
  faint hairline dashes inside 4-way merge cores - wedge flank edges
  meet the uncovered arm strips just outside the seal disc, where the
  overlap-core blend differs from the base ribbon underneath. REVIEW
  ROUND (same day, read-only review agent): stale GPU tails on over-fills
  (PARTIAL BUFFER UPLOADS lore below), a hand-off step where the farther
  of two joints left range (each joint now pulls by its own weight), and
  rainbow stripes erased on fills near joints for ~0.8 s (the field now
  yields to aFx, as master's CPU override did) - all fixed. Also seen,
  PRE-EXISTING: during a reveal a joint's fan can turn opaque while a fill
  beside it is still striped (the fan samples each arm's settledness 0.8
  ctrl out, which can sit on a different reveal phase than the fill).
- 2026-10-11 small fixes. TUCKED-TIP SPURS (318b64b; the user's "faint
  jagged sticky-outy bits"): tuckFusedTips collapses a bridge tip's last
  samples onto one point, so the miter legs there have ZERO length -
  normalizing a zero vector read as a 90-degree turn and widened the tip
  1.41x into spurs past the host's edge, at every tucked bridge tip. A
  zero-length leg borrows the other leg (both zero = straight cap) in
  RibbonMesh.update AND buildEraseGrid's station widths, which must
  mirror each other. CONCENTRIC DOT GAPS (5983077, user spec): the gap
  around a start/exit dot is a ring of radius dot + gap (lanes march to
  that circle); the old dot-circle-plus-arc-margin edge kept the dot's
  own tighter curvature. CUSP RADIUS MAX 3 -> 6 (user request) + ADAPTIVE
  WEDGE FLANKS: a wedge flank is a polyline through points on its arm's
  edge, and where the arm wraps a small eye each chord cuts across the
  curved edge, leaving a circular segment (sagitta c^2/8R) that neither
  the web nor the ribbon covers - thin dark crescents. A fixed 5 flank
  points made 0.48-world chords at cr 6 (crescents at 12 of 41 ring-URL
  joints); flanks now take enough points for chords <= 0.15 world
  (FILLET_EDGE_CHORD; 0.3 still left specks). Same-state A/B
  (probe_chordab: one settled page, only the fans re-rendered per
  variant, pixel-diffed by cells_diff). A tried "outward-only flank" rule
  (stop a flank where its arm curls back toward the joint) cut V-notches
  into webs and was dropped; a fan from the joint center over-covers a
  non-star-shaped outline, it never leaves holes. STALE FAN INDICES
  (1ba7382): TriFanMesh uploads indices up to a high-water mark - with two
  commits before one draw, pixi's last-update()-size upload dropped a
  shrinking fill's re-zeroing for good (grey/white fans, thin bars; only
  probes forcing several rebuilds per frame hit it). WORKTREE DEV SERVERS
  (ab09488): the watch-ignore is anchored to this checkout's own .claude/,
  so a server started inside an agent worktree sees its own edits.
- 2026-10-11 APPEARANCE MODES + USER DEFAULTS + SHORT LINKS. The old
  appearMode dropdown is now `appearSequence` (ap=, unchanged key); a NEW
  `appearMode` (am=) sets sequence + fx + speed together: presets ink +
  dust 3, trace + burn 3, trace + rainbow 2, trace + roots 1.5, bloom +
  comet 2.2; random (re-rolled on every load); custom; instant. Editing a
  value re-derives the mode (custom unless it matches a preset). The
  user's chosen settings became PARAM_DEFAULTS (gs 18, mazeFabric ON,
  music/chromatic, cr 3, tw 0.52, gap 0.04, segments, trace + burn 2.2
  intro, ...) and links shrank to `?s=<seed>` + changed params (superseded
  the same day by COMPACT LINKS, below). PANEL LORE: Tweakpane 4's
  refresh() FIRES change handlers whenever the shown value changes -
  programmatic refreshes need a guard (appearSync), and the reset glyph
  runs a row's effects only if refresh() did not; slider step constraints
  write float noise (1.4500000000000002) back into params.
- 2026-10-11 small round 2. JUNCTION BLEND DISTANCE (`junctionBlend`, jbl=,
  lattice units, panel [0, 6], default 0.88 since codec v2 - 0 = the
  historic look; live via recolor): extends the segments/strands junction ramps by a FIXED distance
  (user correction: not a ratio of the run's length - every junction bleeds
  the same distance; converted to ctrl per run through its lattice length,
  capped at the run's midpoint, so runs shorter than twice the ramps become
  one gradient junction -> own color -> junction). Measured run lengths at
  defaults: median ~3.7 lattice units, p90 11-15, max ~50; ~0.45-0.9
  lattice units per ctrl. Ramps ease toward smoothstep, fully once the
  extension reaches 1 lattice unit - a long LINEAR ramp meets the flat run
  (or the opposite ramp) with a slope kink the eye reads as a band. The
  renderer's segment lookup is now a binary search (eased ramps emit 6
  pieces each). AUDIO AUTOPLAY GATE (knot_synth.ts): no AudioContext exists
  until the first activation-triggering input (keydown, mousedown, mouse
  pointerdown, touch/pen pointerup, touchend; navigator.userActivation
  decides where supported), and the gate's capture-phase window listener
  creates + resumes it INSIDE that gesture (iOS unlocks only there) -
  music-mode plucks before it are silent no-ops, so Chrome's "AudioContext
  was not allowed to start" warning is gone. RELATIVE BASE (vite base
  "./"): one build serves at knotmaze.pages.dev/ and under a path prefix
  (levi.dev/knotmaze/ via levi.dev's proxy function); the dev server still
  serves at /. Credit line reads "[cat] Made by Snoring Cat" as one link.
  SEED ROW (Design folder, replaces the New seed button): shows the seed as
  the link's base-36 token; typing a token (any case) loads it exactly as a
  link would, and any other text (a phrase, a word longer than 7 chars)
  hashes (FNV-1a, url_state `seedFromText`) to a seed, so a word gives
  "its" maze; the field always re-shows the canonical token; a dice button
  inside the row rolls a random seed; focusing selects the token.
- gridAlign EXPONENTIAL SLIDER (worktree agent + panel wiring,
  2026-10-11): the settled look follows the LOG of the anchor strength
  (alignment progress ~30% per decade from 5e-4 to 1; the linear slider
  spent 56% of the visible change on its first 0.05 step).
  `src/ui/grid_align_curve.ts`: strength = (2^(10x) - 1) / 1023 (each
  tenth of the slider doubles it; settled steps 8-13% each), inverse
  gridAlignSlider. The URL (ga=) and physics keep the STRENGTH, so links
  keep their look; the panel row binds a view object holding the slider
  position (no step - a step would snap the default 0.669 off its exact
  value; 2-decimal display) and writes the strength on change; Reset to
  defaults resyncs the view before pane.refresh(). Strengths snap to 12
  significant digits so decimal values round-trip bit-exactly. Measured
  residuals (pre-existing physics, not the curve): loose rings buckle
  lopsided below strength ~1.8e-3 and snap round above it (one step
  between slider 0.1 and 0.2); at 5e-4..1.6e-3 a ring can wander for
  minutes without sleeping; the ring at ga=1 never sleeps (a ~7 s cycle
  near the SE exit).
- APPEARANCE FX round 4 (worktree agent, 2026-10-11). ROOTS dirt sprays
  (launch 1.6-4.4 units/s, fling 45-171 degrees, a small upward pop, life
  0.45-0.95 s - the old throw was under one thread width). DRAW sequence
  draws CONNECTORS LAST: an open chain the walk graph covers with ONE
  junction-to-junction run <= 4 lattice units (the splice bridges; across
  10 fabrics every match was a 3-sample bridge, the shortest non-connector
  8.7) starts evenly over the last 20% of the long-strand pass, and waits
  until both threads it joins are drawn at its ends (else bridges floated
  up to 1.4 s early); knot mode has no connectors and its plan is
  byte-identical. BURN IGNITION IS SWEPT, NOT STAMPED - the user's "bands
  of black interleaved with colored bits": ignition stamped +-0.45 arc
  around each front once per paint tick, and fronts run 16-33 arc/s, so at
  low frame rates whole stretches between stamps never ignited and kept
  their thread color inside the char. Each front now dates every sample it
  crossed since the last tick (the hot head, BURN_HOT_ARC 0.45, holds age
  0; behind it a sample's age is the time since the head left it); runs
  swept with no live front (finished fronts, short runs crossed between
  ticks) ignite with ages ramped from their dated neighbors
  (datePassedRuns); every chain's pool is armed at reveal start, since
  ignition fires only on COLD samples; the ember flicker fades out as the
  char sets (it drew orange zebra stripes). Colored bits inside the char
  at 3.4 s: 46 -> 2 (speed 2.2), 61 -> 8 (speed 3). Roots shares the
  ignition. PERF NOTE: the gs-18 intro ran ~5 fps on a loaded desktop
  because PHYSICS took 150-190 ms per frame (sp=0 -> 60 fps); the exact
  per-pixel ages of the planned shader reveal (GPU migration G2) retire
  this CPU machinery.
- 2026-10-11 COMPACT LINKS (worktree agent; user: "an encoding function
  that converts all param deltas into a single compacted value", and no
  query at all for an all-default design). The `?s=<seed>&tw=.64&...` short
  links (live that morning) gave way to ONE token, `?<seed>` /
  `?<seed>.<blob>` (format in Key Design Decisions; param_codec.ts header).
  The user's rect design: 121 -> 55 chars. KEPT from the short links: the
  delta semantics (6-decimal rounding, implied appearance values, random
  re-rolls on load). DETAILS beyond the spec, each for a measured reason:
  a TRAILING "=" on the token is tolerated (`new URL(link).searchParams
  .append(...)` re-serializes `?<token>` as `?<token>=&...`), as are
  trailing dots (sentence punctuation after a pasted link); `&key=value`
  pairs after a token apply as legacy overrides, so probes keep writing
  `&am=instant` / `&mf=0`, and unknown keys (fbclid, utm_*) drop on the
  rewrite. The decoder is strict otherwise: an invalid char, truncation,
  unknown version, out-of-range index/option, reserved number code, or
  leftover bits beyond the zero padding rejects the whole blob (seed kept,
  defaults, one console.warn) - all-or-nothing, never a partial design.
  Legacy readers now fall back to the frozen v1 defaults (LEGACY_BASE), so
  a future default change (codec v2) leaves old s= links' meaning alone.
  `window.__knotParams()` returns the live params (the address bar has no
  readable keys any more); scripts/diag_scan.mjs reads tw/gap from it.
  CODEC V2 (same day): the user set junctionBlend's default to 0.88, the
  first default change under the codec - so CODEC_V2 (an edited copy of
  v1), CODEC_VERSION 2, and all-default links became `?<seed>.U` (the v2
  header with zero entries). Bare seeds, v1 blobs and legacy s=/seed=
  links keep junctionBlend 0 and re-encode with it explicit.
  A query WITHOUT a seed (`?am=instant`) is no link at all: a fresh
  design at TODAY's defaults (the bare page too, until K56 made it the
  daily). PROBE GOTCHA: `?<seed>&am=instant`
  and `?s=<seed>&...` probe URLs are v1 links (junctionBlend 0, not the
  current 0.88): write `?<seed>.c&...` for current defaults (v3; a `.U` link is v2, pluckSize 1).
- RENDER-ONLY PLUCKS + PHYSICS CHECKBOX (worktree agent, 2026-10-11; user:
  a tap or auto pluck moves nothing but the plucked segment, vibrating
  "way faster", motion-blurred; then "a checkbox for disabling physics
  entirely"). Retires the render-only standing-wave ring (pluckWaves) and
  the auto pluck's physical pull. TAPS + AUTO PLUCKS touch zero physics
  (bitwise: positions/prev/zPos/pass ctrls, 0 steps, never wake); a DRAG
  still tugs and its release keeps the snap-back plus the vibration. A
  press on a thread waits for a per-pointer slop (mouse 4 / pen 6 / touch
  10 CSS px): lift = tap-pluck on pointerup, move = tug grabbed at the
  PRESS point (physics off: a pan). THE LOOK (render/pluck_overlay.ts;
  pure math in pluck_model.ts, unit-tested) is a TIME EXPOSURE: every
  node-to-node LOBE of the unit (fabric: the walk run; knot: the tapped
  lobe +-2) is an ideal plucked string (modes a1(beta), d'Alembert
  triangle, parallelogram envelope rounding to a lens); the strip shader
  box-filters the arcsine dwell density per pixel (ink-conserving; zero
  amplitude is exactly an AA band); the speed cue is a STROBE GHOST (60 Hz
  wall-clock phase steps, area-capped 15000 px^2, WCAG 2.3.1); decay
  follows the voice's T60 (sustain). The overlay sits above every layer;
  under it the BASE ribbon COLLAPSES (widthMul, one chain re-extruded - no
  spline or crossing solve, 0 update() calls per pluck) to what the
  overlay's opaque core always covers. NODES: crossing passes are SOFT
  (static footprint = erase extent + fade under / over-fill half-lengths
  over; swing <= 0.9h inside, opening at 1.5/world); junction cores and
  marker gaps HIDE the overlay (rigid fret at the hide end), and a
  junction's soft footprint spans the FILLET WEB's reach (each wedge paints
  a tapering triangle of joint material ON its arms above the base - a
  collapsed base left it as a pale static sliver beside a dark gap). Weave
  checks: every erase / fill / fillet buffer and every other chain stays
  identical during a pluck; partner casing bands at under nodes: 0 px
  changed (fw=0). CONCAVE SIDE: the inner swing is capped at 0.9 radius
  minus the thread (5-station circumradius, min over +-2), SLOPE-LIMITED
  along the lobe (CAP_SLOPE 1/world - the raw cap jumped 0.06 -> 0.52 in
  two stations at a tight loop and creased the blur); tight bends keep the
  base intact +-TIGHT_K stations with a ramp (without it, narrowing beside
  the clamped fold cut slivers out of the thread). Tried and REJECTED: a
  symmetric (both-sides) cap - clean eyes zoomed in, but the noisy cap
  carved every hook's outer blur into lumps at normal zoom - and a
  3-station radius (noisier). PARAMS (appended to codec v2): pluckSize
  psz (0-2, 0 = sound only), pluckGhost pgh, pluckReach prc (run|lobe),
  physics phy. snappiness/snpy is RETIRED (no visible ring frequency left
  to scale; decay follows sustain) but stays in the codec tables, since
  dropping a param is a codec version bump. PHYSICS OFF: each build
  settles HIDDEN (chunked ps.step(1/60), <= 22 ms per frame, the normal
  sleep gate with temperature ignored, caps 10 sim-s / 45 s wall) behind a
  centered animated trefoil loader (no text; reduced-motion variant), then
  never steps; the reveal plays after. Taps pluck, drags pan; auto plucks,
  flow, pulses, traversal and the reveal all run frozen. Toggling off mid-
  motion settles visibly (12 s wall cap) then freezes; physics sliders
  while frozen re-settle visibly and refreeze. Measured at gs 18: load
  ~5 s desktop (195 steps), ~26 s at 4x CPU throttle (physics ~14 ms per
  step) vs the physics-on intro at ~5 fps for ~14 s; at rest both modes
  cost the same (the sleep gate already stops stepping). Probe hooks:
  __knotPluck, __knotPluckState, __knotPerf, __knotSetPhysics,
  __knotSetPhysicsParam, __knotReplay. PROBE GOTCHA: a legacy `seed=`
  probe URL that already carries a key IGNORES a second copy appended
  after it (URLSearchParams.get returns the first) - REPLACE `mf=1` with
  `mf=0`, never append. Known: at the defaults the median tapped lobe gets
  the 0.45h amplitude floor (psz 1.5-2 reads better at default zoom);
  short lobes inside junction web footprints show a halo, not a blur.
- KINK EYES (worktree agent, 2026-10-11; Levi: "This twist is getting too
  squished" - crossing 305 at `?k88dtb.oHFEfg` parked at the 3.2-ctrl kink
  floor, its eye a closed notch). Every kink (a self-crossing whose two
  passes are chain-order neighbors) now rests with an OPEN, round eye.
  TARGET + CENSUS: hole = 2 x (largest circle inside the loop's RENDERED
  centerline - half width) >= 0.8 widths, every kink, at rest, headed
  real-time Chrome. Before -> after (min / median widths; kinks under):
  user 0.17/0.36 -> 0.97/1.24 (16/21 -> 0); default 0.20/0.72 ->
  1.10/1.25 (12/17 -> 0); tw .64 0.08/0.45 -> 0.88/1.17 (17/17 -> 0); tw
  .42 0.35/1.09 -> 1.27/1.44 (5/17 -> 0); knot mode (19ven80, mf=0)
  0.22/0.32 -> 1.05/1.27 (20/20 -> 0). THREE CLOSERS, each measured (per-
  loop-particle phase attribution through the probe() hooks + settle
  traces): (1) LASSO DRAIN - every kink is one lattice motif (8 ctrl, 3.29
  world of rest material at slack .55); the initial transient pulls it
  out through the crossing (8.0 -> 6.65 ctrl in 0.5 s), then the contacts
  go STATIC at ~0.6 s and freeze what is left; (2) FAIRING is curve-
  shortening on a closed loop (-21.6e-3 per particle per substep against
  bending's +26.5e-3); (3) ASYMMETRIC REPULSION - the +-6 ctrl same-chain
  exclusion hides an 8-ctrl loop's own across-eye pairs while each arm is
  still pushed INTO the eye by the opposite tail. Material alone is NOT
  enough: holding the full lattice loop left knot holes at 0.30-0.49, the
  arc going into a narrow neck. FIX (particle_system.ts): (a) EYE RATCHET -
  a budget of 7 widths of REST material (structural rests; segments rest
  0.16-0.64 world per ctrl, so ctrl is not a size) in settled-shrink
  units, P3.39 form (0.015 ctrl per slide, mobility-scaled, from the
  current gap), FIRST in the clamp stack. The jn ratchet and a twist
  twin's soft ratchet on a kink pass's outer side INTERSECT with it
  (neither takes the other's unmet budget; both short = the pass holds) -
  both sequential orders failed measurably (jn last walked a kink back
  into its loop 8 -> 6.8 ctrl; kink last parked a joint on the crossing, a
  standing rider that never slept; the twin's 3.3-ctrl budget conveyed a
  fat kink 8.34 -> 8.01). Ordering clamps still always win, so a MIN_PASS
  convoy can still take a little (seen: 8.0 -> 7.8). (b) EYE PRESSURE -
  pairs of one loop at least 35% of its material apart repel toward the
  CHORD of a round eye, D sin(pi Ds / L) (Ds = their rest arc apart, L =
  the loop's rest arc between the bindings, D = max(repulseDist, 2.6
  widths); since K41 - a flat 2.4 before, see below) with
  applyRepulsion's 3D law and stiffness (which now skips them via
  topology.kinkOf). (c) Kink loops skip fairing
  (a residual 0.15/0.3 changed roundness by nothing). VERIFIED: browser
  sleep sweeps, 8 seeds x default/fat, 16/16 asleep at sim 7.0, riders 0
  (baseline 13/16 - 3 fat seeds never slept); gesture battery, 6 kinks x
  hold 6 s / pull 0.5 / cinch 1.2, 18/18 re-slept, riders 0, eyes >= 1.0
  widths after; crossing-gap scan clean at all 5 URLs (kink erase spans
  0.62-0.89); vitest incl. quiescence green; golden REGENERATED (both
  golden knots contain kinks - 2 and 4; kink-free knots stay
  byte-identical). RESIDUALS: at tw .64, 3 of ~152 kinks over 8 seeds rest
  at 0.56-0.78 widths - BOXED kinks (a fused joint on one side, the 1.6
  corridor floor on the other) keep only lattice material, whose round
  loop leaves at most a 0.64-width hole at that width (pressure stretches
  it ~20%). tw >= 0.72 does not sleep in the baseline either (standing
  riders: 2/4 at .72, 0/4 at .8 in both builds). The phone's 3.37-ctrl
  state did not reproduce on desktop: a 1e-3 initial jitter barely moves
  the settle (it is contractive at that scale), so engine math or prior
  play put it there; the ratchet now blocks the drain either way. LORE
  (flat law): 2.8 widths PUMPED (2/8 fat seeds never slept: once the eye
  distance outruns the depth tents' z separation, pressure on the arms
  beside the crossing fights the coupling - lags 0.5-1.4, mv bursts to
  1e-1 through the friction switch); 2.6 inflated default eyes (median
  1.25 -> 1.34) without lifting the boxed outliers. PROBE LORE: a vite-node harness that
  builds the scene with main.ts's own calls (parseParams,
  generateLatticeKnotwork, the maze plan/apply) and steps step(0.1)
  frames (pixi caps a frame's dt at 0.1 s; gs 18 runs ~5 fps here)
  reproduces the browser's physics exactly - identical spans - at 8-15 s
  per scene, 14 in parallel; attribution experiments take minutes, not
  hours. Wrapping ps.probe() decomposes every solver phase per particle.
  And the contacts go globally STATIC ~0.6 s into the hero settle: slides,
  and every along-thread ratchet with them, act only in that window and
  during gestures - a budget cannot "grow in" during the settle.
  K41 SLEEP REGRESSION (2026-10-12, worktree agent): after 9920fab the
  rect user link (?s=1471kin&gs=12&rep=1&bd=1&sm=.25&ga=0&tw=.64...) and
  the fat knot link (?s=p9ar6&mf=0&rep=.4&bd=1.75&sm=.7&tw=.52) never
  slept (~100 ms of physics per frame at rest). Three causes, attributed
  per particle and phase, each confirmed by a SAME-STATE switch (one
  settled state, one mechanism toggled; the knob tree lives in
  .claude/probes/K41/exp): (1) applySegmentCollision's "true-3D" capsule
  solved its closest points in 2D and read z there. A twist eye's arms
  run parallel in the plane with opposite z slopes, so that point jumped
  between segment ends and the two final sweeps overshot in turn - a
  period-2 limit cycle, mv pinned at 1.9e-2. Solved in 3D now (exact
  early-out on the 2D distance). PRE-EXISTING: the fat fabric (rep .4,
  bd 1.75, sm .7, tw .52, gs 18) failed 4 of 9 seeds even on df373b5; all
  sleep now. (2) The flat eye-pressure target asked the loop's two ends,
  which flank the crossing, to stand a diameter apart: kink crossings
  rested pried 0.04-0.06 open against the coupling (~0.01 now), and the
  squeezed neighbor eye fell into (1). The chord law asks nothing there;
  D 2.6 keeps the flat-2.4 eye sizes. (3) A twist ratchet conveyed a
  plain pass 2.0 -> 1.34 ctrl into a fused joint's unmet jn budget, and
  the joint's bridge arm rode the crossing's over thread at the hard line:
  a standing rider (pre-existing: df373b5 stuck there on 1 of 8 jittered
  starts). The ratchet INTERSECTION now covers every pass with a jn
  record and a twist twin, and PassCover continues THROUGH a fused joint
  onto its other arms with the remaining arc - the joint is one material
  point, and a joint lattice-forced 2.0 ctrl from its crossing (tw .64,
  seed 3zz2a1) can never clear the over thread. AFTER: both links asleep
  at sim ~7 (wall ~9 s), frame cost at rest 111/119 -> 5/8 ms, settle
  cost unchanged. Census (min/median widths): user 0.96/1.26, default
  1.10/1.22, tw .64 0.91/1.23, tw .42 1.11/1.29 (its D is repulseDist;
  was 1.27/1.43), knot 1.04/1.22. Browser sweeps 32/32 asleep (8 seeds x
  default, tw .64, fat fabric, fat knot). BOXED kinks (span 8, lattice
  material) rest smaller than under the flat law, which bought them size
  by prying their crossings open: default 3zz2a1 X304 0.78-0.80, tw .64
  five at 0.64-0.74 (K29). Guard: test/physics/sleep.regression.test.ts.
  PROBE LORE: a still press is a render-only tap-pluck since df373b5
  (tugs start past a 4 CSS px slop), so a "hold" probe must move ~12 px
  first - the battery above held nothing.
- PER-PIXEL CROSSING GAPS (G1 of the GPU migration, K1; worktree agent,
  2026-10-11, rebased onto 31c3c91): every crossing gap is a CASING MASK in the
  ribbon fragment shader (render/gap_mask.ts) - an under fragment hides
  within (over half-width + margin) of the over pass's local centerline
  polyline, restricted to the crossing's arc window along the under
  thread. DELETED: the erase grid, the over-fill copies (PatchGridMesh,
  update/repaintFromRibbonWindow, aJoint + the fill shader) and the fade
  strip. The over thread is never touched, a hidden under pixel shows
  whatever the base layer drew beneath (so K21's backgrounds can draw
  first), and the gap edge is the exact offset curve of the over
  centerline - no lane caps to meet acute thread edges as wedges, slits
  and notches (crossing 57 at the tw .64 rect URL). DATA: one
  page-lifetime RGBA32F slot table, texelFetch only. A row = 9 header
  texels ORDERED BY FIRST USE (texel 0 alone - the bounding circle grown
  by the reach of interest - rejects a slot), 7 chunk chords + one
  capsule radius, then up to 57 polyline points, one texel each [x, y,
  u = (next - this) / |next - this|^2] (division-free segment tests).
  Slots = registered crossings, a 64-slot emergent pool, 4 marker discs.
  Ribbon vertices carry up to 4 slot ids (flat vec4, one lane per window
  across its whole range, +-1 sample - the fragment's arc test does the
  real windowing), the sample's arc turn as a unit vector (decoded per
  VERTEX into two linear varyings that wrap at 0/1 and at 0.5; the
  fragment takes whichever is smooth across its triangle, by fwidth) and
  the tangent. LOOK: gapMode "perp" (default, a constant-width casing;
  "arc" keeps the P3.21 arc-length margin); the fade is arc length along
  the under thread. Kept from the erase era: neighbor/twin/self midpoint
  splits, connected-overlap windows, same-chain arc exclusion on
  self-crossings, and the junction clearance solved PER SIDE on the CPU
  exactly as the erase era capped its lanes (margin by the shortfall
  beyond the silhouette exit, floor 0.5; then the fade, floor 0.45). A
  window also ends once it is the fade's ARC extent past the all-lanes
  casing exit (a narrow eye's far wall), and the fade dissolves over the
  last half fade before a window end instead of being chopped. Junction
  fans take only a FOREIGN over thread's silhouette, inset one pixel;
  free-tip caps take the full mask. Reveal gating rides the slot
  strength ramp; the yarn and fillet armReach read underWindows; the
  render-only plucks' node footprints come from the same solve (under:
  the all-lanes casing exit; over: the over pass out to where its ribbon
  clears the casing band, +0.12, floor 0.35). Same-state A/B toggles on
  the renderer: maskEnabled, gapMode, smoothMin, protect, tipDiscScale
  (then update()). THE PROTOTYPE REVIEW'S RESIDUALS: (1) PROTECT - a
  cinched cyclic triangle (a over b over c over a) squeezed below the
  casing width hid each thread exactly where it must cover the next (a
  dark triangle at each crossing; master's draw-order fills let one
  thread win). Where a slot's under thread A is itself the over pass of a
  neighboring crossing (A over B), the slot's margin and fade are waived
  for A's fragments that lie OVER B'S RIBBON: inside an arc interval
  along A (per side the straight-thread overlap h (1 + |cos|) / sin, sin
  floored at 0.25, or the overlap MEASURED by protectReach where the
  threads bend along each other, plus a half-width - the interval only
  bounds the search) and within h of B's local centerline (a protect
  polyline per side in the slot row: B's stretch that A's ribbon can
  reach, points 0.2 apart, up to 16, circle- and capsule-culled); the
  over silhouette still hides. Each refinement was measured first, same
  state: the straight-thread interval left the far end of bending
  overlaps to the margin (user x170: 19 naked px, all freed by widening
  slot 93's interval 0.15), and waiving the margin over a WHOLE interval
  erased the casing line between two threads along shallow crossings'
  long intervals (user x8 at rest: a purple thread touching a blue one
  with no dark line - the protect toggle changed 5059 px there, per-pixel
  431, all of them lighter). (2) FAR-BRANCH SMOOTH-MIN for the concave
  CREASE (ring x7/x82: on the inside of an over bend tighter than the
  casing the distance field creases along the medial axis): edge-band
  fragments blend their nearest distance with the nearest point of a
  branch more than farK segments away (polynomial smin, radius 0.3 (h +
  margin) clamped to [0.03, 0.15]); farK is sized on the CPU so every
  point of a straight run beyond it is more than sminK farther, where
  the blend is exactly the plain distance. (3) The merge-core hairline
  (user x160) was a fused bridge's tucked-cap CORNER outside the 0.99 h
  tip disc's chords (a 16-gon's chords pass cos(pi/16) inside its
  radius; master's over-fills happened to cover it): the CAP COVER disc
  is 1.06 h with every rim point clamped into the bridge's own strip
  (0.995 h) and to 0.99 h behind the tuck point (a plain wider disc
  rounded into the backdrop and neighbors' casings) - what remains is
  open item (b). (4) WebKit dropped: the phone target is Android Chrome
  (Pixel 11). MEASURED (desktop RX 6800 XT, D3D11, 3200x1800; master ->
  G1 with a868f31's physics, [brackets] = on df373b5 before the rebase).
  CENSUS (pixel census vs ideal casing geometry, each build vs its own
  spec; overcut = cut beyond the gap, naked = over thread missing): user
  rect URL overcut 1493 -> 110 px (90 -> 7 crossings, mostly the x57
  artifact below), naked 1011 -> 11, merge 10506 -> 11021 [1098 -> 1, 510
  -> 5]; fat 6/72 -> 0/0; ring overcut 18 -> 0 [20 -> 0]; kink, knot,
  thin rect and both default URLs 0/0 in both (merges: defaults 32 ->
  41, ring 256 -> 297 - webs over casing bands and the joint clearance,
  see the probe lore). (On a868f31 the user and fat URLs never sleep -
  one standing rider, a static 1.9e-2 standoff - so those censuses score
  near-rest frames; df373b5 slept both at sim 7.) KINK SITES (the 108
  kinks of the 8 URLs, open eyes): 0/0 in G1 except user x57 - 77-118 px
  that slot 57 alone hides (same-state slot clearing), each within its
  own casing reach of the over centerline (0.34-0.46 vs h + margin 0.47)
  where that over thread dives under a third thread: the census stops
  its polyline at half the neighbor gap, the renderer at NB_CLEAR 0.8,
  and the continued casing keeps a dark line between the under thread
  and the third thread (master: naked 206 at x57, 70 at two fat kinks).
  The ring URL's crossing 30 (the old kink-loop tip spur) and its 12
  on-screen self-crossings crop clean in both. SMOOTH-MIN PROOF
  (probe_smin, physics frozen): user 634/634 changed pixels justified,
  ring 135/135, fat and kink 0 changed [user 555/555, defaults 58/58,
  thin 86/86, ring 168/174 - 6 px at one self-crossing's exclusion
  boundary] - the blend never moves a straight run (it caught the
  padding-segment bug, see the render lore). PROTECT A/B (same state,
  naked over-thread px off -> on): user URL 314 -> 1; knot mode at gap .4
  260 -> 0; the user maze at gap .4 9847 -> 54 (64 -> 14 crossings)
  [interval-only: 7608 -> 209, 182 -> 0, 28 -> 0]; protect never darkens
  a pixel. GESTURE BATTERY (holds 6 s, pulls 0.5, cinches 1.2, releases,
  rests; census per capture; master -> G1): fat knot URL, 31 captures:
  overcut 0 in every one, naked 0-7 px; user rect URL: overcut 1230-1663
  -> 89-704 px per capture (pulls highest, partly the x57-type census
  artifact), naked 740-1732 -> 1-14 through the first three pairs, then
  70-198 once repeated cinches have squeezed the x170 triangle into the
  silhouette-level cycle of open item (d), and 276 at one cinch
  (x134/x135). FLICKER under flow: 0 spike pairs in both (user,
  ring; 92 pairs each). GPU readback STALE 0 on every layer (user, ring,
  defaults, kink) [knot]; same-state re-renders 0 px over 8 passes
  (user, ring, defaults, kink). PLUCKS [0 update() calls and a
  byte-identical slot table per pluck; partner casing-band pixels changed
  mid-pluck 630/7543 vs master 477/7498 - both builds: the overlay's
  under-node clip quotes casing() = h + gap, the band reaches h + gap +
  CUT_BIAS]. GPU DRAW: user 0.79 -> 1.78 ms/frame, ring 0.43 -> 0.92,
  defaults 0.85 -> 1.94 (the prototype: 2.83 at the user URL); draw
  calls per frame 419 -> 47 (user). The protect cover is ~0.17 ms of
  that at the user URL, ~0.15 from the code's mere presence (a build
  whose branch is never taken costs the same: register pressure). CPU
  [update() 12.0 -> 5.7 ms/call at the user URL; CPU render 7.3 -> 4.0
  ms/frame at rest]. PHONE (Pixel 11, PowerVR CXTP-48, Chrome 154, over
  adb; no GPU timer; on f1bbfcc): defaults 39 -> 60 fps at rest under
  flow (update() 32 -> 15 ms/call); user and ring URLs 60 fps on both
  builds (update() 14.0 -> 8.2 and 9.2 -> 6.1 ms); fw=0 at vsync on both
  - the gap shader is not the phone's limit, the CPU solve it replaced
  was. CAP COVER [draw-order sensitivity near every fused tip, same
  state, base chains reversed: -30% user, -46% defaults, -70% ring].
  STILL OPEN: (a) GPU cost ~2.2x master's on the desktop - not the
  phone's limit today; next levers: an analytic (loop-free) protect test
  to win back the register pressure, a zoom-aware screen-space polyline
  tolerance, a per-point far-branch gate, dropping the globals fetch;
  G3's shared sample texture replaces the per-slot polylines anyway. (b)
  x160 keeps a faint short tick where a wedge flank meets a tucked bridge
  inside the overlap core (the field's FIELD_BLEND_MIN blend differs
  from the raw ribbon) - G4's webs. (c) A fused tail riding its host for
  a stretch (user tips 0/1 at the maze entrance) is still draw-order
  sensitive - pre-existing. (d) What protect cannot fix: a
  SILHOUETTE-level cycle - three ribbons overlapping at one pixel, each
  over the next, so all three hide. Attributed after the gesture battery
  (same state, each slot cleared in turn): user x170's 52-71 naked px sit
  inside the silhouettes of all three crossings of chains 1 > 2 > 0 > 1
  (slots 170, 94, 93); also x134/x135 in one squeezed cinch. Breaking it
  needs a winner per pixel (e.g. waive a silhouette whose over thread is
  itself hidden there by the third thread).
- MAZE STATS + DAILY MAZE (K19 + K20, then K47 + K56 saved attempts and
  the front door, 2026-10-12; the commit messages hold the design notes
  and verification records). STATS: the definitions live in
  game/maze_stats.ts (time = first move to the dot's arrival, hidden time
  excluded; efficiency = optimal / the route you ended on, shown once
  solved, rounded down; distinct junctions; distinct dead-end tips, only
  with deadEnds on; a g/d/b move log for sharing).
  DAILY - binding rules: (1) a daily's design comes ONLY from its frozen
  definition (ui/daily_link.ts DAILY_V1 = codec v3's defaults + a seed
  from the day number), never PARAM_DEFAULTS; to change the daily, append
  DAILY_V<n+1> with fromDay a few days ahead (open tabs cannot learn
  it), never edit a published one; test/ui/daily_link.test.ts pins
  dailies #1-#3 (a failure there means generation code moved every
  daily and every link). (2) Day numbers are the player's LOCAL date
  counted in UTC calendar days (game/daily_calendar.ts), Daily #1 =
  2026-10-12. (3) A page is the daily only while every param but
  DAILY_EXEMPT_KEYS (playback preferences: the Sound folder, cameraMode,
  Touch & feel, physics on/off) equals the day's design (isDailyDesign,
  K56). Any other edit (panel, seed row, dice) LEAVES it: the attempt is
  parked, a toast ("Left Daily #N. Your attempt is saved."), the bar
  becomes a token, the solve on screen plays on as an ordinary one; the
  Daily button returns. Exempt edits made on a daily are stored as
  prefs (only what the player changed) that every daily opens with.
  MAZE_PARAM_KEYS (sameMaze) names the walk-graph params: a test requires
  every DEFAULT_MAZE_PARAMS key there, and none may be exempt. (4) Links:
  NO query = today's daily, the bar stays bare; `?daily` = the same
  (rewritten bare); `?daily=<n>` (1..today+2) stays in the bar; `&k=v`
  after it keep the daily only for exempt keys; ANY other query is an
  ordinary design; K20's `?daily=<n>.<delta>` opens as the design it
  describes and is no longer written. (5) Records: localStorage
  `knotmaze.daily`, ONE document `{v: 2, days, prefs}` (v1 reads as v2
  without attempts) - bump `v` for any shape change, never overwrite a
  newer one; every access is wrapped and the page must boot and play
  without storage (then all of it is session-only). The first finish is
  official, later ones replays; streaks count results whose attempt
  began on or before their day. Share = a Wordle-style move grid + the
  `?daily=<n>` link, native sheet on coarse pointers. (6) SAVED ATTEMPTS
  (K47, game/daily_attempt.ts): an attempt IS its tap list
  (FabricMazeController.taps; replay() rebuilds path, meters, stats, move
  log) plus active time, start time + day, and a walk-graph fingerprint
  (a moved maze refuses the replay). Saved after every move, on hide and
  pagehide, every 10 s while running and before any rebuild; restored
  whenever its daily opens, the clock PAUSED at the saved time until the
  intro ends or the next move. In an unfinished official attempt Reset
  path backtracks to the entrance (logged, priced, clock running; none
  in trail mode); in a replay it starts over. A finish drops the
  attempt; a tab coming into view adopts a newer one another tab saved.
  PROBES: `__knotDaily()` (taps, saved attempt, prefs), `__knotPlayDaily
  (n)`, `__knotFabric()` choices' `farDeadEnd` and `routeToDeadEnd
  (exclude)`; `.claude/probes/K19-K20/` holds probe_daily.mjs (front |
  resume | leave | reset | finish | tabs | prefs, `:phone` variants, and
  K20's desktop | phone | nostorage | tz | deadends; each ends in a CHECK
  summary), run_probes.ps1, scan_dailies.ts (the day scan; `--golden`
  prints the golden test's fingerprints) and the results. Editing src/
  under a running probe reloads its page mid-solve. Serve an agent's dev
  server with a private vite cacheDir (that folder's
  vite.private-cache.config.ts wraps the served checkout's config):
  worktrees share node_modules through junctions, and a plain `vite`
  re-optimized the shared `.vite` deps under other servers.
- SHADER BACKGROUNDS (K21, 2026-10-12; the commit message holds the
  measurements). `background` (bg=: none | vellum | mist | wash | silk |
  aurora | contours; default VELLUM) + `backgroundIntensity` (bgi=, [0,
  1], default 0.5; 0 = off like none) - render/background*.ts. A
  SCREEN-FIXED layer, the stage's first child: the effect's fragment
  shader fills a LOW-RES RenderTexture (0.34-0.75 texels per CSS px;
  vellum 1 for its grain) only when the drift clock says so (10-15 fps,
  6-10 on phones; static vellum once per change), and a dithered blit
  stretches it over the canvas every frame. Crossing gaps discard (G1),
  so they show it, and still read as gaps over every effect at
  intensity 1. RULES: (1) none (and intensity 0) adds NOTHING to a frame
  - same-state A/B vs master is 0 px; keep it so. (2) Colors = the page
  ink + three gamut accents (the design's own hue/arc/palette), resent
  on every recolor; the seed offsets the noise. (3) FOG = BACKGROUND: with
  an effect on, the fog of war draws the background texture at the
  pixel's screen position (FogBackdrop; the DisplacementFilter wobble is
  folded into the alpha lookup, the dither is the blit's), so fogged
  pixels ARE background pixels - a flat fog read as a flat square. (4)
  K24/K6 HOOK: needsFrame() + tick(dt, sceneActive); the drift pauses
  after 2.5 s of an otherwise still scene (main.ts sceneAnimating()
  stands in for K6's flags) and stops under prefers-reduced-motion.
  Screen-fixed, not world-anchored: a backdrop at infinity - camera moves
  never drag it or force a re-render, zoom cannot alias it, and the fog
  can sample it. REJECTED: cells (Voronoi seams form a dark network that
  competes with the maze's faces), dither (a screen door that crawls
  under drift), linen (a 4.5 px weave that moires at fractional DPRs).
  LORE: this desktop's Chrome reports prefers-reduced-motion: reduce
  (Windows animation effects are off), so backgrounds never drift here -
  probes emulate no-preference; a warp of a warp amplifies its time
  offsets (mist's clock runs at 0.35) and contour lines that move faster
  than ~1 CSS px/s read as crawling; calibrate contrast as the p2-p98
  luma spread of a knot-free margin (about 9-13 levels at 0.5). Cost:
  +0.24-0.34 ms GPU per frame at 3200x1800 (the full-screen pass is most
  of it). Probes: `.claude/probes/K21/`.

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

RENDER LORE (2026-10-11, GPU junction field): **blend COMPOSED colors,
never palette U from different sources.** The accent strip is ordered
[bandA reversed | base | gold | bandB], so a U lerp between two arms (or
a fill and the field) sweeps every family in between: two near-white
pulse cores (U 1.5 and 234.5) blended THROUGH gold, and a traveled /
untraveled pair stepped inside 1/6 of the blend instead of ramping.
Compose each source with its own accent first (exactly the section
shader's mix(section, acc.rgb, acc.a)), then mix RGB. Interpolating U
between ADJACENT samples of one thread stays fine (that is what the
ribbon itself does). FLOAT DATA TEXTURES in pixi v8: format
rgba32float, scaleMode nearest (a float texture whose sampler asks for
LINEAR without OES_texture_float_linear is incomplete and reads black -
even via texelFetch; WebKit/mobile do not guarantee the extension),
alphaMode premultiplied-alpha (pixi sets UNPACK_PREMULTIPLY_ALPHA from
it before every upload), `precision highp sampler2D` (fragment samplers
default to lowp). Row-partial uploads go through a TextureUploaderWebGL
extension, which must be registered BEFORE the renderer exists (its
GlTextureSystem merges the uploader map at construction) - module load
of junction_field.ts does it. Texture `source.update()` runs its GL
upload synchronously, mid-tick. PARTIAL BUFFER UPLOADS: pixi's
`Buffer.update(sizeInBytes)` REMEMBERS the size (GlBufferSystem uploads
`buffer._updateSize` bytes at the next draw), so a bare update() after a
partial one re-sends only that prefix, and within a frame the LAST request
before the draw wins - over-fills kept stale paint/FX on the GPU past the
paint pass's prefix uploads (review round, measured by GL readback:
probe_glreadback compares every mesh's buffers against its CPU mirror).
Any buffer that ever gets a partial upload must pass explicit sizes on
every upload (ribbon_mesh `uploadAll`, `copyUploadPending`).

PROBE LORE (2026-10-12, K56): **a bare URL is TODAY'S DAILY** - fabric
mode with music, the trace + burn intro, the daily's HUD title, and a
SAVED ATTEMPT that the next bare load restores (a probe profile that
played once is no longer fresh). Probes that want a fresh default
design must pass a query (`?am=instant`: a random seed; `?<seed>.c`: a
given one); `?daily&am=instant` is NOT a daily any more (am is not a
preference) - daily probes wait out the intro (probe_daily.mjs
waitReady). Probes that want knot mode pass `mf=0`, and probes that need
a settled first frame without a reveal pass `am=instant` - as legacy
links (`?s=1471kin&am=instant`, still parsed) or after a compact token
(`?1471kin.<blob>&am=instant`). COMPACT LINKS: the app rewrites every link to one token, so
`location.search` has no keys to read - read settings via
`window.__knotParams()`. AUDIO IS GATED on a trusted user
gesture: a probe that expects sound must `page.mouse.click` (or press a
key) first, and `window.__knotSynth` exists only once the gate has opened
(scripts/diag_audio.mjs injects an OfflineAudioContext, which bypasses it).

PROBE LORE (2026-10-11): **the session scratchpad is shared by every
agent of the session** - another agent rebuilt `dist_before` under a
running A/B (the "before" stamp silently became a different commit).
Give every build/output a unique subdirectory and check the stamp's SHA.
rebuildFillets is GATED now: timing loops must call it with `true`, and
geometry injected into the fan meshes (the GPU census) survives only
until the next update() - wait for sleep and use a fw=0 URL. A rAF-to-rAF
TIME_ELAPSED query also counts GPU idle between a mid-tick GL upload and
the render (10-12 ms phantom "spikes" at rest): start the query at the
frame's first draw call (probe_gpudraw).

RENDER LORE (2026-10-11, per-pixel gaps): **a distance mask needs a
window, self-exclusion and connectivity - and an overlay needs its own
cut rule.** "Near the over centerline" is true of far more pixels than
the gap: restrict the mask to the crossing's arc WINDOW on the under
thread; on self-crossings exclude the fragment's own chain arc from the
polyline (a kink loop's window end and polyline start are adjacent
stretches of ONE thread - it masked itself, the crossing-57 slit); grow
windows only through CONNECTED overlap (eye walls that come close again
are not gaps). Junction fans are a different material: a full-casing
cut grooved webs beside the over thread, so they take only a foreign
over thread's silhouette - INSET one pixel, because an analytic AA ramp
centered on the over ribbon's MSAA edge lets the backdrop through both
partial coverages (thin dark seams). fwidth() must run at the top of
main (uniform control flow), and discarded fragments get no MSAA, so
the mask edge carries its own one-pixel ramp. A DISTANCE-based fade
follows any thread that lingers near the over thread (a narrow eye's
far wall): bound it by ARC past the casing exit, and dissolve whatever a
window end truncates. Caps (the joint clearance) go per side by the
shortfall, computed on the CPU - a per-pixel switch to the floor
mid-ramp renders as a hard edge. A COSMETIC margin may never hide a
thread where it covers another: in a cyclic triangle each thread is
the under of one crossing and the over of the next, so per-crossing
casings applied blindly darken all three - waive margin + fade where
the under thread is itself an over, and ONLY over the ribbon it covers
(a protect polyline per side): an arc interval alone erased the casing
line between two threads along a shallow crossing's long interval, and
a straight-thread interval was short where the threads bend along each
other. The silhouette still hides. COST: the per-fragment search is ALU-bound before it is
fetch-bound (desktop RX 6800 XT): halving the segment tests saved 0.28
ms/frame at the user URL while fetch count, chunk size and chunk ORDER
barely moved it, and center-out or best-first chunk orders ran 8-10%
SLOWER than index order (neighboring fragments start in different
chunks and exit at different times; the SIMD group runs the union).
What paid: one texel that rejects a slot, division-free segments (store
u = d / |d|^2 per point), and rare branches (self-exclusion, the
far-branch smooth-min) moved into a second search ordinary fragments
never run.

PROBE LORE (2026-10-11, per-pixel gaps): an IMPLEMENTATION-INDEPENDENT
pixel census (score the final frame against ideal casing geometry per
under-ribbon lane, connected to the crossing core) is what made the
erase grid and the shader comparable - but its "merge" also counts
intended behavior (the near-joint clearance narrowing, webs over casing
bands), and its "overcut" cannot know a spec it does not model (protect
intervals waive margin on purpose): attribute with page-side toggles and
count DARKER vs LIGHTER changed pixels before reading a count as a
failure (protect: 25820 px lighter, 0 darker). Census totals of two
captures of one frozen state also moved by a few hundred px in
directions a lighten-only toggle cannot cause (overcut UP with protect
on) - not understood; the pixel diff is the exact measure. A blend that must be
inert somewhere needs a PROOF BY PIXEL (probe_smin: same state, blend
on/off, every changed pixel tested on the CPU against the shader's own
condition) - it caught padding segments whose raw indices escaped the
far pass's skip range, so a polyline's own end read as a second branch.
A same-state A/B also needs the PHYSICS frozen when the knot does not
sleep (`__knotPS().step = () => {}`): freezing flow and paint is not
enough - on an awake URL the smooth-min proof read 486 of 500 changed
pixels as unjustified, all of them motion between the two shots.
Census "overcut" at one crossing is attributed exactly by clearing slots
one at a time in the frozen state (probe_overcut_attr: which slot frees
the pixels) - its per-crossing ideal stops the over polyline at half
the neighbor gap, the renderer at NB_CLEAR 0.8.
DRAW-ORDER REVERSAL attributes uncovered ribbon overlap: re-render one
state with the base chains drawn in reverse; every changed pixel is an
overlap no overlay covers (probe_tipab TOGGLE=reverse - it found the
tucked-cap corners). Fabric A/B crops need the PAINT CLOCK PINNED
(`renderer.paintClock = 100`) and the pointer parked off the maze. And
an off-screen probe window can STALL: on 2026-10-11 the desktop's
displays spanned x -1920..1920, the window at 2200,50 lay beyond every
display, Chrome's occlusion tracking treated it as hidden and stopped
its rAF, and probes hung waiting for sleep. Launch with
`--disable-features=CalculateNativeWinOcclusion
--disable-backgrounding-occluded-windows --disable-renderer-backgrounding`.

RENDER LORE (hard-won, 2026-10-11): **a junction overlay must match
the ribbons across their whole WIDTH, not along their centerlines -
and a stale cache can hide that it doesn't.** The 16c field agreed with
each arm only on its centerline, so every primitive boundary crossing an
arm's width (wedge flanks at 0.97 fillHalf, disc rims, over-fill window
ends drawn on top) showed the difference as a hard line. It stayed
invisible while the section cache was stale (ramps sat ~1 ctrl off their
joints, so nothing near a joint was strongly colored); fixing the cache
made it the dominant artifact. Certify overlays with a FIELD-vs-RIBBON
census over arm footprints (`renderer.fieldProbe`), excluding true
ribbon overlap (whose visible color is draw order, not the field).
PROBE LORE, same round: the renderer resets every fill/erase mesh's
`visible` each frame (hide with `renderable = false`, or per layer);
the custom section shader ignores `mesh.tint` (tint attribution only
works on default-shader meshes such as erases); and the URL-state
rewrite drops `#hash` on load (pass probe args through page.evaluate).
Three "no effect" toggles in a row meant the probe, not the renderer.

RENDER LORE (hard-won, 2026-10-10): **a custom pixi shader ignores
mesh.texture.** Pixi v8's Mesh texture setter only updates
`shader.texture` (bookkeeping) and GlMeshAdaptor binds uTexture from
mesh.texture for the DEFAULT shader only, so the shared section shader
kept the strip it was created with: `pathColor` NEVER reached the
ribbons (default gold), while the CPU-composed fillet fans used the real
pathColor - olive fans on gold paths at a khaki pc= (the user's "olive
smudges"). Any texture a shared custom shader samples must be bound via
its resources (`bindAccent`).

RENDER LORE (hard-won, 2026-10-09): **flat fills cannot represent a
field.** Once per-vertex V blending exists, ANY flat-colored overlay
(wedge, disc) over a ramping ribbon draws a visible step or stamped
circle at its silhouette — and per-primitive sampling (host-axis
discs, per-arm wedges) still leaks faint rim arcs wherever one
primitive's footprint crosses ANOTHER arm's material. Overlays must
evaluate the SAME continuous field as the ribbons (the 16c angular
junction field). Don't reintroduce point-sampled joinery.

RENDER LORE (hard-won, 2026-10-09, closed 2026-10-10): **the arc-wrap
family bit FOUR times before the root died.** `arcAt` and `sampleAt`
wrapped arcs modulo totalLength, so an OPEN chain's terminal
(arc == total) landed at arc 0: (1) `arcAt` collapsed traveled-bridge
paint spans to a point (fixed via `paintArcAt`); (2) `sampleAt(total)`
drew every atEnd tip disc at its chain's START (fixed by reading the
endpoint sample directly); (3) fillet flank samples at corner-cut
terminals flew to the chain START (fixed by `sampleAtSafe`'s clamp);
(4) the ROOT: `sampleAt`'s ring index math itself — (arc/total)*count
with modulo — maps ANY open-chain arc within one sample spacing of
total onto a phantom last→first chord (99.8% of the way to the OTHER
END for a clamped terminal query), which fanned fillet slivers from
every fused bridge junction (42 on the repro seed) and skewed the
whole open-chain parameterization by up to one sample. Fixed at the
root: `SplineSamples.closed`; sampleAt clamps and maps over count-1
segments for open runs. The per-call-site guards stay as
belt-and-suspenders. Diagnosis lore: the jarm probe "cleared" the
junctions because it evaluated PHYSICS positions while the SAMPLES
were the thing lying — a census must measure the same pipeline it
certifies (the P3.24 probe rule again, render edition).

RENDER LORE (hard-won, 2026-10-09): **the palette strip's ORDER is
load-bearing.** Per-vertex UVs interpolate linearly between samples, so
any two paint values that can sit on ADJACENT samples must be contiguous
color families in the strip — the original [base, gold, hover, bandA…]
layout swept the UV across the gold+hover texels at every band/base
boundary and rendered a thin bright hairline exactly at gradient ends
(survived the smooth-field fix: the FIELD was continuous, the UV PATH
wasn't; per-sample color dumps validate samples, not the path between
them). Current layout: [bandA reversed | base | gold | bandB]. Also:
flat-colored overlays (tip discs, fillet halves) must sample the paint
of whatever they VISUALLY OVERLAP — a fused-tip disc lies on its HOST's
face and wears the host's paint; arm-colored discs rendered floating
pale/gold dots wherever the two paints disagreed.

RENDER LORE (hard-won, 2026-10-09): **never destroy palette textures
mid-session.** Pixi's retained render state (bind groups subscribe to
texture resources) can still reference a TextureSource the frame after
a rebuild; destroying it null-derefs in `setResource` on every
subsequent render — the shared ticker dies and the canvas blanks, which
presents as "every checkbox toggle blanks the screen" (and can leave
half-rendered frames: fills without erase gaps). Palettes live in a
page-lifetime cache (`PALETTE_CACHE`, keyed by base color); rebuilds
reuse them. Attributed with a checkbox-toggle pageerror probe — the
rebuild itself kept working while the stamp's wall clock froze.

RENDER LORE (2026-10-09; MOSTLY RETIRED by Stage 26): **gamut locality
was load-bearing only for the old V-AXIS palette.** A V-ramp between
two section colors rendered every hue BETWEEN them (the V axis is a
PATH through the gamut), so adjacent sections had to sit close in V or
junction ramps painted rainbow stripes. Stage 26 replaced V with
per-vertex RGB and straight RGB lerps — unrelated adjacent colors now
blend DIRECTLY, which is the whole point of the new segments scheme.
Still true and worth keeping: any scheme whose ramps are expressed as
coordinates through a 1D gamut path (depth/strands still are, via the
subdivider) must keep adjacent coordinate jumps small, because a
coordinate lerp sweeps the hues between.

Still open in P4:
- ~~Textured background~~ - DONE as K21's shader backgrounds (the
  SHADER BACKGROUNDS entry above).
- ~~URL/param serialization for the remaining `MazeParams`~~ and the
  ~~daily seed~~ — DONE 2026-10-12 (K20; the MAZE STATS + DAILY MAZE
  entry): the last three plan knobs joined codec v3, and the daily maze
  shipped with stats, history and sharing.
- ~~Old maze mode~~ — RETIRED 2026-10-10 (commit bf86855): `md=1`,
  `core/maze.ts`, `game/maze_controller.ts`, `render/maze_renderer.ts`
  and their tests are deleted; `mf` is the only mode toggle.
- **Open artifact queue (updated 2026-10-11)**: the user's "occasional
  breaks in threads" (ring URL, phone, pre-e1cac59 maze - optimal 504)
  are SHARP DARK SPIKES at a crossing gap (crossing 67: a thin black
  triangle into the over thread, another along the under thread's cap)
  - erase-grid class, NOT junction bites (the erase grid is GONE since
  the per-pixel gaps, G1: a casing has no lane caps, so this class cannot
  recur in that form). NOT REPRODUCED: ~10 runs of
  the old maze (desktop + emulated phone with 4x CPU throttle, at rest,
  under flow, during pluck rings, through the ap=trace reveal) never
  produced one; the settle is chaotic, so the user's run reached a
  configuration ours do not. Next step needs a fresh repro on the
  current build (panel version string + screenshot). Census lore from
  the hunt: probe_bites' "third-thread bites" (erases cutting a joint's
  bridge beside the crossing, 61/63/78 at the ring URL) are real in the
  BASE layer but covered by webs in the final image; a rescue-patch
  repaint was built, measured, and DISCARDED (it drew faint edge lines
  and fixed nothing visible). Self-crossing censuses must restrict
  "the over thread" to the over PASS's local ribbon (a shared chain
  matches the under pass too); tight kink loops still confound it. One
  real leftover seen: a tiny dark spur at a kink-loop tip (crossing 30
  at the current ring URL) [not seen after KINK EYES + G1: crossing 30
  and the ring URL's 12 on-screen self-crossings crop clean on a868f31
  in both renderers]. The segments-scheme seams are RESOLVED
  (junction blend round). AGENT-MEASURED, NOT YET
  FIXED: (1) [FIXED late 2026-10-10: neighborGaps now gives an open
  chain's self-linked side the run to its chain end - first passes'
  chain-start cut 0.360 -> 0.482]; (2) latent
  seam-window wraps on open chains (applyTransversality's window, the
  slideCrossing/projectOntoChain windows, updatePassCover +-12 slots)
  index modulo len - a seam-relative clamp like addDepthTent's;
  (3) [GONE with the erase grid in G1] the lane-cut limiter stack.
  Optional look: a narrower two-arm fillet blend
  band (FILLET_BLEND_BAND 0.18 patch in the session scratchpad) for
  the residual tan RGB-mean crotches under segments. Icon set: user
  rejected the generated icons; a portable prompt was delivered.
  DONE: gamut UX (live recolor), physics junction spacing, reveal FX
  (all styles), fillet spurs/overhangs, gap jitter, terminal-pass
  guard, olive smudges (pathColor binding).

**P5 — growth animation** (animate the knot being drawn/growing) and
**P6 — flourishes** (polish) remain untouched after P4.

**Deferred, not phase-blocking** (pick up opportunistically, not
before P4 unless the user asks):
- P2 polish still open in Follow-ups: the "make the hero settle
  visibly angular" zigzag→curve blend, and slack~0 thread waviness.
- `test/sweep.manual.test.ts` was reviewed and KEPT (2026-07-24): a
  skip-gated (`SWEEP=1`), asserts-nothing node-side census of crossing
  quality across seeds — zero CI cost, self-labeled "not a regression
  gate." If it ever breaks against a `ParticleSystem` API change,
  delete it rather than fix it. (The `public/` suicide service workers
  from commit af2efb4 were removed 2026-07-24 — their stale-worker cure
  had long since taken effect and nothing in the app registers a SW.)

**CANDIDATE perf follow-up — move the sim to a Web Worker (NOT taken;
recorded 2026-07-24).** The one multi-threading win with a good
risk/reward, if mid-drag perf ever needs it (currently ~32fps mid-drag
is playable; at rest the sleep gate makes it moot). Mid-drag the main
thread runs physics (~15.8ms) THEN render (~10ms) serially → ~25ms. The
render only needs a positions snapshot, so relocating the whole
(still single-threaded) `ParticleSystem` into a dedicated worker
overlaps them → frame ≈ max(15.8, 10) ≈ 15.8ms, potentially 60fps
mid-drag, with the physics NUMERICS UNCHANGED (the sim just moves
threads; it is not re-ordered). Good fit already: `positions`/`zPos`
are `Float32Array`, so a `SharedArrayBuffer` backs them zero-copy for
the render read. Costs: (1) COOP/COEP cross-origin-isolation headers
for SAB (Vite dev config + a Cloudflare `_headers` file); (2)
marshaling grab/dragTo/release to the worker and sharing the extra
per-crossing render state (displayF, over/under, emergent crossings),
not just positions; (3) THE REAL TAX — the diagnostic harness
(`window.__knotPoint`/`__knotRenderer`, the sim/wall build-stamp
counters, the `diag_*` probes) reaches SYNCHRONOUSLY into
`ParticleSystem` from the main thread and is load-bearing per the
verification lore; it needs an async/shared-memory bridge. Architecture-
change-sized; rank it BELOW P4 unless drag perf actually bothers you on
target hardware. DO NOT instead parallelize the SOLVER: it is
Gauss-Seidel PBD (each constraint reads the prior one's writes — the
P3.26 double-sweep exists for exactly this reason); coloring it into
independent sets changes the numerics and would perturb the hard-won
equilibria, for a payoff only on the ~7ms collision slice. WebGPU
compute (particle count too small — dispatch overhead eats it) and WASM
threads (same SAB+coloring cost plus a language rewrite) are both ruled
out at this scale; single-threaded WASM for just the collision
narrow-phase is a separate non-threading raw-speed lever (2–4× on that
~7ms) if ever wanted.

## Verification rule (hard-won)

**Never use Chrome's `--virtual-time-budget` to screenshot anything
physics-dependent.** Virtual-time mode advances the sim only a fraction of
the nominal budget (~0.5 sim-seconds for a 12s budget), so screenshots show
an early mid-settle state, not equilibrium — an entire debugging session
chased "fixed" artifacts that only existed at true equilibrium. Use
`node scripts/diag_screenshot.mjs <url> <out.png> [settleMs]` instead: it
drives a headed, hardware-GPU Chrome in real time and reports the page's
build stamp plus `sim/wall` seconds (which must match; the on-page
bottom-left stamp shows the same counters).

## Follow-ups

- **The sleep gate counts SIM TIME (K63): QUIET_WINDOW 2.5 s,
  physics/sleep_gate.ts.** It counted 45 frames: 4.5 sim-s at <= 10 fps
  (pixi caps a frame at 0.1 s, and real-size settles are physics-bound
  there, so every design slept at exactly sim 7.0 = settleComplete 2.5 +
  4.5) but 0.75 s at 60 fps and in the physics-off load. A short window
  is NOT free: some designs are not at rest at 2.5 s - a bridge, an open
  tail or a kink's neighborhood snaps through to a new rest 3.5-5 s in,
  mostly under QUIET_EPS, so no window sees it start. 0.75 s froze 2 of
  1071 K46 designs before a loud snap and ~4% of a sample 0.05-0.17
  world from rest. Chosen by tripping every window on one trajectory and
  diffing each frozen state against a run that kept stepping
  (.claude/probes/K63 window.ts, gesture.ts): clean (within 0.05 world,
  no loud lull) from 2.25 s; 2.5 adds a margin. Sleep is ~5.0 sim-s
  everywhere (default design: desktop 12.3 -> 8.9 s wall, phone 13.0 ->
  8.8 s) and sim-at-sleep is comparable across frame rates. No window
  covers sub-QUIET_EPS creep: a ga=0 knot drifts ~1.5 world over ~50 s.
- **Physics broadphase rebuilt flat (P3.42): phys 85.9 -> 15.8 ms,
  10 -> 32 fps mid-drag at fat params.** applySegmentCollision was 73%
  of ALL CPU (measured via CDP profile, probe recipe: drag-wiggle 4s at
  the fat URL) - the cost was the per-call Map<number, number[]>
  spatial hash rebuilt 4x per substep, not the narrow-phase math. Now a
  zero-allocation counting-sort grid (forces.ts `buildGrid`), with the
  repulsion exclusion moved from the precomputed pair Set to a topology
  ctrl-distance test, and hot-loop Math.hypot -> Math.sqrt (hypot is
  several times slower in V8). Pair iteration order is preserved by the
  counting sort; cell ORIGINS moved from absolute to bounds-anchored,
  which shifts marginal broadphase catches - trajectories diverge from
  P3.41 (chaotic, statistically identical; both grids only guarantee
  catches within one cell size). Non-finite states now SKIP the force
  pass instead of collapsing the Map into one bucket (the old O(9N^2)
  NaN hang). TWO GOTCHAS measured during verification: (1) settle
  sweeps now report "asleep" at sim ~3.9s for EVERY seed (was 4.0-6.3)
  - not a physics change: the sleep gate counted 45 STILL FRAMES, and
  faster frames span fewer sim-seconds; quiet-start is unchanged. Do
  not compare sim-at-sleep across builds with different frame rates.
  (Until K63: the gate counts sim time now, see above.)
  (2) The pathological-wound regression test failed on a healthy state:
  its fixed 60s measurement window landed on a transient burst (the
  wound transient bursts to ~2e-1 near 50s, decays to the ~1e-2 band by
  ~110s - measured over 240s; the loud attractor by contrast holds
  1.3e-1+ with NO trend). The test now measures at 120s, past the
  transient, so it asserts the actual guarantee (no self-sustainment).
  Verified: fat+default sweeps 16/16; scans clean x3 URLs; gesture
  battery (hold/pull/cinch at 5 twist pairs) clean, re-sleeps; 20/20
  tests (suite wall time 122s -> 93s as a side effect).
- **Weird gap SHAPES at loop-end twists (wedge-slashes + thin slits):
  RESOLVED by curvature-faithful erase caps (P3.40).** The single
  reported "shape" was THREE under-erase mechanisms, separated only
  after per-primitive attribution: (1) WEDGES - the cap chord
  soft-clamp (CAP_DEVIATION_SOFT) flattened genuinely curved
  silhouette boundaries into diagonals and 5 coarse lanes rendered
  them angular; the chord clamp is REMOVED (a sharply-bent over
  thread's boundary is correctly curved), ERASE_LANES 5 -> 13, the D2
  spike-rounder stays (at 13-lane spacing real curvature passes under
  it), plus a [1,2,1] lane smoothing pass because the RAW level set
  carries polyline-discretization scallops that render as ragged torn
  caps (measured in the all-shapers-off A/B). (2) THIN SLITS biting
  bulbs/hairpin tips, two causes: (a) the erase grid's mitered width
  lacked the base ribbon's P3.34 concave-side turn-radius clamp - at
  tight folds the erase jutted past the ribbon's real inner edge and
  slashed the wall beside it; station widths now mirror
  RibbonMesh.update exactly (+pad). (b) grid SHEAR: the ride-scaled
  median-spread clamp let adjacent lanes sit at arcs UNITS apart, and
  straight grid quads chord across a bend - tint attribution showed
  one erase covering its entire hairpin-bulb interior. Replaced by a
  per-ADJACENT-LANE step bound scaled by local straightness (endpoint
  + midspan tangent checks so S-curves/full wraps can't read
  straight), enforced by TRUNCATION of the longer lane only - the old
  clamp's raising of short lanes toward a long median was itself a
  biting eraser (measured: shrinking the spread while raising stayed
  ate a chunk of the bulb), and truncated overlap is always repainted
  by the over fill riding the same overlap. (3) NAKED BITES past the
  fill: the erase certified its cut region against the whole over
  local polyline (reach ~5.3) while the fill repaints only its capped
  window - at bulbs the erase rode the far wall the fill never
  reaches. The over polyline is now RESTRICTED per direction to the
  fill's guaranteed window through a SHARED fillBound closure
  (twinExtend + P3.38 reserve + splits included): the same-geometry
  theorem, now structural (one closure, cannot drift). Verified:
  hairpin tip + the user's green hook (X186/X187) render clean curved
  gap bands at dsf 2-3; hold/pull/cinch battery at 5 twist pairs
  (incl. X177/X178 corridor, X0/X5 self) all clean, re-sleeps after
  every gesture; fat + default sweeps 8/8 (sim 5.2-6.3 / 4.0-4.2);
  diag_scan clean on fat/kink/default URLs; 20/20 tests; render
  ~10ms mid-drag at fat params (frame is physics-bound regardless).
  PROBE LORE: `window.__knotRenderer()` now exposes the renderer -
  tinting `underErases[i]` by index (emergent white) attributes WHICH
  primitive draws a wrong pixel; this cracked in one capture what
  three blind fixes missed. Session probe scripts die with the
  scratchpad - recipes: gesture battery = hold pair midpoint 6s /
  pull perp 0.5 + hold / grab 0.7 past pair, pull perp 1.2, release;
  sweep = 8 seeds x fat/default, expect "asleep" by wall 18s.
  LESSONS: (1) one artifact NAME hid three mechanisms - attribute the
  exact primitive under the bad pixel before choosing a fix class;
  (2) a shaper guarding a rare degeneracy must be curvature-
  PRESERVING or it becomes the artifact at the sites that need it
  most; (3) an erase boundary may be truncated but never extended
  past its solved exit - extension erases material nothing repaints.
- **The flattened-twist flip ("same as before" after P3.38): RESOLVED
  by the twist MATERIAL RATCHET (P3.39) - held twists now render as
  two ordinary separated crossings.** What remained after P3.37/38:
  a held/pulled twist whose eye flattened into a TAUT CHORD still
  rendered its flip as a color-to-color fill cap - tidy after the
  P3.37 bias, but pink fused to green with no dark gap IS the user's
  "parallel overlap" regardless of cap neatness, and no flat-layer
  cap assignment can fix it (the corridor is over-constrained: the
  two crossings' gap footprints sum past the corridor length, so any
  1D split either repaints a gap or leaves a dark pinch band; the
  correct render needs per-pixel masking). The escape: make the
  flattened state UNREACHABLE - the taut chord existed only because
  twist twins clamp at the generic MIN_PASS_SEPARATION 1.6 ctrl (arc
  0.77 at slack 0), too little material for the eye to stay open at
  the P3.37 world floor. Twist twins now hold a kinkSep-style budget
  twistSep = max(2.2, 5.2*threadWidth) ctrl, applied as a
  RATE-LIMITED RATCHET (TWIST_SEP_RATE 0.015 ctrl/slide,
  mobility-scaled): the clamp floor rises from the pair's current gap
  toward the budget instead of snapping. The snap version pinned fat
  seed 42424242 at mv 1.6e-2 FOREVER (hot at two steep crossings the
  weave would not let separate - the P3.31 full-authority pump
  shape); rate-limiting keeps a pinned pair's standing push
  sub-stick (~7.5e-3 world) and mobility-scaling lets the graduated
  friction weld strangle it, so the sweep sleeps again. Held/pulled
  twists now park at pairDist 1.23-2.43 with CURVED eyes (arcs well
  above chords, ctrl gaps 2.7-5.4) and every hold/pull crop shows
  fully separated over/unders - zero color-color contact for the
  first time in the saga. Verified: fat + default sweeps 8/8 (6.3-6.8
  / 3.9); census riders 0 fresh + post-tug, re-sleeps 16.3; cinch
  clean (cinch pairs sit at 4-8 ctrl, unaffected); scans clean; 20/20
  tests. LESSONS: (1) when a render corridor is over-constrained, fix
  the PHYSICS reachability of the state, not the paint; (2) a
  positional clamp is full-authority by construction - any clamp
  RAISE against unknown geometry needs a rate limit under the stick
  gate or it is a pump waiting for the right seed; (3) my own "tidy"
  judgment of a color-color boundary was the blind spot - the user's
  standard is NO thread-thread contact without a dark line, ever.
- **The pull-outward merge (the user's persistent artifact, still
  reported after P3.37): RESOLVED by the NEIGHBOR-GAP fill reserve
  (P3.38).** Recipe: outer twist, grab the thread between the
  intersections, pull outward slightly, hold - a blunt fill cap
  renders WELDED to another thread with no casing gap. The broken
  spot is NOT the twist itself (its two crossings stayed healthy,
  pairDist 1.0-2.0): it is the corridor between two ADJACENT NON-TWIN
  crossings (X177/X178 on the repro: same chain-0 arc, different
  chain-1 arms, so no twist machinery applies). The pull compresses
  the corridor (arc gap 0.916) and stacks the threads through it, so
  the higher crossing's over-fill marches to its 0.5-clearance cap -
  which lands DEEP INSIDE the neighbor's under-gap (the neighbor's
  erase footprint reached 0.73, oblique crossings project wide) - and
  because every fill draws over every erase (three flat layers), the
  fill REPAINTS the neighbor's erased gap: blunt cap flush against
  the neighbor's over thread. Diagnosed by elimination with an
  in-state probe (probe_inspect.mjs, archive): chain-seam wrap ruled
  out (all arc math is modular), emergent-dedup ruled out
  (emergentTotal 0), then the registered-crossing dump put crossing
  X176-X178 contacts exactly at the artifact with healthy diag rows -
  the conflict is BETWEEN systems, not within one. FIX: each crossing
  records its final erase extents along its under thread (max |cut|
  per direction, fresh for lower-indexed neighbors, one frame stale
  for higher); a fill marching toward a pass where its thread goes
  UNDER (always true by alternation) caps at gapLimit minus the
  neighbor's MEASURED extent. Twist twins are exempt (the P3.37
  winner-extension owns the flip - a reserve there produces a dark
  pinch band because BOTH fills would stop short); self-partners are
  owned by the split caps. Inert at rest (normal corridors stop
  naturally well before any cap) - this is the same theorem as
  P3.36 again: render reach must quote the RENDERED geometry of its
  neighbors, and the 0.5/0.5 clearance split was a static guess that
  an oblique compressed neighbor invalidates. Verified: pull probe
  renders proper dive-under gaps at the exact repro corridor; hold +
  cinch probes unchanged-clean; scans clean both URLs (physics
  untouched this round - the P3.37 battery stands). LESSON: the
  "same artifact" reported across N fixes was at least THREE render
  classes (fill-cap abutment at twist flips, taut-chord stacked
  twists, and this neighbor-gap repaint) plus one physics class
  (world collapse) - a merge on screen underdetermines its
  mechanism; find the exact broken STRUCTURE (which crossing, which
  fill, which erase) before choosing the class.
- **Twist-collapse during a HELD grab (THE user artifact): RESOLVED by
  the world-space twist contact floor + the flip fill bias (P3.37).**
  Recipe (user's, deterministic): outside twist, grab one thread
  BETWEEN the two intersections, HOLD 6s - one intersection rendered a
  gapless ragged merge. Probe: `probe_hold.mjs` (archive, now reports
  pairDist/arcs/ctrlGaps), captures at dsf >= 1.5 with small clips
  (dsf-1 hid this artifact for a whole session). Two mechanisms, both
  needed: (1) PHYSICS - the twist's two crossings world-collapsed to
  pairDist 0.01-0.04 while the along-thread clamps stayed satisfied;
  `applyTwistSpacing` now enforces a WORLD floor between the contact
  points of every twist pair (pass-adjacency on BOTH threads, built
  once in `buildTwistPairs`): max(0.72, 1.8*threadWidth), two-tier
  authority (TWIST_HARD_SNAP 0.12 at collision stiffness, 0.15 soft
  beyond), full-vector binding corrections (weld 1 - the separation
  axis is largely ALONG the threads and the kinetic tangential
  projection would swallow it), runs after the coupling every
  iteration regardless of grab/weld/stick. Census anchor (fat +
  default + kink seeds): healthy resting pairs sit at 1.03+ world, so
  the floor engages only on abnormal folds. (2) RENDER - held pairs
  can park BELOW the floor at the MATERIAL BOUND: a starved eye
  (ctrl gaps pinned at 1.6/1.6, world arc 0.77 = taut chord) is a
  short stacked ride whose over/under flip must render INSIDE the
  span, and the two fills' sample-quantized end caps abutted as the
  ragged seam. Over-fill meshes draw in crossing order, so the
  HIGHER-indexed crossing of a pair wins overlaps: `twistFillBias`
  extends the winner's fill clearance by one gap and the flip becomes
  that fill's single clean cap over the twin's fill (inert whenever
  the eye is open - the march stops before any cap). Verified: held
  pairs park at 0.80-0.90+ (was 0.01-0.04) and all hold crops render
  as clean woven joints; fat + default sweeps 8/8 (sim 4.0 / 5.6-7.0);
  census riders 0 fresh + post-tug, post-tug re-sleeps sim 16.4;
  cinch probe still clean and rests at 2.7e-3 (long cinch rides'
  crossings are FAR apart so the contact floor ignores them - the
  P3.31 forced-separation pump is not reintroduced); scans clean both
  URLs; 20/20 tests; vigorous-play watch shows only the pre-existing
  bistable attractor with `twist-spacing` absent from every phase
  attribution. LESSONS: a world-space invariant cannot be enforced by
  along-thread rules (the clamps could not see the collapse); and
  when a floor parks below target, measure the MATERIAL ARC before
  adding authority - twist 1 parked at 0.80 because 0.78 of thread
  connected the contacts, and no push law can exceed a taut chord.
  Related fixes that were real but NOT this bug: P3.36 long-overlap
  erase (cinch rides), lane-spread scaling, miter clamp, P3.31-35
  floor/coverage work.
- **The cinched-twist merge (the user's actual four-times-reported
  artifact): RESOLVED by the LONG-OVERLAP erase reach + matched
  coverage (P3.36).** The gesture, finally pinned by asking: grab a
  thread JUST PAST a twist, pull PERPENDICULAR outward - this cinches
  the twist and leaves the two threads genuinely STACKED for several
  units (d 0.03-0.25, dz ~1, at rest). Physics must NOT undo that
  (that is what a tightened twist is; forcing separation is the P3.31
  pump), so RENDERING must cover it - but the erase marches, though
  already overlap-driven, were truncated at fixed width-scaled caps
  (~1.7): the truncation boundary mid-ride rendered as the jagged
  lengthwise seam. Fixes: RIDE_REACH_CAP 4.5 on both marches (all
  other limits - neighbor clearance, self-split, total/4 - still
  apply; the marches stop where overlap truly ends), LOCAL_SAMPLES
  24 -> 48, OVER_PATCH_MAX_SAMPLES 56 -> 128. Force-side coverage
  reach settled at 2.0 WORLD ARC by triangulation: 1.16 (fixed erase
  span) moved the pump to wide-kink necks at arc 1.2-1.7; 3.8 (the
  full render cap) exposed a coupling-side post-tug standoff; 2.0
  covers the measured impossible-separation band, and beyond it the
  floor separates threads while the long erase covers the interim.
  diag_scan: a long erase whose over-patch out-spans it is a COVERED
  long crossing, healthy - only uncovered spans are flagged.
  Quiescence test split in two tiers: realistic drags (radius 1.2)
  must fully re-sleep; the pathological teleport wound (radius 2.5
  dragTo jumps) leaves topologically stuck sub-width tangles that the
  sim REFUSES to freeze (never sleep on a merge) - its guarantee is
  bounded churn < 7e-2, no loud attractor. Verified: cinch probe (6
  twists, the exact gesture) renders clean woven over/unders; fat +
  default sweeps 8/8; riders 0; tap2 sleeps; scans clean; 20/20.
  LESSON: the P3.31 sin was never exemption size - it was exempting
  more than the renderer painted. Force exemptions and render reach
  must quote the same geometry, and when physics legitimately cannot
  separate threads, rendering must own the overlap.
- **The "merged parallel threads" seam was a SINGLE THREAD all along:
  RESOLVED by the concave-side miter clamp (P3.34).** Three
  pair-floor fixes (P3.31-33) changed nothing on the user's screen
  because the artifact was never a pair: a centerline turning tighter
  than the ribbon half-width makes the triangle strip's inner
  vertices cross past the local center of curvature - the strip
  self-overlaps and draws a jagged sawtooth seam inside the fill that
  READS as two merged threads. Invisible to every pair census, and
  the old miter (halfWidth/cosHalf, both sides) made it WORSE at
  sharp joins. THE FIX IS IN RENDERING: the concave-side offset is
  clamped to the local turn radius (min 30% width), so an over-tight
  fold renders as a clean thinned fold at ANY radius - verified at
  radius 0.13 vs half-width 0.26. Physics keeps two gentler helpers:
  a per-triple TURN-RADIUS chord floor (in-loop 0.5 only - full
  authority was tried and pinned a flat 3.4e-2 pump for 3+ minutes on
  a wounded tangle; a tangle-squeezed fold cannot open without the
  tangle yielding) and a WIDTH-SCALED kink-eye budget (kinkSep =
  max(2.6, 6.2 * threadWidth) ctrl - 2.6 was calibrated at tw 0.42
  and starves fat eyes; note the ctrl metric cannot see COMPRESSED
  segments, measured at 53% rest inside a squeezed eye, so arc
  starvation can persist regardless - the miter clamp is the
  correctness layer, physics floors are aesthetics). Curvature census
  lives in the probe archive (probe_curv). Verified: harsh headless
  wound re-sleeps at sim+6.5 (was +49); both sweeps 8/8; riders 0;
  tap2 sleeps; scans clean; 19/19. LESSON, twice paid this session: a
  census that only measures PAIRS certifies single-thread artifacts
  as healthy; and "exactly the same after the fix" means the
  diagnosis class is wrong, not the tuning.
- **Frozen merge seam after play: RESOLVED for the casual-play class by
  the two-tier push law + renderability-aware sleep (P3.33); the
  torture-play residual is owned by the open attractor problem.** User
  repro'd the same seam TWICE (P3.32's flat cap RIDE_MAX_PUSH 1.2e-2
  lost the tug-of-war against bd 1.75 bending at a hairpin tip - the
  equilibrium parked 10-15% below width and the sleep gate froze it).
  Six push-law/mechanism experiments, all measured (do not re-run
  them): flat cap loses small fights; unbounded authority rings 90+
  sim-s on violent wounds; violation-driven local weld release (work
  gate) FED the attractor (5 min mv 1e-1-3e-1, rejected); two-tier
  wins: full authority for the first HARD_SNAP 0.04 of deficit
  (exceeds bending's ~2.4e-2/substep re-creation - standing
  tug-of-wars are WON and held at width), RIDE_SOFT 0.15 beyond.
  Plus: the last final-authority sweep records standing hard
  violations deeper than 0.03 into `violationList`; `ridersPending`
  blocks BOTH the global stick and main.ts sleep - the knot may never
  freeze ON a rendered merge. Verified: moderate play (5 sites,
  2.2-unit drags) riders 0 and sleeps at sim 21.6 with the pending
  gate draining first; fat sweep 8/8; tap2 sleeps; scans clean; 19/19
  fast. KNOWN RESIDUAL: 75-s torture gestures create multi-thread
  tangle clusters (~10 pairs at d 0.29-0.49, same set for 5 min) that
  are TOPOLOGICALLY stuck at slack ~0 - no local push law resolves
  them (separating one pair violates another); the knot stays dimly
  awake on them (mv ~3-5e-2, slowly trending down) instead of
  freezing merged. Their resolution needs material redistribution
  through crossings - the open loud-attractor problem below.
- **Post-play riders in the sin 0.35-0.55 band: RESOLVED by the strict
  ramp + emergent coverage + bounded authority (P3.32).** User repro:
  parallel-thread merges reappeared on the fat URL after play. The
  P3.30 ramp zeroed the floor by sin 0.55 on the assumption that
  2D-close pairs in the 0.35-0.55 band are crossing-adjacent and
  render - true at rest, FALSE for tunneled tangles from violent play
  (renderability census: 23-27 unrenderable riders mid-churn, NONE
  sharing a registered crossing; the P3.30 census only counted
  sin < 0.35 and missed the class; my P3.31 census classified pairs
  with the force pass's own coverage rule and so could not see
  coverage leaks either - A CENSUS MUST MEASURE RENDERABILITY, i.e.
  erase-reach coverage, never the force rule under test). Fix: (1)
  ramp par = (0.8 - sin)/0.25 - full floor through sin 0.55, zero
  only above 0.8 so threads can still pass transversally to FORM
  crossings; (2) properly-intersecting pairs at collectible angle
  (sin > 0.25) are exempt - they render as crossings by definition;
  (3) PassCover extended to EMERGENT crossings (previous substep's
  collector rows feed addWindow with ids crossings.length+k) so the
  strict ramp cannot pump at tunneled crossings' arms; (4) BOUNDED
  AUTHORITY - the hard sub-width push is capped at RIDE_MAX_PUSH
  1.2e-2: at slack ~0 a violent wound can leave overlap the geometry
  cannot undo without stretching thread (globally infeasible), and
  the uncapped floor rang forever on it (90 sim-s no trend in the
  headless drag test); capped, free riders still separate ~0.3
  units/s (gone within the sleep gate's 45-frame window) while
  blocked pairs freeze sub-threshold. Only the 2D renderability
  preference is bounded; the 3D capsule keeps unbounded final
  authority. Headless violent wound now re-sleeps at sim+49 (test
  budget 1920 frames; the old 30-s pass was sleeping ON the merges).
  Census after: riders 0 at rest (fresh + small-tug), 4-6 transients
  mid-churn (was 23-27); fat sweep 8/8 asleep; standard play session
  settles FASTER than P3.31 (post-play mv 3.2e-3 vs 5.8e-2); scans
  clean; 19/19. Accepted residual: a truly blocked pair in a
  pathological wound can freeze merged - rare, bounded, and owned by
  the open loud-attractor problem below.
- **OPEN: post-VIOLENT-play loud attractor at fat params.** After ~75s
  of machine-gun gestures (fast circles + sweeps at 5 sites) on the fat
  URL, the knot sometimes parks at mv 1.3-2.3e-1 indefinitely (3-min
  watch, no trend) and sometimes self-recovers - stochastically
  bistable. Gentle play (3 small tugs) always re-sleeps (~sim 14).
  MEASURED FINGERPRINT, do not re-derive: (1) hot particle wanders the
  whole knot (not one site); ~half the hot attributions sit at torn
  fallback pairs, sep 0.77-1.17; (2) high-speed slide/transversality
  mobility taper (`abHighSpeedTaper`): partial - drops to 4-9e-2 then
  re-inflates; aligning the taper band to the weld band did not close
  it; ALSO freezes bindings stale, blocking torn-pair recovery - wrong
  lever; (3) slip-based weld (`abSlipWeld`, EMA of relative binding
  slip instead of absolute contact speed): NO effect - the loud state
  slips for real, co-motion is not the issue; (4) `abCoupling=0`
  explodes the fabric (mv 5.8) - the fallback boundary guard is
  load-bearing; (5) extra velocity damping 0.3/substep
  (`abExtraDrag`) does NOT kill it - the motion is DRIVEN (constraints
  re-inject each substep), not kinetic; note this was measured on the
  post-explosion state. WORKING THEORY: torn fallback pairs whose
  reunion path is BLOCKED by an interposed thread - the coupling does
  not yield in fallback (P3.23: chronic fallback yield abandons
  crossings), so a blocked pair fights collision at full strength
  forever. Candidate directions: progress-gated fallback yield (yield
  only while sep is not decreasing; risks parking above the sleep
  gate), or a z-aware reunion channel (the path is blocked in 2D but
  legal over the obstruction in 3D - Z_EASE currently pulls z back to
  the diagram tents faster than a traversal can hold altitude). The
  `ab*` A/B knobs and `contactSlipEma` plumbing from this
  investigation were REMOVED in the P3.41 cleanup (their verdicts are
  recorded above; re-add from commit 0b91d15 if injector
  fingerprinting is ever re-run).
- **Fresh-settle limit cycle at fat widths: RESOLVED by crossing
  coverage + soft cosmetic margin on the anti-riding floor (P3.31).**
  P3.30's floor pumped with NO interaction at fat params (tw 0.52,
  rep 0.4, bd 1.75, sm 0.7): 3 of 8 seeds never slept, hot sites at
  STEEP crossings (sin 0.85-1.0), mv bursting 1.2e-2 - 7e-2 through
  the stick/unstick hysteresis (the freeze/unfreeze regimes have
  different equilibria - a limit cycle THROUGH the friction switch).
  Floor-push instrumentation found two standing-violation classes the
  angle gate alone can't be right about: (1) arm segments converging
  INTO a genuine crossing sweep through the shallow band at 2D
  separations the crossing's own geometry forbids raising (walls meet
  at the crossing point) - the floor demanded the impossible forever;
  (2) packed parallel weave pairs pinned at ~90% of the floor (0.54 vs
  0.60 target, ribbon width 0.52) - a full-stiffness war over COSMETIC
  margin the weave cannot yield. Fixes: (1) per-pair crossing COVERAGE
  (`PassCover`: 4 slots/particle, crossing*2+side, rebuilt every
  substep from pass ctrls - no stale state; a pair fades the floor
  out only when one endpoint sits near a shared registered crossing's
  over pass and the other near its UNDER pass, cover 1 within 1.0
  ctrl fading to 0 at 2.5) - pair-aware like P3.24, so third threads
  get no relief, and the unconditional 3D test still forbids
  interpenetration inside covered zones (coverage legalizes exactly
  what the erase gap renders, nothing more - visually audited);
  (2) TWO-ZONE stiffness: full authority below ribbon width (the true
  renderability line), RIDE_SOFT_STIFFNESS 0.15 in the width->margin
  band, so margin standoffs sit sub-stick-threshold and freeze.
  QUIET_EPS restored 2.2e-2 -> 1.5e-2 (its raise existed solely to
  tolerate the removed standing pushes; rest floor is ~2e-3 again).
  Verified: fat sweep 8/8 asleep sim 5-7s (was 5/8 at 12-23s + 3
  never); default sweep 8/8 at 3.9s unchanged; rider census 0 fresh
  AND post-tug (P3.30 regression guarded); play+tap re-sleeps; scans
  clean both repro URLs; 19/19 tests. Amends the P3.30 invariant:
  enforce closeness by angle, not place - EXCEPT that the rendered
  neighborhood of a crossing is a legitimate pair-scoped place (it is
  precisely where the renderer draws overlap), and a floor may never
  demand what geometry cannot give (that is a pump by construction).
- **Tangential riding under true-3D: RESOLVED by the
  transversality-gated 2D floor (P3.30).** True-3D collision legalized
  the one thing the eye still caught: threads riding ALONG each other,
  2D-close but z-separated - legal in 3D, unrenderable in 2D (only
  transversal overlap has a rendering: the erase gap). New stateless
  rule in collision: required 2D separation scales with parallelism -
  full width floor when local tangents are parallel (regardless of z),
  fading to zero by |sin| 0.55 (real crossings; the 3D test governs).
  Ramp (0.55 - sin)/0.25 - the shallower first ramp left riders parked
  at partial floors in the sin~0.3 band. Post-tug tangential census 12
  -> 0. QUIET_EPS raised 1.5e-2 -> 2.2e-2 (the gated push holds
  ~1.8e-2 standing corrections at shallow crossings post-interaction).
  THE INVARIANT, hard-won over ~10 iterations: a 2D-rendered knot may
  overlap only transversally; enforce closeness rules by ANGLE, not by
  place (every place-based exemption leaked).
- **"Threads too close" (all remaining forms): RESOLVED by TRUE-3D
  collision (P3.29).** The tug-then-rest census showed ZERO violations
  of the depth-exemption spec - the spec itself permitted sub-width
  hugging in every crossing's exempt core. Root insight after five
  exemption patches: an exempt region is a hole, and holes admit bugs.
  z is now a REAL simulated per-particle coordinate (`zPos`, overdamped,
  eased toward diagram-derived `zTargets` at Z_EASE 0.2); collision and
  repulsion are UNCONDITIONAL 3D capsule tests - no zones, no gates, no
  falloff shapes, at any width. 2D-squeezed threads resolve by
  separating in z (one goes over) - renderable by definition; emergent
  crossings order over/under by real z. Deleted: ZONE_SLOTS/zones,
  sharedZone, quartic falloff, CrossingZones (collector dedup is now a
  spatial scan of registered contacts). Post-tug census: flatClose
  (2D-close without depth separation) 0, VIOL3D 1 marginal at 92% of
  floor (Gauss-Seidel sandwich residual), 472 clean over/unders. All
  scans/settles/tests green. The z state is invisible to rendering
  except through over/under ordering.
- **Torn/mangled crossings after a small pull: RESOLVED by rendering at
  the true intersection (P3.28).** The user's actual workflow - a small
  tug, then observe AT REST - left crossings drawn as jagged, torn
  merges. Cause: the ordering clamps pin the physics binding away from
  the true intersection during the pull, the graduated weld then
  freezes that displacement into the rest state, and the renderer drew
  the erase + over-fill AT THE BINDING - beside the real overlap.
  Passes now carry a RENDER-ONLY `displayF` (the raw joint slide
  target, before easing/clamps, stale-frozen through static mode);
  `RibbonRenderer.renderCtrl()` prefers it everywhere crossing
  geometry is placed (centers + neighbor gaps). The physics ctrl keeps
  its clamp/topology duties untouched. Probe rule (twice burned):
  verify AT REST **after a small tug**, not just fresh settles or long
  play sessions - the three states fail differently.
- **Fat-thread "penetration": RESOLVED by width-scaled renderer reaches
  (P3.27).** After P3.26 the post-play physics state was verifiably
  clean (0 overlap pairs without full depth separation) yet tw 0.52
  still showed merges: the RENDERER's reach caps (CUT_REACH_MAX 1.35,
  OVER_REACH_MAX 1.2, neighbor clearances 0.65/0.42) were absolute
  constants calibrated at tw 0.42 - a fat shallow crossing's overlap
  extends past them, the erase cap lands INSIDE the overlap, and
  everything beyond renders uncut. Reaches now scale with fillHalf
  (CUT 6.5x, OVER 5.8x, floored at the old values), clearances raised
  to 0.8/0.5 (window-overlap invariant: their sum must exceed 1 so
  neighbor windows meet), local polylines out-reach the marches by 0.8,
  over-patch capacity 36 -> 56 samples. The scanner's BIG-GAP threshold
  is now derived from tw/gap in the URL instead of a constant. Probe
  rule: verify the POST-PLAY state, not just fresh settles - and
  separate "physics penetration" (pairs without depth separation) from
  "renderer failure" (depth-separated pairs drawn uncut) before fixing
  either.
- **Deep penetration at extreme params: RESOLVED by the final-authority
  collision projection (P3.26).** At rep 0.4 (raw repulsion distance
  0.25 < thread width — the slider could silently disable spacing),
  bend 1.75, smooth 0.7, tw 0.52, PBD collision at stiffness 0.5 lost
  its committee votes: equilibria settled in visible interpenetration
  (census: 9 cross-thread pairs at 0.31 vs the 0.60 floor) and the
  quiescence gate froze them. Architectural principle: collision is now
  the FINAL AUTHORITY over the rendered state — a full-stiffness
  double-sweep projection is the LAST position operation of every
  substep, so the substep-end state (the only state ever rendered or
  frozen) honors the width floor wherever depth doesn't exempt it;
  internal tug-of-wars continue between substeps but cannot appear on
  screen. Two sweeps because one Gauss-Seidel pass leaves ~25% residual
  where a particle sits between two violated pairs. Also: repulseDist
  now floors at collisionDist*1.02. Census after: crossFree 0,
  selfNear 0, remaining selfMid pairs are kink necks that render as
  proper covered crossings. Play-settle, scans, tests all green.
- **Shallow-crossing tangential merges + release twitching: RESOLVED
  (P3.25).** Two P3.24 leftovers. (1) The 3D-capsule floor
  sqrt(margin²−dz²) is the wrong SHAPE for renderability: its slow
  lateral recovery let shallow crossings hug tangentially along the tent
  slopes (dz = 0.7·margin still allowed centerlines at 0.71·margin —
  inside ribbon overlap, unrenderable since the erase covers only the
  silhouette span). Now QUARTIC (1 − u⁴): ~90% floor at dz = 0.7·margin,
  still exactly 0 at the crossing point. Tangential-merge census
  (shared pairs < 0.85·width beyond 0.6 of every shared contact): 8
  artifacts → 0 real (probe rule: with multi-zone tags, always measure
  against the NEAREST shared crossing — first-match flags legit crossing
  pairs of a twist's other crossing). (2) Grab release snapped welds
  open instantly across the whole radius — every released crossing
  dumped its pent slide/torque corrections at once ("nearby parts
  jiggle in unrelated ways"). Now a per-crossing gate eased at 0.05/
  substep (~100ms) with a tighter bubble (1.2 → 3.0). Locality: 4–8
  band mean displacement for a 1.3-unit drag 0.199 → 0.080.
- **Whole-tangle response to a local tug + thread sink-through: RESOLVED
  (P3.24).** Two P3.23 leftovers. (1) `weldFactor` released EVERY weld
  globally on grab — first touch dumped the entire fabric's stored
  standoff stress (reported: "the ENTIRE tangle jiggles"). Now the grab
  release is spatial (free within 2.5 of the grab, tapering to
  speed-sensed by 5.0); far-field response to a 1.3-unit drag dropped
  0.25 → 0.097 mean (residual is spring transmission, physical at slack
  0). (2) The depth exemption was pair-blind: any third thread near a
  crossing inherited a reduced floor and could sink into the pair with
  no rendered gap (grazing overlaps are below the collector's |sin|
  cutoff too). Depth scaling (collision AND repulsion) now gates on the
  pair sharing a registered crossing's zone — and the zone table itself
  was a bug: 2 slots with last-writer eviction flapped tags in dense
  weaves (crossings every ~5 ctrl on big chains), letting pairs sink
  while covered then freeze as canceled standoffs 0.18-0.25 apart.
  ZONE_SLOTS=4, first-come no-evict. Sink census (non-shared pairs
  < 0.7 margin at rest): 8 → 0. Probe rule: census scripts must
  replicate the force pass's zone lookup exactly or they lie.
- **Post-play endless jiggle: RESOLVED by graduated contact friction +
  the spacing/window triangle (P3.23).** P3.22's depth model removed the
  lens's parasitic tangential weld — which had ALSO been the only
  dissipation for the PBD standoff (bending/structural/collision cancel
  ~1e-1 each at rest). After a play session the knot rang forever at
  ~5e-2, above the binary stick gate. Two root causes, both measured via
  an OFF-SCREEN browser probe (`--window-position=2200,50` — headed
  probe windows on the desktop get contaminated by real pointer activity;
  one contaminated run cost an hour of false theories): (1) passes pinned
  at the old 0.9 ordering floor sat inside each other's opposite-sign
  depth tents — cancellation left a residual collision floor at segments
  the diagram requires to intersect, an unresolvable coupling-vs-collision
  pump; (2) with no contact friction, nothing dissipated the standoff.
  Fixes: MIN_PASS_SEPARATION 1.6 with DEPTH_WINDOW 1.4 (triangle: window
  < floor so tents never cancel; window > ~1.3 clamp-lag so pinned
  intersections stay covered; floor < 2.0 corridor pitch so bindings keep
  slack — 2.0 made corridors convoy-only and grab-at-X regressed to
  1.29); per-crossing GRADUATED friction from a smoothed contact speed
  (weld 0 above 3e-2 or while grabbed/agitated, 1 below 5e-3) applied to
  the coupling's tangential component AND fading the slide/transversality
  mobility, so quieting anchors freeze and the standoff becomes
  substep-identical; the coupling YIELDS under clamp lag while threads
  intersect (unachievable coincidence = pure fight) but NOT in fallback
  (yielding there abandoned crossings — pairs tore 5.4 apart), and the
  yield fades back out as the weld engages (else pairs fossilize
  mid-separation, sep 0.89 → 0.03 after the fix). Failed approaches, for
  the record: exempting properly-intersecting shared-zone pairs from
  collision (binary flicker, mv spikes 3.5e-1), anchoring depth tents at
  the true intersection (stale anchors during separation tore pairs to
  5.9), transversality-off (no effect — it was never the pump). Verified:
  play session + tap re-sleeps in ~2s at dr 0.5; all 4 tap sites clean;
  scans clean on both repro seeds; weak tug still slides 9.4 ctrl.
  `test/quiescence.regression.test.ts` guards the dissipation channel.
- **Crossing weld + loop-end gaps: RESOLVED by quasi-3D depth collision
  (P3.22).** The circular exemption lens was the root cause of four
  bugs (twist-eye merge, oblique naked gaps, R1-kink collapse,
  tangential weld); the depth model replaces it wholesale. Measured
  deltas on the repro seeds: weak-tug material flow through a crossing
  2.2 → 8.2 ctrl; grab-at-intersection now pins the junction (crossing
  moves 0.59 world, was 1.2–1.4) while 5 ctrl of the grabbed strand
  slips through; settle-to-sleep 21s → 3.9s sim (the standing
  collision-vs-geometry conflict at oblique crossings was the main
  quiescence obstacle); kink seed 2773729296 spans 0.67–1.31 with 3
  degenerate self-crossings → 0.67–0.72 with 0 (kinks no longer
  collapse — KINK_MIN_SEPARATION 2.6 + depth floor). Scanner clean on
  both repro seeds; 18/18 tests. Retired: CONTACT_RADIUS,
  EXEMPTION_TAPER_SLOPE, the taper sizing lore in earlier entries.
  Side effect (intended): hairpin tips and kink loops now hold ~a
  thread width open everywhere — same-chain skip is ±2 (was ±6).
- **Stuck-crossing feel: RESOLVED by removing the slide deadband (P3.19)
  + joint slide targeting and exact grabbed chase (P3.20).**
  A weak tug moves material ~0.006 ctrl/substep — below the old 0.015
  deadband — so bindings never slid, the exemption lens stayed glued to
  the material, and collision welded the two threads (measured: 99% of
  slide calls swallowed; binding slid 0.12 ctrl while the other thread was
  dragged 1.5 units; at cp=1 the slide was stick-slip jerks). Final state
  (deadband 1e-4, joint targeting, SLIDE_EASE_GRABBED 1.0): the same weak
  tug slides 2.21 ctrl smoothly, other-thread residual 0.042, no
  snapback. Rest chatter (the deadband's old job) is owned by static
  friction. Negative results from the same investigation: transversality
  off and MIN_PASS_SEPARATION 0.3 each changed nothing (clamp hits went
  to zero without freeing the slide); silencing the coupling at
  intersecting crossings while grabbed (a "boundary guard" theory) made
  it WORSE (slide 2.17 → 1.14, drag returned — collision re-welds).
  RETRACTED (P3.21): the "woven fabric co-motion" claim was a MEASUREMENT
  ARTIFACT — the sweep probe sampled reference points at fixed offsets
  from the SLIDING binding ctrl, conflating binding slide with material
  motion. With fixed material coordinates, swept-through material returns
  to within 0.06–0.09 of start after release: the crossings genuinely
  let material through. Probe rule: reference points must be FIXED
  material ctrls captured before the gesture. `ParticleSystem.slideStats`
  + `window.__knotPoint(chain, ctrl)` are the diagnostics.
- **Giant gaps at loop-end twists: RESOLVED by arc-length gap margins
  (P3.21).** The erase cut boundary was the over ribbon's OFFSET CURVE
  (perpendicular distance = fillHalf + gap), so the bare margin projected
  as gap/sin(angle) along the under thread — at the ~30° crossings that
  loop-end twists settle into, spans hit 1.07 with naked background
  wedges ~2× gap per side, reading as giant gaps. Fix: cut at the over
  SILHOUETTE (fillHalf) and push caps outward by `gap` as ARC LENGTH —
  margin now constant along the thread at every angle (span range
  collapsed 0.59–1.07 → 0.59–0.67). The scanner's BIG-GAP threshold sat
  at 1.3 and certified the bug as healthy through two "clean" audits —
  now 0.85. Lesson: a scanner threshold chosen without a perceptual
  reference is a rubber stamp; calibrate against what the worst healthy
  case SHOULD be.
- **The `cp` coupling toggle is REMOVED (P3.20).** The experiment
  answered its question: cp=0 welds crossings (collision has no
  tangential projection) and under stress leaves bound pairs torn up to
  ~0.8 apart that render as naked holes / displaced gaps at twists (the
  user-reported "occasional large gaps at loop-end twists" repro'd
  exactly this way). It was removed rather than kept as a toggle because
  a lingering `cp=0` in a live tab's URL silently poisons every later
  evaluation (Vite reloads preserve query params). Re-add from git
  history if ever needed.
- **Physics micro-oscillation floor: RESOLVED by static/kinetic contacts
  (P3.17).** Rest floor is now ~2e-3 units/substep (was ~1e-2): static
  mode freezes the crossing machinery so the constraint standoff repeats
  identically. QUIET_EPS 1.5e-2 and the test bound 1.2e-2 could tighten
  to ~5e-3 if ever useful. Hard-won negative results (measured with
  `ParticleSystem.enablePhaseProbe()`): velocity-impulse damping at
  bindings destabilizes (fights constraint projection, twice), inertial
  zone drag does nothing (the motion is constraint-driven, not inertial),
  and permanently frictionless contacts wander forever. Still open:
  default composition got looser/sprawlier after the twist-eye work
  (MIN_PASS_SEPARATION is the main compactness lever; consider making
  twist-eye openness a user param instead of a constant).
- **Wobbly threads at slack ~0 (P2 polish).** At the taut end the true
  equilibrium shows small-amplitude waviness along runs and rope-tight
  twist chains. Candidate knobs: constraint iterations (2 -> 3), pullOnly
  bending nonlinearity, repulsion/structural balance. Validate only via
  the real-time diag harness (see verification rule).

- **Make the hero settle more dramatic (P2 polish).** The settle currently
  reads as a gentle "tightening breath" rather than the zigzag-to-curve
  transition the design imagined: the Catmull-Rom splines round the lattice
  corners from frame one, so the initial angularity never shows. Fix: blend
  spline output toward the raw control polyline when settle progress is low
  (e.g. lerp sampled positions toward straight-line interpolation of the
  controls by `1 - settle`), so early frames render angular 45° zigzags that
  visibly soften. Touch points: `RibbonRenderer.update()` +
  `ParticleSystem` (expose settle progress).
