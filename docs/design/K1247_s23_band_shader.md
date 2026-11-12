# K1247 stage 23: main places the band records, then the band records become the default

Ledgers: K1247 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree, on
its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md`, and the handoffs at the end of
`docs/design/K1247_s22_band_records.md`, `K1247_s19_shader_fill.md` and `K1247_s20_records_look.md`.

## Why

Stage 22 gave the band one fixed layout per structure behind `ob=1` (`src/render/outline/band_rec.ts`). It
restructures on 0 frames of the bench's drags, down from 27 of 28 on def. The worker still places every
record on the CPU and ships 44 B per vertex. So `ob=1` costs more than today: def band part 62-65 → 69-72 ms,
worker frame 174-179 → 183-190 ms, reply 22.7 → 28.8 MB, band vertices 457k → 603k. The fill solved the same
problem in stages 19-20: main places the record columns by transform feedback (`REC_PLACE_VS`), from
`chainTex`. This stage does the same for the band, and moves the gate's first speed line.

## Goal

With `ob=1`, the worker sends the band's layout and per-record parameters, not placed vertices. Main places
the tied runs and ghosts on the GPU, as it places the fill's records. Make `ob=1` cheaper than `ob=0` on the
worker frame and the reply, then make it the default. The technique is yours. Today's look (no `rp=outline`)
stays byte-identical.

## Done

1. **Speed:** ABBA under the perf lock, `ob` on against off, on def and fat. Report the band part, the worker
   frame, the reply MB, the band vertices, the placement pass's GPU cost, and the main frame at rest and
   mid-drag. The bar: worker frame and reply below off by more than the run-to-run spread; main frame no
   worse than off beyond the spread.
2. **Fidelity:** every band vertex within 1/4 device px of today's band over the drags, run ends included.
   Stage 22's worst were run-end columns: muse_hash c71 at 1.155 px, def c24 at 0.533. Its inferred cause,
   not checked: today's end vertex sits on the clipping border, the record's on the chain normal. The 5
   through bends that K1314 stage 4 joined are included too: muse_hash j78, j98, j135 and g41_user_tw64 j48,
   j49. That join rewrites a finished neighbour corner's arc end to the meet point X, and adds X to two
   junction polygons. The census against form B with `ob=1` equals `ob=0` within 1%.
3. **Slack:** trim the spare capacity for runs that fall back when a structure is built, so the band
   vertices with `ob=1` are no more than `ob=0`'s plus what the fixed layout needs. Report both.
4. **The flip:** if 1 and 2 hold, `rp=outline` uses the band records unless `ob=0`. Re-freeze
   `outline_port.test.ts`'s pins only where the flip moves them, and name them in the commit. If 1 or 2
   doesn't hold, leave the default and report what blocks it.
5. **Crops:** off | on | |difference| at the five worst spots per drag, from your final commit, in
   `.claude/probes/K1247/out/s23/`. Do the same in the app's paint at rest (`k1247s20_appdiff.mjs`). I view
   them before merging.
- **Checks:** `npm test` green and the golden snapshots unchanged. Delete any copied form B cache before
  you stop (stage 22's was 3.5 GB).

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never
  print a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long
  results to a file and read only the lines you need). The Read tool only right before an Edit, and for
  viewing crops. Junction `node_modules` from the main checkout; never `npm ci`. Read
  `.claude/rules/probes.md` before probing: a bare URL is today's daily. Real-time headed Chrome only;
  never `--virtual-time-budget`.
- **Your files:** `band_rec.ts`, `draw.ts` (`bandData`, `zChains`), `band_gpu.ts`, the record code
  (`chain_frame.ts`, `rec_glsl.ts`, `fill_tri.ts`'s `fillStructure`/`recStrip`/`stripNb`, `outline_app.ts`,
  `outline_model.ts`, `outline_worker.ts`), `src/app/frame_loop.ts`, new files of your own, tests, and your
  tools under `.claude/probes/K1247/`.
- **`outline.ts` is shared.** The K1314 stage 5 agent works in its corners and pieces at the same time
  (`cornersPhaseC`, `thruRoomC`, `thruFitC`, `piecesPhaseC`, `cutFoldsC`). In `outline.ts`, add hooks and
  fields only, behind `ob`. Don't change what it draws. If a fidelity miss comes from ink logic there, say
  so in the report with the function and line.
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
- the fidelity numbers, and what the run-end miss was;
- the band vertices before and after the trim;
- whether the default flipped;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1247's handle fields.
