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

## Handoff (stage 25, 2026-11-12; start 02:17:50, stop 03:41)

Done 1-5 hold; Done 6 not started. Stopped because Done held (1 h 23 min in).

- **The pass.** `BAND_QUAD_VS` (band_place.ts) runs one TF invocation per quad: each column placed once at
  both widths, the slot loop once, five interleaved vec4s out (qO, qI, qS, qM, qL; mode 2 record, 1
  worker-placed from uBqFb/uBqSl, 0 generic or padding at zero area). The band draws them as instances of six
  corners (`bandQuadVs(BAND_VS)`, divisor-1 attributes, `drawArraysInstanced`).
- **GPU time** (timer query, `k1247s25_tfonly.ps1`, at rest): def 4.044 -> 0.953 ms, fat 4.040 -> 0.917; on
  reply frames 4.12-4.13 -> 0.94-0.96 (p95 4.35-4.42 -> 0.98-1.0). An EMPTY query reads 0.938 / 0.919 on
  ANGLE D3D11, so the pass's own cost is now about 0 (s24's was about 3.1 ms plus that floor). The query now
  runs only with `obt=1` (the tfonly script passes it).
- **Main frame** (`k1247s25_bench.ps1`, ABBA under the lock; bench4, the final build; p50 ms, ob=1 vs ob=0):
  def reply 10.0/9.8 vs 10.0/10.2, all-frames p95 10.2/10.0 vs 10.3/11.1, quiet 6.4/6.4 vs 7.8/8.2; fat reply
  11.0/10.4 vs 10.5/10.5, all-frames p95 11.7/11.3 vs 11.4/11.5, quiet 6.8/6.6 vs 8.5/8.3. s24's ob=1 reply
  frame was 13.8-14.5 (def), 14.1-14.9 (fat). Fat's reply p50 ran +0.45-0.5 over ob=0 in bench2 and bench3
  (query on, off), +0.2 in bench4 after the reply's data textures were overwritten in place
  (`texSubImage2D` when the height holds): marginal, inside bench4's spread. ob=1 also uploads less (p50
  1.5-1.9 vs 3.6-4.1 ms), its worker answers sooner (p50 101-117 vs 130-138 ms) and it gets more replies per
  drag (28-33 vs 26-28). bench1's def run 3 is void (a src edit reloaded its page).
- **Fidelity** (`k1247s25_twin.ts`, the two-stage pipeline captured): every word equals s24's
  BAND_PLACE_VS on def, fat, muse_hash and g41_user_tw64; over 1/4 px 0 / 0 / 0 / 1 (g41 0.276 px); slot-only
  quads 0 / 32 / 0 / 0.
- **The flip** (27b56d43): frame_loop.ts sets `__knotOutlineBandRec` under `rp=outline` unless `ob=0`. The
  model's look default is unchanged (main sets bandRec / bandRecGpu, as s20 did for oe), so no
  `outline_port.test.ts` pin moved and none was re-frozen. `npm test` green (227 files, 2931 tests),
  goldens unchanged, outline_port passes with g41_ring_tw42 on disk.
- **Census** (`k1247s22_census.ts`, ppu 160): OB=1 and OB=G both TOTAL 23 (def 3, fat 0, muse_hash 20),
  owner_only 709, tail_look 114, identical counts (s24's OB=1: 23 / 701 / 114; the 8 owner_only came with
  master). Outputs `out/s22/census/census_s25ob1.*`, `census_s25obG.*`. The copied form B caches are deleted.
- **Crops** (off | on | |diff|, five worst per drag): `out/s25/crops/crops_{def,fat,muse_hash,g41}.png`.
  Rest paint: `out/s25/rest_ob1/` (ob=0 vs the default: 262 px over channel 24, single-pixel specks on band
  edges); its same-build control `out/s25/rest_ctrl/` (ob=0 vs ob=0: 570 px, one pulse patch by the start
  marker).
- **Left:** Done 6, the g41 residual (f11 c20 d118). `recSideOk` (chain_frame.ts) is shared with
  fill_tri's record checks, so a fix there moves the fill records too: a stage of its own with twin, census and
  pins. The phone (PowerVR) A/B of ob on vs off was not run (no phone in this stage). K1322's recStrip key
  port waits for K1314 s6.
- **Tools** (committed): `k1247s25_twin.ts`, `k1247s25_tfonly.ps1`, `k1247s25_bench.ps1`,
  `k1247s25_benchsum.cjs`, `k1247s25_rest.ps1`. Outputs (untracked) in `.claude/probes/K1247/out/s25/`.
