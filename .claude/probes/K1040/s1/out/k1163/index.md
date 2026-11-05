# K1163: the softer root gate (the tip-scaled band)

Form B's ink at S1h's 18 sites (S1h's numbers and order of `out/s1h/sites.json`), in three forms, the same scene, centre (the
corner's V) and scale, dpr 2, greyscale `255 (1 - ink)`, `look.ctrlArc ??= 0.47`:

- **S1f** = `FormB({dEdge: "skip", rootBand: 0})`, S1f's final (equal to the frozen `form_b_s1f_q.ts` at every site: `pairs.txt`);
- **flat** = `FormB({rootBandScale: "flat"})`: today (master before K1163), S1g's root band 0.5h at every angle;
- **tip** = `FormB({rootBandScale: "tip"})` (the default): K1163's band, rootBand*h*min(1, t(theta)/t(2.0)) with
  t(theta) = 1/sin(theta/2) - 1, so the tip moves at about 1.1x the root's speed at every angle.

- `sheet.png`: every triple S1f | flat | tip at zoom 4 (each device px a 4 x 4 block), +-3.5h around V (the window is clamped to
  80..160 px). Rows 06-15 first (the root gate's sites), then the rest.
- `<n>_<group>_<scene>_<j>_<a>-<b>_z4.png` (zoom 4) and `..._z1.png` (play size, +-8h): S1f | flat | tip | tip - S1f |
  tip - flat. A diff panel is red where the later form has more ink, blue where it has less, over a faint grey of the larger ink.
- `pairs.txt`: the same numbers per site, the play-size window's too, and the S1f equivalence check.

Columns: `r` is the site's corner radius in each form (`none` = no corner built there, `(empty)` = r or omega is 0). `differ` counts the
pixels whose ink differs by more than 0.02 in the zoom 4 window (lost / gained: by more than 0.5); for the comparisons with S1f, `max`
is the largest distance of a differing pixel from S1f's 0.5 contour (device px, 4-connected) and `far` the count beyond 3 px. The
play-size window's counts follow in parentheses.

| # | group | scene | site | r: S1f / flat / tip | flat vs S1f | tip vs S1f | tip vs flat | files |
|---|---|---|---|---|---|---|---|---|
| 06 | F2-r | muse_default_tw | j57 172-173 (theta 2.820), V (34.360, 18.180) | 4.000h / 0.678h / 4.000h | 31 (lost 4, gained 5, max 1, far 0); play 31, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 31; play 31 | [z4](06_F2-r_muse_default_tw_j57_172-173_z4.png) [z1](06_F2-r_muse_default_tw_j57_172-173_z1.png) |
| 07 | F2-r | muse_hash | j23 72-70 (theta 2.953), V (0.351, 17.546) | 4.000h / 1.252h / 4.000h | 58 (lost 8, gained 11, max 1, far 0); play 58, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 58; play 58 | [z4](07_F2-r_muse_hash_j23_72-70_z4.png) [z1](07_F2-r_muse_hash_j23_72-70_z1.png) |
| 08 | F2-r | muse_hash | j110 335-333 (theta 2.758), V (5.293, 4.051) | 4.000h / 1.283h / 4.000h | 36 (lost 4, gained 0, max 1, far 0); play 104, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 36; play 104 | [z4](08_F2-r_muse_hash_j110_335-333_z4.png) [z1](08_F2-r_muse_hash_j110_335-333_z1.png) |
| 09 | F2-r | muse_default_tw | j110 335-333 (theta 2.689), V (5.342, 4.198) | 4.000h / 1.362h / 4.000h | 34 (lost 4, gained 3, max 0, far 0); play 83, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 34; play 83 | [z4](09_F2-r_muse_default_tw_j110_335-333_z4.png) [z1](09_F2-r_muse_default_tw_j110_335-333_z1.png) |
| 10 | F2-r | muse_default_tw | j164 499-497 (theta 2.561), V (22.353, 23.226) | 3.993h / 1.683h / 3.993h | 76 (lost 14, gained 14, max 1, far 0); play 76, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 76; play 76 | [z4](10_F2-r_muse_default_tw_j164_499-497_z4.png) [z1](10_F2-r_muse_default_tw_j164_499-497_z1.png) |
| 11 | F2-r | muse_hash | j57 172-173 (theta 2.909), V (34.941, 18.224) | 4.000h / 1.716h / 4.000h | 45 (lost 6, gained 6, max 1, far 0); play 45, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 45; play 45 | [z4](11_F2-r_muse_hash_j57_172-173_z4.png) [z1](11_F2-r_muse_hash_j57_172-173_z1.png) |
| 12 | F2-r | g41_user_tw64 | j12 36-37 (theta 3.012), V (21.272, 22.891) | 2.000h / 0.028h / 2.000h | 43 (lost 5, gained 10, max 1, far 0); play 43, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 43; play 43 | [z4](12_F2-r_g41_user_tw64_j12_36-37_z4.png) [z1](12_F2-r_g41_user_tw64_j12_36-37_z1.png) |
| 13 | F2-r | user_tw42.lightpaper | j49 151-152 (theta 3.025), V (13.721, 6.030) | 2.000h / 0.037h / 2.000h | 24 (lost 2, gained 5, max 1, far 0); play 24, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 24; play 24 | [z4](13_F2-r_user_tw42.lightpaper_j49_151-152_z4.png) [z1](13_F2-r_user_tw42.lightpaper_j49_151-152_z1.png) |
| 14 | F2-r | g41_user_tw42 | j49 151-152 (theta 3.024), V (13.721, 6.030) | 2.000h / 0.037h / 2.000h | 24 (lost 2, gained 5, max 1, far 0); play 24, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 24; play 24 | [z4](14_F2-r_g41_user_tw42_j49_151-152_z4.png) [z1](14_F2-r_g41_user_tw42_j49_151-152_z1.png) |
| 15 | F2-r | muse_hash | j124 375-376 (theta 2.218), V (13.412, 9.743) | 1.967h / 0.078h / 0.274h | 48 (lost 9, gained 11, max 1, far 0); play 48, far 0 | 48 (lost 8, gained 10, max 1, far 0); play 48, far 0 | 9; play 9 | [z4](15_F2-r_muse_hash_j124_375-376_z4.png) [z1](15_F2-r_muse_hash_j124_375-376_z1.png) |
| 01 | F1-lost | muse_hash | j0 0-1 (theta 1.476), V (23.267, 10.519) | 0.043h / 0.043h / 0.043h | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 0; play 0 | [z4](01_F1-lost_muse_hash_j0_0-1_z4.png) [z1](01_F1-lost_muse_hash_j0_0-1_z1.png) |
| 02 | F1-lost | muse_hash | j36 109-110 (theta 1.804), V (29.742, 20.159) | 2.721h / 2.721h / 2.721h | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 0; play 0 | [z4](02_F1-lost_muse_hash_j36_109-110_z4.png) [z1](02_F1-lost_muse_hash_j36_109-110_z1.png) |
| 03 | F1-lost | muse_hash | j155 471-472 (theta 0.933), V (9.337, 9.011) | 0.120h / 0.120h / 0.120h | 2 (lost 0, gained 0, max 0, far 0); play 5, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 2; play 5 | [z4](03_F1-lost_muse_hash_j155_471-472_z4.png) [z1](03_F1-lost_muse_hash_j155_471-472_z1.png) |
| 04 | F1-lost | muse_hash | j156 475-473 (theta 0.950), V (8.708, 8.924) | 0.125h / 0.125h / 0.125h | 2 (lost 0, gained 0, max 0, far 0); play 5, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 2; play 5 | [z4](04_F1-lost_muse_hash_j156_475-473_z4.png) [z1](04_F1-lost_muse_hash_j156_475-473_z1.png) |
| 05 | F1-j62 | muse_hash | j62 189-187 (theta 2.032), V (29.091, 23.936) | 2.438h / 2.438h / 2.438h | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 0; play 0 | [z4](05_F1-j62_muse_hash_j62_189-187_z4.png) [z1](05_F1-j62_muse_hash_j62_189-187_z1.png) |
| 16 | extra-tip | muse_hash | j131 397-398 (theta 1.630), V (28.594, 9.559) | 3.183h / 3.183h / 3.183h | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 0; play 0 | [z4](16_extra-tip_muse_hash_j131_397-398_z4.png) [z1](16_extra-tip_muse_hash_j131_397-398_z1.png) |
| 17 | extra-tip | muse_hash | j99 301-299 (theta 2.003), V (14.105, 14.474) | 2.518h / 2.518h / 2.518h | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 0; play 0 | [z4](17_extra-tip_muse_hash_j99_301-299_z4.png) [z1](17_extra-tip_muse_hash_j99_301-299_z1.png) |
| 18 | extra-tip | muse_hash | j73 222-220 (theta 1.309), V (5.355, 14.738) | 0.297h / 0.297h / 0.297h | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 0 (lost 0, gained 0, max 0, far 0); play 0, far 0 | 0; play 0 | [z4](18_extra-tip_muse_hash_j73_222-220_z4.png) [z1](18_extra-tip_muse_hash_j73_222-220_z1.png) |
| all | | | | | 423; play 546 | 48; play 48 | 384; play 507 | |

## Reading the rows

- F2 sites (06-15): S1g's root gate (flat band 0.5h) shrinks r at corners whose feet sit near an arm's root (4.000h to
  0.678h at 06, 2.000h to 0.03-0.08h at 12-15); the ink moves by at most 1 device px from S1f's edge. K1163's tip band
  (about 0.005h at rows 12-14, 0.01-0.12h at rows 06-11, 0.31h at row 15) leaves those feet clear, so tip's ink is
  S1f's again at rows 06-14; row 15's foot sits 0.06h from its root at 127 degrees, the case the gate exists for, and
  its round comes back only part way (see `pairs.txt` for its r).
- F1 sites (01-05, 16-18) and the rest: the root gate is saturated or absent in both bands, so flat and tip agree there;
  what S1i restored (the d-edge) is unchanged.
- The check: with the root gate off (`FormB({rootBand: 0})`), every site's ink is S1f's exactly, 0 px at both windows
  (`../sites_k1163_after_rb0.txt` in the gate outputs). At gate699's angle (theta = 2.0) tip and flat are bit-identical,
  so gate699's steps (r 0.030h, ink about 0.127) are the flat band's, unchanged.
- Regenerate: `node .claude/probes/K1040/s1/s1i_mk_pair.mjs`, then `npx.cmd vite-node .claude/probes/K1040/s1/k1163_pair.ts`. Scenes and
  `sites.json` are read in place from the main checkout (`.claude/probes/K868/scenes`, `.claude/probes/K1040/s1/out/s1h/`).
