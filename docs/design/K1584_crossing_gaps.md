# K1584: crossing gaps under rp=gf (stage 1)

**Levi, 2026-11-23, on review tile A_3 b1 (rp=gf gfh=1):** "All over the maze we are missing gaps at an
extremely high frequency."

## The look to reach

At every crossing the under thread stops short of the over thread on both sides: its two border lines end
before the over thread's border, with clear ground between, so the eye reads over and under at a glance. The
fade ramp (K1423, K1492) is how a border ends; a border that runs into the over thread's border, or a fade that
ends touching it, is the fault. Binding rules: the under pass keeps its width and heading; never remove a
thread's border anywhere else; never trade a hook for a point; do not move gf's border strokes toward today's
ribbon renderer and do not use it as a bar.

You own the technique. The goal is the look above on the test mazes, not a number.

## What is known (check it, do not trust it)

- Muse run 27Z8 (`### Handoff 27Z8` in `docs/design/K1531_muse_batch27.md`, tools in `.claude/probes/K1584/`)
  counted 12,634 of 14,902 crossing sides with no gap on the 21 mazes, and found 602 of A_3's 700 already so on
  Nov 17 (7c739b425); the s18 merge 905abef19 added 45 on D_1. So this is mostly not a recent regression.
- The coordinator doubts the census rule: its ray starts looking for ink 0.01 world outside the over thread's
  half width, where the over thread's own border stroke sits, and no crossing on A_3 reads a gap on both sides.
  A sheet of eight of its no-gap crossings showed some with a visible fade and some with borders butting
  straight in. Build your own check, preferably from the renderer's own numbers (`eval.ts`, the CPU mirror)
  instead of pixels: per crossing side, where the under border's ink ends and how far that is from the over
  border.
- A_3's link values: thread width 0.80, casing 0.88, fade length 0.14, gap margin 0.07 world (about 3 px in a
  3200 px frame). If the gap is that small by construction, say so: then the fault is the size the look rule
  gives, not lost gaps, and the fix is the rule.

## This stage

1. Find why borders reach the over thread: which code paths decide a side's cut and fade, and for A_3 how many
   sides take each path (plain, fused joint arm, near a junction or tail, self crossing of a kink loop).
2. Fix it in `src/render/gpu_field/` so every crossing side shows the gap. Keep `gf_glsl.ts` and its CPU mirror
   in step.
3. Look at it yourself: before and after crops at a size where the gap is plain to see, at least 30 crossings
   on each of A_3, A_8 and D_1 spread over the four kinds, and whole-frame checks on all 21 mazes for anything
   else that moved (K1578 recipe; `scripts/perf_lock.ps1` around captures; never Chrome's
   --virtual-time-budget). Save sheets under `.claude/probes/K1584/s1/` (untracked) and name them in the
   handoff. A_3 b1's top-left quarter must be one of the sheets: it is the tile Levi named.
4. `npm test` green. Do not push and do not land: commit on your branch. The coordinator views the sheets,
   runs the guards and shows Levi.

Not this stage: junction stubs (K1585), the eye loop's border gap (K1586), the single shared border (K1587).
Note any you see change, for better or worse.

## Stop rule

Stop when the stage is done or 2 hours after your start (`Get-Date` at the start and at each milestone),
whichever comes first; then commit WIP (broken or not), append a handoff to this file (what you found, what
changed, the sheets, what is left) and report. A compaction is not a stop: re-read this brief and `git log`.
Read code through the shell (`Select-String`, ranges of `Get-Content`); the Read tool only just before an Edit.
No ledger edits: end your report with a `Ledger items` list. Helpers, if any, run on sonnet for mechanical work
only and follow this stop rule.

## Stage 1 handoff (2026-11-23, agent on branch `worktree-agent-a2dfb242b056cf793`)

**Found.** The check is `.claude/probes/K1584/s1/gapcheck.ts`: it runs the renderer's own gap tables on a
capture's scene and models the cut along each under border's first exit (4 exits a crossing). It does not use
the 27Z8 census rule. Classes: `full` (margin 0.07 and fade 0.14 as set), `flag` (the K1482 joint flag: margin
-1 px and a short fade, so the border runs to the over thread's outline by design), `scale` (joint room shrinks
the cut), `window` (the crossing's window ends or collapses before the exit), `stolen`, `none`.

| maze (crossings, exits) | full | flag | scale | window | stolen + none |
|---|---|---|---|---|---|
| A_3 before (350, 1,400) | 846 | 467 | 44 | 37 | 6 |
| A_3 after | 862 | 372 | 123 | 37 | 6 |
| A_8 before (344, 1,376) | 795 | 451 | 53 | 71 | 6 |
| A_8 after | 816 | 346 | 137 | 71 | 6 |
| D_1 before (349, 1,396) | 1,002 | 392 | 0 | 2 | 0 |
| D_1 after | 1,263 | 21 | 110 | 0 | 2 |

The joint flag is the cause: it sat on a third of every maze's exits. On A_3, 269 of the 467 were s18's under
rule (a member UNDER sample within the cut's reach of the slot's outline point), about 196 s15/s17's over rule.
On the D link s18 was nearly all of it. The minor paths (window 37, scale 44, stolen 2, none 4 on A_3) are not
touched. By the four kinds the brief asks for, sides with both borders full on A_3: 360 of 700 before, 372
after. **The gap is small by construction even where it is full**: 0.07 world of clear ground is 3 px on the
3200 px frame, and the ink is back to half about 5.5 px out. The 27Z8 count (602 of 700 "no gap") is far above
what the renderer's tables say (340 of 700 sides with a border that is not full), so its rule read many full
3 px gaps as none.

**Changed** (a candidate, not an approved look): `src/render/gpu_field/gf_look.ts`, `gapJointFlags`: s18's
under rule now holds only on slots within `GAP_JOINT_UA` 0.1 of arc of a member under sample (the joint
itself), not on every slot within the cut's reach of one. Tables only: no GLSL change, so `gf_glsl.ts` and the
mirror are untouched. `test/render/gf_gap.test.ts` gains one line (a slot 0.2 of arc from the arm keeps its
gap). `npm test`: 259 files, 3,232 tests passed. Arc gates of 0.3, 0.5 and 0.8 put 455, 466 and 467 flags
back: nothing between "the joint itself" and "everything" exists on this axis.

**Whole frames, all 21 mazes** (same pinned view each, `framediff.py`, luminance step 6): every changed box is
brighter (ink removed), and all but one lie within 45 px of a crossing. A mazes: 1,546 to 2,099 px in 128 to
158 boxes; D mazes: 5,298 to 6,290 px in 167 to 186 boxes. The one other box: A_5, 2 px at (1592, 1560), 50 px
from crossing 60. Nothing darker anywhere.

**What the pictures show** (I read every sheet). Gaps that were closed do open (A_3 x97, x233, x104, x332,
x168, x226, x329, x63; D_1's region sheet), but the change is small on screen, and it is NOT the whole look:
- It opens one border at K1482 s18's named joint sites, which Levi approved closed: j15/t70s (via x40), j22
  (x57), t65s (x269), j148 (x207), j88 (x119), t80s (x339), t57e (x29); t81s and j63 look unchanged. Sheet:
  `A_3_named_joint_sites.png`. No gate I tried (arc, dUm, exit arc, window, angle) separates those sites from
  ordinary crossings beside a joint: they are one mechanism. This needs Levi's pick.
- 372 exits on A_3 stay flagged (s15/s17, and slots that are themselves joint members), visible in b1's
  top-left quarter at x98, x99, x169, x170. Opening those means measuring the gap against the fused joint's
  real outline, a larger design, not started.

**Sheets** (untracked, `.claude/probes/K1584/s1/`; each tile before | after, label = kind and the four exits'
classes before>after, f full, s scale, w window, flag letters as printed):
`A_3_crossings_1.png`, `A_3_crossings_2.png` (32 crossings), `A_8_crossings_1.png`, `A_8_crossings_2.png` (32),
`D_1_crossings_1.png`, `D_1_crossings_2.png` (33; D_1 has no near-junction kind in my classes),
`A_3_b1_topleft.png` (x 800..1200, y 0..300, before above after), `A_3_named_joint_sites.png`,
`D_1_region.png`, `out/v1_top16.png` (A_3's 16 largest changes). Captures: `out/before/<maze>/`,
`out/after/<maze>/`; diffs `out/diff_<maze>.json`; counts `out/<maze>_before.json`, `_v1.json`.

**Tools** (tracked): `gapcheck.ts` (`$env:GF_KRETRY="1"; npx tsx gapcheck.ts <captureDir> <out.json>`),
`cap.ps1`, `capmany.ps1`, `run_after.ps1`, `framediff.py`, `places.py`, `sheet.py`, `mksheets.py`, `region.py`.

**Left.** (1) Levi's pick: keep this change (more gaps, s18's named sites open on one border) or drop it.
(2) The remaining 372 flagged exits on link A. (3) Whether 3 px is a gap at all: widening margin or fade is a
look change on every crossing. (4) Windows that collapse beside joints (A_3 crossings 49, 100, 166, 194, 202).
(5) K1585, K1586, K1587 places: nothing seen moving there beyond the crossing boxes above; not checked place
by place.

## Handoff stage 2 (2026-11-23, pictures for Levi's pick, nothing in src/ changed)

Five variants of the pinned A_3 frame (hash fff8c9e5, 3200x1800): Today (e5616094b), Try 1 (b4c48f3a9),
All gaps open (joint flag off, margin 0.07), Gaps 2x (flag off, margin 0.14), Gaps 3.5x (flag off,
margin 0.25, fade 0.3). V2..V4 came from one temporary build: `s2/variants.patch` adds query overrides
`k84j=1` (skip `gapJointFlags`) and `k84g=<world added to lookGap>`; `s2/run_s2.ps1` captures them;
`s2/variants.py` builds the sheets. The patch is NOT applied in the tree.

Sheets (untracked): `.claude/probes/K1584/s2/A_3_b1_variants.png` (frame x 800..1600, y 0..600),
`A_3_c2_variants.png` (x 1600..2400, y 600..1200), `A_3_named_sites_variants.png` (the nine named
sites, one row each, five columns, 4x); reading crops `s2/out/read_1..8.png`.

Changed pixels against Try 1 (framediff): All gaps open 6,186 px in 260 boxes, Gaps 2x 22,190 px,
Gaps 3.5x 64,638 px; all brighter (border removed), 259 of 260 boxes within 45 px of a crossing.

Read:
- Today / Try 1: the same at a glance in both regions; crossings read as T-meetings of borders.
- All gaps open: every crossing gets a gap of about 3 px a side, visible at 2x, small at 1x. Named
  sites j148, t57e, j63 unchanged; j15, j22, t65s, j88, t80s, t81s each lose a few px of border end
  where a crossing's under side sits at the joint (the joint outline itself stays closed).
- Gaps 2x: the weave reads clearly at 1x. j15, j22, t65s, t80s, t81s show a visible open end beside
  the joint; j88's left border opens; t57e's hook start fades. j148, j63 unchanged.
- Gaps 3.5x: broken. Short borders between close crossings vanish (the ladders in region c2 turn into
  floating dashes), j88 falls apart (a detached fragment), j15 loses its inner borders, t57e's hook
  and t81s's border are cut. j148 and j63 still unchanged.
- The margin also feeds marker gaps, `gfJointClear` and `pinReach`, so V3/V4 widen those too; a real
  change would need a crossing-only margin.
