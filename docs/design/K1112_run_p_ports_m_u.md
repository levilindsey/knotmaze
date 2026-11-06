# Muse batch 22, Run P: m's and u's exits on one port each, against v6.8's joins (K1112)

Ledger: K1208 (batch 22); K1112 (one join rule for every pair); K863's trace kit. Chain tag 22P;
no server. One Muse run in the main checkout on master. Probes only: nothing in `src/` or `test/`.

## Why

K1112 moves every cursive join onto one rule: each letter's exit is one port record, and a join is
solved from the left letter's exit port and the right letter's entry port, with no per-pair data.
Levi kept v6.8's joins (K1119: "the v6.8 versions are WAY better in all cases. The others are
grossly incorrect and unsmooth"; K1197, on c's port: "the old one is better"). So K1112 was
re-scoped on 2026-11-05: b, v, w and c keep v6.8's presets; the other exits are ported letter by
letter, and a letter's presets go only when its port draws v6.8's joins.

In v6.8 (variant M of `work28/ports_k990e.json`) a, d, e, h, i, n, o and f exit through a port.
Every join out of g j k l m p q r s t u x y z still reads one of J2's presets: 22L's
`.claude/probes/K863/audit_22l/sheets_cusp.txt` lists mp and up on `cnct.mod_n_n`. This run takes
m and u: m ends as n does and u as i does, and n and i both exit through the same record, a merge
at the end node within [0, 10] u. Does that one record draw v6.8's joins out of m and u? If it
does, Claude views the sheets and the presets can go. If not, by how much, and where.

## Read first

- Batch 22's How to work (`docs/design/K1208_muse_batch22.md`) and the pages it sends you to.
- `docs/design/K863_trace.md`: the kit, the census, "Levi's calls" and "Judging a look" (binding:
  the approved version is the bar, and checks reject, never pick).
- `docs/design/K1112_cursive_j3h.md`, whole: c's port stage, the method this run repeats for m and
  u, and its Handoff. Its record is NOTES.md's `## K1112 c` (Select-String it in the trace folder's
  NOTES.md, which is 480 KB: read only that entry). It names the side test's tool.
- J3k's Handoff (`docs/design/K863_cursive_j3k.md`) and its NOTES copy `work34/NOTES_k863k.md`:
  `work34/base` is v6.8 rebuilt by the fixed kit, and `work34/dbg/checks_k863k.ps1` runs every step
  (builds, census, locality, sheets, PNGs, guard) with `K926_FINAL_E=shear` and `K1009_PINS`
  cleared.
- The header of `work27/dbg/gen_k1027.py` and its lines 800-820: a join is solved when its left
  letter has an exit port and its right letter an entry port; otherwise it reads a preset.
- K1112's ledger text (`node $HOME/Repositories/claude-config/tools/ledger.mjs show K1112 --repo .`).

## Where to work

As J3k: the trace kit is untracked and lives in the main checkout's `.claude/probes/K863/trace/`,
with its `venv`. Run the tools from that folder (`venv\Scripts\python.exe -I work35\dbg\<tool>`).
Write only `work35/`, `out35/` and one new NOTES.md entry. Copy the tools you need into
`work35/dbg/` renamed `*_k1112p.*`, and copy any input you change into `work35/` (the ports file is
written by `work35/dbg/mk_ports_k1112p.py`). Never change an earlier work or out folder, Levi's
templates, an earlier stage's tools or `cnct.*`.

## Tasks

1. **Ports.** A copy of `work28/ports_k990e.json` with new variants, each M plus exit records:
   m's (n's record: merge at the end node, stretch [0, 10] u), u's (i's record, the same), and
   both. Nothing else: no pins, no hints, no per-pair data, no change to a body or the template.
2. **Builds and census.** Through J3k's pipeline (copied), on `work34/base`: v6.8 (variant M) and
   each new variant. The words: J3i's list (`$cwI` in `checks_k863k.ps1`, 232 words), plus every
   pair out of m and u (ma..mz, ua..uz), each word once.
3. **The gate: the distance to v6.8's joins.** For each pair out of m and u, and each word that
   holds one: the symmetric Hausdorff distance between the variant's drawn centreline and v6.8's
   (u), the mean distance, and where the largest sits (the piece and its arc length). A letter's
   port draws v6.8's joins when every pair out of it lies within 1.0 u. Calibrate the measure on
   c's port: J3h's v7.0 (presets) against v7.1 (c's port), from `work31/` (J3h's Handoff names the
   builds). Levi turned that port down, so report each c pair's largest distance beside m's and
   u's, and say so if any c pair reads within 1.0 u.
4. **Checks per variant**, as J3h ran them:
   - locality: every piece outside the joins out of m and u byte-identical to v6.8's;
   - the census against v6.8's, row by row by id: hooks, spikes, rough FAIL and undesigned seams
     must not rise; each pair's font distance beside v6.8's;
   - every solve converges (none stops at its maxfev);
   - the side test (K991): a cusp entry after m or u meets the stem from one side;
   - determinism: a second build, byte for byte;
   - the guard: `work20/dbg/check_out_k990.py out35` (vector SVGs only).
5. **A second candidate**, only for a letter whose port fails the gate: one change to its exit
   record (the stretch, the node, maxfev, or a hint the generator already reads), chosen from
   where the failing pairs differ. No pin, no per-pair data, no new body. At most two candidates a
   letter. If neither passes, the letter keeps its presets: report the closer one.
6. **Sheets** (`out35/`, SVG, and PNG at dpi 48 in `out35/png/`; every column labelled), per
   letter: the pairs out of it and the words that hold them, font | approved (v6.8) | each
   candidate; and one overlay sheet, the font's fill in light grey with v6.8's centreline and each
   candidate's in their own colours, on the same axes. Crops at 3x (`work35/look/`) of the five
   pairs with the largest distance per candidate, and of two mid-word joins per letter. Say what
   you measured, never whether it looks right: Claude views them.

## Record

- NOTES.md: a new entry `## K1112 m u (Run P)` in the form of the others (what, the tools, the
  rerun command, the numbers); its copy at `work35/NOTES_k1112p.md`.
- `work35/SUMMARY.md`: per letter, a table with a row per pair (the largest distance and where,
  the mean, the font distance for v6.8 and the candidate, the census flags), the gate's verdict
  per candidate; then the calibration on c, the checks' numbers, the sheets and the crops.
- Tracked with `git add -f`, and nothing else: `work35/dbg/`, the ports file, the tables (`.txt`,
  and `.json` under 1 MB), `SUMMARY.md`, the NOTES copy, and at most 30 PNGs (sheets and crops),
  each under 300 KB. Builds and larger outputs stay untracked.

## Done and close

Done when both letters have a table and every check has a number, or at the cap: 2 h after you
start (`Get-Date` at the start and at each milestone). At the cap, commit what you have, and say
in `SUMMARY.md` what is left. Commit message:
`K1112: m's and u's exits on one port each, against v6.8's joins (Muse batch 22 Run P, 22P)`. Pull
with rebase and autostash, then push to master (probes only, so nothing deploys). Leave the ledger
to Claude.

## Rules

- At most 4 Python processes at a time, at most 2 while `$env:TEMP\claude-perf.lock` exists
  (another run is timing frames). No browser, no server, no phone, no perf measurement.
- A choice of look is never made here: a candidate that passes every check goes to Claude's eye,
  then to Levi, beside v6.8.

## Report

Plain words: per letter and candidate, the gate's verdict and the five largest pair distances; the
calibration on c; the census flags, locality, convergence, the side test, determinism and the
guard; the sheets' and crops' paths; anything that stopped you; `Ledger items`.
