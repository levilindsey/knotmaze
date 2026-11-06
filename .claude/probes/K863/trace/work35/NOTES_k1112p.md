## K1112 m u (Run P)

Muse batch 22 Run P (22P): m's and u's exits on one port each, measured against v6.8's joins (K1112).
Brief `docs/design/K1112_run_p_ports_m_u.md`. Run 2026-11-05, started 16:04:31 -08:00, cap 18:04.
Everything below is under this folder (`.claude/probes/K863/trace/`); probes only, nothing in `src/` or
`test/`. The tools are `work35/dbg/*_k1112p.*`; J3d's census, sheet and generator, J3f's solves, J3h's
side test and J3k's word lists run through this run's copies (made by `work35/dbg/mk_tools_k1112p.py`);
`work34/base` is v6.8's bodies and every candidate uses them, so no template or body moves. Rerun
everything: `pwsh -NoProfile -File work35\dbg\checks_k1112p.ps1 [step ...]` (steps tools, ports,
census, gate, calib, locality, solves, side, det, tables, sheets, png, crops, guard, summary; no step
= all, in order; logs in `work35\checks_logs`; `K926_FINAL_E=shear`, `K1009_PINS` cleared). The det
step's second census was also run beside the second candidates' censuses and hash-checked there; the
step reruns it. At most 4 Python processes at a time.

The tools (`venv\Scripts\python.exe -I work35\dbg\<tool>`, from this folder; each header has its usage):
- `mk_ports_k1112p.py [m=<L> u=<L>]`: `work35/ports_k1112p.json` = `work28/ports_k990e.json` with new
  variants, each M plus exit records and nothing else (no pins, no hints, no per-pair data): Pm10 (m's
  exit = n's record: a merge at the end node, stretch [0, 10] u), Pu10 (u's = i's, the same record),
  Pmu10 (both), and the second candidates Pm2, Pu2, Pmu2_2 (stretch [0, 2] u, task 5).
- `dist_k1112p.py <out.txt> <out.json> <words> <build>...`: the gate's measure (symmetric Hausdorff
  distance between a candidate's drawn join centreline and v6.8's, in u; the mean; where the largest
  sits) and, with c's builds, the calibration on c.
- `locality_k1112p.py <out.txt> <variant> <words file>`: J3h's locality for m/u (touched: m's and u's
  strokes, the joins out of them, their tails, the next letter's stroke 0).
- `census_k1112p.py`, `sheet_k1112p.py`, `solves_k1112p.py`, `side_k1112p.py`: the copies above.
- `tables_k1112p.py`: per-pair font distance and census flags beside v6.8's, and the census counts
  (undesigned seams with g2 reading `ang_deg`, K1212).
- `overlay_k1112p.py`: the overlay sheet. `crops_k1112p.py`: the 3x crops. `sum_k1112p.py`: writes
  `work35/SUMMARY.md`.

### The gate (tasks 1-3)

On J3i's 232 words plus ma..mz and ua..uz (284 words; `work35/census_*.json`, 829 pieces), through the
census and `dist_k1112p.py` on the 60 words holding a join out of m or u (65 joins):

- m, Pm10 ([0, 10]): FAIL. Every pair over 1.0 u: smallest mv 2.95, mean of per-pair largests 11.72,
  largest mt 34.15 (`mt` at arc 214.09 u). Five largest: mt 34.15, me 29.99, ml 18.12, mf 17.79,
  mr 17.35.
- m, Pm2 ([0, 2]): FAIL. Smallest mq 2.56, mean-largest 11.03, largest mt 34.06. The closer of the two.
- u, Pu10 ([0, 10]): FAIL. Smallest un 2.43, mean-largest 11.62, largest ut 33.53. Five largest:
  ut 33.53, ue 29.99, ul 18.12, uh 17.16, ur 17.10.
- u, Pu2 ([0, 2]): FAIL. Smallest un 2.44, mean-largest 11.21, largest ut 33.94. The closer of the two.
- Pmu10 and Pmu2_2 fail on both letters with the single-letter candidates' numbers to the last digit.
- Where the [0, 10] candidates differ: the largest sits at the join's start (arc 0.00 u, 9.79 u) in
  11 pairs per letter (the exit attaches at the 10 u bound) and mid-join in the rest (me/ue 29.99 u at
  arc ~104 u, mt/ut ~34 u at arc ~213 u). The [0, 2] second candidates remove the arc-0 largests
  (fused pairs ma, mg, mq fall to 2.6-3.0 u) and leave the mid-join ones. One change per letter, no
  pin, no per-pair data (task 5). Neither passes, so both letters keep their presets.
- Calibration on c (`work35/dist_calib_c.txt`): J3h's v7.0 presets against v7.1 (Pc10) by the same
  measure: smallest cy 2.77, mean-largest 12.71, largest ct 34.20; no c pair within 1.0 u (0 of 26).
  The gate reads on m and u as it reads on the port Levi turned down (K1197).
- Census counts (829 pieces; hooks, spikes, rough FAIL, undesigned seams, over budget): v6.8
  105, 149, 213, 27, 357. Per single letter (Pm10, Pu10, Pm2) 105, 149, 211, 31, 383-385 (Pu2 seams
  32); both exits 105, 149, 209, 35-36, 409-414. Hooks and spikes do not rise; rough falls; undesigned
  seams rise by 4-5 per letter, the port-cusp class c added. Font distance per pair is in
  `work35/tables.txt` and `SUMMARY.md`.

### The checks (task 4)

- Locality: PASS, all six candidates: 1348 untouched pieces each, 0 not byte-identical
  (`work35/locality_*.txt`).
- Solves (`work35/solves.txt`): Pm10/Pmu10 me and Pu10/Pmu10 uf stop at maxfev (status 1, 3000 of
  3000); Pu2/Pmu2_2 um and us the same; Pm2 converges on all 26 pairs. All other solves converge.
- Side test (K991, `work35/side.txt`): PASS, 72 entries over the builds, none below -0.05 u
  (lowest uw 0.0002 u).
- Determinism: the second census of Pmu10 in `work35/det/` is byte-identical to the first (JSON
  SHA256 920BEA917EB36E18..., text DBB11131A102924A...).
- Guard: `work20/dbg/check_out_k990.py out35` ALL CLEAN (three vector SVGs).

### Sheets and crops (task 6)

`out35/m_v68.svg`, `out35/u_v68.svg` (font | approved (v6.8) | the letter's candidates | Pmu10; the
letter alone, its 26 pairs and the census words holding one) and `out35/overlay_v68.svg` (the font's
fill in light grey; v6.8 black, Pm10 red, Pu10 blue, Pmu10 purple, same axes), PNGs at dpi 48 in
`out35/png/`. Crops at 3x (dpi 144) in `work35/look/`: the five largest pairs per per-letter candidate
(`crop_Pm10_mt` etc.) and two mid-word joins per letter (`crop_mid_m_minimum`, `crop_mid_m_jumps`,
`crop_mid_u_cursive`, `crop_mid_u_jumps`). Measured, not judged: no candidate passes the gate, so
nothing here picks a look; Claude views the sheets, then Levi, beside v6.8.

Written 2026-11-05 ~17:45 -08:00, inside the cap.
