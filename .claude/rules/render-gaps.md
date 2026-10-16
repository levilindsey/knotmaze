---
paths:
  - "src/render/gap_mask.ts"
  - "src/render/ribbon_renderer.ts"
  - "src/render/ribbon/**"
  - "src/render/ribbon_mesh.ts"
---

# Crossing-gap lore (G1)

Lore for the per-pixel crossing gaps (casing masks in the ribbon
fragment shader), moved verbatim from CLAUDE.md by K45 (2026-10-12).
The census numbers below are G1's baselines (K42 must hold them). The
matching probe lore (the implementation-independent census, slot
attribution, same-state proofs) is in `probes-census.md` and
`probes.md`; general render lore in `render.md`.

## PER-PIXEL CROSSING GAPS

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
  clears the casing band, +0.12, floor 0.35). On a self-crossing the
  plucks' under-node clip fades out by the same-chain exclusion's split,
  max(0.12, half the arc less 0.08), short of the chain's own over pass
  (K344, render-pluck.md). A STILL pluck (reduced
  motion, K104) uses no footprint and no clip: its "pluck-still" program
  runs gapKeepAt over its ribbon's own slots (`bindPluckGap`, bound from
  bindGap; the host's `gapIds`), so it hides exactly where the ribbon
  beneath it hides. Same-state A/B toggles on
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
  CUT_BIAS. Fixed by K104 (8e21538): makePluckHost's casing() is
  casingWidth/2 + CUT_BIAS, and K77's weave probe's partner-band pixels
  changed mid-pluck fell 3724 -> 196 of 10226 (fabric) and 3398 -> 128 of
  10463 (knot), 8 crossings each, zoomed in]. GPU DRAW: user 0.79 -> 1.78
  ms/frame, ring 0.43 -> 0.92,
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

## RENDER LORE (per-pixel gaps)

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

## Marker gaps

- *From the 2026-10-11 small fixes, concentric dot gaps:* CONCENTRIC DOT GAPS (5983077, user spec): the gap
  around a start/exit dot is a ring of radius dot + gap (lanes march to
  that circle); the old dot-circle-plus-arc-margin edge kept the dot's
  own tighter curvature.

## The thread reveal's gap gate (K76 stage 2b)

- `GapMaskTable.setVis(slot, k)` (2026-10-14) scales a slot's solved
  strength by k, and k <= 0 rejects the slot in texel 0. The table keeps
  each slot's solved strength and reject radii, so a factor re-applies
  without a re-solve, and writeSlot / clearSlot reset it to 1. The
  renderer sets k only while the reveal is on (the over thread's
  visibility at the over pass; a marker disc's 0 or 1) and restores 1
  when it turns off. The rule and its census: `render-explore.md`.
- K268 stage 1 (2026-10-14), the shaped cut: `setShape(slot, shape |
  null)` writes a slot's fade profile into three texels at the end of its
  row (GAP_PROF_BASE 111, so GAP_TEX_W 111 -> 114) and sets texel 3.w's
  bit 4 (GAP_FLAG_SHAPED), which only the explore program's gapKeepAt
  reads; null, writeSlot and clearSlot clear both. The texture uploads
  ROW-PARTIAL now: its own uploader `knot-gap-rows` sends only the rows
  written since the last upload (`GAP_UPLOAD_STATS`), not the whole
  table. The rule, the classifier and the census:
  `render-explore.md`.
