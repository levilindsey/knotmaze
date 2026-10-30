// Vite config for scripts/panel_inventory.ts (K339; loaded by
// scripts/run_node.mjs --config): "tweakpane"
// resolves to the recording stub, and the deps cache is PRIVATE, in the
// untracked .claude/probes/K339/ (an agent worktree's node_modules is a
// junction to the main checkout's, whose .vite cache serves other agents'
// dev servers).
const local = (rel) =>
  new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

export default {
  cacheDir: local("../.claude/probes/K339/vite-cache-inventory"),
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: {
    alias: [{ find: /^tweakpane$/, replacement: local("./panel_inventory_stub.ts") }],
  },
};
