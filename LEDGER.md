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

- **K25** · Pluck size default. At today's defaults the median tapped
  lobe swings at the amplitude floor (0.45 x the thread's half-width),
  which is subtle at default zoom; `psz` 1.5-2 reads better. K3 has
  merged (df373b5), so changing pluckSize's default now means a codec
  version bump (cheap).
- **K28** · Intro vs physics settle. The intro runs over a settling sim,
  so its frame rate follows physics (5 fps measured on a desktop loaded
  by parallel agents; the phone settles at half real time). Options:
  (a) settle first behind the physics-off loader, then play the intro on
  the settled layout at full frame rate, then live physics - smooth, but
  every rebuild waits ~5 s on desktop, longer on a phone; (b) keep it
  until K7, whose worker lets the intro run at full frame rate WHILE
  physics settles, with no wait. Recommendation: (b), unless the interim
  smoothness is worth the wait.

## In progress

- **K1** · GPU migration G1: per-pixel crossing gaps. The agent is
  rebasing, fixing residuals 1-3 (cyclic triangles, concave crease,
  merge-core hairline), cutting the GPU cost (2.83 vs 0.82 ms/frame at
  3200x1800), and targeting Android. History: CLAUDE.md "PER-PIXEL
  CROSSING GAPS".
- **K2** · Kink loops squished shut (Levi's report: crossing 305 at
  `?k88dtb.oHFEfg`, eye held at the 3.2-ctrl floor). Agent: a
  rate-limited material-budget ratchet, sized by an eye-hole census.

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
- **K18** · vitest rewrites the byte-identity snapshot's line endings on
  Windows (reverted by hand each run). Fix with `.gitattributes`.
- **K26** · Plucks at tight loops, seen zoomed in. Only the concave side
  of the swing is capped, so the time exposure leans outward and a loop's
  eye gets a slightly ragged, enlarged rim during the ring. A symmetric
  cap fixed the eye but carved every hook's outer blur into lumps at
  normal zoom, so it was rejected.
- **K27** · Plucks near junctions. Lobes inside a junction's fillet-web
  footprint (about 1 world at cr 3) keep their base intact, so they ring
  as a crisp thread with a halo rather than a blur, as crossing
  footprints already do.

## Approved, to schedule (2026-10-11)

- **K19** · More maze stats in the HUD: solve time, efficiency %,
  junctions visited, dead ends entered.
- **K20** · Daily seed: a Wordle-style shared daily maze, with each day's
  play recorded in localStorage (stats and per-day history) and
  time-to-solve sharing. Also serialize the remaining MazeParams.
- **K21** · Shader backgrounds: research noise-based effects, implement
  several that never distract (low contrast; colors from the design's
  gamut), selectable from a dropdown. Draw them as the first layer of the
  main canvas once K1 lands (per-pixel gaps no longer erase what is
  beneath); run at reduced resolution and frame rate.
- **K22** · Dynamic resolution scaler (2x up to 3x when frame time
  allows; down when struggling). Part of K6, refined after G3.
- **K23** · GPU particles (G2.4), GPU fog-of-war accumulation, the yarn as
  a gap-masked ribbon (G3-5).
- **K24** · Render on demand when the scene is fully static (battery);
  part of K6. An animated background (K21) must not defeat it.

## Done

(items move here with the commit that resolved them)

- **K3** · Render-only plucks plus a physics-off mode (settle, stop
  simulating, then the appear animation; pluck only, no tug). Done in
  df373b5.
- **K17** · Deep URLs such as `levi.dev/knotmaze/foo/bar` failed (the SPA
  fallback served the page under the wrong relative base). Done in the
  commit that moved this item here: `public/404.html` turns off Pages'
  SPA fallback and sends any unknown path to the app root, keeping the
  link's token.
