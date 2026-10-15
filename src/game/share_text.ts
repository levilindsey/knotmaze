// The Wordle-style share text for a solve (K20): a title line (with K155's
// stars, as Wordle puts its score there, and K80 turns stage 2's minotaur
// tag), the time and efficiency, and the move grid (game/maze_stats.ts
// moveGrid, 🐂 marking a move you were caught on) - no maze spoilers, only
// how each decision went. The link travels separately (navigator.share's
// url, or a second line on the clipboard).

import { efficiencyPercent, formatDuration, moveGrid } from "./maze_stats";
import { starGlyphs } from "./star_rating";

export interface ShareInfo {
  daily: number | null; // null = an ordinary design
  replay: boolean;
  // K146: a practice run (a past daily begun after its day; not scored).
  practice?: boolean;
  timeMs: number;
  efficiency: number | null;
  moves: string;
  // K155: the run's stars (null or absent: no rating).
  stars?: number | null;
  // K80 turns stage 2: a minotaur's game (null or absent: none ran). Its
  // catches, and the turn clock's close calls (real time has none: null).
  catches?: number | null;
  closeCalls?: number | null;
}

// The title line's minotaur tag: "🐂 2" when it caught you, "🐂 0 · 5 close
// calls" when it never did but came within a run of you, else "🐂 0".
export function minotaurTag(catches: number, closeCalls?: number | null): string {
  if (catches > 0 || !closeCalls) return `\u{1F402} ${catches}`;
  return `\u{1F402} 0 · ${closeCalls} close call${closeCalls === 1 ? "" : "s"}`;
}

export function shareText(info: ShareInfo): string {
  const tag = info.replay ? " (replay)" : info.practice ? " (practice)" : "";
  const title =
    info.daily === null ? "Knotmaze" : `Knotmaze Daily #${info.daily}${tag}`;
  const stars = info.stars != null ? ` ${starGlyphs(info.stars)}` : "";
  const mino =
    info.catches != null ? ` · ${minotaurTag(info.catches, info.closeCalls)}` : "";
  const eff =
    info.efficiency === null
      ? ""
      : ` · \u{1F3AF} ${efficiencyPercent(info.efficiency)}%`;
  const lines = [
    `${title} \u{1F9F6}${stars}${mino}`,
    `⏱️ ${formatDuration(info.timeMs)}${eff}`,
  ];
  const grid = moveGrid(info.moves);
  if (grid !== "") lines.push(grid);
  return lines.join("\n");
}
