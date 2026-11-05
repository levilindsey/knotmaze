You are a Claude Code agent working in a git worktree of knotmaze (C:\Users\lsl\Repositories\knotmaze), a web celtic-knot maze (TypeScript, PixiJS v8, custom WebGL shaders). Your item is K1139: light pulses that travel along the maze's threads and through its junction fans. Junction work is the project owner's top priority, so the look has to be right, not just the numbers.

## Where you start

Stage S4 (pulses on loops and cycles) stopped at its 2-hour cap. Its commits are on branch `worktree-agent-a023a39925efe4816` (tip 0aaa0dee, based on 25ce2321). Its brief and Handoff: `docs/design/K1139_s4_cycles.md` (read the Handoff from "### What landed" to the end: "Open defect, S4b", "Cost", "Sheets", "Probe gotcha"). S4's probes are tracked on that branch under `.claude/probes/K1139/` (`*_cyc.mjs`, `out/s4cyc/`, `k307/`, `run_locked.ps1`, `vite.private-cache.config.ts`).

First steps, in your worktree:
1. `Get-Date` and note your start time.
2. `git reset --hard worktree-agent-a023a39925efe4816`. Do not rebase onto master: the coordinator rebases at merge.
3. If `node_modules` is missing: `New-Item -ItemType Junction -Path node_modules -Target C:\Users\lsl\Repositories\knotmaze\node_modules`.
4. Save this whole brief as `docs/design/K1139_s4b_ridge_fade.md` and commit it.

## Stage S4b: one stage, the band ridge fade

The defect (S4's Handoff, observed on the cyc stand): on cyc e210, node_218's fan band draws the arm's crest one-ended, with no ridge fade, so about 0.57 world into e210 (the fan's reach) there is a brightness step: band luma about 209-235, the ribbon one sample on 178-181 (unlit 173-175). e210's ridge is 0.68 world from node_218, so the ribbon's ridge fade zone overlaps the band; there the ribbon's ridge factor is about 0.22 and the band's is 1.

Do:
1. The fix (S4's sketch, verify it against the code before trusting it): pack gR = (dA + dB + W) / 2 into a free band slot (R2.w or R3.w, 0 = no ridge); in the band loop multiply the child-side crest (dG > distJ) by the same ridge factor the ribbon applies (PULSE_RIDGE_FADE 0.5; S4 wrote it as min(1, 2 |dG - gR|), check that it matches the ribbon's formula exactly). The parent arm is a tree arm, always one-ended. Add the CPU twin, and a unit test that pins band = ribbon at the band's reach on a two-ended child arm.
2. Extend the CPU table (`table_cyc.mjs`, its P1 check) to compare band against ribbon over the fan's whole extent, not only at the junction point. It must flag S4's step at e210 / node_218 on S4's code and pass on yours (show both).
3. The near-ridge joint case (inferred in S4's Handoff, not observed): when xR < 0.5, a two-ended arm's own ridge factor is under 1 at its joint, which would be a step against the one-ended parent. Find or build a stand where it happens, measure it, fix it if it is a step, or record why it is not.
4. The rare case dB + span < dA, which reads as lit from B at d = 0: measure it the same way; fix it or record why it is harmless.
5. Write the probe gotcha into `dump_cyc.mjs`'s header: on a Vite dev server a `?t=` reload makes dumpPulses import a second, empty module (every arm reads world 0); dump from a `vite preview` build.
6. Re-run `ab_cyc.mjs` (locality: 0 px change outside the touched arms on all 8 stands) and `sheets_cyc.mjs`. Sheets: S4 (0aaa0dee) above S4b at the same moments (add base 25ce2321 as a third row if the script makes that cheap). Crop the cyc e210 seam at 3x or more with System.Drawing and look at it yourself; the kymograph rows must show no step at the band's reach. Do the same for loop e102 (S4's improvement there must survive).
7. Cost: report the characters added to the junction-field program (40,097 before) and to the total shader text (budget 59,050). If the junction-field program grew, cold-compile it with K307's `k307/trace_intro.mjs` (2 runs each, b306333f vs yours); it must stay inside base's spread (6.52-6.75 s; b306333f measured 6.84 and 6.54 s).
8. `npm test` green (S4: 2870 passed, 9 skipped), including the byte-identity goldens.

## Rules

- Ports 5620-5639 only. S4 used `npx vite --config .claude/probes/K1139/vite.private-cache.config.ts --port 5620` for the dev server, and for builds `scripts/preview.ps1 -Ref <sha> -Root $env:TEMP\knotmaze-previews\k1139s4b -BuildOnly`, then `npx vite preview --outDir <dir> --port 5630` (5631 for a second build). Stop every server you started before you finish.
- GPU batches: `& .claude/probes/K1139/run_locked.ps1 -Batch <relative name>` (an absolute path silently runs nothing). It takes the machine-wide perf lock `$env:TEMP\claude-perf.lock`; another owner (a Muse run) may hold it, so wait inside one blocking command, never by checking back later.
- Never use Chrome's `--virtual-time-budget` for anything physics-dependent.
- PowerShell for every command; never Set-Location in a way that leaves your worktree. Read code through the shell (`Select-String`, ranges of `Get-Content`); use the Read tool only just before an Edit.
- Commit WIP at every milestone, broken or not (`git add -f` for files under `.claude/probes`). Never push. Never edit LEDGER.md. Never touch the main checkout at C:\Users\lsl\Repositories\knotmaze: a Muse run is working there.
- If you use helpers for mechanical work (scans, screenshots), give them `model: sonnet` and this stop rule.
- Stop rule: stop when S4b is done or 2 hours after your start time (`Get-Date` at the start and at each milestone), whichever comes first. Then commit WIP, append a `## Handoff` to `docs/design/K1139_s4b_ridge_fade.md` (what landed, numbers, what is open, the next step) and report. A compaction or a large context is not a stop: after a compaction, re-read this brief and `git log`.

## Report

End with: the commits; the numbers (the table before and after, locality, shader characters, compile times if run, test counts); which crops you looked at and what they showed; a `Ledger items` list of anything open or proposed; and the item's handle fields (owner, branch, last commit, evidence, next, brief, env).

Agent start: 2026-11-04 20:33:12 -08:00 (stop by 22:33).
