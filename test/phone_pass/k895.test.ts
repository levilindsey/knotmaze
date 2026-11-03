import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// K895 (a)+(d): the kit's median averages at even n, and a measuring phase
// refuses (exit 5) once its pass has tripped, while summary/cleanup still run.
const repo = resolve(__dirname, "../..");
const kit = join(repo, "scripts", "phone_pass");
const passPs1 = join(repo, "scripts", "phone_pass.ps1");

function fakeOut(tripped: boolean): string {
  const out = mkdtempSync(join(tmpdir(), "k895-"));
  mkdirSync(join(out, "state"), { recursive: true });
  mkdirSync(join(out, "logs"), { recursive: true });
  const cfg = {
    out, adb: "", serial: "", dry: true, cdp: "http://127.0.0.1:9",
    hostA: "http://localhost:5490", hostB: "http://localhost:5491",
    portA: 5490, portB: 5491, refA: "base", refB: "head", shaA: "aaaa", shaB: "bbbb",
    aa: false, buildA: out, buildB: out, reps: 1, moves: [0], loadSeconds: 1,
    looks: "", noise: join(kit, "noise.json"), viewport: "portrait", display: "test",
    portRange: "5480-5489", serverPids: [], watchdogPid: 0, chromePid: 0,
    tabId: "", tunnels: [], forwardAdded: false,
  };
  writeFileSync(join(out, "config.json"), JSON.stringify(cfg));
  if (tripped) writeFileSync(join(out, "state", "watchdog.trip"), "12:00:00 test trip\n");
  return out;
}

function runPass(phase: string, out: string): { code: number; text: string } {
  try {
    const text = execFileSync(
      "pwsh",
      ["-NoProfile", "-File", passPs1, "-Phase", phase, "-Out", out],
      { encoding: "utf8", timeout: 60000 },
    );
    return { code: 0, text };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { code: err.status ?? -1, text: `${err.stdout ?? ""}\n${err.stderr ?? ""}` };
  }
}

describe("K895 phone_pass kit", () => {
  it("median averages the two middle values at even n", () => {
    const out = fakeOut(false);
    const script =
      `process.argv[2]=${JSON.stringify(join(out, "config.json"))};` +
      `const m=await import(${JSON.stringify("file:///" + join(kit, "lib.mjs").replace(/\\/g, "/"))});` +
      `console.log(JSON.stringify([m.median([]),m.median([5]),m.median([1,3,2]),m.median([10,20]),m.median([1,2,3,4])]));`;
    const text = execFileSync("node", ["--input-type=module", "-e", script], { encoding: "utf8", timeout: 30000 });
    expect(JSON.parse(text.trim())).toEqual([null, 5, 2, 15, 2.5]);
  });

  it("looks refuses with exit 5 once the pass has tripped", () => {
    const r = runPass("looks", fakeOut(true));
    expect(r.code).toBe(5);
    expect(r.text).toContain("WATCHDOG TRIPPED: phase 'looks' refuses to run");
  });

  it("frames refuses with exit 5 once the pass has tripped", () => {
    const r = runPass("frames", fakeOut(true));
    expect(r.code).toBe(5);
    expect(r.text).toContain("WATCHDOG TRIPPED: phase 'frames' refuses to run");
  });

  it("looks without a trip runs (skips with no -Looks) with exit 0", () => {
    const r = runPass("looks", fakeOut(false));
    expect(r.code).toBe(0);
    expect(r.text).toContain("no -Looks file; skipped");
  });

  it("summary and cleanup still run on a tripped pass (exit 2, not 5)", () => {
    const outS = fakeOut(true);
    const s = runPass("summary", outS);
    expect(s.code).toBe(2);
    expect(s.text).not.toContain("refuses to run");
    expect(existsSync(join(outS, "summary.md"))).toBe(true);
    const c = runPass("cleanup", fakeOut(true));
    expect(c.code).toBe(2);
    expect(c.text).not.toContain("refuses to run");
  });
});
