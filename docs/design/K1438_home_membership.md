# K1438: junction membership from the arms' home intervals, with a fade that follows fadeLength (Claude agent stage, tables + CPU)

## Why

K1435's probe (read `### Handoff K1435` in `docs/design/K1435_table_grouping_probe.md` whole; its probe is
`.claude/probes/K1435/k1435_mkprobe.mjs`, mode `tgr`) showed that a piece inside a junction arm's home interval
(arm root to the crossing that cuts it) should belong to that junction's group, fading out with depth. Over the
12 census scenes, tie- and ramp-class smudge finds fell from 2,030 to 547, the ghost threads went, and the 25
clean spots stayed identical. Order stays per pixel (the crisp graph-order modes left stubs).

This stage moves `tgr` into `src/` on the CPU side: `tables.ts` and `eval.ts`. The GLSL mirror is the next stage
(K1439), so this stage leaves `gf_glsl.ts` and the GPU parity tests behind a switch: the new membership is off by
default in the build that ships (a table flag or constant that `eval.ts` reads), and master's pixels do not
change until K1439 turns it on in both. Say in the handoff exactly how the switch works.

K1407 c5 (e3297511, merged) changed member()'s second loop: it skips an arm rooted with the first loop's arm.
Start from master with that in.

## Levi's requirement (2026-11-16)

"Isn't this controlled by the crossing fade parameter? I want to continue being able to adjust it on the fly."

The probe's ramp is a constant (membership 1 to 0 as |depth| goes 0 to 3 zt). In `src/` the fade where a thread
dives under a junction follows the crossing fade parameter, `fadeLength` ([0, 1.2], `url_state.ts`), live, as
the cut at an ordinary crossing already does in the look (`gf_look.ts` `lookFade`, `uLkF`; read how K1398 did
it). `fadeLength` 0 gives a crisp cut. Changing `fadeLength` must not rebuild the tables: it reaches the
evaluator as a uniform-like input.

How the depth ramp maps to a length along the thread is yours to design. Show it: one sheet of the four open
spots and five of the worst sites at `fadeLength` 0, the default, and 1.2. The probe's crisp modes left stubs
and slivers at some sites; report what `fadeLength` 0 looks like there, with pictures. Do not hide it.

## Done

1. **Spots.** With the switch on: at least 27 of the 29 spots of `.claude/probes/K1407/out/c4/spots.txt` clean
   by K1433's test and by eye at 4x next to rp=outline; the 25 identical to master. Sheets under
   `.claude/probes/K1438/out/` (master | new | rp=outline).
2. **Scan.** K1433's scan over the 12 scenes at the default `fadeLength`, switch on: tie+ramp at most 547 finds
   / 19,287 px. Per-scene table.
3. **fadeLength.** The sheet above, and a test in `test/render/` that the membership fade's extent scales with
   `fadeLength` and is a hard step at 0.
4. **The worse site.** `g41_user_tw64:17.80:9.55` (a soft dark band `tgr` adds): fixed, or reported with its
   cause and what you tried.
5. **Tables.** Size unchanged (the arm record's free floats). With the switch off: the digest and every pin as
   on master, and `eval.ts`'s pixels equal to master's on two scenes. With it on: the new digest reported.
6. **Tests.** `npm test` green.
7. **For K1439.** What the GLSL mirror needs: the lines of `gf_glsl.ts` that change, the review of the
   "no ramps" depth class and the two-ramping-piece limit (`MAXR`), and the per-pixel work added (loop trips on
   muse_hash and def).

## How to work

- Work in your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Use PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Files: yours are `tables.ts`, `eval.ts`, `gf_pack.ts` if the record needs it, tests for them, and
  `.claude/probes/K1438/`. Not yours: `gf_glsl.ts`, `gf_look.ts`, `gf_pass.ts`, `gf_app.ts`, `gf_reveal.ts`,
  `gf_explore.ts` (Muse batch 24 works there, in the main checkout).
- CPU only. For a run of more than a few minutes on all cores, take `$env:TEMP\claude-perf.lock` (one line:
  owner, start, what), wait inside one blocking command if it is held, and delete it after.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files). Never push. Never edit LEDGER.md.
  Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work, with this stop rule.
- Own the technique: for anything not closed at the stop line, report what you tried and why it fell short.
- Look at every spot yourself before calling it clean.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1438` here, commit, and report: what holds, the sheet paths, the numbers, a `Ledger items` list
and K1438's handle fields.

### Handoff K1438

Stopped 2026-11-16 ~21:10 with every Done met except the worse site (4), which is a look for Levi. Evidence:
`.claude/probes/K1438/` (sheets and tables in `out/`; panel `.bin`/`.png` files are untracked and rebuilt by
`k1438_spots.ts`).

**The switch.** `GF_HOME` (tables.ts) reads env `GF_HOME=1`; `buildTables(scene, { home: true })` overrides it.
Off by default: digest, pins, pack and eval pixels are master's. On: `tables.aHome[a]` = the arm's home extent
(`aLcut === Infinity ? aL : max(aL, min(ahead, 4h))`, built either way, so only `homeOn` differs), packed into
the arm record's free `.y` (2nd texel, and the KA copy). `member(c, s, z)` takes a sample with
`0 <= d <= aHome` as the junction's (best d wins, as for aL), with ramp
`homeRamp(|z|) = 1 - smoothstep(0, Z, |z|)`, `Z = fadeLength * amp / win`; a full aL member is never
downgraded. `GfEval.fadeLength` (default `GF_FADE_LENGTH` 0.14 = `PARAM_DEFAULTS.fadeLength`) is read live,
no rebuild; 0 is a hard step at `|z| > 0`. K1435's `tgr` is `fadeLength = 0.3 win`.

**Measured.**
- Tables: size unchanged. Off digest `c1be0e90e689850ce0a9bfe43bcc58684181fa784393a9b5f37779ebfcb40dd0` (5445 lines) = master; on `8ce009e913bf2e9f01ed112d7cb3c37fb94fb1f74d81e091bdf1abe53cae0c96` (5544: master's lines plus the aHome rows; `out/digest_*.txt`). Eval pixels off = master
  on def and muse_hash (ppu 30). `npm test` green (`test/render/gf_home.test.ts`, 6 tests: off by default,
  the fixture's aHome, no membership past aL off, the extent minus the dive = fl for fl 0.05..1.2, fl 0 a hard
  step at the dive, pack).
- Spots (`out/sheet_spots_1..6.png`, `spots_new.txt`; m | new | ol): 28 of 29 clean by test; spot 5
  (muse_hash:19.41:14.16) keeps 6 px dstray:tie that master and outline show too. Of the 25: 20 byte-identical,
  5 (15, 17, 18, 19, 28) move an AA fringe by up to 22/255. Spot 4 (muse_hash:5.88:8.50): master's band gone, the
  corner now rounds where outline draws a dive shadow (look call).
- Scan at the default fl (`out/scan_table.txt`), tie+ramp finds / px: off 1797 / 69803, **new 435 / 13736**
  (bar 547 / 19287), fl0 690 / 24249, fl1.2 632 / 10319, tgrfl 545 / 19007.
- Ramping pieces per inked pixel (`k1438_ramps.ts`, ppu 40), nr>=1 / nr>=2 / nr>MAXR: def off 8.79% / 15 px / 0,
  new 4.32% / 2 px / 0, fl1.2 12.09% / 0.041% / 0; muse_hash off 10.77% / 0.507% / 2 px, new 4.36% / 0.095% / 0,
  fl1.2 17.95% / 1.533% / 0.
- Work per active pixel off -> new: muse_hash pcalls 0.237 -> 0.321, segs 2.67 -> 3.70, cfgs 1.113 -> 1.045
  (fl1.2: 0.352, 4.05, 1.195); def 0.287 -> 0.291, 2.53 -> 2.56, 1.088 -> 1.043. nSeg / nK unchanged.
  member()'s arm loop gains one compare, no new loop.

**fadeLength** (`out/sheet_fl_1.png`, `sheet_fl_2.png`: m | f0 | new | f12 | ol). f0 brings back master's tie
bands, slivers and notches where aL meets the dive; the default softens the band to an outline-like shadow;
1.2 removes the dive shadow and rounds corners.

**The worse site** g41_user_tw64:17.80:9.55 (`sheet_worse.png`, `crop_worse*.png`, `crop_zt_worse.png`,
`k1438_why.ts`): two arms of junction 7, c3 (full member) and c15 rising over it (z 0.10-0.20). The band is
c15's edge fading in over the fade: off c15 is no member (master's stub); at fl 0.14 ramp 0.27 at z 0.104, ink
0.71; at 1.2 ramp 0.94-0.98, ink 0.02-0.06 (no line where c15 lies over c3). Not fixed: a softer band (default)
or none (1.2, at the risk of a missing contact line) is a look for Levi. Outline draws a crisp-started dark
gradient there.

**Probe-only alternative, not in src:** the fade starting at `|z| = zt` (0.1 amp), env `K1438_Z0=1`
(`k1438_ev.ts`). Scan tie+ramp: zt 457 / 12988, ztfl0 203 / 7736; but ztfl0's all-finds are 2523 (new 2431):
its hard step draws a straight cut across the dive shadow (`crop_zt_def64.png`, `crop_zt_worse.png`), which
the test files as rthin:plain on 5 sites. zt at the default fl thins the shadow to a faint line
(`sheet_zt_1.png`, `sheet_zt_2.png`: m | new | zt | zt0 | ol).

**For K1439 (GLSL mirror; files not mine):**
- `gf_glsl.ts` 871 `member(int c, float s, vec4 KB)`: add `float z`; in the arm loop read
  `F(KAB+2*i+1).y` (aHome) beside `.x` (group), take `0 <= d <= aHome` as a home candidate (best d); at the
  end the ramp rule above with a new `uFade` uniform (`Z = uFade * amp / win`, fl 0 a hard step).
- Call sites 1368 (SPLITK), 1467, 1488: pass `pz[j]`.
- `gf_keys.ts:76`: `dHi = max(L, aHome) + mD` when homeOn, or the bins miss home candidates past aL.
- zc (309/316, 1497): fewer pixels ramp at the default fl (def 8.8 -> 4.3%, muse_hash 10.8 -> 4.4%), so P1 gets
  fewer; at fl 1.2 more (12.1%, 18.0%). MAXR 2 holds: no pixel over it on def or muse_hash at 0.14 or 1.2;
  nr>=2 reaches 1.5% of muse_hash at 1.2.
- Cost: +35% member calls and +39% segments per active pixel on muse_hash, ~1% on def; time it on the Pixel.
