// K748: keep a pointer click on an in-game button from leaving a focus
// ring behind. A mouse, pen or touch click focuses the button without
// showing its :focus-visible outline, but Chrome shows the outline as
// soon as the player presses a key (F, an arrow), and it stays until
// something else takes focus. Blurring in the click itself leaves focus
// on the page body, so the next key goes to the game with no ring.
// A keyboard user's Enter or Space click has detail 0 and never blurs:
// their focus and ring stay (probe .claude/probes/K748/focus.mjs).
export function blurOnPointerClick(el: HTMLElement): void {
  el.addEventListener("click", (event) => {
    if (event.detail <= 0) return;
    try {
      el.blur();
    } catch {
      // A blur that throws must not escape the listener.
    }
  });
}
