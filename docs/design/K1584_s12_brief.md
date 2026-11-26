# K1584 stage 12: the short border inside A_3's small hook keeps its lower half

Base: `origin/master`. Worktree `...\worktrees\k1584-s12`, branch `k1584-s12`. Your files: the gap step
(`src/render/gpu_field/gf_look.ts`, `gf_app.ts`, `gf_pack.ts`, the gap tables). Keep out of `eval.ts` and
`gf_glsl.ts`: another agent is changing the junction rule there now.

## Levi (2026-11-25, on review picture place 3: "agreed. Fix them")

A_3, corner k148 (ledger K1608; picture `.claude/probes/K1584/review12/out/review12_1.png` row 3 in
worktree `k1584-s11`, place list `review12/places12.json`). Today a short dark border runs diagonally from
the bottom line up into the small hook. Now its lower part is gone, leaving a dark triangle hanging from
the top of the hook with a gray smudge under it. Wanted: the border drawn whole, as today, unless a real
crossing's gap belongs there (then a clean gap with angled ends, no triangle, no smudge). Stage 8's
handoff (`docs/design/K1584_s8_brief.md`) calls this place "a partial flag miss".
## Bindings

Every other pixel on all 21 test mazes equals a capture of master's build, or you list and view the place
and report it. Never remove a thread's border; never trade a hook for a point; the under pass keeps its
width and heading; every under-thread border at a real crossing keeps its gap; stage 4's angled cut ends
stay; tight balls keep the stage 11 wedge. You own the technique. If the fix cannot hold these, stop and
report with pictures: no second rule on top.

## Done

1. Src, CPU mirror and tests; `npm test` green; every re-frozen pin named; `npm run build` passes.
2. Captures of all 21 mazes from master's build and yours (the stage 11 recipe: `.claude/probes/K1584/s11/`
   tools `run11`, `warm7.ps1`, the perf lock through `scripts/perf_lock.ps1`, never by hand; if another
   owner holds the lock, wait inside one blocking command).
3. One large sheet (14x) per named place: `today | master | yours`, the spot circled, viewed by you, plus
   every other changed place on all 21 mazes listed and viewed.
4. Counts in one `screen.py` run, master against yours: closed sides, loose pieces.

## How to work

- `Get-Date` first. PowerShell. Read code through the shell; the Read tool only just before an Edit, and
  for images. Write only inside your worktree; `node_modules` is a directory junction to the main
  checkout's (never `npm install`, never remove the junction's target).
- Commit WIP at every milestone, broken or not (`git add -f` for probe tools, never their outputs). Never
  push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
  `--virtual-time-budget`.
- Helpers on sonnet, mechanical work only, with this stop rule. Looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock (`Get-Date` at each milestone), whichever comes
first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append a
`## Handoff` here, commit, and report: verdict first (safe to land or not), what holds and what does not
with numbers, sheet paths, counts, a `Ledger items` list and the handle fields (owner, branch, last
commit, evidence, next).
