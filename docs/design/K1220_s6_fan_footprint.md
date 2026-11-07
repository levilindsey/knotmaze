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
