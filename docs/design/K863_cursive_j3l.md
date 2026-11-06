# K863 J3l: word-end tails that follow their stroke and swoop up; D2 and Q1 in

Ledger: K863 (the cursive alphabet; Levi's answer to card K1213). One Claude Opus stage agent in
its own worktree, the only agent in the trace kit while it runs. Cap 2 h.

## Goal

Levi, 2026-11-05, answering card K1213 (`docs/asks/K1213.md`): "all word-end letters should have a
tail, but both the s and p tails are currently bad. Tails should match the curvature they pass by
and swoop up more. D2 for [the dots] is good. I can't tell the q thing, so Q1 is good."

On v6.8 (`work33/`, the approved build):

1. D2 (the font's oval dot) and Q1 (q's tail with no step) go in, from J3k's candidates
   (`work34/cand/`). Smooth Q1's slight S within about 1.5 u of its exit (J3k's Handoff names it).
2. Every letter at a word's end has a tail. A tail leaves its letter following the curvature of the
   stroke it comes off and passes by, and swoops up, where v6.8's s and p run on flat along the
   baseline (s about 77 u past the font's end, p about 82 u past the stem). S1, S2 and P1 cut the
   tail off, and Levi turned them down. s and p first; then every other word-end letter: give a
   tail to any that ends without one, and reshape any that runs on flat.

Looks that stay: v6.8's letters and joins everywhere else (K1119: "the v6.8 versions are WAY better
in all cases"; K1197: "the old one is better"). b, v, w and c keep v6.8's presets. A fix goes into a
letter's body or its word-end form, never into per-pair data (K1112). `docs/design/K863_trace.md`'s
"Levi's calls" and "Judging a look" bind.

## Authority

The tail's shape, the fit and the tools are yours. No numeric gate: the kit's checks (hooks,
spikes, facets, locality, census) report what you built and catch breakage; they don't pick a
look. Where Levi's words leave a shape open (how long a tail runs, how high it swoops), pick what
reads like a school cursive's exit stroke, say what you picked, and put at most one variant
beside it for Levi.

## Start

J3k's Handoff (the end of `docs/design/K863_cursive_j3k.md`) gives the state and the tools. The kit
is untracked and lives only in the main checkout's
`C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace\`, with its venv (`venv\Scripts\python.exe
-I <tool>`, run from that folder). Run P used `work35/` and `out35/`. Write only `work36/`, `out36/`
and one new NOTES.md entry; copy any input you edit (the template, a body, the ports) into `work36/`
and edit the copy. Never change an earlier work or out folder, Levi's templates, an earlier
stage's tools or `cnct.*`. NOTES.md is 480 KB: read only the entries you need (Select-String the
headline, then that entry's lines).

## Done

1. Sheets, font | v6.8 | yours, inked at 3x: every letter at a word's end, a to z, with s and p in
   several words each; the dots; q; the 232 test words. In `out36/`, PNGs in `out36/png/`.
2. You viewed every crop at full size, and every word-end tail reads as Levi described.
3. Locality: outside the word-end forms, the dots and q, no piece moves (the kit's check over the
   232 words); the census rerun, its numbers in your report.

## Rules

- PowerShell; Python only through the kit's venv with `-I`. Read code and notes through the shell;
  the Read tool only to view crops and right before an Edit. No helpers.
- Commit WIP on your worktree branch at each milestone: copies of your tools and the final
  template (`git add -f`, as J3k's branch did); never census tables, crops or other probe outputs
  (Levi's reset, 2026-11-05). Never push; never edit LEDGER.md. Never touch the main checkout's git
  state or its tracked files (another agent's work merges there).
- Out of scope: the joins between letters (v6.8's stay), the text forks (K1220).
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and each milestone); then
  commit WIP and report. A compaction is not a stop: re-read this brief and `git log`.

## Report

Short, in plain words: what you built; per word-end letter, what changed; the sheets' paths, with
the two or three to show Levi first; the checks' numbers; anything left; your last SHA. Commit
messages and the NOTES entry carry the record. End with `Ledger items` and K863's handle fields
(owner, branch, last commit, evidence, next).
