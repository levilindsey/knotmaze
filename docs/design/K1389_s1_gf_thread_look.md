# K1389 stage 1: today's thread look under rp=gf

Coordinator brief, 2026-11-14. Context: the K1362 lore (`.claude/rules/render-gpu-field.md`) and K1383 s1's handoff
(`docs/design/K1383_s1_gf_reveal.md`), whose table-beside-the-tables pattern this stage can follow.

## Where it stands

- **Junctions and outlines are Levi's priority** (2026-11-11). rp=gf is the junction route (form B per pixel). It is
  off by default, and this is one of the gaps to close before it goes on.
- **rp=gf draws one look:** a cream fill (`FILL` in `gf_app.ts`) with ink outlines. It ignores:
  - the section colours: the per-run colour table, `src/core/section_colors.ts`, painted through G2's shader paint
    (`paint_glsl.ts`, `paint_model.ts`);
  - the thread look: `threadLook` `fill | border | both` in `src/ui/url_state.ts`. `b.FMKB4DIQ` is a border link.
- **The K1383 sheets show the gap.** On b.J (the defaults) today's threads are section-coloured, while gf's are
  cream: `.claude/probes/K1383/out/b_J_def_sheet.png`. On b.FMKB4DIQ today draws outlines, while gf draws its fill.

## Goal

Under rp=gf, at rest, the threads look as today's do:
- the same section colours on the same runs;
- the `border` and `both` looks drawn as outlines the way today's are;
- form B's junctions keep their shape.

The technique is yours. Where a form B junction has no counterpart in today's look (arms of different sections
meeting in one fillet), pick the closest reading and show it. Out of scope:
- gameplay paint (the trail, pulses, hover rim, fog);
- the reveal's colours (K1395, waiting on Levi).

## Done

1. **The look matches today's at rest.**
   - Show today against rp=gf at rest for `fill`, `border` and `both` on b.J, b.FMKB4DIQ and
     `?3.FGH1HtvQeDjm6e4BII` (muse_hash), with `colorScheme` (`cs=`) at its default and at least one other value.
   - Add 400% crops of at least four junctions and two crossings per link.
   - Put each picture's path in the report, and say what still differs.
2. **The pass stays exact and cheap:**
   - the tier routing stays exact (`gf_tier_forms.test.ts` and its kin green);
   - time the pass on the Pixel with the K1362 bench (def, 822, sync4, ABBA), base against head, for fill and border.
     Record the cost and the clocks.
   - The K1362 tables digest (`.claude/probes/K1362/k1362t1_digest.ts`) stays bit-identical, so colour data goes in
     its own table, not into `buildTables`.
3. **Nothing else moves:**
   - with rp=gf off, today's look is unchanged (the goldens, `byte_identity` included);
   - `npm test` green;
   - rp=gf stays off by default.

## Rules

- **Order:** desktop first (the look, the pictures, the tests). Commit, then do the Pixel bench.
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
  - `src/render/gpu_field/*`;
  - the gf branches of `src/app/frame_loop.ts`;
  - read-only exports from `src/render/paint_*.ts` and `src/core/section_colors.ts` (no behavior change);
  - their tests;
  - `.claude/probes/K1389/`. Copy inputs from the main checkout's `.claude/probes/`; never write there.
  - Another agent (K1387) works in `src/render/ribbon_renderer.ts`, `src/render/ribbon/`,
    `fabric_maze_renderer.ts` and the pointer and audio code. Leave those alone.
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
- the pictures' paths, and anything that still looks different from today's;
- the Pixel numbers, with the clocks;
- the checks;
- your last SHA.

End with `Ledger items` and K1389's handle fields (owner, branch and worktree, last commit, evidence, next, brief).
