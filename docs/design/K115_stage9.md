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
- **Levi's calls** (glyphs doc section 11; answered 2026-10-20 except
  call 3). Build what he picked:
  - a pill dot (call 1);
  - floating strokes not walkable, for now (call 2; K569 is the
    follow-up that makes some of them threads, out of scope here);
  - a looped hand (call 3, still open: build the recommendation and say
    so in the report);
  - floor 2.0 LU, with call 4's fit below it;
  - Hershey kept as the fallback (call 5).

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
- **Crossings only** (section 5, rules 1-6). The set's targets are the
  table in section 5: "Daily #8" has 10 ENDs, 0 JUNCTIONs and the
  declared crossings.
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

## The work, in order

1. **Glyph data and evaluator** (`src/core/glyphs/`):
   - the record types;
   - the exact evaluator: points, tangents, curvature, arc length, and
     crossings between two paths;
   - the set's data.
   Author at xh 2.0 first, where every rule is tightest.
   **Start with the o-kind join** (the a of "Daily", and o). Stage 8
   found that section 4's generic connector cuts the oval (glyphs doc
   section 4, "The o-kind join is still open"). Settle it, in the order
   that section gives, before authoring the other glyphs. Commit.
2. **The lint** (`src/core/glyphs/glyph_lint.ts`):
   - It applies rules 1-6 at xh 2.0 and 3.0, over every glyph and every
     class pair the set uses.
   - It checks the declared ENDs and crossings, and enforces two passes
     per crossing (`assignCrossings` throws otherwise,
     `particle_system.ts:1277-1280`).
   - It warns on G2 at a joint where R < 0.6 LU.
   - A failing pair gets a ligature or an alternate form, never a
     relaxed rule.
   Commit.
3. **The builder path.** Behind the switch, `buildTextGraph` assembles
   the words from the new data:
   - the bodies, connectors and floats;
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
   `.claude/probes/K115/stage8/metrics.ts` (the coordinator copies it
   into the repo at the stage 8 merge; until then, read it from the
   stage 8 branch):
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
  - "Daily #8": 0 JUNCTIONs, 10 ENDs and the declared crossings;
  - the same for "intone 6" and "ς";
  - every crossing has exactly two passes.
- **Pen order:** every text crossing has its later key over, flipped
  with K558's param.
- **Walk:**
  - floats are decorative and not walkable;
  - the forced title walk is unchanged;
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

- **The o-kind join cannot pass the lint** without a crossing through
  the oval. Report:
  - the closest forms, with their spacing;
  - each form's crossings.

  Levi then makes the glyphs doc's Call 6.
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
- **The looped hand** (Call 3), if Levi has not answered by the sheets.
- **The o-kind join:** Call 6 is answered (wider spacing); report the
  spacing it needed if its kill criterion trips.

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
- **Servers:** the coordinator's port range, each vite server with a
  private cacheDir (`.claude/rules/probes.md`; K80's wrapper loads the
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
