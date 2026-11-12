# K1247 stage 22: the band as fixed records

Ledgers: K1247 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree, on
its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md`, and the handoffs at the end of
`docs/design/K1247_s18_records.md`, `K1247_s19_shader_fill.md` and `K1247_s21_structure_cost.md`.

## Why

The gate's first speed line is the outline's work per moved frame on def: 160-185 ms p50 on the desktop
since stage 21, against a bar of 3 ms. The fill is now fixed records placed by main's vertex shader. The
band is the largest part left, at 45-63 ms. Stage 18 found that every band vertex has a chain and could be
a record (V2 holds on def), but the band **restructures on 28 of 29 frames** of the bench's drag (fat 32 of
34). A record needs a vertex that keeps its (chain, s, offset) from one frame to the next, so the band
needs a fixed topology first. This stage moves the gate's first speed line.

## Goal

With `ob=1`, the band keeps one topology from one structure to the next while the threads move, and its
vertices become records placed by the CPU, as stage 18 did for the fill. Main's shader placement is a
later stage. Find out why the band restructures: piece counts, cut positions, vertices per piece, tails
that grow or shrink. Then make what moves a parameter of a fixed layout instead of a change of layout. The
technique is yours. Today's band, `ob=0` (the default) and the look stay untouched.

## Done

1. **Fixed topology:** over the bench's 5 s drag on def, muse_hash and fat, with `ob=1`, the band
   restructures only when the diagram does. Report restructures per frame, before and after.
2. **Fidelity:** each record-placed band vertex against today's band, within 1/4 device px over the same
   drags. If a part can't meet it, give its error (p50, p99, max) and its spots. The census against form B
   with `ob=1` (`k1247s19_fillcensus.ts`, or the K1314 census's band kinds) equals `ob=0` within 1%.
3. **Speed:** ABBA under the perf lock, `ob` on against off, on def and fat. Report the band's part of the
   moved frame, the worker frame, the reply's bytes, and the main frame at rest and mid-drag (no worse than
   off beyond the run-to-run spread).
4. **Crops:** off | on | |difference| at the five worst spots per drag, in `.claude/probes/K1247/out/s22/`.
   I view them before merging.
- **Checks:** `npm test` green, the golden snapshots unchanged, and `outline_port.test.ts`'s pins unchanged
  with `ob=0`.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never
  print a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long
  results to a file and read only the lines you need). The Read tool only right before an Edit, and for
  viewing crops. Junction `node_modules` from the main checkout; never `npm ci`. Read
  `.claude/rules/probes.md` before probing: a bare URL is today's daily. Real-time headed Chrome only;
  never `--virtual-time-budget`.
- **Your files:** `draw.ts` (`bandData`, `zChains`), `band_gpu.ts`, the record code (`chain_frame.ts`,
  `rec_glsl.ts`, `fill_tri.ts`'s record code, `outline_app.ts`, `outline_model.ts`, `outline_worker.ts`),
  new files of your own, `src/app/frame_loop.ts`, tests, and your tools under `.claude/probes/K1247/`.
- **`outline.ts` is shared.** A K1314 look agent works in its corners and pieces (`cornersPhaseC`,
  `thruRoomC`, `piecesPhaseC`) at the same time. In `outline.ts`, add hooks and fields only, behind `ob`.
  Don't change what it draws. If the band's restructure comes from ink logic there, say so in the report
  with the function and line, and keep the fix behind `ob=1`.
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
- why the band restructured, and what fixed it;
- restructures per frame, before and after;
- the fidelity numbers;
- the speed numbers on and off;
- the crop paths;
- what is left for shader placement;
- your last SHA.

End with `Ledger items` and K1247's handle fields.
