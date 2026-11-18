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

### Handoff K1492

Agent aebdeea6fdd0e38c8, 2026-11-18 04:34-05:50, branch `worktree-agent-aebdeea6fdd0e38c8`, rebased on
origin/master dedff12b. Commits: 8877d612 (the fix: `gf_look.ts` + `test/render/gf_look.test.ts`), acaacf1b
(sheet, ramp tables, probes), 6b3d450c (sweep tiles). Not pushed.

**Cause.** The border look's composite thresholds the outline ink AFTER the gap has scaled it
(`a = clamp((ink - 0.36) * 3.5)` on `ink *= 1 - lkg`). The outline therefore moves only while the cut ink sits
in [0.36, 0.65]: about a fifth to a half of the gap's ramp. At fl 0.14 that is no ramp at all.

**Fix (8877d612, `gf_look.ts` only).** The label site writes the gap's keep factor into the label flag lane,
`lkCo.a = max(1 - lkg, 1/255)` for labelled pixels (it was 1). The border composite divides it back out before
its threshold and multiplies after: `m = k.a > 0 ? k.a : 1; a = clamp((min(ink / m, 1) - 0.36) * 3.5) * m`.
The outline is then thresholded on its uncut ink and faded by the gap's own ramp, exactly like the fill. The
fill and every other reader of `k.a` test only `k.a > 0`, so they are unchanged. `gf_pass.ts` is untouched.

**Ramp table** (`prof.py`, link A, one physics hash, 41 clean crossing sides; median 10-90% ramp along the
under thread in device px; the fade set live as a slider drag does):

| fl | fill | master outline | tip outline |
|---|---|---|---|
| 0 | 0 | 0 | 0 |
| 0.14 | 2.6 | 0.0 | 1.5 |
| 0.5 | 6.4 | 3.6 | 5.5 |
| 1.2 | 11.5 | 6.4 | 10.2 |

Link B (`?3&xp=off&am=instant&rp=gf&tlk=border`, tip, 36 sides): fill 0 / 3.6 / 20.5, outline 0 / 3.8 / 21.8
at fl 0 / 0.14 / 1.2. Link A without gfh=1 (tip): fill 0 / 2.6 / 11.7, outline 0 / 1.5 / 10.2. Per site:
`out/m_prof.json`, `out/t_prof.json`.

**Sheet.** `.claude/probes/K1492/out/sheet_fade.png`: six crossing sides at 4x, master fl 0 | 0.14 | 1.2, then
tip at the same three. Looked at: master's outline ends are blunt at 0.14 and short at 1.2; the tip's fade
softly at 0.14 and over a long smooth ramp at 1.2, with no stairs, bands, ticks or dots; tip fl 0 is the same
crisp cut as master. Link B's tiles (not committed) look the same way.

**Checks.**
- Fill look, master against tip, same hash: 0 px differ at fl 0, 0.14, 0.5 and 1.2.
- Border look at fl 0: 12,156 px differ by at most 13 levels, all within about 1 world of a crossing (median
  0.56): the cut's own anti-aliasing, now scaled rather than thresholded. The tiles read the same as master's.
- Sweep at fl 0.14 (link A, same-hash frames, K1482's 327 sites; `sweep_diff.py`, `out/sweep_fl0.14.txt`):
  87 sites changed (36 junctions, 51 tails), 20,652 px by more than 2 levels, max 14. Every changed site is
  tiled master | tip | diff in `out/sweep_tiles_00..02.png` (K1482's `tiles.py`) and I looked at all of them:
  the changes are under-thread outline ends at crossings. Only 56 changed pixels lie more than 1.3 world from
  an on-screen crossing; not examined one by one.
- `dragcheck_b.mjs` (K1458's dragcheck with TLK=border) on the tip: PASS at stops 0.5, 1.2, 0.14 in one run
  and 0, 0.14 in a re-run from 0.5 (the first run's stop 0 never got a fresh load in the dragged state, so it
  was not compared); 0 px over 24 levels at every stop.
- `hold.mjs` (K1450), link A, warm, EDGE 16: 60/60.
- `npm test` green after the rebase (254 files, 3171 tests).
- On screen: the fix was built and shot as e222acf5 (the same patch before the rebase). The rebase brought
  26F's composite blend change (`gf_pass.ts`, K1474); that combination has not been on screen.

**Open.**
- x75+ and x103+ still read short outline ramps at fl 1.2 (3.8/6.8 and 2.1/5.1 px against the fill's 11):
  maybe the probe (the outline ring there runs beside the over thread), not looked at on tiles.
- Some sides' outline ramps now run longer than the fill's (x104+ 28/21 against 18, x63+ 21/17 against 15).
- The fill's own ramp on link A at fl 1.2 is 11.5 px, far short of the nominal ~51 device px (link B: 20.5).
  Inferred, untested: K1458's clearance or the gap's window caps it. That is the fill's ramp, outside this
  brief; the outline now follows whatever it is.
- The four dives were not measured separately.

**Ledger items.**
- K1492 · border outline fade: fixed on the branch (8877d612); merge it, then a look on screen with 26F's blend
  change.
- New: x75/x103 outline ramps short at fl 1.2 (probe or real; `out/t_prof.json`).
- New: the fill's crossing ramp on link A at fl 1.2 is ~11.5 px against ~51 nominal: find what caps it.

**Handle.** branch `worktree-agent-aebdeea6fdd0e38c8` (worktree
`.claude/worktrees/agent-aebdeea6fdd0e38c8`); last commit: this handoff's commit; evidence
`.claude/probes/K1492/` (`out/sheet_fade.png`, `out/*_prof.json`, `out/sweep_*`); next: merge to master,
then check one border-look frame on screen with K1474's blend.
