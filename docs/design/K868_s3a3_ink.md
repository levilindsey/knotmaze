# K868 S3a3: the ink drawn from the label (agent brief)

Stage brief (coordinator, 2026-10-28). Parent: K868
(`docs/design/K868_field_border.md`, §8's S3 and §9). Previous stage: S3a2
(`docs/design/K868_s3a2_label.md`). Read its `## Handoff` first. It is on
the branch.

## Why

S3a2 put the label pass into `src/`. With `labelInk` on, the app renders
a packed label whenever it repaints the threads. With the flag off, it
draws exactly as master. The threads still have no outline with the flag
on, so this stage draws the ink from the label: K915's band pass, which
is S3a's step 3.

It also carries out three of the coordinator's technical calls (in the
order steps 1, 2 and 4 take them up):

1. **Exact s for the fill pass.** The packed s has 11 bits, about 0.15
   world on a 300-world chain. The band pass needs no more than that,
   since it only tells |Δs| ≤ σ, with σ about 1.3 (K915 Step 6). The fill
   pass's window tests need more: the packed s costs up to 44 cells on
   g41_def_tw64.
2. **The oracle stops depending on the order it visits clusters (K964
   class C).** It resolves as the GPU does:
   - tubes first, by depth;
   - then each fill against the tube under it, by the yield;
   - then fills against each other, by depth.
3. **The label follows the threads.** S3a2 rebuilds it only once the knot
   sleeps or after 2 quiet frames. With the ink drawn from it, a drag
   would show the ink lagging behind the threads.

## Goal

With `labelInk` on, the threads have outlines drawn from the label:
- The GPU's ink matches the oracle's label ink per pixel on the 12 scenes.
- The free-end check passes as well as it does on the oracle's ink.
- The ink stays on the threads while they move.

With the flag off, the app draws exactly as master, and the branch is
ready to merge.

## Read first

- S3a2's `## Handoff`.
- S3a's steps 3-5 in `K868_s3a_app.md` `## Order`. This stage does step
  3 and part of step 5. Step 4 (the LOD) and the 4x sheet are S3a4.
- `K915_surface_borders.md` Step 6: the two passes, the fetches,
  antialiasing and the checks.
- `K923_s3_bench.md` `## Handoff`. Its band pass is in the main
  checkout's `.claude/probes/K923/` (`bench.js`, `bench.html`): port from
  it.
- `K934_recount.md`: the free-end check (the runs count) and sheet K's 14
  sites (`.claude/probes/K934/` in the main checkout).

## Order

1. **Exact s for the fill pass.**
   - The tube pass also writes s as a float into a 4-byte target.
   - The fill pass samples it through a framebuffer that does not attach
     it, so no copy is needed.
   - The band pass keeps reading the packed word.
   - Check: on the 12 scenes, P2 equals W2, or the difference is
     explained. Report the bytes per pixel.
2. **The oracle's fill order (K964 class C).**
   - Change `oracle.ts` to resolve as the GPU does (Why, call 2).
   - Check: the oracle's V is the same with the clusters visited in
     reverse order, on the 12 scenes. Class C's two cells on muse_hash
     agree with the GPU.
   - Report how many pixels of V change per scene. Then re-take the
     oracle's label ink and free-end runs count as the reference for
     step 3.
3. **The band pass.**
   - Draw strips W wide inside every outline piece: each tube edge at
     ±h, each fill's arcs and each cap.
   - Draw strips centred on each switch curve. The CPU finds the switches
     where two surfaces swap in depth inside an overlap.
   - Each fragment makes 2-3 fetches. Its coverage comes from the strip's
     distance coordinate.
   - With the flag on, this ink replaces the border look's ink. The rest
     of the look is unchanged.
   - Check:
     - The GPU's ink against the oracle's label ink, per pixel, on the 12
       scenes (K892's method). Report extra and missing pixels per scene.
       Crop the worst five sites and look.
     - The free-end check (K934's runs count) on the GPU's ink. It is the
       judge.
4. **The label follows the threads.**
   - Rebuild the label whenever the drawn positions change: every repaint
     while the knot moves, with the worker on and off.
   - Flow on at rest rebuilds only when the drawn positions change.
   - No timings: S3b times the rebuild.
   - Check: during a scripted drag, the ink stays on the threads. Crop one
     frame mid-drag beside the flag-off frame and look.
5. **The checks.**
   - On the 12 scenes:
     - the label's counts in S3a's columns, beside S3a2's W2 and P2;
     - the ink's extra and missing pixels;
     - the free-end runs count beside the oracle's.
   - The suite is green, including the golden snapshot.
   - With the flag off, 0 px against master on def and muse_hash
     (`ab_shot.mjs`).
   - K320's shader budgets hold.
   - The 14 sheet K sites at play size, with the flag on, beside the
     oracle's label ink and master. Crop and look.
   - Gameplay layers with the flag on: list what changed since S3a2's
     list. Don't fix them.

Not this stage:
- **S3a4:**
  - K923's LOD and its facet check;
  - sheet S3a at play size and 4x;
  - the label's bits for K943.
- **S3b:**
  - the Pixel bench, covering both passes, the rebuild per moving frame
    and flow at rest;
  - the look on the phone;
  - the END tuck and band W against master (§8).
- **Later:**
  - K964 classes A and B, and the open-end residue;
  - K966 (gameplay layers) and K967 (the label app's fixed values);
  - G1 corners and cr 0-6 (sheet F);
  - K892, and K943 beyond its 2 bits;
  - K953 and K955-K958.

## Rules

- **Branch and probes.**
  - Work on branch `k868-s3a`, in worktree `.claude/worktrees/k868-s3a`.
    The coordinator has rebased it onto master with this brief. Its
    `node_modules` is a junction to the main checkout's.
  - Commit WIP at every milestone, broken or not, starting with your
    first edit to `src/`. Never push.
  - Keep probes and results in this worktree's `.claude/probes/S3a/`
    (untracked), with a new file name per revision: the dev server serves
    `.claude/` stale. Reusable harnesses go in tracked `scripts/`.
  - Dev server: S3a2's command (its handoff's `env:`), port 5381. Stop it
    at the end.
- **Code.**
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`). A Read attaches the render lore every
    time: S3a2 compacted 9 times in 78 minutes.
  - Main and `src/app/` write physics only through the host
    (`host_seam.test.ts`).
  - `npm test` passes at every milestone commit that touches `src/`.
- **Probes.**
  - Hook only the app's canvas for lost contexts. Pixi's
    `isWebGLSupported` test canvas loses its context on purpose.
  - Screenshots: `scripts/diag_screenshot.mjs` or S1a's driver, never
    `--virtual-time-budget`. Probe links carry `&snd=none`.
- **Not allowed:**
  - the phone;
  - timing;
  - `npm run build` in the main checkout;
  - processes you did not start;
  - Levi's Chrome profile;
  - `LEDGER.md`.
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
  - the exact s target's bytes per pixel, and the 12 scenes' P2 against
    W2;
  - the oracle's change per scene;
  - per scene: the ink's extra and missing pixels and the free-end runs
    count, both beside the oracle's;
  - the drag check;
  - the paths of the crops you looked at;
  - whether the branch is ready to merge, in your view: flag off equals
    master, the suite is green, and flag on draws the ink;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K868's current handle fields (branch, last commit, evidence, next).
