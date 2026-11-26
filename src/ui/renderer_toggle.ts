// TEMPORARY (Levi, 2026-11-25): the panel's "New renderer" checkbox only edits
// the link's `rp=gf&gfh=1` flags and reloads; no param, no codec, no undo.
// Remove it at the rp=gf flip.

// `search` is location.search; returns the search string to load, "?..." or "".
// On: drops any `rp`, `gfh` and `gfk`, appends `rp=gf&gfh=1`. Off: drops them only
// when `rp` is gf (another renderer's `rp` stays); `gfh`/`gfk` drop either way.
// Every other part (the seed token, overrides) is kept verbatim, in order.
export function rendererToggleSearch(search: string, on: boolean): string {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const keyOf = (part: string): string => {
    const eq = part.indexOf("=");
    return eq < 0 ? part : part.slice(0, eq);
  };
  const parts = query.split("&").filter((p) => p !== "");
  const kept = parts.filter((p) => {
    const k = keyOf(p);
    if (k === "gfh" || k === "gfk") return false;
    if (k === "rp") {
      if (on) return false;
      return p !== "rp=gf";
    }
    return true;
  });
  if (on) kept.push("rp=gf", "gfh=1");
  return kept.length ? `?${kept.join("&")}` : "";
}

export function rendererIsGf(search: string): boolean {
  return new URLSearchParams(search).get("rp") === "gf";
}

