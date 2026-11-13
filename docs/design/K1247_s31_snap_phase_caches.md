# K1247 stage 31: the snap, one dirty set, and exact caches for frame's phases

Ledgers: K1247 (this), K1310 (the course check: speed first), K1240 (the redesign). One Claude Opus agent in its
own worktree, on its own branch from master. Cap 2 h. Read first: the Speed table in `docs/design/K1240_gate.md`,
then the Findings, `## Plan to the gate (s30)` and the handoff in `docs/design/K1247_s30_path_to_gate.md`.

## Why

s30 measured that a def drag moves few chains a frame (5.4% of chains, 16.3% of points at 0.5 device px), and
that the 1.75x it was asked about was machine load: quiet master's def drag p50 is worker 72 ms, frame 38.2,
fill 13.9, zChains 9.85, band 6.9, paint 2.15. Its plan reaches ~7-9 ms in six stages by recomputing only what
moved. This stage is the plan's stages 1 and 2, which take frame from 38 to a projected ~14 ms.

## Goal

def drag frame p50 at ~14 ms or below (quiet machine), the look unchanged:

1. **The snap and one dirty set** (plan stage 1): move s30's `KF_INC` hold out of `frame` into
   `OutlineModel.update`, so one snapped input and one dirty set (chains, crossing ends, junction arms) feed
   every part. Snap cost <= 0.3 ms.
2. **Exact caches for frame's phases** at chain granularity (plan stage 2): corners and pieces first (the
   largest in s29's profile), then the rest as the cap allows. Each cache is exact: frame with caches equals
   frame without them, byte for byte, on the snapped input.
3. **The snap's default.** The snap approximates the input by up to 0.5 device px, so it may be on by default only
   if all three checks hold:
   - when a drag ends and the knot sleeps, the frame equals the full frame on the true input;
   - mid-drag, no drawn point is off by more than 0.5 device px;
   - a census of mid-drag frames (snap on against off) moves no bar find.
   Otherwise it stays off and you report which check failed.

The technique is yours. Today's look (no `rp=outline`) stays byte-identical.

## Done

1. **Identity:** a test in the style of `test/render/outline_inc.test.ts` showing caches on equals caches off,
   across the frames of a drag on def, muse_hash and fat.
2. **Speed:** app ABBA under the perf lock (`.claude/probes/K1247/k1247s30_run.ps1 -Steps load,def,fat`, which
   records the machine's load), master against your branch, flags on and off. Mark any run taken under load. No
   other part slower than the run-to-run spread.
3. **The snap's three checks**, with their numbers.
4. `npm test` green, golden snapshots and `outline_port.test.ts`'s pins unchanged. Copy
   `.claude/probes/K868/scenes/g41_ring_tw42.json`, `muse_hash.json` and `g41_user_tw64.json` from the main
   checkout first. They are untracked, so without them tests skip.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap. Done
holding early is not a stop while another phase can still be cached: use the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long results to a
  file and read only the lines you need). Use the Read tool only right before an Edit. Junction `node_modules`
  from the main checkout; never `npm ci`.
- **Untracked inputs** (censuses, scenes, benches, s30's drags in `.claude/probes/K1247/out/s30/`) are in the main
  checkout's `.claude/probes/`. Copy what you need into your worktree and never write there.
- **Your files:** `outline_model.ts`, `outline_worker.ts`, and in `outline.ts` the `frame` / `frameFast` phase
  drivers, the caching around the phase calls and the `KF_INC` code; tests; your tools and outputs under
  `.claude/probes/K1247/` (name them `k1247s31_*`). **K1344 s1** owns `outline.ts`'s builders (tail, corner,
  junction and fan functions), the band files, `draw.ts`, `fill_tri.ts`, `outline_app.ts`, `rec_glsl.ts`,
  `chain_frame.ts` and `paint.ts`. If a cache needs a builder's signature changed, keep the change minimal and name
  it in your report. Both of you keep `outline_inc.test.ts` green. **K1325's** census tools: use them as they are.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and
  delete it after. While someone else holds it, wait inside one blocking command; a lock older than 30 min is
  stale. Run the census with `-Lock` and hold no lock of your own around it. Measure in Node where you can.
- **Stop** 2 h after your start (`Get-Date` at the start and at each milestone). Before stopping, run `Get-Date`
  and check that 2 h have really passed. Leave the last 25 minutes for the checks. Then commit WIP, append a
  handoff to this brief with your start and stop times, and report. Neither a compaction nor context size is a
  stop; after a compaction, re-read this brief and `git log`.

## Report

Under 40 lines:
- what is cached and where, and the dirty set's shape;
- the worker frame by part on def and fat, master against your branch, flags on and off, with the load;
- the snap's three checks and its default;
- what is left, against the plan's stage 2 projection;
- your last SHA.

End with `Ledger items` and K1247's handle fields.

## Handoff (s31, 2026-11-12; start 11:43:17 PT, stop STOP_TIME PT)

Branch `worktree-agent-a871cf40ae634204d` (worktree `.claude/worktrees/agent-a871cf40ae634204d`). Flags: `KF_INC.snap`
and `KF_INC.cache` both stay **off** by default; today's look (no `rp=outline`) is untouched. `npm test` green.

**Stage 1 (68b17bd8, ff2be0e5).** The snap now runs in `OutlineModel.update`: `alignJunctionArms`, then one
`snapScene`, and frame (`frameSnapped`), zChains, fill, paint and band all read that snapped scene.
`update(scene, true)` frames the true input and recommits every chain to it. `frame()` no longer snaps.
- The dirty set is `SnapState.dChains`, `dCross` and `dJunc`: one Uint8Array entry per chain, crossing and junction, 1
  where this frame released (recommitted) it.
- The snap costs 0.19/0.25 ms p50/p95 on def, 0.21/0.28 on muse_hash and 0.10/0.13 on fat (it was 0.52/0.82 on def).
  ff2be0e5 copies released junctions by spread instead of `structuredClone`. Def's snapped scenes and tables trace
  byte-identical before and after.

**Stage 2 (68b17bd8, effc1af7): a corner cache.**
- Each chain carries a version (`chainVersC`). It bumps on a border miss or when its aux key changes: depth S/Z, and
  per arm SR, Dir, L, Lcut, Ux, Uy and Ang.
- A non-through corner hits when both chains' versions and the bits of `j.c` match; `CE_N` 18 floats per entry.
- Exact: caches on equal caches off on every frame of def (281/281), muse_hash (231/231) and fat (331/331) at sub 10,
  and in `outline_inc.test.ts` (def, muse_hash, fat, ring).
- Hit rates at sub 10:

  | | borders | corners |
  |---|---|---|
  | def | 91.3% | 38.8% |
  | muse_hash | 83.2% | 19.1% |
  | fat | 66.2% | none (no junctions) |

- Corner misses come almost all from L and Lcut. An arm's reach samples its crossing partners (reachOf), so one moving
  chain re-dirties its partners. Aux bumps per frame: 26.7 of 92 chains on def, 32.8 of 86 on muse_hash.

**Node frame p50/p95, ms.**

| | raw | snapped | snapped + cache |
|---|---|---|---|
| def | 41.05/50.51 | 41.46/50.90 | 37.13/48.81 |
| fat | 30.03/61.80 | 29.83/62.17 | 29.90/64.04 |

Phase p50s, raw against snapped + cache:
- def: corners 11.87 to 9.13, pieces 11.18 to 11.62, borders 7.28 to 5.32, cuts/eyes 5.40 to 5.41, regions 5.40 to
  5.68.
- fat: cuts/eyes 16.09 to 16.13, regions 7.80 to 7.68, borders 3.96 to 4.40 (the border key and copy outweigh fat's
  cheap builds), pieces 1.58 to 1.75.

**App ABBA** (`k1247s31_run.ps1 -Steps load,def,fat`, `out/s31/run/`), worker and frame p50 in ms. Load: 2% before,
8% after, with one node process at 107% of a core. Absolute values sit about 45% above s30's quiet master, so compare
within this run only.

| | def worker | def frame | fat worker | fat frame |
|---|---|---|---|---|
| master | 105.9 | 55.0 | 108.6 | 54.4 |
| branch, flags off | 101.0 | 53.3 | 105.1 | 52.3 |
| branch, flags on | 97.6 | 45.9 | 96.9 | 45.5 |

No part is slower than the spread. Fat's gain is within its spread (7.7 ms), and Node shows none.

**Checks: the snap fails two, so it stays off.**
- (a) fails. The app sends only when positions change, so the rest frame stays snapped: 28.1 px off on def, 24.9 on
  muse_hash. `update(exact)` equals the true frame byte for byte, but nothing asks for it. The fix lives in K1344's
  `outline_app.ts`: either an id check in `onReply` (it clears `inFlight` with no id and uses the latest `sentMaps`,
  so an unsolicited worker reply would race), or an exact request once the last move has settled.
- (b) fails. Drawn borders, snapped against true:
  - def: p50 28.1, p95 38.4, max 38.8 px; 56/57 frames over 0.5 px.
  - muse_hash: p50 18.0, max 46.2 px; 23/24 frames over 0.5 px.
  - The T=0 control reads 0.000.

  The cause is ill-conditioned self corners. Def's j83 (chain 31, θ 2.67) flips between solved and fallback within
  0.5 px of input, moving V about 38 px; its pieces are zero-length arcs. A plain drag crossing that threshold pops
  the same way, so this is a look residual, not only a snap one. END tails add about 1.2 px.
- (c) not run, since (a) and (b) already decide. The K1314 census renders a scene's first frame (`frame`, not
  `frameSnapped`) against form B. Censusing snapped mid-drag frames needs them written out as scenes, plus form B for
  each.

**Against s30's stage 2 projection (frame about 14 ms, worker about 47 ms):** frame is 37 in Node and 46 in the app.
Not started:
- a pieces cache (pieces, at 11.6 ms on def, is now the largest phase);
- span-local L/Lcut (s30's stage 4), which corner hits need;
- skipping setup and resampling for held chains (`dChains`), where fat's border cost lies.

**Next:** a pieces cache. `piecesPhaseC` (outline.ts 7333-7595) works over global tables:
- intervals: `ivA`, `ivB`, `ivLen`, `ivCMid`;
- stations: `stCS`, `stActive`, `stLeft`, `stRight`;
- slots and caps: `slotKind`, `slotKey`, `capArc*`;
- corner quads: `cQx`.

So the first step is to split its inputs per chain (each chain's intervals and stations, contiguous), and only then
key a chain's pieces on its version plus its corners' and crossings' dirty bits. Identity-test it as the corners are.
Span-local L/Lcut (s30's stage 4) raises both hit rates and can come first if the split proves large.

**Tools:** `.claude/probes/K1247/k1247s31_inc.ts` (identity, hits, snap, checks (a)/(b), timing, traces; `b=0`,
`time=0`, `rep=N`) and `k1247s31_run.ps1`. Outputs, untracked, in `.claude/probes/K1247/out/s31/`.
