# K868 S1a: the scene exporter (agent brief)

Stage S1a of K868. The design is `docs/design/K868_field_border.md`: read
§3.3, §3.6, §4 and §6 before you start. The format you export is
`src/render/field/scene.ts`. This is one stage: stop when it is done or at
the cap.

## Setup

- Worktree `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k868-s1a`,
  branch `k868-s1a`. Your shell starts in the MAIN checkout, which must
  stay clean: use absolute paths and `git -C <worktree>`. node_modules is
  a junction to the main checkout's.
- Outputs go to the main checkout's
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K868\scenes\`
  (ignored by git). S1b, running in parallel, reads them there.
- Dev server: from the worktree, `npx vite --port 5341 --strictPort`. Stop
  it when you finish. Never run `npm run build` in the main checkout (a
  test server serves its `dist`); in the worktree it is fine. Never touch
  processes you did not start.
- Browser: puppeteer-core, as `scripts/diag_screenshot.mjs` drives it:
  headed, hardware GPU, window off-screen, a fresh temp profile deleted
  afterwards. Never Levi's profile, and never `--virtual-time-budget`.
  Probe links carry `&snd=none`.
- `phw=0` on every link: the worker's mirror has no zPos, and z must come
  from physics or the crossing table on main.

## Deliverables, in order (commit after each)

1. `window.__knotSceneExport()`, registered with the other probe hooks
   (`src/app/probe_hooks.ts`), returns a version-1 `FieldScene` of the
   current frame. It only reads: physics and rendering are unchanged, and
   the byte-identity golden stays green.
   - chains: the samples the border look draws (`__knotRenderer()`'s
     `chainSamples`), with z per sample (design §3.3). Say how you got z:
     physics zPos interpolated onto the samples, or the tent recomputed
     from the crossing passes; prefer the one that matches physics
     exactly.
   - crossings: true crossings only, with s in the export's own arc
     length. Merged crossings (4-ways) are junctions.
   - junctions: centre, arms in angle order (`SceneArm`), and master's
     resolved corner style per corner (K830 pins, then `crs`;
     `src/render/ribbon/corner_share.ts`).
   - deadEnds: the free tips; flag ends anchored off-screen.
   - look: h and W in world units exactly as the border look computes
     them (`uKLook.w` is `bdw`, 0.38; joinery's band span is
     borderWidth·casingWidth/2; establish h from the code, not from
     this line), plus crs, cr, the depth constants, paper and ink.
   - camera: the world-to-CSS affine, pxPerUnit, dpr and viewport.
   - pois: every junction as `j<index>` and every free tip as `t<index>`.
   Add a unit test of the export's pure part (a small fixture state in,
   a scene out).
2. `scripts/export_scene.mjs <url> <outBase> [--simT 40] [--dsf 1]
   [--zoom <poi> <pxPerUnit>] [--expect-hash <hash>]`: waits for the
   hooks, runs `__knotStepUntil(simT)`, reads the physics hash from
   `__knotPhysDump()` (and refuses a mismatch with `--expect-hash`),
   freezes with `__knotPhysFreeze(true)`, optionally zooms to a POI (the
   wheel zoom of `.claude/probes/K862/fbd_shot.mjs`, or another way that
   keeps physics frozen), then writes `<outBase>.json` (the export),
   `<outBase>.master.png` (a screenshot at the same camera) and
   `<outBase>.overlay.png`.
3. Alignment proof. The overlay is the master screenshot with the
   exported centrelines, tube outlines at ±h, junction centres and
   crossing marks drawn through the scene's camera (a canvas in the page,
   saved as PNG). Away from junctions and crossings the tube outlines
   must sit on master's outer edge lines within 0.5 px: measure it
   (master's edge positions along sampled normals) and report the
   maximum.
4. Exports, into `.claude/probes/K868/scenes/`:
   a. `muse_hash`: the hash-locked scene of design §4, full frame
      (1240x900, dsf 1). Confirm the physics hash on this build
      (733ee14a on Muse's tree; if it differs, record the new one and
      why).
   b. The same scene zoomed to 6x the full frame's pxPerUnit, centred on
      j123, j49 and tip: `muse_hash.j123` and so on.
   c. `muse_default_tw`, and `ring`, `def` and `fat` from
      `.claude/probes/g1/urls.mjs`, each with
      `&tlk=border&snd=none&phw=0&am=instant`.
   d. The G4-1 set (design §4), once per geometry: first establish
      which params move geometry and which only change rendering. Master
      screenshots at cr {0, 1, 3, 6} for each.
5. `.claude/probes/K868/scenes/README.md`: every scene with its URL,
   build, physics hash and camera.

## Facts to report

- Where the border look's centreline comes from on each render path
  (strips and `rp=sdf`), whether both draw the same samples, and the
  sample spacing in world units and px.
- How h and W are derived.
- The largest distance of an END terminal from its through's centreline,
  per scene.
- The z method.
- Which params move geometry and which only change rendering.
- The alignment error's maximum.

## Rules

- Stop rule: run `Get-Date` at the start and at every milestone. Stop
  when deliverables 1-5 are done or 2 h after the start, whichever comes
  first. A compaction is not a stop: after one, re-read this brief and
  `git -C <worktree> log --oneline -10` before going on.
- Commit WIP to `k868-s1a` at every milestone, broken or not, and never
  push. Commit messages end with the two trailer lines below. Take SHAs
  from `git rev-parse HEAD` (a hook re-dates work-hours commits).
- If `src/render/field/scene.ts` needs a field, append it as optional
  at the end of its interface, with a comment.
- Never edit LEDGER.md, CLAUDE.md or `.claude/rules/`; never upload to
  Drive; add no npm dependencies.
- Helpers only if needed: `model: sonnet`, a 1 h cap and these rules.
- When you stop, append a `## Handoff` section to this brief in the
  worktree and commit it: done, not done, the facts above, the next
  step. Your final report carries the same, plus a `Ledger items` list
  (follow-ups, residuals, decisions for Levi) and the handle fields
  (branch, last commit, evidence, next).

Trailer:

    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01TnQvxftruF6gxzRe3bigQ6

## Handoff

2026-10-26, the S1a agent, stopped before the cap with deliverables 1-5
done. Working notes with the mechanics: `K868_s1a_notes.md`.

Done (branch `k868-s1a`):

1. `__knotSceneExport` (c4e4e67e): `src/render/field/scene_export_hook.ts`
   gathers the frame, the pure `scene_export.ts` builds the scene, tested
   in `test/render/field/scene_export.test.ts`; registered in
   `src/app/probe_hooks.ts`. Read-only.
2. `scripts/export_scene.mjs` (0ed51f8a, f82db817): the brief's single
   run, plus `--batch <jobs.json>`: live variants typed into the panel's
   text inputs on the frozen page, zooms by one ctrl+wheel event and a pan,
   the alignment measure, the perf lock for non-census batches.
3. Alignment measured (below).
4. Exports in `.claude/probes/K868/scenes/`: a (muse_hash, hash 733ee14a at
   sim 40.01666666666504 on this build, as on Muse's tree), b (j123, j49,
   tip at 6x), c (muse_default_tw, ring, def, fat), d (ring, user, def at
   tw .42 and .64: 6 geometries, 64 master-only variants at cr 0/1/3/6, fl
   0/.34, and gap .18 on the user pages).
5. README there, generated by `_jobs/readme.mjs` (21 scenes, 65 variants,
   11 census rows).

Not done, and deviations:

- Every link carries `&fw=0&stb=0` besides the brief's suffix: flow moves
  the drawn samples every frame, and K147's settle budget moves the
  stepping phase. ring, def and fat at their own links' fw failed the
  exporter's samples-moved check.
- Dark paper (the default) gives the outer edge no contrast: those scenes
  measure 0 rays. The alignment was measured on light-paper reruns, which
  kept their scene's hash and geomHash, except the user link (next).
- The user link's stepping phase moved between loads, stb=0 on all
  (40.00833 on dark paper, 40.01667 on light): `user_tw42.lightpaper` is
  its own geometry. Not diagnosed.
- No same-state pixel A/B of a live variant against a reload (the paint,
  pulse and background clocks were not pinned).

Facts:

- Centreline: strips and `rp=sdf` both draw `renderer.chainSamples[c]`
  (the splines through the chain's controls, then the fused-tip tuck);
  SDF's SAMP is those positions exactly, so the samples are the same.
  Spacing: nominal 0.09 world (SAMPLE_SPACING; MIN_SAMPLES 48 densifies
  short chains); muse measures median 0.066, max 0.101 world, about 1.4 /
  2.2 px at 21.3 px/unit and 8.4 / 12.9 px at the 6x zooms. The tuck's
  duplicate samples are dropped by the export.
- h = `style.threadWidth / 2` = the clamped param / 2 (`tw=1.1` clamps to
  0.8: h 0.4); W = borderWidth x h (bdw 0.38: W 0.152 at h 0.4). Joinery's
  fan band uses borderWidth x casingWidth / 2, wider when gap > 0.
- END terminals: the drawn (tucked) terminal sits 0.75-0.77 h from the
  nearest through centreline: muse_hash 0.304, muse_default_tw 0.198, def
  0.198, ring 0.221, the G4-1 pages 0.158-0.163 (tw .42) and 0.240-0.243
  (tw .64); fat has no junctions. The END particles sit within 0.0055.
- z: physics `zPos` from the hashed dump, interpolated onto the samples by
  control arc. It is not the tent: |z - tent| reaches 0.75 on muse (def
  0.55, ring 0.70, fat 0.074) and max |z| 1.31 exceeds the amplitude 0.928
  (the ease and the collision z-pushes act after the tent).
- Params: render-only cr, fl, gap, crs, tlk and the background (physics
  hash and geomHash unchanged); geometry tw; fw keeps the hash but moves
  the drawn samples.
- Alignment maximum: 0.509 px on def at dsf 1 (560 rays, p99 0.456, mean
  +0.143), the only reading over 0.5; the same state at dsf 3 reads 0.172.
  Others: muse_default_tw 0.40, ring 0.301, fat 0.301, muse cr 0 0.294
  (live) and 0.296 (reload), the tip zoom 0.250, muse_hash 0.227,
  g41_ring_tw42 0.147, user_tw42.lightpaper 0.133. Coverage is thin near
  junctions: the junction disc excludes most rays at cr 6.

Next: the coordinator merges `k868-s1a`, and S1b reads the scenes. The
follow-ups are in the final report's ledger list.
