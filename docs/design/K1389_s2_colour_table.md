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
