# K1040 S1i (K1114): bring back the corner rounding, keep the pop fixes

## Why

Levi looked at S1h's picture (`.claude/probes/K1040/s1/out/s1h/old_new.png`:
sites 02 j36, 16 j131 and 17 j99 at zoom 4, S1f's final | today) and said,
2026-11-03: "I don't like that we've lost corner rounding with the new
junction changes."

The changes are S1g's (merged at `52945e6e`; `docs/design/K1040_s1g_gates.md`,
F1 and F2), both in `src/render/field/form_b.ts`:
- **F1, the d-edge** (`dEdge: "near"`): a pass behind an arm's root cuts
  the arm at its arc distance (c = u), so L is continuous at d = 0. Before
  it, L popped from its span to 0 as a pass slid over the root (S1f F6; the
  tee and ring sweeps' ink step 1.000). At rest it moved 607 arms and 100
  corners, and 4 lost fill (muse_hash j0 0-1, j36 109-110 with r 2.721h ->
  0, j155 471-472, j156 475-473). It also drove sites 16-18's tip moves
  (0.34-0.75h; F2 0.000h there).
- **F2, the root gate** (`rootBand: 0.5`): r goes to 0 as a corner's foot
  reaches its root, so 699's window null is reached only at r = 0. Before
  it, r stepped 2.000 -> 0 at the null. At rest it moved 155 corners' r by
  0.036-0.096h measured from the corner (S1h's Findings); no fill lost.

So F1 is what took the rounding Levi saw. F2's at-rest moves are small, but
they shrink rounding too.

## The goal

At rest, the corners round as they did in S1f's final, and every pop S1g
removed stays removed:

1. **Rounding, at rest.** Against S1f's final (`FormB({dEdge: "skip",
   rootBand: 0})`, which reproduces the frozen S1f ink exactly, S1h's
   Findings): no corner loses fill, and the ink at S1h's 18 sites returns to
   S1f's or within a few device pixels of it. The F1 sites (01-05, 16-18)
   come first. Report the F2 sites (06-15) as well.
2. **The pops, in motion.** S1g's checks get no worse:
   - the tee and ring sweeps' ink step (`dedge_s1g.ts`: coarse 0.148 and
     0.174, which is the sweeps' ordinary rate; fine 0);
   - gate699's (`gate699_s1g.ts`: r's coarse step 0.030, ink 0.125, fine
     0.0006).
3. **The gate.** S1g's gate (F6) is no worse on any scene without an
   attribution. Its commands are under S1g's Handoff "Reproduce", run
   against `-Tag g1`.

There may be a real conflict. Continuity at d = 0 makes L reach 0 as a pass
nears the root, and a corner whose pass sits close behind its root at rest
then has no room. Look for a definition that avoids the conflict before
trading one goal against the other. Two directions to look at:
- the corner keeps its own room and the cut only clips its ink;
- the cut eases from S1f's span to 0 over a band at the root.

If no definition meets 1 and 2 together, stop. Show the trade-off as
pictures for Levi, rounding kept against how fast the span's end sweeps.
Don't pick a look that loses rounding on your own.

## The deliverable

`out/s1i/sheet.png`: per site, S1f's final | today | restored, at zoom 4,
with S1h's framing (`s1h_pair.ts`: zoom 4 at +-3.5h around V, dpr 2, the
same scenes and centres). Sites 02, 16 and 17 go first, because Levi saw
them. Also write play-size triples (zoom 1) and `out/s1i/index.md`, with one
row per site: the pixels that differ from S1f, and against today.

## Order

1. Measure. Find which part of the corner solve loses the room at j36
   109-110, j131 397-398 and j99 301-299 under `near`: L, the window, or the
   foot. Commit what you learn as a Finding.
2. Make the candidate definitions, behind a param as S1g did (default
   unchanged until one passes), and give each one the checks under The goal.
3. Make the winner the default, and re-run the pins and `npm test`.
4. Build the sheet and the index, then write the Handoff.

## Rules

- Work in your own worktree from master. Commit WIP at every milestone,
  broken or not, and never push. Keep harnesses and results in
  `.claude/probes/K1040/s1/` (`out/s1i/`).
- Read code through the shell: `Select-String` finds the lines and
  `Get-Content <file> | Select-Object -Skip <n> -First <m>` reads them. Use
  Read only just before an Edit.
- Lane: `src/render/field/form_b.ts`, its tests, `.claude/probes/K1040/s1/`
  and this brief. S1g changed only `form_b.ts`. If the GPU label pass
  (`src/render/field/`, `src/render/label/`) computes the same corner, say
  whether it needs the matching change, and list it under Ledger items
  instead of making it.
- Scenes are read in place from the main checkout's
  `.claude/probes/K868/scenes`. The worktree has no node_modules, and Node
  finds the main checkout's.
- Ports 5405-5409 if a server is needed.
- Don't edit LEDGER.md. End the final report with a `Ledger items` list
  (follow-ups, residuals, decisions) and K1114's handle fields (branch,
  last commit, evidence, next).
- Helpers: sonnet for mechanical work, under the same stop rule.

## Stop rule

Opus, 2 h cap. Run `Get-Date` at the start and at each milestone. Stop when
the stage is done or at the cap, whichever comes first. A compaction is not
a stop, and neither is context size. After a compaction, re-read this brief
and `git log` before going on. When you stop, commit the WIP, append a
Handoff to this brief (what landed, by commit; the sites; commands;
findings; what is left) and report.
