# Muse batch 22, Run N: what draws the text forks' disc and steps (K1220)

Ledger: K1208 (batch 22); the item K1220. Chain tag 22N; ports 5970-5979. One Muse run in the
main checkout on master. Probes only: nothing in `src/` or `test/` is committed.

## Why

Levi, 2026-11-05 (K1211): "These junctions need to appear as though they are one whole fused
seamless unit." Run K (22K) found K734's hairline gone from the i fork in "ai" at xh 3. At real
size the same fork shows two flaws (Run K's `.claude/probes/K1208/run_k/out/k734_on.png`, a 3x
crop of a 130x130 CSS px clip at dsf 3; the device pixels below are the clip's, 390 a side):

- **The disc.** A round patch of another colour sits inside the stroke, with a visible round
  edge: about 179,122,178 inside against 199,141,168 on the arm below it.
- **The steps.** The ink's outline against the background steps where an arm's straight end cut
  sticks out past the stroke beside it: a notch on the left at about device (115-135, 125-150),
  and a horizontal ledge on the right at about (262-300, 215).

K836's follow-up (c) saw the same discs at the a's L and R junctions. That is K1220. A fix needs
to know what paints the disc's colour, what sets its edge and what ends each arm in a straight
cut. This run answers that with shots, crops, numbers and code locations. It fixes nothing.

## Read first

- Batch 22's How to work (`docs/design/K1208_muse_batch22.md`) and the pages it sends you to.
- `.claude/rules/probes.md`.
- The ledger text of K1220 and K836
  (`node $HOME/Repositories/claude-config/tools/ledger.mjs show K1220 K836 --repo .`), and
  `docs/ledger_notes.md`, `## K1208 (2026-11-05, Run K reviewed)`.
- Run K's `SUMMARY.md` (the K734 row) and its tools, to copy from (never edit them):
  `.claude/probes/K1208/run_k/k734.mjs`, `lib.mjs`, `crop.mjs`, `png.mjs`, `run_locked.ps1`.
- `.claude/probes/K643/batch.ps1`: the text stands and the xh 2 flag (`#glyphs2=xh2`).
- The stills K836 (c) names, in `.claude/probes/K836/` and `.claude/probes/K843/`, to find the
  a's L and R junctions.
- The headers of `src/render/junction_field.ts`, `src/render/ribbon/joinery.ts` and
  `src/render/arm_strip.ts`; for the text, `src/core/text_graph.ts` and `src/app/glyph_switch.ts`.

## Stands

Seed 7, 1600x1000 at dsf 3, each shot once the sim sleeps (as `k734.mjs` waits). Name master's
sha once.

- The i fork: `?7&txt=ai&am=instant&snd=none&fw=0&phw=0#glyphs2` (xh 3), and the same with
  `#glyphs2=xh2` (xh 2).
- The a's L and R junctions: `?7&txt=a&am=instant&snd=none&fw=0&phw=0#glyphs2`, and with
  `#glyphs2=xh2`.
- One maze junction, to tell whether the disc is text-only: x4 ji 102 on the `x4` stand of
  `.claude/probes/K1211/shoot2.mjs` (line 27), as that script builds it, before its moves.

## Tasks

1. **Shots.** Each stand four ways: as players see it; with the fan meshes hidden
   (`filletMesh.mesh.renderable = false`, as `k734.mjs` does); with the crossing-gap mask off
   (`maskEnabled = false`, then `update()` and `rebuildFillets(true)`, as `shoot2.mjs` does); and
   with the knot hidden (`root.renderable = false`), for the background. In real time (never
   `--virtual-time-budget`), under the perf lock (`$env:TEMP\claude-perf.lock`, owner `K1220-N`).
   Crop each junction from the device-pixel shot, at 1:1 and at 3x.
2. **The disc.** From each junction's centre (its record, through the hooks `k734.mjs` uses),
   take 16 radial colour profiles in device pixels, each out to 2.5 half-widths or to the ink's
   edge (pixels within 12 RGB of the knot-hidden shot, or a rule you state), whichever comes
   first. For each way the fans and the mask are set, report:
   - per profile, the largest colour step (RGB distance) over any 3 consecutive device pixels,
     and its radius in device px and in half-widths;
   - the colour inside that edge (the median within half its radius) and on each arm just past
     it (the median over 3 px).
   Then name the code that paints the disc's colour and the code that sets its edge (file:line
   and a one-line quote): is the colour a blend of the arms' section colours, one arm's colour,
   or something else, and where does its radius come from? Prove each by one change that moves
   the disc's colour or radius in a shot (a `window.__knot*` switch, or a probe-only edit to
   `src/` that you restore before committing; say which).
3. **The steps.** Trace the ink's outline (against the knot-hidden shot) around each junction
   and list every corner where the outline turns more than 45° within 3 device px: its position,
   its angle and the length of each side, with the fans on and hidden. For each, name what draws
   each side (an arm's straight cut, the fan, a crossing gap) and the code that ends the arm there
   (file:line and a one-line quote). The crotch between two arms is a corner too: list it, and say
   whether K830's corner rule makes it sharp (Select-String `K830` in `src/render/`).
4. **What a fix would take.** In a few sentences each: what would have to change for the colour
   to run from each arm into the junction with no edge, and for the outline to stay round where
   an arm ends; which files, what data the shader would need, and what else would move (the pins
   in `test/`, `k320_slim`, the maze's junctions). No fix.

Looks stay with Claude: put each crop in the table and say what you measured, never whether it
looks right.

## Record

`.claude/probes/K1220/run_n/`: the scripts and `SUMMARY.md`: a table with a row per junction and
stand (stand, master's sha, the largest step and its radius, the colours inside and outside, the
corners, the crops), then the code locations and task 4. Crops tracked with `git add -f` (PNG, at
most 30, each under 300 KB); larger outputs stay untracked.

## Done and close

Done when every junction has a row and tasks 2-4 name their code, and `git status` shows nothing
changed in `src/` or `test/`. Commit message:
`K1220: what draws the text forks' disc and steps (Muse batch 22 Run N, 22N)`. Pull with rebase
and autostash, then push to master (probes only, so nothing deploys). Leave the ledger to Claude.

## Report

Plain words: master's sha; per junction the largest step, the colours and the corners; what
paints the disc and sets its edge, and what ends each arm (file:line); what a fix would take;
anything that stopped you; `Ledger items`.
