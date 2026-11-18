# K1469: put Muse 26B's reveal cut on screen (Claude agent stage, captures only)

Muse run 26B landed K1459 (01c72dfc, live since aad94eb7): during the appearance reveal, rp=gf's interior
fill is cut at junctions by today's own cuts (`lkJCut` in `gf_look.ts`; per-side cut margins in
`GfFxTable` from `g3Caps` and `junctionCutEntries`; `gf_app.ts`; `test/render/gf_fx.test.ts`). Only its unit
test and a rest frame were checked: its pinned reveal frames came out blank or frontier-glow only, with gf's
stats resetting between polls. That was most likely the cold-load GPU kill, fixed since (K1468, fc520c2d: a
cold load stays up with the watchdog on; gf's first composite takes 85-180 s cold, and a profile is warm
only for the exact links it has loaded). Read Handoff 26B in `docs/design/K1464_muse_batch26.md` first.

Nobody has seen this change on screen. Your job is the pictures and the counts, not a fix.

## Do

1. Copy Muse's probes from the main checkout, read-only source:
   `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1459\` (`k1459_cap`, `k1459_guard2`) and
   `.claude\probes\K1431\` (`k1431_inkcmp`) into your worktree if they are not tracked. Do not change any
   file in the main checkout.
2. Three builds: `01c72dfc~1` (before the change), origin/master, and today's
   renderer on origin/master (no `rp=gf`). Warm one profile per build with the exact links.
3. Pinned reveal frames (the handoff's pins) at three or more reveal times on the handoff's links: today |
   gf before | gf now, whole frame and 4x crops at the two junction spots the handoff names, plus six more
   junctions you pick (fused ends and wedge sides both). Confirm first that a pinned gf frame is not blank:
   if it is, find out why (gf's stats, context loss, the pin and the async compile) before anything else,
   and report that as the finding.
4. The handoff's counts: `k1459_cap` + `k1459_guard2`, `k1431_inkcmp`'s counts and ghost, and an instant
   (`am=instant`) sheet pair showing the rest frame is unchanged by 01c72dfc.
5. Look at every tile. For each junction say: the cut sits where today's does / on the wrong side (lkJCut's
   lateral sign) / missing / over-cut, and whether 01c72dfc made the spot closer to today, the same or worse.

## Done

Sheets under `.claude/probes/K1395/out/26B/` in your worktree (committed with `git add -f`), the counts, and
a plain verdict per spot. If the cut is wrong, say exactly where and how; do not edit `src/`.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `.claude/probes/` only. Nothing under `src/` or `test/`.
- **Memory and disk.** One Chrome at a time, at most two preview builds at a time, profiles under
  `$env:TEMP\k1469-*`, all deleted when you stop. Before each build or Chrome launch read
  `Get-CimInstance Win32_OperatingSystem` and wait (one blocking loop, 10 minutes at most) while
  `FreeVirtualMemory` is under 3 GB. Stop to report if `(Get-PSDrive C).Free` is under 5 GB.
- PowerShell. Read code through the shell; the Read tool only for images.
- Ports 5620-5639. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock.
- Commit WIP at every milestone. Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch
  the phone.

**Stop rule.** Stop when Done holds, or after 1 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1469` here, commit, and report: the sheets' paths, the counts, the verdict per spot, a
`Ledger items` list and K1469's handle fields.
