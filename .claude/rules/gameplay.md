---
paths:
  - "src/game/**"
  - "src/ui/**"
  - "src/audio/**"
  - "src/main.ts"
  - "src/app/**"
  - "test/game/**"
  - "test/ui/**"
  - "test/audio/**"
---

# Gameplay, daily and UI lore

Binding lore for the game state, the daily maze, links, the panel,
the camera and gestures, and audio, moved verbatim from CLAUDE.md by
K45 (2026-10-12). The link format and codec versioning rules stay in
CLAUDE.md (Key Design Decisions). A passage taken from inside a longer
entry is labeled with its source; the narrative is in
`docs/history.md`. Daily probes and the probe tooling are in
`probes.md`. Add new gameplay and UI lore to its topic file (listed at
the end), not to CLAUDE.md.

## Where the rest of the gameplay lore lives

K173 (2026-10-14) moved each topic to a file that attaches only with the
files it is about; `docs/lore_index.md` lists every rules file and its paths.
- `gameplay-daily.md`: the daily maze and stats (binding)
- `gameplay-stars.md`: star ratings (K155)
- `gameplay-badge.md`: the mode badge (K73, K151)
- `gameplay-indicators.md`: off-screen indicators and the head (K73, K148)
- `gameplay-minotaur.md`: the real-time minotaur (K80), its controls (K174), the turn-aligned minotaur (K80 turns), the sword (K137 stage 3b), sprint (K137 stage 3c), sleepers and the follower (K137 stage 3d), lures and snares (K137 stage 4)
- `gameplay-fire.md`: the burn race (K114)
- `gameplay-beat.md`: the beat rider (K114 beat): its run timing (K795); the K114 entry is still to write
- `gameplay-mechanisms.md`: fragile runs and par (K137), collapse (K139), the cut (K114), the aids (K137 stage 2), ice and the color rule (K138 stage 1), turnstiles and hidden runs (K138 stage 2), one-way runs (K138 stage 3), locks and keys (K138 stage 4)
- `gameplay-fog.md`: the fog of war resets on a restart only (K100), or on a catch (K174)
- `gameplay-links.md`: links and the codec
- `gameplay-panel.md`: the panel
- `gameplay-motion.md`: the Motion setting (K53, K79), the Accessibility group (K111)
- `gameplay-camera.md`: camera, gestures and taps (with `src/main.ts` and `src/app/camera.ts`)
- `gameplay-moves.md`: moves by direction (K120)
- `gameplay-audio.md`: audio
