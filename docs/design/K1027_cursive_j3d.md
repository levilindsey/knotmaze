# K1027 Cursive J3d: solved joins from b, v and w into a and q, and f's cusp into its exit (v6.7)

Ledger items: K1027 (a's and q's preset high joins), K990 (f's lower
loop still ends in a curl) and K863 (the cursive work's handle), in
knotmaze `LEDGER.md`. Read these first:
- `docs/design/K863_trace.md` `## Levi's calls`: the bullets quoted
  under Levi's calls below;
- `docs/design/K1009_cursive_j3c.md`: `## Coordinator's calls` and
  `## Handoff` (v6.6, the joins J3d builds on, and its checks);
- `docs/design/K1029_cursive_b4.md` `## Handoff` (the ba ... wq numbers
  and the hook) and `docs/design/K990_cursive_bodies.md` (f, lines 38
  to 43, and the B1 edit of f);
- `.claude/probes/K863/trace/NOTES.md`: `## K1029` N3a and N4, and
  `## K1009c`.
Read the rest only as needed.

## Why

Two faults are left in v6.6 that J3c's machinery can now fix.

- **K1027.** b, v and w have no exit port, so their joins into a and q
  are k962 presets (class `cnct.ful_b_o`, "fused (after_b)"). After
  v6.5's rounder tops of a and q they sit far from the font: ba, va and
  wa 7.6-7.7 u (2.5-2.6 in v6.4), bq, vq and wq 10.0-10.2 u (5.0-5.4),
  and bq, vq and wq start with a hook of about 160 deg (since v6.3).
  J3c's solved joins (o's into a and q, `oa`, `oq`) attach at a's and
  q's fused port at 60 u; J3d solves b's, v's and w's joins the same
  way.
- **K990.** f's lower loop still ends in a tight curl below the
  crossing, not a cusp into its exit: the upstroke rounds over at about
  44 u and turns down into the exit. The font's upstroke climbs to
  about 44 u, 11.7 u right of the stem, and turns there in a sharp
  corner into the exit, which runs down and right, dips to about 16 u
  and rises into the next letter (`work13/trace/traced.json` `f`). Its
  joins out of f sit far off the font: fe 22.55 u, ff 16.55, fo 9.07.

## Levi's calls this applies

Quoted from `docs/design/K863_trace.md` `## Levi's calls`, and the
coordinator's message of 2026-11-02:
- **Two entry modes per letter**: "Each letter takes an entry from the
  baseline and one from higher up (after b, o, v and w)". ba, va, wa,
  bq, vq and wq take a's and q's high entry, as oa and oq do.
- **Junction heights** (2026-10-27, K917: "sgtm"; "Seems better than
  the other two sets"): a's and q's fused junction sits at 60 u. The
  solved joins attach to the fused port there.
- **Smooth, continuous strokes** (2026-10-27: "I'm going to want our
  eventual letter strokes/threads to look smooth and continuous"): the
  solved joins leave b, v and w G2, with no hook.
- **g and q take a's top-right corner** (2026-10-28: "I think we need g
  and q to have the same top right corner treatment as a"): the joins
  into a and q stop at the fused port and leave the corner alone.
- **o's exit is a cusp** (2026-10-28, K976: "The body stroke should form
  an abrupt cusp and then slight overstroke as it leads to the exit
  segment"), the model for f's end, and **f's cusp** (2026-10-28, v5.8's
  notes): "And yes, the f cusp to the exit segment needs to be fixed"
  (f's end, today a slight S-bend, then a tight curl over into the
  exit).
- **Smoother, then Levi's hand edits** (2026-10-27, K928: "I want to
  finish iterating with you BEFORE I start hand-editing"): f's end is
  redrawn in the template, as a designer would place the nodes; nothing
  else in the template moves.
- **o's joins stay as v6.6 draws them** (2026-11-02, K1089's four look
  calls: "1. V6.6 seems best / 2. Seems good / 3. Seems good / 4. V6.6
  seems best"): o into i and j (and p s u w y) keeps v6.6's level run
  into the stem top; o into m and n (and v x z) keeps v6.6's arch with
  the hump gone; oe keeps v6.6's straighter S; ot keeps v6.6's dip
  before the crossbar. J3d changes none of them, and the census shows
  they did not move.

## Method (technical)

1. **v6.7's base is v6.6 with f's end redrawn.**
   `out27/cursive_template.svg` is `out26/cursive_template.svg` with
   only `letter-f-s1`'s end changed (and f's exit context, if the build
   reads it): the upstroke climbs to the font's turn (about 44 u, about
   11.7 u right of the stem), a designed cusp (`c` node) sits there,
   and the body runs a short way down and right along the font's exit,
   where f's exit frame now lies. `work27/base` is its build (B3's
   reader, the command of J3c's build step); every body and join param
   but f's must equal `work26/base` byte for byte.
2. **The generator copy, `gen_k1027.py`.** A copy of `gen_k1009c.py`
   that also solves a pair whose left letter has no exit port when the
   ports file pins one for the pair (`pins.<pair>.exit_port`, the
   mechanism J3c's og pin uses). Every other solve keeps its key and
   result.
3. **Variant L in `work27/ports_k1027.json`**, a copy of
   `work26/ports_k1009c.json` made by `mk_ports_k1027.py`: variant K
   plus `exit_port` pins for ba, va, wa, bq, vq and wq (b's, v's and w's
   body end, merged G2 over a short stretch), entering a's and q's high
   fused port as oa and oq do. Each solve reports its status, nfev,
   attach against its bound, the turn at its start (the hook) and its
   distance from the font, before and after. Any other high exit into a
   or q in the census gets the same pin.
4. **f's joins** (ff, fe, fo and the other joins out of f) stay presets
   re-derived from the new exit frame; each one's distance from the
   font is reported before and after.

## Checks

J3c's checks, rerun on v6.7 (`work27/dbg/checks_k1027.ps1 [step]`):
- **Census** of v6.6 and v6.7 on J3c's words plus the pairs ba, va, wa,
  bq, vq, wq and the f pairs, and their comparison: only the six joins
  and f's body, joins and words may move; every other row equal.
- **Locality**: `work27/base` against `work26/base`, body by body and
  join param by join param; the solves against v6.6's, pair by pair.
- **Determinism**: a second build and sheet, byte for byte.
- **The guard** (`work20/dbg/check_out_k990.py out27`).
- **Sheets**, each visible change beside v6.6 and the font: the joins
  into a and q (`aq_joins_v67.svg`), f and its joins (`f_v67.svg`), the
  words (`cursive_v67_words.svg`), each looked at in crops before it
  goes to Levi.

## Outputs

Version v6.7, in the main checkout's `.claude/probes/K863/trace/`:
`work27/` (base, ports, census, logs, crops), `out27/` (the template and
the sheets), tools `work27/dbg/*_k1027.py` (and `.ps1`), the record in
`NOTES.md` `## K1027` with the rerun commands. The sheets Levi looks at
go to Drive `K863/` with `v67` in their names, as J3c's did.

## Goal

- ba, va, wa, bq, vq and wq solved, G2 out of b, v and w, no hook,
  closer to the font than v6.6's presets.
- f's lower loop ends in a cusp into its exit, as the font's does.
- Nothing else moves; every visible change shown beside v6.6 and the
  font.

## Order

1. `Get-Date`. This brief, committed first.
2. The generator copy, the ports, the six solves (K1027). N1.
3. f's end in the template, the build, f's joins (K990). N2.
4. The checks, the sheets, the upload. N3. The Handoff.

## Setup

- Repo `C:\Users\lsl\Repositories\knotmaze`; the branch is
  `worktree-agent-ac83c987a53ec3ee7` (worktree
  `.claude/worktrees/agent-ac83c987a53ec3ee7`), from `1a6823ea`.
- The work is untracked, in the main checkout's
  `.claude/probes/K863/trace/`. Python:
  `venv\Scripts\python.exe -I`; the font
  `font\PlaywriteUSTrad[wght].ttf`.

## Rules

J3c's `## Rules` hold, with these changes:
- **Names**: tools `work27/dbg/*_k1027.py` (and `.ps1`); outputs in
  `work27/` and `out27/`; the record in `NOTES.md` `## K1027`; view
  images from copies in `$env:TEMP\k1027_view\`; the version is v6.7.
- **Copy shared tools; don't edit them.** Leave the earlier work folders
  and Levi's template files as they are.
- **No timing, no perf lock**; one Python process at a time (at most 4
  worker processes); no subagents.
- **Never touch the main checkout's tracked files, `docs/design/K863_trace.md`
  or master**; don't edit `LEDGER.md`; commit on the branch at every
  milestone, broken or not; never push.
- **Stop rule**: at the stage's end or 2 h from the start (18:18:34, so
  20:18:34), whichever comes first (`Get-Date` at each milestone):
  commit WIP, append the Handoff, commit, report. A compaction is not a
  stop; after one, re-read this brief and `git log`.

## Later work (not J3d's)

b's, v's and w's other high exits; K1014, K1035, K1036, K1044, K1090;
the leads and tails (K1006); K991 and K948 for the remaining pairs;
K937, K997, K998; removing the join sets.

## Handoff

J3d stage agent (coordinator session 7301c55b), 2026-11-02 18:18-19:17. Branch `worktree-agent-ac83c987a53ec3ee7`, worktree
`.claude/worktrees/agent-ac83c987a53ec3ee7`; nothing pushed, and this brief is the only tracked change. Everything else is in
the main checkout's untracked `.claude/probes/K863/trace/`: `NOTES.md` `## K1027` (N1-N3, rerun commands), `work27/`, `out27/`,
tools `work27/dbg/*_k1027.*`.

**What changed** (v6.7 = v6.6 with f's end redrawn, and variant L in `work27/ports_k1027.json`):
1. **ba va wa bq vq wq solved** (K1027). `gen_k1027.py` reads a pair's own `exit_port` and `entry_port` pins. The six leave b's,
   v's and w's body end merged G2 and enter a's and q's high fused port at 60 u, whose after-high stretch is [0, 90] u for these
   six (oa and oq keep [0, 100]). The solver puts the attach at the low end of its range in every try, so the stretch decides
   where the join meets a and q; 90 u is the closest to the font of 60-130 u (N1; 85 u ties). All six end status 0 with 0
   crossings. Distance to the font (u, v6.6 preset -> v6.7): ba 7.61 -> 5.19, va 7.56 -> 6.94, wa 7.67 -> 7.00, bq 9.96 -> 5.63,
   vq 10.15 -> 6.69, wq 10.15 -> 6.74. bq vq wq lose their 160 deg hooks, comb spikes and rough FAIL. oa and oq are unchanged.
2. **f's end** (K990). `out27/cursive_template.svg` is out26's with `letter-f-s1` redrawn after node 8: the upstroke climbs
   straight to a designed corner (`c` node) 44.2 u high and 11.7 u right of the stem (the traced f's turn: 44.1 u), and the
   body runs down and right to 25.4 u, on the font's exit; f's three exit references come from the build. f's body against the
   font: max 4.30 -> 1.03 u; its end point 4.30 -> 0.20 u from the font's exit.
3. **f's joins** stay presets on the new exit frame (u, v6.6 -> v6.7): ff 16.58 -> 6.96, fr 13.92 -> 7.90, fi 22.89 -> 14.13,
   fu 22.68 -> 14.15, fy 22.97 -> 14.16, fe 22.59 -> 15.34, after's ft 20.55 -> 14.05; worse: fo 9.07 -> 13.96 and
   fa 13.88 -> 17.11; of unchanged (3.83). The eight pairs' mean 18.07 -> 12.96.
Nothing else moved (N3): 279 of the census's 298 rows are equal in every column; the locality check finds f the only body
changed, join_params.json byte-identical and the 1144 untouched pieces byte-identical to v6.6's; determinism PASS.

**What Levi should look at** (Drive `K863/`, each a guarded SVG; columns: the font at wght 100, v6.6, v6.7):
- `aq_joins_v67.svg`: ba va wa bq vq wq, then oa oq, bad and wave. v6.6's joins hooked (bq vq wq) and sagged; do v6.7's read as
  one stroke out of b, v and w into a and q?
- `f_v67.svg`: f and its joins. (a) The corner: v6.7 turns at 44 u, where the traced f turns. At wght 100 the font's upstroke
  and exit look like two lines meeting higher, at about 64 u beside the crossing. Keep 44 u, or move the corner up (variant C,
  not built: the corner near (225.7, 884.6) in the template, the same end)? (b) fa and fo now sit farther from the font.
- `cursive_v67_words.svg`: the census words, v6.6 beside v6.7; three differ (quick brown fox, coffee, bad).

**Checks** (`pwsh -NoProfile -File work27\dbg\checks_k1027.ps1 [step]`, from the trace folder; steps template build ctx census_v66
census_v67 cmp locality solves guard sheet_aq sheet_f sheet_words det): census 298 rows, 19 move (the six joins and the joins out of
f) and 279 are equal; undesigned seams 10 -> 10, comb spikes 38 -> 35, rough FAIL 62 -> 59; locality PASS (bodies differ in f
alone, join_params byte-identical, 1144 untouched pieces byte-identical); determinism PASS (25 build files byte-identical, 8
differ by path, pid or clock; the aq sheet byte-identical); guard ALL CLEAN. Solves:
`venv\Scripts\python.exe -I work27\dbg\solves_k1027.py work27\solves_v67.txt work27\solves_v67.json ba,va,wa,bq,vq,wq,oa,oq v6.6,v6.7`;
f's body: `venv\Scripts\python.exe -I work27\dbg\fbody_k1027.py`.

**Next:**
1. Levi's looks: the six solved joins, and f's corner height (44 u as built, or about 64 u, variant C).
2. Joins out of f: fe fi fu fy still sit 14-15 u from the font, and fa (17.11) and fo (13.96) farther than v6.6's; they want f's
   exit port and solved joins (K991, K948).
3. b's, v's and w's other high exits (later work), then the rest of the later-work list above. The coordinator merges this
   branch and updates K863's handle.
