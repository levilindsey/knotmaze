# K144: accounts and shared stats

Design only (2026-11-03, no code). Ledger: K144 (Levi 2026-10-13, a
stretch goal after everything else; Levi's answers of 11-03 and 11-04
are under Questions, and stage 1 is K1168). This document lets
Levi pick a backend, and lets a later batch build the first stage
without re-deciding the data. Companion items: K531 (daily
determinism at launch) and K533 (backend daily precomputation), which
section 9 weighs with the backends and the Handoff ties to stages.

## Levi's words

From `docs/design/levi_notes_2026-10-13.md` (about 15:40; the raw
material is also in `docs/ledger_notes.md` under K144):

> I guess we should also plan to add, after everything else, the
> option for folks to login via some oauth provider, and have their
> stats persisted cross-device that way. Then we should also add a
> checkbox for opting into sharing their stats (but maybe only if
> logged in). Then we'll need to add some simple backend services to
> support this persistence in a scalable and efficient way. For
> opted-in folks, we'd probably want to collect and surface averages
> and percentile bands for various metrics across various levels, to
> let folks compare their performance. We'd also maybe need to
> consider some sort of (cheap) anti-cheat checks (maybe just
> silently flagging potential cheating accounts, and not including
> them in aggregate stats). Again, all of this is stretch goal
> material to do much later, after everything else

## The recommendation in brief

1. Build beside the site Levi already hosts: **Cloudflare Workers +
   D1** (section 9.1). The game is a static Pages site today
   (`.github/workflows/deploy.yml`); a Worker adds the first
   always-available server code in the same account, in TypeScript
   like the rest of the repo, and idles at no fixed cost. The
   SnoringCat platform's Nakama stays hopnbop's backend; knotmaze
   does not need its realtime machinery and should not share its
   fate (section 9.2).
2. The account holds **results first**: the daily results a player
   already keeps locally, synced per account, with the local store
   still the offline source of truth. Sharing, percentile bands and
   replay checks are later stages on that store (section 10).
3. Sharing is **off unless the player turns it on, and only while
   signed in** (Levi's "maybe only if logged in", decided here as
   yes: an anonymous percentile pool cannot be withdrawn per
   player, and deletion needs an account to delete).
4. Nothing about a logged-out game changes: full play, local
   records, the same share text. Signing in never gates a maze.

## 1. Today: what a player keeps, and where

Everything below names the file it was read in. The local record is
one versioned JSON document in `localStorage` under
`knotmaze.daily` (`src/game/daily_store.ts`: `DAILY_STORE_KEY`,
`DAILY_STORE_VERSION` 3, `DailyData`, `DailyDay`, `DailyResult`,
`DailyAttempt`):

- Per day (`days`, keyed by daily number): `played` (first move of a
  counting attempt), `official` (the first completion that counts),
  `replays` (later completions, newest last, capped at
  `MAX_REPLAYS` 20), `practice` (K146 finishes of attempts begun
  after their day, capped at `MAX_PRACTICE` 20), and `attempt` (the
  unfinished solve, section 2).
- Per result (`DailyResult`): when it finished (`at`), the local
  day its attempt began (`day`), `timeMs`, `path`, `optimal`,
  `efficiency`, `backtrack`, `junctions`, `deadEnds`, the `g/d/b`
  move log (`moves`, `src/game/maze_stats.ts`), the path look it
  ended in (`viz`), and `def`, which daily rule built the maze
  (`src/ui/daily_link.ts`: `DAILY_DEF`, today 2).
- `prefs`: only the playback preferences the player changed while
  on a daily (`src/ui/daily_link.ts`: `DAILY_EXEMPT_KEYS` — sound,
  camera, touch and feel, physics on/off and the look keys), applied
  to every daily on this device (`applyDailyPrefs`,
  `mergeDailyPrefs` in the same file).
- Aggregates are **derived, never stored**: `dailyAggregates` in
  `src/game/daily_store.ts` computes played, solved, current and
  max streaks and best time from the days, counting official
  results and on-time attempts only. Practice is in none of them,
  and the store's own header already reserves that exclusion for
  "any stats shared beyond this browser (K144)".

The store's failure answers are already the sync design's floor
(same file): every access is wrapped so the page boots and plays
with no storage (session-only then); a corrupt document is set
aside under `knotmaze.daily.corrupt` and the store starts fresh,
dropping one damaged entry at a time where it can
(`validResult`, `validAttempt`, `validPrefs` check field by
field); a write over quota prunes replays and practice, then other
days' attempts, then keeps going in memory; and a document from a
**newer schema is never overwritten** — `parseDailyData` returns
`newer`, the session plays on its own copy, and the stored records
wait for a build that knows them. Section 4.3 is about not losing
that answer when a server joins.

Two more facts the design rests on:

- **A daily is not frozen.** A daily's design is today's defaults
  (`PARAM_DEFAULTS`) on the day's seed (`src/ui/daily_link.ts`:
  `dailySeed`, `dailyParams`), so a default or generation change
  moves every daily; within one build a day is one maze on every
  device (`src/util/det_math.ts`, K108: generation uses only
  engine-exact math, so every browser builds the same maze). The
  golden test pins dailies #1–#3 to catch a move
  (`test/ui/daily_link.test.ts`, `.claude/rules/gameplay-daily.md`).
  A synced result therefore means "(daily number, `def`, the
  build's defaults)", not a maze that can be named forever — that
  is K531's problem (section 9.3), and every uploaded record must
  carry `def` so K531 can later say which mazes its results belong
  to.
- **Day numbers are local.** Daily #1 is 2026-10-12 and the number
  turns at the player's local midnight (`src/game/daily_calendar.ts`:
  `dayNumber`, `todayNumber`), so two devices can honestly disagree
  about "today" by up to two days (`DAILY_MAX_AHEAD` in
  `src/ui/daily_link.ts`). Sync merges by daily number, never by
  "today".

### Which preferences stay per device

All of them, in the first stages. The store's `prefs` are
device-kind choices by their own comments (a device-speed choice,
how the first settle is paced, which thread runs the physics —
`DAILY_EXEMPT_KEYS` in `src/ui/daily_link.ts`), and the viewer
preferences outside the daily document are per-device already:
Motion (`knotmaze.motion`, `src/ui/motion.ts`), the panel's open
state, folds and scroll (`src/ui/tweakpane_panel.ts`), and the HUD
and input toggles in `src/main.ts` (`knotmaze.showStats`,
`knotmaze.finishIndicator`, `knotmaze.tapToPan` and their kin).
An account that signed in on a phone and a desktop should not fight
over any of these. If Levi later wants playback preferences to
follow the player, that is a small later stage (upload `prefs` as
account preferences, still applied through `applyDailyPrefs`); it
is not in stage 1.

## 2. What an account holds

An account is the server's copy of the counting records, keyed by
a server-minted account id (never by an email address or a
provider's subject alone; section 3):

- **Identity (server-only):** account id, creation time, the
  sign-in providers linked to it (provider + provider subject),
  the sharing switch (section 5, default off), and the anti-cheat
  flag (section 7, default clear). No display name is needed until
  a shared surface shows one; stage 1 shows none.
- **Results (the sync payload):** for each daily number, the same
  shape the local store keeps — the official result, the replays
  and the practice finishes, each a `DailyResult` as defined in
  `src/game/daily_store.ts`, plus the server's receipt time and,
  from stage 4, the submitted taps (section 7). Practice syncs
  (it is the player's own history on their other device) but never
  enters any aggregate or shared figure, exactly as locally.
- **The unfinished attempt — not in stage 1.** A saved attempt
  (`DailyAttempt` in `src/game/daily_store.ts`; `attemptRecord`,
  `restoreAttempt` and `walkFingerprint` in
  `src/game/daily_attempt.ts`) is its tap list plus the maze
  fingerprint those taps belong to, and it is written after every
  move. Syncing it would let a solve resume on another device, and
  the fingerprint already refuses a restore onto a moved maze.
  But it is also the fastest-changing, most conflict-prone record
  (two devices mid-solve on one day), and its loss costs one
  in-progress solve, not a history. Stage 1 syncs finishes only;
  attempt sync is stage 5, last-writer-wins by `savedAt`, and a
  restore still has to pass `restoreAttempt` on the device that
  receives it.
- **Not held:** designs and links (a design is its URL,
  `src/ui/daily_link.ts`; nothing to store), non-daily solves
  (today they leave no record at all — only the share text of
  `src/game/share_text.ts` — and accounts do not invent one),
  replays of the solve animation, and any preference (section 1).

The server stores results **per result, not as one document**: one
row (or record) per (account, daily number, kind, finish), so two
devices uploading the same day merge row by row (section 4)
instead of overwriting a whole `DailyData` blob. The local
document stays as it is; sync translates at its edge.

## 3. Sign-in

- **How:** OAuth 2 / OpenID Connect in the browser, authorization
  code with PKCE, against the backend of section 9. The client
  keeps a session credential the backend mints (an HttpOnly cookie
  on the site's own origin is the Workers shape; Nakama would issue
  its session token instead — the client code differs, the design
  does not). No passwords are ever knotmaze's to store.
- **Providers:** Levi's choice (Questions). The recommendation is
  **Google first** (the likely audience already has it, and the
  daily's Wordle shape travels by link between phones), with the
  provider list kept data, not code, so adding **Apple** (needed
  if native apps, K118, ever ship and ask for it) or another
  provider is configuration plus a button. Each provider identity
  links to the one account id; linking a second provider to an
  existing account needs the player already signed in, so two
  providers cannot silently split one history in two.
- **What a logged-out player keeps:** everything that exists
  today. Play, dailies, local records, saved attempts, the stats
  view and the share text (`src/game/share_text.ts`) are untouched;
  there is no account wall, no nag beyond one quiet sign-in
  affordance, and signing out leaves the local records exactly as
  they were (they were never the server's to delete). A player who
  never signs in is not a lesser player; they simply have no
  second copy.
- **First sign-in** uploads the local history (section 4.1). The
  local store is not cleared, replaced or re-keyed by signing in:
  `DailyStore` (`src/game/daily_store.ts`) keeps working with no
  network, and sync is a layer that reads and writes through it.

## 4. Sync: what moves, when

### 4.1 What uploads, and when

- On **first sign-in**: every local day's official, replays and
  practice finishes, as they stand.
- On **each finish** thereafter (and on sign-in, for anything
  finished while signed out or offline): the new result. Uploads
  are small (a result is a few hundred bytes; the move log is
  capped at 400 letters in `validResult`) and idempotent: each
  carries a client-minted id so a retried upload is one row, not
  two.
- On **sign-in on a new device**: download the account's results
  and merge them into the local store (section 4.2), then upload
  anything the local side has that the server does not.
- **Never uploaded:** the daily `prefs`, the per-device viewer
  preferences (section 1), the unfinished attempt (until stage 5),
  and — until stage 4 asks for them explicitly — the taps behind a
  result. A result today carries aggregates of the walk (`path`,
  `optimal`, `efficiency`, `backtrack`, `junctions`, the move log),
  not the walk itself; section 7 is honest about what that limits.

Sync runs when the page is online and signed in, after a finish
and at load; it must never block play, the intro or a finish
banner. A failed upload retries later; the local record is already
safe, which is the point of keeping the local store primary.

### 4.2 How two devices' records merge

Per daily number, independently (the local store's own rules in
`src/game/daily_store.ts` are the contract both sides honour):

- **Official:** the counting rules already say what official is —
  the first completion that counts, where an attempt begun after
  its day never counts (K146: `begunLate`, `recordSolve`). Across
  devices, the official is the earliest such finish by its
  attempt's begin day and finish time among the merged records.
  Two honest devices can each hold an "official" for one day
  (played offline on both); the merge keeps the earlier as
  official and demotes the later to a replay, which is where the
  local store would have put it had it seen both. Device clocks
  can lie or skew, so `at` orders only within this rule, and the
  loser is demoted, never deleted.
- **Replays and practice:** union, deduplicated by content (same
  daily, same finish time, same figures and move log — a finish
  uploaded from both devices after a merge is one finish), newest
  last, capped as locally (`MAX_REPLAYS`, `MAX_PRACTICE`); the
  quota prune order (replays and practice first) is also the
  server's trim order if an account ever needs one.
- **Played and streaks:** never synced as figures. They are
  derived (`dailyAggregates`), so they fall out of the merged
  records on each device, streaks included, with on-time decided
  by `onTime` from the merged set.
- **Conflicts that cannot merge** (the same finish with different
  figures under one upload id): the server keeps the first it
  received and flags the account for a look (section 7's quiet
  flag, not an accusation — a restored backup can do this
  honestly).

### 4.3 A newer store version, mid-sync

Today's hazard, named in the store itself: a build that meets a
newer local schema leaves the document alone and plays
session-only (`parseDailyData`'s `newer`, `StoreStatus`), so it
cannot destroy records it does not understand. A server must not
become the way around that protection:

- The sync payload carries its own version (the local
  `DAILY_STORE_VERSION` it was read from, plus the sync protocol's
  version). The server **accepts and preserves** records from a
  newer sync version without interpreting fields it does not know,
  and never answers a download with a downgrade that would make an
  older client overwrite a newer local document.
- A client whose local store reports `newer` does not upload that
  document's days at all (it cannot faithfully read them); it
  plays its session and says, once, that updating will bring its
  records back. This mirrors the local rule exactly: leave the
  newer thing alone.
- Adding a field to a result later follows the local precedent
  (v1→v2→v3 read old documents as they are; `src/game/daily_store.ts`
  header): old records stay valid, missing fields derive or
  default, and no migration rewrites history on either side.

## 5. Sharing: the opt-in

- **Off by default, only while signed in.** The switch lives on
  the account (section 2), starts off, and turning it on shares
  from that moment; turning it off stops future sharing and
  removes the player's records from future aggregate computations
  (bands already published are recomputed without them on the next
  pass, section 6). A signed-out player has nothing shared: there
  is no anonymous pool, so withdrawal and deletion (section 8,
  below) always have an owner.
- **What a shared record shows.** To other players, nothing
  individual: no per-player boards in this design. Sharing means
  the player's official results count toward the averages and
  percentile bands of section 6. To the player themselves, their
  own band ("your time was in the fastest quarter of shared
  solves") on the daily stats view, beside the figures they
  already see (`src/ui/daily_stats_view.ts` reuses the `STATS`
  lines of `src/game/maze_stats.ts`). If Levi later wants named
  boards, that is a new decision with a display name, moderation
  and a block list; this design deliberately does not build it.
- **What never shares:** practice finishes (outside every
  aggregate already, section 1), replays (a player's second copy
  of a day they already solved would double-count them; bands
  count one official per player per day), the move log and the
  taps (they stay between the player and, from stage 4, the
  anti-cheat check), and anything from a flagged account
  (section 7) while the flag stands.
- The existing copy-to-clipboard share (`src/game/share_text.ts`:
  the Wordle-style grid and the `?daily=<n>` link) is unchanged and
  needs no account: it is the player handing their own text to
  someone, not the server publishing it.

## 6. Percentile bands

- **Over which records:** shared (opted-in, unflagged) **official**
  results only, one per player per daily, grouped by daily number
  — never across days, because each day is a different maze
  (section 1). Metrics: solve time (`timeMs`) and efficiency
  (`efficiency`, `src/game/maze_stats.ts`: `efficiencyOf`), the two
  figures the stats view already headlines; stars derive from the
  stored `path`/`optimal`/`backtrack` (`ratingForResult` in
  `src/game/star_rating.ts`), so a star distribution can be shown
  without storing anything new.
- **Computed where:** on the server, on a schedule, once the day
  has turned in the last time zones (Levi 11-04: no same-day bands,
  Q4), stored as small per-day band tables the client downloads
  with — or instead of — syncing.
  The client never receives other players' results, only bands.
- **How many players a band needs:** a stated floor, recommended
  **20 shared official solves of that day**; below it the surface
  reads "not enough shared solves yet" and shows no band, so a
  handful of friends cannot read each other's times out of the
  quartiles. Bands are quartiles (fastest quarter / upper middle /
  lower middle / slowest quarter) for time, and the share at each
  star count plus median efficiency; finer bands (deciles) wait
  until typical days clear a few hundred shared solves, when a
  decile still hides its members.
- **Freshness and honesty:** a band names its day, its metric and
  its count ("of 143 shared solves"). Late official solves (an
  attempt begun on its day, finished later — official under K47's
  resume) join their day's table; practice and replays never do.

## 7. Replay anti-cheat: what a server can and cannot check

Levi's ask is cheap and quiet: flag suspect accounts silently and
leave them out of the aggregates (`docs/ledger_notes.md`, K144).
Stage 4 adds the one upload that makes it real: alongside a finish,
the client submits its **taps** — the accepted-tap run list a saved
attempt already stores (`DailyAttempt.taps`, `attemptRecord` in
`src/game/daily_attempt.ts`).

### What the server can replay today

- **Rebuild the maze.** A daily's maze is a deterministic function
  of its number and the build's defaults (section 1; K108's
  engine-exact math in `src/util/det_math.ts`). A server running
  the same generation code (it is TypeScript; the Workers shape
  runs it natively, the Nakama shape would port or shell it —
  section 9) rebuilds the day's walk graph and checks its
  `walkFingerprint` (`src/game/daily_attempt.ts`) against the
  fingerprint the client saved with its attempt: a walk submitted
  for a different maze refuses, exactly as a restore does today.
- **Replay the walk.** `FabricMazeController.replay` rebuilds the
  path, meters, visited junctions and move log from taps alone
  (its contract, `src/game/daily_attempt.ts` header), so the
  server replays the submitted taps and compares every stored
  figure: the route ended on (`path`), the shortest route
  (`optimal`), `efficiency`, `backtrack`, `junctions` and the
  `g/d/b` move log must fall out of the replay, and the stars
  (`src/game/star_rating.ts`) must match what those figures rate.
  A result whose figures no legal walk produces is not a fast
  player; it is a fabricated record.
- **Bound the time.** The replay gives the walk's length and move
  count; with the design's travel pace the server can ask whether
  `timeMs` is physically plausible for that many moves (the K144
  note in `docs/ledger_notes.md` names exactly this check: valid
  moves, a plausible time for `moveSpeed`). The solve clock
  (`SolveClock` in `src/game/maze_stats.ts`) excludes hidden-page
  time, so the bound must be generous — a floor below any honest
  play, catching only the impossible.

### What it cannot check

- **Honest wall-clock time.** `timeMs` is reported by the client
  and its clock is the player's. Replay bounds catch fabrication,
  not a merely flattering clock; bands should therefore lean on
  replay-verified figures and treat time as the softest metric.
- **Timed modes.** A daily is a turn-based maze today, and replays
  never write the caught letter (`replay(taps)` never writes `x`:
  a minotaur's maze is never a daily, `src/game/maze_stats.ts`).
  In real-time play (the chase and burn clocks, the beat rider) the
  outcome turns on seconds, animation and input timing that a tap
  list does not hold, so a tap replay cannot re-derive who was
  caught or whether the fire arrived first. Results from timed
  modes get bounds checks only (duration against moves, catches
  against restarts), and this design keeps shared bands on the
  daily's turn-based shape until a timed mode has a replayable
  record of its own.
- **Play outside the maze controller.** Tugs, plucks and physics
  leave no taps and prove nothing either way; nothing in this
  design scores them.
- **Who held the device.** An account proves a credential signed
  in, not a person. Shared solves by a stronger friend are
  undetectable and, at this scale, harmless; the design does not
  chase them.

A failed check **flags, silently**: the account's results stop
counting toward bands, no banner accuses anyone, and Levi (or a
later review pass) can clear a flag. False positives must be
possible to survive — a generation change mid-day moves the maze
and every honest fingerprint with it, so checks pin to the
record's `def` and the fingerprint it carries, and a build that
has just deployed does not flag the day it landed on.

## 8. Privacy

- **What is stored:** the account identity and results of
  section 2, the sharing switch, the flag, and operational logs
  (sign-in and sync times, upload ids) kept briefly. Nothing else:
  no designs beyond daily numbers, no preferences, no browsing,
  no analytics identity tied to the account. The provider gives an
  identifier and, depending on provider and consent, an email;
  the design stores the identifier and treats any email as
  sign-in plumbing, never shown and never shared.
- **Account deletion:** a signed-in player can delete the account
  (re-authenticated, one confirmation), which erases the identity,
  its provider links and all its server results, and recomputes
  future bands without them. Local records on the player's devices
  are untouched — they were never the server's. Deletion is a
  server-side erase, not a hide flag; backups age out on the
  host's normal rotation, and the privacy note says in plain words
  how long that is once the backend is chosen.
- **Where the note lives:** a `privacy.html` beside `credits.html`,
  built the same way (the notices plugin, `notices/vite_plugin.ts`;
  relative links so it reads at both hosts, `.claude/rules/notices.md`),
  linked from the panel's credit line area and from the sign-in and
  sharing controls. It states, in plain language: what is stored,
  that sharing is off until turned on, what a shared solve
  contributes (figures to a band, never a name), deletion, and
  whom to contact. It ships in the same stage that first stores
  anything (stage 1), not as a later apology.
- **Children and regions:** the game collects the minimum above so
  most regimes need no consent flow beyond the sharing switch;
  if Levi wants under-13 play or EU-targeted launch promises,
  that is a question for launch prep (K531's stage), not a reason
  to store extra fields now "just in case".

## 9. The two backends, weighed against those needs

The needs, collected: OAuth sign-in with a session the static
page can hold (section 3); per-result records with row-wise merge
(section 4); scheduled band computation over one day's officials
(section 6); from stage 4, running the game's own TypeScript
generation and controller code to replay walks (section 7); and
small, spiky traffic — a burst at each day's turn, silence between
— for a player base that starts at friends and family. Prices and
free allowances change; the shapes below are the durable part, and
Levi confirms current numbers when a stage is briefed.

### 9.1 Cloudflare Workers + D1, beside the Pages site

- **Fit today:** the site already deploys to Cloudflare Pages from
  this repo (`.github/workflows/deploy.yml`, the same account pair
  levi.dev uses), behind the levi.dev proxy with a relative Vite
  base (`vite.config.ts`: `base: "./"`), so a Worker route or a
  Pages Function on the same origin gives the client a same-origin
  API with an HttpOnly session cookie and no CORS surface. D1 (a
  managed SQLite) holds the per-result rows; band tables are just
  more rows, recomputed by a scheduled Worker.
- **Cost shape:** usage-based with an idle cost of zero — nothing
  runs between finishes — growing by requests and stored rows,
  both tiny at this game's scale (a result is a few hundred bytes;
  a busy day is thousands of small calls, not millions). No host
  to patch, back up or keep awake.
- **What knotmaze runs where:** on the client, sign-in and the
  sync layer over `DailyStore` (TypeScript, this repo); on
  Cloudflare, one Worker (the API: auth callback, session, results
  up/down, bands down, deletion) plus the scheduled band job, and
  the D1 schema with its migrations. Stage 4's replay runs the
  repo's own generation and controller modules inside the Worker —
  the same code the client replays with, so the check cannot drift
  from the game. Secrets (provider credentials) live in the
  Worker's configuration beside the Pages secrets the deploy
  already uses.
- **Weaknesses:** a second deployable beside the Pages build (its
  own tests and its own careful rollout, especially schema
  changes); D1's scheduled and consistency behaviour must be
  learned rather than assumed; and OAuth needs a small amount of
  hand-rolled session care that a batteries-included server would
  have provided (PKCE, cookie flags, expiry — all standard, all
  knotmaze's to get right).

### 9.2 The SnoringCat platform (Nakama, hopnbop's backend)

- **Fit today:** Levi already operates this stack for hopnbop —
  Nakama on Hetzner (`docs/ledger_notes.md`, K144: "the SnoringCat
  platform (Nakama on Hetzner, hopnbop's)") — with accounts,
  provider sign-in, server-side storage and leaderboard-shaped
  aggregation built in rather than to be written. Its operational
  lessons (deploys, backups, monitoring) are already paid for.
- **Cost shape:** the fixed host is already running for hopnbop,
  so knotmaze's marginal cost is near zero until it needs capacity
  of its own; the real cost is coupling — knotmaze shares the
  host's upgrades, incidents and maintenance windows with a live
  multiplayer game, and a knotmaze launch spike lands on hopnbop's
  machine.
- **What knotmaze runs where:** on the client, Nakama's JavaScript
  client and session handling (a new dependency, and a token —
  not the site's cookie — to store and refresh); on the platform,
  a runtime module (storage hooks, the sharing switch, band
  computation, deletion) in the platform's server language, in the
  platform repo's release train. Stage 4's replay is the awkward
  fit: the game logic is TypeScript in this repo, so the check
  either ports the walk replay to the server runtime, runs a
  JavaScript runtime module if the deployment offers one, or
  accepts bounds-only checks (section 7) — each a real cost the
  Workers shape does not pay.
- **Weaknesses:** heaviest where knotmaze is lightest — a static
  site gains an always-on game server's client, protocol and
  release coupling for a few hundred bytes per finish — and two
  products' data and fate in one store, where a platform incident
  or a botched migration touches the game that did nothing.

### 9.3 Either way: K531 and K533

- **K531 (daily determinism at launch)** — past dailies
  reconstructible as (app version → frozen defaults) merged with
  per-day overrides, published days immutable — is owed under
  both backends, and accounts make it more valuable, not less:
  without it, a synced result's daily number names a maze that a
  later default edit quietly replaces (section 1), bands compare
  solves of different mazes under one number, and stage 4's replay
  rebuilds today's maze, not the maze the taps were walked on.
  Every stage here therefore carries `def` (and, from K531, the
  version it names) with each result, so K531's frozen tables slot
  under the stored history without a re-upload. K531 itself still
  lands at launch prep, as its item says; accounts must not be
  briefed as depending on it for stage 1 (sync of today's records
  is useful while dailies still move), but percentiles and replay
  checks should not be *trusted* across a K531 boundary they
  predate — bands recompute per `def`, and stage 4 checks a walk
  against its own record's definition.
- **K533 (backend daily precomputation)** — serving current and
  previous daily designs from the backend so future dailies cannot
  be anticipated client-side — is a later tenant of whichever
  backend this chooses, not a stage of it: it moves generation
  server-side on a schedule, which the Workers shape hosts as
  another scheduled job writing design rows the client downloads,
  and the Nakama shape as a runtime job beside the module above.
  Choosing Workers now keeps that door widest (the precompute is
  this repo's TypeScript, run where the replay already runs it);
  K533's own design still depends on K531, exactly as its item
  says, and neither stage below closes it.

## 10. Recommendation and build stages

**Recommended backend: Cloudflare Workers + D1** (section 9.1) —
same origin as the site, TypeScript end to end so stage 4 replays
with the game's own code, zero idle cost, and no coupling to
hopnbop's host or releases. Nakama is the right answer if Levi
would rather operate one platform than two small services; that
trade is Levi's to overrule (Questions, Q1), and sections 2–7 are
written to survive either choice.

Each stage is small enough for one later run; each names where it
lands. No stage changes physics, generation, or what a logged-out
player sees.

1. **Stage 1 — accounts and result sync (no sharing).** The Worker
   and D1 schema; one OAuth provider (Q2); sign-in/out in the
   panel beside the daily stats entry; the sync layer over
   `DailyStore` (`src/game/daily_store.ts`) uploading and merging
   finishes per section 4; `privacy.html` (section 8) and account
   deletion. Done when: two devices under one account show one
   history (official/replay/practice per section 4.2), a signed-out
   device is byte-for-byte today's game, and the suite proves the
   merge rules in Node tests beside `test/game/daily_store.test.ts`.
2. **Stage 2 — the sharing switch and bands.** The account switch
   (off by default, section 5), the scheduled band computation
   with its 20-solve floor (section 6), and the player's own band
   on the stats view (`src/ui/daily_stats_view.ts`). Done when a
   day under the floor shows "not enough shared solves yet" and a
   day over it shows quartiles that a Node test recomputes by hand.
3. **Stage 3 — polish of the account surface.** Second provider
   linking (section 3) and download-my-records (the player's own
   results as a file). Small. The sharing wording (Q3) was settled
   on 11-04, so it ships with stage 2's switch.
4. **Stage 4 — tap submission and replay checks.** Finishes carry
   taps (`src/game/daily_attempt.ts` shapes); the Worker replays
   them against the rebuilt maze (section 7), flags silently, and
   bands exclude flagged accounts. Done when a fabricated result
   in a test is flagged and an honest corpus — including a
   mid-day generation change's — is not.
5. **Stage 5 — attempt sync (optional).** The saved attempt follows
   the account (section 2), fingerprint-gated per device. Only if
   Levi still wants cross-device resume after living with stages
   1–4 (Q5: Levi decides then); dropping it loses nothing the
   earlier stages promised.

After launch prep, K531's frozen daily definitions land under the
stored `def` values, and K533's precomputation is designed against
the running backend (section 9.3).

## Questions only Levi can answer

All five are answered (2026-11-03 and 11-04).

- **Q1. Backend:** confirm Workers + D1 (the recommendation), or
  choose the SnoringCat platform's Nakama and accept its coupling
  (section 9.2)? Every stage waits on this.
  *Levi, 2026-11-03:* Workers + D1.
- **Q2. Providers:** Google first (recommended) — and which others
  at launch of stage 1: Apple now or later, any other?
  *Levi, 2026-11-03:* Google sign-in first, and the results synced
  first (stage 1, K1168).
- **Q3. Sharing wording:** what the switch says and where it sits.
  Recommended wording: "Share my daily results so my solves count
  toward everyone's percentile bands. Off by default; no name is
  ever shown." — confirm or replace in Levi's words.
  *Levi, 2026-11-04:* the recommended wording, with "plays" in place
  of "solves". The switch reads: "Share my daily results so my plays
  count toward everyone's percentile bands. Off by default; no name
  is ever shown." It sits on the account, as section 5 has it.
- **Q4. Same-day bands:** show a day's band while the day is still
  current (recomputed through the day), or only once the day has
  closed everywhere? (Section 6 assumes closed-day is enough.)
  *Levi, 2026-11-04:* only once the day has closed everywhere.
- **Q5. Cross-device resume:** is stage 5 wanted at all, or does
  finishing on one device and merely *seeing* the history on
  another cover the ask?
  *Levi, 2026-11-04:* decide after stages 1 to 4.

## Handoff

- **Decided here (from the code, not awaiting Levi):** the local
  store stays the offline source of truth and sync translates per
  result (sections 2, 4); practice syncs for the owner and never
  aggregates (sections 1, 5); preferences stay per device in the
  first stages (section 1); sharing needs an account, starts off,
  and shows bands, never names (section 5); bands count one shared
  official per player per day over a 20-solve floor (section 6);
  anti-cheat flags silently and pins to each record's `def`
  (section 7); deletion erases server-side and never touches local
  records (section 8); every record carries `def` so K531 slots
  under it (section 9.3).
- **Levi's:** none open. Q1–Q5 are answered above (11-03 and
  11-04); Q5 comes back after stages 1–4. Stage 2's under-floor
  line (section 6, "not enough shared solves yet") predates Q3's
  answer: its brief uses "plays" there too.
- **Ledger items the stages feed or close:** stage 1–5 build K144
  itself (it closes when the stage Levi accepts as "accounts" has
  landed — recommended: stage 2, the first with a player-visible
  shared figure); K531 is fed by the `def` discipline (its frozen
  tables must cover every `def` the server stores) but closes at
  launch prep on its own brief; K533 is fed by the backend choice
  and stage 4's server-side generation, and closes on its own
  design after K531. No other item is closed by this document.
- **Files read for today's-code claims:** `src/game/daily_store.ts`,
  `src/game/daily_attempt.ts`, `src/game/daily_calendar.ts`,
  `src/ui/daily_link.ts`, `src/game/maze_stats.ts`,
  `src/game/share_text.ts`, `src/game/star_rating.ts`,
  `src/util/det_math.ts`, `src/ui/motion.ts`,
  `src/ui/tweakpane_panel.ts`, `src/main.ts` (preference keys),
  `.github/workflows/deploy.yml`, `vite.config.ts` (the base),
  `.claude/rules/gameplay-daily.md`, `.claude/rules/notices.md`,
  `docs/ledger_notes.md` (K144), and
  `docs/design/levi_notes_2026-10-13.md` (the ask verbatim).
  Nothing in `src/` changed for this document.
