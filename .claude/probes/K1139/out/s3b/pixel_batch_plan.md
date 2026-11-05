# K1139 S3b Pixel batch — plan (dry run, Run B task 7)

Written 2026-11-04 by Muse batch 16 Run B. NOT run: no phone was
touched. The coordinator runs this later, batched with S4 (plan
section 5: S3b's phone half). Gates, from the plan's S3b entry:

- Frame cost: `scripts/bench_frame.mjs --cdp` at rest with pulses on,
  no more than 0.5 ms a frame over master (median frameMs, ABBA rounds).
- Shader compile: K307's compile probe on a cold load; the
  junction-field program's compile+link time on the build vs master
  is the number that decides whether the longer fan shader costs
  anything on the Pixel 11.

## Builds and servers (ports 5552/5553, Run B's range)

Master is already built: `.claude/probes/K1139/out/s3b/master_dist`
(7474d09b, built in Run B task 1). Build S3b the same way and serve
both:

```powershell
npx vite build --outDir .claude/probes/K1139/out/s3b/build_dist
npx vite preview --outDir .claude/probes/K1139/out/s3b/master_dist --port 5552 --strictPort --host 127.0.0.1
npx vite preview --outDir .claude/probes/K1139/out/s3b/build_dist  --port 5553 --strictPort --host 127.0.0.1
pwsh scripts/phone.ps1 -Ports 5552,5553
```

`phone.ps1` tunnels the phone to both origins and forwards Chrome
DevTools to `http://127.0.0.1:9222` (see CLAUDE.md "Running Locally").

## Frame cost (bench_frame, --cdp, at rest, pulses on)

Stands verbatim from `.claude/probes/K1139/strips.mjs` STANDS (the
query `k111&am=instant&fw=0&snd=none&phw=0`; the moves place the head
so banded fans are lit — bench_frame only loads the link, so the
record below is the at-rest frame with pulses declared from the
start junction; if the coordinator wants a banded fan centred, the
same URLs after the stand's moves via the probe harness are the
follow-up, not this gate). One command per stand, ABBA inside
bench_frame (--rounds, order reversed every other round):

```powershell
node scripts/bench_frame.mjs "http://127.0.0.1:5552/?k111&am=instant&fw=0&snd=none&phw=0" "http://127.0.0.1:5553/?k111&am=instant&fw=0&snd=none&phw=0" --cdp http://127.0.0.1:9222 --ready --rounds 3 --sec 8 --out .claude/probes/K1139/out/s3b/pixel_bench_cross.json
node scripts/bench_frame.mjs "http://127.0.0.1:5552/?k111&am=instant&fw=0&snd=none&phw=0" "http://127.0.0.1:5553/?k111&am=instant&fw=0&snd=none&phw=0" --cdp http://127.0.0.1:9222 --ready --rounds 3 --sec 8 --out .claude/probes/K1139/out/s3b/pixel_bench_src.json
node scripts/bench_frame.mjs "http://127.0.0.1:5552/?k111&am=instant&fw=0&snd=none&phw=0&pr=8" "http://127.0.0.1:5553/?k111&am=instant&fw=0&snd=none&phw=0&pr=8" --cdp http://127.0.0.1:9222 --ready --rounds 3 --sec 8 --out .claude/probes/K1139/out/s3b/pixel_bench_x4.json
```

(5552 = master, 5553 = S3b build in every pair. cross and src share
the link; they differ by the moves the stands play, listed in
strips.mjs — the bench records both origins at rest either way, so
one of the two runs may be dropped if time is short.)

Pass: median frameMs(build) − median frameMs(master) ≤ 0.5 ms on
each stand. Hold `$env:TEMP\claude-perf.lock` while bench_frame runs
(its header says so; `.claude/probes/K1139/run_locked.ps1` is the
desktop wrapper — on the phone the coordinator holds the lock the
same way).

## Shader compile time (K307, cold load)

K307's probe (`.claude/probes/K307/trace_intro.mjs`, run under its
own `run_k307.ps1` perf lock) times every WebGL compile/link on a
cold load with a fresh profile and ties each program to its sources
by FNV hash and Pixi's `#define SHADER_NAME`; `who_compiles.mjs`
attributes the events. The S3b change lengthens only the
junction-field program (JUNCTION_FRAG 30,650 → 37,050 chars; the
k320 ceiling in `test/render/k320_slim.test.ts` carries the dated
measurements). Commands, master then build, the cross link (it
lights banded fans on load):

```powershell
pwsh .claude/probes/K307/run_k307.ps1 -Batch <batch with:>
  node --max-old-space-size=8192 .claude/probes/K307/trace_intro.mjs http://127.0.0.1:5552 s3b-master "?k111&am=instant&fw=0&snd=none&phw=0" --ms 8000 --max 12
  node --max-old-space-size=8192 .claude/probes/K307/trace_intro.mjs http://127.0.0.1:5553 s3b-build  "?k111&am=instant&fw=0&snd=none&phw=0" --ms 8000 --max 12
node --max-old-space-size=8192 .claude/probes/K307/who_compiles.mjs .claude/probes/K307/runs/s3b-master/load1.trace.json
node --max-old-space-size=8192 .claude/probes/K307/who_compiles.mjs .claude/probes/K307/runs/s3b-build/load1.trace.json
```

Compare the `junction-field` program's compile+link ms (and the
explore variant's) between `runs/s3b-master/` and `runs/s3b-build/`.
No fixed budget: the number goes to Claude's S3b look review, with
the frame-cost gate above as the hard pass/fail. If the coordinator
runs the compile probe against the phone's Chrome instead of the
desktop harness, the origins stay 5552/5553 through the phone.ps1
tunnel and the labels above keep the two runs apart.

## What this batch does not do

- No S4 work (loops/cycles); S4's own phone checks ride along when
  the coordinator schedules them, per plan section 5.
- No look judgement: the sheets are Run B's
  `.claude/probes/K1139/out/doc/s3b_*.png`, Claude reviews first.
