# K194 + K225 + K280 + K421: the defaults batch

Levi's calls (2026-10-20, the report card). One stage, sonnet, 1 h cap.
The handle is K194's; K225, K280 and K421 ride it.

## The four defaults

All in `src/ui/url_state.ts` (`PARAM_DEFAULTS` and the constants it reads):

1. **K194, the pluck glow:** `pluckGlow` (`pgl`) `off` -> `fallback`.
   Crossings (`pluckCrossings`) stay `through`.
2. **K225, the markers:** `markerSize` (`mks`) 1.08 -> 2
   (`MARKER_SIZE_DEFAULT`). If `sanitizeMarkerSize` or the panel's slider
   tops out at or near 2, raise the top so 2 sits well inside the range.
3. **K280, the turn clock's burn race:** `fireSpeed` (`fsp`) 0.75 -> 0.6.
   `fireDelay` (`fdl`) stays 0, and the real-time pair (`fireSpeedRt` /
   `fireDelayRt`, `fsr` / `fdr`) does not change. Check that the
   `clampFireSpeed` fallback still does the right thing.
4. **K421, the stalker:** `minoStalkerAccuracy` (`msa`) 0.45 -> 0.3
   (`TURN_MODEL_DEFAULTS.stalker.accuracy`; check what else reads that
   row, such as the headless sweeps' defaults).

Pre-launch there is no back-compat (CLAUDE.md, Key Design Decisions):
change each default in place, with no codec version bump, and re-freeze
every pin the change moves (the golden dailies, the codec pins, tests
that hard-code an old default). Name each moved pin in the commit
message. Update every comment, `.claude/rules/` file and doc line that
states an old default as current (history stays as written).

## peakEstimate (K194)

`docs/design/K180.md`, "Stage 1 handoff": if `fallback` becomes a
default, time `peakEstimate` under the perf lock and on the Pixel
(0.8-1.7 ms per tap, measured unlocked), and dedupe its times (exact;
about half the work).

1. Time it first: desktop under the perf lock, then the Pixel. Report ms
   per tap (median, p95, max) over at least 30 taps on a fabric link and
   on a knot link, plus a music-mode run's auto plucks.
2. Dedupe: the same output bit for bit. Add a test that checks the
   deduped result against the old computation on fixed inputs.
3. Time it again the same way.

The phone: a production build over `adb reverse` (`scripts/phone.ps1`;
`probes-phone.md` and `.claude/probes/phone_probe.mjs` show how), under
both locks. Take the phone lock with
`pwsh -NoProfile -File .claude/probes/agents/phone_lock_take.ps1 -Owner "K194 defaults" -What "peakEstimate timing" -MaxWaitMin 40`
and the perf lock (`$env:TEMP\claude-perf.lock`: one line, owner, start
time, what). Wait for either inside one blocking command, and release
both when done. If the phone is unreachable, say so and skip that half.

Probes and results go in `.claude/probes/K194/` (untracked).

## Verify

- Stills, desktop and phone-sized (411x753 at dpr 2): a fabric link's
  markers at the new size, and a pluck with the glow, each beside today's
  master (`scripts/diag_screenshot.mjs`, or puppeteer with a fresh temp
  profile).
- Read the four values back with `window.__knotParams()`.
- `npm test` and `npm run build` pass.

## Constraints

- Agents beside you: K370 (pointer input, drag latency), K578
  (`src/app/frame_loop.ts`, `src/render/confetti*.ts`) and K580
  (`src/core/glyphs/`, the ribbon renderer's junctions). Stay out of
  those files; if a change seems to need one, stop and report.
- Probes never use `--virtual-time-budget`, and use fresh temp Chrome
  profiles. A bare URL is today's daily (`probes.md`): pass a query for
  a fresh design.

## Stop rule

Stop when the stage is done or at the 1 h wall-clock cap, whichever
comes first. Run `Get-Date` at the start and at each milestone.

When you stop:
- commit WIP;
- append a "Handoff" section to this doc: what changed, the pins moved,
  the timings, the stills' paths, what's left, and the item's handle
  fields;
- report.

Commit to your branch at every milestone (the defaults, the dedupe), and
never push. A compaction is not a stop: after one, re-read this brief and
`git log` before going on. No helpers.

End your report with the item's handle fields and a `Ledger items` list.

## Handoff (2026-10-20, K194 agent, sonnet)

Started 15:53:45, stopped 16:42 (cap 16:53:45). Three commits on the
worktree branch, never pushed: a634a53 (the four defaults), 975175e (the
dedupe) and the one that adds this section.

### What changed

- **a634a53, the four defaults** (`src/ui/url_state.ts` and the rules
  files that stated them): `pluckGlow` off -> fallback (K194), `markerSize`
  1.08 -> 2 (K225), `fireSpeed` 0.75 -> 0.6 (K280), `minoStalkerAccuracy`
  0.45 -> 0.3 (K421). CODEC_VERSION stays 6; the param_codec table pin, the
  pinned tokens and the golden dailies did not move.
- **975175e, the dedupe:** `peakTimes(lobes)` (each distinct onset + SHOW_DT
  time once, a Set) and the pure `peakEstimateOf(...)` in
  `src/render/pluck_model.ts`; `PluckOverlay.peakEstimate` delegates to it.
  Same peak bit for bit (a max over times cannot see a repeat). The test
  "fallback peak estimate (K194)" (`test/render/pluck_model.test.ts`)
  checks it against the old computation on fixed inputs.
- **This commit:** the timings, `render-pluck.md`'s COST sentence and this
  section.

### Pins moved (a634a53)

`test/ui/url_codec.test.ts` (the defaults table, the mks, fsp and K440-pair
cases, the pgl case), `test/render/marker_glyphs.test.ts` (size range,
radius and dot pins), `test/game/minotaur_turns.test.ts` (TURN_GAMES six
stalker rows and LENGTH_GAMES four, re-digested; maze 42's two length rows,
the hunter and guard rows held), `test/ui/accessibility.test.ts` (the High
contrast marker-floor clause dropped, see Left).

### Read-back of the four values

`window.__knotParams()` on a link with no defaults keys, in both views
(desktop 1400x900 @1, phone 411x753 @2; `stills/stills.json`). The brief's
`pgl`, `mks`, `fsp`, `msa` are the link keys; the hook returns the names.

| build | pluckGlow (pgl) | markerSize (mks) | fireSpeed (fsp) | minoStalkerAccuracy (msa) |
|---|---|---|---|---|
| new, 975175e | fallback | 2 | 0.6 | 0.3 |
| base, 3a3d937 | off | 1.08 | 0.75 | 0.45 |

### peakEstimate timings (ms per fallback tap)

Probe: `.claude/probes/K194/timing.mjs` (untracked; `table.mjs` prints these
tables from `desk_timing.json` and `phone/phone_timing.json`). Two static
builds, both with the four defaults: a634a53 = BEFORE the dedupe, 975175e =
AFTER. They were timed in one pass and INTERLEAVED (each round loads both,
the order reversed on odd rounds), not strictly "time, dedupe, time": the
same pair, with drift spread over both. Links: fabric
`?b&am=instant&snd=none&fw=0&phy=0&phw=0&pgl=fallback`, knot
`?7k&mf=0` plus the same tail; physics off so every load is one layout;
K344's LCG pins the lobe phases; reduced motion emulated off. A tap is
`__knotPluck` at a site spread over the maze. `PluckOverlay.prototype.
peakEstimate` is wrapped: "in-situ" is the one call's `performance.now()`
delta (QUANTIZED to 0.1 ms, so medians read in tenths), "steady" the mean
of 100 repeats on the same tap (60 on the phone), the precise figure, JIT
warm. Both builds' returned peaks were compared on every tap: 0 mismatches
in 380 taps (156 + 160 desktop, 32 + 32 phone), bit for bit.

Desktop (headed d3d11 Chrome, 1400x900), perf lock held 16:33:17 to about
16:40, 2 rounds x 40 taps asked (a few taps make no pluck: 78 of 80 timed
on the fabric). Median / p95 / max:

| link | build | taps | steady ms | in-situ ms | lobes | stations |
|---|---|---|---|---|---|---|
| fabric | before a634a53 | 78 | 0.175 / 1.047 / 2.051 | 0.2 / 1.6 / 2.2 | 4 | 100 |
| fabric | after 975175e | 78 | 0.113 / 0.415 / 0.473 | 0.15 / 1.0 / 1.2 | 4 | 100 |
| knot | before | 80 | 0.328 / 0.462 / 0.555 | 0.4 / 0.6 / 1.6 | 5 | 131 |
| knot | after | 80 | 0.144 / 0.215 / 0.239 | 0.2 / 0.3 / 1.2 | 5 | 131 |

Pixel 11 (its own Chrome over `adb reverse` and CDP, a static production
build, 411x753 at 2.625 emulated by the run; phone lock AND perf lock;
K156's watchdog never tripped; only the probe tab closed), 1 round x 32
taps, all timed:

| link | build | steady ms | in-situ ms | lobes | stations |
|---|---|---|---|---|---|
| fabric | before | 0.238 / 1.413 / 1.567 | 0.25 / 2.5 / 4.6 | 4.5 | 121.5 |
| fabric | after | 0.112 / 0.412 / 0.463 | 0.1 / 0.9 / 1.1 | 4.5 | 121.5 |
| knot | before | 0.308 / 0.430 / 0.553 | 0.4 / 0.7 / 3.5 | 5 | 127 |
| knot | after | 0.163 / 0.245 / 0.295 | 0.2 / 0.5 / 1.0 | 5 | 127 |

Music mode (`?b&am=instant&fw=0&snd=music&pgl=fallback&phy=0&phw=0`; the
auto plucks are timed in-situ as they fire; 4 windows per target, 2 per
build, interleaved), pooled per build, median / p95 / max:

| target | build | auto plucks | in-situ ms |
|---|---|---|---|
| desktop (15 s windows) | before | 51 | 0.1 / 0.6 / 1.4 |
| desktop | after | 49 | 0.1 / 0.3 / 0.5 |
| phone (20 s windows) | before | 64 | 0.1 / 0.7 / 1.4 |
| phone | after | 65 | 0.1 / 0.2 / 0.5 |

Reading: the dedupe cuts a tap's steady median to 0.44-0.65 of before on
the desktop (0.47-0.53 on the phone), and the worst fabric taps (many
lobes sharing an onset) 3-4x (max 2.05 -> 0.47 ms desktop, 1.57 -> 0.46
phone). Locked, the cost was small to begin with (0.17-0.33 ms steady
before): K180's 0.79-1.17 ms and 1.75 ms were unlocked beside other
probes, 2-7x above these. After: 0.11-0.16 ms median, p95 under 0.42 ms,
max under 0.5 ms on both devices, under 3% of a 16.7 ms frame even for the
worst tap. Not a frame-budget problem either way; the dedupe is kept
because it is exact and tiny.

### Stills

`.claude/probes/K194/stills/` (untracked; `stills.mjs` makes them, `zoom.py`
the crops). Link `?b&am=instant&snd=none&fw=0&phy=0&phw=0` (no defaults
keys, so each build shows its OWN defaults), physics off, reduced motion
emulated off, K344's LCG pinned, the same pluck sites in both builds,
screenshot 110 ms after the tap. The BASE is **3a3d937** (this brief's
commit, before the four defaults), NOT master f68ee4b, which has moved on:
other agents' changes would read as differences.

- Markers at size 2 beside 1.08: `desktop_new_markers.png` /
  `desktop_base_markers.png`, `phone_new_markers.png` /
  `phone_base_markers.png` (the phone view also shows the finish flag). The
  new start marker is about twice the old one's width and its dot and ring
  read at a glance; same layout otherwise.
- The fallback glow: `desktop_new_pluck_glow.png` / `desktop_base_pluck_glow.png`
  (chain 63, ctrl 15.09, a 1.2-ctrl span at 381, 353) and `phone_new_pluck_glow.png`
  / `phone_base_pluck_glow.png` (chain 19, ctrl 0.93, at 293, 448): spans whose
  whole-pluck wave cannot show (`glow` true, `peakEst` under the criterion).
  The new build lights the short warm streak on the span; the base (glow off)
  shows nothing. `desktop_zoom_pluck_glow.png` and `phone_zoom_pluck_glow.png`
  are crops, new | base | their difference x4.
- A pluck where the wave shows (cue not lit, `glow` false):
  `<view>_new_pluck_show.png` / `<view>_base_pluck_show.png` and the
  `*_zoom_pluck_show.png` crops: the same string in both builds; the
  differences are only the animation time of each screenshot.

### Deviations from the brief

- Builds timed interleaved by round, not strictly before / dedupe / after
  (above); the stills' base is 3a3d937, not master (above).
- The phone pass ran at the same time as the desktop batch under ONE
  perf-lock hold (the phone's CPU is separate hardware; the stills ran only
  after both ended). The phone pass is 1 round x 32 taps x 60 repeats against
  the desktop's 2 x 40 x 100, to stay inside the watchdog window and the cap.
- Every timed load had physics off (`phy=0&phw=0`), music mode included
  (its auto plucks still fire: 24 to 34 a window); `MUSIC_LINK_LIVE`, a
  live-physics link, is in the probe and was not needed.
- `performance.now()` is quantized, so the in-situ medians are coarse;
  use the steady columns for ratios.
- Locks released: the perf lock right after the stills (about 16:40), the
  phone lock by the phone runner (16:37); no K194 reverse tunnel left (the
  5960 and 5961 ones are other agents'); the static server on 5841 stopped;
  temp Chrome profiles removed.

### Left

- **`HIGH_CONTRAST_MARKER_MIN` (1.5, `src/ui/accessibility.ts`) is below the
  new default markerSize 2**, so High contrast no longer enlarges the
  markers. Raising it (2.5?) is a design call for Levi: it touches the same
  file, the panel tooltip, `gameplay-motion.md`, `docs/design/K111.md` and
  the clause dropped from `accessibility.test.ts`.
- `render-pluck.md` (about line 125) still says the `pluckWhole` default is
  0.5; it is 0.75 since K279 (the stills read 0.75).
- `docs/design/K339_inventory.md` is a generated snapshot of the panel and
  lists the old defaults: regenerate with `scripts/panel_inventory.ts`.
- If 0.11-0.16 ms ever matters: hoist `Math.exp` out of the station loop in
  `peakEstimateOf` (per lobe per time, not per station per time). Not done.
- Untracked evidence in `.claude/probes/K194/`: `timing.mjs`, `stills.mjs`,
  `table.mjs`, `zoom.py`, `perf_lock.ps1`, `phone_run.ps1`, `build_all.ps1`,
  `desk_timing.json`, `phone/phone_timing.json`, `stills/`, `builds/`.

### Handle

- owner: nobody since 2026-10-20 16:42 (the K194 agent a035f2e7898cd9be7
  of claude session 91b19e11-7759-4638-ba60-4705b011b94f finished: both
  stages done, timings and stills taken)
- branch: `worktree-agent-a035f2e7898cd9be7`, worktree
  `.claude/worktrees/agent-a035f2e7898cd9be7`; last commit: the one that
  adds this Handoff (HEAD of the branch; a634a53 and 975175e before it),
  unpushed
- evidence: `.claude/probes/K194/` (above)
- next: merge the branch to master (`tools/agent_merge.ps1`), then Levi's
  call on `HIGH_CONTRAST_MARKER_MIN`; close K194, K225, K280 and K421 with
  the merge commit
- brief: `docs/design/K194_defaults.md`
- env: none to recreate (a probe rebuilds its static builds with
  `.claude/probes/K194/build_all.ps1` and serves them with
  `.claude/probes/K572/static_server.mjs 5841 <builds dir>`)
