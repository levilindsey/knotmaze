## K863 J3n: b, v, w exits more downward; shorter, lower f and p word-end tails

J3n (Levi, 2026-11-09, on J3M: "bvw exits should be a little more downward. Word-end tails: f seems too long, too
upward, and too bumpy; p seems too long and upward. Oqa seem fine."): b, v and w turn a little more downward out of
the cusp than J3m's -22.5 deg, at a word's end and into a letter that enters high, keeping the cusp, the gradual swoop
and the low-entry form; f's word-end tail shorter, rising less steeply and smooth, keeping the spur down beside the
stroke to the baseline; p's word-end tail shorter and rising less steeply; o, q and a as they are, J3M everywhere
else. Built as one pick, J3N (`work38/cand/J3N`), and one variant, J3NV (`work38/cand/J3NV`), both J3M's join_params
(`work37/cand/J3M`) with the "k863m" block replaced by a new spec, through `gen_k863n` (gen_k863m with its own fit
cache, `work38/cache_k863n.json`; nothing else differs). Nothing in `src/` or `test/`; no body and no per-pair data
(K1112): each form is a letter's word-end form or its exit by the next letter's entry class. Stage agent
a3cab4505b6b75ecb of Claude session 01SUPGULDxvE5gKXozfaFaFG, started 14:26:45 on 2026-11-09, cap 16:26:45. Brief
`docs/design/K863_cursive_j3n.md` (branch `worktree-agent-a3cab4505b6b75ecb`, which holds copies of the tools, the
specs, both candidates' join_params and this entry). Everything below is under this folder. Rerun everything:
`$env:K863N_SPEC = "work38\k863n_v2.json"; $env:K863N_VAR_SPEC = "work38\k863n_var2.json"; pwsh -NoProfile -File
work38\dbg\checks_k863n.ps1 [step ...]` (steps cand, local, cens_c, climb, sheets, words, png; no step = all, in
order; logs in `work38\checks_logs`; `K926_FINAL_E=shear`, `K1009_PINS` cleared; without `K863N_SPEC` it builds v1,
without `K863N_VAR_SPEC` no variant). Then `pwsh -NoProfile -File work38\dbg\censplit_k863n.ps1` (and with `-Cand
work38\census_J3NV.json -Params work38\cand\J3NV\join_params.json -Out work38\census_split_var.txt` for the variant).

The specs (`work38/`; each is the whole "k863m" block):
- `k863n_v1.json`: J3M's block with b, v and w's fin start and high-exit start at -33.75 deg (J3M: -22.5), J3M's fin
  ends; f's and p's new tails (below); o's fin and the low exits J3M's. The b, v, w tail came out only 1.2 u lower
  than J3M's: with the end frame fixed the corner's turn is absorbed within a few u.
- `k863n_v2.json` (J3N, the pick): v1 with b, v and w's fin ends 15 fu lower (b (675.6, 479.2), v (663.8, 479.4),
  w (949.3, 479.0) fu), so the whole tail sits lower, not only its first few u.
- `k863n_var.json` / `k863n_var2.json` (J3NV, the variant, var2 = var with b, v, w's ends 25 fu lower than J3M's):
  b, v, w at -40 deg (fin and high exit); f's end (386.7, 30) at 25 deg; p's end (545.8, 84) at 32 deg.
Every tail's and join's prm is fitted at build time (J3m's fit); the cache only saves time.

What changed, per letter (J3N against J3M, the variant in brackets; lengths along the centreline, the ink 9.2 u):
- b, v, w at a word's end: the corner leaves at -33.75 deg [-40] (J3M -22.5) and swoops up to 30 deg as before; the
  end about 165 fu right of the point and 30 fu below it [40] (J3M 15). Length 43.5 u [44.8] (J3M 41.9), lowest point
  110.4 u [108.0] (J3M 114.2), kmax 0.050 /u [0.053], no curvature sign change.
- b, v, w into a high letter: the corner at -33.75 deg [-40], the fairest G2 quintic to J3M's entry frame (the join
  ends 0.00 fu from J3M's). Over all high pairs (`work38/climb.txt`, J3N only): drop 18.3 u [12.5, 29.8] (J3M 14.4,
  v6.8 22.8), lowest point 103.9 u (J3M 107.8, v6.8 99.4), bow 0.091, kmax 0.067 /u (J3M's). Into b f l: drop
  18.4 u (J3M 11.0, v6.8 35.2), lowest point 103.8 u (111.2, 87.0), bow 0.135, kmax 0.030 /u.
- b, v, w into a low letter (e h k r s): J3M's, piece for piece (into r: drop 49.4 u, lowest point 72.8 u, bow
  0.133, no V; into e: drop 65.3 u).
- f at a word's end: cut at (-2, 1), the spur start (rev 0, k 0) runs down beside the stroke to the baseline (ymin 0
  at weight 1e3, lowest point 1.2 u), then turns up to 30 deg [25], ending at (376.7, 50) fu [(386.7, 30)] (J3M:
  40 deg, (444.55, 150.67) fu). Length 99.8 u [99.3] (J3M 128.2), no curvature sign change (J3M 1: the bump),
  kmax 0.092 /u [0.049].
- p at a word's end: cut at (-2, 0), leaving with the cut's own G2 frame, rising to 35 deg [32] at (505.8, 94) fu
  [(545.8, 84)]. Length 77.0 u [85.5] (J3M 107.6), run 300 fu [340] (380), rise 90 fu [80] (190), end angle 35 deg
  (55). Tail running 9.2-18 u from the bowl (a thin sliver of paper): 14.8 u [24.8] (J3M 45.2).
- o, q, a and every other letter: J3M's.

The tools (`venv\Scripts\python.exe -I work38\dbg\<tool>`, from this folder; each header has its usage), all
copies of J3m's (untouched) except try and censplit:
- `gen_k863n.py`: gen_k863m with its fit cache in work38. `census_k863n.py`: census_k863m with work37/dbg on the
  path. `sheet_k863n.py`: sheet_k863m through gen_k863n.
- `local_k863n.py`: the candidate against J3M over the 232 test words, piece by piece; the spot is only what the
  spec CHANGES against the base's k863m block (a fin letter whose form differs, an exit class whose form differs).
- `climb_k863n.py <out.txt> [letters]`: v6.9's three flaws on the joins out of b, v and w, for v6.8, J3M and J3N.
- `try_k863n.py <build dir> <letter> <form.json | JSON> ... [--skip u]`: a fin form tried on one letter alone,
  without a candidate: length, run, rise, start and end angles, lowest point, curvature range and sign changes,
  largest dk/ds, clearance from the letter's own stroke, and the fused and sliver lengths.
- `censplit_k863n.ps1`: the census split, J3N's rows against J3M's; its spot is the changed forms only.
- `checks_k863n.ps1`: every step above but censplit. Crops: J3m's `work37\dbg\wordcrop_k863m.ps1` (with `&`).

Checks:
- Locality (`work38/local_J3N.txt`, `local_J3NV.txt`; 232 words, 148 port pairs): 116 pieces in the spot differ, in
  99 words (strokes 0, joins 72, fin tails 44: b 6, f 6, p 13, v 6, w 13); 0 outside it. The same for the variant.
- Census split (`work38/census_split.txt`, `census_split_var.txt`; 330 rows in each of J3M and J3N over the changed
  words): in the spot 116 rows (72 high joins, 44 tails), all changed; outside it only kmax_p95 (205 rows; variant
  212) and spikes (1 row) move, both scaled by the word's p95 curvature. Check ok for both.
- The 116 rows in the spot, J3N and J3NV: spikes 0, hooks 0, rough ok in all.
- `work38/census_cmp.txt` compares each build with v6.8's rows (its "spot" is J3k's q tails, as in J3m).

Sheets (`out38/*.svg`, PNGs at 144 dpi (3x) in `out38/png/`; font | approved (v6.8) | J3M | J3n | J3n variant, inked
at 9.2 u; the words sheets without the variant): `k863n_bvw_end.png` (b, v, w word ends), `k863n_f_end.png`,
`k863n_p_end.png`, `k863n_ref_end.png` (o, q, a word ends, unchanged), `k863n_b_high.png`, `k863n_v_high.png`,
`k863n_w_high.png` (into every high letter), `k863n_bvw_low.png` (into e h k r s), `k863n_words1..8.png` (the 232
test words). Show first: bvw_end, f_end, p_end. Crops viewed at full size, all in `work38/crops/`: `v2_bvw_end_1-4`,
`v2_f_end_1-3`, `v2_p_end_1-3`, `v2_ref_end_1-2`, `v2_b_high_1-5`, `v2_v_high_1-3`, `v2_w_high_1`, `v2_bvw_low_1`
and `_3`, `z3v2_bvw_b`, `z3v2_bvw_v`, and the tiled words `v2_words1_1/2/3/6/13`, `v2_words2_6`, `v2_words6_3` (wordcrop
`-Tile -Width 630`). Every spot reads as Levi described: b, v and w turn visibly more downward out of the cusp, well
short of v6.8's hook, and still swoop up gradually; f's tail is short and smooth, the spur down to the baseline kept;
p's tail is shorter and lower; o, q and a unchanged; the low joins identical to J3M's.

Spots to name to Levi (each is what the rule gives, none is per pair):
- The high joins dip about 4 u more than J3M's (drop 18.3 u against 14.4): into the round letters J3m's check-mark
  becomes a gentle hammock; into m, n, v, x the small wave stays, a little deeper; into p, u, y a flat hammock.
- f's bottom turn is the tightest of the tails (kmax 0.092 /u; the variant's flatter end, 0.049).
- p's tail still runs close under the bowl for 14.8 u before it parts (J3M 45.2): it leaves the bowl's bottom nearly
  tangent, so some sliver is structural.
- J3m's o notch stays (o unchanged).

Left over:
- J3N or J3NV waits on Levi's look (a card), then goes into the kit's build or gets adjusted.
- climb.txt measures J3N only, not the variant's high joins (they dip a little more, as the crops show).
- J3m's leftovers on o (the notch, its rough FAIL) stand.

Levi's pick (K1251, 2026-11-09): the variant everywhere (b, v and w at a word's end and into high-entry letters, f,
p). The kit's build is J3NV (`work38/cand/J3NV`, spec `work38/k863n_var2.json`); the next stage builds on its join_params.
