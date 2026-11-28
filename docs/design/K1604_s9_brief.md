# K1604 stage 9: investigation. Which test gives the wrong answer at one pixel, and the exact rule drawn outside the renderer (rp=gf); nothing lands

Read first: `K1604_s8_brief.md` with its `## Handoff (stage 8)` on branch `k1604-s8` (d29ab1a5c; your base:
tools in `.claude/probes/K1604/s7/` and `s8/`, patches pW, pP, pWn, pPn) and stage 7's handoff on branch
`k1604-s7`. Pages, read only, look at them first:
`...\worktrees\k1604-s8\.claude\probes\K1604\s8\out\pg8_rows_1.png`, `pg8_worse_1.png`.

## Why this stage

Four fix stages (s3, s5, s6, s8) failed the same way: a change that cuts the stubs Levi marked also adds
flecks, dashes or wedges at places that were fine. Levi, 2026-11-27: "We do need to fix these", and asked where
the disconnect is. The coordinator's hypothesis, UNTESTED (say plainly if it is wrong):

- Levi's rule is about a crossing: over pass O, under pass U; U's border is cut inside O's band.
- `lkGap` never asks that. It decides from stand-ins: a depth-key comparison (is something higher nearby) and
  the under's window and slot (a stretch of the under's samples).
- Beside a junction the under's border is drawn by junction pieces (arm borders, corner arcs) that the
  under's window does not cover, so the gate withholds the cut (the stubs). With the gate off, depth alone
  also cuts pieces that are not U at that crossing (hook ends, arm ends, neighbouring passes): the flecks.
- So no setting of the stand-ins is right everywhere; the missing datum is "which crossing's under pass does
  this border pixel belong to".

## This stage (no fix; nothing lands in `src/` on master)

1. **Single-pixel readback.** On the frozen states stage 8 used, pick one wrong pixel at each of: the stub in
   row 5 (A_3 x37), row 6 (A_3 x195), row 7's lower meeting (A_3 x292), row 9 (A_3 x73); and under pW one
   fleck pixel at each of A_4 x317, x359, x291 and the wedge at A_6 x42. For each pixel print every value
   `lkGap` uses, on master and under pW (a CPU mirror of the shader fed the real tables, or debug readback):
   which piece draws the border there (thread sample, arm border, corner arc; ids), its key, each candidate
   over and its key and distance, the window and slot values, and which test decides cut or no cut. Also the
   s8a pass test's intermediate values at rows 5 and 6: why it returns false. State for each pixel: does any
   table say which thread pass (edge and position along it) this border pixel belongs to?
2. **The exact rule outside the renderer.** From the frozen state's geometry and the crossing list (the
   graph: each crossing's over and under edge and where it sits on each), in a probe tool on the CPU, compute
   per pixel on A_3, A_4, A_6: cut a border pixel when it belongs to the under pass of a crossing (junction
   pieces included, assigned to the arm's edge they continue) and lies inside that crossing's over band,
   limited to the under's pass through that crossing. Apply it to the captured border-look image (start from
   a capture with all gaps off, or paint over master's) and render the result. This is the target picture:
   it shows whether the concept holds at every place. Score it with `chk.py`. List every place where even
   the exact rule looks wrong or is undefined (a border piece shared by two passes, a hook that is the same
   edge, a crossing closer to the junction than the band's width) and say what the rule should be there.
3. **What the renderer lacks.** Name the data the exact rule used that the shader's tables do not carry
   (per border piece: edge id and position; per crossing: over edge, under edge, position), where it could
   live (existing texels, corner table, gap table), and a first estimate of per-pixel cost near junctions.

## Done

1. The per-pixel tables for the eight pixels, with the deciding test named for each, and the hypothesis
   confirmed, corrected or refuted, observed.
2. The exact-rule images and their checker scores against master and pW.
3. For Levi, pages `master | exact rule` (and pW where it differs), medium then close zoom, border look, no
   overlays, under 7000 px tall, viewed by you: his nine rows (2 A_6 x326; 5, 6, 7, 9 as above; 11 A_3 x166;
   12 A_3 x316; 13 A_4 x301; 17 A_4 x22); stage 8's nine fleck places; the 12 places where the exact rule
   differs most from master elsewhere. Close-zoom crops centred on the changed pixels.
4. The list of places where the exact rule itself is wrong or undefined.
5. A recommendation: what stage 10 builds, in one paragraph.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1604-s9`, branch `k1604-s9`, from `origin/master`;
bring tools with `git checkout k1604-s8 -- .claude/probes/K1604` (never merge that branch); reuse stage 8's
captures read only where the frozen-state hashes match rather than re-capturing. `node_modules` as a directory
junction to the main checkout's (never `npm install`). Write only inside your worktree. Read code through the
shell; the Read tool only just before an Edit, and for images. Any real-time capture under the perf lock
(`scripts/perf_lock.ps1`; read a lock before touching it, never delete another owner's), ports 5685 to 5689;
refuse a busy port and check the listener is your build; kill your servers and probe processes before you
stop. Commit WIP at every milestone (`git add -f` for probe tools, never their outputs). Never push, never
bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome `--virtual-time-budget`. Helpers on
sonnet, mechanical work only; looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. Order of value if time runs short: Done 1, then 2 on A_3 alone, then the rest. On
stopping: commit WIP, append `## Handoff (stage 9)` here, commit, and report: findings first (observed against
inferred), page paths, scores, a `Ledger items` list and the handle fields.
