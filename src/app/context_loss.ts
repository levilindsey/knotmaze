// K456: surviving a lost WebGL context (docs/design/K456.md, "Design").
//
// Pixi restores its own resources and every custom data texture after a
// `webglcontextrestored`; what it cannot do is draw while the context is
// gone, refill the background's RenderTexture, or wake the on-demand loop.
// This file holds the parts that are not the frame loop's:
// - ContextLossModel: the pure state (lost, how long it has been lost
//   while visible, when the message is due);
// - installContextLoss: the canvas listeners, wired by main.ts to save the
//   attempt, hide the game clock, suspend the loop and refuse input;
// - createLossCover: the full-screen cover in the page's ink (so the white
//   canvas never shows and no tap reaches the blind game), with a message
//   and a Reload button once the loss has lasted MESSAGE_DELAY_MS.
// With no loss nothing here runs and no element exists, so every pixel
// stays as it is. No automatic reload: a GPU that keeps failing must not
// loop the page.

// Visible lost time before the cover says what happened.
export const MESSAGE_DELAY_MS = 3000;
// How often a lost page checks whether the message is due.
export const LOSS_POLL_MS = 250;

export class ContextLossModel {
  lost = false;
  losses = 0;
  restores = 0;
  // Lost time while the page was visible, since the current loss began.
  visibleMs = 0;
  showMessage = false;
  private last = 0;
  private hidden = false;

  // A loss began at `now`. False when one is already in progress.
  lose(now: number, hidden: boolean): boolean {
    if (this.lost) return false;
    this.lost = true;
    this.losses++;
    this.visibleMs = 0;
    this.showMessage = false;
    this.last = now;
    this.hidden = hidden;
    return true;
  }

  // Counts the time since the last call (visible time only: a hidden
  // page's loss is nobody's frozen screen). True once, when the message
  // becomes due.
  tick(now: number, hidden: boolean): boolean {
    if (!this.lost) return false;
    if (!this.hidden) this.visibleMs += Math.max(0, now - this.last);
    this.last = now;
    this.hidden = hidden;
    if (!this.showMessage && this.visibleMs >= MESSAGE_DELAY_MS) {
      this.showMessage = true;
      return true;
    }
    return false;
  }

  // The context came back. False when none was lost.
  restore(): boolean {
    if (!this.lost) return false;
    this.lost = false;
    this.restores++;
    this.showMessage = false;
    this.visibleMs = 0;
    return true;
  }
}

export interface LossCover {
  show(): void;
  message(): void;
  hide(): void;
}

export interface ContextLossDeps {
  canvas: EventTarget;
  // Runs after the cover is up: save, hide the clock, suspend, drop keys.
  onLost(): void;
  // Runs after Pixi's own restore (its listener was added first).
  onRestored(): void;
  cover: LossCover;
  isHidden(): boolean;
  now(): number;
  setInterval?: (fn: () => void, ms: number) => unknown;
  clearInterval?: (id: unknown) => void;
}

export interface ContextLossReport {
  lost: boolean;
  losses: number;
  restores: number;
  message: boolean;
  visibleMs: number;
}

export interface ContextLossHandle {
  readonly lost: boolean;
  report(): ContextLossReport;
  dispose(): void;
}

export function installContextLoss(deps: ContextLossDeps): ContextLossHandle {
  const model = new ContextLossModel();
  const every =
    deps.setInterval ??
    ((fn: () => void, ms: number): unknown => globalThis.setInterval(fn, ms));
  const stop =
    deps.clearInterval ??
    ((id: unknown): void =>
      globalThis.clearInterval(id as ReturnType<typeof setInterval>));
  let timer: unknown = null;
  const clearTimer = (): void => {
    if (timer !== null) {
      stop(timer);
      timer = null;
    }
  };
  const onLost = (e: Event): void => {
    // Pixi's listener already does this; a restore needs it.
    e.preventDefault();
    if (!model.lose(deps.now(), deps.isHidden())) return;
    deps.cover.show();
    try {
      deps.onLost();
    } catch (err) {
      console.warn("K456: handling the lost WebGL context failed", err);
    }
    clearTimer();
    timer = every(() => {
      if (model.tick(deps.now(), deps.isHidden())) deps.cover.message();
    }, LOSS_POLL_MS);
  };
  const onRestored = (): void => {
    if (!model.restore()) return;
    clearTimer();
    deps.cover.hide();
    try {
      deps.onRestored();
    } catch (err) {
      console.warn("K456: resuming after the WebGL restore failed", err);
    }
  };
  deps.canvas.addEventListener("webglcontextlost", onLost);
  deps.canvas.addEventListener("webglcontextrestored", onRestored);
  return {
    get lost() {
      return model.lost;
    },
    report: () => ({
      lost: model.lost,
      losses: model.losses,
      restores: model.restores,
      message: model.showMessage,
      visibleMs: model.visibleMs,
    }),
    dispose: () => {
      deps.canvas.removeEventListener("webglcontextlost", onLost);
      deps.canvas.removeEventListener("webglcontextrestored", onRestored);
      clearTimer();
    },
  };
}

export const LOSS_COVER_ID = "km-gl-lost";
const SANS = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";

// The cover: created at the first loss, removed at the restore. Above all
// the chrome (the toast is z-index 60), and it takes every pointer, so the
// blind game gets no taps and the move pad (under it) no fingers.
export function createLossCover(
  doc: Document,
  ink: () => string,
  reload: () => void
): LossCover {
  let el: HTMLDivElement | null = null;
  let box: HTMLDivElement | null = null;
  return {
    show() {
      if (el) return;
      el = doc.createElement("div");
      el.id = LOSS_COVER_ID;
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      el.style.cssText =
        "position:fixed;inset:0;z-index:100;display:flex;" +
        "align-items:center;justify-content:center;pointer-events:auto;" +
        "touch-action:none;user-select:none;";
      el.style.background = ink() || "#151b28";
      doc.body.appendChild(el);
    },
    message() {
      if (!el || box) return;
      box = doc.createElement("div");
      box.style.cssText =
        "max-width:320px;margin:0 16px;padding:20px;border-radius:10px;" +
        `background:#1b2233;color:#c8d3e8;font:14px/1.4 ${SANS};` +
        "text-align:center;";
      const head = doc.createElement("div");
      head.textContent = "Graphics paused";
      head.style.cssText = "font-weight:600;font-size:16px;color:#e4ecf8;";
      const text = doc.createElement("div");
      text.textContent =
        "The browser lost the graphics context. Your progress is saved.";
      text.style.cssText = "margin-top:6px;color:#8ea0c0;";
      const button = doc.createElement("button");
      button.type = "button";
      button.textContent = "Reload";
      const coarse =
        typeof matchMedia === "function" &&
        matchMedia("(pointer: coarse)").matches;
      button.style.cssText =
        "margin-top:14px;background:#e7c56f;color:#1b2233;border:0;" +
        `border-radius:7px;min-height:${coarse ? 40 : 32}px;` +
        `padding:0 14px;font:600 13px/1 ${SANS};cursor:pointer;`;
      button.addEventListener("click", () => reload());
      box.append(head, text, button);
      el.appendChild(box);
    },
    hide() {
      el?.remove();
      el = null;
      box = null;
    },
  };
}
