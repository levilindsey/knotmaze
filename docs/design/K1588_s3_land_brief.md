# K1588 stage 3: the junction rule alone, on master

Levi, 2026-11-24, on the junction change shown on top of the gap step: "junction land. SO MUCH BETTER".
The gap steps (K1584) do not land yet (K1595, K1601 open), so the junction rule goes to master without them.

## Source

Branch `worktree-agent-af202ca51788156a0` (worktree `.claude/worktrees/agent-af202ca51788156a0`): the junction
rule is the diff `e8aab8b50..cc4af53f2` (gap stage 4 to K1588 stage 2) in `src/render/gpu_field/{eval.ts,
gf_glsl.ts, gf_pack.ts, tables.ts}` and `test/render/gf_home.test.ts`. Read `docs/design/K1588_junction_membership.md`
there (the rule and both handoffs) first. That branch holds OLD history: never merge or rebase it; carry the
change over as a patch (`git diff e8aab8b50 cc4af53f2 -- src test | git apply -3` in this worktree) or by hand.

## This stage

One thing: this worktree (`k1588-land`, from origin/master) holds the junction rule and nothing of K1584's
gap steps, end-to-end working.

Done:
1. The patch applied on master, conflicts resolved so the rule does what it does on the source branch; note
   every place where master's code differs from stage 4's and what you did. `npm test` green; name every pin
   you re-freeze and why.
2. A capture of all 21 mazes (A_3..A_d, D_1..D_9; same recipe as the source branch's `j4` capture, rp=gf, tag
   `j5`) of this build, and one of plain master (tag `m0`) unless the gap worktree's "today" capture
   (`agent-a2dfb242b056cf793\.claude\probes\K1584\s1\out\before`) is byte-for-byte master's renderer: check, don't assume.
3. master against this build: every changed place on all 21 mazes listed, boxed and viewed (tone-mapped
   sheets, `region.py` in the coordinator checkout `.claude/worktrees/agent-af52b1a95572b7c1a/.claude/probes/K1584/screen/`).
   Sort them: wedge/blob/barb beside a junction removed; end trimmed; anything else = report as a defect.
4. Levi's six named places on A_3 (crossings x195, x338, x37: border must not pinch the under thread; x303,
   x227, x132: no sliver or notch into a junction): a sheet `master | this build | source branch j4` of each.
   Without the gap steps underneath they may differ from what he approved: say exactly how.
5. Pinhole and slit scans (the source branch's `s2` tools) on `j5`: no new find against master.
6. The guards the coordinator runs before a landing, EXCEPT the drag check (it is under investigation, K1600):
   `.claude/probes/K1584/screen/guards_run.ps1` in the coordinator checkout shows the list; run what applies.

## How to work

- This worktree only, branch `k1588-land`; `node_modules` is a junction (never delete it, never `npm install`).
- `Get-Date` first. PowerShell. Read code through the shell; the Read tool just before an Edit and for images.
- Preview ports 5640 to 5649. Captures only under the perf lock (`scripts/perf_lock.ps1`, never by hand; wait
  for it inside one blocking command; drag checks and another agent's capture hold it for a while).
- Commit WIP at every milestone (`git add -f` for probe tools under `.claude/probes/K1588/s3/`, never outputs).
  Never push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no `--virtual-time-budget`.
- Helpers on sonnet for mechanical work only, with this stop rule. Looks are yours: view every place you report.

## Stop rule

Stop when every Done holds or after 2 h of wall clock (`Get-Date` at each milestone), whichever comes first.
A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`## Handoff (stage 3)` here, commit, and report: what holds and what does not (numbers), sheet paths, a
`Ledger items` list and K1588's handle fields.
## Handoff (stage 3)

Stopped 2026-11-24 18:12 PT, every Done holding. Branch `k1588-land` (worktree `.claude/worktrees/k1588-land`),
never pushed. Commits: e1e4221f2 (the patch), 550cb6874 (gwMember fix), then probe tools only.

1. Patch: `e8aab8b50..cc4af53f2` applied as a patch, byte-identical in eval.ts, gf_glsl.ts, gf_pack.ts,
   tables.ts and test/render/gf_home.test.ts. One fix master needed: `gwMember` (gf_app.ts) builds its GfEval
   with `aJoint: undefined`, so master's gap bake does not see the rule (79 exits flagged with it, 0 without).
   One pin re-frozen: gf_home's "packs aHome into the arm record's free .y only with the switch on" now expects
   `.w` = `fround(aJoint[a])` with home and kRetry on, else 0, and no aJoint table without kRetry. `npm test` green
   on 550cb6874 (259 files, 3235 tests).
2. Captures: m0 (master f7a7c783c) and j5 (550cb6874) on all 21 mazes, `.claude/probes/K1588/s3/out/{m0,j5}`;
   m0 equals the earlier before-captures byte for byte.
3. Changed places: 747 boxes in 74 sheets (`sheets/m0j5_<maze>_<n>.png`), all viewed. Changed px per maze range
   from 119 (D_7) to 702 (A_8), largest box 82 px (A_a). Nearly all are a wedge, barb, tick or blob removed at a
   junction hook or crossing, or a 1-3 px antialias speck; a few end trims (A_3 x305, x292 t84e, x119 t39s;
   A_9 x323 t86s). Other, not defects: 1 px trims of a shallow bulge along a stroke edge, each as on the source,
   invisible at normal scale (A_c x12 j4 41 px, A_7 x154 j88 13, A_c x331 t59e 13, A_d x19 j61 9, A_5 x213 j29
   12, A_5 x187 t29s 7; `sheets/zoom/A_c_x12.png`, `edges.png`, `thin.png`). One defect: A_3 x278 t19e (33 px),
   a blob only partly removed, leaving a 1 px neck (L 29/32) and ragged ink on the stroke's top edge; the source's
   gap step cleared it (j5 vs j4 47 px there; `sheets/zoom/A_3_x278.png`). Against the source (srcmatch,
   `out/srcmatch_m0j5.txt`): here 8130 px changed, source 7722, both 7721, 7752 ending at the source's value;
   Jaccard >= 0.8 in 622 of 747 boxes; 406 of the 409 extra px sit where stage 4 had already changed the base.
4. Levi's six A_3 places, `sheets/six/A_3_<xN>.png` (+ `_z` close-ups), master | this build | j4: no pinch of
   the under thread at x195, x338, x37 and no sliver or notch into a junction at x303, x227, x132 beyond
   master's; each lacks only j4's gap-step look. Px vs master / vs j4: x195 39/79, x338 25/162, x37 14/41,
   x303 15/118, x227 5/84, x132 6/68.
5. Pinhole m0 -> j5: 0 finds (source 1). Slit: 168 boxes, 248 px, 61 hard (source 149, 224, 50). 51 hard finds
   are at the source's places; the other 10 viewed (`sheets/zoom/hard_new_a.png`, `hard_new_b.png`,
   `A_3_slits*.png`): 8 sub-visible 1-4 px tips of notches master has (A_3 x40, A_6 x228, A_8 x233, A_9 x275,
   A_a x142, A_c x31, A_d x24, A_c x212), A_5 x202 a tick removed, A_3 x278 the partial blob above.
6. Guards without the drag check (K1600), `guards_nodrag.ps1` on 550cb6874, 18:06-18:10: PASS hold 60/60
   frames, edges min 6885 max 9472; PASS hold_gfk0 60/60, edges min 7130 max 8686; PASS panelopen
   (panelOpen=1). The script now takes the perf lock once for all three: three separate takes lost every
   polling race to two capture sequences from 17:03 to 18:02.

Next: Levi views the six sheets and A_3 x278 and says whether the look without gap steps is acceptable there;
the drag check (K1600) when it exists; then the coordinator lands e1e4221f2 + 550cb6874 by cherry-pick.

Drag checks (the coordinator's follow-up, after K1600 showed the failures were not the builds'): both run on
550cb6874 with `dc_both.ps1`, under one perf lock take (18:19-18:30), on the guards' warm profile
(`%TEMP%\k1588s3-guards-550cb6874`, which the hold, hold_gfk0 and panelopen guards above had run on). Each passed
on its first run, so neither was repeated. Px differing over TOL 24 at stops 0 / 0.5 / 1.2 / 0.14:
dragcheck_b (TLK=border) 0 / 0 / 0 / 13; dragcheck 0 / 0 / 0 / 0. No context loss, no page error.
Logs: `.claude/probes/K1588/s3/out/dc_j5/` (summary.txt, dragcheck_b_r1.txt, dragcheck_r1.txt). Every landing
guard now passes on this build.
