# K923: S3's micro-benchmark, the two-pass label border on the Pixel (agent brief)

Coordinator, 2026-10-27 15:15. One stage, opus, 2 h cap. Runs beside
K922, which works only on the CPU oracle and never uses the phone.

## Why

K868's goal 8 is 60 fps on the Pixel 11, with the border renderer's GPU
time at most 4 ms at dpr 2 (`docs/design/K868_field_border.md` §2,
check 13). K915 (`K915_surface_borders.md`, Step 6) gives S3 a form with
no per-pixel search:
1. **Label pass.** Rasterize the tubes, fills and caps with the depth
   test into an RGBA16UI target holding chain id, s (16-bit fixed point
   over the chain's length), cluster id and flags.
2. **Band pass.** Draw a strip W wide inside every outline piece (each
   tube edge at ±h, each corner arc, each cap), and one centred on each
   depth switch. A fragment fetches its own pixel's label and the label
   just across the edge (3 fetches on a switch strip). It tests
   similarity, then discards or inks, with coverage from the strip's
   distance coordinate.

G3-1's per-pixel searches (up to 64 SAMP points a pixel) cost the Pixel
+24.5 to +48 ms of render sync (K892). Measure whether the two passes fit
the budget before any S3 shader work. If they do not, the GPU design
changes before S3 starts.

## Build

Build a standalone WebGL2 page under `.claude/probes/K923/` (untracked),
with no pixi, no app code and no repo dependencies.
- It draws a K868 scene's real geometry at the scene's camera, in a
  canvas sized to the phone's viewport at dpr 2. Scenes:
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K868\scenes\`.
  Use muse_hash and the densest scene there.
- **Label pass**, as above, with a plausible z per vertex (the scene's
  depth, or the crossing table's order). Its labels need not match the
  oracle's; only its cost matters here.
- **Band pass**, as above: strips on both sides of every tube, the corner
  arcs and caps where the scene has them, and switch strips at each
  crossing as a stand-in for the switches.
- **Search reference:** a full-screen pass that searches a disc of radius
  W in the label target (45-69 taps at W ≈ 3.3 px). It checks the method
  against K892's G3-1 numbers.
- **Floor:** an empty frame (clear only).

Each variant renders continuously and is chosen by a URL parameter, so
`scripts/bench_frame.mjs` can time it.

## Measure

- Time with `scripts/bench_frame.mjs` (see its header). It measures first
  draw to `gl.finish()`, the measure K892 and the K156 phone pass use.
  - Corrected after the stage: K892 and the K156 pass used a render sync,
    and Chrome's `gl.finish()` does not wait for the GPU. See the Handoff.
  - It reaches the phone's Chrome over CDP: `scripts/phone.ps1` tunnels a
    local port and DevTools (`-Ports <your port>`).
  - Several URLs per run, ABBA rounds, fresh tabs.
- Before using the phone, run `pwsh -NoProfile -File
  scripts/phone_pass.ps1 -Phase check`. It must say the phone is awake
  and unlocked; if it does not, stop and report. Never wake or unlock the
  phone, send it key events or touch its media.
- Hold `$env:TEMP\claude-perf.lock` (one line: owner, start time, what)
  while timing. If another owner holds it, wait inside one blocking
  command (a lock older than 30 min is stale). Delete it when done.
- Cells: muse_hash and the densest scene, each at the fit zoom (W about
  3.3 device px) and at 6x (W about 20 px). Per cell:
  - median and p95 ms for the label pass, the band pass, both, the search
    reference and the floor;
  - fragments drawn per pass, counted on the desktop (an occlusion query
    or a counting shader).
- Desktop numbers too (`bench_frame.mjs` without `--cdp`), for reference
  only. The phone decides.

## Report

- The table, against the 4 ms budget, and the search reference against
  K892.
- The verdict: whether the two passes fit, and what dominates (overdraw
  in the label pass, discard, the integer target, the band's fetches).
- If they do not fit: the cheapest change that would (a lower-resolution
  label target, fewer fetches, packing), measured if time allows.
- The commands to rerun it.
- A `Ledger items` list (follow-ups, residuals, decisions for Levi).

## Rules

- Stop rule: run `Get-Date` at the start and at every milestone. Stop
  when the report's table and verdict are done or 2 h after the start,
  whichever comes first. A compaction is not a stop: after one, re-read
  this brief and `.claude/probes/K923/NOTES.md` (keep it current) before
  going on.
- Work in the main checkout, under `.claude/probes/K923/` only. Make no
  edits to tracked files, no commits and no npm installs, and never run
  `npm run build` in the main checkout. If the stage stops unfinished,
  append a `## Handoff` to this brief and leave it uncommitted.
- Before you finish, stop the servers and tunnels you start and remove
  the port forwards you add. Never touch processes you did not start.
  Never use Levi's Chrome profile (bench_frame's desktop runs make their
  own).
- Use PowerShell. Read repo code through the shell (`Select-String`,
  `Get-Content | Select-Object`).
- Helpers only if needed: `model: sonnet`, a 1 h cap and these rules.

## Handoff (coordinator, from the agent's report, 2026-10-27 16:41)

Finished at 16:41, inside the cap. Probe-only: no tracked edits and no
commits. The coordinator confirmed afterwards that the perf lock, the
servers and the phone's port forwards are gone.

**Timing method.** `scripts/bench_frame.mjs` times first draw to
`gl.finish()`, and Chrome's WebGL `finish()` returns without waiting for
the GPU: it read 0.0-0.1 ms for 3.8 ms of GPU work on the desktop, and
0.10-0.20 ms on the phone without a sync. So the stage used K892's render
sync: `sync.mjs` drives `__k923RenderLoop`, N renders each ending in a
1-px `readPixels`. K892's numbers were taken that way and stand; ## Measure
was wrong about it (K932).

**As specified** (RGBA16UI label, every chain point). Pixel 11 render sync
(PowerVR over ANGLE/Vulkan) at 822x1506, the app's own buffer (`src/main.ts`
caps dpr at 2). ms over the floor (1.0-1.3 ms), as median (p95) [rounds],
pooled over 13 runs, with no context loss.

| cell | label | band | both | disc search (reference) |
|---|---|---|---|---|
| muse_fit (W 3.20 px) | 1.83 | 3.50 | 5.30 (6.29) [14] | 6.75 (7.70), 45 taps |
| g41_fit (W 2.58 px) | 1.83 | 3.62 | 5.35 (6.31) [14] | 4.50 (5.30), 29 taps |
| muse_2x | 1.80 | 2.45 | 5.50 (5.96) [5] | |
| g41_2x | 1.65 | 3.20 | 4.78 (5.56) [5] | |
| muse_3x | 2.40 | 2.65 | 3.82 (4.22) [5] | |
| g41_3x | 2.10 | 2.15 | 3.16 (4.24) [5] | |
| muse_6x | 0.95 | 1.60 | 2.98 (3.43) [11] | 85.0 (88.1), 1209 taps |
| g41_6x | 1.30 | 1.90 | 3.04 (3.70) [11] | 52.7 (57.0), 793 taps |

- Fit and 2x miss the 4 ms budget, 3x sits at it, and 6x fits.
- The disc search (K892's method, on the same buffer) costs 4.5-6.75 ms at
  fit, against G3-1's 24.5-48 ms. That ratio is plausible: one integer
  fetch per tap here, against up to 64 SAMP points with segment math there
  (an inference; G3-1's cost was not broken down). The taps grow with zoom,
  to 53-85 ms at 6x, so a per-pixel search fits at no zoom.
- Small triangles dominate. Chain points sit about 1.4 px apart at fit, so
  the band's triangles are about 3 px (97k over 298k px), and the cost
  follows triangle density times fragment work, not pixels: from fit to 6x
  the band covers 1.9x the pixels in half the time. The band is 3.5-3.6 of
  the 5.3 ms, and its fetches and discard are 1.7-2.1 ms of that. The
  64-bit integer target costs 0.6-1.0 ms more than a packed 32-bit one.
  Label overdraw is only 1.43x, and a half-resolution label target showed
  no clear gain.

**What fits** (both passes, muse / g41). LOD step k keeps every k-th chain
point, for segments of about 5-8 px on screen: step 4 at fit, 2 at 2x and
3x, 1 at 6x.

| zoom | packed label | LOD | LOD + packed label |
|---|---|---|---|
| fit | 4.50 (5.93) / 4.33 (4.72) | 2.85 (3.50) / 2.76 (3.25) | 2.02 (2.79) / 1.60 (2.13) |
| 2x | 4.10 (5.07) / 4.03 (4.70) | 3.57 (4.42) / 3.11 (3.32) | 2.67 (3.43) / 2.43 (2.61) |
| 3x | 3.30 (3.83) / 2.60 (3.07) | 3.13 (3.84) / 3.00 (3.47) | 2.34 (2.76) / 1.80 (1.97) |
| 6x | 2.39 (2.95) / 2.52 (3.18) | step 1, as specified | as packed |

Both together fit at every zoom (worst median 2.67 ms, worst p95 3.43, both
muse_2x); neither does alone. The packed label holds chain 8, s 11, cluster
8 and z 5 bits, and matches the full label's ink within 0.2% on the desktop
(a first version truncated the fields and garbled the band; it was
replaced).

**Open for the S3 brief (K933).**
- The uniform LOD's look is unchecked: facets on kink loops and twist
  eyes? A curvature-aware LOD, keeping points on sharp turns, is untried.
- The packed label allows 255 chains and clusters, 2048 s steps and 32 z
  levels, and drops the fill, cap and closed flags. g41's 92 chains and
  185 junctions fit; the largest designs are unchecked.
- The switch strips are a stand-in (17-26k px at fit, against about 300k
  for the band).
- Nothing culls to the view at 6x; the budget does not need it.
- Phone rounds vary by about ±1 ms: decide from pooled runs, and margins
  under 0.5 ms need more rounds.

**bench_frame (K932).** End each timed frame with a 1-px `readPixels`, as
`bench.js` (`sync=1`) and `walk.mjs`'s `renderLoop` do, then recheck the
GPU times taken with it: `G3G4_sdf_geometry.md`, `K8_stage1.md` (the
desktop and phone frame benches), `K8_G3-1.md`, `K8_G3-2.md`, `K5_R1.md`,
`K5_R2.md`, `K7_worker.md`, `.claude/rules/probes.md`'s K8 stage 2 entry,
and K634's "Measure with `scripts/bench_frame.mjs --cdp`". K923's runner
(`sync.mjs`, `pool.mjs`, `batch3.ps1`, `close_tabs.mjs`) could become the
tracked tool.

**Rerun.** Evidence: `.claude/probes/K923/` (`NOTES.md` has the log, the
verdict and the `-Runs` string for the final tables).
- Phone check: `pwsh -NoProfile -File scripts/phone_pass.ps1 -Phase check`.
- Phone runs: `pwsh -NoProfile -File .claude/probes/K923/batch3.ps1
  [-LogName x.log] [-Runs "<sync.mjs args>;<sync.mjs args>"]`. It repeats
  the check and stops unless the phone is ready, sets up the perf lock,
  server, tunnels and floor tab, and undoes them. The final tables take
  about 10 minutes.
- Pool, from `.claude/probes/K923`: `node pool.mjs (Get-ChildItem
  sync_phone_*.json | ForEach-Object Name)`.
- Desktop: with `node .claude/probes/K923/serve.mjs 5923` up and the lock
  held, `node .claude/probes/K923/sync.mjs --target desk`. Fragment counts:
  `node .claude/probes/K923/count.mjs
  "http://127.0.0.1:5923/K923/bench.html" "&fmt=32"`.