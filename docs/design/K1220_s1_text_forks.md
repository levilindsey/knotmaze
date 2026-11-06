# K1220 S1: a text fork reads as one fused piece, with no disc edge and no step at the arms' cuts

Ledger: K1220 (the text forks' disc and steps). Stage agent: Claude Opus in its own worktree,
started by the coordinator while K1211 S5 and K1218 S1 run in other code; cap 2 h; ports
5970-5979.

## Start

Your worktree starts from master, which holds Run N's record (655eb6a9). If it lacks this brief,
`git fetch -q origin` and `git merge --ff-only origin/master`. For `node_modules`, make a junction
to the main checkout's: `New-Item -ItemType Junction -Path node_modules -Target
C:\Users\lsl\Repositories\knotmaze\node_modules`.

## Why

Levi, 2026-11-05 (K1211): "These junctions need to appear as though they are one whole fused
seamless unit." The cursive text's forks don't. At the i fork in "ai" and at the a's two
attachments (K836), a disc of a different colour shows its round edge inside the stroke, and the
arms' straight end cuts stick out of it as a notch and a ledge (Claude, at 3x, on Run N's
`.claude/probes/K1220/run_n/out/ai_xh3_ji0_normal_3x.png` and `a_xh3_ji1_normal_3x.png`). The
maze's junctions already read as one piece: x4 ji 102 steps 1.4 inside, with no disc.

Run N (22N, `.claude/probes/K1220/run_n/SUMMARY.md`) found the cause:

- A text arm shorter than 0.15 world is dropped (`joinery.ts:1336`, `if (len < 0.15) continue;`),
  so the fork writes no field record (`joinery.ts:1409`; N's table: record -1, 0 or 1 field arms
  of 3) and falls back to a disc on the host chain's axis (`joinery.ts:1880`, radius
  `fillHalf * 0.99`), painted by the AXIS strip lookup (`junction_field.ts:366`), which blends no
  arm. The steps inside run from 28.1 (the i fork, xh 3) to 34.0 (the a's L, xh 2), against the
  maze's 1.4; with the fans hidden they fall to 3.3-4.9.
- Each arm ends in a straight perpendicular cap (`ribbon_mesh.ts:164`), and the wedge loop skips
  these forks, so K830's corner rule never reaches a text crotch: 2-4 corners at r ~1.0 fh, where
  the maze has none.

The line numbers are 02805d13's. N's task 4 lists the means (read it
whole). In short: give text forks real field records (retune the 0.15 drop for glyph scale, so
they take the maze's composed blend, arm strips and wedges), or teach the AXIS disc to blend the
fork's arms and cover the cuts' corners another way (grow or recentre the disc, draw wedges, or
round the terminal cap, which moves every open end).

Calls that bind every change here:

- K1119 (Levi): v6.8 is the approved cursive ("WAY better in all cases"). No glyph's centreline,
  width or join moves; only how a fork is filled and coloured.
- K1001 (Levi): keep K830's corner rule (`cornerRoundShare`: broad gaps round, narrow points
  sharp). A text crotch gets the rule's corner, not a new kind.
- K836: the a attaches to its undisturbed oval, tangent.
- The maze's junctions don't change (colours, fans, pins), nor anything at rest away from a text
  fork.
- A spot is judged against the approved version (master's v6.8 glyphs, the maze's fused
  junctions), never against the last step.

## Goal

Every text fork reads as one piece, as the maze's junctions do. Inside it, the colour changes no
faster than along a plain stroke (no disc edge). Its outline has no notch or ledge where an arm's
cut meets it, and its crotch takes K830's rule. The glyphs' shapes, the maze's junctions and
everything away from a text fork stay as on master.

## Read first

- Run N's `SUMMARY.md`, whole: the method, the table, the proofs, task 4.
- The headers of `src/render/ribbon/joinery.ts`, `src/render/junction_field.ts`,
  `src/render/arm_strip.ts` and `src/render/ribbon_mesh.ts`; then the code at N's locations.
- `docs/ledger_notes.md`, the entries `## K1220` and `## K830` (Select-String
  `^## K1220|^## K830`; read each to the next `## `).

## Tasks

Do these in order. If the cap comes first, the Handoff says what is left.

1. **Census and reference.** Count every text fork the cursive draws, and how many have no field
   record, at xh 2 and xh 3. Use a word set that holds every letter (for instance the 26 letters as
   one word, plus N's words); say which. Re-measure N's stands on master with N's tools, copied
   (below): the step and the corners. Then measure the bar: the same step measure along a plain
   stroke, away from every fork.
2. **The fix**, with the CPU twin in step where one exists.
   - Try N's first lead first: real records for text forks (a threshold that scales with the
     stroke, or one for text only), so they take the maze's path, its wedges and K830's corners.
   - If short arms break the fan (degenerate wedges, overlaps, a fan past the arm's sides), say how,
     and take the next lead.
   - Pin it with a unit test: every text fork in the census has a record (or the disc blends its
     arms), and the maze's records are unchanged.
   - Re-freeze a pin only where a text fork draws, and name it. A pin that moves in the maze, or at
     rest away from text, is a stop.
   - If a choice of look comes up that the calls above don't settle (a crotch K830's rule doesn't
     cover, how far a blend reaches into an arm), build at most two variants, the second behind a
     probe switch, and leave the choice to the coordinator.
   - If the fix needs a glyph's geometry to change, stop at the cause and say what it would take.
3. **Checks**, with N's tools copied to new names (from `.claude/probes/K1220/run_n/`:
   `shoot.mjs`, `measure.mjs`, `proof.mjs`, `run_locked.ps1`, `lib.mjs`, `png.mjs`, `crop.mjs`,
   `vite.private-cache.config.ts`; never edit the originals). The checks only reject; report the
   numbers:
   - Step: inside each text fork, no more than 1.25x the bar, at every stand.
   - Corners: none on a text fork's outline except the crotch K830's rule draws. On master, N's
     corner measure finds 2-4 at r ~1.0 fh; the maze has none.
   - Census: the forks with no record, before and after.
   - Glyphs: the centreline and width are untouched. The ink outside each fork's 2 fh disc is
     identical to master's, pixel for pixel.
   - Maze: x4 ji 102 and N's maze stand are pixel-identical to master's, and `npm test` is green
     with the moved pins named.
   - Cost: what the change adds per fan fragment (texture reads, loop passes, branches) and to the
     fan's vertex count, since K1214 found that the fan's fragment shader is the frame's growing
     cost in play. No timing needed.
   - Explore mode: one shot; it draws, and the console has no error.
4. **Sheets**: master | branch (| the variant). Cover N's stands (the i fork in "ai", the a's L and
   R, at xh 2 and 3), plus every other letter's forks from the census, at 1x and 3x. View every
   crop yourself at full size and say, per fork, what you see against master. Pick nothing.
5. **Handoff**, appended below.

## K1211 S5 and K1218 S1 in parallel

Each runs in its own worktree. K1211 S5 rewrites the pulse's light inside the fan:
`junction_field.ts`'s `junctionField` and junctionBase's light terms, the pulse inputs near the
top of `joinery.ts` and the twin's pulse code, and `test/render/k320_slim.test.ts`. K1218 S1
works in the crossing-gap mask (`gap_mask.ts`, `ribbon/crossing_gaps.ts`) and `joinery.ts`'s
`jointMask`. Keep your edits to the text forks' path: the arm drop, the record writer, the AXIS
disc and its lookup, and the code they call.

At your end, `git fetch -q origin`, rebase onto `origin/master`, then run `npm test` again. Where
only a pin's number conflicts (`k320_slim`, a fan vertex count), take master's side, re-run the
pin, and re-freeze it to what your change gives; name it. If the rebase needs more than that,
don't do it: say what it would take.

## Muse in the main checkout

Muse runs in the main checkout on master during your stage and may push.

## Out of scope

The pulse's light (K1211), the crossing-gap mask (K1218, K1219), fire and collapse (K1210), the
glyphs' shapes (K863, K1112, K1213), anything for Levi.

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges). Use the Read tool
  only right before an Edit, and to view crops.
- Never touch the main checkout (Muse runs there on master), another worktree or another probe
  folder. N's untracked full shots in the main checkout's `.claude/probes/K1220/run_n/out/` are
  read-only references. Write your own output to `.claude/probes/K1220/s1/`.
- Commit WIP on your branch at every milestone, broken or not. Never push, and never edit
  LEDGER.md.
- No helpers.
- Shoot in real time (never `--virtual-time-budget`), under the perf lock through your copy of
  the shot runner (owner `K1220-S1`). Wait for the lock inside one blocking command. Run at most
  two browsers at a time, on ports 5970-5979 only. A dev server's build stamp is the SHA it started
  from, so check the served code.
- Stop rule: stop when the tasks are done or 2 h after your start, whichever comes first
  (`Get-Date` at the start and at each milestone). Then commit WIP, append the Handoff and report.
  A compaction is not a stop: after one, re-read this brief and `git log`.

## Report

In plain words, report:

- the census, the bar, and the step and corners per stand, before and after;
- the fix (and the variant, if any), and what it adds per fan fragment and per vertex;
- the moved pins, by name;
- the sheets' paths, and what you see at each fork against master;
- the rebase;
- your last commit's SHA.

Then give `Ledger items` and K1220's handle fields (owner, branch, last commit, evidence, next).

## Handoff

(The stage agent appends here.)
