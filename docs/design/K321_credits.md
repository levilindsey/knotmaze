# K321: the credits page

One small stage, Sonnet, with a one-hour cap. It renames the build's
licenses page to Credits and puts the people first.

## Levi's words (2026-10-14, verbatim)

At 21:47:

> In the credits section, we can also reference Claude Code.

> We should also list me in the credits.

The coordinator's proposal that evening: "Created by Levi Lindsey",
"Built with Claude Code (Anthropic)" and "(c) 2026 Snoring Cat LLC. All
rights reserved." at the top; the page and the panel's link renamed to
Credits (`credits.html`); the license texts kept under an "Open-source
licenses" heading.

His answer, at about 22:40:

> I set up the LLC. I assign this IP to Snoring Cat.
>
> Claude Code credit: sgtm. A link is good though, like with the other credits.
>
> Renaming to credits: This all sgtm.
>
> We don't need to put the "Built with Claude Code" bit that prominently at the top. It can be lower than the most important header info. It should also go below the icon/art and music credits that I'll add at some point.

And to "Credits: OK to build it as proposed?":

> Proceed, with my above notes.

`LICENSE` already names Snoring Cat LLC as the copyright holder, so it
stays as it is.

## What is there today

- `notices/page.ts` renders the page: the title "Credits and licenses",
  one line ("Knotmaze is made by Snoring Cat..."), then the jump links,
  `Credits` (the CREDITS entries in `notices/credits.ts`: borrowed
  techniques, the tune, and the notices a license makes us ship),
  "Open-source software" (the bundled packages), "Research and
  techniques" (RESEARCH) and the build line.
- `notices/vite_plugin.ts` names the file (`NOTICES_FILE =
  "licenses.html"`), emits it, serves the dev placeholder and adds the
  one-line banner to every chunk.
- The panel's credit line links to it: `src/ui/tweakpane_panel.ts`
  (about lines 257-279, the `kp-licenses` link reading "Licenses").
- A comment in `src/util/det_math.ts` (line 27) names `licenses.html`.
- Tests: `test/notices/notices.test.ts`. Lore: `.claude/rules/notices.md`
  (it attaches by itself when you read these files; follow its wording
  rules).

## The stage

1. **Rename.** The file becomes `credits.html`: `NOTICES_FILE`, the dev
   placeholder, the chunk banner, the panel's link (text "Credits", its
   title and class), the `det_math.ts` comment, the tests and the lore.
   Add no redirect from the old name; the game hasn't launched, and
   breaking changes are fine.
2. **The page's order.** The page title becomes "Credits · Knotmaze" and
   the heading "Credits". Then, top to bottom:
   1. **The header:** "Created by Levi Lindsey", and "© 2026 Snoring Cat
      LLC. All rights reserved.", with "Snoring Cat" still linking to
      https://snoringcat.games.
   2. **Art and icons**, then **Music and sound:** the sections Levi
      will fill. Hold their entries in `notices/credits.ts` (a kind on
      each entry, or a list per section; your choice), and render a
      section only while it has entries. If an existing CREDITS entry is
      really art or music (the tune, perhaps), move it there and say so
      in the report.
   3. **"Built with Claude Code (Anthropic)"**, with "Claude Code"
      linking to https://claude.com/claude-code the way the other
      credits link. Check that the URL resolves. It stays below the art
      and music sections once Levi adds his.
   4. The rest as today: the techniques and notices, the bundled
      packages under the heading "Open-source licenses", "Research and
      techniques", and the build line.
   The jump links follow the new sections.
3. **Tests** in `test/notices/notices.test.ts`:
   - the file name;
   - the header lines come first;
   - the Claude Code line has its link and sits below the art and music
     sections (use a fixture with entries in both);
   - an empty section is not rendered.
4. **Lore:** update `.claude/rules/notices.md` (WHAT SHIPS and URLS).

## Verification

- `npm test` and `npm run build` green, with the test count.
- Screenshots of the built page at 1400x900 and 411x753, in light and
  dark color schemes, in `.claude/probes/K321/` (a production build
  served by `vite preview`; the dev server shows only a placeholder).
- The panel's link opens the page from a production build.

## Setup

- **Your branch starts from master.** Run `git log -1 --oneline` first;
  if this file is missing, run `git merge --ff-only origin/master`.
- **`node_modules`:** link it to the main checkout's with a junction
  (`New-Item -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`). Before removing
  anything that contains it, run `(Get-Item node_modules).Delete()`: a
  recursive delete or `git worktree remove --force` follows the junction
  and empties the main checkout's packages.
- **Servers:** ports 5870-5879. Give your vite server a private cacheDir
  (see `probes.md`). Leave port 5173 alone: it is Levi's.
- **Chrome:** any instance you launch gets its own `--user-data-dir` in
  your probes folder. Delete it when you are done (K161).
- **Files:** probes and notes go in `.claude/probes/K321/` (untracked;
  the coordinator copies them at the merge).
- **The phone is off-limits.**

## Process

- **One stage.**
  - Run `Get-Date` at the start and at each milestone.
  - Commit WIP on your branch at every milestone, and never push.
  - Don't edit `LEDGER.md`.
- **The stop.** Stop when items 1-4 are done and verified, or at your
  cap, whichever comes first. The cap is one hour on Sonnet.
  - Neither a compaction nor context size is a stop. After a compaction,
    re-read this brief and `git log`, then go on.
  - At the stop, commit WIP, append a "Stage 1 handoff" section to this
    file, commit it and report.
- **The final report covers:**
  - what changed and where;
  - the screenshots;
  - the test count;
  - a `Ledger items` list;
  - the handle fields: branch, last commit, evidence and next.
