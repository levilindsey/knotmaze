# K1139 S4 (pulses on loops and cycles): Pixel batch plan

Written 2026-11-04 by the S4 agent (worktree-agent-a023a39925efe4816).
NOT run: no phone was touched. The coordinator runs it, batched with
S3b's fix (`.claude/probes/K1139/out/s3b/pixel_batch_plan.md`, which
has the same shape). Run it under the K1040 wrappers
(`.claude/probes/K1040/s3/run_phone.ps1` holds the phone and perf locks
and waits for the ready check), not with a hand-started
`scripts/phone.ps1`.

## Desktop results first (RX 6800 XT, D3D11, perf lock)

- Frame cost at rest, pulses on (`bench_rest.json`, ABBA x4, 5 s):
  frameP50 base 7.15 ms, S4 (3dbd0be0) 7.10; PASS (gate +0.5 ms).
- Cold compile of section-rgb (K307 trace_intro, link to
  COMPLETION_STATUS, fresh profile per load): base 6.55 / 6.75 / 6.71 /
  6.52 s; 3dbd0be0's kPulseV2 (two inlined kPulseCrestK calls) 7.06 /
  7.52 s, about +0.66 s, and first visible +0.63 s. The single-call
  form (one kPulseCrestK, arguments selected first; the S4 head) 6.84 /
  6.54 s, inside base's spread, and 0 px against 3dbd0be0 on the cyc,
  loop, preloop and x4 stands. BUILD THE PIXEL PAIR FROM THE S4 HEAD,
  not 3dbd0be0. Text: +555 characters per program (+561 at 3dbd0be0).
- Open defect (S4b): a fan band into a two-ended arm draws the
  one-ended crest, with no ridge fade, so a step shows at the fan's edge
  when the ridge is within about 1.2 world of that junction (cyc e210 at
  node_218; brief's Handoff). The Pixel batch can run before the fix
  (cost only) or wait to cover it too.

## What S4 changes on the GPU

Only the paint core's text: `kPulseV2` and the TWO dispatch in
`kPaintAt` (+561 characters in each program that includes
`PAINT_PAINT_GLSL`):

| program | base 25ce2321 | S4 |
|---|---|---|
| section (ribbons) | 58,440 | 59,001 |
| section, explore | 74,855 | 75,416 |
| arm strip | 33,695 | 34,256 |
| arm strip, explore | (+561) | 40,257 |
| junction field | 40,097 | 40,097 (unchanged) |
| still pluck | 20,507 | 20,507 (unchanged) |

The ribbon-sdf programs (opt-in, `PAINT_PAINT_RIBBON_GLSL`) grow by the
same 561. No new program, no new uniform, no new texture. Per pixel, a
one-ended item runs today's `kPulseV` (one extra flag test); a
two-ended item runs one `kPulseCrest` on the nearer end plus the ridge
fade, the cost of a one-ended item.

## Builds and servers

Build the merge base and what merges from the S4 branch with
`scripts/preview.ps1 -Ref <sha> -Root <short dir> -BuildOnly`. The root
must be SHORT: under the session scratchpad, `git worktree add` failed
("Could not reset index file to revision 'HEAD'") and the build died
for want of index.html. `$env:TEMP\knotmaze-previews\<tag>` worked.

```powershell
$root = "$env:TEMP\knotmaze-previews\k1139s4-pixel"
pwsh scripts/preview.ps1 -Ref 25ce2321 -Root $root -BuildOnly
pwsh scripts/preview.ps1 -Ref <S4 merge sha> -Root $root -BuildOnly
npx vite preview --outDir "$root\25ce2321" --host 127.0.0.1 --port 5634 --strictPort
npx vite preview --outDir "$root\<S4 sha>" --host 127.0.0.1 --port 5635 --strictPort
```

(5634 = base, 5635 = S4 in every pair below; any free pair works.)

## Frame cost (bench_frame, --cdp, at rest, pulses on)

`bench_frame.mjs` only loads a link, so the head sits at the start and
its pulses are one-ended: this measures the longer paint core on every
pulse pixel, which is S4's whole cost on screen states without a
cycle. A two-ended arm costs what a one-ended one does (one crest per
pixel). Gate (the plan's, as for S3b): median frameMs(S4) minus median
frameMs(base) no more than 0.5 ms.

```powershell
node scripts/bench_frame.mjs "http://127.0.0.1:5634/?k111&am=instant&fw=0&snd=none&phw=0" "http://127.0.0.1:5635/?k111&am=instant&fw=0&snd=none&phw=0" --cdp http://127.0.0.1:9222 --ready --rounds 3 --sec 8 --out .claude/probes/K1139/out/s4cyc/pixel_bench_rest.json
node scripts/bench_frame.mjs "http://127.0.0.1:5634/?1&am=instant&fw=0&snd=none&phw=0&pr=8" "http://127.0.0.1:5635/?1&am=instant&fw=0&snd=none&phw=0&pr=8" --cdp http://127.0.0.1:9222 --ready --rounds 3 --sec 8 --out .claude/probes/K1139/out/s4cyc/pixel_bench_seed1_pr8.json
```

The second pair is the `loop` stand's design at its reach (8) with the
head at the start (long trains; no two-ended arm on screen).

If the coordinator wants the two-ended states themselves on the phone,
the stands are in `.claude/probes/K1139/stands_cyc.mjs` (`cyc`:
`k111&am=instant&fw=0&snd=none&phw=0`, moves 0, 246, 82, 83, 199, 150,
151, 38, 155, 211, the arm e210; `loop`: `1&am=instant&fw=0&snd=none
&phw=0&pr=8`, moves 185, 186, 187, 122, 50, 118, 117, 165, 60, 9, 178,
57, 101, the self-loop e102), played with `__knotTurnMove` after the
page sleeps; bench_frame cannot play moves, so that needs a harness
(follow-up, not this gate).

## Shader compile time (K307, cold load)

K307's probe lives in the main checkout's `.claude/probes/K307/`
(`trace_intro.mjs`, `run_k307.ps1`, `who_compiles.mjs`). S4 lengthens
the section program (both variants) and the arm strip; compare their
compile+link ms, base against S4, on a cold profile:

```powershell
pwsh .claude/probes/K307/run_k307.ps1 -Batch <batch with:>
  node --max-old-space-size=8192 .claude/probes/K307/trace_intro.mjs http://127.0.0.1:5634 s4-base "?k111&am=instant&fw=0&snd=none&phw=0" --ms 8000 --max 12
  node --max-old-space-size=8192 .claude/probes/K307/trace_intro.mjs http://127.0.0.1:5635 s4-build "?k111&am=instant&fw=0&snd=none&phw=0" --ms 8000 --max 12
node --max-old-space-size=8192 .claude/probes/K307/who_compiles.mjs .claude/probes/K307/runs/s4-base/load1.trace.json
node --max-old-space-size=8192 .claude/probes/K307/who_compiles.mjs .claude/probes/K307/runs/s4-build/load1.trace.json
```

No fixed budget: +561 characters on a 59k program is about 1% of its
text, and K307's lore ties compile time to inlined calls (FXC inlines
every call), so the number to read is the section program's
compile+link on the Pixel against base.

## What this batch does not do

- No look judgement: the sheets are
  `.claude/probes/K1139/out/s4cyc/sheets/` (desktop, base and S4 rows),
  for Claude's review.
- No S5 work (`PULSE_OUT_LEAD`, `CREST_RAMP`).


## Result (coordinator, 2026-11-04 23:11-23:27)

Run as one round phone pass instead of the steps above:
`scripts/phone_pass.ps1 -Base 25ce2321 -Head 36aed2d5 -Reps 3` (K156),
under the phone lock, out in `.claude/probes/rounds/2026-11-04-k1139s4/`
(untracked: `summary.md`, `logs/run.log`). Viewport 411x753 at 2.625,
canvas 822x1506. Between the two builds: K1139 S4 and S4b, plus K782
b806f9fb (game logic), K1187 222452e3 and 0a776aa0 (fire mode only) and
K1182 ed14f2c9 (behind a flag, off); at rest only K1139's paint differs.

Verdicts against `scripts/phone_pass/noise.json` (4 better, 2 worse, 34
within noise):

- Frames: fabric at rest (0 and 7 moves) p50 16.7 = 16.7, knot 16.7 =
  16.7; no frame lost at 60 Hz. One 33.6 ms frame in the head's 0-move
  samples.
- Render ms (the median of 60 synchronous renders with a 1-px readback,
  about 40 ms on the Pixel): fabric 0 moves 39.6 -> 40.5 (+0.9 against a
  0.7 floor: worse), 7 moves 41.0 -> 41.6 (+0.6), 13 moves (the finish)
  41.1 -> 42.1 (+1.0); knot 21.9 -> 21.6. The pulse paint costs about 2%
  of a synchronous render, in fabric only.
- Load: gs=18's fps 32.8 -> 40.7 (better; not K1139's doing, unexplained;
  the phone warmed from 27 to 38 C over the pass).
- Gate (frameMs(head) - frameMs(base) at most 0.5): frames unchanged, so
  it passes; accepted. S5's default flip gets the same pass with 36aed2d5
  as base (`../../pixel_passes.ps1`), so the pulse paint does not grow
  unseen.
- Cold compile: not measurable on the Pixel with this kit (K307's
  trace_intro is desktop only).