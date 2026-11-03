# K1040 S1f: a crossing's reach that is continuous by construction

Ledger K1040, stage S1f: S1e continued, before S2. One stage: Opus, 2 h
cap. Branch `worktree-agent-a43dac8f0673db4df`, worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a43dac8f0673db4df`
(at 0528702d, master after S1e's merge at 96de6db3; node_modules joined
to the main checkout's). Work only there. Brief written 2026-11-02 by the
stage agent, from S1e's Handoff (Next 1-2) and F4, at the coordinating
session's request (session 7301c55b).

## Why

S1e (merged at 96de6db3) made D1's merge blend continuous (F1): b_rate
finds 0 of 161 sites in breach, pops 16 / 168 px, #1 156 px, free ends
114. Its F4 found the Lcut loop's **phantom reach** (ledger K1092):

- An arm's span is L = min(chain end, next root, each pass's cut
  c = d − reach − h), with the straight model's reach
  r0 = h·cot(θ/2). At a near-tangent pass r0 runs 10-30 world units
  back, far past where the two threads part, and zeroes the arm.
  7 arms lose their whole span that way at passes past their root L0
  (muse_hash arms 197, 367, 477, chain 83, θ 0.0637; g41_user_tw64 arms
  168, 172, 81, 83, chain 22, θ 0.0215), and 10 more through passes
  inside L0 (S1d F4's).
- S1e tried two curved reaches, `params.curvedReach` (off by default):
  - c2, reach = min(r0, e_c), e_c the first distance back along the
    arm at which the partner (its foot tracked) lies h(1 + cos θ) away:
    restores the 17, but lengthens 547 ordinary arms and tips j129's
    corner (muse_hash) into ink: #1 156 -> 167.
  - c3, the same past a floor of 4h, max(4h, min(r0, e_c)): moves 14
    arms, #1 156 -> 158 (the j55 fillet arc's two interior sites on
    g41_user_tw64, back once arms 168 and 172 have their spans).
  - Neither is continuous by construction: e_c is a first crossing, so
    it jumps where the partner comes back (an eye) and the distance's
    peak crosses the target, and the walk's 40-unit cap jumps to r0.
    The walk (0.004 steps up to 40 units, a foot search per step) also
    does not port to a shader.

S1's later stages (S4) port form B to the GPU, so the reach should be a
closed form or a small fixed number of steps. Item 2 of S1e's brief, the
corner solve's last discrete edges, is still open behind it.

Levi does not look at this stage.

## Calls that bind

- **Earlier calls.** S1's to S1e's calls still bind:
  - watertight at every fade value;
  - the rate rule (S1b's call: |∇ink| at most about 3 per px across a
    fade, a change of winner or a gate; in motion, label_pops' rule);
  - each definition change written down as its own Finding headed
    `Definition change:`;
  - the eyes as they are (S1b F1);
  - continuous by construction (S1d): no fade on a discrete outcome;
    where a choice cannot be removed, blend over every candidate with
    weights continuous in the geometry.
- **The oracle is the look at rest.** #1 and the shared checks get no
  worse than S1e's final (`.claude/probes/K1040/s1/out/s1e/logs/*_final*`
  and `*_c1*`; the final tree equals c1) on any scene, unless a Finding
  attributes the change. S1d F2's sharp inner corner at a through pass's
  bend stays.
- **The reach (item 1).** It must be:
  - continuous in the geometry by construction: no first-crossing pick,
    no cap that jumps, no fade on a discrete outcome;
  - the straight model's r0 exactly on straight threads;
  - short of r0 at the near-tangent passes (it restores the 7 arms), and
    ordinary arms left alone, or every arm it moves listed and
    attributed;
  - portable: a closed form, or a small fixed number of steps, each a
    closed form (no walk, no search with a step).

  The candidates, to pick between by the checks:
  1. **The quadratic reach.** Model the threads' separation behind the
     pass as g(e) = a·e + ½κe², κ ≥ 0 (threads that part), with a and
     the target T from the straight model, and fit κ from the measured
     separation at a fixed sample distance; then the reach
     e* = 2T / (a + √(a² + 2κT)) in closed form (r0 when κ = 0, never
     above r0, finite at θ = 0). Refine in a fixed number of steps by
     resampling at the last e* (clamped continuously to the arc that
     exists). The separation measured without a search: the chord
     between the two threads at matched arc length (a = 2 sin(θ/2),
     T = 2h cos(θ/2)), or the distance to the partner's tangent line
     there (a = sin θ, T = h(1 + cos θ)).
  2. **A floor**, as c3's: reach = min(r0, max(F, e*)), one expression
     with no gate, so crossings steeper than 2·atan(h/F) keep r0. Start
     at F = 4h; the gate decides whether the floor is needed.
- **The j55 arc's two interior sites** (g41_user_tw64, (318, 274) and
  (317, 275), S1e F4) come back with any reach that restores arms 168
  and 172. Attribute them in the look: crops of form B's ink and labels
  at the sites before and after, and name the term and the reason.
- **The corner's discrete edges (item 2, if time remains).** For each
  gate (solveCorner's null gates; ω's ±0.5h candidate exclusion; the
  Lcut loop's d < −1e-12 edge), show with a sweep of the geometry
  whether a corner with fill reaches it. A gate reached only after r and
  ω have gone to 0 (S1d's D5 argument) needs no change, and its Finding
  says so with the sweep. A gate reached with fill gets a continuous
  form.

## Order

Take `Get-Date` at the start and at each milestone, and write the times
into Findings. Append `## Findings` (F1, F2, ...) to this brief as you
go.

1. **Read (about 10 min).** S1e F4 and Handoff (done for this brief);
   the Lcut loop and `curvedReachOf` in form_b.ts; `lcut_far.ts`,
   `arms_c3.ts` and `attr_c2.ts` (S1e's probes for the reach).
2. **The reach (about 50 min).**
   - A probe that lists, per arm whose binding pass is past the floor,
     r0, c2's walked e_c, and each candidate's reach (one and two steps,
     chord and tangent line), so the candidates are compared on the
     arms before any gate run.
   - Make the definition change behind a param, the default switched
     once chosen. Show continuity: a sweep of one near-tangent pass's
     geometry (the reach against a moved vertex) beside c2's walk.
   - The arms it moves against c1 (`arms_c3.ts`'s listing, extended),
     each attributed.
   - The gate against S1e's final (c1). Commit.
3. **Attribute the j55 arc's two sites (about 15 min),** and any other
   #1 change. Commit the listing and crops.
4. **The gate table (about 15 min),** on the final definition, against
   S1e's final: the pins and `npm test`; `scenes.ts` with the free ends;
   the pops and pops_mech, corner_why; `b_rate.ts`; q5holes and q4.
   Commit.
5. **If time remains: item 2,** one sweep per gate. Whatever is not
   done goes to the Handoff as the next stage's work.

Then write `## Handoff`. Stop at the cap wherever the Order stands. If
time runs short after step 2, run the pins, b_rate and the pops on the
final definition and leave the rest to the Handoff.

## Later work (not this stage)

- Item 2 unless step 5 reaches it.
- The 14 pops the merge leaves (126 px), the three junction "scene
  chain samples" pops (104 px; muse_flow 7>8 at (8.177, 22.757), 80 px),
  and j129's tA corner on muse_hash (S1e Next 3).
- S1's later steps, and S2.
- Probe upkeep (S1d Handoff 5): omega_rate.ts imports the stale
  `form_b_f4j`; corner_ab.ts and omega_census.ts import an untracked
  `form_b_head.ts` (copied into this worktree, untracked).

## Where things are

- **S1e:** `docs/design/K1040_s1e_bends.md`: F1 (the merge blend, line
  224), F4 (the phantom reach, line 359), Handoff (line 439).
- **The definition:** `docs/design/K1040_junction_field.md` F2 and F3,
  amended by the stages' definition-change Findings.
  `src/render/field/form_b.ts` is the current definition: the Lcut loop
  in the constructor ("Arms and their spans"), `curvedReachOf` after
  `fadeFor`.
- **The code:** `src/render/field/form_b.ts` and
  `test/render/field/form_b.test.ts`.
- **The probes,** in `.claude/probes/K1040/s1/`:
  - `run_s1f_gate.ps1` (copied from `run_s1e_gate.ps1`, outputs under
    `out/s1f/`, toplevel check on this worktree), `gate_table.ps1`;
  - S1e's reach probes `lcut_far.ts`, `arms_c3.ts`, `attr_c2.ts`;
  - the frozen copy `form_b_s1e_c1.ts` (S1e's final form_b.ts,
    96de6db3) for before/after probes.
- **Outputs:**
  - S1f's runs go under `s1/out/s1f/`; `out/s1e/` is the baseline
    (`logs/*_final*`, `logs/*_c1*`, `scenes_final/`, `pops_c1/`,
    `rate/rate_c1.txt`), copied from the main checkout's untracked copy.
  - Commit the summaries and crops the Findings cite (`git add -f`);
    leave the rest untracked. Copy `out/s1f/` back to the main
    checkout's `.claude/probes/K1040/s1/out/s1f/` before reporting.
- **The scenes and the recordings:** `.claude/probes/K868/scenes/` in
  the main checkout and the `k868-s3a` worktree's
  `.claude/probes/S3a/seq13/`, both read-only.

## Rules

- **Files you may change:**
  - `src/render/field/form_b.ts`;
  - `test/render/field/form_b.test.ts` and fixtures beside it;
  - the probes in `.claude/probes/K1040/s1/`, plus new ones there (add
    them with `git add -f`);
  - this brief.

  Change no other file under `src/`, `test/` or `scripts/`. Nothing in
  the app imports form_b.ts, and nothing may start to. Don't edit
  `LEDGER.md`.
- **Tests.** `npm test` (tsc included) passes at every commit called
  done.
- **Other checkouts.** Write nothing in them, except the copy of
  `out/s1f/` back to the main checkout at the end (untracked files only;
  a Muse run may be working in the main checkout, so touch nothing else
  there and run no git command in it). Don't run `npm run build` in the
  main checkout. Every script that runs jobs first checks that
  `git rev-parse --show-toplevel` prints this worktree's path, and stops
  if not; variables get distinct names, not just distinct case.
- **Dev server** (only if a page probe is needed): from this worktree,
  `npx vite --config .claude/probes/K1040/vite.private-cache.config.ts
  --port 5401 --strictPort --host 127.0.0.1`. Never port 5173; leave
  5480-5489 alone. Stop it when done.
- **Reading code and output.** Through the shell: `Select-String` and
  `Get-Content <file> | Select-Object -Skip <n> -First <m>`. The Read
  tool only right before an Edit. Probe output goes to files; print
  summaries of at most about 30 lines per call. PowerShell for every
  command.
- **Commits.** WIP to this branch at every milestone, broken or not.
  Never push, never skip hooks, no helpers (no subagents). Messages end
  with the Co-Authored-By and Claude-Session lines.
- **Timing.** Nothing here is timed. If something is, take
  `$env:TEMP\claude-perf.lock` first (one line: owner K1040-S1f, start
  time, what; wait inside one blocking command if another owner holds
  it, stale after 30 min) and delete it after; label numbers taken
  under load.
- **Stop rule.** Stop when the Order is done or 2 h after the start
  (`Get-Date`), whichever comes first. A compaction is not a stop:
  after one, re-read this brief and `git log --oneline -5`, then go on.
  When you stop: commit WIP, append `## Handoff` (what landed, the
  measurements with the commands that reproduce them, Next 1-3),
  commit, copy `out/s1f/` back, report.
- **The report** ends with `Ledger items` (new follow-ups, residuals,
  decisions for Levi; whether K1092 is fixed) and K1040's handle fields:
  owner, branch and worktree, last commit, evidence, next, brief, env.

## Findings

Start 17:50:37 (cap 19:50:37).
