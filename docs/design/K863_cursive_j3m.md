# K863 J3m: b, v and w turn out of their cusp; o's and f's tails redrawn; J3l in

Ledger: K863 (the cursive alphabet; Levi's answer to card K1225). One Claude Opus stage agent in
its own worktree, the only agent in the trace kit while it runs. Cap 2 h.

## Goal

Levi, 2026-11-06, answering card K1225 (`docs/asks/K1225.md`): "J3l" (s and p as J3L, not J3LC).
Then:

- "w and v and b (and maybe other letters): I've said this before: there is too much of a sharp
  180-degree cusp with a downward turn at the end--there should be a cusp, but it should turn
  outward more than downward (maybe East South East erly) and then do the gradual upward swoop.
  At least, this is what should happen for the word-end tail and for transitions to higher-entry
  letters. Although, I guess for transitions to lower entry letters, the sharp downward cusp (and
  what will become a fused spur) is actually correct--but even in that case, the current w/v/b
  tail shouldn't have the outward swoop as early as it does."
- "o: close, but I'd like it to follow the curve of the o to a bit further down then detach from
  the curve maybe 10-degrees further."
- "f: I think we probably want the tail to reach the base line before turning back upward? Also,
  we should probably have the tail segment align closer to the pre-cusp segment so they can fuse
  into a spur."

What he said before: on 2026-11-02, "these letters--b,v,w--all have too much of a downward
hook/cusp--it should be less down and more out" (K1113). J3f's try (v6.9) went out with the rest
of v6.9 (K1119). Its flaws, so you can avoid them (K1120): a straight climb into b, f, h, k and l;
br, vr and wr meeting r's cusp in a V; small repeated spikes in be and we.

On J3L (`work36/cand/J3L`, the kit's current build from now on):

1. b, v and w at a word's end, and into a letter that enters high: keep a cusp, but turn out of it
   about east-south-east, not down, then swoop gradually up. Into a letter that enters low, keep
   v6.8's sharp downward cusp, but start the outward swoop later than it does now. Say which next
   letters you count as high-entry and which as low-entry. Give any other letter whose exit has
   the same cusp the same treatment, and name it.
2. o at a word's end: the tail follows the o's curve further down and leaves it about 10° further
   round than J3L's.
3. f at a word's end: the tail reaches the baseline before it turns up, and it leaves the cusp
   close to the line of the stroke coming into it, so the two can fuse into one spur.

These looks stay: J3L's letters and joins everywhere else, including s, p, the dots (D2) and q
(Q1s). c, m and u keep v6.8's presets. A fix goes into a letter's body, its word-end form or its
exit by the next letter's entry class, never into per-pair data (K1112).
`docs/design/K863_trace.md`'s "Levi's calls" and "Judging a look" bind.

## Authority

As in J3l: the shapes, the fit and the tools are yours. There is no numeric gate. The kit's checks
(hooks, spikes, facets, locality, census) report what you built and catch breakage; they don't
pick a look. Where Levi's words leave a shape open, pick what reads like a school cursive, say
what you picked, and put at most one variant beside it.

## Start

J3l's record:
- commit 6c4ae88b (`work36/NOTES_k863l.md`, `work36/dbg/endcrop_k863l.ps1`, `checks_k863l.ps1`);
- NOTES.md's "K863 word-end tails" entry, which starts at line 5323. NOTES.md is 480 KB, so read
  only the entries you need.

The kit is untracked, in the main checkout's `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace\`,
with its venv (`venv\Scripts\python.exe -I <tool>`, run from that folder). Write only `work37/`,
`out37/` and one new NOTES.md entry. Copy any input you edit into `work37/` and edit the copy.
Never change an earlier work or out folder, Levi's templates, an earlier stage's tools or `cnct.*`.

## Done

1. Sheets with four columns, font | v6.8 | J3L | yours, inked at 3x, in `out37/` (PNGs in
   `out37/png/`):
   - b, v and w at a word's end, and into every next letter a to z, grouped high-entry and
     low-entry;
   - o and f at a word's end, in several words each;
   - the 232 test words.
2. You viewed every crop at full size, each reads as Levi described, and you name any spot that
   doesn't.
3. The checks:
   - Locality: no piece moves outside the forms you changed.
   - The census is rerun.
   - None of v6.9's flaws (straight climbs, a V into r, spikes) is back.

## Rules

- PowerShell; Python only through the kit's venv with `-I`. Read code and notes through the shell.
  Use the Read tool only to view crops and right before an Edit. No helpers.
- Commit WIP on your worktree branch at each milestone: copies of your tools and the final template
  (`git add -f`). Never commit census tables, crops or other probe outputs. Never push, never edit
  LEDGER.md, and never touch the main checkout's git state or its tracked files.
- Out of scope: how a cusp's spur is filled and drawn (K1220, running now in the renderer), and the
  joins of letters other than b, v and w.
- Stop when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and
  at each milestone). Then commit WIP and report. A compaction is not a stop: re-read this brief
  and `git log`.

## Report

Keep it short and in plain words:
- what you built, per letter;
- the high-entry and low-entry lists;
- the sheets' paths, naming the two or three to show Levi first;
- the checks' numbers;
- anything left;
- your last SHA.

Commit messages and the NOTES entry carry the record. End with `Ledger items` and K863's handle
fields (owner, branch, last commit, evidence, next).
