# K1040 S1g: the corner gates that pop, continuous by construction

Ledger K1040, stage S1g: S1f continued, before S2. One stage: Opus, 2 h
cap. Branch `worktree-agent-a8056cde26bf07a6a`, worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a8056cde26bf07a6a`
(node_modules joined to the main checkout's). Work only there. Based on
46f2ed57, S1f's tip before its merge: S1f is finished but not merged, and
its merge rebases it, so its commits are cited here by subject as well as
SHA. Brief written 2026-11-02 by the stage agent, from S1f's Handoff
(Next 1-2) and F6, at the coordinating session's request (session
7301c55b).

## Why

S1f (branch `worktree-agent-a43dac8f0673db4df`) made a crossing's reach
continuous by construction: the quadratic reach, now the default (its F1;
bd3f32ae "K1040 S1f WIP: the quadratic reach (default), its candidates
probe, the eye sweep and the gate on it"). Its F6 (46f2ed57 "K1040 S1f:
F5 (the pins), F6 (which gates a corner with fill reaches) and the
Handoff"; the census and sweeps in 4cde68fc "K1040 S1f WIP: item 2, which
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
  - the frozen copy `form_b_s1f_q.ts` (S1f's final form_b.ts, 46f2ed57)
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

### F2. Definition change: the root gate, r goes to 0 as a foot reaches its root (`rootBand: 0.5`, 20:08)

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
a tip move of 0.004h.

The gate, with F1 (`run_s1g_gate.ps1 -Tag rb05 -What scenes,rate,pins`):
the same as F1's in every count (#1 158 → 154, free ends 110 → 102,
every shared check unchanged), b_rate identical to F1's at all 161 sites
(0 breaches), the pins pass (25). Reproduce:
`$env:PARAMS='{"rootBand":0.5}'; $env:TAG='rb05'; npx vite-node
.claude/probes/K1040/s1/gate699_s1g.ts` (→ `out/s1g/gate699_rb05.txt`;
`rb005` for 0.05h).
