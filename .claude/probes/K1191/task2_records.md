# K1191 task 2: records 2129 and 2668 (Muse batch 19 Run D)

Dumps read: Stage 4's tracked tables under `.claude/probes/K1139/out/s4/`
and its untracked dumps `.claude/probes/K1139/out/s4/d/{x4,four,cross,src}/`
- REACHABLE in this checkout on disk (ignored, not tracked; not retaken,
and nothing was read under `.claude/worktrees/`). The `__k1139diag` hook
was not checked out and was not needed: the record map below uses the
ordinary `__knotRenderer()` fieldProbe surface on today's master.

Method: `records.mjs` (offline, the dumps' `r<ji>.tri.bin` captures +
cover_lib's `owners`) and `records_live.mjs` (live, on the x4 and cross
stands of diag_s4.mjs verbatim - shared link
`k111&am=instant&fw=0&snd=none&phw=0`, x4 moves
[0,247,248,69,72,73,95,140,180] + `&pr=8`, cross moves
[0,246,82,83,199] - served on port 5720 under the perf lock;
`records_live.txt`). Anchors check the live map against the dumps:
ji 28 reads rb 2206 and ji 33 rb 2591 on both stands, exactly as the
dumps have them, and both stands give the same map (181 junctions, all
with records).

| aRec | junction | centre (world) | stand / phase | triangles in host capture | samples it owns in host box | where it overlaps |
|---|---|---|---|---|---|---|
| 2129 | ji 27 | 25.342, 3.850 (3 arms) | x4 and four, all phases (geometry is phase-independent) | 401 fan, 0 strip (in ji 28's `r28.tri.bin`) | 5,815 px / 22,875 samples in ji 28's box; of ji 28's beyond-reach GPU-only wedge px, all 6,055 px carry it on all 4 samples (24,220 samples, wedge_s4) | ji 28's box x 125..269, y 164..269 - the box's south-east, toward ji 27 (ji 28 centre 24.578,2.887; ji 27 is +0.76, +0.96 world away) |
| 2668 | ji 34 | 1.026, 18.831 (3 arms) | cross, all phases; the Stage 4 box is t7 | 419 fan, 0 strip (in ji 33's `r33.tri.bin`) | 7,256 px / 28,630 samples in ji 33's box; in the t7 box (115-120, 78-83) the GPU's G is 0 on every px whose 4 samples are all 2668 (Stage 4's `t5_cross_t7_box.txt`) | ji 33's box x 0..133, y 0..114 - the box's north-west, toward ji 34 (ji 33 centre 1.791,19.685; ji 34 is -0.77, -0.85 world away) |

Corroboration, offline: the fan-triangle centroid of aRec 2129 in
ji 28's capture is world (25.266, 3.808), 0.09 world from ji 27's
centre; aRec 2668's is (1.080, 18.880), 0.07 from ji 34's centre. The
host fans' own centroids sit 0.17 / 0.03 world from their centres, so
both targets land on their junctions.

Cause (both): a neighbouring junction's fan, drawn later, overlaps the
first junction's foot, per the cover model (per MSAA sample the last
covering fillet primitive in draw order wins; the composites mask
these pixels, and Stage 4's Task 1 composite passes at 1.0/255 there).
The handoff's inferred "2668 is ji 34's fan" is CONFIRMED; 2129 is
ji 27's fan, which no task had named. Stage 4's "aRec 2129 is not one
of the dumped records" holds - neither ji 27 nor ji 34 is a banded
record, so neither has a dump of its own; both are named here from the
live record map, not from a dump table.

Merge call: does not block K1139's merge (an attribution, not a
defect - Stage 4's standard).
