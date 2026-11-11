# K1278 stage 1: the redesign's fill painted seamlessly across junctions

Ledgers: K1278 (this), K1283 (junctions vs form B), K1250 (a pulse's glow at a junction) and K1240 (the
redesign). One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h.

## Why

Levi, 2026-11-10: the fill logic has to "handle seamless continuous perfectly smooth blending across
junctions for segment color blending and highlight pulses". K1277 (merged, 4d168bb4) made the fill plain
triangles fixed at structure (`.claude/probes/K1240/proto/fill_tri.ts`, its header is the spec), but it
paints one flat colour per chain. Every vertex already carries chain and s (`FillFrame.s`), and the
strip rows give the distance across.

K1277 also left one regression: at end-arm junctions the through-thread's mirrored strip pokes a sliver
of its colour over the end thread's round end, where form B shows the end thread (muse_hash x73, x47,
x292, x177; g41_user_tw64 x14; g41_def_tw64 x349; crop `.claude/probes/K1240/out/k1277/crops/k1279_worse.png`).

## Goal

The fill's colour comes per pixel from fields that are continuous across every triangle edge, face edge
and junction: chain and s along the thread, the distance across, and at a junction per-arm weights that
ease to an exact hand-off, the way form B and the app's paint blend there. Never a colour per face or per
triangle. This stage paints the section colours (`src/render/section_colors.ts`, the app's paint in
`src/render/paint_math.ts` / `paint_glsl.ts`); stage 2 adds the highlight pulses on the same fields.

Levi's rule binds: the structure is decided once, and only positions follow the frame. The technique is
yours.

## Done

- **Setup.**
  - Check HEAD, then `git reset --hard <the master SHA the coordinator gives you>`.
  - Copy the untracked inputs from K1277's worktree,
    `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-aa92acf32efe15555\.claude\probes\K1240\`:
    `out/` (all of it) and `proto/outline_master.ts`, `proto/outline_base.ts`.
  - If your worktree lacks `.claude/probes/K868/scenes/`, copy it from the main checkout.
- **Bars:**
  - A seam test (build it first, run it on master as the baseline): on every scene, sample the paint on
    both sides of every shared triangle edge, face edge and junction ring, with section colours that step
    and that kink. No difference over 1/255 per channel across any edge, and near junctions no per-pixel
    colour step larger than form B's at the same spot.
  - The section colours at rest match the app's paint against form B's surface: crops form B | master |
    yours at the 6 worst junctions by colour difference, in `.claude/probes/K1240/out/k1278/crops/`.
  - The end-arm sliver: the top colour at the six crossings above matches form B (K1279's census thread
    term no worse than master there), with a crop row.
  - K1277's bars hold: the rest census (`k1277_census.ts rest`) and the motion census on def and fat no
    worse than K1277's handoff; `k1277_k1279.ts` no crossing worse; `k1247s5_cmp` 44/8/0/0; `npm test`
    green.

## Rules

The Rules of `docs/design/K1247_s10_reduce.md`. Your files: `draw.ts`, `fill_tri.ts`, new files of your
own in `.claude/probes/K1240/proto/`, your `k1278_*` tools, and the check tools there. No `src/`; form B
and the app's paint are read only. Plus:
- **`outline.ts` is read only.** K1247 stage 16's agent is changing it in parallel. If the fill needs
  something the table lacks, add it in your own file, or report it.
- **Load.** Another agent runs on this machine. While anyone else holds `$env:TEMP\claude-perf.lock`,
  run one scoring process at a time, at Idle priority.
- **Commit WIP at every milestone,** broken or not. Read code through the shell (`Select-String`,
  ranges of `Get-Content`), using Read only just before an Edit.
- **Stop** when the stage is done or at 2 h from your start, whichever comes first. Check `Get-Date` at
  the start and at each milestone. Then commit WIP, append a handoff to this brief and report. Neither a
  compaction nor context size is a stop; after a compaction, re-read this brief and `git log`.

## Report

Report these:
- the paint fields: what each vertex and pixel carries, and how a junction hands off between arms;
- the seam test on master and on yours;
- the end-arm sliver, before and after;
- the crops' paths, and the bars;
- what stage 2's pulses will need, and what's left;
- your last SHA.

End with `Ledger items` and K1278's handle fields.

## Handoff, stage 1 (2026-11-10)

Branch `worktree-agent-abbdf5d7bf1c88649`, from master 9849a26e. The commits are `e59db081..` (WIP: paint fields, then the corner hand-off, then the GPU, then the tools); the last SHA is in the report. The prototype paints per pixel by default (`?paint=app|step|kink`; `?paint=flat` keeps K1277's flat chain colours).

**The paint fields** (`proto/fill_tri.ts`, `proto/paint.ts`, `proto/draw.ts`):
- **Per vertex, four slots.** Each slot carries:
  - a run (the section run it reads, or -1). This is structure, decided once by `fillRuns`.
  - a weight. Structure (`vW`) gives it, and per frame `fillFrame` writes `w4`, placing each corner's hand-off by the corner's shape.
  - an s along the slot's chain (`s4`, per frame; at a junction it is unwrapped to the junction's copy of a closed chain).
- **Per vertex, also** `across` (0 centreline, 1 border). It is computed but not yet uploaded.
- **Per pixel.** The colour is `sum w * runColour(run, s) / sum w`, with w and s interpolated barycentrically. A triangle's slot reads the run of its first vertex whose run is >= 0 (`vertexPaint`). On the GPU that is a flat varying, so `paintData` adds provoking-vertex copies: 1122 on def. The run table is an RGBA32F texture read with texelFetch.
- **What each item carries.**
  - Strips: slot 0 is the strip's own run, one-hot.
  - A strip's end columns also carry the neighbour arms' runs (`stripNb`), so the end row meets the junction ring with the ring's own slots and weights.
  - Caps and tails: one-hot to their chain.
- **The junction hand-off.**
  - The hub weighs each arm 1/n.
  - Each arm's mouth (P, M, N) is one-hot to that arm.
  - Each corner hands off from N_k to P_{k+1} by arc length along the corner, through smoothstep.
- **Colours.** `paint.ts`'s `sectionPaint(scene, mode, baseHue)` builds the runs. `app` is the app's section colours (`src/render/section_colors.ts`, `paint_math.ts`, read only). `step` and `kink` are the seam test's hard modes.

**Seam test** (`proto/k1278_seam.ts`, 12 scenes, `out/k1278/seam_full.txt`). Edge seams over 1/255; junction windows steppier than form B's (+1):

| | edge seams app / step / kink | junction windows app / step / kink |
|---|---|---|
| master fields | 34045 / 25671 / 34627 | 650 / 89 / 410 |
| master as drawn (flat chain colours) | 20310 | - |
| mine | 41 / 90 / 74 | 7 / 0 / 4 |

- **Mean colour difference** against form B, junction windows, app mode (x255): def 1.37 against master's 9.97.
- **The strict bar (0 and 0) is not met.**
  - *Edge seams.* They are mostly junc|strip, in the step and kink modes:
    - g41_def_tw64: 26, max 76.9 at (19.244, 2.243);
    - muse_hash step: 25;
    - ring step: 16, max 8.2.
  - *The largest seams:*
    - muse_hash ghost|strip at (23.218, 26.683): 79.0 in app;
    - muse_hash strip|strip at (33.310, 9.101): 82.6 in step.
  - *junc|tail.* Tails carry no neighbour slots.
  - *Steppier junction windows:*
    - app: muse_hash 2 (excess 1.6), g41_def_tw64 1 (1.1), g41_user_tw64 4 (4.6);
    - kink: g41_ring_tw64 1 (3.6), g41_user_tw64 3 (1.8).
  - *Folds.* The test counts K1277's inherited folds separately.

**Crops.**
- `out/k1278/crops/k1278_worst_junctions.png`: form B | master | mine at the 6 worst junctions, app mode. Mean diff, master -> mine:
  - def j16: 15.8 -> 10.6
  - def j14: 16.8 -> 10.6
  - def j156: 20.4 -> 8.8
  - def j81: 19.0 -> 8.8
  - muse_default_tw j150: 18.5 -> 8.7
  - muse_default_tw j163: 16.2 -> 8.3
- `out/k1278/crops/k1278_sliver.png`: the six sliver crossings. Command: `k1278_seam.ts --at=<scene>:<x>:<y>,... --crops=<dir> --cropname=<png>`.

**The end-arm sliver.**
- **Colour.** At rest the sliver's colour is gone at all six crossings. Crop-window mean diff against form B, master -> mine:
  - x73: 0.5 -> 0.1
  - x47: 0.4 -> 0.1
  - x292: 5.9 -> 5.3
  - x177: 0.9 -> 0.1
  - x14: 2.1 -> 0.2
  - x349: 1.5 -> 0.2

  The crop row shows master's pink (x14), cyan (x349) and green (x177) slivers gone.
- **Chain identity.** The census thread term (`proto/k1278_k1279.ts`, the paint column = the chain of the pixel's dominant slot) is worse than master at four crossings. Thread px, master | tri | paint:

  | crossing | master | tri | paint |
  |---|---|---|---|
  | x47 | 81 | 142 | 142 |
  | x73 | 113 | 202 | 202 |
  | x177 | 290 | 457 | 167 |
  | x292 | 1620 | 1858 | 989 |
  | x349 | 67 | 189 | 128 |
  | x14 | 5 | 64 | 119 |

  Over all 2916 crossings: master 41225, tri 32928, paint 13198 (worse on 24, better on 273); total worse on 0.
- **Why: geometry at x73, x47 and x349.** The end thread's own triangles do not cover form B's end-thread region (`k1278_sliver.ts`, `k1278_jdbg.ts --map/--under/--only`).
  - At x73 (junction 103), ch81's tail (a half-tube wedge) and strip 915 leave a band beside ch45 uncovered. There ch45's mirrored strip lies under the fan, and the fan's hub-P0-M0 triangle (arm 0, ch45) wins.
  - At x349, ch11's tail covers ch89's region.

  The fix reshapes the end thread's round end over the through thread. That is geometry (K1277's bars to re-run), not paint.
- **Why: paint at x14 (junction 4).** ch1 ends there and owns the fan; ch24 passes through.
  - Form B shows ch1's round end over the disc, with a hard edge (no ink) against ch24.
  - The fan blends from the ring arc between ch24's two arms (weight 1 to ch24) toward the hub (1/3 each), so the fan's middle is mostly ch24.
  - At rest, runs 2, 75 and 76 share a section colour, so it does not show; stage 2's pulses would.
  - A vertex field cannot make a hard edge inside a fan triangle. It needs a per-pixel term, for example the distance to the end thread's round-end disc.
  - Tried and reverted: a hub carrying only the owner's arms. Paint thread rose 13198 -> 14515 px, x14 went 119 -> 116, and it opened junc|tail and junc|strip seams (`out/k1278/k1279_hub.txt`).

**K1277's bars hold** (`out/k1278/bars.txt`, `run_bars.ps1`):

| bar | result |
|---|---|
| rest census | identical on all 12 scenes |
| motion def | 226 frames, topology 0, worse on 0, fill 548, paper 66 |
| motion fat | 217 frames, 0/0 |
| `k1277_k1279` | 0 worse, 38 better (total 26926, fill 0) |
| `k1247s5_cmp` | 44/8/0/0 |
| `npm test` | 220 files, 2897 tests green |
| GPU vs CPU paint (def, page test) | 2951 px, 0 over 3/255, max 0.6 |

**Stage 2 (pulses) needs.**
- s per slot: present, continuous along a chain, unwrapped at junctions.
- `across`: computed in `fillFrame` (`fr.across`). It needs a vertex attribute and a per-frame upload in `draw.ts`.
- The runs' identities per slot: present, so a pulse on a run lights exactly its slots.
- The x14 chain mismatch: a pulse will show it at end-arm junctions until a per-pixel round-end term exists.

**Left.**
- The residual seams and steppier windows above.
- The four sliver crossings' chain identity.
- Paint thread worse elsewhere: muse_hash x71 0->91, x149 4->73; g41_def_tw64 x191 5->59, x71 16->68.
- GPU vs CPU checked on def only.
- The untracked experiment copy `proto/proto_sliver/`, to delete.
- Tools: `k1278_seam.ts`, `k1278_k1279.ts`, `k1278_sliver.ts` (`--paint`), `k1278_jdbg.ts`, `k1278_base_fill.ts` (master's fill).
