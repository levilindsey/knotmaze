# K863 J3n: b, v and w's exits a little more downward; f's and p's word-end tails

Ledger: K863 (the cursive alphabet; Levi's answer to card K1236). One Claude Opus stage agent in
its own worktree, the only agent in the trace kit while it runs. Cap 2 h.

## Goal

Levi, 2026-11-09, answering card K1236 (`docs/asks/K1236.md`, J3m's looks):

> bvw exits should be a little more downward. Word-end tails: f seems too long, too upward, and
> too bumpy; p seems too long and upward. Oqa seem fine.

On J3M (`work37/cand/J3M`, the kit's current build from now on):

1. b, v and w: the exit out of the cusp turns a little more downward than J3m's 22.5° below
   level, at a word's end and into high-entry letters. "A little": he asked on 2026-11-02 for
   "less down and more out" than v6.8's hook, so it stays well short of that. Keep the cusp, the
   gradual swoop up, and J3m's low-entry form (v6.8's sharp cusp, the later swoop).
2. f at a word's end: the tail is shorter, rises less steeply, and runs smooth (no bumps). Keep
   what J3m gave it: down beside the stroke into the cusp, to the baseline, so they fuse into a
   spur.
3. p at a word's end: the tail is shorter and rises less steeply.

These looks stay: o's, q's and a's word-end tails ("fine"), J3M everywhere else, and the earlier
calls in `docs/design/K863_trace.md`'s "Levi's calls" and "Judging a look", which bind. A fix goes
into a letter's body, its word-end form or its exit by the next letter's entry class, never into
per-pair data (K1112).

## Authority

The shapes, the angles, the lengths, the fit and the tools are yours. There is no numeric gate.
The kit's checks (hooks, spikes, facets, locality, census) report what you built and catch
breakage; they don't pick a look. Pick what reads like a school cursive, say what you picked, and
put at most one variant beside it per letter.

## Start

J3m's record: commit 5602f487 and the commits before it on its branch, `work37/NOTES_k863m.md`,
and NOTES.md's "K863 J3m" entry (NOTES.md is 480 KB: read only the entries you need). The kit is
untracked, in the main checkout's `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace\`,
with its venv (`venv\Scripts\python.exe -I <tool>`, run from that folder). Write only `work38/`,
`out38/` and one new NOTES.md entry. Copy any input you edit into `work38/` and edit the copy.
Never change an earlier work or out folder, Levi's templates, an earlier stage's tools or `cnct.*`.

## Done

1. Sheets with four columns, font | v6.8 | J3M | yours, inked at 3x, in `out38/` (PNGs in
   `out38/png/`): b, v and w at a word's end and into every next letter a to z, grouped
   high-entry and low-entry; f and p at a word's end in several words each; the 232 test words.
2. You viewed every crop at full size and each reads as Levi described; name any spot that
   doesn't.
3. Locality (nothing moves outside the forms you changed), the census rerun, and none of v6.9's
   flaws back (straight climbs, a V into r, spikes).

## Rules

- PowerShell; Python only through the kit's venv with `-I`. Read code and notes through the shell.
  Use the Read tool only to view crops and right before an Edit. No helpers.
- Commit WIP on your worktree branch at each milestone: copies of your tools and the final template
  (`git add -f`). Never commit census tables, crops or other probe outputs. Never push, never edit
  LEDGER.md, and never touch the main checkout's git state or its tracked files.
- Out of scope: how a cusp's spur is filled and drawn (the renderer), and the joins of letters
  other than b, v and w.
- Stop when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and
  at each milestone). Then commit WIP and report. A compaction is not a stop: re-read this brief
  and `git log`.

## Report

Short and in plain words: what you built per letter (angles and lengths before and after); the
sheets' paths, naming the two or three to show Levi first; the checks' numbers; anything left;
your last SHA. End with `Ledger items` and K863's handle fields (owner, branch, last commit,
evidence, next).
