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
