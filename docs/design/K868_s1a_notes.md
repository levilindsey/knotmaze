# K868 S1a working notes (scene export)

Working notes for the S1a agent (brief: `K868_s1a_scene_export.md`).
Re-read this file and the brief after a compaction, not the sources.
Line numbers are at e3190f77.

## Centreline source

- Both render paths draw `renderer.chainSamples[c]` (`ribbon_renderer.ts`
  update(), 1799-1863: sampleClosedSpline / sampleOpenSpline of
  `chainControls[c]`, then the fused-tip tuck).
  - Strips (`ribbon/strip_pass.ts` extrude): positions + tangents at
    `style.threadWidth / 2` x the taper multiplier. Joins past 90 deg are
    round; the concave side is clamped to the turn radius (min 0.3h).
  - SDF (`rp=sdf`): SAMP = `chainSamples[c].positions` exactly, RADII =
    fround(h * widthMul). Same samples as the strips.
- Spacing: SAMPLE_SPACING 0.09 world, MIN_SAMPLES 48. Closed: sample k at
  k/count * total (count segments). Open: k/(count-1) * total.
  Spacing in px = 0.09 * pxPerUnit.
- The tuck (`strip_pass.ts` tuck, 101-161; fused tips, `chainTipFused`):
  trim = min(0.75h, total/4), arcPer = total/(count-1). Start: samples
  [0, min(count-1, ceil(trim/arcPer))) := sampleAt(trim). End: samples
  [max(1, count-ceil(trim/arcPer)), count) := sampleAt(total-trim).
  Exact duplicate points. The export dedupes them (keep k when its
  position differs from the last kept one).
- Open chains: `chainBreakAfter = len-1` (particle_system 659-661), so
  slot order = traversal order = arc direction; dir +1 = toward larger s.

## h and W

- h = `style.threadWidth / 2`; style.threadWidth = params.threadWidth
  (`src/app/scene.ts` 376). casingWidth = tw + 2 * gap.
- W = `borderWidth * h` (bdw, default 0.38): the stroke is
  `smoothstep(1-bdw, 1-bdw+fwA, eAcross)` in across-units of h.
- Discrepancy (ledger): joinery's fan band uses
  `borderWidth * casingWidth / 2`, wider than the ribbon's whenever gap > 0.

## z

- Physics: `ps.zPos` per particle. Tent from REGISTERED crossings only,
  at the binding `pass.ctrl` (not displayF), window DEPTH_WINDOW 1.4 ctrl,
  amp = tw * 1.16 (COLLISION_MARGIN 1.16 x DEPTH_AMP_FACTOR 1.0),
  contributions summed then clamped to +-amp; zPos eases toward it at
  Z_EASE 0.2 per substep, and collision z-pushes come after
  (particle_system addDepthTent 1961-1988, 2382-2450). So zPos != tent.
- Export: zPos interpolated onto the samples by ctrl arc (slot arcs =
  `chainSamples[c].controlArcLengths`), tucked samples at their tucked arc.
  Diag: the tent recomputed and its max |z - tent|.

## Crossings

- Registered: the renderer's passes (`ctrl`, `displayF`); render at
  `renderCtrl = displayF ?? ctrl`. Ctrl -> arc: arcAt (closed),
  paintArcAt (open). Arc -> export s: through the deduped polyline.
- Emergent: `ps.emergentCrossings` ({over, under}); the renderer skips
  `isJointPair(over, under, r.junctionArcCtrls, chainLen, closed)` pairs
  when `r.skipJointPairs`. Exported with `emergent: true`.

## Junctions, arms, ends

- `renderer.junctionArms[i] = {particles, arms: [{chain, slot, dir}]}`;
  `junctionArcCtrls` (Map chain -> [{ctrl, jn}]); `freeTips`;
  `fusedTips`; private `chainTipFused`, `cornerCandidates`,
  `cornerRounded`, `junctionCornerPins`, `cornerRoundShareValue`;
  `cornerWedgeRounded(jn, a, b)` (821-826); `ribbon/corner_share.ts`
  (cornerWedgeKey).
- Junction centre: joinery's (rebuildFillets): the mean over arms of
  `sampleAtSafe(paintArcAt(slot))` on the drawn (tucked) samples. Diag:
  its distance from the particle mean. Arm s: through = polyline s at the
  slot's arc; END = 0 (dir +1) or total (dir -1). Sort by atan2 of
  sampleAtSafe(arc at slot + dir * 0.8 ctrl) - c (joinery's probe; it
  drops arms whose probe is < 0.15 from c: counted in the diag).
- Corner key: `cornerWedgeKey(jn, a, b)` for consecutive arms in the
  export's order (wrap included). Candidates are built once at scene
  build from PHYSICS directions, so an export order that differs shows
  up as a missing key (diag `cornerKeysMissing`).
- Corners: round when there are no candidates or cornerRounded has the
  key; pinned when junctionCornerPins has it (K830 pins first, then crs).

## Hooks

- `__knotView()` {x, y, s}: world -> CSS [s, 0, 0, s, x, y]; pxPerUnit = s.
- `__knotStepUntil(t)`, `__knotPhysFreeze(bool)`,
  `__knotPhysDump({arrays})` {gen, simTime, n, c, kind, hashes, ...},
  `__knotRenderer()`, `__knotPS()`, `__knotParams()`,
  `__knotLoop({continuous: true})`.
- New: `__knotSceneExport({withDiag})` -> FieldScene (or {scene, diag}).
- Screenshots: `page.screenshot({clip})` (drawImage of the WebGL canvas
  reads blank). Wheel zoom: WheelEvent deltaY +-120 at the target until
  |s - target| / target < 0.005 (`.claude/probes/K862/fbd_shot.mjs`).
