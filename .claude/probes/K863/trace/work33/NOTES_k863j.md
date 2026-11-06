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
[step ...]` (steps tools, template, build, ctx, base, census, cmp, det, account, c, cusp, probe, guard, sheets, png; no
step = all, in order; logs in `work33\checks_logs`; `K926_FINAL_E=shear`, `K1009_PINS` cleared).
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
- `checks_k863j.ps1` (above).
