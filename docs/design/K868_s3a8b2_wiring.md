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
- **P3 · Gate (c), the pop census, lbp on against master's `pops15/`:
  every new pop the check reads is explained or looked at and named, but
  the check cannot see a defect both of today's paths share, and one is
  real (P4).** z1: `gpu22_z1` against `off15_z1` (`cmp22_z1.md`), pops
  master / lbp on: def_drag 6 / 6, def_flow 27 / 27, muse_drag 77 / 78 (1
  new), muse_flow 266 / 266 (5 new, 5 gone); pop area on is at or below
  master's except def_flow (+5 px). Against S3a8a's lbp-on census
  `gpu18_z1` (CPU edges): new 0, 0, 0, 2. The per-pop check
  (`check22_z1/check18.md`): 6 new pops, all explained (causes none,
  spans, reach). Windows (`gpu22_win` against `off15_win`,
  `cmp22_win.md`; pops master / on, new / gone):

  | run | pops | new / gone | new against `off20_win` / `gpu18_win` |
  |---|---|---|---|
  | def_drag@w0 | 249 / 250 | 1 / 0 | 1 / 0 |
  | def_flow@w0 | 184 / 163 | 4 / 26 | 2 / 2 |
  | def_flow@w1 | 229 / 229 | 0 / 0 | 0 / 0 |
  | def_flow@w2 | 254 / 252 | 0 / 2 | 0 / 0 |
  | muse_drag@w0 | 314 / 314 | 3 / 4 | 1 / 2 |
  | muse_drag@w1 | 286 / 295 | 11 / 3 | 3 / 10 |
  | muse_drag@w2 | 879 / 874 | 3 / 3 | 2 / 0 |
  | muse_flow@w0 | 659 / 658 | 17 / 17 | 3 / 15 |
  | muse_flow@w1 | 393 / 390 | 3 / 8 | 0 / 3 |
  | muse_flow@w2 | 878 / 883 | 38 / 35 | 20 / 24 |

  The per-pop check (`check22_win/check18.md`, 112 pops: new and grown):
  110 explained, 2 not, both muse_flow@w1, t0 (759, 746) and t1 (754,
  732): a field of short white dashes across the black band at a switch
  place (ch60, cl69 / cl44), in today's off and on alike at one frame and
  gone at the next; its off-against-on pixels are all flip class, and the
  check marks it because the flip places differ between t and t + 1.
  Looked at (`muse_flow@w1_t0_759_746.png`, `muse_flow@w1_t1_754_732.png`).
  Inferred, not tested: P4's crack at many short cluster spans (every
  dash lies across the thread, as a perpendicular seam would). The check
  renders both of its columns on today's server (`label_pops.html` and
  `?gpu=1`), so it explains any pop the two paths share: the 95 px
  "reach" pop at muse_flow@w2 t22 (317, 240) is P4's crack, on both paths.
- **P4 · The crack (call 4): N2's inference holds with `lbp` off. With
  `lbp` on the same crack shows; its mechanism there is not measured.**
  `crack22.ts` (`pops22/crack22/crack22_muse_flow@w2_t22.md`) emulates
  BAND_FS per pixel around muse_flow@w2 t22 (317, 240) for master's strips
  (`buildBandStripsRef`) and today's, on the page's label words (lbp
  off). The emulation matches the GPU's band on every pixel (0 misses on
  both). 97 crack pixels, one class. At (330, 225) master draws strip
  #48369 (ch84, cl -1). Today two strips cover it and both drop it:
  #18977 (ch45 cl61; the label here is another chain) and #48367 (ch84
  **cl61**, s 25.293-25.356; across the edge is its own cluster). The
  label there is ch84 **cl -1**, and no ch84 cl -1 strip reaches it.
  Every crack pixel lies on cl61's side of the band's seam (the line
  through c along n(t) = nA + t (nB - nA), 8db6ad52) and on cl -1's side
  of the label pass's cut, which is perpendicular to the segment
  (label_pieces.ts: an interior cut has ek = sk = 0, so TUBE_FS cuts flat
  at tr = 0 and 1). No strip both covers the sliver between the two lines
  and matches its label. With `lbp` on, the check's crop
  (`check22_win/muse_flow@w2_t22_317_240.png`, viewed) shows the same
  crack in the same place and frame, and it is gone at t + 1. Inferred,
  not measured: the GPU tubes take the cluster from s at the perpendicular
  projection (refCluster), so they cut flat too, while the band's cluster
  changes along its own seam. N2's "with `lbp` on there are no piece
  seams" does not hold at cluster bounds. The fix is not in this stage
  (Handoff).
- **P5 · flip_0 (S3a8b call 7): the 11-bit rounding hypothesis is
  falsified.** `flip22.ts` (`pops22/flip22.md`, under the lock) renders
  g41_user_tw64 on both pages (lbp off, band edges "cpu"; `?gpu=1`, edges
  "gpu") and reads the label words in a 21 x 21 px box around
  (1365, 1879). The band's coverage differs on a 13 px row, as in P2 and
  S3a7 (x 1359-1371, y 1879-1880; off 0, on 255, two partial). At all 13
  the label word is bit for bit the same on both paths: ch20, cl24 and the
  same s11 (188-225, s 0.337-0.433; one level is 0.00259). Of the box's
  428 other labelled pixels 427 match too (1 has another key). The band
  decodes s from s11 alone, so its sigma test reads the same s on both
  paths: the flip is not the word's rounding. Observed: s rises about 3
  levels per pixel along the row, so the row runs along chain 20, and
  what flips is a lateral edge of the band, not an end in s. Inferred,
  not tested: S3a8a G4 narrowed flip_0 to "the tube's own s or depth"; s
  is now ruled out, which leaves the label's depth under the band (the
  word carries none). It stays classed an order flip.
- **P6 · The cost (S3a8b call 6), under the lock (`cost22.ps1`), on
  a45ef47a's code (no crack fix).** Node, lbp on (`pops22/prof22_after.md`:
  an instrumented copy that drew what the real build drew on 164 of 164
  frames, 59 topology rebuilds), p50 / p95 ms over def_drag, def_flow,
  muse_drag and muse_flow:
  - the strips: 1.85-3.31 / 3.17-5.65 uninstrumented, against lbp off's
    `buildBandStrips` 16.7-28.4 / 25.1-46.9. Per part: setup 0.01-0.03;
    the per-chain loop with the caps 1.37-2.04 / 2.38-2.77; the fill arcs
    0.50-1.25 / 0.68-2.75; switch strips at most 0.003 / 0.013; output
    0.35-0.60 / 0.49-0.71. About 5200-6700 strips (off: 52500-56600);
  - `buildLabelPiecesGpu` 1.95-4.16 / 5.2-8.6 (off: `buildLabelPieces`
    27.3-53.0 / 43.1-76.3); the tables 0.26-0.45 / 0.38-1.24;
  - the switch lines, apart (S3a8d): `switchLinesFrom` 2.77-6.50 /
    6.33-13.35, the largest part here after the FieldModel; the switch
    key 0.03-0.06 / 0.06-0.24; `switchTopo` when the key changed 1.09-1.68
    p50 (the flow sequences) and up to 4.79 p95;
  - all but the FieldModel: 8.2-16.2 / 15.7-27.0 (off 49.6-87.4 /
    72.5-125.9). The FieldModel alone: 256-474 / 395-557 on, 249-474 off.

  Browser (`prof22.mjs`, `pops22/prof22_browser.md`): runs off, on, on,
  off at 1240 x 900, the physics worker on, a 5 s circular drag after
  sleep; band edges "gpu" on both on runs and "cpu" off; the GPU timer
  extension present, 0 disjoint, 0 errors logged. Rebuilt frames, p50 /
  p95 ms:
  - strips 1.2 / 1.8-2.0 on against 11.9-12.8 / 17.0-34.1 off; pieces
    1.8 / 2.8-3.7 against 20.3-20.8 / 33.3-39.7; tables 0.3 / 0.7-0.8;
    switch 3.6-3.8 / 7.3-9.0 on and 2.4-3.9 / 7.2-7.5 off; upload 0.2-0.3
    against 0.7-0.8;
  - the FieldModel ("model") 264.8-268.7 on and 262.6-266.9 off, scene
    18.1-18.4. The frame: 291.3-293.0 on against 324.4-326.4 off (rAF
    intervals p50 305 against 325-342). lbp on saves about 33 ms per
    rebuilt frame, and the FieldModel is about 90% of what is left;
  - GPU per frame p50: the label pass 2.05-2.08 on against 1.88-1.89 off
    (+0.17 and +0.19, each on run against its pair); the band pass 0.160
    against 0.143-0.144.

## Handoff

2026-10-28, stopped at Order step 7 (started 13:40, stopped about
15:10). Commits on `k868-s3a`: `7622b33d` (the wiring), `487b6637` (gates
a and b), `a45ef47a` (gate c, the crack), `69f499c3` (flip_0, the cost)
and this handoff. The full suite on `69f499c3`: 185 files and 2503 tests
pass, 2 files and 6 tests skipped (`pops22/suite22.log`).

**Where each call stands.**
- Call 3 (wire the GPU band edges): done in `7622b33d`. The fallback: a
  band-edge program that fails to compile keeps its reason in
  `BandPass.edgeError` and warns once, and `label_app.ts` builds the CPU's
  tube edges instead (`stats.bandEdges` "cpu", `stats.edgeFallback` the
  reason).
- The gates: (a) and (b) pass (P1, P2). In (c) every new pop is explained
  except two at muse_flow@w1 (P3), inferred to be the crack's class at
  short cluster spans, not measured.
- Call 4 (the crack): with `lbp` off the mechanism is N2's (P4). **The
  fix is not made.** It moves every cluster cut on both label paths and on
  the GPU band edge, so all three gates must run again, and that did not
  fit in what was left of the stage. The design is below.
- Call 5: flip_0 (P5) and the cost (P6) are done.
- Call 7: at rest, the raster census (gate b) found nothing outside
  S3a7 F4's classes, so there was no at-rest crop. The crack's crop and
  the two muse_flow@w1 pops' crops went to `main`.

**The crack fix (call 4), designed, for the next stage.** Every pass cuts
along one line: at a cluster bound at t on segment k, the line through
c = p(t) along n(t) = nA + t (nB - nA), with the band's unit vertex
normals (label_band.ts's cut rule, 8db6ad52). Share one helper; do not
copy it. A cut piece is then exactly its part of the uncut quad.
1. CPU pieces (`lbp` off, `label_pieces.ts`). A cut end carries a tilt
   k = (n.u) / (n.v), with u along the segment and v its left normal, one
   per end. That makes TUBE_FLOATS 20, not 18 (`label_pass.ts`'s attribute
   layout; `raster22.ts` reads TUBE_FLOATS), with a new end kind for a
   tilted cut.
   - TUBE_VS extends the quad by uH |k| past a tilted end.
   - TUBE_FS discards past the tilted line, with y = dot(vP - a, v):
     dot(vP - b, u) - k1 y > eps at the end, dot(vP - a, u) - k0 y < -eps
     at the start. It does not clamp t on that side.
   - The cap bit stays kind 2's.
2. GPU tubes (GPU_TUBE_VS/FS in `label_glsl.ts`; their mirror
   `refS`/`refCluster` in `label_tables.ts`). They take s, the cluster and
   the rank at t_b, the root in [0, 1] of
   (P - a) x nA + t [(P - a) x dn - d x nA] - t^2 (d x dn) = 0, the
   bilinear quad's inverse (dn = nB - nA). nA and nB come from the tables,
   as EDGE_VS takes them. Today the tubes take the perpendicular
   projection, so they cut flat.
3. The GPU band edges (EDGE_FS in `label_band_gpu.ts`) take the cluster at
   the same t_b, not at the interpolated vSv. vSv is affine per triangle,
   so today's seam bends at the quad's diagonal.
4. Open points:
   - a z-split within h |k| of a tilted cut overlaps it (depth decides);
   - whether to clamp |k| at sharp turns.
5. Then:
   - `crack22.ts` again, plus an `lbp`-on emulation: the crack crops must
     show no crack;
   - the raster and pop censuses on both paths;
   - gate (b) again;
   - the two muse_flow@w1 pops.

**Open checks.**
- flip_0 (P5): by elimination what is left is depth, untested. A probe
  that reads the label pass's depth under the band on both pages would
  settle it.
- `pops_check18.ts` compares today's off with today's on, so a defect
  both paths share reads "explained" (the crack did). Give it master's
  frames as a third side.
- `pops_check18.ts` does not check the page's `edges` per frame.
- `locked22.ps1`'s owner check is a prefix match, so a second call from
  this owner skips the wait and releases the lock (K370's gotcha in
  `probes.md`). Run one at a time, or match the owner exactly.
- `edge22.ts` and `raster22.ts` exit 1 on the page's favicon 404, which
  is not a result.

**What changes the later stages.**
- S3a8d (the switch lines): with `lbp` on, `switchLinesFrom` (2.8-6.5 ms
  p50, 13.4 p95) and `switchTopo` (up to 4.8 p95) are the largest label
  CPU after the FieldModel. The strips are 1.8-3.3 ms, and
  `buildLabelPiecesGpu` 1.9-4.2.
- S3a8c (K1007, the windows and crossing rows): the crack fix changes the
  label's cuts and the band's cluster per fragment. Land it first, or
  S3a8c's censuses move under it.
- S3a10: the FieldModel takes 256-474 ms p50 in Node, and about 265 ms
  of a 292 ms rebuilt frame in the browser.

**Evidence.**
- Probes, in `.claude/probes/S3a/` (untracked):
  - `edge22.ts` (gate a);
  - `raster22.ts` (gate b);
  - `chain22.ps1` and `chain22b.ps1`, which run gate c's pop census
    (`pops22/gpu22_*`), its comparisons (`cmp22_*.md`) and
    `pops_check18.ts` (`check22_*`);
  - `crack22.ts`;
  - `flip22.ts`;
  - `cost22.ps1`, which runs `inst22.mjs`, `prof22.ts`, `prof22.mjs` and
    `prof22_table.mjs`;
  - `locked22.ps1`.
- Outputs, in `pops22/`: `crack22/`, `check22_win/`, `flip22.md`,
  `prof22_after.md`, `prof22_browser.md`, `cost22/` and `suite22.log`.
- The dev server: `.claude/probes/S3a/vite.private-cache.config.ts`, on
  port 5381.
