# Levi's notes, 2026-10-21

Levi sent these to the coordinator session on 2026-10-21 as notes to
follow up on. They are verbatim below. For the paper look and the notes
after it, he said where they go: "I'd like to add these to the "sooner"
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
