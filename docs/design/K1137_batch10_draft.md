# Muse batch 10 (draft, from K1137 Run D)

Claude starts these runs through Paseo, one run at a time, after batch
9 (`docs/design/K1137_muse_batch9.md`) has been reviewed and closed.
Each run is a fresh Muse agent that reads this brief, does its run's
tasks, and stops. Claude reviews each run on master afterwards and
closes batch 10's item. This draft has ONE run: of the 69 items in
`LEDGER.md`'s Next, in order, only K1138 fits this batch (see "Left
out on purpose" at the end). Claude reviews the draft, opens batch
10's item, fills its ID in below and renames this file.

Every task here is decided by a unit test, a desktop probe or a
measurement table. None needs the phone or Levi. The one run changes
backdrop profiles and backdrop shader text only: no physics, no
junctions, no cursive, and no thread ribbons' shader text.

## How to work

Batch 8's "How to work" applies unchanged: read it in
`docs/design/K1131_muse_batch8.md` (its ten rules and the paragraphs
after them, which send you on to `docs/design/K1050_muse_week.md`)
before anything else. Read batch 10's item wherever it says K1131,
and K1137's rule 11 (a re-measurement copies the original stand's
link verbatim, read from the old probe's source) wherever a stand is
copied. Use ports 5550-5599 (batch 9 used 5500-5549; the run below
names its range).

After the run, update batch 10's handle:
`ledger.mjs handle <batch-10 item> --last-commit <sha8> --next "Run A done; batch 10 complete, Claude reviews and closes <batch-10 item>"`
(Claude fills the item ID in when opening batch 10).

## Run A · K1138: Levi's backdrop tuning (five of six clauses)

Read first: `.claude/rules/render-backgrounds.md`,
`.claude/rules/gameplay-panel.md` (BACKGROUND SPEED ROW),
`.claude/rules/probes.md`; then `BACKGROUND_PROFILES`,
`BACKGROUND_SPEED_MAX`, `effectiveSpeed` and `backgroundDrift` in
`src/render/background_model.ts`, `VELLUM_DRIFT`, `AURORA`,
`CONTOURS`, `PAPER`, `PAPER_SHAPED`, `SHAPED_BODIES` and
`effectFragment` in `src/render/background_shaders.ts`,
`BackgroundLayer.tick`, `configure` and `renderTexture` in
`src/render/background.ts`, the Backdrop speed and Backdrop
intensity rows in `src/ui/tweakpane_panel.ts`,
`sanitizeBackgroundSpeed` in `src/ui/url_state.ts`, the animation
speed and shader-source tests in `test/render/background_model.test.ts`
and `test/render/background_shaders.test.ts`, the background probe
hooks (`__knotBackground`, `__knotBackgroundLayer`,
`__knotSetBackground`) in `src/app/probe_hooks.ts`, and K79's speed
probe `.claude/probes/K79/k79b_speed8.mjs` (its stand link is task
1's stand). K160 is an Ideas item (the linear speed slider), not
part of this run.

The ledger says:

> **K1138** · Backdrop tuning, Levi 2026-11-03: "vellum background speed should be x10 / aurora background
> speed should be x2 / aurora background should stretch across the screen vertically more / contours
> background should animate the line shapes rather than just slide the whole thing linearly / paper intensity
> should be x4 / The background speed slider max should be x2" (asked: a 2x max, or 16x?). Pointers:
> `src/render/background_model.ts` (profiles), `background_shaders.ts`, the panel's Backdrop speed and
> intensity rows (`src/ui/tweakpane_panel.ts`); K160 is the slider curve. For Muse batch 10.

What is there today (read it, don't trust this summary). The drift
clock's speed is profile `drift` x `effectiveSpeed`
(`backgroundDrift`): vellum's profile is drift 1 with `autoSpeed` 0
(still at AUTO; only a set speed moves it, through `VELLUM_DRIFT`,
whose mottling offsets and vignette wander read the clock time),
aurora's is drift 1 with `autoSpeed` 1, contours' drift 0.3, and
paper's drift 1 with `autoSpeed` 0 (its programs ignore time: paper
does not move). `AURORA` hangs three curtains from hems at
0.34 + 0.2 per curtain plus a noise wobble, with a long fade on one
side of the hem (`exp(d * 3.4)`) and a sharp side (`exp(-d * 16.0)`);
its rays vary along height at `y * 0.45`. `CONTOURS` samples
`fbm(s + vec2(0.004 * t, 0.003 * t))`: the whole height field
translates, so the lines slide. `PAPER` and `PAPER_SHAPED` darken
the white sheet by `0.16 * I * clamp(tex, -1.0, 1.0)` (I is the
shared `backgroundIntensity`, clamped to [0, 1] in the layer), with
a 0.05 * I accent mix and a 0.10 * I vignette. Both aurora and
contours draw from one body each for their default and shaped
programs (`SHAPED_BODIES` reuses `AURORA` and `CONTOURS`), and
`background_shaders.test.ts` sha256-pins the aurora and contours
default programs (paper is not pinned there); the model test pins
the pre-K79 drift at AUTO for every effect and
`BACKGROUND_SPEED_MAX` at 8. That max is one constant feeding the
panel row's `max`, the link clamp and `effectiveSpeed`. Its last
clause is still Levi's open question (a 2x max, or 16x?), so this
run does not touch the max, the slider, its curve (K160) or any
clamp.

Tasks, in order (ports 5550-5559, perf lock, headed real-time Chrome):

1. The before stand, before any change. Copy K79's stand link
   verbatim from `k79b_speed8.mjs`'s source (its `BASE`,
   `7.J&am=instant&phy=0&fw=0&snd=none`, read there, not from this
   brief) into `.claude/probes/K1138/backdrop.mjs`; add only the
   backdrop keys each case needs (`bg=`, `bgi=`, `bgs=`), and name
   each addition in the table. Emulate
   `prefers-reduced-motion: no-preference` (this desktop's probe
   Chrome reports `reduce` over Remote Desktop, so backdrops may
   not drift here), pin the background layer's clock and re-render
   per `probes.md` (`__knotBackgroundLayer()`'s tick and clock,
   forced texture passes at set clock times), run a same-build
   control first, and take a throwaway first shot (K1130). Before
   table, all at pinned clock times on the one stand: the drift
   clock's time after 300 fixed ticks at set speeds 0, 1 and 2 for
   vellum and aurora; aurora's vertical extent (the share of image
   rows whose mean tint rises above the flat ink by a stated
   threshold, at three pinned times); contours' best
   cross-correlation shift and changed-pixel share between two
   pinned times; and paper's p2-p98 luma spread in a knot-free
   margin at intensity 0.5 and 1.
2. The speeds (pure). In `BACKGROUND_PROFILES`, vellum's `drift`
   1 -> 10 and aurora's 1 -> 2; nothing else in the profiles
   (no `autoSpeed`, scale or fps change: vellum stays still at
   AUTO, and the texture pass rate never scales with speed).
   Tests in `background_model.test.ts`: `backgroundDrift` at AUTO,
   0, 1 and 2 for both effects, and every other effect's drift
   unchanged. Aurora's AUTO pace doubles on purpose (Levi's x2,
   an in-place pre-launch change): update only aurora's entry in
   the test's pre-K79 table and say so in the commit; vellum's
   AUTO stays 0, so the default backdrop's frame does not move.
3. Aurora stretched vertically. In `AURORA` only (one body serves
   the default and shaped programs): double the curtains'
   vertical falloff lengths (`exp(d * 3.4)` -> `exp(d * 1.7)`,
   `exp(-d * 16.0)` -> `exp(-d * 8.0)`) and halve the rays'
   along-height frequency (`y * 0.45` -> `y * 0.225`); hems,
   folds, bands and tints unchanged. Do not re-pin aurora's
   hash yet: task 6 re-pins it after its A/B (the lore's rule).
4. Contours morph instead of slide. In `CONTOURS` only: replace
   the linear field offset with a bounded, oscillating domain
   warp whose offsets cannot grow with time:
   `vec2 e = vec2(sin(0.021 * t), cos(0.017 * t));`
   `vec2 warp = 0.55 * vec2(gnoise(s * 0.75 + e),`
   `gnoise(s * 0.75 + vec2(5.2, 1.3) - e));`
   `float h = fbm(s + warp, 5);`
   Tune only the warp's amplitude or rates, and only to pass
   Done's morph-not-slide rows (no net shift, real shape change,
   line contrast held); the line math below the height sample,
   the tint and the drift profile are unchanged. Do not re-pin
   contours' hash yet: task 6 re-pins it, as with aurora.
5. Paper intensity x4. In `PAPER` and `PAPER_SHAPED`, the sheet
   texture's coefficient 0.16 -> 0.64 (x4); the 0.05 accent mix,
   the 0.10 vignette, the shared intensity row and its [0, 1]
   range are unchanged (x4 lives in paper's own coefficient, not
   in the param every effect reads). No hash re-pin (paper is
   not pinned); the after stand's spread table is its check.
6. The after stand and the untouched pieces. Rerun task 1's
   probe on the fixed build (same additions, same pinned times,
   perf lock): the after table beside the before. A same-state
   A/B of the default design (vellum at AUTO, `&fw=0&phw=0`
   added, every clock pinned per `probes.md`, same-build control
   first) reads 0 px before and after the commit; only then
   re-pin the aurora and contours hashes in
   `background_shaders.test.ts`. Screenshots
   for aurora (pinned times), contours (two pinned times) and
   paper (intensity 0.5 and 1) go in
   `.claude/probes/K1138/shots/`. The slider's max is untouched:
   `BACKGROUND_SPEED_MAX` stays 8, and the row, `shownSpeed`,
   the link clamp and K160's linear slider read as before
   (the existing speed tests pass unchanged on this point).

Done:

- Speeds: the model tests read vellum 10x and aurora 2x at set
  speeds 1 and 2, AUTO unchanged for vellum (0) and doubled for
  aurora, every other effect's drift bit-identical.
- Aurora: the after extent exceeds the before at every pinned
  time (table in the commit); only aurora's hash moved.
- Contours: between the pinned times the changed-pixel share is
  stated and non-trivial, the best cross-correlation shift stays
  within one texel (morph, not slide), and the line contrast
  (margin luma spread) stays in the before table's band; only
  contours' hash moved.
- Paper: the margin spread at intensity 0.5 and 1 reads about
  4x the before table (state the measured ratio); no other
  effect's program or coefficient changed.
- The default design's same-state A/B reads 0 px; `npm test`
  passes; the shots exist.

Report: the before and after tables, the hash re-pins, and the
measured paper ratio.

Close nothing outright. K1138's sixth clause (the speed slider's
max) is still Levi's: when the five clauses above pass, move
K1138 to Waiting on Levi with its text replaced by this, as
written (plain words, no param or function names):
`ledger.mjs move K1138 --to "Waiting on Levi"`, then rewrite its
line in the same LEDGER commit to: "The backdrop speed slider
goes up to 8 times each backdrop's own pace. Should its top be
2 times, or 16 times? (Your other backdrop changes of 2026-11-03
are done: vellum faster, aurora faster and taller, contours
morphing, paper stronger.)"
If any Done row fails, keep K1138 in Next and record the stop in
its text instead.
Suggested ports: 5550-5559.

## Left out on purpose, for a later batch

Not for Muse, or not now (Next items in ledger order, each skipped
for the reason given; K1131's "Left out on purpose" list was checked
against today's ledger and code, and none of its items has since
become possible — K1138 and K1139 are new since that list, and
only K1138 fits):

- Junction work, as the brief's scope requires: K875 and K876
  (K868's oracle), K345 (rides the K868/K9 field), K9 (G4 on that
  field), K873, K935 and K941 (K922/K924 junctions), K943, K952,
  K953, K955 and K956 (K868/K940 junctions), and K1114 (S1g's
  at-rest crops: junction work, and a look for Claude and Levi).
- Cursive and text: K557 (after K115's redesign), K569, K582, K890
  (the K863 tracer's move), K912, K931 (once the lowercase
  settles), K937, K961, K948, K949, K1009, K990, K991, K1006,
  K997, K998, and K1112 (one join rule for every pair).
- The phone: K784 (sitting 6 on real touches), K10 (the
  benchmark), K365 (K279's phone round), K590 (the phone gap
  search), K919 (a phone ms saving), K1088 (Pixel frames a
  second), and K376 and K313 (a desktop half exists, but each
  ends on the phone or with Levi).
- Physics, the thread renderer's GPU performance and the lanes
  K1050 keeps off limits: K595 (physics: same-chain collision),
  K611 (the thread renderer's frame cost, across the K5 and G3
  lanes), K265 and K328 (the paint highlight and rim profile,
  with their shader pins), K690 (the glyph root's GPU census),
  and K326 (dropping knot mode: a K1050 off-limit and a golden
  retarget).
- Levi's look or decision before the work can start: K797 (the
  paper look's next stage), K409 (behind K623 and K624), K240
  (after K238's review), K46 (a proposal Levi iterates on; no
  `src/` change until agreed), K297 (which rows, after the
  churn), K340 (once Levi picks), K341 (after that iteration),
  K292 (a sheet for Levi first), K312 (held for approval), K543
  (when Levi wants the sheet), K649 (tuning by sheet), and K144
  (accounts: the backend is Levi's choice, and its next step is
  a design doc).
- A trigger that has not fired: K579 (pays only if K318 raises
  the counts), K531 (launch prep) and K533 (behind it, with
  accounts), K78 (once the churn settles), K116 (lowest
  priority, and a Pixel probe first), K318 (after K111 stage 5),
  and K786 (K138's stage 6).
- Not a desktop `npm test` task: K548 (the overnight runner's
  usage gate: coordinator and claude-config process, no game
  code), K887 (refreshing the open-work report: an external
  artifact and its stored picks, not a probe), and K709 (phone
  kit hardening: its untested half is a phone fault, and the
  rest edits untracked probes, so nothing to commit or test).
- Decided in part, too big for one run, or a planning stage of
  its own first: K688 (healing cuts with the minotaur or the
  fire: the heal count, the scissors' charges and the
  trapdoor's outcome are not decided, and the build crosses the
  controller, both minotaur clocks, the fire, the saved attempts
  and the renderer), and K1139 (choice pulses across junctions:
  a Claude Opus planning stage first, junction work, its look
  still to plan and picture — not a Muse run).
