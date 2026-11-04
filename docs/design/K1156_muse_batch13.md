# Muse batch 13 (K1156)

Claude starts these runs through Paseo, one run at a time, after batch
12 (`docs/design/K1153_muse_batch12.md`, K1153) was reviewed and
closed. Each run is a fresh Muse agent that reads this brief, does its
run's tasks, and stops. Claude reviews each run on master afterwards
and closes K1156. Run A was the drafting run
(`docs/design/K1156_muse_batch13_run_a.md`), so the runs here are B
to G.

Where the runs came from (the drafting run's order, from
`docs/design/K1156_muse_batch13_run_a.md`): (1) `## Approved, to
schedule` in `LEDGER.md` (K22, K23, K322 and K805) — none fits: batch
12's reasons still hold for each, said under "Left out on purpose"
below. (2) The four residuals filed since batch 11's draft, which
batch 12 left for this one: K1152 and K1148 in one run (both are the
phone kit's shared readiness check, `scripts/phone_pass/phone_ready.mjs`,
and one test file), K1155, and K1154. (3) `## Residuals (known, not
fixed)` in ledger order, starting after K308 (batch 12's draft read
through K308). Residuals were read in ledger order through **K685**
(the last residual read; batch 14's draft starts after K685). Three
runs fit: K351, K392 (its seam half) and K685, in ledger order. See
"Left out on purpose" at the end for every candidate read and
skipped, and why.

Every task here is decided by a unit test, a dry run or a measurement
table. None needs Levi. Runs B and C change phone tools but never run
one against the phone: a unit test, a parse or a usage dry run decides
each, as the drafting brief requires. Run D changes the physics
hosts' load clock, not the simulation: it keeps the hosts' lockstep
test (`test/physics/physics_host.test.ts`) and the golden snapshots
(`test/physics/byte_identity.test.ts`) green unchanged. No run
changes junctions, the cursive, the thread renderer's GPU
performance, or anything in `src/render/field/` or
`.claude/probes/K1040/` (K1040's label pass works there in its own
lane). No two runs touch one file, and each run starts from the
latest master, in the order B to G.

## How to work

Batch 8's "How to work" applies unchanged: read it in
`docs/design/K1131_muse_batch8.md` (its ten rules and the paragraphs
after them, which send you on to `docs/design/K1050_muse_week.md`)
before anything else. Read K1156 wherever it says K1131, and
K1137's rule 11 and K1141's rules 11 and 12 wherever they apply: rule
11 (a re-measurement copies the original stand's link verbatim, read
from the old probe's source, not from a summary of it, and its table
names everything it adds or changes) wherever a stand is copied, and
rule 12 (dependencies: neither run should need a new or changed
package; if one changes anyway, `npm audit` must report no high or
critical advisory afterwards, and a security fix is taken even when it
was published less than two weeks ago) wherever a dependency moves.
Use ports 5500-5549 (each run below names its range).

After each run, update K1156's handle, naming the next run in the
order B to G:
`ledger.mjs handle K1156 --last-commit <sha8> --next "Run <X> done; next Run <Y>"`
(after Run G: `--next "Run G done; batch 13 complete, Claude reviews and closes K1156"`).

## Run B · K1152 + K1148: the readiness check in its own words, and a `--ready` guard for the hand-run tools

Read first: `.claude/rules/probes-phone.md`; then
`scripts/phone_pass/phone_ready.mjs` whole (its header is the spec),
`scripts/phone_pass.ps1` lines 65-77 and 158-169 (the other live
citation, and its `Find-Adb`), the three hand-run tools
(`scripts/bench_frame.mjs`, its option parser and its `--cdp`
connect; `scripts/k923/sync.mjs`, its option parser and its
`--target phone` connect; `scripts/k923/close_tabs.mjs` whole), the
"Left over" list in `docs/design/K1142_phone_guard.md`, and
`test/phone_pass/phone_ready.test.ts` (the fixtures, the K170 scan
and the runners scan at its end).

The ledger says (Residuals):

> **K1152** · `scripts/phone_pass/phone_ready.mjs` cites `phone_quiet.mjs` of K1097 at 680651fe (lines 10, 14,
> 44, 48, 68): that commit was rebased away and S3d's step 0 deleted the file, so the comments point at
> nothing on master. Say what the check does in its own words.

> **K1148** · Hand-run phone tools skip K1142's check: `bench_frame.mjs --cdp`, `k923/sync.mjs --target
> phone`, `k923/close_tabs.mjs` (a `--ready` flag calling `ensurePhoneReady({ allowChrome: true })`); and
> `Find-Adb` / `findAdb` duplicate adb discovery (K1142 Handoff).

What is there today (read it, don't trust this summary). The five
citations stand where the ledger says (the 120 s window's credit,
the not-ready state holding the window at zero, `QUIET_S`, the
`STATE_CMD` comment, the launcher test in `frontKind`); the file it
names is not on master. One more live citation of the same deleted
file stands at `scripts/phone_pass.ps1` line 72 (the `-QuietS`
default's credit), and the test's own title at
`test/phone_pass/phone_ready.test.ts` line 58 ("asks for exactly the
three reads phone_quiet.mjs made") names it too. The dated design
docs that name it are the historical record and stay as they are.
For K1148: none of the three tools calls `ensurePhoneReady` today.
`bench_frame.mjs` connects over `--cdp` and closes its tabs when
done; `k923/sync.mjs` connects over `--cdp` only under
`--target phone` (its desktop target launches its own Chrome);
`k923/close_tabs.mjs` connects to the 9222 forward and closes only
its own port's tabs. All three need Chrome already in front by
design (K1142's "Not changed" table says why they were left
hand-run). Their option parsers take values for every `--key`, so a
bare `--ready` flag needs its own parse case in each. The runners
scan in `phone_ready.test.ts` cannot see these three: none of them
opens anything with `am start` or `input`, they attach over CDP.
On adb discovery: `scripts/phone_pass.ps1`'s `Find-Adb` and the
module's `findAdb` are copies (the pass hands its path over with
`--adb`), and `scripts/phone.ps1`'s own `Find-Adb` reads in a third
order (the path first; no running-server lookup, no `$env:ADB`).
This run splits the fold out (below): it changes none of the three.

Tasks, in order (ports 5500-5509, unused; no server, no phone):

1. The before table: `git grep -n phone_quiet -- scripts test`
   names every live citation (the dated design docs and `LEDGER.md`
   itself excluded, as history), and a read of the three tools
   names what each connects to before it does any work, and that
   none calls the shared check. The table is those two lists.
2. K1152, comments only. In `phone_ready.mjs`, the five cited
   comments say what the check does in its own words (the window's
   length and what restarts it, the not-ready state holding it at
   zero, `QUIET_S`, what `STATE_CMD` reads, the launcher test), with
   no file name and no commit hash. The same one-line credit in
   `scripts/phone_pass.ps1` (line 72) goes the same way. In the
   test, the line-58 title drops the deleted file's name; its three
   assertions do not change. No constant, string or verdict text
   moves: the suite's existing pins on `STATE_CMD`, `QUIET_S` and
   the verdict lines are the check.
3. K1148's flag. Each of the three tools gains a `--ready` flag
   (in its usage header too): before it connects to anything, it
   calls `ensurePhoneReady({ allowChrome: true })` from
   `scripts/phone_pass/phone_ready.mjs` (a static import; the module
   runs its CLI only when it is the main file). On
   `PhoneNotReady` it prints the verdict line and exits with the
   error's exit code, having connected to nothing. In
   `bench_frame.mjs` the flag is only valid with `--cdp` (without
   it the tool launches a desktop Chrome: exit 2 with a line saying
   `--ready` guards the phone connection); in `sync.mjs` only with
   `--target phone` (with the desktop target, exit 2 the same way).
   Without the flag every tool behaves exactly as today.
4. The pins. In `test/phone_pass/phone_ready.test.ts`, beside the
   runners scan: a describe for the three tools asserting each
   one's text carries `--ready`, an `ensurePhoneReady` call and
   `allowChrome: true`, and that `phone_ready.mjs` (and
   `scripts/phone_pass.ps1`) no longer contain `phone_quiet` or the
   rebased hash. Prove the pins catch the before shape on a scratch
   copy of the fixtures' text (rule 9's method; the tracked files
   are restored before any commit if touched at all). Then parses
   only: `node --check` on the three tools and `phone_ready.mjs`,
   and the one dry run `node scripts/bench_frame.mjs --ready
   http://127.0.0.1:9/` (no `--cdp`: it must exit 2 on the flag's
   own line, having run no check and connected to nothing).

Exception (the drafting brief's phone rule): this run runs no phone
tool against the phone. `node --check` and the usage dry run in
task 4 are the only executions of the changed tools, and neither
opens anything on the phone.

Done:

- No live script or test names the deleted file or the rebased
  commit; the check's comments state its behavior in its own words,
  and the existing verdict and constant pins pass unchanged.
- Each hand-run tool, with `--ready`, would run the shared check
  with `allowChrome: true` before connecting, and exits with the
  check's code on its verdict; the pins catch the before shape.
- The parses and the dry run read as task 4 says; `npm test` passes.

Report: the before and after tables (citations, and what each tool
does with and without `--ready`), and the parse and dry-run lines.

File the adb fold, as written:
`ledger.mjs add --section Residuals --text "Two adb lookups: scripts/phone_pass.ps1's Find-Adb and scripts/phone_pass/phone_ready.mjs's findAdb are copies (the pass hands its path over with --adb); fold them when either changes (K1142 Handoff, split from K1148). scripts/phone.ps1's own Find-Adb reads in a third order beside them."`,
then close both items for the halves done:
`ledger.mjs done K1152 --commit <sha8> --what "phone_ready.mjs states its check in its own words (no deleted file, no rebased hash)"`
and `ledger.mjs done K1148 --commit <sha8> --what "--ready guards bench_frame --cdp, k923 sync --target phone and close_tabs; the adb fold split out"`.
Suggested ports: 5500-5509 (unused).

## Run C · K1155: the phone tunnel finds the phone among Tailscale's online peers

Read first: `.claude/rules/probes-phone.md`; then
`scripts/phone.ps1` whole (it is short; its header is its usage),
`Find-Adb` beside the function this run changes, the K170 scan for
this same file in `test/phone_pass/phone_ready.test.ts`, and the
Windows-only pwsh test shape in `test/phone_pass/k895.test.ts` (its
`it.skipIf(!onWindows)` is this run's test's shape).

The ledger says (Residuals):

> **K1155** · `scripts/phone.ps1`'s `-TailscaleHost` default (8320cde2) is the phone's tailnet machine name,
> in a public repo. Find the phone among `tailscale status --json`'s online peers instead, the param kept as
> the override; a fixture with made-up names tests it.

What is there today (read it, don't trust this summary; do not quote
the current default in the commit or the report — it is the thing
being removed). The param block defaults `-TailscaleHost` to the
phone's tailnet machine name, and `Find-TailscaleIp` returns the
first IPv4 of the peer whose DNS label or `HostName` equals it,
without asking whether that peer is online. The comment beside the
match gives the same name as its example. Nothing else reads the
param: `-Wireless`'s error names it, and the USB path never touches
it. (The same name stands in `scripts/phone_pass.ps1` three times —
its `$tailscaleHost`, the match comment and the `-Serial` help.
That file is not this item's; the split at the end files it.)
Tailscale's documented `status --json` shape is enough for the
fixture: a `Peer` map whose values carry `HostName`, `DNSName`,
`OS`, `Online` and `TailscaleIPs`. Do not run `tailscale` to see a
real peer, and copy no real peer's name, address or key anywhere.

Tasks, in order (ports 5510-5519, unused; no server, no phone, no
`tailscale` run):

1. The before table: a read of the script names every place the
   real name stands in it (the param default and the comment
   example: two), what `Find-TailscaleIp` matches and does not
   check (no `Online`), and what each outcome does downstream
   (the Tailscale serial preferred, USB otherwise, `-Wireless`
   refusing without a Tailscale IP). It names the places, never
   the name.
2. The finder. The peer choice becomes a pure function of the
   parsed status, `Select-TailscaleIp($status, $hostOverride)` in
   `scripts/phone.ps1`, and `Find-TailscaleIp` keeps only the
   `tailscale` call and hands it the status and `$TailscaleHost`.
   With an override, today's match stands as it is (the DNS label
   or the `HostName`, the first IPv4). With none, the phone is the
   one online peer whose `OS` is android: exactly one such peer
   yields its first IPv4; none, or more than one, yields `$null`
   (the USB path, and `-Wireless`'s refusal, as today). The param
   stays, defaulting to `""`; `-Wireless`'s error without an
   override names no host. The comment example becomes a made-up
   name. Nothing else in the script moves: the tunnels, the
   opt-in wake (K170), the keyguard warning, the DevTools listing.
3. The fixture test, in a new `test/phone_pass/phone_tailscale.test.ts`.
   Its scan half (every platform): the param block defaults
   `[string]$TailscaleHost = ""`, and `Select-TailscaleIp` reads
   `Online` and the android `OS`. Its behavior half
   (`it.skipIf` off Windows, as K895's tests do) runs `pwsh` on a
   harness that takes `Select-TailscaleIp` out of the script's own
   parse tree (the function only; the script body never runs) and
   feeds it a made-up status: a laptop and a tablet beside the one
   online android phone (its IP is chosen); a second online
   android (nothing is chosen); the android peer offline (nothing);
   an override naming an offline peer's DNS label, and one naming
   a `HostName` (both choose it, as today); a chosen peer with no
   IPv4 (nothing). Every name and address in the fixture is
   invented. Then a parse, and only a parse: the PowerShell
   language parser over `scripts/phone.ps1`, reporting no errors.

Exception (the drafting brief's phone rule): this run never runs
`scripts/phone.ps1` or `tailscale`. The fixture harness runs the
extracted function on invented data, and the parse opens nothing.

Done:

- The script carries no real peer name and defaults
  `-TailscaleHost` to `""`; with no override it picks the one
  online android peer, and is undecided (USB, as today) on none
  or several.
- The fixture table passes on Windows and skips off it; the scan
  half passes everywhere; the parse is clean.
- `npm test` passes.

Report: the before and after tables (places and matches, no real
name), and the parse result.

File the other copy, as written:
`ledger.mjs add --section Residuals --text "scripts/phone_pass.ps1 carries the phone's tailnet machine name in three places (its tailscaleHost variable, the match comment and the -Serial help); find the phone the way K1155 finds it in scripts/phone.ps1, or pass the name in (split from K1155)"`,
then close:
`ledger.mjs done K1155 --commit <sha8> --what "scripts/phone.ps1 finds the phone among online android peers; -TailscaleHost is the override, default empty"`.
Suggested ports: 5510-5519 (unused).

## Run D · K1154: the physics-off load's wall cap counts visible time

Read first: `.claude/rules/physics-worker.md`,
`.claude/rules/physics-settle.md` (where it says both phases' wall
caps count visible time), `.claude/rules/probes.md`; then the load
path in `src/physics/physics_host.ts` (`beginLoad`, `loadFrame`,
`endLoad`, the `loadWall0` field, and beside them the pre-settle's
and the budget's `VisibleClock`s in the same class), `VisibleClock`
and `FRAME_GAP_MS` in `src/physics/settle_budget.ts`,
`beginLoad`/`loadFrame`/`endLoad` and the `loadInfo` field in
`src/physics/worker_host.ts` (and its `settleClock`, which the
pre-settle's elapsed already ticks), the worker's settle job in
`src/physics/physics_worker_core.ts`, and the load and clock cases
in `test/physics/physics_host.test.ts`,
`test/physics/worker_host.test.ts` and
`test/physics/settle_budget.test.ts`. The drafting brief's bound
holds: this run keeps `test/physics/physics_host.test.ts` and
`test/physics/byte_identity.test.ts` green unchanged — the stepping,
its order and every physics constant stay exactly as they are.

The ledger says (Residuals):

> **K1154** · Loader clocks: the physics-off load's wall cap counts hidden-tab time (PhysicsCore's loadWall0
> in src/physics/physics_host.ts, and the worker host's loadInfo in src/physics/worker_host.ts beside it — the
> pre-settle already counts visible time with VisibleClock; split from K165)

What is there today (read it, don't trust this summary). In
`PhysicsCore`, the pre-settle and the budgeted settle already count
visible time (`presettleClock`, `budgetClock`: gaps over
`FRAME_GAP_MS` between ticks are not counted). The physics-off load
does not: `beginLoad` stamps the raw `loadWall0`, `loadFrame` ends
the load when `performance.now() - loadWall0` passes
`LOAD_WALL_CAP_MS`, and `endLoad` reports that raw span as
`loadMs`. A tab hidden for an hour mid-load therefore ends the load
by its last-resort cap on the first frame back, however little it
has settled, and reports the hour as load time. The worker host's
`loadInfo` keeps the same raw pair for the worker path's reported
`loadMs` (`beginLoad` stamps `wall0`, `endLoad` subtracts); the
worker's own cap is the core's, in the worker. The header comment's
claim that both phases' wall caps count visible time is true of
the pre-settle and the budget, and false of this load.

Tasks, in order (ports 5520-5529, only if a read needs a server):

1. The before table, as a failing test first, in a new file
   (`test/physics/load_clock.test.ts`), so that
   `test/physics/physics_host.test.ts` stays byte-unchanged. In
   that file's manner, drive an in-thread physics-off load (`?7&gs=6`, as the existing load
   case does) with `performance.now` stubbed: a fake that advances
   a few ms a call, and one jump of an hour between `beginLoad`
   and the first `loadFrame`. The before table: the first
   `loadFrame` after the jump returns "done" by the wall cap with
   the sim barely begun, and `endLoad`'s `loadMs` holds the hour.
   (If the stub cannot drive the chunk loop, say so in the report
   and let the `VisibleClock` case in `settle_budget.test.ts`
   stand as the clock's before table; do not weaken the load
   case to fit the stub.)
2. Visible load clocks. In `PhysicsCore`, a `VisibleClock` beside
   the pre-settle's replaces `loadWall0`: `beginLoad` starts it,
   `loadFrame` ticks it (at least once a slice) and reads the cap
   and `endLoad`'s `loadMs` from it. In `WorkerHost`, the worker
   path's `loadInfo` reads the same way (its own visible clock,
   ticked from its `loadFrame` and `endLoad`, beside the
   pre-settle's `settleClock`). No stepping line, order, cap value
   or gate changes: until a cap trips, the sequence of steps is
   the old one. The comments that say what the cap counts say
   visible time now, in both files.
3. The after table: the task-1 test on the fixed code — after the
   hour's jump the load is still running, it ends as the existing
   load case ends (sleep or the sim cap, on both hosts in
   lockstep), and `loadMs` excludes the jump. A matching fake-
   worker case in `test/physics/worker_host.test.ts` reads the
   worker path's `stats().loadMs` the same way, if its load can
   be driven there; if not, say so and the in-thread case stands.

Exception (K1050's stop rule 2): the edit lives under
`src/physics/`, in the two hosts' load clocks only. It takes the
exception because the drafting brief names this clock, not the
simulation; any change to a stepping line, a constant or the
gate is out of the exception and stops the run.

Done:

- After table: a hidden hour mid-load ends nothing; the load ends
  as before, and both hosts' reported load times exclude hidden
  time.
- The lockstep load case and every other physics test pass with
  their expected values unchanged; `test/physics/byte_identity.test.ts`
  passes unchanged.
- `npm test` passes.

Report: the before and after tables, and how the worker path's
clock was checked.

Close: `ledger.mjs done K1154 --commit <sha8> --what "the physics-off load's wall cap and reported time count visible time (both hosts)"`.
Suggested ports: 5520-5529 (if any).

## Run E · K351: the panel inventory's Read by column follows the `*Of` helpers

Read first: `.claude/rules/gameplay-panel.md`,
`.claude/rules/gameplay-links.md`; then
`scripts/panel_inventory.ts` whole (its header is its usage; the
Read by column is `readersOf`, over the `PLUMBING` set), the
settings builders in `src/ui/url_state.ts` (`clockOf`,
`minoClockOf`, `beatSettingsOf`, `fireSettingsOf`, `fabricRulesOf`,
`pathVizOf`, `turnMinoParamsOf`, `chaseParamsOf`), and the column's
text in `docs/design/K339_inventory.md`. The rules files for the
panel's rows themselves are not this run's: no row, default or
meaning changes.

The ledger says (Residuals):

> **K351** · The "Read by" column of K339's inventory
> (`scripts/panel_inventory.ts`, `docs/design/K339_inventory.md`) misses
> params read through the `*Of` helpers.

What is there today (read it, don't trust this summary).
`readersOf` counts literal `.key` hits in `src` outside the
plumbing files (panel, `url_state`, the codec, `daily_link`).
Params consumed only through a `url_state` settings builder are
read as `p.<key>` inside the builder — in the plumbing, so
uncounted — and their callers name the builder, not the key
(`beatSettingsOf(p)` in place of `p.beatTempo`). Those rows read
"none found" (45 rows on a fresh inventory at the drafting read,
among them `beatLength` and `beatCap` through `beatSettingsOf`,
`fireSpeed` and `fireDelay` and their realtime pair through
`fireSettingsOf`, and the minotaur rows through
`turnMinoParamsOf` and `chaseParamsOf`), so the column cannot be
trusted to find a param's readers. The builders differ in shape:
most take a `Pick<UrlParams, ...>`, `fireSettingsOf` an `Omit`, and
`beatSettingsOf` and `minoClockOf` reach `clockOf`'s keys through
it. What each reads is in its body, as `p.<key>`, whichever shape
its signature takes.

Tasks, in order (ports 5530-5539, if a read needs one):

1. The before table. Run the inventory to a scratch file
   (`node scripts/run_node.mjs --config scripts/panel_inventory.vite.config.mjs scripts/panel_inventory.ts .claude/probes/K351/inventory_before.md`)
   and record: the count of rows whose Read by reads "none found"
   (45 at the drafting read; state yours), and for five named
   keys — `beatLength`, `fireSpeed`, `fireDelayRt`, `minoSpeed`
   and one `fabricRulesOf` key of your read — the builder that
   reads each and the files that call that builder (by search).
   That is the stand the fix is measured against.
2. Follow the builders. `readersOf` also counts a file that calls
   one of `url_state`'s settings builders as a reader of every
   key that builder's body reads (`p.<key>` in the builder, and
   a builder it calls in turn — one hop, as `beatSettingsOf`
   calls `clockOf`), the call counting once per call site beside
   the literal hits. The builders are found in `url_state`'s
   text (an exported `<name>Of` taking the params), not listed by
   hand, so a new builder joins on its own; a key no builder and
   no literal read still reads "none found". The column's header
   text in the script says the helper reads count beside the
   literal ones. No other column's rule changes.
3. The after table. Regenerate `docs/design/K339_inventory.md`
   (the script's default output) and diff it against task 1's
   scratch file: the "none found" count drops to the number you
   state, the five named keys of task 1 now name their builders'
   callers, no row that had a reader loses one, and outside Read
   by (and the generated-from line) no row differs. Report which
   rows keep "none found", and why each is truly unread, if any
   of the drafting read's 45 survive.

Done:

- After table: the five named keys name their callers, the "none
  found" count is stated and lower, and no other column moved.
- `docs/design/K339_inventory.md` is the regenerated file, not
  hand-edited.
- `npm test` passes (the panel suites among them, unchanged).

Report: the before and after tables (counts, the five keys), and
the survivors, if any.

Close: `ledger.mjs done K351 --commit <sha8> --what "the panel inventory's Read by follows url_state's *Of builders"`.
Suggested ports: 5530-5539 (if any).

## Run F · K392 (the seam half): the host seam sees nested and element-access writes

Read first: `.claude/rules/physics-worker.md` (where it names this
test), `.claude/rules/probes.md`; then
`test/physics/host_seam.test.ts` whole (`seamViolations`, its
planted-case describes, and its header's own list of what is not
caught). This run takes the seam half of K392 only; the probe
hooks' long lines stay in the item (the close lines say how).

The ledger says (Residuals):

> **K392** · K5 M1's code residuals: `host_seam.test.ts` matches names and misses nested
> binding patterns and element access; 25 lines of `src/app/probe_hooks.ts` pass 80 columns.

What is there today (read it, don't trust this summary). The scan
parses `main.ts` and `src/app/` with the TypeScript parser and
reports mutators, array mutators and assignments through aliases
of the system or the host. Two shapes pass it unseen. A nested
binding pattern binds no name: `const { scene: { ps } } = ctx`
(and the parameter form `({ scene: { ps } }: ProbeCtx)`) is
skipped, because a binding element whose name is itself a pattern
is not an identifier, so nothing the pattern binds is ever
collected. And element access names no system: `deps["host"]`,
`ctx["scene"].ps` and `host["view"]` are not property accesses, so
`isHost` and `isSystem` refuse them at the root (a member chain
past the root, `ps["positions"].set(...)`, already reads, through
`reachesSystem`). Nothing in `main.ts` or `src/app/` writes in
either shape today (the scan reads none, and the alias the shapes
would hide does not exist), so this is a guard that cannot yet
see its own blind spot, not a live write. The item's second half
(25 lines over 80 columns in `src/app/probe_hooks.ts` at filing;
46 at the drafting read) has no gate anywhere in the repo and
stays open in the item.

Tasks, in order (ports 5540-5544, if a read needs one):

1. The before table, in the test's own manner: the planted cases
   of task 2, run against today's scan, report zero violations
   each while their property-access twins report one. State the
   pairs in the commit; a pair that already reports today is not
   evidence (drop it and say so).
2. See the two shapes. `seamViolations` collects what a nested
   binding pattern binds (the system and host fields at any depth
   of it, renamed or not, in a declaration or a parameter), and
   reads an element access with a literal key as the property
   access it is, at a chain's root as well as past it
   (`deps["host"]`, `host["view"]`, `ctx["scene"].ps`). Planted
   cases in the existing describes' manner pin each: a mutator,
   an array mutator and an assignment through the nested binding;
   the same three through an element-access root; an alias taken
   through either (`const h = deps["host"]; h.view.step(...)`).
   And the negatives stay silent: a nested pattern over an
   unrelated object, an element access on an unrelated name, and
   every read the suite already lets through.
3. The real tree still reads clean: the full-file scan of
   `main.ts` and `src/app/` reports no violation, and no expected
   value anywhere changes. If the wider net catches a real write
   on the real tree, stop under K1050's stop rule 2 (the write,
   not the test, is then the task) and report it.

Done:

- Before table: each new planted pair reads 0 today for the new
  shape and 1 for its twin; after, both read 1.
- The negatives stay silent, and the scan of the real tree still
  reports none.
- `npm test` passes, this file's existing cases unchanged.

Report: the before and after pairs, and the negatives.

Close nothing: the long-lines half is still open. `ledger.mjs`
has no command that rewrites an item's text, so don't edit K392 by
hand: give its new line in your report, with the long-line count
your run measured, and Claude applies it after the batch:
`**K392** · K5 M1's code residual: <N> lines of src/app/probe_hooks.ts pass 80 columns (the host seam's nested and element-access blind spots closed in <sha8>)`.
If the new shapes cannot be seen without false positives on the
real tree, stop under K1050's stop rule 1 and say so in the report
instead.
Suggested ports: 5540-5544 (if any).

## Run G · K685: a respawn into a rule loss shows its banner at once

Read first: `.claude/rules/gameplay-mechanisms.md` (FRAGILE RUNS
AND PAR, and the respawn beside it),
`.claude/rules/gameplay-minotaur.md`, `.claude/rules/probes.md`;
then `respawn` and `judge` in `src/game/fabric_controller.ts`,
`createRuleLoss` (`afterMove`, `over`, `show`,
`tapWhileOver`) in `src/app/rule_loss.ts`, the two catch sites in
`src/main.ts` that call `respawn` (`tickChase`'s `endCaught` and
the turn catch beside it, each with its K139 line), the frame
loop's loss slot in `src/app/frame_loop.ts`, and the stranded
fixture in `test/game/fragile.test.ts` and the collapse-mode
respawn case in `test/game/collapse.test.ts` to copy.

The ledger says (Residuals):

> **K685** · K137: with collapse off, a respawn into stranded (fragile) or out of strokes (strict
> par) shows no banner until the next tap (found by K139).

What is there today (read it, don't trust this summary). The
controller already judges on respawn: `respawn()` returns the head
to the start with the breaks kept, and `judge()` sets `stranded`
(fragile, from the start's runs left) or `parLost` (strict, a loss
that stays lost) from the new head. The banner is what lags. A
move queues it (`afterMove` answers `stranded || parLost`, and the
caller sets `pendingLoss`, which the frame loop shows on arrival);
a respawn queues nothing. In both of `main.ts`'s catch sites the
line after `respawn` reads `else if (fc.collapseOn &&
ruleLoss.over()) pendingLoss = true;` — the K139 free-collapse
case, gated on the collapse mode this item has off — so a catch
that respawns into a stranded or out-of-strokes start shows the
caught toast and no loss banner, and the banner waits for the next
tap (`tapWhileOver` at the tap site, which is the behavior the
item reports). In collapse modes the queue already fires; this
run changes nothing there.

Tasks, in order (ports 5545-5549, headed real-time Chrome only if
task 3 runs):

1. The before table, from the pure controller alone: on the
   fragile fixture (`test/game/fragile.test.ts`'s RUNS graph,
   `fragile: "snap"`), walk the stranding taps (0, 3, 4, 1), then
   `respawn()`: record the head, `stranded` and `choices()` — the
   respawn is judged stranded at the start. A second row does the
   same for strict par (a controller whose strokes are spent:
   respawn, then `parLost`). Beside both, the code read: neither
   catch site queues the loss with collapse off. The table is the
   judged state against the queue that never fires.
2. Queue it. At both catch sites in `main.ts`, the respawn's loss
   queues as a move's does: when the respawn solves nothing and
   `ruleLoss.over()` holds, `pendingLoss` is set — the
   `collapseOn` gate goes, and the solved → `pendingWin` order
   above it stands. The catch itself (toast, heart, yarn, ghost,
   beat rest, minotaur re-sync) does not move. Tests: in
   `test/game/fragile.test.ts`, the task-1 fixture after respawn
   is stranded with collapse off (and a strict-par twin in its
   own file, if the par fixture sits elsewhere), and a
   source-scan test in `test/app/` (in the `panel_rect.test.ts`
   manner) pins both sites: the `respawn` calls' loss line reads
   `ruleLoss.over()` with no `collapseOn` beside it.
3. A page check as a second, headed confirmation (not the gate):
   in `.claude/probes/K685/`, a minotaur design with fragile runs
   on (a full design link, per `probes.md`), drive a catch whose
   respawn the before table strands, and read the banner
   (`#maze-banner`) before any tap. If a stranded respawn cannot
   be driven on a real maze in reasonable tries, report that and
   let task 2's tests stand as the gate — do not settle for a tap
   after the respawn as the check (that is today's behavior).

Done:

- Before table: the respawn is judged stranded (and out of
  strokes) with collapse off, and no queue fires; after it, both
  catch sites queue the loss, and the banner shows on arrival
  with no tap in between.
- Collapse modes behave exactly as before (their cases pass
  unchanged); the caught toast and the rest of the catch do not
  move.
- `npm test` passes.

Report: the before and after tables, and how the banner was read.

Close: `ledger.mjs done K685 --commit <sha8> --what "a respawn into stranded or out of strokes shows its banner without a tap"`.
Suggested ports: 5545-5549.

## Left out on purpose, for a later batch

Not for Muse, or not now (candidates in the order the header
names: Approved first, then the Residuals read in ledger order
through K685; each is named, with its reason. Batch 12's own "Left
out on purpose" list was checked the same way, and none of its
items is revived here without saying why):

From Approved, to schedule (batch 12's reasons, re-checked; none
has since become possible):

- K22 (the dynamic resolution scaler): its record still puts it
  after G3 (`docs/design/G3G4_sdf_geometry.md`: K22's scaler comes
  after G3, K23 is G3-5), and the G3 lane is still open (K8 in
  progress; its next, G3-3, waits on Levi's phone look and a phone
  render-sync measurement). Its check is still a frame-time table
  on the phone. No desktop stand here.
- K23 (GPU particles, GPU fog-of-war accumulation, the yarn as a
  gap-masked ribbon): G3-5 on the same open lane as K22, in the
  thread renderer's GPU performance, which this batch keeps off
  limits.
- K322 (art, sound and music by people): commissioning and
  licensing is still Levi's budget and taste, with no unit test
  or desktop probe to decide it. The credits page still carries
  its art section (`notices/credits.ts`, its K321 entries), so
  there is no waiting code half for a Muse run.
- K805 (the dot-eater mode): both of its gates still stand. The
  paper look's next stage (K797's textures, perf-gated) is still
  to build in Next, and K804's dots are still their own item
  (K1149, in Next, not done), which K805 builds on.

From the Residuals, in ledger order (the last read is K685;
batch 14's draft starts after it):

- K315 (`__knotPhys`'s slide stats read nothing on the mirror):
  its fix is a diagnostic bridge or a worker-side count in the
  physics worker's snapshot path — the physics lane, with the
  choice between the two still the item's own open "decide".
  No decided shape to build to.
- K319 and K342 (ANGLE's Vulkan answer on phones; the snore
  link on Android Chrome and Safari): phone and other-browser
  checks. No desktop stand here.
- K348 (seven key-move edges at once), K205's family in miniature:
  unlike things (the X assignment past `KEY_TIE`, a short hold's
  pause, a mid-move wait tap, four smaller) with no one Done
  check. Split it first, as batch 12 said of K205.
- K349, K374, K375, K391, K420, K422, K425, K457, K476, K504,
  K508 and K639 (stale, broken or sheet-blind probes and probe
  scripts): the files are untracked under `.claude/probes/`, so
  there is nothing tracked to commit or test (batch 12 said the
  same of K123's family). K374's ports also wait to be needed.
- K354, K355 and K356 (the pluck blur's dark star, staircase
  bands and straight clip): the pluck overlay's shader, in the
  thread renderer's lane this batch keeps off.
- K358 (a worker-only package reaching the notices collector):
  its own trigger has not fired — nothing depends on it yet, and
  the item says to add the check when one arrives.
- K363, K424, K494, K537, K652 and K663 (the thread reveal's
  restore, junctions, covered ends, census and telegraph): the
  reveal lane, which batch 12 left in K287's family, and bundles
  besides. K364 (the fog intro's zoom) was never investigated
  and names no fix; its probes are the same lane's.
- K367, K378 and K382 (ripple phases, a bisect for a grown long
  task, the untimed first burn): measurements with no fix named
  in the item, two of them in the fire and reveal lanes.
- K379 (a phone cold start that keeps storage): the phone.
- K380, K433, K540, K547 and K542 (G3 table costs, one-level
  compositing, the cold-compile regression, the owed GPU
  censuses): the G3 and GPU lanes, off limits here.
- K384 (the burn's three leftovers): a bundle — the pick under
  char is a feel for Levi, `pieceVis` is the reveal lane, and
  the Pixi attribute warnings are GPU attribution. Split first.
- K385 (the crbug draft): Levi submits it; the code half shipped.
- K386 (K307's small residuals): a bundle of probe-time
  observations behind the warm-up lane, no one fix.
- K387 (the flow's half-rate cost on the phone): the phone, and
  its named fix is shader displacement (the GPU lane).
- K388 (the reveal's probe residuals): untracked probe kit.
- K390 and K435 (the fog A/B recipe; two lore lines the code
  contradicts): `.claude/rules/` edits, which a Muse run does
  not make (K1050's rules; batch 11 said the same of K999).
- K405 (a pluck loop tip's radius envelope): the pluck look; its
  measures are in the render-pluck lane.
- K407 (dead probe links since the defaults moved): re-pinning
  probes and lore is the same rules-and-probes edit, and the
  loop it cites no longer reproduces.
- K427 and K428 (a warm-up check that only reads on dev builds;
  reveal A/Bs that do not repeat): probe-method items with no
  code defect named; K428's unpinned clock is the reveal lane's.
- K431 and K432 (probe stillness; a backdrop that went black
  twice): probe stands to re-run under the perf lock, no fix
  named; K432's sheets are the reveal lane's too.
- K439 and K464 (the renderer's facade homes): the ribbon split's
  own lane (R5 and its neighbours), which this batch keeps off.
- K444 (the start marker's gap slot and the exit marker's fade):
  marker drawing in the render lane; the fade is a look.
- K445 (the burn sim's two gaps): an untracked sim's fidelity and
  an unmeasured human quantity; no fix to land.
- K446 (the fire clock after a replay): unreachable today, by its
  own text — only dailies replay, and they run with the fire off.
- K450, K451, K452 and K453 (tugs and plucks under the reveal;
  the stub dots' cap; the survey's flags): the reveal lane, and
  the last two inferred or uninspected, not seen defects.
- K455 (the worker's exact sleep state never drawn): inferred,
  in the physics host's frame path; K6's GEOM gating is its
  named owner.
- K458 (the wall-clock audit's list): a constraint written for
  K6-3's stopped ticker, which has landed; no defect stands in
  the item itself.
- K460 (phone probe tooling): a bundle whose wake half K170 has
  since fixed and whose tool-guard half Run B takes in K1148's
  shape; the rest is phone-pass kit for the next pass.
- K473, K474 and K475 (a stub host, a notch, a slash band):
  unverified, unattributed and unconfirmed, in the reveal and
  stub lane. No defect stands to fix.
- K477 (the free cap's remaining checks): the phone free-end
  look and its strict A/B, riding K459's lane.
- K484 (the sheet's three history races): three unlike cases —
  a stale entry after reload, an extra entry on a fast
  close-then-reopen, a gesture-less push on a live switch. The
  pure test already pins the reopened sheet not closing; what
  remains is browser history-stack counting (a desktop stand
  could be built, but the third case is Chrome's gesture policy,
  which no state machine in `panel_sheet.ts` decides). Split it
  first, with a browser stand for the two countable cases.
- K487 (sheet-blind shipped probes): untracked copies already
  exist in K467's probes; nothing tracked to change.
- K491 (the exit marker over unseen thread): pixel-verified only
  on the desktop; the missing check is a phone walk.
- K497 and K498 (tap preference): the first is a real-touch
  phone check; the second reports limits (`HEAD_EXCLUDE`'s cap,
  a 0.066% sample case) with no fix or tolerance stated.
- K503 (the G3 probe hooks' home): the ribbon facade again (R5's
  lane), waiting on the same R3/R4 homes as K439.
- K506 (stage M4's leftovers): a bundle of getter plumbing, a
  probe-context widening, stale lore (a rules edit) and a probe
  harness wait. No one Done check covers it.
- K512 (a cross-build pairing that must pin the legacy look):
  a probe recipe note; the fix is in the pairing, not the code.
- K520 (legacy timing harnesses): "rerun when next needed" is
  the item's own trigger, unfired.
- K511 (K334 superseded by Levi's correction): intentional as
  built; nothing to fix.
- K528 (census drift against the first mode-off frame):
  "localize only if it grows" — its trigger has not fired.
- K535 (the first tap's 39 ms): its traced halves are a
  first-gesture AudioContext (gesture-gated by the platform) and
  a first fabric paint re-declare in the fillet rebuild — the
  joinery lane this batch does not touch.
- K538 (pluck footprints step at vis 0.5): by design in its
  stage, its own text says so.
- K555, K556, K560, K562, K583, K621, K622 and K642 (glyph,
  emblem, text-thread and taper residuals): the cursive and
  text lane, off limits here, most of them waiting on K115's
  stage 9+ set.
- K564 and K565 (titled dailies' invariant warning; a live edit
  that does not rebuild a titled daily): the titled-daily lane
  rides K115's glyphs (K552), and K565 was read from code, never
  exercised — its first step is a stand this batch has no run
  shaped for.
- K574, K594, K613, K614 and K615 (phone sync costs, phone kit
  flakes, input queues): the phone, and the physics input lane.
- K575 (a build that does not build, mid-bisect): a hazard note
  for a future bisect, not a fix.
- K576 (two worker loads freezing at different sim times): its
  fix idea is a fixed-substep sleep grid, in the physics
  simulation this batch keeps off (Run D's load clock is the
  drafting brief's one exception, and it is not this).
- K588 (the confetti palette's warm white): a still-frame look
  for Levi.
- K596 (fabric awake after a drag): physics; its fix is K595's,
  in the same lane.
- K602 (K456's five loose ends): five unlike untested things (a
  shader-compile flag, a failed WebGL start, notes after a loss,
  a focused panel field, a phone watch). Split it first.
- K604 (`mf=0` reloads in maze mode): moot once K326 drops knot
  mode, by its own text; that drop has not landed.
- K605 (one destroyed-context flake): not seen again; nothing
  stands to fix.
- K607 (clipped screenshots losing layers): a probe workaround
  already in place (full-frame shots); the cause is unproven
  and puppeteer's, not the app's.
- K608 (a darker sliver at a hover seam): undiagnosed, in the
  hover render lane.
- K612 (the worker's substeps costing 1.2x in-thread): physics
  stepping cost, K370's lane. K619 (an untimed live-physics
  link): a measurement with no number to meet.
- K632 and K633 (pluck sites under the reveal; a site drawn
  0.3 s after its test): the reveal lane; K633's own census
  reads 0 misses in 844 notes.
- K638 (the queued fleer's escape rate): a balance measurement
  against its baseline, with the tuning call Levi's.
- K640 and K641 (the catch travel's early state; three older
  catch quirks): K546's catch-effects lane, in progress in its
  own item; bundles besides.
- K648 (the streamers' sag; a cannon's arc on the phone):
  frame-rate feel and the phone.
- K659 (the star thresholds look stale): thresholds are a
  balance call on a sim's medians — Levi's, with no number in
  the item to meet. K660 (its stale sim kit) is untracked.
- K665 (a fog check that varies run to run): probe noise in
  K206's fog-restore family; the guessed cause is untested and
  the fog lane is the reveal's neighbour.
- K668 (the stalker's charging reads as wander): a distinct
  stalk state is a new mode through the renderer (its glow
  table is exhaustive over the modes) and the HUD's words — the
  look and wording of a state the item does not name. Levi's
  call first.
- K669 (the guard skipping a shorter route out of its
  territory): routing the guard outside its territory is the
  territory design itself (`MinotaurChase` roams and is routed
  through it); whether a hunt may leave it is a balance call,
  not a defect with a Done check.
- K670 (a probe's wrong label): untracked probe text.
- K673 (an awake knot's frame, the first sleep's cost): K611's
  drag-frame lane and the phone; physics stepping cost.
- K677 and K679 (a cursive cusp and square-step; a minotaur glow
  fix with no pixel proof): the first is the cursive lane; the
  second asks for a headed real-GPU probe of a fix already
  landed — verification for Claude's lane, no code to change.
- K682 (collapse par's longest-trail search runs out): proving
  the maximum needs a stronger bound — research, not one run's
  fix. K684 (collapse par read synchronously): its measure is a
  phone estimate and its fix (a worker or an idle slice) reopens
  the par API's shape, a design first.
- K683 (the collapse banner's rows, the exit marker in free
  mode, a Burnt loss's missing score): three unlike UI
  leftovers; what a free game's banner should show in place of
  path and optimal is a copy call, and the marker is a look.

Everything after K685 in the Residuals, and every other section,
was not read for this draft. What batch 12's list skipped before
K308 (junctions, the cursive, physics, the GPU lane, phone passes,
items waiting on Levi and items In progress, K1040's field and
probes among them) stays skipped on the same reasons, re-checked
where the header says.
