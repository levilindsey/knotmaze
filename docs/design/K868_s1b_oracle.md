# K868 S1b: the CPU oracle, checks and contact sheets (agent brief)

Stage S1b of K868. The design is `docs/design/K868_field_border.md`; all of
§3 is the spec you implement, and §5-§7 say what the oracle, the checks
and the sheets are. The scene format is `src/render/field/scene.ts`. This
is one stage: stop when it is done or at the cap.

## Setup

- Worktree `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k868-s1b`,
  branch `k868-s1b`. Your shell starts in the MAIN checkout, which must
  stay clean: use absolute paths and `git -C <worktree>`. node_modules is
  a junction to the main checkout's.
- Code: `src/render/field/` holds the geometry core, pure TypeScript (no
  DOM, no pixi, nothing the app imports). Tests go in `test/render/field/`;
  synthetic scenes go in `test/render/field/scenes/` as JSON fixtures, with
  their generator beside them.
- The oracle and the sheets run from a skip-gated manual vitest
  (`K868=1 npx vitest run test/render/field/oracle.manual.test.ts`, the
  pattern of `test/sweep.manual.test.ts`) or from `npx vite-node <script>`.
  Outputs go to the main checkout's
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K868\` (`oracle/`,
  `sheets/`; ignored by git).
- PNG: no image library is installed, and you add no dependencies. Write a
  small encoder on `node:zlib` (deflateSync plus CRC32). Compose captioned
  sheets as HTML rendered by puppeteer-core (Chrome found as
  `scripts/diag_screenshot.mjs` finds it; headless is fine for static
  pages; use a temp profile and delete it after) or by blitting.
- Real scenes come from S1a, which runs in parallel and writes to
  `.claude/probes/K868/scenes/` in the main checkout. The coordinator
  tells you when they are ready; don't wait for them.
- Never run `npm run build` in the main checkout (a test server serves its
  `dist`). Never touch processes you did not start.

## Order (commit after each)

1. The geometry core, the oracle and the synthetic scenes; sheet A with
   raw renders.
   - Core (`src/render/field/`): polyline arc length and closest point;
     local minima within reach; z lookup; union-find groups with junction
     spans (§3.4); corner eligibility, V and the G1 rolling ball on curved
     polylines (§3.7); the END extension to c′ (§3.6); caps.
   - Oracle: per pixel, supersampled: candidates, groups, the top group,
     the exact distance to its exposed outline (§3.5, §5), ink or paper;
     and the float32 distance and top-id fields.
   - Synthetic scenes (§4) at h = 1 world unit, W = 0.38h, and a camera
     that puts h near 10 CSS px at 1x, so 6x crops show line structure.
2. Checks 1-9 and 11 (§6) as code with their thresholds, run on every
   synthetic scene, with results in a JSON and markdown report and in
   sheet A's captions. Cross-check the oracle's field against a Euclidean
   distance transform of the rasterised union. Unit tests for the core.
3. Real scenes, once S1a's exports exist: oracle renders of `muse_hash`
   (full frame) and of its j123, j49 and tip crops at their exported
   cameras; sheet B (master next to the oracle) and the full frames. Run
   the image-based checks on master's screenshots too, so master's
   defects become numbers.
4. Sheet C: the r sweep {0, 0.25h, 0.5h, h, 2h} and the web-length cap
   (§3.7). And §3.8: what master draws for `cr` and `crs`
   (`src/render/ribbon/joinery.ts`, `corner_share.ts`, G3G4 §3.5), with a
   proposed mapping from cr to r.

If the real scenes are not there when you reach step 3, do step 4 first.

## Decisions you make and record

σ (§3.4), the span margin, ε, the supersampling, how a corner's opening
θ is measured on curved arms, the crop sizes, and anything in §3 you found
underspecified or wrong. Write them in the Handoff with the reason.

## Rules

- Stop rule: run `Get-Date` at the start and at every milestone. Stop
  when steps 1-4 are done or 2 h after the start, whichever comes first.
  A compaction is not a stop: after one, re-read this brief and
  `git -C <worktree> log --oneline -10` before going on.
- Commit WIP to `k868-s1b` at every milestone, broken or not, and never
  push. Commit messages end with the two trailer lines below. Take SHAs
  from `git rev-parse HEAD` (a hook re-dates work-hours commits).
- If `src/render/field/scene.ts` needs a field, append it as optional at
  the end of its interface, with a comment.
- Never edit LEDGER.md, CLAUDE.md or `.claude/rules/`; never upload to
  Drive; add no npm dependencies.
- Helpers only if needed: `model: sonnet`, a 1 h cap and these rules.
- When you stop, append a `## Handoff` section to this brief in the
  worktree and commit it: done, not done, the decisions above, the next
  step. Your final report carries the same, plus each sheet's path and
  what it shows, a `Ledger items` list (follow-ups, residuals, decisions
  for Levi) and the handle fields (branch, last commit, evidence, next).

Trailer:

    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01TnQvxftruF6gxzRe3bigQ6
