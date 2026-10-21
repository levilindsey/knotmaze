# K138: the planner pass (section 4's M mechanisms)

Ledger: K138. One stage, opus, 1.5 h cap. Docs only: no code.

The sooner plan (`docs/design/sooner_20261020.md`, the K138 row and
queue item 8) calls for "a planner pass [that] picks its first two
non-generation mechanisms once K137 s2 lands. Then one stage per
mechanism." K137 s1, s2 and s3a have merged; s3b is building now.

## The set

From `docs/design/K80_gameplay_additions.md` section 4 (grep the
headings): 4.1 Locks and keys, 4.2 One-way runs, 4.4 Required pickups
(then 4.5 Bonus pickups and stars), 4.6 Fleeing critters (simulate
first), 4.11 Switches, 4.12 Turnstile junctions, 4.18 Color-rule mazes,
4.19 Ice runs, 4.20 Rescue (escort), 4.23 The myth, 4.24 Tides, 4.27
Hidden runs, 4.31 More exits. Of these, 4.1, 4.2, 4.4, 4.11, 4.24 and
4.31 change generation: they need solvability checks and move pins
only on purpose. The costlier ones (4.8, 4.22, 4.25) are K141, not
this plan.

## Read

- Section 4's entries for the set, and section 0's decisions.
- Levi's calls: `docs/design/levi_notes_2026-10-13.md` (and
  `levi_notes_2026-10-14.md` if it touches the set). His direction:
  prototype each mechanism in free play behind its own toggle.
- What K137 built, from the Handoffs of `K137_s1.md` and `K137_s3a.md`,
  and what s3b is building: `git show
  worktree-agent-af34a0e5755494326:docs/design/K137_s3b.md` (its
  Design section; the branch moves while it runs). s3b adds more than
  one monster, sleepers, a follower, lures, snares, mud, the sword and
  sprint. Plan on top of those, not around them.
- The conventions row of `sooner_20261020.md`, and the K137 briefs'
  format (`K137_s3b.md`: Levi's direction, Decided, Your calls, Steps,
  Constraints, Stop rule).

## Write

1. **`docs/design/K138_plan.md`** (this file; add below a `## Plan`
   section). For each mechanism in the set: the rules to build (from
   section 4, made concrete in our medium: runs, junctions, the turn
   clock and the real-time clock), what it builds on (K137's pieces, the
   minotaur, cuts, the walker), whether it changes generation and how to
   check solvability, its params (appended after the codec's last
   index when it lands), the files it touches, its size (S, M) and the
   calls it needs from Levi, each with a recommendation. Then the stage
   order: the generation-free ones first, two or three at most per
   stage, each a working toggle in free play.
2. **`docs/design/K138_s1.md`**: the full brief for the first stage, in
   the K137 brief format, ready to launch once K137 s3b merges. Its
   calls carry recommendations, so the stage can build on them as s3a
   did. Leave the "Agents beside you" table for the coordinator.
3. **Questions for Levi**: at most six, one line each with the
   recommendation, at the end of the plan.

## Constraints

- Docs only: write only `docs/design/K138_plan.md` and
  `docs/design/K138_s1.md`. Read code freely to ground the plan
  (`src/game/`, `fabric_controller.ts`, `walk_graph.ts`), but change
  nothing.
- Agents beside you: K137 s3b (gameplay), K643 (glyph lint), K720
  (audio). You touch none of their files.
- No ports, no browser, no phone, no performance measurements.

## Stop rule

Stop when both documents are written or at the 1.5 h wall-clock cap,
whichever comes first. Run `Get-Date` at the start and at each milestone.
Commit WIP to your branch at every milestone and never push.

A compaction is not a stop: after one, re-read this brief and `git log`
before going on. Keep reads narrow (Grep -n, then Read with
offset/limit).

When you stop, commit, append a short "Handoff" section to this file (what
is written, what is left, the handle fields) and report. End your report
with the item's handle fields and a `Ledger items` list.
