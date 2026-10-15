---
paths:
  - ".claude/probes/K77/**"
---

# Probe lore: pluck profile probes (K77)

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
