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
