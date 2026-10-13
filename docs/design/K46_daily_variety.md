# K46: daily variety (a proposal for DAILY_V2)

Status: a proposal for Levi to iterate on (2026-10-12). Nothing in `src/`
changes until it is agreed; the implementation (`DAILY_V2`) follows. Brief:
`docs/design/K46.md`. Evidence: `.claude/probes/K46/` (scripts, scan
outputs, screenshots; section 6 says how to rerun them).

## Recommendation

- **A weekly arc.** Monday is small and quick and the week grows to a big
  Saturday. Wednesday bends the structure, Thursday changes how you play,
  Sunday is a shape. The route (lattice units) and decision medians come
  from a simulated year; V1's are 86 and 18 on every day:

  | Day | Theme | Maze | Route | Decisions |
  |---|---|---|---|---|
  | Mon | warm-up | rect 14 | 69 | 14 |
  | Tue | classic | rect 16 | 74 | 16 |
  | Wed | twist, a 5-week rotation | rect 16 with dead ends, side doors, long halls, dense weave or busy junctions | 75 (65-96 by twist) | 15 |
  | Thu | modifier, a 3-week rotation | rect 16 with fog, the Ariadne thread or the memory trail | 78 | 17 |
  | Fri | classic | rect 18 (today's size) | 83 | 17 |
  | Sat | grand | rect 20 | 93 | 21 |
  | Sun | shape, a 5-week rotation | heart 22, star 24, fish 22, tree 22 or ring 20 | 82 | 15 |

- **The look changes every day**, inside measured legibility windows:
  palette, hue and gamut arc, color scheme, background, intro, thread
  width, gap, cusp radius and junction blend. Palettes, backgrounds and
  intros are dealt from shuffled decks, so every week gets a balanced
  palette mix and no background or intro repeats on consecutive days; the
  hue walks the golden ratio.
- **Fixed every day:** physics, `moveSpeed` (it is part of the time stat),
  sound, pluck and tug feel, flow, pulse spacing, the gold path, the camera.
- **Deterministic from the day number alone.** Each day tries candidate
  seeds in a fixed order and keeps the first whose maze passes its
  weekday's bands: route length, decisions on the route, and not solvable
  by just heading for the exit. In a simulated year 320 of 365 days took
  the first candidate, 40 the second, 5 the third, and none ran out.
- **Lighter than V1 on average.** The average day carries 2711 particles
  against V1's 3243, and its physics costs 0.83-0.89 of V1's per substep.
  Monday costs about 0.6, Saturday 1.2-1.3 (with its thread width capped
  at V1's).
- **Shapes need a physics check.** Star, tree and fish fail to sleep on
  3-7% of seeds. In the simulated year one Sunday in 52, and no rect day,
  never slept. An offline check skips such candidates before their day
  goes live.
- V2 starts on a future `fromDay`; every day before it keeps DAILY_V1.

The 14-day sample calendar and its contact sheet are in section 7, the
open questions in section 8.

## 1. Where DAILY_V1 stands

DAILY_V1 is codec v3's defaults on a seed per day: rect 18x18, weave 0.35,
segments colors on the pastel palette (arc 130), the vellum background, a
trace + burn intro, thread width 0.52. The hue already changes daily,
because the effective hue is `seed % 360 + hueShift`.

Over 150 seeds (maze) and 20 with physics:

| | V1 |
|---|---|
| Optimal route | 85.7 lattice units (p10-p90: 73.5-98.5) |
| Decisions on the route | 18 (13-23) |
| Junctions | 197 (189-205) |
| Generation (lattice, plan, walk graph) | 247 ms (desktop, one process) |
| Particles | 3243 |
| Physics per substep | 13.1 ms (Node, one process): 11 s of CPU to sleep |
| Asleep at | sim 7.0 s, every run, when frames are 0.1 s or longer |
| Motion under the gate's threshold from | sim 0.59 s (0.53-0.87) |

**The design does not set the sleep time; the gate does.** With frames
of 0.1 s or longer, the regime gs 18 runs in on both the desktop and the
phone, 399 of scan B's 400 rect runs fell asleep at exactly sim 7.0 s
(one at 8.8 s), and so did 312 of the simulated year's 313 rect days (one
at 7.1 s): `settleComplete` comes at 2.5 s, then 45 still frames of 0.1 s
each. At 60 fps the same knots sleep at 3.25 s. The motion itself is
under the gate's threshold by about 0.6 s (90% of rect runs by 1.0 s).
So the time a day spends burning CPU before it sleeps is proportional to
its cost per substep, which grows with its particle count and its thread
width. That makes `gridSize` the daily's main K16 lever.

A K16 side note, outside this proposal: counting the 45 quiet frames in
sim time (0.75 s) rather than frames would put slow devices to sleep at
about sim 3.3 s instead of 7.0, on every design.

## 2. The dimensions

### 2.1 Structure (the maze itself)

| Param | V2 | Why (measured at gs 18 unless noted) |
|---|---|---|
| `gridSize` | by weekday: 14, 16, 16, 16, 18, 20; shapes 20-24 | The size and difficulty lever. Route 67.5, 74.1, 85.7, 94.0 and decisions 14, 16, 18, 19 at gs 14, 16, 18, 20. Particles 1953, 2561, 3243, 4007. Generation time doubles every two cells: 59, 135, 247, 480 ms (897 at 22, 1491 at 24). Rect stops at 20. |
| `shape` | Sundays only, rotating | Shapes have fewer junctions at the same size (heart 22: 147, star 24: 142, ring 20: 123; rect 18: 197), so they run at 20-24 to reach a Friday-sized route. |
| `startAnchor`, `exitAnchor` | rect days: one of the four diagonals; Wednesday side doors: mid-edges; shapes: their natural pairs | A mirrored diagonal is statistically the same maze (route 83.7 vs 85.7); it moves the start. Mid-edges are shorter (72.0-74.2) but trickier: the head-for-the-exit walk is 3.0-3.4x the route instead of 1.9x. |
| `weaveDensity` | 0.35; Wednesday dense weave 0.55 | Denser weave = shorter route, more junctions, fewer decisions: at 0.2 route 89.9 / 187 junctions / 19 decisions; 0.5: 76.9 / 207 / 15; 0.65: 72.9 / 214 / 13. |
| `junctionSpacing` | 2; Wednesday long halls 3, busy 1.5 | The real density knob. 1.5: route 76.1, 254 junctions, a wrong turn costs 5.1 more; 3: route 106.9, 107 junctions, a wrong turn costs 11.8; 4: 126.7, 75, 18.0. At 1.0 the junction count doubles (545) and generation takes 2 s: excluded. |
| `deadEnds` | Wednesday dead ends, density 0.5 | Same route length (85.1), 4 more junctions, and the HUD's dead-end stat appears. |
| `branchDensity`, `fourWayFraction` | fixed | **Inert at spacing 2.** Branch densities 0.25, 0.50 and 0.70 build the same maze as V1's 0.35 for all 150 seeds (0.15: 144 of 150): the spanning splices already fill every site the spacing floor allows. 4-way fractions 0.25 and 0.40 match V1's 0.12 for all 150 too (0.05: 142), while 0 changes nearly every maze (188 junctions, route 88.1). |
| `turnBias` | fixed | It changes the maze but none of its statistics (route 85.3, 85.7, 84.4 at 0.5, 0.7, 0.85; the same junction count), so it adds nothing a new seed does not. |
| `entranceClearance`, `exitClearance` | fixed | Small effect: route 82.7 at 0/0, 87.1 at 5/8. |

### 2.2 Look

| Param | V2 | Why |
|---|---|---|
| `palette` | a weekly deck: pastel x2, moss x2, jewel, ember, ink | Balanced each week. A palette falls on two days running 25 times a year (pastel and moss come twice a week), never three. |
| `gamutArc` | pastel 90/130/180; moss 60/90; jewel and ember 60/90; ink 130/240 | Saturated palettes are legible only with narrow arcs (3.3). |
| hue (`hueShift`) | a golden-ratio walk through the palette's legal hue window | The walk steps 0.38 of the window a day, so when a palette repeats on the next day its hue moves at least 100 degrees (median 137). `hueShift = hue - seed % 360`, so a reroll keeps the hue. |
| `colorScheme` | segments, strands, noise on every day; depth on Mon-Wed; mono on Fri-Sat | Depth is a gentle distance-from-start cue; mono takes the color cues away. Never mono on a modifier day. |
| `threadWidth` | 0.44-0.58; Fri and Sat 0.44-0.52 | Width costs physics (3.2), so the two biggest rect days stay at or under V1's 0.52. |
| `gap` | 0.04-0.10 | Render only. |
| `cuspRadius` | 1.5-4.5 | Render only: tight joints to cast-metal webs. |
| `junctionBlend` | 0.4-1.6 | Render only (segments and strands). |
| `background` | a deck of the six effects | Each effect once every six days, never twice running. K52's default question then only concerns ordinary links. |
| `backgroundIntensity` | 0.40-0.60 | Around K21's 0.5. |
| `appearMode` (intro) | a deck of the five presets; Fri and Sat play theirs 1.4x faster (at most the slider's 4) | ink + dust, trace + burn, trace + rainbow, trace + roots, bloom + comet. They last 3-10 s on this desktop (V1's own intro: 10.9 s). A reveal advances with the settle's slow frames, so big days stretch it: even 1.4x faster, trace + roots took 12-15 s on the two Saturdays. |
| `fadeLength`, `pathColor`, `pulseSpacing` | fixed | The legibility rules assume the gold path; pulse spacing is how choices read. |
| `flowStrength`, `flowSpeed` | fixed | Flow at rest halves the phone's frame rate (K10). |

### 2.3 Play modifiers

| Modifier | V2 | Notes |
|---|---|---|
| fog of war | Thursdays, one week in three | `fowRadius` 4; `fowIntro` on (question 4). |
| Ariadne thread (`pathViz` string) | Thursdays, one week in three | Same rules as gold; a different way to see your path. |
| memory trail (`pathViz` trail) | Thursdays, one week in three | Changes the rules: no backtracking, only the last 5 units of path stay lit (question 4). |
| dead ends | a Wednesday twist | Structural; see 2.1. |
| `cameraMode` | never | K56 makes the camera a player preference that does not leave the daily. |

### 2.4 Fixed, and why

- `moveSpeed`: the traversal animation is inside the time stat, so every
  day must use the same speed.
- The K56 exempt set (`DAILY_EXEMPT_KEYS`: the Sound folder,
  `cameraMode`, Touch & feel, physics on/off): these are the player's
  stored preferences, and every daily opens with them, so whatever a day
  set there would be overridden anyway.
- Physics tuning (`slack`, `drag`, `repulsion`, `bend`, `smooth`,
  `stiffness`, `gridAlign`, `simSpeed`): part of the design, but the sleep
  behavior is tuned around these values (KINK EYES, K41), K11 lives in
  `gridAlign`, and they change the feel more than the look.

## 3. Constraints from known problems

### 3.1 K16: the slow settle

Since K56 the daily is the front door, so its settle is the first thing
every visit pays. Per weekday: particles are the year's medians; physics
per substep is relative to V1, measured in one process for the calendar's
two days of each weekday and, in parentheses, over the whole year with
ten jobs in parallel; the browser times are the calendar days themselves
(section 7):

| Day | Maze | Particles | Physics vs V1 | Generation | Desktop: asleep after | Phone proxy: asleep after |
|---|---|---|---|---|---|---|
| V1 | rect 18 | 3243 | 1.00 (13.1 ms) | 247 ms | 14.7 s | 68 s |
| Mon | rect 14 | 1955 | 0.63 (0.62) | 59 ms | 5.4 s, 9.2 s | 39 s |
| Tue | rect 16 | 2559 | 0.86 (0.79) | 135 ms | 10.8 s, 10.8 s | |
| Wed | rect 16, twist | 2570 | 0.84 (0.81) | 135 ms | 9.3 s, 10.7 s | |
| Thu | rect 16, modifier | 2561 | 0.78 (0.80) | 135 ms | 11.2 s, 9.3 s | 61 s |
| Fri | rect 18 | 3238 | 0.95 (0.92) | 247 ms | 12.5 s, 15.3 s | |
| Sat | rect 20 | 4007 | 1.31 (1.19) | 480 ms | 14.7 s, 14.8 s | 81 s |
| Sun | shapes 20-24 | 2116 | 0.88 (0.70) | 28-123 ms | 10.3 s, 10.8 s | 50 s (the star) |

- Desktop = headed Chrome in real time at 900x900, under the perf lock;
  each figure is one run, and same-size days differ by up to 25%
  (Fridays: 12.5 and 15.3 s). Phone proxy = 412x915 at
  2.625x with the CPU throttled 4x. The proxy is about five times slower
  than Levi's Pixel 11 (K16: 14 s for V1), so read it as ratios: Monday
  0.57 of V1, Thursday 0.90, the star Sunday 0.74, Saturday 1.19, i.e.
  roughly 8 s, 13 s, 10 s and 17 s on the phone.
- Sleep comes at sim 7.0 s on every rect day (313 of 313 slept, the
  latest at 7.1 s), so wall time follows the physics column. The one
  early sleeper (#8, 5.0 s) ran faster than 10 fps, where the 45-frame
  gate spans less sim time.
- The week averages 0.83-0.89 of V1's physics; only Saturday is heavier
  (1.19-1.31), and its thread width is capped at V1's so it goes no
  further.
- Generation grows much faster than physics with size: 27, 59, 135, 247,
  480, 897 and 1491 ms at gs 12 to 24 (desktop, one process), about
  doubling every two cells. That, more than physics, is why rect days
  stop at 20. The shapes' generation is cheap (28-123 ms).

### 3.2 K29 and K30: wide threads

Thread width changes the physics cost per substep (gs 18, 20 seeds each;
every run slept at 7.0):

| `threadWidth` | 0.42 | 0.47 | 0.52 (V1) | 0.58 | 0.64 |
|---|---|---|---|---|---|
| ms per substep (10 jobs in parallel) | 12.9 | 14.7 | 16.1 | 20.1 | 23.6 |
| vs V1 | 0.80 | 0.91 | 1.00 | 1.25 | 1.47 |

All widths up to 0.64 slept here, but 0.64 is where K29's boxed kinks
rest small and K30 starts at 0.72. V2 stops at 0.58, and only on days
with at most V1's particle count.

### 3.3 Legibility: palette, hue and arc

Two rules, checked for every hue and arc by `hue_windows.mjs` (61
samples along the arc, since depth, strands and noise sweep it
continuously):

- **Path:** every color of the arc stays at least dE_OK 0.06 from the path
  gold (#eccc41). 0.06 is the worst case V1 already shows (pastel, arc
  130).
- **Page:** every color of the arc reaches 3:1 (WCAG) against the page ink
  (#151b28), WCAG 1.4.11's floor for graphics.

| Palette | Worst color vs gold | Darkest color vs page | Legal base hues |
|---|---|---|---|
| pastel (V1) | 0.060 | 4.50 | all, at any arc |
| ink | 0.184 | 4.35 | all, at any arc |
| moss | 0.128 | 2.91 (blue) | arc 60: 277-207; arc 90: 292-192 |
| jewel | 0.046 (yellow) | 2.01 (blue) | arc 60: 94-192, 310-23; arc 90: 109-177, 325-8 |
| ember | 0.023 (yellow) | 2.23 (blue) | arc 60: 95-197, 301-15; arc 90: 110-182, 316-0 |

So ember and jewel days are teal-green or magenta-red, never gold or
blue: an ember yellow is almost the path's own gold, and a jewel blue
nearly vanishes into the page. At arc 130 only about a tenth of hues
pass for them, and none at 180.

### 3.4 Shapes, anchors, K11 and K12

- **Sleep (scan B, 20 seeds per shape and size, gs 20/22/24, nw-se
  anchors):** heart 0 of 60 and ring 0 of 60 failed to sleep within sim
  30 s; fish 2 of 60, star 4 of 60 (two more slept late, at 10.5 and
  12.0 s), tree 4 of 60 (three at gs 24). Rect: 0 of 400 across every rect
  variant scanned. The failures come in two kinds: a loud thrash (motion
  up to about one lattice unit per substep, plainly visible), and
  stragglers or riders that hover at the gate. The star's are not limited
  to K12's e-w anchors.
- **The draft's own Sundays** (52 in the simulated year, with the anchor
  pairs below): 51 slept; one tree (day 28) hovered just above the gate's
  threshold for the whole 30 s, and a heart and a tree slept late (8.8 and
  8.4 s). All 313 rect days slept, the latest at 7.1 s. So shapes cannot
  ship without the offline check in section 5.
- **Sizes:** shapes carry fewer junctions per grid cell. At gs 14-18 their
  medians are 35-103 junctions and 8-16 decisions; the draft runs them at
  20-24 (median routes 81-90, 12-18 decisions), which also keeps the tree
  well inside the size where it reads (16 and up).
- **Anchor pairs** (gs 22; share of seeds that fail the bands, i.e. under
  10 decisions or a greedy walk under 1.1):
  - heart: w-e 7%, nw-se 8%, ne-sw 12% (used); n-s 15%, nw-s 17%.
  - star: nw-se 29% at gs 22 but 12% at 24, so stars run at 24 with nw-se
    or ne-sw; sw-se 55% (a leg to a leg: route 66, 10 decisions); never
    e-w (K12).
  - fish: w-e 8% (nose to tail, used both ways); nw-se 27%; n-s 69% (route
    57, 9 decisions, and the shaped start/exit notes' physics outlier).
  - tree: s-n 8% (roots to crown), sw-ne 7% (used, with se-nw); nw-se
    17%, w-e 23%.
  - ring: every pair 1-5%.
- **K11 (ring and gridAlign):** gridAlign stays at V1's 0.1 every day, far
  from K11's failure band (5e-4 to 1.6e-3, and 1). Rings slept 60 of 60.
- **Shaped start and exit:** shapes cut outer-face edges and route their
  tails out to open space (CLAUDE.md); V2 changes nothing there.

### 3.5 Clashes

- **Fog with the trail:** never on the same day (one modifier a day).
- **Fog and the intro:** with `fowIntro` off the intro plays under the fog
  and nobody sees it; with it on the player previews the whole maze before
  the fog closes in (question 4).
- **Mono colors on a modifier day:** excluded, because no color cues on top
  of fog or a short trail is too much.
- **Dense weave on big grids:** the dense weave only comes at gs 16.
- **Small phones:** at 412 CSS px wide the fit camera shows V1 at 8.8
  CSS px per world unit (half a lattice cell) with 4.6 px threads. Monday
  is roomier (11.2 px, 4.9 px threads), Saturday the tightest (8.0 px, 3.8
  px threads at width 0.48), the gs-24 star 7.6 px with 4.3 px threads.
  So no day is more than about 10% tighter than V1 (whose choices K32
  already calls tight), and the dense weave never comes on a big grid.
  Sheet: `.claude/probes/K46/sheet_phone.png`.
- **Background contrast varies with the palette (K54):** ember roughly
  halves mist's contrast. Fine at intensity 0.4-0.6; K54's fix would even
  it out.

## 4. The rhythm

### A. Weekly arc (recommended)

Monday small, Saturday big, a twist on Wednesday, a modifier on Thursday,
a shape on Sunday; the look varies every day.
- For: difficulty you can plan around (the NYT-crossword idea); the front
  door is lightest early in the week; Wednesday, Thursday and Sunday give
  reasons to come back; the weekly physics load stays under V1's.
- Against: the weekday themes can become routine, and each modifier comes
  round only once every three weeks.

### B. Themed weekdays

Each weekday owns one theme at about V1's size, for example Monday mono,
Tuesday dead ends, Wednesday shape, Thursday fog, Friday thread, Saturday
big, Sunday free.
- For: a strong identity, easy to explain.
- Against: no difficulty ramp; anyone who dislikes fog loses every
  Thursday; five shapes and three modifiers do not fit one weekday each
  without heavy repetition.

### C. Free variety with guard rails

No weekly structure. Each day draws a size tier (small 25%, medium 50%,
large 25%), a shape about one day in seven and a modifier about one in
seven, with spacing rules (no shape or modifier two days running).
- For: the most surprise.
- Against: the difficulty swings feel arbitrary, a big day can land on a
  Monday morning, and nobody can plan around it.

## 5. The selection algorithm

```ts
// Day n (1 = Monday 2026-10-12); everything comes from n.
weekday = (n - 1) % 7;  week = floor((n - 1) / 7)
slot    = RHYTHM[weekday]                         // size, bands, schemes
special = slot.rotation?.[week % slot.rotation.length]  // twist, modifier, shape
look = {
  palette:    deck(PALETTE_WEEK, n),              // 7 cards: one week
  background: deck(BACKGROUNDS, n),               // 6 cards
  intro:      deck(INTROS, n),                    // 5 cards
  hue:        legalWindow(palette, arc).at(frac(n * 0.618 + c)),
  ...fixedOrderDraws(mulberry32(mix32(n ^ LOOK_SALT))),  // arc, scheme, widths
}
for (k = 0; k < 8; k++) {                         // deterministic rerolls
  seed = mix32(n + SEED_SALT + k * 0x10000)
  params = codecDefaults(3) + structure + look + { seed, hueShift: hue - seed % 360 }
  if (!SKIP.has(`${n}:${k}`) && bandsPass(buildMaze(params), slot.bands)) return params
}
return the candidate that missed its bands least
```

- **Decks:** each cycle shuffles its cards with a seed of its own. If a
  new deck would open with the card the last one ended on, its first two
  cards swap. Every card appears once per cycle, and a card never lands on
  two days running; only the palette deck holds duplicates (pastel and
  moss twice), so those two can.
- **Bands** (route in lattice units; decisions on the optimal route;
  greedy = how far a walker that always heads for the exit walks,
  over the optimal route):

  | Day | Route | Decisions | Greedy | Also |
  |---|---|---|---|---|
  | Mon | 52-88 | 9 or more | 1.1 or more | |
  | Tue, Thu | 58-95 | 10 or more | 1.1 or more | |
  | Wed | 50-115 | 8 or more | 1.1 or more | |
  | Fri | 65-110 | 11 or more | 1.1 or more | |
  | Sat | 74-120 | 13 or more | 1.1 or more | |
  | Sun | 60-115 | 10 or more | 1.1 or more | 80 junctions or more |

  On rect days the junction count is fixed by the size to within about 5%,
  so only shapes need a junction floor. The settle budget needs no check
  at load either: every day's cost is set by its slot's size and width
  (3.1), and sleep is checked offline (below).

- **Rerolls are rare.** In a simulated year, 88% of days take candidate 0,
  11% candidate 1, 1.4% candidate 2, and no day exhausts its eight.
  Rerolls add 32 ms per day on average on the desktop (measured while
  other scans ran); on the days that reroll, one more generation costs
  28-480 ms on the desktop (247 ms on a Friday, 480 ms on a Saturday).
- **Engine-independent checks.** Every player must reach the same
  verdict, so the bands compare integers (decisions, junctions) and
  lengths rounded to 0.01, and the greedy walk compares squared distances,
  which are exact on the lattice, with an id tie-break. (`Math.hypot` is
  not guaranteed to round the same way in every engine.)
- **Physics is checked offline, not at load.** Checking sleep at load
  would cost exactly the settle time K16 is about. A script (like
  `.claude/probes/K46/scan.ts`) simulates the next 60 days' chosen
  candidates. A day that does not sleep by sim 10 s (the physics-off
  `LOAD_SIM_CAP`) gets `n:k` appended to a frozen, append-only `SKIP`
  list, only for days more than `DAILY_MAX_AHEAD + 1` ahead, so nobody's
  day ever changes. Run it when V2 ships, whenever physics or generation
  code changes, and monthly (or as a scheduled job). Over the simulated
  year it would have listed one day in 365 (day 28, a tree).
- **Alternative:** precompute every day's candidate index for two years
  (bands and physics) into a 730-character string in the definition. No
  cost at load and no rerolls, but a table to extend before it runs out (a
  test can fail 60 days ahead).
- **Starting V2 without moving past dailies:** append `DAILY_V2` to
  `DAILY_DEFINITIONS` with `fromDay` at least `DAILY_MAX_AHEAD + 1` days
  after the deploy (open tabs cannot learn it); `dailyDefinition(n)`
  still returns V1 for every earlier day. `DailyDefinition` gains a recipe
  form beside V1's static one, and the golden test pins V2's first week
  (all seven slots) by token and maze fingerprint.
- **Implementation notes:** `dailyParams(n)` becomes expensive (it builds
  mazes) and K56's `isDailyDesign` calls it on every param change, so
  memoize it per day and let `main.ts` reuse the validated graph instead
  of generating it twice; links and shares only need `n`. Records already
  store the definition version, and K47's walk-graph fingerprint refuses
  to replay an attempt into a maze that moved, which a `SKIP` entry can
  never do (it only touches days nobody can open yet). The recipe tables
  are frozen literals: any change to them is a `DAILY_V3`.

## 6. Evidence

Every design was built exactly as `main.ts` builds it (codec v3 defaults
plus overrides, then lattice, maze plan, cuts, walk graph), on master as
of e51d2ff (before K47 and K56, which changed no generation or physics
code). Physics ran in Node through `ParticleSystem.step(1/120)`, one
substep per call; substeps are fixed at 1/120 s, so the trajectory is the
browser's for any frame rate, and one run evaluates the sleep gate for
60, 30, 20 and 10 fps frames at once. Each run stops at sleep (10 fps
gate) or at sim 30 s.

| Scan | What | Size |
|---|---|---|
| A | maze only: rect sizes 12-24, weave, turn bias, branch density, 4-way fraction, dead ends, rect anchors, 5 shapes x 6 sizes, 5 shapes x 4-6 anchor pairs x 2 sizes | 105 recipes x 150 seeds = 15,750 designs; all valid, all invariants hold |
| A2 | maze only: junction spacing 1-4, branch density 0-0.05, clearances, weave 0-0.8, sizes 13-21 | 27 x 150 = 4,050; all valid except branch density 0 (98%) |
| B | physics: sizes 12-22, weave, dead ends, 4-way, thread width 0.42-0.64, rect anchors, 5 shapes x 3 sizes | 35 x 20 = 700 runs |
| Year | the draft algorithm over days 2-366: candidates, bands, look mix; then physics for every chosen day | 365 days; 365 physics runs (Fri/Sat rerun with the width cap) |
| Calibration | one process, under the perf lock: physics cost of V1 days 1-3 and the calendar's days 2-15; generation time of 12 sizes and shapes | 17 physics runs, 60 builds |
| Browser | headed, off-screen Chrome in real time: the calendar (900x900), the phone width (412x915 at 2.625x, with and without a 4x CPU throttle), the intros, the path-legibility A/B, the fog-lifted day | 15 + 10 + 19 + 5 + 1 loads |

Numbers marked "10 jobs in parallel" were taken while other agents also
ran (scans, test suites); use them as ratios, not absolute times.

Reproduce, from `.claude/probes/K46/` (a checkout with `node_modules`):
- `node mkjobs.mjs <spec.json> <jobs.json>`, then
  `.\run_scan.ps1 -Jobs <jobs.json> -Out <scan.jsonl> -Parallel 6`, then
  `node analyze.mjs <scan.jsonl>` (specs and outputs are in `out/`).
- `vite-node sim_v2.ts 2 366 <sim.jsonl> <jobs.json>` runs the draft
  (`v2_draft.ts`) over a year; `node year.mjs <sim.jsonl>` and
  `node phys_year.mjs <phys.jsonl>` summarize.
- `node hue_windows.mjs 0.06 3 61` prints the legibility windows.
- `.\measure.ps1` (takes the perf lock) reruns the calibration, the
  calendar shots, the phone proxy and the intro timing against a preview
  build on port 5246; `node sheet.mjs` assembles the contact sheet.

## 7. Sample calendar

The next 14 days (#2-#15, Tuesday 2026-10-13 to Monday 2026-10-26) as the
draft (`.claude/probes/K46/v2_draft.ts`) deals them if V2 started
tomorrow, beside today's V1 daily (#1). Captures: headed, off-screen
Chrome in real time, 900x900 CSS px, `?<token>&am=instant&snd=none`,
taken after the sleep gate with the HUD and menu hidden; the times come
from those runs, under the perf lock.

- **Contact sheet:** `.claude/probes/K46/sheet_calendar.png` (weekday
  columns; the extra tile is #4's maze with the fog lifted).
- **Phone width:** `.claude/probes/K46/sheet_phone.png` (412x915).
- **Path legibility:** `.claude/probes/K46/sheet_path_legibility.png`:
  #2's maze, 12 moves in on the gold route, in five palettes and hues:
  the draft's ember teal, ember and jewel at hue 48 (the path vanishes),
  pastel at hue 48 (V1's worst case, the floor), and ember blue (it
  reads, but under 3:1 against the page).

| # | Date | Day | Theme | Maze | Route / decisions / junctions | Look | Intro (wall) | Particles, ms/substep | Asleep (sim / wall) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 10-12 | Mon | today (V1) | rect 18, nw-se | 86 / 23 / 198 | pastel segments, hue 271 arc 130, vellum 0.5, tw 0.52 gap 0.04 cusp 3 blend 0.88 | trace+burn 2.2 (10.9 s) | 3252, 13.1 | 7.0 / 14.7 s |
| 2 | 10-13 | Tue | classic | rect 16, nw-se (candidate 2) | 71 / 18 / 154 | ember segments, hue 161 arc 60, aurora 0.45, tw 0.52 gap 0.05 cusp 3.25 blend 0.8 | bloom-comet (4.7 s) | 2554, 10.5 | 7.0 / 10.8 s |
| 3 | 10-14 | Wed | dead ends | rect 16, sw-ne, dead ends 0.5 | 85 / 15 / 157 | pastel depth, hue 356 arc 90, wash 0.45, tw 0.48 gap 0.08 cusp 1.75 blend 0.7 | trace-roots (9.4 s) | 2553, 10.1 | 7.0 / 9.3 s |
| 4 | 10-15 | Thu | fog | rect 16, sw-ne, fog r4 | 76 / 10 / 158 | jewel strands, hue 316 arc 60, mist 0.5, tw 0.5 gap 0.07 cusp 3.25 blend 0.7 | trace-rainbow (7.5 s) | 2580, 11.2 | 7.0 / 11.2 s |
| 5 | 10-16 | Fri | classic | rect 18, se-nw | 79 / 21 / 209 | moss segments, hue 351 arc 90, silk 0.4, tw 0.44 gap 0.07 cusp 2.75 blend 0.9 | ink-dust x4 (6.3 s) | 3260, 12.2 | 7.0 / 12.5 s |
| 6 | 10-17 | Sat | grand | rect 20, ne-sw | 81 / 21 / 246 | ink segments, hue 304 arc 130, vellum 0.55, tw 0.48 gap 0.04 cusp 2.75 blend 0.9 | trace-roots x2.1 (11.8 s) | 4007, 17.4 | 7.0 / 14.7 s |
| 7 | 10-18 | Sun | heart | heart 22, nw-se | 107 / 15 / 143 | moss segments, hue 52 arc 90, silk 0.6, tw 0.52 gap 0.1 cusp 3.5 blend 0.6 | ink-dust (5.4 s) | 2485, 11.5 | 7.0 / 10.3 s |
| 8 | 10-19 | Mon | warm-up | rect 14, nw-se | 58 / 13 / 129 | ink strands, hue 29 arc 240, vellum 0.6, tw 0.44 gap 0.06 cusp 1.5 blend 1.1 | trace-rainbow (6.3 s) | 1983, 7.3 | 5.0 / 5.4 s |
| 9 | 10-20 | Tue | classic | rect 16, ne-sw | 76 / 21 / 163 | ember strands, hue 322 arc 60, contours 0.45, tw 0.5 gap 0.07 cusp 3.25 blend 1.4 | bloom-comet (5.7 s) | 2588, 12.2 | 7.0 / 10.8 s |
| 10 | 10-21 | Wed | side doors | rect 16, w-e | 78 / 20 / 155 | pastel depth, hue 114 arc 90, aurora 0.5, tw 0.52 gap 0.05 cusp 2.5 blend 1.2 | trace-burn (6.4 s) | 2575, 12.0 | 7.0 / 10.7 s |
| 11 | 10-22 | Thu | thread | rect 16, ne-sw, path string | 80 / 17 / 155 | pastel segments, hue 336 arc 180, mist 0.5, tw 0.44 gap 0.08 cusp 3.75 blend 1.1 | ink-dust (5.3 s) | 2571, 9.2 | 7.0 / 9.3 s |
| 12 | 10-23 | Fri | classic | rect 18, sw-ne | 76 / 16 / 190 | moss noise, hue 76 arc 90, wash 0.6, tw 0.5 gap 0.04 cusp 2 blend 0.9 | trace-burn x4 (6.7 s) | 3215, 12.8 | 7.0 / 15.3 s |
| 13 | 10-24 | Sat | grand | rect 20, se-nw | 100 / 18 / 243 | moss mono, hue 326 arc 60, silk 0.5, tw 0.48 gap 0.09 cusp 2.25 blend 1.5 | trace-roots x2.1 (15.1 s) | 3975, 17.0 | 7.0 / 14.8 s |
| 14 | 10-25 | Sun | star | star 24, nw-se | 90 / 15 / 141 | jewel segments, hue 347 arc 60, contours 0.45, tw 0.56 gap 0.04 cusp 4.5 blend 0.5 | trace-rainbow (9.6 s) | 2417, 11.4 | 7.0 / 10.8 s |
| 15 | 10-26 | Mon | warm-up | rect 14, ne-sw | 57 / 11 / 121 | moss segments, hue 35 arc 60, mist 0.6, tw 0.56 gap 0.04 cusp 1.5 blend 0.8 | bloom-comet (3.2 s) | 1976, 9.1 | 7.0 / 9.2 s |

What the sheet shows, by eye:
- The ember and jewel days (#2, #4, #9, #14) are loud next to V1's
  pastel: neon teal, magenta and red. Their windows are the only legal
  ones (3.3), so the question is whether one of each per week is
  welcome.
- The ink days (#6, #8) are muted, close to grey; moss reads as olive,
  khaki and mauve.
- #4 shows what a fog day looks like at rest: the start and nothing else.
- Every one of the 15 days fell asleep in the browser; none logged an
  error beyond the known `favicon.ico` 404 (K36).

Each day as a link, with its own intro (sound on):

- #1 today (V1): `?obiw97.c`
- #2 classic: `?1l1tou8.YuLePoF9HRL4UKX-wfYQqPmFm0i-`
- #3 dead ends: `?12ynhwy.YQi3o9i6SP0Eehp18KC8fkPLS-xD0_yiyaRf`
- #4 fog: `?1l6mez8.YQi3o9i6X9A_o6JfChon2D6GKtP8gtg`
- #5 classic: `?1xz8tq8.Y9lxdIn6B_RU6-FCcfyHyBCp9Fp8gguk8`
- #6 grand: `?1dtm1yx.YyQenOLpI9lTr4UJx9FCFT7Kh-YTSr4`
- #7 heart: `?olhuge.YyRfQ6h9HS-FBEPyHyBCm-hZdN4`
- #8 warm-up: `?1vz3aa7.YyKeOpE_QN6Gl8KEXyQPlHqND8gym8`
- #9 classic: `?1e2uzvv.Y-LenOLpf0D-jol8KDB_YPseo0nzCz6Rf`
- #10 side doors: `?oldxuj.YyLehEgygX0VL4UI5_IeEHGi-xZg`
- #11 thread: `?12acyh8.Y2LenOLpE_QR6OnXwoUl8YDxLEDQ_Qtg`
- #12 classic: `?yga6r2.Y1nsXS-y8KGTfkPkHl1PtPEk03g`
- #13 grand: `?rzcj7y.Y-Qei4ukj9BPoqJfCgiX2D5B-NL7Kh-YQU`
- #14 star: `?bp9tfw.YySfY2lb2lL4UNR-wfQQpfkFn0i-`
- #15 warm-up: `?llqx5p.Y2KenOLpW9jS-FDNPsHyBCo-YW9N4`

## 8. Open questions

1. **Rhythm:** the weekly arc (A), themed weekdays (B), or free variety (C)?
2. **Sizes:** Monday 14 up to Saturday 20. Saturday costs 1.2-1.3x V1's
   settle (about 17 s to sleep on the phone, against 14 s for V1) and
   stretches its intro; keep 20, or cap it at 19?
3. **Shapes:** star, tree and fish fail to sleep on 3-7% of seeds at
   these sizes. Keep all five behind the offline check (which skips those
   candidates), or run only heart and ring until the K12 class is fixed?
4. **Thursday modifiers:** all three? The memory trail changes the rules
   (no backtracking, so no red squares in the share grid). And on fog
   days: show the whole maze during the intro and then close the fog in
   (the draft), or keep it hidden from the start?
5. **Saturated palettes:** ember and jewel pass the legibility rules only
   in teal-green and magenta-red windows at narrow arcs. Accept that, or
   give those days a different path color (white or cyan) and open the
   windows?
6. **Color as a difficulty cue:** depth colors (a distance-from-start
   gradient) only Monday to Wednesday, mono (no color cues) only Friday
   and Saturday. Yes?
7. **Name the day?** Show the theme in the HUD and the share text, e.g.
   "Daily #9 · Heart" or "Daily #11 · Fog".
8. **Validation:** at load (12% of days build one or two extra
   candidates: about +0.25 s on a desktop Friday, +0.5 s on a Saturday),
   or a precomputed two-year table (no load cost; a script and a test keep
   it extended)?
9. **Start:** the first Monday at least three days after V2 ships, so it
   opens on a warm-up? And are calendar specials wanted later (a frozen
   date list, e.g. a heart on February 14)?
