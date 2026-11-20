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

### Handoff K1482 s20

Claude agent a0f22901, stopped 2026-11-19 about 10:45 PDT, before the 11:40 cap: every site has been tried, and
the one candidate (fix3) changes the look at about 27 places Levi did not name, so it waits on his call rather
than on more checks. **Nothing landed: master's `src/` is untouched.** The work is three WIP commits on branch
`worktree-agent-a0f22901bb5fca4a4` (rebased on 67fb28720): 142179c03 (tables/eval/pack), 0e0dbc36f (fix1: GLSL)
and 37eda49e8 (fix3). Their `src/` is identical to a70a5b489 and 4dc083c35, the builds the captures were taken on.
Running notes: `.claude/probes/K1482/s20/notes.md`. All captures were taken under load (Muse 26X held the perf
lock from 09:56), not same-state pinned.

**The fix (fix3, 37eda49e8).** `solveGfCorners` (`tables.ts`): when pass 0 gives no corner or r <= 0 at a
non-through pair, pass 1 retries with the cut arms extended to `Lcut + GF_KEXT*h` (1.5). The retry corner is
ink-only (`ext` 1: it never raises D, coverage or labels; GLSL `homeForm` reads texel 5 .z) and pass 0's corner
becomes `ext` 2, left out of the home-on cell lists. fix3 drops a retry corner whose arc sits more than
`GF_KSAG*h` (0.5) inside the sharp corner. fix1 (no sag cap) detached outlines at t32e and t75e (11 and 9 bare
px) and moved j147; fix3 detaches nothing (bare 0 at all 165 retry corners) and leaves j147 alone.

**Class table** (link A, hash fff8c9e5, judged by eye at 4x+). Master: 22 = wedge 6, notch 8, sliver 5, gap 2,
pin 1. Under fix3 (GPU, `.claude/probes/K1482/out/s20/ba_fix3_14.png`, start | fix1 | fix3):
- improved, read as one rounded corner: wedges j15 t81s; notches j4 j14 j47 t4s t58e (7);
- partial, the lump smaller: t23e (wedge), j59 (notch);
- unchanged: wedges j50 t59s t84e; notches j41 t45s.
That is wedge 6 -> 4, notch 8 -> 3 if fix3 landed (partial counted as still faulted): 22 -> 15. Slivers, gaps
and the pin unchanged; none of the protected sites worse (mirror ink: j71 35 px, j95 25, t43s 17, t56s 25, j64
19, j29 6, each AA along the outline with no shape change by eye; j147 and j49 0:
`out/s20/ab_fix3_protected.png`).

**Why the five unchanged and two partial sites resist** (`why20c.ts` with `why20_debug.patch`; two causes, not
one): (a) pass 0 gives a corner with a tiny positive r, so no retry runs: t59s (r 0.03h, 0.09h), j41 (0.26h);
the tiny corner draws the notch or wedge. (b) the retry runs, but the extension starts from a negative Lcut, so
`Lcut + 1.5h` is still short and the feet clamp at its end: t84e (j140), t45s (j99, nullz, slack -0.41), j59
and t23e (j58/j59, chain 43's Lcut -0.222 and -0.047). j50 is not explained yet. Knob tries, all rejected and
kept as patches: retry also when r < 0.3h (`krmin_knob.patch`: t59s moves 15 px with no visible fix, j41
unchanged, t43s's coverage moves); grow the extension until a corner passes (`ksteps_krmin_knobs.patch`:
t23e/j59 unchanged since their larger corners fail the sag cap; j15 j50 t81s t45s get dark blobs and protected
j71 gains one); extend from max(0, Lcut) with KEXT 2.5 (`why20_knobs.patch`: moves even more clean places).

**What fix3 moves elsewhere** (the reason it is not landed): no criterion found separates the 14 from the clean
places the retry reaches (pass-0 reason, over-cut distance, angle, r and min Lcut all overlap; a kept null
corner vs none does not split them either). GPU border diff minus the start/start2 control: 29 blobs (27 away
from the 14), fix1 32. By eye (`out/s20/ba_fix3_else.png`), sharp loop tips and V corners turn round: t39e
(triangle loop and "<" corner), t65e (zigzag), t69s (triangle loop), t17e (square end), t29e, t80e (square
loop), t5e, t5s, t55e. None is a dark patch or a cut, but each is a look change at a place Levi did not name.
The card for him: `out/s20/ask_fix3.png` (top: j14 t58e t81s j47 start | fix3; bottom: t65e t39e t80e t55e,
the unnamed corners it also rounds).

**Done items.** Run on fix3: count13 `--specks` 0 new (fix1 0, control 0); `npm test` green (3190 passed);
mirror coverage bit-identical to start at the 22 sites and the 165 retry places (the fill cannot move by
construction: ext corners never touch D, scov or labels). Not run: the fill A/B on the GPU (cap20 does not pin
the background clock, so start vs start2 already differ by 72965 px; pin it before trusting a 0 px read),
`hold.mjs`, `panelopen.mjs` and both dragchecks, the K1436 bar. None is worth running before Levi's answer.

**Next.** Ask Levi on `ask_fix3.png`: does the rounding of sharp corners he did not name read as fine?
- If yes: take 37eda49e8 (patch `.claude/probes/K1482/s20/fix3_ksag.patch`) through the timing checks and the
  K1436 bar, squash the three WIP commits into one, land it; then a stage for the five unchanged sites, which
  need (a) a retry that also replaces a tiny pass-0 corner without moving t43s's coverage and (b) a per-pair
  extension measured from the arm's true end, not from a negative Lcut; j50 still needs its cause.
- If no: the retry must be gated to the faulted places, and no table-level feature separates them; the next
  stage needs per-pixel attribution (`att20.ts`/`att20.py`) of what draws each faulted site's dark patch or cut
  against what draws a clean mitre, before any fix.

Probes: `.claude/probes/K1482/s20/` (mir20.ts mirror, att20 attribution, why20*.ts pass records, kmode20/kpos20
corner lists, cap20.ps1/run20.ps1 captures, ba20/ab20/blob20/bare20/inkcov20 sheets and diffs, locked20.ps1 the
lock wrapper; patches fix1_kext15, fix3_ksag, krmin_knob, ksteps_krmin_knobs, why20_knobs, why20_debug).
Outputs: `.claude/probes/K1482/out/s20/` (raw/{start,start2,fix1,fix3} captures, mir/ mirror json, the sheets).
