# K1040 S4d: the field's still frames against K868's look

Ledger: K1040. One Muse fix run, which Claude starts through Paseo from this committed brief. It
works in its own worktree and pushes to master when Done holds. Cap 2 h. Ports 5940-5949.

## Goal

Levi's look for the border mode (`docs/design/K868_field_border.md` §1-2): white paper, and each
thread drawn only as an edge stroke along either side. "We don't show any gaps in this mode": at a
crossing the over thread's edges run through and the under thread's edges stop exactly on the
over's outline; a junction is one outline; dead ends are closed round caps, G1 with the edges,
hollow (goal 5). Form B draws this in the app behind `&fbb=1` (`src/render/field/field_b_app.ts`:
the label and band passes).

K1239 (`docs/design/K1239_export_shapes.md`, its Handoff and Claude's correction) found the scene
export accurate. The old ink stops an under thread's edges a casing gap short of the over. The
field must not copy that, and IoU against the old ink is not a target. Still open in still frames:
- A stroke the old ink shows and the field drops: K1239's `out/spot_oldonly.png` (old | field |
  overlay; red is old only, yellow both). It is on def (seed `b`) at `app_ab.mjs`'s zoom, one of
  the red clusters of `out/view_def_overlay.png` (half scale). An untested lead: form B decides
  exposed or buried per foot (D10 in `docs/design/K1040_junction_field.md`). Along a shallow
  crossing, that may bury an edge that should show.
- The free ends: S4's free-end check (K910, K934) has never run on the GPU path (K972, K973).
- The look sheets that S4b and S4c left.

Fix whatever breaks K868's look. The way is yours.

## Read first

- K868 §1-2 and its check table; K1040's D10 and S4 (its gate list); S4c's brief and Handoff
  (`docs/design/K1040_s4c_ties.md`); K1239's Handoff and Claude's correction; `probes.md`.

## Setup

- Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1040-s4d`. Claude made
  it, detached at this brief's commit, with `node_modules` junctioned. Never run `npm ci`.
- Tracked tools:
  - S4c's, in `.claude/probes/K1040/s4c/`: `s4a.mjs check|time|diag|checks|crops`, `app_ab.mjs`,
    `ab_view.mjs`, `run_locked.ps1`, the `diag_*.ts`.
  - K1239's, in `.claude/probes/K1239/`: `app_ab.mjs`, `overlay.mjs`, `magenta_iou.mjs`,
    `components2.mjs`, `attribute.mjs`, `ends.ts`.

  Copy what you use to `.claude/probes/K1040/s4d/`, with lock owner `K1040-S4d`.
- Read-only, in the main checkout `C:\Users\lsl\Repositories\knotmaze\`:
  - the 12 scenes (`.claude\probes\K868\scenes\`);
  - the free-end check (`.claude\probes\K900\indep.ts`, whose header says how it runs, and
    `.claude\probes\K934\`), with `docs/design/K900_oracle_holes.md` and `K934_recount.md`;
  - K1239's outputs (`.claude\probes\K1239\out\`) and S4c's (`.claude\probes\K1040\s4c\out\`).
- Run every browser job under the perf lock through your `run_locked.ps1`, waiting inside one
  blocking command. Real time, headed, at most two browsers. Another Muse run (K1220 S5) takes the
  lock too.
- Start dev servers only on the private-cache config, on ports 5940-5949 (`npx.cmd vite --config
  .claude/probes/K1040/s4d/vite.private-cache.config.ts --port 5941 --strictPort --host
  127.0.0.1`). A plain vite rewrites the shared `node_modules\.vite`.

## Done

1. The dropped stroke: a crop at zoom 4 (old ink | master's field | yours) and one line on what it
   is and why the field drops it. If K868 says it shows (goal 2 or 3, check 16), yours draws it.
   List every other spot with that cause on the 12 scenes and on K1239's three families (def, muse,
   user), each fixed or named.
2. Free ends: run the free-end check on the GPU frames of the 12 scenes, g41_user_tw64 and sheet K's
   cases (K972, K973, K955, K956). The field's free ends equal the reference's, or each difference
   is cropped and named. Dead ends and anchored ends in view draw goal 5's caps.
3. No regression: check #12's counts and checks 1-9 and 11, per scene, against S4c's table. No
   count rises, or each new spot is cropped and named. `npm test` is green, and the flag stays off
   by default.
4. Sheets at zoom 4, with the field beside today's border look (`fbb` off), in
   `.claude/probes/K1040/s4d/out/sheets/`: Done 1's spot, the eyes (K1045), the bends (K1049), a
   corner ball near another thread (K1002) and a V apex (K1003). Name the two to show Levi first.
5. Push:
   - Make `npm test` green after `git fetch -q origin` and `git rebase origin/master`.
   - Run `git push origin HEAD:master`. Watch that commit's deploy (`gh run list -R
     levilindsey/knotmaze -L 3`) until it is green.
   - If the push is rejected: fetch, rebase, test, push again. Never force, never skip hooks.
   - If Done 1-3 don't all hold by the cap, push a fix only if Done 3 holds and the fix removes a
     spot that Done 1 or 2 names. Otherwise push nothing but your tools and the Handoff, and keep
     the patch in `.claude/probes/K1040/s4d/`.

## Rules

- PowerShell. Stage files by name. Never `git add -f` a probe's outputs (PNG, JSON, tables, logs).
- Edit only `src/render/field/` and your probe folder.
- Don't touch:
  - `src/render/ribbon/`, `junction_field.ts` or `arm_strip.ts` (K1220 S5);
  - the main checkout (Claude commits there) or any other worktree;
  - port 5173, or ports 5820-5829 and 5960-5989;
  - the phone;
  - LEDGER.md.
- Out of scope; name it if you see it: the pop census and the fades in motion (the next stage), the
  multi-piece cap mix, the CPU prep's speed (S5), paint on the field (S7), the paper's colour.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone),
  whichever comes first. Stop your servers and browsers.

## Report

Append a Handoff to this brief, in the last push: what you built, Done's tables, the sheets to show
first, anything out of scope you saw, and your last SHA. Commit messages carry the record.

## Handoff (S4d, 2026-11-06)

Muse run 01a1b300 (coordinator: Claude) ran 14:35-16:3x PST in
`.claude/worktrees/muse-k1040-s4d`, under the perf lock through
`.claude/probes/K1040/s4d/` (owner `K1040-S4d`; tools copied from S4c and
K1239, plus a `freeends` mode in `s4a.mjs`/`page.ts`, `exits.ts` from
K934, and the `scan*.ts` reference scans). Dev server (private-cache
config, port 5942; 5941 was already held by another run's server) and
browsers are stopped. **No `src/` change: Done 1 does not hold, so per
Done 5 this push carries only the tools and this Handoff.** `npm test`
green at the base and after the rebase: 220 files passed / 2 skipped,
2887 tests passed / 9 skipped. The `fbb` flag stays off by default.

### Done 1 - the dropped stroke: not reproduced on current master

Claude's `spot_oldonly.png` could not be located in any shot set I can
build: template matches (grey, band-mask and geometry-tube, at dpr 1.5
and dpr 1, native and half scale) against K1239's `app_before`,
`app_magenta` and `app_magenta_lbi` def shots all score <= 0.41, and
the old-only band components of those shots, of my own `app_ab` shots
(def/muse/user, current master 77347245, `phy=0&fw=0&phw=0`), of LBI,
and of settled-physics screenshots are all edge slivers of the two
known K1239 zones (junction flanks, crossing cuts) - no whole dropped
segment anywhere. The spot's shots were K1239's build `bf8331e7` at a
state I could not reconstruct (its panels' band width ~90 px matches
neither dpr 1.5 (139 px) nor the s4a page).

What I could test, I tested:

- In form B, per-foot burial (D10) cannot bury a crossing pass's edge:
  burial only counts pieces of the same surface, and on all 12 scenes
  **no crossing has both passes in one group** (`scan3.ts`: 0 of 353 on
  def, 0 on every other scene). Burial bites only inside a junction
  union, where goal 3 wants it.
- A whole-chain scan of the float64 reference (`scan4.ts`: band centre
  inked >= 0.5 wherever foot and centre lie outside every other tube,
  own chain's far passes included) finds **no missing run >= 0.5 world
  on def**; the longest anywhere on def are 12 runs of 0.26-0.36 world,
  all at junction mouths/corners. Run it on the other scenes before
  trusting it there.
- At the app_ab stand on current master, the one shallow-crossing
  complex in the zoom (chains 6/61, crossings 71/72, with junction j61
  and chain 24's fork between them) draws both borders of both passes
  through the eye and the fork: sheet `out/sheets/done1_eye_fork.png`
  (old | field | overlay). The overlay's red inside the eye is the old
  look's filled tube where the field draws only edges - the K1239
  correction's point, not a dropped stroke.

So the lead is falsified for the reference as built, and the spot is
either the pre-S4c build, the `lbi` label app (whose old-only
components are the same slivers as fbb's on the same shots), or a
settled geometry. Next step for whoever picks this up: re-shoot
Claude's exact spot state first (the crop's pixel provenance), then
`diag_bur.ts`/`diag_at.ts` at that point. **Done 1 not held; no fix.**

### Done 2 - free ends on the GPU frames (new `s4a.mjs freeends`)

The K910/K934 check (walk every side band; flood each run end's ink in
a 0.8h disc, grid W/2; K934's runs count <= 1 is a free end) run on the
GPU frame and on form B's reference probe of the same frame, geometry
from the oracle model as in K934's `indep.ts`:

| Scene | GPU | Ref | Differing spots |
|---|---|---|---|
| muse_hash | 40 | 39 | GPU-only chain 66 s 39.38 (32.18, 18.98) |
| muse_default_tw | 11 | 10 | GPU-only chain 55 s -0.13 (16.64, 4.80) |
| def | 8 | 7 | GPU-only chain 28 s -0.15 (7.65, 3.11) |
| fat | 0 | 0 | - |
| ring | 2 | 2 | - |
| user_tw42.lightpaper | 10 | 10 | - |
| g41_def_tw42 | 2 | 2 | - |
| g41_def_tw64 | 10 | 11 | ref-only chain 83 s 2.88 (21.26, 10.84) |
| g41_ring_tw42 | 0 | 0 | - |
| g41_ring_tw64 | 5 | 5 | - |
| g41_user_tw42 | 10 | 10 | - |
| g41_user_tw64 | 22 | 20 | all matched within 0.4 world; 2 extra GPU ends are second walks of ref ends past the W merge |

Every differing spot is cropped in `out/sheets/<scene>_crops_fe.png`
(reference | GPU | diff at zoom 4): ref and GPU are visually identical;
the difference is the flood's threshold on the reference's own
partial-coverage smudge inside a junction (both GPU-only def and
ref-only g41_def_tw64 crops show it). The two s ~ -0.14 GPU-only ends
are at END-arm extensions (s0 < 0), inside the junction union - the
cap-mix class S4c named, not a drawn cap. Sheet K's cases: muse_hash's
free ends at K955's (4.78, 33.44) are present on **both** (chain 23
s -0.18 and s 0.93, chain 43 s 44.6); at (3.07, 28.27) and at K973's
def (26.225, 1.436) neither side has a free end. Dead/anchored ends:
check 3 (cap Hausdorff) statuses are S4c's (fails only on muse_hash,
on the reference too) - no new cap defect; in-view dead ends draw
goal 5's caps on both. **Done 2 held up to the named threshold spots.**

### Done 3 - no regression (no src change, measured anyway)

Check #12 on the 12 scenes reproduces S4c's final table exactly
(e.g. def away worst 0.328 / 5 over, near 1.484 / 215; muse_hash away
1.224 / 31, near 2.602 / 519; g41_user_tw64 near worst 6.869). Checks
1-9 and 11 (`s4a.mjs checks`): per-scene status lists identical to
S4c's `checks_ckfinal_*` on every scene. Remaining over-1/32 spots are
S4c's named class (the multi-piece cap mix; the reference's grey haze
halos). `npm test` green; flag off by default; flag-off parity is
S4c's (no src change here at all).

### Done 4 - sheets (`out/sheets/`, old border look | field | overlay)

- `done1_eye_fork.png` - Done 1's stand-in spot: the chains 6/61 eye
  (crossings 71/72) with j61 and chain 24's fork (also the K1045
  close-junction eye: j60/j61 1.35 apart, form B's dot in the wedge).
- `bend_j61.png` - a through-pass bend (K1049): chain 61 bending
  through j61, chain 24 forking off.
- `j139_ball_vapex.png` - muse_hash j139 (17.18, 17.15): the K1002
  corner ball against chains 46/84 and the K1003 V apex.
- `<scene>_crops_fe.png` - the Done 2 differing free ends.
- `*_junctions.png` / `*_worst.png` from the check run (reference |
  GPU | diff, zoom 4).

The named muse_hash eye (26.675, 1.096) and def eye (30.555, 17.488)
sit outside the app_ab zoom's view, so they are in the check-run
junction sheets instead of an app sheet. **Show first:**
`done1_eye_fork.png` (the eye + fork complex, old beside field) and
`j139_ball_vapex.png` (the ball/apex corner).

### Out of scope, seen and not fixed

- The multi-piece cap mix (S4c's remaining check #12 class) is also
  what moves the free-end counts in Done 2.
- A GL warning in the settled field screenshot
  (`GL_INVALID_OPERATION: glDrawElements: Mismatch between texture
  format and sampler type`) - one console line in
  `out/settled_on.png`'s capture; provenance not traced.
- The pop census and fades in motion (next stage), paint on the field
  (S7), CPU prep speed (S5): untouched, as briefed.

Last SHA: see the commit carrying this Handoff (tools + brief only;
no `src/` change, so no deploy runs on this push).
