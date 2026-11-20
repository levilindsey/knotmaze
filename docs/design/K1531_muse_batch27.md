# K1531: Muse batch 27, captures and guards that can be trusted (2026-11-19)

Four runs (tags 27A-27D), started by Claude through Paseo with the K1053 chain, one after another in the main
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
- **The perf lock** (`$env:TEMP\claude-perf.lock`, one line: owner, start time, what) for every pixel-exact
  capture and every timing. If another owner holds it, wait inside one blocking command (poll each minute, up
  to 30 minutes). A lock older than 30 minutes counts as stale and others remove it: hold it for one capture
  sequence of at most 25 minutes, delete it, and take it again for the next.
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
  type an ID). Before `ledger.mjs done <ID> --commit <sha> --repo .`, run `show <ID>` and check the text is
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
