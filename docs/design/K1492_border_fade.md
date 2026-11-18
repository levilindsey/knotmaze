# K1492: rp=gf's border look does not follow the Crossing fade (Claude agent stage)

## What Levi saw (2026-11-17, on `https://levi.dev/knotmaze/?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1`)

"I don't see any fading happening, regardless of the slider value." And on the fade: "I want to continue being
able to adjust it on the fly." The slider is the panel's "Crossing fade" (`fadeLength`, URL key `fl`, 0 to 1.2,
default 0.14). His link draws gf's border look (`tlk=border`: outlines only, interiors clear).

## What is known

- K1458 (c5fc87d1; read `### Handoff K1458` in `docs/design/K1458_gf_crossing_fade.md` whole) fixed the fade in
  the FILL look: the under thread's fill ramps out before a crossing over today's fade, and follows the live
  slider (`.claude/probes/K1458/fade.mjs`, `dragcheck.mjs`). Its border measure (`border.mjs`) crashed and was
  never run.
- K1482 stage 5 (2026-11-18, `.claude/probes/K1482/out/s5/fade_sheet_wide.png`, `fade_sheet.png`: link A at
  fl 0 | 0.14 | 1.2) looked at the border look: from fl 0 to 1.2 the under thread's OUTLINE ends only pull back
  a few pixels and soften; nothing ramps over the ~51 device px that fl 1.2 asks for. So on Levi's link the
  slider still looks dead. Its guess from the code, not measured: `lkCut`'s ramp in `gf_look.ts` lives only
  inside the h + gap band of the over piece.
- Levi's standing decision: gf's border look stays as it is (near-black outlines on both edges). This stage does
  not restyle it. It makes the outline of the UNDER thread fade toward a crossing over the same ramp the fill
  look's fill already does, at every slider value.

## Do

1. **Measure first.** On link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`) at rest, frozen at one
   physics hash, at fl 0, 0.14, 0.5 and 1.2 (set live, like a slider drag, and also by `&fl=<v>` after the
   token): at eight named plain crossings and four named dives under a junction, the under thread's outline
   ink level against arc distance from the over thread's edge, both outlines of the under thread; beside it
   the same crossing's fill coverage profile with `&tlk=fill`. The number per site and fl: the outline ramp's
   10%-90% length against the fill ramp's. Print what `lkGap` / `lkCut` / `lkFringe` return along that line
   on the border pass to find what caps the outline's ramp.
2. **Fix it** so the outline's ramp equals the fill's (within 15% or 2 device px, whichever is larger) at all
   four fl values and follows a live slider move with no reload, awake or asleep. fl 0 stays a crisp cut.
3. Check link B (`?3&xp=off&am=instant&rp=gf`, add `&tlk=border`) and link A without `gfh=1` the same way.

## Done

- Item 1's table on master, and on your tip after the fix.
- A sheet `.claude/probes/K1492/out/sheet_fade.png` for Levi: six sites at 4x, rows = site, columns master fl 0 |
  0.14 | 1.2, then tip fl 0 | 0.14 | 1.2, labelled in plain words. Look at it yourself and say plainly whether
  the fade is now visible and smooth (no stairs, bands, ticks or dots along the faded outline; K1458 left
  stairs and radial bands at fl 1.2 in the fill look: do not carry them into the border).
- At fl 0.14 (the default) the 327-site sweep on link A changes only at under-thread outline ends, each
  changed site tiled master | tip | diff and looked at: no new dot, stub, tick or dash, no over thread's
  outline broken. The fill look: 0 px against master at fl 0, 0.14 and 1.2.
- `dragcheck.mjs` passes in the border look; `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A;
  `npm test` green.

A partial result lands: item 1's table and the cause alone are worth merging. Say plainly which commits are
confirmed on the tiles.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`. If a fetch
  fails, retry a few times, then carry on from what you have.
- Files: `gf_look.ts` (the gap, cut, fringe and border composite code), the look's uniforms in `gf_pass.ts`
  only as far as the fade needs them, their tests. Others at work: an agent on the border faults (`tables.ts`,
  `eval.ts`, `gf_keys.ts`, the key code in `gf_glsl.ts`, `gf_worker.ts`, `gf_build.ts`); Muse batch 26 in the
  main checkout (the fill colour in `gf_pass.ts`'s composite, the j64 fill line in `gf_look.ts`, K1477's stub,
  then the look program's compile time in `gf_glsl.ts`). Keep the diff small and rebase on origin/master
  before the handoff. Do not change any file in the main checkout.
- The look program compiles slowly on a cold profile (60-120 s before gf's first composite): warm each
  profile once per link, and count a frame as gf's only once `composites` rises in its stats. A shader edit
  means a new cold compile: batch edits.
- **Memory and disk.** One Chrome at a time, at most two preview builds (`scripts/preview.ps1 -Port <p> -Ref
  <commit>`; it needs the worktree's node_modules complete: `npm ci` first if it is not), profiles under
  `$env:TEMP\k1492-*`, all deleted when you stop. Before each build or Chrome launch wait in ONE blocking loop
  (15 minutes at most) while `FreeVirtualMemory` is under 3 GB or `(Get-PSDrive C).Free` is under 8 GB.
- Captures of one build differ load to load by tens of thousands of 1-2 level pixels: compare frames in the
  same physics hash (`.claude/probes/K1472/restab.mjs`), and profiles along named lines, not whole frames.
- Probe lore: `.claude/probes/K1482/cap.mjs` (the 327-site sweep's capture), `.claude/probes/K1482/s5/` (how
  stage 5 set the fade live and tiled it), `.claude/probes/K1458/`.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5700-5719. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files and sheets, not raw frames).
  Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried and
  why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1492` here, commit, and report: the table, the sheet's path, which commits are confirmed on
screen, a `Ledger items` list and K1492's handle fields.
