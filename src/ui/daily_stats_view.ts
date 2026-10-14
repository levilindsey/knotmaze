// The daily stats view (K20): a small modal over the maze - the aggregate
// tiles (played, solved, current and best streak, best time), today's
// result with a Share button (or a Play / Resume button: K47 keeps an
// unfinished attempt), and the per-day history, newest first (tap a day to
// play or resume it). Phone-sized: one column, finger-sized targets, the
// history scrolls inside the card. K155: today's stars (a tap explains
// them), each history row's stars (hover explains), a count of the
// official results' stars by the History heading, and a legend line.
// K146: the History lists EVERY past daily (game/daily_store.ts
// dailyHistory), unplayed days included - a tap plays one, as practice
// (begun after its day: never scored) - under sticky month headers, with
// All / Played / Not played chips once it is long. Practice results show
// muted, in violet.

import { efficiencyPercent, formatDuration } from "../game/maze_stats";
import { dailyAggregates, dailyHistory } from "../game/daily_store";
import type { DailyStore, HistoryEntry } from "../game/daily_store";
import { formatDayDate, formatDayMonth } from "../game/daily_calendar";
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
    "max-height:min(38vh,300px);overflow:auto;border-top:1px solid #2c3a55;" +
    // K146: a year of rows scrolls; a dark scrollbar to match the card.
    "scrollbar-color:#3d4b6a transparent}" +
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
    "grid-template-columns:3.4em 4.6em 1fr 3.8em 3.4em 5.6em;gap:4px;" +
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
    // K146: practice (violet, muted stars), and the quiet unplayed days.
    ".km-hist .pr,.km-hist .st .pr{color:#a898e0}" +
    ".km-hist button.km-un{color:#7d8cab}" +
    ".km-hist button.km-un .n{color:#8d7c4c}" +
    ".km-hist button.km-un .s{color:#66738f}" +
    ".km-hist li[hidden]{display:none}" +
    // Month headers stick to the top of the scrolling list.
    ".km-hist .km-month{position:sticky;top:0;z-index:1;padding:7px 4px 4px;" +
    "background:#1b2233;color:#8ea0c0;border-bottom:1px solid #2c3a55;" +
    `font:650 11px/1.2 ${sans};letter-spacing:.06em;text-transform:uppercase}` +
    ".km-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px}" +
    ".km-chip{min-height:26px;padding:0 10px;border-radius:13px;" +
    "border:1px solid #3a4a6a;background:none;color:#c8d3e8;" +
    `font:600 12px/1 ${sans};cursor:pointer;` +
    "-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".km-chip:hover{background:#222b40}" +
    ".km-chip[aria-pressed=true]{background:#2f3d5c;border-color:#8ea0c0;" +
    "color:#e4ecf8}" +
    ".km-chip:focus-visible{outline:2px solid #8fe6ff;outline-offset:2px}" +
    // Narrow phones: the efficiency column goes (the stars stay).
    "@media (max-width:400px){.km-hist button{grid-template-columns:" +
    "3em 4.2em 1fr 3.8em 5.6em}.km-hist .e{display:none}}" +
    ".km-empty{padding:10px 4px;color:#8ea0c0}" +
    ".km-note{margin-top:10px;font-size:11.5px;color:#8ea0c0}" +
    ".km-note.km-warn{color:#e7c56f}" +
    ".km-foot{display:flex;justify-content:center;margin-top:12px}" +
    "@media (pointer:coarse){.km-hist button{padding:10px 4px}" +
    ".km-chip{min-height:34px;padding:0 13px}}";
  document.head.appendChild(style);
}

// K146: the History gets its filter chips past this many days.
const HISTORY_CHIPS_AFTER = 10;

// One History row (K146): number, date, time, stars, efficiency, status.
// A tap plays the day, or resumes its saved attempt; the title says which,
// and whether it will be scored.
function historyRow(e: HistoryEntry, play: () => void): HTMLLIElement {
  const li = document.createElement("li");
  const b = document.createElement("button");
  b.type = "button";
  let title = `${e.attempt ? "Resume" : "Play"} Daily #${e.n} (${formatDayDate(e.n)})`;
  if (e.status === "official") title += ", a replay, not scored";
  else if (e.practice) title += " as practice, not scored";
  if (e.status === "practice" && e.more > 0) {
    title += `. Practiced ${e.more + 1} times`;
  }
  b.title = title;
  const cell = (text: string, cls: string): HTMLSpanElement => {
    const s = document.createElement("span");
    s.className = cls;
    s.textContent = text;
    b.appendChild(s);
    return s;
  };
  cell(`#${e.n}`, "n");
  cell(formatDayDate(e.n), "");
  const r = e.result;
  const pr = e.status === "practice" ? " pr" : "";
  if (r) {
    cell(formatDuration(r.timeMs), `r${pr}`);
    // K155: the stars, with their explanation on hover (the legend
    // below the list says what each needs; the row's tap plays).
    const rating = ratingForResult(r);
    const st = cell("", "st");
    if (rating) {
      const glyphs = starGlyphs(rating.stars);
      const on = document.createElement("span");
      on.className = `on${pr}`;
      on.textContent = glyphs.slice(0, rating.stars);
      const off = document.createElement("span");
      off.className = "off";
      off.textContent = glyphs.slice(rating.stars);
      st.append(on, off);
      st.title =
        (pr ? "Practice, not scored. " : "") +
        starExplanation(rating).join("\n");
      st.setAttribute("aria-label", starLabel(rating.stars));
    }
    cell(`${efficiencyPercent(r.efficiency)}%`, `r e${pr}`);
    if (pr) {
      cell("practice", "s pr");
    } else {
      const late = e.late ? " late" : "";
      const extra = e.more > 0 ? ` +${e.more}` : "";
      cell(`✓${late}${extra}`, `s${late ? "" : " ok"}`);
    }
  } else if (e.attempt) {
    // K47: unfinished and saved - tapping the row resumes it (practice
    // when it began after its day).
    const p = e.practice ? " pr" : "";
    cell(formatDuration(e.attempt.elapsedMs), `r${p}`);
    cell("", "st");
    cell("", "r e");
    cell("resume", `s${p}`);
  } else {
    cell("—", "r");
    cell("", "st");
    cell("", "r e");
    if (e.status === "unplayed") {
      b.className = "km-un";
      cell("play", "s");
    } else {
      cell("played", "s");
    }
  }
  b.addEventListener("click", play);
  li.appendChild(b);
  return li;
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
    // (Rows a History filter hides are not focusable.)
    const focusable = [
      ...card.querySelectorAll<HTMLElement>("button:not(:disabled)"),
    ].filter((el) => el.offsetParent !== null);
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

  // History: every past daily, newest first (K146), under a count of the
  // official results' stars (practice never counts).
  const h3h = document.createElement("h3");
  h3h.className = "km-h3row";
  h3h.append("History");
  const entries = dailyHistory(data, o.today);
  const starCounts = [0, 0, 0, 0];
  for (const d of Object.values(data.days)) {
    const rating = ratingForResult(d.official);
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
  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "km-empty";
    empty.textContent = "No past dailies yet.";
    card.appendChild(empty);
  } else {
    const list = document.createElement("ul");
    list.className = "km-hist";
    // Rows under sticky month headers; the filter chips hide rows, and a
    // month header with no row left showing.
    const rows: { li: HTMLLIElement; played: boolean; month: HTMLLIElement }[] =
      [];
    const months: HTMLLIElement[] = [];
    let month: HTMLLIElement | null = null;
    for (const e of entries) {
      const label = formatDayMonth(e.n);
      if (month === null || month.textContent !== label) {
        month = document.createElement("li");
        month.className = "km-month";
        month.textContent = label;
        months.push(month);
        list.appendChild(month);
      }
      const li = historyRow(e, () => {
        close();
        o.onPlay(e.n, false);
      });
      list.appendChild(li);
      rows.push({ li, played: e.status !== "unplayed", month });
    }
    // A long history (a year of dailies) gets All / Played / Not played.
    if (rows.length > HISTORY_CHIPS_AFTER) {
      const nPlayed = rows.filter((r) => r.played).length;
      const chips = document.createElement("div");
      chips.className = "km-chips";
      chips.setAttribute("role", "group");
      chips.setAttribute("aria-label", "Show days");
      const buttons: HTMLButtonElement[] = [];
      const chip = (
        label: string,
        count: number,
        keep: (r: (typeof rows)[number]) => boolean
      ): void => {
        const c = document.createElement("button");
        c.type = "button";
        c.className = "km-chip";
        c.textContent = label;
        c.disabled = count === 0;
        c.setAttribute("aria-pressed", String(buttons.length === 0));
        c.addEventListener("click", () => {
          for (const x of buttons) {
            x.setAttribute("aria-pressed", String(x === c));
          }
          const shown = new Set<HTMLLIElement>();
          for (const r of rows) {
            r.li.hidden = !keep(r);
            if (!r.li.hidden) shown.add(r.month);
          }
          for (const m of months) m.hidden = !shown.has(m);
          list.scrollTop = 0;
        });
        buttons.push(c);
        chips.appendChild(c);
      };
      chip("All", rows.length, () => true);
      chip(`Played ${nPlayed}`, nPlayed, (r) => r.played);
      chip(
        `Not played ${rows.length - nPlayed}`,
        rows.length - nPlayed,
        (r) => !r.played
      );
      card.appendChild(chips);
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
        "Saved in this browser only, unfinished attempts included. A daily's first finish is its official result; later ones are replays. An attempt begun after its day is practice, kept out of your stats.";
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
