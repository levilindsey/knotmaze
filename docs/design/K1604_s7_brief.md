# K1604 stage 7: investigation. The gap as a band of the over thread (rp=gf); no fix lands from this stage

Three fix stages (s3, s5, s6; handoffs in `K1604_s5_brief.md` on branch `k1604-s5` and `K1604_s6_brief.md` on
branch `k1604-s6`) patched the gap table's windows for Levi's marked rows and none landed: the same window
change gives both the good cuts and new gaps elsewhere, and no tested measure separates them. Levi, 2026-11-26:
"Do the investigation". This stage measures and prototypes. Nothing lands in `src/` on master from it.

## The rule, as properties (from Levi: "the gap should cut through the border parallel to the overthread of the
crossing", no partial cuts that leave dangling parts)

1. The gap belongs to the over thread: a band along it, its drawn outline plus the plain crossing's gap width
   on each side.
2. Everything of the under thread inside the band is gone, whichever piece draws it (plain border, a junction
   arm's border, a corner arc).
3. Nothing outside any band is cut: a border never breaks where no over thread passes above it.
4. The cut edge runs parallel to the over thread's edge: no stub, wedge, sliver or loose piece.

Working hypothesis (coordinator's, untested): the gap table stores the gap in the UNDER thread's frame (a
stretch of its samples per side, one window per drawn piece, with caps and ownership rules), and a stretch
along the under is not a band along the over; that mismatch is what the three stages kept patching. Test it;
say plainly if it is wrong.

## This stage

1. **A checker** (probe tool, CPU, from a frozen state's geometry plus the captured border-look image): for
   every crossing within 2.5 world of a junction on the 21 mazes (A_3..A_d, D_1..D_a) and Levi's link
   `?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1`, score
   (a) under-thread border px left inside the over's band (rule 2),
   (b) under-thread border px missing outside every band within the crossing's neighbourhood (rule 3),
   (c) loose border pieces and necks at the cut (rule 4).
   Validate it by eye on a dozen places before trusting it (plain crossings far from junctions should score
   clean). Run it on master: how many crossings fail, by kind, and how the failures group.
2. **Sort Levi's nine rows** (2 A_6 x326 j2; 5 A_3 x37 j51; 6 A_3 x195 j101; 7 A_3 x292 j123; 9 A_3 x73 j103;
   11 A_3 x166 j54; 12 A_3 x316 j83; 13 A_4 x301 j88; 17 A_4 x22 j106) into kinds, observed: which are rule-2
   failures (uncut border inside the band), and which are something else (for example two borders converging
   into a wedge beside a junction, or a crossing the table treats as closed). Rows 5, 6, 7, 11 did not move
   under any gap change: say what they are, with a switch-off or patch as evidence.
3. **A prototype of the rule in the over's frame**, behind a debug switch on a branch: a pixel of anything
   beneath an over thread is cut when it lies inside that over's band. Use what the shader already knows per
   pixel (the nearest pieces and their depth keys in `lkGap`; `gf_look.ts`) where you can; say what extra data
   or reads it needs near junctions and what it costs (frame time on Levi's link and one large maze, under the
   perf lock, against master). It may replace the windows near junctions, or everywhere, whichever the
   evidence supports: say which.
4. Score master, s6's V5 (tag `s6v5`) and the prototype with the checker.

Binding for the prototype's look, as before: never remove a thread's border outside a gap; the under pass keeps
its width and heading; tight turns keep today's ball (K1572); K1627's specks stay gone; keep out of the reveal
path; do not use today's (non-gf) border strokes as the bar. The earlier "0 px beyond 2.5 world" and "nothing
else changes" lines do NOT bind this stage: the checker's scores do.

## Done

1. The checker, validated, with master's totals by kind.
2. The nine rows sorted by kind, observed.
3. The prototype behind a switch (branch only), its checker scores and frame cost, or the measured reason it
   cannot be built.
4. For Levi, pages `master | prototype` (and V5 where it differs), medium and close zoom, border look, no
   overlays, same frozen state, real time, under 7000 px tall, viewed by you: his nine rows; the 12 worst
   checker scores on master; 12 places drawn at random (fixed seed) from junction-adjacent crossings; the 12
   places where the prototype scores worse than master, if any.
5. A recommendation: build the over-frame rule properly (and what that stage is), or not, and what rows 5, 6,
   7, 11 need.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1604-s7`, branch `k1604-s7`, from `origin/master`;
bring probe tools with `git checkout k1604-s6 -- .claude/probes/K1604` (never merge that branch);
`node_modules` as a directory junction to the main checkout's (never `npm install`). Write only inside your
worktree. Read code through the shell; the Read tool only just before an Edit, and for images. Real-time
captures only, under the perf lock (`scripts/perf_lock.ps1`; read a lock before touching it, never delete
another owner's), ports 5675 to 5679; refuse a busy port and check the listener is your build; kill your
servers and probe processes before you stop. Commit WIP at every milestone (`git add -f` for probe tools, never
their outputs). Never push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
`--virtual-time-budget`. Helpers on sonnet, mechanical work only; looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. If time runs short, the order of value is Done 1, 2, then 3. On stopping: commit WIP,
append `## Handoff (stage 7)` here, commit, and report: findings first, page paths, scores, a `Ledger items`
list and the handle fields.
