# K992 stage 4: the march's S continuous by construction, then land

Ledger item: K992 (knotmaze `LEDGER.md`). K1000's continuous caps land
with it here. Read these first:
- `docs/design/K992_s3_landing.md`: `## Coordinator's calls` (all of
  them still hold, except where this brief changes them), Findings
  F4-F8, and `## Handoff`;
- `docs/design/K1000_continuous_caps.md`: `## Rules` (the census env).
Read the rest only as needed.

## Why

Stage 3 made the tangent foot and the part walk continuous (c21w: each
foot tracked within h/32 of the last one, Newton carrying the feet, the
parting bisected to 1e-6h).
- **At zoom 1** c21w has 172 pops / 2805 px, against master's 376 /
  10078.
- **In the ten windows** it has 3403 / 190259, against master's 4325 /
  1065307. It still fails two windows on count: muse_drag@w2 (889 pops
  against 879) and muse_flow@w0 (685 against 659).
- c21w2 (DROP 0.01) fixed j115/2 and failed four other windows, on
  one-frame collapses of r at many corners (F8).

The pops that remain trace to the march's S, a running minimum of point
samples of wAt, refined only where S drops by more than DROP. Two of its
choices flip between frames:
- whether an interval is halved (F7 b: j115/2's 19 pops that only c21w
  has);
- whether a sample lands inside one of the overlap gate's narrow dips
  in wAt (F8: j39/1's r goes 1.849h, 0.738h, 1.890h on f1-f3; observed
  there, the mechanism inferred, not traced).

c21w also grows the rule's own classes at zoom 1: rule plus rule:switch
go from 36 pops (master) to 96 (c21w) and 204 (c21w2).

## Coordinator's calls (technical)

1. **S is continuous by construction.** This is stage 3's call 2,
   applied to the march.
   - S, the running minimum of wAt, becomes the exact minimum of wAt
     over the stretch it covers. That minimum's value is continuous in
     the frame wherever wAt is, even where the place of the minimum
     jumps.
   - Compute it from wAt's pieces where they have a closed form.
     Otherwise use a certified bound (a Lipschitz bound, or interval
     arithmetic on wAt) refined to 1e-6h, whatever the frame.
   - No threshold on a sampled quantity decides what S is: no DROP-like
     choice. A finer DROP, or wider dips (c21w3's ove 0.25h), is not
     continuity. Use them only as checks.
   - Whatever reads the march's nodes follows the same rule. c17's
     footMaxA/B, the cap gate's input, is a maximum over the kept nodes
     with S > 0, so it moves with the node set. It becomes a function
     of the frame that no node set picks.
2. **The overlap gate's width is a look, not a fix.** ove sets how far
   j42/0's corner shrinks (F4: r 1.33h on muse_drag, against c17f's
   1.76h). Keep stage 3's 0.05h unless the census attributes pops to the
   gate's ramp itself. In that case widen it in geometry (stage 3 call
   5) and say so.
3. **Scope:**
   - in: the march (call 1) and footMaxA/B;
   - in: the refit gate at j51/1 (F7 c), which becomes a measure under
     stage 3's call 2;
   - in: j12/0's seven steep-stop pops (F7 a), if a choice flips there.
     A fast but continuous change is not a pop to fix; record it.
   - out: passReach's h/8 steps (the depth pins' walk, the census's
     "reach" class; master has them too). The coordinator files them as
     their own item.
   - out: class 1, which stays in K1000.
   - out: the concave-vertex foot hop (F4, 0.05-0.06h), unless it costs
     the gate.
4. **The gate** is stage 1's call 6 as written, at zoom 1 and in the ten
   windows. Every pop counts.
5. **Landing** is stage 3's call 7, through `land21.ps1` or its
   successor.
   - Remove the cap test's gate (`cap19_continuity.test.ts` lines
     72-77).
   - `corner_continuity.test.ts` (A)-(C) and the cap test's (A)-(D) pass
     on the landed oracle.
   - Re-freeze any pin that moves, and name it in the commit message.
   - Then raster14, cost14 and the crops (stage 3 calls 7 and 8). The
     cost is reported against master's, not gated in this stage.
   - Send j42/0's corner, at rest, among the crops: Levi sees it with
     K1001.
6. **The merge is the coordinator's.** Don't rebase or merge.

## Order

1. **Read.** `Get-Date`. Read the files named at the top. Find where the
   march computes S, where DROP refines, and where the kept nodes are
   read (`mk_c17.mjs` and what it generates).
2. **wAt's pieces.** Write down what wAt is made of between the march's
   nodes, and whether each piece's minimum has a closed form (F9).
3. **S by construction** (call 1).
   - Build it as a new mode of `mk_c17.mjs`, with footMaxA/B following
     it.
   - Add sweeps through j115/2's halving flip and j39/1's dip to
     `corner_continuity.test.ts`, or a test in its style.
4. **j51/1 and j12/0.** Make j51/1's refit gate a measure. Trace j12/0's
   steep stop, and fix it if a choice flips there (F10 onwards).
5. **The census,** under the lock, at zoom 1 and in the ten windows.
   Run the new rule on the new caps against master, and attribute it by
   class (`class17.ts`). Commit WIP first.
6. **If it passes the gate,** land it (call 5).
7. **If it fails,**
   - attribute the worst failing window's excess, ten small pops, as
     stage 3 did;
   - fix what is in scope (call 3);
   - re-run the census once.
   If it still fails, report and stop.
8. **Stop.**

## Rules

Stage 3's `## Rules` hold (they build on K1000's), with these changes:
- **Names:** new files take `*23*` in their names, and census runs
  write under `pops23/`. Stage 3 used `*21*`; S3a8b2 uses `*22*` on
  `k868-s3a`.
- **Stop rule:** stop at Order step 8.
  - The cap is 2 h from your start. Take `Get-Date` first, and again at
    each milestone.
  - At 1 h 30 min, finish the step you are on, commit WIP and append the
    handoff.
  - A compaction is not a stop. After one, re-read this brief and
    `git log` before going on.
- **The perf lock:** both censuses run under it (copy `locked21.ps1` to
  `locked23.ps1`). S3a8b2 holds it for timing until about 15:45. Wait
  for it inside one blocking command, never by checking again on later
  turns.
- **The branch:** `k992-corners`, at stage 3's WIP (`7ff4f637`) plus
  this brief. It is 6 commits behind master, all of them docs and
  ledger. S3a8b2 runs on `k868-s3a` and may merge first. Don't rebase
  or merge.
- **Tests:**
  - `corner_continuity.test.ts` stays red until the rule lands.
  - The cap test stays gated until the caps land.
  - The rest of `npm test` stays green.
  - Commit WIP at every milestone, and never push.
- **Findings and handoff:** continue the `## Findings` of
  `K992_s3_landing.md` here, from F9, in a `## Findings` section of this
  brief. Append a `## Handoff` here when you stop.
- **Env:** the census dev server on port 5392, as in stage 3. Stop it
  when you stop.
- **The final report** gives:
  - S's construction, and each other decision, one sentence each;
  - the sweeps;
  - the census at both zooms, by class, against master and c21w;
  - what landed: its tests, the pins it moved, and the cost;
  - the attribution, if step 7 ran;
  - the crops sent;
  - a `Ledger items` list;
  - K992's handle fields (owner, branch, last commit, evidence, next,
    brief, env).
