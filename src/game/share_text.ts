// The Wordle-style share text for a solve (K20): a title line (with K155's
// stars, as Wordle puts its score there), the time and efficiency, and the
// move grid (game/maze_stats.ts moveGrid) - no maze spoilers, only how each
// decision went. The link travels separately (navigator.share's url, or a
// second line on the clipboard).

import { efficiencyPercent, formatDuration, moveGrid } from "./maze_stats";
import { starGlyphs } from "./star_rating";

export interface ShareInfo {
  daily: number | null; // null = an ordinary design
  replay: boolean;
  timeMs: number;
  efficiency: number | null;
  moves: string;
  // K155: the run's stars (null or absent: no rating).
  stars?: number | null;
}

export function shareText(info: ShareInfo): string {
  const title =
    info.daily === null
      ? "Knotmaze"
      : `Knotmaze Daily #${info.daily}${info.replay ? " (replay)" : ""}`;
  const stars = info.stars != null ? ` ${starGlyphs(info.stars)}` : "";
  const eff =
    info.efficiency === null
      ? ""
      : ` · \u{1F3AF} ${efficiencyPercent(info.efficiency)}%`;
  const lines = [
    `${title} \u{1F9F6}${stars}`,
    `⏱️ ${formatDuration(info.timeMs)}${eff}`,
  ];
  const grid = moveGrid(info.moves);
  if (grid !== "") lines.push(grid);
  return lines.join("\n");
}
