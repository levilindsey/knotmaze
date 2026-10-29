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

## Handoff

B4 stopped at 21:07 (start 19:50:18) with Order steps 1-6 done.
Nothing committed or uploaded; the work is in the untracked
`.claude/probes/K863/trace/` (record: `NOTES.md` `## K1029`, N0-N4b,
with the commands).

- **Built.** `work25/b0_check`: v6.4 rebuilt byte for byte (N0).
  `work25/base`: v6.5, B3's reader (`work23/dbg/build_k1019.ps1`, with
  its alignment guard) on `out25/cursive_template.svg`, then gen_k1009b
  variant H. That template differs from out24's in `letter-a-s1` and
  `letter-q-s1` only, nodetypes unchanged. Tools:
  `work25/dbg/*_k1029.*`.
- **The refit (N2a-c).** As B3's g. Each top runs T -> J -> N2: T is
  the corner (point and 176 deg tangent held), J the fused junction at
  y 60 u (point held; tangent and k free, G2), N2 the end of the cubic
  past the bowl's leftmost point (point, tangent and k held, so the
  bowl past it stays whole). J takes old node 1's place, so the node
  counts and nodetypes stay. The objective is B3's: 1e6 * the integral
  of (dk/ds)^2 + 0.04 * the mean squared distance to the font's
  centreline; added, |k| non-decreasing from T to the leftmost point.
  The span runs to N2 because holding J's whole frame left a peak in
  a: its top must average |k| .0099 against J's .0087. The split is at
  J because splitting once more gave q 4.59e-4 but one node more and a
  font distance of 3.38 u (B3's g 2.82); w 0.2 gained 0.01 u. The rise
  is enforced only to the leftmost point: q's cannot rise all the way
  to N2 (a geometric obstruction, N2b).
- **The cubics (template u).** a: (292.58, 350.24) (235.12, 346.23)
  (216.44, 359.89) (204.14, 374.24) | (186.63, 394.67) (175.72,
  423.90) (177.66, 443.46) became (292.58, 350.24) (233.36, 346.10)
  (196.69, 375.37) (183.09, 410.56) | (178.43, 422.62) (176.78,
  434.60) (177.66, 443.46). q: (722.53, 1782.35) (647.23, 1777.09)
  (624.24, 1818.32) (616.96, 1833.23) | (599.16, 1869.70) (608.09,
  1886.53) (611.38, 1891.75) became (722.53, 1782.35) (671.62,
  1778.79) (629.26, 1807.95) (612.01, 1844.56) | (606.85, 1855.52)
  (600.48, 1874.46) (611.38, 1891.75). Full precision in N2c.
- **Measures, T to the leftmost point, v6.4 -> v6.5 (N1, N2c).**
  a: k at T .0030 -> .0060 /u, at J .0111 (134.3 u); the fall after
  the peak .0097 -> 0; the largest |dk/ds| 9.72e-4 -> 8.51e-4 /u^2,
  now at the hand-over to the held bowl (g's mark 7.07e-4); 45 / 90
  deg of turn at 84.8 / 162.4 -> 90.2 / 158.9 u. q: .0050 -> .0082,
  at J .0105 (134.6 u); fall .0060 -> 0; 1.75e-3 -> 5.05e-4; 89.7 /
  162.0 -> 91.0 / 158.6 u. g, unchanged: .0058; fall .0018; 7.07e-4;
  90.8 / 160.9 u. Font distance T -> N2: a mean 0.83 -> 1.85 u by
  B3's sampling (1.13 -> 2.57 uniform), max 8.03 -> 7.97; q 1.21 ->
  2.55 (1.75 -> 3.23), 9.28 -> 9.13. That is +1.02 and +1.34 against
  g's +0.49: v6.4's tops followed the font's peaked shoulder (that
  the peak is the font's own is inferred, not measured).
- **v6.5's checks (N3a-c).** Locality PASS: bodies.json differs in a
  and q only, join_params.json not at all, and the 565 of 1068 pieces
  that touch neither are byte-identical. Moved: every a and q stroke
  (4.5-6.0 u), every join into a or q (the b, v and w presets 5.1-5.6
  u, oa 5.0, oq 4.1, the joins at J .002-2.4 u, fq the largest), the
  leads of a and q (.05 / .45 u) and 10 neighbour strokes, by 2e-6 u
  at most, at their exit end. No join out of a or q and no tail
  moved. Determinism: two builds, 25 files byte-identical, the others
  differing only in path, pid and clock; the joins sheet too.
- **Census (J3b's words).** Badness 13,204.7 -> 13,194.2; seams 6,
  spikes 25, rough FAIL 47, all unchanged; the worst rows unchanged
  (oh 455.2, os 446.2, ok 441.8, tail0l 365.3, cursive ve 328.9). The
  a and q rows: oa 92.2 -> 70.8, oq 77.1 -> 63.6, bad's ba 0.3 ->
  46.3; ma, la, lead0a and lead0q change a little; an, ad, aw, az,
  at, qu, tail0a and tail0q do not. The five aq words: 1,124.1 ->
  1,143.7 (aq 34.9 -> 23.8, nq 32.8 -> 22.0, ba 0.3 -> 46.3).
- **The joins (own ends, max u, v6.3 / v6.4 / v6.5, N3a).** ba 2.52 /
  2.52 / 7.61, va 2.48 / 2.48 / 7.56, wa 2.59 / 2.59 / 7.67, bq 5.05 /
  5.05 / 9.96, vq 5.37 / 5.37 / 10.15, wq 5.27 / 5.27 / 10.15, oa 8.75
  / 12.22 / 10.08, oq 8.76 / 10.71 / 9.36. b, v and w carry their
  frames onto the rounder top, which runs up to 4.7 u inside the old
  one: they land lower and sag under the font's band (J3c, K1027). bq,
  vq and wq start with a hook in all three versions, older than B4.
- **oa and oq (N4b).** The attach rule is unchanged and the attach
  stays on its bound (s_j - 100), now 34.3 / 34.6 u from the corner,
  as the refit tops reach J in 134.3 / 134.6 u (v6.4 137.6). The flat
  top over the bowl stays; the bridge dips 4.4 / 3.4 u deeper (lowest
  6.19 -> 10.58 and 8.82 -> 12.18 u below the x-height), meeting a
  steeper top (5.8 -> 9.9 and 9.8 -> 12.8 deg). Not moved: J3c, K1030.
- **Sheets (N4, N4b).** `out25/aq_top_v65.svg`,
  `out25/aq_joins_v65.svg`, `out25/cursive_v65_words.svg` and
  `out25/cursive_template.svg`. Guard: ALL CLEAN on all four. Crops
  looked at: listed in N4 and N4b.
- **Missing.** Nothing the brief asked for. Open: a's largest |dk/ds|
  (8.51e-4) is above g's mark, at the hand-over to the held bowl; the
  joins into a and q from b, v, w and o (J3c); fa and fq moved 0.7 /
  2.4 u and are in no census word; the a and q tops sit 1.0-1.3 u
  further from the font on average.
- **Next.** Levi looks at a's and q's tops beside g's (the top sheet;
  quag and aqua in the words sheet) and at the bridges from b, v, w
  and o into them; then J3c.
- **Rerun**, from the trace dir: `pwsh -NoProfile -File
  work25\dbg\trials_k1029.ps1 "a:N2:0:0.04:1:left"
  "q:N2:0:0.04:1:left"`; `pwsh -NoProfile -File
  work25\dbg\splice_k1029.ps1 <a's svg> <q's svg>` with
  `work25\aqtop\try_<a|q>_N2_m0_w0.04_mono_left.svg` (writes
  `out25/cursive_template.svg`); `pwsh -NoProfile -File
  work25\dbg\checks_k1029.ps1 [-Only <steps>]` (build, census_v65,
  cmp_v64_v65, census_aq64, census_aq65, cmp_aq, joins_v63,
  joins_v64, joins_v65, locality, sheet_top, sheet_joins,
  sheet_words, guard, det).