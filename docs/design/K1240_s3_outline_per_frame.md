# K1240 S3: the outline per frame, cheap

Ledger: K1240. Claude sent this run: one Muse run, started through Paseo from this committed brief,
which is the authority. Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1240-s1`
(reused, detached at this brief's commit, `node_modules` junctioned; never `npm ci`). Ports 5980-5989.
Cap 2 h.

## Why S3

S2 (36db0fb9, the Handoff in `docs/design/K1240_s2_structural_outline.md`) builds the outline from
the scene's features, and it matches form B:
- ours-to-B p99 is 0.000 px on 10 of 12 scenes;
- B-to-ours p99 is 0.10-0.16 px;
- on its nine def sheets, Claude's overlay finds the outline on form B's border everywhere except two
  specks at j34.

But one build takes 74-2,945 ms (def 396 ms) against a frame budget of 3 ms. Each build re-decides
the structure: per-segment covering against other chains, eye searches (def 4,750 eye border cuts,
fat 34,836), and a 32-step corner growth. Levi's rule: the structure is defined once, and only
positions follow the frame.

## Goal

Split `outline.ts` into two steps. Keep the table format.
- **`structure(scene)`** runs once per scene and may be slow. It decides:
  - which pieces exist, and which border each cut joins;
  - which pieces are buried;
  - each corner's arms, and sharp or round;
  - each feature's window, as s ranges on its chains.
- **`frame(structure, scene)`** runs every frame and computes positions only.
  - Each cut, tangent point and corner arc comes from that frame's centrelines, inside the
    feature's window.
  - Use a closed form, or a bounded solve started from the frame's own data (K1040 F2: Newton from
    V, bisection to 1/64 px).
  - No state from an earlier frame, and no stepped walk.
  - `frame` never tests a border segment against other chains.
- **Eyes:** a bounded number of cuts per eye. Find why S2 makes thousands, and fix it.

## Done

1. **Same output.** On all 12 scenes, `frame(structure(S), S)` reproduces S2's outline: piece
   endpoints within 1e-6 world units, and the same pieces.
   - The exact check is no worse than S2's table on any scene.
   - S2's synthetic tests pass through the split.
2. **Moving frames.** Perturb each scene's centrelines by a smooth field at amplitudes 0.1h and 0.5h,
   giving S'. Compare `frame(structure(S), S')` with a fresh `structure(S')` then `frame`.
   - Report the largest piece-endpoint difference, and how many pieces exist in one but not the
     other.
   - Run the exact check on S' for def and ring, at 0.1h.
3. **Cheap.** Under the lock, report `frame`'s median and p95 per scene; target def's median at most
   3 ms. Also report `structure`'s time, and a per-phase profile of `frame` on def: offsets, crossing
   cuts, eyes, corners, caps, regions.
4. **The page tests** score no worse than S2's counts.
5. **A Handoff** appended to this brief: the numbers, what failed, and the commands.

## How to work

- Commit finished, tested parts and push them to master yourself: `git fetch`, rebase on
  origin/master, `npm test` green, then push `HEAD:master`. Stage files by name. Never force-push,
  skip hooks, or add anything under `out/`. Outputs go to `.claude/probes/K1240/out/s3/`.
- Write `outline.ts` through Node or the editor, never through PowerShell text IO.
- Browser and timing jobs: under the perf lock (`$env:TEMP\claude-perf.lock`, owner `K1240-S3`),
  waiting inside one blocking command. At most two headed, real-time browsers. Kill every browser,
  dev server and runner of yours, and release the lock, before you stop.
- Ledger follow-ups go through `node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs add --repo . ...`.
  Leave K1240's handle alone; Claude keeps it.
- No subagents.
- Stop when Done holds or at 2 h, whichever comes first. A stage that fails is still not done
  early: keep fixing until Done holds or the 2 h are up.
- Run `Get-Date` at the start and at each milestone. When you stop, commit your WIP, append the
  Handoff with the real start and stop times, push, and report.
