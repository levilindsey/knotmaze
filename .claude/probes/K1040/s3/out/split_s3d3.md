# s3d3: the fixed part against one GPU round trip (kick) (Pixel, render-sync p50 ms, differences on one page)

| scene | tentv | kick | store | empty pass | upload | tentv - kick | tentv - empty |
|---|---|---|---|---|---|---|---|
| muse_hash | 7.2 | 0.1 | 2.3 | 2.4 | 1.1 | 7.1 | 3.7 |
| muse_default_tw | 6.4 | -1.1 | 2.0 | 0.9 | 1.1 | 7.5 | 4.4 |
| def | 7.7 | -0.3 | 2.4 | 2.1 | 1.5 | 8.0 | 4.1 |
| fat | 5.8 | 0.2 | 1.9 | 2.1 | 1.0 | 5.6 | 2.7 |
| ring | 4.4 | 0.2 | 1.3 | 1.5 | 0.8 | 4.2 | 2.1 |
| user_tw42.lightpaper | 5.4 | -0.1 | 1.9 | 1.8 | 0.9 | 5.5 | 2.7 |
| g41_def_tw42 | 7.2 | -0.7 | 2.3 | 1.6 | 1.3 | 7.9 | 4.3 |
| g41_def_tw64 | 7.0 | -1.0 | 3.1 | 2.1 | 1.1 | 8.0 | 3.8 |
| g41_ring_tw42 | 4.9 | 0.7 | 2.1 | 2.8 | 0.8 | 4.2 | 1.3 |
| g41_ring_tw64 | 4.6 | 0.3 | 1.7 | 2.0 | 0.5 | 4.3 | 2.1 |
| g41_user_tw42 | 5.4 | -0.9 | 2.5 | 1.6 | 1.0 | 6.3 | 2.8 |
| g41_user_tw64 | 5.2 | -0.1 | 1.7 | 1.6 | 1.1 | 5.3 | 2.5 |
| median | 5.8 | -0.1 | 2.1 | 2.0 | 1.1 | 6.3 | 2.8 |
