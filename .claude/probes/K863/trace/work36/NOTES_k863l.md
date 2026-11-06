## K863 word-end tails

J3l (word-end tails): Levi's answer to card K1213, "all word-end letters should have a tail, but both the s and p
tails are currently bad. Tails should match the curvature they pass by and swoop up more. D2 for [the dots] is good.
I can't tell the q thing, so Q1 is good." Built as two candidates on v6.8 (`work34/base`, J3k's rebuild; ports
`work28/ports_k990e.json`, variant M) through J3k's `gen_k863k` unchanged, so only the "k863k" forms move: `fin`
(a word's last letter cut at a cubic and t, plus a G2 tail), `dot` and q's word-end tail prm. J3L is the pick; J3LC
is the one variant beside it (s and p only). Nothing in `src/` or `test/`; no join between letters, no body and no
per-pair data changes (K1112). Stage agent of coordinator session c18e2f02, started 20:01:39 on 2026-11-05, cap
22:01:39. Brief `docs/design/K863_cursive_j3l.md` (branch `worktree-agent-a2df5ff9479dad4a1`, which holds copies of
the tools, the forms and the two candidates' join_params). Everything below is under this folder. Rerun everything:
`pwsh -NoProfile -File work36\dbg\checks_k863l.ps1 [step ...]` (steps cand, local, cens_c, sheets, words, png; no
step = all, in order; logs in `work36\checks_logs`; `K926_FINAL_E=shear`, `K1009_PINS` cleared). Its Batch keeps at
most 2 of the kit's Python jobs running machine-wide while `$env:TEMP\claude-perf.lock` exists, 4 otherwise, read
again before every start (`$env:K863L_PAR` caps it lower), so two runs side by side share the cap.

The candidates (`work36/cand/<name>/join_params.json`; bodies = v6.8's):
- J3L = `forms_v1.json` (b, f, o, v, w; its s and p overridden) + `forms_A.json`'s s + `forms_P1.json`'s p + J3k's
  D2 dot + Q1s (`qfit_Q1s.json`).
- J3LC = `forms_v1.json` whole (its s and p pass UNDER their bowls, "C1") + D2 + Q1s.
- The forms come from `spec_<name>.json` through `fit_k863l.py`; the other forms/spec pairs (B, C, F2, P2-P4, W1,
  W2, h2, v2, v3) are the tries on the way, in no candidate.

The tools (`venv\Scripts\python.exe -I work36\dbg\<tool>`, from this folder; each header has its usage):
- `fit_k863l.py <build> <ports> <variant> <spec.json> <out forms.json>`: a fin form per letter. The stroke is cut at
  (cubic, t); s and p at the bowl's bottom, where v6.8's retrace of the closing curl ends; b, o, v, w, f at the
  stroke's end. A G2 quintic runs from the cut's frame to an end frame (offset fu, angle, k 0). Its prm is the fairest
  one: the least integral of (dk/ds)^2 times length cubed, with penalties for a0, a1 outside [0.15, 3], for turning
  the wrong way ("turn"), and for touching the letter's own stroke past "clear". With "hug" in place of "d"/"angle",
  the tail follows a curvature profile from a body cubic (k against arc length, fu) and then peels off.
- `qfit_k863l.py <bodies> <join_params> <Q1 qfit.json> <out.json>`: Q1 refit without its S (below).
- `mk_cand_k863l.py <base dir> <out dir> <forms,...|-> <q prm|q json|-> <dot join_params|->`: a candidate's inputs.
- `anl_k863l.py`: a word's last letter cubic by cubic (ends, directions, curvature, lengths). `tails_k863l.py`:
  every word-end tail of a build measured (length, rise, run, end angles, k at the start, min and max, sign changes).
- `grid_k863l.py`: crops of a sheet's PNG by x fractions and y fu (PIL: fails on the words1 sheet, 262 MP).
  `split_k863l.py`: a tall PNG in pieces. `endcrop_k863l.ps1`: every row's word end (or start, `-Left`) cut from a
  sheet's PNG with System.Drawing at the PNG's own scale, the window placed from the SVG's rightmost path point, pages
  under 1900 px (call it in-process with `&`: through `pwsh -File` an array does not bind to `-Rows`).

What changed, per word-end letter (J3L; all lengths along the tail):
- s: v6.8 ran back along its closing curl and on, flat (end direction 15.5 deg). J3L cuts it at the bowl's bottom
  (53.23 u removed; the removed stretch ran up to 17.80 u off the font's path, the kept stroke 3.19 u at most) and adds
  a tail that hugs the bowl, peels off and swoops up: 84.6 u, ending at 57.7 deg. J3LC: the tail passes under the bowl.
- p: the same cut (53.93 u removed; off the font's path 16.28 u -> 2.48 u at most); the tail follows the bowl's bottom
  and swoops up to 55 deg: 110.9 u. J3LC: under the bowl.
- b, v, w: ended at the checkstroke with no tail; now a short checkstroke flick, about 28 u, rising to 30 deg.
- o: no tail; now a short one, 34.2 u to 25 deg, one inflection (it lifts about 30 fu).
- f: no tail; now a hook-up tail, 52.5 u to 40 deg.
- q: Q1s, J3k's Q1 with its slight S smoothed. Q1 leaves q's exit at 9.26 deg, dips to 4.45 deg and turns right
  (k down to -0.185 /u) within about 1 u, then rises to 41.03 deg. Q1s keeps Q1's end frame: Hausdorff 0.18 u from
  Q1 (mean 0.08 u), the direction rises monotonically 9.26 -> 41.03 deg, k never below 0, 33.08 u, the exit seam dk
  4.4e-15 /u.
- i, j dots: D2, the font dot's oval (J3k's).
- The word-end strokes of a, c, d, e, g, h, i, j, k, l, m, n, r, t, u, x, y and z are unchanged: v6.8's already
  read as exit strokes (e's long tail is K950's approved one).

Checks:
- Locality (`work36/local.txt`, J3k's `local_k863k.py`: every piece of the 232 test words, v6.8 against each
  candidate, exactly): J3L: 139 pieces in the spot differ, in 104 words; 0 outside it. J3LC: the same.
- Dots (same file): i's IoU with the font dot 0.570 -> 0.970, ink 226 -> 334 u^2 (font dot 333), font dot uncovered
  130 -> 5 u^2; j's IoU 0.568 -> 0.967.
- Census on the changed words (`work36/census_cmp.txt`; 106 words). v6.8 through gen_k863k: 302 rows, none differ from
  v6.8's census. J3L: 367 rows. Outside the spot: 2 equal, 294 differ only in the word's p95, 0 otherwise, and 65 new
  tail rows (f 6, v 6, b 6, w 13, s 14, o 7, p 13). The p95 is taken over every stroke of the word, so a new tail
  moves it with no piece moving. kmax_p95 moves by up to 66.1%, median 2.6%; spikes change in 13 rows (oi:tail0i
  26 -> 20, it:tail0t 18 -> 9); badness is unchanged in every row. In the spot: the 6 q tails. J3LC: the same counts.
- q's tail (oq, fq, cq, bq, vq, wq; v6.8 -> J3L, J3LC the same; J3k's Q1 in brackets): seam dk 10.6 -> 1e-14 /u;
  hooks 1 -> 0; facet 1.233 -> 0.006 (0.030); wobble 1.832 -> 0.005 (0.004); font distance max 1.06 -> 1.22 u, mean
  0.75 -> 0.85 u; peak dk/ds ratio 3.14 -> 6.08 (40.48); 33.74 -> 33.08 u; badness 270.3 -> 20.6 (64-84).

Sheets (`out36/*.svg`, PNGs at 144 dpi in `out36/png/`; font | approved (v6.8) | J3l [| J3lc], inked at 9.2 u):
`k863l_s.png` (s in 13 words), `k863l_p.png` (p in 14), `k863l_az.png` (a + every letter), `k863l_dots.png`,
`k863l_q.png`, `k863l_words1..8.png` (the 232 test words). Crops viewed at full size, all in `work36/crops/`: the
word ends of az, s, p, q, dots and words1-8 (`<sheet>_<page>.png`, from endcrop_k863l.ps1), `zo_ao*` (z and o) and
`w1jumps.png` (the s of "jumps" against "over": the gap is about 50 u, v6.8's 63 u). Every tail reads as an exit
stroke that follows the curve it leaves and swoops up; "be we shoe maze huge bye" has no changed word end.

Left over:
- l's word-end stub is short and steep (v6.8's). A fix goes into l's tail form, and the locality spot list needs l.
- o's tail lifts only about 30 fu; f's tail ends below the font's tie stroke; z's tail starts with v6.8's kink.
- q's body kinks near the baseline (v6.8's body, outside the spot).
- fiji: the ij ligature keeps v6.8's pieces (K1198, held), so its i keeps v6.8's slash dot and its j has no dot.
- Q1s's rough check still FAILs on facet, by a hair: 0.006 against the 0.0053 limit (Q1 0.030). It comes from q's
  exit curvature, 0.050 /u, dropping to 0.004 /u within 1.4 u; there is no S.
- The s tail narrows the gap to the next word ("jumps over": about 50 u against 63 u) but stays clear.
