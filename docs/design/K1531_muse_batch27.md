# K1531: Muse batch 27, captures and guards that can be trusted (2026-11-19)

Run tags 27A-27N (27E and 27F were added 2026-11-19 23:55; 27E was withdrawn and 27G added 2026-11-20 01:25; 27H and 27I were added 2026-11-20 06:00; 27J, held, 07:45; 27K 08:35; 27L and 27M, the two measuring runs Levi approved, 08:41; 27J was dropped and 27N added 10:52), started by Claude through Paseo with the K1053 chain, one after another in the main
checkout. **This brief is the authority and is self-contained: do not read the older batch briefs' rule
lists.** Levi (2026-11-11): junctions and outlines are the priority; a Claude agent is on rp=gf's corner
faults (K1482) and judges them with captures, the K1436 bar and the fade and drag guards. Three stages this
week lost time to captures that disagreed with themselves and to a guard that is red on master. These runs
fix that. They are probe runs first: `src/` changes only where a run's Done says so.

**rp=gf** (K1362) draws the junction and outline look per pixel on the GPU (`src/render/gpu_field/`); it is
opt-in (`rp=gf` in a link). **Today's look** is the default renderer. Link A is
`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (physics hash fff8c9e5 at simT 20).

## How to work (every run)

- **Read first:** your run's section, its ledger items (`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs
  show <ID> --repo .`), the documents it names, then the `.claude/rules/` files whose `paths:` cover the files
  you touch (`docs/lore_index.md` maps them; always `render-gpu-field.md`, `render.md`, `probes.md`). Muse does
  not load them by itself.
- **Checkout:** the main checkout, on master. Start with `git pull --rebase --autostash`. Leave it on master,
  clean (no tracked changes) and level with origin/master when you stop: the chain checks that.
- PowerShell. Read code with Select-String and 40-80 line ranges of Get-Content; never print a whole file.
  Write TypeScript and `.mjs` through Node or the editor, never through PowerShell text IO. No subagents.
- **Hands off** `src/render/gpu_field/tables.ts`, `eval.ts`, `gf_keys.ts`, `gf_glsl.ts`, `gf_look.ts` and
  `gf_pass.ts`: the Claude agent is changing them. If a fix needs a change there, file it (below) with your
  evidence and stop that part.
- **Servers and probes:** a port of your own, 5480-5499 (never 5173, Levi's). Builds through
  `pwsh scripts/preview.ps1 -Port <p> [-Ref <commit>]`, at most three alive; stop them and remove their
  directories and Chrome profiles when you finish (the disk is short); a tool with a `-Port` (the bar) takes
  one of yours. Never `--virtual-time-budget`; headed real-GPU Chrome off-screen (`probes.md`). Never touch
  the phone. At most 4 parallel Chrome or Node workers.
- **The perf lock** for every pixel-exact capture and every timing, **taken only through
  `scripts/perf_lock.ps1`** (changed 2026-11-19, K1533): `pwsh scripts/perf_lock.ps1 -Owner "muse-27<X>" -What
  "<what>" -Cmd "<the capture command>"`. It waits while another owner holds the lock (one blocking command, up
  to `-MaxWaitMin`, default 60), takes it, runs the command and releases it, also when the command fails. One
  capture sequence of at most 25 minutes per call. Never write or `Remove-Item` `$env:TEMP\claude-perf.lock`
  yourself: 27A's "remove it, write my line, run" removed whatever lock was there and re-took its own with no
  gap, so the Claude agent's guards waited 80 minutes and never ran.
- **Same-state captures:** freeze through `.claude/probes/freeze_parity.mjs`'s `alignFreezeParity`
  (Handoffs 26V and 26X in `docs/design/K1464_muse_batch26.md`: only those two handoffs, by Select-String).
  Compare two captures only when their physics hashes agree, and say which hash.
- **Bars:** measure a pixel bar's floor first (two captures of one build on one state) and report it beside
  the result. A pixel count is never the whole proof: put 4x crops with their surroundings under
  `.claude/probes/<ID>/out/27<X>/` (untracked; today | master gf | new) and write what you see at each,
  including what is worse. You match a reference, never invent a look.
- **Commits:** each finished, tested part: stage files by name (scripts under `.claude/` need `git add -f`),
  `npm test` green, the message ends `(Muse batch 27 Run <X>, 27<X>)`, then `git pull --rebase --autostash` and
  `git push origin master`. Never force-push, skip hooks, or commit outputs (`out/`, PNGs, dumps). After a push
  that touches `src/`, watch its deploy (`gh run list --workflow deploy.yml --limit 3`) and fix red first.
- **Ledger:** a new item's ID comes only from `ledger.mjs add --section Residuals --text "..." --repo .` (never
  type an ID). Bring the checkout level with origin/master right before an `add` (`git pull --ff-only origin master`; commit your work first if it refuses): the ID is one more than the highest in YOUR checkout, and a checkout that is behind hands out a taken one (27B's K1536). Before `ledger.mjs done <ID> --commit <sha> --repo .`, run `show <ID>` and check the text is
  your run's item. Close only your run's item, and only when every Done holds. Leave K1531 and K1482 open.
- **A run that changes `src/`** ends with the ordinary-load guards on a build of its commit, one kept profile:
  `node .claude/probes/K1450/hold.mjs <url> <outDir> <profileDir> 60 250 5000` on `?3&xp=off&am=instant&rp=gf`
  and on link A, and `.claude/probes/K1458/dragcheck.mjs` for gf and gfh. A probe-only run skips them and says so.
- **Time:** `Get-Date` at the start and at each milestone. Stop at 2 h or when every Done holds. A Done that
  looks out of reach is not a stop: spend the time on the next most promising part. At the stop line land what
  is finished and keep the rest as a patch under `.claude/probes/<ID>/` (untracked). Then append
  `### Handoff 27<X>` under your run's section (start and stop times, numbers before and after, what changed,
  what is left, what you tried that failed and why), commit, push, and report.

## Run A (27A): two redraws of one frozen state agree (K1530)

On `?3&xp=off&am=instant&rp=gf` master gf gives a different picture on two redraws of ONE frozen state:
K1525 s1's capture tool (`.claude/probes/K1525/s1/cap.mjs`, jobs in `jobs_q3.json`, notes in `notes.md`) steps
to simT 20, pins the paint clocks and the background, takes two shots and marks every shot of that link
UNSTABLE. Link A is stable (0 px). Suspects, untested: K390's start-marker flip, fog or explore ticks.
Done: 1. Reproduced with numbers on 10 loads: px that differ between the two shots, their bounding boxes and
which feature they sit on (marker, fog, thread, background), for rp=gf and for today's renderer. 2. The cause
named with evidence: dump the uniforms, clocks and data-texture hashes at both redraws and show what differs.
3. Fixed. If the page legitimately animates there, the capture pins that clock: in `cap.mjs` and in the helper
the other tools share (name each tool that now takes it). If one state draws two pictures with every clock
pinned, that is a render bug: fix it outside the hands-off files, else file it. Then two redraws agree, 0 px,
on 10 of 10 loads on that link and on link A. 4. One same-state sheet of K1463's spot (the notch at the lower
right of `.claude/probes/K1458/live/zoom_a.png`), today | master gf, with surroundings and at 4x, path in the
handoff. Do not fix K1463. 5. `npm test` green; K1530 closed with the commit.

### Handoff 27A (Muse, 2026-11-19, done: every Done holds; K1530 closed in b3f4be04a)

Started 14:18 PST, stopped 16:13 PST. Starting master 31e40ca9f; fix on master in b3f4be04a (src/app/probe_hooks.ts + .claude/probes/K1525/s1/cap.mjs + the new .claude/probes/K1530/ tools; no hands-off file touched). Perf lock held for each capture sequence, released at the end. Captures and dumps under .claude/probes/K1530/out/27A/ (repro/diag pairs + dumps, capfix/, fade/, guards/, k1463_sheet.png).

Done 1 (reproduced, 10 loads each, preview of 31e40ca9f on :5482, kept profile, cap.mjs's own pin). Two redraws of one frozen state (hash f9d72040 on every load) differ on every load: rp=gf 679,735 / 692,320 / 705,514 / 717,572 / 707,278 / 714,506 / 707,782 / 701,075 / 704,673 / 716,661 px; today's renderer 710,197-729,612 px. Bounding box x 689..2450, y 26..1714 (the whole knot) on both renderers; the differing px sit on the threads (every thread row, colour deltas up to 255: the flow-displaced shading), not on a marker, fog or the background (background alone differs by 1 level of dither). K390's start-marker flip, fog and explore ticks are ruled out: dumps at both redraws show paintClock 100, pulseBorn 0, exploreClock, view and physics hash all identical; only flowTime moves (e.g. 1.84 -> 2.59 -> 3.23 across pre/A/B).

Done 2 (the cause). __knotPinClocks pinned advanceClocks/paintClock/pulseBorn, the background and the fabric explore clock, but left tickPaint running with real dt; tickPaint advances the flow clock (flowTime += dt * flowSpeed, paint_state.ts) and the palette/appear work, so the displaced geometry and shading moved between redraws. Evidence chain: fw=0 cuts the diff 707k -> 190k (flow displacement off, clock still moving); stopping tickPaint after one tick gives 0 px from the first shot; K1139's hand PIN (.claude/probes/K1139/lib.mjs:88), which the hook's comment says it mirrors, wraps tickPaint at dt 0 - the hook had dropped that line. With the wrap, flowTime reads identical at both redraws and the redraws agree, so the gf tables/uniforms agree too (no data-texture difference left to name). gf needs two warm redraws after the pin before the compared pair (builds in flight at the pin, depth 2 at rest, still show pre-pin state: first compared pair differed 68-97k on 9 of 10 loads with one warm redraw, 0 with two; diag.mjs shot sequence 179,593 -> 0 -> 0).

Done 3 (fixed, b3f4be04a). src/app/probe_hooks.ts: __knotPinClocks now wraps renderer.tickPaint at dt 0 (bind + 0), as the K1139 PIN does. cap.mjs: freeze() pins through __knotPinClocks(100) instead of its partial hand pin (which also missed the explore clock). Tools that now take the fixed pin: every __knotPinClocks caller - K1139 (ab.mjs, ab_cyc.mjs, ab_s3b.mjs, sheets_cyc.mjs, hookcheck.mjs), K1186 (ab21e.mjs, ab22c.mjs, crops.mjs, flips.mjs, pc21e.mjs), K1202 (frames21c_claude.mjs, sheet21c.mjs, sheets_cyc.mjs), K1203 (check_gpu.mjs, check_gpu2.mjs) - plus cap.mjs. Verified on the fixed build (:5483 working tree, then guards on -Ref b3f4be04a): after two warm redraws, two redraws agree at 0 px on 10/10 loads of ?3&xp=off&am=instant&rp=gf (hash f9d72040) and 10/10 of link A (hash fff8c9e5); cap.mjs on jobs_q3.json prints no UNSTABLE (q3_gf tries [2,1,1,1,1,1,1,1], q3_today [1 x8]). The page legitimately animates here (flow undulation is a live look), so the capture pins it; no render bug and nothing filed against the hands-off files.

Done 4 (K1463's spot). Same-state sheet (state f9d72040, capfix captures, fade 0.14 and 1.2, today | master gf, surroundings + 4x): .claude/probes/K1530/out/27A/k1463_sheet.png (spot located by masked template match against zoom_a.png's today tile: device (1152,900), 152 px window). At 4x the gf pink tip still shows a small hard notch/step where it meets the blue band, against today's smooth contour, at both fades - K1463 itself not judged or fixed here, as briefed.

Done 5: npm test green (256 files, 3199 passed, 9 skipped; tsc clean). K1530 closed in b3f4be04a; its deploy (44640512146) succeeded. Guards on a preview of b3f4be04a (:5484, the kept profile above): hold.mjs 60 250 5000 PASS on ?3&xp=off&am=instant&rp=gf (60/60, edges min 102,769) and on link A (60/60, min 7,010); dragcheck.mjs PASS for gf (130 / 56 / 0 px over TOL 24) and gfh (0 / 0 / 0). fade.mjs on that build keeps its standing K1494 FAIL on dot counts only (83 / 96 / 65 / 103 sides over 2 dots; distances pass, sameState true) - 27C's item, untouched. K1531 and K1482 left open. Preview servers (5482, 5483, 5484) and probe Chromes stopped; preview dirs and the run's Chrome profile removed.

## Run B (27B): every load of one build lands on one view (K1529)

Read Handoff 27A first. K1482 s21 (`docs/design/K1482_s21_corners_rest.md`, "The 76,609 px fill difference"):
in A/B captures of rp=gf on link A some loads land on a view shifted by under a pixel, so two loads of one
build on one physics hash differ at 76,609 px, all on antialiased edges and soft shadows. Ruled out there: the
reload after a hash miss, concurrent GPU use, the background. Inferred, not tested: a per-page view state such
as the eased camera's offset.
Done: 1. Reproduced: 12 loads of master's preview on link A, fill (`&tlk=fill`) and border looks, through the
capture path s21 used (name it) and through the bar's `.claude/probes/K1436/k1436_screen.mjs`: how many distinct
pictures, and each load's `view.x`, `view.y`, `view.s`, dpr and canvas size. 2. The cause named with evidence
(the bounds-following viewport's last step, a resize, a scrollbar, a rounding of the device pixel ratio...).
3. Fixed in the capture helpers: the view is pinned or snapped so 12 of 12 loads give 0 px in both looks, and
the bar's control (`.claude/probes/K1436/k1436_bar.ps1`, `-Ref` and `-Base` both master, scenes
`ring,def,muse_hash,g41_user_tw64`) reads new 0, grown 0, gone 0 three times in a row. If the app's own view
at rest differs between loads (a user would see it), say so with numbers and fix it in `src/` outside the
hands-off files, else file it. 4. `npm test` green; K1529 closed with the commit.

### Handoff 27B (Muse, 2026-11-19, done: every Done holds; K1529 closed in 434a34092)

Started 16:24 PST, stopped 21:07 PST (much of it queued behind other agents' perf-lock sequences). Starting master 3e7eef326; fix on master in 434a34092 (probes only: the new .claude/probes/view_still.mjs, .claude/probes/K1436/k1436_screen.mjs, .claude/probes/K1482/cap.mjs, plus the run's tools under .claude/probes/K1529/; no src/, no hands-off file). Preview of master on :5481 (src identical to c8a91eb3, the bar controls' build). Every capture sequence through scripts/perf_lock.ps1 -Owner "muse-27B". Captures, trajectories and 4x crops under .claude/probes/K1529/out/27B/ (s21-base/, bar-base12/, bar-fix12/, cap-fix12/, cap-fix12b/, viewprobe/, drift_4x_base.png, drift_4x_fixed.png). Link A on hash fff8c9e5 everywhere below.

Done 1 (reproduced, 12 loads per path). Through the capture path s21 used (named: .claude/worktrees/agent-afdf2b8bb494bb380/.claude/probes/K1482/s21/cap21.ps1 -> cap21b.mjs, = K1482 s15 cap15.mjs + FORCE2; 1600x900, DSF 2, canvas 3200x1800 device px; FILL=1): fill 1 distinct picture, 0 px on 12 of 12; border (gf.png) 12 distinct pictures, vs load 01: 28,775 / 37,162-53,994 px differ (levels 1: ~25-30k, 2-3: 1.0-18.9k, >8: 84-1,608, max 26-32, mean 1.09-2.50), bbox x 734..2429 y 66..1707 (the whole knot), image corners 0. View at sites time (post-shot read) x 417.23864033820786, y 67.92990598455434, s 21.296838875313163, dpr 2 on all 12. Seven loads first froze on 10104c64 and reloaded to fff8c9e5, so both groups (reloaded / first-try) contain agreeing fill and disagreeing border shots. Through the bar's .claude/probes/K1436/k1436_screen.mjs (job t=20.0167 - t=20 steps to 19.992 under its t-0.008 recipe and lands on 8c308669, named here; t=20.0167 makes its parity target 2402 substeps, fff8c9e5 in 1 try on all 12): view x 237.23864033820786, y 67.92990598455434, s 21.296838875313163, zoom 1, pan 0, dpr 3, 1240x900 CSS / 3720x2700 device px on all 12; fill 1 distinct picture, 0 px (stableShot 3 shots on 11 loads, 2 on one); border 1 distinct picture, 0 px (2 shots each). Floor, reported beside the drift as briefed: on one build and one state the s21 path's fill and the bar path's both looks self-agree at 0 px; only the s21 path's first (border) shot wanders. On current master the 76,609 px figure itself does not recur in fill (s21 measured it across build pairs whose loads took different reload paths); the same fault, smaller, lives in the border shot.

Done 2 (the cause: the fit camera's last ease, caught in the first shot). .claude/probes/K1529/viewprobe.mjs (cap21b's load/freeze, parity aligned), 3 loads, world transform polled every 200 ms for 12 s after the freeze: at 2,200 ms - the moment cap21b shoots (sleep 1500 + one redraw) - loads 2 and 3 sit off their resting view by dx +0.049/+0.062, dy +0.145/+0.187 CSS px (0.10-0.37 device px) and keep moving; both become bit-still only at 4,881 / 5,161 ms and land bit-exact on x 417.23864033820786, y 67.92990598455434, s 21.296838875313163. Load 1 was already still at the first poll (its pre-freeze frames happened to finish the ease). The offset is the bounds-following fit ease (FIT_EASE 0.08 of the remainder per frame, src/app/camera.ts updateCamera, snapping only under 0.01 px): how many frames a load ran before the freeze sets the remainder, so the shot's sub-pixel offset differs per load and every antialiased edge shifts by 1-3 levels. Ruled out with numbers above: the hash-miss reload, concurrent GPU use (every sequence held the perf lock, one page at a time), the background (corners 0; fill, which shows none, agrees), dpr and canvas size (2 / 3200x1800 on every s21 load, 3 / 3720x2700 on every bar load), the physics state (one hash, parity-aligned in the bar path), paint and flow clocks (on the same pages the fill shots agree). The app's own view at rest agrees across loads to <= 0.001 device px (load 1's rest sits dx 7.6e-5, dy 4.7e-4 CSS px off the other two - the snap band's residue, three orders under a pixel; no user sees it), so there is no src/ fix and nothing filed against the hands-off files.

Done 3 (fixed in the capture helpers; the view is pinned by waiting for it). New shared .claude/probes/view_still.mjs: waitViewStill(page) polls the renderer root's world transform in device px at 17 digits until 10 polls in a row (200 ms apart, frames running) are exactly equal - K1482 s23's B2 recipe (probes.md) generalized - and returns that view. .claude/probes/K1436/k1436_screen.mjs waits for it after the freeze, before the first shot (logs "view still x=... y=... s=... dpr=...", warns and shoots unpinned if 60 s pass; stableShot stays as the net for a gf build still in flight). .claude/probes/K1482/cap.mjs's waitViewSettled (K1508: two samples 250 ms apart) now delegates to it. Tools that take the pin: k1436_screen.mjs (the bar and every census capture) and K1482/cap.mjs; s21's cap21b.mjs is an untracked worktree copy and cannot take it - master's cap.mjs is that lineage's maintained copy. Verified on the fixed helpers: k1436_screen 12 of 12 loads 0 px in both looks (fill md5 10df369488, identical to the base run's; border 0 px against the base run's picture - the pin lands the same settled view stableShot used to find by reshooting, stable now 2/2 shots on every load); cap.mjs 13 captured loads (11 of 12 in the set, 2 of 2 in a supplement) 0 px in both looks, its settled border matching none of s21's twelve (vs s21 load 01: 45,542 px of the same 1-3-level signature) while its fill equals s21's fill at 0 px. One cap load exhausted TRIES=6 on 10104c64: cap.mjs freezes without alignFreezeParity and plays the K1519 lottery, which is not the view; filed as K1539 with the cure (the add first numbered it K1536, an ID already taken: the checkout was behind origin; the coordinator renumbered it). Bar control (.claude/probes/K1436/k1436_bar.ps1 -Ref master -Base master -Scenes ring,def,muse_hash,g41_user_tw64, ports 5482-5484, tags 27B_ctrl1/2/3; screens taken by the fixed helper): PASS new 0, grown 0, gone 0 three times in a row, every scene on its K868 hash (ring 50dd4ffd, def 910ff135, muse_hash 733ee14a, g41_user_tw64 0d51331b), view-still logged on each. The 4x crops (drift_4x_fixed.png: s21 load 01 | s21 load 06 | fixed cap load 01, centre (880,200) device px at DSF 2, half 120): the three tiles are indistinguishable to my eye - the start marker sits identically registered in each, the dark border strokes cross the dark paper in the same place; the counted differences are 1-3 levels of antialiasing on thread edges, below what a crop can show, and nothing in the fixed tile reads worse than either mid-ease tile.

Done 4: npm test green on the landed tree (257 files passed, 2 skipped; 3206 tests passed, 9 skipped; tsc clean). K1529 closed with 434a34092; K1531 and K1482 left open. Probe-only change (no src/), so no ordinary-load guards and no deploy (a .claude//docs push does not deploy). Tried and left: an early bar run with job t=20 froze on 8c308669 (see Done 1) and was discarded, not measured; a lock run I terminated left orphan Chromes on the run's profile - killed by their verified command lines, their (lock-free) captures deleted and rerun under the lock; viewprobe load 1's sub-thousandth rest offset is named in Done 2, not chased. Preview :5481 and the run's Chrome profiles (k1529-*) stopped and removed at the stop line.

## Run C (27C): fade.mjs's verdict means something (K1494)

`.claude/probes/K1458/fade.mjs` prints FADE GUARD FAIL on master (26F; 26X 10 of 10 on one state; K1525 s1 on
330069e61). Its distances pass at every fade (678/679, 627/631, 439/451, 676/679 sides at fl 0 / 0.5 / 1.2 /
0.14); what fails is K1460's dot criterion: 79 / 98 / 68 / 103 sides with more than 2 dots, gf and gfh alike.
A guard that is always red proves nothing.
Done: 1. On a preview of 7fe4b9c6 (K1460's close): does the dot criterion pass? Numbers per fade. 2. If it
passed there, bisect to the commit that brought the dots back and name what it changed. If it failed there
too, show what the count sees: 4x crops with surroundings at five dot sides, today | gf (real dots, or a
counting artifact such as the K1474 colour mapping). 3. Then: a counting artifact is fixed in the count, and
five former dot sides read 0. Real dots from code outside the hands-off files are fixed. Real dots from inside
them are filed with the commit, the crops and the counts, and fade.mjs reports the dot criterion on its own
line (`DOTS FAIL (K<id>)`) so its distance verdict is a usable guard again. 4. fade.mjs on master: its verdict
passes, or names exactly the filed item; 3 runs in a row agree. 5. `npm test` green; K1494 closed with the
commit, or what is left recorded in it.

### Handoff 27C (Muse, 2026-11-20, done: every Done holds; K1494 closed with the fix commit)

Started 03:21 PST, stopped 04:44 PST. Starting master cdb0367e5; fix on master in 03bc0d4c4 (probes only: `.claude/probes/K1458/fade.mjs` + the run's tools under `.claude/probes/K1494/`; no `src/`, no hands-off file, so no deploy and, as a probe-only run, no ordinary-load guards - the fade guard itself is the run's guard, three times below). Previews of 7fe4b9c6 on :5487 and of cdb0367e5 on :5488 under `$env:TEMP\knotmaze-27C`, every capture sequence through `scripts/perf_lock.ps1 -Owner "muse-27C"` (run 2 waited 1,183 s behind K1482 s30's sequence). Captures, crops and zooms under `.claude/probes/K1494/out/27C/` (untracked: `fade_7fe/`, `fade_master1/`, `fade_diag/`, `fade_fix1-3/`, `crops_master_fl0.png`, `dotszoom_master_fl0.png`, `dotszoom_master_fl12.png`, `crops_7fe_fl0.png`, `dotszoom_7fe_fl*.png`). One physics state everywhere: hash f9d72040, sameState true on every load. Floor: the same build re-run reads dots within ±5 sides and pass within ±1 of itself (81-84 sides>2 and 615-619 dots at fl 0 across master1/diag), beside the verdicts below.

Done 1 (7fe4b9c6 does NOT pass; numbers per fade, gf = gfh within a dot). On the 7fe preview the dot criterion fails at every fade, worse than master: fl 0: 1,889 dots, 257 sides>2, pass 667/679; fl 0.5: 863, 145, 615/631; fl 1.2: 630, 106, 433/452; fl 0.14: 963, 160, 665/679. Master (cdb0367e5, same count): fl 0: 619, 84, 678/679; fl 0.5: 633, 97 (gfh 98), 628/631; fl 1.2: 442, 66, 439/451; fl 0.14: 677, 104, 676/679 - the standing FAIL, distances passing everywhere. So no commit brought the dots back: the criterion never passed, K1460 closed without it green. No bisect (Done 2's second branch).

Done 2 (what the count sees: a counting artifact - gf's one-pixel edge quantisation). Five former dot sides at 4x with surroundings, today | gf (`crops_master_fl0.png`: x228+, x43+, x5-, x25+, x33-): the tiles are indistinguishable; the amplified diff is only the threads' 1-px edge contours. Dot-centred 8x zooms (`dotszoom_master_fl0.png`, `dotszoom_master_fl12.png`) show every sampled dot sitting ON the dark gap line's contour, in a continuous diagonal staircase where gf steps coverage in one pixel and today blends over two; nothing sits isolated inside a faded span, and at fl 0 - no fade ramp at all - the old count still found 84 sides. Measured (fade_diag, dotFeat per counted dot): all 615 (fl 0) and 457 (fl 1.2) old-counted dots have brightest-neighbour excess <= 0.003 (median cv 1.000, brightest gf neighbour = the pixel itself: a contiguous edge run, never a speck), and today's local coverage range at each is ~1.0 (today's own edge within a pixel). 7fe's 3x count is the same edge read through K1474's then-unfixed colour lift (bg=none is fade.mjs's recipe); K1474's fix (5c058f5c) cut the count 257 -> 84 sides without touching the edge. Real dots would be isolated specks in a faded span; there are none to file, and nothing here is worse in gf than today beyond the sharper edge itself, which is gf's per-pixel look.

Done 3 (count fixed; five former sides read 0). `fade.mjs`: a dot must now beat its brightest neighbour by 0.08 as well as today's pixel by 0.2 and the neighbour mean by 0.12 - an isolated spike, not an edge step. dotFeat stays recorded per counted dot. Synthetic control of the rule: an edge step passes the old rule and fails the new, an isolated speck passes both, a shifted ramp passes neither. On master the five worst former sides (fl 0: x228+ 6, x43+ 5, x5- 4, x25+ 4, x33- 4; fl 1.2: x228+ 6, x163+ 5, x5- 4, x39- 4, x58- 4) all read 0, as does every side at every fade. No `DOTS FAIL` line is needed: the dot criterion now passes and stays inside the verdict, still printed on its own line per fade/variant.

Done 4 (master, three runs agree). Fixed `fade.mjs` on the master preview, three runs (`fade_fix1/2/3`): FADE GUARD PASS each time, dots 0 over every side at fl 0 / 0.5 / 1.2 / 0.14 for gf and gfh, passes 678/679, 627-628/631, 439/451-452, 676/679, sameState true throughout.

Done 5: `npm test` green (258 files passed, 2 skipped; 3,207 tests passed, 9 skipped; tsc clean). K1494 closed with 03bc0d4c4; K1531 and K1482 left open. Tried and left: a today-flatness gate (today's local range < 0.2) also zeroes every counted dot, recorded in dotFeat but not adopted - it leans on today's sub-pixel registration, where the isolation gate is intrinsic to gf's own frame. Previews :5487/:5488, the `$env:TEMP\knotmaze-27C` preview tree and the run's Chrome profiles (`profile_7fe`, `profile_master`) stopped and removed at the stop line.

## Run D (27D): one physics state per census scene (K1479)

26V (3ae03fdcb) fixed the bar's freeze parity in `k1436_screen.mjs`: all 12 scenes freeze on their K868 hash
in one try. K1479 stays open for what 26V did not cover (`### Handoff K1436 s3` in
`docs/design/K1436_s3_screen_bar.md` has the first sighting: ring on 50dd4ffd and 0a0ee15e within one build).
Done: 1. `ring`: 10 loads through `k1436_screen.mjs` and 10 through `.claude/probes/K1468/ab.mjs` land on one hash each
(`ab.mjs` takes `alignFreezeParity` if it does not have it). 2. `g41_user_tw42` against
`user_tw42.lightpaper`: decode both links' params. If they are one physics state by design (one seed and
params, another paint), the census counts the pair's finds once (name where); if not, find what makes
`g41_user_tw42` freeze on the other's state and fix it. 3. The stale hashes: per scene, every hash the K868
census, the bar's scene table and the pins under `test/` carry, against a fresh freeze on master; re-take the
stale ones in one commit, each named old -> new. 4. The bar's control (`-Ref` and `-Base` both master, all 12
scenes): new 0, grown 0, gone 0, no scene skipped. 5. `npm test` green; K1479 closed with the commit.

### Handoff 27D (Muse, 2026-11-19, done: every Done holds; K1479 closed in 7b5d80a78)

Started 21:26 PST, stopped 22:47 PST. Starting master 7fbd67e48; fix on master in 7b5d80a78 (probes only: `.claude/probes/K1468/ab.mjs`, `.claude/probes/K1436/k1436_bar_cmp.mjs`, `.claude/probes/K1436/k1436_s3_table.mjs`, plus the run's tools under `.claude/probes/K1479/`; no `src/`, no hands-off file, so no deploy and, as a probe-only run, no ordinary-load guards). Preview of master on :5485 (stopped and removed at the stop line); every capture sequence through `scripts/perf_lock.ps1 -Owner "muse-27D"` except the bar, which waits on the lock itself (it waited out K1482 s28's sequences from 21:59; its base captures then ran while that agent re-took the lock at 22:30 — the verdict below is still 0/0/0 with every freeze 1 try). Evidence under `.claude/probes/K1479/out/` (`ring_screen/ring_r*/meta.json`, `ring_ab/`, `fresh12/<scene>/meta.json`, `dedup_test/`); the bar's output is `.claude/probes/K1436/out/bar/27D_ctrl/bar.txt`.

Done 1 (ring, one hash per path). Through `k1436_screen.mjs` (bar jobs for ring, STRICT, kept profile): 10/10 loads freeze on 50dd4ffd, 1 try each, `0a0ee15e` never seen. `ab.mjs` lacked the parity alignment (it froze then stepped, the K1468 s2 lottery): it now calls `alignFreezeParity(page, SIMT)` before its freeze+StepUntil evaluate, and gained link `R` (the K868 ring link at `rp=gf&gfh=1`). Through it at SIMT 40.01666666666504: 10/10 loads hash 50dd4ffd. (Each ab load also logged one `webglcontextlost` from Pixi's support-test canvas, which its hook counts; hashes unaffected.)

Done 2 (the pair is one design; the census counts it once). `.claude/probes/K1479/decode_pair.ts` (the app's own `parseParams` on the K868 job links, `decodeToken` on the exported tokens): same seed 2430477599; the job links differ only in `background` (vellum/wash), `backgroundBase` (#151b28/#e6e9ee) and `backgroundColorMode` (gamut/custom) — paint only (the K868 census already showed the background moves neither hash nor geomHash). The diags freeze one substep apart (g41 substep 4801 hash a5f6d198, lightpaper 4802 hash 462652e7), and a fresh STRICT freeze of the identical bar query reproduces exactly those hashes at those substeps, so nothing "makes" one freeze on the other's state beyond the export-time parity choice. Counted once, in two named places: `k1436_bar_cmp.mjs` DEDUPs `user_tw42.lightpaper` under `g41_user_tw42` (its finds never enter new/grown/gone; a `DEDUP` line and a `deduped` count in bar.txt/bar.json say so; it is not a K1519 skip — both scenes still freeze and capture, and Done 4's "no scene skipped" holds), and `k1436_s3_table.mjs` excludes the lightpaper scene from the census totals with its per-scene row marked `(dup of g41_user_tw42, K1479)`. A synthetic two-scene comparator run prints `DEDUP ... finds counted once` with new/grown/gone 0.

Done 3 (no stale hashes; old -> new is identity for all 12). Fresh STRICT freezes on master (bar queries, 1 try each, `fresh12/`): muse_hash 733ee14a, def 910ff135, fat 814c4e1e, muse_default_tw c5d9f3b6, ring 50dd4ffd, g41_def_tw42 da10b9a5, g41_def_tw64 5ccb276f, g41_ring_tw42 f7b1dff2, g41_ring_tw64 ea67fc77, g41_user_tw42 a5f6d198, g41_user_tw64 0d51331b, user_tw42.lightpaper 462652e7. Carriers checked per scene: the K868 diag `frozenHash`/`frozenSim` and the README table (the same values), the bar's scene table (`k1436_bar.ps1` Get-Jobs reads those diags; `K1479/make_jobs.mjs` mirrors it), `.claude/probes/K1240/s4/k1240s4_crops.mjs`'s three (def, muse_default_tw, g41_ring_tw64 — all match), and `test/`, which carries no physics-hash pins (the outline pins digest the K868 scene files' geometry, which a matching freeze hash leaves untouched). Nothing was stale, so nothing was re-taken; the per-scene old -> new list is the fix commit's message (7b5d80a78).

Done 4 (bar control). `k1436_bar.ps1 -Ref master -Base master -Port 5486 -Tag 27D_ctrl` on 7b5d80a78, all 12 scenes: `PASS new 0 grown 0 gone 0 deduped 1 (user_tw42.lightpaper)`, missing 0, skipped 0, no FREEZE lines; all 24 captures (base and ref) froze 1 try on their K868 hash (the table in Done 3).

Done 5: `npm test` green (257 files passed, 2 skipped; 3206 tests passed, 9 skipped; tsc clean). K1479 closed in 7b5d80a78; K1531 and K1482 left open. Tried and left: nothing failed and was dropped — the bar's 30-minute lock wait and the under-load base captures are recorded above; `fix_s3.mjs` (the one-shot patch that applied the s3-table edit) is kept with the run's tools. Preview :5485, the bar's :5486, and the run's Chrome profiles (`k1479-screen-profile`, `k1479-ab-profile`) stopped and removed.

## Run E (27E): withdrawn 2026-11-20 01:25 (K1543's cause was found first)

Not a run: its line left the queue before the chain reached it. The failure it was to name is not load. K1482
stage 28's `run28.ps1` sets `$env:GF_KRETRY = "1"` for the bar and leaves it set through `npm test`, and
`test/render/gf_k1482_switch.test.ts` pins the Node default off: 3 of its 7 tests fail with the variable set,
all pass without (coordinator, 2026-11-20; stage 27's agent hit the same and named the tests). Run F's guard
script clears the variable; K1543 holds what is left.

## Run F (27F): the corner stages' tools: captures without the lottery (K1539), one guard script

Added 2026-11-19 23:55. Each K1482 stage agent rebuilds two things in its own worktree: a capture loop that
reloads until the physics hash matches, and a guard script. Both go into the tracked probes so the next stage
starts from them. Probes only: no `src/` change, so no ordinary-load guards at the end.
Done: 1. K1539: `.claude/probes/K1482/cap.mjs` calls `alignFreezeParity(page, SIMT)` before its freeze, as
`.claude/probes/K1458/dragcheck.mjs` and `.claude/probes/K1468/ab.mjs` do. The retry loop stays as the
fallback, and the header says so. 12 loads of link A with the arguments its header gives: 12 of 12 captured on
try 1, one physics hash (fff8c9e5), and for each look it writes 12 identical PNG hashes (`gf_b2view.txt`
differs per load by design: compare the pictures). K1539 closed with the commit. 2.
`.claude/probes/K1482/guards.ps1` (tracked: `git add -f`), made from the newest stage guard script: stage 27's
`run27.ps1` under `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a198fbb25c384a8cf\.claude\probes\K1482\s27\`
if it is there, else stage 28's `run28.ps1` under `...\agent-a1c1c68a332de8029\.claude\probes\K1482\s28\`
(other agents' worktrees: read, never write). Parameters `-Tag -Port -Ref -BaseRef -BarPort -OutDir -Owner
[-NoBar] [-BarOnly]`. The guards and their pass lines are that script's, unchanged (hold 60/60 on the two
ordinary links with the second corner try on and with `gfk=0`, panel open, the fill and the border drag check,
`npm test`, the K1436 bar): the header lists each with its pass line. New: each guard's whole output goes to
`<OutDir>/<guard>.txt`; one line per guard, `PASS|FAIL <guard>: <its numbers>`; a failed `npm test` prints the
failed tests' files and names (the JSON reporter, as in Run E); every capture guard runs through
`scripts/perf_lock.ps1` with `-Owner`; the exit code is the number of failed guards; `npm test` runs with `GF_KRETRY` removed from its environment (K1543: the stage scripts set it to 1 for the bar and left it set, and 3 tests of `test/render/gf_k1482_switch.test.ts` then fail), each other guard gets the value its source line gives it, set for that one child process. 3. Proof. The script on a
preview of master, twice: every guard PASS both times, the two runs' numbers side by side in the handoff. The
failure path once: in a scratch worktree (`git worktree add` under `$env:TEMP`, removed afterwards with `git
worktree remove`) make one test fail, and show that the `FAIL npm test` line names it and the exit code is 1.
4. Three lines at most in `.claude/rules/probes.md` on the two tools (where, usage, what PASS means). `npm
test` green.

### Handoff 27F (Muse, 2026-11-20, done: every Done holds; K1539 closed in e4f3a4657)

Started 04:55 PST, stopped 06:47 PST. Starting master 346e30f56; fix on master in e4f3a4657 (probes only: `.claude/probes/K1482/cap.mjs`, the new `.claude/probes/K1482/guards.ps1`, the driver `.claude/probes/K1539/cap12.ps1`, one line in `.claude/rules/probes.md`; no `src/`, no hands-off file, so no deploy and, as a probe-only run, no ordinary-load guards beyond the guard script's own). Page preview of master on :5481 (stopped and removed at the stop line); every capture sequence through `scripts/perf_lock.ps1 -Owner "muse-27F"`. Evidence under `.claude/probes/K1539/out/27F/` (untracked: `cap12/`, `guards_run1/`, `guards_run2/`, `guards_fail/`).

Done 1 (K1539 cured). `cap.mjs` now imports `alignFreezeParity` and calls it before its freeze, as `dragcheck.mjs` and `ab.mjs` do; its header says the reload loop stays only as a fallback net. Proof (`.claude/probes/K1539/cap12.ps1`, preview of master, HASH=fff8c9e5, FILL=1, kept profile): 12 of 12 loads captured on try 1 (0 reloads in every log), one physics hash fff8c9e5, and both looks byte-identical on all 12: `gf.png` SHA-256 993D919E0A76... and `gf_fill.png` 9ED51864EE02... (`cap12/cap12.csv` has the rows; the tracked tool writes `gf.png`/`gf_fill.png`, the stage copy's `gf_b2view.txt` has no counterpart here, so the pictures are the comparison, as briefed).

Done 2 (guards.ps1). Made from stage 27's `run27.ps1` (present; stage 28's has the same sequence). Parameters `-Tag -Port -Ref -BaseRef -BarPort -OutDir -Owner [-NoBar] [-BarOnly]`; the header lists the seven guards with their source pass lines (bar, hold, hold_gfk0, panelopen, dragcheck_b, dragcheck, npm test). New: each guard runs as its own child (its whole output in `<OutDir>/<guard>.txt`), one `PASS|FAIL <guard>: <numbers>` line per guard, the exit code is the failed count, every capture guard goes through `scripts/perf_lock.ps1 -Owner`, the bar keeps `-NoPerfLock` inside that lock, npm test runs with `GF_KRETRY` removed and on failure names the failed tests from the JSON reporter, and every other guard gets the `GF_KRETRY`/`STRICT`/`TLK` value its source line gives it, for that child only.

Done 3 (proof). On the master preview, twice, every guard PASS both times (run1's bar waited 708 s behind K1482 s31's lock; run2 took it at once): bar `PASS new 0 grown 0 gone 0` | `PASS new 0 grown 0 gone 0`; hold 60/60 edges min 6941 | 6949; hold_gfk0 min 6969 | 6801; panelopen 1 | 1; dragcheck_b 0/11/6/0 | 0/0/6/0 px over TOL 24; dragcheck 0/0/67/0 | 0/0/0/0; npm test 258 files, 3207 tests | the same (run1's line read the counts from its `npm_test.txt` before the ANSI fix in e4f3a4657's script). Failure path once: scratch worktree at e4f3a4657 under `$env:TEMP` (junction unlinked, worktree removed after) with `web_fade.test.ts`'s `WEB_FADE_S` expectation broken: captures all PASS and `FAIL npm test: ... web_fade.test.ts > webFadeLevel (K169) is 0 when the web completes...`, exit code 1.

Done 4: one line in `.claude/rules/probes.md` (K1539: where the two tools are, their usage, what PASS means); `npm test` green (258 files passed, 2 skipped; 3207 tests passed, 9 skipped; tsc clean). K1539 closed in e4f3a4657; K1531 and K1482 left open. Preview :5481, the bar's :5482 builds and the run's Chrome profiles (`k1539-cap`, `k1482-guards-*`) stopped and removed.

## Run G (27G): the start marker's glow ring comes back after a context loss (K1537)

Added 2026-11-20 01:25. K1537 in `LEDGER.md` has the one sighting (2026-11-19): after the probe Chrome's GPU
process restarted during a cold gf compile, a ring around the start marker was missing from then on (about
1,600 px, levels <= 28, device px x 745-826, y 78-159 in the fill drag check's view), and the page had logged
`Cannot read properties of undefined (reading 'stats')`. Not established: which object the ring is (first
suspect: the walker's glow, `WALKER_GLOW_TEX` in `src/render/fabric_maze_renderer.ts`, a canvas texture cached
at module level), whether today's renderer loses it too, and whether the app or the probe loses it (the drag
check pins clocks on a renderer the restore may have rebuilt). The app's handlers are in
`src/app/context_loss.ts`; `probe_hooks.ts` counts lost and restored events.
Done: 1. The repro, a tool under `.claude/probes/K1537/` (tracked: `git add -f`; its captures untracked). Load
K1537's link, and the same link without `rp=gf&gfh=1`; reach one state (`alignFreezeParity`, as
`.claude/probes/K1458/dragcheck.mjs` does) and shoot. Lose the app canvas's context
(`getExtension("WEBGL_lose_context").loseContext()`), restore it 2 s later, wait until the page draws again,
shoot. Count the px over tol 6 between the two shots, inside the ring's box and outside it (give the box for
your view). The floor first: two shots with no loss between them. 5 loads per renderer. 2. One of three. (a)
Something is missing after the restore in at least 1 load of 5: name the object (hide or tint it to prove
it) and why the restore does not bring it back, fix it in `src/` outside the hands-off files, then 5 of 5 loads
per renderer at the floor, in the box and outside. A second object that stays missing is fixed too if it is
the same cause; else it is listed with its px and its box, for the coordinator to file. (b) Nothing differs in
5 loads per renderer: try the sighting's own shape, a loss within 1 s of the load under `rp=gf&gfh=1` with the
restore 5 s later, 5 loads. Still nothing: the numbers go in the handoff, K1537 gains "not reproduced by
WEBGL_lose_context (N loads)" from the coordinator, and the run stops with no `src/` change. (c) The app draws
the ring and only the drag check loses it (its pinned clocks sit on a rebuilt renderer): fix the probe, show
its stops at 0 px in the box after a loss. 3. The `stats` error: its throw site by file and line if it shows
in any load; fixed only if the site is outside the hands-off files and the fix is the same cause, else one
line for the coordinator to file. 4. A `src/` change ends with How to work's guards and `npm test` green, and
with a unit test where the fix has a pure part. K1537 closed only under (a) or (c).

### Handoff 27G (Muse, 2026-11-20, stopped at the time line: branch (a) reproduced, the fix filed as K1550; K1537 left open)

Started 06:59 PST, stopped 08:12 PST. Starting master 29912ad73; no `src/` change and no hands-off file touched (probes only: `.claude/probes/K1537/repro.mjs`, `cmp.mjs`, `crop.mjs`, `hunt.mjs`, tracked; captures untracked under `.claude/probes/K1537/out/27G/`). Preview of the working tree on :5489 (stopped and removed at the stop line); every capture sequence through `scripts/perf_lock.ps1 -Owner "muse-27G"`. One kept profile (`.claude/probes/K1537/profile27g`, removed at the stop line). State on every load: hash f9d72040 (SIMT 20, `alignFreezeParity`, `__knotPinClocks(100)`, view held bit-still); the ring box for this view is device px x 740-830, y 74-164 (centre 785,119 - the sighting's box, x 745-826, y 78-159, is the same marker in the same 1600x900 DSF 2 view). Floor first, every load: two shots with no loss between them differ by 0 px in the box and 0 outside (tol 6), gf and today alike.

Done 1+2, late shape (the brief's first repro): lose the app canvas's context on the settled page, restore 2 s later, wait for composites/rAFs, shoot. 5 of 5 gf loads and 5 of 5 today loads: 0 px in the box, 0 outside - the floor. Under gf the `__knotGf` object is rebuilt by the restore (frame_loop's dispose + recreate; `sameGf` false) and its threads come back bit-identical; Pixi's own restore brings the overlay back when every compile/upload finished before the loss. So the plain repro does not reproduce, and the run took branch (b)'s second step.

Done 2, the sighting's own shape (loss as soon as the app canvas has a WebGL2 context, 1.0-2.1 s after `goto` with a warm profile, restore 5 s later, then the same freeze/pin/shoot; each settled shot compared with a clean gf load's, cross-load floor 0/0): gfE1-E4 0 px in, 0 out; **gfE5 8,281 px in the box (the whole 91x91 box, max 234) and 14,107 outside** (bbox x 707-2447, y 40-1713). Two further breaks in 36 hunt loads (hunt batches of 8/12/12/12: 1, 0, 1, 1) - about 1 in 5-8 early loads, 3 of 41 in total. The object, proved by the crop sheet (`gfE5_crop.png`, clean left | gfE5 right, 4x on the ring box): the start marker is gone - its coloured rim, black disc and white glyph - and the soft head glow behind it is gone; the threads are pixel-identical (sample (985,419): (204,122,143) in both; marker centre: clean (255,255,255), gfE5 (38,44,57); backgrounds identical). Named: the Pixi-drawn fabric overlay at the head/start - the `MarkerMesh` discs (`src/render/marker_mesh.ts`) and the head-glow `Sprite` (`headGlowTexture()` in `fabric_maze_renderer.ts`, whose halo is what fills the ring box in the clean tile). Why the restore does not bring it back: on the broken loads, and only on them, the page logs 5 Pixi shader compiles attempted on the lost context (`Could not retrieve shader source` / `Could not initialize shader`, x5 programs); Pixi's `webglcontextrestored` handling revives resources that were bound before the loss but never the ones whose first compile/bind raced it - JS state stays perfect (markers `visible`/`renderable` at the right global position (392.66,59.33 CSS), glow alpha 0.3, containers parented, gf rebuilt with 213+ composites), and with gf's composite child hidden and the ribbon layers un-hidden Pixi still draws nothing at the marker (centre stays (21,27,40)): Pixi's batch rendering is dead for the page's life, while gf's raw-GL threads survive because the frame loop disposes and rebuilds the gf app on restore (`frame_loop.ts`'s restore branch - the same K868 S3a2 pattern that rebuilds the label app) and no equivalent rebuilds the fabric overlay, which `context_loss.ts`'s header trusts Pixi to restore. Tried and failed as in-page revivals on live broken pages: dropping `_gpuData` on the glow texture source, the marker geometries and their buffers; `source.update()` on every overlay texture; `buffer.update()` on the marker geometries - all still 8,281 / 14,107. The Pixi renderer handle for clearing its shader cache was not reachable from the probes (`F.ribbons.renderer` was not it), so no verified app fix landed in this run's window: the fix is filed with these numbers and the two candidate shapes (clear Pixi's program cache / re-emit its contextChange in the restore branch, or rebuild the overlay and drop the page-lifetime caches `MARKER_MESHES` and the glow textures) as K1550. K1537 is **not** closed (Done allows closing only under a landed (a) fix or (c)); it stays open with the repro numbers above - contrary to (b)'s "not reproduced" wording, the fault DOES reproduce in the sighting's own shape.

Done 3 (the `stats` error): `Cannot read properties of undefined (reading 'stats')` never appeared in 47 loads (pageerror listeners on every load; the only errors are the Pixi shader console errors above, and only on broken loads). No throw site to name from this run; the sighting's 26 s-after-loss timing still fits a reader of the disposed `__knotGf` (its `stats`), which the coordinator may file from K1550's evidence.

Done 4: no `src/` change, so no unit test and, as a probe-only run, no ordinary-load guards (How to work); `npm test` green (258 files passed, 2 skipped; 3,207 tests passed, 9 skipped; tsc clean). K1531 and K1482 left open. Preview :5489 and the run's Chrome profile stopped and removed at the stop line.

## Run H (27H): fade.mjs's dot rule catches the dotted line it was written for (K1548)

Added 2026-11-20 06:00. Run 27C (03bc0d4c4) changed the dot rule in `.claude/probes/K1458/fade.mjs`: a dot must
now beat its brightest neighbour by 0.08, as well as today's pixel by 0.2 and the neighbour mean by 0.12, so
that rp=gf's one-pixel edge steps stop counting. Its only control was synthetic. The rule exists to catch one
real fault: rp=gf drew a dotted line across the faded under thread, on the over thread's edge (K1460; fixed by
a8d36be33, which changed `gf_look.ts` only; its parent 1de01c120 still draws the line). A run of dots along an
edge is not one isolated speck, so the new rule may no longer see it.
Done: 1. Build both commits (`pwsh scripts/preview.ps1 -Port <p> -Ref 1de01c120`, and a8d36be33). On each, at
fl 0 / 0.5 / 1.2 / 0.14, for gf (and gfh where the build has it): the sides with more than 2 dots under the
OLD rule (today's pixel and the neighbour mean only) and under the NEW rule. If today's `fade.mjs` cannot
drive a build of that date (a hook it needs is missing), capture with that commit's own copy (`git show
1de01c120:.claude/probes/K1458/fade.mjs`) and apply today's two counts to those captures; say which you did.
4x crops with surroundings of the three sides of 1de01c120 with the most dots under the old rule, today | gf |
gf with the counted pixels marked under each rule: are they the dotted line? 2. One of two. (a) The new rule
fails 1de01c120 on the sides the crops show as a dotted line and passes a8d36be33: put the numbers in
`fade.mjs`'s comment and close K1548. (b) It does not: change the rule until it fails 1de01c120's dotted sides,
passes a8d36be33, and still reads 0 dots on master at every fade for gf and gfh (the edge steps 27C showed
stay uncounted); the handoff has the counts per fade for the three builds, before and after. 3. `fade.mjs` on
master: FADE GUARD PASS, 3 runs in a row agree. 4. `npm test` green; K1548 closed with the commit, or what is
left recorded in it. Probes only: no `src/` change. Stop the preview servers and remove their directories.

### Handoff 27H (Muse, 2026-11-20, stopped at the time line: the control cannot be given on fade's link; K1548 left open with the cause recorded)

Started 08:18 PST, stopped 10:10 PST. Starting master 30fb2d1df; probes only (`.claude/probes/K1458/fade.mjs` dual count + the run's tools under `.claude/probes/K1548/`; no `src/`, no hands-off file, so no deploy and, as a probe-only run, no ordinary-load guards - the fade guard itself is the run's guard, three times below). Previews of 1de01c120 on :5486, a8d36be33 on :5487 and the working tree on :5488 under `$env:TEMP\knotmaze-27H` (stopped and removed at the stop line); every capture sequence through `scripts/perf_lock.ps1 -Owner "muse-27H"` (the first waited 1,062 s behind K1482 s33's guards). Captures, crops and stats under `.claude/probes/K1548/out/27H/` (untracked: `fade_1de_a/b`, `fade_a8d_a/b`, `fade_master1-3`, `fadeA_debug`, `crops_1de_fl12.png`, `crops_1de_fl014.png`). One physics state per build set: seed 3 hash f9d72040 everywhere below, link A hash fff8c9e5. Today's `fade.mjs` drives both old builds as-is (their pages have every hook it needs; a fl 0 smoke on 1de01c120 read the same hash and PASS), so both rules were counted in one pass: `fade.mjs` now records `dotsOld`/`dotFeatOld` (the pre-27C rule, today's pixel + neighbour mean) beside the new rule's `dots`, plus per-dot neighbour features.

Done 1 (counts, gf = gfh on every line; dots over sides with more than 2). OLD rule: 1de01c120 fl 0: 1,918/259, fl 0.5: 862/146, fl 1.2: 620/105, fl 0.14: 961/162; a8d36be33: 1,998/264, 862/144, 622/105, 960/162; master: 616-623/84, 625-630/95-97, 437-444/65-68, 673-675/104-105. NEW rule: 0 sides over 2 on all three builds at every fade (a single dot at fl 0.14 on the two old builds). So the new rule does not fail the parent build: branch (a) does not hold. Crops (Done 1's question): the three 1de sides with the most OLD dots at fl 1.2 (x48- 8, x95- 7, x128+ 7) and fl 0.14 (x241+ 10, x255- 10, x24- 8), today | gf | gf with the counted pixels marked - the tiles are indistinguishable, the marks are 1-2 px specks on thread edges, and no dotted line crosses a faded span in any tile. They are the same one-pixel edge steps 27C found on master, not K1460's line.

Done 2 (no mend exists on this link, with the numbers). Per side, the two old builds differ by ±1-8 OLD dots in both directions (`sidediff.py`; at fl 0 the fixed build counts more), and their counted-dot features are the same distribution (`dotstats.py`: supporters 3-6 of 8 neighbours within 0.05, brightest-neighbour excess < 0.02 on both - contiguous edge pixels, never the isolated specks the new gate looks for). Any gate that fails 1de01c120's counted sides fails a8d36be33's and master's with them, so Done 2(b)'s three-way split is not reachable here. The fault does not live on this link: K1460's own captures (`.claude/probes/K1460/shot.mjs`) use link A (`Q=3.FGH1HtvQeDjm6e4BII`, now an env override in `fade.mjs`), and one diagnostic load of link A on 1de01c120 kept 0 of 700 sides - 654 skip on `uu` (today's under colour within ~35 levels of the flat backdrop: the coverage projection has nothing to read), 46 on `iu` - so this measure cannot count dots there either. What is left, recorded in K1548: a link-A-capable coverage read (the under colour against a non-backdrop reference), then this same dual count on the two builds there. The dual count and the numbers stay in `fade.mjs`'s dot comment for that run.

Done 3 (master, three runs agree). `fade.mjs` on the master preview, three runs: FADE GUARD PASS each time, new-rule dots 0 over every side at fl 0 / 0.5 / 1.2 / 0.14 for gf and gfh, passes 678/679, 627/631, 439/451-453, 676/679, sameState true throughout.

Done 4: `npm test` green (258 files passed, 2 skipped; 3,207 tests passed, 9 skipped; tsc clean). K1548 is NOT closed: the briefed control was not produced, because on the only link this guard measures, the parent build draws no dotted line for any rule to catch; the item keeps the link-A follow-up above. K1531 and K1482 left open.

## Run I (27I): two loads of the plain link agree, or the cause is named (K1544)

Added 2026-11-20 06:00. K1544 in `LEDGER.md`: two loads of ONE build of `?3&xp=off&am=instant`, asleep, at one
physics hash (0cbb8f07), differ by 193,124 px (today's renderer) and 101,249 px (rp=gf fill) over 24 levels in
the thread area (run 26Z; captures `.claude/probes/K1223/out/26Z`). Link A gives 0-3 px. Not established:
whether the two loads hold particle positions the hash cannot tell apart, or draw one state differently.
Done: 1. The repro, a tool under `.claude/probes/K1544/` (tracked: `git add -f`; its captures untracked): 6
loads of the plain link on one build of master, with today's renderer and with `rp=gf&gfh=1`, each brought to
one state the way `.claude/probes/K1458/dragcheck.mjs` does (`alignFreezeParity`), asleep. Per load: the probe
hash, a whole dump of the stepping state (`src/physics/probe_dump.ts` has the dumps and their hashes), the
view (scale and offset) and a shot. Per pair of loads: the largest position difference in world units and in
device px, whether the views agree, and the px over 24 levels in the thread area. 2. Name the cause from
those numbers, one of: (a) the states differ (by how much, in which particles, and what the hash leaves out
or rounds so that it is equal), (b) the states agree to the bit and the views differ, (c) both agree and the
draw differs (name the layer: hide it or tint it to prove it). 3. Fix what is fixable outside the hands-off
files and outside the physics step: for (a) the capture recipe (a fixed sim time before the shot, as link A's
checks use, or a finer hash that the probes compare before they trust a pair), for (b) the view, for (c) the
layer if its code is not hands-off. Then 6 loads agree pairwise at link A's floor (0-3 px over 24 levels in
the thread area) for both renderers. A cause inside the physics step itself (two loads of one link reaching
different rest states) is NOT fixed here: file it with the numbers and stop that part. 4. `probes.md` gains
two or three lines: how to take a 0 px check on the plain link, or why not to. 5. `npm test` green; K1544
closed with the commit, or what is left recorded in it.

## Run J (27J): t84e's fold rule drawn by the shader at master's frame rate, then switched on (K1526)

**DROPPED 2026-11-20 10:52, never run.** Levi accepted t84e as it is (K1549: "j15 must be fixed. The others are
fine"), and its line is out of the queue. What follows is kept as the record of the rule only.

Added 2026-11-20 07:45. **Held in the queue behind a `#` until the coordinator removes it.** This run changes
`src/render/gpu_field/` (`gf_glsl.ts`, `eval.ts`, `tables.ts` if you bake a flag): the one exception to How to
work's hands-off list, so it runs only while no Claude agent works there. Leave K1526 and K1482 open.

**t84e** is one of the 14 sites Levi named on link A (K1490: "Fix the wedges and notches, accept the
slivers"): 1554,914 on the 3200x1800 frame, its wedge near 1541,940. K1482 stage 32 found a rule that removes
the wedge in the CPU copy (`### Handoff K1482 s32` in `docs/design/K1482_s32_t84e_paper.md`; the entry LONE
FOLD in `.claude/rules/render-gpu-field.md`; read both first): `eval.ts`'s `foldD` past `!inOther` plus the
sibling burial, on master only with env `GF_S32=1` (and `GF_KRETRY=1`). On the CPU copy link A changes in ONE
place (`.claude/probes/K1482/s32/wd32.ts`, stride 2, thr 0.02: 1537,938, 32 samples, all lost ink), and with
the second corner try off (`GF_KRETRY` unset) in none. One faint px stays at 1540,950 (ink 0.225): leave it.
Its shader twin, `loneFold(src)` in `gf_glsl.ts`, is exported and never called. Applied in `retryForm`
(`return loneFold(homeBurial(src));`, commit 8cc774eb8, `npm test` green there), Chrome drew 3 composites in
the 4.6 s after its switch to gf where master drew 90 in 3.2 s (`diag32.mjs`), and `cap.mjs`'s forced redraw
timed out at 240 s twice. **Not established: whether that is a slow frame or a compile stall.** The record
ends 4.6 s after the switch and both profiles were cold (K1456: master's cold gf compile takes 34-117 s); a
shader with two more loops may only compile longer. Stage 32's suspects, untested: `member()` and `depth()`
inlined in `foldD` inside the faces loop; the D search's two extra segment loops for every face pixel of a
lone piece; the zb form's second copy. Its suggestion: bake a per-piece "lone fold" flag and the fold's foot
group at the piece scan (`tables.ts`) and run the D search only where the plain loop found a turned segment.
The split (packed) form has no arc table and the retry does not use it: leave it uncovered and say so.
Tools, tracked in `.claude/probes/K1482/s32/` (usage in each header): `diag32.mjs <url> <profileDir>`
(composites, `switchedMs`, frames every 5 s for 14 samples: lengthen it), `wd32.ts <scene.json> <sites.json>`
(the CPU copy's whole-link diff, rule off against on), `mimg32.ts` (the CPU copy's ink at a place, before |
after | diff), `px32.ts`, `glsl32.ts` (every tier's shader text), `sheet32.py`. `scene_gf.json` and
`sites_gf.json` come from `.claude/probes/K1482/cap.mjs` with env `SCENE=1`.
Done: 1. **The cause, before any change.** Two builds: master, and master with the one-line switch of
8cc774eb8. Per build a first load on a fresh profile (cold) and a second load in the same profile (warm), with
diag32 lengthened to 180 s past the switch to gf: seconds to the switch, composites per second in each 5 s
window after it, the windows with none. Under the perf lock, in the order master, candidate, master. Say which
it is, with the numbers: a slow frame (the warm rate is under master's), a compile stall (cold only), or both.
2. **The cure.** A slow frame: make the rule cheap (the technique is yours; the suggestion above is one) and
change the CPU copy with it so the two stay twins, until the warm rate is within 10% of master's and
`cap.mjs` captures link A on the first try in 3 loads of 3. A compile stall only: no rewrite, the cold switch
time is the number (2 fresh profiles per build). 3. **Switched on** (`retryForm` applies `loneFold`; `eval.ts`'s
`s32` follows the retry switch and env `GF_S32=0` turns it off, as in 8cc774eb8) only if all of this holds on
your tip, measured before the commit that switches it on: (a) link A's border look (`&tlk=border`), new
against master, loads of one state (hash fff8c9e5) and one view, the floor first (two loads of one build, 0
px): every px that changes at a luminance step of 1 lies inside x 1497-1577, y 898-978; its count, gain and
loss go in the handoff beside the CPU copy's 32 samples; (b) with `&gfk=0`, and in the fill look
(`&tlk=fill`): 0 px in the whole frame; (c) `wd32.ts` on your tip still names one place; (d) the warm rate
within 10% of master's, and the cold switch time at most 15% over master's (one session, fresh profiles); (e)
`.claude/probes/K1482/guards.ps1` with `-Ref` your tip and `-BaseRef` master before your first commit: seven
PASS; `npm test` green (a pin that moves is re-frozen in the same commit and named in its message). If only
the cold time fails, land the cheap form OFF with both times in the handoff: the coordinator decides. 4.
**Sheets, no verdict.** Under `.claude/probes/K1482/out/27J/` (untracked): master gf | new at t84e (a 400 px
crop with its surroundings and a red box, then the box at 6x; contrast stretched, the outline is only about 15
levels darker than a pinhole inside it), and the same pair at the four clean fold points a bare angle gate
could not tell from t84e: 1689,224, 1571,252, 1895,1358 and 1543,1602. Write what you see at each, including
what is worse. The coordinator looks at t84e on your capture before anyone calls it fixed. 5. Three or four
lines under LONE FOLD in `.claude/rules/render-gpu-field.md`. 6. If no form reaches the rate by the stop line:
the rule stays OFF on master (it renders as today), what you built stays as a patch under
`.claude/probes/K1482/s32/` (untracked), and the handoff has the cost of each part you measured.

## Run K (27K): everything Pixi draws comes back after an early context loss (K1550)

Added 2026-11-20 08:35. Run 27G found the fault: read `### Handoff 27G` above and K1550 first (K1550 is 27G's
item; the coordinator renumbered it from a second K1549). Under `rp=gf&gfh=1`, a context loss 1.0-2.1 s after
the load, restored 5 s later, leaves everything Pixi draws dead for the page's life in 3 of 41 loads: the
start marker and its glow in the ring box, and 14,107 px outside it that 27G did not name. Those loads are
exactly the ones that log Pixi shader compiles on the lost context (`Could not initialize shader`). A loss on
a settled page restores at the floor, 10 of 10. This run fixes it in `src/`: `src/app/context_loss.ts`,
`frame_loop.ts`'s restore branch, `src/render/fabric_maze_renderer.ts` and `marker_mesh.ts` are yours; the
hands-off list stands. 27G's tools are in `.claude/probes/K1537/` (`repro.mjs`, `hunt.mjs`, `cmp.mjs`,
`crop.mjs`); K1537 itself is the one sighting, a smaller shape (a thin ring of about 1,600 px, levels <= 28,
the marker still there), which 27G did not see in 47 loads.

Done: 1. **A repro that breaks nearly every load.** 3 of 41 cannot test a fix: with no fix at all, five clean
loads in a row happen 7 times in 10. Make the loss land where the broken loads have it, before or during
Pixi's first shader compiles (for instance from `evaluateOnNewDocument`: lose the context as the app canvas
gets it, or at the first `compileShader`; the technique is yours). Target: at least 8 of 10 loads broken on
master, each load compared with a clean load of the same state (27G's hash and view; the cross-load floor
first, 0 px in the box and 0 outside). Name what the px outside the box are. If 45 minutes do not reach the
target, keep 27G's timing and use the fallback gate in 4(b). 2. **Today's renderer** (the same link without
`rp=gf&gfh=1`), the same loss, 10 loads: how many break and what is missing. There the threads are Pixi's
too, and 27G ran only the late shape on it. 3. **The fix:** after a restore everything Pixi draws is back,
whatever had or had not been compiled or uploaded before the loss. K1550 has 27G's two candidate shapes and
its three in-page revivals that failed; the technique is yours. Keep the gf rebuild the restore branch already
does. A unit test in `test/app/context_loss.test.ts` for the part Node can test. 4. **The gate**, on a build
of your tip, one kept profile: (a) with the repro of 1: 0 of 20 loads off the floor under gf and 0 of 20 under
today's renderer, in the box and outside it; a load that shows K1537's smaller shape counts as off the floor;
(b) the fallback, if 1 missed its target: 0 of 45 early loads off the floor under gf, AND at least 3 of the 45
logged the lost-context compile errors; fewer than 3 is not proven: say so and leave K1550 open; (c) the late
shape still at the floor, 5 of 5 gf and 5 of 5 today; (d) no page error in any load (the `stats` error of
K1537: its throw site by file and line if it shows). 5. `npm test` green, the ordinary-load guards of How to
work, the deploy green. Close K1550 with the commit only when 4(a) or 4(b) holds together with (c) and (d).
Leave K1537 open: say in the handoff whether any load showed its smaller shape, before or after the fix, and
the coordinator decides. 6. **Crops, no verdict:** under `.claude/probes/K1537/out/27K/` (untracked), clean |
master after the loss | your tip after the loss, 4x, at the ring box and at one place outside it, for gf and
for today's renderer. Write what you see at each, including what is worse.

## Run L (27L): how often each corner fault kind occurs on 20 other mazes (K1551)

Added 2026-11-20 08:41. A MEASURING run, approved by Levi (his "Sgtm" to K1549 c): no `src/` change, and
nothing here closes on a look. Why: 14 Claude stages chased single places on link A and 8 of Levi's 14 are
still open; the next corner rule is to be picked by how often its fault kind occurs across mazes, not by one
link. Faults are flaws in rp=gf's outline strokes where threads meet or end: **wedge** (the angle between
two strokes filled solid), **notch** (a bite out of a stroke's edge), **sliver** (a thin eye of page between
two strokes, often with a dot in it), **dot / tick / dash** (stray ink thinner than a stroke), **break /
stub** (a stroke that stops short, or a short spur). Tools, tracked in `.claude/probes/K1482/` (usage in
each header): `cap.mjs <base> <outDir> <profileDir> [query]` (one frozen rest state of any link: `gf.png` at
3200x1800 and `sites.json`, every junction `j<n>` and fused tail end `t<n>s|e` with its device px),
`specks.py` (stroke px a 2x2 or 3x3 opening removes, per site), `tiles.py` (4x tile sheets per site),
`sweep_table.py`.

The labelled sets, both on link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1`, hash fff8c9e5, 327
sites): (i) master 0007c8df, every tile judged by eye: `.claude/probes/K1482/classes_master.txt`, 85 faulted
(sliver 33, wedge 19, notch 11, dot 7, tick 5, dash 4, break 3, stub 3), the other 242 clean; (ii) today's
master: a wedge or notch still at t84e, j59, t23e, j47, j15, t59s, t58e, j41; fixed, so they must read
clean: j14, j50, t45s, t81s; slivers Levi accepted: j71, j95, j147, t43s, t56s; j4 and t4s are being asked
of Levi: either reading is right.

Done: 1. **A detector that reads a frame, not a person.** `census.py <sites.json> <gf.png>` under
`.claude/probes/K1551/` (tracked; its outputs untracked): per site, a number per kind and a flag. The
measures are yours; a start: the stroke's width from the frame itself (the mode of the ink's local
thickness), then solid = ink whose inscribed disc is over about 1.5 strokes wide (wedge), thin =
`specks.py`'s residue (dot, tick, dash), eye = an enclosed page hole narrower than a stroke (sliver), bite =
a stroke edge that steps in by 2 px or more over a short run (notch). Python has numpy and PIL, no scipy.
2. **Checked against (i).** A build of 0007c8df (`scripts/preview.ps1 -Ref 0007c8df`); if today's `cap.mjs`
cannot drive it, `git show e063ee091:.claude/probes/K1482/cap.mjs` is the one written for it. Set each
threshold on the odd-numbered sites and report the even-numbered ones: per kind, of the labelled sites how
many it flags, and of the clean ones how many it flags. A measure that flags under half of its kind, or
more clean sites than faulted ones, is NOT usable: say so and leave that kind out of the census rather than
tune it further. 45 minutes for 1 and 2 together; if the old build cannot be captured in 20 of them, check
against (ii) alone and say the sample is 8. 3. **Checked against (ii)** on a build of master: the 8 open,
the 4 fixed, the 5 slivers, and how many of the other 308 it flags. 4. **The census**, on a build of master,
one kept profile, `&snd=none`, all in the border look (`&tlk=border`; first confirm on link A that the frame
with it equals the frame without: if they differ, say so and capture the first ten in link A's own look):
link A's settings on ten other seeds (`?<s>.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1`, s = 4 5 6 7 8 9 a
b c d) and the default design on ten seeds (`?<s>&xp=off&am=instant&gfh=1`, s = 1 to 9 and a). A link whose
capture fails twice is replaced by the next seed and named. Captures under the perf lock, at most 25 minutes
a call, so in batches. 5. **The table**, in the handoff: one row per maze (sites, flagged per usable kind,
per 100 sites), link A's row, the totals, and two sentences of fact: which kind is the most frequent per
100 sites, and whether link A's rate of each kind lies inside the range of the twenty. 6. **Sheets, no
verdict:** per usable kind, the 12 highest-scoring flagged sites of the twenty as 4x tiles with their
surroundings (`tiles.py`), under `.claude/probes/K1551/out/27L/` (untracked). Write what you see at each;
the coordinator and Levi judge them. Close K1551 with the commit that tracks the tools and this handoff.

## Run M (27M): what each corner rule costs to compile and to draw (K1552)

Added 2026-11-20 08:41. A MEASURING run, approved by Levi (his "Sgtm" to K1549 d): no `src/` change at all
(the hands-off list stands; you only read and call those files). Why: K1482's stages added corner rules to
gf's fragment program one place at a time; `gf_glsl.ts` grew from 99,181 to 118,448 bytes between 2026-11-17
and 11-20 (`eval.ts` +30%, `tables.ts` +29%), and K1456 found that the wait on a first visit is that one
program's compile (40-96 s in the worker; 143 s whole against 18 s with `layers()` stubbed). The question
behind this run: would deciding corners once at maze build, baked into the tables, buy back compile time and
frame time, and which rules are worth moving first. You measure; the design is a later Claude stage. Read
K1456 and `### Handoff K1456 s2` in `docs/design/K1456_s2_first_visit.md` first. Tools, tracked, usage in
each header: `.claude/probes/K1456/s2/dumpsrc.mjs <url> <profileDir> <outDir>` (the vertex source and every
fragment source the app posts to its compile worker), `ctime.mjs <vs.glsl> <out.json> <a.frag> [b.frag ...]`
(compile + link seconds per source, each with a nonce so no cache answers; env `SERIAL=1` one at a time),
`.claude/probes/K1482/s32/glsl32.ts` (every tier's shader text), `diag32.mjs` (composites after the switch
to gf), `.claude/probes/K1482/cap.mjs` (lines 57-58 force one redraw). `gfFs` in `gf_glsl.ts` builds the
text for a given form, so a Node script can call it for the program with and without `retryForm`.

Done: 1. **The rule list**, at most 12 rows, drawn up from `gf_glsl.ts` and the dated stage entries of
`.claude/rules/render-gpu-field.md`: every block a K1482 stage added or grew (the second corner try
`retryForm`, the home burial `homeBurial`, the rounding at joints, the lone fold
`loneFold`, which is exported and not applied, and the rest), each with its function names, its commit and
its size in characters in the dumped source. 2. **The floor.** Dump link A's sources from a build of master
(`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1&snd=none`). Three batches of two identical copies of
the largest fragment source: the spread between twins is the floor every later difference is read against.
3. **Compile cost per rule**, with no build: for each rule a copy of the fragment text with that rule
neutralised (its function body replaced by the value it returns when it does not fire, or its call removed;
the technique is yours; the copy must still compile and link: a variant that fails is reported, not timed).
Time each variant against a control copy in its own batch, three batches, the median: characters removed,
seconds saved, and whether that is over the floor. Then one variant with every listed rule neutralised at
once, and, if `dumpsrc.mjs` can drive it, the full program of a build of 0007c8df (2026-11-17, before most
of them). All timings under the perf lock, at most 25 minutes a call. 4. **Draw cost**, warm, on a build of
master, one kept profile, link A at rest after its switch to gf: the wall time from a forced redraw to its
composite (`stats.composites` moves), 100 times, three repeats, the floor from the repeats; the same with
`&gfk=0` (the second corner try off: the one rule a link can switch). Report ms per redraw for both and say
whether the difference is over the floor. Per-rule draw cost needs builds and is NOT this run. 5. **What
each rule reads**, from the GLSL, one row per rule: table texels only, or also the pixel's own position or
distance; and whether its outcome is one answer per corner (the same for every pixel of that corner: a
candidate for a table flag) or varies across the corner's pixels. Fact, no proposal. 6. **The table**, in
the handoff: rule | chars | compile seconds saved (over the floor or not) | reads | per corner or per pixel,
then the all-rules row, the 0007c8df row and the two draw numbers. Scripts under `.claude/probes/K1552/`
(tracked), outputs under its `out/27M/` (untracked). Close K1552 with the commit that tracks the tools and
this handoff.

## Run N (27N): the side-run gate's table cost back to where it was (K1553)

Added 2026-11-20 10:52. A fix run with ONE exception to the hands-off list: you may rewrite the BODY of
`sideRuns` in `src/render/gpu_field/tables.ts` (K1482 stage 33, f7b965265) and nothing else in the six
gpu_field files: its signature, the constants `RT_DMIN`, `RT_TOL`, `RT_RUN`, its call in `buildTables` and
every other line stay. Before you edit: pull, then `ledger.mjs show K1482`; if its `owner:` line names a
running stage, stop and report without editing (one agent per file area: a stage in that file lands first).

Why: `sideRuns` fills `GfTables.rtM` (per chain C, the chain M whose tube C's lies beside over a long run
without ever dipping under it; the doc comment above the function is the definition). It runs in every table
build while the second corner try is on, and the tables are rebuilt for every physics snapshot while the knot
moves. Measured in one capture session as link A loads (`tms`, the pool's last four table builds, printed in
the capture tool's `pool {...}` line): 12.2-17.3 ms on master before it, 21.8-28.5 ms with it, about 9 ms a
build; with `&gfk=0` (no `rtM` built) 9.2-38.8 ms on both. Tools, tracked, in `.claude/probes/K1482/s33/`:
`rt33.ts` (its header: the chains marked on link A and on the bar's mazes, and the function's time in Node),
`cap28.ps1` with `cap28.mjs` (the capture; `-Env 'GF=1,B2=1,FILL=1,SCENE=1'` also writes `scene_gf.json`,
which `rt33.ts A` reads; a Node probe needs env `GF_KRETRY=1`, and `npm test` needs it unset).

Done: 1. **The reference.** Copy today's function whole to `.claude/probes/K1553/side_ref.ts` (tracked): every
later version is compared with it, element by element. 2. **Fixtures.** Link A's scene, the bar's four mazes
(`ring`, `def`, `muse_hash`, `g41_user_tw64`, loaded as `rt33.ts K` loads them) and 100 moved copies of each
of the five: every vertex shifted by a seeded random offset of up to 0.3 h, and in half of them one chain
shifted whole by up to 2 h, so that tubes come to lie beside each other and dive under each other. Report
how many of the 505 fixtures mark at least one chain and how many pairs sit within 0.05 h of a threshold: a
comparison on fixtures that mark nothing proves nothing. 3. **The floor.** The reference's Node time on link
A's tables, 200 calls, three repeats, under the perf lock: the median and the spread. 4. **The faster
body**, returning the same Int32Array on all 505 fixtures. Measure first where the time goes (the cell lists
built on every call, the 3x3 cell scan with a square root per segment, `ms.includes`); the technique is
yours. The meaning does not change: a version that differs on one element of one fixture is not landed,
however fast. Target: a quarter of the reference's Node time or less. 5. **A unit test**,
`test/render/gf_side_runs.test.ts`: the new body against a frozen copy of the reference under
`test/render/fixtures/` (as the paint tests keep theirs) on seeded random chains, under 2 s, with at least
one pair that lies beside (marked), one that dives under (not marked) and an empty input. 6. **In the
browser**, one capture session through the perf lock: a build of master before your commit, yours, master
again, link A as it loads and with `&gfk=0`. The three pictures of each load (`gf.png`, `gf_b2.png`,
`gf_fill.png`) are byte-equal across the three builds, and the median `tms` as it loads is at least 6 ms
under master's of the same session. 7. The ordinary-load guards (How to work), `npm test`, the deploy
green. Close K1553 with the commit. **If the target is out of reach** with an identical result, land nothing
in `src/` and say in the handoff what the best identical version costs and where the rest of the time goes:
the coordinator then weighs taking stage 33 back out (Levi called j59's look before it fine).
