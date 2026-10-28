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
