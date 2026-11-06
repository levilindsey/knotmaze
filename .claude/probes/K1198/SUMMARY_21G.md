# K1198 Run G (Muse batch 21, 21G): Plc1m sheeted, ij without the ligature

Nothing lands in the ports. No file under `.claude/probes/K863/` changed (checked:
no trace file written after the run started), no `src/`, `test/`, `scripts/` or
`docs/` file changed; everything below is in this folder (`.claude/probes/K1198/`,
`git add -f`). Ports 5870-5879 unused: no server, no browser, no timing, no perf
lock. Python: the kit's `.claude/probes/K863/trace/venv\Scripts\python.exe -I -B`,
`K926_FINAL_E=shear`, `K1009_PINS` unset except the pin test, at most 4 processes.
New tools are copies retargeted to this folder (`sheet_21g.py` from
`work27/dbg/sheet_k1027.py`, `census_21g_off.py` from 20G's `census_k1027.py` with
the one calt-off change); the solver `work29/dbg/solves_k1113.py`, bases, font and
J3i's on-record censuses stayed read-only inputs in the trace.

## Task 1 — Plc1m's sheet and missing numbers

Sheets (`sheets21g/`, drawn by `sheet_21g.py`; columns in Run A's order — font,
v7.1 (work31/base, Pc10), v7.2 (work32/base, Plc2m), Plc1m (work31/base, this
folder's ports); PNGs beside the words and ij sheets):

- `sheets21g/cusp_Plc1m.svg` (+ `.txt`, `_sidecar.json`): the 72 low-exit pairs
  into a cusp window (acdefhin × ijprstuwy), J3i's `cusp_v72.svg` set.
- `sheets21g/c_Plc1m.svg`: c and ca–cz, J3i's `c_v72.svg` set.
- `sheets21g/words_Plc1m.svg` (+ `.png`): the 11 census words the rule moves,
  J3i's `cursive_v72_words.svg` set.

The ij row is task 3's case: the font cell is the `ij.jmc` ligature, and no hand
draws an ij join (the sidecars read `ij | v7.1/v7.2/Plc1m: []`; the cells draw
only the single placed letter and its tail).

Four distances (`extract_21g.py`, `distances_21g.txt`; dmax of the pair word's
join, v7.1/v7.2 from trace work32 censuses, Plc1m from `census_Plc1m.json`):

| pair | v7.1 | v7.2 | Plc1m |
|---|---|---|---|
| ai | 9.83 | 8.61 | 9.18 |
| ar | 15.68 | 14.39 | 15.04 |
| ei | 13.17 | 9.43 | 8.63 |
| ni | 9.03 | 7.47 | 7.47 |

v7.2 is nearer than v7.1 on all four (Run A's expectation holds). Plc1m is nearer
than v7.2 only on ei (−0.80 u); it is farther on ai (+0.57), ar (+0.64) and ni
(+0.0006, a tie at two decimals). Means over the four: v7.1 11.93, v7.2 9.98,
Plc1m 10.08 — on these four Plc1m averages 0.10 u farther than v7.2, against
20G's six (ci, cr, cs, cy, er, es) where Plc1m is nearer on every one.

fr/fs pins (`pins_21g.py`, `pins_21g.txt`; probe form run with the env set
directly — PowerShell strips the JSON quotes on the way to `pwsh`, see the
script header; shape hash = SHA-256 of the join's cubic coefficients): the pins
change both shapes under Plc1m. With pins, fr attaches at 2.00 u (hash
b17b35bf21000606, dist 6.34 u, side 0.0140, 5664 evals) and fs at 2.00 u
(5158330ef0078be1, 9.36 u, 0.0093, 2709); without, both attach at the rule's
1.00 u bound (fr ee2960079d95e100, 5.30 u, 0.0020, 2582; fs 180a47a845e63513,
9.38 u, −0.0009, 4188). So under Plc1m the pins are not the v7.2 no-op: they
hold fr/fs 1 u farther out; fr's font distance improves 1.03 u without them,
fs's worsens 0.01 u. The only census words holding the pairs are the pair words
themselves.

Largest word moves (20G's `locality_k1112cusp.txt`, parsed in
`distances_21g.txt`): under Plc1m the largest touched joins are it at 9.824 u
(in hit, fruit and the pair it), fi at 9.785 u (the pair fi), ei at 8.152 u,
then fi at 8.076 u in first and fifty. So hit and fruit still lead; first and
fifty no longer do — the pair words it and fi sit above them. (J3i: v7.2's lead
was fi 8.08 u in first/fifty, v7.2b's it 9.82 u in hit/fruit.)

## Task 2 — every ligature pair

`ligature_21g.py` (outputs `ligature_21g.txt/.json`): all 676 ordered lowercase
pairs shaped as words through `trace_k879.shape` with `feats_for`. Exactly one
pair ligates: ij → `ij.jmc`. The feature is `calt` (GSUB ligature lookup 26,
i.mod + j.jmc → ij.jmc, filed under calt in this font — there is no `liga`
feature; liga/clig/dlig/hlig/rlig/ccmp/ss02 off singly all leave `ij.jmc`,
calt off splits it to i.mod + j.jmc). `feats_for` did not make it (it opens only
ss02 on p; ij has no p, and bare shaping ligates too). Shaping the census corpus
(234 checks strings, plus the census rows' words) the same way, no word is short
of glyphs except ij itself, which holds the listed pair — no longer ligature.

## Task 3 — the hidden joins through the ports

Shaping with `calt` off for every word (the one rule, no per-pair data;
`census_21g_off.py` wraps `feats_for`, and `gen_k1027` shapes through it) exposes
exactly the join task 2 hid: `ij`. Through the ports it solves under both hands
(`ij_sheet_21g.py`; sheet `ij_Plc1m.svg`/`.png`, numbers `ij_Plc1m.txt`, font
column shaped normally so its ij cell is the ligature; ii/aj/ji ride as labelled
controls):

- Plc1m: solved, hash b7f3c5c5137c3f6f, attach 3.2009 u in [1, 20], status 0
  (716 evals), side 0.0010 u; census row `w220:ij:J0-1ij` (port-cusp), both
  seams G2 (gaps ≤ 2.4e-13 u, angles 0, dk ≤ 5.7e-16 /u).
- v7.2: solved, hash 4f5155d5b8327eda, attach 3.9717 u in [2, 20], status 0
  (713 evals), side 0.0014 u; seams G2 likewise.

The join itself is sound. The rule around it is not: `calt` also selects every
joining form (ini/med/fin glyphs and the cnct connectors), so off everywhere the
full censuses (`census_Plc1m_off.*`, `census_v72_off.*`, same 234 strings as
20G) read 719 pieces (the ij join is the +1) with every one of the 334 joins'
font distances undefined — there is no font connector left to measure against.
Locality fails by construction: all 234 census strings' shapings move, none is
steady (`gates_21g.py` shaping screen), so the sheet draws the hidden join and
its controls, and `gates_21g.json` holds the moved list (all of them). Pair ij is
therefore reported as failing the gates' standard at census level — font
distance, over-budget and locality — while passing solve, seam and side. No
geometry was invented: both ij shapes are the ports' own solves. A narrower
rule would need per-pair data, which the brief forbids shipping; nothing lands.

First attempt note: the 07:33 off-censuses crashed in `variant_rows`
(StopIteration: the e-variant medial glyphs exist only with calt on) after
measuring every word and writing nothing. The copy now shapes those two font
rows normally (see its comment) and the 07:46 reruns above are the record.

## Tasks 4–5 — gates against 20G, determinism

One table (`gates_21g.py`, `gates_21g.txt/.json`; bench = 20G's
`census_Plc1m.txt/.json`, `census_cmp_v71_Plc1m.txt`, `locality_k1112cusp.txt`,
`side_Plc1m.txt` — side bench: none below −0.05 u, lowest fw −0.0128 u):

| gate | bench Plc1m on | Plc1m off | v7.2 off |
|---|---|---|---|
| pieces / joins | 718 / 333 | 719 / 334 | 719 / 334 |
| hooks | 50 | 49 | 49 |
| spikes | 77 | 76 | 76 |
| rough FAIL | 147 | 147 | 147 |
| undesigned seams | 6 | 6 | 6 |
| over budget | 399 | 193* | 193* |
| joins with a font distance | 333/333 | 0/334 | 0/334 |
| side below −0.05 u (cusp pairs) | 0 | 0 (min −0.0153) | 0 (min −0.0141) |

*Off over-budget counts only leads/tails/variants (all joins are nan), so it is
not the bench's gate. Task 1's pair rows in both hands are `distances_21g.txt`
and the sheets' reports (Plc1m dists there match the bench census, e.g. ai
9.18 u). First divergence bench → off: by row id, `w100:bu:J0-1bu` exists only
off (join IDs lose the connector index, J0-2 → J0-1); by (word, pair), `after`'s
af join, dmax 6.32 u → nan. Determinism (task 5): the census corpus ran twice
under Plc1m calt-off (`census_Plc1m_off` vs `census_Plc1m_off2`) — txt and json
byte-identical (SHA-256 txt 73287907e1a0d9b8, json 894cb964bde8b949 in both; the
artifacts carry no timers, so this is stronger than modulo timers), first
divergence none; the ligature list ran twice byte-identical (txt
f99dec6c8cc6811a, json 3c8bc2a138a5330b; run-1 copies kept beside them).
