# K1179 S1: the fill-outline spike, offline (K1178 Run I)

The rule under test (from `docs/design/K1179_geometry_review.md` sections 6
and 7): at each junction, the fill outline is the union of the arm bodies
(half-width h) and form B's rolling-ball rounds, sampled in float64 with
100 points per round and every 0.01h along the edges. Tested offline in
Node (`npx.cmd vite-node`), no GPU, browser, server or phone, against
master's form B settings at HEAD `4007c5db`: `new FormB(scene)` with no
params - reach "quad", dEdge "near" with dEdgeTip 1, rootBand 0.5, and
Run H's tip-scaled root gate **on** (`rootBandScale: "tip"`, landed in
`ab7cad9a`; at gate699's angle the band is the flat 0.5h, near-straight
corners get a smaller band).

Inputs: the 12 K868 scenes (`def`, `fat`, `ring`,
`user_tw42.lightpaper`, `g41_def_tw42`, `g41_def_tw64`, `muse_hash`,
`muse_default_tw`, `g41_ring_tw42`, `g41_ring_tw64`, `g41_user_tw42`,
`g41_user_tw64`; FieldScene v1, sim 40.0167, physics frozen; their
`.master.png` frames are border-look captures of c4e4e67e and were not
compared against) and the 4 seq13 recordings (`def_drag`, `def_flow`,
`muse_drag`, `muse_flow`, 41 frames each, read from the main checkout's
`.claude/probes/S3a/seq13/`; `seq13_lib.ts` copied from the k868-s3a
worktree and pointed at that path). Probe code:
`.claude/probes/K1179/outline.ts` (the outline sampler),
`spike_scenes.ts` (criteria 1-2), `spike_motion.ts` and `spike_sweeps.ts`
(criterion 3), `spike_cost.ts` (criterion 4); outputs in
`.claude/probes/K1179/out/` (`scenes`, `motion`, `sweeps`, `cost` as
`.txt`/`.json`, plus `worst_*.svg` plots of the worst cusp sites).
Nothing in `src/` or `test/` changed.

How the outline was sampled, and three measurement choices the numbers
below depend on:

- The arm edge is the true tube outline of a polyline: segment offsets
  joined at centreline vertices by a radius-h arc on the convex side and
  by the offset lines' intersection on the concave side. Connecting
  offset sample points with chords instead reads dents at every vertex
  that are not in the union boundary (checked on synthetic T/Y/acute
  stands from `test/render/field/form_b.test.ts`: gap 0, tangent jump
  0.00 deg, min curvature >= 0 at every corner).
- Curvature is signed Menger curvature over a uniform 0.01h resample
  with a 0.05h baseline (samples i-5, i, i+5), normalised so a round's
  arc reads +1/r. Adjacent triples at the 0.01h step read centreline
  vertex noise (near-duplicate vertices sit below the step), not bends.
- Only exposed boundary is measured: a sampled point strictly inside
  some chain's tube (distance < h, form B's candidate grid) is buried,
  not boundary, and a round counts as exposed only when both ball feet
  lie inside their arms' spans and r and omega are live. Corners failing
  that are counted as not exposed (their outline joins elsewhere).

## Verdict: fail

Criteria 1, 2 and 4 fail as gated, and criterion 3 fails on the
recordings' edge points while passing on its sweeps and on round points.
The conflict (Run I task 4): the cusp and G1 failures are at rest, on
curved arms, where a ball foot sits on a centreline vertex or a tight
bend; the same rounds are stable in motion. The three rest/motion
criteria cannot hold together while feet and tangents are read off
polyline segment offsets - the open choice is whether the outline is
drawn per pixel from the distance field (where a vertex foot's outline
is the vertex arc, and the ball arc is tangent to it by construction)
or the centreline is smoothed before outlining. Cost independently
fails per frame. Details per criterion follow; S2's checks are at the
end.

## Criterion 1: no concave cusp

Gate: normalised curvature >= -0.01/h from foot to foot plus 0.1h on
each side, on exposed live rounds; and no round below 0.25h where the
rule (r0) gives at least 1h, except in a null band (counted and listed).

| Scene | Corners | Not exposed | Cusp corners | min k*h | Small rounds in / outside null band |
|---|---|---|---|---|---|
| def | 361 | 29 | 108 | -21.72 | 61 / 2 |
| fat | 0 | 0 | 0 | - | 0 / 0 |
| ring | 45 | 4 | 15 | -0.64 | 8 / 0 |
| user_tw42.lightpaper | 150 | 7 | 46 | -24.48 | 15 / 0 |
| g41_def_tw42 | 385 | 5 | 102 | -31.92 | 19 / 0 |
| g41_def_tw64 | 302 | 41 | 103 | -64.11 | 80 / 2 |
| muse_hash | 192 | 43 | 82 | -54.10 | 102 / 7 |
| muse_default_tw | 320 | 15 | 119 | -37.20 | 47 / 0 |
| g41_ring_tw42 | 51 | 0 | 10 | -21.33 | 0 / 2 |
| g41_ring_tw64 | 41 | 3 | 18 | -15.00 | 9 / 0 |
| g41_user_tw42 | 150 | 7 | 44 | -24.44 | 15 / 0 |
| g41_user_tw64 | 122 | 12 | 48 | -51.34 | 28 / 3 |

695 of the exposed live rounds read a concave bend below -0.01/h
somewhere in the foot-to-foot window. By magnitude (k*h bins
[-0.05,-0.01) / [-0.35,-0.05) / [-1,-0.35) / below -1), summed over
scenes: 74 / 317 / 224 / 80 - most are small dents of a few degrees
over the 0.05h baseline, not spikes; 80 corners bend by more than
about 6 degrees the wrong way. `fat` has no junctions, so both
criteria are vacuous there. Fold sites (sampled edge points buried
inside a tight bend's own tube, dropped from the outline): 9-68 per
scene - the naive offset folds there and the union outline cuts
across, which the per-pixel form would have to reproduce.

Worst cusp sites (scene, junction, arms, corner angle, r, min k*h):
`g41_def_tw64` j102 arms 0-1 (67 deg, r 0.11h, -64.1);
`muse_hash` j43 arms 0-1 (84 deg, r 2.71h, -54.1);
`g41_user_tw64` j35 arms 2-3 (78 deg, r 0.13h, -51.3);
`muse_default_tw` j58 arms 0-1 (89 deg, r 0.06h, -37.2);
`muse_hash` j61 arms 1-2 (108 deg, r 0.18h, -36.6);
`g41_def_tw42` j65 arms 2-0 (162 deg, r 2.00h, -31.9). SVG plots of
the six worst are `.claude/probes/K1179/out/worst_*.svg`. The dents
sit at the feet and in the first 0.1h of edge: the edge leaving a
foot on a curved arm bends away from the wedge (the arm's own
curvature, read on the concave side), and at vertex feet the edge
direction steps by the centreline's vertex angle.

Small rounds: 400 corners have r0 >= 1h and r < 0.25h. 384 are in a
null band - foot past its span, cap-band slack (room <= 0.5h), V's
foot inside the root band, or omega 0 - and are listed with their
reason in `out/scenes.json`. 16 are outside all of those (room
0.53-3.66h, feet inside their spans): `def` j66 1-2, `def` j102 2-3,
`g41_def_tw64` j102 2-3 and j133 0-1, `muse_hash` j7 1-2, j8 2-0,
j24 1-2, j114 2-0, j150 0-1, j155 1-2, j156 2-0, `g41_ring_tw42`
j4 2-0 and j9 1-2, `g41_user_tw64` j35 2-3, j54 0-1, j55 1-2. At
these the remaining gate factors (margin or steep, not separated
here) shrink the round; if those do not count as a null band, this
half of the criterion fails on these 16 as well.

## Criterion 2: G1 where pieces meet

Gate: tangent jump at most 1 deg and gap at most 0.05 device px
(dpr 2) at every foot and hand-off, no exceptions on the 12 scenes.

Feet (live exposed rounds only; sharp joins below r = 0.05h meet at
V by design and have no foot): the gap is 0.0000 device px at almost
every foot when read against the ball's own segment offset - the
tangent point is on its segment's offset line by construction - and
the tangent jump is 0.00 deg on the straight synthetic stands. On the
scenes, read against the drawn outline (segment offsets with vertex
arcs) within +-0.1h of the foot: 58 feet have a gap over 0.05 device
px (worst 1.95 device px, `g41_user_tw64` j35 arms 2-3 foot B) and
80 have a tangent jump over 1 deg (worst, leaving out the degenerate
180 deg readings at `muse_hash` j155/j156's 0.12h rounds where the
arc's radius direction is ill-conditioned: 8.9 deg, `g41_def_tw64`
j102; typical worst per scene 6-9 deg). 116 feet fail one or both.
These are feet whose nearest outline piece within +-0.1h is not the
ball's own segment - a vertex foot, or another part of a folded arm
nearer than the foot's segment - so the arc meets a different piece
of edge than the one it was solved against.

Hand-off at each arm's span end L (6,358 arm-sides): position gap 0
and tangent jump 0.0000 deg everywhere the +-0.02h window holds no
centreline vertex - the domain edge and the ribbon edge are the same
offset point at L by construction. Windows containing a vertex read
the arm's own bend and were not gated.

Verdict: fail as gated (the brief allows no exceptions), with the
hand-off half passing exactly.

## Criterion 3: stable in motion

Recordings (41 frames each, all kept distinct; boundary points
exposed in both frames compared; edge skeleton = its centreline
foot's motion, round skeleton = the larger of its two feet's):

| Recording | Points compared | Over 1 dev px (edge / round) | Max excess |
|---|---|---|---|
| def_drag | 1,678,961 | 279 (273 / 6) | 2.85 dev px |
| def_flow | 1,640,885 | 752 (750 / 2) | 5.95 dev px |
| muse_drag | 667,222 | 1,013 (993 / 20) | 12.75 dev px |
| muse_flow | 650,831 | 1,609 (1,572 / 37) | 7.39 dev px |

Round points are nearly clean (2-37 over, of 154k-303k compared per
recording). The failures are edge points: an arm rotating about a
point away from the sample moves its outline point by the centre's
motion plus h times the rotation, and a point at fixed arm-distance
changes segment as the arm bends; the worst (`muse_drag` frame 19,
junction 113 arm 0) rides a 79 device px skeleton move and exceeds
it by 12.7. Appear/vanish by cause, per recording (identity events,
exposure transitions separate): edge points appear and vanish as
spans grow and shrink (216-2,910 per recording each way, largest
under flow), round corners appear and vanish almost only as
window/wedge nulls (42-504 each way), and exposure lost/gained
transitions (a point buried or uncovered by a tube sliding over it)
run 4.3k-36k per recording under flow. No arm-gone or no-V events
were classified in the recordings.

Sweeps, measured as K1114's probes measure them (stands copied
verbatim from `.claude/probes/K1040/s1/gate699_s1i.ts` and
`dedge_s1g.ts`, dpr 1 as there; ink steps per coarse step with
appearing and vanishing corners included; boundary points tracked
on the same steps):

| Sweep | Ink step | Brief's gate | Boundary max excess |
|---|---|---|---|
| gate699 coarse (e 0.005h) | 0.1270 at e 0.37 | 0.125 | 0.000 dev px |
| gate699 fine | 0.0007 | 0.125 | 0.000 dev px |
| tee coarse (dc 0.01) | 0.1480 at dc 2.23 | 0.148 | 0.000 dev px |
| tee fine | 0.0000 | 0.148 | 0.000 dev px |
| ring coarse (dc 0.01) | 0.1737 at dc -1.60 | 0.174 | 0.000 dev px |
| ring fine | 0.0000 | 0.174 | 0.000 dev px |
| synthetic arm, 60 deg in 0.005h tip steps | 0.0508 | (boundary rule) | 0.006 dev px |

The coarse ink steps equal K1114's recorded ordinary rates to the
digit (0.1270, 0.1480, 0.1737; `docs/design/K1114_s1i_rounding.md`
F3/F4), so no step is a new pop; gate699's 0.1270 sits 0.002 over
the brief's rounded 0.125 gate and tee's 0.1480 at its gate, both
the sweeps' ordinary edge motion, not a corner appearing or
vanishing (corners do appear and vanish during gate699 - 3 appear,
1 vanish over the coarse sweep - with no ink or boundary step).
The synthetic sweep passes the boundary rule outright (max excess
0.006 device px over 1.27M compared points, no corner lost).

Verdict: fail on the recordings (edge points), pass on every sweep
and on round points. The edge failures are rotation leverage, not
corner pops - whether an outline point at fixed (arm, s, side)
should be allowed its rotation term is S2's definition to settle.

## Criterion 4: cost

Under the perf lock (`$env:TEMP\claude-perf.lock`, owner K1179),
desktop, `new FormB(scene)` timed per frame (the constructor holds
the corner solve; `evalPoint` not timed). 12 scenes, median of 7:

| Scene | Corners | Build median | Per corner |
|---|---|---|---|
| def | 361 | 30.17 ms | 83.6 us |
| fat | 0 | 3.30 ms | - |
| ring | 45 | 3.53 ms | 78.5 us |
| user_tw42.lightpaper | 150 | 12.90 ms | 86.0 us |
| g41_def_tw42 | 385 | 31.74 ms | 82.5 us |
| g41_def_tw64 | 302 | 23.58 ms | 78.1 us |
| muse_hash | 192 | 17.38 ms | 90.5 us |
| muse_default_tw | 320 | 26.60 ms | 83.1 us |
| g41_ring_tw42 | 51 | 4.46 ms | 87.5 us |
| g41_ring_tw64 | 41 | 3.02 ms | 73.6 us |
| g41_user_tw42 | 150 | 11.50 ms | 76.7 us |
| g41_user_tw64 | 122 | 9.14 ms | 74.9 us |

Recordings (every distinct frame): build p95 62.85 ms (def_drag),
68.71 ms (def_flow), 33.38 ms (muse_drag), 28.56 ms (muse_flow);
per-corner p95 0.154-0.191 ms. Split on two scenes (median of 5):
`def` - baseline without junctions 3.11 ms, V and arm spans (all
corners sharp) +11.34 ms, ball integration +16.80 ms, total 31.26 ms;
`muse_hash` - baseline 4.98 ms, V and spans +13.11 ms, ball +1.57 ms,
total 19.66 ms (its rounds are mostly gated small, so the ball is
cheap and the V/span solve dominates).

Verdict: as a per-frame budget (0.75 ms, the review's phone 2 ms at
the desktop ratio), fail by 40-90x. Per single corner solve, p95
0.15-0.19 ms through the recordings passes 0.75 ms. No optimization
was tried: this run may not change `src/`, and any probe-side
shortcut would no longer be master's form B. The split says where
a production solve must save: the per-corner V/span work (about
80 us per corner in this reference, before the ball), not only the
ball integration.

## What S2 should check

1. The phone GPU check as planned (the review's stage 2: at most
   4 ms at 2x for the whole fabric) - untested here, and now the
   gating question, since the CPU reference cannot hit a per-frame
   0.75 ms at any fidelity.
2. Whether the per-pixel outline (distance to segments, G4's
   junction domains) actually removes the criterion 1/2 failures:
   at a vertex foot the distance-field outline is the vertex arc
   and the round is tangent to it by construction, so re-run
   criteria 1-2 against a distance-field outline (not segment
   offsets) on the worst sites named above - `muse_hash` j155/j156,
   `g41_def_tw64` j102, `g41_user_tw64` j35 - before building
   the pass.
3. The 16 small rounds outside every null band: separate the
   margin and steep gate factors at those corners and say whether
   they are a null band or a lost round.
4. The edge-point skeleton definition for criterion 3: allow the
   rotation term (outline point motion vs its foot's, plus h times
   the arm's turning) or track edge points by arc length along the
   outline instead of (arm, s, side); the recordings' numbers
   above are the before table either way.
5. Fold sites: at 9-68 corners per scene a tight bend's offset
   folds within 0.1h of a foot and the union outline cuts across
   the fold; a per-pixel pass gets this from the distance field,
   a mesh pass must trim it explicitly.

Reproduce: `npx.cmd vite-node .claude/probes/K1179/spike_scenes.ts`,
`spike_motion.ts`, `spike_sweeps.ts`, and `spike_cost.ts` (the last
under the perf lock). Outputs regenerate into
`.claude/probes/K1179/out/`.
