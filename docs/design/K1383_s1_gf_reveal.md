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
