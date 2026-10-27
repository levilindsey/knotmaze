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
- New (D1, `src/render/field/scene_export_hook.ts`, registered first in
  installProbeHooks): `await __knotSceneExport({name})` -> {scene, diag}.
  Pure part `scene_export.ts` (buildFieldScene), tested in
  `test/render/field/scene_export.test.ts`.
  - Field sources: chains = r.chainSamples (positions, controlArcLengths,
    totalLength, closed) + private chainTipFused; z = dump.zPos lerped by
    ctrl arc; registered crossings = ps.crossings at displayF ?? ctrl;
    emergent = master's own slot list (below); junctions = r.junctionArms;
    corners = private cornerCandidates + cornerRounded; camera = root
    position/scale, app.renderer.resolution, app.screen; look h =
    style.threadWidth/2, band = borderWidth*h, paper = params
    .backgroundBase, ink = params.borderColor ("#000000" = auto ink:
    r.borderColor === 0, the darkened section colour).
  - Emergent slots as renderEmergent (crossing_gaps 1077-1140): skip
    isJointPair when r.skipJointPairs; ps.bindingPoint(em.over) deduped
    within 0.8 of r.diagData (stride 5) and of points already taken; at
    most EMERGENT_POOL (64). The reveal gate is ignored (exports run at
    rest). The hook passes dedupeEmergent:false to the pure part.
  - Open ends: tucked (fused), free (r.freeTips, capped), a junction END
    arm, else anchored (deadEnds offscreen: true, no cap).
  - Hash: hashDump(await host.dump()).all, as the K862 probes read.
- Screenshots: `page.screenshot({clip})` (drawImage of the WebGL canvas
  reads blank). Wheel zoom: WheelEvent deltaY +-120 at the target until
  |s - target| / target < 0.005 (`.claude/probes/K862/fbd_shot.mjs`).

## D2 mechanics (scripts/export_scene.mjs)

- Wheel (`input_pointer.ts` ~482, on app.canvas): unit 16 (deltaMode 1),
  screen height (2), else 1. mouseWheel = deltaMode != 0 || (deltaX == 0
  && integer deltaY && |deltaY| >= 40). ctrlKey or mouseWheel:
  zoomAt(clientX, clientY, exp(-deltaY * unit * (ctrl ? 0.01 : 0.0015)));
  else panBy(-deltaX * unit, -deltaY * unit). So ONE ctrl event with
  deltaY = -100 ln(f) zooms by exactly f at the pointer, and a non-ctrl
  event with deltaX != 0 pans exactly. The export zooms that way, then
  pans the POI to the centre; physics stays frozen (hash re-checked).
- camera.ts: MAX_ZOOM 8; placeWorldAt clamps the scale (camFollow: hi =
  followScale * 4, lo = min(fit, follow) * 0.85; else lo = fit, hi =
  fit * 8); clampView unless free. Check the view holds still after.
- Renderer resolution = min(devicePixelRatio, 2) with autoDensity
  (main.ts 275): at dsf 3 the canvas renders at 2x and is upscaled. The
  export's camera.dpr is the SCREENSHOT's dpr; the diag keeps the
  renderer's (`rendererResolution`).
- Dev server base is "/" (http://127.0.0.1:5341/?...).
- Fillet reach: joinery.ts FILLET_REACH_PER_HALF 1.25, reach = 1.25 * h *
  cuspRadius along each arm; no wedges at cr <= 0.05. The alignment
  excludes max(1.25 cr h, 2h) + 2h around junction centres.
- No cr/crs setter hook (the cr slider calls onSlackChange, crs
  onStyleChange): cr variants are reloads with --expect-hash, and a
  matching hash proves the param is render-only.
- Live variants instead (0ed51f8a): the script types the value into the
  row's `input.tp-txtv_i` and fires "change", then checks
  `__knotParams()`. A row's label text includes the reset glyph (`.kp-reset`
  sits inside `.tp-lblv_l`), so rows are matched on the label's text nodes
  only. Physics stays frozen through it (hash and samples re-checked).

## Findings (2026-10-26, D3-D4)

- Stepping in-thread to simT 40 takes about 97 s (muse). Pass `stb=0`:
  without it K147's settle budget changes the stepping phase, and two loads
  of one link ended at sim 5.000 and 5.008 with different hashes.
- Which params move what (census at simT 5 and 12 on the user link,
  physics hash plus geomHash = sha1 of every chain's closed flag and
  points): cr, fl, gap, crs and tlk change neither (render-only). tw is
  geometry (physics: depth amplitude, collision margin). fw (flow) leaves
  the physics hash alone (equal at fw 0 and .25) but displaces the drawn
  samples every frame: geomHash differs per load and between two exports
  of one frozen page (K75: main.ts re-syncs flowStrength each tick). So
  every export runs at fw=0 (ring, def and fat at their links' fw failed
  the "samples moved during the shot" check); a flowing scene would need
  the flow displacement as an input of its own.
- Live cr 0 against a cr=0 reload (hash 733ee14a both): alignment 201
  rays, max 0.294 vs 0.296 px, mean +0.006. The two masters differ in sha
  because the paint, pulse and background clocks were not pinned (not a
  pixel A/B).
- Alignment maxima so far: muse_hash 0.227 px (54 rays), the tip zoom
  0.250 px (34), cr 0 0.294 px (201). Coverage is low because the
  junction disc (max(1.25 cr h, 2h) + 2h) covers most rays at cr 6; per-arm
  fillet reach would let more in.
- Zooms: one ctrl+wheel event with deltaY = -100 ln(f), then a pan, puts
  the POI at the centre at exactly 6x (s 127.78104927447433 for muse).
- muse_hash: hash 733ee14a at sim 40.01666666666504 (Muse's), geomHash
  12836a3333fb; tw=1.1 clamps to the slider's 0.8, so h 0.4, W 0.152.
- Before the renderer's first update (a short simT right after load) the
  export throws "chains without samples"; the script retries (f82db817).

## Findings (2026-10-26, light paper and wrap-up)

- On dark paper (#151b28, the default) the master's outer edge has no
  contrast and the alignment measures 0 rays. Light-paper reruns
  (`&bg=wash&bgcm=custom&bgc0=e6e9ee`) of ring, def, fat and g41_ring_tw42
  kept their scene's hash and geomHash, so they measure that geometry:
  ring 0.301 px (341 rays), fat 0.301 (1087), g41_ring_tw42 0.147 (1256,
  dsf 3), def 0.509 (560, dsf 1, mean +0.143 px). def again at dsf 3: 0.172
  px (559 rays, mean +0.009). Inferred, not proven: the dsf-1 excess is the
  1x render and its edge measurement. Largest at dpr >= 2: 0.172 px.
- The user link's stepping phase moved between loads, stb=0 on all: the
  dark-paper loads (tw .42, .64) ended at sim 40.00833 (a5f6d198 at tw
  .42), both light-paper loads of tw .42 at 40.01667 (462652e7). So
  `user_tw42.lightpaper` is its own geometry (json and master go
  together), 0.133 px (764 rays). Not diagnosed.
- END terminals (`maxEndTucked`: the drawn, tucked END terminal's distance
  from the nearest through centreline at its junction) sit 0.75-0.77 h off
  it in every scene (0.304 at h 0.4, 0.198 at h 0.26, 0.158-0.163 at h
  0.21, 0.240-0.243 at h 0.32, 0.221 at h 0.29; fat has no junctions): the
  fused-tip tuck's 0.75 h trim. The END particles sit within 0.0055.
- The muse 6x zooms j123 and j49 measure 0 rays (the exclusions cover a
  view centred on a junction at cr 6); the tip zoom 34.
- README: `.claude/probes/K868/scenes/README.md`, generated by
  `_jobs/readme.mjs` from the diag files and the batch results (21 scenes,
  65 variants, 11 census rows).
