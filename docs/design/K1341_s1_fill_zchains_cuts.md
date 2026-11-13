# K1341 stage 1: exact cuts in fill and zChains

Ledgers: K1341 (this), K1247 (the speed plan), K1240 (the redesign; the Speed table in `docs/design/K1240_gate.md`).
One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h. Read first: the handoff at the end
of `docs/design/K1247_s28_fill_zchains_speed.md`.

## Why

On a quiet machine, master's def drag p50 is worker 72 ms: frame 38.2, fill 13.9, zChains 9.85, band 6.9 and
paint 2.15 (K1247 s30). K1247's stages are cutting frame. Fill and zChains are about a third of the worker, and no
one is working on them. s28 left three exact cuts:

- a squared pre-check before `nearRange`'s square root (`draw.ts` 624, zChains' hottest line);
- hinted searches in `spanOf` (`chain_frame.ts` 402, two binary searches per record column);
- a box lower bound in `fill_tri.ts`'s disk off-fan nearest-ring scan.

In s28's profile (`out/s28/prof/c10`, def), `fillFrame` is 1684 samples, of which its own body is 724: the disk
scan, the zero-fills, the tail's cumulative hypot and the corner arcs. zChains is 1295, led by nearScan 353 and
nearVisit 273.

## Goal

Make the fill and zChains parts faster on the def, muse_hash and fat drags, with output identical bit for bit. Start
with the three cuts, then take the next hotspots a fresh profile of the two parts shows. The technique is yours, but
every cut must be exact. Algorithm changes (coarser grids, GPU placement, a second worker) are later stages.

## Done

1. **Identity:** zChains' and fill's outputs are bit-identical to master's on every frame of the s18 drags (def,
   muse_hash, fat) and in all 12 census scenes. Compare digests, with `.claude/probes/K1247/k1247s28_digest.ts` or
   your own.
2. **Speed:**
   - A Node ABBA of the two parts, with GC time.
   - Then two app ABBAs under the perf lock (`.claude/probes/K1247/k1247s30_run.ps1 -Steps load,def,fat`, which
     records the load), master against your branch. Fill and zChains must be faster by more than the spread, and
     no other part slower than the spread. Mark any run taken under load.
3. `npm test` green, golden snapshots and `outline_port.test.ts`'s pins unchanged. Copy
   `.claude/probes/K868/scenes/g41_ring_tw42.json`, `muse_hash.json` and `g41_user_tw64.json`, and
   `.claude/probes/K1247/out/s18/`, from the main checkout first. They are untracked, so without them tests skip.

A failing check is work to do, not a reason to stop. If one cut can't be made exact, drop it and take the next one.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to a
  file and read only the lines you need). Use the Read tool only right before an Edit. Junction `node_modules`
  from the main checkout; never `npm ci`.
- **Your files:** `draw.ts` (zChains), `fill_tri.ts`, `chain_frame.ts`, tests, and your tools and outputs under
  `.claude/probes/K1341/` (name them `k1341s1_*`). Other agents own these; stay out of them:
  - **K1247 s32:** `outline_model.ts`, `outline_worker.ts` and `outline_app.ts`, plus, in `outline.ts`, the
    frame drivers, `KF_INC`, the caches and the junction corner solve.
  - **K1314 s11:** `outline.ts`'s builders, the band files, `rec_glsl.ts` and `paint.ts`.

  Everyone keeps `outline_inc.test.ts` green.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min is
  stale. Agents share the lock, so expect waits. Measure in Node where you can.
- **Stop** 2 h after your start (`Get-Date` at the start and at each milestone). Before stopping, run `Get-Date`
  and check that 2 h have really passed. Leave the last 25 minutes for the checks. Then commit WIP, append a
  handoff to this brief with your start and stop times, and report. Neither a compaction nor context size is a
  stop; after a compaction, re-read this brief and `git log`.

## Report

Under 30 lines:
- each cut: where it is and what it saved;
- the Node ABBA and both app ABBAs by part, with the load;
- the identity check;
- what is left;
- your last SHA.

End with `Ledger items` and K1341's handle fields.

## Handoff (stage 1 agent, 2026-11-12, 14:40:45 to 16:10)

Branch `worktree-agent-a74fd2c72ec40ff48`, from af721b2f. Commits ab4edce7, 8a204649, ec231427,
16e9b159 (code), 6f268f6d and this one (probes, handoff).

**Cuts (all exact).**
- draw.ts zChains: tangent by bisection; nearVisit's j by a compare; nearRange's squared pre-check
  (sqrt skipped when `D <= B*B*(1-1e-9)`); the NW Float64Array in place of the top-level `let`s
  (HeapNumber boxing); posQ/PQ, WU, SPQ (walk and span without allocation); depthAt's hat at module
  level; wrapL sites; nearLt (the walk decides d < lim from d² outside a 1e-9 band, hypot only inside);
  rootBetween's circular prefilter.
- chain_frame.ts: wrapL; the spanOf memo (spanMemo on only around recStrip2/recStrip); csAt in place
  of colAt's per-call closure.
- fill_tri.ts: wrapL sites; ringSegD plus the off-fan box skip (ringHint); the memoRec2/memoRec wrappers.

**Identity.** `k1341s1_digest.ts` over the s18 drags (every frame) and the 12 census scenes: 0 diffs
against master (`all a53c2eacce4f8f95`) at every build b3 to b6 (b6 = 16e9b159). `npm test` green
(231 files, 2945 tests); golden snapshots and the outline_port / outline_inc / byte_identity pins
unchanged.

**Timings (all under load: other agents' node processes at 100-170% of a core).**
`out/final/` (untracked) holds them.
- Node ABBA, all parts (`node.txt`, R 6, p50 ms, A B B A): zChains def 10.00/10.41 → 7.93/7.54,
  muse_hash 17.12/19.04 → 14.43/14.92, fat 19.54/19.93 → 11.85/11.58. Fill def 13.00/14.38 →
  13.41/14.74, muse_hash 20.75/24.43 → 23.71/24.53, fat 6.08/6.98 → 6.37/5.91. Others within drift.
- App ABBA (5761 master, 5762 branch, p50 means): round 1 def zChains 10.10 → 7.60, fill 14.60 →
  14.20, band 7.65 → 7.60; fat zChains 11.10 → 8.45, fill 16.45 → 16.20, band 9.10 → 9.35 (spread
  1.7). Round 2 def VOID (both branch runs 2x on every part, worker included: a load burst);
  fat zChains 11.55 → 8.60, fill 15.95 → 16.25, band 8.55 → 9.60 (spread 0.9).
- Fill and band alone (`node_fb.txt`, mode fb, A B B A A B, per-frame p50): def fill master 13.92,
  12.64, 13.46 vs branch 14.70, 14.58, 13.67; def band 6.82, 6.24, 6.50 vs 7.38, 7.77, 6.42. The last
  B run's muse_hash and fat read 2x (load) and are void.

**Verdict.** zChains is faster well beyond the spread (about -25% def, -17% muse_hash, -40% fat).
Fill is NOT faster beyond the spread, and on def it reads about 7% slower in the Node runs; band on
def (Node fb) and fat (app round 2) reads slower by about the spread. Both are open.

**What is left (next).**
1. Bisect fill and band on a quiet machine: fb ABBAs with fill_tri.ts reverted to master's (the rest
   kept), then each fill_tri cut (box skip, memo wrappers, wrapL) and the shared helpers band calls
   (footNear's NW, zAtC, dSC; csAt). Drop any cut that reads slower. Watch gcF: zChains now allocates
   less, so scavenges shift into the fill window (gcF rose while gcZ + gcF fell).
2. Fill cuts not tried: fillFrame's per-call closures (its entry line holds 131 of 1117 ticks in
   master's line profile), about 5 MB of allocation per frame, hinted posQ/nearScan searches, the
   `(i+1)%R` compare in the disk scan, argument boxing in nearW-style calls. det_math `hypot2` is out:
   it changes Firefox's bits.
3. Tools: `k1341s1_run.ps1` (lock, Node ABBA, app rounds), `k1341s1_time.ts` (modes all, zf, fb),
   `k1341s1_digest.ts`, `k1341s1_alloc.ts`; master bundles are built from a `git archive af721b2f`
   copy with the probe .ts files copied in.
