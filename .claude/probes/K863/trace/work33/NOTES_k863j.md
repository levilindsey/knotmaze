## K863 base

J3j (base = v6.8): the approved version, v6.8 as J3e built it, made the kit's current build (K863; Levi, 2026-11-05, on
K1119's sheets: "the v6.8 versions are WAY better in all cases", and on K1197's: "the old one is better"). No join
changes: `work33/` rebuilds v6.8 by one pipeline from v6.8's inputs (`out28/cursive_template.svg`, J3e's template after
its ctx step, and `work28/ports_k990e.json`, variant M), proves it piece for piece identical to `work28/census_v68.json`,
accounts for every piece v6.9 to v7.2 moved against it, runs J3i's cusp-corner check on it and draws the reference
sheets later cards compare against. Stage agent of coordinator session 7301c55b, started 09:22:19 on 2026-11-05, cap
11:22:19. Brief `docs/design/K863_cursive_j3j.md` (branch `worktree-agent-af77097804c041b8b`). Everything below is under
this folder. The tools are `work33/dbg/*_k863j.*`; J3e's steps (template, build, ctx, census) need no port and run J3e's
tools in place (`work23/dbg/build_k1019.ps1`, `work27/dbg/ctx_template_k1027.py`, `work27/dbg/census_k1027.py`), as do
J3e's `cmpf_k990e.py` and `rowsame_k990e.py`, J3d's sheet tool, J3h's strip tool and J3e's guard; the earlier work and
out folders and Levi's templates are untouched. Rerun everything: `pwsh -NoProfile -File work33\dbg\checks_k863j.ps1
[step ...]` (steps tools, template, build, ctx, base, census, cmp, det, account, c, cusp, probe, sheets, png, sheetcol,
crops, guard; no step = all, in order; logs in `work33\checks_logs`; `K926_FINAL_E=shear`, `K1009_PINS` cleared).
The tools (`venv\Scripts\python.exe -I work33\dbg\<tool>`, from this folder; each header has its usage):
- `mk_tools_k863j.py`: writes the ports of J3i's tools: `pairs_k863j.py` (J3i's `pairs_k1112cusp.py` plus
  `seam_detail()`: every undesigned seam of each census, one line each, the cusp entries apart from the rest),
  `probe_k863j.ps1` (J3i's trial solve, with build v68 added and the default), `area_k863j.ps1` and `wtcopy_k863j.ps1`
  (the worktree copies).
- `account_k863j.py dump <ver> <base> <ports> <variant>`: every piece of one version over J3i's census words (234: the 21
  test words, J3e's pairs and words, the b, v, w and c pairs and J3i's 72 cusp pairs), drawn by the generator
  (`gen_k1027.assemble`, no reference): joins, leads, tails, every letter's strokes (with the joins at their ends) and
  e's after_o and after_g variants, as raw coefficients and Beziers (`work33/account/<ver>.json`).
  `account_k863j.py account <txt> <json>`: the account (below).
- `same_k863j.py <a.json> <b.json> <out.txt> [letters] [--dumps <a> <b>]`: two censuses row for row, NaN-aware on every
  field (rowsame's `same()`), matched by the piece's id without its word number, so censuses of different word lists
  compare; optionally only the pieces whose pair holds the letters, and the account dumps' raw coefficients beside.
- `sheetcol_k863j.py <a.svg> <col> <b.svg> <col> <out.txt>`: whether a column of one sheet draws exactly the paths of a
  column of another, row by row (each cell's x offset removed).
- `zoom_corners_k863j.py <crop.png> <out.png>`: nr's and ds's cusp corners from the corners sheet's first crop at 2x,
  approved above v7.2 (`work33/sheets/png/corners_v68_zoom_nr_ds.png`).
- `checks_k863j.ps1` (above).

### The checks

- Identity (steps template, base, cmp): the template is byte-identical to J3e's (8F72C6A8F11D8F4C). `work33/base`
  against `work28/base`: bodies.json (E056F2193B846395), join_params.json (9DF7CA3E7739EDC7) and every SVG and PNG are
  byte-identical; 11 logs and reports differ only in paths and times. `census_cmpf_v68.txt`: pieces 349, hooks 28,
  spikes 42, rough 65, seams 11, over 197 on both sides; rowsame 349 equal, 0 differ. `same_v68_v68x.txt`: J3e's census
  against `census_v68x` (J3i's word list) 347 pieces in both, all equal; `same_v68x_j3f.txt`: work29's census_v68
  against v68x 519 in both, all equal.
- Det (step det, `work33/det`): a second build from nothing: 25 files byte-identical, 8 logs differ (evar_run,
  nodes_run, params_run, review_run, words_report, words_run, two Inkscape stderr), as in J3e's det; its census 349
  equal, 0 differ.
- c against v7.0 (step c): `c_v68_v70_work30.txt` (K1119's words) 20 c pieces in both, 6 equal, 14 differ (bc, vc, wc
  and 11 in kmax_p95 only); `c_v68_v70_work31.txt` (J3h's words) 73 in both, 53 equal, 20 differ (bc, vc, wc, cb, cv,
  cw and 14 in kmax_p95 only). The dumps: 110 c pieces, 101 with equal raw coefficients; the 9 that differ are the joins
  bc, vc, wc, cb, cv, cw and c's stroke after bc, vc and wc (L2cs0). Every join out of c is v7.0's, i.e. K1197's old
  joins (cb, cv and cw differ by under 1e-4 u, numeric only); what differs is b's, v's and w's bodies beside c.
- The account (step account, `work33/account.txt`, `account.json`; dumps in `work33/account/`): 234 words, 1356 pieces
  per version; a piece moved when its resampled curve moved 1e-4 u or more, otherwise numeric only. By stage and cause
  (pieces, largest):
  - J3f (v6.8 -> v6.9): 301 moved, 81 numeric only. b's, v's or w's exit stroke 97 (17.6 u); joins out of b, v or w 78
    (88.2 u, wl); into a or q 8 (21.1 u, wq); into e 11 (47.1 u, woven's ve); the stroke after 78 (88.2 u); 29 unlisted.
  - J3g (v6.9 -> v7.0): 244 moved, 33 numeric only. Exits 97 (21.3 u); joins out 78 (21.5 u); into a or q 8 (20.4 u);
    into e 11 (30 u); the stroke after 34 (29.9 u); 16 unlisted.
  - J3h (v7.0 -> v7.1): 78 moved, 8 numeric only, all listed: c's exit 28 (9.98 u), joins out of c 31 (34.2 u, ct),
    the stroke after 19.
  - J3i (v7.1 -> v7.2): 180 moved, 68 numeric only, all listed: cusp entries 66 (7.15 u), the rule's joins 82
    (7.18 u), the exits they cut 32.
  The finding: the 45 unlisted pieces all come from b's, v's and w's new bodies as the SECOND letter of a pair, a cause
  neither stage listed. J3f: the joins into b (fb, ob; largest 0.0273 u), into v (ev, fv, ov; 0.0103 u) and into w (6;
  0.332 u), the strokes after them (b 14.3 u, v 15.7 u, w 14.4 u), e's lead out of ew (0.332 u) and f's out of fw
  (0.000384 u). J3g: b's, v's and w's strokes as the second letter (21.2, 20.5 and 20.5 u).
  Per letter (moved pieces holding it, listed / unlisted; a join by its pair, a stroke by its letter): J3f a 10/1,
  b 71/5, c 6/0, d 6/0, e 22/3, f 6/4, g 10/0, h 8/1, i 3/0, j 3/0, k 6/0, l 6/0, m 6/0, n 8/0, o 12/4, p 3/0, q 6/0,
  r 8/0, s 3/0, t 6/0, u 3/0, v 69/6, w 69/16, x 6/0, y 4/0, z 6/0. J3g a 5/0, b 71/3, c 3/0, d 5/0, e 22/0, f 3/0,
  g 5/0, h 4/0, i 3/0, j 3/0, k 3/0, l 3/0, m 3/0, n 4/0, o 12/0, p 3/0, q 3/0, r 8/0, s 3/0, t 3/0, u 3/0, v 69/3,
  w 69/10, x 3/0, y 4/0, z 5/0. J3h c 59/0, every other letter 1 to 4/0. J3i a 13, c 16, d 11, e 19, f 11, h 13, i 33,
  j 10, n 18, p 17, r 20, s 16, t 21, u 17, w 16, y 10 (all listed).
  Each version against v6.8 (moved pieces: joins, strokes; largest): v6.9 301 (108, 193; 88.2 u), v7.0 301 (108, 193;
  88.2 u), v7.1 376 (139, 237; 88.2 u), v7.2 524 (207, 317; 88.2 u).
- Cusp corners on the base (step cusp, `work33/cusp_corners.txt`; J3i's check, with `pairs_k863j.py`'s seam_detail()):
  census_v68x (J3i's 718 pieces, v6.8) has 25 undesigned seams: 19 cusp corners and 6 q$ tails (cq, fq, vq, oq, bq, wq;
  dk 10.6 /u). Every corner is an entry into r, s or i on its port at 0.00 u whose stroke retraces the join
  (port-cusp): gaps at most 5.53e-08 u, angles 180 deg or about 0. By dk: 0.0462 /u, the largest (nr, dr, and er in
  after, lawgiver and jumps over the lazy dog); 0.0436 (ds, as); 0.0256 (es); 0.0231 (er, ar, hr, ir); 0.0177 (hi in
  which); 0.00605 (es in boxes); 0.00356 (is); 0.00275 (ii, hi in hippo); 0.00137 (hi, di). v7.1 has 29 seams (23
  corners), v7.2 6 (the q$ tails). Census totals (pieces, hooks, spikes, rough, seams, over): v6.8 718, 93, 133, 189,
  25, 347; v7.1 718, 50, 77, 147, 29, 399; v7.2 718, 50, 77, 147, 6, 400.

### The sheets

`out33/`, each with a 48 dpi PNG in `out33/png/` (J3e's guard, `check_out_k990.py`, found all 10 SVGs clean;
`cursive_template.svg` is out28's): `b_v68.svg`, `v_v68.svg`, `w_v68.svg`, `aq_joins_v68.svg` and `e_after_bvw_v68.svg`
(font, approved, v6.9, v7.0); `c_v68.svg` (font, approved, v7.1, v7.2); `cusp_v68.svg` (font, approved, v7.2);
`cursive_v68_words.svg` (font, approved; 21 rows); `corners_v68.svg` (font, approved, v7.2: the cusp corners).
Approved = v6.8, this build. Red solved, blue preset, orange leads and tails, pale grey the font. Full-size crops in
`work33/sheets/png/` (area_k863j.ps1) and `out33/png/*_crop_*.png`.
Sheetcol (step sheetcol, `work33/sheets/col_*.txt`):
- b, v, w: every column (font, approved, v6.9, v7.0) draws what out30's same version draws (out30's columns are font,
  v6.8, v7.0, v6.9), 27/27 each: the approved column is v6.8 on K1119's sheets.
- aq: approved = out28's v6.8 (column 3) and out30's column 1 (labelled v6.6 there), 10/10; v6.9 and v7.0 = out30's,
  10/10.
- e: approved = out29's words sheet, column 1 (v6.8), on the 3 rows both hold; v6.9 and v7.0 = out30's, 8/8. K1119's e
  sheet has no v6.8 column to match.
- c: approved = out31's and out32's column 1 (v7.0) on 24 of 27 rows; the 3 that differ are cb, cv and cw, whose second
  letter is v6.8's. v7.1 = out31's, v7.2 = out32's, 27/27.
- cusp: approved against out32's v7.1, 56 same, 16 differ (9 c rows, 7 w rows); v7.2 = out32's, 72/72.
- words: approved = out28's column 2 on the 2 rows both hold, out29's column 1 on the 10.
What the crops show (every crop viewed, one paragraph each in `work33/crops_viewed.txt`):
- b: approved's joins out of b are blue U sags from b's small exit curl, on the font's join (bb, bf, bl, bk, bh sweep
  up to the ascender; br and bs dip deepest). v6.9's are red and near straight (br a V dip) above the font's pale U,
  from an up-tick exit; v7.0's red, a small hump at the exit, then a shallow S. v and w as b (vt and wt rise through t's
  bar; w has no lead in any column).
- c: approved's joins out of c are blue smooth rising arcs from c's bottom; v7.1's and v7.2's red, flatter along the
  baseline first (ck an S wiggle with a hump); in the cusp rows v7.2 rises straighter than v7.1. In cb, cv and cw the
  approved second letter ends in v6.8's small curl, v7.1's and v7.2's in v7.0's longer hook.
- K1197's sheets (`out32/png/c_font_cmp_v72.png`: ca, cg, ck; `c_spots_v72.png`: ca, cd, ce, ck, co, cq): the approved
  joins are the blue (old) joins there, shape for shape; the red there is v7.2's.
- a and q: approved's ba, va, wa, bq, vq, wq are blue short sags onto the bowl; oa and oq red and the same in every
  column. e: wave's ve is blue in approved, red in v6.9 and v7.0.
- The cusp rows and the corners sheet: every corner is where a red join reaches the top of r, s or i and the letter's
  stroke turns back down along it, a sharp point in both build columns, the font's shape; approved and v7.2 look the
  same there, at 2x too (`work33/sheets/png/corners_v68_zoom_nr_ds.png`: nr, the largest, and ds). The columns differ
  only in the joins out of b, v and w and in c->h, blue in approved and red in v7.2: lawgiver's w->g (near flat) and
  v->e (a U sag; v7.2 the exit hump), which's w->h (a U sag into h's stem; v7.2 rises onto h's ascender, above the
  x-height) and c->h (an arc; v7.2 low, then steep), boxes' b->o (near flat; v7.2 a wave with a hump).
- Words at full width (approved): jumps' j->u, u->m, m->p, p->s blue; over's o->v a red wave, v->e a blue U sag, e->r
  red; the's t->h blue, h->e red; lazy's l->a blue, a->z red, z->y blue; dog's d->o red, o->g a red wave; s ends with no
  tail.

### Left as found (reported, not fixed)

- The unlisted cause: b's, v's and w's new bodies moved the pieces into them and the strokes after them (45 pieces),
  in no stage's list.
- SU.g2 reads `angle_deg`; the census writes `ang_deg`, so the angle never counts there (seam_detail prints ang_deg).
- rowsame keys its rows by word number, so it compares censuses of one word list only (same_k863j drops the number).
- The word lists repeat ids: v68x has 718 rows but 713 ids, J3e's 349 rows but 347.
- The 6 q$ tails (dk 10.6 /u) are undesigned seams in v6.8, v7.1 and v7.2 alike.
- ij draws no j (K1198, held); p and s end with no tail; the i and j dots are ticks where the font's are round.
- K1119's e sheet has no v6.8 column.

Written 10:46; the stage ran 09:22:19 to 10:48, inside its cap (11:22:19).
