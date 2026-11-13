// K1362 s6: REGISTER-RESIDENT per-pixel state. A source transform of gf_glsl.ts's program: every per-pixel array
// (pieces, corners, surfaces, the through-corner list) becomes one scalar per slot, read through a select chain
// (g_<name>(i)) and written through a predicated setter (s_<name>(i, v)). The program's control flow and arithmetic
// are unchanged, statement for statement, so its output is the source program's.
//
// Why: an array a GPU indexes by a runtime value (pc[j] with j < np, sid[ns++], skey[sord[m]]) cannot live in
// registers; mobile compilers place it in per-thread memory, and every access is a load or a store. Stage 3 saw the
// pass's cost follow the arrays' sizes, not the work; scalars with selects keep all of it in registers.
//
// The transform knows the program's shape: array declarations are `[IQ |FQ ](int|float|bool) <name>[<size>];` at
// global scope or as a local of main (moved to global scope, which the setters need); an access is `<name>[<index>]`,
// a write when `=` (not `==`) follows it, its value ending at the statement's `;`. Compound assignments to elements
// do not occur in the program (a test checks the transformed source has no `[` left on a converted name).

const DECL = /\b((?:IQ |FQ )?)(int|float|bool) (\w+)\[(\w+)\];/g;

function matchClose(s: string, open: number, o: string, c: string): number {
  let d = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === o) d++;
    else if (s[i] === c && --d === 0) return i;
  }
  throw new Error(`gf_reg: unbalanced ${o} at ${open}`);
}

/** The end of an assignment's value: the next `;` at depth 0, or an unmatched closer. */
function valueEnd(s: string, from: number): number {
  let d = 0;
  for (let i = from; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(" || ch === "[" || ch === "{") d++;
    else if (ch === ")" || ch === "]" || ch === "}") { if (d === 0) return i; d--; }
    else if (ch === ";" && d === 0) return i;
  }
  throw new Error("gf_reg: unterminated assignment");
}

function rewrite(s: string, names: Set<string>, re: RegExp): string {
  let out = "";
  let at = 0;
  re.lastIndex = 0;
  for (;;) {
    re.lastIndex = at;
    const m = re.exec(s);
    if (!m) break;
    const name = m[1];
    const open = m.index + m[0].length - 1;
    if (!names.has(name)) { out += s.slice(at, open + 1); at = open + 1; continue; }
    const close = matchClose(s, open, "[", "]");
    const idx = rewrite(s.slice(open + 1, close), names, re);
    out += s.slice(at, m.index);
    let k = close + 1;
    while (s[k] === " ") k++;
    if (s[k] === "=" && s[k + 1] !== "=") {
      const end = valueEnd(s, k + 1);
      const val = rewrite(s.slice(k + 1, end), names, re).trim();
      out += `s_${name}(${idx}, ${val})`;
      at = end;
    } else {
      out += `g_${name}(${idx})`;
      at = close + 1;
    }
  }
  return out + s.slice(at);
}

const FOR = /for \(int (\w+) = ([^;]+); ([^;]+); \1\+\+\)/g;

/**
 * Constant trip counts: a loop whose condition starts with `X < n`, `X + 1 < n` or `X <= n`, n one of the per-pixel
 * counts (np, nk, ns, ...), becomes `for (X = start; X < cap; X++) if (!(condition)) break; else <body>`, cap the
 * count's capacity (+1 for `<=`). The condition is tested before every iteration as before, so the loop runs the same
 * iterations; a compiler may now unroll it and index the arrays by constants. caps: each count's largest value.
 */
export function constantLoops(src: string, caps: Record<string, number>): string {
  return src.replace(FOR, (all, x: string, start: string, cond: string) => {
    const first = cond.split(" && ")[0].trim();
    const m = new RegExp(`^${x}( \\+ 1)? (<|<=) (\\w+)$`).exec(first);
    if (!m || !(m[3] in caps)) return all;
    const cap = caps[m[3]] + (m[2] === "<=" ? 1 : 0);
    return `for (int ${x} = ${start}; ${x} < ${cap}; ${x}++) if (!(${cond})) break; else`;
  });
}

/**
 * The register-resident form of a program from gfFs. sizes: each array size macro's value (MAXP, MAXK, MAXS) or a
 * literal size. Only the arrays the program declares are converted; it must be a program without PROBE.
 */
export function scalarizeArrays(src: string, sizes: Record<string, number>): string {
  if (/^#define PROBE/m.test(src)) throw new Error("gf_reg: the probe program keeps its arrays");
  const decls: { q: string; t: string; name: string; n: number }[] = [];
  let body = src.replace(DECL, (_all, q: string, t: string, name: string, size: string) => {
    const n = /^\d+$/.test(size) ? Number(size) : sizes[size];
    if (!(n >= 1)) throw new Error(`gf_reg: no size for ${name}[${size}]`);
    decls.push({ q, t, name, n });
    return "";
  });
  const names = new Set(decls.map((d) => d.name));
  // the state and its accessors go where the first declaration stood (global scope, before every function)
  const lines: string[] = [];
  for (const { q, t, name, n } of decls) {
    const v = Array.from({ length: n }, (_, i) => `${name}_${i}`);
    lines.push(`${q}${t} ${v.join(", ")};`);
    let get = v[n - 1];
    for (let i = n - 2; i >= 0; i--) get = `i == ${i} ? ${v[i]} : ${get}`;
    lines.push(`${t} g_${name}(int i) { return ${get}; }`);
    let set = `${v[n - 1]} = x;`;
    for (let i = n - 2; i >= 0; i--) set = `if (i == ${i}) ${v[i]} = x; else ${set}`;
    lines.push(`void s_${name}(int i, ${q}${t} x) { ${set} }`);
  }
  const first = src.search(DECL);
  const head = body.slice(0, first);
  const rest = rewrite(body.slice(first), names, /\b(\w+)\s*\[/g);
  body = head + lines.join("\n") + "\n" + rest;
  return body;
}
