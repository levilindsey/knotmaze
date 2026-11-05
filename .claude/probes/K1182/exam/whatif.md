# K1182 Run F what-if pixel attribution (300x300 device crops, Run C counting)

## four_ji28: control off/off px>8 0 (exact 0); on-off px>8 664 (exact 1003)

| what-if | vs off px>8 (exact) | vs on px>8 (exact) | share of on-off returned to off (px>8) |
|---|---|---|---|
| A wider-stencil band normals, flag on | 664 (998) | 1 (28) | 0.0% |
| B arc-uniform flank, flag on | 664 (1003) | 0 (0) | 0.0% |
| C flag off + biarc wedge rim (today's band) | 269 (314) | 395 (690) | 59.5% |
| C flag on band + today's wedge rim | 395 (689) | 269 (314) | 40.5% |
| D band dropped, flag off | 53 (757) | 710 (1702) | 92.0% |
| D band dropped, flag on | 670 (1679) | 73 (761) | -0.9% |

## four_ji147: control off/off px>8 0 (exact 0); on-off px>8 4604 (exact 5395)

| what-if | vs off px>8 (exact) | vs on px>8 (exact) | share of on-off returned to off (px>8) |
|---|---|---|---|
| A wider-stencil band normals, flag on | 4631 (5641) | 212 (626) | -0.6% |
| B arc-uniform flank, flag on | 4604 (5395) | 0 (0) | 0.0% |
| C flag off + biarc wedge rim (today's band) | 4568 (5353) | 36 (42) | 0.8% |
| C flag on band + today's wedge rim | 36 (42) | 4568 (5353) | 99.2% |
| D band dropped, flag off | 612 (1437) | 4750 (5921) | 86.7% |
| D band dropped, flag on | 4392 (5262) | 969 (2042) | 4.6% |

## four_ji149: control off/off px>8 0 (exact 0); on-off px>8 554 (exact 570)

| what-if | vs off px>8 (exact) | vs on px>8 (exact) | share of on-off returned to off (px>8) |
|---|---|---|---|
| A wider-stencil band normals, flag on | 597 (625) | 49 (63) | -7.8% |
| B arc-uniform flank, flag on | 554 (570) | 0 (0) | 0.0% |
| C flag off + biarc wedge rim (today's band) | 554 (570) | 0 (0) | 0.0% |
| C flag on band + today's wedge rim | 0 (0) | 554 (570) | 100.0% |
| D band dropped, flag off | 164 (190) | 528 (557) | 70.4% |
| D band dropped, flag on | 565 (584) | 101 (113) | -2.0% |

## cross_ji33: control off/off px>8 0 (exact 0); on-off px>8 1725 (exact 2444)

| what-if | vs off px>8 (exact) | vs on px>8 (exact) | share of on-off returned to off (px>8) |
|---|---|---|---|
| A wider-stencil band normals, flag on | 1861 (2541) | 163 (264) | -7.9% |
| B arc-uniform flank, flag on | 1725 (2444) | 0 (0) | 0.0% |
| C flag off + biarc wedge rim (today's band) | 124 (264) | 1601 (2184) | 92.8% |
| C flag on band + today's wedge rim | 1601 (2182) | 124 (274) | 7.2% |
| D band dropped, flag off | 55 (1267) | 1752 (3582) | 96.8% |
| D band dropped, flag on | 1767 (3563) | 71 (1325) | -2.4% |
