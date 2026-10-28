# K78 plan: the Knotmaze handbook (write after the churn)

Levi, 2026-10-12: "After making all other updates and polish changes to
the app, I'd love for us to create a detailed doc that explains all of
the algorithms, architecture, and design decisions and trade-offs we've
used in our app--this doc would also need to describe in detail each
control param and the implications it has on the generated maze. I'd
love for you to make notes for and plan this doc, but we don't need to
make it until we're done with all the churn." Levi also noted that the
half-lattice units "would be more clear with a diagram, or annotated
screenshot".

## Levi's answers (2026-10-13)

"Public. Markdown is fine--eventually this will likely also be
published as a post on my Blogger devlog at devlog.levi.dev."

- **Audience: public.** Write for a curious outside reader: explain the
  math, and keep history only where it explains a decision.
- **Format: Markdown** (`docs/handbook.md`, never imported into
  CLAUDE.md), written to survive the move to a Blogger post: figures are
  standalone images (PNG or SVG, with alt text and captions), and the
  text has no repo-relative links and no internal IDs (K-numbers, stage
  names), so nothing needs the repo to make sense. No interactive
  figures.

## Outline

1. **What Knotmaze is.** The three layers (combinatorial, geometric,
   dynamic) and the core insight: the threads ARE the maze paths.
2. **Generation.**
   - Lattice growth (weaveDensity, turnBias).
   - The tangle graph and its invariants (alternation, strands).
   - Shapes and masks.
   - Units: the lattice, the DOUBLED lattice (half cells), ctrl and arc.
     This needs the annotated diagram.
   - Splines.
3. **Maze formulation.**
   - The plan's vocabulary: splices (the H shape), 4-way merges, the
     connect-everything backbone, choice junctions, the spacing floor,
     clearances, corner cuts with decoy trims, long dead ends.
   - Graph surgery.
   - The walk graph: runs, lattice lengths, Dijkstra, optimal.
   - Fold in K74's findings and whatever K74's changes ship.
4. **Gameplay.** Branch-point taps, backtracking, the pathViz modes,
   fog of war, the K76 reveal mode, stats, the daily (definitions,
   calendar, records, attempts, share).
5. **Physics.**
   - Verlet/PBD chains.
   - Sliding crossing bindings, static and kinetic friction.
   - Quasi-3D depth and capsule collision.
   - Kink eyes.
   - Junction fusion and cover.
   - The sim-time sleep gate.
   - Physics-off mode.
   - The invariants learned the hard way.
6. **Rendering.**
   - Ribbon meshes.
   - Per-pixel crossing gaps (casing masks, protect, smooth-min).
   - Shader paint: section colors, the reveal and its FX, gameplay paint.
   - Junction webs (arm strips, later G4).
   - Render-only plucks.
   - Backgrounds, fog, yarn, markers, the camera.
7. **Audio.** Pitch space, the harp voice, songs, the autoplay gate.
8. **Links and state.** URL-as-complete-state, the compact codec and its
   versioning rules, legacy links, daily pinning.
9. **Performance.** Desktop and phone budgets, the measurement rules
   (perf lock, same-state A/B), and the open levers (K5-K7, K22, K24).
10. **Parameter reference.** Every panel param, grouped by folder:
    - key and short key, range, default;
    - what it does, its maze, visual and perf implications;
    - its interactions (for example, junctionSpacing saturating
      branchDensity and fourWayFraction, K62);
    - a small image sweep for the params that shape the maze.
11. **Design decisions and trade-offs.** Each decision with the
    alternatives tried and why they lost:
    - braided by default;
    - per-pixel gaps vs the erase grid;
    - render-only plucks;
    - a screen-fixed background;
    - daily pinning;
    - a 2.5 s sleep window;
    - the GPU migration order.
12. **Glossary.** ctrl, arc, run, junction, splice, merge, kink, eye,
    rider, casing, slot, lobe, strip, and more.

## Figures to make

- **Units.** A settled maze with the lattice grid overlaid (the debug
  renderer draws it), cell and half-cell rulers, and junctionSpacing and
  clearance radii drawn to scale.
- **Plan vocabulary.** Splice (H) anatomy, a 4-way merge, a corner cut
  with its decoy trim, a long dead-end thread.
- **Physics.** A crossing binding with its depth tents, and a kink eye
  with its ratchet and pressure.
- **Rendering.** A casing mask at a crossing (over silhouette, margin,
  fade), and the pluck time exposure.
- **The codec bitstream**, and the daily routing as a small state
  machine.
- **Param sweeps** for gridSize, weaveDensity, turnBias, junctionSpacing,
  the clearances, deadEnds and cuspRadius.

## Sources and production

- Sources: CLAUDE.md, `.claude/rules/*.md`, `docs/history.md`,
  `docs/design/*`, commit messages, and the LEDGER's Done section.
- Figures come from probes: headed real-time captures, pinned clocks,
  and `__knot*` hooks for overlays. The sweeps use the vite-node harness
  (`.claude/probes/K46`, `K74`).
- Write it as one agent per part, with a final pass for consistency.
  Verify every number against the code or a measurement; never against
  memory.
