# Levi's notes, 2026-10-13

Levi wrote these overnight and sent them at 09:04 PDT on 2026-10-13
("Please make sure these are recorded, and follow-up with them as
relevant"). They are verbatim below, except one note on the repo's
visibility, which is LEDGER K117.

## Where each note went

| Note | Ledger | Work |
|---|---|---|
| Other game mode ideas | K114, In progress | a round-2 part of `docs/design/K80_gameplay_additions.md` |
| Cursive text, embedded shapes | K115, In progress | `docs/design/K115_cursive_text.md` |
| Alternate pluck instruments, accompaniment | K116, In progress | `docs/design/K116_instruments.md` |
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
