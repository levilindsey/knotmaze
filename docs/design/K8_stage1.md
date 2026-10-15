# K8 stage 1: re-base G3 and G4's plan on today's master

K8 is G3 of `docs/design/G3G4_sdf_geometry.md`: SDF ribbons drawn from
one shared sample texture. K9 is G4, the SDF junction webs. Levi moved
both up on 2026-10-14 at about 23:46 ("I wouldn't mind bumping up to
sooner handle K5 and K6 and then K8 and K9"). Most of this week's render
work landed after the doc was written. Its plan has to be checked against
today's code before anything is built on it.

One opus agent, **docs only**: the design doc and this brief. It runs
beside three code agents, so it builds nothing. Stage 2 (G3-0) starts
from its handoff at the next free code slot. Ports 5880-5889 are yours
if you need a dev server.

## The stage

Update `docs/design/G3G4_sdf_geometry.md` in place. A dated note at the
top says what changed and against which commit.

1. **Sections 1-4, wherever today's code differs:** what runs per frame,
   the data model, the shaders, and what gets deleted. Read the code;
   don't trust the doc. What has landed since it was written:
   - **G2 paint:** `paint_glsl.ts`, `paint_math.ts` (the CPU mirror,
     which is the census reference), `paint_model.ts`, `paint_const.ts`
     and `float_rows.ts`. G3's ribbon pass must call the same paint
     library.
   - **The thread reveal (K76):** `explore_glsl.ts` and
     `explore_view.ts`, plus a chain landing in the paint shaders over
     the next day:
     - K76 2c (running now);
     - K268 stage 2 (shaped crossing gaps);
     - K290 (burnt threads);
     - K76 2d.

     Designs: `docs/design/K76.md`, `docs/design/K268.md`, and K290's
     ledger entry.
   - **Other render work:**
     - K81's route bands (`junction_routes.ts`, `junction_field.ts`);
     - K93's trail paint (`trail_paint.ts`);
     - K83's markers (`marker_mesh.ts`);
     - K99's fog (`fog_arc.ts`);
     - the pluck overlay (`pluck_overlay.ts`; K344 is fixing a cusp in
       it tonight);
     - K140's confetti;
     - K21's backgrounds.
   - **K7, the physics worker** (`docs/design/K7_worker.md`): the render
     side interpolates between snapshots, so G3's upload reads
     interpolated positions.
   - **K307:** the intro's freezes are cold shader compiles. Say what the
     warm-up must cover once G3's and G4's programs exist.
2. **Section 5, the staged plan:** re-cut G3-0 to G3-5 and G4-0 to G4-2
   for today's code. Give each stage:
   - its files;
   - what it keeps out of while K7's stages 3 and 4 own `main.ts`. G3-0
     may add at most a dev-only snapshot/restore hook there, outside the
     load path;
   - its tests and A/Bs;
   - its acceptance numbers.

   Decide and say:
   - whether G3-2 (the SDF ribbon pass) waits for the reveal chain's
     shader stages or ports them;
   - where K345 (the hover rim through the junction fillets) goes. The
     coordinator reads it as going into G4-1, since G4-2 deletes the fan
     shaders it would change. Confirm or correct that;
   - whether K328 (the hover glow's rim profile, planned with K111 stage
     5 and K265 on the shared paint library) needs anything from G3;
   - whether the decided defaults in K8's ledger entry still hold:
     - anchored tails keep flat caps;
     - phones stay at a 2x resolution cap;
     - over-tight folds keep today's pinch: shrink the per-sample radii
       to the local bend radius inside the CPU-flagged fold windows;
     - G1's GPU levers fold in: a loop-free protect test, a zoom-aware
       polyline tolerance, a per-point far-branch gate, and dropping the
       globals fetch.
3. **Section 6, risks and open questions:** refresh it.
   - The phone is a Pixel 11 on Android Chrome, reached through
     `scripts/phone.ps1`. Replace any iPhone references.
   - Give each question for Levi a recommendation.

Then write **stage 2's brief** as a "Stage 2 (G3-0)" section at the end
of this file. It covers:
- scope and files;
- tests;
- the pixel A/B: 0 px on at least four links (a daily, a fat-params
  design, thread reveal on, the dense preset);
- how to measure the upload cost under the perf lock;
- the stop rule below.

## Process

- Work on your branch. Commit at every milestone, and never push. Don't
  edit `LEDGER.md`.
- Measure nothing, so you don't need the perf lock. The render rules in
  `.claude/rules/` attach on their own as you read files.
- **Stop rule:**
  - Run `Get-Date` at the start and at each milestone.
  - Stop when the stage is done or at 2 h, whichever comes first.
  - A compaction is not a stop. After one, re-read this brief and
    `git log` before going on.
  - On stopping, commit, append a "Stage 1 handoff" here (state, what
    you changed, what's left, the stage 2 brief's status), commit, and
    report.
- Helpers, if any: sonnet, mechanical work only, under the same rule
  with a 1 h cap.
- **Final report:**
  - the commits;
  - the decisions above;
  - `Ledger items`: new follow-ups, residuals, and questions for Levi,
    each with a recommendation;
  - the handle fields: owner, branch + last commit, evidence, next,
    brief.
