// K1552 (27M): rule inventory + neutralised variants of the largest dumped gf fragment source.
//   npx tsx .claude/probes/K1552/make_variants.ts [.claude/probes/K1552/out/27M/dump/11.frag] [.claude/probes/K1552/out/27M]
// Writes <out>/variants/<rule>.frag for every timed rule, <out>/variants/all.frag (every rule in the
// dumped source neutralised at once), <out>/variants/lone.frag (loneFold applied, for its added cost),
// and <out>/inventory.json (per rule: functions, commit, chars in the dumped source, chars removed).
// A neutralisation replaces a rule's body by the value it returns when it does not fire, or removes its
// call/gate (27M brief Done 3); semantics do not matter, the text must still compile and link.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loneFold } from "../../../src/render/gpu_field/gf_glsl.ts";

const [, , inPath = ".claude/probes/K1552/out/27M/dump/11.frag", outRoot = ".claude/probes/K1552/out/27M"] = process.argv;
const src0 = readFileSync(inPath, "utf8");
const vdir = join(outRoot, "variants");
mkdirSync(vdir, { recursive: true });

function braceEnd(s: string, open: number): number {
  let d = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "{") d++;
    else if (s[i] === "}") { d--; if (d === 0) return i; }
  }
  throw new Error("braceEnd: unbalanced");
}
function stubFn(s: string, head: string, stub: string): { out: string; fnLen: number } {
  const i0 = s.indexOf(head);
  if (i0 < 0 || s.indexOf(head, i0 + 1) >= 0) throw new Error(`stubFn: head not found once: ${head}`);
  const open = s.indexOf("{", i0);
  const close = braceEnd(s, open);
  return { out: s.slice(0, open) + stub + s.slice(close + 1), fnLen: close + 1 - i0 };
}
function removeStmt(s: string, anchor: string): { out: string; len: number } {
  const i0 = s.indexOf(anchor);
  if (i0 < 0) throw new Error(`removeStmt: anchor missing: ${anchor.slice(0, 60)}`);
  const open = s.indexOf("{", i0);
  const close = braceEnd(s, open);
  return { out: s.slice(0, i0) + s.slice(close + 1), len: close + 1 - i0 };
}
function mustReplace(s: string, a: string, b: string, n = 1): string {
  const parts = s.split(a);
  if (parts.length - 1 !== n) throw new Error(`mustReplace: expected ${n} of "${a.slice(0, 60)}", found ${parts.length - 1}`);
  return parts.join(b);
}

type Rule = { id: string; label: string; fns: string; commit: string; apply: (s: string) => string; charsNote: string };
const rules: Rule[] = [
  {
    id: "kxt", label: "second corner try, ink-only gates (retryForm KXT)", fns: "retryForm (KXT macro in layers)", commit: "1485fee2b (s23); default on 083a8cb1c",
    apply: (s) => mustReplace(mustReplace(s, "#define KXT(k) (F(uOK + 6 * (k) + 5).z < 0.5)\n", ""), " && KXT(k)", "", s.split(" && KXT(k)").length - 1),
    charsNote: "define + every && KXT(k) gate",
  },
  {
    id: "homeburial", label: "home burial (homeBurial)", fns: "homeBurial (inline loop in layers)", commit: "3cb97db94 (s28); z guard d20c2a809 (s29)",
    apply: (s) => removeStmt(s, "      if (bur < 1.0 && S < -MAXP) {").out,
    charsNote: "the HB loop statement in layers (surface-id encoding in the scan stays, counted in inventory)",
  },
  {
    id: "runt", label: "side-run gate (runT)", fns: "runT (+ its 2 call sites)", commit: "9935885b0 / f7b965265 (s33)",
    apply: (s) => stubFn(s, "float runT(int S, int C, float zj, vec2 q, vec2 n) {", "{ return 1.0; }").out,
    charsNote: "runT body replaced by its no-fire return 1.0; call sites stay",
  },
  {
    id: "foldd", label: "own-fold burial (foldD, at a junction)", fns: "foldD", commit: "e51c69ebd (s7)",
    apply: (s) => stubFn(s, "float foldD(int j, int S, vec2 p, vec2 q) {", "{ return BIG; }").out,
    charsNote: "foldD body replaced by its no-fire return BIG",
  },
  {
    id: "foldshift", label: "fold shift (shallow own fold, fo)", fns: "layers piece-face loop (fo)", commit: "0b82e0960 (s27)",
    apply: (s) => mustReplace(removeStmt(s, "        if (fo < 0.0) {").out, "dm + fo", "dm"),
    charsNote: "fo compute statement removed, dm + fo -> dm",
  },
  {
    id: "tipsink", label: "end-cap sink (tipSink)", fns: "tipSink", commit: "0a84d3d13 (s2); taper 059b5a04b (s3)",
    apply: (s) => stubFn(s, "float tipSink(int c, float s) {", "{ return 0.0; }").out,
    charsNote: "tipSink body replaced by its no-fire return 0.0",
  },
  {
    id: "corner", label: "rounding at joints (corner faces in layers)", fns: "layers corner label loop + arc loop + tangent loop (inSector/fillBur/vtx stay)", commit: "K1362 s4 / K1407 c1-c4 base; KXT gates 1485fee2b",
    apply: (s) => {
      // arc loop: the loop whose body holds the K1407 c1 arc value; tangent loop: the K1407 c1 tangent value
      const arcVal = s.indexOf("float val = (1.0 - bur) * fb; // K1407 c1: buried by other arms");
      const tanVal = s.indexOf("float val = (1.0 - bur) * fb * cD; // K1407 c1: buried as the arc");
      if (arcVal < 0 || tanVal < 0) throw new Error("corner: arc/tangent value anchors missing");
      const loopStart = (valAt: number) => {
        const at = s.lastIndexOf("for (int i = 0; i < nk; i++) {", valAt);
        if (at < 0) throw new Error("corner: loop start missing");
        return at;
      };
      // remove tangent first (later in file), then arc, then the corner label/D loop (holds KRI > K0.z)
      let out = s;
      const rmLoopAt = (text: string, valAnchor: string) => {
        const v = text.indexOf(valAnchor);
        if (v < 0) throw new Error(`corner: value anchor missing: ${valAnchor.slice(0, 50)}`);
        const aNk = text.lastIndexOf("for (int i = 0; i < nk; i++) {", v);
        const aNkT = text.lastIndexOf("for (int i = 0; i < nkT; i++) {", v);
        const a = Math.max(aNk, aNkT);
        if (a < 0) throw new Error("corner: loop start missing");
        const open = text.indexOf("{", a);
        const close = braceEnd(text, open);
        return text.slice(0, a) + text.slice(close + 1);
      };
      out = rmLoopAt(out, "float val = (1.0 - bur) * fb * cD; // K1407 c1: buried as the arc");
      out = rmLoopAt(out, "float val = (1.0 - bur) * fb; // K1407 c1: buried by other arms");
      // label loop: first nk loop in layers (sets skey/scoval from corners)
      const lab = out.indexOf("if (KRI > K0.z && KXT(k)");
      const labPlain = out.indexOf("if (KRI > K0.z && (key > labK");
      const lv = Math.max(lab, labPlain);
      if (lv < 0) throw new Error("corner: label loop anchor missing");
      const a = out.lastIndexOf("for (int i = 0; i < nk; i++) {", lv);
      const open = out.indexOf("{", a);
      const close = braceEnd(out, open);
      out = out.slice(0, a) + out.slice(close + 1);
      return out;
    },
    charsNote: "three nk loops in layers (label, arc, tangent) removed",
  },
  {
    id: "home", label: "home membership extension (homeForm hg/ramp)", fns: "member (hg/hb + ramp block)", commit: "homeForm K1439 (pre-K1482; retry builds on it)",
    apply: (s) => {
      let out = removeStmt(s, "    if (!(d < -1e-12 || d >= hb)) {").out;
      out = removeStmt(out, "  if (hg >= 0 && !(g >= 0 && ramp >= 1.0)) {").out;
      out = mustReplace(out, "  mg = g; mramp = ramp; mhb = g < 0 ? hg : -1;", "  mg = g; mramp = ramp; mhb = -1;");
      return out;
    },
    charsNote: "hg find + hg ramp block removed; mhb = -1",
  },
  {
    id: "gapjoint", label: "gap joint flags (lkGap flagged cut)", fns: "lkGap (jb/jf/scJ block)", commit: "c44b564a6 (s15); 708da671d+4c1267846 (s16); 644f9bc39 (s18)",
    apply: (s) => {
      const a = s.indexOf("  // K1482 s15: the slot's joint flag");
      if (a < 0) throw new Error("gapjoint: block anchor missing");
      const scj = s.indexOf("vec2 scJ =", a);
      const eol = s.indexOf("\n", scj) + 1;
      let out = s.slice(0, a) + s.slice(eol);
      out = mustReplace(out, "g = max(g, jf ? lkCut(pd[j], sinT, exg, wm, pxw, scJ) : cj);", "g = max(g, cj);");
      out = mustReplace(out, "g = max(g, jf ? lkCut(N.x, sinT, exg, wm, pxw, scJ) : cN);", "g = max(g, cN);");
      return out;
    },
    charsNote: "jb/jf/scJ block removed; flagged lkCut branches replaced by the unflagged cut",
  },
];

const inv: any = { source: inPath, sourceChars: src0.length, rules: [] };
for (const r of rules) {
  const out = r.apply(src0);
  const file = join(vdir, `${r.id}.frag`);
  writeFileSync(file, out);
  inv.rules.push({ id: r.id, label: r.label, functions: r.fns, commit: r.commit, charsInDumped: src0.length - out.length + (r.id === "kxt" ? 0 : 0), charsRemoved: src0.length - out.length, variantChars: out.length, charsNote: r.charsNote, variant: file });
  console.log(`${r.id}: removed ${src0.length - out.length} -> ${out.length}`);
}
// all rules at once (in dumped source; loneFold is not in it)
let all = src0;
for (const r of rules) all = r.apply(all);
writeFileSync(join(vdir, "all.frag"), all);
inv.all = { charsRemoved: src0.length - all.length, variantChars: all.length, variant: join(vdir, "all.frag") };
console.log(`all: removed ${src0.length - all.length} -> ${all.length}`);
// loneFold applied (its added cost is timed as lone vs control; saved = control - lone)
const lone = loneFold(src0);
writeFileSync(join(vdir, "lone.frag"), lone);
inv.lone = { charsAdded: lone.length - src0.length, variantChars: lone.length, variant: join(vdir, "lone.frag"), commit: "8cc774eb8 (s32); switched off 071a257a7", functions: "loneFold (foldD lone-fold block + sibling burial)" };
console.log(`lone: added ${lone.length - src0.length} -> ${lone.length}`);
writeFileSync(join(outRoot, "inventory.json"), JSON.stringify(inv, null, 1));
console.log("inventory written");
