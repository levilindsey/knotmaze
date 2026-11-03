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

### F1 · Definition change: D1's merge blend (16:40-17:02)

**The bends.** `bend_s1e.ts` walks each breach line in 0.025 px steps
(241 points over 0.06 world) on S1d F5 (frozen `form_b_s1d_f5.ts`) and
the working tree. F5's steepest steps:

| Line | F5 | c1 | The term that jumps (F5) |
|---|---|---|---|
| user_tw42.lightpaper, x through (11.695, 1.622) | 20.5/px | 1.81/px | foot of chain 23: s 23.387 -> 23.426, w 1.000 -> 0.478 |
| g41_ring_tw42, y through (9.38, 0.98) | 31.9/px | 1.84/px | foot of chain 1: s 113.270 -> 113.473, w 0.199 -> 1.000 |
| g41_user_tw42, x through (11.695, 1.622) | 20.0/px | 1.82/px | foot of chain 23: s 23.387 -> 23.426, w 1.000 -> 0.491 |

At each bend D1's merge switches between two minima of the through
pass's own chain, one on each arm of the bend. d is continuous across
the switch; the burial weight is not, because the two feet sit on
different arms (S1d F6's residual, confirmed on all three).

**The change (candidate 1), `src/render/field/form_b.ts`.** Each kept
piece A carries the minima the merge dropped into it (`Piece.alts`, same
chain, |Δs| ≤ σ). Each dropped minimum X adds a foot term of its own:
buried as A's would be (by the pieces other than A), with F9's corner
rule and `inFill` reading X's chain and s, at weight
w = (1 − bur)·selfW_A·β, and its arc at arc·β:

- β = ss(1, 0, u)·ss(δ, 0, d_X − d_A)·ss(σ, σ/2, |Δs|);
- u = min(1, (d_X − d_A)/(m − d_A)), 0 when m − d_A ≤ 1e-15. m is the
  barrier: the largest distance from the pixel to the chain between A
  and X (at A, at X or at a vertex between them);
- δ = 2aa (`FormBParams.merge`; 0 restores S1d's discrete pick).

β is 1 where X ties A, so the pick switches with both feet at full
weight on both sides. It is 0 where X is born (m = d_X), δ farther than
A, or σ away along the chain, where the fold's far piece takes over at
selfW 0. A new fade bit, `F_MERGE` (16), marks a foot with 0 < β < 1
(band2 > 0, bur < 1). Same-chain minima within σ still never bury each
other, and the kept piece alone gives the top surface, the label, the
cover and the burial of others.

**Results against S1d F5** (gate run `run_s1e_gate.ps1 -Tag c1`, outputs
`s1/out/s1e/`):

- b_rate: 161 sites, **9 -> 0 in breach** (`rate/rate_c1.txt`). The nine
  former breach sites read 1.14-2.08/px; no other site rose.
- pins 22/22; `npm test` exit 0.
- scenes.ts, 12 scenes: every check line identical to F5 (#1 156 px,
  free ends 114, the shared checks); inked px +475 of 1.69M (the dropped
  feet); the max decomposition misses 145 px as F5 (endpoint and V discs).
- pops, label_pops' rule: **20 pops / 191 px -> 16 / 168 px** (muse_drag
  8/47 -> 6/36, muse_flow 12/144 -> 10/132, def_* 0 both). Unexplained
  px outside the fades 1194 -> 902. pops_mech: gone are 2 "scene chain
  samples" and 2 "smooth motion" pops at crossings 60+ and the "smooth
  fade tie" one; muse_drag 1>2 at (19.335, 15.027), 4 px, now reads
  "smooth fade none"; the 3 junction "scene chain samples" pops (104 px,
  worst muse_flow 7>8, 80 px) remain. corner_why: no corner pop, as F5.
- q5holes: the same holes, every one an eye of the look (0 defects);
  fade bits now on 5, 4 and 4 of them (f16 at the eyes' rims).
- q4: every scene's mean |Δ| and max unchanged; muse_hash |Δ| > 0.5
  6 -> 7 px, g41_user_tw64 |Δ| > 0.1 326 -> 329, ring 502 -> 501.

Residuals:
- A dropped minimum with |Δs| in (σ/2, σ) blends only partly (β's last
  factor), so a swap there still moves w by up to 1 − ss(σ, σ/2, |Δs|).
  No b_rate site shows one.
- The fold's far-piece weight for |Δs| in (σ, 2σ) is as S1b left it.
- The u ramp is steep where the barrier is shallow (m close to d_A):
  continuous, never steeper than the step it replaces.
- **For S4a:** a foot strip of X's segment needs d_A (the nearest minimum
  of its chain within σ) and the barrier m to weigh β. Neither is local
  to the segment; the label's (chain, s) gives A, and m needs the
  chain's vertices between A and X from the sample table.

### F2 · F5's #1 +9 and its free ends, attributed (17:00-17:04)

`attr_f4f5.ts` (output `out/s1e/attr_f4f5.txt`) rebuilds four frozen
variants: f4 (both of S1d F5's changes reverted), f5a (F4 + θ from
`tanAt`), f5b (F4 + the Lcut loop's skip only behind the root) and f5
(e8944f2f). For each #1 site and free end in only one of S1d's F4 and
F5 lists (scenes.ts's check1deep lists keep at most 12 sites a scene;
free ends keyed by chain, s to 0.1 and side) it prints every variant's
ink, winning term and corner, and the arm whose L moved with its
binding pass.

- **θ (f5a = f5, f5b = f4): L moves by 0.003-0.02.**
  - muse_hash's +2 #1 sites, (704,133) and (705,133): tA of chain 57 at
    junction 129, ink 0.374/0.435 -> 0.530/0.568 (arm 390, L
    1.204 -> 1.209).
  - g41_user_tw64's tB sites at junction 64 (chain 26): 3 new, 1 gone
    (arm 197, L 1.170 -> 1.177).
  - Borderline free ends either way: muse_hash j76 and j99 (two gone,
    two new), g41_def_tw42 j166 (+1), muse_default_tw j102 (−1),
    user_tw42.lightpaper and g41_user_tw42 j53 (−1 each).
  - No defect: a slightly different tangent, sites on either side of
    the 0.5 ink line.
- **The Lcut loop (f5b = f5): a defect.** g41_user_tw64's free ends
  22 -> 26, all at junctions 54 and 55, and its 2 arc sites at j55
  ((318,274), (317,275); now foot c22 at ink 1.0 on a moved label
  boundary). Arms 168 and 172 (chain 22, dir −1) lose their whole span,
  L 0.621 -> 0 and 2.133 -> 0. Their binding pass lies past each arm's
  next root, at d 4.495 and 6.627, and crosses at θ 0.0215 rad (1.2°):
  its cut c = d − h/tan(θ/2) − h reaches about 30 world units back
  (c −25.6 and −23.4). F4 skipped passes past the next root; F5 counts
  them, so that L moves continuously as a pass slides over the root,
  and with them the straight-line reach h/tan(θ/2), which a near-tangent
  pass extends far past where the two threads overlap.
- Not attributed: the rest of g41_user_tw64's +7 #1 px (byTerm tA +6
  under S1d's counts) lies outside the 12-site lists.

## Handoff
