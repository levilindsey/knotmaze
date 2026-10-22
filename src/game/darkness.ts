// K137 darkness (4.17, docs/design/K80_gameplay_additions.md): fog of
// war that closes again. Explored stamps fade back to dark over a
// span of moves; the lantern around the head is the renderer's own
// hole (fabric_maze_renderer.ts). Pure: the fade curve and the stamp
// pruning, so the timing is testable without a canvas.

// A stamp's hole strength: 1 when fresh, fading linearly to 0 at
// `darkMoves` moves old. With darkness off (darkMoves <= 0) explored
// fog never closes (strength 1 at any age).
export function darknessAlpha(ageMoves: number, darkMoves: number): number {
  if (!(darkMoves > 0)) return 1;
  if (!(ageMoves > 0)) return 1;
  const a = 1 - ageMoves / darkMoves;
  return a <= 0 ? 0 : a;
}

// Drop the stamps whose hole has fully closed, compacting the flat
// [x, y, ...] list and its parallel move list in place. Returns the
// number of live stamps. With darkness off nothing is dropped.
export function pruneDarkStamps(
  stamps: number[],
  moves: number[],
  nowMove: number,
  darkMoves: number
): number {
  if (!(darkMoves > 0)) return moves.length;
  let w = 0;
  for (let i = 0; i < moves.length; i++) {
    if (darknessAlpha(nowMove - moves[i], darkMoves) <= 0) continue;
    if (w !== i) {
      stamps[2 * w] = stamps[2 * i];
      stamps[2 * w + 1] = stamps[2 * i + 1];
      moves[w] = moves[i];
    }
    w++;
  }
  stamps.length = 2 * w;
  moves.length = w;
  return w;
}
