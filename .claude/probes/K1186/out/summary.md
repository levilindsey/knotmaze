# K1186 run B (19B): junction choice flips and the ink each moves

## Stand seed3

Link: `?3&am=instant&snd=none&fw=0&phw=0` at http://127.0.0.1:5701; 166 junctions; scale 35.4 device px/world; ctxLost=0.

Targets: ji0 centre (22.62, 10.50) record 0; ji2 centre (3.58, 2.65) record 154; ji7 centre (26.18, 1.31) record 539.

| script | rebuilds | armVote | wedge | disc | cover | reachBound | flips/rebuild |
|---|---|---|---|---|---|---|---|
| control-drag1 | 134 | 2 | 6 | 2 | 6 | 0 | 0.120 |
| drag1 | 137 | 2 | 6 | 2 | 6 | 0 | 0.118 |
| drag2 | 296 | 0 | 0 | 0 | 0 | 0 | 0.000 |
| drag3 | 137 | 2 | 8 | 2 | 8 | 1 | 0.154 |
| sweep-cr | 27 | 228 | 588 | 186 | 610 | 618 | 85.769 |
| sweep-tw | 14 | 252 | 560 | 196 | 526 | 537 | 159.308 |

Drag rate (3 measured drags): 37 flips over 570 rebuilds (37.5s of dragging) = 0.99 flips/s.

Junctions that flip most (all scripts): ji116 (72 flips, centre (25.90, 12.88) record 9007); ji7 (62 flips, centre (26.18, 1.31) record 539); ji158 (56 flips, centre (19.51, 10.42) record 12291); ji32 (54 flips, centre (1.59, 20.75) record 2489); ji60 (54 flips, centre (18.08, 33.48) record 4645); ji42 (52 flips, centre (17.56, 23.59) record 3259); ji2 (50 flips, centre (3.58, 2.65) record 154); ji22 (50 flips, centre (1.54, 13.63) record 1719).

Geometric ink per flip (device px):

| kind | flips | median | worst |
|---|---|---|---|
| armVote | 486 | 0.0 | 0.0 |
| wedge | 1168 | 251.1 | 1985.8 |
| disc | 388 | 225.3 | 533.3 |
| cover | 1156 | 529.6 | 1504.1 |
| reachBound | 1156 | 38.5 | 614.4 |

Drawn ink drag1 (ji0 crop): median non-flip step change 4462 px; steps: 0, 11203, 4577, 4569, 4462, 4211, 3492, 3038, 4393, 3596, 4435, 4701, 4434, 4494, 5197, 6153.

Drawn ink drag2 (ji2 crop): median non-flip step change 0 px; steps: 8668, 0, 0, 0, 2420, 0, 0, 0, 0, 0, 0, 2420, 0, 0, 0, 0.

Drawn ink drag3 (ji7 crop): median non-flip step change 3998 px; steps: 0, 12796, 4603, 4543, 3998, 3433, 2802, 2230, 2046, 2705, 3358, 3974, 4501, 4901, 5742, 6365.

Control (control-drag1 replayed first, same build): median step change 4484 px, worst 11836 px.

| kind (drawn, corrected) | flips with shots | median | worst |
|---|---|---|---|
| armVote | 4 | 0 | 0 |
| wedge | 4 | 0 | 0 |
| disc | 4 | 0 | 0 |
| cover | 4 | 0 | 0 |
| reachBound | 1 | 4314 | 4314 |

Drawn ink sweep-cr: full-frame step changes: 0, 75, 231, 813, 1788, 2592, 3781, 4440, 5245, 5971, 5957, 6626, 6468, 6198, 6428, 6583, 6605, 6471, 6717, 6874, 6391, 6716, 6618, 7179, x (per-step flip kinds in summary.json's perScript counts; the parameter move itself redraws the whole knot, so these are upper bounds, not flip-attributed).

Drawn ink sweep-tw: full-frame step changes: 0, 156140, 154398, 152847, 151002, 146226, 144380, 142599, 142372, 137235, 131873, x, x, x, x, x, x, x, x, x, x, x, x, x, x (per-step flip kinds in summary.json's perScript counts; the parameter move itself redraws the whole knot, so these are upper bounds, not flip-attributed).

## Stand fat11

Link: `?11&am=instant&snd=none&fw=0&phw=0&tw=0.72&cr=4.5` at http://127.0.0.1:5701; 178 junctions; scale 34.6 device px/world; ctxLost=0.

Targets: ji0 centre (23.25, 32.88) record 0; ji3 centre (1.01, 2.14) record 426; ji8 centre (13.48, 1.59) record 1066.

| script | rebuilds | armVote | wedge | disc | cover | reachBound | flips/rebuild |
|---|---|---|---|---|---|---|---|
| control-drag1 | 134 | 1 | 2 | 1 | 1 | 2 | 0.053 |
| drag1 | 137 | 3 | 6 | 0 | 6 | 6 | 0.154 |
| drag2 | 127 | 1 | 1 | 0 | 2 | 0 | 0.032 |
| drag3 | 128 | 5 | 3 | 0 | 6 | 5 | 0.150 |
| sweep-cr | 26 | 201 | 359 | 102 | 403 | 572 | 65.480 |
| sweep-tw | 13 | 227 | 423 | 139 | 412 | 475 | 139.667 |

Drag rate (3 measured drags): 44 flips over 392 rebuilds (75.4s of dragging) = 0.58 flips/s.

Junctions that flip most (all scripts): ji55 (48 flips, centre (23.63, 29.82) record 7250); ji1 (44 flips, centre (20.02, 34.89) record 128); ji173 (41 flips, centre (11.06, 24.52) record 22732); ji148 (39 flips, centre (12.92, 29.50) record 19448); ji95 (39 flips, centre (13.16, 19.56) record 12454); ji174 (38 flips, centre (11.54, 23.73) record 22860); ji109 (38 flips, centre (1.53, 30.41) record 14246); ji76 (37 flips, centre (8.32, 0.96) record 9980).

Geometric ink per flip (device px):

| kind | flips | median | worst |
|---|---|---|---|
| armVote | 438 | 0.0 | 0.0 |
| wedge | 794 | 478.3 | 3176.7 |
| disc | 242 | 412.3 | 509.0 |
| cover | 830 | 754.4 | 2153.4 |
| reachBound | 1060 | 26.7 | 1532.2 |

Drawn ink drag1 (ji0 crop): median non-flip step change 9589 px; steps: 0, 15047, 10898, 10203, 10796, 9564, 9063, 8350, 8676, 8982, 9589, 10793, 10167, 10623, 10349, 10101.

Drawn ink drag2 (ji3 crop): median non-flip step change 4703 px; steps: 7031, 8480, 6851, 4746, 4695, 4759, 4798, 4247, 4469, 4473, 4703, 3660, 4596, 3367, 4902, 6041.

Drawn ink drag3 (ji8 crop): median non-flip step change 7031 px; steps: 14051, 8689, 8173, 8069, 6698, 7910, 5535, 4824, 4433, 5469, 5978, 6620, 7249, 7597, 7031, 7586.

Control (control-drag1 replayed first, same build): median step change 8641 px, worst 21380 px.

| kind (drawn, corrected) | flips with shots | median | worst |
|---|---|---|---|
| armVote | 9 | 0 | 0 |
| wedge | 7 | 0 | 0 |
| disc | 0 | 0 | 0 |
| cover | 7 | 0 | 0 |
| reachBound | 6 | 0 | 0 |

Drawn ink sweep-cr: full-frame step changes: 0, 185, 466, 1629, 2671, 3625, 6078, 7906, 7696, 7357, 7723, 7625, 8589, 8287, 9735, 9489, 9415, 9020, 9716, 8797, 8702, 8051, 7923, 8097, x (per-step flip kinds in summary.json's perScript counts; the parameter move itself redraws the whole knot, so these are upper bounds, not flip-attributed).

Drawn ink sweep-tw: full-frame step changes: 0, 149637, 147496, 145316, 142159, 141019, 139140, 135372, 133336, 131655, 129431, x, x, x, x, x, x, x, x, x, x, x, x, x, x (per-step flip kinds in summary.json's perScript counts; the parameter move itself redraws the whole knot, so these are upper bounds, not flip-attributed).

