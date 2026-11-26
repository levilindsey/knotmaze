import { describe, expect, it } from "vitest";
import { rendererIsGf, rendererToggleSearch as t } from "../../src/ui/renderer_toggle";

describe("rendererToggleSearch (temporary)", () => {
  it("bare ? and empty", () => {
    expect(t("?", true)).toBe("?rp=gf&gfh=1");
    expect(t("", true)).toBe("?rp=gf&gfh=1");
    expect(t("?", false)).toBe("");
  });
  it("seed-only and token links", () => {
    expect(t("?3", true)).toBe("?3&rp=gf&gfh=1");
    expect(t("?3.FGH1HtvQeDjm6e4BII", true)).toBe("?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1");
    expect(t("?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1", false)).toBe("?3.FGH1HtvQeDjm6e4BII");
  });
  it("keeps overrides in order", () => {
    expect(t("?3.AB&am=instant", true)).toBe("?3.AB&am=instant&rp=gf&gfh=1");
    expect(t("?3.AB&am=instant&rp=gf&gfh=1&oe=0", false)).toBe("?3.AB&am=instant&oe=0");
  });
  it("token with a trailing =", () => {
    expect(t("?3.AB=", true)).toBe("?3.AB=&rp=gf&gfh=1");
    expect(t("?3.AB=&rp=gf&gfh=1", false)).toBe("?3.AB=");
  });
  it("already on / already off", () => {
    expect(t("?3.AB&rp=gf&gfh=1", true)).toBe("?3.AB&rp=gf&gfh=1");
    expect(t("?3.AB&rp=gf&gfk=0", true)).toBe("?3.AB&rp=gf&gfh=1");
    expect(t("?3.AB", false)).toBe("?3.AB");
    expect(t("?3.AB&rp=gf&gfh=1&gfk=0", false)).toBe("?3.AB");
  });
  it("a non-gf rp: off leaves it, on replaces it", () => {
    expect(t("?3.AB&rp=outline", false)).toBe("?3.AB&rp=outline");
    expect(t("?3.AB&rp=sdf", false)).toBe("?3.AB&rp=sdf");
    expect(t("?3.AB&rp=outline", true)).toBe("?3.AB&rp=gf&gfh=1");
  });
  it("rendererIsGf", () => {
    expect(rendererIsGf("?3.AB&rp=gf")).toBe(true);
    expect(rendererIsGf("?3.AB&rp=sdf")).toBe(false);
    expect(rendererIsGf("")).toBe(false);
  });
});
