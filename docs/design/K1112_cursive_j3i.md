# K1112 · Cursive J3i: one cusp-entry rule for every low exit (v7.2)

Written by Claude (the coordinating session) on 2026-11-04 for one Claude
Opus agent and one stage. It builds on J3h (`docs/design/K1112_cursive_j3h.md`
and its Handoff), and J3h's brief, with J3g's behind it, applies wherever
this one does not say otherwise.

## Why

Levi (2026-11-04): "perfecting all junction and cursive work is always my
main priority". K1112 is one join rule for every pair, with the census's
smoothness and locality as its gates and one sheet per letter for Levi.

J3h ported c's exit (v7.1) and failed the seam gate by 4: ci, cr and cs
(180 deg) and cy (G1, a curvature step of 0.0088 /u) attach at 0 u, the
bound of the right letter's cusp window. v7.0's low exits already have
this class: hi, er and es in the census words, and in J3h's probe
(`work31/probe/lowcusp_v70.txt`) ai, ar, as, nr, ns, hi, hr, di, dr, er,
es, ii and ir. J3e's fr and fs pins fixed it per pair, with a lower bound
on the retrace window; K1112 rules out per-pair data. So c's sheet does
not go to Levi until this class is fixed for every low exit at once.

## Goal (v7.2)

1. **One rule for the cusp entries of i, r, s and y** (and any other
   right letter with a cusp window: check), for every join from a low
   exit (an exit not in `HIGH = bovw`). For example, a lower bound of
   about 2 u on the retrace window, which is what the fr and fs pins set
   per pair. No per-pair data, no presets, no new pins.
2. **High exits don't move.** Joins from b, o, v and w, and every join
   into a letter without a cusp window, stay byte-identical.
3. **At most two candidate rules** on the sheet, and only if both pass
   the gates. If no rule clears the class without raising another count,
   stop there and report each trial's measures.
4. Report whether the fr and fs pins still change anything under the rule
   (a build with them cleared). Don't delete them: K1112 deletes the six
   pins after its last letter.

## Checks

J3h's checks, ported to `work32/dbg/checks_k1112cusp.ps1 [step]`, compare
v7.2 against v7.1:
- **Census** of v7.1 and v7.2 on J3h's pieces (J3g's words and pairs plus
  ca..cz), plus every low-exit pair into a cusp-window letter (J3h's probe
  list at least) and the census words holding one.
  - Undesigned seams must fall: ci, cr, cs and cy, and hi, er and es,
    must go; report the probe pairs.
  - Hooks, spikes and rough FAIL must not rise. Report over budget.
- **Locality**: only the joins this rule touches, their right letters'
  first strokes, and the words holding them move. Every other piece stays
  byte-identical.
- **Solves**: every touched pair converges. Report er and es, which reach
  MAXFEV at 3000 in v7.0.
- **The side test** (K991) on every cusp entry the rule touches.
- **Font distance** for the touched pairs, reported, not chased per pair.
- **Determinism**: a second build and sheet, byte for byte.
- **The guard** (`work20/dbg/check_out_k990.py out32`) before the upload.
- **Sheets**, looked at in crops before they ship, each also rendered to
  PNG in `out32/png/`:
  - `cusp_v72.svg`: font | v7.1 | v7.2 (| the second candidate), every
    touched pair;
  - `c_v72.svg`: font | v7.0 | v7.2, c alone and ca..cz (c's one sheet
    for Levi, now with the rule);
  - the census words that differ, v7.1 | v7.2.

## Outputs

v7.2 goes in the main checkout's `.claude/probes/K863/trace/`:
- `work32/`, `out32/`;
- the tools `work32/dbg/*_k1112cusp.py` (and `.ps1`);
- the record in `NOTES.md` under `## K1112 cusp`, with the rerun commands.

The SVG sheets go to Drive `K863/` with `v72` in their names (rclone, as
J3h did). The coordinator sends Levi the PNGs.

## Order

1. Run `Get-Date`: it is the start time. Copy this brief from
   `C:\Users\lsl\AppData\Local\Temp\claude\C--Users-lsl-Repositories-knotmaze\7301c55b-f743-4e00-a519-883d9aaaaa7c\scratchpad\K1112_cursive_j3i.md`
   to `docs/design/K1112_cursive_j3i.md` in your worktree and commit it
   before anything else.
2. Read J3h's brief and Handoff. It is on J3h's branch until the
   coordinator merges it:
   `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a3b2dcbad71e5cbd8\docs\design\K1112_cursive_j3h.md`
   (read it there; don't write in that worktree). Then `NOTES.md`
   `## K1112 c`, and how J3e's fr and fs pins set their bound
   (`NOTES.md`).
3. The rule: find where the cusp window's bounds are set, the trials, the
   census and the measures; the choice.
4. v7.2's build; the checks; the sheets and PNGs; the crops.
5. The guard, the upload, `NOTES.md` `## K1112 cusp`, the Handoff.

## Setup

As J3h's: the trace dir in the main checkout, Python
`venv\Scripts\python.exe -I`, the font `font\PlaywriteUSTrad[wght].ttf`,
`K926_FINAL_E=shear` set and `K1009_PINS` cleared, as J3g's scripts do.

## Rules

J3h's rules apply, with this stage's names:
- tools `work32/dbg/*_k1112cusp.*`; outputs `work32/` and `out32/`;
- the record `NOTES.md` `## K1112 cusp`;
- view images from copies in `$env:TEMP\k1112cusp_view\`;
- the version is v7.2.

In short:
- Copy shared tools; don't edit them. Leave the earlier work folders
  (`work31/` and `out31/` included) and Levi's template files as they
  are.
- No timing and no perf lock. At most 4 worker processes.
- No subagents. No phone, dev server or browser.
- Muse is committing on master. So never touch the main checkout's
  tracked files or master, and never run git there.
- Don't edit `LEDGER.md`.
- Commit on your branch at every milestone, broken or not. Never push.
- Use PowerShell for commands. Read code through the shell; use the Read
  tool only right before an Edit.

**Stop rule.** Stop at the stage's end or 2 h from the start, whichever
comes first; run `Get-Date` at each milestone. To stop: commit WIP,
append the Handoff to this brief, commit, report. A compaction is not a
stop; after one, re-read this brief and `git log`. This stage is the
cusp-entry rule only.

## Report

- What moved, with numbers: the rule, each trial, the census before and
  after.
- The candidates and the sheets' paths.
- A `Ledger items` list: follow-ups and residuals.
- K863's handle fields: owner, branch, last commit, evidence, next,
  brief.

## Later work (not J3i's)

- Levi looks at c's sheet (v7.2) and the cusp sheet.
- K1112's next exits, g, j, k, l, m, p, q, r, s, t, u, x, y and z, one
  stage each. Then J2's presets and the six pins are deleted.
- Levi's v7.0 answers (K1119), in their own stage.
- c's stretch: 14 of the 26 joins leave c at its 10 u bound (J3h).

## Handoff (2026-11-04 21:01, stage done)

- Done inside the cap. The rule: in the ports JSON, every cusp letter's
  main entry record (`stretch_u`, read by gen_k1027's `port_entry` /
  `solve_join`; the low exits, not in HIGH = bovw, read it) has its
  window [0, hi] moved to [B, hi], plus maxfev 8000 (the m), so the join
  merges G2 into the letter's upstroke B u below the cusp and the letter
  draws the cusp itself. r gets an after_high record equal to its v7.1
  entry, so high exits solve from the same records as before. No
  per-pair data, presets or new pins. Ports `work32/ports_k1112cusp.json`
  (from `work32/dbg/mk_ports_k1112cusp.py`); all paths here are under
  the main checkout's `.claude/probes/K863/trace/`, and this branch
  holds copies at the same paths.
- Candidates, both through every gate: **Plc2m = v7.2** (B = 2 u,
  primary) and **Plc3m = v7.2b** (B = 3 u = CUSP_GUARD_U).
- Trials, 72 low-exit pairs into a cusp window (71 solved; ij has no
  port solve), at a bound / at MAXFEV: v7.1 22 at 0 u + ej / 4; Plc1
  22 / 5; Plc2 24 / 4; Plc3 34 / 5; Plc2m 24 / 0; Plc3m 34 / 0.
- Census (718 pieces) v7.1 -> v7.2 = v7.2b: hooks 50, spikes 77, rough
  FAIL 147 unchanged; undesigned seams 29 -> 6 (the 23 on cusp entries
  gone, ci cr cs cy hi er es among them; the 6 left are q's word-end
  exits); over budget 399 -> 400 (ci, 1.20 -> 3.79 / 4.99 u).
- Solves 71/71 converge (v7.1 67/71): er 1168 / 3827, es 2208 / 4394
  evaluations. Side test: none below -0.05 u (lowest fw -0.013, cw
  -0.012 u).
- fr/fs pins: a no-op under Plc2m (census rows and solves identical
  with them cleared); under Plc3m they hold fr and fs at 2 u (3 u
  cleared). Not deleted.
- Font distance up for ci, cr, cs, cy, er, es (c's mean 11.02 -> 11.36 /
  11.57 u), down for ai, ar, ei, ni. Reported, not chased.
- Locality PASS for both (data unchanged, 2000 untouched pieces
  byte-identical). Largest moves: v7.2 fi 8.08 u in first and fifty
  (v7.1's word solve sat 11.08 u down i at a higher J; now fi alone's
  3.00 u); v7.2b it 9.82 u in hit and fruit (i's exit cut 10 u earlier
  at a lower J; the line looks the same).
- Determinism PASS (build, words sheet, solves reruns); guard ALL CLEAN.
- Sheets `out32/cusp_v72.svg`, `c_v72.svg`, `cursive_v72_words.svg`
  (PNGs in `out32/png/`), on Drive `K863/`. Viewed in crops
  (`work32/sheets/png/`: cusp groups, c, words, `fi_words*`,
  `it_words*`, `it_hit_1`, `it_fruit_2`): smooth, no hook or kink.
- Record: NOTES.md `## K1112 cusp` (rerun commands; copy in
  `work32/NOTES_k1112cusp.md`).
- Next: Levi picks v7.2 or v7.2b from the sheets; then land the chosen
  variant as the ports (under v7.2 the fr/fs pins may go).
