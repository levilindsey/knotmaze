// K1458: the panel's link rewrite keeps the URL-only flags the page read at load
// (rp=gf, gfh=1, ...), so a reload after a slider drag keeps the renderer.
import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeParams, parseParams, urlOnlyFlags, writeParams } from "../../src/ui/url_state";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("K1458 URL-only flags", () => {
  it("keeps the flags that are no param, drops the token and every param key", () => {
    expect(urlOnlyFlags("?3&xp=off&am=instant&prp=off&rp=gf&gfh=1&fl=1.2")).toBe("&rp=gf&gfh=1");
    expect(urlOnlyFlags("?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1")).toBe("&rp=gf&gfh=1");
    expect(urlOnlyFlags("?3.FGH1HtvQeDjm6e4BII")).toBe("");
    expect(urlOnlyFlags("")).toBe("");
    expect(urlOnlyFlags("?rp=gf&gfk=0&gln=0")).toBe("&rp=gf&gfk=0&gln=0");
  });

  it("drops the seed keys and the daily", () => {
    expect(urlOnlyFlags("?s=1471kin&rp=gf&tw=.64")).toBe("&rp=gf");
    expect(urlOnlyFlags("?seed=42&rp=gf")).toBe("&rp=gf");
    expect(urlOnlyFlags("?daily=3&rp=gf")).toBe("&rp=gf");
  });

  it("a slider rewrite keeps rp=gf and gfh=1, and the reload reads the slider's value", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("history", { replaceState });
    const search = "?3&xp=off&am=instant&prp=off&rp=gf&gfh=1&fl=0.14";
    vi.stubGlobal("location", { search });
    const p = parseParams(search);
    p.fadeLength = 1.2;
    writeParams(p);
    const written = replaceState.mock.calls[0][2] as string;
    expect(written).toBe(`?${encodeParams(p)}&rp=gf&gfh=1`);
    const sp = new URLSearchParams(written);
    expect(sp.get("rp")).toBe("gf");
    expect(sp.get("gfh")).toBe("1");
    expect(parseParams(written).fadeLength).toBe(1.2);
    // a second rewrite (the address now holds the token) keeps them once
    vi.stubGlobal("location", { search: written });
    p.fadeLength = 0.5;
    writeParams(p);
    expect(replaceState.mock.calls[1][2]).toBe(`?${encodeParams(p)}&rp=gf&gfh=1`);
  });
});
