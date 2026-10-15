---
paths:
  - "src/render/marker_glyphs.ts"
  - "src/render/marker_mesh.ts"
  - "test/render/marker_glyphs.test.ts"
---

# Render lore: marker icons (K83)

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
  N-gon marker lore again). SIZE: one radius for all three,
  markerRadiusFor(tw) = max(0.55, 1.5 tw) world - read it there, never
  copy the formula (the old start/exit discs were 0.95 tw, the head's
  ringed dot 0.54 tw): about 14 CSS px across at the phone's default zoom
  (8.8 px per lattice unit at gs 18; the old discs were 8.7 px, a glyph
  could not read there) and 34 px on the 1400x900 desktop. The start/exit
  gap slots grew with the disc (concentric by construction - markerWorld).
  ORDER start < head < exit: at the entrance the player sees "you are
  here"; once solved, the flag and the win ring (1.32 radii) show. The
  head glow stays, under the weave. The three meshes are page-lifetime
  (each scene borrows them; destroy() hands them back) - the PALETTE_CACHE
  lore. The burn intro no longer colors the start disc (sectionColorAt
  went with the colored discs).
