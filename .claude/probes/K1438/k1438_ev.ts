// K1438: the evaluator a probe runs (env K1438_EV: src | m | tgr; K1438_FL = fadeLength for src, or "tgr" = 0.3 win, the probe's ramp).
// The tables come from k1433_lib's tablesOf (buildTables with { aa }), so src's switch is env GF_HOME=1.
export async function loadEv(): Promise<(T: any) => any> {
  const ev = process.env.K1438_EV ?? "src";
  if (ev === "m") { const G = (await import("./eval_m.ts")).GfEval; return (T) => new G(T); }
  if (ev === "tgr") { const G = (await import("./eval_tgr.ts")).GfEval; G.MODE = "tgr"; return (T) => new G(T); }
  const G = (await import("../../../src/render/gpu_field/eval.ts")).GfEval;
  const fl = process.env.K1438_FL;
  // K1438_Z0 = k: probe-only alternative mapping, the fade starts at |z| = k zt (zt = 0.1 amp, the tie zone) instead of
  // at the dive's first sample: membership 1 - ss(z0, z0 + Z, |z|), a hard step at z0 when fadeLength is 0.
  const z0k = process.env.K1438_Z0 !== undefined && process.env.K1438_Z0 !== "" ? +process.env.K1438_Z0 : 0;
  const ss = (a: number, b: number, x: number): number => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  return (T) => {
    const E = new G(T); if (fl === "tgr") E.fadeLength = 0.3 * T.win; else if (fl !== undefined) E.fadeLength = +fl; // "tgr": the probe's 3 zt ramp
    if (z0k > 0) {
      const z0 = z0k * 0.1 * T.amp;
      E.homeRamp = (az: number): number => { const Z = (E.fadeLength * T.amp) / T.win; if (!(Z > 0)) return az > z0 ? 0 : 1; return 1 - ss(z0, z0 + Z, az); };
    }
    return E;
  };
}

