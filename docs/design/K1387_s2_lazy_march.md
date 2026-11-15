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
