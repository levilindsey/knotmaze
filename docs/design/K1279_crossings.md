# K1279: the redesign's crossings look like form B's

Ledgers: K1279 (this) and K1240 (the redesign). One Claude Opus agent in its own worktree, on its own
branch from master. Cap 2 h.

## Why

Levi, 2026-11-10, on cut 273 (g41_ring_tw64, a shallow crossing): the border lines overlap badly, in
both the old and the new version of the run end, and "we should ensure gaps are working correctly too".
Picture: `.claude/probes/K1247/asks/cut273_old_new_formb.png`. The bottom row is form B
(`src/render/field/form_b.ts`), the approved look, at the same two spots: (20.08, 20.86) and
(17.87, 20.66), each 1.6 units wide at 280 px/unit. That bottom row is the target.

## Goal

At every crossing of the 12 scenes, the redesign's look (`draw.ts`, border and fill from the one
outline table) matches form B's:
- the under-thread's two edge lines stop where form B's do, and fade the way form B's burial does;
- the over-thread's edge lines run unbroken across;
- no edge line lies across the other thread's fill where form B shows none, at shallow crossings too;
- no paper where form B has fill, and no fill where it has paper.

Levi's rule binds: the structure is decided once, and only positions follow the frame. No piece that
comes and goes, and no decision made from positions about which pieces exist. Where a run ends and how
it fades may follow positions continuously. The technique is yours.

In this order:
1. **The gap census.** Build a tool that scores every crossing of every scene in a window around it.
   It compares the redesign's ink (edge lines, with their fade) and its fill/paper against form B's,
   then lists the crossings worst first.
   `.claude/probes/K1240/proto/_k1271_ink.ts` renders form B's ink over its top surface, and
   `k1247s13_triple.ts` and `k1247s14_census.ts` show how to render both sides.
   Run the census on master first: that is the baseline.
2. **Fix** cut 273 and the census's worst crossings, then what the census says next, until time runs
   out or no crossing differs from form B by more than its edge pixels.
3. **The census again**, plus the bars below.

## Done

- **Setup.**
  - Check HEAD, then `git reset --hard <the master SHA the coordinator gives you>`.
  - Copy the untracked inputs from stage 15's worktree,
    `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a6cd6c8845ac7e543\.claude\probes\K1240\`:
    `out/` (all of it) and `proto/outline_master.ts`, `proto/outline_base.ts`.
  - If your worktree lacks `.claude/probes/K868/scenes/`, copy it from the main checkout.
- **Bars:**
  - The gap census: no crossing worse than master.
  - Cut 273's two spots and the 10 worst crossings, each as a crop row of form B | master | yours, at
    the K1271 picture's scale (`.claude/probes/K1240/out/k1279/crops/`). The coordinator looks at these
    before merging.
  - Stage 14's census (`k1247s14_census.ts`): no scene worse than master.
  - `k1247s5_cmp`: 44/8/0/0.
  - `k1247s9_union.ts --d=0.001,0.01`, still and `--cyc`: no worse than master. A drawn move you add
    has to be a fade sliding continuously, not a jump.
  - `npm test` green.

## Rules

The Rules of `docs/design/K1247_s10_reduce.md`, with these files as yours: `outline.ts`, `draw.ts`,
your `k1279_*` tools and the check tools in `.claude/probes/K1240/proto/`. No `src/`; form B is read
only. Plus:
- **Not yours:** the outline's jumps in motion (K1280-K1282) and the fill as triangles (K1277). Leave
  them unless a crossing can't be fixed without them, and if so, say so in the report.
- **Load.** Other agents time things on this machine. While anyone else holds
  `$env:TEMP\claude-perf.lock`, run one scoring process at a time, at Idle priority.
- **Commit WIP at every milestone,** broken or not. Read code through the shell (`Select-String`,
  ranges of `Get-Content`), using Read only just before an Edit.
- **Stop** when the stage is done or at 2 h from your start, whichever comes first. Check `Get-Date` at
  the start and at each milestone. Then commit WIP, append a handoff to this brief and report.
  Neither a compaction nor context size is a stop; after a compaction, re-read this brief and
  `git log`.

## Report

Report these:
- the census on master and on yours: the worst crossings, and how many crossings differ;
- what you changed, and why each change is decided from structure;
- the crop rows' paths;
- the bars;
- what's left;
- your last SHA.

End with `Ledger items` and K1279's handle fields.

## Handoff (2026-11-10, agent stage 1)

Branch `worktree-agent-a70157fa5e512c8ef`, from f0c1111c. Tools in `.claude/probes/K1240/proto/`
(`k1279_census.ts`, `k1279_crops.ts`, `k1279_motion.ts`, `k1279_dbg.ts`, `k1279_bars.ps1`, and the
master snapshots `k1279_base_*.ts` with `k1279_dump_base.ts`, `k1279_union_base.ts`); outputs in
`.claude/probes/K1240/out/k1279/` (untracked).

**Census** (`k1279_census.ts <tag> --vs=master`; per crossing, a window of half size
h·min(7, 1.25 + 1/sin θ) against form B's evalPoint, 3x3 range tolerance, "differs" above 12 px):

| | differ | total px | away from junctions (differ / px) | outside 4h of junctions |
|---|---|---|---|---|
| master | 1584 / 2916 | 81083 | 427 / 14322 | 890 / 33874 |
| mine | 458 / 2916 | 27594 | 0 / 406 | 5 / 1305 |

Per crossing: 0 worse than master (> +1 px), 2841 better, 75 the same. The 25 worst all sit at
junctions (muse_hash x77 846, x64 411, x278 371; g41_user_tw64 x138 370; muse_hash x292 346,
x134 328, x6 324, x71 293, x182 293, x287 269): form B's junction groups and arm fans blend the
borders softly there; the redesign draws them hard, on master too.

**Changes** (each decided once from the crossing diagram; positions only move ends and fades):
1. Ghost pieces (outline.ts): one per side of every crossing's discarded interval, diagram only,
   appended after every other piece, no region. Every crossing has them in every frame.
2. Form B's tie alpha on the bands (draw.ts): a band vertex inside a partner pass's tube is drawn at
   1 - g(d_o) ss(-zt, zt, key_o - key_c), key = z - d zt/h, g ramping across the partner's band.
   The passes come from the diagram; the fade is a continuous function of positions.
3. Walked pass spans: a pass's span runs while the two threads stay within 2.2h (h/4 steps), at
   least the straight reach 2h/sin + h; a walk that meets a junction root keeps the straight reach.
   Fixed cut 273's top-left (c3/c4 overlap 1.6 units past the straight reach).
4. Band rows: near a pass the band is split into 8 rows across its width, so a fade is not
   interpolated into pixels the partner does not cover (x346, x281).
5. One factor per partner stretch (same partner, |Δs| < h), the strongest fade: a minimum of
   continuous fades stays continuous (x221's band showed through the over's fill).
6. Tied segments are split on a fixed grid s = m·h/8, not into equal parts by length, so no sample
   jumps when a count steps.

**Crops** (form B | master | mine | |mine - B| | mine worse red / better blue), ppu 280, 1.6 units:
`out/k1279/crops/cut273.png`, `worst10_a.png`, `worst10_b.png`, `off_junction.png` (x22, x58).

**Motion** (`k1279_motion.ts`: k1247s9_union's jitter, a jump = ink moving > 0.25 past the 3x3
range): still master 6 / 191 px at d 0.001 / 0.01, mine 0 / 123; cyc10 master 9 / 106, mine 0 / 22;
cyc18 master 5 / 84, mine 0 / 7. Every crossing where mine jumps also jumps on master (still and
cyc10 with the same px: muse_hash x61, x182; g41_user_tw64 x54; g41_def_tw64 x309): outline jumps,
K1280-K1282.

**Bars** (`k1279_bars.ps1 -Tag final -SkipMaster`, logs in `out/k1279/bars/final/`, master's in
`bars/w1/`): k1247s14_census "B no worse than A on every scene"; k1247s5_cmp 44/8/0/0;
k1247s9_union `--d=0.001,0.01` still, `--cyc=10`, `--cyc=18`: identical to master line for line;
`npm test` green (220 files, 2897 tests).

**Left:**
- Junctions: all of the worst crossings. Form B's soft groups and fans belong to the junction lanes.
- The fill owner where two threads overlap at a shallow crossing (cut 273's top-left: form B pink,
  mine cyan): fill as faces, K1277.
- The walked span's junction-root fallback is decided by positions, so a span can snap between the
  walked reach and the straight one. Not seen in the motion runs.
- Small steps under the bar (largest 0.04 at d 0.001): candidates are the walk's h/4 steps and the
  |Δs| < h stretch threshold.
- Cut 273's second spot: a 79 px sliver drawn at 0.74 where form B is solid (net better than master).
