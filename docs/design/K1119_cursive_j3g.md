# K1119 Cursive J3g: b's, v's and w's exits between v6.8 and v6.9, v6.6's dip back into a and q, and e after them (v7.0)

Ledger items: K1119 (this stage), K1113 (b, v and w's exits), K1102 (the
six a/q joins), K948 (the e after o, b, v and w) and K863 (the cursive
work's handle), in knotmaze `LEDGER.md`. Read these first:
- `docs/design/K1113_cursive_j3f.md` (J3f, v6.9), its Rules, Checks,
  Outputs and `## Handoff`, which measured everything this stage starts
  from;
- `docs/design/K863_trace.md` `## Levi's calls`, to its end ("One join
  rule, from J3f on" binds this stage);
- `.claude/probes/K863/trace/NOTES.md` `## K1113` (the tools, the
  variants, the rerun commands this stage ports).

## Why

Levi, verbatim:
- On v6.8 (2026-11-02), b, v, w: "these letters--b,v,w--all have too
  much of a downward hook/cusp--it should be less down and more out".
  On the six a/q joins then: "aq: definitely 6.6".
- On v6.9 (2026-11-03), b, v, w: "Bvw exits are bad. They should still
  exit somewhat downward and with a swoosh. Id say the correct version
  is somewhere between the old and new versions. Probably closer to the
  old version."
- On v6.9's six a/q joins (ba, bq, va, vq, wa, wq: straight in, without
  v6.6's dip): "Not fine at all. We need that dip".

J3f's numbers frame it (Handoff, "The variants" and "Per letter"): v6.9
(variant S: no point, the upstroke rounds over into the exit) leaves at
about -8 deg and its joins drop about 2 u below the top; v6.8 left at
-22 / -17 / -20.5 deg on presets and dropped about 22.7 u; the font is
-15.6 / -15.6 / -12.0 deg. A-Nl (v6.8's ends with the exit stretch
[0, 20] u) is the hook: it leaves down the overstroke at -76 to -84 deg
and dips 15-18 u. The six a/q joins end on v6.6's attach point in v6.9
but arrive from above (lowest 101-104 u against v6.6's 92-99, a meet
turn of 3.8-6.0 deg against 1.2-1.3, the last half 10-18 u off v6.6's).

## Goal (v7.0)

1. **b, v and w exit between v6.8 and v6.9, closer to v6.8**: still
   somewhat downward, a smooth swoosh, without v6.8's hook or cusp. One
   exit rule for the three letters, built on J3f's rounded ends and exit
   ports (no point, no overstroke), with no per-pair data and no presets
   back. The position is chosen by the gates and by looking at the
   crops; if two positions both pass and look right, both go on the
   sheets as candidates for Levi (at most two).
2. **The six a/q joins get v6.6's dip back.** First measure how much of
   the dip the new exits bring back by themselves (J3f inferred, without
   testing, that the dip came from the dropping exit). Only then, if
   needed, a's and q's entry tangent: one rule, a letter's entry, never a
   pair's, and every join into a and q that it moves goes on the sheets.
3. **e after b, v and w** (J3f's open decision: keep v6.9's separate
   record or fold it into one e rule, which overlaps K948's oe): decided
   by the checks, with be, ve and we shown.

## The rules this applies

- **One join rule** (`K863_trace.md`, K1112): no per-pair data; a fix
  goes into a letter (its body or its ports) and is checked on every
  pair of that letter; the gates are smoothness (the census's hooks,
  spikes, rough and seams) and locality; distance to the font is
  reported per letter, not chased per pair; Levi judges one sheet per
  letter.
- **Two entry modes per letter** (2026-10-27): b, v and w are high
  exits (`HIGH = bovw`), so their joins take each letter's high entry.
- **Smooth, continuous strokes** (2026-10-27) and **smoother, then
  Levi's hand edits** (K928): body ends are placed in the template as a
  designer would place the nodes; nothing else in the template moves.
- **Cusp entries** (K991): the side test (`side_min_u`) is reported for
  every cusp entry.

## Method (technical)

1. **The swoosh ends.** `work30/dbg/mk_template_k1119.py <out.svg>
   <variant> [k=v ...]` writes out28's template (v6.8) with only the ends
   of `letter-b-s1`, `letter-v-s1` and `letter-w-s1` changed, as J3f's
   tool does, plus a rounded end that sweeps down: from J3f's P_up (the
   upstroke's arrival tangent kept) the stroke rounds over the top with
   no point and runs down and out to an end at angle A1, DROP u below
   the old point and DX u right of P_up (one or two cubics, G1 at every
   node, no inflection in the cap). One parameter set for all three
   letters. A small grid between S (v6.9: -8 deg, 3 u) and v6.8's ends
   (about -20 deg, about 17 u under the point), weighted toward v6.8.
2. **Exit ports as J3f's.** `work30/ports_k1119.json` is
   `work29/ports_k1113.json` (variant P: b, v and w exit ports, a merge
   at the body's end, stretch [0, 2] u; a's and q's after_high records
   at v6.6's attach point; e's record within 60 u) plus this stage's
   variants. Each candidate end is built with B3's build
   (`work23/dbg/build_k1019.ps1 ... -Mode ports`) and counted: the
   census on every pair out of b, v and w and the census words holding
   one, J3f's exit angle and drop per join (`solves_k1113.py`), and the
   six a/q joins against v6.6's (`aqcmp_k1113.py`'s measures).
3. **The dip.** With the chosen ends, measure the six first. If the dip
   is not back, try a's and q's arrival after high exits as one entry
   rule (the record's attach point and the arrival tangent), each try
   counted on every join into a and q.
4. **e.** be, ve and we under (i) v6.9's separate record (within 60 u)
   and (ii) one e rule (e's o record for every high exit, or one window
   for all four), with the census on every join into e from a high exit
   (oe included); the checks decide.
5. **The decision** by the census (hooks, spikes, rough FAIL,
   undesigned seams: must not rise against v6.9), locality and looks.

## Checks

J3f's checks, ported to `work30/dbg/checks_k1119.ps1 [step]`, v7.0
against v6.9:
- **Census** of v6.9 and v7.0 on J3f's words and pairs (every pair out
  of b, v and w, be, ve and we), compared: only b's, v's and w's bodies,
  the joins out of them, the joins this stage's entry rules move, and
  the words holding them may move. Hooks, spikes, rough FAIL and
  undesigned seams must not rise.
- **Locality**: `work30/base` against `work29/base`, body by body and
  piece by piece; the untouched pieces byte-identical.
- **Solves**: every pair out of b, v and w converges.
- **Determinism**: a second build and sheet, byte for byte.
- **The guard** (`work20/dbg/check_out_k990.py out30`) before the
  upload.
- **Sheets**, looked at in crops before they ship, each also rendered
  to PNG in `out30/png/`: b, v and w each v6.8 | v7.0 | v6.9 | font (the
  letter alone and every pair out of it in the census words), the six
  a/q joins v6.6 | v6.9 | v7.0, be/ve/we, and the census words that
  differ.

## Outputs

Version v7.0, in the main checkout's `.claude/probes/K863/trace/`:
`work30/` (base, variant builds, ports, censuses, logs, crops), `out30/`
(the template, the sheets, `png/`), tools `work30/dbg/*_k1119.py` (and
`.ps1`), the record in `NOTES.md` `## K1119` with the rerun commands.
The SVG sheets go to Drive `K863/` with `v70` in their names (rclone, as
J3f did); the coordinator sends Levi the PNGs.

## Order

1. `Get-Date` (07:16:57). This brief, committed first.
2. The swoosh ends: tool, grid, builds, censuses, measures; the choice
   (one or two candidates).
3. The six a/q joins on the chosen ends: measure, then a's and q's entry
   if the dip is not back.
4. e after b, v and w: the two options, the decision.
5. v7.0's template, build and ports; the checks; the sheets and PNGs;
   the crops.
6. The guard, the upload, NOTES `## K1119`, the Handoff.

## Setup

- Repo `C:\Users\lsl\Repositories\knotmaze`; the branch is
  `worktree-agent-adcba68466fb7684f` (worktree
  `.claude/worktrees/agent-adcba68466fb7684f`), at master's `236a18a6`.
- The work is untracked, in the main checkout's
  `.claude/probes/K863/trace/`. Python: `venv\Scripts\python.exe -I`;
  the font `font\PlaywriteUSTrad[wght].ttf`. `K926_FINAL_E=shear`,
  `K1009_PINS` cleared, as J3f's scripts set them.

## Rules (carried over from J3f)

- **Names**: tools `work30/dbg/*_k1119.py` (and `.ps1`); outputs in
  `work30/` and `out30/`; the record in `NOTES.md` `## K1119`; view
  images from copies in `$env:TEMP\k1119_view\`; the version is v7.0.
- **Copy shared tools; don't edit them.** Leave the earlier work folders
  and Levi's template files as they are.
- **No timing, no perf lock**; at most 4 worker processes; no
  subagents; no phone, dev server or browser.
- **Never touch the main checkout's tracked files or master, and never
  run git there** (Muse is committing on master); don't edit
  `LEDGER.md`; commit on the branch at every milestone, broken or not;
  never push.
- PowerShell for commands; code read through the shell, the Read tool
  only right before an Edit.
- **Stop rule**: at the stage's end or 2 h from the start (07:16:57, so
  09:16:57), whichever comes first (`Get-Date` at each milestone):
  commit WIP, append the Handoff, commit, report. A compaction is not a
  stop; after one, re-read this brief and `git log`. This stage is
  b/v/w, a/q and e only.

## Later work (not J3g's)

- K1112's next exits, in order c, g, j, k, l, m, p, q, r, s, t, u, x,
  y, z, one stage each, from the same exit-port rule (c is next).
- The entries after high exits: the ascenders (b, f, h, k, l on their
  100 u bound) and r's cusp (br, vr, wr's V), as entry records.
- K1006 (leads and tails), K1116's residuals, K991, K1014, K1035, K1036,
  K1044, K1090, K937, K997 and K998.

## Progress (WIP, at milestones)

- 07:59, round 1 measured. All the tools are in `work30/dbg/`:
  - `mk_template_k1119.py` variant R is the swoosh: a circular cap of
    radius R_R from P_up to the top, then one cubic down and out to the
    end;
  - `variants_k1119.ps1` builds, counts and solves each candidate into
    `work30/try_<C>/`, `work30/census/` and `work30/solves/`;
  - `aqcmp_k1119.py`, `locality_k1119.py`, `mk_ports_k1119.py` (Pe90,
    Pe60), `checks_k1119.ps1` (a draft) and `preview_k1119.py` are the
    rest.
- Round 1 candidates are R1, R3, R4 and R5. Every one beats v6.9 on the
  census of the 78 pairs and the words: spikes 29 to 26, rough 75 to
  61-66, hooks 19 and seams 7 unchanged; the bvw joins go from 3 spikes
  and 27 rough to 0 spikes and 13-18 rough.
- The solves gate: R4 is the only one where everything converges. R1
  hits MAXFEV on wu, R3 on by and wi, R5 on bp, all of them corner
  entries.
- R4's exit is too steep. Its joins leave at -29 to -34 deg, against
  v6.8's -21 and v6.9's -8. The end curvature is high and the attach
  sits 2 u back. They drop 12.5-15.4 u, against v6.8's 22.7 and v6.9's
  3-7.
- The a/q dip is only partly back with R4. The last half sits 4.6-5.2 u
  off v6.6's for a, down from 10-12, and 11.4-11.9 for q, down from
  17-18. The lowest point is 100.7 against 99 for a, and 99.0 against
  92.2-92.6 for q.
- Round 2 is running: x3, x5 and x6 have flatter, deeper ends (2 u back
  at -18.5 to -24 deg, 15-16.6 u below the top).

## Handoff

(Appended at the stage's end.)
