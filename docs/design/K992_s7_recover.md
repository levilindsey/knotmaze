# K992 stage 7: S recovers past a crossed cascade; stage 5's sharp refit continuous

Ledger item: K992 (knotmaze `LEDGER.md`). Read these first:
- `docs/design/K992_s6_tie.md`: `## Coordinator's calls` (all still
  hold, except where this brief changes them), `## Rules`, Findings
  F18-F20 and `## Handoff`;
- `docs/design/K992_s4_continuous_march.md` F9 (wAt's pieces) and F10
  (S by construction);
- `docs/design/K1000_continuous_caps.md` `## Coordinator's calls` 1-3
  and `## Rules` (the census env).
Read the rest only as needed.

## Why

Stage 6's F19 made j56/1's branch continuous: advance takes a cascade's
jump, and the tie test (F), (D), (E) and the path test pass. The census
still fails at both zooms (F20), for two reasons and one gate question:

| window (pops / px) | master | stage 6 | cause |
|---|---|---|---|
| def_flow@w1 | 132 / 1148 | 100 / 4784 | j56/1: S keeps the gate's dip past the jump |
| def_drag@w0 | 223 / 12685 | 221 / 12882 | about 307 px at j56/1, the same dip by place |
| muse_drag@w0 | 106 / 13285 | 110 / 13258 | master's own pops, split into more pieces |
| muse_drag@w2 | 855 / 49811 | 859 / 49765 | the same |
| muse_flow@w0 | 655 / 10540 | 649 / 10542 | +2 px |
| zoom 1 muse_drag | 23 / 180 | 41 / 659 | untraced flicker pairs |
| zoom 1 muse_flow | 74 / 871 | 185 / 3092 | stage 5's refit falls back to sharp (j104/1, j18/0) |

At j56/1 (def_flow f38), the near side of the cascade has w 0.3935
(Δ about 0.03h). S, a running minimum, keeps that value for the 1.33h
of march left after the jump, although w is back to 1 by node 27. The
dip moves with the flow (0.24 at f39), so r slides 1.0014h to 0.8052h
in one frame and back to 1.0370h in the next: continuous, but about
0.2h a frame, which the zoomed census counts as pops (def_flow@w1's
+3636 px). Master hides it by stopping at the cascade (r 0.47-0.48h),
a stop that itself jumps where Δ reaches 0.

## Coordinator's calls (technical)

1. **S recovers past a crossed cascade** (the handoff's option 1).
   - **Not option 2** (master's stop with the area past it faded in by
     ss(1 − Δ/0.05h)): at j56/1 that fade is the dip itself (0.39 at
     f38, 0.24 at f39), so it multiplies the same 1.33h of march and r
     slides as it does now.
   - **Why option 1:** the dip anticipates the hop. Once the march has
     taken it, the tracked foot is on the nearest piece again and the
     gate's reason is gone. At j56/1 the skipped piece (773) sits 1e-5h
     from the contact's distance: arm A is one shallow basin there, not
     an overlap.
   - **Continuity, at each place the restart can switch.** Give each an
     argument or a test:
     - a. Δ → 0: the jump and the dip vanish together (the handoff's
       argument).
     - b. Where the gate closes (Δ ≥ 0.05h, w 0): if anything stops the
       march on S alone, a restart past the jump would bring back area
       that a stopped march never reaches. Fade the restart out before
       that, or don't stop on S alone.
     - c. The 0.1h bound and the 64-jump cap: under F19 a refused jump
       stops the march where S was about 0 anyway. With a restart the
       march past it carries full weight, so a refused jump would drop
       it all at once. Fade the restart's weight down to F19's carry
       before either one refuses (for example by ss of the jump's size
       against the bound); give the width and its reason. This also
       settles F19's den(V) < 0.45 residual (K1038).
     - d. A cascade onto material the gate is right to hold off: where a
       real ridge of the arm separates the rival's basin from the
       contact's, the dip is the gate doing its job. Weight the restart
       by how shallow that ridge is (a smooth function of the skipped
       pieces' height above the contact's distance, over a fixed width
       in h; give it and its reason), so j56/1 restarts fully and a deep
       ridge keeps F19's carry.
   - **K1000 call 2 holds:** the cap stays a pure, continuous and
     monotone function of the frame. The restart's weights fall as the
     cascade deepens.
   - Another continuous rule is fine if it meets a-d, with its reason.
     For example, a margin that does not count a rival across a shallow
     ridge removes j56/1's dip one step earlier. Say which you take and
     why.
   - **Check on the crops before the census:** j56/1 at f38-f40
     (`frames27_j56_f38_39.json`, `frames27_j56_f39_40.json`) and t5,
     t8 (`frames27_j56_t5.json`, `frames27_j56_t8.json`). r is
     continuous (the tie test (F), (D), (E) and the path test), and its
     largest change per frame is no more than master's largest change
     per frame there, or say why the census won't see it.
2. **Stage 5's sharp refit, continuous.** At j104/1 (f19) and j18/0
   (f28) the fit falls back to a sharp corner on alternate frames ("fit
   r 0.397h → 0.000h: crossing 49's pass 3.32h out (no room past V:
   sharp)"; at j18/0, 2.000h → 0). Master's fit never fires there, and
   stage 5's oracle flips the same way.
   - Trace what stage 5 changed that makes it fire: the fit's inputs on
     both frames under c25 and m25 (the feet, fmax, the crossing's pass,
     the room past V), with `frames27_j104_f19_20.json` and
     `frames27_j18_f27_28.json`.
   - If stage 5 feeds the fit a wrong input, fix that input. If the
     fallback is a switch (a threshold on the room that picks sharp or
     round), make r a continuous, monotone function of the room that
     fades to sharp over a fixed width; give it and its reason. Keep the
     sharp point where the room is gone: K1001 (sharp where two threads
     split) is a look Levi has still to see.
   - A test for one of the two, as (F) is, its short form under 5 s.
3. **The gate,** per window and at zoom 1, against master (stage 6's
   call 4), with one change: every pop still counts, but a reshape of
   master's own pop is not a new pop.
   - **Pairing.** In each frame transition, pair the pops only in the
     branch with the pops only in master whose boxes overlap (extend
     class27's `--vs` lists with this match). A paired group counts as
     many pops as master's side of it. Its area counts as it is.
   - **Then, in each window and at zoom 1:** no more pops than master,
     and no more pop area than master plus 0.5% (at least 5 px). A
     window over either fails.
   - **List** each unpaired extra pop (corner, frame, class, size and
     cause) and each paired group (both sides' counts and areas).
   - **Reason.** F20's zoomed muse failures are master's pops split
     into more pieces (spans 77 at t0: 7 pieces and 135 px against 3
     and 146 px) or +2 px. Those are not regressions, and any branch
     that reshapes master's corners can't meet a strict count. K1000's
     call 1 still holds: no class excuses a pop.
4. **Muse's other zoom-1 extras.** After calls 1 and 2, the census says
   what remains. Trace each unpaired extra over 20 px, or list it.
5. **Cost,** as stage 6's call 5: cost27 with the split (the march, the
   caps, the walk, the rest; K1022), under the lock, master and branch
   in the same run. It blocks only if the build doubles against master.
6. **No look gate.** raster is the next stage's.

## Goal

- `oracle.ts` with S recovering past a crossed cascade (call 1) and the
  refit continuous (call 2), committed on `k992-corners`, with their
  tests; `npm test` and both tscs green.
- The census at both zooms passing call 3's gate, and cost27 with its
  split. The branch is then ready for the coordinator to land.

## Order

1. `Get-Date`. Read the files above and `git log -10`.
2. Call 1 on the crops: the rule, a-d, the crop checks, the tie test,
   the sweeps and the path test. F21.
3. Call 2: trace j104/1 and j18/0, the fix and its test. F22.
4. `npm test`, `npx tsc --noEmit` and `npx tsc -p notices --noEmit`.
   Commit.
5. The census at both zooms under the lock (about 45 min: c27z took 34
   min and c27 11), class27 with the pairing, and the gate (call 3).
   F23. If it fails, stop here: commit WIP, append the handoff and
   report.
6. cost27 under the lock (call 5). F24.
7. Append the handoff and report.

## Rules

Stage 6's `## Rules` hold, with these changes:
- **Names:** new files take `*29*`, and census runs write under
  `pops29/`. K868's S3a8b5 uses `*28*` on `k868-s3a`.
- **Stop rule:** stop at Order step 7, or at the cap, whichever comes
  first. The cap is 2 h from your start; take `Get-Date` first and at
  each milestone. At 1 h 30 min, finish the step you are on, commit WIP
  and append the handoff. The census needs about 45 min: if it can't
  start by 1 h 10 min, don't start it; commit, append the handoff and
  report. A compaction is not a stop: after one, re-read this brief and
  `git log` before going on.
- **The perf lock:** the census and cost27 run under it
  (`locked27.ps1`). K868's S3a8b5 may hold it until about 20:15. Wait
  for it inside one blocking command, never by checking again on later
  turns.
- **The branch:** `k992-corners`, at stage 6's last commit with this
  brief cherry-picked on top. Its base stays `952cf681`: don't rebase or
  merge.
- **Reading code:** through the shell (`Select-String` to find lines,
  `Get-Content <file> | Select-Object -Skip <n> -First <m>` to read
  them); the Read tool only just before an Edit.
- **Helpers:** any helper runs on `model: sonnet`, with a 1 h cap and
  this stop rule in its brief.
- **Findings and handoff:** continue from F21, in a `## Findings`
  section of this brief; append `## Handoff` when you stop.
- **The final report** gives:
  - the rule and its answers to a-d, one sentence each, with reasons;
  - the crop checks, the tie test, the sweeps and the path test;
  - the refit's trace and fix, and its test;
  - the census at both zooms, by class, against master, with the
    pairing, and every unpaired extra pop explained;
  - cost27 with its split;
  - `npm test` and both tscs at the last commit;
  - a `Ledger items` list: follow-ups and residuals;
  - K992's handle fields (owner, branch, last commit, evidence, next,
    brief, env).
