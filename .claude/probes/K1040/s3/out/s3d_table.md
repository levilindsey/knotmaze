# K1040 S3d: the gate on the Pixel (render-sync p50 ms)

## The gate: label cost = p50 - floorall's p50 (K923's method), one run per mode

| scene | S3b capsule (fit) | S3c tent | S3d tentv | tent - tentv | tentv <= 2 ms |
|---|---|---|---|---|---|
| muse_hash | 38.5 | 10.8 | 7.0 | 3.8 | MISS |
| muse_default_tw | 22.8 | 10.0 | 7.1 | 2.9 | MISS |
| def | 24.1 | 10.9 | 8.5 | 2.4 | MISS |
| fat | 20.0 | 6.7 | 5.7 | 1.0 | MISS |
| ring | 11.4 | 5.8 | 4.6 | 1.2 | MISS |
| user_tw42.lightpaper | 15.2 | 6.1 | 5.6 | 0.5 | MISS |
| g41_def_tw42 | 21.7 | 11.6 | 9.4 | 2.2 | MISS |
| g41_def_tw64 | 25.4 | 10.7 | 7.4 | 3.3 | MISS |
| g41_ring_tw42 | 9.6 | 5.0 | 4.8 | 0.2 | MISS |
| g41_ring_tw64 | 12.5 | 5.1 | 4.1 | 1.0 | MISS |
| g41_user_tw42 | 14.7 | 6.2 | 4.7 | 1.5 | MISS |
| g41_user_tw64 | 25.0 | 7.8 | 5.8 | 2.0 | MISS |
| median | 21.7 | 7.8 | 5.8 | 2.0 |  |
| max | 38.5 | 11.6 | 9.4 | 3.8 |  |

## What bounds it: differences on one page (variants runs s3d2, s3d3)

| scene | tentv | fixed | upload | empty pass | D store | kick (s3d3) | store (s3d3) | VS(v) | raster(v) | tentv - kick (s3d3) |
|---|---|---|---|---|---|---|---|---|---|---|
| muse_hash | 7.2 | 3.9 | 2.2 | 1.7 | -30.9 | 0.1 | 2.3 | 2.0 | 1.3 | 7.1 |
| muse_default_tw | 7.0 | 3.9 | 1.9 | 2.0 | -34.2 | -1.1 | 2.0 | 2.2 | 0.9 | 7.5 |
| def | 8.0 | 4.5 | 1.7 | 2.8 | -31.6 | -0.3 | 2.4 | 2.7 | 0.8 | 8.0 |
| fat | 6.9 | 3.8 | 0.9 | 2.9 | -32.7 | 0.2 | 1.9 | 2.1 | 1.0 | 5.6 |
| ring | 4.9 | 3.0 | 0.6 | 2.4 | -33.5 | 0.2 | 1.3 | 2.2 | -0.3 | 4.2 |
| user_tw42.lightpaper | 6.0 | 3.6 | 0.9 | 2.7 | -32.9 | -0.1 | 1.9 | 2.1 | 0.3 | 5.5 |
| g41_def_tw42 | 7.7 | 4.7 | 1.4 | 3.3 | -32.2 | -0.7 | 2.3 | 2.6 | 0.4 | 7.9 |
| g41_def_tw64 | 7.3 | 4.1 | 1.5 | 2.6 | -32.1 | -1.0 | 3.1 | 2.2 | 1.0 | 8.0 |
| g41_ring_tw42 | 5.0 | 3.6 | 0.2 | 3.4 | -32.1 | 0.7 | 2.1 | 1.7 | -0.3 | 4.2 |
| g41_ring_tw64 | 5.4 | 4.2 | 0.8 | 3.4 | -31.7 | 0.3 | 1.7 | 1.3 | -0.1 | 4.3 |
| g41_user_tw42 | 6.1 | 3.8 | 1.1 | 2.7 | -32.6 | -0.9 | 2.5 | 1.9 | 0.4 | 6.3 |
| g41_user_tw64 | 6.0 | 3.9 | 0.4 | 3.5 | -31.8 | -0.1 | 1.7 | 1.9 | 0.2 | 5.3 |
| median | 6.9 | 3.9 | 1.1 | 2.8 | -32.1 | -0.1 | 2.1 | 2.1 | 0.4 | 6.3 |
| max | 8.0 | 4.7 | 2.2 | 3.5 | -30.9 | 0.7 | 3.1 | 2.7 | 1.3 | 8.0 |

Runs the phone guard saw touched: none.
