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
  `.claude/worktrees/agent-ac83c987a53ec3ee7`), from `5b8522a5`.
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
