---
paths:
  - "src/ui/param_codec.ts"
  - "src/ui/url_state.ts"
  - "src/ui/daily_link.ts"
  - "test/ui/param_codec.test.ts"
  - "test/ui/url_codec.test.ts"
  - "test/ui/seed_text.test.ts"
  - "test/ui/appear_mode.test.ts"
---

# Gameplay lore: links and the codec

Moved verbatim from `gameplay.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `gameplay.md` lists the area's other files.

## Links and the codec

- *From COMPACT LINKS (2026-10-11), decoder details:* DETAILS beyond the spec, each for a measured reason:
  a TRAILING "=" on the token is tolerated (`new URL(link).searchParams
  .append(...)` re-serializes `?<token>` as `?<token>=&...`), as are
  trailing dots (sentence punctuation after a pasted link); `&key=value`
  pairs after a token apply as overrides, so probes keep writing
  `&am=instant` / `&mf=0`, and unknown keys (fbclid, utm_*) drop on the
  rewrite. The decoder is strict otherwise: an invalid char, truncation,
  a version other than CODEC_VERSION (K132), out-of-range index/option,
  reserved number code, or leftover bits beyond the zero padding rejects
  the whole blob (seed kept, today's defaults, one console.warn) -
  all-or-nothing, never a partial design. A listed boolean flips TODAY's
  default, so flipping a boolean default inverts every link that lists it
  (K74's deadEnds: `?12l.IS3ygt` turned dead ends on before it, off
  since).

- *From COMPACT LINKS, a query without a seed:* A query WITHOUT a seed (`?am=instant`) is no link at all: a fresh
  design at TODAY's defaults (the bare page too, until K56 made it the
  daily).

- trailLength's default is 10 (K73, 2026-10-12; Levi: recentPath should
  light "about twice as far"; slider max 30). The dailies read 5 until
  K132 and 10 since; K46's memory-trail days were designed around 5
  (docs/design/K46_daily_variety.md).

- LOAD SETTLE PARAMS (K147, 2026-10-13; the mechanism is physics-settle.md's
  "The load settle"): `settleBudget` (`stb`, ms of physics a frame while a
  new knot first settles; 0 = off, i.e. real-time stepping and its
  catch-up spiral) and `loadSettle` (`lds`, seconds of hidden pre-settle
  stepping; 0 = none, the max 5 = settle first: hidden until the first
  sleep) are APPENDED to codec v4 at indices 82 and 83 (after K79 stage
  B's 72-81). Both are DAILY_EXEMPT_KEYS:
  they pace how a device plays a design's settle, they do not change the
  design (like physics on/off), so a daily stays the daily with either set
  and the golden dailies do not move. Panel: "Motion & intro", before
  Replay settle. url_state.ts clamps both (SETTLE_BUDGET_MAX 30,
  LOAD_SETTLE_MAX 5); override keys `stb` / `lds`.

- MARKER SIZE PARAM (K98, 2026-10-14): `markerSize` (`mks`, the markers'
  diameter in thread widths, default 1.08, clamped to [0.25, 3]) is
  APPENDED to codec v4 at index 104 and is a DAILY_EXEMPT_KEY: it changes
  only how the markers look, so the golden dailies do not move (K57
  reviews the exempt list). Panel: the maze folder, after the confetti
  rows, fabric mode only. The render side is render-markers.md's K98
  entry.

- HIGHLIGHT MODE PARAM (K111 stage 2, 2026-10-14): `highlightMode`
  (`hm`; pulses | glow | rims | contrast, default pulses) is APPENDED to
  codec v4 at index 108, after K174's minoToward and minoRefog at 106-107
  (106 on its branch until K174 merged first; the second to merge
  renumbers, before it lands). It is a DAILY_EXEMPT_KEY,
  PROPOSED for Levi's call: like hoverGlow it changes how the choices
  look, never what they are, so the golden dailies do not move. Panel: the
  maze folder, after the hover glow row, fabric mode only; undo runs it
  live (LIVE_EFFECTS onTrailChange). High contrast wears "contrast";
  reduced motion keeps the stored mode. The render side is
  render-paint.md's HIGHLIGHT MODES entry.
