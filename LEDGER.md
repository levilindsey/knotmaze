# Knotmaze ledger

The to-do surface for work that isn't done yet: follow-ups, known
residuals, decisions waiting on Levi, and ideas. Claude Code sessions and
their agents keep it current (the convention lives in claude-config,
`rules/ledger.md`). Add an item the moment something is deferred,
proposed, or left over. Close it by moving it to **Done** with the commit
that resolved it. The daily transcript audit reconciles against this file.

History, measurements and lore stay in `CLAUDE.md` and the commit
messages; design documents are in `docs/design/`. IDs are stable (`K<n>`)
and never reused.

## Waiting on Levi

(nothing right now)

## In progress

- **K1** · GPU migration G1: per-pixel crossing gaps. The agent is
  rebasing, fixing residuals 1-3 (cyclic triangles, concave crease,
  merge-core hairline), cutting the GPU cost (2.83 vs 0.82 ms/frame at
  3200x1800), and targeting Android. History: CLAUDE.md "PER-PIXEL
  CROSSING GAPS".
- **K2** · Kink loops squished shut (Levi's report: crossing 305 at
  `?k88dtb.oHFEfg`, eye held at the 3.2-ctrl floor). Agent: a
  rate-limited material-budget ratchet, sized by an eye-hole census.
- **K3** · Render-only plucks plus a physics-off mode (settle, stop
  simulating, then the appear animation; pluck only, no tug). Agent.

## Next, in order

- **K4** · G2: all per-sample color work moves into shaders
  (`docs/design/G2_shader_paint.md`). Defaults taken unless Levi objects:
  the trail fade becomes the intended linear fade over the oldest 30%;
  burn also applies to single-color threads; noise colors stick to the
  material; the ink spread is computed from reveal-start positions.
  Ink + burn and knot-mode FX stay off.
- **K5** · Split `main.ts` and `ribbon_renderer.ts` along the new data
  lines, once K1-K3 land.
- **K6** · One frame loop driven by what-changed flags (after K5).
- **K7** · Physics in a Web Worker, with render-side interpolation between
  physics steps (after K6). Smooths the UI; it does not speed up physics.
- **K8** · G3: SDF ribbons drawn from one shared sample texture
  (`docs/design/G3G4_sdf_geometry.md`). Defaults: tight folds render as
  filled lobes, anchored tails keep flat caps, phones stay at a 2x
  resolution cap.
- **K9** · G4: smooth-union SDF junction webs (cuspRadius = blend
  radius); A/B crops at cr 1, 3, 6 before the fans are deleted.
- **K10** · Phone benchmark after every stage. Baseline (Pixel 11, Chrome
  154, 2026-10-11, default maze settled): 30 fps at rest with defaults,
  51 fps with `fw=0`. Flow at rest halves the frame rate today.

## Residuals (known, not fixed)

- **K11** · Ring + gridAlign: buckles lopsided below strength ~1.8e-3,
  wanders without sleeping at 5e-4..1.6e-3, never sleeps at ga=1.
- **K12** · Star shape, e-w anchors: 6/8 seeds sleep; 2 hover at the
  threshold.
- **K13** · Post-violent-play loud attractor at fat params (the open P3
  problem; fingerprint in CLAUDE.md Follow-ups).
- **K14** · Latent seam-window wraps on open chains
  (applyTransversality's window, the slide/project windows,
  updatePassCover's +-12 slots): agent-measured, unfixed.
- **K15** · During a reveal, a joint's fan can turn opaque while a fill
  beside it is still striped (K4 fixes it by construction).
- **K16** · Physics settle is slow: 100-190 ms/frame at gs 18 on a loaded
  desktop; on the phone 7 sim-seconds took 14 s. K6/K7 fix the UI side.
- **K17** · Deep URLs such as `levi.dev/knotmaze/foo/bar` fail (the SPA
  fallback serves the page under the wrong relative base). Fix: ship a
  `404.html` so unknown paths 404.
- **K18** · vitest rewrites the byte-identity snapshot's line endings on
  Windows (reverted by hand each run). Fix with `.gitattributes`.

## Ideas (not scheduled)

- **K19** · More maze stats: elapsed/solve time, efficiency %, junctions
  visited, dead ends entered.
- **K20** · Daily seed (Wordle-style shared maze with time-to-solve
  sharing); serialize the remaining MazeParams.
- **K21** · Textured page background (the render side is ready since
  Stage 18; needs art).
- **K22** · Dynamic resolution scaler (2x up to 3x when frame time
  allows), after G3.
- **K23** · GPU particles (G2.4), GPU fog-of-war accumulation, the yarn as
  a gap-masked ribbon (G3-5).
- **K24** · Render on demand when the scene is fully static (battery).

## Done

(items move here with the commit that resolved them)
