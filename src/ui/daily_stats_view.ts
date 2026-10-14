// The daily stats view (K20): a small modal over the maze - the aggregate
// tiles (played, solved, current and best streak, best time), today's
// result with a Share button (or a Play / Resume button: K47 keeps an
// unfinished attempt), and the per-day history, newest first (tap a day to
// play or resume it). Phone-sized: one column, finger-sized targets, the
// history scrolls inside the card. K155: today's stars (a tap explains
// them), each history row's stars (hover explains), a count of the
// official results' stars by the History heading, and a legend line.

import { efficiencyPercent, formatDuration } from "../game/maze_stats";
import { dailyAggregates, onTime } from "../game/daily_store";
import type { DailyStore } from "../game/daily_store";
import { formatDayDate } from "../game/daily_calendar";
import {
  ratingForResult,
  starExplanation,
  starGlyphs,
  starLabel,
  starRules,
} from "../game/star_rating";
import { ensureHudStyles, starsWidget } from "./maze_hud";

export interface DailyStatsOptions {
  store: DailyStore;
  today: number;
  // Load daily n (closes the view first); `today` = the Play button for
  // today's daily, as opposed to a history row naming a day.
  onPlay: (n: number, today: boolean) => void;
  // Share daily n's official result.
  onShare: (n: number) => void;
}

let styled = false;
function ensureStyles(): void {
  ensureHudStyles();
  if (styled) return;
  styled = true;
  const mono = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
  const sans = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const style = document.createElement("style");
  style.textContent =
    ".km-modal-bg{position:fixed;inset:0;z-index:40;background:#05080fa6;" +
    "display:flex;align-items:center;justify-content:center;" +
    "padding:max(12px,env(safe-area-inset-top)) 12px " +
    "max(12px,env(safe-area-inset-bottom))}" +
    ".km-modal{position:relative;box-sizing:border-box;width:min(420px,100%);" +
    "max-height:100%;overflow:auto;overscroll-behavior:contain;outline:none;" +
    "background:#1b2233;color:#c8d3e8;border:1px solid #2c3a55;" +
    `border-radius:12px;padding:16px 16px 14px;font:13px/1.45 ${sans};` +
    "box-shadow:0 10px 40px #000a}" +
    ".km-modal h2{margin:0 0 12px;font-size:16px;font-weight:650;" +
    "color:#e4ecf8}" +
    ".km-modal h3{margin:14px 0 6px;font-size:12px;font-weight:650;" +
    "letter-spacing:.06em;text-transform:uppercase;color:#8ea0c0}" +
    ".km-tiles{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}" +
    ".km-tile{background:#222b40;border-radius:8px;padding:8px 2px 7px;" +
    "text-align:center;min-width:0}" +
    `.km-tile b{display:block;font:650 18px/1.2 ${mono};color:#e4ecf8;` +
    "font-variant-numeric:tabular-nums;white-space:nowrap}" +
    ".km-tile span{display:block;margin-top:2px;font-size:10.5px;" +
    "line-height:1.2;color:#8ea0c0}" +
    "@media (max-width:360px){.km-tiles{grid-template-columns:repeat(3,1fr)}}" +
    ".km-today{display:flex;align-items:center;gap:10px;" +
    "background:#222b40;border-radius:8px;padding:9px 10px}" +
    ".km-today .km-tx{flex:1 1 auto;min-width:0}" +
    ".km-today .km-tx b{color:#e4ecf8;font-weight:650}" +
    `.km-today .km-tx div{font-family:${mono};font-size:12px}` +
    ".km-hist{list-style:none;margin:0;padding:0;" +
    "max-height:min(38vh,300px);overflow:auto;border-top:1px solid #2c3a55}" +
    // K155: the stars' small form in the today row and the history.
    ".km-today .km-stars{font-size:16px;margin:0 0 0 6px;padding:0 4px;" +
    "letter-spacing:1px;vertical-align:-1px}" +
    ".km-today .km-stars svg{width:13px;height:13px}" +
    ".km-today+.km-why{margin:6px 0 0}" +
    ".km-h3row{display:flex;justify-content:space-between;align-items:baseline;" +
    "gap:8px}" +
    ".km-h3row .km-sum{text-transform:none;letter-spacing:0;font-weight:400;" +
    "color:#c8d3e8;white-space:nowrap}" +
    ".km-sum .on,.km-hist .st .on{color:#e7c56f}" +
    ".km-hist .st{text-align:center;white-space:nowrap;letter-spacing:1px;" +
    `font-family:${sans}}` +
    ".km-hist .st .off{color:#4a5672}" +
    ".km-hist button{box-sizing:border-box;width:100%;display:grid;" +
    "grid-template-columns:3.4em 4.6em 1fr 3.8em 3.4em 4.6em;gap:4px;" +
    "align-items:center;padding:7px 4px;border:0;" +
    "border-bottom:1px solid #222b40;background:none;color:inherit;" +
    `font:12px/1.3 ${mono};text-align:left;cursor:pointer;` +
    "-webkit-tap-highlight-color:transparent}" +
    ".km-hist button:hover{background:#222b40}" +
    ".km-hist button:focus-visible{outline:2px solid #8fe6ff;" +
    "outline-offset:-2px}" +
    ".km-hist .n{color:#e7c56f}.km-hist .r{text-align:right}" +
    ".km-hist .s{text-align:right;color:#8ea0c0}" +
    ".km-hist .ok{color:#39d353}" +
    ".km-empty{padding:10px 4px;color:#8ea0c0}" +
    ".km-note{margin-top:10px;font-size:11.5px;color:#8ea0c0}" +
    ".km-note.km-warn{color:#e7c56f}" +
    ".km-foot{display:flex;justify-content:center;margin-top:12px}" +
    "@media (pointer:coarse){.km-hist button{padding:10px 4px}}";
  document.head.appendChild(style);
}

// The open view's teardown (null = closed).
let closeOpen: (() => void) | null = null;

export function closeDailyStats(): void {
  closeOpen?.();
}

export function dailyStatsOpen(): boolean {
  return closeOpen !== null;
}

export function openDailyStats(o: DailyStatsOptions): void {
  ensureStyles();
  closeDailyStats();
  const restoreFocus = document.activeElement as HTMLElement | null;
  const data = o.store.data();
  const agg = dailyAggregates(data, o.today);

  const bg = document.createElement("div");
  bg.className = "km-modal-bg";
  bg.id = "km-daily-stats";
  const card = document.createElement("div");
  card.className = "km-modal";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-labelledby", "km-stats-title");
  bg.appendChild(card);

  // Escape closes; Tab cycles inside the card (a modal keeps focus).
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== "Tab") return;
    const focusable = [...card.querySelectorAll<HTMLElement>("button")];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const at = document.activeElement;
    if (!card.contains(at) || at === card) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && at === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && at === last) {
      e.preventDefault();
      first.focus();
    }
  };
  const teardown = (): void => {
    bg.remove();
    document.removeEventListener("keydown", onKey, true);
    if (closeOpen === teardown) closeOpen = null;
  };
  const close = (): void => {
    teardown();
    restoreFocus?.focus?.();
  };
  document.addEventListener("keydown", onKey, true);
  bg.addEventListener("pointerdown", (e) => {
    if (e.target === bg) close();
  });

  const h = document.createElement("h2");
  h.id = "km-stats-title";
  h.textContent = "Daily stats";
  const x = document.createElement("button");
  x.type = "button";
  x.className = "km-x";
  x.textContent = "×";
  x.title = "Close";
  x.setAttribute("aria-label", "Close");
  x.addEventListener("click", close);
  card.append(h, x);

  // Aggregate tiles.
  const tiles = document.createElement("div");
  tiles.className = "km-tiles";
  const tile = (value: string, label: string): void => {
    const t = document.createElement("div");
    t.className = "km-tile";
    const b = document.createElement("b");
    b.textContent = value;
    const s = document.createElement("span");
    s.textContent = label;
    t.append(b, s);
    tiles.appendChild(t);
  };
  tile(String(agg.played), "played");
  tile(String(agg.solved), "solved");
  tile(String(agg.currentStreak), "streak");
  tile(String(agg.maxStreak), "best streak");
  tile(agg.bestTimeMs === null ? "—" : formatDuration(agg.bestTimeMs), "best time");
  card.appendChild(tiles);

  // Today.
  const h3t = document.createElement("h3");
  h3t.textContent = `Today · Daily #${o.today} · ${formatDayDate(o.today)}`;
  const today = document.createElement("div");
  today.className = "km-today";
  const tx = document.createElement("div");
  tx.className = "km-tx";
  const tday = data.days[String(o.today)];
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "km-btn km-primary";
  // K155: today's stars explain themselves below the row when tapped.
  let todayWhy: HTMLDivElement | null = null;
  if (tday?.official) {
    const r = tday.official;
    const b = document.createElement("b");
    b.textContent = "Solved";
    const rating = ratingForResult(r);
    if (rating) {
      const [stars, why] = starsWidget(rating);
      b.appendChild(stars);
      todayWhy = why;
    }
    const line = document.createElement("div");
    line.textContent =
      formatDuration(r.timeMs) +
      ` · ${efficiencyPercent(r.efficiency)}%` +
      (tday.replays.length > 0
        ? ` · ${tday.replays.length} replay${tday.replays.length === 1 ? "" : "s"}`
        : "");
    tx.append(b, line);
    btn.textContent = "Share";
    btn.addEventListener("click", () => o.onShare(o.today));
  } else {
    // K47: a saved attempt picks up where it was.
    const a = tday?.attempt;
    const b = document.createElement("b");
    b.textContent = a ? "In progress" : tday ? "Not finished" : "Not played yet";
    const line = document.createElement("div");
    line.textContent = a
      ? `${formatDuration(a.elapsedMs)} · ${a.taps.length} move${a.taps.length === 1 ? "" : "s"}`
      : "Same maze for everyone today";
    tx.append(b, line);
    btn.textContent = a ? "Resume" : "Play";
    btn.addEventListener("click", () => {
      close();
      o.onPlay(o.today, true);
    });
  }
  today.append(tx, btn);
  card.append(h3t, today);
  if (todayWhy) card.appendChild(todayWhy);

  // History, newest first, under a count of the official results' stars.
  const h3h = document.createElement("h3");
  h3h.className = "km-h3row";
  h3h.append("History");
  const days = Object.keys(data.days)
    .map(Number)
    .sort((a, b) => b - a);
  const starCounts = [0, 0, 0, 0];
  for (const n of days) {
    const rating = ratingForResult(data.days[String(n)].official);
    if (rating) starCounts[rating.stars]++;
  }
  if (starCounts[1] + starCounts[2] + starCounts[3] > 0) {
    const sum = document.createElement("span");
    sum.className = "km-sum";
    const parts: string[] = [];
    for (const s of [3, 2, 1]) {
      if (starCounts[s] === 0) continue;
      const on = document.createElement("span");
      on.className = "on";
      on.textContent = "★".repeat(s);
      if (sum.childNodes.length > 0) sum.append(" · ");
      sum.append(on, ` ${starCounts[s]}`);
      parts.push(`${starCounts[s]} with ${s} star${s === 1 ? "" : "s"}`);
    }
    sum.title = `Official results: ${parts.join(", ")}`;
    h3h.appendChild(sum);
  }
  card.appendChild(h3h);
  if (days.length === 0) {
    const empty = document.createElement("div");
    empty.className = "km-empty";
    empty.textContent = "Solve a daily to start your history.";
    card.appendChild(empty);
  } else {
    const list = document.createElement("ul");
    list.className = "km-hist";
    for (const n of days) {
      const d = data.days[String(n)];
      const r = d.official;
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.title = `${!r && d.attempt ? "Resume" : "Play"} Daily #${n}`;
      const cell = (text: string, cls: string): void => {
        const s = document.createElement("span");
        s.className = cls;
        s.textContent = text;
        b.appendChild(s);
      };
      cell(`#${n}`, "n");
      cell(formatDayDate(n), "");
      if (r) {
        cell(formatDuration(r.timeMs), "r");
        // K155: the stars, with their explanation on hover (the legend
        // below the list says what each needs; the row's tap plays).
        const rating = ratingForResult(r);
        const st = document.createElement("span");
        st.className = "st";
        if (rating) {
          const glyphs = starGlyphs(rating.stars);
          const on = document.createElement("span");
          on.className = "on";
          on.textContent = glyphs.slice(0, rating.stars);
          const off = document.createElement("span");
          off.className = "off";
          off.textContent = glyphs.slice(rating.stars);
          st.append(on, off);
          st.title = starExplanation(rating).join("\n");
          st.setAttribute("aria-label", starLabel(rating.stars));
        }
        b.appendChild(st);
        cell(`${efficiencyPercent(r.efficiency)}%`, "r");
        const late = onTime(n, r) ? "" : " late";
        const extra = d.replays.length > 0 ? ` +${d.replays.length}` : "";
        cell(`✓${late}${extra}`, `s${late ? "" : " ok"}`);
      } else if (d.attempt) {
        // K47: unfinished and saved - tapping the row resumes it.
        cell(formatDuration(d.attempt.elapsedMs), "r");
        cell("", "st");
        cell("", "r");
        cell("resume", "s");
      } else {
        cell("—", "r");
        cell("", "st");
        cell("", "r");
        cell("played", "s");
      }
      b.addEventListener("click", () => {
        close();
        o.onPlay(n, false);
      });
      li.appendChild(b);
      list.appendChild(li);
    }
    card.appendChild(list);
  }

  // K155: what the stars need, for every screen (phones have no hover).
  if (starCounts[1] + starCounts[2] + starCounts[3] > 0) {
    const legend = document.createElement("div");
    legend.className = "km-note";
    legend.textContent =
      `Stars: ${starRules(false).join(" · ")}. ` +
      "Every step counts, backtracks both ways.";
    card.appendChild(legend);
  }

  const note = document.createElement("div");
  note.className = "km-note";
  switch (o.store.status) {
    case "ok":
      note.textContent =
        "Saved in this browser only, unfinished attempts included. A day's first finish is its official result; later ones count as replays.";
      break;
    case "unavailable":
      note.className = "km-note km-warn";
      note.textContent =
        "This browser isn't letting Knotmaze save anything, so these stats last until you close the page.";
      break;
    case "newer":
      note.className = "km-note km-warn";
      note.textContent =
        "Your saved stats come from a newer version of Knotmaze. Reload the page to see them.";
      break;
    case "memory":
      note.className = "km-note km-warn";
      note.textContent =
        "Browser storage is full, so new results last until you close the page.";
      break;
  }
  card.appendChild(note);

  document.body.appendChild(bg);
  closeOpen = teardown;
  // Focus the dialog itself (a screen reader announces its title; Tab
  // then walks its buttons) - not the close button, whose focus ring would
  // greet every pointer user.
  card.tabIndex = -1;
  card.focus();
}
