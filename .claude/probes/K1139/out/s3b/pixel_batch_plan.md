# K1139 S3b Pixel batch — plan (dry run, Run B task 7)

> **Before running this (Claude, 2026-11-04).** Build what merges from
> the fix branch (`worktree-agent-a8280f4d14ebd8ad1`), not S3b, and
> master at its merge base. Don't start `scripts/phone.ps1` by hand:
> the phone runs under the K1040 wrappers
> (`.claude/probes/K1040/s3/run_phone.ps1` holds the phone and perf
> locks and waits for the ready check), so the commands below need
> adapting to them. The fix's Stage 3 report asked for two changes here
> (the twin's cover strips; P8 against the max over bands). Both are
> desktop comparisons, not phone ones, so they became tasks 1 and 2 of
> that brief's Stage 4.

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

## Result (coordinator, 2026-11-05 00:15-01:07; S5 again, cool, 01:20-01:41)

Run as round phone passes instead of the steps above:
`../../pixel_passes.ps1 -Flip fbc1b212 -AllowChrome` runs
`scripts/phone_pass.ps1 -Reps 3` (K156) for each step under one phone
lock, out in `.claude/probes/rounds/2026-11-05-k1139s3b/`, `-k1139fix/`
and `-k1139s5/` (untracked: `summary.md`, `logs/run.log`). S5 ran again
on a cool phone with 4 reps (`-Only s5 -Reps 4 -Suffix b`, out in
`-k1139s5b/`) through `../../s5_cool_rerun.ps1`, which waits for
thermal status 0 and a skin of at most 31 C. Viewport 411x753 at 2.625,
canvas 822x1506. Verdicts against `scripts/phone_pass/noise.json`;
render ms is the median of 60 synchronous renders with a 1-px readback
(about 40 ms in fabric).

| step | base -> head | better / worse / within | fabric p50, 0 / 7 moves | render ms, fabric 0 / 7 / 13 moves | knot render ms | thermal start -> end |
|---|---|---|---|---|---|---|
| S3b, the fan shader | 7474d09b -> df30a7f3 | 4 / 0 / 36 | 16.7 = 16.7 / 16.7 = 16.7 | -1.20 (better) / +0.10 / +0.50 | +0.10 | status 0, skin 27.2 -> status 0, 38.5 |
| S3b's fix | 1fe793f5 -> 71eedb94 | 1 / 2 / 37 | 16.7 = 16.7 / 16.7 = 16.7 | +0.50 / +0.50 / +0.40 | -0.40 | status 0, 38.0 -> status 1, 39.5 |
| S5's default flip | 36aed2d5 -> fbc1b212 | 1 / 2 / 37 | 33.1 -> 33.2 / 16.7 = 16.7 | +1.00 (worse, floor 0.70) / -0.30 / +1.10 | -0.50 | status 1, 39.0 -> 39.8 |
| S5 again, cool (s5b, 4 reps) | 36aed2d5 -> fbc1b212 | 1 / 2 / 37 | 16.7 = 16.7 / 16.7 = 16.7 | +0.30 / -0.45 / -0.75 | -0.45 | status 0, 32.9 -> status 1, 39.4 |

- S3b: better on render ms at 0 moves, the longest frame at 0 moves
  (33.4 -> 17.1) and the slow load gs=18's fps and frames (38.3 ->
  44.3, as in S4's pass: not K1139's doing).
- The fix: worse on fabric 7 moves' fps (59.0 -> 55.3, floor 3.5) and
  frames over 25 ms (6 -> 20, floor 13), with p50 16.7 on both; better
  on the default link's load frames over 50 ms (96 -> 51).
- S5, warm: both builds drew fabric at 0 moves at 30 fps (p50 33.1 and
  33.2, asleep) and at 7 moves at 60; worse on render ms at 0 moves
  (+1.00) and the slow load's p95 (50.3 -> 66.7, one vsync); better on
  knot's longest frame (18.0 -> 17.2). 36aed2d5 drew 0 moves at 16.7 in
  S4's pass (`../s4cyc/pixel_batch_plan.md`), so the rerun on a cool
  phone separates the build from the heat.
- S5, cool (s5b): both builds drew 0 moves at 60 again (p50 16.7) and
  render ms is within noise (+0.30 at 0 moves, -0.45 at 7), so the warm
  pass's 30 fps and +1.00 came from the heat (K1205). Worse on fabric 7
  moves' frames over 25 ms (14 -> 28, floor 13; the fix's pass read +14
  at the same scene) and the slow load's first sleep (11.3 -> 12.3 s,
  floor 0.8; the default link's went 10.5 -> 9.9, better). 13 moves
  (the finish) read p50 25.0 -> 33.2 as the phone reached status 1 again.
- Gate (frameMs(head) - frameMs(base) at most 0.5): S3b and its fix
  pass (frames unchanged), and S5 passes on the cool rerun (frames
  unchanged, render within noise). Watch: fabric 7 moves' frames over
  25 ms grew in both the fix's and S5's passes, just past the floor;
  the next pulse step's pass checks it.
- 13 moves is the finish (stars and confetti in the timing; no noise
  floor). Cold compile: not measured on the Pixel (K307's trace_intro
  is desktop only).
