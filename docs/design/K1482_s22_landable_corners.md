# K1482 stage 22: a wedge and notch fix that can land (Claude agent stage)

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** Two stages have built and
measured, and nothing has landed. Read `### Handoff K1482 s21` in `docs/design/K1482_s21_corners_rest.md` whole
(the class table, the knobs already rejected, the bar's finds), then `The sites` and `How to work` in
`docs/design/K1482_s20_wedges_notches.md`: both hold here with `s22` for `s20`. Link A is
`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5).

The goal is Levi's approved look: at each of the 14 sites the two outlines meet in one clean rounded or mitred
corner, with no solid dark patch, no square or stepped cut, no tick; everywhere else the picture stays as
master draws it. This stage's job is to **land the first part of that**: a change that makes at least one
named site finished or better, harms nothing, and passes every check below. You own the technique.

## Where it stands

- Master's `src/` is the start build (a83721537; equal to ccd63bcde's). 14 named sites are open on it: wedge
  j15 j50 t23e t59s t81s t84e, notch j4 j14 j41 j47 j59 t4s t45s t58e.
- **fix3** (the second corner try with longer arms, ink only; `git diff a83721537 a9985b1d3 -- src test`)
  finishes j14 and betters t23e, j59, t58e and t81s on link A. It cannot land as built:
  - It **fails the K1436 bar** in other mazes with 10 new finds
    (`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-afdf2b8bb494bb380\.claude\probes\K1436\out\bar\k1482s21\`:
    `bar.txt`, `sheet.png`, `sheet.txt`). The coordinator's own look at them: on g41_user_tw64 the retry arc
    sweeps across a sharp fill corner, so the fill's tip has no outline (29 px), and at another corner it leaves
    a square-ended stub; on def five V mitres become arcs with a small peak, tick or stub left at the old apex.
    The fill is the same in every tile. Stage 20's "bare 0 at all 165 retry corners" held on link A only.
  - It **rounds about 27 corners Levi did not name** on link A. Whether rounding there is welcome is his call
    (K1524) and he has not answered. Until he does, a clean sharp corner on master stays a clean sharp corner.
- Stage 21 traced the 13 leftovers to three kinds (its handoff's `Next`): a ball that a crossing thread runs
  through or arms too short for one (j50, j4, j47, t84e, j59, t45s); a crossing cut whose square end pokes out
  under another outline (t81s's tick, probably t4s's step; stage 13's lkGap class); two outlines that converge
  with no corner at all (t59s, j15's Z, t58e's second V, t23e's patch). j41 fits none of them yet.
- Stage 21's patches, tools and captures are untracked in its worktree,
  `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-afdf2b8bb494bb380\.claude\probes\K1482\s21` and
  `...\out\s21`; stage 20's in `...\agent-a0f22901bb5fca4a4\.claude\probes\K1482\s20`. Copy what you use into
  your own `.claude/probes/K1482/s22`; change nothing there. No preview of theirs still runs.

## Do

1. Start from master. Take from fix3 what serves the goal; you are not bound to it.
2. Whatever you draw, **the outline stays on the fill**: an outline that leaves the fill's edge bare, or stands
   off it as a stub, is a new fault, in every maze and not only on link A. Decide how (hold the corner ball
   inside the fill's corner, apply it only where the raw meeting is a fault, or another way).
3. Run the K1436 bar as a working tool, not as a last step: the first time when your first candidate builds,
   then on every candidate you mean to keep. A candidate with a new or grown find is not kept in `src/`.
4. Order the work by what can land soonest: first a change that keeps fix3's gain at j14 (and at t23e, j59,
   t58e, t81s if it carries them) and moves nothing else; then the kinds above, most sites first. Commit each
   part that passes on its own, so the coordinator can land a part without the rest.
5. `gf_look.ts` and `gf_pass.ts` are in another agent's hands until about 13:00 (K1525, the fill look). Leave
   them alone until the coordinator messages you; if a fix needs them before that, build it last, after
   `git merge origin/master`.
6. Judge every site against the goal in a context crop and a detail crop, not against fix3. Commit WIP on your
   branch at every milestone. A fix that fails Done is kept as a patch in your probe directory, not in `src/`.
   The coordinator will message you if Levi answers K1524 while you run.

## Done

- **The bar** (`.claude/probes/K1436/k1436_bar.ps1`, `STRICT=1 -NoPerfLock`, scenes
  `ring,def,muse_hash,g41_user_tw64`, `-Base a83721537`, `-Tag k1482s22`; stage 21's base captures are reusable
  if the tool allows): no new find, none grown, on your tip.
- **Nothing unnamed moves** on link A: the mirror's moved-site list against the start build holds only named
  sites, or every other moved place is listed with a context crop and a detail crop and is clean by your own
  eye (fewer is better; none is the target). The 5 slivers, j29, j49 and j64 not worse (mirror numbers as
  stage 20's), `count13.py --specks` against the start build 0 new.
- The class table on your tip, by your own eyes at 4x or more and in context: each of the 14 finished, better
  with its leftover named, or unchanged; for each unchanged site, what you tried and why it failed.
- Sheets in the layout of `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1524\card.py` (the surrounding
  threads with a red box, then the box closer), columns today | your tip: all 14 sites, every other place your
  tip moves, and the bar's 10 fix3 finds on your tip (base | fix3 | your tip).
- Captures pin the background clock and compare only within loads that agree (stage 21's handoff, `The 76,609
  px fill difference`). Fill look 0 px against the start build, or each moved place named with a crop and
  judged against today's renderer.
- On your tip, in the last 30 minutes: `hold.mjs` 60/60 on link A; `.claude/probes/K1482/s15/panelopen.mjs`,
  then both dragchecks pass; `npm test` green; the bar once more. A check you could not run is named as not
  run, with why.

## How to work

As stage 20's `How to work`, with these changes: ports 6050-6069, profiles `$env:TEMP\k1482s22-*`, probe
directories `.claude/probes/K1482/s22` and `.claude/probes/K1482/out/s22` (untracked: do not `git add` raw
captures or dumps). At most three preview builds alive at once; stop yours and remove their directories when
you finish (the disk is short: K1467, CC156). Timing checks need `$env:TEMP\claude-perf.lock` (Muse holds it
often: wait in ONE blocking loop, 60 min at most); look captures and the bar with `-NoPerfLock` do not.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; keep the last 30 minutes for the checks. Do not stop early
while a kind is untried and time remains, and do not stop at a cause: a traced cause is where the fix starts.
A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1482 s22` here, commit, and report: which commits pass every check and can land (by SHA, in
order), the class table, the sheets' absolute paths (each site named), the numbers, a `Ledger items` list and
K1482's handle fields. Never push, never edit `LEDGER.md`.

### Handoff K1482 s22

(agent adabb55b, 2026-11-19 12:24 to 13:50 PST; branch `worktree-agent-adabb55bc67661562`, never pushed.)

**Result: nothing can land while K1524 is open.** The tip (a294f3271, "C1") is fix3 with its retry corners gated by
r >= 0.1 h (GF_KRMIN) and sag r (1 / sin(theta / 2) - 1) <= 0.35 h (GF_KSAG). C1 passes every check, the K1436 bar
included, and finishes j14. But it rounds 98 unnamed clean sharp corners on link A (70 of them by 30 px or more), so
it breaks "a clean sharp corner on master stays a clean sharp corner". It is the candidate if Levi answers K1524
"rounding welcome": land 87fc67c16..a294f3271 as one change (src: tables.ts, gf_pass.ts, gf_app.ts, gf_pack.ts,
gf_glsl.ts, eval.ts; 87fc67c16's probe filter is gone again in 1881d319c). Kind 2 (t81s's tick, K1527) was traced
away from the crossing cut. Every probe failed Done and is kept as a patch in `.claude/probes/K1482/s22/`, with
`notes.md` (every number, by time).

**Class table** (C1 tip; judged by my eyes on 76 px crops at 4x, `sheet_named_a.png` and `sheet_named_b.png`, columns
today | fix3 | tip; the tip equals fix3 except where noted):

| site | class | on the tip | leftover |
|---|---|---|---|
| j14 | notch | finished | - |
| t81s | wedge | better: the bottom corner rounded | top tick remains: not the crossing cut (see Kind 2 below) |
| t58e | notch | partial: the bottom is smoother | the second V remains; the loop's left corner that fix3 rounded stays today's (21 px vs fix3) |
| t4s | notch | top loop corner rounded | the named bottom step remains |
| j50 | wedge | the wedge opens into a narrow loop | the crossing pass still runs through the ball (s21) |
| t23e | wedge | unchanged | gated out (fix3 was slightly better; 8 px vs fix3) |
| j59 | notch | unchanged | gated out (r 0.02 h; fix3 was slightly better; 8 px vs fix3) |
| j15 | wedge | unchanged where named (Z) | side-side convergence, no corner (s21) |
| j4 | notch | unchanged to the eye | retry balls too small to show (s21) |
| j47 | notch | unchanged (dark stub) | retry r 0.001 h (s21) |
| j41 | notch | unchanged | no retry (s21) |
| t45s | notch | unchanged | pass 1 null (s21) |
| t59s | wedge | unchanged | twist foot, no corner (s21) |
| t84e | wedge | unchanged | pass 1 null (s21) |

**Kind 2 (t81s's tick).** At 6x the tick is the lower thread's outline ending in a square edge where it meets the
upper thread's outline at about 35 degrees. Five probes changed the crossing cut (`lkCut`) and left the tick exactly
as it was:
- k2: the window end dissolves the margin part at sin under 0.5.
- k2b: the same at every angle.
- k2d: the outline cut's margin shrinks over the window's last margin / sin of arc.
- k2g: k2d applied to the coverage too.
- k2f: the outline paints its slot instead of its cut.

Only k2e (drop the s8 slot rule) touched it, and it opened a new gap. The 6x fill crop shows a corner in the fill's
edge at the tick, rising and then turning under the upper thread's sliver. The ink outline follows the rising part
and ends square at that corner. So this is an outline that does not follow its fill's corner (the corner solver's
or the field coverage's domain), not s13's lkGap class as s21 filed it.

**Numbers** (link A, screen, tip vs start build):
- **Border:** 7,841 px over 8 levels.
- **Fill:** 29 px at 1 level, spread over the frame. Two fill-neutral probe builds (k2d, k2f) give 0 px, so these 29
  are C1's own. 1/255; cause untested.
- **`count13.py --specks`:** 1 new, the known (1692,336) load speck (s21), so 0 real.
- **Protected sites** (76 px box): j95 0, j147 0, t43s 0, t56s 1, j64 1, j71 26, j29 27, j49 25. The three moves are
  C1 roundings, none worse by eye.
- **Probe builds** (border px over 8 levels / fill px, vs start):

  | probe | border | fill |
  |---|---|---|
  | k2 | 46 | 15 |
  | k2b | 78 | 468 |
  | k2d | 76 | 0 |
  | k2e | 11,684 | 69,410 |
  | k2g | 3,716 | 76,839 |

  The first three are run noise at border level.

**Checks on the tip** (src a294f3271; none was repeated in the last 30 minutes because the src did not change after
they ran):
- `npm test`: green, 3190 passed, 18 skipped (256 files), run before 13:00.
- **K1436 bar** (STRICT=1, -NoPerfLock, ring, def, muse_hash, g41_user_tw64, -Base a83721537, -Ref a294f3271,
  -Tag k1482s22), 13:00 to 13:12: **PASS, new 0, grown 0, gone 0**, taken under load.
  - Output: `.claude/probes/K1436/out/bar/k1482s22/`.
  - At s21's 10 fix3 finds the tip equals the base by eye (`sheet_bar_fix3_finds.png`).
- **Perf-locked checks**, 13:15 to 13:23 (Muse 26Y's lock was stale at 30 min):
  - `hold.mjs`: 60/60 PASS.
  - `panelopen`: 1.
  - `dragcheck_b`: PASS (0 / 0 / 0 px).
  - `dragcheck`: PASS (99 / 83 / 0 px).
  - A probe's vite build ran during panelopen and dragcheck_b.
  - Log: `out/s22/checks_c1.log`.
- **Not run:** `fade.mjs`. It is not in Done, and its K1460 dot test fails on master's own build.

**Sheets** (absolute; none committed, since the probe directories stay untracked):
- `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adabb55bc67661562\.claude\probes\K1482\out\s22\sheet_named_a.png`: j14, t23e, j59, t58e, t81s, t4s, j15 (today | fix3 | tip).
- `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adabb55bc67661562\.claude\probes\K1482\out\s22\sheet_named_b.png`: j50, j4, j47, j41, t45s, t59s, t84e (today | fix3 | tip).
- `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adabb55bc67661562\.claude\probes\K1482\out\s22\sheet_unnamed_1.png` to `sheet_unnamed_5.png`: the 98 moved unnamed retry corners, ranked
  (`unnamed_c1_ranked.txt`), today | tip.
- `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adabb55bc67661562\.claude\probes\K1482\out\s22\sheet_protected.png`: j71, j95, j147, t43s, t56s, j29, j49, j64 (today | tip).
- `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adabb55bc67661562\.claude\probes\K1482\out\s22\sheet_bar_fix3_finds.png`: s21's 10 bar finds, base | fix3 | tip (border, then fill).
- `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adabb55bc67661562\.claude\probes\K1482\out\s22\v_t81s_site.png`, `v_t81s_k2.png`, `v_t81s_k2e.png`, `v_t81s_k2f.png`, `v_t81s_k2g.png`: kind 2.

**Next.**
1. K1524 decides C1.
2. If the answer is no, the tail of s21's Next stands:
   - j50, j4, j47, t84e, j59, t45s: a third bound for the ball (a design doc first).
   - t59s, j15, t58e's second V, t23e: a side-side fillet. Untried; Levi's call.
3. t81s (and probably t4s's step) joins the corner-follow class: trace which corner term owns the fill's corner at
   the tick, and why the outline does not take it.