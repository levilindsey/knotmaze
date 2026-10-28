# K868 S3a: label ink in the app, behind a flag (agent brief)

Stage brief (coordinator, 2026-10-27). Parent: K868
(`docs/design/K868_field_border.md`, §8's S3 and §9).

## Why

The oracle's rules are settled and are its defaults (K934, merged
e2926d0e): label ink, depth "overlap", endSnap, the crossed yield order,
labTie "surface", extent "part". At play size, label ink leaves far less
than today's app does (sheet K, `.claude/probes/K934/K_recount.png`;
`docs/design/K934_recount.md` ## Results, step 5). More oracle rounds now
gain little. Levi judges the look on the phone, so the next step is the
app. K923 measured that the two passes fit the Pixel's 4 ms at every zoom
with a screen-space LOD and a packed 32-bit label.

## Goal

With a new flag on (default off), the app draws the border look's ink
with K915's two passes, and that ink matches the oracle's label ink on
the 12 scenes. With the flag off, the app draws exactly as master.

## Read first

- `K868_field_border.md`: §2 (goals), §3 (the model), §5 (the oracle),
  §6 (checks), §8 and §9.
- `K915_surface_borders.md`, Step 6 (the two passes) and Step 7.
- `K923_s3_bench.md` ## Handoff. The bench's code is in
  `.claude/probes/K923/`: reuse it.
- `K934_recount.md` ## Results, for the defaults and for the residuals
  that belong to later stages.
- `K868_s1a_scene_export.md`, for the scene exporter, the driver and the
  camera that put the app and the oracle on one grid.
- The oracle's label ink path in `src/render/field/oracle.ts`, read
  through the shell.

## Order

1. **The flag.**
   - Add a new param at the end of `CODEC_PARAMS`, off by default (§9).
     Update the table pin in `test/ui/param_codec.test.ts` as that test's
     header says.
   - The flag switches only the border look's ink (§2 item 1). Leave
     other looks alone.
   - With the flag off, the app is unchanged: the golden snapshot stays
     green, and a screenshot diff on two scenes shows zero changed
     pixels.
2. **The label pass.**
   - Rasterize tubes, fills and caps with the depth test into a packed
     32-bit label (K923's layout: chain 8, s 11, cluster 8 and z 5 bits).
   - The depth is the oracle's order with its tie-break folded in (K915
     Step 6). It is computed render-side from the crossing table (§9),
     so the worker's snapshot needs no z.
   - Map onto this pass every oracle rule that decides the visible
     surface: depth "overlap", the crossed yield order, labTie
     "surface", extent "part" and endSnap. If a rule has no GPU form,
     report it; don't invent a different rule.
   - Check: read the label target back against the oracle's V on the same
     grid. Do three scenes first, then all 12.
3. **The band pass.**
   - Draw strips W wide inside every outline piece, and strips centred on
     each switch curve (the CPU finds the switches).
   - Each fragment makes 2-3 fetches, and its coverage comes from the
     strip's distance coordinate.
   - Check the GPU's ink against the oracle's label ink, per pixel, on the
     12 scenes (K892's method). Report extra and missing pixels per scene,
     and crop the worst five sites.
   - Run the free-end check (K934's runs count) on the GPU's ink. It is
     the judge.
4. **The LOD and the label's bits.**
   - Use K923's screen-space LOD, segments of 5-8 px: step 4 at fit, 2 at
     2x and 3x, 1 at 6x.
   - Look for facets on kink loops and twist eyes at fit (K933): crop and
     look. If they facet, try keeping points on sharp turns.
   - The label's 32 bits must hold K943's 1-2 bits (the over line inside a
     junction) and any flags label ink needs (fill, cap, closed). s only
     has to tell |Δs| ≤ σ (K915 Step 6), so it can give up bits.
   - Check the largest designs' chain and cluster counts against the
     limits (K933). Past them, the app falls back to the flag off and
     logs one console warning.
5. **The desktop look.** Render sheet S3a: the 14 sheet K sites with the
   app's flag on, beside the oracle's label ink and master, at play size
   and at 4x. Crop and look.

Not this stage:
- S3b: the Pixel bench, the look on the phone, and the END tuck and band W
  against master (§8).
- G1 corners and cr 0-6 (sheet F).
- K892 (G3-1).
- K943, K953, K955, K956, K957 and K958.

## Rules

- **Branch and probes.**
  - Work on branch `k868-s3a`, in worktree `.claude/worktrees/k868-s3a`.
    Its `node_modules` is a junction to the main checkout's.
  - Commit WIP at every milestone, broken or not. Never push.
  - Keep probes and results in `.claude/probes/S3a/` (untracked), and
    in tracked `scripts/` when they are reusable.
- **Code.**
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`).
  - Main and `src/app/` write physics only through the host
    (`host_seam.test.ts`).
  - `npm test` passes at every milestone commit that touches `src/`.
- **Screenshots.** Use `scripts/diag_screenshot.mjs` or S1a's driver,
  never `--virtual-time-budget`. Probe links carry `&snd=none`.
- **Gameplay layers** (markers, trail, fog) keep drawing on top. List
  anything that breaks with the flag on; don't fix it.
- **Not allowed.** The phone, timing, `npm run build` in the main
  checkout, processes you did not start, Levi's Chrome profile and
  `LEDGER.md`.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when steps 1-5 are done or 2 h after your start, whichever comes
    first. Run `Get-Date` at the start and at each milestone.
  - A compaction is not a stop. After one, re-read this brief and
    `git log`.
  - On stopping, commit WIP, append a `## Handoff` to this brief (in the
    worktree, committed), then report.
- **The final report** gives:
  - each step, done or not, with its commits;
  - the rule mapping (oracle rule to GPU form), and anything that has
    none;
  - per scene: the label readback's mismatches, the ink's extra and
    missing pixels against the oracle, and the free ends;
  - the LOD's look (crops), the label's bit layout and its limits;
  - the sheet's path and the paths of the crops you looked at;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K868's current handle fields (branch, last commit, evidence, next).

## Handoff

Stopped 2026-10-28 about 00:05 (start 2026-10-27 22:22; cap 00:22). Step 1
is done. Step 2 is partly done: the tube label runs on the GPU in a probe,
and the fills are only emulated on the CPU. Steps 3-5 are not started.

**Evidence is untracked.** It lives in this worktree's `.claude/probes/S3a/`
(gitignored). The coordinator must copy it into the main checkout's
`.claude/probes/S3a/` before removing the worktree; this agent may not
write there.

### Step 1: the flag (done)

- Commits: 0496cc5a (WIP) and e001cae7.
- The flag:
  - `labelInk` (`lbi`), default off, appended to CODEC_PARAMS with the pin
    updated;
  - its panel row, "Label ink", shows in the border look only.
- With `threadLook === 1 && labelInk`:
  - tickPaint writes `uKLook.w = 0`, which removes the border ink from
    the ribbon, sdf and pluck strokes;
  - `filletLayer` and `filletTopLayer` are hidden (edge-triggered,
    `paint_state.ts`).
- No shader text changed. A first cut that branched in the junction
  shader overran K320's JUNCTION_FRAG budget (`test_step1b.log`).
- Checks:
  - the suite is green, 179 files and 2376 tests (`test_step1c.log`), and
    the golden snapshot passes;
  - flag off against master: 0 px on def and muse_hash
    (`ab/diff_final_*.png`, `ab_shot.mjs` with the exact-still view
    wait).
- **On screen today:** with the flag on, the threads have no outline at
  all (`ab/b3_lbi/def.png`). The label passes that would draw the ink are
  not in `src/` yet.

### Step 2: the label pass (probe only, nothing in src/)

**Revisions.** Each is served by the worktree's dev server and run as
`label_run{,4,5,6}.mjs <base> <outDir> <scenes> 2`. Each scene's JSON
holds `counts` (tube only), `counts2` (two-pass) and `sites2` (up to 400
bad sites).

| Revision | Probe | What it adds | Results |
|---|---|---|---|
| v3 | `label_check_v3.ts` | the tube label | `label/tubes` |
| v4 | `label_check_v4.ts` | a CPU emulation of the second (fill) pass | `label/two` |
| v5 | `label_check_v5.ts` (`patch_v5.mjs`) | the local-minimum clip | `label/five` |
| v6 | `label_check_v6.ts` (`patch_v6.mjs`) | v5 plus an EPS overlap | `label/six` |

**The tube label's GPU form (v6).**
- **Pieces.** One instanced capsule quad per piece. A piece is a polyline
  segment, split:
  - where `depthAt` bends (ZTOL 1e-4 of the z range, down to 1/64 of a
    segment);
  - at a bisected cluster switch.
- **Per fragment.** The FS finds the foot t on the piece and interpolates
  s and z from it.
- **The local-minimum clip.** A fragment is kept only if:
  - tr lies in [-e, 1+e], where e = EPS / piece length;
  - or, past the piece's end, it lies in the vertex's outer wedge
    (dot(P - B, u_next) < EPS) or past an open chain's end;
  - or, before the piece's start, it lies past an open chain's start;
  - and in every case dist < h.
- **Depth.** `gl_FragDepth = 0.5 - 0.45 zn - 2e-4 rank/nKeys - 2e-6
  s/smax`, depth test LESS, DEPTH_COMPONENT32F.
- **Output.** RGBA32UI (chain+1, the bits of s, cl+1, the bits of z),
  tiled up to 4096.
- **Cost.** 48-97 ms per scene for the whole label grid. That is not a
  frame timing.

**Why the clip.**
- Overlapping capsules plus the depth test keep the HIGHEST z of a chain
  within h. The oracle takes only the chain's local minima of distance.
  On a depth ramp that changes s and z, and so the crossed yield.
  - Example, ring at (5.62, 5.107): the nearest vertex is s 119.645, z
    -0.178; the max-z vertex within h is s 119.829, z 0.198.
    fillOrder(3, 1, s) flips from true to false between them.
- v5 removed muse_hash's 223 GPU-higher wrong tubes and every wrong fill.
- It opened knife-edge holes, 14-117 per scene, where adjacent pieces'
  clips met. float32 and raster snapping rejected the pixel on both
  sides, as the CPU replay (`dbg_hole.ts`) showed.
- v6's EPS = g/20 overlap closes them.

**The second pass, emulated on the CPU.** It reads the tube label T:
- paper: the fill wins;
- T.J == J: keep T;
- T is a tube of another cluster: fillOrder decides;
- a winning fill reads as fill J, or as the nearest member's tube if
  d < h.

**v6, both passes, all 12 scenes.** Sampled at stride 2.

| scene | agree | extra | missTube | wrongTube | wrongFill | missFill |
|---|---|---|---|---|---|---|
| def | 283828 | 2 | 7 | 5 | 1 | 0 |
| fat | 253898 | 3 | 1 | 3 | 0 | 0 |
| g41_def_tw42 | 361005 | 7 | 8 | 1 | 0 | 0 |
| g41_def_tw64 | 225613 | 5 | 4 | 5 | 0 | 0 |
| g41_ring_tw42 | 94261 | 3 | 1 | 2 | 0 | 0 |
| g41_ring_tw64 | 59117 | 2 | 0 | 0 | 0 | 0 |
| g41_user_tw42 | 151668 | 1 | 3 | 0 | 0 | 0 |
| g41_user_tw64 | 93631 | 3 | 0 | 0 | 0 | 0 |
| muse_default_tw | 281169 | 7 | 5 | 1 | 0 | 0 |
| muse_hash | 173552 | 4 | 1 | 4 | 0 | 0 |
| ring | 65859 | 0 | 2 | 1 | 0 | 0 |
| user_tw42.lightpaper | 151666 | 2 | 1 | 1 | 0 | 0 |

- brokenBySecond is 0 in every scene.
- **The tube label alone (v3)** misses the fills: missFill per scene is
  def 5443, fat 0, g41_def_tw42 4780, g41_def_tw64 6350, g41_ring_tw42
  660, g41_ring_tw64 757, g41_user_tw42 2465, g41_user_tw64 1520,
  muse_default_tw 5124, muse_hash 2650, ring 702,
  user_tw42.lightpaper 2462. Its wrongFill reaches 1322 (g41_def_tw64).
- **The residue** (0-16 sampled px per scene) is not diagnosed:
  - extra and missTube at open ends (the GPU draws round caps; the oracle
    snaps ends);
  - a few wrong tubes, mostly GPU-lower after the clip.

### The rule mapping

| Oracle rule | GPU form |
|---|---|
| depth "overlap" | a per-fragment foot z with the depth test, restricted to local-minimum feet (the v6 clip) |
| labTie "surface" | the key rank folded in at 2e-4, then s at 2e-6 |
| extent "part" | `clusterAt` per piece, with one bisected switch |
| endSnap | a round cap at open ends (0-8 sampled px per scene differ) |
| crossed yield (fillOrder) | a second pass that reads T, plus a per-cluster crossing table (emulated on the CPU only) |

**No GPU form built yet:**
- the fill's coverage (`inFill`'s wedge tests, with `footInWindow` per arm
  window);
- the fill's z from the per-pixel nearest member (approximate it from the
  nearest foot of the corner's two arms);
- the fillOrder table;
- pieces with two cluster switches (0-3 per scene; drawn wrong past the
  first switch).

### Not built

- the packed 32-bit label (the probe uses 128 bits per pixel);
- caps and fills on the GPU;
- the label in `src/`;
- steps 3, 4 and 5.

### Gotchas

- The dev server ignores `.claude/`, so an edited probe module is served
  stale. Use a new file name per revision.
- The label probes ran without the perf lock. They are counts, not
  timings, and a rerun reproduced them exactly.

### Next

1. Port v6's tube pass into `src/` behind the flag.
2. Build the GPU fill pass: the wedge coverage, the fill's z, the yield
   reading T, and the fillOrder table.
3. Pack the label into 32 bits (chain 8, s 11, cluster 8, z 5 + flags) and
   add the caps.
4. Then steps 3-5 as briefed.
