# Levi's notes, 2026-10-21

Levi sent these to the coordinator session on 2026-10-21 as notes to
follow up on. They are verbatim below. For the paper look and the notes
after it, Levi said where they go: "I'd like to add these to the "sooner"
list, but after all other current "sooner" items." They are the last rows
of `docs/design/sooner_20261020.md`.

## Where each note went

| Note | Ledger | Work |
|---|---|---|
| The string burns with its thread | K796, Next | none yet |
| Paper look: paper background, fill / border / both, gap 0, textures | K797, Next | one param per stage; sooner list |
| An intro that draws one border at a time | K798, Next | after K797's border look |
| The traveled path's width ratio and texture | K799, Next | after K794 (walked gold) |
| Looks set by the link, and a button to turn them off | K800, Next | for tailored dailies (with K46's themes, K531's per-day overrides) |
| Beats inside a run: a toggle, and beat indicators | K795 (the toggle, built), K806 (its default), K804, Approved | the toggle merges with K795; the indicators once there is budget |
| Dot-eater mode | K805, Approved | after the paper look, once there is budget |

## The string and the burn race

> Note to follow-up on: in pathDisplay string mode with burn race, the
> string should burn away with the underlying thread

## The paper look and what follows it

> Notes to follow-up on:
>
> I'd like to add these to the "sooner" list, but after all other current
> "sooner" items.
>
> I'd like to support a new aesthetic mode. This should look like white
> paper in the background (probably can do with some configuration of our
> vellum backgonud). This should then not draw fill colors for the
> threads. Instead, this should draw only a border edge along either side
> of the threads. We don't show any gaps in this mode. Instead, it's clear
> which threads cross over vs under vs join at junctions, based on the
> edge strokes. I'd especially love it if we could draw the edge/border
> strokes with a bit of texture so it resembles pencil graphite strokes
> (unless that's too non-performant). I think we can add each of these
> bits incrementally, with discrete new params (paper background mode, a
> new fill-vs-border-vs-both look, reducing the gap param to zero, adding
> params for choosing a texture (or solid) for rendering fills and
> borders. Then, I'd like to add a new intro animation mode: this mode
> should draw one edge/border at a time.  There are a few different ways
> that would be interesting to sequence this separate border draws--explore
> a couple, and probably give some options in a dropdown param. I'd also
> like to add support for another param for how the path-traveled is
> rendered: this param will determine the width ratio of the path-traveled
> annotation relative to the width of the thread (0 is hidden, 1 is the
> current treatment with the color filling the thread). I'd also like to
> add another dropdown param for choosing a texture for the fill for the
> path-traveled annotaiton (again, unless rendering it with this texture
> would be to much of a perf impact). Then, we could use these params to
> make it look like we're tracing through the traveled path with a colored
> pencil, or crayon, or highlighter.
>
> I'd ALSO like to add support for specifying the
> aesthetic/local/non-maze-altering params in the url, and for forcing
> these to override the normal local preferences set by the player. When
> this is done, we should then show a button in the top right area for
> allowing the player to disable the aesthetic overrides from the current
> maze.
>
> This would then give us the ability to provide highly tailored
> experiences for dailies.

## Beats inside a run, and a dot-eater mode

Levi sent this after hearing how the beat rider times runs. Levi's next
message deferred it: "...that packman and beat stuff should be tracked
as follow-up work to do once we have more budget" (its start is not
kept). The one-beat-per-run toggle was already being built in K795, so
it stays there (default one beat per run; K806 asks which default). The
indicators are K804 and the mode is K805.

> Or, are you saying that in the current implementation, each segment is assigned a discrete number of beats, so at each junction arrival, the player dot is beat aligned, even though the segment itself may have taken more than one beat? If that's the case, we should do something to indicate where beats line-up within multi-beat segments. And I'd like a param for toggling this multi-beat-per-segment treatment vs the one-beat-per-segment treatment. Also, I want some visual indicator for when and where beats happen, and I want options and a dropdown param for this. One option should be to show a pulse around the player location/along the thread and/or the thread pluck vibration centered on the current position. One option might be a less-blurred ring pulse ring emanating from the player marker on the beats. We could also consider having small docs (almost like pacmac) along the threads and junctions, with the dots lined-up to where beats occur during travel. We could then animate these individual dots away with a pulse ring effect.
>
> That actually makes me think of a whole new game mode we should record to implement as a follow-up after the paper mode work. A pacman mode (but we should name it something descriptive and not copyright infringing, like dot-eater). In this mode, you get points for eating more dots. And there are enemies wandering around (we could do ghosts, but in an effort to not infringe on pacman, it might be nice to think of some other thematically interesting enemy shape). The enemies cause you to travel back to the start and we record the hit, but the dots stay consumed, and we erase any traversal annotations. There should be bigger dots spread around, which toggle the who-eats-who mode, so the player can then chase the enemies and eat them for extra points. Enemies should start at some new entry point, with its own marker--like the start or finish points, but a third point. We'll need a param for controlling where this is, like the others. And we'll need an icon for this. Also, we need to prevent the player from travelling up the last segment to this marker. We should support the toggle between realtime vs turn-synced movement modes for this mode. Also, the player speed should increase when they're in the mode of chasing the enemies after eating a big dot.