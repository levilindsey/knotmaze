# K1468 stage 2: the packed target's frame time, its pixels and its cold compile (Claude agent stage)

Stage 1 (`docs/design/K1468_gf_cold_load_gpu_hang.md`: read Handoff K1468 whole) made every rp=gf program
write one `uvec4` into one RGBA32UI target (merged, fc520c2d). A cold load now stays up: fresh profile,
watchdog on, no GPU-process dump, no loss on the app's canvas, three reloads in one tab leave the loss guard
at 0, a warm load's first composite at 1.2 s (coordinator's check, `.claude/probes/K1468/reload.mjs`). Three
things are open, in this order.

## Do

1. **The frame time on the gfh=1 link.** Stage 1 read, at rest on link A
   (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`), 17.3-19.0 ms and 359-410 composites per 10 s on the
   packed build against 9.6-15.8 ms and 562-567 on master before it; link B (`?3&xp=off&am=instant&rp=gf`) was
   within 1%. The rounds were not interleaved and master's pair was noisy.
   - Measure first, under the perf lock: three builds, 8711ef35 (before K1451 stage 4), ae2b4dfb (K1451 stage
     4, before the packed target) and origin/master, on links A and B, interleaved rounds (ABC ABC, four
     rounds, 10 s each, `rest.mjs`), one profile per build warmed with the exact links it measures. Report
     frame p50 and composites per second, per build and link, with the spread. ae2b4dfb against 8711ef35 is
     K1451's owed bench (bar: within 5%); say plainly whether it passes.
   - Then attribute the gap on link A (the packed write, the k/255 table read in the composite, a program
     set that master did not draw, or something else: switch each off in a probe build) and remove it.
   - While you hold the lock, also run K1451's build time once: `k1451_buildtime.ts 5` in
     `.claude/probes/K1451/` (it needs `tables_k1451m.ts` copied from commit e83fa5a6's `tables.ts`; delete
     the copy after). Report the two numbers.
2. **The pixel A/B.** `ab.mjs`'s freeze lands on one of two physics hashes per link (A fff8c9e5 / 10104c64,
   B f9d72040 / 49c20566), and master against master at one hash still differs on thread edges on three of
   five pairs. Find what the freeze leaves unpinned, make it repeatable, then compare origin/master against
   ae2b4dfb on both links at fade 0.14 and 1.2, `tlk=border` and `tlk=fill`.
3. **The cold compile.** gf's first composite on a fresh profile comes at 84-117 s (A) and 127-178 s (B), one
   D3DCompile of 70-90 s on a pool thread, against 51-66 s before the packed target. Shorten it (a smaller
   packed program, less inlining in the look form, splitting the look's work between two single-target
   programs) or show what bounds it. Today's renderer draws meanwhile, so this is the least urgent of the
   three.

## Done

1. The interleaved table, and on your tip links A and B within 5% of ae2b4dfb in frame p50 and composites
   per second.
2. The A/B probe gives 0 px on a same-build control for all 8 pairs, and your tip against ae2b4dfb differs by
   0 px inside the maze on all 8 (or every differing pixel is named and explained).
3. Cold, fresh profile, watchdog on, three loads per link on your tip: no dump under `Crashpad/reports`, no
   loss on the app's canvas, the GPU main thread under 5 s per 10 s (`gputhreads.ps1`), and the time to gf's
   first composite beside stage 1's.
4. `reload.mjs` (three reloads) leaves `knotmaze.gfLosses` unset; `hold.mjs` (`.claude/probes/K1450/`) 60/60
   on both links, on a profile warmed with those exact links; `npm test` green.

A partial result lands: item 1 alone is mergeable.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: the targets, output writes and reads in `gf_pass.ts`, `gf_app.ts`, `gf_split.ts`, `gf_glsl.ts` and
  the look form's inputs and outputs in `gf_look.ts`; `src/app/context_loss.ts`; their tests. Another agent
  (K1460 stage 5) edits `tables.ts`, `gf_pack.ts` and the fade and gap code in `gf_look.ts`; Muse batch 26
  edits `gf_look.ts`, `gf_pass.ts` and `gf_reveal.ts` in the main checkout. Keep the diff small and rebase on
  origin/master before the handoff.
- gf's border look (`tlk=border`) stays as it is (Levi, 2026-11-17).
- **The perf lock** (`$env:TEMP\claude-perf.lock`, one line: owner, start time, what): take it for the frame
  times and the build time only, wait for it inside ONE blocking command (a lock older than 30 min is
  stale), delete it when each measurement ends. Other agents run Chrome meanwhile: say so beside the numbers.
- **Memory and disk.** One Chrome at a time, at most three preview builds, profiles under
  `$env:TEMP\k1468s2-*`, all deleted when you stop. Before each build or Chrome launch read
  `Get-CimInstance Win32_OperatingSystem` and wait (one blocking loop, 10 minutes at most) while
  `FreeVirtualMemory` is under 3 GB. Stop to report if `(Get-PSDrive C).Free` is under 5 GB.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5660-5679. Headed, real-time Chrome, never `--virtual-time-budget`.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files, not pngs). Never push. Never
  edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried and
  why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1468 s2` here, commit, and report: what holds, the numbers, a `Ledger items` list and
K1468's handle fields.
