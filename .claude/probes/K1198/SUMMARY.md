# K1198 Run G (Muse batch 20, 20G): Plc1m measured, ij's dropping step found

Nothing lands. No file under `.claude/probes/K863/` changed, no `src/`, `test/`,
`scripts/` or `docs/` file changed; everything below is in this folder
(`.claude/probes/K1198/`, `git add -f`). Ports 5810-5819 unused: no server, no
browser, no timing, no perf lock. Python: the kit's
`.claude/probes/K863/trace/venv\Scripts\python.exe -I -B`, from the trace
folder, `K926_FINAL_E=shear`, `K1009_PINS` cleared, at most 4 processes.

## Copies and read-only inputs

Copied from `.claude/probes/K863/trace/work32/dbg/` (each copy's header names
its change): `mk_ports_k1112cusp.py`, `probe_k1112cusp.ps1`,
`probe_sum_k1112cusp.py`, `checks_k1112cusp.ps1`, `pairs_k1112cusp.py`,
`rows_same_k1112cusp.py`, `locality_k1112cusp.py`. The census/side tools the
checks call, copied the same way: `census_k1027.py` (from `work27/dbg/`),
`sum_k1113.py` (from `work29/dbg/`), `side_k1112c.py` (from `work31/dbg/`).
Plus this run's `ij_diag_k1198.py` (task 4's diagnostic).

Retargeting: the copies' outputs and the ports file land here; the base stays
the main checkout's `work31/base` and J3h's ports
(`work31/ports_k1112c.json`, Pc10) stay read-only inputs in the trace, as do
`work29/dbg/solves_k1113.py` (the solver, run in place), the font, `tools/`,
`work26/dbg/`, `work27/dbg/` and J3i's on-record files (`work32/census_v71.json`,
`census_v72.json`, `census_v72b.json`, `work32/probe/lowcusp_*.json`,
`side_v72*.txt`). The census for Plc1m ran on `work31/base` with this folder's
ports; J3i's census used `work32/base`, byte-identical bodies (J3i checks det).

Rerun: `pwsh -NoProfile -File .claude\probes\K1198\probe_k1112cusp.ps1 Plc1m`,
then `pwsh -NoProfile -File .claude\probes\K1198\checks_k1112cusp.ps1 -Cand Plc1m census cmp locality side`.
(One earlier census in this folder was discarded and rerun: a first invocation
bound the step list to `-Cand`, so it censused the letters-only fallback; its
outputs were deleted before the rerun above.)

## Plc1m (B = 1 u, maxfev 8000 on the cusp records)

Made by the copied `mk_ports_k1112cusp.py`: `ports_k1112cusp.json` = J3h's
Pc10 plus Plc1, Plc2, Plc3, Plc1m, Plc2m, Plc3m; Pc10/Plc1/Plc2/Plc3/Plc2m/Plc3m
verified record-for-record identical to the kit's file. Plc1m: every cusp
entry (i j p r s t u w y) stretch [1, hi], maxfev 8000; r's after_high as J3i.

| measure | v7.1 (Pc10) | Plc1m (B=1) | v7.2 (Plc2m, B=2) | v7.2b (Plc3m, B=3) |
|---|---|---|---|---|
| solves (72 pairs) | 71, 4 MAXFEV | 71, 0 MAXFEV | 71, 0 MAXFEV | 71, 0 MAXFEV |
| at lower bound | 22 (+ej upper) | 22 | 24 | 34 |
| side below -0.05 u | 0 | 0 (lowest fw -0.0128) | 0 (fw -0.0134) | 0 (cw -0.0120) |
| census hooks / spikes / rough FAIL | 50 / 77 / 147 | 50 / 77 / 147 | 50 / 77 / 147 | 50 / 77 / 147 |
| undesigned seams (718 pieces) | 29 | 6 (q word-ends only) | 6 | 6 |
| over budget | 399 | 399 | 400 | 400 |
| ci dmax (budget 2.5 u) | 1.20 | 2.31 | 3.79 | 4.99 |
| cr dmax | 3.40 | 4.01 | 6.02 | 8.25 |
| cs dmax | 2.75 | 4.04 | 5.43 | 6.89 |
| cy dmax | 2.52 | 2.98 | 3.46 | 3.97 |
| er dmax | 7.54 | 8.72 | 10.07 | 11.71 |
| es dmax | 5.91 | 7.29 | 7.63 | 8.52 |
| locality (untouched 2000 pieces) | - | PASS, 0 differ, data 0 differ | PASS | PASS |

Solves in detail (`probe/lowcusp_Plc1m.txt`, `lowcusp_sum_Plc1m.txt`): all 71
status 0; Plc1's five MAXFEV solves at the 3000 budget (as, ei, et, eu, hs)
converge under the m budget at 4075, 4679, 3008, 3165, 4188 evaluations;
mean J 0.0002783 (Plc1's, unchanged for solves that converged within 3000).
Per key pair (attach s u, evaluations, Plc1m side_min): ci 1.00 BOUND 568,
0.0045; cr 1.00 BOUND 909, 0.0101; cs 1.00 BOUND 1016, 0.0066; cy 1.00 BOUND
1634, 0.0022; er 1.00 BOUND 903, 0.0037 (v7.1 MAXFEV; v7.2 1168, v7.2b 3827);
es 1.53, 1748, 0.0008 (v7.2 2208, v7.2b 4394). Census pair rows:
`census_pairs_k1112cusp.txt`; flag changes v7.1 -> Plc1m are the 23 seam
removals plus one already-spiked tail (`it` tail0t, spike samples 18 -> 19;
the spikes count, pieces with spikes, stays 77). Side: `side_Plc1m.txt`,
71 cusp entries, 0 below -0.05 u (lowest fw -0.0128, cw -0.0092, et -0.0062).
Locality: `locality_k1112cusp.txt` - only the rule's joins, their right
letters' first strokes and the words holding them move, as J3i's did.

Reading: **Plc1m is a candidate for the landing stage** - a third measured
reading beside v7.2/v7.2b for Levi's pick, not a landing. It clears the seam
class like B=2 and B=3, with fewer bound solves (22 against 24 and 34), every
named pair nearer the font, and ci back inside its 2.5 u budget (the over
count stays 399, where v7.2/v7.2b rise to 400). The pick, and K1197, still
decide what ships.

## ij: the dropping step

Found (`ij_diag_k1198.py`, output `ij_diag.txt`; assembled under Pc10 and
under Plc2m on `work31/base`, the kit's own `gen_k1027.assemble` path that
`solves_k1113.py` calls). Neither port is missing: i's exit is a merge port
(stretch [0, 10]) and j's entry a cusp port ([0, 20] under Pc10, [2, 20] with
maxfev 8000 under Plc2m); no ij pin exists. The join is dropped one step
earlier, at shaping: HarfBuzz (the kit's `Font.shape`, default features;
`feats_for` sets only ss02 on p) shapes the text "ij" as the single ligature
glyph `ij.jmc` at cluster 0. `assemble` therefore places one letter
(ch 'i', glyph `ij.jmc`) and its pair loop never runs - `joins []`, one tail,
under both variants. `solves_k1113.py` then skips the pair
(`if not A["joins"]: continue`), which is the "(no row)" in every
`lowcusp_*.txt` and in the census (word ij holds only its tail row).
Controls in the same run: ii solves (port), aj solves (port), ji takes the
preset path (j has no exit port) - the machinery works; only ij never
reaches it.

Reading: **measured-only.** No join was built: whether i needs a port, a
body or a rule change (e.g. shaping without the ij ligature for pair words)
is Claude's call from this table, in K1197's stage order.
