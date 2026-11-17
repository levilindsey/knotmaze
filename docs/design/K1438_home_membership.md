# K1438: junction membership from the arms' home intervals, with a fade that follows fadeLength (Claude agent stage, tables + CPU)

## Why

K1435's probe (read `### Handoff K1435` in `docs/design/K1435_table_grouping_probe.md` whole; its probe is
`.claude/probes/K1435/k1435_mkprobe.mjs`, mode `tgr`) showed that a piece inside a junction arm's home interval
(arm root to the crossing that cuts it) should belong to that junction's group, fading out with depth. Over the
12 census scenes, tie- and ramp-class smudge finds fell from 2,030 to 547, the ghost threads went, and the 25
clean spots stayed identical. Order stays per pixel (the crisp graph-order modes left stubs).

This stage moves `tgr` into `src/` on the CPU side: `tables.ts` and `eval.ts`. The GLSL mirror is the next stage
(K1439), so this stage leaves `gf_glsl.ts` and the GPU parity tests behind a switch: the new membership is off by
default in the build that ships (a table flag or constant that `eval.ts` reads), and master's pixels do not
change until K1439 turns it on in both. Say in the handoff exactly how the switch works.

K1407 c5 (e3297511, merged) changed member()'s second loop: it skips an arm rooted with the first loop's arm.
Start from master with that in.

## Levi's requirement (2026-11-16)

"Isn't this controlled by the crossing fade parameter? I want to continue being able to adjust it on the fly."

The probe's ramp is a constant (membership 1 to 0 as |depth| goes 0 to 3 zt). In `src/` the fade where a thread
dives under a junction follows the crossing fade parameter, `fadeLength` ([0, 1.2], `url_state.ts`), live, as
the cut at an ordinary crossing already does in the look (`gf_look.ts` `lookFade`, `uLkF`; read how K1398 did
it). `fadeLength` 0 gives a crisp cut. Changing `fadeLength` must not rebuild the tables: it reaches the
evaluator as a uniform-like input.

How the depth ramp maps to a length along the thread is yours to design. Show it: one sheet of the four open
spots and five of the worst sites at `fadeLength` 0, the default, and 1.2. The probe's crisp modes left stubs
and slivers at some sites; report what `fadeLength` 0 looks like there, with pictures. Do not hide it.

## Done

1. **Spots.** With the switch on: at least 27 of the 29 spots of `.claude/probes/K1407/out/c4/spots.txt` clean
   by K1433's test and by eye at 4x next to rp=outline; the 25 identical to master. Sheets under
   `.claude/probes/K1438/out/` (master | new | rp=outline).
2. **Scan.** K1433's scan over the 12 scenes at the default `fadeLength`, switch on: tie+ramp at most 547 finds
   / 19,287 px. Per-scene table.
3. **fadeLength.** The sheet above, and a test in `test/render/` that the membership fade's extent scales with
   `fadeLength` and is a hard step at 0.
4. **The worse site.** `g41_user_tw64:17.80:9.55` (a soft dark band `tgr` adds): fixed, or reported with its
   cause and what you tried.
5. **Tables.** Size unchanged (the arm record's free floats). With the switch off: the digest and every pin as
   on master, and `eval.ts`'s pixels equal to master's on two scenes. With it on: the new digest reported.
6. **Tests.** `npm test` green.
7. **For K1439.** What the GLSL mirror needs: the lines of `gf_glsl.ts` that change, the review of the
   "no ramps" depth class and the two-ramping-piece limit (`MAXR`), and the per-pixel work added (loop trips on
   muse_hash and def).

## How to work

- Work in your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Use PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Files: yours are `tables.ts`, `eval.ts`, `gf_pack.ts` if the record needs it, tests for them, and
  `.claude/probes/K1438/`. Not yours: `gf_glsl.ts`, `gf_look.ts`, `gf_pass.ts`, `gf_app.ts`, `gf_reveal.ts`,
  `gf_explore.ts` (Muse batch 24 works there, in the main checkout).
- CPU only. For a run of more than a few minutes on all cores, take `$env:TEMP\claude-perf.lock` (one line:
  owner, start, what), wait inside one blocking command if it is held, and delete it after.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files). Never push. Never edit LEDGER.md.
  Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work, with this stop rule.
- Own the technique: for anything not closed at the stop line, report what you tried and why it fell short.
- Look at every spot yourself before calling it clean.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1438` here, commit, and report: what holds, the sheet paths, the numbers, a `Ledger items` list
and K1438's handle fields.
