# K1468: rp=gf's cold load hangs the GPU process until Chrome kills it (Claude agent stage)

Levi, 2026-11-17, on the live gf link: "the entire maze blinks in and out constantly". On a Chrome profile
that has not cached the current build's gf shaders, the page loses its WebGL context again and again. This is
the first thing to fix in the gf lane: nothing else can be judged on a page that does not stay up.

## Observed (2026-11-17, 16:10-17:00, desktop, Chrome 158, `--use-angle=d3d11`, 1600x900 DSF 1)

Link: `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`. Probes: `.claude/probes/K1468/gfts.mjs` (a row
per second: gf's stats, console errors, context lost / restored; `EXTRA="--disable-gpu-watchdog"` adds Chrome
flags) and `gputhreads.ps1 -Match <profile dir name>` (every 10 s: the GPU process's main thread's CPU, its
busiest threads, GPU load by process).

- Fresh profile, watchdog ON, every load, on three builds: live b4e0a08e (first program ready at 31 s,
  composites stuck at 3, context lost at 80 s, twice), a3a9a6b4 (before the K1451 merge: ready 93 s, lost
  160 s) and b423013a (before 26A's async compile, K1456: the GPU process killed every 200 s). After the
  restore a new gf app compiles everything again and the loop repeats. Each kill leaves a GPU-process dump
  under `<profile>/Crashpad/reports` naming `GpuWatchdog` and `D3DCompiler_47.dll`.
- Fresh profile, watchdog OFF: worker threads compile for 41 s (`compileFirstMs` 41244), then **the GPU
  process's main thread burns 10 s of CPU per 10 s from 53 s to 124 s** while composites sit at 3, then 5;
  from 124 s frames flow (3573 composites by 209 s) while a worker compiles the other programs, the main
  thread at 0.5 s per 10 s.
- A warm profile on the same build: first program ready in 0.13 s, no stall, no loss.
- CPU was at 27% of 24 threads and no lock, sleep or Chrome update happened: this is not machine load.

## Inferred, to prove first

The field pass writes two or three targets (`gf_glsl.ts`'s `o0`/`o1`/`o2`/`o3`, the look form's second
attachment in `gf_pass.ts`'s `draw`, `gf_split.ts`'s pieces). ANGLE's D3D11 backend compiles at link only the
pixel shader for the default output layout (the first output alone); the one for the real draw-buffer layout
is compiled at the first draw, synchronously, on the GPU main thread. `KHR_parallel_shader_compile` (26A)
cannot reach that compile, and at 50-70 s it outlasts the watchdog. Each program's first draw pays it (3
composites, then 5). Prove or refute it before building on it: for example a probe build whose look form
writes one target, or whose first draw is skipped, and `gputhreads.ps1` beside it.

## Do

1. Prove the cause.
2. Remove the draw-time compile from the screen path, so that what the background compile builds is what the
   first draw uses. The obvious route: one target per program (pack what the targets hold into one integer or
   float texture; every reader already uses `texelFetch` on NEAREST textures), for the look form, the plain
   form and the split passes. You own the technique.
3. A guard for whatever is left: a context lost while gf compiles, or within its first seconds of drawing,
   must not loop. After the second loss in a session gf stays off (today's renderer draws) with one console
   warning.

## Done

1. On a FRESH profile with the watchdog ON, five loads each of the link above and of
   `?3&xp=off&am=instant&rp=gf` on your build: no context loss after the first second, no new dump under
   `Crashpad/reports`, gf's first composite arrives, and the GPU main thread never reads over 5 s per 10 s in
   `gputhreads.ps1`. The same check fails on master (show it once).
2. While gf compiles, today's renderer keeps drawing: no gap over 1 s between frames from load to gf's first
   composite (measure it in the page).
3. Pixels: at a frozen state, your gf against master's gf on both links, fade 0.14 and 1.2, `tlk=border` and
   `tlk=fill`: 0 px differ (or name every pixel that does and why).
4. `hold.mjs` (`.claude/probes/K1450/`) 60/60 on both links, warm. `npm test` green.
5. The cold load's time to gf's first composite and the frame time at rest (10 s median, warm), master
   beside yours: the frame time within 5%. Take `$env:TEMP\claude-perf.lock` for the frame time only; wait
   for it inside one blocking command.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: the output declarations and writes in `gf_glsl.ts`, `gf_pass.ts`, `gf_split.ts`, `gf_app.ts`, the
  look form's inputs and outputs in `gf_look.ts`, `src/app/context_loss.ts`, their tests. Keep out of the
  field evaluation (`tables.ts`, `eval.ts`, `gf_keys.ts`, `gf_pack.ts`: the K1451 agent) and the fade's code
  in `gf_look.ts` (the K1460 agent, merging about 17:30). Muse batch 26 edits `gf_look.ts`, `gf_pass.ts` and
  `gf_reveal.ts` in the main checkout: commit small, rebase on origin/master before the handoff.
- gf's border look (`tlk=border`) stays as it is (Levi, 2026-11-17).
- A cold test needs only a fresh profile directory: Chrome's shader cache is per profile.
- **Disk and memory.** One Chrome at a time, at most two preview builds, profiles under
  `$env:TEMP\k1468-*`, deleted when you stop. Stop to report if `(Get-PSDrive C).Free` is under 5 GB.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5660-5679. Headed, real-time Chrome, never `--virtual-time-budget`.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files). Never push. Never edit
  LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried and
  why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1468` here, commit, and report: what holds, the numbers, a `Ledger items` list and
K1468's handle fields.

### Handoff K1468

Stopped 2026-11-17 18:50 (2 h cap 19:05). Branch `worktree-agent-afd07fccfe473c7f9`, rebased on origin/master
aad94eb7; `npm test` green after the rebase (253 files, 3160 tests). Evidence: `.claude/probes/K1468/`
(`runs/`, `ab/*.txt`, `rest.mjs`, `ab.mjs`, `diff.py`, `cold.ps1`; pngs untracked, about 50 MB).

- Cause, proved: ANGLE D3D11 links a pixel shader for the first output alone; gf's three-output programs compile
  their real variant at the first draw on the GPU main thread. Master pins it at 9.7 s / 10 s (`runs/master1`);
  a one-attachment probe build (ef7b9283, reverted) read 0.5-1.1 s / 10 s and drew 2100 composites.
- Fix (9ef3c076): every app program writes one `uvec4 oP` into one RGBA32UI target (o0/o1/o2 as RGBA8 words;
  write = fp16 truncation then round, 0 bad of 696613 values against AMD's RGBA8 export, `exact.mjs`; read =
  a const k/255 table, exact). Guard (faff6d70): a second context loss while gf compiles, or in its first 10 s of
  drawing, turns gf off for the tab's session (sessionStorage `knotmaze.gfLosses`) with one console warning.
- Done 1 HOLDS: fresh profile, watchdog on, 5 loads per link (`runs/fixA1b`, `fixA2-5`, `fixB1-5`): 0 dumps,
  0 losses after 1 s, GPU main max 1.2-1.4 s / 10 s, first composite A 83.6 / 95.7 / 100.4 / 97.7 / 116.7 s,
  B 178.1 / 127.3 / 131.9 / 144.3 / 136.4 s. fixA1 (120 s window) ended before its first composite (slow
  compile, GPU main 1.4) and was rerun as fixA1b with 200 s. Master fails: `masterB1` 5.8 s / 10 s, stuck at 2
  composites; `master1` 9.7 s / 10 s, stuck at 3.
- Done 2 HOLDS: largest frame gap from load to the first composite 534-750 ms on every fix run.
- Done 3 NOT SHOWN: `ab.mjs` (K1460's freeze, `--disable-gpu-watchdog`) is not repeatable on one build. Master
  against master at the same physics hash differs 0 px (B 0.14 fill, B 1.2 border) up to 14693 / 24420 /
  67669 px (A 0.14 border, B 0.14 border, B 1.2 fill), on thread edges; the hash itself flips between two
  values per link from load to load (A fff8c9e5 / 10104c64, B f9d72040 / 49c20566) whatever fl and tlk are.
  Fix against master at a matching hash: A 0.14 border and B 0.14 border 751 px each, all in the panel
  header's build SHA (x 3052-3139, y 221-234), 0 px in the maze; the other matched pairs (B 1.2 fill: 65266 px
  vs master, 7882 vs master2) sit inside the probe's own master-vs-master spread. Next: find what the freeze
  leaves unpinned (two physics hashes per link; thread-edge drift at one hash), then rerun the 8 pairs until
  each has a 0 px control.
- Done 4 HOLDS: `hold.mjs` 60/60 on both links on the fix build (A edges 7987-9238, B 103024-104376), `npm
  test` green. Its first composites were still 85.8 s (A) and 61.6 s (B) on a profile warmed only by ab.mjs's
  links (other params): not a warm start.
- Done 5 PARTLY: cold first composite, fix A 84-117 s and B 127-178 s against master's 51-66 s (a first
  composite that then hangs). Master's link compiles with o1/o2 dead; the fix's packed program is one
  D3DCompile of 70-90 s on one pool thread while today's renderer keeps drawing. Rest frame time (perf lock;
  the 26C Muse lock was 35 min old and taken as stale; REDRAW=1, SEC=10, 2 rounds, warm per-build profiles,
  links with `&prp=off&phw=0&fw=0&bg=none&snd=none&fl=0.14&tlk=fill`; `runs/rest_*.json`): B fix 16.7 / 17.4
  ms vs master 16.7 / 17.3 (within 1%); A (gfh=1) fix 17.3 / 19.0 vs master 9.6 / 15.8, intervals 24-28 vs
  17.5-18 ms, composites 359-410 vs 562-567: NOT within 5%, cause not isolated (the packed write, the U8
  table read in the composite, or master's A drawing a lighter program set; the noisy master pair needs more
  rounds first).

Next: Done 3's repeatable freeze and Done 5's A frame-time gap (more ABBA rounds, then a program-by-program
attribution); the cold compile length (FXC flags or a smaller packed program).