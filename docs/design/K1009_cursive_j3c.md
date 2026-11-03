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
     stretch from the junction [71.6, 86.6] (H's SHOULDER record).
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

J3c stage agent (coordinator session 7301c55b), 2026-11-02 16:31-17:25. Branch `worktree-agent-a396032821cae8823`, worktree
`.claude/worktrees/agent-a396032821cae8823`; nothing pushed. Everything else is in the main checkout's untracked
`.claude/probes/K863/trace/`: `NOTES.md` `## K1009c` (N1-N5, rerun commands), `work26/`, `out26/`, tools `work26/dbg/*_k1009c.*`.

**What changed** (v6.6 = v6.5's bodies, joins only; variant K in `work26/ports_k1009c.json`):
1. **Convergence.** o's exit takes maxfev 8000: all 26 o solves end status 0 (b0 stopped at maxfev on ob od oe of ok ol; the largest
   is oy at 6125 evaluations).
2. **oe.** The second crossing was not on the picture: o's overstroke retraces the oval's top and the connector peels off it tangentially, which
   the crossing test counted. `pins.oe.xl_skip_u = 45` (the first 45 u are not tested against o's own body): 1 crossing of 1 allowed, converged
   in 534 evaluations. Its look: a straighter descent than b0's, dmax to the font 12.74 u (b0 4.97). Stiffer weights changed nothing.
3. **m n v x z.** After o the merge stretch is [0, top]: the connector attaches at the arch top (om 1.60, on 3.20, ov 3.50, oz 3.50, ox 0.00),
   the hump is gone. dmax to the font (b0 -> v6.6): om 7.45 -> 2.58, on 6.50 -> 2.78, ov 6.56 -> 2.95, ox 19.11 -> 12.29, oz 16.05 -> 14.60.
   The dip before the arch is deeper than b0's (om lowest point 106.0 u, b0 112.1).
4. **i j p s u w y.** A corner entry (+30..+40 deg) in place of the cusp entry: the lowest point is 104.8-105.6 u (b0's sagging cusp
   entries 90.5-95.1 u). dmax: oi 12.27 -> 2.56, oj 16.57 -> 2.54, oy 12.35 -> 2.53, ou 14.77 -> 2.59 (op 3.03 -> 2.72); os 27.08 -> 36.17 is
   the exception. Six corners arrive at the +40 deg bound (oi oj os ou ow oy); op at 36.2 deg with side margin -0.05 (the test's tolerance edge).
5. **ot.** The tangent entry at the crossbar (55.7 u below t's top) with `side_clear [0.002, 0.3]`: clearance min 0.0154 u (Ht 0.0017 u),
   1.43 u at b = 10 u, 6.47 u at b = 20 u; 0 crossings; it sags 19.5 u under the x-height (lowest 100.47 u; b0 13.9 u under). Table: N3.
6. **og.** v6.4's: o's cusp exit (12 u, 4 u overstroke, 0.5 u band) and the attach 50.48 u from g's top-right cusp (identical to v6.5's og).
The rest of the census, locality (942 untouched pieces byte-identical to v6.5's) and determinism hold (N5).

**What Levi should look at** (Drive `K863/`, each is a guarded SVG; columns: the font, b0, v6.5, v6.6):
- `o_joins_v66.svg`: the 26 joins out of o. (a) Rows oi oj op os ou ow oy: does the connector now read as a level run into the stem's top
  where b0 sagged like a hammock? (b) Rows om on ov ox oz: the S now meets the arch at its top, no hump, but it dips deeper first: better?
  (c) Row oe: v6.6's S descends straighter than b0's and sits above the font's swoop (b0 hugged it): which does he prefer?
  (d) og is v6.4's, as he picked.
- `ot_v66.svg`: ot and knotmaze. The connector comes up to t's stem from the left and meets it at the crossbar, after dipping lower than b0's:
  is that dip too deep for "definitely tangent"?
- `cursive_v66_words.svg`: the 21 census words, v6.5 beside v6.6, for the o and t joins in words.

**Checks** (`pwsh -NoProfile -File work26\dbg\checks_k1009c.ps1 [step]`, from the trace folder; steps build census_v66 cmp_b0_v66 cmp_v65_v66
locality sheet_o sheet_ot sheet_words guard det; one Python at a time): census 252 rows (undesigned seams 6, spikes 25, rough FAIL 47: as v6.5;
worst rows ol tail 365.3, os 336.7, cursive ve 328.9, oh 323.2, ok 322.8); seams G2 at every undesigned o seam; locality PASS; determinism
PASS (25 files byte-identical, 8 differ by path/pid/clock; the o sheet byte-identical); guard ALL CLEAN. Clearance:
`venv\Scripts\python.exe -I work26\dbg\clearance_k1009c.py work26\clearance_ot.txt`.

**Next:**
1. Levi's picks from the pictures above: oe's shape, ot's dip and clearance (C in `side_clear` is the knob), the +40 deg corners.
2. The rest of the stage list (call 7): every other exit (b, v, w high exits; into g at v6.3's attach, K1026), the joins into a and q (K1027),
   K1014, K1035, K1036, K1044, leads and tails (K1006), f's lower-loop end (K990), K991 and K948 for the remaining pairs, K937, K997, K998,
   removing the join sets. The ascender attaches ob of oh ok ol still sit at their [0, 100] bound and oe at [0, 90] (as b0; J3b found widening worse).
3. The coordinator merges this branch after the Muse round and updates K863's handle; os (36.2 u), oh and ok (34.8 u) are the o rows farthest from the font.