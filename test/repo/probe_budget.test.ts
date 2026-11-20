import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// K1467 (Muse batch 26 Run W): tracked probe output under .claude/probes
// stays within 100 MB of the total the K1467 untrack left (515,196,231
// bytes in 6,005 files at 33f755fc1). A single force-add of sheets like
// K1493's (362 MB in one commit) trips this. Untrack closed items'
// output with `git rm --cached` (the files stay on disk and in history);
// only tools and the sheets a brief names may be force-added
// (.claude/rules/probes.md). Skips where there is no git checkout.
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const BUDGET_BYTES = 620_053_831; // 515,196,231 + 100 MiB

function trackedProbeBytes(): number | null {
  if (!existsSync(join(ROOT, ".git"))) return null;
  let raw: string;
  try {
    raw = execFileSync("git", ["ls-tree", "-r", "-l", "HEAD", "--", ".claude/probes"], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
  let total = 0;
  for (const line of raw.split("\n")) {
    const tab = line.indexOf("\t");
    if (tab < 0) continue;
    const size = Number(line.slice(0, tab).trim().split(/\s+/).pop());
    if (Number.isFinite(size)) total += size;
  }
  return total;
}

const total = trackedProbeBytes();

describe("K1467 probe budget", () => {
  it.skipIf(total === null)(
    "tracked .claude/probes total stays within the after-total + 100 MB",
    () => {
      const mb = ((total ?? 0) / 1048576).toFixed(1);
      const budgetMb = (BUDGET_BYTES / 1048576).toFixed(1);
      expect(
        total ?? 0,
        `tracked probe output is ${mb} MB, over the ${budgetMb} MB budget ` +
          `(K1467 after-total + 100 MB): untrack closed items' output with ` +
          `git rm --cached (files stay on disk), do not force-add sheets`,
      ).toBeLessThanOrEqual(BUDGET_BYTES);
    },
  );
});
