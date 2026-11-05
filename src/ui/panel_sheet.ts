// K468: THE SETTINGS SHEET on phones (lore: .claude/rules/gameplay-panel.md,
// THE SHEET ON PHONES). On a phone the open panel fills the screen instead
// of a 320 px column over the maze. PURE pieces, tested in
// test/ui/panel_sheet.test.ts: the layout rule, whether the panel starts
// open, and the history entry that makes Android's Back button close the
// sheet. The DOM and the CSS are tweakpane_panel.ts's.

// A window this narrow, or a touch screen this short (a phone in landscape,
// 753x411), gets the sheet. Tablets and desktops keep the side panel.
export const SHEET_MAX_WIDTH = 700;
export const SHEET_MAX_HEIGHT = 500;

// The one media query every sheet rule is written under (the panel's, the
// badge's) and matchMedia reads. A comma is "or"; "and" binds tighter.
export const SHEET_QUERY =
  `(max-width: ${SHEET_MAX_WIDTH}px), ` +
  `(pointer: coarse) and (max-height: ${SHEET_MAX_HEIGHT}px)`;

// The same rule on numbers (what SHEET_QUERY means).
export function sheetLayout(
  width: number,
  height: number,
  coarsePointer: boolean
): boolean {
  return (
    width <= SHEET_MAX_WIDTH || (coarsePointer && height <= SHEET_MAX_HEIGHT)
  );
}

// K482: row help (the label as a button: role, Tab stop, tap to open) is
// touch-only. A coarse pointer or the sheet gets it; a fine-pointer side
// panel keeps the native title tooltip and one Tab stop per row.
export function helpEnabled(coarsePointer: boolean, sheet: boolean): boolean {
  return coarsePointer || sheet;
}

// K483: the sheet's font, px (Tweakpane's side panel stays at its 11).
export const SHEET_FONT_PX = 13;
// Whether the panel starts open. A sheet never does, whatever was stored (it
// would cover the page on every load); otherwise the stored choice, else
// open on roomy, pointer-precise screens (`roomy`).
export function panelStartsOpen(
  sheet: boolean,
  stored: string | null,
  roomy: boolean
): boolean {
  if (sheet) return false;
  if (stored !== null) return stored === "1";
  return roomy;
}

// The history entry's state: marks the entry the open sheet pushed. (The
// app's own writes replace it with null soon enough; the one read is the
// load reconcile below, which runs before the fresh page's first write.)
export const SHEET_STATE = { kmSheet: 1 } as const;

export interface SheetHistoryEnv {
  // Whether the current entry carries the sheet mark (history.state's
  // kmSheet): true when the page has loaded on an entry a previous,
  // now-dead page's sheet pushed (a reload or discard with it open).
  sheetMark?: () => boolean;
  // history.pushState(SHEET_STATE, ""): a new entry at the same URL.
  push: (state: unknown) => void;
  // history.back().
  back: () => void;
}

export interface SheetHistoryHooks {
  // Back closed the sheet: hide it (without asking the history again).
  close: () => void;
  // After any pop of ours: write the current design's link again. The entry
  // Back returned to holds the link from before the sheet opened, and the
  // edits made meanwhile went to the pushed entry (the app replaces the
  // address bar, never pushes).
  rewriteLink: () => void;
}

// An open sheet owns one history entry. Back pops it and closes the sheet; a
// close by the button (or by a switch to the side panel) pops it too. A pop
// we asked for is counted, so a quick close-then-reopen is not closed again
// by the first pop's event.
export class SheetHistory {
  private pushed = false;
  private pending = 0;
  // An open() that arrived while our counted pop was still in flight: it
  // wants its push when that pop lands, so the reopened sheet ends with
  // exactly one entry however fast the close-then-reopen cycle ran.
  private wantPush = false;
  private loadReconciled = false;
  private readonly env: SheetHistoryEnv;
  private readonly hooks: SheetHistoryHooks;

  constructor(env: SheetHistoryEnv, hooks: SheetHistoryHooks) {
    this.env = env;
    this.hooks = hooks;
  }

  // The sheet is open and has an entry.
  get owned(): boolean {
    return this.pushed;
  }

  // The sheet opened: take an entry, once.
  open(): void {
    if (this.pushed || this.wantPush) return;
    // A counted pop is still in flight (a close just asked for its entry
    // back): pushing now would stack a second entry the pop cannot take.
    // Defer the push until onPop spends that pop.
    if (this.pending > 0) {
      this.wantPush = true;
      return;
    }
    this.env.push(SHEET_STATE);
    this.pushed = true;
  }

  // Once, at load: the page has loaded (sheet closed, as it always starts)
  // on an entry a dead page's sheet pushed. Consume that stale entry the
  // way release() consumes an owned one — a counted back whose pop only
  // rewrites the link — so the player's first Back behaves as a fresh
  // page's would instead of spending itself on the dead entry.
  reconcileOnLoad(): void {
    if (this.loadReconciled) return;
    this.loadReconciled = true;
    if (this.pushed || this.wantPush) return;
    if (!this.env.sheetMark?.()) return;
    this.pending++;
    this.env.back();
  }

  // The sheet closed some way other than Back: give the entry back.
  release(): void {
    // A deferred push is cancelled, not given back: no entry was taken.
    if (this.wantPush) {
      this.wantPush = false;
      return;
    }
    if (!this.pushed) return;
    this.pushed = false;
    this.pending++;
    this.env.back();
  }

  // The window's popstate. The app pushes nothing else, so every pop is the
  // sheet's: ours (counted), Back (closes the sheet), or a walk across a stale
  // sheet entry (Forward, or Back after a reload left one): whichever, the
  // entry it landed on holds an old link, and the page on screen is the truth.
  onPop(): void {
    if (this.pending > 0) {
      this.pending--;
      this.hooks.rewriteLink();
      // The counted pop has landed: a sheet reopened during its flight
      // takes its (single) entry now.
      if (this.wantPush) {
        this.wantPush = false;
        this.env.push(SHEET_STATE);
        this.pushed = true;
      }
      return;
    }
    if (this.pushed) {
      this.pushed = false;
      this.hooks.close();
    }
    this.hooks.rewriteLink();
  }
}
