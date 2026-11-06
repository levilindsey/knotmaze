# K1209: the layer-vote retirement re-applied on today's master (Muse batch 22, Run I)

Ledger: K1209. Chain tag 22I; ports 5890-5899. One Muse run in the main checkout on master;
it commits and pushes like batch 22's other runs.

## Why

Run C (22C, 2d68f787) retired the fillet layer vote and the top fan layer in its working tree,
measured it and did not push it: its brief made any changed pixel a stop, and two shots at one
junction changed (fat11 ji104 drag3: f20 23 px, f28 14 px, in the crop's rightmost columns at a
fan boundary). Claude viewed those crops: the base draws a stair-step edge between two colours
there and the retired fan runs smooth. That removes an edge inside a junction, which is what
Levi asked for on 2026-11-05 ("These junctions need to appear as though they are one whole fused
seamless unit", K1211), so the change is accepted.

Run C's tree is saved as `.claude/probes/K1186/wip22c.patch` (against Run B's 0af054cc). None of
the patch's files has changed on master since (`git apply --check --3way` passes on 215e6286), so
this run lands the retirement on today's master as Run C made it. K1211's stages (Claude agents
on their own branches) also edit `joinery.ts` and the junction field; they rebase onto this
run's commit afterwards, so nothing of theirs is in master yet.

## Read first

- Batch 22's "How to work" (`docs/design/K1208_muse_batch22.md`, and the pages it sends you
  to) and its Run C section, whole: the retirement's write set, its tasks and why each piece
  goes.
- `docs/ledger_notes.md`, `## K1209 (2026-11-05, Run C reviewed)`: Run C's numbers and the
  accepted change.
- `.claude/probes/K1186/batch22c.txt` (Run C's commands) and the header of `ab22c.mjs`.

## Tasks

1. **Apply.** On master (say its sha in the report), `git apply --3way
   .claude/probes/K1186/wip22c.patch`. It should apply cleanly. If master moved under it, keep
   master's code and retire the vote under it as Run C's section says: every disc, wedge and
   strip on the one bottom fan mesh, the root's five children kept (slot 3 an empty
   `Container`), `gapNearOf` kept. If master added anything that picks the top mesh or reads
   `layerFor`, `filletTopMesh` or the vote, move it to the bottom mesh and name it in the
   commit. Write set: Run C's, plus those lines.
2. **Pins.** `npm test` green, with `test/render/vote_override.test.ts` deleted. A pin may move
   only where fans overlap: re-freeze each one that moves and name it in the commit. A pin
   moving anywhere else is a stop.
3. **Same pixels.** Build master as the base (`scripts/preview.ps1 -Ref <sha> -Root
   $env:TEMP\knotmaze-previews -BuildOnly`) and the applied tree, serve them on 5890 and 5891,
   and run `ab22c.mjs` as batch22c.txt does, into `out22i/`, under the perf lock through
   `run_locked.ps1 -Batch` (another owner may hold the lock: wait inside that one command).
   Expected: every control pair 0 px, and every stand 0 px but fat11 ji104 drag3 at the frames
   Run C named (about 23 and 14 px, inside that junction's crop at the fan boundary). Any other
   changed pixel is a stop: crop it, name the stand, and do not push.
4. **Record.** `batch22i.txt` beside batch22c.txt (the commands and the numbers per stand),
   added with `git add -f` with `out22i/`'s log; large outputs stay untracked.

## Done and close

Done when tasks 1 to 4 hold, `npm test` is green, and the deploy run after the push is green.

Commit message: `K1209: retire the fillet layer vote and its top fan layer (Muse batch 22 Run
I, 22I)`, naming the base sha, the accepted ji104 change and every moved pin (or none). Pull
with rebase and autostash, then push to master. Leave the ledger to Claude: it closes K1209 and
updates K1208 after its review.

If the patch needs more than the conflict lines resolved by the rule in task 1 (for example, if
master's code now depends on two fan layers), stop after the analysis and report what it would take,
without pushing.

## Report

Plain words: the base sha; how the patch applied (each conflict and how it was resolved); the
pins; the stands' numbers; the commit SHAs; anything left over as `Ledger
items`.
