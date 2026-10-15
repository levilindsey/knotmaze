---
paths:
  - "src/geometry/**"
  - "test/geometry/**"
---

# Generation lore: the splines (Layer 2)

Moved verbatim from `generation.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `generation.md` lists the area's other files.

- *K90 (2026-10-14), the bend bound:* a Catmull-Rom through the particles
  turns at least twice as tight as their polyline at every corner
  (r / R_poly = cos(φ/2) / 2 at the vertex), which is where ribbons fold
  over themselves; a B-spline reaches only 0.78 h at the particle floor's
  limit. `boundBend` (spline_generator.ts) relaxes the RESAMPLED samples
  wherever they turn tighter than 1.2 half-widths: in both samplers, after
  resampling and before the tangents; one-sided, each sample capped at
  0.5 h from the spline, 3 passes, loops over 200° skipped. It is OFF by
  default and switched only by `window.__knotSplineBend(on?, opts?)`,
  never a link. Render-only: nothing in the physics imports
  spline_generator, so the golden cannot move; the ribbons, gaps, webs,
  plucks and sample hit-tests see the moved samples. `controlArcLengths`
  is not updated for them. Flag off is byte-identical. The census
  (`scripts/fold_census.ts`, `K90_VARIANTS=on:<ratio>:<maxShift>[:<marginMax>[:<passes>]]`)
  counts folds under a junction web (within 0.92 h of a fused-junction
  center) as holder `web`. The hard per-sample clamp can make a scan's
  tightest window tighter (24 of 585 scans in census r3);
  `splineBend.soft` (default false; census variant `soft:`) scales each
  run's whole relaxation back instead, which cut that to 4. Record:
  `docs/design/K90_bend_radius.md`.
