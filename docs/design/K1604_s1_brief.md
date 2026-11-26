# K1604 stage 1: two junction leftovers (a stray pixel at A_3, a blunt touching end at A_6)

Base: `origin/master`. Worktree `...\worktrees\k1604-s1`, branch `k1604-s1`. Your files: the junction
rule (`src/render/gpu_field/eval.ts`, `gf_glsl.ts`). Keep out of `gf_look.ts`, `gf_app.ts`, `gf_pack.ts`:
another agent is changing the gap step there now. The rule's history: K1588 (`140abd573`), its briefs
under `docs/design/K1588*`, probes in worktree `k1588-land` `.claude/probes/K1588/`.

## Levi (2026-11-25, on review picture places 5 and 7: "agreed. Fix them")

Pictures: `.claude/probes/K1584/review12/out/review12_2.png` rows 5 and 7 in worktree `k1584-s11`, place
list `review12/places12.json`.

- Place 5, A_3 x278: the ragged blob is gone and the upper border stops in a rounded end above the lower
  line, but one stray dark pixel is left in the light between them. Wanted: no stray pixel.
- Place 7, A_6 x326: the diagonal border now ends with a blunt flat top whose corner still touches the
  upright line, above a thin light slit. Wanted: a clean end, either separated from the upright line all
  the way or joined to it, never touching by one corner; an angled end like the other cut ends, not a
  blunt one.
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
