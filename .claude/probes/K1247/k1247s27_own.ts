// K1247 s27: which fill item wins each cell (fill_tri: highest key), next to form B's label chain, on a grid.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s27_own.ts <scene> <x0> <y0> <x1> <y1> [--cell=0.025]
// Items print as letters (legend at the end, item index and its chain), form B's label as its chain's letter
// in the same legend where one of the chain's items won somewhere, else '?'. '.' nothing covers.
import { FormB as FormBFillet } from "../K1314/form_b_fillet";
import { buildModel } from "../K1314/k1314_census";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const cell = Number(process.argv.find((a) => a.startsWith("--cell="))?.split("=")[1] ?? 0.025);
const [nm, ...nums] = args; const [x0, y0, x1, y1] = nums.map(Number);
const m = buildModel(nm);
const fb = new FormBFillet(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): { chain: number } };
const P = m.fr.pos; const K = m.fr.key; const T = m.fs.idx;
const tris: number[] = [];
for (let t = 0; t < T.length; t += 3) {
  const xs = [P[2 * T[t]], P[2 * T[t + 1]], P[2 * T[t + 2]]]; const ys = [P[2 * T[t] + 1], P[2 * T[t + 1] + 1], P[2 * T[t + 2] + 1]];
  if (Math.max(...xs) < x0 || Math.min(...xs) > x1 || Math.max(...ys) < y0 || Math.min(...ys) > y1) continue;
  tris.push(t);
}
const top = (x: number, y: number): number => {
  let best = -Infinity; let who = -1;
  for (const t of tris) {
    const a = T[t]; const b = T[t + 1]; const c = T[t + 2];
    const ax = P[2 * a]; const ay = P[2 * a + 1]; const bx = P[2 * b]; const by = P[2 * b + 1]; const cx = P[2 * c]; const cy = P[2 * c + 1];
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(den) < 1e-14) continue;
    const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den; const l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den; const l3 = 1 - l1 - l2;
    if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
    const k = l1 * K[a] + l2 * K[b] + l3 * K[c];
    if (k > best) { best = k; who = m.vItem[a]; }
  }
  return who;
};
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const legend = new Map<number, string>();
const chainOf = (it: number): number => { const q = m.fs.items[it] as { kind: string; pi: number; owner: number }; return q.kind === "junc" ? q.owner : q.pi; };
const lines: string[] = [];
for (let y = y0 + cell / 2; y < y1; y += cell) {
  let a = ""; let b = "";
  for (let x = x0 + cell / 2; x < x1; x += cell) {
    const it = top(x, y);
    if (it < 0) a += ".";
    else { if (!legend.has(it)) legend.set(it, letters[legend.size % letters.length]); a += legend.get(it); }
    const ch = fb.evalPoint(x, y).chain;
    const own = [...legend.entries()].find(([i]) => chainOf(i) === ch);
    b += ch < 0 ? "." : own ? own[1].toLowerCase() : "?";
  }
  lines.push(`${a} | ${b}`);
}
console.log(lines.join("\n"));
console.log(`origin ${x0} ${y0} cell ${cell}; ` + [...legend.entries()].map(([i, l]) => `${l}=item ${i} ${m.fs.items[i].kind} c${m.scene.chains[chainOf(i)].id}`).join(", "));
