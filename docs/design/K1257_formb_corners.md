# K1257: form B's corners take the closed-form growth

Ledger: K1257 (from K1247 stage 6). One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

K1240's outline (`.claude/probes/K1240/proto/outline.ts`) now grows corners in closed form along the
medial path (K1247 stage 6, `docs/design/K1247_s6_analytic.md`, Handoff 1). Against the converged
reference, its corners are off by more than 0.01 h in 58 places, where the old 32-node growth was off
in 567 and by up to 0.88 h.

Form B (`src/render/field/`) still grows corners the old way. It is the float64 reference every K1240
check compares against, and its top surface is the fill in the check pictures. So:
- each picture shows a sliver of white or an overlap wherever a corner moved (up to 8.3 px;
  `k1247s6_sliver.ts` counts them);
- the checks flag the moved corners as failures (`k1247c_final.ps1`'s verify: 48).

## Goal

Form B grows its corners with the same closed-form pieces as the outline, so the two agree at every
corner. Port the growth from `outline.ts` into form B's own code: `src/` must not import the probe.
The technique is yours. If form B shares an equation with the outline, the outline's version is the
one to match.

## Done

1. `k1247s6_sliver.ts`: no corner more than 0.5 device px from the outline's, on every scene. Each
   one left over gets a cause.
2. Outside corners, form B's output is unchanged: bit-identical, or within 1e-9 where an operation's
   order had to change. Say which outputs you compared and how.
3. `k1247c_final.ps1 -Base ../../../../muse-k1240-s1/.claude/probes/K1240/out/k1247/base`: verify's
   corner failures are gone. List whatever remains, with its cause.
4. `npm test` green. A test that pins form B's corners is re-frozen in the same commit, and the commit
   message names what moved and why.
5. The app's form B path (`field_b_app.ts`, the fbb flag) still draws. Take one screenshot with the
   flag on (`scripts/diag_screenshot.mjs`) and look at it.
6. Pictures: re-crop the 6 corners from stage 6 (`k1247s5_pics.ts`, the list in stage 6's
   `out/k1247s5/pics_s6/index.txt`), with form B's fill now under the new outline. Claude looks at
   them.

## Start

Branch from master. Stage 6 is merged there.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- Your files: `src/render/field/` and its tests, plus check tools in `.claude/probes/K1240/proto/`
  that are new or yours. Another agent is changing `outline.ts` (K1247 stage 7), so don't edit it.
  Commit WIP on your branch at each milestone, with `git add -f` for probe tools, never for outputs.
  Never push, never edit `LEDGER.md`, and never touch the main checkout.
- Perf lock (`$env:TEMP\claude-perf.lock`): take it only to time something. Correctness checks don't
  need it.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone). Then
  commit WIP, append a handoff to this brief, and report. A compaction is not a stop: re-read this
  brief and `git log`.

## Report

Short and plain:
- the sliver count per scene, before and after;
- what changed outside corners, and how you know;
- verify's failures, before and after;
- `npm test`, and the fbb screenshot's path;
- the crops' paths;
- what's left;
- your last SHA.

End with `Ledger items` and K1257's handle fields (owner, branch, last commit, evidence, next).

## Handoff 1 (2026-11-09, 22:03, the K1257 agent)

`npm test` green on this branch (220 files, 2887 tests passed, 9 skipped).

Built and checked (66481923): `src/render/field/corner_cf.ts` ports stage 6's closed-form growth;
`form_b.ts` grows every corner with it, with the old 32-node growth as a fallback that never runs
on the check scenes (`cfStats`: 0 of 4,640 corners); denOf, the margin walks and the gate product
match the outline's.

- Sliver (`k1257_sliver.ts`, log `out/k1257/sliver.txt`): 71 corners over 0.5 px before, 0 after,
  on every scene; the largest left is 0.026 px (muse_hash 0.1).
- Outside corners (`k1257_same.ts`, all 27 scenes, master's form B against today's): arms and
  every corner's growth inputs are bit-identical; evalPoint on every 3rd device pixel is
  bit-identical wherever no corner's grid cell reaches; inside corner cells but outside every reach
  disk only Dexp differs (the distance to the corner's arc).
- `k1247c_final.ps1 -Base ../../../../muse-k1240-s1/.claude/probes/K1240/out/k1247/base`:
  - Verify: 48 failures, the same log as stage 6's line for line. All 48 are REST MISMATCH of the
    outline's table against `out/k1247c_base` (corner q and face point counts that moved with
    stage 6's arcs), cold and warm on the 24 non-fat scene/moves. Verify reads no form B, so this
    change cannot move it; its corner failures belong to the outline (K1247).
  - cmprows (form B rows): 16 / 14 / 2 failures (still / 0.1 / 0.5) at stage 6, 3 / 3 / 1 now.
    - def A, g41_def_tw64 A, def 0.5 A (over2 +2 or +3): outline arc samples now lie exactly on
      form B's corner circle (`|p-q|-r` about 1e-13 px, ink 0.500), where the label reads paper
      and the row measure falls back to evalPoint's term, a neighbouring arm's tA at 1-3.7 px
      (`k1257_rowdiag.ts`). Moved 1e-6 px either way the still-scene samples read 0. On the paper
      side of def 0.5's two corners the term flips between the corner's foot (correct) and tA
      (3.3-3.7 px) from point to point; master does the same 0.5 px into the paper (3.37 px). This
      comes from the measure and the term pick on paper, not from the fill's geometry.
    - muse_hash A, still and 0.1 (p99 +0.04 to +0.05 px; over2 -1 against stage 6): the same
      coincidence on about 96 more samples, which move from ink to the term measure (inf 19931 to
      20027); over8 drops from 745 to 689.
    - muse_hash B 0.1 (over2 68 to 73, tol 1.4): the 9 px defect at j155/j156 (ch72/ch74) that
      was already there; its rows jitter by a few samples from build to build.
- fbb screenshot: `.claude/probes/K1240/out/k1257/fbb_muse.png` (the flag stays on; no fallback).
- Crops: `.claude/probes/K1240/out/k1247s5/pics_k1257/` (stage 6's six, `--tag=_claude`; the
  cmp json copied from stage 6's worktree). The new outline's arcs sit on the fill's edge in all
  six. At this scale they look like stage 6's, except crop 2: its middle tile's pale pixel by the
  arc is gone.
- Left: form B's build time with the closed-form growth was not timed (stage 6 measured the same
  growth in the outline at 7.3-7.5 ms against 6.5-6.7 for the stepping one); the row measure's
  paper-side term pick (above) would need its own item if the rows are to gate.
