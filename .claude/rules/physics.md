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

**THE PHYSICS WORKER (K7, built 2026-10-14..15; the CANDIDATE perf
follow-up recorded 2026-07-24).** The sim runs in a Web Worker behind
`phw` (ON by default since stage 6, call F6 of 2026-10-15, though stage 5's
phone pass missed the start gate, see `physics-worker.md`'s Measured;
`&phw=0` is the in-thread host): `physics-worker.md` is its lore (the
hosts, the mirror, the clock, the fallback, the invariants) and
`docs/design/K7_worker.md` its design, measurements and stage handoffs.
The candidate's costs were superseded: no SharedArrayBuffer and no
COOP/COEP (transferred snapshots cost under 0.1 ms a frame), and the
diagnostic harness reaches the worker through the probe bridge
(`probes.md`, the K7 stage 4 entry). Still binding from the candidate:
DO NOT parallelize the SOLVER: it is Gauss-Seidel PBD (each constraint
reads the prior one's writes — the P3.26 double-sweep exists for exactly
this reason); coloring it into independent sets changes the numerics
and would perturb the hard-won equilibria, for a payoff only on the
~7ms collision slice. WebGPU compute (particle count too small —
dispatch overhead eats it) and WASM threads (same SAB+coloring cost plus
a language rewrite) are both ruled out at this scale; single-threaded
WASM for just the collision narrow-phase is a separate non-threading
raw-speed lever (2–4× on that ~7ms) if ever wanted.

## Where the rest of the physics lore lives

K173 (2026-10-14) moved each topic to a file that attaches only with the
files it is about; `docs/lore_index.md` lists every rules file and its paths.
- `physics-sleep.md`: the sleep gate (K63)
- `physics-settle.md`: the load settle (K147)
- `physics-worker.md`: the physics worker (K7): the hosts, the mirror, the clock, the fallback
- `physics-kinks.md`: kink eyes (KINK EYES, K41)
- `physics-fabric.md`: fabric and open-chain mechanisms (P4)
- `physics-collision.md`: the P3 saga (contacts, collision, invariants, lessons) and the loud attractor (K13)
