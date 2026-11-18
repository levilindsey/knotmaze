# K1456 stage 2: rp=gf's first visit, the wait before gf takes over (Claude agent stage)

On a first visit to Levi's link (`https://levi.dev/knotmaze/?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1`) today's
renderer draws the reveal and the rest look, and gf takes over 60 to 90 s after the load (live, 2b0fe219:
gf composing between 60 and 90 s; 85 s on a quiet local build, 121 s before 62964f14). A repeat visit takes
over at about 2 s. Until the takeover the page also keeps composing about 56 frames a second at rest (K1481).
This wait and link A's frame time are what stand between rp=gf and being the default; the frame time is Muse's
(run 26I), the wait is this stage.

Read first: `### Handoff K1472 s2` in `docs/design/K1472_s2_reveal_parity.md` (the compile worker links every
program first on its own context, `compileGate`, the reveal's order; cold 85 s, warm 1.9 s),
`### Handoff K1472 s3` in `docs/design/K1472_s3_reveal_parity.md` (gf never takes over in the middle of a
reveal), `docs/design/K1450_gf_blink.md`'s handoff and K1456's evidence (`.claude/probes/K1456/out/26A`,
`.claude/probes/K1450/cold.mjs`, `.claude/probes/K1472/progs.mjs`). K1452 measured six programs of 40-63k
characters at 4-19 s each on the main thread.

## Do

1. **Where the 60-90 s goes.** Cold (a fresh profile, so Chrome's shader cache is empty) on Levi's link at
   1600x900: per program, its source size, when its compile and link were issued and when each was ready,
   on the worker and on the page; which program gates gf's first composite at rest; what the page does
   meanwhile. A table, twice, so the spread is known.
2. **Cut it.** The number: seconds from the load event to gf's first composite on a cold visit to Levi's
   link, median of three, before and after on the same machine state. Candidates, yours to choose and to
   replace: a small first program holding only what the rest look of this link draws (no reveal, explore,
   FX or pluck variants; constant loop bounds; fewer texture fetch helpers), with the full programs behind
   it; splitting the largest program's passes; what makes the driver's compiler slow on this source (loops,
   branches on uniforms, long functions) measured by bisecting the source, not guessed.
3. **K1481**: at rest while compiles are pending, the page should not compose 56 frames a second. Number:
   composites per 10 s at rest before the takeover, before and after.

## Done

- Item 1's table.
- Item 2's number before and after, with what bounds the rest said plainly. A cut that changes what gf draws
  is not one: at rest on link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`) your gf against
  master's gf shows the same dark-ink count in each of ten named boxes (captures of one build differ load to
  load by tens of thousands of 1-2 level pixels on stroke edges, so compare ink counts in boxes at the same
  physics hash, and show a master-vs-master control beside your number).
- The repeat visit still takes over within about 2 s; no takeover in the middle of a reveal
  (`.claude/probes/K1472/takeover.mjs`).
- `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green.

A partial result lands: item 1's table alone is worth merging. Say plainly which commits are confirmed.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`. The desktop's
  network drops connections tonight: retry a failed fetch a few times, then carry on from what you have.
- Files: `gf_app.ts`, `gf_pass.ts`, `gf_compile_worker.ts`, `gf_split.ts`, the program assembly in `gf_glsl.ts`
  only as far as a smaller program needs it, their tests. Others at work: an agent on the border faults
  (K1482: the key and composite code in `gf_glsl.ts`, `eval.ts`, `tables.ts`, `gf_keys.ts`, `gf_look.ts`);
  Muse batch 26 in the main checkout (`tables.ts`, `gf_look.ts`, and later a frame-time bisect that may touch
  `gf_pass.ts`). Keep the diff small and rebase on origin/master before the handoff. Do not change any file
  in the main checkout.
- **Timings.** Compile times stretch when other Chromes run, and tonight they do. Compare before and after
  in back-to-back runs and label every number taken under load. For the final before/after pair take the
  perf lock (`$env:TEMP\claude-perf.lock`, one line: owner, start time, what) if it is free or frees within
  20 minutes of ONE blocking wait (a lock older than 30 minutes is stale); delete it when done. Otherwise
  report the pair as taken under load.
- **Memory and disk.** One Chrome at a time, one cold gf load at a time, at most two preview builds
  (`scripts/preview.ps1 -Port <p> -Ref <commit>`), profiles under `$env:TEMP\k1456s2-*`, all deleted when you
  stop. Before each build or Chrome launch wait in ONE blocking loop (15 minutes at most) while
  `FreeVirtualMemory` is under 3 GB or `(Get-PSDrive C).Free` is under 8 GB.
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
`### Handoff K1456 s2` here, commit, and report: the table, the numbers, which commits are confirmed, a
`Ledger items` list and K1456's handle fields.
