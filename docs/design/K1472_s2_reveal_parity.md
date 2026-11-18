# K1472 stage 2: rp=gf's reveal against today's, spot by spot (Claude agent stage)

Stage 1 (`docs/design/K1472_gf_levis_link.md`: read Handoff K1472 whole) found why gf's appearance reveal
drew no thread ink (two tables uploaded as R32F) and fixed it (merged, 998be573). Its sheets
(`.claude/probes/K1472/out/pin/levi_sheet_whole.png`, `levi_f6_zoom8.png`; tools `pinsheet.mjs`, `sheet.py`,
`progs.mjs`, `watch.mjs`) show gf's ink following today's front. This stage makes the reveal match.

The bar: **today's renderer on the same link at the same pinned reveal time**, spot by spot. gf's border look
at rest stays as it is (Levi, 2026-11-17: darker borders than today's are wanted).

Links: Levi's `?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1` (trace, burn, border look) and `?b.FMKB4DIQ` with the
default look and with trace-rainbow (K1469's link: `.claude/probes/K1459/k1469_pinwatch.mjs`,
`k1469_live.mjs`, `docs/design/K1469_reveal_cut_check.md`).

## Do

1. **Sheets first.** Three builds: today (no `rp=gf`), origin/master, and origin/master with 01c72dfc
   reverted (a probe branch; 01c72dfc is Muse 26B's junction cut in the reveal, `lkJCut`, never seen on
   screen). Pinned frames at eight reveal times on the three links, whole frame and 4x crops at twelve or
   more spots: thread ends, fused junction ends, wedge sides, crossings behind the front, the front itself.
   A gf frame counts only once `compileReady` covers the programs it draws.
2. **Name every difference** from today's, largest first. Known so far: at a thread's end today's cut is
   notched and gf's is a straight diagonal with stray pixels (`levi_f6_zoom8.png`); on the whole-frame sheet
   gf's ink behind the front looks fuller and brighter than today's at the early times (today's strokes are
   dimmer and more broken there). Say for 01c72dfc's cut at each junction: where today's is / wrong side /
   missing / over-cut, and whether it made the spot closer to today, the same or worse.
3. **Fix them**, a number for each (pixels differing from today inside a named box at a pinned time, or a
   count that fails on master). Keep 01c72dfc, repair it or revert it by what the sheets show.
4. **Levi's own complaints on this link**: "the entire maze blinks in and out constantly" and "I don't see
   any fading happening, regardless of the slider value". On a warm page, drag Crossing fade (`fl`) through
   the panel and watch gf's stats and the picture: does an edit replay the reveal, drop gf back to today's
   renderer, or queue a compile? Whatever makes the maze vanish or the fade not respond, fix it.
5. **The cold wait.** `progs.mjs` cold on Levi's link: which programs compile, in what order, and when gf
   takes over. If the order can put the reveal's program first, do it.

## Done

1. Sheets today | master gf | your gf under `.claude/probes/K1472/out/s2/`, every tile looked at, each spot
   named fixed, same as master or open.
2. Each number failing on master and passing on your tip; a plain verdict on 01c72dfc.
3. Item 4 answered with what you saw, and fixed if it is gf's.
4. `npm test` green; `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on
   `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`; at rest (`am=instant`) your gf against master's gf
   differs by 0 px, or every differing pixel is named.

A partial result lands: say plainly which commits are confirmed on the sheets.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `gf_reveal.ts`, the reveal's code in `gf_look.ts` (`lkJCut`, `lkFx`), `gf_app.ts` and `gf_pass.ts`,
  the FX table, their tests. Another agent (K1460 stage 5) edits the fade and gap code in `gf_look.ts`,
  `tables.ts` and `gf_pack.ts`; Muse batch 26 edits gf files in the main checkout. Keep the diff small and
  rebase on origin/master before the handoff. Do not change any file in the main checkout.
- **Memory and disk.** C: free space swings by 10 GB or more within minutes: it is the pagefile growing
  under commit spikes (cold gf compiles are the likely cost), and it comes back. One Chrome at a time, one
  cold gf load at a time, at most two preview builds, profiles under `$env:TEMP\k1472s2-*`, all deleted when
  you stop. Before each build or Chrome launch wait in ONE blocking loop (15 minutes at most) while
  `FreeVirtualMemory` is under 3 GB or `(Get-PSDrive C).Free` is under 8 GB. Stop to report only if C: is
  still under 5 GB after that wait.
- A profile is warm only for the exact links it has loaded.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5640-5659. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files and sheets, not raw frames).
  Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried
  and why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1472 s2` here, commit, and report: what holds, the sheets' paths (each spot named), the
numbers, which commits are confirmed on screen, a `Ledger items` list and K1472's handle fields.
