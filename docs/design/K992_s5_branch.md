# K992 stage 5: the march's branch a function of the frame

Ledger item: K992 (knotmaze `LEDGER.md`); this stage also answers
K1022's attribution (the build's cost). Read these first:
- `docs/design/K992_s4_continuous_march.md`: `## Coordinator's calls`
  (all of them still hold, except where this brief changes them),
  Findings F9-F13, and `## Handoff`;
- `docs/design/K992_s3_landing.md` `## Rules` and
  `docs/design/K1000_continuous_caps.md` `## Rules` (the census env).
Read the rest only as needed.

## Why

Stage 4 landed c23w on master (9b549d30): S at each fixed node is the
certified minimum of wAt over [h, node]. The census passes everywhere
against the old master: the ten windows have 3236 pops / 132921 px
(old master 4325 / 1065307), zoom 1 has 101 / 1073 (376 / 10078). The
label is behind `lbi`, so the default look did not change.

Two sweeps still jump, so `corner_continuity.test.ts` (D) and (E) are
`it.skip` (F11):
- **(D)** j115/2, muse_flow f30 to f31: S at node 7 jumps from 0.593 to
  0.708 between u 0.5175 and 0.52. `advance` (a predictor, then a
  newtonT polish) is path-dependent: from different starts the tracked
  feet land on different pieces. The branch has several values at one
  δ, and the certified minimum finds the deepest one on some frames
  only.
- **(E)** j39/1, def_drag f1 to f3: q jumps 0.117h at step 12. Not
  traced.

The build also costs 1.75x the old master's (the model 1.87x), above 2x
on g41_def_tw42 and muse_default_tw, and nobody knows which part
(K1022).

## Coordinator's calls (technical)

1. **Define the branch, then build it.** Write down, as a finding,
   which piece the foot sits on at a given δ, as a function of the
   frame's geometry alone: no march history, no start point. F11 names
   two ways:
   - follow the continuous branch from V, locating each foot hop to
     1e-6h;
   - choose the piece by a rule of the geometry.
   Take the one that makes S continuous in δ and between frames, and
   give the reason. A third way is fine, with its reason.
2. **Path independence is a test.** A unit test evaluates the branch at
   one δ from different starts (at least the three starts of F11's
   table, at u 0.5175) and gets the same piece and the same S, within
   1e-9h.
3. **Trace (E) before fixing anything.** Find what moves q at step 12.
   If it is not the branch, it gets its own finding; fix it here only if
   the fix is small, and otherwise report it.
4. **(D) and (E) run again**, un-skipped, at their tolerance (the
   largest step halved 20 times must shrink to 5e-4h). In `npm test`
   each takes under 5 s (about 18 s now). Shrink the work, not the
   tolerance; or keep a short form in `npm test` and move the full
   sweep to a manual test, with the reason.
5. **The gate**, as stage 4's, against master (now c23w): at zoom 1 and
   in each of the ten windows, no more pops than master. Report the
   area too, and the classes.
6. **Cost, with its split.** cost25 against master (c23w), under the
   lock: the model and the build, and the build split into the march,
   the caps, the walk and the rest (K1022). Cost blocks only if the
   build doubles against master.
7. **Raster.** raster25 against master: changed px by class. Trace each
   "none" px or list it.
8. **No look gate.** The label stays behind `lbi`. If a corner looks
   different at rest, save the crops (`pops25/crops25.png`); the
   coordinator decides what Levi sees.
9. **Where to edit.** c23w is master's `oracle.ts` now. Edit it
   directly, or keep the generators (`mk_c17.mjs` and a `land25.ps1`),
   whichever you can rerun; say which. The census's master side is
   `oracle_m25.ts`: master's `oracle.ts` at this brief's commit.

## Goal

- `oracle.ts` with the branch a function of the frame, committed on
  `k992-corners`.
- (D) and (E) un-skipped and passing; the path-independence test; the
  rest of `npm test` green; any pin that moves has a finding.
- The census at both zooms (`census25.ps1`, `pops25/`), raster25 and
  cost25 with the split.

## Order

1. `Get-Date`. Read the files above, and `git log -5`.
2. Trace (E) (call 3). F14.
3. The branch's definition (call 1) and the path-independence test
   (call 2). F15.
4. Build it, then run the sweeps (D) and (E) on it. F16.
5. The census at both zooms (call 5). F17. If it fails, stop here:
   commit WIP, append the handoff and report.
6. Land it: (D) and (E) un-skipped (call 4), `npm test`. F18.
7. raster25 and cost25, under the lock (calls 6 and 7). F19.
8. Append the handoff and report.

## Rules

Stage 4's `## Rules` hold, with these changes:
- **Names:** new files take `*25*`, and census runs write under
  `pops25/`. Stage 4 used `*23*`. S3a8b3 uses `*24*` on `k868-s3a`, and
  K868's next stage takes `*26*`.
- **Stop rule:** stop at Order step 8, or at the cap, whichever comes
  first.
  - The cap is 2 h from your start. Take `Get-Date` first, and again at
    each milestone.
  - At 1 h 30 min, finish the step you are on, commit WIP and append the
    handoff.
  - A compaction is not a stop. After one, re-read this brief and
    `git log` before going on.
- **The perf lock:** the census, raster25 and cost25 run under it (copy
  `locked23.ps1` to `locked25.ps1`). K868's S3a8b3 may hold it for
  timing until about 17:10. Wait for it inside one blocking command,
  never by checking again on later turns.
- **The branch:** `k992-corners`, at master (this brief's commit).
  Don't rebase or merge. S3a8b3 may merge into master while you run; it
  does not touch `oracle.ts`.
- **Tests:** commit WIP at every milestone, broken or not, and never
  push. `npm test` is green at the landing commit.
- **Findings and handoff:** continue from F14, in a `## Findings`
  section of this brief. Append a `## Handoff` here when you stop.
- **Env:** the census dev server on port 5392, as in stage 4. Stop it
  when you stop.
- **The final report** gives:
  - the branch's definition and why, and each other decision, one
    sentence each;
  - (E)'s trace;
  - the sweeps (D) and (E), and the path-independence test;
  - the census at both zooms, by class, against master;
  - what landed: its tests, the pins it moved;
  - raster25, and cost25 with the split;
  - the crops, if any;
  - a `Ledger items` list: follow-ups and residuals;
  - K992's handle fields (owner, branch, last commit, evidence, next,
    brief, env).
