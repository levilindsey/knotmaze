# K1436 stage 3: the screen scan on all twelve scenes, and the bar run end to end (Claude agent stage, probes only)

Stage 2 (`docs/design/K1436_s2_gpu_scan.md`: read Handoff K1436 s2 whole, and the last section of
`.claude/rules/render-gpu-field.md`) built the screen scan (`.claude/probes/K1436/k1436_screen.mjs`,
`k1436_screen_scan.ts`) and `k1436_bar.ps1`, and got one scene through (ring, gfh=1: 921 finds down to 3)
before its captures died to cold-load GPU kills. That is fixed (K1468, fc520c2d: gf's programs write one
packed target): a cold load stays up with the watchdog on. What a cold load still costs is 85-180 s to gf's
first composite, and a profile is warm only for the exact links it has loaded.

The point of this stage: Levi judges the screen ("I still see plenty of border artifacts", 2026-11-17), and
the junction lane needs a work list of what the screen shows, largest first.

## Do

1. Warm one profile per build with every link the run will load (wait for gf's composites to rise on each),
   then capture the 12 scenes at DSF 3, `gfh=1` and flag off, three at a time. Build the table: mirror v2
   beside screen v2, per class, with the run time.
2. **The work list.** The twenty largest screen finds on origin/master at `gfh=1`, and the twenty largest
   with the flag off, each on a 4x crop sheet (today | gf), each named by what it is (stub, wedge, dash,
   smear, notch, tick, colour seam, false find) and by its site (scene, crossing or junction id, world
   position). Look at every tile yourself. This list is the stage's main product.
3. K1460's link (`out/s2/jobs_k1460.json`) on origin/master and on c5fc87d1: the scan flags the kink-loop
   tick and the dotted line across the faded under thread on c5fc87d1 and not on master.
4. Run `k1436_bar.ps1` end to end: PASS for origin/master against itself on two runs; FAIL for 17053a36
   (K1451 stage 2's tip) against a3a9a6b4 at `gfh=1`, naming the new finds near crossing x68 and junctions
   j50 and j36.
5. Precision on master: 40 screen finds sampled across classes, at least 85% real and no class under 70%;
   vdip:ramp and rstray each at least 80% real on 10 sampled finds.
6. Residuals, as time allows: mask markers from the fabric renderer's marker positions (write them into
   meta.json) instead of by colour; vdip:ramp's false finds beside white; a spots mode for the def seam
   notches.

## Done

Items 1-5 hold, with sheets under `.claude/probes/K1436/out/s3/`, "How to run" at the top of
`k1436_bar.ps1` matching what you ran, and a paragraph for `.claude/rules/render-gpu-field.md` in your
handoff (the coordinator files it). A partial result lands: items 1 and 2 alone are worth merging.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `.claude/probes/K1436/` only. Nothing under `src/` or `test/`.
- **Memory and disk.** ONE Chrome profile directory per build and at most two preview builds at a time,
  under `$env:TEMP\k1436s3-*`, deleted when you stop. At most three scenes in parallel. Before each build or
  batch of Chromes read `Get-CimInstance Win32_OperatingSystem` and wait (one blocking loop, 10 minutes at
  most) while `FreeVirtualMemory` is under 3 GB. Scan dumps stay under your worktree and are deleted once
  tabulated. Stop to report if `(Get-PSDrive C).Free` is under 5 GB.
- Do not take `$env:TEMP\claude-perf.lock`; while another owner holds it, run one Chrome at a time.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5600-5619. Headed, real-time Chrome, never `--virtual-time-budget`.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files and sheets, not for dumps).
  Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work (captures, scans, sheets), with this stop rule.
- Own the technique.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1436 s3` here, commit, and report: what holds, the sheets' paths, the table, the work
list, a `Ledger items` list and K1436's handle fields.

### Handoff K1436 s3

Stopped at the 2 h cap (2026-11-17, 19:08 to about 21:05), on cc1ee890 (origin/master then). Items 1 and 2
hold. Item 5 is measured and FAILS. Items 3 and 4 are partial. Everything is under
`.claude/probes/K1436/out/s3/`. The captures, scan dumps and mirror dumps are deleted; the table holds their
counts.

- **Item 1, the table (holds, with one gap):** `out/s3/table.md` lists mirror v2 beside screen v2, by
  kind:class, by scene, with timings.
  - At gfh=1: mirror found 108, screen found 62.
  - At gfh=0: mirror found 1164 (dstray:tie 710, rstray:tie 284), screen found 77.
  - The screen scan takes 11-34 s a scene. The mirror takes 4-37 s.
  - A capture load takes 15-270 s: gf's cold compile, plus the machine load at the time.
  - The gap: g41_def_tw64 at gfh=1 never captured. Each try hung past the 900 s load cap and lost its
    WebGL context, three tries.
  - On master, h0 and h1 give the same screen finds in every scene captured both ways.
- **Item 2, the work list (holds; every tile viewed):**
  - Sheets: `out/s3/sheets/worklist_h1_{1..4}.png` and `worklist_h0_{1..4}.png`. Each row is today fill |
    gf fill || today border | gf border, 4x.
  - Tile tables: the `.tsv` beside each sheet set.
  - Named list: `out/s3/worklist_named.tsv` gives the site, class and what it is, for each tile.
  - Real faults, largest first:
    - ring x68 / g41_ring_tw64 j24 (19.4, 20.0): border **stub**. The under thread's stroke tapers and
      stops past the crossing.
    - g41_ring_tw64 x67: **stub**.
    - muse_default_tw j64 and muse_hash j64 (5.6, 2.8): fill **smear**, a stray dark line across the
      section.
    - muse_hash j81: **wedge** and a stray arc.
    - g41_def_tw64 j148: **smear** and a dotted line of three specks (h0 only; there is no h1 capture).
    - g41_def_tw64 j24: **dash**.
    - g41_def_tw42 j132: **wedge and dash**.
    - g41_ring_tw42 j8: **notch**.
    - lightpaper j29: **wedge**.
    - lightpaper j7: **dash and notch**.
    - muse_hash j144: **tick**.
    - lightpaper j27: **smear**.
    - g41_def_tw42 j89: **notch and dash**.
    - lightpaper j23: **notch and dash**.
  - False finds: g41_user_tw64 j22 and x100, and g41_ring_tw64 x6. In each, gf is clean and only today has
    an artifact there.
  - Shared with today: g41_user_tw64 x116 and j50.
  - g41_user_tw42 lands on lightpaper's frozen state, so its finds duplicate lightpaper's.
- **Item 3 (not done):**
  - c5fc87d1 was built at `$env:TEMP\k1436s3-prev\c5fc87d1` and served.
  - k1460_fl0's cold load (NOWD=1) hung past the 480 s cap and lost its context.
  - I stopped it at 20:38, because free memory had fallen to 2.8 GB and the time was nearly out.
  - The master half was not run either.
- **Item 4 (partial):**
  - The bar's control `-Ref cc1ee890 -Base cc1ee890 -Scenes ring,def -Port 5603 -Par 2 -Tag self1 -Keep`
    ran its base pass: mirror 24 s, warm 117 s, captures 270 s, screen scans 30 s, mirror scans 32 s.
  - Its ref pass then sat behind another owner's perf lock (Muse, 20:29) until the lock went stale. The bar
    now logs that wait.
  - The ref pass ran warm 14 s, captures 80 s, scans 26 s.
  - **Verdict: PASS (new 0, grown 0, gone 0).** But ring's two loads of one build froze on different
    physics hashes: base 50dd4ffd, ref 0a0ee15e. So "a mismatch is deterministic, keep it" is FALSE.
  - The bar should run STRICT=1, retrying until the hash matches the K868 diag, and should fail a pair
    whose hashes differ.
  - Self-run 2 was not run.
  - The 17053a36-against-a3a9a6b4 FAIL run was not run. It needs two more cold builds, about 25 min with
    the warm passes.
  - Fixed this stage: `-Scenes ring,def` through `pwsh -File` arrived as one string, so the bar looked for
    `ring,def.json`. The bar now splits it.
- **Item 5, precision (FAILS):**
  - `prec_rand40_{1..5}.png` (seed 7, h1 and h0): 30 of 40 real, **75%**.
  - By class:
    - cut:plain: 14/18 (78%)
    - cut:ramp: 8/11 (73%)
    - speck: 7/7
    - rstray: 1/2
    - **vdip:plain: 0/2**
  - `prec_rstray_{1,2}.png` (all 9 rstray on master, 6 sites): 6/9 = 67% real.
    - j74 and j115 are V-wedges where today has a round end, so they are uncertain. Counted real, the
      figure is 8/9.
    - j46 is false.
  - vdip:ramp has **no screen finds** on master, so there is nothing to sample.
  - The false-find patterns:
    - 4-5 px cuts at crossings with nothing visible (lightpaper x133, g41_user_tw64 j0 / x69). A minimum
      area of about 8 px would drop them.
    - vdip:plain at g41_ring_tw42 x27.
    - Large cuts where gf is clean and today differs (j22, x100, x6). The scan reads gf's taper and
      today's ragged end as a cut. Comparing against today's capture, or a stroke-style allowance, would
      drop these.
    - V-shaped junction gap ends read as rstray:tie (j46).
- **Item 6:**
  - Done: the marker mask from meta.markers (k1436_screen_scan.ts, MKR=4 radii, plus the head's glow).
  - Not done: vdip:ramp near white, and a spots mode for def's seam notches.

**Next.**
1. Raise the screen scan's precision: a minimum find area; drop a cut where gf's coverage matches
   today's within the stroke style; tighten vdip:plain at crossings. Then re-sample 40 against the
   same sheets. The captures can be rebuilt with `k1436_screen.mjs` from the s3 jobs.
2. Read self1's verdict, and run `-Tag self2`.
3. Run the 17053a36-against-a3a9a6b4 FAIL run.
4. Run item 3 on a quiet machine (c5fc87d1 is pre-fc520c2d, so use NOWD and a warm pass first).
5. Capture g41_def_tw64 at h1 alone.
6. Hand the work list to the gf owners. The stubs (x68 / j24 / x67) and the fill smears (j64, j148, j27)
   are the biggest.

**For `.claude/rules/render-gpu-field.md`.**
K1436 s3 (2026-11-17), THE SCREEN SCAN ON MASTER:
- What the scan reads. `k1436_screen.mjs` captures a K868 frozen state at DSF 3, in fill and border looks,
  under rp=gf. It also captures today's renderer (job.today) for the same state, so a crop sheet shows
  today | gf at one device pixel. `k1436_screen_scan.ts` finds cut / speck / rstray / vdip and labels each
  by class and site.
- h0 and h1 agree. On master, gfh=1 and gfh=0 give the same screen finds in every scene captured both
  ways. The mirror's 10x larger h0 count (dstray:tie, rstray:tie) does not reach the screen.
- Precision is 75% (40 sampled, cc1ee890). It drops to 0% on vdip:plain. Read a find on its today | gf
  tile before acting on it. The false classes are:
  - 4-5 px cuts at crossings;
  - cuts where gf's taper differs from today's ragged end (gf's border look is meant to differ);
  - V junction ends read as rstray:tie.
- The scan masks the markers and the head's glow from `meta.markers`, which is
  `__knotFabricRenderer().markers`, by world position and scale.
- Loads hang under load. Cold gf loads took 85-270 s, and some hung past 15 min with a lost context
  (g41_def_tw64). Cap each load (JOBMS) and retry. Close only the hung page: closing every page kills the
  parallel loads. Builds before fc520c2d also need `--disable-gpu-watchdog`.
- The frozen state is NOT always one state per build. In the bar's control, ring froze on 50dd4ffd in one
  load and on 0a0ee15e in the next.
- g41_user_tw42 froze on user_tw42.lightpaper's state, so its finds duplicate lightpaper's.
- The capture keeps a hash mismatch unless STRICT=1. A bar comparison needs STRICT=1, plus equal hashes
  across the pair.
- The bar's control PASSED once, on def and ring. The known-FAIL pair has not been run.
