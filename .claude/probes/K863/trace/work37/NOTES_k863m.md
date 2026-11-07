## K863 J3m: b, v, w cusp exits, o and f word-end tails

J3m (b, v and w's cusp exits; o's and f's word-end tails): Levi's answer to card K1225 picked J3l (s and p stay as
J3L) and asked for three changes. b, v and w, at a word's end and into a letter that enters high: keep a cusp, turn
out of it about ESE, then swoop gradually up; into a letter that enters low: keep v6.8's sharp downward cusp, but
start the outward swoop later; any other letter with the same cusp gets the same. o at a word's end: the tail follows
the o's curve further down and leaves it about 10 deg further round. f at a word's end: the tail reaches the baseline
before it turns up, and leaves the cusp close to the line of the stroke into it, so the two fuse into a spur. v6.9's
flaws stay out: a straight climb into b, f, h, k and l; br, vr and wr meeting r's cusp in a V; small spikes in be
and we. Built as one candidate, J3M (`work37/cand/J3M`), on J3L (`work36/cand/J3L`; ports `work28/ports_k990e.json`,
variant M) through `gen_k863m`: gen_k863k plus the forms a join_params file names under "k863m" (without that key
every output is gen_k863k's, object for object). No variant. Nothing in `src/` or `test/`; no body and no per-pair
data changes (K1112): each form is a letter's word-end form or its exit by the next letter's entry class. J3L stays
everywhere else (s, p, the D2 dots, q's Q1s; c, m and u keep v6.8's presets). Stage agent of coordinator session
c18e2f02 (Claude session 01TnQvxftruF6gxzRe3bigQ6), started 07:10:10 on 2026-11-06, cap 09:10:10. Brief
`docs/design/K863_cursive_j3m.md` (branch `worktree-agent-a48ef22ec84a4a83c`, which holds copies of the tools, both
specs and this entry). Everything below is under this folder. Rerun everything:
`$env:K863M_SPEC = "work37\k863m_v2.json"; pwsh -NoProfile -File work37\dbg\checks_k863m.ps1 [step ...]` (steps
cand, local, cens_c, sheets, words, png; no step = all, in order; logs in `work37\checks_logs`; `K926_FINAL_E=shear`,
`K1009_PINS` cleared; without `K863M_SPEC` it builds v1). Its Batch is J3l's (at most 2 of the kit's Python jobs
machine-wide while `$env:TEMP\claude-perf.lock` exists, 4 otherwise).

The entry classes (the next letter's; in v6.8 the join out of b dips to a lowest point of 57-74 u before it climbs
into a low letter, 85-104 u into a high one):
- low: e h k r s.
- high: a b c d f g i j l m n o p q t u v w x y z.
- The same cusp (a point, a reversed overstroke, then the swoop) is b's, v's and w's only. o's top cusp is its own
  (a cusp exit, another shape) and is unchanged.

The candidate (`work37/cand/J3M/join_params.json`; bodies = J3L's = v6.8's) = J3L's join_params + `k863m_v2.json`
under "k863m" (mk_cand_k863m.py, which removes J3L's "k863k" fins of b, f, o, v and w: a letter has one word-end
form). `k863m_v1.json` was the first spec; v2 differs only in f's tail (ymin 4 at the default weight -> ymin 0 at
weight 1e4), which took its lowest point from 39.2 fu to 0.2 fu (J3L's: 79.5 fu). Every tail's and join's prm is
fitted at build time: the fit is the rule; `work37/cache_k863m.json` (keyed by the two frames, not by x) only saves
time.

What changed, per letter (J3M against J3L; every join keeps J3L's entry frame, so the next letter and every other
piece are J3L's, the join ends 0.00 fu apart):
- b, v, w into a high letter: the stroke cut at (cubic -3, t 1), the point; the join leaves it as a corner at
  -22.5 deg (ESE), curvature 0, and is the fairest G2 quintic to the entry frame (v6.8's and J3L's: a preset). Over
  all high pairs it drops 14.4 u below the top before it climbs, lowest point 107.8 u (v6.8: 22.8 u, 99.4 u).
- b, v, w into a low letter: cut at (cubic -2, t 1), which keeps v6.8's sharp downward cusp, then 12 u of retrace
  along cubic -4 on the letter's own centreline before the fairest G2 quintic parts from it: the swoop starts later.
  Drop 56.5 u, lowest point 65.7 u (v6.8: 56.4 u, 65.8 u).
- b, v, w at a word's end: cut at (-3, 1); the tail leaves as a corner at -22.5 deg and swoops up to 30 deg, its end
  about 165 fu right of the point and 15 fu below it (b (675.6, 494.2), v (663.8, 494.4), w (949.3, 494.0) fu).
- o at a word's end: cut at (-1, 1); the tail first runs 10.04 u back along cubic -3 on the o's own centreline
  (further down the o's curve), parts G2 there and rises to 25 deg, ending at (560, 526) fu.
- f at a word's end: cut at (-2, 1); the tail starts as a spur (the stroke's own direction reversed, rev 0 deg),
  runs back down beside the stroke into the cusp to the baseline (lowest point 0.2 fu) and turns up to 40 deg,
  ending at (444.55, 150.67) fu.

The tools (`venv\Scripts\python.exe -I work37\dbg\<tool>`, from this folder; each header has its usage):
- `gen_k863m.py`: the k863m forms. fin: a word's last letter cut at (cubic, t), an optional retrace back along its
  own cubic, a start frame (the cut's own G2 frame; a corner at an angle; or a spur, the stroke's direction
  reversed and turned by deg) and the fairest G2 quintic tail to the end frame, its lowest point optionally held at
  ymin. exit: every preset join out of the letter (a solved port join is left alone), cut and retraced the same way
  by the next letter's entry class, then the fairest G2 quintic to the join's own entry frame. The fit is J3l's:
  the least integral of (dk/ds)^2 times length cubed, a0, a1 in [0.15, 3], no more curvature sign changes than the
  two end frames force.
- `census_k863m.py`: J3k's census through gen_k863m, plus one rule: a k863m corner or spur start is a corner by
  design (its seam reads "exit X (k863m corner start)" or "(k863m spur start)"), measured with a free start, as a
  cusp exit is.
- `mk_cand_k863m.py <base dir> <out dir> <k863m.json>`: a candidate's inputs. `sheet_k863m.py`: J3k's sheets
  through gen_k863m. `joins_k863m.py <build> <ports> <variant> <letters> [<gen>]`: the joins out of given letters
  into a..z (class, source, frames, lowest point, turn).
- `local_k863m.py`: J3M against J3L over the 232 test words, piece by piece, exactly. `climb_k863m.py <out.txt>
  [letters]`: v6.9's three flaws measured on the joins out of b, v and w into a..z, for v6.8, J3L and J3M.
- `checks_k863m.ps1`: every step above. `wordcrop_k863m.ps1` (call it in-process with `&`): J3l's endcrop plus
  `-Tile`, which cuts each row into windows of `-Width` px with a 24 px overlap, so a long word is seen whole.

Checks:
- Locality (`work37/local_J3M.txt`; 232 words, 148 port pairs, 277 s): 270 pieces in the spot differ, in 113 words
  (strokes 135, joins 97, fin tails 38); 0 outside it.
- Census on the 113 changed words (`work37/census_cmp.txt`; census_k863m.py, 405 rows in each of v6.8 through
  gen_k863m, J3L and J3M). In the spot: 97 joins (72 into a high letter, 25 into a low one) and 38 tails (b 6, f 6,
  o 7, v 6, w 13). Outside it no row changes its length, badness, font distance, seams or source; only kmax_p95
  (268 rows) and spikes (11 rows) move, both scaled by the word's p95 curvature, which a changed join moves.
- The changed joins: J3M's 97 read spikes 0, rough FAIL 0, hooks 0. J3L's (v6.8's presets) read up to 46 and 61
  spikes, 22 and 25 rough FAILs, 18 and 25 hooks (high, low), but those come from how a preset join is sampled, not
  from its ink: they are no measure of v6.8's look.
- The tails: b, v, w rough ok (J3L's FAIL); f ok in both; o FAILs rough in all 7 rows in both, J3M on the band term
  (facet 0.009, wobble 0.025), J3L on wobble (0.011).
- v6.9's flaws (`work37/climb_v2.txt`, climb_k863m.py: the drop below the top, the lowest point and the climb's bow,
  its largest distance from its chord over the chord's length, 0 = straight; J3M, v6.8 in brackets):
  - into b f l: bow 0.141 [0.132, 0.149] (0.158), drop 11.0 u (35.2), lowest point 111.2 u (87.0), kmax 0.031 /u.
  - into h k: bow 0.114 [0.108, 0.119] (0.112), drop 55.7 u (51.3).
  - into r: bow 0.133 (0.100), lowest point 72.8 u (65.9), kmax 0.048 /u; r's entry seam is v6.8's, r's own cusp
    at 165.4 deg. No V.
  - be, ve, we: spikes 0, kmax_p95 0.41-0.49, rough ok; the drop into e is v6.8's, 65.3 u.
  - largest curvature over all pairs: high 0.067 /u, low 0.048 /u.

Sheets (`out37/*.svg`, PNGs at 144 dpi in `out37/png/`; font | approved (v6.8) | J3l | J3m, inked at 9.2 u; all
from v2): `k863m_b_high.png`, `k863m_v_high.png`, `k863m_w_high.png` (b, v, w into every high letter),
`k863m_bvw_low.png` (into e h k r s, plus brown, over, lower, abs, awe, ivy), `k863m_bvw_end.png` (18 word ends),
`k863m_o_end.png` (14), `k863m_f_end.png` (12), `k863m_words1..8.png` (the 232 test words). Show first: bvw_end,
f_end, bvw_low. Crops viewed at full size, all in `work37/crops/` (wordcrop_k863m.ps1): the high and low sheets'
rows (`k863m_*`, `w470_*` at 470 px, `w470R_lowwords`), v6.8's b joins (`look_b68_*`), and from the v2 PNGs
`v2_bf`, `v2_vf`, `v2_wf`, `v2_f_end_1-4`, `v2_o_end_1-3`, `v2_bvw_end_1-4` and the tiled words
`v2_words1/2/3/6/7/8_*` (words4 and words5 hold only b, v and w pairs, the pair sheets' rows). Every J3m spot reads
as Levi described: b, v and w leave the point ESE and swoop up gradually, into the ascenders on a curve, not a
straight climb; into e h k r s the sharp cusp stays and the swoop starts later, with no V into r and no spikes in be
or we; f's tail runs down along the stroke to the baseline, then up; o's tail leaves further round, up and right at
about 25 deg.

Spots to name to Levi (each is what the rule gives, none is per pair):
- into the round letters a c d g o q (ba, bg, bq, wa, wc, wd, wg, wo, vq, wq...): a straight ESE run, then a turn
  up into the letter, a check-mark. Smooth (kmax 0.025-0.041 /u).
- into m, n, v, x (bm, bn, vm, vn, wm, wn, vv, wv, wx): a small hammock about 12 u deep, a slight wave; the tightest
  turns (kmax 0.067 /u).
- into p (bp, vp, wp): a flat hammock, then a steep climb at the end.
- into every high letter J3m dips much less than v6.8 (lowest point 111 u against 87 u into the ascenders), by
  design; into r the low join dips about 7 u less than v6.8's (72.8 u against 65.9 u).
- o's word-end tail: a small notch where it parts from the o, a tighter turn than J3l's near-tangent exit.

Left over:
- J3M waits on Levi's look (a card), then goes into the kit's build or gets adjusted.
- If Levi reads the check-mark, the m/n/v/x wave or the p hammock as flaws: each is a change to the high exit form
  (its angle, or a second frame), not to per-pair data.
- o's tail: the notch, and its rough FAIL, which J3L's tail had too (J3L on wobble, J3M on the band term).
- f's spur was viewed only at the sheets' 9.2 u pen, where its two sides fuse.
