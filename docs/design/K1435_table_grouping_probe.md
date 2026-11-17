# K1435: grouping and over/under from the knot's graph, at table time (Claude agent stage, probes only)

## Why

K1433 (read its `### Handoff K1433` in `docs/design/K1433_union_field_trial.md` whole, Part 3 above all) found:
- Replacing step 4 of `eval.ts` with a union field is not the fix; step 4 stays.
- Spot 16, spot 6, the two smudges and about 2,030 tie- and ramp-class finds over the 12 census scenes are one
  decision, made per pixel from whichever pieces happen to be gathered: are these two pieces the same surface,
  and if not, which is on top. The graph knows both answers when the tables are built.

The bar is Levi's (`docs/design/K1407_c1_bar.md`, first section). Levi asked for this step back after weeks of
slow progress; this probe decides whether K1407 moves from patching the membership and tie rules to deciding them
in the tables.

K1407 c5 is editing `eval.ts`, `gf_glsl.ts` and `tables.ts` in another worktree, and Muse works in the main
checkout. **You change no file under `src/` or `test/`.** Everything goes under `.claude/probes/K1435/` and this
brief. Copy `eval.ts` (and `tables.ts` if you need more table data) into the probe directory and change the
copies. K1433's tools are yours: `.claude/probes/K1433/` (`k1433_lib.ts`, `k1433_spots.ts`, `k1433_scan.ts`,
`k1433_sample.ts`, `eval_u.ts` as an example of a probe evaluator).

## The probe

In the copies, keep steps 1 and 4 and change how steps 2, 3 and 5 decide:
- **Membership.** Which surface a piece belongs to comes from a table-built list of arc-length intervals per
  chain (junction arms, their cuts, the ramps' extents), not from which other pieces the pixel gathered.
- **Order.** Where two surfaces' keys tie, the order comes from the graph (crossing over/under, junction group),
  not from the per-pixel tie blend. Keep a blend only where the handoff says it must stay per pixel: sliding
  crossings' location, key interpolation along arc length, cap and reveal ramps, true-seam anti-aliasing.

The design within that is yours. If a part cannot be decided at table time, say which and why, with the spot that
shows it.

## Done

1. The four open spots (16, 6, both smudges) clean by K1433's test and by eye at 4x, next to master gf and
   rp=outline. For any that is not, what you tried and why it fell short.
2. The 25 other spots of `spots.txt` still clean, by the test and by eye.
3. K1433's scan over the 12 scenes, master against the probe: tie- and ramp-class finds per scene. They fall on
   every scene; report by how much. Look at a seeded sample of 20 remaining finds at 4x and say what they are.
4. Sheets for Levi under `.claude/probes/K1435/out/`: master gf | probe | rp=outline, for the 29 spots and 10
   of the worst tie-class sites on master. If the app's real look differs from the probe's debug colouring in a
   way that matters to judging a smudge, say so.
5. What moving this into `src/` takes: the table changes and their size, the shader's per-pixel work against
   today's (a count of loop trips or segment tests on two scenes), which pins move, and the stages you would
   brief, each with its bar.

## How to work

- Start with `git fetch origin`, `git merge --ff-only origin/master` and `Get-Date`.
- Use PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- CPU only. For a run of more than a few minutes on all cores, take `$env:TEMP\claude-perf.lock` (one line:
  owner, start, what), wait inside one blocking command if it is held, and delete it after.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files). Never push. Never edit LEDGER.md.
  Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work, with this stop rule.
- Report what you measured apart from what you infer. Look at every spot yourself before calling it clean.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1435` here, commit, and report. Lead the report with the verdict in plain words (move grouping to
the tables, or not), then the sheet paths, the numbers, the stages to brief, a `Ledger items` list and K1435's
handle fields.
