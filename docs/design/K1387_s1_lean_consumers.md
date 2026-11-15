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
