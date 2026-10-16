---
paths:
  - ".claude/probes/K77/**"
  - ".claude/probes/K279/**"
  - ".claude/probes/K344/**"
  - ".claude/probes/K395/**"
---

# Probe lore: pluck probes (K77, K279, K344, K395)

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

- K279 stage 2 (2026-10-15), glint by default, the ripple filter's cost,
  the first tap and glint's phone size: `.claude/probes/K279/stage2/`
  (render-pluck.md's STAGE 2 has the numbers). `k344_lib.mjs` (K344's
  launcher: headed hardware-GPU Chrome off-screen with its profile in
  the folder, `openFrozen`, pinned plucks) drives `k279_ab2.mjs <A host>
  <B host> <outDir>` (stage 1's same-state A/B with `&prp=wave` on both
  builds; it also diffs each build's frame of an off-screen ripple
  against its own no-ripple frame, which tells a culled ripple from a
  real difference), `k279_phone_size.mjs <host> <outDir> [phone,desk]`
  (the view's px/world, the ripple's sizes in CSS px, the changed
  pixels' distance from the site and strips; read p50, since p95 and
  max hold MSAA edge flips from across the frame) and `k279_sheet2.mjs
  <host> <outDir>` (the glint sheet: the kink loop, a foreign crossing,
  `?7` fabric and knot, zoom steps 0 and 2, early and late).
  `ab2_where.mjs <A.png> <B.png> <out.png> [min] [cell]` bins where two
  frames differ and crops the densest cell. `k279_live.mjs <host> <out>
  burst`: per-draw GPU and CPU for 8 plucks, then with 8 glints and 8
  waves, and 1 + 1, on `?7` and `?7&mf=0`. `k279_firsttap.mjs <host>
  <outDir> <label> [designs] [WxHxDSF] [looks]`: a fresh profile per
  design and look (a cold program cache) and four real clicks; per tap
  `sum10` (ms of rAF callbacks over the first 10 frames) and `ivMax5`
  (the longest of the first 5 frame intervals); its `downMs` is not
  valid. `run_batch.ps1 -What <what> -Batch <file>` runs `<log> <script>
  args` lines under ONE take of the perf lock (`s2_batch.txt`,
  `s2_sheet.txt`). `k279_phone.mjs` (K289 k) now reads
  `__knotRipple().count` every frame after the tap and finds the repo's
  `scripts/phone_pass/` from its own folder; not yet run on a phone.
  Builds: `builds/<sha>` served by `npx vite preview --outDir <dir>
  --port <p> --strictPort`. GOTCHA: the filter draws the world again
  into its own MSAA texture, so EVERY ripple frame differs from its
  no-ripple frame, by 1 level across the filtered area and by 36-46 at
  thread-edge pixels where one MSAA sample of four flips. Compare ripple
  frames with ripple frames.

- K395 (2026-10-15), the pluck blur at a kink loop's tip:
  `.claude/probes/K395/` (render-pluck.md's K395 entry has the
  mechanism). `lib.mjs` is K344's (frozen page, pinned plucks, pluck
  clock, dumps; it freezes through `__knotPhysFreeze`). `keys.mjs <host>
  <query> <chain>` lists a chain's self-crossings (key, arcs).
  `tip.mjs <host> <outDir> <phone|desk> <query>` shoots every kink loop
  plucked at its tip (sheets and strip dumps); `tipan.mjs` and
  `capan.mjs <dump.json> <tipArc>` tabulate a dump per station (capan:
  the circumradius, rMin, the raw and dumped caps, both blur edges and
  their turns). `ttog.mjs <host> <outDir> <phone|desk|cdp> <query>
  <in|out> [t] [togs]`, env `ONLY=<chain>:<key>` (the loop), `ZOOM`
  (wheel steps at its tip) and `DUMP=1`, shoots one frozen page with
  toggles: base | nocap | noghost | noW | nooverlay | crX (capRound = X;
  cr0 is the pre-K395 cap, so `base,cr0` is the same-state A/B); `cdp`
  drives the visible localhost:591x tab of the phone's Chrome, portrait
  411x753 @2.625 emulated by each run (host = the address the phone
  sees). `phone_run.ps1` is the whole phone pass: the phone lock, a
  read-only readiness check (never wakes the phone), scripts/phone.ps1's
  tunnels and ONE tab by intent, K156's watchdog, the runs and a
  teardown; it masks the serial and address in all it prints. `pairs.mjs <dir>` writes `pair_*.png`
  (cr0 | base), `crop.mjs` crops and upscales, `capfix.ts` (vite-node)
  prints the unit fixture's cap at several CAP_ROUND. `run_locked.ps1
  -What <what> -Cmds "& .claude/probes/K395/<batch>.ps1"` runs a batch
  under the perf lock (`batch_ab.ps1`, `batch_ab2.ps1`). The dev server
  is `vite.private-cache.config.ts` on 5910; `builds/` holds the pre-K395
  build (21d701e). GOTCHA: PowerShell variables are case-insensitive: a
  `foreach ($t ...)` in a batch line clobbered the batch's `$T`. Put a
  batch in its own .ps1 file.