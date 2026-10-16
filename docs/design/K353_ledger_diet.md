# K353: the ledger diet

Levi, 2026-10-14 23:43: "Ledger diet sgtm."

Why it's needed:
- `LEDGER.md` has grown to about 216 KB and 3,375 lines.
- Only 64 of its 248 open items keep to the convention's one to three
  lines (claude-config `rules/ledger.md`).
- The Done section alone is 59 KB.
- Keeping the file current took about 45% of the coordinating session's
  spend on 10-14.

One sonnet agent, 1 h cap, scripts and docs only. **You do not edit
`LEDGER.md`.** The ledger keeps changing while you work. The coordinator
applies your output to master at a quiet moment, and skips any item
changed since your snapshot, which is `LEDGER.md` at your branch's base
commit.

## Deliverables (commit each on your branch; never push)

1. **`scripts/ledger_diet.mjs`** (Node, no dependencies), with three
   commands:
   - **`list [file]`** prints every item as one JSON line:
     `{id, section, sha, lines, text}`.
     - An item starts at a line matching `^- \*\*K\d+\*\* ·`. It ends
       before the next such line, a blank line, or a `## ` heading.
     - `sha` is the sha1 of the item's text, with CRLF turned to LF and
       trailing whitespace trimmed.
     - Prose that isn't an item is never touched.
   - **`apply <map.jsonl> [--dry-run] [--file LEDGER.md]`** reads map
     lines `{id, sha, text}`:
     - It replaces an item only if its current sha equals `sha`, and
       lists the ones it skipped.
     - The original of each replaced open item is appended verbatim to
       `docs/ledger_notes.md`, under `## K<n>`. That file exists; keep
       its format.
     - Each Done item's original goes to `docs/ledger_done.md`, under
       `## K<n>`. Create that file with a short header like
       `ledger_notes.md`'s.
     - A Done item resolved before 2026-10-12 (judged by the last
       YYYY-MM-DD in the item), or with no date at all, leaves
       `LEDGER.md` entirely. The other Done items are replaced by their
       map line.
     - It keeps the file's CRLF endings and its blank-line layout: Done
       items are separated by blank lines, other sections' items are
       not.
     - It updates the header's "Next free ID: K<n>." to the highest ID
       in the three files, plus one.
   - **`verify <before-file>`** checks that:
     - every ID in `<before-file>` appears exactly once, in `LEDGER.md`
       or in `docs/ledger_done.md`;
     - every original item text in `<before-file>` appears verbatim in
       `LEDGER.md`, `docs/ledger_notes.md` or `docs/ledger_done.md`;
     - the headings and the non-item prose are unchanged.

   Test it on copies, never on the real files: apply your map to a copy
   of the snapshot, then verify.
2. **`docs/ledger_diet/map.jsonl`**: one line per item to shorten.
   - Which items:
     - every open item over three lines;
     - every Done item resolved 2026-10-12 or later, as a one-liner:
       `- **K<n>** · <what it was>. Done in <commit or range> (<date>).`
   - Rules for the new text:
     - The first line keeps its format (`- **K<n>** · `). Continuation
       lines are indented two spaces and wrapped near 72 columns, like
       the file.
     - Keep what the item is, its current state or blocker, any decision
       made, and its pointers (design doc, rules file, commit, probe
       path).
     - Drop verbatim quotes, history, measurements and rationale; the
       notes keep them. A few words of a quote may stay when the wording
       is the decision.
     - **Waiting on Levi:** keep each question answerable, with its
       recommendation. With more than two questions, point to the doc
       section that lists them.
     - **In progress:** one to three lines of description, then the
       handle fields (owner, branch + last commit, evidence, next,
       brief, and env when present), one line each.
     - Never change an ID, an item's section, or the order of items.
     - Work section by section, and commit the map after each section.
3. **A "Stage 1 handoff"** at the end of this brief, with:
   - the number of items rewritten, left as they were, and archived
     from Done;
   - the file's size after a dry-run apply;
   - any item you judged too risky to shorten (left as it was).

## Process

- **Stop rule:**
  - Run `Get-Date` at the start and at each milestone.
  - Stop when the work is done or at 1 h, whichever comes first.
  - A compaction is not a stop. After one, re-read this brief and
    `git log` before going on.
  - On stopping, commit, write the handoff, commit again, and report.
- **Final report:**
  - the commits;
  - the counts;
  - `Ledger items`: anything left over;
  - the handle fields: owner, branch + last commit, evidence, next,
    brief.

## Stage 1 handoff (2026-10-15, sonnet agent a18f9a57206d9475d)

Done and committed on `worktree-agent-a18f9a57206d9475d` (from d741412).
Nothing is pushed and nothing is applied: `LEDGER.md`,
`docs/ledger_notes.md` and `docs/ledger_done.md` are untouched. Every
test ran on copies (`.claude/probes/K353/`, untracked).

**What the branch holds**
- `scripts/ledger_diet.mjs` (no dependencies; its header is the manual):
  `list`, `apply` and `verify` as briefed, plus `pack` (builds the map
  from the editable sources) and `pointers` (lists the URLs and paths a
  map line dropped).
- `docs/ledger_diet/map.jsonl`: 249 lines. `docs/ledger_diet/src/` has
  the same text, one block per item, in eight files (`1_waiting`,
  `2_inprogress`, `3_next`, `4a_residuals`, `4b_residuals`,
  `5_approved_ideas`, `6a_done`, `6b_done`). Rebuild the map with
  `node scripts\ledger_diet.mjs pack <the eight files in that order>
  --snapshot <d741412's LEDGER.md> --out docs\ledger_diet\map.jsonl`
  (shas come from the snapshot; without `--snapshot` it reads
  `LEDGER.md` in the working directory).

**Counts** (348 items in the snapshot; a dry-run apply on a copy)

| Section | Items | Rewritten | Left as they were |
|---|---|---|---|
| Waiting on Levi | 20 | 20 | 0 |
| In progress | 11 | 11 | 0 |
| Next | 36 | 35 | 1 (K309) |
| Residuals | 118 | 70 | 48 |
| Approved | 4 | 1 (K322) | 3 |
| Ideas | 58 | 21 | 37 |
| Done | 101 | 91 one-liners | 0; 10 archived |

- Open items rewritten: 158 (119,603 -> 62,421 characters, 52%).
- Done items replaced by a one-liner: 91 (the format stays one physical
  line each, about 250 bytes).
- Left as they were: 89 open items. 66 were already within three lines;
  23 are over three lines (see below).
- Archived from Done (left `LEDGER.md` entirely): 10, namely K192, K40,
  K1, K31, K28, K25, K2, K18, K3 and K17. All 101 Done originals are in
  `docs/ledger_done.md`.

**Size after a dry-run apply on the snapshot**
- `LEDGER.md`: 208,605 -> 110,601 bytes (-47%), 3,202 -> 1,534 lines.
  By section: Waiting 4.5 KB, In progress 12.1 KB, Next 16.6 KB,
  Residuals 37.6 KB, Approved 0.7 KB, Ideas 13.3 KB, Done 22.9 KB.
- `docs/ledger_notes.md`: 18,198 -> 151,906 bytes (158 originals
  appended). `docs/ledger_done.md`: new, 62,753 bytes (101 entries).
  Neither is imported anywhere, so they cost nothing until opened.
- Against master at 1e7456c (dry run on a copy): 205,187 -> 110,495
  bytes; K279, K8 and K344 are skipped (changed since the snapshot),
  and Next free ID follows master's header (K358).

**Tested** (copies only): the real files are CRLF, and a CRLF ledger
and notes file give an all-CRLF result; an LF copy of master's ledger
applies cleanly too; `verify` ends `verify: ok`; a second `apply`
reports 249 already applied and changes no byte (it appends nothing
twice).

**To apply** (coordinator, on master, at a quiet moment with no agent
editing the ledger)
1. Merge the branch (it adds the script, `docs/ledger_diet/` and this
   brief).
2. `Copy-Item LEDGER.md $env:TEMP\LEDGER.before.md`
3. `node scripts\ledger_diet.mjs apply docs\ledger_diet\map.jsonl
   --dry-run`; read the counts and the SKIPPED lines.
4. `node scripts\ledger_diet.mjs apply docs\ledger_diet\map.jsonl`
5. `node scripts\ledger_diet.mjs verify $env:TEMP\LEDGER.before.md` must
   end `verify: ok`. Run it before any other ledger edit: it wants each
   original text of the before file in one of the three files.
6. Commit `LEDGER.md`, `docs/ledger_notes.md` and `docs/ledger_done.md`
   (a ledger-only push does not deploy); close K353 with that commit.
7. Later, delete `docs/ledger_diet/` (git history keeps map and sources).

An item is replaced only while its text still has the snapshot's sha.
For a skipped item, leave it long, or after its agent finishes edit its
block in `docs/ledger_diet/src/` and re-pack with `--snapshot
LEDGER.md` (the live ledger). The re-pack gives every block the sha of
the ledger as it is then, so first delete the blocks of any other item
that changed since: their old rewrite would overwrite the new text.
Items already applied just count as "already applied".

**Left as they were, or too risky to shorten**
- K227 (Ideas): three real lines, then a two-line prose pair ("Offers
  from 2026-10-10 ...") with no blank line, so the scanner sees five
  lines and a rewrite would swallow the prose. A blank line after K227
  fixes it (it is then within three lines). The script never touches
  prose.
- `- **K47 + K56** ·` and `- **K19 + K20** ·` (Done, 2026-10-12) name two
  IDs, so they are prose to the scanner: untouched, still long.
- 22 rewrites saved under 5% and were dropped from the map (K188, K15,
  K308, K213, K207, K196, K27, K255, K221, K305, K309, K285, K70, K113,
  K166, K157, K128, K346, K125, K112, K220, K205): they stay 4-8 lines.
- In progress: all 11 are rewritten but stay 14-23 lines, because each
  carries its six handle fields (live agent ids, caps, worktrees). Five
  items (K7, K76, K279, K344 and K8) are being edited by running agents;
  a dry run on master at 1e7456c already skips K279, K8 and K344.
- 152 open items other than In progress are still over three lines
  (49 at four lines, 33 at five, 27 at six, 21 at seven, 22 longer).
  They hold a pointer, a decision, or an (a)(b)(c) list whose parts are
  separate questions, so cutting more would drop a question. A second
  pass could take them to three lines; the Done one-liners could also
  go from about 250 to about 160 bytes.
- K192 has no date although it finished 2026-10-14; by the rule an
  undated Done item leaves the ledger, so it is archived with the old ones.

**Warnings `verify` prints (expected)**: 71 Done items follow each other
with no blank line (the layout is kept); 2 open items (K78 and K297, in
Next) are separated by a blank line; the Next free ID header is kept
when it is already above the highest ID plus one (K354 against a highest
K352 in the snapshot).

**Checks I made by hand**: the In progress handle fields (owner, branch,
evidence, next, brief) are all present; the Waiting questions are still
answerable and keep their recommendations; about 20 other items were
compared with their originals. What a rewrite dropped (worktree paths,
probe file names, commit ids, quotes) is in the originals appended to
`docs/ledger_notes.md` and `docs/ledger_done.md`.

## CC64 brief: the other repos' ledgers (2026-10-15, the coordinator)

Levi, 2026-10-14 23:58: "Do make sure we remember to do this for the
others though tomorrow". Only three other ledgers are big enough to
need it: claude-config `LEDGER.md` (28.5 KB, 454 lines), hopnbop
`LEDGER.md` (23.5 KB, 409 lines) and snoringcat-platform
(`C:\Users\lsl\Repositories\hopnbop\third_party\snoringcat-platform\LEDGER.md`,
15.9 KB, 277 lines). Their IDs are `CC<n>`, `H<n>` and `SP<n>`
(claude-config `LEDGERS.md`).

One sonnet agent, 1 h cap, on a knotmaze worktree branch. **You edit no
ledger and nothing in any repo but your branch's `scripts/ledger_diet.mjs`
and this doc.** The coordinator applies your maps to each repo.

1. **Generalize `scripts/ledger_diet.mjs`** (commit on your branch):
   - `--prefix <P>` (default `K`) for every ID pattern and every ID it
     writes (items, the `## <P><n>` headings, "Next free ID: <P><n>.");
   - `--cutoff YYYY-MM-DD` (default `2026-10-12`) for the Done archive;
   - a ledger with no "Next free ID" line keeps having none (a warning,
     as now);
   - knotmaze unchanged: `list` on knotmaze's `LEDGER.md` prints the same
     bytes before and after your change, and an apply of
     `docs/ledger_diet/map.jsonl` to a copy of the K353 snapshot
     (`git show 6c85a38^:LEDGER.md`) gives the same files as before.
2. **Per ledger**, in the main checkout's untracked
   `C:\Users\lsl\Repositories\knotmaze\.claude\probes\CC64\<cc|hopnbop|platform>\`:
   - `snapshot.md`, a copy of the ledger, and in `results.md` the repo's
     commit that holds it (`git -C <repo> log -1 --format=%h -- LEDGER.md`);
   - author the short texts by section 2's rules above (open items over
     three lines; Done one-liners; Done before the cutoff `2026-10-12`
     leaves), `pack` them into `map.jsonl`;
   - apply to a scratch copy (`work\LEDGER.md` with its own `work\docs\`,
     so nothing real is touched), then `verify` and `pointers`; keep
     their output (`verify.txt`, `pointers.txt`);
   - `results.md`: bytes and lines before and after, items rewritten,
     left, archived; any item too risky to shorten; warnings.
3. **A "CC64 handoff"** at the end of this doc: the counts per ledger,
   the exact `apply` command line for each, and anything left.

Process as above (stop rule: done or 1 h; commit at each milestone; never
push). The final report ends with `Ledger items` and the handle fields.

## CC64 handoff (2026-10-15, sonnet agent ad1cce843de69341e)

Done and committed on `worktree-agent-ad1cce843de69341e` (from 3d78f09).
Nothing is pushed and nothing is applied: no `LEDGER.md` and no
`docs/ledger_*.md` of claude-config, hopnbop or snoringcat-platform was
touched, and every run used copies. All output is in the main
checkout's untracked `.claude/probes/CC64/` (`identity/`, `cc/`,
`hopnbop/`, `platform/`). Each ledger's folder holds `snapshot.md`,
`map.jsonl`, `work/` (the scratch result), `apply.txt`, `verify.txt`,
`pointers.txt` and `results.md` (the counts below, the riskiest cuts and
the warnings, in full).

**The tool** (`056b7aa`, `ed7358a`). `scripts/ledger_diet.mjs` takes
`--prefix <P>` (default `K`) and `--cutoff YYYY-MM-DD` (default
`2026-10-12`) on every command. The prefix reaches every ID pattern and
every ID the tool writes (items, the `## <P><n>` headings, "Next free
ID"). A ledger with no "Next free ID" line keeps having none: a warning
only, and the tool counts the next ID from the highest present. With the
defaults the notes and done files get the K353 headers byte for byte;
another prefix or cutoff gets a generic header (wrapped at 76 columns).
`--date` still defaults to the local date.

Knotmaze is unchanged. `.claude/probes/CC64/identity/run_identity.mjs`
runs a script over the K353 snapshot (`6c85a38^`) in four variants (LF
and CRLF, with and without an existing notes file) through `list`,
`apply --dry-run`, `apply` and a second `apply`, `verify`, `pointers`
and `pack` of `docs/ledger_diet/src`; `compare_out.mjs` compares two
runs. The base script (3d78f09) against this branch's: 51 files,
identical byte for byte except `hashes.txt` (it hashes stdout captures
that print the output directory's name). Run again on the final script
at 09:35.

**Counts** (each snapshot is a byte copy of the live file, still equal
to it at 09:34; the commit that holds it is in each `results.md`)

| Ledger (snapshot held by) | Bytes | Lines | Items | Open rewritten | Done one-liners | Archived | Left as they were |
|---|---|---|---|---|---|---|---|
| claude-config, `CC` (`b509f63`) | 30,171 -> 13,045 | 473 -> 195 | 65 | 38 | 15 | 4 | 8 |
| hopnbop, `H` (`351e9784`) | 23,480 -> 16,125 | 409 -> 265 | 100 | 30 | 10 | 8 | 52 |
| platform, `SP` (`282ac35`) | 15,859 -> 11,216 | 277 -> 199 | 71 | 17 | 1 | 8 | 45 |

- Every rewritten open item is within three lines, and `verify` ends
  `verify: ok` on all three scratch results (each warns "no Next free ID
  line"; CC has 14 and H 7 Done items that follow each other with no
  blank line, as they did).
- Left as they were: every item already within three lines, plus CC64
  (the live In progress handle).
- `docs/ledger_notes.md` receives the verbatim originals of the
  rewritten open items (CC 22.5 KB in 38 entries, H 10.6 KB in 30, SP
  7.1 KB in 17) and `docs/ledger_done.md` the originals of every Done
  item the diet touches (CC 7.7 KB in 19, H 7.0 KB in 18, SP 2.9 KB in
  9).
- Archived (out of the ledger, in `docs/ledger_done.md` only): CC2, CC3,
  CC4, CC11; H1, H2, H12, H13, H25, H38, H67, H70; SP1, SP4, SP5, SP6,
  SP7, SP8, SP11, SP70.

**To apply**, one ledger at a time, from the knotmaze root with the tool
(after this branch is merged, or from its worktree), while no one is
editing that ledger. An item whose text changed since the snapshot keeps
its long text (the dry run prints the SKIPPED ones). Copy the ledger
first: `verify` wants every original text of the before file in one of
the three files, so run it before any other edit to the ledger.

```powershell
$P = 'C:\Users\lsl\Repositories\knotmaze\.claude\probes\CC64'

# claude-config (master)
$L = 'C:\Users\lsl\Repositories\claude-config\LEDGER.md'
Copy-Item $L $env:TEMP\CC.before.md
node scripts\ledger_diet.mjs apply $P\cc\map.jsonl --file $L --prefix CC --dry-run
node scripts\ledger_diet.mjs apply $P\cc\map.jsonl --file $L --prefix CC
node scripts\ledger_diet.mjs verify $env:TEMP\CC.before.md --file $L --prefix CC

# hopnbop (main)
$L = 'C:\Users\lsl\Repositories\hopnbop\LEDGER.md'
Copy-Item $L $env:TEMP\H.before.md
node scripts\ledger_diet.mjs apply $P\hopnbop\map.jsonl --file $L --prefix H --dry-run
node scripts\ledger_diet.mjs apply $P\hopnbop\map.jsonl --file $L --prefix H
node scripts\ledger_diet.mjs verify $env:TEMP\H.before.md --file $L --prefix H

# snoringcat-platform: a submodule, detached at 282ac35 today
$S = 'C:\Users\lsl\Repositories\hopnbop\third_party\snoringcat-platform'
git -C $S checkout main
git -C $S pull --ff-only
$L = "$S\LEDGER.md"
Copy-Item $L $env:TEMP\SP.before.md
node scripts\ledger_diet.mjs apply $P\platform\map.jsonl --file $L --prefix SP --dry-run
node scripts\ledger_diet.mjs apply $P\platform\map.jsonl --file $L --prefix SP
node scripts\ledger_diet.mjs verify $env:TEMP\SP.before.md --file $L --prefix SP
```

Commit each ledger with its two `docs/ledger_*.md` files and push at
once (ledgers merge with `merge=union`: pull before the apply, and after
the push look for an ID that now appears twice; the bottom copy is the
current one). claude-config lands on `master`, hopnbop on `main`, the
platform on its `main`; then bump hopnbop's submodule pointer to the new
platform commit (skill `bump-platform-submodule`). The three maps are
independent, so the order does not matter. The claude-config ledger is
edited live (the CC64 handle among others): an item edited since the
snapshot is skipped and stays long, which is safe.

**Needs a look before or while applying**
- Undated Done items leave the ledger by the tool's rule (the last
  `YYYY-MM-DD` in an item dates it; none means it leaves): H38, H67 and
  H70 (all fixed 2026-10-14) and SP70. H38's one open thread, the
  release-template check, is carried by the H72 rewrite. SP70's text
  ends "Runtime deploy still required (nakama-runtime workflow)" and H41
  says it ships "after SP70 and SP27": unless that deploy happened, file
  a Next item for it in the platform ledger, or first add a date to the
  live SP70 (an edited item is skipped by the map, so it keeps its text).
- None of the three ledgers has a "Next free ID" line, so "the highest
  ID ever used" now includes `docs/ledger_done.md`. The next IDs are
  CC66, H101 and SP72 today, and every archived ID is lower.
- Two stray lines, `  (Session 530145bc, ...)` after CC7 and
  `  (Session c56311ec-..., ...)` after CC12, are prose after a blank
  line, so the tool leaves them. They hold only a session id and a time
  (the notes file does not have them either): delete both by hand, or
  leave them.
- The riskiest cuts; the original is then only in
  `docs/ledger_notes.md`. CC40 (31 lines to 3: the laptop's Paseo setup
  state, the `supervisor.js` `windowsHide` patch, the user-only
  checklist; read its notes entry before picking the item up), CC39 (42
  to 3; it keeps the capture list that memory
  `feedback_desktop_network_restart.md` points at), CC65, CC21, CC59,
  CC45; H10 (9 to 3), H17, H62, H35; SP12 (9 to 3).
- `pointers.txt` per ledger lists what the new texts no longer name:
  12 of 53 map lines (CC), 19 of 40 (H), 11 of 18 (SP), mostly session
  and agent ids, a few commit ids and paths.

**Next**: merge this branch (the script change and this section), then
apply the three maps as above. The maps and snapshots stay in
`.claude/probes/CC64/` (untracked, main checkout) until the three
applies are committed.