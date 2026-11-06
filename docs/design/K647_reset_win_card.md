# K647: the result card after Reset path finishes a win (Muse batch 22, Run J)

Ledger: K647. Chain tag 22J; ports 5920-5929. One Muse run in the main checkout on master;
it commits and pushes like batch 22's other runs.

## Why

Levi, 2026-11-05, on K647's card ("If you press Reset path as the winning move arrives,
should the result card still show?"): "Show the card".

Pressing Reset path while the dot is still travelling on the move that wins the maze counts
the win and records the result, then restarts the maze in the same instant: the result card
is built and hidden again at once, and since 4b17c554 (K188) the restart clears the confetti
too. The win is recorded and nothing shows. The other eight ways to finish that K336 checked
(live finish, reload during the dot's travel, replay, practice, free play, real time, both
fire-race clocks) show the card and throw one burst. This press must do the same.

## Read first

- Batch 22's "How to work" (`docs/design/K1208_muse_batch22.md`, that section and the pages
  it sends you to). Nothing else in that brief applies to this run.
- `docs/design/K336_cannons.md`: its Handoff ("Path 8") and how the nine paths were checked.
- `.claude/probes/K336/banners/` (`banners.mjs`, `lib.mjs`, `results.md`): the probe that
  drives the nine paths.
- `src/app/panel_wiring.ts` `onResetPath`; what `deps.showFabricWin` does; `resetPathAction`
  in `src/game/daily_attempt.ts`.

## What is there today

`onResetPath` first finishes a pending win (`deps.pendingWin`: it cancels the dot's move and
calls `deps.showFabricWin()`), then runs `resetPathAction` as for any press, which restarts
the maze and hides the card. On a daily the same press writes the official result, and the
badge then reads "replay, not scored".

## Tasks

1. A Reset path press that finishes a pending win ends the way the dot's arrival would: the
   result card shows, one burst plays, the result is recorded once, and the maze is neither
   restarted nor backtracked under the card. Everything a live finish leaves (the head at the
   finish, the trail, the stats, the move grid, a daily's official result and its badge)
   equals what the same winning move leaves when the dot arrives on its own. A press with no
   pending win behaves as today.
2. Tests: pin the rule with a unit test at a pure seam (`resetPathAction`, or a small new
   function) if one fits; `npm test` green.
3. The probe: rerun K336's banner probe for all nine paths, on ports 5920-5929, in a headed
   Chrome in real time (never `--virtual-time-budget`), holding the perf lock as the How to
   work says for GPU probes (another owner's bench may hold it: wait inside one blocking
   command, never by checking on later turns). Path 8 now shows the card and one burst on a
   free-play maze and on a daily attempt (the official result written once, the badge as
   after a live finish); the other eight are unchanged. Update `results.md` (its path 8 and
   its oddity section) and add it with `git add -f`.
4. Lore: find the old behaviour wherever it is written (Select-String for "Path 8",
   "pendingWin" and "Reset path" in `.claude/rules/` and `docs/`, not `docs/history.md`) and
   bring those lines up to date.

If task 1 needs more than `panel_wiring.ts` and its test (for example, if the win flow
assumes a restart follows), stop after the analysis and report what it would take, without
pushing.

## Done and close

Done when tasks 1 to 4 hold, `npm test` is green, and the deploy run after the push is green.

Commit message: `K647: Reset path during the winning move keeps its result card (Muse batch
22 Run J, 22J)`. Pull with rebase and autostash, then push to master.

Close: `node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs done K647 --repo
C:\Users\lsl\Repositories\knotmaze --commit <sha8>`, committed with the same tag in its
message and pushed. This run leaves K1208's handle to Claude.

## Report

Plain words: what changed and where; the probe's nine paths (card shown, bursts, results
recorded) before and after; the test; the commit SHAs; anything left over as `Ledger items`.