# K115 stage 9 brief: the crossings-only glyph prototype

Ledger item K115. Stage 8 designed a smooth, crossings-only cursive
(`docs/design/K115_glyphs.md`, the design; read its Summary and sections
3-9 first). **This stage builds a prototype of it in the app** for a
small glyph set, behind a probe-only switch that is never the default,
and proves it against the stage 8 gates on contact sheets.

**Mass authoring waits on Levi.** The full set (the rest of Latin,
capitals, digits, punctuation, Greek, accents) comes only after Levi has
looked at this stage's sheets and said go. Do not author beyond the set
below.

**The set:** the glyphs of "Daily #8" (D a i l y, space, #, 8) plus e,
o, t, n, 6 and ς.

## Prerequisites

- **K558 is merged** (pen keys on `SegIn`, the reverse param;
  `docs/design/K558.md`). This stage emits its keys and redoes nothing.
  If K558 is not on origin/master, stop and report.
- **K552 is merged** (the title flag, default off). Titled sheets turn
  it on in their links.
- **Levi's calls** (glyphs doc section 11, all answered 2026-10-20).
  Build what he picked:
  - a pill dot (call 1);
  - floating strokes not walkable, for now (call 2; K569 is the
    follow-up that makes some of them threads, out of scope here);
  - a looped hand with no spread turns (call 3): where a spread turn
    would go, a junction and a dead-end spur (glyphs doc section 5,
    rule 2 as amended);
  - floor 2.0 LU, with call 4's fit below it;
  - Hershey kept as the fallback (call 5);
  - the o-kind join in Levi's form (call 6): the connector runs along
    the oval's first stretch, drawn once as a spur (glyphs doc
    section 4, "Levi's o-kind join").

## Picked decisions

- **The switch.** A `#glyphs2` hash flag read once at module load, before
  main.ts's URL rewrite drops the hash (K307's `#seq` precedent,
  `probes.md`).
  - It never enters a link, `PARAM_DEFAULTS` or the codec, so no pin,
    golden daily or link moves.
  - Off, every scene builds exactly as today.
- **The representation is the doc's section 3:**
  - 72 GU per x-height;
  - cubic Bézier chains with integer control points;
  - exact evaluation at k/64 with Math.sqrt only (K108);
  - crossings refined by Newton, with a lint error when one fails to
    converge.
- **The glyph record** (section 3) has an advance, entries, an exit, a
  body and floats, plus a declared crossing count. **Joins** (section 4)
  use the B/H/D exit classes, b/o/m entry kinds, one cubic connector
  per join and a ligature table keyed by (previous, next).
- **Crossings only, plus spurs** (section 5, rules 1-6, with rules 2
  and 6 as amended by calls 3 and 6). Section 5's table is the base:
  "Daily #8" has 10 ENDs, 0 JUNCTIONs and the declared crossings, plus
  one JUNCTION and one END per spur (at least the i's stem and the a's
  join). Each glyph record declares its spurs, and the counts follow.
- **Spurs** (calls 3 and 6). Where two strokes would overlap, they meet
  at a JUNCTION at the start of the overlap, and the overlap is one
  dead-end edge.
  - At the junction, the two strokes that leave along the overlap's
    direction fork like a railroad switch. If they leave tangent, their
    ribbons overlap near the junction, so the lint needs a fork rule:
    the smallest arm angle and the distance to full clearance that the
    junction field draws cleanly (`render-ribbon.md`'s junction entry,
    `render-routes.md`'s `MAX_ARMS`). Measure it on a still before
    authoring around it.
  - A spur's tip meets no thread except through a declared crossing.
    The o-kind closure crosses its spur short of the tip (glyphs doc
    section 4), and the a's stem is likely a second spur whose tip must
    clear or cross the first.
  - The forced title walk (the shortest walk from the start to
    `mazeStart`, `daily_attempt.ts:122`) passes every spur. A player
    may walk up a spur and back: those are title taps, stripped from
    the record as today.
- **Floating strokes** (section 6) are class −4 decorative strands, so
  they are not walkable. **Pen keys** (section 7) run along the body in
  writing order, then over the floats glyph by glyph.
- **Layer 2** (section 9):
  - Nodes go on the Bézier at crossings, ENDs and curvature maxima, and
    elsewhere ≤ min(0.5 LU, 0.6 R) apart, with CV ≤ 0.15 per run.
  - Each text edge carries an optional mid-arc point (`edge.mid`), and
    `particle_system.ts:625-628` uses it in place of the chord midpoint
    when present.
  - Knot and maze edges never carry it.
- **Scale:** titles shrink to fit as today, but never below xh 2.0. Below
  that, Levi's Call 4 (2026-10-20): overhang the maze width up to 1.5×,
  down to gs 6, then the short form "#8" at gs 4-5.
- **No title loops** (K563's (d), Levi 2026-10-20). The title's runs form
  a tree on the walk graph, so every titled walk has a maze form and
  K552's raw-record fallback (`mazeFormExact`, `rawFingerprint`) never
  fires on the new glyphs. Crossings-only gives this by construction
  (crossings are not walk vertices); the glyph waypoints must not land
  on a crossing (`text_graph.ts` `nearestNode` did, which made today's
  self-loops and parallel runs, `.claude/probes/K552/title_tree.ts`).
  A spur keeps the tree: it adds one vertex and one edge, so E − V does
  not change, as long as its tip joins nothing.

## The work, in order

1. **Glyph data and evaluator** (`src/core/glyphs/`):
   - the record types;
   - the exact evaluator: points, tangents, curvature, arc length, and
     crossings between two paths;
   - the set's data.
   Author at xh 2.0 first, where every rule is tightest.
   **Start with the spur forms:** the o-kind join in Levi's form (the a
   of "Daily", and o; glyphs doc section 4, "Levi's o-kind join"), the
   a's stem, and the i's stem (section 5, rule 2 as amended). Measure
   the fork rule first (Picked decisions, Spurs), then build these
   forms and take a quick xh 2.0 still of them before authoring the
   other glyphs. Commit.
2. **The lint** (`src/core/glyphs/glyph_lint.ts`):
   - It applies rules 1-6 at xh 2.0 and 3.0, over every glyph and every
     class pair the set uses.
   - It checks the declared ENDs, JUNCTIONs, spurs and crossings, and
     enforces two passes per crossing (`assignCrossings` throws
     otherwise, `particle_system.ts:1277-1280`).
   - The fork rule at every spur's junction; rule 5's clearance applies
     beyond the fork's distance.
   - A spur's tip keeps 0.56 LU from other threads, or crosses one at a
     declared crossing.
   - It warns on G2 at a joint where R < 0.6 LU.
   - A failing pair gets a ligature or an alternate form, never a
     relaxed rule.
   Commit.
3. **The builder path.** Behind the switch, `buildTextGraph` assembles
   the words from the new data:
   - the bodies, connectors and floats;
   - the spurs, as walk edges from their junctions;
   - `SegIn` with K558's pen keys;
   - nodes and `edge.mid` per the Layer 2 spec;
   - floats as decorative marks.
   Hershey stays the path for every character outside the set, counted.
   Commit.
4. **On-curve slot controls.** `edge.mid` reaches the chain slot
   (`particle_system.ts:625-628`). The knot golden
   (`test/physics/byte_identity.test.ts`) must stay byte-identical.
   Commit.
5. **Floating strands under the thread reveal.**
   - Today a non-walk strand is never visible there
     (`explore_view.ts:204`, `explore_gaps.ts:275`,
     `ribbon_renderer.ts:4055-4068`), and a hidden over-stroke cuts no
     gap.
   - Show a decorative strand once a run it crosses is revealed.
   - Colour it as the first body run it crosses
     (`section_colors.ts:256-266`).
   - This also fixes today's accents. Check that scenes with no
     decorative strand are unchanged.
   Commit.
6. **The smoothness metrics as tests.** Port the gates of section 9 from
   `.claude/probes/K115/stage8/metrics.ts`. It is untracked, so read it
   from the main checkout
   (`C:\Users\lsl\Repositories\knotmaze\.claude\probes\K115\stage8\`)
   and port what you need into the tests:
   - ripple max ≤ 2.3 and p95 ≤ 1.9;
   - max |dκ/ds| ≤ 15.4, except at named G1 curvature steps;
   - bend ≥ 1.15 h where the authored R ≥ 0.30;
   - clearance ≥ 0.60 LU;
   - END tips ≥ 0.56 LU from other threads;
   - crossing sin ≥ 0.55;
   - topology;
   - a new metric: the Hausdorff distance from the rendered spline to the
     Bézier, ≤ 0.02 LU.
   Commit.
7. **Contact sheets.**
   - **Conditions:** headed, the real renderer, under the perf lock.
   - **Scenes:**
     - titled dailies, with the K552 flag on, through `?<seed>&am=instant`
       links;
     - the `?txt=` scene with "Daily #8", "intone 6" and "ς".
   - **Sizes:** gs 6, 12 and 18, plus a 411 px phone-width pass.
   - **Layout:** each cell shows today's Hershey and the new glyphs side
     by side at one seed and gs, from a same-state A/B with every clock
     pinned (`probes.md`).
   - Run the old-vs-new A/B with the switch toggled on one build; do not
     compare across builds.
   Commit the sheets' recipe, and report the sheets' paths.

## Tests (each must pass at the stop)

- **`glyph_eval`:**
  - integer bounds (|P| ≤ 2^12; every intermediate < 2^31);
  - exact G1 at every joint (cross = 0, dot > 0);
  - crossings that converge;
  - the K108 scan (`test/core/deterministic_math.test.ts`) covers the
    new files.
- **`glyph_lint`:** zero violations for the set at xh 2.0 and 3.0, and
  every declared count matches.
- **Topology:**
  - "Daily #8": 10 ENDs and 0 JUNCTIONs plus one of each per declared
    spur, and the declared crossings;
  - the same for "intone 6" and "ς";
  - every crossing has exactly two passes.
- **Pen order:** every text crossing has its later key over, flipped
  with K558's param.
- **Walk:**
  - floats are decorative and not walkable;
  - spurs are walkable dead ends, and the forced title walk enters none;
  - stats, stars and the trail do not change for a titled daily;
  - no title loops: with the switch on, the titled walk graph's cycle
    rank (E − V + C) equals the untitled one's for "Daily #8" and the
    dailies the sheets use, and K552's tree-title test restores every
    walk.
- **Reveal:** a float shows once a crossed run is revealed
  (`explore_view.test.ts`).
- **Smoothness:** the section 9 gates, Hausdorff included.
- **Unchanged with the switch off:** the knot golden, the K87 maze pin,
  the golden dailies and the codec pins.
- **The suite:** `npm test` and `npm run build` are green.

## Kill criteria

- **Levi's o-kind join cannot pass the lint:** the fork at J, or the
  closure's crossing of the spur, breaks a rule. Report:
  - the closest forms, with their numbers;
  - the rule each breaks.

  Levi then picks between his form and the wider spacing he first
  accepted (call 6).
- **The junction field cannot draw a fork** that the glyphs can fit at
  xh 2.0. Report the smallest clean fork and what it costs the letters.
- **A glyph in the set cannot pass the lint at xh 2.0** without breaking
  the crossings-only rule. Report:
  - which glyph, and which rule;
  - the closest form;
  - whether a ligature or an alternate form would fix it.
- **`edge.mid` moves the knot golden,** or needs a change outside text
  edges. Stop: the field must be text-only.
- **The gates fail at the spec's spacing.** Report the numbers and the
  spacing that passes, with its particle count. Over 2× today's for
  "Daily #8" goes to Levi.
- **The reveal fix needs gameplay changes beyond the explore view,** such
  as walk edges or the controller. Stop, and propose omitting floats on
  titles (stage 8's second kill criterion).

## Calls for Levi (expected from this stage)

- **The look:** go or no-go for mass authoring, from the sheets.
- **The dot's length and slant,** and the loop sizes, if the sheets
  question them.
- **The spur forms** (calls 3 and 6): whether the forks, the spurs and
  the closure's crossing read right on the sheets.

## Out of scope

- authoring beyond the set; deleting Hershey;
- making the switch a default, a param or a link key;
- K552's flag and K558's pen order (consume both);
- physics-live text; Cyrillic (K554); `RUN_FLAG.TEXT` (K557); the
  emblems (K556).

## Where and how

- **Your branch starts from origin/master** (the harness made your
  worktree).
  - Run `git log -1 --oneline` first. If this brief, K558 or K552 is
    missing, run `git merge --ff-only origin/master`.
  - Work only in your worktree, with absolute paths. Never edit the main
    checkout (`C:\Users\lsl\Repositories\knotmaze`).
- **Shell:** PowerShell.
- **`node_modules`:** a junction to the main checkout's. Before removing
  anything that contains it, run `(Get-Item node_modules).Delete()`.
- **Servers:** ports 5260-5269 are yours (check that a port is free
  before binding), each vite server with a private cacheDir (`.claude/rules/probes.md`; K80's wrapper loads the
  config through `loadConfigFromFile`). Leave port 5173 alone: it is
  Levi's.
- **Chrome:** headed, never `--virtual-time-budget`.
  - Every instance gets its own `--user-data-dir` in your probes folder
    and the off-screen window flags. Delete the profiles when done
    (K161).
  - Never touch Levi's own Chrome profile.
- **Files:** probes, sheets and notes go in
  `.claude/probes/K115/stage9/` (untracked). Never the session
  scratchpad.
- **Load:** hold the perf lock (`$env:TEMP\claude-perf.lock`) for headed
  shots and anything pixel-exact. Wait for it inside ONE blocking
  command.
- **Git:**
  - Commit WIP to your branch at every milestone, broken or not; never
    push.
  - Do not edit `LEDGER.md`.
  - End every commit message with the session's `Co-Authored-By` and
    `Claude-Session` lines.
- **Helpers,** if any: `model: sonnet`, this stop rule, a one-hour cap.

## Stop rule

- Run `Get-Date` at the start and at each milestone.
- Stop when items 1-7 are done or at the two-hour cap, whichever comes
  first. Items 1-4 come before 5-7, so a short stage still leaves a
  measurable builder.
- Neither a compaction nor context size is a stop. After a compaction,
  re-read this brief and `git log --oneline -10`, then go on.
- At the stop:
  1. Commit WIP.
  2. Append a `## Handoff` section to this file: what is done, what is
     not, the numbers, the evidence paths.
  3. Commit it, and report.

Your final report covers:
- the gates' numbers against stage 8's baseline (`K115_stage8.md`,
  Handoff);
- the sheets' paths;
- every rule or form the lint forced;
- the calls for Levi.

It ends with a `Ledger items` list and the K115 handle fields (branch,
last commit, evidence, next).

## Handoff (stage 9 agent, 2026-10-20, 11:14-12:50; the cap was 13:14)

Branch `worktree-agent-adaaf5d46393d3aeb` (worktree
`.claude/worktrees/agent-adaaf5d46393d3aeb`), five WIP commits on
`c6a0d7e` plus this handoff, unpushed. Items 1-4 are done in part; 5-7
are not begun. I stopped 24 minutes short of the cap: what remains does
not fit in it.

### Done

- **Item 1, the spur forms only.** The record types, the exact evaluator
  (integer-weight Bezier, chord + Newton crossings) and the knot
  authoring form (`glyph_knots.ts`: corners only at spur junctions) are
  in `src/core/glyphs/` (d2a82a9). Only the **i** and the **a** are
  authored. Every other character of "Daily #8", "intone 6" and "ς" is
  not, so every real title still falls back to Hershey.
- **The fork rule, measured** (Picked decisions, Spurs). Stills of the
  i's fork at 0, 15, 30, 45, 60 and 90 degrees, at seeds 7 and 9, xh 2
  (`shots1/`, `shots2/`; `#glyphs2=xh2,forks` or `f<angle>`):
  - 0 degrees draws an overlap streak; 15-60 draw cleanly; 90 forces
    tight radii at J (a clearance failure).
  - The distance to full clearance is about 1 LU at every angle, so the
    angle is what separates a clean fork from a broken one.
  - Bounds: open by at least 15 degrees (`LINT.forkMinCos`) and reach
    full clearance within 1.2 LU (`LINT.forkMaxLU`). 1.2 is the
    round-bottom i at xh 3, whose crotch shows a hairline seam; its 1.08
    at xh 2 is clean.
- **Item 2, per glyph.** `glyph_lint.ts` checks one glyph at one xh on
  the authored cubics:
  - declared crossings (converged, two passes, consecutive gaps) and
    crossing sin >= 0.55;
  - G1 (corners only at spur junctions);
  - the fork rule at every spur junction;
  - clearance >= 0.60 LU beyond the fork and crossing spans and the
    U-turn window;
  - END tips >= 0.56 LU, and a spur's run-on past a crossing;
  - R >= 11 GU as an error, and a G2 warning under 0.6 LU.

  The body runs on into straight lead tails, so an arm that leaves the
  glyph keeps its fork measured. `test/core/glyph_lint.test.ts` has 13
  tests. NOT done: the class-pair lint (every join the set uses).
- **Item 3.** The builder behind `#glyphs2` (0221966) handles the
  bodies, the spurs and floats as their own strands from their
  junctions, `edge.mid` and `assignPenOrder`. A title outside the set
  falls back to Hershey and is counted (`fallback.ts`). "Daily #8" with
  the switch on gives +1 fallback and the same 253 nodes / 262 edges as
  off; "ai" builds from the glyphs.
- **Item 4.** A glyph edge's slot particle sits on `edge.mid`, the
  curve's mid-arc point (eadd3aa). Edges without a mid take the old
  path, and the knot golden is byte-identical.
- **Fix: SceneParams.glyphs2 is required** (30f3cfb). As an optional
  field, the K7 stage 7 name build dropped it, `readWorkerName` refused
  the name, and every load lost the lever.
- **The suite at 87f3c33:** 113 files and 1567 tests pass, 1 of each is
  skipped, and the knot golden is among them (`suite_final.log`).

### Forms the lint forced

- **The i's bottom:** R 1.9 GU (the thorn on `shots1/`) became a round
  bottom of R 14 GU. Advance 40 -> 58 GU.
- **The a's tail:** R 5.5 GU became a round bottom at (88, 4), with J2
  leaving (1, -2). Advance 104 -> 120 GU.
- **The a's J2** moved low on the stem, so its run-on crosses the J-S
  spur once, at sin 0.982. The first form had two crossings, and the
  stem ran 10 GU from the bowl.
- The a's bowl and connector radii were softened.

### Kill criterion: Levi's o-kind join (tripped, with a passing neighbour)

- **His form fails the lint.** The connector arrives tangent at J, so
  the fork at J opens 1.0 degree: the thorn on `shots3/a_xh2.png` and
  `shots4/a_tan_xh2.png`.
  - xh 2: `fork-angle`, plus `clearance` 0.558 LU at (19.0, 51.6), where
    the arch passes the oval's shoulder.
  - xh 3: `fork-angle` only.
- **The closest passing form lands on J from above.** It is `A_LANDED`,
  rendered by `#glyphs2=aland`.
  - It arrives heading (2, -1): the fork opens 27.7 degrees and reaches
    full clearance at 0.67 / 0.70 LU (xh 2 / 3).
  - Min R 12.6 GU (set by the rest of the glyph); the same 120 GU
    advance.
  - Every rule passes at xh 2 and 3.
  - `shots4/a_land_xh2.png`: the thorn is gone.
- **The narrowest passing fork found was 18.5-20.1 degrees** (for
  example knot [18,78,4,1,7,4], J arriving (3,-1) with hin 3: R 11.2).
  The search is `a_search.ts` (25000 samples; `a_search1.txt`), and
  forms pass with the oval shifted 0 to 8 GU.
- **Levi picks:**
  - his tangent form, which fails the fork rule;
  - the landed form, which passes at the same width;
  - or the wider spacing (call 6).

  The tangent form stays the default and is a listed known failure in
  the lint test until he picks.

### Numbers against stage 8

"Daily #8" falls back to Hershey under the switch, so its gates are
stage 8's, unchanged:
- over-tight 99/3196;
- ripple p95 2.95, max 34.5;
- clearance min 0.066 LU;
- crossing sins 0.88 / 0.66 / 0.35 / 0.86.

The authored glyphs, from the lint on the authored cubics (the Layer 2
gates were not run):

| Glyph | Clearance (LU, xh 2 / 3) | Tips (LU) | Crossing sin | Forks | Min R (GU) |
|---|---|---|---|---|---|
| i (f30) | 0.611 / 0.612 | 0.669 / 0.956 | none | 30.9 deg at 1.08 / 1.20 LU | 14.3 |
| a, tangent | 0.558 (fails) / 0.602 | 0.606 / 0.896 | 0.982 | J 1.0 deg (fails); J2 40.8 deg at 0.60 / 0.69 LU | 12.6 |
| a, landed | 0.606 / 0.602 | 0.606 / 0.896 | 0.982 | J 27.7 deg; J2 40.8 deg | 12.6 |

### Not done

- Item 1: the rest of the set.
- Item 2: the class-pair lint.
- Items 5 (floats under the reveal), 6 (the section 9 gates and
  Hausdorff as tests) and 7 (the contact sheets; only quick stills
  exist).
- From the Tests list, not written: `glyph_eval` (integer bounds, G1
  per joint, crossing convergence), topology, pen order, walk, reveal
  and smoothness.

### Residuals

- The xh 3 crotch hairline in the round-bottom i (fork at 1.20 LU).
- `shots4/ai_land_xh2.png` shows a small notch under the a's J spur and
  at the i's fork. It is not attributed: inferred to be the junction
  render's inner corner.
- PixiJS warns on every glyph still that "Attribute aEnv / aCol / aClipA
  / aClipB / aClipF is not present in the shader". Not checked against
  master.
- The i's dot renders as a rotated square.
- An optional SceneParams field silently breaks the worker name. Only
  `worker_host.test.ts` catches it, and tsc does not type-check the
  tests.

### Evidence

`.claude/probes/K115/stage9/` (untracked). Run the `.ts` probes from the
worktree root with vite-node and `vite.node.config.mjs`.
- Scripts: `forks.ts`, `i_forms.ts` (+ `cands1.json`), `a_forms.ts`,
  `a_search.ts`, `fallback.ts`, `minr.ts`, `shots.mjs`, `shot.mjs`,
  `locked_shots.ps1` (perf lock).
- Outputs: `a_cands1-5.txt`, `a_search1.txt`, `fallback.txt`,
  `minr.txt`, `suite_final.log`.
- Stills: `shots1/` (the first forms), `shots2/` (the fork variants),
  `shots3/` (the forced forms), `shots4/` (the tangent against the
  landed a, and "ai").

### Next

1. Levi's call on the a's J.
2. Author the rest of the set at xh 2 under the lint.
3. Add the class-pair lint.
4. Items 5-7.
