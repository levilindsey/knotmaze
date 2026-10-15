---
paths:
  - "scripts/diag_scan.mjs"
  - "scripts/fold_census.mjs"
  - "scripts/fold_census.ps1"
  - "scripts/fold_census.ts"
  - "scripts/fold_census.vite.config.mjs"
---

# Probe lore: census and diagnosis

Moved verbatim from `probes.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `probes.md` lists the area's other files.

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

- *From the open artifact queue (2026-10-11), census lore:* Census lore from
  the hunt: probe_bites' "third-thread bites" (erases cutting a joint's
  bridge beside the crossing, 61/63/78 at the ring URL) are real in the
  BASE layer but covered by webs in the final image; a rescue-patch
  repaint was built, measured, and DISCARDED (it drew faint edge lines
  and fixed nothing visible). Self-crossing censuses must restrict
  "the over thread" to the over PASS's local ribbon (a shared chain
  matches the under pass too); tight kink loops still confound it.

- *From P3.40 (gap shapes at loop-end twists), probe lore and recipes:* PROBE LORE: `window.__knotRenderer()` now exposes the renderer -
  tinting `underErases[i]` by index (emergent white) attributes WHICH
  primitive draws a wrong pixel; this cracked in one capture what
  three blind fixes missed. Session probe scripts die with the
  scratchpad - recipes: gesture battery = hold pair midpoint 6s /
  pull perp 0.5 + hold / grab 0.7 past pair, pull perp 1.2, release;
  sweep = 8 seeds x fat/default, expect "asleep" by wall 18s.

- *From P3.36, diag_scan:* diag_scan: a long erase whose over-patch out-spans it is a COVERED
  long crossing, healthy - only uncovered spans are flagged.

- *From P3.32 (post-play riders), the census rule:* The
  P3.30 ramp zeroed the floor by sin 0.55 on the assumption that
  2D-close pairs in the 0.35-0.55 band are crossing-adjacent and
  render - true at rest, FALSE for tunneled tangles from violent play
  (renderability census: 23-27 unrenderable riders mid-churn, NONE
  sharing a registered crossing; the P3.30 census only counted
  sin < 0.35 and missed the class; my P3.31 census classified pairs
  with the force pass's own coverage rule and so could not see
  coverage leaks either - A CENSUS MUST MEASURE RENDERABILITY, i.e.
  erase-reach coverage, never the force rule under test).

- *From P3.24 (sink-through), probe rule:* Probe rule: census scripts must
  replicate the force pass's zone lookup exactly or they lie.

- *From P3.21 (giant gaps at loop-end twists), the scanner lesson:* The scanner's BIG-GAP threshold sat
  at 1.3 and certified the bug as healthy through two "clean" audits —
  now 0.85. Lesson: a scanner threshold chosen without a perceptual
  reference is a rubber stamp; calibrate against what the worst healthy
  case SHOULD be.
