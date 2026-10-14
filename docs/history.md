# Knotmaze history

The stage-by-stage record that CLAUDE.md carried until K45 (2026-10-12),
moved here verbatim: the P4 stages and dated rounds (the old "Roadmap
status"), the old "Still open in P4" and "Deferred" lists, and the P3 saga
(the old "Follow-ups"). Later work is recorded in the commit messages,
`docs/design/` and `LEDGER.md`. Passages that still bind moved to the
path-scoped `.claude/rules/` files (or stayed in CLAUDE.md); a bracketed
note marks each place one left. This file is never imported: read it on
demand.

## Roadmap status: the P4 stages and rounds

- Stages 0–4 — physics generalized: open chains (`chainBreakAfter`),
  anchored ends, seam-aware crossing machinery, junction fusion. *[Stays in `CLAUDE.md`: the byte-identity rule.]*
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
  OFF: whole fabric one hue — much stronger gold route). *[Moved to `.claude/rules/render.md`: the arcAt GOTCHA.]*

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
  (~25-30ms/frame burned at rest in the flagship mode). *[Moved to `.claude/rules/physics.md`: the junction cover.]* All
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
  border. *[Moved to `.claude/rules/generation.md`: rect identity and the start/exit anchors.]*
  Battery: 24/24 shape x mode x seed settles; scripted star solve
  lands exactly on optimal; invariants unit-tested per shape. Known
  residual: star e-w 6/8 sleeps, 2 stragglers hover at threshold
  (bistable-attractor class, no blowups).
- *[Moved to `.claude/rules/physics.md`: PHYSICS JUNCTION SPACING.]*
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
  *[Moved to `.claude/rules/probes.md`: the probe note.]*
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
  0.2..0.8. *[Moved to `.claude/rules/gameplay.md`: live recolor.]*
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
  its nearest underWindows cut. *[Moved to `.claude/rules/physics.md`: open-chain terminal passes.]* RAINBOW now swells (up to 1.6x, easing to normal as the
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
  FOLLOW_RAMP (it frames the whole knot during the intro). *[Moved to `.claude/rules/gameplay.md`: camera and gestures.]* FOG: `fowIntro` (fwi=) holds the fog off during
  the intro animation, then closes it in (fade + reveal radius
  contracting from the whole maze to fowRadius).
- SHAPED START/EXIT CLEARANCE (late 2026-10-10): on every non-rect
  shape the start/exit dots sat among other threads (settled clearance
  0.4-1.3 vs 2.3-2.5 at rect corners) - the anchor target is nudged into
  thick material (the sliver/kink-eye stability fix) and the fixed
  CUT_REACH tail parked the pin inside the weave. *[Moved to `.claude/rules/generation.md`: escape tails.]* Settle battery: 5
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
  mirror each other. *[Moved to `.claude/rules/render-gaps.md`: concentric dot gaps.]* *[Moved to `.claude/rules/render.md`: adaptive wedge flanks.]* *[Moved to `.claude/rules/render.md`: stale fan indices.]* WORKTREE DEV SERVERS
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
  the same day by COMPACT LINKS, below). *[Moved to `.claude/rules/gameplay.md`: panel lore.]*
- 2026-10-11 small round 2. *[Moved to `.claude/rules/render.md`: junction blend distance.]* *[Moved to `.claude/rules/gameplay.md`: the audio autoplay gate.]* RELATIVE BASE (vite base
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
  gridAlignSlider. *[Moved to `.claude/rules/gameplay.md`: the strength and view rules.]* Measured
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
  re-rolls on load). *[Moved to `.claude/rules/gameplay.md`: decoder details.]*
  *[Moved to `.claude/rules/probes.md`: reading the live params.]*
  CODEC V2 (same day): the user set junctionBlend's default to 0.88, the
  first default change under the codec - so CODEC_V2 (an edited copy of
  v1), CODEC_VERSION 2, and all-default links became `?<seed>.U` (the v2
  header with zero entries). Bare seeds, v1 blobs and legacy s=/seed=
  links keep junctionBlend 0 and re-encode with it explicit.
  *[Moved to `.claude/rules/gameplay.md`: a query without a seed.]* *[Moved to `.claude/rules/probes.md`: probe URLs.]*
- RENDER-ONLY PLUCKS + PHYSICS CHECKBOX (worktree agent, 2026-10-11; user:
  a tap or auto pluck moves nothing but the plucked segment, vibrating
  "way faster", motion-blurred; then "a checkbox for disabling physics
  entirely"). Retires the render-only standing-wave ring (pluckWaves) and
  the auto pluck's physical pull. *[Moved to `.claude/rules/gameplay.md`: taps and drags.]* THE LOOK (render/pluck_overlay.ts;
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
  changed (fw=0). *[Moved to `.claude/rules/render.md`: the concave-side cap.]* PARAMS (appended to codec v2): pluckSize
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
  cost the same (the sleep gate already stops stepping). *[Moved to `.claude/rules/probes.md`: probe hooks.]* Known: at the defaults the median tapped lobe gets
  the 0.45h amplitude floor (psz 1.5-2 reads better at default zoom);
  short lobes inside junction web footprints show a halo, not a blur.
- *[Moved to `.claude/rules/physics.md`: KINK EYES (2026-10-11, with K41).]*
- *[Moved to `.claude/rules/render-gaps.md`: PER-PIXEL CROSSING GAPS (G1, K1).]*
- *[Moved to `.claude/rules/gameplay.md`: MAZE STATS + DAILY MAZE (K19, K20, K47, K56).]*
  *[Moved to `.claude/rules/probes.md`: daily probes and dev servers.]*
- *[Moved to `.claude/rules/render.md`: SHADER BACKGROUNDS (K21).]*
- *[Moved to `.claude/rules/render.md`: SHADER PAINT (G2, K4).]*
- THE LOAD SETTLE (K147, 2026-10-13): the few-fps intro was the physics
  catch-up spiral (every frame ran 12 substeps of ~12 ms at gs 18). A
  per-frame physics budget (`settleBudget`, 12 ms, at least one substep a
  frame) now paces a new knot's settle from the first visible frame to the
  first sleep and drops what a frame cannot afford, and the blocking
  pre-sim became a chunked pre-settle behind a trefoil loader
  (`loadSettle`, 0.45 s; its max 5 settles first). gs 18 intro p95 164 ->
  32 ms at 1x, 744 -> 189 ms at 4x; the first sleep moves 11.6 -> 21 s
  (1x) and 40 -> 98 s (4x), a slow-motion settle. *[Lore: `.claude/rules/
  physics.md` (The load settle) and `gameplay.md` (LOAD SETTLE PARAMS);
  measurements in `.claude/probes/K147/results.md`.]*

*[Stays in `CLAUDE.md`: the Architecture audit.]*

*[Moved to `.claude/rules/render.md`: RENDER LORE (GPU junction field).]*

*[Moved to `.claude/rules/probes.md`: PROBE LORE (K56).]*

*[Moved to `.claude/rules/probes.md`: PROBE LORE (the shared scratchpad).]*

*[Moved to `.claude/rules/render-gaps.md`: RENDER LORE (per-pixel gaps).]*

*[Moved to `.claude/rules/probes.md`: PROBE LORE (per-pixel gaps).]*

*[Moved to `.claude/rules/render.md`: RENDER LORE (junction overlays across the width).]*
*[Moved to `.claude/rules/probes.md`: PROBE LORE (same round).]*

*[Moved to `.claude/rules/render.md`: the RENDER LORE blocks of 2026-10-09 and 2026-10-10.]*

- K79 STAGE B (2026-10-13; agents B1, B2, B2b and B3 under session
  d8031183; the record is `docs/design/K79.md`, the lore is in
  `.claude/rules/render.md` and `gameplay.md`): the backdrop's shape
  (pattern scale, fbm detail, vellum's fibers and grain, silk's angle) and
  custom colors (a base plus three accents), as ten codec v4 appends at
  indices 72-81 after K74's `deadEndLength` (71), and the speed slider's
  max 3 -> 8 (Levi). An effect keeps its own K21 / stage-A program, byte
  for byte, until a param it reads leaves its default; then it draws with
  its `-x` program. Same-state A/B against master: 0 px in every default
  case. The phone gate (B3) held 60 fps at rest on the Pixel 11.

- THE REAL-TIME MINOTAUR (K80 stage 1, 2026-10-13; brief
  `docs/design/K80_realtime.md`, agent under session d8031183): a
  dedicated maze mode (`clock` = realtime) in which a minotaur roams the
  walk graph on a fixed 120 Hz clock while the player taps one run at a
  time at `playerPace`; it hunts within a thread distance, a catch sends
  the player back to the entrance and counts, and the solve goes on. No
  undo, no wait move, the two tails a sanctuary. Fifteen codec v4 appends
  at 84-98. The defaults come from a headless simulation of 288 mazes
  (greedy and fleeing scripted players): the only change from the
  provisional set was the hunting pace 8 -> 7. *[Lore: `.claude/rules/
  gameplay.md` (REAL-TIME MINOTAUR); harness, tables and page probes in
  `.claude/probes/K80/rt/`.]*

- STAR RATINGS (K155 stage 1, 2026-10-14; brief `docs/design/K155.md`,
  agent under session d8031183): one to three stars for every finish,
  from the distance walked (backtracks both ways, a catch's lost walk
  included) over the shortest route: three within 1.5x (and never caught
  in real time), two within 4x, one for any finish. Shown on the win
  banner and the daily stats view, where a tap explains them, and on the
  share text's title line; a daily's stars derive from its stored record,
  so nothing new is stored. The thresholds come from scripted solvers
  over 288 mazes at the defaults and 288 dailies: a careful solver earns
  three stars 94% of the time, a greedy one exactly two 52%. *[Lore:
  `.claude/rules/gameplay.md` (STAR RATINGS); harness, reports and page
  probes in `.claude/probes/K155/`.]*
- FINISH CONFETTI (K140 stage 1, 2026-10-14; brief `docs/design/K140.md`,
  agent under session d8031183): every finish's banner now throws a rain
  of paper over the screen (screen space, 140 pieces on a phone, scaled
  by the screen's area to 288 at 1400x900) and a spray of 40 pieces from
  the exit marker (world space, so it stays on the finish). Two codec v4
  appends at 99-100 (`cf` on, `cfa` amount 0-3), both daily-exempt
  playback preferences. Reduced motion keeps only a small, slow spray (a
  proposal). Render-only: it never wakes the physics, and its
  sceneAnimating() term goes false when the last piece falls out (knot
  mode then idles; fabric's paint keeps animating). *[Lore: `.claude/rules/
  render.md` (Finish confetti); probes, screenshots and the frame-time
  A/B in `.claude/probes/K140/`.]*
- OUR OWN HASH (K154, 2026-10-14; brief `docs/design/K154_K169.md`, agent
  under session d8031183): the backgrounds' noise runs on a two-lane
  integer hash of our own design (`src/render/hash2d.ts`: a multiply-add,
  then three multiply / cross-xorshift / self-xorshift rounds, constants
  from a seeded search) instead of PCG2D, whose credit is gone (Levi:
  "swap in our own"; the Perlin and Scarborough Fair credits stay and none
  is added). Tested for avalanche, uniformity, correlation and
  collisions; all six effects look the same in kind and show no tile, row
  or diagonal. The effect programs' pixels differ and their sha256 pins
  moved. *[Lore: `.claude/rules/render.md` (THE BACKGROUNDS' HASH IS OUR
  OWN), `.claude/rules/notices.md`; probes and the before/after sheets in
  `.claude/probes/K154_K169/`.]*
- THE GOLD WEB FADES IN (K169, 2026-10-14; same brief and agent): K127's
  fully traveled web turned gold in one frame; it now crossfades over 0.25
  s, caps included, and its fade keeps running under reduced motion (a
  color crossfade moves nothing). Fade in only. Pixel-identical to the
  K127 look once the fade ends, at desktop and phone width. *[Lore:
  `.claude/rules/render.md` (The gold web's fade); probes and frames in
  `.claude/probes/K154_K169/`.]*
- PLUCK PARAMS (K180 stage 1, 2026-10-14; brief `docs/design/K180.md`,
  agent under session d8031183): K104's whole-segment pluck gets three
  viewer preferences for Levi to play with, codec v4 appends 101-103,
  daily-exempt: the amount (`pw`, 0-1.5, default 0.5; 0 = the pre-K104
  pluck), how W meets the crossings along its segment (`pcx`: through,
  K104's look, or ride or pinch) and the glow (`pgl`: off, instead of W,
  with it, or a fallback that lights only for taps whose W cannot show,
  estimated at pluck time). The defaults are K104's look, 0 px in a
  same-state A/B. The census: ride and pinch leave far more taps that
  cannot be told at phone scale (pinch 71% of fabric taps, ride 94% of
  a dense design's); the fallback leaves only the sound-only taps in
  junction cores. *[Lore: `.claude/rules/render.md` (Pluck params);
  census, sheets and the A/B in `.claude/probes/K180/`.]*
- THE PLAYER'S OFF-SCREEN INDICATOR (K148, 2026-10-14; brief
  `docs/design/K148_K149.md`, Sonnet agent under session d8031183; Levi,
  2026-10-13: "When panning away from the current position, we should also
  show an offscreen indicator for it."): the head joins the finish and the
  minotaur as a K73 indicator client, wearing K83's head glyph on a black
  disc. It shows whenever the head is off screen in a fabric maze (intro,
  play, after a finish, under fog, either camera) and has no viewer setting
  of its own. A tap centers the head in the fit camera at the player's
  zoom, or eases the follow camera onto its framing and lets the spring
  resume at once. Found on the way: the indicator's icon group made the
  glyphs' filled dots inherit a 12.6 px stroke, so the head's dot and the
  bull's eyes were disc-sized white blobs (fixed in the glyph SVG writer).
  *[Lore: `.claude/rules/gameplay.md` (OFF-SCREEN INDICATORS, THE HEAD);
  probes in `.claude/probes/K148_K149/`.]*
- PAN ROOM AT THE FIT ZOOM (K149, 2026-10-14; same brief and agent; Levi:
  "we should support panning the maze a bit more off-screen at furthest
  zoom. Especially to get it out from under the menu."): the fit camera's
  pan clamp is a pure function now (`ui/view_clamp.ts`) with 0.3 of the
  screen of slack per side at every zoom, where zoom 1 had none. At
  1000x800 and 800x700 the maze overlaps the open panel at home and clears
  it at the limit; a phone's 320 px panel (78% of the width) cannot be
  cleared by any such share. The reset now eases from a slack view
  instead of snapping. *[Lore: `.claude/rules/gameplay.md` (FIT CAMERA PAN
  SLACK); probes in `.claude/probes/K148_K149/`.]*
- PAST DAILIES AS PRACTICE (K146 stage 1, 2026-10-14; brief
  `docs/design/K146_K151.md`, agent under session d8031183): the daily
  stats' History lists every past daily from #1 to yesterday, newest
  first under sticky month headers, with All / Played / Not played chips
  past 10 days, and a tap plays one. An attempt begun after its day is
  PRACTICE: its finish goes to the day's `practice` list (store v3), shows
  in History in violet, and stays out of every aggregate; its banner reads
  "Daily #N practice solved" and its share title "(practice)". An attempt
  begun on its day still counts when it finishes later, and old late
  official results stay official, flagged late. *[Lore:
  `.claude/rules/gameplay.md` (binding rule 5); probes and shots in
  `.claude/probes/K146_K151/`.]*
- THE MODE BADGE NAMES EVERY MODE (K151 stage 1, same brief and agent):
  the daily's label left the HUD's title row (gone) for the badge's spot:
  "Daily #N" (a tap opens the daily stats), "Daily #N replay · not
  scored", "Daily #N practice · not scored" (violet) and "Free play". The
  free badge, whose tap leaves free play for today's daily, fades in an X
  on hover and keyboard focus and always shows it on touch screens
  (`MODE_BADGE_X_ON_COARSE`, Levi's open question K151 (3)). The fit
  gained a one-word level ("Replay", "Practice") between the short label
  and the bare icon: on a 411 px phone with the HUD's stat rows on,
  "Daily #3 replay" did not fit and the badge fell to its icon. *[Lore:
  `.claude/rules/gameplay.md` (MODE BADGE); probes and shots in
  `.claude/probes/K146_K151/`.]*
- ARROW KEYS (K120 stage 1 Part A, 2026-10-14; brief
  `docs/design/K120.md`, agent under session d8031183): the arrow keys
  and WASD move by direction. A press takes the run at the junction whose
  start best matches the key on screen (its chord half a lattice unit
  out, within 70 degrees; an ambiguous key takes the near-tied run no
  other key claims, else nothing) and is a tap on it to everything that
  records one; a held key goes on at each junction until nothing matches
  (never straight back, stopping at forks, dead-end tips and the finish),
  the next run lit while the dot travels; in real time a press while
  running queues. The thresholds come from a census of 4259 junctions in
  24 mazes: every run has a key at 98.9% of them. Panel rows, text
  fields, the stats modal and modifier chords keep their keys. *[Lore:
  `.claude/rules/gameplay.md` (MOVES BY DIRECTION); census and key probes
  in `.claude/probes/K120/`.]*
- THE MOVE PAD (K120 stage 1 Part B, same brief and agent): a four-way pad
  in the bottom-right corner moves like the keys on touch screens (press,
  hold, slide between arms), shown while a maze is playable. A viewer
  preference (localStorage and a panel checkbox), on by default for coarse
  pointers, never in a link. Chosen over swipe-to-pick (it fights the
  one-finger pan and thread tugs) and long-press on a choice (it fights
  the press slop, and the finger hides the run). Its default and place are
  K120's call, open for Levi. *[Lore: `.claude/rules/gameplay.md` (MOVES
  BY DIRECTION); pad probes and phone-width screenshots in
  `.claude/probes/K120/`.]*

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
  current build (panel version string + screenshot). *[Moved to `.claude/rules/probes.md`: census lore.]* One
  real leftover seen: a tiny dark spur at a kink-loop tip (crossing 30
  at the current ring URL) [not seen after KINK EYES + G1: crossing 30
  and the ring URL's 12 on-screen self-crossings crop clean on a868f31
  in both renderers]. The segments-scheme seams are RESOLVED
  (junction blend round). *[Moved to `.claude/rules/physics.md`: agent-measured and not yet fixed.]*
  Optional look: a narrower two-arm fillet blend
  band (FILLET_BLEND_BAND 0.18 patch in the session scratchpad) for
  the residual tan RGB-mean crotches under segments. Icon set: user
  rejected the generated icons; a portable prompt was delivered.
  DONE: gamut UX (live recolor), physics junction spacing, reveal FX
  (all styles), fillet spurs/overhangs, gap jitter, terminal-pass
  guard, olive smudges (pathColor binding).

*[Stays in `CLAUDE.md`: the P5/P6 status.]*

**Deferred, not phase-blocking** (pick up opportunistically, not
before P4 unless the user asks):
- P2 polish still open in Follow-ups: the "make the hero settle
  visibly angular" zigzag→curve blend, and slack~0 thread waviness.
- *[Moved to `.claude/rules/physics.md`: the test/sweep.manual.test.ts note.]* (The `public/` suicide service workers
  from commit af2efb4 were removed 2026-07-24 — their stale-worker cure
  had long since taken effect and nothing in the app registers a SW.)

*[Moved to `.claude/rules/physics.md`: the Web Worker plan.]*

*[Stays in `CLAUDE.md`: the Verification rule.]*

## Follow-ups

- *[Moved to `.claude/rules/physics.md`: The sleep gate counts SIM TIME (K63).]*
- **Physics broadphase rebuilt flat (P3.42): phys 85.9 -> 15.8 ms,
  10 -> 32 fps mid-drag at fat params.** applySegmentCollision was 73%
  of ALL CPU (measured via CDP profile, probe recipe: drag-wiggle 4s at
  the fat URL) - the cost was the per-call Map<number, number[]>
  spatial hash rebuilt 4x per substep, not the narrow-phase math. *[Moved to `.claude/rules/physics.md`: the counting-sort grid.]* TWO GOTCHAS measured during verification: (1) settle
  sweeps now report "asleep" at sim ~3.9s for EVERY seed (was 4.0-6.3)
  - not a physics change: the sleep gate counted 45 STILL FRAMES, and
  faster frames span fewer sim-seconds; quiet-start is unchanged. Do
  not compare sim-at-sleep across builds with different frame rates.
  (Until K63: the gate counts sim time now, see above.)
  *[Moved to `.claude/rules/physics.md`: gotcha (2).]*
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
  *[Moved to `.claude/rules/probes.md`: probe lore and recipes.]*
  *[Moved to `.claude/rules/render.md`: lessons.]*
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
  correct render needs per-pixel masking). *[Moved to `.claude/rules/physics.md`: the twist material ratchet.]* Held/pulled
  twists now park at pairDist 1.23-2.43 with CURVED eyes (arcs well
  above chords, ctrl gaps 2.7-5.4) and every hold/pull crop shows
  fully separated over/unders - zero color-color contact for the
  first time in the saga. Verified: fat + default sweeps 8/8 (6.3-6.8
  / 3.9); census riders 0 fresh + post-tug, re-sleeps 16.3; cinch
  clean (cinch pairs sit at 4-8 ctrl, unaffected); scans clean; 20/20
  tests. *[Moved to `.claude/rules/physics.md`: lessons.]*
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
  untouched this round - the P3.37 battery stands). *[Moved to `.claude/rules/probes.md`: lesson.]*
- **Twist-collapse during a HELD grab (THE user artifact): RESOLVED by
  the world-space twist contact floor + the flip fill bias (P3.37).**
  Recipe (user's, deterministic): outside twist, grab one thread
  BETWEEN the two intersections, HOLD 6s - one intersection rendered a
  gapless ragged merge. *[Moved to `.claude/rules/probes.md`: the probe.]* *[Moved to `.claude/rules/physics.md`: the world-space contact floor.]* (2) RENDER - held pairs
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
  attribution. *[Moved to `.claude/rules/physics.md`: lessons.]*
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
  24 -> 48, OVER_PATCH_MAX_SAMPLES 56 -> 128. *[Moved to `.claude/rules/physics.md`: force-side coverage.]*
  *[Moved to `.claude/rules/probes.md`: diag_scan.]*
  *[Moved to `.claude/rules/physics.md`: the quiescence test.]* Verified: cinch probe (6
  twists, the exact gesture) renders clean woven over/unders; fat +
  default sweeps 8/8; riders 0; tap2 sleeps; scans clean; 20/20.
  *[Moved to `.claude/rules/physics.md`: lesson.]*
- **The "merged parallel threads" seam was a SINGLE THREAD all along:
  RESOLVED by the concave-side miter clamp (P3.34).** Three
  pair-floor fixes (P3.31-33) changed nothing on the user's screen
  because the artifact was never a pair: a centerline turning tighter
  than the ribbon half-width makes the triangle strip's inner
  vertices cross past the local center of curvature - the strip
  self-overlaps and draws a jagged sawtooth seam inside the fill that
  READS as two merged threads. Invisible to every pair census, and
  the old miter (halfWidth/cosHalf, both sides) made it WORSE at
  sharp joins. *[Moved to `.claude/rules/render.md`: the concave-side miter clamp.]* *[Moved to `.claude/rules/physics.md`: the physics helpers.]* Curvature census
  lives in the probe archive (probe_curv). Verified: harsh headless
  wound re-sleeps at sim+6.5 (was +49); both sweeps 8/8; riders 0;
  tap2 sleeps; scans clean; 19/19. *[Moved to `.claude/rules/probes.md`: lesson.]*
- **Frozen merge seam after play: RESOLVED for the casual-play class by
  the two-tier push law + renderability-aware sleep (P3.33); the
  torture-play residual is owned by the open attractor problem.** User
  repro'd the same seam TWICE (P3.32's flat cap RIDE_MAX_PUSH 1.2e-2
  lost the tug-of-war against bd 1.75 bending at a hairpin tip - the
  equilibrium parked 10-15% below width and the sleep gate froze it).
  *[Moved to `.claude/rules/physics.md`: the push-law experiments and the riders gate.]* Verified: moderate play (5 sites,
  2.2-unit drags) riders 0 and sleeps at sim 21.6 with the pending
  gate draining first; fat sweep 8/8; tap2 sleeps; scans clean; 19/19
  fast. *[Moved to `.claude/rules/physics.md`: known residual.]*
- **Post-play riders in the sin 0.35-0.55 band: RESOLVED by the strict
  ramp + emergent coverage + bounded authority (P3.32).** User repro:
  parallel-thread merges reappeared on the fat URL after play. *[Moved to `.claude/rules/probes.md`: the census rule.]* *[Moved to `.claude/rules/physics.md`: the fix.]* Headless violent wound now re-sleeps at sim+49 (test
  budget 1920 frames; the old 30-s pass was sleeping ON the merges).
  Census after: riders 0 at rest (fresh + small-tug), 4-6 transients
  mid-churn (was 23-27); fat sweep 8/8 asleep; standard play session
  settles FASTER than P3.31 (post-play mv 3.2e-3 vs 5.8e-2); scans
  clean; 19/19. Accepted residual: a truly blocked pair in a
  pathological wound can freeze merged - rare, bounded, and owned by
  the open loud-attractor problem below.
- *[Moved to `.claude/rules/physics.md`: OPEN: post-VIOLENT-play loud attractor (K13).]*
- **Fresh-settle limit cycle at fat widths: RESOLVED by crossing
  coverage + soft cosmetic margin on the anti-riding floor (P3.31).**
  P3.30's floor pumped with NO interaction at fat params (tw 0.52,
  rep 0.4, bd 1.75, sm 0.7): 3 of 8 seeds never slept, hot sites at
  STEEP crossings (sin 0.85-1.0), mv bursting 1.2e-2 - 7e-2 through
  the stick/unstick hysteresis (the freeze/unfreeze regimes have
  different equilibria - a limit cycle THROUGH the friction switch).
  *[Moved to `.claude/rules/physics.md`: crossing coverage and the two-zone floor.]*
  Verified: fat sweep 8/8 asleep sim 5-7s (was 5/8 at 12-23s + 3
  never); default sweep 8/8 at 3.9s unchanged; rider census 0 fresh
  AND post-tug (P3.30 regression guarded); play+tap re-sleeps; scans
  clean both repro URLs; 19/19 tests. *[Moved to `.claude/rules/physics.md`: the amended invariant.]*
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
  *[Moved to `.claude/rules/physics.md`: THE INVARIANT.]*
- **"Threads too close" (all remaining forms): RESOLVED by TRUE-3D
  collision (P3.29).** The tug-then-rest census showed ZERO violations
  of the depth-exemption spec - the spec itself permitted sub-width
  hugging in every crossing's exempt core. *[Moved to `.claude/rules/physics.md`: the true-3D model.]* Deleted: ZONE_SLOTS/zones,
  sharedZone, quartic falloff, CrossingZones (collector dedup is now a
  spatial scan of registered contacts). Post-tug census: flatClose
  (2D-close without depth separation) 0, VIOL3D 1 marginal at 92% of
  floor (Gauss-Seidel sandwich residual), 472 clean over/unders. All
  scans/settles/tests green. *[Moved to `.claude/rules/physics.md`: the z state and rendering.]*
- **Torn/mangled crossings after a small pull: RESOLVED by rendering at
  the true intersection (P3.28).** The user's actual workflow - a small
  tug, then observe AT REST - left crossings drawn as jagged, torn
  merges. Cause: the ordering clamps pin the physics binding away from
  the true intersection during the pull, the graduated weld then
  freezes that displacement into the rest state, and the renderer drew
  the erase + over-fill AT THE BINDING - beside the real overlap.
  *[Moved to `.claude/rules/render.md`: displayF.]* *[Moved to `.claude/rules/probes.md`: probe rule.]*
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
  is now derived from tw/gap in the URL instead of a constant. *[Moved to `.claude/rules/probes.md`: probe rule.]*
- **Deep penetration at extreme params: RESOLVED by the final-authority
  collision projection (P3.26).** At rep 0.4 (raw repulsion distance
  0.25 < thread width — the slider could silently disable spacing),
  bend 1.75, smooth 0.7, tw 0.52, PBD collision at stiffness 0.5 lost
  its committee votes: equilibria settled in visible interpenetration
  (census: 9 cross-thread pairs at 0.31 vs the 0.60 floor) and the
  quiescence gate froze them. *[Moved to `.claude/rules/physics.md`: the final-authority principle.]* Census after: crossFree 0,
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
  < 0.7 margin at rest): 8 → 0. *[Moved to `.claude/rules/probes.md`: probe rule.]*
- **Post-play endless jiggle: RESOLVED by graduated contact friction +
  the spacing/window triangle (P3.23).** P3.22's depth model removed the
  lens's parasitic tangential weld — which had ALSO been the only
  dissipation for the PBD standoff (bending/structural/collision cancel
  ~1e-1 each at rest). After a play session the knot rang forever at
  ~5e-2, above the binary stick gate. *[Moved to `.claude/rules/physics.md`: the root causes, the triangle and graduated friction.]* Verified:
  play session + tap re-sleeps in ~2s at dr 0.5; all 4 tap sites clean;
  scans clean on both repro seeds; weak tug still slides 9.4 ctrl.
  *[Moved to `.claude/rules/physics.md`: the regression guard.]*
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
  friction. *[Moved to `.claude/rules/physics.md`: negative results.]*
  *[Moved to `.claude/rules/probes.md`: the retracted claim and its probe rule.]*
- **Giant gaps at loop-end twists: RESOLVED by arc-length gap margins
  (P3.21).** The erase cut boundary was the over ribbon's OFFSET CURVE
  (perpendicular distance = fillHalf + gap), so the bare margin projected
  as gap/sin(angle) along the under thread — at the ~30° crossings that
  loop-end twists settle into, spans hit 1.07 with naked background
  wedges ~2× gap per side, reading as giant gaps. Fix: cut at the over
  SILHOUETTE (fillHalf) and push caps outward by `gap` as ARC LENGTH —
  margin now constant along the thread at every angle (span range
  collapsed 0.59–1.07 → 0.59–0.67). *[Moved to `.claude/rules/probes.md`: the scanner lesson.]*
- **The `cp` coupling toggle is REMOVED (P3.20).** The experiment
  answered its question: cp=0 welds crossings (collision has no
  tangential projection) and under stress leaves bound pairs torn up to
  ~0.8 apart that render as naked holes / displaced gaps at twists (the
  user-reported "occasional large gaps at loop-end twists" repro'd
  exactly this way). *[Moved to `.claude/rules/probes.md`: why it went.]* Re-add from git
  history if ever needed.
- **Physics micro-oscillation floor: RESOLVED by static/kinetic contacts
  (P3.17).** Rest floor is now ~2e-3 units/substep (was ~1e-2): static
  mode freezes the crossing machinery so the constraint standoff repeats
  identically. QUIET_EPS 1.5e-2 and the test bound 1.2e-2 could tighten
  to ~5e-3 if ever useful. *[Moved to `.claude/rules/physics.md`: negative results.]* Still open:
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
