---
paths:
  - "src/game/star_rating.ts"
  - "src/game/fabric_controller.ts"
  - "src/game/share_text.ts"
  - "src/ui/maze_hud.ts"
  - "src/ui/daily_stats_view.ts"
  - "test/game/star_rating.test.ts"
  - "test/game/fabric_controller.test.ts"
  - "test/game/fabric_trail.test.ts"
---

# Gameplay lore: star ratings (K155)

Moved verbatim from `gameplay.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `gameplay.md` lists the area's other files.

- STAR RATINGS (K155 stage 1, 2026-10-14; game/star_rating.ts, brief
  docs/design/K155.md). One to three stars for every finish. MEASURE:
  R = walked / optimal, where walked is every run walked, forward and
  back (FabricMazeController.walkedDist: each advance and backtrack adds
  its run, reset() zeroes it, respawn() keeps it, so the walk before a
  K80 catch counts); from a turn-based record, path + 2 x backtrack
  (walkedOf; trail mode never backtracks, its path is everything
  walked). Not the HUD's efficiency: it reads the route you ended on, so
  a wander that ends on the best route scores 100%. STARS (rateRun):
  three for R <= THREE_STAR_RATIO 1.5 and, in real time, never caught;
  two for R <= TWO_STAR_RATIO 4; one for any finish; no finite optimal or
  nothing walked, no rating (the edges carry a 1e-9 epsilon). THRESHOLDS
  from scripted solvers over 288 mazes at today's defaults / 288 dailies
  (`.claude/probes/K155/`: stars_sim.ts, `run_stars.ps1 -N 288 -Slices
  8`, stars_report.mjs, out/report_288*.md): greedy (K74's DFS walker)
  median 2.57x / 2.58x (p25 1.65 / 1.61, p75 4.46 / 4.61), stars 1/2/3
  = 28/52/19% and 28/53/19%; careful (sees the whole maze, so never
  enters a dead end, and takes the option with the shortest open route to
  the exit, each score x exp(0.1 N(0,1)) drawn per decision) median
  1.13x / 1.15x, three stars 94% / 93% (at noise 0.2: 1.6x, 41%); random
  walkers about 18x, 96% one star. The brief's "a
  greedy solve earns two about half the time" was read as EXACTLY two;
  AT LEAST two half the time would put T2 near 2.5 (open for Levi; T2
  3.5 gives 48% / 47%). A CATCH caps the rating at two (its walk is
  already in R). K80's harness with walked added (`rt/`, 288 mazes):
  greedy never caught 51%, median R 3.32 (2.19 uncaught, 5.86 caught),
  stars 42/47/11; fleer 46/42/12; smart 28/56/15. One star off per catch
  would charge a catch twice (greedy 56/33/11; open for Levi). DISPLAY:
  the ratio rounds UP to one decimal (ratioShown), so the number shown
  sits on the same side of each edge as R (1.5x three stars, 1.6x two);
  distances read as the HUD's (u x 10). WHERE: the win banner
  (maze_hud.ts starsWidget: a button under the heading, aria-expanded; a
  tap opens the three rules with the earned one lit, then "You walked
  2.2x the shortest route: 412 against 196, backtracks counted both
  ways.", plus "Caught once: the walk before it counts too." in real
  time, since a catch empties the HUD's path); the daily stats view
  (today's Solved line wears the widget and opens it under the today
  row; each History row a star cell explained on hover; the official
  results' star counts by the History heading; a legend note, since
  phones have no hover); the share text's title line (`Knotmaze Daily
  #3 🧶 ★★★`, designs too; no rating, no stars). RECORDS store nothing
  new: ratingForResult derives the stars from the stored path, optimal
  and backtrack (dailies are always turn-based), so old records rate
  too; unreadable data gives null, never a throw. No param, no codec
  append, no store version. PROBE: `.claude/probes/K155/probe_stars.mjs
  <base> <shotsDir> design|daily|realtime|caught[:phone]` (real taps;
  Share captured through navigator.share and the clipboard); hook
  `__knotFabric().walked`. K274 (2026-10-14) appends the plain line of
  every stat the banner shows to this same popover (`starsWidget(r,
  stats)`; gameplay-daily.md), so the button's aria-label then reads "how
  stars and stats work" and the probe's old check of "how stars work"
  needs updating. K80 turns stage 2: the share title adds a minotaur's
  tag after the stars (`Knotmaze 🧶 ★★☆ · 🐂 1`, or `🐂 0 · 3 close
  calls`; share_text.ts minotaurTag) and the grid draws `x`, the move
  you were caught on, as 🐂. Under minoRestart a catch restarts the
  level, which zeroes walkedDist, so the stars rate the last life's walk
  and the popover's "the walk before it counts too" does not hold there
  (gameplay-minotaur.md's CATCH RESETS).
