import { configDefaults, defineConfig } from "vitest/config";

// Agent worktrees live under .claude/worktrees/ INSIDE the repo; without
// an exclude, vitest's default glob sweeps every worktree's copy of the
// suite into one run (3x the files, failures from mid-work trees).
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
});
