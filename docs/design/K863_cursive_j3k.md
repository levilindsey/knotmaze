# K863 J3k: v6.8's own leftovers (word-final s and p, the dots, q's tail), as candidates

Ledger: K863 (the cursive alphabet), K1213 (these spots) and K1212 (the kit's faults, fixed first).
Stage agent: Claude Opus in its own worktree, started by the coordinator session; cap 2 h. This
stage changes only the four spots below, each as candidates beside the approved version, and
draws the sheets the coordinator, then Levi, chooses from by eye.

## Why

Levi kept v6.8, 2026-11-05: "the v6.8 versions are WAY better in all cases. The others are grossly
incorrect and unsmooth" (K1119), and "the old one is better" (K1197). J3j made v6.8 the kit's
current build (`work33/`) and listed what it still draws wrong against the font. The coordinator
saw these at 3x on `out33/png/corners_v68.png` (font column against approved column):

- **s at a word's end** (boxes, is, jumps, as, ds, es): the font closes s's bottom with a curve
  that sweeps round to the left; v6.8 runs the bottom out to the right as a flat line along the
  baseline.
- **The dots of i and j**: the font draws a round dot; v6.8 draws a short slanted tick.
- **p at a word's end**: J3j found it ends with no tail (the coordinator has not seen one: find the
  words that show it).
- **q at a word's end**: its tail meets the stroke before it with a step in curvature (dk 10.6 /u
  in J3j's census), six of v6.8's 25 undesigned seams.

And the kit's checks (K1212): `pairs_k863j.py` line 19 (SU.g2) reads `angle_deg`, which the census
never writes (it writes `ang_deg`), so g2 never checks a seam's angle; rowsame keys rows by word
number (`same_k863j.py` works around it); the word lists repeat ids (J3i's v68x list 718 rows for
713 ids, J3e's 349 for 347).

## Goal

1. A kit whose smoothness check reads the angle, rerun on v6.8 with nothing drawn differently.
2. For each spot, one or two candidates that draw it as the font does, each changing only its
   spot's pieces, on a copy of v6.8 (`work34/`).
3. Sheets that put every candidate beside the font and v6.8, so the choice is made by eye; every
   sheet keeps v6.8 as a choice.

## Read first

- `docs/design/K863_trace.md`: "Levi's calls" and "Judging a look" (binding). Under K1112 a fix goes
  into a letter's body or its word-end form, never into per-pair data.
- `docs/design/K863_cursive_j3j.md` whole (its Handoff is v6.8's state and the tools).
- `.claude/probes/K863/trace/NOTES.md` is 480 KB: read only the entry `## K863 base` (J3j), found
  with Select-String, from its headline to the next. It names the pipeline (J3e's template after its
  ctx step, `work28/ports_k990e.json` variant M, the generator `gen_k1027`, the census) and every
  tool.

## Where to work

As J3j: the trace kit is untracked and lives only in the main checkout's
`.claude/probes/K863/trace/` (`C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace\`), with
its `venv`. Run the tools there (`venv\Scripts\python.exe -I work34\dbg\<tool>`, from that folder)
and write only `work34/`, `out34/` and one new NOTES.md entry. Port what you change into
`work34/dbg/*_k863k.*`; copy any input you edit (the template, a body, the ports) into `work34/`
and edit the copy. Never change `work33/`, `out33/` or any earlier work or out folder, Levi's
templates, an earlier stage's tools, or `cnct.*`. Your worktree branch carries copies of what you
commit (`git add -f`: `.claude/probes` is gitignored), as J3j's branch does (its
`wtcopy_k863j.ps1`). Muse runs in the main checkout on master: never touch its git state, its
tracked files or any other probe folder.

## Tasks

Do them in this order; the stop rule may cut the last ones, which then go to the next stage.

1. **Kit (K1212).** In your ports: g2 reads the census's `ang_deg`; rows are matched by the piece's
   id, not its word number; each word list holds each id once (say whether you removed or renamed
   the repeats). Rebuild v6.8 as `work34/base` with the fixed tools: every SVG and PNG
   byte-identical to `work33/base`'s, the census 0 differences. Report how many seams g2 now fails
   on the angle alone and list them (pair, angle, where): a finding, no fix here.
2. **s at a word's end.** Find how v6.8 builds s's word end (the generator's tails, the
   template, the ports) and how the font ends s. Build one or two candidates that close s's bottom
   as the font does, smooth into s's stroke. They change only the word-final s pieces.
3. **The dots.** Find how v6.8 draws a dot and what the thread can draw for one (how the template
   strokes it, and, reading only, how the app draws a glyph: `src/core/glyphs/`). Build one or two
   candidates that read as a round dot at the font's dot's place and size.
4. **p at a word's end.** Find the words that show it and what the font does; one or two
   candidates.
5. **q at a word's end.** Why the step; one candidate without it that keeps the tail's shape.
6. **Census on every candidate** (the fixed tools): pieces outside its spot equal to v6.8's (all of
   them; a candidate that moves anything else is fixed or dropped); at the spot its seams' gap,
   angle and dk, the font distance, hooks and rough, against v6.8's.
7. **Sheets** (`out34/`, SVG, and PNG at J3i's `Png` dpi; every column labelled): for each spot,
   the words and pairs that show it: font, approved (v6.8), then the candidates. Then the test
   words: font, approved, and one column with every candidate you would show. View every sheet
   yourself as full-size crops at each spot (2x to 5x where the spot is small: a dot, a tail's
   end). Say what you see, spot by spot, against the approved column and the font, and which
   candidate, if any, you would show Levi and why, in plain words. The eye chooses: the checks
   only rule a candidate out.
8. **Record.** A NOTES.md entry `J3k (v6.8 leftovers)` in the form of the others (what, the
   tools, the rerun command, the numbers), and the Handoff below.

## Checks to report (numbers)

- The kit: v6.8 rebuilt, its differences against `work33` (0); g2's new angle failures.
- Per candidate: pieces outside its spot that moved (0), its spot's seam numbers and font distance
  beside v6.8's.
- The sheets' paths and the crops you viewed.

## Out of scope

Any join between letters (b, v, w and c stay v6.8's: K1119, K1197); K1112's port of the other
letters; ij and its ligature (K1198, held); Plc1m and the cusp-corner rule (v6.8's corners match the
font's sharp points); the app's `src/core/glyphs/` (read only); Drive (the coordinator uploads what
a card needs); anything for Levi.

## Rules

- PowerShell. Read code and NOTES through the shell (Select-String, Get-Content ranges); use the
  Read tool only right before an Edit, and to view sheet crops.
- At most 4 Python processes at a time, at most 2 while `$env:TEMP\claude-perf.lock` exists (another
  run is timing frames). No browser and no server unless a step needs one, and then ports
  5970-5979 only. No phone, no perf measurements.
- No helpers.
- Commit WIP on your branch at every milestone, broken or not; never push; never edit LEDGER.md.
- Stop rule: stop when the tasks are done or 2 h after your start, whichever comes first
  (`Get-Date` at the start and at each milestone). Then commit WIP, append the Handoff and report.
  A compaction is not a stop: after one, re-read this brief and `git log`.

## Report

Plain words: the numbers above, what you viewed and what you saw at each spot, the candidates you
would show and why, and your last commit's SHA; then `Ledger items` (anything left over) and K863's
handle fields (owner, branch, last commit, evidence, next).

## Handoff

(The stage agent appends here.)

### J3k stage agent (2026-11-05, 11:09:27 to 12:41)

All eight tasks are done. The record is the NOTES entry `## K863 v6.8 leftovers` in the trace dir's
NOTES.md (its copy: `work34/NOTES_k863k.md`); `work34/dbg/checks_k863k.ps1` reruns every step.

- The kit: v6.8 rebuilt as `work34/base`, its 16 SVG, PNG and JSON files byte-identical to work33's,
  the template too; rows by id 347 and 713 equal, 0 differ. Repeats removed, first kept: J3e's list
  85 -> 84 words, J3i's 234 -> 232. g2 reads ang_deg: 0 seams fail on the angle alone (the 9 entries
  at 180 deg, nr, dr, er x3, ds, as, ii and hi, already fail on dk).
- The candidates (`work34/cand/<name>/`, `cand/forms.txt`): S1 and S2, word-final s cut at the curl
  and at the font's end; P1, p's bowl closed with no run-out; Q1, q's tail refit with no step; D1, a
  round dot; D2, the font's oval dot; ALL = S2+P1+Q1+D2.
- Locality over 232 words: 0 pieces outside the spot move, for every candidate. Census by id: 0 rows
  differ outside the spot beyond kmax_p95 (word_p95 ties a word's rows; counted apart as p95 only).
- At the spots: s ends 0.19 u (S2) and 2.93 u (S1) from the skeleton's end, v6.8 77.41 u past it;
  P1 ends 0.26 u from the skeleton, v6.8 runs on 16.28 u off it; Q1's exit seam dk 10.6 -> under
  1e-14 (G2), font distance max/mean 1.06/0.75 -> 1.17/0.84 u, hooks 1 -> 0, badness 270 -> 44-84;
  dot IoU against the font's dot: v6.8 0.570, D1 0.805, D2 0.967-0.970.
- Sheets (font | approved (v6.8) | candidates): out34/spot_s.svg, spot_p.svg, spot_q.svg,
  spot_dots.svg (inked) and cursive_k863k_words.svg (inked; font | v6.8 | ALL); PNGs in out34/png;
  every crop viewed is in work34/look, listed in the NOTES entry.
- Leans: S2 (S1 as the option, ending about 3 u further round the curl); P1; Q1, a quiet
  improvement seen only at 5x; D2, which fills the font's oval where v6.8's slanted dash pokes out.

Left as found: Q1's slight S within about 1.5 u of its exit (facet 0.030 against 0.0053; a refit
holding the direction monotone or penalising the facet is untried); q's tail is shorter and lower
than the font's in v6.8 and Q1; the 9 port-cusp seams at 180 deg (v6.8's corners, out of scope).

Next: the coordinator views the sheets and picks what goes on Levi's card.
