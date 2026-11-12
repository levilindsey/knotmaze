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

## Handoff (stage 22, 2026-11-11)

Branch `worktree-agent-a555ed905a6dda790` (commits d7fd1547, e3399fa7, 34d499b4, 2e51f243, then this
handoff). Tools in `.claude/probes/K1247/k1247s22_*`; outputs (untracked) in `.claude/probes/K1247/out/s22/`.

**Why the band restructured.** Today's band (`bandGpu`) is one quad per segment of each piece's `pts`, and
the pieces' point counts change from frame to frame of one structure. `piecesPhaseC` (outline.ts 7272)
rebuilds each piece's points from the ink every frame: run and ghost ends slide past border points, fans
change their step count, arcs are born or go as corners flip, and tails change counts. `runEndFade`
(outline.ts 7246, pushed about 7483) adds faded run ends at failed corners. No ink logic needed changing:
outline.ts got only the `OB_DI` hook (84-88; `di` set at 7308 and 7498, behind `OB_DI.on`).

**The fix (ob=1, `src/render/outline/band_rec.ts`).** A layout per structure, keyed by each piece's index
in `st.piecesD`. Each index owns a fixed quad range. A tied run or ghost is N = cap records placed by
`colRow` at h and h - W, with s spread over the piece's [s0, s1]. Other pieces keep today's points, padded
with zero-area alpha-0 quads, and overflow is decimated by chord distance (`keepIdx`). Arcs have fixed
slots per diagram arc. Runs past an open chain's end keep today's points (`colAt` clamps s). A relayout
happens only on a new structure. `OutlineModel.bandOf` falls back to `bandGpu` on a throw (counted).

**Restructures per frame** (Node replay of the 5 s drags, `k1247s22_rec.ts`): def 27/28 -> 0/28, fat
28/33 -> 0/33, muse_hash 23/23 -> 0/23 (0 relayouts after frame 0). Browser bench (`stats.bandResizes`),
replies whose band count changed during the drag: def off 19/20 and 20/20, on 0/20 and 0/20; fat off
20/21 and 20/21, on 0/20 and 0/20.

**Fidelity** (each piece's max over its vertices, two-way polyline distance outer to outer and inner to
inner, px at 40 px/unit): def p50 0.0011, p99 0.094, max 0.533, 83 of 80063 pieces over 0.25 px; fat p50
0.0027, p99 0.110, max 0.225, 0 of 58208 over; muse_hash p50 0.0015, p99 0.132, max 1.155, 73 of 62294
over. Padded pieces are exact (max 0); decimated max 0.195. Every piece over 0.25 px is a record run, and
the worst sit at a run's end column (muse_hash c71 at (16.75, 33.63), c67 (22.63, 17.64), c66 (33.16,
17.85); def c24 (17.79, 18.63), c73 (6.87, 25.77)), several at alpha 0. Inferred, not checked: today's end
vertex lies on the clipping border while the record's is on the chain normal. Census (form B, ppu 160,
min 40, `k1247s22_census.ts`, OB=G today's bandGpu vs OB=1): CENSUS_PENDING.

**Speed** (ABBA under the perf lock, preview of 34d499b4, p50 per phase, off | on): def band part 62.2/65.2
| 71.7/68.6 ms, worker 174.4/179.2 | 189.7/183.0 ms, reply 22.7 | 28.8 MB, band vertices 457k | 603k,
upload 3.8/4.5 | 5.1/5.5 ms, main frame at rest 5.8/5.9 | 5.9/5.9 ms, mid-drag 8.2/8.7 | 8.7/8.9 ms. fat:
band 54.6/54.3 | 68.9/66.6, worker 179.9/180.7 | 190.2/183.2, reply 23.3 | 28.75 MB, vertices 466k | 596k,
rest 6.0/6.1 both, drag 8.7/8.5 | 8.9/8.8. Main is within the spread at rest; mid-drag is 0.2-0.5 ms worse,
about the spread. The worker pays 4-10 ms for the records and the slack capacity, and the reply grows
about 6 MB (44 B per band vertex).

**Crops** (off | on | |alpha diff|, the five worst distinct places, 200 px/unit):
`.claude/probes/K1247/out/s22/crops_{def,fat,muse_hash}.png`. The differences are sub-pixel edge
slivers: 0-83 of 25600 px per crop.

**Left for shader placement (next stage).** Main places the record columns from `chainTex` (s, side, h,
W per record), so the reply carries the layout and the per-record parameters, not 44 B per vertex: that
undoes the 6 MB and the worker's extra milliseconds. Before that: the run-end column (the inferred clip
mismatch above); trim the slack capacity given to runs that fall back at structure creation (bandV 457k
-> 603k on def); and the padded pieces (tails, fans, faded ends), which still copy today's points each
frame.
