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

### F1 · Definition change: the quadratic reach, K1092 (17:58-18:16, b400a081)

In the Lcut loop a pass's reach is now

    reach = min(r0, max(F, e*)),   r0 = h·cot(θ/2),   F = 4h,

with e* from `quadReachOf` (form_b.ts, after `curvedReachOf`). It models
the threads' separation behind the pass as g(e) = a·e + ½κe², κ ≥ 0,
where g is the chord between the two threads at matched arc length e
behind the pass (a = 2 sin(θ/2), target T = 2h cos(θ/2)), and solves
g(e*) = T in closed form:

    κ = max(0, 2(g(e_k) − a·e_k) / e_k²),   e* = 2T / (a + √(a² + 2κT)).

Two fits: the first samples at e_0 = F, the second at e_1 = max(F, e*),
each clamped to the arc behind the pass (half the chain on a closed
one). The partner's side is σ = sign(−dir·t_a·t_b).

- **Params.** `reach`: "quad" (the default), "walk" (S1e's walk: c2 with
  `curvedFrom: 0`, c3 with the default) or "straight" (c1); the legacy
  `curvedReach` still maps true to "walk" and false to "straight".
  `curvedFrom` (4) is F in h, `reachSteps` (2) the number of fits,
  `reachSep` "chord" (the default) or "line" (the distance to the
  partner's tangent line: a = sin θ, T = h(1 + cos θ)).
- **r0 exactly on straight threads.** Two straight threads at θ are
  2e·sin(θ/2) apart at matched arc length e, so κ = 0 and
  e* = T/a = h·cot(θ/2) = r0, whatever the sample.
- **Never above r0, finite at θ = 0** (κ ≥ 0; a = 0 gives √(2T/κ)), and
  r0 itself wherever r0 ≤ F: only passes shallower than
  2·atan(h/F) = 0.49 rad can change.
- **Continuous by construction.** Each fit is pointAt at two arc lengths
  that move continuously, then a closed form; the clamps, max and min
  are continuous. σ flips only where the tangents are perpendicular,
  where r0 = h < F and e* is not read. No first crossing, no cap that
  jumps, no gate: the code's `reach > fl` test only skips work, since the
  expression equals r0 there. F2 measures it.
- **Portable:** two fits of two pointAt each, then a square root.

The candidates, arm by arm before any gate run (`npx vite-node
.claude/probes/K1040/s1/reach_cands.ts`; out/s1f/reach_cands_console.txt,
the listing reach_cands.txt untracked):

| Candidate | Moved / restored / shortened / cap only, against c1 | Arms ≠ c3 |
|---|---|---|
| c2 (S1e's walk, no floor) | 570 / 17 / 0 / 23 | 572 |
| c3 (S1e's walk, floor 4h) | 17 / 11 / 0 / 3 | 0 |
| qc1, qc2, qc3 (chord, 1-3 fits, F 4h) | 17 / 11 / 0 / 3 each | 0 |
| ql1 (tangent line, 1 fit) | 15 / 10 / 0 / 3 | 4 |
| ql2 (tangent line, 2 fits) | 16 / 10 / 0 / 3 | 2 |
| qc2F2 (F 2h) | 44 / 13 / 0 / 5 | 36 |
| qc2F1 (F h) | 1211 / 30 / 0 / 65 | 1275 |

Chosen by the checks: **qc2**.
- The chord, not the tangent line: the line leaves g41_user_tw64's arm
  185 at L 0 (e* 15.82h with one fit, 6.69h with two, both past
  d − h), and with one fit arm 97 too.
- F = 4h: F = 2h and F = h move 44 and 1211 arms, ordinary ones the bind
  leaves alone.
- Two fits: the scenes cannot tell one, two or three apart. One fit
  extrapolates a parabola fitted at F out to wherever the reach lands,
  which is what ql1's 15.82h on arm 185 shows; the second fit samples
  there.
- On the 12 scenes the floor binds on every arm the reach moves (e* < 4h
  at each), so q equals S1e's c3 arm for arm. The scenes cannot tell q
  from a bare cap min(r0, 4h) either: the 17 arms it moves are exactly
  the 17 whose binding pass has r0 > 4h (muse_hash 6, g41_user_tw64 11).
  What rules out the bare cap is the bind "r0 exactly on straight
  threads": a cap would cut the reach at every straight shallow
  crossing, where the threads do overlap out to r0.

The arms it moves against c1 (out/s1f/moved_c3_quad.txt, attr_q.txt):
- muse_hash, chain 83's pass (θ 0.0637, r0 31.4h): restored 197
  (L 0 -> 0.612), 367 (0 -> 0.425), 378 (0 -> 0.434), 477 (0 -> 1.150);
  cap only 111 (Lcut −2.605 -> −1.555), 336 (−11.293 -> −0.334).
- g41_user_tw64, chain 22's pass (θ 0.0215, r0 92.97h): restored 81
  (0 -> 0.772), 83 (0 -> 0.959), 168 (0 -> 0.609), 172 (0 -> 2.133), 183
  (0 -> 0.067), 185 (0 -> 0.338), 186 (0 -> 1.308).
- g41_user_tw64, chain 11's pass (θ 0.4544, r0 4.33h, just past F):
  lengthened 97 (0.874 -> 0.978), 99 (0.379 -> 0.483), 106
  (0.195 -> 0.299), each by (r0 − 4h) = 0.104.
- g41_user_tw64, cap only: 110 (Lcut −0.464 -> −0.360).

Each restored or cap-only arm is K1092's phantom reach: r0 runs 31h
(muse_hash) and 93h (g41_user_tw64) behind passes whose threads part by
T within 4h. The cap-only arms keep L 0, and only member()'s back-reach
ramp reads their new cut.
Chain 11's three are a pass just shallower than 2·atan(1/4), whose
reach drops from 4.33h to 4h. F3 has their ink against the oracle.

### F2 · The reach is continuous; e* can be steep where κ → 0 (18:13-18:30)

- **An eye.** `npx vite-node .claude/probes/K1040/s1/reach_eye.ts 0.05
  0.5 3 250 eye`: synthetic, h = 1, a pass at θ0 0.05 (r0 40.025h), the
  partner's vertex at x = 7 lifted by w so the threads part and come
  back, the arm's root at d = 12h. Largest step between neighbouring w,
  0.01h apart (out/s1f/sweep/eye_t0.05.txt):

  | Column | Largest step | At w |
  |---|---|---|
  | c2's walked e_c | 32.29h | 1.510 |
  | L under c2 and c3 | 3.266 | 1.510 |
  | quad e*, 1 fit | 0.103h | |
  | quad e*, 2 fits | 1.91h | 0.780 (L 0 there) |
  | quad e*, 3 fits | 1.53h | 1.360 |
  | L under the quad | 0.107 | 1.400 |

  c2's walk jumps where the eye's peak crosses its target (L c2/c3 0 at
  w 1.5, 3.266 at 1.51), while the quad's L runs 1.095 -> 1.181. Across
  the jump at 500 steps (`... reach_eye.ts 0.05 1.5 1.505 500
  eyefineB`), e_c still jumps 32.27h and L c2/c3 3.244 at w 1.502; the
  quad's reach and L step at most 0.0001.
- **e*'s steepness.** At e*2's largest step (`... reach_eye.ts 0.05 0.76
  0.8 400 eyefineA`, steps of 1e-4h) its largest step is 0.0228h at
  w 0.766: continuous (it shrinks with the step) but about 228h per h of
  vertex motion. There the second sample falls where the eye has closed
  back to g ≈ a·e, so κ ≈ 0, and de*/dκ = −T²/(2a³) at κ = 0 is large at
  small θ. L is 0 there (the reach exceeds d − h), so in this sweep it
  does not reach the ink; where it does, the ink moves fast but
  continuously. A residual (Handoff).
- **A real pass.** `npx vite-node .claude/probes/K1040/s1/reach_sweep.ts
  muse_hash 197 ec 1 40 probe`: muse_hash arm 197, chain 83's vertex 128
  moved δh along the separation (out/s1f/sweep/muse_hash_a197_*.txt).
  At δ steps of 0.05h the quad equals c3 throughout; largest steps r0
  6.19h, reach 0.4448h, L 0.1725. Fine sweeps (δ step 0.001h; `$env:DC
  = "<centre>"`, then `... reach_sweep.ts muse_hash 197 ec 0.025 50
  <tag>`) at the coarse steps:

  | Sweep | δ centre | Reach | L | r0 |
  |---|---|---|---|---|
  | fineM | −0.675 | 0.0165h | 0.0066 | 0.0187h |
  | fineP | 0.725 | 0.0100h | 0.0040 | 0.0100h |
  | fineR | 0.375 | 0 | 0 | 0.1644h |

  The coarse steps are r0's own slope (the moved vertex sets θ at the
  pass): below 4h the reach is r0, above it the reach stays at 4.0000h
  (fineR) and L at its value there.

### F3 · The j55 arc's two sites and the other changes, attributed (18:16-18:45, 06ed2732)

#1 moves only on g41_user_tw64, 59 -> 61 px. `$env:TAG = "q"; npx
vite-node .claude/probes/K1040/s1/attr_s1f.ts` (out/s1f/attr_q.txt)
lists the sites in one build's list only:

- **(318, 274) and (317, 275)**, world (2.832, 6.938) and (2.801, 6.969),
  5 px deep, new in q: S1e F4's j55 sites.
  - The term: the fillet arc of corner j55 (arms 170, L 0.772, and 171,
    L 2.060), ink 0.868 and 0.673, under top surface 21 (group 21:
    junctions 26, 53, 54, 55).
  - In c1 the same points carry chain 22's foot at ink 1.0 under chain
    22's own label (OWN). Chain 22's piece there had cap ramp 0:
    member()'s back-reach (S1b F10) read the phantom cuts of arms 168
    (Lcut −25.576, the point at d −2.70) and 172 (Lcut −23.444,
    d −0.568), so the piece left group 21 and the label fell to chain 22
    alone.
  - In q those arms' cuts are 0.609 and 2.742, not read there, and arm 81
    (L 0.772, Lcut 3.514) covers the point with ramp 1. The piece joins
    group 21, the label becomes surface 21, and the arc's ink lies 5 px
    inside it, which #1 counts. These are S1d F4's arc sites, hidden
    since S1d F5's phantom reach.
  - The look. The oracle inks both sites (56 and 44 of 64 sub-pixels
    within ±0.004 of them): q's ink is within 0.5 of the oracle's on 64
    and 63 of them, c1's (ink 1 throughout) on 56 and 44
    (out/s1f/win_ink_j55_sites.txt). Around them q is nearer the oracle
    in every window (`npx vite-node .claude/probes/K1040/s1/win_ink.ts
    g41_user_tw64 <x> <y> <half>`; win_ink_j55.txt):

    | Window | Px off the oracle by > 0.5, c1 -> q | Partial ink in the oracle's fill, c1 -> q |
    |---|---|---|
    | ±0.6 at the sites | 292 -> 145 | 730 -> 141 |
    | ±1.0 at (2.45, 7.3) | 782 -> 490 | 1452 -> 267 |
    | ±1.5 at the sites | 1104 -> 832 | 1830 -> 559 |

  - Crops (`$env:FORMB = "s1e_c1"` for c1, then `npx vite-node
    .claude/probes/K1040/s1/b_crop.ts g41_user_tw64 <x> <y> 2 0.8 4
    <tag>`; out/s1f/crops/g41_user_tw64_2.817_6.953_{c1,q}.png and
    g41_user_tw64_2.45_7.3_{c1,q}.png: form B, the oracle, the labels).
    c1 cuts group 21's fill into fragments with chain 22's own surface;
    q draws one fill with a closed hole at (2.38, 7.505), as the oracle
    does. q5holes finds that hole (50 px, group 21, the oracle's paper on
    all of it): g41_user_tw64's holes go from 4 in 3 groups to 5 in 4,
    defects 0 -> 0.
  - So #1's +2 is a label change that puts the arc 5 px inside a fill
    label, with the ink nearer the oracle, not further.
- (526, 646) and (527, 646) only dropped out of the 12-site list
  (scenes.ts lists 12 a scene, in raster order); their count is the same.

**Free ends**, g41_user_tw64 26 -> 22. Five go (chain 9 at
(2.735, 6.499); chain 18 at (2.654, 6.896), (2.196, 8.161),
(2.55, 7.981), (2.133, 6.991)) and one comes (chain 22, s 27.608, at
(2.098, 7.251)): this undoes S1d F5's 22 -> 26. The new one is where the
oracle draws a hook stroke at group 21's hole and q shows only a faint
tick (the crop at (2.45, 7.3)): a residual.

**The other moved arms** (`... win_ink.ts <scene> arm:<i> 1.0`;
win_ink_cap.txt, ±1.0 around each arm's root):

| Arm | Ink, c1 against q | Px off the oracle by > 0.5, c1 -> q | Partial ink, c1 -> q |
|---|---|---|---|
| muse_hash 111 (cap only) | identical | same | same |
| muse_hash 336 (cap only) | 293 px > 0.02, 9 > 0.5 | 200 -> 182 | 577 -> 478 |
| g41_user_tw64 110 (cap only) | 64 px > 0.02, max 0.139 | 637 -> 637 | 958 -> 935 |
| muse_hash 197 (restored) | 287 px > 0.02, 10 > 0.5 | 281 -> 266 | 579 -> 474 |
| g41_user_tw64 97 (lengthened) | 264 px > 0.02, 4 > 0.5 | 4 -> 1 | 302 -> 171 |

Every arm windowed moves toward the oracle or not at all. Not windowed
one by one: muse_hash 367, 378, 477 and g41_user_tw64 83, 183, 185, 186,
99, 106 (chain 22's arms near j55 are inside F3's windows); #1 and the
shared checks show no other change on their scenes.

### F4 · The gate against S1e's final (18:05-18:12 on b400a081)

On the final definition (nothing under `src/` changed after b400a081),
against out/s1e/logs/*_final* and *_c1*:

| Check | S1e final (c1) | S1f (q) |
|---|---|---|
| #1, all scenes | 156 px | 158 (g41_user_tw64 59 -> 61, F3) |
| Free ends | 114 | 110 (g41_user_tw64 26 -> 22, F3) |
| Shared checks, scenes failing of 12 | #2 11, #3 1, #4 11, #5 10, #6 5, #7 2, #8 0, #9 10 and 5, #11 1, #14 1, #15 0, #16 2 | the same, each |
| b_rate | 0 of 161 | 0 of 161 |
| Pins | 22 passed | 22 passed |
| npm test | passed | 191 files, 2573 passed, 8 skipped |
| Pops (label_pops' rule) | 16 / 168 px | 16 / 168 px: muse_drag 6 / 36, muse_flow 10 / 132, def 0 |
| pops_mech merge, corner_why | | identical to c1's (corner_why empty in both) |
| q5holes | | g41_user_tw64 4 holes in 3 groups -> 5 in 4 (F3), defects 0 -> 0; the rest identical |
| q4 | | only muse_hash moves: n 98812 -> 98769, px with \|Δ\| > 0.1 1419 -> 1417; mean \|Δ\|, p99, max and \|Δ\| > 0.5 the same |

Reproduce from the worktree:
- `pwsh .claude/probes/K1040/s1/run_s1f_gate.ps1 -Tag q`, then
  `pwsh .claude/probes/K1040/s1/run_s1f_gate.ps1 -Tag q -What mech`;
- `pwsh .claude/probes/K1040/s1/gate_table.ps1
  .claude/probes/K1040/s1/out/s1e/logs/scenes_final.txt
  .claude/probes/K1040/s1/out/s1f/logs/scenes_q.txt`.

Every change against S1e's final is attributed in F1 and F3; none moves
ink away from the oracle.

### F5 · The pins (18:40-18:54, 23aaca05)

`test/render/field/form_b.test.ts` gains "form B: a crossing's reach
(S1f, K1092)", three tests:
- straight threads: the reach is r0 = h·cot(θ/2) exactly, θ 0.05-0.6;
- K1092's phantom: a near-tangent pass whose partner turns away 2 behind
  it cuts at 4h, so L = D − 5H (the walk read the turn-away as the
  overlap's end);
- the eye: the largest |ΔL| per 0.002 of w is 0.0211 for the quad reach
  and 3.2522 for the walk.

`npm test`: 191 files, 2576 passed, 8 skipped. Run the three alone with
`npx vitest run test/render/field/form_b.test.ts -t "reach"`.

### F6 · Item 2: which gates a corner with fill reaches (18:49-19:05)

Two of the gates are reached with fill. They pop, and each needs a
continuous form. That is a definition change for the next stage, and
none was made here. Synthetic scenes use h = 1.

| Gate | Reached with fill? | Evidence |
|---|---|---|
| Lcut loop, d < −1e-12 (line 542) | **Yes.** A crossing slides across a tee's root. Arm +1's L goes 10 → 0, and corner 0-1 (r 0.866, ω 1) goes null. Ink at (1.6, 1.25) steps 1.0 at a dc step of 0.01 and of 1e-4. Arm −1's L goes 0 → 10, and corner 1-2 (r 2.0) appears. | `dedge.ts` (tee), `gates.ts` A. Census, passes behind a root whose overlap reaches it: 74 arm-pass pairs, 37 with a corner with fill (def 1/1, g41_def_tw64 14/10, muse_hash 42/17, g41_ring_tw64 4/3, g41_user_tw64 13/6). Nearest is muse_hash arm 109 (j36, through, closed): pass at d −1.112h, d/(reach + h) −0.222, corner 109-110 r 1.088. Closed chains would jump L 0 → len − reach − h (inferred, not swept). |
| 699, low side (V's foot at an arm's root) | **Yes.** On a Y with chain 1's root at (−e, 0), corner 0-1 (θ 2.0) holds r 2.0, ω 1 up to e 0.64205 and is null at 0.64210 (h·cot(1.0) = 0.6421). Ink steps 1.0 at three points around V, at an e step of 5e-5. | `gate699.ts` E1, E2. Census at rest: 16 low-side nulls. 2 sit at θ ≈ π. The other 14, in muse_hash and g41_user_tw64, sit beside a through arm with L ≤ 0.169 (world units) whose wedge side is negative too. In each scene, the passing corner nearest the low side sits at dV 0.036h-0.315h with r 0.42-1.04 and ω 1. Examples: g41_user_tw64 jj12 at 0.036h (θ 3.012, r 0.64) and muse_hash jj124 at 0.071h (θ 2.218, r 0.787). |
| 699 high side and 681 (L → 0) | No. The cap gate takes r to 0 first: sweep B gives r 2.0 at L 2.77, 1.29 at 1.95, 0.030 at 1.13, 0 at 0.72; null at L 0.577 (V's foot), and 681 later. At the switch, ink at six points around V steps 0.0000. | `gates.ts` B, B2. Census: each scene's passing corner nearest the high side (L − dV 0.0004h-0.027h) has r 0. g41_ring_tw42 is the exception, its nearest at 1.29h. |
| 597, θ ≥ π − 1e-6 | Reached with r 2.0 and ω 1 but **no fill**: the fillet's depth r(1/sin(θ/2) − 1) goes to 0. Ink steps 0.0104, 0.0002, 0.0000 at β steps 0.002, 5e-5, 2e-6. The corner's existence still switches, which labels may see. | `gates.ts` C1-C3 (a Y of ends; a through pair gets no corner, line 606). |
| ω's ±0.5h exclusion (line 922) | Not at rest. Over 1953 corners with r > 0, counting the skipped candidates changes ω on none. The largest skipped overlap is 0.0250h (g41_ring_tw42 corner 29-30) against the band's start at 0.05h. Not swept. | `gates.ts` D. |
| 694, no V | Not swept. One null at rest: g41_user_tw64 jj30, arms 93-91, θ 0.984, L 1.045/1.290. | `gates_census.ts` |
| 704, V outside the wedge | Not swept. Never the deciding gate at rest; the nearest passing corners sit 0.36h-0.66h inside with r 0-0.33. | `gates_census.ts` |

The census replays the corner loop and solveCorner's head over all 3622
cyclically adjacent arm pairs of the 12 scenes:

| Gate | Pairs |
|---|---|
| 597 | 525 |
| 606 | 609 |
| 681 | 76 |
| 694 | 1 |
| 699 | 292 |
| corner | 2119 |

Every pair the replay passes has its corner in `fb.corners` (0
mismatches).

Candidate continuous forms for the next stage, each a `Definition
change:`:
- **The d-edge.** Option one is a mirror cut for passes behind the root,
  c = |d| − reach − h, so an overlap that reaches the root cuts the arm
  from either side. Option two is an arm span [L0, L1] whose start
  moves.
- **699's low side.** A factor continuous in the geometry that takes r
  to 0 as either foot nears its root, the way the cap gate does at L
  (for example ss(dV/0.05h) on both feet at ρ = 0). Or open the solver's
  window behind the root so the margin factor, which falls over
  −0.05h..0, does it, with the gate moved behind that band.

## Handoff (19:08)

**Stopped:** the Order is done through item 2's sweeps. Item 2's
continuous forms are not made; they are Next 1. Nothing is timed, and
the perf lock was never taken.

**What landed** on `worktree-agent-a43dac8f0673db4df` (unpushed):
- abd6d372: this brief, the frozen S1e c1 form B and the gate runner;
- b400a081: Definition change, the quadratic reach as the default (F1),
  with its candidates probe, the eye sweep and the gate;
- 06ed2732: the j55 attribution (F3) and the reach's fine sweeps;
- a727f582: F1-F4;
- 23aaca05: the pins (F5);
- 0b106e15: item 2's d-edge census, tee sweep, gate sweeps and null-gate
  census;
- the commit with this Handoff: `gate699.ts`, F5, F6.

**Reproduce** (from the worktree; outputs under `out/s1f/`):

| What | Command |
|---|---|
| The gate (F4) | `pwsh .claude/probes/K1040/s1/run_s1f_gate.ps1 -Tag q`, then `-Tag q -What mech`, then `gate_table.ps1` on `out/s1e/logs/scenes_final.txt` and `out/s1f/logs/scenes_q.txt` |
| The reach (F1, F2) | `npx vite-node .claude/probes/K1040/s1/reach_cands.ts`; `reach_eye.ts 0.05 0.5 3 250 eye`; `reach_sweep.ts muse_hash 197 ec 1 40 probe` |
| Attribution (F3) | `$env:TAG = "q"`, then `npx vite-node .claude/probes/K1040/s1/attr_s1f.ts`; `win_ink.ts <scene> <x> <y>`; the crops as F3 says |
| Pins (F5) | `npx vitest run test/render/field/form_b.test.ts -t "reach"` |
| Item 2 (F6) | `npx vite-node .claude/probes/K1040/s1/dedge.ts`; `gates.ts` (about a minute); `gates_census.ts`; `gate699.ts` |

**Next:**
1. **Make the two gates that pop continuous** (F6), each change with its
   own `Definition change:` Finding.
   - The d-edge: the mirror cut or the moving start. Gate it against
     this stage's final, on the 37 filled corners and the tee sweep.
   - 699's low side: r → 0 as a foot reaches its root. Use
     `gate699.ts`'s Y and the census's nearest corners (muse_hash jj124,
     g41_user_tw64 jj12).
   - Then sweep 694 (g41_user_tw64 jj30 is the one at rest) and 704.
   - Run ω's exclusion with a kink sliding past the foot by ±0.5h.
2. **The brief's Later work:**
   - the 14 pops the merge leaves (126 px; the gate counts 16 / 168 px
     for S1e's final and S1f alike);
   - the three junction pops (104 px);
   - j129's corner.
3. **Residuals:**
   - e*'s steepness as κ → 0 (F2: de*/dκ = −T²/(2a³));
   - member()'s back-reach reads any cut out to |Lcut| + λ;
   - group 21's missing hook stroke and its new free end (chain 22,
     s 27.608, at (2.098, 7.251); F3);
   - the j55 arc lies 5 px inside its fill label (F3);
   - 597's discrete corner existence may reach the labels.
