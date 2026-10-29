# K1029 Cursive B4: a's and q's tops curve evenly, like g's (v6.5)

Ledger item: K1029 in knotmaze `LEDGER.md`; the stream's handle is
K863. Read these first:
- `docs/design/K863_trace.md` `## Levi's calls`, the last bullets: g
  and q take a's top-right corner, and g's new top is right;
- `docs/design/K1019_cursive_b3.md`: call 5, `## Rules` and `## Handoff`
  (g's refit, its measures and the alignment guard);
- `.claude/probes/K863/trace/NOTES.md`: `## K1019` N4 and N6;
- `docs/design/K1009_cursive_j3b.md` `## Handoff`: the v6.4 build, its
  tools and its checks; `NOTES.md` `## K1009b` (N1-N7) has the commands.
Read the rest only as needed.

## Why

Levi likes g's new top (2026-10-28: "G new top looks good"). B3 refit
it so its curvature rises evenly from the corner into the bowl (largest
|dk/ds| 6.66e-3 -> 7.07e-4 /u^2).

a's and q's tops are not even (B3's N4 and N6). |k| peaks at their
first node and then drops on the way to the bowl: a .0173 -> .0081 /u,
q .0121 -> .0074 /u. Beside g's even top the three no longer match, and
g and q were given a's corner so that they would (K1012).

## Coordinator's calls (technical)

1. **The base is v6.4, and it is whole.** v6.4 is `work24/b0`'s bodies
   with `work24/ports_k1009b.json` variant H (J3b's Handoff); b0 was
   built through B3's reader `work23/dbg/asdrawn_k1019.py`
   (`work24/b0_build.log`). J3b left locality unverified, and the
   coordinator's rerun passed (`work24/locality_k1009b.txt`): the 380
   pieces o's exit leaves alone are byte-identical, J2's nine edits move
   no untouched piece, and its one flag (e_end's drag gain on woven's en
   join) is en's two minima (K1014).
   - Start from J3b's `out24/cursive_template.svg` and change only the
     template.
   - Build v6.5 as v6.4 was built: the bodies through B3's reader, then
     J3b's `work24/dbg/gen_k1009b.py` with variant H.
   - Measure with J3b's `census_k1009b.py`, `sheet_k1009b.py`,
     `locality_k1009b.py` and `checks_k1009b.ps1` (`work24/dbg/`),
     copied as `_k1029` where one needs a change.
2. **Refit a's and q's tops as B3 refit g's** (B3's call 5, N4).
   - Hold the corner: its point and both tangents. Levi likes a's
     corner (K1004), and g and q took it (K1012).
   - G2 at every other joint. The bowl past the refit span, the
     junction (y 60 u) and the stem stay where they are.
   - Copy `gtop_k1019.py` for a and q; choose the span, the split and
     the weights per letter, and give the reason.
3. **The measures,** for a, g and q, before (v6.4) and after (v6.5),
   along the top from the corner to the bowl's leftmost point:
   - |k| along the arc: it rises from the corner and holds, with no
     peak before the bowl. Give k at the corner and at each node;
   - the largest |dk/ds|; g's v6.3 value, 7.07e-4 /u^2, is the mark;
   - the arclength to 45 and to 90 degrees of turn (g: 90.8 / 160.9 u);
   - the distance from the font's letter over the refit span, mean and
     max. g's refit added 0.49 u to the mean: if a's or q's grows more,
     say why.
4. **Only a and q move.** g and every other letter in the template stay
   byte-identical to v6.4's.
5. **Nothing moves by accident.** Build with B3's reader
   (`work23/dbg/asdrawn_k1019.py`) and its alignment guard, as v6.4 does (B3's N5: a refit that adds a node can
   make the written and drawn node counts equal). List every piece that
   moved against v6.4 and why. Pieces that touch neither a nor q are
   byte-identical.
6. **The joins into a and q move with their tops: report them, don't
   fix them.** Give ba, va, wa, oa, bq, vq, wq and oq, each one's
   distance from the font in v6.3, v6.4 and v6.5, measured at the join's
   own ends as J3b's census does. J3c solves these joins (K1027). The
   joins into g stay where v6.3 lands them (Levi likes b's and v's,
   K1026), and og is J3b's (K1030).
   oa and oq keep the 37.6 u bound and a flat top over the bowl in v6.4
   (J3b's Handoff, "Fused"), while c, d, g and o attach at the bowl's
   left shoulder. Say whether v6.5's tops change that, with a picture,
   but don't move their attach: if Levi takes og's (K1030), J3c gives
   oa and oq the same.
7. **Checks** against v6.4:
   - the census: the worst rows, and every row with a or q;
   - locality (call 5);
   - determinism: two builds, byte-identical.
8. **Sheets** (guarded SVGs in `out25/`):
   - `aq_top_v65.svg`: a, g and q in v6.4 against v6.5, whole and zoomed
     on the top, with the curvature drawn as a comb, as B3's
     `g_top_v63.svg`;
   - `aq_joins_v65.svg`: call 6's joins in v6.4 and v6.5, the font's
     joins in grey;
   - `cursive_v65_words.svg`: J3b's census words, plus aqua, equal,
     banquet, quag and squad;
   - `out25/cursive_template.svg`, which becomes Levi's file to edit.
9. **Out of scope:** o, g's body and the joins into g (K1026, K1030),
   the joins into a and q themselves (J3c, K1027), the other exits
   (J3c), K1014, the leads and tails (K1006), f's lower loop (K990) and
   capitals (K931).

## Goal

- `out25/cursive_template.svg`: a's and q's tops refit; nothing else
  differs from `out24`'s.
- v6.5 (`work25/base`), with its census, locality and determinism
  checks (call 7).
- The measures (call 3), the joins (call 6) and the sheets (call 8).

## Order

1. `Get-Date`. Read the files above. Rebuild v6.4 as call 1 says and
   check that it matches J3b's, byte for byte.
2. Measure a's, g's and q's tops in v6.4 (call 3). N1.
3. Refit a and q (call 2) and write the template. N2.
4. Build v6.5. Run the locality check, the census, the joins and the
   determinism check (calls 5 to 7). N3.
5. Build the sheets, guard them, then crop and look. N4.
6. Append the handoff and report.

## Rules

B3's `## Rules` hold (they build on B2's), with these changes:
- **Names.**
  - Tools are `work25/dbg/*_k1029.py` (and `.ps1`).
  - Outputs go in `work25/` and `out25/`.
  - The record goes in `NOTES.md` `## K1029`.
  - View images from copies in `$env:TEMP\k1029_view\`.
  - The version is v6.5.
- **Copy shared tools; don't edit them.** Everything J3b and B3 wrote
  (`work24/`, `work23/dbg/*_k1019.*`), `tools/*` and the ports files
  stay as they are. Changed copies take `_k1029`.
- **Other agents** may take timings under the perf lock on this
  machine. You time nothing, so never take the lock. Run one Python
  process at a time.
- **Uploads and the guard.** Upload nothing: the coordinator uploads
  the sheets. Every sheet passes the guard (no `<image`, `data:`,
  `href`, `chart`, `.jpg`, `.png` or `base64`), and Levi's chart
  (`ref/chart.jpg`) stays out of every sheet.
- **Stop rule:** as B2's (2 h from your start), with this brief's Order
  (steps 1-6). At 1 h 30 min:
  - finish the step you are on;
  - build the sheets for what exists;
  - write down what is missing.
- **The final report** gives:
  - the refit: the cubics before and after, per letter, and the reason
    for each span and split;
  - call 3's measures for a, g and q, before and after;
  - call 6's joins in v6.3, v6.4 and v6.5;
  - the locality and determinism checks, and the census's worst rows
    and its a and q rows;
  - the crops you looked at, and the outputs;
  - what Levi should look at, in plain words;
  - a `Ledger items` list: follow-ups and residuals. Ask Levi only about
    what shows on screen, in plain words;
  - K863's current handle fields.
