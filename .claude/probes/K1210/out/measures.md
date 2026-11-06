# K1210 measures (fan footprint |u| <= 0.6 world; jump = largest in-fan one-frame front advance / median arm advance; lag in frames vs the arm-speed prediction; pops = frames with >16 fan pixels changing >32 luma)

| stand | effect | route | jump | arm med (world/fr) | lag (fr) | pops | dim frames | bright frames | verdict |
|---|---|---|---|---|---|---|---|---|---|
| S3 | fire | e39->e210 | 5.64 | 0.072 | -3.31 | 9 | 15,16,17,18,19,20,21,22 | - | differs (unmeasured: jump (effect 5.64, pulse NaN); lag (effect -3.31, pulse NaN, pulse arm speed NaN)): pops 9 vs pulse 0 on e39->e210 frames [8,10,14,15,16,17,18,19,20] |
| S3 | fire | e39->e209 | 3.41 | 0.0755 | -0.37 | 9 | 15,16,17,18,19,20,21,22,23,24,25,26,27,28,29 | - | differs (unmeasured: jump (effect 3.41, pulse NaN); lag (effect -0.37, pulse NaN, pulse arm speed NaN)): pops 9 vs pulse 0 on e39->e209 frames [8,10,14,15,16,17,18,19,20] |
| S3 | collapse | e210->e209 | 1.18 | 0.1013 | 3.42 | 22 | 6 | 0,1,2,3,4 | differs (unmeasured: jump (effect 1.18, pulse NaN); lag (effect 3.42, pulse NaN, pulse arm speed NaN)): pops 22 vs pulse 0 on e210->e209 frames [5,6,7,8,9,10,11,12,13,14,15,17,18,19,20,21,22,23,24,25,26,27] |
| S3 | pulse | e210->e209 | NaN | 0.0293 | NaN | 0 | 0,1,2,3,4,25,26,27,28,29 | - | pulse (reference) |
| S3 | pulse | e39->e209 | NaN | NaN | NaN | 0 | - | 5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24 | pulse (reference) |
| S4 | fire | e176->e135 | 5.72 | 0.077 | -6.78 | 13 | - | 0,1,2,3,4,5,6,7,8,9,10 | differs (unmeasured: lag (effect -6.78, pulse -18.14, pulse arm speed 0.0371)): pops 13 vs pulse 0 on e176->e135 frames [8,9,10,11,12,13,14,15,16,17,18,19,20] |
| S4 | fire | e176->e134 | 3.85 | 0.0907 | 0.21 | 13 | - | 0,1,2,3,4,5,6,7,8,9,10,11,12,13 | differs (unmeasured: lag (effect 0.21, pulse -18.14, pulse arm speed 0.0371)): pops 13 vs pulse 0 on e176->e134 frames [8,9,10,11,12,13,14,15,16,17,18,19,20] |
| S4 | fire | e176->e175 | 6.33 | 0.0676 | -8.85 | 13 | - | 0,1,2,3,4,5,6,7,8,9,10,11,12,13 | differs (unmeasured: lag (effect -8.85, pulse -18.14, pulse arm speed 0.0371)): pops 13 vs pulse 0 on e176->e175 frames [8,9,10,11,12,13,14,15,16,17,18,19,20] |
| S4 | collapse | e176->e135 | 3.71 | 0.1155 | 5.05 | 23 | - | 26 | differs (unmeasured: lag (effect 5.05, pulse -18.14, pulse arm speed 0.0371)): pops 23 vs pulse 0 on e176->e135 frames [2,3,4,5,6,7,8,9,10,11,12,13,14,15,17,18,19,20,21,22,23,24,25] |
| S4 | pulse | e176->e135 | 7.01 | 0.0371 | -18.14 | 0 | 8,9,10,11,12,13,14,15,16,17,18,19,20,21 | 0,1,2,3,4,23,24,25,26,27,28,29 | pulse (reference) |
| S4 | pulse | e176->e134 | 3.19 | 0.0371 | -18.69 | 0 | 8,9,10,11,12,13,14,15,16,17 | 0,1,2,3,4,5,23,24,25,26,27,28,29 | pulse (reference) |
| S4 | pulse | e176->e175 | 3.06 | 0.0371 | -17.35 | 0 | 8,9,10,11,12,13,14,15,16,17,18,19 | 0,1,2,3,4,23,24,25,26,27,28,29 | pulse (reference) |
