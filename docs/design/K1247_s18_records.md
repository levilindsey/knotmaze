# K1247 stage 18: decide once, evaluate cheaply (can the outline's moved frame reach 3 ms?)

Ledgers: K1247 (this), K1310 (the gate), K1240 (the redesign). One Claude Opus agent in its own worktree, on
its own branch from master. Cap 2 h. Read first: `docs/design/K1240_gate.md`, the handoffs at the end of
`docs/design/K1240_s4b_cost.md` and `docs/design/K1283_s10.md`, and the header of
`src/render/outline/band_gpu.ts`.

## Why

The outline's worker spends 183-193 ms p50 per moved frame on def mid-drag (desktop; `k1283s11_bench.ps1`).
The gate's bar is 3 ms, and the Pixel has not been measured. At S4b the parts were frame 34, zChains 17,
fill 21, paint 5 and band 38 ms; since then the fill has grown to about 45 ms (the strip foot, about 33k
nearest-point searches a frame), and band reads about 60. Speed stages have cut 5-10% each and look stages
added cost back, so tuning does not close a 60x gap. Levi asked (2026-11-11) whether the design needs a
step back. This stage answers with numbers.

The hypothesis: Levi's rule ("the structure is decided once, only positions follow the frame") means almost
every vertex the outline emits can be a FIXED RECORD made at structure time: chain c, arc s, signed offset
d (and for paint, its s). Each frame then places it from the chain samples, which is cheap and can run in a
vertex shader. The only per-frame CPU work left is the few points that move along their chains (cut ends,
corner arc ends, inner-corner trims, fan feet), each solved starting from last frame's answer. S4b's band
fix is the precedent: tie alpha moved to a per-fragment evaluation from a chain-sample texture, and the
frame went from 3.4 s to 117 ms.

## Goal

A measured verdict on the hypothesis, with the fill (the largest part) ported as the proof. This stage
moves the gate's first speed line (desktop per moved frame). The technique is yours; the look must not
move: form B is approved for ink, today's look for paint.

## Done

1. **Inventory.** On def, muse_hash and fat, over the bench's 5 s drag: for each part (borders and
   `frame()`, fill, band, zChains), count the output vertices that are fixed records (re-evaluated from a
   later frame's samples, within 1/4 px of what the current pipeline emits at every frame of the drag) and
   the moving points, by kind. Report the counts and how many moving points a frame would solve.
2. **The fill ported** behind a switch (a URL flag such as `oe=1`; the default `rp=outline` and today's look
   untouched): records at structure time, a per-frame solve of the moving points, placement by a vertex
   shader from the chain-sample texture (or a CPU placement first, if it lets you measure sooner, then the
   shader). Measured with the switch on and off, ABBA under the perf lock: the fill's part of the moved
   frame (target 1 ms or less), the worker frame on def, the main frame at rest and mid-drag, and the reply
   size. Fidelity: on vs off, max and p99 vertex distance in px over the drag, census against form B on
   def, muse_hash and g41_user_tw64 within 1% of off, and crop rows off | on | |difference| at the five
   worst spots, in `.claude/probes/K1247/out/s18/crops/`, made from your final commit. I view them before
   merging.
3. **Projection.** From 1 and 2: what the whole moved frame on def and fat would cost if every part were
   ported this way, what cannot be ported (anything that needs a search per frame), and what that costs.
   End with a plain verdict: 3 ms on def is reachable or not, and the floor.
- **Checks (the gate's per-stage set):** the above, the worker frame on def (ABBA) and `npm test` green.
  Golden snapshots unchanged; `outline_port.test.ts`'s pins unchanged with the switch off.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never
  print a whole file: outline.ts is over 400 KB. Keep each tool output under about 40 lines (write long
  results to a file and read only the lines you need). The Read tool only right before an Edit, and for
  viewing crops. Junction `node_modules` from the main checkout; never `npm ci`. Read
  `.claude/rules/probes.md` before probing: a bare URL is today's daily.
- **Your files:** everything in `src/render/outline/` (no other agent works there now); `src/app/`,
  `paint_model.ts` and `paint_glsl.ts` additions only, today's look byte-identical; tests; your tools
  under `.claude/probes/K1247/` (copy the bench and census tools you need from
  `.claude/probes/K1240/proto/`).
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did
  not start.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time,
  delete it after. While someone else holds it, wait inside one blocking command; older than 30 min is
  stale. Never touch the phone.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Leave the last 25 minutes for the checks. Then commit WIP, append a handoff to this
  brief and report. Neither a compaction nor context size is a stop; after a compaction, re-read this
  brief and `git log`.

## Report

The inventory counts, the fill's numbers on and off, the fidelity numbers, crop paths, the projection and
the verdict; what's left; your last SHA. Keep it under 40 lines. End with `Ledger items` and K1247's
handle fields.

## Handoff (stage 18 agent, 2026-11-11, 11:08 to 12:10)

Commits `03e61c36..c35d62bb` (WIP each; the hook re-dates them). Outputs (untracked) are in
`.claude/probes/K1247/out/s18/`; tools are `.claude/probes/K1247/k1247s18_*`.

**1. Inventory** (`k1247s18_inv.ts` over the captured 5 s drags in `out/s18/drag/<d>`, tol 1/4 device
px; `inv_<d>.txt`). Fill vertices: n | V1 fixed s | V2 records with only the ends moving.
- def 265174 | 127780 | 146694 (101880 move; 16600 tail vertices die or appear);
- muse_hash 200237 | 52975 | 77867 (107645 move);
- fat 216180 | 15973 | 23596 (192584 move: V2's p50 0.63 px, p99 5.6 px; the strict 1/4 px bar fails, but
  the shipped port's on/off error is p99 1.3 px).
- Band: every vertex has a chain and V2 holds on def (457098), but it RESTRUCTURES on 28 of 29 frames
  (fat: 32 of 34, V2 261164 of 333624). Its topology must be fixed before it can be records.
- Borders: def has 78901 piece points, of which 36016 are V1 fixed.
- Per-frame solves are 2 moving ends per piece (crossing cuts, junction ends): def 5450, fat 3424.

**2. The fill ported** (`oe=1`, CPU placement: `chain_frame.ts` `offsetRow`/`zRow`, `fill_tri.ts`
`recStrip`; off by default, today's path byte-identical: `npm test` 2927 passed, goldens and
`outline_port.test.ts` unchanged).

| ABBA on def, p50 ms | off | on |
|---|---|---|
| #2 at fe883991: fill | 43.0 / 45.1 | 27.5 / 27.5 |
| #2: worker frame | 179.6 / 185.4 | 168.3 / 172.1 |
| #3 at c35d62bb (others' CPU load; off rose about 15% too): fill | 51.0 / 49.8 | 36.7 / 34.7 |
| #3: worker frame | 205.9 / 210.0 | 188.8 / 189.3 |

- Main frame at rest is 5.8-6.0 in both. Mid-drag is 8.9-9.2 off and 9.0-9.7 on.
- The reply is 32.5 MB both ways: CPU placement still ships every vertex.
- Fill is 27.5 ms against the 1 ms target. Not met: only GPU placement can meet it.

Fidelity, on vs off device px (`fill3_<d>.json`):

| Drag | p50 | p99 | max |
|---|---|---|---|
| def | 0.18 | 1.33 | 6.98 |
| muse_hash | 0.21 | 6.08 | 23.2 |
| fat | 0.26 | 1.33 | 4.11 |

- muse_hash's tail is tangential slide of mid-strip columns, not shape.
- Two fixes made these numbers:
  - L/R were swapped on long curved strips (def iv 426, a 37 px crack). The sides are now picked by the end
    points.
  - A border past an open chain's end (muse_hash f12, s = -0.29) now falls back to today's path.

**Census vs form B at rest, NOT within 1% of off** (fill / paper px, `out/s18/fillcensus/`):

| Scene | on | off |
|---|---|---|
| def | 52 / 178 | 44 / 60 |
| muse_hash | 253 / 472 | 243 / 266 |
| g41_user_tw64 | 15 / 131 | 13 / 55 |

- The extra paper is 1-4 px cracks along strip sides (`--classify`, `k1247s18_crack/which/inset.ts`).
- The vertices sit on off's border (inset p50/p90 within 1e-4 world), so the cracks are in BETWEEN the
  vertices.
- Two probe switches tested this, and both are off by default:
  - `SAG`, a convex sagitta push. At SAG 1, g41 is 30 / 75: cracks trade for spills.
  - `ARC`, side columns uniform in border length. Paper falls (muse_hash 403, g41 107), but fill explodes
    (muse_hash 2806). Off's columns are close to s-uniform (0.065 world on a 267-column strip, against
    ARC's 0.99), so ARC shears long S-shaped strips against the centre row.
- The crack mechanism is therefore still open. The next probe to run: compare on's side row against
  off's row segment by segment, not vertex by vertex.

Crops (off | on | diff, the 5 worst spots per drag, from c35d62bb): `out/s18/crops/{def,muse_hash,fat}.png`.
muse_hash row 3 (f18, 20.9 px at a junction's tangle) is the only visibly different one.

**3. Projection** (Node `k1247s18_parts.ts`, `k1247s18_floor.ts`).
- Moved frame by part, off → fill on:
  - def 167.7 → 155.7 ms;
  - fat 155.9 → 145.3 ms;
  - band (45-63 ms) and frame() (19-48 ms) dominate.
- CPU placement of every part saves only about 16 ms more: the placement is per vertex and the reply
  stays 32 MB.
- With GPU placement of every part, the CPU does only what moves:
  - chain tangents: def 0.61 ms, fat 0.39 ms;
  - the moving-end solves: def 2.12 ms (5450), fat 1.81 ms (3424). This is a synthetic microbench: 8
    frameAt calls per end, unseeded;
  - z per chain sample: today's zChains costs 8.9 / 15.4 ms, but it is a per-sample tent, so it can be
    a records pass too (not measured).
- What cannot be records is a per-frame search: the moving ends, the band's restructure (needs a fixed
  topology: design work), and tail borders whose vertices die or appear (16600 on def).
- **Verdict:** 3 ms on def is reachable, but only with the design step: records placed by the vertex shader
  for every part, plus a fixed band topology. The floor is about 2.7 ms (tangents + end solves) plus z.
  The CPU port alone tops out near 140 ms.

**Next stage:**
1. Vertex-shader placement of the fill records from `BandGpu.chainTex`, with a per-chain tangent and κ
   texture; the reply carries only the moved ends.
2. Find the between-vertex cracks before the census can pass.
3. Then port borders and z, give the band a fixed topology, and seed the end solves from the last frame's
   hints.
