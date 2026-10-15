---
paths:
  - "src/physics/**"
  - "test/physics/**"
  - "test/*.regression.test.ts"
  - "test/sweep.manual.test.ts"
---

# Physics lore

Binding lore for the particle system, moved verbatim from CLAUDE.md by
K45 (2026-10-12). A passage taken from inside a longer entry is labeled
with its source; the narrative and measurements around it are in
`docs/history.md`. Elsewhere: the knot-mode byte-identity rule is in
CLAUDE.md, probe and census methods in `probes.md` and
`probes-census.md`, render-side lessons in `render.md` and
`render-ribbon.md`. Add new physics lore to its topic file (listed at
the end), not to CLAUDE.md.

## Architecture and tooling

- `test/sweep.manual.test.ts` was reviewed and KEPT (2026-07-24): a
  skip-gated (`SWEEP=1`), asserts-nothing node-side census of crossing
  quality across seeds — zero CI cost, self-labeled "not a regression
  gate." If it ever breaks against a `ParticleSystem` API change,
  delete it rather than fix it.

**CANDIDATE perf follow-up — move the sim to a Web Worker (NOT taken;
recorded 2026-07-24).** The one multi-threading win with a good
risk/reward, if mid-drag perf ever needs it (currently ~32fps mid-drag
is playable; at rest the sleep gate makes it moot). Mid-drag the main
thread runs physics (~15.8ms) THEN render (~10ms) serially → ~25ms. The
render only needs a positions snapshot, so relocating the whole
(still single-threaded) `ParticleSystem` into a dedicated worker
overlaps them → frame ≈ max(15.8, 10) ≈ 15.8ms, potentially 60fps
mid-drag, with the physics NUMERICS UNCHANGED (the sim just moves
threads; it is not re-ordered). Good fit already: `positions`/`zPos`
are `Float32Array`, so a `SharedArrayBuffer` backs them zero-copy for
the render read. Costs: (1) COOP/COEP cross-origin-isolation headers
for SAB (Vite dev config + a Cloudflare `_headers` file); (2)
marshaling grab/dragTo/release to the worker and sharing the extra
per-crossing render state (displayF, over/under, emergent crossings),
not just positions; (3) THE REAL TAX — the diagnostic harness
(`window.__knotPoint`/`__knotRenderer`, the sim/wall build-stamp
counters, the `diag_*` probes) reaches SYNCHRONOUSLY into
`ParticleSystem` from the main thread and is load-bearing per the
verification lore; it needs an async/shared-memory bridge. Architecture-
change-sized; rank it BELOW P4 unless drag perf actually bothers you on
target hardware. DO NOT instead parallelize the SOLVER: it is
Gauss-Seidel PBD (each constraint reads the prior one's writes — the
P3.26 double-sweep exists for exactly this reason); coloring it into
independent sets changes the numerics and would perturb the hard-won
equilibria, for a payoff only on the ~7ms collision slice. WebGPU
compute (particle count too small — dispatch overhead eats it) and WASM
threads (same SAB+coloring cost plus a language rewrite) are both ruled
out at this scale; single-threaded WASM for just the collision
narrow-phase is a separate non-threading raw-speed lever (2–4× on that
~7ms) if ever wanted.

## Where the rest of the physics lore lives

K173 (2026-10-14) moved each topic to a file that attaches only with the
files it is about; `docs/lore_index.md` lists every rules file and its paths.
- `physics-sleep.md`: the sleep gate (K63)
- `physics-settle.md`: the load settle (K147)
- `physics-kinks.md`: kink eyes (KINK EYES, K41)
- `physics-fabric.md`: fabric and open-chain mechanisms (P4)
- `physics-collision.md`: the P3 saga (contacts, collision, invariants, lessons) and the loud attractor (K13)
