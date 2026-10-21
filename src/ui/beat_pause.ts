// K114's beat rider: THE PAUSE CONTROL (brief docs/design/K114_beat.md,
// item 5). Under clock=beat the dot never stops, so the game gets a pause:
// a round button at the bottom left (the cut's corner: the cut and the
// walker are off under the beat), shown while the beat plays. Pressed, it
// holds the beat clock (main.ts: BeatFrame.setHeld) and HIDES THE MAZE
// until it is pressed again, so a pause cannot be used to study the board
// mid-run; a hidden canvas also takes no taps. It carries `km-control`
// (share.ts TOAST_AVOID_CLASS), so the toasts rise above it.
const STYLE_ID = "km-beat-pause-style";
const PAUSE_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
const PLAY_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent =
    ".km-beat-pause{position:fixed;z-index:18;visibility:hidden;" +
    "left:max(16px,env(safe-area-inset-left));" +
    "bottom:max(24px,calc(env(safe-area-inset-bottom) + 12px));" +
    "width:48px;height:48px;border-radius:24px;border:0;padding:0;margin:0;" +
    "display:flex;align-items:center;justify-content:center;" +
    "background:#1b2233b8;box-shadow:0 0 0 1px #3a4254 inset;color:#c9d3e6;" +
    "cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".km-beat-pause.km-on{visibility:visible}" +
    ".km-beat-pause svg{width:22px;height:22px}" +
    ".km-beat-pause:hover{background:#2a3247d0;color:#e4ecf8}" +
    ".km-beat-pause:focus-visible{outline:2px solid #8ea0c0;outline-offset:2px}" +
    ":root[data-beat-paused='1'] canvas{visibility:hidden}" +
    ".km-beat-paused-label{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);" +
    "z-index:17;pointer-events:none;display:none;color:#e4ecf8;" +
    "background:#1b2233e0;padding:10px 20px;border-radius:22px;" +
    "font:600 20px/1.2 system-ui,sans-serif;letter-spacing:0.08em}" +
    ":root[data-beat-paused='1'] .km-beat-paused-label{display:block}";
  document.head.appendChild(s);
}

export interface BeatPause {
  readonly el: HTMLButtonElement;
  readonly isHeld: boolean;
  setShown(on: boolean): void;
  setHeld(held: boolean): void;
  covered(rect: DOMRect): boolean;
}

// `onToggle` runs on a press with the new state (true: paused).
export function createBeatPause(onToggle: (held: boolean) => void): BeatPause {
  injectStyle();
  const el = document.createElement("button");
  el.type = "button";
  el.className = "km-control km-beat-pause";
  const label = document.createElement("div");
  label.className = "km-beat-paused-label";
  label.textContent = "Paused";
  document.body.appendChild(el);
  document.body.appendChild(label);
  let held = false;
  let shown = false;
  const paint = (): void => {
    el.innerHTML = held ? PLAY_SVG : PAUSE_SVG;
    el.setAttribute("aria-label", held ? "Resume beat" : "Pause beat");
    el.setAttribute("aria-pressed", held ? "true" : "false");
    el.title = held ? "Resume" : "Pause";
  };
  const setHeld = (h: boolean): void => {
    if (h === held) return;
    held = h;
    paint();
    if (held) document.documentElement.dataset.beatPaused = "1";
    else delete document.documentElement.dataset.beatPaused;
  };
  paint();
  el.addEventListener("click", (e) => {
    e.preventDefault();
    const next = !held;
    setHeld(next);
    onToggle(next);
  });
  return {
    el,
    get isHeld() {
      return held;
    },
    setShown(on: boolean) {
      if (on === shown) return;
      shown = on;
      el.classList.toggle("km-on", on);
    },
    setHeld,
    covered(r: DOMRect) {
      const b = el.getBoundingClientRect();
      return b.right > r.left && b.left < r.right && b.bottom > r.top && b.top < r.bottom;
    },
  };
}
