# span_bench: the upload's CPU in Node (desktop), median of 101 calls, ms

| scene | points | chains | spans | max ns | s monotone | binary | walk | same bits | diff at rest (5 tables) | words diffed |
|---|---|---|---|---|---|---|---|---|---|---|
| muse_hash | 23434 | 86 | 431 | 19 | yes | 0.423 | 0.227 | yes | 0.285 | 193460 |
| muse_default_tw | 23727 | 86 | 482 | 25 | yes | 0.518 | 0.228 | yes | 0.290 | 199752 |
| def | 24609 | 92 | 527 | 49 | yes | 0.574 | 0.235 | yes | 0.300 | 207684 |
| fat | 17325 | 6 | 6 | 1 | yes | 0.105 | 0.102 | yes | 0.201 | 138672 |
| ring | 4578 | 14 | 72 | 28 | yes | 0.111 | 0.042 | yes | 0.055 | 38008 |
| user_tw42.lightpaper | 10680 | 35 | 202 | 31 | yes | 0.195 | 0.101 | yes | 0.132 | 89960 |
| g41_def_tw42 | 24751 | 92 | 527 | 49 | yes | 0.506 | 0.217 | yes | 0.308 | 209972 |
| g41_def_tw64 | 24444 | 92 | 513 | 49 | yes | 0.493 | 0.213 | yes | 0.296 | 204604 |
| g41_ring_tw42 | 4620 | 14 | 72 | 28 | yes | 0.099 | 0.039 | yes | 0.057 | 38584 |
| g41_ring_tw64 | 4568 | 14 | 70 | 28 | yes | 0.095 | 0.038 | yes | 0.055 | 37848 |
| g41_user_tw42 | 10680 | 35 | 202 | 31 | yes | 0.194 | 0.092 | yes | 0.131 | 89960 |
| g41_user_tw64 | 10582 | 35 | 187 | 29 | yes | 0.191 | 0.091 | yes | 0.128 | 88324 |
