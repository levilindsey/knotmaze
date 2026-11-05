# K1186 run D (20D): the five worst drawn flips, named from 19B

Ranking rule: measured drags only. Drawn first (crop diff minus the drag's non-flip median minus the stand's control median, as flips.mjs/table.mjs compute it); only **one** flip reads above the control noise, so rows 2-5 fill from the geometric-ink ranking, one row per (stand, script, transition, junction), headline = its largest-geometric piece. Control medians: seed3 4484 px, fat11 8641 px.

Control row: seed3 control-drag1 ji0 centre (22.62, 10.50) record 0, step 5 (no flip at ji0 that step).

| row | source | stand / script | junction | headline piece | geo (dev px) | drawn 19B (px) | transition |
|---|---|---|---|---|---|---|---|
| flip1 | drawn | seed3 drag3 | ji6 (24.63, 2.53) rec 462 | reachBound[0] | 36.3 | 4314 | trans 45, drag3:step2, sample 696 |
| flip2 | geometric | fat11 drag1 | ji55 (23.84, 29.83) rec 7250 | cover[0] | 1744.2 | 0 | trans 52, drag1:step3, sample 214 |
| flip3 | geometric | fat11 drag2 | ji4 (1.66, 5.25) rec 554 | cover[0] | 1744.2 | 0 | trans 29, drag2:step1, sample 356 |
| flip4 | geometric | fat11 drag3 | ji104 (8.70, 3.32) rec 13606 | cover[1] | 1744.2 | 0 | trans 32, drag3:step1, sample 516 |
| flip5 | geometric | fat11 drag3 | ji104 (8.71, 3.30) rec 13606 | cover[1] | 1744.2 | 0 | trans 47, drag3:step4, sample 531 |

All pieces flipping at each row's transition are in ranking.json (`pieces`, with before/after values). Drag paths (`pathWorld`, verbatim from 19B's dumps) are in ranking.json per row for crops.mjs.
