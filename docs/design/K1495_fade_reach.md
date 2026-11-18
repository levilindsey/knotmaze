# K1495: rp=gf's crossing fade is shorter than today's on Levi's link (Claude agent stage)

## What Levi saw (2026-11-17, on `https://levi.dev/knotmaze/?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1`)

"I don't see any fading happening, regardless of the slider value." The slider is the panel's "Crossing fade"
(`fadeLength`, URL key `fl`, 0 to 1.2, default 0.14). He wants to keep adjusting it on the fly.

## What is known

- K1492 (merged 3d7acffe; read `### Handoff K1492` in `docs/design/K1492_border_fade.md` whole) made the border
  look's outline fade over the same ramp as the fill look's fill: `.claude/probes/K1492/out/sheet_fade.png`.
- Its tables (`.claude/probes/K1492/prof.py`, `out/t_prof.json`) show that ramp is short on link A: the fill's
  10%-90% ramp at fl 1.2 has a median of about 11.5 device px, where the slider's value asks for about 51;
  link B (`?3&xp=off&am=instant&rp=gf`) reaches 20.5. Untested suspects: K1458's clearance scales (they cap a
  ramp by the room to the next crossing; read `### Handoff K1458` in `docs/design/K1458_gf_crossing_fade.md`),
  the gap's window (K1423).
- Nobody has put TODAY's renderer (the same link without `rp=gf` and `gfh`) beside gf at the same crossings.
  Link A is dense, so today's fade may be capped there too. That comparison decides whether there is a fault.
- At two crossings (x75, x103) K1492's outline ramp reads 2-7 px against the fill's 11, and at some the outline
  fades over a longer stretch than the fill (x104: 28 and 21 px against 18). K1496.

## Do

1. **Measure today's against gf, first.** Link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant`, then with
   `&rp=gf&gfh=1`), at rest, frozen at one physics hash, at fl 0.14, 0.5 and 1.2, at K1492's eight crossings
   plus four dives under a junction: the under thread's coverage along its centre line against arc distance
   from the over thread's edge. Today's renderer draws filled threads with a casing, so compare like with
   like: gf's fill look (`&tlk=fill`) against today's, and say where the border look's outline sits beside
   both. The number per site and fl: the 10%-90% ramp length and where the ramp starts and ends, today | gf.
   If gf's ramp equals today's within 15% or 2 device px at every site, there is no fault: stop, write the
   table and a sheet (below), and report that.
2. **Otherwise find what caps gf's ramp and fix it** so gf's ramp equals today's within 15% or 2 device px
   (whichever is larger) at all three fl values, in the fill look and, through K1492, in the border look;
   it follows a live slider move with no reload, awake or asleep; fl 0 stays a crisp cut.
3. **x75 and x103**: look at them on 4x tiles in the border look at fl 1.2. Say whether the outline's fade is
   short there or the probe misreads it; fix it if it is short.

## Done

- Item 1's table on master, and on your tip if you changed anything.
- A sheet `.claude/probes/K1495/out/sheet_reach.png` for Levi: six crossings at 4x, columns today fl 1.2 | gf
  border look master fl 1.2 | gf border look tip fl 1.2, then the same three at fl 0.5, labelled in plain
  words. Look at it yourself and say plainly whether gf's fade now reads as long as today's, smooth, with no
  stairs, bands, ticks or dots (K1458 left stairs and radial bands at fl 1.2 in the fill look: say whether
  they are still there).
- If src changed: at fl 0.14 the 327-site sweep on link A (`.claude/probes/K1482/cap.mjs`,
  `.claude/probes/K1492/sweep_diff.py`) changes only at under-thread ends beside a crossing, each changed
  site tiled master | tip | diff and looked at; fl 0 is 0 px against master in both looks;
  `.claude/probes/K1492/dragcheck_b.mjs` passes in the border look and `.claude/probes/K1458/dragcheck.mjs` in
  the fill look; `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green.

A partial result lands: item 1's table and the cause alone are worth merging. Say plainly which commits are
confirmed on the tiles.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`. If a fetch
  fails, retry a few times, then carry on from what you have.
- Files: `gf_look.ts` (the gap, cut, fringe, the fade's bake and clearance code), the look's uniforms in
  `gf_pass.ts` only as far as the fade needs them, their tests. Others at work: an agent on the border faults
  (`tables.ts`, `eval.ts`, `gf_keys.ts`, the key code in `gf_glsl.ts`, `gf_worker.ts`, `gf_build.ts`); Muse
  batch 26 in the main checkout (the j64 fill line in `gf_look.ts`, K1477's stub, then the look program's
  compile time in `gf_glsl.ts`). Keep the diff small and rebase on origin/master before the handoff. Do not
  change any file in the main checkout.
- The look program compiles slowly on a cold profile (60-120 s before gf's first composite): warm each
  profile once per link, and count a frame as gf's only once `composites` rises in its stats. A shader edit
  means a new cold compile: batch edits.
- **Memory and disk.** One Chrome at a time, at most two preview builds (`scripts/preview.ps1 -Port <p> -Ref
  <commit>`; it needs the worktree's node_modules complete: `npm ci` first if it is not), profiles under
  `$env:TEMP\k1495-*`, each deleted as soon as you are done with it. Before each build or Chrome launch wait
  in ONE blocking loop (15 minutes at most) while `FreeVirtualMemory` is under 3 GB or `(Get-PSDrive C).Free`
  is under 8 GB.
- Captures of one build differ load to load by tens of thousands of 1-2 level pixels: compare frames in the
  same physics hash (`.claude/probes/K1472/restab.mjs`), and profiles along named lines, not whole frames.
- Probe lore: `.claude/probes/K1492/` (shots.mjs, prof.py, sheet.py: how K1492 set the fade, measured the
  ramps and built its sheet), `.claude/probes/K1458/`.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5720-5739. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock.
- Commit WIP at every milestone, broken or not. Stage probe files with `git add -f` on the exact files or on
  your own new directory `.claude/probes/K1495`, never on `.claude/probes` as a whole, and never raw frames.
  Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried and
  why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1495` here, commit, and report: the table, the sheet's path, which commits are confirmed on
screen, a `Ledger items` list and K1495's handle fields.
