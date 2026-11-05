# K1186 run D sheet key (sheet.png: control first, then flip1..flip5; columns before / after / held)

Crops: 260 CSS px at the flipping junction on its stand's pinned state (`__knotPinClocks(100)`, `phw=0`, headed real-time Chrome), shown at 780 px (3x CSS; 390 dev px upscaled 2x nearest). Stands and drag paths verbatim from flips.mjs / 19B's dumps (rule 11); named change: dwell per step is 140 ms move + 140 ms held pause (retry rows flip2/flip5: exact 19B timing, 140 ms move, held shot immediately). Held for every row is the brief's paused stand-in: no joinery choice can be held from outside `rebuildFillets` (choices are closure-local per rebuild; `fieldProbe` only reads), so the drag pauses at the before sample, mouse down, and the held crop is that paused frame. The read wrapper is crops.mjs's INSTALL (flips.mjs's sampler, copied): it wraps `rebuildFillets` to read choices and holds nothing. Pixel counts at native resolution (changed px, any channel over 8, table.mjs's diff): flip = before->after, held = before->held, excess = flip - held.

| row | junction (live) | ranked flip (19B) | observed on this master | flip px | held px | excess px |
|---|---|---|---|---|---|---|
| control | seed3 control-drag1 ji0 (22.62, 10.50) rec 0 | control (no flip at ji0, step 5) | motion only at step 5 | 4891 | 277 | 4614 |
| flip1 | seed3 drag3 ji6 (24.68, 2.65) rec 462 | reachBound[0] bound 0, reach 0.975 -> bound 1, reach 0.91925 at step 2 (geo 36, drawn19B 4314) | {"bound":0,"reach":0.975} -> {"bound":1,"reach":0.93261} at step 2 (ranked step) | 14397 | 0 | 14397 |
| flip2 | fat11 drag1 ji55 (23.63, 29.82) rec 7250 | cover[0] 0 -> 1 at step 3 (geo 1744, drawn19B 0) | 1 -> 1 at step 3 (ranked flip not reproduced; pair shows ranked step 3 motion) | 18717 | 13850 | 4867 |
| flip3 | fat11 drag2 ji4 (1.67, 5.26) rec 554 | cover[0] 1 -> 0 at step 1 (geo 1744, drawn19B 0) | 1 -> 0 at step 1 (ranked step) | 10504 | 0 | 10504 |
| flip4 | fat11 drag3 ji104 (8.65, 3.39) rec 13606 | cover[1] 0 -> 1 at step 1 (geo 1744, drawn19B 0) | 0 -> 1 at step 14 (ranked step 1 not reproduced; first headline change at step 14) | 6800 | 3239 | 3561 |
| flip5 | fat11 drag3 ji104 (8.65, 3.39) rec 13606 | cover[1] 1 -> 0 at step 4 (geo 1744, drawn19B 0) | 0 -> 1 at step 14 (ranked step 4 not reproduced; first headline change at step 14) | 6778 | 3239 | 3539 |

Per-row crop files, traces and 19B piece lists: crops.json and ranking.json in this folder. flip2's ranked cover flip does not occur on this master (cover[0] reads 1 before, during and after the drag, both timings); flip5's ranked 1->0 at step 4 does not occur either (the arm stays 0 until a 0->1 flip at step 14, which its pair shows, as flip4's does). Claude judges from the crops whether the flips that do occur pop.
