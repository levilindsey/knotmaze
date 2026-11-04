# K1040 S1g: the corner gates that pop, continuous by construction

Ledger K1040, stage S1g: S1f continued, before S2. One stage: Opus, 2 h
cap. Branch `worktree-agent-a8056cde26bf07a6a`, worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a8056cde26bf07a6a`
(node_modules joined to the main checkout's). Work only there. Based on
44ce69a1, S1f's tip before its merge: S1f is finished but not merged, and
its merge rebases it, so its commits are cited here by subject as well as
SHA. Brief written 2026-11-02 by the stage agent, from S1f's Handoff
(Next 1-2) and F6, at the coordinating session's request (session
7301c55b).

## Why

S1f (branch `worktree-agent-a43dac8f0673db4df`) made a crossing's reach
continuous by construction: the quadratic reach, now the default (its F1;
b400a081 "K1040 S1f WIP: the quadratic reach (default), its candidates
probe, the eye sweep and the gate on it"). Its F6 (44ce69a1 "K1040 S1f:
F5 (the pins), F6 (which gates a corner with fill reaches) and the
Handoff"; the census and sweeps in 0b106e15 "K1040 S1f WIP: item 2, which
gates a corner with fill reaches") swept the corner solve's discrete
edges. Two are reached with fill, so they pop:

- **The Lcut loop's d-edge** (`if (d < -1e-12) continue`, form_b.ts line
  542): a pass behind an arm's root is skipped. A crossing that slides
  across a tee's root takes arm +1's L from 10 to 0 and arm −1's from 0
  to 10; corner 0-1 (r 0.866, ω 1) goes null and corner 1-2 (r 2.0)
  appears, and the ink steps 1.0 at a dc step of 1e-4 (`dedge.ts`,
  `gates.ts` A). At rest, 74 arm-pass pairs have a pass behind the root
  whose overlap reaches it, 37 of them with a corner with fill. A closed
  chain's d wraps, so there L would jump from 0 to len − reach − h
  (inferred, not swept).
- **solveCorner's 699, low side** (V's foot at an arm's root,
  dV ≤ 1e-9h): on a Y with chain 1's root at (−e, 0), corner 0-1 holds
  r 2.0, ω 1 up to e 0.64205 and is null at 0.64210; the ink steps 1.0
  at three points around V (`gate699.ts`). At rest, 16 low-side nulls;
  the nearest passing corners sit at dV 0.036h-0.315h with r 0.42-1.04
  and ω 1 (g41_user_tw64 jj12, muse_hash jj124).

Still unswept: 694 (no V; one null at rest, g41_user_tw64 jj30), 704 (V
outside the wedge, never the deciding gate at rest), and ω's ±0.5h
candidate exclusion with a kink sliding past the foot (not reached at
rest: the largest skipped overlap is 0.025h against the band's start at
0.05h). Not reached with fill, so no change: 699's high side and 681 (the
cap gate takes r to 0 first) and 597 (the fillet's depth goes to 0; its
existence still switches, a residual).

Levi does not look at this stage.

## Calls that bind

- **Earlier calls.** S1's to S1f's calls still bind:
  - watertight at every fade value;
  - the rate rule (S1b's call: |∇ink| at most about 3 per px across a
    fade, a change of winner or a gate; in motion, label_pops' rule);
  - each definition change written down as its own Finding headed
    `Definition change:`;
  - the eyes as they are (S1b F1);
  - continuous by construction (S1d): no fade on a discrete outcome;
    where a choice cannot be removed, a blend over every candidate with
    weights continuous in the geometry;
  - S1f's quadratic reach stays the default.
- **The oracle is the look at rest.** #1 and the shared checks get no
  worse than S1f's final (`.claude/probes/K1040/s1/out/s1f/logs/*_q*`)
  on any scene, unless a Finding attributes the change. S1d F2's sharp
  inner corner at a through pass's bend stays.
- **Each gate made continuous** is its own `Definition change:` Finding,
  with a sweep across the old edge (the largest ink step falls with the
  parameter step) and the gate's census at rest (which arms and corners
  it moves, each attributed).
- **The d-edge.** S1f F6's candidates, to pick between by the checks:
  1. *The mirror cut:* a pass behind the root cuts at
     c = |d| − reach − h, so an overlap that reaches the root cuts the
     arm from either side. Continuous at d = 0 (both sides give
     −reach − h). A pass behind the root within L + reach + h now
     shortens the arm; every arm it moves is listed.
  2. *The moving start:* an arm span [L0, L1] whose start moves past a
     pass behind the root, L0 = max(0, reach + h − |d|). Continuous only
     if the pass in front of the root matches it at d = 0, which the
     current cut does not (L = 0 there), so it needs the in-front side
     too.
  Gate it against S1f's final on the 37 filled corners and on the tee
  sweep (`dedge.ts`, `gates.ts` A).
- **699's low side.** r → 0 as either foot reaches its root, by a factor
  continuous in the geometry (for example ss(dV/0.05h) on both feet at
  ρ = 0, the way the cap gate does at L), or by opening the solver's
  window behind the root so the margin factor (its band −0.05h..0) does
  it, the gate moved behind that band. Swept on `gate699.ts`'s Y and
  checked on the census's nearest corners (muse_hash jj124,
  g41_user_tw64 jj12). The gate itself may stay once a sweep shows it is
  reached only with r = 0 (S1d's D5 argument).
- **694, 704 and ω's exclusion.** One sweep each: 694 around
  g41_user_tw64 jj30 (the one at rest), 704 on a bend; ω's ±0.5h
  exclusion with a kink sliding past the foot by ±0.5h. A gate reached
  only after r and ω have gone to 0 needs no change, and its Finding
  says so with the sweep. A gate reached with fill gets a continuous
  form, as above.
- **Then the gate** against S1f's final (the quadratic reach, `-Tag q`).

## Order

Take `Get-Date` at the start and at each milestone, and write the times
into Findings. Append `## Findings` (F1, F2, ...) to this brief as you
go.

1. **Read (about 10 min).** S1f F6 and Handoff (done for this brief);
   form_b.ts's Lcut loop, solveCorner's head (681-704), its overlap gate
   (ω, about line 905-930), and where an arm's L is read (armWindow,
   member, pieces, onArm); S1f's `dedge.ts`, `gates.ts`,
   `gates_census.ts`, `gate699.ts`.
2. **The d-edge (about 35 min).** Repoint S1f's item-2 probes at this
   worktree (outputs under `out/s1g/`) and let them load either form B
   (the frozen S1f final or the worktree's). Make the candidate(s)
   behind a param; the tee sweep (coarse and fine) and the census of the
   37 filled corners and every arm the change moves, before and after.
   Pick by the checks, switch the default, Finding. Commit.
3. **699's low side (about 30 min).** The candidate(s) behind a param;
   `gate699.ts`'s Y swept across e = h·cot(θ/2); the census's nearest
   corners; Finding. Commit.
4. **694, 704 and ω's exclusion (about 15 min).** One sweep each;
   Findings. Commit.
5. **The gate (about 15 min)** on the final definition, against S1f's
   final (`-Tag q`): the pins and `npm test`; `scenes.ts` with the free
   ends; the pops and pops_mech, corner_why; `b_rate.ts`; q5holes and
   q4; `gate_table.ps1`. Commit.
6. **If time remains:** S1f's Later work (below), per its brief.

Then write `## Handoff`. Stop at the cap wherever the Order stands. If
time runs short after step 3, run the pins, b_rate and the pops on the
final definition and leave the rest to the Handoff.

## Later work (not this stage)

- Any of steps 2-4 not reached.
- S1f's Later work: the 14 pops the merge leaves (126 px; the gate
  counts 16 / 168 px for S1e's and S1f's final alike), the three
  junction "scene chain samples" pops (104 px; muse_flow 7>8 at (8.177,
  22.757), 80 px), and j129's tA corner on muse_hash.
- S1's later steps, S2, and the shader port (S4).
- S1f's residuals, filed by the coordinator: e*'s steepness as κ → 0;
  member()'s back-reach; group 21's hook stroke and chain 22's free end;
  the j55 arc 5 px inside its label; 597's discrete corner existence.
  Touched only if a gate above needs it, and then a Finding says so.

## Where things are

- **S1f:** `docs/design/K1040_s1f_reach.md`: F1 (the quadratic reach,
  line 223), F6 (the gates, line 474), Handoff (line 517).
- **The definition:** `docs/design/K1040_junction_field.md` F2 and F3,
  amended by the stages' definition-change Findings.
  `src/render/field/form_b.ts` is the current definition: the Lcut loop
  in the constructor ("Arms and their spans", the d-edge at line 542),
  the corner loop (597, 606), solveCorner (677; its gates 681, 694, 699,
  704; ω's overlap gate after the ball).
- **The code:** `src/render/field/form_b.ts` and
  `test/render/field/form_b.test.ts`.
- **The probes,** in `.claude/probes/K1040/s1/`:
  - `run_s1g_gate.ps1` (copied from `run_s1f_gate.ps1`, outputs under
    `out/s1g/`, toplevel check on this worktree), `gate_table.ps1`;
  - S1f's item-2 probes `dedge.ts`, `gates.ts`, `gates_census.ts`,
    `gate699.ts`;
  - the frozen copy `form_b_s1f_q.ts` (S1f's final form_b.ts, 44ce69a1)
    for before/after probes.
- **Outputs:**
  - this stage's runs go under `s1/out/s1g/`; `out/s1f/` is the baseline
    (`logs/*_q*`, tracked on S1f's branch).
  - Commit the summaries and crops the Findings cite (`git add -f`);
    leave the rest untracked. Copy `out/s1g/` back to the main
    checkout's `.claude/probes/K1040/s1/out/s1g/` before reporting.
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
  `LEDGER.md` or S1f's brief.
- **Tests.** `npm test` (tsc included) passes at every commit called
  done.
- **Other checkouts.** Write nothing in them, except the copy of
  `out/s1g/` back to the main checkout at the end (untracked files only;
  a Muse run may be working in the main checkout, so touch nothing else
  there and run no git command in it). Don't run `npm run build` in the
  main checkout. Every script that runs jobs first checks that
  `git rev-parse --show-toplevel` prints this worktree's path, and stops
  if not; variables get distinct names, not just distinct case.
- **Dev server** (only if a page probe is needed): from this worktree,
  `npx vite --config .claude/probes/K1040/vite.private-cache.config.ts
  --port 5401 --strictPort --host 127.0.0.1`. Never port 5173 (Levi's) or
  5403 (another agent's); leave 5480-5489 alone. Stop it when done.
- **Reading code and output.** Through the shell: `Select-String` and
  `Get-Content <file> | Select-Object -Skip <n> -First <m>`. The Read
  tool only right before an Edit. Probe output goes to files; print
  summaries of at most about 30 lines per call. PowerShell for every
  command.
- **Commits.** WIP to this branch at every milestone, broken or not.
  Never push, never skip hooks, no helpers (no subagents). Messages end
  with the Co-Authored-By and Claude-Session lines.
- **Timing.** Nothing here is timed. If something is, take
  `$env:TEMP\claude-perf.lock` first (one line: owner K1040-S1g, start
  time, what; wait inside one blocking command if another owner holds
  it, stale after 30 min) and delete it after; label numbers taken
  under load.
- **Stop rule.** Stop when the Order is done or 2 h after the start
  (`Get-Date`), whichever comes first. A compaction is not a stop:
  after one, re-read this brief and `git log --oneline -5`, then go on.
  When you stop: commit WIP, append `## Handoff` (what landed, the
  measurements with the commands that reproduce them, Next 1-3),
  commit, copy `out/s1g/` back, report.
- **The report** is short: what landed (commits); the gate's result
  against S1f's final; each gate made continuous and which arms or
  corners it moved; the Handoff's Next. It ends with `Ledger items`
  (new follow-ups, residuals, decisions for Levi) and K1040's handle
  fields: owner, branch and worktree, last commit, evidence, next,
  brief, env.

## Findings

Start 19:27:41 (cap 21:27:41).

### F1. Definition change: the d-edge, a pass behind the root cuts at its distance (`dEdge: "near"`, 19:53)

The Lcut loop skipped a pass behind an arm's root (`d < −1e-12`), so L
popped from its span to 0 as a pass slid over the root (S1f F6: the tee's
arm +1, L 10 → 0, ink 1.0 at (1.6, 1.25)). Now a pass behind the root, at
arc distance u = −d (on a closed chain u = len − d, the arc back to the
root), cuts the arm at c = u: L is continuous at d = 0 (u → 0 behind,
d − reach − h < 0 in front), with slope 1, so the span's end mirrors the
pass and moves at its speed. Lcut still steps there (0 behind, −reach − h
in front), but only where L = 0 on both through arms, where the cap mix
reads ramp 0 as OWN in every weighted configuration (S1f F6's argument);
the sweeps show no ink step at that point. Candidates, behind
`dEdge` (`dedge_s1g.ts`, old = S1f's final `form_b_s1f_q.ts`):

| | tee coarse ink step (dc 0.01) | tee fine | ring coarse | ring fine | arms moved | corners moved | lost fill | F6's 37 filled corners emptied |
|---|---|---|---|---|---|---|---|---|
| skip (S1f final) | 1.000 at dc 0 | 1.000 | 1.000 | 1.000 | - | - | - | - |
| mirror, c = u − reach − h | 0.148 | 0 | 0.174 | 0 | 1242 | 739 | 256 | 37 |
| **near, c = u** | **0.148** | **0** | **0.174** | **0** | **607** | **100** | **4** | **1** |

(0.148 and 0.174 are the sweeps' ordinary rate elsewhere: the old
definition shows the same steps away from dc 0. L's largest step is the
dc step itself, 0.01 and 1e-4.) The ring is a closed circle of radius 8
through the junction, so the wrap is swept too (old L step 48.26 there).

Mirror is the symmetric form but costs a quarter of the scenes' fill at
rest, so near, its strict relaxation (the weakest continuous cut of slope
1: any c = u + K with K > 0 leaves L(0⁻) = K), is the default. The four
corners near empties are all muse_hash: j0 0-1 (r 0.043h), j36 109-110
(r 2.721h: arm 109's L 2.950h → 1.112h for a pass 1.112h behind its root,
and the cap gate, continuous in L, takes r to 0 there; F6's one emptied
corner), j155 471-472 (0.120h), j156 475-473 (0.125h).

The gate (`run_s1g_gate.ps1 -Tag near -What scenes,rate,pins`, then
`gate_table.ps1 out/s1f/logs/scenes_q.txt out/s1g/logs/scenes_near.txt`):
#1 158 → 154 (muse_hash 4 → 0, no scene worse), free ends 110 → 102
(muse_hash 37 → 32, g41_def_tw64 11 → 9, g41_user_tw64 22 → 21); every
shared check's failing-scene count unchanged; b_rate 161 sites, 0
breaches (4 sites' maxima moved by at most 0.08/px); the pins pass.
Reproduce: `$env:PARAMS='{"dEdge":"near"}'; $env:TAG='near'; npx vite-node
.claude/probes/K1040/s1/dedge_s1g.ts` (→ `out/s1g/dedge_near.txt`).

### F2. Definition change: the root gate, r goes to 0 as a foot reaches its root (`rootBand: 0.5`, 20:04)

699's low side: V is solved in the window [0, L], so a foot behind its
root clamps to the root (dV = 0) and the window test nulls the corner with
its full r. On `gate699.ts`'s Y (θ 2.0, chain 1's root at (−e, 0)) S1f's
final switches at e 0.64205 → 0.64210 from r 2.0h, ω 1 to null, and the
seven probe points step 0.864, 1.0, 1.0, 0.736, 1.0, 0.303 and 0.048.
The root gate is a fourth factor of solveCorner's w (after the margin,
steep and cap gates): ss(d/band) on each tracked foot's distance d from
its arm's root, the low-side twin of the cap gate (S1f's ss(slack/0.5h)).
r is the integral of w's running min, so it goes to 0 continuously as
either foot reaches its root, and the window null is then reached only
with r = 0, ω = 1, which draws like a null corner (S1d D5). The window
test itself is unchanged. `gate699_s1g.ts` (old = `form_b_s1f_q.ts`; the
census is against the same form B with rootBand 0, the gate alone):

| band | E1 coarse (e step 0.005h): r's step, ink's largest | E2 fine at the switch (0.00005h): r, ink | corners whose r moved at rest | lost fill |
|---|---|---|---|---|
| 0 (S1f final) | 2.000, 1.000 (at the switch) | 2.000, 1.000 | - | - |
| 0.05h | 0.299, 0.756 | 0.001, 0.0025 | 3 | 0 |
| **0.5h** | **0.030, 0.125** | **0.000, 0.0006** | **155** | **0** |

At 0.05h the arc moves about 11 times as fast as the root (the tip sits
r(1/sin(θ/2) − 1) from V, 0.188r at θ 2.0, and all of r goes in 0.05h of
motion), past label_pops' local motion + 1 px. At 0.5h it moves about 1.1
times as fast, the cap gate's own rate, and its largest coarse ink step
(0.125, at e 0.35) is the sweep's ordinary edge motion. So 0.5h is the
default. Census at rest, by scene: def 17, fat 0, ring 4,
user_tw42.lightpaper 17, g41_def_tw42 17, g41_def_tw64 17, muse_hash 18,
muse_default_tw 22, g41_ring_tw42 5, g41_ring_tw64 4, g41_user_tw42 17,
g41_user_tw64 17. 129 of the 155 have dV 0.25-0.5h, near-straight corners
whose fillet is a sliver: the tip moves (old r − new r)(1/sin(θ/2) − 1),
at most 0.221h (muse_hash j124 375-376, the census's nearest: θ 2.218,
dV 0.071h, r 1.967h → 0.078h), then 0.101h (muse_default_tw j164
499-497), every other at most 0.077h, 16 more than 0.05h. The other
nearest, g41_user_tw64 j12 36-37 (θ 3.012, dV 0.036h): r 2.000h → 0.028h,
a tip move of 0.004h. [S1h (K1114, 2026-11-03): the formula assumes straight
arms. Measured from each corner's own V, q and r, j124's tip moves 0.087h
and the ten largest F2 moves 0.036-0.096h; F1's at-rest tip moves are
larger, 0.34-0.75h at three corners no gate cropped
(`docs/design/K1114_s1h_crops.md`, Handoff).]

The gate, with F1 (`run_s1g_gate.ps1 -Tag rb05 -What scenes,rate,pins`):
the same as F1's in every count (#1 158 → 154, free ends 110 → 102,
every shared check unchanged), b_rate identical to F1's at all 161 sites
(0 breaches), the pins pass (25). Reproduce:
`$env:PARAMS='{"rootBand":0.5}'; $env:TAG='rb05'; npx vite-node
.claude/probes/K1040/s1/gate699_s1g.ts` (→ `out/s1g/gate699_rb05.txt`;
`rb005` for 0.05h).

### F3. 694 (no V): a seed failure, reached with fill at 2 corners at rest; no definition change (20:12)

694 nulls a corner when solveEq, seeded at the straight-arm V
(c + bisector·h/sin(θ0/2)), does not converge. At g41_user_tw64 jj30
(h 0.320, θ 0.984; arm 93 through, L 3.265h; arm 91 END, L 4.032h) the
straight seed fails at rest, but a seed at half the distance from the
roots' midpoint converges to a true V, (7.503, 3.122), dV 1.035h/1.056h:
a corner of r 0.158h, ω 1, which the code draws as null
(`gate694r_s1g.ts`, section R). So 694 there is not a gate in the
geometry but the solve's basin, and the null is reached with fill. A
probe-side retry (from the roots' midpoint + k·(seed − midpoint): k 0.5,
then the seed rotated ±0.3) finds two such corners in the 12 scenes
(R2), both with fill:

| scene | junction, corner | θ | dV | r with the retry |
|---|---|---|---|---|
| g41_user_tw64 | j30, 93-91 | 0.984 | 1.035h | 0.158h |
| muse_hash | j156, 475-473 | 0.950 | 1.160h | 0.123h |

muse_hash j156 475-473 is one of F1's "lost fill" corners, so that loss is
this seed failure, not the d-edge. No definition change, because a retry
is itself a discrete choice. Along gate694's sweep (chain 30 moved t·h
across the bisector, R1) the retry turns the null into fill (r up to
0.558h) that then meets 704 at t 0.875 (F4). In the code as is, the fine
sweep (F, t step 0.001h) switches at t −0.528 to a spurious V (dV 2.54h,
r 0.0006h, no ink step) whose flickers keep r ≤ 0.0126h; one probe point,
(7.35, 3.1), still steps 0.51 at t −0.474 and 0.26 at −0.469 (not
attributed). The continuous form is a V solve that cannot pick a basin
(the first equidistant point, by continuation from the roots) together
with F4's wedge weight: Next 1. Reproduce: `npx vite-node
.claude/probes/K1040/s1/gate694r_s1g.ts` (→ `out/s1g/gate694r.txt`);
`gate694a_s1g.ts` (→ `gate694a.txt`) prints each exit per t, with the
code's seed and with the retry.

### F4. 704 (V outside the wedge): not reached on a bend, reached with fill only behind F3's retry; no change (20:22)

The wedge test (crossA·sgn > 0 and crossB·sgn < 0, on each arm's 2h chord
from c) fails only where the chord misrepresents the arm near V.
`gate704_s1g.ts` bends arm 0 of a Y (h 1, three ENDs) away from arm 1 on
a circular arc of curvature κ (0 to 1.5 in 0.005 steps) at θ 0.5, 0.7,
1.0 and 1.4. Corner 0-1 is never null (no V failure, no window, no
wedge): crossA·sgn ≥ 0.863 (θ 0.5, κ 0.15), −crossB·sgn = 1.000
throughout. V moves toward c as the corner opens (θ 0.5: (3.92, 1.00) at
κ 0, (1.62, −0.26) at κ 1.5) and r grows smoothly: θ 0.5 0.383h →
1.674h; θ 0.7 0.548h → 2h; θ 1.0 0.820h → 2h by κ 0.9; θ 1.4 1.263h → 2h
by κ 0.6. The one place 704 was reached is jj30 behind F3's retry: wedge N
from t 0.875, after r 0.558h at t 0.85 (`gate694a.txt`). In the code as
is, 694 nulls that corner first. So no change this stage: a continuous
wedge weight belongs with the robust V solve (Next 1), the only thing
that reaches a V where the wedge can fail.

The sweep found a pop of a different corner, with fill and ω 1: corner
2-0, the side that arm 0 bends INTO. Where arm 0's radius of curvature
nears h + |V − its centre| (θ 0.7 at κ 0.88, a radius of 1.13h; θ 1.0 at
κ 0.79-0.85; θ 1.4 at κ 0.755-0.78), corner 2-0's r jumps 0.05-0.2h per
0.005 κ, and points on arm 0's inner edge by V step 1.0 (seven grid
steps). The fine sweep at θ 0.7 (`gate704f_s1g.ts`, κ step 0.0005):

| κ | r | V | dVb (V's foot on arm 0) | ink at (0.07, −1) |
|---|---|---|---|---|
| 0.8800 | 0.470h | (0.087, −1.033) | 0.755h | 1.000 |
| 0.8815 | 0.606h | (0.087, −1.033) | 0.844h | 0.001 |
| 0.8825 | 0.053h (room 8.53) | (0.086, −1.033) | 0.845h | 0.981 |
| 0.8830 | 0.610h | (0.086, −1.033) | 0.845h | 0.000 |
| 0.8950 → 0.9000 | 0.647h → 0.844h | (0.082, −1.035) → (0.080, −1.035) | 0.852h → 0.945h | 0.000 ((−0.26, −1): 0.985 → 0) |

Observed: r and V's foot on arm 0 jump together while V stands still.
Inferred, not tested: V sits 0.135h from the arc's centre of curvature,
so its distance to arm 0 varies by only 0.035h along the arc (1.001h to
1.036h) and its foot there is ill-conditioned, the same class as F5's
foot switch (Next 2). Reproduce: `npx vite-node
.claude/probes/K1040/s1/gate704_s1g.ts` (→ `out/s1g/gate704.txt`, STEP
rows print every corner); `$env:TH='0.7'; npx vite-node
.claude/probes/K1040/s1/gate704f_s1g.ts` (→ `gate704f_0.7.txt`; env K0,
K1, N).

### F5. ω's ±0.5h exclusion: never deciding, no change; a kink by the foot pops V's foot with fill (20:18)

`gateomega_s1g.ts` slides a bump (a cos² of half-width 0.4h, height H)
along arm 0 of the same Y, xk 0.2h → 4.2h in 0.02h steps, across corner
0-1's foot and its ±0.5h window, at θ 2.0 and 1.2 and H 0.15, 0.3 and
0.6h. It computes ω's overlap as the code does and the skipped
candidates' largest R − d (ovEx, as S1f's gates.ts D). In all six slides
ω = 1 at every step. The largest ovEx is 0.0255h (H 0.15h: θ 2.0 at xk
1.32, θ 1.2 at 2.26), and 0.0000h at H 0.3 and 0.6h, against ω's band
starting at 0.05h. So the exclusion never decides, here or at rest (S1f
F6: no change over 1953 corners, the largest skipped 0.025h), and needs
no change: the margin gate keeps the candidates in the window ≥ R − 0.05h
at q by construction.

The slides found a pop of their own, with fill and ω 1 (the largest |Δr|
per 0.02h of bump travel):

| θ | H | largest \|Δr\| | at xk |
|---|---|---|---|
| 2.0 | 0.15h | 1.93h | 1.24 |
| 2.0 | 0.3h | 1.95h | 1.42 |
| 2.0 | 0.6h | 1.62h | 1.62 |
| 1.2 | 0.15h | 0.97h | 0.88 |
| 1.2 | 0.3h | 0.99h | 0.70 |
| 1.2 | 0.6h | 1.01h | 2.44 |

`gateomegaf_s1g.ts` at 0.0005h steps: at θ 2.0, H 0.15h, xk 1.2360 →
1.2365, r 2.0h → 0.0675h with V unmoved ((0.642, 1.001) → (0.642,
1.000)) and its foot on arm 0 jumping from the bump's rising flank (dVa
1.126h, foot x 1.300) to the flat before it (dVa 0.642h, foot x 0.685);
room 7.60 → 8.86; the ink at (0.9, 1.15) steps 0.997. At θ 1.2, H 0.6h,
xk 2.4300 → 2.4330: r 1.026h → 0.016h, dVa 2.636h → 1.462h, ink 0 → 1.0
at (1.6, 1.9). At θ 2.0, H 0.3h: |Δr| 1.961h at xk 1.4110, ink 0.176.
Observed: at the switch V is equidistant from two places on arm 0 (an
event of the arm's medial axis) and V's nearest-point foot jumps between
them. Inferred: the ball's tracked feet start at V's, so from the flat
foot the ball meets the bump and the margin gate stops r at 0.02-0.07h,
while from the flank foot it rides past to r0. Not one of this stage's
gates; the continuous form blends the corner over V's candidate feet with
weights continuous in the geometry (Next 2). Reproduce: `npx vite-node
.claude/probes/K1040/s1/gateomega_s1g.ts` (→ `out/s1g/gateomega.txt`);
`$env:TH='2'; $env:H='0.15'; $env:X0='1.2'; $env:X1='1.26'; npx
vite-node .claude/probes/K1040/s1/gateomegaf_s1g.ts` (→
`gateomegaf_2_0.15.txt`; the other two: TH 1.2, H 0.6, X 2.42-2.46 and
TH 2, H 0.3, X 1.40-1.44).

### F6. The gate: S1g's final (`-Tag g1`, F1 + F2) against S1f's final (`-Tag q`) (20:24-20:48)

No check is worse on any scene without an attribution. Each move was
attributed by rerunning its measure under four definitions: s1f
(`{"dEdge":"skip","rootBand":0}`, which reproduces `-Tag q`'s counts
here), near (F1 only), rb05 (F2 only) and both (g1). Every move that
was split is F1's. F2 moves none of them; its change at rest is F2's
census (155 corners' r, tip at most 0.221h). The rate sites are split
by F1's own gate, whose four values g1 repeats; `-Tag rb05` ran with
F1, so it doesn't split them. The pops' unexplained-px and fade counts
were not split.

- **Pins and `npm test`:** pins 25 passed (q 22, before S1g's pins);
  `npm test` 2576 passed, 8 skipped (q 2573, 8).
- **scenes.ts with the free ends** (`gate_table.ps1`): F1's gate exactly.
  #1 158 → 154 (muse_hash 4 → 0), free ends 110 → 102 (muse_hash
  37 → 32, g41_def_tw64 11 → 9, g41_user_tw64 22 → 21), no scene worse.
  Every shared check's failing-scene count is unchanged: #2 11, #3 1, #4
  11, #5 10, #6 5, #7 2, #8 0, #9 outline walks 10 and sections 5, #11
  1, #14 1, #15 0, #16 2.
- **b_rate:** 161 sites, 0 breaches, max 2.92 (q's). F1's four sites
  moved: muse_hash (5.553, 14.959) 1.41 → 1.49 and (11.375, 3.126)
  1.48 → 1.49; g41_def_tw64 (32.8, 0.596) 2.08 → 2.02 and (32.8, 0.551)
  2.08 → 2.01.
- **The pops:**
  - def_drag, def_flow and muse_drag keep their pops (muse_drag 6, 36
    px). muse_drag's unexplained px outside fades go 218 → 212.
  - muse_flow goes 10 → 11 pops (132 → 137 px). Its unexplained px go
    639 → 629 outside fades; inside fades f8 29 → 8, f24 2 → 0, f16
    210 → 216 and f6 12 → 10.
  - After pops_mech's merge: q has 16 pops (168 px), 30 px merged, and
    14 pops (126 px) left. g1 has 17 pops (173 px), 33 px merged, and
    the same 14 pops (126 px) left.
  - corner_why: q has none. g1 has one, which the merge excuses:
    `muse_flow 31>32 (9.509, 8.966) 5 px [switch corner radius]
    155/471/472: r1 room (dV); r 0 > 0.055`.
- **That pop is F1's, through F5's foot jump.** `popattr_s1g.ts` sweeps
  the corner's r over the 31 > 32 interpolation in 100 steps, then
  bisects the largest step 24 times.
  - s1f and rb05: r stays 0.050-0.055. The largest step is 0.0065 at
    t 0.4085, with room and dV unchanged. S1f has that jump too; it is
    under the pops' threshold.
  - near and both: r is 0 until t 0.998974, then 0 → 0.0548 within
    1e-9, where V's foot jumps (dV 1.750/1.574 → 0.561/0.463).
  - S1f's definition has the same foot jump at the same t. Its room
    stays where the cap gate is saturated (0.31 → 1.03), so r doesn't
    see the jump. F1's cut leaves the corner's room at −0.019 before the
    jump, and the cap gate passes the jump to r.
  - This is F5's class (V's foot switching across an arm's medial
    axis), which Next 1-2 cover.
- **q4:** only muse_hash's |Δ|>0.5 count moves, 7 → 11 (max 0.652 →
  0.841; inner 2 → 4, outer 0 → 1, inner+fade 4 → 6).
  - Elsewhere the |Δ|>0.1 counts move by at most 5 (def 1135 → 1138,
    g41_def_tw64 305 → 300), and no other |Δ|>0.5 count moves.
  - q4attr on muse_hash gives s1f 7, near 11, rb05 7 and both 11, so F1.
  - The new misses sit at two of F1's four corners near empties. One is
    (8.65-8.70, 8.81-9.00), 0.51 from j155 (471-472). The other is
    (23.21-23.26, 10.40-10.55), 0.60 from j0 (0-1). There the AA eval
    gives 0.73-1.0 where the exact coverage is 0-0.48.
- **q5holes:** muse_hash goes 4 → 3 holes and muse_default_tw 5 → 4,
  because the group 108 eye at (25.3, 20.8) stops counting. q5attr gives
  s1f 4/5, near 3/4, rb05 4/5 and both 3/4, so F1.
  - **The eye is unchanged** (`q5eye_s1g.ts`). Its paper component (50
    px and 164 px, closed) and its rim's ink ≥ 0.5 are the same under
    s1f and near, and match the oracle's.
  - near hands part of the rim from group 108 to a chain's own surface
    (9 of 76 rim px in muse_hash, 1 of 140 in muse_default_tw): F1's cut
    ends the arm's span there, and the chain draws past the cut.
    q5holes counts a hole only when ONE junction group tops its whole
    rim, so the census changed its classification. The look did not
    change.
  - Over the 161 × 161 px box around the eye, max |Δink| is 0.0004 in
    muse_default_tw. In muse_hash it is 1.0, on 50 px in x 846..857 and
    y 493..582, which the box's right edge clips: not the eye.
    `q5eye_who_s1g.ts` widens the box. The region is 196 px (x 846..879,
    y 486..587), all in two of F1's corners: j36 109-110 (group 31, r
    2.721h → 0, F1's emptied corner; 39 px go from its ink to paper) and
    j62 189-187 (group 47, r 2.438h → 1.431h, one of F1's 100 moved
    corners). No other corner within 4 of the region changes r.
  - Other F1 moves in q5: muse_hash group 110's hole at (9.0, 8.94), between
    j155 and j156 (both F1 corners near empties), 33 → 36 px (the
    oracle's paper is 34); group 55 at (5.3, 14.9), 28 → 23 px;
    muse_default_tw group 55, 103 → 94 px.
  - q5holes exits 1 in this worktree. Its dpr-2 prototype block reads
    `.claude/probes/K1040/out/muse_hash_dpr2.png`, which exists only in
    the main checkout; every dpr-1 line completes before that.

Reproduce:
- `pwsh .claude/probes/K1040/s1/run_s1g_gate.ps1 -Tag g1`, then `-Tag g1
  -What mech` (→ `out/s1g/logs/*_g1*`, `pops_g1/`, `q4_g1_*/`,
  `scenes_g1/`, `rate/rate_g1.*`).
- `pwsh .claude/probes/K1040/s1/gate_table.ps1
  .claude/probes/K1040/s1/out/s1f/logs/scenes_q.txt
  .claude/probes/K1040/s1/out/s1g/logs/scenes_g1.txt`.
- The attributions: `pwsh .claude/probes/K1040/s1/q5attr_run_s1g.ps1`,
  `q4attr_run_s1g.ps1` and `popattr_run_s1g.ps1` (→ `out/s1g/q5attr/`,
  `q4attr/`, `popattr/`; about 3, 2 and 1 min).
- `npx vite-node .claude/probes/K1040/s1/q5eye_s1g.ts` (→
  `out/s1g/q5eye.txt`), then `q5eye_who_s1g.ts` (→ `out/s1g/q5eye_who.txt`).

## Handoff

Stopped at 20:50 (start 19:27:41, cap 21:27:41) with Order steps 1-5
done. Step 6 (S1f's Later work) was not started: a definition change
there needs its own sweep, census and gate, and the gate alone took 20
min. Levi has not looked at anything from this stage.

**What landed** (branch `worktree-agent-a8056cde26bf07a6a`, unpushed,
not merged):

| commit | subject (short) |
|---|---|
| `0f7d230e` | K1040 S1g: the brief, the frozen S1f final form B and the S1g gate runner |
| `d06cdd8e` | WIP: the d-edge behind a param, `dedge_s1g.ts` census and sweeps |
| `310ee6eb` | WIP: F1 and F2 (defaults `dEdge: "near"`, `rootBand: 0.5`), `gate699_s1g.ts`, `gate694_s1g.ts` |
| `740893a3` | WIP: F3, F4, F5 (no definition change) |
| `91e00df6` | F6: the gate against S1f's final |

`new FormB(scene, {dEdge: "skip", rootBand: 0})` reproduces S1f's final.

**The gates made continuous:**
- **F1, the d-edge** (`dEdge: "near"`). A pass behind an arm's root now
  cuts the arm at its arc distance, so L is continuous at d = 0 with
  slope 1.
  - The tee and ring sweeps' ink step goes 1.000 → 0.148 and 0.174
    coarse (the sweeps' ordinary rate) and 1.000 → 0 fine.
  - At rest it moves 607 arms and 100 corners. 4 lose fill, all in
    muse_hash: j0 0-1, j36 109-110 (r 2.721h → 0), j155 471-472 and
    j156 475-473 (which is F3's seed failure, not the d-edge).
  - `mirror` was rejected: it moves 1242 arms and 739 corners, and 256
    lose fill.
- **F2, 699's low side** (`rootBand: 0.5`). solveCorner's w gets a
  fourth factor, ss(d / 0.5h) on each foot's distance from its root.
  r then goes to 0 as a foot reaches its root, so the window null is
  reached only with r = 0.
  - On gate699's Y, r's coarse step goes 2.000 → 0.030. The largest
    coarse ink step goes 1.000 → 0.125, and the fine one goes to 0.0006.
  - At rest it moves 155 corners' r and loses no fill. The largest tip
    move is 0.221h (muse_hash j124 375-376) by the straight-arm formula,
    0.087h measured from the corner (S1h, K1114).
- **No change, each by its sweep:**
  - 694 (F3) is a seed failure of solveEq. It is reached with fill at 2
    corners at rest: g41_user_tw64 j30 93-91 and muse_hash j156 475-473.
  - 704 (F4) is never reached on a bend; it is reached with fill only
    behind F3's retry. F4's sweep found a different pop: corner 2-0 on a
    tight bend, where r jumps 0.05-0.2h per 0.005 κ.
  - ω's ±0.5h exclusion (F5) never decides: ovEx is at most 0.0255h,
    against the band's 0.05h. A kink by the foot makes V's foot jump,
    with fill.

**The gate (F6):** S1g's final against S1f's final (`-Tag q`). No check
is worse on any scene without an attribution.
- Pins: 25 pass (q 22). `npm test`: 2576 passed, 8 skipped.
- #1 158 → 154 and free ends 110 → 102. Every shared check is
  unchanged.
- b_rate: 0 breaches at 161 sites, max 2.92. Four of F1's sites moved,
  by at most 0.08/px.
- The pops: muse_flow 10 → 11. The new pop is corner_why's
  `muse_flow 31>32 155/471/472`, which comes from F1 together with F5's
  foot jump, and the merge excuses it. The merge leaves 14 pops (126 px),
  the same as q.
- q4: muse_hash's |Δ|>0.5 count goes 7 → 11 (max 0.652 → 0.841), at
  F1's corners j155 471-472 and j0 0-1.
- q5holes: muse_hash 4 → 3 and muse_default_tw 5 → 4. This is a
  classification change in the census; the eye's paper and ink are
  unchanged.

**Reproduce:** each Finding ends with its commands.
- The gate: `pwsh .claude/probes/K1040/s1/run_s1g_gate.ps1 -Tag g1`,
  then `-Tag g1 -What mech`, then
  `gate_table.ps1 out/s1f/logs/scenes_q.txt out/s1g/logs/scenes_g1.txt`.
- The attributions: `q5attr_run_s1g.ps1`, `q4attr_run_s1g.ps1` and
  `popattr_run_s1g.ps1`.
- The probes read two inputs: the main checkout's scenes
  (`.claude/probes/K868/scenes`) and S3a's seq13
  (`.claude/worktrees/k868-s3a/.claude/probes/S3a/seq13`).
- q5holes exits 1 in a worktree, because its dpr-2 block needs the main
  checkout's `.claude/probes/K1040/out/muse_hash_dpr2.png`.

**Next:**
1. **A robust V solve.** Find the first equidistant point by
   continuation from the roots, so that 694 can never be a basin
   failure, and replace 704's test with a continuous wedge weight (F3,
   F4).
2. **Blend V's foot over its candidate feet**, with weights continuous
   in the geometry. This covers F5's kink pop, F4's tight-bend pop on
   corner 2-0, and the muse_flow 31>32 pop that F1 exposes (F6).
3. **Scope 2, S1f's Later work** (not started):
   - the 14 pops the merge leaves (126 px);
   - the three junction pops (104 px; muse_flow 7>8, 80 px), which
     pops_mech files as "scene chain samples", meaning a chain's sample
     count changes between the two frames (`pops_mech.ts` line 53);
   - j129's tA corner on muse_hash.
