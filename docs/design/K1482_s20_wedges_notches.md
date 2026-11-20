# K1482 stage 20: round the 14 wedges and notches (Claude agent stage)

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** Read `### Handoff K1482 s19`
in `docs/design/K1482_s19_last_gaps.md` whole, then stage 4's notch finding in `.claude/probes/K1482/s4/notes.md`
(a crossing pin cuts a T's through arm to Lcut ~0, the corner solve rejects the pair, home still joins the arm;
longer corner arms, KEXT 1.5, rounded j14 j47 t58e and the sharp-V sites in the mirror). Master's link A
(`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`, hash fff8c9e5) has 22 faulted sites.

The goal is Levi's approved look: at these 14 sites the two outlines meet in one clean rounded or mitred corner,
with no solid dark patch and no square or stepped cut. You own the technique.

## The sites

- **Wedge (6):** j15 j50 t23e t59s t81s t84e. Two outlines run together into a solid dark patch.
- **Notch (8):** j4 j14 j41 j47 j59 t4s t45s t58e. An outline ends in a square or stepped cut where a corner
  should be.
- Pictures of all 14 as they are (2.7x context with the detail box, and 8x): `.claude/probes/K1490/out/
  k1490_wedge.png`, `k1490_notch.png` (made by `wide.py` there from a `cap.mjs` capture; make the same sheets
  from your tip for the before/after).

**Not yours:** the 5 slivers (j71 j95 j147 t43s t56s) are accepted: do not chase them, but none may get worse.
j29 and j49 (K1522 waits on Levi), j64 (Muse, K1517). Do not change how flagged sides follow the Crossing fade
(K1521: Levi keeps it).

## Do

1. Take the largest shared cause first (stage 4's: the rejected corner pair at a cut through arm) and fix it
   where it is made; then the sites it leaves, each to its terms before a fix.
2. Land each fix that passes Done as its own commit on master (fetch and rebase first); a fix that fails Done
   is kept as a patch in your probe directory, never left in `src/`.

## Done

- The sweep's faulted count on your tip by class (start: 22; wedge 6, notch 8, sliver 5, gap 2, pin 1), by your
  own eyes at 4x or more, every moved site named, none worse, `count13.py --specks` against your start 0 new.
- Before/after sheets of all 14 sites in the `wide.py` layout (context plus detail), and of any other site a fix
  moves.
- Fill look 0 px against your starting commit ON BUILT PREVIEWS; `hold.mjs` 60/60 on link A; both dragchecks
  pass (`.claude/probes/K1482/s15/panelopen.mjs` first); `npm test` green.
- The K1436 bar once, `STRICT=1 -NoPerfLock`, on `ring,def,muse_hash,g41_user_tw64`, `-Base` your starting
  commit, `-Tag k1482s20`: no new find, none grown.

## How to work

As stage 19's: profiles under `$env:TEMP\k1482s20-*`; ports 6010-6029; your probe directories are
`.claude/probes/K1482/s20` and `.claude/probes/K1482/out/s20`. At most three preview builds alive at once, kept
outside the bar's root. Before your first build or Chrome, wait in ONE blocking loop (60 min at most) while
`$env:TEMP\claude-perf.lock` exists; the wait does not count against your 2 h. Muse may work in the main
checkout (`tables.ts`, `eval.ts`, `gf_glsl.ts`, the bar script): change no file there, keep diffs to the lines
needed, run the bar from your worktree's copy, fetch and rebase before each landing commit and the handoff.
Read code through the shell; the Read tool only just before an Edit. Helpers, if any, run on sonnet for
mechanical work under this same stop rule.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from the end of the lock wait (`Get-Date`
at each milestone), whichever comes first; keep the last 30 minutes for the checks. Do not stop early while a
site is untried and time remains. A compaction is not a stop: re-read this brief and `git log`. On stopping:
commit WIP, append `### Handoff K1482 s20` here, commit, and report: the class table, the sheets' absolute
paths (each site named), the numbers, which commits are confirmed on screen, a `Ledger items` list and K1482's
handle fields. Never edit `LEDGER.md`.
