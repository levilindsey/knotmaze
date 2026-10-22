// K793: the settings panel's search box, plus the collapse-all and
// expand-all buttons beside it (docs/design/K793.md). The matching is pure
// (panel_search.ts); this file is the DOM side: the sticky bar above the
// rows, the index built by walking the blades once the panel exists, and
// the filter.
//
// THE FILTER WORKS IN PLACE: rows keep their panel order. A row with no
// match, and a folder with no match the player can see, take `kp-sx-out`
// (display:none). That class, never Tweakpane's `hidden`, because
// refreshCond owns `hidden` (a mode's rows) and rewrites it after every
// change: the two would fight, and a search must never reveal a row a mode
// hides. A row counts as shown only when no `.tp-v-hidden` sits on it or
// above it.
//
// FOLDERS: when a search starts, every folder's state (and the scroll) is
// noted; folders with a match open as the query changes; clearing the box
// puts back each noted state, except the folders the player opened or
// closed during the search (by hand, or with collapse or expand all),
// which keep the player's choice. The search's own opening and closing
// runs with the fold handler muted, so it never reaches the saved folder
// states (`knotmaze.panelFolds`); the player's choices are saved as they
// always were.
//
// SAFETY: nothing here writes a param, the link, the undo stack or the
// daily state, or calls a panel callback. The query lives in this module
// only: it survives a panel close and goes with a reload. Keys typed in
// the box never reach the game: input_keys.ts's keyBelongsElsewhere skips
// every key whose target is an input or sits inside the panel.

import {
  buildPanelIndex,
  searchPanel,
  type PanelMatch,
  type PanelRowEntry,
  type PanelSearchIndex,
} from "./panel_search";

/** The Tweakpane blade APIs the walk reads, duck-typed: a binding has a
 * key, a button a title, a folder children and an expanded flag. */
interface BladeLike {
  readonly element?: unknown;
  readonly key?: unknown;
  readonly title?: unknown;
  readonly label?: unknown;
  readonly children?: unknown;
  expanded?: unknown;
}

interface FolderApiLike {
  expanded: boolean;
  readonly element: HTMLElement;
}

interface FolderRec {
  api: FolderApiLike;
  title: string;
  /** 0 for a top-level folder. */
  depth: number;
}

interface RowRec {
  entry: PanelRowEntry;
  el: HTMLElement;
  /** The element whose first child is the label's text node (the marks). */
  textEl: HTMLElement | null;
  /** The element that shows the hint (its ::after). */
  hintEl: HTMLElement | null;
  /** The folders the row sits in, outermost first. */
  folders: FolderRec[];
}

export interface PanelSearchHost {
  /** The pane: its root element and its blades. */
  pane: { readonly children: readonly unknown[] };
  /** The element that scrolls the panel (Tweakpane's wrapper). */
  scroller: HTMLElement | null;
  /** While true, the folders' fold handler saves nothing. */
  muteFolds: (on: boolean) => void;
  /** Saves a folder's state as the fold handler does. */
  saveFold: (title: string, expanded: boolean) => void;
  /** Search tags by row id (param_tags.ts). */
  tags: Readonly<Record<string, readonly string[]>>;
  /** After the filter changed which rows show (the row help follows). */
  onFilter?: () => void;
}

export interface PanelSearchState {
  query: string;
  /** False with an empty query (no filter). */
  active: boolean;
  rows: number;
  /** Rows shown by the search (matched and not hidden by a mode). */
  count: number;
  /** Their ids, in panel order. */
  shown: string[];
  /** The best match shown (what Enter goes to). */
  best: string | null;
  folders: Record<string, { expanded: boolean; shown: boolean }>;
  /** Hints on screen, by row id. */
  hints: Record<string, string>;
  /** Marked letters on screen, by row id ("|" between marks). */
  marks: Record<string, string>;
  status: string;
}

export interface PanelSearchUi {
  readonly bar: HTMLElement;
  readonly input: HTMLInputElement;
  /** Walks the blades again (after the panel is built). */
  reindex(): void;
  /** Reads the labels again (a button's title changed: the Daily's). */
  relabel(): void;
  /** Follows a change of which rows a mode hides (refreshCond). */
  refresh(): void;
  setQuery(query: string): void;
  /** The fold handler reports a fold the player made. */
  playerFold(title: string): void;
  collapseAll(): void;
  expandAll(): void;
  state(): PanelSearchState;
}

const OUT = "kp-sx-out";
const HINT = "data-kp-hint";
const FOCUSABLE = [
  "input:not([disabled])",
  "select:not([disabled])",
  "button:not([disabled])",
  "textarea:not([disabled])",
];

// Icons: a magnifier, an x, and two chevrons pointing in (collapse) or out
// (expand). Static markup, no user data.
const SVG = (inner: string): string =>
  `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${inner}</svg>`;
const MAG_SVG = SVG(
  '<circle cx="6.8" cy="6.8" r="4.6"/><line x1="10.3" y1="10.3" x2="14" y2="14"/>'
);
const X_SVG = SVG('<line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/>');
const COLLAPSE_SVG = SVG(
  '<polyline points="4,2.5 8,6.5 12,2.5"/><polyline points="4,13.5 8,9.5 12,13.5"/>'
);
const EXPAND_SVG = SVG(
  '<polyline points="4,6.5 8,2.5 12,6.5"/><polyline points="4,9.5 8,13.5 12,9.5"/>'
);

const STYLE =
  // The bar sticks to the top of the panel's scroll while the results
  // scroll under it; opaque, so rows never show through.
  ".kp-sx{position:sticky;top:0;z-index:3;padding:6px 6px 5px;" +
  "background:var(--tp-base-background-color,hsl(230,7%,17%));" +
  "border-bottom:1px solid rgba(255,255,255,.06)}" +
  ".kp-sx-row{display:flex;align-items:center;gap:4px}" +
  ".kp-sx-field{position:relative;flex:1 1 auto;min-width:0}" +
  ".kp-sx-in{box-sizing:border-box;display:block;width:100%;" +
  "height:var(--tp-container-unit-size,20px);margin:0;padding:0 22px;" +
  "border:0;border-radius:var(--tp-blade-border-radius,2px);" +
  "background:var(--tp-input-background-color,rgba(187,188,196,.1));" +
  "color:var(--tp-input-foreground-color,#bbbcc4);font:inherit;" +
  "outline:none;-webkit-appearance:none;appearance:none}" +
  ".kp-sx-in::placeholder{color:rgba(187,188,196,.45)}" +
  ".kp-sx-in:hover{background:var(--tp-input-background-color-hover,rgba(187,188,196,.15))}" +
  ".kp-sx-in:focus{background:var(--tp-input-background-color-focus,rgba(187,188,196,.2))}" +
  ".kp-sx-in:focus-visible{outline:1px solid #8ea0c0;outline-offset:-1px}" +
  // The browser's own clear button: ours replaces it.
  ".kp-sx-in::-webkit-search-cancel-button,.kp-sx-in::-webkit-search-decoration" +
  "{-webkit-appearance:none;appearance:none;display:none}" +
  ".kp-sx svg{display:block;fill:none;stroke:currentColor;stroke-width:1.7;" +
  "stroke-linecap:round;stroke-linejoin:round}" +
  ".kp-sx-mag{position:absolute;left:6px;top:50%;width:11px;height:11px;" +
  "margin-top:-5.5px;pointer-events:none;opacity:.5;color:#bbbcc4}" +
  ".kp-sx-mag svg{width:11px;height:11px}" +
  ".kp-sx-x{display:none;position:absolute;right:0;top:0;bottom:0;width:22px;" +
  "padding:0;border:0;background:none;color:#bbbcc4;cursor:pointer;" +
  "align-items:center;justify-content:center;opacity:.7;" +
  "-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
  ".kp-sx-has .kp-sx-x{display:flex}" +
  ".kp-sx-x:hover{opacity:1}" +
  ".kp-sx-x svg{width:10px;height:10px}" +
  ".kp-sx-fold{flex:0 0 auto;width:var(--tp-container-unit-size,20px);" +
  "height:var(--tp-container-unit-size,20px);padding:0;border:0;" +
  "border-radius:var(--tp-blade-border-radius,2px);" +
  "background:var(--tp-button-background-color,#adafb8);" +
  "color:var(--tp-button-foreground-color,#28292e);display:flex;" +
  "align-items:center;justify-content:center;cursor:pointer;" +
  "-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
  ".kp-sx-fold:hover{background:var(--tp-button-background-color-hover,#bbbcc4)}" +
  ".kp-sx-fold:active{background:var(--tp-button-background-color-active,#d6d7db)}" +
  ".kp-sx-fold svg{width:12px;height:12px}" +
  ".kp-sx-fold:focus-visible,.kp-sx-x:focus-visible" +
  "{outline:1px solid #8ea0c0;outline-offset:1px;opacity:1}" +
  // The count (a polite live region), shown only during a search.
  ".kp-sx-status{padding:4px 2px 0;font-size:.9em;line-height:1.2;" +
  "color:rgba(187,188,196,.62)}" +
  ".kp-sx-status:empty{display:none}" +
  ".kp-sx-none .kp-sx-status{color:#e7c56f}" +
  ".kp-sx-out{display:none!important}" +
  "mark.kp-sx-m{background:rgba(231,197,111,.2);color:#f3d27e;border-radius:2px}" +
  // The tag, option or key that matched when the label did not.
  ".tp-lblv_l[" + HINT + "]::after{content:'\\21B3\\00A0' attr(" + HINT + ");" +
  "display:block;margin-top:2px;font-size:.9em;font-style:italic;opacity:.62;" +
  "white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
  ".tp-btnv_t[" + HINT + "]::after{content:'\\00A0\\00B7\\00A0' attr(" + HINT + ");" +
  "font-style:italic;opacity:.7}" +
  // Enter's row, briefly.
  ".kp-sx-hit{outline:1px solid #e7c56f;outline-offset:-1px;border-radius:3px}" +
  "@media (pointer:coarse){.kp-sx-x{width:30px}.kp-sx-in{padding-right:30px}}";

let styled = false;
const injectStyle = (): void => {
  if (styled) return;
  styled = true;
  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.appendChild(style);
};

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls: string
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
};

const iconButton = (cls: string, label: string, svg: string): HTMLButtonElement => {
  const b = el("button", cls);
  b.type = "button";
  b.title = label;
  b.setAttribute("aria-label", label);
  b.innerHTML = svg;
  return b;
};

/** Hidden by a mode: `.tp-v-hidden` on the element or above it. */
const modeHidden = (e: Element): boolean => e.closest(".tp-v-hidden") !== null;

export function createPanelSearch(host: PanelSearchHost): PanelSearchUi {
  injectStyle();
  const bar = el("div", "kp-sx");
  bar.setAttribute("role", "search");
  const row = el("div", "kp-sx-row");
  const field = el("div", "kp-sx-field");
  const mag = el("span", "kp-sx-mag");
  mag.innerHTML = MAG_SVG;
  const input = el("input", "kp-sx-in");
  input.type = "search";
  input.placeholder = "Search settings";
  input.setAttribute("aria-label", "Search settings");
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("autocapitalize", "off");
  input.setAttribute("autocorrect", "off");
  input.setAttribute("enterkeyhint", "search");
  const clearBtn = iconButton("kp-sx-x", "Clear search", X_SVG);
  field.append(mag, input, clearBtn);
  const collapseBtn = iconButton("kp-sx-fold", "Collapse all groups", COLLAPSE_SVG);
  const expandBtn = iconButton("kp-sx-fold", "Expand all groups", EXPAND_SVG);
  row.append(field, collapseBtn, expandBtn);
  const status = el("div", "kp-sx-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  bar.append(row, status);

  let rows: RowRec[] = [];
  let folders: FolderRec[] = [];
  let index: PanelSearchIndex = buildPanelIndex([]);
  let query = "";
  // null: no filter (an empty query).
  let matches: PanelMatch[] | null = null;
  let count = 0;
  let best: RowRec | null = null;
  // The search's start: each folder's state and the scroll, put back on
  // clear; and the folders the player opened or closed since.
  let noted: Map<FolderRec, boolean> | null = null;
  let notedScroll = 0;
  const chosen = new Set<FolderRec>();
  const marked = new Map<RowRec, { span: HTMLElement; text: Text }>();

  /** Opens or closes a folder without saving it (the search's own folds). */
  const setFold = (f: FolderRec, expanded: boolean): void => {
    if (f.api.expanded === expanded) return;
    host.muteFolds(true);
    try {
      f.api.expanded = expanded;
    } finally {
      host.muteFolds(false);
    }
  };

  const unmark = (r: RowRec): void => {
    const m = marked.get(r);
    if (!m) return;
    marked.delete(r);
    // Tweakpane may have replaced the text since (the Daily button's title).
    if (m.span.parentNode) m.span.replaceWith(m.text);
  };
  // Marks only when the label on screen is still the text indexed.
  const mark = (r: RowRec, ranges: ReadonlyArray<readonly [number, number]>): void => {
    unmark(r);
    const node = r.textEl?.firstChild;
    const label = r.entry.label;
    if (!node || node.nodeType !== Node.TEXT_NODE || ranges.length === 0) return;
    if ((node as Text).data !== label) return;
    const span = el("span", "kp-sx-l");
    let at = 0;
    for (const [a, b] of ranges) {
      if (a > at) span.append(label.slice(at, a));
      const m = el("mark", "kp-sx-m");
      m.textContent = label.slice(a, b);
      span.append(m);
      at = b;
    }
    if (at < label.length) span.append(label.slice(at));
    (node as Text).replaceWith(span);
    marked.set(r, { span, text: node as Text });
  };
  const setHint = (r: RowRec, hint: string | null): void => {
    if (!r.hintEl) return;
    if (hint) r.hintEl.setAttribute(HINT, hint);
    else r.hintEl.removeAttribute(HINT);
  };

  const setStatus = (n: number | null): void => {
    status.textContent =
      n === null ? "" : n === 0 ? "No settings match" : n === 1 ? "1 setting" : `${n} settings`;
    bar.classList.toggle("kp-sx-none", n === 0);
  };

  // The rows' classes, marks and hints: on a query change only.
  const applyMatches = (): void => {
    const hit = new Map<RowRec, PanelMatch>();
    for (const m of matches ?? []) {
      const r = rows[m.index];
      if (r) hit.set(r, m);
    }
    for (const r of rows) {
      const m = hit.get(r);
      r.el.classList.toggle(OUT, !m);
      if (m) {
        mark(r, m.ranges);
        setHint(r, m.hint);
      } else {
        unmark(r);
        setHint(r, null);
      }
    }
  };
  // What a mode lets show: the folders, the count, the best match. On a
  // query change, and after refreshCond. `opening`: also open the folders
  // with a match (a query change), except the ones the player chose.
  const applyModes = (opening: boolean): void => {
    const live = new Set<FolderRec>();
    count = 0;
    best = null;
    for (const r of rows) {
      if (r.el.classList.contains(OUT) || modeHidden(r.el)) continue;
      count++;
      for (const f of r.folders) live.add(f);
    }
    for (const m of matches ?? []) {
      const r = rows[m.index];
      if (r && !modeHidden(r.el)) {
        best = r;
        break;
      }
    }
    for (const f of folders) f.api.element.classList.toggle(OUT, !live.has(f));
    if (opening) {
      // Deepest first: a folder measures its height as it opens.
      const open = [...live]
        .filter((f) => !f.api.expanded && !chosen.has(f))
        .sort((a, b) => b.depth - a.depth);
      for (const f of open) setFold(f, true);
    }
    setStatus(count);
  };

  const beginSearch = (): void => {
    noted = new Map(folders.map((f) => [f, f.api.expanded]));
    notedScroll = host.scroller?.scrollTop ?? 0;
    chosen.clear();
  };
  const endSearch = (): void => {
    for (const r of rows) {
      r.el.classList.remove(OUT);
      unmark(r);
      setHint(r, null);
    }
    for (const f of folders) f.api.element.classList.remove(OUT);
    if (noted) {
      for (const f of [...folders].sort((a, b) => b.depth - a.depth)) {
        const was = noted.get(f);
        if (was !== undefined && !chosen.has(f)) setFold(f, was);
      }
    }
    noted = null;
    chosen.clear();
    matches = null;
    best = null;
    count = 0;
    setStatus(null);
    const sc = host.scroller;
    if (sc) {
      const y = notedScroll;
      sc.scrollTop = y;
      // Folders reopening grow over 0.2 s: the first set may be clamped.
      setTimeout(() => {
        if (matches === null && sc.scrollTop < y) sc.scrollTop = y;
      }, 260);
    }
  };

  const setQuery = (q: string): void => {
    if (input.value !== q) input.value = q;
    query = q;
    bar.classList.toggle("kp-sx-has", q.length > 0);
    const next = searchPanel(index, q);
    if (next === null) {
      if (matches !== null) {
        endSearch();
        host.onFilter?.();
      }
      return;
    }
    if (matches === null) beginSearch();
    matches = next;
    applyMatches();
    applyModes(true);
    // The results start at the top (the bar stays in view).
    if (host.scroller) host.scroller.scrollTop = 0;
    host.onFilter?.();
  };

  // The label as shown: the label cell's (a binding) or the title's (a
  // button) leading text node, else the blade's own label, else its key.
  const textOf = (e: HTMLElement | null): string => {
    const first = e?.firstChild;
    return first && first.nodeType === Node.TEXT_NODE ? (first as Text).data : "";
  };
  const labelOf = (r: RowRec, fallback: string): string => {
    const text = textOf(r.textEl);
    return text.trim().length > 0 ? text : fallback;
  };

  const walkRow = (b: BladeLike, chain: FolderRec[]): RowRec | null => {
    const e = b.element;
    if (!(e instanceof HTMLElement)) return null;
    const folderTitles = chain.map((f) => f.title);
    if (typeof b.key === "string") {
      const lab = e.querySelector<HTMLElement>(".tp-lblv_l");
      const options = Array.from(e.querySelectorAll("select option"), (o) =>
        (o.textContent ?? "").trim()
      ).filter((o) => o.length > 0);
      const r: RowRec = {
        entry: { id: b.key, label: "", tags: host.tags[b.key], folders: folderTitles, options },
        el: e,
        textEl: textOf(lab).trim() ? lab : null,
        hintEl: lab && !e.classList.contains("tp-lblv-nol") ? lab : null,
        folders: chain,
      };
      r.entry.label = labelOf(r, typeof b.label === "string" && b.label ? b.label : b.key);
      return r;
    }
    if (typeof b.title === "string") {
      // A button's id is its title when the panel built it, kept in
      // data-kp-id where the title changes later (the Daily's day number).
      const id = e.dataset.kpId ?? `btn:${b.title}`;
      const t = e.querySelector<HTMLElement>(".tp-btnv_t");
      const r: RowRec = {
        entry: { id, label: "", tags: host.tags[id], folders: folderTitles },
        el: e,
        textEl: t,
        hintEl: t,
        folders: chain,
      };
      r.entry.label = labelOf(r, b.title);
      return r;
    }
    return null;
  };

  const reindex = (): void => {
    const q = query;
    if (matches !== null) endSearch();
    rows = [];
    folders = [];
    const walk = (children: readonly unknown[], chain: FolderRec[]): void => {
      for (const c of children) {
        const b = c as BladeLike;
        if (!b || typeof b !== "object") continue;
        if (Array.isArray(b.children) && typeof b.expanded === "boolean") {
          if (!(b.element instanceof HTMLElement)) continue;
          const f: FolderRec = {
            api: b as unknown as FolderApiLike,
            title: typeof b.title === "string" ? b.title : "",
            depth: chain.length,
          };
          folders.push(f);
          walk(b.children as unknown[], [...chain, f]);
          continue;
        }
        const r = walkRow(b, chain);
        if (r) rows.push(r);
      }
    };
    walk(host.pane.children, []);
    index = buildPanelIndex(rows.map((r) => r.entry));
    if (q) setQuery(q);
  };
  const relabel = (): void => {
    for (const r of rows) {
      unmark(r);
      r.entry.label = labelOf(r, r.entry.label);
    }
    index = buildPanelIndex(rows.map((r) => r.entry));
    const next = matches === null ? null : searchPanel(index, query);
    if (next !== null) {
      matches = next;
      applyMatches();
      applyModes(false);
    }
  };

  const foldAll = (expanded: boolean): void => {
    // During a search: the folders it shows. Otherwise every folder.
    const targets = folders.filter(
      (f) =>
        matches === null ||
        (!f.api.element.classList.contains(OUT) && !modeHidden(f.api.element))
    );
    // Opening, deepest first (a folder measures its height as it opens);
    // closing, outermost first.
    targets.sort((a, b) => (expanded ? b.depth - a.depth : a.depth - b.depth));
    for (const f of targets) {
      setFold(f, expanded);
      // The player's choice: saved, and kept when the search clears.
      host.saveFold(f.title, expanded);
      if (matches !== null) chosen.add(f);
    }
  };

  const focusTarget = (r: RowRec): HTMLElement | null =>
    r.el.querySelector<HTMLElement>(FOCUSABLE.map((s) => `.tp-lblv_v ${s}`).join(",")) ??
    r.el.querySelector<HTMLElement>(FOCUSABLE.join(","));
  const scrollToRow = (r: RowRec): void => {
    const sc = host.scroller;
    if (!sc) return;
    const sr = sc.getBoundingClientRect();
    const rr = r.el.getBoundingClientRect();
    const barH = bar.offsetHeight;
    const room = sr.height - barH;
    const want = sc.scrollTop + (rr.top - sr.top) - barH - (room - rr.height) / 2;
    sc.scrollTop = Math.max(0, want);
  };
  const goBest = (): void => {
    const r = best;
    if (!r) return;
    let opened = false;
    for (const f of r.folders) {
      if (!f.api.expanded) {
        setFold(f, true);
        opened = true;
      }
    }
    const target = focusTarget(r);
    // On a touch screen a text field would keep the keyboard up: there
    // Enter shows the row and lets the keyboard go.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (target && !(coarse && target instanceof HTMLInputElement && target.type === "text")) {
      target.focus({ preventScroll: true });
    } else {
      input.blur();
    }
    const show = (): void => {
      scrollToRow(r);
      r.el.classList.add("kp-sx-hit");
      setTimeout(() => r.el.classList.remove("kp-sx-hit"), 1200);
    };
    if (opened) setTimeout(show, 230);
    else show();
  };

  input.addEventListener("input", () => setQuery(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (input.value) setQuery("");
      else input.blur();
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      goBest();
    }
  });
  clearBtn.addEventListener("click", () => {
    setQuery("");
    input.focus();
  });
  collapseBtn.addEventListener("click", () => foldAll(false));
  expandBtn.addEventListener("click", () => foldAll(true));

  return {
    bar,
    input,
    reindex,
    relabel,
    refresh: () => {
      if (matches !== null) applyModes(false);
    },
    setQuery,
    playerFold: (title) => {
      if (matches === null) return;
      const f = folders.find((x) => x.title === title);
      if (f) chosen.add(f);
    },
    collapseAll: () => foldAll(false),
    expandAll: () => foldAll(true),
    state: () => ({
      query,
      active: matches !== null,
      rows: rows.length,
      count: matches === null ? 0 : count,
      shown:
        matches === null
          ? []
          : rows
              .filter((r) => !r.el.classList.contains(OUT) && !modeHidden(r.el))
              .map((r) => r.entry.id),
      best: best?.entry.id ?? null,
      folders: Object.fromEntries(
        folders.map((f) => [
          f.title,
          {
            expanded: f.api.expanded,
            shown: !f.api.element.classList.contains(OUT) && !modeHidden(f.api.element),
          },
        ])
      ),
      hints: Object.fromEntries(
        rows
          .filter((r) => r.hintEl?.hasAttribute(HINT))
          .map((r) => [r.entry.id, r.hintEl?.getAttribute(HINT) ?? ""])
      ),
      marks: Object.fromEntries(
        [...marked].map(([r, m]) => [
          r.entry.id,
          Array.from(m.span.querySelectorAll("mark"), (x) => x.textContent ?? "").join("|"),
        ])
      ),
      status: status.textContent ?? "",
    }),
  };
}
