# K1211 S5: one pulse position near the joint, and the gold's light blended at its edge

Ledger: K1211 (one seamless light inside each junction). Stage agent: Claude Opus in its own
worktree, started by the coordinator while K1218 S1 and K1220 S1 run in other code; cap 2 h;
ports 5960-5969.

## Start

Your worktree starts from master, which holds this brief. S4's work is on its branch, unmerged
(`worktree-agent-a222ff792a21132ec`, last commit 42e2a7cc, based on 97e7a041). Bring it in:

- `git cherry-pick 97e7a041..42e2a7cc` (S4's six commits, oldest first: b4596bf1 look B out,
  b76a3f08 the S4 tools, 30e023c2 and 09bfee81 the soft field, 3b71ce98 and 42e2a7cc the
  Handoff). They touch no file master changed since. If one conflicts beyond the K320 pin's
  number, stop and report.
- Copy S4's untracked references, read-only from its kept worktree (the only read of another
  worktree this stage makes): `Copy-Item -Recurse
  C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a222ff792a21132ec\.claude\probes\K1211\out4
  .claude\probes\K1211\out4`. Never write in S4's worktree.
- For `node_modules`, make a junction to the main checkout's: `New-Item -ItemType Junction -Path
  node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`.
- `npm test`: green, with S4's 5 expected fails (`soft_light.test.ts`'s bar, one per stand).

## Why

Levi, 2026-11-05: "There are clear lines/edges of the highlight within the interior of the
junction. ... These junctions need to appear as though they are one whole fused seamless unit."

S4 (its Handoff, at the end of `docs/design/K1211_s4_soft_light.md`) removed look B and built a
soft field: every pulse band lends the web its light at its nearest foot and falls off past its
tube over 2.5 fill half-widths; the bands blend by distance, so at a tube's edge that band's own
light rules; only named arms take it; it is never darker than master's. In the twin's model the
largest step per px falls at every stand (x4 ji 149's shape 0.861 to 0.688 on the gold tube's
edge, the T fork 0.745 to 0.408, the sharp fork 0.969 to 0.320), but every stand stays 1.6x to 8x
the bar (0.085 per px, the crest's own slope along a plain arm). On the GPU, before the field,
the largest steps sat 2.3x to 13.9x the bar (cross ji 33 36 levels, x4 ji 149 111, loop ji 89
124). S4 stopped at two causes, which its brief reserved for the coordinator:

1. **K81's composite on the gold tube.** On the gold band's tube, K81's route-band composite
   paints that band's own crest at its own tau over everything beneath (`c = cg + gT*(c - c0)`);
   off the tube the field's whitening shows. The step at the tube's edge is their difference,
   and the field can only narrow it from the off side.
2. **Two taus near the joint.** Two bands that share an arm read different taus at one point
   near the joint: a turning band takes its tau from the pivot ray, a straight band by projection
   (a T fork at (-14, 14) px: 1.4 against -14). Their crests sit at different places, so any
   blend between them crosses that difference in the pixels between their tubes.

**The coordinator's call: build both** (a technical call; the look is judged below). One tau for
every band near the joint, and a composite that blends the gold band's light into the field at
its tube's edge instead of painting over it. S4's Handoff says the shared tau would also serve
fire's and collapse's fronts (K1210).

The reference: K1190's sheets
(`C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1139\out\s4\sheets\`, `t4_ji33_cross_n.png`
and `t6_ji149_x4_n.png`): four pulse moments a row; the top row is the approved look, a soft glow
with no edge anywhere inside the junction.

Calls that bind every change here:

- K1139 (Levi): the pulse "splits, it runs toward the player, and it goes straight through with
  no dim moment"; "no dark wedge between two lit siblings". Its option C (the whole junction lit)
  was rejected.
- K81: gold never reaches into an off-route arm ("a discontinuous flat nub"). The blend is in the
  light only: the gold's material edge (S2's round edge) doesn't move, and S2's nub check's bar
  stays 0.
- S2's round edge and S3's lit edge and web hold (`test/render/gold_edge.test.ts`,
  `test/render/web_light.test.ts`).
- Nothing changes at rest. All in mode 0 (what players see).
- Far from the joint, each band's crest stays where master puts it.
- A spot is judged against the approved version (the top row), never against the last step.

## Goal

While a pulse crosses a junction, its light reads as one soft glow, as in the top row: inside each
lit junction, the largest step over 3 device px at most 1.25x the bar on the GPU (S4's bar: cross
15, x4 8, loop 15 levels), and at most the bar in the model (`soft_light.test.ts`'s expected
fails turn into passing tests). It still splits toward the player and goes straight through with
no dim moment, with no dark wedge between two lit siblings, and no light or gold in an off-route
arm past master's. Nothing changes at rest.

## Read first

- S4's Handoff, whole, and S4's brief's Tasks (its task 4 lists the checks you run).
- `docs/ledger_notes.md`, the K1211 entries (Select-String `^## K1211`; read each to the next
  `## `).
- Then the code: `junctionField`'s pulse loop and S4's `pulseGlowFall`, `pulseGlowWeight`,
  `pulseRouteWeight` and `pulseBandCover` (`src/render/junction_field.ts`); K81's route-band
  composite; the twin, `cpuJunctionField` and the pulse inputs near the top of
  `src/render/ribbon/joinery.ts`; the headers of `src/render/pulse_path.ts` and
  `src/render/junction_routes.ts`. S1's, S2's and S3's Handoffs only where S4's points to them.

## Tasks

In this order. If the cap comes first, the Handoff says what is left.

1. **One tau near the joint**, shader and twin in step. Every band that lights a point near the
   joint reads the pulse at the same tau there, so two bands that share an arm put their crest
   in the same place. S4's lead: the signed arc distance from the joint along the arm nearest the
   point, the same for every band (the crest can be read at any tau, `g = r1.x + tau`). It stays
   continuous where the nearest arm changes, and along each arm past the fan it equals the band's
   own tau on master. Pin it on the twin: at S4's T fork point the two bands agree, and past the
   fan every band's tau is master's.
2. **The gold's light blended at its tube's edge**, shader and twin. Make the light continuous
   across the gold tube's edge: blend the gold band's light into the field over a band at the
   edge, or let the field own the light and the composite own only the gold's material. The
   means are yours. Pin it: across that edge, no step above the bar in the model; the nub stays
   0.
3. **The bar in the model.** `soft_light.test.ts`'s five expected fails become passing tests.
   The K1139 pins: two lit children within 0.05 at the same distance from the joint; the light's
   peak inside the junction not below 0.9x its lit arms'. An off-route arm's light no higher than
   master's where junctionBase gives it its own material; report S4's ramp near the centre (up to
   0.31 of the pulse colour, bounded at 0.32) before and after.
   - If a stand stays above the bar, say which term carries its step.
   - Re-freeze a pin only where a pulse lights a fan, and name it. A pin that moves at rest or
     away from a junction is a stop.
   - If a choice of look comes up that the calls above don't settle (how wide the blend at the
     gold's edge is, for instance), build at most two variants, the second behind the switch
     (`uJParams.z` 1), and leave the choice to the coordinator.
   - If the fix needs a change to how the fan's geometry is built (wedges, arm strips, records),
     stop at the cause and say what it would take.
4. **Checks**: S4's task 4, all of it, with S4's tools copied to new names for this stage
   (`.claude/probes/K1211/`: `shoot4.mjs`, `run_shots4.ps1`, `checks4.mjs` with step3,
   `crops4.mjs`, `hcat4.mjs`, `s4_ids.ts`, `smoke4.mjs`; never edit the originals). They only
   reject; report the numbers. Two additions:
   - Attribute the steps S4 left out along the arms (x4 ji 125 at r 2.51 fh, loop ji 88 at 1.91
     and 4.0, loop ji 113 at 2.04): is each the end of S1's cover strip, 2 fh out, or what?
   - If master's render code moved since 97e7a041 (K1218 S1 may merge during your stage), re-shoot
     the references on the new master before comparing.
5. **Sheets**: S4's task 5, as written there. View every crop yourself at full size and say, per
   spot, what you see against the top row. Pick nothing.
6. **Handoff**, appended below, with a paragraph for K1210: does the shared tau serve fire's and
   collapse's fronts as built?

## K1218 S1 and K1220 S1 in parallel

Each runs in its own worktree. K1218 S1 works in the crossing-gap mask (`gap_mask.ts`,
`ribbon/crossing_gaps.ts`) and `joinery.ts`'s `jointMask`. K1220 S1 works in the text forks'
records (`joinery.ts`'s arm drop, record writer and AXIS disc; perhaps `junction_field.ts`'s AXIS
lookup, `arm_strip.ts`, `ribbon_mesh.ts`). Keep your edits to the pulse's light: `junctionField`
and junctionBase's light terms, the twin's pulse code, `pulse_path.ts` and `junction_routes.ts`
if the tau needs them, and their tests.

At your end, `git fetch -q origin`, rebase onto `origin/master`, then run `npm test` again. Where
only a pin's number conflicts (`k320_slim`, for instance), take master's side, re-run the pin, and
re-freeze it to what your change gives; name it. If the rebase needs more than that, don't do it:
say what it would take.

## Muse in the main checkout

Muse runs in the main checkout on master during your stage and may push.

## Out of scope

The crossing-gap mask (K1218, K1219's triangle), x4 ji 149's teal notch at rest (K1219, the fan's
untraveled web), the text forks (K1220), fire and collapse (K1210), the walked gold at rest (S2's),
anything for Levi.

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges); use the Read tool
  only right before an Edit, and to view crops.
- Never touch the main checkout (Muse runs there on master), another worktree (past the one copy
  in Start) or another probe folder. Read-only references: K1190's sheets, S4's references in
  your `out4/` copy, and S3's shots in its kept worktree
  (`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a48fddd224c96d898\.claude\probes\K1211\out3\`).
  Write your own output to `.claude/probes/K1211/out5/`.
- Commit WIP on your branch at every milestone, broken or not; never push; never edit LEDGER.md.
- No helpers.
- Shots in real time (never `--virtual-time-budget`), under the perf lock through your copy of
  the shot runner (owner `K1211-S5`). K1218 S1 and K1220 S1 take the same lock: wait for it
  inside one blocking command. At most two browsers at a time; ports 5960-5969 only. A dev
  server's build stamp is the SHA it started from: check the served code, as `smoke4.mjs` does.
- Stop rule: stop when the tasks are done or 2 h after your start, whichever comes first
  (`Get-Date` at the start and at each milestone). Then commit WIP, append the Handoff and
  report. A compaction is not a stop: after one, re-read this brief and `git log`.

## Report

In plain words, report:
- the shared tau and the gold's edge blend, and the variant if any;
- what they add per fan fragment (texture reads, loop passes, branches; Run M (K1214) found the
  fan's fragment shader is the frame's growing cost in play) and the K320 delta against S4's
  42,123;
- the bar, and the largest step per spot: master, S4, branch, in the model and on the GPU;
- the checks' numbers per stand;
- the moved pins, by name;
- the sheets' paths, and what you see for each spot against the top row;
- the rebase;
- your last commit's SHA.

Then give `Ledger items` and K1211's handle fields (owner, branch, last commit, evidence, next).

## Handoff

(The stage agent appends here.)
