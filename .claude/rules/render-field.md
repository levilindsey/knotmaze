---
paths:
  - "src/render/field/**"
  - "test/render/field/**"
---

# Render lore: the field (K868, K1040)

The field scene, form B, the CPU oracle and the label pass
(`src/render/field/`). New in K1183 (2026-11-04), so that a session
opening a field file gets the field's own grammar, not only the
general rendering lore; `render.md` lists the area's other files.
Every claim below is distilled from the design doc or code header
named beside it, for the built code only: the K1179 geometry review's
open questions are not settled here.

## The scene format

- The scene format is version 1 (`SCENE_VERSION = 1` in
  `scene.ts`). Either stage may append OPTIONAL fields (with a
  comment saying who fills them); changing a required field bumps
  `SCENE_VERSION` (`scene.ts` header).
- A scene is everything the border look needs to draw one frame, in
  world units: each chain's centreline as the renderer samples it,
  with tent depth per sample; the crossing table; the junctions and
  their arms; the dead ends; the camera and the look (`scene.ts`
  header; `docs/design/K868_field_border.md` section 4).
- Arc length `s` is measured along the polyline through a chain's
  samples, from its first sample; a closed chain includes the
  closing segment and `s` wraps at its total length (`scene.ts`
  header).

## Form B

- Form B is the junction look's definition (F2 of
  `docs/design/K1040_junction_field.md`), evaluated in float64 on
  the CPU. It is a pure function of the frame (a `FieldScene`): no
  state between frames, no march, no walk with a step (`form_b.ts`
  header).
- Nothing in the app imports form B. Only the folder's own
  `label_b.ts` and `label_b_verdict.ts` do (`form_b.ts` header).
  The rest of the folder is imported: `oracle`, `geom` and
  `scene_export*` are imported by `src/render/label/` and
  `probe_hooks.ts` (their import sites).
- Per frame form B builds: chains with END arms extended to c-prime,
  the pinned-hat depth per sample (`depth.ts`), groups (junction
  clusters joined by a run with no crossing), each arm's span
  [root, cap] with its cap as a min over a fixed candidate set, and
  one corner per cyclically adjacent arm pair (`form_b.ts` header).

## The oracle and its checks

- The oracle reads only a `FieldScene` and shares no code with the
  app's renderer (`oracle.ts` header; `geom.ts` header: pure
  TypeScript, no DOM, no pixi).
- The oracle owns its exposed outline: primitives (offset segments,
  join and cap arcs, corner arcs), each with the parameter intervals
  on which a point just outward lies outside the rest of its
  surface; distances to exposed intervals are exact (point to
  segment, point to arc) (`oracle.ts` header;
  `docs/design/K868_field_border.md` sections 3.5 and 5).
- The checks are pure TS over that geometry: geometry comes from the
  oracle's model, ink from an `InkProbe`, so the same check runs on
  the oracle's own field and on any image (`checks.ts` header). The
  check list and its pass marks are `docs/design/K868_field_border.md`
  section 6 (checks 1-9 and 11 in `checks.ts`).

## The label pass

- The label pass draws form B's top surface per pixel with its own
  targets: L (R32UI, the packed word, 0 = paper), D
  (DEPTH_COMPONENT32F) and, debug only, G (RGBA32F) (`label_b_pass.ts`
  header; the word's layout is `label_b.ts`'s header).
- Its modes are `capsule`, `tent` (K1040 S3c) and `tentv` (K1040
  S3d), with the `lean` option (K1040 S3e) over any mode; the default
  pass is unchanged by it (`label_b_pass.ts` header).
- The pass queries no GL state; after it draws, the host (the
  renderer sharing the context) takes the state back
  (`label_b_pass.ts` header; `label_b_host.ts` header).

## Scenes and gates

- Real scenes are exported from the app with
  `window.__knotSceneExport` and `scripts/export_scene.mjs`;
  synthetic scenes are built in `test/render/field/scenes/`
  (`docs/design/K868_field_border.md` section 4; `scene.ts` header).
- The scene export's page side is read-only: it writes nothing the
  frame reads, so the byte-identity golden cannot move
  (`scene_export_hook.ts` header). Every number the export decides
  is in the pure `buildFieldScene` (`scene_export.ts` header).
- The gates over this code are its tests under
  `test/render/field/` (the form B, oracle, label and scene-export
  pins there) and the checks of the K868 section 6 table above.
