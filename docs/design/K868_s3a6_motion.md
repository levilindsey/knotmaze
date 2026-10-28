# K868 S3a6: the label in motion, and the corner's rules (stage brief)

Stage brief (coordinator, 2026-10-28). Parent: K868
(`docs/design/K868_field_border.md`). Previous stage: S3a5
(`docs/design/K868_s3a5_incremental.md`). Before anything else, read its
sections 2, 3, 5, 10 and 11 and its `## Handoff`. Ledger items: K868 (this
stage), K971 (the per-frame cost), K984 (the readback, later) and K985
(S3a5's leftovers).

## Why

S3a5 designed the label's per-frame path and found two things that decide
what comes next:
- **The structure flips under any motion.** With flow on, about one
  cluster merges or splits per frame, 80-90 depth pins change their reach
  step, and corners move more than 0.1 world in a frame 17-216 times per
  41-frame sequence, while no point moves more than 0.064 world.
- **Today's corner solve picks its root by its Newton starts and its
  window clipping**, so a solve continued from the last frame differs from
  it by whole roots (0.8-1.7 world, 18-37 px at zoom 1) on 1-5 corners per
  sequence. No other path can give the same answer by construction.

At 0.44 s a rebuild, nobody has seen the label in motion. Before the GPU
stages copy today's rules, this stage finds out what pops on screen and
why, and fixes the corner's rule, the pop source the data already points
at.

## Coordinator's calls (technical)

1. **The geometry names the corner's root, not the history.** The label
   stays a pure function of the frame: the from-scratch build is the
   definition, and every later path must give its answer. Carrying a root
   over from the last frame is out.
   - The candidate rule is the rolling ball's own definition. The ball
     rolls into the opening from its open side, and the corner is its first
     contact with both arms (the closing of the arms by the ball). A root
     behind that contact is unreachable. A root at a search window's end is
     not a root.
   - Check the candidate on the data. Change it only where the data shows a
     better stated rule. Write the rule in one sentence in the findings and
     in the code's comment.
2. **K883's re-fit is a solve:** the radius at which the tangent point
   meets the cap, to 1e-6 h, instead of an iteration path. Where today's
   iterations converge it gives their answer; report where it differs.
3. **Depth per fragment** is S3a7's, not this stage's: the exact
   `depthAt`, ties broken by a stable rank, never by draw order.
4. **The strips drop their cuts** in S3a8, not this stage: one quad per
   segment between its vertex-normal offsets, so the kink at every cut
   goes.
5. **One frame late is out**, since it is wrong on every flow frame.
   - The corners and walks go to the GPU (S3a10), solved from scratch on
     each frame with no warm state, so they give the reference's answer by
     construction.
   - The incremental CPU FieldModel (S3a9) is dropped: its floor (6-14 ms
     on the desktop, estimated) is several times the phone's frame.
   - Whether the CPU may read the walks back in the same frame, or the
     clusters and pass tags move to the GPU too, is K984's call. It needs a
     measurement on the phone.
   - If this stage's census changes any of these calls, say so in the
     report.

## Goal

- **A reusable pop census**, `scripts/label_pops.mjs` (or `.ts`, run
  through vite-node). It takes the label's frames in motion and finds the
  pixels that change more than the motion explains. It groups them into
  pops and attributes each pop to its cause. S3a7, S3a8 and S3a10 will
  rerun it as their "nothing new pops" check.
- **Today's label through it** (master's rules) on S3a5's four sequences:
  pops per frame by cause, and crops of the worst of each cause, looked
  at.
- **The corner jumps classified.** Each reference jump (V or q moves more
  than 0.1 world in a frame) is one of:
  - a switch: the root continued from the last frame still exists, and the
    reference picks another;
  - a fold: the continued root vanishes;
  - amplification: the same root, moving fast at a small opening.

  Give the counts per sequence, and a crop of the worst of each class.
- **Calls 1 and 2 in the oracle,** committed on the branch, with `npm test`
  green.
- **After the rules,** rerun:
  - the pop census and the jump classes;
  - a raster census of the 12 scenes against master, with every changed
    pixel attributed to a changed root or re-fit;
  - the from-scratch build's cost before and after, under the perf lock.

## Order

1. `Get-Date`. Check the zoom's real maximum; S3a5 assumed 8x.
2. **The pop census tool.**
   - Record the label's image at every frame of the four sequences, with
     the sim paused per frame. S3a5's recorder (`seq13_record.mjs`) drives
     them.
   - Check that the rerecorded geometry matches S3a5's recording, so the
     events line up.
   - Freeze the camera while recording. The viewport follows the knot's
     bounds, so otherwise the whole picture moves.
   - A pixel that changed between frames i and i+1 is explained when its
     new colour is found in frame i within the local motion: the largest
     displacement of the samples near it, plus 1 px.
   - The unexplained pixels, in connected blobs above a stated size, are
     the pops.
   - Attribute each pop to the nearest structure event of that frame
     transition, using S3a5's event counter, extended to report where each
     event is. The causes are:
     - a corner's jump, by class;
     - a cluster merging or splitting;
     - a reach step;
     - a chain's point count;
     - none found.
3. **Today's label through it.** Crop and look at the worst pops of each
   cause, as frame i, frame i+1 and their difference.
4. **The jump classes,** from S3a5's warm prototype (`seq13_corner.ts`)
   against the reference.
5. **The rules** (calls 1 and 2) in `src/`, with unit tests where the
   oracle has them.
6. **Rerun** the pop census, the jump classes, the 12-scene census and the
   cost.

## Rules

- **Branch and probes.**
  - Work on branch `k868-s3a`, in worktree `.claude/worktrees/k868-s3a`.
    The coordinator has fast-forwarded it to master with this brief. Its
    `node_modules` is a junction to the main checkout's.
  - Commit at every milestone, broken or not, and never push.
  - Keep probes and results in this worktree's `.claude/probes/S3a/`
    (untracked), with `*14*` in new file names. The pop census is the
    reusable harness, so it goes in tracked `scripts/`.
  - Write each finding into a `## Findings` section of this brief as you
    get it, not at the end. It survives a compaction.
  - The fixture links carry `fw=0`, so a flow recording adds
    `&fw=0.3&fv=0.5`, as S3a5's did (its section 2).
  - Dev server: K868's `env:` command, port 5381. Stop it at the end.
- **Timing.**
  - Every timing, in Node too, runs under the perf lock
    (`$env:TEMP\claude-perf.lock`, one line: owner, start time, what). If
    another owner holds it, wait inside one blocking command. A lock
    older than 30 min is stale. Delete it when you are done.
  - The cursive agents run Python fits on this machine through the
    morning. Take each pair you compare back to back, and label the
    numbers taken under load.
- **Code.**
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`). A Read attaches the render lore every
    time.
  - The rule changes move the oracle, so update the tests and pins that
    they move, and name each one in the commit message.
- **Not allowed:**
  - the phone;
  - `npm run build` in the main checkout;
  - processes you did not start;
  - Levi's Chrome profile;
  - `LEDGER.md`.
- **Crop and look** at your own renders before you call a visual result
  done.
- **Levi** is named, never "he" or "his", even where older notes say so.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when steps 1-6 are done or 2 h after your start, whichever comes
    first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, finish the step you are on and write down what is
    missing. What is left becomes the next stage.
  - A compaction is not a stop. After one, re-read this brief, its
    `## Findings` and `git log`.
  - On stopping:
    1. commit;
    2. append a `## Handoff` to this brief (committed);
    3. report.
- **The final report** gives:
  - the zoom's maximum;
  - the pop census before and after, per sequence and cause, with the
    crops you looked at;
  - the jump classes before and after;
  - the root rule in one sentence, and the re-fit solve against today's
    iterations;
  - the 12-scene census's attribution, and the cost before and after;
  - anything that changes calls 3-5;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K868's current handle fields (branch, last commit, evidence, next).
