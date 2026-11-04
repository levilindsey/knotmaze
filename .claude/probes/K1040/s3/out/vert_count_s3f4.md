# vert_count_s3f4: the S3f4 variants' vertices per frame (from vert_count.ts; today's by-draw count is out/vert_count_s3f3.md)

## Variants (S3f4): vertices issued per frame (segments x 12 today; caps x 193, fills x 102 unchanged unless named)

ftentvclip and ftentvflat issue today's vertices (only the shaders change); ftentvvid issues today's segment vertices non-instanced, plus one index per vertex and a restart index per strip after the first (nInst - 1 of them). ftentvone issues one segment and no caps or fills. ftentvhalf rounds nInst / 2 (probeSegFrac, as drawTent rounds). ftentvnw1c is the circ NW 1 column above (segments x 8).

| scene | ftentv (today) | ftentvone | ftentvhalf | ftentvclip | ftentvflat | ftentvnw1c | ftentvvid verts (indices) |
|---|---|---|---|---|---|---|---|
| muse_hash | 328196 | 12 | 188108 | 328196 | 328196 | 234800 | 328196 (303536 seg indices) |
| muse_default_tw | 347624 | 12 | 205772 | 347624 | 347624 | 253056 | 347624 (307345 seg indices) |
| def | 363206 | 12 | 216098 | 363206 | 363206 | 265134 | 363206 (318733 seg indices) |
| fat | 207900 | 12 | 103956 | 207900 | 207900 | 138600 | 207900 (225224 seg indices) |
| ring | 64354 | 12 | 36970 | 64354 | 64354 | 46098 | 64354 (59331 seg indices) |
| user_tw42.lightpaper | 155836 | 12 | 91972 | 155836 | 155836 | 113256 | 155836 (138384 seg indices) |
| g41_def_tw42 | 369806 | 12 | 221846 | 369806 | 369806 | 271166 | 369806 (320579 seg indices) |
| g41_def_tw64 | 353984 | 12 | 207872 | 353984 | 353984 | 256572 | 353984 (316588 seg indices) |
| g41_ring_tw42 | 65878 | 12 | 38242 | 65878 | 65878 | 47454 | 65878 (59877 seg indices) |
| g41_ring_tw64 | 63928 | 12 | 36604 | 63928 | 63928 | 45712 | 63928 (59201 seg indices) |
| g41_user_tw42 | 155836 | 12 | 91972 | 155836 | 155836 | 113256 | 155836 (138384 seg indices) |
| g41_user_tw64 | 151294 | 12 | 88018 | 151294 | 151294 | 109106 | 151294 (137110 seg indices) |
