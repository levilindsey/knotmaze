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

## Handoff (stage 3)

**Verdict: safe to land.** `8bd48974b` (src + its pin) removes all 8 specks at the 7 places on Levi's link (the tip
at a corner point among them) and changes nothing else: 38 px on L, all at the 7 places, 0 px on each of the 21
mazes, and the true crossing gaps' diff is 0.

**Mechanism.** A corner's key is its nearer arm's z at the tangent point, less uZt. The corner's other arm B (its
piece key, z - pd zK) cleared that key out to pd = h (zB - zA) / uZt. Where B sits 0.01-0.07 of depth above A at the
junction, that reach ends just past B's own outline, inside the rounded corner, and cuts a paper speck there. **Fix
(`gf_look.ts` lkGap):** B cuts a corner only above its own z at its tangent point: `oKey = max(key, zB - uZt)` from
the corner table (texel 3 kCa/kCb/kSa/kSb picks which arm is B, texel 4 kZa/kZb its z). This applies in the piece
loop and to the window's named over pass (`lkNearOn`, B's key read with `depth()` at the near point). Every other
thread keeps the corner's key. It runs on corner labels only (`lkKib >= 0`, `lkJb < 0`), so there are no new reads
off corner pixels.

**Counts (frozen state = m0's hashes, view pinned; real-time captures under the perf lock, port 5663):**
- Diff, master `m0` against mine `s3a` (8bd48974b), every pixel at any level:
  - L: 38 px, all at the 7 speck places. specks.py finds 9 islands (51 px) on master and 1 on mine: (814,130), the
    start marker's ring, unchanged.
  - 21 mazes: 0 px each.
- specks.py on all 22: 45 islands on master, 37 on mine. The 36 on the 21 mazes are unchanged (see residuals).
- True gaps:
  - Today's L has no true gap that reaches a corner pixel: with every corner cut removed (`p_nocorner`), only the
    specks change.
  - 108 crossings between a corner's own two arms, 1.0-2.1 world from the junction (`eyex.py`; 6 on L, 102 on the
    21 mazes): 0 px changed.
  - Stage 2's true gaps (2234,936), (2329,358) and (2346,380) are today's x282 at (2292,946) and x38 at (2352,415).
- screen.py (`an.ps1 -Tag s3a -Master m0`, 21 mazes), master and mine identical:
  - closed 2531, gap 7114, bare 17220, part 2911, none 24
  - loose pieces 54/15/33/1821

**Sheet (14x, master | mine | change; viewed):** `.claude/probes/K1627/out/sheet_s3_all_1.png` (19 rows) or the
pages `out/sheet_s3_1.png`..`_4.png` plus `out/sheet_s3_eye_1.png`. The rows:
- 1-7: the speck places.
- 8-13: true gaps nearest a junction.
- 14-19: true gaps between a corner's own arms.

Places: `sheet_places_s3.json`. There are no other changed places.

**Pins:** `test/render/gf_corner_self.test.ts`, the new `it("K1627 s3: the corner's other arm cuts it only above
its own z ...")`, pins the other-arm block, the loop line and the near-pass gate in every cornerPlan program and the
full program, alone and over revealForm. `npm test` is green (253 files, 3232 tests); `npm run build` passes. No
golden or codec pin moved.

**Tools (`.claude/probes/K1627/`):**
- `specks.py`: enclosed paper islands.
- `cmp.py <tag>`: every maze's diff and specks counts against m0.
- `eyex.py`: crossings between a corner's own arms.
- `nearx.py`: crossings nearest a junction.
- `p_kB.json` / `p_kBl.json`: the fix as a patch.
- `run.ps1` / `cap.ps1 -HashFrom`, `sheet_c.py`, `an.ps1`.

Outputs stay in `out/` (untracked).

**Residual (not touched, observed only):** specks.py finds 36 paper islands on the 21 mazes, identical on master
and mine (`out/look_isl_1.png`, `_2.png`; places `sheet_places_s3_isl.json`). On the black-thread looks they are
slivers in a fork's crotch, pinholes in thin crossing gaps (A_6, A_8, A_b, A_c), and the marker discs' rings. The
mechanism is not attributed: they are not corner cuts, since this rule changes none of them. They are Levi's to name
or not.
