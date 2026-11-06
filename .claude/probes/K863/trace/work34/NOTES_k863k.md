## K863 v6.8 leftovers

J3k (v6.8 leftovers): the spots where v6.8, the approved version, still draws against the font (K863, K1213), each as
candidates beside v6.8 and the font, after the kit's fixes (K1212). No join between letters changes and nothing is
chosen here: the sheets put font | approved (v6.8) | candidates side by side for the coordinator, then Levi.
`work34/base` is v6.8 rebuilt by the fixed kit from J3j's inputs (`out33/cursive_template.svg`, J3e's after its ctx
step, and `work28/ports_k990e.json`, variant M). The candidates, each changing only its spot's pieces: S1 and S2 (s at
a word's end), P1 (p at a word's end), Q1 (q's word-end tail), D1 and D2 (the dots of i and j), and ALL = S2 + P1 + Q1
+ D2 (the test words' column). Stage agent of coordinator session 7301c55b, started 11:09:27 on 2026-11-05, cap
13:09:27. Brief `docs/design/K863_cursive_j3k.md` (branch `worktree-agent-aaac8bfa2dd91edbb`). Everything below is
under this folder. The tools are `work34/dbg/*_k863k.*`; J3e's build (`work23/dbg/build_k1019.ps1`) and ctx step
(`work27/dbg/ctx_template_k1027.py`) run in place, as in J3j; the earlier work and out folders, Levi's templates and
`cnct.*` are untouched. Rerun everything: `pwsh -NoProfile -File work34\dbg\checks_k863k.ps1 [step ...]` (steps
tools, template, build, ctx, base, census, cmp, g2, cand, local, cens_c, sheets, sheets_ink, png, crops, guard; no
step = all, in order; logs in `work34\checks_logs`; `K926_FINAL_E=shear`, `K1009_PINS` cleared). The candidates'
inputs are `work34/cand/<name>/join_params.json` (their forms and the numbers behind them in `work34/cand/forms.txt`),
their builds `work34/cbuild/<name>`, their censuses `work34/census_<name>.json`.
The tools (`venv\Scripts\python.exe -I work34\dbg\<tool>`, from this folder; each header has its usage):
- `mk_tools_k863k.py`: writes the ports (K1212): `pairs_k863k.py` (J3j's `pairs_k863j.py`: SU.g2 reads the census's
  `ang_deg`; each census keyed by the piece's id without its word number, a repeated id stops the run; `angle_only()`,
  the seams g2 fails on the angle alone), `rowsame_k863k.py` (J3e's `rowsame_k990e.py`: rows matched by that id, every
  field but the label and the id, the repeats listed and each checked against its first copy), `census_k863k.py` (J3d's
  census; `--gen gen_k863k` imports too), `sheet_k863k.py` (J3d's sheet tool drawing with gen_k863k; `--ink <pen u>`
  draws each build's ink at the pen's width, translucent under its centrelines), `area_k863k.ps1` and
  `wtcopy_k863k.ps1`.
- `gen_k863k.py`: gen_k1027 plus the forms a join_params file names under "k863k": `fin` (the word's last s or p cut at
  a cubic and t, with an optional G2 tail; a pure cut has no census row) and `dot` (the dot stroke replaced by a closed
  ellipse of four cubics). The joins and leads are solved exactly as v6.8's; without the key every output is
  gen_k1027's.
- `cand_k863k.py <v6.8 dir> <ports> <variant> <qfit.json> <out dir> [NAME=A+B+...]`: the candidates' join_params and
  `forms.txt` (the cut cubics, the font dot's centroid and axes, each form's numbers).
- `qtail_k863k.py`: q's tail sampled near its start (point, direction, speed, curvature); `qfit_k863k.py <bodies>
  <join_params> <out> [a0 floor] [curvature cap]`: a new prm for that tail, its end frame kept (Q1 is
  `work34/cand/qfit_Q1b.json`: a0 >= 0.3, |k| <= 1.0 x v6.8's visible peak; the first fit, a0 >= 0.15 and 1.5 x, ran
  into its cap).
- `dots_k863k.py`: the font's i and j dots against v6.8's dot strokes (centroid, area, axes); `local_k863k.py`: every
  piece of 232 words, v6.8 against each candidate, exactly, plus each spot's own measures (`work34/local.txt`,
  `local.json`); `censcmp_k863k.py`: each candidate's census rows against v6.8's by id, the spot's rows apart
  (`work34/census_cmp.txt`).
- `look_k863k.py`: a loupe (one letter of one word: the font's fill and skeleton, then each build's ink at the pen's
  width); `crop_k863k.py`: one box from every column of a loupe or a dpi-144 sheet, side by side, enlarged (it lifts
  PIL's pixel limit: the test words at dpi 144 are 190 Mpx).
- `checks_k863k.ps1` (above).

### The checks

- The kit (steps template to g2; K1212): the template is J3j's byte for byte (8F72C6A8F11D8F4C); `work34/base` against
  `work33/base`: 16 SVG, PNG and JSON files, 0 differ (the guard step repeats it last). Each word list holds each id
  once: the repeats were REMOVED (the first copy kept), not renamed: J3e's list lost "of" (85 -> 84 words), J3i's "of"
  and "vg" (234 -> 232). By id against J3j's (`cmp.log`): census_v68 347 in both, 347 equal, 0 differ (J3j's 349 rows
  hold 347 ids; its repeats of:J0-2of and of:lead0o equal their first copies); census_v68x 713 in both, 713 equal, 0
  differ (718 rows for 713 ids; the five repeats, of twice, vg:J0-2vg, vg:lead0v and vg:tail0g, equal their first);
  work28's census_v68 against work34's, 347 equal.
- g2 with the angle (`g2.log`, census_v68x): pieces 713, hooks 93, spikes 133, rough 189, seams 25, over 345; 25
  undesigned seams, 19 at an entry into i, j, p, r, s, t, u, w or y and the 6 q$ tails (dk 10.6 /u). **0 seams fail on
  the angle alone.** 9 of the entries have an angle of 0.05 deg or more, all port-cusp retraces at 180 deg, and fail on
  dk already: nr, dr and er (after, lawgiver, jumps over the lazy dog) at dk 0.0462 /u, ds and as at 0.0436, ii and hi
  (hippo) at 0.00275; gaps 5.53e-08 u or less.
- Locality (step local, `local.txt`: 232 words, 148 pairs solved once, 290 s): **0 pieces outside the spot differ, for
  every candidate.** The spots: S1 and S2 14 pieces in 14 words (boxes, jumps over the lazy dog, as, bs, cs, ds, es,
  fs, hs, is, ns, os, vs, ws); P1 13 (subgroup, ap, bp, cp, dp, ep, fp, hp, ip, np, op, vp, wp); Q1 6 (bq, cq, fq, oq,
  vq, wq); D1 and D2 41 in 38 words; ALL 74 in 68.
- The spots' own measures (`local.txt`; a cut stroke and a dot have no census row; body coordinates in fu):
  - s (s.ful.fin): v6.8's stroke ends at (394.4, 4.6), heading 15.5 deg, after the bottom curl turns back and runs out
    right along the baseline: its end is 17.80 u from the font's skeleton, 77.41 u from the skeleton's end. S1 cuts at
    the curl's reversal, (61.9, 39.0), heading 154.5 deg: 81.69 u removed, the end 2.93 u from the skeleton and from its
    end. S2 cuts about 2.9 u earlier on that cubic (t 0.9022), at the point nearest the skeleton's end, (72.9, 33.8),
    155.0 deg: 84.63 u removed, 0.19 u from the skeleton's end.
  - p (p.jmc.fin): v6.8 ends at (430.1, -1.7), heading -1.0 deg, 16.28 u off the font's skeleton, after the same
    retrace and run-out. P1 cuts where the bowl closes into the stem, (93.9, 41.4), 155.0 deg: 82.39 u removed, the end
    0.26 u from the skeleton (whose nearest end is 116.85 u away: the font's bowl runs into its stem there).
  - q's tail: Q1 against v6.8 Hausdorff 0.65 u; direction over the tail -170..41 -> 4.5..41 deg (no backward run);
    length 34.42 -> 33.08 u.
  - The dots: the font's i dot is a filled oval, full axes 23.0 x 18.5 u at 45 deg, area 333 u^2 (j's 23.0 x 18.6,
    335 u^2).
    v6.8's i dot ink: IoU with the font's dot 0.570, ink 226 u^2, 23 outside the font's dot, 130 of it uncovered, axes
    28.6 x 10.2 u at 43 deg (a slanted dash). D1 (a circle, centreline radius 19.3 fu = the font's minor semi-axis
    less half the pen): IoU 0.805, ink 268, 0 outside, 65 uncovered, 18.5 x 18.5 u. D2 (an ellipse, 28.6 x 19.3 fu
    along the font's major axis): IoU 0.967-0.970, ink 334, 5-6 outside, 5 uncovered, 23.0 x 18.5 u at 45 deg. Their
    centroids sit 0.00-0.10 u off the font dot's; the pen leaves a hole of 0.004 u^2 (D1) and 0.079 u^2 (D2; j's
    0.158) at the loop's centre. j's numbers match i's (IoU v6.8 0.568, D1 0.805, D2 0.967).
- The census (step cens_c, `census_cmp.txt`, against census_v68x by id): v6.8 through gen_k863k (no "k863k" key) on
  ALL's 70 words: 234 rows, all equal, every field. Per candidate: 0 rows differ beyond the word's kmax_p95 outside the
  spot. word_p95 ties every row of a word together, so a cut or a dot moves the p95 (and the spike counts against it)
  in every row of its word, badness unchanged in every such row: S1 48 of 50 rows (p95 within 9.9%, median 0.1%; one
  spike count, vs:J0-2vs 31 -> 29), S2 48 of 50 (10.3%, median 0.2%; the same row), P1 30 of 32 (4.4%, median 0.9%;
  cp:lead0c 20 -> 19), Q1 11 of 19 (0.9%; none), D1 160 of 162 (65.8%, median 8.4%; 11 rows' spikes, e.g. oi:tail0i 26
  -> 20, it:tail0t 18 -> 8), D2 160 of 162 (66.1%, median 11.2%; 10 rows, it:tail0t 18 -> 9), ALL 226 of 234 (66.1%,
  median 7.4%; 12 rows).
- q's spot (6 rows, Q1 = ALL): the exit seam gap 0, angle 0, dk 10.6 /u -> dk 9e-16 to 8.6e-15 (G2); the font
  distance max / mean 1.06 / 0.75 -> 1.17 / 0.84 u; hooks 1 -> 0; rough fails in both (facet 1.233 -> 0.030 against
  0.0053 /u, wobble 1.832 -> 0.004 against 0.016 /u); peak ratio 3.14 -> 40.48; badness 270.3 -> 84 (oq, cq), 64 (bq,
  fq, wq), 44 (vq). Why v6.8 steps: its prm (0.0215, 1.5953, -4.4842, -1.4318) has a0 at the solver's floor and a large
  backward b0, so the tail leaves q's exit at 2.9 fu/t, turns back (-154 to -170 deg), runs back about 2.5 fu, turns
  through a near-cusp (k 4.95 /fu at t 0.2) and only then goes forward: that knot is the dk 10.6. Q1's prm (0.3000,
  1.1388, -2.7823, -5.0324) keeps the end frame. Its residual: a slight S within about 1.5 u of the exit (direction
  9.3 -> 9.7 -> 6.9 -> 4.8 -> 13.1 deg, k +0.050 to -0.18 and back to +0.035 /u), which is the facet fail and the peak
  ratio (peak dk/ds 0.1406 /u^2); not visible at 5x.

### The sheets

`out34/` (SVG; PNG at dpi 48 in `out34/png/`), every column labelled; `--ink 9.2` on the dots and the test words
(centrelines alone draw a dot's loop as a ring):
- `spot_s.svg`: boxes, is, jumps, as, ds, es, os; font | approved (v6.8) | S1 (cut at the curl) | S2 (cut at the
  font's end).
- `spot_p.svg`: ap, op, ep, ip, np, subgroup; font | approved | P1 (bowl closed, no run-out).
- `spot_q.svg`: oq, cq, fq, bq, vq, wq; font | approved | Q1 (no step).
- `spot_dots.svg`: it, minimum, jet, ice jet even, which, hippo, oi, oj; font | approved | D1 (round) | D2 (the font's
  oval).
- `cursive_k863k_words.svg`: the 21 test words; font | approved (v6.8) | ALL (S2+P1+Q1+D2). No test word ends in q:
  Q1 shows only on spot_q.
What was viewed, full size, all in `work34/look/` (the crops step remakes every loupe and crop byte for byte): the
loupes `v68_boxes_s`, `v68_ap_p`, `v68_oq_q`, `cand_boxes_s`, `cand_ap_p`, `cand_oq_q`, `cand_it_i`, `cand_jet_j`;
their crops `crop_boxes_s_end` (2x), `crop_ap_p_end` (2x), `crop_oq_q_exit` (5x); from the dpi-144 sheets
`crop_spot_s_as`, `crop_spot_s_boxes`, `crop_spot_p_ap`, `crop_spot_p_subgroup` (1x), `crop_spot_q_oq` (3x),
`crop_dots_it_row` (1x), `crop_dots_it_3x`, `crop_dots_minimum_row` (0.5x), `crop_dots_jet_row` (1x),
`crop_words_boxes`, `crop_words_subgroup`, `crop_words_minimum` (0.5x), `crop_words_jumps` (0.33x),
`crop_words_icejeteven` (0.4x), `crop_words_minimum_dot_3x`, `crop_words_boxes_s_2x` and `crop_words_subgroup_p_2x`.
What the crops show:
- s: the font's bottom sweeps round to the left and ends in a rounded terminal. Approved doubles back and runs a flat
  tongue out to the right along the baseline. S1 and S2 both end on the curl, sweeping left; S2 stops at the font's
  terminal (at 2x on the words sheet too), S1 about 3 u further round the curl. Lean: S2, with S1 as the option.
- p: approved runs on in a flat tongue along the baseline, about 82 u. P1 closes the bowl into the stem and stops,
  as the font does (subgroup at 2x). Lean: P1.
- q: approved and Q1 take the same course at 3x; at 5x approved shows a slight step at the exit and Q1 carries
  straight on. Lean: Q1, a quiet improvement. Both tails are shorter and lower than the font's (not this stage's).
- The dots: the font's is a filled oval tilted 45 deg. Approved's is a slanted dash poking out of it at both ends. D1
  is a smaller round disc inside it; D2's ink fills the font's oval (the same width at 3x, its centre filled). Lean: D2.
- The test words: boxes and jumps end s on the curl, subgroup's p closes into its stem, the dots of minimum, ice, jet
  and jumps are ovals; every other spot is approved's.

### Left as found (reported, not fixed)

- Q1's slight S at the exit (facet 0.030 against 0.0053 /u): a refit holding the direction monotone, or penalising the
  facet, is untried.
- q's tail is shorter and lower than the font's in v6.8 and Q1 alike.
- word_p95 ties a word's rows together, so a change at one spot moves kmax_p95 and spike counts in every row of its
  word (counted apart above).
- The 9 port-cusp entries at 180 deg (nr, dr, er three times, ds, as, ii, hi) fail on dk: v6.8's corners, out of
  scope (the cusp-corner rule).

Written 12:34; the stage ran 11:09:27 to 12:41, inside its cap (13:09:27).
