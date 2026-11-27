# K1627 stage 3: remove the specks at junction corner points (rp=gf)

Levi, 2026-11-26, shown the specks at 14x and the dropped fix that closed real crossing gaps: "remove the
specks". He named this stage.

Read first: `K1627_s1_brief.md` and `K1627_s2_brief.md` with their handoffs (on master; both landed), and the
tools under `.claude/probes/K1627/` (`cap.ps1`, `run.ps1`, `places.py`, `rows.py`, `crop.py`, `an.ps1`, the
`p_*.json` switch-offs, `p_noother.json` among them). Stage 2's outputs, read only:
`...\worktrees\k1627-s2\.claude\probes\K1627\out\` (`sheet_s2_3.png` the specks, `sheet_s2_speckskip_1..2.png`
the dropped skip). Base: `origin/master`.

## The places (his link `?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1`, frozen at stage 2's state)

Seven specks of 1 to 6 px of paper at a corner's point: (1377,746), (1199,1250), (1046,494), (1400,523),
(1644,829), (981,1357), (1547,904); the 4 px tip at (1141,1638). Master's physics changed since stage 2
(K1626 landed): the settled state and these coordinates have moved. First re-freeze his link on today's
master, find the specks there (`p_nocorner` minus the true gaps, as stage 1 counted them), and name the true
crossing gaps that reach corner pixels there (stage 2's were (2234,936), (2329,358), (2346,380)).

## Known (stage 2, confirmed by change)

A corner pixel nearer arm A has key zA - zt; where arm B rides above A by more than zt, `lkGap` lets B's
pieces cut it inside B's outline margin at the corner's point. Skipping the corner's other arm within sx of
its tangent arc removed every speck but closed part of the true gaps: they are other-arm cuts at the same
point, so a distance window cannot separate them.

## This stage

Remove every speck and the tip, with the true crossing gaps unchanged pixel for pixel. You own the technique
in `src/render/gpu_field/`; stage 2's leads: tell a real over-pass of the other arm (its piece crosses this
arm's thread) from its outline margin at the point, or take the corner's key from max(zA, zB) only at the
point. Confirm the separation by a patch on the frozen state before building.

Binding: never remove a thread's border; the under pass keeps its width and heading; stage 4's angled cut
ends stay; tight turns keep today's ball (K1572); closed sides do not rise; keep out of the reveal path.
Every changed pixel on his link and the 21 test mazes (A_3..A_d, D_1..D_a) is a speck of this kind filling:
count, list and view them. A stray anywhere, or a true gap changed, is a fail: say so. No new texture reads
per pixel outside corner pixels.

## Done

1. Speck count, master against yours, on his link and the 21 mazes; the true gaps' pixel diff (0).
2. Src, tests, `npm test` green, `npm run build` passes, pins named.
3. For Levi: one sheet `master | yours` at 14x of every speck place and the true gaps, same frozen state both
   sides, real-time captures, viewed by you; the list of every other changed place.
4. `screen.py` counts (`an.ps1`), master against yours.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1627-s3`, branch `k1627-s3`, from `origin/master`;
`node_modules` as a directory junction to the main checkout's (never `npm install`). Write only inside your
worktree. Read code through the shell; the Read tool only just before an Edit, and for images. Real-time
captures only, under the perf lock (`scripts/perf_lock.ps1`; read a lock before touching it, never delete
another owner's), ports 5660 to 5664. Commit WIP at every milestone (`git add -f` for probe tools, never
their outputs). Never push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
`--virtual-time-budget`. Helpers on sonnet, mechanical work only; looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. If the specks cannot go without touching a true gap, land nothing and show the
best trade with pictures. On stopping: commit WIP, append `## Handoff (stage 3)` here, commit, and report:
verdict first (safe to land or not), sheet paths, counts, a `Ledger items` list and the handle fields.
