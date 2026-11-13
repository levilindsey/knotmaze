import { readFileSync } from "node:fs";
// K1314 s11: k1346_cdiff_b.ts with the census tags as args: <before tag> <after tag>.
const [ta, tb] = process.argv.slice(2);
const A = JSON.parse(readFileSync(`.claude/probes/K1314/out/s1/census_${ta}.json`, "utf8"));
const B = JSON.parse(readFileSync(`.claude/probes/K1314/out/s1/census_${tb}.json`, "utf8"));
const finds = (J: any): any[] => { const out: any[] = []; const walk = (o: any, sc: string) => { if (Array.isArray(o)) { for (const x of o) walk(x, sc); return; } if (o && typeof o === "object") { if ("kind" in o && ("x" in o || "cx" in o) && ("px" in o || "area" in o || "n" in o)) out.push({ ...o, sc }); else for (const [k, v] of Object.entries(o)) walk(v, o.scene ?? (k in { scenes: 1 } ? sc : (typeof k === "string" && !/^\d+$/.test(k) && sc === "" ? k : sc))); } }; walk(J, ""); return out; };
const fa = finds(A).filter((f) => f.kind !== "owner_only"); const fb = finds(B).filter((f) => f.kind !== "owner_only");
console.log("finds", fa.length, fb.length, "keys", Object.keys(fa[0] ?? {}).join(","));
const key = (f: any) => `${f.scene}|${f.kind}|${f.sub}|${f.x.toFixed(2)},${f.y.toFixed(2)}`;
const ka = new Map(fa.map((f) => [key(f), f])); const kb = new Map(fb.map((f) => [key(f), f]));
for (const [k, f] of ka) if (!kb.has(k)) console.log("gone", k, f.px ?? f.area ?? f.n);
for (const [k, f] of kb) if (!ka.has(k)) console.log("new ", k, f.px ?? f.area ?? f.n);
let ch = 0; for (const [k, f] of ka) { const g = kb.get(k); if (g && (g.px ?? g.area ?? g.n) !== (f.px ?? f.area ?? f.n)) { ch++; if (ch <= 40) console.log("px  ", k, f.px ?? f.area ?? f.n, "->", g.px ?? g.area ?? g.n); } }
console.log("changed", ch);


