# K115 glyphs: a crossings-only cursive for titles and words

Stage 8 design (2026-10-19). Brief: `docs/design/K115_stage8.md`.
Evidence: `.claude/probes/K115/stage8/` (untracked: the harness, its
outputs, the shots). Status: WORK IN PROGRESS (skeleton committed first so
nothing is lost to a compaction).

## 1. Defect attribution

(pending: discontinuity, sharp angles, jitter; graph / spline / render
evidence per class; each stage-8 hypothesis confirmed or rejected)

## 2. Junction census by construct

(pending: every JUNCTION and END by cause, per scene)

## 3. Representation

(pending: cubic Beziers, integer control points on a finer grid, G1 joints,
K108-exact evaluation, fixed-parameter evaluation, arc length by fixed
sampling)

## 4. Joins

(pending: entry/exit per glyph as a point plus a tangent class; one G1
connector per class pair; the ligature table; capitals and Greek)

## 5. Crossings only

(pending: every meeting a proper X; retrace -> loop; T-meet -> crossing to a
free END or separated strokes; ENDs enumerated per glyph)

## 6. Floating strokes as separate strands

(pending: walk graph, forced title walk, stats, fog, reveal; the dot)

## 7. Pen order

(pending: K558's key)

## 8. Constraints with numbers

(pending: ribbon width, clearance, crossing angle, the physics constants that
do or do not bind a pinned word, bend radius, the x-height floor and the
Daily #8 fit at gs 6 / 12 / 18)

## 9. Layer 2 sampling spec

(pending)

## 10. Named cases

(pending: final sigma, digit 6, '#', the K555 joins, CAPITAL_OVERRIDES,
accents as floating strokes, stacked marks, same-slash crossings)

## 11. Calls for Levi

(pending: dots; lifted-pen strokes not walkable; looped vs unlooped hand; the
x-height floor; Hershey replaced or kept as fallback)

## 12. Kill criteria

(pending)
