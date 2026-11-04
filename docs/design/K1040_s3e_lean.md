# K1040 S3e (K1097): the label pass's fixed part, cut to its floor

The coordinator's brief, 2026-11-03. One stage. Branch
`worktree-agent-aaf87e9d3775b20e4`, worktree
`.claude/worktrees/agent-aaf87e9d3775b20e4`, never pushed. S3c and S3d
are on master (`dbf129b2`).

## Where S3d left it

Read the Handoff of `docs/design/K1040_s3d_tent.md` first; its tables
are the baseline.

- tentv, S3d's vertex-light tent, keeps S3c's tent's census exactly
  (794 DEFECT, 504 of them at 0.03 px or more); the control's is 0.
  Its Pixel label cost is 4.1-9.4 ms (median 5.8) against the 2 ms gate.
- The fixed part alone is over the gate. An empty pass (the records
  uploaded, L and D cleared at 822x1506 and stored, the 1-px readback)
  costs 3.0-4.7 ms on s3d2 and 2.0-3.6 on s3d3. By s3d3's split: the
  render job's round trip about 0 (kick), the clears and stores 2.1
  (1.3-3.1), the record upload 1.1 (0.5-1.5) for 212-410 KB a pass.
- D could not be isolated. Invalidating the sampled D32F texture after
  the draws added 31-34 ms a pass (K1151); K923's D24 renderbuffer,
  invalidated after its draw (`.claude/probes/K923/bench.js`, line 549,
  per that Handoff), cost nothing.
- The drawing past the empty pass is 2.8-3.0 ms (median; 1.2-4.4),
  mostly its vertices. That is S3f's.

## The decision

The gate stays as written: the Pixel's label cost (p50 minus
floorall's p50) at most 2 ms on every scene, everything the pass does
counted (the coordinator's call, 2026-11-03). The fixed part comes
first because no drawing fits beside it today. S3f then cuts the
drawing to the gate; S3g takes F4, F6, F8, F9 and F12 (K1143).

## The stage

Cut the pass's fixed part to the least a pass can do and still hand S4
what it reads.

0. Run `Get-Date`. Fetch, then rebase the branch onto `origin/master`.
   Then two small fixes and `npm test`, in one commit:
   - `.claude/probes/K1040/s3/page.ts`, lines 194-195, call
     `opts.floor` "K923's floor". It is the 1-px readback alone; K923's
     floor also cleared the full-size default framebuffer. Say what it
     is.
   - `s3d_gate.ps1` (line 7) and `run_phone.ps1` (line 17) wait 5 min
     for the locks by default, and S3d's gate batch was cut at its
     third run when another agent held the perf lock past that. Gate
     batches wait 15 min, this stage's new scripts included.
1. Measure the floor before you build: one phone batch, one page, with
   S3d's `empty`, `emptynoup` and `floor` as controls beside:
   - **ideal**: what S4 needs stored and nothing else. One full-size
     32-bit target, cleared and stored; depth a renderbuffer,
     invalidated after the draws (K923's setup); no upload, no draw.
   - ideal's parts, for example: its depth renderbuffer not
     invalidated; the 32-bit target with no depth attachment.

   If the ideal floor is over 1 ms on most scenes, less than 1 ms is
   left for any drawing, and tentv's drawing (1.2-4.4) misses that on
   every scene. Say so in the Handoff with the numbers, then go on.
2. Build the lean fixed part as an option of the pass, beside today's.
   S3b's draw, S3c's tent and tentv stay as they are, as controls.
   - **Depth into L's word.** Carry what S4 samples from D in L's
     word, so D becomes a renderbuffer invalidated after the draws.
     Read what S4 reads first (`docs/design/K1040_junction_field.md`:
     F3 D4's fade, F7's S4) and say what precision it needs and why
     the bits suffice. If the Pixel punishes the renderbuffer's
     invalidation the way it punished the texture's, keep the store
     and say so.
   - **No per-pass upload of what is already on the GPU.** Where the
     live renderer already uploads the same samples each frame, read
     its data textures instead (check which do, for example K8's SDF
     tables in `src/render/samp_table.ts`); otherwise upload only the
     rows that changed. The gate times the moving case: a timed pass
     pays what a frame pays while the fabric moves, so an upload
     skipped only because a test scene stands still does not count.
     Report the at-rest pass beside it.
   - **Drop the unread nb.** `label_b_pass.ts` uploads nb for every
     mode but tentv (line 207); only the capsule's merge scan reads it
     (line 18).
   - **A smaller L** (lr 2) only if the census holds: F9's upsample
     class reads DEFECT at lr 2 today.
   - Say whether the Pixel's ANGLE turns the clears into load-op
     clears. If a clear costs a full-screen draw, measure it.
3. Run the gate in one batch:
   - the Pixel: the control `fit`, `tentv`, tentv with the lean fixed
     part, the lean part's empty pass, and `floorall`;
   - the desktop census (`verdict`) and timer (`time`) for tentv with
     the lean part.

   To pass, all three hold:
   - the lean part's empty pass (minus floorall) is within 0.3 ms of
     step 1's ideal floor on every scene;
   - tentv's census with the lean part is unchanged: 794 DEFECT, 504
     of them at 0.03 px or more;
   - the control's census is unchanged: 0 DEFECT.

   Report the full label cost per scene beside it, against the 2 ms
   gate, for S3f.

Out of scope: the drawing (S3f: continuous strips per chain run, tents
only within the junctions' reach, fewer facets, instancing) and S3g's
list (K1143).

## Rules

- **Worktree only.** Muse agents commit on master in the main checkout
  (`C:\Users\lsl\Repositories\knotmaze`). Never edit files there, never
  run git there except `fetch`, and never push.
- **Commits.** Commit WIP at every milestone, broken or not. Probes and
  results stay in `.claude/probes/K1040/s3/` (tracked when reusable;
  `.claude/probes` is ignored, so a new file needs `git add -f`).
- **Timing.** Every timing runs under the perf lock; `run_locked.ps1`
  and `run_phone.ps1` take it.
- **The phone.**
  - Run through `phone_batch.ps1` (it runs `run_phone.ps1`: the phone
    lock, the perf lock, then K1142's shared ready check: the launcher
    in front, no touch for 120 s before a batch's first run and 20 s
    before each later one).
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
