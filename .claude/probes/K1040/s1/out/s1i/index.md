# K1040 S1i (K1114): S1f's rounding, restored

Form B's ink at S1h's 18 sites (S1h's numbers and order of `out/s1h/sites.json`), in three forms, the same scene, centre (the
corner's V) and scale, dpr 2, greyscale `255 (1 - ink)`, `look.ctrlArc ??= 0.47`:

- **S1f** = `FormB({dEdge: "skip", rootBand: 0})`, S1f's final (equal to the frozen `form_b_s1f_q.ts` at every site: `pairs.txt`);
- **today** = S1g's final, master's defaults before S1i (`0ad5634c`), = `FormB({dEdgeTip: 0})` (equal to the frozen `form_b_s1g_q.ts`);
- **restored** = S1i's defaults (`dEdgeTip: 1`, the brief's F3: near's behind cut `c = k·u` with `k` from the arm's corners).

- `sheet.png`: every triple S1f | today | restored at zoom 4 (each device px a 4 x 4 block), +-3.5h around V (the window is clamped to
  80..160 px). Sites 02, 16 and 17 first (Levi saw them), then the other F1 sites, then F2's.
- `<n>_<group>_<scene>_<j>_<a>-<b>_z4.png` (zoom 4) and `..._z1.png` (play size, +-8h): S1f | today | restored | restored - S1f |
  restored - today. A diff panel is red where the later form has more ink, blue where it has less, over a faint grey of the larger ink.
- `pairs.txt`: the same numbers per site, the play-size window's too, and the equivalence checks.

Columns: `r` is the site's corner radius in each form (`none` = no corner built there, `(empty)` = r or ω is 0). `differ` counts the
pixels whose ink differs by more than 0.02 in the zoom 4 window (lost / gained: by more than 0.5); for the comparisons with S1f, `max`
is the largest distance of a differing pixel from S1f's 0.5 contour (device px, 4-connected) and `far` the count beyond 3 px. The
play-size window's counts follow in parentheses.

| # | group | scene | site | r: S1f / today / restored | today vs S1f | restored vs S1f | restored vs today | files |
|---|---|---|---|---|---|---|---|---|
| 02 | F1-lost | muse_hash | j36 109-110 (θ 1.804), V (29.742, 20.159) | 2.721h / 0.000h (empty) / 2.721h | 392 (lost 156, gained 95, max 6, far 33); play 392, far 33 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 392; play 392 | [z4](02_F1-lost_muse_hash_j36_109-110_z4.png) [z1](02_F1-lost_muse_hash_j36_109-110_z1.png) |
| 16 | extra-tip | muse_hash | j131 397-398 (θ 1.630), V (28.594, 9.559) | 3.183h / 0.392h / 3.183h | 549 (lost 184, gained 273, max 13, far 191); play 549, far 191 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 549; play 549 | [z4](16_extra-tip_muse_hash_j131_397-398_z4.png) [z1](16_extra-tip_muse_hash_j131_397-398_z1.png) |
| 17 | extra-tip | muse_hash | j99 301-299 (θ 2.003), V (14.105, 14.474) | 2.518h / 0.350h / 2.518h | 318 (lost 109, gained 106, max 5, far 9); play 318, far 9 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 318; play 318 | [z4](17_extra-tip_muse_hash_j99_301-299_z4.png) [z1](17_extra-tip_muse_hash_j99_301-299_z1.png) |
| 01 | F1-lost | muse_hash | j0 0-1 (θ 1.476), V (23.267, 10.519) | 0.043h / none / 0.043h | 46 (lost 10, gained 8, max 3, far 0); play 46, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 46; play 46 | [z4](01_F1-lost_muse_hash_j0_0-1_z4.png) [z1](01_F1-lost_muse_hash_j0_0-1_z1.png) |
| 03 | F1-lost | muse_hash | j155 471-472 (θ 0.933), V (9.337, 9.011) | 0.120h / 0.000h (empty) / 0.120h | 112 (lost 17, gained 37, max 3, far 0); play 115, far 0 | 2 (lost 0, gained 0, max 0, far 0); play 5, far 0 | 110; play 110 | [z4](03_F1-lost_muse_hash_j155_471-472_z4.png) [z1](03_F1-lost_muse_hash_j155_471-472_z1.png) |
| 04 | F1-lost | muse_hash | j156 475-473 (θ 0.950), V (8.708, 8.924) | 0.125h / none / 0.125h | 112 (lost 17, gained 37, max 3, far 0); play 144, far 0 | 2 (lost 0, gained 0, max 0, far 0); play 5, far 0 | 110; play 139 | [z4](04_F1-lost_muse_hash_j156_475-473_z4.png) [z1](04_F1-lost_muse_hash_j156_475-473_z1.png) |
| 05 | F1-j62 | muse_hash | j62 189-187 (θ 2.032), V (29.091, 23.936) | 2.438h / 1.431h / 2.438h | 209 (lost 59, gained 72, max 3, far 0); play 209, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 209; play 209 | [z4](05_F1-j62_muse_hash_j62_189-187_z4.png) [z1](05_F1-j62_muse_hash_j62_189-187_z1.png) |
| 18 | extra-tip | muse_hash | j73 222-220 (θ 1.309), V (5.355, 14.738) | 0.297h / 0.460h / 0.297h | 166 (lost 32, gained 60, max 3, far 0); play 166, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 166; play 166 | [z4](18_extra-tip_muse_hash_j73_222-220_z4.png) [z1](18_extra-tip_muse_hash_j73_222-220_z1.png) |
| 06 | F2-r | muse_default_tw | j57 172-173 (θ 2.820), V (34.360, 18.180) | 4.000h / 0.678h / 0.678h | 31 (lost 4, gained 5, max 1, far 0); play 31, far 0 | 31 (lost 4, gained 5, max 1, far 0); play 31, far 0 | 0; play 0 | [z4](06_F2-r_muse_default_tw_j57_172-173_z4.png) [z1](06_F2-r_muse_default_tw_j57_172-173_z1.png) |
| 07 | F2-r | muse_hash | j23 72-70 (θ 2.953), V (0.351, 17.546) | 4.000h / 1.252h / 1.252h | 58 (lost 8, gained 11, max 1, far 0); play 58, far 0 | 58 (lost 8, gained 11, max 1, far 0); play 58, far 0 | 0; play 0 | [z4](07_F2-r_muse_hash_j23_72-70_z4.png) [z1](07_F2-r_muse_hash_j23_72-70_z1.png) |
| 08 | F2-r | muse_hash | j110 335-333 (θ 2.758), V (5.293, 4.051) | 4.000h / 1.283h / 1.283h | 36 (lost 4, gained 0, max 1, far 0); play 230, far 0 | 36 (lost 4, gained 0, max 1, far 0); play 104, far 0 | 0; play 188 | [z4](08_F2-r_muse_hash_j110_335-333_z4.png) [z1](08_F2-r_muse_hash_j110_335-333_z1.png) |
| 09 | F2-r | muse_default_tw | j110 335-333 (θ 2.689), V (5.342, 4.198) | 4.000h / 1.362h / 1.362h | 34 (lost 4, gained 3, max 0, far 0); play 83, far 0 | 34 (lost 4, gained 3, max 0, far 0); play 83, far 0 | 0; play 0 | [z4](09_F2-r_muse_default_tw_j110_335-333_z4.png) [z1](09_F2-r_muse_default_tw_j110_335-333_z1.png) |
| 10 | F2-r | muse_default_tw | j164 499-497 (θ 2.561), V (22.353, 23.226) | 3.993h / 1.683h / 1.683h | 76 (lost 14, gained 14, max 1, far 0); play 76, far 0 | 76 (lost 14, gained 14, max 1, far 0); play 76, far 0 | 0; play 0 | [z4](10_F2-r_muse_default_tw_j164_499-497_z4.png) [z1](10_F2-r_muse_default_tw_j164_499-497_z1.png) |
| 11 | F2-r | muse_hash | j57 172-173 (θ 2.909), V (34.941, 18.224) | 4.000h / 1.716h / 1.716h | 45 (lost 6, gained 6, max 1, far 0); play 45, far 0 | 45 (lost 6, gained 6, max 1, far 0); play 45, far 0 | 0; play 0 | [z4](11_F2-r_muse_hash_j57_172-173_z4.png) [z1](11_F2-r_muse_hash_j57_172-173_z1.png) |
| 12 | F2-r | g41_user_tw64 | j12 36-37 (θ 3.012), V (21.272, 22.891) | 2.000h / 0.028h / 0.028h | 43 (lost 5, gained 10, max 1, far 0); play 43, far 0 | 43 (lost 5, gained 10, max 1, far 0); play 43, far 0 | 0; play 0 | [z4](12_F2-r_g41_user_tw64_j12_36-37_z4.png) [z1](12_F2-r_g41_user_tw64_j12_36-37_z1.png) |
| 13 | F2-r | user_tw42.lightpaper | j49 151-152 (θ 3.025), V (13.721, 6.030) | 2.000h / 0.037h / 0.037h | 24 (lost 2, gained 5, max 1, far 0); play 24, far 0 | 24 (lost 2, gained 5, max 1, far 0); play 24, far 0 | 0; play 0 | [z4](13_F2-r_user_tw42.lightpaper_j49_151-152_z4.png) [z1](13_F2-r_user_tw42.lightpaper_j49_151-152_z1.png) |
| 14 | F2-r | g41_user_tw42 | j49 151-152 (θ 3.024), V (13.721, 6.030) | 2.000h / 0.037h / 0.037h | 24 (lost 2, gained 5, max 1, far 0); play 24, far 0 | 24 (lost 2, gained 5, max 1, far 0); play 24, far 0 | 0; play 0 | [z4](14_F2-r_g41_user_tw42_j49_151-152_z4.png) [z1](14_F2-r_g41_user_tw42_j49_151-152_z1.png) |
| 15 | F2-r | muse_hash | j124 375-376 (θ 2.218), V (13.412, 9.743) | 1.967h / 0.078h / 0.078h | 48 (lost 9, gained 11, max 1, far 0); play 48, far 0 | 48 (lost 9, gained 11, max 1, far 0); play 48, far 0 | 0; play 0 | [z4](15_F2-r_muse_hash_j124_375-376_z4.png) [z1](15_F2-r_muse_hash_j124_375-376_z1.png) |
| all | | | | | 2323; play 2601 | 423; play 546 | 1900; play 2117 | |

## Reading the rows

- F1 sites (01-05, 16-18): S1g's near d-edge cut these corners' arms short (`dEdge: "near"`, `c = u`), which emptied or shrank the
  fill. Restored gives every one of their arms S1f's span back at rest, so their ink is S1f's again. The 2 px left at 03 and 04 (5 at
  play size) are one spot, (8.80, 7.67), about 3.3h below both corners' V and on S1f's edge, where another corner's root gate moves the
  ink by less than 0.5.
- F2 sites (06-15): S1g's root gate (`rootBand: 0.5`) shrinks r (4.000h to 0.678h at 06) at corners whose feet sit near an arm's
  root; the ink moves by at most 1 device px from S1f's edge (`max` 1, `far` 0), the brief's "within a few device pixels". S1i keeps
  the root gate: it is what holds gate699's r step at 0.030, and `rootBand: 0` brings back its 2.000 step.
- The check: with the root gate off too (`FormB({rootBand: 0})`), every site's ink is S1f's exactly, 0 px at both windows
  (`sites_rb0.txt`). So all of restored's remaining px are the root gate's, and none is the d-edge's.
- Regenerate: `node .claude/probes/K1040/s1/s1i_mk_pair.mjs`, then `npx.cmd vite-node .claude/probes/K1040/s1/s1i_pair.ts`. Scenes and
  `sites.json` are read in place from the main checkout (`.claude/probes/K868/scenes`, `.claude/probes/K1040/s1/out/s1h/`).
