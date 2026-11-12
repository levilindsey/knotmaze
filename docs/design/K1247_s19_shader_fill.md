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
