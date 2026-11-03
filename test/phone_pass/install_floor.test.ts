import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// K1124: install_floor.mjs refuses an A/A whose fabric samples sat at the
// finish (fab.solved: stars and confetti in the timing), exits 2 without
// --force and writes a PARTIAL floor with it; a clean A/A installs.
const repo = resolve(__dirname, "../..");
const installer = join(repo, "scripts", "phone_pass", "install_floor.mjs");

function fakeAa(finished: boolean): { dir: string; note: string; target: string } {
  const dir = mkdtempSync(join(tmpdir(), "k1124-"));
  mkdirSync(join(dir, "state"), { recursive: true });
  const cells: Record<string, Record<string, number>> = {
    "fabric@0": { fps: 1 },
    knot: { fps: 1 },
    "load-default": { fps: 1 },
    "load-slow": { fps: 1 },
  };
  writeFileSync(
    join(dir, "noise.json"),
    JSON.stringify({ from: "test", reps: 3, viewport: "411x753@2.625", emulated: true, display: "1080x2424 portrait", rule: "test", cells }),
  );
  const rows: string[] = [];
  for (let rep = 0; rep < 3; rep++) {
    for (const build of ["base", "head"]) {
      rows.push(JSON.stringify({ cell: "fabric", rep, build, moves: 0, fab: { solved: finished && rep === 0 && build === "base" } }));
      rows.push(JSON.stringify({ cell: "knot", rep, build }));
      rows.push(JSON.stringify({ cell: "load", rep, build, link: "default" }));
      rows.push(JSON.stringify({ cell: "load", rep, build, link: "slow" }));
    }
  }
  writeFileSync(join(dir, "bench.jsonl"), rows.join("\n") + "\n");
  const note = join(dir, "note.txt");
  writeFileSync(note, "test floor note\n");
  return { dir, note, target: join(dir, "installed.json") };
}

function run(dir: string, note: string, target: string, force: boolean): { code: number; text: string } {
  const args = [installer, dir, note, target, ...(force ? ["--force"] : [])];
  try {
    const text = execFileSync("node", args, { encoding: "utf8", timeout: 30000 });
    return { code: 0, text };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { code: err.status ?? -1, text: `${err.stdout ?? ""}\n${err.stderr ?? ""}` };
  }
}

describe("K1124 install_floor finish refusal", () => {
  it("refuses a finish sample without --force and writes nothing", () => {
    const { dir, note, target } = fakeAa(true);
    const r = run(dir, note, target, false);
    expect(r.code).toBe(2);
    expect(r.text).toContain("fabric samples taken at the finish: 1");
    expect(existsSync(target)).toBe(false);
  });

  it("writes a PARTIAL floor with --force, finish count in the note", () => {
    const { dir, note, target } = fakeAa(true);
    const r = run(dir, note, target, true);
    expect(r.code).toBe(0);
    const out = JSON.parse(readFileSync(target, "utf8"));
    expect(out.partial).toBe(true);
    expect(out.note).toContain("fabric samples taken at the finish: 1");
  });

  it("installs a clean A/A without --force", () => {
    const { dir, note, target } = fakeAa(false);
    const r = run(dir, note, target, false);
    expect(r.code).toBe(0);
    const out = JSON.parse(readFileSync(target, "utf8"));
    expect(out.partial).toBeUndefined();
    expect(out.reps).toBe(3);
  });
});
