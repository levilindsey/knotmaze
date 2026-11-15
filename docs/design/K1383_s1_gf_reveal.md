# K1383 stage 1: the intro's reveal under rp=gf

Coordinator brief, 2026-11-14. Context: K1369's stage handoffs (`docs/design/K1369_s1..s4_*.md`) and the K1362
lore (`.claude/rules/render-gpu-field.md`).

## Where it stands

- **The intro is Levi's priority** (2026-11-14: "Intro physics fps is probably more important"). Under rp=gf on the
  Pixel it now moves the knot 45-54 times a second against today's look's 18-33 fps (K1369 s3-s4).
- **The intro under rp=gf has no reveal** (K1383).
  - No trace, burn or thread reveal: the whole unsettled lattice shows from the first frame.
  - The trace effect ghosts on top at about 15 s.
  - Desktop captures: `.claude/probes/K1369/out/intro/sheet.png` (K1369 s1).
- **Today's look reveals per sample:**
  - `src/core/reveal_plan.ts` times each chain;
  - `src/render/reveal.ts` (`RevealAnimator`) turns that into per-sample width masks;
  - `src/render/appear_fx.ts` draws the front's particles over the threads.
  - The appearance modes are `APPEAR_MODES` / `APPEAR_PRESETS` in `src/ui/url_state.ts`.
- **rp=gf can do the same test per pixel.** Each pixel already knows its piece (chain) and u, so "is this (chain, u)
  revealed yet, and how wide" is a lookup in a small per-chain table.

## Goal

Under rp=gf, every appearance mode reveals the knot as today's look does: the same chains and fronts at the same
times, the same widths at the front, and the effects riding the front, with no ghost afterwards. The technique is
yours. The look to match is today's reveal; where form B's junctions have no counterpart in today's look (a junction
whose arms are partly revealed), pick the closest reading and show it.

## Done

1. **The reveal draws under rp=gf** for the default appearance and every preset, with `am=instant` unchanged.
   - Show it as contact sheets of today's look against rp=gf at the same sim times (at least 6 times from the first
     frame to the end of the reveal, plus 2 s after), for the default and two other presets, on `b.FMKB4DIQ` and
     one more link. Put each sheet's path in the report.
   - No ghosting: the effect layer ends when today's does.
2. **The pass stays exact and cheap:**
   - the tier routing stays exact (`gf_tier_forms.test.ts` and its kin green);
   - once the reveal ends, the pass is the same program as before or within noise of it on the Pixel (the K1362
     bench, def, 822, sync4, ABBA);
   - record the reveal's cost during the reveal on the Pixel.
3. **The motion work holds:**
   - K1369's depth rule becomes depth 2 while the reveal runs and 1 otherwise. K1393's measurements support it, and
     the reveal's own state now tells gf when it ends.
   - The snapshot channel (opt-in) is either right through the reveal, or closed until the reveal ends (K1390,
     K1391). Say which.
4. **Nothing else moves:**
   - with rp=gf off, today's look is unchanged (the goldens, `byte_identity` included);
   - `npm test` green;
   - the K1362 tables digest (`.claude/probes/K1362/k1362t1_digest.ts`) bit-identical, so the reveal goes in its
     own table, not into `buildTables`;
   - rp=gf stays off by default.

## Rules

- **Order:** desktop first (the reveal, the sheets, the tests). Commit, then do the Pixel bench.
- **The phone:** the same rules as K1369's stage briefs.
  - Never wake, unlock or rotate it; never press Home or send it any input; never restart Chrome on it. Open and
    close only your own tabs, through DevTools.
  - Wait at most 30 minutes per attempt.
  - Hold the phone lock for each phone part.
  - No device serials, IP addresses or Tailscale names anywhere.
  - If the phone never comes free, say so, and keep the reveal's code compiled out after the reveal ends, so the
    rest-frame program is unchanged by construction.
- **Captures:** `node scripts/diag_screenshot.mjs` or a real-time headed probe. Never Chrome's
  `--virtual-time-budget`. Read `.claude/rules/probes.md` before probing: a bare URL is today's daily.
- **Shell:** PowerShell. Read code through the shell (Select-String, then 40-80-line ranges of Get-Content), with
  outputs under about 40 lines. Use the Read tool only right before an Edit, and to view images.
  - Never pipe a long-running command into `Select-Object -First`.
  - Junction `node_modules` from the main checkout; never `npm ci` or `npm install`.
  - Delete junctions with `(Get-Item <path>).Delete()` before removing a directory.
- **Your files:**
  - `src/render/gpu_field/*`;
  - the gf branches of `src/app/frame_loop.ts`;
  - exports `src/render/reveal.ts` may need (no behavior change);
  - their tests;
  - `.claude/probes/K1383/`. Copy inputs from the main checkout's `.claude/probes/`; never write there.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs.
  - Never push, never edit `LEDGER.md`, never touch the main checkout.
  - Never kill a process you did not start. No helpers.
- **Perf lock:** `$env:TEMP\claude-perf.lock` for timings, one line (owner, start time, what), held only while
  timing. If another owner holds it, wait inside one blocking command.
- **Stop:** when Done holds or 2 h after your start, whichever comes first.
  - Run `Get-Date` at the start (put the time in your first commit message) and at each milestone.
  - Leave the last 20 minutes for the write-up: commit WIP, append a handoff to this brief with your start and stop
    times, release the locks, report.
  - Neither a compaction nor context size is a stop.

## Report

Under 30 lines:
- what changed;
- the sheets' paths, and anything that still looks different from today's reveal;
- the Pixel numbers, with the clocks;
- the checks;
- your last SHA.

End with `Ledger items` and K1383's handle fields (owner, branch and worktree, last commit, evidence, next, brief).

## Stage 1 handoff (K1383 s1 agent, claude session 01SUPGULDxvE5gKXozfaFaFG; started 22:14:53, stopped 23:15, Done held)

**What changed** (diff against 23db0dcb: 8 files under src/ and test/; `gf_glsl.ts`, `tables.ts`, `gf_pack.ts` and
`src/render/field/` untouched):
- `src/render/gpu_field/gf_reveal.ts` (new). While the reveal runs, main packs today's masks into a small RGBA32F
  table. The masks are `RevealFx.widthMulFor` per ribbon sample, which is what today's ribbons draw.
  - Each chain keeps knots only where its mask changes. That is exact under the linear interpolation both use.
  - Each chain's header says hidden, full, or knots, plus the ring length (a ring's table closes at s = ring with the
    first knot's mask).
  - The table also holds a gate per corner key.
- `revealForm` derives a reveal variant of every program the pass draws (the frame tier's corner program and the
  full program, the same stencil routing). In the variant, the segment distance is divided by the mask
  (`d /= rvm`), and a corner shows only when both of its arms are full.
- `gf_pass.ts` compiles the reveal programs lazily, on the first revealing frame, and binds the table on TEXTURE5.
  `setReveal(null)` draws the original programs, so every frame outside the reveal runs the same source as before
  (test: "leaves the original programs as they were").
- `gf_app.ts`:
  - builds the table every revealing frame (stats `rvMs`, `rvKnots`, `rvActive`, `rvPasses`, `rvLast`);
  - depth is `gfDepth(..., gfRevealing)`: 2 while the reveal runs and no thread is grabbed, 1 otherwise;
  - the opt-in snapshot channel is **closed until the reveal ends** (reason `closed (reveal)`). That is the chosen
    answer for K1390 and K1391.
- `frame_loop.ts`: while gf is busy, the reveal's `lifecycle()` and tips still run, so the reveal ends and its tip
  glow draws.
- Tests:
  - `test/render/gf_reveal.test.ts`: knots, clamp and wrap, the form's anchors, originals untouched;
  - `gf_depth.test.ts`: the reveal rule;
  - K299's registry gains `rvM`'s ring wrap (`paint_ring_lap.test.ts`, reviewed).

**Sheets** (desktop, under the perf lock; today against rp=gf at 8 pinned reveal times plus 2 s after; untracked):
- `.claude/probes/K1383/out/`:
  - b.J (all defaults, fill look):
    `b_J_{def,ink-dust,trace-burn,trace-rainbow,trace-roots,bloom-comet}_sheet.png`, which is every preset;
  - b.FMKB4DIQ: `b_FMKB4DIQ_{def,trace-rainbow,bloom-comet}_sheet.png`, plus the unpinned control
    `fmk_def_live_sheet.png`.
- Fronts, chains and their order match today's at every time. Widths at the front match, the tapered tips included,
  and the FX (tips, particles, burn smoke) ride the front. There were 0 page errors.
- No ghost: at done, every gf run has tips 0 and revealOn false, and the last reveal draw lands 16-26 ms before done
  is read. The appear FX reach 0 within today's spread (ms after done, today / gf):

  | Link | trace-rainbow | bloom-comet | ink-dust | trace-roots |
  |---|---|---|---|---|
  | FMK | 1095 / 786 | 904 / 977 | - | - |
  | b.J | 699 / 779 | 935 / 942 | 598 / 673 | 1076 / 1034 |

  With def and trace-burn, the burn's tail outlives 2 s in both looks.
- am=instant under gf (b.J, FMK): no reveal table, 0 reveal passes, reveal null.
- What still differs from today:
  - gf's single cream fill has no reveal FX colors (burn tint, rainbow stripes, materialize alpha). That is K1362's
    look difference, not the reveal's.
  - The rainbow's swell (mask above 1) and its white bulb are not mirrored.
  - The edge AA taper scales with the mask.
  - b.FMKB4DIQ is threadLook border: today's rest there is faint outlines, and gf draws its fill, as at rest
    without a reveal.

**Pixel** (K156 pass at 411x753 CSS, dpr 2.625, b.FMKB4DIQ; base 23db0dcb vs head b63aee4e, 2 reps ABBA;
23:11-23:12 UTC-8):
- Conditions: thermal status 0 throughout, skin 25-32 C, both locks held. GPU clocks are p10/p50/p90 MHz.
- Each intro run follows the load until the sim sleeps (7.2-7.6 s). The reveal outlasts that, so the intro-d cells
  are the cost during the reveal; done was seen once, at today's sleep poll.

| cell | frame p50/p90 ms | app fps | main ms/frame | gf builds/s | gf main ms/frame | show ms | sim/wall | GPU MHz |
|---|---|---|---|---|---|---|---|---|
| today intro-d (head) | 16.7/66.6 | 33.7, 32.2 | 20.6, 21.5 | - | - | - | 0.75, 0.73 | 460/1286/1286 |
| gf intro-d head (reveal drawn, depth 2) | 16.7/16.8 | 59.5, 59.3 | 12.19, 11.95 | 53.5, 51.2 | 2.87, 2.73 | 33.7, 34.2 | 0.86, 0.77 | 460/940/1286 |
| gf intro-d base (gf ignores the reveal) | 16.7/16.7 | 59.4, 58.8 | 11.67, 11.70 | 53.0, 51.6 | 2.83, 2.76 | 33.6, 33.9 | 0.83, 0.80 | 460/940,825/1286 |
| gf intro-i head (no reveal, depth 1) | 16.7/16.7 | 58.1, 58.2 | 5.50, 5.59 | 19.4, 19.6 | 1.20, 1.24 | 49.6, 50.0 | 0.91, 0.87 | 460/460/1286 |
| gf intro-i base (depth 2) | 16.7/16.7 | 58.7, 59.7 | 10.24, 10.49 | 50.1, 53.9 | 2.44, 2.55 | 33.8, 33.5 | 0.81, 0.82 | 460/883,940/1286 |

- The reveal's cost:
  - +0.4 ms main per frame against base, which is the table build: 335 and 381 builds, each drawn, at p50 0.6 / 0.3,
    p90 0.9 and max 4.3 / 2.8 ms.
  - Frames, fps, build rate and latency are unchanged.
  - Today's reveal runs at 32-34 fps on the phone.
- Depth 1 outside the reveal (intro-i):
  - main busy halves (5.5 against 10.4 ms per frame);
  - sim/wall rises from 0.81 to 0.87-0.91, and the sim sleeps 0.4-0.8 s sooner;
  - builds drop to 19.5/s with show 50 ms against 34. The mid cores idle at 1920-2169 MHz against 3379, so a table
    build takes 21 ms against 12.
- The K1362 bench (def, 822, sync4, ABBA) was not run. It times the standalone gf programs, and `gf_glsl.ts`, the
  packers and the K1362 digest are unchanged, so it would have timed byte-identical programs. In the app, the head
  intro-i cells drew 0 reveal passes, so the programs drawn after a reveal are the originals.
- Runner: `pwsh -NoProfile -File .claude/probes/K1383/k1383_phone.ps1 -Head <sha> -Label <l>`
  (`k1383_motion.mjs`; output in `out/motion_<l>.json`).

**Checks**:
- `npm test` green: 241 files, 3040 tests (18 skipped). The goldens and byte_identity pass, so today's look is
  unchanged with gf off.
- The K1362 tables digest is bit-identical to 23db0dcb: `all ae1d2392...a27`, 5445 lines, 0 differing
  (`.claude/probes/K1383/k1362t1_digest.ts`).
- rp=gf stays off by default.

**Residuals**:
- The K76 thread reveal is not handled under gf.
- The tables lag the masks by the build depth.
- `pieceD` is unscaled in the ko forms.
- Tip glow positions come from the live mirror.
- A corner shows only when both arms are full.
- The Pixel runner stops at sleep, so a reveal that ends after the sim sleeps has no after-reveal window in it.
