# K1210 stands (batch 22 Run H)

Every link and move list below is verbatim from `.claude/probes/K1139/stands_cyc.mjs`
(the copies in this folder), with only the effect keys appended, as each
stand states. Discovery (`discover.mjs`, `out/discover.json`): with the
burn race on and with collapse on, each stand's head, junction nodes and
arm edges are the same as with the effect off, so the pulse is measured
on the effect-off link at the same junction. Frames: 30 per set, headed
real-time Chrome, `phw=0`, perf lock held (`run_locked.ps1 -Batch`).

## S3 - node_218, 3 arms (cyc maze)

Junction `node_218`: arms e39 -> node_221 (lattice 1.414, drawn 1.39),
e210 -> node_221 (2.943, drawn 2.75), e209 -> node_213 (5.886, drawn 5.50).
Head for every set: `node_221`.

- Pulse (effect off): link `k111&am=instant&fw=0&snd=none&phw=0`, moves
  0, 246, 82, 83, 199, 150, 151, 38, 155, 211. Clock: `__knotPinClocks`
  recipe (lib.mjs PIN + setState), paint clock t = 100 + i * 1.5625 / 30
  (spacing 2.5, period 1.5625 s), i = 0..29, normal view; debug view 5 at
  the same clocks for the front track.
- Fire: same link and moves plus `&gm=burn&fck=turn&fsp=0.6&fdl=0&fbt=gone`.
  Fire reaches node_218 by e39: d(node_221) = 66.968, d(node_218) = 68.382
  (by e210 it would be 69.911, so e210 burns from both ends and its two
  fronts meet). Clock: the turn clock L set on the captured controller
  (`c.walkedDist = L`, K139's syncBroken capture), L = R / 0.6 with the
  reach R from 67.232 to 69.732 in 30 fixed steps (front 1.15 lattice
  before the fan to 1.35 past it, on every arm out). Paint clock pinned
  at 100, fire FX frozen (`tickFireFx` no-op + clear). Arms out: e210, e209.
- Collapse: same link and moves plus `&fg=collapse`. Then e210 into
  node_218 with the dot pinned (`fb.anim.cur` at `moveSpeed` 0): 16
  frames from 1.2 drawn world before the junction to arrival; the move
  lands; then e209 out toward node_213, 14 frames to 1.2 world past the
  junction. Clock reading: the dot's signed drawn distance from the
  junction. The run collapses swept behind the dot (it does not fade).

## S4 - node_378, 4 arms (four / x4 maze)

Junction `node_378`: arms e176 -> node_382 (lattice 5.064, drawn 4.79),
e135 -> mnode_27 (2.121, drawn 2.02), e134 -> mnode_26 (13.894, drawn
13.73), e175 -> mnode_78 (4.045, drawn 3.82).

- Pulse (effect off): link `k111&am=instant&fw=0&snd=none&phw=0&pr=8`,
  moves 0, 247, 248, 69, 72, 73, 95, 140, 180. Head `node_382`. Clocks
  as S3's pulse.
- Fire: the same x4 link and moves plus
  `&gm=burn&fck=turn&fsp=0.6&fdl=0&fbt=gone`. Head `node_382` (not the
  junction itself, so no head marker sits on the fan). Fire reaches
  node_378 by e176: d(node_382) = 55.940, d(node_378) = 61.005. Clock as
  S3's fire, R from 59.855 to 62.355 (L = R / 0.6), 30 steps. Arms out:
  e135, e134, e175.
- Collapse: link `k111&am=instant&fw=0&snd=none&phw=0` (the four stand's
  link, no `&pr=8`) plus `&fg=collapse`, moves 0, 247, 248, 69, 72, 73,
  95, 140, 180 (four's moves without the last; head `node_382`). Then
  e176 into node_378 pinned as S3's collapse (16 frames in), the move
  lands, then e135 out toward mnode_27 (14 frames). Same maze as the
  fire and pulse sets; only the pulse reach differs, which collapse
  does not read.

## Crop and clocks

One crop per junction, the same for its three effects: centred on the
junction's screen point, half-size 2.55 px-per-world (the fan and about
two lattice units of each arm), viewport 1700x950 at dsf 1.5. Fire and
collapse frames carry the static pulse field of paint clock 100 beside
the effect; every front below is read from frame-to-frame change or the
effect's own field, never from that static field. No stand could not be
built. Perf lock: discovery 09:54, S3 10:04-10:07, S4 10:07-10:10, S4
fire reshoot 10:14-10:15, pulse reshoot 10:17-10:19 (2026-11-05).
