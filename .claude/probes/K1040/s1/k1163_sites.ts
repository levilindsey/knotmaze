// K1114 S1i step 2: goal 1's check at S1h's 18 sites (out/s1h/sites.json, read
// from the main checkout): each candidate's ink against S1f's final
// (FormB({dEdge: "skip", rootBand: 0}), which reproduces the frozen S1f ink,
// S1h's Findings) and against today's defaults, over S1h's zoom 4 window
// (+-3.5h around V, dpr 2; windowOf as s1h_pair.ts has it), and optionally the
// play-size window (+-8h, ZOOM1=1).
// Per site and form: px that differ from S1f (|d ink| > 0.02), px off by more
// than 0.5, and how far the differing px lie from S1f's 0.5 contour (device
// px, 4-connected BFS): the largest distance and the count beyond 3 px. "Within
// a few device pixels" means far3 = 0.
// Run: $env:CANDS='[["k2",{"dEdgeK":2}]]'; $env:TAG='k2'; npx.cmd vite-node .claude/probes/K1040/s1/s1i_sites.ts
//   (writes out/k1163/sites_<TAG>.txt)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, type FormBParams } from "../../../../src/render/field/form_b";

const HERE = dirname(fileURLToPath(import.meta.url));
const outDir = join(HERE, "out/k1163");
mkdirSync(outDir, { recursive: true });
const SCENES = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const SITES = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1040/s1/out/s1h/sites.json";
const DPR = 2;
const TAG = process.env.TAG ?? "new";
const CANDS = JSON.parse(process.env.CANDS ?? "[]") as [string, FormBParams][];
const KINDS: ("z4" | "z1")[] = process.env.ZOOM1 === "1" ? ["z4", "z1"] : ["z4"];
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",").map(Number)) : null;
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));

interface Site {
  id: string;
  group: string;
  scene: string;
  j: number;
  a: number;
  b: number;
  h: number;
  x: number;
  y: number;
}
interface Ev {
  h: number;
  ppuDev: number;
  evalPoint(x: number, y: number): { ink: number };
}
const sceneCache = new Map<string, FieldScene>();
const sceneOf = (name: string): FieldScene => {
  let sc = sceneCache.get(name);
  if (!sc) {
    sc = JSON.parse(readFileSync(`${SCENES}/${name}.json`, "utf8")) as FieldScene;
    sc.look.ctrlArc ??= 0.47;
    sceneCache.set(name, sc);
  }
  return sc;
};
const formCache = new Map<string, Ev>();
const formOf = (name: string, label: string, P: FormBParams): Ev => {
  const key = `${name}|${label}`;
  let fb = formCache.get(key);
  if (!fb) {
    fb = new FormB(sceneOf(name), { dpr: DPR, ...P }) as unknown as Ev;
    formCache.set(key, fb);
  }
  return fb;
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
interface Win {
  n: number;
  x0: number;
  y0: number;
  px: number;
}
function windowOf(fb: Ev, X: number, Y: number, kind: "z1" | "z4"): Win {
  const ppu = fb.ppuDev;
  const hdev = fb.h * ppu;
  const n = kind === "z1" ? clamp(Math.round(16 * hdev), 160, 400) : clamp(Math.round(7 * hdev), 80, 160);
  const x0 = Math.round(X * ppu - n / 2) / ppu;
  const y0 = Math.round(Y * ppu - n / 2) / ppu;
  return { n, x0, y0, px: 1 / ppu };
}
function inkOf(fb: Ev, w: Win): Float32Array {
  const ink = new Float32Array(w.n * w.n);
  for (let j = 0; j < w.n; j++) for (let i = 0; i < w.n; i++) ink[j * w.n + i] = fb.evalPoint(w.x0 + (i + 0.5) * w.px, w.y0 + (j + 0.5) * w.px).ink;
  return ink;
}
/** Each px's 4-connected distance (px) to S's 0.5 contour (a px on either side of a crossing). */
function contourDist(s: Float32Array, n: number): Int32Array {
  const D = new Int32Array(n * n).fill(1 << 30);
  const q: number[] = [];
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const a = s[k] >= 0.5;
      const nb = [i > 0 ? k - 1 : -1, i < n - 1 ? k + 1 : -1, j > 0 ? k - n : -1, j < n - 1 ? k + n : -1];
      if (nb.some((m) => m >= 0 && s[m] >= 0.5 !== a)) {
        D[k] = 0;
        q.push(k);
      }
    }
  for (let h = 0; h < q.length; h++) {
    const k = q[h];
    const i = k % n;
    const j = (k - i) / n;
    const nb = [i > 0 ? k - 1 : -1, i < n - 1 ? k + 1 : -1, j > 0 ? k - n : -1, j < n - 1 ? k + n : -1];
    for (const m of nb)
      if (m >= 0 && D[m] > D[k] + 1) {
        D[m] = D[k] + 1;
        q.push(m);
      }
  }
  return D;
}
interface Cmp {
  differ: number;
  strong: number;
  maxD: number;
  far3: number;
}
function cmp(s: Float32Array, c: Float32Array, D: Int32Array): Cmp {
  let differ = 0;
  let strong = 0;
  let maxD = 0;
  let far3 = 0;
  for (let k = 0; k < s.length; k++) {
    const d = Math.abs(c[k] - s[k]);
    if (d > 0.02) {
      differ++;
      if (d > 0.5) strong++;
      const dd = D[k] >= 1 << 30 ? 999 : D[k];
      if (dd > maxD) maxD = dd;
      if (dd > 3) far3++;
    }
  }
  return { differ, strong, maxD, far3 };
}
const sites = JSON.parse(readFileSync(SITES, "utf8")) as Site[];
const FORMS: [string, FormBParams][] = [["today", {}], ...CANDS];
const out: string[] = [];
const t0 = Date.now();
out.push(`s1i_sites ${TAG}: forms ${FORMS.map(([l, P]) => `${l} ${JSON.stringify(P)}`).join("; ")}`);
out.push("per form: differ (|d| > 0.02) / strong (> 0.5) / max dist from S1f's contour (px) / far (> 3 px)");
const tot = new Map<string, Cmp>();
for (const kind of KINDS) {
  out.push(`== window ${kind}`);
  out.push(["site", "id".padEnd(30), ...FORMS.map(([l]) => l.padStart(22))].join(" "));
  sites.forEach((st, idx) => {
    const no = idx + 1;
    if (ONLY && !ONLY.has(no)) return;
    const S = formOf(st.scene, "S1f", { dEdge: "skip", rootBand: 0 });
    const w = windowOf(S, st.x, st.y, kind);
    const s = inkOf(S, w);
    const D = contourDist(s, w.n);
    const cells: string[] = [];
    for (const [label, P] of FORMS) {
      const c = cmp(s, inkOf(formOf(st.scene, label, P), w), D);
      const key = `${kind}|${label}`;
      const t = tot.get(key) ?? { differ: 0, strong: 0, maxD: 0, far3: 0 };
      t.differ += c.differ;
      t.strong += c.strong;
      t.maxD = Math.max(t.maxD, c.maxD);
      t.far3 += c.far3;
      tot.set(key, t);
      cells.push(`${c.differ}/${c.strong}/${c.maxD}/${c.far3}`.padStart(22));
    }
    out.push([String(no).padStart(4), `${st.scene} j${st.j} ${st.a}-${st.b}`.padEnd(30), ...cells].join(" "));
  });
  out.push(
    [
      " all",
      "".padEnd(30),
      ...FORMS.map(([l]) => {
        const t = tot.get(`${kind}|${l}`)!;
        return `${t.differ}/${t.strong}/${t.maxD}/${t.far3}`.padStart(22);
      }),
    ].join(" "),
  );
}
out.push(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
writeFileSync(join(outDir, `sites_${TAG}.txt`), out.join("\n") + "\n");
console.log(out.join("\n"));
