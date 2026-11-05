# Thread-geometry review (Levi, 2026-11-04)

One stage, read-only: a written assessment, no code changes. Started by claude session
7301c55b-f743-4e00-a519-883d9aaaaa7c (the coordinator), which files the ledger item once
Muse's batch 16 leaves the checkout.

## Why

Levi, 2026-11-04, verbatim:

> K1163: Some of these do have a bit of an awkward concave butt cusp. Smoother is better.
>
> But, in general, I wonder if it's worth taking a step back and reconsidering our overall
> approach to creating, representing, drawing, and updating threads, their bodies, and their
> edge curves. It seems like we pretty easily were able to create the underlying knot-path and
> physics pull systems. It still seems like we're struggling more than we should be at
> creating rounded corners around junctions and at keeping junctions smooth. And also gaps
> have been somewhat of a struggle to get right.
>
> I'm wondering if something like the following might be a better approach.
>
> - Keep our underlying thread and physics systems.
> - Create a new system (or adapt the old) for carefully smoothing and rounding out juntion
>   thread-edge geometry.
> - Then, treat this thread-edge geometry like a soft-body simulation, with skin (edges) bound
>   to the underlying skeleton (thread centers).
>
> Maybe this is a terrible idea, and wouldn't actually work. But please consider if any part
> of it actually makes sense and is worth trying.

K1163 is `docs/asks/K1163.md`: Levi was asked whether to keep a guard that leaves ten
near-straight junction corners up to 1 px tighter than before the junction rework (options:
keep, exact, softer). Levi's answer above rules out keep. Its sheet is
`.claude/probes/K1040/s1/out/s1i/sheet.png` (5600x4662); the per-row images beside it
(`NN_*_z1.png`, `NN_*_z4.png`) are easier to look at. Each row shows one corner before the
junction rework, today, and restored; rows 06-15 are the question's corners. Design:
`docs/design/K1114_s1i_rounding.md`.

## What to produce

`.claude/probes/geometry_review/review.md`, with any crops you make in `img/` beside it, in
this order:

1. **For Levi** (at most one screen, plain words, no jargon): your recommendation and why,
   which parts of Levi's idea hold up, and what you would try first. Name a crop here when a
   picture makes the point.
2. **Today's construction** (about a page): how a thread's body, its edges, a junction's
   outline and rounds, and a crossing's gap are made today. What is mesh and what is per
   pixel, what state carries between frames, and where a discrete choice is made each frame
   (a max, a nearest, a gate). Give file and function names.
3. **The record**: the junction-rounding, junction-smoothness and gap work so far (K4, K81,
   K320, K922, K992, K1040 and its stages, K1114, K1139, K1163, and the gap items you find).
   What broke, what fixed it, and how many stages and commits it took, grouped by root
   cause. Is the struggle inherent to the problem, or to how today's construction splits it?
4. **K1163**: which rows show the concave cusp Levi saw (crop the z4 images and look; name
   the rows), what in the construction makes it, and whether the card's "softer" option
   would remove it inside today's approach, with a rough size.
5. **Levi's idea, part by part**: (a) keep the threads and physics; (b) a dedicated system
   that builds smooth, rounded junction edge geometry; (c) that edge geometry as a soft-body
   skin bound to the thread centres. For each: what it fixes from section 3, and what it
   breaks or costs. Consider arms swinging far from rest under a tug, material sliding
   through crossings, gaps that migrate, junction topology, and CPU: physics is about 12 ms
   a frame mid-drag on desktop, and the phone is slower. Give the simplest variant that
   keeps each part's benefit.
6. **Alternatives**, compared with (c) and with a cleaned-up version of today's approach. At
   least: an outline computed per pixel from the skeleton each frame (for example an n-ary
   smooth union of a junction's arms for its rounds, with gaps taken from the over-thread's
   distance); and parameters bound at rest but evaluated per frame (choices fixed at rest or
   held with hysteresis, the shape recomputed). `docs/design/G3G4_sdf_geometry.md` already
   plans SDF geometry: say what it covers, how far it got, and how it relates. End with a
   recommendation.
7. **The first test**: one small spike, before any rebuild, that would show whether the
   recommended direction is worth it, and its size in stages. Give numeric pass criteria:
   no concave cusp (the outline's curvature keeps one sign inside a round), G1 where pieces
   meet, stable under a scripted tug, and its cost per frame.

## How to work

- Start with `.claude/rules/render.md` and the render topic files it lists (`render-ribbon.md`,
  `render-gaps.md`, `render-shaders.md`, `render-routes.md`, `render-paint.md`). Then read
  the design docs: `docs/design/K1040_junction_field.md`, `K1114_s1i_rounding.md`,
  `K992_corner_rules.md`, `K922_junction_extent.md`, `K81.md`, `K1139_pulse_junctions.md`,
  `G3G4_sdf_geometry.md` and `G2_shader_paint.md`. Skim them: summaries, status and decision
  sections first, then only the parts you need.
- The ledger: `node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs show <ID>...
  --repo C:\Users\lsl\Repositories\knotmaze`, and `section <name>` for a section; never read
  a whole `LEDGER.md`. History: `docs/history.md` is large, so search it, and use
  `git log --oneline --grep=<ID>`.
- **Muse is working in this checkout** (run 16B, K1139 S3b, the fan shader). Its uncommitted
  edits are in `src/render/` (junction_field.ts, junction_routes.ts, arm_strip.ts,
  ribbon/joinery.ts, ribbon/ribbon_sdf.ts, ribbon/ribbon_shader.ts, paint_glsl.ts and
  others). Read the committed code with
  `git -C C:\Users\lsl\Repositories\knotmaze show HEAD:<path>`, and look at the diff only to
  know what is in flight.
- **Read-only.** No edits to tracked files, no commits, no ledger edits, and no `git` command
  that writes (checkout, stash, reset, add, fetch). Write only under
  `.claude/probes/geometry_review/`.
- **No load on this machine**: no builds, `npm test`, dev servers, browsers, phone or
  timing, because Muse is measuring here. A short Node math script (under a minute) is fine
  when `$env:TEMP\claude-perf.lock` does not exist.
- Read code and docs through the shell (`Select-String`, ranges of `Get-Content`,
  `git show`). Use the Read tool only to look at images. Crop with System.Drawing in
  PowerShell.
- No IP addresses, serials or device names in anything you write.
- No helpers.

## Stop rule

Stop when review.md is complete or at 2 hours of wall-clock time, whichever comes first:
run `Get-Date` now and at each section. At the cap, write what you have, mark what is
missing, and stop. A compaction is not a stop; after one, re-read this brief and review.md.

Final report (at most 25 lines): the recommendation in two sentences; the K1163 finding
(rows, cause, and whether the softer option fixes it); the first test and its size; and a
`Ledger items` list (items to file, one line each).
