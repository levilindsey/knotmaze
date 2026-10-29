// K1040 S1b, step 2: sweep every fade at the former hole sites. For each site
// of a q5holes census (default out/s1b/q5_before/holes.json), the window around
// it is rendered at the census's dpr with each fade held at 0, 0.25, 0.5, 0.75
// and 1 (FormBParams.force), and every paper component enclosed in the window
// (top < 0, 8-connected, not touching the window's border) is listed with how
// much of it the oracle (FieldModel, K883's mapping at cr 3, as scenes.ts)
// leaves as paper too. An enclosed component the oracle covers (shares less
// than half) is a hole a fade opened; one it shares is an eye of the look.
// Run: npx vite-node .claude/probes/K1040/s1/b_sweep.ts [holes.json] [half=0.8]
// Writes sweep.txt to out/s1b/sweep (OUT overrides the folder).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FieldModel, cornerRadius, type OracleParams } from "../../../../src/render/field/oracle";
import { FormB, type FormBParams } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.OUT ?? join(here, "out", "s1b", "sweep");
mkdirSync(outDir, { recursive: true });
const holesFile = process.argv[2] ?? join(here, "out", "s1b", "q5_before", "holes.json");
const HALF = Number(process.argv[3] ?? "0.8");
const rows = JSON.parse(readFileSync(holesFile, "utf8")) as Record<string, { at: [number, number]; px: number; group: number }[]>;
const VALUES = [0, 0.25, 0.5, 0.75, 1];
const variants: { tag: string; force?: FormBParams["force"] }[] = [{ tag: "natural" }];
for (const k of ["fold", "omega", "cap", "tie"] as const) for (const v of VALUES) variants.push({ tag: `${k}=${v}`, force: { [k]: v } });

/** Paper components (8-connected) that touch no border pixel of the n x n window. */
function enclosed(paper: Uint8Array, n: number): number[][] {
  const seen = new Uint8Array(n * n);
  const out: number[][] = [];
  for (let o0 = 0; o0 < n * n; o0++) {
    if (!paper[o0] || seen[o0]) continue;
    const comp: number[] = [];
    const stack = [o0];
    seen[o0] = 1;
    let border = false;
    while (stack.length) {
      const o = stack.pop()!;
      comp.push(o);
      const i = o % n;
      const j = (o - i) / n;
      if (i === 0 || j === 0 || i === n - 1 || j === n - 1) border = true;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const u = i + di;
          const v = j + dj;
          if (u < 0 || v < 0 || u >= n || v >= n) continue;
          const q = v * n + u;
          if (paper[q] && !seen[q]) {
            seen[q] = 1;
            stack.push(q);
          }
        }
    }
    if (!border) out.push(comp);
  }
  return out;
}

const lines: string[] = [];
const agg = new Map<string, { comps: number; px: number; defects: number; changed: number }>();
for (const [key, sites] of Object.entries(rows)) {
  if (!sites.length) continue;
  const name = key.replace(/_dpr2$/, "");
  const dpr = key.endsWith("_dpr2") ? 2 : 1;
  const s = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  const h0 = s.look.halfWidth;
  const mapping: OracleParams = { rRound: 0, rOf: (_j, _i, th, st) => (st === "round" ? cornerRadius(3, h0, th) : 0), spans: "k883", crMax: 3 };
  const m = new FieldModel(s, mapping);
  const ppu = s.camera.pxPerUnit * dpr;
  const n = Math.max(16, Math.round(2 * HALF * ppu));
  const px = (2 * HALF) / n;
  const at = (st: { at: [number, number] }, i: number, j: number): [number, number] => [st.at[0] - HALF + (i + 0.5) * px, st.at[1] - HALF + (j + 0.5) * px];
  const oPaper = sites.map((st) => {
    const a = new Uint8Array(n * n);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const [x, y] = at(st, i, j);
        const o = m.evalPoint(x, y, false);
        a[j * n + i] = !o.inside && !o.ink ? 1 : 0;
      }
    return a;
  });
  const natural: string[] = [];
  for (const vt of variants) {
    const fb = new FormB(s, { dpr, force: vt.force });
    const g = agg.get(vt.tag) ?? { comps: 0, px: 0, defects: 0, changed: 0 };
    sites.forEach((st, si) => {
      const paper = new Uint8Array(n * n);
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const [x, y] = at(st, i, j);
          paper[j * n + i] = fb.evalPoint(x, y).top < 0 ? 1 : 0;
        }
      const desc = enclosed(paper, n).map((c) => {
        let op = 0;
        for (const o of c) op += oPaper[si][o];
        return { px: c.length, op };
      });
      const bad = desc.filter((d) => d.op < 0.5 * d.px).length;
      const sig = desc.map((d) => `${d.px}px/${d.op}`).join(" ");
      if (vt.tag === "natural") natural[si] = sig;
      else if (sig !== natural[si]) g.changed++;
      g.comps += desc.length;
      g.px += desc.reduce((u, d) => u + d.px, 0);
      g.defects += bad;
      lines.push(`${key} site ${si} g${st.group} (${st.at[0]}, ${st.at[1]}) ${vt.tag}: ${desc.length} enclosed [${sig}]${bad ? ` DEFECT ${bad}` : ""}`);
    });
    agg.set(vt.tag, g);
  }
  console.log(`${key}: ${sites.length} sites, window ${n}x${n} px`);
}
const head = [`b_sweep: ${holesFile}, window +-${HALF} world; per variant: enclosed components, their px, defects (oracle covers > half), sites whose components differ from natural`];
for (const [tag, g] of agg) head.push(`${tag.padEnd(10)} ${String(g.comps).padStart(4)} comps ${String(g.px).padStart(6)} px  defects ${g.defects}  changed ${g.changed}`);
writeFileSync(join(outDir, "sweep.txt"), `${head.join("\n")}\n\n${lines.join("\n")}\n`);
console.log(head.join("\n"));
