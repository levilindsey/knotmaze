// Vite config for scripts/fold_census.ts (loaded by
// scripts/run_node.mjs --config): a PRIVATE deps cache in the
// untracked .claude/probes/K90/ (an agent worktree's node_modules is a
// junction to the main checkout's, whose .vite cache serves other agents'
// dev servers).
export default {
  cacheDir: new URL("../.claude/probes/K90/vite-cache-census", import.meta.url).pathname.replace(
    /^\/([A-Za-z]:)/,
    "$1"
  ),
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
};
