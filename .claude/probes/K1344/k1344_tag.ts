// K1344 s1: tag the census's tail_look finds that are j116's kind of crease: a tail's band folded over itself
// (its walk turns back: a hook, or a loop cutTailLoop left), so two or three of its quads ink one spot.
//   node scripts/run_node.mjs .claude/probes/K1344/k1344_tag.ts <census.json> [--kind=tail_look] [--margin=0.02]
//        [--top=12] [--spots=<file>] [--proto]
// A tail quad (points i, i + 1, the band's untied inner rule: inner = pt + W unit(cpt - pt)) is folded when the
// walk turns back at either end (consecutive outer steps with a negative dot), its two triangles' signed areas
// differ in sign, or its sign is not the piece's majority. A find is tagged when a folded quad's box meets the
// find's box grown by margin (world). Prints the count per scene, the tagged finds by size, and with --proto
// whether outline_proto's fix (K1344.fix) leaves the piece folded. --spots writes the top finds as crop spots
// (scene:x:y:label,...).
import { readFileSync, writeFileSync } from "node:fs";
import { buildModel, type Model } from "../K1314/k1314_census";
import { protoModel } from "./k1344_model";

const a = process.argv.slice(2);
const opt = (k: string): string | undefined => a.find((x) => x.startsWith(`--${k}=`))?.slice(k.length + 3);
const KIND = opt("kind") ?? "tail_look"; const MARGIN = Number(opt("margin") ?? 0.02); const TOP = Number(opt("top") ?? 12);
const PROTO = a.includes("--proto"); const PK = (opt("kinds") ?? "tail").split(",");
type Art = { id: string; scene: string; kind: string; sub: string; x: number; y: number; px: number; sizePx: number; bbox: number[]; near: string; part: string };
const arts = (JSON.parse(readFileSync(a[0], "utf8")).arts as Art[]).filter((x) => x.kind === KIND);
type Q = { pi: number; box: number[] };

export function foldedQuads(m: Model, kinds = ["tail"]): Q[] {
  const W = m.table.W; const out: Q[] = [];
  m.table.pieces.forEach((p, pi) => {
    if (!kinds.includes(p.kind)) return;
    const n = p.pts.length / 2; if (n < 2) return;
    const inn: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = p.pts[2 * i]; const y = p.pts[2 * i + 1]; let dx = p.cpts[2 * i] - x; let dy = p.cpts[2 * i + 1] - y; const l = Math.hypot(dx, dy);
      if (l < 1e-12) { const j = Math.min(i + 1, n - 1); const ex = p.pts[2 * j] - x; const ey = p.pts[2 * j + 1] - y; const el = Math.hypot(ex, ey) || 1; dx = -ey / el; dy = ex / el; } else { dx /= l; dy /= l; }
      inn.push(x + dx * W, y + dy * W);
    }
    const ar = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const A1: number[] = []; const A2: number[] = []; let maj = 0;
    for (let i = 0; i + 1 < n; i++) {
      A1.push(ar(p.pts[2 * i], p.pts[2 * i + 1], p.pts[2 * i + 2], p.pts[2 * i + 3], inn[2 * i], inn[2 * i + 1]));
      A2.push(ar(p.pts[2 * i + 2], p.pts[2 * i + 3], inn[2 * i + 2], inn[2 * i + 3], inn[2 * i], inn[2 * i + 1]));
      maj += Math.sign(A1[i]) * Math.abs(A1[i]) + Math.sign(A2[i]) * Math.abs(A2[i]);
    }
    const st = (i: number): number => Math.hypot(p.pts[2 * i + 2] - p.pts[2 * i], p.pts[2 * i + 3] - p.pts[2 * i + 1]);
    // a turn counts when both steps are at least TURN_MIN (0.002 world, 0.3 px at 160 ppu): cutTailLoop's crossing leaves sub-pixel jogs
    const turn = (i: number): boolean => i >= 1 && i + 1 < n && Math.min(st(i - 1), st(i)) >= 0.002 && (p.pts[2 * i] - p.pts[2 * i - 2]) * (p.pts[2 * i + 2] - p.pts[2 * i]) + (p.pts[2 * i + 1] - p.pts[2 * i - 1]) * (p.pts[2 * i + 3] - p.pts[2 * i + 1]) < 0;
    const eps = 1e-5; // twice a quad's area: a sub-pixel sliver's sign does not count
    for (let i = 0; i + 1 < n; i++) {
      const s1 = Math.abs(A1[i]) < eps ? 0 : Math.sign(A1[i]); const s2 = Math.abs(A2[i]) < eps ? 0 : Math.sign(A2[i]);
      const fold = turn(i) || turn(i + 1) || (s1 !== 0 && s2 !== 0 && s1 !== s2) || (s1 !== 0 && s1 !== Math.sign(maj)) || (s2 !== 0 && s2 !== Math.sign(maj));
      if (!fold) continue;
      const xs = [p.pts[2 * i], p.pts[2 * i + 2], inn[2 * i], inn[2 * i + 2]]; const ys = [p.pts[2 * i + 1], p.pts[2 * i + 3], inn[2 * i + 1], inn[2 * i + 3]];
      out.push({ pi, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
    }
  });
  return out;
}

const scenes = [...new Set(arts.map((x) => x.scene))];
const tagged: (Art & { pieces: number[]; after?: string })[] = [];
for (const nm of scenes) {
  const m = buildModel(nm); const qs = foldedQuads(m, PK);
  const qa = PROTO ? foldedQuads(protoModel(nm, true), PK) : null;
  const mine = arts.filter((x) => x.scene === nm); let n = 0;
  for (const f of mine) {
    const [x0, y0, x1, y1] = f.bbox; const hit = (q: Q): boolean => q.box[0] <= x1 + MARGIN && q.box[2] >= x0 - MARGIN && q.box[1] <= y1 + MARGIN && q.box[3] >= y0 - MARGIN;
    const ps = [...new Set(qs.filter(hit).map((q) => q.pi))];
    if (!ps.length) continue;
    n++;
    const after = qa ? (qa.some(hit) ? "still folded" : "unfolded") : undefined;
    tagged.push({ ...f, pieces: ps, after });
  }
  console.log(`${nm}: ${n} of ${mine.length} ${KIND} finds meet a folded tail quad (${new Set(qs.map((q) => q.pi)).size} folded tails)`);
}
tagged.sort((p, q) => q.px - p.px);
console.log(`total: ${tagged.length} of ${arts.length}`);
for (const t of tagged) console.log(`  ${t.id} ${t.sub} ${t.px} px (size ${t.sizePx}) (${t.x}, ${t.y}) ${t.near} ${t.part} tails ${t.pieces.map((p) => "p" + p).join(",")}${t.after ? " | proto: " + t.after : ""}`);
const SP = opt("spots");
if (SP) writeFileSync(SP, tagged.slice(0, TOP).map((t) => `${t.scene}:${t.x}:${t.y}:${t.id.replace("#", "_")}`).join(","));
