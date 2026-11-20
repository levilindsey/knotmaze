# K1482 stage 24: the outline takes its fill's corner at t81s and t4s (K1527; Claude agent stage)

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** His bar: at junctions and
under-tail ends the over thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.
Of the 14 sites he named on link A (`The sites` in `docs/design/K1482_s20_wedges_notches.md`), one is
finished, and only behind a switch: stage 23 (`docs/design/K1482_s23_corner_switch.md`) put stage 22's second
corner try on master as `gfk=1`, off by default, until Levi answers K1524.

This stage takes **t81s's tick and t4s's step**. Stage 22 (`### Handoff K1482 s22` in
`docs/design/K1482_s22_landable_corners.md`: read it whole, `Kind 2` twice) found that t81s's tick is not the
crossing cut stage 21 took it for: at 6x the fill's edge turns a corner there, and the ink follows the rising
part and ends square instead of taking that corner. Five probes on `lkCut` left the tick as it was; dropping
the s8 slot rule moved it and opened a new gap. Its patches, `notes.md` and 6x crops are in
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adabb55bc67661562\.claude\probes\K1482\s22` and
`...\out\s22` (`v_t81s_*.png`): read `notes.md` first and do not repeat those probes.

Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5). The border look draws the
outlines; `&tlk=fill` the fill.

## The goal

On link A, with the switch off and with it on: **the tick at the top of t81s and the step at the bottom of
t4s are gone**. The outline lies on the edge of its own fill through the corner (the fill look at the same
place shows where that edge goes), and no dot, stub, wedge, tick, notch, sliver or gap appears anywhere else.
You own the technique. The cause is not the finish line: a stage that ends with a diagnosis and nothing in
`src/` has not reached the goal while time remains.

## Do

1. `git merge origin/master` in your worktree first (stage 23's switch must be there: `gfk` in
   `src/render/gpu_field/`; if it is not, stop and report).
2. Trace t81s's tick: at points along the fill's edge through the corner, list what the mirror (`eval.ts`)
   gives for every term (each chain's side distances, the corner terms, home, the cuts, the slots), which
   term the fill takes and which the ink takes, and where the two part.
3. Fix it so the ink takes the corner its fill takes. This is a fault Levi named, so the fix is the
   **default** (not behind `gfk`), and it holds with `gfk=1` too.
4. t4s's step: the same trace. If it is the same class, the same fix covers it. If not, say what it is and
   fix it in the time left.
5. Every place the fix moves, on link A and on the bar's four mazes, goes on a sheet (the surrounding threads
   with a red box, then the box closer; today | new), and you judge each by eye: a clean place that changes
   is a regression to remove, a fault of the same kind that goes away is a gain to list.

## Done

- **By eye**, t81s and t4s, context crop and detail crop, today | new, switch off and switch on.
- **Link A**, loads of one state and one view (pin the background clock; stage 21's handoff, `The 76,609 px
  fill difference`, in `docs/design/K1482_s21_corners_rest.md`; report the floor first): every place outside
  the two sites where the border look changes is on the sheet and explained; the fill look 0 px, or each
  place named.
- **The bar** on your tip: `.claude/probes/K1436/k1436_bar.ps1`, `STRICT=1 -NoPerfLock`, scenes
  `ring,def,muse_hash,g41_user_tw64`, `-Base` origin/master's SHA, `-Tag k1482s24`: new 0 and grown 0; each
  gone find shown as a fault the fix removed.
- Under the perf lock on your tip: `hold.mjs` 60/60 on link A; `.claude/probes/K1482/s15/panelopen.mjs`; both
  dragchecks; `npm test` green (a pin that moves is re-frozen in the same commit and named in its message).
- Three or four lines of lore in `.claude/rules/render-gpu-field.md`: what owned the corner and what the ink
  took.
- The commits on your branch, in landing order, each green.

## How to work

As stage 22's `How to work` (and the one in `docs/design/K1482_s20_wedges_notches.md` it points to), with
these changes: ports 6090-6109, profiles `$env:TEMP\k1482s24-*`, probe directories `.claude/probes/K1482/s24`
and `.claude/probes/K1482/out/s24` (untracked: do not `git add` raw captures or dumps). Copy what you use
from the s22 worktree and change nothing there. At most three preview builds alive at once; stop yours and
remove their directories when you finish (the disk is short); a worktree needs `node_modules` through a
junction for `scripts/preview.ps1`, unlinked with `(Get-Item <path>).Delete()` when you finish. Muse runs
capture work in the main checkout and holds the perf lock for up to 25 minutes at a time. **Take the lock only
through `scripts/perf_lock.ps1`** (K1533): `pwsh scripts/perf_lock.ps1 -Owner "claude K1482 s24" -What "<what>"
-Cmd "<one command that runs the whole guard sequence>"`; it waits (60 min by default), takes the lock, runs
the command and releases it. Never write or remove `$env:TEMP\claude-perf.lock` yourself. If it exits 3 (the
lock never freed), report the guards as not run; do not run them without the lock. Stage 23's four guards
(hold off and on, panelopen, both dragchecks) did not run before it landed; the coordinator runs them on
master, so if one fails on your tip, run it on your merge base too before calling it yours
(`.claude/probes/K1482/s23/run23.ps1` in the s23 worktree, `agent-a5016731195d015ff`, is the whole sequence).
Later today Muse's run 26Z2 edits `gf_look.ts` or
`gf_pass.ts` on master: `git merge origin/master` again before your final checks.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; keep the last 30 minutes for the checks. A compaction is not a
stop: re-read this brief and `git log`. On stopping: commit WIP, append `### Handoff K1482 s24` here, commit,
and report: the commits to land by SHA in order, the numbers, the sheets' absolute paths, a `Ledger items`
list and K1482's handle fields. Never push, never edit `LEDGER.md`.
