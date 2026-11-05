You are a Claude Code agent working in a git worktree of knotmaze (C:\Users\lsl\Repositories\knotmaze), a web celtic-knot maze (TypeScript, PixiJS v8, custom WebGL shaders). Your item is K1139: light pulses that travel along the maze's threads and through its junction fans. Junction work is the project owner's top priority, so the look has to be right, not just the numbers.

## Where you start

Stage S4 (pulses on loops and cycles) stopped at its 2-hour cap. Its commits are on branch `worktree-agent-a023a39925efe4816` (tip 0aaa0dee, based on 25ce2321). Its brief and Handoff: `docs/design/K1139_s4_cycles.md` (read the Handoff from "### What landed" to the end: "Open defect, S4b", "Cost", "Sheets", "Probe gotcha"). S4's probes are tracked on that branch under `.claude/probes/K1139/` (`*_cyc.mjs`, `out/s4cyc/`, `k307/`, `run_locked.ps1`, `vite.private-cache.config.ts`).

First steps, in your worktree:
1. `Get-Date` and note your start time.
2. `git reset --hard worktree-agent-a023a39925efe4816`. Do not rebase onto master: the coordinator rebases at merge.
3. If `node_modules` is missing: `New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`.
4. Save this whole brief as `docs/design/K1139_s4b_ridge_fade.md` and commit it.

## Stage S4b: one stage, the band ridge fade

The defect (S4's Handoff, observed on the cyc stand): on cyc e210, node_218's fan band draws the arm's crest one-ended, with no ridge fade, so about 0.57 world into e210 (the fan's reach) there is a brightness step: band luma about 209-235, the ribbon one sample on 178-181 (unlit 173-175). e210's ridge is 0.68 world from node_218, so the ribbon's ridge fade zone overlaps the band; there the ribbon's ridge factor is about 0.22 and the band's is 1.

Do:
1. The fix (S4's sketch, verify it against the code before trusting it): pack gR = (dA + dB + W) / 2 into a free band slot (R2.w or R3.w, 0 = no ridge); in the band loop multiply the child-side crest (dG > distJ) by the same ridge factor the ribbon applies (PULSE_RIDGE_FADE 0.5; S4 wrote it as min(1, 2 |dG - gR|), check that it matches the ribbon's formula exactly). The parent arm is a tree arm, always one-ended. Add the CPU twin, and a unit test that pins band = ribbon at the band's reach on a two-ended child arm.
2. Extend the CPU table (`table_cyc.mjs`, its P1 check) to compare band against ribbon over the fan's whole extent, not only at the junction point. It must flag S4's step at e210 / node_218 on S4's code and pass on yours (show both).
3. The near-ridge joint case (inferred in S4's Handoff, not observed): when xR < 0.5, a two-ended arm's own ridge factor is under 1 at its joint, which would be a step against the one-ended parent. Find or build a stand where it happens, measure it, fix it if it is a step, or record why it is not.
4. The rare case dB + span < dA, which reads as lit from B at d = 0: measure it the same way; fix it or record why it is harmless.
5. Write the probe gotcha into `dump_cyc.mjs`'s header: on a Vite dev server a `?t=` reload makes dumpPulses import a second, empty module (every arm reads world 0); dump from a `vite preview` build.
6. Re-run `ab_cyc.mjs` (locality: 0 px change outside the touched arms on all 8 stands) and `sheets_cyc.mjs`. Sheets: S4 (0aaa0dee) above S4b at the same moments (add base 25ce2321 as a third row if the script makes that cheap). Crop the cyc e210 seam at 3x or more with System.Drawing and look at it yourself; the kymograph rows must show no step at the band's reach. Do the same for loop e102 (S4's improvement there must survive).
7. Cost: report the characters added to the junction-field program (40,097 before) and to the total shader text (budget 59,050). If the junction-field program grew, cold-compile it with K307's `k307/trace_intro.mjs` (2 runs each, b306333f vs yours); it must stay inside base's spread (6.52-6.75 s; b306333f measured 6.84 and 6.54 s).
8. `npm test` green (S4: 2870 passed, 9 skipped), including the byte-identity goldens.

## Rules

- Ports 5620-5639 only. S4 used `npx vite --config .claude/probes/K1139/vite.private-cache.config.ts --port 5620` for the dev server, and for builds `scripts/preview.ps1 -Ref <sha> -Root $env:TEMP\knotmaze-previews\k1139s4b -BuildOnly`, then `npx vite preview --outDir <dir> --port 5630` (5631 for a second build). Stop every server you started before you finish.
- GPU batches: `& .claude/probes/K1139/run_locked.ps1 -Batch <relative name>` (an absolute path silently runs nothing). It takes the machine-wide perf lock `$env:TEMP\claude-perf.lock`; another owner (a Muse run) may hold it, so wait inside one blocking command, never by checking back later.
- Never use Chrome's `--virtual-time-budget` for anything physics-dependent.
- PowerShell for every command; never Set-Location in a way that leaves your worktree. Read code through the shell (`Select-String`, ranges of `Get-Content`); use the Read tool only just before an Edit.
- Commit WIP at every milestone, broken or not (`git add -f` for files under `.claude/probes`). Never push. Never edit LEDGER.md. Never touch the main checkout at C:\Users\lsl\Repositories\knotmaze: a Muse run is working there.
- If you use helpers for mechanical work (scans, screenshots), give them `model: sonnet` and this stop rule.
- Stop rule: stop when S4b is done or 2 hours after your start time (`Get-Date` at the start and at each milestone), whichever comes first. Then commit WIP, append a `## Handoff` to `docs/design/K1139_s4b_ridge_fade.md` (what landed, numbers, what is open, the next step) and report. A compaction or a large context is not a stop: after a compaction, re-read this brief and `git log`.

## Report

End with: the commits; the numbers (the table before and after, locality, shader characters, compile times if run, test counts); which crops you looked at and what they showed; a `Ledger items` list of anything open or proposed; and the item's handle fields (owner, branch, last commit, evidence, next, brief, env).

Agent start: 2026-11-04 20:33:12 -08:00 (stop by 22:33).

## Handoff

Stopped at 22:07, inside the cap. Items 1, 2, 5, 6, 7 and 8 are done. Items 3 and 4 are measured on the CPU twins but not fixed. Branch: `worktree-agent-a90af0fe8b4cf82a5` (worktree `.claude/worktrees/agent-a90af0fe8b4cf82a5`), on S4's tip 0aaa0dee, not rebased. All servers are stopped.

### What landed

- **9ef9690b:** this brief.
- **410853a5, item 1:** the band ridge fade.
  - R2.w (o+11) carries the B arm's ridge, gR = (dA + dB + W) / 2. Its sign gives the far end's direction; 0 means a one-ended arm.
  - On the child side (tau > 0), the band loop multiplies the crest by min(1, |g - gR| / PULSE_RIDGE_FADE). Past the ridge it reads the far end's train (g = 2 gR - g).
  - This is the ribbon's own factor. kPulseV2 uses min(1, |gA - gB| * 0.5 / F), and |gA - gB| = 2 |g - gR|.
  - CPU twin: kPulseBandV(..., gR, inwardR). joinery's fan twin passes R2.w.
  - Test, "kPulseBandV on a two-ended arm (K1139 S4b)" in paint_gameplay.test.ts:
    - band = kPulseV2 along both ends' bands on five arms (crest, quiet, hover);
    - gR 0 gives exactly S3a;
    - cyc e210's step is pinned at node_218's band reach.
  - Files: pulse_path.ts, paint_state.ts, fabric_maze_renderer.ts, ribbon/joinery.ts, paint_math.ts and junction_field.ts. k320_slim's junction budget is now 40,350.
- **27033efe and 51345934, items 2 and 5:**
  - `dump_cyc.mjs` reads each band's record as the fans see it (`ext`): its tau range, R2.w and fillHalf.
  - `table_cyc.mjs` has a new BAND EXTENT check. It compares band against ribbon over the band's whole tau range, capped at the arm's W.
  - `dump_cyc.mjs`'s PROBE GOTCHA header is written, with one correction to the brief. A `vite preview` build cannot run dumpPulses at all: it has no /src modules, so the first import() fails. The header says to dump from a dev server started after the last source edit.
- **42e0c6eb, items 3 and 4:** `.claude/probes/K1139/ridge_joint.ts` and `out/s4b/ridge_joint.txt`.
- **9dfc82ae, items 6 and 7:** the A/B, sheets, crops, `crops/kymo_steps.txt` and the K307 runs (`k307/runs/s4b-*`).

### Numbers

**Table (item 2):** `out/s4b/table_s4.txt` (S4) against `table_s4b.txt` (S4b).

| Check | S4 | S4b |
|---|---|---|
| node_218 e39->e210 STEP | 0.9859 at tau 1.210, inside the fan (1.0000 from 1.460 to tauHi) | 0.0000 (R2.w 2.066) |
| mnode_27 e135->e18 | 0.0170 | 0.0170 (the end-window residual, Open 3) |
| Junction-point lines (P2 step / P1 max dv) | node_218: -0.0001 / 0.0001; node_635: -0.0005 / 0.0006 | the same |
| e210's A side (A [-1.386, 0)) | - | 0.0001 |

**Locality (item 6),** in `out/s4b/ab/ab_cyc.txt`:
- 0 px outside T and 0 px outside D on all 8 stands: fork, cross, src, four, x4, cyc, loop and preloop.
- Only cyc changes, and only inside: t0 20 px (max 9/255), t1 351 px (max 61/255).
- The S4/S4 control reads 0 px.

**Sheets,** in `out/s4b/sheets`, with S4 on top and S4b below:
- cyc e210's moments differ by 20, 154, 351 and 307 px (max 66/255).
- loop e102 is pixel-identical to S4: 0 px at all four moments and in the kymograph.
- Base 25ce2321 is not added as a third row. The script takes two hosts.

**Shader characters (item 7):**
- Junction field: 40,097 -> 40,342 (+245; 40,167 -> 40,412 as compiled). The k320 budget is now 40,350, so 8 characters are left.
- SECTION_FRAG: 59,001 of 59,050, unchanged.
- Strip text: unchanged.

**K307 cold compiles (item 7):** 12 runs, interleaved ABBA, BAAB, ABBA (`batch_s4b_gpu.txt`, `batch_s4b_k307b.txt`). Times to first visible:

| Build | Runs (s) | Mean | Median |
|---|---|---|---|
| S4b | 6.566, 6.805, 6.382, 6.865, 7.154, 6.482 | 6.709 | 6.686 |
| S4 (0aaa0dee) | 6.200, 6.285, 6.953, 7.034, 6.401, 6.396 | 6.545 | 6.399 |

- S4b is 0.16 s slower on the means. That is inside the run-to-run noise: a rank-sum U of 12 at 6+6 runs, where 5 would be significant at 5%.
- S4b's mean is inside base's spread (6.52-6.75 s). Single runs of both builds fall outside that spread today.
- The comparison is against S4's tip, not b306333f: S4's tip is the same code without this change.

**npm test (item 8):** 2872 passed, 9 skipped (S4: 2870). The goldens are green.

### Crops looked at (item 6)

- **`crops/cyc_e210_moments_seam_x3.png`:** the box where S4 and S4b differ, at four moments, S4 on top, 3x of the 2x sheet. S4's moments 2 and 3 show the band's bright crest ending in a hard edge on the ribbon. In S4b the crest fades into the ribbon with no edge.
- **`crops/cyc_e210_kymo_cols7-67_x3.png` and `cyc_e210_kymo_c10-29_c44-63_x8.png`,** read with `crops/kymo_steps.txt` (column-to-column luma jumps, max over 72 time rows):
  - S4's vertical step at the band's reach (col 53->54) is gone. On S4 it reached 49.6 luma and topped 10 luma in 28 of 72 rows. On S4b the max is 4.4, with 0 rows over 10.
  - A second vertical step, at col 20->21, is the same on both builds: up to 40.2 luma on S4 and 42.9 on S4b, in 28-34 of 72 rows. It is not the ridge fade, and it is unattributed (Open 2).
- **`crops/loop_e102_kymo_cols0-59_x3.png` and `cols196-255`:** S4 and S4b are identical, and the crests run smoothly through both fans. S4's loop improvement survives.

### Items 3 and 4: measured, not fixed

No stand shows either case. Every two-ended arm's joint ridge factor reads 1.000 in table_cyc's TWO lines, and there is no RARE flag.

`ridge_joint.ts` measures both cases on the CPU twins:
- Setup: dA 5, W 2.5, spacing 2.5.
- The metric is the step |parent - child| at the joint, max over 400 clocks and the four direction pairs. Results are in `out/s4b/ridge_joint.txt`.
- For scale, S4's e210 defect read 0.9859 in the same units.

| Case | xR | Step |
|---|---|---|
| control | 0.75, 0.5 | 0 |
| item 3 | 0.4 | 0.18 |
| item 3 | 0.3 | 0.36 |
| item 3 | 0.2 | 0.54 |
| item 3 | 0.1 | 0.72 |
| item 3 | 0.03 | 0.846 |
| ridge at the joint | 0 | 0.90 |
| item 4 (dB + W < dA) | -0.03 | 0.8865 |
| item 4 | -0.1 | 0.89 |
| item 4 | -0.25 | 0.90 |
| item 4 | -0.5 | 0.90 |
| item 4 | -1.0 | 0.625 |

What this shows:
- **The band is not the cause.** Its 0-/0+ step equals the ribbon step on every row. The step belongs to the ribbons themselves: a full parent crest meets the child's ridge-faded crest, or the child's other-end train. The band now reproduces that exactly.
- **Item 3** is real whenever 0 <= xR < 0.5.
- **Item 4** is possible by construction, read from the code and not observed on a stand. pulse_path.ts builds its tree with a Dijkstra over lattice lengths (stable while the knot moves), but dist0 sums drawn spans. So a two-ended arm can have dB + W < dA, and its A end then reads B's train at d = 0.
- **How often: not measured.** The two cycle arms on the stands (cyc e210, loop e102) both read 1.000 at both ends. If the ridge fell uniformly along an arm, it would sit within 0.5 of one end or the other for 1/W of head positions (0.4 at W 2.5). So item 3 may not be rare in play. A head-position sweep on a cycle stand would measure it.

Fix options, none built (the time cap, and each needs the cold compile, sheets and looks again):
- **(a) Per-side fade width,** F_side = min(F, xR_side), in kPulseV2 and the band. It costs about 80-100 section characters, with 49 left. It fixes item 3, but the fade turns back into a step as xR -> 0, and it does not touch item 4's phase.
- **(b) Recommended: crossfade in the band.** The band's child side fades from the parent's train (factor 1, the parent's phase) at tau 0 to the ribbon's value at the fan's reach. That is continuous with both arms in items 3 and 4, and it costs junction-field characters only. It changes e210 slightly inside the fan, so it needs looks.
- **(c) Item 4 at the source:** in pulse_path.ts, clamp dist0 so that dA <= dB + W, or re-root the arm at its nearer end. It is CPU only, but it changes the phase along the arm, so it needs looks too.

### Open

1. **Items 3 and 4's joint step** (above). It needs a stand and fix (b).
2. **The col 20->21 kymograph step on cyc e210,** on both builds, is unattributed. Hypothesis, untested: a band-territory edge inside node_218's fan, where e210's centerline passes from another band's pixels to the e39->e210 band's.
3. **The band ignores the child arm's end window.** x4 mnode_27 e135->e18 reads 0.0170 in BAND EXTENT on S4 and S4b. This predates S4b.
4. **BAND EXTENT stops at the arm's W.** It does not follow a band past a short arm's far junction.
5. **Budgets:** JUNCTION_FRAG is at 40,342 of 40,350 (8 left), SECTION_FRAG at 59,001 of 59,050 (49 left). The next junction change needs a slimming pass or a budget decision.

### Next step

1. Build a stand for item 3, or inject paint K299-style on cyc e210 with dB chosen so that xR is 0.2. For item 4, choose dB so that xR < 0.
2. Confirm the step on the GPU.
3. Build fix (b), with its CPU twin and a test that pins band = parent at tau 0 and band = ribbon at the reach.
4. Re-run the table, locality, sheets and K307.

### Env

- **Dev server,** for dumps (start it fresh after the last edit): `npx vite --config .claude/probes/K1139/vite.private-cache.config.ts --port 5620`.
- **Builds:** `scripts/preview.ps1 -Ref <sha> -Root $env:TEMP\knotmaze-previews\k1139s4b -BuildOnly`, then `npx vite preview --outDir <dir> --port 5630 --host 127.0.0.1` (5631 for a second build). Without `--host` the preview binds only ::1.
- **GPU batches:** `& .claude/probes/K1139/run_locked.ps1 -Batch <relative name>`.
- **CPU twins:** `node scripts/run_node.mjs .claude/probes/K1139/ridge_joint.ts`.
