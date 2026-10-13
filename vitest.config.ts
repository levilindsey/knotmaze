import { configDefaults, defineConfig } from "vitest/config";

// Agent worktrees live under .claude/worktrees/ INSIDE the repo; without
// an exclude, vitest's default glob sweeps every worktree's copy of the
// suite into one run (3x the files, failures from mid-work trees).
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/.claude/**"],
    // The suite is CPU-bound and CI's runner is slow and uneven: the plan
    // identity test ran in 2.6 s here, 4.1 s on one CI run and 7.7 s on
    // the next, past the 5 s default (the K108 deploy went red), and
    // several physics tests sit at 2-4 s there. Tests that need longer
    // still set their own timeout.
    testTimeout: 30000,
  },
});
