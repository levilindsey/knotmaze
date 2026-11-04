# Muse batch 14 (K1161)

Claude starts these runs through Paseo, one run at a time, after batch
13 (`docs/design/K1156_muse_batch13.md`, K1156) was reviewed and
closed. Each run is a fresh Muse agent that reads this brief, does its
run's tasks, and stops. Claude reviews each run on master afterwards
and closes K1161. Run A was the drafting run
(`docs/design/K1161_muse_batch14_run_a.md`), so the runs here are B
to F (five runs; no sixth candidate fit, see "Left out on purpose").

Where the runs came from (the drafting run's order, from
`docs/design/K1161_muse_batch14_run_a.md`): (1) `## Approved, to
schedule` in `LEDGER.md` (K22, K23, K322 and K805) — none fits: batch
13's reasons still hold for each, re-checked below under "Left out on
purpose". (2) The residuals filed since batch 13's draft: K1160 first,
with K1159 sharing its run (both touch `scripts/phone_pass.ps1`, and
no two runs touch one file); they are the only residuals numbered
above K1156 (K1157 and K1158, in Ideas, are K1040's label pass and
stay in Claude's lane, as the drafting brief says; K1161 is this
batch's own item). (3) `## Residuals (known, not fixed)` in ledger
order, starting after K685 (batch 13's draft read through K685).
Residuals were read in ledger order through **K1160** (the last
residual in the section; batch 15's draft starts after K1160). Four
items fit there, whole or in part, in ledger order: K710, K711 (its
(c) only), the desktop half of K732, and K740 (its first gap only). See
"Left out on purpose" at the end for every candidate read and
skipped, and why.

Every task here is decided by a unit test, a dry run or a measurement
table. None needs Levi. Run B changes phone tools but never runs one
against the phone and never runs `tailscale`: a unit test, a parse or
a usage dry run decides each, as the drafting brief requires. No run
changes physics (the simulation), junctions, the cursive, the thread
renderer's GPU performance, or anything in `src/render/field/` or
`.claude/probes/K1040/` (K1040's label pass works there in its own
lane). No two runs touch one file, and each run starts from the
latest master, in the order B to F.

## How to work

Batch 8's "How to work" applies unchanged: read it in
`docs/design/K1131_muse_batch8.md` (its ten rules and the paragraphs
after them, which send you on to `docs/design/K1050_muse_week.md`)
before anything else. Read K1161 wherever it says K1131, and
K1137's rule 11 and K1141's rules 11 and 12 wherever they apply: rule
11 (a re-measurement copies the original stand's link verbatim, read
from the old probe's source, not from a summary of it, and its table
names everything it adds or changes) wherever a stand is copied, and
rule 12 (dependencies: neither run should need a new or changed
package; if one changes anyway, `npm audit` must report no high or
critical advisory afterwards, and a security fix is taken even when
it was published less than two weeks ago) wherever a dependency
moves. Use ports 5550-5599 (each run below names its range).

After each run, update K1161's handle, naming the next run in the
order B to F:
`ledger.mjs handle K1161 --last-commit <sha8> --next "Run <X> done; next Run <Y>"`
(after Run F: `--next "Run F done; batch 14 complete, Claude reviews and closes K1161"`).

## Run B · K1160 + K1159: the phone pass finds the phone, and one adb lookup

Read first: `.claude/rules/probes-phone.md`; then
`Select-TailscaleIp`, `Find-TailscaleIp` and the param block in
`scripts/phone.ps1` (K1155, cbaca79f, is the model; its comment gives
a made-up name as its example), `scripts/phone_pass.ps1` whole (param
block, the script-level tailnet variable, `Find-Adb`,
`Find-TailscaleIp`, `Find-Serial`, `Assert-PhoneQuiet` and the phases
that call `Find-Adb`), `findAdb`, `parseArgs` and `main` in
`scripts/phone_pass/phone_ready.mjs`, and
`test/phone_pass/phone_tailscale.test.ts` and
`test/phone_pass/phone_ready.test.ts` (the fixtures, the K170 scan
and the runners scan at its end) to copy. Do not quote the name the
script holds today anywhere (draft, report, code or commit), and do
not run `tailscale` or any phone tool against the phone.

The ledger says (Residuals):

> **K1160** · scripts/phone_pass.ps1 carries the phone's tailnet machine name in three places (its
> tailscaleHost variable, the match comment and the -Serial help); find the phone the way K1155 finds it in
> scripts/phone.ps1, or pass the name in (split from K1155)

> **K1159** · Two adb lookups: scripts/phone_pass.ps1's Find-Adb and scripts/phone_pass/phone_ready.mjs's
> findAdb are copies (the pass hands its path over with --adb); fold them when either changes (K1142 Handoff,
> split from K1148). scripts/phone.ps1's own Find-Adb reads in a third order beside them.

What is there today (read it, don't trust this summary; name the
places, never the name). `scripts/phone_pass.ps1` holds the phone's
real tailnet machine name in three places: the script-level
`$tailscaleHost` its `Find-TailscaleIp` matches on, the comment
beside that match giving the same name as its example, and the
`-Serial` help line's account of the default. That `Find-TailscaleIp`
returns the first IPv4 of the peer whose DNS label or `HostName`
equals it, without asking whether that peer is online; `Find-Serial`
falls back to it (then `adb connect` to that IP on port 5555) only
when `adb devices` lists no device. K1155 already solved this shape
in `scripts/phone.ps1`: the param `-TailscaleHost` defaults to `""`,
the pure `Select-TailscaleIp($status, $hostOverride)` keeps the
override match (DNS label or `HostName`, first IPv4, online or not)
and with no override picks the one online peer whose `OS` is
android, else `$null`; `Find-TailscaleIp` there keeps only the
`tailscale status --json` call. On adb: the pass's `Find-Adb` and
the module's `findAdb` are copies (the module's comment says so):
the running server's own binary first (a client of another version
would restart the server and drop everybody's connections and
tunnels), then `$env:ADB`, adb on PATH, the SDK platform-tools, the
WinGet platform-tools; the PowerShell copy throws, the JS one
returns null. The pass hands its path to the module with `--adb`
(`Assert-PhoneQuiet`). `scripts/phone.ps1`'s own `Find-Adb` reads in
a third order (PATH first, then the SDK and WinGet candidates; no
running-server lookup, no `$env:ADB`) — beside the fold, as the item
says. The pass already resolves `node` before its helpers, and calls
`Find-Adb` from `Do-Check`, and from `Do-Start` on its non-dry
path.

Tasks, in order (ports 5550-5559, unused; no server, no phone, no
`tailscale` run):

1. The before table: the three places the real name stands in
   `scripts/phone_pass.ps1` (named as places, never the name), what
   its `Find-TailscaleIp` matches and does not check (no `Online`),
   what each `Find-Serial` outcome does downstream, and the two adb
   lookups' step lists side by side (with `scripts/phone.ps1`'s
   third order named as the bystander). The table is those lists.
2. K1160, the finder. In `scripts/phone_pass.ps1`: a
   `[string]$TailscaleHost = ""` param beside `-Serial`; the
   script-level `$tailscaleHost` goes; the peer choice becomes the
   pure `Select-TailscaleIp` copied from `scripts/phone.ps1` (same
   name, same semantics: override as today, else the one online
   android peer, else `$null`), and `Find-TailscaleIp` keeps only
   the `tailscale` call and hands it the status and
   `$TailscaleHost`. The match comment's example becomes the made-up
   name `scripts/phone.ps1` uses ("test-phone"). The `-Serial` help
   now says the default is a host:port (Tailscale) device, else the
   USB one, else `adb connect` to the phone the finder picks (the
   one online android peer; `-TailscaleHost` names another).
   `Find-Serial`, the tunnels and everything else in the pass stay
   as they are. (The name-as-param alternative in the item is the
   override this keeps; the finder is the default, as in K1155.)
3. K1159, the fold. The module's `findAdb` becomes the one
   implementation: in `scripts/phone_pass/phone_ready.mjs`, its
   search order moves behind a pure picker the tests can drive
   (probes: the running server's path, `$env:ADB`, the PATH hit,
   the SDK path, the WinGet candidates in order; the first that
   exists wins, none gives null), `findAdb` gathers the real probes
   as today, and the CLI gains `--find-adb` (in `parseArgs`, its
   usage header too): it prints the found path and exits 0, or
   prints the no-adb verdict line and exits with `EXIT.NO_PHONE`,
   having opened nothing on any phone. In `scripts/phone_pass.ps1`,
   `Find-Adb` delegates: it runs
   `node scripts/phone_pass/phone_ready.mjs --find-adb` (the pass
   resolves `node` before its helpers), returns the printed path,
   and on a non-zero exit or empty output throws today's message
   ("adb not found (install Android platform-tools or the Android
   SDK)."). No second copy of the candidate lists stays in the
   PowerShell. `scripts/phone.ps1` is not touched.
4. The pins. A new `test/phone_pass/phone_tailscale_pass.test.ts`,
   modelled on `phone_tailscale.test.ts`: its scan half (every
   platform) asserts the param block defaults
   `[string]$TailscaleHost = ""`, that `Select-TailscaleIp` in
   `phone_pass.ps1` reads `Online` and the android `OS`, that
   `Find-TailscaleIp` hands the status and `$TailscaleHost` to it,
   and that the file no longer carries a script-level
   `$tailscaleHost = "..."` assignment (do not write the real name
   in the test to assert its absence). Its behavior half
   (`it.skipIf` off Windows, as K1155's does) takes
   `Select-TailscaleIp` out of the script's own parse tree (the
   function only; the script body never runs) and feeds it the
   K1155 fixture's invented statuses (a laptop and a tablet beside
   the one online android phone; a second online android; the
   android offline; an override naming an offline peer's DNS label
   and one naming a `HostName`; a chosen peer with no IPv4): the
   same six answers as K1155's table. For the fold, in
   `test/phone_pass/phone_ready.test.ts`: the picker's order pinned
   on invented probes (the running server beats `$env:ADB`, which
   beats PATH, the SDK and the WinGet candidates; a probe that does
   not exist is skipped; none gives null); a scan pinning that
   `phone_pass.ps1` contains `--find-adb` and no longer contains
   the SDK/WinGet candidate lists or the running-process lookup,
   while `phone_ready.mjs` keeps the only ones; and a dry CLI row
   (`node scripts/phone_pass/phone_ready.mjs --find-adb` with
   `$env:ADB` set to a file the test creates and `PATH` emptied)
   printing that file — skipped on Windows while an adb process is
   running there, since the running server rightly wins (say so in
   the test). Then parses only: the PowerShell language parser over
   `scripts/phone_pass.ps1` reporting no errors, and
   `node --check` on `phone_ready.mjs`.

Exception (the drafting brief's phone rule): this run runs no phone
tool against the phone. The parse-tree harness, the parses and the
`--find-adb` dry run in task 4 are the only executions, and none of
them opens anything on the phone.

Done:

- The pass carries no real peer name and defaults
  `-TailscaleHost` to `""`; with no override it picks the one
  online android peer, and is undecided (the `Find-Serial` fallbacks
  and its refusal, as today) on none or several; the override match
  stands as today.
- One adb lookup remains (the module's), the pass delegates to it,
  and the picker's order is pinned; `scripts/phone.ps1` is
  unchanged.
- The fixture table passes on Windows and skips off it; the scans
  and the dry run read as task 4 says; the parses are clean.
- `npm test` passes.

Report: the before and after tables (places and matches, no real
name), the picker's probe order, and the parse and dry-run lines.

Close both items:
`ledger.mjs done K1160 --commit <sha8> --what "scripts/phone_pass.ps1 finds the phone among online android peers; -TailscaleHost is the override, default empty"`
and `ledger.mjs done K1159 --commit <sha8> --what "adb lookup folded into phone_ready.mjs (findAdb picker); phone_pass.ps1 delegates with --find-adb; phone.ps1's own lookup left beside them"`.
Suggested ports: 5550-5559 (unused).

## Run C · K710: a real-time catch cannot land through a broken run

Read first: `.claude/rules/gameplay-minotaur.md` (REAL-TIME
MINOTAUR), `.claude/rules/gameplay-mechanisms.md` (FRAGILE RUNS AND
PAR), `.claude/rules/probes.md`; then `ChaseGraph` (`from`,
`spotToVertex`, `spotToSpot`, `block` and its caches),
`huntDistance`, `contactDistance` and the catch and the sword's
touch in `step` in `src/game/minotaur.ts`, "K137-b, BROKEN RUNS BLOCK" and
Residuals (a) in `docs/design/K137_s3a.md`, the G1 fixture and the
sanctuary case in `test/game/minotaur.test.ts`, and the real-time
chase cases in `test/game/k137b_block.test.ts` to copy.

The ledger says (Residuals):

> **K710** · K137-b: in real time a catch can still land through a broken run, since contact uses
> the plain thread distance (docs/design/K137_s3a.md, Residuals a)

What is there today (read it, don't trust this summary). K137-b made
a broken run gone for the real-time minotaur's pathing: `block` marks
it, the restricted distances (`from(src, true)`: no barred tails, no
blocked runs) skip it, and a spot on a blocked run reaches the graph
only through the end it heads to (`spotToVertex`, `spotToSpot` under
`restricted`). Contact never joined in: `contactDistance()` is
`spotToSpot(mino, player, false)` (the whole graph, tails and broken
runs alike), `step` catches on it (and the fleeing sword's touch
reads it too), and the extra monsters' catch in the same `step`
reads `spotToSpot(x.spot, player, false)` directly. So a minotaur and
a player sitting close along threads whose only short path crosses a
broken run are caught, though neither may cross it. The design doc
says "Contact stays the unrestricted thread distance" (K137_s3a.md,
the K137-b design): that sentence is what this run reopens, and the
report says so. Two numbers must not move. The sanctuary pin:
`contactDistance()` still reads 0.2 with the player 0.2 along the
entrance tail from A (the tails stay traversable for contact; only
the broken runs leave it; the catch itself stays guarded by
`invisible()`). And hunting is untouched: `huntDistance()` and every
restricted caller keep today's results. The turn clock is out of
scope: its minotaur cannot walk a run broken before its turn (K137-b
pins that in `k137b_block.test.ts`), and a catch there is contact by
runs over its own unblocked path.

Tasks, in order (ports 5560-5569, only if a read needs a server):

1. The before table, from the pure chase alone, on
   `test/game/minotaur.test.ts`'s G1 (S-A-B-C-X, the B-D dead end,
   the A-C long loop): block run 1 (A-B) on a sim's `ChaseGraph`
   and record `contactDistance()` and one `step` for three pairs —
   the minotaur at A and the player 0.5 along run 1 from A, heading
   for B (0.5 through the broken run); the minotaur at B and the
   player at A (10 through it, 40 around A-C-B); both on run 1,
   0.4 apart (the same-run case) — and, as the control that must not
   move, the sanctuary pair above (0.2, no catch). The table shows
   the first pair caught, and the second's distance measured,
   through a run neither may cross.
2. Contact without broken runs. `ChaseGraph` gains a third cached
   distance, beside the two `from` modes: Dijkstra over every run
   except a `blocked` one (the barred tails still count, as contact
   counts them today), cached per source and cleared where `block`
   clears the restricted cache. The spot helpers serve this
   "no-broken" mode without changing any existing caller's results:
   a spot on a blocked run reaches the graph only through the end
   it heads to (the restricted helpers' rule), two spots on one
   broken run still read their distance along it, and the tails
   measure as today. `contactDistance()` and the extras' catch in
   `step` read the no-broken distance; the sword's touch follows
   through `contactDistance`. Nothing else in `step` moves: the
   movement, the plans, the detection and the respawn are today's.
3. The after table: the task-1 pairs rerun — through-broken reads
   now go around the loop (the on-run pair, by the ahead-end rule,
   measures 9.5 to B plus the 40 around A-C-B; state the numbers
   you measure), the B-to-A pair reads 40, the same-run pair still
   catches at 0.4 and the
   sanctuary pair still reads 0.2 with no catch. Tests in
   `test/game/minotaur.test.ts` (the ChaseGraph distances and the
   catch: no catch through a blocked run, a catch on the same
   blocked run, a catch on the unbroken detour when it is within
   `catchDist`) and, for the chase under break limits, a replay case
   in `test/game/k137b_block.test.ts` only if it can be driven
   without moving that file's existing cases (its replay-equality
   cases already cover the blocked set's rebuild; a contact change
   that breaks one stops this run under K1050's stop rule 1).

Exception (K1050's stop rule 2): the edit lives under
`src/game/`, in the chase's contact distance only. Any change to
the minotaur's movement, the physics or a render file is out of the
exception and stops the run.

Done:

- After table: at 0.5 through a broken run there is no catch, and
  the no-broken distances read around the detour; the same-run and
  sanctuary numbers are today's.
- Hunting, pathing and the turn clock are unchanged (their cases
  pass with their expected values); the K137-b replay-equality
  cases pass unchanged.
- `npm test` passes.

Report: the before and after tables, and the line in
`docs/design/K137_s3a.md` the run reopens (quote it; don't edit the
doc or the rules: Claude does).

Close: `ledger.mjs done K710 --commit <sha8> --what "a real-time catch (and an extra's, and the sword's touch) cannot land through a broken run; contact counts tails but not broken runs"`.
Suggested ports: 5560-5569 (if any).

## Run D · K711 (c): the fire's safe arms are not broken runs

Read first: `.claude/rules/gameplay-fire.md` (BURN RACE, K114),
`.claude/rules/gameplay-mechanisms.md` (FRAGILE RUNS AND PAR, and
the cut, whose runs `broken()` also names); then `armSafe`,
`safeArms`, `fireTrapped` and `refire` in `src/game/fire.ts`,
`fireArrive` and `broken` in `src/game/fabric_controller.ts`, the
hand-built RUNS fixture and the fire cases beside them in
`test/game/fire.test.ts`, and the controller's fire-after-a-break
case in `test/game/k137b_block.test.ts`. This run takes K711's
letter (c) only; (b), (d), (e) and (f) stay in the item (the close
lines below say how).

The ledger says (Residuals):

> **K711** · K137-b edges (K137_s3a.md Residuals b-f): runBurnAt may draw a burnt broken run as
> burning; safeArms and fireTrapped count broken arms safe; refire is O(V^2) per breaking move;
> __knotChaseTap ignores broken runs; broken-run counts need main.ts to report every accepted run

What is there today (read it, don't trust this summary). The fire
already burns around broken runs: after a breaking move the
controller `refire`s (distances recomputed over unbroken runs, the
times already reached kept), so the fire's arrival times never cross
a break. The trap test did not join in: `safeArms(walk, fire, L, at)`
keeps every arm `armSafe` passes (a walk along it arrives at its far
end strictly before the fire does), with no knowledge of broken
runs, and `fireTrapped` is "no safe arm left". Their only caller is
the controller's `fireArrive`, which sets `fireLost` from
`fireTrapped(this.walk, fire, L, at)` and passes nothing about the
breaks — though the same object answers `broken(eid)` (a fragile run
at its limit, or a cut run: gone either way, as `choices()` already
reads them). On the fire tests' own fixture a player at B whose only
fire-safe arm is a broken one is therefore judged not trapped by the
fire, however trapped the maze has them. The fixture numbers (read
them in `test/game/fire.test.ts`): at speed 0.5 and delay 0 the fire
times are S 0, A 4, B 6, C 14, X 12, and at B at clock 3 the safe
arms read `[3]` (the B-C run; the two B-A runs tie the fire and are
not safe).

Tasks, in order (ports 5570-5579, only if a read needs a server):

1. The before table, from the pure fire alone on that fixture:
   `safeArms` at B at clocks where its answer is known (clock 3
   above, and clock 2.999, where the B-A runs are safe too), read
   against a stated broken set the API cannot yet name (run 3
   broken at clock 3; runs 1 and 2 safe at 2.999 while 3 is
   broken). The table shows the broken arm counted safe because the
   test has no way to say it is gone.
2. The blocked arm. `safeArms` and `fireTrapped` take the broken
   runs as an optional last argument (a predicate over run ids, in
   the shape `refire` already takes, `(eid) => this.broken(eid)`):
   an arm the predicate names is not safe, whatever `armSafe`
   says. `armSafe` itself, the fire times and `refire` do not move,
   and a caller that passes nothing reads exactly today's answers.
   The controller's `fireArrive` passes its `broken` (fragile
   breaks and cuts alike, as `choices()` reads them); no other
   controller line moves. Tests in `test/game/fire.test.ts`: on the
   fixture, run 3 broken at B and clock 3 leaves no safe arm and
   `fireTrapped` reads true; at 2.999 the B-A runs keep a player
   untrapped with 3 broken; a blocked arm that was never fire-safe
   changes nothing; and every existing case passes unchanged. A
   text pin in the same file, in the `panel_rect.test.ts` manner,
   asserts the controller's call site passes its `broken`
   predicate (the controller's own fire-and-fragile walk in
   `k137b_block.test.ts` does not reach a stated trap, so the pin,
   not a driven arrival, is the wiring gate; say so in the report).
3. The after table: the task-1 reads with the predicate passed —
   the broken arm is gone from the safe list at both clocks, and
   the untrapped cases stay untrapped.

Done:

- After table: a broken arm is never fire-safe; a player whose
  only safe arm broke reads trapped by the fire; every other
  safe-arm answer is today's.
- The controller's one call site passes its `broken`; `armSafe`,
  `refire` and the fire times are unchanged; `npm test` passes.

Report: the before and after tables, and whether a driven
controller arrival could be made to read the trap (or the pin that
stands in for it).

Close nothing outright: letters (b), (d), (e) and (f) stay open.
`ledger.mjs` has no command that rewrites an item's text, so don't
edit K711 by hand: give its new line in your report, and Claude
applies it after the batch:
`**K711** · K137-b edges: runBurnAt may draw a burnt broken run as burning; refire is O(V^2) per breaking move; __knotChaseTap ignores broken runs; broken-run counts need main.ts to report every accepted run (safeArms and fireTrapped count broken runs gone, in <sha8>) (K137_s3a.md Residuals b-f)`.
Suggested ports: 5570-5579 (if any).

## Run E · K732 (the desktop half): the snore under `snd=none`, in a browser

Read first: `.claude/rules/gameplay-audio.md` (the audio autoplay
gate, THE SNORING CAT LINK), `.claude/rules/probes.md`; then
`decodeOffline` in `src/audio/knot_synth.ts`, `decodeWhenPossible`,
`preload` and `play` in `src/audio/snore_sfx.ts`, the "K343" cases
in `test/audio/snore_sfx.test.ts`, Residuals 3, 6, 7 and 8 in the
Handoff of `docs/design/K720.md`, the K343 commit (933571af: what
it changed and what its probe read), and the `__knotSnore` and
`__knotSynth` hooks (`src/app/probe_hooks.ts` and `knot_synth.ts`).
This run takes the two desktop clauses of K732 only: the
middle clause, which K343 has since closed (verify it, don't
rebuild it), and the browser check under `snd=none`. The iOS
clauses stay in the item (no iOS device is Muse's to check; the
close lines say how).

The ledger says (Residuals):

> **K732** · K720 residuals: iOS unverified (a context created outside a tap waits for the next tap;
> a suspended context keeps the song on the wall clock and skips the 1.2 s lead-in); in manual mode
> the first snore hover after sound turns on creates the context but plays nothing (decode the snore
> on an OfflineAudioContext); the snore and fabric mode under snd=none unchecked in a browser
> (docs/design/K720.md Handoff)

What is there today (read it, don't trust this summary). The snore
clause's fix already landed, after the item was filed: K343
(933571af, 2026-11-02) gave `KnotSynth` a `decodeOffline`
(an `OfflineAudioContext` decode with no live context) and taught
`SnoreSfx.decodeWhenPossible` to try it first and fall back to the
context decode, so the buffer is ready before the autoplay gate
opens and a play need not wait for a second decode; its tests sit
in `test/audio/snore_sfx.test.ts` ("SnoreSfx offline decode
(K343)"), and its probe read the first touch after the gate
starting the snore. What no one has done since is load the game
with `snd=none` in a browser and read the two hooks: under it,
`SnoreSfx.play` is refused by its `enabled` read (the mode is
`none`), the synth must never create a context (K720's rule:
`__knotSynth().state` stays `"none"` and its sample count stays
0), and a fabric move must still move. Those three reads, and
their sound-on control, are the run. No `src/` change is expected:
a failing read stops the run (below), it does not become a fix
here.

Tasks, in order (ports 5580-5589, headed real-time Chrome):

1. The before table, from the code alone: the ledger's three
   clauses against the code cited above (the iOS clauses
   unverifiable here; the snore clause closed by K343 — name the
   commit and its tests; `snd=none` in a browser unchecked). Say
   what each hook should read under `snd=none` if the code is
   right: snore `plays` 0, synth `state` "none", samples 0, and a
   driven move still accepted by the game.
2. The browser check. Write `.claude/probes/K732/snd_none.mjs`
   (headed Chrome, a port in 5580-5589; load a full design link,
   per `probes.md` — `?7&am=instant&snd=none` is the first row, so
   name the whole link in the table — and seed the panel open the
   way the K343 probe did, copying its hook reads, not any file,
   if it is not on this machine). Row one (`snd=none`): open the
   panel, hover or tap the "Made by Snoring Cat" link the way the
   link itself invites it (`src/ui/snore_link.ts`: hover, and its
   touch delay), drive one accepted fabric move the way the K137
   page drivers do, and after each step read `__knotSnore()`
   (fetches, decodes, plays) and `__knotSynth()` (state, samples,
   plucks). Row two (the control): the same without `snd=none`,
   where the tap makes the context, the snore plays and a move
   plucks. The table is those reads after each step. If a read
   contradicts task 1 (the snore sounds, a context exists or a
   sample plays under `snd=none`), stop there: the gate or the
   enable read is then the defect, it is not this run's to widen
   into, and the report names the step and the hook's words.
   That stop is this run's own scope, not K1050's rules: a failing
   read is a defect in the gate or the enable read, which is
   Claude's to queue as its own fix, and widening this
   verification run into it would leave the row unread.
3. `npm test` passes (the audio suites among them, unchanged).

Done:

- The browser table reads as task 1 says on both rows: nothing
  sounds and no context exists under `snd=none`, a move still
  lands there, and the control row sounds as today.
- No `src/` file changed (or the stop in task 2 fired and none
  did); the probe and its table are the evidence.

Report: the before and after tables, the links used whole, and
the K343 tests this run relied on instead of rebuilding.

Close nothing outright: the iOS clauses are still open.
`ledger.mjs` has no command that rewrites an item's text, so don't
edit K732 by hand: give its new line in your report, and Claude
applies it after the batch:
`**K732** · K720 residual, iOS only: a context created outside a tap waits for the next tap, and a suspended context keeps the song on the wall clock and skips the 1.2 s lead-in — both unverified on iOS (the snore's offline decode landed with K343, 933571af; the snore and fabric under snd=none read silent in a desktop browser, <sha8>) (docs/design/K720.md Handoff)`.
Suggested ports: 5580-5589.

## Run F · K740 (the first gap): a showing toast re-places when a control appears

Read first: `.claude/rules/gameplay-indicators.md` (THE TOASTS
CLEAR THE CONTROLS, K698), `.claude/rules/probes.md`; then
`showToast`, `placeToast`, `controlBox` and `setToastAvoid` in
`src/ui/share.ts`, `toastBottom` in `src/ui/toast_place.ts` and
its cases in `test/ui/toast_place.test.ts`, `chrome()` in
`src/ui/offscreen_indicators.ts`, the `setToastAvoid` wiring in
`src/main.ts`, and the happy-dom file shape in
`test/ui/daily_stats_view.test.ts` to copy. This run takes the
first of K740's gaps only; the panel and sheet avoidance and the
indicators' aid list stay in the item (the close lines below say
how). The sword clause under it is already answered (K749: after a
walked pickup on the real phone, all three sword toasts clear the
pad).

The ledger says (Residuals):

> **K740** · Toast placement gaps (K698 Handoff): a control that appears while a toast shows does
> not move it; the panel and the phone settings sheet are not avoided; the aids group is found by
> its class, not the indicators avoid list; the sword toasts were checked shown directly, not after
> a walked pickup

What is there today (read it, don't trust this summary). A toast
is placed once, when it shows, and again only on a window resize:
`showToast` sets the text, `placeToast` reads the controls in its
column at that moment (the `TOAST_AVOID` selector's elements and
whatever `setToastAvoid` names — in the app, the chrome the
indicators avoid) and lifts it above the tallest, and while it
shows nothing re-reads them. So a control that appears in the
toast's column during its few seconds (a button its tick turns on
under the message, an aid group, the banner) can sit under the
toast until it fades, and the pure test
(`toast_place.test.ts`) cannot see it: its boxes are handed in,
already appeared. `placeToast` is idempotent — it clears the
inline `bottom` and re-reads the floor each call — so the missing
piece is only a clock, not a new rule. A frame-by-frame re-place
is not that clock (it reads client rects, and K1081's frame reads
are the ledger's own lesson in what that costs); a toast shows for
2.2 s by default, the explanation's 4.5 s at the longest.

Tasks, in order (ports 5590-5599, headed real-time Chrome only if
task 3 runs):

1. The before table, in a happy-dom test written for the run
   (`test/ui/toast_reflow.test.ts`, opting into happy-dom at its
   head, the way `daily_stats_view.test.ts` does): show a toast
   with nothing under it, then make a control appear in its
   column (an element the `TOAST_AVOID` selector reads, its rect
   stubbed the way the shipped helpers need) and record the
   toast's `bottom` before and after: it stays at the floor while
   the control stands there. That harness, on the unfixed code,
   is the before table; a harness that already re-places is not
   evidence (say so, and let the code read stand as the table).
2. The re-place clock. In `src/ui/share.ts`, while a toast shows,
   it re-places on a slow timer (a stated cadence between 200 and
   300 ms: a control appearing under a 2.2 s message is met well
   inside it, and the rect reads stay a handful per message, not
   per frame): `showToast` starts it, and the fade that ends the
   message stops it (a fresh `showToast` while one shows restarts
   both timers, as it restarts the fade's today). `placeToast`,
   `controlBox` and the selector do not change; a control that
   leaves lets the toast settle back to the floor on the next
   tick of the clock. Tests in the same happy-dom file, on fake
   timers: the toast lifts to the control's top plus
   `TOAST_GAP` within one cadence of its appearing, settles back
   when it leaves, shows at the floor when nothing appears (the
   shipped behavior), and leaves no timer running once it fades
   (the timer count, or no later style change once time runs on).
   `test/ui/toast_place.test.ts` passes unchanged (the pure rule
   is untouched). If fake timers fight the happy-dom window, stop
   and report rather than export a test-only clock.
3. A page check as a second, headed confirmation (not the gate):
   in `.claude/probes/K740/`, a full design link (per `probes.md`)
   where a toast can be shown and a bottom control made to appear
   inside its window (the aids or the sprint button, driven the
   way their own probes do) — read the toast's box before and
   after the control appears. If no such moment can be driven in
   reasonable tries, report that and let task 2's tests stand as
   the gate.

Exception (K1050's stop rule 1): the new happy-dom file's own
expected values are the run's to write. No shipped test's expected
value may change, `toast_place.test.ts` included.

Done:

- A control appearing in the column of a showing toast lifts it
  within one cadence, and its leaving settles the toast back —
  the happy-dom table reads so, before and after.
- No timer outlives the message; at rest the toast sits exactly
  where it does today.
- `npm test` passes.

Report: the before and after tables, the cadence chosen, and how
the page check read (or why it could not be driven).

Close nothing outright: the other two gaps are still open.
`ledger.mjs` has no command that rewrites an item's text, so don't
edit K740 by hand: give its new line in your report, and Claude
applies it after the batch:
`**K740** · Toast placement gaps (K698 Handoff): the panel and the phone settings sheet are not avoided; the aids group is found by its class, not the indicators avoid list (a showing toast now re-places when a control appears or leaves, <sha8>). The sword toasts clear the pad after a walked pickup (K749, real phone).`
Suggested ports: 5590-5599.

## Left out on purpose, for a later batch

Not for Muse, or not now (candidates in the order the header
names: Approved first, then the residuals filed since batch 13's
draft, then the Residuals read in ledger order after K685 through
K1160; each is named, with its reason. Batch 13's own "Left out on
purpose" list was checked the same way, and none of its items is
revived here without saying why):

From Approved, to schedule (batch 13's reasons, re-checked; none
has since become possible):

- K22 (the dynamic resolution scaler): its record still puts it
  after G3 (`docs/design/G3G4_sdf_geometry.md`: K22's frame-time
  scaler comes after G3, since analytic AA makes extra resolution
  pure crispness), and the G3 lane is still open (K8 in progress;
  its next, G3-3, waits on Levi's phone look and a phone
  render-sync measurement). Its check is still a frame-time table
  on the phone. No desktop stand here.
- K23 (GPU particles, GPU fog-of-war accumulation, the yarn as a
  gap-masked ribbon): G3-5 on the same open lane as K22, in the
  thread renderer's GPU performance, which this batch keeps off
  limits.
- K322 (art, sound and music by people): commissioning and
  licensing is still Levi's budget and taste, with no unit test or
  desktop probe to decide it. The credits page still carries its
  art section (`notices/credits.ts`, its K321 entries), so there
  is no waiting code half for a Muse run.
- K805 (the dot-eater mode): both of its gates still stand. The
  paper look's next stage (K797, in Next: stage d, textures,
  perf-gated) is still to build, and K804's dots are still their
  own item (K1149, in Next, not done), which K805 builds on.

From the residuals filed since batch 13's draft:

- K1157 and K1158 (K1040's label pass: upload levers, and GL state
  restored from Pixi's tracking): Ideas, not Residuals, and
  K1040's lane (`src/render/field/`, `.claude/probes/K1040/`), which
  no Muse run touches. The drafting brief says skip them.
- No other residual is numbered above K1156: the section holds
  only K1159 and K1160 there, both in Run B.

From the Residuals, in ledger order (the last read is K1160, the
last residual in the section; batch 15's draft starts after it):

- K689, K691 and K692 (K620's root vertex block moving maze and
  burn 3-5 px of one level, the seam scallops and pink tab, the
  light band at J): the glyph root's shader, in the GPU and root
  lanes this batch keeps off, and looks besides. K689's own ask
  ("test a constants-only block, or accept") is a GPU A/B for
  Claude's lane.
- K699 (two visibility rules: the move pad hides while the panel
  is open, the scissors show beside the desktop side panel): read
  closely and left, because the two rules differ for reasons the
  code states and the direction is Levi's. The pad's hide is also
  its hold release (`MovePad.setShown` lifts every finger, and the
  phone sheet fills the screen over it); the scissors hold
  nothing and their bottom-left corner is clear of the desktop's
  right-side panel (`panelCoversCut` reads its rect). Every other
  corner control reads the panel rect the cut tick caches once a
  frame, so unifying on the rect alone would let the pad ride a held finger
  under an opening sheet unless the sheet gate stays, and
  unifying on `isOpen()` would hide the scissors beside every
  open desktop panel, against the look their header documents.
  Which rule a player feels is Levi's call; the item names no
  Done check.
- K700 (the K324 GPU census skipping the non-riding lead and the
  hunt strength): an untracked probe census in the GPU lane; the
  CPU parity test already covers both, by the item's own words.
- K701 (section shader lengths): a stale note. Its limits have
  since been raised on purpose, each with its reason, and are
  pinned today at 57,430 / 73,850 in
  `test/render/k320_slim.test.ts`; nothing stands to fix.
- K711's letters (b), (d), (e) and (f) (a burnt broken run drawn
  burning; `refire`'s O(V^2); the chase probe hook; the broken-run
  counts' reporting): Run D takes (c) only. (b) is display in the
  fabric renderer's fire draw, (d) is a performance shape with no
  correctness gate, (e) is an untracked-lane probe hook and (f)
  is a reporting contract across every accepted-run path — unlike
  things, each its own read.
- K712 (lives: hearts in Undo and saved attempts, and the default
  of 3): its first half is settled — no Undo is offered with a
  minotaur, and saved attempts are daily-only while lives are
  free-play-only (cb73089e, quoted in the item) — and what
  remains (a toggle, or a snap from 0 to 3 when switched on) is a
  panel call for Levi.
- K714 (the K114 balance probe's cutter, and the one-run fences):
  an untracked probe's strategy and a balance reading; no test or
  desktop stand decides it here.
- K719 (K580's glyph leftovers: the gap slot's bite in the a
  bowl, the recordless glyph junctions, U spikes): glyph and
  junction lanes, both off limits here.
- K723 (K137 s3a's unrun page checks: a broken run turning the
  minotaur plan and the fire, the finish banner's hearts row;
  the sword's real-phone pass): page verification for Claude's
  lane plus the phone. Runs C and D gate their halves in pure
  tests; nothing here needs a Muse page pass of its own.
- K729 (the K708 sim's gaps: lives modelled off, hunter rows
  only, a greedy seeker): three unlike sim models to build, no
  one Done check.
- K734 (a hairline seam inside the i fork junction): junctions,
  off limits.
- K737 (K137 s2's eight leftovers: the spool's trap, the hint and
  warning, the aids under modes, chalk and hints in attempts, the
  shared mint): a bundle of unlike things. Split it first, as
  batch 13 said of its kin.
- K744 (K138 s1's page gaps: patches of other colors at junctions,
  the unchecked slide, ice, par and share cases): the patches sit
  in the junction webs (off limits) and the rest is a page-check
  bundle; K749's phone note already closes its slide case.
- K750 and K751 (lives' phone read, and the phone coverage gaps
  after K749): the phone, for the next phone pass.
- K755 (a beat note landing up to the latency plus a frame late):
  the frame that notices a departure is the frame that schedules
  its note; landing earlier means scheduling departures ahead of
  their commit — an audio scheduling design, not a fix named in
  the item.
- K756 (no wait action under the beat, and the pause has no key):
  a new action and a key are gameplay design (what waiting does
  while the dot rides, and which key, are not named in the item).
- K757 (the audio gate guarding an inferred, unobserved bug;
  manual and random modes unmeasured under it): measurements with
  no defect standing; Run E reads its `snd=none` neighbour in a
  browser.
- K758 (the bottom-left corner's hand-laid stack): no defect
  today; the layout a third control would need is a design for
  when one exists.
- K760 (turnstile bands during a move, and their contrast over
  the section colors): a look, checked on the phone (K767).
- K761 (the rule search's waiting detours of up to 4 taps):
  `rule_search.ts`'s own header bounds the clocked search as an
  upper bound "where only one of those would turn the clock as
  needed", a residual by design. Making it exact means backtrack
  edges in the clocked search (its node count, its route
  reconstruction and its par numbers) — a search redesign for a
  design document first, not one run's fix.
- K769, K770, K771, K772 and K773 (K137 s3d's extras: stepping
  one run under by-length travel, the sleeper rows under
  `clk=beat`, the unmet sleep look, the missing indicators and
  fog and tint, the untested catch and attempts, the probe
  hooks): the first changes how far every extra travels (a
  balance build through the by-length route machinery), the
  middle three are looks and new state, and the rest are untested
  bundles and an untracked probe — no one decided fix.
- K780 (one-way traps past the census's start check): its start
  half is closed — K788 (cff5a0d7) made placement reject a layout
  that can trap (`placeRule`'s accept reads `ruleHasTrap` in
  `src/game/one_way.ts`), whose forward search already judges
  every reached node, not only the start. What remains (a
  turnstile whose open pair leaves out a one-way arrival, where
  the clocked search cannot judge a trap) is the K761 research
  in another dress.
- K781 (one-way chevrons, one mesh each, unchecked under fog and
  the reveal): marker meshes in the renderer's performance lane,
  and a look under two modes. Off limits here.
- K782 (K137 s4's lure and snare leftovers: the early toast, the
  hover light, the length switch, the follower's first step, the
  late lure clear, the untested beat, the stand-in ring): seven
  unlike things. Split it first.
- K791 (locks and keys from the unmerged slice: the 41-of-50
  bite, the lock dim's short stretch, the census's skipped
  clocked configs): census and placement bundles from a slice
  whose own stage decides them.
- K802 (locks and keys only in the classic game): it waits on
  K138's stage 6 (the monsters obey one-way runs, with a closed
  lock handled like a broken run), a design that has not run.
- K803 (the key, lock and dim looks unchecked with fog or the
  reveal on): a page check for the lane that owns those looks.
- K871, K872, K884, K898, K899, K911, K985, K993, K1008, K1024 and
  K1043 (K868's exporter, alignment, oracle and census gaps, and
  the label band's one-pixel flip): the junction label lane that
  K1040 now carries, on its own stages. Off limits here.
- K885, K903, K913, K927, K986, K989, K1014, K1021, K1035, K1036,
  K1044, K1090, K1116, K1120, K1121 and K1144 (cursive traces,
  fits, joins and gates from v3 to v7.0): the cursive lane, off
  limits, most of them waiting on Levi's sheets.
- K888 (the rule colours' contrast review): a grayscale and
  colour-blind review is Levi's eye, and its numbers would be a
  palette call.
- K889 (the ice placement done by retrying draws: plant the legal
  route over the ice moves instead): a placement redesign whose
  planted shape the item only sketches. `placeRule` bounds the
  redraws at 32 and keeps the last solvable draw, so no player
  sees the cost; changing which icy set a seed builds wants its
  own design (what planting does to the share, the bite test and
  the detour) before a run.
- K894, K897, K908 and K920 (max-fabric and load costs and the
  frozen cell on the Pixel): the phone and the GPU lane.
- K1032, K1037, K1041 and K1042 (K992's slow continuity tests,
  its census tools, the corner march's switches and the sweep's
  vitest timeout): junction test and tooling costs on the
  `k992-corners` lane; the timeout is a symptom of the same
  synchronous minutes.
- K1058 (removing a worktree emptying the main checkout's
  node_modules): its tracked half already landed —
  `scripts/preview.ps1` checks its own directory for a junction
  and removes the link itself before the recursive delete. What
  remains is `.claude/worktrees/*`, whose junctions no tracked
  script creates (agent worktrees are the harness's), and the
  item's "try no junction" is a harness practice to take up
  there, not code in this repo to test.
- K1086 (a warm profile's first reload starting main seconds
  late): a performance trace with no fix named; its next step is
  the trace itself, in Claude's probe lane.
- K1095 (the HUD's value column straddling its border at
  320x640): its own text calls it a layout call for Levi.
- K1093, K1103, K1105, K1117 and K1122 (junction form B and the
  label scan): junctions and K1040's lane.
- K1123 (`s3.mjs` and `phone_time.mjs` appending to their summary
  files): `.claude/probes/K1040/`, which no Muse run touches.
- K1128 (sprint's missing real phone pass, and its weak page
  checks): the phone, and Claude's page lane.
- K1133 (the burn's fillet rebuilds on front-crossing frames): a
  fix needs incremental fillets in the joinery, which this batch
  does not touch; batch 13's Run D already took the declare half
  it could.
- K1147 (the phone runners taking no phone lock, and the
  watchdog arming after the `am start`): the lock half turns on
  an untracked lock script and on passes that already queue
  behind it, and the watchdog half, by its own handoff
  (`docs/design/K1142_phone_guard.md`), "cannot be tested
  without a live pass". No desktop stand here.
- K1151 (invalidating the label pass's sampled depth on the
  Pixel): K1040's label lane on the phone.

Everything before and including K685 in the Residuals, and every
section but the three named in the header, was not read for this
draft. What batch 13's list skipped there (junctions, the
cursive, physics, the GPU lane, phone passes, items waiting on
Levi and items In progress, K1040's field and probes among them)
stays skipped on the same reasons.
