# K1389 stage 2: gf's colour table, cheap and current (K1399), and the look's cost on the Pixel

Coordinator brief, 2026-11-15. Context: s1's handoff at the end of `docs/design/K1389_s1_gf_thread_look.md` and the
K1362 lore (`.claude/rules/render-gpu-field.md`).

## Where it stands

- **s1 is merged** (e09e1ff7). Under rp=gf the threads take today's section colours and the fill, border and both
  looks (`gf_look.ts`, the look programs in `gf_pass.ts`, the colour table in `gf_app.ts`). rp=gf stays off by
  default.
- **The colour table is the weak part (K1399):**
  - it is rebuilt from `kd.stat` and the section colour uniforms per frame, throttled: once the tables hold still for
    3 frames, after 12, or on a key change;
  - a build costs 4-5 ms on the desktop (the first ones 10-34 ms), so several times that on the Pixel's main;
  - it holds about 65,300 colours against the 65,535 cap;
  - in motion the colours lag by up to 12 frames.
- **The look's cost on the Pixel was never measured** (s1's Done 2 was skipped).

## Goal

Under rp=gf, the section colours cost main next to nothing per frame, never lag in motion, and leave clear headroom
under the cap, while the look stays as s1 drew it. Then the look's cost on the Pixel is known. The technique is
yours; s1's handoff suggests a static per-ctrl table (colours fixed when the scene or the colour inputs change, so
a frame only indexes it).

## Done

1. **The look is unchanged at rest.** s1's frozen captures (`k1389_sheet.mjs`, SIMT=20, `&phw=0`) on b.J,
   b.FMKB4DIQ and muse_hash, fill and border, match s1's within `pxdiff.ps1` noise. Report the counts.
2. **No lag in motion.** Show crops mid-drag on b.J (fill), today against rp=gf, where s1's colours lagged.
3. **The table's cost and size,** before and after: ms per frame on the desktop in the intro and the drag, the build's
   ms, and the colour count against the cap.
4. **The Pixel numbers,** with the clocks, under rp=gf:
   - the K1362 bench (def, 822, sync4, ABBA), base 2b1cffe1 (before s1) against head, fill and border;
   - main ms per frame, gf builds per second and the drag's sim/wall in intro-d and the drag (the K1369 s4 runner,
     `.claude/probes/K1369/`), base against head.
5. **Nothing else moves:**
   - the K1362 tables digest (`.claude/probes/K1362/k1362t1_digest.ts`) stays bit-identical;
   - the tier routing stays exact (`gf_tier_forms.test.ts` and its kin green);
   - with rp=gf off, today's look is unchanged (the goldens, `byte_identity` included); `npm test` green;
   - rp=gf stays off by default.

## Rules

- **Order:** desktop first (the table, the pictures, the tests). Commit, then the Pixel part.
- **The phone:**
  - Never wake, unlock or rotate it; never press Home or send it any input; never restart Chrome on it. Open and
    close only your own tabs, through DevTools.
  - Wait at most 30 minutes per attempt. Hold the phone lock for each phone part; another agent (K1387) may hold it:
    wait for it inside one blocking command.
  - No device serials, IP addresses or Tailscale names anywhere.
- **Captures:** `node scripts/diag_screenshot.mjs` or a real-time headed probe. Never Chrome's
  `--virtual-time-budget`. Read `.claude/rules/probes.md` before probing: a bare URL is today's daily.
- **Shell:** PowerShell. Read code through the shell (Select-String, then 40-80-line ranges of Get-Content), with
  outputs under about 40 lines. Use the Read tool only right before an Edit, and to view images.
  - Never pipe a long-running command into `Select-Object -First`.
  - Junction `node_modules` from the main checkout; never `npm ci` or `npm install`.
  - Delete junctions with `(Get-Item <path>).Delete()` before removing a directory.
- **Your files:**
  - `src/render/gpu_field/*` and the gf branches of `src/app/frame_loop.ts`;
  - read-only exports from `src/render/paint_*.ts` and `src/core/section_colors.ts` (no behavior change);
  - their tests; `.claude/probes/K1389/`. Copy inputs from the main checkout's `.claude/probes/`; never write there.
  - Another agent (K1387) works in `src/render/ribbon_renderer.ts`, `src/render/ribbon/`, `fabric_maze_renderer.ts`,
    `appear_fx.ts` and the pointer and audio code. Leave those alone.
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
- the pictures' paths and the pxdiff counts;
- the table's cost and size, before and after;
- the Pixel numbers, with the clocks;
- the checks; your last SHA.

End with `Ledger items` and K1389's handle fields (owner, branch and worktree, last commit, evidence, next, brief).

## Handoff (stage 2, 2026-11-15, started 07:35:12, stopped 08:42:53)

**What changed** (`src/render/gpu_field/gf_look.ts`, `gf_pass.ts`, `gf_app.ts`; tests `test/render/gf_look.test.ts`):
- The colour table is static: per chain a header (first colour texel, first position, sample count, closed), then
  LOOK_R + 1 = 9 texels per control slot holding the section colour at ctrl `sl + i/8` (RGBA32F, unit 6, `uLk`).
  It rebuilds only when `lookKey` changes (a GfLookGate over the section inputs; no geometry), not per build.
- Motion rides a per-vertex position table (R32F, unit 7, `uLkP`): each field-scene vertex's ctrl from the build's
  own KGEOM arcs (`kCtrlOfArc`), computed at gather (`lkSnap`) and carried on the flight, so the colours never lag
  the geometry they are drawn on. The shader takes the label piece's nearest segment (`lookQ`; corners `lookQs`, a
  binary search over vertex s), lerps the two vertices' colours (`lkColour`) and writes them to a second target
  (o1); the composite reads it, a label-less fringe taking its neighbour's within 2 px.
- The pass's vertices are the field scene's KEPT samples (`scene_export` `mapChain` drops a sample equal to the last
  kept one, and a ring's last kept one equal to its first): `positions()` compacts to them (377ccdd0). Before that,
  muse_hash fill had a 1825 px seam (max delta 174) at a junction.

**Done 1, the look at rest** (`k1389_sheet.mjs`, SIMT=20, `&phw=0`, against s1's `s1out/*_ss*`; px over 24 /
over 0, `out/<bJ|bF|mh>_s2c_<look>_gf.png`, crops `out/cmp_mh_fill_hot_s2c.png`):
- border: b.J 0 / 11654, b.FMKB4DIQ 0 / 1694, muse_hash 0 / 16801;
- both: 108 / 50960, 0 / 26967, 0 / 88791;
- fill: b.J 29135 (gf's stale-at-rest A/B, below; the same as s2 before the fix, 132 px apart), b.FMKB4DIQ 2,
  muse_hash 96 (scattered single pixels, max 174, no seam).
- The sub-24 counts are the lerp between kept vertices against s1's per-sample colours (inferred, not isolated).

**Done 2, motion** (`k1389s2_desk.mjs` with `SHOT=1`: a second, untimed drag on the same path, shot halfway; b.J
fill, phone viewport, rep 1): `out/cmp_s2drag_r1.png` (whole frames: today's look on head | gfg base | gfg head) and
`out/crop_s2drag_r1.png` (the grabbed point's 280 px at 2x). Under gfg the section colours sit on their threads in
both builds, with no smear or band offset at the grab. The three frames are separate live drags, so the geometry
differs: this is not a same-state A/B, and there is no pxdiff. Head cannot lag by construction: each build's
colours index positions computed from that build's own arcs and installed with it (the unit test moves an arc and
reads the new ctrl without a table rebuild). s1 rebuilt its table about 8 times a second against 26 installs in the
drag, and 4 against 45 in the intro, so its colours could be several builds old.

**Done 3, cost and size** (desktop, `k1389s2_desk.mjs`, phone viewport, b.J, base e2354e4a = s1, head 377ccdd0;
gfg, 2 reps each under the perf lock 08:39:28-08:41:32, `out/s2desk_s2base_i.json` / `s2head_i.json`,
`out/time_s2b.txt`; the first run's drag numbers, 08:32:53-08:36:46, `s2desk_s2base/s2head.json`, agree):
- size: s1's table held 65,299-65,309 colours against the 65,535 cap (99.7%); head's holds 27,081 (41%), plus one
  R32F position per kept vertex.
- the build's ms: s1 rebuilt its table 39 times in the intro and 23-25 times in the 3 s drag, at 3.4-4.0 ms p50
  (4.1-5.8 ms in the sheet captures). Head builds it once per `lookKey` (3.9 ms), then computes positions per build
  at 0.4 ms p50 (404-412 in the intro, 141-145 in the drag) and uploads them (6.7-8.7 ms in the intro, 1.1-2.3 in
  the drag, in total).
- the look's main ms per frame: drag, base 0.287-0.311 (15.6-17.0 ms/s) against head 0.192-0.208 (10.4-11.4 ms/s);
  intro, base 0.301-0.338 (16.6-17.9 ms/s) against head 0.369-0.378 (about 20 ms/s). The intro costs head more
  because it places every build (45 a second) where s1 rebuilt 4 a second and lagged.
- main ms per frame, all of it: drag, base 6.61-6.62 against head 6.56-6.63 (54.4-54.7 fps, 26.2-26.6 installs/s,
  sim/wall .579-.596 both); intro, base 13.04-13.17 against head 13.16-13.83 (53-55 fps, 43-47 installs/s, sim/wall
  .565-.575). Today's look in the same drag: main 27-29 ms/f, 32-35 fps.

**Done 4, the Pixel: not run.** `k1389s2_phone.ps1 -Shas 2b1cffe1,377ccdd0 -Label s2p -Reps 2` (the K1369 s4
runner's cells intro-d and drag under gfg, base against head, one pass per build; `out/phone_s2p.txt`) waited in the
read-only check from 08:30:34 to 08:38:57 (asleep and locked): the screen was off (exit 3), so it never took the phone lock or opened a tab,
and the brief forbids waking the phone. The K1362 bench (def, 822, sync4, ABBA) was not attempted: its variants
are the stage forms, and s1 built no bench path for the look form (the pass's second target and the composite), so
a bench of the look needs one first.

**Done 5, nothing else moves**: the K1362 tables digest is bit-identical (`ae1d2392...`, 5445 lines,
`out/digest_s2c.txt`); `gf_look` + `gf_tier_forms` 48 tests green; `npm test` green on 377ccdd0 (242 files,
3051 tests, `out/npm_test_s2c.txt`); rp=gf stays off by default (the look rides only the gf branches).

**Residuals**
- gf's stale-at-rest build: under gf, `frame_loop` skips `renderer.update()` while a build is in flight
  (`labelApp.busy()`), the skip does not set `renderDirty`, and an asleep or frozen frame returns early, so the
  pass can keep the step-before's build at rest. Two stable renders of one frozen state (b.J fill 29k px); the
  sheet's `redraw()` does not rebuild. s1's references are the stale one (inferred from the diffs to today's look).
- Channel mode (`chan`): the positions are taken on main at install, not by the gf worker (one frame behind there).
- o1 is RGBA8: colours quantize to 1/255 before the composite.
- A field-scene layout change between gather and install (a chain gaining or losing a kept sample) indexes the
  previous build's positions for that one frame (not seen).
- The position compute is now the look's main cost: 0.4 ms p50 per build on the desktop, about 28 builds a second
  in the drag (head 11 ms/s against s1's 15 ms/s of table builds). On the Pixel's main it will cost several times
  that (inferred, not measured); moving it to the gf worker (it reads only KGEOM and the kept-sample map) would take
  it off main.

**Next**: Done 4 on the Pixel when it is awake and free: run `pwsh -NoProfile -File
.claude/probes/K1389/k1389s2_phone.ps1 -Shas 2b1cffe1,<head> -Label s2p -Reps 2 -Builds "<sha>=<dir>;..."` (builds
from `scripts/preview.ps1 -Ref`; 2b1cffe1's is in the main checkout's `.claude/probes/K1387/out/pass/builds/`), and
read `.claude/probes/K1369/out/motion_s2p_<sha>.json`. Then a look-form path in the K1362 bench (the second target and
the composite) for the def/822/sync4 ABBA numbers. Then the position compute on the gf worker if the Pixel shows it.
