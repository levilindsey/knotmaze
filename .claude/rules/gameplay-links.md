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

- HIGHLIGHT MODE PARAM: removed in K111 stage 3 (2026-10-14).
  `highlightMode` (`hm`, codec index 108, the table's last; a
  DAILY_EXEMPT_KEY) went with the modes: Levi (K248) kept the pulses on
  the choices (render-paint.md's HIGHLIGHT MODES line). A removal bumps
  the codec, so CODEC_VERSION is 5: a v4 token (`?<seed>.J...`) reads as
  its seed at today's defaults, with a warning, and an empty v5 blob is
  `.L`. Index 108 is free again: the next appended param takes it, and a
  branch that appended after 108 (K80's turns) renumbers when it rebases.

- H1 SHARE PARAM (K74 stage 2, 2026-10-14): `hCutShare` (`hcs`, [0, 1],
  default 1) is APPENDED to codec v5 at index 117, after K80 turns'
  108-116. It changes the maze, so it is NOT a DAILY_EXEMPT_KEY: it is in
  MAZE_PARAM_KEYS, and a change of its default moves the golden dailies
  (the mechanism is generation-plan.md's H1 entry). Panel: the maze
  folder, after deadEndLength, fabric mode only. A link that lists
  `hcs` keeps its share when the default changes.

- BURN RACE PARAMS (K114 stage 1, 2026-10-14): `fire` (`fi`, off | fuse),
  `fireSpeed` (`fsp`, 0.75) and `fireDelay` (`fdl`, 0) are APPENDED to
  codec v5 at 118-120, after K74's `hCutShare` (117); CODEC_VERSION stays
  5. Not daily-exempt. They were 117-119 on their branch until it rebased
  onto K74 stage 2, which renumbered them and re-froze the table pin
  (`test/ui/param_codec.test.ts`). The race itself is gameplay-fire.md.
- PLUCK EMPHASIS PARAMS (K279 stage 1, 2026-10-14; brief
  `docs/design/K279.md`). Seven viewer preferences, APPENDED to codec v5
  at 121-127, after the burn race's 118-120 (K114):
  - `pluckRipple` (`prp`: off, wave, glint or ring; default wave);
  - `rippleStrength` (`prs`, [0, 2], default 1);
  - `rippleAuto` (`pra`, [0, 2], default 0.35);
  - `pluckSheen` (`psh`, [0, 1], default 0.5);
  - `pluckTug` (`ptg`, [0, 1] thread widths, default 0.3);
  - `tugAuto` (`pta`, a flag, default off);
  - `autoPluckGain` (`pag`, [0, 1], default 0.5).

  They sat at 118-124 on their branch until it rebased onto K114
  (61c8859), which put them at 121-127 and re-froze the table pin
  (`test/ui/param_codec.test.ts`).
- All seven are in DAILY_EXEMPT_KEYS, so a daily keeps the player's own.
  The strengths clamp to [0, 2] (RIPPLE_STRENGTH_MAX) and the rest to
  [0, 1]. An unknown look reads the default.
- The same round raised three existing defaults: `pluckSize` 1.75 -> 2,
  `pluckGhost` 0.35 -> 0.5 and `pluckWhole` 0.5 -> 0.75. That moved the
  pins in `url_codec.test.ts` (the full-defaults table and the `?7&pw=`
  round trips). A link that lists `psz`, `pgh` or `pw` keeps its value.
- Panel: Touch & feel, after pluckGlow and ahead of tugLimit.
  - The two strengths hide while the look is off.
  - The sheen hides at pluckSize 0.
  - The tug rows hide unless physics is live, and tugAuto also at tug 0.

  All seven are listed under onSlackChange in undo_stack.ts's
  LIVE_EFFECTS, the callback their rows run, so an undo of one applies
  it live instead of rebuilding.
- Neutral (master's look and sound):
  `&prp=off&psh=0&ptg=0&pag=1&psz=1.75&pgh=.35&pw=.5`.
