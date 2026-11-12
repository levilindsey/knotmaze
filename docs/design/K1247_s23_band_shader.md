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

## Handoff (paused by Levi)

Paused 2026-11-11 at about 23:26, partway through the stage. The default did not flip; Done 1, 3, 4 and 5 were not started.

**What 1512b6d7 does.** `ob=1` (`__knotOutlineBandRec`) now sends band_rec's per-piece table instead of placed vertices, and main places the band.
- The worker sends: a BT = 5 texels a piece table, the quads it still places itself (faded runs and non-record pieces, compact, in `fb`/`fbSl`), and the fan-step prefix (`pf`).
- Main places every vertex of the fixed layout in one transform-feedback pass per reply: new `src/render/outline/band_place.ts` (BAND_PLACE_VS, built on REC_GLSL's recCol/recZ), run by `outline_app.ts` `placeBand`.
- `BandRecState(gpu)` in band_rec.ts; outline_worker's OutlineReply carries `bandRec`; outline_model passes `look.bandRecGpu`.
- The K299 list (paint_ring_lap.test.ts) has band_place's `mod(d, L)`.
- tsc is clean. `npm test` has not been run.

**What the twin measured** (`.claude/probes/K1247/k1247s23_twin.ts` (WIP ee10f587), real BAND_PLACE_VS in headed Chrome, RX 6800 XT):

| Check | def (29 frames) | fat (34 frames) |
|---|---|---|
| GPU vs CPU records, device px | p99 2e-4 | p99 3e-4 |
| dC, alpha, chain | exact | exact |
| Padding quads with area | none | none |
| Quads with other slots | 2 | 65 |
| Fidelity vs today, GPU (ppu 40) | max 0.533, 83 of 56827 pieces > 0.25 px | max 0.225, 0 > 0.25 px |
| Fidelity vs today, CPU records | same as GPU | same as GPU |

- The GPU adds no fidelity loss: the misses are the records' own.
- The few GPU vs CPU vertex gaps (def f23 d775, 3.8 px; fat f9 d387, 5.4 px) are one fan column landing one column later. This is a float32 vs float64 tie in recCs's `floor(x + 0.5)`. Both versions sit on the same border vertices, so the band shape does not move.
- The fat slot differences come from the past-4 nearest-in-s rule or the same tie. They are not attributed yet.
- muse_hash did not run: the session restart killed it.

**Untested.**
- The app path: `rp=outline&ob=1` in a page, GL errors, and whether the band draws.
- `npm test`.
- muse_hash and the K1314 through-bends (muse_hash j78, j98, j135; g41_user_tw64 j48, j49).
- The run-end miss: def c24 0.533 is still there, and its cause is still unchecked.

**Left.**
- Done 2: run the twin on muse_hash, then fix the run-end miss in band_rec (column 0/N on the clipping border vs the chain normal).
- Done 3: the slack trim, with band vertex counts before and after.
- Done 1: the ABBA bench under the perf lock, plus the TF pass's GPU cost.
- The census (ob=1 vs ob=0 within 1%).
- Done 4: the flip in frame_loop.ts, with the outline_port pins.
- Done 5: the crops and the app diff.

**Exact next step.**
1. `node scripts/run_node.mjs .claude/probes/K1247/k1247s23_twin.ts C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1247\out\s22\drag\muse_hash --out=.claude/probes/K1247/out/s23/twin_muse_hash.json`
2. `npm test`.
3. A headed smoke of `?<seed>&am=instant&rp=outline&ob=1` on a private dev server.
