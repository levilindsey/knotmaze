# K1182 Run F geometry table (from exam/captures/*.json)

Units: distances world units; angles degrees; H4 flank units (and normalized by the tip-to-tip flank span); counts are triangle/quad counts.
H1 minority = triangles with the minority signed-area sign (whole perimeter / rim tip-to-tip). H2 outside = farthest interior rim point outside triangle (tipA, corner, tipB), corner from the flag-off quadratic; cubic wedges skip H2. H3 radii from two Kasa circle fits split at the best shared rim sample. H6 flips = band quads whose signed area sign differs from their fan segment's.

## four_ji28 (record 2206, arms 3, wedges 2, rounded 2, biarc fired orders [0,1])

| wedge (order/k) | flag | branch | H1 whole min/total | H1 rim min/total | H1 back deg | H2 out world | H2 onOff world | H3 r1/r2 world | H3 smaller vs bandIn/bandOut | H3 maxTurn deg | H6 tipA/tipB deg | H6 flips in/out | H6 wrong in/out | H6 maxNorm deg | H4 max flank |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0/0 | off | quadratic | 8/18 | 0/8 | 11.1 | 0.0000 | 0.1779 | 1.360/0.358 | 0.358 vs 0.0662/0.0478 | 179.7 | 179.7/173.2 | 0/0 | 0/0 | 25.3 | 0.2746 |
| 0/0 | on | quadratic | 8/18 | 0/8 | 17.0 | 0.0000 | 0.1779 | 1.853/0.338 | 0.338 vs 0.0662/0.0478 | 178.4 | 178.4/173.0 | 0/0 | 0/0 | 20.9 | 0.1222 |
| 1/1 | off | quadratic | 8/16 | 0/8 | 7.9 | 0.0000 | 0.0892 | 0.633/0.249 | 0.249 vs 0.0662/0.0478 | 176.8 | 176.8/173.2 | 0/0 | 0/0 | 21.2 | 0.2522 |
| 1/1 | on | quadratic | 8/16 | 0/8 | 11.5 | 0.0000 | 0.0892 | 0.529/0.244 | 0.244 vs 0.0662/0.0478 | 177.9 | 177.9/174.1 | 0/0 | 0/0 | 17.4 | 0.1222 |

Swapped-rim reach (farthest rim vertex from the apex, on minus off): order 0: on-off maxR delta 0.0000 world; order 1: on-off maxR delta 0.0000 world.

## four_ji147 (record 11394, arms 4, wedges 4, rounded 4, biarc fired orders [0,1,2,3])

| wedge (order/k) | flag | branch | H1 whole min/total | H1 rim min/total | H1 back deg | H2 out world | H2 onOff world | H3 r1/r2 world | H3 smaller vs bandIn/bandOut | H3 maxTurn deg | H6 tipA/tipB deg | H6 flips in/out | H6 wrong in/out | H6 maxNorm deg | H4 max flank |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0/0 | off | quadratic | 8/20 | 0/8 | 27.8 | 0.0000 | 0.2400 | 2.733/3.451 | 2.733 vs 0.0662/0.0478 | 179.0 | 179.0/160.6 | 0/0 | 0/0 | 136.3 | 0.2025 |
| 0/0 | on | quadratic | 8/20 | 0/8 | 29.8 | 0.0520 | 0.2400 | 2.430/2.291 | 2.291 vs 0.0662/0.0478 | 174.1 | 172.5/174.1 | 2/0 | 0/0 | 148.0 | 0.1219 |
| 1/1 | off | quadratic | 9/20 | 0/8 | 3.1 | 0.0000 | 0.1116 | 0.223/0.337 | 0.223 vs 0.0662/0.0478 | 163.8 | 161.3/163.8 | 1/1 | 0/0 | 172.8 | 0.2959 |
| 1/1 | on | quadratic | 9/20 | 2/8 | 6.3 | 0.0109 | 0.1116 | 0.118/0.171 | 0.118 vs 0.0662/0.0478 | 179.2 | 179.1/179.2 | 1/3 | 0/0 | 172.8 | 0.1229 |
| 2/2 | off | quadratic | 8/20 | 0/8 | 17.3 | 0.0000 | 0.1943 | 1.793/1.187 | 1.187 vs 0.0662/0.0478 | 178.7 | 166.5/178.7 | 0/0 | 0/0 | 136.9 | 0.2124 |
| 2/2 | on | quadratic | 8/20 | 0/8 | 20.7 | 0.0000 | 0.1943 | 80.736/1.089 | 1.089 vs 0.0662/0.0478 | 176.1 | 175.3/176.1 | 0/0 | 0/0 | 22.3 | 0.1220 |
| 3/3 | off | quadratic | 8/20 | 0/8 | 5.0 | 0.0000 | 0.1106 | 0.357/0.353 | 0.353 vs 0.0662/0.0478 | 174.7 | 173.0/174.7 | 2/0 | 0/0 | 143.0 | 0.2520 |
| 3/3 | on | quadratic | 8/20 | 0/8 | 7.7 | 0.0028 | 0.1106 | 0.286/0.254 | 0.254 vs 0.0662/0.0478 | 178.9 | 175.6/178.9 | 0/0 | 0/0 | 23.8 | 0.1223 |

H5 routes (d/m world units):

| route | arms ia/ib | wedge k (order) | d off | d on | m off | m on |
|---|---|---|---|---|---|---|
| 0 | 0/-1 | null (null) | 0.0000 | 0.0000 | 0.1300 | 0.1300 |

Swapped-rim reach (farthest rim vertex from the apex, on minus off): order 0: on-off maxR delta 0.0000 world; order 1: on-off maxR delta 0.0000 world; order 2: on-off maxR delta 0.0000 world; order 3: on-off maxR delta 0.0000 world.

## four_ji149 (record 11573, arms 3, wedges 3, rounded 3, biarc fired orders [0,1,2])

| wedge (order/k) | flag | branch | H1 whole min/total | H1 rim min/total | H1 back deg | H2 out world | H2 onOff world | H3 r1/r2 world | H3 smaller vs bandIn/bandOut | H3 maxTurn deg | H6 tipA/tipB deg | H6 flips in/out | H6 wrong in/out | H6 maxNorm deg | H4 max flank |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0/0 | off | quadratic | 8/20 | 0/8 | 8.8 | 0.0000 | 0.1271 | 0.517/0.483 | 0.483 vs 0.0662/0.0478 | 172.1 | 172.1/170.1 | 0/0 | 0/0 | 97.1 | 0.2384 |
| 0/0 | on | quadratic | 8/20 | 0/8 | 13.2 | 0.0046 | 0.1271 | 0.478/0.375 | 0.375 vs 0.0662/0.0478 | 177.5 | 174.3/177.5 | 2/0 | 0/0 | 174.2 | 0.1223 |
| 1/1 | off | quadratic | 8/18 | 0/8 | 14.2 | 0.0000 | 0.1993 | 2.361/0.428 | 0.428 vs 0.0662/0.0478 | 174.8 | 174.8/169.2 | 2/0 | 0/0 | 155.6 | 0.2876 |
| 1/1 | on | quadratic | 8/18 | 0/8 | 22.8 | 0.0000 | 0.1993 | 7.143/0.340 | 0.340 vs 0.0662/0.0478 | 177.6 | 177.6/171.2 | 0/0 | 0/0 | 37.0 | 0.1222 |
| 2/2 | off | quadratic | 8/18 | 0/8 | 21.1 | 0.0000 | 0.2335 | 4.542/14.587 | 4.542 vs 0.0662/0.0478 | 177.4 | 177.4/170.5 | 0/0 | 0/0 | 20.9 | 0.2505 |
| 2/2 | on | quadratic | 8/18 | 0/8 | 21.1 | 0.0181 | 0.2335 | 3.100/5.165 | 3.100 vs 0.0662/0.0478 | 179.2 | 179.2/177.9 | 0/0 | 0/0 | 15.3 | 0.1219 |

H5 routes (d/m world units):

| route | arms ia/ib | wedge k (order) | d off | d on | m off | m on |
|---|---|---|---|---|---|---|
| 0 | 0/1 | 0 (0) | 0.6378 | 0.6378 | 0.6378 | 0.6378 |

Swapped-rim reach (farthest rim vertex from the apex, on minus off): order 0: on-off maxR delta 0.0000 world; order 1: on-off maxR delta 0.0000 world; order 2: on-off maxR delta 0.0000 world.

## cross_ji33 (record 2591, arms 3, wedges 3, rounded 3, biarc fired orders [0,1,2])

| wedge (order/k) | flag | branch | H1 whole min/total | H1 rim min/total | H1 back deg | H2 out world | H2 onOff world | H3 r1/r2 world | H3 smaller vs bandIn/bandOut | H3 maxTurn deg | H6 tipA/tipB deg | H6 flips in/out | H6 wrong in/out | H6 maxNorm deg | H4 max flank |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0/0 | off | quadratic | 8/16 | 0/8 | 6.6 | 0.0000 | 0.1030 | 1.902/0.121 | 0.121 vs 0.0662/0.0478 | 178.8 | 178.8/147.4 | 0/1 | 0/0 | 62.4 | 0.3470 |
| 0/0 | on | quadratic | 8/16 | 0/8 | 11.7 | 0.0168 | 0.1030 | 1.289/0.097 | 0.097 vs 0.0662/0.0478 | 178.3 | 178.3/171.9 | 0/0 | 0/0 | 44.4 | 0.1226 |
| 1/1 | off | quadratic | 8/18 | 0/8 | 21.1 | 0.0000 | 0.2548 | 1.158/9.247 | 1.158 vs 0.0662/0.0478 | 176.1 | 176.1/170.5 | 0/0 | 0/0 | 48.8 | 0.2983 |
| 1/1 | on | quadratic | 8/18 | 0/8 | 21.1 | 0.0140 | 0.2548 | 2.152/4.972 | 2.152 vs 0.0662/0.0478 | 178.2 | 175.6/178.2 | 0/0 | 0/0 | 18.4 | 0.1219 |
| 2/2 | off | quadratic | 8/18 | 0/8 | 10.6 | 0.0000 | 0.1562 | 1.282/0.343 | 0.343 vs 0.0662/0.0478 | 172.5 | 172.5/171.7 | 0/0 | 0/0 | 62.9 | 0.2712 |
| 2/2 | on | quadratic | 8/18 | 0/8 | 17.5 | 0.0026 | 0.1562 | 0.926/0.302 | 0.302 vs 0.0662/0.0478 | 176.8 | 176.8/176.0 | 0/0 | 0/0 | 21.2 | 0.1222 |

Swapped-rim reach (farthest rim vertex from the apex, on minus off): order 0: on-off maxR delta 0.0000 world; order 1: on-off maxR delta 0.0000 world; order 2: on-off maxR delta 0.0000 world.
