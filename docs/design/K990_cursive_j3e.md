# K990 Cursive J3e: f's corner height, f's exit port and solved joins out of f (v6.8)

Ledger items: K990 (f's lower loop: the end into its exit), K991 (cusp
entries meet the stem from one side at its tangent), K948 (e's entry
makes no elbow) and K863 (the cursive work's handle), in knotmaze
`LEDGER.md`. Read these first:
- `docs/design/K1027_cursive_j3d.md` `## Handoff` (v6.7: f's end, the
  corner question, f's preset joins and their distances);
- `docs/design/K863_trace.md` `## Levi's calls`: the bullets quoted
  under Levi's calls below;
- `docs/design/K1009_cursive_j3c.md` `## Coordinator's calls` (the
  solver, the side test, `side_clear`, `pins.<pair>.exit_port`);
- `.claude/probes/K863/trace/NOTES.md`: `## K1027` (N1-N3).
Read the rest only as needed.

## Why

v6.7 (J3d) redrew f's end (K990): the lower loop's upstroke climbs to a
designed corner 44 u high, 11.7 u right of the stem, where the traced f
turns, and the body runs down and right to the font's exit at 25.4 u.
Two things are left.

- **The corner's height.** At wght 100 the font's upstroke and its exit
  look like two lines that meet higher, at about 64 u beside the
  lead-in crossing (`bodies.json` f `font_out` starts at (43.3, 65.2) u,
  3.4 u under the crossing at (42.7, 68.5)); 44 u is where their ink
  merges. Variant C puts the corner there, near (225.7, 884.6) in the
  template, with the same end. Levi does not look at this one: the
  checks decide.
- **The joins out of f are still presets** (f has no exit port). On
  v6.7's exit frame fe, fi, fu and fy sit 14-15 u from the font, and fa
  (17.11 u) and fo (13.96) sit farther than v6.6 had them (13.88,
  9.07). The joins into i, u, y, r and t are cusp entries (K991) and fe
  is e's entry (K948).

## Scope, in order

1. **f's corner height, decided by the checks.** Build variant C: f's
   corner at about 64 u, near (225.7, 884.6) in the template (the font's
   upstroke meets its exit beside the crossing), with v6.7's end.
   Compare it with v6.7's 44 u corner (variant B) on:
   - f's body and end against the font (max distance, end point);
   - the joins out of f (ff fr fi fu fy fe ft fo fa), as presets on each
     variant's exit frame;
   - the census's seam, comb-spike and rough counts.

   Keep whichever is closer overall; the comparison table goes in the
   Handoff (Findings).
2. **f's exit port and solved joins out of f (K991, K948).** f gets an
   exit port the way J3d gave b, v and w theirs (`gen_k1027.py` reads a
   pair's own `exit_port` and `entry_port` pins). The joins out of f
   are solved with J3c's solver, honoring two rules:
   - K991: a cusp entry meets the stem from one side at its tangent,
     never crossing it;
   - K948: e's entry after a high exit makes no elbow (fe: no elbow).

   Target: every join out of f no farther from the font than v6.6's,
   and none with a hook. Each pair's distance before and after is
   recorded.

If Levi answers J3d's open look question (v6.7's six solved joins into a
and q, or v6.6's) through the coordinator and prefers v6.6's, those six
pairs get v6.6's joins back and everything else of v6.7 stays. With no
answer, v6.7's stay.

## Levi's calls this applies

Quoted from `docs/design/K863_trace.md` `## Levi's calls`:
- **f's cusp** (2026-10-28, v5.8's notes): "And yes, the f cusp to the
  exit segment needs to be fixed" (f's end, then a slight S-bend and a
  tight curl over into the exit). The model is o's exit: **o's exit is
  a cusp** (2026-10-28, K976: "The body stroke should form an abrupt
  cusp and then slight overstroke as it leads to the exit segment").
- **Cusp entries** (2026-10-28, v5.8's notes, K991): "A few letters,
  like t and p, should have the entry segment line up better over the
  vertical segment that it is joining at a sharp angle. They should
  join at a matching tangent angle. The entry segment should NOT cross
  over the vertical segment--it should instead just come up to meet it
  from the one side." Read as: a cusp entry ends with its tangent
  collinear with the stem's first tangent and stays on one side of the
  stem until it meets it. fi, fu, fy, fr and ft are cusp entries.
- **Smooth, continuous strokes** (2026-10-27: "I'm going to want our
  eventual letter strokes/threads to look smooth and continuous"): the
  solved joins leave f's end G2 and meet each entry G2 (or at the
  designed cusp), with no hook or elbow (K948's elbow into e).
- **Two entry modes per letter** (2026-10-27): "Each letter takes an
  entry from the baseline and one from higher up (after b, o, v and
  w)". f is not a high exit: its joins take each letter's baseline
  entry.
- **Junction heights** (2026-10-27, K917: "sgtm"): fa enters a's fused
  junction at 60 u, fo o's at 86 u.
- **Smoother, then Levi's hand edits** (2026-10-27, K928: "I want to
  finish iterating with you BEFORE I start hand-editing"): f's corner
  is placed in the template as a designer would place the node; nothing
  else in the template moves.

## Method (technical)

1. **Variant C of f's end.** `mk_template_k990e.py` is a copy of
   `mk_template_k1027.py` with a third candidate: the upstroke climbs
   from node 8 to a designed corner (`c` node) at about 64 u, near
   (225.7, 884.6), and the body runs down and right along the font's
   exit to v6.7's end (243.3, 923.2), tangent (0.68, 0.73). Its build
   (`work28/try_fC`, B3's reader as J3d built `work27/base`) and the
   census of the f pairs on it (presets) against v6.7's (`work27/base`).
   `fbody_k990e.py` measures each body against the traced f and the
   font's pen path out of f.
2. **f's exit port.** `work28/ports_k990e.json` (`mk_ports_k990e.py`) is
   a copy of `work27/ports_k1027.json` with variant M = L plus, for
   every pair out of f, an `exit_port` pin: f's body end merged G2 over
   a short stretch (b's, v's and w's: [0, 2] u, maxfev 8000). The right
   letter's own baseline entry stays, unless a pin is needed (an entry
   pin or a hint), and each such pin is named and reasoned.
3. **The solves.** `gen_k1027.py` as it is if it serves; a copy
   (`gen_k990e.py`) only if a rule needs a new term. Each solve reports
   status, nfev, the attach against its bound, crossings, the hook, the
   side test (`side_min_u`, K991), the lowest point and the distance to
   the font, before (v6.7 presets) and after. K948 is checked as e's
   entry turn: the largest turn over a short span where fe meets e.
4. **The variant decision** comes from step 1 on presets, then is
   rechecked once with the solved joins on both bases; if the two
   disagree, the Handoff says which and why.

## Checks

J3d's checks, ported to `work28/dbg/checks_k990e.ps1 [step]` and rerun
on v6.8 against v6.7:
- **Census** of v6.7 and v6.8 on J3d's words and pairs, compared: only
  f's body, the joins out of f and the words holding them may move;
  every other row equal. The seam, comb-spike and rough counts.
- **Locality**: `work28/base` against `work27/base`, body by body and
  join param by join param; the untouched pieces byte-identical.
- **Solves**: every pair out of f, v6.7 against v6.8.
- **Determinism**: a second build and sheet, byte for byte.
- **The guard** (`work20/dbg/check_out_k990.py out28`).
- **Sheets**, each visible change beside v6.7 and the font: f and its
  joins (`f_v68.svg`: font | v6.7 | v6.8) and the census words that
  differ (`cursive_v68_words.svg`), looked at in crops before they go
  to Levi.

## Outputs

Version v6.8, in the main checkout's `.claude/probes/K863/trace/`:
`work28/` (base, try_fC, ports, census, logs, crops), `out28/` (the
template and the sheets), tools `work28/dbg/*_k990e.py` (and `.ps1`),
the record in `NOTES.md` `## K990e` with the rerun commands. The sheets
Levi looks at go to Drive `K863/` with `v68` in their names, as J3d's
did.

## Goal

- f's corner at the height the checks pick, with the table that picked
  it.
- Every join out of f solved from f's exit port, no farther from the
  font than v6.6's, with no hook; cusp entries on one side of the stem
  (K991) and fe without an elbow (K948).
- Nothing else moves; every visible change shown beside v6.7 and the
  font.

## Order

1. `Get-Date`. This brief, committed first.
2. Variant C, its build and the comparison (N1).
3. f's exit port, the solves, the variant recheck (N2).
4. The template and build of v6.8, the checks, the sheets, the upload
   (N3). The Handoff.

## Setup

- Repo `C:\Users\lsl\Repositories\knotmaze`; the branch is
  `worktree-agent-a70bc9c2ddf155015` (worktree
  `.claude/worktrees/agent-a70bc9c2ddf155015`), from J3d's tip
  `94f751ee`.
- The work is untracked, in the main checkout's
  `.claude/probes/K863/trace/`. Python: `venv\Scripts\python.exe -I`;
  the font `font\PlaywriteUSTrad[wght].ttf`.

## Rules

J3d's `## Rules` hold, with these changes:
- **Names**: tools `work28/dbg/*_k990e.py` (and `.ps1`); outputs in
  `work28/` and `out28/`; the record in `NOTES.md` `## K990e`; view
  images from copies in `$env:TEMP\k990e_view\`; the version is v6.8.
- **Copy shared tools; don't edit them.** Leave the earlier work folders
  and Levi's template files as they are.
- **No timing, no perf lock**; at most 4 worker processes; no subagents.
- **Never touch the main checkout's tracked files or master, and never
  run git there**; don't edit `LEDGER.md`; commit on the branch at every
  milestone, broken or not; never push.
- **Stop rule**: at the stage's end or 2 h from the start (19:43:55, so
  21:43:55), whichever comes first (`Get-Date` at each milestone):
  commit WIP, append the Handoff, commit, report. A compaction is not a
  stop; after one, re-read this brief and `git log`.

## Later work (not J3e's)

b's, v's and w's other high exits; J3d's residuals (the attach points
on the lower bound, the after-high stretch [0, 90] chosen by sweep with
85 u tying); the leads and tails (K1006); K1014, K1035, K1036, K1044,
K1090; K991 and K948 for the pairs not out of f; K937, K997, K998;
removing the join sets.

## Handoff

J3e, 2026-11-02, 19:43:55 to 20:58 (cap 21:43:55), branch
`worktree-agent-a70bc9c2ddf155015`. N1, N2 and N3 are done, and so is
K1102 (Levi's answer). Everything is in the main checkout's
`.claude/probes/K863/trace/`: `work28/`, `out28/`, the tools in
`work28/dbg/*_k990e.*`, and the record with its rerun commands in
`NOTES.md` `## K990e`.

**What changed, v6.7 -> v6.8.**
- f's corner climbs from 44 u to 65 u, where the font's pen turns
  (variant C, N1 below). f's end point and end tangent are kept.
- Every join out of f (fa..fz) is solved from f's exit port: variant M
  = L plus `variants.M.f.exit` (a merge at f's end, stretch [0, 2] u,
  maxfev 8000) in `work28/ports_k990e.json`
  (`work28/dbg/mk_ports_k990e.py`). It needs four pins: fo's exit
  [0, 12] u, fv's [0, 6] u, and a 2 u lower bound on r's and s's
  entries for fr and fs (N2 below).
- K1102 (Levi, 2026-11-02, about 20:30: "aq: definitely 6.6."): J3d's
  six pins are dropped, so ba, va, wa, bq, vq and wq are v6.6's preset
  joins again.
- Nothing else moves; both locality checks PASS (Checks).

One deviation from the brief: f's exit port sits on f in variant M
(`variants.M.f.exit`), not in per-pair pins the way J3d wrote b's, v's
and w's. Every pair out of f is solved, and `gen_k1027.solve_join`
reads both forms the same way.

**The joins out of f.** These are census distances to the font (max,
u). Every v6.8 row has no hook and rough ok, and none is farther from
the font than v6.6's (`work28/ftable_k990e.txt`):

| pair | v6.6 | v6.7 | v6.8 | pair | v6.6 | v6.7 | v6.8 |
|---|---|---|---|---|---|---|---|
| fa | 13.88 | 17.11 | 9.52 | fn | 13.29 | 3.17 | 10.29 |
| fb | 16.48 | 6.87 | 3.73 | fo | 9.07 | 13.96 | 7.79 |
| fc | 19.75 | 22.78 | 9.34 | fp | 22.74 | 14.13 | 12.82 |
| fd | 13.62 | 16.69 | 9.52 | fq | 10.89 | 14.25 | 9.60 |
| fe | 22.59 | 15.34 | 13.62 | fr | 13.92 | 7.90 | 6.34 |
| ff | 16.58 | 6.96 | 3.75 | fs | 18.97 | 10.86 | 9.37 |
| fg | 12.67 | 15.87 | 9.55 | ft | 20.59 | 14.07 | 13.24 |
| fh | 17.43 | 7.39 | 6.60 | fu | 22.68 | 14.15 | 12.64 |
| fi | 22.89 | 14.13 | 12.68 | fv | 13.22 | 3.15 | 6.59 |
| fj | 22.94 | 14.16 | 12.63 | fw | 22.67 | 14.15 | 12.96 |
| fk | 17.59 | 7.44 | 6.66 | fx | 21.31 | 12.45 | 11.36 |
| fl | 16.66 | 7.02 | 3.75 | fy | 22.97 | 14.16 | 12.68 |
| fm | 13.40 | 3.23 | 6.41 | fz | 18.92 | 10.09 | 11.46 |

The same joins in words:
- after's ft: 20.55 / 14.05 / 13.21;
- coffee's fe: 22.55 / 15.31 / 13.59;
- coffee's ff: 16.55 / 6.95 / 3.72;
- quick brown fox's fo: 9.07 / 14.04 / 7.80 (J3d's v6.6 figure).

What changed against v6.7:
- fa, fc, fd, fg and fq lose v6.7's two hooks each, with their spikes
  and their rough FAIL.
- fo, alone and in quick brown fox, loses its rough FAIL.
- fm, fn, fv and fz are farther from the font than v6.7's presets,
  though still closer than v6.6's. Their solves stop on a bound (Next
  2).

**K1102: the six joins from b, v and w into a and q.** The table gives
the distance (max, u), then hooks / spikes / rough
(`work28/dbg/aqtable_k990e.py`):

| pair | v6.6 | v6.7 (J3d, solved) | v6.8 |
|---|---|---|---|
| ba | 7.61, 0 / 0 / ok | 5.19, 0 / 0 / ok | 7.61, 0 / 0 / ok |
| va | 7.56, 0 / 0 / ok | 6.94, 0 / 0 / ok | 7.56, 0 / 0 / ok |
| wa | 7.67, 0 / 0 / ok | 7.00, 0 / 0 / ok | 7.67, 0 / 0 / ok |
| bq | 9.96, 2 / 29 / FAIL | 5.63, 0 / 0 / ok | 9.96, 2 / 29 / FAIL |
| vq | 10.15, 2 / 32 / FAIL | 6.69, 0 / 0 / ok | 10.15, 2 / 32 / FAIL |
| wq | 10.15, 2 / 33 / FAIL | 6.74, 0 / 0 / ok | 10.15, 2 / 33 / FAIL |
| bad's ba | 7.59, 0 / 0 / ok | 5.19, 0 / 0 / ok | 7.59, 0 / 0 / ok |

Every v6.8 row equals v6.6's in distance, hooks, spikes, rough and
badness. `locality66` finds these joins and their strokes
byte-identical to v6.6's. With Levi's choice, bq, vq and wq take back
v6.6's two hooks and rough FAIL.

**Pins and why (N2).** The trials are in `work28/try_pins/`; NOTES
`### N2` has the details.
- **fo, exit [0, 12] u.** At [0, 2], fo sits 9.85 u from the font, over
  v6.6's 9.07. With [0, 12] it leaves f 6.92 u before the end and comes
  to 7.79 u. Giving every pair [0, 12] moves fi, fu, fy and fr farther
  from the font.
- **fv, exit [0, 6] u.** It goes from 9.92 to 6.59 u and leaves f 5.39 u
  before the end. A longer stretch moves fm, fn and fz farther, so they
  keep [0, 2].
- **fr and fs, entry lower bound 2 u** (their own entries otherwise).
  Left free, each solve runs back to the stroke's start and meets it
  reversed, an undesigned 180° seam. At 2 u they meet G2: fr at 6.34 u,
  fs at 9.37 u.

The checks the brief names:
- **K991**: every cusp entry meets the stem from one side.
  `side_min_u` is at least -0.0134, inside the 0.05 u tolerance; fj
  (-0.0001) and fw (-0.0134) are the only two below 0.
- **K948**: fe crosses once and meets e with a 0.7° turn, so it has no
  elbow.
- **The solves**: all 26 end with status 0, nfev 386 to 5664
  (`work28/solves_v68.txt`).

**The variant table (N1): f's corner, B (v6.7, 44 u) against C (65 u).** C's corner is
fitted to the font's pen path (`work28/dbg/fitC_k990e.py`): (224.62,
883.40) in the template, 65.2 u high, a 167.6° cusp; node 8, its
arrival tangent, the end and the end tangent are kept.
`fbody_k990e.py` (u):

| measure | B | C |
|---|---|---|
| traced skeleton: body -> font max | 1.02 | 8.77 |
| pen path: f's end -> pen max (mean) | 2.69 (0.49) | 0.85 (0.20) |
| pen upstroke / exit -> f's end max | 21.06 / 21.19 | 0.82 / 0.82 |
| end-region ink farther than 4.6 u from the body | 91.0 u² | 0.2 u² |
| body outside the wght-100 ink | 0.00 | 0.00 |
| end point to the font's exit | 0.06 | 0.06 |

Joins out of f as presets (census dmax, u; B -> C): ff 6.96 -> 6.61,
fr 7.90 -> 8.18, fi 14.13 -> 13.58, fu 14.15 -> 13.60, fy 14.16 ->
13.59, fe 15.34 -> 15.05, ft 14.07 -> 13.40, fo 13.96 -> 14.28, fa
17.11 -> 17.10; counts equal (43 pieces: hooks 3, spikes 6, rough FAIL
10, undesigned seams 1). Solved (ports M, f's exit [0, 2] u), C is
closer on all nine: fa 10.62 -> 9.52, fo 11.36 -> 9.85, fe 15.16 ->
13.62, fi 15.03 -> 12.68, fu 15.01 -> 12.64, fy 15.05 -> 12.68, ft
14.92 -> 13.24, fr 7.52 -> 4.23, ff 5.59 -> 3.75. Only the traced
skeleton favours B: it cuts the corner where the two strokes' ink
merges. The presets and the solved joins agree, so the recheck the
brief asks for changes nothing. C is kept.

**What Levi should look at.** All three sheets are on Drive `K863/`,
each with the grey font on the left.
- `f_v68.svg` (font | v6.7 | v6.8: f, fa..fz, of, coffee, after): In
  each row, do the right-hand f and its join into the next letter
  follow the grey font more closely than the middle ones do?
- `cursive_v68_words.svg` (font | v6.7 | v6.8: coffee, quick brown fox,
  after): Do the right-hand words' f's flow into their next letters as
  smoothly as the rest of the writing?
- `aq_joins_v68.svg` (font | v6.6 | v6.7 | v6.8: ba va wa bq vq wq,
  then oa, oq, bad and wave): Does the right-hand column's ba, va, wa,
  bq, vq and wq look the same as the v6.6 column you chose?

**Checks.** Run them with `pwsh -NoProfile -File
work28\dbg\checks_k990e.ps1 [step ...]` from the trace folder; the logs
are in `work28/checks_logs/` and NOTES `## K990e` has the run order.
- **Census** (`census_v67`, `census_v68`, `cmp`): 349 pieces each,
  J3d's words and pairs plus fa..fz.
  - 225 rows are equal in every column.
  - The distance moves in 37: the 30 joins out of f above, and the
    six's 7.
  - The other 87 differ only in the per-word curvature normalisation
    (kmax_p95; ft's and fa's tails also in the spikes it scales). One
    more, fx's tail, differs by 0.01% in its peak curvature rate.
  - The counts (pieces with), v6.7 -> v6.8: hooks 30 -> 28, spikes
    44 -> 42, rough FAIL 69 -> 65, undesigned seams 11 -> 11. None of
    those seams is on a join out of f.
  - Files: `work28/census_cmp_v67_v68.txt`, `census_cmpf_v67_v68.txt`,
    and `census_cmpf_v66_v68.txt` (the joins out of f against v6.6).
- **Locality** (`locality`, v6.7 against v6.8): PASS. bodies.json
  differs in f alone and join_params.json is byte-identical. The 1144
  untouched pieces (of 1288, in 223 words) are byte-identical. What
  moved:
  - f's strokes (59 pieces);
  - the joins out of f (32);
  - the first strokes after f (25 of 29: a solved join now attaches
    along them);
  - the six's joins and a's and q's first strokes after them (8 each);
  - b's, v's and w's strokes before a and q (5 of 8, by under
    0.0005 u).
- **Locality against v6.6** (`locality66`): PASS. The 1168 pieces
  touching neither f nor a join out of f, the six's included, are
  byte-identical to v6.6's.
- **Solves** (`solves`): all 26 pairs out of f, as above.
- **Determinism** (`det`): a second build in `work28/det/base`.
  - 25 files are byte-identical. The 8 that differ are run logs,
    words_report's two path lines and Inkscape's stderr, as for J3d.
  - The f sheet again: its SVG, report and sidecar are byte-identical.
  - After K1102, the f and words sheets were redrawn on the final ports
    into `work28/det/postK1102/`: SVGs, reports and sidecars are
    byte-identical to the uploaded ones.
- **Guard** (`work20/dbg/check_out_k990.py out28`): ALL CLEAN on 4
  files, and on the upload folder before each upload.

**Next.**

1. **b's, v's and w's exits: the next cursive stage's scope.** Levi
   wrote this on 2026-11-02, with "aq: definitely 6.6.", verbatim: "BUT,
   these letters--b,v,w--all have too much of a downward
   hook/cusp--it should be less down and more out". The exits are set
   in two places:
   - **The template's b, v and w body ends** (`out28/cursive_template.svg`,
     as in out27). These are K948's exits, drawn at b -22.0°, v -17.1°
     and w -20.5° (y up). The font's path leaves at about -13° (b and v
     -12.5 to -13.9°, w -13.2 to -14.5°), so the drawn exits are 3-9°
     steeper (NOTES `## K990`, B1's check).
   - **The joins out of b, v and w.** Apart from the six, these are
     still presets (K1104: "b's, v's and w's other high exits are still
     presets"). Their connector classes are `cnct.ful_b_*` in
     `work28/base/join_params.json` (`classes`, picked per pair by
     `pair_class`). The sheet reports name `cnct.ful_b_o` for ba, va
     and wa and `cnct.ful_b_o|q` for bq, vq and wq.

   The "before" picture is `out28/aq_joins_v68.svg`'s v6.8 column
   (= v6.6), with the crops in `work28/sheets/png/`: `zoom_aq_six.png`
   (the six rows, all four columns) and
   `zoom_exit_v68_{ba,va,wa,bq,vq,wq}.png` (each exit up close). In
   each one, the end rises to a point and the join leaves it downward
   before turning out.
2. **fm, fn, fv and fz** are farther from the font than v6.7's presets:
   6.41, 10.29, 6.59 and 11.46 u, against 3.23, 3.17, 3.15 and 10.09
   (all still within v6.6). Their attaches sit on a bound (fm 10, fn 0,
   fz 10, fv 0 u), and so does fe's (30 u). The right letters' entry
   stretches or hints, per pair, are the levers.
3. **The leads and tails (K1006).** A word-final f has no tail.
