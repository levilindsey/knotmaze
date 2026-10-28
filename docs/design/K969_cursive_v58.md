# K969: Cursive v5.8, the last bumps before Levi's review (agent brief)

Stage brief (coordinator, 2026-10-28). Parent: K863
(`docs/design/K863_trace.md`; its `## Levi's calls` bind every stage).
Previous stage: v5.7 (`docs/design/K965_cursive_v57.md`). Read its
`## Handoff`, and `NOTES.md` `## v5.7` in `.claude/probes/K863/trace/`,
before anything else.

## Why

Levi's order (K928, 2026-10-27): the curves get smoother, Levi reviews,
the pipeline learns to read Levi's edits as drawn (K944), then Levi
hand-edits, and after that the pipeline does not change the bodies. So
every smoothing has to land before Levi's review.

v5.7 brought every stroke but one to or below v5.4's peak, cleared the
ceilings and K960's eye flags, and stays within the distance budget
(2.5 u from the font's axis, 3.0 u inside the junction stretches). What
is left:
- f's hook still peaks above v5.4's (5.21 against 4.29; K963). The
  handoff's untested idea is a clothoid exit reference.
- Small comb bumps (K969): k's crotch ripple, a's corner at its bowl's
  leftmost node and a notch at its bottom right, f's bottom-loop lobe,
  steps at z's top, y's and b's exits. o's exit is still its tightest
  spot (5.08), though under v5.4's 8.54.
- The roughness check reads a one-cubic stroke as 0 (K968), and three
  tools have gotchas (K970).

Levi reviews whichever of v5.7 and v5.8 is newest when they look.

**Coordinator's call (technical, K968):** x stays v5.7's, both strokes.
Its first stroke is one cubic: 2 nodes, true peak 1.53, 0.87 u off the
axis. The rule on true values would take d150e45_t06 (6 nodes, 1.18,
1.63 u), but both peaks are far under the alphabet's tightest (f 5.21),
and fewer nodes serve Levi's hand edits.

## Goal

v5.8 is v5.7 with its last bumps gone:
- f's peak at or below v5.4's 4.29, its hook's nodes spread.
- Each K969 bump gone, or a measurement showing the font's own shape
  needs it at the budget.
- No stroke above its v5.7 peak, no node count up, unless a fix
  elsewhere costs it (explain each).
- Kept from v5.7: the roughness ceilings, no eye flag over 3 except the
  intended corners and cusps, the distance limits (2.5 u, and 3.0 u in
  the junction stretches), x, the e and o ends (K959), the a/g/q stem
  tops at the font's V (K939), the joins G2 with the bodies.

## Order

1. **The tools (K968, K970, K963's tool parts).**
   - `rough`: flush a piece when `len(P) >= 1`. Rerun v5.7's roughness
     check with it and report what changes (x, x2, t2).
   - `eye`: check every letter each label has, not only the letters
     common to every label passed.
   - `fid_cmp`: name the phrase pairs right. `nodes_pairs`: draw z's
     one-cell row.
   - fewnode's G2 tally: don't count g's and q's V corners as joints.
   - The stale `--end-budget` headers in `bodies_k959.py` and
     `bodies_k965.py`'s copies: fix them in your copies.
2. **f's hook (K963).** Try the clothoid exit reference (a run-in of
   about 72 fu), and any better idea the measurements suggest. Choose by
   the checks. Spread the hook's nodes.
3. **The small bumps (K969).** For each one: the cause, then a fix at
   the source (node placement, a local band, a per-letter fair), or a
   measurement showing the font needs it. Soften o's exit only if the
   fix is local and costs nothing elsewhere.
4. **Build v5.8** as v5.7 was built (`work15/dbg/build_v57.ps1`): refit
   the joins on the new end frames, then the rest of the build, in the
   same order. The titles say v5.8. Outputs in `out16/`:
   - `cursive_v58.svg` (the template);
   - `cursive_v58_words.svg` (+ `.png`);
   - `combs_v58.svg`;
   - `cursive_v58_nodes.svg`, as v5.7's;
   - the review PNG, which stays local.
5. **Checks.**
   - Rerun fidelity to the font, `split_check`, the eye check and the
     roughness check. Explain every result that changes, and every
     fidelity change over 0.25 u.
   - Combs at 288 DPI, v5.7 beside v5.8, for every stroke that changed
     and the words "minimum" and "hippo". Crop and look at each.
   - Crop and look at every changed letter at the nodes sheet's scale,
     v5.7 beside v5.8: it still reads as the font's letter. Name any
     that reads differently.
   - The stem tops stay at the V.

Not this stage: K944 (reading Levi's edits as drawn), K962 (the join
seams and the join regressions), K961's remaining node counts unless a
fix lowers them, K946, K948, K949, K937, K950's side-by-side and capitals
(K931).

## Rules

- **Tools and outputs.**
  - New tools are `tools/*_k969.py`, copied from the latest versions.
  - Outputs go in `work16/` and `out16/`, and the record goes in
    `NOTES.md` `## v5.8` with its rerun commands, every label list
    written out.
  - Leave earlier versions' tools and outputs untouched.
- **K930's writer.** Every new curve goes through it: few nodes, G2.
- **Software.**
  - Python: `.claude/probes/K863/trace/venv/Scripts/python.exe -I`.
  - Inkscape: `C:\Program Files\Inkscape\bin\inkscape.com`.
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`).
  - Downloads: none should be needed. If one is, put it in a new, empty
    directory and run Python on it with `-I`.
- **Levi's chart.** `ref/chart.jpg` is never committed, uploaded or
  embedded in an SVG, and the review PNG contains it. Upload nothing: the
  coordinator uploads the SVGs.
- **Tracked files.** Everything lives in the untracked probe directory, so
  there is nothing to commit. The `## Handoff` you append to this brief is
  the coordinator's to commit. `LEDGER.md` is the coordinator's. Don't
  touch other tracked files.
- **Not allowed.** No phone, no timing, no `npm run build` in the main
  checkout, no processes you did not start, and never Levi's Chrome
  profile.
- **Crop and look** at your own renders before you call a visual fix done.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when steps 1-5 are done or 2 h after your start, whichever comes
    first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, if step 4 has not started, build v5.8 from what you
    have and say what is missing.
  - A compaction is not a stop. After one, re-read this brief and
    `NOTES.md` `## v5.8`.
  - On stopping, append a `## Handoff` to this brief, then report.
- **The final report** gives:
  - per stroke, v5.7 against v5.8: node count, roughness, peak |dk/ds|
    (and v5.4's peak) and the largest distance from the font's axis,
    outside and inside the junction stretches;
  - K963, K968, K969 and K970, each: the cause, the fix or why not, and
    a crop;
  - the eye flags and the fidelity changes, each explained;
  - the paths of the outputs and of the crops you looked at;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K863's current handle fields.

## Handoff

Stage agent, 2026-10-28 01:46 to 03:10. Steps 1-5 done; v5.8 built. Record and rerun commands:
`.claude/probes/K863/trace/NOTES.md` `## v5.8` and its `### v5.8 rerun commands`; work in `work16/`, outputs in
`out16/`. New tools: `tools/rough_k969.py`, `eye_k969.py`, `fid_cmp_k969.py`, `nodes_pairs_k969.py`,
`fewnode_k969.py` (hand edits, recorded in NOTES step 1), `fair_k969.py` and `bodies_k969.py`
(`work16/dbg/mk_fair_k969.py`), and the build copies (`mk_tools_k969.py`). Helpers are in `work16/dbg/`:
`fewnode_v58.ps1`, `build_v58.ps1`, `checks_v58.ps1`, `table_k969.py`, `jumps_k969.py`, `assemble_k969.py` and
others.

**What v5.8 is.** v5.7 with six letters rewritten. Every other letter, including o and both of x's strokes, is
v5.7's byte for byte (`cmp_k969.py`).
- f has a new fair, f_c38w10e45: bending length 45 and a hinge on |dk/ds| above 3.8 over the last 200-40 fu of
  the stroke, at 10 times the fair's own weight (`K969_CAP_*` in `fair_k969.py`).
- a, b, k, y and z keep their v5.7 fairs. The few-node writer rewrites them with a new term (`K969_WJ` in
  `fewnode_k969.py`): a second pass over the same nodes that penalises the jump in dk/ds at each node, which is
  the corner the combs show. WJ and tolerance per letter: a 16 / 0.8 u, b 4 / 1.2, k 4 / 1.2, y 4 / 0.6, z 4 / 1.4
  (f: 0 / 1.2).
- Joins refitted (join_k925, `--starts work10/fair_o86`, as in v5.7). G2: gap 4.8e-12 fu, tangent 1.2e-6 deg,
  curvature jump 2.5e-11 /fu.

**Per stroke, v5.7 -> v5.8.** Nodes; peak |dk/ds| (v5.4's in brackets); largest distance from the font's axis,
outside | inside the junction stretches, in u.

| Stroke | Nodes | Peak [v5.4] | Distance out \| in |
|---|---|---|---|
| a | 12 -> 13 | 1.26 -> 1.18 [3.93] | 2.45 \| 2.19 -> 2.12 \| 2.09 |
| b | 12 -> 12 | 1.91 -> 1.91 [11.49] | 1.38 \| 2.20, unchanged |
| f | 14 -> 12 | 5.21 -> 3.85 [4.29] | 2.36 \| 2.64 -> 2.30 \| 2.32 |
| k | 18 -> 18 | 2.24 -> 2.71 [4.10] | 2.00 \| 2.48 -> 1.81 \| 2.52 |
| y | 15 -> 15 | 0.45 -> 0.42 [0.94] | 1.99 \| 1.79 -> 1.97 \| 2.12 (at 245 u, inside a stretch) |
| z | 8 -> 8 | 0.46 -> 0.46 [4.91] | 2.00 \| 1.64 -> 1.88 \| 1.64 |

- Every other stroke is unchanged; v5.7's handoff lists them. Three one-cubic strokes now read their real peaks
  (K968): x 1.40, x2 0.17, t2 0.26.
- Every stroke is within 2.5 | 3.0 u.
- k is the one stroke above its v5.7 peak. 2.71 is its fair's own peak (2.69 at 748 u); v5.7 sat under that only
  because the ripple split the ramp.
- Full table: `work16/fewnode/table.txt`. Its ">v5.4" flag on x2 is K968's artifact: measured correctly, v5.4's x2
  is 0.23.
- Roughness: PASS, 0 of 30 strokes over a ceiling (`work16/rough/check_v58.txt`; nodes median 10, max 21).
  - a, b and k: band +0.01-0.02, wobble +0.0002-0.0004.
  - f: band 0.41 -> 0.35.

**K963, f's hook: mostly fixed.**
- Cause: the fair itself turns sharply into the hook. f's axis curls about 150 deg, and v5.7's fair wound an S
  into the run-in.
- Fix: the |dk/ds| hinge, written at tol 1.2 u with no jump weight.
  - 12 nodes; peak 3.85 at 788 u, under v5.4's 4.29 (v5.7 5.21).
  - Largest comb jump 3.74 -> 0.97. The bottom loop's comb lobe is gone.
  - f's exit moved 0.57 u: +17.8 deg, end curvature -39.5 -> -54.3 /kfu, 1.89 u off the axis.
- Not met: the hook still has three nodes 12.8 u apart (777.6, 790.4 and 803.3 u). Every tolerance from 1.0 to
  3.0 u keeps a pair about 13 u apart there, because the run-in's bulge and the curl each take a cubic. This is
  measured, not a setting.
- Tried and rejected:
  - A clothoid exit reference lands on f's end frame only 3.8-4.2 u off the trace (`work16/dbg/cloth_scan.txt`),
    and the fair with one peaked at 5.56 or more. K965's untested estimate (about 2.5 u, peak near 3.1) was wrong.
  - Cap 3.4 makes an S under the hook (`work16/dbg/qc/f_hook.png`).
  - Cap 3.0 cannot be met.
  - The jump weight raises the hook from 5.21 to 6.22-7.03.
- Crops: `work16/combs/crops/rows_6_f.png`, `work16/dbg/qc/f_hook.png`.

**K968, one-cubic strokes: fixed.**
- Cause: rough_k945 flushed a piece only when `len(P) > 1`, so a one-cubic stroke read 0.
- Fix: `rough_k969` flushes when `len(P) >= 1`.
- v5.7 re-read with it (`work16/rough/check_v57_k969.txt`): x 0 -> 1.40, x2 0 -> 0.17, t2 0 -> 0.26. a, g and q
  keep their peaks, placed 10-12 u later.
- x's 1.40, against the 1.53 in v5.7's handoff, is the same body. peak1_k965 samples twice as densely; it gives
  1.53 for both versions (`work16/dbg/peak1_v58.txt`).
- No crop: this is a tool fix, and the table shows it.

**K969, small comb bumps: mostly fixed.**
- Cause: the writer chooses each node's curvature freely, so the curvature slope jumps at a node. The combs show
  each jump as a corner, notch or spike.
- a: one cubic over the 169 u bowl top could not follow the fair (node curvatures 8.4-8.8 /kfu against its 5.10).
  WJ 16 at tol 0.8 adds a node there. The spike and the notch are gone, and every jump is at most 0.27.
- b: the spike at 568 u is gone; it came from a 4.3 fu control arm. The bottom notch went 1.77 -> 0.46 and is
  still visible.
- k: the crotch ripple went 2.57 -> 0.75; the corners at 215 and 754 u are gone.
- y: the exit corner went 0.57 -> 0.21. The crop shows no visible change.
- z: the descender notch went 0.43 -> 0.25 (still visible) and 0.34 -> 0.14.
- f's bottom-loop lobe went with its new fair (K963).
- Not fixed, because each is the fair's or the font's own shape:
  - b's exit step: the fair's tie lobe after the cusp, k 3.1 -> 14 /kfu over 17 u (`qc/b_exit.png`).
  - z's top step: a cusp, the font's corner.
  - k's V at 726 u: 1.16 -> 1.08.
- o's exit (5.08) is v5.7's: the jump weight raises it to 6.77.
- The designer's places (kmax nodes) raise a's peak to 1.91-2.29.
- Not on the list: b's upstroke shows small comb steps at two nodes, as at v5.7's one node there. Not measured.
- Crops: `work16/combs/crops/rows_1_a.png`, `rows_2_b.png`, `rows_11_k.png`, `rows_25_y.png`, `rows_26_z.png`;
  `work16/dbg/qc/a3.png`, `a_start2.png`, `b_exit.png`.

**K970, tool gotchas: fixed.**
- `eye_k969` checks every letter each label has, not only the letters common to all labels. Tested on v5.6 against
  v5.7: the same flags as v5.7's record.
- `fid_cmp_k969` reads phrase headers. K959's copy filed phrase rows under the word before them.
- `nodes_pairs_k969` finds the sheet's rows from the first column's span, so z's one-cell row counts.
- `fewnode_k969`'s G2 tally leaves out the joints listed in `corners` (g's and q's stem-top V): g dT 84 deg ->
  3.8e-14, q 85 deg -> 5.1e-14, a "cusps 2" -> "cusps 1 corners 1".
- `bodies_k969`'s `--end-budget` header reads on|off|all.
- Crop: `work16/nodes_crops/n_abfkyz.png`, which now includes z's row.

**Checks.**
- Eye (`out16/split_check.txt`): nothing over 3 in v5.7 or v5.8 (52 split passes, 53 cusp sides; K916's own scale
  counts 4 and 3).
  - a@352, pass 1: 1.30 -> 0.33.
  - p90 |dk/ds| (/Mfu²): a 74.05 -> 48.41, b 88.00 -> 94.64, f 157.76 -> 154.38.
- Ends (`work16/dbg/ends_v57_v58.txt`): only f's exit moved (above). y's entry curvature went +3.0 -> +2.4 /kfu
  without moving. The e, o and x ends are as in v5.7.
- Stem tops (`work16/vtops/`): a 0.13, d 0.00, g 0.26, q 0.00 u from the V, as in v5.7.
- Template checks all pass; round trip 0.000 u.

**Fidelity** (`work16/dbg/fid_cmp_v58.txt`, `fid_cmp_v58_005.txt`): 88 join rows, mean 1.737 -> 1.742 u.
- Over 0.25 u: la -0.29 ("jumps over the lazy dog"); ma +0.36 ("knotmaze" and "be we shoe maze huge bye"). All
  three are class mod_n_o.
  - Cause: a's fused entry (the frame on its bowl's left side, which v5.8 rewrote) moved 0.59 u, from
    (98.97, 250.00) to (101.44, 250.00) fu, and turned -1.7 deg (`work16/dbg/entryf_v57_v58.txt`).
  - The join from l or m retraces that side of the bowl, so its distance follows.
- Over 0.05 u:
  - nd -0.24: the class refit of mod_n_o|d, whose members include a's fused entry (`jdiff_v57_v58.txt`).
  - an -0.12 and ck +0.09: join_k925's first- and last-letter dx moved with the new bodies (a's entry
    -11.25 -> -12.5, k's exit 0.0 -> 0.5).
- e joins:
  - ae 0.36 -> 0.39.
  - ke 0.55 -> 0.53.
  - fe 15.98 -> 15.34 (it was this large in v5.7 too; K949).
  - ze refit: 2.05 / 2.07.
- 22 join classes were refitted; NOTES step 5 lists them. The joins are K962's.

**Outputs.**
- `out16/cursive_v58.svg`, `cursive_v58_nodes.svg`, `cursive_v58_words.svg` (+ `.png`), `combs_v58.svg`,
  `split_combs.svg`, `split_check.txt`, `e_joins.svg`.
- `cursive_v58_review.png` holds the chart and stays local.
- Bodies and checks: `work16/fewnode/` (`bodies.json`, `selection.txt`, `table.txt`), `work16/join/`,
  `work16/build/`, `work16/rough/check_v58.txt`.
- Crops looked at:
  - `work16/combs/crops/rows_1_a`, `rows_2_b`, `rows_6_f`, `rows_11_k`, `rows_25_y`, `rows_26_z`,
    `rows_27_minimum`, `rows_28_hippo` (`.png`; v5.7 over v5.8, at 288 DPI);
  - `work16/nodes_crops/n_abfkyz.png`;
  - `work16/vtops/vtops.png`;
  - `work16/dbg/qc/`.
- Nothing uploaded.

**Open.**
- o's exit flick is now the highest peak (5.08 [8.54]). The jump weight makes it worse, so it needs a local fix.
- f's hook keeps two nodes about 13 u apart, a result of the font's shape.
- b's bottom notch and z's descender notch are smaller but still visible.
- b's exit step and z's top step come from the fair and the font.
- b's upstroke steps are not measured.
- k's peak rose to its fair's own 2.71.
- 8 strokes are still over 12 nodes: a is now 13; f is down to 12.
- The writer has no guard against very short control arms (b's spike).
- The ma joins sit 0.36 u further from the font (a's moved entry), and fe stays at about 15 u (K949).
