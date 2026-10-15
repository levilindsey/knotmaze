---
paths:
  - ".claude/probes/K77/**"
  - ".claude/probes/K279/**"
---

# Probe lore: pluck probes (K77, K279)

Moved verbatim from `probes.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `probes.md` lists the area's other files.

- K77 (2026-10-13), pluck profile probes: `.claude/probes/K77/`.
  `lib.mjs` opens a frozen page (physics, flow, paint clock and pulse
  pinned; chrome hidden; pointer parked), lists lobes, plucks at an arc,
  pins the pluck clock (`setPluckTime`), dumps per-station profiles and
  shoots with toggles: base | nocollapse | nooverlay | nocap | noattack |
  noclip | noround | nosoft | rndNNN (collapseRound = NNN/100). Scripts:
  attrib.mjs (one site, every term toggled), abexplore / absites / abzoom
  (raw vs rounded across sites, curvature stats, zoomed crops),
  k77_weave.mjs (FNV hashes of every mesh buffer outside the pluck layer
  plus the gap slot table, before / rounded / raw / after clear(), and
  partner band pixels), floorab.mjs (the amplitude-floor A/B),
  k77_sheet.mjs (the before/after sheet; pair, hcat and mksheet make
  crops and sheets). GOTCHAS: zoom with a synthetic WheelEvent, so the
  parked pointer never moves (a real move can grab or pluck). Check
  partner bands zoomed in: at default zoom 8-10 crossings' bands held
  only 51-76 px in all, at 3.3x about 13k. Pin
  Math.random around each `__knotPluck` to repeat the lobe phases. A
  different amplitude floor is re-created exactly by scaling the tap's
  gain (aTap is linear in gain, every lobe in aTap, and capClearance
  does not depend on it).

- K279 (2026-10-14), pluck emphasis probes: `.claude/probes/K279/`
  (render-pluck.md has the mechanism and the numbers). HOOKS:
  `__knotPluck(chain, ctrl, {side, gain, beta, delay, ripple, tug,
  rippleLook})` starts what a tap there would: a ripple at strength
  `ripple` (refused when the look, `rippleLook` or else pluckRipple, is
  off) and a tug of `tug` thread widths. GOTCHA: `opts.tug` calls tugAt
  DIRECTLY, whatever `ptg` says, so a probe that passes it is not on the
  neutral path. The first A/B forced tug 0.3 and "failed" on the phone
  (20357 px from the fifth site on: the tugged spans held still by the
  stubbed step). `__knotRipple({paused, t})` holds the ripples' clock or
  sets every live ripple's time and returns {count, look}. main.ts
  re-syncs `plucks.size`, `ghost` and `sheen` from the params every
  frame: set them with link keys (`&psz=`, `&pgh=`, `&psh=`), or hold
  them with defineProperty as k279_sheet.mjs does. Scripts:
  k279_ab.mjs (K180's same-state A/B: master vs branch with the neutral
  keys, 6 cases; `TUG=<widths>` adds a forced tug for diagnostics, and
  each pluck records `moved`, the position entries it changed),
  k279_live.mjs `<host> <out> cost|sleep` (GPU per draw call and blit
  with TIME_ELAPSED queries, CPU from __knotPerf; or each design's
  node-to-node spans tugged and timed to the next sleep, plus one real
  click), k279_sheet.mjs (the contact sheet: one frozen state, pinned
  ripple and pluck clocks; its tug group steps the sim to a target time
  through a gated ps.step, `window.__stepUntil`), run_locked.ps1 (runs
  one probe under the perf lock), png.mjs and crop.mjs. Builds:
  `builds/<sha>` served by `npx vite preview --outDir <dir> --port <p>
  --strictPort`.