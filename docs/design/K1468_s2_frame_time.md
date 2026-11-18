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

### Handoff K1468 s2

Stopped at 7:44 PM (started 7:08 PM) on the disk rule. C: dropped from 27.5 GB free at the start to
0.88 GB at 7:43 PM. The warm script's `Test-Disk` threw before the third build's warm. I deleted my own
files (the three preview builds, 2.44 GB, and two profiles, 0.24 GB), which brought C: back to 3.6 GB.
That is still under the 5 GB line, so no measurement ran.

- **What used the disk (inferred, not verified).** `C:\pagefile.sys` is system-managed and now 26.2 GB
  (allocated 25030 MB, in use 3.0 GB, peak 3.15 GB), last written 7:34 PM. Its size at 7:08 PM was not
  recorded. My own files came to 2.7 GB at most. Other agents' temp folders held 4.1 GB more: 1.6 GB in
  `k1460s5-prev`, 1.7 GB in `knotmaze-previews` and 0.8 GB in `k1436s3-prev`. If the pagefile grew from
  a commit spike, the space comes back only when Windows shrinks it, and with a system-managed pagefile
  that is usually at the next restart.
- **Done 1-4: nothing measured.** There is no interleaved table, no K1451 build time, no pixel A/B and
  no cold-compile run. The perf lock was never taken.
- **Cold first composite, as a side reading from the warm runs.** Watchdog off (`--disable-gpu-watchdog`),
  fresh profiles, one load per link, no context loss:
  - 8711ef35: link A 110.0 s, link B 138.8 s.
  - ae2b4dfb: link A 145.0 s, link B 150.3 s.
  - origin/master: not reached.
  These sit in or above stage 1's range (84-117 s on A, 127-178 s on B).
- **Probes committed** (`.claude/probes/K1468/s2/`), ready to run once C: has 5 GB free:
  - `common.ps1`: links A and B, `Wait-Mem`, `Test-Disk`.
  - `warm.ps1 <port> <name>`: warms one profile per build on both links, watchdog off.
  - `interleave.ps1 -Out <dir> -Rounds 4 -Builds "b8711=5660","bae2b=5661","bmaster=5662" -BuildTime`:
    the ABC ABC rounds under the perf lock, the lock waited for inside, then K1451's build time with
    `tables_k1451m.ts` copied from e83fa5a6 and deleted after.
  - `summarize.mjs <dir> [bae2b]`: the table and each build's percent against ae2b4dfb.
  - `rest.mjs` now passes a `#k1468p=<v>` hash to the page as `window.__k1468p`, before the URL rewrite.
- **The attribution probe for link A is ready.** Commit 182fb101 (8a33b692 before the rebase) is the
  probe build, reverted in the next commit. `#k1468p=div` replaces the composite's const `GF_U8[256]`
  table read with `vec4(uvec4(bytes)) / 255.0`. `#k1468p=alu` uses exact integer k/255 bits
  (findMSB, then ((k << (23 - e)) + 127) / 255; checked in JS for every k from 1 to 254). With no hash
  it reads the table, as master does.
- **Next.**
  1. Free C: to 5 GB or more. A restart (to shrink the pagefile) needs Levi.
  2. Build 8711ef35, ae2b4dfb and origin/master on ports 5660-5662 with `scripts/preview.ps1`, and warm
     each one with `warm.ps1`.
  3. Run `interleave.ps1 ... -BuildTime`, then `summarize.mjs`.
  4. Replace the 8711ef35 slot with a build of 182fb101, and compare the default, `div` and `alu` reads
     on link A.
  5. If the table read is the gap, the candidate fixes are: the exact ALU form; or reading only the
     chosen texel's bytes after the fringe loop (keep the uint word and test `(w >> 24) != 0u`); or a
     256x1 R32F lookup texture. Done 2-4 follow as the brief says.

### Handoff K1468 s2 (second run), 2026-11-17

Agent: claude session https://claude.ai/code/session_01SUPGULDxvE5gKXozfaFaFG, branch
`worktree-agent-ad4db178a3a26c189`, rebased on origin/master b01cc37b. Stopped at the 2 h cap. Item 3 was not
in scope; item 2 (pixel A/B) was not reached. Every number below was taken with another agent's Chrome on
ports 5640-5659 sharing the GPU (rAF intervals 18-35 ms, never a quiet machine); Muse did not hold the lock.

**Interleaved table** (out/run2_base, 9:31-9:52 PM, under the lock, four ABC rounds, link A = gfh=1, B = plain;
frame p50 ms per round / comp/s per round): 8711ef35 A 19.6 22.3 17.5 16.9 (med 18.55) / 35-57 (38.2);
B 16.3 16.0 17.1 16.6 (16.45) / (41.5). ae2b4dfb A 17.3 19.4 17.5 11.1 (17.40) / (40.5); B 17.1 16.5 19.4 16.1
(16.80) / (40.8). dc335eab (origin/master then) A 18.2 19.3 18.3 19.2 (18.75) / (37.9); B 18.6 19.1 16.6 15.6
(17.60) / (38.7). Round 3 had a quiet stretch: link A reached vsync on 8711 and ae2b (57 comp/s), master stayed
at 36.

**K1451 verdict**: ae2b4dfb is not slower than 8711ef35 (A -6.2% frame / +6% comp/s, B +2.1% / -1.7%): within
the 5% bar, under contention. **K1451 build time** (`k1451_buildtime.ts 5`, under the lock): e83fa5a6 184.0 ms,
dc335eab 197.1 ms, +7.1% (per scene -9% to +29%; a dry run outside the lock gave +5.2%).

**Attribution** (out/run2_attr, rest_gpu.mjs: EXT_disjoint_timer_query GPU ms per program, under the lock,
10:16-10:27 PM; rounds r0 and r1 clean, r2's ae2b/master runs overlapped my own warm Chrome and are dropped):
- link A, interval p50 / composites per 10 s: ae2b4dfb 18.0, 17.9 / 561, 563; dc335eab 24.5, 24.8 / 409, 405.
  The gap is real and large on link A (~35%), and it sits in the readPixels finish (GPU wait), not the CPU
  submit (0.2-0.4 ms everywhere).
- **It is not K1468's packing.** On a master-based probe build (82d7f191) the pre-K1468 RGBA8 targets
  (`#k1468p=nopack`) ran 28.7, 28.7, 27.7 ms (346-360 comp) - as slow as the packed read (24.4, 29.0, 24.2).
- Per program: the pass programs cost the same packed and unpacked (gf:8/6 0.15-0.20 ms; gf:3/2 4.6-5.3 ms,
  with 16-19 ms p50s in every build from the shared GPU). The one packed cost is the look composite:
  comp:look 0.25-0.29 ms packed vs 0.13-0.15 unpacked (ae2b4dfb, nopack) - its 5x5 fringe search ran 25
  four-byte GF_U8 conversions. **Removed** (98af55ce): the packed search tests each
  tap's alpha byte and converts only the chosen texel; `#k1468p=lazy` (same text) measured 0.168, 0.127,
  0.143 ms. Same output by construction (the chosen texel and the fallback are unchanged); gf_packout.test.ts
  pins the text.
- So the link-A frame gap lies in what master added after ae2b4dfb besides the packing: 158f75be (K1468's
  context-loss guard), e820cadd (K1424 route bands by fan membership, gf_look.ts +203) or 01933aa3 (K1472's
  RGBA32F table uploads; ae2b4dfb already uploaded those as RGBA32F, so least likely). It is GPU time outside
  the timed programs or contention-coupled, not inferred further.

**Next**: bisect on link A with rest_gpu.mjs: fc520c2d (K1468 merged, before K1424) against ae2b4dfb and
origin/master (`attr.ps1 -Jobs "bfc52=5660= bae2b=5661= bmaster=5662="`; warm each profile first with
`--disable-gpu-watchdog` and SEC>=40 - fc520c2d's look program had not compiled after 10 min here). Then the
same for e820cadd. Then item 2 (pixel A/B).
Probe tools: `.claude/probes/K1468/s2/` (attr.ps1, rest_gpu.mjs, interleave.ps1, common.ps1, summarize.mjs).
