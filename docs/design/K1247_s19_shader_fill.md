# K1247 stage 19: the fill's records placed by the vertex shader

Ledgers: K1247 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree, on
its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md`, the handoff at the end of
`docs/design/K1247_s18_records.md`, and the headers of `src/render/outline/band_gpu.ts` and
`src/render/outline/chain_frame.ts`.

## Why

Stage 18 ported the fill to fixed records behind `oe=1` with CPU placement: the fill's part fell from 43-45
to 27.5 ms and the worker frame on def from 180-185 to 168-172 ms p50, while the reply stayed 32.5 MB. Its
projection: the CPU port of every part tops out near 140 ms, and 3 ms on def is reachable only when the
vertex shader places the records, with the CPU solving only the moving ends (floor about 2.7 ms plus z).
This stage tests that on the fill, the largest part. It moves the gate's first speed line (the desktop
moved frame on def) with `oe=1`.

## Goal

With `oe=1`, the fill's fixed records go to main once per structure. Main's vertex shader places them each
frame from the chain samples (`BandGpu.chainTex`, or a texture beside it, with whatever per-chain tangent or
curvature rows the placement needs). The worker's per-frame fill work and its share of the reply shrink to
the moving ends. The technique is yours. `oe=1` should draw exactly what stage 18's CPU placement draws;
this stage does not fix its cracks (that is stage 20).

## Done

1. **Shader placement** behind `oe=1`. `rp=outline` without it, and today's look, stay untouched.
2. **Fidelity:** shader placement against stage 18's CPU placement, within 0.05 device px at every fill
   vertex over the bench's 5 s drag on def, muse_hash and fat. Check it with transform feedback, or with a
   CPU twin of the shader's math checked against the GPU on a captured frame (as `band_gpu.ts`'s
   `alphaCpu` does). The census against form B (fill / paper px) on def, muse_hash and g41_user_tw64 must
   equal stage 18's `oe=1` numbers within 1%.
3. **Speed:** ABBA under the perf lock, `oe` on against off, on def and fat. Report:
   - the fill's part of the moved frame (target 1 ms or less);
   - the worker frame;
   - the reply's bytes;
   - the main frame at rest and mid-drag. It must not get worse than off by more than the run-to-run spread.
4. **Crops:** off | on | |difference| at the five worst spots per drag, from your final commit, in
   `.claude/probes/K1247/out/s19/crops/`. I view them before merging.
- **Checks:** `npm test` green, the golden snapshots unchanged, and `outline_port.test.ts`'s pins unchanged
  with the switch off.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never
  print a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long
  results to a file and read only the lines you need). The Read tool only right before an Edit, and for
  viewing crops. Junction `node_modules` from the main checkout; never `npm ci`. Read
  `.claude/rules/probes.md` before probing: a bare URL is today's daily. Real-time headed Chrome only;
  never `--virtual-time-budget`.
- **Your files:** the `oe` path in `src/render/outline/`, meaning `chain_frame.ts`, `fill_tri.ts`'s record
  code, `band_gpu.ts`, `outline_app.ts`, `outline_model.ts` and `outline_worker.ts`. In `src/app/`, additions
  only. Keep out of `outline.ts`'s ink code and `draw.ts` beyond a hook: the K1314 fix stages will work
  there next. Your tools go under `.claude/probes/K1247/`, starting from the `k1247s18_*` tools.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did
  not start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time,
  and delete it after. While someone else holds it, wait inside one blocking command; a lock older than
  30 min is stale.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Leave the last 25 minutes for the checks. Then commit WIP, append a handoff to this
  brief and report. Neither a compaction nor context size is a stop; after a compaction, re-read this
  brief and `git log`.

## Report

Under 40 lines:
- the speed numbers on and off;
- the fidelity numbers;
- the crop paths;
- what is left for stages 20 and later;
- your last SHA.

End with `Ledger items` and K1247's handle fields.

## Handoff (stage 19 agent, 2026-11-11)

Status: the shader placement is in, behind `oe=1` (fillRec 2), and draws what
s18's CPU placement draws. The fill target (1 ms or less) is NOT met: the
worker's fill is about half of off's. Commits on `worktree-agent-ad99eae806bca8e74`:
4bca8c22 (records placed in the vertex shader), 8279232e (GLSL in
`rec_glsl.ts`, the twin), 58138b0e (checks, tools, the reviewed `mod(u, L)`),
4ab1cbab (transform feedback), d968fd2c (the twin checks the app's program).

Design.
- The worker places columns 0, 1, N-1 and N of each record strip and every
  vertex that is not a record. Columns 2..N-2 come from a strip table
  (REC_TEXELS 3 texels a strip) or, for a fallback strip, rows of `uRecFb`.
  Paint vertices are reordered dynamic-first (nDyn), so a reply that is not a
  restructure sends prefix slices, uploaded with bufferSubData.
- Main places once per reply, not per frame: `REC_PLACE_VS` (rec_glsl.ts,
  `recVs` over a pass-through) runs under transform feedback, with
  RASTERIZER_DISCARD, into `placedBuf` (8 floats a vertex: x, y, key, 0, then
  aS). The fill and app programs are the plain PAINT_VS and APP_VS reading
  locations 0, 2 and 5 from that buffer. Before the tables arrive, attribute 6
  is the constant -1 (every vertex passes through). A frame at rest pays
  nothing. The first try placed in the fill's own vertex shader every frame;
  it cost main 0.2-0.3 ms at rest (def off 5.9/5.9, on 6.1/6.1; fat off
  6.1/6.2, on 6.4/6.4), so it was replaced.
- With the switch off nothing changes: no placement program, no tables.

Fidelity (`k1247s19_twin.ts`, GPU frame 14, the app's REC_PLACE_VS in headed
Chrome, ANGLE D3D11, RX 6800 XT). GPU vs CPU max 0.0011 / 0.0020 / 0.0057
device px (def / muse_hash / fat). |key| and |s| are within 0.0001;
glError 0. The float32 twin vs CPU over the whole 5 s drags: max 0.0017 /
0.0014 / 0.0065 px. The only rounded quotient, rec_glsl's `mod(u, L)`, is
listed in paint_ring_lap.test.ts.

Census against form B (`k1247s19_fillcensus.ts`; s19 / s18): def 52/177 vs
52/178, muse_hash 253/471 vs 253/472, g41_user_tw64 15/131 vs 15/131.

Speed (`k1247s19_bench.ps1`, ABBA off / on / on / off, under the perf lock,
p50 ms; reply MB is the drag's total, about 19-22 replies).

| def | off | on | on | off |
|---|---|---|---|---|
| main at rest | 5.9 | 6.0 | 6.0 | 6.0 |
| main mid-drag | 8.6 | 8.5 | 8.5 | 9.1 |
| worker fill | 47.6 | 22.5 | 23.0 | 46.6 |
| worker frame | 190 | 155.8 | 163.6 | 193.1 |
| reply MB | 32.06 | 22.61 | 22.61 | 32.49 |
| upload | 4.1 | 3.8 | 3.7 | 4.4 |

| fat | off | on | on | off |
|---|---|---|---|---|
| main at rest | 6.3 | 6.2 | 6.3 | 6.2 |
| main mid-drag | 9.6 | 8.8 | 8.7 | 9.0 |
| worker fill | 45.3 | 28.1 | 24.1 | 47.1 |
| worker frame | 205.9 | 174.2 | 165.9 | 188.6 |
| reply MB | 32.55 | 23.07 | 23.07 | 32.78 |

Main stays within the run-to-run spread at rest and mid-drag.

Where the fill still goes (Node, `k1247s19_fillprof.ts`, fillRec 2, def,
about 17 ms total): fans 6.4, strip:rec 4.24 (990 strips, about 4.3 us
each: pointAt, 4 to 8 offsetAt, zAt1 for 4 columns, footS), pre 1.9,
junctions 1.6, disks 1.2, tail 0.85.

Crops (from d968fd2c): `.claude/probes/K1247/out/s19/crops/{def,muse_hash,fat}.png`,
each row off | on | |diff|. On vs s18's CPU placement differs by 0 px in 14
rows and 1 px in one (def row 3). The off-vs-on differences are s18's record
differences (owner swaps where strips meet), including muse_hash row 2 (f18,
1308 px).

Checks (from d968fd2c): `npm test` green (tsc, then 225 files / 2927 tests
passed, 2 files / 10 tests skipped); byte_identity and outline_port.test.ts
pass with their files unchanged from master (the only test edit is
paint_ring_lap's new entry).

Left for stage 20 and later.
- Stage 20: the cracks.
- The 1 ms fill target: make fans, junctions and disks GPU records (fans
  alone are 6.4 ms); reuse buffers in `pre`; make strip:rec cheaper (fewer
  offsetAt calls, or place columns 0, 1, N-1 and N on the GPU too, with the
  worker sending only the strip table).
- The worker frame is still dominated by the band (58-63 ms) and zC (16 ms),
  which this stage did not touch.

Tools (tracked): `.claude/probes/K1247/k1247s19_{lib,twin,fillcensus,fillprof,crops}.ts`,
`k1247s19_smoke.mjs`, `k1247s19_bench.ps1`. Outputs (untracked):
`.claude/probes/K1247/out/s19/`.
