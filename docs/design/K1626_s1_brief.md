# K1626 stage 1: physics keeps a junction and the crossing beside it apart (Levi: a priority)

Levi, 2026-11-25, with a phone picture (`.claude/probes/K1626/levi_phone.png` in the main checkout, untracked;
copy it into your worktree): on `?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1`, right side of the maze near the
centre, "a junction with an adjacent crossing of one of the threads going over another from the junction.
Physics isn't doing a good enough job of keeping these threads apart. This is a recurring problem in other
places too." Then: "That physics issue should be a priority".

In the picture the place is the Y junction at about (640, 940) of the 891 x 2000 screenshot: one of its arms
crosses another thread immediately beside the junction, so the junction, the crossing and the arms pile into
one blob with no paper between them. Read ledger item K1626
(`node $HOME/Repositories/claude-config/tools/ledger.mjs show K1626 --repo .`). Base: `origin/master`.

## Goal

At rest, a crossing sits a clear distance along the arm from a junction, and the junction's arms and the
crossing's threads are apart enough that each reads on its own: paper (or at least each thread's own edge)
shows between the junction and the crossing, at Levi's place and at the other places of this kind. You own
the technique; the fix is in `src/physics/` (or in generation, if the measurement shows the layout leaves no
room and physics cannot make it: say so with the numbers before changing generation).

## This stage

1. Find the places: on Levi's link and at least five other mazes (the test set A_3..A_d, D_1..D_a; name the
   ones you use), list every junction with a crossing closer along an arm than some distance, with the
   distance, at rest. Say how common it is and what holds them together, observed by a change on a frozen
   settled state, not by reasoning (the sliding bindings' ordering clamps, the junction cover, the depth
   exemption near a crossing, MIN_PASS_SEPARATION and its triangle: whichever the measurement points to).
2. Fix it so the distance has a floor that the picture needs, with no new kinks, pinches or stretched arms
   elsewhere.
3. The knot still sleeps (the sleep and quiescence tests pass as written; never loosen them), drag feel is
   unchanged in kind, and a physics update costs no more than 5% over master (one A/B under the perf lock).

Another agent (K1622) is changing how junction arms bend in `src/physics/` right now, on branch `k1622-s1`
(read only for you). Yours lands first; keep your change small and local so its branch can be carried over.
Re-freeze the golden snapshots and other pins a physics change moves, and name each (pre-launch, no
back-compat). Keep out of `src/render/` (two agents work in `gpu_field/`).

## Done

1. The cause, with the measurement; the count of such places per maze, master against yours, and the
   smallest junction-to-crossing distance.
2. Src, tests, `npm test` green, `npm run build` passes, pins named.
3. For Levi: one picture, `master | yours`, large crops (at least 10x device pixels of a 1x capture, or a
   capture at high zoom) of his place and of five other such places, in `rp=gf&gfh=1` with his link's look,
   settled, real-time captures, viewed by you; plus the whole maze of his link side by side.
4. Update cost and time to sleep, master against yours.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1626-s1`, branch `k1626-s1`, from `origin/master`;
`node_modules` as a directory junction to the main checkout's (never `npm install`). Write only inside your
worktree. Read code through the shell; the Read tool only just before an Edit, and for images. Real-time
captures only, under the perf lock (`scripts/perf_lock.ps1`; three other agents share it: wait inside one
blocking command), ports 5655 to 5659. Commit WIP at every milestone (`git add -f` for probe tools, never
their outputs). Never push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
`--virtual-time-budget`. Helpers on sonnet, mechanical work only; looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. If the fix costs the sleep, stop and say so. On stopping: commit WIP, append
`## Handoff (stage 1)` here, commit, and report: verdict first (safe to land or not), picture paths, numbers,
a `Ledger items` list and the handle fields.

## Handoff (stage 1)

Agent K1626 s1, 2026-11-25 22:18 to 23:45, branch `k1626-s1` (worktree `.claude/worktrees/k1626-s1`),
commits ed3a9bdac, 56ce71c25, a4cb0f489, 32932fe44 and this one. Probes and their outputs:
`.claude/probes/K1626/` (outputs in `out/`, untracked).

**Verdict: safe to land as a partial fix.** The class gets clearly better, the sleep and cost hold, but
Levi's own place opens only partway.

**Cause** (observed on frozen settled states, `frozen.ts`, `out/frozen.txt`, `out/frozen2.txt`): a fused
joint sits at a lattice edge midpoint, so the through-thread's segments next to it are half segments
(rest < 0.4) and they sit stretched (x1.24 on Levi's link): too little material between a joint and its
first crossing, which is pulled in against the joint. On Levi's link's frozen state, those rests x1.8 took
the closest joint-to-crossing distance from 2.32 to 2.79 widths and the pairs under 2.5 w from 13 to 0,
re-sleeping 3.4 s later; a jnSep of 3.2 changed nothing; x1.8 on every arm segment made it worse (min
1.81 w, never re-slept).

**Fix** (`src/physics/particle_system.ts`, `buildJnHalfSegs`, `setJnHalfRests`, `jnHalfScale`): the half
segments within 2 segments of each fused member get rest x K, K = 1 + 0.8 * fade, the fade going 1 -> 0
over thread width 0.55 -> 0.7 (at fat widths it cost A_3's sleep); the bending rests across them become
the sum of their legs. A width change after the first step ramps K (full range over 3 s): x1.8 at once on a
settled `?1` never re-slept, ramped it re-slept 5.5 s later.

**Census** (`census.ts`, run_node, deterministic; L = Levi's link, D_1..D_a = `?1`..`?a`, A_3..A_d = his
blob on other seeds):
- L: closest junction-to-crossing 2.32 -> 2.74 w; pairs under 2.5 w 13 -> 0, under 3 w 65 -> 10.
- D_1..D_a: closest 1.20-1.34 -> 1.59-1.72 w; pairs under 1.5 w 12-26 -> 0-1, under 2 w 69-106 -> 10-24.
- Time to sleep 5.0 s on both everywhere but D_9 (5.0 -> 6.0). A_3 (width 0.8) identical to master;
  A_4..A_7 never sleep on either build (fat; not this change).
- p99 stretch unchanged; one outlier segment (D_7 chain 45 slot 19, x1.48); sharp bends (> 60 deg) up a
  little (L 50 -> 56, D_5 4 -> 9, D_9 3 -> 8).

**Levi's place** (found by matching his zoomed phone picture against a capture, `match_levi.py`, NCC
0.987, `out/levi_match.png`): J138, a T joint (chain 66 through, chain 71 ending) whose two arms cross
each other at X282, 2.6 ctrl out on each: a twist eye closed by the joint. Joint to X282: 3.64 -> 3.92 w;
the eye's opening (`eyes.py`, centre to centre, largest across the eye) 0.80 -> 1.23 w, so it is still
nearly shut (open needs about 2 w). Of the maze's 9 such joint eyes, 3 stay under 1.5 w on both builds
(J64 X100 0.29 -> 0.25, J138 X282 0.80 -> 1.23, J13 X38 1.18 -> 1.38).

**Picture** (real-time headed captures, settled at sim 5.0, gf passes > 0, `phw=0&fw=0&snd=none`, viewed):
`.claude/probes/K1626/out/K1626_master_vs_mine.png` (Levi's place J138, then the five joints with the
closest crossing on master: J157 2.32 -> 2.90, J110 2.37 -> 2.74, J120 2.39 -> 2.89, J84 2.40 -> 3.09,
J103 2.41 -> 2.87 w; then the whole maze), crops `_place0..5.png`. In mine's J120 crop a junction web
below the joint shows a small corner notch that master's does not (`out/j120_notch.png`): a render notch
(K1627's kind?) at geometry this change produces; not looked into.

**Cost** (`bench.ts` via `seq.ps1`, under the perf lock, A = master, B = mine, 3 alternating rounds): mean
step B/A 1.033 (L), 1.004 (D_1), 1.016 (D_4); sleep 5.00 on both.

**Pins**: the maze fingerprints in `test/physics/__snapshots__/byte_identity.test.ts.snap` (default and
fat maze) re-frozen; knot fingerprints unchanged. New `test/physics/joint_crossing.test.ts` (Levi's link
sleeps under 10 s with the closest joint-to-crossing over 2.6 w; `?1` sleeps under 10 s, over 1.55 w).
`npm test` 3224 passed, `npm run build` passes.

**Width-slider jump** (`widthjump.ts`, `out/widthjump.txt`; width 0.75 for 40 s, where neither link
sleeps on any build, then 0.5): re-sleep after the jump, master | without the ramp (ed3a9bdac) | with it:
`?1` +2.9 s | never (20 s) | +5.2 s; Levi's link +3.5 | +4.0 | +5.7 s. The ramp is needed; it still costs
about 2 s of re-sleep on a jump across the fade band.

**Next** (stage 2, if Levi wants his place open): the joint eye at J138 needs its own opening rule. The
kink-eye machinery (rest-material eye ratchet, across-eye pressure; `.claude/rules/physics-kinks.md`)
holds a self-crossing's loop open; a joint eye (two arms of one joint that cross within ~3 ctrl) is the
same shape with the joint as one end. Measure first on the frozen state (`frozen.ts`) with `eyes.py`'s
opening as the number (J138 X282, J64 X100, J13 X38), against the same sleep and cost bars.
