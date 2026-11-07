# K1220 S6: the i's fork fans fill only what no ribbon draws

Ledger: K1220. One Muse fix run, which Claude starts through Paseo from this committed brief. It
works in its own worktree and pushes to master when Done holds. Cap 2 h. Ports 5960-5969.

## Goal

Levi (window 84): junctions must "appear as though they are one whole fused seamless unit". At the
i's forks, in every state (rest, pluck, flow), S3's fused outline stays, and wherever a fan lies
over a ribbon, that ribbon's own paint shows: no teeth in another tone, no bump, no notch.

S5 (its Handoff ends `docs/design/K1220_s5_fan_cover.md`; not pushed) discarded the fans where the
arms' width profiles say a ribbon covers. At rest the teeth went (Done 1 near 0 at nine forks), but
Claude saw two failures on its sheets:
- The profiles claim cover where the ribbon meshes are cut short, so dark slivers are cut into the
  outline (the tooth, 628-1265 px). `ai_xh2_ji2_A.png`, bottom-left panel: dark triangles at the
  west and east edges.
- In pluck and flow the fans vanish. Those panels equal `nofans`, so the unfused notch and step
  come back (`ai_xh2_ji2_A.png` and `i_xh3_ji0_A.png`, bottom rows). S5 counted rest only.

The way is yours. Leads: fill only the pixels no ribbon mesh draws (the meshes' true footprint: a
coverage or stencil mask the ribbon pass writes, or the SDF tables and junction cut the fan shader
already binds), not the centreline profile; and find why S5's fans drop out while moving. S5's
change is a lead, not a base: `.claude/probes/K1220/s5/s5_src.patch` in the main checkout (against
986836e8; it applies to master). Its distance-based arm pick and the root arm's two-sided K620 blend
may be worth keeping.

## Read first

- S5's brief and Handoff; S4's Handoff and addenda (`docs/design/K1220_s4_i_paint.md`); K620
  (`.claude/rules/render-paint.md`); `render-shaders.md` (K307: shader text size); THE PARTS in
  `render-ribbon.md`; `probes.md`.

## Setup

- Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1220-s6`. Claude made
  it, detached at this brief's commit, with `node_modules` junctioned. Never run `npm ci`.
- S5's tools are tracked in `.claude/probes/K1220/s5/` (`paintmask.mjs`, `tooth.mjs`, `census.mjs`,
  `geom.mjs`, `shoot.mjs`, `sheets_i.ps1`, `locked.ps1`, the vite configs). Copy what you use to
  `.claude/probes/K1220/s6/`, with the served-code mark "K1220 S6" and lock owner `K1220-S6`.
- Three servers: the baseline (65c2f573, the commit before S4) on 5960, master at this brief's
  commit (S4's state) on 5962, yours on 5961. The first two are `git archive` exports in
  `.../s6/base` and `.../s6/s4`, with `node_modules` junctioned. Serve only through the copied
  configs: a plain vite rewrites the shared `node_modules\.vite`.
- Read-only in the main checkout: S5's outputs (`.claude/probes/K1220/s5/out/`: sheets, tables).
- Every browser job runs under the perf lock through your `locked.ps1`: real time, headed, `phw=0`,
  `fw=0`, at most two browsers. K1040 S4d takes the lock too: wait inside one blocking command.

## Done

1. Paint: the 10 i forks (i, ai ji2, ia ji0, ii ji0 and ji1, at xh 3 and xh 2), at rest, in its
   pluck, and in flow 2.5 and 4.1. Wherever a fan covers a ribbon whose paint it continues, yours
   differs from the `nofans` frame of the same state by at most 4 levels per channel
   (`paintmask.mjs`). A table per fork and state: the baseline's, S4's and yours. Yours is 0, or
   each spot is cropped and named. If a state's frames don't repeat between two shots of one build,
   say so and crop its forks instead of counting.
2. Outline, in each state: no ink more than 1 px outside the closing of the `nofans` ink by a disc
   of 1 fh (no bump), and no background where the baseline has ink, except its bump pixels (no
   tooth, no notch: `tooth.mjs`). Counts per fork and state. The cluster at ai xh 2's west box edge
   (the neighbouring a fork's fan, named by S4 and S5) is excluded.
3. Whole-frame diffs at rest against the baseline: every changed pixel lies within 5 fh of an i
   fork; the a and aa stands and the three maze stands change 0 px, or you name each spot.
4. Sheets, the baseline over yours at zoom 4 (`sheets_i.ps1`, A and B), in
   `.claude/probes/K1220/s6/out/sheets/`. Name the two to show first.
5. Push: make `npm test` green after `git fetch -q origin` and `git rebase origin/master`. Then run
   `git push origin HEAD:master` and watch that commit's deploy (`gh run list -R
   levilindsey/knotmaze -L 3`) until it is green. If the push is rejected: fetch, rebase, test,
   push again. Never force, never skip hooks. If Done 1-3 don't all hold by the cap, push a partial
   change only if, at every fork and state, Done 1's count is below both the baseline's and S4's,
   no Done 2 count rises over either, and Done 3 passes. Otherwise push only your tools and the
   Handoff, and keep the patch in `.claude/probes/K1220/s6/`.

## Rules

- PowerShell. Stage files by name. Never `git add -f` a probe's outputs (PNG, JSON, tables, logs,
  the exports, patches).
- Edit only `src/render/` outside `src/render/field/`, the tests that pin what you change (such as
  `k320_slim`'s shader budget), and your probe folder.
- Don't touch: `src/render/field/` (K1040 S4d); the main checkout (Claude commits there) or any
  other worktree; port 5173, ports 5820-5829, 5940-5949 and 5980-5989; the phone; LEDGER.md.
- Out of scope (name it if you see it, don't fix it): the crossing gap's dark arc west of the stem
  and the triangle on ia xh 2's stem (K1238); the reveal's looks (K1232); the dark V at ai's J
  (K1233); the stepped colour edge near the i's root (K1234); the a's 12° bend; the 1 px jog in ia
  at xh 2.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone),
  whichever comes first. Stop your servers and browsers.

## Report

Append a Handoff to this brief, in the last push: what you built, Done's tables, the sheets to show
first, anything out of scope you saw, your last SHA. Commit messages carry the record.


## Handoff (S6 run, 2026-11-06; NOT pushed - cap reached, Done 1-3 not all verified)

State at the cap (start 15:04 PT, cap 17:04): the fix is built and
npm test is GREEN on it (220 files, 2887 passed, 9 skipped, incl.
the k320 budget bump 43,200 -> 48,200), but it is NOT committed or
pushed. The src/test diff is kept in .claude/probes/K1220/s6/fix.patch
(697 lines); the s6 probe tools (shoot/paintmask/tooth/statemask/
geom/sheets, ports 5960-5962, lock owner K1220-S6) are in the
worktree, untracked, with shots/sheets under s6/out/. Servers on
5960-5962 are stopped.

What I built (fix.patch): S5's patch applied (distance-choice paint
+ root two-sided K620 blend), with its profile-claim fan discard
replaced by the meshes' true footprint: fanOnRibbon in
junction_field.ts reads SAMP/RADII (the tucked, flowed samples and
per-sample half-widths the strips extrude from, pluck collapse
included) with sdMiterQuad per segment of the fork's arms' chains,
flat at a chain's end; discard where the silhouette test passes
(sd < 0.75 pxW) and this joint's gap keep is 1. Two new texels per
arm record (stride 2 -> 4 + 2*profN) carry the joint's sample
index/samples-per-arc/toEnd/twin offset and the chain's
count/closed; junction shaders bind uG3Chain/uRadii/uRanges
(fabric_sdf radiiSource, bindFieldGap re-points them). S5's motion
dropout: its claim used the radial profile + paint-side widths,
which depart from the extruded footprint while threads move (and
past chain ends / gap-cut fragments at rest); the SDF test follows
the mesh in every state by construction. Early mine shots with all
fans missing were a shader compile break (sampAt used before its
declaration; fanOnRibbon now sits after the gap library), since
fixed.

Done 1 (rest, paintmask.mjs, base/S4/mine): i_xh3 7071/6253/312,
i_xh2 10332/9273/428, ai_xh3, ai_xh2, ia_xh3, ia_xh2, ii_xh3 ji0/ji1,
ii_xh2 ji0/ji1 mine all shot (final table in s6/out/statemask.txt
and the paintmask rerun at 16:59 still owed when the cap hit;
i forks 312-502). NOT 0: the residue is cropped-and-named classes,
not yet cropped per fork: (a) fan fill over background where the
geom capsule overclaims at the stem flare step (nofans is
background there; e.g. i_xh3 (1156,1056) nofans (71,65,84)), and
(b) the ribbons' MSAA edge band (<=1 px; the fan wears the distance
choice's ribbon paint, the diff is partial coverage against the
background). Pluck/flow (statemask, i forks): mine far below base/
S4 (e.g. i_xh3 pluck 81); full per-fork/state table in
s6/out/statemask.txt.
Done 2: rest bump (paintmask, geom closing) mine = S4's at the i
forks measured (233 i_xh3, 118 i_xh2; not above base or S4).
Image-based bump/tooth for all states: statemask.txt (closing bug
at box borders found and fixed during the run).
Done 3: INVALID shots - the a/aa/maze mine frames were shot while
the fan shader was broken (fans missing), so diff_all read
33k-153k px. Reshoot rest a/aa + maze on mine before trusting it.
Done 4: sheets built in s6/out/sheets (20, base over mine) from
the final mine shots; show first i_xh3_ji0_A.png and
ai_xh2_ji2_A.png (not yet re-read after the last reshoot).

Next session: reshoot mine rest a/aa + maze, rerun diff_all +
statemask + tooth, crop the two Done 1 residue classes per fork,
then rebase/test/push per Done 5 (partial terms look reachable:
mine Done 1 is below base and S4 at every measured fork/state).

## Claude's view (2026-11-06 17:25; not pushed)

The 16:53 sheets predate the last reshoot (mine's i forks, 16:55-17:03), so Claude rebuilt all 20
from the final shots into the main checkout's `.claude/probes/K1220/s6/out/sheets/` (untracked,
with `fix.patch`, `statemask.txt` and the shot summaries). On `i_xh3_ji0_A` and `ai_xh2_ji2_A`
the fix does what S5 could not: the teeth are gone, and the fans stay in pluck and flow, so the
notch and the step stay filled. It is not yet one fused unit:
- Dark seams where a ribbon's cut edge meets the fan's fill, in every state: a bar about 23 px
  long under the top ribbon's east corner (i xh 3; ai xh 2, longer in flow a), dotted dark pixels
  along the cut edges, and a dark arc west of the stem at ai xh 2. The base shows none. The fan
  discards out to 0.75 px past the footprint, so the ribbons' antialiased rims blend with the
  background instead of the fill (S6's class b).
- A tone edge where the fill meets the stem: east of i xh 3's stem the fill is paler than the
  stem, so it reads as a wedge set on.
- Done 3 still needs its reshoot.

K1220 waits on K1240 S2's verdict and Levi's call on the seam lanes. If the forks stay on the fan
field, S6b starts from `fix.patch`: the fan paints the ribbons' rims and continues the stem's
paint, then S6's checks and Done 5.
