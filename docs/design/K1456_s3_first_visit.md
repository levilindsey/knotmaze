# K1456 stage 3: rp=gf's first visit, start the compile sooner and run it wider (Claude agent stage)

Read `### Handoff K1456 s2` in `docs/design/K1456_s2_first_visit.md` whole. On a first visit to Levi's link
(`https://levi.dev/knotmaze/?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1`) gf's first composite waits for ONE program,
the look's full program, which the compile worker links in 40-96 s; the first composite came 55-106 s after
the load (under load). Stage 2 (merged 0fc195b8) put the compile poll on a timer and found two things outside
its files: the worker gets its sources only 8-10 s after the load, and it links one program at a time.

The compile cost of the shader source itself (the corner code of `layers()` in `gf_glsl.ts`) is Muse run 26J's,
not yours: do not edit `gf_glsl.ts`.

## Do, in this order

1. **Settle stage 2's open number first** (it decides what a cut looks like): cold, median of three each,
   interleaved, 0fc195b8 against its parent on master (3586c33b), seconds from the load event to gf's first
   composite on Levi's link at 1600x900. Under the perf lock if it is free or frees within 20 minutes of ONE
   blocking wait; otherwise under load, labelled, with the spread shown.
2. **Start the compile during the loading phase.** The worker's sources depend only on the link's settings,
   not on the built scene: create the worker and post the first program (the one that gates the first
   composite) as early as the page can, before the first drawn frame (`frame_loop.ts`, `gf_app.ts`,
   `gf_compile_worker.ts`). Number: seconds from the load event to the worker's first compile issued (8-10 s
   on master), and to the first composite.
3. **Run the compiles wider.** One program at a time leaves cores idle and puts the gating program in a queue
   with today's renderer's own ~35 programs. Measure, then keep what cuts the first composite: the gating
   program on its own worker and context with the rest on a second; today's renderer's programs that the
   rest look does not need deferred until gf composes (only if the reveal draws the same without them);
   `gf_split.ts`'s two passes compiled as two programs on two workers in place of the one full program (only
   if the split's picture is exact on the desktop: 0 px against the full program at rest on link A).

## Done

- Item 1's two medians and spread.
- Items 2 and 3: for each change, the seconds from load to gf's first composite on a cold visit to Levi's link,
  median of three, before and after, interleaved, on the same machine state; say plainly what bounds the rest.
- The picture unchanged: at rest on link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`), frozen at
  the same physics hash (`.claude/probes/K1472/restab.mjs`, `.claude/probes/K1456/s2/inkbox.py`), 0 px against
  master with a master-against-master control; the reveal on a first and a repeat visit shows today's ink as
  before (`.claude/probes/K1472/liveshots.mjs` frames at 3, 5, 7 s, looked at).
- A repeat visit still takes over within about 2 s of the reveal's end, never in the middle of it
  (`.claude/probes/K1472/takeover.mjs`).
- A link without `rp=gf` starts no worker and compiles no gf program (a count, before and after).
- `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green.

A partial result lands: item 2 alone is worth merging. Say plainly which commits are confirmed.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`. If a fetch
  fails, retry a few times, then carry on from what you have.
- Files: `frame_loop.ts`, `gf_app.ts`, `gf_pass.ts`, `gf_compile_worker.ts`, `gf_split.ts`, main.ts's and
  `src/app/`'s wiring only as far as an earlier start needs it, their tests. Others at work: an agent on the
  border faults (K1482: the key and composite code in `gf_glsl.ts`, `eval.ts`, `tables.ts`, `gf_keys.ts`,
  `gf_look.ts`); Muse batch 26 in the main checkout (the fill colour and the j64 fill line in `gf_look.ts`,
  K1477's stub, a frame-time bisect that may touch `gf_pass.ts`, then the look program's compile time in
  `gf_glsl.ts`). Keep the diff small and rebase on origin/master before the handoff. Do not change any file
  in the main checkout.
- **Timings.** Compile times stretch when other Chromes run. Compare before and after in interleaved,
  back-to-back runs and label every number taken under load. Perf lock (`$env:TEMP\claude-perf.lock`, one
  line: owner, start time, what): take it for the before/after pairs if it is free or frees within 20 minutes
  of ONE blocking wait (a lock older than 30 minutes is stale); delete it when done.
- **Memory and disk.** One Chrome at a time, one cold gf load at a time, at most two preview builds
  (`scripts/preview.ps1 -Port <p> -Ref <commit>`; it needs the worktree's node_modules complete: `npm ci`
  first if it is not), profiles under `$env:TEMP\k1456s3-*`, all deleted when you stop. Before each build or
  Chrome launch wait in ONE blocking loop (15 minutes at most) while `FreeVirtualMemory` is under 3 GB or
  `(Get-PSDrive C).Free` is under 8 GB.
- A profile is warm only for the exact links it has loaded. A gf frame counts only once gf composes
  (`composites` rising in its stats).
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5640-5659. Headed, real-time Chrome, never `--virtual-time-budget`.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files, not raw frames). Never push.
  Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried and
  why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1456 s3` here, commit, and report: the numbers, which commits are confirmed, a `Ledger items`
list and K1456's handle fields.
