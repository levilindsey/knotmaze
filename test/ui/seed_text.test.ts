import { describe, expect, it } from "vitest";
import { parseParams, seedFromText, seedText } from "../../src/ui/url_state";

describe("typed seeds (the panel's seed row)", () => {
  it("shows a seed as the link's base-36 token", () => {
    expect(seedText(2430477599)).toBe("1471kin");
    expect(parseParams(`?${seedText(2430477599)}`).seed).toBe(2430477599);
  });

  it("reads a typed token exactly as a link would, any case", () => {
    expect(seedFromText("1471kin")).toBe(2430477599);
    expect(seedFromText("  1471KIN ")).toBe(2430477599);
    expect(seedFromText("levi")).toBe(Number.parseInt("levi", 36));
  });

  it("hashes any other text to a stable seed", () => {
    const a = seedFromText("my maze");
    expect(a).not.toBeNull();
    expect(seedFromText("My Maze")).toBe(a);
    expect(seedFromText("my maze!")).not.toBe(a);
    expect(seedFromText("celticknot")).not.toBeNull(); // too long for a token
    // The hashed seed shows as a token that reads back to itself.
    expect(seedFromText(seedText(a!))).toBe(a);
  });

  it("treats blank text as no seed", () => {
    expect(seedFromText("")).toBeNull();
    expect(seedFromText("   ")).toBeNull();
  });
});
