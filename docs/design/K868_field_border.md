# K868: the border look from one field

Status: approved for prototyping (Levi, 2026-10-26). Prototype only:
nothing reaches the app until Levi accepts the contact sheets. Supersedes
K862 and K864-K866, which are parked at 6e12716e (branch
`park/muse-2026-10-26`). Stage briefs: `K868_s1a_scene_export.md`,
`K868_s1b_oracle.md`.

## 1. Why a new approach

From 2026-10-22 to 10-25 the border look's junctions were assembled from
pieces: thread strips with edge bands, junction fans, and joinery that cut
windows out of one piece's band where another piece takes over. Every
artifact Levi named was a seam between two pieces, and the 15 or so
patches moved seams rather than removing them. K866 tried the union of
everything (the minimum of the pieces' distance fields). That also fused
the over and under threads at crossings, and a min-union draws ink along
buried edges (§3.5). The checks behind those patches measured coverage
and a few tangents, never ink where there should be paper, so regressions
passed green.

Levi's words (Muse sessions):
- The look: "This should look like white paper in the background ... This
  should then not draw fill colors for the threads. Instead, this should
  draw only a border edge along either side of the threads. We don't show
  any gaps in this mode. Instead, it's clear which threads cross over vs
  under vs join at junctions, based on the edge strokes." Graphite-like
  texture is wanted later, "unless that's too non-performant".
- 10-22, corners: "sometimes a rounded corner looks good instead of a
  sharp cusp, but sometimes a cusp looks better ... I'd like to support a
  mixed mode where some corners are rounded and some are not ... maybe it
  should be a slider that controls what ratio are rounded?" (K830's `crs`
  and builder pins.)
- 10-22, dead ends: the cap was drawn as "a full circle, leaving a circular
  are within the interior of the thread". 10-25: "dead-ends AREN'T showing
  their closed rounded ends."
- 10-23: "the original border of the original segment continuing to render
  across the end of the new segment where it joins; that section of the
  old-thread border shouldn't render. Similarly with 4-way intersections,
  but worse ... we should be hiding the sections of border that are
  covered/overlap with filet lines. Also, with filets ... they often don't
  join/contact one end at a smooth tangent with the corresponding thread".
- 10-25: "'butt' indentations on the straight thread ... straight line of
  the border running across the end of the joined-in thread ... the
  dead-ends end cap isn't perfectly matched to the thread borders ... all
  branch arm.borders aren't perfectly aligned with thread borders. Can we
  really not take a different approach in how we fuse these thread and
  junction geometries together such that the border strokes would be fused
  and seamless?"
- 10-26: prototype G2 curvature-matched fillets alongside G1.

## 2. Goals

1. Paper background; each thread is two edge strokes around a hollow
   (paper) interior. Graphite texture comes later.
2. No gaps: at a crossing the over thread's edges run through, and the
   under thread's edges stop exactly on the over's outline.
3. A junction is one outline: edge, corner curve, edge. Nothing inside it:
   no old border across a mouth, no double strokes, no caps or butts.
   3-way and 4-way alike.
4. Corners are G1 joins (ideally G2), round or sharp per corner as K830
   decides (`crs`, builder pins).
5. Dead ends are closed round caps, G1 with the edges, hollow.
6. Arms keep the thread's width and line up with it exactly.
7. Highlights can tint a thread's interior.
8. 60 fps on the Pixel 11 (GPU at most 4 ms at dpr 2); links work on the
   laptop and the phone.

## 3. The model

### 3.1 Tubes

Chain i's centreline c_i(s) is the polyline through the renderer's samples
(s = arc length). Its tube T_i is every point within h of that polyline: two
side curves at ±h and, at an open end, a semicircular cap of radius h,
tangent to both side curves by construction. h is the thread's half-width;
the ink band W is measured inward from the outline.

Side curvature, wherever it is read (curvature combs, a G2 join's end
match; G1 needs none): the Menger circle through the centreline at s − h,
s and s + h, offset to the outline: with κ signed (+ turning left) along
the centreline's direction, the left side's curvature is κ/(1 − hκ) and
the right side's κ/(1 + hκ), negated for an outline walked the other way.
One h of window smooths the polyline's vertex steps without blurring the
arm's own bend (S2, `K868_s2_g2.md`).

### 3.2 Surfaces: union within, occlusion between

Each group of thread pieces is one sheet of paper cut to the union of its
pieces, with a border drawn just inside its outline, and the sheets stack
by depth:

    ink(p)  iff  p ∈ R_top(p)  and  dist(p, ∂R_top(p)) ≤ W

R_top(p) is the region of the topmost group containing p. Every other pixel
shows paper (the background colour at p), inside threads and out. So:
- a crossing is two groups: the over owns the overlap, its edges run
  through, the under's edges end on the over's outline, with no gap and
  no overlap;
- a junction is one group, whose outline runs edge, corner curve, edge;
- a kink loop, or a chain passing near itself, is one chain far apart in
  arc length, so two groups, ordered like any crossing.

### 3.3 Depth

Depth comes from the diagram, not from physics (decided 2026-10-26, after
S1b's finding 1). Each crossing in the scene's table pins its two passes
at the crossing's arc length on each chain: z = +amp on the over pass,
−amp on the under. Along a chain, z blends between its pinned crossings
and is continuous; an isolated crossing (no other crossing on that chain
within 2·DEPTH_WINDOW) keeps the physics tent, falling to 0 at
DEPTH_WINDOW. S2 chooses the blend and records it here. A group's depth at
p is the z of its member nearest p. Ties (|Δz| < ε) go to the higher chain
id.

The blend (S2, `src/render/field/depth.ts`): every pin carries a hat, amp
at the pin and falling linearly to 0 over a window that is, on each side,
min(DEPTH_WINDOW, the gap to the neighbouring pin on that side); z is the
sum of the signed hats. So z is exact at every pin (a neighbour's hat is 0
there); two pins closer than the window are joined by a straight line (no
dip toward 0 between two overs, a straight ramp from an over to an under);
a pin whose neighbours are at least one window away keeps the physics tent,
and between one and two windows the two tents overlap and sum, as physics
sums them, with both pins still exact. z is continuous along the chain and
in the pins' positions (a window shrinks continuously as a neighbour comes
within it), so a crossing sliding along a chain never pops. Only the two
pins bracketing s matter, so it is O(log n) per lookup. DEPTH_WINDOW is in
ctrl units; the scene's optional `look.ctrlArc` (arc length of one ctrl)
converts it, and S1a's scenes, which predate it, use 0.47 (muse_hash's
physics z changes slope on ctrl slots with a median spacing of 0.48). The
oracle keeps the old rule (`depth: "scene"`, the exported z) for
comparison.

Why: pinning doubles the worst margin z_over − z_under (2·amp, against the
summed tent's 0.93·amp on k42 and the exported z's 1.35·amp on muse_hash),
and it does not depend on physics: it is a pure function of the crossing
table and the geometry, so the renderer computes it on main (§9). The
summed tent inverts no crossing centre (S2, check 14). In k42's cyclic
triple (chain 0 over 1, 1 over 2, 2 over 0, about 1.5h apart) the area all
three tubes share (1.67h²; a triangle of side 1.5h has inradius 0.43h < h)
cannot honour all three pairwise orders under any per-pixel depth. There
the blend decides (each chain tops about a third under either rule), and
S1b's k42 failures of #6 and #7 all lie inside it (`docs/design/K9-K42.md`).

Check 14 on muse_hash at cr 3: 349 of 350. Crossing 15 is left: its over
pass sits at chain 2's open terminal, 4.9h from its under pass, so the
table's crossing is not where the geometry crosses (a scene question, not
depth). The others that failed before K883 had both passes in one group
(§3.4).

### 3.4 Candidates and groups

At p the candidates are the local minima over s of |p − c_i(s)| on every
chain, within reach (h + W plus the corner reach; the oracle may be
generous). Candidates join into groups by union-find:
- Same chain, |Δs| ≤ σ (about π·h; S1b measures whether 3h is safer): one
  piece. A sharply bent tube yields two minima of one tube.
- Different chains, or one chain beyond σ: one group only if both are arms
  of the same junction J and both s lie inside J's span: on each arm, from
  the root out to that arm's corner reach (the tangent point, or V when
  sharp; h with no corner) plus W plus a margin, and never past the arm's
  cap (below). Junctions whose spans overlap merge into a cluster.
- Everything else: separate groups, ordered by depth.

A crossing is two surfaces, so no group may hold both of its passes. An
arm's cap is the first of:
- the chain's end;
- the next junction's root on that chain;
- a crossing cut. When one cluster's spans hold both passes of a crossing
  (a pass counts as held up to L + h past an arm's far end, L =
  h·cot(θ/2) being the overlap's reach along a pass and θ the crossing's
  acute angle), every arm holding the pass farther from its root stops at
  d − (L + h), d being that pass's distance from the root. A tie cuts
  pass a. Cuts split clusters, so the test repeats until nothing changes
  (at most 12 rounds); a crossing found again cuts both passes.

Same-chain joins respect the cut (K900): cluster joins go first, then σ
joins nearest first, and a σ join is refused when one side already holds
a pass of a crossing (by the cut's own L + h) and the other side holds the
other pass. Padding the cut by σ instead would stop arms 3h or more short
of passes they never clash with.

The margin is h, not h/2 as until K900: the round end of a cut arm clears
the over pass's border iff cos θ + m·sin θ ≥ 1 for a cut at L + m·h, which
m = 1/2 fails past θ 53.1° and m = 1 meets for every θ. L + h is also
check 15's window, so the cut and the check see the same holds.
`OracleParams.passJoins` ("k883") and `passMargin` (0.5) keep 5048670e's
rule for A/Bs.

The oracle keeps each cap and its reason (`FieldModel.armCaps`), and the
round corners are fitted inside the caps (§3.8). Checks 15 and 16 test it.
Crossing 292 (muse_hash, cr 3; #15 349 of 350 at 5048670e) is j140's END
(chain 84) hooking back over j140's own through (chain 66) at 47°. Two
mechanisms put both passes in cluster 68 (j123, j139, j140). The END's
span ended 2.84h from the over pass, outside the old pad (L + h/2, 2.80h)
but inside check 15's window (L + h, 3.30h), so no clash was found and the
throughs' spans stayed whole over the under pass. And the hook's own
candidates (s 32.55 to 34.76) σ-join the cluster. On muse_hash the cut at
L + h alone clears it (350 of 350 with either join rule) and the refusal
alone does not (349). The synthetic `j_hook_cross` (gen.ts `hookScene`,
a 1.5h, R h) fails under either change alone and passes under both, so
both stay (`k883.test.ts`).

The span's margin keeps the rule continuous: just outside it an arm alone
draws exactly what the junction group draws there.

### 3.5 The exposed outline

The distance in the ink rule is to the group's EXPOSED outline, the
boundary of the union: side-curve pieces outside every other member, corner
curves, exposed caps. It is not the minimum over members. Inside a union,
min(F_i) underestimates depth wherever a member's buried side runs inside
another member, so a min-union draws ink along the buried sides, out to
W / sin(φ/2) from a corner of opening φ: the old border across a mouth,
the 4-way's four border pieces, the lines under the fillets.

A point of a member's outline is exposed iff a point ε outward lies outside
every other member of its group. Two GPU forms; S3 picks:
- (A) The CPU computes exposed arc-length intervals per arm side (they end
  at the corner tangent points), and the shader measures only those, plus
  the corner curves and caps.
- (B) Per pixel, a member side's foot point is dropped when it lies inside
  another member. Each corner member must then bury the side pieces
  between V and its tangent points. A cheap superset such as
  wedge(q; t_A, t_B) ∩ annulus(q; r, |q − V| + W) is valid only while it
  stays inside the tubes, which fails at acute corners with large r.

### 3.6 Ends

- An END arm of a junction: physics fuses its terminal onto the through
  chain's centreline (`src/physics/particle_system.ts`: MazeJunction,
  fusedJunctions), so its offset d is near 0. The arm is extended straight
  to c′, the terminal's projection onto the through's centreline, and
  capped there. That cap lies inside the through tube, so it is always
  buried: no stub, butt or circle shows.
- A dead end is the tube's own cap (§3.1): one closed outline, paper
  inside.
- An end anchored off-screen draws nothing.

### 3.7 Corners

A corner is the wedge between two arms adjacent in angle, with opening
θ < 180°. The two arms of one through chain are one tube and have no
corner; two arms of different chains, or the two ends of one chain, do. Its
corner curve K joins A's side curve to B's:
- V, sharp (r = 0): the side curves' intersection point.
- G1 arc (rolling ball): the disc of radius r touching both tubes from the
  gap. Its centre q lies at distance h + r from both centrelines, where the
  two offset curves at h + r meet (solve on the polylines, since arms
  curve). t_A and t_B are q's feet on the side curves, and K is the arc of
  circle(q, r) from t_A to t_B. The corner fill is the curvilinear triangle
  V, t_A, t_B. As r goes to 0, K goes to V.
- G1 is the rule: on sheet E (2026-10-27) Levi saw no difference between
  G1 and S2's curvature-continuous candidates (clothoid pairs, G2 Béziers,
  superelliptic arcs, arc splines). They are recorded in `K868_s2_g2.md`
  and not pursued.
- Master's sharp corner: S1b documents what master draws there
  (`src/render/ribbon/joinery.ts`), so it can be kept if Levi prefers it.

Per-corner style: builder pins (`fusedJunctionPins`, K830) win, then `crs`
rounds the broadest unpinned wedges first
(`src/render/ribbon/corner_share.ts`). Scenes carry master's resolved style
per corner.

An arc meets the arms ℓ = r·cot(θ/2) from V, a long web when θ is small
(3.7r at 30°, 5.7r at 20°); §3.8's mapping bounds it.

### 3.8 r from the existing knobs

`crs` (cornerRoundShare, default 1) is the share of corners drawn round.
`cr` (cuspRadius, "Corner reach", 0 to 6, default 3) sizes the round.
Master keeps its own mapping (S1b, finding 5): r(θ) = h·max(0,
1.25·cr·tan(θ/2) − 0.97) as a quadratic Bézier rim, rejecting corners at
θ ≲ 49° (`docs/design/G3G4_sdf_geometry.md` §3.5's
k_max = c_cal·h·max(0, 1.25·cr − 1) omits the angle).

The field's mapping (2026-10-27: Levi asked for a slider on sheet C; the
oracle's `cornerRadius` and `cornerRadiusMax`):

r(θ) = (cr/3)·min(2h, 1.5h·tan(θ/2)),

so ℓ ≤ 0.5·cr·h and r ≤ r_max = (2/3)·cr·h, the reach bound used for
timing. There is no separate web cap; the 2h cap takes over at θ ≈ 106.3°.
cr 0 is sharp and cr 6 twice as round as cr 3, which is sheet B's approved
corner, except that sheet B left corners under 14.7° sharp and rounded
those from 14.7° to 18.4° less.

The short-arm fit: a round lies inside both arms' spans (§3.4). Each
tangent point's foot stays at most cap − W from the root, so
r ≤ room·tan(θ/2), room = min over the two arms of
(cap − W − |V's foot|), then smaller until the solve fits (a few
re-solves). With no room past V the corner is sharp. The oracle records
the fit and its reason (`Corner.fit`).

The corner with no V: the two centrelines stay closer than 2h all along
the shorter arm, so the outlines never meet on the wedge side (muse_hash
j58/1: 2.93h of arm A, max gap 1.85h). It draws the union of its arms as
far as they overlap: no fill and no round, and its arms' spans reach arm
A's far end and that point's foot on arm B. Its V solve still counts as
failed (muse_hash: 341 of 342 corners solve).

## 4. Scenes

The format is `src/render/field/scene.ts` (version 1): per chain, the
renderer's centreline samples and z per sample; the crossing table;
junctions with their arms in angle order and master's corner styles; dead
ends; named crops (POIs); the camera and the look. Everything is in world
units.

Real scenes (S1a exports them with `window.__knotSceneExport` and
`scripts/export_scene.mjs`):
- The hash-locked scene of Muse's crops:
  `?3&tlk=border&tw=1.1&cr=6&bg=wash&bgcm=custom&bgc0=e6e9ee&am=instant&snd=none&stb=0&fw=0&phw=0`,
  `__knotStepUntil(40)`, physics hash 733ee14a. POIs: j123 and j49
  (renderer junction indices, found as `.claude/probes/K862/fbd_shot.mjs`
  does) and tip (free tip 0, as in `tip_fbd.mjs`).
- The same seed at the default `tw`; ring, def and fat from
  `.claude/probes/g1/urls.mjs`.
- The G4-1 set (G3G4 §5.8): ring, user, userThin and def, × tw {0.42, 0.64}
  × fl {0, 0.34}, at dsf 3. It is exported once per geometry; knobs that
  only affect rendering (cr, crs) vary at render time.

Synthetic scenes (S1b builds them, in `test/render/field/scenes/`): T at
90°, Y at 120°, acute 30° and 20°, a 4-way (two fused throughs), a 4-way
with adjacent ENDs, a junction beside a crossing, a kink loop, a dead end,
an oblique (30°) crossing, a K42 cyclic triple, and a junction on a tightly
curved through.

## 5. The oracle

A CPU reference that reads only a scene JSON and shares no code with the
app's renderer. Per pixel (supersampled) it finds every candidate on every
chain (exhaustive local minima), the groups, the top group by depth, and the
exact distance to that group's exposed outline. The exposed outline comes
from dense samples of every member's outline (side curves, caps, corner
curves), kept iff a point ε outward lies outside the group's other members.
Transitions between kept and dropped samples are refined by bisection, and
the distance is exact point-to-segment through a spatial hash. Inside tests
are analytic. On synthetic scenes, a Euclidean distance transform of the
rasterised union cross-checks the field.

Outputs per render: a PNG; float32 signed distance to the top group's
exposed outline, and the top group's id, per pixel (S3 diffs the GPU against
these); and a JSON and markdown report of the checks.

## 6. Checks

Pixels are CSS pixels at the scene's camera. Each check runs on the
oracle's field and, where it is image-based, on any render (master's
screenshots, later the GPU's frames), so master's defects show as numbers
too.

| # | Check | Pass | Stage |
|---|-------|------|-------|
| 1 | Interior ink: ink deeper than W + 1 px inside the top group, with a named "mouth clear" subset at each junction mouth | 0 px | S1b |
| 2 | Corner joins at t_A, t_B: tangent angle; position gap | ≤ 0.5°; ≤ 0.01 px | S1b (G2 curvature jump: S2) |
| 3 | Dead-end cap vs a true semicircle: geometric Hausdorff; in the image | ≤ 0.05 px; ≤ 0.5 px | S1b |
| 4 | Arm width outside corner spans | 2h ± 0.05 px | S1b |
| 5 | No double strokes: ink runs met walking inward from the outline | one run, ≤ 1.1 W | S1b |
| 6 | Under bands end on the over's outline | within 0.5 px, no gap, no overlap | S1b |
| 7 | Over edges continuous through crossings | no break | S1b |
| 8 | Two edges per thread on cross-sections away from joins | exactly 2 runs | S1b |
| 9 | Band width along the outline normal | W ± 0.25 px | S1b |
| 10 | Exposure intervals (GPU form A) vs brute-force burial | equal within ε | S3 |
| 11 | Depth order: the top group at each crossing centre is the scene's `over` | all | S1b |
| 12 | GPU vs oracle: ΔF within 2W of outlines; top ids; colour elsewhere | ≤ 1/32 px; equal except within 1 px of outlines; ≤ 2/255 | S3 |
| 13 | Pixel 11 GPU time at dpr 2, cr 3, under the perf lock | ≤ 4 ms, 60 fps | S3 |
| 14 | Pinned depth: z_over > z_under at each crossing, and the under never on top at its centre (every crossing, in view or not) | all | S2 |
| 15 | No group holds both passes of a crossing (§3.4; kinks whose passes lie within σ are skipped) | all | K883 |
| 16 | Each crossing's over pass keeps both borders through the crossing: its side samples that should show are inked | all | K883 |

## 7. Contact sheets

Crops at 6x, captioned with their check results, in the main checkout's
`.claude/probes/K868/sheets/`. The coordinator looks at every sheet and
uploads it to the K868 folder on Drive (agents never upload). Levi's eye is
the gate.
- Sheet A: every synthetic case.
- Sheet B: master next to the oracle (G1) at j123, j49 and tip, at the same
  camera, plus full frames.
- Sheet C: the r sweep {0, 0.25h, 0.5h, h, 2h} and the web-length cap, on
  T, Y, the acute cases, the 4-way and j123.

## 8. Stages

| Stage | What | Model, cap |
|---|---|---|
| S1a | Scene exporter: hook, driver, master screenshots, camera, overlay proof (`K868_s1a_scene_export.md`) | Opus, 2 h |
| S1b | Geometry core, synthetic scenes, oracle, checks, sheets A-C (`K868_s1b_oracle.md`) | Opus, 2 h |
| S2 | Depth from the diagram (§3.3), the corner solve's failures, G2 variants and curvature combs, sheet E (`K868_s2_g2.md`) | Opus, 2 h |
| K883 | Sheet B's missing borders: no group holds both passes (§3.4), the slider mapping, the short-arm fit and the corner with no V (§3.8), checks 15-16, sheets B2 and F (`K883_oracle_borders.md`) | Opus, 2 h |
| S3 | WebGL2 prototype (reusing `rp=sdf`'s tables where they fit), GPU vs oracle, Pixel fps; settles the END tuck and the band W against master (S1a notes) | after Levi's look at sheets B2 and F |

Then Levi's gate on the sheets, then integration behind a flag.

## 9. Integration, after Levi's gate

- A new param appended to `CODEC_PARAMS`, default off until Levi switches
  it on.
- z on main: the worker's snapshot carries no zPos (hence `phw=0` in the
  probes). Decided by §3.3: depth is computed render-side from the
  crossing table, so the snapshot needs no z.
- After the switch-over: delete the border look's joinery paths, then K9
  (the fill look on the same field: the interior takes the thread colour
  and the band becomes the casing) and K345 (the hover rim follows the
  outline).
- Graphite texture: world-space noise, or outline coordinates (arc length
  along the exposed outline, position across the band) for grain that
  follows the stroke.
