// K1438: the evaluator a probe runs (env K1438_EV: src | m | tgr; K1438_FL = fadeLength for src, or "tgr" = 0.3 win, the probe's ramp).
// The tables come from k1433_lib's tablesOf (buildTables with { aa }), so src's switch is env GF_HOME=1.
export async function loadEv(): Promise<(T: any) => any> {
  const ev = process.env.K1438_EV ?? "src";
  if (ev === "m") { const G = (await import("./eval_m.ts")).GfEval; return (T) => new G(T); }
  if (ev === "tgr") { const G = (await import("./eval_tgr.ts")).GfEval; G.MODE = "tgr"; return (T) => new G(T); }
  const G = (await import("../../../src/render/gpu_field/eval.ts")).GfEval;
  const fl = process.env.K1438_FL;
  return (T) => { const E = new G(T); if (fl === "tgr") E.fadeLength = 0.3 * T.win; else if (fl !== undefined) E.fadeLength = +fl; return E; }; // "tgr": the probe's 3 zt ramp
}

