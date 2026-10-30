# K783: load to asleep, 20 typical links (2026-10-29)

Setup: bare-seed links 1-20 (the default design) on a local preview
build of master, headed Chrome off-screen, desktop GPU. Desktop size
1600x900; phone size is an emulated 411x753 viewport at DPR 2.625 in
the same desktop Chrome (not the real phone). Asleep is the page's own
`__knotPerf` flag; cost is its cumulative physics milliseconds (the
worker's stepping time) per wall second until then. Script: k783.mjs
in this folder; raw rows: out.jsonl.

| | Desktop | Phone (emulated) |
|---|---|---|
| asleep | 20/20 | 20/20 |
| wall to asleep: median (min-max) | 9.21 s (8.69-15.02) | 9.17 s (8.78-15.72) |
| sim seconds at asleep | 5.0 (all 20) | 5.0 (all 20) |
| physics per wall second | ~901 ms | ~910 ms |
| median frame until asleep | 35.6 ms | 20 ms |

Reading: every link sleeps at the same sim 5.0 s (the settle + quiet
window), which takes about 9 s of wall here because the settle budget
spends it slower than real time; until then the physics worker is busy
about 0.9 of every wall second (one core), on both sizes. The wall
number is this desktop's; the sim number (5 s) is the design's.
