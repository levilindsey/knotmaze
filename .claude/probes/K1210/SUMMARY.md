# K1210 Run H: fire and collapse across junctions, against the pulse

Probes only; no `src/` changed. Stands verbatim in `STANDS.md`; frames
(30 per set) under `out/frames/` (untracked); kymographs in `out/kymo/`
(PNG + CSV); full numbers in `out/measures.json` / `out/measures.md`;
sheets `out/sheet_S3_fire.png`, `out/sheet_S3_collapse.png`,
`out/sheet_S4_fire.png`, `out/sheet_S4_collapse.png` (10 frames at 2x
with clock labels, kymographs beside them, the pulse's frames and
kymographs under them). All GPU work under the perf lock (times in
STANDS.md); `ctxLost` 0 and no page errors in every set.

## How each effect crosses

- Fire burns thread away (`gone`): the front is a hard vanish edge with
  an ember band. It sweeps (front = leading edge of frame-to-frame
  change along each arm's centreline).
- Collapse also sweeps: the run behind the dot is gone stretch by
  stretch as the dot crosses (`syncBroken`'s swept span), whole on
  arrival. It does not fade, so the front is the swept span's end; the
  fan disc's mean luma is in `out/measures.json` (`fanMean`) beside it.
- Pulse fronts for jump/lag are tracked on debug view 5's G at the same
  clocks (the normal view saturates flat near the head); pops and the
  fan mean read the normal view. Fan footprint: |u| <= 0.6 drawn world
  from the junction along the route (a disc of that radius for pops).

## The measures (per route; pulse at the same junction)

| stand | effect | route | jump | lag (fr) | pops | verdict |
|---|---|---|---|---|---|---|
| S3 node_218 | fire | e39->e210 | 5.64 | -3.31 | 9 | differs: pops |
| S3 node_218 | fire | e39->e209 | 3.41 | -0.37 | 9 | differs: pops |
| S3 node_218 | collapse | e210->e209 | 1.18 | 3.42 | 22 | differs: pops |
| S3 node_218 | pulse | e210->e209 / e39->e209 | - | - | 0 | reference |
| S4 node_378 | fire | e176->e135 | 5.72 | -6.78 | 13 | differs: pops |
| S4 node_378 | fire | e176->e134 | 3.85 | 0.21 | 13 | differs: pops |
| S4 node_378 | fire | e176->e175 | 6.33 | -8.85 | 13 | differs: pops |
| S4 node_378 | collapse | e176->e135 | 3.71 | 5.05 | 23 | differs: pops |
| S4 node_378 | pulse | e176->e135 / e134 / e175 | 7.01 / 3.19 / 3.06 | - | 0 | reference |

Pop frames: fire S3 [8,10,14-20], fire S4 [8-20], collapse S3
[5-15,17-27], collapse S4 [2-15,17-25] - every frame the vanish edge
crosses the fan. The pulse pops 0 at both junctions: its crest changes
each fan pixel by less than 32 luma per frame at the same ~0.08
world/frame step. Jump at S4 is like the pulse (fire 3.85-6.33 and
collapse 3.71 against the pulse's 7.01, within +0.5). Dim/bright: the
fan's mean leaves the arms' range for the pulse itself at both
junctions (bright while the crest is in the fan, dim at the sweep's
ends), and for fire and collapse too (fire S3 e209 route dim frames
15-29 as the burnt fan darkens; full lists in `out/measures.md`), so no
verdict turns on it. These numbers only flag the junctions for
Claude's look; they never call a look right.

## What could not be measured

Lag has no pulse reference at either junction. At S3 the pulse crest
track on e210 is captured by a static bright feature at u = -1.86 (the
crest itself crosses in the kymograph and the sheet). At S4 the crest
peak centroid advances at 0.037 world/frame against the train's 0.083
(the centroid is biased while the crest grows through the reach fade),
so its lag (-18) is the tracker's, not the band's. The effects' own
lags stand as measured: fire -3.31 / -0.37 at S3 and -6.78 / 0.21 /
-8.85 at S4 (the front leaves the fan early on e135/e175, on time on
e134), collapse 3.42 at S3 and 5.05 at S4 (the swept span leaves late).
Jump at S3 likewise has no pulse reference (effect values 5.64, 3.41
and 1.18 stand). Fire on S3's e210 burns from both ends (d 66.968 by
node_221 against 68.382 at the junction): its two fronts meet on the
arm, and the track holds at the meeting point from frame 24.

## Verdicts

- Fire at node_218 (3 arms): differs - pops 9 vs pulse 0 on both arms out.
- Fire at node_378 (4 arms): differs - pops 13 vs pulse 0 on all three arms out.
- Collapse at node_218 (3 arms): differs - pops 22 vs pulse 0.
- Collapse at node_378 (4 arms): differs - pops 23 vs pulse 0.
