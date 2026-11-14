# K1362 stage 9: the layering in the tables, def under 8 ms on the Pixel

Ledger: K1362. One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h. Read first: the
stage 8 handoff at the end of `docs/design/K1362_s8_intercept.md` (its verdict is this stage's plan); addendum 2 of
`docs/design/K1362_t1_muse_tables.md` (the tables' bit-identity gate); "How the result is judged" in
`docs/design/K1362_s1_gpu_formb.md`.

## Where it stands

On the Pixel at 822x1506 and 1286 MHz (sync4), t32r is def 15.95 ms, muse_hash 22.35, fat 11.57, exact. Stage 8
measured the per-pixel layering (`layers()`: surfaces, face order, burial) at about 10 of def's 16 ms (3.9 ms +
4.7 per Mpx). With the layering removed (inexact, for timing), def is 5.95 ms. Every exact cut inside the shader
(single-trip loops, the burial's early exit, the layering-once fold) bounds at a few ms together. The layering
also drives most of the fixed cost: its loops diverge more when an 8x8 tile covers more world. So 8 ms needs the
layering at about 2 ms, a 5x cut, and the remaining fix is structural.

## Goal

The pass at or under 8 ms on the Pixel for def at 822x1506 and full clock, muse_hash as low as it goes, output
exact as stage 4 defined it: 0 px against the current full program on the 12 scenes and on both GPUs, plus the CPU
mirror check. You own the technique. The plan stage 8 left:

1. Optional first probe (cheap): separate fetch locality from loop divergence on the Pixel with a 2x2-replicated map
   at 822 (each 2x2 block evaluates one world point).
2. Resolve per bin or per cell, on the CPU, whatever of the layering does not depend on the pixel: which faces can
   meet, their order, which faces can bury which. Store it in NEW tables, and have the shader read it instead of
   working it out per pixel. Per-pixel values (distances, bands, burial amounts) stay per pixel. Only the work
   that is the same for every pixel of a bin moves.

Measure on the phone as stages 4 to 8 did (sync4 and frame1, the GPU clock beside every number), and report what did
nothing too. If def still misses, say what the remaining (b) fix is, or prove (c).

## Done

1. The change in `src/render/gpu_field/`, rp=gf still off by default. t32r is replaced only if the new program is
   faster on def, muse_hash and fat on the Pixel. 0 px against the current full program on the 12 scenes on both
   GPUs, the CPU mirror holds, `npm test` green, the goldens unchanged.
2. The tables gate: every EXISTING table field stays bit-identical (the digest in
   `.claude/probes/K1362/k1362t1_digest.ts` over the old fields). The new tables are additive and built from the
   old ones. If any old field must change, stop and write the gate argument addendum 2 asks for instead.
3. The build's cost before and after: the table build's ms (`tables.ts`'s per-part timings) on the desktop and in
   the Pixel's build worker, and the bytes uploaded per frame. A new table that the worker cannot build within a
   Pixel frame does not count as a win.
4. The before/after table on the Pixel (def, muse_hash, fat at 822x1506 and 1079x1977), sync4 and frame1, with the
   clock, and the desktop beside it. A one-call Pixel runner for every A/B, copied from
   `.claude/probes/K1362/k1362s8_phone_run.ps1`.

## Rules

- **The phone:**
  - It is ready only when it is unlocked with the home screen (or Chrome) in front and untouched for 2 minutes. Levi
    may take it back at any time. Do the desktop part first, then each phone part through the runner
    (`phone_pass.ps1 -Phase start -WaitReady <min>`), waiting at most 30 minutes per attempt. If the phone is still
    not ready, commit the runner and say so in the report.
  - Never wake it, unlock it, rotate it, press Home or send it any input, and never restart Chrome on it. Open and
    close only your own tabs, through DevTools.
  - Hold the phone lock (`.claude/probes/agents/phone_lock_take.ps1` / `phone_lock_release.ps1`) for each phone part,
    and release it between parts. No other agent uses the phone.
  - Keep device serials, IP addresses and Tailscale names out of every tracked file, commit and report.
- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print a whole
  file. Keep each tool output under about 40 lines. Use the Read tool only right before an Edit and to view images.
  Junction `node_modules` from the main checkout; never `npm ci` or `npm install`. Before deleting any directory,
  delete each junction inside it with `(Get-Item <path>).Delete()`.
- **Your files:** everything in `src/render/gpu_field/` except `gf_app.ts` (now including `tables.ts`, `gf_build.ts`,
  `gf_worker.ts` and `gf_pack.ts`, under item 2's gate); `test/render/gf_*`; `.claude/probes/K1362/k1362s9_*` (copy
  stage 8's `k1362s8_*` tools as needed).
- **Untracked inputs** (scenes, drags, stage 8's outputs) are in the main checkout's `.claude/probes/`. Copy what you
  need; never write there.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs. Never
  push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start.
- **Perf lock** for desktop timings: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to
  time, and delete it after. If another owner holds it, wait inside one blocking command.
- **Stop** when Done holds or 2 h after your start, whichever comes first. Run `Get-Date` at the start, write the time
  into your first commit message, and run it at each milestone; before stopping for the cap, check that 2 h have
  really passed. A lever that looks out of reach is not a stop: spend the time on the next most promising one. Leave
  the last 20 minutes for the write-up. Then commit WIP, append a handoff to this brief with your start and stop
  times, release the phone lock, and report. Neither a compaction nor context size is a stop.

## Report

Under 30 lines:
- what moved to the tables, and why it is exact;
- the before/after table with the clock, and the build's cost;
- the exactness checks and the digest;
- your verdict and what the next stage needs;
- your last SHA.

End with `Ledger items` and K1362's handle fields.

## Handoff (stage 9 agent, claude session 01SUPGULDxvE5gKXozfaFaFG)

Start 13:42:20, stop 15:06 (2026-11-13). Branch `worktree-agent-a9f562d4c9f0e4356`. Nothing moved to the tables:
`tables.ts`, `gf_build.ts`, `gf_worker.ts`, `gf_pack.ts` and `eval.ts` are unchanged against origin/master, so the
k1362t1 digest is identical at this branch and at origin/master f6cfafe5 (`all ae1d2392...a85a27`, 5445 lines),
and the build's cost and upload are stage 8's. Every change is a tier form in `gf_glsl.ts` (`GfTier` `fast`, `s`, `lab`), off unless a tier asks for it.

**Why no tables.** The first lever was the layering-skip the tables would give: `fast` (FAST, `layers1()`, the
layering for one-piece pixels with no faces to order or bury, exact, 0 px on 12 scenes on both GPUs). It skips the
work and does nothing on the Pixel (sync4 at 1286 MHz, t32r -> t32rf: 822 def 15.75 -> 16.05, muse_hash 21.8 ->
21.93, fat 10.82 -> 10.75; 1079 def 22.03 -> 22.03, muse_hash 30.52 -> 31.05, fat 16.47 -> 16.07). Inferred: a table
that tells the shader what it may skip buys nothing unless the program also drops state, because the cost is the
footprint (stage 4), not the executed work. So the stage went after the footprint inside `layers()` instead.

**What moved, and why it is exact.**
- `s` (SCAP): MAXS, the per-surface arrays' length (p + k = 5), capped at s. A pixel that needs more surfaces sets
  `sOvf`, and main discards it (`discard; return;`) for the full program behind the stencil, the tier rule stage 4
  set. Cover at s = 3 equals t32r's (def 0.9981, muse_hash 0.999, fat 1); s = 2 drops muse_hash to 0.9971.
- `lab` (LABRUN): the label's top covered surface kept as a running best (labK, labE, labC) in place of the
  sckey / scch / scov arrays: replace when the key is greater, or equal on a lower surface index, which is the
  arrays' first-greatest choice; no float arithmetic changes. `gf_tier_forms.test.ts` pins both source forms and
  the choice on 20000 random lists with ties, -BIG and NaN keys.
- Exactness (desktop, D3D): 0 px and 0 unwritten against full on the 12 scenes for t32rc3, c2, c1, t32rfc2,
  t32rl, t32rlc3, t32rlc2, t32rflc2 (k1362s9 cmp); the CPU mirror column equals t32r's. On the Pixel only t32rf has
  run the 12 (0 px, 0 unwritten, 12/12). `npm test` green (2984).

**Desktop (D3D, sync4 ms; the perf lock held).** t32r -> t32rc3: 822 def 1.07 -> 0.80, muse_hash 1.63 -> 1.27, fat
0.75 -> 0.55; 1079 def 1.40 -> 1.02, muse_hash 2.05 -> 1.52, fat 1.05 -> 0.75. frame1 822: 5.5 -> 4.2, 8.3 -> 6.5,
3.9 -> 3.0; 1079: 7.4 -> 5.5, 10.7 -> 8.1, 5.6 -> 4.1. t32rl = t32rc3 (0.78 / 1.25 / 0.53 at 822) and lab adds
nothing over c3 (t32rlc3 0.83 / 1.25 / 0.53, t32rlc2 0.78 / 1.18 / 0.53). Attribution (att822, inexact removals):
only `anolay` (no layering) moves the desktop; the tangent, key, pin, gap and kf removals are within noise.
Probe 1 (`aquad`, every 2x2 block evaluates one world point): 7-9% on the desktop (def 0.95, muse_hash 1.50, fat
0.65 against t32r's 1.07 / 1.63 / 0.75), so fetch locality and divergence are a small part there.

**The Pixel.** One run (13:56-13:59, phone_p9a / p9b) measured t32r and t32rf; the A/B of the cap and lab, probe 1
and the attribution (`cfg_p9c.json`) never ran: three more attempts found the screen off for 24, 25 and 13 min
(14:00-15:04), and the runner gave up each time without touching the phone. t32r -> t32rf, ms @ MHz:

| scene | 822 sync4 | 822 frame1 | 1079 sync4 | 1079 frame1 | desktop 822 sync4 (dtab) |
|---|---|---|---|---|---|
| def | 15.75@1286 -> 16.05@1286 | 18.6@1017 -> 16.3@940 | 22.03 -> 22.03 @1286 | 24.6@1190 -> 20.3@1286 | 1.05 -> 1.02 |
| muse_hash | 21.8@1286 -> 21.93@1286 | 21.5@1190 -> 21.8@1286 | 30.52 -> 31.05 @1286 | 33.6@1286 -> 33.3@1094 | 1.65 -> 1.65 |
| fat | 10.82@1286 -> 10.75@1286 | 14@825 -> 17@825 | 16.47 -> 16.07 @1286 | 19@1286 -> 18.6@1017 | 0.75 -> 0.72 |

frame1 moves with the governor's clock, not the program; sync4 at 1286 is the comparison, and FAST is flat there.

**Build cost (unchanged).** `k1362s1_time.ts`, desktop Node, n = 20, p50 ms vtx / pins / arms / corners / bins,
total p50 / p95: def 3.20 / 0.22 / 0.81 / 6.47 / 1.22, 11.92 / 14.08; muse_hash 3.31 / 0.24 / 0.63 / 2.69 / 0.75,
7.54 / 23.66; fat 1.53 / 0.22 / 0 / 0 / 0.79, 2.65 / 5.40. The Pixel's build worker runs the same code: c1's 20 ms
on def stands. Upload per table rebuild (`k1362s9_bytes.ts`, RGBA32F rows x 2048 texels): def 1376 KB, muse_hash
1056, fat 960.

**Tools** (`.claude/probes/K1362/k1362s9_*`): `entry.ts` (variants: `t32r` + `f` fast, `l` lab, `c<n>` the cap;
`a<part>` attribution removals, `aquad`), `run.mjs` (`build`; `desktop <label> <cfg>` -> `out/s9/desk_<label>.json`),
`sum.mjs`, `bytes.ts`, the cfgs (`cfg_p9c.json` is the Pixel A/B: c822, cmp12, f1080, att822) and the one-call
Pixel runner: `pwsh -NoProfile -File .claude/probes/K1362/k1362s9_phone_run.ps1 -Cfgs p9c -WaitMin 25` (builds the
site, takes the phone lock, waits for a ready phone, runs gpuclk per cfg, cleans up and releases the lock;
`out/s9/phone_<cfg>.json`, `gpuclk_<cfg>.json`, one line per scene and mode with the clock in its log).

**Verdict and next.** t32r stays the default: Done 1 lets a new tier replace it only on a Pixel win on def,
muse_hash and fat plus 0 px there, and neither was measured. Done 2 and 3 hold (nothing in the tables moved);
Done 4 has only the t32r and FAST rows. Def is still 15.75 ms at 822, not 8. The candidates, exact on the desktop and
20-26% faster there: t32rc3 (`{ p: 3, k: 2, ramps: true, s: 3 }`) and t32rlc3 (the same plus `lab: true`), which
together take the per-surface arrays from 8 x 5 slots to 5 x 3. Next stage, first thing: run the one-call runner
above on a ready phone (`-Cfgs p9c`, about 10 min). If c3 or lc3 is faster on all three at 1286 MHz and cmp12 reads
12/12 at 0 px, set `GF_TIERS` (gf_pass.ts) to it and update its comment. If the Pixel ignores the surface footprint
as it ignored FAST's work cut, the next cuts are the per-piece arrays (11 per piece, 33 slots in the tier) and probe
1 (`aquad`) decides whether divergence is worth the per-bin tables; only `anolay` matters on the desktop, so the
Pixel's att822 rows say which part of the layering to move first.

## Addendum: the Pixel A/B (coordinator, 2026-11-13 19:58)

`-Cfgs p9c` ran at 19:58. A touch on the phone at 20:01:24 tripped the watchdog after c822 and cmp12, so f1080
and att822 did not run; they are `k1362s9_cfg_p9d.json` (`-Cfgs p9d`). 822x1506, sync4, one run, ms at the clock
shown (`out/s9/phone_p9c.json`):

| | def | muse_hash | fat |
|---|---|---|---|
| t32r | 16.85 @1286 | 22.45 @1286 | 11.5 @1190 |
| t32rc3 | 14.85 | 20.07 | 9.98 |
| t32rc2 | 13.9 | 19.65 | 9.43 |
| t32rl | 14.88 | 20.27 | 10.05 @1190 |
| t32rlc3 | 13.95 | 18.38 | 9.33 |
| t32rlc2 | 12.78 | 19.07 | 7.98 |

frame1 (app pacing, clocks 556-1017) orders them the same way: def t32r 20.5 / t32rlc3 19.1, muse_hash 25.9 /
21.9, fat 17.6 / 14.4. Exactness: every variant 0 px and 0 unwritten against full on all 12 scenes (def, muse_hash
and fat in c822; the other nine in cmp12). t32r's def read 15.75 in the stage's own run and 16.85 here: about 7%
between runs.

So the Pixel does follow the surface footprint (unlike FAST's work cut), as stage 4's register rule says. t32rlc3
wins all three (-17 / -18 / -19%) and the pre-set rule picked it: `GF_TIERS` is now
`[{ p: 3, k: 2, ramps: true, s: 3, lab: true }]`, npm test green (2993). t32rlc2 is faster on def and fat but
slower than lc3 on muse_hash; one run does not separate them. Def is 13.95 ms, still not 8.
