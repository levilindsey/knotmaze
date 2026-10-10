# Knotmaze — Procedural Celtic Knot Maze Generator

A web-based procedural generator for celtic-knot-style mazes with physics-based relaxation, interactive tugging, and maze-solving gameplay.

## Overview

Three-layer architecture:
- **Layer 1 (Combinatorial):** `TangleGraph` — planar multigraph on a lattice with nodes (crossing/junction/end) and edges (thread segments). Strand tracing, checkerboard alternation, pairwise-crossing invariants.
- **Layer 2 (Geometric):** Centripetal Catmull-Rom splines through lattice points; arc-length parameterization.
- **Layer 3 (Dynamic):** Verlet-integrated particles; each strand is an independent closed chain (springs, bending, repulsion — no lattice anchors). Crossings are SLIDING BINDINGS: a fractional position along each of the two threads, re-projected each substep (true polyline-intersection targeting, nearest-point fallback) so intersections migrate along threads, coupled by a coincidence constraint, with ordering clamps preserving diagram topology. Contacts have STATIC/KINETIC friction: kinetic (coupling projected off each thread's tangent — material slides through crossings; slide + transversality active) while grabbed/agitated/moving, static (full-vector weld, crossing machinery frozen) once per-substep motion drops below a stick threshold — kinetic-only contacts wander forever (a PBD constraint standoff pumps the free tangential mode; no damping fixes it — measured via the phase probe), static-only reads as pinned when dragging. The knot is QUASI-3D: each particle carries a depth derived from the crossing diagram (over passes tent to +amp, under to −amp, over DEPTH_WINDOW 1.2 ctrl; contributions SUM, so a twist eye's midpoint cancels back to 0), and collision/repulsion treat threads as 3D capsules — required 2D separation is sqrt(margin² − dz²). Crossings therefore exempt themselves exactly where the diagram says the threads overlap, at any angle, and the width floor applies everywhere else, including inside kink loops and twist eyes (same-chain collision skip is only ±2 ctrl; KINK_MIN_SEPARATION 2.6 keeps a self-crossing's loop stocked with enough material to render). This replaced the circular contact-lens exemption (CONTACT_RADIUS + taper), whose radius mismatched the true overlap span (margin/sinθ) at oblique crossings — the mismatch both welded threads tangentially and fought geometry in a standing conflict (the source of the "threads bound at intersections" feel and the loop-end gap artifacts). Contacts carry GRADUATED friction (per-crossing smoothed contact speed → weld 0 while grabbed/agitated/fast, weld 1 when quiet) applied to the coupling's tangential component and to slide/transversality mobility — the dissipation channel that lets the constraint standoff freeze and the knot sleep after interaction (the lens's parasitic weld used to provide this by accident); the coupling also yields under clamp lag while threads intersect. MIN_PASS_SEPARATION (1.6) / DEPTH_WINDOW (1.4) sit in a measured constraint triangle with the 2.0 corridor pitch — see the constants' comments before touching any of the three. Slide-chase corollaries that remain load-bearing: NO perceptible deadband (a weak tug moves material ~0.006 ctrl/substep — any useful deadband is a self-sustaining stick-slip trap), JOINT per-crossing intersection targeting (per-pass targeting can lock the two passes onto different intersections of a twist eye), and EXACT grabbed chase (ease 1.0 — chase lag feeds parasitic pull through the coupling). Gentle centroid centering + a bounds-following viewport replace grid anchoring. Simplex-noise temperature agitation.

Rendering: PixiJS v8 custom ribbon meshes with depth-based over/under casing gaps.

## Key Design Decisions

- **URL-as-complete-state:** Every design fully specified by `(seed, params)` serialized in the URL. Deterministic seeded RNG throughout.
- **ParamField abstraction:** All generator parameters read through a `ParamField` (constant | Simplex-modulated | painted), enabling region-biome variety natively.
- **Hero relaxation:** On load, lattice paths (angular 45° zigzags) visibly settle into smooth curves. Temperature slider allows re-agitation.
- **Knot-as-instrument:** Pluck threads → waves propagate; Web Audio maps loop-length to pitch.
- **Daily seed:** Wordle-style shared daily maze with time-to-solve sharing.

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
    maze_controller.ts    # P4 LEGACY (md=1): single-strand solve state
  render/
    ribbon_renderer.ts    # PixiJS ribbon meshes
    ribbon_mesh.ts        # Triangle strip extrusion
    fabric_maze_renderer.ts # P4: woven gold path recolor + markers + hints
    maze_renderer.ts      # P4 LEGACY (md=1): single-strand overlay
    debug_renderer.ts     # Lattice/graph debug overlay
  audio/
    knot_synth.ts         # Web Audio pluck/strum
  ui/
    tweakpane_panel.ts    # Control panel
    url_state.ts          # URL serialization
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
    fabric_controller.test.ts, maze_controller.test.ts
  quiescence.regression.test.ts  # Guards the friction dissipation channel
  sweep.manual.test.ts           # Skip-gated; run via SWEEP=1
```

## Running Locally

```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm test         # Vitest
```

## Commit Policy

Work lands directly to `main`. All changes must be end-to-end working before committing; no partial or broken work.

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
- Stage 15 — cuspRadius slider (`cr=`, [0, 3], default 1, live):
  multiplies fillet reach — 0 = sharp joints, 3 = wide cast-metal
  webs. Fillet color probes scale with patch reach (`paintUAtArc`,
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
  sliders show dynamically (tweakpane row `.hidden`).
- Stage 25 — FOG OF WAR (`fow=` + `fowRadius` / `fr=`, dynamic
  slider): the maze hides until explored; explored stays visible.
  One sprite over the gameplay overlay, offscreen-2D-canvas texture
  (background fill + destination-out radial holes), stamps follow the
  head at 0.8-unit spacing, redraws only on change; spatial memory
  (deliberately does not ride the flow field). Exit/pulses/labels
  emerge only as explored.

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

RENDER LORE (hard-won, 2026-10-09): **flat fills cannot represent a
field.** Once per-vertex V blending exists, ANY flat-colored overlay
(wedge, disc) over a ramping ribbon draws a visible step or stamped
circle at its silhouette — and per-primitive sampling (host-axis
discs, per-arm wedges) still leaks faint rim arcs wherever one
primitive's footprint crosses ANOTHER arm's material. Overlays must
evaluate the SAME continuous field as the ribbons (the 16c angular
junction field). Don't reintroduce point-sampled joinery.

RENDER LORE (hard-won, 2026-10-09): **the arc-wrap family bites twice.**
Both `arcAt` AND `sampleAt` wrap their arc modulo totalLength, so an
OPEN chain's terminal (arc == total) lands at arc 0: `arcAt` collapsed
traveled-bridge paint spans to a point (fixed via `paintArcAt`), and
`sampleAt(total)` drew every atEnd tip disc at its chain's START with
the far end's host color (the floating gold-dot artifact; fixed by
reading the endpoint sample directly). Any new open-chain-terminal
consumer must avoid both — grep for this entry first.

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

RENDER LORE (hard-won, 2026-10-09): **gamut locality is load-bearing
for V blends.** The 2D palette's V axis is a PATH through the gamut,
not a set of swatches — a V-ramp between two section colors renders
every hue BETWEEN them, so adjacent sections must sit CLOSE in V or
junction ramps paint rainbow stripes instead of direct blends (the
first segments scheme hashed V per run and striped at every ramp).
Scheme design rule: propagate V locally — segments assigns colors via
a bounded random walk from the entrance (BFS, steps <= ±0.18);
strands junctions converge to the THROUGH-thread's V so hosts never
shift hue and bridges carry the whole transition along their own
length. Global gamut coverage must come from accumulated drift, never
from adjacent jumps.

Still open in P4:
- **Textured background**: the render side is DONE (Stage 18 — gaps
  clip the thread layer over a transparent canvas); what remains is
  actually shipping a texture/pattern behind the canvas (CSS on
  `app.canvas` or a DOM layer) and picking the art.
- **URL/param serialization for the remaining `MazeParams`**
  (branchDensity, fourWayFraction, … — today `mf` + `de` serialize and
  `DEFAULT_MAZE_PARAMS` supplies the rest) and the **daily seed**
  (Wordle-style shared daily + time-to-solve share).
- **Old maze mode's fate** (`md=1`, single-strand trace,
  `core/maze.ts` + `game/maze_controller.ts` + `render/maze_renderer.ts`)
  — still works, untouched; retire it once fabric gameplay is strictly
  better, to drop a whole legacy toggle+overlay.

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
  - not a physics change: the sleep gate counts 45 STILL FRAMES, and
  faster frames span fewer sim-seconds; quiet-start is unchanged. Do
  not compare sim-at-sleep across builds with different frame rates.
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
