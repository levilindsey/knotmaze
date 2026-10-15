---
paths:
  - ".claude/probes/K77/**"
  - ".claude/probes/K279/**"
  - ".claude/probes/K344/**"
---

# Probe lore: pluck probes (K77, K279, K344)

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
  through a gated ps.step, `window.__stepUntil`), k279_wake.mjs `<host>
  <out> [designs] [WxHxDSF]` (the wake table: per frame from inside the
  page, the rAF interval, every rAF callback's ms, ps.step's ms, dt and
  substeps, renderer.update and the fabric overlay; a tap, a drag-release
  and a bare wake from one sleeping state; one off-screen window with the
  occlusion-safe flags and its own profile), run_locked.ps1 (runs
  one probe under the perf lock), png.mjs and crop.mjs. Builds:
  `builds/<sha>` served by `npx vite preview --outDir <dir> --port <p>
  --strictPort`.

- K344 (2026-10-15), the pluck cusp on a self-crossing loop:
  `.claude/probes/K344/` (render-pluck.md has the mechanism). `lib.mjs`
  opens a settled page frozen (physics, flow, paint clock, background,
  pointer), plucks with pinned lobe phases and sets the pluck clock;
  repro.mjs + an.mjs dump and tabulate the strip per station (step, edge
  turn, fold flags); annot.mjs draws a lobe's stations, strip edges, blur
  reach and clip lines over a shot (magenta dots: clip weight); tog.mjs
  shoots base | noclip | nocap | nooverlay | nosoft; sheet.mjs `<host>
  <outDir> <cases> [pair|single]` shoots each case's frozen page as built
  and with every clip weight forced to 1 (the pre-fix shader) and writes
  [forced | fixed | diff] strips plus a results JSON (`single` shoots a
  build as it is); sheet_noclip.mjs forces every clip reach to 0 instead;
  xcmp.mjs compares a pre-fix build's `single` shots with the fixed
  build's on a phy=0 layout; run_sheets.ps1 `-Runs "<port> <outDir>
  <cases> [mode]",...` (also `tog ...` and `nc ...` lines) runs them under
  the perf lock and serves `builds/before-79c5a97` on 5891 and
  `builds/after-f4c05d5` on 5892. Pass `&psz=` and the other pluck keys in
  the link: main.ts re-syncs them every frame (K279's gotcha).