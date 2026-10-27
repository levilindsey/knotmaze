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
