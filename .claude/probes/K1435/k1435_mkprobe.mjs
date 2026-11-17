// K1435: builds the probe files from the tracked sources, so the probe's difference from master is this file.
//   node .claude/probes/K1435/k1435_mkprobe.mjs
// eval_t.ts = src/render/gpu_field/eval.ts + the modes below; k1435_spots.ts / k1435_scan.ts = K1433's, loading eval_t.
import { readFileSync, writeFileSync } from "node:fs";
const D = ".claude/probes/K1435/";
let s = readFileSync("src/render/gpu_field/eval.ts", "utf8").replace(/\r\n/g, "\n");
const rep = (a, b) => { if (!s.includes(a)) throw new Error("miss " + a.slice(0, 60)); s = s.replace(a, () => b); };
rep('from "./tables"', 'from "../../../src/render/gpu_field/tables"');
rep("  constructor(T: GfTables) { this.T = T; }",
`  /** K1435 probe. master = eval.ts unchanged. tg = a piece that lies in a junction arm's home interval (root to the
   * crossing that cut it) but is not a member is ordered against that junction's group by the graph (the sign of
   * the crossing nearest the arm's root: over -> the piece on top), never by the per-pixel tie blend. tgo / tgu =
   * the piece always over / always under (look variants). tgx = tg, and two own pieces whose graph signs differ.
   * tgm = a home piece whose depth is still 0 joins its group (membership by interval; the cut applies only where
   * the crossing's depth has started), with tg's order for the rest. tgn = tgm's membership alone, master's order. */
  static MODE = "master";
  aSig!: Int8Array; aHome!: Float64Array;
  phome = new Int32Array(MAXP); psig = new Int8Array(MAXP); pnsig = new Int8Array(MAXP);
  sfix = new Uint8Array(MAXS); nForced = 0; nTie = 0; nHomeP = 0; nPix = 0;
  constructor(T: GfTables) {
    this.T = T;
    const nA = T.nA; this.aSig = new Int8Array(nA); this.aHome = new Float64Array(nA);
    for (let c = 0; c < T.cArm0.length; c++) {
      const n = T.cPinN[c]; const b = T.cPin0[c]; const closed = T.cClosed[c] === 1; const len = T.cLen[c];
      for (let i = T.cArm0[c]; i < T.cArm0[c] + T.cArmN[c]; i++) {
        let bestD = Infinity; let sig = 0; let ahead = Infinity;
        for (let q = b; q < b + n; q++) {
          let d = (T.pinS[q] - T.aSR[i]) * T.aDir[i]; if (closed) d = ((d % len) + len) % len;
          const ad = closed ? Math.min(d, len - d) : Math.abs(d);
          if (ad < bestD) { bestD = ad; sig = T.pinZ[q] > 0 ? 1 : T.pinZ[q] < 0 ? -1 : 0; }
          if (d >= 0 && d < ahead) ahead = d;
        }
        this.aSig[i] = sig; this.aHome[i] = T.aLcut[i] === Infinity ? T.aL[i] : Math.max(T.aL[i], Math.min(ahead, 4 * T.h));
      }
    }
  }
  /** K1435: the home junction group of (c, s) and its graph sign (table facts; a list of intervals per chain). */
  private home(c: number, s: number): void {
    const T = this.T; const a0 = T.cArm0[c]; const an = T.cArmN[c]; const closed = T.cClosed[c] === 1; const len = T.cLen[c];
    let g = -1; let sg = 0; let best = Infinity;
    for (let i = a0; i < a0 + an; i++) {
      let d = (s - T.aSR[i]) * T.aDir[i]; if (closed) d = ((d % len) + len) % len;
      if (d < -1e-12 || d > this.aHome[i] + 1e-12 || d >= best) continue;
      best = d; g = T.aG[i]; sg = this.aSig[i];
    }
    this.hg = g; this.hs = sg;
  }
  private hg = -1; private hs = 0;
  private nearSig(c: number, s: number): number {
    const T = this.T; const n = T.cPinN[c]; const b = T.cPin0[c]; const closed = T.cClosed[c] === 1; const len = T.cLen[c];
    let bestD = Infinity; let sig = 0;
    for (let q = b; q < b + n; q++) { let d = Math.abs(T.pinS[q] - s); if (closed) { d %= len; d = Math.min(d, len - d); } if (d < bestD) { bestD = d; sig = T.pinZ[q] > 0 ? 1 : -1; } }
    return sig;
  }`);
rep("      this.member(this.pc[j], this.ps[j]); this.pg[j] = this.mg; this.pramp[j] = this.mramp;",
`      this.member(this.pc[j], this.ps[j]); this.pg[j] = this.mg; this.pramp[j] = this.mramp;
      if (GfEval.MODE !== "master") {
        this.home(this.pc[j], this.ps[j]); this.phome[j] = this.hg; this.psig[j] = this.hs; this.pnsig[j] = GfEval.MODE === "tgx" ? this.nearSig(this.pc[j], this.ps[j]) : 0;
        if ((GfEval.MODE === "tgm" || GfEval.MODE === "tgn") && this.hg >= 0 && this.pz[j] === 0 && !(this.mg >= 0 && this.mramp >= 1)) { this.pg[j] = this.hg; this.pramp[j] = 1; this.mg = this.hg; this.mramp = 1; }
      }`);
rep("    this.cWk = 0; this.cWa = -1; this.cWb = 0;\n    let r = comp(-1);",
`    const M = GfEval.MODE;
    if (M !== "master" && M !== "tgn") {
      // K1435: graph order. An own piece against its home junction's group (and, tgx, against another own piece).
      for (let i = 0; i < ns; i++) this.sfix[i] = 0;
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i + 1 < ns; i++) {
        const a = this.sord[i]; const b = this.sord[i + 1]; const ia = this.sid[a]; const ib = this.sid[b];
        if (!(this.skey[a] - this.skey[b] < 2 * zt)) continue;
        let want = 0; // +1: a stays on top, -1: b on top
        const pa = ia < 0 ? -1 - ia : -1; const pb = ib < 0 ? -1 - ib : -1;
        if (pa >= 0 && ib >= 0 && this.phome[pa] === ib) want = M === "tgo" ? 1 : M === "tgu" ? -1 : this.psig[pa];
        else if (pb >= 0 && ia >= 0 && this.phome[pb] === ia) want = M === "tgo" ? -1 : M === "tgu" ? 1 : -this.psig[pb];
        else if (M === "tgx" && pa >= 0 && pb >= 0 && this.pnsig[pa] !== this.pnsig[pb]) want = this.pnsig[pa] > this.pnsig[pb] ? 1 : -1;
        if (want === 0) continue;
        if (want < 0) { this.sord[i] = b; this.sord[i + 1] = a; }
        if (!this.sfix[i]) this.nForced++;
        this.sfix[i] = 1;
      }
    }
    this.cWk = 0; this.cWa = -1; this.cWb = 0;
    let r = comp(-1);`);
rep("      if (!(gap < zt)) continue;\n      const r2 = comp(i);",
`      if (!(gap < zt)) continue;
      if (M !== "master" && M !== "tgn" && this.sfix[i]) continue;
      const r2 = comp(i);`);
writeFileSync(D + "eval_t.ts", s);
for (const f of ["spots", "scan"]) {
  let t = readFileSync(`.claude/probes/K1433/k1433_${f}.ts`, "utf8").replace(/\r\n/g, "\n");
  t = t.replace("import { loadEval, makeJudge", "import { makeJudge").replace('from "./k1433_lib.ts"', 'from "../K1433/k1433_lib.ts"')
    .replace("await loadEval(which)", '(await import("./eval_t.ts")).GfEval').replace(/which === "u"/g, 'which === "t"');
  writeFileSync(D + `k1435_${f}.ts`, t);
}
console.log("ok");
