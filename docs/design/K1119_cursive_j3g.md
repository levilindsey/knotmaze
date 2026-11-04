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
  `.claude/worktrees/agent-adcba68466fb7684f`), at master's `94e03522`.
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
- 08:17, round 2 measured; the choices made, the checks running.
  - The ends: x6 (`R_R=3 R_DX=24 R_DROP=17 R_A1=-10 R_L1=11`). Its
    joins leave at -16.0 to -16.8 deg and drop 15.9-17.3 u, about two
    thirds of the way from v6.9 (-8 deg, 3 u) to v6.8. All 78 pairs
    converge (x3 and x5 too). Census against v6.9: spikes 29 to 26,
    rough 75 to 65, hooks 19 and seams 7 unchanged. x5 (-22 deg) counts
    best but looks nearly the same, so there is one candidate.
  - The dip: x6's exits bring a's back by themselves (lowest 99.3-99.5
    u, v6.6 99.0-99.3) but not q's (97.5, v6.6 92.2-92.6). Variant Pa
    adds one rule: a band on the lowest point of a's and q's entry after
    b, v and w, [hi - 4, hi] u, with hi at v6.6's shallowest. q comes
    to 93.0 and its meet turn to 1.1-1.3 deg (v6.6 1.2-1.3).
  - e: one e rule (Pae90). e's own record after b, v and w is dropped,
    so e takes o's 90 u window after every high exit. be, ve and we go
    from rough FAIL to ok, oe is unchanged and e's eye stays open in the
    crops (smaller than the font's). Pe60 (one 60 u window for all
    four) leaves be/ve/we as they are and moves oe, so it is out.
- 08:45, v7.0's checks done (census, locality, solves, a/q, guard,
  determinism), the six sheets drawn, read in crops and uploaded, NOTES
  `## K1119` N1 to N4 written. The stage is done; the handoff follows.

## Handoff

2026-11-03 08:45: the stage is done inside the cap (started 07:16:57,
cap 09:16:57). The work is in the main checkout's
`.claude/probes/K863/trace/` (untracked): `work30/` (builds, ports,
censuses, logs, crops), `out30/` (the template, the sheets, `png/`),
the tools `work30/dbg/*_k1119.*` and the record in `NOTES.md` `## K1119`
(N1 to N4, with the rerun commands).

What moved (v7.0 against v6.9):
- **b's, v's and w's ends** (the template, variant R of
  `mk_template_k1119.py`, candidate x6: `R_R=3 R_DX=24 R_DROP=17
  R_A1=-10 R_L1=11`). From J3f's P_up the stroke rounds over the top on
  a 3 u cap with no point, then sweeps down and out to an end 15-17 u
  below the top. The joins leave at -14.9 to -17.5 deg (v6.9 about -8,
  v6.8's presets -16.3 to -22) and drop 15.5-23.6 u below the letter's
  top (v6.9 about 3, v6.8 19.6-25.9). That is about 70% of the way from
  v6.9 to v6.8. One rule for the three letters: no per-pair data, no
  presets.
- **a's and q's entry after b, v and w** (the dip, variant Pa of
  `mk_ports_k1119.py`). The exits alone brought a's dip back (lowest
  99.3-99.5 u, v6.6 99.0-99.3) but not q's (97.5, v6.6 92.2-92.6). One
  band on the join's lowest point, [hi - 4, hi] u with hi at v6.6's
  shallowest (a 99.3, q 92.6), on a's and q's after_high records.
  v7.0: a 99.3, q 93.0 (v6.9 103.2-103.8 and 101.4-102.1); the meet
  turn 1.1-1.3 deg (v6.6 1.2-1.3, v6.9 3.8-6.0); the last half 6.3-9.6 u
  off v6.6's (v6.9 10.4-17.9). oa and oq are unchanged.
- **e after b, v and w** (the e decision): one e rule. e's own record
  after b, v and w (60 u) is dropped, so e takes its one high-exit
  window, o's 90 u, after every high exit (variant Pae90 = v7.0).

The numbers against v6.9 (J3f's census words, 524 pieces;
`work30/census_cmp_v69_v70.txt`, `work30/census_sum_v69_v70.txt`):
- All pieces: hooks 31 -> 31, spikes 51 -> 48, rough FAIL 105 -> 88,
  undesigned seams 11 -> 11, over budget 315 -> 305. No gate rises.
- The 98 joins out of b, v and w: hooks 0 -> 0, spikes 3 -> 0 (be's and
  we's), rough 27 -> 10, seams 0 -> 0, over budget 98 -> 88. Font
  distance (dmax mean over the pairs) b 24.1 -> 14.5, v 22.8 -> 13.9,
  w 23.7 -> 14.3 u; the largest are now be, ve and we (40.8-42.0 u;
  v6.9's were bh, vh and wh, 55.5-56.8).
- Newly rough: the two br joins (facet 0.0038 -> 0.0113, wobble
  0.016 -> 0.030) and vq (wobble 0.0125 -> 0.018). No longer rough: 20,
  among them be, ve and we in every word (11).
- Locality PASS: all 1448 untouched pieces of 346 words are
  byte-identical (J3f's run was a strict FAIL on 157); bodies.json
  differs on b, v and w only, join_params.json not at all.
- Solves: 78 of 78 pairs out of b, v and w, no MAXFEV (max nfev 6481);
  every side test positive, the smallest bt, vt and wt at 0.010 u.
- Determinism: a second build is byte-identical in bodies.json,
  join_params.json and the template (24 of 33 files; the other 9 are
  logs holding their paths, Inkscape stderr and the as-drawn report of
  the reference layers); the aq sheet redrawn from it is byte-identical.
- Guard: ALL CLEAN on out30 and on the upload copies.

The sheets (`out30/`; PNGs in `out30/png/`; Drive `K863/`, the same
names):
- `b_v70.svg`, `v_v70.svg`, `w_v70.svg`: font | v6.8 | v7.0 | v6.9, the
  letter alone and every pair out of it.
- `aq_joins_v70.svg`: font | v6.6 | v6.9 | v7.0; ba, va, wa, bq, vq, wq,
  oa, oq, bad, wave.
- `e_after_bvw_v70.svg`: font | v6.9 | v7.0 | v7.0 with e's own 60 u
  record; be, ve, we, oe and four words.
- `cursive_v70_words.svg`: the census words with a b, v or w,
  v6.9 | v7.0.
- PNGs (48 dpi): `out30/png/<name>.png`. The crops read for this stage:
  `work30/sheets/png/zoom_{b,v,w}_0..2.png`, `zoom_aq_0.png`,
  `zoom_e_0.png`, `strip_words70_0..1.png` (`work30/dbg/strip_k1119.py`).
- Drive `K863/` (rclone, 08:36, `rclone check` 0 differences):
  aq_joins_v70.svg, b_v70.svg, v_v70.svg, w_v70.svg,
  e_after_bvw_v70.svg, cursive_v70_words.svg.

What is left:
- Levi's look at the v7.0 sheets: b's, v's and w's exits; the depth of
  the a/q dip; and which e after b, v and w (v7.0's one rule, a gentler
  wave into a smaller eye, or the e60 column, deeper and closer to the
  font).
- br, vr, wr: under the lower exits the dip into r's band is a tighter
  V (facet 0.011, wobble 0.029, 2-3x v6.9's), and br is newly rough. A
  follow-up would re-fit r's after_high band to the new exits.
- Five of the six a/q joins fail rough (ba, wa, bq, vq, wq; va passes):
  the dip's extra turn, wobble 0.018-0.019 in the q joins (limit 0.016)
  and the band ratio in ba and wa. In v6.9 they failed on facet; their
  peak |dk/ds| falls from 0.024-0.038 to 0.008-0.013.
- q's lowest is 93.0 u, 0.4 u above its band's top (the band is a soft
  penalty). The a/q joins' last half stays 6.3-9.6 u off v6.6's,
  because v6.6's preset exits leave 2-5 deg steeper and drop 3-8 u more.
- be, ve and we sit further from the font (dmax 40.8-42.0 u against
  v6.9's 29.6-30.3): e's eye is smaller than the font's.
- vl's and vt's word-end tails count one spike sample more with their
  shape unchanged (the census's sampling).
- Not taken: candidate x5 (`R_DX=22 R_A1=-15 R_L1=10`, the rest as x6)
  leaves at about -22 deg, past v6.8's mean, and counted fewer rough
  FAILs out of b, v and w on N1's words (7 against x6's 17). It is the
  option if Levi wants the exits steeper.

Next: Levi looks at the v7.0 sheets (the questions above), then the c
stage (K1112's next letter). c was not part of this stage.
