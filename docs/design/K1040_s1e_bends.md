# K1040 S1e: the rate rule at through-pass bends

Ledger K1040, stage S1e: S1d continued, before S2. One stage: Opus, 2 h
cap. Branch `worktree-agent-a7035825805c31d73`, worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a7035825805c31d73`
(at 6d210fc5, node_modules joined to the main checkout's). Work only
there. Brief written 2026-11-02 by the stage agent, from S1d's Handoff
(Next 1-3) and the design's F5-F7, at the coordinating session's
request.

## Why

S1d (merged at c6e274a3) made the corner solve continuous. Its final
definition (F5, a8197f7e) has no corner switch left on the four
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
   - S1d F6 tried a burial over the whole partner arm (87ccfdd9). It cut
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
  - the frozen copies `form_b_s1d_base.ts` (8ffd11fa) and
    `form_b_s1d_f2.ts` (ddf825cf); add `form_b_s1d_f5.ts` (c6e274a3's
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
(c6e274a3). For each #1 site and free end in only one of S1d's F4 and
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

### F3 · The gate, part by part, on candidate 1 (17:07)

Against S1d F5; every count from the c1 run in `s1/out/s1e/`
(`logs/gate_table_c1.txt` puts the scene lines side by side).

- **The rate rule: passes.** b_rate: 0 of 161 sites above 3/px
  (`rate/rate_c1.txt`; F5 had 9).
- **Checks 1-9 and 11 on the reference's ink: fail, as F5**
  (`logs/scenes_c1.txt`).
  - **Form B's own checks:** #2 passes on all 12 (corners meet within
    1e-11 px); #11 passes on all 12; #1 fails on 5 scenes, 156 px
    (muse_default_tw 58, g41_user_tw64 59, g41_def_tw64 34, muse_hash 4,
    def 1), the same pixels as F5.
  - **checks.ts:** #8 passes on all 12. #3 and #11 fail on 1 scene
    (muse_hash), #7 on 2, #6 and #9's sections on 5, #5 and #9's walks
    on 10, #2 and #4 on 11. Every count equals F5's.
- **label_pops' rule: fails.** 16 pops, 168 px, on muse_drag (6, 36 px)
  and muse_flow (10, 132 px); def_drag and def_flow have none. F5 had
  20 pops, 191 px. pops_mech (merge, `logs/mech_c1_merge.txt`): 14 pops,
  126 px, remain once merged pixels are excused; the three largest are
  junction "scene chain samples" pops (104 px). corner_why: no corner pop.
- **Terms inside their strips: holds, as F5.** 145 of 1.69M inked px
  miss, all of them in endpoint and V discs.
- **Free ends: the check runs.** 114 on the 12 scenes, as F5; F2's four
  on g41_user_tw64 are the Lcut loop's defect.
- **q5holes and q4 (not gate items):** the same holes, all eyes of the
  look; q4's |Δ| counts move by at most 3 px a scene.

### F4 · The Lcut loop's phantom reach: candidates 2 and 3, gated, not adopted (17:08-17:45)

`lcut_far.ts` (output `out/s1e/lcut_far.txt`, run on c1) lists every arm
of the 12 scenes with its root span L0 (chain end or next root), the
pass that binds its Lcut, and its span under three rules.

- **Extent.** 14 arms in 3 scenes are bound by a pass past L0
  (g41_def_tw64 1, muse_hash 6, g41_user_tw64 7).
  - 7 are real far cuts: θ 0.81-1.51 rad, the pass 1.4-2.2 past the
    root, L 0.01-0.23 short of L0 (g41_def_tw64 arm 459: L0 0.920,
    L 0.686).
  - 7 lose their whole span to a near-tangent pass: muse_hash arms 197,
    367 and 477 (chain 83, θ 0.0637) and g41_user_tw64 arms 168, 172, 81
    and 83 (chain 22, θ 0.0215). The straight reach h/tan(θ/2) runs
    10-30 world units back, far past where the two threads part.
  - The same phantom reach zeroes arms whose pass lies inside L0, which
    S1d F4 shared: 10 more (muse_hash 4, g41_ring_tw64 2, g41_user_tw64 4)
    reopen under candidate 2.
- **Rules** (arms each moves by more than 1e-3 against c1):
  - S1d F4's skip: 14. It restores the 7 but undoes the 7 real cuts, and L
    jumps as a pass slides over the root (S1d F5's reason).
  - The far pass's reach faded out over [L0, L0 + h]: the same 14, since
    every far pass lies more than h past its root. Rejected.
  - **The curved reach (candidate 2):** reach = min(h/tan(θ/2), e_c),
    e_c the first distance back along the arm at which the partner
    thread (its foot tracked) lies h(1 + cos θ) away, which is where the
    straight model's reach ends. It equals the straight reach on
    straight threads and never exceeds it, so it only lengthens arms. It
    restores the 7, keeps the 7 real cuts (within 0.008), reopens the
    10, and lengthens 547 arms: by at most 0.04 world (4 px at the
    census's 100 px a unit) on the ordinary scenes, 0.06 on ring and
    0.09 on g41_def_tw64.
- **Candidate 2 in form B** (88e6615e): `curvedReachOf` walks back in
  steps of 0.004 with a linear fit over the last one, at most 40 units,
  and runs only for a pass whose straight cut lies short of L0, so it
  cannot move an arm the straight cut leaves alone (the curved cut is
  never shorter). `lcut_far_c2.txt` (run at 88e6615e): the probe's own
  curv rule moves 0 arms against it.
- **Candidate 2's gate** (against c1; `logs/gate_table_c2.txt`,
  `attr_c2.txt`): the rate rule passes (0 of 161), the pins and npm
  test pass, every shared check is equal, and label_pops improves (16
  pops, 168 px -> 14, 150 px: muse_drag 6 -> 4, its junction pops
  3 -> 1). Free ends 114 -> 111 (g41_user_tw64 26 -> 22, muse_hash
  37 -> 38). **#1 156 -> 167:** muse_hash 4 -> 13, all tA of chain 57 at
  j129, where arm 390 (chain 68) grows 1.209 -> 1.244 under a θ 1.4594
  pass, the corner F2's θ change pushed over; g41_user_tw64 59 -> 61,
  the j55 arc below. Rejected: it lengthens 547 ordinary arms, and one
  of them tips j129's corner into ink.
- **Candidate 3** (e8449d1d, `params.curvedFrom`): the straight reach up
  to 4 h (crossings steeper than 2·atan(1/4) ≈ 28°); past it,
  max(4 h, min(r0, e_c)), which is continuous in θ at the floor.
  `arms_c3.ts` (output `arms_c3.txt`): it moves 14 arms, against c2's
  547. It reopens 11 zeroed arms (L = 0: muse_hash 46 -> 42,
  g41_user_tw64 21 -> 14), the 7 near-tangent ones among them (muse_hash
  arm 197: 0 -> 0.612, c2 0.945), and lengthens 3 arms of g41_user_tw64
  chain 11 by 0.10 world each (θ 0.4544, a straight reach of 4.3 h, just
  past the floor; arm 97 0.874 -> 0.978).
- **Candidate 3's gate** (against c1; `logs/gate_table_c3.txt`,
  `attr_c3.txt`): the rate rule passes (0 of 161), the pins and npm
  test pass, every shared check and label_pops are unchanged (16 pops,
  168 px; 14, 126 px once merged), and free ends drop 114 -> 110
  (g41_user_tw64 26 -> 22, F2's four). **#1 156 -> 158:** two
  g41_user_tw64 sites, (318,274) and (317,275), at F 5 px. c1's winner
  there is chain 22's foot; c3's is j55's fillet arc (arms 170 and 171,
  their L unchanged; ink 0.87 and 0.67), once j55's arms 168 and 172
  have their spans back. They are the arc sites S1d F4 had.
- **Not adopted.** The brief lets an attributed #1 change through, but
  the curved reach is not continuous by construction. e_c is the first
  distance at which the partner lies h(1 + cos θ) away, so where the
  partner comes back (an eye) e_c jumps as the distance's peak crosses
  the target, and the walk's 40-unit cap jumps to r0. No gate sequence
  holds such a pass, so the gate could not show the pop (not measured).
  `curvedReach` stays in form B, off by default: the default builds c1's
  arms exactly on all 12 scenes (`arms_c3.txt`: "default != c1 on 0"),
  `{ curvedReach: true }` builds c3, and adding `curvedFrom: 0` builds
  c2. On the final tree (the default, c1) the gate repeats c1's
  results: every line of `logs/scenes_final.txt` but the timings equals
  c1's (`logs/gate_table_final.txt`), b_rate finds 0 of 161, and the
  pins and npm test pass.

## Handoff

**Stopped at 17:43**, inside the 2 h cap (16:31-18:31): Order steps
1-4 done, step 5 (item 2) not reached. The definition is candidate 1;
F4's candidates sit in form B behind `curvedReach`, off.

**What landed** (branch `worktree-agent-a7035825805c31d73`, not pushed):
- F1, definition change (d83901a9, written up in c2b8b1ac): D1's merge
  blend, β = ss(1,0,u)·ss(δ,0,d_X−d_A)·ss(σ,σ/2,|Δs|). The rate rule
  passes (b_rate 9 -> 0 of 161) and label_pops drops from 20 pops,
  191 px to 16, 168 px; #1, the shared checks and the free ends equal
  S1d F5's.
- F2 (c2b8b1ac): F5's #1 +9 and its free ends, attributed.
- F3 (397d71ac): the gate on c1, part by part, and `lcut_far.ts`.
- F4 (88e6615e and e8449d1d, the candidates; this Handoff's commit
  turns them off): the Lcut loop's phantom reach, which zeroes 7 arms
  through near-tangent passes. Candidates 2 and 3 gated, not adopted.

**Measurements.** Outputs are in `.claude/probes/K1040/s1/out/s1e/`
(copied to the main checkout's); run from the worktree root.
- The gate: `pwsh .claude/probes/K1040/s1/run_s1e_gate.ps1 -Tag <tag>`,
  then `-What mech` once pops is done. The table:
  `pwsh .claude/probes/K1040/s1/gate_table.ps1 <logs/scenes_A.txt>
  <logs/scenes_B.txt>`. c1: `logs/*_c1*` (F3); c2 and c3:
  `logs/*_c2*`, `logs/*_c3*` (F4); the final tree: `logs/*_final*`.
- b_rate alone: `$env:OUT = "<worktree>\.claude\probes\K1040\s1\out\s1e\rate";
  $env:TAG = "_c1"; npx.cmd vite-node .claude\probes\K1040\s1\b_rate.ts`.
- One bend: `npx.cmd vite-node .claude\probes\K1040\s1\bend_s1e.ts
  <scene> <x> <y> <dx> <dy> 241 0.06`.
- Attribution, each `npx.cmd vite-node .claude\probes\K1040\s1\<name>`:
  `attr_f4f5.ts` (F2), `lcut_far.ts` (F4's extent, on the default),
  `attr_c2.ts` (`$env:CAND = "c3"` for c3) and `arms_c3.ts` (the arms
  c2 and c3 move, and the default against c1).

**Next:**
1. The phantom reach (F4): a curved reach that is continuous by
   construction (no first crossing, no cap that jumps to r0), then the
   gate. The j55 arc's two interior sites come back with it and need
   their own attribution in the look.
2. Item 2, the corner solve's last discrete edges (Order step 5).
3. The pops the merge leaves (14, 126 px): the three junction "scene
   chain samples" pops (104 px; muse_flow 7>8 at (8.177, 22.757),
   80 px). And j129's tA corner, which inks once arm 390 grows 0.035
   (c2's muse_hash +9): a corner that sensitive to its arm's length.
