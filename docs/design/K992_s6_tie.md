# K992 stage 6: the branch continuous where two pieces tie

Ledger item: K992 (knotmaze `LEDGER.md`). Read these first:
- `docs/design/K992_s5_branch.md`: `## Coordinator's calls` (all still
  hold, except where this brief changes them), `## Rules`, Findings
  F14-F17 and `## Handoff`;
- `docs/design/K1000_continuous_caps.md` `## Rules` (the census env).
Read the rest only as needed.

## Why

Stage 5 made the march's branch a function of the frame (F15: footBr,
hopsIn, the tangent feet at q). The sweeps (D) and (E) and the path
test pass (F16). The census fails (F17). Five of the ten windows ran;
raw counts against master (c23w):

| window | master: pops / area / largest px | stage 5 |
|---|---|---|
| def_drag@w0 | 223 / 12685 / 905 | 230 / 15767 / 1968 |
| def_flow@w1 | 132 / 1148 / 52 | 114 / 30547 / 3180 |
| muse_drag@w0 | 106 / 13285 / 2335 | 110 / 13258 / 2335 |

def_flow@w0 and @w2 were identical to master. In def_flow@w1, 18 pops
of about 3000 px each, all at corner j56/1, make 29669 of the window's
30547 px: its r flips between about 1.05 and 0.42 at t 0, 5, 8, 27, 30
and 37.

Stage 5's reading, not tested: the branch is a function of the frame
now, but at j56/1 that function jumps where two pieces tie, and
master's path-dependent `advance` stayed on one piece and hid the tie.
Stage 5's F15 residuals are the other candidates: far basins left to
the overlap gate, adjacency forming while the rival is already nearer,
a hop and a hop back in one interval, a result that depends on the
starting basin, and the chord test, exact only on a straight q path.

## Coordinator's calls (technical)

1. **Trace j56/1 before changing anything.** On the frames each side of
   t 5, and of one more flip, record each candidate piece's foot and
   distance, footBr's hops, the piece it picks, and S, r and q. Then
   say which it is:
   - a tie: two pieces' distances cross and the nearest one switches;
   - a defect in footBr, hopsIn or the tangent feet (an F15 residual,
     the window's edge, the 16-hop limit, or another), which you then
     fix.
2. **Pure and continuous, both** (K1000). A function of the frame that
   jumps at a tie still pops. If j56/1 is a tie, make the result
   continuous through it:
   - for example, blend the two pieces' results with a smooth weight of
     their distance difference, over a band of fixed width in h (one
     width for every corner; give it and the reason), so that away from
     the tie the result is exactly the nearer piece's;
   - or another continuous rule, with its reason.
   What stage 4 and K1000 require of S still holds. Don't go back to
   master's path-dependent branch: it hides the tie but brings back (D)
   and (E). Stage 5 rejected blending den because that blend still
   depended on the path near the tie; a blend of two pure results does
   not.
3. **A test for the tie.** j56/1 across its flip frames, as (D) and (E)
   are: the largest step, halved 20 times, shrinks to 5e-4h. Its short
   form takes under 5 s alone. The path test, (D) and (E) stay green.
4. **The gate,** as stage 5's call 5, plus area: the census at both
   zooms (all ten windows and zoom 1), class17 and `cmp27.ps1` against
   master (`oracle_m25.ts`). In each window and at zoom 1: no more pops
   and no more pop area than master. A window over either fails; list
   each extra pop's corner, frame, class and size, and what makes it
   (the tie, another jump, or a pop master hides at that corner).
5. **Cost, before landing.** cost27 as stage 5's call 6, with the split
   (the march, the caps, the walk, the rest; K1022). It blocks only if
   the build doubles against master. Stage 5's census saw the in-page
   build's p50 at 916-1242 ms against master's 433-784 ms, under load
   from other agents: say whether that holds unloaded.
6. **No look gate,** as stage 5's call 8. raster27 is the next stage's.

## Goal

- `oracle.ts` with a branch that is pure and continuous at j56/1,
  committed on `k992-corners`; the tie test; `npm test` and both tscs
  green.
- The census at both zooms passing the gate (call 4), and cost27 with
  its split (call 5). The branch is then ready for the coordinator to
  land.

## Order

1. `Get-Date`. Read the files above and `git log -8`.
2. Trace j56/1 (call 1). F18.
3. The rule (call 2), the tie test (call 3), the sweeps and the path
   test. F19.
4. The census at both zooms, class17 and `cmp27.ps1` (call 4). F20. If
   it fails, stop here: commit WIP, append the handoff and report.
5. cost27 under the lock (call 5). F21.
6. `npm test`, `npx tsc --noEmit` and `npx tsc -p notices --noEmit` at
   your last commit. Append the handoff and report.

## Rules

Stage 5's `## Rules` hold, with these changes:
- **Names:** new files take `*27*`, and census runs write under
  `pops27/`. K868's S3a8b4 uses `*26*` on `k868-s3a`.
- **Stop rule:** stop at Order step 6, or at the cap, whichever comes
  first. The cap is 2 h from your start; take `Get-Date` first and at
  each milestone. At 1 h 30 min, finish the step you are on, commit WIP
  and append the handoff. A compaction is not a stop: after one,
  re-read this brief and `git log` before going on.
- **The perf lock:** the census and cost27 run under it (`locked25.ps1`,
  which checks the owner's pid). K868's S3a8b4 may hold it until about
  18:50. Wait for it inside one blocking command, never by checking
  again on later turns.
- **The branch:** `k992-corners`, at stage 5's last commit with this
  brief cherry-picked on top. Its base stays stage 5's (`952cf681`):
  don't rebase or merge.
- **Findings and handoff:** continue from F18, in a `## Findings`
  section of this brief; append `## Handoff` when you stop.
- **The final report** gives:
  - j56/1's trace, and what it is (a tie or a defect);
  - the rule, and each other decision, one sentence each, with its
    reason;
  - the tie test, the sweeps and the path test;
  - the census at both zooms, by class, against master, with every
    extra pop explained;
  - cost27 with its split;
  - `npm test` and both tscs at the last commit;
  - a `Ledger items` list: follow-ups and residuals;
  - K992's handle fields (owner, branch, last commit, evidence, next,
    brief, env).
