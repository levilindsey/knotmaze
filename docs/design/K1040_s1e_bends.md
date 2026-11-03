# K1040 S1e: the rate rule at through-pass bends

Ledger K1040, stage S1e: S1d continued, before S2. One stage: Opus, 2 h
cap. Branch `worktree-agent-a7035825805c31d73`, worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a7035825805c31d73`
(at d4bd97c2, node_modules joined to the main checkout's). Work only
there. Brief written 2026-11-02 by the stage agent, from S1d's Handoff
(Next 1-3) and the design's F5-F7, at the coordinating session's
request.

## Why

S1d (merged at e8944f2f) made the corner solve continuous. Its final
definition (F5, b023d85e) has no corner switch left on the four
recordings: pops 20 / 191 px (S1c F5: 209 / 3875), #1 156 px (861),
free ends 114 (169). What is still open from its Handoff:

1. **The rate rule at through-pass bends.** b_rate finds 9 of 161 sites
   in breach (`s1/out/s1d/rate/rate_f5.txt`), at three bends:
   user_tw42.lightpaper and g41_user_tw42 at (11.69, 1.62), and
   g41_ring_tw42 at (9.38, 0.98). The breaches start at S1d F2: the
   base breaches on 0 of 36 sites, F2 on 9 of 36. F2 dropped the
   through pass's own corner, and with it S1b F9's burial of one arm's
   outline by the other at the bend.
   - Observed (S1d F6's residual): D1 merges one chain's minima within
     σ and keeps the nearer one, a discrete pick. On
     `bend_user_tw42_x.txt`'s line, one step moves the winning foot from
     s 23.316 to s 23.368 and the ink from 0.993 to 0.675. The distance
     d is continuous there; the foot's burial weight w is not, because
     the two feet sit in different places.
   - S1d F6 tried a burial over the whole partner arm (d6d53448). It cut
     the breaches 9 -> 6, but cost muse_hash #6 (9.942 -> 12.877 px at
     crossing 71) and 4 junction free ends, and was reverted.
2. **The corner solve's last discrete edges**: solveCorner's null gates
   (L ≤ 1e-9, no V, V's dV outside the arm, the wedge's orientation),
   ω's ±0.5h candidate exclusion, and the Lcut loop's d < −1e-12 edge.
   No pop on the four recordings is one of them, but each can switch a
   corner in a step.
3. **F5's #1 +9** (muse_hash 2 -> 4, g41_user_tw64 52 -> 59) and its
   free ends on g41_def_tw42 and g41_user_tw64, not attributed site by
   site.

S1's gate (`docs/design/K1040_junction_field.md` F7) asks for checks
1-9 and 11 on the 12 scenes, label_pops' rule on the four recordings,
the max decomposition and the free-end check. S2 and S3 wait for it.
This stage ends with that gate's table on its final definition.

Levi does not look at this stage.

## Calls that bind

- **Earlier calls.** S1's to S1d's calls still bind:
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
  worse than S1d F5 on any scene, unless a Finding attributes the
  change. S1d F2's sharp inner corner at a through pass's bend (the
  oracle's) stays; S1d's look question about it still waits on Levi.
- **The candidates for item 1.** Pick by the checks.
  1. **Continuous weights for D1's merged minima.** Keep the nearer
     minimum as the piece, as now, for the top surface, the label, the
     cover and the burial of others. Its foot term becomes a blend over
     every minimum of the chain that the merge dropped (within σ): each
     dropped minimum B adds its own foot term, buried as A's would be,
     at weight β = ss(δ, 0, d_B − d_A), with δ a small distance (start
     at 2aa). At the switch both feet count fully; past δ only the
     nearer. Same-chain minima within σ still never bury each other
     (an inner vertex of a polyline would lose its outline).
  2. **A burial at the bend that reads depth** (S1d F6, made local):
     only where both arms of a through pass meet, and only by an arm
     at the same depth as the foot. It has to leave muse_hash's
     crossing 71 and the 4 junction free ends alone.

  Prefer 1: it is generic (it also covers the jumps between two
  segments of one arm, as at s 23.384 -> 23.427 on the same line), and
  it adds no burial. If 1 cannot reach 0 breaches with the checks held,
  say why, then try 2.
- **The corner's discrete edges (item 2).** For each gate, show with a
  sweep of the geometry whether a corner with fill reaches it. A gate
  reached only after r and ω have gone to 0 (S1d's D5 argument) needs
  no change, and its Finding says so with the sweep. A gate reached
  with fill gets a continuous form.
- **Attribution (item 3)** is measurement only: no definition change
  for it unless it shows a defect.

## Order

Take `Get-Date` at the start and at each milestone, and write the times
into Findings. Append `## Findings` (F1, F2, ...) to this brief as you
go.

1. **Read (about 10 min).** S1d's F2, F5, F6 and Handoff; `pieces()`,
   `inkOf()` and `evalPoint()` in form_b.ts, in slices; the headers of
   b_rate.ts and bend_why.ts.
2. **The bends (about 45 min).**
   - Probe the three bends along the breach lines (bend_why.ts) and
     name the term whose weight jumps at each.
   - Make the definition change (candidate 1 first).
   - Rerun b_rate on all 161 sites, the pins, #1 and the shared checks
     on the 12 scenes, and the pops on the four recordings. Commit.
3. **Attribute F5's #1 +9 and its free ends (about 15 min):** the sites
   on muse_hash and g41_user_tw64, F4 against F5. Commit the listing.
4. **The gate (about 25 min),** on the final definition, against S1d
   F5:
   - the pins and `npm test`;
   - `scenes.ts` on all 12 scenes, with the free ends;
   - the full pops run and pops_mech's table, corner_why;
   - `b_rate.ts`;
   - q5holes, and q4 on all 12 scenes.

   Then S1's gate table (F7): each item passes, fails (where, by how
   much) or is not measured yet. Commit.
5. **If time remains: the corner's discrete edges (item 2).** One sweep
   per gate; a continuous form only where a corner with fill reaches
   one. Whatever is not done goes to the Handoff as the next stage's
   work.

Then write `## Handoff`. Stop at the cap wherever the Order stands.

Item 1 matters most. If time runs short after step 2, run the pins,
b_rate and the pops on the final definition, and leave the rest to the
Handoff.

## Later work (not this stage)

- Item 2 unless step 5 reaches it.
- S1d's Handoff 5, probe upkeep: omega_rate.ts imports the stale
  `form_b_f4j`; corner_ab.ts and omega_census.ts import an untracked
  `form_b_head.ts`.
- The K1048 probe gaps (q5holes skips a hole whose rim is partly OWN;
  q4's crop holds no ink on the g41 ring scenes), R2 and R3 (S1c).

## Where things are

- **S1d:** `docs/design/K1040_s1d_corner.md`.

  | Section | Line |
  |---|---|
  | F2, the through pass's corner dropped | 262 |
  | F5, the final definition | 355 |
  | F6, the burial at the bend (reverted) | 386 |
  | Handoff, with How to rerun | 430 |
- **The definition:** `docs/design/K1040_junction_field.md` F2 and F3,
  amended by the stages' definition-change Findings.
  `src/render/field/form_b.ts` is the current definition.
- **The code:** `src/render/field/form_b.ts` and
  `test/render/field/form_b.test.ts`.
- **The probes,** in `.claude/probes/K1040/s1/` (copied into this
  worktree from the main checkout's untracked copy):
  - `run_s1d_gate.ps1`, copied as `run_s1e_gate.ps1` with outputs
    under `out/s1e/`;
  - `b_rate.ts`, `bend_why.ts`, `gate_table.ps1`, `pops_mech.ts`,
    `corner_why.ts`, `corner_cmp.ts`, `fe_own.ts`;
  - the frozen copies `form_b_s1d_base.ts` (2dacd08d) and
    `form_b_s1d_f2.ts` (a2978ed7); add `form_b_s1d_f5.ts` (e8944f2f's
    form_b.ts) for before/after probes.
- **Outputs:**
  - S1e's runs go under `s1/out/s1e/`; `out/s1d/` is the baseline
    (gate F5: `logs/gate_f5.txt`, `scenes_f5/`, `pops_f5/`,
    `rate/rate_f5.txt`).
  - Commit the summaries and crops the Findings cite (`git add -f`);
    leave the rest untracked. Copy `out/s1e/` back to the main
    checkout's `.claude/probes/K1040/s1/out/s1e/` before reporting.
- **The scenes and the recordings:** where S1's brief says
  (`.claude/probes/K868/scenes/` and the `k868-s3a` worktree's
  `.claude/probes/S3a/seq13/`, both in other checkouts and read-only).

## Rules

- **Files you may change:**
  - `src/render/field/form_b.ts`;
  - `test/render/field/form_b.test.ts` and fixtures beside it;
  - the probes in `.claude/probes/K1040/s1/`, plus new ones there (add
    them with `git add -f`);
  - this brief's Findings and Handoff.

  Change no other file under `src/`, `test/` or `scripts/`. Nothing in
  the app imports form_b.ts, and nothing may start to. Don't edit
  `LEDGER.md`.
- **Tests.** `npm test` (tsc included) passes at every commit called
  done.
- **Other checkouts.** Write nothing in them, except the copy of
  `out/s1e/` back to the main checkout at the end. Don't run
  `npm run build` in the main checkout. Every script that runs jobs
  first checks that `git rev-parse --show-toplevel` prints this
  worktree's path, and stops if not; variables get distinct names, not
  just distinct case (S1c's `$w` / `$W` accident).
- **Dev server** (only if a page probe is needed): from this worktree,
  `npx vite --config .claude/probes/K1040/vite.private-cache.config.ts
  --port 5401 --strictPort --host 127.0.0.1`. Never port 5173; leave
  5480-5489 alone (a phone round uses them). Stop it when done.
- **Reading code and output.** Through the shell: `Select-String` and
  `Get-Content <file> | Select-Object -Skip <n> -First <m>`. The Read
  tool only right before an Edit. Probe output goes to files; print
  summaries of at most about 30 lines per call.
- **Commits.** WIP to this branch at every milestone, broken or not.
  Never push, never skip hooks, no helpers (no subagents).
- **Timing.** Nothing here is timed. If something is, take
  `$env:TEMP\claude-perf.lock` first (one line: owner K1040-S1e, start
  time, what; wait inside one blocking command if another owner holds
  it, stale after 30 min) and delete it after; label numbers taken
  under load.
- **Stop rule.** Stop when the Order is done or 2 h after the start
  (`Get-Date`), whichever comes first. A compaction is not a stop:
  after one, re-read this brief and `git log --oneline -5`, then go on.
  When you stop: commit WIP, append `## Handoff` (what landed, the
  measurements with the commands that reproduce them, Next 1-3),
  commit, report.
- **The report** ends with `Ledger items` (new follow-ups, residuals,
  decisions for Levi) and K1040's handle fields: owner, branch and
  worktree, last commit, evidence, next, brief, env.

## Findings

Start 16:31:26 (cap 18:31:26).

## Handoff
