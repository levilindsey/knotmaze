# K80 stage 1: the real-time minotaur mode

Levi's calls (2026-10-13, verbatim in `docs/design/levi_notes_2026-10-13.md`;
the K80 item in `LEDGER.md` lists them by number) decided the minotaur.
Real time comes first, as its own mode: "I really want the real-time
prototype. Maybe it's not a modifier of another gameplay mode, but rather
a dedicated mode itself. Do implement it." The turn-aligned hunter (a
modifier of the normal maze, with the telegraph) comes later, as does a
daily with a minotaur.

Read first: `docs/design/K80_gameplay_additions.md` section 0 (Levi's
calls), the minotaur sections (movement patterns, 4.35 on a smart
real-time chaser, R.4.2) and section 7 (the probe it reran, untracked in
the main checkout: `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K80\`);
`.claude/rules/gameplay.md` attaches when you open `src/game/` or `src/ui/`.

## What the mode is

- A dedicated mode, chosen by a param and listed in the panel. Pick a
  param shape that K114's proposed `clock` (turn | beat | realtime) can
  extend later without a rename.
- The player moves as today (a tap at a branch point runs one thread run),
  at a pace that is a param. No undo in this mode, free play included
  (call 4). No wait move (call 5: turn-aligned only).
- The minotaur lives on the walk graph at a position along a run and
  moves continuously. It starts at the finish (Levi's first note), with a
  red highlight behind its glyph.
  - Wander: it roams with a wander pace and randomized pauses at
    junctions (randomized paces are optional). Dead ends stay its hunting
    ground (call 6): bias its roaming toward them. Prefer picking a
    destination and travelling to it over a fresh random choice at every
    junction (Levi's first note).
  - Detection starts within one distance of the player and ends beyond a
    larger one, both measured along the threads (arc length through the
    walk graph, not a count of runs). While it has the player it
    approaches at an approach pace along the shortest path.
  - A catch (contact within a catch distance) sends the player back to the
    entrance and counts it (call 3). Show the count in the HUD and in the
    stats; the solve continues.
  - Every distance, pace and pause is a param (call 3).
- Pick the defaults by simulation, not by feel alone. A perfect fleer is
  never caught at equal pace on our looped mazes, so build a headless
  harness (vite-node) that plays a scripted player (a greedy solver, plus
  one that flees once chased) against the minotaur over 20+ seeds and
  reports catches, solve times and time spent chased. Aim for a typical
  player caught zero to two times and a fleer able to escape, and report
  the table.
- Run the minotaur on a fixed-step sim clock with a seeded RNG (from the
  design seed), so a later replay or daily can reproduce a chase from
  the player's inputs and their times.
- The glyph and highlight need a phone minimum size: threads are 4-5 px at
  fit scale. Use the K83 marker system (`marker_glyphs.ts`,
  `marker_mesh.ts`). Decide how it shows under fog (a param is fine), and
  give it an offscreen indicator (K73's system) if that reads well.
- Audio and music are out of scope (call 8 is a later experiment), as are
  K120's held keys (keep the input path open for them).

## What must not change

- The dailies: the golden daily fingerprints and K87's pin stay green,
  and the bare URL still opens today's daily. The mode is an ordinary
  design (any query other than a daily's).
- Knot mode stays byte-identical (`test/physics/byte_identity.test.ts`),
  and the existing maze modes keep their behavior and defaults.
- Links: append the new params to codec v4's table (pre-launch, no new
  codec version; CLAUDE.md "Key Design Decisions"). K79 B and K147 also
  append, so expect renumbering at the merge's rebase.

## Verification

- `npm test` green, with unit tests for the minotaur: its movement over
  a fixed graph and seed, detection start and end distances along the
  threads, the approach path, a catch and the return to the entrance,
  that undo is off, and the codec appends.
- The simulation table above.
- Desktop browser probes (headed, real time, `scripts/diag_screenshot.mjs`
  rules; never `--virtual-time-budget`): a scripted chase that gets
  caught and one that escapes, and screenshots at desktop and phone
  width (411x753). No phone run: the round's one phone pass covers it
  (K152).
- If you measure frame time, take `$env:TEMP\claude-perf.lock` first
  (`~/.claude/rules/sessions.md`).

## Setup

- Link `node_modules` to the main checkout's with a junction
  (`New-Item -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`).
- Ports 5460-5469 are yours; check that a port is free before binding.
  Serve with a private vite cacheDir: `vite.private-cache.config.ts` in
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K19-K20\` (untracked,
  so it is not in your worktree; `.claude/rules/probes.md`).
- Probes and results go in your worktree's `.claude/probes/K80/rt/`
  (untracked; the coordinator copies them at the merge).

## Process

- One stage. Commit WIP at every milestone on your branch and never
  push. Lore goes in `.claude/rules/gameplay.md` (the mode, its params and
  the defaults' simulation), a history line in `docs/history.md`, and a
  structure line in CLAUDE.md for each new file.
- Stop near 150k tokens of context, even mid-stage: commit, then report
  what is left. Helpers: sonnet for mechanical work, each with its own
  stop line.
- Final report: what changed and where, the defaults and why, the
  simulation table, the probe results with screenshot paths, a playable
  link for Levi, a `Ledger items` list (follow-ups, residuals, decisions
  for Levi) and the handle fields (branch, last commit, evidence, next).
