// The Wordle-style share text for a solve (K20): a title line (with K155's
// stars, as Wordle puts its score there, and K80 turns stage 2's minotaur
// tag), the time and efficiency, and the move grid (game/maze_stats.ts
// moveGrid, 🐂 marking a move you were caught on) - no maze spoilers, only
// how each decision went. The link travels separately (navigator.share's
// url, or a second line on the clipboard).

import { efficiencyPercent, formatDuration, moveGrid } from "./maze_stats";
import { starGlyphs } from "./star_rating";
import type { WalkerScore } from "./walker";
import { spoolTag } from "./spool";
import { hintsTag } from "./hints";

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
  // K137: the runs broken (fragile runs on), and par's score ("+N", "E",
  // "\u2212N"; null or "" for none).
  snapped?: number | null;
  parScore?: string | null;
  // K139: a collapse game's mode, score (a whole percent) and par as text
  // (game/collapse.ts parText; null or absent: collapse off).
  collapse?: { mode: "finish" | "free"; pct: number; par: string } | null;
  // K114: the runs cut (null, absent or 0: no tag).
  cuts?: number | null;
  // K137 stage 3a: the hearts left at the finish (null or absent: lives off).
  hearts?: number | null;
  // K114 walker: the walker's score (null or absent: no walker).
  walker?: WalkerScore | null;
  // K137 stage 3b: the move the sword was taken on (null or absent: the
  // sword off, none laid, or never taken).
  swordTaken?: number | null;
  // K137 stage 3c: sprint was used this attempt (null, absent or false: no
  // tag; sprint off or never used).
  sprintUsed?: boolean | null;
  // K137 stage 3d: the sleepers woken (null or absent: sleepers off; 0
  // shows, as the minotaur's 0 does).
  woken?: number | null;
  // K137 stage 4: the lures and snares used (null, absent or 0: no tag;
  // that tool off or never used).
  luresUsed?: number | null;
  snaresUsed?: number | null;
  // K137 stage 2: the spool's yarn used and capacity at the finish (null or
  // absent: the spool off), and the hints used (null, absent or 0: no tag).
  spool?: { used: number; cap: number } | null;
  hintsUsed?: number | null;
  // K138: the rules' title tags (null or absent: that rule off): ice's share
  // of the runs (a whole percent), the color rule's mode, the turnstiles
  // laid, and the hidden runs found of those laid.
  ice?: number | null;
  colorRule?: string | null;
  turnstiles?: number | null;
  hidden?: { found: number; of: number } | null;
  // K138 stage 3: the one-way runs laid.
  oneWay?: number | null;
  // K138 stage 4: the keys held of those laid.
  keys?: { held: number; of: number } | null;
}

// K114 walker: the title line's tag. Lead: "✂️ 4, par 3" (no par part when
// there is none; zero cuts included, since a par-0 maze is a score). Delay:
// "🐢 61 runs (it wanted 18)". K713: an upper-bound par reads "par ≤ 3".
export function walkerTag(w: WalkerScore, cuts: number): string {
  if (w.mode === "lead") {
    return `✂️ ${cuts}${w.par != null ? `, par ${w.upper ? "≤ " : ""}${w.par}` : ""}`;
  }
  return `\u{1F422} ${w.walk} run${w.walk === 1 ? "" : "s"} (it wanted ${w.shortest})`;
}

// K139: the collapse line under the time, "🧱 Collapse to the finish: 58% ·
// par ≥62%" or "🧱 Free collapse: ...".
export function collapseLine(c: { mode: "finish" | "free"; pct: number; par: string }): string {
  const name = c.mode === "free" ? "Free collapse" : "Collapse to the finish";
  return `\u{1F9F1} ${name}: ${c.pct}% · par ${c.par}`;
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
  // K137: the fragile and par tags, beside the minotaur's.
  const snap = info.snapped != null ? ` · snapped ${info.snapped}` : "";
  const par = info.parScore ? ` · \u26F3 ${info.parScore}` : "";
  // K114: " · ✂️ N" once a run was cut.
  // K114 walker: its tag instead, in the walker's modes.
  const cut = info.walker
    ? ` · ${walkerTag(info.walker, info.cuts ?? 0)}`
    : info.cuts
      ? ` · \u2702\uFE0F ${info.cuts}`
      : "";
  // K137 stage 3a: " · ❤️ N left" while lives are on.
  const hearts = info.hearts != null ? ` · \u2764\uFE0F ${info.hearts} left` : "";
  // K137 stage 3b: " · ⚔️ on move N", the move the sword was taken on.
  const sword = info.swordTaken != null ? ` · ⚔️ on move ${info.swordTaken}` : "";
  // K137 stage 3c: " · ⚡ used" once sprint was used.
  const sprint = info.sprintUsed ? " · ⚡ used" : "";
  // K137 stage 3d: " · 😴 N woken" while sleepers are on.
  const woken = info.woken != null ? ` · \u{1F634} ${info.woken} woken` : "";
  // K137 stage 4: " · 🎵 N lure(s)" and " · 🪢 N snare(s)" once used.
  const plural = (n: number, one: string): string => `${n} ${one}${n === 1 ? "" : "s"}`;
  const tools =
    (info.luresUsed ? ` · \u{1F3B5} ${plural(info.luresUsed, "lure")}` : "") +
    (info.snaresUsed ? ` · \u{1FAA2} ${plural(info.snaresUsed, "snare")}` : "");
  // K137 stage 2: " · 🧶 82% of the spool" and " · 💡1".
  const spoolT = info.spool ? spoolTag(info.spool.used, info.spool.cap) : null;
  const hintT = info.hintsUsed != null ? hintsTag(info.hintsUsed) : null;
  const aids = `${spoolT ? ` · ${spoolT}` : ""}${hintT ? ` · ${hintT}` : ""}`;
  // K138: " · 🧊 25%" (ice), " · 🎨 cycle" (the color rule), " · 🔄 4"
  // (turnstiles), " · 👻 1/2" (hidden runs found of those laid).
  const rules =
    (info.ice != null ? ` · \u{1F9CA} ${info.ice}%` : "") +
    (info.colorRule ? ` · \u{1F3A8} ${info.colorRule}` : "") +
    (info.turnstiles != null ? ` · \u{1F504} ${info.turnstiles}` : "") +
    (info.hidden ? ` · \u{1F47B} ${info.hidden.found}/${info.hidden.of}` : "") +
    // K138 stage 3: " · ⏩ 12" (one-way runs laid).
    (info.oneWay != null ? ` · \u23E9 ${info.oneWay}` : "") +
    // K138 stage 4: " · 🔑 2/3" (the keys held of those laid).
    (info.keys ? ` · \u{1F511} ${info.keys.held}/${info.keys.of}` : "");
  const eff =
    info.efficiency === null
      ? ""
      : ` · \u{1F3AF} ${efficiencyPercent(info.efficiency)}%`;
  const lines = [
    `${title} \u{1F9F6}${stars}${mino}${hearts}${sword}${sprint}${woken}${tools}${snap}${par}${cut}${aids}${rules}`,
    `⏱️ ${formatDuration(info.timeMs)}${eff}`,
  ];
  if (info.collapse) lines.push(collapseLine(info.collapse));
  const grid = moveGrid(info.moves);
  if (grid !== "") lines.push(grid);
  return lines.join("\n");
}
