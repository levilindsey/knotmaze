# K1247 stage 25: place each band column once, then flip the band records on

Ledgers: K1247 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree, on
its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md` and the s24 handoff at the end
of `docs/design/K1247_s24_flip.md`.

## Why

Stage 24 cleared the slot and fidelity blockers. Past 4 slots the GPU now picks today's passes. Every band
vertex is within 1/4 px of today's band on def, fat and muse_hash, and one g41 vertex is at 0.276 px. The flip
failed on the main frame. With `ob=1` the reply frame is 3.5-4 ms slower (def 10.3-10.6 -> 13.8-14.5 ms p50,
fat 10.6-11.0 -> 14.1-14.9), and all of it is the transform-feedback placement pass: 4.1 ms GPU on about
570k vertices. About 3 ms of that is each of a quad's 6 invocations redoing the same column work: the
`uBpTab` binary search, `bpCol` and `bpColS`. About 1 ms is the slot loop. Quiet frames are already faster
with `ob=1` (6.7-7.2 against 8.2-8.6 ms).

## Goal

The placement does each column's work once. Then the band records become the default for `rp=outline`. The
technique is yours: one TF invocation per column then an expansion to 6 vertices, an index buffer, or
something better. Today's look (no `rp=outline`) stays byte-identical. Phones matter more than the desktop
here: a pass that costs 4 ms on this GPU costs far more on the Pixel's PowerVR.

## Done

1. **The pass:** its GPU time by timer query, at rest (`k1247s24_tfonly.mjs`) and on reply frames, on def
   and fat, before and after.
2. **The main frame:** `k1247s24_bench.ps1`, A B B A under the perf lock, on def and fat. The bar is the
   reply frame and the all-frames p95 with `ob=1` no worse than `ob=0` beyond the run-to-run spread.
3. **Fidelity held:** the twin (`k1247s24_twin.ts`) on the four s24 drags. No vertex over 1/4 px on def, fat
   and muse_hash, at most s24's one on g41. Slot-only quads no more than s24's.
4. **The flip:** once 1-3 hold, `ob` defaults on wherever it is read. Re-freeze `outline_port.test.ts`'s pins
   only where the flip moves them, and name them in the commit. Run the census with the default
   (`k1247s22_census.ts`): within 1% of `ob=0`.
5. **Crops:** off | on | |difference| at the five worst spots per drag, from your final commit, in
   `.claude/probes/K1247/out/s25/`, plus the app paint at rest (`k1247s24_rest.ps1 -Shot`) against a
   same-build control. I view them before merging.
6. **If time is left:** the g41 residual, f11 c20 d118. It is an end vertex after a 7e-5-world segment,
   where `endFans` refuses the arc and `recSideOk` fails on that segment's fold.
- **Checks:** `npm test` green, the golden snapshots unchanged. Copy
  `.claude/probes/K868/scenes/g41_ring_tw42.json` from the main checkout first. It is untracked, so without
  it `outline_port.test.ts`'s second pin skips. Delete any form B cache you copy before you stop.

A failing check is work to do, not a reason to stop. If the pass is still too slow, keep cutting it until
the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print a
  whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to a
  file and read only the lines you need). Use the Read tool only right before an Edit, and to view crops.
  Junction `node_modules` from the main checkout; never `npm ci`. Read `.claude/rules/probes.md` before
  probing: a bare URL is today's daily. Real-time headed Chrome only; never `--virtual-time-budget`.
- **Untracked inputs** (the s22 and s24 drags, s24's outputs) are in the main checkout's
  `.claude/probes/K1247/out/`. Copy what you need into your worktree and never write there.
- **Your files:** `band_place.ts`, `band_rec.ts`, `draw.ts` (`bandData`, `zChains`), `band_gpu.ts`, the record
  code (`chain_frame.ts`, `rec_glsl.ts`, `fill_tri.ts`'s `fillStructure`/`stripNb`, `outline_app.ts`,
  `outline_model.ts`, `outline_worker.ts`), `src/app/frame_loop.ts`, new files of your own, tests, and your
  tools under `.claude/probes/K1247/`. Leave `recStrip`'s strip keys alone: K1322 ports K1314's per-side key
  rule there after K1314 stage 6 merges.
- **Two agents run at the same time.** K1314 stage 6 works in `outline.ts`'s corners and pieces and in
  `fill_tri.ts`'s `fillFrame`. K1321 works in the census reference (`.claude/probes/K1314/k1314_census.ts`,
  `form_b_fillet.ts`). In `outline.ts`, add hooks and fields only, behind `ob`; don't change what it draws.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs.
  Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start.
  Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min
  is stale. The K1314 census takes it scene by scene, so expect short waits.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Before stopping for the cap, run `Get-Date` and check that 2 h have really passed. Leave
  the last 25 minutes for the checks. Then commit WIP, append a handoff to this brief with your start and
  stop times, and report. Neither a compaction nor context size is a stop; after a compaction, re-read this
  brief and `git log`.

## Report

Under 40 lines:
- the pass's GPU time and the main frame, before and after, on and off;
- the fidelity and slot numbers per drag;
- whether the default flipped, and the pins re-frozen;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1247's handle fields.
