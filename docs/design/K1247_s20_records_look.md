# K1247 stage 20: the record fill draws what today's fill draws, then becomes the default

Ledgers: K1247 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree, on
its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md`, and the handoffs at the end
of `docs/design/K1247_s18_records.md` and `docs/design/K1247_s19_shader_fill.md`.

## Why

Stages 18 and 19 built the record fill behind `oe=1`. The worker places only each strip's end columns,
and main places the rest by transform feedback. On def the worker frame fell from 190-193 to 156-164 ms
p50, and the reply from 32 to 22.6 MB. It is still a switch because its look differs from today's fill in
two ways:
- **Cracks:** 1-4 px of paper along strip sides. The census against form B (fill / paper px, on vs off)
  reads def 52/177 vs 44/60, muse_hash 253/471 vs 243/266, and g41_user_tw64 15/131 vs 13/55. The
  vertices sit on the border, so the cracks are between vertices. Stage 18's handoff lists the probes
  already tried (SAG, ARC) and the next one to run.
- **Moved section boundaries at junctions:** where two sections meet inside a junction, the boundary
  moves. Claude saw it in the crops `.claude/probes/K1247/out/s19/crops/def.png` rows 2-3 and
  `muse_hash.png` row 3. Those crops use per-chain hues. Stage 1 of K1314 found that in the app's paint
  the junction colours converge, so check first whether these shifts show in the app's paint at all.

This stage moves the gate's first speed line for the default `rp=outline` by making the record fill the
default.

## Done

1. **The cracks closed:** the census against form B with `oe=1` is within 1% of off on def, muse_hash and
   g41_user_tw64, in both fill and paper px.
2. **The junction boundaries:** at each crop spot, the app's paint (rp=outline, its own colours) with
   `oe=1` against off. Fix every spot where they differ visibly. Report the ones that only show in the
   per-chain hues.
3. **The default flipped:** `rp=outline` uses the record fill unless `oe=0`. Today's look stays
   byte-identical. Re-freeze `outline_port.test.ts`'s pins only where the flip moves them, and name them
   in the commit.
4. **Speed:** the desktop worker frame on def and fat, ABBA under the perf lock, master against your
   final commit, both at their defaults. Also the main frame at rest and mid-drag (no worse than master
   beyond the run-to-run spread) and the reply MB.
5. **Crops:** off | on | |difference| at the five worst spots per drag, from your final commit, in
   `.claude/probes/K1247/out/s20/crops/`, in the app's paint as well as the per-chain hues. I view them
   before merging.
- **Checks:** `npm test` green and the golden snapshots unchanged.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never
  print a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long
  results to a file and read only the lines you need). The Read tool only right before an Edit, and for
  viewing crops. Junction `node_modules` from the main checkout; never `npm ci`. Read
  `.claude/rules/probes.md` before probing: a bare URL is today's daily. Real-time headed Chrome only;
  never `--virtual-time-budget`.
- **Your files:** the record code, meaning `chain_frame.ts`, `rec_glsl.ts`, `fill_tri.ts`'s record code,
  `outline_app.ts`, `outline_model.ts` and `outline_worker.ts`; tests; your tools under
  `.claude/probes/K1247/`. The K1314 stage 2 agent is fixing ink spikes in `outline.ts`, `draw.ts` and
  `fill_tri.ts`'s non-record code at the same time. Stay out of those. If a crack's cause is in that code,
  say so in the report and don't edit it.
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
- the crack census, before and after;
- the junction boundary findings;
- whether the default flipped;
- the speed numbers;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1247's handle fields.

## Handoff (stage 20 agent, 2026-11-11)

Commits on `worktree-agent-a095e7cff519b9abd` (base e7a90e53): 00aab547 (mode 4: record columns on
the border's own polygon), 9479e939 (rec_glsl places by mode 4), 31b58786 (the flip), 70032712 (tools),
a85e8da6 (the bench clock), 8939b5a6 (the K299 rounding sites), then this handoff.

1. **Cracks** (k1247s20_crack.ts against form B, fill / paper px; `out/s20/`): oe=1 before (s19)
   def 52/177, muse_hash 253/471, g41_user_tw64 15/131; after def 44/61, muse_hash 242/259,
   g41 13/56; off def 44/60, muse_hash 243/266, g41 13/55. Fill matches off on all three; paper is
   within 1 px of off but 1.7% (def) and 1.8% (g41) over, so the 1% bar is missed on those two by one
   pixel each. The def pixel is strip#829's R piece starting on a junction fillet arc (6.863, 25.762)
   that is not on the chain's polygon; not fixed.
2. **Junction boundaries.** App paint at rest (phw=0 same state, final build, default vs oe=0):
   def 33 px, fat 26 px scattered (at most 3 px a 240 px window) beyond the start marker's per-load
   flip, against off-vs-off controls of 17 / 20 px: nothing visible, nothing to fix
   (`crops/app_rest_{def,fat}.png`, controls `_ctl`). Per-chain hues only: the s19 spots
   (`crops/s19spots_{def,muse_hash}.png`; muse_hash f18 1308 -> 0 px) leave the junction owner swap at
   muse_hash f8 (16.20, 19.83), 1034 px; the s20 worst drag spots (`crops/{def,muse_hash,fat}.png`,
   picked by k1247s18_fill.ts's largest fill-vertex move on vs off: 6.7 device px def, 19.1
   muse_hash, 6.0 fat) differ only in where the hue boundaries fall.
   App paint mid-drag is not compared: the app has no replay of a captured scene, so two drags
   never share a state.
3. **Default flipped** (31b58786): `src/app/frame_loop.ts` sets `__knotOutlineFillRec` under
   `rp=outline` unless `oe=0`. Off-outline links are untouched; no `outline_port.test.ts` pin moved
   (none sets fillRec).
4. **Speed** (ABBA under the perf lock, master 2d547152 vs 31b58786, both at defaults;
   `out/s20/bench_{def,fat}.json`, re-run with the fixed frame clock in `bench2_{def,fat}.json`):
   frame ms from the first draw to a readPixels (p50/p95), master runs 1 and 4, branch runs 2 and 3:
   def rest 6.5/6.9, 6.0/6.4 vs 5.9/6.4, 5.9/6.4; mid-drag 8.7/12.6, 8.9/13.3 vs 8.2/10.8, 8.3/11.0.
   fat rest 6.2/6.4, 6.2/6.6 vs 6.1/6.4, 6.2/6.6; mid-drag 8.8/13.1, 9.2/13.4 vs 8.6/11.2, 8.6/11.2.
   The mid-drag rAF interval is p50 34-38 ms and p95 51-63 ms on both. Worker frame p50/p95: def
   191/341, 187/360 vs 172/247, 168/205; fat 200/355, 199/336 vs 164/216, 169/212. Its fill p50:
   def 46/45 vs 28/29 ms, fat 50/49 vs 30/29; its paint 7.1-7.5 vs 3.0-3.6. Reply 32.1-32.8 MB vs
   22.8-23.3 MB. First structure: def 672/594 vs 880/875 ms, fat 620/532 vs 723/701, so about
   +200 ms with records (left). The first run (`bench_*.json`) read the branch's mid-drag p95 at
   53-76 ms. That was the probe: the placement's transform-feedback draw runs in the worker reply's
   message task, between frames, and started the frame clock early. `k1247s18_bench.mjs` now skips
   draws inside a TF pass (a85e8da6). The pass on its own (`k1247s20_tfprobe.mjs`, readPixels-synced,
   def at rest, 280,193 points): p50 2.6 ms of GPU, max 15.0; the first draw after it p50 3.8, max
   24.7. The frame clock starts after the pass, so the frame numbers count only the part of it still
   on the GPU when a frame draws.
5. **Crops** (`.claude/probes/K1247/out/s20/crops/`): per-chain hues `def.png`, `muse_hash.png`,
   `fat.png` (the five worst spots per drag, off | on | |diff|), `s19spots_*.png`; app paint at rest
   `app_rest_def.png`, `app_rest_fat.png` (+ `_ctl`).
6. **Checks:** `npm test` green on 8939b5a6 (tsc, then 225 files / 2927 tests passed, 2 files skipped); no golden snapshot moved. 8939b5a6 lists mode 4's three rounded quotients in rec_glsl.ts in `paint_ring_lap.test.ts` (K299), each with why it is benign.

**Tools:** `k1247s20_crack.ts` (census), `k1247s20_appdiff.mjs` (app-paint A/B crops),
`k1247s20_bench.ps1` (def + fat ABBA in one lock), `k1247s20_tfprobe.mjs` (the placement pass's GPU
cost), `k1247s19_lib.mjs` twin4 (mode 4's float64 twin). `k1247s18_bench.mjs` now ignores draws inside
a transform-feedback pass.

**Left:** the 1 px fillet-arc crack (def, g41); the muse_hash f8 owner swap (hues only); an app-paint
drag A/B (needs a scene replay hook); the phone (PowerVR) check of the mode-4 shader, now the default;
the first structure's +200 ms with records; the 1 ms worker fill target (s19).
