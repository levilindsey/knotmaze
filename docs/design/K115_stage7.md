# K115 Stage 7 brief: live text (date and name strings as threads)

Design `docs/design/K115_cursive_text.md` sections 3.7 (live text),
4.2/4.7 (title thread, dailies), 5 (standalone uses) and Decision 1.
Stages 1b-6c are in: `buildTextGraph(text)` emits a pinned word
(`src/core/text_graph.ts:709`), `attachTitle` hangs a derived title on
a daily's entrance tail (stage 3a), and the standalone `text` scene,
cartouche and emblems all ride the same builder. Suite 1521 green at
54612f2. Levi's calls still bind: text pinned; spurs travelable;
capitals via connectors; one-token links. Decisions this brief makes
where the design left the mechanism open are marked (picked); the
genuinely open ones are Calls for Levi at the end, each with a
recommendation - build the recommendation unless Levi says otherwise
before the stage starts.

## What "live" means here (picked: content-live, still pinned)

Two different things have been called live, and this stage is only
one of them:

- **Physics-live** (design 3.7, Decision 1): dropping the pins so a
  word relaxes, with rest angles and home springs. **Not this stage.**
  Decision 1 stays: every live-text strand below is pinned exactly as
  stage 3a titles are, so it sleeps, plucks render-only (K77) and
  cannot pump. Unpinning remains a separate later experiment with its
  own brief; nothing here pre-builds for it.
- **Content-live** (this stage): the *string* is computed when the
  scene builds, from a producer the app already trusts, instead of
  being typed into a link param. The builder, the pinning, the seam
  and the walk are stage 3a's, unchanged. "Live text rides the
  date/name string producers" is the whole mechanism: find the
  producers, pick the strings, feed the existing slot.

## Inventory: the app's string producers today

Every place the app currently turns state into a display string that
a thread could carry. "Threaded?" = already rendered as cursive.

| producer | output | where it shows | threaded? |
|---|---|---|---|
| `dailyTitle(n)` (`src/ui/daily_link.ts:65-67`) | `` `Daily #${n}` `` | the daily's title thread (stage 3a) | **yes** |
| `formatDayDate(n)` (`src/game/daily_calendar.ts:79`) | locale short date, e.g. `Oct 12` | mode badge (`src/ui/mode_badge.ts:93`), stats rows, panel daily tooltip (`src/main.ts:2148`) | no (DOM) |
| `formatDayMonth(n)` (`src/game/daily_calendar.ts:100`) | locale long month, e.g. `October 2026` | stats History month headers (`src/ui/daily_stats_view.ts:414`) | no (DOM) |
| `todayNumber()` (`src/game/daily_calendar.ts:70`) | today's daily number (the clock) | everywhere a daily is named | n/a (an int) |
| `modeBadgeText` (`src/ui/mode_badge.ts:76`) | `Daily #12 · Oct 11 · solved`, `Replay`, `Practice` | the mode pill | no (DOM) |
| `shareText` (`src/game/share_text.ts:34-37`) | `Knotmaze Daily #12 🧶 …` | share sheet / clipboard | no (plain text; emoji have no glyphs) |
| Win headings (`src/main.ts:1434-1439`) | `Solved!`, `Daily #N solved!`, … | `WinBanner` heading (`src/ui/maze_hud.ts:447`) | no (DOM) |
| Panel daily label (`src/main.ts:2146-2149`) | `Daily #${t}` + tooltip | panel Daily button; turns at midnight | no (DOM) |
| **Player name** | - | - | **no producer exists** |
| **Word of the day** | - | - | **no producer exists** |

The last two rows are the finding that scopes this stage:

- **There is no player name to thread.** No account, profile or name
  field exists anywhere (`src/game/daily_store.ts` holds results,
  attempts and prefs only; accounts are K144, a future stretch goal).
  A name thread would need storage, an editor UI and a privacy call
  before it needs a builder call. Deferred whole (Call C4) - this
  brief does not invent the producer to feed the thread.
- **There is no word list.** A word-of-the-day thread needs a
  committed word table plus a day-to-word rule; that is content
  authoring, not plumbing. Deferred whole (Call C4); the slot below
  takes any future `f(n): string` without rework.
- The DOM strings (badge, banner, share, stats) already have a home
  and a job; threading them would duplicate, not replace, them. The
  one slot that renders a string as a thread today is the daily
  title. **Stage 7 therefore generalizes exactly that slot: the
  title becomes a function of the daily's date, not only its
  number.** Everything else is out of scope (below).

## The pick: date forms of the daily title (picked)

`dailyTitle(n)` stays the single entry point the scene wiring calls
(`SceneDeps.dailyTitle`, `src/app/scene.ts:52`, `:235`;
`src/main.ts:413`; worker prebuild `src/main.ts:211`). What it
returns grows a date form. Three forms, all pure functions of `n`:

| form | example (n for 2026-10-18) | use |
|---|---|---|
| number (today) | `Daily #7` | unchanged default |
| short date | `Daily #7 Oct 18` | **the stage 7 default (picked)** |
| long date | `Daily #7 Saturday Oct 18` | Call C1's longer option |

Rules that make these buildable and deterministic:

1. **English, committed tables - never the locale.** `formatDayDate`
   formats through `Intl` in the player's locale, so the same daily
   would build a different title thread (different letters, different
   walk graph, different K47 fingerprint) on differently-localed
   devices. A daily is one maze on every device within a build
   (K108's link rule, CLAUDE.md). The date forms therefore derive
   from `dayOfNumber(n)` (`src/game/daily_calendar.ts:63`) through
   committed tables in `src/game/daily_calendar.ts`:
   `MONTHS_SHORT = [Jan, …, Dec]`, `MONTHS_LONG`, `WEEKDAYS =
   [Monday, …, Sunday]` (or the subset the picked form needs).
   Weekday is integer arithmetic on the epoch day count
   (`(EPOCH_UTC / DAY_MS + (n - 1)) mod 7` against a named anchor
   weekday; exact ops only, K108 - no `Date` weekday getter in
   `src/core`-adjacent derivation, and the anchor is pinned by test
   against known dates). The DOM keeps using the locale forms; only
   the thread goes English-pinned. Call C2 may overrule this.
2. **Only glyphs the builder has.** Letters, digits, `#` and spaces.
   No `·`, `/`, `,` or emoji: an unsupported codepoint advances as a
   space in the builder, which would silently turn punctuation into
   a gap. Separators are spaces, as in the table above.
3. **One producer, two new pure functions.** Beside `dailyTitle`:
   `dailyDateShort(n: number): string` and
   `dailyDateLong(n: number): string` in `src/ui/daily_link.ts`
   (they compose `dailyTitle` with the calendar tables, keeping the
   "what a daily is called" knowledge in the file that already owns
   it), with the tables and weekday math in `daily_calendar.ts`
   beside `dayOfNumber`. `dailyTitle` itself is unchanged, so its
   pins (`test/ui/daily_link.test.ts:158-160`) stand; the new
   functions get their own pins. Which form the scene uses is one
   line in `dailyTitle`'s callers - picked: a new
   `liveTitle(n: number): string` in `daily_link.ts` returning the
   short-date form, called from `src/main.ts:211` and `:413` in
   place of `dailyTitle`. Keeping `dailyTitle` pure and adding
   `liveTitle` means the stage's blast radius is two call sites and
   the fingerprint consequence below is explicit, not smuggled into
   a function other code (and tests) read as "the number form".

## Where it renders: the stage 3a slot, nothing new (picked)

- The title thread's placement, width rule (build at x-height 3,
  shrink-only to `2 * gridSize`), band (`TITLE_GAP = 2`,
  `src/core/text_graph.ts:37`), Hermite connector, `tseam` seam,
  forced walk, stats exclusion and solve-clock start are stage 3a's,
  untouched. A longer string only exercises the existing width rule
  harder: `Daily #999 Oct 18` is the squeeze test case, and the long
  form's worst case (`Daily #999 Wednesday Sep 18`-class lengths) is
  measured before Call C1's longer option may ship (Kill criteria).
- No new scene surface. In particular: the win banner stays DOM
  (its `Solved!` heading is a banner, not a scene; a threaded
  `Solved` would need a post-solve scene that does not exist), the
  credits stay the K321 page plus the standalone `?txt=` scene (a
  credits *word* is already buildable today by hand; making it live
  needs a producer, and there is none), and the standalone text
  scene keeps taking its string from the link. Live content enters
  only where a producer already feeds a thread: the daily title.

## Update semantics: rebuild at the rollover, guard the attempt (picked)

Today the scene rebuilds when the player navigates (panel Daily
button, badge tap, link load - all through `rebuild()`,
`src/app/scene.ts:218`), and `deps.dailyTitle()` is re-read on every
rebuild, so any rebuild after midnight already builds the new day's
title. The gap is a page left open across local midnight: the 250 ms
interval (`src/main.ts:2164-2180`) notices `todayNumber()` change
and updates only the panel label and HUD. The maze (and its title)
stays yesterday's until the player acts. For a *numbered* title that
was a stale label; for a *date* title it is a wrong date written in
thread on screen. Picked semantics:

1. On the interval's existing day-change edge, if the page is on the
   **floating** daily (bare address / `?daily` - the player came for
   "today", `dailyFloating`) **and no attempt on the old daily has
   begun** (no first move; the solve clock never started), rebuild
   into the new daily exactly as the Daily button would
   (`playDaily(todayNumber(), true)` path). The player sees the new
   maze with its new date title; nothing of theirs existed to lose.
2. If an attempt **has** begun, do nothing to the scene. The run
   finishes against the maze and title it started with; its result
   records against the old daily (`daily_store` already keys by the
   attempt's own day). Only the panel label/HUD move, as today. A
   rebuild would strand the attempt against a shifted walk
   fingerprint - the K47 refusal exists for a deploy's rebuild, and
   manufacturing one at midnight for a cosmetic date is the wrong
   trade.
3. A numbered (non-floating) daily never auto-rebuilds: the player
   asked for that day by name.
4. The predicate (floating ∧ daily on screen ∧ clock never started)
   is extracted as a pure, unit-tested function in `main.ts`'s orbit
   (or `daily_link.ts` if it fits there - implementer's choice, one
   home, tested); the interval calls it. No timer, worker or host
   change: the worker prebuild and `SCENE_FIELDS`
   (`src/physics/physics_worker_core.ts:205-207`) already carry
   `title: "string"`, and `liveTitle(n)` is still just a string by
   the time it crosses the seam, so main and worker stay in lockstep
   (`test/physics/host_seam.test.ts` is the guard, unmodified).

## Params and codec: derived, no new param (picked - argued)

- `liveTitle(n)` is derived from `n` at scene-build time, exactly as
  `dailyTitle` is (stage 3a's argument, which still holds): a
  `?daily=12` or bare link must rebuild the same title on every
  device, and derivation from `n` guarantees it with no codec
  change. `SceneParams.title` already exists
  (`src/core/scene_graph.ts:25`); `UrlParams` gains nothing.
- `CODEC_PARAMS` (`src/ui/param_codec.ts:69`, last entry `text` at
  `:309`) and `CODEC_VERSION` (8, `:458`) do not move; the table pin
  in `test/ui/param_codec.test.ts` stands unmodified. The title
  still cannot leave the daily, so `DAILY_EXEMPT_KEYS` and
  `MAZE_PARAM_KEYS` (`src/ui/daily_link.ts:78-112`, `:138-199`) are
  untouched and their pinning tests stand.
- Determinism: `liveTitle` is a pure function of the integer `n`
  (tables + integer weekday math). Building the same titled scene
  twice is bit-identical (asserted, as stage 3a asserts it). The
  string crosses the worker seam as data, so no `Date`, `Intl` or
  locale read happens in the worker or in `src/core`.
- Consequence, named now (stage 3a's precedent): titled dailies'
  played walk graphs change the day this lands, so
  `walkFingerprint` (`src/game/daily_attempt.ts`) refuses saved
  pre-stage-7 attempts on titled dailies (attempt dropped, results
  kept - the existing K47 path). Recorded results keep maze-only
  numbers (title arc is outside every meter, stage 3a), so
  aggregates stay comparable. `DAILY_DEF` stays 2; pre-launch, the
  new titles land on every daily at once, and K531's launch freeze
  later freezes them in with the rest of the daily design. K87's
  plan pin, the golden dailies' maze pins, K74 walk pins and the
  physics `byte_identity` golden stay green unrefrozen: no text
  machinery runs when `title === ""`, and the maze plan never sees
  the title string.

## Stages within the stage

One code stage (7a). There is no 7b in this brief: the name and
word-of-the-day producers are deferred whole (Call C4), and the
physics-live experiment keeps its own future brief.

## Out of scope

Physics-live (unpinned) text in any form; player-name threads (no
producer; K144's territory); a word list or word-of-the-day; locale
date threads; threaded win banner, credits word or share text; any
change to `buildTextGraph`, `attachTitle`, the walk, stats or color
(`RUN_FLAG.TEXT` remains its own later item, per the ledger);
non-daily titles (stage 3b's general `title` param, still unbuilt);
Greek/accented date forms (the tables are English; the builder
*could* draw them, the producer does not emit them).

## Tests

- `test/ui/daily_link.test.ts`: `dailyDateShort` / `dailyDateLong` /
  `liveTitle` pins across the calendar's edges - Daily #1
  (2026-10-12, a Monday), a leap day (2028-02-29), a year turn
  (2026-12-31 → 2027-01-01), a DST pair (the calendar is UTC-day
  arithmetic, so both sides of a spring-forward name consecutive
  dates), and the width worst cases (#999 in the longest month).
  `dailyTitle` pins and both param-key lists unchanged.
- `test/game/daily_calendar.test.ts`: the weekday anchor against
  known weekdays (epoch Monday; 2026-10-18 a Sunday - verify against
  `dayOfNumber`, not by hand-waving), month-table lengths, and
  `dayOfNumber`/`dayNumber` round-trip over the swept range.
- `test/core/scene_graph.test.ts` (stage 3a's titled fixtures, new
  string): a daily titled with the short-date form attaches (seam
  returned, no connector crossing, forced exit and maze optimal
  unchanged, maze walk-edge indices stable), twice-built identical;
  the stage 3a sweep (dailies 1-30, all shapes at gs 6/12/18)
  re-run with `liveTitle` strings - every daily still attaches.
- Rollover predicate: floating ∧ unbegun rebuilds; begun, numbered
  and non-daily cases do not. (Pure-function tests; the interval
  itself is not simulated.)
- Sleep: the titled-with-date daily joins the sleep battery (the
  stage 3a regression's twin - a pinned word full of standing width
  deficits must still report `asleep: true` under both hosts).
- Full `npm test` + `npm run build` + `npx tsc --noEmit`. Real
  screenshots via `scripts/diag_screenshot.mjs` (never virtual
  time): a short-date titled daily at load and after two letter
  taps, worker and `phw=0`, panel closed, plus a 411 px fit shot of
  the #999 worst case.

## Kill criteria

- The short-date title at 411 px squeezes the maze under playable
  size or the date half reads illegibly in the real renderer (the
  #999 shot decides): fall back to the number form on dailies and
  ship the date form only where it fits (standalone scene), or drop
  the date from the thread and keep it in the DOM badge, which
  already shows it.
- The long form (if Call C1 takes it) fails the same shot worse:
  it does not ship; the short form is the ceiling.
- Any swept daily (1-30, shapes, gs 6/12/18) fails to attach with
  the longer string, or the connector crosses maze material: the
  width rule is not absorbing length as claimed - stop, do not
  special-case per daily.
- The rollover rebuild ever fires under a begun attempt in test:
  the predicate is wrong; ship the titles without the rollover
  (stale-until-reload, as today) rather than risk an attempt.
- A titled-with-date maze never sleeps under either host: same
  fallback as stage 3a's kill - investigate the pinned-seam/riders
  channel first; do not ship a daily that cannot sleep.

## Calls for Levi

Build the recommendation unless Levi says otherwise before the
stage starts.

- **C1. Which form rides the thread?** Short date appended -
  `Daily #7 Oct 18` (rec.: one glance gives number and date; the
  width rule already proved it can shrink a longer string), number
  only (stage 3a stands, stage 7 becomes rollover-only), or the
  long form with weekday (`Daily #7 Saturday Oct 18` - the most
  "live", the first to hit the squeeze and the phone kill above)?
- **C2. English-pinned or locale?** Committed English tables so
  every device threads the same letters for the same daily (rec.,
  per the determinism argument above), or the player's locale
  (`Intl`, like the DOM date) accepting per-device title graphs and
  cross-device attempt refusals?
- **C3. Midnight behavior.** Auto-rebuild a floating, unbegun daily
  at the rollover; begun attempts and numbered dailies never move
  (rec.), or leave the scene alone until the player acts (status
  quo - the thread's date goes stale overnight, the panel label
  does not)?
- **C4. Name and word-of-the-day: deferred whole?** No producer
  exists for either (rec.: defer both - a name waits on K144
  accounts/storage, a word-of-the-day on an authored word list;
  either returns as its own brief feeding this same slot), or
  Levi wants one of them scoped now, accepting the producer work
  (storage + editor, or the word table) as part of the stage?
- **C5. Does the DOM date retire anywhere?** The mode badge already
  shows `· Oct 11` for non-today dailies. With the date in thread,
  keep both (rec. - the badge is chrome, the thread is the maze;
  they serve different glances), or drop the badge's date once the
  title carries it?
