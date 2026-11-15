# K1387 stage 1: what lean mode stops feeding (K1387, K1388)

Coordinator brief, 2026-11-14. Context: K1369 s3's handoff (`docs/design/K1369_s3_lean_default.md`) and the K1362
lore (`.claude/rules/render-gpu-field.md`).

## Where it stands

- **rp=gf runs the ribbon renderer lean** (`RibbonRenderer.lean`, K1369 s3, its default):
  - the gap solve writes only `bindingPoint(over)`, the one output gf's gather reads;
  - the fill extrude is skipped;
  - under gf, main skips `renderer.update()` while builds are in flight.
  It is what lets the Pixel move the knot at 45-54 builds a second in the intro.
- **Two consumers still read what lean no longer writes:**
  - **K1387:** `underWindows` (`ribbon_renderer.ts`) stays empty, so the maze's under-gap hiding stops for reveal
    sparks, the telegraph rim ends, burn sparks, the yarn, `underClipBand` (`fabric_maze_renderer.ts`) and
    `src/render/ribbon/joinery.ts:1575`.
  - **K1388:** the site tester (`src/app/input_pointer.ts:875`, `src/app/auto_audio.ts:114`) reads stale footprint
    widths.
- Both block rp=gf going on by default.

## Goal

Under rp=gf, everything that hides under an over-thread hides as it does in today's look, and the site tester reads
current widths, while lean keeps its speed. The technique is yours. For example:
- lean could write the few outputs these consumers need;
- the consumers could compute what they need on demand;
- or they could read gf's own data.

## Done

1. **Each consumer behaves as today's under rp=gf.**
   - Show it on a maze link where each one appears (the reveal sparks and burn sparks in an intro, the telegraph and
     the yarn in play, `underClipBand`, the joinery case), today against rp=gf.
   - Use crops at the crossings, or numeric checks where a picture cannot show it (the site tester's widths
     against the full solve's).
   - Put each path in the report.
2. **Lean keeps its speed:**
   - on the Pixel, main ms per frame and gf builds per second in intro-d and the drag stay within noise of base
     (ABBA, the K1369 s4 runner `.claude/probes/K1369/`), or the cost is recorded with the clocks;
   - the drag's sim/wall is recorded beside it.
3. **Nothing else moves:**
   - with rp=gf off, today's look is unchanged (the goldens, `byte_identity` included);
   - `npm test` green;
   - rp=gf stays off by default.

## Rules

- **Order:** desktop first (the fix, the checks, the tests). Commit, then do the Pixel part.
- **The phone:**
  - Never wake, unlock or rotate it; never press Home or send it any input; never restart Chrome on it. Open and
    close only your own tabs, through DevTools.
  - Wait at most 30 minutes per attempt.
  - Hold the phone lock for each phone part.
  - No device serials, IP addresses or Tailscale names anywhere.
  - Another agent may hold the phone lock: wait for it inside one blocking command.
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
  - their tests;
  - `.claude/probes/K1387/`. Copy inputs from the main checkout's `.claude/probes/`; never write there.
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
- the checks' paths and results;
- the Pixel numbers, with the clocks;
- `npm test`;
- your last SHA.

End with `Ledger items` and K1387's handle fields (owner, branch and worktree, last commit, evidence, next, brief).

## Handoff (s1, 2026-11-15)

Start 23:25 PT 2026-11-14. The Claude Code process exited at 00:12:02. Resumed at 07:23 and stopped at 07:28, well
inside the coordinator's 08:30 stop. The lazy march (Next) was judged too broad to land and re-verify by then.

- **What changed (f05c14fd).**
  - `crossing_gaps.ts`: the full solve's setup and under march moved into `solveUnder` (results in an `UnderMarch`).
    Lean mode's new `leanSlot` shares it and writes only what the consumers read:
    - slotAll*/slotCut* and `slotLive`;
    - the chainCuts quad (underCutCtrls);
    - the underWindows triple (underGapVisibility, underClipBand, the joinery reader);
    - diagData x,y.
  - `ribbon_renderer.ts`: `pluckSiteTester()` runs `leanFresh()` first. `input_pointer.ts` (the release) and
    `auto_audio.ts` call it. Tests are in `test/render/lean_mode.test.ts`, and the fake in `test/app/tug_toggle.test.ts`
    gains the method.
- **Done 1, numeric (no crops).** `node .claude/probes/K1387/k1387_exact.mjs <origin> <label>` compares
  full/lean/full bitwise per consumer on `b.FMKB4DIQ&snd=none&rp=gf&phw=0`.
  - Branch (`out/exact_branch.log`): F/L = 0 in every scenario.
    - Intro: 22 checks, windows 1 to 353.
    - Rest and mid-drag: hiddenVis 2846 and bands 3652.
    - Release: footprintsWrong 0.
    - xp=threads 6/6, fi=fuse 350/350.
  - Base 2b1cffe1 (`out/exact_base*.log`):
    - Intro F/L up to 3598, with lean windows 0 against full 353.
    - Release footprintsWrong 1400.
- **Done 2, Pixel ABBA (`k1387_phone.ps1`, `out/motion_p1.json`).**
  - Run 00:05:04 to 00:07:57 PT 2026-11-15, base 2b1cffe1 against head f05c14fd, rp=gf, 2 reps.
  - The fix costs main-thread time, and the cost is recorded:
    - intro-d: main ms/frame 12.09/12.18 base vs 13.17/13.07 head (+1.0);
    - drag: 5.59/5.38 vs 5.85/5.89 (+0.4).
  - gf builds per second are within noise: intro-d 51.5/47.2 vs 51.9/48.3, drag 20.0/18.6 vs 18.8/19.1.
  - Drag sim/wall: .886/.807 base vs .825/.784 head. Frame p50 is 16.7 ms everywhere.
  - Desktop (`k1387_cost.mjs`, `out/cost_desktop.log`, 00:09:48 to 00:11:29, perf lock held): the lean update's median
    is 4.50 ms base vs 6.40 ms branch, and the full update's is 11.80 vs 11.90.
  - The cost is the under march, which base's lean skipped. Base also left `slotLive` unset in the intro.
- **Done 3.** `npm test` is green at 875c95fb (07:27: 241 files, 3042 passed, 18 skipped; `out/npm_test_final.log`). byte_identity and the goldens pass, and rp=gf stays off
  by default (pinned in `lean_mode.test.ts`).
- **Next.** Win back lean's +1.9 ms with a lazy, per-under-chain march. There are many readers, and each needs a flush
  point:
  - `explore_gaps.ts` reads slotLive and slotAll*/slotCut* every frame;
  - the pluck footprints;
  - underGapVisibility, underClipBand and underCutCtrls;
  - the joinery underWindows reader.
  - Gate: k1387_exact F/L = 0, then re-run the cost probe and the Pixel ABBA.
