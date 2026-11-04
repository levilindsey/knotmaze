# K1040 S3d (K1097): a vertex-light tent for the Pixel's 2 ms

The coordinator's brief, 2026-11-03. One stage. Branch
`worktree-agent-aaf87e9d3775b20e4`, worktree
`.claude/worktrees/agent-aaf87e9d3775b20e4`, never pushed.

## Where S3c left it

S3c's tent pass (`fb483083`: `label_b_tent_glsl.ts`, the tent mode of
`label_b_pass.ts`) cut the label's cost 1.6-3.8x and still missed the
Pixel's 2 ms gate by 2-5x. Its label cost, by K923's method (p50 minus
floorall), was 4.7-11.2 ms over the 12 scenes, and 4.1-10.2 ms with
lr 2 (`docs/design/K1040_s3c_label.md`, "F11, measured").

F10 inferred from the desktop that the tents are bound by vertices and
primitives, not by shading:
- muse_hash draws 23,349 segment strips of 12 vertices;
- NW 32's 70 vertices cost 2.8-4.9x;
- lr 2 saves a fixed 0.12 ms.

The phone's lr 2 result agrees. The Pixel 11 is a PowerVR tiler, which
bins every primitive.

## The stage

Cut the tent pass's vertices and primitives until the Pixel's label
cost is at most 2 ms on all 12 scenes. If no vertex-light tent gets
there, show it by measurement and say what bounds it.

0. Run `Get-Date`. Rebase the branch onto `origin/master` (fetch first).
   Adopt K1142's shared phone check in the S3 phone kit: the four
   changes in the Handoff of `docs/design/K1142_phone_guard.md`. Run
   `npm test`, then commit.
1. Measure before you build. Run one cheap phone batch that separates
   primitive cost from vertex cost and fragment cost, so the build aims
   at the measured bound. For example:
   - the tent at half its strips;
   - the tents with a trivial fragment shader;
   - the same primitives with fewer vertices.

   Re-run the tent control in the same batch: F11's tent run overlapped
   another agent's adb read (about 2 s at 09:44:47).
2. Build the vertex-light tent as a new tent mode beside S3c's. Leave
   S3b's draw and S3c's tent unchanged, as controls. The approach is
   yours to choose; weigh these directions against step 1's results:
   - one continuous strip per chain run instead of one per segment
     (shared cross-sections, no inner caps);
   - tents only where a label is read (the junctions' reach) instead of
     over the whole fabric;
   - fewer facets where the cone is flat;
   - instancing.
3. Run the gate in one batch:
   - the Pixel, by the phone commands in the S3c Handoff: the control
     `fit`, `tent`, the new mode and `floorall`;
   - the desktop census (`verdict`) and timer (`time`), by its desktop
     commands.

   To pass, all three hold:
   - the Pixel's label cost is at most 2 ms on every scene;
   - the census is no worse than S3c's tent: 794 DEFECT, 504 of them at
     0.03 px or more;
   - the control's census is unchanged: 0 DEFECT.

Out of scope, for S3e after this gate: F4's merge scan, F6's SNAP, F8's
sharp joints, lr 2's class (F9) and the float64 mirror (F12).

## Rules

- **Worktree only.** A Muse agent is committing on master in the main
  checkout (`C:\Users\lsl\Repositories\knotmaze`). Never edit files
  there, never run git there except `fetch`, and never push.
- **Commits.** Commit WIP at every milestone, broken or not. Probes and
  results stay in `.claude/probes/K1040/s3/` (tracked when reusable).
- **Timing.** Every timing runs under the perf lock; `run_locked.ps1`
  and `run_phone.ps1` take it.
- **The phone.**
  - Before each run, run the shared ready check: launcher in front, no
    touch for 120 s before the first run and 20 s before each later one.
  - Run through `run_phone.ps1`, which also takes the phone lock.
  - Links carry `&snd=none`. Send no key or input event.
  - Stop at the first non-zero exit. If the phone isn't ready by your
    cap, end with the desktop results.
  - Never run `scripts/phone.ps1`. Keep serials, IPs and Tailscale names
    out of tracked files.
- **Ports.** Your dev server uses 5403 (the ledger's env line). Avoid
  5173, the phone's 5480-5489, Muse's 5500-5599 and K1139's 5620-5639.
- **Reading code.** Read it through the shell: `Select-String`, then
  `Get-Content <f> | Select-Object -Skip <n> -First <m>`. Use the Read
  tool only right before an Edit. No helpers.
- **The stop.** Stop when the stage is done or 2 h after step 0's
  `Get-Date`, whichever comes first.
  - Run `Get-Date` at each milestone.
  - A compaction is not a stop. After one, re-read this brief and
    `git log`.
  - At the stop, commit. Then append a Handoff to this brief and commit
    again. The Handoff gives what landed (commit by commit), the before
    and after table, the commands, and the next step.
  - Then report: the gate's verdict, the table, a `Ledger items` list,
    and K1097's handle fields (owner, branch and last commit, evidence,
    next, brief, env).
