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

### Handoff K1456 s3

Agent stage, 2026-11-18 01:50-03:10 (claude session 09c7a672, worktree `.claude/worktrees/agent-aca0749f26e28002e`, branch `worktree-agent-aca0749f26e28002e`). Every number below is cold (fresh `--user-data-dir`), at 1600x900, interleaved, and taken under load: 20-30 other Chrome processes, free disk 3.5-7 GB (under the brief's 8 GB line after the 15-minute wait). The perf lock was stale and was taken. Seconds count from the load event to gf's first composite. Probes and raw JSON are in `.claude/probes/K1456/s3/` (`ab.ps1` is the A/B runner, `checks.ps1` the picture checks, `nogf.mjs` the no-gf count, and `out/` the results).

**Item 1 (stage 2, cold): no measurable change.**

| Build | Rounds (s) | Median (s) | Spread (s) |
|---|---|---|---|
| 0fc195b8 (stage 2) | 80.9, 83.0, 70.7 | 80.9 | 70.7-83.0 |
| parent 3586c33b | 108.8, 84.1, 66.4 | 84.1 | 66.4-108.8 |

The worker got its sources 8.3-12.1 s after the load. idx0 then took 56-97 s on the worker, and that compile is the whole wait.

**Item 2 (start the compile in the loading phase), 955de39d:**
- How it works: `frame_loop.ts` calls `startGfCompileEarly()` under rp=gf before the first frame. `gf_app.ts` adopts that run when the pass's `compileSources()` equal `gfAppSources()`, which is a pure function in `gf_pass.ts`, pinned equal by `gf_compile.test.ts`. Otherwise it terminates the run and spawns its own.
- The worker now gets its sources 0.77-0.89 s after the load, against 8.5-13.2 s on master.
- The first composite did not get measurably sooner:
  - early: 92.9, 77.1 and 81.6 s (median 81.6);
  - master: 107.9, 131.9, 77.7 and 74.4 s.
- In the quieter second run (`out/item23b-*`), master read 74.4 and 77.7 s, early 77.1 and 81.6 s.
- There, idx0 took 76-81 s when issued at 0.8 s against 62-65 s when issued at 12-13 s.
  - Inferred, not isolated: the early compile competes with the loading phase's own work (today's renderer's compiles in the same GPU process, the physics and the scene build) and loses about the head start.
- Not confirmed as a speedup. It is safe: see the checks below.

**Item 3 (wider):**
- gfcw=2 (2fed79ff): the gating program on a worker and context of its own, the rest on a second.
  - First composite 104.5, 114.7 and 95.4 s (median 104.5), against early's 81.6 s in the same runs.
  - idx0 took 94-114 s on its worker: two FXC compiles at once slow the one that gates.
  - Dropped in 857b5bb4.
- The deferral and gf_split options were not tried (out of time). Neither shortens idx0's own compile.

**What bounds the rest:** idx0's own D3D11 FXC compile, one single-threaded compile of 56-123 s under this load. The wait depends on that source (`gf_glsl.ts`, layers()' corner code; K1482's file), not on when or where the compile runs.

**Picture and behaviour checks.** The branch build was 2fed79ff's, whose code equals HEAD's but for the gfcw=2 flag (the flag was unset). Master was 0fc195b8.
- Link A froze at physics hash fff8c9e5 in all four loads.
- Branch against master was 0 px (cold against cold, warm against warm). inkbox matches cell for cell.
- The master-against-master control (cold load against warm) was 169 px, and the branch showed the same 169 px.
- Reveal: the repeat visit shows today's ink at 3, 5 and 7 s. On the first visit, both builds show the loader through 10 s and today's reveal by 14 s.
- takeover.mjs (repeat visit): the reveal ran 2.29-7.47 s and gf took over at 8.89 s, 1.42 s after the end.
- A link without rp=gf: 43 frag programs, 13 over 20k chars, no gf worker and no gf chunk, on both builds, twice at 45 s. A 20 s count read 20 against 43, which was load progress.
- hold.mjs, warm, link A: 60/60 PASS.
- `npm test`: green after item 2 (3170 passed). After the rebase on origin/master a28929be: 3170 passed, 18 skipped.

**Next:**
- Cut idx0's compile in `gf_glsl.ts` (K1482's lane), or give the first composite a smaller program that compiles fast and swap the full one in later. Splitting and deferring do not shorten the program that gates.
- Re-measure item 2 on a quiet machine before deciding whether it stays: under load it shows no gain.