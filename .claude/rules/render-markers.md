---
paths:
  - "src/render/marker_glyphs.ts"
  - "src/render/marker_mesh.ts"
  - "test/render/marker_glyphs.test.ts"
---

# Render lore: marker icons (K83) and marker size (K98)

Moved verbatim from `render.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `render.md` lists the area's other files.

## Marker icons (K83)

- MARKER ICONS (K83, 2026-10-13; worktree agent). Levi: "placeholder
  icons for the start, finish, and current positions ... minimal, white
  strokes with clear background. Rendered within a black circle with a
  bit of margin roughly equal to the stroke width." He will replace the
  glyphs; the contact sheets are in `.claude/probes/K83/`. GLYPHS
  (marker_glyphs.ts, pure): designed in a 24-grid like line-icon sets
  (polylines with round caps and joins, circles, dots), compiled into
  the DISC frame and scaled until the outermost ink sits exactly
  MARKER_MARGIN = MARKER_STROKE = 0.15 radii inside the rim, so every
  glyph shares one stroke width and the stroke scales with the marker.
  Defaults: play / flag / ring-and-dot; alternatives per role. A new
  glyph is one design entry; the tests check its fit and that the shader
  can hold it. markerGlyphSvg / markerGlyphSvgMarks write the same shapes
  as SVG, and markerGlyphSvgFit(id, role, inkR) scales the marks to any
  glyph box (the off-screen indicators can draw the identical flag).
  DRAWING (marker_mesh.ts): ONE QUAD per marker with a signed-distance
  fragment shader - capsule-union strokes (exact round caps and joins),
  rings, dots and the disc, with an analytic one-pixel ramp from dFdx.
  Not pixi Graphics: its round caps take 15 * angle * sqrt(radius) / pi
  segments from the RAW local radius, about 4 per cap at these sizes (the
  N-gon marker lore again). SIZE: one radius for every marker, set by
  K98's markerSize (below). K83's was max(0.55, 1.5 tw) world, 3 tw
  across: about 14 CSS px at the phone's default zoom and 34 px on the
  1400x900 desktop. Read it from markerRadiusFor or
  FabricMazeRenderer.markerRadius(), never copy the formula. The
  start/exit gap slots follow the outermost disc (concentric by
  construction - markerWorld). ORDER start < head < exit: at the entrance
  the player sees "you are here"; once solved, the flag and the win ring
  (1.32 radii of the finish's colored dot since K98) show. The head glow
  stays, under the weave. The meshes are page-lifetime (each scene
  borrows them; destroy() hands them back) - the PALETTE_CACHE lore.
- MARKER SIZE, COLORED DOTS, TWO GLYPHS (K98, 2026-10-14; worktree agent,
  brief docs/design/K98.md). Levi, 2026-10-13: one slider for the
  player's dot "diameter relative to the thread width", 0.25 to 3, every
  in-game marker at that size, colored dots back at the start and finish
  with color showing around the icon at the default, and simpler minotaur
  and spider glyphs. THE PARAM: `markerSize` (`mks`, codec index 104,
  daily-exempt; K57 reviews the list) is the black disc's DIAMETER in
  thread widths, default 1.08 at K98 (the pre-K83 head dot, radius 0.54
  tw) and 2 since K225 (2026-10-20; Levi: 1.08 is about 5 CSS px on the
  phone), clamped to [0.25, 3] (sanitizeMarkerSize; the slider top stays
  3). markerRadiusFor(tw, size,
  scale) = size / 2 x tw x scale (scale: setMarkerStyle's probe
  multiplier), with NO world or screen floor, so the slider means the
  same at every zoom. K98's default SHRANK them (K83's discs are size 3
  wherever tw >= 0.37, larger below it); K225's 2 is two thirds of K83's
  wherever tw >= 0.37. Panel:
  the maze folder after the confetti rows, fabric mode only, no step
  (keyScale 0.05, 2 decimals). main.ts sets fabric.markerSize at
  construction and every fabric tick (a no-op unless it moved); a slider
  edit sets renderDirty, so one render pass resizes the gap slots and
  markers without waking the physics. THE RING CALL: the start and finish
  sit on a dot of their thread's color of radius markerDotRadiusFor =
  max(0.95 tw, r + 0.41 tw) (MARKER_DOT_MIN_TW, MARKER_RING_TW). The two
  terms met at K98's default (size 1.08), exactly the pre-K83 pair (a
  0.95 tw colored disc around the 0.54 tw dot); above it the rim stays
  0.41 tw (the default 2 since K225 draws a 1.41 tw dot around a 1 tw
  disc),
  below it the 0.95 tw floor holds (rim 0.825 tw at 0.25), so the color
  always shows past the thread it ends. A rim proportional to the disc
  (1.76 r) would sink under the thread's half-width below size 0.57. The
  color is RibbonRenderer.sectionColorAt (colorAtArc, burn and roots
  included), so the burn intro colors the start's dot again, as before
  K83. DRAWING: MarkerMesh.setRingColor + place(x, y, r, outer). The quad
  scales to max(r, outer); uFrame.x converts quad to disc units, uFrame.y
  is the dot's radius in disc radii, uRing its color (a = 0: none), and
  the dot's rim gets the disc's analytic ramp. mesh.scale is therefore the
  OUTER radius (K198's markersRight reads it). READERS of the radius: the
  gap slots, the finish's edge indicator and the confetti spray (the dot
  radius), the head's and the minotaur's indicators (the disc radius).
  The camera, the follow camera and the tap targets read none. THE
  MINOTAUR is drawn at markerRadius: K80's 1.15x and its 10 CSS px floor
  are gone (the glow stays 3 / 3.8 of its radii). GLYPHS: "horns" (the
  Taurus sign: a ring under a crescent of horns) is the minotaur's
  default, so its edge indicator wears it too (DEFAULT_GLYPHS); "bull"
  stays as the alternative. "spider" (its own role: a two-dot body, eight
  mirrored legs) has NO mesh (MeshRole excludes it) until K114 (Levi's
  call 7) decides what it marks. MEASURED (tw 0.52; 21.7 CSS px per world
  unit on the 1400x900 desktop, 9.0 on the 411x753 phone): K98's default
  disc was 12.2 CSS px across on the desktop (K83: 33.9) and 5.1 on the
  phone (K83: 14.1, the minotaur 20 with its floor), where the glyphs
  barely read; K225's default 2 gives 22.6 and 9.4 (the colored dot
  31.8 and 13.2), by the same scale. Sheet: `.claude/probes/K98/sheet_k98.png` (+ .html);
  `k98_shot.mjs` freezes a real-time maze after sleep and switches sizes
  live, `build_sheets.mjs` assembles it.

- THE START MARKER FADES WHEN ITS THREAD BURNS (K408, 2026-10-15; K114
  stage 2's branch, e536bb6): FabricMazeRenderer `syncStartMarker`, fed
  by drawFire, fades the start disc out with a WebFade (0.25 s) once the
  fire passes its thread point, and back in on a restart; its gap slot
  follows the fade's target. The record: gameplay-fire.md's THE START
  MARKER BURNS.

- THE SWORD MARKER (K137 stage 3b, 2026-10-21): the role "sword"
  (`MarkerRole`, and so a mesh role) with one placeholder design,
  "sword" (point up: a tapering blade, a crossguard, the grip and a
  pommel dot), for Levi to replace. FabricMazeRenderer `markers.sword`
  (page-lifetime like the others) sits at the sword's spot at
  markerRadius while the sword is ready, on either clock (`syncSword`,
  called from syncMinotaur), under the fog sprite like the exit marker;
  it waits for the intro to draw its thread and hides where the thread
  reveal has not shown its point (vis below 0.98). marker_glyphs.test.ts
  checks its fit like every glyph's. The rules: gameplay-minotaur.md's
  THE SWORD.

- THE EXTRA MONSTERS' MARKERS (K137 stage 3d, 2026-10-21; s3d call 4, a
  stand-in for stage 4's look): no new glyph. FabricMazeRenderer
  `syncExtras` (called from syncMinotaur) places one MarkerMesh per extra
  in the turn clock's `extraViews`, borrowed from the page-lifetime
  EXTRA_POOL into `extraLayer`, just under the minotaur's layer. ASLEEP,
  either kind wears the minotaur's glyph at EXTRA_ASLEEP_SCALE 0.8 of
  markerRadius, alpha EXTRA_ASLEEP_ALPHA 0.55, no dot (a follower hides
  in plain sight). A follower WAITING wears K98's spider glyph (its first
  use) on an amber dot (EXTRA_AMBER) at alpha 0.85; AWAKE, its kind's
  glyph on a red dot (EXTRA_RED) at alpha 1; the dot is EXTRA_DOT 1.3
  radii. Each waits for the intro to draw its point and hides where the
  thread reveal has not shown it (vis below 0.98), like the sword. The
  layer sits under the fog sprite unless minoFog is "always" (then over
  it, under the minotaur); under "hunting" they stay under, since that
  rule reads the minotaur's hunt (a residual). Probe hook:
  `extraMarkers` (layer-local x, y, scale and alpha; page points need
  `mesh.getGlobalPosition()`, probes.md's K137 stage 3d). The rules:
  gameplay-minotaur.md's SLEEPERS AND THE FOLLOWER.

- THE CHALK TICK AND THE COMPASS (K137 stage 2, 2026-10-21): the role
  "tick" (a mesh role) with one placeholder design, "tick" (a check mark),
  for Levi to replace. FabricMazeRenderer `drawAids` (after drawMarkers in
  update(), so it redraws only with the markers) places a pooled tick
  (`TICK_POOL`, page-lifetime) by each marked junction at TICK_SCALE 0.7
  of markerRadius, TICK_OFFSET 1.15 radii up and right, under the head
  marker; and the COMPASS, a mint triangle (HINT_COLOR 0x7dffc4, a dark
  0.12 r outline) drawn in the markers' Graphics, COMPASS_DIST 1.9 radii
  from the head toward the point COMPASS_REACH 1 ctrl along `goodArm()`,
  COMPASS_SIZE 0.75 r long. Main toggles both with `invalidate()` (a
  one-shot render), never a wake. marker_glyphs.test.ts checks the tick's
  fit like every glyph's. The rules: gameplay-mechanisms.md's The aids.
- THE KEY AND LOCK MARKERS (K138 stage 4, 2026-10-21): roles "key" and
  "lock", one placeholder design each ("key": a key lying flat, the bow
  left, two teeth; "padlock": a shackle over a body with a keyhole), for
  Levi to replace; DEFAULT_GLYPHS maps key to "key" and lock to "padlock".
  FabricMazeRenderer `drawLocks` (in update() after drawOneWay, so it
  redraws with the markers) places pooled meshes (`KEY_POOL`,
  page-lifetime, under the head marker): a key at each key junction whose
  key the walk does not hold, at KEY_SCALE 0.85 marker radii on a gold dot
  (KEY_GOLD, KEY_DOT 1.3 of its radius); a padlock at the middle of each
  lock run while a key it needs is missing, at LOCK_SCALE 0.75 with no
  ring. Neither shows on thread a reveal has not shown (revealQuery or
  exploreVisAt under 0.98), nor a padlock on a hidden run. `lockMarkers`
  (x, y, r, kind) are LAYER-LOCAL: page points come from
  `mesh.getGlobalPosition()` plus the canvas rect (probes.md's K137 stage
  3d GOTCHA). marker_glyphs.test.ts checks both glyphs' fit and
  DEFAULT_GLYPHS. A closed lock run also dims at both ends (scene.ts
  `ruleDims`, slice 1's run-table dim). The rules: gameplay-mechanisms.md's
  Locks and keys.
