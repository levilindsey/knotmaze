# K1009 Cursive J3b: o's exit B on every join, and ot at the crossbar (v6.4)

Ledger items: K1009 (J3: ports and solved joins), K1028 (the tools J3b
starts with) and K863 (the cursive work's handle), in knotmaze
`LEDGER.md`. Read these first:
- `docs/design/K863_trace.md` `## Levi's calls`: the last five bullets
  (o's exit is a cusp, v5.8's notes, g and q's corner, o's line meets t
  at the crossbar, o's exit is J3a's B);
- `docs/design/K1009_cursive_ports.md`: `## Coordinator's calls` (they
  hold, except where this brief changes them) and `## Handoff`;
- `docs/design/K1019_cursive_b3.md`: `## Rules` and `## Handoff`;
- `.claude/probes/K863/trace/NOTES.md`: `## K1009` N5, N7, N9 and N10,
  and `## K1019` N3 and N5.
Read the rest only as needed.

## Why

Levi picked J3a's B for o's exit (2026-10-28: "B for o's exit"): o's
stroke comes to a point at its top, then runs a short way back over
itself into the exit, K976's "abrupt cusp and then slight overstroke".
Levi also picked the lowest of J3a's three heights for ot: "definitely
the lowest join to the t is best--at the crossbar".

On J3a's sheets (N9, N10), B has faults that the coordinator promised to
fix with it (K1013):
- a U-sag wherever the next letter starts at its top: oi, oj, os, ou,
  oy, and ot below the top. or's dip is wanted (K901);
- a small dip and hump into m, n, v, x and z, and a sag of a few u below
  the top into w, v, x and p;
- oe crosses e's lower curve, and its solve stopped at maxfev.

At the crossbar, B's ot sags deeper still, while A runs nearly level
into the crossbar point, as the font does (N9).

The coordinator reads two causes in the geometry. Check both first
(call 2):
1. **The exit inherits o's curve.** B's exit merges G2 with the
   overstroke, which retraces o's top. So every connector starts with
   the top's curvature, bending down, and has to dip before it can
   rise.
2. **The cusp entry forces a U.** A cusp entry ends with its tangent
   along the stem, going up (K991). From a level exit near the stem
   top's height, a curve that arrives heading up at a point no higher
   than its start must first go below that point: at least about
   R (1 - cos a) for a turn of radius R into a stem at a from level. If
   t's crossbar is no higher than o's top, ot is the same case.

B3 also left tools to fix first (K1028). The census's numbers for
solved joins were measured at a frame, not at the join; the sheets still
show the frame's.

## Coordinator's calls (technical)

1. **v6.4's base is v6.3 with B's o.**
   - Apply J3a's `work21/dbg/edit_o_k1009.py` (4 u) to
     `out23/cursive_template.svg`, giving `out24/cursive_template.svg`.
     Check that only o's stroke differs.
   - Build it with B3's build (`work23/dbg/build_k1019.ps1`, ports mode,
     o's exit variant B) into `work24/b0`. It is J3a's B on today's
     letters: the "before" in every comparison. v6.3's A build
     (`work23/base`) is the reference for everything else.
2. **Test the causes before you fix.** For each of the 26 o joins in
   b0, record:
   - the connector's curvature at its start;
   - its lowest point, against the font's join's lowest point and the
     next letter's attach height;
   - its arrival angle against the stem.

   Also read the font's own joins after o: where its line meets i, j,
   p, s, u, w, y and t, and at what angle. If the faults have another
   cause, say so and fix that cause instead.
3. **o's exit leaves from the cusp.**
   - The connector starts at the cusp at o's top. Its tangent there is
     the reverse of the arrival's (the cusp itself), and its curvature
     there is free: a solve variable, as at any deliberate cusp (K930:
     continuous curvature except at deliberate cusps).
   - The overstroke is the connector's own first few u. It stays within
     0.5 u of o's top for at least 4 u, B's overstroke: that is K976's
     "slight overstroke". It is a constraint of the solve, and the
     census checks it.
   - This replaces B's merge with a new port kind, a cusp exit (the
     mirror of the cusp entry), in a copied ports file.
   - A word-final o has no join, so it ends as B draws it.
4. **A high entry meets a stem's top at a corner.** This covers the
   cusp-entry letters after a high exit: i, j, p, s, u, w and y.
   - The connector ends at the stem's top point: two tangents at one
     point, like a's top corner (Levi likes it, K1004), and a point, as
     K939 asks.
   - It arrives from the left, level or rising, within an angle range
     you set from the font's joins and report. The stem goes down from
     that point; the stroke does not run up the stem.
   - It never crosses the stem (K991).
   - Low entries keep the cusp entry as J3a built it, and r keeps its
     dip (K901).
   - Make it a port kind for high entries, so b, v and w's exits use it
     later.
5. **ot at the crossbar, two ways, for Levi to pick by look.**
   - t's high entry meets the stem at the crossbar, 55.7 u below t's top
     (J3a's font height). Measure it along t's body from a named node,
     so an edit carries it.
   - **Tangent:** the cusp entry as K991 reads it. The connector comes
     up the stem's left side and meets it at the crossbar.
   - **Level:** a corner at the crossbar point. The connector arrives
     level or rising from the left, and the stroke turns up the stem.
   - Report each one's lowest point below the meeting point, and its
     distance to the font.
   - Low entries into t keep their stretch, [0, 55.7] u. Report where
     nt, at, it and et land.
6. **oe.**
   - Find why the solve crosses e's lower curve: the stretch [0, 90],
     the start, maxfev, the crossing allowance.
   - Fix it so oe crosses nothing beyond e's allowance and the solve
     ends by convergence.
   - K948's elbow (e's crossbar turning up into the eye's back) is the
     same join's look: report it.
7. **Every o join is solved cleanly.** This covers all 26 o pairs in
   v6.4.
   - No solve stops at maxfev. On J3a's sheets, ob, od, oe, of, ok and ol
     did (N10).
   - No attach sits at a stretch bound without a reason. In J3a, the
     after-high entries of b, f, h, k, l and e did: widen the stretch,
     or say why the bound is right.
   - on's two minima (K1014, N7: a 6.43 u jump): say whether v6.4's on
     still has them. If it does, make that solve continuous, or name why
     you cannot.
8. **K1028's tools come first.**
   - The census and the sheets measure a solved join at its own ends
     (B3's `census_k1019.py` measure; the sheets still show the
     frame's).
   - The font reference runs on along the font's stroke to the points
     that match the join's attach points, so the distance compares like
     with like.
   - Add census words holding bg and wg (subgroup, lawgiver, or
     others), and a row with vg.
   - Every build uses B3's reader with its alignment guard
     (`work23/dbg/asdrawn_k1019.py`).
9. **The checks.** As J3a's call 7, against v6.3 (`work23/base`):
   - **The census:** the worst rows, and every o and t row before (b0)
     and after.
   - **Seams:**
     - G2 at every merge;
     - at each cusp exit, the angle 180 deg within 0.01 deg, and the
       overstroke band;
     - at each corner, its two tangents, and the side: the connector
       never crosses the stem.
   - **Locality:**
     - every piece that touches neither o's exit nor t's high entry is
       byte-identical to v6.3's;
     - J2's nine edits, as J3a ran them (`NOTES.md` `## K1009` N10,
       `work21\locality_k1009.txt`).
   - **Continuity:** 20 steps each, and flag any step over 3 times the
     median:
     - o's node near the cusp moved 2 u;
     - one node near i's, u's and e's attach points moved 2 u.
   - **Determinism:** two builds, byte-identical.
   - **The look:** crop every o pair (b0 against v6.4), ot both ways,
     and the words. Name anything that hooks, elbows, sags or climbs.
10. **Sheets** (guarded SVGs in `out24/`):
    - `o_exits_v64.svg`: the 26 o pairs. Columns: the font, v6.3 (A), b0
      and v6.4.
    - `ot_v64.svg`: rows ot and knotmaze. Columns: the font, v6.3,
      tangent and level.
    - `cursive_v64_words.svg`: the census words, plus bow, woven, boxes,
      people, hippo and knotmaze.
    - `out24/cursive_template.svg`.
11. **Out of scope:**
    - g's joins (K1026), and a's and q's tops (K1029): they wait on
      Levi's K1025;
    - the other letters' exits, including b's, v's and w's high exits
      (J3c), and K1014's items not about o (the words and template
      writers among them);
    - the leads and tails (K1006), f's lower loop (K990), capitals
      (K931).

    No letter's body changes except o's, by call 1.

## Goal

- v6.4: o's exit B on all 26 o joins, without the U-sags, the dips and
  humps, or oe's crossing, and each solve clean (call 7).
- ot at the crossbar both ways, for Levi's pick.
- K1028's tools.
- The checks and the sheets.

## Order

1. `Get-Date`. Read the files above.
2. **K1028's tools** (call 8). Record them as N1.
3. **The base and the causes:** b0 (call 1), then the causes and the
   font's joins (call 2). N2.
4. **The cusp exit** (call 3), and the pairs into m, n, v, x and z. N3.
5. **The corner at a stem's top** (call 4), and ot both ways (call 5).
   N4.
6. **oe and the other o joins** (calls 6 and 7). N5.
7. **The checks** (call 9), the sheets (call 10), the Handoff.

## Rules

B3's `## Rules` hold (they build on B2's), with these changes:
- **Names.**
  - Tools are `work24/dbg/*_k1009b.py` (and `.ps1`).
  - Outputs go in `work24/` and `out24/`.
  - The record goes in `NOTES.md` `## K1009b`.
  - View images from copies in `$env:TEMP\k1009b_view\`.
  - The version is v6.4.
- **Copy shared tools; don't edit them.** These stay as they are:
  - `tools/gen_k1009.py`, `tools/sheet_k1009.py` and
    `work21/ports_k1009.json`;
  - B3's `work23/dbg/*_k1019.*`;
  - `tools/asdrawn_k980.py`.

  Changed copies take `_k1009b`. The ports go in
  `work24/ports_k1009b.json`.
- **Other agents.** K868's S3a8b4 (worktree `k868-s3a`, until about
  18:50) and K992's stage 5 (worktree `k992-corners`, until about
  18:05) take timings under the perf lock on this machine.
  - You time nothing, solve times included, so never take the lock.
  - Run one Python process at a time.
- **Stop rule:** as B2's, with this brief's Order (steps 1-7). At 1 h
  30 min:
  - finish the step you are on;
  - run the checks and build the sheets for what exists;
  - write down what is missing.
- **The final report** gives:
  - K1028's tools: what each measures now (call 8);
  - the causes: the numbers that confirm them or not, and the font's
    joins (call 2);
  - the cusp exit: its variable, its band, and the overstroke's length
    per pair;
  - the corner: its angle range, and each pair's arrival angle and
    lowest point, b0 against v6.4;
  - ot both ways: the lowest point and the distance to the font; and
    where the low entries into t land;
  - oe, maxfev, the bounds and on (calls 6 and 7);
  - the checks, and the census's worst rows;
  - the crops you looked at, and the outputs;
  - what Levi should look at, in plain words;
  - a `Ledger items` list: follow-ups and residuals. Ask Levi only
    about what shows on screen, in plain words;
  - K863's current handle fields.
