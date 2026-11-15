# K1387 stage 2: lean's under march, only where it is read

Coordinator brief, 2026-11-15. Context: s1's handoff at the end of `docs/design/K1387_s1_lean_consumers.md` and the
K1362 lore (`.claude/rules/render-gpu-field.md`).

## Where it stands

- **s1 is merged** (119249c0). Lean mode (`RibbonRenderer.lean`, rp=gf's default) now runs the shared under march
  (`solveUnder` in `crossing_gaps.ts`), and `leanSlot` writes what the consumers read: slotAll*/slotCut*,
  `slotLive`, the chainCuts quad, the underWindows triple and diagData. `pluckSiteTester()` refreshes lean first.
  `k1387_exact.mjs` shows zero differences against the full solve.
- **It costs main:**
  - on the Pixel (rp=gf, ABBA): +1.0 ms per frame in intro-d (12.1 to 13.1), +0.4 ms in the drag (5.5 to 5.9);
    gf builds per second within noise; the drag's sim/wall .886/.807 to .825/.784;
  - on the desktop the lean update's median went from 4.50 to 6.40 ms.
- **s1's checks were numeric only:** no picture shows the consumers under rp=gf.

## Goal

Win back lean's cost while every consumer stays exact. The technique is yours. s1's handoff proposes a lazy,
per-under-chain march with a flush point at each reader:
- `explore_gaps.ts` (slotLive, slotAll*/slotCut*);
- the pluck footprints;
- underGapVisibility, underClipBand and underCutCtrls;
- joinery's underWindows reader.
First find which readers run on which frames (intro, rest, drag, play): a lazy march gains only on frames, or
chains, that nobody reads.

## Done

1. **Exact:** `k1387_exact.mjs` shows zero differences between full and lean in every scenario s1 checked.
2. **The cost is back,** with the clocks:
   - Pixel ABBA (`k1387_phone.ps1`), rp=gf: base 2b1cffe1 (before s1), s1's merge and head; main ms per frame and gf
     builds per second in intro-d and the drag, and the drag's sim/wall. Head within noise of 2b1cffe1, or the
     remaining cost recorded with what it buys;
   - the desktop lean update's median (`k1387_cost.mjs`), the same three.
3. **Pictures,** today against rp=gf, crops at the crossings where each consumer shows: the reveal sparks and burn
   sparks in an intro, the telegraph and the yarn in play, underClipBand, the joinery case. Paths in the report,
   with anything that differs.
4. **Nothing else moves:**
   - with rp=gf off, today's look is unchanged (the goldens, `byte_identity` included); `npm test` green;
   - rp=gf stays off by default.

## Rules

- **Order:** desktop first (the march, the exact check, the pictures, the tests). Commit, then the Pixel part.
- **The phone:**
  - Never wake, unlock or rotate it; never press Home or send it any input; never restart Chrome on it. Open and
    close only your own tabs, through DevTools.
  - Wait at most 30 minutes per attempt. Hold the phone lock for each phone part; another agent (K1389) may hold it:
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
  - `src/render/ribbon_renderer.ts` and `src/render/ribbon/*`;
  - `src/render/fabric_maze_renderer.ts`, `src/render/appear_fx.ts`;
  - `src/app/input_pointer.ts`, `src/app/auto_audio.ts`;
  - their tests; `.claude/probes/K1387/`. Copy inputs from the main checkout's `.claude/probes/`; never write there.
  - Another agent (K1389) works in `src/render/gpu_field/*` and the gf branches of `src/app/frame_loop.ts`. If you
    need a change there, keep it to a few lines and name it in the report.
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
- the exact check's result;
- the cost, with the clocks;
- the pictures' paths and what differs;
- `npm test`; your last SHA.

End with `Ledger items` and K1387's handle fields (owner, branch and worktree, last commit, evidence, next, brief).

## Handoff (s2, 2026-11-15)

Start 07:35 PT, stop 09:05. Outputs are under `.claude/probes/K1387/out/` (untracked).

- **What changed (46438e0e).** Lean's under march now runs only where something reads it.
  - `leanSlot` still runs the setup and writes diagData x,y. Each crossing's march waits in a queue on its under
    chain (`lazyByChain` in `crossing_gaps.ts`, pooled `UnderMarch`es).
  - `leanReset()` drops the queue at the start of each update(), after `underWindows.clear()`.
  - Every reader flushes its chain first:
    - the façade's underClipBand, underGapVisibility and underCutCtrls (`leanFlushChain`);
    - joinery's gapNearOf (`leanFlush(arm.chain)`);
    - explore_gaps' applyExploreGaps (each live slot's under chain).
  - Pluck sites and footprints keep `leanFresh()`, a full update whenever lean is stale.
  - `leanMarchStats` reports `{queued, marched, pending}`.
  - Tests (`test/render/lean_mode.test.ts`): flushAll against leanReset, and a source scan that fails when a reader
    of the lazy outputs does not flush first.
- **Done 1, exact.** `k1387_exact.mjs` on head (`exact_s2head.txt`): full/lean differ by 0 in intro, rest, mid-drag,
  xp=threads and fi=fuse. verdictsWrong and footprintsWrong are both 0.
  - Marches run (queued to marched): intro 9449 to 4095, 26304 to 7192 and 19599 to 521; mid-drag 5648 to 0.
- **Done 2, cost.**
  - Desktop lean update median (`k1387_cost.mjs`, perf lock held). Head is back to base:
    - base 2b1cffe1 4.80 ms against head 4.90 (full 12.40/12.00; `cost_s2_2b1c_vs_head.txt`, 08:02 to 08:05);
    - s1 119249c0 6.40 against head 4.70 (full 12.10/11.90; `cost_s2_1192_vs_head_2.txt`, 08:29 to 08:33).
    - The first 119249c0 run (`cost_s2_1192_vs_head.txt`) ran under outside load: 10.60/7.60.
  - Pixel: NOT RUN. The phone's screen stayed off through two ready-checks, 08:28 to 08:36 and 08:42 to 09:01 (26 min;
    the check never wakes it), so the phone lock was never taken. It is the one open Done item; see Next.
- **Done 3, pictures.**
  - Play, same-state (`k1387_play.mjs 7 4`: seed 7, mt=hunter, four moves, every clock pinned, perf lock held
    08:23 to 08:26; `play7_*.png` and `_head.png`, diffs by `k1387_pngdiff.mjs`). These are whole-frame diffs, so
    every consumer drawn in the frame counts: the telegraph, the yarn, the under clip band and the junction webs.
    Beyond the 480x360 crop around the head, no consumer has a zoomed crop of its own.
    - Head gf against a head gf control: 0 px.
    - s1 gf against head gf: 286 px, all in the build stamp's text; the head crops differ by 0 px.
    - Today against gf: 88,867 px. gf draws no gold traveled path. The same happens on s1, so it predates s2; it is
      K1389's colour-table area.
  - Intro sheets (`k1387_sheet.mjs`, `b.FMKB4DIQ&phw=0&fw=0`: `s2h_def_sheet.png`, `s2h_burn_sheet.png`). Today's
    row shows ribbons through the reveal, plus its sparks. The gf row shows only the sparks, on s1 too. Both rows'
    end+2s frames are blank (the link's own reveal).
    - s1 gf against head gf differs by 2k to 77k px along the reveal front. That pair is not same-state: the pinned
      clocks land 0.02 to 0.17 s apart between loads, and fxAlive differs by a few percent. Done 1 is the exactness
      evidence for the intro.
  - gf's `rvPasses` read 473 on head against 723 on s1 at t=14. It counts dirty frames, so it depends on the frame
    rate, and these runs shared the desktop with K1389's captures. The Pixel's builds/s is the figure to trust.
- **Done 4.** `npm test` is green on 46438e0e (07:50: 242 files, 3049 tests). byte_identity and the goldens pass, and
  rp=gf stays off by default. Later commits touch only `.claude/probes/K1387/`.
- **Residual.** Under xp=threads and fi=fuse, applyExploreGaps flushes every live slot's chain. Lean marches
  everything there, so those modes keep s1's cost.
- **Tools added.** `k1387_play.mjs` (same-state play A/B), `k1387_pngdiff.mjs` (a PNG diff with no dependencies),
  `k1387_sheet.mjs` (K1383's intro sheet) and `serve_builds.mjs` (a static server for built folders).
  `k1387_phone.ps1` now copies both `-Base` and `-Head`; s1's line copied an undefined `$Sha`.
- **Next.** Run the Pixel ABBA once the phone is awake and idle, then merge. It needs about 3 min of phone time,
  as s1's did:
  `pwsh -NoProfile -File .claude/probes/K1387/k1387_phone.ps1 -Base 2b1cffe1 -Head 46438e0e -Label s2p1 -Cells
  def:gfg:intro-d,def:gfg@b:intro-d,def:gfg:drag,def:gfg@b:drag`.
  - Without `-Builds`, phone_pass builds both commits. Alternatively, `scripts/preview.ps1 -Ref <sha> -Root <dir>
    -BuildOnly` builds them and `-Builds <dir>` copies them in.
  - Read `out/motion_s2p1.json`: main ms/frame and gf builds/s in intro-d and the drag, and the drag's sim/wall.
  - The desktop says head matches base. If the Pixel disagrees, record the remainder against s1's +1.0/+0.4 ms.
