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
