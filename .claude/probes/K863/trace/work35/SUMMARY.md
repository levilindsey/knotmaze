# K1112 Run P (22P): m's and u's exits on one port each, against v6.8's joins

Started 2026-11-05 16:04 -08:00, cap 18:04. Probes only: `work35/`, `out35/`, one NOTES.md entry. Nothing in `src/` or `test/`. The bodies are v6.8's (`work34/base`); every candidate is variant M of `work28/ports_k990e.json` plus an exit record, in `work35/ports_k1112p.json`: Pm10/Pu10 (m's exit = n's record, u's = i's: a merge at the end node, stretch [0, 10] u), Pmu10 (both), and the second candidates Pm2/Pu2/Pmu2_2 (stretch [0, 2] u, task 5).

The gate's measure (task 3): per join out of m or u, the symmetric Hausdorff distance between the candidate's drawn join centreline and v6.8's (the quintic sampled in u), its mean over both directions' samples, and where the largest sits. A letter passes when every pair out of it lies within 1.0 u.

## m

### Pm10: gate FAIL (no pair within 1.0 u; smallest 2.95 u, mean of per-pair largests 11.72 u, largest 34.15 u)

| pair | largest (u) | where (word, join, arc u) | mean at largest (u) | font dmax v6.8 -> cand (u) | font dmean v6.8 -> cand (u) | flags v6.8 -> cand |
|---|---|---|---|---|---|---|
| ma | 9.7901 | 'be we shoe maze huge bye' join #5 at 0.00 (Pm10->v6.8) | 3.0998 | 2.95 -> 6.49 | 0.85 -> 3.34 | - -> - |
| mb | 9.7901 | 'mb' join #0 at 0.00 (Pm10->v6.8) | 0.7914 | 0.64 -> 1.84 | 0.37 -> 0.60 | - -> - |
| mc | 10.6596 | 'mc' join #0 at 61.81 (Pm10->v6.8) | 6.0536 | 2.90 -> 9.11 | 1.83 -> 5.90 | rough FAIL -> - |
| md | 9.7901 | 'md' join #0 at 0.00 (Pm10->v6.8) | 4.7600 | 2.93 -> 6.60 | 1.64 -> 4.17 | rough FAIL -> - |
| me | 29.9893 | 'me' join #0 at 104.45 (Pm10->v6.8) | 3.9877 | 1.83 -> 8.53 | 0.80 -> 1.30 | - -> - |
| mf | 17.7949 | 'mf' join #0 at 117.37 (Pm10->v6.8) | 2.2817 | 0.49 -> 2.55 | 0.25 -> 1.01 | - -> - |
| mg | 9.7901 | 'mg' join #0 at 0.00 (Pm10->v6.8) | 3.1395 | 2.77 -> 6.37 | 1.61 -> 4.00 | - -> - |
| mh | 17.1607 | 'mh' join #0 at 144.10 (Pm10->v6.8) | 1.5512 | 0.57 -> 1.88 | 0.17 -> 0.74 | - -> - |
| mi | 8.9045 | 'minimum' join #0 at 69.49 (v6.8->Pm10) | 4.2066 | 1.85 -> 8.79 | 0.97 -> 3.90 | - -> seam x1 |
| mj | 3.6487 | 'mj' join #0 at 158.25 (v6.8->Pm10) | 1.8223 | 1.72 -> 3.94 | 0.91 -> 2.25 | - -> - |
| mk | 15.8492 | 'mk' join #0 at 136.73 (Pm10->v6.8) | 5.2805 | 0.92 -> 10.06 | 0.28 -> 4.02 | - -> - |
| ml | 18.1176 | 'ml' join #0 at 117.80 (Pm10->v6.8) | 2.3370 | 0.43 -> 2.80 | 0.25 -> 1.18 | - -> - |
| mm | 9.7340 | 'mm' join #0 at 177.51 (Pm10->v6.8) | 2.3603 | 0.77 -> 5.32 | 0.23 -> 1.93 | - -> - |
| mn | 3.1199 | 'mn' join #0 at 105.84 (Pm10->v6.8) | 1.0438 | 0.60 -> 3.31 | 0.19 -> 1.36 | - -> - |
| mo | 4.6438 | 'mo' join #0 at 0.00 (Pm10->v6.8) | 1.3723 | 2.46 -> 4.29 | 0.58 -> 1.77 | - -> - |
| mp | 10.7594 | 'jumps over the lazy dog' join #2 at 158.77 (v6.8->Pm10) | 1.6156 | 2.14 -> 5.82 | 1.55 -> 2.37 | - -> - |
| mq | 9.7901 | 'mq' join #0 at 0.00 (Pm10->v6.8) | 3.0016 | 2.84 -> 5.47 | 0.65 -> 3.03 | - -> - |
| mr | 17.3513 | 'mr' join #0 at 71.44 (Pm10->v6.8) | 7.7080 | 4.26 -> 14.19 | 1.76 -> 7.66 | - -> seam x1 |
| ms | 15.1984 | 'ms' join #0 at 74.10 (Pm10->v6.8) | 6.9388 | 2.53 -> 13.76 | 1.26 -> 7.80 | - -> seam x1 |
| mt | 34.1486 | 'mt' join #0 at 214.09 (v6.8->Pm10) | 6.9554 | 2.99 -> 14.72 | 1.61 -> 6.02 | - -> - |
| mu | 5.7047 | 'mu' join #0 at 63.25 (v6.8->Pm10) | 2.2603 | 1.92 -> 6.19 | 1.09 -> 2.68 | - -> - |
| mv | 2.9536 | 'mv' join #0 at 107.07 (Pm10->v6.8) | 0.9143 | 0.78 -> 3.52 | 0.33 -> 1.40 | - -> - |
| mw | 9.9368 | 'mw' join #0 at 158.66 (v6.8->Pm10) | 2.0483 | 2.14 -> 7.11 | 1.24 -> 2.73 | - -> - |
| mx | 3.3628 | 'mx' join #0 at 52.57 (v6.8->Pm10) | 1.5373 | 1.21 -> 2.95 | 0.44 -> 1.66 | - -> - |
| my | 6.8387 | 'my' join #0 at 66.60 (Pm10->v6.8) | 2.9244 | 1.90 -> 6.87 | 0.86 -> 3.10 | - -> - |
| mz | 9.7901 | 'mz' join #0 at 0.00 (Pm10->v6.8) | 2.5307 | 0.83 -> 4.73 | 0.37 -> 1.87 | - -> - |

### Pm2: gate FAIL (no pair within 1.0 u; smallest 2.56 u, mean of per-pair largests 11.03 u, largest 34.06 u)

| pair | largest (u) | where (word, join, arc u) | mean at largest (u) | font dmax v6.8 -> cand (u) | font dmean v6.8 -> cand (u) | flags v6.8 -> cand |
|---|---|---|---|---|---|---|
| ma | 2.9574 | 'ma' join #0 at 63.64 (Pm2->v6.8) | 1.0458 | 2.95 -> 5.35 | 0.85 -> 1.74 | - -> - |
| mb | 16.4990 | 'mb' join #0 at 113.96 (Pm2->v6.8) | 3.3058 | 0.64 -> 4.78 | 0.37 -> 2.14 | - -> - |
| mc | 8.0334 | 'mc' join #0 at 61.35 (Pm2->v6.8) | 3.8749 | 2.90 -> 7.52 | 1.83 -> 2.89 | rough FAIL -> - |
| md | 6.0867 | 'md' join #0 at 61.23 (Pm2->v6.8) | 2.6134 | 2.93 -> 5.49 | 1.64 -> 2.35 | rough FAIL -> - |
| me | 29.9893 | 'me' join #0 at 96.08 (Pm2->v6.8) | 6.4195 | 1.83 -> 7.50 | 0.80 -> 3.61 | - -> - |
| mf | 17.7949 | 'mf' join #0 at 113.94 (Pm2->v6.8) | 3.4271 | 0.49 -> 4.97 | 0.25 -> 2.27 | - -> - |
| mg | 2.8659 | 'mg' join #0 at 63.66 (Pm2->v6.8) | 1.0148 | 2.77 -> 4.89 | 1.61 -> 2.08 | - -> - |
| mh | 17.1607 | 'mh' join #0 at 135.37 (Pm2->v6.8) | 3.4523 | 0.57 -> 5.08 | 0.17 -> 2.36 | - -> - |
| mi | 8.9739 | 'mi' join #0 at 69.79 (v6.8->Pm2) | 4.2408 | 1.85 -> 8.86 | 0.97 -> 3.92 | - -> seam x1 |
| mj | 4.5065 | 'mj' join #0 at 158.25 (v6.8->Pm2) | 1.9758 | 1.72 -> 4.25 | 0.91 -> 2.40 | - -> - |
| mk | 15.8492 | 'mk' join #0 at 128.79 (Pm2->v6.8) | 6.1679 | 0.92 -> 11.79 | 0.28 -> 4.38 | - -> - |
| ml | 18.1176 | 'ml' join #0 at 114.44 (Pm2->v6.8) | 3.4613 | 0.43 -> 5.10 | 0.25 -> 2.28 | - -> - |
| mm | 9.7340 | 'mm' join #0 at 172.82 (Pm2->v6.8) | 2.1350 | 0.77 -> 4.77 | 0.23 -> 2.52 | - -> - |
| mn | 2.8669 | 'mn' join #0 at 103.76 (v6.8->Pm2) | 0.8973 | 0.60 -> 3.04 | 0.19 -> 1.07 | - -> - |
| mo | 4.5877 | 'mo' join #0 at 52.62 (Pm2->v6.8) | 2.1872 | 2.46 -> 4.91 | 0.58 -> 2.87 | - -> - |
| mp | 10.7682 | 'jumps over the lazy dog' join #2 at 158.77 (v6.8->Pm2) | 1.7920 | 2.14 -> 5.73 | 1.55 -> 2.66 | - -> - |
| mq | 2.5633 | 'mq' join #0 at 61.40 (Pm2->v6.8) | 0.9156 | 2.84 -> 4.61 | 0.65 -> 1.45 | - -> - |
| mr | 17.2292 | 'mr' join #0 at 71.44 (Pm2->v6.8) | 7.6459 | 4.26 -> 14.09 | 1.76 -> 7.57 | - -> seam x1 |
| ms | 15.2737 | 'ms' join #0 at 74.52 (v6.8->Pm2) | 6.9672 | 2.53 -> 13.83 | 1.26 -> 7.83 | - -> seam x1 |
| mt | 34.0559 | 'mt' join #0 at 214.09 (v6.8->Pm2) | 8.1047 | 2.99 -> 17.60 | 1.61 -> 6.17 | - -> - |
| mu | 5.6266 | 'mu' join #0 at 63.85 (Pm2->v6.8) | 2.2150 | 1.92 -> 6.12 | 1.09 -> 2.66 | - -> - |
| mv | 2.8731 | 'mv' join #0 at 104.39 (v6.8->Pm2) | 0.9087 | 0.78 -> 3.43 | 0.33 -> 1.43 | - -> - |
| mw | 10.3223 | 'mw' join #0 at 158.66 (v6.8->Pm2) | 2.0990 | 2.14 -> 7.03 | 1.24 -> 3.07 | - -> - |
| mx | 3.5624 | 'mx' join #0 at 53.44 (v6.8->Pm2) | 1.5870 | 1.21 -> 3.14 | 0.44 -> 1.72 | - -> - |
| my | 8.3776 | 'my' join #0 at 63.77 (Pm2->v6.8) | 3.5835 | 1.90 -> 8.43 | 0.86 -> 3.84 | - -> - |
| mz | 10.0527 | 'mz' join #0 at 67.98 (v6.8->Pm2) | 4.7809 | 0.83 -> 9.50 | 0.37 -> 3.34 | - -> - |

Closer of the two, by the mean of the per-pair largests: Pm2 (11.03 u against 11.72 u). Neither passes, so the letter keeps its presets (task 5). The full per-word rows are in `work35/dist_gate.txt`; the census rows in `work35/tables.txt`.

## u

### Pu10: gate FAIL (no pair within 1.0 u; smallest 2.43 u, mean of per-pair largests 11.62 u, largest 33.53 u)

| pair | largest (u) | where (word, join, arc u) | mean at largest (u) | font dmax v6.8 -> cand (u) | font dmean v6.8 -> cand (u) | flags v6.8 -> cand |
|---|---|---|---|---|---|---|
| ua | 9.8068 | 'ua' join #0 at 0.00 (Pu10->v6.8) | 3.1361 | 2.74 -> 6.50 | 0.76 -> 3.81 | - -> - |
| ub | 16.4990 | 'ub' join #0 at 118.83 (Pu10->v6.8) | 1.5003 | 0.59 -> 1.85 | 0.23 -> 0.58 | - -> - |
| uc | 10.2791 | 'uc' join #0 at 61.99 (Pu10->v6.8) | 5.6784 | 2.92 -> 8.82 | 1.60 -> 3.98 | rough FAIL -> - |
| ud | 9.8068 | 'ud' join #0 at 0.00 (Pu10->v6.8) | 4.7436 | 2.89 -> 6.60 | 1.77 -> 4.31 | rough FAIL -> - |
| ue | 29.9893 | 'ue' join #0 at 103.02 (Pu10->v6.8) | 4.2729 | 2.12 -> 8.32 | 1.10 -> 1.39 | - -> - |
| uf | 9.8068 | 'uf' join #0 at 0.00 (Pu10->v6.8) | 0.6693 | 0.45 -> 1.85 | 0.09 -> 0.50 | - -> - |
| ug | 9.8068 | 'ug' join #0 at 0.00 (Pu10->v6.8) | 3.0713 | 2.67 -> 6.06 | 1.53 -> 3.93 | - -> - |
| uh | 17.1607 | 'uh' join #0 at 132.32 (Pu10->v6.8) | 4.1598 | 0.55 -> 7.05 | 0.15 -> 3.32 | - -> - |
| ui | 9.4942 | 'quick brown fox' join #1 at 67.17 (Pu10->v6.8) | 4.3473 | 2.00 -> 9.73 | 0.90 -> 4.41 | - -> seam x1 |
| uj | 5.4369 | 'uj' join #0 at 53.24 (Pu10->v6.8) | 2.4414 | 1.94 -> 6.29 | 0.86 -> 3.17 | - -> - |
| uk | 12.6047 | 'uk' join #0 at 66.83 (Pu10->v6.8) | 6.1835 | 0.80 -> 12.19 | 0.22 -> 4.63 | - -> - |
| ul | 18.1176 | 'ul' join #0 at 116.79 (Pu10->v6.8) | 2.5294 | 0.51 -> 3.55 | 0.19 -> 1.56 | - -> - |
| um | 9.7340 | 'um' join #0 at 172.14 (Pu10->v6.8) | 2.2318 | 0.87 -> 5.07 | 0.31 -> 2.54 | - -> - |
| un | 2.4293 | 'un' join #0 at 103.59 (v6.8->Pu10) | 1.0904 | 0.55 -> 2.40 | 0.13 -> 1.16 | - -> - |
| uo | 4.9704 | 'uo' join #0 at 48.67 (Pu10->v6.8) | 2.2947 | 2.84 -> 5.54 | 0.64 -> 2.82 | - -> - |
| up | 10.1841 | 'puppy' join #1 at 157.67 (v6.8->Pu10) | 2.2053 | 1.96 -> 5.49 | 1.35 -> 3.07 | - -> - |
| uq | 9.8068 | 'uq' join #0 at 0.00 (Pu10->v6.8) | 3.1531 | 2.45 -> 5.53 | 0.73 -> 3.25 | - -> - |
| ur | 17.0975 | 'cursive' join #1 at 68.50 (Pu10->v6.8) | 7.4483 | 3.12 -> 15.49 | 1.54 -> 6.76 | - -> - |
| us | 16.1956 | 'us' join #0 at 70.45 (Pu10->v6.8) | 7.3696 | 2.50 -> 15.08 | 1.34 -> 8.55 | - -> seam x1 |
| ut | 33.5342 | 'ut' join #0 at 212.52 (v6.8->Pu10) | 7.4942 | 2.99 -> 16.34 | 1.84 -> 8.93 | - -> - |
| uu | 6.9374 | 'uu' join #0 at 60.32 (Pu10->v6.8) | 2.7306 | 2.14 -> 7.78 | 1.10 -> 3.91 | - -> - |
| uv | 2.5221 | 'uv' join #0 at 103.68 (v6.8->Pu10) | 1.1273 | 0.63 -> 2.87 | 0.20 -> 1.27 | - -> - |
| uw | 7.5250 | 'uw' join #0 at 157.32 (v6.8->Pu10) | 2.2816 | 2.13 -> 6.69 | 1.23 -> 3.33 | - -> - |
| ux | 5.0231 | 'ux' join #0 at 51.52 (Pu10->v6.8) | 1.9883 | 1.02 -> 4.89 | 0.47 -> 2.35 | - -> - |
| uy | 7.8925 | 'uy' join #0 at 63.20 (v6.8->Pu10) | 3.4981 | 1.92 -> 8.34 | 0.69 -> 3.82 | - -> - |
| uz | 9.5469 | 'uz' join #0 at 65.47 (v6.8->Pu10) | 4.5074 | 0.72 -> 9.36 | 0.27 -> 4.24 | - -> - |

### Pu2: gate FAIL (no pair within 1.0 u; smallest 2.44 u, mean of per-pair largests 11.21 u, largest 33.94 u)

| pair | largest (u) | where (word, join, arc u) | mean at largest (u) | font dmax v6.8 -> cand (u) | font dmean v6.8 -> cand (u) | flags v6.8 -> cand |
|---|---|---|---|---|---|---|
| ua | 3.1569 | 'ua' join #0 at 62.32 (Pu2->v6.8) | 1.1301 | 2.74 -> 5.27 | 0.76 -> 1.55 | - -> - |
| ub | 16.4990 | 'ub' join #0 at 112.76 (Pu2->v6.8) | 3.2634 | 0.59 -> 5.24 | 0.23 -> 2.40 | - -> - |
| uc | 7.9156 | 'uc' join #0 at 60.47 (Pu2->v6.8) | 3.6799 | 2.92 -> 7.43 | 1.60 -> 3.27 | rough FAIL -> - |
| ud | 6.2918 | 'ud' join #0 at 60.22 (Pu2->v6.8) | 2.6753 | 2.89 -> 5.40 | 1.77 -> 2.05 | rough FAIL -> - |
| ue | 29.9837 | 'ue' join #0 at 94.92 (Pu2->v6.8) | 6.6780 | 2.12 -> 7.98 | 1.10 -> 3.55 | - -> - |
| uf | 17.7949 | 'uf' join #0 at 112.73 (Pu2->v6.8) | 3.4759 | 0.45 -> 5.40 | 0.09 -> 2.31 | - -> - |
| ug | 3.1125 | 'be we shoe maze huge bye' join #9 at 62.39 (Pu2->v6.8) | 1.1164 | 2.67 -> 4.81 | 1.53 -> 1.83 | - -> - |
| uh | 17.1607 | 'uh' join #0 at 132.33 (Pu2->v6.8) | 4.1888 | 0.55 -> 7.11 | 0.15 -> 3.36 | - -> - |
| ui | 9.5686 | 'quick brown fox' join #1 at 67.19 (Pu2->v6.8) | 4.3947 | 2.00 -> 9.80 | 0.90 -> 4.40 | - -> seam x1 |
| uj | 5.3969 | 'uj' join #0 at 53.26 (Pu2->v6.8) | 2.4426 | 1.94 -> 6.26 | 0.86 -> 3.35 | - -> - |
| uk | 15.8492 | 'uk' join #0 at 126.64 (Pu2->v6.8) | 6.1909 | 0.80 -> 11.86 | 0.22 -> 5.43 | - -> - |
| ul | 18.1176 | 'ul' join #0 at 113.25 (Pu2->v6.8) | 3.4979 | 0.51 -> 5.60 | 0.19 -> 2.50 | - -> - |
| um | 9.7340 | 'minimum' join #5 at 171.88 (Pu2->v6.8) | 2.4143 | 0.87 -> 6.21 | 0.31 -> 3.39 | - -> - |
| un | 2.4399 | 'un' join #0 at 104.44 (v6.8->Pu2) | 1.0874 | 0.55 -> 2.40 | 0.13 -> 1.02 | - -> - |
| uo | 4.9581 | 'uo' join #0 at 48.67 (Pu2->v6.8) | 2.2881 | 2.84 -> 5.53 | 0.64 -> 2.81 | - -> - |
| up | 10.7395 | 'up' join #0 at 157.74 (v6.8->Pu2) | 2.2554 | 1.96 -> 5.61 | 1.35 -> 3.10 | - -> - |
| uq | 2.9712 | 'uq' join #0 at 60.87 (Pu2->v6.8) | 1.0748 | 2.45 -> 4.57 | 0.73 -> 1.33 | - -> - |
| ur | 17.0835 | 'cursive' join #1 at 68.16 (Pu2->v6.8) | 7.4320 | 3.12 -> 15.49 | 1.54 -> 6.72 | - -> seam x1 |
| us | 16.2665 | 'us' join #0 at 70.48 (Pu2->v6.8) | 7.3949 | 2.50 -> 15.15 | 1.34 -> 8.57 | - -> seam x1 |
| ut | 33.9365 | 'ut' join #0 at 212.52 (v6.8->Pu2) | 7.7935 | 2.99 -> 17.86 | 1.84 -> 7.18 | - -> - |
| uu | 6.9525 | 'uu' join #0 at 60.32 (Pu2->v6.8) | 2.7287 | 2.14 -> 7.80 | 1.10 -> 3.92 | - -> - |
| uv | 2.5317 | 'uv' join #0 at 103.68 (v6.8->Pu2) | 1.1284 | 0.63 -> 2.88 | 0.20 -> 1.27 | - -> - |
| uw | 9.9439 | 'uw' join #0 at 157.32 (v6.8->Pu2) | 2.4204 | 2.13 -> 6.87 | 1.23 -> 3.28 | - -> - |
| ux | 5.0292 | 'ux' join #0 at 51.51 (Pu2->v6.8) | 1.9903 | 1.02 -> 4.90 | 0.47 -> 2.35 | - -> - |
| uy | 7.9120 | 'uy' join #0 at 63.20 (v6.8->Pu2) | 3.5009 | 1.92 -> 8.36 | 0.69 -> 3.82 | - -> - |
| uz | 10.0303 | 'uz' join #0 at 66.61 (v6.8->Pu2) | 4.7748 | 0.72 -> 9.86 | 0.27 -> 4.45 | - -> - |

Closer of the two, by the mean of the per-pair largests: Pu2 (11.21 u against 11.62 u). Neither passes, so the letter keeps its presets (task 5). The full per-word rows are in `work35/dist_gate.txt`; the census rows in `work35/tables.txt`.

## Both exits at once

- Pmu10: gate FAIL on both letters (m: smallest 2.95, mean-largest 11.72, largest 34.15 u; u: smallest 2.43, mean-largest 11.62, largest 33.53 u). Its joins out of m and u are the single-letter candidates' to the last digit in `dist_gate.txt`.
- Pmu2_2: gate FAIL on both letters (m: smallest 2.56, mean-largest 11.03, largest 34.06 u; u: smallest 2.44, mean-largest 11.21, largest 33.94 u). Its joins out of m and u are the single-letter candidates' to the last digit in `dist_gate.txt`.

## The calibration on c (task 3)

J3h's v7.0 (presets) against v7.1 (c's port, Pc10), the same measure, on ca..cz: smallest 2.77 u (cy), mean of largests 12.71 u, largest 34.20 u (ct). No c pair reads within 1.0 u (0 of 26), so the 1.0 u gate would have turned c's port down too, as Levi did (K1197). Per pair: ca 9.98, cb 16.50, cc 11.90, cd 9.98, ce 25.83, cf 17.79, cg 9.98, ch 17.16, ci 7.18, cj 14.49, ck 15.85, cl 18.12, cm 9.98, cn 10.18, co 9.98, cp 15.01, cq 9.98, cr 10.02, cs 9.74, ct 34.20, cu 6.63, cv 9.15, cw 9.72, cx 8.40, cy 2.77, cz 9.98.

## The checks (task 4)

Census on J3i's 232 words plus ma..mz and ua..uz (284 words, 829 pieces; `work35/census_*.json`, counts from `work35/tables.txt`):

- v6.8     all: pieces 829, hooks 105, spikes 149, rough 213, seams 27, over 357 | joins out of m/u: pieces 65, hooks 0, spikes 0, rough 4, seams 0, over 7
- Pm10     all: pieces 829, hooks 105, spikes 149, rough 211, seams 31, over 383 | joins out of m/u: pieces 65, hooks 0, spikes 0, rough 2, seams 4, over 33
- Pu10     all: pieces 829, hooks 105, spikes 149, rough 211, seams 31, over 383 | joins out of m/u: pieces 65, hooks 0, spikes 0, rough 2, seams 4, over 33
- Pmu10    all: pieces 829, hooks 105, spikes 149, rough 209, seams 35, over 409 | joins out of m/u: pieces 65, hooks 0, spikes 0, rough 0, seams 8, over 59
- Pm2      all: pieces 829, hooks 105, spikes 149, rough 211, seams 31, over 385 | joins out of m/u: pieces 65, hooks 0, spikes 0, rough 2, seams 4, over 35
- Pu2      all: pieces 829, hooks 105, spikes 149, rough 211, seams 32, over 386 | joins out of m/u: pieces 65, hooks 0, spikes 0, rough 2, seams 5, over 36
- Pmu2_2   all: pieces 829, hooks 105, spikes 149, rough 209, seams 36, over 414 | joins out of m/u: pieces 65, hooks 0, spikes 0, rough 0, seams 9, over 64

Hooks (105) and spikes (149) do not rise under any candidate. Rough FAIL falls (213 -> 211 per single letter, -> 209 with both). Undesigned seams rise: 27 -> 31 per single letter (+4; Pu2 +5), -> 35 with both at [0, 10] and 36 at [0, 2]: the same port-cusp class as c's four (ci, cr, cs, cy in J3h). Over-budget joins out of m/u rise (7 of 65 -> 33 per letter). On the joins out of m/u alone (65 pieces): v6.8 hooks 0, spikes 0, rough 4, seams 0; each single-letter candidate rough 2, seams 4 (Pu2 5); both-exits rough 0, seams 8 (Pmu2_2 9).

- Locality (`work35/locality_<variant>.txt`): PASS for all six candidates. 1348 untouched pieces per candidate, 0 not byte-identical; the moved pieces are only m's and u's strokes, the joins out of them, their tails and the following letter's stroke 0.
- Solves (`work35/solves.txt`): Pm10 and Pmu10 stop at maxfev on me (status 1, nfev 3000 of 3000); Pu10 and Pmu10 on uf; Pu2 and Pmu2_2 on um and us; Pm2 converges on all 26. Every other solve of the 52 pairs converges in every build.
- The side test (K991, `work35/side.txt`): PASS. 72 cusp entries counted over the builds (18 distinct pairs per candidate family), none below -0.05 u; the lowest is uw at 0.0002 u.
- Determinism: a second census of Pmu10 (`work35/det/`) is byte-identical to the first, JSON (SHA256 920BEA917EB36E18...) and text (DBB11131A102924A...) both.
- The guard (`work20/dbg/check_out_k990.py out35`): ALL CLEAN on the three SVGs.

## Sheets and crops (task 6)

- `out35/m_v68.svg` (PNG `out35/png/m_v68.png`, dpi 48): font | approved (v6.8) | Pm10 | Pm2 | Pmu10; m alone, ma..mz and the census words holding a join out of m.
- `out35/u_v68.svg` (PNG `out35/png/u_v68.png`): the same for u (Pu10, Pu2, Pmu10).
- `out35/overlay_v68.svg` (PNG `out35/png/overlay_v68.png`): ma..mz and ua..uz, the font's fill in light grey with v6.8 in black, Pm10 red, Pu10 blue, Pmu10 purple on the same axes.
- Crops at 3x (dpi 144, `work35/look/crop_*.png`): the five pairs with the largest distance per per-letter candidate (Pm10: mt, me, ml, mr, mf; Pm2: the same five; Pu10: ut, ue, ul, uh, ur; Pu2: ut, ue, ul, uh, uf), and two mid-word joins per letter (`crop_mid_m_minimum`, `crop_mid_m_jumps`, `crop_mid_u_cursive`, `crop_mid_u_jumps`).

What was measured, not judged: no candidate draws v6.8's joins within 1.0 u on any pair, so no sheet goes forward as a pick on these numbers; both letters keep their presets unless Claude's eye and Levi decide otherwise. Nothing is left undone from the brief; the second candidates were the last task the cap allowed beside the sheets.
