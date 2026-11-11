// K1240 S4: ports the prototype's default path into src/render/outline/.
// Reads .claude/probes/K1240/proto/{outline,fill_tri,paint,draw}.ts, resolves
// every env switch to its default, drops the debug hooks and knobs, and writes
// the result. Every edit asserts what it matched, so a moved prototype fails
// loudly instead of porting silently wrong. Re-run after the prototype moves:
//   node .claude/probes/K1240/s4/k1240s4_port.mjs [protoDir]
// then `npm test` (the pin) and k1240s4_eq.ts (port vs proto on the 12 scenes).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../..");
const proto = resolve(process.argv[2] ?? resolve(root, ".claude/probes/K1240/proto"));
const dest = resolve(root, "src/render/outline");
mkdirSync(dest, { recursive: true });

// ---- a tiny lexer: brace/paren matching that skips strings, templates, comments.
function matchClose(text, open) {
  const oc = text[open]; const cc = oc === "{" ? "}" : oc === "(" ? ")" : "]";
  const stack = []; let depth = 0; let i = open;
  const mode = []; // "t" template text
  while (i < text.length) {
    const ch = text[i];
    if (mode.length && mode[mode.length - 1] === "t") {
      if (ch === "\\") { i += 2; continue; }
      if (ch === "`") { mode.pop(); i++; continue; }
      if (ch === "$" && text[i + 1] === "{") { mode.push("e"); stack.push("${"); i += 2; continue; }
      i++; continue;
    }
    if (ch === "/" && text[i + 1] === "/") { i = text.indexOf("\n", i); if (i < 0) break; continue; }
    if (ch === "/" && text[i + 1] === "*") { i = text.indexOf("*/", i) + 2; continue; }
    if (ch === "\"" || ch === "'") { const q = ch; i++; while (i < text.length && text[i] !== q) { if (text[i] === "\\") i++; i++; } i++; continue; }
    if (ch === "`") { mode.push("t"); i++; continue; }
    if (ch === "{" || ch === "(" || ch === "[") { stack.push(ch); if (ch === oc && stack.length === 1) depth = 1; i++; continue; }
    if (ch === "}" || ch === ")" || ch === "]") {
      const top = stack.pop();
      if (top === "${") { mode.pop(); i++; continue; }
      if (stack.length === 0) { if (ch !== cc) throw new Error(`mismatched close at ${i}`); return i; }
      i++; continue;
    }
    i++;
  }
  void depth; throw new Error(`no close for ${open}`);
}

class Src {
  constructor(name) { this.name = name; this.t = readFileSync(resolve(proto, name), "utf8").replace(/\r\n/g, "\n"); }
  count(s) { let n = 0; let i = 0; while ((i = this.t.indexOf(s, i)) >= 0) { n++; i += s.length; } return n; }
  rep(find, repl, n = 1) {
    const c = this.count(find); if (c !== n) throw new Error(`${this.name}: '${find.slice(0, 80)}' x${c}, want ${n}`);
    this.t = this.t.split(find).join(repl);
  }
  re(rx, repl, n) {
    const m = this.t.match(new RegExp(rx.source, rx.flags.includes("g") ? rx.flags : rx.flags + "g")) ?? [];
    if (m.length !== n) throw new Error(`${this.name}: ${rx} x${m.length}, want ${n}`);
    this.t = this.t.replace(new RegExp(rx.source, rx.flags.includes("g") ? rx.flags : rx.flags + "g"), repl);
  }
  lineIdx(sub) {
    const L = this.t.split("\n"); const hits = [];
    L.forEach((l, i) => { if (l.includes(sub)) hits.push(i); });
    if (hits.length !== 1) throw new Error(`${this.name}: line '${sub.slice(0, 80)}' x${hits.length}`);
    return hits[0];
  }
  delLine(sub) { const L = this.t.split("\n"); L.splice(this.lineIdx(sub), 1); this.t = L.join("\n"); }
  // Delete the statement/declaration starting at the line holding `sub` through
  // the close of the first `{` at or after `sub` (plus the rest of that line).
  delBlock(sub, fromLine = true) {
    const at = this.t.indexOf(sub); if (at < 0 || this.t.indexOf(sub, at + 1) >= 0) throw new Error(`${this.name}: block '${sub}' not unique`);
    const open = this.t.indexOf("{", at + (sub.endsWith("{") ? sub.length - 1 : sub.length));
    const close = matchClose(this.t, open);
    const s = fromLine ? this.t.lastIndexOf("\n", at) + 1 : at;
    let e = this.t.indexOf("\n", close); if (e < 0) e = this.t.length; else e += 1;
    this.t = this.t.slice(0, s) + this.t.slice(e);
  }
  delFn(name) {
    for (const pre of [`\nexport function ${name}(`, `\nfunction ${name}(`]) {
      const at = this.t.indexOf(pre); if (at < 0) continue;
      const paren = this.t.indexOf("(", at); const pc = matchClose(this.t, paren);
      const open = this.t.indexOf("{", this.t.indexOf(")", pc) === pc ? pc : pc); // body after the signature's return type
      let b = open; // skip a return type with braces (": { a: number }")
      const sig = this.t.slice(pc, b);
      if (/:\s*$/.test(sig)) b = this.t.indexOf("{", matchClose(this.t, b) + 1);
      const close = matchClose(this.t, b);
      let e = this.t.indexOf("\n", close); if (e < 0) e = this.t.length;
      this.t = this.t.slice(0, at) + this.t.slice(e); return;
    }
    throw new Error(`${this.name}: no function ${name}`);
  }
  // Every `if (cond) stmt;` or `if (cond) { ... }` with this exact head.
  delIfs(head, n) {
    let c = 0; let at;
    while ((at = this.t.indexOf(head)) >= 0) {
      let j = at + head.length; while (this.t[j] === " ") j++;
      let end;
      if (this.t[j] === "{") end = matchClose(this.t, j) + 1;
      else { const p = this.t.indexOf("(", j); end = matchClose(this.t, p) + 1; if (this.t[end] === ";") end++; }
      let s = at; while (s > 0 && this.t[s - 1] === " ") s--;
      const lineStart = this.t.lastIndexOf("\n", at - 1) + 1;
      const lineEnd = this.t.indexOf("\n", end);
      const rest = this.t.slice(end, lineEnd);
      if (this.t.slice(lineStart, at).trim() === "" && rest.trim() === "") this.t = this.t.slice(0, lineStart) + this.t.slice(lineEnd + 1);
      else this.t = this.t.slice(0, s) + this.t.slice(end);
      c++;
    }
    if (c !== n) throw new Error(`${this.name}: '${head}' x${c}, want ${n}`);
  }
  lines() { return this.t.split("\n"); }
  write(note) {
    const banner = `// Ported from .claude/probes/K1240/proto/${this.name} by k1240s4_port.mjs (K1240 S4): the prototype's default path only.\n${note ? note + "\n" : ""}`;
    writeFileSync(resolve(dest, this.name), banner + this.t);
  }
}

// ============ outline.ts
const o = new Src("outline.ts");
// K17_XS (off): the crossing snap.
o.delLine("const KF_XS = ");
o.delFn("crossSnapInto");
o.delLine("if (KF_XS && crossSnapInto(");
// K14_NOSIGMA / K14_BEVC: 0.1.
o.rep("const K14_ENV = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};\nconst K14_BEVC = K14_ENV.K14_NOSIGMA ? 0 : Number(K14_ENV.K14_BEVC ?? 0.1);", "const K14_BEVC = 0.1;");
// K16_EB (on), K16_TS (on), K16_PS (off).
o.delLine("const KF_EB = "); o.delLine("const KF_TS = "); o.delLine("const KF_PS = ");
o.rep("if (KF_EB && footBlendInto(", "if (footBlendInto(", 2);
o.delLine("if (!KF_TS) return;");
o.delBlock("    if (KF_PS) {");
o.rep("    let d = Math.sqrt(dx * dx + dy * dy);\n    if (d < bestD)", "    const d = Math.sqrt(dx * dx + dy * dy);\n    if (d < bestD)");
// K1240_NOMEET (off), K1240_XDBG (debug).
o.delLine("process?.env?.K1240_NOMEET) return null;");
o.delLine("const xdbg = ");
o.delLine("if (xdbg && xdbg.split");
o.delLine("// K1247 s2: read once at load (process.env reads are slow per call).");
o.delLine("const KF_NOMEET = ");
o.delLine("if (KF_NOMEET) return false;");
// K17_JA (on): frame() always aligns junction arms. frameRef (the oracle) stays behind.
o.rep("return frameFast(st, KF_JA ? alignJunctionArms(st, scene) : scene, profile);", "return frameFast(st, alignJunctionArms(st, scene), profile);");
o.delLine("/** Today's builder, kept as the oracle for the fast frame's checks. */");
o.delFn("frameRef");
o.delLine("const KF_JA = ");
o.delLine("let kfJaCount = 0;");
o.delFn("junctionAlignCount");
o.delLine("    kfJaCount++;");
// K17_CAP (on).
o.delLine("const KF_CAP = ");
o.rep("return KF_CAP ? 2 * b + 8 : b + 4;", "return 2 * b + 8;");
// K14_SEAM0, K14_SEAMFREE0 (off).
o.delLine("const KF_SEAM0 = "); o.delLine("const KF_SEAMFREE0 = ");
o.rep("if (KF_SEAM0 || !(kMax >= kMin)", "if (!(kMax >= kMin)");
o.rep("if (KF_SEAMFREE0 || KF_SEAM0 || !(a > b)", "if (!(a > b)");
// K1247_CLEAR (on).
o.delLine("let kfClear = "); o.delFn("setClearCert");
o.rep("if (kfClear && cache.cOk", "if (cache.cOk");
// marginOfC's cache (off).
o.delLine("let kfMCache = false; let kfMR = 0.5;"); o.delFn("setMarginCache");
{
  const L = o.lines(); const a = L.findIndex((l) => l.trim() === "const mc = kfMCache;"); const b = L.findIndex((l) => l.trim() === "if (mc) growStats.mMiss++;");
  if (a < 0 || b !== a + 6) throw new Error("mc block moved");
  L.splice(a, 7); o.t = L.join("\n");
  o.rep("const bd = mc ? dc + kfMR * h : dc;", "const bd = dc;");
}
// The growth's knobs: constants at their defaults.
o.delFn("setGrowKnobs"); o.delFn("setGrowSub"); o.delFn("setGrowUniform");
for (const k of ["kfGrowE", "kfGrowH", "kfGrowP", "kfGrowN", "kfGrowZ", "kfGrowMid", "kfGrowS"]) o.re(new RegExp(`^let ${k} = `, "m"), `const ${k} = `, 1);
o.delLine("let kfShift = true;"); o.delFn("setGrowShift");
o.rep("if (kfShift) { shiftFootC(C, kfCst.A, kfTa, ux * dd, uy * dd); shiftFootC(C, kfCst.B, kfTb, ux * dd, uy * dd); }", "shiftFootC(C, kfCst.A, kfTa, ux * dd, uy * dd); shiftFootC(C, kfCst.B, kfTb, ux * dd, uy * dd);");
o.delLine("let kfSegPred = true;"); o.delFn("setSegPred");
o.rep("        if (kfSegPred) {\n", "        {\n");
// Debug rows and counters.
o.delLine("export const growDbg"); o.delLine("// K1247 s6: w at each growth node"); o.delLine("export const wDbg"); o.delLine("export const growStats");
o.re(/ if \(ci === wDbg\.ci\) wDbg\.rows\.push\(\[[^\]]*\]\);/, "", 3);
o.delIfs("if (ci === growDbg.ci)", 1);
o.delLine("// K1247 s9 debug: solveVC's iterations"); o.delLine("export const vDbg");
o.delIfs("if (vDbg.ci === ci)", 2);
o.re(/ ?growStats\.\w+\+\+;/, "", 15);
o.t = o.t.replace(/^[ \t]+\n/gm, "");
o.delLine("if (kind === 5 || kind === 6) cfStats.lags++;");
o.delLine("if (all1) cfStats.free++;"); o.delLine("if (!(wa > 0)) cfStats.zeroEnd++;");
o.rep("let integ = 0; let all1 = wa === 1;", "let integ = 0;");
o.rep("cfStats.pathEnd++; all1 = false;", "");
o.rep("const wb = Math.min(wa, wr); if (wr !== 1) all1 = false;", "const wb = Math.min(wa, wr);");
o.delLine("// free: corners whose w is 1 at every growth node"); o.delLine("// zeroEnd: corners whose w reached 0"); o.delLine("export const cfStats");
o.re(/ ?cfStats\.\w+\+\+;/, "", 10);
o.t = o.t.replace(/^[ \t]+\n/gm, "");
o.delLine("let cfDbg = false; let cfDbgCi = -1;"); o.delLine("export const cfTrace"); o.delFn("setCfDebug");
o.delLine("cfDbg = ci === cfDbgCi;");
o.delIfs("if (cfDbg)", 6);
o.re(/^let cfJumpTol = /m, "const cfJumpTol = ", 1); o.delFn("setCfJumpTol"); o.delLine("if (cfJumpTol < 0) return -1;");
o.delLine("let cfOn = "); o.delFn("setClosedForm");
o.rep("const r = cfOn ? growCFC(C, ci) : growIntegC(C, ci);", "const r = growCFC(C, ci);");
o.delLine("let cfSteepFast = "); o.delFn("setSteepFast");
o.rep("s = cfSteepFast ? cfSteepLine(j) : cfSteepAt(j, r);", "s = cfSteepLine(j);");
o.rep("const s0 = cfSteepFast && j > 0 &&", "const s0 = j > 0 &&");
o.delLine("let cfDipOn = true;"); o.delFn("setCfDip");
o.rep("if (!cfDipOn || !(wcap > 1e-12))", "if (!(wcap > 1e-12))");
// K12_CSORDER (off): structural station order everywhere.
o.delLine("// K1247 s12: K12_CSORDER=1 restores"); o.delLine("const KF_CSORDER = ");
o.rep("if (dg && !KF_CSORDER) {", "if (dg) {", 2);
o.rep("(dg && !KF_CSORDER ? seamKeyOf(", "(dg ? seamKeyOf(");
{
  // regionsPhaseRef: keep the structural branch, drop stage 11's cS order after it.
  const L = o.lines(); const a = L.findIndex((l) => l === "    if (!KF_CSORDER) {");
  if (a < 0 || !L[a + 1].includes("K1247 s12: ordered by structure")) throw new Error("csorder ref block moved");
  let b = a + 1; while (L[b] !== "      return;") b++;
  if (L[b + 1] !== "    }") throw new Error("csorder ref close");
  let e = b + 2; while (L[e] !== "  });") e++;
  const body = L.slice(a + 1, b).map((l) => l.replace(/^ {2}/, ""));
  L.splice(a, e - a, ...body); o.t = L.join("\n");
}
o.rep("if (!KF_NOENV) envelopeRef(", "envelopeRef(");
o.rep("!KF_CSORDER && dg ?", "dg ?");
o.rep("const live = KF_CSORDER || iv.len > 0;", "const live = iv.len > 0;");
o.rep("const ivKey = (a: string, b: string): string => KF_CSORDER ? a + \">\" + b : a;", "const ivKey = (a: string, _b: string): string => a;");
o.rep("KF_CSORDER ? 0 : seamKeyC(C, pi, p.len)", "seamKeyC(C, pi, p.len)");
o.rep("if (!KF_CSORDER) sSeam = ", "sSeam = ");
o.rep("KF_CSORDER ? (C.stCS[u] - C.stCS[v]) : (C.slotKey[u] - C.slotKey[v])", "(C.slotKey[u] - C.slotKey[v])");
o.rep("    if (KF_CSORDER) { for (const s of list) if (!uniq.length || Math.abs(C.stCS[s] - C.stCS[uniq[uniq.length - 1]]) > 1e-9) uniq.push(s); }\n    else for (const s of list) uniq.push(s);", "    for (const s of list) uniq.push(s);");
{
  // regionsPhaseC: the structural intervals; stage 11's cS-order branches go.
  const L = o.lines(); const a = L.findIndex((l, i) => l === "    if (!KF_CSORDER) {" && L[i + 1].includes("Every structural interval exists in every frame"));
  if (a < 0) throw new Error("csorder fast block moved");
  const e = L.findIndex((l, i) => i > a && l === "    } else if (p.closed) {");
  const f = L.findIndex((l, i) => i > e && l === "    ivCount[pi] = nIv - ivStart[pi];");
  if (e < 0 || f < 0 || L[f - 1] !== "    }") throw new Error("csorder fast close");
  const body = L.slice(a + 1, e).map((l) => l.replace(/^ {2}/, ""));
  L.splice(a, f - a, ...body); o.t = L.join("\n");
}
{
  const L = o.lines(); const a = L.findIndex((l, i) => l === "    if (!KF_CSORDER) {" && L[i + 1].includes("const n0 = ivStart[pi]; const nC = ivCount[pi];"));
  if (a < 0 || L[a + 2] !== "      if (!KF_NOENV) {") throw new Error("noenv block moved");
  const e = L.findIndex((l, i) => i > a && l === "      } else for (let k = n0; k < n0 + nC; k++) C.ivEA[k] = C.ivA[k];");
  if (e < 0 || L[e + 1] !== "    }") throw new Error("noenv close");
  const body = L.slice(a + 3, e).map((l) => l.replace(/^ {2}/, ""));
  L.splice(a, e + 2 - a, "    {", L[a + 1], ...body, "    }"); o.t = L.join("\n");
}
o.rep("const sR = KF_CSORDER ? null : structRegionsC(C, st);", "const sR = structRegionsC(C, st);");
o.rep("const live = KF_CSORDER || C.ivLen[i] > 0;", "const live = C.ivLen[i] > 0;");
o.rep("const eA = KF_CSORDER ? A : C.ivEA[i];", "const eA = C.ivEA[i];");
o.rep("const pairKey = (a: number, b: number): number => KF_CSORDER ? a * 8192 + b : a;", "const pairKey = (a: number, _b: number): number => a;");
o.rep("if (a < 0 || (KF_CSORDER && b < 0)) return -1;", "if (a < 0) return -1;");
o.delLine("// K1247 s12: K12_NOENV=1 drops the envelope"); o.delLine("const KF_NOENV = ");
// K13_NOHITWIN (off).
o.delLine("const KF_NOHITWIN = "); o.delLine("export const hitWinStats");
o.rep("if (!KF_NOHITWIN && (", "if ((", 2);
o.rep("{ hitWinStats.out++; continue; }", "continue;");
// K14_NOUNDER (off).
o.delLine("const KF_NOUNDER = ");
o.rep("if (sR && sC && !KF_NOUNDER) {", "if (sR && sC) {");
o.rep("if (sR && !KF_NOUNDER) {", "if (sR) {");
// K14_TRIM (off): the fold splice, its winding helper and its notes.
{
  const L = o.lines(); const a = L.findIndex((l) => l.startsWith("// K1247 s14 EXPERIMENT (default off, fast path only): K14_TRIM=1"));
  const b = L.findIndex((l) => l === "const KF_TRIM = !!(globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.K14_TRIM;");
  if (a < 0 || b < a || b - a > 10) throw new Error("trim notes moved");
  L.splice(a, b + 1 - a); o.t = L.join("\n");
}
o.delLine("if (KF_TRIM) C.trimCuts = ");
o.delFn("trimFoldsC"); o.delFn("windAt"); o.delLine("const TRIM_K = 8;");
// K1247 s13 grpMode (off): member groups.
o.delLine("export const grpMode = { adj: false };");
o.re(/grpMode\.adj \? adjGroupC\([^)]*\) : /, "", 4);
o.delFn("adjGroupC");
// K16_CB ("0"): the nearest foot.
o.rep("blendFootC(C.polys[A.pi], kfCst.qx, kfCst.qy, kfQa, kfEa);", "copyFoot(kfEa, kfQa);");
o.rep("blendFootC(C.polys[B.pi], kfCst.qx, kfCst.qy, kfQb, kfEb);", "copyFoot(kfEb, kfQb);");
o.delFn("blendFootC"); o.delLine("const KF_CB = ");
// Probe rows.
o.delLine("tailDbg.cur = ci;"); o.delLine("if (tailDbg.cur === tailDbg.ci && tailDbg.ci >= 0)");
o.delLine("// K1247 s9 probe: f's terms along a tail"); o.delLine("export const tailDbg");
o.delLine("// K1247 s11 probe: a synthesized cut's search"); o.delLine("// [uSide, oSide, s on the under border, distance] per segment pair."); o.delLine("export const synthDbg");
o.delLine("// K1247 s13 probe: crossing candDbg.xi's cut candidates"); o.delLine("// [uSide, oSide, x, y, distance to the crossing point, under s, over s, synth, uSeg, oSeg]."); o.delLine("export const candDbg");
o.delIfs("if (synthDbg.xi === xi)", 1); o.delLine("if (candDbg.xi === xi)");
o.delFn("tailTerms");
// tsc (strict, noUnused*): the prototype is not type-checked; same code, typed.
o.delFn("segIdxOfS");
o.delLine("if (mc && hiDone && d2 >= dc) {");
o.rep("let d2 = Infinity; let dX = Infinity; let hiDone = !(hi < winHi);", "let d2 = Infinity; let dX = Infinity;");
o.rep("if (f < dX) dX = f; hiDone = true; const fo", "if (f < dX) dX = f; const fo");
o.rep("rec: f.rec ? { ...f.rec, sOff: p.len } : undefined });", "rec: f.rec ? ({ ...f.rec, sOff: p.len } as BRec) : undefined });");
o.rep("if (l.rec) l.rec = { ...l.rec, sOff: p.len }; }", "if (l.rec) l.rec = { ...l.rec, sOff: p.len } as BRec; }");
o.rep("fa: { ...V.fa, u: A.sR + A.dir * dVa }, fb: { ...V.fb, u: B.sR + B.dir * dVb } };", "fa: { ...V.fa, u: A.sR + A.dir * dVa } as TF, fb: { ...V.fb, u: B.sR + B.dir * dVb } as TF };");
o.rep("cw.vKa = V.fa.k; cw.vKb = V.fb.k;", "cw.vKa = (V.fa as TF).k; cw.vKb = (V.fb as TF).k;");
o.rep("scene.crossings.forEach((x, xi) => {\n    const cp = crossPt[xi];", "scene.crossings.forEach((_x, xi) => {\n    const cp = crossPt[xi];");
o.rep("arms.forEach((a, ai) => { markRef(armNextPt[ai]); markRef(armPrevPt[ai]); });", "arms.forEach((_a, ai) => { markRef(armNextPt[ai]); markRef(armPrevPt[ai]); });");
o.rep("armPts: arms.map((a, ai) => ({", "armPts: arms.map((_a, ai) => ({");
o.rep("forEach((c, pi) => {\n    for (const side of [1, -1]) for (const gi of perChainIntervals[pi]) { if", "forEach((_c, pi) => {\n    for (const side of [1, -1]) for (const gi of perChainIntervals[pi]) { if");
o.rep("forEach((c, pi) => {\n    for (const side of [1, -1]) for (const gi of perChainIntervals[pi]) {\n", "forEach((_c, pi) => {\n    for (const side of [1, -1]) for (const gi of perChainIntervals[pi]) {\n");
o.delLine("let kfSegStamp = 0;");
o.rep("function solveVC(C: FCache, ci: number, aiA", "function solveVC(C: FCache, _ci: number, aiA");
o.rep("  const A = C.armObj[aiA]; const B = C.armObj[aiB];\n  // one cold solve; a warm V can be a different root (ci: vDbg only)\n", "");
o.delFn("cfLagCond");
o.delFn("debugCache");
o.delFn("buildOutlineS2");
// Anything left that reads the environment is a switch this script missed.
{ const m = o.t.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").match(/.{0,60}(process\?\.env|process\.env).{0,60}/g); if (m) throw new Error("outline.ts: an env read survived: " + m.join(" | ")); }
o.write("// Structure once (structure), positions per frame (frame); buildOutline = both.");

// ============ fill_tri.ts, paint.ts, draw.ts: the same modules, tsc-clean.
const f = new Src("fill_tri.ts");
f.rep("it.arms.forEach((a, k) => {", "it.arms.forEach((_a, k) => {");
f.rep("export function vertexPaint(fs: FillStructure,", "export function vertexPaint(_fs: FillStructure,");
f.write("");
const p = new Src("paint.ts");
p.write("");
const d = new Src("draw.ts");
d.rep("export function chainColor(chain: number, nChains: number,", "export function chainColor(chain: number, _nChains: number,");
// The app rebuilds the band every frame without the fill's structure: move
// buildDrawData's band block (code motion only) into bandData.
{
  const head = "  const ink = parseColor(scene.look.ink);\n  const bandPos: number[] = [];";
  const tail = "  return {\n    fillPos: Float32Array.from(fr.pos),";
  const i0 = d.t.indexOf(head);
  const i1 = d.t.indexOf(tail);
  if (i0 < 0 || i1 < i0 || d.t.indexOf(head, i0 + 1) >= 0) throw new Error("draw.ts: band block not found once");
  const mid = d.t.slice(i0, i1);
  d.t = d.t.slice(0, i0) + "  const band = bandData(table, scene, zz);\n" + d.t.slice(i1);
  d.rep("    bandPos: Float32Array.from(bandPos), bandCol: Float32Array.from(bandCol), bandAlpha: Float32Array.from(bandAlpha),\n    bandCount: bandPos.length / 2,\n", "    ...band,\n");
  const fn = "\n/** The border ink's band of one frame (form B's tie alpha per vertex). The\n *  app rebuilds it every frame: its vertex count follows the pieces. */\n" +
    "export interface BandData { bandPos: Float32Array; bandCol: Float32Array; bandAlpha: Float32Array; bandCount: number }\n" +
    "export function bandData(table: OutlineTable, scene: SceneIn, zz: ReturnType<typeof zChains>): BandData {\n" + mid +
    "  return { bandPos: Float32Array.from(bandPos), bandCol: Float32Array.from(bandCol), bandAlpha: Float32Array.from(bandAlpha), bandCount: bandPos.length / 2 };\n}\n";
  d.rep("\nexport function buildDrawData(", fn + "\nexport function buildDrawData(");
}
d.write("");
console.log("ported to", dest);
