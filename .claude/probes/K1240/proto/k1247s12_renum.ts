// K1247 s12: is a table difference only region numbering? Compares
// k1247c_dump tables out/<a>/ vs out/<b>/ per case: pieces with the region
// field dropped (kind/chain/side/corner and every point, exact), regions with
// points as a multiset of (ownerChain, group, pts, hole) plus the count of
// empty ones, faces likewise, and each piece's region mapped through
// pts-identity (same region polygon on both sides).
// Usage: node scripts/run_node.mjs <this> <a> <b>
import * as fs from "fs";
import * as path from "path";
const [aSub, bSub] = process.argv.slice(2);
const out = path.resolve(".claude/probes/K1240/out"); // run from the worktree root
const files = fs.readdirSync(path.join(out, aSub)).filter((f) => f.startsWith("table_") && f.endsWith(".json"));
let bad = 0;
for (const f of files) {
  const A = JSON.parse(fs.readFileSync(path.join(out, aSub, f), "utf8")); const B = JSON.parse(fs.readFileSync(path.join(out, bSub, f), "utf8"));
  const tA = A.table ?? A; const tB = B.table ?? B;
  const msgs: string[] = [];
  const pk = (p: any): string => `${p.kind}/${p.chain}/${p.side}/${p.corner}|${JSON.stringify(p.pts)}`;
  if (tA.pieces.length !== tB.pieces.length) msgs.push(`pieces ${tA.pieces.length} vs ${tB.pieces.length}`);
  else { let d = 0; for (let i = 0; i < tA.pieces.length; i++) if (pk(tA.pieces[i]) !== pk(tB.pieces[i])) d++; if (d) msgs.push(`${d} pieces differ beyond region`); }
  const rk = (r: any): string => `${r.ownerChain}|${r.group}|${r.hole}|${JSON.stringify(r.pts)}`;
  const ms = (rs: any[]): Map<string, number> => { const m = new Map<string, number>(); for (const r of rs) if (r.pts.length) m.set(rk(r), (m.get(rk(r)) ?? 0) + 1); return m; };
  const mA = ms(tA.regions); const mB = ms(tB.regions);
  let onlyA = 0; let onlyB = 0; for (const [k, v] of mA) onlyA += Math.max(0, v - (mB.get(k) ?? 0)); for (const [k, v] of mB) onlyB += Math.max(0, v - (mA.get(k) ?? 0));
  const eA = tA.regions.filter((r: any) => !r.pts.length).length; const eB = tB.regions.filter((r: any) => !r.pts.length).length;
  if (onlyA || onlyB) msgs.push(`non-empty regions only in a ${onlyA}, only in b ${onlyB}`);
  // A piece's region, by polygon: same polygon both sides (junction regions included).
  if (tA.pieces.length === tB.pieces.length) {
    let d = 0;
    for (let i = 0; i < tA.pieces.length; i++) {
      const ra = tA.pieces[i].region; const rb = tB.pieces[i].region;
      const ka = ra >= 0 ? rk(tA.regions[ra]) : "-"; const kb = rb >= 0 ? rk(tB.regions[rb]) : "-";
      if (ka !== kb && !(ka.endsWith("|[]") && kb.endsWith("|[]"))) d++;
    }
    if (d) msgs.push(`${d} pieces' regions differ by polygon`);
  }
  const fk = (x: any): string => `${x.ownerChain}|${x.group}|${x.hole}|${JSON.stringify(x.pts)}`;
  const fm = (fs2: any[]): Map<string, number> => { const m = new Map<string, number>(); for (const x of fs2) if (x.pts.length) m.set(fk(x), (m.get(fk(x)) ?? 0) + 1); return m; };
  const fA = fm(tA.faces); const fB = fm(tB.faces); let fo = 0; for (const [k, v] of fA) fo += Math.abs(v - (fB.get(k) ?? 0)); for (const [k, v] of fB) if (!fA.has(k)) fo += v;
  if (fo) msgs.push(`non-empty faces differ ${fo}`);
  if (msgs.length) bad++;
  console.log(`${f}: regions ${tA.regions.length} -> ${tB.regions.length} (empty ${eA} -> ${eB}), faces ${tA.faces.length} -> ${tB.faces.length}; ${msgs.length ? "DIFF " + msgs.join("; ") : "renumbering only"}`);
}
console.log(bad ? `${bad} CASES DIFFER BEYOND NUMBERING` : "ALL CASES: renumbering only");
