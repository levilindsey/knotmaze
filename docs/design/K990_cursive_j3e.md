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
  `6347f873`.
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

(WIP, 20:10: N1 done, N2 under way, N3 not started.)

**N1: f's corner, B (v6.7, 44 u) against C (65 u).** C's corner is
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
merges. C is kept.
