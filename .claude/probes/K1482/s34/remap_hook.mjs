// K1482 s34b: maps the probes' absolute main-checkout imports ("C:/Users/lsl/Repositories/knotmaze/...") to THIS worktree. Edit the target for another checkout.
export async function resolve(spec, ctx, next) {
  const P = "C:/Users/lsl/Repositories/knotmaze/";
  if (spec.startsWith(P)) spec = "file:///C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a43cedfab1488c9f2/" + spec.slice(P.length);
  return next(spec, ctx);
}
