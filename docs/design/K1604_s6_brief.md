# K1604 stage 6: keep stage 5's good cuts, drop its extra gaps, fix the rows it missed (rp=gf)

Read first: `K1604_s5_brief.md` with its `## Handoff (stage 5)` on branch `k1604-s5` (your base: f1 + f2 in
`src/render/gpu_field/gf_look.ts`, tests in `test/render/gf_gap.test.ts`, tools in `.claude/probes/K1604/s5/`).
Stage 5's pages, read only, look at them first: `...\worktrees\k1604-s5\.claude\probes\K1604\s5\out\p18_1..3.png`
(18 rows, master | f2), `p12_1..2.png` (the 12 largest changes elsewhere), `tri6.png`.

## Levi, 2026-11-26, on `p18_1.png` and `p12_1.png` (master | f2)

His rule stands: the gap cuts through the border parallel to the over thread, no partial cuts that leave
dangling parts.

- p18: "Row 9 attempt is good. 5,6,7,11: no change." (Row 2 reads fixed to the coordinator; 12, 13, 17 he has
  not judged yet.) So row 9's f2 result (A_3 x73: wedge gone, thin sliver beside the over) is ACCEPTED as is.
- p12 (largest changes elsewhere), by its rows:
  - 1 A_6 (1952,407) and 5 A_8 (971,811): "there was no problem, and the attempt introduced weird extra gaps".
    These must go back to master's look.
  - 2 A_9 (1057,329), 3 A_9 (1318,1442), 4 A_6 (1594,451): "were ok before, maybe better with attempt". Either
    look is fine.
  - 6 A_d (2118,802): "worse with the attempt, I think, but understandable". Prefer master's look there; not a
    fail if it stays.

## This stage

1. Say, observed, what separates p12 rows 1 and 5 (and the other dashed places, handoff #8, #10) from rows 2, 3,
   4 and from p18 rows 2, 9, 12: why does the longer cut make new gaps where there was no problem? (Stage 5's
   inference, untested: the under border runs at a shallow angle beside the over.) Then limit the longer cut so
   those places read as master while rows 2, 9, 12 keep f2's result.
2. Fix the unchanged marked rows: 5 (A_3 x37 j51), 6 (A_3 x195 j101; f1 fixed it, f2 lost it: slots
   21260-21314, `jdbg.mts`), 7 (A_3 x292 j123), 11 (A_3 x166 j54). Rows 13 (A_4 x301) and 17 (A_4 x22) as far
   as they come; 17's cut neighbouring band end should not be cut.
3. View EVERY changed place against master at the close zoom (not grid scale). A place with no problem on
   master that gains a gap, a dash, a hairline or a loose piece is a fail: list each one left.

Binding (as stage 5): never remove a thread's border outside a gap; the under pass keeps its width and heading;
tight turns keep today's ball (K1572); K1627's specks stay gone; 0 px change beyond 2.5 world from any junction
on the 21 mazes (A_3..A_d, D_1..D_a) and his link `?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1`; loose pieces
(`frag.py`) do not rise over master; do not use today's (non-gf) border strokes as the bar; keep out of the
reveal path; no new per-pixel texture reads away from junction pixels. You own the technique.

## Done

1. The separating cause, observed (switch-off or patch on the frozen state).
2. Src, tests, `npm test` green, `npm run build` passes, pins named.
3. For Levi, pages `master | f2 | yours` (three panels so he sees what was kept), close zoom plus a medium zoom,
   border look, no overlays, same frozen state, real time, under 7000 px tall each, viewed by you: the nine
   marked rows first, then the 12 places of `p12`, then the 12 largest changes of yours against master that are
   not in either list.
4. `frag.py`, `screen.py` and changed-pixel counts, master | f2 | yours.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1604-s6`, branch `k1604-s6`, from branch `k1604-s5`
(clean history: lands by taking the files); `node_modules` as a directory junction to the main checkout's (never
`npm install`). Write only inside your worktree. Read code through the shell; the Read tool only just before an
Edit, and for images. Real-time captures only, under the perf lock (`scripts/perf_lock.ps1`; read a lock before
touching it, never delete another owner's), ports 5670 to 5674; refuse a busy port and check the listener is
your build; kill your servers and probe processes before you stop. Commit WIP at every milestone (`git add -f`
for probe tools, never their outputs). Never push, never bare `git stash`, never edit LEDGER.md, never touch the
phone, no Chrome `--virtual-time-budget`. Helpers on sonnet, mechanical work only; looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. If the extra gaps cannot go while rows 2, 9, 12 stay fixed, say which you chose and
show both. On stopping: commit WIP, append `## Handoff (stage 6)` here, commit, and report: verdict first (safe
to land or not), page paths, counts, a `Ledger items` list and the handle fields.
