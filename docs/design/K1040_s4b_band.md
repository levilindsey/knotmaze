# K1040 S4b: the junction borders' corners, ties and outer edge on the GPU, behind a flag

Ledger: K1040. One Claude Opus stage agent in its own worktree. Cap 2 h. Ports 5960-5969.

## Goal

Levi, 2026-11-06: "When are we going to fix junction borders though?" S4a (f294dc08) and S4a2
(365d2244) drew the band's tube edges, the dead-end caps, term 1 with burial and the endpoint
terms on the GPU, behind a probe switch. Away from corners, check #12 now holds or nearly holds
on 6 of the 12 scenes; every spot still over 1/32 px carries form B's D4 tie, most with the cap
mix (S4a2's Handoff, from line 90 of `docs/design/K1040_s4a2_band.md`). S4b finishes F2 on the
GPU (F7's S4b in `docs/design/K1040_junction_field.md`):
- the fillet-arc strips and the corner terms (V, t_a, t_b, ω);
- S1's rules for D4 (the depth tie; S4a2's Left: blend the two composite orders by cone-key
  distance rather than MAX one) and the outer edge's AA (F7 notes 3 and 4), with the exact cap
  mix at grazing crossings and the over-ink where the top rim is itself buried
  (g41_user_tw64 (1576.4, 770.2));
- a flag param appended to CODEC_PARAMS, off by default, that draws the app's junctions with the
  new passes, so Levi can look in motion on the desktop and the Pixel.

Looks that bind: junctions "appear as though they are one whole fused seamless unit" (Levi,
window 84). Corners follow K830's rule (K1001, kept 2026-11-05): splits sharp, as F2 draws them.
The reference is the look; if it looks wrong somewhere, show where with a crop and keep its
definition.

## Authority

Every technical decision is yours: the strips, the corner table (junction_field.ts's record
textures are the pattern), the tie's raster form, the flag's wiring, the probe switches. Tests pin
what you built; they don't define done. When you find a cause, fix it; don't stop to report it.

## Start

- Your worktree starts at master, at this brief's commit, with S4a and S4a2 in it. Junction
  node_modules:
  `New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`
- The tools: S4a2's in `.claude/probes/K1040/s4a2/` (the newest; `s4a.mjs check|time|diag`, the
  `diag_*` CPU diags), S4a's in `s4a/`, S3's in `s3/`. S4a2's outputs and sheets, read-only:
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1040\s4a2\out\`. The 12 scenes:
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K868\scenes\`. New tools go in
  `.claude/probes/K1040/s4b/`.

## Done

1. All of F2 on the GPU. Behind the flag, the app draws its junctions with the new passes; with
   the flag off no pixel changes (the golden snapshots stay green). The flag is appended to
   CODEC_PARAMS and its pin moved (`test/ui/param_codec.test.ts`).
2. On the GPU frames of the 12 scenes: check #12 everywhere, corners and ties included, and
   checks 1-9 and 11. Per scene, the worst ΔF and where, beside S4a2's table. View every spot
   over 1/32 px; fix it or explain it.
3. The pop census over the recordings (`scripts/label_pops.ts` driving the new passes): no pops
   outside the fades (K1000, K1041, K1043). The free-end check against the reference on the 12
   scenes, g41_user_tw64 and sheet K's cases (K972, K973, K955, K956).
4. Levi's look, as sheets in `.claude/probes/K1040/s4b/out/sheets/` at zoom 4, the new look beside
   today's master: the corners; each fade where it shows in motion (foldw = σ, capw = h,
   zt = 0.1·amp, ovw = 0.05h); the junction eyes (K1045); the through-pass bends (K1049); a
   corner ball near another thread (K1002); a V apex (K1003); the reference's group-surface
   halos (S4a's crops `muse_hash_worst_1.png` row 1 and `g41_def_tw64_worst_1.png`, in
   `.claude/worktrees/agent-a938d2e1d4d9b45e3/.claude/probes/K1040/s4a/out/`). Plus one flag-on
   link per family for Levi to open live. You viewed every crop at full size.
5. The desktop cost, label plus band per scene (render sync), under the perf lock, and an updated
   `phone_batch.ps1` set for Claude to run on the Pixel (check #13), dry-run only. S4a's batch was
   never run; yours replaces it.
6. `npm test` green after `git fetch -q origin` and a rebase onto `origin/master`.

## Rules

- PowerShell. Read code through the shell; the Read tool only right before an Edit and to view
  crops. No helpers.
- Write only in your worktree; outputs in `.claude/probes/K1040/s4b/out/`, never `git add -f`'d.
- Commit WIP on your branch at every milestone. Never push. Never edit LEDGER.md.
- Every browser job under the perf lock, owner `K1040-S4b`, waiting inside one blocking command; at
  most two browsers, ports 5960-5969 (5940-5949 and 5980-5989 belong to other runs). Check a
  served build by a mark. Stop your servers. No phone commands.
- Two Muse runs push to master beside you: K1228 in `src/render/ribbon_mesh.ts` (until about
  10:50) and K1220 S4 in `src/render/ribbon/joinery.ts`, `arm_strip.ts` and `junction_field.ts`'s
  fan shader (until about 11:40). Keep the flag's wiring out of those files where you can; any
  edit there stays a few lines, and your final rebase takes theirs.
- Out of scope (name it, don't fix it): the CPU prep's cost (S5), paint on the field (S7: tint,
  hover rim, reveal masks, explore), the label pass's Pixel speed (K1097), the old renderer's
  junctions (K1227-K1231), the text forks (K1220).
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone). Then
  commit WIP, append your handoff to this brief (after your final rebase) and report. A compaction
  is not a stop: re-read this brief and `git log`.

## Report

Short, plain words: what you built; checks #12, 1-9 and 11 per scene; the census and the free
ends; the sheets, naming the three to show Levi first, and the flag-on links; the desktop cost;
the pins you moved; anything out of scope; the rebase and your last SHA. End with `Ledger items`
and K1040's handle fields.
