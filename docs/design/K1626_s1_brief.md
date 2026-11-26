# K1626 stage 1: physics keeps a junction and the crossing beside it apart (Levi: a priority)

Levi, 2026-11-25, with a phone picture (`.claude/probes/K1626/levi_phone.png` in the main checkout, untracked;
copy it into your worktree): on `?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1`, right side of the maze near the
centre, "a junction with an adjacent crossing of one of the threads going over another from the junction.
Physics isn't doing a good enough job of keeping these threads apart. This is a recurring problem in other
places too." Then: "That physics issue should be a priority".

In the picture the place is the Y junction at about (640, 940) of the 891 x 2000 screenshot: one of its arms
crosses another thread immediately beside the junction, so the junction, the crossing and the arms pile into
one blob with no paper between them. Read ledger item K1626
(`node $HOME/Repositories/claude-config/tools/ledger.mjs show K1626 --repo .`). Base: `origin/master`.

## Goal

At rest, a crossing sits a clear distance along the arm from a junction, and the junction's arms and the
crossing's threads are apart enough that each reads on its own: paper (or at least each thread's own edge)
shows between the junction and the crossing, at Levi's place and at the other places of this kind. You own
the technique; the fix is in `src/physics/` (or in generation, if the measurement shows the layout leaves no
room and physics cannot make it: say so with the numbers before changing generation).

## This stage

1. Find the places: on Levi's link and at least five other mazes (the test set A_3..A_d, D_1..D_a; name the
   ones you use), list every junction with a crossing closer along an arm than some distance, with the
   distance, at rest. Say how common it is and what holds them together, observed by a change on a frozen
   settled state, not by reasoning (the sliding bindings' ordering clamps, the junction cover, the depth
   exemption near a crossing, MIN_PASS_SEPARATION and its triangle: whichever the measurement points to).
2. Fix it so the distance has a floor that the picture needs, with no new kinks, pinches or stretched arms
   elsewhere.
3. The knot still sleeps (the sleep and quiescence tests pass as written; never loosen them), drag feel is
   unchanged in kind, and a physics update costs no more than 5% over master (one A/B under the perf lock).

Another agent (K1622) is changing how junction arms bend in `src/physics/` right now, on branch `k1622-s1`
(read only for you). Yours lands first; keep your change small and local so its branch can be carried over.
Re-freeze the golden snapshots and other pins a physics change moves, and name each (pre-launch, no
back-compat). Keep out of `src/render/` (two agents work in `gpu_field/`).

## Done

1. The cause, with the measurement; the count of such places per maze, master against yours, and the
   smallest junction-to-crossing distance.
2. Src, tests, `npm test` green, `npm run build` passes, pins named.
3. For Levi: one picture, `master | yours`, large crops (at least 10x device pixels of a 1x capture, or a
   capture at high zoom) of his place and of five other such places, in `rp=gf&gfh=1` with his link's look,
   settled, real-time captures, viewed by you; plus the whole maze of his link side by side.
4. Update cost and time to sleep, master against yours.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1626-s1`, branch `k1626-s1`, from `origin/master`;
`node_modules` as a directory junction to the main checkout's (never `npm install`). Write only inside your
worktree. Read code through the shell; the Read tool only just before an Edit, and for images. Real-time
captures only, under the perf lock (`scripts/perf_lock.ps1`; three other agents share it: wait inside one
blocking command), ports 5655 to 5659. Commit WIP at every milestone (`git add -f` for probe tools, never
their outputs). Never push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
`--virtual-time-budget`. Helpers on sonnet, mechanical work only; looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. If the fix costs the sleep, stop and say so. On stopping: commit WIP, append
`## Handoff (stage 1)` here, commit, and report: verdict first (safe to land or not), picture paths, numbers,
a `Ledger items` list and the handle fields.
