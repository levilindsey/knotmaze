You are the K1139 stage 1 agent in knotmaze. Your worktree is your checkout (the main checkout is `C:\Users\lsl\Repositories\knotmaze`; don't write there). This stage is PLANNING: a design document with pictures, no shipped code.

## The ask

Levi, 2026-11-03: "Pulse reach is good. BUT, we have to make pulses animate correctly across junctions. This will be important to get right, so take some time to properly plan what this should look like, how to verify it, and how to implement it."

These are the choice pulses (Pulse reach is their panel param). Their history: `docs/design/K299_choice_pulse_bug.md` and the ledger entries K175, K189 and K299 (`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs show <ID> --repo .`; older Done entries are in `docs/ledger_done.md`, long notes in `docs/ledger_notes.md`). Junction geometry lives in `src/render/junction_field.ts`, `src/render/junction_routes.ts` and `src/render/arm_strip.ts`. Find the pulse code yourself (grep for pulse).

## Deliverable

`docs/design/K1139_pulse_junctions.md`, committed on your branch, with these sections:

1. **Today.** How a pulse is made and drawn. Exactly what goes wrong where it meets a junction: which arms, which frames, what the eye sees. Show it with frame strips at pinned clock times for two or three junction kinds: a plain fork, a junction with several arms, and a pulse that should cross a junction and go on.
2. **The look.** What a pulse should do at and through a junction: how it enters, whether it splits or continues, timing, how width and brightness carry across, and how it follows the fan's geometry. Write it in plain words, with mock-up pictures (drawn over real frames, or taken from a prototype on your branch). Where more than one look is plausible, show one picture per option and give your recommendation.
3. **A route pulse.** One pulse runs along a chosen path through several junctions. This is the reveal a memory mode would use (K1140's Glimpse: show the right path, then hide it). Cover it in the design, or say what it adds.
4. **How to verify.** Decidable checks:
   - unit tests on a pure pulse-path model;
   - probe tables at pinned clock times: continuity of position, speed, width and brightness across each junction boundary, no gaps, no doubled pulses, and every arm a choice should reach is reached.
   - the picture sheets Levi reads.
   Name the stands (full links) and the probe hooks, existing or to be added.
5. **Implementation plan.** Stages, each sized for one 2-hour agent. For each: its files, its Done list, and its risks (golden pins, shader programs, the physics-worker mirror, cost on the Pixel). Say which stage needs the phone.
6. **Questions for Levi.** Plain questions about what is on screen (looks only, never parameter or function names), each with its picture. Decide technical variants yourself, by the checks.

## Rules

- `src/` stays untouched, except for an optional prototype for the mock-ups. Put any prototype in commits titled `K1139 S1 prototype (not for merge)`. Probes, harnesses and pictures go in `.claude/probes/K1139/` (untracked); anything reusable goes in tracked `scripts/`.
- Desktop only: don't use the phone at all. Use ports 5620-5639, never 5173, 5480-5489 or 5500-5599.
- Read `.claude/rules/probes.md` before probing. A bare URL is today's daily, not a fresh design. Pin the clocks for frame strips. Never use Chrome's `--virtual-time-budget`. If you time anything, take the perf lock described in `~/.claude/rules/sessions.md`.
- Read code through the shell: `Select-String` to find lines, then `Get-Content <file> | Select-Object -Skip <n> -First <m>`. Use the Read tool only right before an Edit, or to look at a picture.
- Don't spawn subagents.
- Your first commit is this brief, saved as `docs/design/K1139_s1_brief.md`. After that, commit work in progress at every milestone, broken or not. Never push.

## Stop rule

Run `Get-Date` now and at each milestone. Stop when the design document is done or at 2 hours of wall clock, whichever comes first. Then commit your work in progress, append a `## Handoff` section to the brief file (where things stand, what is next), and report. A compaction is not a stop. After a compaction, re-read this brief and `git log` before going on.

## Report

End your final message with:
- the design document's path and the picture sheets' paths;
- the questions for Levi, each with its picture's path, plus your recommended look;
- the stage plan, one line per stage;
- a `Ledger items` list: new follow-ups, residuals and decisions;
- K1139's handle fields: owner, branch and last commit, evidence, next, brief.

## Handoff

2026-11-03 10:02, stage 1 done (started 08:45; stopped because the
design document is done, before the 2-hour cap).

- **Where things stand.** `docs/design/K1139_pulse_junctions.md` is
  complete: today's mechanism and its eight faults (1.3, a-h), the
  boundary table measured on the CPU mirror (1.4), frame strips and
  kymographs (1.5), the three looks with real frames (B) and mock-ups
  (A, C) (2.2-2.4), the recommendation (A, on top of S2's light field),
  the route pulse for K1140 (3), the checks (4: the pure `pulse_path`
  model's tests T1-T10, probe tables P1-P10, sheets, stands), the stage
  plan S2-S6 (5) and three questions for Levi with pictures (6). No
  `src/` change and no prototype commit: the S2 look was shown by
  injecting its declaration into the live renderer from the probe
  (`strips.mjs`, `K1139_INJECT=fixed`).
- **Evidence.** `.claude/probes/K1139/` (untracked except the scripts and
  the pictures the doc shows, added with `-f`): `strips.mjs` (frame
  strips and stand JSON, pinned clocks, under the perf lock),
  `kymo.mjs`, `table.mjs`, `mock.mjs`, `crop.mjs`, `sheet.mjs`, the
  batch files, and `out/doc/` (the doc's pictures). The appendix of the
  design document lists the commands.
- **What is next.** Levi answers Q1-Q3 (looks only). Then the S2 brief:
  the light field (no phone), with S5 folded in if Q3 says straight
  through. S3a/S3b (the bands; S3b needs the phone) only if Q1 says A.
- **Open notes for the coordinator's ledger:** see the final report's
  `Ledger items`.
