# K1201 (batch 20 Run E): S4b's joint step — sweep, GPU reproduction

Master at run start: `ebd64574`. Dev server on port 5790 (this run's
range), perf lock for all GPU work (`batch_sweep.txt`, `batch_joint.txt`
under the copied `run_locked.ps1 -Batch`). No `src/`, `test/` or
`scripts/` change; nothing under `.claude/probes/K1139/` changed.
Copies in this folder: `lib.mjs` (only change: default port 5620 ->
5790, named in its header), `stands_cyc.mjs`, `dump_cyc.mjs`,
`table_cyc.mjs`, `kymo.mjs`, `png.mjs`, `run_locked.ps1`,
`vite.private-cache.config.ts`, `ridge_joint.ts` (all verbatim).
New: `sweep.mjs`, `joint_gpu.mjs`.

## Task 1 — the sweep (frequency)

Stands verbatim from `stands_cyc.mjs`: cyc (`k111&am=instant&fw=0&
snd=none&phw=0`, moves 0,246,82,83,199,150,151,38,155,211, head
node_221, two-ended e210) and loop (`1&am=instant&fw=0&snd=none&
phw=0&pr=8`, moves 185,186,187,122,50,118,117,165,60,9,178,57,101,
head node_635, self-loop e102).

Candidate heads = every non-end vertex where the target arm is
two-ended, enumerated in the page with `pulseTree` (no gate, so an
upper bound: cyc 181 standable vertices -> 2 candidates; loop 170 ->
3). Each candidate was then reached physically (stand moves plus the
fewest-edges extension named below, dumped with `__knotPulses` /
`dumpPulses` on the dev server started before any of this; no source
edit happened under it). At every candidate the target was the only
two-ended arm declared.

| stand | head (extension) | arm | W | dA | dB | xR A | xR B | pred. step |
|---|---|---|---|---|---|---|---|---|
| cyc | node_218 (+[39]) | e210 | 2.746 | 0 | 1.386 | 2.066 | 0.680 | 0 |
| cyc | node_221 (+[]) | e210 | 2.746 | 0 | 1.386 | 2.066 | 0.680 | 0 |
| loop | mnode_77 (+[101]) | e102 | 7.671 | 4.253 | 4.253 | 3.835 | 3.835 | 0 |
| loop | node_649 (+[101,57]) | e102 | 7.671 | 5.177 | 5.177 | 3.835 | 3.835 | 0 |
| loop | node_635 (+[]) | e102 | 7.671 | 0 | 0 | 3.835 | 3.835 | 0 |

Full move list per head = the stand's moves plus the extension
(`out/sweep.txt`, `out/sweep.json`).

**Frequency: cyc 0 of 2 heads read `xR < 0.5` (item 3), 0 of 2 read
`xR < 0` (item 4); loop 0 of 3 and 0 of 3.** Smallest `|xR|` seen:
cyc 0.680, loop 3.835; the `ridge_joint.ts` table predicts a step of
0 at both. Against S4b's uniform-ridge guess (1/W of head positions:
0.36 at e210's W, 0.13 at e102's), play meets the step at neither
stand's arm — and the sweep set is exhaustive for these arms, not a
sample: no other standable head lights either arm from both ends.
Why, from the dumps: for e210 both heads give `dB - dA` = 1.386, the
drawn span of the alternative e39 path, so `xR` at the far joint is
`(W - 1.386)/2` = 0.680 at its closest; for the self-loop e102,
`dB = dA` by construction (`pulse_path.ts`: a loop's `dB` is its
`dist0`), so its ridge always sits at W/2.

## Tasks 2/3 — showing it (injection, since no head shows it)

No head in either sweep reads `xR < 0.5`, so per task 3, on the cyc
stand at head node_221, e210 was re-declared in the page through the
ribbon renderer's own `setPaint` (the `strips.mjs` shape, copied:
wrap `setPaint` so the app's re-declarations keep the injection) as
a two-ended item with:

- `dA` 0.000 (the item's `dist0`, head at node_221), `W` 2.746,
  chosen `dB` 2.346: `xR` at node_218 (the B end) = `(dA + W - dB)/2`
  = 0.2, so `dB = dA + W - 0.4 = 2.346`; ridge `gR = (dA+dB+W)/2` =
  2.546. Its pulse band at node_218 carries the same declaration
  (`distJ = dB`, `gR` 2.546, through the same `setPaint` call).
  Applied and read back: `two: true, dB: 2.346, dist0: 0`.

Steps at that joint (parent e39 into node_218; child e210 out of
it); clocks pinned, 70 px/world at the joint, ctxLost 0:

| measure | natural (control) | injected xR 0.2 |
|---|---|---|
| predicted (`ridge_joint.ts`, xR 0.2, reach ∞) | — | 0.54 |
| CPU band step at tau 0 (src twins, max over 400 clocks) | 0.0000 (t 100.422) | 0.3885 (t 101.469) |
| CPU P1 parent-end vs child-end (max over 400 clocks) | 0.0001 | 1.000 (see note) |
| GPU step, debug-5 G at tau -0.03/+0.03 (t of CPU max) | 0.016 (CPU 0.060) | 0.435 (CPU 0.454) |
| GPU step, debug-5 G at tau -0.1/+0.1 | 0.047 (CPU 0.174) | 0.526 (CPU 0.563) |

The CPU band step is the predicted 0.54 scaled by the live reach
window (0.3885 / 0.54 = 0.72 at dG 2.346, reach 3). The literal P1
reads 1.000 only because the prescribed fictitious `dB` (2.346) also
shifts the child B-train's phase 0.96 world against the parent's
end (1.386) — phase, not the ridge factor; the band check at tau 0,
which holds the train fixed and varies only the factor, isolates
the ridge step and is the measure that matches `ridge_joint.ts`'s
band column. On screen (`crop_joint_injected_normal.png` at
t 101.469, against `crop_joint_natural_normal.png`): the incoming
crest reaches node_218 bright and the e210 side leaves it dim —
the wedge of thread just out of the joint sits visibly darker than
the thread arriving, where the natural crop carries the crest
through. The debug crop (`crop_joint_injected_debug5.png`) shows
the same drop in G.

GPU against CPU at the same points (debug-5 G vs the src twin at
each sampled centreline point, `out/joint.txt`): injected — parent
side exact (tau -0.1: 0.655 GPU vs 0.653 CPU; tau -0.03: 0.655 vs
0.655), child side tau +0.03 0.220 vs 0.201, tau +0.8 0.396 vs
0.406, ribbon points at 1.6/2.0 from the joint within 0.013. Worst
point tau +0.1: 0.129 vs 0.090 (10/255; the shader's route tau at
that arm point, and the neighbouring e39->e209 band's cover — the
K1202 territory effect at this same fan). **So the GPU reproduces
the CPU step: the step itself within 5/255 at the tau ±0.03 pair
(0.435 GPU against 0.454 CPU) and 10/255 at ±0.1; it is not within
the plan's 2/255 per-point tolerance at the two child-side points
nearest the joint (5 and 10/255), and is elsewhere (<=3/255).**
The natural control's worst point is the same tau +0.1 (GPU 0.224
against the single-band twin's 0.098): there the GPU takes the
e39->e209 band's crest through its cover, which a one-band twin
does not model — the K1202 attribution at this fan, not the ridge.

## Files

`out/sweep.txt` + `sweep.json` (task 1), `out/joint.txt` +
`joint.json` (tasks 2/3, per-point GPU/CPU samples), crops above,
`out/ridge_joint.txt` (the copied synthetic table, re-run).
