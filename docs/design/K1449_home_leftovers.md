# K1449: home membership (gfh=1), what is left (Claude agent stage)

## Where it stands

K1438 and K1439 (merged; read both handoffs: `docs/design/K1438_home_membership.md`,
`docs/design/K1439_home_membership_glsl.md`) put junction membership from the arms' home intervals into the
tables, the CPU mirror and the shader, behind `gfh=1` (off by default; `GF_HOME=1` / `buildTables(scene,
{ home: true })` on the CPU). The junction fade follows `fadeLength` live. With it on, K1433's scan reads
435 tie+ramp finds over the 12 census scenes (1797 off) and 28 of 29 spots are clean. Levi has the link and
has not yet chosen it as the default; this stage works with the flag ON and must leave flag-off untouched.

The bar is Levi's: at a junction or under-tail end the over thread's outline runs on unbroken, with no dot,
stub, wedge, tick, notch or sliver. Where a thread dives under a junction, it fades over `fadeLength`.

## Do, in this order

1. **Flag-off pixels (K1445).** Rerun `.claude/probes/K1439/k1439_offab.ps1 -Branch 963029e8` (perf lock)
   or an equivalent: flag-off GPU pixels equal master-before-K1439's on def and muse_hash. If its page sticks
   in "loading" again, find out why. Report the number.
2. **Classify what is left with the flag on**, at the default `fadeLength`: the 435 finds
   (`.claude/probes/K1438/out/scan/`), and these named sites: muse_hash 5.88,8.50's left-edge stub and
   19.41,14.16's dash inside the curl (both visible in `.claude/probes/K1439/out/sheets/sheet_muse_hash.png`,
   in K1439's worktree `agent-ab538fa67ad6c86dd`); muse_hash 31.56,7.41, 33.64,9.23, 22.09,34.40, 34.29,18.93;
   ring 19.63,20.34; g41_ring_tw64 19.78,20.37 and 16.43,2.90; g41_def_tw64 11.21,8.29; def 9.06,6.41;
   g41_user_tw64 17.80,9.55. A table: class, count, px, one example crop each, the cause in the tables or the
   evaluator.
3. **Fix the largest classes** in `tables.ts`, `eval.ts`, `gf_keys.ts`, `gf_glsl.ts`, under the flag, CPU
   first then the mirror. Order stays per pixel (K1435 measured that crisp graph order leaves stubs).
4. **`fadeLength` 0.** K1439 found the hard step float-sensitive at a depth tent's foot, and K1438 that 0
   brings tie bands back (690 finds). Make 0 read as a crisp cut without those: say what you did.

## Done

1. Flag off: pixels equal (item 1), `gf_home_glsl.test.ts` green, no existing pin moved.
2. Flag on, default `fadeLength`: tie+ramp at most 250 finds over the 12 scenes; at 0, at most 435. Per-scene
   table, and the class table before and after.
3. The 29 spots (`.claude/probes/K1407/out/c4/spots.txt`): none worse than K1438's sheets; the named sites
   each fixed or reported with cause and attempts. Sheets under `.claude/probes/K1449/out/`
   (K1439 gfh | new gfh | rp=outline) at `fadeLength` 0, default, 1.2.
4. GPU = mirror with the flag on (K1439's `k1439_parity.ts`): def and muse_hash, at most the 3 px K1439 found.
5. Bench under the perf lock, flag on against K1439's flag on: within 5%.
6. `npm test` green.

## How to work

- Work in your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5540-5559. Screenshots from a headed, real-time Chrome, never `--virtual-time-budget`. Stop preview
  servers before a GPU census. One performance measurement at a time: `$env:TEMP\claude-perf.lock` (Muse
  batch 25 takes it too; wait inside one blocking command).
- Not yours: `gf_look.ts`, `gf_reveal.ts`, `gf_explore.ts`, and all but the flag's lines of `gf_pass.ts` /
  `gf_app.ts` (Muse batch 25 works there in the main checkout).
- Commit WIP at every milestone, broken or not (`git add -f` for probe files). Never push. Never edit
  LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work, with this stop rule.
- Look at every spot yourself at 4x. A junction's shape is Levi's to judge: show it, don't pick it by a metric.
  Own the technique: for anything open at the stop line, report what you tried and why it fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1449` here, commit, and report: what holds, sheet paths, numbers, a `Ledger items` list
and K1449's handle fields.
