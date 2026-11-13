// K1324 s2 (K1331): the self-pass burial rule (draw.ts selfBury, in tieAlpha) and its GLSL twin (outline_app.ts
// BAND_FS). x22 is muse_hash's shallow self-crossing at (31.53, 7.36): past the depth window both passes sit at
// z 0, the keys tie mid-ramp and the over border half fades while the under one's ghost half shows (148 px
// of census stray_ink). The rule tips a self pass's tie the way its anchors order (the crossing's two pins).
// The fixture is muse_hash rounded to 4 decimals (.claude/probes/K1324/k1324_s2_fixture.ts), so every
// checkout runs it. The GPU side: .claude/probes/K1324/k1324_s2_gpu.ts runs BAND_FS itself in headed Chrome on
// bandGpu's textures at x22 and reads the same alphas as tieAlpha (|gpu - cpu| < 1e-4, the rule on and off).
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { frame, structure } from "../../src/render/outline/outline";
import * as D from "../../src/render/outline/draw";
import { bandGpu } from "../../src/render/outline/band_gpu";
import { KRV_SHADERS } from "../../src/render/outline/outline_app";
import { loadScene } from "./outline_digest";

const sc = loadScene(fileURLToPath(new URL("./fixtures/outline_x22.json.gz", import.meta.url)));
const table = frame(structure(sc), sc);
const zz = D.zChains(sc);
const h = table.h; const W = table.W; const zt = 0.1 * sc.look.depthAmp;

/** Every run and ghost border point of chain 3 within r of (x0, y0): kind, x, y, alpha off, alpha on. */
const spot = (x0: number, y0: number, r: number): { kind: string; x: number; y: number; off: number; on: number }[] => {
  const was = D.buryOpts.on;
  D.buryOpts.on = false; const tOff = D.tieAlpha(zz, h, W, zt);
  D.buryOpts.on = true; const tOn = D.tieAlpha(zz, h, W, zt);
  const out: { kind: string; x: number; y: number; off: number; on: number }[] = [];
  for (const p of table.pieces) {
    if (!(p.kind === "run" || p.kind === "ghost") || p.chain !== 3) continue;
    const C = zz.zc[p.chain]; const np = p.pts.length / 2;
    const cum = [0]; for (let i = 1; i < np; i++) cum.push(cum[i - 1] + Math.hypot(p.pts[2 * i] - p.pts[2 * i - 2], p.pts[2 * i + 1] - p.pts[2 * i - 1]));
    const L = cum[np - 1] || 1;
    for (let i = 0; i < np; i++) {
      const x = p.pts[2 * i]; const y = p.pts[2 * i + 1]; if (Math.hypot(x - x0, y - y0) > r) continue;
      const s = D.footNear(C, p.cpts[2 * i], p.cpts[2 * i + 1], p.s0 + ((p.s1 - p.s0) * cum[i]) / L, 2 * h, 0, 0).s;
      D.buryOpts.on = false; const off = tOff(3, x, y, s, h);
      D.buryOpts.on = true; const on = tOn(3, x, y, s, h);
      out.push({ kind: p.kind, x, y, off, on });
    }
  }
  D.buryOpts.on = was;
  return out;
};

describe("K1324 s2 the self-pass burial rule", () => {
  it("selfBury: gated by the anchors' order, full at a tie, gone where the depths already decide", () => {
    const amp = 10 * zt;
    expect(D.selfBury(0.9 * amp, 0, 0, zt)).toBe(0); // anchors inside a tent: not a crossing's
    expect(D.selfBury(2 * amp, 0, 0, zt)).toBeCloseTo(2 * zt, 12); // a tie: tipped by 2 zt
    expect(D.selfBury(-2 * amp, 0.1, 0.1, zt)).toBeCloseTo(-2 * zt, 12);
    expect(D.selfBury(2 * amp, 0, zt, zt)).toBeCloseTo(zt, 12); // half way out
    expect(D.selfBury(2 * amp, 0, 2 * zt, zt)).toBe(0); // the depths decide: untouched
    expect(D.selfBury(2 * amp, 0, -3 * zt, zt)).toBe(0);
    D.buryOpts.on = false;
    try { expect(D.selfBury(2 * amp, 0, 0, zt)).toBe(0); } finally { D.buryOpts.on = true; }
  });

  it("x22: the over border keeps its ink and the under ghost stays buried (fails if the tie comes back)", () => {
    const pts = spot(31.6, 7.3, 0.6);
    const runs = pts.filter((p) => p.kind === "run");
    expect(runs.length).toBeGreaterThan(5);
    // The rule off is master: the over border (s 15.6-15.8) fades to 0.46 mid-tie.
    expect(Math.min(...runs.map((p) => p.off))).toBeLessThan(0.5);
    expect(Math.min(...runs.map((p) => p.on))).toBeGreaterThan(0.999);
    // The under pass's ghost past the tube's feather (s 11.1): 0.20 and 0.15 with the rule off.
    const g = pts.filter((p) => p.kind === "ghost" && Math.hypot(p.x - 31.81, p.y - 7.58) < 0.03);
    expect(g.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...g.map((p) => p.off))).toBeGreaterThan(0.14);
    expect(Math.max(...g.map((p) => p.on))).toBeLessThan(1e-3);
  });

  it("the GLSL twin: BAND_FS carries selfBury's gate, ramp and shift, and zAtS reads zAtC off the band's table", () => {
    const fs = KRV_SHADERS.BAND_FS;
    expect(fs).toContain("if (vCh >= 0 && int(t1.w + 0.5) == vCh) {");
    expect(fs).toContain("float lam = 1.0 - min(1.0, abs(bz - vA.z) / (2.0 * uZt));");
    expect(fs).toContain("float dA = zAtS(ob, on, oLen, so) - zAtS(ob, on, oLen, t0.x);");
    expect(fs).toContain("if (abs(dA) > 10.0 * uZt) bury = sign(dA) * 2.0 * uZt * lam;");
    expect(fs).toContain("float f = 1.0 - g * sst(-uZt, uZt, keyO - keyC + bury);");
    // zAtS's algorithm on the band's chain table (float32 x, y, s, z; base and count from chainInfo,
    // len > 0 when closed), against draw.ts zAtC, at the anchors and over two laps.
    const b = bandGpu(table, sc, zz);
    const S = (i: number): number[] => [b.chainTex[4 * i], b.chainTex[4 * i + 1], b.chainTex[4 * i + 2], b.chainTex[4 * i + 3]];
    const zAtS = (base: number, n: number, len: number, s: number): number => {
      if (n <= 0) return 0;
      const last = S(base + n - 1)[2];
      const u = len > 0 ? s - len * Math.floor(s / len) : Math.min(Math.max(s, 0), last);
      if (u >= last) {
        if (!(len > 0)) return S(base + n - 1)[3];
        const l = len - last; const t = l > 0 ? (u - last) / l : 0;
        return S(base + n - 1)[3] + (S(base)[3] - S(base + n - 1)[3]) * t;
      }
      let lo = 0; let hi = n - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S(base + m)[2] <= u) lo = m; else hi = m; }
      const A = S(base + lo); const B = S(base + lo + 1);
      const l = B[2] - A[2]; const t = l > 0 ? (u - A[2]) / l : 0;
      return A[3] + (B[3] - A[3]) * t;
    };
    let worst = 0; let n = 0;
    zz.zc.forEach((c, i) => {
      const base = b.chainInfo[4 * i]; const cnt = b.chainInfo[4 * i + 1]; const len = b.chainInfo[4 * i + 2];
      expect(cnt).toBe(c.n);
      expect(len > 0).toBe(c.closed && c.len > 0);
      const span = c.closed ? 2 * c.len : c.s[c.n - 1] + 1;
      for (let k = 0; k <= 97; k++) { const s = -0.5 + (span * k) / 97; worst = Math.max(worst, Math.abs(zAtS(base, cnt, len, s) - D.zAtC(c, s))); n++; }
      for (const P of zz.passes[i]) if (P.o === i) for (const s of [P.s, P.so]) { worst = Math.max(worst, Math.abs(zAtS(base, cnt, len, s) - D.zAtC(c, s))); n++; }
    });
    expect(n).toBeGreaterThan(100);
    expect(worst).toBeLessThan(1e-5); // float32 table against float64 samples
  });
});
