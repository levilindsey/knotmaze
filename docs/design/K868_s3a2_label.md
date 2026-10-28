# K868 S3a2: the label pass in the app (agent brief)

Stage brief (coordinator, 2026-10-28). Parent: K868
(`docs/design/K868_field_border.md`, §8's S3 and §9). Previous stage: S3a
(`docs/design/K868_s3a_app.md`). Read its `## Handoff` first.

## Why

S3a added the flag (`labelInk`, `lbi`) and found the tube label's GPU form
in a probe. v6's pieces, with the local-minimum clip and the EPS overlap,
match the oracle's visible surface on the 12 scenes to 0-16 sampled px per
scene (of 59k-361k). The fills were only emulated on the CPU, with
FieldModel's own functions, so the two-pass numbers are not yet an
independent check. Nothing of the label is in `src/`, so with the flag on
the threads have no outline at all, and the branch cannot merge. This
stage puts the label pass into the app. S3a3 then draws the ink from it
(K915's band pass).

## Goal

With `labelInk` on, code in `src/` renders the label into one packed
target at the canvas's device resolution whenever the app repaints the
threads: tubes, fills and caps. Its readback matches the oracle's V on the
12 scenes at least as closely as v6 did (the table in S3a's handoff). With
the flag off, none of it runs, allocates or compiles, and the app draws
exactly as master.

## Read first

- S3a's `## Handoff`, and its probes in this worktree's
  `.claude/probes/S3a/`: `label_check_v6.ts`, `patch_v6.mjs`,
  `label_run6.mjs`, `dbg_hole.ts`, `ab_shot.mjs`. Port from them.
- `K915_surface_borders.md` Step 6 (the two passes).
- `K923_s3_bench.md` ## Handoff (the packed label and its measured cost).
  The bench's code is in the main checkout's `.claude/probes/K923/`.
- `K868_field_border.md` §3.3 (depth), §3.4 (groups), §3.6 (ends) and §9.
- `K868_s1a_scene_export.md`: the scene exporter, the driver and the
  camera that put the app and the oracle on one grid.
- The oracle's label path in `src/render/field/oracle.ts` and FieldModel
  (`depthAt`, `clusterAt`, `inFill`, `footInWindow`, `fillOrder`), read
  through the shell.

## Order

1. **The tube pass in `src/`.**
   - Port v6 (pieces, the clip, the depth, the EPS overlap) into a module
     under `src/render/`. A header comment maps its files, as in
     `src/render/ribbon/`.
   - Build the pieces render-side from the mirror's positions and the
     crossing table (§9). The worker's snapshot gains nothing.
   - Split pieces at every cluster switch. S3a bisected one, and 0-3
     pieces per scene have two.
   - It works with the worker on (the default) and off. The probes ran
     `phw=0`: check both on one scene.
   - Check: the app's own label target, read back, reproduces v6's
     tube-only `counts` on def, muse_hash and g41_def_tw42.
2. **The fill pass on the GPU.**
   - Coverage from `inFill`'s wedge tests, with `footInWindow` per arm
     window.
   - The fill's z. S3a suggests the nearest foot of the corner's two arms;
     check that against the oracle's per-pixel nearest member.
   - The yield reading T, with the fillOrder table as a data texture.
   - WebGL2 cannot read a texture attached to the framebuffer it draws
     into, so a pass that reads T draws into another target or reads a
     copy. Say which, and what it adds in memory.
   - Check: all 12 scenes, in S3a's columns (agree, extra, missTube,
     wrongTube, wrongFill, missFill), beside v6's table. This is the
     independent check that S3a's CPU emulation was not.
3. **The packed label.**
   - Target layout, 32 bits: chain 8, s 11, cluster 8, the flags fill, cap
     and closed, and 2 bits reserved for K943 (the over line inside a
     junction). That leaves no room for z.
   - First test whether z can leave the label. List every reader of z,
     here and in K915's band pass (which needs "lower or paper" across an
     edge), and whether each can read the depth texture instead. The
     depth already orders z, with the tie-break folded in.
   - If z must stay: shrink s (it only has to tell |Δs| ≤ σ, K915 Step 6)
     or derive the cluster from chain and s, and give each one's cost in
     readback mismatches. Failing both, use RG32UI (64 bits; K923
     measured 0.6-1.0 ms more) and say so. S3b measures it.
   - Past the limits (K933: chains or clusters over 255), the app falls
     back to the flag off and logs one console warning. Test it.
   - Check: the 12 scenes again. The packed label's counts equal the
     128-bit ones, or the difference is explained.
4. **Caps that match endSnap.** The probe drew round caps at open ends
   while the oracle snaps them (§3.6). Make the caps match, then recount
   the open-end residue.
5. **The checks.**
   - The 12 scenes in S3a's columns, beside v6's.
   - K964, the residue v6 left: open ends after step 4, and the wrong
     tubes that are GPU-lower after the clip. Diagnose where it is cheap:
     a cause per class, or "not found" with what you tried.
   - The suite is green, including the golden snapshot. With the flag
     off, 0 px against master on def and muse_hash (`ab_shot.mjs`). K320's
     shader budgets hold.
   - Gameplay layers (markers, trail, fog) with the flag on: list what
     breaks; don't fix it.

Not this stage:
- S3a3: the band pass (the ink), K923's LOD and sheet S3a (S3a's steps
  3-5). Until it lands, the flag on still draws no outline. That is
  expected at the end of this stage.
- S3b: the Pixel bench, the look on the phone, and the END tuck and band W
  against master (§8). No timings of any kind.
- K943 beyond its 2 reserved bits; K953 and K955-K958; G1 corners; K892.

## Rules

- **Branch and probes.**
  - Work on branch `k868-s3a`, in worktree `.claude/worktrees/k868-s3a`,
    rebased onto master with this brief. Its `node_modules` is a junction
    to the main checkout's.
  - Commit WIP at every milestone, broken or not. Never push.
  - Keep probes and results in this worktree's `.claude/probes/S3a/`
    (untracked), with a new file name per revision: the dev server serves
    `.claude/` stale. Reusable harnesses go in tracked `scripts/`.
  - Dev server: `npm run dev -- --port 5381 --strictPort --host 127.0.0.1`
    in the worktree. Stop it at the end.
- **Code.**
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`).
  - Main and `src/app/` write physics only through the host
    (`host_seam.test.ts`).
  - `npm test` passes at every milestone commit that touches `src/`.
- **Screenshots.** Use `scripts/diag_screenshot.mjs` or S1a's driver,
  never `--virtual-time-budget`. Probe links carry `&snd=none`.
- **Not allowed.** The phone, timing, `npm run build` in the main
  checkout, processes you did not start, Levi's Chrome profile and
  `LEDGER.md`.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when steps 1-5 are done or 2 h after your start, whichever comes
    first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, if steps remain, run step 5's checks on what you have.
  - A compaction is not a stop. After one, re-read this brief and
    `git log`.
  - On stopping, commit WIP, append a `## Handoff` to this brief (in the
    worktree, committed), then report.
- **The final report** gives:
  - each step, done or not, with its commits;
  - the module layout: files and what each holds;
  - the bit layout and the z decision, with every reader of z;
  - per scene: S3a's columns for the app's label, beside v6's;
  - anything with no GPU form;
  - K964's diagnosis;
  - the paths of the crops you looked at;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K868's current handle fields (branch, last commit, evidence, next).
