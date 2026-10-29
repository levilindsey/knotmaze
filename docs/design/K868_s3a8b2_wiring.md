# K868 S3a8b2: the band edges on the GPU, wired, and the lbp-on gates

Ledger item: K868 (knotmaze `LEDGER.md`). This stage finishes S3a8b.
Read first, in `docs/design/K868_s3a8b_strips.md`: calls 2, 3, 5, 6 and
7, the Goal, `## Rules`, Findings N2, N3 and N5, and `## Handoff`. Read
the briefs it points to only as needed.

## Why

S3a8b stopped at its 1 h 30 min mark (`8fa0aad7`) with the label half
moved to the GPU:
- **The band edges** (`src/render/label/label_band_gpu.ts`, N3) give the
  CPU's answer in Node, but nothing draws them. None of call 5's
  `lbp`-on gates has run, and neither has the browser cost.
- **The cut rule** (N2, `8db6ad52`) is exact and passes the raster gate
  with `lbp` off. It trades pops at cuts about one for one, and on four
  frames it leaves a one-frame hairline crack, 1-2 px wide and about
  40 px long, through the band at a cut. Why is not established.
- **flip_0** (call 7) waits on the strips reading s from the tables in
  the browser.

## Coordinator's calls (technical)

1. **S3a8b's calls and Goal stand,** except for the switch lines (call
   6). The branch merges only when this stage's gates pass, and the
   coordinator merges it.
2. **Wire call 3** as S3a8b's Handoff item 1 lists it. If the edge
   program fails to compile, the band pass draws the CPU's edges and
   logs the reason once. Never skip silently: K1008's `gf` guard is the
   pattern not to copy.
3. **The gates are call 5's,** in this order:
   1. the browser same-answer check against the Node mirror
      (`refBandEdge`);
   2. the raster census, `lbp` on against off: only S3a7 F4's classes;
   3. the pop census, `lbp` on against master's `pops15/`.

   Call 5 reads the pop gate by intent: every new pop is explained, or
   cropped, looked at and named.
4. **A crack through the band is a defect on either path,** not the cut
   rule working.
   - With `lbp` on there are no piece seams, so the pop census settles it.
   - With `lbp` off, test N2's inference on muse_flow@w2 t22 at
     (317, 240): the band's piece seam tilts with the interpolated
     normal, while the label pass cuts its tube pieces along the
     segment's own normal. If that holds, both passes cut along the cut
     rule's one line (a cut piece is exactly its part of the uncut quad).
     The crack crops must then show no crack, and the `lbp`-off raster
     and pop censuses run again.
   - If the mechanism is something else, name it in a finding, and fix
     it if the fix stays at the cut.
5. **flip_0 and the cost** follow calls 7 and 6. The Node cost is the CPU
   the strips still take with `lbp` on; report the switch lines apart, as
   they are.
6. **The switch lines are out of this stage.** Don't touch
   `label_switch.ts` or its pins. The coordinator's call for the next
   stage, S3a8d: in the `lbp` path, the GPU finds them.
   - The CPU builds one instance per candidate, only when the topology
     key changes (`switchTopo`). If the candidates depend on the
     geometry, the instances are a superset that depends only on the
     topology, and the GPU rejects the rest.
   - Each frame the GPU evaluates every candidate once (a pass into a
     texture, or transform feedback; not once per vertex): the flip
     test, the reach test and the cluster, read from the tables. The
     line draw places the lines that flip and collapses the rest.
   - A float32 Node mirror is checked against `switchLinesFrom` on every
     frame of the four sequences, as N3 checked the edges.
   - With `lbp` off, `switchLinesFrom` stays: the CPU path, and the
     reference.
   - Why: the cost is the search, 7,000 to 12,000 candidates a frame for
     2 to 42 lines (N4), and the exact CPU fixes left would not reach
     0.5 ms.
7. **Looks.** `lbi` and `lbp` are both off by default. Where `lbp` on
   looks different at rest from `lbp` off, beyond a cut's sliver:
   - crop it;
   - send the coordinator the path (SendMessage to `main`), one line per
     crop;
   - go on without waiting.

## Order

1. `Get-Date`, then start the dev server (S3a8b's Rules, port 5381).
2. **Wire call 3** (call 2). Commit.
3. **The gates** (call 3), under the lock. Write each result as a finding
   when you have it, and commit.
4. **The crack** (call 4).
5. **flip_0** (call 5).
6. **The cost** (call 5), under the lock.
7. **Stop:** the full suite, a commit, the Handoff, the report.

## Rules

S3a8b's `## Rules` hold, with these changes:
- **Names:** new files take `*22*`, and census runs write under
  `pops22/`. The census reads master's `pops15/`.
- **The lock:** use `.claude\probes\S3a\locked22.ps1`, which the
  coordinator made from `locked20.ps1`. It waits up to 2 h inside one
  call, treats only a lock older than 60 min as stale, and at its
  deadline exits 1 without taking the lock (`locked20.ps1` took it
  whoever held it). It exits with the command's exit code. K992 stage 3
  runs its censuses under the lock, on port 5392, until about 15:05.
- **Not allowed,** besides S3a8b's list: `src/render/label/label_switch.ts`
  and the switch lines' pins (call 6).
- **Stop rule:** stop at Order step 7, or 2 h after your start, whichever
  comes first. At 1 h 30 min, finish the step you are on, commit, and
  append the Handoff. A compaction is not a stop: after one, re-read this
  brief, its `## Findings` and `git log`.
- **The final report** gives:
  - the wiring: the files, and the fallback with its reason;
  - the same-answer results;
  - the raster and pop censuses per sequence and zoom, judged by call 5;
  - the crack: its mechanism, and the fix with its censuses;
  - flip_0;
  - the cost: Node per part; in the browser, the per-part timers, the
    frame time and the GPU time;
  - anything that changes S3a8d, S3a8c (K1007) or S3a10;
  - a `Ledger items` list;
  - K868's handle fields: branch, last commit, evidence and next.

## Findings

- **P1 · Gate (a), the browser same-answer check: passes.** `7622b33d`
  wired the edges (label_band.ts `BandPass.edgesReady` / `drawEdges`,
  `buildBandStrips(..., {tubeEdges: false})`; label_app.ts; the census page
  and driver). `.claude/probes/S3a/edge22.ts` runs the real `EDGE_VS`
  through transform feedback (the page's `__pops.edgeCheck`: a capture
  varying holding the outline point, the sided normal and s) against
  `refBandEdge`, at 1e-4 world: the 12 raster scenes as built and with
  their crossings flipped (12 + 12 frames, 366,816 instances each), then
  every distinct frame of def_drag, def_flow, muse_drag and muse_flow
  (41 each; 2,010,560 / 2,010,120 / 1,914,886 / 1,914,122 instances).
  8,583,320 instances, 34,333,280 vertices: 0 differences, 0
  draw-or-skip mismatches, max point 3.8e-6, max normal 1.8e-7, s exact;
  0 GL errors, no context loss (`pops22/edge22.md`). Its exit 1 was the
  page's favicon 404 alone (raster22 recorded the failed load:
  `/favicon.ico`).
- **P2 · Gate (b), the raster census, lbp on (GPU pieces and GPU edges)
  against off: only S3a7 F4's classes.** `raster22.ts`
  (`pops22/raster22/summary.md`), 12 scenes, |dcov| > 32: 161 px, 130 in
  flip blobs and 31 rounding (blobs <= 6 px), 0 unexplained; control (the
  lbp-on page twice) 0 / 0 px. The GPU edges alone (`?gpu=1` against
  `?gpu=1&edges=cpu`, the same GPU pieces): 20 px over 2,714 cut segments,
  all 20 within 3 px of a cut segment's uncut quad; the biggest is a 4 x 1
  px column at a piece's end (`raster22/edges_0_g41_def_tw64.png`, looked
  at). The largest class blob is flip_0 itself (13 px, a 1 px line along
  a band's end at g41_user_tw64 (1365, 1879), `flip_0_g41_user_tw64.png`,
  looked at), as in S3a8a.
- **P3 · Gate (c), the pop census, lbp on against master's `pops15/`
  (z1).** `gpu22_z1` against `off15_z1` (`cmp22_z1.md`), pops master /
  lbp on: def_drag 6 / 6, def_flow 27 / 27, muse_drag 77 / 78 (1 new),
  muse_flow 266 / 266 (5 new, 5 gone); pop area on is at or below
  master's except def_flow (+5 px). Against S3a8a's lbp-on census
  `gpu18_z1` (CPU edges): new 0, 0, 0, 2. The windows census and the
  per-pop check run again under the lock (a page edit reloaded the census
  page mid-run at 14:15:53 and broke both; not a result).

## Handoff
