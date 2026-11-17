// K1449: the evaluator a probe runs (k1438_ev.ts plus probe-only fade mappings). Env: K1438_EV (src | m | tgr, as
// k1438_ev), K1438_FL = fadeLength, K1449_MAP = the home ramp's mapping over az = |z| (Z = fl amp / win, zt = T.zt):
//   base (src)  1 - ss(0, Z, az); Z 0: a step at az > 0 (the tent's foot)
//   zt          1 - ss(zt, zt + Z, az); Z 0: a step at zt (K1438's K1438_Z0=1)
//   ctr         1 - ss(max(0, zt - Z/2), zt + Z/2, az); Z 0: a step at zt
//   clip        1 - ss(zt, max(zt, Z), az): a full member to zt, the fade ends at Z as src's; Z <= zt: a step at zt
//   sh          lo = max(0, zt - Z/2), 1 - ss(lo, lo + Z, az): src's width Z, centred on zt while Z < 2 zt
//   src         whatever src's homeRamp does (no override; the default)
export async function loadEv(): Promise<(T: any) => any> {
  const ev = process.env.K1438_EV ?? "src";
  if (ev === "m") { const G = (await import("../K1438/eval_m.ts")).GfEval; return (T) => new G(T); }
  const G = (await import("../../../src/render/gpu_field/eval.ts")).GfEval;
  const fl = process.env.K1438_FL; const map = process.env.K1449_MAP ?? "src";
  const ss = (a: number, b: number, x: number): number => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  return (T) => {
    const E = new G(T); if (fl !== undefined && fl !== "") E.fadeLength = +fl;
    const zt = T.zt;
    if (map === "base") E.homeRamp = (az: number): number => { const Z = (E.fadeLength * T.amp) / T.win; if (!(Z > 0)) return az > 0 ? 0 : 1; return 1 - ss(0, Z, az); };
    else if (map === "zt") E.homeRamp = (az: number): number => { const Z = (E.fadeLength * T.amp) / T.win; if (!(Z > 0)) return az > zt ? 0 : 1; return 1 - ss(zt, zt + Z, az); };
    else if (map === "ctr") E.homeRamp = (az: number): number => { const Z = (E.fadeLength * T.amp) / T.win; if (!(Z > 0)) return az > zt ? 0 : 1; return 1 - ss(Math.max(0, zt - Z / 2), zt + Z / 2, az); };
    else if (map === "clip") E.homeRamp = (az: number): number => { const Z = (E.fadeLength * T.amp) / T.win; if (!(Z > zt)) return az > zt ? 0 : 1; return 1 - ss(zt, Z, az); };
    else if (map === "sh") E.homeRamp = (az: number): number => { const Z = (E.fadeLength * T.amp) / T.win; if (!(Z > 0)) return az > zt ? 0 : 1; const lo = Math.max(0, zt - Z / 2); return 1 - ss(lo, lo + Z, az); };
    else if (map !== "src") throw new Error(`K1449_MAP ${map}`);
    return E;
  };
}
