---
paths:
  - "src/render/**"
  - "test/render/**"
---

# Render lore

Binding lore for the renderer, moved verbatim from CLAUDE.md by K45
(2026-10-12). A passage taken from inside a longer entry is labeled with
its source; the narrative around it is in `docs/history.md`. Crossing
gaps (G1) have their own file, `render-gaps.md`. The user's standard,
from the P3.39 lessons in `physics-collision.md`: no thread-thread
contact without a dark line, ever. Add new render lore to its topic file
(listed at the end), not to CLAUDE.md.

RENDER LORE (hard-won, 2026-10-10): **a custom pixi shader ignores
mesh.texture.** Pixi v8's Mesh texture setter only updates
`shader.texture` (bookkeeping) and GlMeshAdaptor binds uTexture from
mesh.texture for the DEFAULT shader only, so the shared section shader
kept the strip it was created with: `pathColor` NEVER reached the
ribbons (default gold), while the CPU-composed fillet fans used the real
pathColor - olive fans on gold paths at a khaki pc= (the user's "olive
smudges"). Any texture a shared custom shader samples must be bound via
its resources (`bindAccent`).

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

- *From P3.40 (gap shapes at loop-end twists), lessons:* LESSONS: (1) one artifact NAME hid three mechanisms - attribute the
  exact primitive under the bad pixel before choosing a fix class;
  (2) a shaper guarding a rare degeneracy must be curvature-
  PRESERVING or it becomes the artifact at the sites that need it
  most; (3) an erase boundary may be truncated but never extended
  past its solved exit - extension erases material nothing repaints.

## Where the rest of the render lore lives

K173 (2026-10-14) moved each topic to a file that attaches only with the
files it is about; `docs/lore_index.md` lists every rules file and its paths.
- `render-gaps.md`: per-pixel crossing gaps (G1)
- `render-paint.md`: shader paint (G2), pulses, the hover rim (K145, K111), ring laps (K299), palette order, gamut locality
- `render-backgrounds.md`: shader backgrounds (K21, K79)
- `render-hash.md`: the backgrounds' hash (K154)
- `render-ribbon.md`: ribbons and junctions: the junction field, fills, arc-wrap, wedges, fans
- `render-pluck.md`: plucks: the concave-side cap, base collapse (K77), still plucks (K104), pluck params (K180), pluck emphasis (K279), pluck cusp (K344)
- `render-markers.md`: marker icons (K83), marker size and colored dots (K98)
- `render-routes.md`: route bands (K81)
- `render-web-fade.md`: the gold web's fade (K169)
- `render-confetti.md`: finish confetti (K140)
- `render-explore.md`: the thread reveal (K76): visibility pieces, the explore program, its looks
- `render-shaders.md`: shader compiles and what they freeze, the warm-up (K307)
