# K1436: rp=gf bar test v2, a scan that sees what Levi sees (Claude agent stage, probes only)

Levi's bar for rp=gf (`docs/design/K1407_c1_bar.md`, first section): at a junction or under-tail end the over
thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver. Levi, 2026-11-17, on the
live page: "I still see plenty of border artifacts." Every gf stage is judged by a scan, so the scan has to
flag what the eye flags and nothing else. Today's does not:

- K1433's reference-free test (`.claude/probes/K1433/k1433_lib.ts`, `k1433_scan.ts`; Handoff K1433 in
  `docs/design/K1433_union_field_trial.md`, read its Part 1 whole) misses ink dips shallower than about 0.4:
  the def seam notches on d547dab6 (an ink dip of 0.10-0.22 over 31-35 px, c4's measurement) read clean
  (its validation 2b), and its `plain` class was 0 real of 9 looked at.
- Its descendants (`.claude/probes/K1449/k1449_scan.ts`, `.claude/probes/K1451/k1451_scan.ts` and
  `k1451_cls.ts`, which names a tie find's cause; Handoffs K1449 and K1451) inherit both faults.

## Do

1. A band-profile check: along each exposed edge, sample the outline band's ink at fixed offsets across its
   width and walk it by arc length; flag a dip, a step or a gap against the band's own running level (not a
   fixed 0.5-0.6 threshold), with a length and a depth floor you set from the measured two-load noise.
2. A crossing exemption that is geometric (the under thread's band is cut where the over thread covers it),
   so a clean crossing never flags and a smear across one does.
3. Fix or drop the `plain` class so that what it reports is real.
4. Keep the classes and the per-find output the later tools read (site, class, px), so `k1451_cls.ts` and
   the scan-all scripts can run on v2 unchanged or with a one-line change.

## Done

1. Validation 2b passes: the def notches flag on d547dab6 and not on master; validations 1, 2a and 3 of
   Handoff K1433 still pass.
2. Precision, by your own eyes at 4x: 40 finds sampled across classes and scenes on master (10 per class
   where a class has 10), each cropped with the flagged pixels marked, each named real or false; at least
   85% real overall and no class under 70%. Put the sheets under `.claude/probes/K1436/out/`.
3. Recall: the twelve spots of `.claude/probes/K1451/out/fix_a.png` / `fix_b.png` all flag on master; the
   kink-loop tick flags on c5fc87d1 and not on master (it is the look's: if the scan cannot see the look,
   say so and leave it); twenty clean stretches you pick (plain crossings, plain junctions) do not flag.
4. The 12-scene numbers on master, v1 beside v2, per class, at `gfh=1` and flag off, and the run time.
5. A short "how to run" at the top of the scan file, and the thresholds with the measurement behind each.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `.claude/probes/K1436/` only (copy what you need from K1433 / K1449 / K1451). Nothing under `src/`
  or `test/`: two agents are changing `src/render/gpu_field/` now, and the census bars stay as they are
  until this test is validated (replacing them is the next stage).
- Before any 12-scene scan, wait on `$env:TEMP\claude-perf.lock` inside one blocking command while another
  owner holds it (a lock older than 30 min is stale); do not take it yourself.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5600-5619 if you need a page. Headed, real-time Chrome, never `--virtual-time-budget`.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files and sheets, not for scan dumps
  you can regenerate). Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work (scans, sheets), with this stop rule.
- Own the technique: the checks named in Do are a starting point, the bar is Done 2 and 3.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1436` here, commit, and report: what holds, the sheets' paths, the numbers, a
`Ledger items` list and K1436's handle fields.
