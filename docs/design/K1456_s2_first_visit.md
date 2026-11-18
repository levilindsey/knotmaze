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

### Handoff K1456 s2

Stopped 2026-11-18 about 01:50. The stop rule's clock had run out, and every timing below was taken under
load: 26-29 other Chrome processes, and the perf lock was taken by another agent (K1474) for the last
45 min. Branch `worktree-agent-aa439c7176a2f52db`, rebased on origin/master 3586c33b. Evidence is in
`.claude/probes/K1456/s2/` (`out/` holds every run).

**Item 1, the table** (`table.mjs`; master b28822bc, cold profile, `?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1`,
1600x900; seconds after the load event, which fell at 0.25-0.32 s):

| idx | program (fs chars) | worker run 1 | worker run 2 | page link |
|---|---|---|---|---|
| 0 | look, full (78,737) | 9.86 -> 106.21 (96.4 s) | 8.22 -> 94.46 (86.2 s) | cache hit, 0.13 s |
| 2 | look (79,065) | 30.5 s | 54.1 s | 0.1 s |
| 1 | look (76,983) | 10.8 s | 13.9 s | 0.1 s |
| 3-5 | plain (42-44k) | 14.7 / 3.3 / 25.1 s | 16.5 / 3.2 / 26.4 s | 0.02-0.06 s |
| 6-7 | reveal (43-45k) | 23.0 / 3.5 s | - | 0.06 s |

- The first composite came at 106.38 s in run 1 and 94.63 s in run 2.
- Only idx0 gates it: `drawReady` needs lprogs[0]'s full program, and the worker links it first.
- The worker links one program at a time. The page's own link of each program is then a disk-cache hit.
- Meanwhile, today's renderer draws the knot. Its ~35 page-only programs compile from 0.05 s to
  40-47 s, alongside idx0.
- The worker gets its sources only at 8.2-10.2 s. gf_app is created on the first visual frame, and the
  "loading" phase draws nothing, so the first 8-10 s of the wait sit before gf's compile starts. That
  trigger lives in frame_loop.ts, which is out of scope.

**Where the compile goes.** `ctime.mjs` salts the source and times one D3D compile and link.
`variants.mjs` stubs functions out, and `lvar` bisects `layers()`. Results, out/ct1-3.json:
- The full program takes 143 s, against 18 s with `layers()` stubbed.
- The free tier takes 22.5 s. The corners tier takes 87 s, as slow as the full program (90 s).
- The cost is `layers()`'s corner code (nk > 0) and adds up roughly linearly over its parts:
  - stubbing all the piece-K / arc / tip loops: 42.6 s;
  - stubbing fillBur: 65.4 s;
  - stubbing any single loop: 76-91 s.
- The loop bounds (MAXP/MAXK/MAXS) barely matter.
- So a small first program does not help: no tier takes over sooner, because the corners tier is as
  slow as the full program, and the free tier leaves corners out of the picture.

**Item 2, the wait** (seconds from the load event to the first composite, cold, under load):
- master: 54.8, 94.6, 106.4 (median 94.6);
- branch: 49.5, 52.1, 65.2 (median 52.1).

Not confirmed as a cut. The branch changes no shader source: the same-picture check reads 0 px, and the
compile is the same. The worker's idx0 alone took 41.5-55.5 s on the branch and 44.4-96.4 s on master,
so the spread is the machine's load. One possible mechanism is that master's forced GEOM redraws (item 3)
compete with the compile. It is unproven: two more master runs were planned, but the perf lock stayed
held. What bounds the wait:
- FXC's 40-96 s compile of `layers()`'s corner code in the full look program;
- plus the 8-10 s before the worker starts.

**Item 3, K1481** (commits a05db354 and 2906d33c, gf_app.ts):
- While programs compile, the idle poll now runs on a 250 ms timer (`COMPILE_POLL_MS`, `pollCompileSoon`).
  It asks for the next frame at once only when a poll issued or finished a program.
- Rest frames before the takeover (table.mjs frames, t > 16 s, under load), per 10 s:
  - master: 250-253 drawn frames;
  - branch: 435-447.
- The flags (`loopflags.mjs`, 10 s from 25 s after load) show why the count went up:
  - master's frames all carry GEOM (251 of 251, 255 pushes). That means a full `renderer.update()` every
    frame, at 25 fps.
  - The branch's GEOM falls to 46 frames (49 pushes).
  - What still drives the frames is PAINT_AMBIENT. It is on in every frame and runs today's renderer at the
    same rate WITHOUT gf on this link: 515 frames per 10 s, GEOM 1.
- So gf no longer forces work at rest, and the ~45-56 fps left is the link's own ambient paint. It is not
  gf's to cut.

**Checks** (branch fb3d92e6 against master b28822bc):
- Same picture, link A frozen at SIMT 20, phw=0 (`K1472/restab.mjs`, `inkbox.py`): hash fff8c9e5 on all
  three captures. Ink is identical in all ten boxes, and 0 px differ, branch against master. The
  master-against-master control is also 0 px.
- Repeat visit (`K1472/takeover.mjs`): the reveal was done at 7.39 s and the switch came at 8.41 s, 1.0 s
  later and not during the reveal. On the first visit the switch came at about 152 s, long after the reveal.
- `K1450/hold.mjs`, warm on link A: 60/60 PASS.
- `npm test` is green (3169 passed), before and after the rebase.

**Next.**
1. Start gf's compile worker during the loading phase. It needs the trigger in frame_loop.ts and saves
   about 8-10 s.
2. Cut the compile cost of `layers()`'s corner code in gf_glsl.ts (K1482's file). Options:
   - fold the piece-K / arc / tip loops into one;
   - move fillBur out of the per-entry loop.
   Re-time each change with `ctime.mjs` (a salted D3D compile).
3. Split the full look program into gf_split's two passes. The two halves compile on separate threads;
   check the split is still exact on the desktop.
4. Re-run master vs branch cold, quiet, under the perf lock, to settle whether item 3 also shortens the
   compile.
