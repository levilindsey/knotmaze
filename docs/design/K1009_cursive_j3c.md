# K1009 Cursive J3c: o's joins from b0, og from v6.4 and ot's tangent entry, with their faults fixed (v6.6)

Ledger items: K1009 (J3: ports and solved joins), K1034 and K1030 (Levi's
picks of 2026-10-28, J3b's sheets) and K863 (the cursive work's handle),
in knotmaze `LEDGER.md`. Read these first:
- `docs/design/K863_trace.md` `## Levi's calls`: the last bullet (o's
  joins come from b0; ot meets t's stem at a tangent; og stays as v6.4
  draws it), and the K976, K991 and K1013 bullets above it;
- `docs/design/K1009_cursive_j3b.md`: `## Coordinator's calls` (calls 3
  to 8 hold except where this brief changes them) and `## Handoff`;
- `docs/design/K1029_cursive_b4.md`: `## Handoff` (v6.5, the bodies J3c
  builds on);
- `.claude/probes/K863/trace/NOTES.md`: `## K1009b` N2 to N5 and
  `## K1029`.
Read the rest only as needed.

## Why

Levi looked at v6.4's sheets (2026-10-28) and picked three things:
"b0 is the best" for the joins out of o, "Definitely tangent" for ot,
and "Yes. v64 of is better", read as og (K1034, K1030). B4 built v6.5
with variant H's joins out of o, which Levi did not pick. J3c puts what
he picked on v6.5's bodies:
- **b0's joins out of o**: `work24/b0`'s bodies with
  `work21/ports_k1009.json`'s variant B, o's exit merged G2 into the
  overstroke (K1013);
- **ot's tangent entry**, Ht: the connector climbs t's stem from its left
  side and meets it at the crossbar, 55.7 u below t's top;
- **og as v6.4 draws it**: o's cusp exit, and the attach at g's left
  shoulder, 50.5 u from g's top-right cusp.

Their known faults still get fixed (Levi's calls, last bullet):
- six solves stop at maxfev: ob, od, oe, of, ok and ol (a stop is not a
  result);
- oe crosses e's lower curve twice, one beyond e's allowance;
- a dip and a hump into m, n, v, x and z, at the s = 10 bound;
- sagging cusp entries into i, j, p, s, u, w and y (J3b's cause 2: a
  cusp entry arriving up the stem from a level exit must first go below
  its start);
- Ht's U clears t's stem by 0.0017 u (`side_min_u`): "come up to meet it
  from the one side" is true, but only by a hair.

## Coordinator's calls (technical)

1. **v6.6's base is v6.5.** Nothing about any letter body changes:
   `out26/cursive_template.svg` is `out25/cursive_template.svg`, and
   `work26/base` is its build, which must equal `work25/base` byte for
   byte. J3c changes joins only. The "before" in every comparison is b0
   (`work24/b0`, ports `work21/ports_k1009.json` variant B), plus v6.4
   (`work24/b0`, variant H) and v6.5 (`work25/base`, variant H) where a
   third column helps.
2. **One new variant, K, in `work26/ports_k1009c.json`.** The file is a
   copy of `work24/ports_k1009b.json`, made by
   `work26/dbg/mk_ports_k1009c.py`. K is variant B (b0's joins) with
   these changes, each one a visible change that goes to Levi beside b0:
   - **Convergence.** o's exit takes `maxfev` 8000, as H did. Every o
     solve ends with status 0, or the report says which does not and
     why. Report each pair's attach (stretch) against its bound: none
     sits at a bound without a reason.
   - **oe.** Find the cause of the second crossing (the stop at maxfev,
     the stretch [0, 90], the allowance). Fix it so oe crosses nothing
     beyond e's allowance. K948's elbow is the same join's look: report
     it.
   - **m, n, v, x and z.** After o, the merge stretch is [0, top] with
     J3b's tops (1.6, 3.2, 3.5, 3.5, 3.5 u): the connector attaches at
     the arch top, so the dip and the hump go. Report the stretch each
     solve takes.
   - **i, j, p, s, u, w and y.** After o, the corner entry of J3b's
     variant E, arriving within +30 to +40 deg (the font's own range),
     in place of the cusp entry. Report each pair's arrival angle and
     lowest point, b0 against K. If K keeps the cusp entry for any, say
     why.
   - **ot.** The tangent entry as Ht has it (`kind` cusp, stretch
     [55.7, 55.7] after o), plus the clearance hint of call 3. Report
     the clearance profile (call 3), b0 against Ht against K.
   - **og.** v6.4's: o's cusp exit (`cusp_exit`, 12 u, 4 u overstroke,
     0.5 u band) for this one pair, and g's attach at the shoulder,
     stretch from the junction [72.1, 87.1] (H's SHOULDER record).
     Everything else out of o stays b0's, including oo, oc, od, oa, oq,
     ob, of, oh, ok, ol and oe.
3. **A clearance hint in a generator copy.** `gen_k1009c.py` (copy of
   `work24/dbg/gen_k1009b.py`; the original stays) adds two things and
   changes nothing else, so every other solve reproduces the original:
   - `side_clear = [C, M]` in an entry's `hints`: with b the arc length
     back from the join's end in u, the connector keeps at least
     `min(M, C b^3)` u clear of the stem's side over the side test's
     range (b from 1.5 u). A G2 retrace meets the stem with matching
     tangent and curvature, so the gap grows about cubically from the
     meet, and a constant margin could not be met near the end. Start
     from C = 0.002 u^-2 and M = 0.3 u, and set them from the profile of
     Ht's connector (measure it first: its gap at b = 1.5, 2, 3, 5, 10
     u). The census reports the margin it reaches.
   - a per-pair exit record, `pins.<pair>.exit_port`, which replaces the
     left letter's exit for that pair (og's cusp exit). The cache key
     already holds the pins.
4. **The tools are copies.** `census_k1009b.py`, `sheet_k1009b.py` and
   `work25/dbg/locality_k1029.py` become `_k1009c` copies that import
   `gen_k1009c`. The shared tools, `work21/ports_k1009.json`,
   `work24/ports_k1009b.json` and B3's `work23/dbg/*_k1019.*` stay as
   they are.
5. **The checks** (as J3b's call 9, against v6.5 and b0):
   - **The census:** the worst rows, and every o and t row for b0, v6.5
     and v6.6, with status, crossings against the allowance, `side_min_u`
     and the distance to the font (`dist_max_u`).
   - **Seams:** G2 at every merge; the corners' two tangents; the
     connector never crossing a stem; the overstroke band at og's cusp;
     ot's clearance profile.
   - **Locality:** every piece that touches neither o's exit nor t's
     entry is byte-identical to v6.5's.
   - **Determinism:** two builds, byte-identical (the build and one
     sheet).
   - **The look:** crop every o pair (b0 against v6.6) and ot, and the
     words. Name anything that hooks, elbows, sags or climbs.
6. **Sheets** (guarded SVGs in `out26/`, Levi's chart stays out):
   - `o_joins_v66.svg`: the 26 o pairs. Columns: the font, b0, v6.5 and
     v6.6;
   - `ot_v66.svg`: ot and knotmaze. Columns: the font, b0, v6.5 and
     v6.6;
   - `cursive_v66_words.svg`: the census words;
   - `out26/cursive_template.svg`.

   The sheets Levi looks at go to Drive `K863/` the way B4 did (rclone
   as in `K863_trace.md`); the coordinator uploads nothing of J3c's.
7. **Out of scope** (the later stages; name them, do not start them):
   - every other exit: b, v and w high exits, and the attach into g at
     v6.3's point (K1026);
   - the joins into a and q (K1027), and J3a's, J3b's and B4's leftovers
     (K1014, K1035, K1036, K1044);
   - the leads and tails (K1006); f's lower-loop end into its exit
     (K990); K991 and K948 for the remaining pairs; K937, K997, K998;
     removing the join sets.

## Goal

- v6.6: b0's joins out of o, ot's tangent entry and og as v6.4 draws
  it, each fault of the list under Why fixed or explained.
- Every visible change shown as a picture beside b0.
- The checks and the sheets.

## Order

1. `Get-Date`. Read the files above.
2. **The base, the generator copy and the tool copies** (calls 1, 3, 4).
   Record them as N1.
3. **Variant K** (call 2): the solves, the statuses, the bounds. N2.
4. **The clearance** (call 3) and ot. N3.
5. **oe and the dips and sags** (call 2). N4.
6. **The checks** (call 5), the sheets (call 6), the upload, the
   Handoff.

## Rules

J3b's `## Rules` hold, with these changes:
- **Names.**
  - Tools are `work26/dbg/*_k1009c.py` (and `.ps1`).
  - Outputs go in `work26/` and `out26/`, in the main checkout's
    `.claude/probes/K863/trace/`.
  - The record goes in `NOTES.md` `## K1009c`, with the rerun commands.
  - View images from copies in `$env:TEMP\k1009c_view\`.
  - The version is v6.6.
- **Copy shared tools; don't edit them.** Changed copies take
  `_k1009c`.
- **Other agents.** Others take timings under the perf lock on this
  machine. You time nothing, solve times included, so never take the
  lock. Run one Python process at a time.
- **Never touch the main checkout's tracked files or master**; commit on
  your branch at every milestone, broken or not; never push.
- **Stop rule:** at the stage's end or 1 h from the start, whichever
  comes first (`Get-Date` at the start and at each milestone): commit WIP,
  append the Handoff, commit, report. A compaction is not a stop; after
  one, re-read this brief and `git log`.
- **The final report** gives: what each fix changed, with the numbers;
  the clearance profile; the checks and the census's worst rows; the
  crops looked at and the outputs; what Levi should look at, in plain
  words, with the Drive file names; a `Ledger items` list (ask Levi only
  about what shows on screen, in plain words); K863's current handle
  fields.

## Handoff
