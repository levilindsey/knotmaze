// K120 Part B: the MOVE PAD - a four-way pad in the bottom-right corner
// for touch screens, moving by direction exactly as the arrow keys do
// (ui/key_moves.ts: the same picker, the same hold). A finger down on an
// arm is a key press (the best-matching run, at once); kept down, the dot
// goes on at each junction until nothing matches; sliding to another arm is
// a press of that one; lifting it ends the hold. Each finger is its own
// "key" ("pad:<pointerId>"), so two fingers behave like two keys (the newer
// steers). A viewer preference (localStorage `knotmaze.movePad`, a panel
// checkbox), never a link param: on by default for coarse pointers, off for
// mice. main.ts shows it only while the keys are live (fabric mode, the
// intro over, unsolved).
import type { KeyDir } from "./key_moves";

export const MOVE_PAD_KEY = "knotmaze.movePad";
// CSS px: the pad's side, and the radius at its center that picks nothing
// (a finger resting there waits for a direction).
export const PAD_SIZE = 132;
export const PAD_DEAD = 14;
// K80 turns 3a: while the turn minotaur is on, the center is the WAIT
// button (a finger coming DOWN inside it waits a turn), its radius grown to
// this so a thumb finds it; the arms keep everything outside it.
export const PAD_WAIT = 22;

// The stored choice ("1" on, "0" off), else on for coarse pointers.
export function movePadPref(stored: string | null, coarse: boolean): boolean {
  if (stored === "1") return true;
  if (stored === "0") return false;
  return coarse;
}

// The arm under a point (dx, dy) from the pad's center, screen y down:
// four 90-degree sectors around the axes; null inside the dead radius.
// An exact diagonal goes to the vertical arm.
export function padDirAt(dx: number, dy: number, dead = PAD_DEAD): KeyDir | null {
  if (dx * dx + dy * dy < dead * dead) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

export interface MovePadHooks {
  // A finger came down on an arm, or slid onto one.
  press: (id: string, dir: KeyDir) => void;
  // That finger lifted, slid off its arm, or the pad hid.
  release: (id: string) => void;
  // K80 turns 3a: a finger came down on the center while it is the wait
  // button (setWait). Sliding into the center only releases the arm.
  wait?: () => void;
}

const CHEVRON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" ' +
  'fill="none" stroke="currentColor" stroke-width="2.6" ' +
  'stroke-linecap="round" stroke-linejoin="round"/></svg>';
// K80 turns 3a: the wait button's icon, an hourglass (the head's wait cue
// wears the same shape: marker_glyphs.ts "hourglass").
const HOURGLASS =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12M6 21h12' +
  'M8 3v4l8 10v4M16 3v4l-8 10v4" fill="none" stroke="currentColor" ' +
  'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ARMS: Array<{ dir: KeyDir; label: string; rot: number }> = [
  { dir: "up", label: "Move up", rot: 0 },
  { dir: "right", label: "Move right", rot: 90 },
  { dir: "down", label: "Move down", rot: 180 },
  { dir: "left", label: "Move left", rot: 270 },
];

function injectStyle(): void {
  if (document.getElementById("km-pad-style")) return;
  const st = document.createElement("style");
  st.id = "km-pad-style";
  const arm = PAD_SIZE / 3;
  st.textContent =
    `.km-pad{position:fixed;z-index:18;width:${PAD_SIZE}px;height:${PAD_SIZE}px;` +
    "right:max(16px,env(safe-area-inset-right));" +
    "bottom:max(16px,env(safe-area-inset-bottom));" +
    "border-radius:50%;background:#1b2233b8;box-shadow:0 0 0 1px #3a4254 inset;" +
    "touch-action:none;user-select:none;-webkit-user-select:none;" +
    "-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}" +
    ".km-pad[hidden]{display:none}" +
    `.km-pad-arm{position:absolute;width:${arm}px;height:${arm}px;` +
    "display:flex;align-items:center;justify-content:center;" +
    "border-radius:50%;color:#c9d3e6;pointer-events:none}" +
    ".km-pad-arm svg{width:24px;height:24px}" +
    ".km-pad-arm.km-on{background:#e4ecf833;color:#ffffff}" +
    `.km-pad-wait{position:absolute;width:${2 * PAD_WAIT}px;` +
    `height:${2 * PAD_WAIT}px;left:${PAD_SIZE / 2 - PAD_WAIT}px;` +
    `top:${PAD_SIZE / 2 - PAD_WAIT}px;border-radius:50%;` +
    "display:flex;align-items:center;justify-content:center;" +
    "box-shadow:0 0 0 1px #3a4254 inset;color:#c9d3e6;pointer-events:none}" +
    ".km-pad-wait[hidden]{display:none}" +
    ".km-pad-wait svg{width:20px;height:20px}" +
    ".km-pad-wait.km-on{background:#e4ecf833;color:#ffffff}";
  document.head.appendChild(st);
}

export class MovePad {
  readonly el: HTMLDivElement;
  private readonly arms = new Map<KeyDir, HTMLDivElement>();
  // Each finger on the pad and the arm it holds (null: in the dead zone).
  private readonly fingers = new Map<number, KeyDir | null>();
  private shown = false;
  private readonly hooks: MovePadHooks;
  // K80 turns 3a: the center is the wait button; the fingers that came
  // down on it and have not left it (they light it).
  private readonly waitEl: HTMLDivElement;
  private waitOn = false;
  private readonly waiting = new Set<number>();

  constructor(hooks: MovePadHooks) {
    this.hooks = hooks;
    injectStyle();
    const el = document.createElement("div");
    el.className = "km-pad";
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Move");
    el.hidden = true;
    const arm = PAD_SIZE / 3;
    const at: Record<KeyDir, [number, number]> = {
      up: [arm, 0],
      right: [2 * arm, arm],
      down: [arm, 2 * arm],
      left: [0, arm],
    };
    for (const a of ARMS) {
      const d = document.createElement("div");
      d.className = "km-pad-arm";
      d.setAttribute("role", "button");
      d.setAttribute("aria-label", a.label);
      d.style.left = `${at[a.dir][0]}px`;
      d.style.top = `${at[a.dir][1]}px`;
      d.innerHTML = CHEVRON;
      (d.firstElementChild as SVGElement).style.transform = `rotate(${a.rot}deg)`;
      el.appendChild(d);
      this.arms.set(a.dir, d);
    }
    const wb = document.createElement("div");
    wb.className = "km-pad-wait";
    wb.setAttribute("role", "button");
    wb.setAttribute("aria-label", "Wait");
    wb.innerHTML = HOURGLASS;
    wb.hidden = true;
    el.appendChild(wb);
    this.waitEl = wb;
    el.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // A pointer that is already gone: its up event never comes.
      }
      this.fingers.set(e.pointerId, null);
      // K80 turns 3a: a finger DOWN on the center waits a turn.
      if (this.waitOn && this.centerDir(e) === null) {
        this.waiting.add(e.pointerId);
        this.hooks.wait?.();
        this.paint();
      }
      this.track(e);
    });
    el.addEventListener("pointermove", (e) => {
      if (this.fingers.has(e.pointerId)) this.track(e);
    });
    const end = (e: PointerEvent): void => this.lift(e.pointerId);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("lostpointercapture", end);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    document.body.appendChild(el);
    this.el = el;
  }

  // Shown while the keys are live and the preference is on; hiding lifts
  // every finger (a hold must not outlive its pad).
  setShown(v: boolean): void {
    if (v === this.shown) return;
    this.shown = v;
    this.el.hidden = !v;
    if (!v) for (const id of [...this.fingers.keys()]) this.lift(id);
  }

  get isShown(): boolean {
    return this.shown;
  }

  // K80 turns 3a: the center is the wait button (the turn minotaur is on):
  // shown, and the arms start at PAD_WAIT instead of PAD_DEAD.
  setWait(v: boolean): void {
    if (v === this.waitOn) return;
    this.waitOn = v;
    this.waitEl.hidden = !v;
    if (!v) this.waiting.clear();
    this.paint();
  }

  get isWait(): boolean {
    return this.waitOn;
  }

  // The arm under a pointer, or null in the center (PAD_WAIT while the
  // center waits, else PAD_DEAD).
  private centerDir(e: PointerEvent): KeyDir | null {
    const r = this.el.getBoundingClientRect();
    return padDirAt(
      e.clientX - (r.left + r.width / 2),
      e.clientY - (r.top + r.height / 2),
      this.waitOn ? PAD_WAIT : PAD_DEAD
    );
  }

  private track(e: PointerEvent): void {
    const dir = this.centerDir(e);
    if (dir !== null && this.waiting.delete(e.pointerId)) this.paint();
    const prev = this.fingers.get(e.pointerId) ?? null;
    if (dir === prev) return;
    const id = `pad:${e.pointerId}`;
    if (prev !== null) this.hooks.release(id);
    this.fingers.set(e.pointerId, dir);
    if (dir !== null) this.hooks.press(id, dir);
    this.paint();
  }

  private lift(pointerId: number): void {
    if (!this.fingers.has(pointerId)) return;
    const prev = this.fingers.get(pointerId) ?? null;
    this.fingers.delete(pointerId);
    this.waiting.delete(pointerId);
    if (prev !== null) this.hooks.release(`pad:${pointerId}`);
    this.paint();
  }

  private paint(): void {
    const on = new Set([...this.fingers.values()].filter((d) => d !== null));
    for (const [dir, d] of this.arms) d.classList.toggle("km-on", on.has(dir));
    this.waitEl.classList.toggle("km-on", this.waitOn && this.waiting.size > 0);
  }
}
