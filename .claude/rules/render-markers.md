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
  thread widths, default 1.08 (the pre-K83 head dot, radius 0.54 tw),
  clamped to [0.25, 3] (sanitizeMarkerSize). markerRadiusFor(tw, size,
  scale) = size / 2 x tw x scale (scale: setMarkerStyle's probe
  multiplier), with NO world or screen floor, so the slider means the
  same at every zoom. The default SHRANK (K83's discs are size 3 wherever
  tw >= 0.37, larger below it). Panel:
  the maze folder after the confetti rows, fabric mode only, no step
  (keyScale 0.05, 2 decimals). main.ts sets fabric.markerSize at
  construction and every fabric tick (a no-op unless it moved); a slider
  edit sets renderDirty, so one render pass resizes the gap slots and
  markers without waking the physics. THE RING CALL: the start and finish
  sit on a dot of their thread's color of radius markerDotRadiusFor =
  max(0.95 tw, r + 0.41 tw) (MARKER_DOT_MIN_TW, MARKER_RING_TW). The two
  terms meet at the default, which is exactly the pre-K83 pair (a 0.95 tw
  colored disc around the 0.54 tw dot); above it the rim stays 0.41 tw,
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
  unit on the 1400x900 desktop, 9.0 on the 411x753 phone): the default
  disc is 12.2 CSS px across on the desktop (K83: 33.9) and 5.1 on the
  phone (K83: 14.1, the minotaur 20 with its floor), where the glyphs
  barely read. Sheet: `.claude/probes/K98/sheet_k98.png` (+ .html);
  `k98_shot.mjs` freezes a real-time maze after sleep and switches sizes
  live, `build_sheets.mjs` assembles it.
