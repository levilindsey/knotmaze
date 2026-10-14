# Levi's notes, 2026-10-13

Levi wrote these overnight and sent them at 09:04 PDT on 2026-10-13
("Please make sure these are recorded, and follow-up with them as
relevant"). They are verbatim below, except one note on the repo's
visibility, which is LEDGER K117.

## Where each note went

| Note | Ledger | Work |
|---|---|---|
| Other game mode ideas | K114, Waiting on Levi | a round-2 part of `docs/design/K80_gameplay_additions.md` |
| Cursive text, embedded shapes | K115, Next (decided 14:32) | `docs/design/K115_cursive_text.md` |
| Alternate pluck instruments, accompaniment | K116, Next (decided 14:39) | `docs/design/K116_instruments.md` |
| Repo visibility | K117, Waiting on Levi | |
| Native mobile apps, eventually | K118, Ideas | |
| i18n, at the end | K119, Ideas | |
| Faster input: held arrow keys, phone quick controls | K120, Next | |

## What the research items were asked for

- **K114** adds the notes to the K80 doc verbatim and explores each idea:
  how it plays; its fit with the medium (the threads are the paths,
  moves happen at branch points, the daily, fog of war, plucks and
  audio, phones first); pros and cons; its cost in this codebase; its
  overlaps with the doc's sections 2-4. Then generalizations (cutting
  as a verb, real time as a mode parameter, the auto-solver inversion,
  the rhythm mode), new ideas, a ranked shortlist and the decisions for
  Levi. Section 0's nine pending decisions stay as they are.
- **K115** covers what text must survive in our medium (relaxation,
  over/under alternation, planarity, the walk graph, the K87 plan pin,
  K108's engine-exact math); where stroke data comes from and how it
  scales across scripts (single-line fonts, skeletonized outline fonts,
  stroke-order datasets, handwriting synthesis, hand-authored glyphs;
  Latin joins, Arabic, Devanagari, CJK, Hangul; shaping, bidi,
  licensing); strokes to threads (joins, pen lifts, crossings vs
  junctions, lattice snapping, relaxation, legibility on phones);
  embedding (reserved cells, shoving the lattice aside, lent crossing
  segments, joining the ends, color, walkability); the standalone
  fallback; predefined shapes; alternatives, a recommendation and a
  staged plan.
- **K116** describes today's voice (`src/audio/knot_synth.ts`,
  `pitch_space.ts`, `songs.ts`) and sizes three options: (a) more
  Karplus-Strong timbres, (b) other voice families or samples, (c)
  accompaniment (where parts come from, a lookahead scheduler, a mix
  that keeps the pluck on top, Music mode, the K80 doc's section 3
  rhythm options, phone CPU and latency, the audio gate). Then a first
  step.

## The notes (verbatim)

Other game mode ideas:
- Real-time enemy movement would also be a great mode and/or a parameter for modes.
- A spider enemy might be good, since it conceptually fits with the webs of threads.
- A mode where threads burn away steadily and you have to race to the end ahead of them.
- You can delete segments somehow. Then you want to end up with a single unbranched thread from start to end.
- Or you can cut threads to avoid monsters.
- Or you somehow get more points for choosing longer segments, which can feel satisfying to slide through. Cutting threads could contribute to getting to a long segment. Or not.
- Maybe plucking could cut threads, and you have a goal to pluck a particular melody, and segments are color-coded to music notes, but then you still want to leave a path through the maze. Ooooh, this could potentially be extended to something a bit more involved, like a Guitar Hero UI (or just a side-scrolling custom lined music staff) with pluck note colors corresponding to segments, and then we also have a procedurally generated sidescrolling chunk of maze threads that is built to correspond to the music notes; then, their is an AI auto-progressing the maze navigation, but the player gets to pluck segments in time with the music, but needs to carefully and quickly choose which segments are safe to pluck while still letting the AI player proceed through the maze.
- The maze is being auto solved, and you are trying to stop it or show it or guide it indirectly in a particular way by adding obstacles or cutting segments.
- Again, include these with the other gameplay exploration notes, and please explore some possible gameplay modes/mechanics/concepts and pros/cons, and give me a list of ideas and descriptions.

Cursive text:
- I'd love to also explore algorithms to generate thread patterns to trace out cursive text. It would be really cool if we could embed specific text within a maze. Maybe by preallocating corresponding cells, or maybe by taking some cells and shoving a bit in some places. Idk. We'd need to make sure the cursive letters connect and that start and end of the overall text connects to the surrounding maze. We'd probably also want to color the text cohesively. Not sure whether we'd want to allow intersections/junctions/crossings with other threads in the middle of the cursive text threads or not--probably this would be guided by which junction/crossing locations would better-convey the text-strokes in a clear way.
- Junctions vs crossings would need to be considered and which looks better for the given character. We could have outside threads provide crossing segments, but we'd need to them make sure to connect those segments with the surrounding maze as well.
- If embedding text within a maze is impractical, I'd at least like to be able to generate cursive thread shapes in isolation, and then still trigger progress across them. This could be a fun interactive welcome, or intro, or credits, etc.
- Also, we'd need to be able to procedurally handle arbitrary text, and internationalization and other alphabets as well.
- Please research how the algorithmic design of this might work, tradeoff considerations, alternatives, and whether this can scale well to other language characters.
- We could also use the same sort of idea to embed predefined shapes within a maze, like stars, or wreaths, or other shapes.

How hard would it be to add alternate instruments for plucks? Also, or might be nice to encode some background additional accompaniment instrument parts, to enrich the music. The main pluck instrument would still be made more prominent.

*(A note on the repo's visibility is recorded as LEDGER K117.)*

I probably want to make native mobile apps eventually; but that's not something we should worry about until iterating and finishing everything else. Mobile-supported web app is great for now, and will probably still be something I want even with native apps.

I definitely want to add i18n support. There shouldn't be _too_ much text in here. I'm going to want an llm to automatically handle translations and other i18n support for me. But that's also something we don't need to implement until the end. Just record a note for now.

We should definitely add support for a faster smoother input control, like pressing/holding arrow keys to auto progress along the next corresponding branch when arriving at the next intersection. Maybe there could be some sort of quick control input support for mobile too, like screen-region buttons?

## Decisions (09:35 and 09:55 PDT)

Levi's answers to the items waiting on him, verbatim below. A message
on the repo's visibility and license is recorded as LEDGER K117 (the
GitHub link is gone and the code is all rights reserved, a756ca5).

| Item | Decision | Ledger |
|---|---|---|
| K49 | keep 2.6 | Done |
| K52 | keep vellum | Done |
| K94 | the wheel still zooms | Done |
| K110 | join every piece to the start | Next |
| K104 | a fixed whole-segment vibration under the local lobes; a rounder collapse | Next |
| K100 | the fog resets on a restart, not on a backtrack | Next |
| K92 | undo/redo beside the panel button; the badge below; the indicator call stands | Next |
| K111 | reduced motion covers the flow; pulse highlight modes; an Accessibility group | Next |
| K98 | glyphs kept; a dot-diameter slider; icons fit their discs; colored end dots; minotaur and spider glyphs | Next |
| K76 | an end-look dropdown, default beacon | Waiting on Levi (five calls) |
| K93 | asked what the calls mean | Waiting on Levi |
| K78 | public, Markdown, later a devlog post | Next |

### The answers (verbatim)

K76 end markers: Let's have a dropdown to select which treatment is used. Default to beacon. Options include: fade, halo, glow, dots, fray, beacon

K98: I like all your icons. THe defaults are good. The icons should be scaled down to fit within the current position dot. Let's also add a new slider that scales the position dot diameter, relative to the thread width, from 0.25 to 3. The default diameter should match the preexisting current-position dot diameter. I want the start/finish/minotaur/other in-game icons to match the size of the player/current-position icon. Also, it's good that there is a black dot behind the white icon. This dot is actually what should match the width-diameter ratio slider. The icon should be scaled accordingly to fit within the dot, with a slight margin. I still want colored dots at the start and end, and with the default diameter showing some of the colored dot around the icon dot. Idk what you mean by "the head disc covering the starts of the arms". Please also generate simple minotaur and spider icons.

K49: 2.6.

K52: vellum.

K92: Ooh, good point. Let's add undo/redo buttons above the settings panel, next to the close/open button. I guess the daily-vs-replay-vs-custom notificaton would then go below this row. Then we'll need to maintain an undo stack. And handle auto-toggling enablement/visibility for the undo/redo buttons. The undo/redo buttons would only be visible when the settings panel is open. The fog finish indiactor tap decision sgtm.

K93: I'm not sure what you mean about the trail fade and the hover/pulseReach. Elaborate.

K100: The fog should reset when the maze restarts. But the fog shouldn't reset if we just backtrack to the start.

K104: Hmm, the pluck is still not good, in general. The main problem is that it's way to subtle. Even maxing pluckSize to 3, I can't tell when some segments are plucked. Can we modify this to include a set-amount of whole-segment vibration effect? I do like the spatial locality emphasis too though, but this should build on the rest. And, as to the requested problem, the sharp kink collapse is better, but still a bit too acute.

K110: Yeah, we should join pieces as needed to ensure everything is reachable.

K111: Not the intro animation or the current-position-adjacent-segment-highlight-pulses, but it should cover the maze undulations. We could add an alternate highlight modes for current-position-adjacent-segment-highlight-pulses, along with a dropdown to change them. This could probably also help for high-contrast accessibility. Maybe there could also be some high-level checkboxes for setting high-contrast mode and reduced-motion mode, which then override all other relevant settings. Maybe these would go in an accessibility group near the top.

K94: Yes, the mouse wheel still zooms.

K78: Public. Markdown is fine--eventually this will likely also be published as a post on my Blogger devlog at devlog.levi.dev.

## Afternoon answers (verbatim)

Levi sent three more messages on the afternoon of 2026-10-13.

### 13:17

Is traversal speed a slider? It should be.

I've reviewed the K74 doc. Here are my notes:
- In general, with our good-maze-design mechanisms, I'd love to parameterize most of them, so it's easy to later adjust things like difficulty and flavor/feel.
- "**Recommended first step.**" these sgtm.
- "Decisions for Levi":
  - 1. Yes. Any worthwhile control params here too?
  - 2. All of these sound good. Can we implement each, and have parameters to control which is used and/or to what degree?
  - 3. Yes and yes.
  - 4. H1. But let's also have a slider to control what ratio of Hs are affected.
  - 5. Yes. Let's have the length and density be sliders.
  - 6. This doesn't seem that expensive to run at load, right?
  - 7. Sure, if this is a good thing to do. Is it another place a control param would be good?

And, in general, we can ignore keeping support for previous url params, or preserving mazes from previous control combinations. Breaking changes are 100% fine. We are not launched. We are still iterating a LOT.

### 13:30

K93: Trail fade, yes; Hover vs pulseReach, hover should stop at pulseReach (and fade-out toward the end, same as pulseReach)

"The head disc covering the starts of the arms" This is fine as-is.

"K76: do the design doc's recommendations stand for the other five calls?" Yes. #2, should they be separate options from a single dropdown?

Copyright should name "Snoring Cat LLC.", which is a legal entity.

K127, look call: Your recommendation seems right.

K114: I still need to read the doc.

K116: Let's proceed and add these to the queue--probably a lower priority than almost everything else atm. Breaking changes are fine.

K115: I still need to read the doc.

### About 13:40

Network: I've been running RDP to this machine occasionally throughout the day (to and from separate machines on the same network). I bet that's a factor.

"1. Pace: your rule says full speed until about 90%, which would be tonight. Should I keep going, or slow down to stretch the week?" Keep going.

"2. K129 blocks K79 B's merge, because these become link defaults that can't change later:" I don't care about breaking changes at this stage. For color defaults, sure. For vellum scale, whatever is best.

Filed (2026-10-13): K74 (four stages) and K127 to In progress; K76, K93
and K116 to Next; K121 dropped, K129 done and K86 folded into K74; the
no-back-compat policy in CLAUDE.md and K132; the copyright in 7a63ec4
(K117). Traversal speed was already a slider (`moveSpeed`, Maze folder).

## Later answers (verbatim)

Levi's messages from later in the afternoon of 2026-10-13.

### About 14:31 (K80)

Reviewed the K80 doc:
- Minotaur: telegraphing sounds good. I think we should have a toggle control to flip whether the minotaur moves in realtime in turn-aligned. With the former, they should have a wander pace and a separate approach pace, and there should be randomization to pauses at junctions and maybe to the paces too. And with the former, we should probably judge detection-start and detection-end distances based on actual distance along threads to the player, rather than on number of segments. Distances and speeds should also be params. No undo after being caught, even in free play.
- 1. I like the movement model variants.
- 2. Yes. A param for this is good though.
- 3. Ooh, yeah, I like counting captures.
- 4. No undo.
- 5. Good point. Only needed when in the synced-turns mode.
- 6. Absolutely.
- 7. Let's not worry yet.
- 8. Sounds good. I do want to be able to play with alternate modes.
- 9. sgtm
- I love all of the design mechasims explored in section 4! I'd love to prototype all of these and have controls to toggle them. lmk which would be more expensive, and we can discuss what actually makes sense for those ones. One type of sleeper could also be an enemy that appears at a junction a turn or two after you leave it and then follows you, with some variance.

### About 14:32 (K115)

K115 cursive doc notes:
- Recommendation steps look good.
- Decisions:
  - 1. pinned makes sense.
  - 2. Junction+spur makes the most sense. I'd like the spur to be travelable as a dead-end.
  - 3. Yeah, that makes sense.
  - 4. sgtm. But is this a _cursive_ font? This thread-text scheme is meant to work as a continuous thread in a cursive word.
  - 5. One token.
  - 6. sgtm.

### About 14:39 (K116, and licenses)

K116: I read the doc: Notes: "**Your decisions:**": 1. "first step above" yes. 2. Your proposal is good. 3. Let's default to on at first. 4. sgtm. 5. Yeah, let's defer this. 6. sgtm.

Also, in general, across all of our work in this project, are there acknowledgements or licences we need to reference anywhere, and where should those references be?

Filed (2026-10-13): K80 and K115 to Next with their calls, K116's calls
on its item, K80 section 4's cheap mechanisms in K137 and its costlier
ones in K138 (waiting on Levi), and the licenses answer in K122.

### About 15:10 (a new mode)

Another possible gameplay mode: You cannot backtrack, segments collapse behind you; try to collapse as much of the level as possible while still reaching the finish line. Or, alternatively, without reaching the finish line

Filed (2026-10-13): K139 in Next, after K137's 4.3.

### About 15:30 (K80, K115, licenses)

K80: Let's defer those M-L or L items. Let's do all the M items. Also, I really want the real-time prototype. Maybe it's not a modifier of another gameplay mode, but rather a dedicated mode itself. Do implement it.

K115: What's the difference between hand-made joins and a generated connector? I want to support capitals.

We can assume that text reads at phone zoom. You don't need to test that.

"Their MIT, ISC and BSD licenses require their notice with every copy, and the site currently ships none." Research how other apps handle this, and put-together a system for including this in whichever way is most appropriate. Linking from the credit line sgtm.

Filed (2026-10-13): K80's real-time chase as its own mode, first in the
next free code slot; K138 now holds the M mechanisms (in Next) and K141
the deferred M-L and L ones (Ideas); K115 without stage 1a and with
capitals (a generated connector first, hand-made joins where needed;
the difference answered in session); K122 in progress
(`docs/design/K122.md`).

### About 15:35 (confetti)

I want a gratuitous confetti effect rainy down from the top of the screen when you finish the maze. And I want some smaller confetti effect spraying out from aruond the finish spot.

Filed (2026-10-13): K140 in Next, after K80's real-time mode.

### About 15:40 (accounts, later)

I guess we should also plan to add, after everything else, the option for folks to login via some oauth provider, and have their stats persisted cross-device that way. Then we should also add a checkbox for opting into sharing their stats (but maybe only if logged in). Then we'll need to add some simple backend services to support this persistence in a scalable and efficient way. For opted-in folks, we'd probably want to collect and surface averages and percentile bands for various metrics across various levels, to let folks compare their performance. We'd also maybe need to consider some sort of (cheap) anti-cheat checks (maybe just silently flagging potential cheating accounts, and not including them in aggregate stats). Again, all of this is stretch goal material to do much later, after everything else

Filed (2026-10-13): K144, last in Next.

### About 16:00 (a hover glow)

Let's give a little on-hover highlight over any segment that is hovered, not just adjacent-to-current-junction ones. This highlight shouldn't happen on adjacent-to-current-junction segments. This highlight should be more subtle that the adjacent-to-current-junction highlight, but it can maybe borrow the same length parameter. For this, I'm envisioning a long glow along either side of the thread, but that doesn't extend past the bounds of the thread, and this glow would fade-out quickly toward the center of the thread, and this glow would fade-out at a distance from the hover position.

Filed (2026-10-13): K145 in Next, with K93 after K81 merges.
