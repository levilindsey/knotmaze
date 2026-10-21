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
