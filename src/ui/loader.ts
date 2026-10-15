import { whenReduced } from "./motion";

// The loading indicator: a trefoil knot (with real over/under gaps,
// alternating along the strand like the app's own weave) turning slowly in
// the middle of the screen. No text - it reads in any language. Rotation
// and breathing are CSS transforms, which the compositor animates even
// while a settle slice keeps the main thread busy.
export function createLoader(): { show: () => void; hide: () => void; el: HTMLElement } {
  const N = 240;
  const P: Array<[number, number]> = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    P.push([
      Math.sin(t) + 2 * Math.sin(2 * t),
      -(Math.cos(t) - 2 * Math.cos(2 * t)),
    ]);
  }
  // Self-intersections between non-adjacent chords -> crossing events
  // (parameter along the strand), then over/under alternating in order.
  const events: Array<{ s: number; id: number }> = [];
  let id = 0;
  for (let i = 0; i < N; i++) {
    const [ax, ay] = P[i];
    const [bx, by] = P[(i + 1) % N];
    for (let j = i + 2; j < N; j++) {
      if (i === 0 && j === N - 1) continue;
      const [cx, cy] = P[j];
      const [dx, dy] = P[(j + 1) % N];
      const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
      if (Math.abs(den) < 1e-12) continue;
      const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
      const v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
      if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
      events.push({ s: i + u, id }, { s: j + v, id });
      id++;
    }
  }
  events.sort((a, b) => a.s - b.s);
  // Every other event (along the strand) dives UNDER: cut a gap there,
  // 0.6 units of curve each side (the strand is 0.42 wide).
  let curve = 0;
  for (let i = 0; i < N; i++) {
    const [ax, ay] = P[i];
    const [bx, by] = P[(i + 1) % N];
    curve += Math.hypot(bx - ax, by - ay);
  }
  const GAP = 0.6 / (curve / N);
  const under = events.filter((_, k) => k % 2 === 1).map((e) => e.s);
  const inGap = (s: number): boolean =>
    under.some((g) => {
      const d = Math.abs(s - g);
      return Math.min(d, N - d) < GAP;
    });
  const pieces: string[] = [];
  let cur: string[] = [];
  // Start just past a gap so no piece straddles the parameter seam.
  const s0 = under.length > 0 ? Math.ceil(under[0] + GAP) : 0;
  for (let k = 0; k <= N; k++) {
    const s = (s0 + k) % N;
    if (inGap(s)) {
      if (cur.length > 1) pieces.push("M" + cur.join("L"));
      cur = [];
      continue;
    }
    cur.push(`${P[s][0].toFixed(3)} ${P[s][1].toFixed(3)}`);
  }
  if (cur.length > 1) pieces.push("M" + cur.join("L"));
  const el = document.createElement("div");
  el.id = "knot-loading";
  el.setAttribute("role", "progressbar");
  el.setAttribute("aria-busy", "true");
  el.setAttribute("aria-label", "Loading");
  el.style.cssText =
    "position:fixed;inset:0;display:flex;align-items:center;" +
    "justify-content:center;pointer-events:none;z-index:15;opacity:0;" +
    "visibility:hidden;transition:opacity .25s ease,visibility 0s .25s";
  const style = document.createElement("style");
  style.textContent =
    "@keyframes kl-spin{to{transform:rotate(360deg)}}" +
    "@keyframes kl-breathe{0%,100%{transform:scale(.9);opacity:.75}" +
    "50%{transform:scale(1.04);opacity:1}}" +
    "#knot-loading .kl-b{animation:kl-breathe 1.6s ease-in-out infinite;" +
    "will-change:transform,opacity}" +
    "#knot-loading svg{animation:kl-spin 3.2s linear infinite;" +
    "will-change:transform;overflow:visible}" +
    // Reduced motion (the Motion setting): a slow spin, no breathing.
    whenReduced("#knot-loading svg", "animation-duration:12s") +
    whenReduced("#knot-loading .kl-b", "animation:none");
  document.head.appendChild(style);
  el.innerHTML =
    '<div class="kl-b"><svg width="76" height="76" viewBox="-4 -4 8 8" ' +
    'aria-hidden="true"><g fill="none" stroke="#e7c56f" ' +
    'stroke-width="0.42" stroke-linecap="round" stroke-linejoin="round">' +
    pieces.map((d) => `<path d="${d}"/>`).join("") +
    "</g></svg></div>";
  document.body.appendChild(el);
  let timer = 0;
  return {
    el,
    // A short delay keeps fast settles from flashing the indicator.
    show: () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        el.style.transition = "opacity .25s ease,visibility 0s";
        el.style.visibility = "visible";
        el.style.opacity = "1";
      }, 120);
    },
    hide: () => {
      window.clearTimeout(timer);
      el.style.transition = "opacity .25s ease,visibility 0s .25s";
      el.style.opacity = "0";
      el.style.visibility = "hidden";
    },
  };
}
