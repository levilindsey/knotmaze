// Sharing a result (K20, K33): the phone's native share sheet where there
// is one, else the clipboard. Desktop browsers that also expose
// navigator.share (Chrome and Edge on Windows) get the clipboard - their
// share dialogs are a detour for pasting a result into a chat.

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

const coarse = (): boolean => {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
};

export async function shareOrCopy(
  text: string,
  url: string
): Promise<ShareOutcome> {
  const nav = navigator as Navigator & {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: ShareData) => boolean;
  };
  const data: ShareData = { text, url };
  if (typeof nav.share === "function" && coarse()) {
    try {
      if (nav.canShare?.(data) !== false) {
        await nav.share(data);
        return "shared";
      }
    } catch (e) {
      // The player closed the sheet: nothing else to do.
      if (e instanceof DOMException && e.name === "AbortError") {
        return "cancelled";
      }
      // Otherwise (not allowed here, no targets): copy instead.
    }
  }
  return (await copyText(`${text}\n${url}`)) ? "copied" : "failed";
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Denied or unavailable: the old way below.
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-1000px;left:0;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

// A short message near the bottom of the screen that fades by itself.
let toastEl: HTMLDivElement | null = null;
let toastTimer = 0;
export function showToast(message: string): void {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "km-toast";
    toastEl.setAttribute("role", "status");
    toastEl.setAttribute("aria-live", "polite");
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.add("km-toast-on");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => toastEl?.classList.remove("km-toast-on"),
    2200
  );
}
