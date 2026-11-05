# K1202 (batch 20 Run C): cyc e210's kymograph step at columns 20 to 21 — attribution

Stand (verbatim from `.claude/probes/K1139/stands_cyc.mjs`, rule 11):
`k111&am=instant&fw=0&snd=none&phw=0`, moves 0, 246, 82, 83, 199, 150,
151, 38, 155, 211; head `node_221`; arm e210 (chain 72, node_218 ->
node_221 in kymograph order: column 0 is the node_218 end, columns are
0.0107 world each, W 2.746 world, two-ended: dA 0, dB 1.386, ridge
gR 2.066). Server on port 5770 (this run's range), perf lock held for
every GPU batch (copied `run_locked.ps1 -Batch`). Nothing under
`.claude/probes/K1139/` changed; no `src/`, `test/` or `scripts/` change.

## Task 1 — the step, re-measured on master (696dc2c2)

Fresh dump (`out/dump/cyc.json`, `dump_cyc.mjs` + copied `table_cyc.mjs`,
`out/table_master.txt`) and kymograph (`sheets_cyc.mjs` with both rows on
master, `out/sheets/cyc_e210_kymo.png`; steps in `out/kymo_steps.txt`):

| Measure | S4b (record) | Master (fresh) |
|---|---|---|
| col 20->21 largest luma jump | 42.9 | 40.3 |
| rows of 72 topping 10 luma at 20->21 | 28-34 | 34 |
| col 53->54 (the S4b-fixed band-reach step) | 4.4 on S4b | 4.0 |
| CPU BAND EXTENT, band e39->e210 vs ribbon | 0.0000 | 0.0000 (fan and to tauHi) |

The step reproduces. Worst rows 13, 14, 15, 62, 63 (40, 40, 40, 40, 39);
quiet rows read 0 (`out/kymo_rows.txt`: rows 14/15/62 read
242 246 244 244 244 **204** across cols 15-20 -> 21).

## Task 2 — the CPU field along the centreline (cols 19 to 22)

`attrib.mjs` (`out/attrib.txt`): kPulseV2 on e210, kPulseBandV on each of
node_218's two bands at the tau the fan itself reads, over the
kymograph's 72 clocks. The ribbon and the e39->e210 band are smooth: at
every boundary 17->25 their largest step over the 72 clocks is
0.034-0.043 v (9-11 of 255 — the crest's own steepest slope per column;
at any fixed clock the kymograph rows away from col 20-21 step 0-6 luma).
No ridge-factor crossing (the ridge is at column ~63), no gA/gB switch
(band g 1.62-1.64 at cols 20-21, ridge gR 2.066), no band tau end.

The step's term is the OTHER band's cover. Band e39->e209 (record 5363,
pivot code 6661) reads its crest by a ray from its pivot onto the e39
stretch: ray tau -0.12 to -0.15 at cols 16-21, so g = 1.24-1.27 against
band e39->e210's g 1.61-1.64 — the two bands' crests disagree at the
same pixel (at row 14, t 100.456: cr 0.97-1.00 against 0.41-0.44). Its
cover over e210's centreline (distance to its centreline polyline
0.259 at col 16 rising 0.011 per column; strip reach = fillHalf 0.26 +
1.5 pxW = 0.303) ramps out over cols 18-20 in the twin: cr*cov steps of
56, 99, 99 (of 255) at cols 17->18, 18->19, 19->20 at the worst clocks,
and 1 at 20->21. So the CPU fan field (max of cr*cov) is not smooth
either — it steps at cols 17-20, one to three columns before the
kymograph's cut and ramped over ~2 columns.

## Task 3 — the GPU pixels either side (cols 18 to 23)

`px_cyc.mjs` / `px2_cyc.mjs` / `px3_cyc.mjs` / `stack_cyc.mjs`
(`out/px_cyc.txt`, `out/px2_cyc.txt`, `out/px3_cyc.txt`,
`out/stack_cyc.txt`), at the kymograph's own view and worst rows;
covering from the fillet triangles (diag_s4 manner, `cover_lib` owners):

- Covering does not change at the step: every sample at cols 18-23 is
  record 5363 (junction ji 69, node_218), a cover strip of that record
  (triangles 37206 at col 20, 37207 at col 21, filletMesh), over fan
  triangles of the same record. No band-as-primitive, record or
  fan/ribbon change. Hiding filletTopMesh changes nothing; hiding
  filletMesh (or both webs) removes the bright side (G 242 -> 131);
  the gap pass on/off/tint changes nothing (`out/px4_cyc.txt`).
- Row 14, debug-5 G / CPU twin (band_twin2, live-checked in-page,
  `out/px5_cyc.txt`: live uniforms [0.729, 1.209, 2.5, 1]):

| col | GPU G | e39->e210 cr*cov (twin) | e39->e209 cr*cov (twin, strip cov) | ribbon (twin) |
|---|---|---|---|---|
| 18 | 242 | 127 | 196 | (smooth, ~9/255 per col) |
| 19 | 242 | 119 | 99 | |
| 20 | 242 | 112 | 1 | |
| 21 | 112 | 104 | 0 | |
| 22 | 112 | 97 | 0 | |
| 23 | 112 | 90 | 0 | |

- The dark side (cols >= 21) matches its own CPU field: GPU 112 against
  the e39->e210 band's 104, 97, 90 at cols 21-23 (and the fan twin's
  composed colour, luma ~204, on both sides). The bright side departs
  up from every single-band field: 242 is band e39->e209's own crest
  (0.95-1.00) at full cover. On the GPU its cover holds full through
  col 20 (twin dnow 0.303, the strip reach itself) and cuts between
  cols 20 and 21 (dnow 0.314); at diag zoom (pxW 0.011) the same cut
  sits between cols 17 and 18 (dnow 0.270 -> 0.281, strip reach 0.277;
  `out/diag_cols.txt`) — the boundary tracks the cover reach in world
  units, not a fixed column. The twin ramps that same cover over
  [reach - pxW, reach] (cols 18-20); the GPU cut is harder and about a
  column later. The normal view follows: 244 -> 204 luma (the band's
  whitening f = (cr - quiet)/(1 - quiet) with it), which is the
  kymograph's 40-luma step; it tops 10 luma only in the 34 of 72 rows
  where a crest sits on e39 near the joint, as a cover edge should.
- Marked frames: `out/px/kymo_r14_normal.png`,
  `out/px/kymo_r14_debug5.png` (cols 16-27 dotted, 20 white, 21 cyan);
  the fan twin's per-band table is `out/band_twin2.txt`, the diag-zoom
  centreline `out/centreline.txt`.

## Cause

The step at columns 20 to 21 of cyc e210's kymograph is the cover edge
of node_218's OTHER pulse band, e39->e209 (record 5363), crossing
e210's drawn centreline inside node_218's fan. While the centreline is
within that band's strip cover, the pixel takes its crest — read on the
e39 side, near its peak at the phases that step — and where the cover
ends (dnow crossing the strip reach, 0.303 world at this zoom, between
tau 0.239 and 0.251 from node_218) it falls to the e39->e210 band's own
field, which the CPU twins reproduce. That is S4b Handoff Open 2's
hypothesis ("a band-territory edge inside node_218's fan, where e210's
centerline passes from another band's pixels to the e39->e210 band's"),
confirmed and named: the territory is cover, not draw order — the
covering record and strip never change. The one residual disagreement
is the edge's softness: the CPU twin ramps the cover over pxW at cols
18-20, the GPU cuts it at cols 20-21. A fix is a later stage behind a
switch (none built here).

Ruled out: the ridge factor and the gA/gB train switch (both at
column ~63, field smooth at 19-22), the band-to-ribbon hand-off (band =
ribbon 0.0000 over the fan's whole extent; webs-off is smooth), a
covering record/strip change (same record 5363 strip both sides), and
the gap mask (toggling uFabricGap changes no sampled pixel).
