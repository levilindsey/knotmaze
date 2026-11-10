# K1247 stage 15: recompute only what moved (K1268)

Ledgers: K1247 (the frame's speed), K1268 (the lever) and K1240 (the redesign). One Claude Opus agent in
its own worktree, on its own branch from master. Cap 2 h.

## Why

Stages 12-14 are merged (88503be2). The structure is now decided once: stations are ordered by
structure, regions and underlays have structural ids, and the outline is no worse than master against
form B on all 12 scenes (stage 14's census). The speed has not moved: def's frame is about 21 ms
median at eps 0, and stage 8's model (7.6 + 11.2 × the fraction of points kept, ms) puts a 7.6 ms floor
under any amount of reduction. The 3 ms gate needs a lever past it. K1268: recompute only what moved,
per junction (or whatever unit the outline's structure makes natural), with the outline's continuity
bounding how far a unit you skip can be off.

Stable structural ids are what make a cache possible, so this is the first stage where it can be tried.

## Goal

def's `frame()` at ≤3 ms median and ≤6 ms p95 on real motion, with the drawn outline matching a full
recompute within the 0.25 device px bar on every frame. Levi's rule binds: the structure is decided once,
and only positions follow the frame. No piece that comes and goes, and no decision made from positions
about which pieces exist. Whether a unit recomputes may follow positions, as long as what is drawn stays
within the bar of the full frame. The technique is yours.

In this order:
1. **Real motion.** The timing model (`k1247s8_time.ts`) cycles every point from S to the 0.5h S' and
   back, so every unit moves every frame and this lever gives nothing on it by construction. Record real
   consecutive frames on def: a grab, a pull, a release and the settle until the sim sleeps, from the
   app's physics headless in Node (`src/physics/physics_host.ts`'s core is Node-testable; read only) or
   from the page. Add fat and muse_hash if it is cheap.
2. **The bound, before building.** Per recorded frame: how many units have inputs that moved more than
   the δ that keeps a skipped unit's drawn change under 0.25 px, and the frame cost that projects from
   each unit's measured cost. If the projection can't reach 3 ms median, report that with what it can
   reach (a negative result is a result), and stop there.
3. **Build it** if the projection holds: a unit reuses its last pieces while its inputs stay within δ of
   the positions it was last computed at, and recomputes otherwise. Watch the seams between a reused unit
   and a recomputed neighbour.

## Done

- **Setup.**
  - Check HEAD, then `git reset --hard <the master SHA the coordinator gives you>`.
  - Copy stage 14's untracked inputs from its worktree,
    `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-ad3e63c62ac810610\.claude\probes\K1240\`:
    the list in stage 14's brief (`docs/design/K1247_s14_seam.md`, Setup), plus `out/s14n` and `out/s14`.
- **Bars:**
  - Every recorded frame: the drawn outline against a full recompute of the same frame, no drawn
    difference over 0.25 px, and no paper or fill the full frame doesn't have (stage 14's census
    measure, per frame).
  - At rest: identical to master (the census per scene, `k1247s12_facecrops.ts` 0 px).
  - `k1247s9_union.ts --d=0.001,0.01`, still and `--cyc`: no worse than stage 14's handoff.
  - `k1247s5_cmp`: 44/8/0/0.
  - A locked timing pair (`k1247s8_run_locked.ps1`), master against yours, on the recorded drag and on
    the old S to S' cycle: def's median and p95, and the phase where the change lands.
  - `npm test` green.

## Rules

The Rules of `docs/design/K1247_s10_reduce.md` (your files: `outline.ts`, the `k1247s8_*` to
`k1247s15_*` tools and the check tools in `.claude/probes/K1240/proto/`; no `src/`, and form B is read
only), plus:
- **Load.** Other agents time things on this machine. While anyone else holds
  `$env:TEMP\claude-perf.lock`, run one scoring process at a time, at Idle priority. Take the lock yourself
  only for the timing pair.
- **Commit WIP at every milestone,** broken or not, and read code through the shell (`Select-String`, ranges
  of `Get-Content`), using Read only just before an Edit.

## Not this stage

Stage 14's leftovers stay open in the ledger: the 2 px speck at a tight inside turn on muse_hash (a fold
the even-odd fill drops; `K14_TRIM` closes it but decides from positions, so the fix belongs where the
border is built), the tail that comes and goes at g41_def_tw64 corner 105 (eps 0.1's worst, 7.103 px),
and the seam's fallback to its key's midpoint when the free stretch is closed.

## Report

The recorded motion (what, how many frames); the bound from step 2 (units moved per frame, projected
cost); what you built and its numbers; the bars; the timing pair; what's left; your last SHA. End with
`Ledger items` and K1247's handle fields.
