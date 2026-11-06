# Muse batch 22 Run L (22L): the cursive residuals measured on v6.8

Baseline: J3k landed its kit-fixed rebuild of v6.8, so this audit measures
that one: `work34/base` (byte-identical to `work33/base`, J3k's
checks_k863k base/guard steps) with its censuses `work34/census_v68.json`
(J3e's words, 347 rows) and `work34/census_v68x.json` (J3i's words, 713
rows). A fresh census through the kit's own census tool on 52 words
(`census_check.txt/.json`, this folder) shares 97 rows with census_v68x
and differs on 0 fields (`census_cmp.txt`); it also measures the pairs
the census word lists do not hold (zo, to, io, mo, ng, na, nq, ea, ne).

How each number was taken (scripts in this folder, kit unedited):

- `measures.py` reads the two censuses, `work34/base/bodies.json` and
  `work28/ports_k990e.json` (variant M) and prints `measures.txt`.
- `bodies_sample.py` samples the body strokes for the measures the
  census has no rows for (`bodies_sample.txt`); the comb jumps are the
  kit's own `work16/dbg/jumps_k969.py` run on `work34/base/bodies.json`.
- `sheets.py` runs the kit's sheet tool (`work34/dbg/sheet_k863k.py`) on
  v6.8 for the solve reports (status, nfev, attach, side, crossings):
  `sheets_o.txt`, `sheets_into_o.txt`, `sheets_cusp.txt`, `sheets_f.txt`
  (SVGs and sidecars beside them, untracked).
- `crops.py` runs the kit's loupe (`work34/dbg/look_k863k.py`): font
  (fill + skeleton) beside v6.8 at 2-3 px/fu. 18 PNGs, each under 70 KB.
  What each crop shows is measured in the table; no look is judged here.

Units: u (x-height 120 u). Census `dmax` is the piece's largest distance
to the font; budget 2.5 u (3.0 into a fused entry). `side` is the solve's
side margin in u (tolerance -0.05). A seam is G2 at gap < 0.01 u,
angle < 0.05 deg, dk < 0.0005 /u.

## The thirty items

| Item | Claim (its version's number) | v6.8's number | Verdict | Crop |
|---|---|---|---|---|
| K903 | v3: k's X traced 61.3 deg (font 3.2); coverage max 4.3 u (f); p.jmc stem kink unmeasured | k X 61.34 deg, font 3.18 (`bodies.json` crossings); f cov 4.309 u; p: 0 turns/jumps at smooth nodes (only the two 180 deg cusps) | holds (p clause measured, gone) | crop_k903_kx_3x.png, crop_k903_p_3x.png |
| K912 | v4: ok 10.9, or 6.5 u; f's exit walk; per-left split overfit | ok 34.77, or 10.58 (solved port joins); fo solved, exit 6.92 u from f's end, status 0; no per-left sets remain for o/b exits | changed | - |
| K913 | v4: a's fused junction at the font's 47.5 u; frame in the kink 30.2 vs 52.6 deg; d after-o frame 36.3 deg; a body includes the up pass | a junction at 60.0 u by rule (font junction 47.78 u); a's smooth-node turns 0.00 deg; d after_o frame tangent 24.8 deg | changed (frame-kink measure has no v6.8 counterpart) | crop_k913_a_3x.png |
| K927 | v5.1: fits stop at nfev 600 for 16 of 26 letters; a 5.0, q 4.0 u off the trace | No nfev-600 trace fit exists: bodies come from the template through the few-node writer (few-node dev a 0.53 u, q about 1.0 u; body-to-trace fid a 0.40, q 0.42 u). Port solves end status 0 to nfev 6125/8000 (oy); er/es status 1 at 3000 | not measurable on v6.8 (the fit it names is gone) | - |
| K937 | J2's one `mod_n_o` set: ho 2.85, no 2.89, do 2.76, ro 2.89 u, inside 3.0; an o-only set may win the distance back | ho 6.10, no 4.79, do 5.97 (per-pair port solves); ro 2.89 (the J2 preset, kept); to 2.97, io 4.58, mo 2.46, ng 5.73 (fresh census) | changed | crop_k937_ho_2x.png |
| K938 | v5.2: zo 142 u at every height (reference likely wrong); five new crossings into o (the font crosses there too) | zo 2.96 u (fresh census; the 142 u reference is gone); joins out of o crossing a body: ob, of, oh, ok, ol 1 each (1 allowed), the other 21 at 0 | changed | - |
| K947 | v5.3: f's frames share a node; `bodies.json` 4.5 MB; the ot crossing | f's after_o and after_b frames still coincide (s 787.2 fu, bt 0.8916, moved 0.019 u); bodies.json 2,976,427 bytes; ot crossings 0 (allowed 0), pp/mp presets with 0 hooks | changed (frames clause holds) | - |
| K948 | e after o/b/v/w turns up into the eye's back in a short span (elbow); B1's b, v, w exits leave 3-9 deg steeper than the font's | be 3.47 (1 hook), we 2.01 (1), ve 3.16 (2): the J1 preset sets kept, hairpins still counted; oe solved anew 12.69 (0 hooks, 1 crossing allowed); fe meets e at a 0.7 deg turn (J3e). Exits: b -22.0, v -17.1, w -20.5 deg against the font's -12.5 to -14.5 | holds (exits and be/we/ve); oe changed | crop_k948_be_3x.png, crop_k948_oe_3x.png |
| K949 | fe 18.8 (v5.8 15.34), bk 7.85, ee 6.9, br 5.18, y's final tail 3.55 u | fe 13.62, bk 7.31, ee 8.29 (coffee; the two-letter ee solves to 3.22), br 5.18, tail y 3.55 | changed (br, tail y hold) | - |
| K951 | v5.4: b, f, p, v, o, s and w end without a final tail, as the font's do | 180 tail rows in census_v68x; their letters are a c d e g h i j k l m n q r t u x y z: none of b f p v o s w has one (s and p word ends are J3k's candidates, not v6.8) | holds | crop_k951_s_3x.png |
| K961 | v5.8: 8 of 30 body strokes over 12 nodes: m 21, k 18, h 16, w 16, y 15, p 14, a 13, n 13 | Same eight letters over 12, same counts (m 21, k 18, h 16, w 16, y 15, p 14, a 13, n 13); f is 12 | holds | - |
| K977 | v5.8: b's bottom notch (1.77 -> 0.46) and z's descender notch (0.43 -> 0.25) still show; b's upstroke comb steps unmeasured; k's peak 2.71 (its fair's own); f's hook three nodes about 13 u apart | Comb jumps (`jumps_k969.py` on v6.8): z 0.25 at 367 u; b 0.46 at 403 u among 8 smooth-node jumps 0.11-0.72; k body rough peak 1.91 (rough_check.txt; the 2.71 was the v5.8 writer's table); f's last nodes 12.55 u apart twice | holds (z, f; b's 0.46 jump still present, steps now measured) | crop_k977_b_3x.png, crop_k977_z_2x.png |
| K978 | The few-node writer has no guard against very short control arms (b's v5.7 spike at 568 u came from a 4.3 fu arm) | Still no arm-length floor; see "Kit gaps" | holds (kit gap) | - |
| K982 | K944 leftovers: loop crossings are recorded, never read; Inkscape's rewrite loses up to 4.4e-4 u | The record is now carried by the reader, still read by no build step; the reader bounds Inkscape noise at 1e-3 u; see "Kit gaps" | changed | - |
| K986 | rough fails n after K944's n edit (facet 0.0056 > 0.0053, peak 14.67 at 166 u), same with and without K981 | Stock v6.8 n body: rough PASS, facet 0.0008, peak 1.37 at 30 u (`work34/base/rough_check.txt`). Word-final n tails still FAIL at facet 0.0078 (a different piece); the edited-build measure itself was not rerun | changed | - |
| K987 | A G2 rule at a smooth node's retrace follower (n's jump grows with the drag: 2.70e-2 /fu at s1; node 6 gains 1.63e-4; n has 4 kinks) | n's smooth nodes sampled: every turn 0.00 deg, every curvature jump 0.0000 /u; only the retrace cusp at 139 u jumps (0.0117 /u, designed). Census: 0 internal kinks in 713 rows | gone | - |
| K989 | Frames with a bk still go through K944's node alignment, not a rule on the drawn curve; edits are emulated, never made in the GUI | Still alignment + scripted edits; see "Kit gaps" | holds (kit gap) | - |
| K990 | f still ends its lower loop in a curl below the crossing, not a cusp into its exit (fe 22.55, ff 16.55, fo 9.07 u) | fe 13.62, ff 3.75, fo 7.79 (all solved from f's exit port, status 0; f's corner at 65 u, census body corner f node 9 at 168 deg) | changed | crop_k990_f_2x.png |
| K991 | Cusp entries (t, p; also i j r s u w y) should meet the stem from one side at its tangent, never crossing; J2 left them at 143-172 deg, crossing about 20 u lower | No entry crosses beyond tolerance: solved cusp/corner sides 0.00-0.61, op -0.05, fj -0.00, fw -0.01 (tolerance -0.05). Arrival angles still 142.7-179.2 deg at the designed corners (not tangent-collinear) | changed (crossing gone; angle holds) | crop_k991_ip_3x.png |
| K997 | The take rule (`joinfit_k962`, `freeze_k962`) should read the census's peak away from the seam, with the hook as its own term (fo peak 0.114 -> 0.146, tail t 0.044 -> 0.169, both taken) | The J2 rule is unchanged and unused for v6.8's solved joins; see "Kit gaps" | holds (kit gap, in the J2 tool) | - |
| K998 | Census coverage: add words holding fe, bk, ee (K949), na, nq (K946) and the pairs sharing a re-chosen set (to io mo ng); explain the over-budget pieces (ot 6.56, tail t 6.53, lead f 6.46, oe 5.29, br 5.18, fo 4.64 u) | fe, bk, ee are in census_v68x's word list now; na, nq, to, io, mo, ng still are not (fresh census here: na 6.20, nq 5.29, to 2.97, io 4.58, mo 2.46, ng 5.73). Over budget on v6.8: ot 15.98-17.35, tail t 6.53-6.87, lead f 6.46, oe 12.69, br 5.18, fo 7.79 | changed | - |
| K1006 | Knees in e, f, l leads (0.0373, 0.0397, 0.0343), h's hump (0.0053), k's lead wiggling; tail0q's exit not G2, a 151 deg hook | Lead peaks: e 0.0152, f 0.0153, l 0.0097, h 0.0017, k 0.0103 (0 hooks each). tail0q: exit seam dk 10.57 (not G2), hook 151 deg at 0.02 u, facet 1.233 FAIL | changed (knees down; tail q holds) | crop_k1006_leade_2x.png, crop_k1006_tailq_2x.png |
| K1014 | J3a leftovers: 0 u cusp entries (hi x2, er, es, ow x2); on/en jump between two minima (6.43/5.25); 12 maxfev solves; b f h k l e after-high entries pinned at bounds; ea/et about 2 u below the baseline; ne/he at the 30 u bound; no words/template writers; no port sensitivity | 0 u cusp entries still: hi, er, es, ai, ar, as, nr, ns, di, dr, ii, ir attach at 0.00 u, sides 0.00-0.01 (ow is now a 0 u corner at 40 deg). All 26 o solves status 0 (maxfev 8000); er, es and ee status 1 at 3000/3000 in two-letter words. 36 census rows at a floor (be/we/ve at a0 0.02). ea lowest -2.1 u, et -1.8 u; ne and he attach at 30.00 u. The on/en sweep and port sensitivity are not in the current kit | changed (several clauses not measurable: the sweep tools are gone) | - |
| K1021 | B2: g's and q's corners 1.96 and 1.89 u above a's; the new tops 9.2-9.3 u off the font (a's 8.0); og dmax 19.91 -> 20.74, rough before and after | Corners +1.97 (g) and +1.89 (q) u above a's; tops sampled to the font's skeleton: max g 9.19, q 9.03, a 7.89 u; og 7.14 (rough ok) | changed (corners and tops hold; og moved) | crop_k1021_g_3x.png, crop_k1021_q_3x.png |
| K1035 | J3b leftovers: oi switches between two minima (13.71, as on); corners into i j p s u w y at the 30 deg low end; os skipped the font's dip; b f h k l at the 100 bound; oe crossed once | Corners at the 40.00 deg bound (oi oj os ou ow oy; op 36.22 deg, side -0.05); os 36.17 (farthest o join, lowest point 104.8 u); ob, of, oh, ok, ol attach at 100.00 u; oe 1 crossing (1 allowed). The two-minima sweep was not run | changed (sweep clause not measurable: no sweep tool in the kit) | crop_k1035_os_3x.png |
| K1036 | J3b's census/checks: port-cusp entries at s = 0 count as 180 deg seams; the own-ends reference ranks og's b0 (4.35) above v6.4 (7.12), which looks nearer; the i and u continuity sweeps move nothing | Port-cusp seams still count (census lists hi, er, dr, as, nr, ds at 180 deg among 25 undesigned non-G2 seams); ranking still by own-ends (og sheet: 7.12 own ends, 22.19 at the frame, both printed); no continuity sweep exists in the current kit | holds (first two clauses; sweeps not measurable) | - |
| K1044 | v6.5: a's largest \|dk/ds\| 8.51e-4 /u^2 above g's 7.07e-4 mark at the held bowl's start; fa and fq moved (0.67/2.39 u) with no census word holding them; oa and oq dip 4.4/3.4 u deeper, attach on its bound (34.3/34.6 u from the corner) | a sampled 8.4e-4 /u^2 at the hand-over (163 u) against g's 0.8e-4 on the same sampling; fa 9.52 and fq 9.60 are censused now (the f-pair words); oa attaches at 38.21 u, oq at 35.71 u, lowest points 101.2 and 99.6 u (18.8 and 20.4 u below the x-height) | changed | crop_k1044_oa_2x.png |
| K1090 | v6.6 o joins: oi oj os ou ow oy corners at the +40 deg bound; op at the side tolerance (-0.05); ob oh ok ol at the [0, 100] end, oe at [0, 90], oc od at their lower bounds; os, oh, ok farthest (34.8-36.2 u) | Corners 40.00 deg (op 36.22 deg, side -0.05); ob/oh/ok/ol entries at 100.00 u, oe at 90.00 u (1 crossing allowed); oc attaches 33.42 u, od 34.50 u; os 36.17, oh 34.81, ok 34.77. All 26 solves status 0 | holds | - |
| K1116 | v6.8 (J3e): fm, fn, fv, fz farther from the font than v6.7's presets (6.41, 10.29, 6.59, 11.46 against 3.23, 3.17, 3.15, 10.09); attaches on a bound; f's exit at its 2.00 u bound; fr/fs need a 2 u lower entry bound; fj/fw side slightly negative; bq, vq, wq hook back (v6.6's) | fm 6.41 (entry m at 10.00 u bound), fn 10.29 (entry n at 0.00), fv 6.59 (exit f at 5.39 u in its [0, 6] pin), fz 11.46 (entry z at 10.00); fe exit at 2.00 u, entry e at 30.00 u; fr and fs entries at 2.00 u (the pin's lower bound); fj side -0.00, fw -0.01; bq/vq/wq 2 hooks each, rough FAIL (the kept v6.6 presets) | holds | - |
| K1194 | v7.0: c's lead-in rough FAIL (facet 0.0098) in c-initial words; er and es solves stop at MAXFEV 3000 | c's lead: facet 0.009836, rough FAIL (virtual lead of c-initial words); er and es solves status 1 at nfev 3000/3000 (two-letter words; ee also status 1) | holds | crop_k1194_c_2x.png |

## Kit gaps (task 4: today's kit, file and line; no fix)

- **K978 (short control arms).** Still no minimum arm length.
  `tools/fewnode_k969.py:454` `g2_cubic` returns handle lengths
  (alpha, beta) with only `> 0` and `< 2 * Ld` tests (to :491);
  `span_fit` (:497) and `span_best` (:687) reject a cubic only when its
  sampled speed falls under `1e-3 * L0` (:507, :699) or its curvature
  passes the KCAP cap (:699 ff). A short arm whose speed stays over
  that floor is still accepted.
- **K982 (loop crossings never read).** Changed, not closed. The reader
  now carries the record by the edit
  (`tools/asdrawn_k980.py:561`, whose rule text still says "a record,
  read by no build step", and :999-1018), and no build step reads it:
  `work27/dbg/gen_k1027.py` computes its own connector crossings at
  solve time (:497 ff) and never reads `bodies.json`'s crossings.
  Inkscape's rewrite loss is bounded by the reader's tolerances
  (`asdrawn_k980.py:49` SAME_U 1e-4 u, :51 NOISE_U 1e-3 u), which cover
  the 4.4e-4 u the item names.
- **K989 (node alignment, emulated edits).** Still the mechanism.
  `tools/asdrawn_k980.py:414` `align` (order-preserving node alignment)
  and :457 `transport` carry every bk frame (after_o with s, s_fused);
  the harness edits are scripted (`work18/dbg/sensitivity_k980.py:47`
  EDITS: drags, a node add, a delete, a tick move), and there is still
  no GUI test.
- **K997 (take rule).** The J2 rule still reads its own objective, not
  the census's peak: `work19/dbg/joinfit_k962.py:11-16` (peak over the
  piece plus a speed-ratio hook term), `work19/dbg/freeze_k962.py:31`
  `taken()` (defect + 5% gain + no-rougher). v6.8's o and f joins do not
  pass through it: they are solved per pair by
  `work27/dbg/gen_k1027.py`'s `solve_join` (its penalties at :494-496),
  with no take step.
- **K998 (coverage).** The word lists are `checks_k863k.ps1`'s `$cwE`
  and `$cwI` (in `work34/dbg/checks_k863k.ps1`): the f-pairs and b-pairs
  put fe and bk in, and coffee holds ee; na, nq, to, io, mo and ng are
  in neither list, which is why this audit censused them separately.
  The census ranks and budgets by own-ends distance
  (`work34/dbg/census_k863k.py:367` `badness`, budget excess on
  `dist_max_u`).
- **K1036 (checks).** The census still counts a port-cusp entry at
  s = 0 as an undesigned 180 deg seam: `designed` is set only for
  `cusp` and `port-corner` kinds
  (`work34/dbg/census_k863k.py:484`, preset entries :538), and the
  not-G2 list (:647) therefore includes them (9 in census_v68x, beside
  tail0q's exit). The own-ends distance is still the ranking number
  (:367-378), with the frame distance printed beside it in sheet
  reports. No continuity sweep (i, u or o) exists in `work34/dbg/`.

## Left as found

- Two clauses rest on continuity sweeps (K1014's on/en two minima,
  K1035's oi switch, K1036's i/u sweeps). The current kit has no sweep
  tool, so they are marked not measurable rather than re-derived.
- K927's and K913's original fit measures belong to pipelines v6.8 no
  longer uses; their nearest v6.8 numbers are in the table.
- Nothing under `.claude/probes/K863/trace/` (work33, out33, work34,
  the kit) was edited. All runs wrote only into this folder.
- `npm test` passes (218 files, 2916 tests) as a base check; no test
  changed.
